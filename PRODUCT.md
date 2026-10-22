# Product

<!-- impeccable:product-schema 1 -->

## Platform

web

## Users

Visitors consulting a Singapore traffic map in English or Traditional Chinese, on phones and desktop browsers.

## Product Purpose

Present official Singapore traffic information on an interactive map. Transit covers public buses, all operating MRT/LRT lines, domestic passenger ferries, Sentosa Express, Singapore Cable Car and Changi Skytrain.

## Operating Context

The full Next.js application is hosted on Vercel, including private credentialed API handlers. The user selected Vercel when the complete app could not run entirely on static GitHub Pages. GitHub Pages export remains optional for snapshot-only hosting. API keys stay server-side; live feed access and hosting capacity remain explicit limits.

## Capabilities and Constraints

- The existing app offers traffic-camera and road-condition layers, bilingual controls and OSM/OpenFreeMap Positron basemaps.
- Add an optional 3D map with raised buildings, tilt and rotation, retaining the current location, zoom and enabled layers.
- Vehicle icons use researched real-world fleet liveries and vehicle shapes. When an exact vehicle is not identified, a representative fleet/type icon is acceptable and must be described as representative.
- Route lines and route labels use the appropriate route or line colour separately from the vehicle's livery.
- Observed positions and live arrival estimates use available GPS or usable ETA evidence along real route geometry. A separate, saved opt-in enables clearly labelled timetable estimates for configured lines without a live position feed. It is off by default. Lines without supported timetable inputs retain routes and stops only; estimates never imply live positions or a complete physical fleet.
- Timetable models represent every active configured departure within its service window. Circle Line uses both directions on the primary mapped loop with the existing uniform 5-minute headway and 82-minute run-time assumptions. It adds no branch schedule or physical train identities.
- Transit includes both mapped Sentosa Express directions, the Mount Faber and Sentosa cable car lines, and six Changi Skytrain connection groups across ten mapped relation/direction records. Skytrain public-area and transit-area connections remain distinct; transit-area routes require airside access. The A/A-South shuttle is omitted because its mapped access tags conflict. International ferries are outside the current scope.
- A collapsible right-side transit selector supports all services, no services or individual services for each mode, with search and results loaded in batches of 60. Compact settings and focus controls leave more space for the route list. The native Transport select retains a complete, wrapping visible value on phones. Stop names can be shown for the displayed routes using map collision placement.
- A route popup or service-row fit action focuses the whole service, including both bus directions and both mapped Sentosa directions. Focus temporarily hides other transit, camera and road overlays while retaining their chosen settings; leaving focus restores those overlays.
- Map and backend services must fit free usage; private feed credentials stay on the backend.
- Load bus estimates from at most eight sampled stops in the visible area at a 20-second polling interval. Whole-service focus queries the unique stops across both directions with bounded work, a 45-second stop cache and polling interval, and checked/total coverage. Deferred stops take priority on the next scan. Partial stop coverage and ETA evidence never imply a complete GPS fleet.
- When position evidence stops updating, stop motion, briefly mark the position stale and hide the vehicle after an expiry appropriate to that source. Routes and stops remain visible.

## Brand Commitments

Preserve the established bilingual Singapore traffic-map identity and existing controls. Use ImageGen to produce the requested vehicle artwork.

## Evidence on Hand

The repository contains the existing traffic UI, official-source registries, feed-status handling, static export and responsive smoke checks. Transit route geometry, service selection and focus, researched artwork, an ETA bus adapter and evidence-aware motion are implemented. Configured rail, ferry, Sentosa Express, Cable Car and Skytrain models offer opt-in timetable estimates with source and service-window disclosure. Other lines stay static. Moving fleet artwork is 33.6px inside 56×72px targets; calibrated image fronts follow actual screen-projected travel while 12px service badges stay upright. Menu/detail artwork is retained. Prompts, reference sources and alpha checks are recorded in `public/transit/assets.json` and the map-only Circle asset's `public/transit/moving/circle-assets.json`. Official feed coverage must be verified before describing a vehicle position as live.

## Product Principles

- Keep the map useful on phones and desktops.
- Separate observed positions, position estimates and unavailable data in user-facing information.
- Preserve real vehicle appearance while keeping route identity legible.
- Identify timetable models explicitly and keep them separate from observed positions and live arrival estimates.
