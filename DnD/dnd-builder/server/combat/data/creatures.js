/**
 * Creature stat blocks
 *
 * Based on D&D 5e System Reference Document (SRD) data.
 * Each entry follows the schema documented in docs/data-dictionary.md.
 *
 * Usage:
 *   const { getCreature, CREATURES } = require('./creatures')
 *   const goblin = getCreature('goblin')
 */

'use strict'

const CREATURES = {
  // ── CR 1/4 ─────────────────────────────────────────────────────────────────
  goblin: {
    id: 'goblin',
    name: 'Goblin',
    type: 'humanoid',
    subtype: 'goblinoid',
    size: 'small',
    alignment: 'neutral evil',
    challengeRating: 0.25,
    experiencePoints: 50,
    armorClass: 15,
    armorType: 'leather armor, shield',
    hitDice: '2d6',
    hitPointsAverage: 7,
    speed: { walk: 30 },
    abilityScores: { strength: 8, dexterity: 14, constitution: 10, intelligence: 10, wisdom: 8, charisma: 8 },
    savingThrows: {},
    skills: { stealth: 6 },
    damageImmunities: [],
    damageResistances: [],
    conditionImmunities: [],
    senses: { darkvision: 60, passivePerception: 9 },
    languages: ['Common', 'Goblin'],
    traits: [
      { name: 'Nimble Escape', description: 'The goblin can take the Disengage or Hide action as a bonus action on each of its turns.' },
    ],
    actions: [
      {
        name: 'Scimitar',
        type: 'meleeWeaponAttack',
        attackBonus: 4,
        reach: 5,
        target: 'one target',
        damage: [{ dice: '1d6', modifier: 2, type: 'slashing' }],
      },
      {
        name: 'Shortbow',
        type: 'rangedWeaponAttack',
        attackBonus: 4,
        range: { normal: 80, long: 320 },
        target: 'one target',
        damage: [{ dice: '1d6', modifier: 2, type: 'piercing' }],
      },
    ],
    lootTable: [
      { itemId: 'scimitar',   chance: 0.4, quantity: 1 },
      { currency: 'gold',     chance: 1.0, amount: '1d4' },
    ],
  },

  goblin_boss: {
    id: 'goblin_boss',
    name: 'Goblin Boss',
    type: 'humanoid',
    subtype: 'goblinoid',
    size: 'small',
    alignment: 'neutral evil',
    challengeRating: 1,
    experiencePoints: 200,
    armorClass: 17,
    armorType: 'chain shirt, shield',
    hitDice: '6d6',
    hitPointsAverage: 21,
    speed: { walk: 30 },
    abilityScores: { strength: 10, dexterity: 14, constitution: 10, intelligence: 10, wisdom: 8, charisma: 10 },
    savingThrows: {},
    skills: { stealth: 6 },
    damageImmunities: [],
    damageResistances: [],
    conditionImmunities: [],
    senses: { darkvision: 60, passivePerception: 9 },
    languages: ['Common', 'Goblin'],
    traits: [
      { name: 'Nimble Escape', description: 'The goblin can take the Disengage or Hide action as a bonus action on each of its turns.' },
    ],
    actions: [
      {
        name: 'Multiattack',
        type: 'multiattack',
        description: 'The goblin boss makes two attacks with its scimitar. The second attack has disadvantage.',
        count: 2,
      },
      {
        name: 'Scimitar',
        type: 'meleeWeaponAttack',
        attackBonus: 4,
        reach: 5,
        target: 'one target',
        damage: [{ dice: '1d6', modifier: 2, type: 'slashing' }],
      },
      {
        name: 'Javelin',
        type: 'rangedWeaponAttack',
        attackBonus: 2,
        range: { normal: 30, long: 120 },
        target: 'one target',
        damage: [{ dice: '1d6', modifier: 0, type: 'piercing' }],
      },
    ],
    reactions: [
      { name: 'Redirect Attack', description: 'When a creature the goblin boss can see targets it with an attack, the boss can choose another goblin within 5 feet. The new goblin becomes the target instead.' },
    ],
    lootTable: [
      { itemId: 'scimitar',   chance: 0.8, quantity: 1 },
      { currency: 'gold',     chance: 1.0, amount: '2d6' },
      { itemId: 'potion_healing', chance: 0.3, quantity: 1 },
    ],
  },

  // ── CR 1/8 ─────────────────────────────────────────────────────────────────
  bandit: {
    id: 'bandit',
    name: 'Bandit',
    type: 'humanoid',
    subtype: 'any race',
    size: 'medium',
    alignment: 'any non-lawful',
    challengeRating: 0.125,
    experiencePoints: 25,
    armorClass: 12,
    armorType: 'leather armor',
    hitDice: '2d8',
    hitPointsAverage: 11,
    speed: { walk: 30 },
    abilityScores: { strength: 11, dexterity: 12, constitution: 12, intelligence: 10, wisdom: 10, charisma: 10 },
    savingThrows: {},
    skills: {},
    damageImmunities: [],
    damageResistances: [],
    conditionImmunities: [],
    senses: { passivePerception: 10 },
    languages: ['Common'],
    traits: [],
    actions: [
      {
        name: 'Scimitar',
        type: 'meleeWeaponAttack',
        attackBonus: 3,
        reach: 5,
        target: 'one target',
        damage: [{ dice: '1d6', modifier: 1, type: 'slashing' }],
      },
      {
        name: 'Hand Crossbow',
        type: 'rangedWeaponAttack',
        attackBonus: 3,
        range: { normal: 30, long: 120 },
        target: 'one target',
        damage: [{ dice: '1d6', modifier: 1, type: 'piercing' }],
      },
    ],
    lootTable: [
      { currency: 'gold', chance: 1.0, amount: '1d6' },
    ],
  },

  // ── CR 1/2 ─────────────────────────────────────────────────────────────────
  orc: {
    id: 'orc',
    name: 'Orc',
    type: 'humanoid',
    subtype: 'orc',
    size: 'medium',
    alignment: 'chaotic evil',
    challengeRating: 0.5,
    experiencePoints: 100,
    armorClass: 13,
    armorType: 'hide armor',
    hitDice: '5d8',
    hitPointsAverage: 15,
    speed: { walk: 30 },
    abilityScores: { strength: 16, dexterity: 12, constitution: 16, intelligence: 7, wisdom: 11, charisma: 10 },
    savingThrows: {},
    skills: { intimidation: 2 },
    damageImmunities: [],
    damageResistances: [],
    conditionImmunities: [],
    senses: { darkvision: 60, passivePerception: 10 },
    languages: ['Common', 'Orc'],
    traits: [
      { name: 'Aggressive', description: 'As a bonus action, the orc can move up to its speed toward a hostile creature it can see.' },
    ],
    actions: [
      {
        name: 'Greataxe',
        type: 'meleeWeaponAttack',
        attackBonus: 5,
        reach: 5,
        target: 'one target',
        damage: [{ dice: '1d12', modifier: 3, type: 'slashing' }],
      },
      {
        name: 'Javelin',
        type: 'rangedWeaponAttack',
        attackBonus: 5,
        range: { normal: 30, long: 120 },
        target: 'one target',
        damage: [{ dice: '1d6', modifier: 3, type: 'piercing' }],
      },
    ],
    lootTable: [
      { itemId: 'greataxe',  chance: 0.5, quantity: 1 },
      { currency: 'gold',    chance: 0.8, amount: '2d4' },
    ],
  },

  // ── CR 1 ───────────────────────────────────────────────────────────────────
  bugbear: {
    id: 'bugbear',
    name: 'Bugbear',
    type: 'humanoid',
    subtype: 'goblinoid',
    size: 'medium',
    alignment: 'chaotic evil',
    challengeRating: 1,
    experiencePoints: 200,
    armorClass: 16,
    armorType: 'hide armor, shield',
    hitDice: '5d8',
    hitPointsAverage: 27,
    speed: { walk: 30 },
    abilityScores: { strength: 15, dexterity: 14, constitution: 13, intelligence: 8, wisdom: 11, charisma: 9 },
    savingThrows: {},
    skills: { stealth: 6, survival: 2 },
    damageImmunities: [],
    damageResistances: [],
    conditionImmunities: [],
    senses: { darkvision: 60, passivePerception: 10 },
    languages: ['Common', 'Goblin'],
    traits: [
      { name: 'Brute', description: 'A melee weapon deals one extra die of its damage when the bugbear hits with it (included in the attack).' },
      { name: 'Surprise Attack', description: 'If the bugbear surprises a creature and hits it during the first round of combat, the target takes an extra 2d6 damage.' },
    ],
    actions: [
      {
        name: 'Morningstar',
        type: 'meleeWeaponAttack',
        attackBonus: 4,
        reach: 5,
        target: 'one target',
        damage: [{ dice: '2d8', modifier: 2, type: 'piercing' }], // Brute included
      },
      {
        name: 'Javelin',
        type: 'rangedWeaponAttack',
        attackBonus: 4,
        range: { normal: 30, long: 120 },
        target: 'one target',
        damage: [{ dice: '2d6', modifier: 2, type: 'piercing' }],
      },
    ],
    lootTable: [
      { currency: 'gold', chance: 0.9, amount: '3d6' },
      { itemId: 'morningstar', chance: 0.6, quantity: 1 },
    ],
  },

  // ── CR 2 ───────────────────────────────────────────────────────────────────
  ogre: {
    id: 'ogre',
    name: 'Ogre',
    type: 'giant',
    subtype: null,
    size: 'large',
    alignment: 'chaotic evil',
    challengeRating: 2,
    experiencePoints: 450,
    armorClass: 11,
    armorType: 'hide armor',
    hitDice: '7d10',
    hitPointsAverage: 59,
    speed: { walk: 40 },
    abilityScores: { strength: 19, dexterity: 8, constitution: 16, intelligence: 5, wisdom: 7, charisma: 7 },
    savingThrows: {},
    skills: {},
    damageImmunities: [],
    damageResistances: [],
    conditionImmunities: [],
    senses: { darkvision: 60, passivePerception: 8 },
    languages: ['Common', 'Giant'],
    traits: [],
    actions: [
      {
        name: 'Greatclub',
        type: 'meleeWeaponAttack',
        attackBonus: 6,
        reach: 5,
        target: 'one target',
        damage: [{ dice: '2d8', modifier: 4, type: 'bludgeoning' }],
      },
      {
        name: 'Javelin',
        type: 'rangedWeaponAttack',
        attackBonus: 6,
        range: { normal: 30, long: 120 },
        target: 'one target',
        damage: [{ dice: '2d6', modifier: 4, type: 'piercing' }],
      },
    ],
    lootTable: [
      { currency: 'gold', chance: 0.7, amount: '4d6' },
    ],
  },
}

// ── Lookup helpers ────────────────────────────────────────────────────────────

/** Get a creature stat block by ID. Returns null if not found. */
function getCreature(id) {
  return CREATURES[id] ?? null
}

/** List all available creature IDs. */
function listCreatures() {
  return Object.keys(CREATURES)
}

/** Get creatures by challenge rating range [min, max]. */
function getCreaturesByCR(min = 0, max = 30) {
  return Object.values(CREATURES).filter(c => c.challengeRating >= min && c.challengeRating <= max)
}

module.exports = { CREATURES, getCreature, listCreatures, getCreaturesByCR }
