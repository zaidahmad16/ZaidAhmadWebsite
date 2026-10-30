/* pb/fx.js — move animations. Particles go on a pixel canvas in world space; the projectile
   sprites (static/images/pb/fx/*.png) come from Pokémon Showdown's battle effects. */
(function (root) {
'use strict';

var SC = function () { return PB.scene; };
var sleep = function (ms) { return new Promise(function (r) { setTimeout(r, ms); }); };
var FX_DIR = 'static/images/pb/fx/';

// ── Particles ────────────────────────────────────────────────────────────
var parts = [], raf = null, ctx = null;
function canvasCtx() {
  var s = SC().get();
  if (!s) return null;
  if (!ctx || ctx.canvas !== s.fxCanvas) { ctx = s.fxCanvas.getContext('2d'); }
  return ctx;
}
function spawn(p) {
  parts.push(Object.assign({ vx: 0, vy: 0, g: 0, drag: 0.96, life: 1, decay: 0.03, size: 2, color: '#fff', shape: 'sq' }, p));
  if (!raf) raf = requestAnimationFrame(loop);
}
function loop() {
  var c = canvasCtx();
  if (!c) { parts = []; raf = null; return; }
  var px = SC().PAD_X, py = SC().PAD_Y;
  c.clearRect(0, 0, c.canvas.width, c.canvas.height);
  parts = parts.filter(function (p) {
    p.vx *= p.drag; p.vy = p.vy * p.drag + p.g; p.x += p.vx; p.y += p.vy; p.life -= p.decay;
    if (p.life <= 0) return false;
    c.globalAlpha = Math.min(1, p.life * 1.4);
    c.fillStyle = p.color;
    var s = Math.max(1, Math.round(p.size * (p.shrink === false ? 1 : Math.sqrt(p.life))));
    var x = Math.round(p.x + px - s / 2), y = Math.round(p.y + py - s / 2);
    if (p.shape === 'line') {
      c.strokeStyle = p.color; c.lineWidth = s; c.beginPath();
      c.moveTo(x, y); c.lineTo(Math.round(x - p.vx * 3), Math.round(y - p.vy * 3)); c.stroke();
    } else c.fillRect(x, y, s, s);
    return true;
  });
  c.globalAlpha = 1;
  // Persistent drawings (beams, slashes) registered for this frame
  draws = draws.filter(function (d) { return d(c, px, py) !== false; });
  raf = (parts.length || draws.length) ? requestAnimationFrame(loop) : null;
  if (!raf) c.clearRect(0, 0, c.canvas.width, c.canvas.height);
}
var draws = [];
function addDraw(fn) { draws.push(fn); if (!raf) raf = requestAnimationFrame(loop); }

function burstAt(x, y, n, colors, spd, size, opts) {
  for (var i = 0; i < n; i++) {
    var a = Math.random() * Math.PI * 2, v = spd * (0.35 + Math.random() * 0.65);
    spawn(Object.assign({ x: x, y: y, vx: Math.cos(a) * v, vy: Math.sin(a) * v * 0.8,
      size: size * (0.6 + Math.random() * 0.6), color: colors[i % colors.length], decay: 0.03 + Math.random() * 0.02 }, opts || {}));
  }
}
function pick(a) { return a[Math.floor(Math.random() * a.length)]; }

// ── Helpers ──────────────────────────────────────────────────────────────
function focus(side) { return SC().POS[side].focus; }
function other(side) { return side === 'player' ? 'opp' : 'player'; }

function sprite(name, x, y, size, cls) {
  var img = SC().el('img', 'pb-px pb-fxsprite' + (cls ? ' ' + cls : ''), SC().get().fxLayer);
  img.src = FX_DIR + name + '.png'; img.alt = '';
  img.style.width = size + 'px'; img.style.height = size + 'px';
  img.style.left = (x - size / 2) + 'px'; img.style.top = (y - size / 2) + 'px';
  return img;
}
function moveTo(img, from, to, ms, extra) {
  var dx = to.x - from.x, dy = to.y - from.y;
  return SC().anim(img, [{ transform: 'translate(0,0) ' + (extra ? extra[0] : '') },
    { transform: 'translate(' + dx + 'px,' + dy + 'px) ' + (extra ? extra[1] : '') }],
    { duration: ms, easing: 'ease-in' });
}

function lunge(side, dist, ms) {
  var w = SC().mon(side).wrap, d = dist || 22;
  var dx = side === 'player' ? d : -d, dy = side === 'player' ? -d * 0.6 : d * 0.4;
  return SC().anim(w, [{ transform: 'translate(0,0)' }, { transform: 'translate(' + dx + 'px,' + dy + 'px)', offset: 0.45 }, { transform: 'translate(0,0)' }],
    { duration: ms || 360, easing: 'ease-in-out', fill: 'none' });
}
function shake(side, amt) {
  var w = SC().mon(side).wrap, a = amt || 4;
  return SC().anim(w, [{ transform: 'translateX(0)' }, { transform: 'translateX(' + -a + 'px)' }, { transform: 'translateX(' + a + 'px)' },
    { transform: 'translateX(' + -a + 'px)' }, { transform: 'translateX(' + a + 'px)' }, { transform: 'translateX(0)' }],
    { duration: 380, fill: 'none' });
}
function aura(side, colors, ms) {
  var f = focus(side), t0 = performance.now();
  return new Promise(function (res) {
    (function tick(now) {
      if (!SC().get()) return res();
      for (var i = 0; i < 3; i++) {
        var a = Math.random() * Math.PI * 2, r = 18 + Math.random() * 16;
        spawn({ x: f.x + Math.cos(a) * r, y: f.y + Math.sin(a) * r * 1.2, vx: -Math.cos(a) * 0.4, vy: -0.8 - Math.random(),
          size: 2 + Math.random() * 2, color: pick(colors), decay: 0.045 });
      }
      if (now - t0 < ms) requestAnimationFrame(tick); else res();
    })(t0);
  });
}

// ── Moves ────────────────────────────────────────────────────────────────
var FIRE = ['#fff7c0', '#ffd040', '#ff9020', '#ff5010', '#d82800'];
var ELEC = ['#ffffff', '#fff27a', '#ffe020', '#7ab8ff', '#4878f0'];
var DRAG = ['#a070ff', '#7048e8', '#58e0a0', '#30b878', '#d0c0ff'];
var PSY  = ['#ff80c8', '#ff50a0', '#e0a0ff', '#ffffff'];
var NORM = ['#ffffff', '#fff0c0', '#ffd890', '#ffa040'];

var MOVES = {
  'fusion-flare': function (a, big) {
    var from = { x: focus(a).x, y: focus(a).y - (a === 'player' ? 50 : 34) }, to = focus(other(a));
    PB.audio.play('fire', big);
    var size = big ? 46 : 34;
    var ball = sprite('flareball', from.x, from.y, size);
    var t0 = performance.now();
    // Flames are drawn in toward the ball while it swells
    return new Promise(function (res) {
      (function gather(now) {
        if (!SC().get()) return res();
        var a2 = Math.random() * Math.PI * 2, r = 30 + Math.random() * 20;
        spawn({ x: from.x + Math.cos(a2) * r, y: from.y + Math.sin(a2) * r, vx: -Math.cos(a2) * r / 14, vy: -Math.sin(a2) * r / 14,
          drag: 0.9, size: 3, color: pick(FIRE), decay: 0.06 });
        if (now - t0 < 520) requestAnimationFrame(gather); else res();
      })(t0);
      SC().anim(ball, [{ transform: 'scale(0.1)' }, { transform: 'scale(1)' }], { duration: 520, easing: 'ease-out' });
    }).then(function () {
      if (big) SC().flash('#ffffff', 220, 0.85);
      return moveTo(ball, from, to, 300);
    }).then(function () {
      ball.remove();
      burstAt(to.x, to.y, big ? 90 : 60, FIRE, big ? 6 : 4.5, 4, { g: -0.05 });
      SC().flash('#ff7020', 260, 0.45);
    });
  },

  'fusion-bolt': function (a, big) {
    var f = focus(a), to = focus(other(a));
    PB.audio.play('electric', big);
    var orb = sprite('electroball', f.x, f.y, big ? 70 : 56, 'pb-fx-add');
    SC().anim(orb, [{ opacity: 0, transform: 'scale(0.6)' }, { opacity: 0.9, transform: 'scale(1.1)' }], { duration: 380 });
    return aura(a, ELEC, 380).then(function () {
      // The user turns into a bolt and charges the target
      var dx = to.x - f.x, dy = to.y - f.y, w = SC().mon(a).wrap;
      moveTo(orb, f, to, 220);
      return SC().anim(w, [{ transform: 'translate(0,0)' }, { transform: 'translate(' + dx * 0.8 + 'px,' + dy * 0.8 + 'px)', offset: 0.4 },
        { transform: 'translate(0,0)' }], { duration: 560, easing: 'ease-in-out', fill: 'none' });
    }).then(function () {
      orb.remove();
      var bolt = sprite('lightning', to.x, to.y - 28, 64, 'pb-fx-add');
      SC().anim(bolt, [{ opacity: 1 }, { opacity: 0.2 }, { opacity: 1 }, { opacity: 0 }], { duration: 300, easing: 'steps(1,end)' })
        .then(function () { bolt.remove(); });
      burstAt(to.x, to.y, big ? 80 : 50, ELEC, 5, 3, { shape: 'line', decay: 0.05 });
      SC().flash('#fff8a0', 220, big ? 0.8 : 0.45);
    });
  },

  'dragon-breath': function (a) {
    var f = focus(a), to = focus(other(a));
    PB.audio.play('dragon');
    var from = { x: f.x + (a === 'player' ? 18 : -18), y: f.y - (a === 'player' ? 28 : 10) };
    var n = 14, done = [];
    for (var i = 0; i < n; i++) {
      (function (i) {
        done.push(sleep(i * 55).then(function () {
          if (!SC().get()) return;
          var puff = sprite('wisp', from.x, from.y, 18 + i, 'pb-fx-dragon' + (i % 2));
          var j = { x: to.x + (Math.random() - 0.5) * 30, y: to.y + (Math.random() - 0.5) * 24 };
          return moveTo(puff, from, j, 340, ['scale(0.5)', 'scale(1.6)']).then(function () {
            burstAt(j.x, j.y, 5, DRAG, 2, 3);
            puff.remove();
          });
        }));
      })(i);
    }
    return Promise.all(done).then(function () { SC().flash('#6040c0', 220, 0.3); });
  },

  'slash': function (a) {
    var to = focus(other(a));
    PB.audio.play('slash');
    var lines = [-14, 0, 14], t0 = performance.now();
    addDraw(function (c, px, py) {
      var k = (performance.now() - t0) / 380;
      if (k > 1) return false;
      lines.forEach(function (o, i) {
        var kk = Math.max(0, Math.min(1, k * 2.2 - i * 0.25));
        if (kk <= 0) return;
        var x0 = to.x - 26 + o + px, y0 = to.y - 26 + py, len = 52 * kk;
        c.globalAlpha = 1 - Math.max(0, k - 0.6) * 2.5;
        c.strokeStyle = '#ffffff'; c.lineWidth = 3;
        c.beginPath(); c.moveTo(x0, y0); c.lineTo(x0 + len, y0 + len); c.stroke();
        c.strokeStyle = '#c0d8ff'; c.lineWidth = 1;
        c.beginPath(); c.moveTo(x0 + 2, y0 - 1); c.lineTo(x0 + len + 2, y0 + len - 1); c.stroke();
        c.globalAlpha = 1;
      });
    });
    return lunge(a, 16, 300).then(function () { burstAt(to.x, to.y, 16, NORM, 3, 2); return sleep(160); });
  },

  'extrasensory': function (a) {
    var to = focus(other(a)), t0 = performance.now();
    PB.audio.play('psychic');
    SC().flash('#a040ff', 700, 0.35);
    addDraw(function (c, px, py) {
      var k = (performance.now() - t0) / 700;
      if (k > 1) return false;
      for (var i = 0; i < 3; i++) {
        var kk = (k * 1.6 - i * 0.2);
        if (kk <= 0 || kk >= 1) continue;
        c.globalAlpha = 1 - kk;
        c.strokeStyle = i % 2 ? '#ff80d0' : '#d0a0ff'; c.lineWidth = 2;
        c.beginPath(); c.ellipse(to.x + px, to.y + py, 6 + kk * 60, 4 + kk * 40, 0, 0, Math.PI * 2); c.stroke();
      }
      c.globalAlpha = 1;
    });
    return sleep(350).then(function () { return shake(other(a), 5); });
  },

  'zen-headbutt': function (a) {
    var to = focus(other(a));
    PB.audio.play('psychic');
    return aura(a, PSY, 480).then(function () {
      PB.audio.play('charge');
      return lunge(a, 46, 420);
    }).then(function () {
      burstAt(to.x, to.y, 40, PSY, 4.5, 3);
      SC().flash('#ff70c0', 240, 0.4);
    });
  },

  'hyper-beam': function (a) {
    var f = focus(a), to = focus(other(a)), t0 = performance.now();
    PB.audio.play('beam');
    return aura(a, NORM, 380).then(function () {
      t0 = performance.now();
      addDraw(function (c, px, py) {
        var k = (performance.now() - t0) / 800;
        if (k > 1) return false;
        var w = (k < 0.15 ? k / 0.15 : k > 0.8 ? (1 - k) / 0.2 : 1) * (9 + Math.sin(k * 60) * 2);
        [[w + 6, '#ff9020'], [w, '#ffe080'], [Math.max(1, w * 0.4), '#ffffff']].forEach(function (l) {
          c.strokeStyle = l[1]; c.lineWidth = l[0]; c.lineCap = 'round';
          c.beginPath(); c.moveTo(f.x + px, f.y + py); c.lineTo(to.x + px, to.y + py); c.stroke();
        });
        if (Math.random() < 0.6) spawn({ x: to.x, y: to.y, vx: (Math.random() - 0.5) * 6, vy: (Math.random() - 0.5) * 6, size: 3, color: pick(NORM), decay: 0.06 });
      });
      return sleep(800);
    }).then(function () {
      burstAt(to.x, to.y, 70, NORM, 5.5, 4);
      SC().flash('#ffffff', 300, 0.75);
    });
  },

  'giga-impact': function (a) {
    var to = focus(other(a));
    PB.audio.play('charge');
    SC().flash('#000000', 700, 0.45);
    return aura(a, ['#ffb040', '#ff7010', '#ffe0a0', '#602000'], 650).then(function () {
      PB.audio.play('beam');
      return lunge(a, 60, 460);
    }).then(function () {
      burstAt(to.x, to.y, 90, ['#ffffff', '#ffd080', '#ff9030', '#ff5000'], 6, 4);
      SC().flash('#ffffff', 320, 0.85);
    });
  },

  'reflect': function (a) { return wallAnim(a, 'reflect'); },
  'light-screen': function (a) { return wallAnim(a, 'lightscreen'); },

  'struggle': function (a) {
    PB.audio.play('charge');
    return lunge(a, 30, 380).then(function () { burstAt(focus(other(a)).x, focus(other(a)).y, 20, NORM, 3, 2); });
  },
};

function wallAnim(a, kind) {
  PB.audio.play('screen');
  SC().wall(a, kind, true);
  var f = focus(a);
  burstAt(f.x, f.y, 24, kind === 'reflect' ? ['#ffffff', '#ffe0a0', '#ffb0d0'] : ['#ffffff', '#a0e8ff', '#ffffa0'], 3, 2, { g: -0.03 });
  return sleep(650);
}

function play(moveId, side, boosted) {
  var fn = MOVES[moveId];
  return fn ? fn(side, boosted) : lunge(side);
}

function paraSparks(side) {
  PB.audio.play('para');
  var f = focus(side);
  for (var i = 0; i < 16; i++) {
    spawn({ x: f.x + (Math.random() - 0.5) * 40, y: f.y + (Math.random() - 0.5) * 40, vx: (Math.random() - 0.5) * 2, vy: (Math.random() - 0.5) * 2,
      size: 2, color: pick(ELEC), decay: 0.06, shape: 'line' });
  }
  return shake(side, 3);
}

function statRise(side) {
  PB.audio.play('statUp');
  var f = focus(side), t0 = performance.now();
  return new Promise(function (res) {
    (function tick(now) {
      if (!SC().get()) return res();
      for (var i = 0; i < 2; i++) {
        spawn({ x: f.x + (Math.random() - 0.5) * 50, y: f.y + 30, vy: -2.2, drag: 1, size: 2, color: pick(['#ff6060', '#ffa0a0', '#ffffff']),
          decay: 0.03, shape: 'line', shrink: false });
      }
      if (now - t0 < 600) requestAnimationFrame(tick); else res();
    })(t0);
  });
}
function healSparkle(side) {
  PB.audio.play('heal');
  var f = focus(side);
  for (var i = 0; i < 26; i++) {
    spawn({ x: f.x + (Math.random() - 0.5) * 50, y: f.y + 20 - Math.random() * 40, vy: -0.6 - Math.random(), drag: 0.99,
      size: 2, color: pick(['#a0ffb0', '#ffffff', '#60e080']), decay: 0.02 });
  }
  return sleep(500);
}

function reset() {
  parts = []; draws = []; if (raf) cancelAnimationFrame(raf); raf = null; ctx = null;
}

root.PB.fx = { play: play, paraSparks: paraSparks, statRise: statRise, healSparkle: healSparkle, reset: reset };
})(window);
