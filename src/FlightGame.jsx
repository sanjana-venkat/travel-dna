import React, { useEffect, useMemo, useRef, useState } from "react";

/*
  FlightGame — canvas mini-game for the loading screen.
  Fly a plane through approaching gates. Speed ramps up gently over time.
  Steer with arrow keys / WASD, or drag with mouse / touch.
  Every 5 missed gates → a true/false trivia question, picked from a built-in
  bank matched against the destination (no network calls), with a generic
  world-travel set as fallback.
  Levels rotate through three environments: sky → water → ground.
*/

const MISSES_PER_QUESTION = 5;
const GATES_PER_LEVEL = 6;

const FALLBACK_TRIVIA = [
  { q: "The Eiffel Tower gets about 15 cm taller in summer.", a: true, why: "Heat expands the iron, so it really does grow in warm months." },
  { q: "Australia is wider than the Moon.", a: true, why: "Australia spans ~4,000 km; the Moon's diameter is ~3,475 km." },
  { q: "The Great Wall of China is easily visible from space with the naked eye.", a: false, why: "Astronauts confirm it isn't — it's too narrow to spot unaided." },
  { q: "Venice is built on more than 100 small islands.", a: true, why: "Around 118 islands, laced together by 400+ bridges." },
  { q: "Mount Everest's peak is the closest point on Earth to outer space.", a: false, why: "Ecuador's Chimborazo is, thanks to Earth's equatorial bulge." },
  { q: "The Sahara is the largest desert on Earth.", a: false, why: "Antarctica is — a desert is defined by dryness, not sand." },
  { q: "Japan is made up of more than 6,000 islands.", a: true, why: "Official surveys count over 14,000 islands, 400+ inhabited." },
  { q: "The Dead Sea shoreline is the lowest dry land on Earth.", a: true, why: "It sits about 430 m below sea level." },
  { q: "Istanbul is the only major city that sits on two continents.", a: true, why: "It straddles Europe and Asia across the Bosphorus." },
  { q: "Canada has the longest coastline of any country.", a: true, why: "Over 200,000 km — more than the next five countries combined." },
  { q: "France spans more time zones than Russia.", a: true, why: "With overseas territories France covers 12 zones; Russia has 11." },
  { q: "Africa is the only continent in all four hemispheres.", a: true, why: "It crosses both the equator and the prime meridian." },
  { q: "The world's shortest scheduled flight lasts under two minutes.", a: true, why: "Westray to Papa Westray in Scotland: about 90 seconds." },
  { q: "There are more pyramids in Egypt than in any other country.", a: false, why: "Sudan has roughly twice as many pyramids as Egypt." }
];

