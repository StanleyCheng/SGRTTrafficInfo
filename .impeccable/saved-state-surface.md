# Reopen the same map session

Operate extension, no new visible controls or replacement visual system. The user
asked that reopening desktop or mobile retains all chosen layers, routes and map
types. Preferences are stored in versioned local browser storage on each device;
there is no account service or synchronization between devices.

Save camera, road and transit layer switches; all-on/all-off/selected route filters;
selected and focused routes and route popups; selected station/camera/road details; supported vehicle
detail snapshots within their existing expiry; basemap, 2D/3D mode, centre, zoom,
bearing and pitch; stop names and timetable opt-in; road filters and incident route;
route panel mode, search, result limit and list scroll; dock selection, open panel,
scroll and collapse; header collapse; browse search/page, transit source/station
disclosures and the source panel.
Language already uses its existing saved preference.

Hydrate after SSR before any default is written. Validate saved shapes and values,
handle denied/full/corrupt browser storage without breaking interaction, and drop
route/station identities removed from the current catalogue. Reconcile selected-only
service filters against current route groups, removing unknown and duplicate IDs
while preserving null as all-on and [] as all-off. Persist the reconciled filters so
counts and checkboxes match the map after another reload. Save completed map
gestures and page exit; remounting a basemap retains the same view. Parent hydration
and child scroll restoration must not replace the saved choice with initial defaults.

Arrival feeds are fetched again when an opened stop restores. Vehicle snapshots
retain source timestamps and the existing stale/expiry limits; an expired snapshot
is discarded and never starts fresh movement. Credentials and raw feed responses
are not saved in preferences. Fresh matching vehicle evidence refreshes the selected
detail snapshot. Reset layers and filters persists the resulting reset choices.

The map remains dominant and adapts its existing panels to the current device
width. A desktop view can reopen in the same browser at a phone width without
clipped controls. Verification covers actual reloads of mixed layer switches,
selected-only filters, a focused route, the Positron/3D camera, scroll offsets,
station reopening with a fresh request, collapsed controls and corrupt/removed IDs.
The ten recorded reload checks pass. The removed-filter correction was rechecked on
desktop and phone, with a mixed valid/removed bus filter restoring one selection and
a removed-only train filter restoring all-off with zero selections. The finish verdict
is ship; final production-build completion remains a release check.
