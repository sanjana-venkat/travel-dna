/* eslint-disable no-unused-vars, no-empty, react-refresh/only-export-components, react-hooks/exhaustive-deps */
import React, { useEffect, useMemo, useRef, useState } from "react";
import { createRoot } from "react-dom/client";
import FlightGame from "./FlightGame.jsx";
import "./styles.css";

const GOOGLE_CLIENT_ID = import.meta.env.VITE_GOOGLE_CLIENT_ID;

function getTravelArchetype(moods = []) {
  const ids = moods.map((m) => m.id);
  const has = (value) => ids.includes(value);
  if (has("romantic") && has("active") && has("nature")) return { name: "The Scenic Spark", line: "You move through places like someone who notices everything — the light, the pace, the person beside you." };
  if (has("romantic") && has("slow-easy")) return { name: "The Soft Landing", line: "You travel to feel, not to collect. Unhurried, intentional, and present in every moment." };
  if (has("romantic") && has("cultural")) return { name: "The Intimate Explorer", line: "You want beauty with substance — places that mean something, shared with someone who matters." };
  if (has("culinary") && has("cultural")) return { name: "The Local Romantic", line: "You find culture through flavor. Markets, kitchens, and hole-in-the-wall restaurants are your galleries." };
  if (has("culinary") && has("social")) return { name: "The Table Hopper", line: "For you, the best conversations happen over food. You eat where the locals eat and stay twice as long." };
  if (has("adventurous") && has("active")) return { name: "The Momentum Seeker", line: "You don't sit still. You're drawn to edges, ascents, and the quiet satisfaction of having pushed yourself." };
  if (has("adventurous") && has("nature")) return { name: "The Raw Wanderer", line: "Crowds bore you. You're after the kind of beauty that takes effort to reach — and silence when you get there." };
  if (has("nature") && has("slow-easy")) return { name: "The Quiet Wanderer", line: "You travel to exhale. Open skies, slow mornings, and nothing on a schedule you didn't write yourself." };
  if (has("social") && has("active")) return { name: "The Energy Chaser", line: "You move fast and meet people doing the same. Cities feel alive to you — and you want to be in the middle of it." };
  if (has("cultural") && has("slow-easy")) return { name: "The Considered Traveler", line: "You'd rather understand one place deeply than skim ten. Depth over distance, always." };
  if (has("night-owl") && has("adventurous")) return { name: "The Electric Nomad", line: "Plans are a starting point for you — not a constraint. You follow what feels right and rarely regret it." };
  if (has("night-owl")) return { name: "The Night Wanderer", line: "You come alive after dark. The best version of any city is the one that only exists after sunset." };
  if (has("romantic")) return { name: "The Slow Romantic", line: "You travel to feel something. Golden hour, good wine, and nowhere to be — that's the whole point." };
  if (has("adventurous")) return { name: "The Edge Seeker", line: "You measure a trip by what made your heart rate spike. Comfort is a baseline, not the goal." };
  if (has("culinary")) return { name: "The Flavor Pilgrim", line: "You plan trips around meals and discover everything else along the way. Eating well is non-negotiable." };
  if (has("social")) return { name: "The Connector", line: "You leave places with new numbers in your phone. Energy, people, and a full table — that's your version of a great trip." };
  if (has("nature")) return { name: "The Landscape Chaser", line: "You're drawn to places that make you feel small in the best way. Wild, open, and far from anything ordinary." };
  if (has("cultural")) return { name: "The Context Seeker", line: "You want the story behind the place. History, art, architecture — you travel to understand, not just to see." };
  if (has("active")) return { name: "The Kinetic Traveler", line: "You see a city best from a run or a bike. Movement is how you think, explore, and decompress." };
  if (has("slow-easy")) return { name: "The Unhurried", line: "You know that the best travel memories are almost never the rushed ones. You give places the time they deserve." };
  if (moods.length) return { name: "The Vibe-Led Traveler", line: "You know what you want today — and you're building a day around exactly that feeling." };
  return { name: "The Vibe-Led Traveler", line: "You know what you want today — and you're building a day around exactly that feeling." };
}

function priceLabel(p) {
  if (p == null) return null;
  if (typeof p === "number") return p > 0 ? "$".repeat(Math.min(4, p)) : null;
  const map = { PRICE_LEVEL_INEXPENSIVE: "$", PRICE_LEVEL_MODERATE: "$$", PRICE_LEVEL_EXPENSIVE: "$$$", PRICE_LEVEL_VERY_EXPENSIVE: "$$$$" };
  return map[p] || null;
}

function priceRange(p) {
  const label = priceLabel(p);
  const ranges = { "$": "$10–20", "$$": "$20–30", "$$$": "$50–100", "$$$$": "$100+" };
  return label ? ranges[label] : null;
}

function joinRequirements(chips = [], draft = "") {
  return [...chips, draft.trim()].filter(Boolean).join("; ");
}

// Nearest-neighbor ordering by coordinates when available
function sortByProximity(stops) {
  const coord = (s) => {
    const lat = s.lat ?? s.latitude ?? s.location?.lat ?? s.location?.latitude;
    const lng = s.lng ?? s.longitude ?? s.location?.lng ?? s.location?.longitude;
    return (lat != null && lng != null) ? { lat: +lat, lng: +lng } : null;
  };
  if (stops.filter(s => coord(s)).length < 2) return stops;
  const dist = (a, b) => {
    const dLat = (b.lat - a.lat) * Math.PI / 180, dLng = (b.lng - a.lng) * Math.PI / 180;
    const q = Math.sin(dLat / 2) ** 2 + Math.cos(a.lat * Math.PI / 180) * Math.cos(b.lat * Math.PI / 180) * Math.sin(dLng / 2) ** 2;
    return 2 * 6371 * Math.asin(Math.sqrt(q));
  };
  const remaining = [...stops];
  const ordered = [remaining.shift()];
  while (remaining.length) {
    const last = coord(ordered[ordered.length - 1]);
    if (!last) { ordered.push(remaining.shift()); continue; }
    let bestI = 0, bestD = Infinity;
    remaining.forEach((s, i) => {
      const cc = coord(s);
      const d = cc ? dist(last, cc) : Infinity;
      if (d < bestD) { bestD = d; bestI = i; }
    });
    ordered.push(remaining.splice(bestI, 1)[0]);
  }
  return ordered;
}

// Activity suggestions per mood — powers the mood-page action search bar
// Landing-page preview itineraries — one per mood, cycled with the background
const loginItins = {
  adventurous: [["07:00", "Sunrise ridge hike"], ["12:30", "Cliffside lunch"], ["16:00", "Zipline over the valley"]],
  "slow-scenic": [["09:00", "Slow lakeside morning"], ["13:00", "Picnic under the pines"], ["18:00", "Golden-hour drift"]],
  cultural: [["08:30", "Quiet temple morning"], ["12:00", "Old-town walking tour"], ["17:30", "Evening gallery hop"]],
  culinary: [["09:30", "Farmers market graze"], ["13:00", "Chef's counter lunch"], ["19:30", "Tasting menu finale"]],
  offbeat: [["10:00", "Tiny obscure museum"], ["14:00", "Secret garden detour"], ["21:00", "Hidden speakeasy"]],
  social: [["11:00", "Brunch with the crew"], ["16:00", "Night market warm-up"], ["20:00", "Rooftop golden hour"]],
  active: [["06:30", "Sunrise paddle"], ["11:00", "Coastal bike loop"], ["15:30", "Boulder & stretch"]],
  "night-owl": [["17:00", "Aperitivo hour"], ["21:00", "Live jazz basement"], ["00:30", "Midnight street food"]],
  romantic: [["10:00", "Slow café morning"], ["17:45", "Golden hour viewpoint"], ["20:30", "Candlelit dinner"]],
};

const moodActivitySuggestions = {
  adventurous: ["places with ziplining", "a guided cliff-jumping experience", "beginner-friendly paragliding", "white-water rafting with safety gear", "a memorable bungee jump"],
  "slow-scenic": ["a quiet sunset boat ride", "a lakeside cafe with a view", "a golden-hour picnic spot", "a scenic ferry crossing"],
  cultural: ["a museum worth a deep dive", "a history-focused walking tour", "a peaceful temple visit", "a local artisan market"],
  culinary: ["a street-food crawl", "a hands-on cooking class", "a food market locals love", "a chef's tasting menu"],
  offbeat: ["a hidden speakeasy", "a tiny obscure museum", "a secret garden", "an underground art venue"],
  social: ["a lively rooftop bar", "a busy night market", "a local live-music venue", "a group-friendly cooking class"],
  active: ["a beginner-friendly kayaking route", "a sunrise hike", "a guided bike tour", "a paddleboarding spot"],
  "night-owl": ["a late-night jazz bar", "a quiet stargazing spot", "a night-market crawl", "midnight rooftop views"],
  romantic: ["a sunset beach walk", "a candlelit dinner", "a quiet stargazing spot", "a golden-hour viewpoint"],
};

const universalRequirementSuggestions = [
  "budget under $60",
  "wheelchair accessible places",
  "restaurants within $10–$20",
  "avoid large crowds",
  "mostly indoor activities",
  "kid-friendly places with restrooms",
];

const DESKTOP_LOADER_PATH = "M78 516 C190 385 260 588 374 412 C475 258 554 356 626 238 C724 78 830 190 878 322 C922 444 1014 428 1122 218";
const MOBILE_LOADER_PATH = "M600 592 C510 532 690 470 600 408 C505 340 695 282 600 216 C535 170 660 120 600 72";
const DESKTOP_LOADER_NODES = [[78, 516], [374, 412], [626, 238], [878, 322], [1122, 218]];
const MOBILE_LOADER_NODES = [[600, 592], [586, 465], [600, 338], [610, 207], [600, 72]];
const DESKTOP_GAME_HURDLES = [
  { x: 260, y: 484, threshold: 24, icon: "🌿", label: "garden" },
  { x: 508, y: 326, threshold: 45, icon: "🏛️", label: "museum" },
  { x: 760, y: 188, threshold: 67, icon: "🌵", label: "cactus" },
  { x: 997, y: 384, threshold: 86, icon: "🏢", label: "building" },
];
const MOBILE_GAME_HURDLES = [
  { x: 570, y: 472, threshold: 24, icon: "🌿", label: "garden" },
  { x: 626, y: 354, threshold: 45, icon: "🏛️", label: "museum" },
  { x: 570, y: 246, threshold: 67, icon: "🌵", label: "cactus" },
  { x: 624, y: 132, threshold: 86, icon: "🏢", label: "building" },
];

const TRAVEL_GAME_STORIES = {
  runner: [
    { id: "home", label: "Escape the morning", sky: "🌤️", backdrop: "🏠  🏘️  🌳", obstacles: ["💻", "🛏️", "📱", "☕"], intro: "Alarm off. Escape the workday and start the trip!", win: "Great — you escaped work!", miss: "Your laptop won. Respawning…" },
    { id: "street", label: "Catch the connection", sky: "☀️", backdrop: "🏙️  🚦  🚉", obstacles: ["🚗", "🚶", "🐦", "🪧"], intro: "The connection is leaving. Thread through the city!", win: "Perfect timing — you caught the connection!", miss: "A commuter collision. Back on your feet…" },
    { id: "airport", label: "Airport sprint", sky: "✈️", backdrop: "🛫  🛂  🛄", obstacles: ["🧳", "🛂", "🧺", "🚧"], intro: "Final boarding. Clear security and reach the gate!", win: "Gate reached — destination unlocked!", miss: "Security sent you back. Quick respawn…" },
  ],
  car: [
    { id: "garage", label: "Garage getaway", sky: "🌤️", backdrop: "🏠  🅿️  🏢", obstacles: ["🚧", "📦", "🛒", "☕"], intro: "Keys found. Escape the garage without spilling the coffee!", win: "Clean exit — road trip started!", miss: "Tiny fender-bender. New car arriving…" },
    { id: "traffic", label: "City traffic", sky: "☀️", backdrop: "🏙️  🚦  🌉", obstacles: ["🚕", "🚲", "🕳️", "🚚"], intro: "Rush hour ahead. Jump the chaos and keep moving!", win: "You beat rush hour!", miss: "Traffic won that round. Back on the road…" },
    { id: "open-road", label: "Destination drive", sky: "🌄", backdrop: "🛣️  ⛰️  🌲", obstacles: ["🦌", "🪨", "🚜", "🧳"], intro: "Open road. Follow the landscape to your destination!", win: "Scenic route cleared — destination unlocked!", miss: "Wrong turn. Recalculating dramatically…" },
  ],
  train: [
    { id: "platform", label: "Platform dash", sky: "🚉", backdrop: "🏙️  🚆  🕰️", obstacles: ["🧳", "🚶", "🪧", "☕"], intro: "Doors are closing. Clear the platform!", win: "All aboard — perfect connection!", miss: "Missed that carriage. The next one is here…" },
    { id: "metro", label: "Metro tunnels", sky: "💡", backdrop: "🚇  🚦  🧱", obstacles: ["🚧", "🔌", "🐦", "🧰"], intro: "Signals ahead. Duck the wires and clear the tunnel!", win: "Signal green — express route unlocked!", miss: "Signal red. Resetting the train…" },
    { id: "scenic-rail", label: "Scenic rail", sky: "🌄", backdrop: "🚆  ⛰️  🌲", obstacles: ["🪨", "🌲", "🦌", "🌉"], intro: "The city is behind you. Ride into the destination landscape!", win: "Final station reached — destination unlocked!", miss: "A very theatrical derailment. Back on track…" },
  ],
};

function travelGameMode(transportMode = "") {
  if (!transportMode || transportMode === "Car") return "car";
  if (transportMode === "Public transit") return "train";
  return "runner";
}

function destinationGameTheme(destination = "") {
  const value = destination.toLowerCase();
  if (/udaipur|rajasthan/.test(value)) return { className: "udaipur", icons: "🏰  🌊  ⛰️", label: "Udaipur horizon" };
  if (/desert|sahara|dubai|abu dhabi|emirates|saudi|qatar|oman|morocco|egypt|jordan|namibia|arizona|nevada/.test(value)) return { className: "desert", icons: "🏜️  🐪  🌵", label: "desert horizon" };
  if (/beach|island|coast|seaside|hawaii|bali|maldives|caribbean|goa|sri lanka|philippines|fiji|mauritius|seychelles|miami|cancun|phuket|amalfi|santorini|ibiza|mallorca|croatia/.test(value)) return { className: "coast", icons: "🌴  🌊  ⛵", label: "coastal horizon" };
  if (/mountain|alps|himalaya|swiss|switzerland|nepal|bhutan|austria|colorado|patagonia|dolomites|andes|banff|rockies/.test(value)) return { className: "mountain", icons: "🏔️  🌲  🦅", label: "mountain horizon" };
  if (/india|italy|spain|turkey|mexico|kyoto|rome|florence|venice|prague|vienna|budapest|lisbon|porto|seville|agra|jaipur|varanasi|istanbul/.test(value)) return { className: "historic", icons: "🏛️  🏰  🕍", label: "heritage horizon" };
  if (/china|japan|korea|singapore|hong kong|new york|london|paris|tokyo|seoul|shanghai|beijing|chicago|toronto|sydney|melbourne|berlin|city/.test(value)) return { className: "city", icons: "🏙️  🏮  🚄", label: "city horizon" };
  return { className: "landscape", icons: "🌄  🌳  🏘️", label: "destination horizon" };
}

