/**
 * EncounterSessionService — Manages conversational encounter sessions.
 *
 * An "encounter" is a non-combat social interaction between the player and
 * one or more NPCs. Think tavern conversations, interrogations, negotiations.
 *
 * Architecture:
 *   - In-memory session store (Map), same pattern as CombatSessionManager
 *   - Uses existing CharacterResponseService for NPC responses
 *   - Uses CharacterContextBuilder to bridge personality → context package
 *   - Conversation history is injected into prompts via pkg.conversationHistory
 *
 * No business logic in the route layer. This is the service layer.
 */

'use strict'

const path = require('path')
const fs   = require('fs')
const crypto = require('crypto')

const { buildFromPersonality } = require('./CharacterContextBuilder')
const { generateResponse }     = require('./CharacterResponseService')
const { TRIGGER_EVENT, EMOTIONAL_STATE } = require('../llm/CharacterContextPackage')
const EncounterMemory          = require('./EncounterMemoryService')
const InfoExtraction           = require('./InfoExtractionService')
const worldEngine              = require('./WorldEngine')

// ── Personality loading (same as characterResponses route) ────────────────────

const SEED_DIR = path.resolve(__dirname, '../data/npcPersonalities')

let CharacterPersonality = null
try {
  CharacterPersonality = require('../models/CharacterPersonality')
} catch (_) { /* mongoose not initialized */ }

/**
 * Check if mongoose is connected (readyState 1). Avoids hanging on
 * buffered operations when MongoDB isn't available.
 */
function _isDbConnected() {
  try {
    const mongoose = require('mongoose')
    return mongoose.connection.readyState === 1
  } catch (_) { return false }
}

async function loadPersonality(templateKey) {
  if (CharacterPersonality && _isDbConnected()) {
    try {
      const doc = await CharacterPersonality.findOne({ templateKey }).lean()
      if (doc) return doc
    } catch (_) { /* query failed */ }
  }
  const seedPath = path.join(SEED_DIR, `${templateKey}.json`)
  if (fs.existsSync(seedPath)) {
    return JSON.parse(fs.readFileSync(seedPath, 'utf8'))
  }
  return null
}

// ── Session store ─────────────────────────────────────────────────────────────

/** @type {Map<string, EncounterSession>} */
const _sessions = new Map()

/**
 * @typedef {Object} EncounterMessage
 * @property {string}  id         - Unique message ID
 * @property {string}  sender     - 'player' | templateKey
 * @property {string}  senderName - Display name
 * @property {string}  text       - Message content
 * @property {string}  source     - 'player' | 'llm' | 'fallback'
 * @property {number}  timestamp  - Unix ms
 */

/**
 * @typedef {Object} EncounterNpc
 * @property {string} templateKey
 * @property {string} name
 * @property {string} race
 * @property {string} npcType
 * @property {string} disposition
 * @property {string} voice
 */

/**
 * @typedef {Object} EncounterSession
 * @property {string}            id
 * @property {string}            playerName
 * @property {EncounterNpc[]}    npcs
 * @property {Object}            personalities  - { templateKey: personalityObj }
 * @property {EncounterMessage[]} messages
 * @property {Object}            worldContext    - { location, timeOfDay, tone }
 * @property {string}            status          - 'active' | 'ended'
 * @property {number}            createdAt
 */

const MAX_SESSIONS  = 50
const SESSION_TTL   = 2 * 60 * 60 * 1000  // 2 hours

// ── Housekeeping ──────────────────────────────────────────────────────────────

function _pruneExpired() {
  const now = Date.now()
  for (const [id, session] of _sessions) {
    if (now - session.createdAt > SESSION_TTL) {
      _sessions.delete(id)
    }
  }
}

function _generateId() {
  return `enc_${crypto.randomBytes(6).toString('hex')}`
}

function _messageId() {
  return `msg_${crypto.randomBytes(4).toString('hex')}`
}

/**
 * Enrich NPC list with current revealedInfo from encounter memory.
 * @param {string} sessionId
 * @param {EncounterNpc[]} npcs
 * @returns {EncounterNpc[]}
 */
function _enrichNpcsWithRevealedInfo(sessionId, npcs) {
  return npcs.map(npc => ({
    ...npc,
    revealedInfo: EncounterMemory.getRevealedInfo(sessionId, npc.templateKey),
  }))
}

// ── Public API ────────────────────────────────────────────────────────────────

/**
 * Create a new encounter session.
 *
 * @param {Object} params
 * @param {string[]} params.npcTemplateKeys - Template keys for NPCs in this encounter
 * @param {string}   [params.playerName]    - Display name for the player (default: 'Adventurer')
 * @param {Object}   [params.worldContext]  - { location, timeOfDay, tone }
 * @returns {Promise<{ encounterId, npcs, messages, worldContext, status }>}
 */
