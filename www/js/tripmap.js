// Trip selection map, forecast, outdoor store, packing and travel.
import { G, W, H, emo, rng, drawParticles, clamp, rr, lerp } from './engine.js';
import { audio } from './audio.js';
import { S, save, addXP, hintLevel, cosmetic, perf } from './save.js';
import { TRIPS, ITEMS, WEATHER, PACK_CELLS, PACK_WEIGHT, tripById } from './data.js';
import { genForecast, newTrip, GOALS } from './sim.js';
import * as gx from './gfx.js';
import { el, btn, root, modal, toast, stars, meterBar, draggable, banner, speak } from './ui.js';
import { SC, go } from './nav.js';

let plan = null; // { def, forecast, packed }

export function forecastHTML(fc, days = fc.length) {
  let h = '<div class="fc">';
  fc.slice(0, days).forEach((f, i) => {
    h += `<div class="fcday"><b>📅 Day ${i + 1}</b><div class="r">`;
    [['day', 0, '☀️'], ['eve', 1, '🌇'], ['night', 2, '🌙']].forEach(([k, j]) => {
      const w = WEATHER[f[k]];
      h += `<span>${k === 'night' ? w.ne : w.e}<small>${f.temps[j]}°</small></span>`;
    });
    h += '</div></div>';
  });
  return h + '</div>';
}

