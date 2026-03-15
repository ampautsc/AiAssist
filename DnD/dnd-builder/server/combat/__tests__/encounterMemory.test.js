/**
 * Phase 3 — Encounter Memory Service Tests
 *
 * Validates the EncounterMemoryService which provides per-NPC, per-session
 * runtime memory tracking:
 *   1. Memory creation and retrieval
 *   2. Trust level management (get, adjust, set, clamp)
 *   3. Emotional arc tracking
 *   4. Significant moment recording
 *   5. Secret hinting and revealing
 *   6. Entity interaction tracking
 *   7. Disposition shift
 *   8. Trigger-based trust inference
 *   9. applyTriggerEffects convenience method
 *  10. buildMemorySummary for prompt injection
 *  11. Session cleanup
 *  12. Edge cases and boundary conditions
 *
 * Run with:
 *   node --test server/combat/__tests__/encounterMemory.test.js
 */

'use strict'

const { describe, it, beforeEach } = require('node:test')
const assert = require('node:assert/strict')

const {
  getMemory,
  hasMemory,
  getTrust,
  adjustTrust,
  setTrust,
  recordEmotion,
  getRecentEmotions,
  recordSignificantMoment,
  hintSecret,
  revealSecret,
  isSecretRevealed,
  isSecretHinted,
  recordEntityInteraction,
  recordInteraction,
  adjustDisposition,
  inferTrustChange,
  applyTriggerEffects,
  buildMemorySummary,
  clearSessionMemory,
  clearAllMemory,
  getAllMemoryKeys,
} = require('../../services/EncounterMemoryService')

const { TRIGGER_EVENT } = require('../../llm/CharacterContextPackage')

// ── Test constants ────────────────────────────────────────────────────────────

const SESSION  = 'sess-001'
const SESSION2 = 'sess-002'
const NPC      = 'brynn_whisperwind'
const NPC2     = 'gruff_ironjaw'
const PLAYER   = 'player-1'
const PLAYER2  = 'player-2'

// ── Helpers ───────────────────────────────────────────────────────────────────

function freshMemory(options) {
  return getMemory(SESSION, NPC, options)
}

// ═══════════════════════════════════════════════════════════════════════════════
//  1. Memory creation and retrieval
// ═══════════════════════════════════════════════════════════════════════════════

describe('EncounterMemoryService — Memory creation', () => {
  beforeEach(() => clearAllMemory())

  it('creates a new memory on first getMemory call', () => {
    const mem = getMemory(SESSION, NPC)
    assert.equal(mem.npcId, NPC)
    assert.equal(mem.sessionId, SESSION)
    assert.equal(mem.interactionCount, 0)
    assert.equal(mem.dispositionShift, 0)
    assert.deepEqual(mem.entitiesInteractedWith, [])
    assert.deepEqual(mem.trustLevels, {})
    assert.deepEqual(mem.emotionalArc, [])
    assert.deepEqual(mem.secretsRevealed, [])
    assert.deepEqual(mem.secretsHinted, [])
    assert.deepEqual(mem.significantMoments, [])
    assert.equal(mem.currentMood, 'neutral')
  })

  it('returns the same object on subsequent getMemory calls', () => {
    const first  = getMemory(SESSION, NPC)
    const second = getMemory(SESSION, NPC)
    assert.strictEqual(first, second)
  })

  it('uses default trust of 0.3 when no options provided', () => {
    const mem = getMemory(SESSION, NPC)
    assert.equal(mem.defaultTrust, 0.3)
  })

  it('accepts custom default trust via options', () => {
    const mem = getMemory(SESSION, NPC, { defaultTrust: 0.6 })
    assert.equal(mem.defaultTrust, 0.6)
  })

  it('ignores options on subsequent calls (first call wins)', () => {
    getMemory(SESSION, NPC, { defaultTrust: 0.1 })
    const second = getMemory(SESSION, NPC, { defaultTrust: 0.9 })
    assert.equal(second.defaultTrust, 0.1)
  })

  it('creates separate memories per session', () => {
    const mem1 = getMemory(SESSION, NPC)
    const mem2 = getMemory(SESSION2, NPC)
    assert.notStrictEqual(mem1, mem2)
    assert.equal(mem1.sessionId, SESSION)
    assert.equal(mem2.sessionId, SESSION2)
  })

  it('creates separate memories per NPC', () => {
    const mem1 = getMemory(SESSION, NPC)
    const mem2 = getMemory(SESSION, NPC2)
    assert.notStrictEqual(mem1, mem2)
    assert.equal(mem1.npcId, NPC)
    assert.equal(mem2.npcId, NPC2)
  })

  it('hasMemory returns false before first access', () => {
    assert.equal(hasMemory(SESSION, NPC), false)
  })

  it('hasMemory returns true after getMemory', () => {
    getMemory(SESSION, NPC)
    assert.equal(hasMemory(SESSION, NPC), true)
  })

  it('includes timestamps on creation', () => {
    const before = Date.now()
    const mem = getMemory(SESSION, NPC)
    const after = Date.now()
    assert.ok(mem.createdAt >= before && mem.createdAt <= after)
    assert.ok(mem.lastUpdatedAt >= before && mem.lastUpdatedAt <= after)
  })
})

