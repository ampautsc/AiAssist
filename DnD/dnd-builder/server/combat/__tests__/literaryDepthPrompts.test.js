/**
 * Phase 5 — Literary Depth Prompt Integration Tests
 *
 * Validates that the new Phase 5 fields (consciousWant, unconsciousNeed,
 * characterArc, opinionsAbout) are correctly:
 *   1. Passed through buildContextPackage
 *   2. Injected into buildSystemPrompt as [WANTS AND NEEDS], [CHARACTER ARC], [OPINIONS]
 *   3. Injected into buildWakeUpPrompt
 *   4. Evolution summary injected into buildUserPrompt
 *   5. Graceful degradation when fields are absent
 *
 * Run with:
 *   node --test server/combat/__tests__/literaryDepthPrompts.test.js
 */

'use strict'

const { describe, it } = require('node:test')
const assert = require('node:assert/strict')

const {
  TRIGGER_EVENT,
  NPC_TYPE,
  EMOTIONAL_STATE,
  RESPONSE_FORMAT,
  buildContextPackage,
  buildSystemPrompt,
  buildUserPrompt,
  buildWakeUpPrompt,
} = require('../../llm/CharacterContextPackage')


// ── Test helpers ──────────────────────────────────────────────────────────────

function makeCharacter(overrides = {}) {
  return {
    id: 'sera_1',
    name: 'Sera Dunwick',
    race: 'Human',
    npcType: NPC_TYPE.NEUTRAL,
    personality: {
      voice: 'alert, dry',
      alignment: 'lawful neutral',
      disposition: 'watchful',
      backstory: 'Guard on market patrol.',
      speechPatterns: ['Direct questions'],
      motivations: ['Get better at this'],
      fears: ['Missing something'],
      mannerisms: ['Stands off-center'],
    },
    knowledge: {
      knownFactions: ['The Guard'],
      knownLocations: ['Market Square'],
      secretsHeld: ['Watching Hodge'],
      languagesSpoken: ['Common'],
    },
    relationships: {
      allies: ['captain_edric_vane'],
      enemies: [],
      neutralParties: ['hodge_fence'],
    },
    stats: { intelligence: 13, wisdom: 15, charisma: 10 },
    consciousnessContext: {
      innerMonologue: 'Hodge foot traffic changed.',
      currentPreoccupation: 'The Hodge surveillance.',
      emotionalBaseline: 'focused_alertness',
      socialMask: 'approachable guard',
      contradictions: ['Wants to leave for Ironhaven but is already best here'],
      internalConflicts: ['Vane knows about Ironhaven'],
      wakeUpQuestions: ['What did I miss?', 'Is today the day?'],
      psychologicalProfile: {
        moralFramework: 'institutional meritocracy',
        copingMechanisms: ['observation as control'],
      },
      conversationPersona: {
        defaultTrust: 0.25,
        informationRelease: 'investigative',
        deflectionPatterns: ['silence stretch'],
      },
      // Phase 5 fields
      consciousWant: 'To complete the Hodge surveillance and earn her place at Ironhaven.',
      unconsciousNeed: 'To accept that competence doesn\'t require external validation.',
      characterArc: {
        summary: 'A talented guard learns that being the best in a small place is excellence',
        startState: 'Restless competence — too good for her post',
        endState: 'Makes peace with choosing the place that needs her',
        stages: ['Completes investigation', 'Faces threat instincts handle', 'Makes a conscious choice'],
      },
      opinionsAbout: {
        captain_edric_vane: 'The best officer I\'ve served under.',
        hodge_fence: 'He\'s running something beyond junk.',
        widow_marsh: 'She sees more than she lets on.',
      },
      ...(overrides.consciousness || {}),
    },
    ...overrides,
  }
}

function makeSituation(overrides = {}) {
  return {
    triggerEvent: TRIGGER_EVENT.PLAYER_ADDRESSED,
    emotionalState: EMOTIONAL_STATE.CALM,
    combatState: { hpPercent: 100, conditions: [], recentActions: [] },
    worldContext: { location: 'Market Square', timeOfDay: 'morning', tone: 'tense' },
    nearbyEntities: overrides.nearbyEntities || [],
    recentEvents: [],
    ...overrides,
  }
}

