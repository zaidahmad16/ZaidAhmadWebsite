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
  el.textContent = st === 'burn' ? '🔥' : st === 'para' ? '⚡' : st === 'conf' ? '💜' : '';
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

function playHit() {
  try {
    const ctx = getAC(), now = ctx.currentTime;
    // Sharp crack — loud white noise envelope
    const bufLen = Math.floor(ctx.sampleRate * 0.18);
    const buf = ctx.createBuffer(1, bufLen, ctx.sampleRate);
    const d = buf.getChannelData(0);
    for (let i = 0; i < bufLen; i++) d[i] = (Math.random()*2-1) * Math.pow(1 - i/bufLen, 0.4);
    const src = ctx.createBufferSource(); src.buffer = buf;
    const g = ctx.createGain();
    g.gain.setValueAtTime(0.75, now);
    g.gain.exponentialRampToValueAtTime(0.001, now+0.18);
    src.connect(g); g.connect(ctx.destination); src.start(now);
    // Mid-punch square wave
    const osc = ctx.createOscillator(), g2 = ctx.createGain();
    osc.type = 'square';
    osc.frequency.setValueAtTime(220, now);
    osc.frequency.exponentialRampToValueAtTime(55, now+0.14);
    g2.gain.setValueAtTime(0.5, now);
    g2.gain.exponentialRampToValueAtTime(0.001, now+0.14);
    osc.connect(g2); g2.connect(ctx.destination);
    osc.start(now); osc.stop(now+0.16);
  } catch(e) {}
}

