// Tent setup mini-game: clear, tarp, tent, poles, stakes, rain fly, guy lines.
import { G, W, H, emo, emit, burst, drawParticles, rand, dist, clamp, rr, pointer } from './engine.js';
import { audio } from './audio.js';
import { S, addXP, count, hintLevel, cosmetic, perf } from './save.js';
import { SITES, BIOMES } from './data.js';
import { T, def, has, passTime, wxKey } from './sim.js';
import * as gx from './gfx.js';
import { el, btn, root, toast, banner } from './ui.js';
import { SC, go } from './nav.js';

const TX = 800, TY = 700, TS = 2.2;
const tp = (px, py) => ({ x: TX + px * TS, y: TY + py * TS });
const STAKES = [tp(-95, 0), tp(25, 0), tp(95, -48), tp(-25, -48)];
const GUYS = [{ from: tp(-35, -118), to: tp(-150, 16) }, { from: tp(35, -160), to: tp(160, -40) }];
const TRAY = { x: 180, y: 800 };

const STEPS = {
  clear: { e: '🧹', say: '🧹 Clear the ground' },
  tarp: { e: '🟫', say: '🟫 Lay down the tarp', need: 'ground_tarp' },
  tent: { e: '⛺', say: '⛺ Spread out the tent' },
  poles: { e: '🦯', say: '🦯 Snap the poles together' },
  stakes: { e: '🔨', say: '🔨 Tap to stake each corner' },
  fly: { e: '🌂', say: '🌂 Add the rain fly', need: 'rain_fly' },
  guy: { e: '🪢', say: '🪢 Pull the guy lines' },
};

let st, env, site, t, q, spot, debris, poleSeg, poleIn, stakeHits, guyDone, dragging, stepEl, fix, doneBtn, hl;

