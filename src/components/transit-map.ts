import maplibregl, { type GeoJSONSource, type Map as LibreMap, type MapLayerMouseEvent } from "maplibre-gl";
import { pointAlongRoute, routeGroupId, vehicleDistanceAt, type Position, type TransitCatalog, type TransitRoute, type TransitVehicle } from "@/lib/transit";

const BASE = process.env.NEXT_PUBLIC_BASE_PATH ?? "";
export function renderTransit(map: LibreMap, options: {
  catalog: TransitCatalog | null; routes: TransitRoute[]; vehicles: TransitVehicle[];
  selectedRouteId: string | null;
  focusedGroup: string | null; stopNames: boolean;
  onVehicle: (vehicle: TransitVehicle) => void; onRoute: (id: string | null, position?: Position) => void;
  vehicleLabel: (vehicle: TransitVehicle, stale: boolean) => string;
}) {
  let disposed = false, frame = 0, lastFrame = 0;
  let reducedTimer: ReturnType<typeof setTimeout> | undefined;
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
  map.setLayoutProperty("transit-station-labels", "visibility", options.stopNames ? "visible" : "none");
  map.setLayerZoomRange("transit-station-dots", options.focusedGroup ? 0 : 12, 24);
  const routeById = new Map(options.routes.map((route) => [route.id, route]));
  const drawn = options.routes;
  map.getSource<GeoJSONSource>("transit-routes")?.setData({ type: "FeatureCollection", features: drawn.flatMap((route) => route.paths.map((coordinates) => ({
    type: "Feature", geometry: { type: "LineString", coordinates },
    properties: { routeId: route.id, colour: route.colour, selected: routeGroupId(route) === options.focusedGroup || route.id === options.selectedRouteId },
  }))) });
  const stopColours = new Map(drawn.flatMap((route) => route.stopIds.map((id) => [id, route.colour] satisfies [string, string])));
  map.getSource<GeoJSONSource>("transit-stops")?.setData({ type: "FeatureCollection", features: (options.catalog?.stops ?? [])
    .filter((stop) => stopColours.has(stop.id)).map((stop) => ({ type: "Feature", geometry: { type: "Point", coordinates: stop.position },
      properties: { name: stop.name, colour: stopColours.get(stop.id) } })) });

  // DOM markers keep image movement and native button hit targets independent of
  // the asynchronous GeoJSON tiling and symbol-placement workers.
  const markers: { marker: maplibregl.Marker; button: HTMLButtonElement; arrow: SVGSVGElement;
    vehicle: TransitVehicle; route: TransitRoute }[] = [];
  const occupied = new Set<string>();
  for (const vehicle of options.vehicles) {
    const route = routeById.get(vehicle.routeId);
    if (!route?.paths[0] || Date.now() >= vehicle.expiresAt) continue;
    const point = pointAlongRoute(route.paths[0], vehicleDistanceAt(vehicle, Date.now()));
    const screen = map.project(point.position);
    const cell = `${Math.floor(screen.x / 60)}:${Math.floor(screen.y / 60)}`;
    if (!options.focusedGroup && map.getZoom() < 13 && occupied.has(cell)) continue;
    occupied.add(cell);
    const button = document.createElement("button");
    button.type = "button"; button.className = "atlas-vehicle-marker";
    button.dataset.routeId = route.id;
    button.style.setProperty("--vehicle-route-colour", route.colour);
    const image = document.createElement("img");
    image.src = `${BASE}/transit/${vehicle.icon}.png`; image.alt = ""; image.draggable = false;
    const label = document.createElement("span"); label.textContent = vehicle.service;
    const arrow = document.createElementNS("http://www.w3.org/2000/svg", "svg");
    arrow.setAttribute("viewBox", "0 0 16 16"); arrow.setAttribute("aria-hidden", "true");
    const arrowPath = document.createElementNS("http://www.w3.org/2000/svg", "path");
    arrowPath.setAttribute("d", "M4 12 8 3 12 12"); arrow.append(arrowPath);
    button.append(image, label, arrow);
    button.addEventListener("click", (event) => { event.stopPropagation(); options.onVehicle(vehicle); });
    button.addEventListener("keydown", (event) => event.stopPropagation());
    const marker = new maplibregl.Marker({ element: button, anchor: "center", pitchAlignment: "viewport" })
      .setLngLat(point.position).addTo(map);
    markers.push({ marker, button, arrow, vehicle, route });
  }
  const drawVehicles = (time: number) => {
    if (disposed) return;
    if (!document.hidden && time - lastFrame > 40) {
      lastFrame = time;
      const now = Date.now();
      for (const { marker, button, arrow, vehicle, route } of markers) {
        if (now >= vehicle.expiresAt) { marker.remove(); continue; }
        const point = pointAlongRoute(route.paths[0], vehicleDistanceAt(vehicle, reduced.matches ? vehicle.observedAt : now));
        marker.setLngLat(point.position);
        const stale = now >= vehicle.staleAt;
        button.dataset.state = stale ? "stale" : "recent";
        button.setAttribute("aria-label", options.vehicleLabel(vehicle, stale));
        arrow.style.transform = `rotate(${point.bearing - map.getBearing()}deg)`;
      }
    }
    if (markers.some(({ vehicle }) => Date.now() < vehicle.expiresAt)) {
      if (reduced.matches) reducedTimer = setTimeout(() => drawVehicles(performance.now()), 1000);
      else frame = requestAnimationFrame(drawVehicles);
    }
  };
  if (markers.length) frame = requestAnimationFrame(drawVehicles);
  const selectRoute = (event: MapLayerMouseEvent) => {
    const id: unknown = event.features?.[0]?.properties?.routeId;
    if (typeof id === "string") options.onRoute(id, [event.lngLat.lng, event.lngLat.lat]);
  };
  const pointer = () => { map.getCanvas().style.cursor = "pointer"; };
  const clearPointer = () => { map.getCanvas().style.cursor = ""; };
  map.on("click", "transit-route-hit", selectRoute);
  map.on("mouseenter", "transit-route-hit", pointer);
  map.on("mouseleave", "transit-route-hit", clearPointer);
  return () => {
    disposed = true; cancelAnimationFrame(frame); clearTimeout(reducedTimer);
    markers.forEach(({ marker }) => marker.remove());
    map.off("click", "transit-route-hit", selectRoute);
    map.off("mouseenter", "transit-route-hit", pointer);
    map.off("mouseleave", "transit-route-hit", clearPointer);
  };
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
