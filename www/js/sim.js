// Trip simulation: weather, time, survival meters, camp fire, water, night outcomes and scoring.
import { tripById, WEATHER, SITES, BIOMES, ITEMS, MEAL_POOL, WILDLIFE } from './data.js';
import { S, count, addXP, hintLevel, perf } from './save.js';
import { weighted, shuffle, clamp, irand, chance, pick, rand } from './engine.js';

export const T = () => S.trip;
export const def = () => tripById(S.trip.id);
export const has = id => !!(S.trip && S.trip.pack[id]);

export const SLOTS = [{ x: 300, y: 548 }, { x: 455, y: 772 }, { x: 1085, y: 772 }, { x: 1215, y: 585 }];
export const FIRE = { x: 770, y: 610 };
export const SPOTS = {
  faucet: { x: 610, y: 470 }, bearbox: { x: 150, y: 700 }, trashcan: { x: 960, y: 460 }, table: { x: 960, y: 640 },
  hangTree: { x: 130, y: 470 }, line: { x: 1440, y: 700 },
};

export function genForecast(d) {
  const days = [];
  const skilled = hintLevel(d.expert) === 0;
  for (let i = 1; i <= d.days; i++) {
    const f = { day: weighted(d.wx.day), eve: weighted(d.wx.eve), night: weighted(d.wx.night), temps: d.temps.map(t => t + irand(-4, 4)) };
    if (d.script && d.script[i]) Object.assign(f, d.script[i]);
    if (skilled && f.night === 'rain' && chance(0.3)) f.night = 'storm';
    ['day', 'eve', 'night'].forEach((k, j) => { if (WEATHER[f[k]].rain) f.temps[j] -= 4; });
    days.push(f);
  }
  return days;
}

export function newTrip(d, packed, forecast) {
  const b = BIOMES[d.biome];
  let types = shuffle(b.sites);
  if (b.lake || b.river) { const i = types.indexOf('shore'); if (i >= 0) { types.splice(i, 1); types.push('shore'); } }
  const spots = SLOTS.map((s, i) => ({ x: s.x, y: s.y, type: types[i], cleared: false }));
  const meals = {};
  for (let i = 0; i < (packed.food || 0) * 4; i++) { const m = pick(MEAL_POOL); meals[m] = (meals[m] || 0) + 1; }
  const wood = { tinder: { dry: 0, wet: 0 }, kindling: { dry: 0, wet: 0 }, small: { dry: 0, wet: 0 }, log: { dry: 0, wet: 0 } };
  const fw = packed.firewood || 0;
  wood.tinder.dry += fw * 2; wood.kindling.dry += fw * 4; wood.small.dry += fw * 4; wood.log.dry += fw * 3;
  const litter = [];
  const LIT = ['🍬', '📰', '🧃', '🥡', '🧻'];
  const n = d.id === 'backyard' ? 2 : irand(3, 5);
  for (let i = 0; i < n; i++) {
    let x, y, tries = 0;
    do { x = rand(250, 1350); y = rand(480, 850); tries++; } while (tries < 30 && (spots.some(s => Math.hypot(s.x - x, s.y - y) < 120) || Math.hypot(FIRE.x - x, FIRE.y - y) < 110 || (b.lake && y < 560 && x > 1060)));
    litter.push({ x, y, e: pick(LIT) });
  }
  let weight = 0; for (const [k, q] of Object.entries(packed)) weight += (ITEMS[k].wt || 0) * q;
  S.trip = {
    id: d.id, day: 1, hour: 8, forecast,
    m: { health: 100, hunger: 75, thirst: 75, temp: 85, energy: 90, morale: 80 },
    pack: { ...packed }, heavy: weight > 14,
    meals, fish: [], snacks: (packed.snacks || 0) * 3, marsh: (packed.marshmallows || 0) * 3, tablets: (packed.tablets || 0) * 4,
    water: Array((packed.water_bottle || 0) * 2).fill('safe'), treat: null,
    wood,
    camp: {
      spots, tentSpot: -1, tent: { stage: 0, tarp: false, staked: false, fly: false, guy: false, cleared: false },
      bagIn: false, gearIn: false, bagWet: false, drying: false,
      objs: {
        cooler: { x: 915, y: 690, where: 'ground' }, trash: { x: 1010, y: 720, where: 'ground' },
        wood: { x: 620, y: 725, where: 'ground' }, gear: { x: 850, y: 800, where: 'ground' },
      },
      fire: { lit: false, fuel: { tinder: 0, kindling: 0, small: 0, log: 0 }, hot: 0, burn: 0, doused: 0, stirred: false, safe: true, everLit: false },
      litter, dirty: 0, built: {},
    },
    wear: {}, wet: 0, ail: { tummy: 0, cut: false, sun: 0 },
    flags: {}, sc: { natureGood: 0, natureBad: 0, safetyBad: 0, mealsEaten: 0, moraleSum: 0, nights: 0, unsafeFire: 0 },
    exp: { node: 'camp', visited: { camp: 1 }, mission: 0 },
    alerts: {}, log: [], lastEvent: 8,
  };
  if (packed.flashlight) S.trip.flags.pack_flashlight = true;
  return S.trip;
}

