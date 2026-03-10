/**
 * Dice Engine — deterministic-capable dice for combat simulation
 * 
 * Modes:
 *   'random'  — standard Math.random() rolls (default)
 *   'average' — returns (sides/2) + 0.5 for deterministic testing
 * 
 * Extracted from run-combat-sim.js to be shared across the combat system.
 */

let _diceMode = 'random';

function setDiceMode(mode) {
  if (mode !== 'random' && mode !== 'average') {
    throw new Error(`Invalid dice mode: ${mode}. Must be 'random' or 'average'.`);
  }
  _diceMode = mode;
}

function getDiceMode() { return _diceMode; }

function d20() { return _diceMode === 'average' ? 10.5 : Math.floor(Math.random() * 20) + 1; }
function d12() { return _diceMode === 'average' ? 6.5  : Math.floor(Math.random() * 12) + 1; }
function d10() { return _diceMode === 'average' ? 5.5  : Math.floor(Math.random() * 10) + 1; }
function d8()  { return _diceMode === 'average' ? 4.5  : Math.floor(Math.random() * 8)  + 1; }
function d6()  { return _diceMode === 'average' ? 3.5  : Math.floor(Math.random() * 6)  + 1; }
function d4()  { return _diceMode === 'average' ? 2.5  : Math.floor(Math.random() * 4)  + 1; }

/** Map of die size to function */
const dieFns = { 4: d4, 6: d6, 8: d8, 10: d10, 12: d12, 20: d20 };

/**
 * Roll count dice of a given die function.
 * @param {number} count 
 * @param {function} die — one of d4, d6, d8, d10, d12, d20
 * @returns {number[]} array of individual roll results
 */
function rollDice(count, die) {
  const rolls = [];
  for (let i = 0; i < count; i++) rolls.push(die());
  return rolls;
}

/**
 * Parse a dice string like "2d8" or "1d4" and roll it.
 * @param {string} diceStr — e.g. "2d8", "1d4", "3d10"
 * @returns {{ count: number, sides: number, rolls: number[], total: number }}
 */
function parseDiceAndRoll(diceStr) {
  const match = diceStr.match(/^(\d+)d(\d+)$/);
  if (!match) throw new Error(`Invalid dice string: ${diceStr}`);
  const count = parseInt(match[1]);
  const sides = parseInt(match[2]);
  const die = dieFns[sides];
  if (!die) throw new Error(`Unsupported die size: d${sides}`);
  const rolls = rollDice(count, die);
  return { count, sides, rolls, total: rolls.reduce((a, b) => a + b, 0) };
}

function rollWithAdvantage() {
  const r1 = d20(), r2 = d20();
  return { roll1: r1, roll2: r2, result: Math.max(r1, r2), type: 'advantage' };
}

function rollWithDisadvantage() {
  const r1 = d20(), r2 = d20();
  return { roll1: r1, roll2: r2, result: Math.min(r1, r2), type: 'disadvantage' };
}

module.exports = {
  setDiceMode, getDiceMode,
  d20, d12, d10, d8, d6, d4,
  dieFns,
  rollDice, parseDiceAndRoll,
  rollWithAdvantage, rollWithDisadvantage,
};
