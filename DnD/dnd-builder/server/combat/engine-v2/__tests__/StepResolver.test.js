/**
 * StepResolver — unit tests
 *
 * Tests the stepped dice resolution engine: beginResolve yields DiceRequests,
 * continueResolve consumes DiceResults to advance the chain.
 *
 * Key chains tested:
 *   attack:      attack_roll(d20) → damage(NdM) → [concentration_save(d20)]
 *   multiattack: (attack_roll → damage)* for N attacks
 *   spell:       spell_attack(d20) → spell_damage(NdM)
 *   no-dice:     dodge/dash/disengage → done immediately
 */

'use strict'

const { describe, it, before, after } = require('node:test')
const assert = require('node:assert/strict')

const dice = require('../../engine/dice')
const { GameState } = require('../GameState')
const TurnMenu = require('../TurnMenu')
const StepResolver = require('../StepResolver')
const { makeBard, makeEnemy, makeBrute, makeCombatant } = require('./helpers')

before(() => dice.setDiceMode('average'))
after(() => dice.setDiceMode('random'))

// ── Helpers ──────────────────────────────────────────────────────────────────

/** Bard adjacent to enemy for melee combat */
function makeMeleeState() {
  return new GameState({
    combatants: [
      makeBard(),
      makeEnemy({ position: { x: 1, y: 0 } }),
    ],
    initiativeOrder: ['bard1', 'enemy1'],
  })
}

/** Get a valid rapier attack choice for bard */
function getRapierChoice(state) {
  const menu = TurnMenu.getMenu(state, 'bard1')
  const rapier = menu.actions.find(o => o.type === 'attack' && o.weaponName === 'Rapier')
  assert.ok(rapier, 'Rapier attack option should exist')
  return { optionId: rapier.optionId }
}

/** Get a valid dodge choice for bard */
function getDodgeChoice(state) {
  const menu = TurnMenu.getMenu(state, 'bard1')
  const dodge = menu.actions.find(o => o.type === 'dodge')
  assert.ok(dodge, 'Dodge action should exist')
  return { optionId: dodge.optionId }
}

/** Enemy brute with multiattack, adjacent to bard */
function makeMultiattackState() {
  return new GameState({
    combatants: [
      makeBard({ position: { x: 0, y: 0 } }),
      makeBrute({ position: { x: 1, y: 0 }, multiattack: 2 }),
    ],
    initiativeOrder: ['brute1', 'bard1'],
  })
}

/** Get multiattack choice for brute against bard */
function getMultiattackChoice(state) {
  const menu = TurnMenu.getMenu(state, 'brute1')
  const multi = menu.actions.find(o => o.type === 'multiattack')
  assert.ok(multi, 'Multiattack option should exist')
  return { optionId: multi.optionId }
}

// ── No-Dice Actions ──────────────────────────────────────────────────────────

describe('StepResolver — no-dice actions', () => {
  it('dodge resolves immediately with done: true', () => {
    const state = makeMeleeState()
    const choice = getDodgeChoice(state)
    const result = StepResolver.beginResolve(state, 'bard1', choice)

    assert.strictEqual(result.done, true)
    assert.ok(result.state, 'should return updated state')
    assert.strictEqual(result.pendingDice, null)
  })

  it('throws on invalid choice', () => {
    const state = makeMeleeState()
    assert.throws(() => {
      StepResolver.beginResolve(state, 'bard1', { optionId: 'bogus' })
    }, /Invalid choice/)
  })
})

// ── Single Attack Chain ──────────────────────────────────────────────────────