function discoveryLinksForStop(stop = {}, destination = "") {
  // Only surface a source badge when this specific stop was genuinely found
  // via that channel (set by the model as discoverySource) — not decoration
  // on every card. Most stops will have none, and that's the point: the
  // badge is a signal of real search diversity, not a stock link set.
  const source = String(stop.discoverySource || "").trim().toLowerCase();
  if (source !== "reddit" && source !== "instagram") return [];
  const subject = `${stop.name || "travel ideas"} ${destination}`.trim();
  const label = source === "reddit" ? "Reddit" : "Instagram";
  const url = source === "reddit"
    ? `https://www.google.com/search?q=${encodeURIComponent(`site:reddit.com ${subject}`)}`
    : `https://www.google.com/search?q=${encodeURIComponent(`site:instagram.com ${subject}`)}`;
  return [{ label, url }];
}

function isRestaurantStop(stop = {}) {
  return Boolean(stop.mealRole) || /restaurant|cafe|café|bar|bakery|food|dining|brunch|breakfast|lunch|dinner|drinks/i.test(
    `${stop.category || ""} ${stop.description || ""}`
  );
}

function openTableBookingUrl(stop = {}, destination = "", tripDate = "", planFor = "") {
  if (!isRestaurantStop(stop)) return null;
  if (/^https?:\/\//i.test(stop.bookingUrl || "")) return stop.bookingUrl;
  const partySize = planFor === "Solo" ? 1 : /Family|Friends|Colleagues|Kid friendly/i.test(planFor) ? 4 : 2;
  const hour = /breakfast/i.test(stop.mealRole || "") ? "09:00:00"
    : /brunch|lunch/i.test(stop.mealRole || "") ? "12:30:00"
      : /coffee|snack|dessert/i.test(stop.mealRole || "") ? "15:00:00"
        : "19:00:00";
  const params = new URLSearchParams({
    term: `${stop.googlePlaceName || stop.name || ""} ${stop.address || destination}`.trim(),
    covers: String(partySize)
  });
  if (/^\d{4}-\d{2}-\d{2}$/.test(tripDate || "")) params.set("dateTime", `${tripDate}T${hour}`);
  return `https://www.opentable.com/s?${params.toString()}`;
}

function contextualRequirementSuggestions({ query, planFor, diet, transportMode }) {
  const typed = String(query || "").trim().toLowerCase();
  if (typed.length < 2) return [];
  const foodPreference = /vegetarian|vegan|gluten|halal|kosher/i.test(diet || "") ? `${diet.toLowerCase()} ` : "";
  const walkable = transportMode === "Walking" ? "walkable " : "";
  const sharedMeal = /Colleagues|Friends|Family|Kid friendly/.test(planFor || "") ? "restaurants with shareable menus" : "small regional restaurants";
  const groups = [
    {
      aliases: ["chin", "chinese", "chinese res", "chinatown", "dim sum"],
      values: [
        `${foodPreference}Chinese restaurants with regional specialties`,
        "a Chinatown food crawl with three distinct stops",
        "dim sum with excellent vegetarian choices",
        "traditional Chinese tea houses",
        sharedMeal,
      ],
    },
    {
      aliases: ["res", "restaurant", "dinner", "lunch", "food", "eat"],
      values: [
        `${foodPreference}restaurants known for one signature dish`,
        "a memorable dinner away from the tourist crowds",
        "restaurants within $10–$20",
        `a ${walkable}neighborhood food crawl`,
        sharedMeal,
      ],
    },
    { aliases: ["temple", "temples", "shrine", "spiritual"], values: ["temples with exceptional architecture", "peaceful sunrise temple visits", "living temples known for local rituals", "lesser-known temple complexes", "temple towns worth a day trip", "temple gardens with quiet places to pause"] },
    { aliases: ["coffee", "cafe", "café"], values: ["quiet cafes with a strong local identity", `a ${walkable}specialty coffee crawl`, "coffee shops with plenty of seating", "historic cafes with excellent pastries"] },
    { aliases: ["museum", "art", "culture", "gallery"], values: ["small museums with unusual collections", `a ${walkable}independent gallery route`, "cultural places locals repeatedly recommend", "hands-on museums worth lingering in"] },
    { aliases: ["park", "outdoor", "nature", "garden", "hike"], values: ["easy outdoor activities with memorable views", "scenic parks with places to rest", `a ${walkable}garden route`, "short trails with a strong sense of place"] },
    { aliases: ["bar", "night", "drink", "music"], values: ["lively bars with a distinctive atmosphere", "live music with room for conversation", "a late-night neighborhood crawl", "low-key cocktail bars locals return to"] },
    { aliases: ["shop", "market", "souvenir"], values: ["markets known for local crafts", "independent shops and working makers", `a ${walkable}shopping street`, "food markets with regional specialties"] },
    { aliases: ["wheel", "access", "mobility"], values: ["wheelchair accessible places", "step-free restaurants and attractions", "accessible restrooms along the route"] },
    { aliases: ["budget", "cheap", "under", "$"], values: ["a full day under $60", "free or low-cost places", "restaurants within $10–$20"] },
  ];
  const matched = groups.filter((group) => group.aliases.some((alias) => alias.includes(typed) || typed.includes(alias)));
  const results = matched.flatMap((group) => group.values);
  if (!results.length && typed.length >= 4) {
    results.push(`${typed} with a distinctive local angle`, `${typed} locals recommend`, `lesser-known ${typed}`);
  }
  return [...new Set(results)].slice(0, 6);
}

function buildGoogleMapsTripUrl(stops = [], travelMode = "driving") {
  const routeStops = stops.filter((stop) => stop.googlePlaceName || stop.name || stop.photoQuery).slice(0, 10);
  const names = routeStops.map((stop) => stop.googlePlaceName || stop.name || stop.photoQuery);
  if (!names.length) return "";
  if (names.length === 1) {
    const placeId = routeStops[0].placeId;
    return `https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(names[0])}${placeId ? `&query_place_id=${encodeURIComponent(placeId)}` : ""}`;
  }
  const origin = names[0];
  const destination = names[names.length - 1];
  const waypoints = names.slice(1, -1).join("|");
  let url = `https://www.google.com/maps/dir/?api=1&origin=${encodeURIComponent(origin)}&destination=${encodeURIComponent(destination)}&travelmode=${travelMode}`;
  if (routeStops[0].placeId) url += `&origin_place_id=${encodeURIComponent(routeStops[0].placeId)}`;
  if (routeStops[routeStops.length - 1].placeId) url += `&destination_place_id=${encodeURIComponent(routeStops[routeStops.length - 1].placeId)}`;
  if (waypoints) url += `&waypoints=${encodeURIComponent(waypoints)}`;
  const waypointIds = routeStops.slice(1, -1).map((stop) => stop.placeId || "");
  if (waypointIds.length && waypointIds.every(Boolean)) url += `&waypoint_place_ids=${encodeURIComponent(waypointIds.join("|"))}`;
  return url;
}

function stablePlanFingerprint(stops, date, startTime, endTime, transportMode) {
  const identities = stops.map((stop) => stop.placeId || `${stop.name}|${stop.address || ""}`).sort();
  const input = JSON.stringify({
    identities,
    date,
    startTime: startTime || null,
    endTime: endTime || null,
    transportMode: transportMode || "Car",
    version: 3
  });
  let hash = 2166136261;
  for (let index = 0; index < input.length; index += 1) {
    hash ^= input.charCodeAt(index);
    hash = Math.imul(hash, 16777619);
  }
  return `v2-${(hash >>> 0).toString(36)}`;
}

function formatTripDuration(seconds) {
  const minutes = Math.max(0, Math.round(Number(seconds || 0) / 60));
  const hours = Math.floor(minutes / 60);
  const remainder = minutes % 60;
  return hours ? `${hours}h ${remainder ? `${remainder}m` : ""}`.trim() : `${remainder}m`;
}

function usesImperialDistance(place = "") {
  return /\b(usa|united states|u\.s\.|united kingdom|uk|england|scotland|wales|northern ireland|liberia|myanmar)\b/i.test(place)
    || /\b(london|manchester|birmingham|liverpool|leeds|glasgow|edinburgh|cardiff|belfast)\b/i.test(place)
    || /,\s*[A-Z]{2}(?:,|\s|$)/.test(place);
}

function formatTripDistance(meters, place = "") {
  const value = Number(meters || 0);
  if (usesImperialDistance(place)) {
    const miles = value / 1609.344;
    return `${miles.toFixed(miles >= 10 ? 0 : 1)} mi`;
  }
  const kilometers = value / 1000;
  return `${kilometers.toFixed(kilometers >= 10 ? 0 : 1)} km`;
}

function parseStopMinutes(stop = {}) {
  const raw = `${stop.time || ""} ${stop.period || ""}`.trim().toLowerCase();
  const match = raw.match(/(\d{1,2})(?::(\d{2}))?\s*(a\.?m\.?|p\.?m\.?)?/i);
  if (!match) return null;
  let hour = Number(match[1]);
  const minute = Number(match[2] || 0);
  const meridiem = match[3]?.replace(/\./g, "");
  if (meridiem === "pm" && hour !== 12) hour += 12;
  if (meridiem === "am" && hour === 12) hour = 0;
  return hour * 60 + minute;
}

function stopTimeRank(stop = {}) {
  const minutes = parseStopMinutes(stop);
  if (minutes != null) return minutes;
  const text = `${stop.period || ""} ${stop.category || ""} ${stop.name || ""} ${stop.description || ""}`.toLowerCase();
  if (/(sunrise|breakfast|coffee|morning)/.test(text)) return 8 * 60;
  if (/(brunch|late morning)/.test(text)) return 10 * 60;
  if (/(lunch|noon|midday)/.test(text)) return 13 * 60;
  if (/(snack|dessert|afternoon)/.test(text)) return 15 * 60;
  if (/(dinner|sunset|evening)/.test(text)) return 19 * 60;
  if (/(night|drinks|bar|club|late)/.test(text)) return 21 * 60;
  return 16 * 60;
}

function orderStopsByTime(stops = []) {
  return [...stops].sort((a, b) => stopTimeRank(a) - stopTimeRank(b));
}

function orderStopsMorningFirst(plan) {
  const stops = Array.isArray(plan?.stops) ? [...plan.stops] : [];
  return { ...plan, stops: orderStopsByTime(stops) };
}

function mealTargetMinutes(stop = {}) {
  const explicitRole = String(stop.mealRole || "").toLowerCase();
  const text = `${explicitRole} ${stop.category || ""} ${stop.name || ""} ${stop.description || ""}`.toLowerCase();
  if (/breakfast/.test(text)) return 8 * 60 + 30;
  if (/brunch/.test(text)) return 10 * 60 + 30;
  if (/lunch/.test(text)) return 12 * 60 + 30;
  if (/coffee|cafe/.test(text)) return 10 * 60;
  if (/snack|dessert|bakery|tea/.test(text)) return 15 * 60 + 30;
  if (/dinner|supper/.test(text)) return 19 * 60;
  if (/drinks|cocktail|wine|bar/.test(text)) return 21 * 60;
  return null;
}

function planStopMinutes(stop = {}) {
  return mealTargetMinutes(stop) ?? stopTimeRank(stop);
}

function arrangeStopsForPlan(stops = []) {
  const groups = new Map();
  [...stops].sort((a, b) => planStopMinutes(a) - planStopMinutes(b)).forEach((stop) => {
    const timeWindow = Math.floor(planStopMinutes(stop) / 90);
    if (!groups.has(timeWindow)) groups.set(timeWindow, []);
    groups.get(timeWindow).push(stop);
  });
  return [...groups.entries()].sort(([a], [b]) => a - b).flatMap(([, group]) => {
    const availabilityFirst = [...group].sort((a, b) => {
      const rank = (stop) =>
        (stop.businessStatus === "OPERATIONAL" ? 2 : 0) +
        (Array.isArray(stop.openingHours) && stop.openingHours.length ? 1 : 0);
      return rank(b) - rank(a);
    });
    return sortByProximity(availabilityFirst);
  });
}

function openingSummary(stop, tripDate) {
  const selectedDate = new Date(`${tripDate || getToday()}T12:00:00`);
  const day = selectedDate.toLocaleDateString("en-US", { weekday: "long" });
  const dateLabel = selectedDate.toLocaleDateString("en-US", { weekday: "long", month: "short", day: "numeric" });
  const line = Array.isArray(stop?.openingHours)
    ? stop.openingHours.find((item) => item.toLowerCase().startsWith(day.toLowerCase()))
    : null;
  if (line) {
    const hours = line.slice(line.indexOf(":") + 1).trim();
    return `${dateLabel} · ${hours}`;
  }
  return stop?.openTimingGuidance ? `${dateLabel} · ${stop.openTimingGuidance}` : null;
}

function parseClockMinutes(value = "") {
  const match = String(value).trim().match(/(\d{1,2})(?::(\d{2}))?\s*(AM|PM)/i);
  if (!match) return null;
  let hour = Number(match[1]);
  const minute = Number(match[2] || 0);
  const meridiem = match[3].toUpperCase();
  if (meridiem === "PM" && hour !== 12) hour += 12;
  if (meridiem === "AM" && hour === 12) hour = 0;
  return hour * 60 + minute;
}

function scheduledOpenStatus(stop, tripDate) {
  const selectedDate = new Date(`${tripDate || getToday()}T12:00:00`);
  const day = selectedDate.toLocaleDateString("en-US", { weekday: "long" });
  const line = Array.isArray(stop?.openingHours)
    ? stop.openingHours.find((item) => item.toLowerCase().startsWith(day.toLowerCase()))
    : null;
  if (!line) return { label: stop?.openTimingGuidance || "Confirm hours", warning: "" };
  const hours = line.slice(line.indexOf(":") + 1).trim();
  if (/open 24 hours/i.test(hours)) return { label: "Open at your visit time", warning: "" };
  if (/closed/i.test(hours)) return { label: `Closed ${day}`, warning: `${stop.name} is closed on ${day}. Choose another day or replace this stop.` };
  const visit = parseStopMinutes(stop);
  if (visit == null) return { label: hours, warning: "" };
  const ranges = [...hours.matchAll(/(\d{1,2}(?::\d{2})?\s*(?:AM|PM))\s*[–—-]\s*(\d{1,2}(?::\d{2})?\s*(?:AM|PM))/gi)]
    .map((match) => ({ start: parseClockMinutes(match[1]), end: parseClockMinutes(match[2]), endLabel: match[2], startLabel: match[1] }))
    .filter((range) => range.start != null && range.end != null);
  if (!ranges.length) return { label: hours, warning: "" };
  const active = ranges.find((range) => visit >= range.start && visit <= range.end);
  if (active) return { label: `Open until ${active.endLabel}`, warning: "" };
  const upcoming = ranges.find((range) => visit < range.start);
  if (upcoming) return { label: `Opens at ${upcoming.startLabel}`, warning: `${stop.name} is scheduled before it opens. Move it later than ${upcoming.startLabel}.` };
  const last = ranges[ranges.length - 1];
  return { label: `Closes at ${last.endLabel}`, warning: `${stop.name} closes before its scheduled visit time. Move it earlier than ${last.endLabel}.` };
}

const moodKeywords = {
  adventurous: /adventur|adrenaline|ziplin|cliff|paraglid|rafting|bungee|thrill/i,
  "slow-scenic": /slow|scenic|quiet|view|sunset|golden hour|peaceful|relax/i,
  cultural: /cultur|museum|history|architecture|gallery|temple|heritage|art/i,
  culinary: /culinary|restaurant|food|dinner|lunch|breakfast|market|cafe|café|tasting/i,
  offbeat: /offbeat|hidden|secret|quirky|unusual|underground|obscure/i,
  social: /social|group|lively|music|rooftop|night market|colleague|friends/i,
  active: /active|hike|bike|kayak|paddle|walk|sport|movement/i,
  "night-owl": /night|late|midnight|after dark|bar|jazz|club/i,
  romantic: /romantic|date|candle|intimate|sunset|golden hour/i,
};

function stopMoodMatches(stop, selected = []) {
  const text = `${stop?.category || ""} ${stop?.description || ""} ${stop?.requirementMatch || ""}`;
  return selected.filter((mood) => moodKeywords[mood.id]?.test(text)).slice(0, 2);
}

function stopPresentation(stop = {}) {
  const sentences = String(stop.description || "").match(/[^.!?]+[.!?]?/g)?.map((part) => part.trim()).filter(Boolean) || [];
  const actionable = /\b(request|ask for|bring|avoid|without|substitut|allerg|gluten|vegan|vegetarian|wheelchair|accessible|budget|under \$|reservation|parking|transit)\b/i;
  const tips = sentences.filter((sentence) => actionable.test(sentence));
  const description = concisePlaceDescription(sentences.filter((sentence) => !actionable.test(sentence)).join(" ") || String(stop.description || ""));
  const requirement = String(stop.requirementMatch || "").trim();
  const usefulRequirement = /\$|budget|gluten|vegan|vegetarian|wheel|access|request|ask|bring|avoid|near|minute|walk|reservation|crowd|indoor|outdoor|patio|transit|parking/i.test(requirement);
  const insight = [...new Set([...(usefulRequirement ? [requirement] : []), ...tips])].join(" ");
  return { description, insight };
}

function concisePlaceDescription(value = "", maxLength = 240) {
  const text = String(value).replace(/\s+/g, " ").trim();
  if (text.length <= maxLength) return text;
  const sentences = text.match(/[^.!?]+[.!?]+/g)?.map((part) => part.trim()).filter(Boolean) || [];
  const complete = [];
  for (const sentence of sentences.slice(0, 2)) {
    const candidate = [...complete, sentence].join(" ");
    if (candidate.length > maxLength) break;
    complete.push(sentence);
  }
  if (complete.length) return complete.join(" ");
  const shortened = text.slice(0, maxLength);
  const boundary = Math.max(shortened.lastIndexOf(","), shortened.lastIndexOf(";"), shortened.lastIndexOf(":"));
  if (boundary > 100) return `${shortened.slice(0, boundary).trim()}.`;
  const wordBoundary = shortened.lastIndexOf(" ");
  return `${shortened.slice(0, wordBoundary > 100 ? wordBoundary : maxLength).replace(/[,:;\s]+$/, "").trim()}.`;
}

function specialTimingNote(stop) {
  const note = stop?.specialHoursMetadata?.note || stop?.specialHoursNote;
  if (!note) return null;
  const name = stop?.specialDayName;
  return name && !note.toLowerCase().includes(String(name).toLowerCase()) ? `${name}: ${note}` : note;
}

function getToday() { return new Date().toISOString().slice(0, 10); }

function formatDateForInput(value) {
  const match = /^(\d{4})-(\d{2})-(\d{2})$/.exec(value || "");
  return match ? `${match[2]}/${match[3]}/${match[1]}` : "";
}

function formatDateDraft(value) {
  const digits = String(value || "").replace(/\D/g, "").slice(0, 8);
  if (digits.length <= 2) return digits;
  if (digits.length <= 4) return `${digits.slice(0, 2)}/${digits.slice(2)}`;
  return `${digits.slice(0, 2)}/${digits.slice(2, 4)}/${digits.slice(4)}`;
}

function parseDateInput(value) {
  const match = /^(\d{2})\/(\d{2})\/(\d{4})$/.exec(value || "");
  if (!match) return null;
  const [, month, day, year] = match;
  const candidate = new Date(`${year}-${month}-${day}T12:00:00`);
  if (
    Number.isNaN(candidate.getTime())
    || candidate.getFullYear() !== Number(year)
    || candidate.getMonth() + 1 !== Number(month)
    || candidate.getDate() !== Number(day)
  ) return null;
  return `${year}-${month}-${day}`;
}

function prettyDate(value) {
  if (!value) return "Today";
  const date = new Date(`${value}T12:00:00`);
  return date.toLocaleDateString(undefined, { weekday: "short", month: "short", day: "numeric", year: "numeric" });
}

const moodVibes = [
  {
    id: "adventurous",
    title: "Adventurous",
    tag: "Ziplines, cliff jumps, paragliding",
    signal: "high-adrenaline experiences only — ziplines, cliff jumps, paragliding, bungee, white-water rafting, via ferrata, skydiving, anything with a safety briefing or waiver. Avoid gentle walks or casual hikes. The user wants their heart rate elevated and a story to tell.",
    icon: "△",
    img: "https://images.pexels.com/photos/6454835/pexels-photo-6454835.jpeg?auto=compress&cs=tinysrgb&w=1400"
  },
  {
    id: "slow-scenic",
    title: "Slow & scenic",
    tag: "Boat rides, cafes, golden hour",
    signal: "slow-paced activities in beautiful natural or semi-natural settings — boat rides, lakeside cafes, scenic viewpoints at golden hour, waterfront walks, picnics, a ferry across a bay, a quiet garden, watching the world from a hilltop. Minimal transit. Maximum stillness. Nothing rushed, nothing loud.",
    icon: "〰",
    img: "https://images.pexels.com/photos/5366283/pexels-photo-5366283.jpeg?auto=compress&cs=tinysrgb&w=1400"
  },
  {
    id: "cultural",
    title: "Cultural",
    tag: "History, architecture, depth",
    signal: "places with historical or artistic meaning — museums, temples, ancient ruins, galleries, heritage neighborhoods, local rituals or ceremonies, architecture worth understanding. Prioritize depth over breadth. One place understood fully beats three places rushed through.",
    icon: "▱",
    img: "https://images.pexels.com/photos/6673989/pexels-photo-6673989.jpeg?auto=compress&cs=tinysrgb&w=1400"
  },
  {
    id: "culinary",
    title: "Culinary",
    tag: "Local spots, markets, food-first",
    signal: "food-first planning — build the day around meals, markets, and food experiences. Local breakfast spots, street food tours, neighborhood lunch spots, food markets, a memorable dinner. Avoid tourist restaurants. Prioritize places locals actually eat. Respect dietary preference strictly.",
    icon: "╯",
    img: "https://images.pexels.com/photos/262978/pexels-photo-262978.jpeg?auto=compress&cs=tinysrgb&w=1400"
  },
  {
    id: "offbeat",
    title: "Offbeat",
    tag: "Unexpected, quirky, rare finds",
    signal: "find the weird, specific, memorable thing that most visitors never discover — a tiny museum dedicated to one obscure subject, a secret garden hidden behind an unmarked door, an eccentric local institution, a shop that sells only one thing, an underground venue, an alley mural that locals know. Not just 'avoid tourists' — actively seek the surprising and eccentric. If a stop doesn't make someone say 'I never would have found this', replace it.",
    icon: "⊹",
    img: "https://images.pexels.com/photos/29285032/pexels-photo-29285032.jpeg?auto=compress&cs=tinysrgb&w=1400"
  },
  {
    id: "social",
    title: "Social",
    tag: "Lively, group-friendly, energy",
    signal: "group-friendly, lively environments — rooftop bars, night markets, live music venues, public squares with energy, cooking classes, tours where you meet people, communal dining. The atmosphere should buzz. Designed for someone who recharges around others.",
    icon: "♧",
    img: "https://images.pexels.com/photos/4349791/pexels-photo-4349791.jpeg?auto=compress&cs=tinysrgb&w=1400"
  },
  {
    id: "active",
    title: "Active",
    tag: "Hiking, cycling, kayaking, sports",
    signal: "movement-led day — hiking trails, cycling routes, morning runs, kayaking, swimming, walking tours of neighborhoods, paddleboarding, beach volleyball, water sports. The user wants to feel their body moving through a place, not sitting still.",
    icon: "⌁",
    img: "https://images.pexels.com/photos/917510/pexels-photo-917510.jpeg?auto=compress&cs=tinysrgb&w=1400"
  },
  {
    id: "night-owl",
    title: "Night owl",
    tag: "Live music, late nights, city alive",
    signal: "evening and nighttime experiences only — plan the day to start late and peak after dark. Live music venues, jazz bars, rooftop bars at sunset, late dinner spots, night markets, dancing, the city at its most electric. Every stop should feel like something that only exists after 6pm. Designed for someone who comes alive at night.",
    icon: "◑",
    img: "https://images.pexels.com/photos/3052361/pexels-photo-3052361.jpeg?auto=compress&cs=tinysrgb&w=1400"
  },
  {
    id: "romantic",
    title: "Romantic",
    tag: "Intimate, partner-focused",
    signal: "partner-focused itinerary — intimate settings, beautiful light, meaningful moments. Golden hour viewpoints, candlelit dinner, a walk through a lantern-lit street, a private beach, a rooftop with a view. Every stop should feel like it was chosen with someone specific in mind. Avoid anything loud, rushed, or group-oriented.",
    icon: "♡",
    img: "https://images.pexels.com/photos/12165831/pexels-photo-12165831.jpeg?auto=compress&cs=tinysrgb&w=1400"
  }
];

function PlacesCarousel({ moods, places }) {
  const [idx, setIdx] = React.useState(0);
  React.useEffect(() => {
    const t = setInterval(() => setIdx(i => (i + 1) % moods.length), 2000);
    return () => clearInterval(t);
  }, [moods.length]);
  const cleanName = (raw, fallback) => {
    if (!raw) return fallback;
    const parts = raw.split(",");
    return parts[0].trim();
  };
  return (
    <div className="places-carousel">
      {moods.map((m, i) => {
        const place = places[i];
        const rating = (4.1 + i * 0.15).toFixed(1);
        const name = cleanName(place?.name, m.title);
        return (
          <div key={m.id + i} className={`pc-slide${i === idx ? " pc-active" : i === (idx - 1 + moods.length) % moods.length ? " pc-prev" : ""}`}>
            <img src={m.img} alt="" />
            <div className="pc-ov" />
            <div className="pc-meta">
              <span className="pc-name">{name}</span>
              <div className="pc-chips">
                <span className="pc-rating-chip">★ {rating}</span>
                {place && <span className="pc-type-chip">{m.title}</span>}
              </div>
            </div>
          </div>
        );
      })}
      <div className="pc-dots">
        {moods.map((_, i) => <span key={i} className={`pc-dot${i === idx ? " pc-dot-active" : ""}`} />)}
      </div>
    </div>
  );
}

function App() {
  const [user, setUser] = useState(null);
  const [step, setStep] = useState("login");
  const [destination, setDestination] = useState("");
  const [endDestination, setEndDestination] = useState("");
  const [placePredictions, setPlacePredictions] = useState([]);
  const [isAutocompleting, setIsAutocompleting] = useState(false);
  const [autocompleteError, setAutocompleteError] = useState("");
  const [showDestinationSuggestions, setShowDestinationSuggestions] = useState(false);
  const [endPlacePredictions, setEndPlacePredictions] = useState([]);
  const [isEndAutocompleting, setIsEndAutocompleting] = useState(false);
  const [endAutocompleteError, setEndAutocompleteError] = useState("");
  const [showEndDestinationSuggestions, setShowEndDestinationSuggestions] = useState(false);
  const [date, setDate] = useState(getToday());
  const [dateInput, setDateInput] = useState(() => formatDateForInput(getToday()));
  const [startTime, setStartTime] = useState("");
  const [endTime, setEndTime] = useState("");
  const [diet, setDiet] = useState("Vegetarian");
  const [planFor, setPlanFor] = useState("Date");
  const [transportMode, setTransportMode] = useState("Car");
  const [requirements, setRequirements] = useState("");
  const [requirementChips, setRequirementChips] = useState([]);
  const [requirementsFocus, setRequirementsFocus] = useState(false);
  const [refinement, setRefinement] = useState("");
  const [isGenerating, setIsGenerating] = useState(false);
  const [isRefining, setIsRefining] = useState(false);
  const [selectedMoods, setSelectedMoods] = useState([]);
  const [loadingPct, setLoadingPct] = useState(6);
  const [itinerary, setItinerary] = useState(null);
  const [googleReady, setGoogleReady] = useState(false);
  const [error, setError] = useState("");
  const [showSubscribe, setShowSubscribe] = useState(false);
  const [subscribeEmail, setSubscribeEmail] = useState("");
  const [subscribeSaved, setSubscribeSaved] = useState(false);
  const [menuOpen, setMenuOpen] = useState(false);
  const [shareCopied, setShareCopied] = useState(false);
  const [shareLoading, setShareLoading] = useState(false);
  const [calendarState, setCalendarState] = useState("idle");
  const [cardIndex, setCardIndex] = useState(0);
  const [savedCards, setSavedCards] = useState(new Set());
  const [selectedStops, setSelectedStops] = useState([]);
  const [itineraryBuilt, setItineraryBuilt] = useState(false);
  const [mobileTrayOpen, setMobileTrayOpen] = useState(false);
  const [dragIndex, setDragIndex] = useState(null);
  const [manualStopOrder, setManualStopOrder] = useState(false);
  const [outdoLoading, setOutdoLoading] = useState(false);
  const [outdoPlanId, setOutdoPlanId] = useState("");
  const [addedStopName, setAddedStopName] = useState("");
  const [activeTimelineIndex, setActiveTimelineIndex] = useState(0);
  const [swipeDir, setSwipeDir] = useState(1);
  const [loginSlide, setLoginSlide] = useState(0);
  const [showTapHint, setShowTapHint] = useState(false);
  const [heartBurst, setHeartBurst] = useState(false);
  const [moreOpen, setMoreOpen] = useState(false);
  const tapTimerRef = useRef(null);
  const swipeStartXRef = useRef(null);
  const timelineRefs = useRef([]);
  const shellRef = useRef(null);
  const routeRefreshTimerRef = useRef(null);
  const routeRefreshRequestRef = useRef(0);
  const motionPathRef = useRef(null);
  const jumpTimerRef = useRef(null);
  const crashTimerRef = useRef(null);
  const lastJumpAtRef = useRef(0);
  const loadingStartedAtRef = useRef(0);
  const gameProgressRef = useRef(6);
  const previousLoadingPctRef = useRef(6);
  const clearedHurdlesRef = useRef(new Set());
  const [loaderCursor, setLoaderCursor] = useState({ x: 78, y: 516, angle: -20 });
  const [dinoJumping, setDinoJumping] = useState(false);
  const [dinoCrashed, setDinoCrashed] = useState(false);
  const [dinoScore, setDinoScore] = useState(0);
  const [gameLap, setGameLap] = useState(1);
  const [gameUnlock, setGameUnlock] = useState("First route ready — jump to unlock research levels");
  const [travelScene, setTravelScene] = useState(0);
  const [travelObstacle, setTravelObstacle] = useState(0);
  const [travelerStumble, setTravelerStumble] = useState(false);
  const [obstacleReaction, setObstacleReaction] = useState(false);
  const [missScore, setMissScore] = useState(0);
  const [gameMessage, setGameMessage] = useState("Trip mode unlocked");
  const travelGameStartedAtRef = useRef(0);
  const gameAudioContextRef = useRef(null);
  const [isMobileLoader, setIsMobileLoader] = useState(false);

  function goTo(s) {
    window.scrollTo({ top: 0, behavior: "instant" });
    setStep(s);
  }

  function triggerDinoJump() {
    if (step !== "loading") return;
    try {
      const AudioEngine = window.AudioContext || window.webkitAudioContext;
      if (AudioEngine && !gameAudioContextRef.current) gameAudioContextRef.current = new AudioEngine();
      gameAudioContextRef.current?.resume?.();
    } catch { }
    lastJumpAtRef.current = Date.now();
    setDinoJumping(true);
    setTravelerStumble(false);
    clearTimeout(jumpTimerRef.current);
    jumpTimerRef.current = setTimeout(() => setDinoJumping(false), 620);
  }

  function playLevelSound() {
    try {
      const AudioEngine = window.AudioContext || window.webkitAudioContext;
      if (!AudioEngine) return;
      const context = gameAudioContextRef.current || new AudioEngine();
      gameAudioContextRef.current = context;
      [523.25, 659.25, 783.99].forEach((frequency, index) => {
        const oscillator = context.createOscillator();
        const gain = context.createGain();
        oscillator.frequency.value = frequency;
        oscillator.type = "sine";
        gain.gain.setValueAtTime(0.0001, context.currentTime + index * .08);
        gain.gain.exponentialRampToValueAtTime(.08, context.currentTime + index * .08 + .02);
        gain.gain.exponentialRampToValueAtTime(.0001, context.currentTime + index * .08 + .22);
        oscillator.connect(gain).connect(context.destination);
        oscillator.start(context.currentTime + index * .08);
        oscillator.stop(context.currentTime + index * .08 + .24);
      });
    } catch { }
  }

  function finishTravelObstacle(event) {
    if (event.target !== event.currentTarget) return;
    const cleared = Date.now() - lastJumpAtRef.current < 820;
    const mode = travelGameMode(transportMode);
    const stories = TRAVEL_GAME_STORIES[mode];
    const story = stories[travelScene];
    const completedCount = travelObstacle + 1;
    if (cleared) {
      setDinoScore((score) => score + 1);
      setGameMessage(story.win);
      const unlockNext = completedCount % 4 === 0 && travelScene < stories.length - 1;
      clearTimeout(crashTimerRef.current);
      crashTimerRef.current = setTimeout(() => {
        setTravelObstacle((obstacle) => obstacle + 1);
        if (unlockNext) {
          const nextScene = travelScene + 1;
          setTravelScene(nextScene);
          setGameMessage(stories[nextScene].intro);
          playLevelSound();
        }
      }, 280);
    } else {
      setMissScore((score) => score + 1);
      setTravelerStumble(true);
      setGameMessage(`${story.miss} Restarting ${story.label}.`);
      clearTimeout(crashTimerRef.current);
      crashTimerRef.current = setTimeout(() => {
        setTravelerStumble(false);
        setTravelObstacle(travelScene * 4);
        setGameMessage(story.intro);
      }, 720);
    }
  }

  useEffect(() => {
    const media = window.matchMedia("(max-width: 760px)");
    const sync = () => setIsMobileLoader(media.matches);
    sync();
    media.addEventListener?.("change", sync);
    return () => media.removeEventListener?.("change", sync);
  }, []);

  useEffect(() => {
    gameProgressRef.current = loadingPct;
  }, [loadingPct]);

  useEffect(() => {
    setDateInput(formatDateForInput(date));
  }, [date]);

  useEffect(() => {
    const params = new URLSearchParams(window.location.search);
    const boardId = params.get("board");
    if (boardId) {
      try {
        const saved = JSON.parse(localStorage.getItem(`outdonePlan:${boardId}`) || "null");
        const sourceItinerary = saved?.sourceItinerary || saved?.itinerary;
        if (!sourceItinerary?.stops?.length) throw new Error("Cached outing board not found");
        setItinerary(sourceItinerary);
        setSelectedStops(saved.sourceSelectedStops || saved.itinerary?.stops || []);
        setDate(saved.date || getToday());
        setDestination(saved.destination || sourceItinerary.destination || "");
        setEndDestination(saved.endDestination || "");
        setTransportMode(saved.transportMode || "Car");
        setCardIndex(0);
        setItineraryBuilt(false);
        setManualStopOrder(false);
        setOutdoPlanId("");
        setStep("result");
      } catch (error) {
        console.warn("Could not restore outing board", error);
        setError("This outing board is no longer available.");
        setStep("apiError");
      }
      return;
    }
    const outdoId = params.get("outdo");
    if (outdoId) {
      try {
        const saved = JSON.parse(localStorage.getItem(`outdonePlan:${outdoId}`) || "null");
        if (!saved?.itinerary?.stops?.length) throw new Error("Cached plan not found");
        setItinerary(saved.itinerary);
        setSelectedStops(saved.itinerary.stops);
        setDate(saved.date || getToday());
        setDestination(saved.destination || saved.itinerary.destination || "");
        setEndDestination(saved.endDestination || "");
        setTransportMode(saved.transportMode || "Car");
        setOutdoPlanId(outdoId);
        setItineraryBuilt(true);
        setManualStopOrder(Boolean(saved.manuallyEditedAt));
        setStep("result");
      } catch (error) {
        console.warn("Could not load AI Outdo plan", error);
        setError("This cached AI Outdo plan is no longer available. Return to your outing board and run it again.");
        setStep("apiError");
      }
      return;
    }
    const id = params.get("i");
    if (!id) return;
    fetch(`/api/save-itinerary?id=${encodeURIComponent(id)}`)
      .then(r => r.ok ? r.json() : Promise.reject())
      .then(payload => {
        if (payload.itinerary) {
          setItinerary(payload.itinerary);
          setSelectedStops(payload.itinerary.stops || []);
          setItineraryBuilt(true);
        }
        if (payload.destination) setDestination(payload.destination);
        if (payload.date) setDate(payload.date);
        if (payload.selectedMoods) setSelectedMoods(payload.selectedMoods.map(m => m.id || m));
        if (payload.diet) setDiet(payload.diet);
        if (payload.planFor) setPlanFor(payload.planFor);
        setStep("result");
      })
      .catch(() => console.warn("Could not load shared itinerary"));
  }, []);

  useEffect(() => {
    if (!outdoPlanId || !selectedStops.length || !manualStopOrder) return;
    const key = `outdonePlan:${outdoPlanId}`;
    try {
      const saved = JSON.parse(localStorage.getItem(key) || "null");
      if (!saved) return;
      localStorage.setItem(key, JSON.stringify({
        ...saved,
        optimization: itinerary?.optimization || saved.optimization,
        itinerary: {
          ...saved.itinerary,
          stops: selectedStops,
          optimization: itinerary?.optimization || saved.itinerary?.optimization
        },
        manuallyEditedAt: new Date().toISOString()
      }));
    } catch (error) {
      console.warn("Could not persist reordered AI Outdo plan", error);
    }
  }, [outdoPlanId, selectedStops, manualStopOrder, itinerary?.optimization]);

  useEffect(() => {
    document.title = "outdone - Vibe-first travel planning";
    const setFavicon = (href, type) => {
      let el = document.querySelector(`link[rel~="icon"]`);
      if (!el) { el = document.createElement("link"); el.rel = "icon"; document.head.appendChild(el); }
      el.type = type; el.href = href;
    };
    const svgMark = `<svg width="32" height="32" viewBox="0 0 32 32" xmlns="http://www.w3.org/2000/svg"><rect width="32" height="32" rx="8" fill="%230d1a14"/><path d="M8 4 C8 10,24 10,24 16 C24 22,8 22,8 28" fill="none" stroke="%23339989" stroke-width="2.5" stroke-linecap="round"/><path d="M24 4 C24 10,8 10,8 16 C8 22,24 22,24 28" fill="none" stroke="%235EC4B5" stroke-width="2.5" stroke-linecap="round" opacity="0.55"/><circle cx="16" cy="8.5" r="2" fill="%23339989"/><circle cx="16" cy="16" r="2" fill="%23339989"/><circle cx="16" cy="23.5" r="2" fill="%23339989"/></svg>`;
    setFavicon(`data:image/svg+xml,${svgMark}`, "image/svg+xml");
    let apple = document.querySelector("link[rel='apple-touch-icon']");
    if (!apple) { apple = document.createElement("link"); apple.rel = "apple-touch-icon"; apple.sizes = "180x180"; document.head.appendChild(apple); }
    apple.href = "/apple-touch-icon.png";
  }, []);

  useEffect(() => {
    let rafId;
    const moveGlow = (event) => {
      if (!shellRef.current) return;
      rafId = requestAnimationFrame(() => {
        shellRef.current.style.setProperty("--mx", `${event.clientX}px`);
        shellRef.current.style.setProperty("--my", `${event.clientY}px`);
      });
    };
    window.addEventListener("pointermove", moveGlow);
    return () => { window.removeEventListener("pointermove", moveGlow); if (rafId) cancelAnimationFrame(rafId); };
  }, []);

  useEffect(() => {
    if (!GOOGLE_CLIENT_ID || step !== "login") return;
    let attempts = 0;
    let cancelled = false;
    const loadGoogleButton = () => {
      const buttonContainer = document.getElementById("googleSignIn");
      if (cancelled || !buttonContainer) { attempts += 1; if (!cancelled && attempts < 30) setTimeout(loadGoogleButton, 200); return; }
      if (!window.google?.accounts?.id) { attempts += 1; if (attempts < 40) setTimeout(loadGoogleButton, 200); return; }
      setGoogleReady(true);
      window.google.accounts.id.initialize({
        client_id: GOOGLE_CLIENT_ID,
        callback: (response) => {
          const payload = JSON.parse(atob(response.credential.split(".")[1]));
          setUser({ name: payload.name, email: payload.email, picture: payload.picture });
          goTo("setup");
        }
      });
      buttonContainer.innerHTML = "";
      if (window.innerWidth <= 1024) {
        // Mobile/tablet: use prompt() triggered by our own styled button
        // renderButton still needed to initialize but hidden
        window.google.accounts.id.renderButton(buttonContainer, { theme: "outline", size: "large", shape: "pill", text: "continue_with", width: 1 });
      } else {
        window.google.accounts.id.renderButton(buttonContainer, { theme: "outline", size: "large", shape: "pill", text: "continue_with", width: 320 });
      }
    };
    loadGoogleButton();
    return () => { cancelled = true; };
  }, [step]);

  // Landing page: cinematic cycle through mood imagery + itinerary lines
  useEffect(() => {
    if (step !== "login") return;
    const t = setInterval(() => setLoginSlide(i => (i + 1) % moodVibes.length), 4500);
    return () => clearInterval(t);
  }, [step]);

  // Mobile result: one-time "double tap to save" hint overlay
  useEffect(() => {
    if (step !== "result") return;
    if (!window.matchMedia("(max-width: 900px)").matches) return;
    const showTimer = setTimeout(() => setShowTapHint(true), 0);
    const hideTimer = setTimeout(() => setShowTapHint(false), 3600);
    return () => { clearTimeout(showTimer); clearTimeout(hideTimer); };
  }, [step]);

  useEffect(() => {
    const query = destination.trim();
    if (query.length < 2) {
      const clearTimer = setTimeout(() => {
        setAutocompleteError("");
        setPlacePredictions([]);
      }, 0);
      return () => clearTimeout(clearTimer);
    }
    let cancelled = false;
    const timer = setTimeout(async () => {
      setIsAutocompleting(true);
      setAutocompleteError("");
      try {
        const response = await fetch(`/api/place-autocomplete?input=${encodeURIComponent(query)}`);
        const responseText = await response.text();
        let data = null;
        try {
          data = responseText ? JSON.parse(responseText) : {};
        } catch {
          throw new Error(`Autocomplete route returned ${response.status}: ${responseText.slice(0, 120) || "No response body"}`);
        }
        if (!response.ok) {
          throw new Error(data?.error || `Autocomplete route returned ${response.status}`);
        }
        if (!cancelled && Array.isArray(data.suggestions)) {
          setPlacePredictions(data.suggestions);
          setAutocompleteError(data.suggestions.length ? "" : data.error || "");
        }
      } catch (error) {
        console.warn("Autocomplete fallback:", error);
        if (!cancelled) {
          setPlacePredictions([]);
          setAutocompleteError(error.message || "Could not load Google suggestions.");
        }
      } finally {
        if (!cancelled) setIsAutocompleting(false);
      }
    }, 220);
    return () => { cancelled = true; clearTimeout(timer); };
  }, [destination]);

  useEffect(() => {
    const query = endDestination.trim();
    if (query.length < 2) {
      const clearTimer = setTimeout(() => {
        setEndAutocompleteError("");
        setEndPlacePredictions([]);
      }, 0);
      return () => clearTimeout(clearTimer);
    }
    let cancelled = false;
    const timer = setTimeout(async () => {
      setIsEndAutocompleting(true);
      setEndAutocompleteError("");
      try {
        const response = await fetch(`/api/place-autocomplete?input=${encodeURIComponent(query)}`);
        const responseText = await response.text();
        let data = null;
        try {
          data = responseText ? JSON.parse(responseText) : {};
        } catch {
          throw new Error(`Autocomplete route returned ${response.status}: ${responseText.slice(0, 120) || "No response body"}`);
        }
        if (!response.ok) throw new Error(data?.error || `Autocomplete route returned ${response.status}`);
        if (!cancelled && Array.isArray(data.suggestions)) {
          setEndPlacePredictions(data.suggestions);
          setEndAutocompleteError(data.suggestions.length ? "" : data.error || "");
        }
      } catch (error) {
        console.warn("End destination autocomplete fallback:", error);
        if (!cancelled) {
          setEndPlacePredictions([]);
          setEndAutocompleteError(error.message || "Could not load Google suggestions.");
        }
      } finally {
        if (!cancelled) setIsEndAutocompleting(false);
      }
    }, 220);
    return () => { cancelled = true; clearTimeout(timer); };
  }, [endDestination]);

  const destinationOptions = placePredictions;
  const endDestinationOptions = endPlacePredictions;

  const selectedMoodObjects = selectedMoods.map((id) => moodVibes.find((vibe) => vibe.id === id)).filter(Boolean);
  // Preload all itinerary images so switching cards feels instant on mobile
  useEffect(() => {
    if (!itinerary?.stops?.length) return;
    const imgs = [];
    const stops = itinerary.stops;
    stops.forEach((s, i) => {
      const url = s.imageUrl || s.photoUrl || selectedMoodObjects[i % Math.max(selectedMoodObjects.length, 1)]?.img || moodVibes[i % moodVibes.length].img;
      if (!url) return;
      const img = new Image();
      img.src = url;
      imgs.push(img);
    });
    return () => { /* allow garbage collection */ };
  }, [itinerary, selectedMoods]);

  useEffect(() => {
    if (step !== "loading" || !motionPathRef.current) return;
    const path = motionPathRef.current;
    const total = path.getTotalLength();
    const distance = total * Math.min(100, Math.max(0, loadingPct)) / 100;
    const point = path.getPointAtLength(distance);
    const next = path.getPointAtLength(Math.min(total, distance + 2));
    setLoaderCursor({ x: point.x, y: point.y, angle: Math.atan2(next.y - point.y, next.x - point.x) * 180 / Math.PI });
  }, [loadingPct, step, isMobileLoader]);

  useEffect(() => {
    if (step !== "loading") return;
    const jump = (event) => {
      if ((event.code !== "Space" && event.key !== " ") || event.repeat) return;
      event.preventDefault();
      triggerDinoJump();
    };
    window.addEventListener("keydown", jump);
    return () => {
      window.removeEventListener("keydown", jump);
      clearTimeout(jumpTimerRef.current);
      clearTimeout(crashTimerRef.current);
    };
  }, [step]);
  const travelArchetype = getTravelArchetype(selectedMoodObjects);
  const googleTravelMode = transportMode === "Walking" ? "walking" : transportMode === "Public transit" ? "transit" : "driving";
  const suggestionStops = itinerary?.stops || [];
  const activeStop = cardIndex < suggestionStops.length ? suggestionStops[cardIndex] : {};
  const refinementPreviewStop = suggestionStops[0] || {};
  const activeMoodMatches = stopMoodMatches(activeStop, selectedMoodObjects);
  const activePresentation = stopPresentation(activeStop);
  const activeReviews = activeStop.reviewHighlights || activeStop.reviewEvidence || [];
  const activeDiscoveryLinks = discoveryLinksForStop(activeStop, destination);
  const itineraryStops = selectedStops.length
    ? (itineraryBuilt ? selectedStops : orderStopsByTime(selectedStops))
    : orderStopsByTime(suggestionStops);
  const mapsStops = itineraryStops;
  const tripMapsUrl = mapsStops.length ? buildGoogleMapsTripUrl(mapsStops, googleTravelMode) : "";

  const stopImage = (stop, i = 0) => stop?.imageUrl || stop?.photoUrl || selectedMoodObjects[i % Math.max(selectedMoodObjects.length, 1)]?.img || moodVibes[i % moodVibes.length].img;

  function addStopToItinerary(stop = activeStop) {
    if (!stop?.name) return;
    setSelectedStops((items) => items.some((s) => s.name === stop.name) ? items : [...items, stop]);
    setAddedStopName(stop.name);
    setTimeout(() => {
      setAddedStopName("");
      setCardIndex((i) => Math.min(i + 1, suggestionStops.length));
    }, 520);
  }

  function discardCurrentStop() {
    setCardIndex((i) => Math.min(i + 1, suggestionStops.length));
  }

  function removeSelectedStop(index) {
    setSelectedStops((items) => items.filter((_, i) => i !== index));
  }

  function scheduleConsecutiveLegRefresh(stops) {
    if (!outdoPlanId || stops.length < 2) return;
    clearTimeout(routeRefreshTimerRef.current);
    const requestId = ++routeRefreshRequestRef.current;
    routeRefreshTimerRef.current = setTimeout(async () => {
      try {
        const response = await fetch("/api/optimize-route", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            stops,
            date,
            startTime: startTime || null,
            endTime: endTime || null,
            transportMode: transportMode || "Car",
            preserveOrder: true
          })
        });
        const data = await response.json();
        if (!response.ok || !data.orderedStops?.length) throw new Error(data.error || "Could not refresh route legs.");
        if (requestId !== routeRefreshRequestRef.current) return;
        setSelectedStops(data.orderedStops);
        setItinerary((current) => current ? {
          ...current,
          stops: data.orderedStops,
          optimization: data.optimization
        } : current);
      } catch (error) {
        console.warn("Could not refresh consecutive route legs", error);
      }
    }, 350);
  }

  function moveSelectedStop(from, to) {
    if (from == null || to == null || from === to) return;
    setManualStopOrder(true);
    setSelectedStops((items) => {
      const scheduleSlots = items.map((stop) => ({ time: stop.time, period: stop.period }));
      const next = [...items];
      const [moved] = next.splice(from, 1);
      next.splice(to, 0, moved);
      const pending = next.map((stop, index) => ({
        ...stop,
        time: scheduleSlots[index]?.time || stop.time,
        period: scheduleSlots[index]?.period || stop.period,
        routeFromPrevious: index === 0 ? "" : "Updating route from previous stop…"
      }));
      scheduleConsecutiveLegRefresh(pending);
      return pending;
    });
  }

  function returnToSuggestions() {
    let source = null;
    try {
      source = outdoPlanId ? JSON.parse(localStorage.getItem(`outdonePlan:${outdoPlanId}`) || "null")?.sourceItinerary : null;
    } catch { }
    if (source?.stops?.length) setItinerary(source);
    setItineraryBuilt(false);
    setOutdoPlanId("");
    setCardIndex(0);
    window.scrollTo({ top: 0, behavior: "instant" });
  }

  function beginMobileSort(index, event) {
    event.preventDefault();
    event.currentTarget.setPointerCapture?.(event.pointerId);
    setDragIndex(index);
  }

  function moveMobileSort(event) {
    if (dragIndex == null) return;
    const target = document.elementFromPoint(event.clientX, event.clientY)?.closest?.("[data-mobile-sort-index]");
    if (!target) return;
    const nextIndex = Number(target.dataset.mobileSortIndex);
    if (!Number.isNaN(nextIndex) && nextIndex !== dragIndex) {
      moveSelectedStop(dragIndex, nextIndex);
      setDragIndex(nextIndex);
    }
  }

  function endMobileSort() {
    setDragIndex(null);
  }

  function createItineraryFromSelected() {
    if (!selectedStops.length) return;
    if (!manualStopOrder) setSelectedStops((items) => arrangeStopsForPlan(items));
    setItineraryBuilt(true);
    setMobileTrayOpen(false);
  }

  async function runAiOutdo() {
    if (!selectedStops.length || outdoLoading) return;
    const fingerprint = stablePlanFingerprint(selectedStops, date, startTime, endTime, transportMode);
    const cachedPlanId = localStorage.getItem(`outdoneRouteCache:${fingerprint}`);

    if (cachedPlanId && localStorage.getItem(`outdonePlan:${cachedPlanId}`)) {
      try {
        const cached = JSON.parse(localStorage.getItem(`outdonePlan:${cachedPlanId}`));
        setSelectedStops(cached.itinerary.stops || selectedStops);
        setItinerary(cached.itinerary);
        setOutdoPlanId(cachedPlanId);
        setItineraryBuilt(true);
        setMobileTrayOpen(false);
        return;
      } catch {
        localStorage.removeItem(`outdoneRouteCache:${fingerprint}`);
      }
    }
    setOutdoLoading(true);
    setError("");

    try {
      const response = await fetch("/api/optimize-route", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          stops: selectedStops,
          date,
          startTime: startTime || null,
          endTime: endTime || null,
          transportMode: transportMode || "Car",
          unitSystem: usesImperialDistance(destination) ? "imperial" : "metric"
        })
      });
      const data = await response.json();
      if (!response.ok || !data.orderedStops?.length) throw new Error(data.error || "AI Outdo could not optimize this route.");

      const planId = globalThis.crypto?.randomUUID?.() || `${Date.now()}-${fingerprint}`;
      const record = {
        id: planId,
        fingerprint,
        date,
        startTime: startTime || null,
        endTime: endTime || null,
        destination,
        endDestination,
        transportMode: transportMode || "Car",
        optimization: data.optimization,
        createdAt: new Date().toISOString(),
        sourceItinerary: itinerary,
        sourceSelectedStops: selectedStops,
        itinerary: {
          ...itinerary,
          stops: data.orderedStops,
          optimization: data.optimization,
          generatedBy: "ai-outdo"
        }
      };
      localStorage.setItem(`outdonePlan:${planId}`, JSON.stringify(record));
      localStorage.setItem(`outdoneRouteCache:${fingerprint}`, planId);
      setSelectedStops(data.orderedStops);
      setItinerary(record.itinerary);
      setOutdoPlanId(planId);
      setItineraryBuilt(true);
      setMobileTrayOpen(false);
    } catch (error) {
      setError(error.message || "AI Outdo could not optimize this route.");
    } finally {
      setOutdoLoading(false);
    }
  }

  useEffect(() => {
    if (!itineraryBuilt) return;
    const observer = new IntersectionObserver((entries) => {
      const center = window.innerHeight * 0.42;
      const visible = entries
        .filter((entry) => entry.isIntersecting)
        .sort((a, b) => Math.abs(a.boundingClientRect.top - center) - Math.abs(b.boundingClientRect.top - center))[0];
      if (visible?.target?.dataset?.index) setActiveTimelineIndex(Number(visible.target.dataset.index));
    }, { threshold: [0.12, 0.28, 0.5], rootMargin: "-18% 0px -58% 0px" });
    timelineRefs.current.forEach((node) => node && observer.observe(node));
    return () => observer.disconnect();
  }, [itineraryBuilt, itineraryStops.length]);

  const loadingPhases = useMemo(() => [
    {
      id: "profile",
      title: "Quick feeler profile",
      line: user?.name ? `${user.name}'s travel signal is ready` : "Reading your day-of travel signal",
    },
    {
      id: "vibe",
      title: "Vibe and constraints",
      line: `${selectedMoodObjects.map(m => m.title).join(", ") || "Your vibe"} · ${diet} · ${planFor}`,
    },
    {
      id: "places",
      title: "Place reviews",
      line: `Scanning real matches around ${destination || "your destination"}`,
    },
    {
      id: "photos",
      title: "Photos and ratings",
      line: "Matching each stop with visual context",
    },
    {
      id: "gemini",
      title: "AI curating your suggestions",
      line: "Asking AI to think like today's version of you",
    }
  ], [destination, diet, planFor, selectedMoodObjects, user]);
  const displayLoadingPct = Math.round(loadingPct);
  const activeLoadingPhase =
    loadingPct >= 100 ? 4 :
    loadingPct >= 78 ? 3 :
    loadingPct >= 55 ? 2 :
    loadingPct >= 30 ? 1 :
    0;

  function toggleMood(id) {
    setSelectedMoods((current) => {
      if (current.includes(id)) return current.filter((item) => item !== id);
      if (current.length >= 3) return [...current.slice(1), id];
      return [...current, id];
    });
  }

  function commitRequirement(value) {
    const next = String(value || "").trim();
    if (!next) return;
    setRequirementChips((items) => items.some((item) => item.toLowerCase() === next.toLowerCase()) ? items : [...items, next]);
    setRequirements("");
  }

  async function generatePlan(extraRequirement = "") {
    if (isGenerating) return;
    setIsGenerating(true);
    goTo("loading");
    setError("");
    setLoadingPct(6);
    loadingStartedAtRef.current = Date.now();
    previousLoadingPctRef.current = 6;
    clearedHurdlesRef.current = new Set();
    lastJumpAtRef.current = 0;
    setDinoScore(0);
    setDinoCrashed(false);
    setGameLap(1);
    setGameUnlock("First route ready — jump to unlock research levels");
    travelGameStartedAtRef.current = Date.now();
    setTravelScene(0);
    setTravelObstacle(0);
    setTravelerStumble(false);
    setObstacleReaction(false);
    setMissScore(0);
    setGameMessage(TRAVEL_GAME_STORIES[travelGameMode(transportMode)][0].intro);
    setItinerary(null);
    setCardIndex(0);
    setSavedCards(new Set());
    setSelectedStops([]);
    setItineraryBuilt(false);
    setMobileTrayOpen(false);
    setManualStopOrder(false);

    const interval = setInterval(() => {
      setLoadingPct((pct) => {
        const elapsed = (Date.now() - loadingStartedAtRef.current) / 1000;
        const speed = elapsed < 15 ? 1.8 : elapsed < 40 ? 1.2 : .8;
        return Math.min(94, pct + speed);
      });
    }, 420);

    const geminiPromise = fetch("/api/generate", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        user,
        destination,
        endDestination: endDestination.trim() || null,
        dates: prettyDate(date),
        date,
        startTime: startTime || null,
        endTime: endTime || null,
        diet,
        travelWith: planFor,
        transportMode: transportMode || "Car",
        selectedMoods: selectedMoodObjects,
        requirements: joinRequirements(requirementChips, [requirements, extraRequirement].filter(Boolean).join("; "))
      })
    });

    try {
      const res = await geminiPromise;
      const data = await res.json();
      if (!res.ok || data?.error) throw new Error(data?.error || "The planning service is unavailable right now.");
      const completePlan = data;
      clearInterval(interval);
      setItinerary(completePlan);
      setDinoCrashed(false);
      setGameUnlock("Final level unlocked · your suggestions are ready");
      setLoadingPct(100);
      setDinoJumping(true);
      setTimeout(() => goTo("result"), 720);
    } catch (err) {
      clearInterval(interval);
      console.error(err);
      setError(err.message || "We could not generate the plan.");
      goTo("apiError");
    } finally {
      setIsGenerating(false);
    }
  }

  async function generateMoreSuggestions(event) {
    event.preventDefault();
    if (!refinement.trim() || isRefining) return;
    setIsRefining(true);
    setError("");
    try {
      const response = await fetch("/api/generate", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          user,
          destination,
          endDestination: endDestination.trim() || null,
          dates: prettyDate(date),
          date,
          startTime: startTime || null,
          endTime: endTime || null,
          diet,
          travelWith: planFor,
          transportMode: transportMode || "Car",
          selectedMoods: selectedMoodObjects,
          requirements: joinRequirements(requirementChips, [requirements, refinement].filter(Boolean).join("; "))
        })
      });
      const data = await response.json();
      if (!response.ok || data?.error) throw new Error(data?.error || "Could not refresh suggestions.");
      setItinerary((current) => {
        const existing = current?.stops || [];
        const seen = new Set(existing.map((stop) => stop.placeId || String(stop.name).toLowerCase()));
        const fresh = (data.stops || []).filter((stop) => !seen.has(stop.placeId || String(stop.name).toLowerCase()));
        return { ...data, stops: [...fresh, ...existing] };
      });
      setCardIndex(0);
      setRefinement("");
    } catch (refreshError) {
      setError(refreshError.message || "Could not refresh suggestions.");
    } finally {
      setIsRefining(false);
    }
  }

  async function shareItinerary() {
    if (shareLoading) return;
    setShareLoading(true);
    try {
      const res = await fetch("/api/save-itinerary", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ itinerary: { ...itinerary, stops: itineraryStops }, destination, date, selectedMoods: selectedMoodObjects, diet, planFor }),
      });
      const { id, error } = await res.json();
      if (!id) throw new Error(error || "No ID returned");
      const shareUrl = `${window.location.origin}${window.location.pathname}?i=${id}`;
      if (navigator.share) {
        await navigator.share({ title: `outdone — ${itinerary?.destination || destination}`, text: itinerary?.summary || "Check out this itinerary.", url: shareUrl });
      } else {
        await navigator.clipboard.writeText(shareUrl);
        setShareCopied(true);
        setTimeout(() => setShareCopied(false), 2500);
      }
    } catch (e) { console.error("Share failed:", e); }
    finally { setShareLoading(false); }
  }

  function startOver() {
    setDestination(""); setEndDestination(""); setRequirements(""); setRequirementChips([]); setRefinement(""); setDate(getToday()); setStartTime(""); setEndTime(""); setDiet("No preference"); setPlanFor("Date");
    setTransportMode("Car"); setSelectedMoods([]); setRequirements(""); setEndDestination("");
    setItinerary(null); setCardIndex(0); setSavedCards(new Set());
    setSelectedStops([]); setItineraryBuilt(false); setMobileTrayOpen(false); setManualStopOrder(false);
    goTo("setup");
  }

  // Front card interaction:
  // Desktop — single click advances (unchanged behavior).
  // Mobile  — single tap shuffles to the next card (wraps around),
  //           double tap hearts/unhearts the current card.
  function handleCardFrontClick(stops) {
    setShowTapHint(false);
    const isMobile = window.matchMedia("(max-width: 900px)").matches;
    if (!isMobile) {
      if (cardIndex < stops.length - 1) { setSwipeDir(1); setCardIndex(cardIndex + 1); }
      return;
    }
    if (tapTimerRef.current) {
      // Double tap → toggle heart
      clearTimeout(tapTimerRef.current);
      tapTimerRef.current = null;
      const idx = cardIndex;
      const willSave = !savedCards.has(idx);
      setSavedCards(prev => {
        const n = new Set(prev);
        if (willSave) n.add(idx); else n.delete(idx);
        return n;
      });
      if (willSave) {
        setHeartBurst(true);
        setTimeout(() => setHeartBurst(false), 750);
      }
    } else {
      // Single tap (after double-tap window passes) → next card
      tapTimerRef.current = setTimeout(() => {
        tapTimerRef.current = null;
        setSwipeDir(1);
        setCardIndex(i => (i + 1) % stops.length);
      }, 270);
    }
  }

  async function addToCalendar() {
    if (!itinerary?.stops?.length) return;
    setCalendarState("loading");

    const tripDate = date || getToday();
    const destName = itinerary.destination || destination;

    if (user) {
      try {
        await new Promise((resolve, reject) => {
          if (!window.google?.accounts?.oauth2) return reject(new Error("GIS not loaded"));
          const client = window.google.accounts.oauth2.initTokenClient({
            client_id: GOOGLE_CLIENT_ID,
            scope: "https://www.googleapis.com/auth/calendar.events",
            callback: async (tokenResponse) => {
              if (tokenResponse.error) return reject(new Error(tokenResponse.error));
              try {
                const accessToken = tokenResponse.access_token;
                const stopsText = itineraryStops.map((s, i) =>
                  `${String(i + 1).padStart(2, "0")}. ${s.name}${s.address ? ` — ${s.address}` : ""}`
                ).join("\n");

                const event = {
                  summary: `outdone: ${destName}`,
                  description: `${itinerary.summary || ""}\n\n${stopsText}\n\nGenerated by outdone`,
                  location: destName,
                  start: { date: tripDate },
                  end: { date: tripDate },
                };

                const res = await fetch(
                  "https://www.googleapis.com/calendar/v3/calendars/primary/events",
                  {
                    method: "POST",
                    headers: {
                      Authorization: `Bearer ${accessToken}`,
                      "Content-Type": "application/json",
                    },
                    body: JSON.stringify(event),
                  }
                );
                if (!res.ok) throw new Error("Calendar API error");
                resolve();
              } catch (e) { reject(e); }
            },
          });
          client.requestAccessToken();
        });
        setCalendarState("done");
        setTimeout(() => setCalendarState("idle"), 3000);
      } catch (err) {
        console.error("Calendar error:", err);
        setCalendarState("error");
        setTimeout(() => setCalendarState("idle"), 3000);
      }
      return;
    }

    const fmt = (d) => d.replace(/-/g, "");
    const stopsText = itineraryStops.map((s, i) =>
      `${String(i + 1).padStart(2, "0")}. ${s.name}${s.address ? " — " + s.address : ""}`
    ).join("\\n");

    const ics = [
      "BEGIN:VCALENDAR",
      "VERSION:2.0",
      "PRODID:-//outdone//EN",
      "BEGIN:VEVENT",
      `DTSTART;VALUE=DATE:${fmt(tripDate)}`,
      `DTEND;VALUE=DATE:${fmt(tripDate)}`,
      `SUMMARY:outdone: ${destName}`,
      `DESCRIPTION:${(itinerary.summary || "").replace(/,/g, "\\,")}\\n\\n${stopsText}`,
      `LOCATION:${destName}`,
      "END:VEVENT",
      "END:VCALENDAR",
    ].join("\r\n");

    const blob = new Blob([ics], { type: "text/calendar;charset=utf-8" });
    const link = document.createElement("a");
    link.href = URL.createObjectURL(blob);
    link.download = `outdone-${destName.replace(/\s+/g, "-").toLowerCase()}.ics`;
    link.click();
    URL.revokeObjectURL(link.href);
    setCalendarState("done");
    setTimeout(() => setCalendarState("idle"), 3000);
  }

  return (
    <div className={`app-shell${step === "login" ? " login-active" : ""}${step === "loading" ? " loading-active" : ""}${step === "result" ? " result-active" : ""}${step === "result" && itineraryBuilt ? " itinerary-final-active" : ""}`} ref={shellRef}>
      <nav className="navbar">
        <div className="nav-left-group nav-desktop">
          <svg className="nav-mark" width="24" height="24" viewBox="0 0 32 32" xmlns="http://www.w3.org/2000/svg" aria-label="outdone">
            <path d="M8 4 C8 10,24 10,24 16 C24 22,8 22,8 28" fill="none" stroke="#339989" strokeWidth="2.5" strokeLinecap="round" />
            <path d="M24 4 C24 10,8 10,8 16 C8 22,24 22,24 28" fill="none" stroke="#5EC4B5" strokeWidth="2.5" strokeLinecap="round" opacity="0.55" />
            <circle cx="16" cy="8.5" r="2" fill="#339989" />
            <circle cx="16" cy="16" r="2" fill="#339989" />
            <circle cx="16" cy="23.5" r="2" fill="#339989" />
          </svg>
          <div className="nav-steps nav-left">
            {[{ label: "Setup", value: "setup" }, { label: "Vibe", value: "mood" }, { label: "Result", value: "result" }].map((item, i) => {
              const order = ["setup", "mood", "result"];
              const active = step === item.value;
              const done = order.indexOf(step) > i || step === "loading";
              const disabled = item.value === "result" && !itinerary;
              return (
                <button type="button" className={active ? "active" : done ? "done" : ""} key={item.value} disabled={disabled} onClick={() => { if (!disabled) goTo(item.value); }}>
                  <i /> {item.label}
                </button>
              );
            })}
          </div>
        </div>
        <div className="nav-actions nav-desktop">
          <button className="btn-accent nav-subscribe" onClick={() => setShowSubscribe(true)}>Subscribe for updates</button>
        </div>

        <div className="nav-mobile">
          <button
            className={`hamburger${menuOpen ? " hamburger-open" : ""}`}
            onClick={() => setMenuOpen(o => !o)}
            aria-label="Menu"
          >
            <span /><span /><span />
          </button>
          <button className="btn-accent nav-subscribe" onClick={() => setShowSubscribe(true)}>Subscribe for updates</button>
        </div>

        {menuOpen && (
          <div className="mobile-drawer" onClick={() => setMenuOpen(false)}>
            <div className="mobile-drawer-inner" onClick={e => e.stopPropagation()}>
              <div className="drawer-header">
                <svg width="22" height="22" viewBox="0 0 32 32" xmlns="http://www.w3.org/2000/svg">
                  <path d="M8 4 C8 10,24 10,24 16 C24 22,8 22,8 28" fill="none" stroke="#339989" strokeWidth="2.5" strokeLinecap="round" />
                  <path d="M24 4 C24 10,8 10,8 16 C8 22,24 22,24 28" fill="none" stroke="#5EC4B5" strokeWidth="2.5" strokeLinecap="round" opacity="0.55" />
                  <circle cx="16" cy="8.5" r="2" fill="#339989" />
                  <circle cx="16" cy="16" r="2" fill="#339989" />
                  <circle cx="16" cy="23.5" r="2" fill="#339989" />
                </svg>
                <button className="drawer-close" onClick={() => setMenuOpen(false)} aria-label="Close menu">×</button>
              </div>
              <p className="mobile-drawer-label">Navigation</p>
              {[{ label: "Setup", value: "setup" }, { label: "Vibe", value: "mood" }, { label: "Result", value: "result" }].map((item, i) => {
                const order = ["setup", "mood", "result"];
                const active = step === item.value;
                const done = order.indexOf(step) > i || step === "loading";
                const disabled = item.value === "result" && !itinerary;
                return (
                  <button
                    type="button"
                    className={`drawer-item${active ? " drawer-item-active" : ""}${done ? " drawer-item-done" : ""}${disabled ? " drawer-item-disabled" : ""}`}
                    key={item.value}
                    disabled={disabled}
                    onClick={() => { if (!disabled) { goTo(item.value); setMenuOpen(false); } }}
                  >
                    <span className="drawer-dot" />
                    {item.label}
                    {done && !active && <span className="drawer-check">✓</span>}
                  </button>
                );
              })}
            </div>
          </div>
        )}
      </nav>

      {step === "login" && (
        <div className="lp-shell">
          <div className="lp-bg-outer">
            {moodVibes.map((v, i) => (
              <img
                key={v.id}
                src={v.img}
                alt=""
                className={`lp-bg-outer-img lp-bg-slide${i === loginSlide ? " lp-bg-live" : ""}`}
              />
            ))}
            <div className="lp-bg-outer-dim" />
          </div>

          <div className="lp-card">
            <div className="lp-card-left">
              <div className="lp-right-text">
                <p className="lp-eyebrow">Powered by AI ✦</p>
                <h1 className="lp-h1">Plan<br /><span className="lp-accent">in seconds.</span></h1>
                <p className="lp-sub"> Just tell us your trip details and your vibe, and get curated recommendations</p>
              </div>

              <div className="lp-actions">
                {/* Desktop: real Google iframe renders here */}
                <div className="lp-google-wrap">
                  <div id="googleSignIn" />
                  {!googleReady && GOOGLE_CLIENT_ID && <div className="google-loading">Loading…</div>}
                </div>
                {/* Mobile: plain visible button, triggers Google prompt() on click */}
                {GOOGLE_CLIENT_ID && (
                  <button
                    className="lp-google-btn-mobile"
                    onClick={() => window.google?.accounts?.id?.prompt()}
                  >
                    <svg width="18" height="18" viewBox="0 0 18 18" style={{ flexShrink: 0 }}>
                      <path d="M17.64 9.2c0-.637-.057-1.251-.164-1.84H9v3.481h4.844c-.209 1.125-.843 2.078-1.796 2.717v2.258h2.908c1.702-1.567 2.684-3.874 2.684-6.615z" fill="#4285F4" />
                      <path d="M9 18c2.43 0 4.467-.806 5.956-2.18l-2.908-2.259c-.806.54-1.837.86-3.048.86-2.344 0-4.328-1.584-5.036-3.711H.957v2.332A8.997 8.997 0 0 0 9 18z" fill="#34A853" />
                      <path d="M3.964 10.71A5.41 5.41 0 0 1 3.682 9c0-.593.102-1.17.282-1.71V4.958H.957A8.996 8.996 0 0 0 0 9c0 1.452.348 2.827.957 4.042l3.007-2.332z" fill="#FBBC05" />
                      <path d="M9 3.58c1.321 0 2.508.454 3.44 1.345l2.582-2.58C13.463.891 11.426 0 9 0A8.997 8.997 0 0 0 .957 4.958L3.964 7.29C4.672 5.163 6.656 3.58 9 3.58z" fill="#EA4335" />
                    </svg>
                    Continue with Google
                  </button>
                )}
                <button className="lp-ghost-btn" onClick={() => goTo("setup")}>
                  Continue without sign in
                  <svg width="16" height="16" viewBox="0 0 16 16" fill="none"><path d="M3 8h10M9 4l4 4-4 4" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round" /></svg>
                </button>
              </div>

              <p className="lp-fine">No account needed. Sign in later to save itineraries.</p>
              <div className="lp-legal-links">
                <a href="/privacy.html">Privacy Policy</a>
                <span>·</span>
                <a href="/terms.html">Terms of Use</a>
              </div>
            </div>

            <div className="lp-card-right">
              {/* The "captured" wallpaper — condenses into the frame on each cycle */}
              <img key={`win-${loginSlide}`} src={moodVibes[loginSlide].img} alt="" className="lp-window-img" />
              <div className="lp-panel-overlay" />
              <span key={`tag-${loginSlide}`} className="lp-window-mood">
                <span className="lp-window-mood-icon">{moodVibes[loginSlide].icon}</span>
                {moodVibes[loginSlide].title}
              </span>
              <div className="lp-panel-itin" key={`itin-${loginSlide}`}>
                {(loginItins[moodVibes[loginSlide].id] || loginItins.cultural).map(([, label], i) => (
                  <div key={label} className={`lp-itin-line lp-itin-drop`} style={{ animationDelay: `${.25 + i * .16}s` }}>
                    <span className="lp-itin-label">{label}</span>
                  </div>
                ))}
              </div>
            </div>
          </div>
        </div>
      )}

      {step === "privacy" && (
        <LegalPage
          title="Privacy Policy"
          eyebrow="Legal"
          onBack={() => goTo("login")}
          sections={[
            ["What outdone Collects", "outdone may collect the trip details you enter, such as destination, date, travel vibe, dietary preference, travel group, and optional activity requests. If you use Google sign-in, we receive basic profile information from Google, such as your name, email address, and profile picture."],
            ["How We Use Information", "We use this information to generate travel suggestions, improve the prototype experience, support sign-in, and help you save or share itineraries when those features are available."],
            ["Google Sign-In", "Google sign-in is optional. Authentication is handled by Google. outdone does not receive or store your Google password."],
            ["Third-Party Services", "outdone may use Google Maps, Google Places, Gemini, and hosting services such as Vercel to generate recommendations, show maps, enrich place details, and run the application."],
            ["Data Storage", "This prototype may store limited information locally in your browser, such as subscription email entries or temporary itinerary state. Production storage may change as the product evolves."],
            ["Contact", "For privacy questions, contact Sanjana Venkat through the repository or project contact channel."]
          ]}
        />
      )}

      {step === "terms" && (
        <LegalPage
          title="Terms of Use"
          eyebrow="Legal"
          onBack={() => goTo("login")}
          sections={[
            ["Prototype Use", "outdone is a prototype travel-planning tool. Recommendations are generated from user input and third-party services and may be incomplete, outdated, unavailable, or inaccurate."],
            ["Travel Decisions", "You are responsible for confirming opening hours, safety conditions, prices, accessibility, booking requirements, transportation, and local rules before visiting any place."],
            ["Bookings and External Links", "Links to booking pages, Google Maps, restaurants, attractions, or other third-party websites are provided for convenience. outdone is not responsible for third-party content, availability, pricing, or transactions."],
            ["Accounts", "If you sign in with Google, you agree to provide accurate account information and to use the application lawfully."],
            ["Ownership", "The outdone interface, branding, design, and prototype content are owned by Sanjana Venkat unless otherwise noted."],
            ["Changes", "These terms may be updated as the prototype evolves."]
          ]}
        />
      )}

      {step === "setup" && (
        <main className="screen setup-screen on">
          <section className="setup-header">
            <p className="label">Step 1 of 2 - Setup</p>
            <h2>Let's get the basics.</h2>
            <p>Where you are, when you're going, and the few constraints that actually matter.</p>
          </section>

          <div className="setup-stack">
            <div className="setup-card">
              <span className="setup-card-label">DESTINATION</span>
              <input
                value={destination}
                onChange={(e) => {
                  setDestination(e.target.value);
                  setShowDestinationSuggestions(true);
                }}
                onFocus={() => {
                  setShowDestinationSuggestions(true);
                }}
                onBlur={() => setTimeout(() => setShowDestinationSuggestions(false), 140)}
                placeholder={showDestinationSuggestions ? "" : "City, neighborhood, country"}
                autoComplete="off"
                className="setup-card-input"
              />
              {showDestinationSuggestions && destination.trim().length >= 2 && !destinationOptions.find(o => o.label === destination) && (
                <div className="setup-suggestions">
                  {destinationOptions.map((item) => (
                    <button
                      type="button"
                      key={item.placeId || item.label}
                      className="setup-sug"
                      onMouseDown={(e) => e.preventDefault()}
                      onClick={() => { setDestination(item.label); setPlacePredictions([]); setShowDestinationSuggestions(false); }}
                    >
                      {item.label}
                    </button>
                  ))}
                  {isAutocompleting && destinationOptions.length === 0 && <div className="autocomplete-loading">Searching...</div>}
                  {!isAutocompleting && destinationOptions.length === 0 && autocompleteError && <div className="autocomplete-loading">{autocompleteError}</div>}
                  {!isAutocompleting && destinationOptions.length === 0 && !autocompleteError && <div className="autocomplete-loading">No suggestions yet. Keep typing or press Next.</div>}
                </div>
              )}
              <div className="setup-card-divider" />
              <span className="setup-card-label">END <span className="setup-card-optional">— optional</span></span>
              <input
                type="text"
                value={endDestination}
                onChange={(e) => {
                  setEndDestination(e.target.value);
                  setShowEndDestinationSuggestions(true);
                }}
                onFocus={() => setShowEndDestinationSuggestions(true)}
                onBlur={() => setTimeout(() => setShowEndDestinationSuggestions(false), 140)}
                placeholder={showEndDestinationSuggestions ? "" : "Back home or Hotel"}
                className="setup-card-input"
                autoComplete="off"
              />
              {showEndDestinationSuggestions && endDestination.trim().length >= 2 && !endDestinationOptions.find((option) => option.label === endDestination) && (
                <div className="setup-suggestions end-destination-suggestions">
                  {endDestinationOptions.map((item) => (
                    <button
                      type="button"
                      key={item.placeId || item.label}
                      className="setup-sug"
                      onMouseDown={(event) => event.preventDefault()}
                      onClick={() => {
                        setEndDestination(item.label);
                        setEndPlacePredictions([]);
                        setShowEndDestinationSuggestions(false);
                      }}
                    >
                      {item.label}
                    </button>
                  ))}
                  {isEndAutocompleting && endDestinationOptions.length === 0 && <div className="autocomplete-loading">Searching...</div>}
                  {!isEndAutocompleting && endDestinationOptions.length === 0 && endAutocompleteError && <div className="autocomplete-loading">{endAutocompleteError}</div>}
                  {!isEndAutocompleting && endDestinationOptions.length === 0 && !endAutocompleteError && <div className="autocomplete-loading">No suggestions yet. Keep typing or leave this blank.</div>}
                </div>
              )}
            </div>

            <div className="setup-card">
              <span className="setup-card-label">WHEN</span>
              <input
                type="text"
                value={dateInput}
                onChange={(event) => {
                  const nextValue = formatDateDraft(event.target.value);
                  setDateInput(nextValue);
                  const parsedDate = parseDateInput(nextValue);
                  if (parsedDate) setDate(parsedDate);
                }}
                onBlur={() => {
                  if (!parseDateInput(dateInput)) setDateInput(formatDateForInput(date));
                }}
                placeholder="MM/DD/YYYY"
                inputMode="numeric"
                maxLength={10}
                aria-label="Date in MM/DD/YYYY format"
                className="setup-card-input"
              />
              <div className="setup-card-divider" />
              <span className="setup-card-label">TIME RANGE <span className="setup-card-optional">— optional</span></span>
              <div className="setup-time-grid">
                <label>
                  <span className="setup-time-label">START</span>
                  <input
                    type="time"
                    value={startTime}
                    onChange={(event) => setStartTime(event.target.value)}
                    aria-label="Start time"
                    className="setup-card-input"
                  />
                </label>
                <label>
                  <span className="setup-time-label">END</span>
                  <input
                    type="time"
                    value={endTime}
                    onChange={(event) => setEndTime(event.target.value)}
                    aria-label="End time"
                    className="setup-card-input"
                  />
                </label>
              </div>
            </div>

            <div className="setup-card">
              <span className="setup-card-label">DIETARY PREFERENCE</span>
              <div className="chips">
                {["Vegetarian", "Vegan", "No restrictions", "Gluten-free"].map(o => (
                  <button key={o} type="button" className={diet === o ? "chip active" : "chip"} onClick={() => setDiet(o)}>{o}</button>
                ))}
              </div>
            </div>

            <div className="setup-card">
              <span className="setup-card-label">GOING WITH</span>
              <div className="chips">
                {["Solo", "Date", "Friends", "Family", "Colleagues", "Kid friendly"].map(o => (
                  <button key={o} type="button" className={planFor === o ? "chip active" : "chip"} onClick={() => setPlanFor(o)}>{o}</button>
                ))}
              </div>
            </div>

            {/* TRANSPORT */}
            <div className="setup-card">
              <span className="setup-card-label">GETTING AROUND <span className="setup-card-optional">— optional</span></span>
              <div className="chips">
                {["Walking", "Car", "Public transit"].map(o => (
                  <button key={o} type="button" className={transportMode === o ? "chip active" : "chip"} onClick={() => setTransportMode(t => t === o ? "" : o)}>{o}</button>
                ))}
              </div>
            </div>

            {user && (
              <div className="partnership-box">
                <div className="profile-chip">
                  <img src={user.picture} alt="" />
                  <span className="profile-chip-name">{user.name}</span>
                </div>
                <p className="partnership-copy">
                  Soon, with your Google data, we might already know you're in Paris, that you're vegan, and who you're traveling with, so we can skip most of this.
                  <br /><br />
                  But one thing we probably shouldn't assume is how you <em>feel today</em>.
                </p>
              </div>
            )}

            <button className="btn-accent hover-arrow hover-arrow-forward" disabled={!destination.trim()} onClick={() => goTo("mood")}>Next, your vibe</button>
          </div>
        </main>
      )}

      {step === "mood" && (
        <main className="screen mood-screen on">
          <section className="mood-header">
            <p className="label">Step 2 of 2 - Vibe</p>
            <h2>What's the <span className="gem">vibe today?</span></h2>
            <p>
              Maybe yesterday you wanted museums. Today you want beach sunsets.
              That's why we're asking. Pick up to three vibes and we'll do the magic.
            </p>
          </section>
          <section className="mood-grid image-grid">
            {moodVibes.map((vibe, index) => (
              <button type="button" key={vibe.id} className={selectedMoods.includes(vibe.id) ? "image-mood-tile active" : "image-mood-tile"} onClick={() => toggleMood(vibe.id)}>
                <img src={vibe.img} alt={vibe.title} loading="lazy" />
                <span className="tile-number">{String(index + 1).padStart(2, "0")}</span>
                <span className={selectedMoods.includes(vibe.id) ? "tile-check active" : "tile-check"}>
                  {selectedMoods.includes(vibe.id) && (
                    <svg viewBox="0 0 24 24" width="14" height="14" fill="none">
                      <path d="M5 12.5L10 17.5L19 7.5" stroke="#fff" strokeWidth="2.6" strokeLinecap="round" strokeLinejoin="round" />
                    </svg>
                  )}
                </span>
                <div className="image-tile-overlay" />
                <div className="image-tile-content">
                  <strong>{vibe.title}</strong>
                  <p>{vibe.tag}</p>
                </div>
              </button>
            ))}
          </section>

          <div className="custom-activity-wrap requirements-wrap">
            <div className="action-search">
              <label className="action-search-label" htmlFor="requirements">ANY SPECIFIC REQUIREMENTS? <em>— optional but powerful</em></label>
              <div className={`action-search-bar${requirementsFocus ? " action-search-open" : ""}`}>
                <svg className="action-search-icon" width="20" height="20" viewBox="0 0 20 20" fill="none"><circle cx="9" cy="9" r="6.5" stroke="currentColor" strokeWidth="1.6" /><path d="M14 14l3.5 3.5" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" /></svg>
                <div className="action-search-field">
                  {requirementChips.map((requirement) => (
                    <span key={requirement} className="activity-chip">
                      {requirement}
                      <button type="button" className="activity-chip-x" onMouseDown={(event) => { event.preventDefault(); setRequirementChips((items) => items.filter((item) => item !== requirement)); }} aria-label={`Remove ${requirement}`}>×</button>
                    </span>
                  ))}
                  <input
                    id="requirements"
                    type="text"
                    value={requirements}
                    onChange={(event) => setRequirements(event.target.value)}
                    onFocus={() => setRequirementsFocus(true)}
                    onBlur={() => setTimeout(() => setRequirementsFocus(false), 150)}
                    onKeyDown={(event) => {
                      if (event.key === "Enter" && requirements.trim()) {
                        event.preventDefault();
                        commitRequirement(requirements);
                      }
                      if (event.key === "Backspace" && !requirements && requirementChips.length) {
                        setRequirementChips((items) => items.slice(0, -1));
                      }
                    }}
                    placeholder={requirementChips.length ? "Add another…" : "Type anything like 'restaurants within $10–$20' and hit enter or select suggestions…"}
                    maxLength={240}
                    autoComplete="off"
                  />
                </div>
                {(requirements || requirementChips.length > 0) && <button className="action-search-clear" type="button" onMouseDown={(event) => { event.preventDefault(); setRequirements(""); setRequirementChips([]); }} aria-label="Clear requirements">×</button>}
              </div>

              {requirementsFocus && (() => {
                const moodPhrases = (selectedMoods.length ? selectedMoods : ["romantic", "adventurous", "culinary"])
                  .flatMap((id) => (moodActivitySuggestions[id] || []).map((activity) => ({ activity, mood: moodVibes.find((vibe) => vibe.id === id)?.title || "Idea" })));
                const query = requirements.trim().toLowerCase();
                const contextualPhrases = contextualRequirementSuggestions({ query, destination, planFor, diet, transportMode })
                  .map((activity) => ({ activity, mood: "For your setup", contextual: true }));
                const pool = [
                  ...contextualPhrases,
                  ...universalRequirementSuggestions.map((activity) => ({ activity, mood: "Requirement" })),
                  ...moodPhrases,
                ];
                const filtered = pool.filter((item, index) => pool.findIndex((candidate) => candidate.activity === item.activity) === index)
                  .filter((item) => item.contextual || !query || item.activity.toLowerCase().includes(query))
                  .slice(0, 8);
                if (!filtered.length) return null;
                return (
                  <div className="action-search-panel">
                    <p className="action-search-panel-label">{query ? "Suggestions for your setup" : "To get you started"}</p>
                    {filtered.map((item, index) => {
                      const picked = requirementChips.includes(item.activity);
                      return (
                        <button
                          key={item.activity}
                          type="button"
                          className={`action-search-item${picked ? " asi-picked" : ""}`}
                          style={{ animationDelay: `${index * 35}ms` }}
                          onMouseDown={(event) => {
                            event.preventDefault();
                            setRequirementChips((items) => picked ? items.filter((entry) => entry !== item.activity) : [...items, item.activity]);
                            setRequirements("");
                          }}
                        >
                          <span className="asi-spark">{picked ? "✓" : "✦"}</span>
                          <span className="asi-name">{item.activity}</span>
                          <span className="asi-mood">{item.mood}</span>
                        </button>
                      );
                    })}
                  </div>
                );
              })()}
            </div>
          </div>

          <section className="build-cta-row">
            <button className="btn-accent" onClick={() => generatePlan()} disabled={isGenerating}>
              {isGenerating && <span className="button-spinner" aria-hidden="true" />} {isGenerating ? "Generating…" : "Generate the plan"}
            </button>
          </section>
        </main>
      )}

      {step === "loading" && (
        <main className="loading-screen on">
          {(() => {
            const messages = ["Finding places that match your mood", "Checking hours and distance", "Putting your day in the right order"];
            const messageIndex = Math.min(messages.length - 1, travelScene);
            const destinationLabel = destination.split(",")[0].trim() || "your destination";
            return (
              <>
                <header className="traveler-loader-title">
                  <p>{destination || "Your trip"}</p>
                  <h2>Building your itinerary</h2>
                  <div className="traveler-message-stack" aria-live="polite">
                    {messages.map((message, index) => <span className={index === messageIndex ? "active" : index < messageIndex ? "done" : ""} key={message}>{index < messageIndex ? "✓" : "✦"} {message}</span>)}
                  </div>
                </header>

                <FlightGame destination={destination} destinationLabel={destinationLabel} progressText={messages[messageIndex]} />
              </>
            );
          })()}

        </main>
      )}

      {step === "apiError" && (
        <main className="screen loading-screen on">
          <div className="api-error-card">
            <p className="label">outdone preview</p>
            <h2>The planning backend seems to be down.</h2>
            <p>Please try again later.</p>
            <div className="error-actions">
              <button className="btn-outline" onClick={() => goTo("setup")}>Edit setup</button>
              <button className="btn-accent" onClick={() => generatePlan()}>Try again ✦</button>
            </div>
          </div>
        </main>
      )}

      {step === "result" && (
        <main className={`rec-screen builder-screen on${itineraryBuilt ? " itinerary-built" : ""}${!itineraryBuilt && !activeStop.name ? " suggestion-refine-active" : ""}`}>
          <div className="builder-layout">
            <section className="builder-photo-pane">
              <img key={cardIndex} className="builder-photo-img" src={stopImage(activeStop.name ? activeStop : refinementPreviewStop, cardIndex)} alt="" />
              <div className="builder-photo-ov" />
              <div className="builder-photo-meta">
                {itineraryBuilt && <button className="hero-back-button hover-arrow hover-arrow-back" type="button" onClick={returnToSuggestions}>Back to suggestions</button>}
                <p>{itinerary?.dates || prettyDate(date)}</p>
                <h2>{itinerary?.destination || destination}</h2>
              </div>

              <button className="mobile-selected-pill" type="button" onClick={() => setMobileTrayOpen(true)}>
                <span>{selectedStops.length}</span>
                Selected
              </button>

              <div className="selected-tray">
                {itineraryBuilt && selectedStops.length > 1 && <p className="selected-sort-label">Drag to sort</p>}
                <div className="selected-tray-row">
                  {selectedStops.map((stop, i) => (
                    <article
                      key={`${stop.name}-${i}`}
                      className="selected-mini-card"
                      draggable
                      onDragStart={() => setDragIndex(i)}
                      onDragOver={(e) => e.preventDefault()}
                      onDrop={() => { moveSelectedStop(dragIndex, i); setDragIndex(null); }}
                    >
                      <img src={stopImage(stop, i)} alt="" />
                      <button type="button" onClick={() => removeSelectedStop(i)} aria-label="Remove from itinerary">×</button>
                      <span>{String(i + 1).padStart(2, "0")}</span>
                      <p>{stop.name}</p>
                    </article>
                  ))}
                </div>
              </div>
            </section>

            <section className="builder-panel">
              {!itineraryBuilt ? (
                <>
                  {activeStop.name ? (
                    <>
                  <header className="builder-panel-head">
                    <p className="rec-head-eyebrow">Suggestions · {String(cardIndex + 1).padStart(2, "0")} / {String(suggestionStops.length || 1).padStart(2, "0")}</p>
                    <h2 className="rec-head-dest">Choose your suggestions</h2>
                  </header>

                  <article
                    className={`suggestion-card${addedStopName === activeStop.name ? " suggestion-card-added" : ""}`}
                    onTouchStart={(e) => { swipeStartXRef.current = e.touches[0].clientX; }}
                    onTouchEnd={(e) => {
                      const dx = e.changedTouches[0].clientX - (swipeStartXRef.current ?? e.changedTouches[0].clientX);
                      if (dx > 64) addStopToItinerary(activeStop);
                      if (dx < -64) discardCurrentStop();
                      swipeStartXRef.current = null;
                    }}
                  >
                    <button className={`rec-heart suggestion-save${addedStopName === activeStop.name ? " suggestion-save-done" : ""}`} onClick={() => addStopToItinerary(activeStop)} aria-label="Add to plan">
                      {addedStopName === activeStop.name ? (
                        <svg width="19" height="19" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.4" strokeLinecap="round" strokeLinejoin="round"><path d="M5 12.5l4.5 4.5L19 7" /></svg>
                      ) : (
                        <svg width="19" height="19" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M12 5v14M5 12h14" /></svg>
                      )}
                    </button>

                    <div className="rec-card-inner suggestion-inner">
                      <p className="rec-card-cat">{activeStop.category || "Suggestion"}</p>
                      <div className="rec-card-timerow">
                        {activeMoodMatches.map((mood) => <span className="rec-card-pill mood-pill" key={mood.id}>{mood.title}</span>)}
                        {priceRange(activeStop.priceLevel) && <span className="rec-card-pill budget-pill">{priceLabel(activeStop.priceLevel)} · {priceRange(activeStop.priceLevel)}</span>}
                      </div>
                      <h3 className="rec-card-name">{activeStop.name || "More suggestions are loading"}</h3>
                      {activeStop.address && (
                        <a className="rec-card-addr" href={`https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(activeStop.address)}`} target="_blank" rel="noreferrer">
                          <svg width="11" height="11" viewBox="0 0 16 16" fill="none"><path d="M8 1.5C5.515 1.5 3.5 3.515 3.5 6c0 3.375 4.5 8.5 4.5 8.5S12.5 9.375 12.5 6c0-2.485-2.015-4.5-4.5-4.5z" stroke="currentColor" strokeWidth="1.5"/><circle cx="8" cy="6" r="1.5" stroke="currentColor" strokeWidth="1.5"/></svg>
                          {activeStop.address}
                        </a>
                      )}
                      <p className="rec-card-desc">{activePresentation.description}</p>
                      {activeDiscoveryLinks.length > 0 && (
                        <div className="source-links suggestion-source-row">
                          {activeDiscoveryLinks.map((source) => (
                            <a href={source.url} target="_blank" rel="noreferrer" key={source.url} className="source-link-social">
                              Found on {source.label}
                            </a>
                          ))}
                        </div>
                      )}
                      <div className="suggestion-evidence">
                        <section>
                          <h4><a href={activeStop.mapsUrl || `https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(activeStop.name || "")}`} target="_blank" rel="noreferrer">OPEN HOURS →</a></h4>
                          <p>{openingSummary(activeStop, date) || activeStop.openTimingGuidance || "Confirm hours before visiting."}</p>
                          {specialTimingNote(activeStop) && <p className="evidence-note">{specialTimingNote(activeStop)}</p>}
                          {openTableBookingUrl(activeStop, destination, date, planFor) && (
                            <a className="rec-card-book evidence-book-link" href={openTableBookingUrl(activeStop, destination, date, planFor)} target="_blank" rel="noreferrer">
                              Find a table on OpenTable
                              <svg width="12" height="12" viewBox="0 0 16 16" fill="none"><path d="M3 8h10M9 4l4 4-4 4" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round"/></svg>
                            </a>
                          )}
                        </section>
                        <section>
                          <h4><a href={activeStop.mapsUrl || `https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(activeStop.name || "")}`} target="_blank" rel="noreferrer">WHAT PEOPLE SAY →</a></h4>
                          {activeReviews.length ? (
                            <div className="review-quotes">
                              {activeReviews.slice(0, 1).map((review, index) => <blockquote key={`${review.author || "review"}-${index}`}>“{review.quote || review.text}”{review.author && <cite>— {review.author}</cite>}</blockquote>)}
                            </div>
                          ) : activeStop.rating ? (
                            <p className="google-review-summary">★ {activeStop.rating}{activeStop.userRatingCount ? ` from ${Number(activeStop.userRatingCount).toLocaleString()} Google reviews` : " on Google Maps"}.</p>
                          ) : <p><a href={activeStop.mapsUrl || `https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(activeStop.name || "")}`} target="_blank" rel="noreferrer">Read recent reviews on Google Maps</a>.</p>}
                        </section>
                      </div>
                    </div>

                    <div className="suggestion-actions">
                      <button type="button" onClick={() => addStopToItinerary(activeStop)}>Add to plan</button>
                      <button type="button" onClick={discardCurrentStop}>Skip</button>
                    </div>
                  </article>
                  {selectedStops.length > 0 && (
                    <button type="button" className="builder-create-plan" onClick={runAiOutdo} disabled={outdoLoading}>
                      {outdoLoading && <span className="button-spinner" aria-hidden="true" />} {outdoLoading ? "Generating itinerary…" : "Generate itinerary"}
                    </button>
                  )}
                    </>
                  ) : (
                    <section className="suggestion-refine-card">
                      <p className="rec-head-eyebrow">YOU’VE SEEN EVERY SUGGESTION</p>
                      <h2>Want more suggestions or changes?</h2>
                      <p>Tell us what was missing and we’ll research another set without losing the places you selected.</p>
                      <form onSubmit={generateMoreSuggestions}>
                        <input value={refinement} onChange={(event) => setRefinement(event.target.value)} placeholder="Try ‘more live music, less walking’" aria-label="Changes for new suggestions" />
                        <button className="btn-accent" type="submit" disabled={!refinement.trim() || isRefining}>{isRefining && <span className="button-spinner" aria-hidden="true" />} {isRefining ? "Researching…" : "Find more"}</button>
                      </form>
                      {selectedStops.length > 0 && <button type="button" className="refine-itinerary-button" onClick={runAiOutdo} disabled={outdoLoading}>{outdoLoading && <span className="button-spinner" aria-hidden="true" />} {outdoLoading ? "Arranging…" : "View selected itinerary"}</button>}
                      {error && <p className="refine-error">{error}</p>}
                      <button type="button" className="text-button" onClick={() => setCardIndex(0)}>Review these suggestions again</button>
                    </section>
                  )}
                </>
              ) : (
                <section className="builder-timeline">
                  <header className="builder-panel-head">
                    <p className="rec-head-eyebrow">{selectedStops.length} {selectedStops.length === 1 ? "stop" : "stops"} · {itinerary?.dates || prettyDate(date)}</p>
                    <h2 className="rec-head-dest">Your itinerary</h2>
                    {itinerary?.optimization?.distanceMeters > 0 && <p className="itinerary-total-distance">Total distance: {formatTripDistance(itinerary.optimization.distanceMeters, destination)}</p>}
                    <div className="builder-final-actions">
                      {tripMapsUrl && <a className="rec-card-book builder-maps-link" href={tripMapsUrl} target="_blank" rel="noreferrer">Google Maps</a>}
                      <div className="builder-icon-stack">
                        <button className={`builder-icon-btn${calendarState === "done" ? " icon-btn-active" : ""}`} type="button" onClick={addToCalendar} aria-label="Add to calendar" data-label={calendarState === "done" ? "Added" : "Add to calendar"}>
                          <svg width="18" height="18" viewBox="0 0 24 24" fill="none"><rect x="4" y="5" width="16" height="15" rx="3" stroke="currentColor" strokeWidth="2"/><path d="M8 3v4M16 3v4M4 10h16" stroke="currentColor" strokeWidth="2" strokeLinecap="round"/></svg>
                        </button>
                        <button className="builder-icon-btn" type="button" onClick={shareItinerary} aria-label="Share" data-label={shareCopied ? "Copied" : "Share"}>
                          <svg width="18" height="18" viewBox="0 0 24 24" fill="none"><path d="M8 12l8-5M8 12l8 5" stroke="currentColor" strokeWidth="2" strokeLinecap="round"/><circle cx="6" cy="12" r="3" stroke="currentColor" strokeWidth="2"/><circle cx="18" cy="6" r="3" stroke="currentColor" strokeWidth="2"/><circle cx="18" cy="18" r="3" stroke="currentColor" strokeWidth="2"/></svg>
                        </button>
                        <button className="builder-icon-btn" type="button" onClick={() => goTo("mood")} aria-label="Edit vibe" data-label="Edit vibe">
                          <svg width="18" height="18" viewBox="0 0 24 24" fill="none"><path d="M4 20h4l10.5-10.5a2.8 2.8 0 0 0-4-4L4 16v4z" stroke="currentColor" strokeWidth="2" strokeLinejoin="round"/><path d="M13 7l4 4" stroke="currentColor" strokeWidth="2" strokeLinecap="round"/></svg>
                        </button>
                        <button className="builder-icon-btn" type="button" onClick={() => generatePlan()} aria-label="Regenerate" data-label="Regenerate">
                          <svg width="18" height="18" viewBox="0 0 24 24" fill="none"><path d="M20 6v5h-5M4 18v-5h5" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/><path d="M18.5 10a7 7 0 0 0-12-3M5.5 14a7 7 0 0 0 12 3" stroke="currentColor" strokeWidth="2" strokeLinecap="round"/></svg>
                        </button>
                      </div>
                    </div>
                  </header>
                  <div className="timeline compact-timeline">
                    {itineraryStops.map((stop, i) => (
                      <article
                        className={`stop${i === activeTimelineIndex ? " stop-active" : ""}`}
                        key={`${stop.name}-${i}`}
                        ref={(node) => { timelineRefs.current[i] = node; }}
                        data-index={i}
                      >
                        <div className="s-pin"><span className="s-pin-index">{String(i + 1).padStart(2, "0")}</span></div>
                        <div className="s-body">
                          <p className="s-cat">{stop.category}</p>
                          <h4>{stop.name}</h4>
                          <div className="place-meta prominent">
                            {stop.rating && <a className="rating-pill" href={`https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(stop.googlePlaceName || stop.name)}`} target="_blank" rel="noreferrer">★ {stop.rating}</a>}
                            {(() => {
                              const timing = scheduledOpenStatus(stop, date);
                              const special = stop.specialHoursMetadata?.hasExceptionalHours || stop.specialHoursStatus === "special";
                              return <span className={special ? "special-hours-pill" : ""}>{special ? `Special hours · ${timing.label}` : timing.label}</span>;
                            })()}
                            {priceRange(stop.priceLevel) && <span>{priceRange(stop.priceLevel)}</span>}
                            {stop.address && <a href={`https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(stop.address)}`} target="_blank" rel="noreferrer">{stop.address}</a>}
                          </div>
                          <p>{concisePlaceDescription(stop.description)}</p>
                          {i > 0 && (stop.routeDistanceMeters != null || stop.routeFromPrevious) && <small className="consecutive-leg">{stop.routeDistanceMeters != null ? `${formatTripDistance(stop.routeDistanceMeters, destination)} from the previous stop${stop.routeDurationSeconds ? ` · about ${formatTripDuration(stop.routeDurationSeconds)}` : ""}` : stop.routeFromPrevious}</small>}
                          {(specialTimingNote(stop) || stop.travelTip || stop.bestTimeToVisit || stop.seasonalNote) && <p className={`opening-guidance${specialTimingNote(stop) ? " special-hours-guidance" : ""}`}>{specialTimingNote(stop) || stop.travelTip || stop.bestTimeToVisit || stop.seasonalNote}</p>}
                          {openTableBookingUrl(stop, destination, date, planFor) && (
                            <a className="rec-card-book itinerary-book-link" href={openTableBookingUrl(stop, destination, date, planFor)} target="_blank" rel="noreferrer">
                              Find a table on OpenTable
                              <svg width="12" height="12" viewBox="0 0 16 16" fill="none"><path d="M3 8h10M9 4l4 4-4 4" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round"/></svg>
                            </a>
                          )}
                        </div>
                      </article>
                    ))}
                  </div>
                </section>
              )}
            </section>
          </div>

        </main>
      )}

      {mobileTrayOpen && step === "result" && (
        <div className="mobile-tray-sheet" onClick={() => setMobileTrayOpen(false)}>
          <div className="mobile-tray-inner" onClick={(e) => e.stopPropagation()}>
            <div className="rec-more-grab" />
            <div className="mobile-tray-title"><strong>Selected stops</strong><span>Sort and remove</span></div>
            {selectedStops.map((stop, i) => (
              <article
                className={`mobile-sort-row${dragIndex === i ? " mobile-sort-row-dragging" : ""}`}
                key={`${stop.name}-${i}`}
                data-mobile-sort-index={i}
                onDragOver={(e) => e.preventDefault()}
                onDrop={() => { moveSelectedStop(dragIndex, i); setDragIndex(null); }}
              >
                <button
                  className="sort-icon"
                  type="button"
                  aria-label="Drag to reorder"
                  draggable
                  onDragStart={() => setDragIndex(i)}
                  onDragEnd={() => setDragIndex(null)}
                  onPointerDown={(event) => beginMobileSort(i, event)}
                  onPointerMove={moveMobileSort}
                  onPointerUp={endMobileSort}
                  onPointerCancel={endMobileSort}
                >
                  ☰
                </button>
                <img src={stopImage(stop, i)} alt="" />
                <p>{stop.name}</p>
                <button type="button" onClick={() => removeSelectedStop(i)}>×</button>
              </article>
            ))}
            {!itineraryBuilt && <button className="rec-mbar-btn rec-mbar-primary" disabled={!selectedStops.length || outdoLoading} onClick={runAiOutdo}>{outdoLoading && <span className="button-spinner" aria-hidden="true" />} {outdoLoading ? "Generating itinerary…" : "Generate itinerary"}</button>}
          </div>
        </div>
      )}

      {showSubscribe && (
        <div className="modal-backdrop" role="dialog" aria-modal="true">
          <div className="subscribe-modal glass-panel">
            <button className="modal-close" type="button" onClick={() => { setShowSubscribe(false); setSubscribeSaved(false); }}>×</button>
            <div className="spark">✦</div>
            <p className="label">Early access</p>
            <h2>Like this idea?</h2>
            <p>outdone is running in demo mode right now. Live recommendations require successful Gemini and Google Places research, so generation pauses clearly when those services are unavailable.</p>
            <p>Subscribe to get updates when live personalization, better Google Places photos, saved preferences, and richer planning are ready.</p>
            <form className="subscribe-form" onSubmit={(event) => {
              event.preventDefault();
              if (!subscribeEmail.trim()) return;
              const existing = JSON.parse(localStorage.getItem("travelDnaSubscribers") || "[]");
              localStorage.setItem("travelDnaSubscribers", JSON.stringify([...existing, subscribeEmail.trim()]));
              setSubscribeSaved(true);
            }}>
              <input type="email" placeholder="you@example.com" value={subscribeEmail} onChange={(event) => setSubscribeEmail(event.target.value)} required />
              <button className="btn-accent" type="submit">Keep me updated</button>
            </form>
            {subscribeSaved && <div className="subscribe-success">You're on the list. For now this is saved locally for the prototype.</div>}
          </div>
        </div>
      )}
      {step !== "loading" && step !== "result" && (
        <footer className="app-footer text-sm text-gray-500 text-center py-8">
          © 2026 Sanjana Venkat. All rights reserved.
        </footer>
      )}
    </div>
  );
}

