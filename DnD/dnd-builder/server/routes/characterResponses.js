/**
 * Character Responses REST API — Express router.
 *
 * Pure API layer — no business logic here.
 * All character AI logic delegated to CharacterResponseService.
 *
 * Endpoints:
 *   POST /api/characters/:templateKey/respond
 *     Body: { triggerEvent, sessionId?, combatantId?, emotionalState?,
 *             worldLocation?, worldTimeOfDay?, worldTone?, format? }
 *     Returns: { data: ResponseResult }
 *
 *   GET  /api/characters/templates
 *     Returns: list of available personality templateKeys
 *
 *   POST /api/characters/respond/batch
 *     Body: { requests: [{ templateKey, triggerEvent, sessionId?, ... }] }
 *     Returns: { data: ResponseResult[] }
 */

'use strict'

const path   = require('path')
const fs     = require('fs')
const { Router } = require('express')

const { buildFromPersonality } = require('../services/CharacterContextBuilder')
const { generateResponse, clearSessionCache } = require('../services/CharacterResponseService')
const { TRIGGER_EVENT } = require('../llm/CharacterContextPackage')

// Optional: use MongoDB if available, else load from JSON seed files
let CharacterPersonality = null
try {
  CharacterPersonality = require('../models/CharacterPersonality')
} catch (_) { /* mongoose not initialized */ }

const router = Router()

// ── Personality loading ───────────────────────────────────────────────────────

const SEED_DIR = path.resolve(__dirname, '../data/npcPersonalities')

/**
 * Load personality by templateKey.
 * Tries MongoDB first, then falls back to seed JSON file.
 *
 * @param {string} templateKey
 * @returns {Promise<Object|null>}
 */
async function loadPersonality(templateKey) {
  // Try MongoDB first if connected
  if (CharacterPersonality) {
    try {
      const doc = await CharacterPersonality.findOne({ templateKey }).lean()
      if (doc) return doc
    } catch (_) { /* DB not connected or query failed */ }
  }

  // Fall back to seed file
  const seedPath = path.join(SEED_DIR, `${templateKey}.json`)
  if (fs.existsSync(seedPath)) {
    return JSON.parse(fs.readFileSync(seedPath, 'utf8'))
  }

  return null
}

// ── Error helper ──────────────────────────────────────────────────────────────

function handleError(res, err) {
  if (err.message.includes('required') || err.message.includes('must be')) {
    return res.status(400).json({ error: err.message })
  }
  console.error('[CharacterResponseAPI]', err)
  return res.status(500).json({ error: err.message })
}

// ── GET /characters/templates ─────────────────────────────────────────────────

router.get('/templates', (_req, res) => {
  try {
    const seedFiles = fs.readdirSync(SEED_DIR)
      .filter(f => f.endsWith('.json'))
      .map(f => path.basename(f, '.json'))

    return res.json({ data: { templateKeys: seedFiles } })
  } catch (err) {
    return handleError(res, err)
  }
})

// ── GET /characters/trigger-events ───────────────────────────────────────────

router.get('/trigger-events', (_req, res) => {
  return res.json({ data: { triggerEvents: Object.values(TRIGGER_EVENT) } })
})

// ── POST /characters/:templateKey/respond ────────────────────────────────────

router.post('/:templateKey/respond', async (req, res) => {
  const { templateKey } = req.params
  const {
    triggerEvent,
    sessionId     = null,
    combatantId   = null,
    emotionalState = null,
    worldLocation  = 'unknown',
    worldTimeOfDay = 'unknown',
    worldTone      = 'tense',
    format         = 'spoken',
    maxTokens      = 60,
  } = req.body

  if (!triggerEvent) {
    return res.status(400).json({ error: 'triggerEvent is required' })
  }

  try {
    const personality = await loadPersonality(templateKey)
    if (!personality) {
      return res.status(404).json({ error: `No personality found for templateKey: ${templateKey}` })
    }

    const pkg = buildFromPersonality({
      personality,
      triggerEvent,
      sessionId,
      combatantId,
      emotionalState,
      worldLocation,
      worldTimeOfDay,
      worldTone,
      format,
      maxTokens,
    })

    const result = await generateResponse(pkg, { sessionId, personality })

    return res.json({ data: result })
  } catch (err) {
    return handleError(res, err)
  }
})

// ── POST /characters/respond/batch ───────────────────────────────────────────

router.post('/respond/batch', async (req, res) => {
  const { requests } = req.body
  if (!Array.isArray(requests) || requests.length === 0) {
    return res.status(400).json({ error: 'requests must be a non-empty array' })
  }
  if (requests.length > 20) {
    return res.status(400).json({ error: 'batch size cannot exceed 20 requests' })
  }

  try {
    const results = await Promise.all(
      requests.map(async (req) => {
        const { templateKey, triggerEvent, sessionId, combatantId,
                emotionalState, worldLocation, worldTimeOfDay, worldTone, format, maxTokens } = req

        if (!templateKey || !triggerEvent) {
          return { error: 'templateKey and triggerEvent are required per request' }
        }

        try {
          const personality = await loadPersonality(templateKey)
          if (!personality) {
            return { error: `No personality found for templateKey: ${templateKey}` }
          }

          const pkg = buildFromPersonality({
            personality, triggerEvent, sessionId, combatantId,
            emotionalState, worldLocation, worldTimeOfDay, worldTone, format, maxTokens,
          })

          return await generateResponse(pkg, { sessionId, personality })
        } catch (e) {
          return { error: e.message, templateKey }
        }
      }),
    )

    return res.json({ data: results })
  } catch (err) {
    return handleError(res, err)
  }
})

// ── DELETE /characters/sessions/:sessionId/cache ──────────────────────────────
// Clear repetition cache when a combat session ends

router.delete('/sessions/:sessionId/cache', (req, res) => {
  clearSessionCache(req.params.sessionId)
  return res.json({ data: { cleared: true } })
})

module.exports = router
