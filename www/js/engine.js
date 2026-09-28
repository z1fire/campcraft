// Core engine: canvas scaling, main loop, pointer input, particles, emoji sprites.
export const W = 1600, H = 900;
export const G = {
  t: 0, dt: 0, scene: null, s: 1, ox: 0, oy: 0, dpr: 1, cw: 0, ch: 0,
  view: { x0: 0, y0: 0, x1: W, y1: H }, reduce: false, canvas: null, ctx: null,
};

// ---------- math helpers ----------
export const clamp = (v, a, b) => v < a ? a : v > b ? b : v;
export const lerp = (a, b, t) => a + (b - a) * t;
export const rand = (a = 1, b) => b === undefined ? Math.random() * a : a + Math.random() * (b - a);
export const irand = (a, b) => Math.floor(rand(a, b + 1));
export const pick = arr => arr[Math.floor(Math.random() * arr.length)];
export const chance = p => Math.random() < p;
export const dist = (ax, ay, bx, by) => Math.hypot(ax - bx, ay - by);
export const ease = t => t < 0.5 ? 2 * t * t : 1 - Math.pow(-2 * t + 2, 2) / 2;
export const easeOutBack = t => { const c = 1.7; return 1 + (c + 1) * Math.pow(t - 1, 3) + c * Math.pow(t - 1, 2); };
export function shuffle(a) { a = a.slice(); for (let i = a.length - 1; i > 0; i--) { const j = Math.floor(Math.random() * (i + 1)); [a[i], a[j]] = [a[j], a[i]]; } return a; }
export function weighted(obj) {
  const ents = Object.entries(obj); let tot = 0; for (const [, w] of ents) tot += w;
  let r = Math.random() * tot; for (const [k, w] of ents) { r -= w; if (r <= 0) return k; } return ents[0][0];
}
export function rng(seed) {
  let a = seed >>> 0;
  return () => { a |= 0; a = a + 0x6D2B79F5 | 0; let t = Math.imul(a ^ a >>> 15, 1 | a); t = t + Math.imul(t ^ t >>> 7, 61 | t) ^ t; return ((t ^ t >>> 14) >>> 0) / 4294967296; };
}
export function mixColor(c1, c2, t) {
  const a = hex(c1), b = hex(c2);
  return `rgb(${Math.round(lerp(a[0], b[0], t))},${Math.round(lerp(a[1], b[1], t))},${Math.round(lerp(a[2], b[2], t))})`;
}
const hexCache = new Map();
export function hex(c) {
  let v = hexCache.get(c); if (v) return v;
  if (c.startsWith('rgb')) v = c.match(/\d+/g).slice(0, 3).map(Number);
  else { let h = c.slice(1); if (h.length === 3) h = h.split('').map(x => x + x).join(''); v = [0, 2, 4].map(i => parseInt(h.slice(i, i + 2), 16)); }
  hexCache.set(c, v); return v;
}
export function shade(c, amt) { return amt >= 0 ? mixColor(c, '#ffffff', amt) : mixColor(c, '#000000', -amt); }

// ---------- canvas / loop ----------
let ctx, canvas, last = 0;
const P = { down: false, id: null, sx: 0, sy: 0, x: 0, y: 0, drag: false, t0: 0 };
export const pointer = P;
let unlockHook = null;
export function onFirstInput(fn) { unlockHook = fn; }

export function initEngine() {
  canvas = document.getElementById('game');
  ctx = canvas.getContext('2d');
  G.canvas = canvas; G.ctx = ctx;
  addEventListener('resize', resize);
  addEventListener('orientationchange', () => setTimeout(resize, 200));
  resize();
  canvas.addEventListener('pointerdown', e => ptr('down', e));
  addEventListener('pointermove', e => ptr('move', e));
  addEventListener('pointerup', e => ptr('up', e));
  addEventListener('pointercancel', e => ptr('up', e));
  document.addEventListener('pointerdown', () => unlockHook && unlockHook(), { capture: true });
  requestAnimationFrame(frame);
}

