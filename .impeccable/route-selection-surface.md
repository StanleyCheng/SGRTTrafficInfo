# Transit route selection

Operate-mode extension of the existing map. User asked for whole-service focus from route popups, both bus directions and available moving buses, right-side route selectors with All on / All off / chosen routes, stop-name visibility, added public transport modes, and readable bottom captions on desktop and phones. User confirmed adding Sentosa Express, Singapore Cable Car and Changi Skytrain, with airport access labels.

Preserve DESIGN.md's mint/ivory/forest atlas identity and scrolling bottom rail. Code-first remains confirmed; there is no approved visual comp.

First viewport: full map, existing top menu, a compact “Transit routes” control at the upper right, and larger bottom tiles with 12px captions. Open the right panel to choose a mode, all/none or individual services. Search and a bounded result list support the large bus catalogue. Each service row has a 44px fit action.

Signature interaction: click a mapped line, inspect its popup, then focus the full service. Both mapped directions and all available service estimates appear together. Focus temporarily hides all other transit/camera/road overlays; returning restores the selected layers. Stop labels are controlled from the right panel and use normal map collision placement.

Evidence contract: BusArrival supplies predictions, not full-fleet GPS. Focus scans the unique stops in both service directions with bounded workers, a shared 120 requests/minute per-instance budget, caching and partial-coverage counts. Deferred stops take priority next time. Stale/expiry rules remain. Other modes have routes and stops only. Skytrain connections distinguish public/transit access; the A/A-South shuttle is omitted because its mapped access tags conflict.

Required checks: service grouping and isolation, routes outside the current viewport, popup action, all/none/individual selections, restoring layers, stop labels, live estimates/freshness/coverage, bilingual controls, 1440px desktop, 390px phone and 320×568 short phone with reachable scrolling controls. New sprites carry generation provenance and real representative fleet colours/shapes.