describe('StepResolver — single attack', () => {
  it('beginResolve returns pending attack_roll d20', () => {
    const state = makeMeleeState()
    const choice = getRapierChoice(state)
    const step1 = StepResolver.beginResolve(state, 'bard1', choice)

    assert.strictEqual(step1.done, false)
    assert.ok(step1.pendingDice, 'should have pendingDice')
    assert.strictEqual(step1.pendingDice.reason, 'attack_roll')
    assert.strictEqual(step1.pendingDice.dice[0].type, 'd20')
    assert.strictEqual(step1.pendingDice.dice[0].count, 1) // no advantage
    assert.ok(step1.pendingDice.label.includes('Rapier'), 'label should mention weapon')
    assert.ok(step1.context, 'should have context for continuation')
    assert.strictEqual(step1.context.actionType, 'attack')
    assert.strictEqual(step1.context.phase, 'attack_roll')
  })

  it('miss on natural 1 → done: true immediately', () => {
    const state = makeMeleeState()
    const choice = getRapierChoice(state)
    const step1 = StepResolver.beginResolve(state, 'bard1', choice)

    const step2 = StepResolver.continueResolve(step1.context, { rolls: [1] })
    assert.strictEqual(step2.done, true)
    assert.strictEqual(step2.result.hit, false)
    assert.strictEqual(step2.pendingDice, null)
    assert.ok(step2.state, 'should return final state')
  })

  it('miss when roll total < target AC → done: true', () => {
    const state = makeMeleeState()
    const choice = getRapierChoice(state)
    const step1 = StepResolver.beginResolve(state, 'bard1', choice)

    // Bard attack bonus +5, enemy AC 13 → need 8+ to hit
    // Roll 2 + 5 = 7 < 13 → miss
    const step2 = StepResolver.continueResolve(step1.context, { rolls: [2] })
    assert.strictEqual(step2.done, true)
    assert.strictEqual(step2.result.hit, false)
  })

  it('hit → pending damage dice', () => {
    const state = makeMeleeState()
    const choice = getRapierChoice(state)
    const step1 = StepResolver.beginResolve(state, 'bard1', choice)

    // Roll 15 + 5 = 20 >= AC 13 → hit
    const step2 = StepResolver.continueResolve(step1.context, { rolls: [15] })
    assert.strictEqual(step2.done, false)
    assert.ok(step2.pendingDice, 'should request damage dice')
    assert.strictEqual(step2.pendingDice.reason, 'damage')
    assert.strictEqual(step2.pendingDice.dice[0].type, 'd8') // Rapier = 1d8
    assert.strictEqual(step2.pendingDice.dice[0].count, 1)
    assert.strictEqual(step2.context.phase, 'damage')
  })

  it('damage resolves attack (no concentration) → done: true', () => {
    const state = makeMeleeState()
    const choice = getRapierChoice(state)
    const step1 = StepResolver.beginResolve(state, 'bard1', choice)

    // Hit
    const step2 = StepResolver.continueResolve(step1.context, { rolls: [15] })
    // Provide damage: rolled 6 + bonus 2 = 8
    const step3 = StepResolver.continueResolve(step2.context, { rolls: [6] })

    assert.strictEqual(step3.done, true)
    assert.strictEqual(step3.result.hit, true)
    assert.strictEqual(step3.result.damage, 8)  // 6 + 2 damageBonus
    assert.strictEqual(step3.pendingDice, null)

    // Verify target HP reduced
    const target = step3.state.getCombatant('enemy1')
    assert.strictEqual(target.currentHP, 33 - 8)  // 33 - 8 = 25
  })

  it('natural 20 → crit doubles damage dice count', () => {
    const state = makeMeleeState()
    const choice = getRapierChoice(state)
    const step1 = StepResolver.beginResolve(state, 'bard1', choice)

    // Natural 20 = crit
    const step2 = StepResolver.continueResolve(step1.context, { rolls: [20] })
    assert.strictEqual(step2.done, false)
    assert.strictEqual(step2.pendingDice.reason, 'damage')
    assert.strictEqual(step2.pendingDice.dice[0].count, 2) // 1d8 → 2d8 on crit
  })

  it('crit damage: 2d8 + bonus', () => {
    const state = makeMeleeState()
    const choice = getRapierChoice(state)
    const step1 = StepResolver.beginResolve(state, 'bard1', choice)

    // Crit
    const step2 = StepResolver.continueResolve(step1.context, { rolls: [20] })
    // Provide 2d8: [5, 7] + bonus 2 = 14
    const step3 = StepResolver.continueResolve(step2.context, { rolls: [5, 7] })

    assert.strictEqual(step3.done, true)
    assert.strictEqual(step3.result.damage, 14)
    assert.strictEqual(step3.result.crit, true)
  })
})

// ── Concentration Save Chain ─────────────────────────────────────────────────

