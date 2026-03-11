/**
 * Spell Registry — data-driven spell definitions
 * 
 * Each spell is a plain data object describing what it does.
 * The spell resolver (engine/spellResolver.js) reads these definitions
 * and executes the mechanics. No logic lives here — only declarations.
 * 
 * Schema per spell:
 *   name:          string — spell name
 *   level:         number — 0 for cantrips
 *   school:        string — evocation, enchantment, etc.
 *   castingTime:   'action' | 'bonus_action' | 'reaction'
 *   range:         number — in feet (0 = self, 5 = touch)
 *   duration:      number — rounds (0 = instantaneous, 10 = 1 minute)
 *   concentration: boolean
 *   targeting:     { type: 'single'|'self'|'area', shape?: 'cube'|'sphere'|'cone'|'cylinder'|'wall', size?: number, radius?: number, length?: number }
 *   save:          { ability: 'wis'|'dex'|'str'|'con', negatesAll?: boolean } | null
 *   attack:        { type: 'melee_spell'|'ranged_spell' } | null
 *   damage:        { dice: string, type: string, bonus?: number } | null
 *   effects:       string[] — conditions/effects applied on failure
 *   selfEffects:   string[] — conditions/effects applied to caster
 *   onConcentrationEnd: string[] — effects to remove when concentration drops
 *   counterSpellable: boolean — can be counterspelled (default true for non-self)
 *   tags:          string[] — categorization for AI decision-making
 *   notes:         string — human-readable description for logging
 */

