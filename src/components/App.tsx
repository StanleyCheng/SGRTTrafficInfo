"use client";

import dynamic from "next/dynamic";
import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { AppHeader } from "@/components/app-header";
import { DetailPanel, type DetailImage } from "@/components/detail-panel";
import { LayerPanel } from "@/components/layer-panel";
import { RoadConditionDetail } from "@/components/road-condition-detail";
import { SourcesPanel } from "@/components/sources-panel";
import { useI18n } from "@/components/i18n-provider";
import type { BasemapId, MapFocus } from "@/components/MapView";
import {
  useCameras,
  useRoadConditions,
  useTrafficImages,
} from "@/hooks/use-live-data";
import { geometryFocus, geometryZoom } from "@/lib/geometry";
import { ROAD_LAYER_DEFAULTS, ROAD_LAYER_ORDER } from "@/lib/layers";
import { withCurrentTrafficCameras } from "@/lib/traffic-images";
import {
  DEFAULT_LAYER_FILTERS,
  type CameraPoint,
  type LayerFilters,
  type LayerId,
  type RoadConditionFeature,
  type RoadLayerId,
} from "@/lib/types";

const MapView = dynamic(() => import("@/components/MapView"), {
  ssr: false,
  loading: () => <div className="skeleton h-full w-full rounded-none" />,
});

// Layers 1 and 2 (live congestion, and accident/breakdown alerts) carry the
// default view per the agreed layer priority. Which two those are lives in the
// registry in @/lib/layers, so the panel, the map and this default cannot drift.
// Camera layers never carry the default view, in any build. The agreed default is
// driver layers 1 and 2 (live congestion, accidents & breakdowns) on and every
// other layer — including these three camera layers — off.
const CAMERA_DEFAULTS: Record<LayerId, boolean> = {
  redlight: false,
  speed: false,
  snapshot: false,
};
const BASEMAP_STORAGE_KEY = "sgdi.basemap";

