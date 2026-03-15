/**
 * CharacterResponseService — Orchestrates NPC character responses.
 *
 * Responsibilities:
 *   1. Accept a CharacterContextPackage
 *   2. Build system + user prompts
 *   3. Call LLMProvider.complete() with retry/timeout budget
 *   4. On LLM failure → use pre-written fallback lines from personality record
 *   5. Track avoidRepetition per-session per-NPC
 *   6. Return a ResponseResult with text + metadata
 *
 * This is a pure service — no Express, no Mongoose, no direct DB calls.
 * DB interaction lives in the route layer that calls this service.
 */

'use strict'

const {
  buildSystemPrompt,
  buildUserPrompt,
  buildWakeUpPrompt,
  getTokenModulation,
  TRIGGER_EVENT,
  NPC_TYPE,
} = require('../llm/CharacterContextPackage')

const { getProvider, setProvider } = require('../llm/LLMProvider')
const { CANNED_RESPONSES }         = require('../llm/MockLLMProvider')
const EncounterMemory              = require('./EncounterMemoryService')

// ── Per-session repetition tracking ──────────────────────────────────────────
// Key: `${sessionId}:${npcId}`, Value: string[]

const _recentResponseCache = new Map()
const MAX_STORED_RESPONSES = 5

function _recentKey(sessionId, npcId) {
  return `${sessionId || 'global'}:${npcId}`
}

function _getRecent(sessionId, npcId) {
  return _recentResponseCache.get(_recentKey(sessionId, npcId)) || []
}

function _recordResponse(sessionId, npcId, text) {
  const key   = _recentKey(sessionId, npcId)
  const prior = _recentResponseCache.get(key) || []
  const next  = [...prior, text].slice(-MAX_STORED_RESPONSES)
  _recentResponseCache.set(key, next)
}

/** Clear cache for a session (call when session ends) */
function clearSessionCache(sessionId) {
  for (const key of _recentResponseCache.keys()) {
    if (key.startsWith(`${sessionId}:`)) {
      _recentResponseCache.delete(key)
    }
  }
  // Also clear encounter memory for this session
  EncounterMemory.clearSessionMemory(sessionId)
}

// ── Fallback line selector ────────────────────────────────────────────────────

/**
 * Get a fallback line from the personality's stored fallbackLines map,
 * or from the global CANNED_RESPONSES table if the personality doesn't have one.
 *
 * @param {Object} personality - CharacterPersonality doc or plain object
 * @param {string} triggerEvent
 * @param {string[]} avoidList
 * @returns {string}
 */
function selectFallbackLine(personality, triggerEvent, avoidList = []) {
  // 1. Try personality record's custom fallbackLines first
  let pool = null
  if (personality && personality.fallbackLines) {
    const stored = personality.fallbackLines instanceof Map
      ? personality.fallbackLines.get(triggerEvent)
      : personality.fallbackLines[triggerEvent]
    if (Array.isArray(stored) && stored.length > 0) {
      pool = stored
    }
  }

  // 2. Fall back to global CANNED_RESPONSES
  if (!pool) {
    const eventTable = CANNED_RESPONSES[triggerEvent] || {}
    const npcType    = personality?.npcType || NPC_TYPE.ENEMY
    pool = eventTable[npcType] || eventTable.default || ['...']
  }

  // 3. Filter out recently used lines if possible
  const fresh = pool.filter(l => !avoidList.includes(l))
  const candidates = fresh.length > 0 ? fresh : pool

  // 4. Pick deterministically based on current pool length
  return candidates[_recentResponseCache.size % candidates.length]
}

// ── Main service function ─────────────────────────────────────────────────────

/**
 * @typedef {Object} ResponseResult
 * @property {string}  text          - The generated response line
 * @property {string}  source        - 'llm' | 'fallback'
 * @property {string}  npcId         - ID of the NPC that responded
 * @property {string}  triggerEvent  - The event that triggered this response
 * @property {string}  format        - The response format used
 * @property {number}  latencyMs     - Total time to produce the response
 */

/**
 * Generate a character response for an NPC given a context package.
 *
 * @param {Object} contextPackage - Result of buildContextPackage() or buildFromPersonality()
 * @param {Object} [options]
 * @param {string} [options.sessionId]   - For repetition tracking cache key
 * @param {Object} [options.personality] - Personality record for fallback lines
 * @returns {Promise<ResponseResult>}
 */