// ---------- time & weather ----------
export const phase = h => (h >= 5 && h < 16) ? 'day' : (h >= 16 && h < 21) ? 'eve' : 'night';
export function wxKey(t = T()) { const f = t.forecast[Math.min(t.day, t.forecast.length) - 1]; return f[phase(t.hour)]; }
export const wx = (t = T()) => WEATHER[wxKey(t)];
export function tempNow(t = T()) {
  const [d, e, n] = t.forecast[Math.min(t.day, t.forecast.length) - 1].temps, h = t.hour;
  if (h < 6) return n;
  if (h < 13) return n + 4 + (d - n - 4) * (h - 6) / 7;
  if (h < 18) return d + (e - d) * (h - 13) / 5;
  if (h < 22) return e + (n - e) * (h - 18) / 4;
  return n;
}
export const darkness = h => {
  if (h >= 8 && h <= 17.5) return 0;
  if (h > 17.5 && h < 21) return (h - 17.5) / 3.5 * 0.7;
  if (h >= 21 || h < 5) return 0.7;
  return (1 - (h - 5) / 3) * 0.7;
};
export const timeTag = h => (h >= 5.5 && h < 8.5) || (h >= 17.5 && h < 21) ? 'dawnDusk' : (h >= 8.5 && h < 17.5) ? 'day' : 'night';
export function clock(h) {
  const hh = Math.floor(h) % 24, mm = Math.floor((h % 1) * 60 / 15) * 15;
  const ap = hh >= 12 ? 'pm' : 'am', h12 = hh % 12 === 0 ? 12 : hh % 12;
  return `${h12}:${String(mm).padStart(2, '0')}${ap}`;
}
export const lightSource = () => has('flashlight') || has('lantern');

// ---------- warmth ----------
export function warmthHave(t = T(), atFire = false) {
  let w = 1;
  for (const k in t.wear) if (t.wear[k] && ITEMS[k]) w += ITEMS[k].wear || 0;
  if (t.wet > 40 && !t.wear.rain_jacket) w -= 2;
  if (atFire) w += 2;
  return w;
}
export function warmthNeed(t = T(), temp = tempNow(t)) {
  const w = wx(t);
  return clamp((74 - temp) / 6, 0, 9) + w.wind * 0.6 + (w.rain && !t.wear.rain_jacket ? 1 : 0);
}
export function comfortState(t = T()) {
  const d = warmthHave(t, fireWarm(t)) - warmthNeed(t);
  return d < -1 ? 'cold' : d > 3.5 ? 'hot' : 'ok';
}
export const fireWarm = (t = T()) => t.camp.fire.lit;

