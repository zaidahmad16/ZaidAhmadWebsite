/* pb/menu.js — the DS bottom (touch) screen: FIGHT / BAG / RUN / POKéMON and their sub-menus.
   choose() resolves with the player's action for the turn; everything that doesn't use a turn
   (RUN, SHIFT, a useless item) is answered here and loops back to the command menu. */
(function (root) {
'use strict';

var D = function () { return PB.data; };
var bot = null, battle = null, resolveFn = null, busy = false;

function el(tag, cls, parent, text) { return PB.scene.el(tag, cls, parent, text); }

function clear() { if (bot) bot.innerHTML = ''; }

function btn(cls, parent, label, onClick) {
  var b = el('button', 'pb-btn ' + cls, parent);
  b.type = 'button';
  if (label != null) el('span', 'pb-btn-label', b, label);
  b.addEventListener('click', function (e) {
    e.stopPropagation();
    if (busy || b.disabled) return;
    onClick(b);
  });
  return b;
}

function focusFirst() {
  var f = bot && bot.querySelector('.pb-btn:not(:disabled)');
  if (f) f.focus({ preventScroll: true });
}

// Show a message on the top screen without using the turn, then come back to `back`.
function info(text, back, sound) {
  busy = true;
  PB.audio.play(sound || 'error');
  bot.classList.add('pb-dim');
  return PB.scene.say(text, { hold: 1300 }).then(function () {
    busy = false;
    bot.classList.remove('pb-dim');
    (back || showRoot)();
  });
}

function prompt() { return PB.scene.say('What will ' + battle.player.mon.name + ' do?', { keep: true }); }

function finish(action) {
  PB.audio.play('select');
  clear();
  bot.classList.add('pb-idle');
  var r = resolveFn; resolveFn = null;
  if (r) r(action);
}

// ── Command menu ─────────────────────────────────────────────────────────
function showRoot() {
  clear(); bot.classList.remove('pb-idle');
  prompt();
  var wrap = el('div', 'pb-cmd', bot);
  btn('pb-cmd-fight', wrap, 'FIGHT', function () { PB.audio.play('select'); showFight(); });
  btn('pb-cmd-bag', wrap, 'BAG', function () { PB.audio.play('select'); showPockets(); });
  btn('pb-cmd-run', wrap, 'RUN', function () { info('No! There\'s no running from a Trainer battle!'); });
  btn('pb-cmd-mon', wrap, 'POKéMON', function () { PB.audio.play('select'); showParty(); });
  focusFirst();
}

// ── FIGHT ────────────────────────────────────────────────────────────────
function showFight() {
  var mon = battle.player.mon;
  if (PB.engine.allOutOfPP(mon)) {
    busy = true;
    PB.scene.say(mon.name + ' has no moves left!', { hold: 1100 }).then(function () { busy = false; finish({ type: 'move', slot: 'struggle' }); });
    return;
  }
  clear();
  var grid = el('div', 'pb-moves', bot);
  mon.moves.forEach(function (m, i) {
    var mv = PB.data.MOVES[m.id];
    var b = btn('pb-move pb-t-' + mv.type, grid, null, function () {
      if (m.pp <= 0) return info('There\'s no PP left for this move!', showFight);
      finish({ type: 'move', slot: i });
    });
    el('span', 'pb-move-name', b, mv.name);
    var row = el('span', 'pb-move-row', b);
    el('span', 'pb-type-tag pb-t-' + mv.type, row, mv.type.toUpperCase());
    var pp = el('span', 'pb-move-pp' + (m.pp === 0 ? ' pb-pp-out' : m.pp <= m.maxPP / 4 ? ' pb-pp-low' : ''), row);
    el('span', 'pb-pp-label', pp, 'PP');
    pp.appendChild(document.createTextNode(' ' + m.pp + '/' + m.maxPP));
    b.setAttribute('aria-label', mv.name + ', ' + mv.type + ' type, ' + mv.cat + ', PP ' + m.pp + ' of ' + m.maxPP);
  });
  cancel(showRoot);
  focusFirst();
}

function cancel(back, label) {
  var b = btn('pb-cancel', bot, label || 'CANCEL', function () { PB.audio.play('cancel'); back(); });
  b.setAttribute('data-cancel', '1');
  return b;
}

// ── BAG ──────────────────────────────────────────────────────────────────
function showPockets() {
  clear();
  var grid = el('div', 'pb-pockets', bot);
  PB.data.POCKETS.forEach(function (name, p) {
    var b = btn('pb-pocket pb-pocket-' + p, grid, null, function () { PB.audio.play('select'); showItems(p, 0); });
    el('span', 'pb-pocket-icon pb-pi-' + p, b);
    el('span', 'pb-btn-label', b, name);
  });
  cancel(showRoot);
  focusFirst();
}

function itemsIn(p) {
  return Object.keys(PB.data.ITEMS).filter(function (k) { return PB.data.ITEMS[k].pocket === p && battle.bag[k] > 0; });
}

function showItems(p, page) {
  clear();
  var ids = itemsIn(p), per = 6, pages = Math.max(1, Math.ceil(ids.length / per));
  page = Math.min(page, pages - 1);
  el('div', 'pb-pocket-title', bot, PB.data.POCKETS[p]);
  var list = el('div', 'pb-items', bot);
  if (!ids.length) el('div', 'pb-empty', list, 'There are no items in this pocket.');
  ids.slice(page * per, page * per + per).forEach(function (id) {
    var it = PB.data.ITEMS[id];
    var b = btn('pb-item', list, null, function () { PB.audio.play('select'); showItem(id, p, page); });
    var ic = el('img', 'pb-px pb-item-icon', b); ic.src = it.icon; ic.alt = '';
    el('span', 'pb-item-name', b, it.name);
    el('span', 'pb-item-count', b, '×' + battle.bag[id]);
  });
  var nav = el('div', 'pb-pager', bot);
  if (pages > 1) {
    btn('pb-page', nav, '◀', function () { PB.audio.play('select'); showItems(p, (page + pages - 1) % pages); });
    el('span', 'pb-page-num', nav, (page + 1) + '/' + pages);
    btn('pb-page', nav, '▶', function () { PB.audio.play('select'); showItems(p, (page + 1) % pages); });
  }
  cancel(showPockets);
  focusFirst();
}

function showItem(id, p, page) {
  clear();
  var it = PB.data.ITEMS[id];
  var card = el('div', 'pb-itemcard', bot);
  var ic = el('img', 'pb-px pb-itemcard-icon', card); ic.src = it.icon; ic.alt = '';
  el('div', 'pb-itemcard-name', card, it.name + '  ×' + battle.bag[id]);
  el('div', 'pb-itemcard-desc', card, it.desc);
  var row = el('div', 'pb-itemcard-row', bot);
  btn('pb-use', row, 'USE', function () {
    if (!PB.engine.itemUsable(battle, id)) return info('It won\'t have any effect.', function () { showItem(id, p, page); });
    finish({ type: 'item', id: id });
  });
  var c = btn('pb-cancel pb-cancel-inline', row, 'CANCEL', function () { PB.audio.play('cancel'); showItems(p, page); });
  c.setAttribute('data-cancel', '1');
  focusFirst();
}

// ── POKéMON ──────────────────────────────────────────────────────────────
function showParty() {
  clear();
  var mon = battle.player.mon;
  var grid = el('div', 'pb-party', bot);
  var slot = btn('pb-slot pb-slot-lead', grid, null, function () { PB.audio.play('select'); showSlotMenu(); });
  var ic = el('img', 'pb-px pb-slot-icon', slot); ic.src = mon.species.icon; ic.alt = '';
  el('span', 'pb-slot-name', slot, mon.name);
  el('span', 'pb-slot-lv', slot, 'Lv' + mon.level);
  var bar = el('span', 'pb-slot-bar', slot);
  var fill = el('span', 'pb-slot-fill', bar);
  var frac = mon.hp / mon.maxHP;
  fill.style.width = (frac * 100) + '%';
  fill.setAttribute('data-c', frac > 0.5 ? 'g' : frac > 0.2 ? 'y' : 'r');
  el('span', 'pb-slot-hp', slot, mon.hp + '/' + mon.maxHP);
  for (var i = 0; i < 5; i++) el('div', 'pb-slot pb-slot-empty', grid);
  cancel(showRoot);
  focusFirst();
}

function showSlotMenu() {
  clear();
  var mon = battle.player.mon;
  el('div', 'pb-pocket-title', bot, mon.name);
  var col = el('div', 'pb-slotmenu', bot);
  btn('pb-opt', col, 'SHIFT', function () { info(mon.name + ' is already in battle!', showSlotMenu); });
  btn('pb-opt', col, 'SUMMARY', function () { PB.audio.play('select'); showSummary(); });
  cancel(showParty);
  focusFirst();
}

function showSummary() {
  clear();
  var mon = battle.player.mon, s = mon.stats;
  var card = el('div', 'pb-summary', bot);
  var head = el('div', 'pb-sum-head', card);
  var ic = el('img', 'pb-px pb-sum-icon', head); ic.src = mon.species.icon; ic.alt = '';
  var t = el('div', 'pb-sum-title', head);
  el('div', 'pb-sum-name', t, mon.name + '  Lv' + mon.level);
  el('div', 'pb-sum-sub', t, mon.nature[0] + ' nature · ' + mon.species.ability);
  var tbl = el('div', 'pb-sum-stats', card);
  [['HP', mon.hp + '/' + s.hp], ['Attack', s.atk, 'atk'], ['Defense', s.def, 'def'], ['Sp. Atk', s.spa, 'spa'], ['Sp. Def', s.spd, 'spd'], ['Speed', s.spe, 'spe']]
    .forEach(function (r) {
      var row = el('div', 'pb-sum-row', tbl);
      var lab = el('span', 'pb-sum-lab', row, r[0]);
      if (r[2] && mon.nature[1] === r[2]) lab.classList.add('pb-nat-up');
      if (r[2] && mon.nature[2] === r[2]) lab.classList.add('pb-nat-down');
      el('span', 'pb-sum-val', row, String(r[1]));
    });
  cancel(showSlotMenu);
  focusFirst();
}

// ── Keyboard: arrows move between buttons, Z/Enter = A, X/Backspace = B ───
function onKey(e) {
  if (!bot) return;
  var k = e.key;
  if (k === 'z' || k === 'Z' || k === 'Enter' || k === ' ') {
    var s = PB.scene.get();
    // While the command menu is open, A presses the focused button even if the prompt is still typing
    if (s && s.msg.wait && !(resolveFn && !busy)) { e.preventDefault(); e.stopPropagation(); PB.scene.advance(); return; }
    var f = document.activeElement;
    if (f && bot.contains(f) && f.classList.contains('pb-btn')) { e.preventDefault(); e.stopPropagation(); f.click(); }
    else e.stopPropagation();
    return;
  }
  if (k === 'x' || k === 'X' || k === 'Backspace') {
    var c = bot.querySelector('[data-cancel]');
    if (c && !busy) { e.preventDefault(); c.click(); }
    e.stopPropagation();
    return;
  }
  var dir = { ArrowUp: [0, -1], ArrowDown: [0, 1], ArrowLeft: [-1, 0], ArrowRight: [1, 0] }[k];
  if (!dir) return;
  e.preventDefault(); e.stopPropagation();
  var btns = Array.prototype.slice.call(bot.querySelectorAll('.pb-btn:not(:disabled)'));
  if (!btns.length) return;
  var cur = btns.indexOf(document.activeElement);
  if (cur < 0) { btns[0].focus({ preventScroll: true }); return; }
  var r0 = btns[cur].getBoundingClientRect(), cx = r0.left + r0.width / 2, cy = r0.top + r0.height / 2;
  var best = null, bestD = Infinity;
  btns.forEach(function (b, i) {
    if (i === cur) return;
    var r = b.getBoundingClientRect(), dx = r.left + r.width / 2 - cx, dy = r.top + r.height / 2 - cy;
    var along = dx * dir[0] + dy * dir[1];
    if (along <= 1) return;
    var across = Math.abs(dx * dir[1]) + Math.abs(dy * dir[0]);
    var d = along + across * 2;
    if (d < bestD) { bestD = d; best = b; }
  });
  if (best) { PB.audio.play('advance'); best.focus({ preventScroll: true }); }
}

function build(el_, b) {
  bot = el_; battle = b;
  bot.classList.add('pb-idle');
  document.addEventListener('keydown', onKey, true);
}
function choose() {
  return new Promise(function (res) { resolveFn = res; showRoot(); });
}
function idle() { clear(); if (bot) bot.classList.add('pb-idle'); }
function destroy() {
  document.removeEventListener('keydown', onKey, true);
  bot = null; battle = null; resolveFn = null; busy = false;
}

root.PB.menu = { build: build, choose: choose, idle: idle, destroy: destroy };
})(window);
