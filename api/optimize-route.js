/* global process */
const GOOGLE_MAPS_API_KEY = process.env.GOOGLE_MAPS_API_KEY;

function parseStopMinutes(stop = {}) {
  const raw = `${stop.time || ""} ${stop.period || ""}`.trim();
  const match = raw.match(/(\d{1,2})(?::(\d{2}))?\s*(a\.?m\.?|p\.?m\.?)?/i);
  if (!match) return null;
  let hour = Number(match[1]);
  const minute = Number(match[2] || 0);
  const meridiem = match[3]?.replace(/\./g, "").toLowerCase();
  if (meridiem === "pm" && hour !== 12) hour += 12;
  if (meridiem === "am" && hour === 12) hour = 0;
  return hour * 60 + minute;
}

function mealTargetMinutes(stop = {}) {
  const text = `${stop.mealRole || ""} ${stop.category || ""} ${stop.name || ""}`.toLowerCase();
  if (/breakfast/.test(text)) return 8 * 60 + 30;
  if (/brunch/.test(text)) return 10 * 60 + 30;
  if (/lunch/.test(text)) return 12 * 60 + 30;
  if (/coffee|cafe/.test(text)) return 10 * 60;
  if (/snack|dessert|bakery|tea/.test(text)) return 15 * 60 + 30;
  if (/dinner|supper/.test(text)) return 19 * 60;
  if (/drinks|cocktail|wine|bar/.test(text)) return 21 * 60;
  return null;
}

function targetMinutes(stop = {}) {
  const minutes = mealTargetMinutes(stop) ?? parseStopMinutes(stop) ?? 16 * 60;
  return minutes < 6 * 60 ? minutes + 24 * 60 : minutes;
}

function serviceMinutes(stop = {}) {
  const explicit = Number(stop.durationMinutes);
  if (Number.isFinite(explicit) && explicit >= 15 && explicit <= 360) return explicit;
  if (mealTargetMinutes(stop) != null) return /coffee|snack|dessert/.test(`${stop.mealRole || ""} ${stop.category || ""}`.toLowerCase()) ? 40 : 75;
  return 75;
}

function parseClock(value = "") {
  const match = value.trim().match(/(\d{1,2})(?::(\d{2}))?\s*(AM|PM)?/i);
  if (!match) return null;
  let hour = Number(match[1]);
  const minute = Number(match[2] || 0);
  const period = match[3]?.toUpperCase();
  if (period === "PM" && hour !== 12) hour += 12;
  if (period === "AM" && hour === 12) hour = 0;
  return hour * 60 + minute;
}

function openingRangesForDate(stop, date) {
  const lines = Array.isArray(stop.openingHours) ? stop.openingHours : [];
  if (!lines.length || !date) return null;
  const parsedDate = new Date(`${date}T12:00:00Z`);
  if (Number.isNaN(parsedDate.getTime())) return null;
  const weekday = parsedDate.toLocaleDateString("en-US", { weekday: "long", timeZone: "UTC" }).toLowerCase();
  const line = lines.find((item) => String(item).toLowerCase().startsWith(weekday));
  if (!line) return null;
  const schedule = line.slice(line.indexOf(":") + 1).trim();
  if (/closed/i.test(schedule)) return [];
  if (/open 24 hours/i.test(schedule)) return [[0, 24 * 60]];
  return schedule.split(/,|;/).map((range) => {
    const [open, close] = range.split(/[–—-]/).map(parseClock);
    if (open == null || close == null) return null;
    return [open, close <= open ? close + 24 * 60 : close];
  }).filter(Boolean);
}

function openingPenalty(stop, arrivalMinutes, date) {
  const ranges = openingRangesForDate(stop, date);
  if (ranges == null) return 0;
  if (!ranges.length) return 8 * 60 * 60;
  const duration = serviceMinutes(stop);
  if (ranges.some(([open, close]) => arrivalMinutes >= open && arrivalMinutes + duration <= close)) return 0;
  const distanceMinutes = Math.min(...ranges.map(([open, close]) => {
    if (arrivalMinutes < open) return open - arrivalMinutes;
    if (arrivalMinutes > close) return arrivalMinutes - close;
    return Math.max(0, arrivalMinutes + duration - close);
  }));
  return 2 * 60 * 60 + distanceMinutes * 90;
}

