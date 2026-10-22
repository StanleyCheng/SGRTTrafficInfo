# Product

<!-- impeccable:product-schema 1 -->

## Platform

web

## Users

Visitors consulting a Singapore traffic map in English or Traditional Chinese, on phones and desktop browsers.

## Product Purpose

Present official Singapore traffic information on an interactive map. The transit extension adds public buses, all operating MRT/LRT lines and domestic passenger ferries.

## Operating Context

The full Next.js application is hosted on Vercel, including private credentialed API handlers. The user selected Vercel when the complete app could not run entirely on static GitHub Pages. GitHub Pages export remains optional for snapshot-only hosting. API keys stay server-side; live feed access and hosting capacity remain explicit limits.

## Capabilities and Constraints

- The existing app offers traffic-camera and road-condition layers, bilingual controls and OSM/OpenFreeMap Positron basemaps.
- Add an optional 3D map with raised buildings, tilt and rotation, retaining the current location, zoom and enabled layers.
- Vehicle icons use researched real-world fleet liveries and vehicle shapes. When an exact vehicle is not identified, a representative fleet/type icon is acceptable and must be described as representative.
- Route lines and route labels use the appropriate route or line colour separately from the vehicle's livery.
- Motion uses available vehicle GPS or usable ETA evidence along real route geometry. When neither exists, show routes and stops with unavailable position status; do not animate a timetable-only substitute.
- The first transit release covers Singapore public buses, operating MRT/LRT lines and domestic passenger ferries. International ferries are outside that scope.
- Map and backend services must fit free usage; private feed credentials stay on the backend.
- Load moving vehicles in the visible map area and on a selected route, rather than polling every service nationwide.
- When position evidence stops updating, stop motion, briefly mark the position stale and hide the vehicle after an expiry appropriate to that source. Routes and stops remain visible.

## Brand Commitments

Preserve the established bilingual Singapore traffic-map identity and existing controls. Use ImageGen to produce the requested vehicle artwork.

## Evidence on Hand

The repository contains the existing traffic UI, official-source registries, feed-status handling, static export and responsive smoke checks. Transit route geometry, researched generated artwork, an ETA bus adapter and evidence-aware motion are implemented. Official feed coverage must be verified before describing a vehicle position as available.

## Product Principles

- Keep the map useful on phones and desktops.
- Separate observed positions, position estimates and unavailable data in user-facing information.
- Preserve real vehicle appearance while keeping route identity legible.
- Do not imply live movement from unavailable position evidence.
