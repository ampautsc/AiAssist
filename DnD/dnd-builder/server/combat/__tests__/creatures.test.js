/**
 * Creature Factory — unit tests
 * Tests template creation, field initialization, and compatibility with old sim.
 */

const { describe, it, before, after } = require('node:test');
const assert = require('node:assert/strict');

const { createCreature, computeModifier, getTemplateKeys, getTemplate, registerTemplate, CREATURE_TEMPLATES } = require('../data/creatures');
const dice = require('../engine/dice');

before(() => dice.setDiceMode('average'));
after(() => dice.setDiceMode('random'));

// ═══════════════════════════════════════════════════════════════════════════
// computeModifier
// ═══════════════════════════════════════════════════════════════════════════

describe('computeModifier', () => {
  it('10 → +0', () => assert.equal(computeModifier(10), 0));
  it('8 → -1',  () => assert.equal(computeModifier(8), -1));
  it('14 → +2', () => assert.equal(computeModifier(14), 2));
  it('18 → +4', () => assert.equal(computeModifier(18), 4));
  it('20 → +5', () => assert.equal(computeModifier(20), 5));
  it('1 → -5',  () => assert.equal(computeModifier(1), -5));
});

// ═══════════════════════════════════════════════════════════════════════════
// createCreature — Bard template
// ═══════════════════════════════════════════════════════════════════════════

describe('createCreature — bard', () => {
  it('creates a bard with correct HP', () => {
    const bard = createCreature('gem_dragonborn_lore_bard_8');
    assert.equal(bard.maxHP, 67);
    assert.equal(bard.currentHP, 67);
  });

  it('creates a bard with correct AC', () => {
    const bard = createCreature('gem_dragonborn_lore_bard_8');
    assert.equal(bard.ac, 14);
  });

  it('creates a bard with correct ability modifiers', () => {
    const bard = createCreature('gem_dragonborn_lore_bard_8');
    assert.equal(bard.strMod, -1);
    assert.equal(bard.dexMod, 2);
    assert.equal(bard.conMod, 3);
    assert.equal(bard.chaMod, 4);
  });

  it('creates a bard with correct saves', () => {
    const bard = createCreature('gem_dragonborn_lore_bard_8');
    assert.equal(bard.saves.con, 8);
    assert.equal(bard.saves.dex, 5);
    assert.equal(bard.saves.cha, 9);
  });

  it('creates a bard with War Caster', () => {
    const bard = createCreature('gem_dragonborn_lore_bard_8');
    assert.equal(bard.hasWarCaster, true);
  });

  it('creates a bard with spell slots', () => {
    const bard = createCreature('gem_dragonborn_lore_bard_8');
    assert.deepEqual(bard.spellSlots, { 1: 4, 2: 3, 3: 3, 4: 2 });
    assert.deepEqual(bard.maxSlots, { 1: 4, 2: 3, 3: 3, 4: 2 });
  });

  it('creates a bard with spells known', () => {
    const bard = createCreature('gem_dragonborn_lore_bard_8');
    assert.ok(bard.spellsKnown.includes('Hypnotic Pattern'));
    assert.ok(bard.spellsKnown.includes('Counterspell'));
    assert.ok(bard.spellsKnown.includes('Greater Invisibility'));
  });

  it('creates a bard with cantrips', () => {
    const bard = createCreature('gem_dragonborn_lore_bard_8');
    assert.ok(bard.cantrips.includes('Vicious Mockery'));
  });

  it('creates a bard with bardic inspiration', () => {
    const bard = createCreature('gem_dragonborn_lore_bard_8');
    assert.ok(bard.bardicInspiration);
    assert.equal(bard.bardicInspiration.die, 'd8');
    assert.equal(bard.bardicInspiration.uses, 4);
    assert.equal(bard.bardicInspiration.cuttingWords, true);
  });

  it('creates a bard with breath weapon', () => {
    const bard = createCreature('gem_dragonborn_lore_bard_8');
    assert.ok(bard.breathWeapon);
    assert.equal(bard.breathWeapon.damage, '2d8');
    assert.equal(bard.breathWeapon.dc, 14);
  });

  it('creates a bard with gem flight', () => {
    const bard = createCreature('gem_dragonborn_lore_bard_8');
    assert.ok(bard.gemFlight);
    assert.equal(bard.gemFlight.uses, 3);
    assert.equal(bard.gemFlight.active, false);
    assert.equal(bard.gemFlight.maxRounds, 10, 'gemFlight should use maxRounds field');
  });

  it('breath weapon has structured cone targeting geometry', () => {
    const bard = createCreature('gem_dragonborn_lore_bard_8');
    assert.ok(bard.breathWeapon.targeting, 'breathWeapon should have targeting geometry');
    assert.equal(bard.breathWeapon.targeting.type, 'area');
    assert.equal(bard.breathWeapon.targeting.shape, 'cone');
    assert.equal(bard.breathWeapon.targeting.length, 15);
  });

  it('dragonFear has structured cone targeting geometry', () => {
    const bard = createCreature('gem_dragonborn_lore_bard_8');
    assert.ok(bard.dragonFear, 'bard should have dragonFear');
    assert.ok(bard.dragonFear.targeting, 'dragonFear should have targeting geometry');
    assert.equal(bard.dragonFear.targeting.shape, 'cone');
    assert.equal(bard.dragonFear.targeting.length, 30);
  });

  it('creates a bard with light crossbow', () => {
    const bard = createCreature('gem_dragonborn_lore_bard_8');
    assert.ok(bard.weapon);
    assert.equal(bard.weapon.name, 'Light Crossbow');
    assert.equal(bard.weapon.attackBonus, 5);
  });

  it('initializes runtime state correctly', () => {
    const bard = createCreature('gem_dragonborn_lore_bard_8');
    assert.deepEqual(bard.conditions, []);
    assert.equal(bard.concentrating, null);
    assert.equal(bard.flying, false);
    assert.equal(bard.totalDamageDealt, 0);
    assert.equal(bard.reactedThisRound, false);
  });

  it('each creation produces independent objects', () => {
    const bard1 = createCreature('gem_dragonborn_lore_bard_8');
    const bard2 = createCreature('gem_dragonborn_lore_bard_8');
    bard1.currentHP = 10;
    bard1.conditions.push('paralyzed');
    assert.equal(bard2.currentHP, 67);
    assert.deepEqual(bard2.conditions, []);
  });
});

