// Procedural art: sky, terrain, trees, water, tent, camper, fire, lighting and weather.
import { G, W, H, rng, mixColor, shade, clamp, lerp, emo, rr, emit, rand } from './engine.js';
import { BIOMES, COSMETICS } from './data.js';

// ---------- environment ----------
export function makeEnv(biome, seed = 1, o = {}) {
  const b = BIOMES[biome] || BIOMES.forest, r = rng(seed);
  const env = { biome, b, r, horizon: o.horizon || 330, kind: o.kind || 'camp', clouds: [], trees: [], tufts: [], flowers: [], rocks: [], stars: [], ranges: [], flash: 0 };
  const hz = env.horizon;
  const layers = b.far.length;
  for (let l = 0; l < layers; l++) {
    const pts = [], amp = (b.peaks ? 170 : 70) * (1 - l * 0.25), base = hz - (layers - l) * (b.peaks ? 28 : 16);
    const ph = [r() * 9, r() * 9, r() * 9], fq = [0.004 + r() * 0.002, 0.011 + r() * 0.004, 0.027 + r() * 0.01];
    for (let x = -600; x <= 2200; x += 30) {
      let n = Math.sin(x * fq[0] + ph[0]) * 0.55 + Math.sin(x * fq[1] + ph[1]) * 0.3 + Math.sin(x * fq[2] + ph[2]) * 0.15;
      if (b.peaks) n = 1 - Math.abs(n) * 1.6;
      pts.push([x, base - (n * 0.5 + 0.5) * amp]);
    }
    env.ranges.push({ pts, col: b.far[l], snow: b.snow && l === 0 });
  }
  // horizon tree line
  const tl = [];
  for (let x = -600; x < 2200; x += 14 + r() * 18) tl.push({ x, h: 26 + r() * 30 });
  env.treeline = tl;
  const skyTop = x => { let m = hz - 60; for (const rg of env.ranges) { const i = clamp(Math.round((x + 600) / 30), 0, rg.pts.length - 1); m = Math.min(m, rg.pts[i][1]); } return m; };
  for (let i = 0; i < 160; i++) {
    const x = -600 + r() * 2800, y = -300 + r() * (hz + 300);
    if (y < skyTop(x) - 8) env.stars.push({ x, y, s: 0.6 + r() * 1.8, p: r() * 6 });
  }
  for (let i = 0; i < 6; i++) env.clouds.push({ x: -400 + r() * 2400, y: 40 + r() * 150, s: 0.7 + r() * 0.8, v: 6 + r() * 10 });
  for (let i = 0; i < 160; i++) env.tufts.push({ x: -600 + r() * 2800, y: hz + 20 + r() * (H + 300 - hz), s: 0.6 + r() * 0.8, p: r() * 6 });
  const fcols = ['#ff6b8b', '#ffd23f', '#ffffff', '#b28dff', '#ff9f43'];
  const fl = biome === 'mountain' ? 40 : 55;
  for (let i = 0; i < fl; i++) env.flowers.push({ x: -600 + r() * 2800, y: hz + 40 + r() * (H + 300 - hz), c: fcols[Math.floor(r() * 5)], s: 0.7 + r() * 0.6 });
  for (let i = 0; i < 14; i++) env.rocks.push({ x: -600 + r() * 2800, y: hz + 40 + r() * (H - hz), s: 10 + r() * 16 });
  return env;
}

// Add decorative trees, avoiding a list of exclusion ellipses
export function scatterTrees(env, n, area, avoid = [], big = 1) {
  const r = env.r;
  for (let i = 0; i < n; i++) {
    let x, y, ok = false, tries = 0;
    while (!ok && tries++ < 40) {
      x = area.x0 + r() * (area.x1 - area.x0); y = area.y0 + r() * (area.y1 - area.y0);
      ok = !avoid.some(a => ((x - a.x) / a.rx) ** 2 + ((y - a.y) / a.ry) ** 2 < 1);
    }
    if (!ok) continue;
    const type = env.b.trees === 'oak' ? (r() < 0.8 ? 'oak' : 'pine') : env.b.trees === 'mixed' ? (r() < 0.5 ? 'oak' : 'pine') : (r() < 0.85 ? 'pine' : 'oak');
    const depth = (y - env.horizon) / (H - env.horizon);
    env.trees.push({ x, y, h: (110 + r() * 110) * (0.55 + depth * 0.8) * big, type, p: r() * 6 });
  }
  env.trees.sort((a, b) => a.y - b.y);
}

// ---------- sky ----------
const SKY = [
  [0, '#0b1433', '#1f2d5c'], [4.5, '#0f1a40', '#2b3a70'], [6, '#4a5f9c', '#f2a36b'], [7.5, '#79aee4', '#f7d9ae'],
  [11, '#4f9be0', '#c4e6f8'], [16, '#5b9ad8', '#d7ecf5'], [18, '#6d86c9', '#f8c68a'], [19.7, '#4a4f8f', '#f28c5b'],
  [21, '#1d2555', '#4b4a82'], [24, '#0b1433', '#1f2d5c'],
];
export function skyCols(h, wxk) {
  let i = 0; while (i < SKY.length - 2 && SKY[i + 1][0] <= h) i++;
  const a = SKY[i], b = SKY[i + 1], k = clamp((h - a[0]) / (b[0] - a[0]), 0, 1);
  let top = mixColor(a[1], b[1], k), bot = mixColor(a[2], b[2], k);
  if (wxk === 'rain' || wxk === 'storm') { const g = wxk === 'storm' ? 0.65 : 0.5; top = mixColor(top, '#5d6773', g); bot = mixColor(bot, '#9aa3ab', g); }
  else if (wxk === 'cloud') { top = mixColor(top, '#8fa3b5', 0.25); bot = mixColor(bot, '#d5dde3', 0.2); }
  return [top, bot];
}

export function drawSky(c, env, hour, wxk) {
  const v = G.view, hz = env.horizon;
  const [top, bot] = skyCols(hour, wxk);
  const g = c.createLinearGradient(0, v.y0, 0, hz + 10);
  g.addColorStop(0, top); g.addColorStop(1, bot);
  c.fillStyle = g; c.fillRect(v.x0, v.y0, v.x1 - v.x0, hz + 20 - v.y0);
  // sun / moon
  const dayK = (hour - 6) / 14;
  if (dayK > -0.05 && dayK < 1.05 && wxk !== 'storm') {
    const sx = lerp(-100, W + 100, dayK), sy = hz - Math.sin(clamp(dayK, 0, 1) * Math.PI) * (hz - 60) + 20;
    const sg = c.createRadialGradient(sx, sy, 0, sx, sy, 120);
    const warm = hour > 17 || hour < 8;
    sg.addColorStop(0, warm ? 'rgba(255,220,150,0.9)' : 'rgba(255,255,220,0.9)'); sg.addColorStop(1, 'rgba(255,230,160,0)');
    c.globalAlpha = wxk === 'rain' ? 0.25 : wxk === 'cloud' ? 0.6 : 1;
    c.fillStyle = sg; c.beginPath(); c.arc(sx, sy, 120, 0, 7); c.fill();
    c.fillStyle = warm ? '#ffcf7a' : '#fff6c8'; c.beginPath(); c.arc(sx, sy, 34, 0, 7); c.fill();
    c.globalAlpha = 1;
  }
}

export function drawNightSky(c, env, hour, wxk) {
  // stars & moon drawn after lighting overlay
  const n = hour >= 20 ? clamp((hour - 20) / 1.5, 0, 1) : hour < 5.5 ? 1 : hour < 6.5 ? 1 - (hour - 5.5) : 0;
  if (n <= 0 || wxk === 'rain' || wxk === 'storm') return;
  const cloudy = wxk === 'cloud' ? 0.35 : 1;
  for (const s of env.stars) {
    c.globalAlpha = n * cloudy * (0.5 + 0.5 * Math.sin(G.t * 2 + s.p));
    c.fillStyle = '#fffbe8'; c.beginPath(); c.arc(s.x, s.y, s.s, 0, 7); c.fill();
  }
  const mx = 1250, my = 110;
  c.globalAlpha = n * (wxk === 'cloud' ? 0.5 : 1);
  const mg = c.createRadialGradient(mx, my, 10, mx, my, 110); mg.addColorStop(0, 'rgba(220,230,255,0.45)'); mg.addColorStop(1, 'rgba(220,230,255,0)');
  c.fillStyle = mg; c.beginPath(); c.arc(mx, my, 110, 0, 7); c.fill();
  c.fillStyle = '#f4f1dc'; c.beginPath(); c.arc(mx, my, 30, 0, 7); c.fill();
  c.fillStyle = 'rgba(0,0,0,0.12)'; c.beginPath(); c.arc(mx - 8, my - 6, 6, 0, 7); c.arc(mx + 10, my + 8, 4, 0, 7); c.fill();
  c.globalAlpha = 1;
}

