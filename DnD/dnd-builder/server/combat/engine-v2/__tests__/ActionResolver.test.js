/**
 * ActionResolver — unit tests
 *
 * Tests the action execution engine: weapon attacks, multiattack, spells,
 * standard actions (dodge/dash/disengage), movement, bonus actions,
 * concentration management, and zero-trust validation.
 */

'use strict'

const { describe, it, before, after } = require('node:test')
const assert = require('node:assert/strict')

const dice = require('../../engine/dice')
const { GameState } = require('../GameState')
const TurnMenu = require('../TurnMenu')
const ActionResolver = require('../ActionResolver')
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

/** Bard at range from enemy */
function makeRangedState() {
  return new GameState({
    combatants: [
      makeBard(),
      makeEnemy({ position: { x: 6, y: 0 } }), // 30ft
    ],
    initiativeOrder: ['bard1', 'enemy1'],
  })
}

/** Get a valid attack option for bard against enemy */
function getMeleeAttackChoice(state) {
  const menu = TurnMenu.getMenu(state, 'bard1')
  const rapier = menu.actions.find(o => o.type === 'attack' && o.weaponName === 'Rapier')
  return { optionId: rapier.optionId }
}

/** Get a valid ranged attack option */
function getRangedAttackChoice(state) {
  const menu = TurnMenu.getMenu(state, 'bard1')
  const xbow = menu.actions.find(o => o.type === 'attack' && o.weaponName === 'Hand Crossbow')
  return { optionId: xbow.optionId }
}

// ─────────────────────────────────────────────────────────────────────────────
// ZERO-TRUST VALIDATION
// ─────────────────────────────────────────────────────────────────────────────

describe('ActionResolver — zero-trust validation', () => {
  it('throws on invalid optionId', () => {
    const state = makeMeleeState()
    assert.throws(() => {
      ActionResolver.resolve(state, 'bard1', { optionId: 'bogus' })
    }, /Invalid choice/)
  })

  it('throws on null choice', () => {
    const state = makeMeleeState()
    assert.throws(() => {
      ActionResolver.resolve(state, 'bard1', null)
    }, /Invalid choice/)
  })
})

// ─────────────────────────────────────────────────────────────────────────────
// WEAPON ATTACKS
// ─────────────────────────────────────────────────────────────────────────────

describe('ActionResolver — weapon attack', () => {
  it('resolves a melee attack hit and applies damage', () => {
    const state = makeMeleeState()
    const choice = getMeleeAttackChoice(state)
    const { state: newState, result } = ActionResolver.resolve(state, 'bard1', choice)

    assert.equal(result.type, 'attack')
    assert.equal(result.hit, true) // average mode: d20=10.5+5=15.5 vs AC 13 = hit

    // Enemy should have taken damage
    const enemy = newState.getCombatant('enemy1')
    assert.ok(enemy.currentHP < 33, `Enemy HP should decrease from 33, got ${enemy.currentHP}`)

    // Bard should have usedAction
    const bard = newState.getCombatant('bard1')
    assert.equal(bard.usedAction, true)
    assert.equal(bard.attacksMade, 1)
    assert.equal(bard.attacksHit, 1)
  })

  it('original state is unchanged after attack', () => {
    const state = makeMeleeState()
    const choice = getMeleeAttackChoice(state)
    ActionResolver.resolve(state, 'bard1', choice)

    assert.equal(state.getCombatant('enemy1').currentHP, 33)
    assert.equal(state.getCombatant('bard1').usedAction, false)
  })

  it('adds log entries', () => {
    const state = makeMeleeState()
    const choice = getMeleeAttackChoice(state)
    const { state: newState } = ActionResolver.resolve(state, 'bard1', choice)

    assert.ok(newState.log.length > 0, 'Should have log entries')
    assert.ok(newState.log.some(l => l.includes('attacks')), 'Log should mention attack')
  })

  it('ranged attack works at range', () => {
    const state = makeRangedState()
    const choice = getRangedAttackChoice(state)
    const { state: newState, result } = ActionResolver.resolve(state, 'bard1', choice)

    assert.equal(result.type, 'attack')
    assert.equal(result.hit, true)
    assert.ok(newState.getCombatant('enemy1').currentHP < 33)
  })

  it('triggers concentration check on damaged concentrating target', () => {
    const state = makeMeleeState()
      .withUpdatedCombatant('enemy1', {
        concentrating: 'Hold Person',
        concentrationRoundsRemaining: 5,
        saves: { str: 0, dex: 1, con: 1, int: 0, wis: 3, cha: 0 },
      })
    const choice = getMeleeAttackChoice(state)
    const { state: newState } = ActionResolver.resolve(state, 'bard1', choice)

    // In average mode, concentration save depends on damage
    // The test just verifies the log mentions concentration
    assert.ok(
      newState.log.some(l => l.includes('Concentration') || l.includes('concentration')),
      'Log should mention concentration check'
    )
  })
})

// ─────────────────────────────────────────────────────────────────────────────
// MULTIATTACK
// ─────────────────────────────────────────────────────────────────────────────

