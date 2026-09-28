// Night events, morning report and end-of-trip results.
import { G, W, H, emo, emit, burst, drawParticles, rand, clamp, pick } from './engine.js';
import { audio } from './audio.js';
import { S, save, addXP, count, discover } from './save.js';
import { LESSONS, TRIPS, tripById, BIOMES, WEATHER } from './data.js';
import { T, def, evaluateNight, applyNight, nextMorning, tripStars, GOALS, goalDone, FIRE, SPOTS, wx, natureGood } from './sim.js';
import * as gx from './gfx.js';
import { el, btn, root, toast, banner, lesson, stars, modal, celebrate, speak } from './ui.js';
import { SC, go } from './nav.js';

let t, ev, idx, et, card, cur, startHour, scattered, puddle, branch;
const EV_TIME = 3.4;

const Night = {
  enter() {
    t = T();
    SC.camp.prepareView();
    ev = evaluateNight();
    idx = -1; et = 0; scattered = []; puddle = 0; branch = null; this.done = false;
    startHour = 22;
    t.hour = 22;
    const u = root();
    card = el('div', 'banner', '', u);
    card.style.cssText += ';top:0.8rem;font-size:1.6rem;pointer-events:auto!important;cursor:pointer';
    card.addEventListener('click', () => { if (cur && cur.lesson) lesson(cur.icon, LESSONS[cur.lesson]); });
    btn('⏩', () => this.nextEv(), 'round side-right', u);
    audio.setMusic('night');
    audio.setAmbience({ night: 1, rain: wx(t).rain, wind: 0.2 + wx(t).wind * 0.4 });
    SC.camp.extra = c => this.fx(c);
    toast('😴💤 Good night!');
    speak('Good night');
    setTimeout(() => this.nextEv(), 1400);
  },
  exit() { SC.camp.extra = null; SC.camp.windBoost = 0; },
  back() { },
  nextEv() {
    if (this.done) return;
    idx++; et = 0;
    SC.camp.windBoost = 0;
    if (idx >= ev.length) { this.finish(); return; }
    cur = ev[idx];
    card.innerHTML = `<span style="font-size:2rem">${cur.icon}</span> ${cur.good ? '✅' : '❌'}${cur.lesson ? ' <small style="font-size:0.9rem">👆</small>' : ''}`;
    card.style.borderBottom = `0.3rem solid ${cur.good ? '#36b37e' : '#e0533d'}`;
    card.classList.remove('pop'); void card.offsetWidth; card.classList.add('pop');
    const c = t.camp, tent = c.spots[c.tentSpot];
    switch (cur.id) {
      case 'embers': audio.sfx('whoosh'); break;
      case 'raccoon': case 'trash_raid': {
        const target = cur.id === 'raccoon' ? c.objs.cooler : c.objs.trash;
        SC.camp.addCritter({ kind: 'raccoon', e: '🦝', x: G.view.x0 - 60, y: target.y, tx: target.x - 50, ty: target.y });
        setTimeout(() => { audio.sfx('chitter'); for (let i = 0; i < 5; i++) scattered.push({ x: target.x + rand(-120, 120), y: target.y + rand(-20, 60), e: pick(cur.id === 'raccoon' ? ['🌭', '🍫', '🥔', '🌽'] : ['🍬', '📰', '🧃']) }); }, 1500);
        break;
      }
      case 'raccoon_foiled': {
        const tgt = c.objs.cooler.where === 'box' ? SPOTS.bearbox : { x: SPOTS.hangTree.x + 70, y: SPOTS.hangTree.y + 60 };
        SC.camp.addCritter({ kind: 'raccoon', e: '🦝', x: G.view.x0 - 60, y: tgt.y + 20, tx: tgt.x + 60, ty: tgt.y + 20 });
        setTimeout(() => audio.sfx('chitter'), 1200);
        break;
      }
      case 'snag': setTimeout(() => { audio.sfx('snap'); branch = { x: tent.x + 40, y: tent.y - 300, vy: 0 }; }, 600); break;
      case 'wind_tent': case 'storm_bad': SC.camp.windBoost = 3; audio.sfx('whoosh'); break;
      case 'perfect': audio.sfx('hoot'); break;
      case 'warm': case 'dry': case 'fire_safe': case 'storm_ok': case 'wind_ok': audio.sfx('ok'); break;
      default: if (!cur.good) audio.sfx('bad');
    }
    if (['storm_ok', 'storm_bad'].includes(cur.id)) { SC.camp.setFlash(1); setTimeout(() => audio.sfx('thunder'), 300); }
    if (cur.id === 'wolf') audio.sfx('howl');
  },
  update(dt) {
    if (this.done) return;
    et += dt;
    const total = Math.max(1, ev.length) * EV_TIME + 1.4;
    t.hour = Math.min(29.5, t.hour + dt * (7.5 / total));
    SC.camp.tickCritters(dt);
    if (cur && cur.id === 'flooded') puddle = Math.min(1, puddle + dt * 0.5);
    if (branch) { branch.vy += 900 * dt; branch.y += branch.vy * dt; const tent = t.camp.spots[t.camp.tentSpot]; if (branch.y > tent.y - 20) { branch.y = tent.y - 20; if (!branch.hit) { branch.hit = true; audio.sfx('thunk'); burst(branch.x, branch.y, 14, { color: '#8b6b4b', size: 4, g: 500, life: 0.7, up: 150 }); } } }
    if (cur && cur.id === 'embers' && Math.random() < dt * 25) emit({ x: FIRE.x + rand(-30, 30), y: FIRE.y - 20, vx: rand(40, 200), vy: rand(-200, -60), g: 60, life: 1.5, size: 3, color: '#ff8c42', add: true });
    if (cur && ['cold'].includes(cur.id) && Math.random() < dt * 3) { const tent = t.camp.spots[t.camp.tentSpot]; emit({ x: tent.x - 30, y: tent.y - 120, vy: -30, life: 1.2, size: 6, grow: 10, color: 'rgba(255,255,255,0.6)' }); }
    if (et > EV_TIME && idx >= 0 && idx < ev.length) this.nextEv();
  },
  fx(c) {
    const cp = t.camp, tent = cp.tentSpot >= 0 ? cp.spots[cp.tentSpot] : null;
    if (puddle && tent) { c.fillStyle = `rgba(90,150,210,${0.55 * puddle})`; c.beginPath(); c.ellipse(tent.x - 20, tent.y - 5, 150 * puddle, 50 * puddle, 0, 0, 7); c.fill(); }
    for (const s of scattered) emo(c, s.e, s.x, s.y, 26, { rot: 0.6 });
    if (branch) { c.save(); c.translate(branch.x, branch.y); c.rotate(0.4); c.fillStyle = '#7b7066'; c.fillRect(-90, -8, 180, 16); c.restore(); }
    if (!cur || !tent) return;
    const bob = Math.sin(G.t * 4) * 6;
    const icon = { cold: '🥶', warm: '😊💤', slope: '↘️😣', lumpy: '🪨😣', bugs: '🦟🦟', no_bag: '🥶', rain_in: '💧😣', flooded: '🌊😣', damp: '💧', dry: '😊💤', wind_tent: '💨😣', dark: '🌑😟', perfect: '😊💤', gear_wet: '🎒💧' }[cur.id];
    if (icon) emo(c, icon, tent.x - 20, tent.y - 210 + bob, 50);
    if (cur.id === 'perfect') { emo(c, '🦉', SPOTS.hangTree.x + 20, SPOTS.hangTree.y - 190, 44); }
    if (cur.id === 'embers') emo(c, '⚠️', FIRE.x, FIRE.y - 110 + bob, 50);
    if (cur.id === 'raccoon_foiled' && et > 1.6) emo(c, '❓', SPOTS.bearbox.x + 60, SPOTS.bearbox.y - 90, 40);
    if (cur.id === 'wood_wet') emo(c, '💧', cp.objs.wood.x, cp.objs.wood.y - 90 + bob, 40);
  },
  draw(c) { SC.camp.draw(c); },
  finish() {
    if (this.done) return;
    this.done = true;
    applyNight(ev);
    card.remove();
    SC.camp.clearCritters();
    const m = t.m, sleepStars = clamp(Math.round(m.energy / 20), 1, 5);
    const good = ev.filter(e => e.good), bad = ev.filter(e => !e.good);
    const body = el('div', '');
    el('div', 'bigicon', '🌅', body);
    el('div', 'tip', `😴 ${stars(sleepStars)}`, body);
    const r = el('div', 'row c', '', body);
    for (const e of ev) {
      const p = el('span', 'pill', `${e.icon}${e.good ? '✅' : '❌'}`, r);
      p.style.cursor = 'pointer';
      p.addEventListener('click', () => { if (e.lesson) lesson(e.icon, LESSONS[e.lesson]); });
    }
    if (bad.length) el('div', 'tip', '👆 Tap ❌ to learn why', body);
    const last = nextMorning();
    save();
    modal({
      title: bad.length ? '☀️ Morning' : '🌟 Perfect Night!', body, closeX: false,
      buttons: [{ label: last ? '🏁 Finish trip' : '▶ New day', cls: 'go', onClick: () => last ? go('results', {}) : go('camp', { morning: true }) }],
    });
    if (!bad.length) audio.sfx('fanfare');
  },
};
SC.night = Night;

