// Exploration: move between trail places with compass directions; observe wildlife, gather wood, find tracks.
import { G, W, H, emo, emit, burst, drawParticles, rand, dist, clamp, rr, chance, pick, shuffle, rng } from './engine.js';
import { audio } from './audio.js';
import { S, addXP, count, hintLevel, discover, perf } from './save.js';
import { WILDLIFE, PLANTS, ROCKS, TRACKS, LESSONS, ITEMS } from './data.js';
import { T, def, has, passTime, wxKey, wx, darkness, timeTag, natureGood, natureBad, wildlifeFor, lightSource, phase, waterCap } from './sim.js';
import * as gx from './gfx.js';
import { el, btn, root, toast, banner, lesson, modal, closeModal, bubble, closeBubble } from './ui.js';
import { SC, go } from './nav.js';

const ARROW = { N: '⬆️', NE: '↗️', E: '➡️', SE: '↘️', S: '⬇️', SW: '↙️', W: '⬅️', NW: '↖️' };
const DIRPOS = { N: 'top:3.4rem;left:50%;transform:translateX(-50%)', S: 'bottom:5rem;left:50%;transform:translateX(-50%)', E: 'right:0.6rem;top:50%;transform:translateY(-50%)', W: 'left:0.6rem;top:50%;transform:translateY(-50%)', NE: 'top:3.4rem;right:5rem', NW: 'top:3.4rem;left:4.5rem', SE: 'bottom:5rem;right:0.6rem', SW: 'bottom:5rem;left:0.6rem' };
export function dirOf(dx, dy) { return (dy < 0 ? 'N' : dy > 0 ? 'S' : '') + (dx > 0 ? 'E' : dx < 0 ? 'W' : ''); }

let t, d, node, env, things, camper, moving, sneak, dirEls, lastMsg, offTrailWarned;

