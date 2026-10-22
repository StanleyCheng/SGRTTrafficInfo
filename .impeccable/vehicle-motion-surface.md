# Vehicle motion

Operate-mode refinement of Pastel Civic Atlas. Preserve the mint/ivory/forest palette, route selector, route focus, bilingual captions and mobile map clearance. Code-first; no replacement visual world or approved comp.

First viewport: moving 3D fleet artwork is 33.6×33.6px, or 0.7 of the previous 48px size, inside the retained 56×72px marker button. Service badges stay upright at 12px. Menu/detail artwork stays unchanged; Circle Line alone uses the additional map-only raster in `public/transit/moving/`.

Signature interaction: calibrated rear/front pixels define each raster's native nose. The body and separate arrow follow the directed screen-projected route tangent, including reverse travel, bends and pitched/rotated views. The symmetric cable car uses a travel axis. Continuous supported progress preserves marker identity and uses subpixel placement. Small fresh corrections blend along route geometry in 1500ms; large or reversing revisions fade/reacquire in 320ms.

Evidence and access: GPS, live ETA estimates and timetable models remain distinct. Timetable estimates are a saved opt-in, off by default, with dashed treatment and explicit non-live wording. Every active configured departure is represented within its service window; unsupported lines keep routes/stops only. Circle Line models both directions over its primary path using the existing 5-minute headway and 82-minute run time, without a branch schedule or physical-fleet claim. Artwork represents a researched fleet/type, not an identified physical unit.

Bus estimates freeze stale at 45 seconds and expire at 90 seconds. Hidden documents cancel animation. Reduced motion keeps ETA/GPS at the latest source-observed position and uses distributed 15-second timetable snapshots, stationary between snapshots. Keyboard focus, readable labels and at least 44px targets remain usable.

Finish evidence: `.cache/circle-qa/finish-review.md` found no material UI defect and requested the scoped documentation synchronization. Provenance for the additional native-alpha Circle raster is in `public/transit/moving/circle-assets.json`; its exact prompt, source links, SHA-256 and calibrated front are recorded, and the ImageGen model version is unexposed.
