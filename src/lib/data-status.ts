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

/** Keep the compact status control and its expanded explanation in sync. */
export function roadFeedStatus(
  data: RoadConditionsResponse | null,
  active: RoadLayerId[],
  loading: boolean,
  error: string | null | undefined,
  staticMode: boolean,
) {
  const unavailable =
    data?.status === "error" ||
    (!data && Boolean(error)) ||
    Boolean(
      data &&
      active.length > 0 &&
      active.every((id) => {
        const layer = data.layers.find((item) => item.id === id);
        return layer?.status === "error" && layer.count === 0;
      }),
    );
  const cached = Boolean(data && (staticMode || data.status === "stale"));
  const state = unavailable
    ? "error"
    : cached
      ? "stale"
      : (data?.status ?? "loading");
  const label = unavailable
    ? ("status.error" as const)
    : cached
      ? ("status.stale" as const)
      : data?.status === "partial"
        ? ("status.partial" as const)
        : loading && !data
          ? ("status.loading" as const)
          : ("status.liveRoads" as const);
  return {
    state,
    label,
    partial:
      cached &&
      Boolean(
        data?.layers.some(
          (layer) => layer.status === "error" || layer.status === "partial",
        ),
      ),
    time: data && !unavailable ? roadDataTime(data, active, staticMode) : null,
  };
}
