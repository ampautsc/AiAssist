/**
 * Build-to-Creature Converter Tests
 * 
 * Tests that a populated MongoDB build document is correctly transformed
 * into a combat-ready creature object matching the shape from createCreature().
 * 
 * Mock builds cover key variation patterns:
 *   - Gem Dragonborn (breath weapon + gem flight)
 *   - Aarakocra (permanent flight)
 *   - Tortle (natural armor AC 17)
 *   - Deep Gnome (magic resistance)
 *   - Feat combos: War Caster, Resilient(CON), Fey Touched, Moderately Armored
 *   - Item combos: Bracers of Defense, Cloak of Protection, Stone of Good Luck,
 *     Instrument of the Bards, Winged Boots
 */

const { describe, it, beforeEach } = require('node:test');
const assert = require('node:assert/strict');
const { buildToCreature } = require('../data/buildConverter');


// ═══════════════════════════════════════════════════════════════════════════
// MOCK DATA — realistic populated build documents (plain objects)
// ═══════════════════════════════════════════════════════════════════════════

function mockGemDragonbornIronConc() {
  return {
    _id: 'build-gem-iron',
    name: 'Gem Dragonborn — Iron Concentration',
    level: 8,
    baseStats: { str: 8, dex: 14, con: 14, int: 8, wis: 12, cha: 16 },
    speciesAsi: [
      { stat: 'CHA', bonus: 2 },
      { stat: 'CON', bonus: 1 },
    ],
    species: {
      name: 'Gem Dragonborn',
      creatureType: 'Humanoid',
      size: ['Medium'],
      speed: { walk: 30 },
      hasFlight: true,         // gem flight (limited, not permanent)
      darkvision: 60,
      resistances: [],
      conditionImmunities: [],
      naturalArmorAC: null,
      traitList: [
        { name: 'Gem Ancestry', description: 'Force damage type.' },
        { name: 'Breath Weapon', description: '15ft cone, 2d8 force, DEX save.' },
        { name: 'Draconic Resistance', description: 'Resistance to force damage.' },
        { name: 'Psionic Mind', description: 'Telepathy 30ft.' },
        { name: 'Gem Flight', description: 'PB/long rest, 1 minute.' },
      ],
    },
    levelChoices: [
      {
        level: 4, type: 'feat',
        feat: {
          name: 'War Caster',
          isHalfFeat: false,
          grantsAdvConSaves: true,
          grantsProfConSaves: false,
          grantsArmorProficiency: null,
          bonusSpells: [],
        },
        halfFeatStat: null,
      },
      {
        level: 8, type: 'feat',
        feat: {
          name: 'Resilient (CON)',
          isHalfFeat: true,
          grantsAdvConSaves: false,
          grantsProfConSaves: true,
          grantsArmorProficiency: null,
          bonusSpells: [],
        },
        halfFeatStat: 'CON',
      },
    ],
    items: [
      { name: 'Bracers of Defense', acBonus: 2, saveBonus: 0, spellDcBonus: 0, spellAttackBonus: 0, requiresNoArmor: true, imposesCharmDisadvantage: false },
      { name: 'Cloak of Protection', acBonus: 1, saveBonus: 1, spellDcBonus: 0, spellAttackBonus: 0, requiresNoArmor: false, imposesCharmDisadvantage: false },
    ],
  };
}

