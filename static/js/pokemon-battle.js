/* pokemon-battle.js — Gen 5 battle easter egg */
(function () {
'use strict';

// ── Pokemon data ───────────────────────────────────────────────────────────

const POKEMON = {
  reshiram: {
    id: 643,
    name: 'RESHIRAM', hp: 100, atk: 120, def: 100, spAtk: 150, spDef: 120, speed: 90,
    front: 'https://raw.githubusercontent.com/PokeAPI/sprites/master/sprites/pokemon/versions/generation-v/black-white/animated/643.gif',
    back:  'https://raw.githubusercontent.com/PokeAPI/sprites/master/sprites/pokemon/versions/generation-v/black-white/animated/back/643.gif',
    artwork: 'https://raw.githubusercontent.com/PokeAPI/sprites/master/sprites/pokemon/other/official-artwork/643.png',
    icon: 'https://raw.githubusercontent.com/PokeAPI/sprites/master/sprites/pokemon/643.png',
    types: ['dragon','fire'],
    moves: [
      { name:'Blue Flare',   type:'fire',    cat:'special',  pow:130, acc:85,  pp:5,  effect:'burn20'     },
      { name:'Draco Meteor', type:'dragon',  cat:'special',  pow:130, acc:90,  pp:5,  effect:'spa_drop'   },
      { name:'Earth Power',  type:'ground',  cat:'special',  pow:90,  acc:100, pp:10, effect:'spdef10'    },
      { name:'Fusion Flare', type:'fire',    cat:'special',  pow:100, acc:100, pp:5,  effect:'fusion',    fusionPartner:'Fusion Bolt' },
    ],
  },
  zekrom: {
    id: 644,
    name: 'ZEKROM', hp: 100, atk: 150, def: 120, spAtk: 120, spDef: 100, speed: 90,
    front: 'https://raw.githubusercontent.com/PokeAPI/sprites/master/sprites/pokemon/versions/generation-v/black-white/animated/644.gif',
    back:  'https://raw.githubusercontent.com/PokeAPI/sprites/master/sprites/pokemon/versions/generation-v/black-white/animated/back/644.gif',
    artwork: 'https://raw.githubusercontent.com/PokeAPI/sprites/master/sprites/pokemon/other/official-artwork/644.png',
    icon: 'https://raw.githubusercontent.com/PokeAPI/sprites/master/sprites/pokemon/644.png',
    types: ['dragon','electric'],
    moves: [
      { name:'Bolt Strike',  type:'electric', cat:'physical', pow:130, acc:85,  pp:5,  effect:'para20'     },
      { name:'Outrage',      type:'dragon',   cat:'physical', pow:120, acc:100, pp:10, effect:'outrage'    },
      { name:'Rock Slide',   type:'rock',     cat:'physical', pow:75,  acc:90,  pp:10, effect:'flinch30'   },
      { name:'Fusion Bolt',  type:'electric', cat:'physical', pow:100, acc:100, pp:5,  effect:'fusion',    fusionPartner:'Fusion Flare' },
    ],
  },
};

// move type → defending type → multiplier
const TYPE_CHART = {
  dragon:   { dragon:2 },
  fire:     { dragon:0.5, rock:0.5 },
  electric: { dragon:0.5 },
  ground:   { electric:2 },
  rock:     { fire:2 },
};

function typeMultiplier(moveType, defenderKey) {
  const defTypes = POKEMON[defenderKey].types;
  let m = 1;
  const row = TYPE_CHART[moveType] || {};
  for (const t of defTypes) if (row[t] !== undefined) m *= row[t];
  return m;
}

// ── State ──────────────────────────────────────────────────────────────────

let S = null; // battle state
let R = {};   // ui refs

function makeMon(key) {
  const d = POKEMON[key];
  return {
    key, name: d.name,
    maxHP: d.hp, hp: d.hp,
    atk: d.atk, def: d.def, spAtk: d.spAtk, spDef: d.spDef, speed: d.speed,
    moves: d.moves.map(m => ({ ...m, curPP: m.pp })),
    status: null,  // 'burn' | 'para' | 'conf'
    spAtkMod: 0,   // -2 per Draco Meteor
    outrageTurns: 0,
    outrageIdx: null,
    outrageUsed: 0,
    flinched: false,
  };
}

function initState(playerKey, oppKey) {
  S = {
    player: makeMon(playerKey),
    opp:    makeMon(oppKey),
    lastPlayerMove: null,
    lastOppMove:    null,
    over: false,
  };
}

// ── Utilities ──────────────────────────────────────────────────────────────

const sleep = ms => new Promise(r => setTimeout(r, ms));

async function typeText(text, speed = 26) {
  R.log.textContent = '';
  for (const ch of text) { R.log.textContent += ch; await sleep(speed); }
}

function updateBar(side) {
  const mon = S[side];
  const pct = Math.max(0, mon.hp / mon.maxHP * 100);
  const fill = R[side + 'Fill'];
  const nums = R[side + 'Nums'];
  fill.style.width = pct + '%';
  fill.className = 'pb-hp-fill' + (pct <= 25 ? ' pb-red' : pct <= 50 ? ' pb-yellow' : '');
  if (nums) nums.textContent = Math.max(0, Math.round(mon.hp)) + '/' + mon.maxHP;
}

function showStatus(side, st) {
  S[side].status = st;
  const el = R[side + 'Status'];
  if (!el) return;
  el.textContent = st === 'burn' ? 'BRN' : st === 'para' ? 'PAR' : st === 'conf' ? 'CNF' : '';
  el.className = 'pb-status-icon' + (st ? ' pb-st-' + st : '');
}

async function shakePanel(strong) {
  R.panel.classList.remove('pb-shake','pb-shake-strong');
  void R.panel.offsetWidth;
  R.panel.classList.add(strong ? 'pb-shake-strong' : 'pb-shake');
  await sleep(320);
}

async function flashSprite(side, times = 3) {
  const img = side === 'opp' ? R.oppSprite : R.playerSprite;
  for (let i = 0; i < times; i++) {
    img.style.filter = 'brightness(10) sepia(1) hue-rotate(0deg)';
    await sleep(75);
    img.style.filter = '';
    await sleep(75);
  }
}

function showDamageNum(side, dmg, mult) {
  const bar = side === 'opp' ? R.oppFill : R.playerFill;
  if (!bar) return;
  const br = bar.getBoundingClientRect();
  const pbr = R.panel.getBoundingClientRect();
  const el = document.createElement('div');
  el.className = 'pb-dmg-num' + (mult >= 2 ? ' pb-dmg-super' : mult < 1 ? ' pb-dmg-weak' : '');
  el.textContent = '-' + dmg;
  el.style.left = (br.left - pbr.left + br.width / 2 - 20) + 'px';
  el.style.top  = (br.top  - pbr.top  - 10) + 'px';
  R.panel.appendChild(el);
  setTimeout(() => el.remove(), 1200);
}

function tmp(styles) {
  const d = document.createElement('div');
  Object.assign(d.style, { position:'absolute', pointerEvents:'none', zIndex:'6', ...styles });
  return d;
}

async function lunge(side, dist = 40) {
  const img = side === 'player' ? R.playerSprite : R.oppSprite;
  const dx = side === 'player' ? dist : -dist;
  img.style.transition = 'transform .12s ease';
  img.style.transform = `translateX(${dx}px)`;
  await sleep(140);
  img.style.transform = '';
  await sleep(110);
  img.style.transition = '';
}

// Returns sprite center coords relative to the battle area element
function sc(side) {
  const img = side === 'opp' ? R.oppSprite : R.playerSprite;
  const ir = img.getBoundingClientRect();
  const br = R.ba.getBoundingClientRect();
  return {
    x: ir.left - br.left + ir.width  / 2,
    y: ir.top  - br.top  + ir.height / 2,
    w: ir.width, h: ir.height,
  };
}

// ── Canvas / Particle system ──────────────────────────────────────────────

let _bgCanvas = null, _bgCtx = null, _bgRaf = null, _bgParts = [], _bgPlayerKey = null;
let _fxCanvas = null, _fxCtx = null, _fxRaf = null, _fxParts = [];

function _mkBgPart(W, H) {
  return {
    x: Math.random() * W, y: H * 0.25 + Math.random() * H * 0.55,
    vx: (Math.random() - 0.5) * 0.22, vy: -(0.08 + Math.random() * 0.2),
    size: 0.5 + Math.random() * 1.3, alpha: 0.05 + Math.random() * 0.12,
    blue: Math.random() < 0.55,
  };
}

function initBgCanvas(playerKey) {
  _bgPlayerKey = playerKey;
  _bgCanvas = document.createElement('canvas');
  _bgCanvas.style.cssText = 'position:absolute;inset:0;width:100%;height:100%;pointer-events:none;z-index:0;display:block;';
  R.ba.prepend(_bgCanvas);
  _bgCanvas.width  = R.ba.clientWidth  || 800;
  _bgCanvas.height = R.ba.clientHeight || 480;
  _bgCtx = _bgCanvas.getContext('2d');
  _bgParts = Array.from({length: 38}, () => _mkBgPart(_bgCanvas.width, _bgCanvas.height));
  _drawBg();
}

function _drawBg() {
  if (!_bgCtx) return;
  const ctx = _bgCtx, W = _bgCanvas.width, H = _bgCanvas.height;
  const groundY = H * 0.60;

  // Sky gradient
  const sky = ctx.createLinearGradient(0, 0, 0, H);
  sky.addColorStop(0, '#04070e'); sky.addColorStop(0.55, '#080d18'); sky.addColorStop(1, '#0c1220');
  ctx.fillStyle = sky; ctx.fillRect(0, 0, W, H);

  // Ground plane
  const grd = ctx.createLinearGradient(0, groundY, 0, H);
  grd.addColorStop(0, '#101520'); grd.addColorStop(1, '#080c14');
  ctx.fillStyle = grd; ctx.fillRect(0, groundY, W, H);

  // Perspective grid
  ctx.save(); ctx.globalAlpha = 0.055; ctx.strokeStyle = '#4a70aa'; ctx.lineWidth = 0.6;
  const vx = W / 2;
  for (let i = 0; i <= 12; i++) {
    const bx = (i / 12) * W;
    ctx.beginPath(); ctx.moveTo(vx, groundY); ctx.lineTo(bx, H); ctx.stroke();
  }
  for (let r = 0; r < 5; r++) {
    const y = groundY + (H - groundY) * Math.pow((r + 1) / 5, 1.6);
    ctx.beginPath(); ctx.moveTo(0, y); ctx.lineTo(W, y); ctx.stroke();
  }
  ctx.restore();

  // Horizon glow line
  ctx.save();
  ctx.shadowColor = '#2a5090'; ctx.shadowBlur = 22;
  ctx.strokeStyle = 'rgba(60,100,180,0.28)'; ctx.lineWidth = 1;
  ctx.beginPath(); ctx.moveTo(0, groundY); ctx.lineTo(W, groundY); ctx.stroke();
  ctx.restore();

  // Player (left) ambient glow
  const plColor = _bgPlayerKey === 'zekrom' ? [91, 154, 245] : [245, 125, 50];
  const pg = ctx.createRadialGradient(W * 0.30, H * 0.80, 5, W * 0.30, H * 0.80, 210);
  pg.addColorStop(0, `rgba(${plColor},0.09)`); pg.addColorStop(1, 'transparent');
  ctx.fillStyle = pg; ctx.fillRect(0, H * 0.4, W * 0.72, H);

  // Opponent (right) ambient glow
  const opColor = _bgPlayerKey === 'zekrom' ? [245, 125, 50] : [91, 154, 245];
  const og = ctx.createRadialGradient(W * 0.74, H * 0.40, 5, W * 0.74, H * 0.40, 170);
  og.addColorStop(0, `rgba(${opColor},0.08)`); og.addColorStop(1, 'transparent');
  ctx.fillStyle = og; ctx.fillRect(W * 0.38, 0, W, H * 0.78);

  // Floating dust particles
  _bgParts.forEach(p => {
    p.x += p.vx; p.y += p.vy;
    if (p.y < groundY * 0.08) Object.assign(p, _mkBgPart(W, H));
    if (p.x < -2 || p.x > W + 2) p.x = Math.random() * W;
    ctx.save();
    ctx.globalAlpha = p.alpha;
    ctx.fillStyle   = p.blue ? '#7aacf8' : '#f0a060';
    ctx.shadowColor = p.blue ? '#5a90e8' : '#e08840';
    ctx.shadowBlur  = 3;
    ctx.beginPath(); ctx.arc(p.x, p.y, p.size, 0, Math.PI * 2); ctx.fill();
    ctx.restore();
  });

  _bgRaf = requestAnimationFrame(_drawBg);
}

function stopBgCanvas() {
  if (_bgRaf) { cancelAnimationFrame(_bgRaf); _bgRaf = null; }
  _bgCanvas = null; _bgCtx = null; _bgParts = [];
}

// FX canvas — particle effects layer (z-index 7, above sprites)
function initFxCanvas() {
  if (_fxCanvas) return;
  _fxCanvas = document.createElement('canvas');
  _fxCanvas.style.cssText = 'position:absolute;inset:0;width:100%;height:100%;pointer-events:none;z-index:7;display:block;';
  R.ba.appendChild(_fxCanvas);
  _fxCanvas.width  = R.ba.clientWidth  || 800;
  _fxCanvas.height = R.ba.clientHeight || 480;
  _fxCtx = _fxCanvas.getContext('2d');
  _fxLoop();
}

function stopFxCanvas() {
  if (_fxRaf) { cancelAnimationFrame(_fxRaf); _fxRaf = null; }
  _fxCanvas = null; _fxCtx = null; _fxParts = [];
}

function fx(cfg) {
  if (!_fxCanvas) return;
  _fxParts.push({
    x: cfg.x, y: cfg.y, vx: cfg.vx ?? 0, vy: cfg.vy ?? 0,
    size: cfg.size ?? 4, color: cfg.color ?? '#fff', glow: cfg.glow ?? 0,
    decay: cfg.decay ?? 0.04, gravity: cfg.gravity ?? 0.07, drag: cfg.drag ?? 0.97, life: 1,
  });
}

function fxBurst(cx, cy, count, colors, spdMin, spdMax, szMin, szMax, glow, gravity, drag, decay) {
  for (let i = 0; i < count; i++) {
    const a = Math.random() * Math.PI * 2, spd = spdMin + Math.random() * (spdMax - spdMin);
    fx({ x: cx, y: cy, vx: Math.cos(a) * spd, vy: Math.sin(a) * spd,
      size: szMin + Math.random() * (szMax - szMin),
      color: colors[Math.floor(Math.random() * colors.length)],
      glow, gravity, drag, decay: decay + Math.random() * 0.02 });
  }
}

function _fxLoop() {
  if (!_fxCtx) return;
  const ctx = _fxCtx, W = _fxCanvas.width, H = _fxCanvas.height;
  ctx.clearRect(0, 0, W, H);
  _fxParts = _fxParts.filter(p => {
    p.vx *= p.drag; p.vy *= p.drag; p.vy += p.gravity;
    p.x += p.vx; p.y += p.vy; p.life -= p.decay;
    if (p.life <= 0) return false;
    ctx.save();
    if (p.glow > 0) { ctx.shadowColor = p.color; ctx.shadowBlur = p.glow; }
    ctx.globalAlpha = Math.max(0, p.life);
    ctx.fillStyle = p.color;
    ctx.beginPath(); ctx.arc(p.x, p.y, Math.max(0.5, p.size * Math.sqrt(p.life)), 0, Math.PI * 2); ctx.fill();
    ctx.restore();
    return true;
  });
  _fxRaf = requestAnimationFrame(_fxLoop);
}

function fxFlash(color, alpha, ms) {
  if (!_fxCtx) return;
  const ctx = _fxCtx, W = _fxCanvas.width, H = _fxCanvas.height, t0 = performance.now();
  (function frame(now) {
    const t = Math.min(1, (now - t0) / ms);
    ctx.save(); ctx.globalAlpha = alpha * (1 - t);
    ctx.fillStyle = color; ctx.fillRect(0, 0, W, H); ctx.restore();
    if (t < 1) requestAnimationFrame(frame);
  })(performance.now());
}

function fxRing(cx, cy, r0, r1, color, ms) {
  if (!_fxCtx) return;
  const ctx = _fxCtx, t0 = performance.now();
  (function frame(now) {
    const t = Math.min(1, (now - t0) / ms);
    const r = r0 + (r1 - r0) * t;
    ctx.save(); ctx.globalAlpha = 0.85 * (1 - t);
    ctx.strokeStyle = color; ctx.shadowColor = color; ctx.shadowBlur = 14;
    ctx.lineWidth = 3.5 * (1 - t * 0.6);
    ctx.beginPath(); ctx.arc(cx, cy, r, 0, Math.PI * 2); ctx.stroke();
    ctx.restore();
    if (t < 1) requestAnimationFrame(frame);
  })(performance.now());
}

// ── Audio ─────────────────────────────────────────────────────────────────

let _ac = null;
function getAC() {
  if (!_ac) _ac = new (window.AudioContext || window.webkitAudioContext)();
  if (_ac.state === 'suspended') _ac.resume();
  return _ac;
}

let _bgm = null;

function startBattleMusic() {
  if (_bgm) return;
  _bgm = new Audio('static/audio/battle-music.mp3');
  _bgm.loop = true;
  _bgm.volume = 0.4;
  _bgm.play().catch(() => {});
}

function stopBattleMusic() {
  if (!_bgm) return;
  _bgm.pause();
  _bgm.currentTime = 0;
  _bgm = null;
}

function _noise(ctx, dur, gain, lpFreq) {
  const len = Math.floor(ctx.sampleRate * dur);
  const buf = ctx.createBuffer(1, len, ctx.sampleRate);
  const d = buf.getChannelData(0);
  for (let i = 0; i < len; i++) d[i] = Math.random() * 2 - 1;
  const src = ctx.createBufferSource(); src.buffer = buf;
  const g = ctx.createGain(); g.gain.value = gain;
  if (lpFreq) {
    const f = ctx.createBiquadFilter(); f.type = 'lowpass'; f.frequency.value = lpFreq;
    src.connect(f); f.connect(g);
  } else { src.connect(g); }
  g.connect(ctx.destination); src.start(ctx.currentTime);
  return { src, g };
}

function _osc(ctx, type, freq0, freq1, dur, gain0, freqAtT) {
  const now = ctx.currentTime;
  const o = ctx.createOscillator(); o.type = type;
  o.frequency.setValueAtTime(freq0, now);
  if (freqAtT) freqAtT.forEach(([t, f]) => o.frequency.setValueAtTime(f, now + t));
  if (freq1) o.frequency.exponentialRampToValueAtTime(freq1, now + dur);
  const g = ctx.createGain();
  g.gain.setValueAtTime(gain0, now);
  g.gain.exponentialRampToValueAtTime(0.0001, now + dur);
  o.connect(g); g.connect(ctx.destination);
  o.start(now); o.stop(now + dur + 0.02);
}

function playHit(strong) {
  try {
    const ctx = getAC(), now = ctx.currentTime;
    // Noise crack
    const blen = Math.floor(ctx.sampleRate * (strong ? 0.22 : 0.15));
    const buf = ctx.createBuffer(1, blen, ctx.sampleRate);
    const d = buf.getChannelData(0);
    for (let i = 0; i < blen; i++) d[i] = (Math.random()*2-1) * Math.pow(1 - i/blen, 0.35);
    const src = ctx.createBufferSource(); src.buffer = buf;
    const g = ctx.createGain(); g.gain.setValueAtTime(strong ? 0.9 : 0.65, now);
    g.gain.exponentialRampToValueAtTime(0.001, now + (strong ? 0.22 : 0.15));
    src.connect(g); g.connect(ctx.destination); src.start(now);
    // Thud
    _osc(ctx, 'sine', strong ? 180 : 220, strong ? 28 : 45, strong ? 0.2 : 0.14, strong ? 0.7 : 0.5);
    if (strong) _osc(ctx, 'square', 120, 20, 0.18, 0.4);
  } catch(e) {}
}

function playMoveSound(type, powered) {
  try {
    const ctx = getAC(), now = ctx.currentTime;
    switch (type) {
      case 'fire': {
        // Roar: lowpass noise whoosh
        const len = Math.floor(ctx.sampleRate * 0.5);
        const buf = ctx.createBuffer(1, len, ctx.sampleRate);
        const d = buf.getChannelData(0);
        for (let i = 0; i < len; i++) d[i] = Math.random() * 2 - 1;
        const src = ctx.createBufferSource(); src.buffer = buf;
        const lp = ctx.createBiquadFilter(); lp.type = 'bandpass'; lp.frequency.value = 900; lp.Q.value = 0.8;
        const g = ctx.createGain(); g.gain.setValueAtTime(powered ? 0.38 : 0.25, now);
        g.gain.exponentialRampToValueAtTime(0.001, now + 0.5);
        src.connect(lp); lp.connect(g); g.connect(ctx.destination); src.start(now);
        // Sub rumble
        _osc(ctx, 'sawtooth', powered ? 240 : 190, powered ? 30 : 50, 0.42, 0.22);
        // Crack
        _osc(ctx, 'sawtooth', 1400, 200, 0.1, 0.12);
        break;
      }
      case 'electric': {
        // Crackle: rapid freq jumps
        _osc(ctx, 'square', 1600, 180, 0.38, 0.15,
          [[0.03, 900], [0.07, 2000], [0.12, 600], [0.17, 1800], [0.22, 400]]);
        // Static noise
        _noise(ctx, 0.32, 0.13, 5000);
        // Charge-up sine
        _osc(ctx, 'sine', 80, powered ? 2400 : 1600, 0.22, 0.1);
        // Zap snap
        setTimeout(() => { try { _noise(ctx, 0.08, 0.25); } catch(e) {} }, 280);
        break;
      }
      case 'dragon': {
        // Deep sub rumble
        _osc(ctx, 'sine', powered ? 38 : 50, 12, 0.65, powered ? 0.45 : 0.32);
        // Roar sweep
        _osc(ctx, 'sawtooth', 110, 20, 0.58, 0.28);
        // Thunder noise
        _noise(ctx, 0.45, 0.18, 280);
        // High metallic ring
        _osc(ctx, 'sine', 1800, 400, 0.3, 0.08);
        break;
      }
      case 'ground': {
        // Seismic sub
        _osc(ctx, 'sine', 28, 8, 0.48, 0.42);
        // Rumble noise
        _noise(ctx, 0.45, 0.28, 220);
        // Staggered impact transients
        [0, 80, 160].forEach(delay => {
          setTimeout(() => { try { _noise(ctx, 0.1, 0.2, 300); } catch(e) {} }, delay);
        });
        break;
      }
      case 'rock': {
        // Crack
        _osc(ctx, 'sawtooth', 360, 42, 0.3, 0.22);
        // Impact noise
        _noise(ctx, 0.18, 0.28, 400);
        // Low thud
        _osc(ctx, 'sine', 75, 18, 0.28, 0.18);
        // Staggered secondary impacts
        [110, 220].forEach(d => setTimeout(() => { try { _noise(ctx, 0.1, 0.14, 350); } catch(e) {} }, d));
        break;
      }
    }
  } catch(e) {}
}

// ── Cry ────────────────────────────────────────────────────────────────────

function playCry(id) {
  try {
    const url = `https://raw.githubusercontent.com/PokeAPI/cries/main/cries/pokemon/latest/${id}.ogg`;
    const audio = new Audio(url);
    audio.volume = 0.55;
    audio.play().catch(() => {});
    return audio;
  } catch(e) { return null; }
}

// ── Intro sequence ─────────────────────────────────────────────────────────

async function playIntro(oppData, playerData) {
  const ba = R.ba;

  // Dark overlay over battle area
  const introOv = document.createElement('div');
  introOv.className = 'pb-intro-overlay';
  ba.appendChild(introOv);
  await sleep(80);

  // Opponent artwork — show as silhouette
  const artImg = document.createElement('img');
  artImg.className = 'pb-intro-art';
  artImg.src = oppData.artwork;
  ba.appendChild(artImg);
  await sleep(50);
  artImg.classList.add('pb-intro-art-in');

  await typeText(`A wild ${oppData.name} appeared!`);
  await sleep(700);

  // White flash
  const flash = document.createElement('div');
  flash.className = 'pb-intro-flash';
  ba.appendChild(flash);
  await sleep(80);
  flash.classList.add('pb-intro-flash-out');
  await sleep(320);

  // Reveal color + play cry
  artImg.style.filter = 'brightness(1)';
  artImg.style.transition = 'filter .4s ease';
  if (oppData.id) playCry(oppData.id);
  await sleep(1200);

  // Fade artwork + overlay out
  artImg.style.opacity = '0';
  artImg.style.transition = 'opacity .5s ease, filter .4s ease';
  introOv.style.opacity = '0';
  introOv.style.transition = 'opacity .5s ease';
  await sleep(520);
  artImg.remove();
  introOv.remove();
  flash.remove();

  await typeText(`Go! ${playerData.name}!`);
  if (playerData.id) playCry(playerData.id);
  await sleep(900);
}

// ── Move animations ────────────────────────────────────────────────────────

async function anim_BlueFlare(atkSide, defSide) {
  playMoveSound('fire', false);
  const atkImg = atkSide === 'player' ? R.playerSprite : R.oppSprite;
  // Build-up glow on attacker
  atkImg.style.filter = 'drop-shadow(0 0 32px #ff6010) brightness(1.35)';
  await sleep(160);
  atkImg.style.filter = '';
  await lunge(atkSide);

  const ap = sc(atkSide), dp = sc(defSide);
  const angleBase = Math.atan2(dp.y - ap.y, dp.x - ap.x);

  // Fire projectile particles flying toward defender
  for (let i = 0; i < 32; i++) {
    const a = angleBase + (Math.random() - 0.5) * 0.6;
    const spd = 9 + Math.random() * 7;
    const colors = ['#ff7010','#ff4000','#ffb030','#fff8e0','#ff2000'];
    fx({ x: ap.x, y: ap.y, vx: Math.cos(a)*spd, vy: Math.sin(a)*spd,
      size: 3 + Math.random()*5, color: colors[Math.floor(Math.random()*5)],
      glow: 20, gravity: 0, drag: 0.95, decay: 0.022 });
  }
  await sleep(280);

  // Impact explosion at defender
  fxBurst(dp.x, dp.y, 80, ['#ff6010','#ff9030','#ffb840','#fff6d0','#ff2500'], 2, 15, 2, 8, 24, 0.05, 0.94, 0.028);
  // Floating embers
  for (let i = 0; i < 22; i++) {
    fx({ x: dp.x + (Math.random()-0.5)*70, y: dp.y,
      vx: (Math.random()-0.5)*1.8, vy: -(1.8+Math.random()*2.5),
      size: 1.5+Math.random()*2.5, color: '#ff8020', glow: 10, gravity: -0.015, drag: 0.985, decay: 0.015 });
  }
  fxRing(dp.x, dp.y, 8, 140, '#ff5010', 480);
  fxFlash('#ff4010', 0.5, 280);
  await flashSprite(defSide, 4);
  await shakePanel(false);
}

async function anim_FusionFlare(atkSide, defSide, powered) {
  playMoveSound('fire', powered);
  const ba = R.ba;
  if (powered) {
    // Full arena flash before beam
    fxFlash('#fffacc', 0.88, 220);
    await sleep(220);
  }
  await lunge(atkSide);
  const ap = sc(atkSide), dp = sc(defSide);
  const dx = dp.x - ap.x, dy = dp.y - ap.y;
  const angle = Math.atan2(dy, dx) * 180 / Math.PI;
  const dist  = Math.sqrt(dx*dx + dy*dy);
  const bh = powered ? '20px' : '7px';

  // SVG beam
  const beam = tmp({ left:ap.x+'px', top:ap.y+'px', width:'0', height:bh,
    background: powered ? 'linear-gradient(to right,#fff,#fff8c0,#ff8020)' : 'linear-gradient(to right,#fff,#ff9030)',
    boxShadow: powered ? '0 0 28px #fff6a0, 0 0 8px #fff' : '0 0 14px #fff9c4',
    transformOrigin:'left center', transform:`rotate(${angle}deg) translateY(-50%)`,
    transition:'width .3s ease', zIndex:'8' });
  ba.appendChild(beam);
  await sleep(20); beam.style.width = dist + 'px';
  await sleep(320);

  // Fire particles along beam path
  for (let i = 0; i < (powered ? 55 : 28); i++) {
    const t = Math.random();
    const spread = (Math.random()-0.5) * (powered ? 55 : 28);
    const radAngle = Math.atan2(dy, dx);
    const perpAngle = radAngle + Math.PI/2;
    const cx = ap.x + dx*t + Math.cos(perpAngle)*spread;
    const cy = ap.y + dy*t + Math.sin(perpAngle)*spread;
    fx({ x: cx, y: cy, vx: (Math.random()-0.5)*2, vy: -(1+Math.random()*3),
      size: 2+Math.random()*4, color: powered ? '#fff' : '#ff9030', glow: 14, gravity: -0.01, drag: 0.97, decay: 0.04 });
  }

  const defImg = defSide === 'opp' ? R.oppSprite : R.playerSprite;
  defImg.style.filter = 'drop-shadow(0 0 32px rgba(255,240,140,.9)) brightness(3)';
  await sleep(240); defImg.style.filter = '';
  beam.remove();
  if (powered) { fxBurst(dp.x, dp.y, 60, ['#fff','#fffacc','#ff9020'], 3, 14, 3, 8, 26, 0.04, 0.94, 0.025); }
  fxRing(dp.x, dp.y, 6, 110, '#ffaa30', 400);
  await flashSprite(defSide, 4); await shakePanel(powered);
}

async function anim_DracoMeteor(atkSide, defSide) {
  playMoveSound('dragon', false);
  const ba = R.ba, dp = sc(defSide);

  // 5 comets fall from above, staggered
  const colors = ['#9060f0','#c090ff','#ffffff','#ff9800'];
  for (let i = 0; i < 5; i++) {
    setTimeout(() => {
      const mx = dp.x - 60 + Math.random() * 120;
      const startY = -30 - Math.random() * 40;
      const cometDiv = tmp({ width:'16px', height:'16px', borderRadius:'50%',
        background:'radial-gradient(circle,#fff 0%,#b060ff 55%,transparent 100%)',
        boxShadow:'0 0 16px #9060f0',
        top: startY + 'px', left: mx + 'px',
        transition: `top ${0.38 + i*0.06}s cubic-bezier(0.55,0,1,0.45)`,
        zIndex: '6' });
      ba.appendChild(cometDiv);

      // Trailing particles during fall
      const fallDist = dp.y - startY;
      const steps = 12;
      for (let s = 0; s < steps; s++) {
        setTimeout(() => {
          const fy = startY + (fallDist * s / steps);
          fx({ x: mx + 8, y: fy, vx: (Math.random()-0.5)*1.2, vy: (Math.random()-0.5)*1.2,
            size: 2+Math.random()*3, color: colors[Math.floor(Math.random()*4)],
            glow: 10, gravity: 0.02, drag: 0.96, decay: 0.06 });
        }, (s / steps) * (380 + i*60));
      }

      setTimeout(() => {
        cometDiv.style.top = dp.y + 'px';
        setTimeout(() => {
          cometDiv.remove();
          // Impact burst
          fxBurst(mx + 8, dp.y, 28, ['#9060f0','#c090ff','#ffffff','#6040d0'],
            2, 10, 2, 5, 16, 0.05, 0.93, 0.04);
          fxRing(mx + 8, dp.y, 4, 65, '#9060f0', 300);
        }, 380 + i * 60);
      }, 20);
    }, i * 130);
  }

  await sleep(800);
  fxFlash('#6030c0', 0.35, 220);
  await flashSprite(defSide, 4); await shakePanel(true);
}

async function anim_EarthPower(atkSide, defSide) {
  playMoveSound('ground', false);
  const ba = R.ba;
  await lunge(atkSide);
  const dp = sc(defSide);
  const groundY = dp.y + dp.h * 0.28;
  const cracks = 5;

  // Draw radiating cracks as SVG lines
  const svgEl = document.createElementNS('http://www.w3.org/2000/svg', 'svg');
  svgEl.style.cssText = `position:absolute;inset:0;width:100%;height:100%;z-index:6;pointer-events:none;overflow:visible;`;
  ba.appendChild(svgEl);

  for (let i = 0; i < cracks; i++) {
    const angle = ((i / cracks) * Math.PI * 2) + (Math.random() - 0.5) * 0.5;
    const len   = 80 + Math.random() * 90;
    const x2 = dp.x + Math.cos(angle) * len;
    const y2 = groundY + Math.sin(angle) * len * 0.5;
    setTimeout(() => {
      const line = document.createElementNS('http://www.w3.org/2000/svg', 'line');
      line.setAttribute('x1', dp.x); line.setAttribute('y1', groundY);
      line.setAttribute('x2', dp.x); line.setAttribute('y2', groundY);
      line.setAttribute('stroke', '#c08030'); line.setAttribute('stroke-width', '2.5');
      line.setAttribute('stroke-linecap', 'round');
      svgEl.appendChild(line);
      // Animate crack growing
      const t0 = performance.now();
      (function grow(now) {
        const t = Math.min(1, (now - t0) / 200);
        line.setAttribute('x2', dp.x + (x2 - dp.x) * t);
        line.setAttribute('y2', groundY + (y2 - groundY) * t);
        if (t < 1) requestAnimationFrame(grow);
        else {
          // Glow version
          const glow = line.cloneNode();
          glow.setAttribute('stroke', '#f0a040'); glow.setAttribute('stroke-width', '1'); glow.setAttribute('opacity', '0.5');
          svgEl.appendChild(glow);
          // Magma particles from tip
          for (let p = 0; p < 10; p++) {
            setTimeout(() => {
              fx({ x: parseFloat(line.getAttribute('x2')), y: parseFloat(line.getAttribute('y2')),
                vx: (Math.random()-0.5)*3, vy: -(2 + Math.random()*4),
                size: 2+Math.random()*4, color: p%2 ? '#e08020' : '#c06010', glow: 14,
                gravity: 0.06, drag: 0.96, decay: 0.03 });
            }, p * 35);
          }
        }
      })(performance.now());
    }, i * 55);
  }

  // Central eruption
  await sleep(120);
  fxBurst(dp.x, groundY, 50, ['#d07020','#e09030','#f0b040','#c05010','#804010'],
    2, 10, 2, 6, 18, -0.08, 0.95, 0.028);
  await sleep(380);
  svgEl.remove();
  fxFlash('#804010', 0.3, 200);
  await flashSprite(defSide, 3); await shakePanel(false);
}

async function anim_BoltStrike(atkSide, defSide) {
  playMoveSound('electric', false);
  const ba = R.ba;
  const ap = sc(atkSide);

  // Charge-up: sparks radiate from attacker
  for (let i = 0; i < 50; i++) {
    const a = Math.random() * Math.PI * 2;
    const r = 18 + Math.random() * 55;
    fx({ x: ap.x + Math.cos(a)*r, y: ap.y + Math.sin(a)*r,
      vx: Math.cos(a)*2, vy: Math.sin(a)*2,
      size: 1.5+Math.random()*2.5, color: '#5b9af5', glow: 14, gravity: 0, drag: 0.88, decay: 0.07 });
  }
  const atkImg = atkSide === 'player' ? R.playerSprite : R.oppSprite;
  atkImg.style.filter = 'brightness(2) drop-shadow(0 0 24px #5b9af5)';
  await lunge(atkSide, 58);
  atkImg.style.filter = '';

  const dp = sc(defSide);
  const minX = Math.min(ap.x,dp.x)-50, minY = Math.min(ap.y,dp.y)-50;
  const bW = Math.abs(dp.x-ap.x)+100, bH = Math.abs(dp.y-ap.y)+100;

  // 4 layered lightning bolts
  for (let f = 0; f < 4; f++) {
    const svg = document.createElementNS('http://www.w3.org/2000/svg','svg');
    svg.setAttribute('width', bW); svg.setAttribute('height', bH);
    svg.style.cssText = `position:absolute;left:${minX}px;top:${minY}px;z-index:8;pointer-events:none;`;
    const x1=ap.x-minX, y1=ap.y-minY, x2=dp.x-minX, y2=dp.y-minY;
    const pts=[[x1,y1]];
    const segs = 10;
    for (let s=1;s<segs;s++) pts.push([x1+(x2-x1)*(s/segs)+(Math.random()-.5)*58, y1+(y2-y1)*(s/segs)+(Math.random()-.5)*26]);
    pts.push([x2,y2]);
    const pStr = pts.map(p=>p.join(',')).join(' ');
    // Outer glow, mid layer, core
    for (const [col, w, op] of [['#1a3a88',18,0.15],['#4080d8',8,0.4],['#90c8ff',3.5,0.75],['#ffffff',1.5,1]]) {
      const pl=document.createElementNS('http://www.w3.org/2000/svg','polyline');
      pl.setAttribute('points',pStr); pl.setAttribute('stroke',col);
      pl.setAttribute('stroke-width',w.toString()); pl.setAttribute('fill','none');
      pl.setAttribute('stroke-linecap','round'); pl.setAttribute('opacity',op.toString());
      svg.appendChild(pl);
    }
    ba.appendChild(svg);
    await sleep(68); svg.remove(); await sleep(40);
  }

  // Impact explosion
  fxBurst(dp.x, dp.y, 90, ['#5b9af5','#c8e8ff','#ffffff','#1a4aaa','#8ac8ff','#e0f0ff'],
    3, 17, 2, 7, 22, 0.03, 0.93, 0.024);
  // Spark rays
  for (let i=0;i<14;i++) {
    const a = (i/14)*Math.PI*2;
    fx({ x: dp.x, y: dp.y, vx: Math.cos(a)*13, vy: Math.sin(a)*13,
      size: 3.5, color: '#fff', glow: 18, gravity: 0.015, drag: 0.86, decay: 0.065 });
  }
  fxRing(dp.x, dp.y, 5, 115, '#5b9af5', 400);
  fxFlash('#5b9af5', 0.42, 220);
  await flashSprite(defSide, 4); await shakePanel(true);
}

async function anim_FusionBolt(atkSide, defSide, powered) {
  playMoveSound('electric', powered);
  const ba = R.ba;
  const atkImg = atkSide === 'player' ? R.playerSprite : R.oppSprite;

  // Attacker charge-up pulse
  for (let i = 0; i < 3; i++) {
    atkImg.style.filter = 'brightness(2.5) drop-shadow(0 0 24px #5b9af5)';
    await sleep(100); atkImg.style.filter = ''; await sleep(85);
  }

  const ap = sc(atkSide), dp = sc(defSide);

  // Plasma orb: orbiting particles around a center moving toward defender
  let orbX = ap.x, orbY = ap.y;
  const duration = 340;
  const t0 = performance.now();
  (function spawnOrb(now) {
    const t = Math.min(1, (now - t0) / duration);
    orbX = ap.x + (dp.x - ap.x) * t;
    orbY = ap.y + (dp.y - ap.y) * t;
    const a = (now * 0.015) % (Math.PI * 2);
    const r = powered ? 20 : 8;
    for (let j = 0; j < (powered ? 3 : 2); j++) {
      const ja = a + (j / (powered ? 3 : 2)) * Math.PI * 2;
      fx({ x: orbX + Math.cos(ja)*r, y: orbY + Math.sin(ja)*r,
        vx: 0, vy: 0, size: powered ? 4 : 2.5, color: j===0 ? '#fff' : '#5b9af5',
        glow: 16, gravity: 0, drag: 1, decay: 0.18 });
    }
    // Central glow
    fx({ x: orbX, y: orbY, vx:0, vy:0, size: powered ? 9 : 5, color: '#c8e8ff', glow: 20, gravity:0, drag:1, decay:0.22 });
    if (t < 1) requestAnimationFrame(spawnOrb);
  })(performance.now());

  await sleep(duration + 20);

  // Impact burst + spike rays
  fxBurst(dp.x, dp.y, powered ? 90 : 55, ['#5b9af5','#c8e8ff','#fff','#3070c0'],
    2, powered ? 18 : 12, 2, powered ? 8 : 5, 20, 0.03, 0.93, 0.025);
  for (let i = 0; i < (powered ? 14 : 8); i++) {
    const a = (i / (powered ? 14 : 8)) * Math.PI * 2;
    fx({ x: dp.x, y: dp.y, vx: Math.cos(a)*14, vy: Math.sin(a)*14,
      size: powered ? 4 : 2.5, color: '#fff', glow: 18, gravity: 0.01, drag: 0.87, decay: 0.06 });
  }
  fxRing(dp.x, dp.y, 4, powered ? 130 : 80, '#5b9af5', powered ? 450 : 320);
  if (powered) fxFlash('#5b9af5', 0.52, 260);
  await flashSprite(defSide, 4); await shakePanel(powered); await sleep(180);
}

async function anim_Outrage(atkSide, defSide, consecutive) {
  playMoveSound('dragon', consecutive >= 1);
  const ba = R.ba;
  const atkImg = atkSide === 'player' ? R.playerSprite : R.oppSprite;
  const dp = sc(defSide);

  // Rage energy: dragon-purple particles emanating from attacker center
  const ap = sc(atkSide);
  for (let i = 0; i < 55; i++) {
    const a = Math.random() * Math.PI * 2;
    const spd = 4 + Math.random() * 8;
    fx({ x: ap.x, y: ap.y, vx: Math.cos(a)*spd, vy: Math.sin(a)*spd,
      size: 2+Math.random()*6, color: i%3===0?'#ff2020':i%3===1?'#9030c0':'#ff6030',
      glow: 18, gravity: 0.04, drag: 0.93, decay: 0.03 });
  }

  // Inset red glow overlay
  const rp = tmp({ inset:'0', background:'radial-gradient(ellipse at center, rgba(160,0,0,0.42) 0%, transparent 70%)',
    zIndex:'6', transition:'opacity .18s' });
  ba.appendChild(rp);
  await lunge(atkSide, 65);

  // Slash marks on target area
  const slashColors = ['rgba(255,60,60,0.85)','rgba(200,30,200,0.7)'];
  for (let s = 0; s < 4; s++) {
    setTimeout(() => {
      const svg = document.createElementNS('http://www.w3.org/2000/svg','svg');
      svg.style.cssText = `position:absolute;inset:0;width:100%;height:100%;z-index:7;pointer-events:none;overflow:visible;`;
      ba.appendChild(svg);
      const sx = dp.x + (Math.random()-0.5)*80, sy = dp.y + (Math.random()-0.5)*60;
      const angle = -30 + Math.random()*60;
      const len = 60 + Math.random()*50;
      const rad = angle * Math.PI / 180;
      const line = document.createElementNS('http://www.w3.org/2000/svg','line');
      line.setAttribute('x1', sx - Math.cos(rad)*len/2); line.setAttribute('y1', sy - Math.sin(rad)*len/2);
      line.setAttribute('x2', sx + Math.cos(rad)*len/2); line.setAttribute('y2', sy + Math.sin(rad)*len/2);
      line.setAttribute('stroke', slashColors[s%2]); line.setAttribute('stroke-width','3');
      line.setAttribute('stroke-linecap','round');
      svg.appendChild(line);
      setTimeout(() => svg.remove(), 380);
    }, s * 75);
  }

  if (consecutive >= 1) {
    // Extra rage pulse
    await sleep(120);
    fxFlash('#600020', 0.5, 180);
    for (let i=0;i<5;i++) { atkImg.style.transform=`translateX(${i%2?8:-8}px)`; await sleep(48); }
    atkImg.style.transform='';
  }

  rp.style.opacity='0';
  setTimeout(() => rp.remove(), 220);
  fxBurst(dp.x, dp.y, 40, ['#ff3030','#cc20a0','#ff8030'], 2, 9, 2, 5, 16, 0.04, 0.94, 0.038);
  await flashSprite(defSide, 4); await shakePanel(consecutive >= 1);
}

async function anim_RockSlide(atkSide, defSide) {
  playMoveSound('rock', false);
  const ba = R.ba;
  const dp = sc(defSide);
  const rockColors = [['#9a8870','#6a5840'],['#b8a088','#887060'],['#aaa090','#787060']];

  for (let i = 0; i < 5; i++) {
    setTimeout(() => {
      const bx = dp.x - 80 + Math.random() * 160;
      const startY = -25 - Math.random() * 30;
      const rot = Math.random() * 40 - 20;
      const [c1, c2] = rockColors[i % 3];
      const rock = tmp({ width:'24px', height:'19px', borderRadius:'3px',
        background:`radial-gradient(circle at 30% 28%, ${c1}, ${c2})`,
        boxShadow:`inset -2px -2px 4px rgba(0,0,0,0.4)`,
        top: startY + 'px', left: bx + 'px',
        transform: `rotate(${rot}deg)`,
        transition: `top ${0.4 + i*0.055}s cubic-bezier(0.55,0,1,0.45), transform ${0.4+i*0.055}s linear`,
        zIndex:'6' });
      ba.appendChild(rock);

      // Shadow trailing particles during fall
      const fallTime = 400 + i * 55;
      for (let t = 0; t < 8; t++) {
        setTimeout(() => {
          const prog = t / 8;
          fx({ x: bx + 12, y: startY + (dp.y - startY) * prog,
            vx: (Math.random()-0.5)*1.2, vy: 0,
            size: 3 + Math.random()*2.5, color: c1, glow: 0, gravity: 0.04, drag: 0.97, decay: 0.08 });
        }, prog * fallTime);
      }

      rock.style.top = dp.y + 'px';
      rock.style.transform = `rotate(${rot + 180}deg)`;

      setTimeout(() => {
        rock.remove();
        // Dust + debris burst
        fxBurst(bx + 12, dp.y, 20, ['#b0a090','#d0c0a8','#807060'], 1.5, 7, 2, 5, 0, 0.04, 0.94, 0.045);
        // Dust cloud: expanding translucent circle via fxRing
        fxRing(bx+12, dp.y, 2, 45, '#c0b09a', 280);
        // Stagger the hit sound
        setTimeout(() => { try { _noise(getAC(), 0.1, 0.18, 400); } catch(e){} }, 0);
      }, fallTime);
    }, i * 115);
  }

  await sleep(820); await flashSprite(defSide, 3); await shakePanel(false);
}

// ── Damage ─────────────────────────────────────────────────────────────────

function calcDamage(atkMon, move, defMon, defKey) {
  const isSp = move.cat === 'special';
  const spMod = Math.pow(2/3, Math.max(0, -atkMon.spAtkMod)); // -2 stages = ×0.5 approx
  const aStat = isSp ? atkMon.spAtk * (atkMon.spAtkMod < 0 ? 0.5 : 1) : atkMon.atk;
  const dStat = isSp ? defMon.spDef : defMon.def;
  const rnd   = 0.85 + Math.random()*0.15;
  const raw   = (aStat / dStat * move.pow * rnd) / 50 + 2;
  const mult  = typeMultiplier(move.type, defKey);
  return { dmg: Math.round(raw * mult), mult };
}

// ── Status end-of-turn ─────────────────────────────────────────────────────

async function endOfTurnStatus(side) {
  const mon = S[side];
  if (mon.status === 'burn') {
    const dmg = Math.round(mon.maxHP * 0.0625);
    mon.hp = Math.max(0, mon.hp - dmg);
    updateBar(side);
    await typeText(`${mon.name} is hurt by its burn!`);
    await sleep(800);
  }
}

// ── Execute move ───────────────────────────────────────────────────────────

async function execMove(atkSide, moveIdx) {
  const defSide = atkSide==='player' ? 'opp' : 'player';
  const atkMon  = S[atkSide];
  const defMon  = S[defSide];

  // Outrage lock-in override
  if (atkMon.outrageTurns > 0 && atkMon.outrageIdx !== null) {
    moveIdx = atkMon.outrageIdx;
  }

  let move = { ...atkMon.moves[moveIdx] };

  // Paralysis skip
  if (atkMon.status==='para' && Math.random()<.25) {
    await typeText(`${atkMon.name} is paralyzed! It can't move!`);
    await sleep(900); return false;
  }
  // Confusion self-hit
  if (atkMon.status==='conf' && Math.random()<.33) {
    await typeText(`${atkMon.name} is confused!`); await sleep(600);
    const selfDmg = 40;
    atkMon.hp = Math.max(0, atkMon.hp - selfDmg);
    updateBar(atkSide);
    await flashSprite(atkSide); await shakePanel();
    await typeText(`${atkMon.name} hurt itself in its confusion!`);
    await sleep(900); return false;
  }
  // Flinch
  if (atkMon.flinched) {
    atkMon.flinched = false;
    await typeText(`${atkMon.name} flinched!`); await sleep(900); return false;
  }
  // Miss
  if (Math.random()*100 > move.acc) {
    await typeText(`${atkMon.name} used ${move.name}! But it missed!`);
    await sleep(900); return false;
  }

  await typeText(`${atkMon.name} used ${move.name}!`); await sleep(550);

  // Fusion power-up
  let fusionPowered = false;
  if (move.effect==='fusion' && move.fusionPartner) {
    const lastOther = atkSide==='player' ? S.lastOppMove : S.lastPlayerMove;
    if (lastOther && lastOther.name===move.fusionPartner) {
      fusionPowered = true;
      move = { ...move, pow: move.pow*2 };
    }
  }

  // Outrage consecutive count (before decrement)
  let outrageConsec = 0;
  if (move.effect==='outrage') {
    if (atkMon.outrageTurns <= 0) {
      atkMon.outrageTurns = 2 + Math.floor(Math.random()*2);
      atkMon.outrageIdx   = moveIdx;
      atkMon.outrageUsed  = 0;
    } else {
      atkMon.outrageUsed++;
    }
    outrageConsec = atkMon.outrageUsed;
  }

  // Animations
  const n = move.name;
  if      (n==='Blue Flare')   await anim_BlueFlare(atkSide, defSide);
  else if (n==='Fusion Flare') await anim_FusionFlare(atkSide, defSide, fusionPowered);
  else if (n==='Draco Meteor') await anim_DracoMeteor(atkSide, defSide);
  else if (n==='Earth Power')  await anim_EarthPower(atkSide, defSide);
  else if (n==='Bolt Strike')  await anim_BoltStrike(atkSide, defSide);
  else if (n==='Fusion Bolt')  await anim_FusionBolt(atkSide, defSide, fusionPowered);
  else if (n==='Outrage')      await anim_Outrage(atkSide, defSide, outrageConsec);
  else if (n==='Rock Slide')   await anim_RockSlide(atkSide, defSide);
  else { await lunge(atkSide); await flashSprite(defSide); await shakePanel(); }

  // Damage
  const { dmg, mult } = calcDamage(atkMon, move, defMon, defMon.key);
  if (mult >= 2) {
    await typeText("It's super effective!"); await shakePanel(true); await sleep(600);
  } else if (mult < 1) {
    await typeText("It's not very effective..."); await sleep(600);
  }
  showDamageNum(defSide, dmg, mult);
  defMon.hp = Math.max(0, defMon.hp - dmg);
  updateBar(defSide);
  playHit();
  await sleep(300);

  // Effects
  if (move.effect==='burn20' && !defMon.status && Math.random()<.2) {
    showStatus(defSide,'burn');
    await typeText(`${defMon.name} was burned!`); await sleep(700);
  }
  if (move.effect==='para20' && !defMon.status && Math.random()<.2) {
    showStatus(defSide,'para');
    await typeText(`${defMon.name} was paralyzed!`); await sleep(700);
  }
  if (move.effect==='spdef10' && Math.random()<.1) {
    await typeText(`${defMon.name}'s Sp. Def fell!`); await sleep(600);
  }
  if (move.effect==='spa_drop') {
    atkMon.spAtkMod -= 2;
    await typeText(`${atkMon.name}'s Sp. Atk fell sharply!`); await sleep(700);
  }
  if (move.effect==='flinch30' && Math.random()<.3) {
    defMon.flinched = true;
  }
  if (move.effect==='outrage') {
    atkMon.outrageTurns--;
    if (atkMon.outrageTurns <= 0) {
      atkMon.outrageIdx = null;
      showStatus(atkSide,'conf');
      await typeText(`${atkMon.name} became confused due to fatigue!`);
      // sway
      const atkImg = atkSide==='player' ? R.playerSprite : R.oppSprite;
      for (let i=0;i<3;i++) {
        atkImg.style.transform='translateX(-9px)'; await sleep(110);
        atkImg.style.transform='translateX(9px)';  await sleep(110);
      }
      atkImg.style.transform='';
      // 💜 flash
      const cfl=document.createElement('div');
      cfl.textContent='💜';
      Object.assign(cfl.style,{position:'absolute',top:'50%',left:'50%',
        transform:'translate(-50%,-50%)',fontSize:'2rem',zIndex:'10',
        pointerEvents:'none',transition:'opacity .4s'});
      R.ba.appendChild(cfl); await sleep(650);
      cfl.style.opacity='0'; setTimeout(()=>cfl.remove(),400);
      await sleep(700);
    }
  }

  // Track for fusion
  if (atkSide==='player') S.lastPlayerMove = move;
  else S.lastOppMove = move;

  return true;
}

// ── AI ─────────────────────────────────────────────────────────────────────

function aiPick() {
  const mon = S.opp;
  const hpPct = mon.hp / mon.maxHP;
  if (mon.outrageTurns > 0) return mon.outrageIdx;
  const weights = mon.moves.map(m => {
    let w = m.pow;
    if (hpPct < .3 && (m.effect==='spa_drop' || m.effect==='outrage')) w = 0;
    return Math.max(0, w);
  });
  const total = weights.reduce((a,b)=>a+b,0);
  let r = Math.random()*total;
  for (let i=0;i<weights.length;i++) { r-=weights[i]; if(r<=0) return i; }
  return 0;
}

// ── UI build ───────────────────────────────────────────────────────────────

function buildUI(playerKey, oppKey) {
  const pData = POKEMON[playerKey], oData = POKEMON[oppKey];

  const ov = document.createElement('div');
  ov.className='pb-overlay'; ov.id='pb-overlay';
  ov.addEventListener('click', e => { if(e.target===ov) closeBattle(); });

  const panel = document.createElement('div');
  panel.className='pb-panel'; panel.id='pb-panel';
  ov.appendChild(panel);

  // battle area
  const ba = document.createElement('div'); ba.className='pb-battle-area';
  panel.appendChild(ba);

  function makeInfoBox(data, side) {
    const sec = document.createElement('div');
    sec.className = side==='opp' ? 'pb-opponent-section' : 'pb-player-section';
    const box = document.createElement('div'); box.className='pb-info-box';

    // Name row: icon + name left, status + level right
    const nr = document.createElement('div'); nr.className='pb-name-row';
    const nameLeft = document.createElement('div'); nameLeft.style.cssText='display:flex;align-items:center;gap:6px;';
    if (data.icon) {
      const ic = document.createElement('img'); ic.src=data.icon;
      ic.style.cssText='width:32px;height:32px;image-rendering:pixelated;flex-shrink:0;margin-top:-2px;';
      nameLeft.appendChild(ic);
    }
    const nm = document.createElement('span'); nm.className='pb-pname'; nm.textContent=data.name;
    nameLeft.appendChild(nm);
    const right = document.createElement('div'); right.style.cssText='display:flex;align-items:center;gap:6px;';
    const st = document.createElement('span'); st.className='pb-status-icon'; st.id='pb-st-'+side;
    const lv = document.createElement('span'); lv.className='pb-level'; lv.textContent='Lv.100';
    right.appendChild(st); right.appendChild(lv);
    nr.appendChild(nameLeft); nr.appendChild(right);

    // HP section (grey panel below name)
    const hpsec = document.createElement('div'); hpsec.className='pb-hp-section';
    const hprow = document.createElement('div'); hprow.className='pb-hp-row';
    const hpl = document.createElement('span'); hpl.className='pb-hp-label'; hpl.textContent='HP';
    const tr = document.createElement('div'); tr.className='pb-hp-track';
    const fl = document.createElement('div'); fl.className='pb-hp-fill'; fl.id='pb-fill-'+side;
    tr.appendChild(fl);
    hprow.appendChild(hpl); hprow.appendChild(tr);

    const nums = document.createElement('div'); nums.className='pb-hp-nums'; nums.id='pb-nums-'+side;
    nums.textContent = data.hp + '/' + data.hp;

    hpsec.appendChild(hprow); hpsec.appendChild(nums);
    box.appendChild(nr); box.appendChild(hpsec);
    sec.appendChild(box); return sec;
  }

  ba.appendChild(makeInfoBox(oData,'opp'));
  ba.appendChild(makeInfoBox(pData,'player'));

  const closeBtn = document.createElement('button');
  closeBtn.className = 'pb-close';
  closeBtn.textContent = 'esc ×';
  closeBtn.setAttribute('aria-label', 'Close battle');
  closeBtn.addEventListener('click', closeBattle);
  ba.appendChild(closeBtn);

  const osw = document.createElement('div'); osw.className='pb-opp-sprite-wrap';
  const osi = document.createElement('img'); osi.className='pb-opp-sprite'; osi.src=oData.front;
  osw.appendChild(osi); ba.appendChild(osw);

  const psw = document.createElement('div'); psw.className='pb-player-sprite-wrap';
  const psi = document.createElement('img'); psi.className='pb-player-sprite'; psi.src=pData.back;
  psw.appendChild(psi); ba.appendChild(psw);

  setTimeout(function() {
    osi.style.animation = 'pb-entry-opp 0.55s cubic-bezier(0.23,1,0.32,1) both, pb-idle-opp 2.4s ease-in-out 0.55s infinite';
    psi.style.animation = 'pb-entry-player 0.55s cubic-bezier(0.23,1,0.32,1) both, pb-idle-player 2.8s ease-in-out 0.55s infinite';
  }, 50);

  // Ground shadows
  const oppShadow = document.createElement('div'); oppShadow.className='pb-poke-shadow';
  Object.assign(oppShadow.style, { width:'120px', height:'18px', left:'calc(54% + 60px)', top:'calc(22% + 234px)', transform:'translateX(-50%)' });
  ba.appendChild(oppShadow);

  const playerShadow = document.createElement('div'); playerShadow.className='pb-poke-shadow';
  Object.assign(playerShadow.style, { width:'160px', height:'24px', left:'calc(22% + 150px)', bottom:'4px', transform:'translateX(-50%)' });
  ba.appendChild(playerShadow);

  const bot = document.createElement('div'); bot.className='pb-bottom'; panel.appendChild(bot);
  const lb = document.createElement('div'); lb.className='pb-log-box';
  const lt = document.createElement('div'); lt.className='pb-log-text';
  lb.appendChild(lt); bot.appendChild(lb);
  const mg = document.createElement('div'); mg.className='pb-moves-grid'; bot.appendChild(mg);

  document.body.appendChild(ov);

  R = {
    overlay:ov, panel, ba,
    oppSprite:osi, playerSprite:psi,
    oppFill:   document.getElementById('pb-fill-opp'),
    playerFill:document.getElementById('pb-fill-player'),
    oppNums:   document.getElementById('pb-nums-opp'),
    playerNums:document.getElementById('pb-nums-player'),
    oppStatus:   document.getElementById('pb-st-opp'),
    playerStatus:document.getElementById('pb-st-player'),
    log:lt, moves:mg,
  };

  // Start canvas layers (needs R.ba to exist)
  requestAnimationFrame(() => {
    initBgCanvas(playerKey);
    initFxCanvas();
  });
}

// ── Battle flow ─────────────────────────────────────────────────────────────

async function runBattle() {
  const oppData    = POKEMON[S.opp.key];
  const playerData = POKEMON[S.player.key];
  await playIntro(oppData, playerData);
  showMoves();
}

function showMoves() {
  if (S.over) return;
  const mon = S.player;
  // Auto-continue Outrage
  if (mon.outrageTurns > 0 && mon.outrageIdx !== null) {
    R.log.textContent = `${mon.name} is in a rage!`;
    setTimeout(() => onPlayerMove(mon.outrageIdx), 900);
    return;
  }
  R.moves.innerHTML = '';
  mon.moves.forEach((mv, i) => {
    const btn = document.createElement('button'); btn.className='pb-move-btn';
    const nm  = document.createElement('span');  nm.className='pb-move-name';  nm.textContent=mv.name;
    const cat = document.createElement('span');  cat.className='pb-move-cat pb-move-cat-' + mv.cat;
    const rt  = document.createElement('div');   rt.className='pb-move-right';
    const tp  = document.createElement('span');  tp.className=`pb-move-type pb-type-${mv.type}`; tp.textContent=mv.type;
    const pp  = document.createElement('span');  pp.className='pb-move-pp'; pp.textContent=`PP ${mv.curPP}/${mv.pp}`;
    rt.appendChild(cat); rt.appendChild(tp); rt.appendChild(pp);
    btn.appendChild(nm); btn.appendChild(rt);
    btn.addEventListener('click', () => onPlayerMove(i));
    R.moves.appendChild(btn);
  });
}

async function onPlayerMove(idx) {
  if (S.over) return;
  R.moves.querySelectorAll('button').forEach(b=>b.disabled=true);
  R.moves.innerHTML = '';
  S.player.moves[idx].curPP = Math.max(0, S.player.moves[idx].curPP-1);

  await execMove('player', idx);
  if (S.opp.hp <= 0)    { await endBattle('win');  return; }
  await endOfTurnStatus('player');
  if (S.player.hp <= 0) { await endBattle('lose'); return; }

  await sleep(850);
  const aiIdx = aiPick();
  await execMove('opp', aiIdx);
  if (S.player.hp <= 0) { await endBattle('lose'); return; }
  await endOfTurnStatus('opp');
  if (S.opp.hp <= 0)    { await endBattle('win');  return; }

  await sleep(400);
  showMoves();
}

async function endBattle(result) {
  S.over = true;
  const loserSide = result==='win' ? 'opp' : 'player';
  const loserImg  = loserSide==='opp' ? R.oppSprite : R.playerSprite;
  loserImg.style.transition='transform .6s ease, opacity .6s ease';
  loserImg.classList.add(loserSide==='opp' ? 'pb-exit-opp' : 'pb-exit-player');
  await sleep(620);

  const fade = tmp({ inset:'0', background:'rgba(0,0,0,0)', zIndex:'9', transition:'background .5s', position:'absolute' });
  R.ba.appendChild(fade); await sleep(20);
  fade.style.background='rgba(0,0,0,.88)'; await sleep(520);

  if (result==='win') {
    const which = S.player.key==='reshiram' ? 'truth' : 'ideals';
    await typeText(`You won! The ${which} prevailed.`);
    for (let i=0;i<12;i++) {
      const sp=document.createElement('div'); sp.className='pb-sparkle';
      const dx=(Math.random()-.5)*120, dy=(Math.random()-.5)*120;
      Object.assign(sp.style,{
        left:Math.random()*100+'%', top:Math.random()*100+'%',
        '--dx':dx+'px', '--dy':dy+'px',
        animationDelay:Math.random()*.5+'s',
        background:['#fff','#ffd700','#64b4ff','#ff8c00'][Math.floor(Math.random()*4)],
      });
      R.panel.appendChild(sp);
    }
    await sleep(4000);
  } else {
    await typeText(`You blacked out...`); await sleep(3000);
  }
  closeBattle();
}

// ── Battle start / close ──────────────────────────────────────────────────

function startBattle() {
  if (document.getElementById('pb-overlay')) return;
  const isDark = document.documentElement.getAttribute('data-theme') === 'dark';
  const pKey   = isDark ? 'zekrom'   : 'reshiram';
  const oKey   = isDark ? 'reshiram' : 'zekrom';
  initState(pKey, oKey);
  buildUI(pKey, oKey);
  document.documentElement.classList.add('pb-battle-active');
  startBattleMusic();
  runBattle();
}

function closeBattle() {
  document.documentElement.classList.remove('pb-battle-active');
  stopBattleMusic();
  stopBgCanvas();
  stopFxCanvas();
  const ov = document.getElementById('pb-overlay');
  if (ov) ov.remove();
  document.querySelectorAll('.pb-pokehint,.pb-sparkle').forEach(e => e.remove());
  S = null; R = {};
}

// ── Public init ─────────────────────────────────────────────────────────────

function initPokemonBattle() {
  document.addEventListener('keydown', e => { if (e.key === 'Escape') closeBattle(); });
}
window.initPokemonBattle = initPokemonBattle;
window.startPokemonBattle = startBattle;

})();
