export const TRANSIT_MODES = ["bus", "train", "ferry", "sentosa", "cablecar", "skytrain"] as const;
export type TransitMode = (typeof TRANSIT_MODES)[number];
export type Position = [number, number];
export type TransitActive = Record<TransitMode, boolean>;
export const TRANSIT_DEFAULTS: TransitActive = { bus: false, train: false, ferry: false, sentosa: false, cablecar: false, skytrain: false };
export const TRANSIT_ICONS = {
  bus: "bus-single-deck", train: "train-nsew", ferry: "ferry-island-cruise",
  sentosa: "train-sentosa", cablecar: "cable-car", skytrain: "train-skytrain",
} satisfies Record<TransitMode, string>;

export interface TransitStop {
  id: string; name: string; position: Position; mode: TransitMode;
}
export interface TransitRoute {
  id: string; mode: TransitMode; service: string; name: string; destination: string;
  direction: number; colour: string; colourSource: "official" | "display";
  paths: Position[][]; stopIds: string[]; sourceUrl: string;
  access?: "public" | "transit";
}
export interface TransitCatalog {
  generatedAt: string; sourceUpdatedAt: string; attribution: string;
  routes: TransitRoute[]; stops: TransitStop[];
}
export interface TransitViewport { west: number; south: number; east: number; north: number; zoom: number }
export interface BusObservation {
  service: string; stopId: string; origin: string; destination: string;
  arrivalAt: number; observedAt: number; position: Position | null;
  monitored: boolean; type: "SD" | "DD" | "BD";
  visitNumber: number;
}
export interface TransitVehicle {
  id: string; routeId: string; service: string; destination: string;
  evidence: "eta" | "gps"; icon: string;
  fromDistance: number; toDistance: number;
  observedAt: number; arrivalAt: number; staleAt: number; expiresAt: number;
}
export interface TransitFeed {
  status: "ok" | "unconfigured" | "error";
  generatedAt: number; observations: BusObservation[];
  coverage?: { checked: number; total: number };
}

/** A service includes both directions. Ferry connections have no shared service code. */
export function routeGroupId(route: TransitRoute) {
  return route.mode === "ferry" ? route.id : `${route.mode}:${route.service}`;
}
export type TransitFilters = Record<TransitMode, string[] | null>;
export const TRANSIT_FILTER_DEFAULTS: TransitFilters = { bus: null, train: null, ferry: null, sentosa: null, cablecar: null, skytrain: null };
export function filteredTransitRoutes(catalog: TransitCatalog, active: TransitActive,
  filters: TransitFilters, focusedGroup: string | null, viewport: TransitViewport | null) {
  return catalog.routes.filter((route) => {
    if (!active[route.mode]) return false;
    const group = routeGroupId(route);
    if (focusedGroup) return group === focusedGroup;
    const selected = filters[route.mode];
    return selected === null ? Boolean(viewport && routeInView(route, viewport)) : selected.includes(group);
  });
}

/** Overview sampling must never keep polling a route that a filter has hidden. */
export function sampledBusStops(catalog: TransitCatalog, routes: TransitRoute[],
  viewport: TransitViewport, selectedRouteId: string | null) {
  const buses = routes.filter((route) => route.mode === "bus");
  if (!buses.length) return [];
  const routeStops = new Set(buses.flatMap((route) => route.stopIds));
  const selected = buses.find((route) => route.id === selectedRouteId);
  const centre = [(viewport.west + viewport.east) / 2, (viewport.south + viewport.north) / 2];
  const nearby = catalog.stops.filter((stop) => stop.mode === "bus" && routeStops.has(stop.id)
    && stop.position[0] >= viewport.west && stop.position[0] <= viewport.east
    && stop.position[1] >= viewport.south && stop.position[1] <= viewport.north)
    .sort((a, b) => Math.hypot(a.position[0] - centre[0], a.position[1] - centre[1])
      - Math.hypot(b.position[0] - centre[0], b.position[1] - centre[1]));
  const selectedIds = selected ? [0.15, 0.4, 0.65, 0.85].map((fraction) => selected.stopIds[Math.floor((selected.stopIds.length - 1) * fraction)]) : [];
  return [...new Set([...selectedIds, ...nearby.map((stop) => stop.id)].filter(Boolean))].slice(0, 8).sort();
}

