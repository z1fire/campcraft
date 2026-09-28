// Procedural audio: ambience, music and sound effects, all synthesized with WebAudio.
let ac = null, master, musicBus, sfxBus, ambBus, noiseBuf;
const amb = { wind: 0, rain: 0, water: 0, fire: 0, birds: 0, night: 0, frogs: 0 };
const loops = {};
let musicMode = 'day', musicOn = true, nextNote = 0, step = 0, sched = null;
const vol = { music: 0.5, sfx: 0.8 };

const CAPTIONS = {
  hoot: '🔊 Owl hoots', thunder: '🔊 Thunder rumbles', chitter: '🔊 Raccoon chitters', splash: '🔊 Splash',
  howl: '🔊 Wolf howls far away', sizzle: '🔊 Sizzle', hiss: '🔊 Hiss', zip: '🔊 Zip', thunk: '🔊 Thunk',
  whoosh: '🔊 Whoosh', badge: '🔊 Badge fanfare', snap: '🔊 Branch snaps', plop: '🔊 Plop',
};

export const audio = {
  onCaption: null,
  unlock() {
    if (ac) { if (ac.state === 'suspended') ac.resume(); return; }
    const AC = window.AudioContext || window.webkitAudioContext; if (!AC) return;
    ac = new AC();
    master = ac.createGain(); master.gain.value = 0.9; master.connect(ac.destination);
    const comp = ac.createDynamicsCompressor(); comp.connect(master);
    musicBus = ac.createGain(); musicBus.connect(comp);
    sfxBus = ac.createGain(); sfxBus.connect(comp);
    ambBus = ac.createGain(); ambBus.connect(comp);
    this.setVolumes(vol.music, vol.sfx);
    noiseBuf = ac.createBuffer(1, ac.sampleRate * 2, ac.sampleRate);
    const d = noiseBuf.getChannelData(0); for (let i = 0; i < d.length; i++) d[i] = Math.random() * 2 - 1;
    loops.wind = noiseLoop('bandpass', 420, 0.6);
    loops.rain = noiseLoop('highpass', 1200, 0.3, 'lowpass', 7000);
    loops.water = noiseLoop('bandpass', 700, 1.2);
    loops.fire = noiseLoop('lowpass', 260, 0.7);
    nextNote = ac.currentTime + 0.5;
    sched = setInterval(tick, 90);
  },
  setVolumes(m, s) {
    vol.music = m; vol.sfx = s;
    if (!ac) return;
    musicBus.gain.setTargetAtTime(m * 0.35, ac.currentTime, 0.2);
    sfxBus.gain.setTargetAtTime(s * 0.9, ac.currentTime, 0.05);
    ambBus.gain.setTargetAtTime(Math.max(s, 0.15) * 0.9, ac.currentTime, 0.2);
  },
  setAmbience(o) {
    Object.assign(amb, { wind: 0, rain: 0, water: 0, fire: 0, birds: 0, night: 0, frogs: 0 }, o);
    if (!ac) return;
    const t = ac.currentTime;
    loops.wind.g.gain.setTargetAtTime(0.04 + amb.wind * 0.07, t, 0.8);
    loops.rain.g.gain.setTargetAtTime(amb.rain * 0.09, t, 0.8);
    loops.water.g.gain.setTargetAtTime(amb.water * 0.05, t, 0.8);
    loops.fire.g.gain.setTargetAtTime(amb.fire * 0.12, t, 0.4);
  },
  setMusic(mode) { musicMode = mode; },
  pause(p) { if (!ac) return; p ? ac.suspend() : ac.resume(); },
  sfx(name, opt = {}) {
    if (!ac || ac.state !== 'running') return;
    const f = SFX[name]; if (f) f(ac.currentTime, opt);
    if (CAPTIONS[name] && this.onCaption) this.onCaption(CAPTIONS[name]);
  },
};

function noiseLoop(type, freq, q, type2, f2) {
  const src = ac.createBufferSource(); src.buffer = noiseBuf; src.loop = true;
  const f = ac.createBiquadFilter(); f.type = type; f.frequency.value = freq; f.Q.value = q;
  let last = f;
  if (type2) { const f2n = ac.createBiquadFilter(); f2n.type = type2; f2n.frequency.value = f2; f.connect(f2n); last = f2n; }
  const g = ac.createGain(); g.gain.value = 0;
  src.connect(f); last.connect(g); g.connect(ambBus); src.start();
  return { src, f, g };
}

