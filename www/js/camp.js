// The campsite: primary gameplay screen.
import { G, W, H, emo, emit, burst, drawParticles, rand, pick, chance, clamp, dist, rr, pointer } from './engine.js';
import { audio } from './audio.js';
import { S, save, addXP, count, hintLevel, discover, cosmetic, perf } from './save.js';
import { ITEMS, SITES, BIOMES, LESSONS, WILDLIFE, FOODS, WEATHER } from './data.js';
import {
  T, def, has, phase, wx, wxKey, tempNow, darkness, clock, passTime, fireLevel, woodTotal, waterCap, drink, eat,
  natureGood, natureBad, GOALS, goalDone, comfortState, warmthHave, warmthNeed, lightSource, FIRE, SPOTS, wildlifeFor, timeTag, mealCount,
} from './sim.js';
import * as gx from './gfx.js';
import { el, btn, root, modal, closeModal, toast, banner, lesson, bubble, closeBubble, meterBar, modalOpen, speak } from './ui.js';
import { SC, go } from './nav.js';
import { forecastHTML } from './tripmap.js';

export const RACK = { x: 560, y: 830 }, SHELTER = { x: 800, y: 478 }, LINE = { x: 230, y: 850 }, CHAIR = { x: 670, y: 700 };
export const STREAM = [[60, 330], [130, 450], [70, 580], [140, 720], [60, 960]];
const REAL_SEC_PER_HOUR = 20;

let t, d, b, env, camper, critters, drag, hudEl, lastHud, alertKeys, tick, flash, nextCritter, eventTimer, rainFx, arriving, dirtyPos;

export function waterSource() {
  const bb = BIOMES[def().biome];
  if (bb.faucet) return { x: SPOTS.faucet.x + 30, y: SPOTS.faucet.y + 20, kind: 'faucet' };
  if (bb.lake) return { x: 1110, y: 545, kind: 'lake' };
  if (bb.river) return { x: 1215, y: 650, kind: 'river' };
  return { x: 175, y: 600, kind: 'stream' };
}

function buildEnv() {
  env = gx.makeEnv(d.biome, hashStr(d.id) + 3);
  const avoid = [{ x: 770, y: 660, rx: 640, ry: 250 }, ...t.camp.spots.map(s => ({ x: s.x, y: s.y + 10, rx: 150, ry: 90 }))];
  if (b.lake) avoid.push({ x: b.lake.cx, y: b.lake.cy, rx: b.lake.rx + 60, ry: b.lake.ry + 50 });
  if (b.river) avoid.push({ x: 1300, y: 640, rx: 130, ry: 400 });
  if (b.stream || d.water === 'stream') avoid.push({ x: 100, y: 640, rx: 110, ry: 360 });
  if (b.house) avoid.push({ x: 280, y: 380, rx: 280, ry: 80 });
  avoid.push({ x: SPOTS.hangTree.x, y: SPOTS.hangTree.y, rx: 60, ry: 40 });
  gx.scatterTrees(env, Math.round(26 * b.density), { x0: -500, x1: 2100, y0: 350, y1: 470 }, avoid, 1);
  gx.scatterTrees(env, Math.round(10 * b.density), { x0: -500, x1: 190, y0: 470, y1: 960 }, avoid, 1.2);
  gx.scatterTrees(env, Math.round(10 * b.density), { x0: 1430, x1: 2100, y0: 470, y1: 960 }, avoid, 1.2);
  if (!b.house) env.trees.push({ x: SPOTS.hangTree.x, y: SPOTS.hangTree.y, h: 260, type: 'oak', p: 1, hang: true });
  t.camp.spots.forEach(s => { if (s.type === 'snag') env.trees.push({ x: s.x - 95, y: s.y - 28, h: 210, type: 'dead', p: 0 }); });
  env.trees.sort((a, c) => a.y - c.y);
}
function hashStr(s) { let h = 7; for (const ch of s) h = (h * 31 + ch.charCodeAt(0)) >>> 0; return h; }

