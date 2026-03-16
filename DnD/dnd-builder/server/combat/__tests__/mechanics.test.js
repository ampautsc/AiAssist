/**
 * Combat Mechanics — unit tests
 * Tests saving throws, attack rolls, damage, concentration, conditions, breakConcentration.
 */

const { describe, it, before, after, beforeEach } = require('node:test');
const assert = require('node:assert/strict');

const dice = require('../engine/dice');
const mech = require('../engine/mechanics');

before(() => dice.setDiceMode('average'));
after(() => dice.setDiceMode('random'));

// ═══════════════════════════════════════════════════════════════════════════
// Helper — create a minimal creature object for testing
// ═══════════════════════════════════════════════════════════════════════════

function makeCreature(overrides = {}) {
  return {
    name: overrides.name || 'TestCreature',
    currentHP: overrides.currentHP ?? 30,
    maxHP: overrides.maxHP ?? 30,
    ac: overrides.ac ?? 14,
    saves: { con: 2, dex: 1, wis: 0, str: 0, int: 0, cha: 0, ...overrides.saves },
    conditions: overrides.conditions ? [...overrides.conditions] : [],
    concentrating: overrides.concentrating || null,
    concentrationRoundsRemaining: overrides.concentrationRoundsRemaining || 0,
    hasWarCaster: overrides.hasWarCaster || false,
    flying: overrides.flying || false,
    position: overrides.position || { x: 0, y: 0 },
    ...overrides,
  };
}

// ═══════════════════════════════════════════════════════════════════════════
// makeAbilityCheck
// ═══════════════════════════════════════════════════════════════════════════

describe('makeAbilityCheck', () => {
  it('succeeds when total >= DC', () => {
    // average d20 = 10.5, mod +3 = 13.5 vs DC 13 → success
    const result = mech.makeAbilityCheck(3, 13);
    assert.equal(result.roll, 10.5);
    assert.equal(result.total, 13.5);
    assert.equal(result.dc, 13);
    assert.equal(result.success, true);
  });

  it('fails when total < DC', () => {
    // 10.5 + 0 = 10.5 vs DC 15 → fail
    const result = mech.makeAbilityCheck(0, 15);
    assert.equal(result.success, false);
  });

  it('succeeds when total exactly equals DC', () => {
    // We need total >= DC. 10.5 + 5 = 15.5 vs DC 15 → success
    const result = mech.makeAbilityCheck(5, 15);
    assert.equal(result.success, true);
  });
});

// ═══════════════════════════════════════════════════════════════════════════
// makeSavingThrow
// ═══════════════════════════════════════════════════════════════════════════

describe('makeSavingThrow', () => {
  it('normal save — no advantage or disadvantage', () => {
    const result = mech.makeSavingThrow(5, 14);
    assert.equal(result.result, 10.5);
    assert.equal(result.saveBonus, 5);
    assert.equal(result.total, 15.5);
    assert.equal(result.success, true);
    assert.equal(result.type, 'normal');
  });

  it('save fails when total < DC', () => {
    const result = mech.makeSavingThrow(0, 14);
    assert.equal(result.total, 10.5);
    assert.equal(result.saveBonus, 0);
    assert.equal(result.success, false);
  });

  it('returns saveBonus in result — prevents +undefined in logs', () => {
    const result = mech.makeSavingThrow(-1, 10);
    assert.equal(result.saveBonus, -1);
    assert.equal(typeof result.saveBonus, 'number');
    assert.equal(result.total, 10.5 + (-1));
  });

  it('advantage save returns type "advantage"', () => {
    const result = mech.makeSavingThrow(3, 10, true, false);
    assert.equal(result.type, 'advantage');
    assert.equal(result.success, true); // 10.5 + 3 = 13.5 >= 10
  });

  it('disadvantage save returns type "disadvantage"', () => {
    const result = mech.makeSavingThrow(3, 10, false, true);
    assert.equal(result.type, 'disadvantage');
  });

  it('both advantage and disadvantage cancel to normal', () => {
    const result = mech.makeSavingThrow(3, 10, true, true);
    assert.equal(result.type, 'normal');
  });
});

// ═══════════════════════════════════════════════════════════════════════════
// makeAttackRoll
// ═══════════════════════════════════════════════════════════════════════════

