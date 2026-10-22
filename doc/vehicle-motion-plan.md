# Vehicle heading, scale and smooth motion

Status: confirmed by the user on 22 October 2026; implemented, locally validated and documented. Release authorized. Independent finish review requested one correction, now implemented and reviewed with a ship verdict for that scored fix: keep display-refresh updates through the end of a position blend even when its ETA target has already been reached. Commit, push and live Vercel verification remain release steps.

## Confirmed decisions

1. Moving map artwork only changes from a 56×56px image box to 28×28px. Route labels, menu/detail artwork and touch targets of at least 44px retain their size.
2. Generate overhead 3D fleet sprites with a consistently defined front, preserving researched vehicle shapes and liveries. Rotate the vehicle body to its actual directed-route tangent in both 2D and pitched/rotated 3D views. Keep labels upright.
3. Reconcile small fresh-ETA corrections smoothly within approximately 1–2 seconds. Retain the current source freshness, stopped-stale and expiry rules.
4. Animate only with verified usable ETA/GPS evidence. Without it, keep routes and stops only. Do not substitute timetable/headway animation.
5. Fade out and reacquire a large corrected position instead of portraying implausibly fast travel. Retain the last valid heading while stopped and turn smoothly on departure.

Representative fleet/type artwork remains the established policy: a feed that does not identify an exact vehicle cannot establish its precise model or paintwork.

## Verified source constraints

Before this change, the renderer rotated its arrow but not its vehicle image, limited updates to at most 25fps and recreated marker elements on scene refresh. Default marker positioning could round coordinates to whole pixels. The implemented renderer addresses these constraints; they were not measurements of a specific device's frame rate.

No supported reusable public API for routine actual ETAs was verified for NS, EW, CC, TE, NE, DT, Bukit Panjang LRT, Sengkang LRT or Punggol LRT. The existing rail catalogue represents line/loop geometry rather than independently verified operational directions or physical train identities.