function semanticPenalty(stop, arrivalMinutes, position, totalStops) {
  let penalty = 0;
  const mealTarget = mealTargetMinutes(stop);
  if (mealTarget != null) {
    const deviation = Math.abs(arrivalMinutes - mealTarget);
    penalty += Math.max(0, deviation - 60) * 120;
  }
  if (stop.sequenceRole === "strong_start") penalty += position * 30 * 60;
  if (stop.sequenceRole === "natural_finish") penalty += (totalStops - position - 1) * 30 * 60;
  if (stop.progressionRole === "near_source") penalty += position * 20 * 60;
  if (stop.progressionRole === "near_destination") penalty += (totalStops - position - 1) * 20 * 60;
  return penalty;
}

function transitionPenalty(from, to) {
  const fromTarget = targetMinutes(from);
  const toTarget = targetMinutes(to);
  return toTarget + 60 < fromTarget ? (fromTarget - toTarget) * 90 : 0;
}

function coordinate(stop = {}) {
  const lat = Number(stop.lat ?? stop.latitude ?? stop.location?.latitude ?? stop.location?.lat);
  const lng = Number(stop.lng ?? stop.longitude ?? stop.location?.longitude ?? stop.location?.lng);
  return Number.isFinite(lat) && Number.isFinite(lng) ? { lat, lng } : null;
}

function haversineMeters(a, b) {
  const earth = 6371000;
  const dLat = (b.lat - a.lat) * Math.PI / 180;
  const dLng = (b.lng - a.lng) * Math.PI / 180;
  const q = Math.sin(dLat / 2) ** 2 + Math.cos(a.lat * Math.PI / 180) * Math.cos(b.lat * Math.PI / 180) * Math.sin(dLng / 2) ** 2;
  return 2 * earth * Math.asin(Math.sqrt(q));
}

function fallbackMatrix(stops, transportMode) {
  const speedKph = transportMode === "Walking" ? 4.8 : transportMode === "Public transit" ? 20 : 34;
  return stops.map((from, i) => stops.map((to, j) => {
    if (i === j) return { durationSeconds: 0, distanceMeters: 0 };
    const a = coordinate(from);
    const b = coordinate(to);
    if (!a || !b) return { durationSeconds: 24 * 60 * 60, distanceMeters: 999999 };
    const distanceMeters = haversineMeters(a, b);
    return { distanceMeters, durationSeconds: Math.round((distanceMeters / 1000) / speedKph * 3600) };
  }));
}

function departureTimestamp(date, startMinutes, utcOffsetMinutes = 0) {
  const match = String(date || "").match(/^(\d{4})-(\d{2})-(\d{2})$/);
  if (!match) return new Date(Date.now() + 5 * 60 * 1000).toISOString();
  const timestamp = Date.UTC(Number(match[1]), Number(match[2]) - 1, Number(match[3]), Math.floor(startMinutes / 60), startMinutes % 60) - Number(utcOffsetMinutes || 0) * 60 * 1000;
  return new Date(Math.max(timestamp, Date.now() + 5 * 60 * 1000)).toISOString();
}