// ═══════════════════════════════════════════════════════════════════════════
// createCreature — Cult Fanatic template
// ═══════════════════════════════════════════════════════════════════════════

describe('createCreature — cult fanatic', () => {
  it('creates a fanatic with correct HP', () => {
    const f = createCreature('cult_fanatic');
    assert.equal(f.maxHP, 33);
    assert.equal(f.currentHP, 33);
  });

  it('creates a fanatic with correct AC', () => {
    const f = createCreature('cult_fanatic');
    assert.equal(f.ac, 13);
  });

  it('creates a fanatic with Dark Devotion', () => {
    const f = createCreature('cult_fanatic');
    assert.equal(f.darkDevotion, true);
  });

  it('creates a fanatic with multiattack 2', () => {
    const f = createCreature('cult_fanatic');
    assert.equal(f.multiattack, 2);
  });

  it('creates a fanatic with spell save DC 11', () => {
    const f = createCreature('cult_fanatic');
    assert.equal(f.spellSaveDC, 11);
  });

  it('creates a fanatic with Hold Person known', () => {
    const f = createCreature('cult_fanatic');
    assert.ok(f.spellsKnown.includes('Hold Person'));
  });

  it('creates a fanatic with Sacred Flame cantrip', () => {
    const f = createCreature('cult_fanatic');
    assert.ok(f.cantrips.includes('Sacred Flame'));
  });

  it('supports name override', () => {
    const f = createCreature('cult_fanatic', { name: 'Cult Fanatic 3', id: 'cf_3' });
    assert.equal(f.name, 'Cult Fanatic 3');
    assert.equal(f.id, 'cf_3');
  });

  it('supports position override', () => {
    const f = createCreature('cult_fanatic', { position: { x: 5, y: 3 } });
    assert.deepEqual(f.position, { x: 5, y: 3 });
  });
});

// ═══════════════════════════════════════════════════════════════════════════
// Registry API
// ═══════════════════════════════════════════════════════════════════════════

