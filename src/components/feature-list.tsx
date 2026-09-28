"use client";

import { useMemo, useState } from "react";
import { matchesRoadFilters } from "./map-art";
import type {
  CameraPoint,
  LayerFilters,
  LayerId,
  RoadConditionFeature,
  RoadLayerId,
} from "@/lib/types";
import { useI18n } from "./i18n-provider";

const PAGE_SIZE = 30;

export function FeatureList({
  points,
  features,
  active,
  roadActive,
  filters,
  incidentRoute,
  onSelect,
  onRoadSelect,
}: {
  points: CameraPoint[];
  features: RoadConditionFeature[];
  active: Record<LayerId, boolean>;
  roadActive: Record<RoadLayerId, boolean>;
  filters: LayerFilters;
  incidentRoute: string | null;
  onSelect: (point: CameraPoint) => void;
  onRoadSelect: (feature: RoadConditionFeature) => void;
}) {
  const { t } = useI18n();
  const [query, setQuery] = useState("");
  const [page, setPage] = useState(0);
  const rows = useMemo(() => {
    const needle = query.trim().toLocaleLowerCase();
    return [
      ...points
        .filter((point) => active[point.layer])
        .map((point) => ({
          id: point.id,
          title: point.road || point.ref,
          ref: point.ref,
          label: t(`kind.${point.kind}`),
          text: `${point.road} ${point.ref} ${point.direction ?? ""}`,
          select: () => onSelect(point),
        })),
      ...features
        .filter(
          (feature) =>
            roadActive[feature.properties.layer] &&
            matchesRoadFilters(feature, filters) &&
            (feature.properties.layer !== "incidents" ||
              !incidentRoute ||
              feature.properties.route === incidentRoute),
        )
        .map((feature) => ({
          id: feature.id,
          title: feature.properties.title,
          ref: feature.properties.sourceId,
          label: `${t(`road.kind.${feature.properties.kind}`)}${feature.geometry ? "" : ` · ${t("browse.unmapped")}`}`,
          text: `${feature.properties.title} ${feature.properties.sourceId} ${feature.properties.route ?? ""}`,
          select: () => onRoadSelect(feature),
        })),
    ].filter((row) => !needle || row.text.toLocaleLowerCase().includes(needle));
  }, [
    points,
    features,
    active,
    roadActive,
    filters,
    incidentRoute,
    query,
    t,
    onSelect,
    onRoadSelect,
  ]);
  const lastPage = Math.max(0, Math.ceil(rows.length / PAGE_SIZE) - 1);
  const current = Math.min(page, lastPage);
  const shown = rows.slice(current * PAGE_SIZE, (current + 1) * PAGE_SIZE);

  return (
    <div className="atlas-feature-list">
      <label htmlFor="feature-search">{t("browse.search")}</label>
      <input
        id="feature-search"
        type="search"
        value={query}
        placeholder={t("browse.placeholder")}
        onChange={(event) => {
          setQuery(event.target.value);
          setPage(0);
        }}
      />
      <p role="status">{t("browse.count", { n: rows.length })}</p>
      {shown.length ? (
        <ul>
          {shown.map((row) => (
            <li key={row.id}>
              <button type="button" onClick={row.select}>
                <strong>{row.title}</strong>
                <span>
                  {row.label} · {row.ref}
                </span>
              </button>
            </li>
          ))}
        </ul>
      ) : (
        <p>{t("browse.empty")}</p>
      )}
      {lastPage > 0 && (
        <nav aria-label={t("browse.pages")}>
          <button
            type="button"
            disabled={current === 0}
            onClick={() => setPage(current - 1)}
          >
            {t("browse.previous")}
          </button>
          <span>
            {t("browse.page", { n: current + 1, total: lastPage + 1 })}
          </span>
          <button
            type="button"
            disabled={current === lastPage}
            onClick={() => setPage(current + 1)}
          >
            {t("browse.next")}
          </button>
        </nav>
      )}
    </div>
  );
}