// ---------- passing time ----------
export function passTime(hours, activity = 'rest', sheltered = false) {
  const t = T(); if (!t) return;
  let left = hours;
  while (left > 0.001) {
    const step = Math.min(0.25, left); left -= step;
    t.hour += step;
    const w = wx(t), temp = tempNow(t), m = t.m;
    const hot = temp > 82 && !w.rain && phase(t.hour) === 'day';
    const act = activity === 'walk' ? 1.4 : activity === 'work' ? 1.2 : 1;
    m.hunger -= 4.5 * step * act;
    m.thirst -= (5.5 + (hot ? 4 : 0)) * step * act;
    m.energy -= (activity === 'walk' ? 6 : activity === 'work' ? 4 : 2) * step * (t.heavy && activity === 'walk' ? 1.4 : 1);
    if (w.rain && !sheltered) t.wet = Math.min(100, t.wet + (t.wear.rain_jacket ? 2 : 30) * w.rain * step);
    else t.wet = Math.max(0, t.wet - (t.camp.fire.lit ? 40 : 15) * step);
    const d = warmthHave(t, t.camp.fire.lit && activity === 'rest') - warmthNeed(t, temp);
    const target = d < -0.5 ? 85 + d * 13 : d > 3.5 ? 85 - (d - 3.5) * 12 : 88;
    m.temp += (target - m.temp) * Math.min(1, step * 0.9);
    if (hot && !t.wear.hat) t.ail.sun += step;
    const low = ['hunger', 'thirst', 'temp', 'energy'].filter(k => m[k] < 30).length;
    m.morale += (low ? -3 * low : 1.5) * step + (t.wet > 50 ? -2 * step : 0);
    if (m.hunger < 10 || m.thirst < 10 || m.temp < 25) m.health -= 6 * step;
    else if (!low) m.health += 2 * step;
    if (t.ail.tummy > 0) { m.health -= 3 * step; m.morale -= 2 * step; t.ail.tummy -= step; }
    if (t.ail.cut === 'ignored') m.health -= 1 * step;
    burnFire(t, step, w);
    if (w.rain) wetWoodpile(t, step);
    if (t.camp.drying && !w.rain && phase(t.hour) === 'day') { t.camp.dryProg = (t.camp.dryProg || 0) + step; if (t.camp.dryProg >= 1.5) { t.camp.bagWet = false; t.camp.drying = false; t.camp.dryProg = 0; } }
    if (t.treat && t.hour >= t.treat.until) { t.water = t.water.map(u => u === 'treating' ? 'safe' : u); t.treat = null; count('waterSafe'); addXP('camping', 2); t.flags.treat_water = true; }
    for (const k in m) m[k] = clamp(m[k], 0, 100);
  }
}

function wetWoodpile(t, step) {
  const o = t.camp.objs.wood;
  if (o.where !== 'ground') return;
  for (const k in t.wood) { const n = Math.min(t.wood[k].dry, Math.ceil(step * 4)); t.wood[k].dry -= n; t.wood[k].wet += n; }
}
export function burnFire(t, step, w) {
  const f = t.camp.fire;
  if (!f.lit) { f.hot = Math.max(0, f.hot - 8 * step); return; }
  f.hot = Math.max(f.hot, 75);
  f.burn += step * (1 + w.wind * 0.3);
  if (w.rain >= 2 && chance(0.25 * step)) f.fuel.small = Math.max(0, f.fuel.small - 1);
  while (f.burn >= 0.6) {
    f.burn -= 0.6;
    if (f.fuel.log > 0) f.fuel.log--;
    else if (f.fuel.small > 0) f.fuel.small--;
    else if (f.fuel.kindling > 0) f.fuel.kindling = Math.max(0, f.fuel.kindling - 2);
    else { f.lit = false; f.hot = 65; break; }
  }
}
export function fireLevel(f) {
  if (!f.lit) return f.hot > 5 ? -f.hot / 100 : 0;
  return clamp(0.3 + f.fuel.log * 0.18 + f.fuel.small * 0.08 + f.fuel.kindling * 0.03, 0.3, 1);
}
export function woodTotal(t = T(), wetToo = true) {
  let n = 0; for (const k in t.wood) n += t.wood[k].dry + (wetToo ? t.wood[k].wet : 0); return n;
}