// ═══════════════════════════════════════════════════════════════════════════════
//  2. Trust level management
// ═══════════════════════════════════════════════════════════════════════════════

describe('EncounterMemoryService — Trust levels', () => {
  beforeEach(() => clearAllMemory())

  it('getTrust returns defaultTrust for unknown entities', () => {
    getMemory(SESSION, NPC, { defaultTrust: 0.4 })
    assert.equal(getTrust(SESSION, NPC, PLAYER), 0.4)
  })

  it('adjustTrust increases trust', () => {
    getMemory(SESSION, NPC, { defaultTrust: 0.3 })
    const result = adjustTrust(SESSION, NPC, PLAYER, 0.2)
    assert.equal(result, 0.5)
    assert.equal(getTrust(SESSION, NPC, PLAYER), 0.5)
  })

  it('adjustTrust decreases trust', () => {
    getMemory(SESSION, NPC, { defaultTrust: 0.5 })
    const result = adjustTrust(SESSION, NPC, PLAYER, -0.3)
    assert.ok(Math.abs(result - 0.2) < 0.001)
  })

  it('adjustTrust clamps at 0 (no negative trust)', () => {
    getMemory(SESSION, NPC, { defaultTrust: 0.1 })
    const result = adjustTrust(SESSION, NPC, PLAYER, -0.5)
    assert.equal(result, 0)
  })

  it('adjustTrust clamps at 1 (max trust)', () => {
    getMemory(SESSION, NPC, { defaultTrust: 0.9 })
    const result = adjustTrust(SESSION, NPC, PLAYER, 0.5)
    assert.equal(result, 1)
  })

  it('adjustTrust is cumulative', () => {
    getMemory(SESSION, NPC, { defaultTrust: 0.3 })
    adjustTrust(SESSION, NPC, PLAYER, 0.1) // 0.4
    adjustTrust(SESSION, NPC, PLAYER, 0.1) // 0.5
    adjustTrust(SESSION, NPC, PLAYER, 0.1) // 0.6
    assert.ok(Math.abs(getTrust(SESSION, NPC, PLAYER) - 0.6) < 0.001)
  })

  it('tracks trust per entity independently', () => {
    getMemory(SESSION, NPC, { defaultTrust: 0.3 })
    adjustTrust(SESSION, NPC, PLAYER, 0.2)
    adjustTrust(SESSION, NPC, PLAYER2, -0.1)
    assert.equal(getTrust(SESSION, NPC, PLAYER), 0.5)
    assert.ok(Math.abs(getTrust(SESSION, NPC, PLAYER2) - 0.2) < 0.001)
  })

  it('setTrust overrides trust absolutely', () => {
    getMemory(SESSION, NPC, { defaultTrust: 0.3 })
    adjustTrust(SESSION, NPC, PLAYER, 0.1)
    setTrust(SESSION, NPC, PLAYER, 0.8)
    assert.equal(getTrust(SESSION, NPC, PLAYER), 0.8)
  })

  it('setTrust clamps to [0, 1]', () => {
    getMemory(SESSION, NPC)
    setTrust(SESSION, NPC, PLAYER, 1.5)
    assert.equal(getTrust(SESSION, NPC, PLAYER), 1)
    setTrust(SESSION, NPC, PLAYER, -0.3)
    assert.equal(getTrust(SESSION, NPC, PLAYER), 0)
  })

  it('updates lastUpdatedAt on trust change', () => {
    const mem = getMemory(SESSION, NPC)
    const before = mem.lastUpdatedAt
    // Small delay to ensure timestamp changes
    adjustTrust(SESSION, NPC, PLAYER, 0.1)
    assert.ok(mem.lastUpdatedAt >= before)
  })
})

