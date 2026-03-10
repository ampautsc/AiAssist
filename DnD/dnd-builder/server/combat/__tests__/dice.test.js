/**
 * Dice Engine — unit tests
 * Tests both average-mode (deterministic) and edge-case behavior.
 */

const { describe, it, before, after } = require('node:test');
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
