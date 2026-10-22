import test from "node:test";
import assert from "node:assert/strict";
import crypto from "node:crypto";
import fs from "node:fs";
import { FLEET_SPRITES, fleetSprite, movingSprite, MOVING_SPRITE_AXES } from "../src/lib/transit-sprites.ts";
import { assertVehicleEvidence, inferBusVehicles, parseBusObservations, parseTransitCatalog, pointAlongRoute,
  projectOnRoute, routeInView, vehicleDistanceAt, routeGroupId, filteredTransitRoutes,
  TRANSIT_DEFAULTS, TRANSIT_FILTER_DEFAULTS, TRANSIT_ICONS, sampledBusStops, routeMetrics,
  reconcileVehicleMotion, vehicleMotionAt, vehicleMotionIsAnimating, reducedVehicleDistanceAt, vehicleHeadingPoints, smoothHeading, screenRouteHeading, VEHICLE_CORRECTION_MS, VEHICLE_REACQUIRE_MS } from "../src/lib/transit.ts";
import { SCHEDULE_LINES, SCHEDULE_UNAVAILABLE, inferScheduledVehicles, scheduledVehiclesForLine } from "../src/lib/transit-schedule.ts";

const now = 1000000;
const path = [[103.8, 1.3], [103.81, 1.3], [103.81, 1.31]];
const route = { id: "bus:42:1", mode: "bus", service: "42", name: "Test route", destination: "C",
  direction: 1, colour: "#286453", colourSource: "display", paths: [path], stopIds: ["00001", "00002", "00003"], sourceUrl: "https://example.com/geometry" };
const catalog = { generatedAt: "2026-10-22T00:00:00Z", sourceUpdatedAt: "2026-10-01T00:00:00Z", attribution: "Synthetic test geometry",
  routes: [route], stops: path.map((position, i) => ({ id: `0000${i + 1}`, name: String(i), mode: "bus", position })) };
const observation = { service: "42", stopId: "00002", origin: "00001", destination: "00003", observedAt: now,
  arrivalAt: now + 60000, position: [103.805, 1.3], monitored: true, type: "DD" };