// ═══════════════════════════════════════════════════════════════════════════════
//  3. Emotional arc tracking
// ═══════════════════════════════════════════════════════════════════════════════

describe('EncounterMemoryService — Emotional arc', () => {
  beforeEach(() => clearAllMemory())

  it('records emotions in sequence', () => {
    getMemory(SESSION, NPC)
    recordEmotion(SESSION, NPC, 'neutral')
    recordEmotion(SESSION, NPC, 'afraid')
    recordEmotion(SESSION, NPC, 'angry')
    const mem = getMemory(SESSION, NPC)
    assert.deepEqual(mem.emotionalArc, ['neutral', 'afraid', 'angry'])
  })

  it('updates currentMood to latest emotion', () => {
    getMemory(SESSION, NPC)
    recordEmotion(SESSION, NPC, 'calm')
    assert.equal(getMemory(SESSION, NPC).currentMood, 'calm')
    recordEmotion(SESSION, NPC, 'enraged')
    assert.equal(getMemory(SESSION, NPC).currentMood, 'enraged')
  })

  it('getRecentEmotions returns last N emotions', () => {
    getMemory(SESSION, NPC)
    recordEmotion(SESSION, NPC, 'a')
    recordEmotion(SESSION, NPC, 'b')
    recordEmotion(SESSION, NPC, 'c')
    recordEmotion(SESSION, NPC, 'd')
    recordEmotion(SESSION, NPC, 'e')
    assert.deepEqual(getRecentEmotions(SESSION, NPC, 3), ['c', 'd', 'e'])
    assert.deepEqual(getRecentEmotions(SESSION, NPC, 2), ['d', 'e'])
  })

  it('getRecentEmotions returns all if fewer than N recorded', () => {
    getMemory(SESSION, NPC)
    recordEmotion(SESSION, NPC, 'calm')
    assert.deepEqual(getRecentEmotions(SESSION, NPC, 5), ['calm'])
  })

  it('getRecentEmotions defaults to 3', () => {
    getMemory(SESSION, NPC)
    recordEmotion(SESSION, NPC, 'a')
    recordEmotion(SESSION, NPC, 'b')
    recordEmotion(SESSION, NPC, 'c')
    recordEmotion(SESSION, NPC, 'd')
    assert.deepEqual(getRecentEmotions(SESSION, NPC), ['b', 'c', 'd'])
  })
})

// ═══════════════════════════════════════════════════════════════════════════════
//  4. Significant moments
// ═══════════════════════════════════════════════════════════════════════════════

describe('EncounterMemoryService — Significant moments', () => {
  beforeEach(() => clearAllMemory())

  it('records a significant moment', () => {
    getMemory(SESSION, NPC)
    recordSignificantMoment(SESSION, NPC, 'Party saved me from the dragon')
    const mem = getMemory(SESSION, NPC)
    assert.deepEqual(mem.significantMoments, ['Party saved me from the dragon'])
  })

  it('records multiple significant moments in order', () => {
    getMemory(SESSION, NPC)
    recordSignificantMoment(SESSION, NPC, 'First')
    recordSignificantMoment(SESSION, NPC, 'Second')
    recordSignificantMoment(SESSION, NPC, 'Third')
    assert.deepEqual(getMemory(SESSION, NPC).significantMoments, ['First', 'Second', 'Third'])
  })

  it('allows duplicate moments (same event can happen twice)', () => {
    getMemory(SESSION, NPC)
    recordSignificantMoment(SESSION, NPC, 'Hit by fireball')
    recordSignificantMoment(SESSION, NPC, 'Hit by fireball')
    assert.equal(getMemory(SESSION, NPC).significantMoments.length, 2)
  })
})

// ═══════════════════════════════════════════════════════════════════════════════
//  5. Secrets tracking
// ═══════════════════════════════════════════════════════════════════════════════

