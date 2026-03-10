/**
 * AI DM Tactics Module
 *
 * Determines what action a creature takes on its turn.
 * In full production this module calls the OpenAI API for complex encounters.
 * For development / offline use it applies rule-based heuristics.
 *
 * Exports:
 *   chooseTactic(creature, allCombatants, options) → TacticDecision
 *
 * TacticDecision:
 *   {
 *     action:      'attack' | 'move' | 'flee' | 'spell' | 'dodge' | 'help',
 *     targetId:    string | null,
 *     newPosition: { q, r } | null,
 *     reason:      string        // DM-facing explanation
 *   }
 */

'use strict'

// ── Geometry helpers ──────────────────────────────────────────────────────────

/** Axial (hex grid) distance between two positions. */
function hexDistance(a, b) {
  return Math.max(
    Math.abs((a.q ?? 0) - (b.q ?? 0)),
    Math.abs((a.r ?? 0) - (b.r ?? 0)),
    Math.abs((-(a.q ?? 0) - (a.r ?? 0)) - (-(b.q ?? 0) - (b.r ?? 0))),
  )
}

/** Return a position one hex closer to the target. Simple greedy step. */
function stepToward(from, to) {
  const dq = Math.sign((to.q ?? 0) - (from.q ?? 0))
  const dr = Math.sign((to.r ?? 0) - (from.r ?? 0))
  return { q: (from.q ?? 0) + dq, r: (from.r ?? 0) + dr }
}

/** Return a position one hex further from the threat. */
function stepAway(from, threat) {
  const dq = Math.sign((from.q ?? 0) - (threat.q ?? 0))
  const dr = Math.sign((from.r ?? 0) - (threat.r ?? 0))
  return { q: (from.q ?? 0) + dq, r: (from.r ?? 0) + dr }
}

// ── Target selection heuristics ───────────────────────────────────────────────

/** Get all living enemies of the given creature from the combatants array. */
function getEnemies(creature, combatants) {
  return combatants.filter(c => c.isAlive && c.type !== creature.type)
}

/** Get all living allies of the given creature. */
function getAllies(creature, combatants) {
  return combatants.filter(c => c.isAlive && c.type === creature.type && c.id !== creature.id)
}

/**
 * Select the highest-priority target for an aggressive creature.
 * Priority: lowest HP → nearest → random
 */
function selectAggresiveTarget(creature, enemies) {
  if (enemies.length === 0) return null

  // First, find enemies in melee range (1 hex)
  const adjacent = enemies.filter(e => hexDistance(creature.position, e.position) <= 1)
  if (adjacent.length > 0) {
    // Attack the lowest-HP adjacent enemy
    return adjacent.reduce((a, b) => (a.hp.current < b.hp.current ? a : b))
  }

  // Otherwise target the nearest enemy
  return enemies.reduce((nearest, e) => {
    const dNearest = hexDistance(creature.position, nearest.position)
    const dE       = hexDistance(creature.position, e.position)
    return dE < dNearest ? e : nearest
  })
}

/**
 * Select the target for a defensive/support creature (protect allies).
 * Targets the enemy threatening the most-injured ally.
 */
function selectDefensiveTarget(creature, enemies, allies) {
  if (enemies.length === 0) return null
  // Find the most-injured ally
  const injuredAlly = allies.reduce((a, b) => {
    const aRatio = a.hp.current / a.hp.max
    const bRatio = b.hp.current / b.hp.max
    return aRatio < bRatio ? a : b
  }, { hp: { current: Infinity, max: 1 }, position: creature.position })

  // Prefer the enemy nearest to the injured ally
  return enemies.reduce((nearest, e) => {
    const dNearest = hexDistance(injuredAlly.position, nearest.position)
    const dE       = hexDistance(injuredAlly.position, e.position)
    return dE < dNearest ? e : nearest
  })
}

// ── Tactic profiles ───────────────────────────────────────────────────────────

