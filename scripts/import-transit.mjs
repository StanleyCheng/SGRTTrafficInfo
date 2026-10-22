/** Refresh mapped routes; this imports geometry, never vehicle positions or invented timetables. */
import fs from "node:fs/promises";
import path from "node:path";

const root = process.cwd();
const cache = path.join(root, ".cache/transit-import");
await fs.mkdir(cache, { recursive: true });
async function source(name, url, text = false) {
  const file = path.join(cache, name);
  let body;
  if (process.argv.includes("--cached")) body = await fs.readFile(file, "utf8");
  else {
    const response = await fetch(url, { signal: AbortSignal.timeout(60000) });
    if (!response.ok) throw new Error(`${name}: HTTP ${response.status}`);
    body = await response.text();
    await fs.writeFile(file, body);
  }
  return text ? body : JSON.parse(body);
}
function decode(encoded) {
  const points = []; let index = 0, lat = 0, lng = 0;
  function delta() {
    let shift = 0, result = 0, byte;
    do { if (index >= encoded.length) throw new Error("Truncated polyline"); byte = encoded.charCodeAt(index++) - 63; result |= (byte & 31) << shift; shift += 5; } while (byte >= 32);
    return result & 1 ? ~(result >> 1) : result >> 1;
  }
  while (index < encoded.length) { lat += delta(); lng += delta(); points.push([lng / 1e5, lat / 1e5]); }
  return points;
}
const [services, paths, busStops, updated, rail, south, changi, sentosa, airport] = await Promise.all([
  source("services.json", "https://data.busrouter.sg/v1/services.min.json"),
  source("paths.json", "https://data.busrouter.sg/v1/routes.min.json"),
  source("stops.json", "https://data.busrouter.sg/v1/stops.json"),
  source("updated.txt", "https://data.busrouter.sg/v1/last-updated.txt", true),
  source("rail.json", "https://raw.githubusercontent.com/cheeaun/sgraildata/master/data/v1/sg-rail.geojson"),
  source("south.json", "https://api.openstreetmap.org/api/0.6/map.json?bbox=103.825,1.215,103.855,1.272"),
  source("changi.json", "https://api.openstreetmap.org/api/0.6/map.json?bbox=103.967,1.389,103.986,1.414"),
  source("sentosa.json", "https://api.openstreetmap.org/api/0.6/map.json?bbox=103.807,1.248,103.827,1.278"),
  source("airport.json", "https://api.openstreetmap.org/api/0.6/map.json?bbox=103.977,1.345,103.996,1.37"),
]);
const routes = [], stops = new Map();
for (const [id, [lng, lat, name]] of Object.entries(busStops)) stops.set(id, { id, name, mode: "bus", position: [lng, lat] });
for (const [service, value] of Object.entries(services)) {
  for (const [index, stopIds] of value.routes.entries()) {
    const encoded = paths[service]?.[index];
    if (!encoded || stopIds.length < 2) continue;
    routes.push({ id: `bus:${service}:${index + 1}`, mode: "bus", service, name: value.name,
      destination: stops.get(stopIds.at(-1))?.name ?? value.name, direction: index + 1,
      colour: "#286453", colourSource: "display", paths: [decode(encoded)], stopIds,
      sourceUrl: "https://github.com/cheeaun/sgbusdata" });
  }
}
const lineDefinitions = [
  ["North South Line", "NS", "#d42e12"], ["East West Line", "EW", "#009645"],
  ["North East Line", "NE", "#9900aa"], ["Circle Line", "CC", "#fa9e0d"],
  ["Downtown Line", "DT", "#005ec4"], ["Thomson-East Coast Line", "TE", "#9d5b25"],
  ["Bukit Panjang LRT", "BP", "#748477"], ["Sengkang LRT (East Loop)", "SE", "#748477"],
  ["Sengkang LRT (West Loop)", "SW", "#748477"], ["Punggol LRT (East Loop)", "PE", "#748477"],
  ["Punggol LRT (West Loop)", "PW", "#748477"],
];
for (const [name, service, colour] of lineDefinitions) {
  const feature = rail.features.find((item) => item.properties.name === name && ["LineString", "MultiLineString"].includes(item.geometry.type));
  if (!feature) throw new Error(`Missing operating rail line: ${name}`);
  const stopIds = [];
  for (const item of rail.features.filter((item) => item.geometry.type === "Point" && item.properties.stop_type === "station")) {
    const codes = String(item.properties.station_codes).split(/[ ,/\-]+/);
    if (!codes.some((code) => code.startsWith(service) || (service === "EW" && code.startsWith("CG"))
      || (service.startsWith("S") && code === "STC") || (service.startsWith("P") && code === "PTC"))) continue;
    const id = `rail:${item.id}`;
    stops.set(id, { id, name: item.properties.name, mode: "train", position: item.geometry.coordinates.slice(0, 2) });
    stopIds.push(id);
  }
  routes.push({ id: `train:${service}`, mode: "train", service, name, destination: name, direction: 1,
    colour, colourSource: "official", paths: feature.geometry.type === "LineString" ? [feature.geometry.coordinates] : feature.geometry.coordinates,
    stopIds, sourceUrl: "https://github.com/cheeaun/sgraildata" });
}
const elements = new Map([...south.elements, ...changi.elements].map((element) => [`${element.type}:${element.id}`, element]));
for (const way of elements.values()) {
  if (way.type !== "way" || way.tags?.route !== "ferry" || way.tags["disused:route"] || way.tags.fixme
    || /lighthouse|batam|bengkong|harbour|sekupang|karimun|bintan|pengelih/i.test(way.tags.name ?? "")) continue;
  const points = way.nodes.map((id) => elements.get(`node:${id}`)).map((node) => node && [node.lon, node.lat]);
  if (points.length < 2 || points.some((point) => !point || point[0] < 103.4 || point[0] > 104.15 || point[1] < 1.15 || point[1] > 1.5)) continue;
  const name = way.tags.name ?? "Domestic ferry";
  const ends = name.split(/\s+(?:-|–|to)\s+/);
  const stopIds = [0, points.length - 1].map((pointIndex, i) => {
    const id = `ferry:${way.nodes[pointIndex]}`;
    stops.set(id, { id, mode: "ferry", position: points[pointIndex], name: ends[i] ?? name });
    return id;
  });
  routes.push({ id: `ferry:${way.id}`, mode: "ferry", service: "Ferry", name, destination: ends.at(-1) ?? name,
    direction: 1, colour: "#286f92", colourSource: "display", paths: [points], stopIds,
    sourceUrl: `https://www.openstreetmap.org/way/${way.id}` });
}
// Preserve the actual mapped way segments. Never bridge a gap with invented geometry.
function addRelation(data, relationId, mode, service, name, access) {
  const index = new Map(data.elements.map((item) => [`${item.type}:${item.id}`, item]));
  const relation = index.get(`relation:${relationId}`);
  if (!relation) throw new Error(`Missing mapped relation ${relationId}`);
  const paths = relation.members.filter((item) => item.type === "way" && !item.role.includes("platform")).map((item) => {
    const way = index.get(`way:${item.ref}`);
    if (!way) throw new Error(`Missing route way ${item.ref}`);
    return way.nodes.map((id) => { const node = index.get(`node:${id}`); if (!node) throw new Error(`Missing route node ${id}`); return [node.lon, node.lat]; });
  });
  const stopIds = relation.members.filter((item) => item.type === "node" && item.role.startsWith("stop")).map((item) => {
    const node = index.get(`node:${item.ref}`);
    if (!node) throw new Error(`Missing route stop ${item.ref}`);
    const id = `${mode}:${node.id}`;
    stops.set(id, { id, name: node.tags?.name ?? service, position: [node.lon, node.lat], mode });
    return id;
  });
  routes.push({ id: `${mode}:${relationId}`, mode, service, name,
    destination: relation.tags.to ?? stops.get(stopIds.at(-1))?.name ?? name, direction: relationId,
    colour: mode === "sentosa" ? "#9a3974" : "#546e7a", colourSource: "display", paths, stopIds,
    sourceUrl: `https://www.openstreetmap.org/relation/${relationId}`, ...(access ? { access } : {}) });
}
for (const id of [2353581, 9663249]) addRelation(sentosa, id, "sentosa", "Sentosa Express", "Sentosa Express");
for (const [wayId, service, name] of [[28755868, "Mount Faber", "Mount Faber Line"], [364599223, "Sentosa", "Sentosa Line"]]) {
  const index = new Map(sentosa.elements.map((item) => [`${item.type}:${item.id}`, item]));
  const way = index.get(`way:${wayId}`);
  if (!way) throw new Error(`Missing cableway ${wayId}`);
  const points = way.nodes.map((id) => index.get(`node:${id}`));
  if (points.some((node) => !node)) throw new Error(`Incomplete cableway ${wayId}`);
  const stopIds = points.filter((node) => node.tags?.aerialway === "station").map((node) => {
    const id = `cablecar:${node.id}`;
    // Operator calls the former Merlion station Sensoryscape.
    const name = node.id === 3686388538 ? "Sensoryscape" : node.id === 471491369 ? "Mount Faber" : node.tags.name;
    stops.set(id, { id, mode: "cablecar", name, position: [node.lon, node.lat] }); return id;
  });
  routes.push({ id: `cablecar:${wayId}`, mode: "cablecar", service, name, destination: name, direction: 1,
    colour: wayId === 28755868 ? "#387145" : "#b35a29", colourSource: "display", paths: [points.map((node) => [node.lon, node.lat])],
    stopIds, sourceUrl: `https://www.openstreetmap.org/way/${wayId}` });
}
// Omit the A/A-South shuttle: its mapped access labels conflict. The six
// inter-terminal connections below have separately mapped public/transit routes.
for (const [id, service, name, access] of [
  [9664403, "BC-public", "T1–T3 · B–C", "public"], [9664404, "BC-transit", "T1–T3 · B–C", "transit"],
  [9664405, "DE-public", "T1–T2 · D–E", "public"], [9664406, "DE-public", "T1–T2 · D–E", "public"],
  [9664407, "DE-public", "T1–T2 · D–E", "public"], [9664408, "DE-transit", "T1–T2 · D–E", "transit"],
  [9664409, "BE-transit", "T2–T3 · B–E", "transit"], [9664410, "BE-transit", "T2–T3 · B–E", "transit"],
  [9664416, "AF-transit", "T2–T3 · A–F", "transit"], [9664417, "AF-transit", "T2–T3 · A–F", "transit"],
]) addRelation(airport, id, "skytrain", service, name, access);