export function drawClouds(c, env, wxk, dt) {
  const n = wxk === 'sun' ? 3 : 6, dark = wxk === 'rain' || wxk === 'storm';
  for (let i = 0; i < n; i++) {
    const cl = env.clouds[i];
    cl.x += cl.v * dt * (wxk === 'wind' || wxk === 'storm' ? 4 : 1);
    if (cl.x > G.view.x1 + 250) cl.x = G.view.x0 - 250;
    const s = cl.s * (dark ? 1.5 : 1);
    c.fillStyle = dark ? (wxk === 'storm' ? '#4d5561' : '#7d8792') : 'rgba(255,255,255,0.92)';
    c.beginPath();
    c.ellipse(cl.x, cl.y, 70 * s, 28 * s, 0, 0, 7); c.ellipse(cl.x - 50 * s, cl.y + 8 * s, 45 * s, 22 * s, 0, 0, 7);
    c.ellipse(cl.x + 55 * s, cl.y + 6 * s, 50 * s, 22 * s, 0, 0, 7); c.ellipse(cl.x + 10 * s, cl.y - 20 * s, 42 * s, 28 * s, 0, 0, 7);
    c.fill();
    c.fillStyle = dark ? 'rgba(0,0,0,0.15)' : 'rgba(170,190,215,0.35)';
    c.beginPath(); c.ellipse(cl.x, cl.y + 14 * s, 80 * s, 12 * s, 0, 0, 7); c.fill();
  }
}

export function drawRanges(c, env, hour, wxk) {
  const [, bot] = skyCols(hour, wxk);
  env.ranges.forEach((rg, i) => {
    const col = mixColor(rg.col, bot, 0.35 - i * 0.1);
    c.fillStyle = col; c.beginPath(); c.moveTo(-600, env.horizon + 30);
    for (const [x, y] of rg.pts) c.lineTo(x, y);
    c.lineTo(2200, env.horizon + 30); c.closePath(); c.fill();
    if (rg.snow) {
      c.fillStyle = mixColor('#ffffff', bot, 0.2);
      for (let j = 1; j < rg.pts.length - 1; j++) {
        const [x, y] = rg.pts[j];
        if (y < rg.pts[j - 1][1] && y < rg.pts[j + 1][1] && y < env.horizon - 120) {
          c.beginPath(); c.moveTo(x - 36, y + 34); c.lineTo(x, y); c.lineTo(x + 36, y + 34); c.lineTo(x + 12, y + 26); c.lineTo(x, y + 38); c.lineTo(x - 12, y + 26); c.closePath(); c.fill();
        }
      }
    }
  });
  // tree line
  const tc = mixColor(env.b.far[env.b.far.length - 1], '#1f4a2e', 0.5);
  c.fillStyle = mixColor(tc, bot, 0.15);
  c.beginPath(); c.moveTo(-600, env.horizon + 20);
  for (const t of env.treeline) { c.lineTo(t.x - 8, env.horizon + 4); c.lineTo(t.x, env.horizon - t.h); c.lineTo(t.x + 8, env.horizon + 4); }
  c.lineTo(2200, env.horizon + 20); c.closePath(); c.fill();
}

export function drawGround(c, env, hour) {
  const v = G.view, hz = env.horizon, [g1, g2] = env.b.grass;
  const g = c.createLinearGradient(0, hz, 0, v.y1);
  g.addColorStop(0, shade(g1, -0.08)); g.addColorStop(0.35, g1); g.addColorStop(1, g2);
  c.fillStyle = g; c.fillRect(v.x0, hz, v.x1 - v.x0, v.y1 - hz + 2);
  // morning mist
  if (hour > 5.5 && hour < 9) {
    const a = (1 - Math.abs(hour - 7) / 2) * 0.35;
    const mg = c.createLinearGradient(0, hz - 40, 0, hz + 120);
    mg.addColorStop(0, 'rgba(255,255,255,0)'); mg.addColorStop(0.5, `rgba(255,255,255,${a})`); mg.addColorStop(1, 'rgba(255,255,255,0)');
    c.fillStyle = mg; c.fillRect(v.x0, hz - 40, v.x1 - v.x0, 160);
  }
}

export function drawClearing(c, x, y, rx, ry) {
  const g = c.createRadialGradient(x, y, 10, x, y, rx);
  g.addColorStop(0, 'rgba(170,130,85,0.55)'); g.addColorStop(0.7, 'rgba(160,125,80,0.35)'); g.addColorStop(1, 'rgba(160,125,80,0)');
  c.fillStyle = g; c.save(); c.translate(x, y); c.scale(1, ry / rx); c.beginPath(); c.arc(0, 0, rx, 0, 7); c.fill(); c.restore();
}

export function drawTufts(c, env, wind, avoid) {
  const t = G.t, sway = G.reduce ? 0 : 1;
  c.lineCap = 'round';
  const [g1] = env.b.grass;
  const dark = shade(g1, -0.3), light = shade(g1, 0.15);
  for (const tf of env.tufts) {
    if (tf.x < G.view.x0 - 20 || tf.x > G.view.x1 + 20) continue;
    if (avoid && avoid(tf.x, tf.y)) continue;
    const s = tf.s, sw = Math.sin(t * 1.6 + tf.p + tf.x * 0.01) * (3 + wind * 5) * sway;
    c.strokeStyle = dark; c.lineWidth = 2.2 * s;
    c.beginPath();
    for (let i = -1; i <= 1; i++) { c.moveTo(tf.x + i * 4 * s, tf.y); c.quadraticCurveTo(tf.x + i * 6 * s, tf.y - 9 * s, tf.x + i * 8 * s + sw, tf.y - (15 - Math.abs(i) * 3) * s); }
    c.stroke();
    c.strokeStyle = light; c.lineWidth = 1.2 * s; c.beginPath(); c.moveTo(tf.x, tf.y); c.quadraticCurveTo(tf.x + 1, tf.y - 8 * s, tf.x + sw, tf.y - 15 * s); c.stroke();
  }
  for (const f of env.flowers) {
    if (avoid && avoid(f.x, f.y)) continue;
    const sw = Math.sin(t * 1.4 + f.x) * 2 * sway;
    c.strokeStyle = dark; c.lineWidth = 1.5; c.beginPath(); c.moveTo(f.x, f.y); c.lineTo(f.x + sw, f.y - 12 * f.s); c.stroke();
    c.fillStyle = f.c;
    for (let k = 0; k < 5; k++) { const a = k * 1.256; c.beginPath(); c.arc(f.x + sw + Math.cos(a) * 3.5 * f.s, f.y - 12 * f.s + Math.sin(a) * 3.5 * f.s, 2.6 * f.s, 0, 7); c.fill(); }
    c.fillStyle = '#ffd23f'; c.beginPath(); c.arc(f.x + sw, f.y - 12 * f.s, 2 * f.s, 0, 7); c.fill();
  }
}

export function drawRock(c, x, y, s, col = '#8d9299') {
  c.fillStyle = 'rgba(0,0,0,0.18)'; c.beginPath(); c.ellipse(x + 3, y + 2, s * 1.1, s * 0.35, 0, 0, 7); c.fill();
  c.fillStyle = col; c.beginPath();
  c.moveTo(x - s, y); c.quadraticCurveTo(x - s * 0.9, y - s * 0.8, x - s * 0.2, y - s * 0.9); c.quadraticCurveTo(x + s * 0.8, y - s * 0.8, x + s, y); c.closePath(); c.fill();
  c.fillStyle = shade(col, 0.25); c.beginPath(); c.ellipse(x - s * 0.35, y - s * 0.55, s * 0.35, s * 0.18, -0.3, 0, 7); c.fill();
}

