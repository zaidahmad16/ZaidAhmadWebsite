/* pb/scene.js — the DS top screen: N's Castle backdrop, platforms, sprites, the Gen 5 camera,
   the BW HP bars and the battle message band. Everything is laid out in native 256×192 pixels. */
(function (root) {
'use strict';

var W = 256, H = 192;
// The world is drawn bigger than the screen so the camera can pan and zoom without showing edges.
var PAD_X = 96, PAD_Y = 72;
var WW = W + PAD_X * 2, WH = H + PAD_Y * 2;

// Where things stand, in screen pixels at the default camera.
var POS = {
  opp:    { x: 190, y: 104, focus: { x: 190, y: 66 } },
  player: { x: 74,  y: 244, focus: { x: 84,  y: 160 } },
};

var reduced = false;
var S = null; // scene refs

function el(tag, cls, parent, text) {
  var e = document.createElement(tag);
  if (cls) e.className = cls;
  if (text != null) e.textContent = text;
  if (parent) parent.appendChild(e);
  return e;
}
var sleep = function (ms) { return new Promise(function (r) { setTimeout(r, ms); }); };

// ── Backdrop: original pixel art in the spirit of the BW N's Castle throne room ──
function drawBackdrop(cv) {
  var c = cv.getContext('2d');
  c.imageSmoothingEnabled = false;
  var horizon = PAD_Y + 58;

  // Back wall: deep violet stone with a soft light from above
  var wall = c.createLinearGradient(0, 0, 0, horizon);
  wall.addColorStop(0, '#120c22'); wall.addColorStop(0.55, '#2a1d47'); wall.addColorStop(1, '#4a3878');
  c.fillStyle = wall; c.fillRect(0, 0, WW, horizon);

  // Stone courses
  c.fillStyle = 'rgba(0,0,0,0.18)';
  for (var y = horizon - 6; y > 0; y -= 12) c.fillRect(0, y, WW, 1);
  for (var row = 0, yy = horizon - 6; yy > 0; yy -= 12, row++) {
    for (var x = (row % 2) * 16; x < WW; x += 32) c.fillRect(x, yy - 12, 1, 12);
  }

  // Pillars with gold capitals
  for (var px = 22; px < WW; px += 74) {
    var g = c.createLinearGradient(px, 0, px + 22, 0);
    g.addColorStop(0, '#2c2148'); g.addColorStop(0.35, '#6a5a9a'); g.addColorStop(0.6, '#4d3f78'); g.addColorStop(1, '#1f1636');
    c.fillStyle = g; c.fillRect(px, 0, 22, horizon);
    c.fillStyle = '#c9a24a'; c.fillRect(px - 3, horizon - 26, 28, 3); c.fillRect(px - 2, 18, 26, 3);
    c.fillStyle = '#8a6a2a'; c.fillRect(px - 3, horizon - 23, 28, 1); c.fillRect(px - 2, 21, 26, 1);
    c.fillStyle = 'rgba(0,0,0,0.25)'; c.fillRect(px + 17, 0, 5, horizon);
  }

  // Tall windows letting in pale light between the pillars
  for (var wx = 59; wx < WW; wx += 74) {
    c.fillStyle = '#0b0818'; c.fillRect(wx, 26, 18, horizon - 58);
    var lg = c.createLinearGradient(0, 26, 0, horizon - 32);
    lg.addColorStop(0, 'rgba(190,200,255,0.55)'); lg.addColorStop(1, 'rgba(120,110,200,0.12)');
    c.fillStyle = lg; c.fillRect(wx + 2, 28, 14, horizon - 62);
    c.fillStyle = '#c9a24a'; c.fillRect(wx - 1, 24, 20, 2);
    c.beginPath(); c.moveTo(wx, 26); c.lineTo(wx + 9, 14); c.lineTo(wx + 18, 26); c.closePath();
    c.fillStyle = '#0b0818'; c.fill();
  }

  // Floor: polished violet tiles fading toward the camera
  var floor = c.createLinearGradient(0, horizon, 0, WH);
  floor.addColorStop(0, '#5b4a8c'); floor.addColorStop(0.35, '#3d2f66'); floor.addColorStop(1, '#1d1533');
  c.fillStyle = floor; c.fillRect(0, horizon, WW, WH - horizon);
  c.fillStyle = '#c9a24a'; c.fillRect(0, horizon, WW, 2);
  c.fillStyle = '#7a5d22'; c.fillRect(0, horizon + 2, WW, 1);

  // Perspective tile lines toward a vanishing point
  c.strokeStyle = 'rgba(20,10,40,0.45)'; c.lineWidth = 1;
  var vx = WW / 2;
  for (var i = -14; i <= 14; i++) {
    c.beginPath(); c.moveTo(vx + i * 14, horizon + 3); c.lineTo(vx + i * 90, WH); c.stroke();
  }
  for (var k = 1; k < 9; k++) {
    var ly = horizon + 3 + Math.pow(k / 9, 1.8) * (WH - horizon);
    c.beginPath(); c.moveTo(0, Math.round(ly) + 0.5); c.lineTo(WW, Math.round(ly) + 0.5); c.stroke();
  }

  // Royal carpet running from the throne toward the player
  c.beginPath();
  c.moveTo(vx - 10, horizon + 3); c.lineTo(vx + 10, horizon + 3);
  c.lineTo(vx + 80, WH); c.lineTo(vx - 80, WH); c.closePath();
  var cp = c.createLinearGradient(0, horizon, 0, WH);
  cp.addColorStop(0, '#5a1a3a'); cp.addColorStop(1, '#8a2850');
  c.fillStyle = cp; c.fill();
  c.strokeStyle = '#c9a24a'; c.stroke();

  // Soft vignette
  var vg = c.createRadialGradient(WW / 2, WH * 0.45, 40, WW / 2, WH * 0.45, WW * 0.62);
  vg.addColorStop(0, 'rgba(0,0,0,0)'); vg.addColorStop(1, 'rgba(0,0,0,0.45)');
  c.fillStyle = vg; c.fillRect(0, 0, WW, WH);
}

// BW platforms: a flat lit ellipse with a dark rim and a lighter inner disc
function drawPlatform(c, cx, cy, rx, ry) {
  c.save();
  c.beginPath(); c.ellipse(cx, cy + 2, rx + 1, ry + 1, 0, 0, Math.PI * 2); c.fillStyle = '#120b22'; c.fill();
  c.beginPath(); c.ellipse(cx, cy, rx, ry, 0, 0, Math.PI * 2);
  var g = c.createRadialGradient(cx, cy - ry * 0.4, 2, cx, cy, rx);
  g.addColorStop(0, '#b7a6e6'); g.addColorStop(0.55, '#8a76c4'); g.addColorStop(1, '#5a4790');
  c.fillStyle = g; c.fill();
  c.beginPath(); c.ellipse(cx, cy - ry * 0.12, rx * 0.72, ry * 0.62, 0, 0, Math.PI * 2);
  c.strokeStyle = 'rgba(255,255,255,0.22)'; c.stroke();
  c.beginPath(); c.ellipse(cx, cy, rx, ry, 0, 0, Math.PI * 2); c.strokeStyle = '#1a1030'; c.stroke();
  c.restore();
}

// ── HUD ──────────────────────────────────────────────────────────────────
function makeHud(parent, side, mon) {
  var box = el('div', 'pb-hud pb-hud-' + side, parent);
  var nameRow = el('div', 'pb-hud-name', box);
  el('span', 'pb-hud-nm', nameRow, mon.name);
  var st = el('span', 'pb-hud-st', nameRow);
  var lv = el('span', 'pb-hud-lv', nameRow);
  el('span', 'pb-lv-glyph', lv, 'Lv');
  var lvNum = el('span', 'pb-lv-num', lv, String(mon.level));
  var bar = el('div', 'pb-hud-bar', box);
  el('span', 'pb-hp-tag', bar, 'HP');
  var track = el('span', 'pb-hp-track', bar);
  var fill = el('span', 'pb-hp-fill', track);
  var ref = { box: box, fill: fill, st: st, lvNum: lvNum, max: mon.maxHP, shown: mon.hp };
  if (side === 'player') {
    var band = el('div', 'pb-hud-band', box);
    ref.nums = el('span', 'pb-hud-nums', band, mon.hp + '/' + mon.maxHP);
    var exp = el('div', 'pb-hud-exp', box);
    ref.exp = el('span', 'pb-exp-fill', exp);
  }
  setHpVisual(ref, mon.hp);
  return ref;
}

function hpColor(frac) { return frac > 0.5 ? 'g' : frac > 0.2 ? 'y' : 'r'; }
function setHpVisual(ref, hp) {
  var frac = Math.max(0, hp / ref.max);
  // the bar is 48 px wide and moves in whole pixels, like the DS
  var px = hp > 0 ? Math.max(1, Math.round(frac * 48)) : 0;
  ref.fill.style.width = px + 'px';
  ref.fill.setAttribute('data-c', hpColor(frac));
  if (ref.nums) ref.nums.textContent = Math.max(0, Math.round(hp)) + '/' + ref.max;
  ref.shown = hp;
}

// ── Build ────────────────────────────────────────────────────────────────
function build(top, b) {
  reduced = root.matchMedia && root.matchMedia('(prefers-reduced-motion: reduce)').matches;
  S = { top: top, cam: { x: 128, y: 96, z: 1 }, camRaf: null, idle: !reduced, idleW: 0, t0: performance.now(),
        oppKey: b.opp.mon.key, playerKey: b.player.mon.key };

  var bgLayer = el('div', 'pb-bglayer', top);
  var bg = el('canvas', 'pb-px', bgLayer); bg.width = WW; bg.height = WH;
  drawBackdrop(bg);

  var world = el('div', 'pb-world', top);
  var plat = el('canvas', 'pb-px pb-plat', world); plat.width = WW; plat.height = WH;
  var pc = plat.getContext('2d');
  drawPlatform(pc, POS.opp.x + PAD_X, POS.opp.y + PAD_Y - 2, 60, 15);
  drawPlatform(pc, POS.player.x + PAD_X, 178 + PAD_Y, 110, 28);

  function monSlot(side, sp, scale) {
    var p = POS[side];
    var wrap = el('div', 'pb-mon pb-mon-' + side, world);
    wrap.style.left = p.x + 'px'; wrap.style.top = p.y + 'px';
    var shadow = el('div', 'pb-shadow', wrap);
    if (side === 'player') shadow.style.display = 'none';
    var clip = el('div', 'pb-clip', wrap);
    var img = el('img', 'pb-px pb-sprite', clip);
    img.alt = ''; img.draggable = false;
    img.src = side === 'player' ? sp.back : sp.front;
    if (scale !== 1) img.style.transform = 'scale(' + scale + ')';
    wrap.style.visibility = 'hidden';
    return { wrap: wrap, clip: clip, img: img, scale: scale };
  }
  S.mons = {
    opp: monSlot('opp', b.opp.mon.species, 1),
    player: monSlot('player', b.player.mon.species, 1.75),
  };

  var tr = el('div', 'pb-trainer', world);
  tr.style.left = POS.opp.x + 'px'; tr.style.top = POS.opp.y + 'px';
  var trImg = el('img', 'pb-px', tr); trImg.src = PB.data.TRAINER_SPRITE; trImg.alt = '';
  S.trainer = tr;

  // Screens (Reflect / Light Screen) shimmer in front of their side
  S.walls = { opp: el('div', 'pb-wall pb-wall-opp', world), player: el('div', 'pb-wall pb-wall-player', world) };

  var fx = el('canvas', 'pb-px pb-fxcanvas', world); fx.width = WW; fx.height = WH;
  S.fxCanvas = fx; S.fxLayer = el('div', 'pb-fxlayer', world);

  var hud = el('div', 'pb-hudlayer', top);
  S.hud = { opp: makeHud(hud, 'opp', b.opp.mon), player: makeHud(hud, 'player', b.player.mon) };

  var msg = el('div', 'pb-msg', top);
  var msgText = el('div', 'pb-msg-text', msg);
  var arrow = el('span', 'pb-msg-arrow', msg);
  S.msg = { box: msg, text: msgText, arrow: arrow, wait: null };
  msg.addEventListener('click', advance);

  S.flash = el('div', 'pb-flash', top);
  S.world = world; S.bgLayer = bgLayer;
  applyCam();
  if (!reduced) S.camRaf = requestAnimationFrame(idleLoop);
  return S;
}

// ── Camera ───────────────────────────────────────────────────────────────
var tween = null;
function applyCam(dx, dy, dz) {
  var c = S.cam, x = c.x + (dx || 0), y = c.y + (dy || 0), z = c.z * (1 + (dz || 0));
  var tx = 128 - x * z, ty = 96 - y * z;
  S.world.style.transform = 'translate(' + tx.toFixed(2) + 'px,' + ty.toFixed(2) + 'px) scale(' + z.toFixed(4) + ')';
  // Backdrop moves at half the rate: parallax, as in the BW 3D camera
  var bz = 1 + (z - 1) * 0.5, bx = 128 + (x - 128) * 0.5, by = 96 + (y - 96) * 0.5;
  S.bgLayer.style.transform = 'translate(' + (128 - (bx + PAD_X) * bz).toFixed(2) + 'px,' + (96 - (by + PAD_Y) * bz).toFixed(2) + 'px) scale(' + bz.toFixed(4) + ')';
}
function idleLoop(now) {
  if (!S) return;
  var t = (now - S.t0) / 1000, target = S.idle && !tween ? 1 : 0;
  S.idleW += (target - S.idleW) * 0.04; // ease the sway in and out instead of snapping
  var k = S.idleW;
  applyCam(Math.sin(t * 0.35) * 5 * k, Math.sin(t * 0.5) * 1.5 * k, Math.sin(t * 0.27) * 0.02 * k);
  S.camRaf = requestAnimationFrame(idleLoop);
}
function ease(t) { return t < 0.5 ? 4 * t * t * t : 1 - Math.pow(-2 * t + 2, 3) / 2; }
// Move the camera to look at (x,y) with zoom z. Resolves when it arrives.
function camera(x, y, z, ms) {
  if (!S) return Promise.resolve();
  if (reduced || !ms) { S.cam = { x: x, y: y, z: z }; if (reduced) { S.cam = { x: 128, y: 96, z: 1 }; } applyCam(); return Promise.resolve(); }
  var from = { x: S.cam.x, y: S.cam.y, z: S.cam.z }, t0 = performance.now();
  return new Promise(function (res) {
    var id = {};
    tween = id;
    (function step(now) {
      if (!S || tween !== id) return res();
      var k = Math.min(1, (now - t0) / ms), e = ease(k);
      S.cam = { x: from.x + (x - from.x) * e, y: from.y + (y - from.y) * e, z: from.z + (z - from.z) * e };
      if (reduced) applyCam();
      if (k < 1) requestAnimationFrame(step); else { tween = null; res(); }
    })(t0);
  });
}
var SHOTS = {
  wide:    [128, 96, 1],
  opp:     [178, 78, 1.2],
  player:  [96, 128, 1.2],
  oppIn:   [190, 72, 1.45],
  playerIn:[88, 140, 1.3],
  both:    [132, 100, 1.08],
};
function shot(name, ms) { var s = SHOTS[name]; return camera(s[0], s[1], s[2], ms == null ? 520 : ms); }
function setIdle(on) { if (S) S.idle = on && !reduced; }

// ── Messages ─────────────────────────────────────────────────────────────
function advance() {
  if (S && S.msg.wait) { var w = S.msg.wait; S.msg.wait = null; PB.audio.play('advance'); w(); }
}
// Type a line out; then wait for A, or auto-advance after `hold` ms (battle text runs itself).
function say(text, opts) {
  opts = opts || {};
  if (!S) return Promise.resolve();
  var box = S.msg;
  box.box.classList.add('on');
  box.arrow.classList.remove('on');
  box.text.textContent = '';
  var i = 0, speed = opts.speed || 22, skip = false;
  box.wait = function () { skip = true; };
  return new Promise(function (res) {
    (function type() {
      if (!S) return res();
      if (skip) { box.text.textContent = text; i = text.length; }
      if (i < text.length) {
        box.text.textContent = text.slice(0, ++i);
        setTimeout(type, speed);
        return;
      }
      if (opts.keep) { box.wait = null; return res(); }
      box.arrow.classList.add('on');
      var done = false;
      function finish() { if (done) return; done = true; box.arrow.classList.remove('on'); box.wait = null; res(); }
      box.wait = finish;
      if (!opts.manual) setTimeout(finish, opts.hold != null ? opts.hold : 1100);
    })();
  });
}
function clearMsg() { if (S) { S.msg.text.textContent = ''; S.msg.arrow.classList.remove('on'); S.msg.box.classList.remove('on'); } }

// ── HP / EXP / status ────────────────────────────────────────────────────
function drainHp(side, to) {
  var ref = S.hud[side], from = ref.shown;
  if (from === to) return Promise.resolve();
  // Gen 5 drains at a steady rate: about one HP-bar pixel per frame, so big hits take longer
  var ms = Math.min(1600, Math.max(380, Math.abs(from - to) / ref.max * 48 * 22));
  var t0 = performance.now(), lastTick = 0;
  return new Promise(function (res) {
    (function step(now) {
      if (!S) return res();
      var k = Math.min(1, (now - t0) / ms);
      setHpVisual(ref, Math.round(from + (to - from) * k));
      if (now - lastTick > 70 && k < 1) { lastTick = now; PB.audio.play('drainTick'); }
      if (k < 1) requestAnimationFrame(step); else res();
    })(t0);
  }).then(function () {
    if (side === 'player') PB.audio.setAlarm(to > 0 && to / ref.max <= 0.2);
  });
}
function setStatus(side, st) {
  var e = S.hud[side].st;
  e.textContent = st === 'par' ? 'PAR' : '';
  e.className = 'pb-hud-st' + (st ? ' pb-st-' + st : '');
}
function fillExp(fromFrac, toFrac, ms) {
  var f = S.hud.player.exp, t0 = performance.now();
  return new Promise(function (res) {
    (function step(now) {
      if (!S) return res();
      var k = Math.min(1, (now - t0) / ms);
      f.style.width = ((fromFrac + (toFrac - fromFrac) * k) * 100).toFixed(2) + '%';
      if (Math.random() < 0.4 && k < 1) PB.audio.play('expTick');
      if (k < 1) requestAnimationFrame(step); else res();
    })(t0);
  });
}
function setExp(frac) { S.hud.player.exp.style.width = (frac * 100).toFixed(2) + '%'; }
function setLevel(n) { S.hud.player.lvNum.textContent = String(n); }
function showHud(side, on) { S.hud[side].box.classList.toggle('in', on); }

// ── Sprites ──────────────────────────────────────────────────────────────
function mon(side) { return S.mons[side]; }
function setMonVisible(side, on) { S.mons[side].wrap.style.visibility = on ? 'visible' : 'hidden'; }

function anim(elm, keyframes, opts) {
  if (!elm.animate) return Promise.resolve();
  if (reduced) opts = Object.assign({}, opts, { duration: Math.min(opts.duration || 0, 1) });
  var a = elm.animate(keyframes, Object.assign({ fill: 'forwards' }, opts));
  return a.finished.catch(function () {});
}

// Poké Ball arcs onto the platform, pops in a white flash and the Pokémon resolves from white.
function sendOut(side) {
  var p = POS[side], m = S.mons[side];
  var ball = el('img', 'pb-px pb-ball', S.fxLayer);
  ball.src = PB.data.BALL_SPRITE; ball.alt = '';
  var start = side === 'opp' ? { x: p.x + 70, y: p.y - 70 } : { x: -30, y: 150 };
  var end = { x: p.x, y: side === 'opp' ? p.y - 30 : 150 };
  PB.audio.play('throwBall');
  var frames = [];
  for (var i = 0; i <= 10; i++) {
    var t = i / 10, x = start.x + (end.x - start.x) * t, y = start.y + (end.y - start.y) * t - Math.sin(t * Math.PI) * 40;
    frames.push({ transform: 'translate(' + (x - 15) + 'px,' + (y - 15) + 'px) rotate(' + (t * 720) + 'deg)' });
  }
  return anim(ball, frames, { duration: 520, easing: 'linear' }).then(function () {
    ball.remove();
    PB.audio.play('ballOpen');
    burst(end.x, end.y);
    setMonVisible(side, true);
    var sc = m.scale;
    m.img.style.filter = 'brightness(0) invert(1)';
    return anim(m.img, [
      { transform: 'scale(' + (sc * 0.1) + ')', filter: 'brightness(0) invert(1)', transformOrigin: '50% 100%' },
      { transform: 'scale(' + sc + ')', filter: 'brightness(0) invert(1)', offset: 0.6, transformOrigin: '50% 100%' },
      { transform: 'scale(' + sc + ')', filter: 'none', transformOrigin: '50% 100%' },
    ], { duration: 520, easing: 'ease-out' }).then(function () { m.img.style.filter = ''; });
  });
}

function burst(x, y) {
  var r = el('div', 'pb-burst', S.fxLayer);
  r.style.left = x + 'px'; r.style.top = y + 'px';
  anim(r, [{ transform: 'translate(-50%,-50%) scale(0.2)', opacity: 1 }, { transform: 'translate(-50%,-50%) scale(2.4)', opacity: 0 }],
    { duration: 420, easing: 'ease-out' }).then(function () { r.remove(); });
  for (var i = 0; i < 8; i++) {
    var s = el('div', 'pb-spark', S.fxLayer), a = i / 8 * Math.PI * 2;
    s.style.left = x + 'px'; s.style.top = y + 'px';
    (function (s, a) {
      anim(s, [{ transform: 'translate(0,0)', opacity: 1 }, { transform: 'translate(' + Math.cos(a) * 26 + 'px,' + Math.sin(a) * 18 + 'px)', opacity: 0 }],
        { duration: 400, easing: 'ease-out' }).then(function () { s.remove(); });
    })(s, a);
  }
}

// The BW hit flicker: the sprite blinks out four times
function blink(side) {
  var img = S.mons[side].img;
  return anim(img, [{ opacity: 1 }, { opacity: 0, offset: 0.125 }, { opacity: 1, offset: 0.25 }, { opacity: 0, offset: 0.375 },
    { opacity: 1, offset: 0.5 }, { opacity: 0, offset: 0.625 }, { opacity: 1, offset: 0.75 }, { opacity: 0, offset: 0.875 }, { opacity: 1 }],
    { duration: 520, easing: 'steps(1, end)', fill: 'none' });
}

function jolt(strength) {
  if (reduced) return Promise.resolve();
  var s = strength || 3;
  return anim(S.top, [{ transform: 'translate(0,0)' }, { transform: 'translate(' + -s + 'px,0)' }, { transform: 'translate(' + s + 'px,' + -1 + 'px)' },
    { transform: 'translate(' + -s + 'px,1px)' }, { transform: 'translate(' + s / 2 + 'px,0)' }, { transform: 'translate(0,0)' }],
    { duration: 300, fill: 'none' });
}

// Fainting: the sprite sinks down through its platform
function faint(side) {
  var m = S.mons[side];
  PB.audio.cry(PB.data.SPECIES[side === 'opp' ? S.oppKey : S.playerKey].cry, true);
  return sleep(380).then(function () {
    PB.audio.play('faint');
    return anim(m.img, [{ transform: 'translateY(0) scale(' + m.scale + ')', transformOrigin: '50% 100%' },
      { transform: 'translateY(' + (side === 'opp' ? 100 : 200) + 'px) scale(' + m.scale + ')', transformOrigin: '50% 100%' }],
      { duration: 520, easing: 'ease-in' });
  }).then(function () { setMonVisible(side, false); });
}

function trainer(on, ms) {
  var t = S.trainer;
  if (on) {
    t.style.visibility = 'visible';
    return anim(t, [{ transform: 'translateX(120px)', opacity: 1 }, { transform: 'translateX(0)', opacity: 1 }], { duration: ms || 600, easing: 'ease-out' });
  }
  return anim(t, [{ transform: 'translateX(0)' }, { transform: 'translateX(140px)' }], { duration: ms || 450, easing: 'ease-in' })
    .then(function () { t.style.visibility = 'hidden'; });
}

function wall(side, kind, on) {
  var w = S.walls[side];
  w.className = 'pb-wall pb-wall-' + side + (on ? ' on pb-wall-' + kind : '');
}

function flash(color, ms, peak) {
  var f = S.flash;
  f.style.background = color;
  return anim(f, [{ opacity: peak == null ? 0.9 : peak }, { opacity: 0 }], { duration: ms || 260, fill: 'none' });
}

function destroy() {
  if (S && S.camRaf) cancelAnimationFrame(S.camRaf);
  tween = null; S = null;
}

root.PB.scene = {
  W: W, H: H, PAD_X: PAD_X, PAD_Y: PAD_Y, POS: POS,
  build: build, destroy: destroy, get: function () { return S; },
  camera: camera, shot: shot, setIdle: setIdle,
  say: say, advance: advance, clearMsg: clearMsg,
  drainHp: drainHp, setStatus: setStatus, fillExp: fillExp, setExp: setExp, setLevel: setLevel, showHud: showHud,
  mon: mon, setMonVisible: setMonVisible, sendOut: sendOut, blink: blink, jolt: jolt, faint: faint, burst: burst,
  trainer: trainer, wall: wall, flash: flash, anim: anim, sleep: sleep, el: el,
  isReduced: function () { return reduced; },
};
})(window);