// Local, hand-verified facts keyed by place. Matched against the destination
// string — city first, then state/country — so no network calls are needed.
const DESTINATION_TRIVIA = [
  { keys: ["dallas"], questions: [
    { q: "The frozen margarita machine was invented in Dallas.", a: true, why: "Mariano Martinez adapted a soft-serve machine for margaritas in 1971." },
    { q: "The Dallas Cowboys play their home games in downtown Dallas.", a: false, why: "AT&T Stadium is in Arlington, a neighboring city." },
    { q: "7-Eleven was founded in Dallas.", a: true, why: "It began in 1927 as the Southland Ice Company." },
    { q: "Dallas is the capital of Texas.", a: false, why: "Austin is the state capital." },
    { q: "German chocolate cake was popularized from a Dallas recipe.", a: true, why: "A 1957 Dallas newspaper recipe used Samuel German's baking chocolate." }
  ]},
  { keys: ["austin"], questions: [
    { q: "Austin's Congress Avenue Bridge shelters North America's largest urban bat colony.", a: true, why: "Up to 1.5 million bats emerge on summer evenings." },
    { q: "Austin is the largest city in Texas.", a: false, why: "Houston is the largest; Austin is the capital." },
    { q: "The SXSW festival started in Austin in the 1980s.", a: true, why: "South by Southwest launched there in 1987." }
  ]},
  { keys: ["houston"], questions: [
    { q: "'Houston' was the first word radioed from the Moon's surface.", a: true, why: "Apollo 11's first call was to NASA Mission Control in Houston." },
    { q: "Houston is the capital of Texas.", a: false, why: "Austin is the capital; Houston is the largest city." },
    { q: "NASA's Mission Control is located in Houston.", a: true, why: "The Johnson Space Center has run crewed missions since 1965." }
  ]},
  { keys: ["texas", "tx"], questions: [
    { q: "Texas was an independent country before joining the United States.", a: true, why: "The Republic of Texas existed from 1836 to 1845." },
    { q: "Texas is the largest US state by area.", a: false, why: "Alaska is more than twice its size." },
    { q: "The Alamo is located in San Antonio.", a: true, why: "The 1836 battle site sits in downtown San Antonio." },
    { q: "Texas generates more wind power than any other US state.", a: true, why: "It produces roughly a quarter of all US wind energy." }
  ]},
  { keys: ["new york", "nyc", "manhattan", "brooklyn"], questions: [
    { q: "The Statue of Liberty was a gift from France.", a: true, why: "France gave it in 1886 to mark friendship with the US." },
    { q: "Central Park is larger than the country of Monaco.", a: true, why: "The park is about 3.4 km²; Monaco is about 2 km²." },
    { q: "Manhattan is the largest New York borough by area.", a: false, why: "Queens is roughly four times bigger." },
    { q: "Times Square is named after The New York Times.", a: true, why: "It was renamed in 1904 when the paper moved there." },
    { q: "The New York subway shuts down every night.", a: false, why: "It's one of the few systems that runs 24 hours." }
  ]},
  { keys: ["los angeles", "hollywood", "santa monica"], questions: [
    { q: "The Hollywood Sign originally read 'Hollywoodland'.", a: true, why: "It advertised a 1923 housing development; 'land' was dropped in 1949." },
    { q: "Los Angeles is the capital of California.", a: false, why: "Sacramento is the state capital." },
    { q: "Los Angeles has hosted the Summer Olympics twice.", a: true, why: "In 1932 and 1984 — with a third coming in 2028." }
  ]},
  { keys: ["san francisco"], questions: [
    { q: "The Golden Gate Bridge is painted gold.", a: false, why: "Its color is officially 'International Orange'." },
    { q: "Alcatraz Island was once a federal prison.", a: true, why: "It held inmates like Al Capone from 1934 to 1963." },
    { q: "San Francisco's cable cars are a moving National Historic Landmark.", a: true, why: "They're the only moving landmark in the US." }
  ]},
  { keys: ["california"], questions: [
    { q: "Death Valley recorded the hottest air temperature ever measured on Earth.", a: true, why: "56.7°C (134°F) in 1913 — still the record." },
    { q: "San Francisco is the capital of California.", a: false, why: "Sacramento is the capital." },
    { q: "The world's largest tree grows in California.", a: true, why: "General Sherman, a giant sequoia, by volume." }
  ]},
  { keys: ["chicago"], questions: [
    { q: "The Chicago River is dyed green every St. Patrick's Day.", a: true, why: "A tradition since 1962." },
    { q: "Chicago sits on the shore of Lake Erie.", a: false, why: "It's on Lake Michigan." },
    { q: "The world's first skyscraper was built in Chicago.", a: true, why: "The Home Insurance Building went up in 1885." },
    { q: "Deep-dish pizza was invented in Chicago.", a: true, why: "Pizzeria Uno is credited with it in 1943." }
  ]},
  { keys: ["miami"], questions: [
    { q: "Miami is the only major US city founded by a woman.", a: true, why: "Julia Tuttle persuaded the railroad to extend there in 1896." },
    { q: "Miami Beach is a neighborhood inside the city of Miami.", a: false, why: "It's a separate city across Biscayne Bay." },
    { q: "The Everglades lie just west of Miami.", a: true, why: "The national park border is under an hour from downtown." }
  ]},
  { keys: ["florida"], questions: [
    { q: "Alligators and crocodiles coexist in the wild only in Florida's Everglades.", a: true, why: "It's the one place on Earth where both live together." },
    { q: "Walt Disney World is about twice the size of Manhattan.", a: true, why: "The resort covers roughly 100 km²." },
    { q: "Miami is the capital of Florida.", a: false, why: "Tallahassee is the capital." }
  ]},
  { keys: ["las vegas", "vegas"], questions: [
    { q: "Most of the Las Vegas Strip is outside the Las Vegas city limits.", a: true, why: "It largely sits in the town of Paradise, Nevada." },
    { q: "'Las Vegas' means 'the meadows' in Spanish.", a: true, why: "Springs once made the valley a green stopover." },
    { q: "Las Vegas is the capital of Nevada.", a: false, why: "Carson City is the capital." }
  ]},
  { keys: ["seattle"], questions: [
    { q: "The Space Needle was built for the 1962 World's Fair.", a: true, why: "It was the fair's futuristic centerpiece." },
    { q: "Seattle gets more rain per year than New York City.", a: false, why: "NYC gets more inches; Seattle just has more drizzly days." },
    { q: "Starbucks opened its first store in Seattle.", a: true, why: "At Pike Place Market in 1971." }
  ]},
  { keys: ["london"], questions: [
    { q: "Big Ben is the name of the bell, not the tower.", a: true, why: "The tower is officially the Elizabeth Tower." },
    { q: "The London Underground is the world's oldest metro system.", a: true, why: "It opened in 1863." },
    { q: "Tower Bridge and London Bridge are the same bridge.", a: false, why: "London Bridge is the plainer one just upstream." },
    { q: "Buckingham Palace has fewer than 100 rooms.", a: false, why: "It has about 775." }
  ]},
  { keys: ["paris"], questions: [
    { q: "The Eiffel Tower was meant to be temporary.", a: true, why: "Built for the 1889 World's Fair; radio antennas saved it." },
    { q: "The Mona Lisa hangs in the Musée d'Orsay.", a: false, why: "She lives in the Louvre." },
    { q: "The Louvre is the world's most-visited museum.", a: true, why: "It draws around 9 million visitors a year." },
    { q: "Paris began as a Roman city called Lutetia.", a: true, why: "Founded on an island in the Seine over 2,000 years ago." }
  ]},
  { keys: ["france"], questions: [
    { q: "France is the world's most-visited country.", a: true, why: "It welcomes around 90 million tourists a year." },
    { q: "Croissants were invented in France.", a: false, why: "They evolved from Austria's kipferl pastry." },
    { q: "France shares a land border with Brazil.", a: true, why: "Via French Guiana in South America." }
  ]},
  { keys: ["tokyo"], questions: [
    { q: "Tokyo was once called Edo.", a: true, why: "It was renamed when the emperor moved there in 1868." },
    { q: "Tokyo Tower is taller than the Eiffel Tower.", a: true, why: "By about 3 meters — 333 m vs 330 m." },
    { q: "Tokyo Disneyland is inside Tokyo's city limits.", a: false, why: "It's in Urayasu, Chiba Prefecture, next door." },
    { q: "Shinjuku Station is the world's busiest train station.", a: true, why: "Over 3.5 million passengers pass through daily." }
  ]},
  { keys: ["japan"], questions: [
    { q: "Slurping your noodles is considered rude in Japan.", a: false, why: "It's a sign you're enjoying them." },
    { q: "Japan has more vending machines per person than any other country.", a: true, why: "Roughly one for every 25 people." },
    { q: "Japan's bullet trains average delays of under one minute.", a: true, why: "The Shinkansen is famously punctual." }
  ]},
  { keys: ["rome"], questions: [
    { q: "The Colosseum could hold around 50,000 spectators.", a: true, why: "With numbered gates for crowd control, like modern stadiums." },
    { q: "Coins tossed into the Trevi Fountain are collected for charity.", a: true, why: "About €1.5 million a year goes to Caritas." },
    { q: "Pizza margherita was invented in Rome.", a: false, why: "It was created in Naples, for Queen Margherita." },
    { q: "Vatican City is an independent country inside Rome.", a: true, why: "The world's smallest state, at 44 hectares." }
  ]},
  { keys: ["italy"], questions: [
    { q: "Italy has more UNESCO World Heritage sites than any other country.", a: true, why: "Nearly 60 sites, the most in the world." },
    { q: "Espresso was invented in Italy.", a: true, why: "The first espresso machine was patented in Turin in 1884." },
    { q: "Venice's gondolas can be painted any color.", a: false, why: "By law they must be black." }
  ]},
  { keys: ["barcelona", "spain", "madrid"], questions: [
    { q: "The Sagrada Família has been under construction for over 140 years.", a: true, why: "Building started in 1882 and continues today." },
    { q: "Flamenco originated in Barcelona.", a: false, why: "It comes from Andalusia, in southern Spain." },
    { q: "Spain's La Tomatina festival is a giant tomato fight.", a: true, why: "Tens of thousands join it in Buñol each August." }
  ]},
  { keys: ["india", "udaipur", "jaipur", "delhi", "mumbai", "agra"], questions: [
    { q: "The Taj Mahal is located in Delhi.", a: false, why: "It's in Agra, about 230 km south." },
    { q: "Udaipur is nicknamed the City of Lakes.", a: true, why: "It's built around a chain of artificial lakes." },
    { q: "Chess originated in India.", a: true, why: "It evolved from the ancient game chaturanga." },
    { q: "India has the world's largest postal network.", a: true, why: "Over 150,000 post offices." }
  ]},
  { keys: ["mexico", "cancun", "yucatan"], questions: [
    { q: "Mexico City is slowly sinking.", a: true, why: "It's built on a drained lake bed and sinks up to 50 cm a year." },
    { q: "The Chichén Itzá pyramid is in Mexico City.", a: false, why: "It's on the Yucatán Peninsula." },
    { q: "Chocolate was first consumed in ancient Mesoamerica.", a: true, why: "The Maya and Aztecs drank it as bitter cacao." }
  ]},
  { keys: ["canada", "toronto", "vancouver", "montreal"], questions: [
    { q: "Canada has more lakes than the rest of the world combined.", a: true, why: "Over 60% of the world's lakes are Canadian." },
    { q: "Ottawa is Canada's largest city.", a: false, why: "Toronto is the largest; Ottawa is the capital." },
    { q: "Canada has the longest coastline of any country.", a: true, why: "Over 200,000 km of it." }
  ]},
  { keys: ["australia", "sydney", "melbourne"], questions: [
    { q: "Sydney is the capital of Australia.", a: false, why: "Canberra is the capital." },
    { q: "The Great Barrier Reef is the largest living structure on Earth.", a: true, why: "It stretches over 2,300 km." },
    { q: "Australia is wider than the Moon.", a: true, why: "About 4,000 km across vs the Moon's 3,475 km diameter." }
  ]}
];

