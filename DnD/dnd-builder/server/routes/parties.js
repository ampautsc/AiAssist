/**
 * Party management routes
 * GET    /api/parties             - list parties (filter: status, module)
 * GET    /api/parties/:id         - get single party
 * POST   /api/parties             - create party
 * POST   /api/parties/:id/join    - join a party
 * POST   /api/parties/:id/leave   - leave a party
 * POST   /api/parties/:id/start   - start session (leader only)
 * DELETE /api/parties/:id         - disband party (leader only)
 */

'use strict'

const express  = require('express')
const { randomUUID } = require('crypto')

const router = express.Router()

// ── In-memory store ───────────────────────────────────────────────────────────
const parties = new Map()

const SEED_PARTIES = [
  {
    id: 'party-001',
    name: 'The Iron Circle',
    leaderId: 'player-001',
    memberIds: ['player-001', 'player-002'],
    characterIds: ['char-001', 'char-002'],
    maxSize: 6,
    status: 'open',
    currentSessionId: null,
    adventureModule: 'Lost Mine of Phandelver',
    campaignFlags: { questsCompleted: [], npcsMet: [], locationsDiscovered: [] },
    createdAt: new Date('2024-01-01').toISOString(),
    updatedAt: new Date('2024-03-01').toISOString(),
  },
]
for (const p of SEED_PARTIES) parties.set(p.id, p)

// ── Helpers ───────────────────────────────────────────────────────────────────
function deriveStatus(party) {
  if (party.memberIds.length >= party.maxSize) return 'full'
  return party.status
}

// ── Routes ────────────────────────────────────────────────────────────────────

// GET /api/parties
router.get('/', (req, res) => {
  const { status, module: mod } = req.query
  let list = Array.from(parties.values())
  if (status) list = list.filter(p => p.status === status)
  if (mod)    list = list.filter(p => p.adventureModule?.toLowerCase().includes(mod.toLowerCase()))
  res.json({ data: list, total: list.length })
})

// GET /api/parties/:id
router.get('/:id', (req, res) => {
  const party = parties.get(req.params.id)
  if (!party) return res.status(404).json({ error: 'Party not found.' })
  res.json({ data: party })
})

// POST /api/parties
router.post('/', (req, res) => {
  const { name, leaderId, characterId, adventureModule, maxSize } = req.body ?? {}

  if (!name || !leaderId || !characterId) {
    return res.status(400).json({ error: 'name, leaderId, and characterId are required.' })
  }

  const now = new Date().toISOString()
  const party = {
    id:               randomUUID(),
    name:             String(name).slice(0, 80),
    leaderId:         String(leaderId),
    memberIds:        [String(leaderId)],
    characterIds:     [String(characterId)],
    maxSize:          Math.min(8, Math.max(2, Number(maxSize) || 6)),
    status:           'open',
    currentSessionId: null,
    adventureModule:  adventureModule ?? 'Custom Adventure',
    campaignFlags:    { questsCompleted: [], npcsMet: [], locationsDiscovered: [] },
    createdAt:        now,
    updatedAt:        now,
  }

  parties.set(party.id, party)
  res.status(201).json({ data: party })
})

// POST /api/parties/:id/join
router.post('/:id/join', (req, res) => {
  const party = parties.get(req.params.id)
  if (!party) return res.status(404).json({ error: 'Party not found.' })

  const { playerId, characterId } = req.body ?? {}
  if (!playerId || !characterId) {
    return res.status(400).json({ error: 'playerId and characterId are required.' })
  }

  if (party.status !== 'open') {
    return res.status(409).json({ error: `Cannot join: party status is "${party.status}".` })
  }
  if (party.memberIds.includes(playerId)) {
    return res.status(409).json({ error: 'You are already in this party.' })
  }
  if (party.memberIds.length >= party.maxSize) {
    return res.status(409).json({ error: 'Party is full.' })
  }

  party.memberIds.push(playerId)
  party.characterIds.push(characterId)
  party.updatedAt = new Date().toISOString()
  if (party.memberIds.length >= party.maxSize) party.status = 'full'

  parties.set(party.id, party)
  res.json({ data: party })
})

// POST /api/parties/:id/leave
router.post('/:id/leave', (req, res) => {
  const party = parties.get(req.params.id)
  if (!party) return res.status(404).json({ error: 'Party not found.' })

  const { playerId, characterId } = req.body ?? {}
  if (!playerId) return res.status(400).json({ error: 'playerId is required.' })

  const playerIdx = party.memberIds.indexOf(playerId)
  if (playerIdx === -1) return res.status(409).json({ error: 'You are not in this party.' })

  party.memberIds.splice(playerIdx, 1)
  if (characterId) {
    const charIdx = party.characterIds.indexOf(characterId)
    if (charIdx !== -1) party.characterIds.splice(charIdx, 1)
  }

  // Transfer leadership if the leader left
  if (party.leaderId === playerId && party.memberIds.length > 0) {
    party.leaderId = party.memberIds[0]
  }

  party.updatedAt = new Date().toISOString()
  if (party.status === 'full') party.status = 'open'

  if (party.memberIds.length === 0) {
    party.status = 'disbanded'
  }

  parties.set(party.id, party)
  res.json({ data: party })
})

// POST /api/parties/:id/start
router.post('/:id/start', (req, res) => {
  const party = parties.get(req.params.id)
  if (!party) return res.status(404).json({ error: 'Party not found.' })

  const { requesterId } = req.body ?? {}
  if (requesterId !== party.leaderId) {
    return res.status(403).json({ error: 'Only the party leader can start the session.' })
  }
  if (party.memberIds.length < 1) {
    return res.status(409).json({ error: 'Party needs at least one member.' })
  }
  if (party.status === 'in_session') {
    return res.status(409).json({ error: 'Session is already in progress.' })
  }

  party.status           = 'in_session'
  party.currentSessionId = randomUUID()
  party.updatedAt        = new Date().toISOString()

  parties.set(party.id, party)
  res.json({ data: party, sessionId: party.currentSessionId })
})

// DELETE /api/parties/:id
router.delete('/:id', (req, res) => {
  const party = parties.get(req.params.id)
  if (!party) return res.status(404).json({ error: 'Party not found.' })

  const { requesterId } = req.body ?? {}
  if (requesterId !== party.leaderId) {
    return res.status(403).json({ error: 'Only the party leader can disband the party.' })
  }

  party.status = 'disbanded'
  party.updatedAt = new Date().toISOString()
  parties.set(party.id, party)

  res.json({ ok: true })
})

module.exports = router
