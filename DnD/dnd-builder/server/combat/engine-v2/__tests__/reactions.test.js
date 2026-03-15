/**
 * Reaction Framework — unit tests
 *
 * Tests processReactions and applyReaction in EncounterRunner.
 * Covers Cutting Words, Counterspell, and Silvery Barbs.
 */

'use strict'

const { describe, it, before, after, beforeEach } = require('node:test')
const assert = require('node:assert/strict')

const dice = require('../../engine/dice')
const { GameState } = require('../GameState')
const ER = require('../EncounterRunner')
const { makeBard, makeEnemy, makeBrute, makeCombatant } = require('./helpers')

before(() => dice.setDiceMode('average'))
after(() => dice.setDiceMode('random'))

// ── Helpers ──────────────────────────────────────────────────────────────────

/** Create a bard with BI and Silvery Barbs available */
function makeReactiveBard(overrides = {}) {
  return makeBard({
    bardicInspiration: { uses: 3, maxUses: 3, die: 'd8', cuttingWords: true },
    bardicInspirationUses: 3,
    spellSlots: { 1: 4, 2: 3, 3: 3, 4: 2 },
    spellsKnown: [
      'Counterspell', 'Silvery Barbs', 'Hypnotic Pattern',
      'Hold Person', 'Healing Word', 'Faerie Fire',
    ],
    ...overrides,
  })
}

/** A simple getReaction that always returns the given reaction */
function alwaysReact(reaction) {
  return (_state, _reactorId, _event) => reaction
}

/** A getReaction that never reacts */
function neverReact() {
  return (_state, _reactorId, _event) => null
}

/** A getReaction that calls a list of functions by reactorId */
function reactByCreature(map) {
  return (state, reactorId, event) => {
    const fn = map[reactorId]
    return fn ? fn(state, reactorId, event) : null
  }
}

// ═══════════════════════════════════════════════════════════════════════════
// processReactions — basic routing
// ═══════════════════════════════════════════════════════════════════════════

describe('processReactions — routing', () => {
  it('returns state unchanged when getReaction is null', () => {
    const state = new GameState({
      combatants: [makeReactiveBard(), makeEnemy()],
    })
    const result = ER.processReactions(state, 'enemy1', { type: 'attack', hit: true, roll: 18, natural: 14, targetAC: 15, targetId: 'bard1', attackerId: 'enemy1', damage: 8 }, null)
    assert.strictEqual(result, state)
  })

  it('returns state unchanged when actionResult is null', () => {
    const state = new GameState({
      combatants: [makeReactiveBard(), makeEnemy()],
    })
    const result = ER.processReactions(state, 'enemy1', null, alwaysReact({ type: 'cutting_words', dieUsed: 'd8' }))
    assert.strictEqual(result, state)
  })

  it('returns state unchanged when attack missed', () => {
    const state = new GameState({
      combatants: [makeReactiveBard(), makeEnemy()],
    })
    const actionResult = { type: 'attack', hit: false, roll: 8, natural: 4, targetAC: 15, targetId: 'bard1', attackerId: 'enemy1', damage: 0 }
    const result = ER.processReactions(state, 'enemy1', actionResult, alwaysReact({ type: 'cutting_words' }))
    // No reaction called on a miss
    assert.strictEqual(result, state)
  })

  it('does not trigger reactions for incapacitated reactors', () => {
    const bard = makeReactiveBard({ conditions: ['incapacitated'] })
    const state = new GameState({
      combatants: [bard, makeEnemy()],
    })
    const actionResult = { type: 'attack', hit: true, roll: 18, natural: 14, targetAC: 15, targetId: 'bard1', attackerId: 'enemy1', damage: 8 }
    let reactionCalled = false
    const getReaction = () => { reactionCalled = true; return { type: 'cutting_words', dieUsed: 'd8' } }
    const result = ER.processReactions(state, 'enemy1', actionResult, getReaction)
    assert.strictEqual(reactionCalled, false)
  })

  it('does not trigger reactions for dead reactors', () => {
    const bard = makeReactiveBard({ currentHP: 0 })
    const state = new GameState({
      combatants: [bard, makeEnemy()],
    })
    const actionResult = { type: 'attack', hit: true, roll: 18, natural: 14, targetAC: 15, targetId: 'bard1', attackerId: 'enemy1', damage: 8 }
    let reactionCalled = false
    const getReaction = () => { reactionCalled = true; return { type: 'cutting_words', dieUsed: 'd8' } }
    ER.processReactions(state, 'enemy1', actionResult, getReaction)
    assert.strictEqual(reactionCalled, false)
  })

  it('does not trigger reactions for creatures who already reacted', () => {
    const bard = makeReactiveBard({ reactedThisRound: true })
    const state = new GameState({
      combatants: [bard, makeEnemy()],
    })
    const actionResult = { type: 'attack', hit: true, roll: 18, natural: 14, targetAC: 15, targetId: 'bard1', attackerId: 'enemy1', damage: 8 }
    let reactionCalled = false
    const getReaction = () => { reactionCalled = true; return { type: 'cutting_words', dieUsed: 'd8' } }
    ER.processReactions(state, 'enemy1', actionResult, getReaction)
    assert.strictEqual(reactionCalled, false)
  })
})

