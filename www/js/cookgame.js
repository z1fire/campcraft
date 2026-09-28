// Cooking over the fire: RAW -> SAFE -> BURNT. Also boiling water to make it safe.
import { G, W, H, emo, emit, burst, drawParticles, rand, dist, clamp, rr, chance } from './engine.js';
import { audio } from './audio.js';
import { S, addXP, count, hintLevel, perf } from './save.js';
import { FOODS, FISH, LESSONS } from './data.js';
import { T, def, has, passTime, wxKey, wx, fireLevel, eat } from './sim.js';
import * as gx from './gfx.js';
import { el, btn, root, toast, banner, lesson, closeModal } from './ui.js';
import { SC, go } from './nav.js';

const FX = 800, FY = 700;
const ZONES = [{ y: 330, k: 0.45, e: '⬆️' }, { y: 430, k: 0.8, e: '↕️' }, { y: 520, k: 1.25, e: '⬇️' }];
let t, env, food, sides, side, zone, flame, coals, surge, sizzleT, trayEl, ctrlEl, boil, temp, boilHold, hl, dragging, done;

const Cook = {
  enter(arg = {}) {
    t = T(); hl = hintLevel(def().expert);
    env = gx.makeEnv(def().biome, 31, { horizon: 220 });
    const f = t.camp.fire;
    flame = f.lit ? fireLevel(f) : 0;
    coals = f.lit ? clamp(f.hot / 100, 0.4, 1) : clamp(f.hot / 100, 0, 1);
    boil = !!arg.boil; food = null; zone = 1; surge = 0; sizzleT = 0; temp = 20; boilHold = 0; dragging = false; done = false;
    const u = root();
    btn('⬅', () => this.leave(), 'round back-btn', u);
    ctrlEl = el('div', 'side-right', '', u);
    const mh = el('div', 'minihud', '', u);
    trayEl = el('div', 'tray', '', mh);
    audio.setAmbience({ fire: Math.max(flame, coals * 0.5), night: t.hour > 20 ? 1 : 0 });
    if (boil) { this.startBoil(); } else this.renderTray();
  },
  back() { this.leave(); },
  renderTray() {
    trayEl.innerHTML = '';
    banner('🍳 Pick food to cook', 'Pick food to cook');
    const add = (key, e, n, extra) => { const b = btn(`<span class="big">${e}</span><small>×${n}</small>`, () => this.start(key, extra), '', trayEl); if (FOODS[key].pot && !has('cook_kit')) b.classList.add('dim'); };
    for (const [k, n] of Object.entries(t.meals)) if (n > 0) add(k, FOODS[k].e, n);
    const fishBy = {}; t.fish.forEach(f => fishBy[f] = (fishBy[f] || 0) + 1);
    for (const [sp, n] of Object.entries(fishBy)) add('fish', '🐟', n, sp);
    if (t.marsh > 0) add('marshmallow', '🍡', t.marsh);
    if (!trayEl.children.length) el('div', 'pill', '🍗❌', trayEl);
    ctrlEl.innerHTML = '';
  },
  start(key, extra) {
    const F = FOODS[key];
    if (F.pot && !has('cook_kit')) { toast('🍳❌ Need a cook kit'); audio.sfx('bad'); return; }
    if (key === 'fish') t.fish.splice(t.fish.indexOf(extra), 1);
    else if (key === 'marshmallow') t.marsh--;
    else t.meals[key]--;
    food = { key, F, species: extra };
    sides = Array(F.sides).fill(0); side = 0; done = false;
    trayEl.innerHTML = '';
    ctrlEl.innerHTML = '';
    if (F.sides > 1) btn('<span class="big">🔄</span><small>Flip</small>', () => { side = (side + 1) % sides.length; audio.sfx('swoosh'); burst(FX, ZONES[zone].y + 60, 6, { color: '#fff', size: 3, life: 0.4 }); }, '', ctrlEl);
    btn('<span class="big">🍽️</span><small>Done</small>', () => this.finish(), 'go', ctrlEl);
    banner(F.sides > 1 ? '🔄 Cook both sides, then 🍽️' : '👀 Watch the meter, then 🍽️');
    if (hl >= 1) setTimeout(() => toast('↕️ Drag the pan up or down'), 600);
  },
  startBoil() {
    food = { key: 'water' }; sides = [0]; side = 0;
    banner('🫧 Boil until big bubbles', 'Boil until big bubbles');
    ctrlEl.innerHTML = '';
    btn('<span class="big">✅</span><small>Done</small>', () => this.finishBoil(), 'go', ctrlEl);
  },
  heatAt() {
    const base = Math.max(flame * 1.0, coals * 0.75);
    return base * ZONES[zone].k * (1 + surge);
  },
  update(dt) {
    // flames surge when big; tripod keeps things steady
    const steady = t.camp.built.tripod ? 0.4 : 1;
    if (flame > 0.65 && Math.random() < dt * 1.2 * steady) surge = rand(0.4, 0.9) * flame;
    surge = Math.max(0, surge - dt * 0.8);
    const lvl = flame > 0 ? flame : coals > 0.05 ? -coals : 0;
    gx.fireParticles(FX, FY, lvl, 1.6, 0);
    if (!food || done) return;
    const h = this.heatAt();
    if (food.key === 'water') {
      temp += (h * 45 - (temp - 20) * 0.08) * dt;
      temp = clamp(temp, 20, 100);
      if (temp > 60 && Math.random() < dt * (temp - 55) / 3) emit({ x: FX + rand(-60, 60), y: ZONES[zone].y + 40, vy: -rand(20, 60), life: 0.6, size: temp > 97 ? 7 : 3, color: 'rgba(255,255,255,0.8)' });
      if (temp > 90 && Math.random() < dt * 4) emit({ x: FX + rand(-50, 50), y: ZONES[zone].y + 10, vx: rand(-10, 10), vy: -rand(40, 80), life: 1.5, size: 8, grow: 14, color: 'rgba(240,240,240,0.4)', fadeIn: true });
      if (temp >= 99) { boilHold += dt; if (Math.random() < dt * 2) audio.sfx('boil'); } else boilHold = Math.max(0, boilHold - dt);
      return;
    }
    sides[side] += food.F.rate * h * dt * 12;
    const other = sides.length > 1 ? 1 - side : -1;
    if (other >= 0) sides[other] += food.F.rate * h * dt * 1.5;
    sizzleT -= dt;
    if (h > 0.2 && sizzleT <= 0) { sizzleT = 0.8; audio.sfx('sizzle', { dur: 0.9 }); }
    if (Math.max(...sides) > 70 && Math.random() < dt * 6) emit({ x: FX + rand(-40, 40), y: ZONES[zone].y + 20, vx: rand(-10, 10), vy: -rand(40, 80), life: 2, size: 8, grow: 16, color: Math.max(...sides) > 85 ? 'rgba(60,60,60,0.6)' : 'rgba(240,240,240,0.4)', fadeIn: true });
  },
  onDown(x, y) { if (food && Math.abs(x - FX) < 200 && y < 640) dragging = true; },
  onMove(x, y) { if (dragging) { let best = 0; ZONES.forEach((z, i) => { if (Math.abs(y - z.y) < Math.abs(y - ZONES[best].y)) best = i; }); if (best !== zone) { zone = best; audio.sfx('tap'); } } },
  onUp() { dragging = false; },
  onTap(x, y) { if (food && Math.abs(x - FX) < 200 && y < 640) { ZONES.forEach((z, i) => { if (Math.abs(y - z.y) < 50) zone = i; }); } },
  finish() {
    if (!food || done) return;
    done = true;
    const raw = sides.some(v => v < 40), burnt = sides.some(v => v > 75);
    const F = food.F;
    let res;
    if (raw) {
      res = 'raw'; eat(F.fill * 0.6, 0);
      if (!F.treat && chance(0.5)) { t.ail.tummy = 2; }
      toast(`${F.e} 😬 Too raw!`); audio.sfx('bad'); lesson('🍗❌', LESSONS.raw); perf(false);
    } else if (burnt) {
      res = 'burnt'; eat(F.fill * 0.5, -3);
      toast(`${F.e} 🖤 Burnt!`); audio.sfx('bad'); lesson('🔥⬇️', LESSONS.burnt); perf(false);
    } else {
      res = 'good'; eat(F.fill, F.treat ? 12 : 6);
      toast(`${F.e} 😋 Perfect!`); audio.sfx('success'); perf(true);
      burst(FX, ZONES[zone].y, 20, { color: ['#ffd166', '#fff'], size: 4, life: 0.8 });
      addXP('cooking', F.treat ? 3 : 8);
    }
    if (!F.treat) { t.flags.cooked = true; count('meals'); t.sc.mealsEaten++; t.camp.dirty = (t.camp.dirty || 0) + 1; if (res !== 'good') addXP('cooking', 2); }
    if (food.key === 'fish') t.flags.cookedFish = true;
    audio.sfx('eat');
    passTime(0.4, 'work');
    setTimeout(() => { food = null; this.renderTray(); }, 1100);
  },
  finishBoil() {
    if (done) return; done = true;
    if (boilHold >= 2.5) {
      t.water = t.water.map(u => u === 'raw' ? 'safe' : u);
      toast('🫧✅ Safe to drink!'); audio.sfx('success');
      count('waterSafe'); addXP('camping', 3); addXP('cooking', 2); t.flags.treat_water = true; perf(true);
    } else { toast(temp > 90 ? '🫧⏳ Keep it boiling longer' : '🫧❌ Not boiling yet'); audio.sfx('bad'); lesson('🫧', 'Water must reach a full rolling boil.'); perf(false); }
    passTime(0.4, 'work');
    setTimeout(() => this.leave(), 900);
  },
  leave() {
    if (food && !done && food.key !== 'water') { // put food back
      if (food.key === 'fish') t.fish.push(food.species); else if (food.key === 'marshmallow') t.marsh++; else t.meals[food.key]++;
    }
    go('camp');
  },
  draw(c) {
    const h = t.hour, wk = wxKey(t);
    gx.drawSky(c, env, h, wk); gx.drawRanges(c, env, h, wk); gx.drawGround(c, env, h);
    gx.drawClearing(c, FX, FY + 20, 600, 200);
    gx.drawFireRing(c, FX, FY, 2.2);
    gx.drawLogs(c, FX, FY, 2, 3, 0.5);
    const lvl = flame > 0 ? flame * (1 + surge * 0.6) : coals > 0.05 ? -coals : 0;
    gx.drawFlames(c, FX, FY - 8, lvl, 2);
    // coals glow
    if (coals > 0.1) gx.drawFlames(c, FX, FY + 4, -coals, 2.4);
    // grill / tripod
    const zy = ZONES[zone].y;
    if (t.camp.built.tripod) {
      c.strokeStyle = '#6d4c33'; c.lineWidth = 10; c.beginPath(); c.moveTo(FX - 240, FY + 20); c.lineTo(FX, 120); c.lineTo(FX + 240, FY + 20); c.stroke();
      c.strokeStyle = '#999'; c.lineWidth = 3; c.beginPath(); c.moveTo(FX, 120); c.lineTo(FX, zy); c.stroke();
    }
    // zone guides
    ZONES.forEach((z, i) => { c.globalAlpha = i === zone ? 0.9 : 0.35; emo(c, ['🌡️', '🌡️🌡️', '🌡️🌡️🌡️'][i], FX - 300, z.y + 20, 26); c.globalAlpha = 1; });
    if (food) {
      if (food.key === 'water' || food.F.pot) {
        c.fillStyle = '#3d3d3d'; rr(c, FX - 110, zy, 220, 90, 20); c.fill();
        c.fillStyle = '#555'; c.fillRect(FX - 125, zy, 250, 14);
        if (food.key === 'water') { c.fillStyle = temp > 95 ? '#9fd4ff' : '#7fbfe8'; c.beginPath(); c.ellipse(FX, zy + 8, 100, 12, 0, 0, 7); c.fill(); }
        else emo(c, food.F.e, FX, zy - 10, 70);
      } else {
        c.strokeStyle = '#444'; c.lineWidth = 5;
        for (let i = -3; i <= 3; i++) { c.beginPath(); c.moveTo(FX + i * 30, zy + 40); c.lineTo(FX + i * 30 + 10, zy + 60); c.stroke(); }
        c.beginPath(); c.moveTo(FX - 120, zy + 50); c.lineTo(FX + 120, zy + 50); c.stroke();
        if (food.key === 'fish') {
          const col = FISH[food.species] ? FISH[food.species].col : ['#888', '#ccc'];
          const cook = Math.max(...sides) / 100;
          gx.drawFish(c, FX, zy + 30, 170, [shadeFood(col[0], cook), shadeFood(col[1], cook)], 0, 0);
        } else emo(c, food.F.e, FX, zy + 20, 80, { rot: side ? Math.PI : 0 });
        const burnt = Math.max(...sides);
        if (burnt > 75) { c.fillStyle = `rgba(20,10,5,${Math.min(0.6, (burnt - 75) / 40)})`; c.beginPath(); c.ellipse(FX, zy + 22, 60, 30, 0, 0, 7); c.fill(); }
      }
      drawMeter(c, sides, side, food.key === 'water' ? temp : null, boilHold);
    }
    drawParticles(c);
    const dk = Math.max(0, (h > 19 ? (h - 19) / 3 : h < 6 ? 0.7 : 0)) * 0.7;
    if (dk > 0) gx.lighting(c, dk, [{ x: FX, y: FY - 80, r: 600, col: 'rgba(255,150,60,0.9)' }]);
  },
};
SC.cook = Cook;