// ---------- building blocks ----------
function tone(t, freq, dur, { type = 'sine', vol = 0.3, to = null, attack = 0.005, bus = sfxBus, lp = null, vib = 0 } = {}) {
  const o = ac.createOscillator(); o.type = type; o.frequency.setValueAtTime(freq, t);
  if (to) o.frequency.exponentialRampToValueAtTime(to, t + dur);
  const g = ac.createGain(); g.gain.setValueAtTime(0.0001, t);
  g.gain.exponentialRampToValueAtTime(vol, t + attack);
  g.gain.exponentialRampToValueAtTime(0.0001, t + dur);
  let node = o;
  if (lp) { const f = ac.createBiquadFilter(); f.type = 'lowpass'; f.frequency.value = lp; o.connect(f); node = f; }
  if (vib) { const l = ac.createOscillator(); l.frequency.value = 6; const lg = ac.createGain(); lg.gain.value = vib; l.connect(lg); lg.connect(o.frequency); l.start(t); l.stop(t + dur + 0.05); }
  node.connect(g); g.connect(bus); o.start(t); o.stop(t + dur + 0.05);
}
function noise(t, dur, { type = 'bandpass', freq = 1000, to = null, q = 1, vol = 0.3, attack = 0.005, bus = sfxBus } = {}) {
  const s = ac.createBufferSource(); s.buffer = noiseBuf;
  const f = ac.createBiquadFilter(); f.type = type; f.frequency.setValueAtTime(freq, t); f.Q.value = q;
  if (to) f.frequency.exponentialRampToValueAtTime(to, t + dur);
  const g = ac.createGain(); g.gain.setValueAtTime(0.0001, t);
  g.gain.exponentialRampToValueAtTime(vol, t + attack);
  g.gain.exponentialRampToValueAtTime(0.0001, t + dur);
  s.connect(f); f.connect(g); g.connect(bus);
  s.start(t, Math.random() * 1.5); s.stop(t + dur + 0.05);
}
function pluck(t, freq, vol = 0.2, dur = 1.2) {
  tone(t, freq, dur, { type: 'triangle', vol, lp: 2400, bus: musicBus, attack: 0.003 });
  tone(t, freq * 2, dur * 0.4, { type: 'sine', vol: vol * 0.25, bus: musicBus });
}

const SFX = {
  tap: t => tone(t, 880, 0.06, { vol: 0.12 }),
  ok: t => { tone(t, 523, 0.15, { type: 'triangle', vol: 0.2 }); tone(t + 0.1, 784, 0.25, { type: 'triangle', vol: 0.2 }); },
  success: t => [523, 659, 784].forEach((f, i) => tone(t + i * 0.09, f, 0.35, { type: 'triangle', vol: 0.18 })),
  bad: t => { tone(t, 392, 0.18, { type: 'square', vol: 0.06, lp: 900 }); tone(t + 0.14, 294, 0.3, { type: 'square', vol: 0.06, lp: 800 }); },
  zip: t => noise(t, 0.35, { freq: 1500, to: 4500, q: 3, vol: 0.25 }),
  thunk: t => { tone(t, 190, 0.14, { to: 60, vol: 0.45 }); noise(t, 0.05, { freq: 2500, vol: 0.2 }); },
  splash: t => noise(t, 0.6, { type: 'lowpass', freq: 3500, to: 250, vol: 0.4, attack: 0.01 }),
  plop: t => tone(t, 700, 0.12, { to: 180, vol: 0.3 }),
  sizzle: (t, o) => noise(t, o.dur || 0.9, { type: 'highpass', freq: 4200, vol: 0.12, attack: 0.05 }),
  whoosh: t => noise(t, 0.7, { freq: 250, to: 1600, q: 0.8, vol: 0.35, attack: 0.1 }),
  hiss: t => noise(t, 1.2, { type: 'highpass', freq: 2600, to: 5000, vol: 0.18, attack: 0.02 }),
  crackle: t => noise(t, 0.03, { type: 'highpass', freq: 3000, vol: 0.2 }),
  reel: t => { for (let i = 0; i < 4; i++) noise(t + i * 0.04, 0.02, { freq: 3500, q: 5, vol: 0.12 }); },
  pop: t => tone(t, 420, 0.1, { to: 950, vol: 0.2 }),
  coin: t => { tone(t, 988, 0.1, { type: 'square', vol: 0.07, lp: 3000 }); tone(t + 0.08, 1319, 0.25, { type: 'square', vol: 0.07, lp: 3000 }); },
  badge: t => { [523, 659, 784, 1047, 1319].forEach((f, i) => tone(t + i * 0.08, f, 0.5, { type: 'triangle', vol: 0.16 })); noise(t + 0.4, 0.6, { type: 'highpass', freq: 6000, vol: 0.06 }); },
  fanfare: t => { [392, 523, 659, 784, 659, 784, 1047].forEach((f, i) => tone(t + i * 0.12, f, 0.45, { type: 'triangle', vol: 0.16 })); },
  chitter: t => { for (let i = 0; i < 7; i++) tone(t + i * 0.055, 1300 + Math.random() * 600, 0.04, { type: 'square', vol: 0.05, lp: 3000 }); },
  hoot: t => { tone(t, 380, 0.35, { vol: 0.15, vib: 6, attack: 0.05 }); tone(t + 0.5, 360, 0.6, { vol: 0.15, vib: 6, attack: 0.05 }); },
  thunder: t => { noise(t, 3, { type: 'lowpass', freq: 400, to: 60, vol: 0.7, attack: 0.02 }); noise(t + 0.3, 2.5, { type: 'lowpass', freq: 180, vol: 0.5, attack: 0.3 }); },
  step: t => noise(t, 0.08, { type: 'lowpass', freq: 500, vol: 0.12 }),
  camera: t => { noise(t, 0.04, { freq: 3000, vol: 0.3 }); noise(t + 0.08, 0.1, { type: 'highpass', freq: 2000, vol: 0.15 }); },
  drink: t => { for (let i = 0; i < 3; i++) tone(t + i * 0.22, 320, 0.12, { to: 160, vol: 0.2 }); },
  eat: t => { for (let i = 0; i < 4; i++) noise(t + i * 0.13, 0.06, { freq: 1800, q: 1, vol: 0.2 }); },
  snap: t => { noise(t, 0.08, { type: 'highpass', freq: 1500, vol: 0.45 }); tone(t, 140, 0.1, { vol: 0.2 }); },
  rustle: t => noise(t, 0.35, { freq: 3200, q: 0.7, vol: 0.12, attack: 0.05 }),
  howl: t => tone(t, 380, 2.2, { to: 520, vol: 0.08, vib: 4, attack: 0.4 }),
  hammer: t => { tone(t, 900, 0.05, { type: 'square', vol: 0.08, lp: 3000 }); tone(t, 150, 0.1, { vol: 0.3 }); },
  swoosh: t => noise(t, 0.25, { freq: 800, to: 2500, q: 1, vol: 0.15, attack: 0.03 }),
  bite: t => { tone(t, 500, 0.08, { to: 300, vol: 0.25 }); noise(t, 0.1, { type: 'lowpass', freq: 1200, vol: 0.2 }); },
  creak: t => tone(t, 110, 0.5, { type: 'sawtooth', to: 90, vol: 0.05, lp: 500 }),
  boil: t => { for (let i = 0; i < 6; i++) tone(t + i * 0.09, 300 + Math.random() * 300, 0.06, { to: 700, vol: 0.06 }); },
};

