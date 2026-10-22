# Plan — transit sprites + evidence-classed vehicle motion

Context (outside the prompt, for whoever picks this up): no public Singapore feed carries live
positions or ETAs for trains, ferries, the Sentosa Express, the cable car or the Changi Skytrain.
DataMall's dynamic and on-request sets cover buses, taxis, PHC, traffic, parking and ERP only;
`TrainServiceAlerts` is disruption text, not arrivals. So "realtime" is only truthful for buses.

| Mode | Real GPS/ETA evidence available | What "moving in realtime" can honestly mean |
|---|---|---|
| Bus | `v3/BusArrival` (ETA) + `Bus Location Data` (on-request, ~20 s GPS) | already working — animated from live ETA |
| Train (11 lines) | none | timetable estimate, explicitly labelled not-live |
| Ferry (3 routes) | none (AIS is commercial: MarineTraffic/Spire) | timetable estimate, labelled |
| Sentosa Express / Cable car / Skytrain | none | timetable estimate, labelled |

---

# TASK: complete the transit sprite set and add evidence-classed vehicle motion

Repo: /Users/stanley/projects/SGRTTrafficInfo (Next.js app "SGRTTrafficInfo").
Read AGENTS.md and follow it: this Next.js has breaking changes — check
node_modules/next/dist/docs/ before touching framework APIs.

## Mission
1. Create the three missing vehicle sprites and wire them in.
2. Make vehicles move on their routes for every transit mode, driven only by
   declared evidence: live ETA, live GPS, or clearly-labelled timetable estimate.
3. Never present a timetable estimate as realtime. Motion without evidence must
   stay impossible.

## Current state (verified — do not re-litigate)
- catalog: public/transit/catalog.json — 826 routes, 5422 stops, all geometry present.
  bus 798 routes / 602 services (406 services have only ONE direction upstream),
  train 11 lines, ferry 3, sentosa 2, cablecar 2, skytrain 10.
- Icons: src/lib/transit.ts:6-9 TRANSIT_ICONS references 14 sprite ids; 12 PNGs exist.
  MISSING: train-sentosa, car-cable, train-skytrain.
- Bus motion already works: DataMall v3/BusArrival -> inferBusVehicles -> animated
  markers. Verified live: 160 observations -> 128 moving vehicles, evidence "eta".
  DATAMALL_ACCOUNT_KEY is set in .env.local (gitignored). Do not print its value.
- Non-bus modes never move: use-transit.ts gates all inference on `active.bus`,
  and there is no position feed for them. i18n.ts claims that on purpose
  (transit.noTrainPosition / transit.noFerryPosition / transit.positionRule).
- scripts/transit.test.mjs already asserts "a timetable alone never animates".

## HARD RULES
- No fabricated data. Every new data source must be a real, reachable URL with a
  citation recorded next to it. If you cannot verify a feed, say so and stop that
  branch of work — do not invent one.
- No secrets in the repo, in client bundles, or in committed files. The key stays
  server-side in DATAMALL_ACCOUNT_KEY.
- Keep the licence/attribution discipline already used in catalog.json and
  public/transit/assets.json: record source, capture date and limitations.
- npm run verify and npm test must pass; node scripts/smoke.mjs must not regress.
- Prefer deleting or extending existing abstractions over adding parallel ones.

## PHASE 1 — sprites (three files, exact ids)
Generate three 256x256 RGBA PNGs, transparent background, 16 px padding,
artwork max 224 px, opaque white paint preserved, same set style as the existing
twelve. Save as:
  public/transit/train-sentosa.png
  public/transit/car-cable.png
  public/transit/train-skytrain.png
Keep the code ids exactly as they are (note: the id is `car-cable`, not `cable-car`).

Shared style preamble for each prompt:
"""
Use case: stylized-concept
Asset type: transparent PNG sprite for a Singapore public transport map; isolated single vehicle, recognisable at 40 pixels.
Style/medium: precise, polished miniature 3D product render, restrained realistic materials, clean simplified details, crisp silhouette. Orthographic isometric three-quarter view from above. Entire vehicle visible, centred, filling about 82% of a square canvas with safe padding. Every vehicle in this set must point toward the upper-right/northeast: its FRONT at upper-right, rear at lower-left. Show roof, front, and near side. Soft neutral lighting within the object only.
Scene/backdrop: genuinely transparent alpha background, empty cutout. No floor, platform, road, track, water, wake, scenery, people, drop shadow, cast shadow, title, caption, legend, border or watermark. No legible logos, route numbers or signage; retain livery colours and physical proportions. Preserve opaque white paint; only empty space is transparent.
"""

