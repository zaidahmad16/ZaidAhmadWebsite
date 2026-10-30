/* htop.js — a live htop inside the portfolio terminal. The projects on the page run as processes
   among a believable Linux Mint desktop's; Enter on a project "attaches" to it (opens its page).
   Drawn with static/js/term-screen.js, started by terminal.js on `htop` / `top`. */
(function () {
'use strict';

var VERSION = '3.3.0';
var HIDDEN = { 'linux-kernel-patch': 1 };   // projects that never show up here

// Command lines for the projects that exist today; new ones get one built from their stack pills
var COMMANDS = {
  'duely':                  'python3 -m duely --sync brightspace',
  'ontario-drive-test-map': 'wrangler dev --site ontariodrivetestmap.fyi',
  'salah':                  'salah-applet --notify adhan',
  'rpi-packet-analyzer':    'pktan -i eth0 --live',
  'carleton-course-map':    'node coursemap/build.js --watch',
  'nintendo-ds':            'melonDS business-card.nds',
  'c-simulation':           './ghost_hunt --hunters 4',
};
var RETIRED = { 'rpi-packet-analyzer': 1 };  // shown as zombies

var TERM_JOKES = {
  'duely':                  'duely: SIGTERM ignored — deadlines don\'t stop for anyone',
  'ontario-drive-test-map': 'wrangler: can\'t stop now, mid three-point turn',
  'salah':                  'salah-applet: busy — try again after Asr',
  'carleton-course-map':    'coursemap: prerequisite not met: SIGTERM requires COMP 2401',
  'nintendo-ds':            'melonDS: the business card has no power button',
  'c-simulation':           'ghost_hunt: you can\'t kill what\'s already dead',
};

var SIGNALS = [
  [0, 'Cancel'], [1, 'SIGHUP'], [2, 'SIGINT'], [3, 'SIGQUIT'], [4, 'SIGILL'], [5, 'SIGTRAP'], [6, 'SIGABRT'],
  [7, 'SIGBUS'], [8, 'SIGFPE'], [9, 'SIGKILL'], [10, 'SIGUSR1'], [11, 'SIGSEGV'], [12, 'SIGUSR2'],
  [13, 'SIGPIPE'], [14, 'SIGALRM'], [15, 'SIGTERM'], [16, 'SIGSTKFLT'], [17, 'SIGCHLD'], [18, 'SIGCONT'],
  [19, 'SIGSTOP'], [20, 'SIGTSTP'],
];
var SORTS = [
  ['pid', 'PID'], ['user', 'USER'], ['pri', 'PRIORITY'], ['ni', 'NICE'], ['virt', 'M_VIRT'], ['res', 'M_RESIDENT'],
  ['shr', 'M_SHARE'], ['state', 'STATE'], ['cpu', 'PERCENT_CPU'], ['mem', 'PERCENT_MEM'], ['time', 'TIME'], ['cmd', 'Command'],
];

var MEM_TOTAL = 16252928;  // KiB (15.5G)
var T0 = Date.now(), UPTIME0 = 3 * 3600 + 12 * 60 + 7;

var opts = null, scr = null, timer = null, msgTimer = null;
var procs = [], cpus = [], load = [0.52, 0.48, 0.41];
var state = 'off', view = 'table', selPid = null, scroll = 0, sortKey = 'cpu', sortDesc = true;
var panelIdx = 0, search = null, msg = null, lastTap = null, touchY = null, wide = true;

// ── Helpers ──────────────────────────────────────────────────────────────
function hash(s) { var h = 2166136261; for (var i = 0; i < s.length; i++) { h ^= s.charCodeAt(i); h = Math.imul(h, 16777619); } return h >>> 0; }
function rnd(seed) { return function () { seed = (seed * 1664525 + 1013904223) >>> 0; return seed / 4294967296; }; }
function clamp(v, a, b) { return Math.max(a, Math.min(b, v)); }
function padL(s, n) { s = String(s); return s.length >= n ? s.slice(-n) : ' '.repeat(n - s.length) + s; }
function padR(s, n) { s = String(s); return s.length >= n ? s.slice(0, n) : s + ' '.repeat(n - s.length); }

function fmtMem(kb) {
  if (kb < 100000) return String(Math.round(kb));
  if (kb < 10 * 1048576) return Math.round(kb / 1024) + 'M';
  return (kb / 1048576).toFixed(1) + 'G';
}
function fmtTime(sec) {
  var cs = Math.floor(sec * 100) % 100, s = Math.floor(sec) % 60, m = Math.floor(sec / 60), h = Math.floor(m / 60);
  if (h > 0) return h + 'h' + ('0' + (m % 60)).slice(-2) + ':' + ('0' + s).slice(-2);
  return m + ':' + ('0' + s).slice(-2) + '.' + ('0' + cs).slice(-2);
}
function fmtUptime(sec) {
  var h = Math.floor(sec / 3600), m = Math.floor(sec / 60) % 60, s = Math.floor(sec) % 60;
  return ('0' + h).slice(-2) + ':' + ('0' + m).slice(-2) + ':' + ('0' + s).slice(-2);
}

// ── The machine ──────────────────────────────────────────────────────────
function readProjects() {
  return Array.prototype.map.call(document.querySelectorAll('.proj-list .proj-row'), function (li) {
    var a = li.querySelector('a'), href = a ? a.getAttribute('href') || '' : '';
    var nameEl = li.querySelector('.proj-row-name');
    var name = nameEl ? nameEl.textContent.trim() : '';
    var dir = /^projects\//.test(href) ? href.replace(/^.*\//, '').replace(/\.html$/, '')
                                       : name.toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/^-|-$/g, '');
    var pills = Array.prototype.map.call(li.querySelectorAll('.proj-row-pills span'), function (x) { return x.textContent.trim().toLowerCase(); });
    return { dir: dir, name: name, href: href, pills: pills };
  }).filter(function (p) { return p.dir && p.href && !HIDDEN[p.dir]; });
}

function commandFor(p) {
  if (COMMANDS[p.dir]) return COMMANDS[p.dir];
  var lang = p.pills[0] || '';
  if (/python/.test(lang)) return 'python3 -m ' + p.dir.replace(/-/g, '_');
  if (/node|javascript|typescript|react/.test(lang)) return 'node ' + p.dir + '/index.js';
  return './' + p.dir;
}

function mk(pid, user, cmd, cpu, res, extra) {
  var r = rnd(hash(cmd + pid));
  return Object.assign({
    pid: pid, user: user, pri: 20, ni: 0, cmd: cmd,
    virt: Math.round(res * (2.5 + r() * 6)), res: res, shr: Math.round(res * (0.2 + r() * 0.3)),
    state: 'S', base: cpu, cpu: cpu, time: cpu * (600 + r() * 2400), project: null,
  }, extra || {});
}

function buildProcs() {
  var list = [
    mk(1, 'root', '/sbin/init splash', 0.0, 13424),
    mk(312, 'root', '/usr/lib/systemd/systemd-journald', 0.0, 31544),
    mk(356, 'root', '/usr/lib/systemd/systemd-udevd', 0.0, 8816),
    mk(701, 'systemd-r', '/usr/lib/systemd/systemd-resolved', 0.0, 14208),
    mk(742, 'root', '/usr/sbin/NetworkManager --no-daemon', 0.2, 21600),
    mk(1045, 'root', '/usr/sbin/lightdm', 0.0, 9480),
    mk(1063, 'root', '/usr/lib/xorg/Xorg -core :0 -seat seat0 -auth /var/run/lightdm/root/:0 -nolisten tcp vt7 -novtswitch', 3.1, 90112),
    mk(1690, 'zaid', '/usr/bin/pipewire', 0.6, 22736),
    mk(1693, 'zaid', '/usr/bin/wireplumber', 0.1, 27100),
    mk(1694, 'zaid', '/usr/bin/pipewire-pulse', 0.3, 18304),
    mk(1712, 'zaid', 'cinnamon --replace', 4.2, 401408),
    mk(1888, 'zaid', 'nemo-desktop', 0.1, 92160),
    mk(2290, 'zaid', '/opt/google/chrome/chrome', 2.4, 356352),
    mk(2361, 'zaid', '/opt/google/chrome/chrome --type=renderer --lang=en-US', 5.5, 522240),
    mk(2377, 'zaid', '/opt/google/chrome/chrome --type=gpu-process', 1.8, 210944),
    mk(2601, 'zaid', '/usr/libexec/gnome-terminal-server', 0.4, 61440),
    mk(2611, 'zaid', 'bash', 0.0, 5376),
  ];
  readProjects().forEach(function (p, i) {
    var r = rnd(hash(p.dir));
    var pid = 3000 + Math.floor(r() * 5000);
    var zombie = !!RETIRED[p.dir];
    list.push(mk(pid, 'zaid', commandFor(p), zombie ? 0 : 1 + r() * 9, zombie ? 0 : Math.round(60000 + r() * 260000), {
      project: p, state: zombie ? 'Z' : 'S', zombie: zombie,
    }));
  });
  list.push(mk(9000 + Math.floor(Math.random() * 900), 'zaid', 'htop', 0.7, 5120, { state: 'R', self: true }));
  return list;
}

function simulate() {
  var hidden = 0;
  procs.forEach(function (p) {
    if (p.zombie || p.state === 'T') { p.cpu = 0; return; }
    var target = p.base * (0.4 + Math.random() * 1.4);
    if (p.project && Math.random() < 0.08) target += 10 + Math.random() * 25;   // the occasional burst
    p.cpu = clamp(p.cpu * 0.55 + target * 0.45, 0, 99);
    p.time += p.cpu / 100;
    p.res = clamp(p.res + (Math.random() - 0.5) * p.res * 0.01, 1000, MEM_TOTAL);
    if (!p.self) p.state = p.cpu > 12 && Math.random() < 0.4 ? 'R' : 'S';
    hidden += p.cpu;
  });
  var total = procs.reduce(function (a, p) { return a + p.cpu; }, 0);
  cpus = cpus.map(function (c, i) {
    var share = total / cpus.length * (0.6 + Math.random() * 0.8) + Math.random() * 4;
    return clamp(c * 0.4 + share * 0.6, 0.3, 100);
  });
  var avg = cpus.reduce(function (a, b) { return a + b; }, 0) / cpus.length / 100 * cpus.length;
  load = [load[0] * 0.92 + avg * 0.08, load[1] * 0.98 + avg * 0.02, load[2] * 0.995 + avg * 0.005];
}

// ── Rendering ────────────────────────────────────────────────────────────
function meter(x, y, w, label, segs, text) {
  // e.g. "  0[|||||||          18.2%]": bars by colour segment, value right-aligned inside the brackets
  var put = scr.put;
  put(x, y, padL(label, 3), 'hp-lab');
  put(x + 3, y, '[', 'hp-br');
  var inner = w - 5, filled = 0;
  segs.forEach(function (s) {
    var n = Math.round(s[0] * inner);
    n = Math.min(n, inner - filled);
    if (n > 0) put(x + 4 + filled, y, '|'.repeat(n), s[1]);
    filled += Math.max(0, n);
  });
  put(x + 4 + inner - text.length, y, text, 'hp-mtext');
  put(x + 4 + inner, y, ']', 'hp-br');
}

function drawHeader() {
  var cols = scr.cols, y = 0;
  var memUsed = procs.reduce(function (a, p) { return a + p.res; }, 0) + 2400000;
  var used = memUsed / MEM_TOTAL;
  var memText = (memUsed / 1048576).toFixed(2) + 'G/' + (MEM_TOTAL / 1048576).toFixed(1) + 'G';
  var cpuSeg = function (v) { return [[v / 100 * 0.08, 'hp-b'], [v / 100 * 0.72, 'hp-g'], [v / 100 * 0.2, 'hp-r']]; };
  var running = procs.filter(function (p) { return p.state === 'R'; }).length;
  var tasks = procs.length + 131;
  var info = [
    [['Tasks: ', 'hp-lab'], [tasks + ', ' + (tasks * 5 + 107) + ' thr; ', 'hp-strong'], [running + ' running', 'hp-run']],
    [['Load average: ', 'hp-lab'], [load.map(function (l) { return l.toFixed(2); }).join(' '), 'hp-strong']],
    [['Uptime: ', 'hp-lab'], [fmtUptime(UPTIME0 + (Date.now() - T0) / 1000), 'hp-strong']],
  ];
  function infoLine(x, yy, parts) { parts.forEach(function (p) { scr.put(x, yy, p[0], p[1]); x += p[0].length; }); }

  if (wide) {
    var half = Math.floor(cols / 2), w = half - 2, n = cpus.length, left = Math.ceil(n / 2);
    for (var i = 0; i < left; i++) meter(1, i, w, String(i), cpuSeg(cpus[i]), cpus[i].toFixed(1) + '%');
    meter(1, left, w, 'Mem', [[used * 0.78, 'hp-g'], [used * 0.06, 'hp-b'], [used * 0.16, 'hp-y']], memText);
    meter(1, left + 1, w, 'Swp', [], '0K/2.00G');
    for (var j = left; j < n; j++) meter(half + 1, j - left, w, String(j), cpuSeg(cpus[j]), cpus[j].toFixed(1) + '%');
    info.forEach(function (parts, k) { infoLine(half + 2, n - left + k, parts); });
    y = Math.max(left + 2, n - left + 3);
  } else {
    var ww = cols - 2;
    cpus.forEach(function (c, i) { meter(1, i, ww, String(i), cpuSeg(c), c.toFixed(1) + '%'); });
    meter(1, cpus.length, ww, 'Mem', [[used * 0.78, 'hp-g'], [used * 0.06, 'hp-b'], [used * 0.16, 'hp-y']], memText);
    info.forEach(function (parts, k) { infoLine(2, cpus.length + 1 + k, parts); });
    y = cpus.length + 4;
  }
  return y + 1; // one blank line, as htop leaves
}

function columns() {
  var c = [
    ['pid', 'PID', 7, 'r'], ['user', 'USER', 9, 'l'], ['pri', 'PRI', 3, 'r'], ['ni', 'NI', 3, 'r'],
    ['virt', 'VIRT', 5, 'r'], ['res', 'RES', 5, 'r'], ['shr', 'SHR', 5, 'r'], ['state', 'S', 1, 'l'],
    ['cpu', 'CPU%', 5, 'r'], ['mem', 'MEM%', 4, 'r'], ['time', 'TIME+', 9, 'r'], ['cmd', 'Command', 0, 'l'],
  ];
  if (!wide) c = c.filter(function (x) { return ['pri', 'ni', 'virt', 'shr'].indexOf(x[0]) === -1; });
  // phones: keep just enough to see what's running
  if (scr.cols < 64) {
    c = c.filter(function (x) { return ['pid', 'state', 'cpu', 'mem', 'cmd'].indexOf(x[0]) !== -1; });
    c[0] = ['pid', 'PID', 5, 'r'];
  }
  return c;
}

function cell(p, key) {
  switch (key) {
    case 'pid': return p.pid;
    case 'user': return p.user;
    case 'pri': return p.pri;
    case 'ni': return p.ni;
    case 'virt': return fmtMem(p.virt);
    case 'res': return fmtMem(p.res);
    case 'shr': return fmtMem(p.shr);
    case 'state': return p.state;
    case 'cpu': return p.cpu.toFixed(1);
    case 'mem': return (p.res / MEM_TOTAL * 100).toFixed(1);
    case 'time': return fmtTime(p.time);
    case 'cmd': return p.cmd;
  }
}

function sorted() {
  var k = sortKey, list = procs.slice();
  list.sort(function (a, b) {
    var va = k === 'mem' ? a.res : a[k], vb = k === 'mem' ? b.res : b[k];
    if (typeof va === 'string') { va = va.toLowerCase(); vb = vb.toLowerCase(); }
    var d = va < vb ? -1 : va > vb ? 1 : a.pid - b.pid;
    return sortDesc ? -d : d;
  });
  return list;
}

function tableTop() { return headerH; }
var headerH = 0, listH = 0, visible = [];

function drawTable() {
  var cols = scr.cols, y = headerH, cs = columns();
  // column header: black on green, the sort column highlighted
  scr.fillRow(y, 'hp-thead');
  var x = 0;
  cs.forEach(function (c, i) {
    var label = c[3] === 'r' ? padL(c[1], c[2]) : (c[2] ? padR(c[1], c[2]) : c[1]);
    if (c[0] === sortKey) label = label.replace(/ ?$/, '') + (sortDesc ? '▽' : '△');
    scr.put(x, y, label, 'hp-thead' + (c[0] === sortKey ? ' hp-thead-sort' : ''), 'sort:' + c[0]);
    x += (c[2] || label.length) + 1;
  });

  visible = sorted();
  listH = scr.rows - y - 2;
  var selIdx = Math.max(0, visible.findIndex(function (p) { return p.pid === selPid; }));
  if (selPid == null && visible.length) selPid = visible[0].pid;
  if (selIdx < scroll) scroll = selIdx;
  if (selIdx >= scroll + listH) scroll = selIdx - listH + 1;
  scroll = clamp(scroll, 0, Math.max(0, visible.length - listH));

  for (var r = 0; r < listH; r++) {
    var p = visible[scroll + r];
    if (!p) break;
    var row = y + 1 + r, sel = p.pid === selPid, act = 'row:' + p.pid;
    scr.fillRow(row, sel ? 'hp-sel' : '', act);
    var xx = 0;
    cs.forEach(function (c) {
      var v = String(cell(p, c[0]));
      var text = c[2] ? (c[3] === 'r' ? padL(v, c[2]) : padR(v, c[2])) : v;
      var cls = sel ? 'hp-sel' : cellClass(p, c[0], v);
      if (c[0] === 'cmd' && !sel) drawCmd(xx, row, p, act);
      else scr.put(xx, row, text, cls, act);
      xx += (c[2] || 0) + 1;
    });
  }
}

function cellClass(p, key, v) {
  if (key === 'user') return p.user === 'root' ? 'hp-dim' : '';
  if (key === 'state') return p.state === 'R' ? 'hp-run' : p.state === 'Z' ? 'hp-zombie' : p.state === 'T' ? 'hp-r' : 'hp-dim';
  if (key === 'cpu' || key === 'mem') return parseFloat(v) === 0 ? 'hp-dim' : '';
  if (key === 'virt' || key === 'res' || key === 'shr') return /[MG]$/.test(v) ? 'hp-big' : '';
  if (key === 'pri' || key === 'ni') return 'hp-dim';
  return '';
}

// Command column: htop shows the program's basename in bold; projects stand out in the accent colour
function drawCmd(x, y, p, act) {
  var cmd = p.cmd, sp = cmd.indexOf(' '), prog = sp === -1 ? cmd : cmd.slice(0, sp), rest = sp === -1 ? '' : cmd.slice(sp);
  var slash = prog.lastIndexOf('/'), dirPart = prog.slice(0, slash + 1), base = prog.slice(slash + 1);
  var proj = p.project ? (p.zombie ? ' hp-zombie' : ' hp-proj') : '';
  scr.put(x, y, dirPart, 'hp-dim' + proj, act); x += dirPart.length;
  scr.put(x, y, base, 'hp-strong' + proj, act); x += base.length;
  scr.put(x, y, rest + (p.zombie ? ' <defunct>' : ''), proj ? proj.trim() : '', act);
}

function drawFooter() {
  var y = scr.rows - 1, x = 0;
  scr.fillRow(y, '');
  var keys;
  if (search !== null) {
    keys = [['F3', 'Next  ', 'search-next'], ['Esc', 'Cancel', 'search-cancel']];
  } else if (view === 'signal' || view === 'sort') {
    keys = [['Enter', view === 'signal' ? 'Send  ' : 'Sort  ', 'panel-ok'], ['Esc', 'Cancel', 'panel-cancel']];
  } else if (view === 'help') {
    keys = [['Esc', 'Done  ', 'help-close']];
  } else {
    keys = [['F1', 'Help  ', 'f1'], ['F2', 'Setup ', 'f2'], ['F3', 'Search', 'f3'], ['F4', 'Filter', 'f4'], ['F5', 'Tree  ', 'f5'],
            ['F6', 'SortBy', 'f6'], ['F7', 'Nice -', 'f7'], ['F8', 'Nice +', 'f8'], ['F9', 'Kill  ', 'f9'], ['F10', 'Quit  ', 'f10']];
  }
  keys.forEach(function (k) {
    if (x >= scr.cols) return;
    scr.put(x, y, k[0], 'hp-fkey', k[2]); x += k[0].length;
    scr.put(x, y, k[1], 'hp-flabel', k[2]); x += k[1].length;
  });
  if (search !== null) { scr.put(x + 1, y, 'Search: ', 'hp-strong'); scr.put(x + 9, y, search + '█', search && !findMatch(0) ? 'hp-r' : ''); }
  // status message line just above the footer
  if (msg) {
    var m = ' ' + msg.text + ' ';
    scr.fillRow(y - 1, 'hp-msg');
    scr.put(0, y - 1, m.slice(0, scr.cols), 'hp-msg');
  }
}

function drawPanel(title, items, current) {
  var w = Math.min(22, scr.cols - 4), top = headerH, h = scr.rows - top - 1;
  for (var r = 0; r < h; r++) scr.put(0, top + r, ' '.repeat(w), 'hp-panel');
  scr.put(0, top, padR(title, w), 'hp-thead');
  var start = clamp(panelIdx - Math.floor((h - 2) / 2), 0, Math.max(0, items.length - (h - 1)));
  for (var i = 0; i < h - 1 && start + i < items.length; i++) {
    var it = items[start + i], on = start + i === panelIdx;
    scr.put(0, top + 1 + i, padR(' ' + it, w), on ? 'hp-sel' : (current === start + i ? 'hp-strong hp-panel' : 'hp-panel'), 'panel:' + (start + i));
  }
  for (var k = 0; k < h; k++) scr.put(w, top + k, '│', 'hp-dim');
}

function drawHelp() {
  var y = 0, put = scr.put;
  for (var r = 0; r < scr.rows - 1; r++) scr.fillRow(r, '');
  var L = [
    [['htop ' + VERSION + ' - (C) 2004-2019 Hisham Muhammad. (C) 2020-2024 htop dev team.', 'hp-strong']],
    [['Released under the GNU GPLv2+. This copy was hand-built for zaid\'s portfolio.', 'hp-dim']],
    [],
    [['CPU usage bar: ', 'hp-strong'], ['[', 'hp-br'], ['low-priority', 'hp-b'], ['/', ''], ['normal', 'hp-g'], ['/', ''], ['kernel', 'hp-r'], ['      used%', 'hp-mtext'], [']', 'hp-br']],
    [['Memory bar:    ', 'hp-strong'], ['[', 'hp-br'], ['used', 'hp-g'], ['/', ''], ['buffers', 'hp-b'], ['/', ''], ['cache', 'hp-y'], ['   used/total', 'hp-mtext'], [']', 'hp-br']],
    [['Status: R: running; S: sleeping; T: stopped; Z: zombie (retired projects end up here)', 'hp-dim']],
    [],
    [['     Arrows: ', 'hp-strong'], ['scroll process list', '']],
    [['      Enter: ', 'hp-strong'], ['attach to a project (opens its page)', '']],
    [['   F3 /    : ', 'hp-strong'], ['incremental name search', '']],
    [['   F6 >    : ', 'hp-strong'], ['select sort column   ', ''], ['P M T', 'hp-strong'], [': sort by CPU / MEM / TIME   ', ''], ['I', 'hp-strong'], [': invert', '']],
    [['   F9 k    : ', 'hp-strong'], ['kill process / send signal (projects are hard to kill)', '']],
    [['   F1 h    : ', 'hp-strong'], ['show this help screen', '']],
    [['  F10 q    : ', 'hp-strong'], ['quit', '']],
    [],
    [['Mouse: click a row to select it, double-click (or tap it again) to attach.', 'hp-dim']],
    [],
    [['Press any key to return.', 'hp-strong']],
  ];
  L.forEach(function (parts, i) {
    var x = 1;
    parts.forEach(function (p) { put(x, y + i, p[0], p[1]); x += p[0].length; });
  });
}

function render() {
  if (!scr) return;
  scr.clear();
  wide = scr.cols >= 92;
  if (view === 'help') { drawHelp(); drawFooter(); scr.flush(); return; }
  headerH = drawHeader();
  drawTable();
  if (view === 'signal') drawPanel('Send signal:', SIGNALS.map(function (s) { return padL(s[0], 2) + ' ' + s[1]; }));
  if (view === 'sort') drawPanel('Sort by', SORTS.map(function (s) { return s[1]; }), SORTS.findIndex(function (s) { return s[0] === sortKey; }));
  drawFooter();
  scr.flush();
}

// ── Actions ──────────────────────────────────────────────────────────────
function say(text, ms) {
  msg = { text: text };
  if (msgTimer) clearTimeout(msgTimer);
  msgTimer = setTimeout(function () { msg = null; render(); }, ms || 2600);
  render();
}
function selected() { return procs.filter(function (p) { return p.pid === selPid; })[0] || null; }
function moveSel(d) {
  var list = sorted(), i = list.findIndex(function (p) { return p.pid === selPid; });
  i = clamp((i < 0 ? 0 : i) + d, 0, list.length - 1);
  if (list[i]) selPid = list[i].pid;
  render();
}

function attach() {
  var p = selected();
  if (!p) return;
  if (p.self) return say('htop: attaching to yourself is a philosophical question');
  if (!p.project) return say('strace: attach: ptrace(PTRACE_SEIZE, ' + p.pid + '): Operation not permitted');
  if (p.zombie) say('attaching to ' + p.cmd.split(' ')[0] + ' (pid ' + p.pid + ', zombie)… reading its last words');
  else say('attaching to ' + p.cmd.split(' ')[0] + ' (pid ' + p.pid + ')…');
  var href = p.project.href;
  setTimeout(function () { if (state !== 'off') { var nav = opts && opts.navigate; exit(); if (nav) nav(href); } }, 750);
}

function sendSignal(num) {
  var p = selected();
  view = 'table';
  if (!p || num === 0) return render();
  var name = p.cmd.split(' ')[0].replace(/^.*\//, '');
  if (p.self) { if (num === 9 || num === 15 || num === 2) return exit(); return say('htop: ignoring ' + sigName(num)); }
  if (!p.project) {
    if (p.user === 'root' || p.user !== 'zaid') return say('kill: (' + p.pid + ') - Operation not permitted');
    return say(name + ': not killing your own desktop — that\'s how you lose this terminal');
  }
  if (p.zombie) return say(name + ' is already dead (zombie — the project is retired). Nothing to kill.');
  if (num === 19 || num === 20) { p.state = 'T'; p.cpu = 0; return say(name + ': stopped (send SIGCONT to resume)'); }
  if (num === 18) { p.state = 'S'; return say(name + ': continued'); }
  if (num === 9) {
    var oldPid = p.pid;
    p.pid = 3000 + Math.floor(Math.random() * 6000); p.time = 0; p.cpu = 18; p.state = 'R';
    selPid = p.pid;
    return say(name + ' (pid ' + oldPid + ') killed — Restart=always, respawned as pid ' + p.pid, 3600);
  }
  if (num === 15) return say(TERM_JOKES[p.project.dir] || (name + ': SIGTERM ignored — still shipping'), 3600);
  if (num === 1) return say(name + ': SIGHUP — reloaded config');
  return say(name + ': ' + sigName(num) + ' handled, carrying on');
}
function sigName(n) { var s = SIGNALS.filter(function (x) { return x[0] === n; })[0]; return s ? s[1] : 'signal ' + n; }

function openPanel(kind) {
  view = kind;
  panelIdx = kind === 'signal' ? SIGNALS.findIndex(function (s) { return s[0] === 15; })
                               : Math.max(0, SORTS.findIndex(function (s) { return s[0] === sortKey; }));
  render();
}
function panelOk() {
  if (view === 'signal') return sendSignal(SIGNALS[panelIdx][0]);
  if (view === 'sort') { setSort(SORTS[panelIdx][0]); view = 'table'; render(); }
}
function setSort(k) {
  if (sortKey === k) sortDesc = !sortDesc;
  else { sortKey = k; sortDesc = ['cpu', 'mem', 'time', 'virt', 'res', 'shr'].indexOf(k) !== -1; }
}

function findMatch(from) {
  if (!search) return null;
  var q = search.toLowerCase(), list = sorted();
  for (var i = 0; i < list.length; i++) {
    var p = list[(from + i) % list.length];
    if (p.cmd.toLowerCase().indexOf(q) !== -1) return p;
  }
  return null;
}
function searchNext(step) {
  var list = sorted(), i = list.findIndex(function (p) { return p.pid === selPid; });
  var m = findMatch((i < 0 ? 0 : i) + step);
  if (m) selPid = m.pid;
  render();
}

var NOT_HERE = {
  f2: 'Setup: no config file — this htop was hand-built',
  f4: 'Filter: try F3 search instead',
  f5: 'Tree view: everything here is a child of zaid',
  f7: 'renice: failed to set priority: Permission denied',
  f8: 'renice: failed to set priority: Permission denied',
};

function act(a) {
  if (!a) return;
  if (a.indexOf('row:') === 0) {
    var pid = +a.slice(4), coarse = window.matchMedia && window.matchMedia('(pointer: coarse)').matches;
    if (view !== 'table') return;
    if (coarse && pid === selPid && lastTap === pid) return attach();
    selPid = pid; lastTap = pid; render();
    return;
  }
  if (a.indexOf('sort:') === 0) { setSort(a.slice(5)); return render(); }
  if (a.indexOf('panel:') === 0) { panelIdx = +a.slice(6); return panelOk(); }
  switch (a) {
    case 'f1': view = 'help'; return render();
    case 'f3': search = ''; return render();
    case 'f6': return openPanel('sort');
    case 'f9': return openPanel('signal');
    case 'f10': return exit();
    case 'panel-ok': return panelOk();
    case 'panel-cancel': view = 'table'; return render();
    case 'help-close': view = 'table'; return render();
    case 'search-next': return searchNext(1);
    case 'search-cancel': search = null; return render();
  }
  if (NOT_HERE[a]) say(NOT_HERE[a]);
}

// ── Input ────────────────────────────────────────────────────────────────
function onKey(e) {
  if (state === 'off' || e.ctrlKey || e.metaKey || e.altKey) return;
  var k = e.key, handled = true;

  if (view === 'help') { view = 'table'; render(); }
  else if (search !== null) {
    if (k === 'Escape') { search = null; render(); }
    else if (k === 'Enter') { search = null; render(); }
    else if (k === 'F3') searchNext(1);
    else if (k === 'Backspace') { search = search.slice(0, -1); var m0 = findMatch(0); if (m0) selPid = m0.pid; render(); }
    else if (k === 'ArrowDown') moveSel(1);
    else if (k === 'ArrowUp') moveSel(-1);
    else if (k.length === 1) { search += k; var m = findMatch(0); if (m) selPid = m.pid; render(); }
    else handled = false;
  } else if (view === 'signal' || view === 'sort') {
    var n = view === 'signal' ? SIGNALS.length : SORTS.length;
    if (k === 'ArrowDown') { panelIdx = Math.min(n - 1, panelIdx + 1); render(); }
    else if (k === 'ArrowUp') { panelIdx = Math.max(0, panelIdx - 1); render(); }
    else if (k === 'Enter') panelOk();
    else if (k === 'Escape' || k === 'q' || k === 'F10') { view = 'table'; render(); }
    else if (view === 'signal' && /^[0-9]$/.test(k)) {
      var i = SIGNALS.findIndex(function (s) { return String(s[0]).indexOf(k) === 0; });
      if (i >= 0) { panelIdx = i; render(); }
    } else handled = false;
  } else {
    switch (k) {
      case 'ArrowDown': moveSel(1); break;
      case 'ArrowUp': moveSel(-1); break;
      case 'PageDown': moveSel(Math.max(1, listH - 1)); break;
      case 'PageUp': moveSel(-Math.max(1, listH - 1)); break;
      case 'Home': moveSel(-1e6); break;
      case 'End': moveSel(1e6); break;
      case 'Enter': attach(); break;
      case 'F1': case 'h': case '?': act('f1'); break;
      case 'F3': case '/': act('f3'); break;
      case 'F6': case '>': case '<': case '.': act('f6'); break;
      case 'F9': case 'k': act('f9'); break;
      case 'F10': case 'q': case 'Q': case 'Escape': exit(); break;
      case 'P': setSort('cpu'); sortDesc = true; render(); break;
      case 'M': setSort('mem'); sortDesc = true; render(); break;
      case 'T': setSort('time'); sortDesc = true; render(); break;
      case 'I': sortDesc = !sortDesc; render(); break;
      case 'F2': act('f2'); break;
      case 'F4': case '\\': act('f4'); break;
      case 'F5': case 't': act('f5'); break;
      case 'F7': case ']': act('f7'); break;
      case 'F8': case '[': act('f8'); break;
      default: handled = false;
    }
  }
  if (handled) { e.preventDefault(); e.stopImmediatePropagation(); }
}

function onClick(e) {
  var t = e.target.closest('[data-act]');
  if (view === 'help') { view = 'table'; render(); return; }
  if (t) act(t.getAttribute('data-act'));
}
function onDblClick(e) {
  var t = e.target.closest('[data-act^="row:"]');
  if (t && view === 'table') { selPid = +t.getAttribute('data-act').slice(4); attach(); }
}
function onWheel(e) { if (view === 'table') { e.preventDefault(); moveSel(e.deltaY > 0 ? 3 : -3); } }
function onTouchStart(e) { touchY = e.touches.length ? e.touches[0].clientY : null; }
function onTouchMove(e) {
  if (touchY == null || !e.touches.length) return;
  var dy = e.touches[0].clientY - touchY, lh = scr.pre.clientHeight / scr.rows;
  if (Math.abs(dy) >= lh) { e.preventDefault(); moveSel(dy < 0 ? 1 : -1); touchY = e.touches[0].clientY; lastTap = null; }
}
function onResize() { if (scr) { scr.measure(); render(); } }

// ── Start / exit ─────────────────────────────────────────────────────────
function start(o) {
  if (state !== 'off') return;
  opts = o;
  scr = TermScreen.create({ body: o.body, className: 'hp-root', label: 'htop process viewer. Arrow keys to move, Enter to open a project, F10 to quit.' });
  if (document.activeElement && document.activeElement.blur) document.activeElement.blur();
  var n = clamp(navigator.hardwareConcurrency || 4, 2, 8);
  cpus = []; for (var i = 0; i < n; i++) cpus.push(3 + Math.random() * 15);
  procs = buildProcs();
  state = 'on'; view = 'table'; search = null; msg = null; scroll = 0; sortKey = 'cpu'; sortDesc = true; lastTap = null;
  simulate();
  var first = sorted().filter(function (p) { return p.project && !p.zombie; })[0];
  selPid = first ? first.pid : null;
  scr.measure();
  render();
  timer = setInterval(function () { simulate(); render(); }, 1000);
  document.addEventListener('keydown', onKey, true);
  scr.pre.addEventListener('click', onClick);
  scr.pre.addEventListener('dblclick', onDblClick);
  scr.pre.addEventListener('wheel', onWheel, { passive: false });
  scr.pre.addEventListener('touchstart', onTouchStart, { passive: true });
  scr.pre.addEventListener('touchmove', onTouchMove, { passive: false });
  window.addEventListener('resize', onResize);
}

function exit() {
  if (state === 'off') return;
  state = 'off';
  clearInterval(timer); timer = null;
  if (msgTimer) { clearTimeout(msgTimer); msgTimer = null; }
  document.removeEventListener('keydown', onKey, true);
  window.removeEventListener('resize', onResize);
  if (scr) scr.destroy();
  scr = null;
  var cb = opts && opts.onExit;
  opts = null;
  if (cb) cb();
}

window.TermHtop = {
  start: start,
  stop: exit,
  running: function () { return state !== 'off'; },
};
})();
