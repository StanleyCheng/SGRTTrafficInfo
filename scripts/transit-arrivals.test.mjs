import test from "node:test";
import assert from "node:assert/strict";
import fs from "node:fs";
import { primaryRouteStops, routeJourney, vehicleJourney, stopArrivals, groupStopArrivals, parseTransitFeed } from "../src/lib/transit-arrivals.ts";
import { routeMetrics, inferBusVehicles } from "../src/lib/transit.ts";
import { scheduledStopArrivals, SCHEDULE_LINES } from "../src/lib/transit-schedule.ts";

const now = Date.parse("2026-10-22T12:00:00+08:00");
const path = [[103.8, 1.3], [103.81, 1.3], [103.82, 1.3]];
const stops = path.map((position, i) => ({id: `0000${i+1}`, name: ["Alpha", "Bravo", "Charlie"][i], mode: "bus", position}));
const route = {id: "bus:42:1", mode: "bus", service: "42", name: "Alpha – Charlie", destination: "Charlie", direction: 1,
  paths: [path], stopIds: stops.map(s=>s.id), colour: "#286453", colourSource: "display", sourceUrl: "https://example.com/route"};
const catalog = {generatedAt:"2026-10-22",sourceUpdatedAt:"2026-10-22",attribution:"Synthetic fixture",stops,routes:[route]};
const length = routeMetrics(path).at(-1);
const observation = {service:"42",stopId:"00003",origin:"00001",destination:"00003",arrivalAt:now+300000,
  observedAt:now,position:[103.805,1.3],monitored:true,type:"SD",visitNumber:1};

test("alphabetical rail station IDs are reordered geometrically, including reverse travel",()=>{
  const rail={...route,id:"train:fixture",mode:"train",stopIds:["00003","00001","00002"]};
  const c={...catalog,routes:[rail]};
  assert.deepEqual(primaryRouteStops(c,rail).map(s=>s.stop.name),["Alpha","Bravo","Charlie"]);
  assert.equal(routeJourney(c,rail,length*.8,-1).next.name,"Bravo");
  assert.equal(routeJourney(c,rail,length*.8,-1).terminal.name,"Alpha");
});

test("a later sampled-stop prediction is never presented as the immediate next-stop ETA",()=>{
  const [vehicle]=inferBusVehicles(catalog,[observation],[],now);
  assert.equal(vehicle.arrivalStopId,"00003");
  const journey=vehicleJourney(catalog,vehicle,now);
  assert.equal(journey.next.name,"Bravo");
  assert.equal(journey.terminal.name,"Charlie");
  assert.equal(journey.arrivalStop.name,"Charlie");
  assert.equal(journey.nextArrivalAt,undefined);
});

test("the provider ETA is available when its target really is the next stop",()=>{
  const [vehicle]=inferBusVehicles(catalog,[{...observation,stopId:"00002",arrivalAt:now+120000}],[],now);
  const journey=vehicleJourney(catalog,vehicle,now);
  assert.equal(journey.next.name,"Bravo");
  assert.equal(journey.nextArrivalAt,now+120000);
});

test("bus stop arrivals resolve destination names, retain stale records briefly and expire",()=>{
  const values=[0,60000,120000,180000].map(offset=>({...observation,arrivalAt:now+300000+offset}));
  const arrivals=stopArrivals(catalog,stops[2],values,now,false);
  assert.equal(arrivals[0].destination,"Charlie");
  assert.equal(groupStopArrivals(arrivals)[0].length,3);
  assert.equal(stopArrivals(catalog,stops[2],values,now+46000,false).length,4);
  assert.equal(stopArrivals(catalog,stops[2],values,now+90000,false).length,0);
  assert.equal(stopArrivals(catalog,stops[2],[{...observation,monitored:false}],now,false)[0].evidence,"operator");
  assert.equal(groupStopArrivals(stopArrivals(catalog,stops[2],[observation,{...observation,arrivalAt:now+600000,monitored:false}],now,false)).length,2);
});

test("bus arrivals from a previously selected stop cannot appear at another stop",()=>{
  assert.equal(stopArrivals(catalog,stops[0],[observation],now,false).length,0);
});

test("scheduled station times include future departures and both explicit directions",()=>{
  const line={routeId:route.id,serviceStart:"07:00",serviceEnd:"23:00",headwayMinutes:5,runTimeMinutes:20,direction:1,directions:[1,-1]};
  const values=scheduledStopArrivals(line,route,stops[1],Date.parse("2026-10-22T06:59:00+08:00"));
  assert.equal(values.length,6);
  assert.equal(values.filter(v=>v.direction===-1).length,3);
  assert.equal(values[0].arrivalAt,Date.parse("2026-10-22T07:10:00+08:00"));
});

test("overnight schedules respect the previous service day and next first departure",()=>{
  const line={routeId:route.id,serviceStart:"23:00",serviceEnd:"01:00",headwayMinutes:30,runTimeMinutes:20,direction:1};
  const values=scheduledStopArrivals(line,route,stops[1],Date.parse("2026-10-23T00:55:00+08:00"));
  assert.equal(values[0].arrivalAt,Date.parse("2026-10-23T01:10:00+08:00"));
  assert.equal(values[1].arrivalAt,Date.parse("2026-10-23T23:10:00+08:00"));
});

test("off-path branch stations get no primary-path timetable arrival",()=>{
  const line={routeId:route.id,serviceStart:"07:00",serviceEnd:"23:00",headwayMinutes:5,runTimeMinutes:20,direction:1};
  assert.equal(scheduledStopArrivals(line,route,{...stops[1],position:[103.81,1.32]},now).length,0);
});

test("real Circle station estimates stay opt-in and separate loop directions",()=>{
  const c=JSON.parse(fs.readFileSync("public/transit/catalog.json","utf8"));
  const r=c.routes.find(r=>r.id==="train:CC"), stop=c.stops.find(s=>s.name==="Bishan"&&s.mode==="train");
  assert.equal(stopArrivals(c,stop,[],now,false).length,0);
  const arrivals=stopArrivals(c,stop,[],now,true).filter(a=>a.route.id===r.id);
  assert.equal(arrivals.length,6);
  assert.equal(groupStopArrivals(arrivals).length,2);
  assert.equal(new Set(arrivals.map(a=>a.clockwise)).size,2);
  assert.ok(arrivals.every(a=>a.evidence==="schedule"&&a.arrivalAt>=now));
  const keppel=c.stops.find(s=>s.name==="Keppel"&&s.mode==="train");
  assert.ok(stopArrivals(c,keppel,[],now,true).every(a=>a.via!=="Keppel"));
  const branch=c.stops.find(s=>s.name==="Dhoby Ghaut"&&s.mode==="train");
  assert.equal(scheduledStopArrivals(SCHEDULE_LINES.find(l=>l.routeId===r.id),r,branch,now).length,0);
});

test("feed parsing ignores malformed observations without exposing upstream fields",()=>{
  const feed=parseTransitFeed({status:"ok",generatedAt:now,observations:[observation,{...observation,arrivalAt:"bad"}],privateDiagnostic:"secret"});
  assert.equal(feed.observations.length,1);
  assert.equal(feed.privateDiagnostic,undefined);
  assert.throws(()=>parseTransitFeed({status:"wrong",observations:[]}));
});
