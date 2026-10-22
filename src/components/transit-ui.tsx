"use client";

import type { TransitState } from "@/hooks/use-transit";
import type { TransitCatalog, TransitMode, TransitRoute, TransitStop, TransitVehicle } from "@/lib/transit";
import { vehicleJourney } from "@/lib/transit-arrivals";
import { SCHEDULE_CAPTURED_AT } from "@/lib/transit-schedule";
import { ArrivalTime, directionText, transitTime } from "./transit-arrival-ui";
export { TransitStopDetail } from "./transit-arrival-ui";
import { routeIcon } from "@/lib/transit-sprites";
import { useI18n } from "./i18n-provider";
import { CloseIcon } from "./icons";
import { useSavedState } from "@/hooks/use-saved-state";
import { isBoolean } from "@/lib/preferences";
export function VehicleArtwork({ name, className = "" }: { name: string; className?: string }) {
  // Generated sprites are deliberately plain images: their alpha must survive static export.
  // eslint-disable-next-line @next/next/no-img-element
  return <img src={`${process.env.NEXT_PUBLIC_BASE_PATH ?? ""}/transit/${name}.png`} alt="" className={className} draggable={false} />;
}

export function TransitOptions({ mode, state, selectedRouteId, onRoute, onFocus, onVehicle, onStop }: {
  mode: TransitMode; state: TransitState; selectedRouteId: string | null; onRoute: (id: string | null) => void;
  onFocus: (route: TransitRoute) => void;
  onVehicle: (vehicle: TransitVehicle) => void;
  onStop: (stop: TransitStop) => void;
}) {
  const { t } = useI18n();
  const [stationsOpen, setStationsOpen] = useSavedState("routes.stationsOpen", false, isBoolean);
  const [sourcesOpen, setSourcesOpen] = useSavedState("routes.sourcesOpen", false, isBoolean);
  const routes = state.catalog?.routes.filter((route) => route.mode === mode) ?? [];
  const selected = routes.find((route) => route.id === selectedRouteId);
  const message = state.catalogError ? "transit.catalogError" : !state.catalog ? "status.loading"
    : mode !== "bus" ? state.estimated ? "transit.scheduleNotice"
      : mode === "ferry" ? "transit.noFerryPosition" : mode === "train" ? "transit.noTrainPosition" : "transit.noPosition"
      : state.feedStatus === "unconfigured" ? "transit.unconfigured" : state.feedStatus === "error" ? "transit.feedError"
        : state.feedStatus === "loading" ? "status.loading" : "transit.sample";
  const vehicles = state.vehicles.filter((vehicle) => vehicle.mode === mode && (!selected || vehicle.routeId === selected.id)).slice(0, 12);
  return <div className="atlas-transit-options">
    <p className="atlas-layer-notice" role="status">{t(message)}</p>
    <label htmlFor={`transit-route-${mode}`}>{t("transit.selectRoute")}</label>
    <select id={`transit-route-${mode}`} value={selected?.id ?? ""} onChange={(event) => onRoute(event.target.value || null)}>
      <option value="">{t("transit.inView")}</option>
      {routes.map((route) => <option value={route.id} key={route.id}>{route.mode === "bus" ? `${route.service} · ` : ""}{route.name}{route.mode === "bus" ? ` → ${route.destination}` : ""}</option>)}
    </select>
    {selected && <div className="atlas-transit-route-summary">
      <VehicleArtwork name={routeIcon(selected)} className="atlas-transit-artwork" />
      <div><strong className="atlas-transit-route-code" style={{ borderColor: selected.colour }}>{selected.service}</strong><p>{selected.destination}</p>
        <p className="text-muted">{t(selected.colourSource === "official" ? "transit.officialColour" : "transit.displayColour")}</p></div>
    </div>}
    {selected && <button type="button" className="atlas-route-primary" onClick={() => onFocus(selected)}>{t("routes.showWhole")}</button>}
    {selected && state.catalog && <details className="atlas-stop-routes" open={stationsOpen} onToggle={(event) => setStationsOpen(event.currentTarget.open)}><summary>{t("transit.stations")}</summary>
      <ul>{[...new Set(selected.stopIds)].map((id) => state.catalog!.stops.find((stop) => stop.id === id)).filter((stop): stop is TransitStop => Boolean(stop))
        .map((stop) => <li key={stop.id}><button type="button" onClick={() => onStop(stop)}>{stop.name}</button></li>)}</ul>
    </details>}
    <p>{t("transit.routesCount", { count: routes.length })}</p>
    {vehicles.length > 0 && <ul className="atlas-transit-vehicle-list" aria-label={t("transit.estimates")}>
      {vehicles.map((vehicle) => <li key={vehicle.id}>
        <button type="button" onClick={() => onVehicle(vehicle)}>{vehicle.service} → {vehicle.destination}<span>{t(
          vehicle.evidence === "schedule" ? "transit.timetableEstimate" : vehicle.evidence === "gps" ? "transit.evidenceGps" : "transit.evidenceEta")}</span></button>
      </li>)}
    </ul>}
    <p className="atlas-popup-note">{t(state.estimated ? "transit.scheduleRule" : "transit.positionRule")}</p>
    {state.estimated && <p className="atlas-popup-note">{t("transit.schedulePartial")}</p>}
    <p className="atlas-popup-note">{t("transit.representative")}</p>
    {state.catalog && <details className="atlas-transit-sources" open={sourcesOpen} onToggle={(event) => setSourcesOpen(event.currentTarget.open)}><summary>{t("transit.sources")}</summary>
      <p>{state.catalog.attribution}</p>
      <p>{t("transit.captured")} {new Date(state.catalog.generatedAt).toLocaleDateString()}</p>
      <a href={selected?.sourceUrl ?? (mode === "bus" ? "https://github.com/cheeaun/sgbusdata" : mode === "train" ? "https://github.com/cheeaun/sgraildata" : "https://www.openstreetmap.org/copyright")} target="_blank" rel="noreferrer">{t("transit.geometrySource")}</a>
      <a href="https://datamall.lta.gov.sg/content/datamall/en/dynamic-data.html" target="_blank" rel="noreferrer">{t("transit.positionSource")}</a>
    </details>}
  </div>;
}

