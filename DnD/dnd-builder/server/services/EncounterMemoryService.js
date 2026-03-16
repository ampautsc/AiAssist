/**
 * EncounterMemoryService — Per-NPC, per-session runtime memory.
 *
 * Tracks what has happened to an NPC during an encounter/session:
 *   - Entities they've interacted with
 *   - Trust levels toward specific entities (starting from consciousnessContext.defaultTrust)
 *   - Emotional arc across multiple responses
 *   - Secrets that have been hinted at or revealed
 *   - Significant moments (high-drama events the NPC would remember)
 *   - Disposition shift (cumulative mood change toward the party)
 *
 * This is a pure in-memory service — no database, no Express, no side effects.
 * State is held in a Map keyed by `${sessionId}:${npcId}`.
 * Sessions can be cleared individually or globally.
 *
 * Architecture note: This service is QUERIED by the prompt builder and
 * UPDATED by the response service after each interaction. It does not
 * call external systems.
 *
 * @module EncounterMemoryService
 */

'use strict'

const { TRIGGER_EVENT, EMOTIONAL_STATE } = require('../llm/CharacterContextPackage')

// ── Memory store ──────────────────────────────────────────────────────────────
// Key: `${sessionId}:${npcId}`, Value: EncounterMemory object

const _memoryStore = new Map()

/**
 * @typedef {Object} EncounterMemory
 * @property {string}   npcId
 * @property {string}   sessionId
 * @property {string[]} entitiesInteractedWith - Names/IDs of entities this NPC has interacted with
 * @property {Object.<string, number>} trustLevels - Entity ID → trust level (0.0-1.0)
 * @property {string[]} emotionalArc         - Sequence of emotional states this session
 * @property {string[]} secretsRevealed      - Secret strings that have been fully shared
 * @property {string[]} secretsHinted        - Secret strings that have been partially referenced
 * @property {string[]} significantMoments   - Human-readable descriptions of important events
 * @property {string}   currentMood          - Current inferred mood
 * @property {number}   dispositionShift     - Cumulative shift (-1.0 to +1.0) from default disposition
 * @property {number}   interactionCount     - Total number of response cycles in this session
 * @property {Object}   revealedInfo         - Progressive character info revealed to the player
 * @property {number}   createdAt            - Timestamp of first interaction
 * @property {number}   lastUpdatedAt        - Timestamp of most recent update
 */

// ── Key helpers ───────────────────────────────────────────────────────────────

function _memKey(sessionId, npcId) {
  return `${sessionId || 'global'}:${npcId}`
}

// ── Core API ──────────────────────────────────────────────────────────────────

/**
 * Get or create the encounter memory for an NPC in a session.
 *
 * @param {string} sessionId
 * @param {string} npcId
 * @param {Object} [options]
 * @param {number} [options.defaultTrust=0.3] - Starting trust from consciousnessContext
 * @returns {EncounterMemory}
 */
function getMemory(sessionId, npcId, options = {}) {
  const key = _memKey(sessionId, npcId)
  if (_memoryStore.has(key)) {
    return _memoryStore.get(key)
  }

  const defaultTrust = typeof options.defaultTrust === 'number' ? options.defaultTrust : 0.3
  const now = Date.now()

  const memory = {
    npcId,
    sessionId,
    entitiesInteractedWith: [],
    trustLevels: {},
    emotionalArc: [],
    secretsRevealed: [],
    secretsHinted: [],
    significantMoments: [],
    currentMood: 'neutral',
    dispositionShift: 0,
    interactionCount: 0,
    revealedInfo: {
      appearance: null,
      disposition: null,
      backstory: null,
      voice: null,
      motivations: null,
      fears: null,
      mannerisms: null,
      speechPatterns: null,
    },
    defaultTrust,
    createdAt: now,
    lastUpdatedAt: now,
  }

  _memoryStore.set(key, memory)
  return memory
}

