/**
 * Character AI — Unit Tests
 *
 * Tests CharacterContextBuilder and CharacterResponseService using MockLLMProvider.
 * No database connection, no model download, no running server required.
 *
 * Run with:
 *   node --test server/combat/__tests__/characterContext.test.js
 */

'use strict'

const { describe, it, beforeEach, afterEach } = require('node:test')
const assert = require('node:assert/strict')

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
  CANNED_RESPONSES,
} = require('../../llm/MockLLMProvider')

const {
  buildFromPersonality,
  inferEmotionalState,
  hpStatus,
  extractRecentEvents,
} = require('../../services/CharacterContextBuilder')

const {
  generateResponse,
  selectFallbackLine,
  _clearAllCaches,
  _setProvider,
} = require('../../services/CharacterResponseService')

// ═══════════════════════════════════════════════════════════════════════════
// FIXTURES
// ═══════════════════════════════════════════════════════════════════════════

function makePersonality(overrides = {}) {
  return {
    templateKey: 'zombie',
    name:        'Rotting Corpse',
    race:        'Undead',
    npcType:     NPC_TYPE.ENEMY,
    personality: {
      voice:          'feral',
      alignment:      'chaotic evil',
      disposition:    'hostile',
      backstory:      'A fallen soldier raised by dark magic. It remembers nothing.',
      speechPatterns: ['moans rather than speaks', 'repeats single words'],
      motivations:    ['feed', 'obey master'],
      fears:          ['fire', 'sunlight'],
      mannerisms:     ['shuffles slowly', 'tilts head at loud sounds'],
    },
    knowledge: {
      knownFactions:  [],
      knownLocations: ['crypt'],
      secretsHeld:    [],
      languagesSpoken: [],
    },
    relationships: {
      allies:         ['necromancer'],
      enemies:        ['living creatures'],
      neutralParties: [],
    },
    stats: { intelligence: 3, wisdom: 6, charisma: 5 },
    fallbackLines: {
      [TRIGGER_EVENT.COMBAT_START]: ['Braaaains...', 'Ughhh...'],
      [TRIGGER_EVENT.ATTACKED]:     ['Rrrghhh!'],
    },
    ...overrides,
  }
}

function makeLichPersonality(overrides = {}) {
  return {
    templateKey: 'lich',
    name:        'Acererak',
    race:        'Undead (Lich)',
    npcType:     NPC_TYPE.ENEMY,
    personality: {
      voice:          'eloquent',
      alignment:      'neutral evil',
      disposition:    'hostile',
      backstory:      'A wizard who sacrificed his mortality to achieve undying power. He views all life as an obstacle.',
      speechPatterns: ['speaks in cryptic riddles', 'uses archaic vocabulary', 'refers to victims as "insects"'],
      motivations:    ['eternal dominion', 'accumulation of forbidden knowledge'],
      fears:          ['true death', 'the loss of his phylactery'],
      mannerisms:     ['slowly drums skeletal fingers', 'pauses dramatically before speaking'],
    },
    knowledge: {
      knownFactions:  ['Harpers', 'Zhentarim', 'Arcane Brotherhood'],
      knownLocations: ['Tomb of Annihilation', 'Crypt of the Undying'],
      secretsHeld:    ['location of the phylactery'],
      languagesSpoken: ['Common', 'Abyssal', 'Infernal', 'Elvish', 'Draconic'],
    },
    relationships: {
      allies:         ['undead minions'],
      enemies:        ['paladins', 'clerics', 'adventurers'],
      neutralParties: ['other lichs'],
    },
    stats: { intelligence: 20, wisdom: 17, charisma: 16 },
    fallbackLines: {},
    ...overrides,
  }
}

function makeFriendlyNPC(overrides = {}) {
  return {
    templateKey: 'inn_keeper',
    name:        'Mira Barrelbottom',
    race:        'Halfling',
    npcType:     NPC_TYPE.FRIENDLY,
    personality: {
      voice:          'cheerful',
      alignment:      'neutral good',
      disposition:    'friendly',
      backstory:      'A retired adventurer who settled down to run the Tipsy Gnome inn. She still keeps a shortsword under the bar.',
      speechPatterns: [],
      motivations:    ['protect her patrons', 'keep the peace'],
      fears:          ['fire (her inn burned down once)', 'hobgoblins'],
      mannerisms:     ['wipes hands on apron when nervous'],
    },
    knowledge: {
      knownFactions:  ['Lords Alliance'],
      knownLocations: ['Waterdeep', 'Baldurs Gate'],
      secretsHeld:    [],
      languagesSpoken: ['Common', 'Halfling'],
    },
    relationships: {
      allies:         ['town guard', 'players'],
      enemies:        ['local thieves guild'],
      neutralParties: [],
    },
    stats: { intelligence: 11, wisdom: 13, charisma: 14 },
    fallbackLines: {},
    ...overrides,
  }
}