// ═══════════════════════════════════════════════════════════════════════════
// Cutting Words
// ═══════════════════════════════════════════════════════════════════════════

describe('applyReaction — Cutting Words', () => {
  it('reduces attack roll and undoes damage when attack now misses', () => {
    // Enemy hit for 8 damage, roll 18, AC 15
    // Average d8 = 4, so 18 - 4 = 14 < 15 → miss
    const bard = makeReactiveBard({ currentHP: 37 }) // took 8 damage from 45
    const enemy = makeEnemy({ totalDamageDealt: 8, attacksHit: 1 })
    const state = new GameState({ combatants: [bard, enemy] })

    const event = { type: 'enemy_attack_roll', attackerId: 'enemy1', targetId: 'bard1', roll: 18, natural: 14, targetAC: 15, damage: 8 }
    const reaction = { type: 'cutting_words', dieUsed: 'd8' }

    const result = ER.applyReaction(state, 'bard1', 'enemy1', reaction, event)

    const updatedBard = result.getCombatant('bard1')
    // HP restored: 37 + 8 = 45
    assert.strictEqual(updatedBard.currentHP, 45)
    // BI decremented
    assert.strictEqual(updatedBard.bardicInspiration.uses, 2)
    assert.strictEqual(updatedBard.bardicInspirationUses, 2)
    // Marked as reacted
    assert.strictEqual(updatedBard.reactedThisRound, true)

    // Enemy damage dealt undone
    const updatedEnemy = result.getCombatant('enemy1')
    assert.strictEqual(updatedEnemy.totalDamageDealt, 0)
    assert.strictEqual(updatedEnemy.attacksHit, 0)
  })

  it('decrements BI even when attack still hits', () => {
    // Enemy roll 22, AC 15. d8 avg = 4, 22-4 = 18 >= 15 → still hits
    const bard = makeReactiveBard({ currentHP: 37 })
    const enemy = makeEnemy({ totalDamageDealt: 8, attacksHit: 1 })
    const state = new GameState({ combatants: [bard, enemy] })

    const event = { type: 'enemy_attack_roll', attackerId: 'enemy1', targetId: 'bard1', roll: 22, natural: 18, targetAC: 15, damage: 8 }
    const reaction = { type: 'cutting_words', dieUsed: 'd8' }

    const result = ER.applyReaction(state, 'bard1', 'enemy1', reaction, event)

    const updatedBard = result.getCombatant('bard1')
    // HP NOT restored (still hits)
    assert.strictEqual(updatedBard.currentHP, 37)
    // But BI still decremented
    assert.strictEqual(updatedBard.bardicInspiration.uses, 2)
    assert.strictEqual(updatedBard.bardicInspirationUses, 2)
    assert.strictEqual(updatedBard.reactedThisRound, true)
  })

  it('does not restore HP above maxHP', () => {
    // Bard at full HP somehow triggered cutting words (edge case)
    const bard = makeReactiveBard({ currentHP: 45, maxHP: 45 })
    const state = new GameState({ combatants: [bard, makeEnemy()] })

    const event = { type: 'enemy_attack_roll', attackerId: 'enemy1', targetId: 'bard1', roll: 18, natural: 14, targetAC: 15, damage: 8 }
    const reaction = { type: 'cutting_words', dieUsed: 'd8' }

    const result = ER.applyReaction(state, 'bard1', 'enemy1', reaction, event)

    const updatedBard = result.getCombatant('bard1')
    assert.strictEqual(updatedBard.currentHP, 45) // capped at maxHP
  })
})

// ═══════════════════════════════════════════════════════════════════════════
// Counterspell
// ═══════════════════════════════════════════════════════════════════════════

