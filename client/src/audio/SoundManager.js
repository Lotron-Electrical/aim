// ============================================================
// AIm — Sound Manager (Web Audio API, no files)
// ============================================================

let audioCtx = null;

function getCtx() {
  if (!audioCtx) {
    audioCtx = new (window.AudioContext || window.webkitAudioContext)();
  }
  if (audioCtx.state === 'suspended') {
    audioCtx.resume();
  }
  return audioCtx;
}

function playTone(freq, duration, type = 'square', volume = 0.15) {
  const ctx = getCtx();
  const osc = ctx.createOscillator();
  const gain = ctx.createGain();
  osc.type = type;
  osc.frequency.value = freq;
  gain.gain.value = volume;
  gain.gain.exponentialRampToValueAtTime(0.001, ctx.currentTime + duration);
  osc.connect(gain);
  gain.connect(ctx.destination);
  osc.start(ctx.currentTime);
  osc.stop(ctx.currentTime + duration);
}

function playNoise(duration, volume = 0.08) {
  const ctx = getCtx();
  const bufferSize = ctx.sampleRate * duration;
  const buffer = ctx.createBuffer(1, bufferSize, ctx.sampleRate);
  const data = buffer.getChannelData(0);
  for (let i = 0; i < bufferSize; i++) {
    data[i] = (Math.random() * 2 - 1) * volume;
  }
  const source = ctx.createBufferSource();
  source.buffer = buffer;
  const gain = ctx.createGain();
  gain.gain.value = 1;
  gain.gain.exponentialRampToValueAtTime(0.001, ctx.currentTime + duration);
  source.connect(gain);
  gain.connect(ctx.destination);
  source.start();
}

const SOUNDS = {
  click: () => {
    playTone(800, 0.05, 'square', 0.1);
  },

  powerUp: () => {
    const ctx = getCtx();
    [200, 300, 400, 500, 600, 800].forEach((freq, i) => {
      setTimeout(() => playTone(freq, 0.1, 'square', 0.12), i * 60);
    });
  },

  hit: () => {
    playNoise(0.1, 0.15);
    playTone(150, 0.15, 'sawtooth', 0.12);
  },

  block: () => {
    playTone(300, 0.08, 'triangle', 0.1);
    playTone(200, 0.08, 'triangle', 0.08);
  },

  win: () => {
    [523, 659, 784, 1047].forEach((freq, i) => {
      setTimeout(() => playTone(freq, 0.25, 'square', 0.12), i * 150);
    });
  },

  lose: () => {
    [400, 350, 300, 200].forEach((freq, i) => {
      setTimeout(() => playTone(freq, 0.3, 'sawtooth', 0.1), i * 200);
    });
  },

  menuHum: () => {
    playTone(110, 2, 'sine', 0.03);
  },
};

let muted = false;

export const SoundManager = {
  init() {
    getCtx();
  },

  play(name) {
    if (muted) return;
    const fn = SOUNDS[name];
    if (fn) {
      try { fn(); } catch (e) { /* ignore audio errors */ }
    }
  },

  setMuted(val) {
    muted = val;
  },
};