test("route interpolation follows the bend instead of cutting across it", () => {
  const corner = projectOnRoute(path, path[1]).along;
  const point = pointAlongRoute(path, corner + 300).position;
  assert.equal(point[0], 103.81);
  assert.ok(point[1] > 1.3 && point[1] < 1.31);
});
test("GPS-less ETA needs a second usable prediction; a timetable alone never animates", () => {
  assert.equal(inferBusVehicles(catalog, [{ ...observation, position: null }], [], now).length, 0);
  assert.equal(inferBusVehicles(catalog, [{ ...observation, monitored: false }], [], now).length, 0);
  const observations = [{ ...observation, position: null }, { ...observation, position: null,
    stopId: "00003", arrivalAt: now + 180000 }];
  assert.equal(inferBusVehicles(catalog, observations, [], now).length, 1);
});
test("estimated coordinates are snapped to the route and do not become GPS claims", () => {
  const [vehicle] = inferBusVehicles(catalog, [observation], [], now);
  assert.equal(vehicle.evidence, "eta");
  assert.equal(vehicle.icon, "bus-double-deck");
  assert.ok(Math.abs(pointAlongRoute(path, vehicle.fromDistance).position[1] - 1.3) < 1e-8);
});
test("stale estimates stop advancing, and cached observations keep identity", () => {
  const [vehicle] = inferBusVehicles(catalog, [observation], [], now);
  assert.equal(vehicleDistanceAt(vehicle, now + 45000), vehicleDistanceAt(vehicle, now + 80000));
  const [cached] = inferBusVehicles(catalog, [observation], [vehicle], now + 10000);
  assert.equal(cached.id, vehicle.id);
  assert.equal(cached.observedAt, vehicle.observedAt);
  assert.equal(cached.expiresAt, now + 90000);
});
test("healthy empty arrivals clear vehicles, and impossible or expired evidence is rejected", () => {
  const previous = inferBusVehicles(catalog, [observation], [], now);
  assert.deepEqual(inferBusVehicles(catalog, [], previous, now), []);
  assert.equal(inferBusVehicles(catalog, [{ ...observation, position: [103.85, 1.35] }], [], now).length, 0);
  assert.equal(inferBusVehicles(catalog, [observation], [], now + 100000).length, 0);
});
test("opposite destination selects the correct direction", () => {
  const reverse = { ...route, id: "bus:42:2", direction: 2, stopIds: [...route.stopIds].reverse(), paths: [[...path].reverse()] };
  const [vehicle] = inferBusVehicles({ ...catalog, routes: [route, reverse] },
    [{ ...observation, destination: "00001", position: [103.81, 1.305] }], [], now);
  assert.equal(vehicle.routeId, reverse.id);
});
test("a repeated terminal uses VisitNumber rather than snapping back to the route start", () => {
  const loopPath = [...path, [103.8, 1.31], path[0]];
  const loop = { ...route, paths: [loopPath], stopIds: ["00001", "00002", "00003", "00001"] };
  const [vehicle] = inferBusVehicles({ ...catalog, routes: [loop] }, [{ ...observation,
    stopId: "00001", destination: "00001", visitNumber: 2, position: [103.8, 1.305], arrivalAt: now + 60000 }], [], now);
  assert.ok(vehicle.fromDistance > 3000);
});
test("duplicate stop reports do not draw the same nearby estimate twice", () => {
  const observations = [observation, { ...observation, stopId: "00003", arrivalAt: now + 180000 }];
  assert.equal(inferBusVehicles(catalog, observations, [], now).length, 1);
});
test("feed parsing validates arrivals and preserves the official monitored flag", () => {
  const input = { Services: [{ ServiceNo: "42", NextBus: { EstimatedArrival: new Date(now + 60000).toISOString(),
    OriginCode: "00001", DestinationCode: "00003", Longitude: "103.805", Latitude: "1.3", Monitored: 1, Type: "DD" } }] };
  const [parsed] = parseBusObservations(input, "00002", now);
  assert.equal(parsed.monitored, true);
  assert.deepEqual(parsed.position, observation.position);
  assert.throws(() => parseBusObservations({ Services: null }, "00002", now));
  assert.throws(() => parseTransitCatalog({ ...catalog, routes: [{ ...route, paths: [[[0, 0], [1, 1]]] }] }));
});
test("viewport filtering retains paths crossing the map without a vertex inside it", () => {
  assert.equal(routeInView(route, { west: 103.802, east: 103.804, south: 1.299, north: 1.301, zoom: 15 }), true);
});
test("service focus includes both directions outside the viewport and isolates other services", () => {
  const reverse = { ...route, id: "bus:42:2", direction: 2 };
  const other = { ...route, id: "bus:43:1", service: "43" };
  const all = { ...catalog, routes: [route, reverse, other] };
  const active = { ...TRANSIT_DEFAULTS, bus: true };
  const filters = { ...TRANSIT_FILTER_DEFAULTS, bus: [routeGroupId(route)] };
  assert.deepEqual(filteredTransitRoutes(all, active, filters, null, null).map((item) => item.id), [route.id, reverse.id]);
  assert.deepEqual(filteredTransitRoutes(all, active, TRANSIT_FILTER_DEFAULTS, "bus:42", null).map((item) => item.id), [route.id, reverse.id]);
  assert.deepEqual(filteredTransitRoutes(all, active, { ...filters, bus: [] }, null, null), []);
  assert.deepEqual(filteredTransitRoutes(all, TRANSIT_DEFAULTS, filters, null, null), []);
});
test("overview sampling stops when filters hide buses and excludes a hidden selected service", () => {
  const view = { west: 103.7, east: 103.9, south: 1.2, north: 1.4, zoom: 12 };
  assert.deepEqual(sampledBusStops(catalog, [], view, route.id), []);
  const other = { ...route, id: "bus:43:1", service: "43", stopIds: ["00004", "00005"] };
  const all = { ...catalog, routes: [route, other], stops: [...catalog.stops,
    { id: "00004", name: "D", mode: "bus", position: [103.82, 1.3] },
    { id: "00005", name: "E", mode: "bus", position: [103.83, 1.3] }] };
  assert.deepEqual(sampledBusStops(all, [other], view, route.id), ["00004", "00005"]);
});
test("ferry connections remain separately selectable and extra modes have mapped stops and access", () => {
  const actual = parseTransitCatalog(JSON.parse(fs.readFileSync(new URL("../public/transit/catalog.json", import.meta.url), "utf8")));
  const ferries = actual.routes.filter((item) => item.mode === "ferry");
  assert.equal(new Set(ferries.map(routeGroupId)).size, ferries.length);
  for (const mode of ["sentosa", "cablecar", "skytrain"]) {
    const routes = actual.routes.filter((item) => item.mode === mode);
    assert.ok(routes.length > 0);
    for (const item of routes) {
      assert.ok(item.stopIds.length >= 2);
      assert.ok(item.paths.every((line) => line.length >= 2));
      assert.ok(item.stopIds.every((id) => actual.stops.some((stop) => stop.id === id && stop.mode === mode)));
      if (mode === "skytrain") assert.ok(["public", "transit"].includes(item.access));
    }
  }
  assert.equal(actual.routes.filter((item) => item.mode === "cablecar").flatMap((item) => item.stopIds).length, 6);
});
test("shipped catalogue includes the current Circle extension and all nine rail systems", () => {
  const actual = parseTransitCatalog(JSON.parse(fs.readFileSync(new URL("../public/transit/catalog.json", import.meta.url), "utf8")));
  const cc = actual.routes.find((item) => item.service === "CC" && item.mode === "train");
  const ccStops = actual.stops.filter((stop) => cc.stopIds.includes(stop.id)).map((stop) => stop.name);
  for (const station of ["Keppel", "Cantonment", "Prince Edward Road"]) assert.ok(ccStops.includes(station));
  for (const service of ["NS", "EW", "NE", "CC", "DT", "TE", "BP", "SE", "SW", "PE", "PW"]) {
    assert.ok(actual.routes.some((item) => item.mode === "train" && item.service === service));
  }
  assert.ok(actual.routes.some((item) => item.mode === "ferry" && /Ubin/.test(item.name)));
});

