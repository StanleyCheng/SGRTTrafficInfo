# Circle coverage and compact map controls

Operate-mode refinement of Pastel Civic Atlas. Preserve the existing palette, typography, layer behaviour and native controls. Code-first; no new visual world or approved comp.

Confirmed request: remove Circle Line's half-route marker bias, preserve dimensional fleet illustrations and turn their actual noses with travel. Moving artwork uses 0.7 of the previous 48px size, or 33.6px. The bottom dock uses 0.7 of the previous geometry, with the user-confirmed 12px caption and 44px target floors. Pack Transit routes controls upward to increase list space; keep complete Transport values readable on phones.

Coverage: the scheduler returns all active configured departures instead of the newest six. Circle Line models both directions on primary `paths[0]` using the existing uniform 5-minute headway and 82-minute run time. Steady service produces 32 or 34 active estimates depending on phase. Those are timetable model instances, not a physical-fleet census. No branch schedule or new source figure is added. The saved opt-in, source/evidence disclosure, service windows and unsupported static lines remain.

Signature: each sprite's native front is calibrated from rear/front image pixels. The body rotates to the directed screen-projected tangent, including reverse travel and pitched maps, while 12px service badges remain upright in 56×72px targets. Circle Line has one additional native-alpha ImageGen map raster with visible roof, sidewall and cab depth. Original menu/detail artwork remains. `public/transit/moving/circle-assets.json` records the exact prompt, primary sources, hash and 69.118° front bearing; the tool exposes no model version.

First viewport: the map stays dominant. The dock scale is 0.63 from the original 88×78px baseline, giving 55.44×49.14px tiles and a 742px desktop maximum. Drawn glyphs and spacing scale by 0.7 while captions stay 12px and counts stay 10px. Short English captions include Traffic, Hazards, Works and Highways. Utility controls retain 44px targets.

Transit routes uses 10px padding, 4px gaps, a two-column settings row and a compact focus return action. The route list gets the remaining space. Its measured height is 309px at 390×844; at 700px viewport height or less, the parent panel scrolls so the controls and list remain reachable. The complete wrapping Transport value sits above a visually transparent native select, retaining native keyboard and mobile selection. All six values fit at 320px and 390px widths.

Motion: hidden documents cancel animation; existing bus stale/expiry limits remain 45/90 seconds. Reduced motion uses distributed, discrete 15-second timetable snapshots and the latest source-observed ETA/GPS position.

Finish: the independent review opened all eleven final captures and requested only documentation synchronization. `.cache/circle-qa/browser-results.json` records 19 passing checks, and `modes-results.json` records four, including all 18 captions at 12px within two lines, distributed reduced-motion positions, ferry heading and a live bus heading. No UI rebuild or recapture is required for the documentation fix.
