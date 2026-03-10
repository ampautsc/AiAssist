/**
 * Unit Tests for D&D 5e Combat Simulator
 * 
 * DETERMINISTIC: All dice use average mode (d20=10.5, d8=4.5, d6=3.5, d4=2.5).
 * Only 4 edge-case tests (nat 20, nat 1, advantage, disadvantage) use mocked
 * random values since those mechanics require specific non-average rolls to test.
 * 
 * Run: npm test
 *      node --test server/run-combat-sim.test.js
 * 
 * Uses Node.js built-in test runner (node:test) — zero dependencies.
 */

const { describe, it } = require('node:test');
const assert = require('node:assert/strict');
const sim = require('./run-combat-sim');

// ═══════════════════════════════════════════════════════════════════════════
// SETUP: Deterministic average dice for all tests
// ═══════════════════════════════════════════════════════════════════════════

sim.setDiceMode('average');

// Average values:
//   d20 = 10.5    d12 = 6.5    d10 = 5.5
//   d8  = 4.5     d6  = 3.5    d4  = 2.5

// Mock helper — only for the 4 tests that need specific roll values
function mockDiceSequence(values) {
  let index = 0;
  const originalRandom = Math.random;
  Math.random = () => {
    if (index >= values.length) {
      throw new Error(`Math.random called ${index + 1} times but only ${values.length} values mocked.`);
    }
    return values[index++];
  };
  return () => { Math.random = originalRandom; };
}

function d20Val(n) { return (n - 1) / 20; }


// ═══════════════════════════════════════════════════════════════════════════
// TEST 1: Bard stat block matches Iron Concentration build
// ═══════════════════════════════════════════════════════════════════════════

describe('createBard — Iron Concentration build stats', () => {
  it('should have correct HP, AC, and ability scores', () => {
    const bard = sim.createBard();
    
    // HP: L1 = 8 + CON(3), L2-8 = 7 × (5 + 3) = 56. Total = 67
    assert.equal(bard.maxHP, 67);
    assert.equal(bard.currentHP, 67);
    
    // AC: Leather(11) + DEX(+2) + Cloak(+1) = 14
    assert.equal(bard.ac, 14);
    
    assert.equal(bard.str, 8);
    assert.equal(bard.dex, 14);
    assert.equal(bard.con, 16);
    assert.equal(bard.wis, 12);
    assert.equal(bard.cha, 18);
  });
  
  it('should have correct saving throw bonuses', () => {
    const bard = sim.createBard();
    
    // CON: +3 mod + 3 prof (Resilient) + 1 Cloak + 1 Luckstone = +8
    assert.equal(bard.saves.con, 8);
    // CHA: +4 mod + 3 prof + 1 Cloak + 1 Luckstone = +9
    assert.equal(bard.saves.cha, 9);
    // DEX: +2 mod + 3 prof = +5
    assert.equal(bard.saves.dex, 5);
    
    assert.equal(bard.hasWarCaster, true);
    assert.equal(bard.hasResilientCon, true);
  });
  
  it('should have correct spell slots for Level 8 Bard', () => {
    const bard = sim.createBard();
    assert.deepEqual(bard.spellSlots, { 1: 4, 2: 3, 3: 3, 4: 2 });
  });
  
  it('should have 4 Bardic Inspiration uses (CHA mod)', () => {
    const bard = sim.createBard();
    assert.equal(bard.bardicInspirationUses, 4);
    assert.equal(bard.bardicInspirationMax, 4);
  });
  
  it('should have 3 Gem Flight uses (PB/LR)', () => {
    const bard = sim.createBard();
    assert.equal(bard.gemFlight.uses, 3);
    assert.equal(bard.gemFlight.maxUses, 3);
    assert.equal(bard.gemFlight.active, false);
  });
});


// ═══════════════════════════════════════════════════════════════════════════
// TEST 2: Cult Fanatic stat block matches Monster Manual
// ═══════════════════════════════════════════════════════════════════════════

