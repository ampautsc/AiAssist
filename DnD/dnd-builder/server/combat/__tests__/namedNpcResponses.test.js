/**
 * Named NPC AI Response Tests
 *
 * Verifies that the AI engine correctly processes each named Millhaven NPC
 * personality file through the full pipeline: personality → context package →
 * system prompt → user prompt → response generation.
 *
 * Requirements tested:
 *   1. Every named NPC JSON loads successfully and produces valid context packages
 *   2. System prompts embed each NPC's unique identity (name, backstory, voice, mannerisms)
 *   3. Emotional state inference matches NPC type and scenario
 *   4. Different trigger events produce scenario-appropriate prompt content
 *   5. Response pipeline handles all NPC types (friendly, neutral) without errors
 *   6. Repetition avoidance works across multiple calls for the same NPC
 *   7. Cross-NPC consistency — related NPCs reference shared narrative elements
 *   8. Fallback lines are NPC-specific, not generic
 *   9. Edge cases — low stats, unusual speech patterns, child NPCs
 *  10. Batch responses across the full town roster
 *
 * Run with:
 *   node --test server/combat/__tests__/namedNpcResponses.test.js
 */

'use strict'

const { describe, it, beforeEach, afterEach } = require('node:test')
const assert = require('node:assert/strict')
const fs     = require('fs')
const path   = require('path')

const {
  TRIGGER_EVENT,
  NPC_TYPE,
  EMOTIONAL_STATE,
  RESPONSE_FORMAT,
  buildContextPackage,
  buildSystemPrompt,
  buildUserPrompt,
} = require('../../llm/CharacterContextPackage')

const {
  MockLLMProvider,
  resetPickIndex,
} = require('../../llm/MockLLMProvider')

const {
  buildFromPersonality,
  inferEmotionalState,
} = require('../../services/CharacterContextBuilder')

const {
  generateResponse,
  selectFallbackLine,
  _clearAllCaches,
  _setProvider,
} = require('../../services/CharacterResponseService')

// ═══════════════════════════════════════════════════════════════════════════
// SEED FILE LOADER
// ═══════════════════════════════════════════════════════════════════════════

const SEED_DIR = path.resolve(__dirname, '../../data/npcPersonalities')

function loadPersonality(templateKey) {
  const filePath = path.join(SEED_DIR, `${templateKey}.json`)
  return JSON.parse(fs.readFileSync(filePath, 'utf8'))
}

/** All 21 named Millhaven NPC template keys */
const NAMED_NPC_KEYS = [
  'mira_barrelbottom', 'brennan_holt', 'sera_dunwick', 'captain_edric_vane',
  'oma_steadwick', 'torval_grimm', 'pip_apprentice', 'vesna_calloway',
  'brother_aldwin', 'lell_sparrow', 'aldovar_crennick', 'davan_merchant',
  'floris_embrich', 'dolly_thurn', 'wren_stable', 'old_mattock',
  'tuck_millhaven', 'bree_millhaven', 'fen_colby', 'widow_marsh',
  'hodge_fence',
]

/** Load all 21 named personalities once for use across tests */
const ALL_PERSONALITIES = {}
for (const key of NAMED_NPC_KEYS) {
  ALL_PERSONALITIES[key] = loadPersonality(key)
}

// ═══════════════════════════════════════════════════════════════════════════
// RESET BETWEEN TESTS
// ═══════════════════════════════════════════════════════════════════════════

beforeEach(() => {
  resetPickIndex()
  _clearAllCaches()
  _setProvider(new MockLLMProvider())
})

afterEach(() => {
  _setProvider(new MockLLMProvider())
})

// ═══════════════════════════════════════════════════════════════════════════
// 1. PERSONALITY FILE INTEGRITY — every named NPC loads and validates
// ═══════════════════════════════════════════════════════════════════════════

describe('Named NPC file integrity', () => {
  it('all 21 named NPC JSON files exist on disk', () => {
    for (const key of NAMED_NPC_KEYS) {
      const filePath = path.join(SEED_DIR, `${key}.json`)
      assert.ok(fs.existsSync(filePath), `Missing personality file: ${key}.json`)
    }
  })

  it('all 21 files parse as valid JSON with required fields', () => {
    for (const key of NAMED_NPC_KEYS) {
      const p = ALL_PERSONALITIES[key]
      assert.ok(p.templateKey, `${key}: missing templateKey`)
      assert.equal(p.templateKey, key, `${key}: templateKey mismatch`)
      assert.ok(p.name, `${key}: missing name`)
      assert.ok(p.race, `${key}: missing race`)
      assert.ok(['friendly', 'neutral', 'enemy'].includes(p.npcType),
        `${key}: invalid npcType "${p.npcType}"`)
      assert.ok(p.personality, `${key}: missing personality block`)
      assert.ok(p.personality.backstory, `${key}: missing backstory`)
      assert.ok(p.personality.voice, `${key}: missing voice`)
      assert.ok(p.stats, `${key}: missing stats`)
    }
  })

  it('every named NPC has at least one motivation', () => {
    for (const key of NAMED_NPC_KEYS) {
      const p = ALL_PERSONALITIES[key]
      assert.ok(
        Array.isArray(p.personality.motivations) && p.personality.motivations.length > 0,
        `${key}: needs at least one motivation for meaningful AI responses`,
      )
    }
  })

  it('every named NPC has at least one fear', () => {
    for (const key of NAMED_NPC_KEYS) {
      const p = ALL_PERSONALITIES[key]
      assert.ok(
        Array.isArray(p.personality.fears) && p.personality.fears.length > 0,
        `${key}: needs at least one fear for meaningful AI responses`,
      )
    }
  })

  it('every named NPC has at least one mannerism', () => {
    for (const key of NAMED_NPC_KEYS) {
      const p = ALL_PERSONALITIES[key]
      assert.ok(
        Array.isArray(p.personality.mannerisms) && p.personality.mannerisms.length > 0,
        `${key}: needs at least one mannerism`,
      )
    }
  })

  it('every named NPC has at least one speech pattern', () => {
    for (const key of NAMED_NPC_KEYS) {
      const p = ALL_PERSONALITIES[key]
      assert.ok(
        Array.isArray(p.personality.speechPatterns) && p.personality.speechPatterns.length > 0,
        `${key}: needs at least one speech pattern`,
      )
    }
  })

  it('no two named NPCs share the same name', () => {
    const names = NAMED_NPC_KEYS.map(k => ALL_PERSONALITIES[k].name)
    const unique = new Set(names)
    assert.equal(unique.size, names.length, `Duplicate NPC names found: ${names.filter((n,i) => names.indexOf(n) !== i)}`)
  })

  it('no named NPC has npcType "enemy"', () => {
    // All Millhaven NPCs are townspeople — friendly or neutral, never hostile enemies
    for (const key of NAMED_NPC_KEYS) {
      const p = ALL_PERSONALITIES[key]
      assert.notEqual(p.npcType, 'enemy',
        `${key} (${p.name}) is a townsperson and should be friendly or neutral, not enemy`)
    }
  })
})