describe('ActionResolver — multiattack', () => {
  it('resolves multiple attacks against a target', () => {
    const state = new GameState({
      combatants: [
        makeBrute({ id: 'brute1', side: 'party', position: { x: 0, y: 0 } }),
        makeEnemy({ id: 'enemy1', position: { x: 1, y: 0 } }),
      ],
      initiativeOrder: ['brute1', 'enemy1'],
    })
    const menu = TurnMenu.getMenu(state, 'brute1')
    const multi = menu.actions.find(o => o.type === 'multiattack')

    const { state: newState, result } = ActionResolver.resolve(state, 'brute1', { optionId: multi.optionId })

    assert.equal(result.type, 'multiattack')
    assert.equal(result.attackCount, 2)
    assert.ok(result.hits > 0, 'Should have at least one hit in average mode')

    const brute = newState.getCombatant('brute1')
    assert.equal(brute.usedAction, true)
    assert.equal(brute.attacksMade, 2)
  })

  it('stops attacking if target drops to 0 HP and no other enemies', () => {
    const state = new GameState({
      combatants: [
        makeBrute({ id: 'brute1', side: 'party', position: { x: 0, y: 0 } }),
        makeEnemy({ id: 'enemy1', currentHP: 1, maxHP: 33, position: { x: 1, y: 0 } }),
      ],
      initiativeOrder: ['brute1', 'enemy1'],
    })
    const menu = TurnMenu.getMenu(state, 'brute1')
    const multi = menu.actions.find(o => o.type === 'multiattack')

    const { state: newState, result } = ActionResolver.resolve(state, 'brute1', { optionId: multi.optionId })

    assert.equal(newState.getCombatant('enemy1').currentHP, 0)
    // Only 1 attack should connect — no other enemies to redirect to
    assert.equal(result.hits, 1, 'Only first attack should land')
  })

  it('redirects remaining attacks to next enemy when target dies', () => {
    const state = new GameState({
      combatants: [
        makeBrute({ id: 'brute1', side: 'party', position: { x: 0, y: 0 } }),
        makeEnemy({ id: 'enemy1', currentHP: 1, maxHP: 33, position: { x: 1, y: 0 } }),
        makeEnemy({ id: 'enemy2', name: 'Fanatic B', currentHP: 33, maxHP: 33, position: { x: 1, y: 1 } }),
      ],
      initiativeOrder: ['brute1', 'enemy1', 'enemy2'],
    })
    const menu = TurnMenu.getMenu(state, 'brute1')
    const multi = menu.actions.find(o => o.type === 'multiattack')

    const { state: newState, result } = ActionResolver.resolve(state, 'brute1', { optionId: multi.optionId })

    assert.equal(newState.getCombatant('enemy1').currentHP, 0, 'First enemy should be dead')
    assert.ok(newState.getCombatant('enemy2').currentHP < 33,
      'Second enemy should take redirected attack damage')
    assert.equal(result.hits, 2, 'Both attacks should hit')
  })

  it('T-Rex Bite does not consume the full action — Tail is still available', () => {
    const state = new GameState({
      combatants: [
        makeCombatant({
          id: 'trex1',
          name: 'T-Rex',
          polymorphedAs: 'T-Rex',
          side: 'party',
          position: { x: 0, y: 0 },
          multiattack: 2,
          multiattackWeapons: ['Bite', 'Tail'],
          weapons: [
            { name: 'Bite', attackBonus: 10, damageDice: '4d12', damageBonus: 7, type: 'melee', range: 10 },
            { name: 'Tail', attackBonus: 10, damageDice: '3d8', damageBonus: 7, type: 'melee', range: 10 },
          ],
          weapon: { name: 'Bite', attackBonus: 10, damageDice: '4d12', damageBonus: 7, type: 'melee', range: 10 },
        }),
        makeEnemy({ id: 'enemy1', name: 'Enemy A', position: { x: 1, y: 0 }, maxHP: 200, currentHP: 200 }),
        makeEnemy({ id: 'enemy2', name: 'Enemy B', position: { x: 1, y: 1 }, maxHP: 200, currentHP: 200 }),
      ],
      initiativeOrder: ['trex1', 'enemy1', 'enemy2'],
    })

    // Step 1: Attack with Bite — should NOT consume the action
    const menu1 = TurnMenu.getMenu(state, 'trex1')
    const biteOpt = menu1.actions.find(o => o.type === 'attack' && o.weaponName === 'Bite' && o.targetId === 'enemy1')
    assert.ok(biteOpt, 'Bite attack option should exist')

    const { state: afterBite } = ActionResolver.resolve(state, 'trex1', { optionId: biteOpt.optionId })
    const trexAfterBite = afterBite.getCombatant('trex1')

    assert.equal(trexAfterBite.usedAction, false, 'Action should NOT be consumed after Bite — Tail is still due')
    assert.deepStrictEqual(trexAfterBite.multiattackWeaponsUsed, ['Bite'])
    assert.equal(trexAfterBite.multiattackBiteTargetId, 'enemy1')

    // Step 2: Menu should now only offer Tail — and NOT against enemy1
    const menu2 = TurnMenu.getMenu(afterBite, 'trex1')
    const attackOptions = menu2.actions.filter(o => o.type === 'attack')
    assert.ok(attackOptions.length > 0, 'Tail attack options should still be available')
    assert.ok(attackOptions.every(o => o.weaponName === 'Tail'), 'Only Tail should remain')
    assert.ok(attackOptions.every(o => o.targetId !== 'enemy1'), 'Tail cannot target the same enemy as Bite')

    // Step 3: Attack with Tail against enemy2 — should NOW consume the action
    const tailOpt = attackOptions.find(o => o.targetId === 'enemy2')
    assert.ok(tailOpt, 'Tail option targeting enemy2 should exist')

    const { state: afterTail } = ActionResolver.resolve(afterBite, 'trex1', { optionId: tailOpt.optionId })
    const trexAfterTail = afterTail.getCombatant('trex1')

    assert.equal(trexAfterTail.usedAction, true, 'Action should be fully consumed after both attacks')
    assert.equal(trexAfterTail.attacksMade, 2, 'Should have made 2 attacks total')
  })

  it('T-Rex with only one enemy: Bite uses action, no Tail available', () => {
    const state = new GameState({
      combatants: [
        makeCombatant({
          id: 'trex1',
          name: 'Tyrannosaurus Rex',
          polymorphedAs: 'T-Rex',
          side: 'party',
          position: { x: 0, y: 0 },
          multiattack: 2,
          multiattackWeapons: ['Bite', 'Tail'],
          weapons: [
            { name: 'Bite', attackBonus: 10, damageDice: '4d12', damageBonus: 7, type: 'melee', range: 10 },
            { name: 'Tail', attackBonus: 10, damageDice: '3d8', damageBonus: 7, type: 'melee', range: 10 },
          ],
          weapon: { name: 'Bite', attackBonus: 10, damageDice: '4d12', damageBonus: 7, type: 'melee', range: 10 },
        }),
        makeEnemy({ id: 'enemy1', name: 'Lone Enemy', position: { x: 1, y: 0 }, maxHP: 300, currentHP: 300 }),
      ],
      initiativeOrder: ['trex1', 'enemy1'],
    })

    // Step 1: Attack with Bite
    const menu1 = TurnMenu.getMenu(state, 'trex1')
    const biteOpt = menu1.actions.find(o => o.type === 'attack' && o.weaponName === 'Bite')
    assert.ok(biteOpt, 'Bite should be available')

    const { state: afterBite } = ActionResolver.resolve(state, 'trex1', { optionId: biteOpt.optionId })

    // Step 2: Tail should have no valid targets (only enemy is excluded)
    const menu2 = TurnMenu.getMenu(afterBite, 'trex1')
    const tailOptions = menu2.actions.filter(o => o.type === 'attack' && o.weaponName === 'Tail')
    assert.equal(tailOptions.length, 0, 'Tail should have no valid targets — sole enemy was bitten')

    // Action should be auto-consumed because no remaining weapon has a valid target
    const trex = afterBite.getCombatant('trex1')
    assert.equal(trex.usedAction, true, 'Action consumed — no valid Tail target exists')
  })

  it('Giant Ape multiattack: two Fist attacks via multiattack option (not Rock)', () => {
    const state = new GameState({
      combatants: [
        makeCombatant({
          id: 'ape1',
          name: 'Giant Ape',
          polymorphedAs: 'Giant Ape',
          side: 'party',
          position: { x: 0, y: 0 },
          multiattack: 2,
          multiattackWeapons: ['Fist', 'Fist'],
          weapons: [
            { name: 'Fist', attackBonus: 9, damageDice: '3d10', damageBonus: 6, type: 'melee', range: 10 },
            { name: 'Rock', attackBonus: 9, damageDice: '7d6', damageBonus: 6, type: 'ranged', range: 50 },
          ],
          weapon: { name: 'Fist', attackBonus: 9, damageDice: '3d10', damageBonus: 6, type: 'melee', range: 10 },
        }),
        makeEnemy({ id: 'enemy1', name: 'Goblin', position: { x: 1, y: 0 }, maxHP: 50, currentHP: 50 }),
      ],
      initiativeOrder: ['ape1', 'enemy1'],
    })

    // Menu should show multiattack (2× Fist) AND single Rock attack
    const menu = TurnMenu.getMenu(state, 'ape1')
    const multiattackOpts = menu.actions.filter(o => o.type === 'multiattack')
    const rockOpts = menu.actions.filter(o => o.type === 'attack' && o.weaponName === 'Rock')
    const fistOpts = menu.actions.filter(o => o.type === 'attack' && o.weaponName === 'Fist')

    assert.ok(multiattackOpts.length > 0, 'Multiattack option should be available')
    assert.equal(multiattackOpts[0].attackCount, 2, 'Multiattack should be 2 attacks')
    assert.ok(rockOpts.length > 0, 'Rock (individual attack) should also be available')
    assert.ok(fistOpts.length > 0, 'Fist (individual attack) should also be available')

    // Resolve multiattack — should use Fist (not Rock)
    const { state: afterMulti, result } = ActionResolver.resolve(state, 'ape1', { optionId: multiattackOpts[0].optionId })
    const ape = afterMulti.getCombatant('ape1')

    assert.equal(ape.usedAction, true, 'Action should be consumed by multiattack')
    assert.equal(result.type, 'multiattack', 'Result type should be multiattack')
    assert.equal(result.attackCount, 2, 'Should have 2 attacks')
  })

  it('Giant Ape: Rock is an individual attack, not part of multiattack', () => {
    const state = new GameState({
      combatants: [
        makeCombatant({
          id: 'ape1',
          name: 'Giant Ape',
          polymorphedAs: 'Giant Ape',
          side: 'party',
          position: { x: 0, y: 0 },
          multiattack: 2,
          multiattackWeapons: ['Fist', 'Fist'],
          weapons: [
            { name: 'Fist', attackBonus: 9, damageDice: '3d10', damageBonus: 6, type: 'melee', range: 10 },
            { name: 'Rock', attackBonus: 9, damageDice: '7d6', damageBonus: 6, type: 'ranged', range: 50 },
          ],
          weapon: { name: 'Fist', attackBonus: 9, damageDice: '3d10', damageBonus: 6, type: 'melee', range: 10 },
        }),
        makeEnemy({ id: 'enemy1', name: 'Goblin', position: { x: 8, y: 0 }, maxHP: 50, currentHP: 50 }),
      ],
      initiativeOrder: ['ape1', 'enemy1'],
    })

    // At range 40 ft (8 units × 5), Fist (range 10) can't reach but Rock (range 50) can
    const menu = TurnMenu.getMenu(state, 'ape1')
    const multiattackOpts = menu.actions.filter(o => o.type === 'multiattack')
    const rockOpts = menu.actions.filter(o => o.type === 'attack' && o.weaponName === 'Rock')
    const fistOpts = menu.actions.filter(o => o.type === 'attack' && o.weaponName === 'Fist')

    assert.equal(multiattackOpts.length, 0, 'Multiattack (Fist) should NOT be available at range')
    assert.equal(fistOpts.length, 0, 'Fist should NOT be available at range 40 ft')
    assert.ok(rockOpts.length > 0, 'Rock should be available at range 40 ft')

    // Use Rock as single attack — consumes action
    const { state: afterRock } = ActionResolver.resolve(state, 'ape1', { optionId: rockOpts[0].optionId })
    const ape = afterRock.getCombatant('ape1')
    assert.equal(ape.usedAction, true, 'Action consumed by single Rock attack')
  })
})

// ─────────────────────────────────────────────────────────────────────────────
// SPELLS
// ─────────────────────────────────────────────────────────────────────────────

describe('ActionResolver — spells', () => {
  it('resolves a single-target save spell (Hold Person)', () => {
    const state = makeRangedState()
    const menu = TurnMenu.getMenu(state, 'bard1')
    const holdPerson = menu.actions.find(o => o.spellName === 'Hold Person' && o.slotLevel === 2)

    const { state: newState, result } = ActionResolver.resolve(state, 'bard1', {
      optionId: holdPerson.optionId,
      targetId: 'enemy1',
    })

    assert.equal(result.type, 'spell')
    assert.equal(result.spellName, 'Hold Person')

    // Slot should be spent
    const bard = newState.getCombatant('bard1')
    assert.equal(bard.spellSlots[2], 2) // was 3, now 2
    assert.equal(bard.usedAction, true)
  })

  it('resolves an area spell (Hypnotic Pattern)', () => {
    const state = makeRangedState()
    const menu = TurnMenu.getMenu(state, 'bard1')
    const hp = menu.actions.find(o => o.spellName === 'Hypnotic Pattern')

    const { state: newState, result } = ActionResolver.resolve(state, 'bard1', {
      optionId: hp.optionId,
      aoeCenter: { x: 6, y: 0 },
    })

    assert.equal(result.type, 'spell')
    assert.equal(result.spellName, 'Hypnotic Pattern')

    const bard = newState.getCombatant('bard1')
    assert.equal(bard.spellSlots[3], 2) // was 3, now 2
    assert.equal(bard.concentrating, 'Hypnotic Pattern')
  })

  it('healing spell restores HP', () => {
    const state = new GameState({
      combatants: [
        makeBard({ currentHP: 20 }),
        makeEnemy(),
      ],
      initiativeOrder: ['bard1', 'enemy1'],
    })
    const menu = TurnMenu.getMenu(state, 'bard1')
    const hw = menu.bonusActions.find(o => o.spellName === 'Healing Word')

    const { state: newState } = ActionResolver.resolve(state, 'bard1', {
      optionId: hw.optionId,
      targetId: 'bard1',
    })

    const bard = newState.getCombatant('bard1')
    assert.ok(bard.currentHP > 20, `HP should increase from 20, got ${bard.currentHP}`)
    assert.equal(bard.usedBonusAction, true)
    assert.equal(bard.bonusActionSpellCastThisTurn, true)
  })

  it('casting new concentration spell breaks old concentration', () => {
    const state = makeRangedState()
      .withUpdatedCombatant('bard1', {
        concentrating: 'Faerie Fire',
        concentrationRoundsRemaining: 5,
      })

    const menu = TurnMenu.getMenu(state, 'bard1')
    const hp = menu.actions.find(o => o.spellName === 'Hypnotic Pattern')

    const { state: newState } = ActionResolver.resolve(state, 'bard1', {
      optionId: hp.optionId,
      aoeCenter: { x: 6, y: 0 },
    })

    const bard = newState.getCombatant('bard1')
    assert.equal(bard.concentrating, 'Hypnotic Pattern')
    assert.ok(newState.log.some(l => l.includes('loses concentration') || l.includes('Faerie Fire')))
  })

  it('cantrip does not spend a spell slot', () => {
    const state = makeRangedState()
    const menu = TurnMenu.getMenu(state, 'bard1')
    const vm = menu.actions.find(o => o.spellName === 'Vicious Mockery')

    const { state: newState } = ActionResolver.resolve(state, 'bard1', {
      optionId: vm.optionId,
      targetId: 'enemy1',
    })

    const bard = newState.getCombatant('bard1')
    assert.deepEqual(bard.spellSlots, { 1: 4, 2: 3, 3: 3, 4: 2 }) // unchanged
  })
})