describe('createCultFanatic — Monster Manual stat block', () => {
  it('should have correct HP, AC, and CR', () => {
    const f = sim.createCultFanatic(1);
    assert.equal(f.maxHP, 33);
    assert.equal(f.ac, 13);
    assert.equal(f.cr, 2);
  });
  
  it('should have Dark Devotion (advantage vs charmed/frightened)', () => {
    const f = sim.createCultFanatic(1);
    assert.equal(f.darkDevotion, true);
  });
  
  it('should have correct spell slots and DC', () => {
    const f = sim.createCultFanatic(1);
    assert.deepEqual(f.spellSlots, { 1: 4, 2: 3 });
    assert.equal(f.spellSaveDC, 11);
    assert.equal(f.spellAttackBonus, 3);
  });
  
  it('should have 2 dagger multiattack at +4', () => {
    const f = sim.createCultFanatic(1);
    assert.equal(f.multiattack, 2);
    assert.equal(f.attacks[0].bonus, 4);
    assert.equal(f.attacks[0].name, 'Dagger');
  });
});


// ═══════════════════════════════════════════════════════════════════════════
// TEST 3: Advantage and disadvantage roll correctly
//   These 2 tests use mocked random — you need two DIFFERENT rolls to verify
//   that advantage picks higher and disadvantage picks lower.
// ═══════════════════════════════════════════════════════════════════════════

describe('rollWithAdvantage / rollWithDisadvantage', () => {
  it('advantage takes the HIGHER of two rolls', () => {
    sim.setDiceMode('random');
    const restore = mockDiceSequence([d20Val(7), d20Val(15)]);
    try {
      const result = sim.rollWithAdvantage();
      assert.equal(result.roll1, 7);
      assert.equal(result.roll2, 15);
      assert.equal(result.result, 15);
      assert.equal(result.type, 'advantage');
    } finally {
      restore();
      sim.setDiceMode('average');
    }
  });
  
  it('disadvantage takes the LOWER of two rolls', () => {
    sim.setDiceMode('random');
    const restore = mockDiceSequence([d20Val(18), d20Val(4)]);
    try {
      const result = sim.rollWithDisadvantage();
      assert.equal(result.roll1, 18);
      assert.equal(result.roll2, 4);
      assert.equal(result.result, 4);
      assert.equal(result.type, 'disadvantage');
    } finally {
      restore();
      sim.setDiceMode('average');
    }
  });
});


// ═══════════════════════════════════════════════════════════════════════════
// TEST 4: Attack rolls — nat 20 always hits, nat 1 always misses
//   Nat 20/nat 1 tests use mocked random. Other attack tests use average.
// ═══════════════════════════════════════════════════════════════════════════

describe('makeAttackRoll — critical and fumble rules', () => {
  it('natural 20 hits even against impossibly high AC', () => {
    sim.setDiceMode('random');
    const restore = mockDiceSequence([d20Val(20)]);
    try {
      const result = sim.makeAttackRoll(0, 30);
      assert.equal(result.natural, 20);
      assert.equal(result.isCrit, true);
      assert.equal(result.hits, true);
    } finally {
      restore();
      sim.setDiceMode('average');
    }
  });
  
  it('natural 1 misses even with huge attack bonus', () => {
    sim.setDiceMode('random');
    const restore = mockDiceSequence([d20Val(1)]);
    try {
      const result = sim.makeAttackRoll(20, 10);
      assert.equal(result.natural, 1);
      assert.equal(result.isMiss, true);
      assert.equal(result.hits, false);
    } finally {
      restore();
      sim.setDiceMode('average');
    }
  });
  
  it('average roll + bonus exceeding AC is a hit', () => {
    // d20 avg 10.5 + bonus 4 = 14.5 vs AC 14 → hit
    const result = sim.makeAttackRoll(4, 14);
    assert.equal(result.natural, 10.5);
    assert.equal(result.total, 14.5);
    assert.equal(result.hits, true);
  });
  
  it('average roll + bonus below AC is a miss', () => {
    // d20 avg 10.5 + bonus 3 = 13.5 vs AC 14 → miss
    const result = sim.makeAttackRoll(3, 14);
    assert.equal(result.total, 13.5);
    assert.equal(result.hits, false);
  });
});