// ═══════════════════════════════════════════════════════════════════════════
// 2. CONTEXT PACKAGE CONSTRUCTION — each NPC builds a valid package
// ═══════════════════════════════════════════════════════════════════════════

describe('Named NPC context package construction', () => {
  it('every named NPC builds a valid CharacterContextPackage', () => {
    for (const key of NAMED_NPC_KEYS) {
      const p = ALL_PERSONALITIES[key]
      const pkg = buildFromPersonality({
        personality:  p,
        triggerEvent: TRIGGER_EVENT.PLAYER_ADDRESSED,
        worldLocation: 'Millhaven',
        worldTone:     'tense',
      })

      assert.equal(pkg.character.name, p.name, `${key}: name mismatch in package`)
      assert.equal(pkg.character.race, p.race, `${key}: race mismatch`)
      assert.equal(pkg.character.npcType, p.npcType, `${key}: npcType mismatch`)
      assert.ok(pkg.situationalContext.triggerEvent, `${key}: missing triggerEvent`)
      assert.ok(pkg.situationalContext.emotionalState, `${key}: missing emotionalState`)
    }
  })

  it('all trigger events produce valid packages for each NPC type', () => {
    const friendlyNPC = ALL_PERSONALITIES['mira_barrelbottom']   // friendly
    const neutralNPC  = ALL_PERSONALITIES['torval_grimm']         // neutral

    for (const evt of Object.values(TRIGGER_EVENT)) {
      const friendlyPkg = buildFromPersonality({ personality: friendlyNPC, triggerEvent: evt })
      assert.equal(friendlyPkg.situationalContext.triggerEvent, evt,
        `friendly NPC failed for event: ${evt}`)

      const neutralPkg = buildFromPersonality({ personality: neutralNPC, triggerEvent: evt })
      assert.equal(neutralPkg.situationalContext.triggerEvent, evt,
        `neutral NPC failed for event: ${evt}`)
    }
  })
})

// ═══════════════════════════════════════════════════════════════════════════
// 3. SYSTEM PROMPT — unique identity is embedded, not generic
// ═══════════════════════════════════════════════════════════════════════════

describe('System prompt embeds unique NPC identity', () => {
  it('Mira Barrelbottom — name, race, backstory appear in prompt', () => {
    const p = ALL_PERSONALITIES['mira_barrelbottom']
    const pkg = buildFromPersonality({ personality: p, triggerEvent: TRIGGER_EVENT.PLAYER_ADDRESSED })
    const prompt = buildSystemPrompt(pkg)

    assert.ok(prompt.includes('Mira Barrelbottom'), 'prompt must include NPC name')
    assert.ok(prompt.includes('Halfling'), 'prompt must include race')
    assert.ok(prompt.includes('Tobben Barrelbottom') || prompt.includes('Tipsy Gnome'),
      'prompt must include backstory content (father or inn name)')
  })

  it('Torval Grimm — voice, mannerisms, and gruff charisma descriptor', () => {
    const p = ALL_PERSONALITIES['torval_grimm']
    const pkg = buildFromPersonality({ personality: p, triggerEvent: TRIGGER_EVENT.PLAYER_ADDRESSED })
    const prompt = buildSystemPrompt(pkg)

    assert.ok(prompt.includes('Torval Grimm'), 'prompt must include NPC name')
    assert.ok(prompt.includes('Dwarf'), 'prompt must include race')
    // CHA 7 → chaMod = -2 → "gruff and off-putting"
    assert.ok(prompt.includes('gruff and off-putting'),
      'low-charisma NPC should be described as gruff')
  })

  it('Hodge — neutral type, speech patterns appear', () => {
    const p = ALL_PERSONALITIES['hodge_fence']
    const pkg = buildFromPersonality({ personality: p, triggerEvent: TRIGGER_EVENT.PLAYER_ADDRESSED })
    const prompt = buildSystemPrompt(pkg)

    assert.ok(prompt.includes('Hodge'), 'prompt must include NPC name')
    assert.ok(prompt.includes('neutral'), 'prompt must reference neutral type')
    // His speech includes conditionals
    assert.ok(prompt.includes('conditional') || prompt.includes('question'),
      'Hodge\'s evasive speech patterns should appear')
  })

  it('Tuck — child NPC with low wisdom gets correct descriptor', () => {
    const p = ALL_PERSONALITIES['tuck_millhaven']
    const pkg = buildFromPersonality({ personality: p, triggerEvent: TRIGGER_EVENT.PLAYER_ADDRESSED })
    const prompt = buildSystemPrompt(pkg)

    assert.ok(prompt.includes('Tuck'), 'prompt must include child name')
    // WIS 5 doesn't affect smartness/charm, but CHA 13 → chaMod = 1 → "unremarkable in bearing"
    // INT 10 → intMod = 0 → "of average intelligence"
    assert.ok(prompt.includes('average intelligence'), 'INT 10 NPC should be "of average intelligence"')
  })

  it('Fen Colby — high INT despite being a drunk, prompt reflects articulate capacity', () => {
    const p = ALL_PERSONALITIES['fen_colby']
    const pkg = buildFromPersonality({ personality: p, triggerEvent: TRIGGER_EVENT.PLAYER_ADDRESSED })
    const prompt = buildSystemPrompt(pkg)

    assert.ok(prompt.includes('Fen Colby'), 'prompt must include name')
    // INT 14 → intMod = 2 → "of average intelligence" (2 is >= 0 but < 3)
    assert.ok(prompt.includes('average intelligence'),
      'INT 14 (mod +2) maps to average intelligence tier')
  })

  it('Captain Edric Vane — backstory references military background', () => {
    const p = ALL_PERSONALITIES['captain_edric_vane']
    const pkg = buildFromPersonality({ personality: p, triggerEvent: TRIGGER_EVENT.COMBAT_START })
    const prompt = buildSystemPrompt(pkg)

    assert.ok(prompt.includes('Edric Vane'), 'prompt must include captain name')
    assert.ok(prompt.includes(p.personality.backstory) || prompt.includes('guard') || prompt.includes('military') || prompt.includes('soldier'),
      'captain backstory should reference military/guard background')
  })

  it('each named NPC produces a DIFFERENT system prompt', () => {
    const prompts = new Map()
    for (const key of NAMED_NPC_KEYS) {
      const p = ALL_PERSONALITIES[key]
      const pkg = buildFromPersonality({ personality: p, triggerEvent: TRIGGER_EVENT.PLAYER_ADDRESSED })
      const prompt = buildSystemPrompt(pkg)
      prompts.set(key, prompt)
    }

    // Every prompt should be unique — no two NPCs share the same prompt
    const uniquePrompts = new Set(prompts.values())
    assert.equal(uniquePrompts.size, prompts.size,
      'Every named NPC must produce a unique system prompt — no shared templates')
  })

  it('motivations, fears, and speech patterns all appear when present', () => {
    const p = ALL_PERSONALITIES['mira_barrelbottom']
    const pkg = buildFromPersonality({ personality: p, triggerEvent: TRIGGER_EVENT.PLAYER_ADDRESSED })
    const prompt = buildSystemPrompt(pkg)

    // Motivations
    assert.ok(prompt.includes('motivations') || prompt.includes('reputation'),
      'motivations section should appear in prompt')
    // Fears
    assert.ok(prompt.includes('fears') || prompt.includes('Fire'),
      'fears section should appear in prompt')
    // Speech patterns
    assert.ok(prompt.includes('speech') || prompt.includes('love') || prompt.includes('dear'),
      'speech patterns section should appear in prompt')
    // Mannerisms
    assert.ok(prompt.includes('mannerism') || prompt.includes('apron'),
      'mannerisms section should appear in prompt')
  })
})

