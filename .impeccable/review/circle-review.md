# Circle coverage and compact controls review

## Initial bounded review

disposition: fix

## persistence

Fail. PRODUCT.md and DESIGN.md exist, but their persisted contracts do not yet match the reviewed build. DESIGN.md still records 48px moving artwork, 79.2×70.2px dock tiles, a 0.9 scale, upright vehicle bodies, and an arrow-only heading. PRODUCT.md and DESIGN.md also retain prohibitions on timetable-only motion that conflict with the operator-restored, explicitly opted-in and labelled model policy named in this packet. The surface brief correctly records the current policy. This is a code-first refinement; approved comps, comp phases, a new-world seed, and a QUALITY BAR card are inapplicable.

## fidelity

All eleven required captures exist and were opened: desktop, desktop panel, mobile, mobile Chinese, 320px controls, pitched/rotated Circle map, mobile map, complete Transport value, short-phone scrolled route list, ferry heading, and live bus heading. Each is populated, correctly framed for its named state, and free of blank capture regions. The black N control is the development indicator identified by the packet.

| Element or promise | State | Evidence |
| --- | --- | --- |
| TYPE | match | Incumbent serif wordmark and Archivo/CJK control hierarchy remain; dock captions retain the confirmed 12px floor. |
| MATERIAL | match | The new Circle raster retains visible roof, sidewall and cab depth; rendered fleet artwork remains dimensional. |
| GROUND | match | Mint framing, ivory panels and forest ink preserve Pastel Civic Atlas; the incumbent basemap remains the map field. |
| Full primary Circle coverage | match | Desktop captures show estimates around both halves of the loop; recorded browser evidence finds 34 active model markers across the loop and both directions. |
| Nose follows movement; badge stays upright | match | Body rotation follows the calibrated raster front, with reverse tangent support; pitched/rotated Circle, ferry and live bus evidence supports the heading contract. Recorded Circle checks align 34/34 markers within 12 degrees. |
| Artwork at 0.7 size | match | Recorded render size is 33.5938px with the retained 56×72px marker target. |
| Compact bottom dock | adaptation | 55.44×49.14px tiles, compact spacing and smaller glyphs implement 0.7 geometry while preserving the user-confirmed 12px captions, 10px counts and 44px target floor. |
| More Transit routes list space | match | Compact settings, focus summary and actions leave 309px of visible list at 390×844; the 320×568 capture and scrolled companion show the short-phone fallback remains reachable. |
| Complete mobile Transport values | match | The visible value fits in the 320px capture; recorded checks show all six values fit at 320px and 390px. The native select remains the accessible control. |
| Evidence and reduced-motion policy | match | The opt-in and “timetable estimates, not live vehicle positions” disclosure remain visible. Reduced-motion evidence records distributed, stationary markers between snapshots. |

## ceiling

Reached for the requested Operate refinement. Existing framing, control hierarchy and map dominance remain intact; the added raster depth and directed body rotation implement the scoped signature. No unused expressive device is a material omission for this task.

## material_fixes

1. Persistence: synchronize PRODUCT.md, DESIGN.md and the design sidecar with the built 33.6px artwork, 0.63 dock scale and compact dimensions, directed body rotation, upright badges, compact Transit routes layout, and preserved opt-in labelled timetable models. Remove the superseded upright-body/arrow-only and blanket timetable-motion prohibitions; retain the explicit distinction from observed fleet positions. No UI rebuild or recapture is required for this documentation fix.

## keep

Preserve the current isometric depth, calibrated noses, upright badges, full-loop model distribution, opt-in estimate disclosure, compact readable dock, 44px targets and native mobile Transport selection.

## Persistence fix verdict

disposition: ship

## persistence

Resolved. The single persistence fix from `finish-review.md` is complete. PRODUCT.md, DESIGN.md, `.impeccable/design.json`, README.md and both scoped surface briefs describe the current implementation. The appended vehicle-motion-plan amendment explicitly marks the superseded historical contracts as history.

## fidelity

The updated documentation matches the built source: 33.6×33.6px artwork inside 56×72px targets; calibrated body rotation to directed screen-projected travel with upright 12px service badges; 0.63 dock scale producing 55.44×49.14px tiles with 12px captions and 44px target floors; compact route controls and a complete wrapping value over the retained native Transport select. The documentation preserves saved, off-by-default, explicitly labelled timetable models, every active configured departure, both Circle directions on the primary path using the existing 5-minute/82-minute assumptions, and no branch or physical-fleet claim. The sidecar's 15000ms snapshot interval matches the discrete reduced-motion schedule position logic.

## ceiling

The original visual review remains reached. This verdict scores the persistence fix only; no UI audit, captures, build or new defect hunt was performed.

## material_fixes

Clear. No unresolved or partial items remain from the single requested fix, and its documentation changes introduce no material regression in the scored contract.

## keep

Preserve the reviewed dimensional artwork, directed noses, upright badges, full primary-loop distribution, opt-in estimate disclosure, readable compact dock, 44px targets and native Transport selection.