// ---------------- Trip map ----------------
let mapArt = null, sel = null, card = null;
function nodePos(t) { return { x: t.mapPos[0] * W, y: t.mapPos[1] * H + 40 }; }
const TripMap = {
  enter() {
    sel = null;
    audio.setAmbience({ birds: 0.6, wind: 0.3 });
    audio.setMusic('day');
    const r = rng(42);
    mapArt = { trees: [], mts: [], waves: [] };
    for (let i = 0; i < 140; i++) {
      const x = r() * 2200 - 300, y = 160 + r() * 800;
      if (Math.hypot((x - 760) / 170, (y - 700) / 90) < 1.2) continue;
      if (x > 1130 && y < 380) continue;
      mapArt.trees.push({ x, y, s: 0.5 + r() * 0.5 });
    }
    mapArt.trees.sort((a, b) => a.y - b.y);
    for (let i = 0; i < 9; i++) mapArt.mts.push({ x: 1100 + i * 110 + r() * 40, y: 250 + (i % 3) * 50 + r() * 30, s: 1 + r() * 0.8 });
    mapArt.mts.sort((a, b) => a.y - b.y);
    const u = root();
    btn('⬅', () => go('home'), 'round back-btn', u);
    el('div', 'moneyp pill', `💰 $${S.money}`, u);
    banner('🗺️ Pick a trip!', 'Pick a trip');
    const next = TRIPS.find(t => S.unlocked.includes(t.id) && !S.completed[t.id]);
    if (next) this.select(next);
  },
  select(t) {
    sel = t;
    if (card) card.remove();
    const u = root();
    const wxIcons = Object.entries(t.wx.night).sort((a, b) => b[1] - a[1]).slice(0, 2).map(([k]) => WEATHER[k].e).join('');
    card = el('div', 'tripcard', `
      <div class="te">${t.e}</div><div class="tn">${t.n}</div>
      <div class="row">${'🏕️'.repeat(t.diff)}<span class="pill">📅 ${t.days}</span></div>
      <div class="row">${wxIcons} <span class="pill">🌡️ ${t.temps[2]}–${t.temps[0]}°</span></div>
      <div class="row">${t.learn.join(' ')}</div>
      ${S.completed[t.id] ? `<div class="row">${stars(S.completed[t.id], 5)}</div>` : ''}`, u);
    if (S.unlocked.includes(t.id)) {
      const b = btn('▶ Go!', () => startPlan(t), 'go', card);
      if (!S.completed[t.id]) b.classList.add('pulse');
    } else el('div', 'tip', '🔒 Finish the trip before to unlock', card);
  },
  onTap(x, y) {
    for (const t of TRIPS) { const p = nodePos(t); if (Math.hypot(p.x - x, p.y - y) < 60) { audio.sfx('pop'); this.select(t); return; } }
  },
  draw(c) {
    const v = G.view;
    const g = c.createLinearGradient(0, v.y0, 0, v.y1); g.addColorStop(0, '#8fcf76'); g.addColorStop(1, '#5aa54e');
    c.fillStyle = g; c.fillRect(v.x0, v.y0, v.x1 - v.x0, v.y1 - v.y0);
    // lake + river
    c.fillStyle = '#d9c28f'; c.beginPath(); c.ellipse(760, 700, 175, 95, 0, 0, 7); c.fill();
    c.fillStyle = '#4b9fd0'; c.beginPath(); c.ellipse(760, 700, 160, 82, 0, 0, 7); c.fill();
    c.strokeStyle = 'rgba(255,255,255,0.5)'; c.lineWidth = 2;
    for (let i = 0; i < 5; i++) { const px = 680 + i * 40 + Math.sin(G.t + i) * 8; c.beginPath(); c.moveTo(px - 14, 690 + (i % 2) * 20); c.quadraticCurveTo(px, 686 + (i % 2) * 20, px + 14, 690 + (i % 2) * 20); c.stroke(); }
    c.strokeStyle = '#4b9fd0'; c.lineWidth = 26; c.lineCap = 'round'; c.beginPath(); c.moveTo(1500, 250); c.bezierCurveTo(1300, 450, 1500, 600, 1400, 1000); c.stroke();
    c.strokeStyle = 'rgba(255,255,255,0.4)'; c.lineWidth = 3; c.setLineDash([14, 22]); c.lineDashOffset = -G.t * 40; c.stroke(); c.setLineDash([]);
    // mountains
    for (const m of mapArt.mts) {
      c.fillStyle = '#8c9aa8'; c.beginPath(); c.moveTo(m.x - 90 * m.s, m.y + 60); c.lineTo(m.x, m.y - 80 * m.s); c.lineTo(m.x + 90 * m.s, m.y + 60); c.fill();
      c.fillStyle = '#a9b6c2'; c.beginPath(); c.moveTo(m.x - 90 * m.s, m.y + 60); c.lineTo(m.x, m.y - 80 * m.s); c.lineTo(m.x + 10, m.y + 60); c.fill();
      c.fillStyle = '#fff'; c.beginPath(); c.moveTo(m.x - 25 * m.s, m.y - 50 * m.s); c.lineTo(m.x, m.y - 80 * m.s); c.lineTo(m.x + 25 * m.s, m.y - 50 * m.s); c.lineTo(m.x, m.y - 44 * m.s); c.fill();
    }
    // house
    gx.drawHouse(c, 200, 850);
    for (const tr of mapArt.trees) gx.drawPine(c, tr.x, tr.y, 70 * tr.s, 0, false);
    // trail
    c.strokeStyle = '#fff3d6'; c.lineWidth = 7; c.setLineDash([4, 16]); c.lineCap = 'round';
    c.beginPath(); TRIPS.forEach((t, i) => { const p = nodePos(t); i ? c.lineTo(p.x, p.y) : c.moveTo(p.x, p.y); }); c.stroke(); c.setLineDash([]);
    // clouds shadows
    for (let i = 0; i < 4; i++) { const x = ((G.t * 18 + i * 600) % 2400) - 400; c.fillStyle = 'rgba(255,255,255,0.35)'; c.beginPath(); c.ellipse(x, 120 + i * 190, 120, 40, 0, 0, 7); c.ellipse(x + 70, 110 + i * 190, 80, 34, 0, 0, 7); c.fill(); }
    // nodes
    for (const t of TRIPS) {
      const p = nodePos(t), open = S.unlocked.includes(t.id), isSel = sel === t;
      const bob = isSel ? Math.sin(G.t * 4) * 5 : 0;
      c.fillStyle = 'rgba(0,0,0,0.25)'; c.beginPath(); c.ellipse(p.x, p.y + 48, 44, 12, 0, 0, 7); c.fill();
      c.fillStyle = isSel ? '#ffc93c' : open ? '#fff8e8' : '#b8b8b8';
      c.beginPath(); c.arc(p.x, p.y + bob, 52, 0, 7); c.fill();
      c.lineWidth = 6; c.strokeStyle = open ? '#8a5a33' : '#777'; c.stroke();
      c.globalAlpha = open ? 1 : 0.45; emo(c, t.e, p.x, p.y + bob, 50); c.globalAlpha = 1;
      if (!open) emo(c, '🔒', p.x + 34, p.y - 34, 26);
      if (S.completed[t.id]) { for (let i = 0; i < S.completed[t.id]; i++) emo(c, '⭐', p.x - 40 + i * 20, p.y + 66, 18); }
      c.fillStyle = '#2d2a26'; c.font = 'bold 22px system-ui,sans-serif'; c.textAlign = 'center';
      c.fillStyle = 'rgba(255,248,232,0.9)'; const tw = c.measureText(t.stage).width;
      c.beginPath(); c.arc(p.x - 44, p.y - 40 + bob, 16, 0, 7); c.fill(); c.fillStyle = '#6d4526'; c.fillText(t.stage, p.x - 44, p.y - 32 + bob);
    }
    if (sel) { const p = nodePos(sel); gx.drawCamper(c, p.x + 70, p.y + 50, { look: S.look, pose: 'idle', s: 0.55 }); }
  },
};
SC.tripmap = TripMap;

