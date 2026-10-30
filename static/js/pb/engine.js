/* pb/engine.js — Gen 5 battle rules. No DOM: every turn returns a list of events that the
   UI plays back in order, so the rules can be checked in Node (see the scratch test). */
(function (root) {
'use strict';

var D = root.PB.data;
var MOVES = D.MOVES;

// ── Maths ────────────────────────────────────────────────────────────────
function pokeRound(x) { return (x % 1 > 0.5) ? Math.ceil(x) : Math.floor(x); }
function stageMult(n) { return n >= 0 ? (2 + n) / 2 : 2 / (2 - n); }
var CRIT_RATE = [1 / 16, 1 / 8, 1 / 4, 1 / 3, 1 / 2];

function expAt(level) { return Math.floor(5 * Math.pow(level, 3) / 4); } // Slow growth

function calcStats(base, level, ivs, nature) {
  var s = { hp: Math.floor((2 * base.hp + ivs.hp) * level / 100) + level + 10 };
  ['atk', 'def', 'spa', 'spd', 'spe'].forEach(function (k) {
    var v = Math.floor((2 * base[k] + ivs[k]) * level / 100) + 5;
    if (nature[1] === k) v = Math.floor(v * 1.1);
    if (nature[2] === k) v = Math.floor(v * 0.9);
    s[k] = v;
  });
  return s;
}

function typeEff(moveType, defTypes) {
  var row = D.TYPE_CHART[moveType] || {}, m = 1;
  defTypes.forEach(function (t) { if (row[t] !== undefined) m *= row[t]; });
  return m;
}

// ── Setup ────────────────────────────────────────────────────────────────
function makeMon(key, level, moveIds, ivs, nature) {
  var sp = D.SPECIES[key];
  var stats = calcStats(sp.base, level, ivs, nature);
  return {
    key: key, species: sp, name: sp.name, level: level, types: sp.types.slice(),
    ivs: ivs, nature: nature, stats: stats,
    hp: stats.hp, maxHP: stats.hp, status: null,
    stages: { atk: 0, def: 0, spa: 0, spd: 0, spe: 0, crit: 0 },
    moves: moveIds.map(function (id) { return { id: id, pp: MOVES[id].pp, maxPP: MOVES[id].pp }; }),
    recharge: false, flinch: false,
    exp: expAt(level),
  };
}

function createBattle(playerKey, oppKey, rng) {
  rng = rng || Math.random;
  var ivs = {};
  ['hp', 'atk', 'def', 'spa', 'spd', 'spe'].forEach(function (k) { ivs[k] = Math.floor(rng() * 32); });
  var nature = D.NATURES[Math.floor(rng() * 25)];
  var nIV = { hp: D.N_IV, atk: D.N_IV, def: D.N_IV, spa: D.N_IV, spd: D.N_IV, spe: D.N_IV };
  var bag = {};
  Object.keys(D.ITEMS).forEach(function (k) { bag[k] = D.ITEMS[k].count; });
  return {
    rng: rng, turn: 0, over: false, result: null,
    player: { mon: makeMon(playerKey, D.PLAYER_LEVEL, D.SETS.player[playerKey], ivs, nature), screens: { reflect: 0, lightscreen: 0 } },
    opp:    { mon: makeMon(oppKey, D.N_LEVEL, D.SETS.n[oppKey], nIV, D.NATURES[0]), screens: { reflect: 0, lightscreen: 0 } },
    bag: bag,
  };
}

// ── Text ─────────────────────────────────────────────────────────────────
function who(side, b) { return (side === 'opp' ? "The foe's " : '') + b[side].mon.name; }
function whoLower(side, b) { return (side === 'opp' ? "the foe's " : '') + b[side].mon.name; }
function other(side) { return side === 'player' ? 'opp' : 'player'; }

// ── Damage ───────────────────────────────────────────────────────────────
// Gen 5 order: base → crit ×2 → random 85–100 → STAB ×1.5 → type → burn → screens.
function damage(b, atkSide, move, power, opts) {
  opts = opts || {};
  var a = b[atkSide].mon, dSide = other(atkSide), d = b[dSide].mon;
  var phys = move.cat === 'physical';
  var aKey = phys ? 'atk' : 'spa', dKey = phys ? 'def' : 'spd';
  var crit = !!opts.crit;
  var aStage = a.stages[aKey], dStage = d.stages[dKey];
  if (crit) { aStage = Math.max(0, aStage); dStage = Math.min(0, dStage); }
  var A = Math.floor(a.stats[aKey] * stageMult(aStage));
  var Dd = Math.floor(d.stats[dKey] * stageMult(dStage));
  var dmg = Math.floor(Math.floor(Math.floor(2 * a.level / 5 + 2) * power * A / Dd) / 50) + 2;
  if (crit) dmg = dmg * 2;
  var roll = opts.roll != null ? opts.roll : 85 + Math.floor(b.rng() * 16);
  dmg = Math.floor(dmg * roll / 100);
  if (a.types.indexOf(move.type) !== -1) dmg = pokeRound(dmg * 1.5);
  var eff = typeEff(move.type, d.types);
  dmg = Math.floor(dmg * eff);
  if (phys && a.status === 'brn') dmg = Math.floor(dmg / 2);
  var screen = b[dSide].screens[phys ? 'reflect' : 'lightscreen'];
  if (screen > 0 && !crit) dmg = pokeRound(dmg * 0.5);
  if (eff > 0) dmg = Math.max(1, dmg);
  return { dmg: dmg, eff: eff, crit: crit };
}

function effSpeed(mon) {
  var s = Math.floor(mon.stats.spe * stageMult(mon.stages.spe));
  if (mon.status === 'par') s = Math.floor(s / 4);
  return s;
}

// ── Actions ──────────────────────────────────────────────────────────────
function useMove(b, side, slot, turnLog, ev) {
  var me = b[side].mon, foeSide = other(side), foe = b[foeSide].mon;

  if (me.recharge) {
    me.recharge = false;
    ev.push({ t: 'msg', text: who(side, b) + ' must recharge!' });
    return;
  }
  if (me.flinch) {
    me.flinch = false;
    ev.push({ t: 'msg', text: who(side, b) + ' flinched and couldn\'t move!' });
    return;
  }
  if (me.status === 'par' && b.rng() < 0.25) {
    ev.push({ t: 'statusAnim', side: side, status: 'par' });
    ev.push({ t: 'msg', text: who(side, b) + ' is paralyzed! It can\'t move!' });
    return;
  }

  var id, mslot = null;
  if (slot === 'struggle') id = 'struggle';
  else { mslot = me.moves[slot]; id = mslot.id; mslot.pp = Math.max(0, mslot.pp - 1); }
  var move = MOVES[id];
  ev.push({ t: 'msg', text: who(side, b) + ' used ' + move.name + '!' });
  if (mslot) ev.push({ t: 'pp', side: side, slot: slot, pp: mslot.pp });

  // Status moves
  if (move.cat === 'status') {
    var key = move.effect, scr = b[side].screens;
    if (scr[key] > 0) { ev.push({ t: 'msg', text: 'But it failed!' }); turnLog.push(id); return; }
    scr[key] = 5;
    ev.push({ t: 'move', side: side, move: id });
    ev.push({ t: 'screen', side: side, kind: key, on: true });
    var stat = key === 'reflect' ? 'Defense' : 'Special Defense';
    var label = key === 'reflect' ? 'Reflect' : 'Light Screen';
    ev.push({ t: 'msg', text: side === 'player'
      ? label + ' raised your team\'s ' + stat + '!'
      : label + ' raised the opposing team\'s ' + stat + '!' });
    turnLog.push(id);
    return;
  }

  // Accuracy (no accuracy or evasion stages exist in this battle)
  if (move.acc && b.rng() * 100 >= move.acc) {
    ev.push({ t: 'msg', text: who(side, b) + '\'s attack missed!' });
    turnLog.push(id);
    return;
  }

  var power = move.pow;
  var fusionBoost = move.effect === 'fusion' && turnLog.length && turnLog[turnLog.length - 1] === move.partner;
  if (fusionBoost) power *= 2;

  var stage = Math.min(4, me.stages.crit + (move.crit || 0));
  var crit = b.rng() < CRIT_RATE[stage];
  var r = damage(b, side, move, power, { crit: crit });
  var from = foe.hp;
  foe.hp = Math.max(0, foe.hp - r.dmg);

  ev.push({ t: 'move', side: side, move: id, boosted: fusionBoost });
  ev.push({ t: 'hit', side: foeSide, eff: r.eff, crit: r.crit });
  ev.push({ t: 'hp', side: foeSide, from: from, to: foe.hp });
  if (r.crit) ev.push({ t: 'msg', text: 'A critical hit!' });
  if (r.eff > 1) ev.push({ t: 'msg', text: 'It\'s super effective!' });
  else if (r.eff < 1 && r.eff > 0) ev.push({ t: 'msg', text: 'It\'s not very effective...' });
  turnLog.push(id);

  if (move.effect === 'recharge') me.recharge = true;
  if (move.effect === 'struggle') {
    var recoil = Math.max(1, Math.floor(me.maxHP / 4)), mf = me.hp;
    me.hp = Math.max(0, me.hp - recoil);
    ev.push({ t: 'hp', side: side, from: mf, to: me.hp });
    ev.push({ t: 'msg', text: who(side, b) + ' is damaged by recoil!' });
  }

  if (foe.hp > 0) {
    if (move.effect === 'para30' && !foe.status && b.rng() < 0.3) {
      foe.status = 'par';
      ev.push({ t: 'status', side: foeSide, status: 'par' });
      ev.push({ t: 'msg', text: who(foeSide, b) + ' is paralyzed! It may be unable to move!' });
    }
    var fl = move.effect === 'flinch10' ? 0.1 : move.effect === 'flinch20' ? 0.2 : 0;
    if (fl && b.rng() < fl) foe.flinch = true;
  }
}

function useItem(b, id, ev) {
  var it = D.ITEMS[id], me = b.player.mon;
  b.bag[id] = Math.max(0, b.bag[id] - 1);
  if (it.kind === 'ball') {
    ev.push({ t: 'ball' });
    ev.push({ t: 'msg', text: 'The Trainer blocked the ball!' });
    ev.push({ t: 'msg', text: 'Don\'t be a thief!' });
    return;
  }
  ev.push({ t: 'msg', text: D.PLAYER + ' used the ' + it.name + '.' });
  ev.push({ t: 'item', id: id });
  if (it.kind === 'heal') {
    var from = me.hp;
    me.hp = Math.min(me.maxHP, me.hp + it.amount);
    ev.push({ t: 'hp', side: 'player', from: from, to: me.hp, heal: true });
    ev.push({ t: 'msg', text: me.name + '\'s HP was restored.' });
    if (it.cure && me.status) {
      me.status = null;
      ev.push({ t: 'status', side: 'player', status: null });
    }
  } else if (it.kind === 'cure') {
    me.status = null;
    ev.push({ t: 'status', side: 'player', status: null });
    ev.push({ t: 'msg', text: me.name + ' was cured of paralysis.' });
  } else if (it.kind === 'stat') {
    me.stages[it.stat] = Math.min(6, me.stages[it.stat] + 1);
    ev.push({ t: 'stat', side: 'player', stat: it.stat, up: true });
    ev.push({ t: 'msg', text: me.name + '\'s ' + D.STAT_NAMES[it.stat] + ' rose!' });
  } else if (it.kind === 'crit') {
    me.stages.crit = Math.min(4, me.stages.crit + 2);
    ev.push({ t: 'stat', side: 'player', stat: 'crit', up: true });
    ev.push({ t: 'msg', text: me.name + ' is getting pumped!' });
  }
}

// Which items would do nothing right now (the game refuses them without spending a turn).
function itemUsable(b, id) {
  var it = D.ITEMS[id], me = b.player.mon;
  if (!b.bag[id]) return false;
  if (it.kind === 'heal') return me.hp < me.maxHP || (it.cure && !!me.status);
  if (it.kind === 'revive') return false;
  if (it.kind === 'cure') return !!me.status;
  if (it.kind === 'stat') return me.stages[it.stat] < 6;
  if (it.kind === 'crit') return me.stages.crit < 2;
  return true; // balls: always "usable" — N blocks them
}

// ── N's AI ───────────────────────────────────────────────────────────────
function aiChoose(b) {
  var me = b.opp.mon, foe = b.player.mon;
  if (me.recharge) return 0;
  var usable = me.moves.map(function (m, i) { return m.pp > 0 ? i : -1; }).filter(function (i) { return i >= 0; });
  if (!usable.length) return 'struggle';

  // Expected damage per move, at an average roll and no crit
  var scored = usable.map(function (i) {
    var mv = MOVES[me.moves[i].id], score;
    if (mv.cat === 'status') {
      var up = b.opp.screens[mv.effect] > 0;
      // Put the screen up early if it blocks the side your moves hit hardest
      var guards = mv.effect === 'reflect' ? 'physical' : 'special';
      var foeUses = foe.moves.filter(function (m) { return MOVES[m.id].cat === guards && m.pp > 0; }).length;
      score = (up || me.hp < me.maxHP * 0.4 || foeUses < 2) ? -1 : 55 + b.rng() * 30;
      return { i: i, score: score };
    }
    var r = damage(b, 'opp', mv, mv.pow, { roll: 92 });
    var expected = r.dmg * (mv.acc || 100) / 100;
    score = expected / foe.hp * 100;
    if (mv.effect === 'recharge' && r.dmg < foe.hp) score *= 0.35; // Hyper Beam / Giga Impact only to finish
    if (r.dmg >= foe.hp) score += 100;
    return { i: i, score: score * (0.85 + b.rng() * 0.3) };
  });
  scored.sort(function (x, y) { return y.score - x.score; });
  return scored[0].i;
}

// ── Turn ─────────────────────────────────────────────────────────────────
// action: { type: 'move', slot } | { type: 'item', id }
function runTurn(b, action) {
  var ev = [], log = [];
  if (b.over) return ev;
  b.turn++;
  var pm = b.player.mon, om = b.opp.mon;

  var pAct = action;
  if (pm.recharge) pAct = { type: 'move', slot: 0 };
  var oSlot = aiChoose(b);

  // Items go before moves; between moves, faster first, ties random.
  var order;
  if (pAct.type === 'item') order = ['player', 'opp'];
  else {
    var ps = effSpeed(pm), os = effSpeed(om);
    order = ps > os || (ps === os && b.rng() < 0.5) ? ['player', 'opp'] : ['opp', 'player'];
  }

  for (var k = 0; k < order.length; k++) {
    var side = order[k];
    if (b[side].mon.hp <= 0) continue;
    if (side === 'player') {
      if (pAct.type === 'item') useItem(b, pAct.id, ev);
      else useMove(b, 'player', pAct.slot, log, ev);
    } else useMove(b, 'opp', oSlot, log, ev);
    if (checkFaint(b, ev)) return ev;
  }

  // End of turn: flinch never carries over; screens count down.
  pm.flinch = false; om.flinch = false;
  ['player', 'opp'].forEach(function (s) {
    ['reflect', 'lightscreen'].forEach(function (kind) {
      var sc = b[s].screens;
      if (sc[kind] > 0 && --sc[kind] === 0) {
        var label = kind === 'reflect' ? 'Reflect' : 'Light Screen';
        ev.push({ t: 'screen', side: s, kind: kind, on: false });
        ev.push({ t: 'msg', text: (s === 'player' ? 'Your team\'s ' : 'The opposing team\'s ') + label + ' wore off!' });
      }
    });
  });
  return ev;
}

function checkFaint(b, ev) {
  var pm = b.player.mon, om = b.opp.mon;
  if (om.hp <= 0) {
    ev.push({ t: 'faint', side: 'opp' });
    ev.push({ t: 'msg', text: 'The foe\'s ' + om.name + ' fainted!' });
    var gain = expGain(om, pm);
    var from = pm.exp, fromLv = pm.level;
    pm.exp += gain;
    while (pm.level < 100 && pm.exp >= expAt(pm.level + 1)) pm.level++;
    ev.push({ t: 'msg', text: pm.name + ' gained ' + gain.toLocaleString('en-US') + ' Exp. Points!' });
    ev.push({ t: 'exp', from: from, to: pm.exp, fromLevel: fromLv, toLevel: pm.level });
    if (pm.level > fromLv) ev.push({ t: 'msg', text: pm.name + ' grew to Lv. ' + pm.level + '!' });
    if (pm.hp <= 0) ev.push({ t: 'faint', side: 'player' });
    ev.push({ t: 'trainerIn' });
    ev.push({ t: 'msg', text: D.PLAYER + ' defeated ' + D.RIVAL + '!' });
    b.over = true; b.result = 'win';
    ev.push({ t: 'end', result: 'win' });
    return true;
  }
  if (pm.hp <= 0) {
    ev.push({ t: 'faint', side: 'player' });
    ev.push({ t: 'msg', text: pm.name + ' fainted!' });
    ev.push({ t: 'trainerIn' });
    ev.push({ t: 'msg', text: D.PLAYER + ' lost against ' + D.RIVAL + '!' });
    ev.push({ t: 'msg', text: D.PLAYER + ' blacked out!' });
    b.over = true; b.result = 'lose';
    ev.push({ t: 'end', result: 'lose' });
    return true;
  }
  return false;
}

// Gen 5 scaled formula: trainer battle ×1.5, levels weigh in.
function expGain(fainted, winner) {
  var a = 1.5, base = fainted.species.baseExp, L = fainted.level, Lp = winner.level;
  var v = (a * base * L / 5) * Math.pow(2 * L + 10, 2.5) / Math.pow(L + Lp + 10, 2.5);
  return Math.floor(v) + 1;
}

function allOutOfPP(mon) { return mon.moves.every(function (m) { return m.pp <= 0; }); }

root.PB.engine = {
  createBattle: createBattle, runTurn: runTurn, itemUsable: itemUsable, allOutOfPP: allOutOfPP,
  calcStats: calcStats, damage: damage, typeEff: typeEff, expAt: expAt, expGain: expGain,
  who: who, whoLower: whoLower, aiChoose: aiChoose,
};
})(typeof window !== 'undefined' ? window : globalThis);
