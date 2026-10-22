"use client";

import { useMemo, useRef } from "react";
import { useSavedScroll, useSavedState } from "@/hooks/use-saved-state";
import { isCount, isText } from "@/lib/preferences";
import { TRANSIT_MODES, routeGroupId, type TransitActive, type TransitCatalog,
  type TransitFilters, type TransitMode, type TransitRoute } from "@/lib/transit";
import type { TransitState } from "@/hooks/use-transit";
import { useI18n } from "./i18n-provider";
import { CloseIcon } from "./icons";

export function TransitControls({ open, onOpen, catalog, error, active, filters, focusedGroup,
  stopNames, onStopNames, estimated, onEstimated, onFilter, onFocus, onExitFocus, state }: {
  open: boolean; onOpen: (open: boolean) => void; catalog: TransitCatalog | null; error: boolean;
  active: TransitActive; filters: TransitFilters; focusedGroup: string | null;
  stopNames: boolean; onStopNames: (show: boolean) => void;
  estimated: boolean; onEstimated: (enabled: boolean) => void;
  onFilter: (mode: TransitMode, value: string[] | null) => void;
  onFocus: (route: TransitRoute) => void; onExitFocus: () => void; state: TransitState;
}) {
  const { t } = useI18n();
  const [mode, setMode] = useSavedState<TransitMode>("routes.mode", "bus", (value): value is TransitMode => TRANSIT_MODES.includes(value as TransitMode));
  const [search, setSearch] = useSavedState("routes.search", "", isText);
  const [limit, setLimit] = useSavedState("routes.limit", 60, (value): value is number => isCount(value) && value >= 60);
  const resultsRef = useRef<HTMLDivElement>(null);
  useSavedScroll(resultsRef, `routes.scroll.${mode}`, open && Boolean(catalog));
  const groups = useMemo(() => {
    const result = new Map<string, TransitRoute[]>();
    for (const route of catalog?.routes ?? []) {
      if (route.mode !== mode) continue;
      const key = routeGroupId(route);
      result.set(key, [...(result.get(key) ?? []), route]);
    }
    return [...result].sort((a, b) => a[1][0].service.localeCompare(b[1][0].service, "en", { numeric: true }));
  }, [catalog, mode]);
  const matches = groups.filter(([, routes]) => routes.some((route) =>
    `${route.service} ${route.name} ${route.destination}`.toLowerCase().includes(search.trim().toLowerCase())));
  const selected = filters[mode];
  const count = active[mode] ? selected === null ? groups.length : selected.length : 0;
  const focused = catalog?.routes.find((route) => routeGroupId(route) === focusedGroup);
  const toggle = (id: string) => {
    const current = active[mode] ? selected ?? groups.map(([key]) => key) : [];
    onFilter(mode, current.includes(id) ? current.filter((key) => key !== id) : [...current, id]);
  };
  return <aside className="atlas-route-controls" aria-label={t("routes.title")}>
    {!open ? <button type="button" className="panel atlas-route-trigger" aria-expanded={false} aria-controls="transit-route-controls" onClick={() => onOpen(true)}>
      <svg viewBox="0 0 24 24" aria-hidden="true"><path d="M6 5h12M6 12h12M6 19h12" /><circle cx="8" cy="5" r="2" /><circle cx="16" cy="12" r="2" /><circle cx="10" cy="19" r="2" /></svg>
      {focused ? `${t("routes.route")} ${focused.mode === "bus" ? focused.service : focused.name}` : t("routes.title")}
    </button> : <section id="transit-route-controls" className="panel atlas-route-panel" onKeyDown={(event) => {
      if (event.key === "Escape") { event.stopPropagation(); onOpen(false); }
    }}>
      <header><h2>{t("routes.title")}</h2><button type="button" className="atlas-icon-button" aria-label={t("common.close")} onClick={() => onOpen(false)}><CloseIcon /></button></header>
      {focused && <div className="atlas-route-focus"><div><strong>{focused.mode === "bus" ? `${t("transit.bus.label")} ${focused.service}` : focused.name}</strong>
        <span>{t("routes.focused")}</span></div><button type="button" onClick={onExitFocus} aria-label={t("routes.exitFocus")} title={t("routes.exitFocus")}>
          <svg viewBox="0 0 24 24" aria-hidden="true"><path d="m10 6-6 6 6 6M4 12h16" /></svg>
        </button></div>}
      <div className="atlas-route-settings">
        <label className="atlas-stop-names"><input type="checkbox" checked={stopNames} onChange={(event) => onStopNames(event.target.checked)} />{t("routes.stopNames")}</label>
        <label className="atlas-stop-names"><input type="checkbox" checked={estimated} aria-describedby="transit-estimate-description" onChange={(event) => onEstimated(event.target.checked)} />{t("transit.estimatedPositions")}</label>
      </div>
      <p id="transit-estimate-description" className="sr-only">{t("transit.estimatedDescription")}</p>
      <label className="atlas-route-mode" htmlFor="route-mode"><span>{t("routes.transport")}</span>
        <span className="atlas-route-select-value" aria-hidden="true">{t(`transit.${mode}.name`)}</span>
        <svg viewBox="0 0 16 16" aria-hidden="true"><path d="m4 6 4 4 4-4" /></svg>
        <select id="route-mode" aria-label={t("routes.transport")} value={mode} onChange={(event) => { setMode(event.target.value as TransitMode); setSearch(""); setLimit(60); }}>
          {TRANSIT_MODES.map((item) => <option key={item} value={item}>{t(`transit.${item}.name`)}</option>)}
        </select>
      </label>
      <div className="atlas-route-actions"><button type="button" aria-pressed={active[mode] && selected === null} onClick={() => onFilter(mode, null)}>{t("routes.allOn")}</button>
        <button type="button" aria-pressed={!active[mode] || selected?.length === 0} onClick={() => onFilter(mode, [])}>{t("routes.allOff")}</button>
        <span role="status">{t("routes.selected", { count })}</span></div>
      <label className="sr-only" htmlFor="route-search">{t("routes.search")}</label>
      <input id="route-search" type="search" placeholder={t("routes.search")} value={search} onChange={(event) => { setSearch(event.target.value); setLimit(60); }} />
      <div ref={resultsRef} className="atlas-route-results" role="region" aria-label={t("routes.results")} tabIndex={0}>
        {error ? <p role="alert">{t("transit.catalogError")}</p> : !catalog ? <p role="status">{t("status.loading")}</p> : !matches.length ? <p>{t("routes.noMatches")}</p> : matches.slice(0, limit).map(([id, routes]) => {
          const route = routes[0];
          const checked = active[mode] && (selected === null || selected.includes(id));
          return <div className="atlas-route-row" key={id} data-selected={checked}>
            <label><input type="checkbox" checked={checked} onChange={() => toggle(id)} /><span>
              <strong style={{ textDecorationColor: route.colour }}>{mode === "bus" ? route.service : route.name}</strong>
              <small>{mode === "bus" ? [...new Set(routes.map((item) => item.destination))].join(" ↔ ") : route.access ? t(`routes.access.${route.access}`) : route.destination}</small>
            </span></label><button type="button" className="atlas-route-fit" aria-label={t("routes.showNamed", { name: mode === "bus" ? route.service : route.name })} onClick={() => onFocus(route)}>
              <svg viewBox="0 0 24 24" aria-hidden="true"><path d="M8 3H3v5m13-5h5v5M3 16v5h5m13-5v5h-5M8 12h8m-4-4v8" /></svg></button>
          </div>;
        })}
        {matches.length > limit && <button type="button" className="atlas-route-primary" onClick={() => setLimit(limit + 60)}>{t("routes.more", { count: matches.length - limit })}</button>}
      </div>
      <p className="atlas-route-note">{focused?.mode === "bus" ? state.feedStatus === "loading" ? t("status.loading")
        : state.feedStatus === "unconfigured" ? t("transit.unconfigured") : state.feedStatus === "error" ? t("transit.feedError")
          : state.coverage ? t("routes.coverage", state.coverage) : t("routes.estimateLimit")
        : estimated ? t("transit.scheduleNotice") : t("routes.selectionHint")}</p>
      {mode === "skytrain" && <p className="atlas-route-note">{t("routes.airportAccess")}</p>}
    </section>}
    {focused && !open && <button type="button" className="panel atlas-route-exit" onClick={onExitFocus}>{t("routes.exitFocus")}</button>}
  </aside>;
}