function shadeFood(col, k) { return k < 0.4 ? col : k < 0.75 ? '#c98a3d' : '#3a2616'; }
function drawMeter(c, sides, active, temp, hold) {
  const x = 1060, w = 420, y0 = 150;
  if (temp !== null) {
    c.fillStyle = 'rgba(255,248,232,0.92)'; rr(c, x - 20, y0 - 50, w + 40, 130, 20); c.fill();
    const g = c.createLinearGradient(x, 0, x + w, 0); g.addColorStop(0, '#6fb7ff'); g.addColorStop(0.7, '#ffb36b'); g.addColorStop(1, '#ff5e3a');
    c.fillStyle = g; rr(c, x, y0, w, 30, 15); c.fill();
    const px = x + (temp - 20) / 80 * w;
    c.fillStyle = '#2d2a26'; c.beginPath(); c.moveTo(px, y0 - 6); c.lineTo(px - 10, y0 - 22); c.lineTo(px + 10, y0 - 22); c.fill();
    emo(c, '❄️', x, y0 + 55, 24); emo(c, '🫧', x + w * 0.75, y0 + 55, 24); emo(c, '🫧🫧', x + w, y0 + 55, 24);
    if (hold > 0) { c.strokeStyle = '#36b37e'; c.lineWidth = 8; c.beginPath(); c.arc(x + w + 50, y0 + 15, 26, -Math.PI / 2, -Math.PI / 2 + Math.min(1, hold / 2.5) * 6.283); c.stroke(); }
    return;
  }
  c.fillStyle = 'rgba(255,248,232,0.92)'; rr(c, x - 20, y0 - 50, w + 40, 60 + sides.length * 50, 20); c.fill();
  c.font = 'bold 20px system-ui,sans-serif'; c.textAlign = 'center'; c.fillStyle = '#2d2a26';
  c.fillText('RAW', x + w * 0.2, y0 - 18); c.fillText('SAFE', x + w * 0.575, y0 - 18); c.fillText('BURNT', x + w * 0.875, y0 - 18);
  sides.forEach((v, i) => {
    const y = y0 + i * 50;
    c.fillStyle = '#f4a7a7'; c.fillRect(x, y, w * 0.4, 30);
    c.fillStyle = '#8ad39a'; c.fillRect(x + w * 0.4, y, w * 0.35, 30);
    c.fillStyle = '#4a3a32'; c.fillRect(x + w * 0.75, y, w * 0.25, 30);
    const px = x + clamp(v, 0, 100) / 100 * w;
    c.fillStyle = i === active ? '#ffc93c' : '#fff'; c.strokeStyle = '#2d2a26'; c.lineWidth = 3;
    c.beginPath(); c.arc(px, y + 15, 14, 0, 7); c.fill(); c.stroke();
    if (sides.length > 1) emo(c, i === active ? '👇' : '·', x - 40, y + 15, 22);
  });
}
