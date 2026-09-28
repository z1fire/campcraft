// Field guide, badges & skills, gear closet, settings and first aid.
import { G, W, H, emo } from './engine.js';
import { audio } from './audio.js';
import { S, save, resetSave, level, isUnlocked, unlockText, counterValue, cosmetic, addXP, count, perf } from './save.js';
import { WILDLIFE, PLANTS, FISH, ROCKS, TRACKS, BADGES, SKILLS, LEVELS, COSMETICS, ITEMS, TRIPS, LESSONS } from './data.js';
import { T, drink, def } from './sim.js';
import * as gx from './gfx.js';
import { el, btn, root, modal, closeModal, toast, stars, meterBar, lesson, speak } from './ui.js';
import { SC, go } from './nav.js';

// ---------------- Field Guide ----------------
const TABS = [
  ['wildlife', '🐾', WILDLIFE], ['plants', '🌿', PLANTS], ['fish', '🐟', FISH], ['rocks', '🪨', ROCKS], ['tracks', '👣', TRACKS], ['landmarks', '📍', null],
];
let guideFrom = 'home', guideTab = 'wildlife';
const Guide = {
  enter(arg = {}) { guideFrom = arg.from || guideFrom; this.render(); },
  back() { go(guideFrom === 'camp' && S.trip ? 'camp' : 'home'); },
  render() {
    const u = root(); u.innerHTML = '';
    const s = el('div', 'screen panelbg', '', u);
    const top = el('div', 'topbar', '', s);
    btn('⬅', () => this.back(), 'round', top);
    let found = 0, all = 0;
    for (const [k, , src] of TABS) if (src) { all += Object.keys(src).length; found += Object.keys(S.disc[k]).filter(id => src[id]).length; }
    el('div', 'title', `📖 Field Guide <span class="pill">${found}/${all}</span>`, top);
    const tabs = el('div', 'tabs', '', s);
    for (const [k, e] of TABS) btn(`${e}`, () => { guideTab = k; this.render(); }, guideTab === k ? 'sel' : '', tabs);
    const sc = el('div', 'scroll', '', s);
    const g = el('div', 'gbook', '', sc);
    const tab = TABS.find(x => x[0] === guideTab), src = tab[2];
    if (!src) {
      for (const tr of TRIPS) for (const n of tr.nodes) {
        if (n.id === 'camp') continue;
        const key = `${tr.id}:${n.id}`, known = !!S.disc.landmarks[key];
        el('div', 'gcard' + (known ? '' : ' unk'), `<div class="ce">${n.e}</div><div class="cn">${known ? n.n : '❓'}</div>`, g);
      }
      return;
    }
    for (const [id, it] of Object.entries(src)) {
      const known = !!S.disc[guideTab][id];
      const cd = el('div', 'gcard' + (known ? '' : ' unk'), `<div class="ce">${it.e || '🐟'}</div><div class="cn">${known ? it.n : '❓'}</div>`, g);
      if (guideTab === 'fish' && known) { cd.innerHTML = `<canvas width="120" height="60" style="width:100%;height:2.4rem"></canvas><div class="cn">${it.n}</div>`; gx.drawFish(cd.querySelector('canvas').getContext('2d'), 60, 30, 90, it.col, 0, 0); }
      cd.addEventListener('click', () => { audio.sfx('tap'); this.detail(guideTab, id, it, known); });
    }
  },
  detail(cat, id, it, known) {
    if (!known) { modal({ title: '❓', body: '<div class="bigicon">🔍</div><div class="tip">Not found yet. Keep exploring!</div>' }); return; }
    let extra = '';
    if (cat === 'wildlife') extra = `<div class="row c"><span class="pill">🏠 ${it.hab}</span><span class="pill">🍽️ ${it.food}</span><span class="pill">🕐 ${it.act}</span>${S.disc.photos[id] ? '<span class="pill">📸✅</span>' : ''}</div>`;
    if (cat === 'fish') extra = `<div class="row c"><span class="pill">${['⬆️', '↕️', '⬇️'][it.depth]}</span><span class="pill">${it.bait.map(b => ({ worm: '🪱', lure: '🪝', minnow: '🐟' })[b]).join('')}</span></div>`;
    const body = el('div', '', `<div class="bigicon">${it.e || '🐟'}</div>${extra}<div class="tip">${it.tip || ''}</div>`);
    if (cat === 'fish') { body.querySelector('.bigicon').innerHTML = '<canvas width="300" height="130" style="width:15rem"></canvas>'; gx.drawFish(body.querySelector('canvas').getContext('2d'), 150, 65, 220, it.col, 0, 0); }
    if (cat === 'tracks') { body.querySelector('.bigicon').innerHTML = '<canvas width="300" height="110" style="width:15rem;background:#d9c49b;border-radius:1rem"></canvas>'; gx.drawTracks(body.querySelector('canvas').getContext('2d'), 150, 55, id, 1.2); }
    modal({ title: it.n, body });
    speak(it.n + '. ' + (it.tip || ''));
  },
  draw(c) { c.fillStyle = '#ead6b3'; c.fillRect(G.view.x0, G.view.y0, G.view.x1 - G.view.x0, G.view.y1 - G.view.y0); },
};
SC.guide = Guide;

