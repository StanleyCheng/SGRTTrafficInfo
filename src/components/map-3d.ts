import type { Map as LibreMap } from "maplibre-gl";

export type MapMode = "2d" | "3d";

export function applyMapMode(map: LibreMap, mode: MapMode, animate = true) {
  if (!map.getSource("atlas-buildings")) {
    map.addSource("atlas-buildings", {
      type: "vector",
      url: "https://tiles.openfreemap.org/planet",
      attribution: '© <a href="https://www.openmaptiles.org/">OpenMapTiles</a> © <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors',
    });
  }
  if (!map.getLayer("atlas-buildings-3d")) {
    const before = map.getStyle().layers.find((layer) => layer.type === "symbol")?.id;
    const colour = getComputedStyle(document.documentElement).getPropertyValue("--building").trim();
    map.addLayer({
      id: "atlas-buildings-3d", type: "fill-extrusion", source: "atlas-buildings",
      "source-layer": "building", minzoom: 14,
      filter: ["!=", ["get", "hide_3d"], true],
      paint: {
        "fill-extrusion-color": colour,
        "fill-extrusion-height": ["coalesce", ["get", "render_height"], 0],
        "fill-extrusion-base": ["coalesce", ["get", "render_min_height"], 0],
        "fill-extrusion-opacity": 0.86,
      },
    }, before);
  }
  map.setLayoutProperty("atlas-buildings-3d", "visibility", mode === "3d" ? "visible" : "none");
  const pitch = mode === "3d" ? (!animate && map.getPitch() > 0 ? map.getPitch() : 55) : 0;
  map.easeTo({ pitch, duration: animate ? 650 : 0 });
}