describe('EncounterMemoryService — Secrets', () => {
  beforeEach(() => clearAllMemory())

  it('hintSecret adds to secretsHinted', () => {
    getMemory(SESSION, NPC)
    hintSecret(SESSION, NPC, 'hidden_tunnel')
    assert.ok(isSecretHinted(SESSION, NPC, 'hidden_tunnel'))
  })

  it('hintSecret deduplicates', () => {
    getMemory(SESSION, NPC)
    hintSecret(SESSION, NPC, 'hidden_tunnel')
    hintSecret(SESSION, NPC, 'hidden_tunnel')
    assert.equal(getMemory(SESSION, NPC).secretsHinted.length, 1)
  })

  it('revealSecret adds to secretsRevealed', () => {
    getMemory(SESSION, NPC)
    revealSecret(SESSION, NPC, 'hidden_tunnel')
    assert.ok(isSecretRevealed(SESSION, NPC, 'hidden_tunnel'))
  })

  it('revealSecret removes from secretsHinted', () => {
    getMemory(SESSION, NPC)
    hintSecret(SESSION, NPC, 'hidden_tunnel')
    assert.ok(isSecretHinted(SESSION, NPC, 'hidden_tunnel'))
    revealSecret(SESSION, NPC, 'hidden_tunnel')
    assert.ok(!isSecretHinted(SESSION, NPC, 'hidden_tunnel'))
    assert.ok(isSecretRevealed(SESSION, NPC, 'hidden_tunnel'))
  })

  it('revealSecret deduplicates', () => {
    getMemory(SESSION, NPC)
    revealSecret(SESSION, NPC, 'treasure')
    revealSecret(SESSION, NPC, 'treasure')
    assert.equal(getMemory(SESSION, NPC).secretsRevealed.length, 1)
  })

  it('isSecretRevealed returns false for unknown secrets', () => {
    getMemory(SESSION, NPC)
    assert.ok(!isSecretRevealed(SESSION, NPC, 'nonexistent'))
  })

  it('isSecretHinted returns false for unknown secrets', () => {
    getMemory(SESSION, NPC)
    assert.ok(!isSecretHinted(SESSION, NPC, 'nonexistent'))
  })

  it('can track multiple secrets independently', () => {
    getMemory(SESSION, NPC)
    hintSecret(SESSION, NPC, 'A')
    hintSecret(SESSION, NPC, 'B')
    revealSecret(SESSION, NPC, 'C')
    assert.ok(isSecretHinted(SESSION, NPC, 'A'))
    assert.ok(isSecretHinted(SESSION, NPC, 'B'))
    assert.ok(isSecretRevealed(SESSION, NPC, 'C'))
    assert.ok(!isSecretRevealed(SESSION, NPC, 'A'))
  })
})

// ═══════════════════════════════════════════════════════════════════════════════
//  6. Entity interaction tracking
// ═══════════════════════════════════════════════════════════════════════════════

describe('EncounterMemoryService — Entity interactions', () => {
  beforeEach(() => clearAllMemory())

  it('records an entity interaction', () => {
    getMemory(SESSION, NPC)
    recordEntityInteraction(SESSION, NPC, PLAYER)
    assert.deepEqual(getMemory(SESSION, NPC).entitiesInteractedWith, [PLAYER])
  })

  it('deduplicates entity interactions', () => {
    getMemory(SESSION, NPC)
    recordEntityInteraction(SESSION, NPC, PLAYER)
    recordEntityInteraction(SESSION, NPC, PLAYER)
    assert.equal(getMemory(SESSION, NPC).entitiesInteractedWith.length, 1)
  })

  it('tracks multiple entities', () => {
    getMemory(SESSION, NPC)
    recordEntityInteraction(SESSION, NPC, PLAYER)
    recordEntityInteraction(SESSION, NPC, PLAYER2)
    assert.deepEqual(getMemory(SESSION, NPC).entitiesInteractedWith, [PLAYER, PLAYER2])
  })

  it('recordInteraction increments interactionCount', () => {
    getMemory(SESSION, NPC)
    recordInteraction(SESSION, NPC)
    recordInteraction(SESSION, NPC)
    recordInteraction(SESSION, NPC)
    assert.equal(getMemory(SESSION, NPC).interactionCount, 3)
  })
})

// ═══════════════════════════════════════════════════════════════════════════════
//  7. Disposition shift
// ═══════════════════════════════════════════════════════════════════════════════