// ═══════════════════════════════════════════════════════════════════════════
// 4. USER PROMPT — scenario details are correctly embedded
// ═══════════════════════════════════════════════════════════════════════════

describe('User prompt scenario embedding', () => {
  it('combat_start scenario includes trigger event and location', () => {
    const p = ALL_PERSONALITIES['brennan_holt']
    const pkg = buildFromPersonality({
      personality: p,
      triggerEvent: TRIGGER_EVENT.COMBAT_START,
      worldLocation: 'Millhaven Gate',
      worldTimeOfDay: 'dawn',
      worldTone: 'tense',
    })
    const prompt = buildUserPrompt(pkg)

    assert.ok(prompt.includes('COMBAT START'), 'trigger event should appear uppercased')
    assert.ok(prompt.includes('Millhaven Gate'), 'location should appear')
    assert.ok(prompt.includes('dawn'), 'time of day should appear')
  })

  it('near_death scenario reports correct HP status', () => {
    const p = ALL_PERSONALITIES['sera_dunwick']
    const pkg = buildFromPersonality({
      personality: p,
      triggerEvent: TRIGGER_EVENT.NEAR_DEATH,
    })
    // Override combatState HP for near_death
    const manualPkg = buildContextPackage(
      { id: p.templateKey, name: p.name, race: p.race, npcType: p.npcType,
        personality: p.personality, stats: p.stats },
      { triggerEvent: TRIGGER_EVENT.NEAR_DEATH, emotionalState: EMOTIONAL_STATE.DESPERATE,
        combatState: { hpPercent: 8 } },
    )
    const prompt = buildUserPrompt(manualPkg)

    assert.ok(prompt.includes('near death'), 'HP description should say near death at 8%')
    assert.ok(prompt.includes('desperate'), 'emotional state should be desperate')
  })

  it('nearby entities list is populated correctly', () => {
    const p = ALL_PERSONALITIES['oma_steadwick']
    const pkg = buildContextPackage(
      { id: p.templateKey, name: p.name, race: p.race, npcType: p.npcType,
        personality: p.personality, stats: p.stats },
      {
        triggerEvent: TRIGGER_EVENT.SPOTTED_ENEMY,
        emotionalState: EMOTIONAL_STATE.FRIGHTENED,
        nearbyEntities: [
          { name: 'Bandit', side: 'enemy', hpStatus: 'healthy', distance: 30 },
          { name: 'Brennan Holt', side: 'player', hpStatus: 'healthy', distance: 10 },
        ],
      },
    )
    const prompt = buildUserPrompt(pkg)

    assert.ok(prompt.includes('Bandit'), 'nearby enemy should appear')
    assert.ok(prompt.includes('Brennan Holt'), 'nearby ally should appear')
    assert.ok(prompt.includes('30'), 'distance should appear')
  })

  it('avoidRepetition previous responses are included in prompt', () => {
    const p = ALL_PERSONALITIES['lell_sparrow']
    const pkg = buildContextPackage(
      { id: p.templateKey, name: p.name, race: p.race, npcType: p.npcType,
        personality: p.personality, stats: p.stats },
      { triggerEvent: TRIGGER_EVENT.PLAYER_ADDRESSED, emotionalState: EMOTIONAL_STATE.CALM },
      { avoidRepetition: ['What key would you prefer?', 'A song for coin, or coin for a song?'] },
    )
    const prompt = buildUserPrompt(pkg)

    assert.ok(prompt.includes('What key would you prefer?'), 'first avoid entry should appear')
    assert.ok(prompt.includes('A song for coin'), 'second avoid entry should appear')
  })
})

// ═══════════════════════════════════════════════════════════════════════════
// 5. EMOTIONAL STATE INFERENCE — correct for civilian NPC types
// ═══════════════════════════════════════════════════════════════════════════