function mockAarakocraMusician() {
  return {
    _id: 'build-aarakocra-musician',
    name: 'Aarakocra — Bardic Musician',
    level: 8,
    baseStats: { str: 8, dex: 14, con: 14, int: 8, wis: 12, cha: 16 },
    speciesAsi: [
      { stat: 'CHA', bonus: 2 },
      { stat: 'CON', bonus: 1 },
    ],
    species: {
      name: 'Aarakocra',
      creatureType: 'Humanoid',
      size: ['Medium'],
      speed: { walk: 30, fly: 30 },
      hasFlight: true,
      darkvision: 0,
      resistances: [],
      conditionImmunities: [],
      naturalArmorAC: null,
      traitList: [
        { name: 'Flight', description: 'You have a flying speed of 30 feet.' },
        { name: 'Talons', description: '1d6 slashing natural weapon.' },
        { name: 'Wind Caller', description: 'Cast Gust of Wind PB/long rest.' },
      ],
    },
    levelChoices: [
      {
        level: 4, type: 'feat',
        feat: {
          name: 'Fey Touched',
          isHalfFeat: true,
          grantsAdvConSaves: false,
          grantsProfConSaves: false,
          grantsArmorProficiency: null,
          bonusSpells: ['Misty Step'],
        },
        halfFeatStat: 'CHA',
      },
    ],
    items: [
      { name: 'Instrument of the Bards (Cli Lyre)', acBonus: 0, saveBonus: 0, spellDcBonus: 0, spellAttackBonus: 0, requiresNoArmor: false, imposesCharmDisadvantage: true },
      { name: 'Cloak of Protection', acBonus: 1, saveBonus: 1, spellDcBonus: 0, spellAttackBonus: 0, requiresNoArmor: false, imposesCharmDisadvantage: false },
    ],
  };
}

function mockTortleArmored() {
  return {
    _id: 'build-tortle-armored',
    name: 'Tortle — Armored Diplomat',
    level: 8,
    baseStats: { str: 8, dex: 14, con: 14, int: 8, wis: 12, cha: 16 },
    speciesAsi: [
      { stat: 'CHA', bonus: 2 },
      { stat: 'CON', bonus: 1 },
    ],
    species: {
      name: 'Tortle',
      creatureType: 'Humanoid',
      size: ['Medium'],
      speed: { walk: 30 },
      hasFlight: false,
      darkvision: 0,
      resistances: [],
      conditionImmunities: [],
      naturalArmorAC: 17,
      traitList: [
        { name: 'Natural Armor', description: 'AC is 17. DEX doesn\'t apply.' },
        { name: 'Shell Defense', description: 'Withdraw for +4 AC.' },
        { name: 'Claws', description: '1d6 slashing natural weapon.' },
      ],
    },
    levelChoices: [
      {
        level: 4, type: 'feat',
        feat: {
          name: 'Moderately Armored',
          isHalfFeat: false,
          grantsAdvConSaves: false,
          grantsProfConSaves: false,
          grantsArmorProficiency: 'medium+shield',
          bonusSpells: [],
        },
        halfFeatStat: null,
      },
      {
        level: 8, type: 'feat',
        feat: {
          name: 'War Caster',
          isHalfFeat: false,
          grantsAdvConSaves: true,
          grantsProfConSaves: false,
          grantsArmorProficiency: null,
          bonusSpells: [],
        },
        halfFeatStat: null,
      },
    ],
    items: [
      { name: 'Cloak of Protection', acBonus: 1, saveBonus: 1, spellDcBonus: 0, spellAttackBonus: 0, requiresNoArmor: false, imposesCharmDisadvantage: false },
      { name: 'Stone of Good Luck (Luckstone)', acBonus: 0, saveBonus: 1, spellDcBonus: 0, spellAttackBonus: 0, requiresNoArmor: false, imposesCharmDisadvantage: false },
    ],
  };
}

function mockDeepGnomeMagicRes() {
  return {
    _id: 'build-deep-gnome-mr',
    name: 'Deep Gnome — Bardic Musician',
    level: 8,
    baseStats: { str: 8, dex: 14, con: 14, int: 8, wis: 12, cha: 16 },
    speciesAsi: [
      { stat: 'CHA', bonus: 2 },
      { stat: 'CON', bonus: 1 },
    ],
    species: {
      name: 'Deep Gnome',
      creatureType: 'Humanoid',
      size: ['Small'],
      speed: { walk: 25 },
      hasFlight: false,
      darkvision: 120,
      resistances: [],
      conditionImmunities: [],
      naturalArmorAC: null,
      traitList: [
        { name: 'Gnomish Magic Resistance', description: 'ADV on INT/WIS/CHA saves vs magic.' },
        { name: 'Svirfneblin Camouflage', description: 'Advantage on Stealth in rocky terrain.' },
      ],
    },
    levelChoices: [
      {
        level: 4, type: 'feat',
        feat: {
          name: 'Fey Touched',
          isHalfFeat: true,
          grantsAdvConSaves: false,
          grantsProfConSaves: false,
          grantsArmorProficiency: null,
          bonusSpells: ['Misty Step'],
        },
        halfFeatStat: 'CHA',
      },
    ],
    items: [
      { name: 'Cloak of Protection', acBonus: 1, saveBonus: 1, spellDcBonus: 0, spellAttackBonus: 0, requiresNoArmor: false, imposesCharmDisadvantage: false },
      { name: 'Stone of Good Luck (Luckstone)', acBonus: 0, saveBonus: 1, spellDcBonus: 0, spellAttackBonus: 0, requiresNoArmor: false, imposesCharmDisadvantage: false },
    ],
  };
}