describe('EncounterMemoryService — Disposition shift', () => {
  beforeEach(() => clearAllMemory())

  it('starts at zero', () => {
    assert.equal(getMemory(SESSION, NPC).dispositionShift, 0)
  })

  it('adjustDisposition shifts positive', () => {
    getMemory(SESSION, NPC)
    const result = adjustDisposition(SESSION, NPC, 0.3)
    assert.ok(Math.abs(result - 0.3) < 0.001)
  })

  it('adjustDisposition shifts negative', () => {
    getMemory(SESSION, NPC)
    const result = adjustDisposition(SESSION, NPC, -0.4)
    assert.ok(Math.abs(result - (-0.4)) < 0.001)
  })

  it('adjustDisposition is cumulative', () => {
    getMemory(SESSION, NPC)
    adjustDisposition(SESSION, NPC, 0.2)
    adjustDisposition(SESSION, NPC, 0.3)
    assert.ok(Math.abs(getMemory(SESSION, NPC).dispositionShift - 0.5) < 0.001)
  })

  it('adjustDisposition clamps at +1', () => {
    getMemory(SESSION, NPC)
    adjustDisposition(SESSION, NPC, 0.8)
    const result = adjustDisposition(SESSION, NPC, 0.5)
    assert.equal(result, 1)
  })

  it('adjustDisposition clamps at -1', () => {
    getMemory(SESSION, NPC)
    adjustDisposition(SESSION, NPC, -0.7)
    const result = adjustDisposition(SESSION, NPC, -0.5)
    assert.equal(result, -1)
  })
})

// ═══════════════════════════════════════════════════════════════════════════════
//  8. Trigger-based trust inference
// ═══════════════════════════════════════════════════════════════════════════════

describe('EncounterMemoryService — inferTrustChange', () => {
  beforeEach(() => clearAllMemory())

  it('PLAYER_ADDRESSED gives mild trust increase', () => {
    const result = inferTrustChange(TRIGGER_EVENT.PLAYER_ADDRESSED, PLAYER)
    assert.ok(result.trustDelta > 0)
    assert.ok(result.dispositionDelta > 0)
    assert.equal(result.significantMoment, null)
  })

  it('ATTACKED gives major trust decrease', () => {
    const result = inferTrustChange(TRIGGER_EVENT.ATTACKED, PLAYER)
    assert.ok(result.trustDelta < -0.2)
    assert.ok(result.dispositionDelta < -0.2)
    assert.ok(result.significantMoment !== null)
    assert.ok(result.significantMoment.includes(PLAYER))
  })

  it('ALLY_DIED gives trust and disposition decrease', () => {
    const result = inferTrustChange(TRIGGER_EVENT.ALLY_DIED, PLAYER)
    assert.ok(result.trustDelta < 0)
    assert.ok(result.dispositionDelta < 0)
    assert.ok(result.significantMoment !== null)
  })

  it('ENEMY_DIED gives trust increase', () => {
    const result = inferTrustChange(TRIGGER_EVENT.ENEMY_DIED, PLAYER)
    assert.ok(result.trustDelta > 0)
    assert.ok(result.dispositionDelta > 0)
  })

  it('NEAR_DEATH is a significant traumatic moment', () => {
    const result = inferTrustChange(TRIGGER_EVENT.NEAR_DEATH, PLAYER)
    assert.ok(result.significantMoment !== null)
    assert.ok(result.dispositionDelta < 0)
  })

  it('COMBAT_END gives trust boost (surviving together)', () => {
    const result = inferTrustChange(TRIGGER_EVENT.COMBAT_END, PLAYER)
    assert.ok(result.trustDelta > 0)
  })

  it('COMBAT_START is neutral', () => {
    const result = inferTrustChange(TRIGGER_EVENT.COMBAT_START, PLAYER)
    assert.equal(result.trustDelta, 0)
    assert.equal(result.dispositionDelta, 0)
  })

  it('DISCOVERY gives trust boost', () => {
    const result = inferTrustChange(TRIGGER_EVENT.DISCOVERY, PLAYER)
    assert.ok(result.trustDelta > 0)
    assert.ok(result.dispositionDelta > 0)
  })

  it('unknown trigger returns zeros', () => {
    const result = inferTrustChange('UNKNOWN_EVENT', PLAYER)
    assert.equal(result.trustDelta, 0)
    assert.equal(result.dispositionDelta, 0)
    assert.equal(result.significantMoment, null)
  })
})

