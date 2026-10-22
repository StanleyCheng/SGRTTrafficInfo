/** Representative vehicle artwork for the map.
 *
 * The map draws the same 3D fleet illustrations as the menus and detail views
 * (`public/transit/*.png`). A fixed-view isometric render has no geographic heading,
 * so the body never rotates; the marker's arrow carries the travel direction.
 *
 * Provenance, references and exact generation prompts live in `assets.json` and
 * `extra-assets.json` beside the PNGs.
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
  "cable-car": "cable-car",
} as const;

/** Public path of the fleet illustration, or null for an unknown vehicle type. */
export function fleetSprite(icon: string): string | null {
  return Object.hasOwn(FLEET_SPRITES, icon) ? `/transit/${icon}.png` : null;
}
