// Fire building: tinder -> kindling -> small wood -> logs. Heat, fuel, air. Then put it out safely.
import { G, W, H, emo, emit, burst, drawParticles, rand, dist, clamp, rr, chance } from './engine.js';
import { audio } from './audio.js';
import { S, addXP, count, hintLevel, perf } from './save.js';
import { LESSONS } from './data.js';
import { T, def, has, passTime, wxKey, wx, woodTotal } from './sim.js';
import * as gx from './gfx.js';
import { el, btn, root, toast, banner, lesson, draggable, meterBar } from './ui.js';
import { SC, go } from './nav.js';

const FX = 800, FY = 640, FS = 2.4;
const TYPES = {
  tinder:   { e: '🌾', n: 'Tinder', prod: 30, burn: 3.5, ign: 0 },
  kindling: { e: '🥢', n: 'Kindling', prod: 17, burn: 9, ign: 12 },
  small:    { e: '🪵', n: 'Sticks', prod: 12, burn: 20, ign: 30 },
  log:      { e: '🪵', n: 'Logs', prod: 10, burn: 50, ign: 50 },
};
const ORDER = ['tinder', 'kindling', 'small', 'log'];

let t, env, pit, heat, air, fan, smoke, holding, holdT, stirT, recent, established, acted, triEl, trayEls, ladderEl, toolsEl, hl, lastLesson, doused, stirred, env2;