// ═══════════════════════════════════════════════════════════════════════════════
//  9. applyTriggerEffects
// ═══════════════════════════════════════════════════════════════════════════════

describe('EncounterMemoryService — applyTriggerEffects', () => {
  beforeEach(() => clearAllMemory())

  it('applies trust change from trigger', () => {
    getMemory(SESSION, NPC, { defaultTrust: 0.3 })
    applyTriggerEffects(SESSION, NPC, TRIGGER_EVENT.PLAYER_ADDRESSED, PLAYER)
    assert.ok(getTrust(SESSION, NPC, PLAYER) > 0.3)
  })

  it('applies disposition change from trigger', () => {
    getMemory(SESSION, NPC)
    applyTriggerEffects(SESSION, NPC, TRIGGER_EVENT.ATTACKED, PLAYER)
    assert.ok(getMemory(SESSION, NPC).dispositionShift < 0)
  })

  it('records significant moment when trigger generates one', () => {
    getMemory(SESSION, NPC)
    applyTriggerEffects(SESSION, NPC, TRIGGER_EVENT.ALLY_DIED, PLAYER)
    assert.ok(getMemory(SESSION, NPC).significantMoments.length > 0)
  })

  it('does not record moment when trigger returns null', () => {
    getMemory(SESSION, NPC)
    applyTriggerEffects(SESSION, NPC, TRIGGER_EVENT.COMBAT_START, PLAYER)
    assert.equal(getMemory(SESSION, NPC).significantMoments.length, 0)
  })

  it('returns the effects that were applied', () => {
    getMemory(SESSION, NPC)
    const effects = applyTriggerEffects(SESSION, NPC, TRIGGER_EVENT.ATTACKED, PLAYER)
    assert.ok('trustDelta' in effects)
    assert.ok('dispositionDelta' in effects)
    assert.ok('significantMoment' in effects)
  })

  it('handles null entityId gracefully (no trust change attempted)', () => {
    getMemory(SESSION, NPC)
    // Should not throw
    const effects = applyTriggerEffects(SESSION, NPC, TRIGGER_EVENT.NEAR_DEATH, null)
    assert.ok(effects.dispositionDelta < 0)
    assert.ok(getMemory(SESSION, NPC).dispositionShift < 0)
  })

  it('stacks multiple trigger effects', () => {
    getMemory(SESSION, NPC, { defaultTrust: 0.5 })
    applyTriggerEffects(SESSION, NPC, TRIGGER_EVENT.PLAYER_ADDRESSED, PLAYER)
    applyTriggerEffects(SESSION, NPC, TRIGGER_EVENT.ENEMY_DIED, PLAYER)
    applyTriggerEffects(SESSION, NPC, TRIGGER_EVENT.COMBAT_END, PLAYER)
    // Trust should have increased from three positive triggers
    assert.ok(getTrust(SESSION, NPC, PLAYER) > 0.5)
  })
})

// ═══════════════════════════════════════════════════════════════════════════════
//  10. buildMemorySummary
// ═══════════════════════════════════════════════════════════════════════════════

