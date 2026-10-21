# 3D map and transit extension

Status: implemented locally after brief confirmation; final review and validation recorded in [transit-3d-validation.md](transit-3d-validation.md). No deployment performed.

## Purpose and scope

Extend the existing bilingual Singapore traffic map for phone and desktop use. Keep the established Pastel Civic Atlas interface and current traffic features. Add Singapore public buses, all operating MRT/LRT lines and domestic passenger ferries.

## Agreed behaviour

- Add a 2D/3D toggle to the top menu, alongside the existing map controls. The 3D view uses free raised buildings with tilt and rotation. Preserve map location, zoom and enabled layers when switching.
- Generate transparent vehicle artwork with the available ImageGen tool. The icons depict researched real-world vehicle shapes and liveries. Use representative fleet/type artwork when the feed cannot identify the exact vehicle, and explain this in vehicle details.
- Keep vehicle livery separate from route identity. Use official route/line colours where published on route lines and labels. Where a service has no official route colour, use a documented local display colour without calling it official.
- Place vehicles on verified route geometry and move them using available vehicle GPS or usable ETA evidence. Load vehicles in the visible map area plus a selected route.
- When neither GPS nor ETA evidence is available, show routes and stops with unavailable position status. Do not substitute timetable-only animation.
- If source updates stop, freeze the marker and briefly mark it stale. Hide it when the source-specific expiry is reached. Retain routes and stops.
- Keep GitHub Pages as the frontend host. Add a separate backend within a free hosting tier to protect API keys, cache shared results and bound polling. Provider choice is a routine implementation decision subject to current free-tier eligibility and capacity; no paid upgrade is included.
- Build directly in code, with ImageGen reserved for the requested vehicle artwork. Preserve bilingual controls, accessibility, mobile touch targets and reduced-motion behaviour.

## Confirmed defaults

- Keep 2D as the initial map view and remember the user's chosen 2D/3D mode locally.
- Add Bus, Train and Ferry controls to the existing scrolling layer rail. Start these new layers off, preserving the current traffic defaults.
- Use the same vehicle artwork in 2D and 3D. Tapping a vehicle opens service, direction/destination, position source, freshness and representative-icon details.
- Keep labels readable above buildings and reduce marker density at wider zooms. Do not imply that viewport-limited vehicles represent the full fleet.
- Treat GPX as route geometry and GPS as vehicle-position evidence. A route file alone does not justify a moving live vehicle.

## Verified constraints and dependencies

- The repository currently implements three camera layers and nine road overlays; transit feeds, transit geometry and transit artwork are new work.
- Existing map infrastructure uses MapLibre GL JS 5.24 with OSM raster and OpenFreeMap Positron vector styles. OpenFreeMap's public instance currently requires no API key and charges no fee for normal map display. Building coverage and heights depend on the map data.
- The current production build is a static GitHub Pages export. Credentialed transit feeds need a backend; API keys must not be embedded in frontend files.
- No usable DataMall key was found in the conventional local environment files during planning. The key must be configured privately for live bus verification.
- LTA Bus Arrival v3 supplies ETA and estimated coordinates for upcoming buses. These are not raw GPS observations, and the schema does not establish exact individual-vehicle identity. Do not describe a representative icon as an identified vehicle.
- The current LTA guide documents train GTFS trip updates for disruptions. Routine live train positions have not been verified. Under the agreed rule, the normal train layer may initially show routes and stations without moving trains.
- An official MPA vessel-position source is a research lead, but current access and coverage of the domestic ferries remain unverified. Ferry movement requires a verified suitable position or ETA source and a reliable vessel/service match.
- Existing uncommitted changes in DESIGN.md, README.md, smoke checks, global CSS, the layer panel and translations must be preserved.

## Delivery and verification

Implement and validate the feature locally after brief confirmation. Test position inference, direction, stale expiry and continuity where meaningful. Run the project's verification and build/static-export checks. Check the rendered map and header together on desktop and narrow phones, including mode switching, active-layer retention, both languages, unavailable feeds and vehicle selection. Clearly report any credential-dependent checks that remain unverified. Publication is a separate delivery step.

## Sources checked during planning

- [OpenFreeMap](https://openfreemap.org/)
- [MapLibre 3D building example](https://github.com/maplibre/maplibre-gl-js/blob/main/test/examples/display-buildings-in-3d.html), retrieved through Context7.
- [LTA DataMall API guide v6.10, 1 October 2026](https://datamall.lta.gov.sg/content/dam/datamall/datasets/LTA_DataMall_API_User_Guide.pdf)
- [LTA dynamic datasets](https://datamall.lta.gov.sg/content/datamall/en/dynamic-data.html)
- [LTA on-request datasets](https://datamall.lta.gov.sg/content/datamall/en/on-request_datasets.html)
- [LTA public-bus livery reference](https://www.lta.gov.sg/content/ltagov/en/who_we_are/our_work/public_transport_system/bus/upgrading_bus_fleets.html)
- [MPA OCEANS-X](https://oceans-x.mpa.gov.sg/), current ferry access and coverage still to be verified.
