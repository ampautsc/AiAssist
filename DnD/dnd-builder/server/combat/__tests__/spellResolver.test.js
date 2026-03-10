/**
 * Spell Resolver — unit tests
 * Tests the generic spell resolution pipeline against spell registry data.
 */

const { describe, it, before, after, beforeEach } = require('node:test');
const assert = require('node:assert/strict');

const dice = require('../engine/dice');
const { createCreature } = require('../data/creatures');
const resolver = require('../engine/spellResolver');

before(() => dice.setDiceMode('average'));
after(() => dice.setDiceMode('random'));

// ═══════════════════════════════════════════════════════════════════════════
// Helper — create combatants for testing
// ═══════════════════════════════════════════════════════════════════════════

function makeBard() {
  return createCreature('gem_dragonborn_lore_bard_8');
}

function makeFanatic(index = 1) {
  return createCreature('cult_fanatic', {
    name: `Cult Fanatic ${index}`,
    id: `cult_fanatic_${index}`,
    position: { x: index, y: 0 },
  });
}

// ═══════════════════════════════════════════════════════════════════════════
// Slot Management
// ═══════════════════════════════════════════════════════════════════════════

describe('spendSlot', () => {
  it('decrements slot count', () => {
    const bard = makeBard();
    assert.equal(bard.spellSlots[1], 4);
    const ok = resolver.spendSlot(bard, 1);
    assert.equal(ok, true);
    assert.equal(bard.spellSlots[1], 3);
  });

  it('returns false when no slots remain', () => {
    const bard = makeBard();
    bard.spellSlots[4] = 0;
    const ok = resolver.spendSlot(bard, 4);
    assert.equal(ok, false);
    assert.equal(bard.spellSlots[4], 0); // unchanged
  });

  it('increments spellsCast counter', () => {
    const bard = makeBard();
    resolver.spendSlot(bard, 1);
    assert.equal(bard.spellsCast, 1);
  });
});

describe('hasSlot', () => {
  it('true when slots available', () => {
    const bard = makeBard();
    assert.equal(resolver.hasSlot(bard, 3), true);
  });

  it('false when slots exhausted', () => {
    const bard = makeBard();
    bard.spellSlots[4] = 0;
    assert.equal(resolver.hasSlot(bard, 4), false);
  });

  it('always true for cantrips (level 0)', () => {
    const bard = makeBard();
    assert.equal(resolver.hasSlot(bard, 0), true);
  });
});

// ═══════════════════════════════════════════════════════════════════════════
// getSaveDC
// ═══════════════════════════════════════════════════════════════════════════

describe('getSaveDC', () => {
  it('cult fanatic uses spellSaveDC directly', () => {
    const f = makeFanatic();
    assert.equal(resolver.getSaveDC(f, {}), 11);
  });
});

// ═══════════════════════════════════════════════════════════════════════════
// resolveSpell — Hypnotic Pattern (AoE save)
// ═══════════════════════════════════════════════════════════════════════════

describe('resolveSpell — Hypnotic Pattern', () => {
  it('charms targets that fail WIS save', () => {
    const bard = makeBard();
    const f1 = makeFanatic(1);
    const f2 = makeFanatic(2);
    const all = [bard, f1, f2];
    const log = [];

    // In average mode: WIS save = 10.5 + 1 = 11.5 vs DC 15 → FAIL
    const result = resolver.resolveSpell(bard, {
      spell: 'Hypnotic Pattern',
      level: 3,
      targets: [f1, f2],
    }, all, log);

    assert.equal(result.success, true);
    assert.equal(result.details.affectedCount, 2);
    assert.ok(f1.conditions.includes('charmed_hp'));
    assert.ok(f1.conditions.includes('incapacitated'));
    assert.ok(f2.conditions.includes('charmed_hp'));
    assert.equal(bard.concentrating, 'Hypnotic Pattern');
    assert.equal(bard.spellSlots[3], 2); // spent one 3rd-level slot
  });

  it('skips dead targets', () => {
    const bard = makeBard();
    const f1 = makeFanatic(1);
    f1.currentHP = 0;
    const f2 = makeFanatic(2);
    const all = [bard, f1, f2];
    const log = [];

    const result = resolver.resolveSpell(bard, {
      spell: 'Hypnotic Pattern', level: 3, targets: [f1, f2],
    }, all, log);

    assert.equal(result.details.affectedCount, 1);
    assert.deepEqual(f1.conditions, []); // dead target not affected
  });
});

