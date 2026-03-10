/**
 * DnD Builder — Express + WebSocket server
 *
 * Starts:
 *   HTTP  REST API on port 3001 (proxied by Vite dev server in development)
 *   WS    Real-time game events on the same port via the `ws` library
 *
 * All game-state mutations are authoritative here; the React SPA is a thin view.
 */

'use strict'

const express    = require('express')
const cors       = require('cors')
const http       = require('http')
const { WebSocketServer } = require('ws')
const { v4: uuidv4 }     = require('uuid')

const charactersRouter = require('./routes/characters')
const partiesRouter    = require('./routes/parties')

// ── App setup ─────────────────────────────────────────────────────────────────
const app    = express()
const server = http.createServer(app)
const wss    = new WebSocketServer({ server, path: '/ws' })

app.use(cors({ origin: ['http://localhost:5173', 'http://localhost:4173'] }))
app.use(express.json())

// ── REST API routes ───────────────────────────────────────────────────────────
app.use('/api/characters', charactersRouter)
app.use('/api/parties',    partiesRouter)

// Basic health check
app.get('/api/health', (_req, res) => res.json({ ok: true, ts: new Date().toISOString() }))

// ── In-memory session state (replace with DB in production) ───────────────────
/**
 * sessions: Map<sessionId, SessionState>
 * SessionState = {
 *   id, partyId, participants: Map<ws, { playerId, characterId }>,
 *   gameState: { ... }
 * }
 */
const sessions = new Map()

// ── WebSocket hub ─────────────────────────────────────────────────────────────

/**
 * Broadcast a message to all connected clients in a session.
 * @param {string} sessionId
 * @param {object} message
 * @param {WebSocket} [exclude]  - optional sender to exclude
 */
function broadcast(sessionId, message, exclude = null) {
  const session = sessions.get(sessionId)
  if (!session) return
  const payload = JSON.stringify(message)
  for (const [ws] of session.participants) {
    if (ws !== exclude && ws.readyState === ws.OPEN) {
      ws.send(payload)
    }
  }
}

/**
 * Send a message directly to one WebSocket client.
 */
function sendTo(ws, message) {
  if (ws.readyState === ws.OPEN) ws.send(JSON.stringify(message))
}

