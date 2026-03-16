/**
 * Character CRUD routes
 * GET    /api/characters          - list all characters (optionally filter by ownerId)
 * GET    /api/characters/:id      - get single character
 * POST   /api/characters          - create character
 * PUT    /api/characters/:id      - update character
 * DELETE /api/characters/:id      - delete character
 *
 * In development, characters are stored in an in-memory Map.
 * Production: swap the store object methods for DB queries.
 */

'use strict'

const express = require('express')
const { randomUUID } = require('crypto')

const router = express.Router()

// ── In-memory store ───────────────────────────────────────────────────────────
const characters = new Map()

// Seed with two example characters
const SEED = [
  {
    id: 'char-001',
    ownerId: 'player-001',
    name: 'Aldric Ironforge',
    race: 'Dwarf',
    class: 'Fighter',
    level: 5,
    experiencePoints: 6500,
    background: 'Soldier',
    alignment: 'Lawful Good',
    abilityScores: { strength: 16, dexterity: 12, constitution: 18, intelligence: 9, wisdom: 13, charisma: 8 },
    hitPoints: { max: 52, current: 40, temporary: 0 },
    armorClass: 18,
    speed: 25,
    proficiencyBonus: 3,
    inventory: [],
    currency: { copper: 0, silver: 15, electrum: 0, gold: 47, platinum: 1 },
    conditions: [],
    notes: 'Veteran soldier with a penchant for dwarvish ales.',
    createdAt: new Date('2024-01-01').toISOString(),
    updatedAt: new Date('2024-03-01').toISOString(),
  },
  {
    id: 'char-002',
    ownerId: 'player-002',
    name: 'Lyra Moonwhisper',
    race: 'Elf',
    class: 'Wizard',
    level: 5,
    experiencePoints: 6800,
    background: 'Sage',
    alignment: 'Neutral Good',
    abilityScores: { strength: 8, dexterity: 14, constitution: 12, intelligence: 18, wisdom: 13, charisma: 10 },
    hitPoints: { max: 32, current: 32, temporary: 0 },
    armorClass: 13,
    speed: 30,
    proficiencyBonus: 3,
    inventory: [],
    currency: { copper: 0, silver: 5, electrum: 0, gold: 120, platinum: 0 },
    conditions: [],
    notes: 'Specialises in evocation magic.',
    createdAt: new Date('2024-01-01').toISOString(),
    updatedAt: new Date('2024-03-01').toISOString(),
  },
]
for (const c of SEED) characters.set(c.id, c)

// ── Validation helper ─────────────────────────────────────────────────────────
const REQUIRED_CREATE = ['name', 'race', 'class', 'abilityScores']

function validateAbilityScores(scores) {
  const abilities = ['strength', 'dexterity', 'constitution', 'intelligence', 'wisdom', 'charisma']
  for (const ab of abilities) {
    const v = scores[ab]
    if (typeof v !== 'number' || v < 1 || v > 30) {
      return `${ab} must be a number between 1 and 30`
    }
  }
  return null
}

// ── Routes ────────────────────────────────────────────────────────────────────

// GET /api/characters
router.get('/', (req, res) => {
  const { ownerId } = req.query
  let list = Array.from(characters.values())
  if (ownerId) list = list.filter(c => c.ownerId === ownerId)
  res.json({ data: list, total: list.length })
})

// GET /api/characters/:id
router.get('/:id', (req, res) => {
  const char = characters.get(req.params.id)
  if (!char) return res.status(404).json({ error: 'Character not found.' })
  res.json({ data: char })
})

// POST /api/characters
router.post('/', (req, res) => {
  const body = req.body ?? {}

  for (const field of REQUIRED_CREATE) {
    if (!body[field]) return res.status(400).json({ error: `Missing required field: ${field}` })
  }

  const scoreError = validateAbilityScores(body.abilityScores)
  if (scoreError) return res.status(400).json({ error: scoreError })

  const now = new Date().toISOString()
  const character = {
    id:               randomUUID(),
    ownerId:          body.ownerId ?? null,
    name:             String(body.name).slice(0, 80),
    race:             String(body.race),
    class:            String(body.class),
    subclass:         body.subclass ?? null,
    level:            Math.min(20, Math.max(1, Number(body.level) || 1)),
    experiencePoints: Math.max(0, Number(body.experiencePoints) || 0),
    background:       body.background ?? 'Unknown',
    alignment:        body.alignment ?? 'True Neutral',
    abilityScores:    body.abilityScores,
    hitPoints: {
      max:       Math.max(1, Number(body.hitPoints?.max) || 1),
      current:   Math.max(0, Number(body.hitPoints?.current) || 1),
      temporary: 0,
    },
    armorClass:       Math.max(1, Number(body.armorClass) || 10),
    speed:            Math.max(0, Number(body.speed) || 30),
    proficiencyBonus: Math.max(2, Number(body.proficiencyBonus) || 2),
    inventory:        Array.isArray(body.inventory) ? body.inventory : [],
    currency:         body.currency ?? { copper: 0, silver: 0, electrum: 0, gold: 0, platinum: 0 },
    conditions:       [],
    notes:            body.notes ? String(body.notes).slice(0, 2000) : '',
    createdAt:        now,
    updatedAt:        now,
  }

  characters.set(character.id, character)
  res.status(201).json({ data: character })
})

// PUT /api/characters/:id
router.put('/:id', (req, res) => {
  const existing = characters.get(req.params.id)
  if (!existing) return res.status(404).json({ error: 'Character not found.' })

  const body = req.body ?? {}

  // Validate ability scores if provided
  if (body.abilityScores) {
    const scoreError = validateAbilityScores(body.abilityScores)
    if (scoreError) return res.status(400).json({ error: scoreError })
  }

  // Only allow safe fields to be patched (never overwrite id / ownerId / createdAt)
  const UPDATABLE = [
    'name', 'race', 'class', 'subclass', 'level', 'experiencePoints',
    'background', 'alignment', 'abilityScores', 'hitPoints', 'armorClass',
    'speed', 'proficiencyBonus', 'inventory', 'currency', 'conditions', 'notes',
  ]
  const updated = { ...existing, updatedAt: new Date().toISOString() }
  for (const key of UPDATABLE) {
    if (key in body) updated[key] = body[key]
  }

  characters.set(existing.id, updated)
  res.json({ data: updated })
})

// DELETE /api/characters/:id
router.delete('/:id', (req, res) => {
  if (!characters.has(req.params.id)) return res.status(404).json({ error: 'Character not found.' })
  characters.delete(req.params.id)
  res.json({ ok: true })
})

module.exports = router
