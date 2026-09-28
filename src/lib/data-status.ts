import type { RoadConditionsResponse, RoadLayerId } from "./types";

/** Configuration failures cannot be repaired by retrying a public request. */
export function isConfigurationError(error?: string | null) {
  return Boolean(
    error && /DATAMALL_ACCOUNT_KEY|account key.*not configured/i.test(error),
  );
}

/** The retired ERP endpoint cannot be restored by retrying it. */
export function isPublishedERPGap(error?: string | null) {
  return Boolean(
    error && !error.includes(";") && /ERP Rates.*HTTP 404/i.test(error),
  );
}

/** A response's creation time is not necessarily the observation time. */
export function roadDataTime(
  data: RoadConditionsResponse,
  active: RoadLayerId[],
  staticMode: boolean,
) {
  if (staticMode) return data.generatedAt;
  const times = data.layers
    .filter((layer) => active.includes(layer.id))
    .flatMap((layer) => layer.sources.map((source) => source.fetchedAt))
    .filter((time): time is string =>
      Boolean(time && Number.isFinite(Date.parse(time))),
    );
  return (
    times.sort((a, b) => Date.parse(a) - Date.parse(b))[0] ?? data.generatedAt
  );
}