describe('applyReaction — Counterspell', () => {
  it('spends a 3rd-level slot and counters a ≤3rd level spell', () => {
    const bard = makeReactiveBard()
    const enemy = makeEnemy({ concentrating: 'Hold Person', concentrationRoundsRemaining: 10 })
    const state = new GameState({ combatants: [bard, enemy] })

    const event = { type: 'enemy_casting_spell', casterId: 'enemy1', spell: 'Hold Person', slotLevel: 2 }
    const reaction = { type: 'counterspell', slotLevel: 3 }

    const result = ER.applyReaction(state, 'bard1', 'enemy1', reaction, event)

    const updatedBard = result.getCombatant('bard1')
    assert.strictEqual(updatedBard.spellSlots[3], 2) // 3 → 2
    assert.strictEqual(updatedBard.reactedThisRound, true)
    assert.strictEqual(updatedBard.spellsCast, 1)

    // Concentration broken on the caster
    const updatedEnemy = result.getCombatant('enemy1')
    assert.strictEqual(updatedEnemy.concentrating, null)
    assert.strictEqual(updatedEnemy.concentrationRoundsRemaining, 0)
  })

  it('spends slot even when counter level < spell level (ability check)', () => {
    // Counterspell at 3rd vs 5th level spell — requires ability check
    // In average mode: d20 = 10.5 → 10, CHA mod = 3, total = 13 vs DC 15 → fails
    const bard = makeReactiveBard()
    const enemy = makeEnemy()
    const state = new GameState({ combatants: [bard, enemy] })

    const event = { type: 'enemy_casting_spell', casterId: 'enemy1', spell: 'Fireball', slotLevel: 5 }
    const reaction = { type: 'counterspell', slotLevel: 3 }

    const result = ER.applyReaction(state, 'bard1', 'enemy1', reaction, event)

    const updatedBard = result.getCombatant('bard1')
    assert.strictEqual(updatedBard.spellSlots[3], 2) // slot still spent even on failure
    assert.strictEqual(updatedBard.reactedThisRound, true)
  })

  it('auto-succeeds when counter level >= spell level', () => {
    const bard = makeReactiveBard()
    const enemy = makeEnemy({ concentrating: 'Command', concentrationRoundsRemaining: 1 })
    const state = new GameState({ combatants: [bard, enemy] })

    const event = { type: 'enemy_casting_spell', casterId: 'enemy1', spell: 'Command', slotLevel: 1 }
    const reaction = { type: 'counterspell', slotLevel: 3 }

    const result = ER.applyReaction(state, 'bard1', 'enemy1', reaction, event)

    const updatedEnemy = result.getCombatant('enemy1')
    assert.strictEqual(updatedEnemy.concentrating, null)
  })
})

// ═══════════════════════════════════════════════════════════════════════════
// Silvery Barbs
// ═══════════════════════════════════════════════════════════════════════════

describe('applyReaction — Silvery Barbs', () => {
  it('spends a 1st-level slot and forces a reroll', () => {
    // Under average dice: d20 reroll = 10. Attack bonus = roll - natural = 18 - 14 = 4.
    // Reroll total = 10 + 4 = 14 < AC 15 → miss, undo damage
    const bard = makeReactiveBard({ currentHP: 37 })
    const enemy = makeEnemy({ totalDamageDealt: 8, attacksHit: 1 })
    const state = new GameState({ combatants: [bard, enemy] })

    const event = { type: 'enemy_attack_roll', attackerId: 'enemy1', targetId: 'bard1', roll: 18, natural: 14, targetAC: 15, damage: 8 }
    const reaction = { type: 'silvery_barbs', slotLevel: 1 }

    const result = ER.applyReaction(state, 'bard1', 'enemy1', reaction, event)

    const updatedBard = result.getCombatant('bard1')
    // HP restored: 37 + 8 = 45
    assert.strictEqual(updatedBard.currentHP, 45)
    // 1st level slot spent: 4 → 3
    assert.strictEqual(updatedBard.spellSlots[1], 3)
    assert.strictEqual(updatedBard.reactedThisRound, true)
    assert.strictEqual(updatedBard.spellsCast, 1)

    // Enemy damage undone
    const updatedEnemy = result.getCombatant('enemy1')
    assert.strictEqual(updatedEnemy.totalDamageDealt, 0)
    assert.strictEqual(updatedEnemy.attacksHit, 0)
  })

  it('still spends slot when reroll still hits', () => {
    // Attack bonus = 22 - 12 = 10. Reroll: 10 + 10 = 20 >= AC 15 → still hits
    const bard = makeReactiveBard({ currentHP: 37 })
    const enemy = makeEnemy({ totalDamageDealt: 8, attacksHit: 1 })
    const state = new GameState({ combatants: [bard, enemy] })

    const event = { type: 'enemy_attack_roll', attackerId: 'enemy1', targetId: 'bard1', roll: 22, natural: 12, targetAC: 15, damage: 8 }
    const reaction = { type: 'silvery_barbs', slotLevel: 1 }

    const result = ER.applyReaction(state, 'bard1', 'enemy1', reaction, event)

    const updatedBard = result.getCombatant('bard1')
    assert.strictEqual(updatedBard.currentHP, 37) // NOT restored
    assert.strictEqual(updatedBard.spellSlots[1], 3) // slot spent
    assert.strictEqual(updatedBard.reactedThisRound, true)
  })
})

// ═══════════════════════════════════════════════════════════════════════════
// processReactions — multiattack
// ═══════════════════════════════════════════════════════════════════════════

describe('processReactions — multiattack triggers', () => {
  it('reacts to the first hitting sub-attack in a multiattack', () => {
    const bard = makeReactiveBard({ currentHP: 37 })
    const enemy = makeBrute({ totalDamageDealt: 8, attacksHit: 1 })
    const state = new GameState({ combatants: [bard, enemy] })

    const actionResult = {
      type: 'multiattack',
      totalDamage: 16,
      hits: 2,
      attackCount: 2,
      attacks: [
        { hit: true, damage: 8, crit: false, roll: 18, natural: 14, targetAC: 15, targetId: 'bard1', attackerId: 'brute1' },
        { hit: true, damage: 8, crit: false, roll: 20, natural: 16, targetAC: 15, targetId: 'bard1', attackerId: 'brute1' },
      ],
    }

    let reactionCount = 0
    const getReaction = (_state, _reactorId, _event) => {
      reactionCount++
      return { type: 'cutting_words', dieUsed: 'd8' }
    }

    const result = ER.processReactions(state, 'brute1', actionResult, getReaction)

    // Should only react once (first hit), since bard used reaction
    assert.strictEqual(reactionCount, 1)
    // Bard should be marked as reacted
    assert.strictEqual(result.getCombatant('bard1').reactedThisRound, true)
  })
})