async function generateResponse(contextPackage, options = {}) {
  const { sessionId, personality } = options
  const { character, situationalContext, responseConstraints } = contextPackage
  const start = Date.now()

  // Auto-populate avoidRepetition from session cache if not already set
  const cachedRecent  = _getRecent(sessionId, character.id)
  const avoidList     = responseConstraints.avoidRepetition.length > 0
    ? responseConstraints.avoidRepetition
    : cachedRecent

  // ── Encounter memory: read phase ──────────────────────────────────────────
  // Resolve defaultTrust from consciousnessContext if available
  const cc = character.consciousnessContext
  const defaultTrust = cc && cc.conversationPersona
    ? (typeof cc.conversationPersona.defaultTrust === 'number' ? cc.conversationPersona.defaultTrust : 0.3)
    : 0.3

  // Apply trigger effects to memory (trust/disposition) BEFORE building prompts
  if (sessionId) {
    EncounterMemory.getMemory(sessionId, character.id, { defaultTrust })
    EncounterMemory.applyTriggerEffects(
      sessionId, character.id,
      situationalContext.triggerEvent,
      options.entityId || null, // who triggered the event (e.g., a player)
    )
  }

  // Retrieve memory summary for prompt injection
  const memorySummary = sessionId
    ? EncounterMemory.buildMemorySummary(sessionId, character.id)
    : null

  // Build prompts
  const systemPrompt = buildSystemPrompt(contextPackage)

  // Inject wake-up prompt for first response in a scene (no prior responses cached)
  const isFirstResponse = cachedRecent.length === 0
  const wakeUp = isFirstResponse ? buildWakeUpPrompt(contextPackage) : null

  const userPrompt   = buildUserPrompt({
    ...contextPackage,
    memorySummary,
    responseConstraints: { ...responseConstraints, avoidRepetition: avoidList },
  })

  // Combine wake-up + user prompt when applicable
  const finalUserPrompt = wakeUp ? `${wakeUp}\n\n${userPrompt}` : userPrompt

  // Apply token modulation for high-drama triggers
  const tokenMultiplier = getTokenModulation(situationalContext.triggerEvent)
  const effectiveMaxTokens = Math.round(responseConstraints.maxTokens * tokenMultiplier)

  let text   = null
  let source = 'llm'

  // ── Attempt LLM call ───────────────────────────────────────────────────────
  try {
    const provider = await getProvider()

    if (!provider.isAvailable()) {
      throw new Error('LLM provider not available')
    }

    text = await provider.complete(systemPrompt, finalUserPrompt, {
      maxTokens:    effectiveMaxTokens,
      triggerEvent: situationalContext.triggerEvent,
      npcType:      character.npcType,
      chatHistory:  options.chatHistory || [],
    })

    // Sanitize: ensure it's a string and not empty
    if (typeof text !== 'string' || text.trim() === '') {
      throw new Error('LLM returned empty response')
    }

    text = text.trim()
  } catch (err) {
    // ── Fallback to pre-written lines ────────────────────────────────────────
    console.warn(`[CharacterResponseService] LLM failed for ${character.name}: ${err.message} — using fallback`)
    source = 'fallback'
    text   = selectFallbackLine(personality, situationalContext.triggerEvent, avoidList)
  }

  // Record this response for future repetition avoidance
  if (sessionId) {
    _recordResponse(sessionId, character.id, text)

    // ── Encounter memory: write phase ─────────────────────────────────────
    // Record interaction count, emotional state, and entity interaction
    EncounterMemory.recordInteraction(sessionId, character.id)
    EncounterMemory.recordEmotion(sessionId, character.id, situationalContext.emotionalState)

    if (options.entityId) {
      EncounterMemory.recordEntityInteraction(sessionId, character.id, options.entityId)
    }
  }

  return {
    text,
    source,
    npcId:        character.id,
    npcName:      character.name,
    triggerEvent: situationalContext.triggerEvent,
    format:       responseConstraints.format,
    latencyMs:    Date.now() - start,
  }
}

// ── Exports ───────────────────────────────────────────────────────────────────

module.exports = {
  generateResponse,
  selectFallbackLine,
  clearSessionCache,

  // For testing
  _getRecent,
  _recordResponse,
  _clearAllCaches: () => { _recentResponseCache.clear(); EncounterMemory.clearAllMemory() },

  // Allow injecting provider in tests
  _setProvider: setProvider,
}
