# 新加坡實時交通資訊

A bilingual (English / 繁體中文) map of official Singapore red-light and speed-enforcement
cameras, every camera currently published by LTA's live Traffic Images feed, and nine
live driver overlays — congestion, incidents, hazards, roadworks, parking, ERP, EV charging,
safety zones and expressway advisories.

- **Live site (Vercel):** https://sgrttrafficinfo-stanleychengs-projects.vercel.app/
- **Repository:** https://github.com/StanleyCheng/SGRTTrafficInfo
- **Build report & decisions:** [`doc/build-report.md`](doc/build-report.md)
- **Live layer feature notes:** [`doc/live-layers.md`](doc/live-layers.md)
- **UI design system:** [`DESIGN.md`](DESIGN.md)

## 3D map and public transport

The top-menu **3D** button adds free OpenFreeMap building extrusions with tilt and rotation.
Buildings appear from zoom 14, according to the available OSM height data. It preserves the
map centre, zoom and active layers; the last 2D/3D choice is remembered locally.

The scrolling layer rail includes **Buses**, **Trains**, **Ferries**, **Sentosa Express**,
**Cable Car** and **Skytrain**, initially off. Tiles use 0.63 of the 88 × 78 px baseline,
with fixed 12 px captions and 10 px count badges; utility controls retain 44 px touch targets.
Options opens route/direction details and source/coverage information. The shipped geometry contains
602 bus services / 798 directions, all nine operating MRT/LRT systems across eleven line/loop
entries, and three mapped domestic ferry connections. Bus and ferry route colours are app
display colours; rail lines use their line colours. The added mapped modes contain both Sentosa
Express directions, the Mount Faber and Sentosa cable car lines, and six Changi Skytrain
connection groups across ten relation/direction records. Skytrain public and transit areas are
listed separately, with airside access required for transit-area connections. The A/A-South
shuttle is omitted because its mapped access tags conflict. Coverage and geometry dates are disclosed.

Open **Transit routes** at the upper right to choose a mode and turn all services on, all off,
or choose individual services with checkboxes. Search matches service names and destinations;
the list starts with 60 results and loads 60 more at a time. Each row has a separate fit action.
Clicking a mapped route opens a popup with the same whole-service action. It fits all mapped
directions, including both bus directions and both Sentosa directions, and shows the available
bus estimates. Focus temporarily hides other transit, camera and road overlays; **Return to route
selection** restores their chosen settings. The selector's stop-name toggle applies to displayed
routes, with normal map collision placement. Compact settings and focus controls reserve more
space for the route list. Mobile Transport values wrap above the native select so each complete
mode name remains readable. The bounded panel scrolls on short phones.

Click a displayed station name or dot to open its arrivals, direction, source and update details.
Route Options also lists station buttons for keyboard access. Desktop uses a nonmodal card;
phones use a bounded bottom sheet. Clock times use Singapore time, with countdowns rounded
down to whole minutes. Vehicle details show direction, a linked next stop and the final station
or named loop return. A prediction for a later sampled stop names that stop separately.

