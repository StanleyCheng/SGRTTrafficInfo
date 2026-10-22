# Arrivals and layer rail review

disposition: ship

Review scope: all nine named captures opened; source sampled. Full transit.ts, transit-schedule.ts and use-transit.ts were not read. This is the specified code-first extension of the incumbent world; no replacement comp, quality-bar card or concept seed applies.

## persistence

Pass. PRODUCT.md, DESIGN.md and .impeccable/design.json exist and retain Pastel Civic Atlas, the 0.63 dock scale, fixed 12px captions, 44px utility targets and calibrated vehicle-art contract. The direction contract is present. The ordinary feature-description update belongs to the scheduled documenter handoff. All nine required captures have the specified viewport dimensions and valid settled content. Supplied evidence records 16 browser checks, 10 state checks and 51 passing Node tests; lint/types are reported passing. The production-build result remains for the parent to verify before release.

## fidelity

| Element | Disposition | Evidence |
| --- | --- | --- |
| TYPE | match | Instrument Serif stop/vehicle headings and Archivo metadata/tabular times retain the incumbent hierarchy; bilingual metadata wraps. |
| MATERIAL | match | Established ivory detail surfaces, mint header, forest ink, route-colour underlines and real fleet raster remain visibly present. No new imitation material. |
| GROUND | match | The map remains the dominant field; ivory/mint controls retain the documented temperature and palette. |
| Desktop layer rail | match | Leftmost and right arrows align with the compact dock. Supplied interaction evidence verifies gestures, mouse dragging without layer activation, edge disabling and immediate reduced-motion scrolling. |
| Station detail | match | Desktop bus and rail captures expose arrival clock times, countdowns, direction, source and update/capture information within the established nonmodal card. |
| Phone detail | adaptation | The surface contract explicitly requires a bounded bottom sheet. English, Traditional Chinese and 320px captures preserve wrapping and a reachable close control; supplied checks verify internal scrolling. |
| Dock retraction during detail | match | The small bottom dock sliver in desktop detail captures follows the incumbent DESIGN.md retraction rule. |
| Vehicle detail | match | Direction, linked next stop, loop/final station and separately targeted later-stop prediction are explicit. Artwork and evidence descriptions remain intact. |
| Truth and failure states | match | Actual bus predictions and provider schedules are separately labelled; timetable rows disclose estimates. Delayed and unavailable captures visibly identify QA fixtures and retain source/status or serving-route information without invented arrivals. |
| Selection and access | match | Sampled map code prioritizes station hits; route options offer station buttons, detail focus/Escape handling is preserved, and the next-stop link opens the same surface. |

## ceiling

Reached for this bounded extension. The incumbent atlas frame, editorial headings, restrained depth, route underlines and tabular timing carry the new content without displacing the map. No unused native device is material to the requested behavior. The supplied hook disposition and visual inspection expose no new craft-floor violation.

## material_fixes

None.

## keep

Preserve the compact captioned dock, map dominance, bounded bilingual details, calibrated fleet artwork, explicit live/operator/model distinctions and stop-specific prediction targets.


## Saved-state addition review

disposition: fix

Review scope: added persistence only and its effect on the prior arrivals SHIP. Both new captures opened; persistence helpers, App reconciliation, map lifecycle, panel state and supplied evidence sampled. No replacement comp, world or concept seed applies.

## persistence

Pass for evidence and incumbent design records. The new direction contract exists. persistence-desktop.png is a valid settled 1440×900 frame; persistence-mobile.png is a valid settled 390×844 frame. Both retain the map, focused route, restored panel state and compact dock. Supplied evidence records ten passing browser checks and 57 passing Node tests. Final lint/type/build reruns remain with the parent before release.

## fidelity

| Element | Disposition | Evidence |
| --- | --- | --- |
| TYPE / MATERIAL / GROUND | match | No added styling or assets; the restored 3D map and existing mint/ivory/forest controls preserve Pastel Civic Atlas. |
| Saved map and selected layers | match | Reload evidence verifies Positron/3D, centre, zoom 15.7, bearing 31, pitch 47, mixed switches, selected-only route filters and focused service. |
| Panel and responsive state | match | Both captures retain search and selection; evidence verifies dock/list offsets, collapsed controls and phone containment. |
| Freshness and data boundaries | match | Preferences retain timestamped vehicle snapshots only within expiry; a restored station refetches arrivals. Storage access and JSON failures fall back without throwing. |
| Removed catalogue identities | contradicted | App clears missing selected/focused routes and stations, but never reconciles transitFilters. A removed route-group ID survives in the saved selected-only list; TransitControls reports selected.length even when that group is absent, producing phantom selections or an empty map with “1 selected”. The existing removed-ID browser check injects only focusedRoute/transitRoute. |

## ceiling

The prior visual ceiling remains reached. This added behavior introduces no visible design regression in the two required captures.

## material_fixes

1. Saved-state contract, removed identities: prune each non-null transitFilters mode list against current catalogue routeGroupId values after hydration/catalogue readiness, retaining null as all-on and [] as all-off; persist the reconciled result. Verify reload with a removed-only selection and a mixed valid/removed selection so the map, checkboxes and selected count agree.

## keep

Preserve the prior arrivals SHIP, exact restored camera and scroll state, hydration-before-write behavior, device-local scope and original vehicle freshness timestamps.


## Filter-pruning fix verdict

disposition: ship

Scoring only the single material fix from persistence-review.md; this ship covers that scored fix. The prior arrivals review remains unchanged.

## persistence

Pass. Both required fix captures exist, were opened and are valid settled frames at 1440×900 and 390×844. The reported 58-test/lint/type checks pass; final production-build completion remains with the parent.

## fidelity

Resolved — removed catalogue filter IDs no longer produce phantom selections. pruneTransitFilters removes unknown and duplicate group IDs per mode, preserves null/all-on and []/all-off, and keeps reference identity when unchanged. App applies and persists reconciliation when the catalogue is available. The reload evidence records bus ["bus:42"] with “1 selected” and train [] with “0 selected”. Both captures visibly show MRT & LRT with All off, 0 selected and unchecked service rows while the focused Bus 42 map remains intact. The phone capture follows a further reload.

## ceiling

No regression introduced by this fix is visible in the two recaptures. No new audit performed.

## material_fixes

Clear. The single prior material fix is resolved; no partial or unresolved finding remains.

## keep

Preserve null/all-on and []/all-off semantics, exact restored camera/focus and the existing arrivals visual approval.


## Release-owner validation

58 Node tests, lint, TypeScript and the final production build passed. The two scored persistence captures and all nine arrival captures were opened and valid. The private credential scan found no DataMall key in public assets or browser bundles. Production deployment verification follows the push.