const catalogue = { generatedAt: new Date().toISOString(), sourceUpdatedAt: JSON.parse(updated),
  attribution: "Bus geometry © LTA / OneMap / OpenStreetMap, via SG Bus Data (2026-10-01). Rail geometry © LTA / Citymapper / OpenStreetMap, via SG Rail Data v5.1 (2026-07-12); mapped alignments may be simplified. Ferry routes © OpenStreetMap contributors; coverage is limited to mapped domestic services. Rail colours follow LTA line identity. Bus and ferry route colours are app display colours.",
  routes, stops: [...stops.values()] };
catalogue.attribution += " Sentosa Express, Singapore Cable Car and Changi Skytrain geometry © OpenStreetMap contributors (2026-10-22). Cable car station names checked against Mount Faber Leisure. Skytrain public/transit connections are mapped separately; follow airport signs for access. A/A-South shuttle omitted due conflicting mapped access labels. Additional-mode colours are app display colours. No live positions for these modes.";
const out = path.join(root, "public/transit");
await fs.mkdir(out, { recursive: true });
await fs.writeFile(path.join(out, "catalog.json"), JSON.stringify(catalogue));
console.log(JSON.stringify({ routes: routes.length, bus: routes.filter((route) => route.mode === "bus").length,
  train: routes.filter((route) => route.mode === "train").length, ferry: routes.filter((route) => route.mode === "ferry").length, stops: stops.size }));
