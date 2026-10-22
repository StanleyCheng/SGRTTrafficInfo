import { isPosition, isRecord, isTransitMode, routeGroupId, TRANSIT_MODES, type TransitCatalog, type TransitFilters, type TransitStop, type TransitVehicle } from "./transit.ts";
import type { LayerFilters } from "./types.ts";

export const PREFERENCE_PREFIX = "sgdi.state.v1.";
export type ValueGuard<T> = (value: unknown) => value is T;
type Store = Pick<Storage, "getItem" | "setItem">;
export function readPreference<T>(store: Store, key: string, fallback: T, valid: ValueGuard<T>): T {
  try { const raw = store.getItem(PREFERENCE_PREFIX + key); if (raw !== null) { const value: unknown = JSON.parse(raw); if (valid(value)) return value; } } catch { /* unavailable or corrupt browser storage */ }
  return fallback;
}
export function writePreference(store: Store, key: string, value: unknown) {
  try { store.setItem(PREFERENCE_PREFIX + key, JSON.stringify(value)); } catch { /* private mode / full storage */ }
}
export const isBoolean = (value: unknown): value is boolean => typeof value === "boolean";
export const isText = (value: unknown): value is string => typeof value === "string" && value.length <= 500;
export const isOptionalText = (value: unknown): value is string | null => value === null || isText(value);
export const isCount = (value: unknown): value is number => typeof value === "number" && Number.isInteger(value) && value >= 0 && value <= 100000;
export function isChoice<T extends string>(...choices: T[]): ValueGuard<T> { return (value: unknown): value is T => choices.includes(value as T); }
export function isBooleanRecord<K extends string>(keys: readonly K[]): ValueGuard<Record<K, boolean>> {
  return (value: unknown): value is Record<K, boolean> => isRecord(value) && Object.keys(value).length === keys.length && keys.every((key) => typeof value[key] === "boolean");
}
export const isTransitFilters = (value: unknown): value is Record<"bus" | "train" | "ferry" | "sentosa" | "cablecar" | "skytrain", string[] | null> =>
  isRecord(value) && ["bus", "train", "ferry", "sentosa", "cablecar", "skytrain"].every((key) => value[key] === null || (Array.isArray(value[key]) && value[key].length <= 2000 && value[key].every(isText)));
export const isLayerFilters = (value: unknown): value is LayerFilters => isRecord(value) && isOptionalText(value.lotType)
  && isOptionalText(value.plugType) && isBoolean(value.availableOnly)
  && (value.minPowerKw === null || typeof value.minPowerKw === "number" && Number.isFinite(value.minPowerKw) && value.minPowerKw >= 0 && value.minPowerKw <= 2000);
export const isOptionalPosition = (value: unknown): value is [number, number] | null => value === null || isPosition(value);
export const isSavedStop = (value: unknown): value is TransitStop | null => value === null || isRecord(value)
  && isText(value.id) && isText(value.name) && isTransitMode(value.mode) && isPosition(value.position);
export const isSavedVehicle = (value: unknown): value is TransitVehicle | null => {
  if (value === null) return true;
  if (!isRecord(value) || !["id", "routeId", "service", "destination", "lineKey", "icon"].every((key) => isText(value[key]))
    || !isTransitMode(value.mode) || !["eta", "gps", "schedule"].includes(String(value.evidence)) || (value.direction !== 1 && value.direction !== -1)) return false;
  if (!["fromDistance", "toDistance", "observedAt", "arrivalAt", "staleAt", "expiresAt", "serviceStartedAt", "serviceEndsAt"].every((key) => typeof value[key] === "number" && Number.isFinite(value[key]) && value[key] >= 0)) return false;
  const expires = Number(value.expiresAt), observed = Number(value.observedAt);
  return expires > Date.now() && observed <= Date.now() + 5000 && Number(value.staleAt) <= expires
    && (value.arrivalStopId === undefined || isText(value.arrivalStopId)) && (Number(value.toDistance) - Number(value.fromDistance)) * value.direction >= 0
    && (value.evidence === "schedule" || expires <= observed + 90000);
};
export interface SavedMapView { center: [number, number]; zoom: number; bearing: number; pitch: number }
export const isMapView = (value: unknown): value is SavedMapView => isRecord(value) && Array.isArray(value.center) && value.center.length === 2
  && value.center.every((n) => typeof n === "number" && Number.isFinite(n)) && Math.abs(value.center[0]) <= 180 && Math.abs(value.center[1]) <= 85.051129
  && typeof value.zoom === "number" && value.zoom >= 9 && value.zoom <= 18
  && typeof value.bearing === "number" && Number.isFinite(value.bearing) && Math.abs(value.bearing) <= 360
  && typeof value.pitch === "number" && value.pitch >= 0 && value.pitch <= 85;
export const isScroll = (value: unknown): value is { left: number; top: number } => isRecord(value)
  && [value.left, value.top].every((value) => typeof value === "number" && Number.isFinite(value) && value >= 0 && value <= 1000000);

/** Keep explicit all/all-off choices while dropping removed or duplicated saved services. */
export function pruneTransitFilters(catalog: TransitCatalog, filters: TransitFilters): TransitFilters {
  let changed = false;
  const result = { ...filters };
  for (const mode of TRANSIT_MODES) {
    const selected = filters[mode];
    if (selected === null) continue;
    const allowed = new Set(catalog.routes.filter((route) => route.mode === mode).map(routeGroupId));
    const current = [...new Set(selected.filter((id) => allowed.has(id)))];
    if (current.length !== selected.length) { result[mode] = current; changed = true; }
  }
  return changed ? result : filters;
}
