// DOM overlay helpers: buttons, panels, toasts, prompts, drag and drop.
import { audio } from './audio.js';
import { S } from './save.js';
import { toScreen } from './engine.js';

export const root = () => document.getElementById('ui');
export function el(tag, cls = '', html = '', parent = null) {
  const e = document.createElement(tag);
  if (cls) e.className = cls;
  if (html !== null && html !== undefined) e.innerHTML = html;
  if (parent) parent.appendChild(e);
  return e;
}
export function clearUI() { root().innerHTML = ''; closeModal(); }

export function btn(html, onClick, cls = '', parent = root(), sound = 'tap') {
  const b = el('button', 'btn ' + cls, html, parent);
  b.addEventListener('click', e => { e.stopPropagation(); if (b.disabled) return; sound && audio.sfx(sound); onClick && onClick(e, b); });
  return b;
}

export function toast(html, ms = 2200) {
  const box = document.getElementById('toasts');
  const t = el('div', 'toast', html, box);
  while (box.children.length > 3) box.firstChild.remove();
  setTimeout(() => t.classList.add('out'), ms);
  setTimeout(() => t.remove(), ms + 400);
  return t;
}

let bannerEl = null;
export function banner(html, sayText) {
  if (!bannerEl || !bannerEl.isConnected) bannerEl = el('div', 'banner', '', root());
  if (!html) { bannerEl.style.display = 'none'; return; }
  bannerEl.style.display = '';
  if (bannerEl.innerHTML !== html) { bannerEl.innerHTML = html; bannerEl.classList.remove('pop'); void bannerEl.offsetWidth; bannerEl.classList.add('pop'); if (sayText) speak(sayText); }
}

let modalEl = null;
export function closeModal() { if (modalEl) { const m = modalEl; modalEl = null; m.classList.add('out'); setTimeout(() => m.remove(), 180); m._onClose && m._onClose(); } }
export function modal({ title = '', body = null, buttons = [], cls = '', onClose = null, closeX = true }) {
  closeModal();
  const back = el('div', 'modal-back ' + cls, '', document.getElementById('overlay'));
  const box = el('div', 'modal', '', back);
  if (title) el('div', 'modal-title', title, box);
  if (closeX) btn('✖', () => closeModal(), 'x', box);
  const b = el('div', 'modal-body', '', box);
  if (typeof body === 'string') b.innerHTML = body; else if (body) b.appendChild(body);
  if (buttons.length) {
    const row = el('div', 'modal-btns', '', box);
    for (const bt of buttons) btn(bt.label, () => { if (bt.close !== false) closeModal(); bt.onClick && bt.onClick(); }, bt.cls || '', row, bt.sound);
  }
  back.addEventListener('pointerdown', e => { if (e.target === back && closeX) closeModal(); });
  back._onClose = onClose;
  modalEl = back;
  return { el: box, body: b, close: closeModal };
}
export const modalOpen = () => !!modalEl;

export function lesson(icon, text) {
  toast(`<span class="big">${icon}</span> ${text}`, 3200);
  speak(text);
}

let capTimer = null;
export function caption(text) {
  if (!S.settings.captions) return;
  const c = document.getElementById('caption');
  c.textContent = text; c.style.opacity = 1;
  clearTimeout(capTimer); capTimer = setTimeout(() => c.style.opacity = 0, 1800);
}

export function speak(text) {
  if (!S || !S.settings.narrate || !window.speechSynthesis) return;
  try {
    const clean = text.replace(/<[^>]+>/g, '').replace(/[\u{1F000}-\u{1FFFF}\u{2600}-\u{27BF}\u{FE0F}\u{200D}]/gu, '').trim();
    if (!clean) return;
    speechSynthesis.cancel();
    const u = new SpeechSynthesisUtterance(clean); u.rate = 0.95; u.pitch = 1.1;
    speechSynthesis.speak(u);
  } catch (e) { /* speech unavailable */ }
}

// A floating menu anchored at a world position.
let bubbleEl = null;
export function closeBubble() { if (bubbleEl) { bubbleEl.remove(); bubbleEl = null; } }
export function bubble(x, y, items) {
  closeBubble();
  const p = toScreen(x, y);
  const b = el('div', 'bubble', '', root());
  for (const it of items) {
    const bt = btn(`<span class="big">${it.icon}</span>${it.label ? `<small>${it.label}</small>` : ''}`, () => { closeBubble(); it.onClick(); }, it.cls || '', b);
    if (it.disabled) { bt.disabled = true; bt.classList.add('dim'); }
  }
  const r = b.getBoundingClientRect();
  b.style.left = Math.max(8, Math.min(window.innerWidth - r.width - 8, p.x - r.width / 2)) + 'px';
  b.style.top = Math.max(8, Math.min(window.innerHeight - r.height - 80, p.y - r.height - 10)) + 'px';
  bubbleEl = b;
  return b;
}

// Big celebration card for badges / level ups.
const celebrateQ = [];
let celebrating = false;
export function celebrate(icon, title, sub) {
  celebrateQ.push([icon, title, sub]);
  if (!celebrating) nextCelebrate();
}
function nextCelebrate() {
  const n = celebrateQ.shift(); if (!n) { celebrating = false; return; }
  celebrating = true;
  const [icon, title, sub] = n;
  audio.sfx('badge');
  const c = el('div', 'celebrate', `<div class="rays"></div><div class="ci">${icon}</div><div class="ct">${title}</div><div class="cs">${sub || ''}</div>`, document.getElementById('overlay'));
  speak(title);
  const done = () => { c.classList.add('out'); setTimeout(() => { c.remove(); nextCelebrate(); }, 300); };
  c.addEventListener('pointerdown', done);
  setTimeout(done, 2600);
}

// Generic DOM drag: tap or drag an element onto one of the targets.
export function draggable(elm, { targets, onDrop, onTap }) {
  let ghost = null, sx = 0, sy = 0, moved = false, id = null;
  elm.addEventListener('pointerdown', e => {
    if (elm.disabled) return;
    id = e.pointerId; sx = e.clientX; sy = e.clientY; moved = false;
    elm.setPointerCapture && elm.setPointerCapture(id);
  });
  elm.addEventListener('pointermove', e => {
    if (e.pointerId !== id) return;
    if (!moved && Math.hypot(e.clientX - sx, e.clientY - sy) > 10) {
      moved = true;
      ghost = elm.cloneNode(true); ghost.classList.add('ghost'); document.body.appendChild(ghost);
    }
    if (ghost) { ghost.style.left = e.clientX + 'px'; ghost.style.top = e.clientY + 'px'; }
  });
  const end = e => {
    if (e.pointerId !== id) return; id = null;
    if (ghost) {
      ghost.remove(); ghost = null;
      const tg = (typeof targets === 'function' ? targets() : targets).find(t => { const r = t.getBoundingClientRect(); return e.clientX >= r.left && e.clientX <= r.right && e.clientY >= r.top && e.clientY <= r.bottom; });
      if (tg) onDrop(tg);
    } else if (onTap && e.type === 'pointerup') onTap();
  };
  elm.addEventListener('pointerup', end);
  elm.addEventListener('pointercancel', end);
}

export function stars(n, max = 5) { return '<span class="stars">' + '⭐'.repeat(n) + '<span class="off">' + '⭐'.repeat(Math.max(0, max - n)) + '</span></span>'; }
export function meterBar(v, cls = '') { return `<span class="mbar ${cls}"><i style="width:${Math.round(v)}%"></i></span>`; }