const SPELLS = {

  // ═══════════════════════════════════════════════
  // CANTRIPS (Level 0)
  // ═══════════════════════════════════════════════

  'Vicious Mockery': {
    name: 'Vicious Mockery',
    level: 0,
    school: 'enchantment',
    castingTime: 'action',
    range: 60,
    duration: 0,
    concentration: false,
    targeting: { type: 'single' },
    save: { ability: 'wis', negatesAll: true },
    attack: null,
    damage: { dice: '2d4', type: 'psychic' },      // at 5th level (2d4)
    effects: ['vm_disadvantage'],                     // disadvantage on next attack
    selfEffects: [],
    onConcentrationEnd: [],
    counterSpellable: false,
    tags: ['debuff', 'cantrip', 'damage'],
    notes: 'WIS save or 2d4 psychic + disadvantage on next attack roll.',
  },

  'Sacred Flame': {
    name: 'Sacred Flame',
    level: 0,
    school: 'evocation',
    castingTime: 'action',
    range: 60,
    duration: 0,
    concentration: false,
    targeting: { type: 'single' },
    save: { ability: 'dex', negatesAll: true },
    attack: null,
    damage: { dice: '1d8', type: 'radiant' },       // scales at higher levels
    effects: [],
    selfEffects: [],
    onConcentrationEnd: [],
    counterSpellable: false,
    tags: ['cantrip', 'damage'],
    notes: 'DEX save or 1d8 radiant. Ignores cover. Auto-fail DEX if paralyzed.',
    special: ['ignores_cover', 'autofail_dex_if_paralyzed'],
  },

  // ═══════════════════════════════════════════════
  // 1ST LEVEL
  // ═══════════════════════════════════════════════

  'Command': {
    name: 'Command',
    level: 1,
    school: 'enchantment',
    castingTime: 'action',
    range: 60,
    duration: 1,    // 1 round
    concentration: false,
    targeting: { type: 'single' },
    save: { ability: 'wis', negatesAll: true },
    attack: null,
    damage: null,
    effects: ['prone'],      // "Grovel" variant
    selfEffects: [],
    onConcentrationEnd: [],
    counterSpellable: true,
    tags: ['control', 'debuff'],
    notes: 'WIS save or falls prone and ends turn (Grovel option).',
  },

  'Healing Word': {
    name: 'Healing Word',
    level: 1,
    school: 'evocation',
    castingTime: 'bonus_action',
    range: 60,
    duration: 0,
    concentration: false,
    targeting: { type: 'single' },
    save: null,
    attack: null,
    damage: null,
    healing: { dice: '1d4', bonus: 'casting_mod' },  // 1d4 + CHA mod at level 1
    effects: [],
    selfEffects: [],
    onConcentrationEnd: [],
    counterSpellable: true,
    tags: ['healing'],
    notes: 'Heals 1d4 + casting mod. Bonus action. 60ft range.',
  },

  'Inflict Wounds': {
    name: 'Inflict Wounds',
    level: 1,
    school: 'necromancy',
    castingTime: 'action',
    range: 5,       // touch/melee
    duration: 0,
    concentration: false,
    targeting: { type: 'single' },
    save: null,
    attack: { type: 'melee_spell' },
    damage: { dice: '3d10', type: 'necrotic' },
    effects: [],
    selfEffects: [],
    onConcentrationEnd: [],
    counterSpellable: true,
    tags: ['damage', 'melee'],
    notes: 'Melee spell attack. 3d10 necrotic on hit.',
  },

  'Shield of Faith': {
    name: 'Shield of Faith',
    level: 1,
    school: 'abjuration',
    castingTime: 'bonus_action',
    range: 60,
    duration: 100,   // 10 minutes = 100 rounds
    concentration: true,
    targeting: { type: 'single' },
    save: null,
    attack: null,
    damage: null,
    effects: [],
    selfEffects: ['ac_bonus_2'],
    onConcentrationEnd: ['remove_ac_bonus_2'],
    counterSpellable: true,
    tags: ['buff', 'defense'],
    notes: '+2 AC. Concentration, up to 10 minutes.',
  },

  'Dissonant Whispers': {
    name: 'Dissonant Whispers',
    level: 1,
    school: 'enchantment',
    castingTime: 'action',
    range: 60,
    duration: 0,
    concentration: false,
    targeting: { type: 'single' },
    save: { ability: 'wis', negatesAll: false },      // half damage on success
    attack: null,
    damage: { dice: '3d6', type: 'psychic' },
    effects: ['must_use_reaction_to_move_away'],
    selfEffects: [],
    onConcentrationEnd: [],
    counterSpellable: true,
    tags: ['damage', 'control'],
    notes: 'WIS save. 3d6 psychic (half on save). Must use reaction to move away on fail.',
  },

  // ═══════════════════════════════════════════════
  // 2ND LEVEL
  // ═══════════════════════════════════════════════

  'Hold Person': {
    name: 'Hold Person',
    level: 2,
    school: 'enchantment',
    castingTime: 'action',
    range: 60,
    duration: 10,    // 1 minute
    concentration: true,
    targeting: { type: 'single' },
    save: { ability: 'wis', negatesAll: true },
    attack: null,
    damage: null,
    effects: ['paralyzed'],
    selfEffects: [],
    onConcentrationEnd: ['remove_paralyzed'],
    counterSpellable: true,
    tags: ['control', 'single_target', 'save_or_suck'],
    notes: 'WIS save or paralyzed. End-of-turn repeat save. Concentration.',
    endOfTurnSave: { ability: 'wis' },
  },

  'Spiritual Weapon': {
    name: 'Spiritual Weapon',
    level: 2,
    school: 'evocation',
    castingTime: 'bonus_action',
    range: 60,
    duration: 10,    // 1 minute
    concentration: false,      // NOT concentration!
    targeting: { type: 'single' },
    save: null,
    attack: { type: 'melee_spell' },
    damage: { dice: '1d8', type: 'force', bonus: 'casting_mod' },
    effects: [],
    selfEffects: [],
    onConcentrationEnd: [],
    counterSpellable: true,
    tags: ['damage', 'bonus_action', 'sustained'],
    notes: 'Bonus action melee spell attack each turn. 1d8 + casting mod force.',
    sustainedEffect: true,    // lasts multiple rounds, bonus action each turn
  },

  // ═══════════════════════════════════════════════
  // 3RD LEVEL
  // ═══════════════════════════════════════════════

  'Hypnotic Pattern': {
    name: 'Hypnotic Pattern',
    level: 3,
    school: 'illusion',
    castingTime: 'action',
    range: 120,
    duration: 10,    // 1 minute
    concentration: true,
    targeting: { type: 'area', shape: 'cube', size: 30 },
    save: { ability: 'wis', negatesAll: true },
    attack: null,
    damage: null,
    effects: ['charmed_hp', 'incapacitated'],
    selfEffects: [],
    onConcentrationEnd: ['remove_charmed_hp', 'remove_incapacitated'],
    counterSpellable: true,
    tags: ['control', 'aoe', 'save_or_suck'],
    notes: 'WIS save or charmed + incapacitated + speed 0. Shake awake as action.',
    special: ['can_shake_awake'],
  },

  'Counterspell': {
    name: 'Counterspell',
    level: 3,
    school: 'abjuration',
    castingTime: 'reaction',
    range: 60,
    duration: 0,
    concentration: false,
    targeting: { type: 'single' },     // targets the caster of the spell
    save: null,
    attack: null,
    damage: null,
    effects: ['counter'],
    selfEffects: [],
    onConcentrationEnd: [],
    counterSpellable: false,           // can't counterspell a counterspell (well, you CAN, but not with your own reaction)
    tags: ['reaction', 'counter'],
    notes: 'Auto-counters spells ≤ slot level. Higher: DC 10 + spell level ability check.',
    special: ['auto_counter_if_slot_gte_spell_level'],
  },

  // ═══════════════════════════════════════════════
  // 4TH LEVEL
  // ═══════════════════════════════════════════════

  'Greater Invisibility': {
    name: 'Greater Invisibility',
    level: 4,
    school: 'illusion',
    castingTime: 'action',
    range: 0,       // touch (self in current impl)
    duration: 10,    // 1 minute
    concentration: true,
    targeting: { type: 'self' },
    save: null,
    attack: null,
    damage: null,
    effects: [],
    selfEffects: ['invisible'],
    onConcentrationEnd: ['remove_invisible'],
    counterSpellable: true,
    tags: ['buff', 'stealth', 'defensive'],
    notes: 'Target becomes invisible. Doesn\'t end on attack/spell. Concentration.',
  },

  'Dimension Door': {
    name: 'Dimension Door',
    level: 4,
    school: 'conjuration',
    castingTime: 'action',
    range: 500,
    duration: 0,
    concentration: false,
    targeting: { type: 'self' },
    save: null,
    attack: null,
    damage: null,
    effects: [],
    selfEffects: ['teleport'],
    onConcentrationEnd: [],
    counterSpellable: true,
    tags: ['movement', 'escape', 'utility'],
    notes: 'Teleport self up to 500ft to a place you can see or describe.',
  },

  // ═══════════════════════════════════════════════
  // 5TH LEVEL
  // ═══════════════════════════════════════════════

  'Cone of Cold': {
    name: 'Cone of Cold',
    level: 5,
    school: 'evocation',
    castingTime: 'action',
    range: 0,       // self (60ft cone)
    duration: 0,
    concentration: false,
    targeting: { type: 'area', shape: 'cone', length: 60 },
    save: { ability: 'con', negatesAll: false },     // half damage on success
    attack: null,
    damage: { dice: '8d8', type: 'cold' },
    effects: [],
    selfEffects: [],
    onConcentrationEnd: [],
    counterSpellable: true,
    tags: ['damage', 'aoe'],
    notes: 'CON save. 8d8 cold (half on success). 60ft cone.',
  },

  // ═══════════════════════════════════════════════
  // CANTRIPS — MONSTER
  // ═══════════════════════════════════════════════

  'Fire Bolt': {
    name: 'Fire Bolt',
    level: 0,
    school: 'evocation',
    castingTime: 'action',
    range: 120,
    duration: 0,
    concentration: false,
    targeting: { type: 'single' },
    save: null,
    attack: { type: 'ranged_spell' },
    damage: { dice: '2d10', type: 'fire' },          // at 5th+ level caster
    effects: [],
    selfEffects: [],
    onConcentrationEnd: [],
    counterSpellable: false,
    tags: ['cantrip', 'damage', 'ranged'],
    notes: 'Ranged spell attack. 2d10 fire. Ignites flammable objects.',
  },

  'Chill Touch': {
    name: 'Chill Touch',
    level: 0,
    school: 'necromancy',
    castingTime: 'action',
    range: 120,
    duration: 0,
    concentration: false,
    targeting: { type: 'single' },
    save: null,
    attack: { type: 'ranged_spell' },
    damage: { dice: '2d8', type: 'necrotic' },       // at 5th+ level caster
    effects: ['no_healing'],                           // can't regain HP until next turn
    selfEffects: [],
    onConcentrationEnd: [],
    counterSpellable: false,
    tags: ['cantrip', 'damage', 'ranged'],
    notes: 'Ranged spell attack. 2d8 necrotic. Target can\'t regain HP until start of your next turn.',
  },

  'Ray of Frost': {
    name: 'Ray of Frost',
    level: 0,
    school: 'evocation',
    castingTime: 'action',
    range: 60,
    duration: 0,
    concentration: false,
    targeting: { type: 'single' },
    save: null,
    attack: { type: 'ranged_spell' },
    damage: { dice: '2d8', type: 'cold' },           // at 5th+ level caster
    effects: ['speed_reduced_10'],
    selfEffects: [],
    onConcentrationEnd: [],
    counterSpellable: false,
    tags: ['cantrip', 'damage', 'ranged', 'debuff'],
    notes: 'Ranged spell attack. 2d8 cold. Target speed reduced by 10ft until start of your next turn.',
  },

  // ═══════════════════════════════════════════════
  // 1ST LEVEL — MONSTER
  // ═══════════════════════════════════════════════

  'Shield': {
    name: 'Shield',
    level: 1,
    school: 'abjuration',
    castingTime: 'reaction',
    range: 0,       // self
    duration: 1,     // until start of next turn
    concentration: false,
    targeting: { type: 'self' },
    save: null,
    attack: null,
    damage: null,
    effects: [],
    selfEffects: ['ac_bonus_5'],
    onConcentrationEnd: [],
    counterSpellable: false,  // reaction spell
    tags: ['reaction', 'defense'],
    notes: '+5 AC until start of next turn, including vs triggering attack.',
  },

  'Magic Missile': {
    name: 'Magic Missile',
    level: 1,
    school: 'evocation',
    castingTime: 'action',
    range: 120,
    duration: 0,
    concentration: false,
    targeting: { type: 'single' },     // 3 darts, can target 1-3 creatures
    save: null,
    attack: null,                       // auto-hit
    damage: { dice: '1d4', type: 'force', bonus: 1 },  // per dart, 3 darts at level 1
    effects: [],
    selfEffects: [],
    onConcentrationEnd: [],
    counterSpellable: true,
    tags: ['damage', 'auto_hit'],
    notes: '3 darts, 1d4+1 force each. Auto-hit. +1 dart per slot level above 1st.',
    special: ['auto_hit', 'multi_dart'],
    dartsAtLevel: { 1: 3, 2: 4, 3: 5, 4: 6, 5: 7 },
  },

  'Mage Armor': {
    name: 'Mage Armor',
    level: 1,
    school: 'abjuration',
    castingTime: 'action',
    range: 0,       // touch
    duration: 80,    // 8 hours ≈ 80 rounds (pre-cast, won't expire in combat)
    concentration: false,
    targeting: { type: 'single' },
    save: null,
    attack: null,
    damage: null,
    effects: [],
    selfEffects: ['ac_set_13_plus_dex'],
    onConcentrationEnd: [],
    counterSpellable: true,
    tags: ['buff', 'defense', 'pre_cast'],
    notes: 'Base AC becomes 13 + DEX mod. No armor. Pre-cast before combat.',
  },

  // ═══════════════════════════════════════════════
  // 3RD LEVEL — MONSTER
  // ═══════════════════════════════════════════════

  'Fireball': {
    name: 'Fireball',
    level: 3,
    school: 'evocation',
    castingTime: 'action',
    range: 150,
    duration: 0,
    concentration: false,
    targeting: { type: 'area', shape: 'sphere', radius: 20 },
    save: { ability: 'dex', negatesAll: false },     // half damage on success
    attack: null,
    damage: { dice: '8d6', type: 'fire' },
    effects: [],
    selfEffects: [],
    onConcentrationEnd: [],
    counterSpellable: true,
    tags: ['damage', 'aoe'],
    notes: 'DEX save. 8d6 fire (half on success). 20ft radius sphere.',
  },

  // ═══════════════════════════════════════════════
  // 2ND LEVEL — ADDITIONAL
  // ═══════════════════════════════════════════════

  'Misty Step': {
    name: 'Misty Step',
    level: 2,
    school: 'conjuration',
    castingTime: 'bonus_action',
    range: 0,
    duration: 0,
    concentration: false,
    targeting: { type: 'self' },
    save: null,
    attack: null,
    damage: null,
    effects: [],
    selfEffects: ['teleport_30ft'],
    onConcentrationEnd: [],
    counterSpellable: true,
    tags: ['movement', 'escape', 'utility'],
    notes: 'Bonus action. Teleport up to 30ft to a visible unoccupied space.',
  },

  // ═══════════════════════════════════════════════
  // 4TH LEVEL — ADDITIONAL
  // ═══════════════════════════════════════════════

  'Blight': {
    name: 'Blight',
    level: 4,
    school: 'necromancy',
    castingTime: 'action',
    range: 30,
    duration: 0,
    concentration: false,
    targeting: { type: 'single' },
    save: { ability: 'con', negatesAll: false },     // half damage on success
    attack: null,
    damage: { dice: '8d8', type: 'necrotic' },
    effects: [],
    selfEffects: [],
    onConcentrationEnd: [],
    counterSpellable: true,
    tags: ['damage', 'single_target'],
    notes: 'CON save. 8d8 necrotic (half on success). 30ft range.',
  },

  'Ice Storm': {
    name: 'Ice Storm',
    level: 4,
    school: 'evocation',
    castingTime: 'action',
    range: 300,
    duration: 0,
    concentration: false,
    targeting: { type: 'area', shape: 'cylinder', radius: 20, height: 40 },
    save: { ability: 'dex', negatesAll: false },     // half damage on success
    attack: null,
    damage: { dice: '2d8', type: 'bludgeoning', bonusDice: '4d6', bonusType: 'cold' },
    effects: ['difficult_terrain'],
    selfEffects: [],
    onConcentrationEnd: [],
    counterSpellable: true,
    tags: ['damage', 'aoe', 'control'],
    notes: 'DEX save. 2d8 bludgeoning + 4d6 cold (half on success). Creates difficult terrain.',
  },

  // ═══════════════════════════════════════════════
  // 5TH LEVEL — ADDITIONAL
  // ═══════════════════════════════════════════════

  'Cloudkill': {
    name: 'Cloudkill',
    level: 5,
    school: 'conjuration',
    castingTime: 'action',
    range: 120,
    duration: 10,    // 1 minute
    concentration: true,
    targeting: { type: 'area', shape: 'sphere', radius: 20 },
    save: { ability: 'con', negatesAll: false },     // half damage on success
    attack: null,
    damage: { dice: '5d8', type: 'poison' },
    effects: [],
    selfEffects: [],
    onConcentrationEnd: [],
    counterSpellable: true,
    tags: ['damage', 'aoe', 'control', 'sustained'],
    notes: 'CON save. 5d8 poison (half on success). Moves 10ft/round. Concentration.',
  },

  'Wall of Force': {
    name: 'Wall of Force',
    level: 5,
    school: 'evocation',
    castingTime: 'action',
    range: 120,
    duration: 10,    // 1 minute
    concentration: true,
    targeting: { type: 'area', shape: 'wall' },
    save: null,
    attack: null,
    damage: null,
    effects: ['wall_of_force'],
    selfEffects: [],
    onConcentrationEnd: ['remove_wall_of_force'],
    counterSpellable: true,
    tags: ['control', 'wall', 'defensive'],
    notes: 'Creates impenetrable wall or dome. Concentration. Nothing passes through.',
  },

  // ═══════════════════════════════════════════════
  // 6TH LEVEL — ADDITIONAL
  // ═══════════════════════════════════════════════

  'Globe of Invulnerability': {
    name: 'Globe of Invulnerability',
    level: 6,
    school: 'abjuration',
    castingTime: 'action',
    range: 0,
    duration: 10,    // 1 minute
    concentration: true,
    targeting: { type: 'self' },
    save: null,
    attack: null,
    damage: null,
    effects: [],
    selfEffects: ['globe_of_invulnerability'],
    onConcentrationEnd: ['remove_globe_of_invulnerability'],
    counterSpellable: false,     // can't counter it — spells ≤5th can't pass through
    tags: ['defensive', 'buff'],
    notes: 'Spells of 5th level or lower can\'t affect anything within the barrier. Concentration.',
  },

  // ═══════════════════════════════════════════════
  // 7TH LEVEL — ADDITIONAL
  // ═══════════════════════════════════════════════

  'Finger of Death': {
    name: 'Finger of Death',
    level: 7,
    school: 'necromancy',
    castingTime: 'action',
    range: 60,
    duration: 0,
    concentration: false,
    targeting: { type: 'single' },
    save: { ability: 'con', negatesAll: false },     // half damage on success
    attack: null,
    damage: { dice: '7d8', type: 'necrotic', bonus: 30 },
    effects: [],
    selfEffects: [],
    onConcentrationEnd: [],
    counterSpellable: true,
    tags: ['damage', 'single_target'],
    notes: 'CON save. 7d8+30 necrotic (half on success). Kills humanoids → zombie.',
  },

  // ═══════════════════════════════════════════════
  // 8TH LEVEL — ADDITIONAL
  // ═══════════════════════════════════════════════

  'Power Word Stun': {
    name: 'Power Word Stun',
    level: 8,
    school: 'enchantment',
    castingTime: 'action',
    range: 60,
    duration: 0,     // until save
    concentration: false,
    targeting: { type: 'single' },
    save: null,      // no save — auto-stun if ≤150 HP
    attack: null,
    damage: null,
    effects: ['stunned'],
    selfEffects: [],
    onConcentrationEnd: [],
    counterSpellable: true,
    tags: ['control', 'single_target', 'no_save'],
    notes: 'Auto-stun if target has ≤150 HP. End-of-turn CON save DC 15 to end.',
    special: ['hp_threshold_150', 'end_of_turn_con_save_15'],
    endOfTurnSave: { ability: 'con', dc: 15 },
  },

  // ═══════════════════════════════════════════════
  // 1ST LEVEL — ADDITIONAL
  // ═══════════════════════════════════════════════

  'Thunderwave': {
    name: 'Thunderwave',
    level: 1,
    school: 'evocation',
    castingTime: 'action',
    range: 0,       // self (15ft cube)
    duration: 0,
    concentration: false,
    targeting: { type: 'area', shape: 'cube', size: 15 },
    save: { ability: 'con', negatesAll: false },     // half damage on success
    attack: null,
    damage: { dice: '2d8', type: 'thunder' },
    effects: ['pushed_10ft'],
    selfEffects: [],
    onConcentrationEnd: [],
    counterSpellable: true,
    tags: ['damage', 'aoe', 'control'],
    notes: 'CON save. 2d8 thunder (half on success). Pushed 10ft on fail.',
  },
};