export function isTransitMode(value: unknown): value is TransitMode {
  return typeof value === "string" && (TRANSIT_MODES as readonly string[]).includes(value);
}
export function isPosition(value: unknown): value is Position {
  return Array.isArray(value) && value.length === 2 && value.every(Number.isFinite)
    && value[0] >= 103.4 && value[0] <= 104.2 && value[1] >= 1.1 && value[1] <= 1.55;
}
export function isRecord(value: unknown): value is Record<string, unknown> {
  return value !== null && typeof value === "object" && !Array.isArray(value);
}
export function parseTransitCatalog(value: unknown): TransitCatalog {
  if (!isRecord(value) || typeof value.generatedAt !== "string" || typeof value.sourceUpdatedAt !== "string"
    || typeof value.attribution !== "string" || !Array.isArray(value.routes) || !Array.isArray(value.stops)) {
    throw new Error("Invalid transit catalogue");
  }
  const stops: TransitStop[] = value.stops.map((stop: unknown) => {
    if (!isRecord(stop) || typeof stop.id !== "string" || typeof stop.name !== "string"
      || !isTransitMode(stop.mode) || !isPosition(stop.position)) throw new Error("Invalid transit stop");
    return { id: stop.id, name: stop.name, mode: stop.mode, position: stop.position };
  });
  const routes: TransitRoute[] = value.routes.map((route: unknown) => {
    if (!isRecord(route) || typeof route.id !== "string" || !isTransitMode(route.mode)
      || typeof route.service !== "string" || typeof route.name !== "string"
      || typeof route.destination !== "string" || typeof route.direction !== "number"
      || typeof route.colour !== "string" || !/^#[0-9a-f]{6}$/i.test(route.colour)
      || (route.colourSource !== "official" && route.colourSource !== "display")
      || typeof route.sourceUrl !== "string" || !route.sourceUrl.startsWith("https://")
      || !Array.isArray(route.stopIds) || !route.stopIds.every((id: unknown) => typeof id === "string")
      || !Array.isArray(route.paths)) throw new Error("Invalid transit route");
    const paths: Position[][] = route.paths.map((path: unknown) => {
      if (!Array.isArray(path) || path.length < 2 || !path.every(isPosition)) throw new Error("Invalid transit geometry");
      return path;
    });
    return { id: route.id, mode: route.mode, service: route.service, name: route.name,
      destination: route.destination, direction: route.direction, colour: route.colour,
      colourSource: route.colourSource, paths, stopIds: route.stopIds, sourceUrl: route.sourceUrl,
      ...(route.access === "public" || route.access === "transit" ? { access: route.access } : {}) };
  });
  return { generatedAt: value.generatedAt, sourceUpdatedAt: value.sourceUpdatedAt,
    attribution: value.attribution, routes, stops };
}