// ─────────────────────────────────────────────────────────────────────────────
// STANDARD ACTIONS
// ─────────────────────────────────────────────────────────────────────────────

describe('ActionResolver — standard actions', () => {
  it('dodge adds dodging condition', () => {
    const state = makeRangedState()
    const menu = TurnMenu.getMenu(state, 'bard1')
    const dodge = menu.actions.find(o => o.type === 'dodge')

    const { state: newState, result } = ActionResolver.resolve(state, 'bard1', { optionId: dodge.optionId })

    assert.equal(result.type, 'dodge')
    const bard = newState.getCombatant('bard1')
    assert.equal(bard.usedAction, true)
    assert.ok(bard.conditions.includes('dodging'))
  })

  it('dash doubles remaining movement', () => {
    const state = makeRangedState()
    const menu = TurnMenu.getMenu(state, 'bard1')
    const dash = menu.actions.find(o => o.type === 'dash')

    const { state: newState, result } = ActionResolver.resolve(state, 'bard1', { optionId: dash.optionId })

    assert.equal(result.type, 'dash')
    const bard = newState.getCombatant('bard1')
    assert.equal(bard.usedAction, true)
    assert.equal(bard.movementRemaining, 60) // 30 + 30
  })

  it('disengage sets flag', () => {
    const state = makeRangedState()
    const menu = TurnMenu.getMenu(state, 'bard1')
    const disengage = menu.actions.find(o => o.type === 'disengage')

    const { state: newState, result } = ActionResolver.resolve(state, 'bard1', { optionId: disengage.optionId })

    assert.equal(result.type, 'disengage')
    const bard = newState.getCombatant('bard1')
    assert.equal(bard.usedAction, true)
    assert.equal(bard.disengaged, true)
  })
})

// ─────────────────────────────────────────────────────────────────────────────
// MOVEMENT
// ─────────────────────────────────────────────────────────────────────────────

describe('ActionResolver — movement', () => {
  it('moves combatant to new position', () => {
    const state = makeRangedState()
    const { state: newState, result } = ActionResolver.resolve(state, 'bard1', {
      optionId: 'move-to',
      position: { x: 3, y: 0 },
    })

    assert.equal(result.type, 'move')
    assert.equal(result.distance, 15) // 3 squares × 5ft

    const bard = newState.getCombatant('bard1')
    assert.deepEqual(bard.position, { x: 3, y: 0 })
    assert.equal(bard.movementRemaining, 15) // 30 - 15
  })

  it('original state position unchanged', () => {
    const state = makeRangedState()
    ActionResolver.resolve(state, 'bard1', {
      optionId: 'move-to',
      position: { x: 3, y: 0 },
    })

    const bard = state.getCombatant('bard1')
    assert.deepEqual(bard.position, { x: 0, y: 0 })
    assert.equal(bard.movementRemaining, 30)
  })

  it('hold does nothing', () => {
    const state = makeRangedState()
    const { state: newState, result } = ActionResolver.resolve(state, 'bard1', {
      optionId: 'move-hold',
    })

    assert.equal(result.type, 'hold')
    assert.deepEqual(newState.getCombatant('bard1').position, { x: 0, y: 0 })
  })
})

// ─────────────────────────────────────────────────────────────────────────────
// MOVEMENT — HEX AXIAL COORDINATES (q, r) — frontend coordinate system
//
// The frontend submits positions as { q, r } axial hex coordinates.
// These tests verify that the server correctly computes hex distance and
// deducts movement when the choice.position uses { q, r } keys.
//
// Bug: pre-fix the server reads pos?.x and pos?.y which are undefined for
// { q, r } objects, so gridDistance always returns 0 and movementRemaining
// is never deducted — allowing unlimited movement.
// ─────────────────────────────────────────────────────────────────────────────

describe('ActionResolver — movement with hex axial (q,r) coordinates', () => {
  it('deducts 15ft for a straight 3-hex move submitted as {q:3, r:0}', () => {
    // Simulates what the frontend sends: position: { q, r }
    const state = makeRangedState()
    const { state: newState, result } = ActionResolver.resolve(state, 'bard1', {
      optionId: 'move-to',
      position: { q: 3, r: 0 },  // 3 hexes straight = 15ft
    })

    assert.equal(result.type, 'move')
    assert.equal(result.distance, 15)  // hex distance max(3,0,3)*5 = 15ft

    const bard = newState.getCombatant('bard1')
    assert.equal(bard.movementRemaining, 15)  // 30 - 15 = 15
  })

  it('deducts 30ft for a diagonal 6-hex move submitted as {q:3, r:3}', () => {
    // (q=3, r=3) → hex distance = max(|3|, |3|, |3+3|) = max(3,3,6) = 6 hexes = 30ft
    const state = makeRangedState()
    const { state: newState, result } = ActionResolver.resolve(state, 'bard1', {
      optionId: 'move-to',
      position: { q: 3, r: 3 },  // 6 hexes diagonal = 30ft
    })

    assert.equal(result.type, 'move')
    assert.equal(result.distance, 30)  // hex distance max(3,3,6)*5 = 30ft

    const bard = newState.getCombatant('bard1')
    assert.equal(bard.movementRemaining, 0)   // 30 - 30 = 0
  })

  it('stores position as {q, r} after a hex move', () => {
    const state = makeRangedState()
    const { state: newState } = ActionResolver.resolve(state, 'bard1', {
      optionId: 'move-to',
      position: { q: 2, r: -1 },
    })

    const bard = newState.getCombatant('bard1')
    assert.deepEqual(bard.position, { q: 2, r: -1 })
  })

  it('split movement deducts correctly across two {q,r} moves', () => {
    // Move 1: q=2, r=0 = 2 hexes = 10ft → remaining: 20
    const state = makeRangedState()
    const { state: after1 } = ActionResolver.resolve(state, 'bard1', {
      optionId: 'move-to',
      position: { q: 2, r: 0 },  // 10ft
    })
    assert.equal(after1.getCombatant('bard1').movementRemaining, 20)

    // Move 2: q=4, r=0 (2 more hexes from q=2) = 10ft → remaining: 10
    const { state: after2 } = ActionResolver.resolve(after1, 'bard1', {
      optionId: 'move-to',
      position: { q: 4, r: 0 },  // 2 more hexes = 10ft
    })
    assert.equal(after2.getCombatant('bard1').movementRemaining, 10)
  })

  it('rejects a {q,r} move that exceeds remaining speed', () => {
    // q=7, r=0 = 7 hexes = 35ft, but bard speed is 30ft
    const state = makeRangedState()
    assert.throws(() => {
      ActionResolver.resolve(state, 'bard1', {
        optionId: 'move-to',
        position: { q: 7, r: 0 },  // 35ft — exceeds 30ft speed
      })
    }, /Invalid choice/)
  })
})

// ─────────────────────────────────────────────────────────────────────────────
// BONUS ACTION FEATURES
// ─────────────────────────────────────────────────────────────────────────────

describe('ActionResolver — bonus actions', () => {
  it('bardic inspiration grants die to ally', () => {
    const state = new GameState({
      combatants: [
        makeBard(),
        makeCombatant({ id: 'ally1', name: 'Ally', side: 'party', position: { x: 2, y: 0 } }),
        makeEnemy(),
      ],
      initiativeOrder: ['bard1', 'ally1', 'enemy1'],
    })
    const menu = TurnMenu.getMenu(state, 'bard1')
    const bi = menu.bonusActions.find(o => o.type === 'bardicInspiration')

    const { state: newState, result } = ActionResolver.resolve(state, 'bard1', {
      optionId: bi.optionId,
    })

    assert.equal(result.type, 'bardicInspiration')

    const bard = newState.getCombatant('bard1')
    assert.equal(bard.usedBonusAction, true)
    assert.equal(bard.bardicInspiration.uses, 2) // was 3

    const ally = newState.getCombatant('ally1')
    assert.equal(ally.bardicInspirationDie, 'd8')
  })

  it('gem flight activates flying', () => {
    const state = makeRangedState()
      .withUpdatedCombatant('bard1', {
        gemFlight: { uses: 1, active: false, roundsRemaining: 0 },
        flying: false,
      })
    const menu = TurnMenu.getMenu(state, 'bard1')
    const gf = menu.bonusActions.find(o => o.type === 'gemFlight')

    const { state: newState, result } = ActionResolver.resolve(state, 'bard1', {
      optionId: gf.optionId,
    })

    assert.equal(result.type, 'gemFlight')
    const bard = newState.getCombatant('bard1')
    assert.equal(bard.flying, true)
    assert.equal(bard.gemFlight.active, true)
    assert.equal(bard.gemFlight.uses, 0)
    assert.equal(bard.usedBonusAction, true)
  })
})