function makeConstraints(overrides = {}) {
  return {
    maxTokens: 60,
    format: RESPONSE_FORMAT.SPOKEN,
    avoidRepetition: [],
    ...overrides,
  }
}


// ═══════════════════════════════════════════════════════════════════════════════
// 1. buildContextPackage passthrough
// ═══════════════════════════════════════════════════════════════════════════════

describe('Literary Depth — buildContextPackage passthrough', () => {
  it('includes new Phase 5 fields in consciousnessContext', () => {
    const pkg = buildContextPackage(makeCharacter(), makeSituation(), makeConstraints())
    const cc = pkg.character.consciousnessContext
    assert.ok(cc, 'consciousnessContext should exist')
    assert.equal(cc.consciousWant, 'To complete the Hodge surveillance and earn her place at Ironhaven.')
    assert.equal(cc.unconsciousNeed, 'To accept that competence doesn\'t require external validation.')
    assert.ok(cc.characterArc)
    assert.equal(cc.characterArc.summary, 'A talented guard learns that being the best in a small place is excellence')
    assert.ok(cc.opinionsAbout)
    assert.equal(cc.opinionsAbout.captain_edric_vane, 'The best officer I\'ve served under.')
  })

  it('defaults to empty values when Phase 5 fields absent', () => {
    const char = makeCharacter({
      consciousnessContext: {
        innerMonologue: 'Something',
        currentPreoccupation: 'Something else',
        emotionalBaseline: 'calm',
        socialMask: 'neutral',
        contradictions: [],
        internalConflicts: [],
        wakeUpQuestions: [],
        psychologicalProfile: null,
        conversationPersona: null,
        // No Phase 5 fields
      }
    })
    const pkg = buildContextPackage(char, makeSituation(), makeConstraints())
    const cc = pkg.character.consciousnessContext
    assert.equal(cc.consciousWant, '')
    assert.equal(cc.unconsciousNeed, '')
    assert.equal(cc.characterArc, null)
    assert.deepStrictEqual(cc.opinionsAbout, {})
  })
})


// ═══════════════════════════════════════════════════════════════════════════════
// 2. buildSystemPrompt — WANTS AND NEEDS section
// ═══════════════════════════════════════════════════════════════════════════════

describe('Literary Depth — system prompt WANTS AND NEEDS', () => {
  it('includes [WANTS AND NEEDS] section when fields present', () => {
    const pkg = buildContextPackage(makeCharacter(), makeSituation(), makeConstraints())
    const prompt = buildSystemPrompt(pkg)
    assert.ok(prompt.includes('[WANTS AND NEEDS]'))
    assert.ok(prompt.includes('What you believe you want:'))
    assert.ok(prompt.includes('Hodge surveillance'))
    assert.ok(prompt.includes('What you actually need'))
    assert.ok(prompt.includes('competence doesn\'t require external validation'))
  })

  it('omits [WANTS AND NEEDS] when both fields empty', () => {
    const char = makeCharacter({
      consciousnessContext: {
        innerMonologue: 'test',
        currentPreoccupation: 'test',
        emotionalBaseline: 'calm',
        socialMask: 'none',
        contradictions: [],
        internalConflicts: [],
        wakeUpQuestions: [],
        consciousWant: '',
        unconsciousNeed: '',
      }
    })
    const pkg = buildContextPackage(char, makeSituation(), makeConstraints())
    const prompt = buildSystemPrompt(pkg)
    assert.ok(!prompt.includes('[WANTS AND NEEDS]'))
  })

  it('includes only consciousWant when unconsciousNeed is absent', () => {
    const char = makeCharacter({
      consciousnessContext: {
        innerMonologue: 'test',
        currentPreoccupation: 'test',
        emotionalBaseline: 'calm',
        socialMask: 'none',
        contradictions: [],
        internalConflicts: [],
        wakeUpQuestions: [],
        consciousWant: 'Something specific',
        unconsciousNeed: '',
      }
    })
    const pkg = buildContextPackage(char, makeSituation(), makeConstraints())
    const prompt = buildSystemPrompt(pkg)
    assert.ok(prompt.includes('[WANTS AND NEEDS]'))
    assert.ok(prompt.includes('Something specific'))
    assert.ok(!prompt.includes('What you actually need'))
  })
})