function LegalPage({ eyebrow, title, sections, onBack }) {
  return (
    <main className="screen legal-screen on">
      <section className="legal-card">
        <button className="legal-back hover-arrow hover-arrow-back" type="button" onClick={onBack}>Back to sign in</button>
        <p className="label">{eyebrow}</p>
        <h2>{title}</h2>
        <p className="legal-updated">Last updated: July 9, 2026</p>
        <div className="legal-sections">
          {sections.map(([heading, body]) => (
            <section key={heading}>
              <h3>{heading}</h3>
              <p>{body}</p>
            </section>
          ))}
        </div>
      </section>
    </main>
  );
}

function Select({ label, value, setValue, options }) {
  return (
    <div className="field-block">
      <p className="field-label">{label}</p>
      <div className="chips">
        {options.map((option) => (
          <button type="button" className={value === option ? "chip active" : "chip"} onClick={() => setValue(option)} key={option}>{option}</button>
        ))}
      </div>
    </div>
  );
}

// Vite HMR re-runs this module's top-level code on every edit. Without
// reusing the root across reloads, createRoot() mounts a second <App/>
// onto the same DOM node each time, stacking duplicate content on screen.
const rootContainer = document.getElementById("root");
const root = import.meta.hot?.data.root || createRoot(rootContainer);
if (import.meta.hot) {
  import.meta.hot.data.root = root;
  import.meta.hot.accept();
}
root.render(<App />);