async function createEncounter(params) {
  const {
    npcTemplateKeys,
    playerName   = 'Adventurer',
    worldContext  = {},
  } = params

  if (!Array.isArray(npcTemplateKeys) || npcTemplateKeys.length === 0) {
    const err = new Error('npcTemplateKeys must be a non-empty array')
    err.code = 'INVALID_INPUT'
    throw err
  }

  _pruneExpired()

  if (_sessions.size >= MAX_SESSIONS) {
    const err = new Error('Maximum encounter sessions reached. End an existing encounter first.')
    err.code = 'MAX_SESSIONS'
    throw err
  }

  // Load all NPC personalities
  const personalities = {}
  const npcs = []

  for (const key of npcTemplateKeys) {
    const p = await loadPersonality(key)
    if (!p) {
      const err = new Error(`No personality found for templateKey: ${key}`)
      err.code = 'NPC_NOT_FOUND'
      throw err
    }
    personalities[key] = p
    npcs.push({
      templateKey: key,
      name:        p.name,
      race:        p.race,
      npcType:     p.npcType || 'neutral',
      disposition: p.personality?.disposition || 'neutral',
      voice:       p.personality?.voice || 'neutral',
    })
  }

  const engineTime = worldEngine.time

  const wc = {
    location:  worldContext.location  || 'a quiet room',
    timeOfDay: worldContext.timeOfDay || engineTime.timeOfDay,
    tone:      worldContext.tone      || 'conversational',
    // Enrich with world engine data when available
    worldTime: `${engineTime.formattedTime} on ${engineTime.dayName}, ${engineTime.season}`,
  }

  const id = _generateId()
  const session = {
    id,
    playerName,
    npcs,
    personalities,
    messages: [],
    worldContext: wc,
    status: 'active',
    createdAt: Date.now(),
  }

  _sessions.set(id, session)

  // Generate initial appearance for each NPC and seed revealedInfo.
  // We await this so the creation response already includes appearance descriptions.
  const appearancePromises = npcs.map(async (npc) => {
    try {
      const appearance = await InfoExtraction.generateAppearance(personalities[npc.templateKey])
      EncounterMemory.getMemory(id, npc.templateKey)
      EncounterMemory.initRevealedInfo(id, npc.templateKey, { appearance })
    } catch (err) {
      console.warn(`[EncounterSession] Appearance generation failed for ${npc.name}: ${err.message}`)
      // Ensure memory slot exists even on failure
      EncounterMemory.getMemory(id, npc.templateKey)
    }
  })
  await Promise.all(appearancePromises)

  return {
    encounterId: id,
    npcs:        _enrichNpcsWithRevealedInfo(id, npcs),
    messages:    session.messages,
    worldContext: session.worldContext,
    status:      session.status,
  }
}

/**
 * Get current encounter state.
 *
 * @param {string} encounterId
 * @returns {{ encounterId, npcs, messages, worldContext, status }}
 */
function getEncounter(encounterId) {
  const session = _sessions.get(encounterId)
  if (!session) {
    const err = new Error(`Encounter not found: ${encounterId}`)
    err.code = 'ENCOUNTER_NOT_FOUND'
    throw err
  }
  return {
    encounterId: session.id,
    npcs:        _enrichNpcsWithRevealedInfo(encounterId, session.npcs),
    messages:    session.messages,
    worldContext: session.worldContext,
    status:      session.status,
  }
}

/**
 * Send a player message and get NPC response(s).
 *
 * @param {string} encounterId
 * @param {Object} params
 * @param {string} params.text         - Player's message
 * @param {string[]} [params.addressedTo] - templateKeys of NPCs to address (default: all)
 * @returns {Promise<{ playerMessage: EncounterMessage, npcResponses: EncounterMessage[] }>}
 */