function buildTriviaPool(destination) {
  const norm = destination.toLowerCase();
  const tokens = norm.split(/[,/]/).map((t) => t.trim()).filter(Boolean);
  const matched = [];
  for (const entry of DESTINATION_TRIVIA) {
    const hit = entry.keys.some((key) =>
      key.length <= 3 ? tokens.includes(key) : norm.includes(key)
    );
    if (hit) matched.push(...entry.questions);
  }
  return { pool: [...matched, ...FALLBACK_TRIVIA], matchedCount: matched.length };
}

const LEVELS = [
  {
    id: "sky",
    name: "Above the clouds",
    image: "/game/flight-sky-higgsfield.webp",
    terrain: "clouddeck",
    horizon: 0.52,
    sky: [[0, "#2e5d8f"], [0.42, "#7fa3c4"], [0.75, "#f0c98f"], [1, "#f6ae7b"]],
    sun: { x: 0.68, yFrac: 0.6, disc: "#fff6dd", glow: "255, 224, 170" },
    cloudAlpha: 0.62
  },
  {
    id: "water",
    name: "Over the water",
    image: "/game/flight-coast-higgsfield.webp",
    terrain: "ocean",
    horizon: 0.42,
    sky: [[0, "#2b7bb5"], [0.5, "#7db8dc"], [0.85, "#c9e6f2"], [1, "#e4f2f8"]],
    sun: { x: 0.76, yFrac: 0.42, disc: "#ffffff", glow: "220, 240, 255" },
    sea: [[0, "#3d9ab8"], [0.15, "#1d7495"], [0.5, "#0f4a63"], [1, "#082f42"]],
    swell: "224, 244, 252",
    cloudAlpha: 0.5
  },
  {
    id: "ground",
    name: "Over land",
    image: "/game/flight-land-higgsfield.webp",
    terrain: "land",
    horizon: 0.44,
    sky: [[0, "#4a7fb5"], [0.55, "#a9cfe0"], [0.85, "#f0dfb2"], [1, "#f6d59a"]],
    sun: { x: 0.3, yFrac: 0.5, disc: "#fff9e0", glow: "255, 235, 180" },
    land: [[0, "#b9a06b"], [0.2, "#a3a35e"], [0.6, "#6f8a4a"], [1, "#4a6635"]],
    cloudAlpha: 0.45
  }
];

function isTouchDevice() {
  return typeof window !== "undefined" && window.matchMedia?.("(pointer: coarse)").matches;
}

function makeCloudSprite(size, softness) {
  const c = document.createElement("canvas");
  c.width = size * 2;
  c.height = size;
  const g = c.getContext("2d");
  const blobs = 6 + Math.floor(Math.random() * 5);
  for (let i = 0; i < blobs; i++) {
    const bx = size * 0.35 + Math.random() * size * 1.3;
    const by = size * 0.45 + Math.random() * size * 0.35;
    const br = size * (0.16 + Math.random() * 0.22);
    const grad = g.createRadialGradient(bx, by - br * 0.3, br * 0.1, bx, by, br);
    grad.addColorStop(0, `rgba(255, 250, 244, ${softness})`);
    grad.addColorStop(0.6, `rgba(255, 241, 228, ${softness * 0.55})`);
    grad.addColorStop(1, "rgba(255, 241, 228, 0)");
    g.fillStyle = grad;
    g.beginPath();
    g.arc(bx, by, br, 0, Math.PI * 2);
    g.fill();
  }
  return c;
}

