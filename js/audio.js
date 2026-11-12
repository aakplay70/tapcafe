/* Tap Café — sound. Everything is synthesised with WebAudio: no audio files.
   Sound effects get small random variations; each round has its own café music. */
(function () {
  'use strict';
  const TC = window.TC;
  let ctx = null, master, sfxBus, musBus, noiseBuf;
  let muted = false;
  try { muted = localStorage.getItem('tapcafe.muted') === '1'; } catch (e) { /* fine */ }
  let wantMode = null, mode = null, timer = 0, nextT = 0, step = 0, prog = null, arpPat = null, lastMel = 3;

  const r = (a, b) => a + Math.random() * (b - a);
  const pick = (a) => a[Math.floor(Math.random() * a.length)];
  const mf = (n) => 440 * Math.pow(2, (n - 69) / 12);

  function ensure() {
    if (ctx) return ctx;
    const AC = window.AudioContext || window.webkitAudioContext;
    if (!AC) return null;
    try { ctx = new AC(); } catch (e) { return null; }
    master = ctx.createGain(); master.gain.value = muted ? 0 : 1; master.connect(ctx.destination);
    sfxBus = ctx.createGain(); sfxBus.gain.value = 0.6; sfxBus.connect(master);
    const lp = ctx.createBiquadFilter(); lp.type = 'lowpass'; lp.frequency.value = 3200;
    musBus = ctx.createGain(); musBus.gain.value = 0.3; musBus.connect(lp); lp.connect(master);
    noiseBuf = ctx.createBuffer(1, ctx.sampleRate, ctx.sampleRate);
    const d = noiseBuf.getChannelData(0);
    for (let i = 0; i < d.length; i++) d[i] = Math.random() * 2 - 1;
    return ctx;
  }

  // ---------- building blocks ----------
  function tone(o) {
    const t0 = o.t || ctx.currentTime, a = o.attack || 0.005;
    const osc = ctx.createOscillator(); osc.type = o.type || 'sine';
    osc.frequency.setValueAtTime(o.f, t0);
    if (o.to) osc.frequency.exponentialRampToValueAtTime(o.to, t0 + o.dur);
    const g = ctx.createGain();
    g.gain.setValueAtTime(0.0001, t0);
    g.gain.exponentialRampToValueAtTime(o.vol || 0.3, t0 + a);
    g.gain.exponentialRampToValueAtTime(0.0001, t0 + o.dur);
    osc.connect(g);
    let out = g;
    if (o.lp) { const f = ctx.createBiquadFilter(); f.type = 'lowpass'; f.frequency.value = o.lp; g.connect(f); out = f; }
    out.connect(o.bus || sfxBus);
    osc.start(t0); osc.stop(t0 + o.dur + 0.05);
  }
  function noise(o) {
    const t0 = o.t || ctx.currentTime, a = o.attack || 0.004;
    const src = ctx.createBufferSource(); src.buffer = noiseBuf; src.loop = true;
    const f = ctx.createBiquadFilter(); f.type = o.type || 'bandpass'; f.Q.value = o.q || 1;
    f.frequency.setValueAtTime(o.f, t0);
    if (o.to) f.frequency.exponentialRampToValueAtTime(o.to, t0 + o.dur);
    const g = ctx.createGain();
    g.gain.setValueAtTime(0.0001, t0);
    g.gain.exponentialRampToValueAtTime(o.vol || 0.2, t0 + a);
    g.gain.exponentialRampToValueAtTime(0.0001, t0 + o.dur);
    src.connect(f); f.connect(g); g.connect(o.bus || sfxBus);
    src.start(t0, Math.random() * 0.5); src.stop(t0 + o.dur + 0.05);
  }

  // ---------- sound effects ----------
  const S = {
    tap() { tone({ f: r(640, 720), dur: 0.07, type: 'triangle', vol: 0.18 }); },
    drink(i) {
      const base = [392, 466, 523][i % 3] * r(0.99, 1.01);
      tone({ f: base, dur: 0.16, type: 'triangle', vol: 0.3, lp: 2500 });
      tone({ f: base * 2, dur: 0.1, vol: 0.1 });
    },
    top(on) {
      const f = r(480, 640);
      if (on) { tone({ f, to: f * 0.45, dur: 0.14, vol: 0.34 }); noise({ f: 2800, q: 2, dur: 0.06, vol: 0.06 }); }
      else tone({ f: f * 0.8, to: f * 1.25, dur: 0.09, vol: 0.18 });
    },
    pour(d) { noise({ f: 900, to: 2400, q: 1.6, dur: d, vol: 0.2, attack: 0.05 }); },
    ready() {
      const f = r(1040, 1110), t = ctx.currentTime;
      tone({ f, dur: 0.5, vol: 0.28 });
      tone({ f: f * 1.5, t: t + 0.09, dur: 0.55, vol: 0.2 });
    },
    queue() { tone({ f: 880, dur: 0.05, type: 'square', vol: 0.05, lp: 2000 }); },
    wrong() {
      const t = ctx.currentTime;
      tone({ f: 233, to: 160, dur: 0.18, type: 'triangle', vol: 0.3, lp: 900 });
      tone({ f: 196, to: 130, t: t + 0.12, dur: 0.22, type: 'triangle', vol: 0.3, lp: 900 });
    },
    toss() { noise({ f: 2400, to: 300, q: 0.8, dur: 0.28, vol: 0.22 }); },
    serve(streak) {
      const t = ctx.currentTime;
      const climb = [0, 2, 4, 7, 9, 12, 14, 16];
      const base = 659 * Math.pow(2, climb[Math.min(Math.max(streak, 1) - 1, 7)] / 12);
      const shape = pick([[1, 1.25, 1.5], [1, 1.5, 2], [1, 1.2, 1.5, 2]]);
      shape.forEach((m, i) => tone({ f: base * m, t: t + i * 0.055, dur: 0.35, vol: 0.22 }));
      tone({ f: base / 2, dur: 0.4, type: 'triangle', vol: 0.18, lp: 1800 });
      noise({ f: 5000, type: 'highpass', dur: 0.1, vol: 0.05, t: t + 0.02 });
    },
    walkout() {
      const t = ctx.currentTime;
      [[440, 392], [370, 330], [311, 262]].forEach((p, i) => tone({ f: p[0], to: p[1], t: t + i * 0.16, dur: 0.22, type: 'triangle', vol: 0.24, lp: 1400 }));
    },
    impatient(m) {
      if (m === 1) tone({ f: 500, to: 760, dur: 0.14, vol: 0.2 });
      else { const t = ctx.currentTime; tone({ f: 190, dur: 0.1, type: 'square', vol: 0.07, lp: 600 }); tone({ f: 175, t: t + 0.13, dur: 0.12, type: 'square', vol: 0.07, lp: 600 }); }
    },
    bell() {
      const p = pick([[1319, 1047], [1175, 880], [1568, 1175]]), t = ctx.currentTime;
      tone({ f: p[0], dur: 0.55, vol: 0.1 });
      tone({ f: p[1], t: t + 0.13, dur: 0.7, vol: 0.1 });
    },
    round(n) {
      const t = ctx.currentTime;
      const sets = { 1: [523, 659, 784], 2: [587, 740, 880], 3: [659, 831, 988, 1319] };
      (sets[n] || sets[1]).forEach((f, i) => tone({ f, t: t + i * 0.1, dur: 0.4, type: 'triangle', vol: 0.24 }));
    },
    timeup() {
      const t = ctx.currentTime;
      tone({ f: 1568, dur: 0.9, vol: 0.2 });
      tone({ f: 1047, t: t + 0.18, dur: 1.0, vol: 0.18 });
    },
    buy() {
      const t = ctx.currentTime;
      noise({ f: 6000, type: 'highpass', dur: 0.05, vol: 0.12 });
      tone({ f: 1568, t: t + 0.04, dur: 0.5, vol: 0.22 });
      tone({ f: 2093, t: t + 0.12, dur: 0.7, vol: 0.2 });
      [0, 1, 2, 3].forEach((i) => tone({ f: r(2400, 3200), t: t + 0.2 + i * 0.045, dur: 0.12, vol: 0.08 }));
    },
    fanfare(stars) {
      const t = ctx.currentTime;
      const notes = [[392, 494], [523, 659], [523, 659, 784], [523, 659, 784, 1047]][stars] || [523];
      notes.forEach((f, i) => tone({ f, t: t + i * 0.14, dur: 0.9, type: 'triangle', vol: 0.22 }));
      if (stars === 3) notes.forEach((f) => tone({ f, t: t + 0.7, dur: 1.2, type: 'triangle', vol: 0.12 }));
    },
  };

  // ---------- music ----------
  const CH = {
    C: [48, [0, 4, 7, 11]], Am: [45, [0, 3, 7, 10]], Dm: [50, [0, 3, 7, 10]],
    G: [43, [0, 4, 7, 10]], F: [41, [0, 4, 7, 11]], Em: [52, [0, 3, 7, 10]],
  };
  const PROGS = [['C', 'Am', 'Dm', 'G'], ['C', 'Em', 'F', 'G'], ['F', 'G', 'Em', 'Am'], ['Am', 'Dm', 'G', 'C']];
  const ARPS = [[0, 1, 2, 3, 2, 1, 2, 3], [0, 2, 1, 3, 0, 2, 1, 3], [3, 2, 1, 0, 1, 2, 3, 2]];
  const PENT = [60, 62, 64, 67, 69, 72, 74, 76];
  // lobby = gentle pad; r1 = chill; r2 = bossa-ish; r3 = upbeat
  const M = {
    lobby: { bpm: 70, pad: true, arp: 0, mel: 0.3, bass: [], hat: 0, kick: [] },
    r1: { bpm: 78, arp: 0.5, mel: 0.2, bass: [0, 4], hat: 1, kick: [] },
    r2: { bpm: 98, arp: 0.45, mel: 0.35, bass: [0, 3, 4, 7], hat: 2, kick: [] },
    r3: { bpm: 120, arp: 0.85, mel: 0.3, bass: [0, 2, 4, 6], hat: 3, kick: [0, 4] },
  };
  function ep(n, t, dur, vol) {
    const f = mf(n);
    tone({ f, t, dur, type: 'triangle', vol, bus: musBus, attack: 0.01, lp: 2200 });
    tone({ f: f * 2, t, dur: dur * 0.5, vol: vol * 0.35, bus: musBus });
  }
  function musicStep(t) {
    const cfg = M[mode], sd = 60 / cfg.bpm / 2;
    const s8 = step % 8, ci = Math.floor(step / 8) % 4;
    if (step % 32 === 0) prog = pick(PROGS);
    if (s8 === 0) arpPat = pick(ARPS);
    const [root, iv] = CH[prog[ci]];
    const chord = iv.map((i) => root + 12 + i);
    if (cfg.pad && s8 === 0) chord.forEach((n) => tone({ f: mf(n), t, dur: sd * 8, type: 'triangle', vol: 0.06, attack: 0.5, lp: 900, bus: musBus }));
    if (cfg.arp && Math.random() < cfg.arp) ep(chord[arpPat[s8]] + (mode === 'r3' ? 12 : 0), t, sd * 3, mode === 'r3' ? 0.1 : 0.12);
    if (cfg.bass.indexOf(s8) >= 0) tone({ f: mf(root + (s8 === 4 && mode === 'r2' ? 7 : 0)), t, dur: sd * 1.6, type: 'triangle', vol: 0.24, lp: 700, bus: musBus });
    if (cfg.kick.indexOf(s8) >= 0) tone({ f: 130, to: 48, t, dur: 0.16, vol: 0.4, bus: musBus });
    if (cfg.hat === 1 && s8 % 2 === 1) noise({ f: 7000, type: 'highpass', t, dur: 0.05, vol: 0.02, bus: musBus });
    if (cfg.hat >= 2) noise({ f: 7000, type: 'highpass', t, dur: 0.045, vol: s8 % 2 ? 0.035 : 0.02, bus: musBus });
    if (cfg.mel && Math.random() < cfg.mel * (s8 % 2 === 0 ? 1 : 0.4)) {
      lastMel = Math.max(0, Math.min(PENT.length - 1, lastMel + Math.round(r(-2, 2))));
      tone({ f: mf(PENT[lastMel]), t, dur: sd * pick([2, 3, 4]), vol: 0.1, attack: 0.02, bus: musBus });
    }
    step++;
  }
  function tick() {
    if (!ctx || !mode) return;
    if (nextT < ctx.currentTime) nextT = ctx.currentTime + 0.05;
    while (nextT < ctx.currentTime + 0.4) {
      musicStep(nextT);
      nextT += 60 / M[mode].bpm / 2;
    }
  }
  function startMode(m) {
    if (mode === m) return;
    mode = m; step = 0; prog = pick(PROGS); lastMel = 3;
    nextT = ctx ? ctx.currentTime + 0.1 : 0;
    if (!timer) timer = setInterval(tick, 100);
  }

  // ---------- public ----------
  const A = (TC.audio = {
    unlock() {
      if (!ensure()) return;
      if (ctx.state === 'suspended' && !document.hidden) ctx.resume();
      if (wantMode && mode !== wantMode) startMode(wantMode);
    },
    sfx(name, arg) {
      if (muted || !ensure() || ctx.state !== 'running') return;
      try { S[name](arg); } catch (e) { if (window.console) console.warn('sound failed:', name, e); }
    },
    music(m) {
      wantMode = m;
      if (ctx && ctx.state === 'running') startMode(m);
    },
    toggleMute() {
      muted = !muted;
      try { localStorage.setItem('tapcafe.muted', muted ? '1' : '0'); } catch (e) { /* fine */ }
      if (ctx) master.gain.setTargetAtTime(muted ? 0 : 1, ctx.currentTime, 0.03);
      return muted;
    },
    isMuted() { return muted; },
    state() { return ctx ? ctx.state : 'none'; },
    names() { return Object.keys(S); },
  });

  // Browsers only allow sound after a tap: wake the audio up on the first one.
  ['pointerdown', 'pointerup', 'click', 'keydown'].forEach((ev) => document.addEventListener(ev, A.unlock, { passive: true }));
  // Quiet while the tab is hidden, like the game itself.
  document.addEventListener('visibilitychange', () => {
    if (!ctx) return;
    if (document.hidden) ctx.suspend();
    else ctx.resume();
  });
})();
