# 3D map and transit validation

Implementation and release record, 22 October 2026. The ten brief choices in [the approved plan](transit-3d-plan.md) are implemented. **Finish disposition: SHIP at the scored-fix scope.** The initial implementation was local; the subsequent approved release uses Vercel, as recorded below.

## Result and visual continuity

This is an ordinary extension of the existing Pastel Civic Atlas system. The map remains the main canvas, with the mint header, ivory panels, forest ink, Instrument Serif wordmark, Archivo UI, captioned scrolling rail and pinned Options/status controls. The new 2D/3D action uses the existing 44 px control treatment. Bus, Train and Ferry join the rail and start off; a fresh browser starts in 2D, and subsequent mode choices persist locally. Switching mode retains centre, zoom and enabled layers.

The keyless raised buildings add tilt and rotation; coverage and heights depend on map data. They do not claim photographic textures. Route lines, labels and direction arrows remain separate from the fixed-view vehicle artwork. Options reuses the established disclosure and vehicle details reuse the desktop card/phone sheet positions. Narrow layouts retain one header row and horizontal rail scrolling; the title may truncate at 320 px while actions remain reachable.

The documenter compared `DESIGN.md` with `src/app/globals.css`, the header, layer panel, transit Options/detail components, transit renderer and shared transit state, and visually inspected all six captures listed below. Existing palette values, 20 px panels, 12 px controls, soft forest shadow, bilingual hierarchy and minimum control targets remain consistent. Transit-specific signal/building colours extend the source stylesheet without establishing a new design world.

`DESIGN.md` and design sidecars were preserved, including unrelated pre-existing user changes. Descriptive drift is recorded here: the incumbent text describes twelve layer controls and three right-aligned header actions; the extension has fifteen layer controls and four header actions. The incumbent document also predates the current machine-readable frontmatter/sidecar format. These are documentation limitations, not authorization to rewrite the design system, and no defect was promoted into a reusable rule.

## Rendered evidence

| Capture | Viewport | Evidence inspected |
|---|---|---|
| [Desktop](../.impeccable/review/desktop.png) | 1440 × 900 | Raised CBD buildings, rail alignments/stations, retained header and scrolling rail |
| [Phone, English](../.impeccable/review/mobile.png) | 390 × 844 | Train Options, representative artwork, unavailable-position explanation and reachable controls |
| [Phone, Traditional Chinese](../.impeccable/review/mobile-zh.png) | 440 × 844 | Bilingual controls, wrapped evidence copy and the same layout hierarchy |
| [Narrow phone](../.impeccable/review/user-320.png) | 320 × 844 | One-row header, deliberate title truncation, scrolling Options and rail |
| [Vehicle fixture](../.impeccable/review/vehicle-fixture.png) | 1440 × 900 | Explicitly labelled synthetic ETA input, double-deck bus on the actual mapped route in 3D |
| [Expiry fixture](../.impeccable/review/expiry-fixture.png) | 390 × 844 | Explicitly labelled synthetic feed outage over 90 seconds, no expired vehicle in Options, routes retained |

The fixtures are local test evidence. They are not live feed captures or a shipping simulation mode. A still capture establishes presentation; the browser checks below establish motion and expiry.

## Verification completed in this implementation run

| Check | Result and scope |
|---|---|
| `npm run verify` | Lint and type checks passed |
| `npm test` | 20/20 passed: 8 existing checks, 11 transit checks and a read-only Vercel cache check covering geometry, evidence, expiry, direction, input validation and rail coverage |
| Existing browser smoke | 57/57 passed |
| Focused browser checks | 11 passed, including roughly 700 rendered CBD buildings with rail, centre/zoom/layer retention, remembered mode, 320/390/440 px layouts, bilingual controls, 44 px targets and no page overflow |
| Synthetic bus interaction | Normalized ETA input moved a double-deck bus on mapped route `bus:2:1`; map tap and accessible Options-list selection opened vehicle evidence/details |
| Sustained outage | Playwright clock and three failed polls: at 46 seconds the marker was stale and Options listed one vehicle; at 92 seconds both marker and list were empty, while 100 route features and 1,856 stop features remained |
| Static browser | `/SGRTTrafficInfo` opened fresh in 2D with transit off, offered 3D, loaded 11 train entries, retained transparent artwork and unavailable-feed messages, and issued no transit API request with no backend configured; no JavaScript errors, failed local assets or page overflow |
| Local API | Missing private key returned an empty `200` with unconfigured status and CORS `*`; invalid query returned `400` |
| Final builds | Production build and static export passed after the expiry fix; the API source directory was restored after export |

