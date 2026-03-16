/**
 * CombatSessionManager — unit tests
 *
 * Tests the session lifecycle: create, get, menu, submitChoice, endTurn,
 * rollFree, destroySession. Verifies zero-trust contract: server-authoritative
 * dice, proper validation, and correct roll extraction for client animation.
 */

'use strict'

const { describe, it, before, after, beforeEach, afterEach } = require('node:test')
const assert = require('node:assert/strict')

const manager = require('../CombatSessionManager')

// ── Helpers ──────────────────────────────────────────────────────────────────

/**
 * Standard two-combatant encounter config using known template keys.
 */
function makeConfig() {
  return {
    combatants: [
      { templateKey: 'gem_dragonborn_lore_bard_8', id: 'bard-1', side: 'party' },
      { templateKey: 'zombie', id: 'zombie-1', side: 'enemy' },
    ],
  }
}

/**
 * Create a session and return the result for further assertions.
 */
function createTestSession() {
  return manager.createSession(makeConfig())
}

// Cleanup after each test to avoid cross-test pollution
afterEach(() => {
  manager._sessions.clear()
})

after(() => {
  manager._stopCleanup()
})

// ─────────────────────────────────────────────────────────────────────────────
// SESSION CREATION
// ─────────────────────────────────────────────────────────────────────────────

describe('CombatSessionManager — createSession', () => {
  it('creates a session with valid UUIDv4 sessionId', () => {
    const result = createTestSession()
    assert.ok(result.sessionId, 'sessionId should be truthy')
    assert.match(result.sessionId, /^[0-9a-f-]{36}$/, 'sessionId should look like a UUID')
  })

  it('returns serialized state with combatants', () => {
    const result = createTestSession()
    assert.ok(result.state, 'state should exist')
    assert.ok(Array.isArray(result.state.combatants), 'state.combatants should be an array')
    assert.equal(result.state.combatants.length, 2)
  })

  it('returns initiative order with all combatants', () => {
    const result = createTestSession()
    assert.ok(Array.isArray(result.state.initiativeOrder), 'initiativeOrder should be an array')
    assert.equal(result.state.initiativeOrder.length, 2)
    assert.ok(result.state.initiativeOrder.includes('bard-1'))
    assert.ok(result.state.initiativeOrder.includes('zombie-1'))
  })

  it('returns initiative roll details', () => {
    const result = createTestSession()
    assert.ok(Array.isArray(result.initiatives), 'initiatives should be an array')
    assert.equal(result.initiatives.length, 2)
    for (const init of result.initiatives) {
      assert.ok(init.id, 'each initiative should have an id')
      assert.ok(typeof init.total === 'number', 'total should be a number')
      assert.ok(typeof init.roll === 'number', 'roll should be a number')
      assert.ok(init.roll >= 1 && init.roll <= 20, 'roll should be 1-20')
    }
  })

  it('returns a menu for the first active combatant', () => {
    const result = createTestSession()
    assert.ok(result.menu, 'menu should exist')
    // Menu should have at least one action category
    const hasOptions = result.menu.actions?.length > 0
      || result.menu.bonusActions?.length > 0
      || result.menu.movement?.length > 0
    assert.ok(hasOptions, 'menu should have at least one action category')
  })

  it('round starts at 1', () => {
    const result = createTestSession()
    assert.equal(result.state.round, 1)
  })

  it('stores session in memory', () => {
    const result = createTestSession()
    assert.ok(manager._sessions.has(result.sessionId), 'session should be in internal store')
  })

  it('throws on missing combatants', () => {
    assert.throws(() => manager.createSession({}), /combatants/)
  })

  it('throws on insufficient combatants', () => {
    assert.throws(
      () => manager.createSession({ combatants: [{ templateKey: 'zombie', id: 'z1', side: 'enemy' }] }),
      /At least 2/,
    )
  })
})

// ─────────────────────────────────────────────────────────────────────────────
// GET SESSION
// ─────────────────────────────────────────────────────────────────────────────

