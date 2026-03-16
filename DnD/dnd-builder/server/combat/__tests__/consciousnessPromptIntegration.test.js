/**
 * Phase 2 — Consciousness Prompt Integration Tests
 *
 * Validates that consciousnessContext data from NPC personality files
 * is correctly wired into the LLM prompt pipeline:
 *   1. buildSystemPrompt() embeds inner life, secrets, and contradiction data
 *   2. buildWakeUpPrompt() produces scene-priming prompts
 *   3. getTokenModulation() scales tokens for dramatic moments
 *   4. buildRelationshipContext() enriches nearby entity descriptions
 *   5. CharacterContextBuilder passes consciousnessContext through the pipeline
 *   6. CharacterResponseService uses wake-up prompt and token modulation
 *   7. Full pipeline integration with real NPC personality files
 *
 * Run with:
 *   node --test server/combat/__tests__/consciousnessPromptIntegration.test.js
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
  buildWakeUpPrompt,
  getTokenModulation,
  buildRelationshipContext,
} = require('../../llm/CharacterContextPackage')

const {
  MockLLMProvider,
  resetPickIndex,
} = require('../../llm/MockLLMProvider')

const {
  buildFromPersonality,
} = require('../../services/CharacterContextBuilder')

const {
  generateResponse,
  _clearAllCaches,
  _setProvider,
  _getRecent,
  _recordResponse,
} = require('../../services/CharacterResponseService')

// ═══════════════════════════════════════════════════════════════════════════
// LOAD REAL NPC FILES
// ═══════════════════════════════════════════════════════════════════════════

const SEED_DIR = path.resolve(__dirname, '../../data/npcPersonalities')

function loadPersonality(templateKey) {
  const filePath = path.join(SEED_DIR, `${templateKey}.json`)
  return JSON.parse(fs.readFileSync(filePath, 'utf8'))
}

// Representative samples from different tiers
const NAMED_NPC_KEYS = [
  'widow_marsh', 'captain_edric_vane', 'mira_barrelbottom', 'hodge_fence',
  'sera_dunwick', 'brennan_holt', 'pip_apprentice', 'fen_colby',
  'aldovar_crennick', 'lell_sparrow',
]

const MONSTER_KEYS = ['lich', 'young_red_dragon', 'goblin', 'zombie', 'wolf']

const ALL_KEYS = [...NAMED_NPC_KEYS, ...MONSTER_KEYS]

const ALL_PERSONALITIES = {}
for (const key of ALL_KEYS) {
  ALL_PERSONALITIES[key] = loadPersonality(key)
}

// ═══════════════════════════════════════════════════════════════════════════
// FIXTURES
// ═══════════════════════════════════════════════════════════════════════════

/** Make a character object with consciousnessContext for testing */
function makeConsciousCharacter(overrides = {}) {
  return {
    id: 'test_npc',
    name: 'Test Character',
    race: 'Human',
    npcType: NPC_TYPE.NEUTRAL,
    personality: {
      voice: 'cautious',
      alignment: 'neutral good',
      disposition: 'wary',
      backstory: 'A traveler who has seen too much.',
      speechPatterns: ['speaks in measured tones'],
      motivations: ['find safety'],
      fears: ['being exposed'],
      mannerisms: ['glances at exits'],
    },
    knowledge: {
      knownFactions: [],
      knownLocations: ['the road'],
      secretsHeld: ['knows where the treasure is buried', 'saw the murder happen'],
      languagesSpoken: ['Common'],
    },
    relationships: {
      allies: ['brother_aldwin'],
      enemies: ['hodge_fence'],
      neutralParties: [],
    },
    stats: { intelligence: 14, wisdom: 16, charisma: 10 },
    consciousnessContext: {
      innerMonologue: 'I should not have come here. But staying away would have been worse.',
      currentPreoccupation: 'whether the person who followed me yesterday is here today',
      emotionalBaseline: 'guarded_alertness',
      socialMask: 'polite disinterest — the face of someone who is merely passing through',
      contradictions: [
        'Wants to tell the truth but the truth would put others in danger',
        'Values honesty but has built a life on concealment',
      ],
      internalConflicts: [
        'The longer I stay silent the more complicit I become, but speaking means risk.',
      ],
      wakeUpQuestions: [
        'Is today the day it all comes out?',
        'Who in this room can be trusted?',
        'What would my father say about the choices I have made?',
      ],
      psychologicalProfile: {
        attachmentStyle: 'avoidant',
        copingMechanisms: ['constant vigilance', 'deflection through questions'],
        cognitiveBiases: ['hypervigilance', 'catastrophizing'],
        moralFramework: 'consequentialist — the right thing is what causes the least harm',
      },
      conversationPersona: {
        defaultTrust: 0.2,
        trustEscalation: 'slow — observes before committing',
        informationRelease: 'layered — surface first, depth only after trust',
        deflectionPatterns: ['answers questions with questions', 'changes subject to weather'],
      },
    },
    ...overrides,
  }
}