/**
 * Check if memory exists for a specific NPC in a session without creating it.
 *
 * @param {string} sessionId
 * @param {string} npcId
 * @returns {boolean}
 */
function hasMemory(sessionId, npcId) {
  return _memoryStore.has(_memKey(sessionId, npcId))
}

// ── Trust management ──────────────────────────────────────────────────────────

/**
 * Get the NPC's current trust level toward a specific entity.
 * Returns the default trust if no specific trust has been set.
 *
 * @param {string} sessionId
 * @param {string} npcId
 * @param {string} entityId
 * @returns {number} Trust level 0.0-1.0
 */
function getTrust(sessionId, npcId, entityId) {
  const memory = getMemory(sessionId, npcId)
  if (entityId in memory.trustLevels) {
    return memory.trustLevels[entityId]
  }
  return memory.defaultTrust
}

/**
 * Adjust trust level toward a specific entity.
 * Trust is clamped to [0.0, 1.0].
 *
 * @param {string} sessionId
 * @param {string} npcId
 * @param {string} entityId
 * @param {number} delta - Positive = trust increase, negative = decrease
 * @returns {number} New trust level
 */
function adjustTrust(sessionId, npcId, entityId, delta) {
  const memory = getMemory(sessionId, npcId)
  const current = entityId in memory.trustLevels
    ? memory.trustLevels[entityId]
    : memory.defaultTrust

  const newTrust = Math.max(0, Math.min(1, current + delta))
  memory.trustLevels[entityId] = newTrust
  memory.lastUpdatedAt = Date.now()
  return newTrust
}

/**
 * Set trust to an absolute value (for testing or forced overrides).
 */
function setTrust(sessionId, npcId, entityId, value) {
  const memory = getMemory(sessionId, npcId)
  memory.trustLevels[entityId] = Math.max(0, Math.min(1, value))
  memory.lastUpdatedAt = Date.now()
}

// ── Emotional arc tracking ────────────────────────────────────────────────────

/**
 * Record an emotional state in the NPC's emotional arc for this session.
 * Also updates currentMood.
 *
 * @param {string} sessionId
 * @param {string} npcId
 * @param {string} emotionalState - EMOTIONAL_STATE value or free-form mood string
 */
function recordEmotion(sessionId, npcId, emotionalState) {
  const memory = getMemory(sessionId, npcId)
  memory.emotionalArc.push(emotionalState)
  memory.currentMood = emotionalState
  memory.lastUpdatedAt = Date.now()
}

/**
 * Get the last N emotional states from the arc.
 */
function getRecentEmotions(sessionId, npcId, n = 3) {
  const memory = getMemory(sessionId, npcId)
  return memory.emotionalArc.slice(-n)
}

// ── Significant moments ───────────────────────────────────────────────────────

/**
 * Record a significant moment — something the NPC would remember.
 *
 * @param {string} sessionId
 * @param {string} npcId
 * @param {string} description - Human-readable event description
 */
function recordSignificantMoment(sessionId, npcId, description) {
  const memory = getMemory(sessionId, npcId)
  memory.significantMoments.push(description)
  memory.lastUpdatedAt = Date.now()
}

// ── Secrets tracking ──────────────────────────────────────────────────────────

/**
 * Mark a secret as hinted (partially referenced but not fully revealed).
 */
function hintSecret(sessionId, npcId, secretKey) {
  const memory = getMemory(sessionId, npcId)
  if (!memory.secretsHinted.includes(secretKey)) {
    memory.secretsHinted.push(secretKey)
  }
  memory.lastUpdatedAt = Date.now()
}

/**
 * Mark a secret as fully revealed.
 * Also removes it from secretsHinted if present.
 */
function revealSecret(sessionId, npcId, secretKey) {
  const memory = getMemory(sessionId, npcId)
  if (!memory.secretsRevealed.includes(secretKey)) {
    memory.secretsRevealed.push(secretKey)
  }
  memory.secretsHinted = memory.secretsHinted.filter(s => s !== secretKey)
  memory.lastUpdatedAt = Date.now()
}

