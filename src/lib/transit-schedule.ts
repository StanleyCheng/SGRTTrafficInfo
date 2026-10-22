import { assertVehicleEvidence, routeGroupId, routeMetrics, type TransitCatalog, type TransitMode, type TransitRoute, type TransitVehicle } from "./transit.ts";
import { routeIcon } from "./transit-sprites.ts";

/**
 * Timetable inputs for the modes that have no live vehicle feed.
 *
 * Every number below is read from an operator or LTA publication. Where a
 * publication gives a range, the estimator uses one explicit value from that
 * range and the `basis` note says so. A line is deliberately left out when the
 * run time cannot be sourced: no live or invented data is substituted.
 */
export const SCHEDULE_CAPTURED_AT = "2026-10-22";

export interface ScheduleSource {
  url: string;
  capturedAt: string;
  note?: string;
}
export interface ScheduledLine {
  routeId: string;
  label: string;
  mode: TransitMode;
  /** First and last scheduled departure, Singapore time. "24:00" means midnight. */
  serviceStart: string;
  serviceEnd: string;
  headwayMinutes: number;
  runTimeMinutes: number;
  direction: 1 | -1;
  maxVehicles: number;
  basis: string;
  sources: { service: ScheduleSource; headway: ScheduleSource; runTime: ScheduleSource };
}

const LTA_RAIL: ScheduleSource = {
  url: "https://www.lta.gov.sg/content/ltagov/en/getting_around/public_transport/rail_network.html",
  capturedAt: SCHEDULE_CAPTURED_AT,
  note: "LTA publishes 5.30am to around midnight, 2–3 minute peak and 5–7 minute off-peak rail frequency. The estimator uses 5 minutes.",
};
const SBST_TIMES: ScheduleSource = {
  url: "https://www.sbstransit.com.sg/travel-time",
  capturedAt: SCHEDULE_CAPTURED_AT,
  note: "Per-station travel-time diagrams; run times are the sum of the published segment times.",
};
const SBST_FIRST_LAST: ScheduleSource = {
  url: "https://www.sbstransit.com.sg/first-train-last-train",
  capturedAt: SCHEDULE_CAPTURED_AT,
};
const SENTOSA_EXPRESS_PAGE: ScheduleSource = {
  url: "https://www.sentosa.com.sg/en/things-to-do/attractions/sentosa-express/",
  capturedAt: SCHEDULE_CAPTURED_AT,
  note: "Operating hours 7am–12am daily.",
};
const SENTOSA_FREQUENCY: ScheduleSource = {
  url: "https://www.sentosa.com.sg/-/media/sentosa/sentosa-fun-pass/funpass-brochure/2023/jan-fun-pass_230103_v12.pdf",
  capturedAt: SCHEDULE_CAPTURED_AT,
  note: "Official Sentosa Fun Pass brochure: every 4–7 minutes. The estimator uses a 5-minute headway and the 7-minute upper bound as a single-car run time; SDC publishes no separate journey time.",
};
const CABLE_CAR_FAQ: ScheduleSource = {
  url: "https://mountfaberleisure.com/faq/",
  capturedAt: SCHEDULE_CAPTURED_AT,
  note: "Mount Faber Line 13 minutes one way (26–30 minutes round trip); Sentosa Line 12–15 minutes round trip. The estimator uses 13 and 7 minutes one way.",
};
const CABLE_CAR_HOURS: ScheduleSource = {
  url: "https://mountfaberleisure.com/attraction/singapore-cable-car/",
  capturedAt: SCHEDULE_CAPTURED_AT,
  note: "8:45am–10pm daily, last boarding 9:30pm.",
};
const CAG_TRANSFER: ScheduleSource = {
  url: "https://www.changiairport.com/en/at-changi/transport-and-directions/transferring-between-terminals-jewel.html",
  capturedAt: SCHEDULE_CAPTURED_AT,
  note: "Skytrain 5:00am–2:00am; T1–T2–T3 transfers take five to 10 minutes by Skytrain. The estimator uses the 5-minute lower bound.",
};
const MHI_SKYTRAIN: ScheduleSource = {
  url: "https://www.mhi.com/technology/review/sites/g/files/jwhtju2326/files/tr/pdf/e442/e442010.pdf",
  capturedAt: SCHEDULE_CAPTURED_AT,
  note: "Manufacturer paper: interim Changi operation ran at intervals of about 5 minutes. Current CAG pages describe only 'every few minutes'.",
};
const SMRT_CCL: ScheduleSource = {
  url: "https://journey.smrt.com.sg/journey/station_info/dhoby-ghaut/first-and-last-train/",
  capturedAt: SCHEDULE_CAPTURED_AT,
  note: "SMRT publishes the full-loop first (05:37) and last (23:56) train at Dhoby Ghaut. The 82-minute run time is derived from the published last-train sequence Bartley 23:10 to Telok Blangah 23:46, scaled over the 39 km loop.",
};
const FERRY_SCHEDULE: ScheduleSource = {
  url: "https://islandcruise.com.sg/wp-content/uploads/2025/04/SJI-Jetty-Closure-Ferry-Schedule.jpg",
  capturedAt: SCHEDULE_CAPTURED_AT,
  note: "Official departure board: Marina South Pier to Lazarus hourly 9:00am–3:00pm (50 min), Lazarus to Kusu hourly 9:50am–3:50pm (25 min).",
};

