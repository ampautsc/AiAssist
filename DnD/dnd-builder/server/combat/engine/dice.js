/**
 * Dice Engine — deterministic-capable dice for combat simulation
 * 
 * Modes:
 *   'random'  — standard Math.random() rolls (default)
 *   'average' — returns (sides/2) + 0.5 for deterministic testing
 *   'fixed'   — d20() pops values from a queue (setFixedRolls); other dice
 *               use the mode that was active before setFixedRolls was called
 *   'seeded'  — all dice use a deterministic PRNG seeded by
 *               HMAC-SHA256(serverSecret, clientSeed). Neither side alone
 *               can predict or control the outcome (commit-reveal fairness).
 * 
 * Extracted from run-combat-sim.js to be shared across the combat system.
 */

const crypto = require('crypto');

let _diceMode = 'random';
let _modeBeforeFixed = 'random'; // restored when queue empties or clearFixedRolls() called
let _fixedQueue = [];           // consumable d20 values for 'fixed' mode
let _modeBeforeSeeded = 'random'; // restored when clearSeed() called

// ── Seeded PRNG state ─────────────────────────────────────────────────────────
let _seededState = null; // { combinedSeed: Buffer, counter: number }

/**
 * Generate a cryptographic commitment for the commit-reveal protocol.
 * Server calls this BEFORE the client provides their seed.
 * @returns {{ serverSecret: string, commitment: string }}
 *   serverSecret — hex string, kept private until reveal phase
 *   commitment   — SHA-256 hash of serverSecret, safe to send to client
 */
function generateCommitment() {
  const serverSecret = crypto.randomBytes(32).toString('hex');
  const commitment = crypto.createHash('sha256').update(serverSecret).digest('hex');
  return { serverSecret, commitment };
}

/**
 * Verify that a serverSecret matches a previously-sent commitment.
 * Client can call this after reveal to prove the server didn't cheat.
 * @param {string} serverSecret
 * @param {string} commitment
 * @returns {boolean}
 */
function verifyCommitment(serverSecret, commitment) {
  const expected = crypto.createHash('sha256').update(serverSecret).digest('hex');
  return expected === commitment;
}

/**
 * Activate seeded mode. Combines server and client entropy via HMAC-SHA256.
 * All subsequent d*() calls use the deterministic PRNG until clearSeed().
 * @param {string} serverSecret — hex string from generateCommitment()
 * @param {string} clientSeed   — string from client (e.g. timestamp)
 */
function applySeed(serverSecret, clientSeed) {
  const combinedSeed = crypto.createHmac('sha256', serverSecret)
    .update(String(clientSeed))
    .digest();
  _seededState = { combinedSeed, counter: 0 };
  _modeBeforeSeeded = _diceMode === 'fixed' ? _modeBeforeFixed : _diceMode;
  _diceMode = 'seeded';
}

/**
 * Clear seeded mode and revert to the previous mode.
 */
function clearSeed() {
  _seededState = null;
  if (_diceMode === 'seeded') _diceMode = _modeBeforeSeeded;
}

/**
 * Generate a deterministic random float [0, 1) from the seeded state.
 * Uses HMAC-SHA256(combinedSeed, counter) → first 4 bytes → uint32 / 2^32.
 * @returns {number} [0, 1)
 */
function _seededRandom() {
  if (!_seededState) throw new Error('Seeded PRNG not initialized — call applySeed() first');
  const hash = crypto.createHmac('sha256', _seededState.combinedSeed)
    .update(String(_seededState.counter++))
    .digest();
  // Use first 4 bytes as uint32, divide by 2^32 for [0, 1)
  const uint32 = hash.readUInt32BE(0);
  return uint32 / 0x100000000;
}

function setDiceMode(mode) {
  if (mode !== 'random' && mode !== 'average') {
    throw new Error(`Invalid dice mode: ${mode}. Must be 'random' or 'average'. Use setFixedRolls() for fixed mode.`);
  }
  _diceMode = mode;
  _fixedQueue = [];        // always clear any leftover fixed queue
  _modeBeforeFixed = mode; // anchor so any stale reference is also reset
  _modeBeforeSeeded = mode;
  _seededState = null;
}

function getDiceMode() { return _diceMode; }

/**
 * Load a sequence of d20 values to return in order.
 * Mode automatically becomes 'fixed'; other dice continue using the
 * current mode as a fallback. Mode reverts when the queue empties.
 * @param {number[]} rolls - array of d20 values (1-20)
 */
function setFixedRolls(rolls) {
  if (_diceMode !== 'fixed') _modeBeforeFixed = _diceMode;
  _fixedQueue = Array.isArray(rolls) ? [...rolls] : [];
  _diceMode = 'fixed';
}

/** Return a copy of the unconsumed fixed queue (useful for persisting state). */
function getRemainingFixedRolls() {
  return [..._fixedQueue];
}

/** Clear fixed queue and restore the mode that was active before setFixedRolls. */
function clearFixedRolls() {
  _fixedQueue = [];
  if (_diceMode === 'fixed') {
    if (_modeBeforeFixed === 'seeded' && !_seededState) {
      _diceMode = _modeBeforeSeeded;
    } else {
      _diceMode = _modeBeforeFixed;
    }
  }
}

/** The non-fixed mode to use for all dice. When in 'fixed' mode, falls back to modeBeforeFixed. */
function _effectiveMode() {
  if (_diceMode === 'seeded') {
    return _seededState ? 'seeded' : _modeBeforeSeeded;
  }
  const base = _diceMode === 'fixed' ? _modeBeforeFixed : _diceMode;
  if (base === 'seeded' && !_seededState) return _modeBeforeSeeded;
  return base;
}

/** Get a [0,1) random float using the current effective mode's source. */
function _random() {
  const mode = _effectiveMode();
  return mode === 'seeded' ? _seededRandom() : Math.random();
}

function d20() {
  if (_diceMode === 'fixed' && _fixedQueue.length > 0) {
    const val = _fixedQueue.shift();
    if (_fixedQueue.length === 0) {
      _diceMode = (_modeBeforeFixed === 'seeded' && !_seededState)
        ? _modeBeforeSeeded
        : _modeBeforeFixed; // revert when exhausted
    }
    return Math.max(1, Math.min(20, Math.floor(val)));  // clamp & floor to valid d20 range
  }
  const mode = _effectiveMode();
  return mode === 'average' ? 10.5 : Math.floor(_random() * 20) + 1;
}
function d12() { const m = _effectiveMode(); return m === 'average' ? 6.5  : Math.floor(_random() * 12) + 1; }
function d10() { const m = _effectiveMode(); return m === 'average' ? 5.5  : Math.floor(_random() * 10) + 1; }
function d8()  { const m = _effectiveMode(); return m === 'average' ? 4.5  : Math.floor(_random() * 8)  + 1; }
function d6()  { const m = _effectiveMode(); return m === 'average' ? 3.5  : Math.floor(_random() * 6)  + 1; }
function d4()  { const m = _effectiveMode(); return m === 'average' ? 2.5  : Math.floor(_random() * 4)  + 1; }

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
  setFixedRolls, getRemainingFixedRolls, clearFixedRolls,
  generateCommitment, verifyCommitment, applySeed, clearSeed,
  d20, d12, d10, d8, d6, d4,
  dieFns,
  rollDice, parseDiceAndRoll,
  rollWithAdvantage, rollWithDisadvantage,
};
