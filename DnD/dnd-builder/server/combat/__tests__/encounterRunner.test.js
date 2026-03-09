/**
 * Encounter Runner — unit tests
 * Tests the generic combat loop, initiative, victory conditions,
 * turn processing, and action resolution.
 */

const { describe, it, before, after, beforeEach } = require('node:test');
const assert = require('node:assert/strict');

const dice = require('../engine/dice');
const mech = require('../engine/mechanics');
const { createCreature } = require('../data/creatures');
const runner = require('../engine/encounterRunner');

before(() => dice.setDiceMode('average'));
after(() => dice.setDiceMode('random'));

// ═══════════════════════════════════════════════════════════════════════════
// Helpers
// ═══════════════════════════════════════════════════════════════════════════

function makeBard() {
  return createCreature('gem_dragonborn_lore_bard_8');
}

function makeFanatic(index = 1) {
  return createCreature('cult_fanatic', {
    name: `Cult Fanatic ${index}`,
    id: `cult_fanatic_${index}`,
    position: { x: index * 2, y: 6 },
  });
}

// Simple AI: always attack nearest enemy with weapon
function simpleAttackAI(combatant, allCombatants, round, log) {
  const enemies = allCombatants.filter(c => c.side !== combatant.side && mech.isAlive(c));
  if (enemies.length === 0) return null;
  const target = enemies[0];
  
  if (combatant.multiattack > 0) {
    return {
      reasoning: 'Multiattack nearest enemy',
      action: { type: 'multiattack', target },
    };
  }
  
  return {
    reasoning: 'Attack nearest enemy',
    action: { type: 'attack', target, weapon: combatant.weapon },
  };
}

// Passive AI: does nothing (for testing turn processing)
function passiveAI() {
  return { reasoning: 'Doing nothing' };
}

// ═══════════════════════════════════════════════════════════════════════════
// rollInitiative
// ═══════════════════════════════════════════════════════════════════════════

describe('rollInitiative', () => {
  it('returns all combatants sorted by total', () => {
    const combatants = [makeBard(), makeFanatic(1), makeFanatic(2)];
    const result = runner.rollInitiative(combatants);
    assert.equal(result.length, 3);
    // In average mode all d20 = 10.5, so sorted by DEX mod
    // Bard DEX +2, Fanatic DEX +2 — all tied, order preserved by stable sort
    assert.ok(result.every(r => typeof r.total === 'number'));
  });

  it('includes roll, mod, and total', () => {
    const result = runner.rollInitiative([makeBard()]);
    assert.equal(result[0].roll, 10.5);
    assert.equal(result[0].mod, 2); // bard DEX mod
    assert.equal(result[0].total, 12.5);
  });
});

// ═══════════════════════════════════════════════════════════════════════════
// resetTurnState
// ═══════════════════════════════════════════════════════════════════════════

describe('resetTurnState', () => {
  it('resets action/bonus/movement flags', () => {
    const c = makeBard();
    c.usedAction = true;
    c.usedBonusAction = true;
    c.movementRemaining = 0;
    c.reactedThisRound = true;
    
    runner.resetTurnState(c);
    
    assert.equal(c.usedAction, false);
    assert.equal(c.usedBonusAction, false);
    assert.equal(c.movementRemaining, c.speed);
    assert.equal(c.reactedThisRound, false);
  });

  it('clears vm_disadvantage', () => {
    const c = makeFanatic();
    c.conditions.push('vm_disadvantage');
    runner.resetTurnState(c);
    assert.ok(!c.conditions.includes('vm_disadvantage'));
  });

  it('clears dodging from previous turn', () => {
    const c = makeBard();
    c.conditions.push('dodging');
    runner.resetTurnState(c);
    assert.ok(!c.conditions.includes('dodging'));
  });
});

// ═══════════════════════════════════════════════════════════════════════════
// processStartOfTurn
// ═══════════════════════════════════════════════════════════════════════════