const TentGame = {
  enter(arg) {
    t = T(); spot = arg.spot; fix = !!arg.fix;
    site = t.camp.spots[spot];
    q = fix ? { ...t.camp.tent } : { stage: 0, tarp: false, staked: false, fly: false, guy: false, cleared: false };
    env = gx.makeEnv(def().biome, 11, { horizon: 250 });
    hl = hintLevel(def().expert);
    debris = [];
    if (!fix) {
      const n = site.type === 'rocky' ? 7 : 5;
      const kinds = site.type === 'rocky' ? ['🪨', '🪨', '🪵', '🌰', '🪨'] : ['🪵', '🌰', '🍂', '🪨', '🍂'];
      for (let i = 0; i < n; i++) debris.push({ x: TX - 40 + rand(-230, 230), y: TY - 60 + rand(-60, 60), e: kinds[i % kinds.length], r: rand(-1, 1) });
    }
    poleSeg = 0; poleIn = false; stakeHits = [0, 0, 0, 0]; guyDone = [false, false]; dragging = null;
    st = [];
    if (!fix) st.push('clear', 'tarp', 'tent', 'poles');
    if (!q.staked) st.push('stakes');
    if (!q.fly) st.push('fly');
    if (!q.guy) st.push('guy');
    if (fix && !st.length) { go('camp'); return; }
    this.i = 0;
    const u = root();
    btn('⬅', () => this.finish(true), 'round back-btn', u);
    stepEl = el('div', 'tabs', '', u); stepEl.style.cssText = 'position:fixed;top:6.6rem;left:50%;transform:translateX(-50%)';
    const side = el('div', 'side-right', '', u);
    this.skipBtn = btn('⏭️<small>Skip</small>', () => this.skip(), '', side);
    doneBtn = btn('✅<small>Done</small>', () => this.finish(), 'go', side);
    audio.setAmbience({ birds: 0.6, wind: 0.3 });
    this.startStep();
  },
  back() { this.finish(true); },
  get step() { return st[this.i]; },
  startStep() {
    // skip steps whose gear wasn't packed
    while (this.step && STEPS[this.step].need && !has(STEPS[this.step].need)) { toast(`${STEPS[this.step].e}❌ Not packed`); this.i++; }
    if (!this.step) { this.finish(); return; }
    banner(STEPS[this.step].say, STEPS[this.step].say);
    this.renderSteps();
  },
  renderSteps() {
    stepEl.innerHTML = '';
    st.forEach((s, j) => {
      const S2 = STEPS[s], missing = S2.need && !has(S2.need);
      const done = j < this.i && !missing && this.stepDone(s);
      el('span', 'pill' + (j === this.i ? ' pulse' : ''), `${S2.e}${missing ? '❌' : done ? '✅' : j < this.i ? '⏭️' : ''}`, stepEl);
    });
    const opt = ['clear', 'tarp', 'stakes', 'fly', 'guy'].includes(this.step);
    this.skipBtn.style.display = opt ? '' : 'none';
    doneBtn.style.display = q.stage >= 2 || fix ? '' : 'none';
  },
  stepDone(s) { return { clear: q.cleared, tarp: q.tarp, tent: q.stage >= 1, poles: q.stage >= 2, stakes: q.staked, fly: q.fly, guy: q.guy }[s]; },
  next() { audio.sfx('ok'); this.i++; if (this.i >= st.length) { this.finish(); return; } this.startStep(); },
  skip() { if (['tent', 'poles'].includes(this.step)) return; this.i++; if (this.i >= st.length) this.finish(); else this.startStep(); },
  finish(abort) {
    if (abort && !fix && q.stage < 2) { go('camp'); return; }
    if (q.stage < 2 && !fix) { toast('⛺❗'); return; }
    const c = t.camp;
    c.tentSpot = spot; c.tent = q;
    if (q.cleared) site.cleared = true;
    passTime(fix ? 0.25 : 0.75, 'work');
    const s = SITES[site.type];
    const good = s.flat && s.drain && !s.hazard && !s.wind && q.staked && q.guy && (!has('rain_fly') || q.fly);
    if (!fix) {
      addXP('camping', 8 + (q.staked ? 3 : 0) + (q.guy ? 3 : 0) + (q.fly ? 3 : 0));
      if (good) { count('tentsGood'); perf(true); } else perf(site.type === 'ideal');
    } else addXP('camping', 3);
    go('camp', { msg: '⛺✅' + (hl >= 1 && has('sleeping_bag') && !c.bagIn ? ' 🛌❓' : '') });
  },

  // ---------- input ----------
  onDown(x, y) {
    const s = this.step;
    dragging = null;
    if (s === 'tarp' && dist(x, y, TRAY.x, TRAY.y - 30) < 70) dragging = { k: 'tarp', x, y };
    if (s === 'tent' && dist(x, y, TRAY.x, TRAY.y - 30) < 70) dragging = { k: 'tent', x, y };
    if (s === 'fly' && dist(x, y, TRAY.x, TRAY.y - 30) < 70) dragging = { k: 'fly', x, y };
    if (s === 'poles' && poleSeg >= 3 && dist(x, y, TRAY.x, TRAY.y - 30) < 90) dragging = { k: 'pole', x, y };
    if (s === 'guy') GUYS.forEach((g, j) => { if (!guyDone[j] && dist(x, y, g.from.x, g.from.y) < 60) dragging = { k: 'guy', j, x, y }; });
  },
  onMove(x, y) { if (dragging) { dragging.x = x; dragging.y = y; } },
  onUp(x, y, p) {
    if (!dragging) return;
    const k = dragging.k;
    if (p.drag) {
      if (k === 'guy') {
        const g = GUYS[dragging.j];
        if (dist(x, y, g.to.x, g.to.y) < 80) { guyDone[dragging.j] = true; audio.sfx('hammer'); if (guyDone.every(Boolean)) { q.guy = true; this.next(); } }
      } else if (dist(x, y, TX, TY - 80) < 260) this.place(k);
    }
    dragging = null;
  },
  onTap(x, y) {
    const s = this.step;
    if (s === 'clear') {
      for (let i = 0; i < debris.length; i++) {
        const dd = debris[i];
        if (dist(x, y, dd.x, dd.y) < 55) {
          debris.splice(i, 1); audio.sfx('swoosh');
          burst(dd.x, dd.y, 6, { color: '#a58860', size: 3, life: 0.5 });
          emit({ kind: 'emoji', e: dd.e, x: dd.x, y: dd.y, vx: (dd.x < TX ? -1 : 1) * 700, vy: -300, g: 900, life: 0.9, size: 40, spin: 10 });
          if (!debris.length) { q.cleared = true; this.next(); }
          return;
        }
      }
    }
    if (dist(x, y, TRAY.x, TRAY.y - 30) < 80) {
      if (s === 'tarp') this.place('tarp');
      else if (s === 'tent') this.place('tent');
      else if (s === 'fly') this.place('fly');
      else if (s === 'poles') { if (poleSeg < 3) { poleSeg++; audio.sfx('thunk'); burst(TRAY.x, TRAY.y - 30, 5, { color: '#ddd', size: 2, life: 0.3 }); if (poleSeg >= 3) banner('🦯 Slide the poles into the tent'); } else this.place('pole'); }
      return;
    }
    if (s === 'poles' && poleSeg >= 3 && dist(x, y, TX, TY - 60) < 200) { this.place('pole'); return; }
    if (s === 'stakes') {
      STAKES.forEach((p, j) => {
        if (stakeHits[j] < 2 && dist(x, y, p.x, p.y) < 55) {
          stakeHits[j]++; audio.sfx('hammer'); burst(p.x, p.y, 6, { color: '#8b6b4b', size: 3, g: 500, life: 0.5, up: 120 });
          if (stakeHits.every(h => h >= 2)) { q.staked = true; this.next(); }
        }
      });
    }
    if (s === 'guy') {
      GUYS.forEach((g, j) => { if (!guyDone[j] && (dist(x, y, g.to.x, g.to.y) < 60 || dist(x, y, g.from.x, g.from.y) < 60) && (S.settings.simple || hl >= 2)) { guyDone[j] = true; audio.sfx('hammer'); } });
      if (guyDone.every(Boolean)) { q.guy = true; this.next(); }
    }
  },
  place(k) {
    if (k === 'tarp' && this.step === 'tarp') { q.tarp = true; audio.sfx('swoosh'); this.next(); }
    else if (k === 'tent' && this.step === 'tent') { q.stage = 1; audio.sfx('swoosh'); this.next(); }
    else if (k === 'pole' && this.step === 'poles' && poleSeg >= 3) { q.stage = 2; audio.sfx('creak'); burst(TX - 30, TY - 250, 14, { color: ['#fff', '#ffd23f'], size: 3, life: 0.6 }); this.next(); }
    else if (k === 'fly' && this.step === 'fly') { q.fly = true; audio.sfx('swoosh'); this.next(); }
    this.renderSteps();
  },

  // ---------- draw ----------
  draw(c) {
    const h = t.hour, wk = wxKey(t);
    gx.drawSky(c, env, h, wk); gx.drawRanges(c, env, h, wk); gx.drawGround(c, env, h);
    c.save(); c.translate(TX - 40, TY - 60); c.scale(2.3, 2.3); c.translate(-(site.x - 20), -(site.y - 15));
    drawSiteZoom(c, site);
    c.restore();
    gx.drawTufts(c, env, 0.3, (x, y) => Math.hypot((x - TX + 40) / 300, (y - TY + 60) / 120) < 1);
    if (site.type === 'snag') gx.drawDead(c, TX - 380, TY - 30, 520, 0);
    gx.drawTent(c, TX, TY, { stage: q.stage, tarp: q.tarp, staked: q.staked, fly: q.fly, guy: q.guy, color: cosmetic('tent').c, s: TS, flag: { id: 'none' } });
    for (const dd of debris) emo(c, dd.e, dd.x, dd.y, 44, { rot: dd.r });
    const s = this.step;
    // stakes
    if (s === 'stakes') STAKES.forEach((p, j) => {
      c.fillStyle = '#bdc3c7'; c.fillRect(p.x - 4, p.y - 26 + stakeHits[j] * 10, 8, 30 - stakeHits[j] * 10);
      if (stakeHits[j] < 2) ring(c, p.x, p.y, 34);
    });
    if (s === 'guy') GUYS.forEach((g, j) => {
      if (guyDone[j]) return;
      c.fillStyle = '#ffc93c'; c.beginPath(); c.arc(g.from.x, g.from.y, 14, 0, 7); c.fill();
      ring(c, g.to.x, g.to.y, 36);
      if (hl >= 1) { c.strokeStyle = 'rgba(255,255,255,0.6)'; c.setLineDash([8, 10]); c.lineWidth = 3; c.beginPath(); c.moveTo(g.from.x, g.from.y); c.lineTo(g.to.x, g.to.y); c.stroke(); c.setLineDash([]); }
    });
    if (dragging && dragging.k === 'guy') { const g = GUYS[dragging.j]; c.strokeStyle = '#fff'; c.lineWidth = 3; c.beginPath(); c.moveTo(g.from.x, g.from.y); c.lineTo(dragging.x, dragging.y); c.stroke(); }
    // tray
    c.fillStyle = 'rgba(110,70,35,0.85)'; rr(c, TRAY.x - 110, TRAY.y - 100, 220, 130, 24); c.fill();
    const trayIcon = { tarp: '🟫', tent: '⛺', fly: '🌂', poles: poleSeg >= 3 ? '🦯' : null }[s];
    if (s === 'poles') {
      for (let k = 0; k < 3; k++) { const on = k < poleSeg; c.strokeStyle = on ? '#333' : '#777'; c.lineWidth = 8; c.lineCap = 'round'; c.beginPath(); c.moveTo(TRAY.x - 80 + k * 55 + (on ? 0 : k * 6), TRAY.y - 30); c.lineTo(TRAY.x - 30 + k * 55 + (on ? 0 : k * 6), TRAY.y - 30); c.stroke(); }
      if (poleSeg < 3) ring(c, TRAY.x, TRAY.y - 30, 80);
    }
    if (trayIcon && !(dragging && dragging.k !== 'guy')) { emo(c, trayIcon, TRAY.x, TRAY.y - 30, 70); if (hl >= 1) ring(c, TRAY.x, TRAY.y - 30, 70); }
    if (dragging && dragging.k !== 'guy') {
      emo(c, { tarp: '🟫', tent: '⛺', fly: '🌂', pole: '🦯' }[dragging.k], dragging.x, dragging.y, 80);
      ring(c, TX - 40, TY - 60, 150);
    }
    if (hl >= 1 && ['tarp', 'tent', 'fly'].includes(s) && !dragging) {
      const k = (G.t % 1.6) / 1.6;
      c.globalAlpha = 1 - k; emo(c, '👆', TRAY.x + (TX - TRAY.x) * k, TRAY.y - 30 + (TY - 100 - TRAY.y) * k, 44); c.globalAlpha = 1;
    }
    drawParticles(c);
    const w = { rain: wk === 'rain' || wk === 'storm' };
    if (w.rain) gx.drawRain(c, 1, 0.5, G.t);
  },
};
SC.tentgame = TentGame;

