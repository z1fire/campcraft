// Engineering challenges: tarp shelter, wood rack, cooking tripod, food hang, creek bridge.
import { G, W, H, emo, emit, burst, drawParticles, rand, dist, clamp, rr, chance } from './engine.js';
import { audio } from './audio.js';
import { S, addXP, count, hintLevel, perf, cosmetic } from './save.js';
import { T, def, has, passTime, wxKey } from './sim.js';
import * as gx from './gfx.js';
import { el, btn, root, toast, banner, lesson } from './ui.js';
import { SC, go } from './nav.js';

let t, kind, env, st, hl, handles, dragH, drops, test, result, parts, slots, stepI, rope, bag, spans, walker, retAfter;

const GROUND = 780;
const Build = {
  enter(arg) {
    t = T(); kind = arg.kind; hl = hintLevel(def().expert);
    env = gx.makeEnv(def().biome, 61, { horizon: 300 });
    test = null; result = null; drops = []; dragH = null; stepI = 0;
    retAfter = kind === 'bridge' ? 'explore' : 'camp';
    const u = root();
    btn('⬅', () => go(retAfter), 'round back-btn', u);
    this.side = el('div', 'side-right', '', u);
    this['init_' + kind]();
    audio.setAmbience({ birds: 0.6, wind: 0.3, water: kind === 'bridge' ? 1.2 : 0 });
  },
  back() { go(retAfter); },
  succeed(msg, lessonText) {
    result = 'ok'; audio.sfx('success');
    burst(800, 400, 30, { color: ['#ffd166', '#7bed9f', '#fff', '#9ecbff'], size: 5, life: 1.2, g: 200 });
    toast(`✅ ${msg}`);
    if (lessonText) setTimeout(() => lesson('🔨', lessonText), 700);
    count('builds'); addXP('engineering', 14); perf(true);
    passTime(0.75, 'work');
    this.side.innerHTML = '';
    btn('<span class="big">✅</span><small>Done</small>', () => go(retAfter), 'go', this.side);
  },
  fail(msg, lessonText) {
    result = 'bad'; audio.sfx('bad'); toast(`❌ ${msg}`); perf(false);
    if (lessonText) setTimeout(() => lesson('🤔', lessonText), 600);
    setTimeout(() => { result = null; test = null; this.renderSide && this.renderSide(); }, 2200);
  },

  // ============ TARP SHELTER ============
  init_shelter() {
    handles = [{ x: 500, y: 560 }, { x: 800, y: 600 }, { x: 1100, y: 560 }];
    banner('↕️ Drag the dots, then test with rain', 'Shape the tarp, then test');
    this.renderSide = () => { this.side.innerHTML = ''; btn('<span class="big">🌧️</span><small>Test</small>', () => this.testShelter(), 'blue', this.side); };
    this.renderSide();
  },
  testShelter() {
    if (test) return;
    const [L, M, R] = handles;
    test = { t: 0 }; drops = [];
    audio.sfx('thunder');
    const sl = (L.y - M.y) / 300, sr = (R.y - M.y) / 300;
    const ridge = sl > 0.25 && sr > 0.25, head = M.y < 560, cover = L.y > 420 && R.y > 420 && L.y < GROUND - 20 && R.y < GROUND - 20;
    test.res = ridge && head && cover ? 'ok' : !ridge ? 'pool' : !head ? 'head' : 'cover';
    setTimeout(() => {
      if (test.res === 'ok') { t.camp.built.shelter = true; this.succeed('Water runs off!', 'Slanted roofs shed rain.'); }
      else if (test.res === 'pool') this.fail('Water pools on top', 'Make a peak so water runs off: /\\');
      else if (test.res === 'head') this.fail('Too low to fit under', 'Raise the middle higher.');
      else this.fail('Rain blows in the sides', 'Bring the edges lower.');
    }, 3000);
  },
  draw_shelter(c) {
    const [L, M, R] = handles;
    // trees
    c.fillStyle = '#6d4c33'; c.fillRect(420, 180, 40, GROUND - 180); c.fillRect(1140, 180, 40, GROUND - 180);
    gx.drawOak(c, 440, 300, 380, 0); gx.drawOak(c, 1160, 300, 380, 0);
    c.strokeStyle = '#d9c9a3'; c.lineWidth = 3; c.beginPath(); c.moveTo(460, M.y - 10); c.lineTo(M.x, M.y); c.lineTo(1140, M.y - 10); c.stroke();
    gx.drawCamper(c, 800, GROUND, { look: S.look, wear: t.wear, pose: test && test.res === 'head' ? 'shiver' : 'idle', s: 1.25, wet: test && test.t > 1 && test.res !== 'ok' });
    // tarp (with sag if pooling)
    const sag = test && test.res === 'pool' ? Math.min(60, test.t * 25) : 0;
    c.fillStyle = '#2f7fc1'; c.strokeStyle = '#1f5f96'; c.lineWidth = 10; c.lineJoin = 'round';
    c.beginPath(); c.moveTo(L.x, L.y); c.lineTo(M.x, M.y + sag); c.lineTo(R.x, R.y); c.stroke();
    // guy ropes to ground
    c.strokeStyle = '#d9c9a3'; c.lineWidth = 2; c.beginPath(); c.moveTo(L.x, L.y); c.lineTo(L.x - 80, GROUND); c.moveTo(R.x, R.y); c.lineTo(R.x + 80, GROUND); c.stroke();
    if (sag) { c.fillStyle = 'rgba(120,180,240,0.8)'; c.beginPath(); c.ellipse(M.x, M.y + sag - 8, sag * 1.4, sag * 0.3, 0, 0, 7); c.fill(); }
    if (!test) handles.forEach(h => { c.fillStyle = '#ffc93c'; c.beginPath(); c.arc(h.x, h.y, 22, 0, 7); c.fill(); c.strokeStyle = '#fff'; c.lineWidth = 4; c.stroke(); emo(c, '↕️', h.x, h.y, 22); });
    if (hl >= 2 && !test) { c.fillStyle = 'rgba(255,248,232,0.9)'; rr(c, 60, 120, 260, 120, 16); c.fill(); c.strokeStyle = '#e0533d'; c.lineWidth = 5; c.beginPath(); c.moveTo(90, 150); c.lineTo(130, 190); c.lineTo(170, 190); c.lineTo(210, 150); c.stroke(); emo(c, '❌', 110, 215, 22); c.strokeStyle = '#36b37e'; c.beginPath(); c.moveTo(230, 200); c.lineTo(265, 145); c.lineTo(300, 200); c.stroke(); emo(c, '✅', 265, 215, 22); }
    if (test) {
      test.t += G.dt;
      if (Math.random() < 0.9) drops.push({ x: rand(380, 1220), y: 80, vx: test.res === 'cover' ? 120 : 0, vy: 600, on: null });
      for (const d of drops) {
        if (d.on === null) {
          d.x += d.vx * G.dt; d.y += d.vy * G.dt;
          if (d.x > L.x && d.x < R.x) {
            const seg = d.x < M.x ? [L, M] : [M, R];
            const ty = seg[0].y + (seg[1].y - seg[0].y) * (d.x - seg[0].x) / (seg[1].x - seg[0].x) + (d.x < M.x ? sag * (d.x - L.x) / 300 : sag * (R.x - d.x) / 300);
            if (d.y >= ty && d.vx === 0) { d.y = ty; d.on = d.x < M.x ? (M.y < L.y ? -1 : 1) : (M.y < R.y ? 1 : -1); }
          }
        } else {
          const dir = test.res === 'ok' ? d.on : (d.x < M.x ? 1 : -1);
          d.x += dir * 140 * G.dt;
          const seg = d.x < M.x ? [L, M] : [M, R];
          d.y = seg[0].y + (seg[1].y - seg[0].y) * (d.x - seg[0].x) / (seg[1].x - seg[0].x);
          if (d.x < L.x || d.x > R.x) { d.on = null; d.vy = 400; d.vx = 0; }
          if (Math.abs(d.x - M.x) < 6 && test.res !== 'ok') d.dead = true;
        }
      }
      drops = drops.filter(d => d.y < GROUND && !d.dead);
      c.strokeStyle = 'rgba(160,200,255,0.9)'; c.lineWidth = 2; c.beginPath();
      for (const d of drops) { c.moveTo(d.x, d.y); c.lineTo(d.x - d.vx * 0.02, d.y - 12); } c.stroke();
    }
  },

  // ============ ASSEMBLY (rack / tripod) ============
  init_rack() {
    slots = [
      { a: [680, GROUND], b: [680, GROUND - 120], e: '🪵', n: 'post' }, { a: [920, GROUND], b: [920, GROUND - 120], e: '🪵', n: 'post' },
      { a: [640, GROUND - 105], b: [960, GROUND - 105], e: '🪵', n: 'bar' }, { a: [640, GROUND - 55], b: [960, GROUND - 55], e: '🪵', n: 'bar' },
      { knot: [680, GROUND - 105] }, { knot: [920, GROUND - 105] },
    ];
    banner('👆 Tap parts to build a wood rack', 'Build a wood rack');
    this.renderSide = () => { this.side.innerHTML = ''; };
  },
  init_tripod() {
    slots = [
      { a: [620, GROUND], b: [800, 300], n: 'pole' }, { a: [980, GROUND], b: [800, 300], n: 'pole' }, { a: [820, GROUND - 60], b: [800, 300], n: 'pole', back: true },
      { knot: [800, 310] }, { pot: [800, 560] },
    ];
    banner('👆 Tap parts to build a tripod', 'Build a cooking tripod');
    this.renderSide = () => { this.side.innerHTML = ''; if (stepI === 2) btn('<span class="big">🧪</span><small>Test</small>', () => this.testTripod(), 'blue', this.side); };
  },
  testTripod() {
    if (stepI === 2) { test = { fall: 0 }; audio.sfx('creak'); this.fail('Two legs tip over!', 'Three legs make it stable.'); setTimeout(() => { test = null; }, 2000); }
  },
  placeNext() {
    const s = slots[stepI]; if (!s) return;
    if (s.knot && !has('rope')) { toast('🪢❌'); return; }
    audio.sfx(s.knot ? 'zip' : s.pot ? 'thunk' : 'hammer');
    burst(s.knot ? s.knot[0] : s.pot ? s.pot[0] : s.b[0], s.knot ? s.knot[1] : s.pot ? s.pot[1] : s.b[1], 8, { color: '#d9c9a3', size: 3, life: 0.5 });
    stepI++;
    this.renderSide();
    if (stepI >= slots.length) {
      if (kind === 'rack') { t.camp.built.rack = true; this.succeed('Wood stays off wet ground!', 'Air under wood keeps it dry.'); }
      else { t.camp.built.tripod = true; this.succeed('Pot hangs over the fire!', 'Triangles make strong shapes.'); }
    } else if (kind === 'tripod' && stepI === 2 && hl >= 1) toast('🧪❓ Test it?');
  },
  draw_assembly(c) {
    if (kind === 'rack') { c.fillStyle = 'rgba(90,70,50,0.5)'; c.beginPath(); c.ellipse(800, GROUND + 5, 260, 30, 0, 0, 7); c.fill(); emo(c, '💧', 560, GROUND - 10, 30); emo(c, '💧', 1040, GROUND, 26); }
    if (kind === 'tripod') { gx.drawFireRing(c, 800, GROUND, 1.6); gx.drawFlames(c, 800, GROUND - 6, 0.5, 1.4); }
    const fall = test && test.fall !== undefined;
    slots.forEach((s, i) => {
      const placed = i < stepI, next = i === stepI;
      c.globalAlpha = placed ? 1 : next ? 0.35 + 0.25 * Math.sin(G.t * 5) : 0.12;
      if (s.a) {
        c.save(); if (fall && placed) { c.translate(800, GROUND); c.rotate(Math.min(1.3, (G.t % 3) * 1.2)); c.translate(-800, -GROUND); }
        c.strokeStyle = '#7a5230'; c.lineWidth = 16; c.lineCap = 'round'; c.beginPath(); c.moveTo(...s.a); c.lineTo(...s.b); c.stroke();
        c.strokeStyle = '#a8743f'; c.lineWidth = 5; c.beginPath(); c.moveTo(...s.a); c.lineTo(...s.b); c.stroke(); c.restore();
      }
      if (s.knot) { c.strokeStyle = '#e6d8b8'; c.lineWidth = 6; c.beginPath(); c.arc(s.knot[0], s.knot[1], 16, 0, 7); c.stroke(); }
      if (s.pot) { c.strokeStyle = '#999'; c.lineWidth = 3; c.beginPath(); c.moveTo(800, 310); c.lineTo(800, s.pot[1]); c.stroke(); c.fillStyle = '#3d3d3d'; rr(c, s.pot[0] - 50, s.pot[1], 100, 70, 16); c.fill(); }
      c.globalAlpha = 1;
    });
    if (kind === 'rack' && stepI >= slots.length) gx.drawWoodpile(c, 800, GROUND - 60, 1.3, 7, false);
    // tray
    const s = slots[stepI];
    if (s && !result) {
      c.fillStyle = 'rgba(110,70,35,0.85)'; rr(c, 90, 700, 220, 140, 24); c.fill();
      emo(c, s.knot ? '🪢' : s.pot ? '🍲' : '🪵', 200, 770, 70);
      if (hl >= 1) { const k = (G.t % 1.4) / 1.4; const tx = s.knot ? s.knot[0] : s.pot ? s.pot[0] : (s.a[0] + s.b[0]) / 2, ty = s.knot ? s.knot[1] : s.pot ? s.pot[1] : (s.a[1] + s.b[1]) / 2; c.globalAlpha = 1 - k; emo(c, '👆', 200 + (tx - 200) * k, 770 + (ty - 770) * k, 44); c.globalAlpha = 1; }
    }
  },

  // ============ FOOD HANG ============
  init_hang() {
    st = 'throw'; rope = { power: 0, dir: 1, holding: false, fly: null, over: false }; bag = { y: GROUND - 30, x: 1020 };
    banner('🪢 Hold, then let go to throw over the branch', 'Throw the rope over the branch');
    this.renderSide = () => { this.side.innerHTML = ''; if (st === 'hoist') btn('<span class="big">🦝</span><small>Test</small>', () => this.testHang(), 'blue', this.side); };
  },
  testHang() {
    if (test) return;
    const high = bag.y < 440, far = bag.x - 560 > 300;
    test = { t: 0, ok: high && far };
    audio.sfx('chitter');
    setTimeout(() => {
      if (test.ok) { t.camp.built.hang = true; this.succeed('Raccoon cannot reach!', 'Hang food high and far from the trunk.'); }
      else this.fail(!high ? 'Too low — raccoon grabbed it!' : 'Too close to the trunk!', !high ? 'Pull the bag up higher.' : 'Throw farther out on the branch.');
    }, 2600);
  },
  draw_hang(c) {
    // tree with long branch
    c.fillStyle = '#6d4c33'; c.fillRect(530, 150, 60, GROUND - 150);
    c.strokeStyle = '#6d4c33'; c.lineWidth = 26; c.lineCap = 'round'; c.beginPath(); c.moveTo(580, 280); c.quadraticCurveTo(900, 250, 1250, 270); c.stroke();
    gx.drawOak(c, 560, 260, 360, 0);
    c.fillStyle = 'rgba(0,0,0,0.12)'; c.fillRect(560, 420, 0, 0);
    emo(c, '📏', 1330, 440, 30); c.strokeStyle = 'rgba(255,255,255,0.5)'; c.setLineDash([10, 10]); c.lineWidth = 3; c.beginPath(); c.moveTo(620, 440); c.lineTo(1300, 440); c.stroke(); c.setLineDash([]);
    gx.drawCamper(c, 1350, GROUND, { look: S.look, wear: t.wear, pose: st === 'throw' ? 'hold' : 'idle', s: 1.1, face: -1 });
    if (st === 'throw') {
      if (rope.fly) {
        const f = rope.fly; f.k += G.dt * 1.4;
        const x = 1310 - f.dist * f.k, y = 620 - Math.sin(f.k * Math.PI) * f.h;
        emo(c, '🪢', x, y, 30);
        if (f.k >= 1) {
          rope.fly = null;
          const bx = 1310 - f.dist;
          if (bx > 620 && bx < 1240) { st = 'hoist'; bag.x = bx; audio.sfx('ok'); banner('⬆️ Drag the bag up high', 'Pull the bag up'); this.renderSide(); }
          else { audio.sfx('bad'); toast(bx >= 1240 ? '🪢⬇️ Too short' : '🪢⬆️ Too far'); }
        }
      }
      c.fillStyle = 'rgba(255,248,232,0.9)'; rr(c, 1180, 150, 60, 300, 30); c.fill();
      c.fillStyle = '#ffb36b'; const ph = 280 * rope.power; rr(c, 1190, 440 - ph, 40, ph, 18); c.fill();
      c.fillStyle = 'rgba(54,179,126,0.45)'; c.fillRect(1190, 440 - 280 * 0.37, 40, 280 * 0.27);
      if (rope.holding) { rope.power += rope.dir * G.dt * 0.9; if (rope.power > 1 || rope.power < 0) rope.dir *= -1; rope.power = clamp(rope.power, 0, 1); }
    }
    if (st === 'hoist') {
      c.strokeStyle = '#e6d8b8'; c.lineWidth = 3; c.beginPath(); c.moveTo(bag.x, 262); c.lineTo(bag.x, bag.y - 40); c.moveTo(bag.x, 262); c.lineTo(1330, 700); c.stroke();
      let by = bag.y;
      if (test && !test.ok) { test.t += G.dt; }
      gx.drawBag(c, bag.x, by, 1, '#b5651d');
      if (!test) { c.fillStyle = '#ffc93c'; c.beginPath(); c.arc(bag.x, by - 20, 16, 0, 7); c.fill(); emo(c, '↕️', bag.x + 40, by - 20, 26); }
    }
    if (test) {
      test.t += G.dt;
      const k = Math.min(1, test.t / 1.5);
      const rx = 600 + k * 300, ry = GROUND - 20 - (test.ok ? Math.sin(test.t * 6) * 20 : Math.min(1, test.t / 1.5) * (GROUND - 20 - bag.y));
      emo(c, '🦝', test.ok ? rx : bag.x - 30, test.ok ? GROUND - 30 - Math.abs(Math.sin(test.t * 8)) * 30 : ry, 60, { flip: true });
      if (test.ok && test.t > 1.5) emo(c, '❓', rx, GROUND - 110, 30);
    }
  },

  // ============ BRIDGE ============
  init_bridge() {
    spans = [{ m: null, tied: false }, { m: null, tied: false }];
    st = 'build'; walker = null;
    banner('🪵 Fill each gap, tie with 🪢, then test', 'Build a bridge');
    this.renderSide = () => {
      this.side.innerHTML = '';
      const mat = (m, e, lbl) => btn(`<span class="big">${e}</span><small>${lbl}</small>`, () => this.bridgePlace(m), '', this.side);
      mat('thin', '🥢', 'Sticks'); mat('log', '🪵', 'Log');
      if (has('rope')) mat('rope', '🪢', 'Tie');
      btn('<span class="big">🚶</span><small>Test</small>', () => this.testBridge(), 'blue', this.side);
    };
    this.renderSide();
  },
  bridgePlace(m) {
    if (walker) return;
    if (m === 'rope') { const s = spans.find(s2 => s2.m && !s2.tied); if (!s) { toast('🪢❓'); return; } s.tied = true; audio.sfx('zip'); return; }
    const s = spans.find(s2 => !s2.m) || spans[0];
    s.m = m; s.tied = false; audio.sfx('thunk');
  },
  testBridge() {
    if (walker || spans.some(s => !s.m)) { toast('🌊❓ Fill both gaps'); return; }
    walker = { x: 380, t: 0, fell: false };
    audio.sfx('step');
  },
  draw_bridge(c) {
    const wy = 640;
    gx.drawRiver(c, [[800, 380], [800, 900]], 520, t.hour, wxKey(t), 0);
    c.fillStyle = '#8a6a48'; c.beginPath(); c.moveTo(G.view.x0, 560); c.lineTo(530, 560); c.lineTo(560, 900); c.lineTo(G.view.x0, 900); c.fill();
    c.beginPath(); c.moveTo(G.view.x1, 560); c.lineTo(1070, 560); c.lineTo(1040, 900); c.lineTo(G.view.x1, 900); c.fill();
    gx.drawRock(c, 800, 600, 50);
    spans.forEach((s, i) => {
      const x0 = i ? 800 : 520, x1 = i ? 1080 : 800;
      if (!s.m) { c.strokeStyle = `rgba(255,201,60,${0.5 + 0.4 * Math.sin(G.t * 5)})`; c.setLineDash([12, 10]); c.lineWidth = 5; c.strokeRect(x0 + 10, 540, x1 - x0 - 20, 30); c.setLineDash([]); return; }
      if (s.broken) return;
      const wob = !s.tied && walker && walker.x > x0 && walker.x < x1 ? Math.sin(G.t * 20) * 4 : 0;
      c.save(); c.translate(0, wob);
      if (s.m === 'thin') { c.strokeStyle = '#a8743f'; c.lineWidth = 6; for (let k = 0; k < 3; k++) { c.beginPath(); c.moveTo(x0, 548 + k * 8); c.lineTo(x1, 548 + k * 8); c.stroke(); } }
      else { c.fillStyle = '#7a5230'; rr(c, x0 - 10, 538, x1 - x0 + 20, 34, 16); c.fill(); c.fillStyle = '#a8743f'; c.fillRect(x0, 542, x1 - x0, 8); }
      if (s.tied) { c.strokeStyle = '#e6d8b8'; c.lineWidth = 4; for (const x of [x0 + 12, x1 - 12]) { c.beginPath(); c.moveTo(x - 8, 536); c.lineTo(x + 8, 576); c.moveTo(x + 8, 536); c.lineTo(x - 8, 576); c.stroke(); } }
      c.restore();
    });
    if (walker) {
      walker.t += G.dt;
      if (!walker.fell) {
        walker.x += 150 * G.dt;
        const i = walker.x < 800 ? 0 : 1, s = spans[i];
        if (walker.x > (i ? 850 : 570)) {
          if (s.m === 'thin') { s.broken = true; walker.fell = true; audio.sfx('snap'); setTimeout(() => audio.sfx('splash'), 300); this.fail('Sticks snapped! Splash!', 'Thicker logs hold more weight.'); setTimeout(() => { s.broken = false; walker = null; }, 2200); }
          else if (!s.tied && walker.x > (i ? 900 : 650)) { walker.fell = true; audio.sfx('splash'); this.fail('The log rolled!', 'Tie logs so they cannot roll.'); setTimeout(() => { walker = null; }, 2200); }
        }
        if (walker && walker.x > 1150 && !walker.fell) { walker.done = true; t.flags.bridge = true; this.succeed('You crossed the creek!', 'Strong, tied logs make a safe bridge.'); walker.fell = true; }
      }
      if (walker) {
        const y = walker.fell && !walker.done ? Math.min(760, 540 + walker.t * 200) : 545;
        gx.drawCamper(c, walker.x, y, { look: S.look, wear: t.wear, pose: walker.fell && !walker.done ? 'shiver' : 'walk', s: 1 });
        if (walker.fell && !walker.done) emo(c, '💦', walker.x, 700, 50);
      }
    } else gx.drawCamper(c, 380, 560, { look: S.look, wear: t.wear, pose: 'idle', s: 1 });
  },

  // ============ shared ============
  onDown(x, y) {
    if (kind === 'shelter' && !test) handles.forEach((h, i) => { if (dist(x, y, h.x, h.y) < 60) dragH = i; });
    if (kind === 'hang' && st === 'throw' && !rope.fly) { rope.holding = true; rope.power = 0; rope.dir = 1; }
    if (kind === 'hang' && st === 'hoist' && !test && dist(x, y, bag.x, bag.y - 20) < 90) dragH = 'bag';
  },
  onMove(x, y) {
    if (kind === 'shelter' && dragH !== null && dragH !== undefined) handles[dragH].y = clamp(y, 200, GROUND - 10);
    if (dragH === 'bag') bag.y = clamp(y + 20, 330, GROUND - 30);
  },
  onUp() {
    dragH = null;
    if (kind === 'hang' && rope && rope.holding) {
      rope.holding = false;
      rope.fly = { k: 0, dist: 150 + rope.power * 700, h: 470 };
      audio.sfx('swoosh');
    }
  },
  onTap(x, y) {
    if ((kind === 'rack' || kind === 'tripod') && !result) this.placeNext();
    if (kind === 'hang' && st === 'hoist' && !test && S.settings.simple) bag.y = Math.max(330, bag.y - 80);
  },
  draw(c) {
    const h = t.hour, wk = wxKey(t);
    gx.drawSky(c, env, h, wk); gx.drawRanges(c, env, h, wk); gx.drawGround(c, env, h);
    gx.drawTufts(c, env, 0.2, (x, y) => y < GROUND + 30 && y > GROUND - 60 && Math.abs(x - 800) < 500);
    if (kind === 'shelter') this.draw_shelter(c);
    else if (kind === 'rack' || kind === 'tripod') this.draw_assembly(c);
    else if (kind === 'hang') this.draw_hang(c);
    else if (kind === 'bridge') this.draw_bridge(c);
    drawParticles(c);
    const dk = h > 19.5 ? Math.min(0.5, (h - 19.5) / 3) : 0;
    if (dk > 0) gx.lighting(c, dk, [{ x: 800, y: 500, r: 700, k: 0.8 }]);
  },
};
SC.build = Build;
