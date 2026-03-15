/**
 * Tests for EncounterSessionService — conversation encounter sessions.
 *
 * Covers: session CRUD, message flow, NPC responses, error handling,
 * conversation history, addressing, and edge cases.
 */

'use strict'

const { describe, it, beforeEach, afterEach } = require('node:test')
const assert = require('node:assert/strict')

const {
  createEncounter,
  getEncounter,
  sendMessage,
  endEncounter,
  listEncounters,
  _sessions,
  _clearAll,
} = require('../../services/EncounterSessionService')

// Mock the LLM provider so tests don't need a real model
const { _setProvider } = require('../../services/CharacterResponseService')

class MockProvider {
  constructor() { this.calls = []; this._response = 'Mock NPC response.' }
  isAvailable() { return true }
  get name() { return 'MockTest' }
  async complete(systemPrompt, userPrompt, opts) {
    this.calls.push({ systemPrompt, userPrompt, opts })
    return this._response
  }
  setResponse(text) { this._response = text }
}

let mockProvider

beforeEach(() => {
  _clearAll()
  mockProvider = new MockProvider()
  _setProvider(mockProvider)
})

afterEach(() => {
  _clearAll()
})

// ── Session creation ──────────────────────────────────────────────────────────

describe('EncounterSessionService — createEncounter', () => {
  it('creates a session with valid NPC template keys', async () => {
    const result = await createEncounter({
      npcTemplateKeys: ['bree_millhaven'],
      playerName: 'Aldric',
    })

    assert.ok(result.encounterId.startsWith('enc_'))
    assert.equal(result.npcs.length, 1)
    assert.equal(result.npcs[0].templateKey, 'bree_millhaven')
    assert.equal(result.npcs[0].name, 'Bree')
    assert.equal(result.status, 'active')
    assert.deepEqual(result.messages, [])
  })

  it('creates a multi-NPC encounter', async () => {
    const result = await createEncounter({
      npcTemplateKeys: ['bree_millhaven', 'tuck_millhaven', 'torval_grimm'],
    })

    assert.equal(result.npcs.length, 3)
    const names = result.npcs.map(n => n.name)
    assert.ok(names.includes('Bree'))
    assert.ok(names.includes('Tuck'))
  })

  it('uses default player name and world context', async () => {
    const result = await createEncounter({
      npcTemplateKeys: ['bree_millhaven'],
    })

    assert.equal(result.worldContext.location, 'a quiet room')
    assert.equal(result.worldContext.timeOfDay, 'afternoon')
    assert.equal(result.worldContext.tone, 'conversational')
  })

  it('accepts custom world context', async () => {
    const result = await createEncounter({
      npcTemplateKeys: ['bree_millhaven'],
      worldContext: { location: 'The Rusty Bucket tavern', timeOfDay: 'evening', tone: 'relaxed' },
    })

    assert.equal(result.worldContext.location, 'The Rusty Bucket tavern')
    assert.equal(result.worldContext.tone, 'relaxed')
  })

  it('rejects empty npcTemplateKeys', async () => {
    await assert.rejects(
      () => createEncounter({ npcTemplateKeys: [] }),
      err => err.code === 'INVALID_INPUT',
    )
  })

  it('rejects missing npcTemplateKeys', async () => {
    await assert.rejects(
      () => createEncounter({}),
      err => err.code === 'INVALID_INPUT',
    )
  })

  it('rejects unknown templateKey', async () => {
    await assert.rejects(
      () => createEncounter({ npcTemplateKeys: ['nonexistent_npc'] }),
      err => err.code === 'NPC_NOT_FOUND',
    )
  })
})

// ── Session retrieval ─────────────────────────────────────────────────────────

describe('EncounterSessionService — getEncounter', () => {
  it('retrieves a created encounter', async () => {
    const { encounterId } = await createEncounter({
      npcTemplateKeys: ['bree_millhaven'],
    })

    const result = getEncounter(encounterId)
    assert.equal(result.encounterId, encounterId)
    assert.equal(result.npcs.length, 1)
    assert.equal(result.status, 'active')
  })

  it('throws for unknown encounter ID', () => {
    assert.throws(
      () => getEncounter('enc_nonexistent'),
      err => err.code === 'ENCOUNTER_NOT_FOUND',
    )
  })
})

// ── Sending messages ──────────────────────────────────────────────────────────