// ---------------- Badges & Skills ----------------
const Badges = {
  enter() { this.render(); },
  back() { go('home'); },
  render() {
    const u = root(); u.innerHTML = '';
    const s = el('div', 'screen panelbg', '', u);
    const top = el('div', 'topbar', '', s);
    btn('⬅', () => go('home'), 'round', top);
    el('div', 'title', `🏅 Badges <span class="pill">${Object.keys(S.badges).length}/${Object.keys(BADGES).length}</span>`, top);
    const sc = el('div', 'scroll', '', s);
    const g = el('div', 'grid', '', sc);
    for (const [id, b] of Object.entries(BADGES)) {
      const got = !!S.badges[id], v = Math.min(counterValue(b.need[0]), b.need[1]);
      const cd = el('div', 'card' + (got ? '' : ' locked'), `<div class="ce">${b.e}</div><div class="cn">${b.n}</div><div class="cn">${got ? '✅' : `${v}/${b.need[1]}`}</div>`, g);
      cd.addEventListener('click', () => { audio.sfx('tap'); toast(`${b.e} ${b.tip}`); });
    }
    el('div', 'sectitle', '⭐ Skills', sc);
    const sk = el('div', 'grid', '', sc);
    for (const [k, sd] of Object.entries(SKILLS)) {
      const lv = level(k), x = S.skills[k] || 0, lo = LEVELS[lv - 1] || 0, hi = LEVELS[lv] || LEVELS[LEVELS.length - 1];
      const pct = lv >= LEVELS.length ? 100 : (x - lo) / (hi - lo) * 100;
      el('div', 'card', `<div class="ce">${sd.e}</div><div class="cn">${sd.n}</div><div class="cn">Lv ${lv}</div>${meterBar(pct)}`, sk).querySelector('.mbar').style.width = '100%';
    }
  },
  draw(c) { c.fillStyle = '#ead6b3'; c.fillRect(G.view.x0, G.view.y0, G.view.x1 - G.view.x0, G.view.y1 - G.view.y0); },
};
SC.badges = Badges;