function mockWingedBootsBuild() {
  return {
    _id: 'build-winged-boots',
    name: 'Human — Winged Boots Build',
    level: 8,
    baseStats: { str: 8, dex: 14, con: 14, int: 8, wis: 12, cha: 16 },
    speciesAsi: [
      { stat: 'CHA', bonus: 2 },
      { stat: 'CON', bonus: 1 },
    ],
    species: {
      name: 'Human',
      creatureType: 'Humanoid',
      size: ['Medium'],
      speed: { walk: 30 },
      hasFlight: false,
      darkvision: 0,
      resistances: [],
      conditionImmunities: [],
      naturalArmorAC: null,
      traitList: [],
    },
    levelChoices: [
      {
        level: 4, type: 'feat',
        feat: {
          name: 'Fey Touched',
          isHalfFeat: true,
          grantsAdvConSaves: false,
          grantsProfConSaves: false,
          grantsArmorProficiency: null,
          bonusSpells: ['Misty Step'],
        },
        halfFeatStat: 'CHA',
      },
    ],
    items: [
      { name: 'Cloak of Protection', acBonus: 1, saveBonus: 1, spellDcBonus: 0, spellAttackBonus: 0, requiresNoArmor: false, imposesCharmDisadvantage: false },
      { name: 'Winged Boots', acBonus: 0, saveBonus: 0, spellDcBonus: 0, spellAttackBonus: 0, requiresNoArmor: false, imposesCharmDisadvantage: false },
    ],
  };
}

// Aven: species flight with "no medium or heavy armor" restriction
function mockAvenMusician() {
  return {
    _id: 'build-aven-musician',
    name: 'Aven — Bardic Musician',
    level: 8,
    baseStats: { str: 8, dex: 14, con: 14, int: 8, wis: 12, cha: 16 },
    speciesAsi: [
      { stat: 'CHA', bonus: 2 },
      { stat: 'CON', bonus: 1 },
    ],
    species: {
      name: 'Aven',
      creatureType: 'Humanoid',
      size: ['Medium'],
      speed: { walk: 25, fly: 30 },
      hasFlight: true,
      flightRestriction: 'no medium or heavy armor',
      darkvision: 0,
      resistances: [],
      conditionImmunities: [],
      naturalArmorAC: null,
      traitList: [
        { name: 'Flight', description: 'You have a flying speed of 30 feet. You can\'t use your flying speed while you wear medium or heavy armor.' },
        { name: 'Hawkeyed', description: 'Perception proficiency, no long range disadvantage.' },
      ],
    },
    levelChoices: [
      {
        level: 4, type: 'feat',
        feat: {
          name: 'Fey Touched',
          isHalfFeat: true,
          grantsAdvConSaves: false,
          grantsProfConSaves: false,
          grantsArmorProficiency: null,
          bonusSpells: ['Misty Step'],
        },
        halfFeatStat: 'CHA',
      },
    ],
    items: [
      { name: 'Instrument of the Bards (Cli Lyre)', acBonus: 0, saveBonus: 0, spellDcBonus: 0, spellAttackBonus: 0, requiresNoArmor: false, imposesCharmDisadvantage: true },
      { name: 'Cloak of Protection', acBonus: 1, saveBonus: 1, spellDcBonus: 0, spellAttackBonus: 0, requiresNoArmor: false, imposesCharmDisadvantage: false },
    ],
  };
}

