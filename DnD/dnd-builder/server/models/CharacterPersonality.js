/**
 * CharacterPersonality — MongoDB model for NPC personality data.
 *
 * Stores the static identity portion of a CharacterContextPackage.
 * Decoupled from combat stat blocks so personality is independently editable.
 *
 * Runtime combat data (HP, conditions, position) lives in CombatSessionManager.
 * This model is the persistent "soul" of an NPC character.
 */

'use strict'

const mongoose = require('mongoose')

const personalitySchema = new mongoose.Schema({
  // ── Core identity ─────────────────────────────────────────────────────────

  /** Matches creature templateKey in creatures.js (e.g. 'zombie', 'lich') */
  templateKey: { type: String, required: true, index: true },

  /** Display name (may differ from template name for unique NPCs) */
  name: { type: String, required: true },

  race: { type: String, required: true },

  /** 'enemy' | 'friendly' | 'neutral' — default alignment to the party */
  npcType: {
    type: String,
    enum: ['enemy', 'friendly', 'neutral'],
    required: true,
    default: 'enemy',
  },

  // ── Personality ───────────────────────────────────────────────────────────

  personality: {
    /** Speech style descriptor, e.g. 'gruff', 'eloquent', 'cryptic', 'feral' */
    voice: { type: String, default: 'neutral' },

    /** D&D alignment string */
    alignment: { type: String, default: 'true neutral' },

    /** Disposition toward party: 'hostile' | 'wary' | 'friendly' | 'indifferent' */
    disposition: { type: String, default: 'hostile' },

    /** 2–3 sentence origin / background for this NPC */
    backstory: { type: String, default: '' },

    /** Speech quirks: ['speaks in third person', 'uses archaic words', ...] */
    speechPatterns: [{ type: String }],

    /** Core drives: ['power', 'survival', 'revenge', ...] */
    motivations: [{ type: String }],

    /** What this NPC fears */
    fears: [{ type: String }],

    /** Physical or vocal mannerisms */
    mannerisms: [{ type: String }],
  },

  // ── Knowledge ─────────────────────────────────────────────────────────────

  knowledge: {
    knownFactions:   [{ type: String }],
    knownLocations:  [{ type: String }],
    secretsHeld:     [{ type: String }],
    languagesSpoken: { type: [String], default: ['Common'] },
  },

  // ── Relationships ─────────────────────────────────────────────────────────

  relationships: {
    allies:         [{ type: String }],
    enemies:        [{ type: String }],
    neutralParties: [{ type: String }],
  },

  // ── Ability scores (used to calibrate vocabulary complexity) ──────────────

  stats: {
    intelligence: { type: Number, default: 10 },
    wisdom:       { type: Number, default: 10 },
    charisma:     { type: Number, default: 10 },
  },

  // ── Pre-written fallback lines ────────────────────────────────────────────
  // Used when the LLM is unavailable. Keyed by triggerEvent.
  fallbackLines: {
    type: Map,
    of: [String],
    default: () => new Map(),
  },
}, { timestamps: true })

personalitySchema.set('toJSON', { virtuals: true })
personalitySchema.set('toObject', { virtuals: true })

module.exports = mongoose.model('CharacterPersonality', personalitySchema)
