"use client";

import { useMemo } from "react";
import { useStopArrivals } from "@/hooks/use-stop-arrivals";
import { groupStopArrivals, stopArrivals } from "@/lib/transit-arrivals";
import { SCHEDULE_CAPTURED_AT, SCHEDULE_LINES } from "@/lib/transit-schedule";
import type { TransitCatalog, TransitRoute, TransitStop } from "@/lib/transit";
import type { Lang } from "@/lib/types";
import { CloseIcon } from "./icons";
import { useI18n } from "./i18n-provider";
import { useSavedState } from "@/hooks/use-saved-state";
import { isBoolean } from "@/lib/preferences";

export function transitTime(value: number, lang: Lang, seconds = false) {
  return new Date(value).toLocaleTimeString(lang === "zh" ? "zh-HK" : "en-SG", {
    timeZone: "Asia/Singapore", hour: "2-digit", minute: "2-digit", ...(seconds ? { second: "2-digit" } : {}), hour12: false,
  });
}
export function directionText(t: ReturnType<typeof useI18n>["t"], journey: { loop: boolean; clockwise: boolean; via?: string; destination?: string }) {
  return journey.loop ? `${t(journey.clockwise ? "transit.clockwise" : "transit.anticlockwise")}${journey.via ? ` · ${t("transit.towards", { name: journey.via })}` : ""}`
    : t("transit.towards", { name: journey.destination || t("transit.unknown") });
}
export function ArrivalTime({ arrivalAt, now, stale = false }: { arrivalAt: number; now: number; stale?: boolean }) {
  const { t, lang } = useI18n();
  const minutes = Math.max(0, Math.floor((arrivalAt - now) / 60000));
  const countdown = stale ? t("transit.updateDelayed") : minutes === 0 ? t("transit.arriving")
    : minutes < 60 ? t("transit.inMinutes", { count: minutes })
      : t("transit.inHoursMinutes", { hours: Math.floor(minutes / 60), minutes: minutes % 60 });
  return <span className="atlas-arrival-time"><time dateTime={new Date(arrivalAt).toISOString()}>{transitTime(arrivalAt, lang)} <small>SGT</small></time><strong>{countdown}</strong></span>;
}

export function TransitStopDetail({ stop, catalog, now, estimated, onClose, onFocus }: {
  stop: TransitStop; catalog: TransitCatalog; now: number; estimated: boolean;
  onClose: () => void; onFocus: (route: TransitRoute) => void;
}) {
  const { t, lang } = useI18n();
  const feed = useStopArrivals(stop);
  const [routesOpen, setRoutesOpen] = useSavedState<boolean | null>("station.routesOpen", null,
    (value): value is boolean | null => value === null || isBoolean(value));
  const routes = useMemo(() => catalog.routes.filter((route) => route.mode === stop.mode && route.stopIds.includes(stop.id)), [catalog, stop]);
  const groups = groupStopArrivals(stopArrivals(catalog, stop, feed?.observations ?? [], now, estimated));
  const updated = Math.max(0, ...(feed?.observations ?? []).map((item) => item.observedAt));
  const modeled = stop.mode !== "bus" && groups.length > 0;
  const source = routes.map((route) => SCHEDULE_LINES.find((line) => line.routeId === route.id)).find(Boolean);
  const busNotice = !feed ? "status.loading" : feed.status === "unconfigured" ? "transit.arrivalsUnconfigured"
    : feed.status === "error" ? "transit.arrivalsError" : !groups.length ? "transit.noArrivals" : "transit.liveArrivalsNote";
  return <section className="panel atlas-transit-detail atlas-stop-detail" aria-labelledby="transit-stop-title">
    <header><h2 id="transit-stop-title">{stop.name}</h2><button type="button" className="atlas-icon-button" aria-label={t("common.close")} onClick={onClose}><CloseIcon /></button></header>
    <p>{t(`transit.${stop.mode}.name`)}{stop.mode === "bus" ? ` · ${stop.id}` : ""}</p>
    <dl><dt>{t("transit.arrivalSource")}</dt><dd>{t(stop.mode === "bus" ? "transit.busArrivalSource" : modeled ? "transit.timetableEstimate" : "transit.arrivalsUnavailable")}</dd>
      <dt>{t(stop.mode === "bus" ? "status.updated" : modeled ? "transit.timetableCaptured" : "transit.captured")}</dt>
      <dd>{stop.mode === "bus" ? updated ? `${transitTime(updated, lang, true)} SGT` : t("transit.unknown")
        : modeled ? SCHEDULE_CAPTURED_AT : new Date(catalog.generatedAt).toLocaleDateString(lang === "zh" ? "zh-HK" : "en-SG", { timeZone: "Asia/Singapore" })}</dd>
      {stop.mode === "bus" && Boolean(feed?.generatedAt) && <><dt>{t("transit.lastChecked")}</dt><dd>{transitTime(feed!.generatedAt, lang, true)} SGT</dd></>}
    </dl>
    <p role={feed?.status === "error" ? "alert" : "status"}>{t(stop.mode === "bus" ? busNotice : modeled ? "transit.modelArrivalNote" : "transit.arrivalsUnavailableNote")}</p>
    {groups.length > 0 && <div className="atlas-stop-arrivals" aria-label={t("transit.nextArrivals")}>
      {groups.map((arrivals) => {
        const first = arrivals[0];
        return <section className="atlas-arrival-service" key={`${first.route?.id ?? first.service}:${first.direction}:${first.destination}:${first.evidence}`}>
          <h3 style={{ textDecorationColor: first.route?.colour }}>{stop.mode === "bus" ? first.service : first.route?.name ?? first.service}</h3>
          <p>{directionText(t, first)}</p>
          <p className="atlas-arrival-evidence">{t(first.evidence === "operator" ? "transit.providerSchedule" : first.evidence === "eta" ? "transit.livePrediction" : "transit.timetableEstimate")}</p>
          {first.route?.access && <p>{t(`routes.access.${first.route.access}`)}</p>}
          <ol>{arrivals.map((arrival) => <li key={arrival.id}><ArrivalTime arrivalAt={arrival.arrivalAt} now={now}
            stale={arrival.evidence !== "schedule" && now >= arrival.observedAt + 45000} /></li>)}</ol>
        </section>;
      })}
    </div>}
    <details className="atlas-stop-routes" open={routesOpen ?? !groups.length}><summary onClick={(event) => {
      event.preventDefault(); setRoutesOpen(!(routesOpen ?? !groups.length));
    }}>{t("transit.servingRoutes", { count: routes.length })}</summary>
      <ul>{routes.map((route) => <li key={route.id}><button type="button" onClick={() => onFocus(route)}>
        <strong>{route.mode === "bus" ? route.service : route.name}</strong><span>{route.mode === "bus" ? t("transit.towards", { name: route.destination }) : t("routes.showWhole")}</span>
      </button></li>)}</ul>
    </details>
    {modeled && source && <a className="atlas-arrival-source" href={source.sources.service.url} target="_blank" rel="noreferrer">{t("transit.scheduleSource")}</a>}
  </section>;
}
