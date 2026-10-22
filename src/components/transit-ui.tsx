"use client";

import type { TransitState } from "@/hooks/use-transit";
import type { TransitCatalog, TransitMode, TransitRoute, TransitVehicle } from "@/lib/transit";
import { routeIcon } from "@/lib/transit-sprites";
import { useI18n } from "./i18n-provider";
import { CloseIcon } from "./icons";
export function VehicleArtwork({ name, className = "" }: { name: string; className?: string }) {
  // Generated sprites are deliberately plain images: their alpha must survive static export.
  // eslint-disable-next-line @next/next/no-img-element
  return <img src={`${process.env.NEXT_PUBLIC_BASE_PATH ?? ""}/transit/${name}.png`} alt="" className={className} draggable={false} />;
}

export function TransitOptions({ mode, state, selectedRouteId, onRoute, onFocus, onVehicle }: {
  mode: TransitMode; state: TransitState; selectedRouteId: string | null; onRoute: (id: string | null) => void;
  onFocus: (route: TransitRoute) => void;
  onVehicle: (vehicle: TransitVehicle) => void;
}) {
  const { t } = useI18n();
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
    {state.catalog && <details className="atlas-transit-sources"><summary>{t("transit.sources")}</summary>
      <p>{state.catalog.attribution}</p>
      <p>{t("transit.captured")} {new Date(state.catalog.generatedAt).toLocaleDateString()}</p>
      <a href={selected?.sourceUrl ?? (mode === "bus" ? "https://github.com/cheeaun/sgbusdata" : mode === "train" ? "https://github.com/cheeaun/sgraildata" : "https://www.openstreetmap.org/copyright")} target="_blank" rel="noreferrer">{t("transit.geometrySource")}</a>
      <a href="https://datamall.lta.gov.sg/content/datamall/en/dynamic-data.html" target="_blank" rel="noreferrer">{t("transit.positionSource")}</a>
    </details>}
  </div>;
}

export function TransitVehicleDetail({ vehicle, catalog, now, onClose }: {
  vehicle: TransitVehicle; catalog: TransitCatalog; now: number; onClose: () => void;
}) {
  const { t, lang } = useI18n();
  const route = catalog.routes.find((item) => item.id === vehicle.routeId);
  return <section className="panel atlas-transit-detail" aria-labelledby="transit-detail-title">
    <header><h2 id="transit-detail-title">{t("transit.vehicle")} {vehicle.service}</h2>
      <button type="button" className="atlas-icon-button" aria-label={t("common.close")} onClick={onClose}><CloseIcon /></button></header>
    <div className="atlas-transit-route-summary"><VehicleArtwork name={vehicle.icon} className="atlas-transit-artwork" />
      <strong style={{ color: route?.colour }}>{vehicle.destination}</strong></div>
    <dl><dt>{t("transit.positionSource")}</dt><dd>{t(vehicle.evidence === "schedule" ? "transit.evidenceSchedule"
      : vehicle.evidence === "gps" ? "transit.evidenceGps" : "transit.evidenceEta")}</dd>
      <dt>{t("transit.freshness")}</dt><dd>{t(now >= vehicle.staleAt ? "transit.stale"
        : vehicle.evidence === "schedule" ? "transit.timetableEstimate" : "transit.updating")}</dd>
      <dt>{t("status.updated")}</dt><dd>{new Date(vehicle.observedAt).toLocaleTimeString(lang === "zh" ? "zh-HK" : "en-SG")}</dd>
      {vehicle.evidence === "schedule" && <>
        <dt>{t("transit.scheduleWindow")}</dt>
        <dd>{new Date(vehicle.serviceStartedAt).toLocaleTimeString(lang === "zh" ? "zh-HK" : "en-SG")} – {new Date(vehicle.serviceEndsAt).toLocaleTimeString(lang === "zh" ? "zh-HK" : "en-SG")}</dd>
      </>}</dl>
    <p>{t("transit.representative")}</p>
    <p>{t(vehicle.evidence === "schedule" ? "transit.scheduleRule" : "transit.positionRule")}</p>
  </section>;
}