describe('getTemplateKeys', () => {
  it('returns at minimum gem_dragonborn_lore_bard_8 and cult_fanatic', () => {
    const keys = getTemplateKeys();
    assert.ok(keys.includes('gem_dragonborn_lore_bard_8'));
    assert.ok(keys.includes('cult_fanatic'));
  });
});

describe('getTemplate', () => {
  it('returns template data without creating creature', () => {
    const t = getTemplate('cult_fanatic');
    assert.equal(t.hp.max, 33);
    assert.equal(t.cr, 2);
  });

  it('throws for unknown template', () => {
    assert.throws(() => getTemplate('goblin'), /Unknown creature template/);
  });
});

describe('registerTemplate', () => {
  // Use a unique key to avoid polluting other tests
  const testKey = '__test_goblin__';
  
  after(() => {
    delete CREATURE_TEMPLATES[testKey];
  });

  it('registers a new template and creates creatures from it', () => {
    registerTemplate(testKey, {
      id: 'goblin',
      name: 'Goblin',
      side: 'enemy',
      type: 'humanoid',
      cr: 0.25,
      abilities: { str: 8, dex: 14, con: 10, int: 10, wis: 8, cha: 8 },
      profBonus: 2,
      hp: { max: 7, formula: '2d6' },
      ac: { base: 15, formula: 'leather+shield' },
      speed: 30,
      saves: { str: -1, dex: 2, con: 0, int: 0, wis: -1, cha: -1 },
      features: {},
      multiattack: 0,
      weapons: [{ name: 'Scimitar', attackBonus: 4, damageDice: '1d6', damageBonus: 2, range: 5, type: 'melee' }],
      tags: ['melee'],
    });

    const g = createCreature(testKey);
    assert.equal(g.name, 'Goblin');
    assert.equal(g.maxHP, 7);
    assert.equal(g.ac, 15);
    assert.equal(g.dexMod, 2);
  });

  it('throws if key already exists', () => {
    assert.throws(() => registerTemplate('cult_fanatic', {}), /Template already exists/);
  });
});

// ═══════════════════════════════════════════════════════════════════════════
// Compatibility — bard creature matches old createBard() shape
// ═══════════════════════════════════════════════════════════════════════════

describe('backward compatibility — bard fields match old sim', () => {
  it('has all required fields for bardTacticalDecision', () => {
    const b = createCreature('gem_dragonborn_lore_bard_8');
    // Fields the old bardTacticalDecision accesses:
    assert.ok('currentHP' in b);
    assert.ok('maxHP' in b);
    assert.ok('ac' in b);
    assert.ok('spellSlots' in b);
    assert.ok('concentrating' in b);
    assert.ok('conditions' in b);
    assert.ok('flying' in b);
    assert.ok('weapon' in b);
    assert.ok('chaMod' in b);
    assert.ok('profBonus' in b);
    assert.ok('saves' in b);
    assert.ok('hasWarCaster' in b);
  });
});

describe('backward compatibility — fanatic fields match old sim', () => {
  it('has all required fields for cultFanaticTacticalDecision', () => {
    const f = createCreature('cult_fanatic');
    assert.ok('currentHP' in f);
    assert.ok('maxHP' in f);
    assert.ok('ac' in f);
    assert.ok('spellSlots' in f);
    assert.ok('spellSaveDC' in f);
    assert.ok('spellAttackBonus' in f);
    assert.ok('concentrating' in f);
    assert.ok('conditions' in f);
    assert.ok('darkDevotion' in f);
    assert.ok('multiattack' in f);
    assert.ok('weapon' in f);
  });
});


// ═══════════════════════════════════════════════════════════════════════════
// MONSTER TEMPLATES — all 12 monsters from the 8 encounter scenarios
// ═══════════════════════════════════════════════════════════════════════════

// ── Undead ──────────────────────────────────────────────────────────────