function mockAvenArmored() {
  return {
    _id: 'build-aven-armored',
    name: 'Aven — Armored Tank',
    level: 8,
    baseStats: { str: 8, dex: 14, con: 14, int: 8, wis: 12, cha: 16 },
    speciesAsi: [
      { stat: 'CHA', bonus: 2 },
      { stat: 'CON', bonus: 1 },
    ],
    species: {
      name: 'Aven',
      creatureType: 'Humanoid',
      size: ['Medium'],
      speed: { walk: 25, fly: 30 },
      hasFlight: true,
      flightRestriction: 'no medium or heavy armor',
      darkvision: 0,
      resistances: [],
      conditionImmunities: [],
      naturalArmorAC: null,
      traitList: [
        { name: 'Flight', description: 'You have a flying speed of 30 feet. You can\'t use your flying speed while you wear medium or heavy armor.' },
        { name: 'Hawkeyed', description: 'Perception proficiency, no long range disadvantage.' },
      ],
    },
    levelChoices: [
      {
        level: 4, type: 'feat',
        feat: {
          name: 'Moderately Armored',
          isHalfFeat: false,
          grantsAdvConSaves: false,
          grantsProfConSaves: false,
          grantsArmorProficiency: 'medium+shield',
          bonusSpells: [],
        },
        halfFeatStat: null,
      },
      {
        level: 8, type: 'feat',
        feat: {
          name: 'War Caster',
          isHalfFeat: false,
          grantsAdvConSaves: true,
          grantsProfConSaves: false,
          grantsArmorProficiency: null,
          bonusSpells: [],
        },
        halfFeatStat: null,
      },
    ],
    items: [
      { name: 'Cloak of Protection', acBonus: 1, saveBonus: 1, spellDcBonus: 0, spellAttackBonus: 0, requiresNoArmor: false, imposesCharmDisadvantage: false },
      { name: 'Stone of Good Luck (Luckstone)', acBonus: 0, saveBonus: 1, spellDcBonus: 0, spellAttackBonus: 0, requiresNoArmor: false, imposesCharmDisadvantage: false },
    ],
  };
}


// ═══════════════════════════════════════════════════════════════════════════
// BASIC CONVERSION TESTS
// ═══════════════════════════════════════════════════════════════════════════

describe('buildToCreature — identity fields', () => {
  it('sets id, name, side, class, level, race', () => {
    const build = mockGemDragonbornIronConc();
    const creature = buildToCreature(build);
    assert.equal(creature.id, 'build-gem-iron');
    assert.equal(creature.name, 'Gem Dragonborn — Iron Concentration');
    assert.equal(creature.side, 'party');
    assert.equal(creature.class, 'Lore Bard');
    assert.equal(creature.level, 8);
    assert.equal(creature.race, 'Gem Dragonborn');
  });

  it('allows overriding id and name', () => {
    const build = mockGemDragonbornIronConc();
    const creature = buildToCreature(build, { id: 'custom-id', name: 'Custom Name' });
    assert.equal(creature.id, 'custom-id');
    assert.equal(creature.name, 'Custom Name');
  });
});


// ═══════════════════════════════════════════════════════════════════════════
// ABILITY SCORES
// ═══════════════════════════════════════════════════════════════════════════

describe('buildToCreature — ability scores', () => {
  it('computes final ability scores including ASIs and half-feat bonuses', () => {
    const build = mockGemDragonbornIronConc();
    const creature = buildToCreature(build);
    // base: str:8 dex:14 con:14 int:8 wis:12 cha:16
    // species ASI: CHA+2=18, CON+1=15
    // Resilient(CON) half-feat +1 CON: 15→16
    assert.equal(creature.cha, 18);
    assert.equal(creature.con, 16);
    assert.equal(creature.dex, 14);
    assert.equal(creature.str, 8);
    assert.equal(creature.wis, 12);
    assert.equal(creature.int, 8);
  });

  it('computes correct modifiers', () => {
    const build = mockGemDragonbornIronConc();
    const creature = buildToCreature(build);
    assert.equal(creature.chaMod, 4);   // 18 → +4
    assert.equal(creature.conMod, 3);   // 16 → +3
    assert.equal(creature.dexMod, 2);   // 14 → +2
    assert.equal(creature.strMod, -1);  // 8  → -1
    assert.equal(creature.wisMod, 1);   // 12 → +1
    assert.equal(creature.intMod, -1);  // 8  → -1
  });

  it('caps scores at 20', () => {
    const build = mockAarakocraMusician();
    const creature = buildToCreature(build);
    // base CHA 16 + ASI CHA+2 = 18, Fey Touched +1 CHA = 19
    assert.ok(creature.cha <= 20);
    assert.equal(creature.cha, 19);
    assert.equal(creature.chaMod, 4);  // 19 → +4
  });
});