export default function FlightGame({ destination = "", destinationLabel = "your destination", progressText = "" }) {
  const canvasRef = useRef(null);
  const wrapRef = useRef(null);
  const [hud, setHud] = useState({ score: 0, misses: 0, speed: 300 });
  const [question, setQuestion] = useState(null);
  const [verdict, setVerdict] = useState(null);
  const [banner, setBanner] = useState(null); // { num, name }
  const questionRef = useRef(null);
  const trivia = useMemo(
    () => buildTriviaPool(destination || destinationLabel),
    [destination, destinationLabel]
  );
  const usedTrivia = useRef([]);
  const stateRef = useRef(null);
  const timersRef = useRef([]);

  // Lock page scroll while the game is up: any scrollbar shrinks the canvas
  // and exposes the page background as a colored border around the sky.
  useEffect(() => {
    const prevBody = document.body.style.overflow;
    const prevHtml = document.documentElement.style.overflow;
    document.body.style.overflow = "hidden";
    document.documentElement.style.overflow = "hidden";
    return () => {
      document.body.style.overflow = prevBody;
      document.documentElement.style.overflow = prevHtml;
    };
  }, []);

  function nextTrivia() {
    const { pool, matchedCount } = trivia;
    if (usedTrivia.current.length >= pool.length) usedTrivia.current = [];
    const unused = pool.map((_, i) => i).filter((i) => !usedTrivia.current.includes(i));
    const preferred = unused.filter((i) => i < matchedCount);
    const pickFrom = preferred.length ? preferred : unused;
    const idx = pickFrom[Math.floor(Math.random() * pickFrom.length)];
    usedTrivia.current.push(idx);
    return pool[idx];
  }

  function answer(choice) {
    const q = questionRef.current;
    if (!q) return;
    const correct = choice === q.a;
    const s = stateRef.current;
    if (s && correct) s.score += 2;
    setHud((h) => ({ ...h, score: s ? s.score : h.score }));
    setVerdict({ correct, why: q.why });
    const t = setTimeout(() => {
      setVerdict(null);
      setQuestion(null);
      questionRef.current = null;
      if (stateRef.current) stateRef.current.pausedUntil = performance.now() + 600;
    }, 2400);
    timersRef.current.push(t);
  }

  useEffect(() => {
    const canvas = canvasRef.current;
    const wrap = wrapRef.current;
    const ctx = canvas.getContext("2d");
    let raf = 0;
    let W = 0;
    let H = 0;
    let dpr = 1;

    const FOCAL = 420;
    const WORLD_X = 260;
    const WORLD_Y = 130;
    const reducedMotion = window.matchMedia?.("(prefers-reduced-motion: reduce)").matches;
    const loadImage = (src) => {
      const image = new Image();
      image.decoding = "async";
      image.src = src;
      return image;
    };
    const levelImages = Object.fromEntries(LEVELS.map((item) => [item.id, loadImage(item.image)]));
    const aircraftImage = loadImage("/game/player-aircraft-higgsfield.webp");
    const gateImage = loadImage("/game/flight-gate-higgsfield.webp");

    const s = {
      t: 0,
      last: performance.now(),
      speed: 250,
      score: 0,
      misses: 0,
      stage: 0, // total levels cleared; LEVELS[stage % 3]
      gatesThisLevel: 0,
      plane: { x: 0, y: 0, vx: 0, vy: 0, bank: 0, pitch: 0 },
      keys: {},
      pointer: null,
      rings: [],
      clouds: [],
      props: [], // per-level scenery: deck clouds / islands / trees
      trail: [],
      bursts: [],
      shake: 0,
      flash: 0,
      levelFade: 0,
      nextRingZ: 1400,
      pausedUntil: 0,
      pagePaused: false
    };
    stateRef.current = s;

    const cloudSprites = [
      makeCloudSprite(140, 0.9),
      makeCloudSprite(200, 0.75),
      makeCloudSprite(260, 0.6)
    ];

    const level = () => LEVELS[s.stage % LEVELS.length];
    const horizonY = () => H * level().horizon;

    function resize() {
      const rect = wrap.getBoundingClientRect();
      dpr = Math.min(window.devicePixelRatio || 1, 2);
      W = Math.max(320, rect.width);
      H = Math.max(260, rect.height);
      canvas.width = W * dpr;
      canvas.height = H * dpr;
      canvas.style.width = `${W}px`;
      canvas.style.height = `${H}px`;
      ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
    }
    resize();
    const ro = new ResizeObserver(resize);
    ro.observe(wrap);

    for (let i = 0; i < 12; i++) {
      s.clouds.push({
        x: (Math.random() * 2 - 1) * 2200,
        y: -80 - Math.random() * 520,
        z: 400 + Math.random() * 4200,
        sprite: cloudSprites[i % cloudSprites.length],
        size: 420 + Math.random() * 700
      });
    }

    function regenProps() {
      s.props = [];
      const terrain = level().terrain;
      if (terrain === "clouddeck") {
        for (let i = 0; i < 10; i++) {
          s.props.push({
            x: (Math.random() * 2 - 1) * 1800,
            y: 200 + Math.random() * 320,
            z: 300 + Math.random() * 4000,
            sprite: cloudSprites[i % cloudSprites.length],
            size: 500 + Math.random() * 800
          });
        }
      } else if (terrain === "ocean") {
        for (let i = 0; i < 5; i++) {
          s.props.push({
            x: (Math.random() < 0.5 ? -1 : 1) * (350 + Math.random() * 900),
            y: 230,
            z: 600 + Math.random() * 3800,
            w: 260 + Math.random() * 420,
            h: 46 + Math.random() * 40
          });
        }
      } else if (terrain === "land") {
        for (let i = 0; i < 14; i++) {
          s.props.push({
            x: (Math.random() < 0.5 ? -1 : 1) * (240 + Math.random() * 1100),
            y: 260,
            z: 300 + Math.random() * 4000,
            size: 60 + Math.random() * 70
          });
        }
      }
    }
    regenProps();

    function spawnRing(z) {
      return {
        x: (Math.random() * 2 - 1) * WORLD_X * 0.58,
        y: (Math.random() * 2 - 1) * WORLD_Y * 0.52,
        z,
        r: 112,
        state: "live",
        spin: Math.random() * Math.PI
      };
    }
    for (let z = 800; z < 4200; z += 620) {
      s.rings.push(spawnRing(z));
      s.nextRingZ = z + 620;
    }

    function project(x, y, z, camX, camY) {
      const k = FOCAL / z;
      return {
        sx: W / 2 + (x - camX * 0.72) * k,
        sy: horizonY() + (y - camY * 0.72) * k,
        k
      };
    }

    const KEY_COMMANDS = {
      ArrowLeft: "left",
      ArrowRight: "right",
      ArrowUp: "up",
      ArrowDown: "down",
      KeyA: "left",
      KeyD: "right",
      KeyW: "up",
      KeyS: "down"
    };
    const onKey = (e, down) => {
      const command = KEY_COMMANDS[e.code];
      if (command) {
        e.preventDefault();
        s.keys[command] = down;
      }
    };
    const kd = (e) => onKey(e, true);
    const ku = (e) => onKey(e, false);
    window.addEventListener("keydown", kd, { passive: false });
    window.addEventListener("keyup", ku);
    const onBlur = () => {
      s.pagePaused = true;
      s.keys = {};
      s.pointer = null;
    };
    const onFocus = () => {
      s.pagePaused = false;
      s.last = performance.now();
    };
    const onVisibility = () => (document.hidden ? onBlur() : onFocus());
    window.addEventListener("blur", onBlur);
    window.addEventListener("focus", onFocus);
    document.addEventListener("visibilitychange", onVisibility);

    const toWorld = (e) => {
      const rect = canvas.getBoundingClientRect();
      const nx = ((e.clientX - rect.left) / rect.width) * 2 - 1;
      const ny = ((e.clientY - rect.top) / rect.height) * 2 - 1;
      return { x: nx * WORLD_X, y: ny * WORLD_Y };
    };
    const pd = (e) => { s.pointer = toWorld(e); canvas.setPointerCapture?.(e.pointerId); };
    const pm = (e) => { if (s.pointer) s.pointer = toWorld(e); };
    const pu = () => { s.pointer = null; };
    canvas.addEventListener("pointerdown", pd);
    canvas.addEventListener("pointermove", pm);
    canvas.addEventListener("pointerup", pu);
    canvas.addEventListener("pointercancel", pu);

    let hudTimer = 0;

    function showBanner(num, name) {
      setBanner({ num, name });
      const t = setTimeout(() => setBanner(null), 2800);
      timersRef.current.push(t);
    }
    showBanner(1, level().name);

    function levelUp() {
      s.stage += 1;
      s.gatesThisLevel = 0;
      s.levelFade = 1;
      regenProps();
      showBanner(s.stage + 1, level().name);
    }

    function triggerQuestion() {
      const q = nextTrivia();
      questionRef.current = q;
      setQuestion(q);
    }

    function registerMiss() {
      s.misses += 1;
      s.shake = 1;
      s.flash = 1;
      if (s.misses >= MISSES_PER_QUESTION) {
        s.misses = 0;
        triggerQuestion();
      }
    }

    function drawSky() {
      const L = level();
      const hy = horizonY();
      const sky = ctx.createLinearGradient(0, 0, 0, hy * 1.25);
      for (const [stop, color] of L.sky) sky.addColorStop(stop, color);
      ctx.fillStyle = sky;
      ctx.fillRect(0, 0, W, hy * 1.26);

      const sunX = W * L.sun.x;
      const sunY = hy * L.sun.yFrac;
      const glow = ctx.createRadialGradient(sunX, sunY, 4, sunX, sunY, H * 0.5);
      glow.addColorStop(0, "rgba(255, 250, 230, 0.95)");
      glow.addColorStop(0.12, `rgba(${L.sun.glow}, 0.55)`);
      glow.addColorStop(0.5, `rgba(${L.sun.glow}, 0.12)`);
      glow.addColorStop(1, `rgba(${L.sun.glow}, 0)`);
      ctx.fillStyle = glow;
      ctx.fillRect(0, 0, W, H);
      ctx.beginPath();
      ctx.arc(sunX, sunY, 26, 0, Math.PI * 2);
      ctx.fillStyle = L.sun.disc;
      ctx.fill();
      return { sunX };
    }

    function drawCinematicBackdrop() {
      const image = levelImages[level().id];
      if (!image?.complete || !image.naturalWidth) return false;
      const scale = Math.max(W / image.naturalWidth, H / image.naturalHeight) * 1.045;
      const drawW = image.naturalWidth * scale;
      const drawH = image.naturalHeight * scale;
      const maxPanX = Math.max(0, (drawW - W) / 2);
      const maxPanY = Math.max(0, (drawH - H) / 2);
      const panX = maxPanX ? (s.plane.x / WORLD_X) * maxPanX * 0.5 : 0;
      const panY = maxPanY ? (s.plane.y / WORLD_Y) * maxPanY * 0.35 : 0;
      ctx.drawImage(image, (W - drawW) / 2 - panX, (H - drawH) / 2 - panY, drawW, drawH);
      const grade = ctx.createLinearGradient(0, 0, 0, H);
      grade.addColorStop(0, "rgba(18, 34, 45, 0.08)");
      grade.addColorStop(0.62, "rgba(14, 27, 35, 0.02)");
      grade.addColorStop(1, "rgba(8, 18, 25, 0.24)");
      ctx.fillStyle = grade;
      ctx.fillRect(0, 0, W, H);
      return true;
    }

    function drawOcean(sunX) {
      const L = level();
      const hy = horizonY();
      const sea = ctx.createLinearGradient(0, hy, 0, H);
      for (const [stop, color] of L.sea) sea.addColorStop(stop, color);
      ctx.fillStyle = sea;
      ctx.fillRect(0, hy, W, H - hy);

      for (let i = 0; i < 22; i++) {
        const z = ((i * 260 - (s.t * s.speed * 0.9) % 260) % 5720) + 60;
        const k = FOCAL / z;
        const y = hy + 640 * k;
        if (y > H || y < hy + 2) continue;
        const alpha = Math.min(0.18, 0.9 * k * k);
        ctx.strokeStyle = `rgba(${L.swell}, ${alpha})`;
        ctx.lineWidth = Math.max(0.6, 7 * k);
        ctx.beginPath();
        const wob = Math.sin(z * 0.011 + s.t * 1.4) * 26 * k;
        ctx.moveTo(0, y + wob);
        ctx.bezierCurveTo(W * 0.33, y - 80 * k + wob, W * 0.66, y + 80 * k - wob, W, y - wob);
        ctx.stroke();
      }

      // islands drifting past
      for (const p of s.props) {
        const pr = project(p.x, p.y, p.z, s.plane.x, s.plane.y);
        const w = p.w * pr.k;
        const h = p.h * pr.k;
        if (w < 6 || pr.sy < hy) continue;
        ctx.beginPath();
        ctx.ellipse(pr.sx, pr.sy, w, h, 0, Math.PI, 0);
        ctx.fillStyle = "rgba(52, 74, 46, 0.9)";
        ctx.fill();
        ctx.beginPath();
        ctx.ellipse(pr.sx, pr.sy - h * 0.35, w * 0.55, h * 0.7, 0, Math.PI, 0);
        ctx.fillStyle = "rgba(84, 112, 62, 0.9)";
        ctx.fill();
        ctx.beginPath();
        ctx.ellipse(pr.sx, pr.sy + h * 0.15, w * 1.06, h * 0.24, 0, 0, Math.PI);
        ctx.fillStyle = "rgba(238, 246, 250, 0.35)";
        ctx.fill();
      }

      // sun glitter column
      const glitter = ctx.createLinearGradient(0, hy, 0, H);
      glitter.addColorStop(0, "rgba(255, 251, 235, 0.5)");
      glitter.addColorStop(0.5, "rgba(255, 248, 220, 0.13)");
      glitter.addColorStop(1, "rgba(255, 248, 220, 0)");
      ctx.fillStyle = glitter;
      ctx.save();
      ctx.translate(sunX - s.plane.x * 0.25, 0);
      ctx.beginPath();
      ctx.moveTo(-14, hy);
      ctx.lineTo(14, hy);
      ctx.lineTo(90, H);
      ctx.lineTo(-90, H);
      ctx.closePath();
      ctx.fill();
      ctx.restore();

      drawHorizonHaze("232, 244, 250");
    }

    function drawCloudDeck() {
      const hy = horizonY();
      const deck = ctx.createLinearGradient(0, hy, 0, H);
      deck.addColorStop(0, "#c6d5e4");
      deck.addColorStop(0.4, "#aebfd2");
      deck.addColorStop(1, "#8fa3ba");
      ctx.fillStyle = deck;
      ctx.fillRect(0, hy, W, H - hy);

      for (const p of [...s.props].sort((a, b) => b.z - a.z)) {
        const pr = project(p.x, p.y, p.z, s.plane.x, s.plane.y);
        const w = p.size * pr.k;
        if (w < 5) continue;
        const fade = Math.min(1, Math.max(0, (p.z - 140) / 700));
        ctx.globalAlpha = 0.85 * Math.max(0.25, fade);
        ctx.drawImage(p.sprite, pr.sx - w, pr.sy - w * 0.3, w * 2, w);
      }
      ctx.globalAlpha = 1;
      drawHorizonHaze("236, 240, 248");
    }

    function drawLand() {
      const L = level();
      const hy = horizonY();
      const land = ctx.createLinearGradient(0, hy, 0, H);
      for (const [stop, color] of L.land) land.addColorStop(stop, color);
      ctx.fillStyle = land;
      ctx.fillRect(0, hy, W, H - hy);

      // distant ridge line
      ctx.beginPath();
      ctx.moveTo(0, hy);
      for (let x = 0; x <= W; x += 8) {
        ctx.lineTo(x, hy - 14 - Math.abs(Math.sin(x * 0.011) * 26 + Math.sin(x * 0.031) * 12));
      }
      ctx.lineTo(W, hy);
      ctx.closePath();
      ctx.fillStyle = "rgba(104, 96, 128, 0.5)";
      ctx.fill();

      // field bands rushing toward the camera
      for (let i = 0; i < 20; i++) {
        const z = ((i * 300 - (s.t * s.speed * 0.9) % 300) % 6000) + 70;
        const k = FOCAL / z;
        const y = hy + 640 * k;
        if (y > H || y < hy + 2) continue;
        ctx.fillStyle = `rgba(255, 240, 190, ${Math.min(0.13, 0.8 * k * k)})`;
        ctx.fillRect(0, y, W, Math.max(1, 26 * k));
      }

      // trees sliding past
      for (const p of [...s.props].sort((a, b) => b.z - a.z)) {
        const pr = project(p.x, p.y, p.z, s.plane.x, s.plane.y);
        const size = p.size * pr.k;
        if (size < 3 || pr.sy < hy) continue;
        ctx.fillStyle = "rgba(74, 56, 34, 0.85)";
        ctx.fillRect(pr.sx - size * 0.06, pr.sy - size * 0.5, size * 0.12, size * 0.5);
        ctx.beginPath();
        ctx.arc(pr.sx, pr.sy - size * 0.62, size * 0.34, 0, Math.PI * 2);
        ctx.arc(pr.sx - size * 0.22, pr.sy - size * 0.44, size * 0.26, 0, Math.PI * 2);
        ctx.arc(pr.sx + size * 0.22, pr.sy - size * 0.44, size * 0.26, 0, Math.PI * 2);
        ctx.fillStyle = "rgba(48, 84, 42, 0.92)";
        ctx.fill();
      }
      drawHorizonHaze("244, 234, 200");
    }

    function drawHorizonHaze(rgb) {
      const hy = horizonY();
      const haze = ctx.createLinearGradient(0, hy - 26, 0, hy + 40);
      haze.addColorStop(0, `rgba(${rgb}, 0)`);
      haze.addColorStop(0.5, `rgba(${rgb}, 0.5)`);
      haze.addColorStop(1, `rgba(${rgb}, 0)`);
      ctx.fillStyle = haze;
      ctx.fillRect(0, hy - 26, W, 66);
    }

    function drawCloud(c) {
      const pr = project(c.x, c.y, c.z, s.plane.x, s.plane.y);
      const w = c.size * pr.k;
      if (w < 4) return;
      const fade = Math.min(1, Math.max(0, (c.z - 140) / 900));
      ctx.globalAlpha = level().cloudAlpha * fade;
      ctx.drawImage(c.sprite, pr.sx - w, pr.sy - w * 0.28, w * 2, w);
      ctx.globalAlpha = 1;
    }

    function drawRing(ring) {
      const pr = project(ring.x, ring.y, ring.z, s.plane.x, s.plane.y);
      const R = ring.r * pr.k;
      if (R < 2) return;
      const depth = Math.max(0, Math.min(1, 1 - ring.z / 4200));
      // As the ring passes very close to the camera its projected radius
      // balloons past the viewport, which would otherwise paint the glow
      // halo as a full-screen border. Fade it out well before that happens.
      const closeness = Math.max(0, Math.min(1, ring.z / 260));
      const lw = Math.max(2, R * 0.15);
      if (closeness <= 0) return;

      ctx.save();
      ctx.translate(pr.sx, pr.sy);
      ctx.globalAlpha = closeness * (ring.state === "hit" ? 0.35 : 1);
      if (gateImage.complete && gateImage.naturalWidth && ring.state !== "miss") {
        const drawR = Math.min(R, Math.min(W, H) * 0.42);
        ctx.rotate(Math.sin(ring.spin + s.t * 0.45) * 0.035);
        ctx.shadowColor = "rgba(245, 169, 67, 0.55)";
        ctx.shadowBlur = Math.max(5, drawR * 0.18);
        ctx.drawImage(gateImage, -drawR * 1.18, -drawR * 1.18, drawR * 2.36, drawR * 2.36);
        ctx.restore();
        return;
      }

      ctx.beginPath();
      ctx.arc(0, 0, R, 0, Math.PI * 2);
      ctx.strokeStyle = `rgba(255, 190, 90, ${0.14 + depth * 0.2})`;
      ctx.lineWidth = lw * 2.4;
      ctx.stroke();

      const grad = ctx.createLinearGradient(0, -R, 0, R);
      if (ring.state === "miss") {
        grad.addColorStop(0, "#e2685d");
        grad.addColorStop(1, "#8f2f27");
      } else {
        grad.addColorStop(0, "#ffd98f");
        grad.addColorStop(0.55, "#f0a94e");
        grad.addColorStop(1, "#9e6320");
      }
      ctx.beginPath();
      ctx.arc(0, 0, R, 0, Math.PI * 2);
      ctx.strokeStyle = grad;
      ctx.lineWidth = lw;
      ctx.stroke();

      ctx.beginPath();
      ctx.arc(0, 0, R, -2.2 + Math.sin(ring.spin + s.t) * 0.15, -0.9);
      ctx.strokeStyle = "rgba(255, 248, 225, 0.85)";
      ctx.lineWidth = lw * 0.45;
      ctx.stroke();

      for (let i = 0; i < 4; i++) {
        const a = (i * Math.PI) / 2 + Math.PI / 4;
        const blink = 0.5 + 0.5 * Math.sin(s.t * 5 + i * 1.7 + ring.z * 0.01);
        ctx.beginPath();
        ctx.arc(Math.cos(a) * R, Math.sin(a) * R, Math.max(1.2, lw * 0.3), 0, Math.PI * 2);
        ctx.fillStyle = `rgba(255, 255, 240, ${0.35 + 0.6 * blink})`;
        ctx.fill();
      }
      ctx.restore();
    }

    function drawPlane() {
      const px = W / 2 + s.plane.x * 0.28;
      const py = H * 0.72 + s.plane.y * 0.34;
      const bank = s.plane.bank;
      const pitch = s.plane.pitch;
      const sc = Math.min(W, 760) / 760;

      s.trail.push(
        { x: px - 74 * sc * Math.cos(bank), y: py - 74 * sc * Math.sin(bank) + 6, life: 1 },
        { x: px + 74 * sc * Math.cos(bank), y: py + 74 * sc * Math.sin(bank) + 6, life: 1 }
      );
      for (const t of s.trail) {
        t.life -= 0.03;
        if (t.life <= 0) continue;
        t.y += 1.6;
        ctx.beginPath();
        ctx.arc(t.x, t.y, 3.2 * t.life * sc, 0, Math.PI * 2);
        ctx.fillStyle = `rgba(255, 252, 246, ${0.28 * t.life})`;
        ctx.fill();
      }
      s.trail = s.trail.filter((t) => t.life > 0);

      ctx.save();
      ctx.translate(px, py);
      ctx.rotate(bank);
      ctx.scale(sc, sc * (1 - Math.abs(pitch) * 0.12));

      if (aircraftImage.complete && aircraftImage.naturalWidth) {
        ctx.shadowColor = "rgba(8, 20, 30, 0.32)";
        ctx.shadowBlur = 18;
        ctx.shadowOffsetY = 12;
        ctx.drawImage(aircraftImage, -102, -82, 204, 204);
        ctx.restore();
        return;
      }

      ctx.beginPath();
      ctx.ellipse(0, 34, 60, 10, 0, 0, Math.PI * 2);
      ctx.fillStyle = "rgba(10, 25, 35, 0.18)";
      ctx.fill();

      const wing = ctx.createLinearGradient(-90, 0, 90, 0);
      wing.addColorStop(0, "#c9cdd4");
      wing.addColorStop(0.5, "#f4f6f8");
      wing.addColorStop(1, "#b7bcc4");
      ctx.fillStyle = wing;
      ctx.beginPath();
      ctx.moveTo(-6, -4);
      ctx.lineTo(-88, 26);
      ctx.lineTo(-70, 34);
      ctx.lineTo(-4, 16);
      ctx.closePath();
      ctx.fill();
      ctx.beginPath();
      ctx.moveTo(6, -4);
      ctx.lineTo(88, 26);
      ctx.lineTo(70, 34);
      ctx.lineTo(4, 16);
      ctx.closePath();
      ctx.fill();
      ctx.strokeStyle = "rgba(40, 50, 60, 0.25)";
      ctx.lineWidth = 1;
      ctx.stroke();

      ctx.fillStyle = "#dfe3e8";
      ctx.beginPath();
      ctx.moveTo(-3, 26);
      ctx.lineTo(-34, 44);
      ctx.lineTo(-24, 48);
      ctx.lineTo(-2, 36);
      ctx.closePath();
      ctx.fill();
      ctx.beginPath();
      ctx.moveTo(3, 26);
      ctx.lineTo(34, 44);
      ctx.lineTo(24, 48);
      ctx.lineTo(2, 36);
      ctx.closePath();
      ctx.fill();

      const fin = ctx.createLinearGradient(0, 20, 0, 52);
      fin.addColorStop(0, "#e8564a");
      fin.addColorStop(1, "#b03a30");
      ctx.fillStyle = fin;
      ctx.beginPath();
      ctx.moveTo(0, 24);
      ctx.lineTo(-2, 50);
      ctx.lineTo(8, 46);
      ctx.lineTo(4, 26);
      ctx.closePath();
      ctx.fill();

      const body = ctx.createLinearGradient(-12, 0, 12, 0);
      body.addColorStop(0, "#c3c8cf");
      body.addColorStop(0.45, "#fbfcfd");
      body.addColorStop(1, "#aeb4bd");
      ctx.fillStyle = body;
      ctx.beginPath();
      ctx.moveTo(0, -46);
      ctx.bezierCurveTo(9, -40, 11, -8, 9, 30);
      ctx.bezierCurveTo(7, 44, -7, 44, -9, 30);
      ctx.bezierCurveTo(-11, -8, -9, -40, 0, -46);
      ctx.closePath();
      ctx.fill();
      ctx.strokeStyle = "rgba(40, 50, 60, 0.3)";
      ctx.lineWidth = 1;
      ctx.stroke();

      ctx.beginPath();
      ctx.moveTo(0, -46);
      ctx.bezierCurveTo(7, -42, 8, -30, 7.5, -24);
      ctx.lineTo(-7.5, -24);
      ctx.bezierCurveTo(-8, -30, -7, -42, 0, -46);
      ctx.closePath();
      ctx.fillStyle = "#e8564a";
      ctx.fill();

      const glass = ctx.createLinearGradient(0, -24, 0, -6);
      glass.addColorStop(0, "#3d5a75");
      glass.addColorStop(1, "#16283a");
      ctx.fillStyle = glass;
      ctx.beginPath();
      ctx.ellipse(0, -15, 5.5, 9, 0, 0, Math.PI * 2);
      ctx.fill();
      ctx.beginPath();
      ctx.ellipse(-1.6, -18, 1.6, 3.4, -0.3, 0, Math.PI * 2);
      ctx.fillStyle = "rgba(255,255,255,0.5)";
      ctx.fill();

      const boost = Math.min(1, (s.speed - 250) / 450);
      ctx.beginPath();
      ctx.ellipse(0, 44, 3.4 + boost * 2, 6 + boost * 5, 0, 0, Math.PI * 2);
      const flame = ctx.createRadialGradient(0, 42, 0, 0, 46, 12);
      flame.addColorStop(0, "rgba(255, 240, 200, 0.95)");
      flame.addColorStop(0.5, `rgba(255, 170, 80, ${0.5 + boost * 0.4})`);
      flame.addColorStop(1, "rgba(255, 120, 60, 0)");
      ctx.fillStyle = flame;
      ctx.fill();

      ctx.restore();
    }

    function drawBursts() {
      for (const b of s.bursts) {
        b.life -= 0.025;
        b.r += 2.6;
        if (b.life <= 0) continue;
        ctx.beginPath();
        ctx.arc(b.x, b.y, b.r, 0, Math.PI * 2);
        ctx.strokeStyle = `${b.color}${(0.55 * b.life).toFixed(3)})`;
        ctx.lineWidth = 3 * b.life;
        ctx.stroke();
        for (const p of b.parts) {
          p.x += p.vx;
          p.y += p.vy;
          p.vy += 0.06;
          ctx.beginPath();
          ctx.arc(p.x, p.y, 2.4 * b.life, 0, Math.PI * 2);
          ctx.fillStyle = `${b.color}${(0.85 * b.life).toFixed(3)})`;
          ctx.fill();
        }
      }
      s.bursts = s.bursts.filter((b) => b.life > 0);
    }

    function drawSpeedLines() {
      const boost = Math.max(0, (s.speed - 340) / 420);
      if (boost <= 0.02) return;
      ctx.save();
      ctx.strokeStyle = `rgba(255, 250, 240, ${0.1 + boost * 0.16})`;
      for (let i = 0; i < 14; i++) {
        const a = (i / 14) * Math.PI * 2 + s.t * 0.35;
        const cxp = W / 2 + Math.cos(a) * W * 0.52;
        const cyp = H * 0.5 + Math.sin(a) * H * 0.58;
        ctx.lineWidth = 1 + boost * 1.6;
        ctx.beginPath();
        ctx.moveTo(cxp, cyp);
        ctx.lineTo(W / 2 + (cxp - W / 2) * 0.78, H * 0.5 + (cyp - H * 0.5) * 0.78);
        ctx.stroke();
      }
      ctx.restore();
    }

    function frame(now) {
      raf = requestAnimationFrame(frame);
      const rawDt = Math.min(0.6, (now - s.last) / 1000);
      const dt = Math.min(0.05, rawDt);
      s.last = now;
      const paused = s.pagePaused || questionRef.current !== null || now < s.pausedUntil;
      if (!paused) s.t += dt;

      const ACC = 1050;
      let ax = 0;
      let ay = 0;
      if (s.keys.left) ax -= 1;
      if (s.keys.right) ax += 1;
      if (s.keys.up) ay -= 1;
      if (s.keys.down) ay += 1;
      for (const pad of navigator.getGamepads?.() || []) {
        if (!pad) continue;
        const padX = Math.abs(pad.axes[0] || 0) > 0.16 ? pad.axes[0] : 0;
        const padY = Math.abs(pad.axes[1] || 0) > 0.16 ? pad.axes[1] : 0;
        ax += padX + (pad.buttons[15]?.pressed ? 1 : 0) - (pad.buttons[14]?.pressed ? 1 : 0);
        ay += padY + (pad.buttons[13]?.pressed ? 1 : 0) - (pad.buttons[12]?.pressed ? 1 : 0);
      }
      ax = Math.max(-1, Math.min(1, ax));
      ay = Math.max(-1, Math.min(1, ay));
      if (s.pointer) {
        ax = Math.max(-1, Math.min(1, (s.pointer.x - s.plane.x) / 50));
        ay = Math.max(-1, Math.min(1, (s.pointer.y - s.plane.y) / 38));
      }
      if (!paused) {
        s.plane.vx += ax * ACC * dt;
        s.plane.vy += ay * ACC * dt;
        s.plane.vx *= Math.pow(0.006, dt);
        s.plane.vy *= Math.pow(0.006, dt);
        s.plane.x = Math.max(-WORLD_X, Math.min(WORLD_X, s.plane.x + s.plane.vx * dt));
        s.plane.y = Math.max(-WORLD_Y, Math.min(WORLD_Y, s.plane.y + s.plane.vy * dt));
        const targetBank = Math.max(-0.5, Math.min(0.5, s.plane.vx / 420));
        s.plane.bank += (targetBank - s.plane.bank) * Math.min(1, dt * 7);
        const targetPitch = Math.max(-0.4, Math.min(0.4, s.plane.vy / 460));
        s.plane.pitch += (targetPitch - s.plane.pitch) * Math.min(1, dt * 7);

        // gentle difficulty ramp
        s.speed = Math.min(620, s.speed + dt * 5.5);

        for (const ring of s.rings) ring.z -= s.speed * dt;
        for (const c of s.clouds) {
          c.z -= s.speed * dt * 0.62;
          if (c.z < 60) {
            c.z = 3800 + Math.random() * 1400;
            c.x = (Math.random() * 2 - 1) * 2200;
            c.y = -80 - Math.random() * 520;
          }
        }
        const terrain = level().terrain;
        for (const p of s.props) {
          p.z -= s.speed * dt * (terrain === "clouddeck" ? 0.8 : 1);
          if (p.z < 80) {
            p.z = 3600 + Math.random() * 1600;
            if (terrain === "clouddeck") p.x = (Math.random() * 2 - 1) * 1800;
            else if (terrain === "ocean") p.x = (Math.random() < 0.5 ? -1 : 1) * (350 + Math.random() * 900);
            else p.x = (Math.random() < 0.5 ? -1 : 1) * (240 + Math.random() * 1100);
          }
        }

        s.nextRingZ -= s.speed * dt;
        const gap = Math.max(460, 640 - s.speed * 0.18);
        if (s.nextRingZ < 4200 - gap) {
          s.rings.push(spawnRing(4200));
          s.nextRingZ = 4200;
        }

        for (const ring of s.rings) {
          if (ring.state !== "live" || ring.z > 40) continue;
          const dist = Math.hypot(ring.x - s.plane.x, ring.y - s.plane.y);
          const pr = project(ring.x, ring.y, Math.max(ring.z, 50), s.plane.x, s.plane.y);
          if (dist <= ring.r * 1.1) {
            ring.state = "hit";
            s.score += 1;
            s.gatesThisLevel += 1;
            s.bursts.push({
              x: pr.sx, y: pr.sy, r: 12, life: 1, color: "rgba(255, 214, 130, ",
              parts: Array.from({ length: 10 }, () => ({
                x: pr.sx, y: pr.sy,
                vx: (Math.random() * 2 - 1) * 3.4,
                vy: (Math.random() * 2 - 1) * 3.4 - 1
              }))
            });
            if (s.gatesThisLevel >= GATES_PER_LEVEL) levelUp();
          } else {
            ring.state = "miss";
            s.bursts.push({ x: pr.sx, y: pr.sy, r: 10, life: 0.8, color: "rgba(226, 104, 93, ", parts: [] });
            registerMiss();
          }
          setHud({ score: s.score, misses: s.misses, speed: Math.round(180 + s.speed * 0.55) });
        }
        s.rings = s.rings.filter((r) => r.z > -160);
      }

      hudTimer += dt;
      if (hudTimer > 0.4) {
        hudTimer = 0;
        setHud({ score: s.score, misses: s.misses, speed: Math.round(180 + s.speed * 0.55) });
      }

      // ---- render ----
      s.shake = reducedMotion ? 0 : Math.max(0, s.shake - rawDt * 2.4);
      s.flash = Math.max(0, s.flash - rawDt * 1.8);
      s.levelFade = Math.max(0, s.levelFade - rawDt * 1.1);
      ctx.save();
      if (s.shake > 0) {
        ctx.translate((Math.random() * 2 - 1) * s.shake * 7, (Math.random() * 2 - 1) * s.shake * 7);
      }

      const usesGeneratedBackdrop = drawCinematicBackdrop();
      const terrain = level().terrain;
      if (!usesGeneratedBackdrop) {
        const { sunX } = drawSky();
        if (terrain === "ocean") drawOcean(sunX);
        else if (terrain === "clouddeck") drawCloudDeck();
        else drawLand();
      }

      const far = [...s.clouds].sort((a, b) => b.z - a.z);
      if (!usesGeneratedBackdrop) for (const c of far) if (c.z > 900) drawCloud(c);
      const sorted = [...s.rings].sort((a, b) => b.z - a.z);
      for (const ring of sorted) drawRing(ring);
      if (!usesGeneratedBackdrop) for (const c of far) if (c.z <= 900) drawCloud(c);

      drawPlane();
      drawBursts();
      drawSpeedLines();

      const vig = ctx.createRadialGradient(W / 2, H / 2, Math.min(W, H) * 0.42, W / 2, H / 2, Math.max(W, H) * 0.74);
      vig.addColorStop(0, "rgba(20, 24, 38, 0)");
      vig.addColorStop(1, "rgba(16, 20, 34, 0.34)");
      ctx.fillStyle = vig;
      ctx.fillRect(0, 0, W, H);

      if (s.flash > 0) {
        ctx.fillStyle = `rgba(226, 104, 93, ${s.flash * 0.16})`;
        ctx.fillRect(0, 0, W, H);
      }
      if (s.levelFade > 0) {
        ctx.fillStyle = `rgba(252, 250, 245, ${s.levelFade * 0.85})`;
        ctx.fillRect(0, 0, W, H);
      }
      ctx.restore();
    }
    raf = requestAnimationFrame(frame);

    if (import.meta.env.DEV) {
      window.__flightMiss = () => triggerQuestion();
      window.__flightLevel = () => levelUp();
    }

    return () => {
      cancelAnimationFrame(raf);
      ro.disconnect();
      window.removeEventListener("keydown", kd);
      window.removeEventListener("keyup", ku);
      window.removeEventListener("blur", onBlur);
      window.removeEventListener("focus", onFocus);
      document.removeEventListener("visibilitychange", onVisibility);
      canvas.removeEventListener("pointerdown", pd);
      canvas.removeEventListener("pointermove", pm);
      canvas.removeEventListener("pointerup", pu);
      canvas.removeEventListener("pointercancel", pu);
      for (const t of timersRef.current) clearTimeout(t);
      timersRef.current = [];
      stateRef.current = null;
    };
  }, []);

  return (
    <div className="flight-game" ref={wrapRef}>
      <canvas
        ref={canvasRef}
        className="flight-game-canvas"
        role="img"
        aria-label={`Flight game to ${destinationLabel}. Steer through the amber gates with arrow keys, WASD, a gamepad, or touch.`}
      />

      <div className="flight-hud" aria-hidden="true">
        <div className="flight-hud-chip">
          <small>Gates</small>
          <strong>{hud.score}</strong>
        </div>
        <div className="flight-hud-chip">
          <small>Misses</small>
          <strong>{hud.misses} / {MISSES_PER_QUESTION}</strong>
        </div>
        <div className="flight-hud-chip">
          <small>Speed</small>
          <strong>{hud.speed} kts</strong>
        </div>
      </div>

      {banner && (
        <div className="flight-level-banner" key={`${banner.num}-${banner.name}`}>
          <small>Level {banner.num}</small>
          <strong>{banner.name}</strong>
        </div>
      )}

      <div className="flight-bottom">
        <div className="flight-steer-hint">
          {isTouchDevice() ? "Drag anywhere to steer" : "Arrow keys, WASD, gamepad, or drag"} · miss {MISSES_PER_QUESTION} gates = quick {destinationLabel} trivia
        </div>
        <div className="flight-controls-hint">
          <strong>Take a break while we build your itinerary</strong>
          <span className="flight-progress" aria-live="polite">✦ {progressText || "Finding places and suggestions"}</span>
        </div>
      </div>

      {question && (
        <div className="flight-question" role="dialog" aria-label="Travel trivia">
          <div className="flight-question-card">
            {!verdict ? (
              <>
                <p className="flight-question-label">
                  {MISSES_PER_QUESTION} gates missed — {trivia.matchedCount ? `quick one about ${destinationLabel}` : "travel trivia break"}
                </p>
                <h3>{question.q}</h3>
                <div className="flight-question-actions">
                  <button type="button" onClick={() => answer(true)}>True</button>
                  <button type="button" onClick={() => answer(false)}>False</button>
                </div>
              </>
            ) : (
              <>
                <p className={`flight-question-label ${verdict.correct ? "flight-correct" : "flight-wrong"}`}>
                  {verdict.correct ? "✓ Correct — back in the air" : "✗ Not quite"}
                </p>
                <h3>{verdict.why}</h3>
              </>
            )}
          </div>
        </div>
      )}
    </div>
  );
}
