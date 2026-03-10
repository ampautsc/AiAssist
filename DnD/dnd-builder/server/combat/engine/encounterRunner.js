/**
 * Encounter Runner
 *
 * Orchestrates a full D&D 5e combat encounter.
 *
 * Usage:
 *   const { runEncounter } = require('./encounterRunner')
 *   const result = await runEncounter(party, enemies, mapTiles, options)
 *
 * Returns a complete EncounterResult:
 *   {
 *     sessionId, partyId,
 *     outcome: 'victory' | 'tpk' | 'fled' | 'timeout',
 *     rounds,
 *     combatLog: [...],
 *     positionSnapshots: [...],
 *     xpEarned, lootDropped
 *   }
 *
 * The runner fires an optional onEvent(event) callback after each meaningful
 * action so the WebSocket hub can stream events to clients in real time.
 */

'use strict'

const { v4: uuidv4 }   = require('uuid')
const mechanics         = require('./mechanics')
const { chooseTactic }  = require('../ai/tactics')
const creatures         = require('../data/creatures')

const MAX_ROUNDS = 50  // safety cap to prevent infinite loops

// ── Helper: clone HP object ───────────────────────────────────────────────────
function cloneHp(hp) {
  return { ...hp }
}

// ── Helper: build combatant list from party + enemies ─────────────────────────
function buildCombatants(party, enemies) {
  const combatants = []

  for (const member of party) {
    combatants.push({
      id:           member.id ?? uuidv4(),
      type:         'character',
      name:         member.name,
      hp:           cloneHp(member.hitPoints ?? member.hp),
      abilityScores: member.abilityScores,
      armorClass:   member.armorClass ?? 10,
      proficiencyBonus: member.proficiencyBonus ?? 2,
      actions:      member.actions ?? [],
      position:     member.position ?? { q: 0, r: 0 },
      conditions:   [],
      damageImmunities:  [],
      damageResistances: [],
      isAlive:      true,
    })
  }

  for (const enemy of enemies) {
    const template = typeof enemy === 'string' ? creatures.getCreature(enemy) : enemy
    if (!template) { console.warn(`[Encounter] Unknown creature: ${enemy}`); continue }
    combatants.push({
      id:               uuidv4(),
      type:             'creature',
      creatureId:       template.id,
      name:             template.name,
      hp:               { max: template.hitPointsAverage, current: template.hitPointsAverage, temporary: 0 },
      abilityScores:    template.abilityScores,
      armorClass:       template.armorClass,
      proficiencyBonus: Math.ceil((template.challengeRating || 0.25) / 4) + 1,
      actions:          template.actions ?? [],
      traits:           template.traits ?? [],
      position:         template.position ?? { q: 6, r: 3 },
      conditions:       [],
      damageImmunities:  template.damageImmunities  ?? [],
      damageResistances: template.damageResistances ?? [],
      xp:               template.experiencePoints ?? 0,
      lootTable:        template.lootTable ?? [],
      isAlive:          true,
    })
  }

  return combatants
}

// ── Roll initiative for all combatants ───────────────────────────────────────
function rollInitiativeOrder(combatants) {
  return combatants
    .map(c => ({
      id:       c.id,
      type:     c.type,
      name:     c.name,
      ...mechanics.rollInitiative(c.abilityScores.dexterity),
    }))
    .sort((a, b) => {
      if (b.total !== a.total) return b.total - a.total
      // Tiebreak: dexterity score
      return 0
    })
}

// ── Pick best attack action for a combatant ───────────────────────────────────
function getBestAction(attacker) {
  const melee = (attacker.actions ?? []).find(a => a.type === 'meleeWeaponAttack')
  const ranged = (attacker.actions ?? []).find(a => a.type === 'rangedWeaponAttack')
  return melee ?? ranged ?? null
}

// ── Pick a living target for a creature ───────────────────────────────────────
function pickTarget(attacker, combatants) {
  const enemies = combatants.filter(c => c.isAlive && c.type !== attacker.type)
  if (enemies.length === 0) return null
  // Creatures target lowest HP (aggressive tactic); characters target a random enemy
  if (attacker.type === 'creature') {
    return enemies.reduce((a, b) => (a.hp.current < b.hp.current ? a : b))
  }
  return enemies[Math.floor(Math.random() * enemies.length)]
}

