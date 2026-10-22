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
const serviceCursor = new Map<string, number>();
let budget = { minute: 0, requests: 0 };
let catalog: Promise<ReturnType<typeof parseTransitCatalog>> | null = null;

function routeCatalog() {
  catalog ??= readFile(path.join(process.cwd(), "public/transit/catalog.json"), "utf8")
    .then((text) => parseTransitCatalog(JSON.parse(text)));
  return catalog;
}
async function arrivals(stop: string, maxAge = 20000): Promise<BusObservation[]> {
  const previous = cache.get(stop);
  if (previous && Date.now() - previous.time < maxAge) return previous.observations;
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
  const params = new URL(request.url).searchParams;
  const service = params.get("service");
  let stops = [...new Set((params.get("stops") ?? "").split(",").filter(Boolean))].sort();
  if ((service !== null && (!/^[a-z0-9]+$/i.test(service) || stops.length > 0))
    || stops.length > 8 || stops.some((stop) => !/^\d{5}$/.test(stop))) {
    return Response.json({ status: "error", generatedAt, observations: [] }, { status: 400, headers });
  }
  try {
    const data = await routeCatalog();
    const allowed = new Set(data.stops.filter((stop) => stop.mode === "bus").map((stop) => stop.id));
    if (service) {
      stops = [...new Set(data.routes.filter((route) => route.mode === "bus" && route.service === service).flatMap((route) => route.stopIds))];
      const cursor = (serviceCursor.get(service) ?? 0) % (stops.length || 1);
      stops = [...stops.slice(cursor), ...stops.slice(0, cursor)];
    }
    if ((service && !stops.length) || stops.some((stop) => !allowed.has(stop))) {
      return Response.json({ status: "error", generatedAt, observations: [] }, { status: 400, headers });
    }
    if (!process.env.DATAMALL_ACCOUNT_KEY?.trim()) {
      return Response.json({ status: "unconfigured", generatedAt, observations: [], coverage: { checked: 0, total: stops.length } }, { headers });
    }
    // Focused services scan the union of both directions. Bounded workers,
    // shared stop caching and the same request budget also apply to this path.
    const results: BusObservation[][] = [];
    let index = 0;
    let checked = 0;
    let firstMissed = -1;
    const deadline = Date.now() + 22000;
    await Promise.all(Array.from({ length: Math.min(service ? 4 : 2, stops.length) }, async () => {
      while (index < stops.length && Date.now() < deadline) {
        const position = index++;
        const stop = stops[position];
        try { results.push(await arrivals(stop, service ? 45000 : 20000)); checked++; }
        catch { firstMissed = firstMissed < 0 ? position : Math.min(firstMissed, position); }
      }
    }));
    if (service && stops.length) serviceCursor.set(service, ((serviceCursor.get(service) ?? 0) + (firstMissed < 0 ? index : firstMissed)) % stops.length);
    if (stops.length && !checked) throw new Error("No stops available");
    return Response.json({ status: "ok", generatedAt, observations: results.flat().filter((item) => !service || item.service === service),
      coverage: { checked, total: stops.length } }, { headers });
  } catch {
    // Never reflect upstream diagnostics or credential-bearing request details to the browser.
    return Response.json({ status: "error", generatedAt, observations: [] }, {
      status: 503, headers: { ...headers, "Cache-Control": "no-store" },
    });
  }
}

export function OPTIONS() { return new Response(null, { status: 204, headers }); }