// ═══════════════════════════════════════════════════════════════════════════
// TEST 5: rollDamage — crit doubles dice, not bonus
// ═══════════════════════════════════════════════════════════════════════════

describe('rollDamage — critical hit doubles dice count', () => {
  it('normal 1d8+2: one die at 4.5, total 6.5', () => {
    const result = sim.rollDamage('1d8', 2, false);
    assert.equal(result.rolls.length, 1);
    assert.equal(result.rolls[0], 4.5);
    assert.equal(result.total, 6.5);
    assert.equal(result.crit, false);
  });
  
  it('crit 1d8+2: TWO dice at 4.5 each + bonus once = 11', () => {
    const result = sim.rollDamage('1d8', 2, true);
    assert.equal(result.rolls.length, 2);
    assert.equal(result.rolls[0], 4.5);
    assert.equal(result.rolls[1], 4.5);
    assert.equal(result.total, 11); // 4.5 + 4.5 + 2
    assert.equal(result.crit, true);
  });
  
  it('crit 1d4+2 (dagger): TWO d4s at 2.5 each + bonus = 7', () => {
    const result = sim.rollDamage('1d4', 2, true);
    assert.equal(result.rolls.length, 2);
    assert.equal(result.total, 7); // 2.5 + 2.5 + 2
  });
});


// ═══════════════════════════════════════════════════════════════════════════
// TEST 6: Concentration save DC and War Caster advantage
// ═══════════════════════════════════════════════════════════════════════════

describe('concentrationSave — DC calculation and War Caster', () => {
  it('DC is max(10, floor(damage/2)) — small damage uses DC 10', () => {
    const bard = sim.createBard();
    // 6 damage → floor(6/2) = 3, min DC = 10
    const result = sim.concentrationSave(bard, 6);
    assert.equal(result.dc, 10);
    // Advantage (War Caster): both d20 = 10.5, result = 10.5. +8 CON = 18.5
    assert.equal(result.total, 18.5);
    assert.equal(result.success, true);
  });
  
  it('DC scales with damage — 30 damage → DC 15', () => {
    const bard = sim.createBard();
    const result = sim.concentrationSave(bard, 30);
    assert.equal(result.dc, 15);
    assert.equal(result.total, 18.5); // 10.5 + 8
    assert.equal(result.success, true);
  });
  
  it('War Caster grants advantage on the save', () => {
    const bard = sim.createBard();
    const result = sim.concentrationSave(bard, 8);
    assert.equal(result.type, 'advantage');
    assert.equal(result.result, 10.5);
    assert.equal(result.total, 18.5); // 10.5 + 8
    assert.equal(result.success, true);
  });
  
  it('creature without War Caster rolls normally and can fail higher DCs', () => {
    const fanatic = sim.createCultFanatic(1);
    // Fanatic CON save +1. Avg d20 = 10.5. Total = 11.5
    // 24 damage → DC = floor(24/2) = 12. 11.5 < 12 → fail
    const result = sim.concentrationSave(fanatic, 24);
    assert.equal(result.type, 'normal');
    assert.equal(result.dc, 12);
    assert.equal(result.total, 11.5);
    assert.equal(result.success, false);
  });
});


// ═══════════════════════════════════════════════════════════════════════════
// TEST 7: isIncapacitated recognizes all incapacitating conditions
// ═══════════════════════════════════════════════════════════════════════════

