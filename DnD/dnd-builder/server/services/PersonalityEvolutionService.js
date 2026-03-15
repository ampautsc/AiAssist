/**
 * PersonalityEvolutionService — Tracks permanent NPC personality changes across sessions.
 *
 * While EncounterMemoryService tracks WITHIN a session (trust, emotional arc, etc.),
 * PersonalityEvolutionService tracks ACROSS sessions — permanent shifts that accumulate
 * over the lifetime of a campaign.
 *
 * Tracks:
 *   - Character arc progression (where along their arc is this NPC?)
 *   - Permanent disposition shifts (has the NPC fundamentally changed toward the party?)
 *   - Triggered arc milestones (has the NPC experienced key events that advance their story?)
 *   - Cross-session relationship quality (are they becoming allies? enemies?)
 *   - Opinion mutations (has the NPC's opinion of others changed?)
 *
 * This is a pure in-memory service for now. A persistence adapter can be added later
 * to save evolution state to disk/DB between server restarts.
 *
 * Architecture: This service is QUERIED by the prompt builder and UPDATED by the
 * response service at the end of each encounter/session.  It does not call external systems.
 *
 * @module PersonalityEvolutionService
 */

'use strict'

// ── Evolution store ───────────────────────────────────────────────────────────
// Key: templateKey (string), Value: EvolutionRecord

const _evolutionStore = new Map()

/**
 * @typedef {Object} EvolutionRecord
 * @property {string}   templateKey        - NPC identity
 * @property {number}   arcStage           - 0.0 (arc start) to 1.0 (arc resolution). Default 0.0
 * @property {string[]} arcMilestones      - Descriptive strings of arc-advancing events that occurred
 * @property {number}   permanentDisposition - Cumulative permanent disposition shift (-1.0 to +1.0)
 * @property {Object.<string, number>} relationshipQuality - entityId → quality (-1.0 hostile to +1.0 devoted)
 * @property {Object.<string, string>} opinionOverrides    - templateKey → current opinion (overrides JSON default)
 * @property {string[]} personalGrowth     - Descriptive strings of how the NPC has grown/changed
 * @property {number}   encountersSurvived - Total encounters this NPC has been in
 * @property {number}   createdAt
 * @property {number}   lastUpdatedAt
 */

// ── Core API ──────────────────────────────────────────────────────────────────

/**
 * Get or create the evolution record for an NPC.
 *
 * @param {string} templateKey
 * @returns {EvolutionRecord}
 */
function getEvolution(templateKey) {
  if (!templateKey) return null
  if (_evolutionStore.has(templateKey)) return _evolutionStore.get(templateKey)

  const now = Date.now()
  const record = {
    templateKey,
    arcStage: 0.0,
    arcMilestones: [],
    permanentDisposition: 0.0,
    relationshipQuality: {},
    opinionOverrides: {},
    personalGrowth: [],
    encountersSurvived: 0,
    createdAt: now,
    lastUpdatedAt: now,
  }

  _evolutionStore.set(templateKey, record)
  return record
}

/**
 * Advance the NPC's character arc by a given amount.
 * The arc stage is clamped to [0.0, 1.0].
 *
 * @param {string} templateKey
 * @param {number} delta - Amount to advance (e.g. 0.1 for a small step, 0.25 for a major event)
 * @param {string} [milestone] - Optional description of what caused the advance
 * @returns {EvolutionRecord}
 */
function advanceArc(templateKey, delta, milestone) {
  const record = getEvolution(templateKey)
  if (!record) return null

  record.arcStage = Math.max(0, Math.min(1, record.arcStage + delta))
  if (milestone) {
    record.arcMilestones.push(milestone)
  }
  record.lastUpdatedAt = Date.now()
  return record
}

/**
 * Shift the NPC's permanent disposition toward or away from the party.
 * Clamped to [-1.0, +1.0].
 *
 * @param {string} templateKey
 * @param {number} delta - Positive = warmer, negative = colder
 * @param {string} [reason] - Why the shift occurred
 * @returns {EvolutionRecord}
 */
