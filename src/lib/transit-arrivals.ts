import { isRecord, distance, orderedStopDistances, projectOnRoute, routeMetrics, vehicleDistanceAt,
  type BusObservation, type TransitFeed, type TransitCatalog, type TransitRoute, type TransitStop, type TransitVehicle } from "./transit.ts";
import { SCHEDULE_CAPTURED_AT, SCHEDULE_LINES, scheduledStopArrivals } from "./transit-schedule.ts";

const stopCache = new WeakMap<TransitRoute, { stop: TransitStop; along: number }[]>();
/** Rail stopIds are alphabetical; bus stopIds are ordered and may repeat on loops. */
export function primaryRouteStops(catalog: TransitCatalog, route: TransitRoute) {
  const cached = stopCache.get(route);
  if (cached) return cached;
  const path = route.paths[0];
  if (!path) return [];
  const stops = new Map(catalog.stops.map((stop) => [stop.id, stop]));
  const along = route.mode === "bus" ? orderedStopDistances(route, stops) : null;
  const result = route.stopIds.flatMap((id, index) => {
    const stop = stops.get(id);
    if (!stop) return [];
    const projected = projectOnRoute(path, stop.position);
    return projected.distance <= 220 ? [{ stop, along: along?.[index] ?? projected.along }] : [];
  }).sort((a, b) => a.along - b.along);
  stopCache.set(route, result);
  return result;
}

export function routeJourney(catalog: TransitCatalog, route: TransitRoute, along: number, direction: 1 | -1) {
  const path = route.paths[0], stops = primaryRouteStops(catalog, route);
  const loop = Boolean(path && distance(path[0], path.at(-1)!) < 120);
  const ordered = direction === 1 ? stops : [...stops].reverse();
  const next = ordered.find((item) => direction * (item.along - along) > 5);
  const namedDestination = direction === 1 ? catalog.stops.find((stop) => route.stopIds.includes(stop.id) && stop.name === route.destination) : undefined;
  const terminal = route.mode === "bus" ? catalog.stops.find((stop) => stop.id === route.stopIds.at(-1))
    : namedDestination ?? (loop && path ? [...stops].sort((a, b) => distance(a.stop.position, path[direction === 1 ? path.length - 1 : 0]) - distance(b.stop.position, path[direction === 1 ? path.length - 1 : 0]))[0]?.stop : ordered.at(-1)?.stop);
  let area = 0;
  if (loop && path) for (let i = 1; i < path.length; i++) area += path[i - 1][0] * path[i][1] - path[i][0] * path[i - 1][1];
  return { next: next?.stop ?? (loop ? terminal : undefined), nextDistance: next?.along ?? (loop && path ? direction === 1 ? routeMetrics(path).at(-1) : 0 : undefined),
    terminal, loop, clockwise: area * direction < 0 };
}

export function vehicleJourney(catalog: TransitCatalog, vehicle: TransitVehicle, now: number) {
  const route = catalog.routes.find((route) => route.id === vehicle.routeId);
  if (!route) return null;
  const journey = routeJourney(catalog, route, vehicleDistanceAt(vehicle, now), vehicle.direction);
  const arrivalStop = catalog.stops.find((stop) => stop.id === vehicle.arrivalStopId);
  let nextArrivalAt: number | undefined;
  if (journey.nextDistance !== undefined) {
    if (vehicle.evidence === "schedule") {
      const fraction = (journey.nextDistance - vehicle.fromDistance) / (vehicle.toDistance - vehicle.fromDistance);
      if (fraction >= 0 && fraction <= 1) nextArrivalAt = vehicle.observedAt + fraction * (vehicle.arrivalAt - vehicle.observedAt);
    } else if (arrivalStop?.id === journey.next?.id && Math.abs(vehicle.toDistance - journey.nextDistance) < 80) {
      nextArrivalAt = vehicle.arrivalAt;
    }
  }
  return { ...journey, route, arrivalStop, nextArrivalAt };
}

export interface StopArrival {
  id: string; service: string; destination: string; route?: TransitRoute;
  direction: 1 | -1; arrivalAt: number; observedAt: number; evidence: "eta" | "schedule" | "operator";
  via?: string; loop: boolean; clockwise: boolean;
}
export function stopArrivals(catalog: TransitCatalog, stop: TransitStop, observations: BusObservation[], now: number, estimated: boolean): StopArrival[] {
  const routes = catalog.routes.filter((route) => route.mode === stop.mode && route.stopIds.includes(stop.id));
  const arrivals: StopArrival[] = [];
  if (stop.mode === "bus") {
    for (const item of observations) {
      if (item.stopId !== stop.id || now - item.observedAt >= 90000 || item.observedAt > now + 5000
        || item.arrivalAt < Math.min(now, item.observedAt + 45000) - 30000) continue;
      const route = routes.find((route) => route.service === item.service && route.stopIds.at(-1) === item.destination);
      const destination = catalog.stops.find((stop) => stop.id === item.destination)?.name ?? route?.destination ?? item.destination;
      arrivals.push({ id: `${item.service}:${item.destination}:${item.visitNumber}:${item.arrivalAt}`, service: item.service,
        destination, route, direction: 1, arrivalAt: item.arrivalAt, observedAt: item.observedAt, evidence: item.monitored ? "eta" : "operator", loop: false, clockwise: false });
    }
  } else if (estimated) {
    for (const route of routes) {
      const line = SCHEDULE_LINES.find((line) => line.routeId === route.id);
      if (!line) continue;
      const along = projectOnRoute(route.paths[0], stop.position).along;
      for (const item of scheduledStopArrivals(line, route, stop, now)) {
        const journey = routeJourney(catalog, route, along, item.direction);
        const ordered = primaryRouteStops(catalog, route);
        const via = journey.next?.id === stop.id && journey.loop
          ? (item.direction === 1 ? ordered : [...ordered].reverse()).find((item) => item.stop.id !== stop.id)?.stop.name
          : journey.next?.name;
        arrivals.push({ id: `${route.id}:${item.direction}:${item.arrivalAt}`, service: route.service,
          destination: journey.terminal?.name ?? route.destination, route, direction: item.direction,
          arrivalAt: item.arrivalAt, observedAt: Date.parse(`${SCHEDULE_CAPTURED_AT}T00:00:00+08:00`),
          evidence: "schedule", via, loop: journey.loop, clockwise: journey.clockwise });
      }
    }
  }
  return arrivals.sort((a, b) => a.arrivalAt - b.arrivalAt).filter((item, index, all) => all.findIndex((other) => other.id === item.id) === index);
}

export function groupStopArrivals(arrivals: StopArrival[]) {
  const groups = new Map<string, StopArrival[]>();
  for (const arrival of arrivals) {
    const key = `${arrival.route?.id ?? arrival.service}:${arrival.direction}:${arrival.destination}:${arrival.evidence}`;
    const group = groups.get(key) ?? [];
    if (group.length < 3) groups.set(key, [...group, arrival]);
  }
  return [...groups.values()];
}

export function parseTransitFeed(value: unknown): TransitFeed {
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

