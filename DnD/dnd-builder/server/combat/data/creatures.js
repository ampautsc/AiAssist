/**
 * Creature Factory — data-driven creature/build/monster creation
 * 
 * Stat blocks are defined as data templates. The factory function
 * produces combat-ready objects with all required fields initialized.
 * 
 * Players are defined as "builds" — class/race/level/equipment combos.
 * Monsters are defined as "stat blocks" from the Monster Manual.
 */

// ═══════════════════════════════════════════════════════════════════════════
// STAT BLOCK TEMPLATES
// ═══════════════════════════════════════════════════════════════════════════

const CREATURE_TEMPLATES = {

  // ─────────────────────────────────────────
  // PLAYER BUILDS
  // ─────────────────────────────────────────

  'gem_dragonborn_lore_bard_8': {
    id: 'bard',
    name: 'Gem Dragonborn Lore Bard (Iron Concentration)',
    side: 'party',
    class: 'Lore Bard',
    level: 8,
    race: 'Gem Dragonborn',
    
    abilities: { str: 8, dex: 14, con: 16, int: 8, wis: 12, cha: 18 },
    profBonus: 3,
    
    hp: { max: 67, formula: '8 + 3 + 7*(5+3)' },  // L1: d8+CON, L2-8: avg 5+CON
    ac: { base: 14, formula: 'leather(11)+DEX(2)+Cloak(1)' },
    speed: 30,
    
    saves: { str: -1, dex: 5, con: 8, int: -1, wis: 1, cha: 9 },
    
    features: {
      hasWarCaster: true,
      hasResilientCon: true,
      darkDevotion: false,
      magicResistance: false,
    },
    
    spellcasting: {
      ability: 'cha',
      saveDC: 15,        // 8 + 3 + 4
      attackBonus: 7,    // 3 + 4
      slots: { 1: 4, 2: 3, 3: 3, 4: 2 },
      cantrips: ['Vicious Mockery', 'Minor Illusion'],
      known: [
        'Hypnotic Pattern', 'Hold Person', 'Counterspell',
        'Healing Word', 'Faerie Fire', 'Dissonant Whispers',
        'Shatter', 'Invisibility', 'Silence',
        'Greater Invisibility', 'Dimension Door',
      ],
    },
    
    resources: {
      bardicInspiration: { die: 'd8', uses: 4, max: 4, cuttingWords: true },
      breathWeapon: {
        uses: 3, max: 3,
        damage: '2d8', damageType: 'force',
        save: 'dex', dc: 14,     // 8 + prof(3) + CON(3)
        shape: '15ft cone',
      },
      gemFlight: { uses: 3, max: 3, duration: 10, active: false, roundsRemaining: 0 },
      // Dragon Fear feat: replaces breath weapon exhalation with a frightening roar
      // WIS save DC = 8 + profBonus + CHA mod = 8 + 3 + 4 = 15
      dragonFear: { uses: 1, max: 1, dc: 15, save: 'wis', range: 30, shape: '30ft cone' },
    },
    
    weapons: [
      { name: 'Light Crossbow', attackBonus: 5, damageDice: '1d8', damageBonus: 2, range: 80, longRange: 320, type: 'ranged' },
    ],
    
    tags: ['caster', 'controller', 'bard', 'lore_bard'],
  },

  // ─────────────────────────────────────────
  // MONSTERS
  // ─────────────────────────────────────────

  'cult_fanatic': {
    id: 'cult_fanatic',
    name: 'Cult Fanatic',
    side: 'enemy',
    type: 'humanoid',
    cr: 2,
    
    abilities: { str: 11, dex: 14, con: 12, int: 10, wis: 13, cha: 14 },
    profBonus: 2,
    
    hp: { max: 33, formula: '6d8+6' },
    ac: { base: 13, formula: 'leather armor' },
    speed: 30,
    
    saves: { str: 0, dex: 2, con: 1, int: 0, wis: 1, cha: 2 },
    
    features: {
      hasWarCaster: false,
      hasResilientCon: false,
      darkDevotion: true,        // advantage on saves vs charmed/frightened
      magicResistance: false,
    },
    
    spellcasting: {
      ability: 'wis',
      saveDC: 11,
      attackBonus: 3,
      slots: { 1: 4, 2: 3 },
      cantrips: ['Sacred Flame', 'Light', 'Thaumaturgy'],
      known: ['Command', 'Inflict Wounds', 'Shield of Faith', 'Hold Person', 'Spiritual Weapon'],
    },
    
    multiattack: 2,
    weapons: [
      { name: 'Dagger', attackBonus: 4, damageDice: '1d4', damageBonus: 2, damageType: 'piercing', range: 5, type: 'melee' },
    ],
    
    tags: ['caster', 'melee', 'humanoid'],
  },

  // ─────────────────────────────────────────
  // UNDEAD
  // ─────────────────────────────────────────

  'zombie': {
    id: 'zombie',
    name: 'Zombie',
    side: 'enemy',
    type: 'undead',
    cr: 0.25,
    
    abilities: { str: 13, dex: 6, con: 16, int: 3, wis: 6, cha: 5 },
    profBonus: 2,
    
    hp: { max: 22, formula: '3d8+9' },
    ac: { base: 8, formula: 'natural' },
    speed: 20,
    
    saves: { str: 1, dex: -2, con: 3, int: -4, wis: -2, cha: -3 },
    
    features: {
      hasWarCaster: false,
      hasResilientCon: false,
      darkDevotion: false,
      magicResistance: false,
      undeadFortitude: true,
    },
    
    multiattack: 0,
    weapons: [
      { name: 'Slam', attackBonus: 3, damageDice: '1d6', damageBonus: 1, damageType: 'bludgeoning', range: 5, type: 'melee' },
    ],
    
    immunities: { conditions: ['poisoned'], damage: ['poison'] },
    tags: ['melee', 'undead'],
  },

  'skeleton': {
    id: 'skeleton',
    name: 'Skeleton',
    side: 'enemy',
    type: 'undead',
    cr: 0.25,
    
    abilities: { str: 10, dex: 14, con: 15, int: 6, wis: 8, cha: 5 },
    profBonus: 2,
    
    hp: { max: 13, formula: '2d8+4' },
    ac: { base: 13, formula: 'armor scraps' },
    speed: 30,
    
    saves: { str: 0, dex: 2, con: 2, int: -2, wis: -1, cha: -3 },
    
    features: {
      hasWarCaster: false,
      hasResilientCon: false,
      darkDevotion: false,
      magicResistance: false,
    },
    
    multiattack: 0,
    weapons: [
      { name: 'Shortbow', attackBonus: 4, damageDice: '1d6', damageBonus: 2, damageType: 'piercing', range: 80, longRange: 320, type: 'ranged' },
      { name: 'Shortsword', attackBonus: 4, damageDice: '1d6', damageBonus: 2, damageType: 'piercing', range: 5, type: 'melee' },
    ],
    
    immunities: { conditions: ['poisoned', 'exhaustion'], damage: ['poison'] },
    vulnerabilities: { damage: ['bludgeoning'] },
    tags: ['ranged', 'melee', 'undead'],
  },

  'ghoul': {
    id: 'ghoul',
    name: 'Ghoul',
    side: 'enemy',
    type: 'undead',
    cr: 1,
    
    abilities: { str: 13, dex: 15, con: 10, int: 7, wis: 10, cha: 6 },
    profBonus: 2,
    
    hp: { max: 22, formula: '5d8' },
    ac: { base: 12, formula: 'natural' },
    speed: 30,
    
    saves: { str: 1, dex: 2, con: 0, int: -2, wis: 0, cha: -2 },
    
    features: {
      hasWarCaster: false,
      hasResilientCon: false,
      darkDevotion: false,
      magicResistance: false,
      immuneCharmed: true,
    },
    
    multiattack: 2,
    weapons: [
      { name: 'Claws', attackBonus: 4, damageDice: '2d4', damageBonus: 2, damageType: 'slashing', range: 5, type: 'melee',
        special: 'paralysis', paralyzeDC: 10, paralyzeAbility: 'con' },
      { name: 'Bite', attackBonus: 2, damageDice: '2d6', damageBonus: 2, damageType: 'piercing', range: 5, type: 'melee' },
    ],
    
    immunities: { conditions: ['charmed', 'poisoned', 'exhaustion'], damage: ['poison'] },
    tags: ['melee', 'undead'],
  },

  'ghast': {
    id: 'ghast',
    name: 'Ghast',
    side: 'enemy',
    type: 'undead',
    cr: 2,
    
    abilities: { str: 16, dex: 17, con: 10, int: 11, wis: 10, cha: 8 },
    profBonus: 2,
    
    hp: { max: 36, formula: '8d8' },
    ac: { base: 13, formula: 'natural' },
    speed: 30,
    
    saves: { str: 3, dex: 3, con: 0, int: 0, wis: 0, cha: -1 },
    
    features: {
      hasWarCaster: false,
      hasResilientCon: false,
      darkDevotion: false,
      magicResistance: false,
      immuneCharmed: true,
      stench: true,
    },
    
    multiattack: 2,
    weapons: [
      { name: 'Claws', attackBonus: 5, damageDice: '2d6', damageBonus: 3, damageType: 'slashing', range: 5, type: 'melee',
        special: 'paralysis', paralyzeDC: 10, paralyzeAbility: 'con' },
      { name: 'Bite', attackBonus: 3, damageDice: '2d8', damageBonus: 3, damageType: 'piercing', range: 5, type: 'melee' },
    ],
    
    immunities: { conditions: ['charmed', 'poisoned', 'exhaustion'], damage: ['poison'] },
    tags: ['melee', 'undead'],
  },

  // ─────────────────────────────────────────
  // LYCANTHROPES
  // ─────────────────────────────────────────

  'werewolf': {
    id: 'werewolf',
    name: 'Werewolf',
    side: 'enemy',
    type: 'humanoid (shapechanger)',
    cr: 3,
    
    abilities: { str: 15, dex: 13, con: 14, int: 10, wis: 11, cha: 10 },
    profBonus: 2,
    
    hp: { max: 58, formula: '9d8+18' },
    ac: { base: 11, formula: 'natural (hybrid)' },
    speed: 30,
    
    saves: { str: 2, dex: 1, con: 2, int: 0, wis: 0, cha: 0 },
    
    features: {
      hasWarCaster: false,
      hasResilientCon: false,
      darkDevotion: false,
      magicResistance: false,
      immuneNonmagicalBPS: true,
    },
    
    multiattack: 2,
    weapons: [
      { name: 'Bite', attackBonus: 4, damageDice: '1d8', damageBonus: 2, damageType: 'piercing', range: 5, type: 'melee' },
      { name: 'Claws', attackBonus: 4, damageDice: '2d4', damageBonus: 2, damageType: 'slashing', range: 5, type: 'melee' },
    ],
    
    immunities: { damage: ['bludgeoning_nonmagical', 'piercing_nonmagical', 'slashing_nonmagical'] },
    tags: ['melee', 'shapechanger'],
  },

  // ─────────────────────────────────────────
  // DRAGONS
  // ─────────────────────────────────────────

  'young_red_dragon': {
    id: 'young_red_dragon',
    name: 'Young Red Dragon',
    side: 'enemy',
    type: 'dragon',
    cr: 10,
    
    abilities: { str: 23, dex: 10, con: 21, int: 14, wis: 11, cha: 19 },
    profBonus: 4,
    
    hp: { max: 178, formula: '17d10+85' },
    ac: { base: 18, formula: 'natural armor' },
    speed: 40,
    flySpeed: 80,
    
    saves: { str: 6, dex: 4, con: 9, int: 2, wis: 4, cha: 8 },
    
    features: {
      hasWarCaster: false,
      hasResilientCon: false,
      darkDevotion: false,
      magicResistance: false,
      innateFlying: true,
    },
    
    resources: {
      breathWeapon: {
        uses: 1, max: 1,
        damage: '16d6', damageType: 'fire',
        save: 'dex', dc: 17,
        shape: '30ft cone',
        recharge: [5, 6],
      },
    },
    
    multiattack: 3,
    weapons: [
      { name: 'Bite', attackBonus: 10, damageDice: '2d10', damageBonus: 6, damageType: 'piercing', range: 10, type: 'melee' },
      { name: 'Claw', attackBonus: 10, damageDice: '2d6', damageBonus: 6, damageType: 'slashing', range: 5, type: 'melee' },
    ],
    
    immunities: { damage: ['fire'] },
    tags: ['melee', 'dragon', 'flying', 'breath_weapon'],
  },

  // ─────────────────────────────────────────
  // GIANTS
  // ─────────────────────────────────────────

  'hill_giant': {
    id: 'hill_giant',
    name: 'Hill Giant',
    side: 'enemy',
    type: 'giant',
    cr: 5,
    
    abilities: { str: 21, dex: 8, con: 19, int: 5, wis: 9, cha: 6 },
    profBonus: 3,
    
    hp: { max: 105, formula: '10d12+40' },
    ac: { base: 13, formula: 'natural armor' },
    speed: 40,
    
    saves: { str: 5, dex: -1, con: 4, int: -3, wis: -1, cha: -2 },
    
    features: {
      hasWarCaster: false,
      hasResilientCon: false,
      darkDevotion: false,
      magicResistance: false,
    },
    
    multiattack: 2,
    weapons: [
      { name: 'Greatclub', attackBonus: 8, damageDice: '3d8', damageBonus: 5, damageType: 'bludgeoning', range: 10, type: 'melee' },
      { name: 'Rock', attackBonus: 8, damageDice: '3d10', damageBonus: 5, damageType: 'bludgeoning', range: 60, longRange: 240, type: 'ranged' },
    ],
    
    tags: ['melee', 'ranged', 'giant'],
  },

  'frost_giant': {
    id: 'frost_giant',
    name: 'Frost Giant',
    side: 'enemy',
    type: 'giant',
    cr: 8,
    
    abilities: { str: 23, dex: 9, con: 21, int: 9, wis: 10, cha: 12 },
    profBonus: 3,
    
    hp: { max: 138, formula: '12d12+60' },
    ac: { base: 15, formula: 'patchwork armor' },
    speed: 40,
    
    saves: { str: 6, dex: -1, con: 8, int: -1, wis: 3, cha: 4 },
    
    features: {
      hasWarCaster: false,
      hasResilientCon: false,
      darkDevotion: false,
      magicResistance: false,
    },
    
    multiattack: 2,
    weapons: [
      { name: 'Greataxe', attackBonus: 9, damageDice: '3d12', damageBonus: 6, damageType: 'slashing', range: 10, type: 'melee' },
      { name: 'Rock', attackBonus: 9, damageDice: '4d10', damageBonus: 6, damageType: 'bludgeoning', range: 60, longRange: 240, type: 'ranged' },
    ],
    
    immunities: { damage: ['cold'] },
    tags: ['melee', 'ranged', 'giant'],
  },

  'ogre': {
    id: 'ogre',
    name: 'Ogre',
    side: 'enemy',
    type: 'giant',
    cr: 2,
    
    abilities: { str: 19, dex: 8, con: 16, int: 5, wis: 7, cha: 7 },
    profBonus: 2,
    
    hp: { max: 59, formula: '7d10+21' },
    ac: { base: 11, formula: 'hide armor' },
    speed: 40,
    
    saves: { str: 4, dex: -1, con: 3, int: -3, wis: -2, cha: -2 },
    
    features: {
      hasWarCaster: false,
      hasResilientCon: false,
      darkDevotion: false,
      magicResistance: false,
    },
    
    multiattack: 0,
    weapons: [
      { name: 'Greatclub', attackBonus: 6, damageDice: '2d8', damageBonus: 4, damageType: 'bludgeoning', range: 5, type: 'melee' },
      { name: 'Javelin', attackBonus: 6, damageDice: '2d6', damageBonus: 4, damageType: 'piercing', range: 30, longRange: 120, type: 'ranged' },
    ],
    
    tags: ['melee', 'ranged', 'giant'],
  },

  // ─────────────────────────────────────────
  // HUMANOIDS
  // ─────────────────────────────────────────

  'bandit': {
    id: 'bandit',
    name: 'Bandit',
    side: 'enemy',
    type: 'humanoid',
    cr: 0.125,
    
    abilities: { str: 11, dex: 12, con: 12, int: 10, wis: 10, cha: 10 },
    profBonus: 2,
    
    hp: { max: 11, formula: '2d8+2' },
    ac: { base: 12, formula: 'leather armor' },
    speed: 30,
    
    saves: { str: 0, dex: 1, con: 1, int: 0, wis: 0, cha: 0 },
    
    features: {
      hasWarCaster: false,
      hasResilientCon: false,
      darkDevotion: false,
      magicResistance: false,
    },
    
    multiattack: 0,
    weapons: [
      { name: 'Scimitar', attackBonus: 3, damageDice: '1d6', damageBonus: 1, damageType: 'slashing', range: 5, type: 'melee' },
      { name: 'Light Crossbow', attackBonus: 3, damageDice: '1d8', damageBonus: 1, damageType: 'piercing', range: 80, longRange: 320, type: 'ranged' },
    ],
    
    tags: ['melee', 'ranged', 'humanoid'],
  },

  'bandit_captain': {
    id: 'bandit_captain',
    name: 'Bandit Captain',
    side: 'enemy',
    type: 'humanoid',
    cr: 2,
    
    abilities: { str: 15, dex: 16, con: 14, int: 14, wis: 11, cha: 14 },
    profBonus: 2,
    
    hp: { max: 65, formula: '10d8+20' },
    ac: { base: 15, formula: 'studded leather' },
    speed: 30,
    
    saves: { str: 4, dex: 5, con: 2, int: 2, wis: 2, cha: 2 },
    
    features: {
      hasWarCaster: false,
      hasResilientCon: false,
      darkDevotion: false,
      magicResistance: false,
    },
    
    multiattack: 3,
    weapons: [
      { name: 'Scimitar', attackBonus: 5, damageDice: '1d6', damageBonus: 3, damageType: 'slashing', range: 5, type: 'melee' },
      { name: 'Dagger', attackBonus: 5, damageDice: '1d4', damageBonus: 3, damageType: 'piercing', range: 5, type: 'melee' },
    ],
    
    tags: ['melee', 'humanoid'],
  },

  // ─────────────────────────────────────────
  // CASTERS
  // ─────────────────────────────────────────

  'mage': {
    id: 'mage',
    name: 'Mage',
    side: 'enemy',
    type: 'humanoid',
    cr: 6,
    
    abilities: { str: 9, dex: 14, con: 11, int: 17, wis: 12, cha: 11 },
    profBonus: 3,
    
    hp: { max: 40, formula: '9d8' },
    ac: { base: 15, formula: '12 natural + Mage Armor (+3)' },
    speed: 30,
    
    saves: { str: -1, dex: 2, con: 0, int: 6, wis: 4, cha: 0 },
    
    features: {
      hasWarCaster: false,
      hasResilientCon: false,
      darkDevotion: false,
      magicResistance: false,
      mageArmor: true,
    },
    
    spellcasting: {
      ability: 'int',
      saveDC: 14,
      attackBonus: 6,
      slots: { 1: 4, 2: 3, 3: 3, 4: 3, 5: 1 },
      cantrips: ['Fire Bolt', 'Light', 'Mage Hand', 'Prestidigitation'],
      known: [
        'Magic Missile', 'Shield', 'Mage Armor',
        'Misty Step', 'Suggestion',
        'Counterspell', 'Fireball', 'Fly',
        'Greater Invisibility', 'Ice Storm',
        'Cone of Cold',
      ],
    },
    
    multiattack: 0,
    weapons: [
      { name: 'Dagger', attackBonus: 5, damageDice: '1d4', damageBonus: 2, damageType: 'piercing', range: 5, type: 'melee' },
    ],
    
    tags: ['caster', 'humanoid', 'counterspell'],
  },

  'archmage': {
    id: 'archmage',
    name: 'Archmage',
    side: 'enemy',
    type: 'humanoid',
    cr: 12,
    
    abilities: { str: 10, dex: 14, con: 12, int: 20, wis: 15, cha: 16 },
    profBonus: 4,
    
    hp: { max: 99, formula: '18d8+18' },
    ac: { base: 15, formula: '12 natural + Mage Armor (+3)' },
    speed: 30,
    
    saves: { str: 0, dex: 2, con: 1, int: 9, wis: 6, cha: 3 },
    
    features: {
      hasWarCaster: false,
      hasResilientCon: false,
      darkDevotion: false,
      magicResistance: true,
    },
    
    spellcasting: {
      ability: 'int',
      saveDC: 17,
      attackBonus: 9,
      slots: { 1: 4, 2: 3, 3: 3, 4: 3, 5: 3, 6: 1, 7: 1, 8: 1, 9: 1 },
      cantrips: ['Fire Bolt', 'Light', 'Mage Hand', 'Prestidigitation', 'Shocking Grasp'],
      known: [
        'Magic Missile', 'Shield', 'Mage Armor',
        'Misty Step', 'Suggestion',
        'Counterspell', 'Fireball', 'Fly',
        'Greater Invisibility', 'Ice Storm',
        'Cone of Cold', 'Wall of Force',
        'Globe of Invulnerability',
        'Teleport',
        'Mind Blank',
        'Time Stop',
      ],
    },
    
    multiattack: 0,
    weapons: [
      { name: 'Dagger', attackBonus: 6, damageDice: '1d4', damageBonus: 2, damageType: 'piercing', range: 5, type: 'melee' },
    ],
    
    tags: ['caster', 'humanoid', 'counterspell'],
  },

  'lich': {
    id: 'lich',
    name: 'Lich',
    side: 'enemy',
    type: 'undead',
    cr: 21,
    
    abilities: { str: 11, dex: 16, con: 16, int: 20, wis: 14, cha: 16 },
    profBonus: 7,
    
    hp: { max: 135, formula: '18d8+54' },
    ac: { base: 17, formula: 'natural armor' },
    speed: 30,
    
    saves: { str: 0, dex: 3, con: 10, int: 12, wis: 9, cha: 3 },
    
    features: {
      hasWarCaster: false,
      hasResilientCon: false,
      darkDevotion: false,
      magicResistance: false,
      immuneCharmed: true,
      legendaryResistance: 3,
      turnResistance: true,
    },
    
    resources: {
      legendaryResistance: { uses: 3, max: 3 },
      legendaryActions: { uses: 3, max: 3, perRound: 3 },
    },
    
    spellcasting: {
      ability: 'int',
      saveDC: 20,
      attackBonus: 12,
      slots: { 1: 4, 2: 3, 3: 3, 4: 3, 5: 3, 6: 1, 7: 1, 8: 1, 9: 1 },
      cantrips: ['Chill Touch', 'Mage Hand', 'Prestidigitation', 'Ray of Frost'],
      known: [
        'Magic Missile', 'Shield', 'Thunderwave',
        'Darkness', 'Detect Thoughts', 'Mirror Image',
        'Counterspell', 'Fireball', 'Animate Dead',
        'Dimension Door', 'Blight',
        'Cloudkill', 'Dominate Person',
        'Globe of Invulnerability',
        'Finger of Death',
        'Dominate Monster',
        'Power Word Stun',
      ],
    },
    
    multiattack: 0,
    weapons: [
      { name: 'Paralyzing Touch', attackBonus: 12, damageDice: '3d6', damageBonus: 0, damageType: 'cold', range: 5, type: 'melee',
        special: 'paralysis', paralyzeDC: 18, paralyzeAbility: 'con' },
    ],
    
    immunities: {
      conditions: ['charmed', 'exhaustion', 'frightened', 'paralyzed', 'poisoned'],
      damage: ['poison', 'bludgeoning_nonmagical', 'piercing_nonmagical', 'slashing_nonmagical'],
    },
    tags: ['caster', 'undead', 'counterspell', 'legendary'],
  },
};

