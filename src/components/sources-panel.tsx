"use client";

import { useEffect, useRef } from "react";
import { useI18n } from "@/components/i18n-provider";
import type { BasemapId } from "@/components/MapView";
import { STATIC_MODE } from "@/lib/client-data";
import { formatDate } from "@/lib/format";
import { DOC_LINKS, LAYERS, ROAD_LAYER_ORDER } from "@/lib/layers";
import type {
  CameraKind,
  LayerInfo,
  RoadConditionsResponse,
} from "@/lib/types";

export interface SourcesPanelProps {
  basemap?: BasemapId;
  layers: LayerInfo[] | null;
  roadConditions: RoadConditionsResponse | null;
  open: boolean;
  onClose: () => void;
}

function CloseIcon() {
  return (
    <svg viewBox="0 0 20 20" className="size-[18px]" aria-hidden="true">
      <path
        d="M5.5 5.5l9 9M14.5 5.5l-9 9"
        stroke="currentColor"
        strokeWidth="1.7"
        strokeLinecap="round"
        fill="none"
      />
    </svg>
  );
}

function ExternalIcon() {
  return (
    <svg viewBox="0 0 20 20" className="size-3.5 shrink-0" aria-hidden="true">
      <path
        d="M8 5.5H5.6a1 1 0 0 0-1 1v7.9a1 1 0 0 0 1 1h7.9a1 1 0 0 0 1-1V12"
        stroke="currentColor"
        strokeWidth="1.5"
        strokeLinecap="round"
        fill="none"
      />
      <path
        d="M11.6 4.4h4v4M15.2 4.8 9.6 10.4"
        stroke="currentColor"
        strokeWidth="1.5"
        strokeLinecap="round"
        fill="none"
      />
    </svg>
  );
}

function ClusterGlyph() {
  return (
    <svg viewBox="0 0 20 20" className="size-4 shrink-0" aria-hidden="true">
      <circle
        cx="10"
        cy="10"
        r="6.6"
        stroke="currentColor"
        strokeWidth="2"
        fill="none"
      />
      <circle
        cx="10"
        cy="10"
        r="5.4"
        stroke="#fff"
        strokeWidth="1.6"
        fill="none"
      />
    </svg>
  );
}