const rail = (routeId: string, label: string, serviceStart: string, serviceEnd: string, runTimeMinutes: number, maxVehicles: number): ScheduledLine => ({
  routeId, label, mode: "train", serviceStart, serviceEnd, headwayMinutes: 5, runTimeMinutes,
  direction: 1, maxVehicles, basis: "LTA network frequency (5-min estimator) and SBST published run time",
  sources: { service: SBST_FIRST_LAST, headway: LTA_RAIL, runTime: SBST_TIMES },
});

export const SCHEDULE_LINES: ScheduledLine[] = [
  rail("train:NE", "North East Line", "05:47", "23:55", 37, 6),
  rail("train:DT", "Downtown Line", "05:30", "23:40", 64, 6),
  {
    routeId: "train:CC", label: "Circle Line", mode: "train",
    serviceStart: "05:37", serviceEnd: "23:56", headwayMinutes: 5, runTimeMinutes: 82,
    direction: 1, maxVehicles: 6,
    basis: "SMRT full-loop first/last at Dhoby Ghaut; 82-min run derived from the published last-train sequence over the 39 km loop",
    sources: { service: SMRT_CCL, headway: LTA_RAIL, runTime: SMRT_CCL },
  },
  rail("train:SE", "Sengkang LRT East Loop", "05:25", "00:35", 10, 2),
  rail("train:SW", "Sengkang LRT West Loop", "05:18", "00:37", 12, 2),
  rail("train:PE", "Punggol LRT East Loop", "05:20", "00:38", 11, 2),
  rail("train:PW", "Punggol LRT West Loop", "05:18", "00:40", 11, 2),
  {
    routeId: "ferry:558921059", label: "Marina South Pier – St John's Island", mode: "ferry",
    serviceStart: "09:00", serviceEnd: "15:00", headwayMinutes: 60, runTimeMinutes: 50,
    direction: 1, maxVehicles: 2, basis: "Official hourly departure board",
    sources: { service: FERRY_SCHEDULE, headway: FERRY_SCHEDULE, runTime: FERRY_SCHEDULE },
  },
  {
    routeId: "ferry:160832374", label: "St John's Island – Kusu Island", mode: "ferry",
    serviceStart: "09:50", serviceEnd: "15:50", headwayMinutes: 60, runTimeMinutes: 25,
    direction: 1, maxVehicles: 2, basis: "Official hourly departure board",
    sources: { service: FERRY_SCHEDULE, headway: FERRY_SCHEDULE, runTime: FERRY_SCHEDULE },
  },
  {
    routeId: "sentosa:2353581", label: "Sentosa Express to Beach", mode: "sentosa",
    serviceStart: "07:00", serviceEnd: "24:00", headwayMinutes: 5, runTimeMinutes: 7,
    direction: 1, maxVehicles: 3, basis: "Official 4–7 min frequency; single-car model uses a 5-min headway and the 7-min upper bound",
    sources: { service: SENTOSA_EXPRESS_PAGE, headway: SENTOSA_FREQUENCY, runTime: SENTOSA_FREQUENCY },
  },
  {
    routeId: "sentosa:9663249", label: "Sentosa Express to VivoCity", mode: "sentosa",
    serviceStart: "07:00", serviceEnd: "24:00", headwayMinutes: 5, runTimeMinutes: 7,
    direction: 1, maxVehicles: 3, basis: "Official 4–7 min frequency; single-car model uses a 5-min headway and the 7-min upper bound",
    sources: { service: SENTOSA_EXPRESS_PAGE, headway: SENTOSA_FREQUENCY, runTime: SENTOSA_FREQUENCY },
  },
  {
    routeId: "cablecar:28755868", label: "Mount Faber Line", mode: "cablecar",
    serviceStart: "08:45", serviceEnd: "21:30", headwayMinutes: 26, runTimeMinutes: 13,
    direction: 1, maxVehicles: 2, basis: "Single-cabin round-trip model: 13 min one way, 26 min round trip",
    sources: { service: CABLE_CAR_HOURS, headway: CABLE_CAR_FAQ, runTime: CABLE_CAR_FAQ },
  },
  {
    routeId: "cablecar:364599223", label: "Sentosa Line", mode: "cablecar",
    serviceStart: "08:45", serviceEnd: "21:30", headwayMinutes: 14, runTimeMinutes: 7,
    direction: 1, maxVehicles: 2, basis: "Single-cabin round-trip model: 7 min one way, 14 min round trip",
    sources: { service: CABLE_CAR_HOURS, headway: CABLE_CAR_FAQ, runTime: CABLE_CAR_FAQ },
  },
  ...["skytrain:9664403", "skytrain:9664404", "skytrain:9664405", "skytrain:9664406", "skytrain:9664407",
    "skytrain:9664408", "skytrain:9664409", "skytrain:9664410", "skytrain:9664416", "skytrain:9664417"].map((routeId): ScheduledLine => ({
    routeId, label: "Changi Skytrain", mode: "skytrain",
    serviceStart: "05:00", serviceEnd: "02:00", headwayMinutes: 5, runTimeMinutes: 5,
    direction: 1, maxVehicles: 2, basis: "CAG 5–10 min transfer time (5-min estimator); MHI 5-min interval paper",
    sources: { service: CAG_TRANSFER, headway: MHI_SKYTRAIN, runTime: CAG_TRANSFER },
  })),
];