export function TransitVehicleDetail({ vehicle, catalog, now, onClose, onStop }: {
  vehicle: TransitVehicle; catalog: TransitCatalog; now: number; onClose: () => void; onStop: (stop: TransitStop) => void;
}) {
  const { t, lang } = useI18n();
  const route = catalog.routes.find((item) => item.id === vehicle.routeId);
  const journey = vehicleJourney(catalog, vehicle, now);
  const direction = journey ? directionText(t, { ...journey, via: journey.next?.name, destination: journey.terminal?.name ?? vehicle.destination }) : vehicle.destination;
  return <section className="panel atlas-transit-detail" aria-labelledby="transit-detail-title">
    <header><h2 id="transit-detail-title">{t("transit.vehicle")} {vehicle.service}</h2>
      <button type="button" className="atlas-icon-button" aria-label={t("common.close")} onClick={onClose}><CloseIcon /></button></header>
    <div className="atlas-transit-route-summary"><VehicleArtwork name={vehicle.icon} className="atlas-transit-artwork" />
      <strong>{route?.mode === "bus" ? route.service : route?.name ?? vehicle.service}</strong></div>
    <dl><dt>{t("transit.direction")}</dt><dd>{direction}</dd>
      <dt>{t("transit.nextStop")}</dt><dd>{journey?.next ? <button type="button" className="atlas-stop-link" onClick={() => onStop(journey.next!)}>{journey.next.name}</button> : t("transit.unknown")}</dd>
      <dt>{t("transit.finalStop")}</dt><dd>{journey?.loop ? t("transit.loopService", { name: journey.terminal?.name ?? vehicle.destination }) : journey?.terminal?.name ?? vehicle.destination}</dd>
      <dt>{t("transit.nextArrival")}</dt><dd>{journey?.nextArrivalAt ? <ArrivalTime arrivalAt={journey.nextArrivalAt} now={now} stale={now >= vehicle.staleAt} /> : t("transit.arrivalsUnavailable")}</dd>
      {journey?.arrivalStop && !journey.nextArrivalAt && <><dt>{t("transit.predictionAt")}</dt><dd>
        <button type="button" className="atlas-stop-link" onClick={() => onStop(journey.arrivalStop!)}>{journey.arrivalStop.name}</button>
        <ArrivalTime arrivalAt={vehicle.arrivalAt} now={now} stale={now >= vehicle.staleAt} /></dd></>}
      <dt>{t("transit.positionSource")}</dt><dd>{t(vehicle.evidence === "schedule" ? "transit.evidenceSchedule"
      : vehicle.evidence === "gps" ? "transit.evidenceGps" : "transit.evidenceEta")}</dd>
      <dt>{t("transit.freshness")}</dt><dd>{t(now >= vehicle.staleAt ? "transit.stale"
        : vehicle.evidence === "schedule" ? "transit.timetableEstimate" : "transit.updating")}</dd>
      <dt>{t(vehicle.evidence === "schedule" ? "transit.timetableCaptured" : "status.updated")}</dt><dd>{vehicle.evidence === "schedule" ? SCHEDULE_CAPTURED_AT : `${transitTime(vehicle.observedAt, lang, true)} SGT`}</dd>
      {vehicle.evidence === "schedule" && <>
        <dt>{t("transit.scheduleWindow")}</dt>
        <dd>{transitTime(vehicle.serviceStartedAt, lang)} – {transitTime(vehicle.serviceEndsAt, lang)} SGT</dd>
      </>}</dl>
    <p>{t("transit.representative")}</p>
    <p>{t(vehicle.evidence === "schedule" ? "transit.scheduleRule" : "transit.positionRule")}</p>
  </section>;
}
