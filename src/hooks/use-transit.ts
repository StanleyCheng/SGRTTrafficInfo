"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import { STATIC_MODE } from "@/lib/client-data";
import { inferBusVehicles, isRecord, parseTransitCatalog, routeInView,
  type BusObservation, type TransitActive, type TransitCatalog, type TransitFeed,
  type TransitVehicle, type TransitViewport } from "@/lib/transit";

const BASE = process.env.NEXT_PUBLIC_BASE_PATH ?? "";
const BACKEND = process.env.NEXT_PUBLIC_TRANSIT_API_BASE?.replace(/\/$/, "");

function parseFeed(value: unknown): TransitFeed {
  if (!isRecord(value) || !["ok", "unconfigured", "error"].includes(String(value.status))
    || typeof value.generatedAt !== "number" || !Array.isArray(value.observations)) throw new Error("Invalid transit feed");
  const observations: BusObservation[] = [];
  for (const item of value.observations) {
    if (!isRecord(item) || typeof item.service !== "string" || typeof item.stopId !== "string"
      || typeof item.origin !== "string" || typeof item.destination !== "string"
      || !Number.isFinite(item.arrivalAt) || typeof item.arrivalAt !== "number"
      || !Number.isFinite(item.observedAt) || typeof item.observedAt !== "number"
      || typeof item.monitored !== "boolean" || (item.type !== "SD" && item.type !== "DD" && item.type !== "BD")) continue;
    const position = item.position;
    if (position !== null && (!Array.isArray(position) || position.length !== 2 || !position.every(Number.isFinite))) continue;
    observations.push({ service: item.service, stopId: item.stopId, origin: item.origin,
      destination: item.destination, arrivalAt: item.arrivalAt, observedAt: item.observedAt,
      monitored: item.monitored, type: item.type,
      visitNumber: typeof item.visitNumber === "number" && Number.isInteger(item.visitNumber) && item.visitNumber > 0 ? item.visitNumber : 1,
      position: position === null ? null : [Number(position[0]), Number(position[1])] });
  }
  return { status: value.status === "ok" ? "ok" : value.status === "unconfigured" ? "unconfigured" : "error",
    generatedAt: value.generatedAt, observations };
}

export function useTransit(active: TransitActive, viewport: TransitViewport | null, selectedRouteId: string | null) {
  const [catalog, setCatalog] = useState<TransitCatalog | null>(null);
  const [catalogError, setCatalogError] = useState(false);
  const [feedStatus, setFeedStatus] = useState<TransitFeed["status"] | "loading">("unconfigured");
  const [vehicles, setVehicles] = useState<TransitVehicle[]>([]);
  const previous = useRef<TransitVehicle[]>([]);
  const enabled = Object.values(active).some(Boolean);

  // Expiry also removes estimates from the accessible Options list when a
  // sustained feed failure leaves no successful poll to replace the records.
  useEffect(() => {
    if (!vehicles.length) return;
    const expiresAt = Math.min(...vehicles.map((vehicle) => vehicle.expiresAt));
    const timer = setTimeout(() => {
      previous.current = previous.current.filter((vehicle) => Date.now() < vehicle.expiresAt);
      setVehicles(previous.current);
    }, Math.max(0, expiresAt - Date.now()) + 1);
    return () => clearTimeout(timer);
  }, [vehicles]);

  useEffect(() => {
    if (!enabled || catalog) return;
    const abort = new AbortController();
    void fetch(`${BASE}/transit/catalog.json`, { signal: abort.signal }).then(async (response) => {
      if (!response.ok) throw new Error("Transit catalogue unavailable");
      const data = parseTransitCatalog(await response.json());
      setCatalog(data); setCatalogError(false);
    }).catch(() => { if (!abort.signal.aborted) setCatalogError(true); });
    return () => abort.abort();
  }, [enabled, catalog]);

  const routes = useMemo(() => catalog?.routes.filter((route) => active[route.mode]
    && (route.id === selectedRouteId || (viewport && routeInView(route, viewport)))) ?? [],
  [catalog, active, viewport, selectedRouteId]);
  const stopsKey = useMemo(() => {
    if (!catalog || !viewport || !active.bus) return "";
    const routeIds = new Set(routes.filter((route) => route.mode === "bus").flatMap((route) => route.stopIds));
    const selected = catalog.routes.find((route) => route.id === selectedRouteId && route.mode === "bus");
    const centre = [(viewport.west + viewport.east) / 2, (viewport.south + viewport.north) / 2];
    const available = catalog.stops.filter((stop) => stop.mode === "bus" && routeIds.has(stop.id)
      && stop.position[0] >= viewport.west && stop.position[0] <= viewport.east
      && stop.position[1] >= viewport.south && stop.position[1] <= viewport.north)
      .sort((a, b) => Math.hypot(a.position[0] - centre[0], a.position[1] - centre[1])
        - Math.hypot(b.position[0] - centre[0], b.position[1] - centre[1]));
    // Reserve four samples along the selected route, plus four nearby visible stops.
    const selectedIds = selected ? [0.15, 0.4, 0.65, 0.85].map((fraction) => selected.stopIds[Math.floor((selected.stopIds.length - 1) * fraction)]) : [];
    return [...new Set([...selectedIds, ...available.map((stop) => stop.id)].filter(Boolean))].slice(0, 8).sort().join(",");
  }, [catalog, viewport, active.bus, routes, selectedRouteId]);

  useEffect(() => {
    if (!active.bus || !catalog || !stopsKey || (STATIC_MODE && !BACKEND)) return;
    let disposed = false;
    let timer: ReturnType<typeof setTimeout> | undefined;
    let abort: AbortController | null = null;
    let sequence = 0;
    const poll = async () => {
      if (disposed || document.hidden) return;
      const requestSequence = ++sequence;
      const controller = new AbortController();
      abort = controller;
      const timeout = setTimeout(() => controller.abort(), 12000);
      try {
        const response = await fetch(`${BACKEND ?? ""}/api/transit?stops=${encodeURIComponent(stopsKey)}`, { signal: controller.signal });
        if (!response.ok) throw new Error("Transit feed unavailable");
        const feed = parseFeed(await response.json());
        if (disposed || requestSequence !== sequence) return;
        setFeedStatus(feed.status);
        if (feed.status === "ok") {
          previous.current = inferBusVehicles(catalog, feed.observations, previous.current, Date.now());
          setVehicles(previous.current);
        }
      } catch {
        if (!disposed && !document.hidden && requestSequence === sequence) setFeedStatus("error");
      } finally {
        clearTimeout(timeout);
        if (!disposed && !document.hidden && requestSequence === sequence) timer = setTimeout(poll, 20000);
      }
    };
    const visibility = () => {
      clearTimeout(timer);
      sequence++; abort?.abort();
      if (!document.hidden) void poll();
    };
    const kickoff = setTimeout(() => { setFeedStatus("loading"); void poll(); }, 0);
    document.addEventListener("visibilitychange", visibility);
    return () => { disposed = true; clearTimeout(kickoff); clearTimeout(timer); abort?.abort(); document.removeEventListener("visibilitychange", visibility); };
  }, [active.bus, catalog, stopsKey]);

  return { catalog, catalogError, routes, vehicles: active.bus ? vehicles : [],
    feedStatus: STATIC_MODE && !BACKEND ? "unconfigured" as const : feedStatus, stopsKey };
}
export type TransitState = ReturnType<typeof useTransit>;