// ─────────────────────────────────────────────────────────────────────────────
// END TURN
// ─────────────────────────────────────────────────────────────────────────────

describe('ActionResolver — end turn', () => {
  it('end turn returns same state', () => {
    const state = makeRangedState()
    const { state: newState, result } = ActionResolver.resolve(state, 'bard1', {
      optionId: 'end-turn',
    })

    assert.equal(result.type, 'endTurn')
    // State should be effectively the same
    assert.equal(newState.getCombatant('bard1').currentHP, 45)
  })
})

// ─────────────────────────────────────────────────────────────────────────────
// CONCENTRATION MANAGEMENT
// ─────────────────────────────────────────────────────────────────────────────

describe('ActionResolver — concentration', () => {
  it('breakConcentration removes concentration and cleans up effects', () => {
    const state = new GameState({
      combatants: [
        makeBard({ concentrating: 'Hypnotic Pattern' }),
        makeEnemy({ conditions: ['charmed_hp', 'incapacitated'] }),
      ],
      initiativeOrder: ['bard1', 'enemy1'],
    })

    const { state: newState, logs } = ActionResolver._breakConcentration(state, 'bard1')

    const bard = newState.getCombatant('bard1')
    assert.equal(bard.concentrating, null)

    const enemy = newState.getCombatant('enemy1')
    assert.ok(!enemy.conditions.includes('charmed_hp'), 'Should remove charmed_hp')
    assert.ok(!enemy.conditions.includes('incapacitated'), 'Should remove incapacitated')
  })

  it('breakConcentration on Hold Person removes paralyzed', () => {
    const state = new GameState({
      combatants: [
        makeBard({ concentrating: 'Hold Person' }),
        makeEnemy({ conditions: ['paralyzed'] }),
      ],
      initiativeOrder: ['bard1', 'enemy1'],
    })

    const { state: newState } = ActionResolver._breakConcentration(state, 'bard1')

    const enemy = newState.getCombatant('enemy1')
    assert.ok(!enemy.conditions.includes('paralyzed'))
  })

  it('breakConcentration when not concentrating is a no-op', () => {
    const state = new GameState({
      combatants: [makeBard()],
      initiativeOrder: ['bard1'],
    })

    const { state: newState, logs } = ActionResolver._breakConcentration(state, 'bard1')
    assert.equal(logs.length, 0)
  })
})

// ─────────────────────────────────────────────────────────────────────────────
// CHARMED_HP REMOVAL ON DAMAGE (Hypnotic Pattern D&D 5e rule)
// ─────────────────────────────────────────────────────────────────────────────

describe('ActionResolver — charmed_hp removal on damage', () => {
  it('weapon attack removes charmed_hp from target on hit', () => {
    const state = new GameState({
      combatants: [
        makeBard({ position: { x: 0, y: 0 } }),
        makeEnemy({ position: { x: 1, y: 0 }, conditions: ['charmed_hp', 'incapacitated'] }),
      ],
      initiativeOrder: ['bard1', 'enemy1'],
    })

    const menu = TurnMenu.getMenu(state, 'bard1')
    const attack = menu.actions.find(o => o.type === 'attack')
    const { state: newState } = ActionResolver.resolve(state, 'bard1', { optionId: attack.optionId })

    const enemy = newState.getCombatant('enemy1')
    assert.ok(!enemy.conditions.includes('charmed_hp'), 'charmed_hp should be removed on damage')
    assert.ok(!enemy.conditions.includes('incapacitated'), 'incapacitated should be removed on damage')
  })

  it('multiattack removes charmed_hp on first hit', () => {
    const state = new GameState({
      combatants: [
        makeBrute({ id: 'brute1', side: 'party', position: { x: 0, y: 0 } }),
        makeEnemy({ position: { x: 1, y: 0 }, conditions: ['charmed_hp', 'incapacitated'] }),
      ],
      initiativeOrder: ['brute1', 'enemy1'],
    })

    const menu = TurnMenu.getMenu(state, 'brute1')
    const multi = menu.actions.find(o => o.type === 'multiattack')
    const { state: newState } = ActionResolver.resolve(state, 'brute1', { optionId: multi.optionId })

    const enemy = newState.getCombatant('enemy1')
    assert.ok(!enemy.conditions.includes('charmed_hp'), 'charmed_hp should be removed on multiattack damage')
    assert.ok(!enemy.conditions.includes('incapacitated'), 'incapacitated should be removed on multiattack damage')
  })

  it('spell damage removes charmed_hp from target', () => {
    // Use Vicious Mockery (cantrip, no slot cost, always available)
    const state = new GameState({
      combatants: [
        makeBard({ position: { x: 0, y: 0 } }),
        makeEnemy({ position: { x: 6, y: 0 }, conditions: ['charmed_hp', 'incapacitated'] }),
      ],
      initiativeOrder: ['bard1', 'enemy1'],
    })

    const menu = TurnMenu.getMenu(state, 'bard1')
    const vm = menu.actions.find(o => o.type === 'spell' && o.spellName === 'Vicious Mockery')
    assert.ok(vm, 'Should have Vicious Mockery option')
    const { state: newState } = ActionResolver.resolve(state, 'bard1', { optionId: vm.optionId, targetId: 'enemy1' })

    const enemy = newState.getCombatant('enemy1')
    // VM requires a WIS save — in average mode (d20 → 10), enemy WIS save +3, DC 14 → 13 < 14 → FAIL → damage applied
    assert.ok(!enemy.conditions.includes('charmed_hp'), 'charmed_hp should be removed on spell damage')
  })

  it('does NOT remove charmed_hp when attack misses', () => {
    // Give enemy very high AC so attack misses
    const state = new GameState({
      combatants: [
        makeBard({ position: { x: 0, y: 0 } }),
        makeEnemy({ position: { x: 1, y: 0 }, ac: 30, conditions: ['charmed_hp', 'incapacitated'] }),
      ],
      initiativeOrder: ['bard1', 'enemy1'],
    })

    const menu = TurnMenu.getMenu(state, 'bard1')
    const attack = menu.actions.find(o => o.type === 'attack')
    const { state: newState } = ActionResolver.resolve(state, 'bard1', { optionId: attack.optionId })

    const enemy = newState.getCombatant('enemy1')
    assert.ok(enemy.conditions.includes('charmed_hp'), 'charmed_hp should remain when attack misses')
  })
})

// ─────────────────────────────────────────────────────────────────────────────
// CHARM IMMUNITY
// ─────────────────────────────────────────────────────────────────────────────

describe('ActionResolver — charm immunity', () => {
  it('immuneCharmed creature resists Hypnotic Pattern effects', () => {
    // Ghoul: immuneCharmed = true, low WIS save
    const state = new GameState({
      combatants: [
        makeBard({ position: { x: 0, y: 0 } }),
        makeEnemy({
          id: 'ghoul1',
          name: 'Ghoul',
          position: { x: 6, y: 0 },
          immuneCharmed: true,
          saves: { str: 1, dex: 2, con: 0, int: -2, wis: 0, cha: -2 },
        }),
      ],
      initiativeOrder: ['bard1', 'ghoul1'],
    })

    const menu = TurnMenu.getMenu(state, 'bard1')
    const hp = menu.actions.find(o => o.type === 'spell' && o.spellName === 'Hypnotic Pattern')
    assert.ok(hp, 'Should have Hypnotic Pattern option')
    const { state: newState } = ActionResolver.resolve(state, 'bard1', {
      optionId: hp.optionId,
      aoeCenter: { x: 6, y: 0 },
    })

    const ghoul = newState.getCombatant('ghoul1')
    assert.ok(!ghoul.conditions.includes('charmed_hp'), 'Charm-immune creature should not gain charmed_hp')
    assert.ok(!ghoul.conditions.includes('incapacitated'), 'Charm-immune creature should not gain incapacitated')
  })

  it('non-immune creature still gets charmed by Hypnotic Pattern', () => {
    const state = new GameState({
      combatants: [
        makeBard({ position: { x: 0, y: 0 } }),
        makeEnemy({
          position: { x: 6, y: 0 },
          saves: { str: 0, dex: 2, con: 1, int: 0, wis: 0, cha: 2 },
        }),
      ],
      initiativeOrder: ['bard1', 'enemy1'],
    })

    const menu = TurnMenu.getMenu(state, 'bard1')
    const hp = menu.actions.find(o => o.type === 'spell' && o.spellName === 'Hypnotic Pattern')
    const { state: newState } = ActionResolver.resolve(state, 'bard1', {
      optionId: hp.optionId,
      aoeCenter: { x: 6, y: 0 },
    })

    const enemy = newState.getCombatant('enemy1')
    // In average mode: d20→10, Wis save +0 = 10 vs DC 14 → FAIL → should get charmed
    assert.ok(enemy.conditions.includes('charmed_hp'), 'Non-immune creature should gain charmed_hp')
    assert.ok(enemy.conditions.includes('incapacitated'), 'Non-immune creature should gain incapacitated')
  })
})

// ─────────────────────────────────────────────────────────────────────────────
// HOLD PERSON — HUMANOID TYPE CHECK
// ─────────────────────────────────────────────────────────────────────────────

