# Transit route selection — 22 October 2026

## Implemented

- Right-side transit selector: bus, MRT/LRT, domestic ferry, Sentosa Express, Singapore Cable Car and Changi Skytrain. Per-mode all/none and searchable individual service selection; bus directions grouped together. Results render in batches of 60.
- Route-line popup and fit action focus the full service, including all mapped directions and available bus estimates. Focus hides other overlays without discarding their settings. Return restores them.
- Stop-name checkbox updates the map symbol layer. Labels use normal map collision placement; zoom closer to read crowded stops.
- Bottom tiles enlarged from 0.7 to 0.9 of the original size; captions restored to 12px and count badges to 10px.
- Added generated transparent representative sprites for the three extra modes, with embedded prompts and primary-source livery references in `public/transit/extra-assets.json`.

## Evidence and limits

BusArrival supplies predictions for upcoming buses at each stop, not a complete GPS fleet or stable vehicle identifiers. Whole-service mode requests the unique stops across both directions, with four workers, caching, a 22-second scan deadline and a shared 120 upstream requests/minute per-instance ceiling. Partial responses retain successful stops and expose checked/total coverage. Deferred stops receive priority in the next scan. This is an application-instance bound, not an account-wide quota enforcement service. Markers still stop at 45 seconds and expire at 90 seconds from their source observation.

A local authenticated service 2 scan returned HTTP 200 with 120/130 mapped stops checked; unknown service validation returned HTTP 400. Applying the existing inference to that captured response at its observation time yielded 24 available estimates across both `bus:2:1` and `bus:2:2` (not a physical-fleet count). The ordinary nearby path remains an eight-stop sample. Other modes show mapped routes and stops because no routine live position source has been verified. Skytrain public and transit routes are separate choices; the A/A-South shuttle is omitted due conflicting mapped access tags. Follow airport access signs.

Extra geometry is imported from actual OSM relations/ways, with no invented joining segments. Cable car station names follow the current operator (including Sensoryscape). Source paths and access labels are retained in the catalogue. Added layers start off.

## Local verification

- `npm run verify`: lint and TypeScript pass.
- `npm test`: 22 tests pass, including both-direction grouping, focus outside the viewport, isolation, separate ferry choices, new-mode geometry/stops/access and existing position/staleness inference.
- `npm run build`: production build passes with all four API handlers.
- Focused browser checks on the real MapLibre map: service 2 renders only `bus:2:1` and `bus:2:2`; other road overlays are hidden; stop-name toggle produced 27 rendered stop labels; route tap opens the popup and its action focuses the full route. Selecting Sentosa fits both mapped directions. Cable car exposes both lines; Skytrain exposes six public/transit connection groups.
- Desktop 1440×900; phones 390×844 in English and Traditional Chinese; short 320×568 phone. Right panel fits and scrolls on the short phone. Dock retains its horizontal layout and map-control clearance, with 12px captions and 44px utility targets.
- Broader live-data smoke run: 55/59 checks passed. Four live-data assumptions failed during warm-up (initial traffic-camera count, incident filter data, live-camera payload and roadworks mapped-feature availability). Subsequent direct API checks returned eight traffic cameras and six mapped incidents; roadworks reports can lack published geometry. No unrelated feed behavior was changed. All changed route interactions were verified separately as above.

Screenshots and browser command evidence are kept locally under `.cache/routes-qa/`; no credentials are included.

## Review and release

Impeccable reviewed all six supplied desktop/phone captures and found no material visual defects. It requested a documentation persistence fix; the subsequent verdict scored that fix resolved and returned `ship` at that scope. PRODUCT.md, DESIGN.md, README.md and the bounded design sidecar now describe the feature. The prior narrow ignore for the non-rounded route-code underline is retained; no new suppressions were added. Production deployment is verified after publication, with runtime evidence kept under `.cache/routes-qa/`.