function startPlan(t) {
  plan = { def: t, forecast: genForecast(t), packed: {} };
  go(t.store ? 'store' : 'pack');
}

// ---------------- Store ----------------
const SHELVES = [
  ['🏕️ Shelter', ['tent', 'sleeping_bag', 'ground_tarp', 'rain_fly']],
  ['💧 Water & Food', ['water_bottle', 'water_filter', 'tablets', 'food', 'snacks', 'marshmallows', 'firewood']],
  ['🔥 Camp Tools', ['fire_starter', 'cook_kit', 'hatchet', 'rope', 'flashlight', 'lantern', 'first_aid', 'bug_spray']],
  ['🧭 Explore', ['compass', 'map', 'fishing_rod', 'camera']],
  ['👕 Clothes', ['rain_jacket', 'hoodie', 'warm_jacket', 'hat', 'warm_socks']],
  ['🎉 Fun', ['book', 'camp_chair']],
];
const maxOwn = id => ITEMS[id].consumable ? 9 : id === 'water_bottle' ? 4 : 1;
const Store = {
  enter() {
    audio.setAmbience({ birds: 0.3 });
    this.render();
  },
  back() { go('tripmap'); },
  render() {
    const u = root(); u.innerHTML = '';
    const s = el('div', 'screen panelbg', '', u);
    const top = el('div', 'topbar', '', s);
    btn('⬅', () => go('tripmap'), 'round', top);
    el('div', 'title', `🏪 Outdoor Store`, top);
    this.money = el('div', 'pill', `💰 $${S.money}`, top);
    btn('🎒 Pack ▶', () => go('pack'), 'go', top);
    if (plan) el('div', '', forecastHTML(plan.forecast), s);
    const sc = el('div', 'scroll', '', s);
    for (const [label, ids] of SHELVES) {
      const sh = el('div', 'shelf', `<div class="shelf-label">${label}</div>`, sc);
      const g = el('div', 'grid', '', sh);
      for (const id of ids) {
        const it = ITEMS[id], own = S.owned[id] || 0;
        const cd = el('div', 'card' + (own && !it.consumable ? ' have' : ''), `${own && (it.consumable || id === 'water_bottle') ? `<span class="qty">×${own}</span>` : ''}<div class="ce">${it.e}</div><div class="cn">${it.n}</div><div class="cp">$${it.price}</div>`, g);
        cd.addEventListener('click', () => { audio.sfx('tap'); this.detail(id); });
      }
    }
  },
  detail(id) {
    const it = ITEMS[id], own = S.owned[id] || 0, full = own >= maxOwn(id);
    const body = el('div', '', `<div class="bigicon">${it.e}</div><div class="tip"><b>${it.n}</b></div>
      <div class="row c"><span class="pill">💰 $${it.price}</span><span class="pill">⚖️ ${it.wt}</span><span class="pill">📦 ${it.sp}</span><span class="pill">${it.fn}</span></div>
      <div class="tip">${it.tip}</div>${own ? `<div class="tip">🎒 ×${own}</div>` : ''}`);
    modal({
      title: '', body, buttons: full ? [{ label: '✔ Got it', cls: '' }] : [{
        label: `🛒 Buy $${it.price}`, cls: 'go', sound: null, onClick: () => {
          if (S.money < it.price) { audio.sfx('bad'); toast('💰❌ Not enough money'); return; }
          S.money -= it.price; S.owned[id] = own + 1; audio.sfx('coin');
          toast(`${it.e} ✔`); save(); this.render();
        },
      }],
    });
  },
};
SC.store = Store;

