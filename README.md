# 新加坡實時交通資訊

A bilingual (English / 繁體中文) map of official Singapore red-light and speed-enforcement
cameras, every camera currently published by LTA's live Traffic Images feed, and nine
live driver overlays — congestion, incidents, hazards, roadworks, parking, ERP, EV charging,
safety zones and expressway advisories.

- **Live site (GitHub Pages):** https://stanleycheng.github.io/SGRTTrafficInfo/
- **Repository:** https://github.com/StanleyCheng/SGRTTrafficInfo
- **Build report & decisions:** [`doc/build-report.md`](doc/build-report.md)
- **Live layer feature notes:** [`doc/live-layers.md`](doc/live-layers.md)
- **UI design system:** [`DESIGN.md`](DESIGN.md)

## Two ways to run it

| Mode | Command | Data path |
|---|---|---|
| Self-hosted (Node server) | `npm run dev` / `npm run build && npm start` | own API routes; live images from LTA **DataMall** with the key held server-side |
| Static (GitHub Pages) | `npm run build:static` → `out/` | baked enforcement-camera snapshot + keyless **data.gov.sg** live-image feed |

The static export is what CI deploys; it needs no server, no API key and no database.

## Live driver overlays · 實時路況圖層

Nine driver-facing overlays sit above the camera inventory, in the agreed priority order. Layers 1
and 2 (live congestion and incident alerts) start **switched on**; the other seven start off. Every
number on screen comes from an official feed, and anything an official feed does not publish (a
location, a charge, a speed limit) is stated as unavailable rather than guessed.

| # | Map layer | Official feed(s) | Presentation | Default |
|---|---|---|---|---|
| 1 | Live congestion · 實時交通擠塞 | Traffic Speed Bands v4 | Road segments coloured green→red, drawn as schematic start/end lines (LTA publishes endpoints, not road geometry) | **on** |
| 2 | Accidents & breakdowns · 意外及車輛故障 | Traffic Incidents | Alert icons for accidents, breakdowns, blocks and diversions, filterable by the route LTA names in its own message wording | **on** |
| 3 | Flood alerts & signal faults · 水浸警報及交通燈故障 | PUB Flood Alerts; Faulty Traffic Lights | Alert icons; flood alerts map where a circle is published, faulty-light reports stay unmapped because LTA supplies no coordinates | off |
| 4 | Roadworks & planned closures · 道路工程及計劃封閉 | Approved Road Works; Planned Road Openings; live works in Traffic Incidents | Permit register is unmapped (no site geometry); live road works carry direction and lane | off |
| 5 | Parking availability · 停車場泊位 | Carpark Availability v2; HDB Carpark Information | P markers labelled with the live lot count, filterable by vehicle type (C/H/Y), with the published gantry height | off |
| 6 | ERP gantries & charges · ERP 閘門及收費 | LTA Gantry (data.gov.sg); ERP rate table | Route **cost summary** in the panel rather than many markers; gantry spans only from zoom 14 | off |
| 7 | EV charging · 電動車充電 | EV Charging Points Batch | Plug markers labelled free/total points, filterable by connector, minimum power and availability | off |
| 8 | School & silver zones · 學校及樂齡安全區 | School Zone; Silver Zone (data.gov.sg) | Zoom-gated boundary overlay (from zoom 14) with the statutory zone limit | off |
| 9 | Expressway times & EMAS · 快速公路行車時間及 EMAS | Estimated Travel Times; VMS / EMAS | Compact corridor cards and signboard messages in the panel — deliberately no map layer | off |

The first four layers are live operational reports. Layers 5–9 are the route-aware extras: what a
driver needs before and during a trip rather than another permanent marker set.

### Feeds, caches and honesty about gaps

All credentialed feeds require `DATAMALL_ACCOUNT_KEY` and are fetched only by the Node server:
Traffic Speed Bands v4 (5 min cache), Traffic Incidents (2 min), PUB Flood Alerts (3 min), Faulty
Traffic Lights (2 min), Approved Road Works (24 h), Planned Road Openings (24 h), Carpark
Availability v2 (1 h), ERP Rates (6 h), EV Charging Points Batch (5 min), Estimated Travel Times
(5 min) and VMS/EMAS (2 min). The keyless data.gov.sg layers use longer TTLs: LTA Gantry (24 h),
School Zone and Silver Zone (24 h), and the HDB carpark gantry-height table (24 h).

