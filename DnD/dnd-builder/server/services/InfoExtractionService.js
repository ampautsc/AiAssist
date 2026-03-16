/**
 * InfoExtractionService — Extracts revealed character info from NPC responses.
 *
 * After each NPC response, this service analyzes the response text to determine
 * what new personality information the NPC disclosed to the player. Uses the LLM
 * to compare the response against the NPC's full personality data and current
 * revealedInfo state, then returns structured extraction results.
 *
 * Also generates initial appearance descriptions from NPC personality data
 * at encounter start.
 *
 * Architecture: Pure service — no Express, no DB, no side effects on its own.
 * The caller (CharacterResponseService) is responsible for persisting results
 * to EncounterMemoryService.
 *
 * @module InfoExtractionService
 */

'use strict'

const { getProvider } = require('../llm/LLMProvider')

// ── Appearance generation ─────────────────────────────────────────────────────

/**
 * Generate an initial appearance description for an NPC based on their
 * personality data. Called once at encounter creation time.
 *
 * @param {Object} personality - Full NPC personality record
 * @returns {Promise<string>} 1-2 sentence physical appearance description
 */
async function generateAppearance(personality) {
  const name = personality.name || 'Unknown'
  const race = personality.race || 'Human'
  const disposition = personality.personality?.disposition || ''
  const backstory = personality.personality?.backstory || ''
  const voice = personality.personality?.voice || ''

  const systemPrompt = `You are a concise fantasy character descriptor. Generate a brief 1-2 sentence physical appearance description for a D&D NPC. Focus on what someone would notice at first glance: build, hair, eyes, clothing, and any distinctive features. Do NOT include personality traits, only physical description. Be vivid but brief.`

  const userPrompt = `Generate a first-glance physical appearance for:
Name: ${name}
Race: ${race}
Disposition hint: ${disposition.slice(0, 100)}
Voice: ${voice.slice(0, 80)}
Background: ${backstory.slice(0, 150)}

Respond with ONLY the appearance description, nothing else. 1-2 sentences max.`

  try {
    const provider = await getProvider()
    if (!provider.isAvailable()) {
      return _fallbackAppearance(name, race)
    }

    const text = await provider.complete(systemPrompt, userPrompt, {
      maxTokens: 150,
    })

    return text && text.trim() ? text.trim() : _fallbackAppearance(name, race)
  } catch (err) {
    console.warn(`[InfoExtraction] Appearance generation failed for ${name}: ${err.message}`)
    return _fallbackAppearance(name, race)
  }
}

/**
 * Fallback appearance when LLM is unavailable.
 */
function _fallbackAppearance(name, race) {
  const raceDescriptions = {
    'Human':     'an unremarkable but alert-looking human',
    'Half-Elf':  'a graceful figure with subtly pointed ears',
    'Elf':       'a slender, sharp-featured elf',
    'Dwarf':     'a stout, broad-shouldered dwarf',
    'Halfling':  'a small, nimble halfling',
    'Gnome':     'a small, bright-eyed gnome',
    'Half-Orc':  'a powerfully built half-orc',
    'Tiefling':  'a striking tiefling with an otherworldly air',
    'Dragonborn': 'an imposing dragonborn with scaled features',
  }
  const desc = raceDescriptions[race] || `a ${race.toLowerCase()}`
  return `${name} is ${desc} who carries themselves with quiet purpose.`
}

// ── Info extraction from NPC responses ────────────────────────────────────────

/**
 * Analyze an NPC response to determine what new character info was revealed.
 *
 * @param {Object} params
 * @param {string} params.responseText     - The NPC's response text
 * @param {Object} params.personality      - Full NPC personality record
 * @param {Object} params.currentRevealed  - Current revealedInfo state from memory
 * @param {string} params.playerMessage    - What the player said (context)
 * @returns {Promise<Object>} Extraction result: { reveals: { field: value, ... } }
 */
async function extractRevealedInfo({ responseText, personality, currentRevealed, playerMessage }) {
  if (!responseText || !personality) {
    return { reveals: {} }
  }

  // Build a summary of what's already known for the prompt
  const alreadyKnown = _summarizeRevealed(currentRevealed)

  // Build the full personality reference for comparison
  const personalityRef = _buildPersonalityReference(personality)

  const systemPrompt = `You are an information extraction system for a D&D NPC conversation tracker. Analyze an NPC's response to determine if they revealed any new character information to the player.

You must return ONLY valid JSON. No other text, no markdown, no explanation.

The JSON format is:
{
  "reveals": {
    "disposition": "short summary of revealed personality/demeanor" | null,
    "backstory": "short summary of revealed past/history" | null,
    "voice": "short description of how they sound" | null,
    "motivations": ["motivation string"] | null,
    "fears": ["fear string"] | null,
    "mannerisms": ["mannerism string"] | null,
    "speechPatterns": ["speech pattern string"] | null
  }
}

Rules:
- Only include fields where the NPC ACTUALLY revealed NEW information in their response
- Set fields to null if nothing new was revealed for that category
- Keep descriptions concise (1 sentence max per field)
- For array fields, only include genuinely new items not already known
- The player-facing description should be what an observant person would note, not raw personality data
- If the response is very short or generic, most fields should be null`

  const userPrompt = `NPC Personality Reference:
${personalityRef}

Already Known by Player:
${alreadyKnown}

Player said: "${playerMessage}"

NPC responded: "${responseText}"

What new character information did the NPC reveal? Respond with JSON only.`

  try {
    const provider = await getProvider()
    if (!provider.isAvailable()) {
      return _heuristicExtraction(responseText, personality, currentRevealed)
    }

    const raw = await provider.complete(systemPrompt, userPrompt, {
      maxTokens: 200,
    })

    return _parseExtractionResult(raw, personality, currentRevealed)
  } catch (err) {
    console.warn(`[InfoExtraction] LLM extraction failed: ${err.message}`)
    return _heuristicExtraction(responseText, personality, currentRevealed)
  }
}