// ═══════════════════════════════════════════════════════════════════════════
// processReactions — spell casting triggers
// ═══════════════════════════════════════════════════════════════════════════

describe('processReactions — spell triggers', () => {
  it('triggers counterspell when enemy casts a spell', () => {
    const bard = makeReactiveBard()
    const enemy = makeEnemy({ concentrating: 'Hold Person', concentrationRoundsRemaining: 10 })
    const state = new GameState({ combatants: [bard, enemy] })

    const actionResult = { type: 'spell', spellName: 'Hold Person', slotLevel: 2 }

    const getReaction = (_state, _reactorId, event) => {
      assert.strictEqual(event.type, 'enemy_casting_spell')
      assert.strictEqual(event.spell, 'Hold Person')
      return { type: 'counterspell', slotLevel: 3 }
    }

    const result = ER.processReactions(state, 'enemy1', actionResult, getReaction)

    // Bard spent a 3rd level slot
    assert.strictEqual(result.getCombatant('bard1').spellSlots[3], 2)
    // Enemy lost concentration
    assert.strictEqual(result.getCombatant('enemy1').concentrating, null)
  })

  it('does not trigger reactions on non-spell action results', () => {
    const bard = makeReactiveBard()
    const enemy = makeEnemy()
    const state = new GameState({ combatants: [bard, enemy] })

    // A dodge/move has no type that triggers reactions
    const actionResult = { type: 'dodge' }

    let reactionCalled = false
    const getReaction = () => { reactionCalled = true; return null }

    ER.processReactions(state, 'enemy1', actionResult, getReaction)
    assert.strictEqual(reactionCalled, false)
  })
})

// ═══════════════════════════════════════════════════════════════════════════
// Tactics evaluators
// ═══════════════════════════════════════════════════════════════════════════

describe('evalSilveryBarbs — tactics evaluator', () => {
  const tactics = require('../../ai/tactics')

  it('triggers against a hitting attack when 1st-level slot available', () => {
    const creature = {
      spellSlots: { 1: 2 },
      reactedThisRound: false,
    }
    const event = { type: 'enemy_attack_roll', roll: 18, targetAC: 15 }
    const result = tactics.evalSilveryBarbs(creature, event)
    assert.ok(result)
    assert.strictEqual(result.type, 'silvery_barbs')
    assert.strictEqual(result.slotLevel, 1)
  })

  it('does NOT trigger when attack already misses', () => {
    const creature = { spellSlots: { 1: 2 }, reactedThisRound: false }
    const event = { type: 'enemy_attack_roll', roll: 12, targetAC: 15 }
    assert.strictEqual(tactics.evalSilveryBarbs(creature, event), null)
  })

  it('does NOT trigger without 1st-level slots', () => {
    const creature = { spellSlots: { 1: 0 }, reactedThisRound: false }
    const event = { type: 'enemy_attack_roll', roll: 18, targetAC: 15 }
    assert.strictEqual(tactics.evalSilveryBarbs(creature, event), null)
  })

  it('does NOT trigger if already reacted', () => {
    const creature = { spellSlots: { 1: 2 }, reactedThisRound: true }
    const event = { type: 'enemy_attack_roll', roll: 18, targetAC: 15 }
    assert.strictEqual(tactics.evalSilveryBarbs(creature, event), null)
  })

  it('does NOT trigger on spell events (Silvery Barbs is for attacks/saves)', () => {
    const creature = { spellSlots: { 1: 2 }, reactedThisRound: false }
    const event = { type: 'enemy_casting_spell', spell: 'Hold Person' }
    assert.strictEqual(tactics.evalSilveryBarbs(creature, event), null)
  })
})

// ═══════════════════════════════════════════════════════════════════════════
// Integration — runEncounter with reactions
// ═══════════════════════════════════════════════════════════════════════════