describe('EncounterSessionService — sendMessage', () => {
  it('records player message and gets NPC response', async () => {
    const { encounterId } = await createEncounter({
      npcTemplateKeys: ['bree_millhaven'],
      playerName: 'Aldric',
    })

    mockProvider.setResponse('Oh, hello there! I was just examining the grain patterns.')

    const result = await sendMessage(encounterId, { text: 'Hello Bree!' })

    // Player message
    assert.equal(result.playerMessage.sender, 'player')
    assert.equal(result.playerMessage.senderName, 'Aldric')
    assert.equal(result.playerMessage.text, 'Hello Bree!')
    assert.equal(result.playerMessage.source, 'player')

    // NPC response
    assert.equal(result.npcResponses.length, 1)
    assert.equal(result.npcResponses[0].sender, 'bree_millhaven')
    assert.equal(result.npcResponses[0].senderName, 'Bree')
    assert.ok(result.npcResponses[0].text.length > 0)
  })

  it('gets responses from multiple NPCs', async () => {
    const { encounterId } = await createEncounter({
      npcTemplateKeys: ['bree_millhaven', 'tuck_millhaven'],
    })

    const result = await sendMessage(encounterId, { text: 'Hello everyone!' })

    assert.equal(result.npcResponses.length, 2)
    const senders = result.npcResponses.map(r => r.sender)
    assert.ok(senders.includes('bree_millhaven'))
    assert.ok(senders.includes('tuck_millhaven'))
  })

  it('addresses only specific NPCs when addressedTo is provided', async () => {
    const { encounterId } = await createEncounter({
      npcTemplateKeys: ['bree_millhaven', 'tuck_millhaven', 'torval_grimm'],
    })

    const result = await sendMessage(encounterId, {
      text: 'Bree, what do you think?',
      addressedTo: ['bree_millhaven'],
    })

    assert.equal(result.npcResponses.length, 1)
    assert.equal(result.npcResponses[0].sender, 'bree_millhaven')
  })

  it('stores messages in session for retrieval', async () => {
    const { encounterId } = await createEncounter({
      npcTemplateKeys: ['bree_millhaven'],
    })

    await sendMessage(encounterId, { text: 'First message' })
    await sendMessage(encounterId, { text: 'Second message' })

    const state = getEncounter(encounterId)
    // Each sendMessage produces 1 player + 1 NPC = 2 messages. Two rounds = 4.
    assert.equal(state.messages.length, 4)
    assert.equal(state.messages[0].sender, 'player')
    assert.equal(state.messages[0].text, 'First message')
    assert.equal(state.messages[1].sender, 'bree_millhaven')
    assert.equal(state.messages[2].sender, 'player')
    assert.equal(state.messages[2].text, 'Second message')
  })

  it('rejects empty text', async () => {
    const { encounterId } = await createEncounter({
      npcTemplateKeys: ['bree_millhaven'],
    })

    await assert.rejects(
      () => sendMessage(encounterId, { text: '' }),
      err => err.code === 'INVALID_INPUT',
    )
  })

  it('rejects whitespace-only text', async () => {
    const { encounterId } = await createEncounter({
      npcTemplateKeys: ['bree_millhaven'],
    })

    await assert.rejects(
      () => sendMessage(encounterId, { text: '   ' }),
      err => err.code === 'INVALID_INPUT',
    )
  })

  it('rejects messages to nonexistent encounter', async () => {
    await assert.rejects(
      () => sendMessage('enc_fake', { text: 'hello' }),
      err => err.code === 'ENCOUNTER_NOT_FOUND',
    )
  })

  it('rejects messages to ended encounter', async () => {
    const { encounterId } = await createEncounter({
      npcTemplateKeys: ['bree_millhaven'],
    })
    endEncounter(encounterId)

    await assert.rejects(
      () => sendMessage(encounterId, { text: 'hello' }),
      err => err.code === 'ENCOUNTER_ENDED',
    )
  })

  it('provides fallback when NPC response fails', async () => {
    const { encounterId } = await createEncounter({
      npcTemplateKeys: ['bree_millhaven'],
    })

    // Make the provider throw
    mockProvider.complete = async () => { throw new Error('LLM offline') }

    const result = await sendMessage(encounterId, { text: 'Hello?' })

    // Should still get a response (fallback)
    assert.equal(result.npcResponses.length, 1)
    assert.equal(result.npcResponses[0].source, 'fallback')
  })
})

// ── Conversation history in prompts ───────────────────────────────────────────

describe('EncounterSessionService — conversation history', () => {
  it('injects conversation history into LLM prompt', async () => {
    const { encounterId } = await createEncounter({
      npcTemplateKeys: ['bree_millhaven'],
      playerName: 'Aldric',
    })

    // First message
    await sendMessage(encounterId, { text: 'Hello Bree!' })

    // Second message — should include conversation history
    mockProvider.calls = []
    await sendMessage(encounterId, { text: 'What do you think about the mill?' })

    assert.ok(mockProvider.calls.length >= 1)
    const userPrompt = mockProvider.calls[0].userPrompt
    assert.ok(userPrompt.includes('CONVERSATION SO FAR'), 'Should include conversation history header')
    assert.ok(userPrompt.includes('Aldric: Hello Bree!'), 'Should include player\'s first message')
  })

  it('includes player message in recent events', async () => {
    const { encounterId } = await createEncounter({
      npcTemplateKeys: ['bree_millhaven'],
      playerName: 'Aldric',
    })

    mockProvider.calls = []
    await sendMessage(encounterId, { text: 'Tell me about the bakery' })

    assert.ok(mockProvider.calls.length >= 1)
    const userPrompt = mockProvider.calls[0].userPrompt
    assert.ok(userPrompt.includes('Aldric says:'), 'Should include player\'s message in events')
  })
})