/**
 * Parse LLM extraction output into structured result.
 */
function _parseExtractionResult(raw, personality, currentRevealed) {
  try {
    // Try to extract JSON from the response (may have leading/trailing text)
    const jsonMatch = raw.match(/\{[\s\S]*\}/)
    if (!jsonMatch) return { reveals: {} }

    const parsed = JSON.parse(jsonMatch[0])
    if (!parsed.reveals || typeof parsed.reveals !== 'object') {
      return { reveals: {} }
    }

    // Validate and clean the reveals
    const validFields = ['disposition', 'backstory', 'voice', 'motivations', 'fears', 'mannerisms', 'speechPatterns']
    const cleaned = {}

    for (const field of validFields) {
      const value = parsed.reveals[field]
      if (value == null) continue

      const arrayFields = ['motivations', 'fears', 'mannerisms', 'speechPatterns']
      if (arrayFields.includes(field)) {
        if (Array.isArray(value) && value.length > 0) {
          // Filter out items already in currentRevealed
          const existing = currentRevealed[field] || []
          const newItems = value.filter(v => typeof v === 'string' && v.trim() && !existing.includes(v.trim()))
          if (newItems.length > 0) cleaned[field] = newItems.map(v => v.trim())
        }
      } else {
        if (typeof value === 'string' && value.trim()) {
          cleaned[field] = value.trim()
        }
      }
    }

    return { reveals: cleaned }
  } catch (err) {
    console.warn(`[InfoExtraction] JSON parse failed: ${err.message}`)
    return { reveals: {} }
  }
}

/**
 * Heuristic fallback extraction when LLM is unavailable.
 * Uses simple keyword/length analysis.
 */
function _heuristicExtraction(responseText, personality, currentRevealed) {
  const reveals = {}
  const text = responseText.toLowerCase()

  // Detect voice/speech pattern reveals from long responses
  if (responseText.length > 80 && !currentRevealed.voice && personality.personality?.voice) {
    // If it's the first substantial response, note the voice
    reveals.voice = personality.personality.voice.split('.')[0] + '.'
  }

  // Detect backstory hints from keywords
  const backstoryKeywords = ['remember', 'once', 'years ago', 'my parents', 'when i was', 'grew up', 'used to', 'back when', 'long ago']
  if (!currentRevealed.backstory && backstoryKeywords.some(k => text.includes(k))) {
    // Extract a brief hint from the response itself
    reveals.backstory = responseText.length > 60
      ? responseText.slice(0, 60).trim() + '...'
      : responseText
  }

  // Detect fear mentions
  const fearKeywords = ['afraid', 'fear', 'scared', 'terrif', 'worry', 'dread']
  if (fearKeywords.some(k => text.includes(k)) && personality.personality?.fears?.length > 0) {
    const existing = currentRevealed.fears || []
    if (existing.length < (personality.personality.fears?.length || 0)) {
      reveals.fears = [personality.personality.fears[existing.length]]
    }
  }

  return { reveals }
}

/**
 * Summarize what the player already knows about this NPC.
 */
function _summarizeRevealed(revealed) {
  if (!revealed) return 'Nothing known yet.'

  const parts = []
  if (revealed.appearance)    parts.push(`Appearance: ${revealed.appearance}`)
  if (revealed.disposition)   parts.push(`Demeanor: ${revealed.disposition}`)
  if (revealed.backstory)     parts.push(`Background: ${revealed.backstory}`)
  if (revealed.voice)         parts.push(`Voice: ${revealed.voice}`)
  if (revealed.motivations?.length) parts.push(`Motivations: ${revealed.motivations.join(', ')}`)
  if (revealed.fears?.length)       parts.push(`Fears: ${revealed.fears.join(', ')}`)
  if (revealed.mannerisms?.length)  parts.push(`Mannerisms: ${revealed.mannerisms.join(', ')}`)
  if (revealed.speechPatterns?.length) parts.push(`Speech: ${revealed.speechPatterns.join(', ')}`)

  return parts.length > 0 ? parts.join('\n') : 'Nothing known yet.'
}

/**
 * Build a compact personality reference for the extraction prompt.
 */
function _buildPersonalityReference(personality) {
  const parts = []
  parts.push(`Name: ${personality.name}`)
  parts.push(`Race: ${personality.race}`)

  const p = personality.personality || {}
  if (p.disposition) parts.push(`Disposition: ${p.disposition.slice(0, 200)}`)
  if (p.voice)       parts.push(`Voice: ${p.voice.slice(0, 150)}`)
  if (p.backstory)   parts.push(`Backstory: ${p.backstory.slice(0, 200)}`)
  if (p.motivations?.length) parts.push(`Motivations: ${p.motivations.join(', ')}`)
  if (p.fears?.length)       parts.push(`Fears: ${p.fears.join(', ')}`)
  if (p.mannerisms?.length)  parts.push(`Mannerisms: ${p.mannerisms.join(', ')}`)
  if (p.speechPatterns?.length) parts.push(`Speech patterns: ${p.speechPatterns.join(', ')}`)

  return parts.join('\n')
}

// ── Exports ───────────────────────────────────────────────────────────────────

module.exports = {
  generateAppearance,
  extractRevealedInfo,

  // For testing
  _fallbackAppearance,
  _heuristicExtraction,
  _parseExtractionResult,
  _summarizeRevealed,
  _buildPersonalityReference,
}