export function SourcesPanel({
  basemap = "osm",
  layers,
  roadConditions,
  open,
  onClose,
}: SourcesPanelProps) {
  const { t, lang } = useI18n();
  const dialogRef = useRef<HTMLDialogElement>(null);

  useEffect(() => {
    const dialog = dialogRef.current;
    if (!dialog) return;
    if (open && !dialog.open) dialog.showModal();
    if (!open && dialog.open) dialog.close();
    return () => {
      if (dialog.open) dialog.close();
    };
  }, [open]);

  const dot = (color: string) => (
    <span
      className="size-2.5 shrink-0 rounded-full"
      style={{ background: color }}
    />
  );

  return (
    <dialog
      ref={dialogRef}
      aria-labelledby="sources-title"
      className="panel atlas-modal rise scroll-thin p-5 sm:p-6"
      onCancel={(event) => {
        event.preventDefault();
        onClose();
      }}
      onClick={(event) => {
        if (event.target !== event.currentTarget) return;
        const bounds = event.currentTarget.getBoundingClientRect();
        if (
          event.clientX < bounds.left ||
          event.clientX > bounds.right ||
          event.clientY < bounds.top ||
          event.clientY > bounds.bottom
        )
          onClose();
      }}
    >
      <div className="flex items-start justify-between gap-4">
        <div>
          <h2
            id="sources-title"
            className="font-display text-[28px] leading-tight text-ink"
          >
            {t("src.title")}
          </h2>
          <p className="mt-0.5 text-[12px] text-muted">
            {t("src.attribution")}
          </p>
        </div>
        <button
          type="button"
          onClick={onClose}
          aria-label={t("common.close")}
          className="tip tip-right atlas-icon-button"
          data-tip={t("common.close")}
        >
          <CloseIcon />
        </button>
      </div>

      <p className="atlas-popup-note mt-4">{t("panel.guide")}</p>
      {STATIC_MODE && (
        <p className="atlas-layer-notice mt-3">{t("status.staticRoads")}</p>
      )}
      <div className="mt-5 space-y-4">
        {ROAD_LAYER_ORDER.map((id) => {
          const info = roadConditions?.layers.find((layer) => layer.id === id);
          return (
            <section
              className="border-b border-line pb-3"
              data-source-layer={id}
              key={id}
            >
              <h3 className="text-[14px] font-semibold">
                {t(`road.layer.${id}.name`)}
              </h3>
              <p className="mt-1 text-[12px] text-muted">
                {t(`road.layer.${id}.note`)}
              </p>
              <ul className="mt-2 space-y-2">
                {(info?.sources.length
                  ? info.sources
                  : [
                      {
                        id,
                        name: "LTA DataMall",
                        url: DOC_LINKS.datamallGuide,
                        fetchedAt: undefined,
                      },
                    ]
                ).map((source) => (
                  <li key={source.id}>
                    <a
                      className="inline-flex min-h-11 items-center gap-2 text-[13px] text-ink-2 underline underline-offset-4"
                      href={
                        source.url.includes("datamall2.mytransport.sg")
                          ? DOC_LINKS.datamallGuide
                          : source.url
                      }
                      target="_blank"
                      rel="noreferrer noopener"
                    >
                      {source.name}
                      <ExternalIcon />
                    </a>
                    {"fetchedAt" in source && source.fetchedAt && (
                      <p className="atlas-source-time">
                        {t("status.updated")}{" "}
                        {formatDate(source.fetchedAt, lang)}
                      </p>
                    )}
                  </li>
                ))}
              </ul>
              {id === "erp" && (
                <a
                  href={DOC_LINKS.erpRates}
                  target="_blank"
                  rel="noreferrer noopener"
                  className="atlas-text-action"
                >
                  {t("road.erp.ratesDoc")}
                  <ExternalIcon />
                </a>
              )}
            </section>
          );
        })}
      </div>

      <div className="mt-5 space-y-3">
        {LAYERS.map((def) => {
          const info = layers?.find((l) => l.id === def.id);
          const kindEntries = Object.entries(info?.kinds ?? {}) as [
            CameraKind,
            number,
          ][];
          return (
            <section key={def.id} className="atlas-source">
              <div className="flex items-center gap-2">
                {dot(def.color)}
                <h3 className="text-[13px] font-semibold text-ink">
                  {t(`layer.${def.id}.name`)}
                </h3>
                <span className="num ml-auto text-[13px] text-ink-2">
                  {info ? (
                    <>
                      {info.count} {t("common.locations")}
                    </>
                  ) : (
                    <span className="skeleton block h-3 w-24 rounded" />
                  )}
                </span>
              </div>

              {kindEntries.length > 1 && (
                <ul className="mt-1.5 flex flex-wrap gap-x-3 gap-y-1">
                  {kindEntries.map(([kind, count]) => (
                    <li
                      key={kind}
                      className="num flex items-center gap-1.5 text-[13px] text-muted"
                    >
                      <span
                        className="size-1.5 rounded-full"
                        style={{ background: def.color }}
                      />
                      {t(`kind.${kind}`)} {count}
                    </li>
                  ))}
                </ul>
              )}

              <ul className="mt-2 space-y-1">
                {def.source.map((s) => (
                  <li key={s.url}>
                    <a
                      href={s.url}
                      target="_blank"
                      rel="noreferrer noopener"
                      className="flex items-start gap-2 rounded-lg px-2 py-1.5 transition-colors hover:bg-surface-2"
                    >
                      <span className="min-w-0 flex-1">
                        <span className="block truncate text-[12px] font-medium text-ink-2">
                          {lang === "zh" ? s.datasetZh : s.dataset}
                        </span>
                        <span className="mt-0.5 block truncate text-[12px] text-muted">
                          {lang === "zh" ? s.agencyZh : s.agency} ·{" "}
                          {new URL(s.url).host}
                          {revision(t("status.sourceRev"), info, s.url, lang)}
                        </span>
                      </span>
                      <span className="mt-1 text-muted">
                        <ExternalIcon />
                      </span>
                    </a>
                  </li>
                ))}
              </ul>
            </section>
          );
        })}
      </div>

      <div className="mt-6 border-t border-line pt-4">
        <p className="label text-muted">{t("legend.title")}</p>
        <ul className="mt-2 space-y-1.5">
          {LAYERS.map((def) => (
            <li
              key={def.id}
              className="flex items-center gap-2 text-[12px] text-ink-2"
            >
              {dot(def.color)}
              {t(`layer.${def.id}.name`)}
            </li>
          ))}
          <li className="flex items-center gap-2 text-[12px] text-ink-2">
            <span className="text-ink">
              <ClusterGlyph />
            </span>
            {t("legend.cluster")}
          </li>
        </ul>
      </div>

      <div className="mt-5 border-t border-line pt-3">
        <p className="text-[13px] leading-relaxed text-ink-2">
          {t("src.gapNote")}{" "}
          <a
            href="https://www.police.gov.sg/Knowledge-Hub/Traffic/Traffic-Matters/Speed-Enforcement-Camera-Locations"
            target="_blank"
            rel="noreferrer noopener"
            className="underline decoration-dotted underline-offset-2 hover:text-ink"
          >
            police.gov.sg
          </a>
        </p>
        <p className="mt-2 text-[13px] leading-relaxed text-ink-2">
          {t("src.disclaimer")}
        </p>
        {STATIC_MODE && (
          <p className="mt-2 text-[13px] leading-relaxed text-warn">
            {t("src.staticNote")}
          </p>
        )}
        <p className="mt-2 text-[12px] text-muted">
          {t("src.basemap")} ·{" "}
          {t(basemap === "positron" ? "src.basemapPositron" : "src.basemapOsm")}
        </p>
      </div>
    </dialog>
  );
}

function revision(
  label: string,
  info: LayerInfo | undefined,
  url: string,
  lang: "en" | "zh",
) {
  const source = info?.sources.find((s) => s.url === url);
  if (!source?.updatedAt) return "";
  return ` · ${label} ${formatDate(source.updatedAt, lang)}`;
}