// ---------------- Closet / Gear ----------------
let closetTab = 'look', cenv;
const Closet = {
  enter() { cenv = gx.makeEnv('backyard', 3); this.render(); },
  back() { go('home'); },
  render() {
    const u = root(); u.innerHTML = '';
    btn('⬅', () => go('home'), 'round back-btn', u);
    const p = el('div', 'modal', '', u);
    p.style.cssText = 'position:fixed;right:calc(0.8rem + var(--safe-r));top:0.8rem;bottom:0.8rem;width:min(56vw,34rem);max-height:none';
    const tabs = el('div', 'tabs', '', p);
    for (const [k, e] of [['look', '👤 Me'], ['camp', '⛺ Camp'], ['locker', '🎒 Gear'], ['skills', '⭐ Skills']]) btn(e, () => { closetTab = k; this.render(); }, closetTab === k ? 'sel' : '', tabs);
    const body = el('div', 'scroll', '', p);
    body.style.marginTop = '0.5rem';
    const swatchRow = (title, kind, list, render) => {
      el('div', 'sectitle', title, body);
      const r = el('div', 'swatches', '', body);
      list.forEach((entry, i) => {
        const ok = isUnlocked(entry);
        const sw = el('div', 'sw' + (S.look[kind] === i ? ' sel' : '') + (ok ? '' : ' locked'), ok ? render(entry, i) : '🔒', r);
        if (typeof entry === 'string' && kind !== 'hairStyle') sw.style.background = entry;
        else if (entry.c) sw.style.background = entry.c;
        sw.addEventListener('click', () => { audio.sfx('tap'); if (!ok) { toast(`🔒 ${unlockText(entry)}`); return; } S.look[kind] = i; save(); this.render(); });
      });
    };
    if (closetTab === 'look') {
      swatchRow('🎨 Skin', 'skin', COSMETICS.skin, () => '');
      swatchRow('💇 Hair', 'hair', COSMETICS.hair, () => '');
      swatchRow('✂️ Style', 'hairStyle', COSMETICS.hairStyle, (e) => ({ short: '👦', long: '👧', puff: '🧑‍🦱' })[e]);
      swatchRow('👕 Shirt', 'shirt', COSMETICS.shirt, () => '');
      swatchRow('🧢 Hat', 'hat', COSMETICS.hat, e => ({ none: '🚫', cap: '🧢', beanie: '🧶', ranger: '🤠', bucket: '👒' })[e.id]);
      swatchRow('🎒 Pack', 'pack', COSMETICS.pack, () => '');
    } else if (closetTab === 'camp') {
      swatchRow('⛺ Tent', 'tent', COSMETICS.tent, () => '');
      swatchRow('🚩 Flag', 'flag', COSMETICS.flag, e => e.id === 'none' ? '🚫' : e.id === 'star' ? '⭐' : e.id === 'fish' ? '🐟' : '');
    } else if (closetTab === 'locker') {
      el('div', 'row c', `<span class="pill">💰 $${S.money}</span>`, body);
      const g = el('div', 'grid', '', body);
      for (const [k, it] of Object.entries(ITEMS)) {
        const q = S.owned[k] || 0;
        const cd = el('div', 'card' + (q ? '' : ' locked'), `${q > 1 ? `<span class="qty">×${q}</span>` : ''}<div class="ce">${it.e}</div><div class="cn">${it.n}</div>`, g);
        cd.addEventListener('click', () => toast(`${it.e} ${it.tip}`));
      }
    } else {
      const g = el('div', 'grid', '', body);
      for (const [k, sd] of Object.entries(SKILLS)) el('div', 'card', `<div class="ce">${sd.e}</div><div class="cn">${sd.n}</div><div>${stars(level(k), 6)}</div>`, g);
    }
  },
  draw(c) {
    const h = 11;
    gx.drawSky(c, cenv, h, 'sun'); gx.drawClouds(c, cenv, 'sun', G.dt); gx.drawRanges(c, cenv, h, 'sun'); gx.drawGround(c, cenv, h);
    gx.drawTufts(c, cenv, 0.2);
    const cx = G.view.x0 + (G.view.x1 - G.view.x0) * 0.22;
    gx.drawTent(c, cx - 60, 640, { stage: 2, staked: true, guy: true, fly: false, color: cosmetic('tent').c, flag: cosmetic('flag'), s: 1.1 });
    gx.drawCamper(c, cx + 150, 800, { look: S.look, wear: {}, pose: 'idle', s: 1.9 });
  },
};
SC.closet = Closet;