// ═══════════════════════════════════════════════════════════════════════════
// RESET BETWEEN TESTS
// ═══════════════════════════════════════════════════════════════════════════

beforeEach(() => {
  resetPickIndex()
  _clearAllCaches()
  // Inject a fresh mock provider for every test
  _setProvider(new MockLLMProvider())
})

afterEach(() => {
  // Reset provider so next test gets a clean slate
  _setProvider(new MockLLMProvider())
})

// ═══════════════════════════════════════════════════════════════════════════
// CharacterContextPackage — Schema validation
// ═══════════════════════════════════════════════════════════════════════════

describe('CharacterContextPackage.buildContextPackage', () => {
  it('builds a valid package with minimal required fields', () => {
    const pkg = buildContextPackage(
      { id: 'zombie-1', name: 'Zombie', race: 'Undead', npcType: NPC_TYPE.ENEMY },
      { triggerEvent: TRIGGER_EVENT.COMBAT_START, emotionalState: EMOTIONAL_STATE.ENRAGED },
    )

    assert.equal(pkg.character.id, 'zombie-1')
    assert.equal(pkg.character.name, 'Zombie')
    assert.equal(pkg.character.npcType, NPC_TYPE.ENEMY)
    assert.equal(pkg.situationalContext.triggerEvent, TRIGGER_EVENT.COMBAT_START)
    assert.equal(pkg.situationalContext.emotionalState, EMOTIONAL_STATE.ENRAGED)
    assert.equal(pkg.responseConstraints.maxTokens, 60)
    assert.equal(pkg.responseConstraints.format, RESPONSE_FORMAT.SPOKEN)
  })

  it('defaults empty arrays for lists not provided', () => {
    const pkg = buildContextPackage(
      { id: 'z', name: 'Z', race: 'U', npcType: NPC_TYPE.ENEMY },
      { triggerEvent: TRIGGER_EVENT.ATTACKED, emotionalState: EMOTIONAL_STATE.CALM },
    )
    assert.deepEqual(pkg.character.personality.speechPatterns, [])
    assert.deepEqual(pkg.character.personality.motivations, [])
    assert.deepEqual(pkg.situationalContext.nearbyEntities, [])
    assert.deepEqual(pkg.responseConstraints.avoidRepetition, [])
  })

  it('throws when id is missing', () => {
    assert.throws(
      () => buildContextPackage(
        { name: 'Z', race: 'U', npcType: NPC_TYPE.ENEMY },
        { triggerEvent: TRIGGER_EVENT.COMBAT_START, emotionalState: EMOTIONAL_STATE.CALM },
      ),
      /character\.id must be a non-empty string/,
    )
  })

  it('throws on invalid npcType', () => {
    assert.throws(
      () => buildContextPackage(
        { id: 'z', name: 'Z', race: 'U', npcType: 'villain' },
        { triggerEvent: TRIGGER_EVENT.COMBAT_START, emotionalState: EMOTIONAL_STATE.CALM },
      ),
      /character\.npcType must be one of/,
    )
  })

  it('throws on invalid triggerEvent', () => {
    assert.throws(
      () => buildContextPackage(
        { id: 'z', name: 'Z', race: 'U', npcType: NPC_TYPE.ENEMY },
        { triggerEvent: 'when_i_feel_like_it', emotionalState: EMOTIONAL_STATE.CALM },
      ),
      /triggerEvent must be one of/,
    )
  })

  it('throws on invalid emotionalState', () => {
    assert.throws(
      () => buildContextPackage(
        { id: 'z', name: 'Z', race: 'U', npcType: NPC_TYPE.ENEMY },
        { triggerEvent: TRIGGER_EVENT.COMBAT_START, emotionalState: 'excited' },
      ),
      /emotionalState must be one of/,
    )
  })

  it('accepts all valid triggerEvent values', () => {
    for (const evt of Object.values(TRIGGER_EVENT)) {
      const pkg = buildContextPackage(
        { id: 'z', name: 'Z', race: 'U', npcType: NPC_TYPE.ENEMY },
        { triggerEvent: evt, emotionalState: EMOTIONAL_STATE.CALM },
      )
      assert.equal(pkg.situationalContext.triggerEvent, evt)
    }
  })

  it('respects custom maxTokens and format', () => {
    const pkg = buildContextPackage(
      { id: 'z', name: 'Z', race: 'U', npcType: NPC_TYPE.ENEMY },
      { triggerEvent: TRIGGER_EVENT.COMBAT_START, emotionalState: EMOTIONAL_STATE.CALM },
      { maxTokens: 120, format: RESPONSE_FORMAT.ACTION_FLAVOR },
    )
    assert.equal(pkg.responseConstraints.maxTokens, 120)
    assert.equal(pkg.responseConstraints.format, RESPONSE_FORMAT.ACTION_FLAVOR)
  })
})