const motionVehicle = { id: "fixture", routeId: route.id, service: "42", destination: "C", evidence: "eta", icon: "bus-single-deck", direction: 1,
  fromDistance: 100, toDistance: 1100, observedAt: now, arrivalAt: now + 100000, staleAt: now + 45000, expiresAt: now + 90000 };
const plainMotion = (vehicle = motionVehicle) => ({ vehicle, correction: { kind: "none" } });

test("small fresh ETA corrections start continuously and finish within 1.5 seconds", () => {
  const refreshedAt = now + 10000;
  const fresh = { ...motionVehicle, observedAt: refreshedAt, fromDistance: 230, arrivalAt: refreshedAt + 87000, staleAt: refreshedAt + 45000 };
  const reconciled = reconcileVehicleMotion(plainMotion(), fresh, refreshedAt);
  assert.equal(reconciled.correction.kind, "blend");
  assert.equal(vehicleMotionAt(reconciled, refreshedAt).distance, 200);
  const end = refreshedAt + VEHICLE_CORRECTION_MS;
  assert.equal(vehicleMotionAt(reconciled, end).distance, vehicleDistanceAt(fresh, end));
  let previous = 200;
  for (let time = refreshedAt; time <= end; time += 16) {
    const current = vehicleMotionAt(reconciled, time).distance;
    assert.ok(current >= previous, "displayed travel never reverses during correction"); previous = current;
  }
  const interruptedAt = refreshedAt + 500;
  const second = { ...fresh, fromDistance: 240, observedAt: interruptedAt };
  assert.equal(vehicleMotionAt(reconcileVehicleMotion(reconciled, second, interruptedAt), interruptedAt).distance,
    vehicleMotionAt(reconciled, interruptedAt).distance, "a second correction starts at the displayed position");
});
test("large revisions dissolve and reacquire without drawing intermediate route travel", () => {
  const refreshedAt = now + 10000;
  const fresh = { ...motionVehicle, observedAt: refreshedAt, fromDistance: 900 };
  const motion = reconcileVehicleMotion(plainMotion(), fresh, refreshedAt);
  assert.equal(motion.correction.kind, "reacquire");
  assert.equal(vehicleMotionAt(motion, refreshedAt + 60).distance, 200);
  assert.equal(vehicleMotionAt(motion, refreshedAt + VEHICLE_REACQUIRE_MS / 2).opacity, 0);
  const finish = refreshedAt + VEHICLE_REACQUIRE_MS;
  assert.equal(vehicleMotionAt(motion, finish).distance, vehicleDistanceAt(fresh, finish));
  assert.equal(vehicleMotionAt(motion, finish).opacity, 1);
});
test("a backward ETA correction that would reverse travel reacquires instead", () => {
  const refreshedAt = now + 10000;
  const fresh = { ...motionVehicle, observedAt: refreshedAt, fromDistance: 170 };
  assert.equal(reconcileVehicleMotion(plainMotion(), fresh, refreshedAt).correction.kind, "reacquire");
  const tiny = { ...fresh, fromDistance: 198 };
  const motion = reconcileVehicleMotion(plainMotion(), tiny, refreshedAt);
  assert.equal(motion.correction.kind, "blend");
  let previous = 200;
  for (let time = refreshedAt; time <= refreshedAt + VEHICLE_CORRECTION_MS; time += 16) {
    const current = vehicleMotionAt(motion, time).distance;
    assert.ok(current >= previous); previous = current;
  }
});
test("staleness freezes both correction and route progress; expiry removes visibility", () => {
  const refreshedAt = now + 10000;
  const fresh = { ...motionVehicle, observedAt: refreshedAt, fromDistance: 230, staleAt: refreshedAt + 500 };
  const motion = reconcileVehicleMotion(plainMotion(), fresh, refreshedAt);
  assert.deepEqual(vehicleMotionAt(motion, fresh.staleAt), vehicleMotionAt(motion, fresh.staleAt + 15000));
  assert.equal(vehicleMotionAt(motion, fresh.expiresAt).opacity, 0);
  assert.equal(reconcileVehicleMotion(motion, { ...fresh }, refreshedAt + 20000), motion, "cached evidence does not reset smoothing/freshness");
  assert.equal(reconcileVehicleMotion(plainMotion(), fresh, refreshedAt, true).correction.kind, "none");
});
test("headings follow screen tangents in both directions and take the shortest turn across north", () => {
  assert.equal(screenRouteHeading({ x: 1, y: 8 }, { x: 1, y: 2 }), 0);
  assert.equal(screenRouteHeading({ x: 1, y: 2 }, { x: 1, y: 8 }), 180);
  assert.equal(screenRouteHeading({ x: 1, y: 2 }, { x: 8, y: 2 }), 90);
  assert.equal(screenRouteHeading({ x: 1, y: 2 }, { x: 1, y: 2 }, 75), 75);
  assert.ok(smoothHeading(359, 1, 16) > 359 && smoothHeading(359, 1, 16) < 361);
  assert.ok(smoothHeading(721, 359, 16) < 721 && smoothHeading(721, 359, 16) > 719);
  assert.equal(smoothHeading(10, 90, 0), 10);
});
test("cached route metrics clamp endpoints and preserve the directed bend", () => {
  const metrics = routeMetrics(path);
  assert.equal(routeMetrics(path), metrics);
  assert.deepEqual(pointAlongRoute(path, -1).position, path[0]);
  assert.deepEqual(pointAlongRoute(path, Infinity).position, path.at(-1));
  const reverse = [...path].reverse();
  assert.equal(pointAlongRoute(path, 400).bearing, 90);
  assert.equal(pointAlongRoute(reverse, 400).bearing, 180);
  assert.deepEqual(pointAlongRoute([path[0], path[0]], 10).position, path[0]);
});

