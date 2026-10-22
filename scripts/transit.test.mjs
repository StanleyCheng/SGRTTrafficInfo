import test from "node:test";
import assert from "node:assert/strict";
import fs from "node:fs";
import { createHash } from "node:crypto";
import { OVERHEAD_SPRITES, overheadSprite } from "../src/lib/transit-sprites.ts";
import { inferBusVehicles, parseBusObservations, parseTransitCatalog, pointAlongRoute,
  projectOnRoute, routeInView, vehicleDistanceAt, routeGroupId, filteredTransitRoutes,
  TRANSIT_DEFAULTS, TRANSIT_FILTER_DEFAULTS, sampledBusStops, routeMetrics,
  reconcileVehicleMotion, vehicleMotionAt, vehicleMotionIsAnimating, smoothHeading, screenRouteHeading, VEHICLE_CORRECTION_MS, VEHICLE_REACQUIRE_MS } from "../src/lib/transit.ts";

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

const motionVehicle = { id: "fixture", routeId: route.id, service: "42", destination: "C", evidence: "eta", icon: "bus-single-deck",
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

test("each registered overhead sprite ships transparent 256px artwork with source provenance and an intact hash", () => {
  const manifests = ["road-water-assets.json", "mrt-assets.json", "other-rail-assets.json"];
  const assets = manifests.flatMap(name => JSON.parse(fs.readFileSync(new URL(`../public/transit/overhead/${name}`, import.meta.url))).assets);
  assert.deepEqual(assets.map(a => a.id).sort(), Object.keys(OVERHEAD_SPRITES).sort());
  for (const asset of assets) {
    const sprite = overheadSprite(asset.id);
    assert.equal(sprite.path, asset.publicPath);
    const png = fs.readFileSync(new URL(`../public${sprite.path}`, import.meta.url));
    assert.equal(png.readUInt32BE(16), 256); assert.equal(png.readUInt32BE(20), 256);
    assert.equal(png[25], 6, "PNG retains RGBA transparency");
    assert.equal(createHash("sha256").update(png).digest("hex"), asset.sha256);
    assert.ok(asset.referenceSources.length > 0 && asset.referenceSources.every(source => source.url.startsWith("https://")));
    assert.ok(asset.generation.prompt.length > 100 && asset.representative);
  }
  assert.equal(overheadSprite("unsupported-fleet"), null);
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