// ═══════════════════════════════════════════════════════════════════════════
// HIT POINTS
// ═══════════════════════════════════════════════════════════════════════════

describe('buildToCreature — hit points', () => {
  it('computes Lore Bard 8 HP: 8 + CON_mod + 7*(5 + CON_mod)', () => {
    const build = mockGemDragonbornIronConc();
    const creature = buildToCreature(build);
    // CON 16 → mod +3
    // HP = 8 + 3 + 7*(5+3) = 11 + 56 = 67
    assert.equal(creature.maxHP, 67);
    assert.equal(creature.currentHP, 67);
  });

  it('adjusts HP for different CON modifiers', () => {
    const build = mockAarakocraMusician();
    const creature = buildToCreature(build);
    // CON 15 → mod +2 (base 14, species ASI +1)
    // HP = 8 + 2 + 7*(5+2) = 10 + 49 = 59
    assert.equal(creature.maxHP, 59);
  });
});


// ═══════════════════════════════════════════════════════════════════════════
// ARMOR CLASS
// ═══════════════════════════════════════════════════════════════════════════

describe('buildToCreature — armor class', () => {
  it('Gem Dragonborn w/ Bracers + Cloak = 10 + DEX + 2 + 1 = 15', () => {
    // No armor prof, no natural armor → 10 + DEX(2) + Bracers(2) + Cloak(1) = 15
    const build = mockGemDragonbornIronConc();
    const creature = buildToCreature(build);
    assert.equal(creature.ac, 15);
  });

  it('Tortle Moderately Armored = half-plate(15) + DEX(max 2) + shield(2) + Cloak(1) = 20', () => {
    const build = mockTortleArmored();
    const creature = buildToCreature(build);
    // Moderately Armored feat → medium armor + shield: 15 + min(2,2) + 2 + Cloak(1) = 20
    assert.equal(creature.ac, 20);
  });

  it('Aarakocra w/ Cloak = leather(11) + DEX(2) + Cloak(1) = 14', () => {
    const build = mockAarakocraMusician();
    const creature = buildToCreature(build);
    assert.equal(creature.ac, 14);
  });
});


// ═══════════════════════════════════════════════════════════════════════════
// SAVES
// ═══════════════════════════════════════════════════════════════════════════

describe('buildToCreature — saving throws', () => {
  it('Iron Conc has proficient DEX, CHA, and CON saves + item bonus', () => {
    const build = mockGemDragonbornIronConc();
    const creature = buildToCreature(build);
    const prof = 3;
    // DEX: mod(2) + prof(3) + Cloak(1) = 6
    assert.equal(creature.saves.dex, 6);
    // CHA: mod(4) + prof(3) + Cloak(1) = 8
    assert.equal(creature.saves.cha, 8);
    // CON: mod(3) + prof(3) [Resilient] + Cloak(1) = 7
    assert.equal(creature.saves.con, 7);
    // WIS: mod(1) + Cloak(1) = 2
    assert.equal(creature.saves.wis, 2);
  });

  it('non-proficient saves only get modifier + item bonuses', () => {
    const build = mockAarakocraMusician();
    const creature = buildToCreature(build);
    // STR: mod(-1) + Cloak(1) = 0
    assert.equal(creature.saves.str, 0);
    // INT: mod(-1) + Cloak(1) = 0
    assert.equal(creature.saves.int, 0);
    // CON: mod(2) + Cloak(1) = 3  (no Resilient CON)
    assert.equal(creature.saves.con, 3);
  });
});