// ═══════════════════════════════════════════════════════════════════════════
// resolveSpell — Hold Person (single-target save)
// ═══════════════════════════════════════════════════════════════════════════

describe('resolveSpell — Hold Person', () => {
  it('paralyzes target on failed WIS save', () => {
    const f1 = makeFanatic(1);
    const bard = makeBard();
    const all = [f1, bard];
    const log = [];

    // fanatic casts Hold Person: DC 11, bard WIS save = 10.5 + 1 = 11.5 → SUCCESS
    // Actually we need the bard to FAIL. With average dice, bard WIS save +1, total 11.5 vs DC 11 → SUCCESS
    // Let's have the fanatic target another fanatic with low wis to test the save mechanic
    const f2 = makeFanatic(2);
    const all2 = [f1, f2];
    const log2 = [];

    // f1 casts Hold Person on f2: DC 11, f2 WIS save = 10.5 + 1 = 11.5 → SUCCESS
    // In average mode, 10.5 + 1 = 11.5 >= 11 → always succeeds for WIS +1 vs DC 11
    // Let's just check the mechanics work — use bard as caster (DC 15) on fanatic (WIS +1)
    const result = resolver.resolveSpell(bard, {
      spell: 'Hold Person', level: 2, target: f2,
    }, all2, log2);

    // bard DC = 15, fanatic WIS save 10.5 + 1 = 11.5 < 15 → FAIL
    assert.equal(result.success, true);
    assert.equal(result.details.saved, false);
    assert.ok(f2.conditions.includes('paralyzed'));
    assert.equal(bard.concentrating, 'Hold Person');
    assert.equal(bard.spellSlots[2], 2);
  });

  it('target resists on successful save', () => {
    const f1 = makeFanatic(1);
    const bard = makeBard();
    const all = [f1, bard];
    const log = [];

    // fanatic DC = 11, bard WIS +1, average = 11.5 >= 11 → SUCCESS
    const result = resolver.resolveSpell(f1, {
      spell: 'Hold Person', level: 2, target: bard,
    }, all, log);

    assert.equal(result.details.saved, true);
    assert.deepEqual(bard.conditions, []); // no paralyzed
    assert.equal(f1.concentrating, null); // no concentration set on success
  });
});

// ═══════════════════════════════════════════════════════════════════════════
// resolveSpell — Greater Invisibility (self-buff)
// ═══════════════════════════════════════════════════════════════════════════

describe('resolveSpell — Greater Invisibility', () => {
  it('makes caster invisible with concentration', () => {
    const bard = makeBard();
    const log = [];

    const result = resolver.resolveSpell(bard, {
      spell: 'Greater Invisibility', level: 4,
    }, [bard], log);

    assert.equal(result.success, true);
    assert.ok(bard.conditions.includes('invisible'));
    assert.equal(bard.concentrating, 'Greater Invisibility');
    assert.equal(bard.spellSlots[4], 1);
  });
});

// ═══════════════════════════════════════════════════════════════════════════
// resolveSpell — Inflict Wounds (melee spell attack)
// ═══════════════════════════════════════════════════════════════════════════

describe('resolveSpell — Inflict Wounds', () => {
  it('deals 3d10 necrotic on hit', () => {
    const f1 = makeFanatic(1);
    const bard = makeBard();
    const all = [f1, bard];
    const log = [];

    // fanatic spell attack +3, average d20 = 10.5, total = 13.5 vs bard AC 14 → MISS
    // So we need to test against a lower AC target
    const f2 = makeFanatic(2);
    f2.ac = 10; // make it hittable
    const all2 = [f1, f2];
    const log2 = [];

    const result = resolver.resolveSpell(f1, {
      spell: 'Inflict Wounds', level: 1, target: f2,
    }, all2, log2);

    // spell attack +3, average d20 = 10.5, total 13.5 vs AC 10 → HIT
    assert.equal(result.success, true);
    assert.equal(result.details.hit, true);
    // 3d10 average = 3 * 5.5 = 16.5
    assert.equal(f2.currentHP, 33 - 16.5);
    assert.equal(f1.totalDamageDealt, 16.5);
  });

  it('misses when attack doesn\'t meet AC', () => {
    const f1 = makeFanatic(1);
    const bard = makeBard();
    const log = [];

    // fanatic spell attack +3, average 10.5 + 3 = 13.5 vs AC 14 → MISS
    const result = resolver.resolveSpell(f1, {
      spell: 'Inflict Wounds', level: 1, target: bard,
    }, [f1, bard], log);

    assert.equal(result.details.hit, false);
    assert.equal(bard.currentHP, 67); // no damage
  });
});