describe('CombatSessionManager — getSession', () => {
  it('returns current state for a valid session', () => {
    const { sessionId } = createTestSession()
    const info = manager.getSession(sessionId)
    assert.ok(info.state, 'state should exist')
    assert.ok(info.activeId, 'activeId should exist')
    assert.equal(info.round, 1)
    assert.equal(info.status, 'active')
  })

  it('throws on unknown sessionId', () => {
    assert.throws(() => manager.getSession('not-a-real-id'), /not found/)
  })
})

// ─────────────────────────────────────────────────────────────────────────────
// GET MENU
// ─────────────────────────────────────────────────────────────────────────────

describe('CombatSessionManager — getMenu', () => {
  it('returns menu, activeId, and activeName', () => {
    const { sessionId } = createTestSession()
    const result = manager.getMenu(sessionId)
    assert.ok(result.menu, 'menu should exist')
    assert.ok(result.activeId, 'activeId should exist')
    assert.ok(typeof result.activeName === 'string', 'activeName should be a string')
    assert.ok(result.activeName.length > 0, 'activeName should not be empty')
  })
})

// ─────────────────────────────────────────────────────────────────────────────
// SUBMIT CHOICE
// ─────────────────────────────────────────────────────────────────────────────

describe('CombatSessionManager — submitChoice', () => {
  it('resolves a valid dodge action', () => {
    const { sessionId, menu } = createTestSession()

    // Find the dodge option if it exists in the menu
    const allOptions = [
      ...(menu.actions || []),
      ...(menu.bonusActions || []),
      ...(menu.movement || []),
      ...(menu.reactions || []),
      ...(menu.freeActions || []),
    ]
    const dodge = allOptions.find(o => o.optionId === 'dodge')
    if (!dodge) {
      // Dodge might not be available for zombies — skip this test silently
      return
    }

    const result = manager.submitChoice(sessionId, { optionId: 'dodge' })
    assert.ok(result.result, 'should have a result')
    assert.ok(result.newState, 'should have newState')
    assert.ok(Array.isArray(result.rolls), 'rolls should be an array')
    assert.ok(Array.isArray(result.logs), 'logs should be an array')
  })

  it('returns rolls for attack actions (server-authoritative)', () => {
    const { sessionId, menu } = createTestSession()

    // Try to find an attack option
    const allOptions = [
      ...(menu.actions || []),
      ...(menu.bonusActions || []),
      ...(menu.movement || []),
    ]
    const attack = allOptions.find(o => o.optionId?.startsWith('attack:'))
    if (!attack) return // No attack in menu, skip

    // We need a target — find the enemy id
    const result = manager.submitChoice(sessionId, {
      optionId: attack.optionId,
      targetId: 'zombie-1',
    })

    assert.ok(result.result, 'should have a result')
    assert.ok(Array.isArray(result.rolls), 'rolls should be an array')
    // Attack rolls should produce at least an attack roll
    if (result.rolls.length > 0) {
      const atkRoll = result.rolls.find(r => r.purpose === 'attack')
      if (atkRoll) {
        assert.ok(Array.isArray(atkRoll.values), 'attack roll should have values array')
        assert.ok(atkRoll.values.length > 0, 'attack roll values should not be empty')
        assert.ok(atkRoll.values[0] >= 1 && atkRoll.values[0] <= 20, 'attack roll should be d20 range')
        assert.ok(typeof atkRoll.total === 'number', 'attack roll should have numeric total')
        assert.ok(typeof atkRoll.hit === 'boolean', 'attack roll should have boolean hit')
      }
    }
  })

  it('throws on invalid session', () => {
    assert.throws(
      () => manager.submitChoice('fake', { optionId: 'dodge' }),
      /not found/,
    )
  })

  it('updates session action history', () => {
    const { sessionId, menu } = createTestSession()
    const allOptions = [
      ...(menu.actions || []),
      ...(menu.bonusActions || []),
      ...(menu.movement || []),
      ...(menu.freeActions || []),
    ]
    if (allOptions.length === 0) return

    manager.submitChoice(sessionId, { optionId: allOptions[0].optionId })
    const session = manager._sessions.get(sessionId)
    assert.equal(session.actionHistory.length, 1, 'action history should have 1 entry')
    assert.ok(session.actionHistory[0].timestamp, 'history entry should have timestamp')
  })

  it('returns nextMenu after action (combatant may still act)', () => {
    const { sessionId, menu } = createTestSession()

    // Use a free action or movement if available, so the combatant still has actions
    const allOptions = [
      ...(menu.freeActions || []),
      ...(menu.movement || []),
    ]
    if (allOptions.length === 0) return

    const result = manager.submitChoice(sessionId, { optionId: allOptions[0].optionId })
    // nextMenu might be null if the session completed
    // but it should be an object if combat is still active
    if (result.victory === null) {
      assert.ok(result.nextMenu, 'nextMenu should exist for active combat')
    }
  })
})