// ── Ending encounters ─────────────────────────────────────────────────────────

describe('EncounterSessionService — endEncounter', () => {
  it('ends an active encounter', async () => {
    const { encounterId } = await createEncounter({
      npcTemplateKeys: ['bree_millhaven'],
    })

    const result = endEncounter(encounterId)
    assert.equal(result.status, 'ended')
    assert.equal(result.encounterId, encounterId)
  })

  it('encounter state shows ended after ending', async () => {
    const { encounterId } = await createEncounter({
      npcTemplateKeys: ['bree_millhaven'],
    })
    endEncounter(encounterId)

    const state = getEncounter(encounterId)
    assert.equal(state.status, 'ended')
  })

  it('throws for unknown encounter', () => {
    assert.throws(
      () => endEncounter('enc_fake'),
      err => err.code === 'ENCOUNTER_NOT_FOUND',
    )
  })
})

// ── Listing encounters ────────────────────────────────────────────────────────

describe('EncounterSessionService — listEncounters', () => {
  it('lists all encounters', async () => {
    await createEncounter({ npcTemplateKeys: ['bree_millhaven'] })
    await createEncounter({ npcTemplateKeys: ['torval_grimm'] })

    const list = listEncounters()
    assert.equal(list.length, 2)
  })

  it('includes encounter metadata', async () => {
    const { encounterId } = await createEncounter({
      npcTemplateKeys: ['bree_millhaven'],
    })
    await sendMessage(encounterId, { text: 'Hi!' })

    const list = listEncounters()
    const enc = list.find(e => e.encounterId === encounterId)
    assert.ok(enc)
    assert.equal(enc.messageCount, 2)  // player + NPC
    assert.equal(enc.status, 'active')
    assert.ok(enc.createdAt > 0)
  })
})

// ── Conversation user prompt integration ──────────────────────────────────────

describe('CharacterContextPackage — conversation history in buildUserPrompt', () => {
  // Test that buildUserPrompt handles conversationHistory correctly
  const { buildUserPrompt, buildContextPackage, TRIGGER_EVENT, EMOTIONAL_STATE } = require('../../llm/CharacterContextPackage')

  function makeBasicPkg() {
    return buildContextPackage(
      {
        id: 'test_npc', name: 'TestNpc', race: 'Human', npcType: 'friendly',
        personality: { voice: 'neutral', alignment: 'neutral', disposition: 'friendly', backstory: 'A test NPC.' },
        knowledge: {}, relationships: {}, stats: { intelligence: 10, wisdom: 10, charisma: 10 },
      },
      {
        triggerEvent: TRIGGER_EVENT.PLAYER_ADDRESSED,
        emotionalState: EMOTIONAL_STATE.CALM,
        combatState: { hpPercent: 100, conditions: [], recentActions: [] },
        worldContext: { location: 'tavern', timeOfDay: 'evening', tone: 'relaxed' },
        nearbyEntities: [],
        recentEvents: [],
      },
      { maxTokens: 150, format: 'spoken', avoidRepetition: [] },
    )
  }

  it('includes CONVERSATION SO FAR section when conversationHistory present', () => {
    const pkg = {
      ...makeBasicPkg(),
      conversationHistory: [
        { sender: 'Aldric', text: 'Hello!' },
        { sender: 'TestNpc', text: 'Well met, traveler.' },
        { sender: 'Aldric', text: 'What news?' },
      ],
    }

    const prompt = buildUserPrompt(pkg)
    assert.ok(prompt.includes('[CONVERSATION SO FAR]'))
    assert.ok(prompt.includes('Aldric: Hello!'))
    assert.ok(prompt.includes('TestNpc: Well met, traveler.'))
    assert.ok(prompt.includes('Aldric: What news?'))
  })

  it('omits CONVERSATION section when no history', () => {
    const pkg = makeBasicPkg()
    const prompt = buildUserPrompt(pkg)
    assert.ok(!prompt.includes('[CONVERSATION SO FAR]'))
  })

  it('limits conversation history to last 10 messages', () => {
    const history = []
    for (let i = 0; i < 15; i++) {
      history.push({ sender: 'Player', text: `Message ${i}` })
    }
    const pkg = { ...makeBasicPkg(), conversationHistory: history }
    const prompt = buildUserPrompt(pkg)
    assert.ok(!prompt.includes('Message 0'))
    assert.ok(!prompt.includes('Message 4'))
    assert.ok(prompt.includes('Message 5'))
    assert.ok(prompt.includes('Message 14'))
  })
})
