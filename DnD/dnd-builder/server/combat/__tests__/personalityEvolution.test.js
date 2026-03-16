/**
 * Phase 5 — PersonalityEvolutionService Tests
 *
 * Validates the PersonalityEvolutionService which tracks permanent NPC
 * personality changes across sessions:
 *   1. Evolution record creation and retrieval
 *   2. Arc advancement
 *   3. Disposition shifting
 *   4. Relationship quality adjustment
 *   5. Opinion overrides
 *   6. Encounter survival tracking
 *   7. Encounter crystallization (session → permanent)
 *   8. Evolution summary for prompt injection
 *   9. Opinions context building (with nearby NPC filtering)
 *  10. Edge cases and boundary conditions
 *
 * Run with:
 *   node --test server/combat/__tests__/personalityEvolution.test.js
 */

'use strict'

const { describe, it, beforeEach } = require('node:test')
const assert = require('node:assert/strict')

const {
  getEvolution,
  advanceArc,
  shiftDisposition,
  adjustRelationship,
  setOpinionOverride,
  recordEncounterSurvived,
  crystallizeEncounter,
  buildEvolutionSummary,
  buildOpinionsContext,
  clearAll,
  clearEvolution,
  _getStore,
} = require('../../services/PersonalityEvolutionService')


// ── Test helpers ──────────────────────────────────────────────────────────────

function makeMockPersonality(overrides = {}) {
  return {
    templateKey: overrides.templateKey || 'test_npc',
    name: overrides.name || 'Test NPC',
    consciousnessContext: {
      characterArc: {
        summary: 'A test character discovers something',
        startState: 'Starting state',
        endState: 'Ending state',
        stages: ['Stage 1', 'Stage 2', 'Stage 3'],
      },
      opinionsAbout: {
        sera_dunwick: 'A capable guard',
        hodge_fence: 'Untrustworthy',
        ...(overrides.opinions || {}),
      },
      ...(overrides.consciousness || {}),
    },
  }
}


// ═══════════════════════════════════════════════════════════════════════════════
// 1. Evolution record creation and retrieval
// ═══════════════════════════════════════════════════════════════════════════════

describe('PersonalityEvolution — record creation', () => {
  beforeEach(() => clearAll())

  it('creates a new record with defaults', () => {
    const record = getEvolution('sera_dunwick')
    assert.equal(record.templateKey, 'sera_dunwick')
    assert.equal(record.arcStage, 0.0)
    assert.deepStrictEqual(record.arcMilestones, [])
    assert.equal(record.permanentDisposition, 0.0)
    assert.deepStrictEqual(record.relationshipQuality, {})
    assert.deepStrictEqual(record.opinionOverrides, {})
    assert.deepStrictEqual(record.personalGrowth, [])
    assert.equal(record.encountersSurvived, 0)
    assert.ok(record.createdAt > 0)
    assert.ok(record.lastUpdatedAt > 0)
  })

  it('returns the same record on subsequent calls', () => {
    const first = getEvolution('sera_dunwick')
    first.arcStage = 0.5
    const second = getEvolution('sera_dunwick')
    assert.equal(second.arcStage, 0.5)
    assert.strictEqual(first, second)
  })

  it('returns null for null/undefined templateKey', () => {
    assert.equal(getEvolution(null), null)
    assert.equal(getEvolution(undefined), null)
    assert.equal(getEvolution(''), null)
  })

  it('creates separate records for different NPCs', () => {
    const sera = getEvolution('sera_dunwick')
    const fen = getEvolution('fen_colby')
    sera.arcStage = 0.3
    assert.equal(fen.arcStage, 0.0)
  })
})


// ═══════════════════════════════════════════════════════════════════════════════
// 2. Arc advancement
// ═══════════════════════════════════════════════════════════════════════════════