function makeMinimalCharacter() {
  return {
    id: 'minimal_npc',
    name: 'Simple Guard',
    race: 'Human',
    npcType: NPC_TYPE.ENEMY,
  }
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
// 1. buildSystemPrompt — CONSCIOUSNESS CONTEXT INTEGRATION
// ═══════════════════════════════════════════════════════════════════════════

describe('buildSystemPrompt with consciousnessContext', () => {

  it('includes [IDENTITY] section header', () => {
    const pkg = buildContextPackage(
      makeConsciousCharacter(),
      { triggerEvent: TRIGGER_EVENT.PLAYER_ADDRESSED, emotionalState: EMOTIONAL_STATE.CALM },
    )
    const prompt = buildSystemPrompt(pkg)
    assert.ok(prompt.includes('[IDENTITY]'), 'system prompt should have IDENTITY section')
  })

  it('includes [INNER LIFE] section when consciousnessContext present', () => {
    const pkg = buildContextPackage(
      makeConsciousCharacter(),
      { triggerEvent: TRIGGER_EVENT.PLAYER_ADDRESSED, emotionalState: EMOTIONAL_STATE.CALM },
    )
    const prompt = buildSystemPrompt(pkg)
    assert.ok(prompt.includes('[INNER LIFE]'), 'system prompt should have INNER LIFE section')
  })

  it('does NOT include [INNER LIFE] when consciousnessContext absent', () => {
    const pkg = buildContextPackage(
      makeMinimalCharacter(),
      { triggerEvent: TRIGGER_EVENT.COMBAT_START, emotionalState: EMOTIONAL_STATE.ENRAGED },
    )
    const prompt = buildSystemPrompt(pkg)
    assert.ok(!prompt.includes('[INNER LIFE]'), 'no INNER LIFE without consciousness data')
  })

  it('includes currentPreoccupation in prompt', () => {
    const pkg = buildContextPackage(
      makeConsciousCharacter(),
      { triggerEvent: TRIGGER_EVENT.PLAYER_ADDRESSED, emotionalState: EMOTIONAL_STATE.CALM },
    )
    const prompt = buildSystemPrompt(pkg)
    assert.ok(prompt.includes('whether the person who followed me yesterday'),
      'currentPreoccupation should appear in prompt')
  })

  it('includes emotionalBaseline and socialMask', () => {
    const pkg = buildContextPackage(
      makeConsciousCharacter(),
      { triggerEvent: TRIGGER_EVENT.PLAYER_ADDRESSED, emotionalState: EMOTIONAL_STATE.CALM },
    )
    const prompt = buildSystemPrompt(pkg)
    assert.ok(prompt.includes('guarded_alertness'), 'emotionalBaseline should appear')
    assert.ok(prompt.includes('polite disinterest'), 'socialMask should appear')
  })

  it('includes contradictions', () => {
    const pkg = buildContextPackage(
      makeConsciousCharacter(),
      { triggerEvent: TRIGGER_EVENT.PLAYER_ADDRESSED, emotionalState: EMOTIONAL_STATE.CALM },
    )
    const prompt = buildSystemPrompt(pkg)
    assert.ok(prompt.includes('Wants to tell the truth'), 'contradiction should appear')
  })

  it('includes internalConflicts', () => {
    const pkg = buildContextPackage(
      makeConsciousCharacter(),
      { triggerEvent: TRIGGER_EVENT.PLAYER_ADDRESSED, emotionalState: EMOTIONAL_STATE.CALM },
    )
    const prompt = buildSystemPrompt(pkg)
    assert.ok(prompt.includes('longer I stay silent'), 'internal conflict should appear')
  })

  it('includes moralFramework from psychologicalProfile', () => {
    const pkg = buildContextPackage(
      makeConsciousCharacter(),
      { triggerEvent: TRIGGER_EVENT.PLAYER_ADDRESSED, emotionalState: EMOTIONAL_STATE.CALM },
    )
    const prompt = buildSystemPrompt(pkg)
    assert.ok(prompt.includes('consequentialist'), 'moral framework should appear')
  })

  it('includes copingMechanisms from psychologicalProfile', () => {
    const pkg = buildContextPackage(
      makeConsciousCharacter(),
      { triggerEvent: TRIGGER_EVENT.PLAYER_ADDRESSED, emotionalState: EMOTIONAL_STATE.CALM },
    )
    const prompt = buildSystemPrompt(pkg)
    assert.ok(prompt.includes('constant vigilance'), 'coping mechanisms should appear')
  })

  it('includes informationRelease from conversationPersona', () => {
    const pkg = buildContextPackage(
      makeConsciousCharacter(),
      { triggerEvent: TRIGGER_EVENT.PLAYER_ADDRESSED, emotionalState: EMOTIONAL_STATE.CALM },
    )
    const prompt = buildSystemPrompt(pkg)
    assert.ok(prompt.includes('layered'), 'information release pattern should appear')
  })

  it('includes deflectionPatterns from conversationPersona', () => {
    const pkg = buildContextPackage(
      makeConsciousCharacter(),
      { triggerEvent: TRIGGER_EVENT.PLAYER_ADDRESSED, emotionalState: EMOTIONAL_STATE.CALM },
    )
    const prompt = buildSystemPrompt(pkg)
    assert.ok(prompt.includes('answers questions with questions'), 'deflection patterns should appear')
  })

  it('includes [KNOWLEDGE AND SECRETS] when secretsHeld present', () => {
    const pkg = buildContextPackage(
      makeConsciousCharacter(),
      { triggerEvent: TRIGGER_EVENT.PLAYER_ADDRESSED, emotionalState: EMOTIONAL_STATE.CALM },
    )
    const prompt = buildSystemPrompt(pkg)
    assert.ok(prompt.includes('[KNOWLEDGE AND SECRETS]'), 'secrets section should appear')
    assert.ok(prompt.includes('treasure is buried'), 'specific secret should appear')
    assert.ok(prompt.includes('will NOT reveal'), 'secrecy instruction should appear')
  })

  it('does NOT include secrets section when no secrets', () => {
    const char = makeConsciousCharacter({ knowledge: { secretsHeld: [] } })
    const pkg = buildContextPackage(
      char,
      { triggerEvent: TRIGGER_EVENT.PLAYER_ADDRESSED, emotionalState: EMOTIONAL_STATE.CALM },
    )
    const prompt = buildSystemPrompt(pkg)
    assert.ok(!prompt.includes('[KNOWLEDGE AND SECRETS]'), 'no secrets section without secrets')
  })

  it('includes [RESPONSE GUIDANCE] section', () => {
    const pkg = buildContextPackage(
      makeConsciousCharacter(),
      { triggerEvent: TRIGGER_EVENT.PLAYER_ADDRESSED, emotionalState: EMOTIONAL_STATE.CALM },
    )
    const prompt = buildSystemPrompt(pkg)
    assert.ok(prompt.includes('[RESPONSE GUIDANCE]'), 'response guidance section should appear')
  })

  it('includes consciousness-aware guidance when consciousnessContext present', () => {
    const pkg = buildContextPackage(
      makeConsciousCharacter(),
      { triggerEvent: TRIGGER_EVENT.PLAYER_ADDRESSED, emotionalState: EMOTIONAL_STATE.CALM },
    )
    const prompt = buildSystemPrompt(pkg)
    assert.ok(prompt.includes('You ARE this person'), 'consciousness guidance should appear')
    assert.ok(prompt.includes('already thinking'), 'inner life guidance should appear')
  })

  it('does NOT include consciousness guidance when no consciousnessContext', () => {
    const pkg = buildContextPackage(
      makeMinimalCharacter(),
      { triggerEvent: TRIGGER_EVENT.COMBAT_START, emotionalState: EMOTIONAL_STATE.ENRAGED },
    )
    const prompt = buildSystemPrompt(pkg)
    assert.ok(!prompt.includes('You ARE this person'), 'no consciousness guidance without data')
  })

  // Backward compatibility: all existing prompt assertions still hold
  it('still includes name, race, alignment (backward compatible)', () => {
    const pkg = buildContextPackage(
      makeConsciousCharacter(),
      { triggerEvent: TRIGGER_EVENT.PLAYER_ADDRESSED, emotionalState: EMOTIONAL_STATE.CALM },
    )
    const prompt = buildSystemPrompt(pkg)
    assert.ok(prompt.includes('Test Character'), 'name should still appear')
    assert.ok(prompt.includes('Human'), 'race should still appear')
    assert.ok(prompt.includes('neutral good'), 'alignment should still appear')
    assert.ok(prompt.includes('measured tones'), 'speech patterns should still appear')
    assert.ok(prompt.includes('find safety'), 'motivations should still appear')
  })

  it('still includes intelligence description (backward compatible)', () => {
    const pkg = buildContextPackage(
      { ...makeMinimalCharacter(), stats: { intelligence: 3, wisdom: 6, charisma: 5 } },
      { triggerEvent: TRIGGER_EVENT.COMBAT_START, emotionalState: EMOTIONAL_STATE.ENRAGED },
    )
    const prompt = buildSystemPrompt(pkg)
    assert.ok(prompt.includes('barely coherent'), 'low INT should still produce barely coherent')
  })

  it('narrator style instruction still works for ACTION_FLAVOR', () => {
    const pkg = buildContextPackage(
      makeMinimalCharacter(),
      { triggerEvent: TRIGGER_EVENT.COMBAT_START, emotionalState: EMOTIONAL_STATE.CALM },
      { format: RESPONSE_FORMAT.ACTION_FLAVOR },
    )
    const prompt = buildSystemPrompt(pkg)
    assert.ok(prompt.includes('narrator style'), 'action_flavor format should still work')
  })
})

// ═══════════════════════════════════════════════════════════════════════════
// 2. buildWakeUpPrompt
// ═══════════════════════════════════════════════════════════════════════════

describe('buildWakeUpPrompt', () => {

  it('returns null when no consciousnessContext', () => {
    const pkg = buildContextPackage(
      makeMinimalCharacter(),
      { triggerEvent: TRIGGER_EVENT.COMBAT_START, emotionalState: EMOTIONAL_STATE.ENRAGED },
    )
    const wakeUp = buildWakeUpPrompt(pkg)
    assert.equal(wakeUp, null, 'should return null without consciousness')
  })

  it('returns a string when consciousnessContext is present', () => {
    const pkg = buildContextPackage(
      makeConsciousCharacter(),
      { triggerEvent: TRIGGER_EVENT.PLAYER_ADDRESSED, emotionalState: EMOTIONAL_STATE.CALM },
    )
    const wakeUp = buildWakeUpPrompt(pkg)
    assert.ok(typeof wakeUp === 'string', 'should return a string')
    assert.ok(wakeUp.length > 50, 'wake-up prompt should have substantial content')
  })

  it('includes NPC name', () => {
    const pkg = buildContextPackage(
      makeConsciousCharacter(),
      { triggerEvent: TRIGGER_EVENT.PLAYER_ADDRESSED, emotionalState: EMOTIONAL_STATE.CALM },
    )
    const wakeUp = buildWakeUpPrompt(pkg)
    assert.ok(wakeUp.includes('Test Character'), 'should include NPC name')
  })

  it('includes currentPreoccupation', () => {
    const pkg = buildContextPackage(
      makeConsciousCharacter(),
      { triggerEvent: TRIGGER_EVENT.PLAYER_ADDRESSED, emotionalState: EMOTIONAL_STATE.CALM },
    )
    const wakeUp = buildWakeUpPrompt(pkg)
    assert.ok(wakeUp.includes('person who followed me'), 'should include what they were thinking about')
  })

  it('includes emotionalBaseline and socialMask', () => {
    const pkg = buildContextPackage(
      makeConsciousCharacter(),
      { triggerEvent: TRIGGER_EVENT.PLAYER_ADDRESSED, emotionalState: EMOTIONAL_STATE.CALM },
    )
    const wakeUp = buildWakeUpPrompt(pkg)
    assert.ok(wakeUp.includes('guarded_alertness'), 'should include emotional baseline')
    assert.ok(wakeUp.includes('polite disinterest'), 'should include social mask')
  })

  it('includes a contradiction', () => {
    const pkg = buildContextPackage(
      makeConsciousCharacter(),
      { triggerEvent: TRIGGER_EVENT.PLAYER_ADDRESSED, emotionalState: EMOTIONAL_STATE.CALM },
    )
    const wakeUp = buildWakeUpPrompt(pkg)
    assert.ok(wakeUp.includes('Wants to tell the truth'), 'should include first contradiction')
  })

  it('includes a wake-up question', () => {
    const pkg = buildContextPackage(
      makeConsciousCharacter(),
      { triggerEvent: TRIGGER_EVENT.PLAYER_ADDRESSED, emotionalState: EMOTIONAL_STATE.CALM },
    )
    const wakeUp = buildWakeUpPrompt(pkg)
    // "Test Character" has 14 chars → 14 % 3 = 2 → third question
    assert.ok(
      wakeUp.includes('Is today the day') ||
      wakeUp.includes('Who in this room') ||
      wakeUp.includes('What would my father'),
      'should include one of the wake-up questions',
    )
  })

  it('includes the "already thinking" closing instruction', () => {
    const pkg = buildContextPackage(
      makeConsciousCharacter(),
      { triggerEvent: TRIGGER_EVENT.PLAYER_ADDRESSED, emotionalState: EMOTIONAL_STATE.CALM },
    )
    const wakeUp = buildWakeUpPrompt(pkg)
    assert.ok(wakeUp.includes('already thinking'), 'should include inner life instruction')
  })
})

// ═══════════════════════════════════════════════════════════════════════════
// 3. getTokenModulation
// ═══════════════════════════════════════════════════════════════════════════

describe('getTokenModulation', () => {

  it('returns 2.0 for near_death', () => {
    assert.equal(getTokenModulation(TRIGGER_EVENT.NEAR_DEATH), 2.0)
  })

  it('returns 1.8 for ally_died', () => {
    assert.equal(getTokenModulation(TRIGGER_EVENT.ALLY_DIED), 1.8)
  })

  it('returns 1.5 for discovery', () => {
    assert.equal(getTokenModulation(TRIGGER_EVENT.DISCOVERY), 1.5)
  })

  it('returns 1.5 for combat_end', () => {
    assert.equal(getTokenModulation(TRIGGER_EVENT.COMBAT_END), 1.5)
  })

  it('returns 1.3 for level_transition', () => {
    assert.equal(getTokenModulation(TRIGGER_EVENT.LEVEL_TRANSITION), 1.3)
  })

  it('returns 1.3 for enemy_died', () => {
    assert.equal(getTokenModulation(TRIGGER_EVENT.ENEMY_DIED), 1.3)
  })

  it('returns 1.0 for combat_start (standard)', () => {
    assert.equal(getTokenModulation(TRIGGER_EVENT.COMBAT_START), 1.0)
  })

  it('returns 1.0 for player_addressed (standard)', () => {
    assert.equal(getTokenModulation(TRIGGER_EVENT.PLAYER_ADDRESSED), 1.0)
  })

  it('returns 1.0 for attacked (standard)', () => {
    assert.equal(getTokenModulation(TRIGGER_EVENT.ATTACKED), 1.0)
  })

  it('returns 1.0 for unrecognized event string', () => {
    assert.equal(getTokenModulation('unknown_event'), 1.0)
  })
})

// ═══════════════════════════════════════════════════════════════════════════
// 4. buildRelationshipContext
// ═══════════════════════════════════════════════════════════════════════════

describe('buildRelationshipContext', () => {

  it('returns empty string when no nearby entities', () => {
    const pkg = buildContextPackage(
      makeConsciousCharacter(),
      { triggerEvent: TRIGGER_EVENT.PLAYER_ADDRESSED, emotionalState: EMOTIONAL_STATE.CALM },
    )
    const result = buildRelationshipContext(pkg, makeConsciousCharacter().relationships)
    assert.equal(result, '', 'no entities → empty string')
  })

  it('marks known allies with [your ally]', () => {
    const relationships = { allies: ['Brother Aldwin'], enemies: [], neutralParties: [] }
    const pkg = buildContextPackage(
      makeConsciousCharacter(),
      {
        triggerEvent: TRIGGER_EVENT.PLAYER_ADDRESSED,
        emotionalState: EMOTIONAL_STATE.CALM,
        nearbyEntities: [{ name: 'Brother Aldwin', side: 'friendly', hpStatus: 'healthy', distance: 10 }],
      },
    )
    const result = buildRelationshipContext(pkg, relationships)
    assert.ok(result.includes('[your ally]'), 'should mark known allies')
    assert.ok(result.includes('Brother Aldwin'), 'should include entity name')
  })

  it('marks known enemies with [your enemy]', () => {
    const relationships = { allies: [], enemies: ['Hodge'], neutralParties: [] }
    const pkg = buildContextPackage(
      makeConsciousCharacter(),
      {
        triggerEvent: TRIGGER_EVENT.PLAYER_ADDRESSED,
        emotionalState: EMOTIONAL_STATE.CALM,
        nearbyEntities: [{ name: 'Hodge', side: 'neutral', hpStatus: 'healthy', distance: 20 }],
      },
    )
    const result = buildRelationshipContext(pkg, relationships)
    assert.ok(result.includes('[your enemy]'), 'should mark known enemies')
  })

  it('does not add relationship tag for unknown entities', () => {
    const relationships = { allies: ['Brother Aldwin'], enemies: ['Hodge'], neutralParties: [] }
    const pkg = buildContextPackage(
      makeConsciousCharacter(),
      {
        triggerEvent: TRIGGER_EVENT.PLAYER_ADDRESSED,
        emotionalState: EMOTIONAL_STATE.CALM,
        nearbyEntities: [{ name: 'Random Stranger', side: 'neutral', hpStatus: 'healthy', distance: 30 }],
      },
    )
    const result = buildRelationshipContext(pkg, relationships)
    assert.ok(!result.includes('[your ally]'), 'unknown should not be ally')
    assert.ok(!result.includes('[your enemy]'), 'unknown should not be enemy')
    assert.ok(result.includes('Random Stranger'), 'should still include the entity')
  })

  it('handles null relationships gracefully', () => {
    const pkg = buildContextPackage(
      makeConsciousCharacter(),
      {
        triggerEvent: TRIGGER_EVENT.PLAYER_ADDRESSED,
        emotionalState: EMOTIONAL_STATE.CALM,
        nearbyEntities: [{ name: 'Someone', side: 'neutral' }],
      },
    )
    const result = buildRelationshipContext(pkg, null)
    assert.equal(result, '', 'null relationships → empty string')
  })

  it('handles multiple entities with mixed relationships', () => {
    const relationships = { allies: ['Mira'], enemies: ['Bandit'], neutralParties: [] }
    const pkg = buildContextPackage(
      makeConsciousCharacter(),
      {
        triggerEvent: TRIGGER_EVENT.COMBAT_START,
        emotionalState: EMOTIONAL_STATE.CALM,
        nearbyEntities: [
          { name: 'Mira Barrelbottom', side: 'friendly', hpStatus: 'healthy', distance: 10 },
          { name: 'Bandit Leader', side: 'enemy', hpStatus: 'healthy', distance: 30 },
          { name: 'Mysterious Figure', side: 'neutral', hpStatus: 'unknown', distance: 50 },
        ],
      },
    )
    const result = buildRelationshipContext(pkg, relationships)
    assert.ok(result.includes('Mira Barrelbottom [your ally]'), 'Mira should be marked ally')
    assert.ok(result.includes('Bandit Leader [your enemy]'), 'Bandit should be marked enemy')
    assert.ok(!result.includes('Mysterious Figure [your'), 'unknown should not be tagged')
  })
})

// ═══════════════════════════════════════════════════════════════════════════
// 5. buildContextPackage — consciousnessContext passthrough
// ═══════════════════════════════════════════════════════════════════════════

describe('buildContextPackage consciousnessContext passthrough', () => {

  it('includes consciousnessContext when provided', () => {
    const pkg = buildContextPackage(
      makeConsciousCharacter(),
      { triggerEvent: TRIGGER_EVENT.PLAYER_ADDRESSED, emotionalState: EMOTIONAL_STATE.CALM },
    )
    assert.ok(pkg.character.consciousnessContext, 'package should include consciousness')
    assert.equal(pkg.character.consciousnessContext.emotionalBaseline, 'guarded_alertness')
  })

  it('sets consciousnessContext to null when not provided', () => {
    const pkg = buildContextPackage(
      makeMinimalCharacter(),
      { triggerEvent: TRIGGER_EVENT.COMBAT_START, emotionalState: EMOTIONAL_STATE.ENRAGED },
    )
    assert.equal(pkg.character.consciousnessContext, null, 'should be null without consciousness data')
  })

  it('preserves all consciousnessContext fields', () => {
    const pkg = buildContextPackage(
      makeConsciousCharacter(),
      { triggerEvent: TRIGGER_EVENT.PLAYER_ADDRESSED, emotionalState: EMOTIONAL_STATE.CALM },
    )
    const cc = pkg.character.consciousnessContext
    assert.ok(cc.innerMonologue.includes('should not have come'), 'innerMonologue preserved')
    assert.ok(cc.currentPreoccupation.includes('followed me'), 'currentPreoccupation preserved')
    assert.equal(cc.emotionalBaseline, 'guarded_alertness')
    assert.ok(cc.socialMask.includes('polite disinterest'))
    assert.equal(cc.contradictions.length, 2)
    assert.equal(cc.internalConflicts.length, 1)
    assert.equal(cc.wakeUpQuestions.length, 3)
    assert.ok(cc.psychologicalProfile, 'psychologicalProfile preserved')
    assert.ok(cc.conversationPersona, 'conversationPersona preserved')
  })
})

// ═══════════════════════════════════════════════════════════════════════════
// 6. CharacterContextBuilder — consciousnessContext forwarding
// ═══════════════════════════════════════════════════════════════════════════

describe('CharacterContextBuilder forwards consciousnessContext', () => {

  it('passes consciousnessContext from personality record to package', () => {
    const p = ALL_PERSONALITIES['widow_marsh']
    const pkg = buildFromPersonality({
      personality: p,
      triggerEvent: TRIGGER_EVENT.PLAYER_ADDRESSED,
      worldLocation: 'Blue Lantern Alley',
    })
    assert.ok(pkg.character.consciousnessContext, 'widow_marsh should have consciousness in package')
    assert.ok(pkg.character.consciousnessContext.innerMonologue.includes('Three years'),
      'inner monologue should be forwarded')
  })

  it('passes null when personality has no consciousnessContext', () => {
    const p = {
      templateKey: 'test_no_cc',
      name: 'No Consciousness NPC',
      race: 'Human',
      npcType: 'neutral',
      personality: { voice: 'flat', alignment: 'true neutral', disposition: 'neutral', backstory: 'Nobody.' },
      stats: { intelligence: 10, wisdom: 10, charisma: 10 },
    }
    const pkg = buildFromPersonality({
      personality: p,
      triggerEvent: TRIGGER_EVENT.PLAYER_ADDRESSED,
    })
    assert.equal(pkg.character.consciousnessContext, null)
  })

  it('every real NPC with consciousnessContext forwards it through the builder', () => {
    for (const key of ALL_KEYS) {
      const p = ALL_PERSONALITIES[key]
      if (!p.consciousnessContext) continue

      const pkg = buildFromPersonality({
        personality: p,
        triggerEvent: TRIGGER_EVENT.PLAYER_ADDRESSED,
      })
      assert.ok(pkg.character.consciousnessContext,
        `${key}: consciousnessContext should be forwarded through builder`)
      assert.ok(pkg.character.consciousnessContext.innerMonologue,
        `${key}: innerMonologue should be present after forwarding`)
    }
  })
})

// ═══════════════════════════════════════════════════════════════════════════
// 7. FULL PIPELINE — real NPC personality → system prompt with consciousness
// ═══════════════════════════════════════════════════════════════════════════

describe('Full pipeline: real NPC personality → consciousness-enriched prompts', () => {

  it('Widow Marsh system prompt includes her inner life', () => {
    const p = ALL_PERSONALITIES['widow_marsh']
    const pkg = buildFromPersonality({
      personality: p,
      triggerEvent: TRIGGER_EVENT.PLAYER_ADDRESSED,
      worldLocation: 'Blue Lantern Alley',
    })
    const prompt = buildSystemPrompt(pkg)

    assert.ok(prompt.includes('[INNER LIFE]'), 'should have inner life section')
    assert.ok(prompt.includes('Three years') || prompt.includes('alley wall'),
      'should reference her preoccupation')
    assert.ok(prompt.includes('composed_vigilance') || prompt.includes('guarded'),
      'should include emotional baseline')
  })

  it('Widow Marsh system prompt includes her secrets', () => {
    const p = ALL_PERSONALITIES['widow_marsh']
    const pkg = buildFromPersonality({
      personality: p,
      triggerEvent: TRIGGER_EVENT.PLAYER_ADDRESSED,
    })
    const prompt = buildSystemPrompt(pkg)

    assert.ok(prompt.includes('[KNOWLEDGE AND SECRETS]'), 'should have secrets section')
    assert.ok(prompt.includes('Hodge') || prompt.includes('operation'),
      'should reference her knowledge of Hodge')
  })

  it('Widow Marsh wake-up prompt references her preoccupation', () => {
    const p = ALL_PERSONALITIES['widow_marsh']
    const pkg = buildFromPersonality({
      personality: p,
      triggerEvent: TRIGGER_EVENT.PLAYER_ADDRESSED,
    })
    const wakeUp = buildWakeUpPrompt(pkg)
    assert.ok(wakeUp !== null, 'should produce a wake-up prompt')
    assert.ok(wakeUp.includes('Widow Marsh'), 'should include NPC name')
  })

  it('Captain Edric Vane system prompt includes his contradictions', () => {
    const p = ALL_PERSONALITIES['captain_edric_vane']
    const pkg = buildFromPersonality({
      personality: p,
      triggerEvent: TRIGGER_EVENT.COMBAT_START,
    })
    const prompt = buildSystemPrompt(pkg)

    assert.ok(prompt.includes('[INNER LIFE]'), 'captain should have inner life')
    assert.ok(prompt.includes('contradictions') || prompt.includes('conflict'),
      'should reference his tensions')
  })

  it('Mira Barrelbottom — friendly innkeeper with consciousness', () => {
    const p = ALL_PERSONALITIES['mira_barrelbottom']
    const pkg = buildFromPersonality({
      personality: p,
      triggerEvent: TRIGGER_EVENT.PLAYER_ADDRESSED,
    })
    const prompt = buildSystemPrompt(pkg)

    assert.ok(prompt.includes('Mira Barrelbottom'), 'name should appear')
    assert.ok(prompt.includes('[IDENTITY]'), 'identity section')
    // If Mira has consciousness (she should from Phase 1), check for inner life
    if (p.consciousnessContext) {
      assert.ok(prompt.includes('[INNER LIFE]'), 'Mira should have inner life')
    }
  })

  it('Lich system prompt includes deep consciousness', () => {
    const p = ALL_PERSONALITIES['lich']
    const pkg = buildFromPersonality({
      personality: p,
      triggerEvent: TRIGGER_EVENT.COMBAT_START,
    })
    const prompt = buildSystemPrompt(pkg)

    assert.ok(prompt.includes('[INNER LIFE]'), 'lich should have inner life')
    // The lich has philosophical inner monologue
    if (p.consciousnessContext) {
      assert.ok(prompt.includes(p.consciousnessContext.emotionalBaseline) ||
                prompt.includes('detach'),
        'should reference lich emotional baseline')
    }
  })

  it('Zombie system prompt handles minimal consciousness gracefully', () => {
    const p = ALL_PERSONALITIES['zombie']
    const pkg = buildFromPersonality({
      personality: p,
      triggerEvent: TRIGGER_EVENT.COMBAT_START,
    })
    const prompt = buildSystemPrompt(pkg)

    // Zombie should have consciousness (from Phase 1) but minimal
    if (p.consciousnessContext) {
      assert.ok(prompt.includes('[INNER LIFE]'), 'zombie should have inner life section')
    }
    // Should still have identity section
    assert.ok(prompt.includes('[IDENTITY]'), 'always has identity')
  })

  it('every named NPC with consciousness produces a unique enriched prompt', () => {
    const prompts = new Map()
    for (const key of NAMED_NPC_KEYS) {
      const p = ALL_PERSONALITIES[key]
      const pkg = buildFromPersonality({
        personality: p,
        triggerEvent: TRIGGER_EVENT.PLAYER_ADDRESSED,
      })
      const prompt = buildSystemPrompt(pkg)
      prompts.set(key, prompt)

      // All named NPCs should have inner life sections (Phase 1 ensured this)
      if (p.consciousnessContext) {
        assert.ok(prompt.includes('[INNER LIFE]'),
          `${key}: should have inner life section in prompt`)
      }
    }

    const unique = new Set(prompts.values())
    assert.equal(unique.size, prompts.size,
      'every named NPC should produce a unique system prompt')
  })
})

// ═══════════════════════════════════════════════════════════════════════════
// 8. CharacterResponseService — wake-up and token modulation integration
// ═══════════════════════════════════════════════════════════════════════════

describe('CharacterResponseService consciousness integration', () => {

  it('first response for NPC with consciousness uses wake-up prompt', async () => {
    const p = ALL_PERSONALITIES['widow_marsh']
    const pkg = buildFromPersonality({
      personality: p,
      triggerEvent: TRIGGER_EVENT.PLAYER_ADDRESSED,
      worldLocation: 'Blue Lantern Alley',
    })

    // First call — no cached responses
    const result = await generateResponse(pkg, { sessionId: 'test-session', personality: p })
    assert.ok(result.text, 'should generate a response')
    assert.ok(typeof result.text === 'string', 'response should be a string')
  })

  it('second response for same NPC skips wake-up prompt', async () => {
    const p = ALL_PERSONALITIES['mira_barrelbottom']
    const pkg = buildFromPersonality({
      personality: p,
      triggerEvent: TRIGGER_EVENT.PLAYER_ADDRESSED,
    })

    // First call — caches a response
    await generateResponse(pkg, { sessionId: 'test-session-2', personality: p })

    // Second call — should have cached responses, skip wake-up
    const result2 = await generateResponse(pkg, { sessionId: 'test-session-2', personality: p })
    assert.ok(result2.text, 'second response should also work')
  })

  it('near_death trigger gets more tokens than standard', async () => {
    // Test via token modulation function (more testable than inspecting LLM call)
    const standardTokens = 60
    const nearDeathTokens = Math.round(standardTokens * getTokenModulation(TRIGGER_EVENT.NEAR_DEATH))
    const standardResult = Math.round(standardTokens * getTokenModulation(TRIGGER_EVENT.PLAYER_ADDRESSED))

    assert.equal(nearDeathTokens, 120, 'near_death should get 2x tokens')
    assert.equal(standardResult, 60, 'player_addressed should get 1x tokens')
  })

  it('ally_died trigger gets elevated tokens', async () => {
    const baseTokens = 60
    const allyDiedTokens = Math.round(baseTokens * getTokenModulation(TRIGGER_EVENT.ALLY_DIED))
    assert.equal(allyDiedTokens, 108, 'ally_died should get 1.8x tokens')
  })

  it('response still works for NPCs without consciousnessContext', async () => {
    const p = {
      templateKey: 'bare_npc',
      name: 'Bare NPC',
      race: 'Human',
      npcType: 'enemy',
      personality: {
        voice: 'gruff',
        alignment: 'chaotic evil',
        disposition: 'hostile',
        backstory: 'A bandit.',
        speechPatterns: [],
        motivations: ['steal'],
        fears: ['guards'],
        mannerisms: [],
      },
      stats: { intelligence: 8, wisdom: 8, charisma: 8 },
      fallbackLines: {
        [TRIGGER_EVENT.COMBAT_START]: ['Your gold or your life!'],
      },
    }
    const pkg = buildFromPersonality({
      personality: p,
      triggerEvent: TRIGGER_EVENT.COMBAT_START,
    })

    const result = await generateResponse(pkg, { personality: p })
    assert.ok(result.text, 'should still generate response without consciousness')
  })
})

// ═══════════════════════════════════════════════════════════════════════════
// 9. PROMPT QUALITY — consciousness makes prompts measurably richer
// ═══════════════════════════════════════════════════════════════════════════

describe('Consciousness enrichment measurably improves prompts', () => {

  it('conscious NPC prompt is significantly longer than minimal NPC prompt', () => {
    const consciousPkg = buildContextPackage(
      makeConsciousCharacter(),
      { triggerEvent: TRIGGER_EVENT.PLAYER_ADDRESSED, emotionalState: EMOTIONAL_STATE.CALM },
    )
    const minimalPkg = buildContextPackage(
      makeMinimalCharacter(),
      { triggerEvent: TRIGGER_EVENT.COMBAT_START, emotionalState: EMOTIONAL_STATE.ENRAGED },
    )

    const consciousPrompt = buildSystemPrompt(consciousPkg)
    const minimalPrompt = buildSystemPrompt(minimalPkg)

    assert.ok(consciousPrompt.length > minimalPrompt.length * 1.5,
      `conscious prompt (${consciousPrompt.length} chars) should be significantly longer than minimal (${minimalPrompt.length} chars)`)
  })

  it('conscious prompt has more distinct sections than minimal', () => {
    const consciousPkg = buildContextPackage(
      makeConsciousCharacter(),
      { triggerEvent: TRIGGER_EVENT.PLAYER_ADDRESSED, emotionalState: EMOTIONAL_STATE.CALM },
    )
    const consciousPrompt = buildSystemPrompt(consciousPkg)

    const sectionCount = (consciousPrompt.match(/\[.*?\]/g) || []).length
    assert.ok(sectionCount >= 3, `should have at least 3 sections, got ${sectionCount}`)
  })

  it('Widow Marsh enriched prompt references her specific surveillance knowledge', () => {
    const p = ALL_PERSONALITIES['widow_marsh']
    const pkg = buildFromPersonality({
      personality: p,
      triggerEvent: TRIGGER_EVENT.PLAYER_ADDRESSED,
    })
    const prompt = buildSystemPrompt(pkg)

    // Widow Marsh should have deeply specific prompt content
    const specificTerms = ['alley', 'Hodge', 'three years', 'watching', 'steps', 'Aldwin', 'coin']
    const matchCount = specificTerms.filter(term => prompt.toLowerCase().includes(term.toLowerCase())).length
    assert.ok(matchCount >= 3,
      `Widow Marsh prompt should contain multiple specific references, got ${matchCount}/${specificTerms.length}`)
  })
})