function ring(c, x, y, r) {
  c.strokeStyle = `rgba(255,201,60,${0.55 + 0.4 * Math.sin(G.t * 5)})`; c.lineWidth = 5;
  c.beginPath(); c.arc(x, y, r + Math.sin(G.t * 5) * 4, 0, 7); c.stroke();
}
function drawSiteZoom(c, s) {
  const x = s.x - 20, y = s.y - 15;
  const col = { ideal: 'rgba(170,215,120,0.6)', hollow: 'rgba(95,75,50,0.6)', slope: 'rgba(70,120,50,0.4)', shore: 'rgba(230,210,160,0.8)', rocky: 'rgba(150,120,80,0.45)', exposed: 'rgba(160,160,150,0.5)', snag: 'rgba(150,130,100,0.35)' }[s.type];
  c.fillStyle = col; c.beginPath(); c.ellipse(x, y + 5, 125, 50, 0, 0, 7); c.fill();
  if (s.type === 'hollow') { c.fillStyle = 'rgba(140,180,210,0.6)'; c.beginPath(); c.ellipse(x - 30, y + 12, 26, 8, 0, 0, 7); c.ellipse(x + 40, y + 2, 18, 6, 0, 0, 7); c.fill(); }
  if (s.type === 'slope') { c.strokeStyle = 'rgba(60,90,40,0.5)'; c.lineWidth = 2; for (let i = 0; i < 5; i++) { c.beginPath(); c.moveTo(x - 110 + i * 50, y + 35); c.lineTo(x - 80 + i * 50, y - 30); c.stroke(); } }
  if (s.type === 'rocky' && !s.cleared) { c.strokeStyle = '#6b4a2f'; c.lineWidth = 4; c.beginPath(); c.moveTo(x - 110, y - 5); c.quadraticCurveTo(x - 40, y + 20, x + 10, y - 2); c.stroke(); }
  if (s.type === 'shore') { c.fillStyle = '#3f8fb5'; c.beginPath(); c.ellipse(x + 200, y - 40, 120, 40, 0, 0, 7); c.fill(); }
}