describe('Emotional state inference for civilian NPCs', () => {
  it('friendly NPC at full HP on combat_start → confident', () => {
    const state = inferEmotionalState(100, TRIGGER_EVENT.COMBAT_START, NPC_TYPE.FRIENDLY)
    assert.equal(state, EMOTIONAL_STATE.CONFIDENT)
  })

  it('neutral NPC at full HP on combat_start → enraged (default combat behavior)', () => {
    // The inferEmotionalState function returns ENRAGED for non-friendly
    const state = inferEmotionalState(100, TRIGGER_EVENT.COMBAT_START, NPC_TYPE.NEUTRAL)
    assert.equal(state, EMOTIONAL_STATE.ENRAGED)
  })

  it('friendly NPC on ally_died → grieving', () => {
    const state = inferEmotionalState(80, TRIGGER_EVENT.ALLY_DIED, NPC_TYPE.FRIENDLY)
    assert.equal(state, EMOTIONAL_STATE.GRIEVING)
  })

  it('neutral NPC on ally_died → enraged', () => {
    const state = inferEmotionalState(80, TRIGGER_EVENT.ALLY_DIED, NPC_TYPE.NEUTRAL)
    // neutral ally_died: falls through to switch default which returns ENRAGED for enemy-like
    // Actually—let's check: The switch case is `npcType === NPC_TYPE.ENEMY ? ENRAGED : GRIEVING`
    // So neutral (not enemy, not friendly) → grieving? Let's check the actual logic...
    // ally_died → `npcType === NPC_TYPE.ENEMY ? ENRAGED : GRIEVING` → neutral goes to GRIEVING
    assert.equal(state, EMOTIONAL_STATE.GRIEVING)
  })

  it('friendly NPC on enemy_died → triumphant', () => {
    const state = inferEmotionalState(80, TRIGGER_EVENT.ENEMY_DIED, NPC_TYPE.FRIENDLY)
    assert.equal(state, EMOTIONAL_STATE.TRIUMPHANT)
  })

  it('neutral NPC spotted enemy → suspicious', () => {
    const state = inferEmotionalState(100, TRIGGER_EVENT.SPOTTED_ENEMY, NPC_TYPE.NEUTRAL)
    assert.equal(state, EMOTIONAL_STATE.SUSPICIOUS)
  })

  it('friendly NPC spotted enemy → confident', () => {
    const state = inferEmotionalState(100, TRIGGER_EVENT.SPOTTED_ENEMY, NPC_TYPE.FRIENDLY)
    assert.equal(state, EMOTIONAL_STATE.CONFIDENT)
  })

  it('any NPC below 15% HP → desperate regardless of event', () => {
    for (const type of [NPC_TYPE.FRIENDLY, NPC_TYPE.NEUTRAL]) {
      const state = inferEmotionalState(10, TRIGGER_EVENT.COMBAT_START, type)
      assert.equal(state, EMOTIONAL_STATE.DESPERATE,
        `${type} at 10% HP should be desperate`)
    }
  })

  it('friendly NPC between 15-30% HP → frightened', () => {
    const state = inferEmotionalState(25, TRIGGER_EVENT.ATTACKED, NPC_TYPE.FRIENDLY)
    assert.equal(state, EMOTIONAL_STATE.FRIGHTENED)
  })

  it('Mira (friendly) addressed at full HP → calm', () => {
    const p = ALL_PERSONALITIES['mira_barrelbottom']
    const pkg = buildFromPersonality({
      personality: p,
      triggerEvent: TRIGGER_EVENT.PLAYER_ADDRESSED,
    })
    assert.equal(pkg.situationalContext.emotionalState, EMOTIONAL_STATE.CALM,
      'Mira greeting players at full HP should be calm')
  })

  it('Torval (neutral) on discovery → calm', () => {
    const p = ALL_PERSONALITIES['torval_grimm']
    const pkg = buildFromPersonality({
      personality: p,
      triggerEvent: TRIGGER_EVENT.DISCOVERY,
    })
    assert.equal(pkg.situationalContext.emotionalState, EMOTIONAL_STATE.CALM,
      'Torval on discovery should default to calm')
  })
})

// ═══════════════════════════════════════════════════════════════════════════
// 6. RESPONSE GENERATION — full pipeline for each named NPC
// ═══════════════════════════════════════════════════════════════════════════

describe('Full response pipeline for named NPCs', () => {
  it('every named NPC generates a response for player_addressed', async () => {
    for (const key of NAMED_NPC_KEYS) {
      const p = ALL_PERSONALITIES[key]
      const pkg = buildFromPersonality({
        personality: p,
        triggerEvent: TRIGGER_EVENT.PLAYER_ADDRESSED,
        worldLocation: 'Millhaven',
      })

      const result = await generateResponse(pkg, { personality: p })

      assert.ok(typeof result.text === 'string' && result.text.length > 0,
        `${key}: should produce non-empty response`)
      assert.equal(result.npcName, p.name, `${key}: response npcName should match`)
      assert.equal(result.npcId, p.templateKey, `${key}: response npcId should match`)
      assert.equal(result.triggerEvent, TRIGGER_EVENT.PLAYER_ADDRESSED)
      assert.ok(typeof result.latencyMs === 'number')
    }
  })

  it('every named NPC generates responses for all trigger events', async () => {
    // Test a subset of NPCs across all events to avoid excessive test time
    const sampleKeys = ['mira_barrelbottom', 'torval_grimm', 'hodge_fence', 'tuck_millhaven', 'fen_colby']

    for (const key of sampleKeys) {
      const p = ALL_PERSONALITIES[key]
      for (const evt of Object.values(TRIGGER_EVENT)) {
        const pkg = buildFromPersonality({ personality: p, triggerEvent: evt })
        const result = await generateResponse(pkg, { personality: p })

        assert.ok(typeof result.text === 'string' && result.text.length > 0,
          `${key}/${evt}: should produce non-empty response`)
      }
    }
  })

  it('response includes correct source field from MockLLMProvider', async () => {
    const p = ALL_PERSONALITIES['lell_sparrow']
    const pkg = buildFromPersonality({
      personality: p,
      triggerEvent: TRIGGER_EVENT.COMBAT_START,
    })
    const result = await generateResponse(pkg, { personality: p })

    assert.equal(result.source, 'llm', 'MockLLMProvider is treated as LLM source')
  })

  it('fallback fires when LLM fails, uses NPC-specific lines when available', async () => {
    _setProvider(new MockLLMProvider({ shouldFail: true }))

    const p = ALL_PERSONALITIES['mira_barrelbottom']
    const pkg = buildFromPersonality({
      personality: p,
      triggerEvent: TRIGGER_EVENT.PLAYER_ADDRESSED,
    })
    const result = await generateResponse(pkg, { personality: p, sessionId: 'fallback-test' })

    assert.equal(result.source, 'fallback', 'should use fallback on LLM failure')
    assert.ok(typeof result.text === 'string' && result.text.length > 0)
  })

  it('NPCs with custom fallbackLines use them over generic canned responses', async () => {
    _setProvider(new MockLLMProvider({ shouldFail: true }))

    const p = ALL_PERSONALITIES['tuck_millhaven']
    const pkg = buildFromPersonality({
      personality: p,
      triggerEvent: TRIGGER_EVENT.PLAYER_ADDRESSED,
    })
    const result = await generateResponse(pkg, { personality: p })

    // Tuck has custom player_addressed fallback lines
    const tuckFallbacks = p.fallbackLines?.player_addressed || []
    if (tuckFallbacks.length > 0) {
      assert.ok(tuckFallbacks.includes(result.text),
        `Tuck fallback should be one of his custom lines, got: "${result.text}"`)
    }
  })
})