// ---------- trees ----------
export function drawTree(c, tr, wind = 0, snow = false) {
  const sway = G.reduce ? 0 : Math.sin(G.t * 1.3 + tr.p) * (1.5 + wind * 4) * (tr.h / 150);
  c.fillStyle = 'rgba(0,0,0,0.16)'; c.beginPath(); c.ellipse(tr.x + tr.h * 0.1, tr.y + 2, tr.h * 0.32, tr.h * 0.07, 0, 0, 7); c.fill();
  if (tr.type === 'pine') drawPine(c, tr.x, tr.y, tr.h, sway, snow);
  else if (tr.type === 'dead') drawDead(c, tr.x, tr.y, tr.h, sway);
  else drawOak(c, tr.x, tr.y, tr.h, sway);
}
export function drawPine(c, x, y, h, sway, snow) {
  c.fillStyle = '#6b4a2f'; c.fillRect(x - h * 0.035, y - h * 0.16, h * 0.07, h * 0.17);
  const base = '#2f6e3e', lite = '#4c9a55', dk = '#245632';
  for (let i = 0; i < 4; i++) {
    const ty = y - h * 0.12 - i * h * 0.19, tw = h * 0.3 * (1 - i * 0.2), top = ty - h * 0.32, s = sway * (i + 1) * 0.5;
    c.fillStyle = dk; c.beginPath(); c.moveTo(x - tw, ty); c.lineTo(x + tw, ty); c.lineTo(x + s, top); c.closePath(); c.fill();
    c.fillStyle = base; c.beginPath(); c.moveTo(x - tw, ty); c.lineTo(x + tw * 0.55, ty - 3); c.lineTo(x + s, top); c.closePath(); c.fill();
    c.fillStyle = lite; c.beginPath(); c.moveTo(x - tw, ty); c.lineTo(x - tw * 0.2, ty - 4); c.lineTo(x + s, top); c.closePath(); c.fill();
    if (snow && i === 3) { c.fillStyle = '#f3f7fb'; c.beginPath(); c.moveTo(x + s - tw * 0.35, top + h * 0.1); c.lineTo(x + s, top); c.lineTo(x + s + tw * 0.35, top + h * 0.1); c.closePath(); c.fill(); }
  }
}
export function drawOak(c, x, y, h, sway) {
  c.fillStyle = '#6d4c33';
  c.beginPath(); c.moveTo(x - h * 0.06, y); c.lineTo(x - h * 0.035, y - h * 0.45); c.lineTo(x + h * 0.035, y - h * 0.45); c.lineTo(x + h * 0.06, y); c.closePath(); c.fill();
  const cx = x + sway, cy = y - h * 0.62, r = h * 0.2;
  const blobs = [[0, 0, 1.2], [-1, 0.35, 0.9], [1, 0.3, 0.95], [-0.55, -0.6, 0.85], [0.6, -0.55, 0.85], [0, -0.95, 0.75]];
  c.fillStyle = '#2f7a3b'; c.beginPath(); for (const [bx, by, bs] of blobs) c.arc(cx + bx * r, cy + by * r, r * bs, 0, 7); c.fill();
  c.fillStyle = '#48a04f'; c.beginPath(); for (const [bx, by, bs] of blobs) c.arc(cx + bx * r - r * 0.18, cy + by * r - r * 0.2, r * bs * 0.72, 0, 7); c.fill();
  c.fillStyle = '#6cc26a'; c.beginPath(); c.arc(cx - r * 0.6, cy - r * 0.75, r * 0.4, 0, 7); c.arc(cx + r * 0.1, cy - r * 1.05, r * 0.3, 0, 7); c.fill();
}
export function drawDead(c, x, y, h, sway) {
  c.strokeStyle = '#7b7066'; c.lineCap = 'round';
  c.lineWidth = h * 0.08; c.beginPath(); c.moveTo(x, y); c.lineTo(x + sway * 0.3, y - h); c.stroke();
  c.lineWidth = h * 0.035;
  c.beginPath(); c.moveTo(x, y - h * 0.55); c.lineTo(x - h * 0.28, y - h * 0.78); c.moveTo(x, y - h * 0.8); c.lineTo(x + h * 0.2, y - h * 0.98); c.stroke();
  // the dangerous hanging branch
  c.lineWidth = h * 0.04; c.strokeStyle = '#8a7e72';
  c.beginPath(); c.moveTo(x, y - h * 0.68); c.lineTo(x + h * 0.55 + sway, y - h * 0.62); c.lineTo(x + h * 0.62 + sway * 1.5, y - h * 0.4); c.stroke();
  c.strokeStyle = '#5e5349'; c.lineWidth = 2; c.beginPath(); c.moveTo(x + h * 0.02, y - h * 0.3); c.lineTo(x - h * 0.02, y - h * 0.2); c.stroke();
}

// ---------- water ----------
export function drawLake(c, L, hour, wxk) {
  const t = G.t;
  c.fillStyle = '#d9c28f'; c.beginPath(); c.ellipse(L.cx, L.cy, L.rx + 22, L.ry + 14, 0, 0, 7); c.fill();
  const [top, bot] = skyCols(hour, wxk);
  const g = c.createLinearGradient(0, L.cy - L.ry, 0, L.cy + L.ry);
  g.addColorStop(0, mixColor('#3f8fb5', bot, 0.35)); g.addColorStop(1, mixColor('#2a6f95', top, 0.25));
  c.fillStyle = g; c.beginPath(); c.ellipse(L.cx, L.cy, L.rx, L.ry, 0, 0, 7); c.fill();
  c.save(); c.beginPath(); c.ellipse(L.cx, L.cy, L.rx, L.ry, 0, 0, 7); c.clip();
  c.strokeStyle = 'rgba(255,255,255,0.35)'; c.lineWidth = 2;
  for (let i = 0; i < 14; i++) {
    const px = L.cx - L.rx + ((i * 97 + t * 14) % (L.rx * 2)), py = L.cy - L.ry * 0.7 + (i * 37 % (L.ry * 1.4));
    const w = 18 + (i % 4) * 8;
    c.globalAlpha = 0.3 + 0.3 * Math.sin(t * 1.5 + i);
    c.beginPath(); c.moveTo(px - w, py); c.quadraticCurveTo(px, py - 3, px + w, py); c.stroke();
  }
  c.globalAlpha = 1;
  c.restore();
}
export function drawLilies(c, L) {
  const pads = [[-0.6, 0.35], [-0.5, 0.5], [0.4, 0.55], [-0.75, 0.1]];
  for (const [a, b] of pads) {
    const x = L.cx + a * L.rx, y = L.cy + b * L.ry;
    c.fillStyle = '#3f9a4b'; c.beginPath(); c.ellipse(x, y, 13, 6, 0, 0.3, 6.0); c.lineTo(x, y); c.fill();
  }
  for (let i = 0; i < 9; i++) {
    const x = L.cx - L.rx * 0.95 + i * 12, y = L.cy + L.ry * 0.25 + Math.sin(i) * 12;
    reed(c, x, y + 8, 38 + (i % 3) * 10);
  }
}
export function reed(c, x, y, h) {
  const sw = G.reduce ? 0 : Math.sin(G.t * 1.5 + x) * 3;
  c.strokeStyle = '#4f7d38'; c.lineWidth = 2.5; c.beginPath(); c.moveTo(x, y); c.quadraticCurveTo(x, y - h * 0.5, x + sw, y - h); c.stroke();
  c.fillStyle = '#6b4226'; c.beginPath(); c.ellipse(x + sw * 0.8, y - h * 0.8, 3.5, 9, 0, 0, 7); c.fill();
}