function resize() {
  G.dpr = Math.min(window.devicePixelRatio || 1, 2);
  G.cw = window.innerWidth; G.ch = window.innerHeight;
  canvas.width = Math.round(G.cw * G.dpr); canvas.height = Math.round(G.ch * G.dpr);
  canvas.style.width = G.cw + 'px'; canvas.style.height = G.ch + 'px';
  G.s = Math.min(G.cw / W, G.ch / H);
  G.ox = (G.cw - W * G.s) / 2; G.oy = (G.ch - H * G.s) / 2;
  G.view = { x0: -G.ox / G.s, y0: -G.oy / G.s, x1: (G.cw - G.ox) / G.s, y1: (G.ch - G.oy) / G.s };
  G.scene && G.scene.resize && G.scene.resize();
}

export const toWorld = (cx, cy) => ({ x: (cx - G.ox) / G.s, y: (cy - G.oy) / G.s });
export const toScreen = (x, y) => ({ x: x * G.s + G.ox, y: y * G.s + G.oy });

function ptr(type, e) {
  const sc = G.scene; if (!sc) return;
  const w = toWorld(e.clientX, e.clientY);
  if (type === 'down') {
    if (P.down) return;
    P.down = true; P.id = e.pointerId; P.sx = w.x; P.sy = w.y; P.x = w.x; P.y = w.y; P.drag = false; P.t0 = performance.now();
    sc.onDown && sc.onDown(w.x, w.y, P);
    return;
  }
  if (!P.down || e.pointerId !== P.id) return;
  P.x = w.x; P.y = w.y;
  if (type === 'move') {
    if (!P.drag && Math.hypot(w.x - P.sx, w.y - P.sy) > 14) P.drag = true;
    sc.onMove && sc.onMove(w.x, w.y, P);
  } else {
    P.down = false;
    sc.onUp && sc.onUp(w.x, w.y, P);
    if (!P.drag && G.scene === sc) sc.onTap && sc.onTap(w.x, w.y, P);
  }
}

let errorShown = false;
function frame(ts) {
  requestAnimationFrame(frame);
  const dt = Math.min(0.05, (ts - last) / 1000 || 0); last = ts;
  G.t += dt; G.dt = dt;
  const sc = G.scene; if (!sc) return;
  try {
    sc.update && sc.update(dt);
    updateParticles(dt);
    ctx.setTransform(G.dpr * G.s, 0, 0, G.dpr * G.s, G.dpr * G.ox, G.dpr * G.oy);
    ctx.globalAlpha = 1; ctx.globalCompositeOperation = 'source-over';
    sc.draw && sc.draw(ctx);
  } catch (err) {
    console.error(err);
    if (!errorShown) { errorShown = true; const d = document.getElementById('err'); if (d) { d.textContent = '⚠️ ' + err.message; d.style.display = 'block'; } }
  }
}

export function setScene(sc, arg) {
  if (G.scene && G.scene.exit) G.scene.exit();
  particles.length = 0;
  P.down = false;
  G.scene = sc;
  sc.enter && sc.enter(arg);
}

// ---------- emoji sprites ----------
export const EMOJI_FONT = '"Noto Color Emoji","Apple Color Emoji","Segoe UI Emoji","Segoe UI Symbol",sans-serif';
const ecache = new Map();
export function emo(c, ch, x, y, size, opt) {
  const px = Math.max(12, Math.min(256, Math.ceil(size * G.s * G.dpr / 8) * 8));
  const key = ch + '|' + px;
  let img = ecache.get(key);
  if (!img) {
    img = document.createElement('canvas');
    img.width = img.height = Math.ceil(px * 1.35);
    const x2 = img.getContext('2d');
    x2.font = `${px}px ${EMOJI_FONT}`; x2.textAlign = 'center'; x2.textBaseline = 'middle';
    x2.fillText(ch, img.width / 2, img.height / 2 + px * 0.06);
    ecache.set(key, img);
    if (ecache.size > 900) ecache.delete(ecache.keys().next().value);
  }
  const d = size * 1.35;
  if (opt && (opt.flip || opt.rot || opt.sy)) {
    c.save(); c.translate(x, y);
    if (opt.rot) c.rotate(opt.rot);
    c.scale(opt.flip ? -1 : 1, opt.sy || 1);
    c.drawImage(img, -d / 2, -d / 2, d, d);
    c.restore();
  } else c.drawImage(img, x - d / 2, y - d / 2, d, d);
}

