"use client";

import { STATIC_MODE } from "@/lib/client-data";
import {
  isConfigurationError,
  isPublishedERPGap,
  roadFeedStatus,
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
  const status = roadFeedStatus(data, active, loading, error, STATIC_MODE);
  return (
    <p className="atlas-feed-status" data-state={status.state} role="status">
      <span className="atlas-status-dot" aria-hidden="true" />
      <strong>{t(status.label)}</strong>
      {status.partial && <span>· {t("status.partial")}</span>}
      {status.time && (
        <time dateTime={status.time}>{formatDateTime(status.time, lang)}</time>
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