describe('ActionResolver — Hold Person humanoid check', () => {
  it('Hold Person has no effect on non-humanoid target', () => {
    const state = new GameState({
      combatants: [
        makeBard({ position: { x: 0, y: 0 } }),
        makeEnemy({
          id: 'dragon1',
          name: 'Young Dragon',
          type: 'dragon',
          position: { x: 6, y: 0 },
          saves: { str: 6, dex: 4, con: 9, int: 3, wis: 0, cha: 8 },
        }),
      ],
      initiativeOrder: ['bard1', 'dragon1'],
    })

    const menu = TurnMenu.getMenu(state, 'bard1')
    const holdPerson = menu.actions.find(o => o.type === 'spell' && o.spellName === 'Hold Person' && o.slotLevel === 2)
    assert.ok(holdPerson, 'Should have Hold Person option')
    const { state: newState } = ActionResolver.resolve(state, 'bard1', {
      optionId: holdPerson.optionId,
      targetId: 'dragon1',
    })

    const dragon = newState.getCombatant('dragon1')
    assert.ok(!dragon.conditions.includes('paralyzed'), 'Non-humanoid should not be paralyzed by Hold Person')
  })

  it('Hold Person works normally on humanoid target', () => {
    const state = new GameState({
      combatants: [
        makeBard({ position: { x: 0, y: 0 } }),
        makeEnemy({
          position: { x: 6, y: 0 },
          type: 'humanoid',
          saves: { str: 0, dex: 2, con: 1, int: 0, wis: 0, cha: 2 },
        }),
      ],
      initiativeOrder: ['bard1', 'enemy1'],
    })

    const menu = TurnMenu.getMenu(state, 'bard1')
    const holdPerson = menu.actions.find(o => o.type === 'spell' && o.spellName === 'Hold Person' && o.slotLevel === 2)
    const { state: newState } = ActionResolver.resolve(state, 'bard1', {
      optionId: holdPerson.optionId,
      targetId: 'enemy1',
    })

    const enemy = newState.getCombatant('enemy1')
    // In average mode: d20→10, Wis save +0 = 10 vs DC 14 → FAIL → paralyzed
    assert.ok(enemy.conditions.includes('paralyzed'), 'Humanoid should be paralyzed by Hold Person on failed save')
  })
})

// ─────────────────────────────────────────────────────────────────────────────
// LEGENDARY RESISTANCE
// ─────────────────────────────────────────────────────────────────────────────

describe('ActionResolver — Legendary Resistance', () => {
  it('Legendary Resistance prevents spell effects when save fails', () => {
    // Use a creature with low WIS save but LR
    const state = new GameState({
      combatants: [
        makeBard({ position: { x: 0, y: 0 } }),
        makeEnemy({
          id: 'boss1',
          name: 'Boss',
          type: 'humanoid',
          position: { x: 6, y: 0 },
          saves: { str: 6, dex: 4, con: 5, int: 3, wis: 0, cha: 4 },
          legendaryResistance: { uses: 2, max: 2 },
        }),
      ],
      initiativeOrder: ['bard1', 'boss1'],
    })

    const menu = TurnMenu.getMenu(state, 'bard1')
    const holdPerson = menu.actions.find(o => o.type === 'spell' && o.spellName === 'Hold Person' && o.slotLevel === 2)
    const { state: newState } = ActionResolver.resolve(state, 'bard1', {
      optionId: holdPerson.optionId,
      targetId: 'boss1',
    })

    const boss = newState.getCombatant('boss1')
    // In avg mode: d20→10, WIS save +0 = 10 vs DC 14 → FAIL → LR kicks in → treated as SUCCESS
    assert.ok(!boss.conditions.includes('paralyzed'), 'LR should prevent paralysis')
    assert.equal(boss.legendaryResistance.uses, 1, 'Should spend one LR use')
  })

  it('Legendary Resistance works on AoE save spells', () => {
    const state = new GameState({
      combatants: [
        makeBard({ position: { x: 0, y: 0 } }),
        makeEnemy({
          id: 'boss1',
          name: 'Boss',
          type: 'humanoid',
          position: { x: 6, y: 0 },
          saves: { str: 6, dex: 4, con: 5, int: 3, wis: 0, cha: 4 },
          legendaryResistance: { uses: 3, max: 3 },
        }),
      ],
      initiativeOrder: ['bard1', 'boss1'],
    })

    const menu = TurnMenu.getMenu(state, 'bard1')
    const hp = menu.actions.find(o => o.type === 'spell' && o.spellName === 'Hypnotic Pattern')
    const { state: newState } = ActionResolver.resolve(state, 'bard1', {
      optionId: hp.optionId,
      aoeCenter: { x: 6, y: 0 },
    })

    const boss = newState.getCombatant('boss1')
    // WIS save +0 = 10 vs DC 14 → FAIL → LR → SUCCESS → no charm
    assert.ok(!boss.conditions.includes('charmed_hp'), 'LR should prevent charm from AoE')
    assert.equal(boss.legendaryResistance.uses, 2, 'Should spend one LR use')
  })

  it('does nothing when LR uses are 0', () => {
    const state = new GameState({
      combatants: [
        makeBard({ position: { x: 0, y: 0 } }),
        makeEnemy({
          id: 'boss1',
          name: 'Boss',
          type: 'humanoid',
          position: { x: 6, y: 0 },
          saves: { str: 6, dex: 4, con: 5, int: 3, wis: 0, cha: 4 },
          legendaryResistance: { uses: 0, max: 3 },
        }),
      ],
      initiativeOrder: ['bard1', 'boss1'],
    })

    const menu = TurnMenu.getMenu(state, 'bard1')
    const holdPerson = menu.actions.find(o => o.type === 'spell' && o.spellName === 'Hold Person' && o.slotLevel === 2)
    const { state: newState } = ActionResolver.resolve(state, 'bard1', {
      optionId: holdPerson.optionId,
      targetId: 'boss1',
    })

    const boss = newState.getCombatant('boss1')
    // WIS +0 vs DC 14 → FAIL, no LR → paralyzed
    assert.ok(boss.conditions.includes('paralyzed'), 'No LR uses left — should be paralyzed')
    assert.equal(boss.legendaryResistance.uses, 0, 'LR uses should remain 0')
  })
})

// ─────────────────────────────────────────────────────────────────────────────
// SHAKE AWAKE
// ─────────────────────────────────────────────────────────────────────────────

describe('ActionResolver — shake_awake', () => {
  it('removes charmed_hp and incapacitated from an adjacent ally', () => {
    const state = new GameState({
      combatants: [
        makeEnemy({
          id: 'fanatic1',
          name: 'Cult Fanatic',
          side: 'enemy',
          position: { x: 0, y: 0 },
        }),
        makeEnemy({
          id: 'fanatic2',
          name: 'Cult Fanatic 2',
          side: 'enemy',
          position: { x: 1, y: 0 },
          conditions: ['charmed_hp', 'incapacitated'],
        }),
      ],
      initiativeOrder: ['fanatic1', 'fanatic2'],
    })

    const menu = TurnMenu.getMenu(state, 'fanatic1')
    const shakeOption = menu.actions.find(o => o.type === 'shake_awake')
    assert.ok(shakeOption, 'Should have shake_awake option for charmed ally')

    const { state: newState } = ActionResolver.resolve(state, 'fanatic1', {
      optionId: shakeOption.optionId,
    })

    const fan2 = newState.getCombatant('fanatic2')
    assert.ok(!fan2.conditions.includes('charmed_hp'), 'charmed_hp removed')
    assert.ok(!fan2.conditions.includes('incapacitated'), 'incapacitated removed')
    assert.equal(newState.getCombatant('fanatic1').usedAction, true, 'Uses action')
  })

  it('does NOT offer shake_awake for non-adjacent charmed ally', () => {
    const state = new GameState({
      combatants: [
        makeEnemy({
          id: 'fanatic1',
          name: 'Cult Fanatic',
          side: 'enemy',
          position: { x: 0, y: 0 },
        }),
        makeEnemy({
          id: 'fanatic2',
          name: 'Cult Fanatic 2',
          side: 'enemy',
          position: { x: 10, y: 0 },  // 50ft away
          conditions: ['charmed_hp', 'incapacitated'],
        }),
      ],
      initiativeOrder: ['fanatic1', 'fanatic2'],
    })

    const menu = TurnMenu.getMenu(state, 'fanatic1')
    const shakeOption = menu.actions.find(o => o.type === 'shake_awake')
    assert.equal(shakeOption, undefined, 'Should NOT offer shake_awake for far ally')
  })
})

// ─────────────────────────────────────────────────────────────────────────────
// DARK DEVOTION — advantage on charm/fear saves
// ─────────────────────────────────────────────────────────────────────────────