// ---------------- Pack ----------------
function packStats(p) {
  let sp = 0, wt = 0;
  for (const [k, q] of Object.entries(p)) { sp += ITEMS[k].sp * q; wt += ITEMS[k].wt * q; }
  return { sp, wt };
}
const Pack = {
  enter() {
    if (!plan) { go('tripmap'); return; }
    audio.setAmbience({ birds: 0.3 });
    if (!Object.keys(plan.packed).length && S.lastPack) {
      for (const [k, q] of Object.entries(S.lastPack)) { const n = Math.min(q, S.owned[k] || 0); if (n) plan.packed[k] = n; }
      while (packStats(plan.packed).sp > PACK_CELLS) { const ks = Object.keys(plan.packed); const k = ks[ks.length - 1]; if (--plan.packed[k] <= 0) delete plan.packed[k]; }
    }
    this.render();
  },
  back() { go(plan.def.store ? 'store' : 'tripmap'); },
  add(id) {
    const p = plan.packed, it = ITEMS[id];
    if ((p[id] || 0) >= (S.owned[id] || 0)) return;
    if (packStats(p).sp + it.sp > PACK_CELLS) { audio.sfx('bad'); toast('📦❌ No room!'); this.packEl.classList.remove('shake'); void this.packEl.offsetWidth; this.packEl.classList.add('shake'); return; }
    p[id] = (p[id] || 0) + 1; audio.sfx('zip'); this.render();
  },
  remove(id) { const p = plan.packed; if (!p[id]) return; if (--p[id] <= 0) delete p[id]; audio.sfx('swoosh'); this.render(); },
  render() {
    const u = root(); u.innerHTML = '';
    const d = plan.def, p = plan.packed, st = packStats(p);
    const s = el('div', 'screen panelbg', '', u);
    const top = el('div', 'topbar', '', s);
    btn('⬅', () => this.back(), 'round', top);
    if (d.store) btn('🏪', () => go('store'), 'round', top);
    el('div', 'title', `🎒 Pack for ${d.e} ${d.n}`, top);
    const goB = btn('▶ Go!', () => {
      if (!p.tent) { audio.sfx('bad'); toast('⛺❗ Pack a tent!'); goB.classList.add('shake'); setTimeout(() => goB.classList.remove('shake'), 500); return; }
      S.lastPack = { ...p };
      S.trip = null;
      for (const [k, q] of Object.entries(p)) if (ITEMS[k].consumable) { S.owned[k] -= q; if (S.owned[k] <= 0) delete S.owned[k]; }
      newTrip(d, p, plan.forecast);
      if (st.wt > PACK_WEIGHT) S.trip.heavy = true;
      save();
      go('travel', d);
    }, 'go', top);
    const fc = el('div', 'row c', forecastHTML(plan.forecast), s);
    el('div', 'pill', `🎯 ${d.goals.map(g => GOALS[g].e).join(' ')}`, fc);
    const wrap = el('div', 'packwrap', '', s);
    const locker = el('div', 'locker', '<div class="sectitle">🏠 My gear</div>', wrap);
    const g = el('div', 'grid', '', locker);
    const hl = hintLevel(d.expert);
    const rainy = plan.forecast.some(f => WEATHER[f.night].rain || WEATHER[f.eve].rain);
    const cold = plan.forecast.some(f => f.temps[2] < 48);
    const suggest = new Set(['tent', 'sleeping_bag', 'water_bottle']);
    if (d.id === 'backyard') suggest.add('flashlight');
    if (rainy) suggest.add('rain_fly');
    if (cold) suggest.add('warm_jacket');
    if (d.fish) suggest.add('fishing_rod');
    const packSide = el('div', 'packside', '', wrap);
    const ids = Object.keys(ITEMS).filter(k => S.owned[k] > 0);
    for (const id of ids) {
      const it = ITEMS[id], left = S.owned[id] - (p[id] || 0);
      const cd = el('div', 'card' + (left <= 0 ? ' locked' : ''), `<span class="qty">×${left}</span><div class="ce">${it.e}</div><div class="cn">${it.n}</div><div class="cn">📦${it.sp} ⚖️${it.wt}</div>`, g);
      if (hl >= 1 && left > 0 && !p[id] && suggest.has(id)) cd.classList.add('pulse');
      draggable(cd, { targets: () => [this.packEl], onDrop: () => this.add(id), onTap: () => this.add(id) });
    }
    if (!ids.length) el('div', 'tip', '🏪 Visit the store!', locker);
    // backpack
    const bp = el('div', 'backpack', '', packSide);
    bp.style.background = `linear-gradient(${cosmetic('pack').c}, ${cosmetic('pack').c}cc)`;
    this.packEl = bp;
    const pg = el('div', 'pgrid', '', bp);
    pg.style.gridAutoFlow = 'dense';
    const colors = ['#f6d365', '#a1e3a1', '#9ecbff', '#ffb3c1', '#d7b8ff', '#ffd6a5', '#b8f2e6'];
    let ci = 0;
    const order = Object.entries(p).sort((a, b) => ITEMS[b[0]].sp - ITEMS[a[0]].sp);
    for (const [id, q] of order) {
      for (let i = 0; i < q; i++) {
        const it = ITEMS[id];
        const cell = el('div', 'pitem', it.e, pg);
        const w = it.sp === 4 ? 2 : it.sp, h = it.sp === 4 ? 2 : 1;
        cell.style.gridColumn = `span ${w}`; cell.style.gridRow = `span ${h}`;
        cell.style.background = colors[ci % colors.length];
        cell.addEventListener('click', () => this.remove(id));
      }
      ci++;
    }
    for (let i = st.sp; i < PACK_CELLS; i++) el('div', 'pcell', '', pg);
    el('div', 'row c', `📦 ${meterBar(st.sp / PACK_CELLS * 100)} <b>${st.sp}/${PACK_CELLS}</b>`, packSide);
    el('div', 'row c', `⚖️ ${meterBar(Math.min(100, st.wt / PACK_WEIGHT * 100), st.wt > PACK_WEIGHT ? 'over' : '')} <b>${st.wt}/${PACK_WEIGHT}</b> ${st.wt > PACK_WEIGHT ? '😓' : ''}`, packSide);
    el('div', 'tip', '👆 Tap gear to pack or unpack', packSide);
  },
};
SC.pack = Pack;