describe('makeAttackRoll', () => {
  it('hits when total >= target AC', () => {
    // 10.5 + 5 = 15.5 vs AC 15 → hit
    const result = mech.makeAttackRoll(5, 15);
    assert.equal(result.natural, 10.5);
    assert.equal(result.total, 15.5);
    assert.equal(result.hits, true);
    assert.equal(result.isCrit, false);
    assert.equal(result.isMiss, false);
  });

  it('misses when total < target AC', () => {
    // 10.5 + 2 = 12.5 vs AC 15 → miss
    const result = mech.makeAttackRoll(2, 15);
    assert.equal(result.hits, false);
  });

  it('advantage sets type correctly', () => {
    const result = mech.makeAttackRoll(5, 15, true, false);
    assert.equal(result.type, 'advantage');
  });

  it('disadvantage sets type correctly', () => {
    const result = mech.makeAttackRoll(5, 15, false, true);
    assert.equal(result.type, 'disadvantage');
  });

  it('both cancel to normal', () => {
    const result = mech.makeAttackRoll(5, 15, true, true);
    assert.equal(result.type, 'normal');
  });
});

describe('makeAttackRoll — natural 20 and natural 1 (random mode)', () => {
  before(() => dice.setDiceMode('random'));
  after(() => dice.setDiceMode('average'));

  it('natural 20 always hits regardless of AC', () => {
    // Override Math.random to produce 20
    const orig = Math.random;
    Math.random = () => (20 - 1) / 20; // floor((19/20)*20)+1 = 20
    try {
      const result = mech.makeAttackRoll(0, 30);
      assert.equal(result.natural, 20);
      assert.equal(result.isCrit, true);
      assert.equal(result.hits, true);
    } finally {
      Math.random = orig;
    }
  });

  it('natural 1 always misses regardless of bonus', () => {
    const orig = Math.random;
    Math.random = () => 0; // floor(0*20)+1 = 1
    try {
      const result = mech.makeAttackRoll(30, 10);
      assert.equal(result.natural, 1);
      assert.equal(result.isMiss, true);
      assert.equal(result.hits, false);
    } finally {
      Math.random = orig;
    }
  });
});

// ═══════════════════════════════════════════════════════════════════════════
// rollDamage
// ═══════════════════════════════════════════════════════════════════════════

describe('rollDamage', () => {
  it('1d8+3 in average mode = 4.5 + 3 = 7.5', () => {
    const result = mech.rollDamage('1d8', 3);
    assert.deepEqual(result.rolls, [4.5]);
    assert.equal(result.bonus, 3);
    assert.equal(result.total, 7.5);
    assert.equal(result.crit, false);
  });

  it('2d6+2 in average mode = 7 + 2 = 9', () => {
    const result = mech.rollDamage('2d6', 2);
    assert.deepEqual(result.rolls, [3.5, 3.5]);
    assert.equal(result.total, 9);
  });

  it('crit doubles dice count: 1d8 crit → 2d8', () => {
    const result = mech.rollDamage('1d8', 3, true);
    assert.equal(result.rolls.length, 2);
    assert.deepEqual(result.rolls, [4.5, 4.5]);
    assert.equal(result.total, 12); // 4.5 + 4.5 + 3
    assert.equal(result.crit, true);
  });

  it('3d10 crit → 6d10', () => {
    const result = mech.rollDamage('3d10', 0, true);
    assert.equal(result.rolls.length, 6);
    assert.equal(result.total, 33); // 6 * 5.5
  });

  it('rejects invalid dice string', () => {
    assert.throws(() => mech.rollDamage('banana', 0), /Invalid dice string/);
  });
});

// ═══════════════════════════════════════════════════════════════════════════
// concentrationSave
// ═══════════════════════════════════════════════════════════════════════════

describe('concentrationSave', () => {
  it('DC is 10 for low damage', () => {
    const creature = makeCreature({ saves: { con: 5 } });
    const result = mech.concentrationSave(creature, 8);
    assert.equal(result.dc, 10); // max(10, floor(8/2)=4) = 10
    assert.equal(result.total, 15.5); // 10.5 + 5
    assert.equal(result.success, true);
  });

  it('DC scales with high damage', () => {
    const creature = makeCreature({ saves: { con: 2 } });
    const result = mech.concentrationSave(creature, 30);
    assert.equal(result.dc, 15); // max(10, floor(30/2)=15) = 15
    assert.equal(result.total, 12.5); // 10.5 + 2
    assert.equal(result.success, false);
  });

  it('War Caster grants advantage', () => {
    const creature = makeCreature({ saves: { con: 3 }, hasWarCaster: true });
    const result = mech.concentrationSave(creature, 10);
    assert.equal(result.type, 'advantage');
  });

  it('no War Caster = normal roll', () => {
    const creature = makeCreature({ saves: { con: 3 } });
    const result = mech.concentrationSave(creature, 10);
    assert.equal(result.type, 'normal');
  });
});

