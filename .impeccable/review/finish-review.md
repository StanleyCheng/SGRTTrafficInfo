# Transit extension finish review

22 October 2026 — local build only. Ordinary extension of the incumbent Pastel Civic Atlas system; no new world, approved comp or design-system replacement.

## Review sequence and verdict

The independent full review covered visual persistence, fidelity and craft against the direction contract, incumbent controls and rendered desktop/phone evidence. Those dimensions passed. Its disposition was **FIX** for one material finding: during a sustained feed failure, the Options list could retain a vehicle after its position expired and the map removed its marker.

The fix adds a timer in `src/hooks/use-transit.ts` that removes expired estimates from the exposed shared state. Recaptured evidence went back to the same reviewer for a verdict on the material fix.

| Finding | Verdict | Evidence |
|---|---|---|
| Expired vehicles remained selectable in Options during feed failure | **RESOLVED** | Synthetic outage with three failed polls: one stale marker/list entry at 46 seconds; zero marker/list entries at 92 seconds; 100 route features and 1,856 stop features retained |

The reviewer found no regression in the scored scope, left no open material finding there, and returned **SHIP at the scored-fix scope**. The final verdict is a fix review following the earlier full review, not a second whole-surface review.

## Evidence considered

- `desktop.png` (1440 × 900): raised buildings, rail and incumbent header/rail.
- `mobile.png` (390 × 844), `mobile-zh.png` (440 × 844) and `user-320.png` (320 × 844): bilingual Options and narrow control layout.
- `vehicle-fixture.png` (1440 × 900): explicitly labelled synthetic ETA bus on actual mapped geometry.
- `expiry-fixture.png` (390 × 844): explicitly labelled synthetic outage over 90 seconds, expired vehicle absent, routes/stops retained.
- Completed lint/type checks, 19 unit tests, 57 existing smoke checks, 11 focused browser checks, final production build and final static export.

The synthetic fixtures verify local behavior and make no claim about credentialed upstream availability. No simulation mode was added to the application. No private DataMall key was available; live bus integration, routine train positioning, domestic ferry feeds and external backend capacity remain unverified. No deployment occurred.

The detector ran once. Its sole inline-code-underline match was a false positive; the hook check was clean. No second detector ran.

The documenter inspected all six captures and sampled source tokens/components. `DESIGN.md` and sidecars were preserved. Incumbent descriptions of twelve rail items/three header actions now differ from the extension's fifteen/four; older token-format limitations remain documented rather than repaired. Asset provenance is recorded in `public/transit/assets.json`. See [the validation record](../../doc/transit-3d-validation.md) for complete delivery scope and remaining integration work.