describe('createCreature — zombie', () => {
  it('creates with correct HP and AC', () => {
    const z = createCreature('zombie');
    assert.equal(z.maxHP, 22);
    assert.equal(z.ac, 8);
  });

  it('has correct ability modifiers', () => {
    const z = createCreature('zombie');
    assert.equal(z.strMod, 1);
    assert.equal(z.dexMod, -2);
    assert.equal(z.conMod, 3);
    assert.equal(z.wisMod, -2);
  });

  it('has slam attack', () => {
    const z = createCreature('zombie');
    assert.equal(z.weapon.name, 'Slam');
    assert.equal(z.weapon.attackBonus, 3);
  });

  it('is enemy side undead', () => {
    const z = createCreature('zombie');
    assert.equal(z.side, 'enemy');
    assert.equal(z.type, 'undead');
    assert.equal(z.cr, 0.25);
  });

  it('has no multiattack', () => {
    const z = createCreature('zombie');
    assert.equal(z.multiattack, 0);
  });

  it('speed is 20', () => {
    const z = createCreature('zombie');
    assert.equal(z.speed, 20);
  });

  it('initializes runtime state', () => {
    const z = createCreature('zombie');
    assert.deepEqual(z.conditions, []);
    assert.equal(z.concentrating, null);
    assert.equal(z.flying, false);
  });
});

describe('createCreature — skeleton', () => {
  it('creates with correct HP and AC', () => {
    const s = createCreature('skeleton');
    assert.equal(s.maxHP, 13);
    assert.equal(s.ac, 13);
  });

  it('has ranged weapon (shortbow) as primary', () => {
    const s = createCreature('skeleton');
    assert.equal(s.weapon.name, 'Shortbow');
    assert.equal(s.weapon.attackBonus, 4);
    assert.equal(s.weapon.type, 'ranged');
  });

  it('has melee backup (shortsword)', () => {
    const s = createCreature('skeleton');
    assert.equal(s.weapons.length, 2);
    assert.equal(s.weapons[1].name, 'Shortsword');
  });

  it('has correct WIS save (-1)', () => {
    const s = createCreature('skeleton');
    assert.equal(s.saves.wis, -1);
  });
});

describe('createCreature — ghoul', () => {
  it('creates with correct HP and AC', () => {
    const g = createCreature('ghoul');
    assert.equal(g.maxHP, 22);
    assert.equal(g.ac, 12);
  });

  it('is immune to charmed', () => {
    const g = createCreature('ghoul');
    assert.equal(g.immuneCharmed, true);
  });

  it('has multiattack 2 (claws + bite)', () => {
    const g = createCreature('ghoul');
    assert.equal(g.multiattack, 2);
    assert.equal(g.weapons[0].name, 'Claws');
    assert.equal(g.weapons[1].name, 'Bite');
  });

  it('claws have paralysis special', () => {
    const g = createCreature('ghoul');
    assert.equal(g.weapons[0].special, 'paralysis');
    assert.equal(g.weapons[0].paralyzeDC, 10);
  });

  it('has WIS save +0', () => {
    const g = createCreature('ghoul');
    assert.equal(g.saves.wis, 0);
  });
});

describe('createCreature — ghast', () => {
  it('creates with correct HP and AC', () => {
    const g = createCreature('ghast');
    assert.equal(g.maxHP, 36);
    assert.equal(g.ac, 13);
  });

  it('is immune to charmed', () => {
    const g = createCreature('ghast');
    assert.equal(g.immuneCharmed, true);
  });

  it('has multiattack 2', () => {
    const g = createCreature('ghast');
    assert.equal(g.multiattack, 2);
  });

  it('has higher attack bonuses than ghoul', () => {
    const g = createCreature('ghast');
    assert.equal(g.weapons[0].attackBonus, 5);  // Claws
    assert.equal(g.weapons[1].attackBonus, 3);   // Bite
  });
});

// ── Lycanthropes ────────────────────────────────────────────────────────

describe('createCreature — werewolf', () => {
  it('creates with correct HP and AC', () => {
    const w = createCreature('werewolf');
    assert.equal(w.maxHP, 58);
    assert.equal(w.ac, 11);
  });

  it('has multiattack 2 (bite + claws)', () => {
    const w = createCreature('werewolf');
    assert.equal(w.multiattack, 2);
    assert.equal(w.weapons[0].name, 'Bite');
    assert.equal(w.weapons[1].name, 'Claws');
  });

  it('has CR 3', () => {
    const w = createCreature('werewolf');
    assert.equal(w.cr, 3);
  });

  it('has WIS save +0', () => {
    const w = createCreature('werewolf');
    assert.equal(w.saves.wis, 0);
  });
});