// ═══════════════════════════════════════════════════════════════════════════
// CharacterContextPackage — Prompt builders
// ═══════════════════════════════════════════════════════════════════════════

describe('buildSystemPrompt', () => {
  it('includes name and race', () => {
    const pkg = buildContextPackage(
      { id: 'lich-1', name: 'Acererak', race: 'Lich', npcType: NPC_TYPE.ENEMY,
        personality: { alignment: 'neutral evil', disposition: 'hostile',
          backstory: 'An ancient lich of terrifying power.',
          speechPatterns: ['speaks in cryptic riddles'] } },
      { triggerEvent: TRIGGER_EVENT.COMBAT_START, emotionalState: EMOTIONAL_STATE.CALM },
    )
    const prompt = buildSystemPrompt(pkg)
    assert.ok(prompt.includes('Acererak'), 'name should appear in system prompt')
    assert.ok(prompt.includes('Lich'), 'race should appear in system prompt')
    assert.ok(prompt.includes('cryptic riddles'), 'speech patterns should appear')
    assert.ok(prompt.includes('neutral evil'), 'alignment should appear')
  })

  it('includes "barely coherent" for very low intelligence', () => {
    const pkg = buildContextPackage(
      { id: 'z', name: 'Zombie', race: 'Undead', npcType: NPC_TYPE.ENEMY,
        stats: { intelligence: 3, wisdom: 6, charisma: 5 } },
      { triggerEvent: TRIGGER_EVENT.COMBAT_START, emotionalState: EMOTIONAL_STATE.ENRAGED },
    )
    const prompt = buildSystemPrompt(pkg)
    assert.ok(prompt.includes('barely coherent'), 'low INT NPCs should be described as barely coherent')
  })

  it('uses narrator instruction for ACTION_FLAVOR format', () => {
    const pkg = buildContextPackage(
      { id: 'z', name: 'Z', race: 'U', npcType: NPC_TYPE.ENEMY },
      { triggerEvent: TRIGGER_EVENT.COMBAT_START, emotionalState: EMOTIONAL_STATE.CALM },
      { format: RESPONSE_FORMAT.ACTION_FLAVOR },
    )
    const prompt = buildSystemPrompt(pkg)
    assert.ok(prompt.includes('narrator style'), 'action_flavor format should include narrator instruction')
  })
})

describe('buildUserPrompt', () => {
  it('includes trigger event and emotional state', () => {
    const pkg = buildContextPackage(
      { id: 'z', name: 'Z', race: 'U', npcType: NPC_TYPE.ENEMY },
      { triggerEvent: TRIGGER_EVENT.NEAR_DEATH, emotionalState: EMOTIONAL_STATE.DESPERATE,
        combatState: { hpPercent: 10 } },
    )
    const prompt = buildUserPrompt(pkg)
    assert.ok(prompt.includes('NEAR DEATH'), 'trigger event should appear uppercased')
    assert.ok(prompt.includes('desperate'), 'emotional state should appear')
  })

  it('lists nearby entities', () => {
    const pkg = buildContextPackage(
      { id: 'z', name: 'Z', race: 'U', npcType: NPC_TYPE.ENEMY },
      {
        triggerEvent: TRIGGER_EVENT.ATTACKED,
        emotionalState: EMOTIONAL_STATE.ENRAGED,
        nearbyEntities: [
          { name: 'Bard', side: 'player', hpStatus: 'healthy', distance: 10 },
          { name: 'Warrior', side: 'player', hpStatus: 'wounded', distance: 5 },
        ],
      },
    )
    const prompt = buildUserPrompt(pkg)
    assert.ok(prompt.includes('Bard'), 'nearby entity name should appear in prompt')
    assert.ok(prompt.includes('Warrior'), 'second entity should appear in prompt')
  })

  it('includes avoidRepetition list', () => {
    const pkg = buildContextPackage(
      { id: 'z', name: 'Z', race: 'U', npcType: NPC_TYPE.ENEMY },
      { triggerEvent: TRIGGER_EVENT.COMBAT_START, emotionalState: EMOTIONAL_STATE.CALM },
      { avoidRepetition: ['You will die here.'] },
    )
    const prompt = buildUserPrompt(pkg)
    assert.ok(prompt.includes('You will die here.'), 'avoidRepetition entries should appear in prompt')
  })
})