export default function App() {
  const { t } = useI18n();
  const [basemap, setBasemap] = useState<BasemapId>("osm");
  const { cameras, error: cameraError, retry: retryCameras } = useCameras();
  const [active, setActive] =
    useState<Record<LayerId, boolean>>(CAMERA_DEFAULTS);
  const {
    traffic,
    loading: trafficLoading,
    reload: reloadTraffic,
  } = useTrafficImages(active.snapshot);
  const [roadActive, setRoadActive] =
    useState<Record<RoadLayerId, boolean>>(ROAD_LAYER_DEFAULTS);
  const [incidentRoute, setIncidentRoute] = useState<string | null>(null);
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [selectedRoadId, setSelectedRoadId] = useState<string | null>(null);
  const [focus, setFocus] = useState<MapFocus | null>(null);
  const [collapsed, setCollapsed] = useState(false);
  const [filters, setFilters] = useState<LayerFilters>(DEFAULT_LAYER_FILTERS);
  const [sourcesOpen, setSourcesOpen] = useState(false);
  const [mobile, setMobile] = useState(false);
  const detailRef = useRef<HTMLDivElement>(null);
  const detailReturnFocus = useRef<HTMLElement | null>(null);

  /* ---------------- basemap preference ---------------- */
  useEffect(() => {
    try {
      const stored = window.localStorage.getItem(BASEMAP_STORAGE_KEY);
      if (stored === "positron") {
        // eslint-disable-next-line react-hooks/set-state-in-effect -- one-time persisted preference after hydration
        setBasemap("positron");
      }
    } catch {
      /* private mode */
    }
  }, []);

  const toggleBasemap = useCallback(() => {
    setBasemap((current) => {
      const next: BasemapId = current === "osm" ? "positron" : "osm";
      try {
        window.localStorage.setItem(BASEMAP_STORAGE_KEY, next);
      } catch {
        /* private mode */
      }
      return next;
    });
  }, []);

  /* ---------------- live road conditions ---------------- */
  // Only the layers that are switched on are fetched, so the default view stays
  // small. Toggling a layer changes this identity and refetches once.
  const activeRoadLayers = useMemo(
    () => ROAD_LAYER_ORDER.filter((id) => roadActive[id]),
    [roadActive],
  );
  const {
    roadConditions,
    loading: roadLoading,
    error: roadError,
    retry: retryRoads,
  } = useRoadConditions(activeRoadLayers);

  /* ---------------- responsive defaults ---------------- */
  useEffect(() => {
    const mq = window.matchMedia("(max-width: 639px)");
    // eslint-disable-next-line react-hooks/set-state-in-effect -- synchronize a browser media query after hydration
    setMobile(mq.matches);
    const onChange = (e: MediaQueryListEvent) => setMobile(e.matches);
    mq.addEventListener("change", onChange);
    return () => mq.removeEventListener("change", onChange);
  }, []);

  const visibleCameras = useMemo(
    () => (cameras ? withCurrentTrafficCameras(cameras, traffic) : null),
    [cameras, traffic],
  );
  const pointMap = useMemo(
    () => new Map((visibleCameras?.points ?? []).map((p) => [p.id, p])),
    [visibleCameras],
  );
  const selected = selectedId ? (pointMap.get(selectedId) ?? null) : null;
  const selectedLayer = useMemo(
    () => visibleCameras?.layers.find((l) => l.id === selected?.layer) ?? null,
    [visibleCameras, selected],
  );
  const roadFeatureMap = useMemo(
    () =>
      new Map(
        (roadConditions?.features ?? []).map((feature) => [
          feature.id,
          feature,
        ]),
      ),
    [roadConditions],
  );
  const selectedRoad = selectedRoadId
    ? (roadFeatureMap.get(selectedRoadId) ?? null)
    : null;
  const selectedRoadLayer = useMemo(
    () =>
      roadConditions?.layers.find(
        (layer) => layer.id === selectedRoad?.properties.layer,
      ) ?? null,
    [roadConditions, selectedRoad],
  );

  /* ---------------- resolve the live image for the selection ---------------- */
  const image: DetailImage | null = useMemo(() => {
    if (!selected || selected.kind !== "snapshot" || !traffic) return null;
    const match =
      traffic.cameras.find((c) => c.cameraId === selected.ref) ??
      traffic.cameras.find(
        (c) =>
          Math.abs(c.lat - selected.lat) < 0.0015 &&
          Math.abs(c.lng - selected.lng) < 0.0015,
      );
    return match ? { url: match.imageUrl, capturedAt: match.imageTime } : null;
  }, [selected, traffic]);

  const imageStatus: "loading" | "ok" | "error" | "none" = useMemo(() => {
    if (!selected || selected.kind !== "snapshot") return "none";
    if (image) return "ok";
    if (trafficLoading) return "loading";
    if (traffic?.status === "error") return "error";
    return "none";
  }, [selected, image, trafficLoading, traffic]);

  const focusOn = useCallback(
    (point: CameraPoint, zoom?: number) => {
      setFocus({
        lat: point.lat,
        lng: point.lng,
        zoom,
        key: `${point.id}:${Date.now()}`,
        padding: mobile ? { bottom: 340 } : { right: 400 },
      });
    },
    [mobile],
  );

  const select = useCallback(
    (point: CameraPoint | null) => {
      if (point)
        detailReturnFocus.current = document.activeElement as HTMLElement;
      setSelectedId(point?.id ?? null);
      if (point) setSelectedRoadId(null);
      if (point) focusOn(point, mobile ? 16 : undefined);
    },
    [focusOn, mobile],
  );

  const focusOnRoad = useCallback(
    (feature: RoadConditionFeature, zoom?: number) => {
      const centre = geometryFocus(feature.geometry);
      if (!centre) return;
      setFocus({
        lat: centre.lat,
        lng: centre.lng,
        zoom: zoom ?? geometryZoom(feature.geometry),
        key: `${feature.id}:${Date.now()}`,
        padding: mobile ? { bottom: 320 } : { right: 400 },
      });
    },
    [mobile],
  );

  const updateFilters = useCallback((patch: Partial<LayerFilters>) => {
    setFilters((previous) => ({ ...previous, ...patch }));
  }, []);

  const selectRoad = useCallback(
    (feature: RoadConditionFeature | null) => {
      if (feature)
        detailReturnFocus.current = document.activeElement as HTMLElement;
      setSelectedRoadId(feature?.id ?? null);
      if (feature) {
        setSelectedId(null);
        focusOnRoad(feature);
      }
    },
    [focusOnRoad],
  );

  const toggleLayer = useCallback(
    (id: LayerId) => {
      setActive((prev) => ({ ...prev, [id]: !prev[id] }));
      setSelectedId((current) => {
        const selectedPoint = current ? pointMap.get(current) : null;
        return selectedPoint?.layer === id ? null : current;
      });
    },
    [pointMap],
  );

  const toggleRoadLayer = useCallback(
    (id: RoadLayerId) => {
      setRoadActive((previous) => ({ ...previous, [id]: !previous[id] }));
      setSelectedRoadId((current) => {
        const selectedFeature = current ? roadFeatureMap.get(current) : null;
        return selectedFeature?.properties.layer === id ? null : current;
      });
    },
    [roadFeatureMap],
  );

  const showDetail = Boolean(selected || selectedRoad);

  useEffect(() => {
    if (showDetail) detailRef.current?.focus({ preventScroll: true });
  }, [showDetail, selectedId, selectedRoadId]);

  const closeDetail = () => {
    setSelectedId(null);
    setSelectedRoadId(null);
    requestAnimationFrame(() =>
      detailReturnFocus.current?.focus({ preventScroll: true }),
    );
  };
  const reset = () => {
    setActive(CAMERA_DEFAULTS);
    setRoadActive(ROAD_LAYER_DEFAULTS);
    setIncidentRoute(null);
    setFilters(DEFAULT_LAYER_FILTERS);
    setSelectedId(null);
    setSelectedRoadId(null);
    setFocus({
      lat: 1.3521,
      lng: 103.8198,
      zoom: 11.4,
      key: `reset:${Date.now()}`,
    });
  };

  return (
    <main className="relative h-[100dvh] w-full overflow-hidden bg-paper">
      <MapView
        basemap={basemap}
        points={visibleCameras?.points ?? []}
        active={active}
        selectedId={selectedId}
        onSelect={select}
        roadFeatures={roadConditions?.features ?? []}
        roadActive={roadActive}
        layerFilters={filters}
        incidentRoute={incidentRoute}
        selectedRoadId={selectedRoadId}
        onRoadSelect={selectRoad}
        focus={focus}
        className="absolute inset-0 h-full w-full"
      />

      {/* header */}
      {/* Left-aligned so the retracted bar keeps the app icon exactly where it was. */}
      <div className="pointer-events-none absolute inset-x-0 top-0 z-30 flex justify-start p-2 sm:p-4">
        <AppHeader
          basemap={basemap}
          onToggleBasemap={toggleBasemap}
          onOpenSources={() => setSourcesOpen(true)}
          className="pointer-events-auto"
        />
      </div>

      {/* layer control — docked bottom-centre on both platforms; it retracts while a
          detail card is open, because the card can grow to the bottom of the window */}
      <div
        inert={showDetail}
        className={`absolute z-30 flex transition-transform duration-300 ease-out ${showDetail ? "translate-y-[110%]" : "translate-y-0"} inset-x-0 bottom-[2px] justify-start p-2 sm:justify-center sm:bottom-4 sm:p-0`}
      >
        <LayerPanel
          layers={visibleCameras?.layers ?? null}
          points={visibleCameras?.points ?? []}
          active={active}
          onToggle={toggleLayer}
          onSelect={select}
          onRoadSelect={selectRoad}
          onReset={reset}
          loading={!cameras && !cameraError}
          error={cameraError}
          generatedAt={cameras?.generatedAt ?? null}
          onRetry={retryCameras}
          onSnapshotRetry={() => void reloadTraffic()}
          roadConditions={roadConditions}
          roadActive={roadActive}
          onRoadToggle={toggleRoadLayer}
          incidentRoute={incidentRoute}
          onIncidentRouteChange={setIncidentRoute}
          roadLoading={roadLoading}
          roadError={roadError}
          onRoadRetry={retryRoads}
          collapsed={collapsed}
          onCollapsedChange={setCollapsed}
          mobile={mobile}
          filters={filters}
          onFilterChange={updateFilters}
          className="max-h-[68vh] sm:max-h-[calc(100dvh-160px)]"
        />
      </div>

      {/* detail — floating card on desktop, bottom sheet on mobile */}
      <div
        ref={detailRef}
        tabIndex={-1}
        role="region"
        aria-label={t("detail.title")}
        onKeyDown={(event) => {
          if (event.key === "Escape") {
            event.stopPropagation();
            closeDetail();
          }
        }}
        className={`absolute z-40 inset-x-0 bottom-0 flex justify-center p-2 sm:inset-x-auto sm:right-4 sm:top-4 sm:bottom-auto sm:justify-end sm:p-0 ${
          showDetail ? "rise" : "pointer-events-none hidden"
        }`}
      >
        {selectedRoad ? (
          <RoadConditionDetail
            feature={selectedRoad}
            layer={selectedRoadLayer}
            onClose={closeDetail}
            onZoom={(feature) => focusOnRoad(feature)}
            className="max-h-[70vh] sm:max-h-[calc(100dvh-32px)]"
          />
        ) : (
          <DetailPanel
            point={selected}
            layer={selectedLayer}
            image={image}
            imageStatus={imageStatus}
            imageError={traffic?.error ?? null}
            onClose={closeDetail}
            onZoom={(p) => focusOn(p, 17)}
            onRetryImage={() => void reloadTraffic()}
            className="max-h-[70vh] sm:max-h-[calc(100dvh-32px)]"
          />
        )}
      </div>

      {/* The live-image freshness chip that used to sit here was removed: it covered
          the map and repeated what the snapshot camera layer already shows. */}

      <SourcesPanel
        basemap={basemap}
        layers={visibleCameras?.layers ?? null}
        roadConditions={roadConditions}
        open={sourcesOpen}
        onClose={() => setSourcesOpen(false)}
      />
    </main>
  );
}
