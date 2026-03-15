/**
 * MockLLMProvider — Deterministic LLM stub for testing.
 *
 * Returns pre-written canned responses keyed by triggerEvent + npcType.
 * Used in unit tests so no model download or running process is required.
 * Also used as the fallback when no model is configured.
 *
 * Satisfies the same interface as the real LLMProvider:
 *   complete(systemPrompt, userPrompt, options) → Promise<string>
 *   isAvailable() → boolean
 *   name → string
 */

'use strict'

const { TRIGGER_EVENT, NPC_TYPE } = require('./CharacterContextPackage')

// ── Canned response table ─────────────────────────────────────────────────────
// Keyed by TRIGGER_EVENT. Each entry is an object with keys for npcType or
// a default entry. If no specific entry exists, the default is used.

const CANNED_RESPONSES = {
  [TRIGGER_EVENT.COMBAT_START]: {
    [NPC_TYPE.ENEMY]:    ['Your life ends here.', 'No one leaves this place alive.', 'You dare face me?'],
    [NPC_TYPE.FRIENDLY]: ['Stand with me — we finish this together.', 'Watch my back and I will watch yours!'],
    [NPC_TYPE.NEUTRAL]:  ['I have no quarrel... unless you give me one.'],
    default:             ['The battle begins.'],
  },
  [TRIGGER_EVENT.ATTACKED]: {
    [NPC_TYPE.ENEMY]:    ['You will pay for that!', 'A scratch. Is that all you have?', 'You have made a grave mistake.'],
    [NPC_TYPE.FRIENDLY]: ['Ow! Be careful — I am on your side!'],
    [NPC_TYPE.NEUTRAL]:  ['So it is to be violence, then.'],
    default:             ['I have been struck!'],
  },
  [TRIGGER_EVENT.ALLY_DIED]: {
    [NPC_TYPE.ENEMY]:    ['You will die for this!', 'My comrade! You will suffer for that!'],
    [NPC_TYPE.FRIENDLY]: ['No! We will avenge you, I swear it!', 'They are gone... stay focused, do not let it be for nothing.'],
    [NPC_TYPE.NEUTRAL]:  ['Unexpected. You are more dangerous than you appear.'],
    default:             ['One of ours has fallen.'],
  },
  [TRIGGER_EVENT.ENEMY_DIED]: {
    [NPC_TYPE.ENEMY]:    ['One down... but more of you remain.', 'Fool.'],
    [NPC_TYPE.FRIENDLY]: ['One less enemy standing. Press the advantage!', 'Well done!'],
    [NPC_TYPE.NEUTRAL]:  ['A life spent.'],
    default:             ['One falls.'],
  },
  [TRIGGER_EVENT.PLAYER_ADDRESSED]: {
    [NPC_TYPE.ENEMY]:    ['Spare me your words.', 'Talking will not save you.'],
    [NPC_TYPE.FRIENDLY]: ['Yes? Speak quickly — the battle is not over.'],
    [NPC_TYPE.NEUTRAL]:  ['I am listening. Choose your words wisely.'],
    default:             ['You speak to me?'],
  },
  [TRIGGER_EVENT.SPOTTED_ENEMY]: {
    [NPC_TYPE.ENEMY]:    ['You cannot hide from me.', 'Found you.', 'There is nowhere to run.'],
    [NPC_TYPE.FRIENDLY]: ['Enemies ahead — get ready!', 'I see them! Prepare yourselves!'],
    [NPC_TYPE.NEUTRAL]:  ['Intruders. This is your only warning.'],
    default:             ['They are spotted.'],
  },
  [TRIGGER_EVENT.NEAR_DEATH]: {
    [NPC_TYPE.ENEMY]:    ['Not yet... I will not fall to you!', 'This cannot be...', 'Impossible!'],
    [NPC_TYPE.FRIENDLY]: ['I am not done fighting... get me up!', 'Still standing... barely.'],
    [NPC_TYPE.NEUTRAL]:  ['Enough. I yield... for now.'],
    default:             ['I am barely holding on.'],
  },
  [TRIGGER_EVENT.COMBAT_END]: {
    [NPC_TYPE.ENEMY]:    ['This is not over...', 'You have won nothing.'],
    [NPC_TYPE.FRIENDLY]: ['We made it through. Well fought.', 'Catch your breath. Good work.'],
    [NPC_TYPE.NEUTRAL]:  ['It is done.'],
    default:             ['The fighting stops.'],
  },
  [TRIGGER_EVENT.ROUND_START]: {
    [NPC_TYPE.ENEMY]:    ['Your time is running out.', 'Another round. Another death.'],
    [NPC_TYPE.FRIENDLY]: ['Stay sharp — keep moving!'],
    [NPC_TYPE.NEUTRAL]:  ['Still standing. Impressive.'],
    default:             ['The battle continues.'],
  },
  [TRIGGER_EVENT.SPELL_CAST]: {
    [NPC_TYPE.ENEMY]:    ['Magic will not save you!', 'Clever... but not enough.'],
    [NPC_TYPE.FRIENDLY]: ['Now THAT is how it is done!'],
    [NPC_TYPE.NEUTRAL]:  ['A caster. Interesting.'],
    default:             ['The magic flows.'],
  },
  [TRIGGER_EVENT.CONDITION_APPLIED]: {
    [NPC_TYPE.ENEMY]:    ['What is this?! You will regret this!', 'A trick... I will recover.'],
    [NPC_TYPE.FRIENDLY]: ['Help! Something is wrong with me!'],
    [NPC_TYPE.NEUTRAL]:  ['You have some skill, I will give you that.'],
    default:             ['A condition takes hold.'],
  },
  [TRIGGER_EVENT.LEVEL_TRANSITION]: {
    [NPC_TYPE.ENEMY]:    ['You venture deeper into my domain. Unwise.'],
    [NPC_TYPE.FRIENDLY]: ['Onward. Whatever lies ahead, we face it together.'],
    [NPC_TYPE.NEUTRAL]:  ['Few reach this far. You are either very talented... or very lucky.'],
    default:             ['We press forward.'],
  },
  [TRIGGER_EVENT.DISCOVERY]: {
    [NPC_TYPE.ENEMY]:    ['You should not have found that.'],
    [NPC_TYPE.FRIENDLY]: ['Did you see that? This changes things.'],
    [NPC_TYPE.NEUTRAL]:  ['Curious. Most who come here do not look closely enough to notice.'],
    default:             ['Something is revealed.'],
  },
}