The API paginates DataMall results in 500-record pages, keeps an in-memory and disk cache, and
returns a recent last-successful payload as `stale` if a refresh fails. Refresh timing is enforced
server-side so public callers cannot bypass the upstream TTLs. The HTTP response permits a
60-second cache with up to five minutes of stale-while-revalidate.

`GET /api/road-conditions?layers=traffic-speed,incidents` narrows the feature list to the layers the
browser has switched on, so the default view stays light; layer counts and feed health always come
back complete.

Two official gaps are reported, never filled in:

- **ERP charges.** LTA removed the live `ERPRates` API on 30 Sep 2024 and now publishes the rate
table as a static file, so the layer reports the feed failure, links to the official table, and shows
no amount. Zone names still come from the published gantry/zone table (ANNEX D of the LTA DataMall
API guide, kept verbatim in `src/data/erp-zones.json`).
- **Speed limits.** No official per-road speed-limit dataset is published as open data. Only the
statutory zone limits are shown (school zone 40 km/h; a silver-zone sign may set 30 km/h on a
particular street), with the limitation stated in the panel.

### Static GitHub Pages behaviour

Static hosting has no server-side credential proxy and never ships the private DataMall key.
It loads a saved official road-condition snapshot, split into one file per layer. A persistent
data-status icon opens a **Cached copy** label and the original snapshot date on desktop and phone;
these road conditions must not be interpreted as current traffic. Layers 1–2 still start on and the
camera layers start off.
Traffic images use the keyless data.gov.sg feed and refresh while that layer is visible.

### Phone and desktop controls

- **Both layouts:** a single icon-only row toggles layer visibility. Hover/focus shows a tooltip;
  tapping briefly shows its name and new state without opening a popup. The pinned Options icon
  opens the last-tapped layer's details, legends and filters without changing visibility.
  The row scrolls horizontally, with a chevron indicating more controls. Browse, Reset and
  Collapse are icon controls in the same row; Options and data status stay reachable while scrolling.
  The collapsed dock retains the data-status icon, which explains feed health and capture dates.
- **Browse visible layers:** a searchable, paginated text list provides a keyboard-accessible way to
  select a camera or road record, including reports with no published coordinates. Map and list use
  the same property filters. Escape dismisses details and returns focus to the selecting control.
- **Feed failures:** an actionable summary appears first. Raw upstream diagnostics live in a
  disclosure; missing deployment credentials offer available cameras instead of an ineffective Retry.
- **Sources:** a native modal contains the nine road-layer sources and three camera-layer sources,
  with keyboard focus containment, Escape dismissal and focus return.
- **Default view:** driver layers 1 (live congestion) and 2 (accidents & breakdowns) are on; layers
  3–9 and all three camera layers are off, in every build.
- **Top bar:** the app-icon button retracts the header and restores it in the same position. The
  language, basemap and source buttons remain independent keyboard controls. On phones the header
  stays on one row: logo, short title, one EN/中 language toggle, and icon-only basemap/Sources buttons.

## Data sources (all official, no mock data)

| Layer | Source |
|---|---|
| Red-light cameras (240) | data.gov.sg — SPF Red Light Cameras `d_5f140c79…`, cross-checked with DTRLS `d_0b7ddc09…` |
| Speed enforcement cameras (93) | data.gov.sg — SPF Fixed Speed `d_5fdeb9dc…`, Police Speed Laser `d_763b6039…`, Mobile Speed `d_e411f01a…`, consolidated list `d_983804de…` |
| Traffic snapshot cameras (currently 8) | LTA DataMall `Traffic-Imagesv2`; keyless data.gov.sg mirror on GitHub Pages |
| Parking availability | LTA DataMall `CarParkAvailabilityv2`, joined by official carpark code to HDB Carpark Information `d_23f946fa…` for the published gantry height |
| ERP gantries | data.gov.sg — LTA Gantry `d_75309082…` (the 106 published ERP spans); zone names from ANNEX D of the LTA DataMall API guide |
| ERP charges | LTA DataMall `ERPRates` — removed upstream on 30 Sep 2024 (HTTP 404); the official rate table is linked instead |
| EV charging | LTA DataMall `EVCBatch` — live availability by connector and power rating |
| School & silver zones | data.gov.sg — LTA School Zone `d_abf023b3…` (211) and LTA Silver Zone `d_dc343c02…` (20) |
| Expressway times & EMAS | LTA DataMall `EstTravelTimes` and `VMS` |
| Basemaps | OpenStreetMap standard raster tiles (default) and OpenFreeMap Positron vector tiles, both keyless |