// River: curvy band from top-right to bottom-right
export const RIVER = [[1360, 330], [1290, 440], [1330, 560], [1260, 700], [1330, 820], [1300, 960]];
export function drawRiver(c, pts, width, hour, wxk, flood = 0) {
  const [top, bot] = skyCols(hour, wxk);
  const band = (wd, col) => {
    c.strokeStyle = col; c.lineWidth = wd; c.lineCap = 'round'; c.lineJoin = 'round';
    c.beginPath(); c.moveTo(pts[0][0], pts[0][1]);
    for (let i = 1; i < pts.length - 1; i++) { const mx = (pts[i][0] + pts[i + 1][0]) / 2, my = (pts[i][1] + pts[i + 1][1]) / 2; c.quadraticCurveTo(pts[i][0], pts[i][1], mx, my); }
    c.lineTo(pts[pts.length - 1][0], pts[pts.length - 1][1]); c.stroke();
  };
  band(width + 34 + flood, '#cdb584');
  band(width + flood, mixColor('#3a88b0', bot, 0.3));
  band(width * 0.45, mixColor('#5aa7cc', top, 0.2));
  c.setLineDash([18, 30]); c.lineDashOffset = -G.t * 60;
  c.globalAlpha = 0.5; band(3, '#ffffff'); c.setLineDash([]); c.globalAlpha = 1;
}

// ---------- camp props ----------
export function drawFireRing(c, x, y, s = 1) {
  c.fillStyle = 'rgba(0,0,0,0.25)'; c.beginPath(); c.ellipse(x, y + 4 * s, 66 * s, 26 * s, 0, 0, 7); c.fill();
  c.fillStyle = '#4a3a30'; c.beginPath(); c.ellipse(x, y, 50 * s, 18 * s, 0, 0, 7); c.fill();
  c.fillStyle = '#2d2420'; c.beginPath(); c.ellipse(x, y + 2 * s, 38 * s, 12 * s, 0, 0, 7); c.fill();
  for (let i = 0; i < 12; i++) {
    const a = i / 12 * Math.PI * 2, rx = x + Math.cos(a) * 54 * s, ry = y + Math.sin(a) * 21 * s;
    const col = i % 3 === 0 ? '#9aa0a6' : i % 3 === 1 ? '#80868c' : '#a7a29a';
    c.fillStyle = shade(col, -0.2); c.beginPath(); c.ellipse(rx, ry + 3 * s, 12 * s, 8 * s, 0, 0, 7); c.fill();
    c.fillStyle = col; c.beginPath(); c.ellipse(rx, ry, 12 * s, 8 * s, 0, 0, 7); c.fill();
    c.fillStyle = shade(col, 0.3); c.beginPath(); c.ellipse(rx - 3 * s, ry - 3 * s, 4 * s, 2.5 * s, 0, 0, 7); c.fill();
  }
}
export function drawLogs(c, x, y, s = 1, n = 3, charred = 0) {
  const col = mixColor('#8b5a2b', '#2b1d14', charred);
  for (let i = 0; i < n; i++) {
    const a = (i / n) * Math.PI - Math.PI / 2 + 0.3;
    c.save(); c.translate(x, y - 6 * s); c.rotate(Math.cos(a) * 0.9);
    c.fillStyle = col; rr(c, -36 * s, -6 * s, 72 * s, 12 * s, 6 * s); c.fill();
    c.fillStyle = shade(col, 0.2); c.fillRect(-30 * s, -5 * s, 60 * s, 3 * s);
    c.restore();
  }
}
export function drawFlames(c, x, y, level, s = 1) {
  const t = G.t;
  if (level < 0) { // glowing embers
    const k = -level;
    for (let i = 0; i < 9; i++) {
      const px = x + Math.cos(i * 2.1) * 22 * s, py = y + Math.sin(i * 1.7) * 6 * s - 2 * s;
      const a = k * (0.5 + 0.5 * Math.sin(t * 3 + i));
      c.fillStyle = `rgba(255,${80 + i * 10},30,${a})`; c.beginPath(); c.arc(px, py, (4 + (i % 3) * 2) * s, 0, 7); c.fill();
    }
    return;
  }
  if (level <= 0) return;
  c.save(); c.globalCompositeOperation = 'lighter';
  const glow = c.createRadialGradient(x, y - 30 * s, 5, x, y - 30 * s, 140 * s * level + 40);
  glow.addColorStop(0, `rgba(255,150,50,${0.35 * level})`); glow.addColorStop(1, 'rgba(255,120,40,0)');
  c.fillStyle = glow; c.beginPath(); c.arc(x, y - 30 * s, 140 * s * level + 40, 0, 7); c.fill();
  c.globalCompositeOperation = 'source-over';
  const layers = [['rgba(255,80,20,0.85)', 1], ['rgba(255,160,40,0.9)', 0.72], ['rgba(255,230,120,0.95)', 0.45]];
  for (const [col, k] of layers) {
    c.fillStyle = col;
    for (let i = -2; i <= 2; i++) {
      const fl = Math.sin(t * 9 + i * 1.7) * 0.18 + Math.sin(t * 15 + i) * 0.1;
      const hgt = (40 + level * 95) * s * k * (1 - Math.abs(i) * 0.22) * (1 + fl);
      const wdt = (14 + level * 10) * s * k * (1 - Math.abs(i) * 0.1);
      const bx = x + i * 13 * s * (0.6 + level * 0.4), sw = Math.sin(t * 5 + i) * 6 * s;
      c.beginPath(); c.moveTo(bx - wdt, y - 4 * s);
      c.quadraticCurveTo(bx - wdt * 0.9, y - hgt * 0.5, bx + sw, y - hgt);
      c.quadraticCurveTo(bx + wdt * 0.9, y - hgt * 0.5, bx + wdt, y - 4 * s); c.closePath(); c.fill();
    }
  }
  c.restore();
}
export function fireParticles(x, y, level, s = 1, smoky = 0) {
  if (level > 0 && Math.random() < 0.3 * level) emit({ x: x + rand(-20, 20) * s, y: y - 30 * s, vx: rand(-20, 20), vy: rand(-120, -60) * s, life: rand(0.6, 1.3), size: 1.8 * s, color: '#ffc864', add: true, drag: 0.02 });
  const sm = level > 0 ? 0.08 + smoky * 0.5 : level < 0 ? 0.03 : 0;
  if (Math.random() < sm) emit({ x: x + rand(-10, 10) * s, y: y - (40 + Math.max(0, level) * 70) * s, vx: rand(-8, 8) + 12, vy: rand(-45, -25), life: rand(2.5, 4), size: 8 * s, grow: 12 * s, color: smoky > 0.3 ? 'rgba(90,90,90,0.5)' : 'rgba(200,200,200,0.35)', fadeIn: true });
}