test("separate supported estimates with the same arrival second have distinct marker identities", () => {
  const vehicles = inferBusVehicles(catalog, [observation, { ...observation, position: [103.802, 1.3] }], [], now);
  assert.equal(vehicles.length, 2);
  assert.equal(new Set(vehicles.map(vehicle => vehicle.id)).size, 2);
});

test("every mode and bus type maps to shipped 3D fleet artwork and a calibrated moving front", () => {
  const manifest = JSON.parse(fs.readFileSync(new URL("../public/transit/assets.json", import.meta.url), "utf8"));
  const byId = new Map(manifest.assets.map((asset) => [asset.id, asset]));
  for (const icon of [...Object.values(TRANSIT_ICONS), "bus-double-deck", "bus-articulated"]) {
    const sprite = fleetSprite(icon);
    assert.ok(sprite, `no map sprite for ${icon}`);
    const file = new URL(`../public${sprite}`, import.meta.url);
    assert.ok(fs.existsSync(file), `missing ${sprite}`);
    assert.ok(byId.has(icon), `missing manifest entry for ${icon}`);
    assert.equal(byId.get(icon).file, `${icon}.png`);
  }
  assert.equal(fleetSprite("unsupported-fleet"), null);
  assert.equal(Object.keys(FLEET_SPRITES).length, 15);
  assert.equal(manifest.assets.length, 15);
  for (const asset of manifest.assets) {
    const file = fs.readFileSync(new URL(`../public/transit/${asset.file}`, import.meta.url));
    assert.equal(file.length, asset.bytes, `byte count drifted for ${asset.id}`);
    assert.equal(crypto.createHash("sha256").update(file).digest("hex"), asset.sha256, `sha256 drifted for ${asset.id}`);
    assert.equal(asset.format.width, 256);
    assert.equal(asset.format.height, 256);
    assert.equal(asset.format.channels, "RGBA");
    assert.equal(asset.validation.cornerPixelsTransparent, true);
    assert.ok(asset.validation.transparentPixelFraction > 0);
  }
});