// ═══════════════════════════════════════════════════════════════════════════
// Registry API
// ═══════════════════════════════════════════════════════════════════════════

function getSpell(name) {
  const spell = SPELLS[name];
  if (!spell) throw new Error(`Unknown spell: ${name}`);
  return spell;
}

function hasSpell(name) {
  return name in SPELLS;
}

function getSpellsByLevel(level) {
  return Object.values(SPELLS).filter(s => s.level === level);
}

function getSpellsByTag(tag) {
  return Object.values(SPELLS).filter(s => s.tags.includes(tag));
}

function getConcentrationSpells() {
  return Object.values(SPELLS).filter(s => s.concentration);
}

function isConcentrationSpell(name) {
  return hasSpell(name) && SPELLS[name].concentration;
}

function getAllSpellNames() {
  return Object.keys(SPELLS);
}

/**
 * Get the effective radius (in feet) of a spell's AoE for target resolution.
 * - cube: half the side length (5e: creatures within the cube)
 * - sphere: the radius
 * - cone: the length (cone's max extent)
 * - cylinder: the radius
 * - wall: 0 (special handling)
 * @param {object} targeting - the spell's targeting object
 * @returns {number} effective radius in feet
 */
function getAoERadius(targeting) {
  if (!targeting || targeting.type !== 'area') return 0;
  switch (targeting.shape) {
    case 'cube':     return Math.floor(targeting.size / 2);
    case 'sphere':   return targeting.radius || 0;
    case 'cone':     return targeting.length || 0;
    case 'cylinder': return targeting.radius || 0;
    case 'wall':     return 0;
    default:         return 0;
  }
}

module.exports = {
  SPELLS,
  getSpell,
  hasSpell,
  getSpellsByLevel,
  getSpellsByTag,
  getConcentrationSpells,
  isConcentrationSpell,
  getAllSpellNames,
  getAoERadius,
};