const Explore = {
  enter(arg = {}) {
    t = T(); d = def();
    if (!t.exp.node || !d.nodes.find(n => n.id === t.exp.node)) t.exp.node = 'camp';
    if (t.exp.node === 'camp') {
      // leaving camp: step onto the first trail
      const out = this.edges('camp');
      this.goto(null);
      return;
    }
    this.goto(t.exp.node, arg.fromDir);
  },
  back() { this.returnCamp(); },
  node(id) { return d.nodes.find(n => n.id === id); },
  edges(id) {
    const out = [];
    for (const e of d.edges) {
      const [a, b2, opt] = e;
      if (a === id || b2 === id) {
        const o = this.node(a === id ? b2 : a), me = this.node(id);
        out.push({ to: o, dir: dirOf(o.gx - me.gx, o.gy - me.gy), opt: opt || {} });
      }
    }
    return out;
  },
  goto(id, fromDir) {
    if (!id) { // at the camp trailhead
      node = this.node('camp');
    } else node = this.node(id);
    t.exp.node = node.id;
    const first = !t.exp.visited[node.id];
    t.exp.visited[node.id] = 1;
    env = gx.makeEnv(d.biome, hash(d.id + node.id), { horizon: node.kind === 'ridge' ? 380 : 320 });
    const center = [{ x: 800, y: 680, rx: 520, ry: 170 }];
    if (node.kind === 'lake' || node.kind === 'dock') center.push({ x: 900, y: 470, rx: 760, ry: 150 });
    if (node.kind === 'waterfall') center.push({ x: 800, y: 400, rx: 330, ry: 140 });
    gx.scatterTrees(env, node.kind === 'grove' ? 30 : node.kind === 'ridge' ? 6 : 16, { x0: -500, x1: 2100, y0: 330, y1: 900 }, center, node.kind === 'grove' ? 1.3 : 1);
    if (node.kind === 'grove' && /oak/i.test(node.n)) { env.trees.push({ x: 800, y: 470, h: 420, type: 'oak', p: 0 }); env.trees.sort((a, b2) => a.y - b2.y); }
    camper = { x: fromDir ? entryX(fromDir) : 800, y: 790, tx: 800, ty: 790, face: 1 };
    moving = null; sneak = sneak || false; offTrailWarned = false;
    this.populate();
    if (first && node.id !== 'camp') {
      discover('landmarks', `${d.id}:${node.id}`);
      addXP('navigation', 4);
    }
    this.checkMission();
    this.ui();
    audio.setAmbience({ birds: darkness(t.hour) < 0.3 ? 1 : 0, wind: 0.3 + wx(t).wind * 0.4, rain: wx(t).rain, water: ['lake', 'dock', 'creek', 'waterfall'].includes(node.kind) ? (node.kind === 'waterfall' ? 1.6 : 1) : 0, night: darkness(t.hour) > 0.4 ? 1 : 0, frogs: node.kind === 'lake' && t.hour > 17 ? 1 : 0 });
    audio.setMusic(darkness(t.hour) > 0.4 ? 'night' : 'day');
  },
  populate() {
    things = [];
    const tag = timeTag(t.hour), wet = !!wx(t).rain || t.forecast[t.day - 1].day === 'rain';
    const pos = where => {
      if (where === 'tree') return { x: rand(250, 1350), y: rand(300, 420) };
      if (where === 'sky') return { x: rand(300, 1300), y: rand(90, 220) };
      if (where === 'air') return { x: rand(300, 1300), y: rand(450, 650) };
      if (where === 'far') return { x: pick([rand(150, 400), rand(1200, 1450)]), y: rand(390, 430) };
      if (where === 'water') return { x: rand(500, 1200), y: waterY() };
      return { x: rand(200, 1400), y: rand(560, 820) };
    };
    const waterKinds = ['lake', 'dock', 'creek', 'waterfall'];
    let pool = wildlifeFor(d.wildlife, t.hour).filter(id => { const a = WILDLIFE[id]; return a.where !== 'water' || waterKinds.includes(node.kind); });
    if (node.kind === 'cave' && tag === 'night' && d.wildlife.includes('bat')) pool.push('bat');
    pool = shuffle(pool).slice(0, node.id === 'camp' ? 1 : node.kind === 'meadow' || node.kind === 'grove' ? 3 : 2);
    for (const id of pool) { const p = pos(WILDLIFE[id].where); things.push({ type: 'animal', id, e: WILDLIFE[id].e, ...p, bx: p.x, t: rand(0, 5), face: chance(0.5) ? 1 : -1, s: WILDLIFE[id].where === 'far' ? 30 : 52 }); }
    const plants = shuffle(d.plants).slice(0, node.kind === 'meadow' ? 3 : 2);
    for (const id of plants) things.push({ type: 'plant', id, e: PLANTS[id].e, x: rand(220, 1380), y: rand(600, 840), s: 44 });
    if (d.rocks && (node.kind === 'ridge' || node.kind === 'cave' || node.kind === 'creek')) { const id = pick(d.rocks); things.push({ type: 'rock', id, e: ROCKS[id].e, x: rand(300, 1300), y: rand(640, 840), s: 38 }); }
    if (chance(0.45) && node.id !== 'camp') things.push({ type: 'trash', e: pick(['🥤', '🍬', '📰', '🧃']), x: rand(250, 1350), y: rand(650, 840), s: 30 });
    const nw = node.kind === 'grove' ? 4 : node.kind === 'meadow' ? 2 : node.id === 'camp' ? 2 : 3;
    for (let i = 0; i < nw; i++) { const k = pick(['tinder', 'kindling', 'kindling', 'small', 'small', 'log']); things.push({ type: 'wood', k, wet, e: { tinder: '🌾', kindling: '🥢', small: '🪵', log: '🪵' }[k], x: rand(200, 1400), y: rand(620, 850), s: k === 'log' ? 48 : 36 }); }
    if (d.tracks && ['grove', 'creek', 'trail', 'meadow'].includes(node.kind) && chance(0.8)) things.push({ type: 'tracks', id: pick(d.tracks), x: rand(450, 1150), y: rand(700, 800), s: 60 });
    if (node.kind === 'ranger') things.push({ type: 'ranger', x: 1000, y: 700, s: 80 });
  },
  ui() {
    const u = root(); u.innerHTML = '';
    btn('🏕️', () => this.returnCamp(), 'round back-btn', u);
    const edges = this.edges(node.id);
    for (const e of edges) {
      const known = t.exp.visited[e.to.id] || has('map');
      const blocked = e.opt.needBridge && !t.flags.bridge;
      const b = btn(`<span class="big">${ARROW[e.dir]}</span><b>${e.dir}</b>${known ? `<span class="big">${e.to.e}</span>` : '❓'}${blocked ? '🚧' : ''}`, () => this.travel(e), 'passthru-btn', u);
      b.style.cssText += ';position:fixed;' + DIRPOS[e.dir] + ';z-index:11';
    }
    const right = el('div', 'side-right', '', u);
    right.style.top = '62%';
    this.sneakBtn = btn(`<span class="big">${sneak ? '🤫' : '🚶'}</span><small>${sneak ? 'Sneak' : 'Walk'}</small>`, () => { sneak = !sneak; this.ui(); }, sneak ? 'sel' : '', right);
    const waterHere = ['lake', 'dock', 'creek', 'waterfall'].includes(node.kind);
    if (waterHere) btn('<span class="big">💧</span><small>Fill</small>', () => this.fill(), '', right);
    if (waterHere && d.fish && has('fishing_rod') && node.kind !== 'waterfall') btn('<span class="big">🎣</span><small>Fish</small>', () => go('fish', { from: 'explore' }), '', right);
    if (node.bridge && !t.flags.bridge) btn('<span class="big">🌉</span><small>Build</small>', () => go('build', { kind: 'bridge' }), 'pulse', right);
    if (has('camera') && ['ridge', 'waterfall', 'lake'].includes(node.kind)) btn('<span class="big">📷</span><small>Photo</small>', () => this.photo(), '', right);
    this.refreshBanner();
  },
  refreshBanner() {
    const m = this.mission();
    if (t.hour >= 20.5) banner('🌙 Head back to camp!', 'Head back to camp');
    else if (m) {
      const me = node, tgt = this.node(m.goal);
      const dir = dirOf(tgt.gx - me.gx, tgt.gy - me.gy);
      banner(`🧭 ${m.text} ${has('compass') || hintLevel(d.expert) >= 2 ? ARROW[dir] + ' ' : ''}${dir}`, m.text);
    } else banner(`${node.e} ${node.n}`);
  },
  mission() { const ms = d.missions; if (!ms) return null; return ms[t.exp.mission] || null; },
  checkMission() {
    const m = this.mission();
    if (m && node.id === m.goal) {
      t.exp.mission++; t.flags.nav = true; count('nav'); addXP('navigation', 15); perf(true);
      setTimeout(() => { audio.sfx('success'); toast(`🧭✅ ${node.e} Found it!`); }, 400);
    }
  },
  travel(e) {
    if (moving) return;
    closeBubble();
    if (e.opt.needBridge && !t.flags.bridge) { toast('🌊🚧 Build a bridge first'); audio.sfx('bad'); return; }
    if (t.m.energy < 8) { toast('⚡❌ Too tired'); lesson('⚡', LESSONS.tired); return; }
    moving = { e, k: 0 };
    const ex = exitPt(e.dir);
    camper.tx = ex.x; camper.ty = ex.y;
    audio.sfx('step');
  },
  arrive(e) {
    passTime(0.5, 'walk');
    if (e.to.id === 'camp') { this.returnCamp(true); return; }
    if (e.to.id !== 'camp' && t.exp.visited[e.to.id] === undefined && !has('map') && !has('compass') && chance(0.1)) toast('🗺️❓');
    this.goto(e.to.id, e.dir);
    if (t.hour >= 22) { toast('🧑‍🚒 A ranger walked you back'); this.returnCamp(true); }
  },
  returnCamp(walked) {
    if (!walked) {
      const m = this.node('camp'), me = node;
      const hops = Math.max(Math.abs(me.gx - m.gx), Math.abs(me.gy - m.gy));
      if (hops > 0) passTime(0.5 * hops, 'walk');
    }
    t.exp.node = 'camp';
    go('camp');
  },
  fill() {
    const cap = waterCap(); if (!cap) { toast('🥤❌'); return; }
    const n = cap - t.water.length; if (n <= 0) { toast('🥤✅ Full'); return; }
    for (let i = 0; i < n; i++) t.water.push('raw');
    audio.sfx('splash'); toast('💦➡️🥤');
    if (hintLevel(d.expert) >= 2) setTimeout(() => lesson('💧🦠', LESSONS.untreated), 800);
  },
  photo() { audio.sfx('camera'); burst(800, 450, 1, { color: '#fff', size: 1500, life: 0.25, alpha: 0.8 }); if (!t.flags['photo_' + node.id]) { t.flags['photo_' + node.id] = 1; t.m.morale = Math.min(100, t.m.morale + 8); toast('📸😊'); addXP('nature', 2); } },

  // ---------- input ----------
  onTap(x, y) {
    if (moving) return;
    closeBubble();
    for (let i = things.length - 1; i >= 0; i--) {
      const th = things[i];
      if (dist(x, y, th.x, th.y - th.s * 0.4) < Math.max(45, th.s * 0.8)) { this.interact(th); return; }
    }
    camper.tx = clamp(x, 100, 1500); camper.ty = clamp(y, 560, 860);
    if (node.kind === 'meadow' && y > 600 && !offTrailWarned && Math.abs(x - 800) > 350) {
      offTrailWarned = true; natureBad(1); toast('🌼🥾'); lesson('🥾', LESSONS.off_trail);
    }
  },
  interact(th) {
    const near = () => dist(camper.x, camper.y, th.x, th.y) < 180;
    if (th.type === 'animal') return this.approach(th);
    if (th.type === 'plant') {
      const P = PLANTS[th.id];
      bubble(th.x, th.y - 40, [
        { icon: has('camera') ? '📸' : '👀', label: 'Look', onClick: () => { if (discover('plants', th.id)) addXP('nature', 4); toast(`${P.e} ${P.tip}`); if (P.warn) audio.sfx('bad'); else audio.sfx('pop'); } },
        { icon: '✋', label: 'Pick', onClick: () => {
          things.splice(things.indexOf(th), 1); natureBad(1, 'picked');
          if (th.id === 'poison_ivy') { t.m.health -= 6; t.m.morale -= 6; toast('😖 Itchy!'); lesson('🍃🍃🍃', PLANTS.poison_ivy.tip); }
          else if (P.warn) lesson(P.e, P.tip); else lesson('🌱', LESSONS.picked);
          discover('plants', th.id);
        } },
      ]);
      return;
    }
    if (th.type === 'rock') { if (discover('rocks', th.id)) addXP('nature', 4); toast(`${ROCKS[th.id].e} ${ROCKS[th.id].tip}`); audio.sfx('pop'); return; }
    const walk = cb => { camper.tx = th.x + 40; camper.ty = clamp(th.y + 10, 560, 860); camper.cb = cb; };
    if (th.type === 'trash') { walk(() => { things.splice(things.indexOf(th), 1); natureGood(); t.camp.trashBag = (t.camp.trashBag || 0) + 1; audio.sfx('pop'); burst(th.x, th.y, 10, { color: ['#7bed9f', '#fff'], size: 3, life: 0.6 }); toast('🗑️✨'); }); return; }
    if (th.type === 'wood') {
      walk(() => {
        things.splice(things.indexOf(th), 1);
        t.wood[th.k][th.wet ? 'wet' : 'dry']++;
        if (th.k === 'kindling') t.wood.kindling[th.wet ? 'wet' : 'dry']++;
        if (th.k === 'tinder') t.wood.tinder[th.wet ? 'wet' : 'dry']++;
        t.flags.gathered = true; addXP('firecraft', 1);
        audio.sfx('snap'); toast(`${th.e}${th.wet ? '💧' : ''} ➡️ 🪵`);
        if (th.wet && !S.lessons.wetwood) { S.lessons.wetwood = 1; setTimeout(() => lesson('💦🪵', LESSONS.wet_wood), 600); }
        passTime(0.1, 'work');
      });
      return;
    }
    if (th.type === 'tracks') return this.tracks(th);
    if (th.type === 'ranger') return this.ranger();
  },
  approach(th) {
    const A = WILDLIFE[th.id];
    if (th.fled) return;
    if (A.where === 'far') {
      if (discover('wildlife', th.id)) addXP('nature', 8);
      toast(`👀${A.e} ${A.tip}`); audio.sfx(th.id === 'wolf' ? 'howl' : 'pop'); return;
    }
    if (!sneak && chance(A.shy)) {
      th.fled = true; audio.sfx('rustle');
      toast(`${A.e}💨`);
      if (!S.lessons.chase) { S.lessons.chase = 1; lesson('🤫', LESSONS.chase); }
      if (hintLevel(d.expert) >= 1) this.sneakBtn.classList.add('pulse');
      return;
    }
    // sneak up slowly
    camper.tx = th.x + (camper.x < th.x ? -150 : 150); camper.ty = clamp(th.y + 30, 560, 860);
    camper.slow = sneak;
    camper.cb = () => {
      if (th.fled) return;
      const isNew = discover('wildlife', th.id);
      if (isNew) addXP('nature', 10);
      if (has('camera')) { audio.sfx('camera'); t.m.morale = Math.min(100, t.m.morale + 3); S.disc.photos[th.id] = 1; }
      toast(`${has('camera') ? '📸' : '👀'} <span class="big">${A.e}</span> ${A.n}`);
      if (!isNew) toast(A.tip);
      if (sneak) perf(true);
    };
  },
  tracks(th) {
    const correct = th.id, opts = shuffle([correct, ...shuffle(Object.keys(TRACKS).filter(k => k !== correct)).slice(0, 2)]);
    const body = el('div', '');
    const cv = el('canvas', '', '', body); cv.width = 360; cv.height = 120; cv.style.cssText = 'width:100%;max-width:18rem;display:block;margin:auto;background:#d9c49b;border-radius:1rem';
    const cx = cv.getContext('2d'); gx.drawTracks(cx, 180, 60, correct, 1.3);
    el('div', 'tip', '🐾 Who made these?', body);
    const r = el('div', 'row c', '', body);
    for (const o of opts) btn(`<span class="big">${TRACKS[o].e}</span>`, () => {
      closeModal();
      things.splice(things.indexOf(th), 1);
      if (o === correct) { audio.sfx('success'); toast(`✅ ${TRACKS[o].n}!`); t.flags.tracks = true; discover('tracks', o); addXP('nature', 8); perf(true); }
      else { audio.sfx('bad'); toast(`❌ ${TRACKS[correct].e} ${TRACKS[correct].n}`); discover('tracks', correct); addXP('nature', 3); perf(false); }
    }, '', r);
    modal({ title: '🐾 Tracks!', body });
  },
  ranger() {
    const gift = !t.flags.rangerGift;
    const body = `<div class="bigicon">🧑‍🚒</div><div class="tip">${pick(['Store food where animals cannot reach.', 'Always drown, stir, and feel your fire.', 'Check the sky and the forecast.', 'Stay on the trail and leave no trace.'])}</div>${gift ? '<div class="tip">🎁 🪵🪵🪵</div>' : ''}`;
    if (gift) { t.flags.rangerGift = 1; t.wood.tinder.dry += 2; t.wood.kindling.dry += 4; t.wood.small.dry += 4; t.wood.log.dry += 2; }
    modal({ title: '🛖 Ranger', body, buttons: [{ label: '👋 Thanks!', cls: 'go' }] });
    audio.sfx('ok');
  },

  // ---------- update/draw ----------
  update(dt) {
    const sp = (camper.slow ? 90 : 300) * dt;
    const dx = camper.tx - camper.x, dy = camper.ty - camper.y, dd = Math.hypot(dx, dy);
    if (dd > 3) { camper.x += dx / dd * Math.min(sp, dd); camper.y += dy / dd * Math.min(sp, dd); camper.face = dx >= 0 ? 1 : -1; camper.walking = true; }
    else if (camper.walking) {
      camper.walking = false; camper.slow = false;
      if (moving) { const e = moving.e; moving = null; this.arrive(e); return; }
      const cb = camper.cb; camper.cb = null; cb && cb();
    }
    for (const th of things) {
      th.t += dt;
      if (th.type === 'animal') {
        if (th.fled) { th.x += th.face * -600 * dt; th.y -= 20 * dt; }
        else if (WILDLIFE[th.id].where === 'air' || WILDLIFE[th.id].where === 'sky') { th.x = th.bx + Math.sin(th.t * 0.6) * 120; th.y += Math.cos(th.t * 2) * 0.6; }
        else if (!camper.walking && Math.random() < dt * 0.2) th.face *= -1;
        // animals notice fast walkers nearby
        if (!th.fled && camper.walking && !camper.slow && dist(camper.x, camper.y, th.x, th.y) < 220 && WILDLIFE[th.id].shy > 0.5 && WILDLIFE[th.id].where === 'ground') { th.fled = true; audio.sfx('rustle'); toast(`${th.e}💨`); }
      }
    }
    if (t.hour >= 20.5 && !lastMsg) { lastMsg = 1; this.refreshBanner(); }
  },
  draw(c) {
    const h = t.hour, wk = wxKey(t), w = wx(t);
    gx.drawSky(c, env, h, wk); gx.drawClouds(c, env, wk, G.dt); gx.drawRanges(c, env, h, wk);
    if (node.kind === 'ridge') { drawVista(c); }
    gx.drawGround(c, env, h);
    drawNode(c, node, h, wk, t);
    gx.drawClearing(c, 800, 780, 700, 90);
    gx.drawTufts(c, env, w.wind, (x, y) => Math.abs(y - 780) < 60 || ((node.kind === 'lake' || node.kind === 'dock') && y < 600));
    const list = [];
    for (const tr of env.trees) list.push([tr.y, () => gx.drawTree(c, tr, w.wind, env.b.snow)]);
    for (const th of things) list.push([th.y, () => drawThing(c, th)]);
    list.push([camper.y, () => gx.drawCamper(c, camper.x, camper.y, { look: S.look, wear: t.wear, pose: camper.walking ? 'walk' : 'idle', face: camper.face, s: 1.1 })]);
    list.sort((a, b2) => a[0] - b2[0]);
    for (const [, fn] of list) fn();
    if (sneak && camper.slow) emo(c, '🤫', camper.x, camper.y - 160, 30);
    drawParticles(c);
    if (w.rain) gx.drawRain(c, w.rain, w.wind, G.t);
    gx.goldenHour(c, h);
    const dk = darkness(h);
    if (dk > 0.02) { gx.lighting(c, dk, lightSource() ? [{ x: camper.x, y: camper.y - 50, r: 300, col: 'rgba(255,240,190,0.4)', k: 0.9 }] : []); gx.drawNightSky(c, env, h, wk); if (!w.rain) gx.drawFireflies(c, 8, G.t); }
    else if (node.kind === 'meadow' && !G.reduce) gx.drawButterflies(c, G.t, 4);
    drawMiniMap(c, this);
  },
};
SC.explore = Explore;