// ── Resolve a single attack ────────────────────────────────────────────────────
function resolveAttack(attacker, target, action) {
  const attackBonus = (action.attackBonus ?? 0)
  const attackResult = mechanics.rollAttack(attackBonus, target.armorClass)

  let damage = 0
  let damageType = 'bludgeoning'
  const damageRolls = []

  if (attackResult.hit && action.damage?.length > 0) {
    for (const dmgDef of action.damage) {
      const { count, sides } = mechanics.parseDiceNotation(dmgDef.dice ?? '1d4')
      const dmgResult = mechanics.rollDamage(
        `${count}d${sides}`,
        dmgDef.modifier ?? 0,
        attackResult.critical,
      )
      damageRolls.push(dmgResult)
      damage += dmgResult.total
      damageType = dmgDef.type ?? damageType
    }
    // Apply damage and mutate target HP
    const result = mechanics.applyDamage(target, damage, damageType)
    target.hp.current    = result.newHp
    target.hp.temporary  = result.newTemp
    if (target.hp.current === 0) target.isAlive = false
  }

  return {
    attackBonus,
    roll:       attackResult.roll,
    total:      attackResult.total,
    hit:        attackResult.hit,
    critical:   attackResult.critical,
    fumble:     attackResult.fumble,
    damage,
    damageType,
    damageRolls,
  }
}

// ── Build a human-readable log entry description ──────────────────────────────
function describeAction(attacker, target, action, result) {
  const verb = action?.type === 'rangedWeaponAttack' ? 'shoots' : 'attacks'
  if (result.critical)    return `CRITICAL! ${attacker.name} ${verb} ${target?.name ?? '?'} with ${action?.name ?? 'attack'} — hits for ${result.damage} ${result.damageType} damage!`
  if (result.fumble)      return `${attacker.name} fumbles the attack on ${target?.name ?? '?'}!`
  if (!result.hit)        return `${attacker.name} ${verb} ${target?.name ?? '?'} but misses (rolled ${result.total} vs AC ${target?.armorClass}).`
  if (target && !target.isAlive) return `${attacker.name} delivers a killing blow to ${target.name} for ${result.damage} ${result.damageType} damage!`
  return `${attacker.name} hits ${target?.name ?? '?'} for ${result.damage} ${result.damageType} damage!`
}

// ── Main encounter runner ─────────────────────────────────────────────────────

/**
 * Run a complete encounter simulation.
 *
 * @param {object[]} party    - Array of character objects
 * @param {string[]|object[]} enemies - Creature IDs or stat-block objects
 * @param {object}  options
 * @param {Function} [options.onEvent]  - Callback(event) for real-time streaming
 * @param {string}  [options.partyId]
 * @returns {Promise<object>} EncounterResult
 */