test("display-refresh scheduling continues when a small correction outlasts the fresh ETA", () => {
  const stamp = now + 10000;
  const vehicle = { ...motionVehicle, fromDistance: 230, toDistance: 240, observedAt: stamp, arrivalAt: stamp + 500, staleAt: stamp + 45000 };
  const motion = reconcileVehicleMotion(plainMotion(), vehicle, stamp);
  assert.equal(motion.correction.kind, "blend");
  assert.equal(vehicleMotionIsAnimating(motion, stamp + 500), true);
  assert.equal(vehicleMotionIsAnimating(motion, stamp + 1499), true);
  assert.equal(vehicleMotionIsAnimating(motion, stamp + 1500), false);
  assert.equal(vehicleMotionIsAnimating(motion, vehicle.staleAt), false);
  assert.equal(vehicleMotionIsAnimating(motion, vehicle.expiresAt), false);
  assert.equal(vehicleMotionAt(motion, stamp + 1500).distance, 240);
});

const evidenceVehicle = { ...motionVehicle, mode: "bus", lineKey: "bus:42", direction: 1,
  serviceStartedAt: now, serviceEndsAt: now + 90000 };
test("evidence labels cannot outrun the data that built the vehicle", () => {
  assert.throws(() => assertVehicleEvidence({ ...evidenceVehicle, evidence: "gps" },
    { coordinates: false, arrivals: true, timetable: false }));
  assert.doesNotThrow(() => assertVehicleEvidence({ ...evidenceVehicle, evidence: "gps" },
    { coordinates: true, arrivals: false, timetable: false }));
  assert.throws(() => assertVehicleEvidence({ ...evidenceVehicle, evidence: "schedule" },
    { coordinates: false, arrivals: true, timetable: true }));
  assert.throws(() => assertVehicleEvidence({ ...evidenceVehicle, evidence: "eta" },
    { coordinates: true, arrivals: false, timetable: false }));
  assert.throws(() => assertVehicleEvidence({ ...evidenceVehicle, direction: -1 },
    { coordinates: false, arrivals: true, timetable: false }));
});
test("reverse motion follows the same path backwards without leaving it", () => {
  const reverse = { ...evidenceVehicle, mode: "train", lineKey: "train:test", direction: -1,
    fromDistance: 1100, toDistance: 100, arrivalAt: now + 40000, staleAt: now + 40000, expiresAt: now + 40000 };
  assert.equal(vehicleDistanceAt(reverse, now), 1100);
  assert.equal(vehicleDistanceAt(reverse, now + 40000), 100);
  let previous = Infinity;
  for (let time = now; time <= now + 40000; time += 1000) {
    const current = vehicleDistanceAt(reverse, time);
    assert.ok(current <= previous + 1e-9, "reverse travel is monotonic");
    assert.ok(current >= 100 && current <= 1100);
    previous = current;
  }
});
test("Circle Line produces labelled estimates inside its service window", () => {
  const actual = parseTransitCatalog(JSON.parse(fs.readFileSync(new URL("../public/transit/catalog.json", import.meta.url), "utf8")));
  const at = (hours, minutes = 0) => Date.UTC(2026, 9, 22, hours - 8, minutes);
  const cc = inferScheduledVehicles(actual, at(12), new Set(["train:CC"]), true);
  assert.ok(cc.length > 0, "Circle Line needs a visible estimate at midday");
  assert.ok(cc.every((vehicle) => vehicle.routeId === "train:CC" && vehicle.evidence === "schedule"));
  assert.equal(inferScheduledVehicles(actual, at(5), new Set(["train:CC"]), true).length, 0);
});
test("scheduled estimates are opt-in, deterministic and never labelled live", () => {
  const actual = parseTransitCatalog(JSON.parse(fs.readFileSync(new URL("../public/transit/catalog.json", import.meta.url), "utf8")));
  const at = (hours, minutes = 0) => Date.UTC(2026, 9, 22, hours - 8, minutes);
  const line = { routeId: "train:test", label: "Test", mode: "train", serviceStart: "06:00", serviceEnd: "08:00",
    headwayMinutes: 10, runTimeMinutes: 20, direction: 1, maxVehicles: 4, basis: "fixture",
    sources: { service: { url: "https://example.com", capturedAt: "2026-10-22" },
      headway: { url: "https://example.com", capturedAt: "2026-10-22" },
      runTime: { url: "https://example.com", capturedAt: "2026-10-22" } } };
  const testRoute = { ...route, id: "train:test", mode: "train", service: "TT", name: "Test line", destination: "Test line" };
  assert.equal(inferScheduledVehicles({ ...catalog, routes: [testRoute] }, at(7), new Set([testRoute.id]), false).length, 0);
  const vehicles = scheduledVehiclesForLine(line, testRoute, at(6, 25));
  assert.equal(vehicles.length, 2);
  assert.ok(vehicles.every((vehicle) => vehicle.evidence === "schedule" && vehicle.mode === "train"));
  assert.deepEqual(vehicles, scheduledVehiclesForLine(line, testRoute, at(6, 25)));
  assert.ok(vehicles.every((vehicle) => vehicle.serviceEndsAt <= at(8)));
  const length = routeMetrics(testRoute.paths[0]).at(-1);
  assert.ok(vehicles.every((vehicle) => vehicle.fromDistance >= 0 && vehicle.toDistance <= length));
  assert.equal(new Set(vehicles.map((vehicle) => vehicle.id)).size, vehicles.length);

  const reverse = scheduledVehiclesForLine({ ...line, direction: -1 }, testRoute, at(6, 5));
  assert.equal(reverse[0].direction, -1);
  assert.ok(reverse[0].fromDistance > reverse[0].toDistance);
  assert.ok(vehicleDistanceAt(reverse[0], at(6, 15)) < vehicleDistanceAt(reverse[0], at(6, 5)));

  assert.equal(scheduledVehiclesForLine(line, testRoute, at(5, 59)).length, 0);
  assert.equal(scheduledVehiclesForLine(line, testRoute, at(6, 0)).length, 1);
  assert.equal(scheduledVehiclesForLine(line, testRoute, at(8, 0)).length, 2, "the last departure still runs");
  assert.equal(scheduledVehiclesForLine(line, testRoute, at(8, 20)).length, 0, "motion never leaks past the arrival");


  const active = inferScheduledVehicles(actual, at(12),
    new Set(["train:NE", "train:DT", "ferry:558921059", "sentosa:2353581", "cablecar:28755868", "skytrain:9664403"]), true);
  assert.ok(active.length > 0);
  assert.ok(active.every((vehicle) => vehicle.evidence === "schedule"));
  for (const key of ["train:NS", "train:EW", "train:TE", "train:BP", "ferry:117595324"]) {
    assert.ok(SCHEDULE_UNAVAILABLE.some((item) => item.lineKey === key), `missing unavailable record for ${key}`);
  }
  assert.ok(SCHEDULE_LINES.some((line) => line.routeId === "train:CC"), "Circle Line must have a scheduled estimate");
  for (const scheduled of SCHEDULE_LINES) {
    const found = actual.routes.find((item) => item.id === scheduled.routeId);
    assert.ok(found, `missing route ${scheduled.routeId}`);
    assert.equal(found.mode, scheduled.mode);
    for (const source of Object.values(scheduled.sources)) {
      assert.match(source.url, /^https:\/\//);
      assert.match(source.capturedAt, /^\d{4}-\d{2}-\d{2}$/);
    }
    assert.ok(scheduled.headwayMinutes > 0 && scheduled.runTimeMinutes > 0);
  }
});

test("Circle Line keeps every active departure across its full primary loop in both directions", () => {
  const actual = parseTransitCatalog(JSON.parse(fs.readFileSync(new URL("../public/transit/catalog.json", import.meta.url))));
  const stamp = Date.UTC(2026, 9, 22, 4, 0);
  const line = SCHEDULE_LINES.find(line => line.routeId === "train:CC");
  const route = actual.routes.find(route => route.id === "train:CC");
  const vehicles = scheduledVehiclesForLine(line, route, stamp);
  const length = routeMetrics(route.paths[0]).at(-1);
  assert.equal(scheduledVehiclesForLine(line, route, stamp + 3 * 60000).length, 34, "all17 departures per direction survive at12:03");
  for (const direction of [1, -1]) {
    const stream = vehicles.filter(vehicle => vehicle.direction === direction);
    assert.equal(stream.length, 16, "all16 departures still travelling at12:00 survive; no six-marker cap");
    const quarters = new Set(stream.map(vehicle => Math.min(3, Math.floor(vehicleDistanceAt(vehicle, stamp) / length * 4))));
    assert.equal(quarters.size, 4, "all four quarters of the loop receive estimates");
  }
  assert.equal(new Set(vehicles.map(vehicle => vehicle.id)).size, vehicles.length);
  assert.ok(vehicles.every(vehicle => vehicle.evidence === "schedule"));
});
test("image-space front calibration follows directed movement, including reversed paths", () => {
  for (const icon of Object.keys(FLEET_SPRITES)) assert.ok(Number.isFinite(movingSprite(icon).frontBearingDegrees));
  assert.equal(movingSprite("unsupported"), null);
  const forward = vehicleHeadingPoints(path, 500, 1), reverse = vehicleHeadingPoints(path, 500, -1);
  assert.deepEqual(reverse, [...forward].reverse());
  const project = p => ({ x: p[0] * 100000, y: -p[1] * 100000 });
  const forwardHeading = screenRouteHeading(project(forward[0]), project(forward[1]));
  const reverseHeading = screenRouteHeading(project(reverse[0]), project(reverse[1]));
  assert.equal(Math.abs(forwardHeading - reverseHeading), 180);
});
test("small corrections preserve decreasing-distance reverse travel", () => {
  const previous = { ...motionVehicle, direction: -1, fromDistance: 1100, toDistance: 100 };
  const stamp = now + 10000, fresh = { ...previous, observedAt: stamp, fromDistance: 970, arrivalAt: stamp + 87000, staleAt: stamp + 45000 };
  const motion = reconcileVehicleMotion(plainMotion(previous), fresh, stamp);
  assert.equal(motion.correction.kind, "blend");
  assert.equal(vehicleMotionAt(motion, stamp).distance, 1000);
  assert.equal(vehicleMotionAt(motion, stamp + 1500).distance, vehicleDistanceAt(fresh, stamp + 1500));
});

test("all moving sprites have calibrated fronts and the generated Circle asset retains provenance", () => {
  for (const icon of Object.keys(FLEET_SPRITES)) {
    const sprite = movingSprite(icon), axis = MOVING_SPRITE_AXES[icon];
    assert.ok(fs.existsSync(new URL(`../public${sprite.path}`, import.meta.url)));
    assert.equal(sprite.frontBearingDegrees, Math.atan2(axis.front[0]-axis.rear[0],axis.rear[1]-axis.front[1])*180/Math.PI);
  }
  const manifest=JSON.parse(fs.readFileSync(new URL("../public/transit/moving/circle-assets.json", import.meta.url)));
  const asset=manifest.assets[0], sprite=movingSprite("train-circle");
  const png=fs.readFileSync(new URL(`../public${sprite.path}`, import.meta.url));
  assert.equal(crypto.createHash("sha256").update(png).digest("hex"),asset.sha256);
  assert.ok(Math.abs(sprite.frontBearingDegrees-asset.frontBearingDegrees)<1e-9);
  assert.ok(asset.generation.prompt.length>100&&asset.generation.promptEmbedded);
  assert.equal(png[25],6);assert.equal(png.readUInt32BE(16),256);
});

test("reduced motion retains timetable distribution instead of stacking every departure at its origin", () => {
  const actual = parseTransitCatalog(JSON.parse(fs.readFileSync(new URL("../public/transit/catalog.json", import.meta.url))));
  const stamp = Date.UTC(2026,9,22,4,3), route = actual.routes.find(route => route.id === "train:CC");
  const vehicles = inferScheduledVehicles(actual,stamp,new Set([route.id]),true);
  const length = routeMetrics(route.paths[0]).at(-1);
  assert.equal(new Set(vehicles.map(vehicle => Math.min(3,Math.floor(reducedVehicleDistanceAt(vehicle,stamp)/length*4)))).size,4);
  for (const vehicle of vehicles) assert.equal(reducedVehicleDistanceAt(vehicle,stamp),reducedVehicleDistanceAt(vehicle,stamp+7000));
  assert.equal(reducedVehicleDistanceAt(motionVehicle,now+30000),motionVehicle.fromDistance);
});