export function drawCooler(c, x, y, s = 1, open = false) {
  c.fillStyle = 'rgba(0,0,0,0.2)'; c.beginPath(); c.ellipse(x, y + 2, 34 * s, 9 * s, 0, 0, 7); c.fill();
  c.fillStyle = '#2f80c9'; rr(c, x - 30 * s, y - 38 * s, 60 * s, 38 * s, 6 * s); c.fill();
  c.fillStyle = '#ffffff'; rr(c, x - 32 * s, y - (open ? 60 : 46) * s, 64 * s, 12 * s, 5 * s); c.fill();
  c.fillStyle = '#1f5f96'; c.fillRect(x - 30 * s, y - 14 * s, 60 * s, 4 * s);
  c.fillStyle = '#e9eef2'; rr(c, x - 10 * s, y - 30 * s, 20 * s, 6 * s, 3 * s); c.fill();
}
export function drawBag(c, x, y, s = 1, col = '#2f4a2f') {
  c.fillStyle = 'rgba(0,0,0,0.2)'; c.beginPath(); c.ellipse(x, y + 2, 24 * s, 7 * s, 0, 0, 7); c.fill();
  c.fillStyle = col; c.beginPath(); c.moveTo(x - 22 * s, y); c.quadraticCurveTo(x - 28 * s, y - 34 * s, x - 6 * s, y - 42 * s);
  c.lineTo(x + 6 * s, y - 42 * s); c.quadraticCurveTo(x + 28 * s, y - 34 * s, x + 22 * s, y); c.closePath(); c.fill();
  c.fillStyle = shade(col, 0.2); c.beginPath(); c.moveTo(x - 6 * s, y - 42 * s); c.lineTo(x, y - 52 * s); c.lineTo(x + 6 * s, y - 42 * s); c.fill();
  c.fillStyle = shade(col, 0.15); c.beginPath(); c.ellipse(x - 9 * s, y - 24 * s, 5 * s, 10 * s, 0.3, 0, 7); c.fill();
}
export function drawWoodpile(c, x, y, s = 1, n = 6, wet = false) {
  c.fillStyle = 'rgba(0,0,0,0.2)'; c.beginPath(); c.ellipse(x, y + 2, 44 * s, 10 * s, 0, 0, 7); c.fill();
  n = Math.max(0, Math.min(10, n));
  const rows = [4, 3, 2, 1]; let k = 0;
  for (let r = 0; r < rows.length && k < n; r++) {
    for (let i = 0; i < rows[r] && k < n; i++, k++) {
      const lx = x + (i - (rows[r] - 1) / 2) * 20 * s, ly = y - 9 * s - r * 16 * s;
      c.fillStyle = wet ? '#5a4332' : '#8b5a2b'; c.beginPath(); c.arc(lx, ly, 10 * s, 0, 7); c.fill();
      c.fillStyle = wet ? '#8a7560' : '#e0b27a'; c.beginPath(); c.arc(lx, ly, 7 * s, 0, 7); c.fill();
      c.strokeStyle = wet ? '#6e5a47' : '#b98752'; c.lineWidth = 1; c.beginPath(); c.arc(lx, ly, 3.5 * s, 0, 7); c.stroke();
    }
  }
  if (wet) { c.fillStyle = 'rgba(120,170,220,0.6)'; for (let i = 0; i < 3; i++) { c.beginPath(); c.ellipse(x - 15 + i * 15, y - 30 * s + (G.t * 20 + i * 10) % 20, 2, 3.5, 0, 0, 7); c.fill(); } }
}
export function drawBearBox(c, x, y, s = 1) {
  c.fillStyle = 'rgba(0,0,0,0.25)'; c.beginPath(); c.ellipse(x, y + 3, 56 * s, 12 * s, 0, 0, 7); c.fill();
  c.fillStyle = '#6b5b4b'; c.fillRect(x - 50 * s, y - 50 * s, 100 * s, 50 * s);
  c.fillStyle = '#806e5c'; c.fillRect(x - 54 * s, y - 58 * s, 108 * s, 10 * s);
  c.fillStyle = '#c9c2b8'; c.fillRect(x - 12 * s, y - 40 * s, 24 * s, 6 * s);
  c.fillStyle = '#3d342b'; for (let i = -40; i <= 40; i += 20) c.fillRect(x + i * s - 1, y - 48 * s, 2, 46 * s);
  emo(c, '🐻', x + 32 * s, y - 25 * s, 16 * s);
}
export function drawTrashCan(c, x, y, s = 1) {
  c.fillStyle = 'rgba(0,0,0,0.2)'; c.beginPath(); c.ellipse(x, y + 2, 26 * s, 7 * s, 0, 0, 7); c.fill();
  c.fillStyle = '#2e7d4f'; c.beginPath(); c.moveTo(x - 20 * s, y - 50 * s); c.lineTo(x + 20 * s, y - 50 * s); c.lineTo(x + 16 * s, y); c.lineTo(x - 16 * s, y); c.closePath(); c.fill();
  c.fillStyle = '#256b42'; rr(c, x - 24 * s, y - 58 * s, 48 * s, 10 * s, 4 * s); c.fill();
  emo(c, '♻️', x, y - 26 * s, 16 * s);
}
export function drawFaucet(c, x, y, s = 1, running = false) {
  c.fillStyle = 'rgba(0,0,0,0.2)'; c.beginPath(); c.ellipse(x, y + 2, 18 * s, 5 * s, 0, 0, 7); c.fill();
  c.fillStyle = '#7f8c8d'; c.fillRect(x - 5 * s, y - 70 * s, 10 * s, 70 * s);
  c.fillStyle = '#95a5a6'; c.fillRect(x - 5 * s, y - 70 * s, 24 * s, 9 * s); c.fillRect(x + 12 * s, y - 70 * s, 7 * s, 16 * s);
  c.fillStyle = '#c0392b'; c.beginPath(); c.arc(x, y - 76 * s, 6 * s, 0, 7); c.fill();
  c.fillStyle = '#8d9aa0'; c.beginPath(); c.ellipse(x + 15 * s, y, 16 * s, 5 * s, 0, 0, 7); c.fill();
  if (running) { c.fillStyle = 'rgba(120,190,255,0.8)'; c.fillRect(x + 13 * s, y - 54 * s, 4 * s, 52 * s); }
}
export function drawTable(c, x, y, s = 1) {
  c.fillStyle = 'rgba(0,0,0,0.2)'; c.beginPath(); c.ellipse(x, y + 4, 80 * s, 16 * s, 0, 0, 7); c.fill();
  c.fillStyle = '#7a5230';
  c.fillRect(x - 60 * s, y - 40 * s, 8 * s, 40 * s); c.fillRect(x + 52 * s, y - 40 * s, 8 * s, 40 * s);
  c.fillStyle = '#9c6b3f'; c.fillRect(x - 78 * s, y - 16 * s, 156 * s, 8 * s);
  c.fillStyle = '#b07a48'; c.beginPath(); c.moveTo(x - 80 * s, y - 44 * s); c.lineTo(x + 80 * s, y - 44 * s); c.lineTo(x + 70 * s, y - 62 * s); c.lineTo(x - 70 * s, y - 62 * s); c.closePath(); c.fill();
  c.strokeStyle = '#8a5a30'; c.lineWidth = 1.5; for (let i = -1; i <= 1; i++) { c.beginPath(); c.moveTo(x - 76 * s, y - 50 * s + i * 5 * s); c.lineTo(x + 76 * s, y - 50 * s + i * 5 * s); c.stroke(); }
}
export function drawHouse(c, x, y) {
  c.fillStyle = '#e8d8c3'; c.fillRect(x - 170, y - 150, 340, 150);
  c.fillStyle = '#b5523b'; c.beginPath(); c.moveTo(x - 195, y - 145); c.lineTo(x, y - 255); c.lineTo(x + 195, y - 145); c.closePath(); c.fill();
  c.fillStyle = '#ffe9a8'; c.fillRect(x - 130, y - 110, 60, 50); c.fillRect(x + 70, y - 110, 60, 50);
  c.strokeStyle = '#8b6b4b'; c.lineWidth = 4; c.strokeRect(x - 130, y - 110, 60, 50); c.strokeRect(x + 70, y - 110, 60, 50);
  c.fillStyle = '#7a4b2a'; c.fillRect(x - 22, y - 90, 44, 90);
}
export function drawFence(c, y, x0, x1) {
  c.fillStyle = '#f1ece2';
  for (let x = x0; x < x1; x += 34) { c.beginPath(); c.moveTo(x, y); c.lineTo(x, y - 50); c.lineTo(x + 11, y - 60); c.lineTo(x + 22, y - 50); c.lineTo(x + 22, y); c.fill(); }
  c.fillRect(x0, y - 40, x1 - x0, 6); c.fillRect(x0, y - 18, x1 - x0, 6);
}
export function drawDock(c, x, y) {
  c.fillStyle = '#6d4c33'; for (let i = 0; i < 4; i++) c.fillRect(x + i * 60, y - 8, 8, 40);
  c.fillStyle = '#a57547'; c.beginPath(); c.moveTo(x - 20, y); c.lineTo(x + 220, y - 40); c.lineTo(x + 250, y - 25); c.lineTo(x + 10, y + 16); c.closePath(); c.fill();
  c.strokeStyle = '#7a5433'; c.lineWidth = 2; for (let i = 1; i < 10; i++) { const k = i / 10; c.beginPath(); c.moveTo(lerp(x - 20, x + 220, k), lerp(y, y - 40, k)); c.lineTo(lerp(x + 10, x + 250, k), lerp(y + 16, y - 25, k)); c.stroke(); }
}