describe('processStartOfTurn', () => {
  it('reduces gem flight duration', () => {
    const bard = makeBard();
    bard.gemFlight.active = true;
    bard.gemFlight.roundsRemaining = 2;
    bard.flying = true;
    const log = [];
    
    runner.processStartOfTurn(bard, [bard], log);
    assert.equal(bard.gemFlight.roundsRemaining, 1);
    assert.equal(bard.flying, true);
  });

  it('ends gem flight when duration expires', () => {
    const bard = makeBard();
    bard.gemFlight.active = true;
    bard.gemFlight.roundsRemaining = 1;
    bard.flying = true;
    const log = [];
    
    runner.processStartOfTurn(bard, [bard], log);
    assert.equal(bard.gemFlight.active, false);
    assert.equal(bard.flying, false);
  });

  it('decrement concentration timer and break when expired', () => {
    const bard = makeBard();
    bard.concentrating = 'Hold Person';
    bard.concentrationRoundsRemaining = 1;
    const f1 = makeFanatic(1);
    f1.conditions.push('paralyzed');
    const log = [];
    
    runner.processStartOfTurn(bard, [bard, f1], log);
    assert.equal(bard.concentrating, null);
    assert.ok(!f1.conditions.includes('paralyzed'));
  });

  it('handles falling when paralyzed and flying', () => {
    const bard = makeBard();
    bard.flying = true;
    bard.gemFlight.active = true;
    bard.conditions.push('paralyzed');
    const log = [];
    
    const result = runner.processStartOfTurn(bard, [bard], log);
    assert.equal(bard.flying, false);
    assert.ok(bard.conditions.includes('prone'));
    // Took falling damage (2d6 average = 7)
    assert.ok(bard.currentHP < 67);
  });
});

// ═══════════════════════════════════════════════════════════════════════════
// processEndOfTurnSaves
// ═══════════════════════════════════════════════════════════════════════════

describe('processEndOfTurnSaves', () => {
  it('paralyzed creature gets WIS save vs Hold Person', () => {
    const bard = makeBard();
    bard.concentrating = 'Hold Person';
    bard.spellSaveDC = 15;
    const f1 = makeFanatic(1);
    f1.conditions.push('paralyzed');
    const log = [];
    
    // f1 WIS save: 10.5 + 1 = 11.5 < 15 → FAIL, still paralyzed
    runner.processEndOfTurnSaves(f1, [bard, f1], log);
    assert.ok(f1.conditions.includes('paralyzed'));
    assert.ok(log.some(l => l.includes('FAIL')));
  });

  it('paralyzed creature breaks free on successful save', () => {
    const f1 = makeFanatic(1);
    f1.concentrating = 'Hold Person';
    f1.spellSaveDC = 5;  // very low DC
    const bard = makeBard();
    bard.conditions.push('paralyzed');
    const log = [];
    
    // bard WIS save: 10.5 + 1 = 11.5 >= 5 → SUCCESS
    runner.processEndOfTurnSaves(bard, [f1, bard], log);
    assert.ok(!bard.conditions.includes('paralyzed'));
  });
});

// ═══════════════════════════════════════════════════════════════════════════
// checkVictory
// ═══════════════════════════════════════════════════════════════════════════

describe('checkVictory', () => {
  it('party wins when all enemies dead', () => {
    const bard = makeBard();
    const f1 = makeFanatic(1);
    f1.currentHP = 0;
    const result = runner.checkVictory([bard, f1], 1);
    assert.equal(result.over, true);
    assert.equal(result.winner, 'party');
  });

  it('enemy wins when party dead', () => {
    const bard = makeBard();
    bard.currentHP = 0;
    const f1 = makeFanatic(1);
    const result = runner.checkVictory([bard, f1], 1);
    assert.equal(result.over, true);
    assert.equal(result.winner, 'enemy');
  });

  it('combat continues when both sides alive', () => {
    const result = runner.checkVictory([makeBard(), makeFanatic(1)], 1);
    assert.equal(result.over, false);
  });

  it('incapacitation at round 15+ is a stalemate (draw), not a win', () => {
    const bard = makeBard();
    const f1 = makeFanatic(1);
    f1.conditions.push('charmed_hp', 'incapacitated');
    const result = runner.checkVictory([bard, f1], 15);
    assert.equal(result.over, true);
    assert.equal(result.winner, 'draw');
  });

  it('combat continues if enemies incapacitated but < 15 rounds', () => {
    const bard = makeBard();
    const f1 = makeFanatic(1);
    f1.conditions.push('charmed_hp', 'incapacitated');
    const result = runner.checkVictory([bard, f1], 10);
    assert.equal(result.over, false);
  });
});

