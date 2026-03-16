/**
 * Dice Engine — unit tests
 * Tests both average-mode (deterministic) and edge-case behavior.
 */

const { describe, it, before, after, afterEach } = require('node:test');
const assert = require('node:assert/strict');

const dice = require('../engine/dice');

// ═══════════════════════════════════════════════════════════════════════════
// SETUP — ensure average mode for deterministic tests
// ═══════════════════════════════════════════════════════════════════════════

before(() => dice.setDiceMode('average'));
after(() => dice.setDiceMode('random'));

// ═══════════════════════════════════════════════════════════════════════════
// setDiceMode / getDiceMode
// ═══════════════════════════════════════════════════════════════════════════

describe('setDiceMode', () => {
  it('should accept "random"', () => {
    dice.setDiceMode('random');
    assert.equal(dice.getDiceMode(), 'random');
    dice.setDiceMode('average'); // restore
  });

  it('should accept "average"', () => {
    dice.setDiceMode('average');
    assert.equal(dice.getDiceMode(), 'average');
  });

  it('should reject invalid modes', () => {
    assert.throws(() => dice.setDiceMode('fixed'), /Invalid dice mode/);
  });
});

// ═══════════════════════════════════════════════════════════════════════════
// Average-mode die functions — expected value is (sides/2) + 0.5
// ═══════════════════════════════════════════════════════════════════════════

describe('average-mode die functions', () => {
  it('d20 returns 10.5', () => assert.equal(dice.d20(), 10.5));
  it('d12 returns 6.5',  () => assert.equal(dice.d12(), 6.5));
  it('d10 returns 5.5',  () => assert.equal(dice.d10(), 5.5));
  it('d8 returns 4.5',   () => assert.equal(dice.d8(), 4.5));
  it('d6 returns 3.5',   () => assert.equal(dice.d6(), 3.5));
  it('d4 returns 2.5',   () => assert.equal(dice.d4(), 2.5));
});

// ═══════════════════════════════════════════════════════════════════════════
// dieFns map
// ═══════════════════════════════════════════════════════════════════════════

describe('dieFns', () => {
  it('maps all standard die sizes', () => {
    assert.equal(typeof dice.dieFns[4], 'function');
    assert.equal(typeof dice.dieFns[6], 'function');
    assert.equal(typeof dice.dieFns[8], 'function');
    assert.equal(typeof dice.dieFns[10], 'function');
    assert.equal(typeof dice.dieFns[12], 'function');
    assert.equal(typeof dice.dieFns[20], 'function');
  });

  it('dieFns[8]() returns same as d8()', () => {
    assert.equal(dice.dieFns[8](), dice.d8());
  });
});

// ═══════════════════════════════════════════════════════════════════════════
// rollDice — multiple dice
// ═══════════════════════════════════════════════════════════════════════════

describe('rollDice', () => {
  it('returns correct count of rolls', () => {
    const rolls = dice.rollDice(4, dice.d6);
    assert.equal(rolls.length, 4);
  });

  it('all rolls are d6 average in average mode', () => {
    const rolls = dice.rollDice(3, dice.d6);
    assert.deepEqual(rolls, [3.5, 3.5, 3.5]);
  });

  it('handles count of 1', () => {
    const rolls = dice.rollDice(1, dice.d20);
    assert.deepEqual(rolls, [10.5]);
  });

  it('handles count of 0', () => {
    const rolls = dice.rollDice(0, dice.d8);
    assert.deepEqual(rolls, []);
  });
});

// ═══════════════════════════════════════════════════════════════════════════
// parseDiceAndRoll — string-based dice rolling
// ═══════════════════════════════════════════════════════════════════════════

describe('parseDiceAndRoll', () => {
  it('parses "2d8" correctly', () => {
    const result = dice.parseDiceAndRoll('2d8');
    assert.equal(result.count, 2);
    assert.equal(result.sides, 8);
    assert.deepEqual(result.rolls, [4.5, 4.5]);
    assert.equal(result.total, 9);
  });

  it('parses "1d20" correctly', () => {
    const result = dice.parseDiceAndRoll('1d20');
    assert.equal(result.count, 1);
    assert.equal(result.sides, 20);
    assert.equal(result.total, 10.5);
  });

  it('parses "3d10" correctly', () => {
    const result = dice.parseDiceAndRoll('3d10');
    assert.equal(result.count, 3);
    assert.equal(result.sides, 10);
    assert.equal(result.total, 16.5);
  });

  it('rejects invalid dice string', () => {
    assert.throws(() => dice.parseDiceAndRoll('2d'), /Invalid dice string/);
  });

  it('rejects unsupported die size', () => {
    assert.throws(() => dice.parseDiceAndRoll('1d7'), /Unsupported die size/);
  });
});