// ── Deterministic pick ────────────────────────────────────────────────────────

let _pickIndex = 0 // cycles through options deterministically in tests

/**
 * Pick a response from the canned table. Uses round-robin cycling so tests
 * get predictable but varied responses across multiple calls.
 *
 * @param {string} triggerEvent
 * @param {string} npcType
 * @returns {string}
 */
function pickCannedResponse(triggerEvent, npcType) {
  const eventTable = CANNED_RESPONSES[triggerEvent] || {}
  const options    = eventTable[npcType] || eventTable.default || ['...']
  const response   = options[_pickIndex % options.length]
  _pickIndex++
  return response
}

/** Reset pick index — call in test beforeEach for determinism */
function resetPickIndex() { _pickIndex = 0 }

// ── Provider implementation ───────────────────────────────────────────────────

class MockLLMProvider {
  constructor(options = {}) {
    /** If set, all calls return this string regardless of trigger */
    this._fixedResponse = options.fixedResponse || null

    /** If set, simulate an error */
    this._shouldFail = options.shouldFail || false

    /** Capture calls for test assertions */
    this.calls = []
  }

  get name() { return 'MockLLMProvider' }

  isAvailable() { return !this._shouldFail }

  /**
   * @param {string} systemPrompt
   * @param {string} userPrompt
   * @param {Object} options  { maxTokens, triggerEvent, npcType }
   * @returns {Promise<string>}
   */
  async complete(systemPrompt, userPrompt, options = {}) {
    this.calls.push({ systemPrompt, userPrompt, options })

    if (this._shouldFail) {
      throw new Error('MockLLMProvider: simulated LLM failure')
    }

    if (this._fixedResponse !== null) {
      return this._fixedResponse
    }

    return pickCannedResponse(
      options.triggerEvent || TRIGGER_EVENT.COMBAT_START,
      options.npcType      || NPC_TYPE.ENEMY,
    )
  }
}

module.exports = {
  MockLLMProvider,
  pickCannedResponse,
  resetPickIndex,
  CANNED_RESPONSES,
}