// ═══════════════════════════════════════════════════════════════════════════
// CharacterContextBuilder
// ═══════════════════════════════════════════════════════════════════════════

describe('CharacterContextBuilder.inferEmotionalState', () => {
  it('returns desperate below 15% HP', () => {
    assert.equal(inferEmotionalState(10, TRIGGER_EVENT.COMBAT_START, NPC_TYPE.ENEMY), EMOTIONAL_STATE.DESPERATE)
  })

  it('returns enraged for enemy between 15–30% HP', () => {
    assert.equal(inferEmotionalState(20, TRIGGER_EVENT.COMBAT_START, NPC_TYPE.ENEMY), EMOTIONAL_STATE.ENRAGED)
  })

  it('returns frightened for friendly between 15–30% HP', () => {
    assert.equal(inferEmotionalState(20, TRIGGER_EVENT.COMBAT_START, NPC_TYPE.FRIENDLY), EMOTIONAL_STATE.FRIGHTENED)
  })

  it('returns grieving for friendly on ally_died', () => {
    assert.equal(inferEmotionalState(80, TRIGGER_EVENT.ALLY_DIED, NPC_TYPE.FRIENDLY), EMOTIONAL_STATE.GRIEVING)
  })

  it('returns triumphant for friendly on enemy_died', () => {
    assert.equal(inferEmotionalState(80, TRIGGER_EVENT.ENEMY_DIED, NPC_TYPE.FRIENDLY), EMOTIONAL_STATE.TRIUMPHANT)
  })

  it('returns suspicious for neutral on spotted_enemy', () => {
    assert.equal(inferEmotionalState(100, TRIGGER_EVENT.SPOTTED_ENEMY, NPC_TYPE.NEUTRAL), EMOTIONAL_STATE.SUSPICIOUS)
  })
})

describe('CharacterContextBuilder.hpStatus', () => {
  it('returns healthy at full HP', () => {
    assert.equal(hpStatus(100, 100), 'healthy')
  })
  it('returns wounded at 60%', () => {
    assert.equal(hpStatus(60, 100), 'wounded')
  })
  it('returns bloody at 30%', () => {
    assert.equal(hpStatus(30, 100), 'bloody')
  })
  it('returns near-death at 5%', () => {
    assert.equal(hpStatus(5, 100), 'near-death')
  })
  it('returns down at 0 HP', () => {
    assert.equal(hpStatus(0, 100), 'down')
  })
  it('handles maxHP === 0 gracefully', () => {
    assert.equal(hpStatus(0, 0), 'unknown')
  })
})