function hash(s) { let h = 3; for (const ch of s) h = (h * 33 + ch.charCodeAt(0)) >>> 0; return h; }
function entryX(dir) { return dir.includes('E') ? 100 : dir.includes('W') ? 1500 : 800; }
function exitPt(dir) {
  return { x: dir.includes('E') ? G.view.x1 + 60 : dir.includes('W') ? G.view.x0 - 60 : 800, y: dir.startsWith('N') ? 540 : dir.startsWith('S') ? 900 : 780 };
}
function waterY() { return node.kind === 'creek' ? rand(600, 640) : node.kind === 'waterfall' ? 560 : rand(430, 520); }

function drawThing(c, th) {
  if (th.type === 'tracks') { gx.drawTracks(c, th.x, th.y, th.id, 1); if (hintLevel(def().expert) >= 1) emo(c, '🔍', th.x + 90, th.y - 30, 26); return; }
  if (th.type === 'ranger') {
    gx.drawCamper(c, th.x, th.y, { look: { skin: 2, hair: 0, hairStyle: 0, shirt: 2, hat: 3, pack: 1 }, pose: 'idle', s: 1.2, face: -1, pack: false });
    emo(c, '💬', th.x + 40, th.y - 180, 34); return;
  }
  if (th.type === 'animal' && th.fled && (th.x < G.view.x0 - 50 || th.x > G.view.x1 + 50)) return;
  if (th.type !== 'animal' || WILDLIFE[th.id].where === 'ground') { c.fillStyle = 'rgba(0,0,0,0.18)'; c.beginPath(); c.ellipse(th.x, th.y + 2, th.s * 0.45, th.s * 0.12, 0, 0, 7); c.fill(); }
  const bob = th.type === 'animal' ? Math.abs(Math.sin(th.t * 3)) * 3 : 0;
  emo(c, th.e, th.x, th.y - th.s * 0.45 - bob, th.s, { flip: th.face < 0, rot: th.type === 'wood' ? 0.5 : 0 });
  if (th.type === 'wood' && th.wet) emo(c, '💧', th.x + 20, th.y - 36, 16);
}

