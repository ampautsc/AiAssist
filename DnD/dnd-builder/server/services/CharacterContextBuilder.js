/**
 * CharacterContextBuilder — Assembles a CharacterContextPackage from available data.
 *
 * Pulls together:
 *   - Static personality from CharacterPersonality record (DB or plain object)
 *   - Live combat state from CombatSessionManager (if sessionId provided)
 *   - Caller-supplied trigger and emotional context
 *
 * Returns a validated CharacterContextPackage ready for CharacterResponseService.
 *
 * This is the bridge between the game engine's runtime state and the LLM input format.
 */

'use strict'

const {
  buildContextPackage,
  TRIGGER_EVENT,
  EMOTIONAL_STATE,
  NPC_TYPE,
  RESPONSE_FORMAT,
} = require('../llm/CharacterContextPackage')

// Lazy-loaded to avoid circular require with CombatSessionManager -> CombatNarratorService -> Builder
let _manager = null
function getManager() {
  if (!_manager) _manager = require('../combat/CombatSessionManager')
  return _manager
}

// ── HP to emotional state inference ──────────────────────────────────────────

/**
 * Infer reasonable emotional state from HP percentage and triggerEvent.
 * Caller can always override with an explicit emotionalState.
 *
 * @param {number} hpPercent
 * @param {string} triggerEvent
 * @param {string} npcType
 * @returns {string} EMOTIONAL_STATE value
 */
function inferEmotionalState(hpPercent, triggerEvent, npcType) {
  if (hpPercent <= 15) return EMOTIONAL_STATE.DESPERATE
  if (hpPercent <= 30) {
    if (npcType === NPC_TYPE.ENEMY) return EMOTIONAL_STATE.ENRAGED
    return EMOTIONAL_STATE.FRIGHTENED
  }

  switch (triggerEvent) {
    case TRIGGER_EVENT.ALLY_DIED:
      return npcType === NPC_TYPE.ENEMY ? EMOTIONAL_STATE.ENRAGED : EMOTIONAL_STATE.GRIEVING
    case TRIGGER_EVENT.ENEMY_DIED:
      return npcType === NPC_TYPE.FRIENDLY ? EMOTIONAL_STATE.TRIUMPHANT : EMOTIONAL_STATE.CALM
    case TRIGGER_EVENT.NEAR_DEATH:
      return EMOTIONAL_STATE.DESPERATE
    case TRIGGER_EVENT.ATTACKED:
      return npcType === NPC_TYPE.ENEMY ? EMOTIONAL_STATE.ENRAGED : EMOTIONAL_STATE.FRIGHTENED
    case TRIGGER_EVENT.SPOTTED_ENEMY:
      return npcType === NPC_TYPE.NEUTRAL ? EMOTIONAL_STATE.SUSPICIOUS : EMOTIONAL_STATE.CONFIDENT
    case TRIGGER_EVENT.COMBAT_START:
      return npcType === NPC_TYPE.FRIENDLY ? EMOTIONAL_STATE.CONFIDENT : EMOTIONAL_STATE.ENRAGED
    default:
      return EMOTIONAL_STATE.CALM
  }
}

// ── HP percent to status description ─────────────────────────────────────────

function hpStatus(currentHP, maxHP) {
  if (!maxHP || maxHP === 0) return 'unknown'
  const pct = currentHP / maxHP
  if (pct >= 0.75) return 'healthy'
  if (pct >= 0.50) return 'wounded'
  if (pct >= 0.25) return 'bloody'
  if (pct >  0.00) return 'near-death'
  return 'down'
}

// ── Distance in feet from grid positions ─────────────────────────────────────

function gridDistance(pos1, pos2) {
  if (!pos1 || !pos2) return null
  // Simple Chebyshev-manhattan hybrid — close enough for flavor text
  const dx = Math.abs((pos1.x ?? 0) - (pos2.x ?? 0))
  const dy = Math.abs((pos1.y ?? 0) - (pos2.y ?? 0))
  return (Math.max(dx, dy)) * 5  // 5ft per grid square
}

// ── Recent events from session action history ─────────────────────────────────

/**
 * Extract the last N meaningful event strings from session action history.
 * @param {Array} actionHistory - from CombatSession
 * @param {number} n
 * @returns {string[]}
 */
function extractRecentEvents(actionHistory, n = 5) {
  if (!Array.isArray(actionHistory) || actionHistory.length === 0) return []

  return actionHistory
    .slice(-n)
    .map(entry => {
      if (entry.result && entry.result.description) return entry.result.description
      if (entry.result && entry.result.message)     return entry.result.message
      if (typeof entry.choice === 'object' && entry.choice.optionId) {
        return `${entry.actorName || 'Someone'} used ${entry.choice.optionId}`
      }
      return null
    })
    .filter(Boolean)
}

// ── Main builder ──────────────────────────────────────────────────────────────