describe('StepResolver — concentration save chain', () => {
  function makeConcentratingState() {
    return new GameState({
      combatants: [
        makeBard(),
        makeEnemy({
          position: { x: 1, y: 0 },
          concentrating: 'Hold Person',
          concentrationRoundsRemaining: 3,
          currentHP: 33,
        }),
      ],
      initiativeOrder: ['bard1', 'enemy1'],
    })
  }

  it('damage to concentrating target → pending concentration_save', () => {
    const state = makeConcentratingState()
    const choice = getRapierChoice(state)
    const step1 = StepResolver.beginResolve(state, 'bard1', choice)
    // Hit
    const step2 = StepResolver.continueResolve(step1.context, { rolls: [15] })
    // Damage: 6 + 2 = 8
    const step3 = StepResolver.continueResolve(step2.context, { rolls: [6] })

    assert.strictEqual(step3.done, false, 'should not be done — concentration save needed')
    assert.ok(step3.pendingDice, 'should have pending concentration save')
    assert.strictEqual(step3.pendingDice.reason, 'concentration_save')
    assert.strictEqual(step3.pendingDice.dice[0].type, 'd20')
    assert.ok(step3.pendingDice.label.includes('concentration'), 'label should mention concentration')
  })

  it('concentration save success → target keeps concentration', () => {
    const state = makeConcentratingState()
    const choice = getRapierChoice(state)
    const step1 = StepResolver.beginResolve(state, 'bard1', choice)
    const step2 = StepResolver.continueResolve(step1.context, { rolls: [15] })
    const step3 = StepResolver.continueResolve(step2.context, { rolls: [6] })

    // DC = max(10, floor(8/2)) = 10. Save bonus = con save = 2 (from makeEnemy defaults)
    // Roll 12 + 2 = 14 >= 10 → success
    const step4 = StepResolver.continueResolve(step3.context, { rolls: [12] })

    assert.strictEqual(step4.done, true)
    const target = step4.state.getCombatant('enemy1')
    assert.strictEqual(target.concentrating, 'Hold Person', 'should still concentrate')
  })

  it('concentration save failure → target loses concentration', () => {
    const state = makeConcentratingState()
    const choice = getRapierChoice(state)
    const step1 = StepResolver.beginResolve(state, 'bard1', choice)
    const step2 = StepResolver.continueResolve(step1.context, { rolls: [15] })
    const step3 = StepResolver.continueResolve(step2.context, { rolls: [6] })

    // Roll 3 + 2 = 5 < 10 → fail
    const step4 = StepResolver.continueResolve(step3.context, { rolls: [3] })

    assert.strictEqual(step4.done, true)
    const target = step4.state.getCombatant('enemy1')
    assert.strictEqual(target.concentrating, null, 'should have lost concentration')
  })
})

// ── Multiattack Chain ────────────────────────────────────────────────────────

describe('StepResolver — multiattack', () => {
  it('beginResolve returns attack_roll for first attack', () => {
    const state = makeMultiattackState()
    const choice = getMultiattackChoice(state)
    const step1 = StepResolver.beginResolve(state, 'brute1', choice)

    assert.strictEqual(step1.done, false)
    assert.strictEqual(step1.pendingDice.reason, 'attack_roll')
    assert.ok(step1.pendingDice.label.includes('attack 1/'), 'label should show attack count')
    assert.strictEqual(step1.context.actionType, 'multiattack')
  })

  it('two-hit multiattack chains through all attacks', () => {
    const state = makeMultiattackState()
    const choice = getMultiattackChoice(state)

    // Attack 1: attack roll
    const s1 = StepResolver.beginResolve(state, 'brute1', choice)
    assert.strictEqual(s1.done, false)
    assert.strictEqual(s1.pendingDice.reason, 'attack_roll')

    // Attack 1: hit (roll 15 + 6 attack bonus = 21 vs AC 15)
    const s2 = StepResolver.continueResolve(s1.context, { rolls: [15] })
    assert.strictEqual(s2.done, false)
    assert.strictEqual(s2.pendingDice.reason, 'damage')

    // Attack 1: damage (roll 8 + 4 = 12)
    const s3 = StepResolver.continueResolve(s2.context, { rolls: [8] })

    // Should continue to attack 2 (target still alive: 45 - 12 = 33 HP)
    assert.strictEqual(s3.done, false)
    assert.strictEqual(s3.pendingDice.reason, 'attack_roll')
    assert.ok(s3.pendingDice.label.includes('attack 2/'), 'should be attack 2')

    // Attack 2: hit
    const s4 = StepResolver.continueResolve(s3.context, { rolls: [15] })
    assert.strictEqual(s4.done, false)
    assert.strictEqual(s4.pendingDice.reason, 'damage')

    // Attack 2: damage (roll 10 + 4 = 14)
    const s5 = StepResolver.continueResolve(s4.context, { rolls: [10] })

    // Should be done after all attacks
    assert.strictEqual(s5.done, true)
    assert.strictEqual(s5.result.type, 'multiattack')
    assert.strictEqual(s5.result.totalHits, 2)
    assert.strictEqual(s5.result.totalDamage, 26) // 12 + 14

    // Verify target HP
    const target = s5.state.getCombatant('bard1')
    assert.strictEqual(target.currentHP, 45 - 26) // 45 - 26 = 19
  })

  it('multiattack stops if target dies', () => {
    // Low-HP bard: will die from first hit
    const state = new GameState({
      combatants: [
        makeBard({ currentHP: 5, maxHP: 45, position: { x: 0, y: 0 } }),
        makeBrute({ position: { x: 1, y: 0 }, multiattack: 3 }),
      ],
      initiativeOrder: ['brute1', 'bard1'],
    })
    const choice = getMultiattackChoice(state)

    // Attack 1: hit
    const s1 = StepResolver.beginResolve(state, 'brute1', choice)
    const s2 = StepResolver.continueResolve(s1.context, { rolls: [15] })

    // Attack 1: damage — 10 + 4 = 14 > 5 HP → target dies
    const s3 = StepResolver.continueResolve(s2.context, { rolls: [10] })

    // Should be done — no more attacks against dead target
    assert.strictEqual(s3.done, true)
    assert.strictEqual(s3.result.type, 'multiattack')
    assert.strictEqual(s3.result.totalHits, 1)

    const target = s3.state.getCombatant('bard1')
    assert.strictEqual(target.currentHP, 0)
  })

  it('multiattack miss → continues to next attack', () => {
    const state = makeMultiattackState()
    const choice = getMultiattackChoice(state)

    // Attack 1: miss (natural 1)
    const s1 = StepResolver.beginResolve(state, 'brute1', choice)
    const s2 = StepResolver.continueResolve(s1.context, { rolls: [1] })

    // Should continue to attack 2 (miss doesn't end multiattack)
    assert.strictEqual(s2.done, false)
    assert.strictEqual(s2.pendingDice.reason, 'attack_roll')
    assert.ok(s2.pendingDice.label.includes('attack 2/'), 'should be attack 2')
  })
})

