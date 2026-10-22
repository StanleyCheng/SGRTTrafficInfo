import type { TransitRoute } from "./transit.ts";

/** Representative vehicle artwork for the map.
 *
 * The map draws the same 3D fleet illustrations as the menus and detail views
 * (`public/transit/*.png`). A fixed-view isometric render has no geographic heading,
 * so the body never rotates; the marker's arrow carries the travel direction.
 *
 * Provenance, references and exact generation prompts live in `assets.json`
 * beside the PNGs.
 */
export const FLEET_SPRITES = {
  "bus-single-deck": "bus-single-deck",
  "bus-double-deck": "bus-double-deck",
  "bus-articulated": "bus-articulated",
  "train-nsew": "train-nsew",
  "train-north-east": "train-north-east",
  "train-circle": "train-circle",
  "train-downtown": "train-downtown",
  "train-thomson-east-coast": "train-thomson-east-coast",
  "train-lrt": "train-lrt",
  "train-lrt-sengkang-punggol": "train-lrt-sengkang-punggol",
  "ferry-island-cruise": "ferry-island-cruise",
  "ferry-ubin-bumboat": "ferry-ubin-bumboat",
  "train-sentosa": "train-sentosa",
  "train-skytrain": "train-skytrain",
  "car-cable": "car-cable",
} as const;

/** Public path of the fleet illustration, or null for an unknown vehicle type. */
export function fleetSprite(icon: string): string | null {
  return Object.hasOwn(FLEET_SPRITES, icon) ? `/transit/${icon}.png` : null;
}

/** The representative vehicle image for a catalogue route. */
export function routeIcon(route: TransitRoute): string {
  if (route.mode === "ferry") return /Ubin/i.test(route.name) ? "ferry-ubin-bumboat" : "ferry-island-cruise";
  if (route.mode !== "train") return route.mode === "cablecar" ? "car-cable" : route.mode === "sentosa" ? "train-sentosa" : route.mode === "skytrain" ? "train-skytrain" : "bus-single-deck";
  if (["NS", "EW"].includes(route.service)) return "train-nsew";
  if (["SE", "SW", "PE", "PW"].includes(route.service)) return "train-lrt-sengkang-punggol";
  return ({ NE: "train-north-east", CC: "train-circle", DT: "train-downtown", TE: "train-thomson-east-coast" })[route.service] ?? "train-lrt";
}