describe('isIncapacitated — condition detection', () => {
  it('identifies paralyzed as incapacitated', () => {
    const c = sim.createCultFanatic(1);
    c.conditions.push('paralyzed');
    assert.equal(sim.isIncapacitated(c), true);
  });
  
  it('identifies stunned as incapacitated', () => {
    const c = sim.createCultFanatic(1);
    c.conditions.push('stunned');
    assert.equal(sim.isIncapacitated(c), true);
  });
  
  it('identifies unconscious as incapacitated', () => {
    const c = sim.createCultFanatic(1);
    c.conditions.push('unconscious');
    assert.equal(sim.isIncapacitated(c), true);
  });
  
  it('identifies charmed_hp (Hypnotic Pattern) as incapacitated', () => {
    const c = sim.createCultFanatic(1);
    c.conditions.push('charmed_hp');
    assert.equal(sim.isIncapacitated(c), true);
  });
  
  it('identifies plain incapacitated condition', () => {
    const c = sim.createCultFanatic(1);
    c.conditions.push('incapacitated');
    assert.equal(sim.isIncapacitated(c), true);
  });
  
  it('does NOT identify prone, frightened, or vm_disadvantage as incapacitated', () => {
    const c = sim.createCultFanatic(1);
    c.conditions.push('prone', 'frightened', 'vm_disadvantage');
    assert.equal(sim.isIncapacitated(c), false);
  });
  
  it('creature with no conditions is not incapacitated', () => {
    const c = sim.createCultFanatic(1);
    assert.equal(sim.isIncapacitated(c), false);
  });
});


// ═══════════════════════════════════════════════════════════════════════════
// TEST 8: breakConcentration removes correct conditions
// ═══════════════════════════════════════════════════════════════════════════

describe('breakConcentration — condition cleanup', () => {
  it('breaking Hypnotic Pattern removes charmed_hp from all combatants', () => {
    const bard = sim.createBard();
    bard.concentrating = 'Hypnotic Pattern';
    
    const f1 = sim.createCultFanatic(1);
    f1.conditions = ['charmed_hp', 'incapacitated'];
    const f2 = sim.createCultFanatic(2);
    f2.conditions = ['charmed_hp', 'incapacitated'];
    const f3 = sim.createCultFanatic(3);
    f3.conditions = []; // Not charmed (saved)
    
    const allCombatants = [bard, f1, f2, f3];
    sim.breakConcentration(bard, allCombatants);
    
    assert.equal(bard.concentrating, null);
    assert.ok(!f1.conditions.includes('charmed_hp'));
    assert.ok(!f2.conditions.includes('charmed_hp'));
    assert.deepEqual(f3.conditions, []);
  });
  
  it('breaking Hypnotic Pattern correctly removes both charmed_hp and incapacitated', () => {
    // Fixed: new breakConcentration uses removeAllConditions() which properly
    // removes both conditions via filter (no splice index-shift bug).
    const bard = sim.createBard();
    bard.concentrating = 'Hypnotic Pattern';
    
    const f1 = sim.createCultFanatic(1);
    f1.conditions = ['charmed_hp', 'incapacitated'];
    
    sim.breakConcentration(bard, [bard, f1]);
    
    // Both conditions should be removed
    assert.deepEqual(f1.conditions, []);
  });
  
  it('breaking Hold Person removes paralyzed from all combatants', () => {
    const fanatic = sim.createCultFanatic(1);
    fanatic.concentrating = 'Hold Person';
    
    const bard = sim.createBard();
    bard.conditions = ['paralyzed'];
    
    sim.breakConcentration(fanatic, [bard, fanatic]);
    
    assert.equal(fanatic.concentrating, null);
    assert.deepEqual(bard.conditions, []);
  });
  
  it('breaking Greater Invisibility removes invisible from the caster', () => {
    const bard = sim.createBard();
    bard.concentrating = 'Greater Invisibility';
    bard.conditions = ['invisible'];
    
    sim.breakConcentration(bard, [bard]);
    
    assert.equal(bard.concentrating, null);
    assert.ok(!bard.conditions.includes('invisible'));
  });
  
  it('breaking Shield of Faith reduces AC by 2', () => {
    const fanatic = sim.createCultFanatic(1);
    fanatic.concentrating = 'Shield of Faith';
    fanatic.ac = 15; // 13 base + 2 from Shield of Faith
    
    sim.breakConcentration(fanatic, [fanatic]);
    
    assert.equal(fanatic.ac, 13);
  });
});


