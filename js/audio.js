/* Purrfect Pour — tiny synthesized sound effects (no audio files needed). */
(function () {
  'use strict';
  let ctx = null;
  let enabled = true;

  function ac() {
    if (!ctx) {
      const AC = window.AudioContext || window.webkitAudioContext;
      if (!AC) return null;
      ctx = new AC();
    }
    if (ctx.state === 'suspended') ctx.resume();
    return ctx;
  }

  function tone(freq, dur, { type = 'sine', vol = 0.06, at = 0, slide = 0 } = {}) {
    const a = ac();
    if (!a) return;
    const t0 = a.currentTime + at;
    const o = a.createOscillator(), g = a.createGain();
    o.type = type;
    o.frequency.setValueAtTime(freq, t0);
    if (slide) o.frequency.exponentialRampToValueAtTime(freq * slide, t0 + dur);
    g.gain.setValueAtTime(0.0001, t0);
    g.gain.exponentialRampToValueAtTime(vol, t0 + 0.01);
    g.gain.exponentialRampToValueAtTime(0.0001, t0 + dur);
    o.connect(g).connect(a.destination);
    o.start(t0); o.stop(t0 + dur + 0.02);
  }

  const sounds = {
    tap: () => tone(660, 0.06, { type: 'triangle', vol: 0.04 }),
    select: () => { tone(523, 0.07, { type: 'triangle' }); tone(784, 0.08, { type: 'triangle', at: 0.05 }); },
    pour: () => tone(300 + Math.random() * 60, 0.05, { type: 'sine', vol: 0.025 }),
    coin: () => { tone(988, 0.08, { type: 'square', vol: 0.03 }); tone(1319, 0.14, { type: 'square', vol: 0.03, at: 0.07 }); },
    heart: () => [523, 659, 784, 1047].forEach((f, i) => tone(f, 0.12, { type: 'triangle', vol: 0.05, at: i * 0.06 })),
    wrong: () => { tone(330, 0.14, { type: 'triangle', slide: 0.7 }); tone(247, 0.2, { type: 'triangle', at: 0.12, slide: 0.8 }); },
    unlock: () => [659, 784, 988, 1319, 1568].forEach((f, i) => tone(f, 0.16, { type: 'triangle', vol: 0.05, at: i * 0.07 })),
    blip: () => tone(880 + Math.random() * 80, 0.025, { type: 'square', vol: 0.012 }),
  };

  /* Optional recorded audio. Drop files into assets/audio/ (not committed; see README).
     Music moods: busy, reflect, mystery, light, romance, dream (.mp3 or .ogg).
     Sound files: bell, pour-coffee, pour-milk, whisk (.mp3 or .ogg). Missing files are skipped. */
  const EXT = ['mp3', 'ogg'];
  const missing = new Set();
  const cache = {};
  function load(name, loop) {
    if (cache[name]) return cache[name];
    let i = 0;
    const a = new Audio();
    a.loop = !!loop;
    a.preload = 'auto';
    a.addEventListener('error', () => {
      if (++i < EXT.length) a.src = `assets/audio/${name}.${EXT[i]}`;
      else missing.add(name);
    });
    a.src = `assets/audio/${name}.${EXT[0]}`;
    cache[name] = a;
    return a;
  }
  let mood = null, track = null, held = null, amb = false;
  function fadeTo(a, vol, done) {
    clearInterval(a._f);
    a._f = setInterval(() => {
      a.volume = Math.max(0, Math.min(1, a.volume + (vol > a.volume ? 0.05 : -0.05)));
      if (Math.abs(a.volume - vol) < 0.051) { a.volume = vol; clearInterval(a._f); done && done(); }
    }, 60);
  }
  const MUSIC_VOL = 0.35;

  window.Sfx = {
    play(name) { if (!enabled) return; try { sounds[name] && sounds[name](); } catch (e) { /* audio is optional */ } },
    file(name, vol = 0.6) {
      if (!enabled || missing.has(name)) return;
      try { const a = load(name, false); a.volume = vol; a.currentTime = 0; a.play().catch(() => {}); } catch (e) { /* optional */ }
    },
    hold(name, vol = 0.7) {
      this.release();
      if (!enabled || missing.has(name)) return;
      try { const a = load(name, true); a.volume = vol; a.currentTime = 0; a.play().catch(() => {}); held = a; } catch (e) { /* optional */ }
    },
    release() { if (held) { const h = held; held = null; fadeTo(h, 0, () => h.pause()); } },
    ambience(on) {
      amb = !!on;
      if (!enabled || missing.has('ambience')) return;
      const a = load('ambience', true);
      if (amb && a.paused) { a.volume = 0; a.play().then(() => fadeTo(a, 0.22)).catch(() => {}); }
      else if (!amb && !a.paused) fadeTo(a, 0, () => a.pause());
    },
    music(next) {
      mood = next || null;
      if (!enabled) return this.stopMusic();
      if (track && track._mood === mood) return;
      const old = track;
      track = null;
      if (old) fadeTo(old, 0, () => old.pause());
      if (!mood || missing.has(mood)) return;
      const a = load(mood, true);
      a._mood = mood;
      a.volume = 0;
      a.play().then(() => fadeTo(a, MUSIC_VOL)).catch(() => {});
      track = a;
    },
    stopMusic() { if (track) { const t = track; track = null; fadeTo(t, 0, () => t.pause()); } },
    setEnabled(v) {
      enabled = !!v;
      if (!enabled) { this.stopMusic(); this.release(); if (cache.ambience) cache.ambience.pause(); }
      else { if (mood) { const m = mood; mood = null; this.music(m); } this.ambience(amb); }
    },
  };
})();