/**
 * Build a CharacterContextPackage for a given NPC.
 *
 * @param {Object} params
 * @param {Object} params.personality  - CharacterPersonality record (DB doc or plain object)
 * @param {string} params.triggerEvent - TRIGGER_EVENT value
 * @param {string|null} [params.sessionId]    - CombatSessionManager session ID (optional)
 * @param {string|null} [params.combatantId]  - ID of this NPC in the session (optional)
 * @param {string|null} [params.emotionalState]  - Override auto-inferred emotional state
 * @param {string|null} [params.worldLocation]   - e.g. 'dark dungeon'
 * @param {string|null} [params.worldTimeOfDay]  - e.g. 'midnight'
 * @param {string|null} [params.worldTone]       - e.g. 'tense'
 * @param {string[]}    [params.avoidRepetition] - Recent responses to avoid repeating
 * @param {string}      [params.format]          - RESPONSE_FORMAT value
 * @param {number}      [params.maxTokens]       - Token limit for response
 * @returns {Object} Validated CharacterContextPackage
 */
function buildFromPersonality(params) {
  const {
    personality,
    triggerEvent,
    sessionId    = null,
    combatantId  = null,
    worldLocation  = 'unknown',
    worldTimeOfDay = 'unknown',
    worldTone      = 'tense',
    avoidRepetition = [],
    format    = RESPONSE_FORMAT.SPOKEN,
    maxTokens = 60,
  } = params

  if (!personality) throw new Error('CharacterContextBuilder: personality is required')
  if (!triggerEvent) throw new Error('CharacterContextBuilder: triggerEvent is required')

  // ── Pull live data from session if available ───────────────────────────────

  let hpPercent     = 100
  let conditions    = []
  let recentActions = []
  let nearbyEntities = []
  let recentEvents   = []

  if (sessionId) {
    try {
      const manager = getManager()
      const sessionData = manager.getSession(sessionId)
      const { state }   = sessionData

      if (combatantId && state.combatants) {
        const self = state.combatants.find(c => c.id === combatantId)
        if (self) {
          hpPercent  = self.maxHP > 0 ? Math.round((self.currentHP / self.maxHP) * 100) : 0
          conditions = self.conditions || []
        }

        // Build nearby entities list (all other living combatants)
        nearbyEntities = state.combatants
          .filter(c => c.id !== combatantId && c.currentHP > 0)
          .map(c => ({
            name:     c.name,
            side:     c.side,
            hpStatus: hpStatus(c.currentHP, c.maxHP),
            distance: self ? gridDistance(self.position, c.position) : null,
          }))
      }

      // Extract recent log entries as event strings
      if (Array.isArray(state.log)) {
        recentEvents = state.log.slice(-5)
      }
    } catch (err) {
      // Session may not exist for out-of-combat responses — that's fine
      if (err.code !== 'SESSION_NOT_FOUND' && err.code !== 'SESSION_EXPIRED') {
        console.warn(`[CharacterContextBuilder] Session lookup failed: ${err.message}`)
      }
    }
  }

  // ── Infer emotional state ──────────────────────────────────────────────────

  const emotionalState = params.emotionalState
    || inferEmotionalState(hpPercent, triggerEvent, personality.npcType || NPC_TYPE.ENEMY)

  // ── Assemble the package ───────────────────────────────────────────────────

  const character = {
    id:      personality.templateKey || personality._id?.toString() || personality.name,
    name:    personality.name,
    race:    personality.race,
    npcType: personality.npcType || NPC_TYPE.ENEMY,
    personality: {
      voice:          personality.personality?.voice,
      alignment:      personality.personality?.alignment,
      disposition:    personality.personality?.disposition,
      backstory:      personality.personality?.backstory,
      speechPatterns: personality.personality?.speechPatterns,
      motivations:    personality.personality?.motivations,
      fears:          personality.personality?.fears,
      mannerisms:     personality.personality?.mannerisms,
    },
    knowledge:            personality.knowledge || {},
    relationships:        personality.relationships || {},
    consciousnessContext:  personality.consciousnessContext || null,
    stats: {
      intelligence: personality.stats?.intelligence ?? 10,
      wisdom:       personality.stats?.wisdom       ?? 10,
      charisma:     personality.stats?.charisma     ?? 10,
    },
  }

  const situationalContext = {
    triggerEvent,
    emotionalState,
    combatState: {
      hpPercent,
      conditions,
      recentActions,
    },
    worldContext: {
      location:  worldLocation,
      timeOfDay: worldTimeOfDay,
      tone:      worldTone,
    },
    nearbyEntities,
    recentEvents,
  }

  const responseConstraints = {
    maxTokens,
    format,
    avoidRepetition,
  }

  return buildContextPackage(character, situationalContext, responseConstraints)
}

// ── Exports ───────────────────────────────────────────────────────────────────

module.exports = {
  buildFromPersonality,
  inferEmotionalState,   // exported for testing
  extractRecentEvents,   // exported for testing
  hpStatus,              // exported for testing
}