async function sendMessage(encounterId, params) {
  const session = _sessions.get(encounterId)
  if (!session) {
    const err = new Error(`Encounter not found: ${encounterId}`)
    err.code = 'ENCOUNTER_NOT_FOUND'
    throw err
  }
  if (session.status !== 'active') {
    const err = new Error('Encounter has ended')
    err.code = 'ENCOUNTER_ENDED'
    throw err
  }

  const { text, addressedTo } = params
  if (!text || typeof text !== 'string' || text.trim() === '') {
    const err = new Error('Message text is required')
    err.code = 'INVALID_INPUT'
    throw err
  }

  // Record player message
  const playerMessage = {
    id:         _messageId(),
    sender:     'player',
    senderName: session.playerName,
    text:       text.trim(),
    source:     'player',
    timestamp:  Date.now(),
  }
  session.messages.push(playerMessage)

  // Determine which NPCs to address
  const targetKeys = Array.isArray(addressedTo) && addressedTo.length > 0
    ? addressedTo.filter(k => session.personalities[k])
    : session.npcs.map(n => n.templateKey)

  // Build conversation history as structured chat turns for proper LLM multi-turn.
  // Passed via options.chatHistory so LlamaChatSession uses the real chat template
  // instead of embedding history as raw [CONVERSATION SO FAR] text (which confuses
  // small models like TinyLlama into continuing the script rather than responding).
  const chatHistory = session.messages.slice(-10).map(m => ({
    role:    m.sender === 'player' ? 'user' : 'assistant',
    content: m.text,
  }))

  // Build nearby entities (all NPCs + player)
  const nearbyEntities = session.npcs.map(n => ({
    name:     n.name,
    side:     n.npcType === 'friendly' ? 'ally' : n.npcType === 'enemy' ? 'enemy' : 'neutral',
    hpStatus: 'healthy',
    distance: 5,
  }))
  nearbyEntities.push({
    name:     session.playerName,
    side:     'ally',
    hpStatus: 'healthy',
    distance: 5,
  })

  // Generate responses from each addressed NPC
  const npcResponses = []

  for (const templateKey of targetKeys) {
    const personality = session.personalities[templateKey]
    if (!personality) continue

    // Get NPC world state from world engine for richer context
    const npcWorldState = worldEngine.getNpcState(templateKey)
    const worldActivityNote = npcWorldState
      ? `${personality.name} was ${npcWorldState.activity} at ${npcWorldState.location} when approached`
      : null

    try {
      // Build context package using the standard builder
      const pkg = buildFromPersonality({
        personality,
        triggerEvent:    TRIGGER_EVENT.PLAYER_ADDRESSED,
        sessionId:       encounterId,
        emotionalState:  EMOTIONAL_STATE.CALM,
        worldLocation:   session.worldContext.location,
        worldTimeOfDay:  session.worldContext.timeOfDay,
        worldTone:       session.worldContext.tone,
        format:          'spoken',
        maxTokens:       150,  // Longer responses for conversation
      })

      // Inject nearby entities override (conversation history is passed via options,
      // not as embedded text, to keep the LLM prompt clean for small models)
      const recentEvents = [`${session.playerName} says: "${text.trim()}"`]
      if (worldActivityNote) recentEvents.unshift(worldActivityNote)

      const enhancedPkg = {
        ...pkg,
        situationalContext: {
          ...pkg.situationalContext,
          nearbyEntities,
          recentEvents,
        },
      }

      const result = await generateResponse(enhancedPkg, {
        sessionId:   encounterId,
        personality,
        entityId:    'player',
        chatHistory,
        playerMessage: text.trim(),
      })

      const npcMessage = {
        id:         _messageId(),
        sender:     templateKey,
        senderName: result.npcName || personality.name,
        text:       result.text,
        source:     result.source,
        timestamp:  Date.now(),
      }
      session.messages.push(npcMessage)
      npcResponses.push(npcMessage)

    } catch (err) {
      // If one NPC fails, still try the others
      console.warn(`[EncounterSession] Failed to get response from ${templateKey}: ${err.message}`)
      const fallbackMessage = {
        id:         _messageId(),
        sender:     templateKey,
        senderName: personality.name,
        text:       '*looks at you thoughtfully but says nothing*',
        source:     'fallback',
        timestamp:  Date.now(),
      }
      session.messages.push(fallbackMessage)
      npcResponses.push(fallbackMessage)
    }
  }

  return { playerMessage, npcResponses, npcs: _enrichNpcsWithRevealedInfo(encounterId, session.npcs) }
}

/**
 * End an encounter session.
 *
 * @param {string} encounterId
 * @returns {{ encounterId, status, messageCount }}
 */
function endEncounter(encounterId) {
  const session = _sessions.get(encounterId)
  if (!session) {
    const err = new Error(`Encounter not found: ${encounterId}`)
    err.code = 'ENCOUNTER_NOT_FOUND'
    throw err
  }
  session.status = 'ended'
  const messageCount = session.messages.length
  // Keep session briefly for retrieval, will be pruned eventually
  return { encounterId, status: 'ended', messageCount }
}

/**
 * List all active encounter sessions.
 * @returns {Array<{ encounterId, npcs, status, messageCount, createdAt }>}
 */
function listEncounters() {
  _pruneExpired()
  const result = []
  for (const session of _sessions.values()) {
    result.push({
      encounterId:  session.id,
      npcs:         session.npcs,
      status:       session.status,
      messageCount: session.messages.length,
      createdAt:    session.createdAt,
    })
  }
  return result
}

// ── Exports ───────────────────────────────────────────────────────────────────

module.exports = {
  createEncounter,
  getEncounter,
  sendMessage,
  endEncounter,
  listEncounters,

  // For testing
  _sessions,
  _clearAll: () => _sessions.clear(),
}
