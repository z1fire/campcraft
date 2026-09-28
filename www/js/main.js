// Boot: load save, apply settings, wire platform hooks, start at the home screen.
import { initEngine, G, onFirstInput } from './engine.js';
import { audio } from './audio.js';
import { load, save, hooks, S } from './save.js';
import { BADGES, SKILLS, WILDLIFE, PLANTS, FISH, ROCKS, TRACKS } from './data.js';
import { celebrate, toast, caption, modalOpen, closeModal } from './ui.js';
import { SC, go } from './nav.js';
import './home.js';
import './tripmap.js';
import './camp.js';
import './tentgame.js';
import './firegame.js';
import './cookgame.js';
import './fishgame.js';
import './explore.js';
import './buildgame.js';
import './night.js';
import './menus.js';

load();

export function applySettings() {
  const st = S.settings;
  document.documentElement.style.setProperty('--ts', st.text);
  document.body.classList.toggle('contrast', !!st.contrast);
  document.body.classList.toggle('reduce', !!st.reduce);
  G.reduce = !!st.reduce;
  audio.setVolumes(st.music, st.sfx);
}
window.applySettings = applySettings;

hooks.badge = id => { const b = BADGES[id]; celebrate(b.e, b.n, b.tip); };
hooks.level = (sk, lv) => { const s = SKILLS[sk]; celebrate(s.e, `${s.n} Level ${lv}!`, '⭐'.repeat(Math.min(lv, 6))); };
hooks.discovery = (cat, id) => {
  const src = { wildlife: WILDLIFE, plants: PLANTS, fish: FISH, rocks: ROCKS, tracks: TRACKS }[cat];
  const e = src && src[id] ? (src[id].e || '🐟') : '📍';
  const n = src && src[id] ? src[id].n : id.split(':').pop();
  toast(`📖✨ <span class="big">${e}</span> ${n}`);
};
audio.onCaption = caption;

onFirstInput(() => audio.unlock());
applySettings();
initEngine();
go('home');

// autosave + lifecycle
setInterval(save, 5000);
document.addEventListener('visibilitychange', () => { if (document.hidden) { save(); audio.pause(true); } else audio.pause(false); });

const Cap = window.Capacitor;
if (Cap && Cap.Plugins && Cap.Plugins.App) {
  const App = Cap.Plugins.App;
  App.addListener('backButton', () => {
    if (modalOpen()) { closeModal(); return; }
    const sc = G.scene;
    if (sc && sc.back) sc.back();
    else if (sc === SC.home) App.exitApp();
    else go('home');
  });
  App.addListener('pause', () => { save(); audio.pause(true); });
  App.addListener('resume', () => audio.pause(false));
}