// ═══════════════════════════════════════════════════════════════════════════
// Condition helpers
// ═══════════════════════════════════════════════════════════════════════════

describe('isIncapacitated', () => {
  it('returns false with no conditions', () => {
    assert.equal(mech.isIncapacitated(makeCreature()), false);
  });

  for (const cond of ['paralyzed', 'stunned', 'unconscious', 'charmed_hp', 'incapacitated']) {
    it(`returns true for "${cond}"`, () => {
      assert.equal(mech.isIncapacitated(makeCreature({ conditions: [cond] })), true);
    });
  }

  it('returns false for non-incapacitating conditions', () => {
    assert.equal(mech.isIncapacitated(makeCreature({ conditions: ['invisible', 'frightened'] })), false);
  });
});

describe('isAlive', () => {
  it('returns true when HP > 0', () => {
    assert.equal(mech.isAlive(makeCreature({ currentHP: 1 })), true);
  });

  it('returns false when HP = 0', () => {
    assert.equal(mech.isAlive(makeCreature({ currentHP: 0 })), false);
  });
});

describe('hasCondition', () => {
  it('returns true when creature has the condition', () => {
    assert.equal(mech.hasCondition(makeCreature({ conditions: ['paralyzed'] }), 'paralyzed'), true);
  });

  it('returns false when creature lacks the condition', () => {
    assert.equal(mech.hasCondition(makeCreature(), 'paralyzed'), false);
  });
});

describe('addCondition', () => {
  it('adds a new condition', () => {
    const c = makeCreature();
    mech.addCondition(c, 'invisible');
    assert.ok(c.conditions.includes('invisible'));
  });

  it('does not duplicate an existing condition', () => {
    const c = makeCreature({ conditions: ['invisible'] });
    mech.addCondition(c, 'invisible');
    assert.equal(c.conditions.filter(x => x === 'invisible').length, 1);
  });
});

describe('removeCondition', () => {
  it('removes an existing condition and returns true', () => {
    const c = makeCreature({ conditions: ['paralyzed', 'invisible'] });
    const removed = mech.removeCondition(c, 'paralyzed');
    assert.equal(removed, true);
    assert.equal(c.conditions.includes('paralyzed'), false);
  });

  it('returns false for non-existent condition', () => {
    const c = makeCreature();
    const removed = mech.removeCondition(c, 'paralyzed');
    assert.equal(removed, false);
  });
});

describe('removeAllConditions', () => {
  it('removes all instances of named conditions', () => {
    const c = makeCreature({ conditions: ['charmed_hp', 'incapacitated', 'invisible'] });
    mech.removeAllConditions(c, 'charmed_hp', 'incapacitated');
    assert.deepEqual(c.conditions, ['invisible']);
  });

  it('leaves creature unchanged if no matching conditions', () => {
    const c = makeCreature({ conditions: ['invisible'] });
    mech.removeAllConditions(c, 'paralyzed');
    assert.deepEqual(c.conditions, ['invisible']);
  });
});

describe('getActiveEnemies', () => {
  it('excludes dead and incapacitated', () => {
    const enemies = [
      makeCreature({ name: 'alive', currentHP: 10 }),
      makeCreature({ name: 'dead', currentHP: 0 }),
      makeCreature({ name: 'incap', currentHP: 10, conditions: ['paralyzed'] }),
    ];
    const active = mech.getActiveEnemies(enemies);
    assert.equal(active.length, 1);
    assert.equal(active[0].name, 'alive');
  });
});

describe('getAllAliveEnemies', () => {
  it('includes incapacitated but alive creatures', () => {
    const enemies = [
      makeCreature({ name: 'alive', currentHP: 10 }),
      makeCreature({ name: 'dead', currentHP: 0 }),
      makeCreature({ name: 'incap', currentHP: 10, conditions: ['paralyzed'] }),
    ];
    const alive = mech.getAllAliveEnemies(enemies);
    assert.equal(alive.length, 2);
  });
});