// ─────────────────────────────────────────────────────────────────────────────
// END TURN
// ─────────────────────────────────────────────────────────────────────────────

describe('CombatSessionManager — endTurn', () => {
  it('advances to the next combatant', () => {
    const { sessionId, state } = createTestSession()
    const firstActiveId = state.initiativeOrder[state.turnIndex]

    const result = manager.endTurn(sessionId)
    assert.ok(result.activeName, 'activeName should exist')
    assert.ok(result.newState, 'newState should exist')
    // Active ID should be different (since there are 2 combatants)
    assert.notEqual(result.activeId, firstActiveId, 'should advance to next combatant')
  })

  it('resets movement for the new active combatant', () => {
    const { sessionId } = createTestSession()
    const result = manager.endTurn(sessionId)

    // Find the new active combatant in the state
    const active = result.newState.combatants.find(c => c.id === result.activeId)
    assert.ok(active, 'active combatant should be in state')
    assert.ok(active.movementRemaining > 0, 'new combatant should have movement')
  })

  it('provides a new menu for the next combatant', () => {
    const { sessionId } = createTestSession()
    const result = manager.endTurn(sessionId)

    if (result.victory === null) {
      assert.ok(result.nextMenu, 'should provide menu for next combatant')
    }
  })

  it('throws on unknown session', () => {
    assert.throws(() => manager.endTurn('nope'), /not found/)
  })
})

// ─────────────────────────────────────────────────────────────────────────────
// FREE DICE ROLL
// ─────────────────────────────────────────────────────────────────────────────

describe('CombatSessionManager — rollFree', () => {
  it('rolls d20 and returns values', () => {
    const { sessionId } = createTestSession()
    const result = manager.rollFree(sessionId, '1d20')

    assert.equal(result.notation, '1d20')
    assert.ok(Array.isArray(result.values), 'values should be an array')
    assert.equal(result.values.length, 1)
    assert.ok(result.values[0] >= 1 && result.values[0] <= 20)
    assert.equal(result.modifier, 0)
    assert.equal(result.total, result.values[0])
  })

  it('rolls multiple dice with modifier', () => {
    const { sessionId } = createTestSession()
    const result = manager.rollFree(sessionId, '3d6+5')

    assert.equal(result.notation, '3d6+5')
    assert.equal(result.values.length, 3)
    assert.equal(result.modifier, 5)
    const sum = result.values.reduce((s, v) => s + v, 0) + 5
    assert.equal(result.total, sum, 'total should be sum of values + modifier')
    for (const v of result.values) {
      assert.ok(v >= 1 && v <= 6, 'each d6 should be 1-6')
    }
  })

  it('handles negative modifier', () => {
    const { sessionId } = createTestSession()
    const result = manager.rollFree(sessionId, '1d8-2')

    assert.equal(result.modifier, -2)
    assert.equal(result.total, result.values[0] - 2)
  })

  it('throws on invalid notation', () => {
    const { sessionId } = createTestSession()
    assert.throws(() => manager.rollFree(sessionId, 'not-dice'), /Invalid/)
  })

  it('throws on unknown session', () => {
    assert.throws(() => manager.rollFree('fake', '1d20'), /not found/)
  })

  it('caps dice count at 20', () => {
    const { sessionId } = createTestSession()
    const result = manager.rollFree(sessionId, '100d6')
    assert.equal(result.values.length, 20, 'should cap at 20 dice')
  })
})

// ─────────────────────────────────────────────────────────────────────────────
// DESTROY SESSION
// ─────────────────────────────────────────────────────────────────────────────