// ---------- water & food ----------
export const waterCap = (t = T()) => (t.pack.water_bottle || 0) * 2;
export function drink() {
  const t = T();
  let i = t.water.indexOf('safe');
  if (i < 0) i = t.water.indexOf('raw');
  if (i < 0) return null;
  const kind = t.water[i]; t.water.splice(i, 1);
  t.m.thirst = Math.min(100, t.m.thirst + 30);
  if (kind === 'raw' && chance(0.65)) { t.ail.tummy = 2.5; t.ail.pendingLesson = 'untreated'; }
  return kind;
}
export function mealCount(t = T()) { let n = 0; for (const k in t.meals) n += t.meals[k]; return n + t.fish.length; }
export function eat(fill, morale = 3) { const m = T().m; m.hunger = Math.min(100, m.hunger + fill); m.morale = Math.min(100, m.morale + morale); m.energy = Math.min(100, m.energy + fill / 4); }

export function natureGood(n = 1) { T().sc.natureGood += n; addXP('nature', 2 * n); }
export function natureBad(n = 1, lesson) { T().sc.natureBad += n; if (lesson) T().log.push(lesson); }

// ---------- goals ----------
export const GOALS = {
  tent_up:        { e: '⛺', n: 'Set up tent', test: t => t.camp.tent.stage >= 2 },
  bag_in_tent:    { e: '🛌', n: 'Put bag in tent', test: t => t.camp.bagIn },
  pack_flashlight:{ e: '🔦', n: 'Pack a flashlight', test: t => !!t.pack.flashlight || !!t.pack.lantern },
  sleep_night:    { e: '🌙', n: 'Sleep through the night', test: t => t.sc.nights >= 1 },
  build_fire:     { e: '🔥', n: 'Build a campfire', test: t => t.flags.fire },
  cook_meal:      { e: '🍳', n: 'Cook a meal', test: t => t.flags.cooked },
  rainfly:        { e: '🌂', n: 'Add the rain fly', test: t => t.camp.tent.fly },
  clean_site:     { e: '🗑️', n: 'Clean up camp', test: t => t.camp.litter.length === 0 && t.camp.dirty === 0 },
  fire_safe:      { e: '💧', n: 'Put out fire safely', test: t => t.flags.fireOut },
  catch_fish:     { e: '🎣', n: 'Catch a fish', test: t => t.flags.fish },
  cook_fish:      { e: '🐟', n: 'Cook a fish', test: t => t.flags.cookedFish },
  treat_water:    { e: '💧', n: 'Make water safe', test: t => t.flags.treat_water },
  secure_food:    { e: '🔒', n: 'Secure your food', test: t => t.camp.objs.cooler.where !== 'ground' },
  use_compass:    { e: '🧭', n: 'Finish a compass mission', test: t => t.flags.nav },
  find_landmarks: { e: '🗺️', n: 'Find 3 places', test: t => Object.keys(t.exp.visited).length >= 4 },
  find_tracks:    { e: '🐾', n: 'Identify tracks', test: t => t.flags.tracks },
  gather_wood:    { e: '🪵', n: 'Gather firewood', test: t => t.flags.gathered },
  dress_warm:     { e: '🧥', n: 'Stay warm at night', test: t => t.flags.warmNight },
  storm_ready:    { e: '⛈️', n: 'Get ready for the storm', test: t => t.flags.stormOk },
  wood_dry:       { e: '🪵', n: 'Keep firewood dry', test: t => t.camp.objs.wood.where !== 'ground' },
  build_shelter:  { e: '⛺', n: 'Build a tarp shelter', test: t => t.camp.built.shelter },
  high_ground:    { e: '⬆️', n: 'Camp on high ground', test: t => t.camp.tentSpot >= 0 && SITES[t.camp.spots[t.camp.tentSpot].type].drain },
  build_bridge:   { e: '🌉', n: 'Build a bridge', test: t => t.flags.bridge },
};
export const goalDone = id => GOALS[id].test(T());

