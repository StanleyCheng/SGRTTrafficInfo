"use client";

import { useEffect, useRef, useState, type CSSProperties } from "react";
import { STATIC_MODE } from "@/lib/client-data";
import { formatDateTime } from "@/lib/format";
import { LAYERS, ROAD_LAYER_ORDER } from "@/lib/layers";
import {
  DEFAULT_LAYER_FILTERS,
  type CameraPoint,
  type LayerFilters,
  type LayerId,
  type LayerInfo,
  type RoadConditionFeature,
  type RoadConditionsResponse,
  type RoadLayerId,
} from "@/lib/types";
import { useI18n } from "./i18n-provider";
import { CloseIcon } from "./icons";
import { RoadLayerInfo } from "./layer-detail";
import {
  AnyLayerGlyph,
  LIVE_ROAD_LAYERS,
  ROUTE_ROAD_LAYERS,
  STATUS_STYLE,
  UNIT,
  Mark,
  layerStyle,
} from "./layer-ui";
import { FeedIssue, FeedStatus } from "./feed-status";
import { FeatureList } from "./feature-list";

export interface LayerPanelProps {
  layers: LayerInfo[] | null;
  points: CameraPoint[];
  active: Record<LayerId, boolean>;
  onToggle: (id: LayerId) => void;
  onSelect: (point: CameraPoint) => void;
  onRoadSelect: (feature: RoadConditionFeature) => void;
  onReset: () => void;
  loading: boolean;
  error: string | null;
  generatedAt: string | null;
  onRetry: () => void;
  onSnapshotRetry: () => void;
  roadConditions: RoadConditionsResponse | null;
  roadActive: Record<RoadLayerId, boolean>;
  onRoadToggle: (id: RoadLayerId) => void;
  incidentRoute: string | null;
  onIncidentRouteChange: (route: string | null) => void;
  roadLoading: boolean;
  roadError: string | null;
  onRoadRetry: () => void;
  collapsed: boolean;
  onCollapsedChange: (v: boolean) => void;
  mobile?: boolean;
  filters?: LayerFilters;
  onFilterChange?: (patch: Partial<LayerFilters>) => void;
  className?: string;
}

type EntryId = LayerId | RoadLayerId;
const SETTINGS = new Set<EntryId>(["incidents", "parking", "ev"]);
const SUMMARIES = new Set<EntryId>([
  "traffic-speed",
  "erp",
  "zones",
  "expressway",
]);
const HINT_ID = "atlas-layer-hint";
const POPUP_ID = "atlas-layer-details";

interface Entry {
  id: EntryId;
  name: string;
  note: string;
  color: string;
  on: boolean;
  count: number | null;
  unavailable: boolean;
  info?: RoadConditionsResponse["layers"][number];
  error?: string;
}