// ═══════════════════════════════════════════════════════════════════════════════
// 3. buildSystemPrompt — CHARACTER ARC section
// ═══════════════════════════════════════════════════════════════════════════════

describe('Literary Depth — system prompt CHARACTER ARC', () => {
  it('includes [CHARACTER ARC] section when arc data present', () => {
    const pkg = buildContextPackage(makeCharacter(), makeSituation(), makeConstraints())
    const prompt = buildSystemPrompt(pkg)
    assert.ok(prompt.includes('[CHARACTER ARC]'))
    assert.ok(prompt.includes('Your story:'))
    assert.ok(prompt.includes('best in a small place'))
    assert.ok(prompt.includes('Where you are now:'))
    assert.ok(prompt.includes('Restless competence'))
  })

  it('omits [CHARACTER ARC] when arc is null', () => {
    const char = makeCharacter({
      consciousnessContext: {
        innerMonologue: 'test',
        currentPreoccupation: 'test',
        emotionalBaseline: 'calm',
        socialMask: 'none',
        contradictions: [],
        internalConflicts: [],
        wakeUpQuestions: [],
        characterArc: null,
      }
    })
    const pkg = buildContextPackage(char, makeSituation(), makeConstraints())
    const prompt = buildSystemPrompt(pkg)
    assert.ok(!prompt.includes('[CHARACTER ARC]'))
  })
})


// ═══════════════════════════════════════════════════════════════════════════════
// 4. buildSystemPrompt — OPINIONS section (filtered by nearby)
// ═══════════════════════════════════════════════════════════════════════════════

describe('Literary Depth — system prompt OPINIONS', () => {
  it('includes [OPINIONS ABOUT THOSE PRESENT] when nearby NPC has opinion', () => {
    const situation = makeSituation({
      nearbyEntities: [
        { name: 'Captain Edric Vane', side: 'ally', hpStatus: 'healthy', distance: 10 },
      ],
    })
    const pkg = buildContextPackage(makeCharacter(), situation, makeConstraints())
    const prompt = buildSystemPrompt(pkg)
    assert.ok(prompt.includes('[OPINIONS ABOUT THOSE PRESENT]'))
    assert.ok(prompt.includes('captain edric vane'))
    assert.ok(prompt.includes('best officer'))
  })

  it('omits opinions section when no nearby NPCs match', () => {
    const situation = makeSituation({
      nearbyEntities: [
        { name: 'Random Stranger', side: 'neutral', hpStatus: 'healthy', distance: 10 },
      ],
    })
    const pkg = buildContextPackage(makeCharacter(), situation, makeConstraints())
    const prompt = buildSystemPrompt(pkg)
    assert.ok(!prompt.includes('[OPINIONS ABOUT THOSE PRESENT]'))
  })

  it('omits opinions section when no nearby entities at all', () => {
    const pkg = buildContextPackage(makeCharacter(), makeSituation(), makeConstraints())
    const prompt = buildSystemPrompt(pkg)
    assert.ok(!prompt.includes('[OPINIONS ABOUT THOSE PRESENT]'))
  })

  it('includes multiple opinions when multiple known NPCs nearby', () => {
    const situation = makeSituation({
      nearbyEntities: [
        { name: 'Captain Edric Vane', side: 'ally', hpStatus: 'healthy', distance: 10 },
        { name: 'Hodge', side: 'neutral', hpStatus: 'healthy', distance: 20 },
      ],
    })
    const pkg = buildContextPackage(makeCharacter(), situation, makeConstraints())
    const prompt = buildSystemPrompt(pkg)
    assert.ok(prompt.includes('captain edric vane'))
    assert.ok(prompt.includes('hodge'))
    assert.ok(prompt.includes('beyond junk'))
  })
})


// ═══════════════════════════════════════════════════════════════════════════════
// 5. buildWakeUpPrompt — consciousWant injection
// ═══════════════════════════════════════════════════════════════════════════════

