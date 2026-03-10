/**
 * Core D&D 5e mechanics module
 *
 * Exports pure functions used by the combat engine:
 *   rollDie(sides)         → number
 *   rollDice(count, sides) → { rolls, total }
 *   rollWithAdvantage(sides)
 *   rollWithDisadvantage(sides)
 *   abilityModifier(score) → number
 *   proficiencyBonus(level) → number
 *   rollAttack(attackBonus, targetAC) → { roll, total, hit, critical, fumble }
 *   rollDamage(diceNotation, modifier) → { rolls, total }
 *   rollSavingThrow(score, proficient, profBonus, dc) → { roll, total, success }
 *   rollSkillCheck(score, proficient, profBonus, expertise, dc) → { roll, total, success }
 *   applyDamage(creature, rawDamage, damageType) → { newHp, overkill, unconscious, dead }
 *   healCreature(creature, amount) → { newHp, restored }
 *
 * New API (mode-aware, uses dice module):
 *   makeAbilityCheck(mod, dc) → { roll, total, dc, success }
 *   makeSavingThrow(mod, dc, hasAdv, hasDisadv) → { result, total, success, type }
 *   makeAttackRoll(attackBonus, targetAC, hasAdv, hasDisadv) → { natural, total, hits, isCrit, isMiss, type }
 *   rollDamage(diceStr, bonus, isCrit) → { rolls, bonus, total, crit }
 *   concentrationSave(creature, damage) → { dc, result, saveBonus, total, success, type }
 *   isIncapacitated(creature) → boolean
 *   isAlive(creature) → boolean
 *   hasCondition(creature, condition) → boolean
 *   addCondition(creature, condition) → void
 *   removeCondition(creature, condition) → boolean
 *   removeAllConditions(creature, ...conditions) → void
 *   getActiveEnemies(creatures) → creature[]
 *   getAllAliveEnemies(creatures) → creature[]
 *   breakConcentration(caster, allCombatants) → void
 *   distanceBetween(a, b) → number (feet)
 */

'use strict'

const dice = require('./dice')

// ── Primitive dice ────────────────────────────────────────────────────────────

/** Roll a single die with `sides` faces. Returns 1-based integer. */
function rollDie(sides) {
  return Math.floor(Math.random() * sides) + 1
}

/**
 * Roll `count` dice each with `sides` faces.
 * @returns {{ rolls: number[], total: number }}
 */
function rollDice(count, sides) {
  const rolls = []
  for (let i = 0; i < count; i++) rolls.push(rollDie(sides))
  return { rolls, total: rolls.reduce((a, b) => a + b, 0) }
}

/** Parse a dice notation string like "2d6", "1d20", "3d8+4" into { count, sides, modifier }. */
function parseDiceNotation(notation) {
  const match = String(notation).match(/^(\d+)d(\d+)([+-]\d+)?$/i)
  if (!match) throw new Error(`Invalid dice notation: "${notation}"`)
  return {
    count:    parseInt(match[1], 10),
    sides:    parseInt(match[2], 10),
    modifier: match[3] ? parseInt(match[3], 10) : 0,
  }
}

/** Roll advantage: roll d20 twice, take the higher. */
function rollWithAdvantage() {
  const a = rollDie(20)
  const b = rollDie(20)
  return { rolls: [a, b], total: Math.max(a, b) }
}

/** Roll disadvantage: roll d20 twice, take the lower. */
function rollWithDisadvantage() {
  const a = rollDie(20)
  const b = rollDie(20)
  return { rolls: [a, b], total: Math.min(a, b) }
}

// ── Modifiers ─────────────────────────────────────────────────────────────────

/** Compute D&D 5e ability modifier from an ability score. */
function abilityModifier(score) {
  return Math.floor((score - 10) / 2)
}

/** Compute proficiency bonus for a given character level (5e table). */
function proficiencyBonus(level) {
  return Math.ceil(level / 4) + 1
}

// ── Attack resolution ─────────────────────────────────────────────────────────

/**
 * Resolve a single attack roll.
 *
 * @param {number} attackBonus  - Total attack modifier (ability mod + proficiency + magic)
 * @param {number} targetAC     - Target armor class
 * @param {'normal'|'advantage'|'disadvantage'} advantage
 * @returns {{ roll: number, total: number, hit: boolean, critical: boolean, fumble: boolean }}
 */