// ---------- tent ----------
export function drawTent(c, x, y, o) {
  const s = o.s || 1, col = o.color || '#ff8c32', st = o.stage || 0;
  const t = G.t, wind = G.reduce ? 0 : (o.wind || 0);
  c.save(); c.translate(x, y); c.scale(s, s);
  // footprint
  const A = [-95, 0], B = [25, 0], B2 = [95, -48], A2 = [-25, -48];
  if (o.tarp) { c.fillStyle = '#6d5a3a'; poly(c, [[A[0] - 12, 8], [B[0] + 10, 8], [B2[0] + 14, B2[1] - 4], [A2[0] - 8, A2[1] - 4]]); c.fill(); }
  if (st === 0) { c.restore(); return; }
  c.fillStyle = 'rgba(0,0,0,0.22)'; poly(c, [[A[0] - 4, 4], [B[0] + 8, 4], [B2[0] + 10, B2[1]], [A2[0], A2[1]]]); c.fill();
  if (st === 1) {
    c.fillStyle = col; poly(c, [A, B, B2, A2]); c.fill();
    c.strokeStyle = shade(col, -0.25); c.lineWidth = 2; c.beginPath(); c.moveTo(-60, -8); c.lineTo(10, -40); c.moveTo(-20, -4); c.lineTo(50, -38); c.stroke();
    c.restore(); return;
  }
  const sag = o.staked ? 0 : 12, flap = Math.sin(t * 9) * wind * 5, flap2 = Math.sin(t * 11 + 1) * wind * 4;
  const P = [-35 + flap, -118 + sag + Math.abs(flap) * 0.3], P2 = [35 + flap2, -160 + sag];
  const sideCol = shade(col, -0.12), frontCol = shade(col, 0.08);
  // side face
  c.fillStyle = sideCol; poly(c, [B, B2, P2, P]); c.fill();
  // front face
  c.fillStyle = frontCol; poly(c, [A, B, P]); c.fill();
  // door
  c.fillStyle = o.glow ? '#ffd98a' : shade(col, -0.4);
  poly(c, [[-62, 0], [-8, 0], [-35 + flap * 0.6, -80 + sag]]); c.fill();
  c.strokeStyle = shade(col, 0.35); c.lineWidth = 2; c.beginPath(); c.moveTo(-35 + flap * 0.6, -80 + sag); c.lineTo(-35, 0); c.stroke();
  // poles
  c.strokeStyle = '#3b3b3b'; c.lineWidth = 2.5; c.beginPath(); c.moveTo(A[0], A[1]); c.lineTo(P[0], P[1]); c.lineTo(B[0], B[1]); c.moveTo(P[0], P[1]); c.lineTo(P2[0], P2[1]); c.stroke();
  if (o.fly) {
    const fc = shade(col, -0.35);
    c.fillStyle = fc; poly(c, [[B[0] + 10, 6], [B2[0] + 14, B2[1] + 4], [P2[0], P2[1] - 8], [P[0], P[1] - 8]]); c.fill();
    c.fillStyle = shade(fc, 0.12); poly(c, [[A[0] - 14, 6], [P[0], P[1] - 8], [-30, -40]]); c.fill();
    c.strokeStyle = shade(fc, -0.3); c.lineWidth = 3; c.beginPath(); c.moveTo(P[0], P[1] - 8); c.lineTo(P2[0], P2[1] - 8); c.stroke();
  }
  if (o.staked) { c.fillStyle = '#bdc3c7'; for (const p of [A, B, B2]) { c.fillRect(p[0] - 2, p[1] - 2, 4, 9); } }
  if (o.guy) {
    c.strokeStyle = 'rgba(240,240,240,0.9)'; c.lineWidth = 1.5;
    c.beginPath(); c.moveTo(P[0], P[1]); c.lineTo(-150, 16); c.moveTo(P2[0], P2[1]); c.lineTo(160, -40); c.stroke();
    c.fillStyle = '#bdc3c7'; c.fillRect(-152, 12, 4, 9); c.fillRect(158, -44, 4, 9);
  }
  if (o.wet) { c.fillStyle = 'rgba(20,40,80,0.25)'; poly(c, [A, B, B2, P2, P]); c.fill(); }
  if (o.flag && o.flag.id !== 'none') {
    c.strokeStyle = '#555'; c.lineWidth = 2; c.beginPath(); c.moveTo(P2[0], P2[1]); c.lineTo(P2[0], P2[1] - 40); c.stroke();
    const fw = Math.sin(t * 6) * 3;
    c.fillStyle = o.flag.c; c.beginPath(); c.moveTo(P2[0], P2[1] - 40); c.lineTo(P2[0] + 26, P2[1] - 33 + fw); c.lineTo(P2[0], P2[1] - 25); c.fill();
    if (o.flag.id === 'star') emo(c, '⭐', P2[0] + 9, P2[1] - 33, 8);
    if (o.flag.id === 'fish') emo(c, '🐟', P2[0] + 9, P2[1] - 33, 8);
  }
  c.restore();
}
function poly(c, pts) { c.beginPath(); c.moveTo(pts[0][0], pts[0][1]); for (let i = 1; i < pts.length; i++) c.lineTo(pts[i][0], pts[i][1]); c.closePath(); }
export { poly };