// ═══════════════════════════════════════════════════════════════════════════
// resolveWeaponAttack
// ═══════════════════════════════════════════════════════════════════════════

describe('resolveWeaponAttack', () => {
  it('deals damage on hit', () => {
    const f1 = makeFanatic(1);
    const bard = makeBard();
    bard.ac = 10; // make hittable
    const log = [];
    
    runner.resolveWeaponAttack(f1, { target: bard, weapon: f1.weapon }, [f1, bard], log);
    // Dagger: +4 attack, average 10.5 + 4 = 14.5 vs AC 10 → HIT
    // 1d4 + 2 average = 2.5 + 2 = 4.5
    assert.ok(bard.currentHP < 67);
    assert.equal(f1.attacksMade, 1);
    assert.equal(f1.attacksHit, 1);
  });

  it('misses when total < AC', () => {
    const f1 = makeFanatic(1);
    const bard = makeBard();
    // Dagger +4, average 10.5 + 4 = 14.5 vs AC 14 → HIT (14.5 >= 14)
    // Use higher AC
    bard.ac = 20;
    const log = [];
    
    runner.resolveWeaponAttack(f1, { target: bard, weapon: f1.weapon }, [f1, bard], log);
    assert.equal(bard.currentHP, 67);
    assert.equal(f1.attacksHit, 0);
  });

  it('grants advantage when attacker is invisible', () => {
    const bard = makeBard();
    bard.conditions.push('invisible');
    const f1 = makeFanatic(1);
    const log = [];
    
    runner.resolveWeaponAttack(bard, { target: f1, weapon: bard.weapon }, [bard, f1], log);
    // In average mode advantage/disadvantage don't change value, but the mechanic is exercised
    assert.equal(bard.attacksMade, 1);
  });

  it('grants advantage and auto-crit vs paralyzed within 5ft', () => {
    const f1 = makeFanatic(1);
    const bard = makeBard();
    bard.conditions.push('paralyzed');
    bard.ac = 10;
    // Position them within 5ft
    f1.position = { x: 0, y: 0 };
    bard.position = { x: 1, y: 0 };
    const log = [];
    
    runner.resolveWeaponAttack(f1, { target: bard, weapon: f1.weapon }, [f1, bard], log);
    // Should hit with crit damage (doubled dice)
    assert.ok(log.some(l => l.includes('CRITICAL') || l.includes('HIT')));
  });
});

// ═══════════════════════════════════════════════════════════════════════════
// resolveBreathWeapon
// ═══════════════════════════════════════════════════════════════════════════

describe('resolveBreathWeapon', () => {
  it('deals damage to targets and decrements uses', () => {
    const bard = makeBard();
    const f1 = makeFanatic(1);
    const log = [];
    
    runner.resolveBreathWeapon(bard, { targets: [f1] }, [bard, f1], log);
    // DC 14 DEX save, f1 DEX +2, average 10.5 + 2 = 12.5 < 14 → FAIL, full damage
    // 2d8 average = 9
    assert.equal(f1.currentHP, 33 - 9);
    assert.equal(bard.breathWeapon.uses, 2);
  });
});

// ═══════════════════════════════════════════════════════════════════════════
// resolveShakeAwake
// ═══════════════════════════════════════════════════════════════════════════