describe('EncounterMemoryService — buildMemorySummary', () => {
  beforeEach(() => clearAllMemory())

  it('returns null when no memory exists', () => {
    assert.equal(buildMemorySummary(SESSION, NPC), null)
  })

  it('returns null when memory exists but no interactions', () => {
    getMemory(SESSION, NPC) // created but interactionCount = 0
    assert.equal(buildMemorySummary(SESSION, NPC), null)
  })

  it('includes emotional arc when multiple emotions recorded', () => {
    getMemory(SESSION, NPC)
    recordInteraction(SESSION, NPC)
    recordEmotion(SESSION, NPC, 'calm')
    recordEmotion(SESSION, NPC, 'afraid')
    const summary = buildMemorySummary(SESSION, NPC)
    assert.ok(summary !== null)
    assert.ok(summary.includes('calm'))
    assert.ok(summary.includes('afraid'))
    assert.ok(summary.includes('→'))
  })

  it('includes trust levels toward specific entities', () => {
    getMemory(SESSION, NPC, { defaultTrust: 0.3 })
    recordInteraction(SESSION, NPC)
    setTrust(SESSION, NPC, 'Aldric', 0.8)
    const summary = buildMemorySummary(SESSION, NPC)
    assert.ok(summary !== null)
    assert.ok(summary.includes('Aldric'))
    assert.ok(summary.includes('trust'))
  })

  it('describes high trust as "trust significantly"', () => {
    getMemory(SESSION, NPC)
    recordInteraction(SESSION, NPC)
    setTrust(SESSION, NPC, 'Ally', 0.75)
    const summary = buildMemorySummary(SESSION, NPC)
    assert.ok(summary.includes('trust significantly'))
  })

  it('describes low trust as "distrust"', () => {
    getMemory(SESSION, NPC)
    recordInteraction(SESSION, NPC)
    setTrust(SESSION, NPC, 'Enemy', 0.1)
    const summary = buildMemorySummary(SESSION, NPC)
    assert.ok(summary.includes('deeply distrust'))
  })

  it('includes significant moments', () => {
    getMemory(SESSION, NPC)
    recordInteraction(SESSION, NPC)
    recordSignificantMoment(SESSION, NPC, 'The wizard betrayed us')
    const summary = buildMemorySummary(SESSION, NPC)
    assert.ok(summary.includes('The wizard betrayed us'))
  })

  it('includes hinted secrets', () => {
    getMemory(SESSION, NPC)
    recordInteraction(SESSION, NPC)
    hintSecret(SESSION, NPC, 'the mayors corruption')
    const summary = buildMemorySummary(SESSION, NPC)
    assert.ok(summary.includes('hinted'))
    assert.ok(summary.includes('the mayors corruption'))
  })

  it('includes revealed secrets with do-not-repeat instruction', () => {
    getMemory(SESSION, NPC)
    recordInteraction(SESSION, NPC)
    revealSecret(SESSION, NPC, 'location of the vault')
    const summary = buildMemorySummary(SESSION, NPC)
    assert.ok(summary.includes('location of the vault'))
    assert.ok(summary.includes('do not repeat'))
  })

  it('includes disposition context when shifted', () => {
    getMemory(SESSION, NPC)
    recordInteraction(SESSION, NPC)
    recordEmotion(SESSION, NPC, 'wary')
    adjustDisposition(SESSION, NPC, -0.3)
    const summary = buildMemorySummary(SESSION, NPC)
    assert.ok(summary.includes('cooling toward'))
  })

  it('indicates warming when disposition is positive', () => {
    getMemory(SESSION, NPC)
    recordInteraction(SESSION, NPC)
    recordEmotion(SESSION, NPC, 'friendly')
    adjustDisposition(SESSION, NPC, 0.3)
    const summary = buildMemorySummary(SESSION, NPC)
    assert.ok(summary.includes('warming to'))
  })

  it('mentions interaction count for extended encounters', () => {
    getMemory(SESSION, NPC)
    for (let i = 0; i < 4; i++) recordInteraction(SESSION, NPC)
    const summary = buildMemorySummary(SESSION, NPC)
    assert.ok(summary !== null)
    // interactionCount is 4, so it should mention this is the 5th exchange
    assert.ok(summary.includes('5th exchange') || summary.includes('history'))
  })

  it('returns a string (not undefined or empty) for a rich memory', () => {
    getMemory(SESSION, NPC, { defaultTrust: 0.3 })
    recordInteraction(SESSION, NPC)
    recordInteraction(SESSION, NPC)
    recordInteraction(SESSION, NPC)
    recordEmotion(SESSION, NPC, 'calm')
    recordEmotion(SESSION, NPC, 'tense')
    recordEmotion(SESSION, NPC, 'resolute')
    recordSignificantMoment(SESSION, NPC, 'Fought off the bandits together')
    setTrust(SESSION, NPC, PLAYER, 0.6)
    hintSecret(SESSION, NPC, 'smuggling route')
    adjustDisposition(SESSION, NPC, 0.15)
    const summary = buildMemorySummary(SESSION, NPC)
    assert.equal(typeof summary, 'string')
    assert.ok(summary.length > 50, `Summary should be substantial, got: ${summary}`)
  })
})

// ═══════════════════════════════════════════════════════════════════════════════
//  11. Session cleanup
// ═══════════════════════════════════════════════════════════════════════════════