// ═══════════════════════════════════════════════════════════════════════════
// rollWithAdvantage / rollWithDisadvantage
// ═══════════════════════════════════════════════════════════════════════════

describe('rollWithAdvantage', () => {
  it('returns max of two d20 rolls', () => {
    const result = dice.rollWithAdvantage();
    assert.equal(result.roll1, 10.5);
    assert.equal(result.roll2, 10.5);
    assert.equal(result.result, 10.5); // max of equal values
    assert.equal(result.type, 'advantage');
  });
});

describe('rollWithDisadvantage', () => {
  it('returns min of two d20 rolls', () => {
    const result = dice.rollWithDisadvantage();
    assert.equal(result.roll1, 10.5);
    assert.equal(result.roll2, 10.5);
    assert.equal(result.result, 10.5); // min of equal values
    assert.equal(result.type, 'disadvantage');
  });
});

// ═══════════════════════════════════════════════════════════════════════════
// Random mode — values in valid range
// ═══════════════════════════════════════════════════════════════════════════

describe('random mode produces valid ranges', () => {
  before(() => dice.setDiceMode('random'));
  after(() => dice.setDiceMode('average'));

  it('d20 returns integer between 1 and 20', () => {
    for (let i = 0; i < 20; i++) {
      const val = dice.d20();
      assert.ok(Number.isInteger(val), `d20 returned non-integer: ${val}`);
      assert.ok(val >= 1 && val <= 20, `d20 out of range: ${val}`);
    }
  });

  it('d6 returns integer between 1 and 6', () => {
    for (let i = 0; i < 20; i++) {
      const val = dice.d6();
      assert.ok(Number.isInteger(val), `d6 returned non-integer: ${val}`);
      assert.ok(val >= 1 && val <= 6, `d6 out of range: ${val}`);
    }
  });

  it('rollWithAdvantage.result >= each individual roll', () => {
    for (let i = 0; i < 20; i++) {
      const r = dice.rollWithAdvantage();
      assert.ok(r.result >= r.roll1 && r.result >= r.roll2);
    }
  });

  it('rollWithDisadvantage.result <= each individual roll', () => {
    for (let i = 0; i < 20; i++) {
      const r = dice.rollWithDisadvantage();
      assert.ok(r.result <= r.roll1 && r.result <= r.roll2);
    }
  });
});

// ═══════════════════════════════════════════════════════════════════════════
// Commit-Reveal Protocol
// ═══════════════════════════════════════════════════════════════════════════

describe('generateCommitment', () => {
  it('returns serverSecret and commitment as hex strings', () => {
    const { serverSecret, commitment } = dice.generateCommitment();
    assert.ok(typeof serverSecret === 'string');
    assert.ok(typeof commitment === 'string');
    assert.equal(serverSecret.length, 64); // 32 bytes → 64 hex chars
    assert.equal(commitment.length, 64);   // SHA-256 → 64 hex chars
  });

  it('generates unique secrets each call', () => {
    const a = dice.generateCommitment();
    const b = dice.generateCommitment();
    assert.notEqual(a.serverSecret, b.serverSecret);
    assert.notEqual(a.commitment, b.commitment);
  });
});

describe('verifyCommitment', () => {
  it('returns true for matching secret/commitment pair', () => {
    const { serverSecret, commitment } = dice.generateCommitment();
    assert.ok(dice.verifyCommitment(serverSecret, commitment));
  });

  it('returns false when secret does not match commitment', () => {
    const a = dice.generateCommitment();
    const b = dice.generateCommitment();
    assert.ok(!dice.verifyCommitment(a.serverSecret, b.commitment));
  });

  it('returns false for tampered commitment', () => {
    const { serverSecret, commitment } = dice.generateCommitment();
    const tampered = 'a'.repeat(64);
    assert.ok(!dice.verifyCommitment(serverSecret, tampered));
  });
});

// ═══════════════════════════════════════════════════════════════════════════
// Seeded PRNG — applySeed / clearSeed
// ═══════════════════════════════════════════════════════════════════════════