// ═══════════════════════════════════════════════════════════════════════════
// resolveSpell — Vicious Mockery (cantrip, save-or-suck)
// ═══════════════════════════════════════════════════════════════════════════

describe('resolveCantrip — Vicious Mockery', () => {
  it('deals psychic damage and applies disadvantage on failed save', () => {
    const bard = makeBard();
    const f1 = makeFanatic(1);
    const log = [];

    // Bard DC = 15, fanatic WIS +1, average 10.5 + 1 = 11.5 < 15 → FAIL
    const result = resolver.resolveCantrip(bard, {
      spell: 'Vicious Mockery', target: f1,
    }, [bard, f1], log);

    assert.equal(result.success, true);
    assert.equal(result.details.saved, false);
    // 2d4 average = 2 * 2.5 = 5
    assert.equal(f1.currentHP, 33 - 5);
    assert.ok(f1.conditions.includes('vm_disadvantage'));
  });
});

// ═══════════════════════════════════════════════════════════════════════════
// resolveSpell — Sacred Flame (cantrip, auto-fail if paralyzed)
// ═══════════════════════════════════════════════════════════════════════════

describe('resolveCantrip — Sacred Flame', () => {
  it('deals radiant damage on failed DEX save', () => {
    const f1 = makeFanatic(1);
    const bard = makeBard();
    bard.ac = 10;
    const log = [];

    // fanatic DC 11, bard DEX +5, average 10.5 + 5 = 15.5 > 11 → SUCCESS
    // Need target with low DEX save — use another fanatic
    const f2 = makeFanatic(2);
    // f1 DC 11, f2 DEX save = 10.5 + 2 = 12.5 > 11 → SUCCESS
    // Sacred Flame negates all on success, so this won't deal damage
    // Let's test with a paralyzed target for auto-fail
    f2.conditions.push('paralyzed');
    const log2 = [];

    const result = resolver.resolveCantrip(f1, {
      spell: 'Sacred Flame', target: f2,
    }, [f1, f2], log2);

    // Paralyzed → auto-fail DEX, 1d8 average = 4.5
    assert.equal(result.details.saved, false);
    assert.equal(f2.currentHP, 33 - 4.5);
  });
});

// ═══════════════════════════════════════════════════════════════════════════
// resolveSpell — Shield of Faith (self-buff with concentration)
// ═══════════════════════════════════════════════════════════════════════════

describe('resolveSpell — Shield of Faith', () => {
  it('grants +2 AC and sets concentration', () => {
    const f1 = makeFanatic(1);
    const log = [];

    const beforeAC = f1.ac;
    const result = resolver.resolveSpell(f1, {
      spell: 'Shield of Faith', level: 1, target: f1,
    }, [f1], log);

    assert.equal(result.success, true);
    assert.equal(f1.ac, beforeAC + 2);
    assert.equal(f1.concentrating, 'Shield of Faith');
  });
});

// ═══════════════════════════════════════════════════════════════════════════
// resolveSpell — Counterspell via onReaction callback
// ═══════════════════════════════════════════════════════════════════════════

describe('resolveSpell — Counterspell reaction', () => {
  it('spell is countered when onReaction returns countered', () => {
    const f1 = makeFanatic(1);
    const bard = makeBard();
    const log = [];

    const result = resolver.resolveSpell(f1, {
      spell: 'Hold Person', level: 2, target: bard,
    }, [f1, bard], log, {
      onReaction: (event) => {
        return { countered: true, counteredBy: bard.name };
      },
    });

    assert.equal(result.success, false);
    assert.equal(result.countered, true);
    assert.deepEqual(bard.conditions, []); // not paralyzed
  });

  it('spell resolves normally when onReaction returns null', () => {
    const bard = makeBard();
    const f1 = makeFanatic(1);
    const log = [];

    // Bard DC 15, fanatic WIS +1, 10.5+1=11.5 < 15 → FAIL
    const result = resolver.resolveSpell(bard, {
      spell: 'Hold Person', level: 2, target: f1,
    }, [bard, f1], log, {
      onReaction: () => null,
    });

    assert.equal(result.success, true);
    assert.equal(result.countered, false);
    assert.ok(f1.conditions.includes('paralyzed'));
  });
});