describe('runEncounter — reaction integration', () => {
  it('accepts getReaction parameter and runs without error', () => {
    const state = new GameState({
      combatants: [
        makeReactiveBard({ currentHP: 45 }),
        makeEnemy({ currentHP: 5 }),  // low HP so encounter ends quickly
      ],
    })

    const TurnMenu = require('../TurnMenu')
    function simpleAI(aiState, actorId) {
      const menu = TurnMenu.getMenu(aiState, actorId)
      const attack = menu.actions.find(o => o.type === 'attack' || o.type === 'multiattack')
      if (attack) return { action: { optionId: attack.optionId } }
      return { action: { optionId: 'end-turn' } }
    }

    const result = ER.runEncounter({
      state,
      getDecision: simpleAI,
      getReaction: neverReact(),
      maxRounds: 5,
    })

    assert.ok(result)
    assert.ok(['party', 'enemy', 'draw'].includes(result.winner))
    assert.ok(result.rounds >= 1)
  })

  it('backwards compatible — works without getReaction (undefined)', () => {
    const state = new GameState({
      combatants: [
        makeReactiveBard({ currentHP: 45 }),
        makeEnemy({ currentHP: 5 }),
      ],
    })

    const TurnMenu = require('../TurnMenu')
    function simpleAI(aiState, actorId) {
      const menu = TurnMenu.getMenu(aiState, actorId)
      const attack = menu.actions.find(o => o.type === 'attack')
      if (attack) return { action: { optionId: attack.optionId } }
      return { action: { optionId: 'end-turn' } }
    }

    // No getReaction passed — should work exactly as before
    const result = ER.runEncounter({
      state,
      getDecision: simpleAI,
      maxRounds: 5,
    })

    assert.ok(result)
    assert.ok(['party', 'enemy', 'draw'].includes(result.winner))
  })
})

// ═══════════════════════════════════════════════════════════════════════════
// Round 5 — Counterspell pre-spell-state revert
// ═══════════════════════════════════════════════════════════════════════════

describe('Counterspell — pre-spell-state revert (Round 5)', () => {
  it('reverts ALL spell effects when preSpellState is provided', () => {
    // Enemy Fireball dealt damage + no concentration. Old logic didn't undo damage.
    // New logic with preSpellState should revert the target's HP.
    const bard = makeReactiveBard({ currentHP: 20, maxHP: 45 })  // took 25 damage from Fireball
    const enemy = makeEnemy({
      spellSlots: { 1: 4, 2: 3, 3: 2 },
      spellsCast: 1,
    })
    const postSpellState = new GameState({ combatants: [bard, enemy] })

    // Pre-spell state: bard was at full HP before Fireball
    const preSpellState = new GameState({
      combatants: [
        makeReactiveBard({ currentHP: 45, maxHP: 45 }),
        makeEnemy({ spellSlots: { 1: 4, 2: 3, 3: 3 } }),  // enemy's 3rd slot not yet spent
      ],
    })

    const event = { type: 'enemy_casting_spell', casterId: 'enemy1', spell: 'Fireball', slotLevel: 3 }
    const reaction = { type: 'counterspell', slotLevel: 3 }

    const result = ER.applyReaction(postSpellState, 'bard1', 'enemy1', reaction, event, preSpellState)

    // Bard's HP should be restored to pre-spell value (45), NOT still 20
    const updatedBard = result.getCombatant('bard1')
    assert.strictEqual(updatedBard.currentHP, 45)
    assert.strictEqual(updatedBard.spellSlots[3], 2)  // Bard spent 3rd slot for Counterspell
    assert.strictEqual(updatedBard.reactedThisRound, true)

    // Enemy's slot should still be spent (they tried to cast)
    const updatedEnemy = result.getCombatant('enemy1')
    assert.strictEqual(updatedEnemy.spellSlots[3], 2)  // enemy's 3rd slot spent on failed Fireball
  })

  it('reverts concentration + conditions when preSpellState provided', () => {
    // Enemy cast Hypnotic Pattern → bard got charmed_hp + incapacitated.
    // With preSpellState revert, all conditions should be removed.
    const bard = makeReactiveBard({
      conditions: ['charmed_hp', 'incapacitated'],
    })
    const enemy = makeEnemy({
      concentrating: 'Hypnotic Pattern',
      concentrationRoundsRemaining: 10,
      spellSlots: { 1: 4, 2: 2, 3: 1 },
      spellsCast: 1,
    })
    const postState = new GameState({ combatants: [bard, enemy] })

    const preState = new GameState({
      combatants: [
        makeReactiveBard({ conditions: [] }),
        makeEnemy({ spellSlots: { 1: 4, 2: 2, 3: 2 } }),
      ],
    })

    const event = { type: 'enemy_casting_spell', casterId: 'enemy1', spell: 'Hypnotic Pattern', slotLevel: 3 }
    const reaction = { type: 'counterspell', slotLevel: 3 }

    const result = ER.applyReaction(postState, 'bard1', 'enemy1', reaction, event, preState)

    // Bard should have NO conditions (reverted to pre-spell state)
    const updatedBard = result.getCombatant('bard1')
    assert.deepStrictEqual(updatedBard.conditions, [])

    // Enemy should NOT be concentrating (spell was countered)
    const updatedEnemy = result.getCombatant('enemy1')
    assert.strictEqual(updatedEnemy.concentrating, null)
  })

  it('processReactions passes preSpellState to counterspell handler', () => {
    // Full integration: processReactions with spell result + preSpellState
    const bard = makeReactiveBard({ currentHP: 20, maxHP: 45 })
    const enemy = makeEnemy({
      spellSlots: { 1: 4, 2: 3, 3: 2 },
      spellsCast: 1,
    })
    const postSpellState = new GameState({ combatants: [bard, enemy] })

    const preSpellState = new GameState({
      combatants: [
        makeReactiveBard({ currentHP: 45, maxHP: 45 }),
        makeEnemy({ spellSlots: { 1: 4, 2: 3, 3: 3 } }),
      ],
    })

    const actionResult = { type: 'spell', spellName: 'Fireball', slotLevel: 3 }
    const getReaction = (_state, _reactorId, _event) => {
      return { type: 'counterspell', slotLevel: 3 }
    }

    const result = ER.processReactions(postSpellState, 'enemy1', actionResult, getReaction, preSpellState)

    // Bard's HP restored to pre-spell (45)
    assert.strictEqual(result.getCombatant('bard1').currentHP, 45)
  })

  it('fallback works without preSpellState (concentration spells)', () => {
    // Old behavior: calling applyReaction without preSpellState on a concentration spell
    // should still clear concentration via breakConcentration
    const bard = makeReactiveBard()
    const enemy = makeEnemy({
      concentrating: 'Hold Person',
      concentrationRoundsRemaining: 10,
    })
    const state = new GameState({ combatants: [bard, enemy] })

    const event = { type: 'enemy_casting_spell', casterId: 'enemy1', spell: 'Hold Person', slotLevel: 2 }
    const reaction = { type: 'counterspell', slotLevel: 3 }

    // No preSpellState — relies on fallback
    const result = ER.applyReaction(state, 'bard1', 'enemy1', reaction, event)

    const updatedEnemy = result.getCombatant('enemy1')
    assert.strictEqual(updatedEnemy.concentrating, null)
  })
})