wss.on('connection', (ws, req) => {
  console.log(`[WS] New connection from ${req.socket.remoteAddress}`)
  let currentSessionId = null

  ws.on('message', (raw) => {
    let msg
    try {
      msg = JSON.parse(raw.toString())
    } catch {
      sendTo(ws, { type: 'ERROR', payload: { code: 'INVALID_JSON', message: 'Message must be valid JSON.' } })
      return
    }

    const { type, payload = {} } = msg

    switch (type) {
      case 'JOIN_SESSION': {
        const { partyId, characterId, playerId } = payload
        if (!partyId || !characterId) {
          sendTo(ws, { type: 'ERROR', payload: { code: 'MISSING_FIELDS', message: 'partyId and characterId are required.' } })
          break
        }

        // Create session if it doesn't exist
        if (!sessions.has(partyId)) {
          sessions.set(partyId, {
            id: partyId,
            partyId,
            participants: new Map(),
            gameState: {
              round: 0,
              status: 'lobby',
              tokens: [],
              chatLog: [],
              combatLog: [],
            },
          })
        }

        const session = sessions.get(partyId)
        currentSessionId = partyId
        session.participants.set(ws, { playerId: playerId ?? uuidv4(), characterId })

        // Send full state to the new joiner
        sendTo(ws, { type: 'GAME_STATE', payload: session.gameState })

        // Notify other party members
        broadcast(partyId, { type: 'PLAYER_JOINED', payload: { characterId, playerId } }, ws)
        console.log(`[WS] ${characterId} joined session ${partyId}`)
        break
      }

      case 'CHAT': {
        if (!currentSessionId) break
        const { message: text } = payload
        if (!text || typeof text !== 'string') break

        const participant = sessions.get(currentSessionId)?.participants.get(ws)
        const entry = {
          from:      participant?.characterId ?? 'unknown',
          message:   text.slice(0, 500), // cap length
          timestamp: new Date().toISOString(),
        }

        const session = sessions.get(currentSessionId)
        if (session) {
          session.gameState.chatLog.push(entry)
          // Only keep the last 200 messages in memory
          if (session.gameState.chatLog.length > 200) session.gameState.chatLog.shift()
        }

        broadcast(currentSessionId, { type: 'CHAT_MESSAGE', payload: entry })
        break
      }

      case 'MOVE': {
        if (!currentSessionId) break
        const { q, r } = payload
        const participant = sessions.get(currentSessionId)?.participants.get(ws)
        if (!participant) break

        // Update token position in game state
        const session = sessions.get(currentSessionId)
        if (session) {
          const token = session.gameState.tokens.find(t => t.id === participant.characterId)
          if (token) { token.q = q; token.r = r }
          else session.gameState.tokens.push({ id: participant.characterId, q, r, type: 'character' })
        }

        broadcast(currentSessionId, {
          type: 'MAP_UPDATE',
          payload: { tokens: sessions.get(currentSessionId).gameState.tokens },
        })
        break
      }

      case 'ROLL_DICE': {
        const { dice, reason } = payload
        // Server-side dice roll — result is authoritative
        const result = rollDice(dice ?? '1d20')
        sendTo(ws, { type: 'DICE_RESULT', payload: { dice, result, reason } })
        if (currentSessionId) {
          broadcast(currentSessionId, {
            type: 'DICE_RESULT',
            payload: { dice, result, reason, rolledBy: sessions.get(currentSessionId)?.participants.get(ws)?.characterId },
          }, ws)
        }
        break
      }

      case 'ACTION': {
        // Game actions (attack, cast spell, etc.) — delegate to combat engine in a real impl
        if (!currentSessionId) break
        broadcast(currentSessionId, { type: 'COMBAT_EVENT', payload: { ...payload, source: 'action' } })
        break
      }

      default:
        sendTo(ws, { type: 'ERROR', payload: { code: 'UNKNOWN_TYPE', message: `Unknown message type: ${type}` } })
    }
  })

  ws.on('close', () => {
    if (currentSessionId) {
      const session = sessions.get(currentSessionId)
      if (session) {
        const participant = session.participants.get(ws)
        session.participants.delete(ws)
        if (participant) {
          broadcast(currentSessionId, { type: 'PLAYER_LEFT', payload: { characterId: participant.characterId } })
        }
        // Clean up empty sessions
        if (session.participants.size === 0) {
          sessions.delete(currentSessionId)
          console.log(`[WS] Session ${currentSessionId} removed (no participants)`)
        }
      }
    }
    console.log('[WS] Connection closed')
  })

  ws.on('error', (err) => {
    console.error('[WS] Error:', err.message)
  })
})

// ── Utility: server-side dice roller ─────────────────────────────────────────
/**
 * Roll dice from a notation string e.g. "2d6", "1d20", "4d6".
 * Returns the total sum.
 */
function rollDice(notation) {
  const match = notation.match(/^(\d+)d(\d+)([+-]\d+)?$/)
  if (!match) return 0
  const count    = Math.min(parseInt(match[1], 10), 20)  // cap at 20 dice
  const sides    = Math.min(parseInt(match[2], 10), 100) // cap at d100
  const modifier = match[3] ? parseInt(match[3], 10) : 0
  let total = 0
  for (let i = 0; i < count; i++) {
    total += Math.floor(Math.random() * sides) + 1
  }
  return total + modifier
}

// ── Start ─────────────────────────────────────────────────────────────────────
const PORT = process.env.PORT ?? 3001
server.listen(PORT, () => {
  console.log(`[Server] DnD Builder server running on http://localhost:${PORT}`)
  console.log(`[Server] WebSocket endpoint: ws://localhost:${PORT}/ws`)
})

module.exports = { app, server, wss, broadcast, rollDice }