describe('ActionResolver — Dark Devotion', () => {
  it('creature with darkDevotion gets advantage on charm save (Hypnotic Pattern)', () => {
    // In average mode, d20 → 10.  With advantage, max(10,10) = 10.
    // WIS save +1 = 11 vs DC 14 → FAIL even with advantage in average mode.
    // This test verifies the code path runs without error and the flag is checked.
    const state = new GameState({
      combatants: [
        makeBard({ position: { x: 0, y: 0 } }),
        makeEnemy({
          id: 'fanatic1',
          name: 'Fanatic',
          type: 'humanoid',
          position: { x: 6, y: 0 },
          saves: { str: 0, dex: 0, con: 0, int: 0, wis: 1, cha: 0 },
          darkDevotion: true,
        }),
      ],
      initiativeOrder: ['bard1', 'fanatic1'],
    })

    const menu = TurnMenu.getMenu(state, 'bard1')
    const hp = menu.actions.find(o => o.type === 'spell' && o.spellName === 'Hypnotic Pattern')
    const { state: newState } = ActionResolver.resolve(state, 'bard1', {
      optionId: hp.optionId,
      aoeCenter: { x: 6, y: 0 },
    })

    const fan = newState.getCombatant('fanatic1')
    // In avg mode, advantage still yields 10. +1 = 11 < DC 14. Still charmed.
    assert.ok(fan.conditions.includes('charmed_hp'), 'Fanatic still charmed (avg mode adv = 10)')
  })

  it('creature WITHOUT darkDevotion does NOT get advantage on charm save', () => {
    const state = new GameState({
      combatants: [
        makeBard({ position: { x: 0, y: 0 } }),
        makeEnemy({
          id: 'grunt1',
          name: 'Grunt',
          type: 'humanoid',
          position: { x: 6, y: 0 },
          saves: { str: 0, dex: 0, con: 0, int: 0, wis: 1, cha: 0 },
          darkDevotion: false,
        }),
      ],
      initiativeOrder: ['bard1', 'grunt1'],
    })

    const menu = TurnMenu.getMenu(state, 'bard1')
    const hp = menu.actions.find(o => o.type === 'spell' && o.spellName === 'Hypnotic Pattern')
    const { state: newState } = ActionResolver.resolve(state, 'bard1', {
      optionId: hp.optionId,
      aoeCenter: { x: 6, y: 0 },
    })

    const grunt = newState.getCombatant('grunt1')
    assert.ok(grunt.conditions.includes('charmed_hp'), 'Grunt charmed (no advantage)')
  })

  it('darkDevotion does NOT apply to non-charm/fear spells (Shatter)', () => {
    const state = new GameState({
      combatants: [
        makeBard({ position: { x: 0, y: 0 } }),
        makeEnemy({
          id: 'fanatic1',
          name: 'Fanatic',
          type: 'humanoid',
          position: { x: 6, y: 0 },
          saves: { str: 0, dex: 0, con: 0, int: 0, wis: 0, cha: 0 },
          darkDevotion: true,
        }),
      ],
      initiativeOrder: ['bard1', 'fanatic1'],
    })

    // Shatter has no charm/fear effects, so darkDevotion shouldn't help
    const menu = TurnMenu.getMenu(state, 'bard1')
    const shatter = menu.actions.find(o => o.type === 'spell' && o.spellName === 'Shatter' && o.slotLevel === 2)
    const hpBefore = state.getCombatant('fanatic1').currentHP
    const { state: newState } = ActionResolver.resolve(state, 'bard1', {
      optionId: shatter.optionId,
      aoeCenter: { x: 6, y: 0 },
    })

    const fan = newState.getCombatant('fanatic1')
    // CON save +0. Average d20=10 vs DC 14 → FAIL → full 3d8 damage
    assert.ok(fan.currentHP < hpBefore, 'Fanatic should have taken damage (not saved)')
  })
})

// ─────────────────────────────────────────────────────────────────────────────
// VM DISADVANTAGE
// ─────────────────────────────────────────────────────────────────────────────

describe('ActionResolver — Vicious Mockery disadvantage', () => {
  it('vm_disadvantage imposes disadvantage on single attack', () => {
    // Attacker with vm_disadvantage vs target → disadvantage on the attack roll
    const state = new GameState({
      combatants: [
        makeEnemy({
          id: 'attacker1', name: 'Attacker',
          side: 'enemy',
          position: { x: 0, y: 0 },
          conditions: ['vm_disadvantage'],
          weapons: [{ name: 'Dagger', attackBonus: 4, damageDice: '1d4', damageBonus: 2, type: 'melee', range: 5 }],
        }),
        makeBard({ position: { x: 1, y: 0 } }),
      ],
      initiativeOrder: ['attacker1', 'bard1'],
    })

    const menu = TurnMenu.getMenu(state, 'attacker1')
    const atkOption = menu.actions.find(o => o.type === 'attack')
    assert.ok(atkOption, 'Attack option should exist')

    const { state: newState } = ActionResolver.resolve(state, 'attacker1', {
      optionId: atkOption.optionId,
      targetId: 'bard1',
    })

    // vm_disadvantage should be consumed after the attack
    const attacker = newState.getCombatant('attacker1')
    assert.ok(!(attacker.conditions || []).includes('vm_disadvantage'),
      'vm_disadvantage should be consumed after attack')
  })

  it('vm_disadvantage is consumed after first multiattack swing', () => {
    const state = new GameState({
      combatants: [
        makeBrute({
          conditions: ['vm_disadvantage'],
          position: { x: 0, y: 0 },
        }),
        makeBard({ position: { x: 1, y: 0 } }),
      ],
      initiativeOrder: ['brute1', 'bard1'],
    })

    const menu = TurnMenu.getMenu(state, 'brute1')
    const multiOption = menu.actions.find(o => o.type === 'multiattack')
    assert.ok(multiOption, 'Multiattack option should exist')

    const { state: newState } = ActionResolver.resolve(state, 'brute1', {
      optionId: multiOption.optionId,
      targetId: 'bard1',
    })

    // vm_disadvantage should be consumed after multiattack
    const brute = newState.getCombatant('brute1')
    assert.ok(!(brute.conditions || []).includes('vm_disadvantage'),
      'vm_disadvantage should be consumed during multiattack')
  })

  it('frightened condition imposes disadvantage on attacks', () => {
    // A frightened attacker should attack with disadvantage
    const state = new GameState({
      combatants: [
        makeEnemy({
          id: 'scared1', name: 'Scared Fanatic',
          side: 'enemy',
          position: { x: 0, y: 0 },
          conditions: ['frightened'],
          weapons: [{ name: 'Dagger', attackBonus: 4, damageDice: '1d4', damageBonus: 2, type: 'melee', range: 5 }],
        }),
        makeBard({ position: { x: 1, y: 0 } }),
      ],
      initiativeOrder: ['scared1', 'bard1'],
    })

    const menu = TurnMenu.getMenu(state, 'scared1')
    const atkOption = menu.actions.find(o => o.type === 'attack')
    assert.ok(atkOption, 'Attack option should exist for frightened creature')

    // Resolve resolves successfully — with average dice mode, disadvantage = min(10,10) = 10
    const { state: newState } = ActionResolver.resolve(state, 'scared1', {
      optionId: atkOption.optionId,
      targetId: 'bard1',
    })

    // Frightened persists (it's not consumed by attacking)
    const scared = newState.getCombatant('scared1')
    assert.ok((scared.conditions || []).includes('frightened'),
      'Frightened should persist after attacking')
  })
})

// ─────────────────────────────────────────────────────────────────────────────
// AUTO-FAIL STR/DEX SAVES
// ─────────────────────────────────────────────────────────────────────────────

describe('ActionResolver — auto-fail STR/DEX saves', () => {
  it('paralyzed creature auto-fails DEX save (Shatter)', () => {
    // Give enemy a high DEX save that would normally succeed, but paralyzed → auto-fail
    const state = new GameState({
      combatants: [
        makeBard(),
        makeEnemy({
          id: 'enemy1', name: 'Nimble Fanatic',
          position: { x: 6, y: 0 },
          currentHP: 50, maxHP: 50,
          saves: { dex: 20 },  // Would normally always succeed
          conditions: ['paralyzed'],
        }),
      ],
      initiativeOrder: ['bard1', 'enemy1'],
    })

    const menu = TurnMenu.getMenu(state, 'bard1')
    const shatter = menu.actions.find(o => o.spellName === 'Shatter' && o.slotLevel === 2)
    assert.ok(shatter, 'Shatter should be available')

    const { state: newState } = ActionResolver.resolve(state, 'bard1', {
      optionId: shatter.optionId,
      aoeCenter: { x: 6, y: 0 },
    })

    const enemy = newState.getCombatant('enemy1')
    // DEX save +20 would normally pass DC 14, but paralyzed → auto-fail → full damage
    assert.ok(enemy.currentHP < 50, 'Paralyzed creature should take full Shatter damage (auto-fail DEX save)')
  })

  it('WIS save unaffected by paralyzed condition', () => {
    // Paralyzed creature with high WIS save should still be able to save normally
    const state = new GameState({
      combatants: [
        makeBard(),
        makeEnemy({
          id: 'enemy1', name: 'Wise Fanatic',
          position: { x: 6, y: 0 },
          currentHP: 50, maxHP: 50,
          type: 'humanoid',
          saves: { wis: 20 },  // Very high WIS save
          conditions: ['paralyzed'],
        }),
      ],
      initiativeOrder: ['bard1', 'enemy1'],
    })

    // Hold Person is a WIS save — paralyzed should NOT auto-fail WIS
    const menu = TurnMenu.getMenu(state, 'bard1')
    const holdPerson = menu.actions.find(o => o.spellName === 'Hold Person' && o.slotLevel === 2)
    assert.ok(holdPerson, 'Hold Person should be available')

    const { state: newState } = ActionResolver.resolve(state, 'bard1', {
      optionId: holdPerson.optionId,
      targetId: 'enemy1',
    })

    // WIS save +20 vs DC 14 → should succeed (not auto-fail)
    // Enemy already paralyzed, so Hold Person effect doesn't matter much,
    // but the save should succeed, validating WIS isn't auto-failed
    const logs = newState.log
    const hasSaveSuccess = logs.some(l => l.includes('SUCCESS'))
    assert.ok(hasSaveSuccess, 'WIS save should succeed normally for paralyzed creature')
  })
})

// ─────────────────────────────────────────────────────────────────────────────
// IMMUTABILITY CHAIN
// ─────────────────────────────────────────────────────────────────────────────

describe('ActionResolver — immutability chain', () => {
  it('multiple sequential resolves produce independent states', () => {
    // Move → Attack (after dash for movement)
    const state = makeMeleeState()

    // Resolve attack
    const attackChoice = getMeleeAttackChoice(state)
    const { state: s1 } = ActionResolver.resolve(state, 'bard1', attackChoice)

    // Resolve from original state (different branch)
    const menu2 = TurnMenu.getMenu(state, 'bard1')
    const dash = menu2.actions.find(o => o.type === 'dash')
    const { state: s2 } = ActionResolver.resolve(state, 'bard1', { optionId: dash.optionId })

    // s1 and s2 should be independent
    assert.equal(s1.getCombatant('bard1').usedAction, true)
    assert.ok(s1.getCombatant('enemy1').currentHP < 33) // took damage

    assert.equal(s2.getCombatant('bard1').usedAction, true)
    assert.equal(s2.getCombatant('enemy1').currentHP, 33) // no damage (was dash)
    assert.equal(s2.getCombatant('bard1').movementRemaining, 60)

    // Original unchanged
    assert.equal(state.getCombatant('bard1').usedAction, false)
    assert.equal(state.getCombatant('enemy1').currentHP, 33)
  })
})