Subject prompt A (train-sentosa):
"""
Subject: one representative Sentosa Express (Singapore) monorail trainset car, matching actual photographs at https://en.wikipedia.org/wiki/Sentosa_Express . HITACHI small-type straddle-beam monorail car, 25 m two-car train, shown as ONE car. Long rounded-rectangular monorail body that STRADDLES a narrow concrete beam: no rails, no flanges, no pantograph, no catenary, no bogies visible under the floor. Wide near-black panoramic window band wrapping the upper body, flat white roof with two slim longitudinal roof ribs and a small air-conditioning hump, one wide double passenger door on the near side at each end of the car, smooth moulded nose with a large curved windscreen and a single rounded headlight cluster low on the nose. Body painted one solid bright colour — use PURPLE — with a narrow white band along the skirt and a light-grey roof; the real fleet paints each trainset a single solid colour (green, orange, blue, purple, pink, red, yellow), so keep this one flat solid purple, not multi-coloured, not a gradient, not the map line colour. Driverless, so no driver visible. NO MRT carriage proportions, no train coupling at the near end, no station platform, no beam or track under the vehicle. Front at UPPER-RIGHT, rear at LOWER-LEFT, long axis ascending left to right.
"""

Subject prompt B (car-cable):
"""
Subject: one representative Singapore Cable Car cabin on the Mount Faber Line, matching operator photographs at https://mountfaberleisure.com/attraction/skyorb-cable-car-cabin/ and https://en.wikipedia.org/wiki/Singapore_Cable_Car . Single 8-seat detachable monocable gondola cabin: rounded-corner rectangular cabin body in sparkling METALLIC BLACK with bright CHROME TRIM on all edges and around the roof lip, large wrap-around lightly-tinted glass windows on every side, thin chrome door frame with a vertical door seam at the near corner, glossy black domed roof, and a rigid polished-steel hanger arm with cable grip rising from the roof centre to the top of the frame. LED accent strip under the roof lip. IMPORTANT CAMERA: this object hangs and does not touch the ground — place the cabin body low-centre with the short hanger arm pointing straight UP, and leave the very top of the frame empty. NO cable, NO rope, NO ropeway towers, NO station, NO pylons, NO water or sea below, NO gradient sky. Do NOT draw wheels, wings, fins, boat hull, or a front/rear; a gondola cabin is symmetric, so ignore the usual upper-right front rule and keep it neutral and symmetrical. NOT a SkyOrb spherical cabin, NOT a Poké Ball, NOT a London Eye pod, NOT a bus or tram.
"""

Subject prompt C (train-skytrain):
"""
Subject: one representative Changi Airport Skytrain (Singapore) automated people mover car, Mitsubishi Crystal Mover, matching photographs at https://landtransportguru.net/train-cga/ and the MHI technical paper https://www.mhi.com/technology/review/sites/g/files/jwhtju2326/files/tr/pdf/e442/e442010.pdf . SHORT, SQUAT, wide-bodied aluminium-alloy APM car — much shorter and wider than an MRT carriage; square boxy profile with softly rounded roof corners. Base livery is a restrained SILVER-GREY body with a darker graphite-grey lower skirt and a slim BLACK window band, plus one narrow blue pinstripe running the length of the body below the window band (grey and black dominate; blue is only a thin accent). Large continuous near-black side glazing, two wide flush double passenger doors on the near side, one at each end of the car. Aerodynamic moulded front with a steeply raked windscreen, dark grey nose cap and a slim LED headlight strip; no protruding cab. Flat grey roof with two low rectangular air-conditioning pods and a slim black roof seam. Rubber-tyred automated people mover: NO rails, NO pantograph, NO overhead wire, NO locomotive nose, NO yellow or red bus colours. Plain base livery only — no promotional or character wrap, no airline logos, no text. Front at UPPER-RIGHT, rear at LOWER-LEFT, single car, long axis ascending left to right.
"""

Where the image tool cannot produce a transparent PNG, verify alpha and regenerate;
do not ship a white or matte-background image.

Acceptance for Phase 1:
- Three files exist, 256x256 RGBA, transparent corners, artwork within padding.
- Append three entries to public/transit/assets.json with the same field shape the
  existing twelve use (id, file, publicPath, label, representative, description,
  observedLivery, referenceSources[], generation{tool,model,transparentBackgroundRequested,prompt},
  format{width,height,channels,paddingPx,maxSourceCanvasPx,headingNote,artworkAxis,
  observedOrientation,visuallyDistinctFront}, validation{transparentPixelFraction,alphaMin,
  alphaMax,cornerPixelsTransparent,opaqueNearWhitePixels,visuallyInspectedOn,promptEmbedded},
  bytes, sha256). Compute bytes and sha256 from the real files; inspect each sprite on
  #fffef9 and #203b36 and record what you actually saw.
