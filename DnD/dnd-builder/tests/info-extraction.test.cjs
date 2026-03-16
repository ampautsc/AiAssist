/**
 * Unit tests for EncounterMemoryService revealedInfo features
 * and InfoExtractionService.
 *
 * Run: node tests/info-extraction.test.cjs
 */

'use strict'

const assert = require('assert')

// ── EncounterMemoryService tests ──────────────────────────────────────────────

const EncounterMemory = require('../server/services/EncounterMemoryService')

function testRevealedInfoInitialization() {
  EncounterMemory.clearAllMemory()

  const mem = EncounterMemory.getMemory('test-session', 'npc1')

  // revealedInfo should exist with all null fields
  assert.ok(mem.revealedInfo, 'revealedInfo should be initialized')
  assert.strictEqual(mem.revealedInfo.appearance, null)
  assert.strictEqual(mem.revealedInfo.disposition, null)
  assert.strictEqual(mem.revealedInfo.backstory, null)
  assert.strictEqual(mem.revealedInfo.voice, null)
  assert.strictEqual(mem.revealedInfo.motivations, null)
  assert.strictEqual(mem.revealedInfo.fears, null)
  assert.strictEqual(mem.revealedInfo.mannerisms, null)
  assert.strictEqual(mem.revealedInfo.speechPatterns, null)

  console.log('  PASS: revealedInfo initialization')
}

function testInitRevealedInfo() {
  EncounterMemory.clearAllMemory()

  EncounterMemory.getMemory('test-session', 'npc1')
  EncounterMemory.initRevealedInfo('test-session', 'npc1', {
    appearance: 'A tall half-elf with striking green eyes.',
  })

  const info = EncounterMemory.getRevealedInfo('test-session', 'npc1')
  assert.strictEqual(info.appearance, 'A tall half-elf with striking green eyes.')
  assert.strictEqual(info.disposition, null, 'Other fields should remain null')

  console.log('  PASS: initRevealedInfo sets baseline')
}

function testRevealInfoStringField() {
  EncounterMemory.clearAllMemory()

  EncounterMemory.getMemory('test-session', 'npc1')
  EncounterMemory.revealInfo('test-session', 'npc1', 'backstory', 'Grew up on a farm.')
  EncounterMemory.revealInfo('test-session', 'npc1', 'backstory', 'Parents disappeared.')

  const info = EncounterMemory.getRevealedInfo('test-session', 'npc1')
  assert.strictEqual(info.backstory, 'Grew up on a farm. Parents disappeared.', 'String fields should append')

  console.log('  PASS: revealInfo appends string fields')
}

function testRevealInfoArrayField() {
  EncounterMemory.clearAllMemory()

  EncounterMemory.getMemory('test-session', 'npc1')
  EncounterMemory.revealInfo('test-session', 'npc1', 'motivations', ['Find gold'])
  EncounterMemory.revealInfo('test-session', 'npc1', 'motivations', ['Find gold', 'Save the world'])

  const info = EncounterMemory.getRevealedInfo('test-session', 'npc1')
  assert.deepStrictEqual(info.motivations, ['Find gold', 'Save the world'], 'Array fields should merge and deduplicate')

  console.log('  PASS: revealInfo merges array fields with deduplication')
}

function testRevealInfoArrayFieldString() {
  EncounterMemory.clearAllMemory()

  EncounterMemory.getMemory('test-session', 'npc1')
  EncounterMemory.revealInfo('test-session', 'npc1', 'fears', 'darkness')

  const info = EncounterMemory.getRevealedInfo('test-session', 'npc1')
  assert.deepStrictEqual(info.fears, ['darkness'], 'Single string should be wrapped in array')

  console.log('  PASS: revealInfo wraps single string in array for array fields')
}

function testRevealInfoInvalidField() {
  EncounterMemory.clearAllMemory()

  EncounterMemory.getMemory('test-session', 'npc1')
  EncounterMemory.revealInfo('test-session', 'npc1', 'invalidField', 'value')

  const info = EncounterMemory.getRevealedInfo('test-session', 'npc1')
  assert.strictEqual(info.invalidField, undefined, 'Invalid fields should be ignored')

  console.log('  PASS: revealInfo ignores invalid fields')
}

function testGetRevealedInfoReturnsACopy() {
  EncounterMemory.clearAllMemory()

  EncounterMemory.getMemory('test-session', 'npc1')
  EncounterMemory.initRevealedInfo('test-session', 'npc1', { appearance: 'test' })

  const info1 = EncounterMemory.getRevealedInfo('test-session', 'npc1')
  info1.appearance = 'modified'

  const info2 = EncounterMemory.getRevealedInfo('test-session', 'npc1')
  assert.strictEqual(info2.appearance, 'test', 'getRevealedInfo should return a copy')

  console.log('  PASS: getRevealedInfo returns a shallow copy')
}

// ── InfoExtractionService tests ───────────────────────────────────────────────

const InfoExtraction = require('../server/services/InfoExtractionService')

function testFallbackAppearance() {
  const result = InfoExtraction._fallbackAppearance('Bree', 'Half-Elf')
  assert.ok(result.includes('Bree'), 'Should include the name')
  assert.ok(result.length > 20, 'Should generate a meaningful description')

  const unknown = InfoExtraction._fallbackAppearance('Unnamed', 'Goblin')
  assert.ok(unknown.toLowerCase().includes('goblin'), 'Should handle non-standard races via lowercase')

  const human = InfoExtraction._fallbackAppearance('John', 'Human')
  assert.ok(human.includes('John'), 'Should include the name for humans')
  assert.ok(human.includes('human'), 'Should use race description from lookup table')

  console.log('  PASS: _fallbackAppearance generates reasonable descriptions')
}