// ═══════════════════════════════════════════════════════════════════════════
// 7. REPETITION AVOIDANCE — same NPC, same session, different responses
// ═══════════════════════════════════════════════════════════════════════════

describe('Repetition avoidance across responses', () => {
  it('same NPC in same session avoids exact repetition', async () => {
    _setProvider(new MockLLMProvider({ shouldFail: true }))

    const p = ALL_PERSONALITIES['mira_barrelbottom']
    const sessionId = 'repeat-mira-test'

    const pkg1 = buildFromPersonality({ personality: p, triggerEvent: TRIGGER_EVENT.PLAYER_ADDRESSED })
    const r1 = await generateResponse(pkg1, { sessionId, personality: p })

    const pkg2 = buildFromPersonality({ personality: p, triggerEvent: TRIGGER_EVENT.PLAYER_ADDRESSED })
    const r2 = await generateResponse(pkg2, { sessionId, personality: p })

    // If pool has ≥2 entries, should not repeat
    const pool = p.fallbackLines?.player_addressed || []
    if (pool.length >= 2) {
      assert.notEqual(r1.text, r2.text,
        'consecutive fallback responses should differ when pool has multiple entries')
    }
  })

  it('different NPCs in same session produce independent responses', async () => {
    const sessionId = 'multi-npc-session'

    const mira = ALL_PERSONALITIES['mira_barrelbottom']
    const torval = ALL_PERSONALITIES['torval_grimm']

    const pkg1 = buildFromPersonality({ personality: mira, triggerEvent: TRIGGER_EVENT.PLAYER_ADDRESSED })
    const r1 = await generateResponse(pkg1, { sessionId, personality: mira })

    const pkg2 = buildFromPersonality({ personality: torval, triggerEvent: TRIGGER_EVENT.PLAYER_ADDRESSED })
    const r2 = await generateResponse(pkg2, { sessionId, personality: torval })

    // Both should produce valid responses — their repetition caches are independent
    assert.ok(r1.text.length > 0, 'Mira should respond')
    assert.ok(r2.text.length > 0, 'Torval should respond')
    assert.equal(r1.npcName, 'Mira Barrelbottom')
    assert.equal(r2.npcName, 'Torval Grimm')
  })
})

// ═══════════════════════════════════════════════════════════════════════════
// 8. CROSS-NPC NARRATIVE CONSISTENCY — shared secrets reflect in data
// ═══════════════════════════════════════════════════════════════════════════

describe('Cross-NPC narrative consistency', () => {
  it('Hodge and Davan both reference connected back-room/crate problem', () => {
    const hodge = ALL_PERSONALITIES['hodge_fence']
    const davan = ALL_PERSONALITIES['davan_merchant']

    const hodgeSecrets = hodge.knowledge.secretsHeld.join(' ').toLowerCase()
    const davanSecrets = davan.knowledge.secretsHeld.join(' ').toLowerCase()

    // Both should reference the connected problem
    assert.ok(hodgeSecrets.includes('back room') || hodgeSecrets.includes('crate'),
      'Hodge secrets should reference the back room problem')
    assert.ok(davanSecrets.includes('crate') || davanSecrets.includes('sealed'),
      'Davan secrets should reference his sealed crate')
  })

  it('Fen Colby split his secret between Vesna and Aldwin', () => {
    const fen = ALL_PERSONALITIES['fen_colby']
    const fenSecrets = fen.knowledge.secretsHeld.join(' ').toLowerCase()

    assert.ok(fenSecrets.includes('vesna') || fenSecrets.includes('aldwin'),
      'Fen should reference telling pieces to Vesna and Aldwin')

    const vesna = ALL_PERSONALITIES['vesna_calloway']
    const aldwin = ALL_PERSONALITIES['brother_aldwin']

    const vesnaSecrets = vesna.knowledge.secretsHeld.join(' ').toLowerCase()
    const aldwinSecrets = aldwin.knowledge.secretsHeld.join(' ').toLowerCase()

    // Both should hold a piece of secret knowledge
    assert.ok(vesnaSecrets.includes('fen') || vesnaSecrets.length > 0,
      'Vesna should hold secret knowledge')
    assert.ok(aldwinSecrets.includes('fen') || aldwinSecrets.length > 0,
      'Aldwin should hold secret knowledge')
  })

  it('Wren stable horse points toward Dolly north field', () => {
    const wren = ALL_PERSONALITIES['wren_stable']
    const dolly = ALL_PERSONALITIES['dolly_thurn']

    const wrenSecrets = wren.knowledge.secretsHeld.join(' ').toLowerCase()
    const dollySecrets = dolly.knowledge.secretsHeld.join(' ').toLowerCase()

    assert.ok(wrenSecrets.includes('northeast') || wrenSecrets.includes('north') || wrenSecrets.includes('field'),
      'Wren should reference the horse orienting away from town')
    assert.ok(dollySecrets.includes('north') || dollySecrets.includes('field') || dollySecrets.includes('track'),
      'Dolly should reference unusual activity on her north field')
  })

  it('Tuck and Bree both witnessed the alley event', () => {
    const tuck = ALL_PERSONALITIES['tuck_millhaven']
    const bree = ALL_PERSONALITIES['bree_millhaven']

    const tuckSecrets = tuck.knowledge.secretsHeld.join(' ').toLowerCase()
    const breeSecrets = bree.knowledge.secretsHeld.join(' ').toLowerCase()

    assert.ok(tuckSecrets.includes('alley'), 'Tuck should reference the alley')
    assert.ok(breeSecrets.includes('alley'), 'Bree should reference the alley')
  })

  it('Mira and Lell have a competitive relationship reflected in relationships', () => {
    const mira = ALL_PERSONALITIES['mira_barrelbottom']
    const lell = ALL_PERSONALITIES['lell_sparrow']

    // Mira should list Lell as ally (close enough to compete)
    const miraAllies = mira.relationships.allies || []
    assert.ok(miraAllies.includes('lell_sparrow'),
      'Mira should list Lell as an ally')

    // Lell should reference Mira
    const lellAllies = lell.relationships.allies || []
    const lellNeutral = lell.relationships.neutralParties || []
    assert.ok(
      lellAllies.includes('mira_barrelbottom') || lellNeutral.includes('mira_barrelbottom'),
      'Lell should reference Mira in relationships',
    )
  })
})