The opened bus stop refreshes every 20 seconds while the tab is visible. Changing or closing
the stop cancels its request. Source update and last-check times are separate. Retained provider
rows show an update delay after 45 seconds and expire at 90 seconds. LTA `Monitored=1` rows are
labelled live predictions; `Monitored=0` rows are labelled operator schedules. Provider schedules
remain available with the local timetable opt-in off and never create moving bus positions.
This follows the [LTA DataMall API guide](https://datamall.lta.gov.sg/content/dam/datamall/datasets/LTA_DataMall_API_User_Guide.pdf),
version 6.10, Bus Arrival definitions on page 14 and countdown guidance on page 19.

For other modes, supported station arrivals use the saved timetable opt-in described below.
The card shows up to three future times per direction, the timetable capture date and source.
These use uniform headway and route-distance assumptions inside published service windows.
Unsupported stations and branches outside the primary model keep their serving-route list
without fabricated arrival times.

The fifteen transparent vehicle illustrations in `public/transit/` are researched representative
fleet/type icons. Their exact prompts or vector briefs, primary reference links, SHA-256 and alpha
checks are in `public/transit/assets.json`, including Sentosa Express, a conventional Singapore
Cable Car cabin and Changi Skytrain. They are fixed-view artwork rather than rotatable models.
Moving artwork is 33.6 × 33.6 px inside 56 × 72 px marker targets. Per-image front calibration
turns each body to its directed screen-projected travel, including reverse travel and pitched
maps; 12 px service badges remain upright. Circle Line has one additional map-only ImageGen
sprite with its exact prompt, sources, native alpha, calibration and hash recorded in
`public/transit/moving/circle-assets.json`. Original menu/detail illustrations remain unchanged.

Bus positions use LTA Bus Arrival v3's live ETA and estimated coordinate evidence, snapped to
the mapped route. They are labelled estimates, never raw GPS. The overview queries up to eight
sampled stops in view / on the selected route every 20 seconds. Whole-service focus instead scans
the unique stops across both bus directions, with a 45-second polling interval and per-stop cache.
The panel reports checked/total stops when coverage is partial; deferred stops take priority on
the next scan. Neither path claims to show the full fleet. Missing coordinates
need compatible predictions at two stops to infer progress. Schedule-only arrivals do not animate.
Positions stop after 45 seconds without fresh evidence and disappear after 90 seconds.

Routine live train positioning and domestic ferry feed coverage remain unverified. Sentosa
Express, Cable Car and Skytrain also have no verified live positions. Their movement is an
explicit opt-in timetable estimate, marked `data-state="scheduled"` with a dashed ring, reduced
opacity and the wording "Estimated from published timetable — NOT a live position". The same
toggle is off by default and is saved locally.

The scheduler records a source URL and capture date for every figure in
`src/lib/transit-schedule.ts`. It uses operator/LTA publications, plus the MHI technical paper
for the Skytrain's 5-minute interim headway because CAG publishes only "every few minutes". It
covers the North East, Downtown and Circle lines, the four Sengkang–Punggol LRT loops, two
Southern Islands ferry connections, both Sentosa directions, both cable car lines and the mapped
Skytrain connections. SMRT's North-South, East-West, Thomson–East Coast and Bukit Panjang LRT
lines stay static because no operator-published end-to-end run time was found; the Pulau Ubin
bumboat stays static because NParks describes an on-demand service with no fixed headway. These
gaps are listed in `SCHEDULE_UNAVAILABLE` and are not filled with guessed figures. The Sentosa
run time is the published 7-minute upper bound of its 4–7 minute frequency; the cable car uses a
single-cabin round-trip model based on the operator's 13-minute one-way and 26–30 minute
round-trip figures. The Circle Line uses SMRT's published full-loop first/last times and an
82-minute run derived from the last-train sequence over the 39 km loop. The uniform-headway
model uses the existing 5-minute headway in both directions on the primary mapped loop.
Every active configured departure is represented, replacing the previous newest-six cap;
there is no branch schedule. During steady service this produces 32 or 34 active Circle
estimates depending on phase, not a count of physical trains. Reduced motion uses distributed
15-second timetable snapshots; ETA/GPS positions retain the latest source-observed position.

### Run the transit backend

Local development uses `GET /api/transit?stops=01012,01019` for sampled stops and
`GET /api/transit?service=2` for a whole service. Set `DATAMALL_ACCOUNT_KEY` privately in
`.env.local`; the same server-side credential supports the existing DataMall feeds. A response
reports feed status and checked/total stop coverage without exposing upstream credentials.

Vercel hosts the Next.js frontend and API handlers together. Set the private key in the Vercel
project environment; leave `NEXT_PUBLIC_TRANSIT_API_BASE` unset for same-origin requests.

For an optional GitHub Pages build, run this Next.js app separately as the backend,
with the private key in that host's environment. Set `NEXT_PUBLIC_TRANSIT_API_BASE` to its HTTPS
origin in the Pages build environment. The endpoint supports CORS. The sampled-stop path accepts
at most eight known stops, uses two upstream workers and shares a 20-second per-stop cache.
The service path derives the unique stops across all mapped directions, uses four workers and
a 45-second per-stop cache, and bounds a scan to 22 seconds. Both paths share a
120-upstream-request/minute budget per server instance. Free-host account limits must also be
configured and verified; the in-process budget is not an account-wide billing limit.

Vercel uses a temporary disk cache alongside the per-instance memory cache; local development
keeps the existing `.cache/` directory. Neither is a shared durable database.

The backend needs `public/transit/catalog.json` in its deployment. Error responses contain no
upstream credential details. When the backend or key is unavailable, route geometry remains
usable and the transit Options panel explains the missing position feed.

Refresh route geometry with `node scripts/import-transit.mjs`; cached source imports can be
rebuilt with `--cached`. Geometry attribution and upstream capture dates are retained. The bus
source is [SG Bus Data](https://github.com/cheeaun/sgbusdata), the rail source is
[SG Rail Data](https://github.com/cheeaun/sgraildata), and ferry connections are mapped
[OpenStreetMap](https://www.openstreetmap.org/copyright) ways. Simplified mapped alignments
are not surveyed tracks or vessel logs. Ferry services absent from the checked geometry are
not inferred from straight pier-to-pier lines. Sentosa Express, Cable Car and Skytrain geometry
comes from OpenStreetMap, with cable car station names checked against Mount Faber Leisure.

## Two ways to run it

| Mode | Command | Data path |
|---|---|---|
| Self-hosted (Node server) | `npm run dev` / `npm run build && npm start` | own API routes; live images from LTA **DataMall** with the key held server-side |
| Static (GitHub Pages) | `npm run build:static` → `out/` | baked enforcement-camera snapshot + keyless **data.gov.sg** live-image feed |

The full application deploys to Vercel. The optional static export needs no server, but live
credentialed feeds require a separately hosted backend.

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
these road conditions must not be interpreted as current traffic. On a first visit, layers 1–2
start on and camera layers start off. Returning visits restore the browser's saved layer choices.
Traffic images use the keyless data.gov.sg feed and refresh while that layer is visible.

### Phone and desktop controls

- **Both layouts:** a single scrolling row of icons with short labels toggles layer visibility.
  Labels sit below each layer icon and follow the English/Traditional Chinese language switch.
  Hover/focus shows the full tooltip. Tapping shows its name and new state without opening a popup;
  phone tap hints stay open until another interaction dismisses them. The pinned Options icon
  opens the last-tapped layer's details, legends and filters without changing visibility.
  The row scrolls horizontally. Desktop supports wheel/trackpad gestures, mouse dragging without
  toggling a layer, and 44 px left/right arrow buttons that disable at their respective edges.
  Reduced motion makes arrow scrolling immediate. Phones retain native touch scrolling and
  the overflow chevron. Browse, Reset and Collapse are icon controls in the same row;
  Options and data status stay reachable while scrolling.
  The collapsed dock retains the data-status icon, which explains feed health and capture dates.
  On phones the expanded dock spans the available width, with map controls and attribution above it.
- **Browse visible layers:** a searchable, paginated text list provides a keyboard-accessible way to
  select a camera or road record, including reports with no published coordinates. Map and list use
  the same property filters. Escape dismisses details and returns focus to the selecting control.
- **Feed failures:** an actionable summary appears first. Raw upstream diagnostics live in a
  disclosure; missing deployment credentials offer available cameras instead of an ineffective Retry.
- **Sources:** a native modal contains the nine road-layer sources and three camera-layer sources,
  with keyboard focus containment, Escape dismissal and focus return.
- **First-visit defaults:** driver layers 1 (live congestion) and 2 (accidents & breakdowns) are on;
  layers 3–9 and all three camera layers are off, in every build. Returning visits restore saved choices.
- **Top bar:** the app-icon button retracts the header and restores it in the same position. The
  language, 2D/3D, basemap and source buttons remain independent keyboard controls. On phones the header
  stays on one row: logo, short title, one EN/中 language toggle, a 2D/3D action, and icon-only basemap/Sources buttons.
  Both languages keep the Chinese title's bar width and the four action buttons aligned to its right.

### Reopen saved settings

The app saves settings in the current browser on the current device. Reopening on desktop or
phone restores the same choices, with panels adapting to the current screen width:

- Map centre, zoom, bearing, pitch, basemap and 2D/3D mode; camera, road and transit layer switches;
  road filters and the selected incident route.
- All-on, all-off or selected-only service filters, selected/focused routes and route popups;
  route panel mode, search, result limit and scroll; stop names and timetable estimates.
- Selected camera, road, station or unexpired vehicle details; dock selection, open panel, scroll
  and collapse; header collapse; browse search/page, transit source/station disclosures and the
  Sources panel. Language retains its existing saved preference.

Selections resolve against current data when it loads. Removed routes/stations and removed or
duplicate service-filter IDs are discarded; all-on and all-off remain distinct choices. A reopened
station requests current arrivals. Vehicle detail snapshots keep their original source timestamps
and freshness limits, refresh when newer matching evidence arrives, and are discarded after expiry.
They never restart as fresh live positions. Preferences contain no credentials or raw feed responses.

Settings do not sync between browsers or devices. Clearing browser storage removes them. If storage
is denied, full or corrupt, the app continues with valid defaults. Reset layers and filters saves
the resulting reset choices.

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
| `npm test` | regression tests for capture dates, feed errors and transit position evidence |
| `npm run lint` / `npm run typecheck` | individually |
| `node scripts/smoke.mjs [url]` | end-to-end browser checks via Chrome DevTools Protocol (screenshots → `.cache/screens/`) |

### Deployment

Vercel deploys the connected `main` branch as the full Next.js application, including API route
handlers. `vercel.json` selects the Next.js build and Singapore function region. Configure
`DATAMALL_ACCOUNT_KEY` privately in the Vercel project environment; no secret belongs in Git.

`.github/workflows/deploy.yml` runs installation, lint/type checks, tests and a production build.
It no longer publishes GitHub Pages. The optional `npm run build:static` export remains available
for snapshot-only hosting; it temporarily removes API routes and uses the `/SGRTTrafficInfo`
base path — see `scripts/build-static.mjs` and `next.config.ts`.

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