describe('PersonalityEvolution — arc advancement', () => {
  beforeEach(() => clearAll())

  it('advances arc by delta', () => {
    advanceArc('sera_dunwick', 0.25)
    const record = getEvolution('sera_dunwick')
    assert.equal(record.arcStage, 0.25)
  })

  it('records milestone when provided', () => {
    advanceArc('sera_dunwick', 0.1, 'Completed Hodge investigation')
    const record = getEvolution('sera_dunwick')
    assert.deepStrictEqual(record.arcMilestones, ['Completed Hodge investigation'])
  })

  it('accumulates multiple advances', () => {
    advanceArc('sera_dunwick', 0.2, 'First step')
    advanceArc('sera_dunwick', 0.3, 'Second step')
    const record = getEvolution('sera_dunwick')
    assert.ok(Math.abs(record.arcStage - 0.5) < 0.001)
    assert.equal(record.arcMilestones.length, 2)
  })

  it('clamps arc stage to 1.0', () => {
    advanceArc('sera_dunwick', 0.8)
    advanceArc('sera_dunwick', 0.5)
    const record = getEvolution('sera_dunwick')
    assert.equal(record.arcStage, 1.0)
  })

  it('clamps arc stage to 0.0 on negative delta', () => {
    advanceArc('sera_dunwick', 0.3)
    advanceArc('sera_dunwick', -0.5)
    const record = getEvolution('sera_dunwick')
    assert.equal(record.arcStage, 0.0)
  })

  it('returns null for null templateKey', () => {
    assert.equal(advanceArc(null, 0.1), null)
  })

  it('updates lastUpdatedAt', () => {
    const record = getEvolution('sera_dunwick')
    const before = record.lastUpdatedAt
    // Small delay to ensure timestamp changes
    advanceArc('sera_dunwick', 0.1)
    assert.ok(record.lastUpdatedAt >= before)
  })
})


// ═══════════════════════════════════════════════════════════════════════════════
// 3. Disposition shifting
// ═══════════════════════════════════════════════════════════════════════════════

describe('PersonalityEvolution — disposition shifting', () => {
  beforeEach(() => clearAll())

  it('shifts disposition positively', () => {
    shiftDisposition('fen_colby', 0.3)
    const record = getEvolution('fen_colby')
    assert.ok(Math.abs(record.permanentDisposition - 0.3) < 0.001)
  })

  it('shifts disposition negatively', () => {
    shiftDisposition('fen_colby', -0.4)
    const record = getEvolution('fen_colby')
    assert.ok(Math.abs(record.permanentDisposition - (-0.4)) < 0.001)
  })

  it('records reason as personal growth', () => {
    shiftDisposition('fen_colby', 0.2, 'Party helped recover his ledger')
    const record = getEvolution('fen_colby')
    assert.deepStrictEqual(record.personalGrowth, ['Party helped recover his ledger'])
  })

  it('clamps to +1.0', () => {
    shiftDisposition('fen_colby', 0.8)
    shiftDisposition('fen_colby', 0.5)
    assert.equal(getEvolution('fen_colby').permanentDisposition, 1.0)
  })

  it('clamps to -1.0', () => {
    shiftDisposition('fen_colby', -0.8)
    shiftDisposition('fen_colby', -0.5)
    assert.equal(getEvolution('fen_colby').permanentDisposition, -1.0)
  })

  it('returns null for null templateKey', () => {
    assert.equal(shiftDisposition(null, 0.1), null)
  })
})


// ═══════════════════════════════════════════════════════════════════════════════
// 4. Relationship quality adjustment
// ═══════════════════════════════════════════════════════════════════════════════