describe('CharacterContextBuilder.buildFromPersonality', () => {
  it('builds a valid package from personality record', () => {
    const personality = makePersonality()
    const pkg = buildFromPersonality({
      personality,
      triggerEvent: TRIGGER_EVENT.COMBAT_START,
    })

    assert.equal(pkg.character.name, 'Rotting Corpse')
    assert.equal(pkg.character.race, 'Undead')
    assert.equal(pkg.character.npcType, NPC_TYPE.ENEMY)
    assert.equal(pkg.situationalContext.triggerEvent, TRIGGER_EVENT.COMBAT_START)
    assert.ok(typeof pkg.situationalContext.emotionalState === 'string')
  })

  it('throws when personality is missing', () => {
    assert.throws(
      () => buildFromPersonality({ triggerEvent: TRIGGER_EVENT.COMBAT_START }),
      /personality is required/,
    )
  })

  it('throws when triggerEvent is missing', () => {
    assert.throws(
      () => buildFromPersonality({ personality: makePersonality() }),
      /triggerEvent is required/,
    )
  })

  it('uses provided emotionalState over inferred', () => {
    const pkg = buildFromPersonality({
      personality:    makePersonality(),
      triggerEvent:   TRIGGER_EVENT.COMBAT_START,
      emotionalState: EMOTIONAL_STATE.CALM,
    })
    assert.equal(pkg.situationalContext.emotionalState, EMOTIONAL_STATE.CALM)
  })

  it('applies world context fields', () => {
    const pkg = buildFromPersonality({
      personality:   makePersonality(),
      triggerEvent:  TRIGGER_EVENT.COMBAT_START,
      worldLocation:  'haunted crypt',
      worldTimeOfDay: 'midnight',
      worldTone:      'horrifying',
    })
    assert.equal(pkg.situationalContext.worldContext.location, 'haunted crypt')
    assert.equal(pkg.situationalContext.worldContext.timeOfDay, 'midnight')
    assert.equal(pkg.situationalContext.worldContext.tone, 'horrifying')
  })

  it('builds correct context for high-INT lich personality', () => {
    const personality = makeLichPersonality()
    const pkg = buildFromPersonality({
      personality,
      triggerEvent: TRIGGER_EVENT.PLAYER_ADDRESSED,
    })
    assert.equal(pkg.character.stats.intelligence, 20)
    // High INT → system prompt should say "highly intelligent"
    const systemPrompt = buildSystemPrompt(pkg)
    assert.ok(systemPrompt.includes('highly intelligent'), 'lich should be described as highly intelligent')
  })

  it('works for friendly NPC', () => {
    const pkg = buildFromPersonality({
      personality:  makeFriendlyNPC(),
      triggerEvent: TRIGGER_EVENT.ENEMY_DIED,
    })
    assert.equal(pkg.character.npcType, NPC_TYPE.FRIENDLY)
    assert.equal(pkg.situationalContext.emotionalState, EMOTIONAL_STATE.TRIUMPHANT)
  })

  it('handles personality without fallbackLines gracefully', () => {
    const personality = makePersonality({ fallbackLines: undefined })
    assert.doesNotThrow(() => {
      buildFromPersonality({ personality, triggerEvent: TRIGGER_EVENT.COMBAT_START })
    })
  })
})

// ═══════════════════════════════════════════════════════════════════════════
// CharacterResponseService — selectFallbackLine
// ═══════════════════════════════════════════════════════════════════════════

describe('CharacterResponseService.selectFallbackLine', () => {
  it('returns a line from personality fallbackLines when available', () => {
    const personality = makePersonality()
    const line = selectFallbackLine(personality, TRIGGER_EVENT.COMBAT_START)
    assert.ok(
      ['Braaaains...', 'Ughhh...'].includes(line),
      `expected a zombie combat_start line, got: ${line}`,
    )
  })

  it('falls back to global CANNED_RESPONSES when personality has no entry for event', () => {
    const personality = makePersonality()
    // near_death not in personality's fallbackLines
    const line = selectFallbackLine(personality, TRIGGER_EVENT.NEAR_DEATH)
    assert.ok(typeof line === 'string' && line.length > 0, 'should return a non-empty string')
  })

  it('respects avoidList by not returning avoided lines when alternatives exist', () => {
    const personality = makePersonality()
    const line = selectFallbackLine(
      personality,
      TRIGGER_EVENT.COMBAT_START,
      ['Braaaains...'],    // avoid this one
    )
    // Should return the other option
    assert.equal(line, 'Ughhh...')
  })

  it('returns something even if all lines are in the avoidList', () => {
    const personality = makePersonality()
    const line = selectFallbackLine(
      personality,
      TRIGGER_EVENT.COMBAT_START,
      ['Braaaains...', 'Ughhh...'],  // avoid both
    )
    // Falls back to full pool since all are avoided
    assert.ok(typeof line === 'string' && line.length > 0)
  })

  it('handles null personality gracefully', () => {
    const line = selectFallbackLine(null, TRIGGER_EVENT.COMBAT_START)
    assert.ok(typeof line === 'string' && line.length > 0)
  })
})

// ═══════════════════════════════════════════════════════════════════════════
// CharacterResponseService — generateResponse (with MockLLMProvider)
// ═══════════════════════════════════════════════════════════════════════════