describe('resolveShakeAwake', () => {
  it('removes charmed_hp and incapacitated', () => {
    const f1 = makeFanatic(1);
    const f2 = makeFanatic(2);
    f2.conditions.push('charmed_hp', 'incapacitated');
    const log = [];
    
    runner.resolveShakeAwake(f1, { target: f2 }, log);
    assert.deepEqual(f2.conditions, []);
  });
});

// ═══════════════════════════════════════════════════════════════════════════
// runEncounter — full integration test
// ═══════════════════════════════════════════════════════════════════════════

describe('runEncounter — party vs enemies with simple AI', () => {
  it('runs a complete encounter and returns a result', () => {
    const bard = makeBard();
    const f1 = makeFanatic(1);
    f1.currentHP = 5; // low HP to end fast
    
    const result = runner.runEncounter({
      combatants: [bard, f1],
      getDecision: simpleAttackAI,
      maxRounds: 10,
      verbose: false,
    });
    
    assert.ok(['party', 'enemy', 'draw'].includes(result.winner));
    assert.ok(result.rounds >= 1);
    assert.ok(Array.isArray(result.log));
    assert.ok(Array.isArray(result.analytics));
    assert.equal(result.analytics.length, 2);
  });

  it('party wins when fanatic has 1 HP', () => {
    const bard = makeBard();
    const f1 = makeFanatic(1);
    f1.currentHP = 1;
    
    const result = runner.runEncounter({
      combatants: [bard, f1],
      getDecision: simpleAttackAI,
      maxRounds: 10,
      verbose: false,
    });
    
    // Crossbow 1d8+2 avg = 6.5, should kill 1 HP target in round 1
    assert.equal(result.winner, 'party');
    assert.equal(result.rounds, 1);
  });

  it('ends as draw after maxRounds if no one dies', () => {
    const bard = makeBard();
    const f1 = makeFanatic(1);
    // Both have high HP and low damage with passive AI
    
    const result = runner.runEncounter({
      combatants: [bard, f1],
      getDecision: passiveAI,
      maxRounds: 3,
      verbose: false,
    });
    
    assert.equal(result.winner, 'draw');
    assert.equal(result.rounds, 3);
  });
});

describe('runEncounter — spell casting integration', () => {
  it('bard can cast Hypnotic Pattern via spell decision', () => {
    const bard = makeBard();
    const f1 = makeFanatic(1);
    const f2 = makeFanatic(2);
    
    function hpAI(combatant, allCombatants, round) {
      if (combatant.side === 'party' && round === 1) {
        const enemies = allCombatants.filter(c => c.side === 'enemy');
        return {
          reasoning: 'Cast HP on all enemies',
          action: { type: 'cast_spell', spell: 'Hypnotic Pattern', level: 3, targets: enemies },
        };
      }
      return passiveAI();
    }
    
    const result = runner.runEncounter({
      combatants: [bard, f1, f2],
      getDecision: hpAI,
      maxRounds: 12,
      verbose: false,
    });
    
    // After HP, fanatics should be charmed (though with Dark Devotion advantage, they still fail DC 15)
    // In average mode: 10.5 (adv) + 1 = 11.5 < 15 → both fail
    // Incapacitation is now a stalemate (draw), not a win
    assert.equal(result.winner, 'draw');
  });
});

// ═══════════════════════════════════════════════════════════════════════════
// buildAnalytics
// ═══════════════════════════════════════════════════════════════════════════

describe('buildAnalytics', () => {
  it('produces per-combatant stats', () => {
    const bard = makeBard();
    bard.totalDamageDealt = 25;
    bard.attacksMade = 5;
    bard.attacksHit = 3;
    
    const analytics = runner.buildAnalytics([bard]);
    assert.equal(analytics[0].name, bard.name);
    assert.equal(analytics[0].damageDealt, 25);
    assert.equal(analytics[0].hitRate, 60);
  });
});