describe('CombatSessionManager — destroySession', () => {
  it('removes session from store', () => {
    const { sessionId } = createTestSession()
    assert.ok(manager._sessions.has(sessionId))
    manager.destroySession(sessionId)
    assert.ok(!manager._sessions.has(sessionId))
  })

  it('makes session unretrievable after destruction', () => {
    const { sessionId } = createTestSession()
    manager.destroySession(sessionId)
    assert.throws(() => manager.getSession(sessionId), /not found/)
  })
})

// ─────────────────────────────────────────────────────────────────────────────
// EXTRACT ROLLS
// ─────────────────────────────────────────────────────────────────────────────

describe('CombatSessionManager — _extractRolls', () => {
  it('returns empty for null result', () => {
    assert.deepEqual(manager._extractRolls(null), [])
  })

  it('returns empty for unknown result type', () => {
    assert.deepEqual(manager._extractRolls({ type: 'unknown' }), [])
  })

  it('extracts attack roll and damage from attack result', () => {
    const rolls = manager._extractRolls({
      type: 'attack',
      natural: 15,
      roll: 20,
      hit: true,
      targetAC: 12,
      damage: 8,
    })
    assert.equal(rolls.length, 2, 'should have attack + damage')
    assert.equal(rolls[0].purpose, 'attack')
    assert.deepEqual(rolls[0].values, [15])
    assert.equal(rolls[0].total, 20)
    assert.equal(rolls[0].hit, true)
    assert.equal(rolls[1].purpose, 'damage')
    assert.equal(rolls[1].total, 8)
  })

  it('extracts only attack roll on miss (no damage)', () => {
    const rolls = manager._extractRolls({
      type: 'attack',
      natural: 5,
      roll: 10,
      hit: false,
      targetAC: 15,
      damage: 0,
    })
    assert.equal(rolls.length, 1, 'should only have attack roll on miss')
    assert.equal(rolls[0].purpose, 'attack')
    assert.equal(rolls[0].hit, false)
  })

  it('extracts saving throws from spell result', () => {
    const rolls = manager._extractRolls({
      type: 'spell',
      saves: [
        { roll: 12, total: 14, success: false, targetName: 'Zombie' },
        { roll: 18, total: 20, success: true, targetName: 'Goblin' },
      ],
      damage: 14,
    })
    const saves = rolls.filter(r => r.purpose === 'save')
    assert.equal(saves.length, 2)
    assert.equal(saves[0].success, false)
    assert.equal(saves[1].success, true)
    const dmg = rolls.find(r => r.purpose === 'damage')
    assert.ok(dmg, 'should have damage roll')
    assert.equal(dmg.total, 14)
  })

  it('extracts healing from spell result', () => {
    const rolls = manager._extractRolls({
      type: 'spell',
      healing: 12,
      damage: 0,
    })
    const heal = rolls.find(r => r.purpose === 'healing')
    assert.ok(heal, 'should have healing')
    assert.equal(heal.total, 12)
  })

  it('preserves individual damage die values for attack results', () => {
    const rolls = manager._extractRolls({
      type: 'attack',
      natural: 17,
      roll: 23,
      hit: true,
      targetAC: 14,
      damage: 11,
      damageDice: '2d6',
      damageRolls: [5, 4],
    })
    const dmg = rolls.find(r => r.purpose === 'damage')
    assert.ok(dmg, 'should include damage roll')
    assert.equal(dmg.notation, '2d6')
    assert.deepEqual(dmg.values, [5, 4])
    assert.equal(dmg.total, 11)
  })

  it('preserves spell damage/healing die values', () => {
    const rolls = manager._extractRolls({
      type: 'spell',
      damage: 13,
      damageDice: '3d4',
      damageRolls: [4, 4, 3],
      healing: 8,
      healingDice: '1d8',
      healingRolls: [6],
    })
    const dmg = rolls.find(r => r.purpose === 'damage')
    const heal = rolls.find(r => r.purpose === 'healing')
    assert.ok(dmg, 'should include spell damage roll')
    assert.equal(dmg.notation, '3d4')
    assert.deepEqual(dmg.values, [4, 4, 3])
    assert.ok(heal, 'should include spell healing roll')
    assert.equal(heal.notation, '1d8')
    assert.deepEqual(heal.values, [6])
  })
})