// ── Dragon ──────────────────────────────────────────────────────────────

describe('createCreature — young red dragon', () => {
  it('creates with correct HP and AC', () => {
    const d = createCreature('young_red_dragon');
    assert.equal(d.maxHP, 178);
    assert.equal(d.ac, 18);
  });

  it('has multiattack 3 (bite + 2 claws)', () => {
    const d = createCreature('young_red_dragon');
    assert.equal(d.multiattack, 3);
    assert.equal(d.weapons[0].name, 'Bite');
    assert.equal(d.weapons[1].name, 'Claw');
  });

  it('has breath weapon resource', () => {
    const d = createCreature('young_red_dragon');
    assert.ok(d.breathWeapon);
    assert.equal(d.breathWeapon.damage, '16d6');
    assert.equal(d.breathWeapon.dc, 17);
    assert.equal(d.breathWeapon.damageType, 'fire');
  });

  it('has CR 10 and high saves', () => {
    const d = createCreature('young_red_dragon');
    assert.equal(d.cr, 10);
    assert.equal(d.saves.con, 9);
    assert.equal(d.saves.wis, 4);
  });

  it('has attack bonus +10', () => {
    const d = createCreature('young_red_dragon');
    assert.equal(d.weapons[0].attackBonus, 10);
    assert.equal(d.weapons[1].attackBonus, 10);
  });

  it('starts flying because it has the flying tag', () => {
    const d = createCreature('young_red_dragon');
    assert.equal(d.flying, true, 'Young Red Dragon should start airborne');
  });

  it('breath weapon has structured targeting geometry', () => {
    const d = createCreature('young_red_dragon');
    assert.ok(d.breathWeapon.targeting, 'breath weapon should have targeting geometry');
    assert.equal(d.breathWeapon.targeting.shape, 'cone');
    assert.equal(d.breathWeapon.targeting.length, 30);
  });
});

// ── Giants ──────────────────────────────────────────────────────────────

describe('createCreature — hill giant', () => {
  it('creates with correct HP and AC', () => {
    const g = createCreature('hill_giant');
    assert.equal(g.maxHP, 105);
    assert.equal(g.ac, 13);
  });

  it('has multiattack 2', () => {
    const g = createCreature('hill_giant');
    assert.equal(g.multiattack, 2);
  });

  it('has greatclub with +8 attack bonus', () => {
    const g = createCreature('hill_giant');
    assert.equal(g.weapon.name, 'Greatclub');
    assert.equal(g.weapon.attackBonus, 8);
  });

  it('has ranged rock attack', () => {
    const g = createCreature('hill_giant');
    assert.equal(g.weapons[1].name, 'Rock');
    assert.equal(g.weapons[1].type, 'ranged');
  });

  it('has WIS save -1', () => {
    const g = createCreature('hill_giant');
    assert.equal(g.saves.wis, -1);
  });
});

describe('createCreature — frost giant', () => {
  it('creates with correct HP and AC', () => {
    const g = createCreature('frost_giant');
    assert.equal(g.maxHP, 138);
    assert.equal(g.ac, 15);
  });

  it('has multiattack 2', () => {
    const g = createCreature('frost_giant');
    assert.equal(g.multiattack, 2);
  });

  it('has greataxe with +9 attack bonus', () => {
    const g = createCreature('frost_giant');
    assert.equal(g.weapon.name, 'Greataxe');
    assert.equal(g.weapon.attackBonus, 9);
  });

  it('has WIS save +3', () => {
    const g = createCreature('frost_giant');
    assert.equal(g.saves.wis, 3);
  });

  it('has CR 8', () => {
    const g = createCreature('frost_giant');
    assert.equal(g.cr, 8);
  });
});

describe('createCreature — ogre', () => {
  it('creates with correct HP and AC', () => {
    const o = createCreature('ogre');
    assert.equal(o.maxHP, 59);
    assert.equal(o.ac, 11);
  });

  it('has no multiattack', () => {
    const o = createCreature('ogre');
    assert.equal(o.multiattack, 0);
  });

  it('has greatclub with +6 attack bonus', () => {
    const o = createCreature('ogre');
    assert.equal(o.weapon.name, 'Greatclub');
    assert.equal(o.weapon.attackBonus, 6);
  });

  it('has WIS save -2', () => {
    const o = createCreature('ogre');
    assert.equal(o.saves.wis, -2);
  });
});