async function runEncounter(party, enemies, options = {}) {
  const { onEvent, partyId = uuidv4() } = options
  const sessionId = uuidv4()

  const emit = (type, payload) => {
    if (typeof onEvent === 'function') onEvent({ type, payload })
  }

  const combatants   = buildCombatants(party, enemies)
  const initiative   = rollInitiativeOrder(combatants)
  const combatLog    = []
  const positionSnapshots = []

  emit('ENCOUNTER_START', {
    sessionId,
    partyId,
    initiative: initiative.map(i => ({ id: i.id, name: i.name, total: i.total })),
  })

  let round   = 0
  let outcome = 'timeout'

  // ── Round loop ──────────────────────────────────────────────────────────────
  while (round < MAX_ROUNDS) {
    round++
    emit('ROUND_START', { round })

    // Capture position snapshot at start of each round
    positionSnapshots.push({
      round,
      positions: combatants
        .filter(c => c.isAlive)
        .map(c => ({ id: c.id, type: c.type, name: c.name, ...c.position, color: c.type === 'character' ? '#4fc3f7' : '#e57373', label: c.name.charAt(0).toUpperCase() })),
    })

    let turnIndex = 0
    for (const initEntry of initiative) {
      const actor = combatants.find(c => c.id === initEntry.id)
      if (!actor || !actor.isAlive) continue

      // Check win/loss after each turn
      const aliveCharacters = combatants.filter(c => c.type === 'character' && c.isAlive)
      const aliveEnemies    = combatants.filter(c => c.type === 'creature'  && c.isAlive)

      if (aliveCharacters.length === 0) { outcome = 'tpk'; break }
      if (aliveEnemies.length    === 0) { outcome = 'victory'; break }

      emit('TURN_START', { round, actorId: actor.id, actorName: actor.name })

      let actionResult = null

      if (actor.type === 'creature') {
        // AI tactic selection
        const tactic = chooseTactic(actor, combatants)
        const target = tactic.targetId
          ? combatants.find(c => c.id === tactic.targetId)
          : pickTarget(actor, combatants)

        if (tactic.action === 'attack' && target) {
          const action = getBestAction(actor)
          if (action) {
            actionResult = resolveAttack(actor, target, action)
            const logEntry = {
              round,
              turn: turnIndex,
              actorId:   actor.id,
              actorName: actor.name,
              action:    'attack',
              targetId:  target.id,
              targetName: target.name,
              ...actionResult,
              description: describeAction(actor, target, action, actionResult),
            }
            combatLog.push(logEntry)
            emit('COMBAT_EVENT', logEntry)
          }
        } else if (tactic.action === 'move') {
          // Update position
          actor.position = tactic.newPosition ?? actor.position
          emit('MAP_UPDATE', { actorId: actor.id, position: actor.position })
        }
      } else {
        // Player character — in a real server these actions come from WebSocket
        // For simulation we auto-attack the nearest enemy
        const target = pickTarget(actor, combatants)
        if (target) {
          const action = getBestAction(actor)
          if (action) {
            actionResult = resolveAttack(actor, target, action)
            const logEntry = {
              round,
              turn: turnIndex,
              actorId:   actor.id,
              actorName: actor.name,
              action:    'attack',
              targetId:  target.id,
              targetName: target.name,
              ...actionResult,
              description: describeAction(actor, target, action, actionResult),
            }
            combatLog.push(logEntry)
            emit('COMBAT_EVENT', logEntry)
          }
        }
      }

      turnIndex++
    }

    // End-of-round win/loss check
    const aliveChars    = combatants.filter(c => c.type === 'character' && c.isAlive)
    const aliveCreatures = combatants.filter(c => c.type === 'creature'  && c.isAlive)
    if (aliveChars.length === 0)    { outcome = 'tpk';     break }
    if (aliveCreatures.length === 0) { outcome = 'victory'; break }
  }

  // ── Compute rewards ──────────────────────────────────────────────────────────
  const defeatedEnemies = combatants.filter(c => c.type === 'creature' && !c.isAlive)
  const xpEarned = defeatedEnemies.reduce((sum, c) => sum + (c.xp ?? 0), 0)

  const lootDropped = []
  for (const enemy of defeatedEnemies) {
    for (const lootEntry of (enemy.lootTable ?? [])) {
      if (Math.random() <= (lootEntry.chance ?? 0)) {
        lootDropped.push({
          source:   enemy.name,
          itemId:   lootEntry.itemId ?? null,
          currency: lootEntry.currency ?? null,
          amount:   lootEntry.amount ?? 1,
        })
      }
    }
  }

  const result = {
    sessionId,
    partyId,
    outcome,
    rounds: round,
    combatLog,
    positionSnapshots,
    xpEarned,
    lootDropped,
    survivingCharacters: combatants.filter(c => c.type === 'character' && c.isAlive).map(c => ({ id: c.id, name: c.name, hp: c.hp })),
    defeatedEnemies: defeatedEnemies.map(c => ({ id: c.id, name: c.name })),
  }

  emit('ENCOUNTER_END', { outcome, xpEarned, lootDropped, rounds: round })

  return result
}

module.exports = { runEncounter, buildCombatants, rollInitiativeOrder, resolveAttack }