// ═══════════════════════════════════════════════════════════════════════════
// SPELL DC & SPELL ATTACK
// ═══════════════════════════════════════════════════════════════════════════

describe('buildToCreature — spellcasting', () => {
  it('sets spell save DC from computeBuildStats', () => {
    const build = mockGemDragonbornIronConc();
    const creature = buildToCreature(build);
    // DC = 8 + prof(3) + CHA(4) = 15
    assert.equal(creature.spellSaveDC, 15);
  });

  it('sets spell attack bonus = prof + CHA mod + item bonuses', () => {
    const build = mockGemDragonbornIronConc();
    const creature = buildToCreature(build);
    assert.equal(creature.spellAttackBonus, 7); // 3 + 4
  });

  it('provides Lore Bard 8 spell slots: {1:4, 2:3, 3:3, 4:2}', () => {
    const build = mockGemDragonbornIronConc();
    const creature = buildToCreature(build);
    assert.deepEqual(creature.spellSlots, { 1: 4, 2: 3, 3: 3, 4: 2 });
    assert.deepEqual(creature.maxSlots, { 1: 4, 2: 3, 3: 3, 4: 2 });
  });

  it('includes base Lore Bard spells', () => {
    const build = mockGemDragonbornIronConc();
    const creature = buildToCreature(build);
    const expected = [
      'Hypnotic Pattern', 'Hold Person', 'Counterspell',
      'Healing Word', 'Faerie Fire', 'Dissonant Whispers',
      'Shatter', 'Invisibility', 'Silence',
      'Greater Invisibility', 'Dimension Door',
    ];
    for (const spell of expected) {
      assert.ok(creature.spellsKnown.includes(spell), `Missing spell: ${spell}`);
    }
  });

  it('adds feat bonus spells (Fey Touched → Misty Step)', () => {
    const build = mockAarakocraMusician();
    const creature = buildToCreature(build);
    assert.ok(creature.spellsKnown.includes('Misty Step'));
  });

  it('does not duplicate spells already in base list', () => {
    const build = mockAarakocraMusician();
    const creature = buildToCreature(build);
    const count = creature.spellsKnown.filter(s => s === 'Counterspell').length;
    assert.equal(count, 1);
  });

  it('includes Vicious Mockery and Minor Illusion as cantrips', () => {
    const build = mockGemDragonbornIronConc();
    const creature = buildToCreature(build);
    assert.ok(creature.cantrips.includes('Vicious Mockery'));
    assert.ok(creature.cantrips.includes('Minor Illusion'));
  });
});


// ═══════════════════════════════════════════════════════════════════════════
// FEATURES
// ═══════════════════════════════════════════════════════════════════════════

describe('buildToCreature — features', () => {
  it('detects War Caster', () => {
    const build = mockGemDragonbornIronConc();
    const creature = buildToCreature(build);
    assert.equal(creature.hasWarCaster, true);
  });

  it('detects Resilient CON', () => {
    const build = mockGemDragonbornIronConc();
    const creature = buildToCreature(build);
    assert.equal(creature.hasResilientCon, true);
  });

  it('detects Magic Resistance from species', () => {
    const build = mockDeepGnomeMagicRes();
    const creature = buildToCreature(build);
    assert.equal(creature.magicResistance, true);
  });

  it('no magic resistance when species lacks it', () => {
    const build = mockAarakocraMusician();
    const creature = buildToCreature(build);
    assert.equal(creature.magicResistance, false);
  });

  it('detects Instrument of the Bards charm disadvantage', () => {
    const build = mockAarakocraMusician();
    const creature = buildToCreature(build);
    assert.equal(creature.instrumentCharmDisadvantage, true);
  });

  it('no charm disadvantage without instrument', () => {
    const build = mockGemDragonbornIronConc();
    const creature = buildToCreature(build);
    assert.equal(creature.instrumentCharmDisadvantage, false);
  });
});


