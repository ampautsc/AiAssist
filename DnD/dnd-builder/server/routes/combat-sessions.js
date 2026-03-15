/**
 * Combat Sessions REST API — Express router.
 *
 * Pure API layer — no business logic here.
 * All combat rules delegated to CombatSessionManager service.
 *
 * Endpoints:
 *   POST   /api/combat/sessions              - Create session
 *   GET    /api/combat/sessions/:id           - Get session state
 *   GET    /api/combat/sessions/:id/menu      - Get turn menu
 *   POST   /api/combat/sessions/:id/roll-request - Request commit-reveal roll
 *   POST   /api/combat/sessions/:id/confirm-rolls - Confirm roll seed and resolve
 *   POST   /api/combat/sessions/:id/actions   - Submit choice
 *   POST   /api/combat/sessions/:id/end-turn  - End turn
 *   POST   /api/combat/sessions/:id/roll      - Free dice roll
 *   DELETE /api/combat/sessions/:id           - Destroy session
 */

'use strict'

const { Router } = require('express')
const manager    = require('../combat/CombatSessionManager')

const router = Router()

// ── Error handler ────────────────────────────────────────────────────────────

function handleError(res, err) {
  if (err.code === 'SESSION_NOT_FOUND' || err.code === 'SESSION_EXPIRED') {
    return res.status(404).json({ error: err.message })
  }
  if (err.message.startsWith('Invalid choice:') ||
      err.message.includes('is required') ||
      err.message.includes('must have') ||
      err.message.startsWith('Invalid dice notation') ||
      err.message.startsWith('No pending roll request') ||
      err.message.startsWith('Turn changed before roll confirmation')) {
    return res.status(400).json({ error: err.message })
  }
  console.error('[CombatAPI]', err)
  return res.status(500).json({ error: err.message })
}

// ── POST /sessions — Create a new combat session ─────────────────────────────

router.post('/sessions', (req, res) => {
  try {
    const result = manager.createSession(req.body)
    return res.status(201).json({ data: result })
  } catch (err) {
    return handleError(res, err)
  }
})

// ── GET /sessions/:id — Get session state ────────────────────────────────────

router.get('/sessions/:id', (req, res) => {
  try {
    const result = manager.getSession(req.params.id)
    return res.json({ data: result })
  } catch (err) {
    return handleError(res, err)
  }
})

// ── GET /sessions/:id/menu — Get turn menu for active combatant ──────────────

router.get('/sessions/:id/menu', (req, res) => {
  try {
    const result = manager.getMenu(req.params.id)
    return res.json({ data: result })
  } catch (err) {
    return handleError(res, err)
  }
})

// ── POST /sessions/:id/roll-request — Start commit-reveal roll handshake ───

router.post('/sessions/:id/roll-request', (req, res) => {
  try {
    const result = manager.requestRolls(req.params.id, req.body)
    return res.json({ data: result })
  } catch (err) {
    return handleError(res, err)
  }
})

// ── POST /sessions/:id/confirm-rolls — Submit client seed, resolve action ──

router.post('/sessions/:id/confirm-rolls', (req, res) => {
  try {
    const { clientSeed } = req.body || {}
    const result = manager.confirmRolls(req.params.id, clientSeed)
    return res.json({ data: result })
  } catch (err) {
    return handleError(res, err)
  }
})

// ── POST /sessions/:id/actions — Submit a choice ────────────────────────────

router.post('/sessions/:id/actions', (req, res) => {
  try {
    const result = manager.submitChoice(req.params.id, req.body)
    return res.json({ data: result })
  } catch (err) {
    return handleError(res, err)
  }
})

// ── POST /sessions/:id/end-turn — End the current turn ──────────────────────

router.post('/sessions/:id/end-turn', (req, res) => {
  try {
    const result = manager.endTurn(req.params.id)
    return res.json({ data: result })
  } catch (err) {
    return handleError(res, err)
  }
})

// ── POST /sessions/:id/roll — Free dice roll ────────────────────────────────

router.post('/sessions/:id/roll', (req, res) => {
  try {
    const { notation } = req.body || {}
    if (!notation) {
      return res.status(400).json({ error: 'notation is required (e.g. "1d20", "2d6+3")' })
    }
    const result = manager.rollFree(req.params.id, notation)
    return res.json({ data: result })
  } catch (err) {
    return handleError(res, err)
  }
})

// ── DELETE /sessions/:id — Destroy session ───────────────────────────────────

router.delete('/sessions/:id', (req, res) => {
  try {
    manager.destroySession(req.params.id)
    return res.json({ data: { message: 'Session destroyed' } })
  } catch (err) {
    return handleError(res, err)
  }
})
// ── GET /sessions/:id/inventory — Get player inventory ───────────────────

router.get('/sessions/:id/inventory', (req, res) => {
  try {
    const result = manager.getInventory(req.params.id)
    return res.json({ data: result })
  } catch (err) {
    return handleError(res, err)
  }
})
module.exports = router