// ── Humanoids ───────────────────────────────────────────────────────────

describe('createCreature — bandit', () => {
  it('creates with correct HP and AC', () => {
    const b = createCreature('bandit');
    assert.equal(b.maxHP, 11);
    assert.equal(b.ac, 12);
  });

  it('has melee and ranged weapons', () => {
    const b = createCreature('bandit');
    assert.equal(b.weapons[0].name, 'Scimitar');
    assert.equal(b.weapons[1].name, 'Light Crossbow');
  });

  it('has CR 1/8', () => {
    const b = createCreature('bandit');
    assert.equal(b.cr, 0.125);
  });
});

describe('createCreature — bandit captain', () => {
  it('creates with correct HP and AC', () => {
    const c = createCreature('bandit_captain');
    assert.equal(c.maxHP, 65);
    assert.equal(c.ac, 15);
  });

  it('has multiattack 3 (2 scimitar + dagger)', () => {
    const c = createCreature('bandit_captain');
    assert.equal(c.multiattack, 3);
    assert.equal(c.weapons[0].name, 'Scimitar');
    assert.equal(c.weapons[1].name, 'Dagger');
  });

  it('has WIS save +2', () => {
    const c = createCreature('bandit_captain');
    assert.equal(c.saves.wis, 2);
  });
});

// ── Casters ─────────────────────────────────────────────────────────────

describe('createCreature — mage', () => {
  it('creates with correct HP and AC', () => {
    const m = createCreature('mage');
    assert.equal(m.maxHP, 40);
    assert.equal(m.ac, 15);  // with Mage Armor
  });

  it('has spell save DC 14', () => {
    const m = createCreature('mage');
    assert.equal(m.spellSaveDC, 14);
  });

  it('has spell attack bonus +6', () => {
    const m = createCreature('mage');
    assert.equal(m.spellAttackBonus, 6);
  });

  it('knows Counterspell and Fireball', () => {
    const m = createCreature('mage');
    assert.ok(m.spellsKnown.includes('Counterspell'));
    assert.ok(m.spellsKnown.includes('Fireball'));
  });

  it('has Fire Bolt cantrip', () => {
    const m = createCreature('mage');
    assert.ok(m.cantrips.includes('Fire Bolt'));
  });

  it('has WIS save +4', () => {
    const m = createCreature('mage');
    assert.equal(m.saves.wis, 4);
  });

  it('has spell slots up to 5th level', () => {
    const m = createCreature('mage');
    assert.equal(m.spellSlots[5], 1);
    assert.equal(m.spellSlots[3], 3);
  });

  it('has CR 6', () => {
    const m = createCreature('mage');
    assert.equal(m.cr, 6);
  });
});

describe('createCreature — archmage', () => {
  it('creates with correct HP and AC', () => {
    const a = createCreature('archmage');
    assert.equal(a.maxHP, 99);
    assert.equal(a.ac, 15);  // with Mage Armor
  });

  it('has Magic Resistance', () => {
    const a = createCreature('archmage');
    assert.equal(a.magicResistance, true);
  });

  it('has spell save DC 17', () => {
    const a = createCreature('archmage');
    assert.equal(a.spellSaveDC, 17);
  });

  it('knows Counterspell and Cone of Cold', () => {
    const a = createCreature('archmage');
    assert.ok(a.spellsKnown.includes('Counterspell'));
    assert.ok(a.spellsKnown.includes('Cone of Cold'));
  });

  it('has WIS save +6', () => {
    const a = createCreature('archmage');
    assert.equal(a.saves.wis, 6);
  });

  it('has CR 12', () => {
    const a = createCreature('archmage');
    assert.equal(a.cr, 12);
  });

  it('has slots up to 9th level', () => {
    const a = createCreature('archmage');
    assert.equal(a.spellSlots[9], 1);
    assert.equal(a.spellSlots[1], 4);
  });
});

