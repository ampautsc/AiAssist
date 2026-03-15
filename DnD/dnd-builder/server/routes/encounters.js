/**
 * Encounter Sessions REST API — Express router.
 *
 * Pure API layer — no business logic here.
 * All encounter logic delegated to EncounterSessionService.
 *
 * Endpoints:
 *   GET    /api/encounters              — list active encounters
 *   POST   /api/encounters              — create a new encounter
 *   GET    /api/encounters/:id          — get encounter state
 *   POST   /api/encounters/:id/messages — send player message, get NPC responses
 *   DELETE /api/encounters/:id          — end encounter
 */

'use strict'

const { Router } = require('express')
const {
  createEncounter,
  getEncounter,
  sendMessage,
  endEncounter,
  listEncounters,
} = require('../services/EncounterSessionService')

const router = Router()

// ── Error helper ──────────────────────────────────────────────────────────────

function handleError(res, err) {
  if (err.code === 'INVALID_INPUT') {
    return res.status(400).json({ error: err.message })
  }
  if (err.code === 'ENCOUNTER_NOT_FOUND') {
    return res.status(404).json({ error: err.message })
  }
  if (err.code === 'NPC_NOT_FOUND') {
    return res.status(404).json({ error: err.message })
  }
  if (err.code === 'ENCOUNTER_ENDED') {
    return res.status(409).json({ error: err.message })
  }
  if (err.code === 'MAX_SESSIONS') {
    return res.status(429).json({ error: err.message })
  }
  console.error('[EncounterAPI]', err)
  return res.status(500).json({ error: err.message })
}

// ── GET /encounters ───────────────────────────────────────────────────────────

router.get('/', (_req, res) => {
  try {
    const encounters = listEncounters()
    return res.json({ data: encounters })
  } catch (err) {
    return handleError(res, err)
  }
})

// ── POST /encounters ──────────────────────────────────────────────────────────

router.post('/', async (req, res) => {
  const { npcTemplateKeys, playerName, worldContext } = req.body

  try {
    const result = await createEncounter({ npcTemplateKeys, playerName, worldContext })
    return res.status(201).json({ data: result })
  } catch (err) {
    return handleError(res, err)
  }
})

// ── GET /encounters/:id ───────────────────────────────────────────────────────

router.get('/:id', (req, res) => {
  try {
    const result = getEncounter(req.params.id)
    return res.json({ data: result })
  } catch (err) {
    return handleError(res, err)
  }
})

// ── POST /encounters/:id/messages ─────────────────────────────────────────────

router.post('/:id/messages', async (req, res) => {
  const { text, addressedTo } = req.body

  try {
    const result = await sendMessage(req.params.id, { text, addressedTo })
    return res.json({ data: result })
  } catch (err) {
    return handleError(res, err)
  }
})

// ── DELETE /encounters/:id ────────────────────────────────────────────────────

router.delete('/:id', (req, res) => {
  try {
    const result = endEncounter(req.params.id)
    return res.json({ data: result })
  } catch (err) {
    return handleError(res, err)
  }
})

module.exports = router