/**
 * Check if a specific secret has been revealed.
 */
function isSecretRevealed(sessionId, npcId, secretKey) {
  const memory = getMemory(sessionId, npcId)
  return memory.secretsRevealed.includes(secretKey)
}

/**
 * Check if a specific secret has been hinted.
 */
function isSecretHinted(sessionId, npcId, secretKey) {
  const memory = getMemory(sessionId, npcId)
  return memory.secretsHinted.includes(secretKey)
}

// ── Revealed info (progressive character discovery) ──────────────────────────

/** Valid fields for revealedInfo */
const REVEALED_FIELDS = [
  'appearance', 'disposition', 'backstory', 'voice',
  'motivations', 'fears', 'mannerisms', 'speechPatterns',
]

/**
 * Initialize revealedInfo with baseline data (e.g. appearance at session start).
 *
 * @param {string} sessionId
 * @param {string} npcId
 * @param {Object} initial - Object with field→value pairs to set
 */
function initRevealedInfo(sessionId, npcId, initial = {}) {
  const memory = getMemory(sessionId, npcId)
  for (const [field, value] of Object.entries(initial)) {
    if (REVEALED_FIELDS.includes(field) && value != null) {
      memory.revealedInfo[field] = value
    }
  }
  memory.lastUpdatedAt = Date.now()
}

/**
 * Reveal a specific piece of character info to the player.
 * For array fields (motivations, fears, mannerisms, speechPatterns),
 * values are merged into the existing array.
 *
 * @param {string} sessionId
 * @param {string} npcId
 * @param {string} field - One of REVEALED_FIELDS
 * @param {string|string[]} value - The revealed content
 */
function revealInfo(sessionId, npcId, field, value) {
  if (!REVEALED_FIELDS.includes(field)) return
  const memory = getMemory(sessionId, npcId)

  const arrayFields = ['motivations', 'fears', 'mannerisms', 'speechPatterns']
  if (arrayFields.includes(field)) {
    const incoming = Array.isArray(value) ? value : [value]
    const existing = memory.revealedInfo[field] || []
    const merged = [...existing]
    for (const item of incoming) {
      if (!merged.includes(item)) merged.push(item)
    }
    memory.revealedInfo[field] = merged
  } else {
    // String fields: append new info to existing content
    if (memory.revealedInfo[field] && value) {
      memory.revealedInfo[field] = `${memory.revealedInfo[field]} ${value}`
    } else {
      memory.revealedInfo[field] = value
    }
  }
  memory.lastUpdatedAt = Date.now()
}

/**
 * Get the current revealedInfo for an NPC.
 *
 * @param {string} sessionId
 * @param {string} npcId
 * @returns {Object} revealedInfo with only non-null fields
 */
function getRevealedInfo(sessionId, npcId) {
  const memory = getMemory(sessionId, npcId)
  return { ...memory.revealedInfo }
}

// ── Interaction tracking ──────────────────────────────────────────────────────

/**
 * Record an entity interaction (someone this NPC has talked to or fought).
 */
function recordEntityInteraction(sessionId, npcId, entityId) {
  const memory = getMemory(sessionId, npcId)
  if (!memory.entitiesInteractedWith.includes(entityId)) {
    memory.entitiesInteractedWith.push(entityId)
  }
  memory.lastUpdatedAt = Date.now()
}

/**
 * Increment the interaction counter and update timestamp.
 * Called after each response cycle.
 */
function recordInteraction(sessionId, npcId) {
  const memory = getMemory(sessionId, npcId)
  memory.interactionCount += 1
  memory.lastUpdatedAt = Date.now()
}

// ── Disposition shift ─────────────────────────────────────────────────────────

/**
 * Adjust the NPC's overall disposition toward the party.
 * Clamped to [-1.0, +1.0].
 *
 * @param {string} sessionId
 * @param {string} npcId
 * @param {number} delta - Positive = warmer, negative = colder
 * @returns {number} New disposition shift
 */