/** Lines that stay static because an operator/LTA run time or headway could not be sourced. */
export const SCHEDULE_UNAVAILABLE = [
  { lineKey: "train:NS", reason: "No operator-published end-to-end run time; SMRT's journey planner requires an authenticated client." },
  { lineKey: "train:EW", reason: "No operator-published end-to-end run time; SMRT's journey planner requires an authenticated client." },
  { lineKey: "train:TE", reason: "No operator-published end-to-end run time; SMRT's journey planner requires an authenticated client." },
  { lineKey: "train:BP", reason: "No operator-published end-to-end run time for the Bukit Panjang LRT." },
  { lineKey: "ferry:117595324", reason: "NParks describes an on-demand 12-passenger bumboat with no fixed headway." },
] as const;

function parseClock(value: string) {
  const [hours, minutes] = value.split(":").map(Number);
  if (!Number.isFinite(hours) || !Number.isFinite(minutes) || hours < 0 || hours > 24 || minutes < 0 || minutes > 59) {
    throw new Error(`Invalid schedule clock: ${value}`);
  }
  return hours * 60 + minutes;
}

function windowLength(start: number, end: number) {
  const difference = end - start;
  return difference > 0 ? difference : difference + 1440;
}

/** Singapore has used UTC+8 without daylight saving since 1982. */
function singaporeMinuteOfDay(now: number) {
  const local = now + 8 * 3600000;
  const day = Math.floor(local / 86400000);
  return { day, minute: (local - day * 86400000) / 60000 };
}
function fromSingaporeMinutes(minutes: number) {
  return minutes * 60000 - 8 * 3600000;
}