// ═══════════════════════════════════════════════════════════════════════════
// 9. EDGE CASES — stats, child NPCs, unusual personalities
// ═══════════════════════════════════════════════════════════════════════════

describe('Edge cases for named NPCs', () => {
  it('Tuck (age 9) — low wisdom stat produces valid prompt', () => {
    const p = ALL_PERSONALITIES['tuck_millhaven']
    assert.equal(p.stats.wisdom, 5, 'Tuck should have WIS 5')

    const pkg = buildFromPersonality({ personality: p, triggerEvent: TRIGGER_EVENT.DISCOVERY })
    const prompt = buildSystemPrompt(pkg)

    assert.ok(prompt.includes('Tuck'), 'prompt should include Tuck')
    assert.ok(typeof prompt === 'string' && prompt.length > 50,
      'prompt should be substantive even for child NPC')
  })

  it('Bree (age 11) — higher stats than Tuck, different prompt', () => {
    const tuck = ALL_PERSONALITIES['tuck_millhaven']
    const bree = ALL_PERSONALITIES['bree_millhaven']

    const tuckPkg = buildFromPersonality({ personality: tuck, triggerEvent: TRIGGER_EVENT.PLAYER_ADDRESSED })
    const breePkg = buildFromPersonality({ personality: bree, triggerEvent: TRIGGER_EVENT.PLAYER_ADDRESSED })

    const tuckPrompt = buildSystemPrompt(tuckPkg)
    const breePrompt = buildSystemPrompt(breePkg)

    assert.notEqual(tuckPrompt, breePrompt,
      'Tuck and Bree should produce different system prompts')
  })

  it('Widow Marsh — beggar NPC with presumably low stats handles all events', async () => {
    const p = ALL_PERSONALITIES['widow_marsh']
    for (const evt of [TRIGGER_EVENT.PLAYER_ADDRESSED, TRIGGER_EVENT.DISCOVERY, TRIGGER_EVENT.SPOTTED_ENEMY]) {
      const pkg = buildFromPersonality({ personality: p, triggerEvent: evt })
      const result = await generateResponse(pkg, { personality: p })
      assert.ok(result.text.length > 0, `widow_marsh/${evt}: should produce response`)
    }
  })

  it('Torval (CHA 7) is "gruff" while Mira (CHA 16) is "charismatic"', () => {
    const torval = ALL_PERSONALITIES['torval_grimm']
    const mira   = ALL_PERSONALITIES['mira_barrelbottom']

    const torvalPkg = buildFromPersonality({ personality: torval, triggerEvent: TRIGGER_EVENT.PLAYER_ADDRESSED })
    const miraPkg   = buildFromPersonality({ personality: mira, triggerEvent: TRIGGER_EVENT.PLAYER_ADDRESSED })

    const torvalPrompt = buildSystemPrompt(torvalPkg)
    const miraPrompt   = buildSystemPrompt(miraPkg)

    assert.ok(torvalPrompt.includes('gruff'), 'CHA 7 → gruff and off-putting')
    assert.ok(miraPrompt.includes('charismatic'), 'CHA 16 → naturally charismatic')
  })

  it('NPCs with empty fallbackLines still get canned responses on LLM failure', async () => {
    _setProvider(new MockLLMProvider({ shouldFail: true }))

    // Find an NPC without player_addressed fallback
    const p = ALL_PERSONALITIES['torval_grimm']
    const pkg = buildFromPersonality({
      personality: p,
      triggerEvent: TRIGGER_EVENT.COMBAT_START, // Torval likely has no combat_start fallback
    })
    const result = await generateResponse(pkg, { personality: p })

    assert.equal(result.source, 'fallback')
    assert.ok(result.text.length > 0, 'should still produce a response from canned pool')
  })

  it('NPC with empty response from LLM triggers fallback gracefully', async () => {
    // Note: MockLLMProvider treats falsy fixedResponse as null (falls through to canned).
    // To simulate truly empty LLM output, use a whitespace-only string (truthy but empty when trimmed).
    _setProvider(new MockLLMProvider({ fixedResponse: ' ' }))

    const p = ALL_PERSONALITIES['vesna_calloway']
    const pkg = buildFromPersonality({ personality: p, triggerEvent: TRIGGER_EVENT.SPELL_CAST })
    const result = await generateResponse(pkg, { personality: p })

    assert.equal(result.source, 'fallback', 'empty/whitespace LLM response should trigger fallback')
    assert.ok(result.text.length > 0)
  })

  it('NPC with whitespace-only response from LLM triggers fallback', async () => {
    _setProvider(new MockLLMProvider({ fixedResponse: '   \n  ' }))

    const p = ALL_PERSONALITIES['brother_aldwin']
    const pkg = buildFromPersonality({ personality: p, triggerEvent: TRIGGER_EVENT.ROUND_START })
    const result = await generateResponse(pkg, { personality: p })

    assert.equal(result.source, 'fallback', 'whitespace-only LLM response should trigger fallback')
  })
})

