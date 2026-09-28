// Persistent save data, progression, badges, skills and adaptive hints.
import { START_OWNED, START_MONEY, BADGES, LEVELS, SKILLS, COSMETICS } from './data.js';

const KEY = 'campcraft_save_v1';
export let S = null;
export const hooks = { badge: null, level: null, discovery: null };

export function defaultSave() {
  return {
    v: 1,
    look: { skin: 1, hair: 0, hairStyle: 0, shirt: 0, hat: 1, pack: 0, tent: 0, flag: 1 },
    money: START_MONEY,
    owned: { ...START_OWNED },
    skills: Object.fromEntries(Object.keys(SKILLS).map(k => [k, 0])),
    disc: { wildlife: {}, plants: {}, fish: {}, rocks: {}, tracks: {}, landmarks: {}, photos: {} },
    badges: {}, counters: {}, unlocked: ['backyard'], completed: {},
    perf: [],
    settings: { music: 0.5, sfx: 0.8, reduce: false, text: 1, contrast: false, captions: false, narrate: false, simple: false },
    trip: null, lessons: {}, tutorial: {},
  };
}

export function load() {
  try {
    const raw = localStorage.getItem(KEY);
    S = raw ? migrate(JSON.parse(raw)) : defaultSave();
  } catch (e) { S = defaultSave(); }
  return S;
}
function migrate(s) {
  const d = defaultSave();
  for (const k in d) if (s[k] === undefined) s[k] = d[k];
  for (const k of ['settings', 'look', 'disc']) s[k] = Object.assign({}, d[k], s[k]);
  return s;
}
export function save() { try { localStorage.setItem(KEY, JSON.stringify(S)); } catch (e) { /* storage full or blocked */ } }
export function resetSave() { S = defaultSave(); save(); return S; }

export function count(name, n = 1) { S.counters[name] = (S.counters[name] || 0) + n; return checkBadges(); }
export function counterValue(c) { return c === 'wildlife' ? Object.keys(S.disc.wildlife).length : (S.counters[c] || 0); }
export function checkBadges() {
  const got = [];
  for (const [id, b] of Object.entries(BADGES)) {
    if (S.badges[id]) continue;
    if (counterValue(b.need[0]) >= b.need[1]) { S.badges[id] = Date.now(); got.push(id); }
  }
  got.forEach(id => hooks.badge && hooks.badge(id));
  return got;
}

export function level(skill) {
  const x = S.skills[skill] || 0; let l = 1;
  for (let i = 1; i < LEVELS.length; i++) if (x >= LEVELS[i]) l = i + 1;
  return l;
}
export function addXP(skill, n) {
  const before = level(skill);
  S.skills[skill] = (S.skills[skill] || 0) + n;
  const after = level(skill);
  if (after > before && hooks.level) hooks.level(skill, after);
}

export function discover(cat, id) {
  if (S.disc[cat][id]) return false;
  S.disc[cat][id] = Date.now();
  hooks.discovery && hooks.discovery(cat, id);
  if (cat === 'wildlife') checkBadges();
  return true;
}

// Adaptive difficulty: quietly track recent success and adjust help.
export function perf(ok) { S.perf.push(ok ? 1 : 0); if (S.perf.length > 12) S.perf.shift(); }
export function hintLevel(expert = false) {
  const p = S.perf; if (p.length < 3) return expert ? 0 : 1;
  const r = p.reduce((a, b) => a + b, 0) / p.length;
  if (r < 0.45) return 2;
  if (r > 0.8 || expert) return 0;
  return 1;
}

export function isUnlocked(entry) {
  if (!entry || !entry.unlock) return true;
  const [kind, a, b] = entry.unlock;
  if (kind === 'badge') return !!S.badges[a];
  if (kind === 'skill') return level(a) >= b;
  return true;
}
export function unlockText(entry) {
  if (!entry || !entry.unlock) return '';
  const [kind, a, b] = entry.unlock;
  return kind === 'badge' ? '🏅' : `${SKILLS[a].e} Lv${b}`;
}

export function cosmetic(kind) { return COSMETICS[kind][S.look[kind]] || COSMETICS[kind][0]; }
