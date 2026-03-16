/**
 * DnD Builder — Express REST API server
 *
 * Starts:
 *   HTTP REST API on port 3001 (proxied by Vite dev server in development)
 *
 * All game-state mutations are authoritative here; the React SPA is a thin view.
 */

'use strict'

const path       = require('path')
require('dotenv').config({ path: path.resolve(__dirname, '../.env') })

const express    = require('express')
const cors       = require('cors')
const http       = require('http')
const mongoose   = require('mongoose')

const charactersRouter         = require('./routes/characters')
const partiesRouter            = require('./routes/parties')
const apiRouter                = require('./routes/api')
const combatSessionsRouter     = require('./routes/combat-sessions')
const characterResponsesRouter = require('./routes/characterResponses')
const encountersRouter         = require('./routes/encounters')
const worldRouter              = require('./routes/world')

// ── App setup ─────────────────────────────────────────────────────────────────
const app    = express()
const server = http.createServer(app)

app.use(cors({ origin: ['http://localhost:5173', 'http://localhost:4173'] }))
app.use(express.json())

// ── REST API routes ───────────────────────────────────────────────────────────
app.use('/api', apiRouter)
app.use('/api/characters', charactersRouter)
app.use('/api/parties',    partiesRouter)
app.use('/api/combat',     combatSessionsRouter)
app.use('/api/npc',        characterResponsesRouter)
app.use('/api/encounters', encountersRouter)
app.use('/api/world',      worldRouter)

// Basic health check
app.get('/api/health', (_req, res) => res.json({ ok: true, ts: new Date().toISOString() }))

// ── Start ─────────────────────────────────────────────────────────────────────
const PORT = process.env.PORT ?? 3001

async function start() {
  // Connect to MongoDB
  if (process.env.MONGODB_URI) {
    await mongoose.connect(process.env.MONGODB_URI)
    console.log('[DB] Connected to MongoDB')
  } else {
    console.warn('[DB] MONGODB_URI not set — API routes requiring DB will fail')
  }

  server.listen(PORT, () => {
    console.log(`[Server] DnD Builder server running on http://localhost:${PORT}`)
  })
}

start().catch(err => {
  console.error('[Server] Failed to start:', err)
  process.exit(1)
})

module.exports = { app, server }