const FireGame = {
  enter() {
    t = T(); hl = hintLevel(def().expert);
    env = gx.makeEnv(def().biome, 21, { horizon: 230 });
    const f = t.camp.fire;
    pit = [];
    if (f.lit) {
      for (const k of ORDER) for (let i = 0; i < f.fuel[k]; i++) pit.push(piece(k, false, true));
      heat = Math.max(55, f.hot); established = true;
    } else {
      for (const p of (f.pit || [])) pit.push(piece(p.type, p.wet, false));
      heat = f.hot || 0; established = false;
    }
    air = 1; fan = 0; smoke = 0; holding = null; holdT = 0; stirT = 0; recent = 0; acted = false; lastLesson = null;
    doused = f.doused || 0; stirred = !!f.stirred;
    this.ui();
    audio.setAmbience({ wind: 0.3 + wx().wind * 0.3, fire: 0, rain: wx().rain, night: t.hour > 20 ? 1 : 0 });
    this.banner();
  },
  back() { this.leave(); },
  ui() {
    const u = root(); u.innerHTML = '';
    btn('⬅', () => this.leave(), 'round back-btn', u);
    ladderEl = el('div', 'side-left', '', u);
    triEl = el('div', 'side-right', '', u);
    triEl.style.cssText += ';background:rgba(255,248,232,0.9);padding:0.5rem;border-radius:1rem;font-weight:bold';
    const mh = el('div', 'minihud', '', u);
    const tray = el('div', 'tray', '', mh);
    trayEls = {};
    for (const k of ORDER) {
      const b = btn('', () => this.add(k), '', tray, null);
      trayEls[k] = b;
      draggable(b, { targets: () => [G.canvas], onDrop: () => this.add(k) });
    }
    toolsEl = el('div', 'tray', '', mh);
    this.tools = {
      light: btn('<span class="big">🔥</span><small>Light</small>', () => toast('👆 Hold on the tinder'), '', toolsEl),
      fan: btn('<span class="big">💨</span><small>Fan</small>', () => { fan = Math.min(0.6, fan + 0.35); audio.sfx('whoosh'); burst(FX, FY - 20, 8, { color: '#fff', size: 3, life: 0.4, alpha: 0.5 }); acted = true; }, '', toolsEl),
      water: btn('<span class="big">💧</span><small>Douse</small>', () => this.douse(), 'blue', toolsEl),
      stir: btn('<span class="big">🥢</span><small>Stir</small>', () => this.stir(), '', toolsEl),
      check: btn('<span class="big">✋</span><small>Check</small>', () => this.check(), '', toolsEl),
    };
    if (!has('fire_starter')) this.tools.light.classList.add('dim');
    this.refresh();
  },
  refresh() {
    for (const k of ORDER) {
      const w = t.wood[k], n = w.dry + w.wet;
      trayEls[k].innerHTML = `<span class="big">${TYPES[k].e}${k === 'log' ? '<span style="font-size:0.7em">➕</span>' : ''}</span><small>${TYPES[k].n} ${n}${w.dry === 0 && w.wet > 0 ? '💧' : ''}</small>`;
      trayEls[k].classList.toggle('dim', n === 0);
    }
    const lit = pit.some(p => p.lit);
    this.tools.light.style.display = lit ? 'none' : '';
    this.tools.fan.style.display = lit ? '' : 'none';
    const anyHeat = lit || heat > 1 || doused;
    for (const k of ['water', 'stir', 'check']) this.tools[k].style.display = anyHeat ? '' : 'none';
    // ladder hint
    ladderEl.innerHTML = '';
    if (hl >= 1 || !established) {
      const want = this.want();
      ORDER.forEach((k, i) => {
        const p = el('div', 'pill' + (k === want && hl >= 1 ? ' pulse' : ''), `${TYPES[k].e}${k === 'log' ? '➕' : ''}`, ladderEl);
        if (i < 3) el('div', '', '⬇️', ladderEl).style.textAlign = 'center';
        p.style.fontSize = '1.3rem';
      });
    }
  },
  want() {
    if (!pit.some(p => p.type === 'tinder' && !p.done)) return 'tinder';
    if (heat < 25) return pit.some(p => p.type === 'kindling' && !p.done) && !pit.some(p => p.lit) ? null : 'kindling';
    if (heat < 45) return 'small';
    return 'log';
  },
  banner() {
    if (!pit.length && !established) banner('🌾 Start with tinder', 'Start with tinder');
    else if (!pit.some(p => p.lit) && heat < 2) banner(has('fire_starter') ? '🔥 Hold on the tinder to light' : '🔥❌ No fire starter packed');
    else if (established) banner('🔥✅ Healthy fire!');
    else banner('🔥 Feed it: small first, then bigger');
  },
  add(k) {
    const w = t.wood[k];
    if (w.dry + w.wet <= 0) { audio.sfx('bad'); toast(`${TYPES[k].e}❌ ${woodTotal() ? '' : '🗺️ Gather wood'}`); return; }
    const wet = w.dry <= 0;
    if (wet) w.wet--; else w.dry--;
    if (pit.filter(p => !p.done).length >= 14) { toast('🔥🪵🪵 Too full!'); if (wet) w.wet++; else w.dry++; return; }
    const p = piece(k, wet, false); pit.push(p);
    acted = true; recent += 1;
    audio.sfx('thunk');
    const lit = pit.some(q => q.lit);
    if (lit && heat < TYPES[k].ign - 15 && (k === 'log' || k === 'small')) {
      heat = Math.max(0, heat - (k === 'log' ? 16 : 8)); air -= 0.15;
      toast('🔥⬇️'); burst(FX, FY - 40, 16, { color: 'rgba(90,90,90,0.6)', size: 8, grow: 10, life: 1.4, sp1: 80 });
      this.teach('big_log');
    }
    if (wet) this.teach('wet_wood', true);
    this.refresh(); this.banner();
  },
  teach(k, soft) {
    if (lastLesson === k) return; lastLesson = k;
    if (soft && hl === 0) return;
    setTimeout(() => lesson({ big_log: '🪵🔥⬇️', wet_wood: '💦🪵', smoky: '💨❌', fire_out: '🔥❓', embers: '🔥✋' }[k], LESSONS[k]), 300);
  },
  douse() {
    if (!pit.some(p => p.lit) && heat <= 0.5 && doused) { toast('💧✅'); return; }
    doused++; acted = true;
    audio.sfx('hiss'); audio.sfx('splash');
    for (const p of pit) { if (p.lit) { p.lit = false; } p.wet = true; }
    heat = Math.max(0, heat - (doused >= 2 ? 100 : 55));
    // hidden embers stay warm until stirred and doused again
    if (!stirred && heat <= 0) heat = 12;
    for (let i = 0; i < 25; i++) emit({ x: FX + rand(-80, 80), y: FY - rand(0, 40), vx: rand(-20, 20), vy: rand(-140, -60), life: rand(1, 2), size: 10, grow: 20, color: 'rgba(235,235,235,0.55)', fadeIn: true });
    this.refresh(); banner(stirred ? '✋ Check if it is cold' : '🥢 Stir the ashes');
  },
  stir() {
    acted = true; stirred = true; stirT = 1.2; audio.sfx('rustle');
    burst(FX, FY - 10, 10, { color: heat > 3 ? ['#ff7b3a', '#ffb347'] : '#777', size: 3, life: 0.7, up: 80 });
    if (heat > 3 && doused < 2) { toast('🔥👀 Hidden embers!'); this.teach('embers'); banner('💧 Douse again'); }
    else banner('✋ Check if it is cold');
    this.refresh();
  },
  check() {
    acted = true; holdT = 0;
    if (heat > 3 || pit.some(p => p.lit)) { audio.sfx('bad'); toast('✋🔥 Still hot!'); this.teach('embers'); return; }
    if (!doused) { toast(t.camp.fire.everLit ? '💧 Douse it first!' : '✋ Cold — never lit'); return; }
    if (!stirred) { audio.sfx('bad'); toast('✋🔥 Still warm inside — stir!'); heat = Math.max(heat, 8); this.teach('embers'); return; }
    audio.sfx('success');
    toast('✋✅ Cold to touch. Safe!');
    const f = t.camp.fire;
    f.lit = false; f.hot = 0; f.fuel = { tinder: 0, kindling: 0, small: 0, log: 0 }; f.pit = []; f.safe = true;
    t.flags.fireOut = true; addXP('firecraft', 6); perf(true);
    pit = []; heat = 0; doused = 0; stirred = false; established = false;
    setTimeout(() => this.leave(), 900);
  },

  // ---------- sim ----------
  update(dt) {
    const rain = wx().rain;
    let unlit = 0, litN = 0;
    recent = Math.max(0, recent - dt * 0.5);
    for (const p of pit) if (!p.done) { if (p.lit) litN++; else unlit++; }
    fan = Math.max(0, fan - dt * 0.2);
    const crowd = Math.max(0, unlit + litN - 6) * 0.07 + Math.max(0, recent - 3) * 0.15;
    const target = clamp(1 - crowd + fan, 0.15, 1.4);
    air += (target - air) * Math.min(1, dt * 2);
    let prod = 0; smoke = 0;
    for (const p of pit) {
      if (p.done) continue;
      const T2 = TYPES[p.type];
      if (p.lit) {
        prod += T2.prod * air * (p.wet ? 0.45 : 1);
        p.burn -= dt * (0.5 + air * 0.6);
        if (p.wet) { smoke += 0.4; p.dry += dt; if (p.dry > 5) p.wet = false; }
        if (p.burn <= 0) { p.done = true; p.lit = false; }
      } else if (heat > T2.ign + (p.wet ? 22 : 0) && T2.ign > 0 && Math.random() < dt * 1.6 && !doused) {
        p.lit = true;
        if (p.wet) { audio.sfx('hiss'); heat -= 4; }
      }
    }
    if (air < 0.55 && litN) smoke += 0.6;
    if (litN || (!doused && heat > 12)) heat += (prod - heat * 0.22 - rain * 2) * dt;
    else if (!doused) heat = Math.max(0, heat - dt * 0.3);
    heat = clamp(heat, 0, 100);
    if (!pit.some(p => p.lit) && doused) { if (stirred && doused >= 2) heat = Math.max(0, heat - dt * 20); else heat = Math.max(heat, 10); }
    if (air < 0.5 && litN && Math.random() < dt * 0.3) this.teach('smoky');
    // ignite by holding
    if (holding && has('fire_starter')) {
      holdT += dt;
      if (Math.random() < dt * 20) emit({ x: holding.x + rand(-10, 10), y: holding.y, vx: rand(-60, 60), vy: rand(-100, 20), g: 300, life: 0.4, size: 2, color: '#ffd166', add: true });
      if (holdT > 0.9) {
        holding = null; holdT = 0;
        const tin = pit.find(p => p.type === 'tinder' && !p.done && !p.lit);
        if (!tin) { toast('🌾❓ Add tinder first'); audio.sfx('bad'); }
        else if (tin.wet && chance(0.8)) { toast('💦🌾 Tinder too wet'); audio.sfx('hiss'); this.teach('wet_wood'); }
        else { tin.lit = true; heat = Math.max(heat, 10); audio.sfx('whoosh'); acted = true; t.camp.fire.everLit = true; }
        this.refresh(); this.banner();
      }
    }
    // established?
    const bigLit = pit.some(p => p.lit && (p.type === 'small' || p.type === 'log'));
    if (!established && heat >= 58 && bigLit) {
      established = true; audio.sfx('success');
      burst(FX, FY - 80, 30, { color: ['#ffd166', '#ff8c42', '#fff'], size: 4, life: 1, add: true });
      toast('🔥✅ Healthy fire!');
      t.flags.fire = true; t.camp.fire.everLit = true; count('fires'); addXP('firecraft', 10); perf(true);
      this.banner(); this.refresh();
    }
    // went out
    if ((litN > 0 || established) && !pit.some(p => p.lit) && heat < 14 && !doused) {
      if (established || litN) { toast('🔥❌ Fire went out'); audio.sfx('bad'); this.teach('fire_out'); perf(false); }
      established = false; this.refresh(); this.banner();
    }
    // fx
    const lvl = this.level();
    if (lvl > 0 && Math.random() < dt * 30 * lvl) emit({ x: FX + rand(-60, 60), y: FY - 40, vx: rand(-30, 30), vy: rand(-260, -120), life: rand(0.5, 1.2), size: 2.5, color: '#ffc864', add: true });
    if ((smoke > 0 || (heat > 3 && !pit.some(p => p.lit))) && Math.random() < dt * (4 + smoke * 12)) emit({ x: FX + rand(-40, 40), y: FY - 60 - lvl * 120, vx: rand(-10, 30), vy: rand(-80, -40), life: rand(2, 3.5), size: 12, grow: 26, color: smoke > 0.5 ? 'rgba(80,80,80,0.55)' : 'rgba(210,210,210,0.35)', fadeIn: true });
    audio.setAmbience({ wind: 0.3 + wx().wind * 0.3, fire: lvl, rain, night: t.hour > 20 ? 1 : 0 });
    if (stirT > 0) stirT -= dt;
    // meters
    this.meterT = (this.meterT || 0) + dt;
    if (this.meterT > 0.2) {
      this.meterT = 0;
      const fuel = pit.filter(p => !p.done).reduce((a, p) => a + p.burn, 0);
      triEl.innerHTML = `<div>🌡️ ${meterBar(heat)}</div><div>🪵 ${meterBar(Math.min(100, fuel))}</div><div>💨 ${meterBar(Math.min(100, air * 80), air < 0.55 ? 'over' : '')}</div>`;
    }
  },
  level() { return pit.some(p => p.lit) ? clamp(heat / 90, 0.15, 1) : heat > 3 ? -Math.min(1, heat / 40) : 0; },
  onDown(x, y) {
    if (dist(x, y, FX, FY - 30) < 170 && !pit.some(p => p.lit)) {
      if (!has('fire_starter')) { toast('🔥❌ No fire starter'); audio.sfx('bad'); return; }
      holding = { x, y }; holdT = 0;
    }
  },
  onMove(x, y) {
    if (holding) { holding.x = x; holding.y = y; }
    if (doused && dist(x, y, FX, FY) < 150 && !holding && !stirred) { this.stir(); }
  },
  onUp() { holding = null; holdT = 0; },
  onTap() { },
  leave() {
    const f = t.camp.fire;
    const lit = pit.some(p => p.lit) && heat > 8;
    if (lit) {
      f.lit = true; f.hot = heat; f.pit = [];
      f.fuel = { tinder: 0, kindling: 0, small: 0, log: 0 };
      for (const p of pit) if (!p.done) f.fuel[p.type]++;
      if (f.fuel.small + f.fuel.log === 0) f.fuel.kindling = Math.max(1, f.fuel.kindling);
    } else if (f.hot !== 0 || pit.length) {
      f.lit = false; f.hot = heat; f.fuel = { tinder: 0, kindling: 0, small: 0, log: 0 };
      f.pit = pit.filter(p => !p.done).map(p => ({ type: p.type, wet: p.wet }));
    }
    f.doused = doused; f.stirred = stirred;
    if (acted) passTime(0.5, 'work');
    go('camp');
  },

  // ---------- draw ----------
  draw(c) {
    const h = t.hour, wk = wxKey(t);
    gx.drawSky(c, env, h, wk); gx.drawRanges(c, env, h, wk); gx.drawGround(c, env, h);
    gx.drawClearing(c, FX, FY + 20, 600, 220);
    gx.drawFireRing(c, FX, FY, FS);
    // pieces
    const lvl = this.level();
    pit.forEach((p, i) => { if (!p.done) drawPiece(c, p, i); });
    // ashes of done pieces
    const ash = pit.filter(p => p.done).length;
    if (ash) { c.fillStyle = 'rgba(80,75,70,0.8)'; c.beginPath(); c.ellipse(FX, FY + 6, Math.min(90, 20 + ash * 6), 18, 0, 0, 7); c.fill(); }
    if (lvl !== 0) gx.drawFlames(c, FX, FY - 10, lvl, FS * 0.8);
    drawParticles(c);
    if (stirT > 0) emo(c, '🥢', FX + Math.cos(G.t * 10) * 60, FY - 20 + Math.sin(G.t * 10) * 20, 50);
    if (holding) { emo(c, '🔥', holding.x + 30, holding.y - 30, 40); c.strokeStyle = '#ffc93c'; c.lineWidth = 6; c.beginPath(); c.arc(holding.x, holding.y, 40, -Math.PI / 2, -Math.PI / 2 + holdT / 0.9 * Math.PI * 2); c.stroke(); }
    if (hl >= 1 && !pit.some(p => p.lit) && pit.some(p => p.type === 'tinder' && !p.done) && heat < 2 && has('fire_starter') && !holding) {
      const k = (G.t % 1.4) / 1.4; c.globalAlpha = 1 - k * 0.5; emo(c, '👆', FX + 20, FY - 30 + k * 10, 50); c.globalAlpha = 1;
      c.strokeStyle = `rgba(255,201,60,${0.5 + 0.4 * Math.sin(G.t * 5)})`; c.lineWidth = 5; c.beginPath(); c.arc(FX, FY - 20, 60, 0, 7); c.stroke();
    }
    if (wx().rain) gx.drawRain(c, wx().rain, wx().wind, G.t);
    const dk = Math.max(0, (h > 19 ? (h - 19) / 3 : h < 6 ? 0.7 : 0)) * 0.7;
    if (dk > 0) { gx.lighting(c, dk, lvl > 0 ? [{ x: FX, y: FY - 60, r: 350 + lvl * 400, col: 'rgba(255,150,60,0.9)' }] : lvl < 0 ? [{ x: FX, y: FY, r: 180, col: 'rgba(255,80,30,0.8)', k: 0.6 }] : []); if (lvl) gx.drawFlames(c, FX, FY - 10, lvl, FS * 0.8); }
  },
};
SC.fire = FireGame;

