# Station arrivals and desktop layer scrolling

Operate-mode extension of the incumbent Pastel Civic Atlas. Preserve its palette,
typography, compact dock at the existing 0.63 scale, fixed 12px bilingual captions,
44px utility targets, native map and existing route/vehicle behavior. Code-first;
no replacement world or comp.

Desktop success: trackpad and wheel gestures move the layer rail horizontally;
mouse dragging scrolls without toggling a layer. Left and right 44px buttons move
the rail by a viewport-relative distance and disable at the corresponding edge.
Touch retains its native horizontal scrolling. Reduced motion skips smooth scrolling.

Station names and dots open a nonmodal detail card (desktop) or bounded bottom
sheet (phone). Its primary facts are the next arrival clock time and countdown,
service direction, source update and last-check times. Only an opened bus stop
polls the existing credential-protected endpoint every 20 seconds; hidden tabs
pause and changed/closed stops abort. Retained provider rows become delayed at 45 seconds
and disappear at 90 seconds. LTA `Monitored=1` live predictions and `Monitored=0`
operator schedules appear in separately labelled groups. Provider schedule rows do not
depend on the local timetable opt-in and never create moving bus positions. These meanings
follow page 14 of the [LTA DataMall API guide](https://datamall.lta.gov.sg/content/dam/datamall/datasets/LTA_DataMall_API_User_Guide.pdf),
version 6.10. No unavailable live arrival is invented.

Other modes retain the existing off-by-default timetable opt-in. Supported station
times use the same published-window, uniform-headway and uniform route-distance
model, with up to three future times per direction, explicitly labelled as estimates.
Branch stops off the primary modeled path get no fabricated arrival. Timetable capture dates
remain distinct from live-source update times. Unsupported stations still show
their serving routes. Displayed clock times always use Singapore time; countdowns
round down to whole minutes as advised on page 19 of the LTA guide.

Vehicle details show direction, next stop, final station or loop service, and the
available arrival prediction with its target stop. An ETA for a later sampled stop
is never relabelled as the immediate next-stop ETA. Rail stop IDs are alphabetical;
the journey uses geometric travel order, including reverse travel. A next-stop
link opens that station. A stations disclosure in route options provides a keyboard
path to the same detail surface.

Reopening restores a valid selected station and fetches its arrivals again. A selected
vehicle snapshot retains its original source timestamp and stale/expiry limits;
expired snapshots are discarded, and newer matching evidence refreshes the detail.
The [saved-state contract](saved-state-surface.md) records the remaining browser-local settings.

First viewport: the map stays dominant. Dock arrows align with the existing utility
controls; station and vehicle detail use the established ivory detail surface,
forest text, route-colour underlines and tabular times. Long stop names wrap and
the existing bottom-sheet height bounds keep mobile close/navigation reachable.

Validation: one batched desktop/mobile browser inspection, a single correction
round if needed, meaningful arrival/order/freshness tests, type/lint/build checks,
then the fresh finish-reviewer and documentation handoffs before release.