function shiftDisposition(templateKey, delta, reason) {
  const record = getEvolution(templateKey)
  if (!record) return null

  record.permanentDisposition = Math.max(-1, Math.min(1, record.permanentDisposition + delta))
  if (reason) {
    record.personalGrowth.push(reason)
  }
  record.lastUpdatedAt = Date.now()
  return record
}

/**
 * Update the NPC's relationship quality with a specific entity.
 * Clamped to [-1.0, +1.0].
 *
 * @param {string} templateKey
 * @param {string} entityId
 * @param {number} delta
 * @returns {EvolutionRecord}
 */
function adjustRelationship(templateKey, entityId, delta) {
  const record = getEvolution(templateKey)
  if (!record) return null

  const current = record.relationshipQuality[entityId] ?? 0
  record.relationshipQuality[entityId] = Math.max(-1, Math.min(1, current + delta))
  record.lastUpdatedAt = Date.now()
  return record
}

/**
 * Override the NPC's opinion of another NPC (replaces the JSON-seeded opinion).
 *
 * @param {string} templateKey
 * @param {string} targetKey - templateKey of the NPC being judged
 * @param {string} opinion - New opinion text
 * @returns {EvolutionRecord}
 */
function setOpinionOverride(templateKey, targetKey, opinion) {
  const record = getEvolution(templateKey)
  if (!record) return null

  record.opinionOverrides[targetKey] = opinion
  record.lastUpdatedAt = Date.now()
  return record
}

/**
 * Record that the NPC survived another encounter.
 *
 * @param {string} templateKey
 * @returns {EvolutionRecord}
 */
function recordEncounterSurvived(templateKey) {
  const record = getEvolution(templateKey)
  if (!record) return null

  record.encountersSurvived++
  record.lastUpdatedAt = Date.now()
  return record
}

/**
 * Consolidate encounter memory into permanent evolution.
 * Called at end of a session/encounter to "crystallize" session-level
 * trust and disposition changes into permanent personality evolution.
 *
 * @param {string} templateKey
 * @param {Object} encounterMemory - From EncounterMemoryService
 * @param {Object} [options]
 * @param {number} [options.crystallizationRate=0.3] - How much session change becomes permanent (0.0-1.0)
 * @returns {EvolutionRecord}
 */
function crystallizeEncounter(templateKey, encounterMemory, options = {}) {
  const record = getEvolution(templateKey)
  if (!record || !encounterMemory) return null

  const rate = typeof options.crystallizationRate === 'number'
    ? Math.max(0, Math.min(1, options.crystallizationRate))
    : 0.3

  // Crystallize session disposition shift into permanent disposition
  if (typeof encounterMemory.dispositionShift === 'number' && encounterMemory.dispositionShift !== 0) {
    const permanentDelta = encounterMemory.dispositionShift * rate
    record.permanentDisposition = Math.max(-1, Math.min(1, record.permanentDisposition + permanentDelta))
  }

  // Crystallize trust changes into relationship quality
  if (encounterMemory.trustLevels) {
    const defaultTrust = encounterMemory.defaultTrust ?? 0.3
    for (const [entityId, trustLevel] of Object.entries(encounterMemory.trustLevels)) {
      const trustDelta = trustLevel - defaultTrust
      if (Math.abs(trustDelta) > 0.05) {  // Only crystallize meaningful changes
        const permanentDelta = trustDelta * rate
        const current = record.relationshipQuality[entityId] ?? 0
        record.relationshipQuality[entityId] = Math.max(-1, Math.min(1, current + permanentDelta))
      }
    }
  }

  // Carry over significant moments as personal growth
  if (encounterMemory.significantMoments && encounterMemory.significantMoments.length > 0) {
    // Take only the most significant (limit to top 2 per encounter)
    const moments = encounterMemory.significantMoments.slice(0, 2)
    record.personalGrowth.push(...moments)
    
    // Trim personal growth to a reasonable total (keep last 20)
    if (record.personalGrowth.length > 20) {
      record.personalGrowth = record.personalGrowth.slice(-20)
    }
  }

  record.encountersSurvived++
  record.lastUpdatedAt = Date.now()
  return record
}

// ── Prompt Integration ────────────────────────────────────────────────────────