// ── Advantage / Disadvantage ─────────────────────────────────────────────────

describe('StepResolver — advantage / disadvantage', () => {
  it('attack vs dodging target → no advantage (disadvantage handled)', () => {
    const state = new GameState({
      combatants: [
        makeBard(),
        makeEnemy({ position: { x: 1, y: 0 }, conditions: ['dodging'] }),
      ],
      initiativeOrder: ['bard1', 'enemy1'],
    })
    const choice = getRapierChoice(state)
    const step1 = StepResolver.beginResolve(state, 'bard1', choice)

    // Should have 2 dice for disadvantage
    assert.strictEqual(step1.pendingDice.dice[0].count, 2)
    assert.strictEqual(step1.pendingDice.advantage, 'disadvantage')
  })

  it('attack vs faerie fired target → advantage', () => {
    const state = new GameState({
      combatants: [
        makeBard(),
        makeEnemy({ position: { x: 1, y: 0 }, conditions: ['faerie_fire'] }),
      ],
      initiativeOrder: ['bard1', 'enemy1'],
    })
    const choice = getRapierChoice(state)
    const step1 = StepResolver.beginResolve(state, 'bard1', choice)

    assert.strictEqual(step1.pendingDice.dice[0].count, 2)
    assert.strictEqual(step1.pendingDice.advantage, 'advantage')
  })

  it('advantage: takes higher of two d20 rolls', () => {
    const advDisadv = { hasAdv: true, hasDisadv: false }
    assert.strictEqual(StepResolver._interpretD20([5, 18], advDisadv), 18)
    assert.strictEqual(StepResolver._interpretD20([18, 5], advDisadv), 18)
  })

  it('disadvantage: takes lower of two d20 rolls', () => {
    const advDisadv = { hasAdv: false, hasDisadv: true }
    assert.strictEqual(StepResolver._interpretD20([5, 18], advDisadv), 5)
    assert.strictEqual(StepResolver._interpretD20([18, 5], advDisadv), 5)
  })

  it('normal: takes first roll', () => {
    const advDisadv = { hasAdv: false, hasDisadv: false }
    assert.strictEqual(StepResolver._interpretD20([12, 7], advDisadv), 12)
  })
})

// ── State Serialization ──────────────────────────────────────────────────────

describe('StepResolver — state serialization', () => {
  it('round-trip serialize/deserialize preserves combatants', () => {
    const state = makeMeleeState()
    const serialized = StepResolver._serializeState(state)
    const restored = StepResolver._deserializeState(serialized)

    const bard = restored.getCombatant('bard1')
    const enemy = restored.getCombatant('enemy1')
    assert.ok(bard, 'bard should exist in restored state')
    assert.ok(enemy, 'enemy should exist in restored state')
    assert.strictEqual(bard.currentHP, 45)
    assert.strictEqual(enemy.currentHP, 33)
    assert.strictEqual(bard.ac, 15)
    assert.strictEqual(enemy.ac, 13)
  })

  it('round-trip preserves initiative order', () => {
    const state = makeMeleeState()
    const serialized = StepResolver._serializeState(state)
    const restored = StepResolver._deserializeState(serialized)

    assert.deepStrictEqual(restored.initiativeOrder, ['bard1', 'enemy1'])
  })
})