// ═══════════════════════════════════════════════════════════════════════════
// TEST 9: Paralyzed creatures auto-fail DEX saves (Sacred Flame)
// ═══════════════════════════════════════════════════════════════════════════

describe('Sacred Flame vs paralyzed target — auto-fail DEX save', () => {
  it('paralyzed target auto-fails the DEX save and takes average d8 damage', () => {
    const fanatic = sim.createCultFanatic(1);
    const bard = sim.createBard();
    bard.conditions = ['paralyzed'];
    
    const turnLog = [];
    sim.resolveCastCantrip(fanatic, { spell: 'Sacred Flame', target: bard }, turnLog);
    
    // d8 avg = 4.5
    assert.equal(bard.currentHP, 62.5); // 67 - 4.5
    assert.equal(bard.totalDamageTaken, 4.5);
    
    const autoFailLog = turnLog.find(l => l.includes('AUTO-FAIL'));
    assert.ok(autoFailLog, 'Log should mention AUTO-FAIL for paralyzed target');
  });
});


// ═══════════════════════════════════════════════════════════════════════════
// TEST 10: Vicious Mockery — disadvantage and damage
// ═══════════════════════════════════════════════════════════════════════════

describe('Vicious Mockery — effect on failed save', () => {
  it('fanatic fails WIS save (avg 11.5 < DC 15), takes 2d4 avg damage, gets vm_disadvantage', () => {
    const bard = sim.createBard();
    const fanatic = sim.createCultFanatic(1);
    
    // DC 15 WIS save. Fanatic WIS +1. Avg: 10.5 + 1 = 11.5 < 15 → fail
    // Damage: d4 + d4 = 2.5 + 2.5 = 5
    const turnLog = [];
    sim.resolveCastCantrip(bard, { spell: 'Vicious Mockery', target: fanatic }, turnLog);
    
    assert.ok(fanatic.conditions.includes('vm_disadvantage'));
    assert.equal(fanatic.currentHP, 28); // 33 - 5
    assert.equal(fanatic.totalDamageTaken, 5);
    assert.equal(bard.totalDamageDealt, 5);
  });
  
  it('vm_disadvantage is consumed after first attack in multiattack', () => {
    const fanatic = sim.createCultFanatic(1);
    fanatic.conditions.push('vm_disadvantage');
    
    const bard = sim.createBard();
    bard.reactedThisRound = true; // Disable Cutting Words to isolate vm_disadvantage
    bard.position = { x: 4, y: 0 };
    fanatic.position = { x: 4, y: 0 };
    bard.flying = false;
    
    // Avg d20 = 10.5. Both attacks: 10.5 + 4 = 14.5 vs AC 14 → both hit.
    // (Disadvantage with avg: both d20s are 10.5, min is 10.5 — same result.)
    // Each hit: 1d4+2 avg = 2.5 + 2 = 4.5. Two hits = 9 total damage.
    const turnLog = [];
    sim.resolveMultiattack(fanatic, { type: 'multiattack', target: bard }, turnLog);
    
    assert.ok(!fanatic.conditions.includes('vm_disadvantage'),
      'vm_disadvantage should be consumed after first attack');
    assert.equal(bard.currentHP, 58); // 67 - 4.5 - 4.5
  });
});


// ═══════════════════════════════════════════════════════════════════════════
// TEST 11: Bard Round 1 AI — Gem Flight + Hypnotic Pattern opening
// ═══════════════════════════════════════════════════════════════════════════