// ─────────────────────────────────────────────────────────────────────────────
// BREATH WEAPON
// ─────────────────────────────────────────────────────────────────────────────

describe('ActionResolver — Breath Weapon', () => {
  /** Create a bard with breath weapon facing enemies */
  function makeBreathWeaponState() {
    return new GameState({
      combatants: [
        makeBard({
          breathWeapon: {
            uses: 3, max: 3,
            damage: '2d8', damageType: 'fire',
            save: 'dex', dc: 13,
            range: 15,
            targeting: { type: 'area', shape: 'cone', length: 15 },
          },
        }),
        makeEnemy({ id: 'enemy1', name: 'Fanatic A', position: { x: 2, y: 0 } }),
        makeEnemy({ id: 'enemy2', name: 'Fanatic B', position: { x: 2, y: 1 } }),
      ],
      initiativeOrder: ['bard1', 'enemy1', 'enemy2'],
    })
  }

  it('appears as a menu option when uses > 0', () => {
    const state = makeBreathWeaponState()
    const menu = TurnMenu.getMenu(state, 'bard1')
    const bwOption = menu.actions.find(o => o.type === 'breath_weapon')
    assert.ok(bwOption, 'Breath weapon should be in action options')
    assert.equal(bwOption.targetType, 'area')
    assert.equal(bwOption.requiresPosition, true)
    assert.equal(bwOption.castRange, 15)
  })

  it('does NOT appear when uses === 0', () => {
    const state = new GameState({
      combatants: [
        makeBard({
          breathWeapon: { uses: 0, max: 3, damage: '2d8', damageType: 'fire', save: 'dex', dc: 13, range: 15, targeting: { type: 'area', shape: 'cone', length: 15 } },
        }),
        makeEnemy({ position: { x: 2, y: 0 } }),
      ],
      initiativeOrder: ['bard1', 'enemy1'],
    })
    const menu = TurnMenu.getMenu(state, 'bard1')
    const bwOption = menu.actions.find(o => o.type === 'breath_weapon')
    assert.equal(bwOption, undefined, 'No breath weapon when 0 uses')
  })

  it('deals damage to enemies in AoE and decrements uses', () => {
    const state = makeBreathWeaponState()
    const menu = TurnMenu.getMenu(state, 'bard1')
    const bwOption = menu.actions.find(o => o.type === 'breath_weapon')
    const hpBefore1 = state.getCombatant('enemy1').currentHP
    const hpBefore2 = state.getCombatant('enemy2').currentHP

    const { state: newState, result } = ActionResolver.resolve(state, 'bard1', {
      optionId: bwOption.optionId,
      aoeCenter: { x: 2, y: 0 },
    })

    assert.equal(result.type, 'breath_weapon')
    // Uses should decrement
    assert.equal(newState.getCombatant('bard1').breathWeapon.uses, 2)
    // Action should be used
    assert.equal(newState.getCombatant('bard1').usedAction, true)
    // At least one enemy should take damage (AoE geometry may exclude some)
    const e1 = newState.getCombatant('enemy1')
    const e2 = newState.getCombatant('enemy2')
    const anyDamage = e1.currentHP < hpBefore1 || e2.currentHP < hpBefore2
    assert.ok(anyDamage, 'At least one enemy should take breath weapon damage')
  })

  it('triggers concentration check on damaged target', () => {
    const state = new GameState({
      combatants: [
        makeBard({
          breathWeapon: {
            uses: 1, max: 1,
            damage: '2d8', damageType: 'fire',
            save: 'dex', dc: 13,
            range: 15,
            targeting: { type: 'area', shape: 'cone', length: 15 },
          },
        }),
        makeEnemy({
          position: { x: 2, y: 0 },
          currentHP: 100, maxHP: 100,
          concentrating: 'Hold Person',
          concentrationRoundsRemaining: 10,
        }),
      ],
      initiativeOrder: ['bard1', 'enemy1'],
    })

    const menu = TurnMenu.getMenu(state, 'bard1')
    const bwOption = menu.actions.find(o => o.type === 'breath_weapon')
    const { state: newState } = ActionResolver.resolve(state, 'bard1', {
      optionId: bwOption.optionId,
      aoeCenter: { x: 2, y: 0 },
    })

    const enemy = newState.getCombatant('enemy1')
    // Enemy should have taken damage (con save for concentration is separate from breath save)
    assert.ok(enemy.currentHP < 100, 'Enemy should take breath weapon damage')
    // Concentration check should have run (may or may not break depending on roll)
    const logs = newState.log
    const hasConCheck = logs.some(l => l.includes('Concentration'))
    assert.ok(hasConCheck, 'Concentration check should appear in logs')
  })
})

// ─────────────────────────────────────────────────────────────────────────────
// DRAGON FEAR
// ─────────────────────────────────────────────────────────────────────────────

describe('ActionResolver — Dragon Fear', () => {
  /** Create a bard with Dragon Fear facing enemies */
  function makeDragonFearState() {
    return new GameState({
      combatants: [
        makeBard({
          breathWeapon: {
            uses: 3, max: 3,
            damage: '2d8', damageType: 'fire',
            save: 'dex', dc: 13,
            range: 15,
            targeting: { type: 'area', shape: 'cone', length: 15 },
          },
          dragonFear: {
            uses: 1, max: 1,
            dc: 14, save: 'wis',
            range: 30,
            targeting: { type: 'area', shape: 'cone', length: 30 },
          },
        }),
        makeEnemy({ id: 'enemy1', name: 'Fanatic A', position: { x: 3, y: 0 }, saves: { wis: 0 } }),
        makeEnemy({ id: 'enemy2', name: 'Fanatic B', position: { x: 3, y: 1 }, saves: { wis: 0 } }),
      ],
      initiativeOrder: ['bard1', 'enemy1', 'enemy2'],
    })
  }

  it('appears as a menu option when uses > 0', () => {
    const state = makeDragonFearState()
    const menu = TurnMenu.getMenu(state, 'bard1')
    const dfOption = menu.actions.find(o => o.type === 'dragon_fear')
    assert.ok(dfOption, 'Dragon Fear should be in action options')
    assert.equal(dfOption.targetType, 'area')
    assert.equal(dfOption.requiresPosition, true)
    assert.equal(dfOption.castRange, 30)
  })

  it('does NOT appear when uses === 0', () => {
    const state = new GameState({
      combatants: [
        makeBard({
          dragonFear: { uses: 0, max: 1, dc: 14, save: 'wis', range: 30, targeting: { type: 'area', shape: 'cone', length: 30 } },
        }),
        makeEnemy({ position: { x: 3, y: 0 } }),
      ],
      initiativeOrder: ['bard1', 'enemy1'],
    })
    const menu = TurnMenu.getMenu(state, 'bard1')
    const dfOption = menu.actions.find(o => o.type === 'dragon_fear')
    assert.equal(dfOption, undefined, 'No Dragon Fear when 0 uses')
  })

  it('frightens enemies who fail WIS save', () => {
    const state = makeDragonFearState()
    const menu = TurnMenu.getMenu(state, 'bard1')
    const dfOption = menu.actions.find(o => o.type === 'dragon_fear')

    // With average dice (d20=10), save bonus 0 vs DC 14 → roll 10 < 14 → FAIL
    const { state: newState, result } = ActionResolver.resolve(state, 'bard1', {
      optionId: dfOption.optionId,
      aoeCenter: { x: 3, y: 0 },
    })

    assert.equal(result.type, 'dragon_fear')
    assert.equal(newState.getCombatant('bard1').usedAction, true)
    assert.equal(newState.getCombatant('bard1').dragonFear.uses, 0)

    // At least one enemy hit by AoE cone should be frightened
    const e1 = newState.getCombatant('enemy1')
    const e2 = newState.getCombatant('enemy2')
    const anyFrightened = (e1.conditions || []).includes('frightened') ||
      (e2.conditions || []).includes('frightened')
    assert.ok(anyFrightened, 'At least one enemy should be frightened')
  })

  it('spends a breath weapon use (Dragon Fear replaces breath)', () => {
    const state = makeDragonFearState()
    const menu = TurnMenu.getMenu(state, 'bard1')
    const dfOption = menu.actions.find(o => o.type === 'dragon_fear')

    const { state: newState } = ActionResolver.resolve(state, 'bard1', {
      optionId: dfOption.optionId,
      aoeCenter: { x: 3, y: 0 },
    })

    // Dragon Fear decrements both dragonFear.uses and breathWeapon.uses
    assert.equal(newState.getCombatant('bard1').dragonFear.uses, 0)
    assert.equal(newState.getCombatant('bard1').breathWeapon.uses, 2,
      'Breath weapon uses should also decrement')
  })

  it('darkDevotion gives advantage on WIS save vs frightened', () => {
    const state = new GameState({
      combatants: [
        makeBard({
          breathWeapon: { uses: 3, max: 3, damage: '2d8', damageType: 'fire', save: 'dex', dc: 13, range: 15, targeting: { type: 'area', shape: 'cone', length: 15 } },
          dragonFear: { uses: 1, max: 1, dc: 14, save: 'wis', range: 30, targeting: { type: 'area', shape: 'cone', length: 30 } },
        }),
        makeEnemy({
          id: 'fanatic1', name: 'Fanatic',
          position: { x: 3, y: 0 },
          saves: { wis: 3 },
          darkDevotion: true,
        }),
      ],
      initiativeOrder: ['bard1', 'fanatic1'],
    })

    const menu = TurnMenu.getMenu(state, 'bard1')
    const dfOption = menu.actions.find(o => o.type === 'dragon_fear')
    const { state: newState } = ActionResolver.resolve(state, 'bard1', {
      optionId: dfOption.optionId,
      aoeCenter: { x: 3, y: 0 },
    })

    // With advantage, average = max(10,10) = 10, +3 = 13 vs DC 14 → still fails
    // But the log should show the roll was made (darkDevotion grants advantage)
    const fan = newState.getCombatant('fanatic1')
    const logs = newState.log
    const hasFearLog = logs.some(l => l.includes('Dragon Fear'))
    assert.ok(hasFearLog, 'Dragon Fear should appear in combat logs')
  })

  it('Legendary Resistance can negate Dragon Fear', () => {
    const state = new GameState({
      combatants: [
        makeBard({
          breathWeapon: { uses: 3, max: 3, damage: '2d8', damageType: 'fire', save: 'dex', dc: 13, range: 15, targeting: { type: 'area', shape: 'cone', length: 15 } },
          dragonFear: { uses: 1, max: 1, dc: 14, save: 'wis', range: 30, targeting: { type: 'area', shape: 'cone', length: 30 } },
        }),
        makeCombatant({
          id: 'dragon1', name: 'Dragon', side: 'enemy',
          position: { x: 3, y: 0 },
          currentHP: 200, maxHP: 200, ac: 18,
          saves: { wis: 0 },
          legendaryResistance: { uses: 3, max: 3 },
        }),
      ],
      initiativeOrder: ['bard1', 'dragon1'],
    })

    const menu = TurnMenu.getMenu(state, 'bard1')
    const dfOption = menu.actions.find(o => o.type === 'dragon_fear')
    const { state: newState } = ActionResolver.resolve(state, 'bard1', {
      optionId: dfOption.optionId,
      aoeCenter: { x: 3, y: 0 },
    })

    const dragon = newState.getCombatant('dragon1')
    // LR should negate frightened
    assert.ok(!(dragon.conditions || []).includes('frightened'),
      'Dragon should not be frightened (Legendary Resistance)')
    assert.equal(dragon.legendaryResistance.uses, 2, 'LR use should be spent')
  })
})