describe('Literary Depth — wake-up prompt', () => {
  it('includes consciousWant in wake-up prompt', () => {
    const pkg = buildContextPackage(makeCharacter(), makeSituation(), makeConstraints())
    const wakeUp = buildWakeUpPrompt(pkg)
    assert.ok(wakeUp)
    assert.ok(wakeUp.includes('What you want right now:'))
    assert.ok(wakeUp.includes('Hodge surveillance'))
  })

  it('omits want line when consciousWant is empty', () => {
    const char = makeCharacter({
      consciousnessContext: {
        innerMonologue: 'test',
        currentPreoccupation: 'test',
        emotionalBaseline: 'calm',
        socialMask: 'none',
        contradictions: ['tension'],
        internalConflicts: [],
        wakeUpQuestions: ['Am I real?'],
        consciousWant: '',
      }
    })
    const pkg = buildContextPackage(char, makeSituation(), makeConstraints())
    const wakeUp = buildWakeUpPrompt(pkg)
    assert.ok(wakeUp)
    assert.ok(!wakeUp.includes('What you want right now:'))
  })
})


// ═══════════════════════════════════════════════════════════════════════════════
// 6. buildUserPrompt — evolution summary injection
// ═══════════════════════════════════════════════════════════════════════════════

describe('Literary Depth — user prompt evolution summary', () => {
  it('includes [PERMANENT GROWTH] when evolutionSummary provided', () => {
    const pkg = buildContextPackage(makeCharacter(), makeSituation(), makeConstraints())
    // Inject evolutionSummary manually (normally done by CharacterResponseService)
    pkg.evolutionSummary = 'You have survived 3 encounters. You have grown warmer toward the party.'
    const prompt = buildUserPrompt(pkg)
    assert.ok(prompt.includes('[PERMANENT GROWTH]'))
    assert.ok(prompt.includes('3 encounters'))
    assert.ok(prompt.includes('warmer toward'))
  })

  it('omits [PERMANENT GROWTH] when no evolutionSummary', () => {
    const pkg = buildContextPackage(makeCharacter(), makeSituation(), makeConstraints())
    const prompt = buildUserPrompt(pkg)
    assert.ok(!prompt.includes('[PERMANENT GROWTH]'))
  })

  it('orders PERMANENT GROWTH before ENCOUNTER MEMORY', () => {
    const pkg = buildContextPackage(makeCharacter(), makeSituation(), makeConstraints())
    pkg.evolutionSummary = 'Permanent growth data'
    pkg.memorySummary = 'Session memory data'
    const prompt = buildUserPrompt(pkg)
    const growthIdx = prompt.indexOf('[PERMANENT GROWTH]')
    const memoryIdx = prompt.indexOf('[ENCOUNTER MEMORY]')
    assert.ok(growthIdx >= 0, 'PERMANENT GROWTH should be present')
    assert.ok(memoryIdx >= 0, 'ENCOUNTER MEMORY should be present')
    assert.ok(growthIdx < memoryIdx, 'PERMANENT GROWTH should come before ENCOUNTER MEMORY')
  })
})


// ═══════════════════════════════════════════════════════════════════════════════
// 7. Full system prompt structure verification
// ═══════════════════════════════════════════════════════════════════════════════

describe('Literary Depth — full prompt section order', () => {
  it('system prompt sections appear in correct order', () => {
    const situation = makeSituation({
      nearbyEntities: [
        { name: 'Captain Edric Vane', side: 'ally', hpStatus: 'healthy', distance: 10 },
      ],
    })
    const pkg = buildContextPackage(makeCharacter(), situation, makeConstraints())
    const prompt = buildSystemPrompt(pkg)

    const identityIdx = prompt.indexOf('[IDENTITY]')
    const innerLifeIdx = prompt.indexOf('[INNER LIFE]')
    const wantsIdx = prompt.indexOf('[WANTS AND NEEDS]')
    const arcIdx = prompt.indexOf('[CHARACTER ARC]')
    const opinionsIdx = prompt.indexOf('[OPINIONS ABOUT THOSE PRESENT]')
    const secretsIdx = prompt.indexOf('[KNOWLEDGE AND SECRETS]')
    const guidanceIdx = prompt.indexOf('[RESPONSE GUIDANCE]')

    assert.ok(identityIdx >= 0)
    assert.ok(innerLifeIdx > identityIdx)
    assert.ok(wantsIdx > innerLifeIdx)
    assert.ok(arcIdx > wantsIdx)
    assert.ok(opinionsIdx > arcIdx)
    assert.ok(secretsIdx > opinionsIdx)
    assert.ok(guidanceIdx > secretsIdx)
  })
})
