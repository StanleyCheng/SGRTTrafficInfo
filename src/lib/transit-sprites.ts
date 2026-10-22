/** Map-only artwork: front-up (0°), or travel-axis-up for the symmetric cable car.
 * Menus/details deliberately continue using the original fleet illustrations.
 * Provenance and exact generation prompts live beside these assets.
 */
export const OVERHEAD_SPRITES = {
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
export function overheadSprite(icon: string) {
  if (!Object.hasOwn(OVERHEAD_SPRITES, icon)) return null;
  return { path: `/transit/overhead/${icon}.png`, axisBearingDegrees: 0 };
}
