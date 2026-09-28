// Fishing: choose bait and depth, cast, wait for the bobber, hook, reel without snapping the line.
import { G, W, H, emo, emit, burst, drawParticles, rand, dist, clamp, rr, chance, pick, weighted } from './engine.js';
import { audio } from './audio.js';
import { S, addXP, count, hintLevel, discover, perf } from './save.js';
import { FISH, BAITS, tripById } from './data.js';
import { T, def, passTime, wxKey, wx, timeTag, darkness, natureGood } from './sim.js';
import * as gx from './gfx.js';
import { el, btn, root, toast, banner, lesson, modal, closeModal } from './ui.js';
import { SC, go } from './nav.js';

const SURF = 470, SHORE = 420;
const DEPTHS = [{ y: 540, e: '⬆️', n: 'Shallow' }, { y: 650, e: '↕️', n: 'Middle' }, { y: 790, e: '⬇️', n: 'Deep' }];
let t, env, from, st, bait, depth, power, pdir, holding, bob, biteT, nibbles, hooked, tension, distLeft, slackT, swimmers, casts, rodTip, hl, winT, catchCard;

const Fish = {
  enter(arg = {}) {
    t = T(); from = arg.from || 'camp';
    hl = hintLevel(def().expert);
    env = gx.makeEnv('lake', 51, { horizon: 300 });
    gx.scatterTrees(env, 18, { x0: 300, x1: 2100, y0: 300, y1: 320 }, []);
    bait = S.lastBait || 'worm'; depth = 0; casts = 0; catchCard = null;
    swimmers = [];
    const pool = def().fishPool || ['bluegill'];
    for (let i = 0; i < 7; i++) { const sp = pick(pool); const f = FISH[sp]; swimmers.push({ sp, x: rand(500, 1500), y: DEPTHS[f.depth].y + rand(-30, 30), v: rand(30, 60) * (chance(0.5) ? 1 : -1), l: 70 + f.len * 50 }); }
    rodTip = { x: 400, y: 250 };
    audio.setAmbience({ water: 1, birds: darkness(t.hour) < 0.3 ? 0.7 : 0, frogs: t.hour > 18 ? 1 : 0, night: darkness(t.hour) > 0.4 ? 1 : 0, wind: 0.2 });
    this.ui();
    this.reset();
  },
  back() { this.leave(); },
  ui() {
    const u = root(); u.innerHTML = '';
    btn('⬅', () => this.leave(), 'round back-btn', u);
    this.side = el('div', 'side-right', '', u);
    const mh = el('div', 'minihud', '', u);
    this.tray = el('div', 'tray', '', mh);
    this.dtray = el('div', 'tray', '', mh);
  },
  renderTray() {
    this.tray.innerHTML = ''; this.dtray.innerHTML = '';
    for (const [k, b] of Object.entries(BAITS)) btn(`<span class="big">${b.e}</span><small>${b.n}</small>`, () => { bait = k; S.lastBait = k; this.renderTray(); }, bait === k ? 'sel' : '', this.tray);
    DEPTHS.forEach((d2, i) => btn(`<span class="big">${d2.e}</span><small>${d2.n}</small>`, () => { depth = i; this.renderTray(); }, depth === i ? 'sel' : '', this.dtray));
  },
  reset() {
    st = 'aim'; power = 0; pdir = 1; holding = false; bob = null; hooked = null; tension = 0; nibbles = 0; slackT = 0;
    this.renderTray();
    this.tray.style.display = this.dtray.style.display = '';
    banner('🎣 Hold to cast, let go!', 'Hold to cast');
  },
  onDown() { if (st === 'aim' && !catchCard) { holding = true; power = 0; pdir = 1; } if (st === 'reel') holding = true; },
  onUp() {
    if (st === 'aim' && holding) { holding = false; this.cast(); }
    if (st === 'reel') holding = false;
  },
  onTap() {
    if (st === 'wait') {
      if (bob.bite > 0) this.hook();
      else if (nibbles > 0) { toast('🐟💨 Too soon!'); audio.sfx('splash'); this.spook(); }
    }
  },
  cast() {
    const x = 520 + power * 950;
    st = 'fly'; casts++;
    audio.sfx('swoosh');
    bob = { x0: rodTip.x, y0: rodTip.y, x, y: SURF, k: 0, bite: 0, dip: 0 };
    this.tray.style.display = this.dtray.style.display = 'none';
    banner('👀 Watch the bobber…');
  },
  chooseFish() {
    const pool = def().fishPool || ['bluegill'], tag = timeTag(t.hour), cold = ['mountain', 'river', 'deepforest'].includes(def().biome);
    const w = {};
    for (const sp of pool) {
      const f = FISH[sp];
      let s = 0.3;
      if (f.bait.includes(bait)) s *= 3;
      if (f.depth === depth) s *= 3;
      if (f.time.includes(tag)) s *= 2;
      if (f.cold && cold) s *= 1.5;
      w[sp] = s;
    }
    const sp = weighted(w);
    return { sp, score: w[sp] };
  },
  hook() {
    st = 'reel'; tension = 30; distLeft = 100; slackT = 0; holding = false;
    audio.sfx('reel');
    banner('🎣 Hold to reel. Let go if the line is tight!', 'Hold to reel');
    burst(bob.x, SURF, 16, { color: '#cfe9ff', size: 4, g: 500, life: 0.6, up: 200 });
    audio.sfx('splash');
  },
  spook() { st = 'wait'; bob.bite = 0; nibbles = 0; biteT = rand(4, 8); },
  update(dt) {
    for (const s of swimmers) {
      if (hooked && s === hooked.sw) continue;
      s.x += s.v * dt; if (s.x < 480 || s.x > 1560) s.v *= -1;
      s.y += Math.sin(G.t + s.x * 0.01) * 0.3;
    }
    if (st === 'aim' && holding) { power += pdir * dt * 1.1; if (power > 1) { power = 1; pdir = -1; } if (power < 0) { power = 0; pdir = 1; } }
    if (st === 'fly') {
      bob.k += dt * 1.6;
      if (bob.k >= 1) {
        bob.k = 1; st = 'wait'; audio.sfx('plop');
        burst(bob.x, SURF, 10, { color: '#cfe9ff', size: 3, g: 300, life: 0.5, up: 120 });
        const f = this.chooseFish(); bob.fish = f;
        biteT = clamp(9 - f.score * 0.8, 2.5, 10) + rand(0, 2);
        nibbles = 0;
      }
    }
    if (st === 'wait') {
      biteT -= dt;
      bob.dip = Math.max(0, bob.dip - dt * 3);
      if (biteT < 2.2 && biteT > 0.5 && Math.random() < dt * 2) { nibbles++; bob.dip = 0.35; audio.sfx('plop'); }
      if (biteT <= 0 && bob.bite <= 0) { bob.bite = 1.0 + (hl >= 2 ? 0.6 : 0) + (S.settings.simple ? 0.6 : 0); bob.dip = 1; audio.sfx('splash'); if (hl >= 1) toast('❗ Tap now!'); }
      if (bob.bite > 0) { bob.bite -= dt; bob.dip = 1; if (bob.bite <= 0) { toast('🐟💨 Missed!'); perf(false); this.spook(); } }
    }
    if (st === 'reel') {
      const f = FISH[bob.fish.sp];
      const pull = f.fight * (0.6 + 0.8 * Math.max(0, Math.sin(G.t * 2.3) * Math.sin(G.t * 1.1 + 2)));
      if (holding) { tension += (38 + pull * 55) * dt; distLeft -= (14 + (1 - f.fight) * 10) * dt; if (Math.random() < dt * 8) audio.sfx('reel'); }
      else { tension -= 45 * dt; tension += pull * 12 * dt; distLeft += pull * 3 * dt; }
      if (S.settings.simple) tension = Math.min(tension, 85);
      tension = clamp(tension, 0, 120);
      if (tension < 8) slackT += dt; else slackT = 0;
      if (tension >= 100) { st = 'snap'; toast('💥 Line snapped!'); audio.sfx('snap'); lesson('🎣💥', 'Let go when the line gets tight.'); perf(false); setTimeout(() => this.reset(), 1400); }
      else if (slackT > 2.5) { toast('🐟💨 It got away!'); audio.sfx('splash'); perf(false); setTimeout(() => this.reset(), 900); st = 'lost'; }
      else if (distLeft <= 0) this.caught();
      bob.x = 520 + (bob.x - 520) * 0.999 - (holding ? 60 * dt : 0);
    }
  },
  caught() {
    st = 'caught';
    const sp = bob.fish.sp, f = FISH[sp];
    const size = Math.round((6 + f.len * 10) * rand(0.8, 1.3));
    audio.sfx('success'); audio.sfx('splash');
    const isNew = discover('fish', sp);
    t.flags.fish = true; count('fish'); addXP('fishing', isNew ? 12 : 6); perf(true);
    catchCard = { sp, size };
    const body = el('div', '', `<canvas width="360" height="160" style="width:100%;max-width:18rem;display:block;margin:auto"></canvas>
      <div class="tip"><b>${f.n}</b> · ${size} in</div>
      <div class="row c"><span class="pill">${DEPTHS[f.depth].e}</span><span class="pill">${f.bait.map(b => BAITS[b].e).join('')}</span><span class="pill">${f.time.map(x => ({ day: '☀️', dawnDusk: '🌅', night: '🌙' })[x]).join('')}</span></div>
      <div class="tip">${f.tip}</div>`);
    const cv = body.querySelector('canvas'), cx = cv.getContext('2d');
    const saved = G.t; cx.scale(1, 1);
    gx.drawFish(cx, 180, 80, 260, f.col, -0.1, 0);
    modal({
      title: isNew ? '📖✨ New fish!' : '🎣 Got one!', body, closeX: false, buttons: [
        { label: '🧺 Keep', cls: 'go', onClick: () => { t.fish.push(sp); toast('🧺🐟'); this.after(); } },
        { label: '🌊 Release', cls: 'blue', onClick: () => { natureGood(); toast('🐟💙 Bye fish!'); audio.sfx('splash'); this.after(); } },
      ],
    });
  },
  after() { catchCard = null; setTimeout(() => this.reset(), 300); },
  leave() {
    closeModal();
    if (casts) passTime(Math.min(2.5, casts * 0.3), 'rest');
    go(from === 'explore' ? 'explore' : 'camp');
  },
  draw(c) {
    const h = t.hour, wk = wxKey(t), v = G.view;
    gx.drawSky(c, env, h, wk); gx.drawClouds(c, env, wk, G.dt); gx.drawRanges(c, env, h, wk);
    // water
    const [top] = gx.skyCols(h, wk);
    const g = c.createLinearGradient(0, SURF, 0, v.y1);
    g.addColorStop(0, '#4a9cc6'); g.addColorStop(0.4, '#2d7aa6'); g.addColorStop(1, '#16466b');
    c.fillStyle = g; c.fillRect(v.x0, SURF - 10, v.x1 - v.x0, v.y1 - SURF + 10);
    c.fillStyle = 'rgba(255,255,255,0.08)';
    for (let i = 0; i < 5; i++) { const x = 600 + i * 220 + Math.sin(G.t * 0.5 + i) * 30; c.beginPath(); c.moveTo(x, SURF); c.lineTo(x + 60, SURF); c.lineTo(x + 160, v.y1); c.lineTo(x + 40, v.y1); c.fill(); }
    // weeds
    for (let i = 0; i < 14; i++) { const x = 460 + i * 80, sw = Math.sin(G.t + i) * 10; c.strokeStyle = '#2f6b3a'; c.lineWidth = 6; c.beginPath(); c.moveTo(x, v.y1); c.quadraticCurveTo(x + sw, 780, x + sw * 2, 700 + (i % 3) * 30); c.stroke(); }
    // swimmers
    for (const s of swimmers) { if (hooked && s === hooked.sw) continue; c.globalAlpha = 0.55; gx.drawFish(c, s.x, s.y, s.l, FISH[s.sp].col, s.v < 0 ? Math.PI : 0, 0.5); c.globalAlpha = 1; }
    // surface waves
    c.strokeStyle = 'rgba(255,255,255,0.5)'; c.lineWidth = 3; c.beginPath();
    for (let x = v.x0; x < v.x1; x += 20) c.lineTo(x, SURF + Math.sin(x * 0.03 + G.t * 2) * 3);
    c.stroke();
    // shore / dock
    if (from === 'camp' || true) {
      c.fillStyle = '#7a5a3a'; c.beginPath(); c.moveTo(v.x0, SHORE); c.lineTo(420, SHORE + 20); c.quadraticCurveTo(470, 500, 520, v.y1); c.lineTo(v.x0, v.y1); c.fill();
      c.fillStyle = env.b.grass[0]; c.beginPath(); c.moveTo(v.x0, SHORE - 10); c.lineTo(420, SHORE + 10); c.lineTo(430, SHORE + 30); c.lineTo(v.x0, SHORE + 30); c.fill();
      gx.reed(c, 430, SURF, 60); gx.reed(c, 452, SURF + 4, 48);
    }
    const cx = 300, cy = SHORE + 8;
    gx.drawCamper(c, cx, cy, { look: S.look, wear: t.wear, pose: st === 'caught' ? 'cheer' : 'fish', s: 1.3, face: 1 });
    rodTip = { x: cx + 70 * 1.3, y: cy - 140 * 1.3 };
    if (st === 'reel') { rodTip.x += 20; rodTip.y += 30 * (tension / 100); }
    // line + bobber
    if (bob) {
      const k = bob.k, bx = bob.x0 + (bob.x - bob.x0) * k, by = bob.y0 + (bob.y - bob.y0) * k - Math.sin(k * Math.PI) * 220;
      const bobY = st === 'fly' ? by : SURF + Math.sin(G.t * 3) * 3 + bob.dip * 22;
      const bxx = st === 'fly' ? bx : bob.x;
      c.strokeStyle = 'rgba(255,255,255,0.85)'; c.lineWidth = 1.6;
      c.beginPath(); c.moveTo(rodTip.x, rodTip.y);
      c.quadraticCurveTo((rodTip.x + bxx) / 2, (st === 'reel' ? Math.min(rodTip.y, bobY) : Math.max(rodTip.y, bobY)) + (st === 'reel' ? -tension * 0.2 : 60), bxx, bobY); c.stroke();
      if (st !== 'fly') {
        const hy = DEPTHS[depth].y;
        c.beginPath(); c.moveTo(bxx, bobY); c.lineTo(bxx, hy); c.stroke();
        emo(c, BAITS[bait].e, bxx, hy + 8, 22);
        if (st === 'reel') gx.drawFish(c, bxx + 30, hy + Math.sin(G.t * 12) * 10, 80 + FISH[bob.fish.sp].len * 50, FISH[bob.fish.sp].col, Math.PI + Math.sin(G.t * 10) * 0.3, 2);
      }
      c.fillStyle = '#e74c3c'; c.beginPath(); c.arc(bxx, bobY - 6, 11, Math.PI, 0); c.fill();
      c.fillStyle = '#fff'; c.beginPath(); c.arc(bxx, bobY - 6, 11, 0, Math.PI); c.fill();
      if (bob.bite > 0) { emo(c, '❗', bxx, bobY - 60, 44); }
    }
    // power meter
    if (st === 'aim') {
      c.fillStyle = 'rgba(255,248,232,0.9)'; rr(c, 560, 180, 420, 50, 25); c.fill();
      const gg = c.createLinearGradient(570, 0, 970, 0); gg.addColorStop(0, '#8ad39a'); gg.addColorStop(1, '#ff8a65');
      c.fillStyle = gg; rr(c, 570, 190, 400 * power, 30, 15); c.fill();
      emo(c, '💪', 530, 205, 34);
      if (!holding && hl >= 1) { const k = (G.t % 1.2) / 1.2; c.globalAlpha = 1 - k; emo(c, '👆', 800, 330 + k * 20, 60); c.globalAlpha = 1; }
    }
    // tension meter
    if (st === 'reel') {
      c.fillStyle = 'rgba(255,248,232,0.92)'; rr(c, 1460, 120, 70, 400, 30); c.fill();
      c.fillStyle = tension > 80 ? '#e0533d' : tension > 50 ? '#f0b429' : tension < 10 ? '#9ecbff' : '#36b37e';
      const hh = 360 * clamp(tension, 0, 100) / 100; rr(c, 1475, 500 - hh, 40, hh, 18); c.fill();
      emo(c, '💥', 1495, 100, 34); emo(c, '〰️', 1495, 545, 30);
      c.fillStyle = 'rgba(255,248,232,0.92)'; rr(c, 560, 150, 420, 40, 20); c.fill();
      c.fillStyle = '#4a9cc6'; rr(c, 570, 158, 400 * (1 - clamp(distLeft, 0, 100) / 100), 24, 12); c.fill();
      emo(c, '🐟', 990, 170, 30); emo(c, '🧺', 540, 170, 30);
    }
    drawParticles(c);
    if (wx(t).rain) gx.drawRain(c, wx(t).rain, wx(t).wind, G.t);
    const dk = gx === null ? 0 : darkness(h);
    if (dk > 0.05) { gx.lighting(c, dk, [{ x: cx, y: cy - 60, r: 260, col: 'rgba(255,230,160,0.4)', k: 0.7 }]); gx.drawNightSky(c, env, h, wk); }
  },
};
SC.fish = Fish;
