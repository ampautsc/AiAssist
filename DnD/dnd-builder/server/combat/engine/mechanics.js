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
 */

'use strict'

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

// ── Damage rolls ──────────────────────────────────────────────────────────────

/**
 * Roll damage from a dice notation string.
 * On a critical hit pass doubleDice=true to roll the dice component twice.
 *
 * @returns {{ rolls: number[], total: number }}
 */
function rollDamage(notation, modifier = 0, doubleDice = false) {
  const { count, sides } = parseDiceNotation(notation)
  const diceCount = doubleDice ? count * 2 : count
  const { rolls, total: diceTotal } = rollDice(diceCount, sides)
  return { rolls, total: Math.max(0, diceTotal + modifier) }
}

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

// ── Exports ───────────────────────────────────────────────────────────────────
module.exports = {
  rollDie,
  rollDice,
  parseDiceNotation,
  rollWithAdvantage,
  rollWithDisadvantage,
  abilityModifier,
  proficiencyBonus,
  rollAttack,
  rollDamage,
  rollSavingThrow,
  rollSkillCheck,
  applyDamage,
  healCreature,
  rollInitiative,
}