export function distance(a: Position, b: Position) {
  return Math.hypot((a[0] - b[0]) * 111280 * Math.cos(a[1] * Math.PI / 180), (a[1] - b[1]) * 111280);
}
// Catalogue paths are immutable. Reuse their distances for every animation frame.
const pathMetrics = new WeakMap<Position[], number[]>();
export function routeMetrics(path: Position[]) {
  const cached = pathMetrics.get(path);
  if (cached) return cached;
  const distances = [0];
  for (let i = 1; i < path.length; i++) distances.push(distances[i - 1] + distance(path[i - 1], path[i]));
  pathMetrics.set(path, distances);
  return distances;
}
export function projectOnRoute(path: Position[], position: Position, minimum = 0, maximum = Infinity) {
  let best = { distance: Infinity, along: 0, position, bearing: 0 };
  let along = 0;
  for (let i = 1; i < path.length; i++) {
    const a = path[i - 1], b = path[i];
    const segment = distance(a, b);
    const lower = Math.max(0, (minimum - along) / (segment || 1));
    const upper = Math.min(1, (maximum - along) / (segment || 1));
    if (lower > upper) { along += segment; continue; }
    const x = (b[0] - a[0]) * Math.cos(a[1] * Math.PI / 180), y = b[1] - a[1];
    const px = (position[0] - a[0]) * Math.cos(a[1] * Math.PI / 180), py = position[1] - a[1];
    const fraction = Math.max(lower, Math.min(upper, (px * x + py * y) / (x * x + y * y || 1)));
    const point: Position = [a[0] + fraction * (b[0] - a[0]), a[1] + fraction * (b[1] - a[1])];
    const error = distance(point, position);
    if (error < best.distance) best = { distance: error, along: along + segment * fraction,
      position: point, bearing: Math.atan2(x, y) * 180 / Math.PI };
    along += segment;
  }
  return best;
}
export function pointAlongRoute(path: Position[], metres: number) {
  if (path.length < 2) return { position: path[0] ?? [103.8198, 1.3521] satisfies Position, bearing: 0 };
  const metrics = routeMetrics(path), along = Math.max(0, Math.min(metres, metrics[metrics.length - 1]));
  let low = 1, high = path.length - 1;
  while (low < high) { const middle = (low + high) >>> 1; if (metrics[middle] < along) low = middle + 1; else high = middle; }
  const a = path[low - 1], b = path[low];
  const fraction = (along - metrics[low - 1]) / (metrics[low] - metrics[low - 1] || 1);
  const position: Position = [a[0] + (b[0] - a[0]) * fraction, a[1] + (b[1] - a[1]) * fraction];
  return { position, bearing: Math.atan2((b[0] - a[0]) * Math.cos(a[1] * Math.PI / 180), b[1] - a[1]) * 180 / Math.PI };
}
export function vehicleDistanceAt(vehicle: TransitVehicle, now: number) {
  const time = Math.min(now, vehicle.staleAt);
  const fraction = Math.max(0, Math.min(1, (time - vehicle.observedAt) / Math.max(1, vehicle.arrivalAt - vehicle.observedAt)));
  return vehicle.fromDistance + (vehicle.toDistance - vehicle.fromDistance) * fraction;
}

