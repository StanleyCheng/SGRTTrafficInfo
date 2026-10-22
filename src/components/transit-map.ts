import maplibregl, { type GeoJSONSource, type Map as LibreMap, type MapLayerMouseEvent } from "maplibre-gl";
import { pointAlongRoute, reconcileVehicleMotion, routeGroupId, screenRouteHeading, smoothHeading,
  vehicleMotionAt, vehicleMotionIsAnimating, vehicleHeadingPoints, reducedVehicleDistanceAt, type Position, type TransitCatalog, type TransitRoute, type TransitVehicle, type VehicleMotion } from "@/lib/transit";
import { movingSprite } from "@/lib/transit-sprites";

const BASE = process.env.NEXT_PUBLIC_BASE_PATH ?? "";
const FADE_MS = 160;
export interface TransitRenderOptions {
  catalog: TransitCatalog | null; routes: TransitRoute[]; vehicles: TransitVehicle[];
  selectedRouteId: string | null;
  focusedGroup: string | null; stopNames: boolean;
  onVehicle: (vehicle: TransitVehicle) => void; onRoute: (id: string | null, position?: Position) => void;
  vehicleLabel: (vehicle: TransitVehicle, stale: boolean) => string;
}
interface VehicleMarker {
  marker: maplibregl.Marker; button: HTMLButtonElement; art: HTMLDivElement; image: HTMLImageElement;
  arrow: SVGSVGElement; label: HTMLSpanElement; motion: VehicleMotion; route: TransitRoute;
  spriteFront: number; heading: number | null; headingPoints: [Position, Position] | null; distance: number | null;
  phase: { kind: "active"; enteredAt: number } | { kind: "retiring"; startedAt: number };
}