function piece(type, wet, lit) { return { type, wet, lit, done: false, burn: TYPES[type].burn, dry: 0, r: rand(-0.3, 0.3) }; }
function drawPiece(c, p, i) {
  const col = p.wet ? '#4f3a2a' : '#8b5a2b', hi = p.wet ? '#6b5646' : '#b98752';
  const glow = p.lit ? `rgba(255,${120 + (i * 13) % 80},40,0.9)` : null;
  const n = i % 6, a = n / 6 * Math.PI * 2 + p.r;
  c.save(); c.translate(FX, FY - 10);
  if (p.type === 'tinder') {
    c.fillStyle = p.lit ? '#ffb347' : p.wet ? '#8d8a5a' : '#e8d17a';
    c.beginPath(); for (let k = 0; k < 9; k++) { const aa = k / 9 * 6.28; c.moveTo(0, 0); c.lineTo(Math.cos(aa) * 30, Math.sin(aa) * 14 - 10); } c.lineWidth = 3; c.strokeStyle = c.fillStyle; c.stroke();
    c.beginPath(); c.ellipse(0, -6, 22, 12, 0, 0, 7); c.fill();
  } else if (p.type === 'kindling') {
    c.rotate(Math.cos(a) * 0.5); c.strokeStyle = glow || col; c.lineWidth = 5; c.lineCap = 'round';
    c.beginPath(); c.moveTo(Math.cos(a) * 55, 10); c.lineTo(Math.cos(a) * 6, -80); c.stroke();
  } else if (p.type === 'small') {
    c.strokeStyle = glow || col; c.lineWidth = 11; c.lineCap = 'round';
    c.beginPath(); c.moveTo(Math.cos(a) * 95, 14 + Math.sin(a) * 10); c.lineTo(Math.cos(a) * 12, -95); c.stroke();
    c.strokeStyle = hi; c.lineWidth = 3; c.beginPath(); c.moveTo(Math.cos(a) * 90, 10 + Math.sin(a) * 10); c.lineTo(Math.cos(a) * 14, -88); c.stroke();
  } else {
    const k = Math.floor(i / 2) % 3;
    c.rotate((k - 1) * 0.6 + p.r * 0.3); c.translate(0, -10 - k * 8);
    c.fillStyle = glow || col; rr(c, -120, -15, 240, 30, 14); c.fill();
    c.fillStyle = p.wet ? '#8a7560' : '#e0b27a'; c.beginPath(); c.ellipse(120, 0, 9, 15, 0, 0, 7); c.fill();
    c.fillStyle = hi; c.fillRect(-110, -12, 220, 5);
  }
  if (p.wet) { c.fillStyle = 'rgba(140,190,255,0.8)'; c.beginPath(); c.arc(Math.cos(a) * 20, -20 + (G.t * 30 % 20), 3, 0, 7); c.fill(); }
  c.restore();
}