function rollAttack(attackBonus, targetAC, advantage = 'normal') {
  let roll, rolls
  if (advantage === 'advantage') {
    const r = rollWithAdvantage(); roll = r.total; rolls = r.rolls
  } else if (advantage === 'disadvantage') {
    const r = rollWithDisadvantage(); roll = r.total; rolls = r.rolls
  } else {
    roll  = rollDie(20); rolls = [roll]
  }

  const critical = roll === 20
  const fumble   = roll === 1
  const total    = roll + attackBonus
  // Natural 1 always misses; natural 20 always hits
  const hit = critical || (!fumble && total >= targetAC)

  return { roll, rolls, total, hit, critical, fumble }
}

// ── Damage rolls (legacy) ─────────────────────────────────────────────────────
// NOTE: rollDamage() is now defined in the new mode-aware API section below.
// The new version uses the dice module for average/random mode support.
// This comment replaces the old legacy version to avoid duplicate naming.

// ── Saving throws ─────────────────────────────────────────────────────────────

/**
 * Resolve a saving throw.
 *
 * @param {number}  abilityScore  - The relevant ability score
 * @param {boolean} proficient    - Is the creature proficient in this saving throw?
 * @param {number}  profBonus     - Proficiency bonus
 * @param {number}  dc            - Difficulty class
 * @param {'normal'|'advantage'|'disadvantage'} advantage
 * @returns {{ roll: number, total: number, success: boolean }}
 */
function rollSavingThrow(abilityScore, proficient, profBonus, dc, advantage = 'normal') {
  const modifier = abilityModifier(abilityScore) + (proficient ? profBonus : 0)
  const { roll, total: rawRoll } = rollAttack(modifier, dc, advantage) // reuse roll logic
  const total = rawRoll
  return {
    roll,
    modifier,
    total,
    success: total >= dc,
  }
}

// ── Skill checks ──────────────────────────────────────────────────────────────

/**
 * Resolve an ability / skill check.
 *
 * @param {number}  abilityScore
 * @param {boolean} proficient
 * @param {boolean} expertise    - Double proficiency bonus
 * @param {number}  profBonus
 * @param {number}  dc
 * @returns {{ roll: number, total: number, success: boolean }}
 */
function rollSkillCheck(abilityScore, proficient, profBonus, dc, expertise = false, advantage = 'normal') {
  const abilMod  = abilityModifier(abilityScore)
  const profMod  = proficient ? (expertise ? profBonus * 2 : profBonus) : 0
  const modifier = abilMod + profMod

  let roll
  if (advantage === 'advantage') {
    roll = rollWithAdvantage().total
  } else if (advantage === 'disadvantage') {
    roll = rollWithDisadvantage().total
  } else {
    roll = rollDie(20)
  }

  const total = roll + modifier
  return { roll, modifier, total, success: total >= dc }
}

// ── HP management ─────────────────────────────────────────────────────────────

/**
 * Apply damage to a creature/character object.
 * Handles resistances, immunities, and temporary HP.
 *
 * @param {object}  entity       - Must have { hp: { current, max, temporary }, damageImmunities, damageResistances }
 * @param {number}  rawDamage
 * @param {string}  damageType   - e.g. 'fire', 'slashing'
 * @returns {{ newHp: number, actualDamage: number, overkill: number, unconscious: boolean, dead: boolean }}
 */
function applyDamage(entity, rawDamage, damageType) {
  const immunities  = entity.damageImmunities  ?? []
  const resistances = entity.damageResistances ?? []

  let damage = rawDamage
  if (immunities.includes(damageType)) damage = 0
  else if (resistances.includes(damageType)) damage = Math.floor(damage / 2)

  // Consume temporary HP first
  const tempHp = entity.hp.temporary ?? 0
  const damageAfterTemp = Math.max(0, damage - tempHp)
  const newTemp = Math.max(0, tempHp - damage)

  const oldHp  = entity.hp.current
  const newHp  = Math.max(0, oldHp - damageAfterTemp)
  const overkill = Math.max(0, damageAfterTemp - oldHp)

  return {
    newHp,
    newTemp,
    actualDamage: damage,
    overkill,
    unconscious:  newHp === 0,
    dead:         newHp === 0 && overkill >= entity.hp.max, // massive damage rule
  }
}

/**
 * Heal a creature/character.
 *
 * @param {object} entity - Must have { hp: { current, max } }
 * @param {number} amount
 * @returns {{ newHp: number, restored: number }}
 */
function healCreature(entity, amount) {
  const oldHp  = entity.hp.current
  const newHp  = Math.min(entity.hp.max, oldHp + Math.max(0, amount))
  return { newHp, restored: newHp - oldHp }
}

// ── Initiative ────────────────────────────────────────────────────────────────

/**
 * Roll initiative for an entity.
 * @param {number} dexterityScore
 * @returns {{ roll: number, modifier: number, total: number }}
 */