// ═══════════════════════════════════════════════════════════════════════════
// FACTORY — produce combat-ready creatures from templates
// ═══════════════════════════════════════════════════════════════════════════

function computeModifier(score) {
  return Math.floor((score - 10) / 2);
}

/**
 * Create a combat-ready creature from a template key.
 * @param {string} templateKey — key in CREATURE_TEMPLATES
 * @param {object} overrides — optional overrides for any property
 * @returns {object} — fully initialized creature with runtime state
 */
function createCreature(templateKey, overrides = {}) {
  const template = CREATURE_TEMPLATES[templateKey];
  if (!template) throw new Error(`Unknown creature template: ${templateKey}`);
  
  const abilities = { ...template.abilities, ...overrides.abilities };
  const mods = {};
  for (const [ability, score] of Object.entries(abilities)) {
    mods[ability] = computeModifier(score);
  }
  
  const hp = overrides.maxHP ?? template.hp.max;
  const ac = overrides.ac ?? template.ac.base;
  
  const spellcasting = template.spellcasting ? {
    ability: template.spellcasting.ability,
    saveDC: template.spellcasting.saveDC,
    attackBonus: template.spellcasting.attackBonus,
    cantrips: [...template.spellcasting.cantrips],
    known: [...template.spellcasting.known],
  } : null;
  
  const spellSlots = template.spellcasting
    ? { ...template.spellcasting.slots }
    : {};
  const maxSlots = template.spellcasting
    ? { ...template.spellcasting.slots }
    : {};
  
  // Deep clone resources
  const resources = template.resources
    ? JSON.parse(JSON.stringify(template.resources))
    : {};
  
  // Build weapon list
  const weapons = (template.weapons || []).map(w => ({ ...w }));
  
  const creature = {
    // Identity
    id: overrides.id ?? template.id,
    name: overrides.name ?? template.name,
    side: overrides.side ?? template.side,
    class: template.class || null,
    level: template.level || null,
    race: template.race || null,
    type: template.type || 'humanoid',
    cr: template.cr ?? null,
    
    // Abilities
    ...abilities,
    strMod: mods.str, dexMod: mods.dex, conMod: mods.con,
    intMod: mods.int, wisMod: mods.wis, chaMod: mods.cha,
    profBonus: template.profBonus,
    
    // Combat stats
    maxHP: hp,
    currentHP: hp,
    tempHP: 0,
    ac,
    speed: template.speed,
    
    // Saves
    saves: { ...template.saves },
    
    // Features
    hasWarCaster: template.features?.hasWarCaster ?? false,
    hasResilientCon: template.features?.hasResilientCon ?? false,
    darkDevotion: template.features?.darkDevotion ?? false,
    magicResistance: template.features?.magicResistance ?? false,
    immuneCharmed: template.features?.immuneCharmed ?? false,
    
    // Spellcasting
    ...(spellcasting ? {
      spellSaveDC: spellcasting.saveDC,
      spellAttackBonus: spellcasting.attackBonus,
      cantrips: spellcasting.cantrips,
      spellsKnown: spellcasting.known,
    } : {}),
    spellSlots,
    maxSlots,
    
    // Multiattack
    multiattack: template.multiattack || 0,
    
    // Weapons
    weapons,
    weapon: weapons[0] || null,    // primary weapon compat with old sim
    
    // Resources
    ...resources,
    
    // Runtime state
    conditions: [],
    position: { x: 0, y: 0 },
    flying: false,
    concentrating: null,
    concentrationRoundsRemaining: 0,
    reactedThisRound: false,
    usedBonusAction: false,
    usedAction: false,
    usedFreeInteraction: false,
    movementRemaining: template.speed,
    
    // Analytics
    totalDamageDealt: 0,
    totalDamageTaken: 0,
    totalHealing: 0,
    attacksMade: 0,
    attacksHit: 0,
    spellsCast: 0,
    concentrationSavesMade: 0,
    concentrationSavesFailed: 0,
    conditionsInflicted: 0,
    reactionsUsed: 0,
    
    // Tags for AI decision-making
    tags: [...(template.tags || [])],
  };
  
  // Apply overrides
  if (overrides.position) creature.position = { ...overrides.position };
  if (overrides.name) creature.name = overrides.name;
  
  return creature;
}

/**
 * Get all available template keys.
 */
function getTemplateKeys() {
  return Object.keys(CREATURE_TEMPLATES);
}

/**
 * Get a template definition without creating a creature.
 */
function getTemplate(key) {
  const t = CREATURE_TEMPLATES[key];
  if (!t) throw new Error(`Unknown creature template: ${key}`);
  return t;
}

/**
 * Register a new creature template at runtime (e.g., from user data).
 */
function registerTemplate(key, template) {
  if (CREATURE_TEMPLATES[key]) {
    throw new Error(`Template already exists: ${key}. Use a unique key.`);
  }
  CREATURE_TEMPLATES[key] = template;
}

module.exports = {
  CREATURE_TEMPLATES,
  createCreature,
  computeModifier,
  getTemplateKeys,
  getTemplate,
  registerTemplate,
};