function drawVista(c) {
  c.fillStyle = 'rgba(255,255,255,0.25)'; c.fillRect(G.view.x0, 330, G.view.x1 - G.view.x0, 60);
}
function drawNode(c, n, h, wk, t) {
  const k = n.kind;
  if (k === 'lake' || k === 'dock') { const L = { cx: 900, cy: 470, rx: 760, ry: 110 }; gx.drawLake(c, L, h, wk); gx.drawLilies(c, { cx: 900, cy: 470, rx: 700, ry: 100 }); if (k === 'dock') gx.drawDock(c, 700, 560); }
  if (k === 'creek') {
    gx.drawRiver(c, [[-400, 620], [300, 600], [800, 640], [1300, 600], [2000, 630]], n.bridge ? 150 : 70, h, wk, wx(t).rain ? 15 : 0);
    if (n.bridge && t.flags.bridge) { c.fillStyle = '#8b5a2b'; for (let i = 0; i < 7; i++) { rr(c, 700 + i * 30, 530, 26, 180, 6); c.fill(); } c.strokeStyle = '#d9c9a3'; c.lineWidth = 3; c.beginPath(); c.moveTo(690, 540); c.lineTo(920, 540); c.moveTo(690, 700); c.lineTo(920, 700); c.stroke(); }
  }
  if (k === 'waterfall') {
    c.fillStyle = '#7d7f86'; c.beginPath(); c.moveTo(450, 480); c.lineTo(520, 150); c.lineTo(1080, 140); c.lineTo(1150, 480); c.fill();
    c.fillStyle = '#6a6c73'; c.beginPath(); c.moveTo(450, 480); c.lineTo(520, 150); c.lineTo(640, 150); c.lineTo(600, 480); c.fill();
    const g = c.createLinearGradient(0, 150, 0, 520); g.addColorStop(0, '#bfe6ff'); g.addColorStop(1, '#e8f7ff');
    c.fillStyle = g; c.fillRect(700, 145, 200, 360);
    c.strokeStyle = 'rgba(255,255,255,0.8)'; c.lineWidth = 3;
    for (let i = 0; i < 9; i++) { const x = 710 + i * 22, off = (G.t * 300 + i * 40) % 360; c.beginPath(); c.moveTo(x, 150 + off); c.lineTo(x, 150 + off + 40); c.stroke(); }
    gx.drawLake(c, { cx: 800, cy: 560, rx: 380, ry: 60 }, h, wk);
    if (!G.reduce && Math.random() < 0.5) emit({ x: 800 + rand(-100, 100), y: 520, vx: rand(-30, 30), vy: -rand(20, 60), life: 2, size: 12, grow: 20, color: 'rgba(255,255,255,0.35)', fadeIn: true });
    if (wk === 'sun' && h > 9 && h < 17) { c.lineWidth = 8; ['#ff6b6b', '#ffd23f', '#6bcB77', '#4d96ff', '#9b5de5'].forEach((col, i) => { c.strokeStyle = col; c.globalAlpha = 0.35; c.beginPath(); c.arc(800, 560, 260 - i * 8, Math.PI * 1.1, Math.PI * 1.9); c.stroke(); }); c.globalAlpha = 1; }
  }
  if (k === 'cave') {
    c.fillStyle = '#80776d'; c.beginPath(); c.moveTo(380, 560); c.quadraticCurveTo(500, 220, 800, 200); c.quadraticCurveTo(1100, 220, 1220, 560); c.fill();
    c.fillStyle = '#1d1a18'; c.beginPath(); c.moveTo(640, 560); c.quadraticCurveTo(650, 380, 800, 370); c.quadraticCurveTo(950, 380, 960, 560); c.fill();
    gx.drawRock(c, 470, 570, 40); gx.drawRock(c, 1150, 580, 50);
  }
  if (k === 'ranger') {
    c.fillStyle = '#8a5a33'; c.fillRect(420, 400, 320, 170); c.fillStyle = '#5d3a1f'; c.beginPath(); c.moveTo(400, 410); c.lineTo(580, 300); c.lineTo(760, 410); c.fill();
    c.fillStyle = '#ffe9a8'; c.fillRect(460, 440, 60, 50); c.fillStyle = '#4b2e17'; c.fillRect(600, 470, 50, 100);
    c.strokeStyle = '#777'; c.lineWidth = 4; c.beginPath(); c.moveTo(800, 570); c.lineTo(800, 330); c.stroke();
    c.fillStyle = '#2e86de'; c.beginPath(); c.moveTo(800, 330); c.lineTo(860, 345 + Math.sin(G.t * 5) * 4); c.lineTo(800, 360); c.fill();
  }
  if (k === 'trail') {
    c.fillStyle = '#7a5230'; c.fillRect(795, 470, 12, 140);
    c.fillStyle = '#a8743f'; rr(c, 700, 470, 200, 36, 8); c.fill(); rr(c, 720, 515, 180, 32, 8); c.fill();
    emo(c, '🏕️', 740, 488, 24); emo(c, '➡️', 870, 488, 22); emo(c, '🕳️', 760, 531, 22); emo(c, '↘️', 870, 531, 22);
  }
  if (k === 'ridge') { gx.drawRock(c, 300, 560, 60); gx.drawRock(c, 1300, 600, 70); }
}

