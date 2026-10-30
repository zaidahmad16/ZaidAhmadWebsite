/* pb/data.js — Pokémon Black/White data for the N's Castle battle easter egg.
   Stats and learnsets: PokeAPI. N's movesets (Lv 52, no item): Serebii N's Castle page.
   Battle text: the English Black message files (projectpokemon.org rawdb, msg 13/14/15/18). */
(function (root) {
'use strict';

var SPRITES = 'https://raw.githubusercontent.com/PokeAPI/sprites/master/sprites/';
var BW = SPRITES + 'pokemon/versions/generation-v/black-white/animated/';
var CRIES = 'https://raw.githubusercontent.com/PokeAPI/cries/main/cries/pokemon/legacy/';

var SPECIES = {
  reshiram: {
    id: 643, name: 'RESHIRAM', types: ['dragon', 'fire'],
    base: { hp: 100, atk: 120, def: 100, spa: 150, spd: 120, spe: 90 },
    ability: 'Turboblaze', aura: 'a blazing aura!',
    baseExp: 306, growth: 'slow', color: '#f0a050',
  },
  zekrom: {
    id: 644, name: 'ZEKROM', types: ['dragon', 'electric'],
    base: { hp: 100, atk: 150, def: 120, spa: 120, spd: 100, spe: 90 },
    ability: 'Teravolt', aura: 'a bursting aura!',
    baseExp: 306, growth: 'slow', color: '#5b9af5',
  },
};
Object.keys(SPECIES).forEach(function (k) {
  var s = SPECIES[k];
  s.front = BW + s.id + '.gif';
  s.back = BW + 'back/' + s.id + '.gif';
  s.icon = SPRITES + 'pokemon/' + s.id + '.png';
  s.cry = CRIES + s.id + '.ogg';
});

// effect: para30 | flinch10 | flinch20 | recharge | reflect | lightscreen | fusion
var MOVES = {
  'fusion-flare':  { name: 'Fusion Flare',  type: 'fire',     cat: 'special',  pow: 100, acc: 100, pp: 5,  effect: 'fusion', partner: 'fusion-bolt' },
  'fusion-bolt':   { name: 'Fusion Bolt',   type: 'electric', cat: 'physical', pow: 100, acc: 100, pp: 5,  effect: 'fusion', partner: 'fusion-flare', contact: false },
  'dragon-breath': { name: 'Dragon Breath', type: 'dragon',   cat: 'special',  pow: 60,  acc: 100, pp: 20, effect: 'para30' },
  'slash':         { name: 'Slash',         type: 'normal',   cat: 'physical', pow: 70,  acc: 100, pp: 20, crit: 1 },
  'extrasensory':  { name: 'Extrasensory',  type: 'psychic',  cat: 'special',  pow: 80,  acc: 100, pp: 20, effect: 'flinch10' },
  'zen-headbutt':  { name: 'Zen Headbutt',  type: 'psychic',  cat: 'physical', pow: 80,  acc: 90,  pp: 15, effect: 'flinch20' },
  'hyper-beam':    { name: 'Hyper Beam',    type: 'normal',   cat: 'special',  pow: 150, acc: 90,  pp: 5,  effect: 'recharge' },
  'giga-impact':   { name: 'Giga Impact',   type: 'normal',   cat: 'physical', pow: 150, acc: 90,  pp: 5,  effect: 'recharge' },
  'reflect':       { name: 'Reflect',       type: 'psychic',  cat: 'status',   pow: 0,   acc: 0,   pp: 20, effect: 'reflect' },
  'light-screen':  { name: 'Light Screen',  type: 'psychic',  cat: 'status',   pow: 0,   acc: 0,   pp: 30, effect: 'lightscreen' },
  'struggle':      { name: 'Struggle',      type: 'typeless', cat: 'physical', pow: 50,  acc: 0,   pp: 1,  effect: 'struggle' },
};

// Your legendary: the wild Lv 50 one caught at N's Castle knows its last four level-up moves.
// N's ace: Lv 52, his real castle moveset.
var SETS = {
  player: {
    reshiram: ['fusion-flare', 'dragon-breath', 'slash', 'extrasensory'],
    zekrom:   ['fusion-bolt', 'dragon-breath', 'slash', 'zen-headbutt'],
  },
  n: {
    reshiram: ['fusion-flare', 'extrasensory', 'hyper-beam', 'reflect'],
    zekrom:   ['fusion-bolt', 'zen-headbutt', 'giga-impact', 'light-screen'],
  },
};

// Only the rows these six move types can need against Dragon/Fire and Dragon/Electric.
var TYPE_CHART = {
  dragon:   { dragon: 2 },
  fire:     { dragon: 0.5, fire: 0.5 },
  electric: { dragon: 0.5, electric: 0.5 },
  psychic:  {},
  normal:   {},
  typeless: {},
};

var NATURES = [
  ['Hardy'], ['Lonely', 'atk', 'def'], ['Brave', 'atk', 'spe'], ['Adamant', 'atk', 'spa'], ['Naughty', 'atk', 'spd'],
  ['Bold', 'def', 'atk'], ['Docile'], ['Relaxed', 'def', 'spe'], ['Impish', 'def', 'spa'], ['Lax', 'def', 'spd'],
  ['Timid', 'spe', 'atk'], ['Hasty', 'spe', 'def'], ['Serious'], ['Jolly', 'spe', 'spa'], ['Naive', 'spe', 'spd'],
  ['Modest', 'spa', 'atk'], ['Mild', 'spa', 'def'], ['Quiet', 'spa', 'spe'], ['Bashful'], ['Rash', 'spa', 'spd'],
  ['Calm', 'spd', 'atk'], ['Gentle', 'spd', 'def'], ['Sassy', 'spd', 'spe'], ['Careful', 'spd', 'spa'], ['Quirky'],
];

// Gen 5 bag. pocket: 0 HP/PP Restore, 1 Status Restore, 2 Poké Balls, 3 Battle Items.
var ITEMS = {
  'full-restore': { name: 'Full Restore', pocket: 0, count: 1, kind: 'heal', amount: Infinity, cure: true,
                    desc: 'Fully restores the HP and heals any status problems of a single Pokémon.' },
  'hyper-potion': { name: 'Hyper Potion', pocket: 0, count: 2, kind: 'heal', amount: 200,
                    desc: 'Restores the HP of one Pokémon by 200 points.' },
  'revive':       { name: 'Revive',       pocket: 0, count: 1, kind: 'revive',
                    desc: 'Revives a fainted Pokémon and restores half its maximum HP.' },
  'full-heal':    { name: 'Full Heal',    pocket: 1, count: 1, kind: 'cure',
                    desc: 'Heals all the status problems of a single Pokémon.' },
  'poke-ball':    { name: 'Poké Ball',    pocket: 2, count: 5, kind: 'ball',
                    desc: 'A device for catching wild Pokémon. It is thrown like a ball at a Pokémon.' },
  'x-attack':     { name: 'X Attack',     pocket: 3, count: 1, kind: 'stat', stat: 'atk',
                    desc: 'Raises the Attack stat of a Pokémon in battle.' },
  'x-special':    { name: 'X Special',    pocket: 3, count: 1, kind: 'stat', stat: 'spa', sprite: 'x-sp-atk',
                    desc: 'Raises the Sp. Atk stat of a Pokémon in battle.' },
  'x-speed':      { name: 'X Speed',      pocket: 3, count: 1, kind: 'stat', stat: 'spe',
                    desc: 'Raises the Speed stat of a Pokémon in battle.' },
  'dire-hit':     { name: 'Dire Hit',     pocket: 3, count: 1, kind: 'crit',
                    desc: 'Raises the critical-hit ratio of a Pokémon in battle.' },
};
Object.keys(ITEMS).forEach(function (k) {
  ITEMS[k].icon = SPRITES + 'items/' + (ITEMS[k].sprite || k) + '.png';
});
var POCKETS = ['HP/PP Restore', 'Status Restore', 'Poké Balls', 'Battle Items'];

var STAT_NAMES = { atk: 'Attack', def: 'Defense', spa: 'Special Attack', spd: 'Special Defense', spe: 'Speed' };

root.PB = root.PB || {};
root.PB.data = {
  SPECIES: SPECIES, MOVES: MOVES, SETS: SETS, TYPE_CHART: TYPE_CHART, NATURES: NATURES,
  ITEMS: ITEMS, POCKETS: POCKETS, STAT_NAMES: STAT_NAMES,
  PLAYER: 'You', RIVAL: 'N',
  N_LEVEL: 52, PLAYER_LEVEL: 50,
  N_IV: 30, // assumed: Gen 5 trainer IVs come from the trainer's AI level; N's is near max
  TRAINER_SPRITE: 'static/images/pb/n.png',
  BALL_SPRITE: SPRITES + 'items/poke-ball.png',
};
})(typeof window !== 'undefined' ? window : globalThis);
