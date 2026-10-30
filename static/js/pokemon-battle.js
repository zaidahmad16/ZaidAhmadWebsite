/* pokemon-battle.js — the Pokémon Black/White easter egg: the final battle against N at N's Castle.
   Started from the terminal (`pokemon`, `sudo apt install pokemon`). The rules live in pb/engine.js,
   the top screen in pb/scene.js, the touch screen in pb/menu.js, effects in pb/fx.js, sound in pb/audio.js. */
(function () {
'use strict';

var DS_W = 256, DS_H = 192, GAP = 10;
var running = null; // { overlay, battle, token }

var sleep = function (ms) { return new Promise(function (r) { setTimeout(r, ms); }); };
function alive(tok) { return running && running.token === tok; }

// Pixel font is only fetched when someone actually starts a battle.
function loadFont() {
  if (!document.getElementById('pb-font')) {
    var l = document.createElement('link');
    l.id = 'pb-font'; l.rel = 'stylesheet';
    l.href = 'https://fonts.googleapis.com/css2?family=Tiny5&display=swap';
    document.head.appendChild(l);
  }
  if (!document.fonts || !document.fonts.load) return Promise.resolve();
  return Promise.race([document.fonts.load('12px "Tiny5"'), sleep(1500)]).catch(function () {});
}

// ── DS frame ─────────────────────────────────────────────────────────────
function buildFrame() {
  var ov = document.createElement('div');
  ov.className = 'pb-overlay'; ov.id = 'pb-overlay';
  ov.setAttribute('role', 'dialog'); ov.setAttribute('aria-label', 'Pokémon battle against N');

  var bar = PB.scene.el('div', 'pb-topbar', ov);
  var mute = PB.scene.el('button', 'pb-chrome-btn', bar, PB.audio.isMuted() ? 'sound off' : 'sound on');
  mute.type = 'button';
  mute.addEventListener('click', function () {
    PB.audio.setMuted(!PB.audio.isMuted());
    mute.textContent = PB.audio.isMuted() ? 'sound off' : 'sound on';
    if (!PB.audio.isMuted() && running && running.battle) {
      var pm = running.battle.player.mon;
      PB.audio.setAlarm(pm.hp > 0 && pm.hp / pm.maxHP <= 0.2 && !running.battle.over);
    }
  });
  var help = PB.scene.el('span', 'pb-keys', bar, 'arrows · Z/Enter = A · X = B');
  help.setAttribute('aria-hidden', 'true');
  var close = PB.scene.el('button', 'pb-chrome-btn', bar, 'esc ×');
  close.type = 'button'; close.setAttribute('aria-label', 'Close battle');
  close.addEventListener('click', closeBattle);

  var stage = PB.scene.el('div', 'pb-stage', ov);
  var ds = PB.scene.el('div', 'pb-ds', stage);
  var top = PB.scene.el('div', 'pb-screen pb-top', ds);
  var bot = PB.scene.el('div', 'pb-screen pb-bot', ds);
  var wipe = PB.scene.el('div', 'pb-wipe', ds);
  for (var i = 0; i < 8; i++) PB.scene.el('span', 'pb-wipe-bar', wipe);

  document.body.appendChild(ov);
  var refs = { overlay: ov, stage: stage, ds: ds, top: top, bot: bot, wipe: wipe };
  layout(refs);
  refs.onResize = function () { layout(refs); };
  window.addEventListener('resize', refs.onResize);
  return refs;
}

// Stack the screens like a DS, or side by side when that makes them clearly bigger.
function layout(r) {
  var vw = window.innerWidth, vh = window.innerHeight - 44, pad = vw < 520 ? 8 : 24;
  var kV = Math.min((vw - pad * 2) / DS_W, (vh - pad) / (DS_H * 2 + GAP));
  var kH = Math.min((vw - pad * 2) / (DS_W * 2 + GAP), (vh - pad) / DS_H);
  var horiz = kH > kV * 1.2;
  var k = horiz ? kH : kV;
  k = k >= 2 ? Math.floor(k * 4) / 4 : Math.floor(k * 20) / 20;
  var w = horiz ? DS_W * 2 + GAP : DS_W, h = horiz ? DS_H : DS_H * 2 + GAP;
  r.ds.classList.toggle('pb-horiz', horiz);
  r.ds.style.transform = 'scale(' + k + ')';
  r.stage.style.width = (w * k) + 'px';
  r.stage.style.height = (h * k) + 'px';
}

// BW trainer-battle intro: bars sweep across both screens, then open on the scene.
function wipe(r, closing) {
  var bars = r.wipe.querySelectorAll('.pb-wipe-bar');
  r.wipe.classList.add('on');
  var all = Array.prototype.map.call(bars, function (b, i) {
    var dir = i % 2 ? 1 : -1;
    var kf = closing
      ? [{ transform: 'translateX(' + dir * 110 + '%)' }, { transform: 'translateX(0)' }]
      : [{ transform: 'translateX(0)' }, { transform: 'translateX(' + -dir * 110 + '%)' }];
    return PB.scene.anim(b, kf, { duration: 380, delay: i * 45, easing: closing ? 'ease-out' : 'ease-in' });
  });
  return Promise.all(all).then(function () { if (!closing) r.wipe.classList.remove('on'); });
}

// ── Event playback ───────────────────────────────────────────────────────
function shotFor(side) { return side === 'opp' ? 'opp' : 'player'; }

function throwBlockedBall() {
  var s = PB.scene.get(); if (!s) return Promise.resolve();
  var p = PB.scene.POS.opp;
  var ball = PB.scene.el('img', 'pb-px pb-ball', s.fxLayer);
  ball.src = PB.data.BALL_SPRITE; ball.alt = '';
  PB.audio.play('throwBall');
  return PB.scene.anim(ball, [
    { transform: 'translate(-40px,150px) rotate(0deg)' },
    { transform: 'translate(' + (p.x - 60) + 'px,' + (p.y - 100) + 'px) rotate(540deg)', offset: 0.55 },
    { transform: 'translate(' + (p.x - 30) + 'px,' + (p.y - 60) + 'px) rotate(700deg)', offset: 0.7 },
    { transform: 'translate(' + (p.x - 90) + 'px,' + (p.y + 40) + 'px) rotate(900deg)', opacity: 0 },
  ], { duration: 900, easing: 'linear' }).then(function () {
    PB.audio.play('hit', 0.5);
    ball.remove();
  });
}

function playEvents(evs, tok) {
  var chain = Promise.resolve();
  evs.forEach(function (e, i) {
    chain = chain.then(function () {
      if (!alive(tok)) return;
      switch (e.t) {
        case 'msg':
          // "X used Y!" stays up while the move plays, as in the game
          if (evs[i + 1] && (evs[i + 1].t === 'move' || evs[i + 1].t === 'pp')) {
            return PB.scene.say(e.text, { keep: true }).then(function () { return sleep(300); });
          }
          return PB.scene.say(e.text, { hold: 850 });
        case 'move':
          PB.scene.setIdle(false);
          return PB.scene.shot(shotFor(e.side), 360).then(function () {
            PB.scene.shot('both', 700);
            return PB.fx.play(e.move, e.side, e.boosted);
          });
        case 'hit':
          PB.audio.play('hit', e.eff);
          PB.scene.shot(shotFor(e.side), 260);
          if (e.eff > 1 || e.crit) PB.scene.jolt(e.eff > 1 ? 4 : 2);
          return PB.scene.blink(e.side);
        case 'hp':
          return (e.heal ? PB.fx.healSparkle('player') : Promise.resolve()).then(function () {
            return PB.scene.drainHp(e.side, e.to);
          });
        case 'status':
          PB.scene.setStatus(e.side, e.status);
          return e.status === 'par' ? PB.fx.paraSparks(e.side) : null;
        case 'statusAnim': return PB.fx.paraSparks(e.side);
        case 'stat': return PB.fx.statRise(e.side);
        case 'screen': PB.scene.wall(e.side, e.kind, e.on); return null;
        case 'ball': return throwBlockedBall();
        case 'faint':
          if (e.side === 'player') PB.audio.setAlarm(false);
          PB.scene.showHud(e.side, false);
          return PB.scene.shot(shotFor(e.side), 400).then(function () { return PB.scene.faint(e.side); });
        case 'exp': return playExp(e);
        case 'trainerIn':
          PB.scene.setIdle(false);
          return PB.scene.shot('wide', 500).then(function () { return PB.scene.trainer(true); });
        case 'end': return finale(e.result, tok);
      }
    });
  });
  return chain;
}

function expFrac(exp, level) {
  var a = PB.engine.expAt(level), z = PB.engine.expAt(level + 1);
  return Math.max(0, Math.min(1, (exp - a) / (z - a)));
}
function playExp(e) {
  var chain = Promise.resolve(), lv = e.fromLevel, from = expFrac(e.from, lv);
  while (lv < e.toLevel) {
    (function (f, l) {
      chain = chain.then(function () { return PB.scene.fillExp(f, 1, 900); }).then(function () {
        PB.audio.play('levelUp'); PB.scene.setLevel(l + 1); PB.scene.setExp(0);
      });
    })(from, lv);
    lv++; from = 0;
  }
  var to = expFrac(e.to, e.toLevel), f0 = from;
  return chain.then(function () { return PB.scene.fillExp(f0, to, 1200); });
}

function finale(result, tok) {
  PB.audio.fadeMusic(2200);
  var r = running;
  return sleep(1400).then(function () {
    if (!alive(tok)) return;
    return wipe(r, true);
  }).then(function () {
    if (!alive(tok)) return;
    r.wipe.classList.add('pb-closed');
    var card = PB.scene.el('div', 'pb-endcard', r.ds);
    PB.scene.el('div', 'pb-endcard-title', card, result === 'win' ? 'You defeated N!' : 'You blacked out!');
    PB.scene.el('div', 'pb-endcard-sub', card, result === 'win'
      ? 'The battle at N’s Castle is over.'
      : 'N’s ' + running.battle.opp.mon.name + ' was too strong this time.');
    var again = PB.scene.el('button', 'pb-chrome-btn pb-again', card, 'battle again');
    again.type = 'button';
    again.addEventListener('click', function () { closeBattle(); startBattle(); });
    var bye = PB.scene.el('button', 'pb-chrome-btn pb-again', card, 'close');
    bye.type = 'button';
    bye.addEventListener('click', closeBattle);
    again.focus({ preventScroll: true });
  });
}

// ── Flow ─────────────────────────────────────────────────────────────────
function run(tok) {
  var b = running.battle, r = running, pm = b.player.mon, om = b.opp.mon;
  r.wipe.classList.add('on');
  return loadFont().then(function () {
    if (!alive(tok)) return;
    PB.audio.startMusic();
    return wipe(r, false);
  }).then(function () {
    if (!alive(tok)) return;
    PB.scene.setIdle(false);
    return PB.scene.shot('oppIn', 0);
  }).then(function () {
    if (!alive(tok)) return;
    return PB.scene.trainer(true, 700);
  }).then(function () {
    if (!alive(tok)) return;
    PB.scene.shot('opp', 900);
    return PB.scene.say('You are challenged by ' + PB.data.RIVAL + '!', { hold: 1300 });
  }).then(function () {
    if (!alive(tok)) return;
    PB.scene.trainer(false);
    PB.scene.say(PB.data.RIVAL + ' sent out ' + om.name + '!', { keep: true });
    return sleep(250).then(function () { return PB.scene.sendOut('opp'); });
  }).then(function () {
    if (!alive(tok)) return;
    PB.audio.cry(om.species.cry);
    PB.scene.showHud('opp', true);
    return sleep(900);
  }).then(function () {
    if (!alive(tok)) return;
    PB.scene.shot('playerIn', 700);
    PB.scene.say('Go! ' + pm.name + '!', { keep: true });
    return sleep(350).then(function () { return PB.scene.sendOut('player'); });
  }).then(function () {
    if (!alive(tok)) return;
    PB.audio.cry(pm.species.cry);
    PB.scene.showHud('player', true);
    return sleep(900);
  }).then(function () {
    if (!alive(tok)) return;
    // Turboblaze / Teravolt announce themselves when they enter, faster Pokémon first
    PB.scene.shot('opp', 500);
    return PB.scene.say(PB.engine.who('opp', b) + ' is radiating ' + om.species.aura, { hold: 1000 });
  }).then(function () {
    if (!alive(tok)) return;
    PB.scene.shot('player', 500);
    return PB.scene.say(PB.engine.who('player', b) + ' is radiating ' + pm.species.aura, { hold: 1000 });
  }).then(function () { return turnLoop(tok); });
}

function turnLoop(tok) {
  if (!alive(tok)) return Promise.resolve();
  var b = running.battle;
  if (b.over) return Promise.resolve();
  PB.scene.shot('wide', 600);
  PB.scene.setIdle(true);
  var pick = b.player.mon.recharge ? Promise.resolve({ type: 'move', slot: 0 }) : PB.menu.choose();
  return pick.then(function (action) {
    if (!alive(tok)) return;
    PB.menu.idle();
    var evs = PB.engine.runTurn(b, action);
    return playEvents(evs, tok);
  }).then(function () { return turnLoop(tok); });
}

// ── Start / close ────────────────────────────────────────────────────────
function startBattle() {
  if (running || !window.PB || !PB.engine) return;
  var dark = document.documentElement.getAttribute('data-theme') === 'dark';
  var pKey = dark ? 'zekrom' : 'reshiram', oKey = dark ? 'reshiram' : 'zekrom';
  if (document.activeElement && document.activeElement.blur) document.activeElement.blur();
  var battle = PB.engine.createBattle(pKey, oKey);
  var refs = buildFrame();
  running = Object.assign(refs, { battle: battle, token: {} });
  document.documentElement.classList.add('pb-battle-active');
  PB.scene.build(refs.top, battle);
  PB.menu.build(refs.bot, battle);
  PB.audio.preload(battle.opp.mon.species.cry);
  PB.audio.preload(battle.player.mon.species.cry);
  run(running.token).catch(function (err) { if (window.console) console.error('[pokemon-battle]', err); });
}

function closeBattle() {
  if (!running) return;
  var r = running;
  running = null;
  window.removeEventListener('resize', r.onResize);
  PB.audio.stopAll();
  PB.menu.destroy();
  PB.fx.reset();
  PB.scene.destroy();
  if (r.overlay) r.overlay.remove();
  document.documentElement.classList.remove('pb-battle-active');
}

function initPokemonBattle() {
  document.addEventListener('keydown', function (e) { if (e.key === 'Escape' && running) closeBattle(); });
}
window.initPokemonBattle = initPokemonBattle;
window.startPokemonBattle = startBattle;
})();