describe('EncounterMemoryService — Session cleanup', () => {
  beforeEach(() => clearAllMemory())

  it('clearSessionMemory removes all NPCs in a session', () => {
    getMemory(SESSION, NPC)
    getMemory(SESSION, NPC2)
    getMemory(SESSION2, NPC)
    clearSessionMemory(SESSION)
    assert.equal(hasMemory(SESSION, NPC), false)
    assert.equal(hasMemory(SESSION, NPC2), false)
    assert.equal(hasMemory(SESSION2, NPC), true)
  })

  it('clearAllMemory empties the entire store', () => {
    getMemory(SESSION, NPC)
    getMemory(SESSION2, NPC2)
    clearAllMemory()
    assert.deepEqual(getAllMemoryKeys(), [])
  })

  it('getAllMemoryKeys lists all stored memories', () => {
    getMemory(SESSION, NPC)
    getMemory(SESSION2, NPC2)
    const keys = getAllMemoryKeys()
    assert.equal(keys.length, 2)
    assert.ok(keys.includes(`${SESSION}:${NPC}`))
    assert.ok(keys.includes(`${SESSION2}:${NPC2}`))
  })
})

// ═══════════════════════════════════════════════════════════════════════════════
//  12. Edge cases and boundary conditions
// ═══════════════════════════════════════════════════════════════════════════════

describe('EncounterMemoryService — Edge cases', () => {
  beforeEach(() => clearAllMemory())

  it('handles undefined sessionId gracefully (uses "global")', () => {
    const mem = getMemory(undefined, NPC)
    assert.equal(mem.sessionId, undefined)
    // Should still be retrievable
    assert.ok(hasMemory(undefined, NPC))
  })

  it('zero trust delta in adjustTrust is a no-op on value', () => {
    getMemory(SESSION, NPC, { defaultTrust: 0.5 })
    adjustTrust(SESSION, NPC, PLAYER, 0)
    assert.equal(getTrust(SESSION, NPC, PLAYER), 0.5)
  })

  it('empty string NPC ID is valid (weird but not broken)', () => {
    const mem = getMemory(SESSION, '')
    assert.equal(mem.npcId, '')
  })

  it('memory survives rapid successive operations', () => {
    getMemory(SESSION, NPC, { defaultTrust: 0.5 })
    for (let i = 0; i < 100; i++) {
      recordInteraction(SESSION, NPC)
      recordEmotion(SESSION, NPC, `emotion_${i}`)
      adjustTrust(SESSION, NPC, PLAYER, 0.001)
    }
    const mem = getMemory(SESSION, NPC)
    assert.equal(mem.interactionCount, 100)
    assert.equal(mem.emotionalArc.length, 100)
    assert.ok(getTrust(SESSION, NPC, PLAYER) > 0.5)
    assert.ok(getTrust(SESSION, NPC, PLAYER) <= 1.0)
  })

  it('buildMemorySummary only shows last 4 emotions', () => {
    getMemory(SESSION, NPC)
    recordInteraction(SESSION, NPC)
    for (let i = 0; i < 10; i++) {
      recordEmotion(SESSION, NPC, `e${i}`)
    }
    const summary = buildMemorySummary(SESSION, NPC)
    // Should contain e6 → e7 → e8 → e9 (last 4)
    assert.ok(summary.includes('e6'))
    assert.ok(summary.includes('e9'))
    // Should NOT contain e0
    assert.ok(!summary.includes('e0 →'))
  })

  it('buildMemorySummary only shows last 3 significant moments', () => {
    getMemory(SESSION, NPC)
    recordInteraction(SESSION, NPC)
    for (let i = 0; i < 6; i++) {
      recordSignificantMoment(SESSION, NPC, `moment_${i}`)
    }
    const summary = buildMemorySummary(SESSION, NPC)
    assert.ok(summary.includes('moment_3'))
    assert.ok(summary.includes('moment_5'))
    assert.ok(!summary.includes('moment_0'))
  })

  it('re-creating memory after clearAllMemory works cleanly', () => {
    getMemory(SESSION, NPC, { defaultTrust: 0.1 })
    adjustTrust(SESSION, NPC, PLAYER, 0.5)
    clearAllMemory()
    getMemory(SESSION, NPC, { defaultTrust: 0.9 })
    assert.equal(getTrust(SESSION, NPC, PLAYER), 0.9) // Should use new default, not old state
  })
})