// ---------------- Results ----------------
let renv;
const Results = {
  enter(arg = {}) {
    t = T(); if (!t) { go('home'); return; }
    const d = def();
    renv = gx.makeEnv(d.biome, 5);
    gx.scatterTrees(renv, 14, { x0: -500, x1: 2100, y0: 360, y1: 900 }, [{ x: 800, y: 680, rx: 700, ry: 260 }]);
    if (t.camp.trashBag) natureGood(Math.min(3, t.camp.trashBag));
    const st = tripStars();
    const goals = d.goals.map(g => [g, goalDone(g)]);
    const gdone = goals.filter(g => g[1]).length;
    const total = st.nature + st.safety + st.food + st.comfort;
    const overall = clamp(Math.round(total / 4 + (gdone === goals.length ? 0.5 : 0)), 1, 5);
    const finished = !arg.early;
    const reward = Math.round((finished ? 25 : 5) + total * 4 + gdone * 8);
    S.money += reward;
    if (st.nature === 5 && finished) count('perfectNature');
    if (finished) {
      S.completed[d.id] = Math.max(S.completed[d.id] || 0, overall);
      addXP('camping', 10); addXP('budgeting', 5 + (S.money > 60 ? 5 : 0));
      const next = TRIPS.find(x => x.stage === d.stage + 1);
      if (next && !S.unlocked.includes(next.id)) { S.unlocked.push(next.id); setTimeout(() => celebrate(next.e, `New trip: ${next.n}!`, '🔓'), 900); }
    }
    S.trip = null; save();
    audio.sfx('fanfare'); audio.setMusic('day'); audio.setAmbience({ birds: 1, wind: 0.2 });
    const u = root();
    const box = el('div', 'modal', '', u);
    box.style.cssText = 'position:fixed;left:50%;top:50%;transform:translate(-50%,-50%);min-width:min(92vw,34rem)';
    el('div', 'modal-title', `${finished ? '🏁 Trip Complete!' : '🏠 Home early'}`, box);
    el('div', 'bigicon', `${d.e}`, box);
    el('div', 'tip', `${stars(overall)}`, box);
    const g2 = el('div', '', `
      <div class="setting"><label>🌲 Nature</label>${stars(st.nature)}</div>
      <div class="setting"><label>🔥 Safety</label>${stars(st.safety)}</div>
      <div class="setting"><label>🍳 Food</label>${stars(st.food)}</div>
      <div class="setting"><label>😊 Comfort</label>${stars(st.comfort)}</div>
      <div class="row c" style="margin-top:0.5rem">${goals.map(([g, ok]) => `<span class="pill">${GOALS[g].e}${ok ? '✅' : '⬜'}</span>`).join('')}</div>
      <div class="row c" style="margin-top:0.5rem"><span class="pill" style="font-size:1.3rem">💰 +$${reward}</span></div>`, box);
    const row = el('div', 'modal-btns', '', box);
    btn('🗺️ Trips', () => go('tripmap'), 'go', row);
    btn('🏠 Home', () => go('home'), '', row);
    speak(finished ? 'Trip complete!' : 'Home early');
  },
  update() { if (Math.random() < 0.08) emit({ kind: 'emoji', e: pick(['⭐', '🌲', '✨', '🏅']), x: rand(0, 1600), y: -20, vy: rand(80, 160), vx: rand(-30, 30), life: 6, size: rand(20, 36), spin: rand(-2, 2) }); },
  draw(c) {
    gx.drawSky(c, renv, 10, 'sun'); gx.drawClouds(c, renv, 'sun', G.dt); gx.drawRanges(c, renv, 10, 'sun'); gx.drawGround(c, renv, 10);
    gx.drawTufts(c, renv, 0.2);
    for (const tr of renv.trees) gx.drawTree(c, tr, 0.2);
    gx.drawCamper(c, 250, 800, { look: S.look, pose: 'cheer', s: 1.4 });
    drawParticles(c);
  },
};
SC.results = Results;
