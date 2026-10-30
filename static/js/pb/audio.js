/* pb/audio.js — battle music, Gen 5 cries (PokeAPI legacy) and synthesised Gen 5-style sound effects. */
(function (root) {
'use strict';

var ac = null, master = null, bgm = null, alarm = null, muted = false;

function ctx() {
  if (!ac) {
    var AC = root.AudioContext || root.webkitAudioContext;
    if (!AC) return null;
    ac = new AC();
    master = ac.createGain();
    master.gain.value = 0.55;
    master.connect(ac.destination);
  }
  if (ac.state === 'suspended') ac.resume();
  return ac;
}

function tone(type, f0, f1, dur, vol, when) {
  var c = ctx(); if (!c || muted) return;
  var t = c.currentTime + (when || 0);
  var o = c.createOscillator(), g = c.createGain();
  o.type = type;
  o.frequency.setValueAtTime(f0, t);
  if (f1 && f1 !== f0) o.frequency.exponentialRampToValueAtTime(f1, t + dur);
  g.gain.setValueAtTime(vol, t);
  g.gain.exponentialRampToValueAtTime(0.0001, t + dur);
  o.connect(g); g.connect(master);
  o.start(t); o.stop(t + dur + 0.02);
}

function noise(dur, vol, filterType, freq, when, q) {
  var c = ctx(); if (!c || muted) return;
  var t = c.currentTime + (when || 0);
  var len = Math.max(1, Math.floor(c.sampleRate * dur));
  var buf = c.createBuffer(1, len, c.sampleRate), d = buf.getChannelData(0);
  for (var i = 0; i < len; i++) d[i] = (Math.random() * 2 - 1) * Math.pow(1 - i / len, 0.6);
  var src = c.createBufferSource(); src.buffer = buf;
  var g = c.createGain(); g.gain.setValueAtTime(vol, t);
  g.gain.exponentialRampToValueAtTime(0.0001, t + dur);
  if (filterType) {
    var f = c.createBiquadFilter(); f.type = filterType; f.frequency.value = freq; if (q) f.Q.value = q;
    src.connect(f); f.connect(g);
  } else src.connect(g);
  g.connect(master); src.start(t);
}

var SFX = {
  select: function () { tone('square', 1320, 1320, 0.05, 0.08); tone('square', 1760, 1760, 0.06, 0.07, 0.045); },
  cancel: function () { tone('square', 990, 660, 0.08, 0.07); },
  error:  function () { tone('square', 220, 220, 0.12, 0.09); tone('square', 196, 196, 0.14, 0.09, 0.12); },
  advance: function () { tone('square', 1568, 1568, 0.035, 0.05); },
  throwBall: function () { noise(0.35, 0.18, 'bandpass', 2200, 0, 1.5); tone('sine', 900, 1800, 0.3, 0.05); },
  ballOpen: function () {
    noise(0.25, 0.3, 'highpass', 3000);
    tone('triangle', 1200, 2400, 0.12, 0.12);
    tone('sine', 2400, 600, 0.35, 0.08, 0.06);
  },
  // Hit sounds: the three Gen 5 variants differ in weight
  hit: function (eff) {
    if (eff > 1) {
      noise(0.28, 0.75, 'lowpass', 2600); tone('square', 180, 40, 0.24, 0.32); tone('sine', 90, 30, 0.3, 0.5);
    } else if (eff < 1) {
      noise(0.12, 0.35, 'bandpass', 1400, 0, 1.2); tone('square', 300, 160, 0.08, 0.12);
    } else {
      noise(0.18, 0.55, 'lowpass', 2000); tone('square', 220, 70, 0.14, 0.22);
    }
  },
  drainTick: function () { tone('square', 1046, 1046, 0.018, 0.025); },
  faint: function () { tone('square', 600, 80, 0.55, 0.14); noise(0.4, 0.2, 'lowpass', 500, 0.3); },
  statUp: function () { [0, 0.07, 0.14, 0.21].forEach(function (d, i) { tone('square', 660 * Math.pow(1.26, i), 0, 0.09, 0.07, d); }); },
  heal: function () { [0, 0.08, 0.16, 0.24, 0.32].forEach(function (d, i) { tone('triangle', 880 + i * 220, 0, 0.12, 0.12, d); }); },
  screen: function () { tone('sine', 400, 1600, 0.45, 0.12); tone('triangle', 800, 2400, 0.5, 0.06, 0.1); },
  para: function () { for (var i = 0; i < 5; i++) noise(0.05, 0.25, 'highpass', 4000, i * 0.07); },
  expTick: function () { tone('sine', 1400 + Math.random() * 300, 0, 0.03, 0.03); },
  levelUp: function () {
    var n = [784, 988, 1175, 1568];
    n.forEach(function (f, i) { tone('square', f, f, 0.14, 0.09, i * 0.12); tone('triangle', f / 2, f / 2, 0.14, 0.08, i * 0.12); });
  },
  // Moves
  fire: function (big) { noise(0.7, big ? 0.55 : 0.4, 'bandpass', 700, 0, 0.7); tone('sawtooth', 220, 50, 0.6, 0.16); },
  electric: function (big) {
    for (var i = 0; i < 7; i++) noise(0.06, 0.32, 'highpass', 2500 + Math.random() * 3000, i * 0.05);
    tone('square', 1800, 120, 0.4, 0.1); if (big) tone('sawtooth', 80, 40, 0.5, 0.2, 0.25);
  },
  dragon: function () { noise(0.8, 0.35, 'lowpass', 700); tone('sawtooth', 140, 60, 0.7, 0.14); tone('sine', 900, 300, 0.5, 0.05); },
  slash: function () { noise(0.12, 0.5, 'highpass', 3500); noise(0.12, 0.45, 'highpass', 3000, 0.12); },
  psychic: function () { tone('sine', 300, 1200, 0.6, 0.12); tone('sine', 310, 1240, 0.6, 0.1); tone('triangle', 1200, 300, 0.4, 0.06, 0.4); },
  beam: function () { tone('sawtooth', 120, 900, 0.5, 0.14); noise(0.9, 0.35, 'bandpass', 1200, 0.35, 0.8); tone('square', 60, 30, 0.8, 0.25, 0.35); },
  charge: function () { noise(0.5, 0.4, 'lowpass', 900); tone('square', 100, 400, 0.4, 0.15); },
};

function play(name, arg) { try { if (SFX[name]) SFX[name](arg); } catch (e) {} }

function startMusic() {
  if (bgm) return;
  bgm = new Audio('static/audio/battle-music.mp3');
  bgm.loop = true;
  bgm.volume = muted ? 0 : 0.4;
  bgm.play().catch(function () {});
}
function fadeMusic(ms) {
  if (!bgm) return;
  var a = bgm, v0 = a.volume, t0 = performance.now();
  (function step(now) {
    var k = Math.min(1, (now - t0) / ms);
    a.volume = v0 * (1 - k);
    if (k < 1) requestAnimationFrame(step); else a.pause();
  })(t0);
}
function stopMusic() { if (bgm) { bgm.pause(); bgm = null; } }

// Cries: Gen 5 audio from PokeAPI's "legacy" set. Fainting plays it slowed down.
var cache = {};
function cry(url, slow) {
  if (muted) return;
  try {
    var a = new Audio(url);
    a.volume = 0.6;
    if (slow) { a.preservesPitch = false; a.mozPreservesPitch = false; a.webkitPreservesPitch = false; a.playbackRate = 0.75; }
    a.play().catch(function () {});
    cache[url] = a;
  } catch (e) {}
}
function preload(url) { if (!cache[url]) { var a = new Audio(); a.preload = 'auto'; a.src = url; cache[url] = a; } }

// Low-HP alarm: the two-note beep that loops while your HP is in the red.
function setAlarm(on) {
  if (on && !alarm && !muted) {
    alarm = setInterval(function () { tone('square', 1568, 1568, 0.08, 0.05); tone('square', 1175, 1175, 0.08, 0.05, 0.11); }, 520);
  } else if (!on && alarm) { clearInterval(alarm); alarm = null; }
}

function setMuted(m) { muted = m; if (bgm) bgm.volume = m ? 0 : 0.4; if (m) setAlarm(false); }

function stopAll() {
  setAlarm(false); stopMusic();
  Object.keys(cache).forEach(function (k) { try { cache[k].pause(); } catch (e) {} });
  cache = {};
}

root.PB.audio = {
  play: play, startMusic: startMusic, fadeMusic: fadeMusic, stopMusic: stopMusic,
  cry: cry, preload: preload, setAlarm: setAlarm, setMuted: setMuted, stopAll: stopAll,
  isMuted: function () { return muted; },
};
})(window);