// ═══════════════════════════════════════════════════════════════════════════
// breakConcentration
// ═══════════════════════════════════════════════════════════════════════════

describe('breakConcentration', () => {
  it('Hypnotic Pattern — removes charmed_hp AND incapacitated from all combatants', () => {
    const caster = makeCreature({ concentrating: 'Hypnotic Pattern' });
    const target1 = makeCreature({ conditions: ['charmed_hp', 'incapacitated'] });
    const target2 = makeCreature({ conditions: ['charmed_hp', 'incapacitated'] });
    const allCombatants = [caster, target1, target2];

    mech.breakConcentration(caster, allCombatants);

    assert.equal(caster.concentrating, null);
    assert.deepEqual(target1.conditions, []);
    assert.deepEqual(target2.conditions, []);
  });

  it('Hypnotic Pattern — preserves unrelated conditions', () => {
    const caster = makeCreature({ concentrating: 'Hypnotic Pattern' });
    const target = makeCreature({ conditions: ['charmed_hp', 'incapacitated', 'invisible'] });

    mech.breakConcentration(caster, [caster, target]);
    assert.deepEqual(target.conditions, ['invisible']);
  });

  it('Hold Person — removes paralyzed', () => {
    const caster = makeCreature({ concentrating: 'Hold Person' });
    const target = makeCreature({ conditions: ['paralyzed'] });

    mech.breakConcentration(caster, [caster, target]);
    assert.deepEqual(target.conditions, []);
  });

  it('Greater Invisibility — removes invisible from caster', () => {
    const caster = makeCreature({ concentrating: 'Greater Invisibility', conditions: ['invisible'] });

    mech.breakConcentration(caster, [caster]);
    assert.deepEqual(caster.conditions, []);
  });

  it('Shield of Faith — reduces AC by 2', () => {
    const caster = makeCreature({ ac: 16, concentrating: 'Shield of Faith' });

    mech.breakConcentration(caster, [caster]);
    assert.equal(caster.ac, 14);
  });

  it('resets concentration state', () => {
    const caster = makeCreature({
      concentrating: 'Hold Person',
      concentrationRoundsRemaining: 5,
    });

    mech.breakConcentration(caster, [caster]);
    assert.equal(caster.concentrating, null);
    assert.equal(caster.concentrationRoundsRemaining, 0);
  });
});

// ═══════════════════════════════════════════════════════════════════════════
// distanceBetween
// ═══════════════════════════════════════════════════════════════════════════

describe('distanceBetween', () => {
  it('ground-to-ground uses Chebyshev distance * 5', () => {
    const a = makeCreature({ position: { x: 0, y: 0 } });
    const b = makeCreature({ position: { x: 3, y: 2 } });
    assert.equal(mech.distanceBetween(a, b), 15); // max(3,2) * 5
  });

  it('flying creature to ground creature uses 3D distance (30ft altitude)', () => {
    const a = makeCreature({ flying: true, position: { x: 0, y: 0 } });
    const b = makeCreature({ flying: false, position: { x: 0, y: 0 } });
    // Same horizontal position, 30ft altitude → sqrt(0 + 900) = 30ft
    assert.equal(mech.distanceBetween(a, b), 30);
  });

  it('ground to flying uses 3D distance (30ft altitude)', () => {
    const a = makeCreature({ flying: false });
    const b = makeCreature({ flying: true });
    // Same horizontal position, 30ft altitude → 30ft
    assert.equal(mech.distanceBetween(a, b), 30);
  });

  it('flying vs ground with horizontal offset uses Euclidean 3D', () => {
    const a = makeCreature({ flying: true, position: { x: 4, y: 0 } });
    const b = makeCreature({ flying: false, position: { x: 0, y: 0 } });
    // horizontal = max(4,0)*5 = 20ft, altitude = 30ft
    // sqrt(400 + 900) = sqrt(1300) ≈ 36.06 → rounds to 35ft
    assert.equal(mech.distanceBetween(a, b), 35);
  });

  it('same position = 0ft', () => {
    const a = makeCreature({ position: { x: 2, y: 3 } });
    const b = makeCreature({ position: { x: 2, y: 3 } });
    assert.equal(mech.distanceBetween(a, b), 0);
  });
});