// ─────────────────────────────────────────────────────────────────────────────
// COMMIT-REVEAL ROLL HANDSHAKE
// ─────────────────────────────────────────────────────────────────────────────

describe('CombatSessionManager — requestRolls/confirmRolls', () => {
  function firstLegalChoice(menu) {
    const allOptions = [
      ...(menu.actions || []),
      ...(menu.bonusActions || []),
      ...(menu.movement || []),
      ...(menu.reactions || []),
      ...(menu.freeActions || []),
    ]
    const option = allOptions[0]
    if (!option) return null
    const choice = { optionId: option.optionId }
    if (option.targetId) choice.targetId = option.targetId
    if (option.requiresPosition && option.aoeCenter) choice.aoeCenter = option.aoeCenter
    return choice
  }

  it('creates a pending roll request with commitment', () => {
    const { sessionId, menu } = createTestSession()
    const choice = firstLegalChoice(menu)
    if (!choice) return

    const requested = manager.requestRolls(sessionId, choice)
    assert.equal(typeof requested.commitment, 'string')
    assert.equal(requested.commitment.length, 64)
    assert.ok(Array.isArray(requested.rollRequests))

    const session = manager._sessions.get(sessionId)
    assert.ok(session.pendingRollRequest, 'pending roll request should be stored')
    assert.equal(session.pendingRollRequest.commitment, requested.commitment)
  })

  it('confirmRolls throws when no request is pending', () => {
    const { sessionId } = createTestSession()
    assert.throws(
      () => manager.confirmRolls(sessionId, '1234567890'),
      /No pending roll request/,
    )
  })

  it('confirmRolls resolves action and returns fairness reveal', () => {
    const { sessionId, menu } = createTestSession()
    const choice = firstLegalChoice(menu)
    if (!choice) return

    const requested = manager.requestRolls(sessionId, choice)
    const result = manager.confirmRolls(sessionId, String(Date.now()))

    assert.ok(result.result, 'action should resolve')
    assert.ok(result.fairness, 'fairness block should be present')
    assert.equal(result.fairness.commitment, requested.commitment)
    assert.equal(typeof result.fairness.serverSecret, 'string')
    assert.equal(result.fairness.verified, true)

    const session = manager._sessions.get(sessionId)
    assert.equal(session.pendingRollRequest, null, 'pending request should be cleared')
  })
})

// ─────────────────────────────────────────────────────────────────────────────
// SERIALIZE STATE
// ─────────────────────────────────────────────────────────────────────────────

describe('CombatSessionManager — _serializeState', () => {
  it('produces JSON-safe output', () => {
    const { sessionId } = createTestSession()
    const session = manager._sessions.get(sessionId)
    const serialized = manager._serializeState(session.state)

    // Should be JSON-safe (no Maps, no circular refs)
    const json = JSON.stringify(serialized)
    assert.ok(json, 'should serialize to JSON')
    const parsed = JSON.parse(json)
    assert.ok(parsed.combatants, 'parsed should have combatants')
    assert.ok(parsed.initiativeOrder, 'parsed should have initiativeOrder')
    assert.ok(typeof parsed.round === 'number')
  })

  it('includes all required combatant fields', () => {
    const { sessionId } = createTestSession()
    const session = manager._sessions.get(sessionId)
    const serialized = manager._serializeState(session.state)

    for (const c of serialized.combatants) {
      assert.ok(c.id, 'combatant should have id')
      assert.ok(c.name, 'combatant should have name')
      assert.ok(c.side, 'combatant should have side')
      assert.ok(typeof c.currentHP === 'number', 'should have currentHP')
      assert.ok(typeof c.maxHP === 'number', 'should have maxHP')
      assert.ok(typeof c.ac === 'number', 'should have ac')
    }
  })
})

// ─────────────────────────────────────────────────────────────────────────────
// CHECK VICTORY
// ─────────────────────────────────────────────────────────────────────────────

describe('CombatSessionManager — _checkVictory', () => {
  it('reports no victory when both sides alive', () => {
    const { sessionId } = createTestSession()
    const session = manager._sessions.get(sessionId)
    const result = manager._checkVictory(session.state)
    assert.equal(result.over, false)
  })
})