function rollInitiative(dexterityScore) {
  const modifier = abilityModifier(dexterityScore)
  const roll     = rollDie(20)
  return { roll, modifier, total: roll + modifier }
}

// ═══════════════════════════════════════════════════════════════════════════
// NEW MODE-AWARE API  (uses dice.js for average/random modes)
// ═══════════════════════════════════════════════════════════════════════════

/**
 * Make an ability check (mode-aware).
 * @param {number} mod - Total ability modifier
 * @param {number} dc  - Difficulty class
 * @returns {{ roll, total, dc, success }}
 */
function makeAbilityCheck(mod, dc) {
  const roll  = dice.d20()
  const total = roll + mod
  return { roll, total, dc, success: total >= dc }
}

/**
 * Roll a d20 in the current mode, applying advantage/disadvantage.
 * @param {boolean} hasAdv
 * @param {boolean} hasDisadv
 * @returns {{ result: number, type: 'normal'|'advantage'|'disadvantage' }}
 */
function _rollD20WithAdv(hasAdv, hasDisadv) {
  if (hasAdv && hasDisadv) {
    return { result: dice.d20(), type: 'normal' }
  }
  if (hasAdv) {
    const r = dice.rollWithAdvantage()
    return { result: r.result, type: 'advantage' }
  }
  if (hasDisadv) {
    const r = dice.rollWithDisadvantage()
    return { result: r.result, type: 'disadvantage' }
  }
  return { result: dice.d20(), type: 'normal' }
}

/**
 * Make a saving throw (mode-aware).
 * @param {number}  mod       - Total save modifier (ability mod + proficiency etc.)
 * @param {number}  dc        - Difficulty class
 * @param {boolean} hasAdv    - Has advantage on this save
 * @param {boolean} hasDisadv - Has disadvantage on this save
 * @returns {{ result, total, success, type }}
 */
function makeSavingThrow(mod, dc, hasAdv = false, hasDisadv = false) {
  const { result, type } = _rollD20WithAdv(hasAdv, hasDisadv)
  const total = result + mod
  return { result, total, success: total >= dc, type }
}

/**
 * Make an attack roll (mode-aware).
 * Natural 1 = always miss; natural 20 = always hit (crit).
 * @param {number}  attackBonus
 * @param {number}  targetAC
 * @param {boolean} hasAdv
 * @param {boolean} hasDisadv
 * @returns {{ natural, attackBonus, total, hits, isCrit, isMiss, type }}
 */
function makeAttackRoll(attackBonus, targetAC, hasAdv = false, hasDisadv = false) {
  const { result, type } = _rollD20WithAdv(hasAdv, hasDisadv)
  const natural = result
  const total   = natural + attackBonus
  const isCrit  = natural === 20
  const isMiss  = natural === 1
  const hits    = isCrit || (!isMiss && total >= targetAC)
  return { natural, attackBonus, total, hits, isCrit, isMiss, type }
}

/**
 * Roll damage from a dice string (mode-aware, supports crit).
 * @param {string}  diceStr  - e.g. '1d8', '2d6', '3d10'
 * @param {number}  bonus    - flat damage bonus
 * @param {boolean} isCrit   - double dice count on crit
 * @returns {{ rolls, bonus, total, crit }}
 */
function rollDamage(diceStr, bonus = 0, isCrit = false) {
  const match = diceStr.match(/^(\d+)d(\d+)$/)
  if (!match) throw new Error(`Invalid dice string: "${diceStr}"`)
  const count = parseInt(match[1], 10) * (isCrit ? 2 : 1)
  const sides = parseInt(match[2], 10)
  const dieFn = dice.dieFns[sides]
  if (!dieFn) throw new Error(`Unsupported die size: d${sides}`)
  const rolls = dice.rollDice(count, dieFn)
  const total = rolls.reduce((s, r) => s + r, 0) + bonus
  return { rolls, bonus, total, crit: isCrit }
}

/**
 * Concentration saving throw for a creature that took damage.
 * DC = max(10, floor(damage / 2))
 * War Caster grants advantage.
 * @param {object} creature
 * @param {number} damage
 * @returns {{ dc, result, saveBonus, total, success, type }}
 */
function concentrationSave(creature, damage) {
  const dc        = Math.max(10, Math.floor(damage / 2))
  const saveBonus = creature.saves ? (creature.saves.con || 0) : 0
  const hasAdv    = !!creature.hasWarCaster
  const { result, type } = _rollD20WithAdv(hasAdv, false)
  const total = result + saveBonus
  return { dc, result, saveBonus, total, success: total >= dc, type }
}

// ── Condition helpers ──────────────────────────────────────────────────────

const INCAPACITATING_CONDITIONS = new Set([
  'paralyzed', 'stunned', 'unconscious', 'charmed_hp', 'incapacitated',
])