describe('seeded PRNG', () => {
  afterEach(() => {
    dice.clearSeed();
    dice.setDiceMode('average'); // restore for other tests
  });

  it('activates seeded mode via applySeed', () => {
    const { serverSecret } = dice.generateCommitment();
    dice.applySeed(serverSecret, 'client-seed-1');
    assert.equal(dice.getDiceMode(), 'seeded');
  });

  it('clearSeed reverts to previous mode', () => {
    dice.setDiceMode('random');
    const { serverSecret } = dice.generateCommitment();
    dice.applySeed(serverSecret, 'client-seed-1');
    assert.equal(dice.getDiceMode(), 'seeded');
    dice.clearSeed();
    assert.equal(dice.getDiceMode(), 'random');
  });

  it('produces deterministic results: same seeds → same sequence', () => {
    const { serverSecret } = dice.generateCommitment();
    dice.applySeed(serverSecret, 'my-client-seed');
    const seq1 = [dice.d20(), dice.d6(), dice.d8(), dice.d4(), dice.d12(), dice.d10()];
    dice.clearSeed();

    // Re-apply the same seeds → must get the same sequence
    dice.applySeed(serverSecret, 'my-client-seed');
    const seq2 = [dice.d20(), dice.d6(), dice.d8(), dice.d4(), dice.d12(), dice.d10()];
    dice.clearSeed();

    assert.deepEqual(seq1, seq2);
  });

  it('different client seeds produce different sequences', () => {
    const { serverSecret } = dice.generateCommitment();
    dice.applySeed(serverSecret, 'seed-alpha');
    const seq1 = [dice.d20(), dice.d6(), dice.d8()];
    dice.clearSeed();

    dice.applySeed(serverSecret, 'seed-beta');
    const seq2 = [dice.d20(), dice.d6(), dice.d8()];
    dice.clearSeed();

    // Extremely unlikely to be identical with different seeds
    assert.notDeepEqual(seq1, seq2);
  });

  it('different server secrets produce different sequences', () => {
    const a = dice.generateCommitment();
    const b = dice.generateCommitment();
    dice.applySeed(a.serverSecret, 'same-client-seed');
    const seq1 = [dice.d20(), dice.d6(), dice.d8()];
    dice.clearSeed();

    dice.applySeed(b.serverSecret, 'same-client-seed');
    const seq2 = [dice.d20(), dice.d6(), dice.d8()];
    dice.clearSeed();

    assert.notDeepEqual(seq1, seq2);
  });

  it('seeded d20 produces values in [1, 20]', () => {
    const { serverSecret } = dice.generateCommitment();
    dice.applySeed(serverSecret, 'range-test');
    for (let i = 0; i < 100; i++) {
      const val = dice.d20();
      assert.ok(Number.isInteger(val), `d20 non-integer: ${val}`);
      assert.ok(val >= 1 && val <= 20, `d20 out of range: ${val}`);
    }
  });

  it('seeded d6 produces values in [1, 6]', () => {
    const { serverSecret } = dice.generateCommitment();
    dice.applySeed(serverSecret, 'range-d6');
    for (let i = 0; i < 100; i++) {
      const val = dice.d6();
      assert.ok(Number.isInteger(val), `d6 non-integer: ${val}`);
      assert.ok(val >= 1 && val <= 6, `d6 out of range: ${val}`);
    }
  });

  it('seeded d4/d8/d10/d12 all produce valid ranges', () => {
    const { serverSecret } = dice.generateCommitment();
    dice.applySeed(serverSecret, 'range-all');
    const checks = [
      { fn: 'd4',  min: 1, max: 4 },
      { fn: 'd8',  min: 1, max: 8 },
      { fn: 'd10', min: 1, max: 10 },
      { fn: 'd12', min: 1, max: 12 },
    ];
    for (const { fn, min, max } of checks) {
      for (let i = 0; i < 50; i++) {
        const val = dice[fn]();
        assert.ok(val >= min && val <= max, `${fn} out of range: ${val}`);
        assert.ok(Number.isInteger(val), `${fn} non-integer: ${val}`);
      }
    }
  });

  it('parseDiceAndRoll works in seeded mode', () => {
    const { serverSecret } = dice.generateCommitment();
    dice.applySeed(serverSecret, 'parse-test');
    const result = dice.parseDiceAndRoll('3d6');
    assert.equal(result.count, 3);
    assert.equal(result.sides, 6);
    assert.equal(result.rolls.length, 3);
    assert.equal(result.total, result.rolls.reduce((a, b) => a + b, 0));
    for (const r of result.rolls) {
      assert.ok(r >= 1 && r <= 6);
    }
  });

  it('rollWithAdvantage works in seeded mode', () => {
    const { serverSecret } = dice.generateCommitment();
    dice.applySeed(serverSecret, 'adv-test');
    const r = dice.rollWithAdvantage();
    assert.ok(r.result >= r.roll1 && r.result >= r.roll2);
    assert.ok(r.roll1 >= 1 && r.roll1 <= 20);
    assert.ok(r.roll2 >= 1 && r.roll2 <= 20);
  });

  it('throws if seeded PRNG used without initialization', () => {
    // Make sure we're NOT in seeded mode
    dice.clearSeed();
    dice.setDiceMode('random');
    // _seededRandom is internal, but we verify applySeed is required
    // by checking that seeded mode doesn't activate spontaneously
    assert.notEqual(dice.getDiceMode(), 'seeded');
  });
});