/**
 * Deterministic vehicles for one published line. A vehicle exists only while
 * its departure is inside the service window and it has not yet arrived, so a
 * clock refresh cannot leak motion past `serviceEndsAt`.
 */
export function scheduledVehiclesForLine(line: ScheduledLine, route: TransitRoute, now: number): TransitVehicle[] {
  const path = route.paths[0];
  if (!path) return [];
  const length = routeMetrics(path).at(-1) ?? 0;
  if (length <= 0) return [];
  const startClock = parseClock(line.serviceStart), endClock = parseClock(line.serviceEnd);
  const span = windowLength(startClock, endClock);
  const runTime = line.runTimeMinutes, headway = line.headwayMinutes;
  if (headway <= 0 || runTime <= 0) return [];
  const { day, minute } = singaporeMinuteOfDay(now);
  const nowMinute = day * 1440 + minute;
  const active: { departure: number; arrival: number }[] = [];
  for (const offset of [-1, 0]) {
    const start = (day + offset) * 1440 + startClock;
    const lastDeparture = start + span;
    const serviceEnd = lastDeparture + runTime;
    if (nowMinute < start || nowMinute > serviceEnd) continue;
    const departures = Math.floor((lastDeparture - start) / headway) + 1;
    for (let index = 0; index < departures; index++) {
      const departure = start + index * headway;
      const arrival = departure + runTime;
      if (nowMinute < departure || nowMinute >= arrival) continue;
      active.push({ departure, arrival });
    }
  }
  const selected = active.slice(-Math.max(1, line.maxVehicles));
  return selected.map(({ departure, arrival }) => {
    const fromDistance = line.direction === 1 ? 0 : length;
    const toDistance = line.direction === 1 ? length : 0;
    return assertVehicleEvidence({
      id: `${route.id}:schedule:${line.direction}:${Math.round(departure)}`,
      routeId: route.id, service: route.service, destination: route.destination,
      evidence: "schedule", mode: route.mode, lineKey: routeGroupId(route), icon: routeIcon(route),
      direction: line.direction, fromDistance, toDistance,
      observedAt: fromSingaporeMinutes(departure), arrivalAt: fromSingaporeMinutes(arrival),
      staleAt: fromSingaporeMinutes(arrival), expiresAt: fromSingaporeMinutes(arrival),
      serviceStartedAt: fromSingaporeMinutes(departure), serviceEndsAt: fromSingaporeMinutes(arrival),
    }, { coordinates: false, arrivals: false, timetable: true });
  });
}

/**
 * Scheduled estimates are opt-in. The caller passes the routes that are
 * currently enabled and visible; when estimates are off, this returns nothing.
 */
export function inferScheduledVehicles(catalog: TransitCatalog, now: number,
  routeIds: ReadonlySet<string>, enabled: boolean): TransitVehicle[] {
  if (!enabled) return [];
  const routes = new Map(catalog.routes.map((route) => [route.id, route]));
  const vehicles: TransitVehicle[] = [];
  for (const line of SCHEDULE_LINES) {
    if (!routeIds.has(line.routeId)) continue;
    const route = routes.get(line.routeId);
    if (!route || route.mode !== line.mode) continue;
    vehicles.push(...scheduledVehiclesForLine(line, route, now));
  }
  return vehicles;
}