describe('PersonalityEvolution — relationship quality', () => {
  beforeEach(() => clearAll())

  it('creates new relationship on first adjustment', () => {
    adjustRelationship('sera_dunwick', 'player_1', 0.2)
    const record = getEvolution('sera_dunwick')
    assert.ok(Math.abs(record.relationshipQuality.player_1 - 0.2) < 0.001)
  })

  it('accumulates adjustments', () => {
    adjustRelationship('sera_dunwick', 'player_1', 0.3)
    adjustRelationship('sera_dunwick', 'player_1', 0.2)
    const record = getEvolution('sera_dunwick')
    assert.ok(Math.abs(record.relationshipQuality.player_1 - 0.5) < 0.001)
  })

  it('tracks multiple entities independently', () => {
    adjustRelationship('sera_dunwick', 'player_1', 0.3)
    adjustRelationship('sera_dunwick', 'player_2', -0.1)
    const record = getEvolution('sera_dunwick')
    assert.ok(Math.abs(record.relationshipQuality.player_1 - 0.3) < 0.001)
    assert.ok(Math.abs(record.relationshipQuality.player_2 - (-0.1)) < 0.001)
  })

  it('clamps to [-1, +1]', () => {
    adjustRelationship('sera_dunwick', 'player_1', 0.9)
    adjustRelationship('sera_dunwick', 'player_1', 0.5)
    assert.equal(getEvolution('sera_dunwick').relationshipQuality.player_1, 1.0)

    adjustRelationship('sera_dunwick', 'player_2', -0.9)
    adjustRelationship('sera_dunwick', 'player_2', -0.5)
    assert.equal(getEvolution('sera_dunwick').relationshipQuality.player_2, -1.0)
  })

  it('returns null for null templateKey', () => {
    assert.equal(adjustRelationship(null, 'player_1', 0.1), null)
  })
})


// ═══════════════════════════════════════════════════════════════════════════════
// 5. Opinion overrides
// ═══════════════════════════════════════════════════════════════════════════════

describe('PersonalityEvolution — opinion overrides', () => {
  beforeEach(() => clearAll())

  it('sets opinion override', () => {
    setOpinionOverride('sera_dunwick', 'hodge_fence', 'Surprisingly trustworthy after the incident')
    const record = getEvolution('sera_dunwick')
    assert.equal(record.opinionOverrides.hodge_fence, 'Surprisingly trustworthy after the incident')
  })

  it('replaces previous override', () => {
    setOpinionOverride('sera_dunwick', 'hodge_fence', 'First opinion')
    setOpinionOverride('sera_dunwick', 'hodge_fence', 'Updated opinion')
    const record = getEvolution('sera_dunwick')
    assert.equal(record.opinionOverrides.hodge_fence, 'Updated opinion')
  })

  it('returns null for null templateKey', () => {
    assert.equal(setOpinionOverride(null, 'hodge_fence', 'opinion'), null)
  })
})


// ═══════════════════════════════════════════════════════════════════════════════
// 6. Encounter survival tracking
// ═══════════════════════════════════════════════════════════════════════════════

describe('PersonalityEvolution — encounter survival', () => {
  beforeEach(() => clearAll())

  it('increments encounter count', () => {
    recordEncounterSurvived('sera_dunwick')
    recordEncounterSurvived('sera_dunwick')
    recordEncounterSurvived('sera_dunwick')
    assert.equal(getEvolution('sera_dunwick').encountersSurvived, 3)
  })

  it('returns null for null templateKey', () => {
    assert.equal(recordEncounterSurvived(null), null)
  })
})


// ═══════════════════════════════════════════════════════════════════════════════
// 7. Encounter crystallization
// ═══════════════════════════════════════════════════════════════════════════════

