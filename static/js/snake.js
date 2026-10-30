/* snake.js — terminal-native Snake, drawn as text inside the portfolio terminal like an ncurses game.
   Started by terminal.js after `sudo apt install snake`. Eat the letters of ZAIDAHMAD in order;
   spelling the whole name "installs" Zaid and opens the resume. */
(function () {
'use strict';

var WORD = 'ZAIDAHMAD';
// Half-block rendering: each character is one cell wide and each text line holds two cells (▀ ▄),
// so cells are small and roughly square, and the snake can step often for smooth movement.
var MAX_C = 88, MAX_L = 24;           // board size cap: cells across, text lines down (2 cells per line)
var VERSION = '1.0.4';
var TITLE = [
  '                 _       ',
  ' ___ _ _   __ _ | |__ ___ ',
  "(_-<| ' \\ / _` || / // -_)",
  '/__/|_||_|\\__,_||_\\_\\\\___|',
];

var opts = null, root = null, pre = null, pad = null;
var cols = 0, rows = 0, C = 0, R = 0, L = 0, ox = 0;   // screen size in chars; board in cells (C×R) and lines (L)
var state = 'off', level = 5, score = 0, eaten = 0, tick = 60, timer = null;
var snake = [], dir = { x: 1, y: 0 }, queue = [], food = null, flashOn = false, grow = 0;
var muted = false, reduced = false, touch = null;

// ── Storage (scores per level + mute) ────────────────────────────────────
function loadHi() {
  try { return JSON.parse(localStorage.getItem('snakeHi') || '{}') || {}; } catch (e) { return {}; }
}
function hiFor(l) {
  var h = loadHi();
  if (h[l] != null) return h[l];
  try { return l === 5 ? parseInt(localStorage.getItem('snakeHighScore') || '0', 10) || 0 : 0; } catch (e) { return 0; }
}
function saveHi(l, v) {
  var h = loadHi(); h[l] = v;
  try { localStorage.setItem('snakeHi', JSON.stringify(h)); } catch (e) {}
}
function loadMute() { try { return localStorage.getItem('snakeMute') === '1'; } catch (e) { return false; } }
function saveMute() { try { localStorage.setItem('snakeMute', muted ? '1' : '0'); } catch (e) {} }

// ── Sound: little square-wave beeps ──────────────────────────────────────
var ac = null;
function beep(freq, dur, when, vol, type) {
  if (muted) return;
  try {
    if (!ac) ac = new (window.AudioContext || window.webkitAudioContext)();
    if (ac.state === 'suspended') ac.resume();
    var t = ac.currentTime + (when || 0), o = ac.createOscillator(), g = ac.createGain();
    o.type = type || 'square'; o.frequency.setValueAtTime(freq, t);
    g.gain.setValueAtTime(vol || 0.05, t); g.gain.exponentialRampToValueAtTime(0.0001, t + dur);
    o.connect(g); g.connect(ac.destination); o.start(t); o.stop(t + dur + 0.02);
  } catch (e) {}
}
var SFX = {
  eat:   function () { beep(880, 0.05); beep(1320, 0.06, 0.05); },
  move:  function () { beep(220, 0.02, 0, 0.015); },
  start: function () { [523, 659, 784].forEach(function (f, i) { beep(f, 0.08, i * 0.08); }); },
  over:  function () { [392, 330, 262, 196].forEach(function (f, i) { beep(f, 0.16, i * 0.15, 0.06); }); },
  win:   function () { [523, 659, 784, 1047, 784, 1047].forEach(function (f, i) { beep(f, 0.12, i * 0.11, 0.06); }); },
  tick:  function () { beep(660, 0.03, 0, 0.03); },
};

// ── Screen (static/js/term-screen.js) ───────────────────────────────────
var scr = null;
function clearBuf() { scr.clear(); }
function put(x, y, str, cls, act) { scr.put(x, y, str, cls, act); }
function fillRow(y, cls) { scr.fillRow(y, cls); }
function box(x, y, w, h, title, cls) { scr.box(x, y, w, h, title, cls); }
function center(y, str, cls, act) { scr.center(y, str, cls, act); }
function flush() { scr.flush(); }

// ── Layout ───────────────────────────────────────────────────────────────
function measure() {
  scr.measure();
  cols = scr.cols; rows = scr.rows;
  C = Math.min(MAX_C, cols - 2);
  L = Math.min(MAX_L, rows - 4);
  R = L * 2;
  ox = Math.floor((cols - (C + 2)) / 2);
}
// rows: status bar, frame top, L board lines, frame bottom, key bar
function boardTop() { return 2 + Math.max(0, Math.floor((rows - 4 - L) / 2)); }

// ── Drawing ──────────────────────────────────────────────────────────────
function pad4(n) { return ('000' + n).slice(-4); }

function drawStatus() {
  fillRow(0, 'ts-bar');
  var hi = pad4(Math.max(hiFor(level), score));
  var wide = cols >= 64;   // narrow screens (phones) get a compact bar so the name still fits
  var s = wide
    ? ' snake ' + VERSION + ' │ lvl ' + level + ' │ score ' + pad4(score) + ' │ hi ' + hi + ' │ '
    : ' L' + level + ' │ ' + pad4(score) + ' │ hi ' + hi + ' │ ';
  put(0, 0, s, 'ts-bar');
  var x = s.length;
  for (var i = 0; i < WORD.length; i++) {
    var got = i < eaten;
    var cls = 'ts-bar' + (got ? ' ts-got' : ' ts-dim') + (state === 'won' && flashOn ? ' ts-flash' : '');
    put(x, 0, got ? WORD[i] : WORD[i].toLowerCase(), cls);
    if (wide) put(x + 1, 0, ' ', 'ts-bar');
    x += wide ? 2 : 1;
  }
  if (muted && cols - x > 8) put(cols - 7, 0, ' muted ', 'ts-bar ts-dim');
}

function drawKeys(items) {
  var y = rows - 1, x = 1;
  fillRow(y, '');
  items.forEach(function (it) {
    put(x, y, it[0], 'ts-key', it[2]); x += it[0].length;
    put(x, y, ' ' + it[1] + '  ', 'ts-keylabel', it[2]); x += it[1].length + 3;
  });
}

function drawBoard() {
  var top = boardTop();
  var frame = state === 'over' && flashOn ? 'ts-frame ts-hit' : 'ts-frame';
  put(ox, top - 1, '┌' + '─'.repeat(C) + '┐', frame);
  for (var y = 0; y < L; y++) {
    put(ox, top + y, '│', frame);
    put(ox + C + 1, top + y, '│', frame);
  }
  put(ox, top + L, '└' + '─'.repeat(C) + '┘', frame);

  // what's in each cell: h head, b body, d dead
  var kind = {}, dead = state === 'over';
  for (var i = snake.length - 1; i >= 0; i--) kind[snake[i].x + ',' + snake[i].y] = dead ? 'd' : i === 0 ? 'h' : 'b';
  var seen = {};
  for (var j = 0; j < snake.length; j++) {
    var sx = snake[j].x, ln = snake[j].y >> 1, k = sx + ',' + ln;
    if (seen[k]) continue;
    seen[k] = 1;
    var t = kind[sx + ',' + (ln * 2)], bt = kind[sx + ',' + (ln * 2 + 1)];
    var ch, cls;
    if (t && bt) { ch = t === bt ? '█' : '▀'; cls = 'ts-fg-' + t + (t === bt ? '' : ' ts-bg-' + bt); }
    else if (t) { ch = '▀'; cls = 'ts-fg-' + t; }
    else { ch = '▄'; cls = 'ts-fg-' + bt; }
    put(ox + 1 + sx, top + ln, ch, cls);
  }
  // food is a letter filling one character: both cells of its line
  if (food) put(ox + 1 + food.x, top + food.line, WORD[eaten], 'ts-food');
}

function render() {
  if (!pre) return;
  clearBuf();
  drawStatus();
  if (state === 'menu') drawMenu();
  else {
    drawBoard();
    if (state === 'paused') drawPaused();
    if (state === 'over' && !flashOn) drawOver();
  }
  var keys = state === 'menu'
    ? [['↵', 'start', 'start'], ['←→', 'level', ''], ['M', muted ? 'unmute' : 'mute', 'mute'], ['Q', 'quit', 'quit']]
    : state === 'over'
      ? [['R', 'retry', 'retry'], ['L', 'level', 'menu'], ['Q', 'quit', 'quit']]
      : [['←↑↓→', 'move', ''], ['P', state === 'paused' ? 'resume' : 'pause', 'pause'], ['M', muted ? 'unmute' : 'mute', 'mute'], ['Q', 'quit', 'quit']];
  drawKeys(keys);
  flush();
}

function drawMenu() {
  var w = Math.min(cols - 2, 40), h = 15;
  var x = Math.floor((cols - w) / 2), y = Math.max(1, Math.floor((rows - h) / 2));
  box(x, y, w, h, 'snake ' + VERSION);
  var tw = Math.max.apply(null, TITLE.map(function (l) { return l.length; })), tx = Math.floor((cols - tw) / 2);
  TITLE.forEach(function (l, i) { put(tx, y + 2 + i, l, 'ts-title'); });
  var lv = 'Level  ';
  var row = y + 7, lx = Math.floor((cols - 17) / 2);
  put(lx, row, lv, 'ts-dlg');
  put(lx + 7, row, '◀', 'ts-dlg ts-btn', 'down');
  put(lx + 9, row, ' ' + level + ' ', 'ts-dlg ts-sel');
  put(lx + 13, row, '▶', 'ts-dlg ts-btn', 'up');
  center(row + 1, 'best   ' + pad4(hiFor(level)) + '  ', 'ts-dlg ts-dimtext');
  center(row + 3, 'eat the letters in order:', 'ts-dlg ts-dimtext');
  center(row + 4, WORD.split('').join(' '), 'ts-dlg ts-foodtext');
  center(row + 6, '[ start ]', 'ts-dlg ts-btn ts-strong', 'start');
}

function drawPaused() {
  var w = 18, x = Math.floor((cols - w) / 2), y = boardTop() + Math.floor(L / 2) - 1;
  box(x, y, w, 3, null);
  center(y + 1, 'PAUSED', 'ts-dlg ts-strong', 'pause');
}

function drawOver() {
  var w = 30, h = 7, x = Math.floor((cols - w) / 2), y = boardTop() + Math.floor((L - h) / 2);
  box(x, y, w, h, 'game over', 'ts-frame ts-hit');
  center(y + 2, 'score ' + pad4(score) + '   best ' + pad4(hiFor(level)), 'ts-dlg');
  var bx = Math.floor((cols - 31) / 2);
  put(bx, y + 4, '[ retry ]', 'ts-dlg ts-btn', 'retry');
  put(bx + 11, y + 4, '[ level ]', 'ts-dlg ts-btn', 'menu');
  put(bx + 22, y + 4, '[ quit ]', 'ts-dlg ts-btn', 'quit');
}

// ── Game ─────────────────────────────────────────────────────────────────
// ms per step. Cells are a quarter the size they used to be, so steps come 2× more often for the
// same travel speed: 90 ms (11 steps/s) at level 1 … 28 ms (36 steps/s) at level 9.
function speedFor(l) { return Math.round(90 - (l - 1) * (62 / 8)); }

function newGame() {
  stopTimer();
  measure();
  var cy = Math.floor(R / 2), cx = Math.floor(C / 3);
  snake = [];
  for (var i = 0; i < 6; i++) snake.push({ x: cx - i, y: cy });
  dir = { x: 1, y: 0 }; queue = []; grow = 0;
  score = 0; eaten = 0; tick = speedFor(level); flashOn = false;
  placeFood();
  state = 'play';
  SFX.start();
  render();
  schedule();
}

// Food sits on a whole text line (both of its cells) so the letter is readable
function placeFood() {
  var taken = {}, free = [];
  snake.forEach(function (s) { taken[s.x + ',' + (s.y >> 1)] = 1; });
  for (var ln = 0; ln < L; ln++) for (var x = 0; x < C; x++) {
    if (!taken[x + ',' + ln]) free.push({ x: x, line: ln });
  }
  food = free.length ? free[Math.floor(Math.random() * free.length)] : null;
}

function schedule() { stopTimer(); timer = setTimeout(step, tick); }
function stopTimer() { if (timer) { clearTimeout(timer); timer = null; } }

function step() {
  timer = null;
  if (state !== 'play') return;
  if (queue.length) dir = queue.shift();
  var head = { x: snake[0].x + dir.x, y: snake[0].y + dir.y };
  var hitWall = head.x < 0 || head.y < 0 || head.x >= C || head.y >= R;
  var eating = food && head.x === food.x && (head.y >> 1) === food.line;
  // the tail moves out of the way this tick unless we're growing
  var body = (eating || grow > 0) ? snake : snake.slice(0, -1);
  var hitSelf = body.some(function (s) { return s.x === head.x && s.y === head.y; });
  if (hitWall || hitSelf) return gameOver();
  snake.unshift(head);
  if (eating) {
    eaten++; score += level;
    if (score > hiFor(level)) saveHi(level, score);
    if (eaten >= WORD.length) { food = null; return win(); }
    SFX.eat();
    tick = Math.max(22, Math.round(tick * 0.97));
    grow += 3;   // each letter adds three cells
    placeFood();
  } else if (grow > 0) grow--;
  else snake.pop();
  render();
  schedule();
}

function turn(nd) {
  if (state !== 'play') return;
  var last = queue.length ? queue[queue.length - 1] : dir;
  if (nd.x === -last.x && nd.y === -last.y) return;   // no reversing into yourself
  if (nd.x === last.x && nd.y === last.y) return;
  if (queue.length < 3) queue.push(nd);
}

function flash(times, ms, done) {
  if (reduced) { flashOn = false; render(); return done(); }
  var n = 0;
  (function f() {
    if (state === 'off') return;
    flashOn = n % 2 === 0; render(); n++;
    if (n < times * 2) setTimeout(f, ms); else { flashOn = false; render(); done(); }
  })();
}

function gameOver() {
  state = 'over'; stopTimer();
  SFX.over();
  if (score > hiFor(level)) saveHi(level, score);
  flash(3, 90, function () {});
}

function win() {
  state = 'won'; stopTimer();
  SFX.win();
  render();
  flash(4, 160, function () { setTimeout(function () { exit(true); }, 350); });
}

function togglePause() {
  if (state === 'play') { state = 'paused'; stopTimer(); render(); }
  else if (state === 'paused') { state = 'play'; render(); schedule(); }
}
function toggleMute() { muted = !muted; saveMute(); render(); }
function changeLevel(d) { level = Math.min(9, Math.max(1, level + d)); SFX.tick(); render(); }

function act(a) {
  if (!a) return;
  if (a === 'start' || a === 'retry') newGame();
  else if (a === 'menu') { state = 'menu'; stopTimer(); render(); }
  else if (a === 'quit') exit(false);
  else if (a === 'pause') togglePause();
  else if (a === 'mute') toggleMute();
  else if (a === 'up') changeLevel(1);
  else if (a === 'down') changeLevel(-1);
}

// ── Input ────────────────────────────────────────────────────────────────
var DIRS = {
  ArrowUp: { x: 0, y: -1 }, ArrowDown: { x: 0, y: 1 }, ArrowLeft: { x: -1, y: 0 }, ArrowRight: { x: 1, y: 0 },
  w: { x: 0, y: -1 }, s: { x: 0, y: 1 }, a: { x: -1, y: 0 }, d: { x: 1, y: 0 },
};

function onKey(e) {
  if (state === 'off' || e.ctrlKey || e.metaKey || e.altKey) return;
  var k = e.key.length === 1 ? e.key.toLowerCase() : e.key;
  var handled = true;
  if (k === 'Escape' || k === 'q') exit(false);
  else if (k === 'm') toggleMute();
  else if (state === 'menu') {
    if (k === 'Enter' || k === ' ') newGame();
    else if (k === 'ArrowLeft' || k === 'a' || k === 'ArrowDown' || k === 's') changeLevel(-1);
    else if (k === 'ArrowRight' || k === 'd' || k === 'ArrowUp' || k === 'w') changeLevel(1);
    else if (/^[1-9]$/.test(k)) { level = +k; SFX.tick(); render(); }
    else handled = false;
  } else if (state === 'over') {
    if (k === 'r' || k === 'Enter' || k === ' ') newGame();
    else if (k === 'l') act('menu');
    else handled = false;
  } else if (k === 'p' || k === ' ') togglePause();
  else if (DIRS[k]) { if (state === 'paused') togglePause(); turn(DIRS[k]); }
  else handled = false;
  if (handled) { e.preventDefault(); e.stopImmediatePropagation(); }
}

function onClick(e) {
  var t = e.target.closest('[data-act]');
  if (t) { act(t.getAttribute('data-act')); return; }
  if (state === 'menu') newGame();
  else if (state === 'paused') togglePause();
}

function onTouchStart(e) {
  if (!e.touches.length) return;
  touch = { x: e.touches[0].clientX, y: e.touches[0].clientY };
}
function onTouchEnd(e) {
  if (!touch) return;
  var t = e.changedTouches[0], dx = t.clientX - touch.x, dy = t.clientY - touch.y;
  touch = null;
  if (Math.max(Math.abs(dx), Math.abs(dy)) < 24) return;   // a tap: handled as a click
  e.preventDefault();
  if (state === 'paused') togglePause();
  turn(Math.abs(dx) > Math.abs(dy) ? { x: Math.sign(dx), y: 0 } : { x: 0, y: Math.sign(dy) });
}

function buildPad() {
  pad = document.createElement('div');
  pad.className = 'ts-pad';
  [['▲', 'ArrowUp', 'ts-pad-up'], ['◀', 'ArrowLeft', 'ts-pad-left'], ['▼', 'ArrowDown', 'ts-pad-down'],
   ['▶', 'ArrowRight', 'ts-pad-right'], ['↵', 'Enter', 'ts-pad-ok'], ['P', 'p', 'ts-pad-p']].forEach(function (b) {
    var el = document.createElement('button');
    el.type = 'button'; el.className = 'ts-pad-btn ' + b[2]; el.textContent = b[0];
    el.setAttribute('aria-label', b[1]);
    el.addEventListener('click', function (ev) {
      ev.preventDefault();
      onKey({ key: b[1], preventDefault: function () {}, stopImmediatePropagation: function () {} });
    });
    pad.appendChild(el);
  });
  return pad;
}

function onResize() {
  if (state === 'play') togglePause();
  if (state === 'menu') { measure(); }
  render();
}

// ── Start / exit ─────────────────────────────────────────────────────────
function start(o) {
  if (state !== 'off') return;
  opts = o;
  reduced = window.matchMedia && window.matchMedia('(prefers-reduced-motion: reduce)').matches;
  muted = loadMute();
  scr = TermScreen.create({ body: o.body, label: 'Snake game. Arrow keys to move, P to pause, Q to quit.' });
  root = scr.root; pre = scr.pre;
  root.appendChild(buildPad());
  if (document.activeElement && document.activeElement.blur) document.activeElement.blur();

  state = 'menu';
  measure();
  render();
  document.addEventListener('keydown', onKey, true);
  pre.addEventListener('click', onClick);
  pre.addEventListener('touchstart', onTouchStart, { passive: true });
  pre.addEventListener('touchend', onTouchEnd);
  window.addEventListener('resize', onResize);
}

function teardown() {
  stopTimer();
  document.removeEventListener('keydown', onKey, true);
  window.removeEventListener('resize', onResize);
  if (scr) scr.destroy();
  scr = null; root = pre = pad = null;
  state = 'off';
}

function exit(won) {
  if (state === 'off') return;
  var result = { score: score, best: hiFor(level), level: level, won: !!won };
  var cb = opts && opts.onExit;
  teardown();
  opts = null;
  if (cb) cb(result);
}

window.TermSnake = {
  start: start,
  stop: function () { exit(false); },
  running: function () { return state !== 'off'; },
};
})();
