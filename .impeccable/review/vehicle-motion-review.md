# Vehicle motion review — 22 October 2026

All rendered route/feed fixtures in this review are synthetic QA interception, not shipped transport data. The initial narrow-phone capture was replaced before the full review.

disposition: fix

No separate QUALITY BAR card was supplied. Ceiling is judged against the confirmed incumbent Operate brief and DESIGN.md; no approved comp or concept-roll seed applies to this refinement.

## persistence

Pass. PRODUCT.md, DESIGN.md and the vehicle-motion surface brief preserve the existing atlas and record the confirmed scope. All seven required captures are present and valid after replacement of user-320.png. The short-phone capture now has one header, a bounded scrolling panel, normal dock and attribution. Three asset manifests record representative status, research sources, exact generation prompts, native alpha and hashes for all 15 overhead sprites. The active hook reports no new finding or suppression.

## fidelity

| Element or promise | State | Evidence |
| --- | --- | --- |
| TYPE | match | Existing Instrument Serif, Archivo and CJK hierarchy remains; route badges retain 12px text and stay upright. |
| MATERIAL | match | Native-alpha overhead rasters preserve distinct bus roof shapes and researched liveries; prepared rail, ferry and other artwork retains the same miniature material. |
| GROUND | match | Mint, warm ivory and forest controls retain the incumbent palette and map hierarchy. |
| THESIS: continuous supported travel and explained corrections | contradicted | Ordinary movement and large-revision reacquisition are supported by the supplied QA. An ETA arriving before a small blend completes makes the scheduler drop to one-second updates, interrupting the correction. |
| OWN-WORLD: preserve the operational atlas | match | Header, route focus, selector, bilingual captions and layer rail retain their identity and scale. |
| STORY: evidence determines visible movement | match | Source freshness, stale stop, expiry, hidden-tab pause and reduced-motion behavior remain explicit. Unverified routine rail and other modes stay routes/stops only. The packet labels its intercepted QA data synthetic; the reviewed source diff adds no demonstration vehicles. |
| FIRST VIEWPORT: map and familiar controls remain primary | match | Desktop, both phone languages, unobstructed artwork and the replacement 320px capture preserve readable map controls and dock clearance. |
| FORM: map-only size and directed fleet bodies | match | Artwork is 28×28px inside 56×68px buttons, with unchanged 12px badges and menu/detail art. Front-up sprite bodies follow opposite directed tangents and projected 3D headings. The incumbent extension requires no replacement-world seed. |

## ceiling

Visual ceiling reached for the confirmed map-only Operate scope. The raster fleet bodies, independent upright labels and projected headings provide the required identity at the user-confirmed scale. Motion completion remains blocked by fix 1.

## material_fixes

1. Keep requestAnimationFrame active for an unfinished fresh `blend` in `src/components/transit-map.ts:104`, bounded by the 1500ms correction duration and `staleAt`, even when `arrivalAt` has passed. A correction from displayed 200m to fresh 230m with a 240m stop and ETA in 500ms displays 217.78m at arrival; the current gate then sleeps for one second and jumps 22.22m to 240m. Add a regression that covers this near-arrival correction and verifies continuous frame scheduling through its finish. This violates the THESIS small-correction promise.

## keep

Keep the 28px native-alpha overhead bodies, 56×68px targets, upright 12px badges, representative-fleet disclosure, evidence-only visibility and existing bilingual atlas controls.


# Fix verdict

## verdict

1. Resolved. `vehicleMotionIsAnimating` now keeps display-refresh updates active until a fresh blend completes at 1500ms, including after its ETA, and stops at staleness or expiry. The regression covers the reported 230m to 240m arrival-in-500ms case. The rendered fixture retained its marker and changed position on all 50 sampled frame intervals after ETA, between correction ages 613ms and 1445ms. All seven recaptured screenshots are valid, retain the confirmed artwork and control scale, and show no regression from this fix.

## remaining

Clear. This ship verdict covers the scored fix.

disposition: ship


Lint, TypeScript, 32 tests and the production build pass. The single reviewed correction is covered by a rendered near-arrival fixture: same marker, 50 moving intervals from 51 samples, 613–1445ms after a fresh observation whose ETA was 500ms.