function routeWaypoint(stop) {
  if (stop.placeId) return { waypoint: { placeId: String(stop.placeId).replace(/^places\//, "") } };
  if (stop.address) return { waypoint: { address: stop.address } };
  const point = coordinate(stop);
  if (point) return { waypoint: { location: { latLng: { latitude: point.lat, longitude: point.lng } } } };
  throw new Error(`Missing location data for ${stop.name || "a selected place"}.`);
}

async function googleRouteMatrix(stops, transportMode, date, startMinutes) {
  if (!GOOGLE_MAPS_API_KEY) throw new Error("Missing GOOGLE_MAPS_API_KEY");
  const mode = transportMode === "Walking" ? "WALK" : transportMode === "Public transit" ? "TRANSIT" : "DRIVE";
  const body = {
    origins: stops.map(routeWaypoint),
    destinations: stops.map(routeWaypoint),
    travelMode: mode
  };
  if (mode !== "WALK") body.departureTime = departureTimestamp(date, startMinutes, stops[0]?.utcOffsetMinutes);
  if (mode === "DRIVE") body.routingPreference = "TRAFFIC_AWARE";

  const response = await fetch("https://routes.googleapis.com/distanceMatrix/v2:computeRouteMatrix", {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      "X-Goog-Api-Key": GOOGLE_MAPS_API_KEY,
      "X-Goog-FieldMask": "originIndex,destinationIndex,duration,distanceMeters,status,condition"
    },
    body: JSON.stringify(body)
  });
  const data = await response.json();
  if (!response.ok) throw new Error(data?.error?.message || "Routes matrix request failed.");

  const matrix = stops.map(() => stops.map(() => ({ durationSeconds: 24 * 60 * 60, distanceMeters: 999999 })));
  data.forEach((element) => {
    const durationSeconds = Number(String(element.duration || "0s").replace("s", ""));
    if (element.condition === "ROUTE_EXISTS" || element.originIndex === element.destinationIndex) {
      matrix[element.originIndex][element.destinationIndex] = {
        durationSeconds: Number.isFinite(durationSeconds) ? durationSeconds : 0,
        distanceMeters: Number(element.distanceMeters) || 0
      };
    }
  });
  return matrix;
}

function normalizeEndMinutes(startMinutes, endMinutes) {
  if (endMinutes == null) return null;
  return endMinutes <= startMinutes ? endMinutes + 24 * 60 : endMinutes;
}

function optimizeHamiltonianPath(stops, matrix, date, requestedStartMinutes, requestedEndMinutes) {
  const count = stops.length;
  const earliestSignal = Math.min(...stops.map(targetMinutes));
  const startMinutes = requestedStartMinutes ?? Math.max(6 * 60, Math.min(21 * 60, earliestSignal));
  const endMinutes = normalizeEndMinutes(startMinutes, requestedEndMinutes);
  if (count === 1) return { order: [0], totalCost: 0, travelSeconds: 0, distanceMeters: 0, startMinutes, endMinutes };
  const size = 1 << count;
  const dp = Array.from({ length: size }, () => Array(count).fill(null));

  for (let index = 0; index < count; index += 1) {
    const arrivalMinutes = startMinutes;
    dp[1 << index][index] = {
      cost: openingPenalty(stops[index], arrivalMinutes, date) + semanticPenalty(stops[index], arrivalMinutes, 0, count),
      clockMinutes: arrivalMinutes + serviceMinutes(stops[index]),
      travelSeconds: 0,
      distanceMeters: 0,
      order: [index]
    };
  }

  for (let mask = 1; mask < size; mask += 1) {
    const position = dpBitCount(mask);
    for (let last = 0; last < count; last += 1) {
      const state = dp[mask][last];
      if (!state) continue;
      for (let next = 0; next < count; next += 1) {
        if (mask & (1 << next)) continue;
        const edge = matrix[last][next];
        const arrivalMinutes = state.clockMinutes + edge.durationSeconds / 60;
        const nextCost = state.cost + edge.durationSeconds +
          openingPenalty(stops[next], arrivalMinutes, date) +
          semanticPenalty(stops[next], arrivalMinutes, position, count) +
          transitionPenalty(stops[last], stops[next]);
        const nextMask = mask | (1 << next);
        const existing = dp[nextMask][next];
        if (!existing || nextCost < existing.cost) {
          dp[nextMask][next] = {
            cost: nextCost,
            clockMinutes: arrivalMinutes + serviceMinutes(stops[next]),
            travelSeconds: state.travelSeconds + edge.durationSeconds,
            distanceMeters: state.distanceMeters + edge.distanceMeters,
            order: [...state.order, next]
          };
        }
      }
    }
  }

  const best = dp[size - 1].filter(Boolean).sort((a, b) => {
    const score = (state) => state.cost + (endMinutes == null ? 0 : Math.max(0, state.clockMinutes - endMinutes) * 180);
    return score(a) - score(b);
  })[0];
  return {
    order: best.order,
    totalCost: Math.round(best.cost + (endMinutes == null ? 0 : Math.max(0, best.clockMinutes - endMinutes) * 180)),
    travelSeconds: Math.round(best.travelSeconds),
    distanceMeters: Math.round(best.distanceMeters),
    startMinutes,
    endMinutes
  };
}

function dpBitCount(value) {
  let count = 0;
  while (value) {
    value &= value - 1;
    count += 1;
  }
  return count;
}

function summarizeFixedOrder(stops, matrix, requestedStartMinutes, requestedEndMinutes) {
  const order = stops.map((_, index) => index);
  const earliestSignal = Math.min(...stops.map(targetMinutes));
  const startMinutes = requestedStartMinutes ?? Math.max(6 * 60, Math.min(21 * 60, earliestSignal));
  const endMinutes = normalizeEndMinutes(startMinutes, requestedEndMinutes);
  let travelSeconds = 0;
  let distanceMeters = 0;
  for (let index = 1; index < order.length; index += 1) {
    const edge = matrix[order[index - 1]][order[index]];
    travelSeconds += edge.durationSeconds;
    distanceMeters += edge.distanceMeters;
  }
  return {
    order,
    totalCost: Math.round(travelSeconds),
    travelSeconds: Math.round(travelSeconds),
    distanceMeters: Math.round(distanceMeters),
    startMinutes,
    endMinutes
  };
}

export default async function handler(req, res) {
  if (req.method !== "POST") return res.status(405).json({ error: "Use POST." });
  const stops = Array.isArray(req.body?.stops) ? req.body.stops.slice(0, 10) : [];
  if (!stops.length) return res.status(400).json({ error: "Select at least one place." });

  const transportMode = req.body?.transportMode || "Car";
  const date = req.body?.date;
  const preserveOrder = Boolean(req.body?.preserveOrder);
  const requestedStartMinutes = parseClock(req.body?.startTime || "");
  const requestedEndMinutes = parseClock(req.body?.endTime || "");
  const startMinutes = requestedStartMinutes ?? Math.min(...stops.map(targetMinutes));
  let matrix;
  let matrixSource = "google-routes";
  let routeWarning = null;

  try {
    matrix = await googleRouteMatrix(stops, transportMode, date, startMinutes);
  } catch (error) {
    matrix = fallbackMatrix(stops, transportMode);
    matrixSource = "coordinate-fallback";
    routeWarning = error.message;
  }

  const optimized = preserveOrder
    ? summarizeFixedOrder(stops, matrix, requestedStartMinutes, requestedEndMinutes)
    : optimizeHamiltonianPath(stops, matrix, date, requestedStartMinutes, requestedEndMinutes);
  let clockMinutes = optimized.startMinutes;
  const orderedStops = optimized.order.map((index, position) => {
    const previousIndex = position ? optimized.order[position - 1] : null;
    const edge = previousIndex == null ? null : matrix[previousIndex][index];
    if (edge) clockMinutes += edge.durationSeconds / 60;
    const result = {
      ...stops[index],
      optimizedPosition: position + 1,
      plannedArrivalMinutes: Math.round(clockMinutes),
      routeFromPrevious: edge
        ? `${Math.max(1, Math.round(edge.durationSeconds / 60))} min by ${transportMode.toLowerCase()} · ${(edge.distanceMeters / 1000).toFixed(1)} km from previous stop`
        : ""
    };
    clockMinutes += serviceMinutes(stops[index]);
    return result;
  });

  return res.status(200).json({
    orderedStops,
    optimization: {
      algorithm: preserveOrder ? "fixed-user-order-route-legs" : "penalty-aware-held-karp-open-path",
      matrixSource,
      routeWarning,
      totalCost: optimized.totalCost,
      travelSeconds: optimized.travelSeconds,
      distanceMeters: optimized.distanceMeters,
      startMinutes: optimized.startMinutes,
      endMinutes: optimized.endMinutes,
      requestedTimeRange: {
        startTime: req.body?.startTime || null,
        endTime: req.body?.endTime || null
      },
      optimizedAt: new Date().toISOString()
    }
  });
}
