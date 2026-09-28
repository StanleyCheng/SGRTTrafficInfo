"use client";

import {
  useEffect,
  useRef,
  useState,
  type CSSProperties,
  type FocusEvent,
  type PointerEvent,
} from "react";
import { STATIC_MODE } from "@/lib/client-data";
import { roadFeedStatus } from "@/lib/data-status";
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
import { CloseIcon, InfoIcon, ListIcon, OptionsIcon, ResetIcon } from "./icons";
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
const HINT_ID = "atlas-layer-hint";
const POPUP_ID = "atlas-layer-details";
const GUIDE_ID = "atlas-layer-guide";

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
  const [open, setOpen] = useState<EntryId | "browse" | "status" | null>(null);
  const [selectedEntry, setSelectedEntry] = useState<EntryId>("incidents");
  const [hint, setHint] = useState<{
    text: string;
    owner: string;
    x: number;
  } | null>(null);
  const [more, setMore] = useState(false);
  const panelRef = useRef<HTMLElement>(null);
  const railRef = useRef<HTMLDivElement>(null);
  const headingRef = useRef<HTMLHeadingElement>(null);
  const returnFocus = useRef<HTMLElement | null>(null);
  const hintTimer = useRef<ReturnType<typeof setTimeout> | null>(null);
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
  const selected = entries.find((entry) => entry.id === selectedEntry)!;
  const status = roadFeedStatus(
    roadConditions,
    activeRoad,
    roadLoading,
    roadError,
    STATIC_MODE,
  );
  const statusDescription = [
    t("panel.dataStatus"),
    t(status.label),
    status.partial ? t("status.partial") : "",
    status.time ? formatDateTime(status.time, lang) : "",
    error ? t("err.loadFailed") : "",
  ]
    .filter(Boolean)
    .join(" · ");
  const optionsLabel = t("panel.options", { name: selected.name });

  useEffect(() => {
    if (open) headingRef.current?.focus({ preventScroll: true });
  }, [open]);
  useEffect(
    () => () => {
      if (hintTimer.current) clearTimeout(hintTimer.current);
    },
    [],
  );
  useEffect(() => {
    const rail = railRef.current;
    if (!rail) return;
    const observer = new ResizeObserver(() =>
      setMore(rail.scrollLeft + rail.clientWidth < rail.scrollWidth - 4),
    );
    observer.observe(rail);
    if (rail.firstElementChild) observer.observe(rail.firstElementChild);
    return () => observer.disconnect();
  }, [collapsed]);
  const clearHint = () => {
    if (hintTimer.current) clearTimeout(hintTimer.current);
    hintTimer.current = null;
    setHint(null);
  };
  const showHint = (
    owner: string,
    text: string,
    target: HTMLElement,
    transient = false,
  ) => {
    clearHint();
    const panel = panelRef.current?.getBoundingClientRect();
    const tile = target.getBoundingClientRect();
    if (!panel) return;
    setHint({ owner, text, x: tile.left - panel.left + tile.width / 2 });
    if (transient)
      hintTimer.current = setTimeout(() => {
        hintTimer.current = null;
        setHint(null);
      }, 2600);
  };
  const tooltipProps = (owner: string, text: string) => ({
    "data-tip": text,
    "data-tooltip-owner": owner,
    "aria-describedby": hint?.owner === owner && !open ? HINT_ID : GUIDE_ID,
  });
  const hintForTarget = (target: HTMLButtonElement) =>
    showHint(
      target.dataset.tooltipOwner ?? "",
      target.dataset.tip ?? "",
      target,
    );
  const handlePointerEnter = (event: PointerEvent<HTMLButtonElement>) => {
    if (event.pointerType !== "touch") hintForTarget(event.currentTarget);
  };
  const handlePointerLeave = () => {
    if (!hintTimer.current) setHint(null);
  };
  const handleFocus = (event: FocusEvent<HTMLButtonElement>) => {
    const target = event.currentTarget;
    hintForTarget(target);
    // Native focus can scroll the rail after the focus event. Re-anchor once
    // layout settles, without extending the brief tooltip started by a tap.
    requestAnimationFrame(() => {
      if (!hintTimer.current && document.activeElement === target)
        hintForTarget(target);
    });
  };
  const close = () => {
    setOpen(null);
    returnFocus.current?.focus({ preventScroll: true });
  };
  const inspect = (id: EntryId | "browse" | "status", target: HTMLElement) => {
    returnFocus.current = target;
    clearHint();
    setOpen(id);
  };
  const showCameras = () => {
    if (!active.redlight) onToggle("redlight");
    setOpen(null);
  };
  const describe = (entry: Entry) =>
    [
      entry.name,
      entry.unavailable
        ? t("status.error")
        : t(entry.on ? "panel.visible" : "panel.hidden"),
      entry.count != null
        ? `${entry.count} ${t(entry.info ? "common.reports" : UNIT[entry.id as LayerId])}`
        : entry.unavailable
          ? ""
          : t("status.loading"),
      entry.note,
      entry.info?.sources.map((source) => source.name).join(" · "),
    ]
      .filter(Boolean)
      .join(" — ");

  return (
    <section
      ref={panelRef}
      className={[
        "panel",
        "atlas-layers",
        collapsed
          ? "atlas-layers-collapsed"
          : mobile
            ? "atlas-layers-phone"
            : "atlas-layers-bar",
        className,
      ].join(" ")}
      aria-label={t("panel.title")}
      onKeyDown={(event) => {
        if (event.key === "Escape" && (open || hint)) {
          event.stopPropagation();
          if (open) close();
          clearHint();
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
          {hint.text}
        </p>
      )}
      <p id={GUIDE_ID} className="sr-only">
        {t("panel.guide")}
      </p>
      <p className="sr-only" role="status">
        {statusDescription}
      </p>
      {!anyOn && (
        <p className="sr-only" role="status">
          {t("panel.allOff")}
        </p>
      )}
      {collapsed ? (
        <button
          type="button"
          className="atlas-icon-button"
          aria-expanded={false}
          aria-label={t("panel.expand")}
          {...tooltipProps("expand", t("panel.expand"))}
          onPointerEnter={handlePointerEnter}
          onPointerLeave={handlePointerLeave}
          onFocus={handleFocus}
          onBlur={clearHint}
          onClick={() => {
            clearHint();
            setOpen(null);
            onCollapsedChange(false);
          }}
        >
          <Mark />
        </button>
      ) : (
        <>
          <div className="atlas-rail-window" data-more={more}>
            <div
              ref={railRef}
              className="atlas-rail-scroll"
              onScroll={(event) => {
                const rail = event.currentTarget;
                setMore(
                  rail.scrollLeft + rail.clientWidth < rail.scrollWidth - 4,
                );
                clearHint();
              }}
            >
              <ul className="atlas-rail">
                {entries.map((entry) => (
                  <li
                    key={entry.id}
                    className={
                      entry.id === "parking" || entry.id === "redlight"
                        ? "atlas-rail-group-start"
                        : undefined
                    }
                  >
                    <button
                      type="button"
                      className="atlas-rail-icon"
                      style={layerStyle(entry.color)}
                      data-layer={entry.id}
                      data-active={entry.on && !entry.unavailable}
                      data-error={entry.unavailable}
                      data-selected={selectedEntry === entry.id}
                      aria-pressed={entry.on}
                      aria-label={`${entry.name} · ${entry.unavailable ? t("status.error") : entry.count != null ? `${entry.count} ${t(entry.info ? "common.reports" : UNIT[entry.id as LayerId])}` : t("status.loading")}`}
                      {...tooltipProps(entry.id, describe(entry))}
                      onPointerEnter={handlePointerEnter}
                      onPointerLeave={handlePointerLeave}
                      onFocus={handleFocus}
                      onBlur={clearHint}
                      onClick={(event) => {
                        setSelectedEntry(entry.id);
                        setOpen(null);
                        if (!entry.unavailable || entry.on) {
                          if (
                            ROAD_LAYER_ORDER.includes(entry.id as RoadLayerId)
                          )
                            onRoadToggle(entry.id as RoadLayerId);
                          else onToggle(entry.id as LayerId);
                        }
                        showHint(
                          entry.id,
                          describe({
                            ...entry,
                            on: entry.unavailable ? entry.on : !entry.on,
                          }),
                          event.currentTarget,
                          true,
                        );
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
                  </li>
                ))}
                <li className="atlas-rail-group-start">
                  <button
                    type="button"
                    className="atlas-icon-button"
                    data-testid="browse-features"
                    aria-label={t("browse.title")}
                    aria-expanded={open === "browse"}
                    aria-controls={POPUP_ID}
                    {...tooltipProps("browse", t("browse.title"))}
                    onPointerEnter={handlePointerEnter}
                    onPointerLeave={handlePointerLeave}
                    onFocus={handleFocus}
                    onBlur={clearHint}
                    onClick={(event) => inspect("browse", event.currentTarget)}
                  >
                    <ListIcon />
                  </button>
                </li>
                <li>
                  <button
                    type="button"
                    className="atlas-icon-button"
                    aria-label={t("panel.reset")}
                    data-testid="reset-layers"
                    {...tooltipProps("reset", t("panel.reset"))}
                    onPointerEnter={handlePointerEnter}
                    onPointerLeave={handlePointerLeave}
                    onFocus={handleFocus}
                    onBlur={clearHint}
                    onClick={(event) => {
                      onReset();
                      setSelectedEntry("incidents");
                      setOpen(null);
                      showHint(
                        "reset",
                        t("panel.reset"),
                        event.currentTarget,
                        true,
                      );
                    }}
                  >
                    <ResetIcon />
                  </button>
                </li>
                <li>
                  <button
                    type="button"
                    className="atlas-icon-button"
                    aria-label={t("panel.collapse")}
                    {...tooltipProps("collapse", t("panel.collapse"))}
                    onPointerEnter={handlePointerEnter}
                    onPointerLeave={handlePointerLeave}
                    onFocus={handleFocus}
                    onBlur={clearHint}
                    onClick={() => {
                      clearHint();
                      setOpen(null);
                      onCollapsedChange(true);
                    }}
                  >
                    <CloseIcon />
                  </button>
                </li>
              </ul>
            </div>
            {more && (
              <span className="atlas-rail-overflow" aria-hidden="true">
                <svg
                  width="12"
                  height="12"
                  viewBox="0 0 12 12"
                  fill="none"
                  stroke="currentColor"
                  strokeWidth="1.5"
                >
                  <path d="m4 2 4 4-4 4" />
                </svg>
              </span>
            )}
          </div>
          <button
            type="button"
            className="atlas-icon-button atlas-options-button"
            style={layerStyle(selected.color)}
            data-testid="layer-options"
            data-details={selectedEntry}
            aria-label={optionsLabel}
            aria-expanded={open === selectedEntry}
            aria-controls={POPUP_ID}
            {...tooltipProps("options", optionsLabel)}
            onPointerEnter={handlePointerEnter}
            onPointerLeave={handlePointerLeave}
            onFocus={handleFocus}
            onBlur={clearHint}
            onClick={(event) => inspect(selectedEntry, event.currentTarget)}
          >
            <OptionsIcon />
          </button>
        </>
      )}
      <button
        type="button"
        className="atlas-icon-button atlas-status-button"
        data-testid="data-status"
        data-state={status.state}
        aria-label={statusDescription}
        aria-expanded={open === "status"}
        aria-controls={POPUP_ID}
        {...tooltipProps("status", statusDescription)}
        onPointerEnter={handlePointerEnter}
        onPointerLeave={handlePointerLeave}
        onFocus={handleFocus}
        onBlur={clearHint}
        onClick={(event) => inspect("status", event.currentTarget)}
      >
        <InfoIcon />
        <span className="atlas-status-dot" aria-hidden="true" />
      </button>
      {open && (
        <section
          id={POPUP_ID}
          className="atlas-rail-popup"
          aria-labelledby="atlas-layer-heading"
        >
          <header className="atlas-popup-heading">
            <h3 id="atlas-layer-heading" ref={headingRef} tabIndex={-1}>
              {current?.name ??
                t(open === "browse" ? "browse.title" : "panel.dataStatus")}
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
          ) : open === "status" ? (
            <>
              <FeedStatus
                data={roadConditions}
                active={activeRoad}
                loading={roadLoading}
                error={roadError}
              />
              {cached && (
                <p className="atlas-popup-note">
                  {t(STATIC_MODE ? "status.staticRoads" : "status.cachedNote")}
                </p>
              )}
              <FeedIssue
                error={roadError ?? roadConditions?.error}
                onRetry={onRoadRetry}
                onUseCameras={showCameras}
              />
              {error && <FeedIssue error={error} onRetry={onRetry} />}
              {!anyOn && (
                <p className="atlas-popup-note">{t("panel.allOff")}</p>
              )}
              <p className="atlas-popup-note">
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
            </>
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
    </section>
  );
}