// ---------- night ----------
export function evaluateNight() {
  const t = T(), f = t.forecast[t.day - 1], w = WEATHER[f.night], temp = f.temps[2];
  const d = def(), c = t.camp, q = c.tent, site = SITES[c.spots[c.tentSpot].type];
  const ev = [], add = (id, good, icon, lesson, eff = {}) => ev.push({ id, good, icon, lesson, eff });
  const fire = c.fire;
  // fire safety
  if (fire.lit || fire.hot > 5) {
    add('embers', false, '🔥⚠️', 'embers', { morale: -5 });
    t.sc.unsafeFire++; t.sc.safetyBad++;
    fire.lit = false; fire.hot = 0; fire.fuel = { tinder: 0, kindling: 0, small: 0, log: 0 };
  } else if (fire.everLit) add('fire_safe', true, '🔥✅', null);
  // rain
  if (w.rain) {
    let bad = false;
    if (!q.fly) { add('rain_in', false, '🌧️⛺', 'rain_in', { morale: -8, energy: -10 }); c.bagWet = true; bad = true; }
    if (!site.drain) { add('flooded', false, '⛺💧', site.flood ? 'bugs' : 'flooded', { morale: -8, energy: -10 }); c.bagWet = true; bad = true; }
    if (!q.tarp && !bad) { add('damp', false, '💧🟫', 'damp_floor', { morale: -3 }); bad = true; }
    if (!c.gearIn) { add('gear_wet', false, '🎒💧', 'rain_in', { morale: -4 }); }
    if (c.objs.wood.where === 'ground' && woodTotal(t) > 0) add('wood_wet', false, '🪵💧', 'wood_wet', {});
    if (!bad) { add('dry', true, '☂️✅', null, { morale: 5 }); count('dryNights'); addXP('weather', 8); }
  }
  // wind
  const windy = w.wind >= 2 || (site.wind && w.wind >= 0.5) || (site.wind === 2 && chance(0.6));
  if (windy) {
    if (!q.staked || !q.guy) add('wind_tent', false, '💨⛺', 'wind_tent', { energy: -12, morale: -5 });
    else add('wind_ok', true, '💨✅', null);
  }
  if (f.night === 'storm') {
    const ok = q.fly && q.staked && q.guy && site.drain && !site.hazard && c.objs.wood.where !== 'ground';
    if (ok) { add('storm_ok', true, '⛈️✅', null, { morale: 8 }); t.flags.stormOk = true; count('stormReady'); addXP('weather', 15); }
    else add('storm_bad', false, '⛈️😣', 'wind_tent', { morale: -6 });
  }
  if (site.hazard && (windy || w.rain)) { add('snag', false, '🌳💥', 'snag', { morale: -10, health: -5 }); t.sc.safetyBad++; }
  if (site.flat === false && !site.lumpy) add('slope', false, '⛺↘️', 'slope', { energy: -10 });
  if (site.lumpy && !q.cleared) add('lumpy', false, '🪨😣', 'lumpy', { energy: -10 });
  if (site.bugs && !t.pack.bug_spray) add('bugs', false, '🦟', 'bugs', { morale: -6, energy: -5 });
  // cold
  const need = clamp((74 - temp) / 6, 0, 9) + w.wind * 0.3;
  let have = 1 + 1;
  for (const k in t.wear) if (t.wear[k] && ITEMS[k]) have += ITEMS[k].wear || 0;
  if (c.bagIn) have += c.bagWet ? 1 : 4;
  if (have < need) add('cold', false, '🥶', 'cold', { energy: -12, morale: -8, temp: -25 });
  else { if (need >= 4) { add('warm', true, '🛌😊', null, { morale: 4 }); } t.flags.warmNight = true; }
  if (!c.bagIn) add('no_bag', false, '🛌❌', 'cold', { energy: -10 });
  // wildlife
  const critters = d.wildlife.includes('raccoon') || d.wildlife.includes('bear');
  const foodCount = Object.values(t.meals).reduce((a, b) => a + b, 0) + t.snacks + t.fish.length;
  if (critters && foodCount > 0) {
    if (c.objs.cooler.where === 'ground') {
      let lost = 0;
      for (let i = 0; i < 2; i++) { const ks = Object.keys(t.meals).filter(k => t.meals[k] > 0); if (ks.length) { t.meals[pick(ks)]--; lost++; } else if (t.snacks > 0) { t.snacks--; lost++; } }
      const near = c.tentSpot >= 0 && Math.hypot(c.objs.cooler.x - c.spots[c.tentSpot].x, c.objs.cooler.y - c.spots[c.tentSpot].y) < 260;
      add('raccoon', false, '🦝🍗', 'raccoon', { morale: -5, energy: near ? -10 : 0, lost });
    } else { add('raccoon_foiled', true, '🦝🔒', null, { morale: 4 }); count('raccoonFoiled'); addXP('nature', 8); }
  }
  if (critters && c.objs.trash.where === 'ground' && (c.dirty || c.trashBag)) { add('trash_raid', false, '🦝🗑️', 'trash', {}); natureBad(1); }
  if (!lightSource()) add('dark', false, '🌑😟', 'dark', { morale: -8 });
  if (!ev.some(e => !e.good)) add('perfect', true, '🌌🦉😊', null, { morale: 12, energy: 10 });
  return ev;
}