// ═══════════════════════════════════════════════════════════════════════════
// SPECIES RESOURCES
// ═══════════════════════════════════════════════════════════════════════════

describe('buildToCreature — species resources', () => {
  it('Gem Dragonborn has breath weapon', () => {
    const build = mockGemDragonbornIronConc();
    const creature = buildToCreature(build);
    assert.ok(creature.breathWeapon);
    assert.equal(creature.breathWeapon.uses, 3);  // PB at level 8
    assert.equal(creature.breathWeapon.max, 3);
    assert.equal(creature.breathWeapon.damageType, 'force');
    assert.ok(creature.breathWeapon.dc > 0);
  });

  it('Gem Dragonborn has gem flight resource', () => {
    const build = mockGemDragonbornIronConc();
    const creature = buildToCreature(build);
    assert.ok(creature.gemFlight);
    assert.equal(creature.gemFlight.uses, 3);   // PB
    assert.equal(creature.gemFlight.max, 3);
    assert.equal(creature.gemFlight.active, false);
  });

  it('Aarakocra has permanent flight (no gemFlight resource needed)', () => {
    const build = mockAarakocraMusician();
    const creature = buildToCreature(build);
    // Aarakocra has fly speed, not gem flight
    assert.equal(creature.gemFlight, undefined);
    assert.equal(creature.speed, 30);
    assert.equal(creature.flySpeed, 30);
  });

  it('non-dragonborn has no breath weapon', () => {
    const build = mockAarakocraMusician();
    const creature = buildToCreature(build);
    assert.equal(creature.breathWeapon, undefined);
  });

  it('all builds have bardic inspiration', () => {
    const build = mockGemDragonbornIronConc();
    const creature = buildToCreature(build);
    assert.ok(creature.bardicInspiration);
    assert.equal(creature.bardicInspiration.die, 'd8');
    assert.equal(creature.bardicInspiration.uses, 4);   // CHA mod
    assert.equal(creature.bardicInspiration.max, 4);
    assert.equal(creature.bardicInspiration.cuttingWords, true);
  });

  it('Winged Boots build has item flight', () => {
    const build = mockWingedBootsBuild();
    const creature = buildToCreature(build);
    assert.equal(creature.hasWingedBoots, true);
  });

  it('Aven without armor flies normally', () => {
    const build = mockAvenMusician();
    const creature = buildToCreature(build);
    assert.equal(creature.flying, true);
    assert.ok(creature.tags.includes('flying'));
    assert.equal(creature.flySpeed, 30);
  });

  it('Aven in medium armor (Moderately Armored) cannot fly', () => {
    const build = mockAvenArmored();
    const creature = buildToCreature(build);
    assert.equal(creature.flying, false);
    assert.ok(!creature.tags.includes('flying'));
  });

  it('Aarakocra without armor restriction flies even with flightRestriction field', () => {
    // Aarakocra historically has "no medium or heavy armor" restriction
    // but this test verifies it only blocks when the build actually wears medium armor
    const build = mockAarakocraMusician();
    build.species.flightRestriction = 'no medium or heavy armor';
    const creature = buildToCreature(build);
    assert.equal(creature.flying, true);
    assert.ok(creature.tags.includes('flying'));
  });
});


// ═══════════════════════════════════════════════════════════════════════════
// WEAPONS
// ═══════════════════════════════════════════════════════════════════════════

describe('buildToCreature — weapons', () => {
  it('has light crossbow with correct bonuses', () => {
    const build = mockGemDragonbornIronConc();
    const creature = buildToCreature(build);
    assert.ok(creature.weapons.length >= 1);
    const xbow = creature.weapons.find(w => w.name === 'Light Crossbow');
    assert.ok(xbow);
    assert.equal(xbow.type, 'ranged');
    assert.equal(xbow.attackBonus, 5); // DEX(2) + prof(3)
    assert.equal(xbow.damageDice, '1d8');
    assert.equal(xbow.damageBonus, 2); // DEX mod
  });
});


// ═══════════════════════════════════════════════════════════════════════════
// RUNTIME STATE (initial values)
// ═══════════════════════════════════════════════════════════════════════════

