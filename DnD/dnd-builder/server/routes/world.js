'use strict'

/**
 * World API routes
 *
 * GET  /api/world/status       — world time, running state, recent events
 * GET  /api/world/npcs         — all NPC world states at current hour
 * GET  /api/world/npcs/:id     — single NPC world state
 * POST /api/world/tick         — advance world by one game hour
 * POST /api/world/start        — start auto-ticking
 * POST /api/world/stop         — stop auto-ticking
 * POST /api/world/set-time     — set world time directly
 */

const express     = require('express')
const worldEngine = require('../services/WorldEngine')

const router = express.Router()

// GET /api/world/status
router.get('/status', (_req, res) => {
  res.json(worldEngine.getStatus())
})

// GET /api/world/npcs
router.get('/npcs', (_req, res) => {
  res.json(worldEngine.getAllNpcStates())
})

// GET /api/world/npcs/:id
router.get('/npcs/:id', (req, res) => {
  const state = worldEngine.getNpcState(req.params.id)
  if (!state) {
    return res.status(404).json({ error: `NPC '${req.params.id}' not found` })
  }
  res.json(state)
})

// POST /api/world/tick
router.post('/tick', (_req, res) => {
  const time = worldEngine.tick()
  res.json({ time, message: `World advanced to ${time.formattedTime} (${time.timeOfDay})` })
})

// POST /api/world/start
router.post('/start', (req, res) => {
  const { tickIntervalMs } = req.body ?? {}
  const started = worldEngine.start(tickIntervalMs)
  if (!started) {
    return res.status(409).json({ error: 'World engine is already running' })
  }
  res.json({ ok: true, tickIntervalMs: worldEngine._tickIntervalMs, time: worldEngine.time })
})

// POST /api/world/stop
router.post('/stop', (_req, res) => {
  const stopped = worldEngine.stop()
  if (!stopped) {
    return res.status(409).json({ error: 'World engine is not running' })
  }
  res.json({ ok: true, time: worldEngine.time })
})

// POST /api/world/set-time
router.post('/set-time', (req, res) => {
  const { hour, day } = req.body ?? {}
  if (hour === undefined && day === undefined) {
    return res.status(400).json({ error: 'Provide at least one of: hour (0-23), day (≥1)' })
  }
  const time = worldEngine.setTime({ hour, day })
  res.json({ time })
})

module.exports = router
