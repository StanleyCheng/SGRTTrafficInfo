import { readFile } from "node:fs/promises";
import path from "node:path";
import { datamall } from "@/lib/server/upstream";
import { parseBusObservations, parseTransitCatalog, type BusObservation } from "@/lib/transit";

export const runtime = "nodejs";
const headers = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Methods": "GET, OPTIONS",
  "Cache-Control": "public, max-age=0, s-maxage=20",
};
const cache = new Map<string, { time: number; observations: BusObservation[] }>();
const pending = new Map<string, Promise<BusObservation[]>>();
let budget = { minute: 0, requests: 0 };
let validStops: Promise<Set<string>> | null = null;

function allowedStops() {
  validStops ??= readFile(path.join(process.cwd(), "public/transit/catalog.json"), "utf8")
    .then((text) => new Set(parseTransitCatalog(JSON.parse(text)).stops.filter((stop) => stop.mode === "bus").map((stop) => stop.id)));
  return validStops;
}
async function arrivals(stop: string): Promise<BusObservation[]> {
  const previous = cache.get(stop);
  if (previous && Date.now() - previous.time < 20000) return previous.observations;
  const running = pending.get(stop);
  if (running) return running;
  const minute = Math.floor(Date.now() / 60000);
  if (budget.minute !== minute) budget = { minute, requests: 0 };
  if (budget.requests >= 120) throw new Error("Transit request budget reached");
  budget.requests++;
  const request = (async () => {
    const data: unknown = await datamall(`v3/BusArrival?BusStopCode=${stop}`, 10000);
    const now = Date.now();
    const observations = parseBusObservations(data, stop, now);
    cache.set(stop, { time: now, observations });
    if (cache.size > 512) cache.delete(cache.keys().next().value ?? "");
    return observations;
  })().finally(() => pending.delete(stop));
  pending.set(stop, request);
  return request;
}

export async function GET(request: Request) {
  const generatedAt = Date.now();
  const query = new URL(request.url).searchParams.get("stops") ?? "";
  const stops = [...new Set(query.split(",").filter(Boolean))].sort();
  if (stops.length > 8 || stops.some((stop) => !/^\d{5}$/.test(stop))) {
    return Response.json({ status: "error", generatedAt, observations: [] }, { status: 400, headers });
  }
  if (!process.env.DATAMALL_ACCOUNT_KEY?.trim()) {
    return Response.json({ status: "unconfigured", generatedAt, observations: [] }, { headers });
  }
  try {
    const allowed = await allowedStops();
    if (stops.some((stop) => !allowed.has(stop))) {
      return Response.json({ status: "error", generatedAt, observations: [] }, { status: 400, headers });
    }
    // Two workers bound upstream concurrency independently of the number of stops.
    const results: BusObservation[][] = [];
    let index = 0;
    await Promise.all(Array.from({ length: Math.min(2, stops.length) }, async () => {
      while (index < stops.length) {
        const stop = stops[index++];
        results.push(await arrivals(stop));
      }
    }));
    return Response.json({ status: "ok", generatedAt, observations: results.flat() }, { headers });
  } catch {
    // Never reflect upstream diagnostics or credential-bearing request details to the browser.
    return Response.json({ status: "error", generatedAt, observations: [] }, {
      status: 503, headers: { ...headers, "Cache-Control": "no-store" },
    });
  }
}

export function OPTIONS() { return new Response(null, { status: 204, headers }); }
