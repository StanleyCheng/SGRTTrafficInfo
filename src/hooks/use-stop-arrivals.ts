"use client";

import { useEffect, useState } from "react";
import { STATIC_MODE } from "@/lib/client-data";
import { parseTransitFeed } from "@/lib/transit-arrivals";
import type { TransitFeed, TransitStop } from "@/lib/transit";

const BACKEND = process.env.NEXT_PUBLIC_TRANSIT_API_BASE?.replace(/\/$/, "");
/** Only the opened bus stop polls; changing/closing it aborts the old request. */
export function useStopArrivals(stop: TransitStop | null) {
  const [result, setResult] = useState<{ stopId: string; feed: TransitFeed } | null>(null);
  const stopId = stop?.mode === "bus" ? stop.id : null;
  useEffect(() => {
    if (!stopId || (STATIC_MODE && !BACKEND)) return;
    let disposed = false, controller: AbortController | null = null;
    let timer: ReturnType<typeof setTimeout> | undefined;
    let sequence = 0;
    const poll = async () => {
      if (disposed || document.hidden) return;
      const current = ++sequence;
      const request = new AbortController();
      controller = request;
      const timeout = setTimeout(() => request.abort(), 12000);
      try {
        const response = await fetch(`${BACKEND ?? ""}/api/transit?stops=${encodeURIComponent(stopId)}`, { signal: request.signal });
        if (!response.ok) throw new Error("Stop arrivals unavailable");
        const feed = parseTransitFeed(await response.json());
        if (!disposed && current === sequence) setResult({ stopId, feed });
      } catch {
        if (!disposed && current === sequence && !document.hidden) setResult((previous) => ({ stopId,
          feed: { status: "error", generatedAt: Date.now(), observations: previous?.stopId === stopId ? previous.feed.observations : [] } }));
      } finally {
        clearTimeout(timeout);
        if (!disposed && current === sequence && !document.hidden) timer = setTimeout(poll, 20000);
      }
    };
    const visibility = () => { sequence++; clearTimeout(timer); controller?.abort(); if (!document.hidden) void poll(); };
    void poll();
    document.addEventListener("visibilitychange", visibility);
    return () => { disposed = true; clearTimeout(timer); controller?.abort(); document.removeEventListener("visibilitychange", visibility); };
  }, [stopId]);
  return stopId && STATIC_MODE && !BACKEND ? { status: "unconfigured" as const, generatedAt: 0, observations: [] }
    : result?.stopId === stopId ? result.feed : null;
}