// ---------------- Travel ----------------
let tt = 0, tdef = null, tenv = null;
const Travel = {
  enter(d) {
    tdef = d; tt = 0;
    tenv = gx.makeEnv(d.biome, 99);
    audio.setAmbience({ wind: 0.6, birds: 0.5 });
    audio.setMusic('day');
    banner(`🚗 ${d.e} ${d.n}`, d.n);
    btn('⏩', () => this.done(), 'round side-right', root());
  },
  done() { if (tdef) { tdef = null; go('camp', { arrive: true }); } },
  update(dt) { tt += dt; if (tt > 3.2) this.done(); },
  draw(c) {
    if (!tenv) return;
    const h = 9;
    gx.drawSky(c, tenv, h, 'sun'); gx.drawClouds(c, tenv, 'sun', G.dt);
    c.save(); c.translate(-(tt * 60) % 400, 0); gx.drawRanges(c, tenv, h, 'sun'); c.restore();
    gx.drawGround(c, tenv, h);
    // road
    c.fillStyle = '#5b5b60'; c.fillRect(G.view.x0, 640, G.view.x1 - G.view.x0, 120);
    c.fillStyle = '#f5d76e'; for (let x = -((tt * 900) % 200) + G.view.x0; x < G.view.x1; x += 200) c.fillRect(x, 695, 100, 10);
    for (let i = 0; i < 12; i++) { const x = ((i * 260 - tt * 500) % 3000 + 3000) % 3000 - 700; gx.drawPine(c, x, 630, 150 + (i % 3) * 30, 0, tdef && tdef.biome === 'mountain'); }
    // car
    const cx = 760, cy = 700 + Math.sin(tt * 30) * 1.5;
    c.fillStyle = 'rgba(0,0,0,0.3)'; c.beginPath(); c.ellipse(cx, cy + 50, 150, 16, 0, 0, 7); c.fill();
    c.fillStyle = '#2e86de'; rr(c, cx - 150, cy - 30, 300, 70, 24); c.fill();
    c.fillStyle = '#3d9bf0'; rr(c, cx - 90, cy - 90, 170, 70, 26); c.fill();
    c.fillStyle = '#cfe9ff'; rr(c, cx - 76, cy - 80, 70, 48, 12); c.fill(); rr(c, cx + 2, cy - 80, 64, 48, 12); c.fill();
    gx.drawCamper(c, cx + 34, cy + 10, { look: S.look, pose: 'idle', s: 0.62, pack: false });
    c.fillStyle = '#c0392b'; rr(c, cx - 70, cy - 118, 120, 28, 10); c.fill();
    emo(c, '⛺', cx - 10, cy - 104, 24);
    for (const wx of [cx - 90, cx + 90]) {
      c.save(); c.translate(wx, cy + 40); c.rotate(tt * 20);
      c.fillStyle = '#222'; c.beginPath(); c.arc(0, 0, 30, 0, 7); c.fill(); c.fillStyle = '#aaa'; c.beginPath(); c.arc(0, 0, 13, 0, 7); c.fill();
      c.fillStyle = '#666'; c.fillRect(-2, -13, 4, 26); c.restore();
    }
    c.fillStyle = '#ffeaa7'; c.beginPath(); c.arc(cx + 144, cy, 9, 0, 7); c.fill();
  },
};
SC.travel = Travel;