// ═══════════════════════════════════════════════════════════════════════════
// Round 5 — Tactics evaluator changes
// ═══════════════════════════════════════════════════════════════════════════

describe('Round 5 — evalSelfPolymorph broadened triggers', () => {
  const tactics = require('../../ai/tactics')

  function makeCtx(overrides = {}) {
    const defaults = {
      me: {
        concentrating: null,
        spellSlots: { 4: 2 },
        spellsKnown: ['Polymorph'],
        polymorphedAs: null,
      },
      hpPct: 1.0,
      activeEnemies: [],
      enemiesInMelee: [],
    }
    return { ...defaults, ...overrides }
  }

  it('triggers when facing ≥4 enemies (Mixed Encounter)', () => {
    const enemies = Array.from({ length: 5 }, (_, i) => ({ id: `e${i}`, currentHP: 30 }))
    const ctx = makeCtx({ activeEnemies: enemies })
    const result = tactics.evalSelfPolymorph(ctx)
    assert.ok(result, 'Should trigger for 5 enemies')
    assert.strictEqual(result.action.spell, 'Polymorph')
    assert.strictEqual(result.action.polymorphMode, 'self')
  })

  it('triggers when facing 3 enemies with combined HP > 200 (Frost Giant)', () => {
    const enemies = [
      { id: 'fg', currentHP: 138 },
      { id: 'ogre1', currentHP: 59 },
      { id: 'ogre2', currentHP: 59 },
    ]
    const ctx = makeCtx({ activeEnemies: enemies })
    const result = tactics.evalSelfPolymorph(ctx)
    assert.ok(result, 'Should trigger for 3 enemies with 256 combined HP')
  })

  it('does NOT trigger for 3 weak enemies (low combined HP)', () => {
    const enemies = [
      { id: 'e1', currentHP: 11 },
      { id: 'e2', currentHP: 11 },
      { id: 'e3', currentHP: 11 },
    ]
    const ctx = makeCtx({ activeEnemies: enemies })
    const result = tactics.evalSelfPolymorph(ctx)
    assert.strictEqual(result, null, 'Should NOT trigger for 3 enemies with 33 total HP')
  })
})

describe('Round 5 — evalBeastFormMelee targets weakest', () => {
  const tactics = require('../../ai/tactics')

  it('targets weakest enemy when ≥3 active enemies', () => {
    const weak = { id: 'weak', currentHP: 11, name: 'Bandit' }
    const med = { id: 'med', currentHP: 59, name: 'Ogre' }
    const strong = { id: 'strong', currentHP: 138, name: 'Frost Giant' }

    const ctx = {
      me: { polymorphedAs: 'Giant Ape', multiattack: 2, weapons: [{ name: 'Fist' }] },
      activeEnemies: [strong, med, weak],
      enemiesInMelee: [strong, med, weak],
    }

    const result = tactics.evalBeastFormMelee(ctx)
    assert.ok(result)
    assert.strictEqual(result.action.target.id, 'weak', 'Should target weakest enemy')
  })

  it('targets highest threat when < 3 active enemies', () => {
    const low = { id: 'low', currentHP: 11, name: 'Bandit', spellsKnown: [] }
    const caster = { id: 'caster', currentHP: 40, name: 'Mage', spellsKnown: ['Fireball'] }

    const ctx = {
      me: { polymorphedAs: 'Giant Ape', multiattack: 2, weapons: [{ name: 'Fist' }] },
      activeEnemies: [low, caster],
      enemiesInMelee: [low, caster],
    }

    const result = tactics.evalBeastFormMelee(ctx)
    assert.ok(result)
    assert.strictEqual(result.action.target.id, 'caster', 'Should target highest threat (caster)')
  })
})

