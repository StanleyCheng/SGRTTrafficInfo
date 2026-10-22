"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import { STATIC_MODE } from "@/lib/client-data";
import { filteredTransitRoutes, inferBusVehicles, isRecord, parseTransitCatalog, sampledBusStops,
  type BusObservation, type TransitActive, type TransitCatalog, type TransitFeed,
  type TransitFilters, type TransitVehicle, type TransitViewport } from "@/lib/transit";
import { inferScheduledVehicles } from "@/lib/transit-schedule";

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
    generatedAt: value.generatedAt, observations,
    coverage: isRecord(value.coverage) && typeof value.coverage.checked === "number" && typeof value.coverage.total === "number"
      ? { checked: value.coverage.checked, total: value.coverage.total } : undefined };
}

export function useTransit(active: TransitActive, viewport: TransitViewport | null, selectedRouteId: string | null,
  filters: TransitFilters, focusedGroup: string | null, requested: boolean, estimated: boolean) {
  const [catalog, setCatalog] = useState<TransitCatalog | null>(null);
  const [catalogError, setCatalogError] = useState(false);
  const [feedStatus, setFeedStatus] = useState<TransitFeed["status"] | "loading">("unconfigured");
  const [vehicles, setVehicles] = useState<TransitVehicle[]>([]);
  const [coverage, setCoverage] = useState<TransitFeed["coverage"]>();
  const previous = useRef<TransitVehicle[]>([]);
  const enabled = requested || Object.values(active).some(Boolean);

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

  const routes = useMemo(() => catalog ? filteredTransitRoutes(catalog, active, filters, focusedGroup, viewport) : [],
  [catalog, active, viewport, filters, focusedGroup]);
  // The renderer interpolates between vehicle endpoints; this clock only needs
  // to add departures and drop arrivals, not repaint every frame.
  const [scheduleNow, setScheduleNow] = useState(() => Date.now());
  useEffect(() => {
    if (!estimated) return;
    // eslint-disable-next-line react-hooks/set-state-in-effect -- reset the timetable clock when the opt-in changes
    setScheduleNow(Date.now());
    const timer = setInterval(() => setScheduleNow(Date.now()), 15000);
    return () => clearInterval(timer);
  }, [estimated]);
  const scheduled = useMemo(() => catalog && scheduleNow
    ? inferScheduledVehicles(catalog, scheduleNow, new Set(routes.map((route) => route.id)), estimated)
    : [], [catalog, routes, estimated, scheduleNow]);
  const service = focusedGroup?.startsWith("bus:") ? focusedGroup.slice(4) : null;
  const stopsKey = useMemo(() => {
    if (!catalog || !viewport || !active.bus || (focusedGroup && !service)) return "";
    return sampledBusStops(catalog, routes, viewport, selectedRouteId).join(",");
  }, [catalog, viewport, active.bus, routes, selectedRouteId, focusedGroup, service]);
  const query = service ? `service=${encodeURIComponent(service)}` : stopsKey ? `stops=${encodeURIComponent(stopsKey)}` : "";

  useEffect(() => {
    if (!active.bus || !catalog || !query || (STATIC_MODE && !BACKEND)) return;
    let disposed = false;
    let timer: ReturnType<typeof setTimeout> | undefined;
    let abort: AbortController | null = null;
    let sequence = 0;
    const poll = async () => {
      if (disposed || document.hidden) return;
      const requestSequence = ++sequence;
      const controller = new AbortController();
      abort = controller;
      const timeout = setTimeout(() => controller.abort(), service ? 35000 : 12000);
      try {
        const response = await fetch(`${BACKEND ?? ""}/api/transit?${query}`, { signal: controller.signal });
        if (!response.ok) throw new Error("Transit feed unavailable");
        const feed = parseFeed(await response.json());
        if (disposed || requestSequence !== sequence) return;
        setFeedStatus(feed.status);
        setCoverage(feed.coverage);
        if (feed.status === "ok") {
          previous.current = inferBusVehicles(catalog, feed.observations, previous.current, Date.now());
          setVehicles(previous.current);
        }
      } catch {
        if (!disposed && !document.hidden && requestSequence === sequence) setFeedStatus("error");
      } finally {
        clearTimeout(timeout);
        if (!disposed && !document.hidden && requestSequence === sequence) timer = setTimeout(poll, service ? 45000 : 20000);
      }
    };
    const visibility = () => {
      clearTimeout(timer);
      sequence++; abort?.abort();
      if (!document.hidden) void poll();
    };
    const kickoff = setTimeout(() => { setFeedStatus("loading"); setCoverage(undefined); void poll(); }, 0);
    document.addEventListener("visibilitychange", visibility);
    return () => { disposed = true; clearTimeout(kickoff); clearTimeout(timer); abort?.abort(); document.removeEventListener("visibilitychange", visibility); };
  }, [active.bus, catalog, query, service]);

  const routeIds = new Set(routes.map((route) => route.id));
  return { catalog, catalogError, routes, estimated,
    vehicles: [...(active.bus ? vehicles.filter((vehicle) => routeIds.has(vehicle.routeId)) : []),
      ...scheduled.filter((vehicle) => routeIds.has(vehicle.routeId))],
    coverage, feedStatus: STATIC_MODE && !BACKEND ? "unconfigured" as const : feedStatus, stopsKey };
}
export type TransitState = ReturnType<typeof useTransit>;
