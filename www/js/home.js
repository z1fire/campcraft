// Home screen: a cozy campfire at night with the main menu.
import { G, W, H, emo, drawParticles } from './engine.js';
import { audio } from './audio.js';
import { S, cosmetic } from './save.js';
import { tripById } from './data.js';
import * as gx from './gfx.js';
import { el, btn, root, modal } from './ui.js';
import { SC, go } from './nav.js';

let env;
const Home = {
  enter() {
    env = gx.makeEnv('forest', 7);
    gx.scatterTrees(env, 16, { x0: -500, x1: 2100, y0: 360, y1: 900 }, [{ x: 600, y: 650, rx: 520, ry: 260 }, { x: 1250, y: 620, rx: 420, ry: 320 }]);
    audio.setAmbience({ night: 1, fire: 0.8, wind: 0.2 });
    audio.setMusic('night');
    const u = root();
    el('div', 'home-title passthru', '<h1>Camp<span>Craft</span></h1><div>🌲 Wilderness Adventure 🏕️</div>', u);
    el('div', 'moneyp pill', `💰 $${S.money}`, u);
    const m = el('div', 'home-menu', '', u);
    if (S.trip) {
      const t = tripById(S.trip.id);
      btn(`▶ Continue <small>${t.e} Day ${S.trip.day}</small>`, () => go('camp'), 'go pulse', m);
    } else btn('▶ Play', () => go('tripmap'), 'go pulse', m);
    btn('🗺️ Trips', () => go('tripmap'), '', m);
    btn('🎒 Gear', () => go('closet'), '', m);
    btn('🏅 Badges', () => go('badges'), '', m);
    btn('📖 Guide', () => go('guide', { from: 'home' }), '', m);
    btn('⚙️ Settings', () => SC.settings.open(), '', m);
    btn('❓ About', () => modal({
      title: '🏕️ CampCraft',
      body: '<div class="tip">Plan trips, pack gear, and camp in the wild.</div><div class="tip">🔥 🍳 🎣 🧭 🐾 ⛺</div><div class="tip">Try things. Watch what happens. Learn!</div><div class="tip" style="font-size:0.8rem;opacity:0.7">Games teach basics. Real camping needs a grown-up and real safety training.</div>',
    }), '', m);
  },
  update(dt) {
    gx.fireParticles(560, 700, 0.8, 1.2);
    env.dt = dt;
  },
  draw(c) {
    const h = 21.3;
    gx.drawSky(c, env, h, 'sun');
    gx.drawRanges(c, env, h, 'sun');
    gx.drawGround(c, env, h);
    gx.drawClearing(c, 560, 720, 420, 150);
    gx.drawTufts(c, env, 0.2, (x, y) => Math.hypot((x - 560) / 380, (y - 720) / 130) < 1);
    for (const tr of env.trees) if (tr.y < 600) gx.drawTree(c, tr, 0.2);
    const look = S.look;
    gx.drawTent(c, 290, 640, { stage: 2, staked: true, fly: false, color: cosmetic('tent').c, flag: cosmetic('flag'), s: 1.1, glow: true });
    gx.drawFireRing(c, 560, 712, 1.2);
    gx.drawLogs(c, 560, 708, 1.2, 3, 0.3);
    gx.drawCamper(c, 720, 760, { look, wear: { hoodie: true }, pose: 'sit', s: 1.25, face: -1 });
    emo(c, '🍡', 668, 640, 26, { rot: -0.6 });
    for (const tr of env.trees) if (tr.y >= 600) gx.drawTree(c, tr, 0.2);
    drawParticles(c);
    gx.lighting(c, 0.62, [{ x: 560, y: 680, r: 520, col: 'rgba(255,150,60,0.9)' }, { x: 280, y: 600, r: 170, col: 'rgba(255,210,120,0.6)', k: 0.7 }]);
    gx.drawNightSky(c, env, h, 'sun');
    gx.drawFireflies(c, 12, G.t);
    gx.drawFlames(c, 560, 708, 0.8, 1.2);
  },
};
SC.home = Home;