function adjustDisposition(sessionId, npcId, delta) {
  const memory = getMemory(sessionId, npcId)
  memory.dispositionShift = Math.max(-1, Math.min(1, memory.dispositionShift + delta))
  memory.lastUpdatedAt = Date.now()
  return memory.dispositionShift
}

// ── Trigger-based trust inference ─────────────────────────────────────────────

/**
 * Infer trust and disposition changes from a trigger event.
 * This centralizes the heuristics for how combat/social events
 * affect NPC trust and mood.
 *
 * @param {string} triggerEvent - TRIGGER_EVENT value
 * @param {string} entityId - Who triggered the event (e.g., player ID)
 * @param {Object} [context] - Additional context
 * @param {string} [context.npcType] - NPC_TYPE value
 * @returns {{ trustDelta: number, dispositionDelta: number, significantMoment: string|null }}
 */
function inferTrustChange(triggerEvent, entityId, context = {}) {
  switch (triggerEvent) {
    case TRIGGER_EVENT.PLAYER_ADDRESSED:
      // Being spoken to directly is mildly trust-positive
      return { trustDelta: 0.05, dispositionDelta: 0.02, significantMoment: null }

    case TRIGGER_EVENT.ALLY_DIED:
      // An ally dying is trust-negative toward whoever caused it
      return {
        trustDelta: -0.15,
        dispositionDelta: -0.2,
        significantMoment: `An ally fell in battle — ${entityId} was involved`,
      }

    case TRIGGER_EVENT.ATTACKED:
      // Being attacked — trust craters
      return {
        trustDelta: -0.25,
        dispositionDelta: -0.3,
        significantMoment: `${entityId} attacked me directly`,
      }

    case TRIGGER_EVENT.ENEMY_DIED:
      // A shared enemy dying is trust-positive
      return { trustDelta: 0.1, dispositionDelta: 0.1, significantMoment: null }

    case TRIGGER_EVENT.NEAR_DEATH:
      // Being brought near death is a significant traumatic moment
      return {
        trustDelta: -0.1,
        dispositionDelta: -0.15,
        significantMoment: 'I was brought to the edge of death',
      }

    case TRIGGER_EVENT.COMBAT_END:
      // Surviving combat together is trust-positive
      return { trustDelta: 0.1, dispositionDelta: 0.05, significantMoment: null }

    case TRIGGER_EVENT.DISCOVERY:
      // Sharing a discovery is trust-positive
      return { trustDelta: 0.1, dispositionDelta: 0.08, significantMoment: null }

    case TRIGGER_EVENT.COMBAT_START:
      // Combat beginning is neutral — too early to judge
      return { trustDelta: 0, dispositionDelta: 0, significantMoment: null }

    default:
      return { trustDelta: 0, dispositionDelta: 0, significantMoment: null }
  }
}

/**
 * Apply trust/disposition changes inferred from a trigger event.
 * Convenience method that combines inferTrustChange + adjustTrust + adjustDisposition.
 *
 * @param {string} sessionId
 * @param {string} npcId
 * @param {string} triggerEvent
 * @param {string} entityId
 * @param {Object} [context]
 * @returns {{ trustDelta: number, dispositionDelta: number, significantMoment: string|null }}
 */
function applyTriggerEffects(sessionId, npcId, triggerEvent, entityId, context = {}) {
  const effects = inferTrustChange(triggerEvent, entityId, context)

  if (entityId && effects.trustDelta !== 0) {
    adjustTrust(sessionId, npcId, entityId, effects.trustDelta)
  }
  if (effects.dispositionDelta !== 0) {
    adjustDisposition(sessionId, npcId, effects.dispositionDelta)
  }
  if (effects.significantMoment) {
    recordSignificantMoment(sessionId, npcId, effects.significantMoment)
  }

  return effects
}

// ── Memory → prompt helper ────────────────────────────────────────────────────