describe('buildToCreature — initial runtime state', () => {
  it('starts with full HP, no conditions, no concentration', () => {
    const build = mockGemDragonbornIronConc();
    const creature = buildToCreature(build);
    assert.equal(creature.currentHP, creature.maxHP);
    assert.equal(creature.tempHP, 0);
    assert.deepEqual(creature.conditions, []);
    assert.equal(creature.concentrating, null);
    assert.equal(creature.flying, false);
  });

  it('includes analytics counters at zero', () => {
    const build = mockGemDragonbornIronConc();
    const creature = buildToCreature(build);
    assert.equal(creature.totalDamageDealt, 0);
    assert.equal(creature.totalDamageTaken, 0);
    assert.equal(creature.spellsCast, 0);
  });

  it('includes lore_bard tag', () => {
    const build = mockGemDragonbornIronConc();
    const creature = buildToCreature(build);
    assert.ok(creature.tags.includes('lore_bard'));
    assert.ok(creature.tags.includes('caster'));
  });

  it('allows position override', () => {
    const build = mockGemDragonbornIronConc();
    const creature = buildToCreature(build, { position: { x: 10, y: 5 } });
    assert.deepEqual(creature.position, { x: 10, y: 5 });
  });
});


// ═══════════════════════════════════════════════════════════════════════════
// SPEED
// ═══════════════════════════════════════════════════════════════════════════

describe('buildToCreature — speed', () => {
  it('uses species walk speed', () => {
    const build = mockDeepGnomeMagicRes();
    const creature = buildToCreature(build);
    assert.equal(creature.speed, 25); // Deep Gnome walk 25
  });

  it('defaults to 30 when species has no speed', () => {
    const build = mockGemDragonbornIronConc();
    const creature = buildToCreature(build);
    assert.equal(creature.speed, 30);
  });
});


// ═══════════════════════════════════════════════════════════════════════════
// EDGE CASES
// ═══════════════════════════════════════════════════════════════════════════

describe('buildToCreature — edge cases', () => {
  it('handles build with no feats (ASI-only path)', () => {
    const build = mockGemDragonbornIronConc();
    build.levelChoices = [
      { level: 4, type: 'asi', asiIncreases: [{ stat: 'CHA', bonus: 2 }] },
      { level: 8, type: 'asi', asiIncreases: [{ stat: 'CON', bonus: 2 }] },
    ];
    const creature = buildToCreature(build);
    assert.equal(creature.hasWarCaster, false);
    assert.equal(creature.hasResilientCon, false);
    // CHA: 16 + 2(species) + 2(ASI) = 20, CON: 14 + 1(species) + 2(ASI) = 17
    assert.equal(creature.cha, 20);
    assert.equal(creature.con, 17);
  });

  it('handles build with no items', () => {
    const build = mockGemDragonbornIronConc();
    build.items = [];
    const creature = buildToCreature(build);
    assert.ok(creature.maxHP > 0);
    // AC = leather(11) + DEX(2) = 13 (bard has light armor proficiency)
    assert.equal(creature.ac, 13);
  });

  it('handles missing species gracefully', () => {
    const build = mockGemDragonbornIronConc();
    build.species = null;
    const creature = buildToCreature(build);
    assert.ok(creature.maxHP > 0);
    assert.equal(creature.race, 'Unknown');
    assert.equal(creature.speed, 30);
  });

  it('passes species damage resistances to creature', () => {
    const build = mockGemDragonbornIronConc();
    build.species.resistances = ['necrotic', 'radiant'];
    const creature = buildToCreature(build);
    assert.deepEqual(creature.damageResistances, ['necrotic', 'radiant']);
  });

  it('sets empty damageResistances when species has none', () => {
    const build = mockGemDragonbornIronConc();
    build.species.resistances = [];
    const creature = buildToCreature(build);
    assert.deepEqual(creature.damageResistances, []);
  });

  it('sets damageResistances to empty array when resistances undefined', () => {
    const build = mockGemDragonbornIronConc();
    delete build.species.resistances;
    const creature = buildToCreature(build);
    assert.deepEqual(creature.damageResistances, []);
  });
});