const TACTIC_PROFILES = {
  aggressive: (creature, combatants) => {
    const enemies = getEnemies(creature, combatants)
    if (enemies.length === 0) return { action: 'dodge', targetId: null, newPosition: null, reason: 'No enemies visible.' }

    const hpRatio = creature.hp.current / creature.hp.max

    // Morale break: flee if below 25% HP and outnumbered
    if (hpRatio < 0.25 && enemies.length > getAllies(creature, combatants).length) {
      const retreatPos = stepAway(creature.position, enemies[0].position)
      return { action: 'flee', targetId: null, newPosition: retreatPos, reason: `${creature.name} is badly wounded and retreating!` }
    }

    const target = selectAggresiveTarget(creature, enemies)
    const dist   = hexDistance(creature.position, target.position)

    if (dist <= 1) {
      return { action: 'attack', targetId: target.id, newPosition: null, reason: `${creature.name} attacks the closest enemy (${target.name}).` }
    }

    // Move toward target
    const newPos = stepToward(creature.position, target.position)
    return { action: 'move', targetId: target.id, newPosition: newPos, reason: `${creature.name} moves toward ${target.name}.` }
  },

  defensive: (creature, combatants) => {
    const enemies = getEnemies(creature, combatants)
    const allies  = getAllies(creature, combatants)
    if (enemies.length === 0) return { action: 'help', targetId: null, newPosition: null, reason: 'No enemies — assisting allies.' }

    const hpRatio = creature.hp.current / creature.hp.max

    // Dodge if very low HP
    if (hpRatio < 0.15) {
      return { action: 'dodge', targetId: null, newPosition: null, reason: `${creature.name} takes the Dodge action to survive.` }
    }

    const target = selectDefensiveTarget(creature, enemies, allies)
    if (!target) return { action: 'dodge', targetId: null, newPosition: null, reason: 'Holding position.' }

    const dist = hexDistance(creature.position, target.position)
    if (dist <= 1) {
      return { action: 'attack', targetId: target.id, newPosition: null, reason: `${creature.name} defends an ally by attacking ${target.name}.` }
    }

    const newPos = stepToward(creature.position, target.position)
    return { action: 'move', targetId: target.id, newPosition: newPos, reason: `${creature.name} moves to intercept ${target.name}.` }
  },

  ranged: (creature, combatants) => {
    const enemies = getEnemies(creature, combatants)
    if (enemies.length === 0) return { action: 'dodge', targetId: null, newPosition: null, reason: 'No targets.' }

    // Ranged creatures prefer to stay at range 2-5 hexes
    const target  = enemies.reduce((a, b) => (a.hp.current < b.hp.current ? a : b))
    const dist    = hexDistance(creature.position, target.position)

    if (dist === 0 || dist === 1) {
      // Too close — disengage and back up
      const retreatPos = stepAway(creature.position, target.position)
      return { action: 'move', targetId: target.id, newPosition: retreatPos, reason: `${creature.name} backs away to use ranged attack.` }
    }

    // Attack at range
    return { action: 'attack', targetId: target.id, newPosition: null, reason: `${creature.name} attacks ${target.name} from range.` }
  },

  cowardly: (creature, combatants) => {
    const enemies  = getEnemies(creature, combatants)
    const hpRatio  = creature.hp.current / creature.hp.max

    if (hpRatio < 0.5 && enemies.length > 0) {
      const retreatPos = stepAway(creature.position, enemies[0].position)
      return { action: 'flee', targetId: null, newPosition: retreatPos, reason: `${creature.name} flees in terror!` }
    }

    if (enemies.length > 0) {
      const target = selectAggresiveTarget(creature, enemies)
      return { action: 'attack', targetId: target.id, newPosition: null, reason: `${creature.name} attacks nervously.` }
    }

    return { action: 'dodge', targetId: null, newPosition: null, reason: 'Cowering.' }
  },
}

// ── Creature profile assignment ───────────────────────────────────────────────

const CREATURE_PROFILES = {
  goblin:      'cowardly',
  goblin_boss: 'aggressive',
  bandit:      'aggressive',
  orc:         'aggressive',
  bugbear:     'aggressive',
  ogre:        'aggressive',
  skeleton:    'aggressive',
  zombie:      'aggressive',
  troll:       'aggressive',
  archer:      'ranged',
  mage:        'ranged',
  cultist:     'defensive',
}

// ── Main export ───────────────────────────────────────────────────────────────

/**
 * Choose the best tactic for a creature on its turn.
 *
 * @param {object}   creature    - The active combatant
 * @param {object[]} combatants  - All combatants (alive and dead)
 * @param {object}   [options]
 * @param {boolean}  [options.useAI=false] - Call AI API for decision (requires OPENAI_API_KEY)
 * @returns {{ action, targetId, newPosition, reason }}
 */
function chooseTactic(creature, combatants, options = {}) {
  const profileKey = CREATURE_PROFILES[creature.creatureId ?? creature.id] ?? 'aggressive'
  const profile    = TACTIC_PROFILES[profileKey] ?? TACTIC_PROFILES.aggressive

  try {
    return profile(creature, combatants)
  } catch (err) {
    console.error(`[Tactics] Error for ${creature.name}:`, err.message)
    // Fallback: basic attack
    const enemies = getEnemies(creature, combatants)
    const target  = enemies[0] ?? null
    return { action: target ? 'attack' : 'dodge', targetId: target?.id ?? null, newPosition: null, reason: 'Fallback tactic.' }
  }
}

/**
 * Assign a tactic profile to a creature by ID.
 * Useful for custom encounters.
 */
function setCreatureProfile(creatureId, profile) {
  if (!TACTIC_PROFILES[profile]) throw new Error(`Unknown profile: ${profile}`)
  CREATURE_PROFILES[creatureId] = profile
}

module.exports = { chooseTactic, setCreatureProfile, hexDistance, TACTIC_PROFILES, CREATURE_PROFILES }