describe('Round 5 — evalProactiveHealingWord', () => {
  const tactics = require('../../ai/tactics')

  it('triggers when HP below 70% and has slot', () => {
    const ctx = {
      me: {
        spellsKnown: ['Healing Word'],
        spellSlots: { 1: 2 },
        concentrating: null,
        polymorphedAs: null,
      },
      hpPct: 0.5,
    }
    const result = tactics.evalProactiveHealingWord(ctx)
    assert.ok(result)
    assert.strictEqual(result._bonusActionOnly, true)
    assert.strictEqual(result.bonusAction.spell, 'Healing Word')
  })

  it('does NOT trigger when HP >= 70%', () => {
    const ctx = {
      me: {
        spellsKnown: ['Healing Word'],
        spellSlots: { 1: 2 },
        polymorphedAs: null,
      },
      hpPct: 0.75,
    }
    assert.strictEqual(tactics.evalProactiveHealingWord(ctx), null)
  })

  it('does NOT trigger in beast form', () => {
    const ctx = {
      me: {
        spellsKnown: ['Healing Word'],
        spellSlots: { 1: 2 },
        polymorphedAs: 'Giant Ape',
      },
      hpPct: 0.3,
    }
    assert.strictEqual(tactics.evalProactiveHealingWord(ctx), null)
  })
})

// ═══════════════════════════════════════════════════════════════════════════
// Opportunity Attacks
// ═══════════════════════════════════════════════════════════════════════════

const ActionResolver = require('../ActionResolver')

describe('Opportunity Attacks — resolveMove trigger detection', () => {
  /** Fighter adjacent to enemy, then steps away → OA trigger */
  it('returns OA trigger when mover leaves melee reach', () => {
    // Mover at {x:0,y:0}, reactor (enemy) at {x:1,y:0} → 5 ft apart (adjacent)
    // Mover moves to {x:3,y:0} → 15 ft from reactor → leaves reach → OA trigger
    const mover = makeCombatant({ id: 'fighter1', side: 'party', position: { x: 0, y: 0 }, movementRemaining: 30 })
    const reactor = makeEnemy({ id: 'zombie1', side: 'enemy', position: { x: 1, y: 0 } })
    const state = new GameState({ combatants: [mover, reactor] })

    const res = ActionResolver.resolve(state, 'fighter1', { optionId: 'move-to', position: { x: 3, y: 0 } })
    assert.ok(Array.isArray(res.result.opportunityAttackTriggers), 'should have opportunityAttackTriggers array')
    assert.ok(res.result.opportunityAttackTriggers.includes('zombie1'), 'zombie1 should be in trigger list')
  })

  it('returns empty OA list when mover stays within reach', () => {
    // Mover at {x:0,y:0}, reactor at {x:1,y:0} (5 ft), mover steps to {x:0,y:1} (also 5 ft)
    const mover = makeCombatant({ id: 'fighter1', side: 'party', position: { x: 0, y: 0 }, movementRemaining: 30 })
    const reactor = makeEnemy({ id: 'zombie1', side: 'enemy', position: { x: 1, y: 0 } })
    const state = new GameState({ combatants: [mover, reactor] })

    const res = ActionResolver.resolve(state, 'fighter1', { optionId: 'move-to', position: { x: 0, y: 1 } })
    assert.deepStrictEqual(res.result.opportunityAttackTriggers, [])
  })

  it('returns empty OA list when mover has already Disengaged', () => {
    const mover = makeCombatant({ id: 'fighter1', side: 'party', position: { x: 0, y: 0 }, movementRemaining: 30, disengaged: true })
    const reactor = makeEnemy({ id: 'zombie1', side: 'enemy', position: { x: 1, y: 0 } })
    const state = new GameState({ combatants: [mover, reactor] })

    const res = ActionResolver.resolve(state, 'fighter1', { optionId: 'move-to', position: { x: 4, y: 0 } })
    assert.deepStrictEqual(res.result.opportunityAttackTriggers, [])
  })

  it('returns empty OA list when reactor has already reacted this round', () => {
    const mover = makeCombatant({ id: 'fighter1', side: 'party', position: { x: 0, y: 0 }, movementRemaining: 30 })
    const reactor = makeEnemy({ id: 'zombie1', side: 'enemy', position: { x: 1, y: 0 }, reactedThisRound: true })
    const state = new GameState({ combatants: [mover, reactor] })

    const res = ActionResolver.resolve(state, 'fighter1', { optionId: 'move-to', position: { x: 4, y: 0 } })
    assert.deepStrictEqual(res.result.opportunityAttackTriggers, [])
  })

  it('returns empty OA list when enemy is already out of reach before the move', () => {
    // Mover at {x:0,y:0}, reactor at {x:6,y:0} (30 ft) — never adjacent
    const mover = makeCombatant({ id: 'fighter1', side: 'party', position: { x: 0, y: 0 }, movementRemaining: 30 })
    const reactor = makeEnemy({ id: 'zombie1', side: 'enemy', position: { x: 6, y: 0 } })
    const state = new GameState({ combatants: [mover, reactor] })

    const res = ActionResolver.resolve(state, 'fighter1', { optionId: 'move-to', position: { x: 3, y: 0 } })
    assert.deepStrictEqual(res.result.opportunityAttackTriggers, [])
  })

  it('returns empty OA list when reactor is dead', () => {
    const mover = makeCombatant({ id: 'fighter1', side: 'party', position: { x: 0, y: 0 }, movementRemaining: 30 })
    const reactor = makeEnemy({ id: 'zombie1', side: 'enemy', position: { x: 1, y: 0 }, currentHP: 0 })
    const state = new GameState({ combatants: [mover, reactor] })

    const res = ActionResolver.resolve(state, 'fighter1', { optionId: 'move-to', position: { x: 4, y: 0 } })
    assert.deepStrictEqual(res.result.opportunityAttackTriggers, [])
  })
})