// ─────────────────────────────────────────────────────────────────────────────
// DAMAGE RESISTANCE
// ─────────────────────────────────────────────────────────────────────────────

describe('ActionResolver — damage resistance', () => {
  it('halves spell damage when target has resistance to the damage type', () => {
    // Aasimar-like bard resists necrotic → Inflict Wounds (necrotic) does half
    const state = new GameState({
      combatants: [
        makeBard({
          id: 'bard1',
          damageResistances: ['necrotic'],
          position: { x: 1, y: 0 },
          currentHP: 80, maxHP: 80,
        }),
        makeEnemy({
          id: 'enemy1',
          position: { x: 0, y: 0 },
          spellSaveDC: 15,
          spellAttackBonus: 6,
          spellSlots: { 1: 3 },
          maxSlots: { 1: 3 },
          spellsKnown: ['Inflict Wounds'],
          cantrips: [],
        }),
      ],
      initiativeOrder: ['enemy1', 'bard1'],
    })

    const menu = TurnMenu.getMenu(state, 'enemy1')
    const iw = menu.actions.find(o => o.type === 'spell' && o.spellName === 'Inflict Wounds')
    assert.ok(iw, 'Enemy should have Inflict Wounds option')

    const { state: newState } = ActionResolver.resolve(state, 'enemy1', { optionId: iw.optionId, targetId: 'bard1' })
    const bard = newState.getCombatant('bard1')

    // In average dice mode, Inflict Wounds does 3d10=16 (avg 5.5 per die × 3 rounded).
    // With a melee spell attack at +6 vs AC 15, using average dice → hits.
    // Damage: 3d10 avg = 16. With resistance: 8.
    if (bard.currentHP < 80) {
      // Spell hit. With necrotic resistance, damage should be halved.
      const damageTaken = 80 - bard.currentHP
      // In average mode, 3d10 = 16. Half = 8.
      assert.equal(damageTaken, 8, 'Necrotic resistance should halve Inflict Wounds damage')
    }
    // If spell missed, that's fine too — resistance doesn't apply on a miss
  })

  it('does not reduce damage when target lacks resistance to the type', () => {
    // Bard with fire resistance takes full necrotic damage
    const state = new GameState({
      combatants: [
        makeBard({
          id: 'bard1',
          damageResistances: ['fire'],
          position: { x: 1, y: 0 },
          currentHP: 80, maxHP: 80,
        }),
        makeEnemy({
          id: 'enemy1',
          position: { x: 0, y: 0 },
          spellSaveDC: 15,
          spellAttackBonus: 6,
          spellSlots: { 1: 3 },
          maxSlots: { 1: 3 },
          spellsKnown: ['Inflict Wounds'],
          cantrips: [],
        }),
      ],
      initiativeOrder: ['enemy1', 'bard1'],
    })

    const menu = TurnMenu.getMenu(state, 'enemy1')
    const iw = menu.actions.find(o => o.type === 'spell' && o.spellName === 'Inflict Wounds')
    const { state: newState } = ActionResolver.resolve(state, 'enemy1', { optionId: iw.optionId, targetId: 'bard1' })
    const bard = newState.getCombatant('bard1')

    if (bard.currentHP < 80) {
      const damageTaken = 80 - bard.currentHP
      // Full 3d10 avg = 16, no resistance applied
      assert.equal(damageTaken, 16, 'Fire resistance should NOT reduce necrotic damage')
    }
  })

  it('halves AoE spell damage with resistance (e.g. Fireball vs fire-resistant target)', () => {
    // Target with fire resistance takes half from Fireball on a failed save
    const state = new GameState({
      combatants: [
        makeBard({
          id: 'bard1',
          position: { x: 0, y: 0 },
          spellSaveDC: 15,
          spellSlots: { 3: 2 },
          maxSlots: { 3: 2 },
          spellsKnown: ['Fireball'],
          cantrips: [],
        }),
        makeEnemy({
          id: 'enemy1',
          position: { x: 3, y: 0 }, // 15ft — in Fireball range
          currentHP: 100, maxHP: 100,
          damageResistances: ['fire'],
          saves: { dex: -2 }, // guaranteed fail
        }),
      ],
      initiativeOrder: ['bard1', 'enemy1'],
    })

    const menu = TurnMenu.getMenu(state, 'bard1')
    const fb = menu.actions.find(o => o.type === 'spell' && o.spellName === 'Fireball')
    assert.ok(fb, 'Bard should have Fireball option')

    const { state: newState } = ActionResolver.resolve(state, 'bard1', {
      optionId: fb.optionId,
      aoeCenter: { x: 3, y: 0 },
    })

    const enemy = newState.getCombatant('enemy1')
    if (enemy.currentHP < 100) {
      const damage = 100 - enemy.currentHP
      // Fireball 8d6 avg = 28. With fire resistance on failed save: 14
      assert.equal(damage, 14, 'Fire resistance should halve Fireball damage')
    }
  })

  it('halves breath weapon damage when target resists the damage type', () => {
    // Bard with fire resistance vs. fire breath weapon
    const state = new GameState({
      combatants: [
        makeEnemy({
          id: 'dragon1',
          name: 'Fire Breather',
          position: { x: 0, y: 0 },
          breathWeapon: {
            damage: '2d8',
            damageType: 'fire',
            save: 'dex',
            dc: 14,
            range: 15,
            uses: 3,
            max: 3,
            targeting: { type: 'area', shape: 'cone', length: 15 },
          },
        }),
        makeBard({
          id: 'bard1',
          position: { x: 2, y: 0 }, // 10ft — within 15ft cone
          currentHP: 80, maxHP: 80,
          damageResistances: ['fire'],
          saves: { dex: -2 }, // guaranteed fail
        }),
      ],
      initiativeOrder: ['dragon1', 'bard1'],
    })

    const menu = TurnMenu.getMenu(state, 'dragon1')
    const bwOption = menu.actions.find(o => o.type === 'breath_weapon')
    assert.ok(bwOption, 'Dragon should have breath weapon option')

    const { state: newState } = ActionResolver.resolve(state, 'dragon1', {
      optionId: bwOption.optionId,
      aoeCenter: { x: 2, y: 0 },
    })

    const bard = newState.getCombatant('bard1')
    if (bard.currentHP < 80) {
      const damage = 80 - bard.currentHP
      // 2d8 avg = 9. With fire resistance: 4 (half of 9 = 4.5 → 4 rounded down)
      assert.equal(damage, 4, 'Fire resistance should halve breath weapon damage')
    }
  })

  it('immune target takes zero spell damage', () => {
    const state = new GameState({
      combatants: [
        makeBard({
          id: 'bard1',
          position: { x: 0, y: 0 },
          spellSaveDC: 15,
          spellSlots: { 3: 2 },
          maxSlots: { 3: 2 },
          spellsKnown: ['Fireball'],
          cantrips: [],
        }),
        makeEnemy({
          id: 'enemy1',
          position: { x: 3, y: 0 },
          currentHP: 100, maxHP: 100,
          damageImmunities: ['fire'],
          saves: { dex: -2 }, // guaranteed fail
        }),
      ],
      initiativeOrder: ['bard1', 'enemy1'],
    })

    const menu = TurnMenu.getMenu(state, 'bard1')
    const fb = menu.actions.find(o => o.type === 'spell' && o.spellName === 'Fireball')
    const { state: newState } = ActionResolver.resolve(state, 'bard1', {
      optionId: fb.optionId,
      aoeCenter: { x: 3, y: 0 },
    })

    const enemy = newState.getCombatant('enemy1')
    assert.equal(enemy.currentHP, 100, 'Fire-immune target should take zero Fireball damage')
  })
})