// ---------- camper ----------
const OUTFIT = { rain_jacket: '#f1c40f', warm_jacket: '#34495e', hoodie: '#7b8a99' };
export function drawCamper(c, x, y, o = {}) {
  const look = o.look, s = o.s || 1, t = G.t + (o.seed || 0), pose = o.pose || 'idle', face = o.face || 1;
  const skin = COSMETICS.skin[look.skin] || COSMETICS.skin[0];
  const hairC = COSMETICS.hair[look.hair] || COSMETICS.hair[0];
  const shirt = (COSMETICS.shirt[look.shirt] || COSMETICS.shirt[0]).c;
  const packC = (COSMETICS.pack[look.pack] || COSMETICS.pack[0]).c;
  const wear = o.wear || {};
  const top = wear.rain_jacket ? OUTFIT.rain_jacket : wear.warm_jacket ? OUTFIT.warm_jacket : wear.hoodie ? OUTFIT.hoodie : shirt;
  const walk = pose === 'walk';
  let jump = 0, jit = 0, bob = G.reduce ? 0 : Math.sin(t * 2.2) * 1.2;
  if (pose === 'cheer') jump = Math.abs(Math.sin(t * 7)) * 22;
  if (pose === 'shiver' && !G.reduce) jit = Math.sin(t * 60) * 1.6;
  if (walk) bob = Math.abs(Math.sin(t * 10)) * 3;
  c.save(); c.translate(x, y); c.scale(s, s);
  c.fillStyle = 'rgba(0,0,0,0.22)'; c.beginPath(); c.ellipse(0, 2, 26, 7, 0, 0, 7); c.fill();
  c.translate(jit, -jump - bob); c.scale(face, 1);
  if (pose === 'sit') c.translate(0, 18);
  // legs
  const lg = walk ? Math.sin(t * 10) * 0.5 : 0;
  c.fillStyle = '#3d5a80';
  if (pose === 'sit') { c.fillRect(-14, -28, 30, 10); c.fillRect(8, -28, 10, 26); c.fillRect(-12, -28, 10, 26); }
  else for (const [lx, a] of [[-8, lg], [8, -lg]]) { c.save(); c.translate(lx, -36); c.rotate(a); rr(c, -5.5, 0, 11, 34, 5); c.fill(); c.restore(); }
  c.fillStyle = wear.warm_socks ? '#e74c3c' : '#5b3a29';
  if (pose !== 'sit') for (const [lx, a] of [[-8, lg], [8, -lg]]) { c.save(); c.translate(lx, -36); c.rotate(a); rr(c, -7, 29, 16, 8, 4); c.fill(); c.restore(); }
  // backpack
  if (o.pack !== false) { c.fillStyle = packC; rr(c, -26, -80, 16, 40, 6); c.fill(); c.fillStyle = shade(packC, -0.2); c.fillRect(-26, -62, 16, 4); }
  // body
  c.fillStyle = top; rr(c, -17, -82, 34, 48, 12); c.fill();
  if (wear.warm_jacket) { c.strokeStyle = shade(top, 0.2); c.lineWidth = 2; for (let i = 0; i < 3; i++) { c.beginPath(); c.moveTo(-15, -70 + i * 12); c.lineTo(15, -70 + i * 12); c.stroke(); } }
  if (wear.rain_jacket) { c.fillStyle = 'rgba(255,255,255,0.35)'; rr(c, -12, -78, 6, 30, 3); c.fill(); }
  c.fillStyle = shade(top, -0.2); c.fillRect(-1, -80, 2, 44);
  // arms
  const arm = (ax, ang, len = 30) => { c.save(); c.translate(ax, -76); c.rotate(ang); c.fillStyle = top; rr(c, -5, 0, 10, len, 5); c.fill(); c.fillStyle = skin; c.beginPath(); c.arc(0, len + 2, 5.5, 0, 7); c.fill(); c.restore(); };
  const sw = walk ? Math.sin(t * 10) * 0.6 : Math.sin(t * 2) * 0.05;
  if (pose === 'cheer') { arm(-16, 2.6 + Math.sin(t * 14) * 0.2); arm(16, -2.6 - Math.sin(t * 14) * 0.2); }
  else if (pose === 'shiver') { arm(-15, -0.9, 26); arm(15, 0.9, 26); }
  else if (pose === 'stomach') { arm(-15, -0.5, 26); arm(15, 0.5, 26); }
  else if (pose === 'wipe') { arm(-15, 0.1 + sw); arm(15, -2.5 + Math.sin(t * 8) * 0.25, 28); }
  else if (pose === 'yawn') { arm(-15, 0.1); arm(15, -2.7, 26); }
  else if (pose === 'hold' || pose === 'fish') { arm(-15, 0.1 + sw); arm(15, -1.2, 30); }
  else if (pose === 'drink') { arm(-15, 0.1); arm(15, -2.3, 26); }
  else { arm(-16, 0.12 + sw); arm(16, -0.12 - sw); }
  // head
  const hy = -104;
  c.fillStyle = skin; c.beginPath(); c.arc(0, hy, 22, 0, 7); c.fill();
  c.beginPath(); c.arc(-21, hy + 2, 5, 0, 7); c.arc(21, hy + 2, 5, 0, 7); c.fill();
  const style = COSMETICS.hairStyle[look.hairStyle] || 'short';
  const hat = hatStyle(look, wear);
  c.fillStyle = hairC;
  if (style === 'long') { rr(c, -24, hy - 12, 48, 40, 14); c.fill(); c.fillStyle = skin; c.beginPath(); c.arc(0, hy + 2, 19, 0, 7); c.fill(); c.fillStyle = hairC; }
  if (style === 'puff') { c.beginPath(); c.arc(0, hy - 16, 20, 0, 7); c.arc(-16, hy - 8, 12, 0, 7); c.arc(16, hy - 8, 12, 0, 7); c.fill(); }
  c.beginPath(); c.arc(0, hy - 4, 22.5, Math.PI * 1.03, Math.PI * 1.97); c.lineTo(14, hy - 12); c.quadraticCurveTo(0, hy - 6, -18, hy - 10); c.closePath(); c.fill();
  // face
  const blink = (t % 3.7) < 0.12;
  c.fillStyle = '#2b2b2b';
  if (pose === 'sleep' || blink) { c.fillRect(-10, hy + 1, 7, 2); c.fillRect(4, hy + 1, 7, 2); }
  else { c.beginPath(); c.arc(-7, hy + 1, 3, 0, 7); c.arc(8, hy + 1, 3, 0, 7); c.fill(); c.fillStyle = '#fff'; c.beginPath(); c.arc(-6, hy, 1, 0, 7); c.arc(9, hy, 1, 0, 7); c.fill(); }
  c.fillStyle = 'rgba(255,120,120,0.35)'; c.beginPath(); c.arc(-13, hy + 8, 4, 0, 7); c.arc(14, hy + 8, 4, 0, 7); c.fill();
  c.strokeStyle = '#6b3b2b'; c.lineWidth = 2; c.fillStyle = '#6b3b2b';
  const mood = o.mood || (pose === 'cheer' ? 'happy' : pose === 'shiver' || pose === 'stomach' ? 'sad' : pose === 'yawn' ? 'o' : 'smile');
  c.beginPath();
  if (mood === 'happy') { c.arc(0, hy + 8, 6, 0, Math.PI); c.fill(); }
  else if (mood === 'o') { c.ellipse(0, hy + 11, 4, 5, 0, 0, 7); c.fill(); }
  else if (mood === 'sad') { c.arc(0, hy + 15, 5, Math.PI * 1.15, Math.PI * 1.85); c.stroke(); }
  else { c.arc(0, hy + 7, 5, 0.2, Math.PI - 0.2); c.stroke(); }
  // hat
  if (hat === 'cap') { c.fillStyle = shade(shirt, -0.1); c.beginPath(); c.arc(0, hy - 8, 22, Math.PI, 0); c.fill(); rr(c, 4, hy - 12, 28, 6, 3); c.fill(); }
  if (hat === 'beanie') { c.fillStyle = '#c0392b'; c.beginPath(); c.arc(0, hy - 6, 23, Math.PI, 0); c.fill(); c.fillStyle = '#ecf0f1'; c.fillRect(-23, hy - 8, 46, 6); c.beginPath(); c.arc(0, hy - 31, 6, 0, 7); c.fill(); }
  if (hat === 'ranger') { c.fillStyle = '#a0784a'; c.beginPath(); c.ellipse(0, hy - 12, 36, 7, 0, 0, 7); c.fill(); rr(c, -16, hy - 36, 32, 26, 8); c.fill(); c.fillStyle = '#5b3a1f'; c.fillRect(-16, hy - 16, 32, 4); }
  if (hat === 'bucket') { c.fillStyle = '#7f9c6b'; c.beginPath(); c.ellipse(0, hy - 10, 30, 7, 0, 0, 7); c.fill(); rr(c, -19, hy - 32, 38, 24, 10); c.fill(); }
  if (wear.rain_jacket && hat === 'none') { c.strokeStyle = OUTFIT.rain_jacket; c.lineWidth = 6; c.beginPath(); c.arc(0, hy, 24, Math.PI * 0.85, Math.PI * 2.15); c.stroke(); }
  // held item
  if (pose === 'fish') { c.strokeStyle = '#5b3a1f'; c.lineWidth = 3; c.beginPath(); c.moveTo(22, -50); c.lineTo(70, -140); c.stroke(); }
  if (o.wet) { c.fillStyle = 'rgba(40,80,160,0.18)'; rr(c, -18, -126, 36, 92, 14); c.fill(); }
  c.restore();
}
function hatStyle(look, wear) {
  const h = COSMETICS.hat[look.hat] ? COSMETICS.hat[look.hat].id : 'none';
  return h === 'none' && wear.hat ? 'cap' : h;
}

// ---------- fish ----------
export function drawFish(c, x, y, len, col, ang = 0, wig = 0) {
  c.save(); c.translate(x, y); c.rotate(ang);
  const L = len, Hh = len * 0.36;
  const tail = Math.sin(G.t * 12) * wig;
  c.fillStyle = shade(col[0], -0.15); c.beginPath(); c.moveTo(-L * 0.45, 0); c.lineTo(-L * 0.72, -Hh * 0.7 + tail * 4); c.lineTo(-L * 0.72, Hh * 0.7 + tail * 4); c.closePath(); c.fill();
  const g = c.createLinearGradient(0, -Hh, 0, Hh); g.addColorStop(0, shade(col[0], -0.1)); g.addColorStop(0.6, col[0]); g.addColorStop(1, col[1]);
  c.fillStyle = g; c.beginPath(); c.ellipse(0, 0, L * 0.5, Hh, 0, 0, 7); c.fill();
  c.fillStyle = shade(col[0], -0.2); c.beginPath(); c.moveTo(-L * 0.1, -Hh * 0.9); c.lineTo(L * 0.12, -Hh * 1.3); c.lineTo(L * 0.2, -Hh * 0.8); c.fill();
  c.fillStyle = '#fff'; c.beginPath(); c.arc(L * 0.32, -Hh * 0.15, Hh * 0.22, 0, 7); c.fill();
  c.fillStyle = '#111'; c.beginPath(); c.arc(L * 0.34, -Hh * 0.15, Hh * 0.12, 0, 7); c.fill();
  c.restore();
}

