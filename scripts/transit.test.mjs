import test from "node:test";
import assert from "node:assert/strict";
import fs from "node:fs";
import { inferBusVehicles, parseBusObservations, parseTransitCatalog, pointAlongRoute,
  projectOnRoute, routeInView, vehicleDistanceAt } from "../src/lib/transit.ts";

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