describe('PersonalityEvolution — crystallization', () => {
  beforeEach(() => clearAll())

  it('crystallizes disposition shift', () => {
    const memory = { dispositionShift: 0.5 }
    crystallizeEncounter('sera_dunwick', memory)
    const record = getEvolution('sera_dunwick')
    // 0.5 * 0.3 (default rate) = 0.15
    assert.ok(Math.abs(record.permanentDisposition - 0.15) < 0.001)
  })

  it('crystallizes trust level changes', () => {
    const memory = {
      defaultTrust: 0.3,
      trustLevels: { player_1: 0.8 }  // 0.5 above default
    }
    crystallizeEncounter('sera_dunwick', memory)
    const record = getEvolution('sera_dunwick')
    // (0.8 - 0.3) * 0.3 = 0.15
    assert.ok(Math.abs(record.relationshipQuality.player_1 - 0.15) < 0.001)
  })

  it('ignores small trust changes below threshold', () => {
    const memory = {
      defaultTrust: 0.3,
      trustLevels: { player_1: 0.33 }  // Only 0.03 above default = below 0.05 threshold
    }
    crystallizeEncounter('sera_dunwick', memory)
    const record = getEvolution('sera_dunwick')
    assert.equal(record.relationshipQuality.player_1, undefined)
  })

  it('records significant moments as personal growth', () => {
    const memory = {
      significantMoments: ['Saved by the party during ambush', 'Revealed a secret willingly']
    }
    crystallizeEncounter('sera_dunwick', memory)
    const record = getEvolution('sera_dunwick')
    assert.equal(record.personalGrowth.length, 2)
    assert.ok(record.personalGrowth[0].includes('Saved'))
  })

  it('limits significant moments to 2 per encounter', () => {
    const memory = {
      significantMoments: ['First', 'Second', 'Third', 'Fourth']
    }
    crystallizeEncounter('sera_dunwick', memory)
    const record = getEvolution('sera_dunwick')
    assert.equal(record.personalGrowth.length, 2)
  })

  it('trims personal growth to last 20', () => {
    // Add 19 growth entries first
    const record = getEvolution('sera_dunwick')
    for (let i = 0; i < 19; i++) {
      record.personalGrowth.push(`growth ${i}`)
    }
    // Now crystallize with 2 more = 21, should trim to 20
    const memory = { significantMoments: ['New 1', 'New 2'] }
    crystallizeEncounter('sera_dunwick', memory)
    assert.equal(record.personalGrowth.length, 20)
    assert.equal(record.personalGrowth[19], 'New 2')
  })

  it('respects custom crystallization rate', () => {
    const memory = { dispositionShift: 0.5 }
    crystallizeEncounter('sera_dunwick', memory, { crystallizationRate: 0.5 })
    const record = getEvolution('sera_dunwick')
    // 0.5 * 0.5 = 0.25
    assert.ok(Math.abs(record.permanentDisposition - 0.25) < 0.001)
  })

  it('clamps crystallization rate to [0, 1]', () => {
    const memory = { dispositionShift: 0.5 }
    crystallizeEncounter('sera_dunwick', memory, { crystallizationRate: 5.0 })
    const record = getEvolution('sera_dunwick')
    // 0.5 * 1.0 (clamped) = 0.5
    assert.ok(Math.abs(record.permanentDisposition - 0.5) < 0.001)
  })

  it('increments encounter count', () => {
    crystallizeEncounter('sera_dunwick', {})
    crystallizeEncounter('sera_dunwick', {})
    assert.equal(getEvolution('sera_dunwick').encountersSurvived, 2)
  })

  it('returns null for null encounterMemory', () => {
    assert.equal(crystallizeEncounter('sera_dunwick', null), null)
  })

  it('returns null for null templateKey', () => {
    assert.equal(crystallizeEncounter(null, {}), null)
  })
})


// ═══════════════════════════════════════════════════════════════════════════════
// 8. Evolution summary for prompt injection
// ═══════════════════════════════════════════════════════════════════════════════

describe('PersonalityEvolution — evolution summary', () => {
  beforeEach(() => clearAll())

  it('returns empty string when no evolution exists', () => {
    assert.equal(buildEvolutionSummary('sera_dunwick'), '')
  })

  it('returns empty string when record exists but no progress', () => {
    getEvolution('sera_dunwick')  // Create record
    assert.equal(buildEvolutionSummary('sera_dunwick'), '')
  })

  it('includes arc progression', () => {
    advanceArc('sera_dunwick', 0.4, 'Completed investigation')
    const personality = makeMockPersonality({ templateKey: 'sera_dunwick' })
    const summary = buildEvolutionSummary('sera_dunwick', personality)
    assert.ok(summary.includes('Character arc'))
    assert.ok(summary.includes('40%'))
    assert.ok(summary.includes('Completed investigation'))
  })

  it('includes permanent disposition shift', () => {
    shiftDisposition('sera_dunwick', 0.5, 'Saved town')
    recordEncounterSurvived('sera_dunwick')  // Need at least 1 encounter for summary
    const summary = buildEvolutionSummary('sera_dunwick')
    assert.ok(summary.includes('warmer toward'))
    assert.ok(summary.includes('notably'))
  })

  it('describes negative disposition correctly', () => {
    shiftDisposition('sera_dunwick', -0.7)
    recordEncounterSurvived('sera_dunwick')
    const summary = buildEvolutionSummary('sera_dunwick')
    assert.ok(summary.includes('colder toward'))
    assert.ok(summary.includes('significantly'))
  })

  it('includes personal growth items', () => {
    shiftDisposition('sera_dunwick', 0.1, 'Helped a stranger')
    recordEncounterSurvived('sera_dunwick')
    const summary = buildEvolutionSummary('sera_dunwick')
    assert.ok(summary.includes('Helped a stranger'))
  })

  it('includes encounter count for multiple encounters', () => {
    recordEncounterSurvived('sera_dunwick')
    recordEncounterSurvived('sera_dunwick')
    recordEncounterSurvived('sera_dunwick')
    const summary = buildEvolutionSummary('sera_dunwick')
    assert.ok(summary.includes('3 encounters'))
  })

  it('skips light disposition (below 0.05 threshold)', () => {
    shiftDisposition('sera_dunwick', 0.02)
    recordEncounterSurvived('sera_dunwick')
    const summary = buildEvolutionSummary('sera_dunwick')
    assert.ok(!summary.includes('warmer'))
  })
})