These are the completed run's verification results; the documentation pass inspected their supplied evidence and source without launching another test/build cycle.

## Finish review and resolved finding

The independent Impeccable full review passed visual persistence, fidelity and craft, but requested a fix because feed failures left expired vehicles in the Options list after the map had removed them. `use-transit.ts` now expires the exposed shared vehicle state on a timer, so the map and accessible list use the same lifetime.

The same reviewer evaluated the fix against recaptured evidence, scored the finding **RESOLVED**, found no regression in that scope and returned **SHIP**. This is a verdict on the scored fix following the earlier full review; it is not a claim that a second whole-surface review ran after the fix. The detector ran once; its sole inline-code-underline match was a false positive, and the hook check was clean. No second detector ran. See [the finish-review record](../.impeccable/review/finish-review.md).

## Geometry and artwork provenance

The imported catalogue contains 602 bus services / 798 directions, 11 rail line/loop entries across all nine operating MRT/LRT systems, and three mapped domestic ferry connections. Bus alignments come from SG Bus Data, rail alignments from SG Rail Data, and ferry connections from mapped OpenStreetMap ways. These are simplified mapped paths, not surveyed tracks or vessel logs. Unmapped ferry services are not invented as straight pier-to-pier connections. The source catalogue and [README coverage notes](../README.md) retain attribution, capture dates and coverage limitations.

All twelve shipping sprites are generated representative cutouts: three bus types, seven rail fleet/type images and two domestic ferry types. [The asset manifest](../public/transit/assets.json) records each exact ImageGen prompt, reference URLs, observed livery, representative status, PNG dimensions, SHA-256, alpha checks and orientation limitations. All are 256 × 256 RGBA with transparent corners and nonzero opaque pixels; white vehicle paint is preserved. Inspection on ivory and forest backgrounds is recorded in the manifest. The built-in ImageGen tool did not expose a model version, and no version is claimed.

The illustrations represent researched fleet/type appearance, not the actual unit serving a trip. Ferry liveries vary, especially privately managed Pulau Ubin bumboats. Fixed isometric sprites do not encode geographic heading; a separate arrow indicates travel direction. Official rail line colour or a disclosed app display colour identifies the route without repainting the vehicle body.

## Remaining live integration limits

No private DataMall key was available, so the credentialed upstream bus feed was not verified. LTA ETA/estimated-coordinate evidence is labelled as a position estimate, not raw GPS. Without compatible evidence, routes and stops remain available and no timetable-only vehicle moves. Routine live train positions and domestic ferry position-feed coverage remain unverified; those layers currently provide routes and stops.

The initial local delivery prepared the backend without provisioning a host. The user then selected Vercel for the full application because GitHub Pages cannot run its private API handlers. GitHub Pages transit positions require a separately hosted public HTTPS backend, a private `DATAMALL_ACCOUNT_KEY`, and `NEXT_PUBLIC_TRANSIT_API_BASE` in the frontend build. The implementation bounds a request to eight known stops, two upstream workers, 20-second per-stop caches and 120 upstream requests/minute per server instance. That budget is not an account-wide billing cap, and free-host capacity/limits still need verification. The full app is now deployed on Vercel; the optional Pages export retains these backend requirements.

## Vercel release

- Public production site: https://sgrttrafficinfo-stanleychengs-projects.vercel.app/
- GitHub repository homepage and README now point to Vercel. The connected `main` branch deploys automatically; the former Pages workflow now runs checks and a production build.
- Initial implementation commit `80c519c` deployed successfully with GitHub CI passing. Live desktop/390px browser checks confirmed server mode, persisted 3D selection, all fifteen controls, transit route options, unavailable-position wording, twelve successful sprite requests, no horizontal overflow, no JavaScript exceptions and no failed application requests.
- The public transit API returned `200` with honest unconfigured status and `400` for malformed input. No production private DataMall key is configured.
- Live runtime inspection exposed writes to the read-only application directory in the existing shared disk cache. The Vercel path now uses its temporary directory, with a passing test that writes/reads cache data while the application directory is read-only. Local development retains `.cache/`. Per-instance temporary storage is not durable shared storage.
- The catalogue is explicitly included in the transit function's output file trace. Vercel uses Next.js, Node 22 and the configured Singapore function region. Public access is enabled for this public map.
- The documenter wrote the evidence files before its handoff hit a usage limit; the primary agent completed the documentation check inline.

The release does not establish live train/ferry position coverage or authenticate an absent bus-feed key. The final deployment and runtime-cache checks are reported with the release result.