export function LayerPanel({
  layers,
  points,
  active,
  onToggle,
  onSelect,
  onRoadSelect,
  onReset,
  loading,
  error,
  generatedAt,
  onRetry,
  onSnapshotRetry,
  roadConditions,
  roadActive,
  onRoadToggle,
  incidentRoute,
  onIncidentRouteChange,
  roadLoading,
  roadError,
  onRoadRetry,
  collapsed,
  onCollapsedChange,
  mobile = false,
  filters = DEFAULT_LAYER_FILTERS,
  onFilterChange = () => {},
  className = "",
}: LayerPanelProps) {
  const { t, lang } = useI18n();
  const [open, setOpen] = useState<EntryId | "browse" | null>(null);
  const [hint, setHint] = useState<{ entry: Entry; x: number } | null>(null);
  const [more, setMore] = useState(true);
  const panelRef = useRef<HTMLElement>(null);
  const headingRef = useRef<HTMLHeadingElement>(null);
  const returnFocus = useRef<HTMLElement | null>(null);
  const activeRoad = ROAD_LAYER_ORDER.filter((id) => roadActive[id]);
  const cached = Boolean(
    roadConditions && (STATIC_MODE || roadConditions.status === "stale"),
  );
  const anyOn =
    Object.values(active).some(Boolean) ||
    Object.values(roadActive).some(Boolean);
  const groups = [
    { name: t("panel.liveGroup"), defs: LIVE_ROAD_LAYERS },
    { name: t("panel.tripGroup"), defs: ROUTE_ROAD_LAYERS },
    { name: t("panel.cameraGroup"), defs: LAYERS },
  ];
  const entries = groups.flatMap((group) =>
    group.defs.map((def): Entry => {
      const road = ROAD_LAYER_ORDER.includes(def.id as RoadLayerId);
      const info = roadConditions?.layers.find((layer) => layer.id === def.id);
      const camera = layers?.find((layer) => layer.id === def.id);
      const unavailable = road
        ? info?.status === "error" && info.count === 0
        : camera?.status === "error" && camera.count === 0;
      return {
        id: def.id,
        color: def.color,
        info: road ? info : undefined,
        error: road ? info?.error : camera?.error,
        name: t(
          road
            ? `road.layer.${def.id as RoadLayerId}.name`
            : `layer.${def.id as LayerId}.name`,
        ),
        note: t(
          road
            ? `road.layer.${def.id as RoadLayerId}.note`
            : `layer.${def.id as LayerId}.note`,
        ),
        on: road
          ? roadActive[def.id as RoadLayerId]
          : active[def.id as LayerId],
        count: unavailable
          ? null
          : road
            ? (info?.count ?? null)
            : (camera?.count ?? null),
        unavailable: Boolean(unavailable),
      };
    }),
  );
  const current = entries.find((entry) => entry.id === open);

  useEffect(() => {
    if (open) headingRef.current?.focus({ preventScroll: true });
  }, [open]);
  const close = () => {
    setOpen(null);
    returnFocus.current?.focus({ preventScroll: true });
  };
  const inspect = (id: EntryId | "browse", target: HTMLElement) => {
    returnFocus.current = target;
    setHint(null);
    setOpen(id);
  };
  const showCameras = () => {
    if (!active.redlight) onToggle("redlight");
    setOpen(null);
  };
  const describe = (entry: Entry) =>
    [
      entry.name,
      entry.note,
      entry.unavailable ? t("status.error") : "",
      entry.info?.sources.map((source) => source.name).join(" · "),
    ]
      .filter(Boolean)
      .join(" — ");

  if (collapsed)
    return (
      <div className={`panel atlas-header atlas-layers-collapsed ${className}`}>
        <button
          type="button"
          className="atlas-text-action"
          aria-expanded={false}
          onClick={() => onCollapsedChange(false)}
        >
          <Mark />
          {t("panel.expand")}
        </button>
        <FeedStatus
          data={roadConditions}
          active={activeRoad}
          loading={roadLoading}
          error={roadError}
        />
      </div>
    );

  return (
    <section
      ref={panelRef}
      className={`panel atlas-layers ${mobile ? "atlas-layers-phone" : "atlas-layers-bar"} ${className}`}
      aria-label={t("panel.title")}
      onKeyDown={(event) => {
        if (event.key === "Escape" && open) {
          event.stopPropagation();
          close();
        }
      }}
    >
      {hint && !open && (
        <p
          id={HINT_ID}
          className="atlas-rail-hint"
          role="tooltip"
          style={{ "--hint-x": `${hint.x}px` } as CSSProperties}
        >
          {describe(hint.entry)}
        </p>
      )}
      <header className="atlas-layer-toolbar">
        <h2>{t("panel.title")}</h2>
        <button
          type="button"
          className="atlas-text-action"
          data-testid="browse-features"
          aria-expanded={open === "browse"}
          aria-controls={POPUP_ID}
          onClick={(event) => inspect("browse", event.currentTarget)}
        >
          {t("browse.title")}
        </button>
        <button
          type="button"
          className="atlas-text-action"
          onClick={onReset}
          aria-label={t("panel.reset")}
        >
          {t("a11y.reset")}
        </button>
        <button
          type="button"
          className="atlas-icon-button tip tip-right"
          data-tip={t("panel.collapse")}
          aria-label={t("panel.collapse")}
          onClick={() => {
            setOpen(null);
            onCollapsedChange(true);
          }}
        >
          <CloseIcon size={16} />
        </button>
      </header>
      <FeedStatus
        data={roadConditions}
        active={activeRoad}
        loading={roadLoading}
        error={roadError}
      />
      <div
        className="atlas-rail-scroll"
        onScroll={(event) => {
          const rail = event.currentTarget;
          setMore(rail.scrollLeft + rail.clientWidth < rail.scrollWidth - 4);
        }}
      >
        {groups.map((group) => (
          <div
            className="atlas-rail-group"
            role="group"
            aria-label={group.name}
            key={group.name}
          >
            <p className="atlas-group-name">{group.name}</p>
            <ul className="atlas-rail">
              {group.defs.map((def) => {
                const entry = entries.find((item) => item.id === def.id)!;
                return (
                  <li key={entry.id}>
                    <button
                      type="button"
                      className="atlas-rail-icon"
                      style={layerStyle(entry.color)}
                      data-layer={entry.id}
                      data-active={entry.on && !entry.unavailable}
                      data-error={entry.unavailable}
                      aria-pressed={entry.on}
                      aria-label={`${entry.name} · ${entry.unavailable ? t("status.error") : entry.count != null ? `${entry.count} ${t(entry.info ? "common.reports" : UNIT[entry.id as LayerId])}` : t("status.loading")}`}
                      data-tip={describe(entry)}
                      aria-describedby={
                        hint?.entry.id === entry.id && !open
                          ? HINT_ID
                          : undefined
                      }
                      onMouseEnter={(event) => {
                        const panel = panelRef.current?.getBoundingClientRect();
                        const tile =
                          event.currentTarget.getBoundingClientRect();
                        if (panel)
                          setHint({
                            entry,
                            x: tile.left - panel.left + tile.width / 2,
                          });
                      }}
                      onMouseLeave={() => setHint(null)}
                      onFocus={(event) => {
                        const panel = panelRef.current?.getBoundingClientRect();
                        const tile =
                          event.currentTarget.getBoundingClientRect();
                        if (panel)
                          setHint({
                            entry,
                            x: tile.left - panel.left + tile.width / 2,
                          });
                      }}
                      onBlur={() => setHint(null)}
                      onClick={(event) => {
                        if (!entry.unavailable || entry.on) {
                          if (
                            ROAD_LAYER_ORDER.includes(entry.id as RoadLayerId)
                          )
                            onRoadToggle(entry.id as RoadLayerId);
                          else onToggle(entry.id as LayerId);
                        }
                        if (
                          entry.unavailable ||
                          (!entry.on &&
                            (SETTINGS.has(entry.id) || SUMMARIES.has(entry.id)))
                        )
                          inspect(entry.id, event.currentTarget);
                        setHint(null);
                      }}
                    >
                      <AnyLayerGlyph
                        id={entry.id}
                        color={entry.color}
                        size={22}
                      />
                      <span className="atlas-rail-count num">
                        {entry.count ?? "—"}
                      </span>
                      {entry.on && !entry.unavailable && (
                        <span className="atlas-rail-dot" aria-hidden="true" />
                      )}
                    </button>
                    <button
                      type="button"
                      className="atlas-rail-label"
                      data-details={entry.id}
                      aria-label={t("panel.details", { name: entry.name })}
                      aria-expanded={open === entry.id}
                      aria-controls={POPUP_ID}
                      onClick={(event) =>
                        inspect(entry.id, event.currentTarget)
                      }
                    >
                      {t(`panel.short.${entry.id}`)}
                    </button>
                  </li>
                );
              })}
            </ul>
          </div>
        ))}
      </div>
      <p className="atlas-layer-guide">
        {t("panel.guide")}
        {mobile && more && <span>{t("panel.more")} →</span>}
      </p>
      {!anyOn && <p className="atlas-layer-notice">{t("panel.allOff")}</p>}
      {open && (
        <section
          id={POPUP_ID}
          className="atlas-rail-popup"
          aria-labelledby="atlas-layer-heading"
        >
          <header className="atlas-popup-heading">
            <h3 id="atlas-layer-heading" ref={headingRef} tabIndex={-1}>
              {current?.name ?? t("browse.title")}
            </h3>
            <button
              type="button"
              className="atlas-icon-button"
              onClick={close}
              aria-label={t("common.close")}
            >
              <CloseIcon size={16} />
            </button>
          </header>
          {open === "browse" ? (
            <FeatureList
              points={points}
              features={roadConditions?.features ?? []}
              active={active}
              roadActive={roadActive}
              filters={filters}
              incidentRoute={incidentRoute}
              onSelect={onSelect}
              onRoadSelect={onRoadSelect}
            />
          ) : (
            current && (
              <>
                <p className="atlas-popup-note">{current.note}</p>
                {cached && current.info && (
                  <p className="atlas-layer-notice">
                    {t(
                      STATIC_MODE ? "status.staticRoads" : "status.cachedNote",
                    )}
                  </p>
                )}
                {!current.on && !current.unavailable && (
                  <p className="atlas-popup-note">{t("panel.enable")}</p>
                )}
                {current.info ? (
                  <RoadLayerInfo
                    id={current.id as RoadLayerId}
                    info={current.info}
                    features={roadConditions?.features ?? []}
                    active={current.on}
                    status={
                      cached
                        ? STATUS_STYLE.stale
                        : current.info.status === "ok"
                          ? null
                          : STATUS_STYLE[current.info.status]
                    }
                    incidentRoute={incidentRoute}
                    onIncidentRouteChange={onIncidentRouteChange}
                    filters={filters}
                    onFilterChange={onFilterChange}
                  />
                ) : (
                  <p className="atlas-popup-note">
                    {current.count ?? "—"}{" "}
                    {t(UNIT[current.id as LayerId] ?? "common.reports")}
                  </p>
                )}
                {current.info?.sources.map((source) => (
                  <p className="atlas-source-time" key={source.id}>
                    {source.name}
                    {source.fetchedAt && (
                      <>
                        {" "}
                        ·{" "}
                        <time dateTime={source.fetchedAt}>
                          {formatDateTime(source.fetchedAt, lang)}
                        </time>
                      </>
                    )}
                  </p>
                ))}
                {current.info?.count === 0 && current.info.status === "ok" && (
                  <p className="atlas-popup-note">{t("panel.noReports")}</p>
                )}
                <FeedIssue
                  error={current.error}
                  onRetry={
                    current.id === "snapshot"
                      ? onSnapshotRetry
                      : current.info
                        ? onRoadRetry
                        : onRetry
                  }
                  onUseCameras={showCameras}
                />
              </>
            )
          )}
        </section>
      )}
      <footer className="atlas-layer-footer">
        <FeedIssue
          error={roadError ?? roadConditions?.error}
          onRetry={onRoadRetry}
          onUseCameras={showCameras}
        />
        {error && (
          <p>
            {t("err.loadFailed")}{" "}
            <button
              type="button"
              className="atlas-text-action"
              onClick={onRetry}
            >
              {t("status.retry")}
            </button>
          </p>
        )}
        {!mobile && (
          <p>
            {t("panel.summary", {
              layers: entries.length,
              points:
                layers?.reduce((sum, layer) => sum + layer.count, 0) ?? "—",
            })}
            {loading
              ? ` · ${t("status.loading")}`
              : generatedAt
                ? ` · ${t("status.updated")} ${formatDateTime(generatedAt, lang)}`
                : ""}
          </p>
        )}
      </footer>
    </section>
  );
}