function playMoveSound(type) {
  try {
    const ctx = getAC(), now = ctx.currentTime;
    const osc = ctx.createOscillator(), g = ctx.createGain();
    osc.connect(g); g.connect(ctx.destination);
    switch(type) {
      case 'fire':
        osc.type='sawtooth';
        osc.frequency.setValueAtTime(320,now); osc.frequency.exponentialRampToValueAtTime(75,now+0.38);
        g.gain.setValueAtTime(0.18,now); g.gain.exponentialRampToValueAtTime(0.001,now+0.38);
        osc.start(now); osc.stop(now+0.42); break;
      case 'electric':
        osc.type='square';
        osc.frequency.setValueAtTime(1200,now); osc.frequency.setValueAtTime(800,now+0.04);
        osc.frequency.setValueAtTime(1600,now+0.09); osc.frequency.exponentialRampToValueAtTime(200,now+0.3);
        g.gain.setValueAtTime(0.14,now); g.gain.exponentialRampToValueAtTime(0.001,now+0.3);
        osc.start(now); osc.stop(now+0.35); break;
      case 'dragon':
        osc.type='sawtooth';
        osc.frequency.setValueAtTime(90,now); osc.frequency.exponentialRampToValueAtTime(35,now+0.5);
        g.gain.setValueAtTime(0.22,now); g.gain.exponentialRampToValueAtTime(0.001,now+0.5);
        osc.start(now); osc.stop(now+0.55); break;
      case 'ground':
        osc.type='sine';
        osc.frequency.setValueAtTime(60,now); osc.frequency.exponentialRampToValueAtTime(18,now+0.35);
        g.gain.setValueAtTime(0.3,now); g.gain.exponentialRampToValueAtTime(0.001,now+0.35);
        osc.start(now); osc.stop(now+0.4); break;
      case 'rock':
        osc.type='sawtooth';
        osc.frequency.setValueAtTime(220,now); osc.frequency.exponentialRampToValueAtTime(55,now+0.28);
        g.gain.setValueAtTime(0.2,now); g.gain.exponentialRampToValueAtTime(0.001,now+0.28);
        osc.start(now); osc.stop(now+0.32); break;
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
  playMoveSound('fire');
  await lunge(atkSide);
  const ba = R.ba;
  const ap = sc(atkSide);
  const flare = tmp({ left:(ap.x-10)+'px', top:(ap.y-10)+'px', width:'20px', height:'20px',
    borderRadius:'50%', background:'radial-gradient(circle,#ff8c00,#c83200)',
    boxShadow:'0 0 18px #ff6a00', transition:'all .42s ease', opacity:'0.95' });
  ba.appendChild(flare);
  await sleep(20);
  flare.style.width='500px'; flare.style.height='500px';
  flare.style.left=(ap.x-250)+'px'; flare.style.top=(ap.y-250)+'px';
  flare.style.opacity='0';
  await sleep(420);
  flare.remove();
  for (let i = 0; i < 7; i++) {
    const e = tmp({ width:'5px', height:'5px', borderRadius:'1px',
      background: i%2 ? '#ff6a00' : '#ff3200',
      left:(ap.x+(Math.random()-.5)*40)+'px', top:ap.y+'px',
      transition:`all ${.28+Math.random()*.25}s ease` });
    ba.appendChild(e);
    await sleep(10);
    e.style.transform=`translate(${(Math.random()-.5)*100}px,${-70-Math.random()*90}px)`;
    e.style.opacity='0';
    setTimeout(() => e.remove(), 550);
  }
  await flashSprite(defSide);
  await shakePanel();
}

async function anim_FusionFlare(atkSide, defSide, powered) {
  playMoveSound('fire');
  const ba = R.ba;
  if (powered) {
    const fl = tmp({ inset:'0', background:'rgba(255,255,200,.85)', zIndex:'8', transition:'opacity .2s' });
    ba.appendChild(fl); await sleep(200); fl.style.opacity='0'; await sleep(200); fl.remove();
  }
  await lunge(atkSide);
  const ap = sc(atkSide), dp = sc(defSide);
  const dx = dp.x - ap.x, dy = dp.y - ap.y;
  const angle = Math.atan2(dy, dx) * 180 / Math.PI;
  const dist  = Math.sqrt(dx*dx + dy*dy);
  const bh = powered ? '16px' : '5px';
  const beam = tmp({ left:ap.x+'px', top:ap.y+'px', width:'0', height:bh,
    background:'#fff', boxShadow:'0 0 14px #fff9c4',
    transformOrigin:'left center',
    transform:`rotate(${angle}deg) translateY(-50%)`,
    transition:'width .28s ease' });
  ba.appendChild(beam); await sleep(20); beam.style.width=dist+'px';
  await sleep(320);
  const defImg = defSide==='opp' ? R.oppSprite : R.playerSprite;
  defImg.style.filter='drop-shadow(0 0 24px rgba(255,250,160,.9)) brightness(2.5)';
  await sleep(280); defImg.style.filter='';
  beam.remove();
  await flashSprite(defSide); await shakePanel();
}

async function anim_DracoMeteor(atkSide, defSide) {
  playMoveSound('dragon');
  const ba = R.ba;
  const dp = sc(defSide);
  const meteors = [];
  for (let i = 0; i < 4; i++) {
    const mx = dp.x - 20 + Math.random()*50;
    const m = tmp({ width:'16px', height:'16px', borderRadius:'50%',
      background:'radial-gradient(circle,#fff 0%,#ff9800 55%,transparent 100%)',
      top:'-20px', left:mx+'px',
      transition:`top ${.4+i*.07}s ease-in` });
    ba.appendChild(m); meteors.push({ el:m, x:mx });
  }
  await sleep(30);
  meteors.forEach(({ el, x }, i) => {
    setTimeout(async () => {
      el.style.top = dp.y+'px';
      await sleep(460 + i*70);
      const fl = tmp({ width:'22px', height:'22px', borderRadius:'50%',
        background:'rgba(255,255,255,.85)', top:(dp.y-11)+'px', left:(x-5)+'px', transition:'opacity .18s' });
      ba.appendChild(fl); await sleep(20); fl.style.opacity='0';
      setTimeout(() => { fl.remove(); el.remove(); }, 220);
    }, i*110);
  });
  await sleep(760); await flashSprite(defSide); await shakePanel();
}

async function anim_EarthPower(atkSide, defSide) {
  playMoveSound('ground');
  const ba = R.ba;
  await lunge(atkSide);
  const dp = sc(defSide);
  const groundY = dp.y + dp.h * 0.3;
  for (let i = 0; i < 3; i++) {
    const c = tmp({ height:'2px', width:'0', background:'#7a5010',
      top:groundY+'px', left:dp.x+'px', transformOrigin:'left center',
      transform:`rotate(${(i-1)*22}deg)`, transition:'width .22s ease' });
    ba.appendChild(c);
    setTimeout(() => { c.style.width='130px'; }, 20+i*40);
    setTimeout(() => { c.style.opacity='0'; setTimeout(()=>c.remove(),200); }, 600);
  }
  for (let i = 0; i < 7; i++) {
    const d = tmp({ width:'5px', height:'5px',
      background: i%2 ? '#c8a060' : '#8b6010',
      top:groundY+'px', left:(dp.x+(Math.random()-.5)*60)+'px',
      transition:`all ${.32+Math.random()*.22}s ease` });
    ba.appendChild(d);
    setTimeout(() => {
      d.style.transform=`translate(${(Math.random()-.5)*90}px,${-55-Math.random()*70}px)`;
      d.style.opacity='0'; setTimeout(()=>d.remove(),560);
    }, 30+i*28);
  }
  await sleep(440); await flashSprite(defSide); await shakePanel();
}

async function anim_BoltStrike(atkSide, defSide) {
  playMoveSound('electric');
  const ba = R.ba;
  await lunge(atkSide, 55);
  const ap = sc(atkSide), dp = sc(defSide);
  const minX = Math.min(ap.x,dp.x)-40, minY = Math.min(ap.y,dp.y)-40;
  const w = Math.abs(dp.x-ap.x)+80,  h = Math.abs(dp.y-ap.y)+80;
  for (let f = 0; f < 3; f++) {
    const svg = document.createElementNS('http://www.w3.org/2000/svg','svg');
    svg.setAttribute('width', w); svg.setAttribute('height', h);
    svg.style.cssText=`position:absolute;left:${minX}px;top:${minY}px;z-index:6;pointer-events:none;`;
    const x1=ap.x-minX, y1=ap.y-minY, x2=dp.x-minX, y2=dp.y-minY;
    const pts=[[x1,y1]];
    for (let i=1;i<8;i++) {
      pts.push([ x1+(x2-x1)*(i/8)+(Math.random()-.5)*45, y1+(y2-y1)*(i/8)+(Math.random()-.5)*20 ]);
    }
    pts.push([x2,y2]);
    const pl=document.createElementNS('http://www.w3.org/2000/svg','polyline');
    pl.setAttribute('points',pts.map(p=>p.join(',')).join(' '));
    pl.setAttribute('stroke','#64b4ff'); pl.setAttribute('stroke-width','4');
    pl.setAttribute('fill','none'); pl.setAttribute('stroke-linecap','round');
    svg.appendChild(pl);
    const pl2=pl.cloneNode();
    pl2.setAttribute('stroke','#c8e8ff'); pl2.setAttribute('stroke-width','1.5'); pl2.setAttribute('opacity','0.6');
    svg.appendChild(pl2);
    ba.appendChild(svg);
    await sleep(80); svg.remove(); await sleep(45);
  }
  const fl=tmp({ inset:'0', background:'rgba(100,180,255,.28)', zIndex:'7', transition:'opacity .15s' });
  ba.appendChild(fl); await sleep(150); fl.style.opacity='0'; setTimeout(()=>fl.remove(),160);
  await flashSprite(defSide); await shakePanel();
}

async function anim_FusionBolt(atkSide, defSide, powered) {
  playMoveSound('electric');
  const ba = R.ba;
  const atkImg = atkSide==='player' ? R.playerSprite : R.oppSprite;
  for (let i=0;i<3;i++) {
    atkImg.style.filter='brightness(2.2) drop-shadow(0 0 18px #64b4ff)';
    await sleep(110); atkImg.style.filter=''; await sleep(90);
  }
  const ap=sc(atkSide), dp=sc(defSide);
  const orbSize = powered ? '36px' : '14px';
  const orb=tmp({ width:orbSize, height:orbSize, borderRadius:'50%',
    background:'radial-gradient(circle,#fff 0%,#64b4ff 65%,transparent 100%)',
    boxShadow:'0 0 20px #64b4ff',
    left:ap.x+'px', top:ap.y+'px', transform:'translate(-50%,-50%)',
    transition:'left .32s ease, top .32s ease' });
  ba.appendChild(orb);
  const trails=[];
  if (powered) {
    for (let i=0;i<4;i++) {
      const t=tmp({ width:'9px', height:'9px', borderRadius:'50%', background:'#4090d8',
        left:ap.x+'px', top:ap.y+'px', transform:'translate(-50%,-50%)', opacity:'0.65',
        transition:`left ${.32+i*.05}s ease, top ${.32+i*.05}s ease` });
      ba.appendChild(t); trails.push(t);
    }
  }
  await sleep(20);
  orb.style.left=dp.x+'px'; orb.style.top=dp.y+'px';
  trails.forEach((t,i)=>setTimeout(()=>{t.style.left=dp.x+'px';t.style.top=dp.y+'px';t.style.opacity='0';},i*55));
  await sleep(360); orb.remove(); trails.forEach(t=>t.remove());
  for (let i=0;i<8;i++) {
    const ang=(i/8)*Math.PI*2;
    const s=tmp({ width:'2px', height:'14px', background:'#64b4ff',
      left:dp.x+'px', top:dp.y+'px', transform:`translate(-50%,-50%) rotate(${ang}rad) scaleY(0)`,
      transformOrigin:'center center', transition:'transform .18s ease, opacity .18s' });
    ba.appendChild(s);
    setTimeout(()=>{ s.style.transform=`translate(-50%,-50%) rotate(${ang}rad) scaleY(1)`;
      setTimeout(()=>{s.style.opacity='0';setTimeout(()=>s.remove(),200);},200);},15);
  }
  await flashSprite(defSide); await shakePanel(); await sleep(200);
}

async function anim_Outrage(atkSide, defSide, consecutive) {
  playMoveSound('dragon');
  const ba = R.ba;
  await lunge(atkSide, 60);
  const rp=tmp({ inset:'0', boxShadow:'inset 0 0 60px red', zIndex:'7', transition:'opacity .2s' });
  ba.appendChild(rp); await sleep(220);
  if (consecutive >= 1) {
    rp.style.opacity='0'; await sleep(120); rp.style.opacity='1'; await sleep(200);
    const atkImg=atkSide==='player' ? R.playerSprite : R.oppSprite;
    for (let i=0;i<5;i++) { atkImg.style.transform=`translateX(${i%2?6:-6}px)`; await sleep(55); }
    atkImg.style.transform='';
  }
  rp.style.opacity='0'; setTimeout(()=>rp.remove(),220);
  await flashSprite(defSide); await shakePanel();
}

async function anim_RockSlide(atkSide, defSide) {
  playMoveSound('rock');
  const ba = R.ba;
  const dp = sc(defSide);
  for (let i=0;i<3;i++) {
    setTimeout(async()=>{
      const bx = dp.x - 20 + Math.random()*50;
      const b=tmp({ width:'22px', height:'17px', borderRadius:'4px',
        background:'radial-gradient(circle at 30% 30%,#bbb,#666)',
        top:'-20px', left:bx+'px',
        transform:`rotate(${Math.random()*30-15}deg)`,
        transition:`top ${.42+i*.06}s ease-in` });
      ba.appendChild(b); await sleep(20); b.style.top=dp.y+'px';
      await sleep(480+i*65); b.remove();
      for (let d=0;d<4;d++) {
        const ds=tmp({ width:'5px', height:'5px', background:'#999',
          top:dp.y+'px', left:(bx+Math.random()*30)+'px', transition:'all .28s ease' });
        ba.appendChild(ds);
        setTimeout(()=>{
          ds.style.transform=`translate(${(Math.random()-.5)*55}px,${-Math.random()*28}px)`;
          ds.style.opacity='0'; setTimeout(()=>ds.remove(),300);
        },15);
      }
    }, i*120);
  }
  await sleep(760); await flashSprite(defSide); await shakePanel();
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
    nums.textContent = side==='player' ? data.hp+'/'+data.hp : '';

    hpsec.appendChild(hprow); hpsec.appendChild(nums);
    box.appendChild(nr); box.appendChild(hpsec);
    sec.appendChild(box); return sec;
  }

  ba.appendChild(makeInfoBox(oData,'opp'));
  ba.appendChild(makeInfoBox(pData,'player'));

  const osw = document.createElement('div'); osw.className='pb-opp-sprite-wrap';
  const osi = document.createElement('img'); osi.className='pb-opp-sprite'; osi.src=oData.front;
  osw.appendChild(osi); ba.appendChild(osw);

  const psw = document.createElement('div'); psw.className='pb-player-sprite-wrap';
  const psi = document.createElement('img'); psi.className='pb-player-sprite'; psi.src=pData.back;
  psw.appendChild(psi); ba.appendChild(psw);

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
    const rt  = document.createElement('div');   rt.className='pb-move-right';
    const tp  = document.createElement('span');  tp.className=`pb-move-type pb-type-${mv.type}`; tp.textContent=mv.type;
    const pp  = document.createElement('span');  pp.className='pb-move-pp'; pp.textContent=`PP ${mv.curPP}/${mv.pp}`;
    rt.appendChild(tp); rt.appendChild(pp);
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

// ── Trigger ─────────────────────────────────────────────────────────────────

let clicks = 0, clickTimer = null;

function initTrigger() {
  const wrap = document.querySelector('.hero-zekrom');
  if (!wrap) return;

  if (getComputedStyle(wrap).position === 'static') wrap.style.position = 'relative';

  const ball = document.createElement('div');
  ball.className = 'pb-hero-ball';
  ball.id = 'pb-hero-ball';
  wrap.appendChild(ball);

  wrap.addEventListener('mouseenter', () => ball.classList.add('pb-ball-visible'));
  wrap.addEventListener('mouseleave', () => ball.classList.remove('pb-ball-visible'));

  wrap.querySelectorAll('.hz-light,.hz-dark').forEach(img => {
    img.style.cursor = 'pointer';
    img.addEventListener('click', onGifClick);
  });
  document.addEventListener('keydown', e => { if(e.key==='Escape') closeBattle(); });
}

function onGifClick() {
  try { getAC(); } catch(e) {}
  clicks++;
  const ball = document.getElementById('pb-hero-ball');

  if (clicks >= 5) {
    clicks = 0;
    clearTimeout(clickTimer);
    if (ball) {
      ball.classList.remove('pb-ball-rock');
      ball.classList.add('pb-ball-open');
      setTimeout(startBattle, 450);
    } else {
      startBattle();
    }
    return;
  }

  // Rock the ball on each click (restart animation)
  if (ball) {
    ball.classList.remove('pb-ball-rock');
    void ball.offsetWidth;
    ball.classList.add('pb-ball-rock');
    setTimeout(() => ball.classList.remove('pb-ball-rock'), 700);
  }

  clearTimeout(clickTimer);
  clickTimer = setTimeout(() => {
    clicks = 0;
    const b = document.getElementById('pb-hero-ball');
    if (b) {
      const vis = b.classList.contains('pb-ball-visible');
      b.className = 'pb-hero-ball' + (vis ? ' pb-ball-visible' : '');
    }
  }, 5000);
}

function startBattle() {
  if (document.getElementById('pb-overlay')) return;
  const ball = document.getElementById('pb-hero-ball');
  if (ball) ball.className = 'pb-hero-ball';
  const isDark = document.documentElement.getAttribute('data-theme') === 'dark';
  const pKey   = isDark ? 'zekrom'   : 'reshiram';
  const oKey   = isDark ? 'reshiram' : 'zekrom';
  initState(pKey, oKey);
  buildUI(pKey, oKey);
  startBattleMusic();
  runBattle();
}

function closeBattle() {
  stopBattleMusic();
  const ov = document.getElementById('pb-overlay');
  if (ov) ov.remove();
  document.querySelectorAll('.pb-pokehint,.pb-sparkle').forEach(e => e.remove());
  S = null; R = {};
}

// ── Public init ─────────────────────────────────────────────────────────────

function initPokemonBattle() { initTrigger(); }
window.initPokemonBattle = initPokemonBattle;

})();