// ---------- particles ----------
export const particles = [];
export function emit(o) {
  if (G.reduce && !o.keep && particles.length > 60) return;
  if (particles.length > 700) return;
  particles.push(Object.assign({ vx: 0, vy: 0, g: 0, drag: 0, life: 1, age: 0, size: 6, grow: 0, color: '#fff', kind: 'circle', alpha: 1, layer: 0, spin: 0, rot: 0 }, o));
}
export function burst(x, y, n, o) {
  if (G.reduce) n = Math.ceil(n / 3);
  for (let i = 0; i < n; i++) {
    const a = rand(Math.PI * 2), sp = rand(o.sp0 || 60, o.sp1 || 220);
    emit(Object.assign({ x, y, vx: Math.cos(a) * sp, vy: Math.sin(a) * sp - (o.up || 0) }, o, { color: Array.isArray(o.color) ? pick(o.color) : o.color }));
  }
}
function updateParticles(dt) {
  for (let i = particles.length - 1; i >= 0; i--) {
    const p = particles[i];
    p.age += dt;
    if (p.age >= p.life) { particles.splice(i, 1); continue; }
    p.vy += p.g * dt;
    if (p.drag) { const d = Math.pow(1 - p.drag, dt * 60); p.vx *= d; p.vy *= d; }
    p.x += p.vx * dt; p.y += p.vy * dt;
    p.rot += p.spin * dt;
  }
}
export function drawParticles(c, layer = 0) {
  for (const p of particles) {
    if (p.layer !== layer) continue;
    const k = p.age / p.life;
    const a = p.alpha * (p.fadeIn ? Math.min(1, k * 5) : 1) * (1 - Math.pow(k, 2));
    const s = p.size + p.grow * p.age;
    c.globalAlpha = Math.max(0, a);
    if (p.add) c.globalCompositeOperation = 'lighter';
    if (p.kind === 'emoji') emo(c, p.e, p.x, p.y, s, p.rot ? { rot: p.rot } : null);
    else if (p.kind === 'rect') { c.save(); c.translate(p.x, p.y); c.rotate(p.rot); c.fillStyle = p.color; c.fillRect(-s / 2, -s / 4, s, s / 2); c.restore(); }
    else if (p.kind === 'line') { c.strokeStyle = p.color; c.lineWidth = p.w || 2; c.beginPath(); c.moveTo(p.x, p.y); c.lineTo(p.x - p.vx * 0.04, p.y - p.vy * 0.04); c.stroke(); }
    else if (p.kind === 'text') { c.fillStyle = p.color; c.font = `bold ${s}px system-ui,sans-serif`; c.textAlign = 'center'; c.fillText(p.text, p.x, p.y); }
    else { c.fillStyle = p.color; c.beginPath(); c.arc(p.x, p.y, Math.max(0.5, s), 0, 6.283); c.fill(); }
    c.globalCompositeOperation = 'source-over';
  }
  c.globalAlpha = 1;
}

// ---------- tiny tween helper ----------
export const tweens = [];
export function tween(dur, fn, done) { tweens.push({ t: 0, dur, fn, done }); }
export function updateTweens(dt) {
  for (let i = tweens.length - 1; i >= 0; i--) {
    const tw = tweens[i]; tw.t += dt; const k = Math.min(1, tw.t / tw.dur); tw.fn(k);
    if (k >= 1) { tweens.splice(i, 1); tw.done && tw.done(); }
  }
}

// Draw a rounded rectangle path
export function rr(c, x, y, w, h, r) {
  r = Math.min(r, w / 2, h / 2);
  c.beginPath(); c.moveTo(x + r, y); c.arcTo(x + w, y, x + w, y + h, r); c.arcTo(x + w, y + h, x, y + h, r);
  c.arcTo(x, y + h, x, y, r); c.arcTo(x, y, x + w, y, r); c.closePath();
}