/** Returns true if the creature cannot take actions. */
function isIncapacitated(creature) {
  return creature.conditions.some(c => INCAPACITATING_CONDITIONS.has(c))
}

/** Returns true if the creature has HP remaining. */
function isAlive(creature) {
  return creature.currentHP > 0
}

/** Returns true if creature has the named condition. */
function hasCondition(creature, condition) {
  return creature.conditions.includes(condition)
}

/** Add a condition; silently deduplicates. */
function addCondition(creature, condition) {
  if (!creature.conditions.includes(condition)) {
    creature.conditions.push(condition)
  }
}

/** Remove a condition. Returns true if the condition was present. */
function removeCondition(creature, condition) {
  const idx = creature.conditions.indexOf(condition)
  if (idx === -1) return false
  creature.conditions.splice(idx, 1)
  return true
}

/** Remove all instances of the named conditions from a creature. */
function removeAllConditions(creature, ...conditions) {
  creature.conditions = creature.conditions.filter(c => !conditions.includes(c))
}

/** Active enemies: alive AND not incapacitated. */
function getActiveEnemies(creatures) {
  return creatures.filter(c => isAlive(c) && !isIncapacitated(c))
}

/** All alive creatures (includes incapacitated). */
function getAllAliveEnemies(creatures) {
  return creatures.filter(c => isAlive(c))
}

// ── Concentration cleanup ──────────────────────────────────────────────────

/**
 * Break concentration on the caster, cleaning up any spell effects.
 * @param {object}   caster         - Concentrating combatant
 * @param {object[]} allCombatants  - All combatants in the encounter
 */
function breakConcentration(caster, allCombatants) {
  const spell = caster.concentrating
  if (!spell) return

  // Clean up spell-specific effects
  switch (spell) {
    case 'Hypnotic Pattern':
      for (const c of allCombatants) {
        removeAllConditions(c, 'charmed_hp', 'incapacitated')
      }
      break

    case 'Hold Person':
    case 'Hold Monster':
      for (const c of allCombatants) {
        removeCondition(c, 'paralyzed')
      }
      break

    case 'Greater Invisibility':
      removeCondition(caster, 'invisible')
      break

    case 'Shield of Faith':
      caster.ac = (caster.ac || 0) - 2
      break

    default:
      // Spells with no cleanup effects (Faerie Fire, etc.)
      break
  }

  caster.concentrating = null
  caster.concentrationRoundsRemaining = 0
}

// ── Spatial ────────────────────────────────────────────────────────────────

const FLYING_ALTITUDE_FT = 30  // assumed altitude when flying

/**
 * Distance between two combatants in feet.
 * Ground-to-ground: Chebyshev distance * 5 ft (D&D grid).
 * Flying vs ground: 3D Euclidean with 30 ft altitude, rounded to nearest 5 ft.
 * @param {object} a
 * @param {object} b
 * @returns {number} distance in feet
 */
function distanceBetween(a, b) {
  const ax = a.position ? (a.position.x || 0) : 0
  const ay = a.position ? (a.position.y || 0) : 0
  const bx = b.position ? (b.position.x || 0) : 0
  const by = b.position ? (b.position.y || 0) : 0

  const chebyshev = Math.max(Math.abs(ax - bx), Math.abs(ay - by))
  const horizontal = chebyshev * 5  // grid units → feet

  const aFlying = !!a.flying
  const bFlying = !!b.flying

  if (aFlying === bFlying) {
    // Both grounded or both flying at same altitude
    return horizontal
  }

  // One flying, one grounded — use 3D Euclidean distance
  const dist3d = Math.sqrt(horizontal * horizontal + FLYING_ALTITUDE_FT * FLYING_ALTITUDE_FT)
  return Math.round(dist3d / 5) * 5
}

// ── Exports ───────────────────────────────────────────────────────────────────
module.exports = {
  // Legacy API (kept for backward compatibility with encounterRunner.js)
  rollDie,
  rollDice,
  parseDiceNotation,
  rollWithAdvantage,
  rollWithDisadvantage,
  abilityModifier,
  proficiencyBonus,
  rollAttack,
  rollSavingThrow,
  rollSkillCheck,
  applyDamage,
  healCreature,
  rollInitiative,

  // New mode-aware API
  makeAbilityCheck,
  makeSavingThrow,
  makeAttackRoll,
  rollDamage,
  concentrationSave,
  isIncapacitated,
  isAlive,
  hasCondition,
  addCondition,
  removeCondition,
  removeAllConditions,
  getActiveEnemies,
  getAllAliveEnemies,
  breakConcentration,
  distanceBetween,
}