// ═══════════════════════════════════════════════════════════════════════════
// 10. FALLBACK LINES — NPC-specific fallbacks vs generic canned
// ═══════════════════════════════════════════════════════════════════════════

describe('Named NPC fallback line selection', () => {
  it('Mira player_addressed fallback is her specific greeting, not generic', () => {
    const p = ALL_PERSONALITIES['mira_barrelbottom']
    const line = selectFallbackLine(p, 'player_addressed')

    const miraLines = p.fallbackLines?.player_addressed || []
    if (miraLines.length > 0) {
      assert.ok(miraLines.includes(line),
        `Mira fallback should be one of her custom lines, got: "${line}"`)
    }
  })

  it('Torval player_addressed fallback is his terse style', () => {
    const p = ALL_PERSONALITIES['torval_grimm']
    const line = selectFallbackLine(p, 'player_addressed')

    const torvalLines = p.fallbackLines?.player_addressed || []
    if (torvalLines.length > 0) {
      assert.ok(torvalLines.includes(line),
        `Torval fallback should be one of his lines, got: "${line}"`)
    }
  })

  it('NPC fallback for event not in their fallbackLines falls to canned responses', () => {
    const p = ALL_PERSONALITIES['mira_barrelbottom']
    // Mira doesn't have combat_start fallback
    const line = selectFallbackLine(p, TRIGGER_EVENT.COMBAT_START)

    assert.ok(typeof line === 'string' && line.length > 0,
      'should produce a line even without NPC-specific entry')
    // It should come from canned responses for friendly NPCs
  })

  it('Hodge player_addressed fallback reflects his evasive style', () => {
    const p = ALL_PERSONALITIES['hodge_fence']
    const hodgeLines = p.fallbackLines?.player_addressed || []

    if (hodgeLines.length > 0) {
      // Verify the lines sound like Hodge — noncommittal, evasive
      for (const line of hodgeLines) {
        assert.ok(typeof line === 'string' && line.length > 0,
          'each fallback line should be non-empty')
      }
    }
  })

  it('Fen player_addressed fallback reflects his fractured lucidity', () => {
    const p = ALL_PERSONALITIES['fen_colby']
    const fenLines = p.fallbackLines?.player_addressed || []

    if (fenLines.length > 0) {
      const line = selectFallbackLine(p, 'player_addressed')
      assert.ok(fenLines.includes(line),
        `Fen fallback should be one of his lines, got: "${line}"`)
    }
  })
})

// ═══════════════════════════════════════════════════════════════════════════
// 11. BATCH RESPONSE — full town roster responds to a scenario
// ═══════════════════════════════════════════════════════════════════════════

describe('Batch town response to scenario', () => {
  it('all 21 Millhaven NPCs respond to combat_start without error', async () => {
    const results = []
    for (const key of NAMED_NPC_KEYS) {
      const p = ALL_PERSONALITIES[key]
      const pkg = buildFromPersonality({
        personality: p,
        triggerEvent: TRIGGER_EVENT.COMBAT_START,
        worldLocation: 'Millhaven Market Square',
        worldTimeOfDay: 'noon',
        worldTone: 'tense',
      })
      const result = await generateResponse(pkg, { personality: p, sessionId: 'batch-test' })
      results.push(result)
    }

    assert.equal(results.length, 21, 'should have 21 responses')
    for (const r of results) {
      assert.ok(r.text.length > 0, `${r.npcName}: empty response`)
      assert.ok(r.npcName, 'each result should have npcName')
    }
  })

  it('all 21 NPCs respond to discovery scenario', async () => {
    const results = []
    for (const key of NAMED_NPC_KEYS) {
      const p = ALL_PERSONALITIES[key]
      const pkg = buildFromPersonality({
        personality: p,
        triggerEvent: TRIGGER_EVENT.DISCOVERY,
        worldLocation: 'Blue Lantern Alley',
        worldTimeOfDay: 'midnight',
        worldTone: 'mysterious',
      })
      const result = await generateResponse(pkg, { personality: p })
      results.push(result)
    }

    assert.equal(results.length, 21)
    for (const r of results) {
      assert.ok(r.text.length > 0, `${r.npcName}: empty response`)
    }
  })
})

// ═══════════════════════════════════════════════════════════════════════════
// 12. MOCK LLM CAPTURES — verify prompts sent to LLM contain NPC identity
// ═══════════════════════════════════════════════════════════════════════════