describe('bardTacticalDecision — Round 1 opening', () => {
  it('with 4 active enemies, chooses Gem Flight (BA) + Hypnotic Pattern (Action)', () => {
    const bard = sim.createBard();
    const enemies = [
      sim.createCultFanatic(1),
      sim.createCultFanatic(2),
      sim.createCultFanatic(3),
      sim.createCultFanatic(4),
    ];
    bard.position = { x: 4, y: 0 };
    enemies.forEach((e, i) => { e.position = { x: 2 + i * 2, y: 6 }; });
    
    const decision = sim.bardTacticalDecision(bard, enemies, 1, []);
    
    assert.equal(decision.action.type, 'cast_spell');
    assert.equal(decision.action.spell, 'Hypnotic Pattern');
    assert.equal(decision.action.level, 3);
    
    assert.ok(decision.bonusAction);
    assert.equal(decision.bonusAction.type, 'gem_flight');
    
    assert.ok(decision.movement);
    assert.equal(decision.movement.type, 'fly_up');
  });
  
  it('at critical HP (<25%), prioritizes Greater Invisibility for survival', () => {
    const bard = sim.createBard();
    bard.currentHP = 15; // ~22% of 67
    bard.concentrating = 'Hypnotic Pattern';
    
    const enemies = [sim.createCultFanatic(1)];
    enemies[0].position = { x: 4, y: 6 };
    bard.position = { x: 4, y: 0 };
    
    const decision = sim.bardTacticalDecision(bard, enemies, 5, []);
    
    assert.equal(decision.action.type, 'cast_spell');
    assert.equal(decision.action.spell, 'Greater Invisibility');
    assert.equal(decision.action.level, 4);
  });
});


// ═══════════════════════════════════════════════════════════════════════════
// TEST 12: Cutting Words reaction logic
// ═══════════════════════════════════════════════════════════════════════════

describe('bardReactionDecision — Cutting Words', () => {
  it('triggers when enemy attack would hit and d8 could make it miss', () => {
    const bard = sim.createBard();
    bard.reactedThisRound = false;
    bard.bardicInspirationUses = 4;
    
    const fanatic = sim.createCultFanatic(1);
    
    // Attack total 17 vs AC 14 → hit. But 17 - 8 = 9 < 14, so max d8 could flip it.
    const trigger = {
      type: 'enemy_attack_roll',
      roll: 17,
      targetAC: 14,
      attacker: fanatic,
    };
    
    // d8 avg = 4.5
    const reaction = sim.bardReactionDecision(bard, trigger);
    
    assert.ok(reaction);
    assert.equal(reaction.type, 'cutting_words');
    assert.equal(reaction.die, 4.5);
  });
  
  it('does NOT trigger if already reacted this round', () => {
    const bard = sim.createBard();
    bard.reactedThisRound = true;
    
    const trigger = { type: 'enemy_attack_roll', roll: 17, targetAC: 14, attacker: sim.createCultFanatic(1) };
    const reaction = sim.bardReactionDecision(bard, trigger);
    
    assert.equal(reaction, null);
  });
  
  it('does NOT trigger if no Bardic Inspiration uses remaining', () => {
    const bard = sim.createBard();
    bard.bardicInspirationUses = 0;
    
    const trigger = { type: 'enemy_attack_roll', roll: 17, targetAC: 14, attacker: sim.createCultFanatic(1) };
    const reaction = sim.bardReactionDecision(bard, trigger);
    
    assert.equal(reaction, null);
  });
  
  it('does NOT trigger if max d8 cannot cause a miss', () => {
    const bard = sim.createBard();
    bard.reactedThisRound = false;
    bard.bardicInspirationUses = 4;
    
    // Attack total 23 vs AC 14. Even max d8(8): 23-8=15 >= 14. Still hits.
    const trigger = { type: 'enemy_attack_roll', roll: 23, targetAC: 14, attacker: sim.createCultFanatic(1) };
    const reaction = sim.bardReactionDecision(bard, trigger);
    
    assert.equal(reaction, null);
  });
});