export const VEHICLE_CORRECTION_MS = 1500;
export const VEHICLE_REACQUIRE_MS = 320;
export interface VehicleMotion {
  vehicle: TransitVehicle;
  correction: { kind: "none" } | { kind: "blend"; startedAt: number; offset: number }
    | { kind: "reacquire"; startedAt: number; fromDistance: number };
}
export function vehicleMotionAt(motion: VehicleMotion, now: number) {
  const { vehicle, correction } = motion;
  const target = vehicleDistanceAt(vehicle, now);
  if (now >= vehicle.expiresAt) return { distance: target, opacity: 0 };
  if (correction.kind === "blend") {
    // Freeze the correction as well as the evidence trajectory when it is stale.
    const progress = Math.max(0, Math.min(1, (Math.min(now, vehicle.staleAt) - correction.startedAt) / VEHICLE_CORRECTION_MS));
    const eased = progress * progress * (3 - 2 * progress);
    return { distance: Math.max(0, Math.min(vehicle.toDistance, target + correction.offset * (1 - eased))), opacity: 1 };
  }
  if (correction.kind === "reacquire") {
    const progress = Math.max(0, Math.min(1, (now - correction.startedAt) / VEHICLE_REACQUIRE_MS));
    return progress < 0.5 ? { distance: correction.fromDistance, opacity: 1 - progress * 2 }
      : { distance: target, opacity: (progress - 0.5) * 2 };
  }
  return { distance: target, opacity: 1 };
}
/** A correction may outlast arrival; keep display-refresh updates until it ends. */
export function vehicleMotionIsAnimating(motion: VehicleMotion, now: number) {
  const { vehicle, correction } = motion;
  if (now >= vehicle.expiresAt) return false;
  if (correction.kind === "reacquire" && now < correction.startedAt + VEHICLE_REACQUIRE_MS) return true;
  if (now >= vehicle.staleAt) return false;
  return now < vehicle.arrivalAt || (correction.kind === "blend" && now < correction.startedAt + VEHICLE_CORRECTION_MS);
}
export function reconcileVehicleMotion(previous: VehicleMotion, vehicle: TransitVehicle, now: number, reducedMotion = false): VehicleMotion {
  if (vehicle.observedAt <= previous.vehicle.observedAt) return previous;
  const from = vehicleMotionAt(previous, now).distance, target = vehicleDistanceAt(vehicle, now);
  const offset = from - target;
  if (reducedMotion || now >= vehicle.staleAt || Math.abs(offset) < 0.05) return { vehicle, correction: { kind: "none" } };
  const speed = (vehicle.toDistance - vehicle.fromDistance) / Math.max(1, (vehicle.arrivalAt - vehicle.observedAt) / 1000);
  // A backward revision that cannot be absorbed without reversing is a new
  // estimate to reacquire, not evidence of a bus travelling backwards.
  const safeBacktrack = Math.max(0, speed) * (VEHICLE_CORRECTION_MS / 1000) / 1.5;
  return { vehicle, correction: Math.abs(offset) > 80 || offset > safeBacktrack
    ? { kind: "reacquire", startedAt: now, fromDistance: from }
    : { kind: "blend", startedAt: now, offset } };
}
export function screenRouteHeading(from: { x: number; y: number }, to: { x: number; y: number }, fallback = 0) {
  return Math.hypot(to.x - from.x, to.y - from.y) < 0.001 ? fallback
    : Math.atan2(to.x - from.x, from.y - to.y) * 180 / Math.PI;
}
export function smoothHeading(current: number, target: number, elapsedMs: number) {
  const turn = ((target - current + 180) % 360 + 360) % 360 - 180;
  return current + turn * (1 - Math.exp(-Math.max(0, elapsedMs) / 90));
}
export function routeInView(route: TransitRoute, view: TransitViewport) {
  // A bounding-box intersection includes a path crossing the viewport even if no vertex lies inside it.
  return route.paths.some((path) => {
    let west = Infinity, east = -Infinity, south = Infinity, north = -Infinity;
    for (const [lng, lat] of path) { west = Math.min(west, lng); east = Math.max(east, lng); south = Math.min(south, lat); north = Math.max(north, lat); }
    return west <= view.east && east >= view.west && south <= view.north && north >= view.south;
  });
}

const stopDistanceCache = new WeakMap<TransitRoute, number[]>();
function orderedStopDistances(route: TransitRoute, stops: Map<string, TransitStop>) {
  const cached = stopDistanceCache.get(route);
  if (cached) return cached;
  let progress = 0;
  const distances = route.stopIds.map((id) => {
    const point = stops.get(id)?.position;
    if (point && route.paths[0]) progress = projectOnRoute(route.paths[0], point, progress).along;
    return progress;
  });
  stopDistanceCache.set(route, distances);
  return distances;
}