// ── Dice Request Metadata ────────────────────────────────────────────────────

describe('StepResolver — dice request metadata', () => {
  it('attack_roll pendingDice includes targetAC', () => {
    const state = makeMeleeState()
    const choice = getRapierChoice(state)
    const step1 = StepResolver.beginResolve(state, 'bard1', choice)

    assert.strictEqual(step1.pendingDice.targetAC, 13)
  })

  it('attack_roll pendingDice includes modifier (attack bonus)', () => {
    const state = makeMeleeState()
    const choice = getRapierChoice(state)
    const step1 = StepResolver.beginResolve(state, 'bard1', choice)

    assert.strictEqual(step1.pendingDice.modifier, 5)  // Rapier attackBonus
  })

  it('damage pendingDice includes modifier (damage bonus)', () => {
    const state = makeMeleeState()
    const choice = getRapierChoice(state)
    const step1 = StepResolver.beginResolve(state, 'bard1', choice)
    const step2 = StepResolver.continueResolve(step1.context, { rolls: [15] })

    assert.strictEqual(step2.pendingDice.modifier, 2)  // Rapier damageBonus
  })

  it('pendingDice.owner is the actor for attacks', () => {
    const state = makeMeleeState()
    const choice = getRapierChoice(state)
    const step1 = StepResolver.beginResolve(state, 'bard1', choice)

    assert.strictEqual(step1.pendingDice.owner, 'bard1')
  })

  it('concentration_save owner is the target, not the attacker', () => {
    const state = new GameState({
      combatants: [
        makeBard(),
        makeEnemy({
          position: { x: 1, y: 0 },
          concentrating: 'Hold Person',
          concentrationRoundsRemaining: 3,
        }),
      ],
      initiativeOrder: ['bard1', 'enemy1'],
    })
    const choice = getRapierChoice(state)
    const step1 = StepResolver.beginResolve(state, 'bard1', choice)
    const step2 = StepResolver.continueResolve(step1.context, { rolls: [15] })
    const step3 = StepResolver.continueResolve(step2.context, { rolls: [6] })

    assert.strictEqual(step3.pendingDice.owner, 'enemy1')
  })

  it('diceRequests accumulate through the chain', () => {
    const state = makeMeleeState()
    const choice = getRapierChoice(state)
    const step1 = StepResolver.beginResolve(state, 'bard1', choice)
    assert.strictEqual(step1.diceRequests.length, 0, 'no dice rolled yet at start')

    const step2 = StepResolver.continueResolve(step1.context, { rolls: [15] })
    assert.strictEqual(step2.diceRequests.length, 1, 'one dice request after attack roll')
    assert.strictEqual(step2.diceRequests[0].reason, 'attack_roll')

    const step3 = StepResolver.continueResolve(step2.context, { rolls: [6] })
    assert.ok(step3.diceRequests.length >= 2, 'accumulated dice requests by end')
  })
})

// ── _extractDiceFromResult helper ────────────────────────────────────────────

describe('StepResolver — _extractDiceFromResult', () => {
  it('extracts attack_roll from result', () => {
    const result = { natural: 17, roll: 22, hit: true, crit: false }
    const extracted = StepResolver._extractDiceFromResult(result)
    assert.ok(extracted.some(d => d.reason === 'attack_roll'))
  })

  it('extracts damage from result', () => {
    const result = { damage: 12, damageRolls: [5, 7], crit: false }
    const extracted = StepResolver._extractDiceFromResult(result)
    assert.ok(extracted.some(d => d.reason === 'damage'))
  })

  it('extracts saving throws from result', () => {
    const result = {
      saves: [
        { name: 'Goblin', total: 8, dc: 14, success: false },
        { name: 'Orc', total: 17, dc: 14, success: true },
      ],
    }
    const extracted = StepResolver._extractDiceFromResult(result)
    const saves = extracted.filter(d => d.reason === 'saving_throw')
    assert.strictEqual(saves.length, 2)
  })

  it('returns empty array for empty result', () => {
    assert.deepStrictEqual(StepResolver._extractDiceFromResult({}), [])
  })
})