// ---------------------------------------------------------------------------
const Camp = {
  enter(arg = {}) {
    t = T(); if (!t) { go('home'); return; }
    d = def(); b = BIOMES[d.biome];
    buildEnv();
    critters = []; drag = null; lastHud = ''; alertKeys = []; tick = 0; flash = 0; nextCritter = 5; eventTimer = 0; rainFx = 0;
    const tent = t.camp.tentSpot >= 0 ? t.camp.spots[t.camp.tentSpot] : null;
    camper = { x: 770, y: 780, tx: 770, ty: 780, face: 1, busy: 0, cb: null, speed: 280 };
    if (tent) { camper.x = camper.tx = tent.x + 120; camper.y = camper.ty = tent.y + 40; }
    arriving = !!arg.arrive;
    if (arriving) { camper.x = G.view.x0 - 60; camper.y = 800; this.walkTo(760, 790); audio.sfx('step'); }
    dirtyPos = { x: 860, y: 660 };
    this.buildHUD();
    this.updateAmbience();
    if (arg.msg) toast(arg.msg);
    if (arg.morning) this.morning();
    else if (arriving) {
      if (d.id === 'backyard' && !S.tutorial.first) { S.tutorial.first = 1; setTimeout(() => toast('👆 Tap the ground to walk'), 800); }
    }
    this.refreshBanner();
  },
  exit() { closeBubble(); this.extra = null; this.windBoost = 0; },
  back() { this.pauseMenu(); },
  // Used by the night scene to reuse the camp renderer without the HUD.
  prepareView() {
    t = T(); d = def(); b = BIOMES[d.biome];
    buildEnv();
    critters = []; drag = null; flash = 0; arriving = false; dirtyPos = { x: 860, y: 660 };
    camper = { x: -500, y: 800, tx: -500, ty: 800, face: 1, hide: true };
    this.extra = null; this.windBoost = 0;
  },
  setFlash(v) { flash = v; },
  addCritter(cr) { critters.push(Object.assign({ t: 0, face: 1, v: 110, life: 99, exitX: G.view.x1 + 100 }, cr)); return critters[critters.length - 1]; },
  clearCritters() { critters.length = 0; },
  tickCritters(dt) {
    for (const cr of critters) {
      cr.t += dt;
      const ddx = cr.tx - cr.x, ddy = cr.ty - cr.y, cd = Math.hypot(ddx, ddy);
      if (cd > 3) { cr.x += ddx / cd * Math.min(cr.v * dt, cd); cr.y += ddy / cd * Math.min(cr.v * dt, cd); cr.face = ddx < 0 ? 1 : -1; }
    }
  },

  // ---------- HUD ----------
  buildHUD() {
    const u = root(); u.innerHTML = '';
    hudEl = {};
    const top = el('div', 'hud-top', '', u);
    const ms = el('div', 'meters', '', top);
    const MK = [['health', '❤️'], ['hunger', '🍗'], ['thirst', '💧'], ['temp', '🌡️'], ['energy', '⚡'], ['morale', '😊']];
    hudEl.meters = {};
    for (const [k, e] of MK) {
      const m = el('div', 'meter', `<svg viewBox="0 0 36 36"><circle cx="18" cy="18" r="15.5" fill="#fff" stroke="#e3d6bd" stroke-width="4"/><circle class="arc" cx="18" cy="18" r="15.5" fill="none" stroke="#36b37e" stroke-width="4" stroke-dasharray="97.4" stroke-linecap="round"/></svg><span style="position:relative">${e}</span>`, ms);
      m.addEventListener('click', () => this.meterInfo(k));
      hudEl.meters[k] = m;
    }
    const mid = el('div', 'hud-mid', '', top);
    hudEl.clock = el('div', 'clockbox', '', mid);
    hudEl.clock.addEventListener('click', () => { audio.sfx('tap'); modal({ title: '📅 Forecast', body: forecastHTML(t.forecast) }); });
    hudEl.alerts = el('div', 'alerts', '', mid);
    const right = el('div', 'hud-right', '', top);
    hudEl.goals = btn('🎯', () => this.goalsPanel(), 'round', right);
    btn('⏸️', () => this.pauseMenu(), 'round', right);
    const tb = el('div', 'toolbar', '', u);
    const tool = (icon, label, fn, id) => { const bt = btn(`<span class="big">${icon}</span><small>${label}</small>`, fn, '', tb); if (id) hudEl[id] = bt; return bt; };
    tool('🎒', 'Gear', () => this.gearPanel(), 'gear');
    tool('🛠️', 'Build', () => this.buildPanel(), 'build');
    tool('🗺️', 'Explore', () => this.explore(), 'explore');
    tool('🔥', 'Fire', () => this.walkTo(FIRE.x + 90, FIRE.y + 60, () => go('fire')), 'fire');
    tool('🍳', 'Cook', () => this.cook(), 'cook');
    tool('💧', 'Water', () => this.waterPanel(), 'water');
    if (d.fish) tool('🎣', 'Fish', () => this.fish(), 'fish');
    tool('📖', 'Guide', () => go('guide', { from: 'camp' }), 'guide');
    this.hud(true);
  },
  hud(force) {
    const m = t.m;
    for (const k in hudEl.meters) {
      const v = m[k], mm = hudEl.meters[k], arc = mm.querySelector('.arc');
      arc.setAttribute('stroke-dashoffset', (97.4 * (1 - v / 100)).toFixed(1));
      arc.setAttribute('stroke', v > 60 ? '#36b37e' : v > 30 ? '#f0b429' : '#e0533d');
      mm.classList.toggle('low', v < 25);
    }
    const w = wx(), dark = darkness(t.hour) > 0.4;
    const tempF = Math.round(tempNow());
    const clk = `${dark ? '🌙' : phase(t.hour) === 'eve' ? '🌇' : '☀️'} ${d.days > 1 ? `Day ${t.day}/${d.days}` : ''} ${clock(t.hour)} <span class="big">${dark && w.ne ? w.ne : w.e}</span> ${tempF}°`;
    if (hudEl.clock.innerHTML !== clk) hudEl.clock.innerHTML = clk;
    // alerts
    const hl = hintLevel(d.expert), al = [];
    const cs = comfortState();
    if (m.hunger < 30) al.push(['🍗⬇️', 'hungry']);
    if (m.thirst < 30) al.push(['💧⬇️', 'thirsty']);
    if (cs === 'cold' && m.temp < 70) al.push(['🌡️🥶', 'cold']);
    if (cs === 'hot' && m.temp < 75) al.push(['🌡️🥵', 'hot']);
    if (m.energy < 25) al.push(['⚡⬇️', 'tired']);
    if (t.wet > 50) al.push(['💦', 'wet']);
    if (t.ail.tummy > 0) al.push(['🤢', 'untreated']);
    if (t.ail.sun > 2.5 && !t.wear.hat) al.push(['☀️😖', 'sunburn']);
    const f = t.forecast[t.day - 1];
    if (hl >= 1 && t.camp.tentSpot >= 0 && !t.camp.tent.fly && (WEATHER[f.night].rain || WEATHER[f.eve].rain) && t.hour > 12) al.push(['🌧️⚠️', 'rain_in']);
    if (hl >= 1 && t.hour > 18 && t.camp.objs.cooler.where === 'ground' && d.wildlife.includes('raccoon')) al.push(['🦝🍗', 'raccoon']);
    if (hl >= 1 && t.hour > 20.5 && (t.camp.fire.lit || t.camp.fire.hot > 5)) al.push(['🔥⚠️', 'embers']);
    if (dark && !lightSource()) al.push(['🔦❌', 'dark']);
    if (hl >= 1 && t.hour > 19 && t.camp.tentSpot >= 0 && !t.camp.bagIn && has('sleeping_bag') && !t.camp.bagWet) al.push(['🛌❓', 'cold']);
    const key = al.map(a => a[0]).join('');
    if (key !== lastHud || force) {
      lastHud = key; hudEl.alerts.innerHTML = '';
      for (const [ic, les] of al) { const a = el('div', 'alert', ic, hudEl.alerts); a.addEventListener('click', () => { audio.sfx('tap'); lesson(ic, LESSONS[les]); }); }
    }
    const gs = d.goals.filter(g => goalDone(g)).length;
    hudEl.goals.innerHTML = `🎯<span class="badge-n">${gs}/${d.goals.length}</span>`;
    // contextual hints on toolbar
    if (hudEl.fire) hudEl.fire.classList.toggle('pulse', hl >= 2 && t.camp.tentSpot >= 0 && !t.camp.fire.lit && t.hour > 17 && !!has('fire_starter'));
    if (hudEl.water) hudEl.water.classList.toggle('pulse', hl >= 1 && m.thirst < 30);
  },
  refreshBanner() {
    const c = t.camp;
    if (c.tentSpot < 0) banner('⛺ Pick a tent spot', 'Pick a tent spot');
    else if (t.hour >= 22) banner('🌙 Bedtime! Tap the tent', 'Bedtime');
    else if (t.hour >= 18.5 && hintLevel(d.expert) >= 1) banner('🌇 Get camp ready for night');
    else banner('');
  },
  meterInfo(k) {
    const L = { health: ['❤️', 'Health drops when other meters get low.'], hunger: ['🍗', LESSONS.hungry], thirst: ['💧', LESSONS.thirsty], temp: ['🌡️', comfortState() === 'hot' ? LESSONS.hot : LESSONS.cold], energy: ['⚡', LESSONS.tired], morale: ['😊', 'Fun, comfort and success make you happy.'] }[k];
    audio.sfx('tap'); lesson(L[0], L[1]);
  },

  // ---------- helpers ----------
  walkTo(x, y, cb) {
    camper.tx = clamp(x, G.view.x0 + 40, G.view.x1 - 40); camper.ty = clamp(y, 480, 880);
    if (b.lake && inLake(camper.tx, camper.ty)) camper.ty = b.lake.cy + b.lake.ry + 40;
    camper.cb = cb || null;
  },
  updateAmbience() {
    const w = wx(), n = darkness(t.hour) > 0.4;
    audio.setAmbience({ wind: 0.2 + w.wind * 0.4, rain: w.rain, water: (b.lake || b.river || d.water === 'stream') ? 0.7 : 0, fire: t.camp.fire.lit ? fireLevel(t.camp.fire) : 0, birds: n ? 0 : 1, night: n ? 1 : 0, frogs: b.lake && t.hour > 18 ? 1 : 0 });
    audio.setMusic(wxKey() === 'storm' ? 'storm' : n ? 'night' : 'day');
  },
  spend(hours, act = 'work') {
    const before = phase(t.hour), wb = wxKey();
    passTime(hours, act, false);
    if (phase(t.hour) !== before || wxKey() !== wb) this.weatherChange();
    this.hud(); this.refreshBanner(); this.updateAmbience();
  },
  weatherChange() {
    const w = wx();
    toast(`<span class="big">${darkness(t.hour) > 0.4 ? w.ne : w.e}</span> ${w.n}`);
    if (w.rain) audio.sfx('thunder');
  },

  // ---------- update ----------
  update(dt) {
    if (!t) return;
    // time flows only when no panel is open
    if (!modalOpen() && !arriving) {
      const before = phase(t.hour), wb = wxKey();
      const shelter = underShelter(camper.x, camper.y);
      passTime(dt / REAL_SEC_PER_HOUR, 'rest', shelter);
      if (phase(t.hour) !== before || wxKey() !== wb) { this.weatherChange(); this.updateAmbience(); this.refreshBanner(); }
      if (t.hour >= 18.5 && !t.flags.eveBanner) { t.flags.eveBanner = 1; this.refreshBanner(); }
      if (t.hour >= 22 && !t.flags.bedBanner) { t.flags.bedBanner = 1; this.refreshBanner(); audio.sfx('hoot'); }
      if (t.hour >= 24) { this.sleep(true); return; }
      if (t.m.health <= 5) { this.rescue(); return; }
      eventTimer += dt;
      if (eventTimer > 12) { eventTimer = 0; this.randomEvent(); }
    }
    tick += dt;
    if (tick > 0.3) { tick = 0; this.hud(); }
    // camper movement
    const dx = camper.tx - camper.x, dy = camper.ty - camper.y, dd = Math.hypot(dx, dy);
    if (dd > 4) {
      const sp = camper.speed * dt * (t.m.energy < 20 ? 0.6 : 1);
      camper.x += dx / dd * Math.min(sp, dd); camper.y += dy / dd * Math.min(sp, dd);
      camper.face = dx > 0 ? 1 : dx < 0 ? -1 : camper.face; camper.walking = true;
      if (Math.random() < dt * 4) audio.sfx('step');
    } else if (camper.walking) {
      camper.walking = false; arriving = false;
      const cb = camper.cb; camper.cb = null; cb && cb();
    }
    // fire fx
    const fl = fireLevel(t.camp.fire);
    gx.fireParticles(FIRE.x, FIRE.y - 4, fl, 1);
    // weather fx
    const w = wx();
    if (w.rain >= 2 && Math.random() < dt * 0.15) { flash = 1; setTimeout(() => audio.sfx('thunder'), 400); }
    flash = Math.max(0, flash - dt * 3);
    // camper reactions fx
    if (comfortState() === 'cold' && Math.random() < dt * 1.2 && !G.reduce) emit({ x: camper.x + 14 * camper.face, y: camper.y - 108, vx: 25 * camper.face, vy: -10, life: 1.2, size: 5, grow: 10, color: 'rgba(255,255,255,0.6)', fadeIn: true });
    if (t.wet > 50 && Math.random() < dt * 5) emit({ x: camper.x + rand(-14, 14), y: camper.y - rand(40, 110), vy: 120, g: 300, life: 0.5, size: 2.5, color: '#8ec9ff' });
    if (comfortState() === 'hot' && Math.random() < dt * 2) emit({ x: camper.x + 18, y: camper.y - 118, vx: 20, vy: -20, g: 200, life: 0.7, size: 3, color: '#8ec9ff' });
    // bugs at shore sites
    t.camp.spots.forEach(s => { if (SITES[s.type].bugs && Math.random() < dt * 2) emit({ x: s.x + rand(-60, 60), y: s.y - rand(20, 90), vx: rand(-30, 30), vy: rand(-20, 20), life: 1.5, size: 2, color: '#333' }); });
    // critters
    nextCritter -= dt;
    if (nextCritter <= 0) { nextCritter = rand(18, 35); this.spawnCritter(); }
    for (let i = critters.length - 1; i >= 0; i--) {
      const cr = critters[i]; cr.t += dt;
      const ddx = cr.tx - cr.x, ddy = cr.ty - cr.y, cd = Math.hypot(ddx, ddy);
      if (cd > 3) { cr.x += ddx / cd * Math.min(cr.v * dt, cd); cr.y += ddy / cd * Math.min(cr.v * dt, cd); cr.face = ddx < 0 ? 1 : -1; }
      else if (cr.t > cr.life) { cr.tx = cr.exitX; cr.ty = cr.y; cr.v *= 1.5; cr.leaving = true; }
      if (cr.leaving && cd < 5) critters.splice(i, 1);
    }
  },
  spawnCritter() {
    const h = t.hour;
    let kind;
    if (h > 18.5 && h < 23 && t.camp.objs.cooler.where === 'ground' && d.wildlife.includes('raccoon') && chance(0.7)) kind = 'raccoon';
    else { const opts = wildlifeFor(d.wildlife, h, ['ground', 'tree']); if (!opts.length) return; kind = pick(opts); }
    if (kind === 'bear' || kind === 'wolf') return;
    const left = chance(0.5), sy = rand(470, 540);
    const exitX = left ? G.view.x0 - 80 : G.view.x1 + 80;
    let tx = left ? rand(200, 420) : rand(1180, 1400), ty = sy + rand(0, 60);
    if (kind === 'raccoon') { const co = t.camp.objs.cooler; tx = co.x + (left ? -90 : 90); ty = co.y; }
    if (b.lake && inLake(tx, ty)) ty = b.lake.cy + b.lake.ry + 50;
    critters.push({ kind, e: WILDLIFE[kind].e, x: exitX, y: ty, tx, ty, exitX, v: kind === 'snail' ? 20 : 120, t: 0, life: rand(8, 14), face: 1 });
  },
  randomEvent() {
    const hl = hintLevel(d.expert), c = t.camp;
    if (t.ail.sun > 3 && !t.wear.hat && !t.flags.sunburnDone && phase(t.hour) === 'day') { t.flags.sunburnDone = 1; this.firstAid('sun'); return; }
    if (t.m.thirst < 12 && !t.flags.dehyd) { t.flags.dehyd = 1; this.firstAid('dehydrated'); return; }
    if (t.hour > 18 && t.hour < 21.5 && !has('bug_spray') && (b.lake || b.river) && !t.flags.bite && chance(0.35)) { t.flags.bite = 1; this.firstAid('bite'); return; }
    if (t.ail.pendingLesson && t.ail.tummy > 0) { const l = t.ail.pendingLesson; t.ail.pendingLesson = null; S.lessons.germs = 1; toast('🤢 Tummy ache!'); lesson('💧🦠', LESSONS[l]); perf(false); }
  },
  rescue() {
    t.m.health = 45; t.m.hunger = Math.max(t.m.hunger, 50); t.m.thirst = Math.max(t.m.thirst, 60); t.m.temp = Math.max(t.m.temp, 70); t.m.energy = Math.max(t.m.energy, 50);
    t.ail.tummy = 0;
    passTime(2, 'rest', true);
    modal({ title: '🧑‍🚒 Ranger Help', body: '<div class="bigicon">🧑‍🚒🤝🏕️</div><div class="tip">A ranger helped you feel better.</div><div class="tip">Keep 🍗 💧 🌡️ up!</div>', buttons: [{ label: '👍 OK', cls: 'go' }] });
    perf(false);
  },

  // ---------- input ----------
  objAt(x, y) {
    const o = t.camp.objs;
    for (const k of ['cooler', 'trash', 'wood', 'gear']) {
      const ob = o[k];
      if (!visibleObj(k)) continue;
      if (Math.abs(ob.x - x) < 50 && y > ob.y - 70 && y < ob.y + 20) return k;
    }
    return null;
  },
  onDown(x, y) {
    closeBubble();
    const k = this.objAt(x, y);
    drag = k ? { k, ox: t.camp.objs[k].x - x, oy: t.camp.objs[k].y - y, sx: t.camp.objs[k].x, sy: t.camp.objs[k].y } : null;
  },
  onMove(x, y, p) {
    if (drag && p.drag) { const o = t.camp.objs[drag.k]; o.x = clamp(x + drag.ox, G.view.x0 + 40, G.view.x1 - 40); o.y = clamp(y + drag.oy, 470, 880); }
  },
  onUp(x, y, p) {
    if (drag && p.drag) { this.dropObj(drag.k); }
  },
  dropObj(k) {
    const o = t.camp.objs[k], c = t.camp, near = (pt, r = 110) => dist(o.x, o.y, pt.x, pt.y) < r;
    audio.sfx('thunk');
    const ret = () => { o.x = drag.sx; o.y = drag.sy; };
    if (k === 'cooler') {
      if (b.bearbox && near(SPOTS.bearbox)) { o.where = 'box'; o.x = SPOTS.bearbox.x; o.y = SPOTS.bearbox.y + 5; toast('🔒🐻 Food locked up!'); audio.sfx('ok'); addXP('nature', 4); return; }
      if (c.built.hang && near({ x: SPOTS.hangTree.x + 60, y: SPOTS.hangTree.y + 20 }, 130)) { o.where = 'hang'; o.x = SPOTS.hangTree.x + 70; o.y = SPOTS.hangTree.y + 30; toast('🪢🍗 Food hung high!'); audio.sfx('ok'); addXP('nature', 4); return; }
      o.where = 'ground';
      if (c.tentSpot >= 0 && dist(o.x, o.y, c.spots[c.tentSpot].x, c.spots[c.tentSpot].y) < 200 && hintLevel(d.expert) >= 2) toast('🦝❓');
    }
    if (k === 'trash') {
      if (b.trashcan && near(SPOTS.trashcan)) { o.where = 'can'; o.x = SPOTS.trashcan.x; o.y = SPOTS.trashcan.y + 5; toast('🗑️✅'); audio.sfx('ok'); natureGood(); return; }
      if (c.built.hang && near({ x: SPOTS.hangTree.x + 60, y: SPOTS.hangTree.y + 20 }, 130)) { o.where = 'hang'; toast('🪢🗑️'); audio.sfx('ok'); o.x = SPOTS.hangTree.x + 40; o.y = SPOTS.hangTree.y + 40; return; }
      o.where = 'ground';
      if (dist(o.x, o.y, FIRE.x, FIRE.y) < 170) { toast('🐜🐜'); lesson('🗑️🐜', LESSONS.ants); }
    }
    if (k === 'wood') {
      if (c.built.rack && near(RACK)) { o.where = 'rack'; o.x = RACK.x; o.y = RACK.y; toast('🪵✅ Off the ground'); audio.sfx('ok'); return; }
      if (c.built.shelter && near(SHELTER, 130)) { o.where = 'shelter'; o.x = SHELTER.x; o.y = SHELTER.y + 10; toast('🪵⛺ Covered'); audio.sfx('ok'); return; }
      o.where = 'ground';
    }
    if (k === 'gear') {
      if (c.tentSpot >= 0 && c.tent.stage >= 2 && near(c.spots[c.tentSpot], 130)) { c.gearIn = true; o.where = 'tent'; toast('🎒⛺ Gear stored'); audio.sfx('zip'); return; }
      o.where = 'ground'; c.gearIn = false;
    }
    if (b.lake && inLake(o.x, o.y)) { ret(); toast('💦❌'); }
    if (dist(o.x, o.y, FIRE.x, FIRE.y) < 80) { ret(); toast('🔥❌'); }
  },
  onTap(x, y) {
    if (arriving) return;
    const c = t.camp;
    drag = null;
    // objects
    const k = this.objAt(x, y);
    if (k) { this.objMenu(k); return; }
    // critters
    for (const cr of critters) if (dist(x, y, cr.x, cr.y - 20) < 50) { this.observe(cr); return; }
    // litter
    for (let i = 0; i < c.litter.length; i++) {
      const l = c.litter[i];
      if (dist(x, y, l.x, l.y - 10) < 44) { this.walkTo(l.x + 30, l.y + 10, () => this.pickLitter(l)); return; }
    }
    // dirty dishes
    if (c.dirty && dist(x, y, dirtyPos.x, dirtyPos.y) < 50) { this.dishes(); return; }
    // tent spots / tent
    if (c.tentSpot < 0) {
      for (let i = 0; i < c.spots.length; i++) {
        const s = c.spots[i];
        if (Math.abs(x - s.x) < 120 && Math.abs(y - (s.y - 20)) < 80) { this.walkTo(s.x + 100, s.y + 40, () => this.confirmSpot(i)); return; }
      }
    } else {
      const s = c.spots[c.tentSpot];
      if (x > s.x - 120 && x < s.x + 110 && y > s.y - 170 && y < s.y + 20) { this.walkTo(s.x + 110, s.y + 30, () => this.tentMenu()); return; }
    }
    // fire
    if (dist(x, y, FIRE.x, FIRE.y - 20) < 80) { this.walkTo(FIRE.x + 90, FIRE.y + 60, () => go('fire')); return; }
    // water source
    const ws = waterSource();
    if (dist(x, y, ws.x, ws.y - 20) < 90 || (b.lake && inLake(x, y)) || (ws.kind === 'river' && Math.abs(x - 1300) < 70)) { this.walkTo(ws.x, ws.y + 20, () => this.waterPanel()); return; }
    // chair
    if (has('camp_chair') && dist(x, y, CHAIR.x, CHAIR.y - 30) < 50) { this.walkTo(CHAIR.x + 10, CHAIR.y + 5, () => this.rest('chair')); return; }
    // clothesline
    if (c.built.line && dist(x, y, LINE.x, LINE.y - 50) < 90) { this.dryBag(); return; }
    // walk
    this.walkTo(x, y);
  },

  // ---------- actions ----------
  confirmSpot(i) {
    const s = t.camp.spots[i];
    const hl = hintLevel(d.expert);
    const items = [{ icon: '✅', label: 'Here', onClick: () => go('tentgame', { spot: i }) }, { icon: '❌', label: '', onClick: () => { } }];
    bubble(s.x, s.y - 60, items);
    if (hl >= 2) {
      const ic = { hollow: '💧⬇️', slope: '↘️', shore: '🦟🌊', snag: '🌳💥', rocky: '🪨', exposed: '💨', ideal: '👍' }[s.type];
      toast(`👀 ${ic}`);
    }
  },
  tentMenu() {
    const c = t.camp, s = c.spots[c.tentSpot], q = c.tent, items = [];
    if (has('sleeping_bag') && !c.bagIn) items.push({ icon: '🛌', label: c.bagWet ? '💧' : 'Bag in', disabled: c.bagWet, onClick: () => { c.bagIn = true; audio.sfx('zip'); toast('🛌⛺ ✅'); addXP('camping', 3); this.hud(); } });
    if (!c.gearIn) items.push({ icon: '🎒', label: 'Store', onClick: () => { c.gearIn = true; c.objs.gear.where = 'tent'; audio.sfx('zip'); toast('🎒⛺ ✅'); } });
    const canFix = (!q.staked) || (!q.fly && has('rain_fly')) || !q.guy || (!q.tarp && has('ground_tarp'));
    if (canFix) items.push({ icon: '🔨', label: 'Fix', onClick: () => go('tentgame', { spot: c.tentSpot, fix: true }) });
    if (c.bagWet && !c.drying && phase(t.hour) === 'day') items.push({ icon: '☀️', label: 'Dry bag', onClick: () => this.dryBag() });
    items.push({ icon: '😴', label: t.hour >= 19 ? 'Sleep' : 'Rest', onClick: () => t.hour >= 19 ? this.sleep() : this.rest('tent') });
    items.push({ icon: '↔️', label: 'Move', onClick: () => this.moveTent() });
    bubble(s.x - 20, s.y - 150, items);
  },
  moveTent() {
    const c = t.camp;
    c.tentSpot = -1; c.tent = { stage: 0, tarp: false, staked: false, fly: false, guy: false, cleared: false };
    c.bagIn = false; if (c.gearIn) { c.gearIn = false; c.objs.gear.where = 'ground'; }
    this.spend(0.5); audio.sfx('swoosh');
    this.refreshBanner();
  },
  dryBag() {
    const c = t.camp;
    if (!c.bagWet) { toast('🛌✅'); return; }
    if (wx().rain) { toast('🌧️❌☀️'); return; }
    c.drying = true; c.bagIn = false; audio.sfx('swoosh');
    toast('🛌☀️ Drying…');
    lesson('☀️', 'Sun and wind dry wet gear.');
  },
  rest(where) {
    const m = t.m;
    if (where === 'chair') {
      toast('🪑😌'); this.spend(1, 'rest'); m.energy = Math.min(100, m.energy + 15); m.morale = Math.min(100, m.morale + 8);
      if (has('book') && !t.flags.readToday) { t.flags.readToday = t.day; toast('📘😊'); m.morale = Math.min(100, m.morale + 8); }
    } else {
      if (m.energy > 70) { toast('😃⚡ Not sleepy'); return; }
      toast('😴💤'); this.spend(1.5, 'rest'); m.energy = Math.min(100, m.energy + 25);
    }
    audio.sfx('ok'); this.hud();
  },
  sleep(forced) {
    const c = t.camp;
    if (c.tentSpot < 0 || c.tent.stage < 2) {
      if (forced) { this.pickTentForced(); return; }
      toast('⛺❗ Set up your tent first'); return;
    }
    closeBubble(); closeModal();
    go('night');
  },
  pickTentForced() {
    // Too late - a ranger helps set up the best spot quickly
    const c = t.camp; const i = c.spots.findIndex(s => s.type === 'ideal');
    c.tentSpot = i; c.tent = { stage: 2, tarp: false, staked: true, fly: false, guy: false, cleared: false };
    toast('🧑‍🚒⛺ A ranger helped!');
    go('night');
  },
  objMenu(k) {
    const c = t.camp, o = c.objs[k];
    if (k === 'cooler') {
      bubble(o.x, o.y - 60, [
        { icon: '🍫', label: `${t.snacks}`, disabled: t.snacks <= 0, onClick: () => this.snack() },
        { icon: '🍳', label: 'Cook', onClick: () => this.cook() },
        { icon: '✋', label: 'Move', onClick: () => toast('✋ Drag to move') },
      ]);
    } else if (k === 'wood') {
      const items = [{ icon: '🪵', label: `${woodTotal()}`, onClick: () => this.woodInfo() }];
      if (has('hatchet')) items.push({ icon: '🪓', label: 'Split', onClick: () => this.split() });
      items.push({ icon: '🔥', label: 'Fire', onClick: () => go('fire') });
      bubble(o.x, o.y - 60, items);
    } else if (k === 'gear') {
      bubble(o.x, o.y - 60, [{ icon: '🎒', label: 'Open', onClick: () => this.gearPanel() }, { icon: '⛺', label: 'Store', disabled: c.tentSpot < 0, onClick: () => { c.gearIn = true; o.where = 'tent'; audio.sfx('zip'); toast('🎒⛺ ✅'); } }]);
    } else if (k === 'trash') {
      bubble(o.x, o.y - 60, [{ icon: '🗑️', label: `${c.trashBag || 0}`, onClick: () => toast('♻️ Pack it out!') }, { icon: '✋', label: 'Move', onClick: () => toast('✋ Drag to move') }]);
    }
  },
  woodInfo() {
    const w = t.wood, row = k => `<span class="pill">${{ tinder: '🌾', kindling: '🥢', small: '🪵', log: '🪵🪵' }[k]} ${w[k].dry}${w[k].wet ? ` <span style="color:#3d8ee6">💧${w[k].wet}</span>` : ''}</span>`;
    modal({ title: '🪵 Wood pile', body: `<div class="row c">${row('tinder')}${row('kindling')}${row('small')}${row('log')}</div><div class="tip">🗺️ Explore to gather more</div>` });
  },
  split() {
    const w = t.wood, src = w.log.dry ? 'dry' : w.log.wet ? 'wet' : null;
    if (!src) { toast('🪵❌'); return; }
    w.log[src]--; w.kindling[src] += 3; w.tinder[src] += 1;
    audio.sfx('snap'); burst(t.camp.objs.wood.x, t.camp.objs.wood.y - 20, 8, { color: '#c89a60', size: 3, g: 400, life: 0.8, up: 100 });
    this.spend(0.25, 'work');
    toast('🪓 🪵➡️🥢🥢🥢');
    addXP('firecraft', 2);
    if (chance(0.12)) setTimeout(() => this.firstAid('cut'), 600);
  },
  snack() {
    if (t.snacks <= 0) return;
    t.snacks--; eat(12, 4); t.m.energy = Math.min(100, t.m.energy + 8);
    audio.sfx('eat'); toast('🍫😋'); this.hud();
    if (!t.camp.trashBag) t.camp.trashBag = 0;
    t.camp.trashBag++;
  },
  pickLitter(l) {
    const c = t.camp, i = c.litter.indexOf(l); if (i < 0) return;
    c.litter.splice(i, 1); c.trashBag = (c.trashBag || 0) + 1;
    natureGood(); audio.sfx('pop');
    burst(l.x, l.y - 10, 10, { color: ['#7bed9f', '#ffffff', '#ffd23f'], size: 3, life: 0.7 });
    emit({ kind: 'emoji', e: '🌲', x: l.x, y: l.y - 30, vy: -60, life: 1, size: 24 });
    if (!c.litter.length) { toast('🗑️✨ Camp is clean!'); audio.sfx('success'); addXP('nature', 5); }
  },
  dishes() {
    const ws = waterSource(), c = t.camp;
    const items = [{ icon: '🪣', label: 'Wash here', onClick: () => { c.dirty = 0; audio.sfx('splash'); toast('🍽️✨'); natureGood(); this.spend(0.25); } }];
    if (ws.kind !== 'faucet') items.push({ icon: '🏞️', label: 'In water', onClick: () => { c.dirty = 0; audio.sfx('splash'); natureBad(1, 'pollute'); toast('🐟😵'); lesson('🧼🏞️', LESSONS.pollute); this.spend(0.25); } });
    bubble(dirtyPos.x, dirtyPos.y - 30, items);
  },
  observe(cr) {
    const a = WILDLIFE[cr.kind];
    if (discover('wildlife', cr.kind)) addXP('nature', 6);
    if (cr.kind === 'raccoon' && t.camp.objs.cooler.where === 'ground') { toast('🦝👀🍗'); audio.sfx('chitter'); }
    else toast(`<span class="big">${a.e}</span> ${a.n}`);
    audio.sfx('pop');
  },
  firstAid(kind) { SC.firstaid.open(kind, () => this.hud()); },
  explore() {
    if (darkness(t.hour) > 0.5 && !lightSource()) { toast('🌑❌ Too dark'); lesson('🔦', LESSONS.dark); return; }
    if (t.hour >= 21) { toast('🌙 Too late to hike'); return; }
    this.walkTo(G.view.x1 - 60, 700, () => go('explore'));
  },
  cook() {
    const f = t.camp.fire;
    if (!f.lit && f.hot < 30) { toast('🔥❓ Build a fire first'); audio.sfx('bad'); hudEl.fire.classList.add('pulse'); return; }
    if (mealCount() + t.marsh <= 0) { toast('🍗❌ No food'); lesson('🎣', d.fish ? 'Catch fish to cook!' : 'Pack food next time.'); return; }
    this.walkTo(FIRE.x + 90, FIRE.y + 60, () => go('cook'));
  },
  fish() {
    if (!has('fishing_rod')) { toast('🎣❌ No rod packed'); return; }
    if (t.hour >= 22) { toast('🌙 Too late'); return; }
    const ws = waterSource();
    this.walkTo(ws.x, ws.y + 30, () => go('fish', { from: 'camp', kind: ws.kind }));
  },

  // ---------- panels ----------
  goalsPanel() {
    let h = '';
    for (const g of d.goals) { const G2 = GOALS[g]; const ok = goalDone(g); h += `<div class="setting"><span class="big">${G2.e}</span><label style="flex:1">${G2.n}</label><span class="big">${ok ? '✅' : '⬜'}</span></div>`; }
    modal({ title: `🎯 ${d.e} ${d.n}`, body: h });
  },
  pauseMenu() {
    modal({
      title: '⏸️ Paused', body: `<div class="bigicon">${d.e}</div>`, buttons: [
        { label: '▶ Keep playing', cls: 'go' },
        { label: '⚙️ Settings', onClick: () => SC.settings.open() },
        { label: '🏠 Save & Home', onClick: () => go('home') },
        { label: '🏳️ End trip', cls: 'warn', onClick: () => modal({ title: '🏳️ End trip?', body: '<div class="tip">Go home now?</div>', buttons: [{ label: '✅ Yes', cls: 'warn', onClick: () => go('results', { early: true }) }, { label: '❌ No' }] }) },
      ],
    });
  },
  gearPanel() {
    const box = el('div', '');
    // clothes
    const need = warmthNeed(), have = warmthHave(t, t.camp.fire.lit);
    el('div', 'sectitle', `👕 Clothes <span class="pill">${need > have + 1 ? '🥶' : have > need + 3.5 ? '🥵' : '😊'} ${'🟥'.repeat(Math.max(0, Math.round(need - have)))}</span>`, box);
    const cr = el('div', 'row', '', box);
    const wearables = Object.keys(t.pack).filter(k => ITEMS[k].wear);
    if (!wearables.length) el('span', 'tip', '👕 T-shirt only', cr);
    for (const k of wearables) {
      const on = !!t.wear[k];
      btn(`<span class="big">${ITEMS[k].e}</span>${on ? '✅' : ''}`, () => { t.wear[k] = !on; audio.sfx('zip'); this.hud(); addXP('weather', 1); this.gearPanel(); }, on ? 'sel' : '', cr);
    }
    // food and water
    el('div', 'sectitle', '🍗 Food & 💧 Water', box);
    const fr = el('div', 'row', '', box);
    btn(`<span class="big">🍫</span>×${t.snacks}`, () => { this.snack(); this.gearPanel(); }, t.snacks ? '' : 'dim', fr);
    btn(`<span class="big">🥤</span>×${t.water.filter(u => u !== 'treating').length}`, () => { this.drinkUI(); this.gearPanel(); }, t.water.length ? '' : 'dim', fr);
    const ml = Object.entries(t.meals).filter(([, n]) => n > 0).map(([k, n]) => `${FOODS[k].e}×${n}`).join(' ') + (t.fish.length ? ` 🐟×${t.fish.length}` : '') + (t.marsh ? ` 🍡×${t.marsh}` : '');
    el('span', 'pill', ml || '🍗❌', fr);
    if (t.ail.cut === 'ignored' || t.ail.tummy > 0) { el('div', 'sectitle', '🩹 Health', box); const hr = el('div', 'row', '', box); if (t.ail.cut === 'ignored') btn('🩹 Treat cut', () => { closeModal(); this.firstAid('cut'); }, '', hr); if (t.ail.tummy > 0) btn('😴 Rest', () => { closeModal(); this.rest('tent'); }, '', hr); }
    // items
    el('div', 'sectitle', '🎒 Packed', box);
    const ir = el('div', 'row', '', box);
    for (const [k, q] of Object.entries(t.pack)) { const it = ITEMS[k]; const p = el('span', 'pill', `${it.e}${q > 1 ? '×' + q : ''}`, ir); p.addEventListener('click', () => toast(`${it.e} ${it.tip}`)); }
    if (has('book')) btn('📘 Read', () => { closeModal(); if (has('camp_chair')) this.walkTo(CHAIR.x + 10, CHAIR.y + 5, () => this.rest('chair')); else { this.spend(0.5); t.m.morale = Math.min(100, t.m.morale + 8); toast('📘😊'); } }, '', box);
    modal({ title: '🎒 Gear', body: box, cls: '' });
  },
  drinkUI() {
    const k = drink();
    if (!k) { toast('🥤❌ Empty'); audio.sfx('bad'); return; }
    audio.sfx('drink'); camper.drinkT = 1.2;
    toast(k === 'raw' && S.lessons.germs ? '💧🦠' : '💧😊');
    if (k === 'safe') addXP('camping', 1);
    this.hud();
  },
  waterPanel() {
    const ws = waterSource(), cap = waterCap(), box = el('div', '');
    const known = !!S.lessons.germs;
    let row = '<div class="water-row">';
    for (let i = 0; i < Math.max(cap, 1); i++) {
      const u = t.water[i];
      row += `<span class="${!u ? 'empty' : u === 'raw' ? 'raw' + (known ? ' germ' : '') : u === 'treating' ? 'treating' : ''}">💧</span>`;
    }
    row += '</div>';
    el('div', '', row + (cap ? '' : '<div class="tip">🥤❌ No bottles packed</div>'), box);
    if (t.treat) el('div', 'tip', `💊⏳ ${Math.max(0, Math.ceil((t.treat.until - t.hour) * 60))} min`, box);
    const r = el('div', 'row c', '', box);
    const nearSrc = dist(camper.x, camper.y, ws.x, ws.y) < 160;
    const srcIcon = ws.kind === 'faucet' ? '🚰' : ws.kind === 'lake' ? '🏞️' : '💦';
    btn(`<span class="big">${srcIcon}</span> Fill`, () => {
      if (!cap) { toast('🥤❌'); return; }
      if (!nearSrc) { closeModal(); this.walkTo(ws.x, ws.y + 20, () => this.waterPanel()); return; }
      const n = cap - t.water.length; if (n <= 0) { toast('🥤✅ Full'); return; }
      for (let i = 0; i < n; i++) t.water.push(ws.kind === 'faucet' ? 'safe' : 'raw');
      audio.sfx('splash'); this.spend(0.25);
      toast(`${srcIcon}➡️🥤`);
      if (ws.kind === 'faucet') { count('waterSafe'); }
      this.waterPanel();
    }, '', r);
    btn('<span class="big">🥤</span> Drink', () => { this.drinkUI(); this.waterPanel(); }, t.water.length ? '' : 'dim', r);
    const raw = t.water.filter(u => u === 'raw').length;
    if (raw) {
      el('div', 'sectitle', '✨ Make water safe', box);
      const tr = el('div', 'row c', '', box);
      btn('<span class="big">🚰</span> Filter', () => {
        if (!has('water_filter')) { toast('🚰❌ No filter'); audio.sfx('bad'); return; }
        t.water = t.water.map(u => u === 'raw' ? 'safe' : u); audio.sfx('boil'); this.spend(0.25);
        count('waterSafe'); addXP('camping', 3); t.flags.treat_water = true; toast('💧➡️🚰➡️✨'); perf(true); this.waterPanel();
      }, has('water_filter') ? '' : 'dim', tr);
      btn(`<span class="big">💊</span> Tablets ×${t.tablets}`, () => {
        if (t.tablets <= 0) { toast('💊❌'); audio.sfx('bad'); return; }
        t.tablets--; t.water = t.water.map(u => u === 'raw' ? 'treating' : u); t.treat = { until: t.hour + 0.5 };
        audio.sfx('plop'); toast('💊⏳ Wait 30 min'); perf(true); this.waterPanel();
      }, t.tablets ? '' : 'dim', tr);
      btn('<span class="big">🔥</span> Boil', () => {
        if (!has('cook_kit')) { toast('🍳❌ Need a pot'); audio.sfx('bad'); return; }
        if (!t.camp.fire.lit) { toast('🔥❓ Need a fire'); audio.sfx('bad'); return; }
        closeModal(); this.walkTo(FIRE.x + 90, FIRE.y + 60, () => go('cook', { boil: true }));
      }, has('cook_kit') && t.camp.fire.lit ? '' : 'dim', tr);
    }
    modal({ title: '💧 Water', body: box });
  },
  buildPanel() {
    const c = t.camp, box = el('div', 'grid');
    const opts = [
      ['shelter', '⛺', 'Tarp Shelter', ['rope'], () => go('build', { kind: 'shelter' })],
      ['rack', '🪵', 'Wood Rack', ['rope'], () => go('build', { kind: 'rack' })],
      ['tripod', '🔺', 'Cook Tripod', ['rope', 'cook_kit'], () => go('build', { kind: 'tripod' })],
      ['hang', '🪢', 'Food Hang', ['rope'], () => go('build', { kind: 'hang' })],
      ['line', '👕', 'Clothesline', ['rope'], () => { c.built.line = true; audio.sfx('success'); toast('👕🪢 ✅'); count('builds'); addXP('engineering', 4); closeModal(); }],
    ];
    if (b.bearbox) opts.splice(3, 1);
    for (const [id, e, n, req, fn] of opts) {
      const done = !!c.built[id], okReq = req.every(r => has(r));
      const cd = el('div', 'card' + (done ? ' have' : '') + (okReq ? '' : ' locked'), `<div class="ce">${e}</div><div class="cn">${n}</div><div class="cn">${req.map(r => ITEMS[r].e).join('')}</div>`, box);
      cd.addEventListener('click', () => {
        audio.sfx('tap');
        if (done) { toast(`${e} ✅`); return; }
        if (!okReq) { toast(`${req.filter(r => !has(r)).map(r => ITEMS[r].e).join('')}❌`); audio.sfx('bad'); return; }
        closeModal(); fn();
      });
    }
    modal({ title: '🛠️ Build', body: box, cls: 'wide' });
  },
  morning() {
    const c = t.camp, f = t.forecast[t.day - 1], probs = [];
    if (c.bagWet) probs.push('🛌💧 → ☀️');
    if (t.meals && mealCount() === 0 && t.snacks === 0) probs.push(d.fish ? '🍗❌ → 🎣' : '🍗❌');
    if (t.water.length === 0) probs.push('💧❌ → 🚰');
    const body = `<div class="bigicon">🌅</div><div class="tip">Day ${t.day}</div>${forecastHTML([f])}${probs.length ? `<div class="tip">${probs.join('<br>')}</div>` : ''}`;
    modal({ title: '☀️ Good morning!', body, buttons: [{ label: '▶ Go!', cls: 'go' }] });
    speak('Good morning');
  },

  // ---------- draw ----------
  draw(c) {
    if (!t) return;
    const h = t.hour, wk = wxKey(), w = wx(), cp = t.camp;
    gx.drawSky(c, env, h, wk);
    gx.drawClouds(c, env, wk, G.dt);
    gx.drawRanges(c, env, h, wk);
    if (!G.reduce && h > 7 && h < 19 && !w.rain) gx.drawBirds(c, G.t, 2);
    gx.drawGround(c, env, h);
    if (b.house) { gx.drawHouse(c, 300, 420); gx.drawFence(c, 450, G.view.x0, 150); gx.drawFence(c, 450, 460, G.view.x1); }
    gx.drawClearing(c, 770, 660, 520, 190);
    if (b.lake) { gx.drawLake(c, b.lake, h, wk); gx.drawLilies(c, b.lake); if (b.dock) gx.drawDock(c, 1250, 520); }
    if (b.river) gx.drawRiver(c, gx.RIVER, 100, h, wk, w.rain ? 20 : 0);
    if (d.water === 'stream') gx.drawRiver(c, STREAM, 42, h, wk, w.rain ? 10 : 0);
    // sites
    cp.spots.forEach((s, i) => drawSite(c, s, i === cp.tentSpot, cp.tentSpot < 0));
    gx.drawTufts(c, env, w.wind, (x, y) => Math.hypot((x - 770) / 470, (y - 660) / 160) < 1 || (b.lake && inLake(x, y)) || (b.river && Math.abs(x - 1300) < 90 && y > 330));
    for (const r of env.rocks) if (!(b.lake && inLake(r.x, r.y)) && Math.hypot((r.x - 770) / 470, (r.y - 660) / 160) > 1) gx.drawRock(c, r.x, r.y, r.s);
    // background trees
    const wind = w.wind;
    for (const tr of env.trees) if (tr.y < 470) this.drawTreeX(c, tr, wind);
    // y-sorted drawables
    const list = [];
    for (const tr of env.trees) if (tr.y >= 470) list.push([tr.y, () => this.drawTreeX(c, tr, wind)]);
    const tentS = cp.tentSpot >= 0 ? cp.spots[cp.tentSpot] : null;
    if (tentS) list.push([tentS.y, () => gx.drawTent(c, tentS.x, tentS.y, { stage: cp.tent.stage, tarp: cp.tent.tarp, staked: cp.tent.staked, fly: cp.tent.fly, guy: cp.tent.guy, color: cosmetic('tent').c, flag: cosmetic('flag'), wind: wind + (SITES[tentS.type].wind ? 1 : 0) + (this.windBoost || 0), wet: w.rain > 0 && !cp.tent.fly, glow: darkness(h) > 0.3 && lightSource() && cp.bagIn })]);
    list.push([FIRE.y, () => { gx.drawFireRing(c, FIRE.x, FIRE.y); const fl = fireLevel(cp.fire); if (cp.fire.lit || cp.fire.fuel.log + cp.fire.fuel.small > 0) gx.drawLogs(c, FIRE.x, FIRE.y, 1, 3, cp.fire.everLit ? 0.4 : 0); gx.drawFlames(c, FIRE.x, FIRE.y - 4, fl); if (cp.built.tripod) drawTripod(c, FIRE.x, FIRE.y); }]);
    if (b.faucet) list.push([SPOTS.faucet.y, () => gx.drawFaucet(c, SPOTS.faucet.x, SPOTS.faucet.y, 1, dist(camper.x, camper.y, SPOTS.faucet.x, SPOTS.faucet.y) < 80 && modalOpen())]);
    if (b.bearbox) list.push([SPOTS.bearbox.y, () => gx.drawBearBox(c, SPOTS.bearbox.x, SPOTS.bearbox.y)]);
    if (b.trashcan) list.push([SPOTS.trashcan.y, () => gx.drawTrashCan(c, SPOTS.trashcan.x, SPOTS.trashcan.y)]);
    if (b.table) list.push([SPOTS.table.y, () => { gx.drawTable(c, SPOTS.table.x, SPOTS.table.y); if (has('lantern')) emo(c, '🏮', SPOTS.table.x - 30, SPOTS.table.y - 80, 30); }]);
    if (!b.table && has('lantern')) list.push([700, () => emo(c, '🏮', 700, 690, 30)]);
    if (has('camp_chair')) list.push([CHAIR.y, () => emo(c, '🪑', CHAIR.x, CHAIR.y - 26, 52)]);
    if (cp.built.rack) list.push([RACK.y - 1, () => drawRack(c, RACK.x, RACK.y)]);
    if (cp.built.shelter) list.push([SHELTER.y - 1, () => drawShelter(c, SHELTER.x, SHELTER.y, w.rain)]);
    if (cp.built.line) list.push([LINE.y, () => drawLine(c, LINE.x, LINE.y, cp.drying)]);
    // objects
    const o = cp.objs;
    if (visibleObj('cooler')) list.push([o.cooler.y, () => gx.drawCooler(c, o.cooler.x, o.cooler.y)]);
    if (visibleObj('trash')) list.push([o.trash.y, () => gx.drawBag(c, o.trash.x, o.trash.y, 0.9, '#2f4a2f')]);
    if (visibleObj('wood')) list.push([o.wood.y, () => gx.drawWoodpile(c, o.wood.x, o.wood.y, 1, Math.ceil(woodTotal() / 3), t.wood.log.wet + t.wood.small.wet > t.wood.log.dry + t.wood.small.dry)]);
    if (visibleObj('gear')) list.push([o.gear.y, () => gx.drawBag(c, o.gear.x, o.gear.y, 1, cosmetic('pack').c)]);
    if (o.cooler.where === 'box') list.push([SPOTS.bearbox.y + 1, () => emo(c, '🔒', SPOTS.bearbox.x - 20, SPOTS.bearbox.y - 70, 22)]);
    if (cp.dirty) list.push([dirtyPos.y, () => { emo(c, '🍽️', dirtyPos.x, dirtyPos.y - 16, 30); if (!G.reduce) emo(c, '🪰', dirtyPos.x + 14 + Math.sin(G.t * 9) * 8, dirtyPos.y - 40 + Math.cos(G.t * 7) * 6, 12); }]);
    for (const l of cp.litter) list.push([l.y, () => emo(c, l.e, l.x, l.y - 10, 26, { rot: 0.4 })]);
    for (const cr of critters) list.push([cr.y, () => { c.fillStyle = 'rgba(0,0,0,0.2)'; c.beginPath(); c.ellipse(cr.x, cr.y + 2, 18, 5, 0, 0, 7); c.fill(); emo(c, cr.e, cr.x, cr.y - 20 - Math.abs(Math.sin(cr.t * 8)) * 4, 42, { flip: cr.face < 0 }); }]);
    // camper
    if (!(camper.hide)) list.push([camper.y, () => gx.drawCamper(c, camper.x, camper.y, { look: S.look, wear: t.wear, pose: this.pose(), face: camper.face, wet: t.wet > 50 })]);
    list.sort((a, b2) => a[0] - b2[0]);
    for (const [, fn] of list) fn();
    drawParticles(c);
    if (this.extra) this.extra(c);
    // drag indicator
    if (drag && pointer.drag) { const ob = cp.objs[drag.k]; c.strokeStyle = '#ffc93c'; c.lineWidth = 4; c.setLineDash([10, 8]); c.beginPath(); c.ellipse(ob.x, ob.y, 60, 20, 0, 0, 7); c.stroke(); c.setLineDash([]); this.drawDropHints(c, drag.k); }
    // weather + light
    if (w.rain) gx.drawRain(c, w.rain, w.wind, G.t);
    if (w.rain) gx.tintOverlay(c, '#3b4a5c', 0.12 * w.rain);
    gx.goldenHour(c, h);
    const dk = darkness(h) * (w.rain ? 1.1 : 1) + (lightSource() ? 0 : 0.1);
    if (dk > 0.01) {
      const L = [];
      const fl = fireLevel(cp.fire);
      if (fl > 0) L.push({ x: FIRE.x, y: FIRE.y - 30, r: 260 + fl * 280, col: 'rgba(255,150,60,0.9)' });
      else if (fl < 0) L.push({ x: FIRE.x, y: FIRE.y, r: 90, col: 'rgba(255,90,30,0.7)', k: 0.5 });
      if (has('lantern')) L.push({ x: b.table ? SPOTS.table.x - 30 : 700, y: b.table ? SPOTS.table.y - 70 : 680, r: 300, col: 'rgba(255,200,110,0.7)', k: 0.85 });
      if (has('flashlight')) L.push({ x: camper.x + camper.face * 60, y: camper.y - 30, r: 190, col: 'rgba(255,255,220,0.35)', k: 0.8 });
      if (tentS && cp.bagIn && lightSource()) L.push({ x: tentS.x - 30, y: tentS.y - 50, r: 140, col: 'rgba(255,210,120,0.6)', k: 0.6 });
      gx.lighting(c, Math.min(0.85, dk), L);
      gx.drawNightSky(c, env, h, wk);
      if (!w.rain && h > 20.5) gx.drawFireflies(c, G.reduce ? 4 : 10, G.t);
      if (fl > 0) gx.drawFlames(c, FIRE.x, FIRE.y - 4, fl);
    } else if (!w.rain && h > 9 && h < 17 && !G.reduce) gx.drawButterflies(c, G.t, 2);
    if (flash > 0) gx.tintOverlay(c, '#ffffff', flash * 0.6);
    // hint rings
    if (cp.tentSpot < 0 && !arriving) cp.spots.forEach(s => { c.strokeStyle = `rgba(255,201,60,${0.5 + 0.4 * Math.sin(G.t * 4)})`; c.lineWidth = 5; c.setLineDash([12, 10]); c.beginPath(); c.ellipse(s.x - 20, s.y - 15, 110, 45, 0, 0, 7); c.stroke(); c.setLineDash([]); });
    if (cp.fire.hot > 5 && !cp.fire.lit && hintLevel(d.expert) >= 1) emo(c, '⚠️', FIRE.x + 50, FIRE.y - 40, 24);
    if (camper.drinkT > 0) { camper.drinkT -= G.dt; emo(c, '🥤', camper.x + 22 * camper.face, camper.y - 112, 22); }
  },
  pose() {
    if (camper.walking) return 'walk';
    if (camper.drinkT > 0) return 'drink';
    const m = t.m, cs = comfortState();
    if (cs === 'cold' && m.temp < 65) return 'shiver';
    if (cs === 'hot') return 'wipe';
    if (m.hunger < 25 || t.ail.tummy > 0) return 'stomach';
    if (m.energy < 20) return 'yawn';
    if (m.morale > 85 && Math.sin(G.t * 0.5) > 0.97) return 'cheer';
    return 'idle';
  },
  drawTreeX(c, tr, wind) {
    gx.drawTree(c, tr, wind, b.snow);
    if (tr.hang && t.camp.built.hang) {
      c.strokeStyle = '#d9c9a3'; c.lineWidth = 2; c.beginPath(); c.moveTo(tr.x + 60, tr.y - 150); c.lineTo(tr.x + 60, tr.y - 70); c.stroke();
      if (t.camp.objs.cooler.where === 'hang') { gx.drawBag(c, tr.x + 60, tr.y - 30, 0.8, '#b5651d'); }
      if (t.camp.objs.trash.where === 'hang') gx.drawBag(c, tr.x + 30, tr.y - 40, 0.7, '#2f4a2f');
    }
  },
  drawDropHints(c, k) {
    const cp = t.camp, ring = (x, y, r = 70) => { c.strokeStyle = `rgba(90,220,120,${0.6 + 0.3 * Math.sin(G.t * 6)})`; c.lineWidth = 5; c.beginPath(); c.ellipse(x, y, r, r * 0.4, 0, 0, 7); c.stroke(); };
    if (k === 'cooler') { if (b.bearbox) ring(SPOTS.bearbox.x, SPOTS.bearbox.y); if (cp.built.hang) ring(SPOTS.hangTree.x + 60, SPOTS.hangTree.y + 20); }
    if (k === 'trash' && b.trashcan) ring(SPOTS.trashcan.x, SPOTS.trashcan.y);
    if (k === 'wood') { if (cp.built.rack) ring(RACK.x, RACK.y); if (cp.built.shelter) ring(SHELTER.x, SHELTER.y + 10, 100); }
    if (k === 'gear' && cp.tentSpot >= 0) { const s = cp.spots[cp.tentSpot]; ring(s.x - 20, s.y - 10, 100); }
  },
};
SC.camp = Camp;