/**
 * Build a natural-language summary of the NPC's permanent evolution
 * for injection into the LLM prompt.
 *
 * @param {string} templateKey
 * @param {Object} [personality] - The NPC's base personality data (for enrichment)
 * @returns {string} - Multi-line summary, or empty string if no evolution
 */
function buildEvolutionSummary(templateKey, personality) {
  const record = _evolutionStore.get(templateKey)
  if (!record || (record.encountersSurvived === 0 && record.arcMilestones.length === 0)) {
    return ''
  }

  const lines = []

  // Arc progression
  if (personality?.consciousnessContext?.characterArc && record.arcStage > 0) {
    const arc = personality.consciousnessContext.characterArc
    const pct = Math.round(record.arcStage * 100)
    lines.push(`Character arc: "${arc.summary}" — ${pct}% progressed`)
    if (record.arcMilestones.length > 0) {
      const recent = record.arcMilestones.slice(-3)
      lines.push(`Recent arc moments: ${recent.join('; ')}`)
    }
  }

  // Permanent disposition
  if (Math.abs(record.permanentDisposition) > 0.05) {
    const direction = record.permanentDisposition > 0 ? 'warmer toward' : 'colder toward'
    const intensity = Math.abs(record.permanentDisposition)
    let desc
    if (intensity > 0.6) desc = 'significantly'
    else if (intensity > 0.3) desc = 'notably'
    else desc = 'slightly'
    lines.push(`You have grown ${desc} ${direction} the adventuring party over time`)
  }

  // Personal growth
  if (record.personalGrowth.length > 0) {
    const recent = record.personalGrowth.slice(-3)
    lines.push(`Things that have shaped you: ${recent.join('; ')}`)
  }

  // Experience
  if (record.encountersSurvived > 1) {
    lines.push(`You have survived ${record.encountersSurvived} encounters with these adventurers`)
  }

  return lines.length > 0 ? lines.join('\n') : ''
}

/**
 * Build opinions context — merges base personality `opinionsAbout` with
 * any runtime opinion overrides from evolution.
 *
 * @param {string} templateKey
 * @param {Object} personality - NPC personality data
 * @param {string[]} [nearbyNpcKeys] - templateKeys of NPCs currently nearby
 * @returns {string} - Opinions text for prompt injection, or empty string
 */
function buildOpinionsContext(templateKey, personality, nearbyNpcKeys) {
  const opinions = personality?.consciousnessContext?.opinionsAbout || {}
  const record = _evolutionStore.get(templateKey)
  const overrides = record?.opinionOverrides || {}

  // Merge: overrides take precedence
  const mergedKeys = new Set([
    ...Object.keys(opinions),
    ...Object.keys(overrides),
  ])

  if (mergedKeys.size === 0) return ''

  // If nearbyNpcKeys is provided, only include opinions about present NPCs
  const relevantKeys = nearbyNpcKeys
    ? [...mergedKeys].filter(k => nearbyNpcKeys.includes(k))
    : [...mergedKeys]

  if (relevantKeys.length === 0) return ''

  const lines = relevantKeys.map(key => {
    const opinion = overrides[key] || opinions[key]
    // Use the key as display name for now — the prompt builder can resolve names
    return `About ${key}: ${opinion}`
  })

  return lines.join('\n')
}

// ── Housekeeping ──────────────────────────────────────────────────────────────

/**
 * Clear all evolution records.
 */
function clearAll() {
  _evolutionStore.clear()
}

/**
 * Clear a single NPC's evolution record.
 *
 * @param {string} templateKey
 */
function clearEvolution(templateKey) {
  _evolutionStore.delete(templateKey)
}

/**
 * Get the raw store for testing.
 * @returns {Map}
 */
function _getStore() {
  return _evolutionStore
}

module.exports = {
  getEvolution,
  advanceArc,
  shiftDisposition,
  adjustRelationship,
  setOpinionOverride,
  recordEncounterSurvived,
  crystallizeEncounter,
  buildEvolutionSummary,
  buildOpinionsContext,
  clearAll,
  clearEvolution,
  _getStore,
}