describe('Opportunity Attacks — processReactions applies OA', () => {
  it('applies an opportunity attack when enemy_leaving_melee event fires', () => {
    // Mover (party) at {x:0,y:0}, reactor (enemy) at {x:1,y:0}
    const mover = makeCombatant({ id: 'fighter1', name: 'Fighter', side: 'party', position: { x: 0, y: 0 } })
    const reactor = makeEnemy({ id: 'zombie1', name: 'Zombie', side: 'enemy', position: { x: 1, y: 0 } })
    const state = new GameState({ combatants: [mover, reactor] })

    const moveResult = {
      type: 'move',
      from: { x: 0, y: 0 },
      to: { x: 3, y: 0 },
      distance: 15,
      landed: false,
      opportunityAttackTriggers: ['zombie1'],
    }

    const getReaction = alwaysReact({ type: 'opportunity_attack' })
    const newState = ER.processReactions(state, 'fighter1', moveResult, getReaction)

    // Reactor should have reacted
    const updatedReactor = newState.getCombatant('zombie1')
    assert.ok(updatedReactor.reactedThisRound, 'reactor should have reactedThisRound after OA')

    // Combat log should mention opportunity attack
    const oaLog = newState.log.find(l => l.includes('opportunity attack'))
    assert.ok(oaLog, 'combat log should contain opportunity attack message')
  })

  it('skips OA when reactor has already reacted this round', () => {
    const mover = makeCombatant({ id: 'fighter1', name: 'Fighter', side: 'party', position: { x: 0, y: 0 } })
    const reactor = makeEnemy({ id: 'zombie1', name: 'Zombie', side: 'enemy', position: { x: 1, y: 0 }, reactedThisRound: true })
    const state = new GameState({ combatants: [mover, reactor] })

    const moveResult = {
      type: 'move',
      from: { x: 0, y: 0 },
      to: { x: 3, y: 0 },
      distance: 15,
      landed: false,
      opportunityAttackTriggers: ['zombie1'],
    }

    let reactionQueried = false
    const getReaction = (s, id) => { reactionQueried = true; return { type: 'opportunity_attack' } }
    const newState = ER.processReactions(state, 'fighter1', moveResult, getReaction)
    assert.strictEqual(reactionQueried, false, 'should not query reaction for already-reacted creature')
    assert.strictEqual(newState.log.length, state.log.length, 'no OA log entries should be added')
  })

  it('skips OA when opportunityAttackTriggers array is empty', () => {
    const mover = makeCombatant({ id: 'fighter1', name: 'Fighter', side: 'party', position: { x: 0, y: 0 } })
    const reactor = makeEnemy({ id: 'zombie1', name: 'Zombie', side: 'enemy', position: { x: 1, y: 0 } })
    const state = new GameState({ combatants: [mover, reactor] })

    const moveResult = {
      type: 'move', from: { x: 0, y: 0 }, to: { x: 3, y: 0 }, distance: 15, landed: false,
      opportunityAttackTriggers: [],
    }

    const newState = ER.processReactions(state, 'fighter1', moveResult, alwaysReact({ type: 'opportunity_attack' }))
    assert.strictEqual(newState.log.length, state.log.length, 'no OA logs when trigger list is empty')
  })

  it('OA does not consume reactor action — only reaction', () => {
    const mover = makeCombatant({ id: 'fighter1', name: 'Fighter', side: 'party', position: { x: 0, y: 0 } })
    const reactor = makeEnemy({ id: 'zombie1', name: 'Zombie', side: 'enemy', position: { x: 1, y: 0 }, usedAction: false })
    const state = new GameState({ combatants: [mover, reactor] })

    const moveResult = {
      type: 'move', from: { x: 0, y: 0 }, to: { x: 3, y: 0 }, distance: 15, landed: false,
      opportunityAttackTriggers: ['zombie1'],
    }

    const newState = ER.processReactions(state, 'fighter1', moveResult, alwaysReact({ type: 'opportunity_attack' }))
    const updatedReactor = newState.getCombatant('zombie1')

    // usedAction must remain false — the OA uses a REACTION, not an action
    assert.strictEqual(updatedReactor.usedAction, false, 'OA should not consume the reactor\'s action')
    // reactedThisRound must be true — reaction is now spent
    assert.ok(updatedReactor.reactedThisRound, 'OA should mark reactedThisRound=true')
  })
})