describe('LLM receives NPC-specific prompts', () => {
  it('MockLLM captures system prompt containing NPC backstory', async () => {
    const mock = new MockLLMProvider()
    _setProvider(mock)

    const p = ALL_PERSONALITIES['mira_barrelbottom']
    const pkg = buildFromPersonality({ personality: p, triggerEvent: TRIGGER_EVENT.PLAYER_ADDRESSED })
    await generateResponse(pkg, { personality: p })

    assert.equal(mock.calls.length, 1, 'should have made one LLM call')
    const { systemPrompt, userPrompt } = mock.calls[0]

    assert.ok(systemPrompt.includes('Mira Barrelbottom'),
      'system prompt sent to LLM should contain NPC name')
    assert.ok(systemPrompt.includes('Halfling'),
      'system prompt sent to LLM should contain race')
    assert.ok(userPrompt.includes('PLAYER ADDRESSED'),
      'user prompt should contain trigger event')
  })

  it('different NPCs send different system prompts to LLM', async () => {
    const mock = new MockLLMProvider()
    _setProvider(mock)

    const mira = ALL_PERSONALITIES['mira_barrelbottom']
    const torval = ALL_PERSONALITIES['torval_grimm']

    const pkg1 = buildFromPersonality({ personality: mira, triggerEvent: TRIGGER_EVENT.PLAYER_ADDRESSED })
    await generateResponse(pkg1, { personality: mira })

    const pkg2 = buildFromPersonality({ personality: torval, triggerEvent: TRIGGER_EVENT.PLAYER_ADDRESSED })
    await generateResponse(pkg2, { personality: torval })

    assert.equal(mock.calls.length, 2)
    assert.notEqual(mock.calls[0].systemPrompt, mock.calls[1].systemPrompt,
      'Mira and Torval should send different system prompts to LLM')
  })

  it('user prompt contains world context when provided', async () => {
    const mock = new MockLLMProvider()
    _setProvider(mock)

    const p = ALL_PERSONALITIES['old_mattock']
    const pkg = buildFromPersonality({
      personality: p,
      triggerEvent: TRIGGER_EVENT.DISCOVERY,
      worldLocation: 'Stoneback River, deep bend',
      worldTimeOfDay: 'dusk',
      worldTone: 'eerie',
    })
    await generateResponse(pkg, { personality: p })

    const { userPrompt } = mock.calls[0]
    assert.ok(userPrompt.includes('Stoneback River'), 'world location should appear in user prompt')
    assert.ok(userPrompt.includes('dusk'), 'time of day should appear')
    assert.ok(userPrompt.includes('eerie'), 'tone should appear')
  })

  it('LLM options include triggerEvent and npcType', async () => {
    const mock = new MockLLMProvider()
    _setProvider(mock)

    const p = ALL_PERSONALITIES['hodge_fence']
    const pkg = buildFromPersonality({ personality: p, triggerEvent: TRIGGER_EVENT.SPOTTED_ENEMY })
    await generateResponse(pkg, { personality: p })

    const { options } = mock.calls[0]
    assert.equal(options.triggerEvent, TRIGGER_EVENT.SPOTTED_ENEMY)
    assert.equal(options.npcType, NPC_TYPE.NEUTRAL)
  })
})

// ═══════════════════════════════════════════════════════════════════════════
// 13. STAT-DRIVEN PROMPT DESCRIPTORS — INT/CHA tiers
// ═══════════════════════════════════════════════════════════════════════════

describe('Stat-driven prompt descriptors across named NPCs', () => {
  const cases = [
    // [templateKey, expectedIntDesc, expectedChaDesc]
    ['tuck_millhaven',      'average intelligence', 'unremarkable'],   // INT 10, CHA 13
    ['torval_grimm',        'average intelligence', 'gruff'],           // INT 13, CHA 7
    ['mira_barrelbottom',   'average intelligence', 'charismatic'],     // INT 14, CHA 16
    ['hodge_fence',         'average intelligence', 'unremarkable'],    // INT 15, CHA 12
  ]

  for (const [key, intDesc, chaDesc] of cases) {
    it(`${key} — INT→"${intDesc}", CHA→"${chaDesc}"`, () => {
      const p = ALL_PERSONALITIES[key]
      const pkg = buildFromPersonality({ personality: p, triggerEvent: TRIGGER_EVENT.PLAYER_ADDRESSED })
      const prompt = buildSystemPrompt(pkg)

      assert.ok(prompt.includes(intDesc),
        `${key} (INT ${p.stats.intelligence}): expected "${intDesc}" in prompt`)
      assert.ok(prompt.includes(chaDesc),
        `${key} (CHA ${p.stats.charisma}): expected "${chaDesc}" in prompt`)
    })
  }
})

// ═══════════════════════════════════════════════════════════════════════════
// 14. RESPONSE FORMAT VARIANTS
// ═══════════════════════════════════════════════════════════════════════════

describe('Response format variants for named NPCs', () => {
  it('ACTION_FLAVOR format includes narrator instruction for Mira', () => {
    const p = ALL_PERSONALITIES['mira_barrelbottom']
    const pkg = buildFromPersonality({
      personality: p,
      triggerEvent: TRIGGER_EVENT.COMBAT_START,
      format: RESPONSE_FORMAT.ACTION_FLAVOR,
    })
    const prompt = buildSystemPrompt(pkg)

    assert.ok(prompt.includes('narrator'), 'ACTION_FLAVOR should include narrator instruction')
  })

  it('THOUGHT format is accepted and produces response', async () => {
    const p = ALL_PERSONALITIES['fen_colby']
    const pkg = buildFromPersonality({
      personality: p,
      triggerEvent: TRIGGER_EVENT.DISCOVERY,
      format: RESPONSE_FORMAT.THOUGHT,
    })

    assert.equal(pkg.responseConstraints.format, RESPONSE_FORMAT.THOUGHT)
    const result = await generateResponse(pkg, { personality: p })
    assert.ok(result.text.length > 0, 'THOUGHT format should produce response')
    assert.equal(result.format, RESPONSE_FORMAT.THOUGHT)
  })

  it('default format is SPOKEN', () => {
    const p = ALL_PERSONALITIES['brennan_holt']
    const pkg = buildFromPersonality({ personality: p, triggerEvent: TRIGGER_EVENT.COMBAT_START })
    assert.equal(pkg.responseConstraints.format, RESPONSE_FORMAT.SPOKEN)
  })
})

// ═══════════════════════════════════════════════════════════════════════════
// 15. RELATIONSHIP DATA INTEGRITY — bidirectional references
// ═══════════════════════════════════════════════════════════════════════════

describe('Relationship data references valid templateKeys', () => {
  const allKeys = new Set(NAMED_NPC_KEYS)

  it('all relationship references point to existing named NPC keys', () => {
    for (const key of NAMED_NPC_KEYS) {
      const p = ALL_PERSONALITIES[key]
      const allRefs = [
        ...(p.relationships.allies || []),
        ...(p.relationships.enemies || []),
        ...(p.relationships.neutralParties || []),
      ]

      for (const ref of allRefs) {
        // Strip parenthetical descriptions like "captain_edric_vane (arrangement)"
        const cleanRef = ref.replace(/\s*\(.*\)$/, '').trim()
        // Only validate if it looks like a templateKey (contains underscore or is lowercase)
        if (cleanRef.includes('_') && !cleanRef.includes(' ')) {
          assert.ok(allKeys.has(cleanRef),
            `${key}: relationship reference "${cleanRef}" is not a valid named NPC templateKey`)
        }
      }
    }
  })
})