export function applyNight(ev) {
  const t = T(), m = t.m;
  m.energy = Math.min(100, m.energy + 65);
  m.hunger -= 15; m.thirst -= 15;
  m.temp = 80;
  for (const e of ev) for (const k of ['morale', 'energy', 'health', 'temp']) if (e.eff[k]) m[k] += e.eff[k];
  for (const k in m) m[k] = clamp(m[k], 0, 100);
  t.sc.nights++; t.sc.moraleSum += m.morale;
  const good = ev.filter(e => e.good).length, bad = ev.filter(e => !e.good).length;
  perf(bad <= 1);
  count('nights');
  if (!bad) addXP('camping', 10);
  t.nightLog = t.nightLog || []; t.nightLog.push({ good, bad, ids: ev.map(e => e.id) });
}

export function nextMorning() {
  const t = T();
  t.day++; t.hour = 7;
  const f = t.camp.fire; f.doused = 0; f.stirred = false; f.checked = false;
  t.wet = 0;
  if (t.camp.bagWet) t.camp.bagIn = false;
  return t.day > def().days;
}

export function tripStars() {
  const t = T(), sc = t.sc, c = t.camp;
  const trashLeft = c.litter.length + (c.dirty ? 1 : 0);
  const nature = clamp(Math.round(4 + sc.natureGood * 0.25 - sc.natureBad - trashLeft * 0.5), 1, 5);
  const safety = clamp(5 - sc.unsafeFire * 2 - sc.safetyBad, 1, 5);
  const food = clamp(Math.round(2 + sc.mealsEaten * 0.7), 1, 5);
  const comfort = clamp(Math.round((sc.moraleSum / Math.max(1, sc.nights)) / 20), 1, 5);
  return { nature, safety, food, comfort };
}

// Random wildlife for a place and time
export function wildlifeFor(list, h, where) {
  const tag = timeTag(h);
  return list.filter(id => {
    const a = WILDLIFE[id]; if (!a) return false;
    if (where && !where.includes(a.where)) return false;
    return a.time === 'any' || a.time === tag || (a.time === 'dawnDusk' && tag !== 'night' && chance(0.3)) || (a.time === 'day' && tag === 'dawnDusk');
  });
}