/**
 * Build a memory summary suitable for injection into the user prompt.
 * Returns null if there's no memory or no meaningful content.
 *
 * @param {string} sessionId
 * @param {string} npcId
 * @returns {string|null}
 */
function buildMemorySummary(sessionId, npcId) {
  if (!hasMemory(sessionId, npcId)) return null

  const memory = getMemory(sessionId, npcId)
  if (memory.interactionCount === 0) return null

  const lines = []

  // Emotional arc
  if (memory.emotionalArc.length > 1) {
    const recent = memory.emotionalArc.slice(-4)
    lines.push(`Your emotional journey this encounter: ${recent.join(' → ')}.`)
  }

  // Current mood vs disposition
  if (memory.currentMood && memory.currentMood !== 'neutral') {
    const dispWord = memory.dispositionShift > 0.1 ? 'warming to'
                   : memory.dispositionShift < -0.1 ? 'cooling toward'
                   : 'uncertain about'
    lines.push(`Your current mood is ${memory.currentMood}. You are ${dispWord} those around you.`)
  }

  // Trust toward specific entities
  const trustEntries = Object.entries(memory.trustLevels)
  if (trustEntries.length > 0) {
    const trustDescs = trustEntries.map(([entity, level]) => {
      const desc = level >= 0.7 ? 'trust significantly'
                 : level >= 0.5 ? 'are beginning to trust'
                 : level >= 0.3 ? 'are cautious about'
                 : level >= 0.15 ? 'distrust'
                 :                 'deeply distrust'
      return `You ${desc} ${entity} (trust: ${level.toFixed(2)})`
    })
    lines.push(trustDescs.join('. ') + '.')
  }

  // Significant moments
  if (memory.significantMoments.length > 0) {
    const recent = memory.significantMoments.slice(-3)
    lines.push(`Key moments you remember: ${recent.join('; ')}.`)
  }

  // Secrets state
  if (memory.secretsHinted.length > 0) {
    lines.push(`You have hinted at secrets about: ${memory.secretsHinted.join(', ')}.`)
  }
  if (memory.secretsRevealed.length > 0) {
    lines.push(`You have already revealed: ${memory.secretsRevealed.join(', ')} — do not repeat these revelations.`)
  }

  // Interaction count context
  if (memory.interactionCount >= 3) {
    lines.push(`This is your ${memory.interactionCount + 1}th exchange in this encounter. You have a history with these people now.`)
  }

  if (lines.length === 0) return null
  return lines.join('\n')
}

// ── Session cleanup ───────────────────────────────────────────────────────────

/**
 * Clear all memories for a specific session.
 */
function clearSessionMemory(sessionId) {
  for (const key of _memoryStore.keys()) {
    if (key.startsWith(`${sessionId}:`)) {
      _memoryStore.delete(key)
    }
  }
}

/**
 * Clear all memories (for testing).
 */
function clearAllMemory() {
  _memoryStore.clear()
}

/**
 * Get a snapshot of all memory keys (for debugging/testing).
 */
function getAllMemoryKeys() {
  return [..._memoryStore.keys()]
}

// ── Exports ───────────────────────────────────────────────────────────────────

module.exports = {
  // Core memory
  getMemory,
  hasMemory,

  // Trust
  getTrust,
  adjustTrust,
  setTrust,

  // Emotions
  recordEmotion,
  getRecentEmotions,

  // Significant moments
  recordSignificantMoment,

  // Secrets
  hintSecret,
  revealSecret,
  isSecretRevealed,
  isSecretHinted,

  // Revealed info (progressive discovery)
  initRevealedInfo,
  revealInfo,
  getRevealedInfo,
  REVEALED_FIELDS,

  // Interaction tracking
  recordEntityInteraction,
  recordInteraction,

  // Disposition
  adjustDisposition,

  // Trigger inference
  inferTrustChange,
  applyTriggerEffects,

  // Prompt integration
  buildMemorySummary,

  // Cleanup
  clearSessionMemory,
  clearAllMemory,
  getAllMemoryKeys,
}