// ---------- scheduler: music + random ambient events ----------
const CHORDS = [[196, 247, 294, 392], [147, 220, 294, 370], [165, 196, 247, 330], [131, 196, 262, 330]];
const MEL = [392, 440, 494, 587, 659, 784, 880];
function tick() {
  if (!ac || ac.state !== 'running') return;
  const t = ac.currentTime;
  // music
  const beat = musicMode === 'night' ? 0.5 : 0.36;
  while (nextNote < t + 0.25) {
    if (musicOn && vol.music > 0 && musicMode !== 'off' && musicMode !== 'storm') {
      const bar = Math.floor(step / 8) % 4, s = step % 8, ch = CHORDS[bar];
      const soft = musicMode === 'night' ? 0.6 : 1;
      if (s === 0) tone(nextNote, ch[0] / 2, beat * 7, { type: 'sine', vol: 0.12 * soft, bus: musicBus, attack: 0.02 });
      if (Math.random() < (musicMode === 'night' ? 0.45 : 0.7)) pluck(nextNote, ch[[0, 1, 2, 3, 2, 1, 2, 3][s]] * 2, 0.08 * soft);
      if (musicMode !== 'night' && s % 4 === 2 && Math.random() < 0.35) pluck(nextNote + beat / 2, MEL[Math.floor(Math.random() * MEL.length)], 0.05);
    }
    nextNote += beat; step++;
  }
  // ambient events
  if (amb.birds && Math.random() < 0.05 * amb.birds) chirp(t);
  if (amb.night && Math.random() < 0.08) cricket(t);
  if (amb.frogs && Math.random() < 0.02) { tone(t, 140, 0.18, { type: 'sawtooth', vol: 0.05, lp: 600, to: 110 }); tone(t + 0.22, 150, 0.18, { type: 'sawtooth', vol: 0.05, lp: 600, to: 110 }); }
  if (amb.fire && Math.random() < 0.25 * amb.fire) SFX.crackle(t + Math.random() * 0.08);
  if (amb.rain && Math.random() < 0.3 * amb.rain) tone(t, 1800 + Math.random() * 2000, 0.03, { vol: 0.02 });
}
function chirp(t) {
  const base = 2200 + Math.random() * 1600, n = 2 + Math.floor(Math.random() * 4);
  for (let i = 0; i < n; i++) tone(t + i * 0.11, base, 0.07, { to: base * (Math.random() < 0.5 ? 1.4 : 0.75), vol: 0.035, bus: ambBus });
}
function cricket(t) {
  for (let i = 0; i < 3; i++) tone(t + i * 0.05, 4400, 0.035, { vol: 0.02, bus: ambBus });
}