/** One lifetime per map: fresh estimates update existing markers without losing focus. */
export function createTransitRenderer(map: LibreMap) {
  let disposed = false, frame = 0, lastFrame = 0;
  let timer: ReturnType<typeof setTimeout> | undefined;
  let options: TransitRenderOptions | null = null;
  let sourceState: Pick<TransitRenderOptions, "catalog" | "routes" | "selectedRouteId" | "focusedGroup" | "stopNames"> | null = null;
  const entries = new Map<string, VehicleMarker>();
  const reduced = window.matchMedia("(prefers-reduced-motion: reduce)");
  const tokens = getComputedStyle(document.documentElement);
  const surface = tokens.getPropertyValue("--surface").trim();
  const ink = tokens.getPropertyValue("--ink").trim();
  const empty = { type: "FeatureCollection", features: [] } satisfies GeoJSON.FeatureCollection;
  for (const id of ["transit-routes", "transit-stops"]) {
    if (!map.getSource(id)) map.addSource(id, { type: "geojson", data: empty });
  }
  if (!map.getLayer("transit-route-lines")) {
    map.addLayer({ id: "transit-route-lines", type: "line", source: "transit-routes",
      paint: { "line-color": ["get", "colour"], "line-width": ["case", ["get", "selected"], 5, 2.5], "line-opacity": ["case", ["get", "selected"], 0.95, 0.65] },
      layout: { "line-cap": "round", "line-join": "round" } });
    map.addLayer({ id: "transit-route-hit", type: "line", source: "transit-routes",
      paint: { "line-color": ink, "line-width": 16, "line-opacity": 0.01 } });
    map.addLayer({ id: "transit-station-dots", type: "circle", source: "transit-stops", minzoom: 12,
      paint: { "circle-radius": ["interpolate", ["linear"], ["zoom"], 12, 2, 16, 4], "circle-color": surface,
        "circle-stroke-width": 1.5, "circle-stroke-color": ["get", "colour"] } });
    map.addLayer({ id: "transit-station-labels", type: "symbol", source: "transit-stops",
      layout: { "text-field": ["get", "name"], "text-font": ["Noto Sans Regular"], "text-size": 11,
        "text-anchor": "top", "text-offset": [0, 0.7] },
      paint: { "text-color": ink, "text-halo-color": surface, "text-halo-width": 2 } });
  }
  function updateSources(next: TransitRenderOptions) {
    if (sourceState?.stopNames !== next.stopNames) map.setLayoutProperty("transit-station-labels", "visibility", next.stopNames ? "visible" : "none");
    if (sourceState?.focusedGroup !== next.focusedGroup) map.setLayerZoomRange("transit-station-dots", next.focusedGroup ? 0 : 12, 24);
    if (sourceState?.routes !== next.routes || sourceState?.selectedRouteId !== next.selectedRouteId || sourceState?.focusedGroup !== next.focusedGroup) {
      map.getSource<GeoJSONSource>("transit-routes")?.setData({ type: "FeatureCollection", features: next.routes.flatMap((route) => route.paths.map((coordinates) => ({
        type: "Feature", geometry: { type: "LineString", coordinates },
        properties: { routeId: route.id, colour: route.colour, selected: routeGroupId(route) === next.focusedGroup || route.id === next.selectedRouteId },
      }))) });
    }
    if (sourceState?.routes !== next.routes || sourceState?.catalog !== next.catalog) {
      const colours = new Map(next.routes.flatMap((route) => route.stopIds.map((id) => [id, route.colour] satisfies [string, string])));
      map.getSource<GeoJSONSource>("transit-stops")?.setData({ type: "FeatureCollection", features: (next.catalog?.stops ?? [])
        .filter((stop) => colours.has(stop.id)).map((stop) => ({ type: "Feature", geometry: { type: "Point", coordinates: stop.position },
          properties: { name: stop.name, colour: colours.get(stop.id) } })) });
    }
    sourceState = next;
  }
  function remove(key: string, entry: VehicleMarker) { entry.marker.remove(); entries.delete(key); }
  function cancel() { cancelAnimationFrame(frame); clearTimeout(timer); frame = 0; timer = undefined; }
  function draw(time: number) {
    if (disposed || document.hidden || !options) return;
    const now = Date.now(), elapsed = lastFrame ? Math.min(100, time - lastFrame) : 16;
    lastFrame = time;
    for (const [key, entry] of entries) {
      const { vehicle } = entry.motion;
      if (now >= vehicle.expiresAt || (entry.phase.kind === "retiring" && now - entry.phase.startedAt >= FADE_MS)) { remove(key, entry); continue; }
      const state = reduced.matches ? { distance: reducedVehicleDistanceAt(vehicle, now), opacity: 1 }
        : vehicleMotionAt(entry.motion, now);
      const path = entry.route.paths[0];
      const point = pointAlongRoute(path, state.distance);
      entry.marker.setLngLat(point.position);
      // Retain the last route tangent when stopped. Project it again when the
      // camera moves: bearing subtraction alone is wrong on a pitched map.
      if (!entry.headingPoints || entry.distance === null || Math.abs(state.distance - entry.distance) > 0.01) {
        entry.headingPoints = vehicleHeadingPoints(path, state.distance, vehicle.direction);
        entry.distance = state.distance;
      }
      const target = screenRouteHeading(map.project(entry.headingPoints[0]), map.project(entry.headingPoints[1]), entry.heading ?? 0);
      entry.heading = entry.heading === null || reduced.matches || map.isMoving() ? target : smoothHeading(entry.heading, target, elapsed);
      entry.art.style.transform = `rotate(${entry.heading - entry.spriteFront}deg)`;
      entry.arrow.style.transform = `rotate(${entry.heading}deg) translateY(-23px)`;
      const stale = now >= vehicle.staleAt;
      entry.button.dataset.state = stale ? "stale" : vehicle.evidence === "schedule" ? "scheduled" : "recent";
      entry.button.dataset.evidence = vehicle.evidence;
      const label = options.vehicleLabel(vehicle, stale);
      if (entry.button.getAttribute("aria-label") !== label) entry.button.setAttribute("aria-label", label);
      const fade = reduced.matches ? 1 : entry.phase.kind === "retiring" ? 1 - (now - entry.phase.startedAt) / FADE_MS
        : Math.min(1, (now - entry.phase.enteredAt) / FADE_MS);
      entry.button.style.setProperty("--vehicle-opacity", String(state.opacity * Math.max(0, fade)));
    }
  }
  function schedule() {
    cancel();
    if (disposed || document.hidden || !entries.size) return;
    const now = Date.now();
    const moving = !reduced.matches && [...entries.values()].some((entry) => entry.phase.kind === "retiring"
      || now - entry.phase.enteredAt < FADE_MS || vehicleMotionIsAnimating(entry.motion, now));
    if (moving) frame = requestAnimationFrame(tick);
    else timer = setTimeout(() => tick(performance.now()), 1000);
  }
  function tick(time: number) { draw(time); schedule(); }
  function update(next: TransitRenderOptions) {
    if (disposed) return;
    options = next; updateSources(next);
    const now = Date.now(), seen = new Set<string>(), occupied = new Set<string>();
    const routes = new Map(next.routes.map((route) => [route.id, route]));
    for (const vehicle of next.vehicles) {
      const route = routes.get(vehicle.routeId), sprite = movingSprite(vehicle.icon);
      if (!route?.paths[0] || !sprite || now >= vehicle.expiresAt) continue;
      const key = `${vehicle.routeId}/${vehicle.id}`;
      const previous = entries.get(key);
      const motion = previous ? reconcileVehicleMotion(previous.motion, vehicle, now, reduced.matches) : { vehicle, correction: { kind: "none" } } satisfies VehicleMotion;
      const screen = map.project(pointAlongRoute(route.paths[0], vehicleMotionAt(motion, now).distance).position);
      const cell = `${Math.floor(screen.x / 60)}:${Math.floor(screen.y / 60)}`;
      if (vehicle.evidence !== "schedule" && !next.focusedGroup && map.getZoom() < 13 && occupied.has(cell)) continue;
      occupied.add(cell); seen.add(key);
      if (previous) {
        previous.motion = motion; previous.route = route; previous.spriteFront = sprite.frontBearingDegrees;
        previous.button.style.setProperty("--vehicle-route-colour", route.colour);
        if (previous.image.getAttribute("src") !== `${BASE}${sprite.path}`) previous.image.src = `${BASE}${sprite.path}`; previous.label.textContent = vehicle.service;
        if (previous.phase.kind === "retiring") previous.phase = { kind: "active", enteredAt: now - FADE_MS };
        continue;
      }
      const button = document.createElement("button");
      button.type = "button"; button.className = "atlas-vehicle-marker"; button.dataset.routeId = route.id;
      button.style.setProperty("--vehicle-route-colour", route.colour);
      const art = document.createElement("div"); art.className = "atlas-vehicle-art";
      const image = document.createElement("img");
      image.src = `${BASE}${sprite.path}`; image.alt = ""; image.draggable = false;
      const label = document.createElement("span"); label.textContent = vehicle.service;
      const arrow = document.createElementNS("http://www.w3.org/2000/svg", "svg");
      arrow.classList.add("atlas-vehicle-heading");
      arrow.setAttribute("viewBox", "0 0 16 16"); arrow.setAttribute("aria-hidden", "true");
      const arrowPath = document.createElementNS("http://www.w3.org/2000/svg", "path");
      arrowPath.setAttribute("d", "M4 12 8 3 12 12"); arrow.append(arrowPath);
      art.append(image); button.append(art, label, arrow);
      const marker = new maplibregl.Marker({ element: button, anchor: "center", pitchAlignment: "viewport", rotationAlignment: "viewport", subpixelPositioning: true })
        .setLngLat(pointAlongRoute(route.paths[0], vehicleMotionAt(motion, now).distance).position).addTo(map);
      const entry: VehicleMarker = { marker, button, art, image, arrow, label, motion, route,
        spriteFront: sprite.frontBearingDegrees, heading: null, headingPoints: null, distance: null, phase: { kind: "active", enteredAt: now } };
      button.addEventListener("click", (event) => { event.stopPropagation(); options?.onVehicle(entry.motion.vehicle); });
      button.addEventListener("keydown", (event) => event.stopPropagation());
      entries.set(key, entry);
    }
    for (const [key, entry] of entries) {
      if (seen.has(key)) continue;
      // Filtering is immediate; a disappeared identity from a fresh feed dissolves.
      if (!routes.has(entry.route.id) || reduced.matches) remove(key, entry);
      else if (entry.phase.kind !== "retiring") entry.phase = { kind: "retiring", startedAt: now };
    }
    draw(performance.now()); schedule();
  }
  function wake() { lastFrame = 0; draw(performance.now()); schedule(); }
  const selectRoute = (event: MapLayerMouseEvent) => {
    const id: unknown = event.features?.[0]?.properties?.routeId;
    if (typeof id === "string") options?.onRoute(id, [event.lngLat.lng, event.lngLat.lat]);
  };
  const pointer = () => { map.getCanvas().style.cursor = "pointer"; };
  const clearPointer = () => { map.getCanvas().style.cursor = ""; };
  function destroy() {
    if (disposed) return;
    disposed = true; cancel(); entries.forEach(({ marker }) => marker.remove()); entries.clear();
    document.removeEventListener("visibilitychange", wake); reduced.removeEventListener("change", wake);
    map.off("move", wake); map.off("remove", destroy);
    map.off("click", "transit-route-hit", selectRoute);
    map.off("mouseenter", "transit-route-hit", pointer); map.off("mouseleave", "transit-route-hit", clearPointer);
  }
  document.addEventListener("visibilitychange", wake); reduced.addEventListener("change", wake);
  map.on("move", wake); map.on("remove", destroy);
  map.on("click", "transit-route-hit", selectRoute);
  map.on("mouseenter", "transit-route-hit", pointer); map.on("mouseleave", "transit-route-hit", clearPointer);
  return { update, destroy };
}