function testHeuristicExtractionBackstory() {
  const personality = {
    personality: { voice: 'Warm and melodic', fears: ['fire', 'abandonment'] },
  }
  const currentRevealed = { backstory: null, voice: null, fears: null }

  const result = InfoExtraction._heuristicExtraction(
    'I remember when I was young, my parents used to take me to the forest every autumn to collect herbs and berries.',
    personality,
    currentRevealed,
  )

  assert.ok(result.reveals.backstory, 'Should detect backstory keywords')
  assert.ok(result.reveals.voice, 'Should detect voice from substantial response (>80 chars)')

  console.log('  PASS: _heuristicExtraction detects backstory + voice')
}

function testHeuristicExtractionFears() {
  const personality = {
    personality: { fears: ['fire', 'abandonment'] },
  }
  const currentRevealed = { fears: null }

  const result = InfoExtraction._heuristicExtraction(
    "I'm afraid of what might happen if we go deeper.",
    personality,
    currentRevealed,
  )

  assert.ok(result.reveals.fears, 'Should detect fear keywords')
  assert.deepStrictEqual(result.reveals.fears, ['fire'], 'Should reveal first fear from personality')

  console.log('  PASS: _heuristicExtraction detects fears')
}

function testHeuristicExtractionNoReveal() {
  const personality = {
    personality: { fears: ['fire'] },
  }
  const currentRevealed = { backstory: null, voice: 'already known', fears: null }

  const result = InfoExtraction._heuristicExtraction(
    'Hello there!',
    personality,
    currentRevealed,
  )

  // Short generic response should reveal nothing
  assert.strictEqual(Object.keys(result.reveals).length, 0, 'Short responses should reveal nothing')

  console.log('  PASS: _heuristicExtraction returns empty for generic responses')
}

function testParseExtractionResult() {
  const raw = `{"reveals": {"disposition": "Seems warm and welcoming", "backstory": null, "motivations": ["Finding her parents"], "fears": null}}`
  const currentRevealed = { disposition: null, motivations: null }

  const result = InfoExtraction._parseExtractionResult(raw, {}, currentRevealed)

  assert.strictEqual(result.reveals.disposition, 'Seems warm and welcoming')
  assert.deepStrictEqual(result.reveals.motivations, ['Finding her parents'])
  assert.strictEqual(result.reveals.backstory, undefined, 'Null fields should be omitted')

  console.log('  PASS: _parseExtractionResult handles valid JSON')
}

function testParseExtractionResultWithExtraText() {
  const raw = `Here is the analysis:\n{"reveals": {"voice": "Soft and measured"}}\nEnd of extraction.`
  const result = InfoExtraction._parseExtractionResult(raw, {}, {})

  assert.strictEqual(result.reveals.voice, 'Soft and measured')

  console.log('  PASS: _parseExtractionResult extracts JSON from surrounding text')
}

function testParseExtractionResultGarbage() {
  const result = InfoExtraction._parseExtractionResult('This is not JSON at all', {}, {})
  assert.deepStrictEqual(result.reveals, {})

  console.log('  PASS: _parseExtractionResult handles garbage gracefully')
}

function testSummarizeRevealed() {
  const revealed = {
    appearance: 'Tall with green eyes',
    disposition: 'Warm and welcoming',
    backstory: null,
    voice: null,
    motivations: ['Find treasure'],
    fears: null,
    mannerisms: null,
    speechPatterns: null,
  }

  const summary = InfoExtraction._summarizeRevealed(revealed)
  assert.ok(summary.includes('Appearance: Tall with green eyes'))
  assert.ok(summary.includes('Demeanor: Warm and welcoming'))
  assert.ok(summary.includes('Motivations: Find treasure'))
  assert.ok(!summary.includes('Voice'), 'Null fields should not appear')

  console.log('  PASS: _summarizeRevealed includes non-null fields')
}

function testSummarizeRevealedEmpty() {
  const summary = InfoExtraction._summarizeRevealed({})
  assert.strictEqual(summary, 'Nothing known yet.')

  console.log('  PASS: _summarizeRevealed handles empty state')
}

function testBuildPersonalityReference() {
  const personality = {
    name: 'Bree Millhaven',
    race: 'Human',
    personality: {
      disposition: 'Warm and observant',
      voice: 'Melodic alto',
      backstory: 'Inherited a tavern',
      motivations: ['Find parents'],
      fears: ['Being alone'],
      mannerisms: ['Taps the bar when thinking'],
      speechPatterns: ['Uses folksy expressions'],
    },
  }

  const ref = InfoExtraction._buildPersonalityReference(personality)
  assert.ok(ref.includes('Bree Millhaven'))
  assert.ok(ref.includes('Human'))
  assert.ok(ref.includes('Warm and observant'))
  assert.ok(ref.includes('Find parents'))

  console.log('  PASS: _buildPersonalityReference includes all fields')
}

// ── Run all tests ─────────────────────────────────────────────────────────────

console.log('\n=== EncounterMemoryService: revealedInfo tests ===\n')
testRevealedInfoInitialization()
testInitRevealedInfo()
testRevealInfoStringField()
testRevealInfoArrayField()
testRevealInfoArrayFieldString()
testRevealInfoInvalidField()
testGetRevealedInfoReturnsACopy()

console.log('\n=== InfoExtractionService tests ===\n')
testFallbackAppearance()
testHeuristicExtractionBackstory()
testHeuristicExtractionFears()
testHeuristicExtractionNoReveal()
testParseExtractionResult()
testParseExtractionResultWithExtraText()
testParseExtractionResultGarbage()
testSummarizeRevealed()
testSummarizeRevealedEmpty()
testBuildPersonalityReference()

console.log('\n=== ALL TESTS PASSED ===\n')