- Update the count sentence in doc/transit-3d-validation.md ("twelve shipping sprites …
  two domestic ferry types") to fifteen with the three new modes named.
- No 404s for any TRANSIT_ICONS id. Add a test that walks TRANSIT_ICONS and asserts the
  PNG exists in public/transit (scripts/transit.test.mjs), failing loudly on a future drift.

## PHASE 2 — evidence model (makes "realtime" a claim the code can enforce)
Extend src/lib/transit.ts:
- TransitVehicle.evidence becomes a union of exactly three members:
    "gps"      — provider-supplied coordinates for this vehicle
    "eta"      — derived from provider-supplied arrival prediction(s)
    "schedule" — derived from published timetable/headway only
- Give the vehicle an explicit `mode` and, where relevant, a `lineKey` so the UI can
  label and group it, and a `serviceStartedAt`/`serviceEndsAt` window.
- Add a single invariant helper (e.g. assertVehicleEvidence) that rejects a vehicle
  whose evidence class disagrees with the data it was built from, and unit-test it:
  a bus vehicle may never be built with evidence "gps" unless a provider coordinate
  was actually used.
- vehicleDistanceAt must support monotonic motion along the mapped path in EITHER
  direction (catalog rail/ferry routes carry a single direction), so add an explicit
  direction field and cover it with tests, without changing bus behaviour.

## PHASE 3 — motion per mode
- Bus: keep the existing DataMall ETA path exactly as is (it works). Do not regress
  its budget, caching, staleAt/expiresAt or identity reuse.
- Train / ferry / sentosa / cablecar / skytrain: implement SCHEDULE estimates:
  * New module src/lib/transit-schedule.ts: for each rail line (NS, EW, NE, CC, DT, TE,
    BP, SE, SW, PE, PW), each ferry connection, the Sentosa Express and both cable car
    lines, record: service window (first/last), headway or published frequency, one-way
    run time, and sourceUrl + capture date. Use operator/LTA published figures only,
    and cite each line individually. If a figure cannot be sourced, leave that line out
    of schedule estimates and log which lines are unavailable — do not guess.
  * Derive positions from those figures: a vehicle's along-route distance is a pure
    function of clock time, headway and run time, so two vehicles never collide and a
    refresh is deterministic and testable. Cap the number of simulated vehicles per
    line and reuse identities across frames.
  * Mark every such vehicle evidence: "schedule".
  * Optional but preferred: while a live disruption exists (DataMall TrainServiceAlerts
    for rail), suppress or flag scheduled vehicles on that line instead of showing
    confident-looking motion during an outage.
- Keep the whole non-bus motion behind an explicit opt-in. Default off. A single toggle
  ("estimated positions") in the transit controls enables it, and its state persists
  like the existing layer choice.

## PHASE 4 — honesty in the UI (mandatory, not cosmetic)
- Never show a scheduled vehicle with realtime styling. Markers already carry
  data-state; add data-state="scheduled" plus a visually distinct treatment
  (dashed or hollow ring, reduced opacity, and no "live" pulse), and keep the travel
  direction arrow.
- Extend the vehicle detail panel with the evidence class and the exact wording:
  gps -> "Live GPS position", eta -> "Estimated from live arrival predictions",
  schedule -> "Estimated from published timetable — NOT a live position".
- Replace the existing "no train/ferry position" notice text with wording that is true
  in both states: when estimated mode is off, keep the current static-route message;
  when it is on, state that positions are timetable estimates.
- Add the new strings to BOTH languages in src/lib/i18n.ts (en and zh), matching the
  existing tone and terminology; keep key names consistent with the current scheme.
- Update the catalogue attribution block only if you change what is claimed, and keep
  "No live positions for these modes." truthful: it stays true for the three
  additional modes.

## PHASE 5 — tests and verification
Add tests to scripts/transit.test.mjs (behaviour, not implementation):
- A timetable alone never animates an unlabelled vehicle; scheduled vehicles are always
  evidence "schedule" and are only produced when estimated mode is on.
- Scheduled motion is deterministic: same inputs -> same positions; direction reversal
  produces decreasing distance along the same path; positions stay within path length.
- Scheduled vehicles expire/refresh on their window boundaries and never leak past
  serviceEndsAt.
- Every TRANSIT_ICONS id resolves to a real file.
- Existing bus tests must still pass unchanged.
Then prove it works on the real artifact, not by reasoning:
  npm run verify && npm test
  npm run dev, then in a browser (playwright) enable each of the six modes, confirm
  routes draw, confirm markers appear and MOVE over 30 s, confirm bus markers still
  claim ETA, confirm scheduled markers say "timetable", and capture screenshots to
  .cache/screens/. Report the observed marker counts and any console/network errors.
  Confirm zero 404s for /transit/*.png in the network log.
  Also confirm no build-time secret leak: the key string must not appear anywhere in
  `npm run build:static` output in out/.

## REPORT BACK
Reply with: files changed; the exact sprite filenames and their validation numbers;
the per-line schedule table with each sourceUrl and capture date; which lines have no
sourced figures; test/verify/smoke results; marker counts observed per mode in the
browser; and an explicit list of anything still estimated rather than live.

## STOP CONDITIONS
- If a real live feed for any non-bus mode turns up, do not silently substitute it:
  document it with citations and wire it as evidence "gps" or "eta" under the opt-in.
- If timetable figures cannot be sourced for a line, leave that line static and say so.
- Never make a non-bus marker look live. If that requires changing a stated product
  rule, stop and ask.