// ---------------- Settings ----------------
SC.settings = {
  open() {
    const st = S.settings, box = el('div', '');
    const slider = (label, key) => {
      const r = el('div', 'setting', `<label>${label}</label>`, box);
      const i = el('input', '', null, r); i.type = 'range'; i.min = 0; i.max = 1; i.step = 0.05; i.value = st[key];
      i.addEventListener('input', () => { st[key] = +i.value; window.applySettings(); });
    };
    const toggle = (label, key, onChange) => {
      const r = el('div', 'setting', `<label>${label}</label>`, box);
      const b = btn(st[key] ? '✅ On' : '⬜ Off', () => { st[key] = !st[key]; b.innerHTML = st[key] ? '✅ On' : '⬜ Off'; window.applySettings(); onChange && onChange(); save(); }, 'toggle', r);
    };
    slider('🎵 Music', 'music');
    slider('🔊 Sounds', 'sfx');
    const tr = el('div', 'setting', '<label>🔤 Text size</label>', box);
    const tsr = el('div', 'row', '', tr);
    [[0.85, 'A−'], [1, 'A'], [1.2, 'A+'], [1.4, 'A++']].forEach(([v, l]) => btn(l, () => { st.text = v; window.applySettings(); save(); SC.settings.open(); }, st.text === v ? 'sel' : '', tsr));
    toggle('🐢 Reduce motion', 'reduce');
    toggle('🔳 High contrast', 'contrast');
    toggle('💬 Sound captions', 'captions');
    if (window.speechSynthesis) toggle('🗣️ Read aloud', 'narrate', () => { if (st.narrate) speak('Read aloud is on'); });
    toggle('👆 Simple controls', 'simple');
    const rr = el('div', 'setting', '<label>🗑️ Reset progress</label>', box);
    btn('⚠️ Reset', () => modal({ title: '⚠️ Start over?', body: '<div class="tip">All progress will be erased.</div>', buttons: [{ label: '🗑️ Erase', cls: 'warn', onClick: () => { resetSave(); window.applySettings(); go('home'); } }, { label: '❌ Keep' }] }), 'warn', rr);
    modal({ title: '⚙️ Settings', body: box, onClose: () => save() });
  },
};

// ---------------- First aid ----------------
const AID = {
  cut: { icon: '🩸✋', n: 'Small cut', opts: ['🧼', '🩹', '🤷'], seq: ['🧼', '🩹'], wrong: 'Clean first, then cover it.' },
  scrape: { icon: '🦵🩸', n: 'Scrape', opts: ['🧼', '🩹', '🤷'], seq: ['🧼', '🩹'], wrong: 'Clean first, then cover it.' },
  bite: { icon: '🦟😖', n: 'Bug bite', opts: ['🧊', '💅', '🤷'], seq: ['🧊'], wrong: 'Scratching makes bites worse.' },
  sun: { icon: '☀️😖', n: 'Sunburn', opts: ['🌳', '💧', '🏃'], seq: ['🌳', '💧'], wrong: 'Get in the shade and drink water.' },
  dehydrated: { icon: '💧😵', n: 'Thirsty & dizzy', opts: ['💧', '🌳', '🏃'], seq: ['💧', '🌳'], wrong: 'Drink water and rest in shade.' },
};
SC.firstaid = {
  open(kind, done) {
    const t = T(), A = AID[kind]; if (!t || !A) return;
    let i = 0;
    const body = el('div', '');
    el('div', 'bigicon', A.icon, body);
    const prog = el('div', 'row c', '', body);
    const upd = () => { prog.innerHTML = A.seq.map((s, j) => `<span class="pill">${s}${j < i ? '✅' : ''}</span>`).join('➡️'); };
    upd();
    const r = el('div', 'row c', '', body);
    const finish = ok => {
      closeModal();
      if (ok) { audio.sfx('success'); toast(`${A.icon.slice(0, 2)}✅ All better!`); t.m.health = Math.min(100, t.m.health + 5); count('aid'); addXP('first_aid', 8); perf(true); if (kind === 'cut') t.ail.cut = false; if (kind === 'sun') t.ail.sun = 0; }
      else { audio.sfx('bad'); t.m.health -= 8; t.m.morale -= 5; if (kind === 'cut' || kind === 'scrape') t.ail.cut = 'ignored'; lesson('🩹', A.wrong); perf(false); }
      done && done();
    };
    for (const o of A.opts) btn(`<span class="big">${o}</span>`, () => {
      if (o === A.seq[i]) {
        if (o === '🩹' && !t.pack.first_aid) { toast('🩹❌ No first-aid kit'); i++; upd(); if (i >= A.seq.length) { addXP('first_aid', 3); finish(true); } return; }
        if (o === '💧') { const k = drink(); if (!k) { toast('🥤❌ No water!'); return; } audio.sfx('drink'); }
        audio.sfx('ok'); i++; upd();
        if (i >= A.seq.length) finish(true);
      } else finish(false);
    }, '', r);
    modal({ title: `🩹 ${A.n}!`, body, closeX: false });
    speak(A.n);
  },
};