// ═══════════════════════════════════════════════════════════════════════════════
// 9. Opinions context building
// ═══════════════════════════════════════════════════════════════════════════════

describe('PersonalityEvolution — opinions context', () => {
  beforeEach(() => clearAll())

  it('returns opinions from personality data', () => {
    const personality = makeMockPersonality()
    const result = buildOpinionsContext('test_npc', personality)
    assert.ok(result.includes('sera_dunwick'))
    assert.ok(result.includes('A capable guard'))
    assert.ok(result.includes('hodge_fence'))
    assert.ok(result.includes('Untrustworthy'))
  })

  it('filters to nearby NPCs when list provided', () => {
    const personality = makeMockPersonality()
    const result = buildOpinionsContext('test_npc', personality, ['sera_dunwick'])
    assert.ok(result.includes('sera_dunwick'))
    assert.ok(!result.includes('hodge_fence'))
  })

  it('returns empty string when no opinions match nearby', () => {
    const personality = makeMockPersonality()
    const result = buildOpinionsContext('test_npc', personality, ['some_stranger'])
    assert.equal(result, '')
  })

  it('returns empty string when no opinions exist', () => {
    const personality = makeMockPersonality({ consciousness: { opinionsAbout: {} } })
    const result = buildOpinionsContext('test_npc', personality)
    assert.equal(result, '')
  })

  it('overrides base opinions with evolution overrides', () => {
    setOpinionOverride('test_npc', 'hodge_fence', 'Actually reliable')
    const personality = makeMockPersonality()
    const result = buildOpinionsContext('test_npc', personality)
    assert.ok(result.includes('Actually reliable'))
    assert.ok(!result.includes('Untrustworthy'))
  })

  it('includes evolution-only opinions not in base data', () => {
    setOpinionOverride('test_npc', 'new_npc', 'Brand new opinion')
    const personality = makeMockPersonality()
    const result = buildOpinionsContext('test_npc', personality)
    assert.ok(result.includes('new_npc'))
    assert.ok(result.includes('Brand new opinion'))
  })

  it('handles null personality gracefully', () => {
    const result = buildOpinionsContext('test_npc', null)
    assert.equal(result, '')
  })

  it('handles personality without consciousnessContext', () => {
    const result = buildOpinionsContext('test_npc', { name: 'Test' })
    assert.equal(result, '')
  })
})


// ═══════════════════════════════════════════════════════════════════════════════
// 10. Housekeeping
// ═══════════════════════════════════════════════════════════════════════════════

describe('PersonalityEvolution — housekeeping', () => {
  beforeEach(() => clearAll())

  it('clearAll removes all records', () => {
    getEvolution('sera_dunwick')
    getEvolution('fen_colby')
    assert.equal(_getStore().size, 2)
    clearAll()
    assert.equal(_getStore().size, 0)
  })

  it('clearEvolution removes single record', () => {
    getEvolution('sera_dunwick')
    getEvolution('fen_colby')
    clearEvolution('sera_dunwick')
    assert.equal(_getStore().size, 1)
    assert.ok(!_getStore().has('sera_dunwick'))
    assert.ok(_getStore().has('fen_colby'))
  })
})