## Setup

```bash
npm install
cp .env.example .env.local     # then paste your LTA DataMall Account Key
npm run dev
```

`.env.local`

```
DATAMALL_ACCOUNT_KEY=your_datamall_account_key
```

The DataMall key is used **server-side only** — it is never sent to the browser. The map defaults
to OpenStreetMap and the header toggle switches to OpenFreeMap Positron. The last choice is stored
in the browser; neither basemap needs configuration or an API key.

## Scripts

| Command | Purpose |
|---|---|
| `npm run dev` | development server (http://localhost:3000) |
| `npm run build` / `npm start` | production build / serve (server mode) |
| `npm run build:static` | static export for GitHub Pages → `out/` |
| `npm run verify` | lint + type check (what CI runs before deploying) |
| `npm test` | regression tests for capture dates and actionable feed errors |
| `npm run lint` / `npm run typecheck` | individually |
| `node scripts/smoke.mjs [url]` | end-to-end browser checks via Chrome DevTools Protocol (screenshots → `.cache/screens/`) |

### Deployment

`.github/workflows/deploy.yml` runs `npm ci` → `npm run verify` → `npm test` → `npm run build:static` and
publishes `out/` to GitHub Pages on every push to `main`. The static build bakes the camera
datasets into `public/data/cameras.json` from `src/data/cameras-seed.json`, temporarily moves
`src/app/api` aside (route handlers are incompatible with `output: 'export'`) and sets the
`/SGRTTrafficInfo` base path — see `scripts/build-static.mjs` and `next.config.ts`.

To refresh the deployed camera data, re-run a real fetch and commit the new snapshot:

```bash
curl -s "http://localhost:3000/api/cameras?refresh=1" > /dev/null   # warm .cache
cp .cache/cameras.json src/data/cameras-seed.json
git commit -am "Refresh camera data snapshot" && git push
```

`scripts/smoke.mjs` drives a real Chrome/Edge (set `CHROME_PATH` if none is found). Run it
against `npm run dev` for the full suite, including marker clicks, record selection, keyboard
focus return, the phone layer rail and the default layer state. Against a production server
the marker checks are skipped because the
`window.__map` debug handle is dev-only.

## Data pipeline notes

- Static enforcement-camera layers are fetched from data.gov.sg on the server, cached for 6 hours
  (memory → `.cache/cameras.json` → bundled `src/data/cameras-seed.json`), and refreshed in
  the background. `GET /api/cameras?refresh=1` forces a re-download; a cold refresh takes
  ~60–70 s because data.gov.sg allows about one anonymous request every 10 s.
- Live traffic images come from LTA DataMall (`Traffic-Imagesv2`), cached 45 s and polled by
  the client every 60 s while the image layer and browser tab are visible. The feed itself drives snapshot marker IDs, locations and counts,
  so static deployments follow camera additions/removals without rebuilding. Cached signed
  image URLs are discarded before their documented 15-minute expiry.
- Live driver overlays use eleven credentialled LTA DataMall feeds plus four keyless data.gov.sg
datasets, each with its own TTL (2 min to 24 h). Coordinate-free official reports are retained as
unmapped records rather than guessed onto the map; speed-band lines are schematic start/end
endpoints.
- Only the features for switched-on layers are sent to the browser
  (`/api/road-conditions?layers=`), so the default view stays light while layer counts and feed
  health remain complete.
- Official gaps stay visible: the ERP rate feed was removed upstream on 30 Sep 2024, so the layer
  reports `partial`, links to the official table and shows no amount. No official per-road
  speed-limit dataset is published, so only the statutory zone limits are shown.
- The HDB carpark gantry-height table and the LTA gantry/zones GeoJSON are keyless data.gov.sg
datasets shared by both server and static builds. Static road overlays use a saved snapshot;
server-mode road polling pauses when the browser tab is hidden or all road layers are off.
- Reset the cache with `rm -rf .cache`; re-seed the bundled snapshot with
  `cp .cache/cameras.json src/data/cameras-seed.json`.