function drawMiniMap(c, ex) {
  const x0 = G.view.x1 - 290, y0 = 90, w = 260, h = 220;
  c.fillStyle = 'rgba(247,236,214,0.92)'; rr(c, x0, y0, w, h, 18); c.fill();
  c.strokeStyle = '#8a5a33'; c.lineWidth = 3; c.stroke();
  const nodes = d.nodes, gxs = nodes.map(n => n.gx), gys = nodes.map(n => n.gy);
  const minx = Math.min(...gxs), maxx = Math.max(...gxs), miny = Math.min(...gys), maxy = Math.max(...gys);
  const px = n => x0 + 40 + (maxx === minx ? 0.5 : (n.gx - minx) / (maxx - minx)) * (w - 80);
  const py = n => y0 + 40 + (maxy === miny ? 0.5 : (n.gy - miny) / (maxy - miny)) * (h - 80);
  const show = n => has('map') || t.exp.visited[n.id] || ex.edges(node.id).some(e => e.to.id === n.id);
  c.strokeStyle = '#b08d5b'; c.lineWidth = 4; c.setLineDash([6, 6]);
  for (const [a, b2] of d.edges) { const A = ex.node(a), B = ex.node(b2); if (show(A) && show(B)) { c.beginPath(); c.moveTo(px(A), py(A)); c.lineTo(px(B), py(B)); c.stroke(); } }
  c.setLineDash([]);
  for (const n of nodes) {
    if (!show(n)) continue;
    const known = has('map') || t.exp.visited[n.id];
    c.fillStyle = n.id === node.id ? '#ffc93c' : '#fff'; c.beginPath(); c.arc(px(n), py(n), 17, 0, 7); c.fill();
    emo(c, known ? n.e : '❓', px(n), py(n), 20);
  }
  // compass rose
  const cx = x0 + w - 24, cy = y0 + h - 24;
  c.fillStyle = '#fff'; c.beginPath(); c.arc(cx, cy, 20, 0, 7); c.fill();
  if (has('compass')) {
    const wob = Math.sin(G.t * 3) * 0.08;
    c.save(); c.translate(cx, cy); c.rotate(wob);
    c.fillStyle = '#e0533d'; c.beginPath(); c.moveTo(0, -16); c.lineTo(5, 0); c.lineTo(-5, 0); c.fill();
    c.fillStyle = '#555'; c.beginPath(); c.moveTo(0, 16); c.lineTo(5, 0); c.lineTo(-5, 0); c.fill();
    c.restore();
  }
  c.fillStyle = '#2d2a26'; c.font = 'bold 14px system-ui,sans-serif'; c.textAlign = 'center'; c.fillText('N', cx, cy - 24);
}