// ---------- lighting ----------
let lc = null, lx = null;
export function lighting(c, dark, lights = [], tint = '#0b1638') {
  if (dark <= 0.01) return;
  if (!lc) { lc = document.createElement('canvas'); lx = lc.getContext('2d'); }
  const w = Math.max(1, Math.ceil(G.cw / 2)), h = Math.max(1, Math.ceil(G.ch / 2));
  if (lc.width !== w || lc.height !== h) { lc.width = w; lc.height = h; }
  lx.setTransform(1, 0, 0, 1, 0, 0); lx.globalCompositeOperation = 'source-over'; lx.clearRect(0, 0, w, h);
  lx.globalAlpha = dark; lx.fillStyle = tint; lx.fillRect(0, 0, w, h); lx.globalAlpha = 1;
  lx.globalCompositeOperation = 'destination-out';
  for (const L of lights) {
    const px = (L.x * G.s + G.ox) / 2, py = (L.y * G.s + G.oy) / 2, r = L.r * G.s / 2;
    const g = lx.createRadialGradient(px, py, 0, px, py, r);
    g.addColorStop(0, `rgba(0,0,0,${L.k || 0.95})`); g.addColorStop(0.5, `rgba(0,0,0,${(L.k || 0.95) * 0.6})`); g.addColorStop(1, 'rgba(0,0,0,0)');
    lx.fillStyle = g; lx.beginPath(); lx.arc(px, py, r, 0, 7); lx.fill();
  }
  c.save(); c.setTransform(1, 0, 0, 1, 0, 0);
  c.drawImage(lc, 0, 0, G.canvas.width, G.canvas.height);
  c.globalCompositeOperation = 'lighter';
  for (const L of lights) {
    if (!L.col) continue;
    const px = (L.x * G.s + G.ox) * G.dpr, py = (L.y * G.s + G.oy) * G.dpr, r = L.r * G.s * G.dpr * 0.8;
    const g = c.createRadialGradient(px, py, 0, px, py, r);
    g.addColorStop(0, L.col); g.addColorStop(1, 'rgba(0,0,0,0)');
    c.globalAlpha = dark * 0.55; c.fillStyle = g; c.beginPath(); c.arc(px, py, r, 0, 7); c.fill();
  }
  c.restore();
}
export function tintOverlay(c, col, a) {
  if (a <= 0) return;
  const v = G.view; c.globalAlpha = a; c.fillStyle = col; c.fillRect(v.x0, v.y0, v.x1 - v.x0, v.y1 - v.y0); c.globalAlpha = 1;
}
export function goldenHour(c, hour) {
  const a = hour > 16.5 && hour < 20.5 ? (1 - Math.abs(hour - 18.8) / 2.3) * 0.16 : hour > 5.5 && hour < 8 ? 0.08 : 0;
  if (a > 0) { c.globalCompositeOperation = 'soft-light'; tintOverlay(c, '#ff9a3c', a * 2.5); c.globalCompositeOperation = 'source-over'; }
}

// ---------- weather ----------
export function drawRain(c, level, wind, t) {
  if (!level) return;
  const v = G.view, n = (G.reduce ? 60 : 160) * level, wx = wind * 60 + 40;
  c.strokeStyle = 'rgba(200,220,255,0.55)'; c.lineWidth = 1.6; c.beginPath();
  const wd = v.x1 - v.x0 + 200, ht = v.y1 - v.y0;
  for (let i = 0; i < n; i++) {
    const sx = (i * 7919 % 1000) / 1000, sy = (i * 104729 % 1000) / 1000;
    const x = v.x0 - 100 + ((sx * wd + t * wx) % wd), y = v.y0 + ((sy * ht + t * 900 * (0.8 + sx * 0.4)) % ht);
    c.moveTo(x, y); c.lineTo(x - wx * 0.04, y - 22);
  }
  c.stroke();
  c.strokeStyle = 'rgba(220,235,255,0.5)'; c.lineWidth = 1.2;
  for (let i = 0; i < 25 * level; i++) {
    const sx = (i * 3571 % 1000) / 1000, k = ((t * 2 + sx * 7) % 1);
    const x = v.x0 + sx * (v.x1 - v.x0), y = 380 + ((i * 7907) % 500);
    c.globalAlpha = 1 - k; c.beginPath(); c.ellipse(x, y, 8 * k + 2, 3 * k + 1, 0, 0, 7); c.stroke();
  }
  c.globalAlpha = 1;
}
export function drawFireflies(c, n, t, area = { x0: 100, x1: 1500, y0: 380, y1: 820 }) {
  c.save(); c.globalCompositeOperation = 'lighter';
  for (let i = 0; i < n; i++) {
    const x = area.x0 + ((i * 373) % (area.x1 - area.x0)) + Math.sin(t * 0.7 + i) * 40;
    const y = area.y0 + ((i * 211) % (area.y1 - area.y0)) + Math.cos(t * 0.9 + i * 2) * 25;
    const a = Math.max(0, Math.sin(t * 2.2 + i * 1.3));
    const g = c.createRadialGradient(x, y, 0, x, y, 14); g.addColorStop(0, `rgba(230,255,120,${a})`); g.addColorStop(1, 'rgba(200,255,100,0)');
    c.fillStyle = g; c.beginPath(); c.arc(x, y, 14, 0, 7); c.fill();
  }
  c.restore();
}
export function drawBirds(c, t, n = 3) {
  c.strokeStyle = 'rgba(40,40,50,0.7)'; c.lineWidth = 2;
  for (let i = 0; i < n; i++) {
    const x = ((t * 40 + i * 530) % 2200) - 300, y = 90 + i * 35 + Math.sin(t + i) * 10, f = Math.sin(t * 8 + i) * 5;
    c.beginPath(); c.moveTo(x - 10, y - f); c.quadraticCurveTo(x - 4, y - 4, x, y); c.quadraticCurveTo(x + 4, y - 4, x + 10, y - f); c.stroke();
  }
}
export function drawButterflies(c, t, n = 3, area = { x0: 150, x1: 1450, y0: 420, y1: 800 }) {
  for (let i = 0; i < n; i++) {
    const x = area.x0 + ((i * 431 + t * 25) % (area.x1 - area.x0)), y = area.y0 + ((i * 197) % (area.y1 - area.y0)) + Math.sin(t * 2 + i) * 30;
    emo(c, '🦋', x, y, 18, { sy: 0.6 + 0.4 * Math.abs(Math.sin(t * 10 + i)) });
  }
}
export function drawTracks(c, x, y, kind, s = 1) {
  c.fillStyle = 'rgba(70,50,30,0.75)';
  const pr = (px, py, f) => { c.save(); c.translate(x + px * s, y + py * s); f(); c.restore(); };
  for (let i = 0; i < 4; i++) {
    const px = i * 38 - 60, py = (i % 2) * 16 - 8;
    pr(px, py, () => {
      if (kind === 'deer') { c.beginPath(); c.ellipse(-4, 0, 3.5 * s, 8 * s, -0.15, 0, 7); c.ellipse(4, 0, 3.5 * s, 8 * s, 0.15, 0, 7); c.fill(); }
      else if (kind === 'raccoon') { c.beginPath(); c.ellipse(0, 3, 6 * s, 5 * s, 0, 0, 7); c.fill(); for (let k = 0; k < 5; k++) { c.beginPath(); c.ellipse(-8 + k * 4, -6 + Math.abs(k - 2), 1.6 * s, 5 * s, (k - 2) * 0.25, 0, 7); c.fill(); } }
      else if (kind === 'rabbit') { if (i % 2) { c.beginPath(); c.ellipse(-5, -4, 3 * s, 8 * s, 0, 0, 7); c.ellipse(5, -4, 3 * s, 8 * s, 0, 0, 7); c.fill(); } else { c.beginPath(); c.arc(-2, 6, 3 * s, 0, 7); c.arc(3, 12, 3 * s, 0, 7); c.fill(); } }
      else if (kind === 'fox') { c.beginPath(); c.ellipse(0, 3, 4.5 * s, 4 * s, 0, 0, 7); c.fill(); for (let k = 0; k < 4; k++) { c.beginPath(); c.arc(-5 + k * 3.3, -5 - (k === 1 || k === 2 ? 2 : 0), 1.8 * s, 0, 7); c.fill(); } }
      else if (kind === 'bear') { c.beginPath(); c.ellipse(0, 4, 10 * s, 8 * s, 0, 0, 7); c.fill(); for (let k = 0; k < 5; k++) { c.beginPath(); c.arc(-10 + k * 5, -9 + Math.abs(k - 2) * 1.5, 2.6 * s, 0, 7); c.fill(); } }
    });
  }
}