describe('createCreature — lich', () => {
  it('creates with correct HP and AC', () => {
    const l = createCreature('lich');
    assert.equal(l.maxHP, 135);
    assert.equal(l.ac, 17);
  });

  it('is immune to charmed', () => {
    const l = createCreature('lich');
    assert.equal(l.immuneCharmed, true);
  });

  it('has legendary resistance resource', () => {
    const l = createCreature('lich');
    assert.ok(l.legendaryResistance);
    assert.equal(l.legendaryResistance.uses, 3);
  });

  it('has legendary actions resource', () => {
    const l = createCreature('lich');
    assert.ok(l.legendaryActions);
    assert.equal(l.legendaryActions.uses, 3);
  });

  it('has spell save DC 20', () => {
    const l = createCreature('lich');
    assert.equal(l.spellSaveDC, 20);
  });

  it('has Paralyzing Touch attack', () => {
    const l = createCreature('lich');
    assert.equal(l.weapon.name, 'Paralyzing Touch');
    assert.equal(l.weapon.attackBonus, 12);
    assert.equal(l.weapon.special, 'paralysis');
    assert.equal(l.weapon.paralyzeDC, 18);
  });

  it('knows Counterspell and Fireball', () => {
    const l = createCreature('lich');
    assert.ok(l.spellsKnown.includes('Counterspell'));
    assert.ok(l.spellsKnown.includes('Fireball'));
  });

  it('has WIS save +9', () => {
    const l = createCreature('lich');
    assert.equal(l.saves.wis, 9);
  });

  it('has CR 21', () => {
    const l = createCreature('lich');
    assert.equal(l.cr, 21);
  });
});

// ═══════════════════════════════════════════════════════════════════════════
// getTemplateKeys — should now include all 14 templates
// ═══════════════════════════════════════════════════════════════════════════

describe('getTemplateKeys — complete set', () => {
  it('includes all 14 creature templates', () => {
    const keys = getTemplateKeys();
    const expected = [
      'gem_dragonborn_lore_bard_8', 'cult_fanatic',
      'zombie', 'skeleton', 'ghoul', 'ghast',
      'werewolf', 'young_red_dragon',
      'hill_giant', 'frost_giant', 'ogre',
      'bandit', 'bandit_captain',
      'mage', 'archmage', 'lich',
    ];
    for (const key of expected) {
      assert.ok(keys.includes(key), `Missing template: ${key}`);
    }
  });
});

// ═══════════════════════════════════════════════════════════════════════════
// All monster templates — common runtime fields
// ═══════════════════════════════════════════════════════════════════════════

describe('all monster templates — runtime state', () => {
  const monsterKeys = [
    'zombie', 'skeleton', 'ghoul', 'ghast', 'werewolf',
    'young_red_dragon', 'hill_giant', 'frost_giant', 'ogre',
    'bandit', 'bandit_captain', 'mage', 'archmage', 'lich',
  ];

  for (const key of monsterKeys) {
    it(`${key}: initializes runtime state correctly`, () => {
      const c = createCreature(key);
      assert.deepEqual(c.conditions, []);
      assert.equal(c.concentrating, null);
      // Naturally flying creatures (tagged 'flying') start airborne
      const template = require('../data/creatures').getTemplate(key);
      const expectFlying = !!(template.tags && template.tags.includes('flying'));
      assert.equal(c.flying, expectFlying, `${key}: flying should be ${expectFlying}`);
      assert.equal(c.totalDamageDealt, 0);
      assert.equal(c.totalDamageTaken, 0);
      assert.equal(c.reactedThisRound, false);
    });

    it(`${key}: has required combat fields`, () => {
      const c = createCreature(key);
      assert.ok('currentHP' in c);
      assert.ok('maxHP' in c);
      assert.ok('ac' in c);
      assert.ok('saves' in c);
      assert.ok('side' in c);
      assert.equal(c.side, 'enemy');
      assert.ok(c.weapon !== undefined, 'should have at least one weapon');
    });

    it(`${key}: each creation produces independent objects`, () => {
      const c1 = createCreature(key);
      const c2 = createCreature(key);
      c1.currentHP = 1;
      c1.conditions.push('paralyzed');
      assert.notEqual(c2.currentHP, 1);
      assert.deepEqual(c2.conditions, []);
    });
  }
});