export function inferBusVehicles(catalog: TransitCatalog, observations: BusObservation[], previous: TransitVehicle[], now: number): TransitVehicle[] {
  const stops = new Map(catalog.stops.map((stop) => [stop.id, stop]));
  const candidates: TransitVehicle[] = [];
  const usedPrevious = new Set<string>();
  for (const obs of observations) {
    if (!obs.monitored || obs.arrivalAt <= now || obs.observedAt > now + 5000 || now - obs.observedAt > 90000) continue;
    const stop = stops.get(obs.stopId);
    if (!stop) continue;
    const matching = catalog.routes.filter((route) => route.mode === "bus" && route.service === obs.service
      && route.stopIds.includes(obs.stopId) && route.stopIds.at(-1) === obs.destination);
    let best: { route: TransitRoute; from: number; to: number; error: number } | null = null;
    for (const route of matching) {
      const path = route.paths[0];
      if (!path) continue;
      const stopDistances = orderedStopDistances(route, stops);
      const occurrences = route.stopIds.flatMap((id, index) => id === obs.stopId ? [index] : []);
      const stopIndex = occurrences[Math.max(0, Math.min(occurrences.length - 1, (obs.visitNumber || 1) - 1))];
      const target = stopDistances[stopIndex];
      let from: number | null = null, error = 0;
      if (obs.position) {
        const projected = projectOnRoute(path, obs.position, 0, target + 70);
        if (projected.distance > 220 || projected.along > target + 70) continue;
        from = Math.min(target, projected.along); error = projected.distance;
      } else {
        // Infer speed only from two arrival predictions for the same service/destination.
        const index = stopIndex;
        const next = observations.filter((other) => other !== obs && other.monitored && other.service === obs.service && other.origin === obs.origin
          && other.destination === obs.destination && route.stopIds.indexOf(other.stopId) > index
          && other.arrivalAt - obs.arrivalAt >= 15000 && other.arrivalAt - obs.arrivalAt <= 240000)
          .sort((a, b) => a.arrivalAt - b.arrivalAt)[0];
        const nextStop = next && stops.get(next.stopId);
        if (!next || !nextStop) continue;
        const nextAlong = stopDistances[route.stopIds.indexOf(next.stopId)];
        const speed = (nextAlong - target) / ((next.arrivalAt - obs.arrivalAt) / 1000);
        if (speed < 0.5 || speed > 25) continue;
        from = Math.max(0, target - speed * ((obs.arrivalAt - now) / 1000));
        error = 221;
      }
      const speed = (target - from) / Math.max(1, (obs.arrivalAt - now) / 1000);
      if (speed > 30) continue;
      if (!best || error < best.error) best = { route, from, to: target, error };
    }
    if (!best) continue;
    const { route, from, to } = best;
    if (candidates.some((vehicle) => vehicle.routeId === route.id && Math.abs(vehicle.fromDistance - from) < 55)) continue;
    const existing = previous.filter((vehicle) => vehicle.routeId === route.id && !usedPrevious.has(vehicle.id)
      && vehicle.expiresAt > now && Math.abs(vehicleDistanceAt(vehicle, now) - from) < 350)
      .sort((a, b) => Math.abs(vehicleDistanceAt(a, now) - from) - Math.abs(vehicleDistanceAt(b, now) - from))[0];
    if (existing) usedPrevious.add(existing.id);
    if (existing && obs.observedAt <= existing.observedAt) { candidates.push(existing); continue; }
    candidates.push({ id: existing?.id ?? `${route.id}:${obs.stopId}:${Math.round(obs.arrivalAt / 1000)}:${Math.round(from)}`,
      routeId: route.id, service: obs.service, destination: route.destination, evidence: "eta",
      icon: obs.type === "DD" ? "bus-double-deck" : obs.type === "BD" ? "bus-articulated" : "bus-single-deck",
      fromDistance: from, toDistance: to, observedAt: obs.observedAt, arrivalAt: obs.arrivalAt,
      staleAt: obs.observedAt + 45000, expiresAt: obs.observedAt + 90000 });
  }
  return candidates;
}

export function parseBusObservations(value: unknown, stopId: string, observedAt: number): BusObservation[] {
  if (!isRecord(value) || !Array.isArray(value.Services)) throw new Error("Invalid bus arrivals");
  const result: BusObservation[] = [];
  for (const service of value.Services) {
    if (!isRecord(service) || typeof service.ServiceNo !== "string") continue;
    for (const key of ["NextBus", "NextBus2", "NextBus3"]) {
      const bus = service[key];
      if (!isRecord(bus) || typeof bus.EstimatedArrival !== "string") continue;
      const arrivalAt = Date.parse(bus.EstimatedArrival);
      if (!Number.isFinite(arrivalAt)) continue;
      const coordinate = [Number(bus.Longitude), Number(bus.Latitude)];
      result.push({ service: service.ServiceNo, stopId,
        origin: typeof bus.OriginCode === "string" ? bus.OriginCode : "",
        destination: typeof bus.DestinationCode === "string" ? bus.DestinationCode : "",
        arrivalAt, observedAt, position: isPosition(coordinate) ? coordinate : null,
        monitored: bus.Monitored === 1 || bus.Monitored === "1",
        visitNumber: Number.isInteger(Number(bus.VisitNumber)) && Number(bus.VisitNumber) > 0 ? Number(bus.VisitNumber) : 1,
        type: bus.Type === "DD" || bus.Type === "BD" ? bus.Type : "SD" });
    }
  }
  return result;
}