describe('CharacterResponseService.generateResponse', () => {
  it('returns a response result with expected fields on success', async () => {
    const personality = makePersonality()
    const pkg = buildFromPersonality({
      personality,
      triggerEvent: TRIGGER_EVENT.COMBAT_START,
    })

    const result = await generateResponse(pkg, { sessionId: 'test-session', personality })

    assert.ok(typeof result.text === 'string' && result.text.length > 0, 'text should be non-empty')
    assert.equal(result.source, 'llm', 'should use llm source with working provider')
    assert.equal(result.npcId, 'zombie', 'npcId should match templateKey')
    assert.equal(result.triggerEvent, TRIGGER_EVENT.COMBAT_START)
    assert.ok(typeof result.latencyMs === 'number', 'latencyMs should be a number')
  })

  it('falls back to pre-written lines when LLM fails', async () => {
    _setProvider(new MockLLMProvider({ shouldFail: true }))

    const personality = makePersonality()
    const pkg = buildFromPersonality({
      personality,
      triggerEvent: TRIGGER_EVENT.COMBAT_START,
    })

    const result = await generateResponse(pkg, { sessionId: 'fail-session', personality })

    assert.equal(result.source, 'fallback', 'should use fallback when LLM fails')
    assert.ok(typeof result.text === 'string' && result.text.length > 0, 'fallback text should be non-empty')
    assert.ok(
      ['Braaaains...', 'Ughhh...'].includes(result.text),
      `expected fallback line, got: ${result.text}`,
    )
  })

  it('avoids repeating recent responses across calls', async () => {
    _setProvider(new MockLLMProvider({ shouldFail: true })) // use fallback so output is deterministic

    const personality = makePersonality()
    const sessionId   = 'repeat-test-session'

    const pkg1 = buildFromPersonality({ personality, triggerEvent: TRIGGER_EVENT.COMBAT_START })
    const r1   = await generateResponse(pkg1, { sessionId, personality })

    // Second call should produce different text (if pool has >1 option)
    const pkg2 = buildFromPersonality({ personality, triggerEvent: TRIGGER_EVENT.COMBAT_START })
    const r2   = await generateResponse(pkg2, { sessionId, personality })

    // Pool for zombie combat_start has exactly 2 entries — they should differ
    assert.notEqual(r1.text, r2.text, 'consecutive responses should avoid repetition when pool allows it')
  })

  it('includes npcName in the result', async () => {
    const personality = makeLichPersonality()
    const pkg = buildFromPersonality({ personality, triggerEvent: TRIGGER_EVENT.PLAYER_ADDRESSED })
    const result = await generateResponse(pkg, { personality })
    assert.equal(result.npcName, 'Acererak')
  })

  it('works without a sessionId (no repetition tracking)', async () => {
    const personality = makePersonality()
    const pkg = buildFromPersonality({ personality, triggerEvent: TRIGGER_EVENT.ATTACKED })
    const result = await generateResponse(pkg)  // no options
    assert.ok(typeof result.text === 'string')
  })

  it('handles empty response from LLM by falling back', async () => {
    _setProvider(new MockLLMProvider({ fixedResponse: '  ' }))  // whitespace only

    const personality = makePersonality()
    const pkg = buildFromPersonality({ personality, triggerEvent: TRIGGER_EVENT.NEAR_DEATH })
    const result = await generateResponse(pkg, { personality })

    assert.equal(result.source, 'fallback', 'empty LLM response should trigger fallback')
  })

  it('records all trigger event types without throwing', async () => {
    const personality = makePersonality()
    for (const evt of Object.values(TRIGGER_EVENT)) {
      const pkg = buildFromPersonality({ personality, triggerEvent: evt })
      const result = await generateResponse(pkg, { personality })
      assert.ok(
        typeof result.text === 'string' && result.text.length > 0,
        `trigger event ${evt} should produce a response`,
      )
    }
  })
})

// ═══════════════════════════════════════════════════════════════════════════
// CANNED_RESPONSES — Coverage sanity check
// ═══════════════════════════════════════════════════════════════════════════

describe('CANNED_RESPONSES coverage', () => {
  it('has entries for all TRIGGER_EVENT values', () => {
    for (const evt of Object.values(TRIGGER_EVENT)) {
      assert.ok(
        CANNED_RESPONSES[evt] !== undefined,
        `CANNED_RESPONSES missing entry for trigger event: ${evt}`,
      )
    }
  })

  it('all entries have at least one response string', () => {
    for (const [evt, table] of Object.entries(CANNED_RESPONSES)) {
      for (const [key, lines] of Object.entries(table)) {
        assert.ok(
          Array.isArray(lines) && lines.length > 0,
          `CANNED_RESPONSES[${evt}][${key}] should have at least one line`,
        )
        for (const line of lines) {
          assert.ok(
            typeof line === 'string' && line.trim().length > 0,
            `CANNED_RESPONSES[${evt}][${key}] contains empty line`,
          )
        }
      }
    }
  })
})