// ---------- drawing helpers ----------
function visibleObj(k) {
  const o = t.camp.objs[k];
  if (k === 'cooler') return o.where === 'ground';
  if (k === 'trash') return o.where === 'ground' || o.where === 'can';
  if (k === 'gear') return o.where === 'ground';
  return true;
}
export function inLake(x, y) { const L = BIOMES[def().biome].lake; return L && ((x - L.cx) / (L.rx + 10)) ** 2 + ((y - L.cy) / (L.ry + 10)) ** 2 < 1; }
function underShelter(x, y) { return t.camp.built.shelter && Math.abs(x - SHELTER.x) < 110 && Math.abs(y - SHELTER.y) < 70; }

function drawSite(c, s, occupied, showing) {
  const x = s.x - 20, y = s.y - 15;
  switch (s.type) {
    case 'ideal': {
      const g = c.createRadialGradient(x, y, 10, x, y, 120); g.addColorStop(0, 'rgba(190,230,140,0.55)'); g.addColorStop(1, 'rgba(190,230,140,0)');
      c.fillStyle = g; c.beginPath(); c.ellipse(x, y, 125, 55, 0, 0, 7); c.fill();
      c.strokeStyle = 'rgba(120,90,50,0.35)'; c.lineWidth = 3; c.beginPath(); c.ellipse(x, y + 4, 105, 44, 0, 0, 7); c.stroke();
      break;
    }
    case 'hollow': {
      c.fillStyle = 'rgba(95,75,50,0.55)'; c.beginPath(); c.ellipse(x, y + 5, 118, 46, 0, 0, 7); c.fill();
      c.fillStyle = 'rgba(70,55,40,0.5)'; c.beginPath(); c.ellipse(x, y + 8, 80, 28, 0, 0, 7); c.fill();
      c.fillStyle = 'rgba(140,180,210,0.55)'; c.beginPath(); c.ellipse(x - 30, y + 12, 26, 8, 0, 0, 7); c.ellipse(x + 40, y + 2, 18, 6, 0, 0, 7); c.fill();
      if (!occupied) { gx.reed(c, x - 100, y + 10, 40); gx.reed(c, x + 95, y + 18, 34); }
      break;
    }
    case 'slope': {
      c.fillStyle = 'rgba(70,120,50,0.35)'; c.beginPath(); c.moveTo(x - 130, y + 40); c.quadraticCurveTo(x - 40, y - 90, x + 130, y - 50); c.lineTo(x + 130, y + 40); c.closePath(); c.fill();
      c.strokeStyle = 'rgba(60,90,40,0.5)'; c.lineWidth = 3;
      for (let i = 0; i < 4; i++) { c.beginPath(); c.moveTo(x - 90 + i * 50, y + 30); c.lineTo(x - 60 + i * 50, y - 30 - i * 6); c.stroke(); }
      if (!occupied) { emo(c, '🌰', x + 60 + ((G.t * 30) % 60), y + ((G.t * 30) % 60) * 0.4 - 20, 16, { rot: G.t * 4 }); }
      break;
    }
    case 'shore': c.fillStyle = 'rgba(230,210,160,0.7)'; c.beginPath(); c.ellipse(x, y + 5, 120, 45, 0, 0, 7); c.fill(); if (!occupied) { gx.reed(c, x + 90, y - 10, 44); gx.reed(c, x + 100, y, 36); } break;
    case 'rocky':
      c.fillStyle = 'rgba(150,120,80,0.35)'; c.beginPath(); c.ellipse(x, y + 5, 115, 45, 0, 0, 7); c.fill();
      if (!s.cleared) {
        c.strokeStyle = '#6b4a2f'; c.lineWidth = 5; c.lineCap = 'round';
        c.beginPath(); c.moveTo(x - 110, y - 5); c.quadraticCurveTo(x - 40, y + 20, x + 10, y - 2); c.moveTo(x + 20, y + 25); c.quadraticCurveTo(x + 60, y + 5, x + 110, y + 20); c.stroke();
        if (!occupied) { gx.drawRock(c, x - 50, y + 10, 14); gx.drawRock(c, x + 40, y - 12, 11); gx.drawRock(c, x + 5, y + 26, 9); }
      }
      break;
    case 'exposed':
      c.fillStyle = 'rgba(160,160,150,0.4)'; c.beginPath(); c.ellipse(x, y + 5, 120, 45, 0, 0, 7); c.fill();
      if (!G.reduce) { c.strokeStyle = 'rgba(255,255,255,0.6)'; c.lineWidth = 2; for (let i = 0; i < 3; i++) { const px = x - 150 + ((G.t * 200 + i * 110) % 300); c.beginPath(); c.moveTo(px, y - 60 + i * 25); c.quadraticCurveTo(px + 30, y - 66 + i * 25, px + 60, y - 60 + i * 25); c.stroke(); } }
      break;
    case 'snag': {
      c.fillStyle = 'rgba(150,130,100,0.3)'; c.beginPath(); c.ellipse(x, y + 5, 115, 45, 0, 0, 7); c.fill();
      break;
    }
  }
}
function drawRack(c, x, y) {
  c.strokeStyle = '#6d4c33'; c.lineWidth = 7; c.lineCap = 'round';
  c.beginPath(); c.moveTo(x - 60, y); c.lineTo(x - 60, y - 34); c.moveTo(x + 60, y); c.lineTo(x + 60, y - 34);
  c.moveTo(x - 70, y - 30); c.lineTo(x + 70, y - 30); c.moveTo(x - 70, y - 12); c.lineTo(x + 70, y - 12); c.stroke();
}
function drawShelter(c, x, y, rain) {
  c.strokeStyle = '#6d4c33'; c.lineWidth = 6;
  c.beginPath(); c.moveTo(x - 110, y); c.lineTo(x - 100, y - 110); c.moveTo(x + 110, y); c.lineTo(x + 100, y - 110); c.stroke();
  c.fillStyle = '#2f7fc1'; c.beginPath(); c.moveTo(x - 130, y - 30); c.lineTo(x, y - 118); c.lineTo(x + 130, y - 30); c.lineTo(x + 120, y - 20); c.lineTo(x, y - 100); c.lineTo(x - 120, y - 20); c.closePath(); c.fill();
  c.fillStyle = '#3b95dc'; c.beginPath(); c.moveTo(x - 130, y - 30); c.lineTo(x, y - 118); c.lineTo(x, y - 100); c.lineTo(x - 120, y - 20); c.closePath(); c.fill();
  if (rain && !G.reduce) for (let i = 0; i < 3; i++) { const k = (G.t * 1.5 + i / 3) % 1; c.fillStyle = 'rgba(160,200,255,0.8)'; c.beginPath(); c.arc(x - 130 - k * 6, y - 30 + k * 30, 3, 0, 7); c.arc(x + 130 + k * 6, y - 30 + k * 30, 3, 0, 7); c.fill(); }
}
function drawLine(c, x, y, drying) {
  c.strokeStyle = '#6d4c33'; c.lineWidth = 6; c.beginPath(); c.moveTo(x - 90, y); c.lineTo(x - 90, y - 100); c.moveTo(x + 90, y); c.lineTo(x + 90, y - 100); c.stroke();
  c.strokeStyle = '#e6d8b8'; c.lineWidth = 2; c.beginPath(); c.moveTo(x - 90, y - 95); c.quadraticCurveTo(x, y - 80, x + 90, y - 95); c.stroke();
  if (drying) { c.fillStyle = '#5b7fbf'; rr(c, x - 50, y - 90, 100, 50, 8); c.fill(); if (!G.reduce && Math.random() < 0.1) emit({ x: x + rand(-40, 40), y: y - 40, vy: -30, life: 1, size: 5, grow: 6, color: 'rgba(255,255,255,0.4)' }); }
}
function drawTripod(c, x, y) {
  c.strokeStyle = '#6d4c33'; c.lineWidth = 5;
  c.beginPath(); c.moveTo(x - 60, y + 10); c.lineTo(x, y - 150); c.lineTo(x + 60, y + 10); c.moveTo(x, y - 150); c.lineTo(x + 10, y - 20); c.stroke();
  c.strokeStyle = '#999'; c.lineWidth = 2; c.beginPath(); c.moveTo(x, y - 150); c.lineTo(x, y - 90); c.stroke();
  c.fillStyle = '#3d3d3d'; rr(c, x - 22, y - 92, 44, 30, 8); c.fill();
}