- [MOT, 13 January 2026](https://www.mot.gov.sg/news-resources/newsroom/proposal-to-publish-real-time-train-arrival-data-on-lta-datamall/) states that LTA does not provide real-time train arrivals online.
- [MOT, 6 October 2026](https://www.mot.gov.sg/news-resources/newsroom/publishing-real-time-lrt-arrival-data-via-public-apps-and-datamall-during-off-peak-hours-and-weekends--and-technical-limitations-on-data-release/) states there is no plan to provide real-time LRT arrivals through public apps or DataMall.
- [DataMall guide v6.10, 1 October 2026, §2.33](https://datamall.lta.gov.sg/content/dam/datamall/datasets/LTA_DataMall_API_User_Guide.pdf) limits the train GTFS trip updates to service disruptions; it is not a routine network arrival feed. Its actual payload coverage and identity fields were not verified in this investigation.
- [SMRT's app listing](https://play.google.com/store/apps/details?hl=en_US&id=sg.com.smrt.smrtconnect) advertises train arrivals. That does not establish a supported API or reuse conditions for this app; the finding is a lack of a verified reusable source, not a claim that operator apps cannot show arrivals.

Accordingly, this release cannot promise moving routine MRT/LRT trains. Their routes and stops remain available until a suitable real ETA feed is verified. Updated rail artwork can be prepared without placing unsupported vehicle positions on the map. This also applies to ferry, Sentosa Express, cable car and Skytrain positions without verified evidence.

## Implementation brief after confirmation

Preserve the existing atlas interface and route controls. Add map-only overhead sprites for the existing representative vehicle variants, with front-direction metadata, transparent backgrounds, exact generation prompts and source provenance. Keep the current artwork for menus and detail views.

Keep moving marker instances stable across feed and viewport updates. Use display-refresh animation with subpixel placement, source-time-based route progress, route-constrained corrections and screen-projected heading in tilted views. Interpolate headings along the shortest turn, retain heading while stopped, and keep route badges upright. Pause work in hidden tabs and provide the established reduced-motion alternative. Use the existing stack rather than adding an animation library.

Motion thesis: continuous travel explains the supported ETA trajectory; a brief correction explains a new estimate; a fade/reacquisition explains loss of continuity. No animation substitutes for missing evidence.

## Acceptance and delivery

- Check actual nose orientation against route tangents in opposite directions, bends, north crossing and map rotation/pitch.
- Verify 28px artwork, readable unchanged labels and at least 44px pointer/keyboard targets on desktop and mobile.
- Verify source refresh continuity, 1–2-second correction bounds, large-shift reacquisition, stale stops, expiry, hidden-tab pause and reduced motion.
- Check stable marker identity and subpixel frame progression with meaningful tests and rendered browser evidence. Measure smoothness on the test devices rather than promising universal 60fps.
- Keep unavailable rail/ferry/other positions honest; no schedule-based or demonstration vehicles ship as real estimates.
- Run lint, types, tests and production build; complete the required Impeccable review and documentation. The user's existing commit/push/Vercel deployment instruction remains the delivery destination once this brief is confirmed.

## Implemented result

- Fifteen map-only overhead sprites are registered in `src/lib/transit-sprites.ts`; three adjacent provenance manifests record researched parent artwork, exact generation prompts, native transparency, orientation and SHA-256. The built-in ImageGen tool does not expose its model version. Menu/detail artwork is preserved. The symmetric cable car records a travel axis rather than an inherent front.
- A map-lifetime renderer reuses vehicle buttons across scene and source updates, preserves focus, and uses display-refresh animation with fractional pixel placement. Artwork rotates around its route anchor using the projected route tangent. Badges remain upright.
- Small supported revisions blend along route distance in 1500ms; revisions above 80m and backward revisions that would reverse travel fade/reacquire in 320ms. New identities fade in and retired identities fade out. Inference keeps separate IDs for distinct estimates with the same arrival second.
- Hidden documents cancel animation scheduling. Reduced motion retains supported observed positions without continuous spatial animation. Stale progress and corrections freeze; expired markers are removed. No rail, ferry or other unsupported positions were added.
- The reviewed scheduling correction keeps display-refresh updates active through an unfinished fresh 1500ms blend even after its ETA has passed. The gate stops blend animation at staleness or expiry.
- `DESIGN.md` and `.impeccable/design.json` record only the confirmed marker dimensions, badge type and correction durations. The incumbent atlas palette, typography, layer rail and selector design remain the visual authority.

## Validation evidence

`npm run verify`, 32 Node tests and `npm run build` pass. Asset tests verify all 15 registered PNGs, RGBA dimensions, provenance references and SHA-256. Public assets and client bundles contain no DataMall account key.

Thirteen rendered checks passed with intercepted synthetic route/feed fixtures, covering opposite directions, three bus types, 28px artwork/56×68px targets/12px badges, stable focused DOM across refresh, projected headings at 58° pitch and 47° bearing, large-correction computed opacity, hidden pause, reduced motion, desktop/mobile geometry, stale stops and expiry. The saved browser packet records movement across 78 of 79 sampled intervals, median 16.7ms; this is a measured desktop browser sample, not a universal frame-rate guarantee. Narrow-phone panel geometry was separately confirmed at 320×568 with reachable scrolling content. Fixture data is not shipped as real transport data.

Screenshot evidence is in `.impeccable/review/`; the first narrow-phone screenshot had a compositing artifact and was replaced after the independent reviewer requested a recapture.

The near-arrival regression retains the same marker and records movement on all 50 sampled intervals after ETA, between correction ages 613ms and 1445ms. Seven valid final captures cover desktop, mobile, Traditional Chinese mobile, 320px phone, pitched vehicles, mobile vehicles and stale vehicles. The permanent review record is `.impeccable/review/vehicle-motion-review.md`; the final verdict clears the one scored scheduling fix. Live feed availability and production behavior still require release verification.