// ─────────────────────────────────────────────────────────────────────────────
// START-OF-TURN UPKEEP (concentration timer, etc.)
// ─────────────────────────────────────────────────────────────────────────────

describe('CombatSessionManager — start-of-turn upkeep via endTurn', () => {
  it('decrements concentrationRoundsRemaining when turn cycles back', () => {
    // Create a config where bard always goes first (dexMod override)
    // AI config for zombie so executeAiTurns auto-runs zombie's turn
    const config = {
      combatants: [
        { templateKey: 'gem_dragonborn_lore_bard_8', id: 'bard-1', side: 'party',
          position: { q: 0, r: 0 }, speed: 30, overrides: { dexMod: 100 } },
        { templateKey: 'zombie', id: 'zombie-1', side: 'enemy',
          position: { q: 10, r: 0 }, speed: 30 },
      ],
      aiConfig: { profileMap: { 'zombie-1': 'undead_basic' } },
    }
    const { sessionId } = manager.createSession(config)
    const session = manager._sessions.get(sessionId)

    // Verify bard goes first
    const firstActiveId = session.state.getActiveCombatantId()
    assert.equal(firstActiveId, 'bard-1', 'bard should go first with dexMod override')

    // Manually set concentration on the bard (simulate casting Polymorph)
    session.state = session.state.withUpdatedCombatant('bard-1', {
      concentrating: 'Polymorph',
      concentrationRoundsRemaining: 10,
    })

    // End bard's turn → zombie gets auto-run by AI → cycles back to bard
    // Bard's start-of-turn upkeep should decrement concentration timer
    const result = manager.endTurn(sessionId)

    const bardAfter = result.newState.combatants.find(c => c.id === 'bard-1')
    assert.ok(bardAfter.concentrating === 'Polymorph', 'should still be concentrating')
    assert.ok(
      bardAfter.concentrationRoundsRemaining < 10,
      `concentrationRoundsRemaining should have decremented from 10, got ${bardAfter.concentrationRoundsRemaining}`
    )
  })

  it('breaks concentration when timer reaches zero', () => {
    const config = {
      combatants: [
        { templateKey: 'gem_dragonborn_lore_bard_8', id: 'bard-1', side: 'party',
          position: { q: 0, r: 0 }, speed: 30, overrides: { dexMod: 100 } },
        { templateKey: 'zombie', id: 'zombie-1', side: 'enemy',
          position: { q: 10, r: 0 }, speed: 30 },
      ],
      aiConfig: { profileMap: { 'zombie-1': 'undead_basic' } },
    }
    const { sessionId } = manager.createSession(config)
    const session = manager._sessions.get(sessionId)

    // Set concentration with only 1 round remaining
    session.state = session.state.withUpdatedCombatant('bard-1', {
      concentrating: 'Hold Person',
      concentrationRoundsRemaining: 1,
    })

    // End turn — bard's next start-of-turn should expire the concentration
    const result = manager.endTurn(sessionId)
    const bardAfter = result.newState.combatants.find(c => c.id === 'bard-1')
    assert.equal(bardAfter.concentrating, null, 'concentration should have been broken')
    assert.equal(bardAfter.concentrationRoundsRemaining, 0, 'rounds remaining should be 0')
  })

  it('serializes updated concentrationRoundsRemaining to client', () => {
    const config = {
      combatants: [
        { templateKey: 'gem_dragonborn_lore_bard_8', id: 'bard-1', side: 'party',
          position: { q: 0, r: 0 }, speed: 30, overrides: { dexMod: 100 } },
        { templateKey: 'zombie', id: 'zombie-1', side: 'enemy',
          position: { q: 5, r: 0 }, speed: 30 },
      ],
    }
    const { sessionId, state } = manager.createSession(config)

    // Check that concentrationRoundsRemaining is in the serialized state
    const bardSerialized = state.combatants.find(c => c.id === 'bard-1')
    assert.ok('concentrationRoundsRemaining' in bardSerialized,
      'concentrationRoundsRemaining should be serialized')
    assert.equal(typeof bardSerialized.concentrationRoundsRemaining, 'number')
  })
})
