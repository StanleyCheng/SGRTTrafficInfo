import type { TransitRoute } from "./transit.ts";

/** Representative fleet illustrations shared by menus/details.
 * Moving markers use a calibrated image-space front so the body itself turns.
 * These are projected 3D raster illustrations, not rotatable 3D meshes.
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

/** Calibrated projected longitudinal axes, clockwise from image-up.
 * Double-ended LRT cars designate the visible lower-left cab as the lead.
 * The symmetric cable car uses a travel axis rather than claiming a nose.
 */
export const MOVING_SPRITE_AXES = {
  "bus-single-deck": { rear: [50, 165], front: [218, 93] },
  "bus-double-deck": { rear: [48, 184], front: [219, 94] },
  "bus-articulated": { rear: [44, 176], front: [220, 79] },
  "train-nsew": { rear: [41, 172], front: [219, 106] },
  "train-north-east": { rear: [40, 172], front: [220, 104] },
  "train-circle": { rear: [43, 177], front: [216, 111] },
  "train-downtown": { rear: [43, 174], front: [220, 110] },
  "train-thomson-east-coast": { rear: [38, 168], front: [221, 100] },
  "train-lrt": { rear: [217, 108], front: [48, 178] },
  "train-lrt-sengkang-punggol": { rear: [216, 107], front: [51, 177] },
  "ferry-island-cruise": { rear: [48, 179], front: [229, 119] },
  "ferry-ubin-bumboat": { rear: [45, 177], front: [226, 137] },
  "train-sentosa": { rear: [45, 174], front: [218, 80] },
  "train-skytrain": { rear: [43, 176], front: [217, 80] },
  "car-cable": { rear: [128, 194], front: [128, 62] },
} satisfies Record<keyof typeof FLEET_SPRITES, { rear: [number, number]; front: [number, number] }>;
const movingFronts = new Map(Object.entries(MOVING_SPRITE_AXES).map(([icon, { rear, front }]) =>
  [icon, Math.atan2(front[0] - rear[0], rear[1] - front[1]) * 180 / Math.PI]));
export function movingSprite(icon: string) {
  const frontBearingDegrees = movingFronts.get(icon), original = fleetSprite(icon);
  if (frontBearingDegrees === undefined || !original) return null;
  return { path: icon === "train-circle" ? "/transit/moving/train-circle.png" : original, frontBearingDegrees };
}