// ═══════════════════════════════════════════════════════════════════════════
// Concentration switch — casting new concentration drops old
// ═══════════════════════════════════════════════════════════════════════════

describe('concentration switch', () => {
  it('casting Hold Person drops existing Hypnotic Pattern', () => {
    const bard = makeBard();
    const f1 = makeFanatic(1);
    const f2 = makeFanatic(2);
    f1.conditions.push('charmed_hp', 'incapacitated');
    bard.concentrating = 'Hypnotic Pattern';
    bard.concentrationRoundsRemaining = 8;
    const log = [];

    resolver.resolveSpell(bard, {
      spell: 'Hold Person', level: 2, target: f2,
    }, [bard, f1, f2], log);

    // Old HP removed
    assert.deepEqual(f1.conditions, []);
    // New concentration on Hold Person (fanatic failed save)
    assert.equal(bard.concentrating, 'Hold Person');
  });
});

// ═══════════════════════════════════════════════════════════════════════════
// Error handling
// ═══════════════════════════════════════════════════════════════════════════

describe('error handling', () => {
  it('returns failure for unknown spell', () => {
    const bard = makeBard();
    const log = [];
    const result = resolver.resolveSpell(bard, { spell: 'Meteor Swarm', level: 9 }, [bard], log);
    assert.equal(result.success, false);
    assert.equal(result.details.error, 'unknown_spell');
  });

  it('returns failure when no slots remain', () => {
    const bard = makeBard();
    bard.spellSlots[3] = 0;
    const log = [];
    const f1 = makeFanatic(1);
    const result = resolver.resolveSpell(bard, {
      spell: 'Hypnotic Pattern', level: 3, targets: [f1],
    }, [bard, f1], log);
    assert.equal(result.success, false);
    assert.equal(result.details.error, 'no_slots');
  });
});

// ═══════════════════════════════════════════════════════════════════════════
// Dark Devotion — advantage on saves vs charmed
// ═══════════════════════════════════════════════════════════════════════════

describe('Dark Devotion — advantage on charmed saves', () => {
  it('fanatics get advantage on Hypnotic Pattern saves', () => {
    const bard = makeBard();
    const f1 = makeFanatic(1);
    const log = [];

    resolver.resolveSpell(bard, {
      spell: 'Hypnotic Pattern', level: 3, targets: [f1],
    }, [bard, f1], log);

    // Even with advantage (both 10.5 → max 10.5), total = 11.5 < 15 → still fails
    // But the log should mention advantage
    const advLog = log.find(l => l.includes('ADV'));
    assert.ok(advLog, 'Should log advantage from Dark Devotion');
  });
});

// ═══════════════════════════════════════════════════════════════════════════
// Concentration damage check
// ═══════════════════════════════════════════════════════════════════════════

describe('concentration check from spell damage', () => {
  it('Inflict Wounds triggers concentration check on hit', () => {
    const f1 = makeFanatic(1);
    const bard = makeBard();
    bard.concentrating = 'Hypnotic Pattern';
    bard.ac = 10; // make hittable
    const log = [];

    resolver.resolveSpell(f1, {
      spell: 'Inflict Wounds', level: 1, target: bard,
    }, [f1, bard], log);

    // Spell hits, 3d10 avg = 16.5 → concentration DC = max(10, 8) = 10
    // Bard CON save +8 with War Caster (advantage): 10.5 + 8 = 18.5 >= 10 → MAINTAINED
    const conLog = log.find(l => l.includes('Concentration save'));
    assert.ok(conLog, 'Should have concentration save in log');
    assert.ok(conLog.includes('MAINTAINED'), 'Bard should maintain with +8 CON and War Caster');
  });
});
