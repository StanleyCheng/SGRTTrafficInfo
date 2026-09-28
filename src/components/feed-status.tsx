"use client";

import { STATIC_MODE } from "@/lib/client-data";
import {
  isConfigurationError,
  isPublishedERPGap,
  roadDataTime,
} from "@/lib/data-status";
import { formatDateTime } from "@/lib/format";
import { DOC_LINKS } from "@/lib/layers";
import type { RoadConditionsResponse, RoadLayerId } from "@/lib/types";
import { useI18n } from "./i18n-provider";

export function FeedStatus({
  data,
  active,
  loading,
  error,
}: {
  data: RoadConditionsResponse | null;
  active: RoadLayerId[];
  loading: boolean;
  error?: string | null;
}) {
  const { t, lang } = useI18n();
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
  const cached = Boolean(data && (STATIC_MODE || data.status === "stale"));
  const key = unavailable
    ? "status.error"
    : cached
      ? "status.stale"
      : data?.status === "partial"
        ? "status.partial"
        : loading && !data
          ? "status.loading"
          : "status.liveRoads";
  return (
    <p
      className="atlas-feed-status"
      data-state={
        unavailable ? "error" : cached ? "stale" : (data?.status ?? "loading")
      }
      role="status"
    >
      <span className="atlas-status-dot" aria-hidden="true" />
      <strong>{t(key)}</strong>
      {cached &&
        data?.layers.some(
          (layer) => layer.status === "error" || layer.status === "partial",
        ) && <span>· {t("status.partial")}</span>}
      {data && !unavailable && (
        <time dateTime={roadDataTime(data, active, STATIC_MODE)}>
          {formatDateTime(roadDataTime(data, active, STATIC_MODE), lang)}
        </time>
      )}
    </p>
  );
}

export function FeedIssue({
  error,
  onRetry,
  onUseCameras,
}: {
  error?: string | null;
  onRetry: () => void;
  onUseCameras?: () => void;
}) {
  const { t } = useI18n();
  if (!error) return null;
  const configuration = isConfigurationError(error);
  const publishedGap = isPublishedERPGap(error);
  return (
    <div
      className="atlas-feed-issue"
      data-state={publishedGap ? "gap" : "error"}
    >
      <p>
        {t(
          configuration
            ? "status.notConfigured"
            : publishedGap
              ? "status.erpGap"
              : "status.feedFailed",
        )}
      </p>
      {publishedGap ? (
        <a
          className="atlas-text-action"
          href={DOC_LINKS.erpRates}
          target="_blank"
          rel="noreferrer"
        >
          {t("road.erp.ratesDoc")}
        </a>
      ) : configuration ? (
        onUseCameras && (
          <button
            type="button"
            className="atlas-text-action"
            onClick={onUseCameras}
          >
            {t("status.useCameras")}
          </button>
        )
      ) : (
        <button type="button" className="atlas-text-action" onClick={onRetry}>
          {t("status.retry")}
        </button>
      )}
      <details>
        <summary>{t("status.diagnostics")}</summary>
        <p className="font-mono break-words">{error}</p>
      </details>
    </div>
  );
}
