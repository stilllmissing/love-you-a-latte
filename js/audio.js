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

  window.Sfx = {
    play(name) { if (!enabled) return; try { sounds[name] && sounds[name](); } catch (e) { /* audio is optional */ } },
    setEnabled(v) { enabled = !!v; },
  };
})();