/** Separate lifetime from moving-marker refreshes, so an open popup keeps focus. */
export function renderTransitPopup(map: LibreMap, options: {
  route: TransitRoute; position: Position; directions: string[];
  title: string; action: string; note: string; closeLabel: string;
  onFocus: () => void; onClose: () => void;
}) {
  const content = document.createElement("div"); content.className = "atlas-transit-popup";
  const title = document.createElement("strong"); title.textContent = options.title;
  const name = document.createElement("p"); name.textContent = options.route.name;
  const directions = document.createElement("p"); directions.textContent = options.directions.join(" ↔ ");
  const note = document.createElement("p"); note.className = "text-muted"; note.textContent = options.note;
  const action = document.createElement("button"); action.type = "button"; action.className = "atlas-route-primary";
  action.textContent = options.action; action.addEventListener("click", options.onFocus);
  content.append(title, name, directions, action, note);
  const popup = new maplibregl.Popup({ maxWidth: "290px", closeOnClick: false, focusAfterOpen: false })
    .setLngLat(options.position).setDOMContent(content).addTo(map);
  popup.getElement().querySelector(".maplibregl-popup-close-button")?.setAttribute("aria-label", options.closeLabel);
  popup.on("close", options.onClose);
  return () => { popup.off("close", options.onClose); popup.remove(); };
}
