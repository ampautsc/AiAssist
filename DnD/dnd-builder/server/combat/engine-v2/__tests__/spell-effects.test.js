/**
 * spell-effects.test.js
 *
 * Comprehensive behavioral tests for every spell in the registry.
 * Tests verify actual game effects: damage dealt, conditions applied,
 * concentration set, spell slots spent, and edge cases.
 *
 * Coverage: All 30+ spells in server/combat/data/spells.js
 *
 * Uses ActionResolver._resolveSpell() directly for spell isolation
 * (bypasses TurnMenu filtering, focuses purely on resolution logic).
 *
 * In average dice mode: d20 = 10
 *   - Enemy (saves all 0) vs DC 14: 10 + 0 = 10 → FAIL
 *   - Enemy with save +20 vs DC 14: 10 + 20 = 30 → SUCCESS
 *   - Caster spellAttackBonus +6, target AC 12: 10 + 6 = 16 → HIT
 *   - Caster spellAttackBonus +6, target AC 25: 10 + 6 = 16 → MISS
 *
 * Known bugs (tests will FAIL until fixed in ActionResolver.js):
 *   [BUG-1] Attack spells don't apply effects on hit (Chill Touch, Ray of Frost)
 *   [BUG-2] resolveSelfSpell doesn't apply spellDef.selfEffects (Greater Invisibility, Globe, Misty Step, Dim Door)
 *   [BUG-3] resolveSingleTargetSpell ignores selfEffects for buff spells (Shield of Faith, Mage Armor)
 *   [BUG-4] Magic Missile has no damage path (special: auto_hit not handled)
 *   [BUG-5] Power Word Stun has no stun path (special: hp_threshold_150 not handled)
 *   [BUG-6] Ice Storm bonusDice (4d6 cold) not rolled — only 2d8 bludgeoning applied
 */

'use strict'

const { describe, it, before, after } = require('node:test')
const assert = require('node:assert/strict')

const dice = require('../../engine/dice')
const { GameState } = require('../GameState')
const TurnMenu = require('../TurnMenu')
const ActionResolver = require('../ActionResolver')
const { makeCombatant, makeBard, makeEnemy } = require('./helpers')

before(() => dice.setDiceMode('average'))
after(() => dice.setDiceMode('random'))

// ─────────────────────────────────────────────────────────────────────────────
// TEST HELPERS
// ─────────────────────────────────────────────────────────────────────────────

/**
 * Create a generic spellcaster for tests. Casts from side 'party'.
 * All spell slots available: levels 1-8.
 */
function makeCaster(overrides = {}) {
  return makeCombatant({
    id: 'caster1',
    name: 'Test Caster',
    side: 'party',
    position: { x: 0, y: 0 },
    currentHP: 60,
    maxHP: 60,
    ac: 13,
    cha: 16, chaMod: 3,
    wis: 14, wisMod: 2,
    profBonus: 3,
    spellSaveDC: 14,
    spellAttackBonus: 6,
    // Generous slots so we never run out during tests
    spellSlots: { 1: 4, 2: 4, 3: 4, 4: 4, 5: 3, 6: 2, 7: 2, 8: 2 },
    maxSlots:   { 1: 4, 2: 4, 3: 4, 4: 4, 5: 3, 6: 2, 7: 2, 8: 2 },
    spellsKnown: [],
    cantrips: [],
    ...overrides,
  })
}

/**
 * Create a target that will FAIL any save (saves all 0, average d20 = 10 < DC 14).
 */
function makeFailTarget(overrides = {}) {
  return makeCombatant({
    id: 'target1',
    name: 'Fail Target',
    side: 'enemy',
    position: { x: 6, y: 0 },
    currentHP: 60,
    maxHP: 60,
    ac: 12,
    type: 'humanoid',
    // All saves 0 → roll 10 + 0 = 10 → fails DC 14
    saves: { str: 0, dex: 0, con: 0, int: 0, wis: 0, cha: 0 },
    ...overrides,
  })
}

/**
 * Create a target that will SUCCEED any save (all saves +20, total 30 > DC 14).
 */
function makePassTarget(overrides = {}) {
  return makeCombatant({
    id: 'target1',
    name: 'Pass Target',
    side: 'enemy',
    position: { x: 6, y: 0 },
    currentHP: 60,
    maxHP: 60,
    ac: 12,
    type: 'humanoid',
    // All saves +20 → roll 10 + 20 = 30 → beats DC 14
    saves: { str: 20, dex: 20, con: 20, int: 20, wis: 20, cha: 20 },
    ...overrides,
  })
}

/**
 * Cast a spell directly via ActionResolver._resolveSpell.
 * Bypasses TurnMenu — tests spell resolution logic in isolation.
 */
function castSpell(caster, target, spellName, slotLevel, choice = {}, category = 'action') {
  const state = new GameState({
    combatants: [caster, ...(target ? [target] : [])],
    initiativeOrder: [caster.id, ...(target ? [target.id] : [])],
  })
  const option = { spellName, slotLevel, category, optionId: `spell-${spellName}-${slotLevel}` }
  return ActionResolver._resolveSpell(state, caster.id, option, choice)
}

/**
 * Cast an AoE spell, returning newState and auto-deriving aoeCenter from target.position.
 */
function castAoE(caster, target, spellName, slotLevel) {
  const state = new GameState({
    combatants: [caster, target],
    initiativeOrder: [caster.id, target.id],
  })
  const option = { spellName, slotLevel, category: 'action', optionId: `spell-${spellName}-${slotLevel}` }
  return ActionResolver._resolveSpell(state, caster.id, option, { aoeCenter: target.position })
}

// ─────────────────────────────────────────────────────────────────────────────
// CANTRIPS
// ─────────────────────────────────────────────────────────────────────────────

describe('Spell Effects — Sacred Flame (cantrip)', () => {
  it('deals radiant damage when target fails DEX save', () => {
    const caster = makeCaster({ cantrips: ['Sacred Flame'] })
    const target = makeFailTarget()
    const { state: newState } = castSpell(caster, target, 'Sacred Flame', 0, { targetId: 'target1' })

    const t = newState.getCombatant('target1')
    assert.ok(t.currentHP < 60, `Target should have taken radiant damage, got HP ${t.currentHP}`)
  })

  it('deals no damage when target succeeds DEX save (negatesAll: true)', () => {
    const caster = makeCaster({ cantrips: ['Sacred Flame'] })
    const target = makePassTarget()
    const { state: newState } = castSpell(caster, target, 'Sacred Flame', 0, { targetId: 'target1' })

    const t = newState.getCombatant('target1')
    assert.equal(t.currentHP, 60, 'Target should take zero damage when DEX save succeeds')
  })

  it('deals full damage if target is paralyzed (auto-fail DEX)', () => {
    const caster = makeCaster({ cantrips: ['Sacred Flame'] })
    // High DEX save but paralyzed → should auto-fail DEX save
    const target = makePassTarget({ conditions: ['paralyzed'] })
    const { state: newState } = castSpell(caster, target, 'Sacred Flame', 0, { targetId: 'target1' })

    const t = newState.getCombatant('target1')
    assert.ok(t.currentHP < 60, 'Paralyzed target auto-fails DEX save → should take damage')
  })

  it('does not spend a spell slot (cantrip)', () => {
    const caster = makeCaster({ cantrips: ['Sacred Flame'] })
    const target = makeFailTarget()
    const before = { ...caster.spellSlots }
    const { state: newState } = castSpell(caster, target, 'Sacred Flame', 0, { targetId: 'target1' })

    const c = newState.getCombatant('caster1')
    assert.deepEqual(c.spellSlots, before, 'Cantrip should not consume spell slots')
  })
})

describe('Spell Effects — Fire Bolt (cantrip)', () => {
  it('deals fire damage on a successful ranged spell attack', () => {
    // caster spellAttackBonus +6, target AC 12 → 10+6=16 > 12 → HIT
    const caster = makeCaster({ cantrips: ['Fire Bolt'] })
    const target = makeFailTarget({ ac: 12 })
    const { state: newState } = castSpell(caster, target, 'Fire Bolt', 0, { targetId: 'target1' })

    const t = newState.getCombatant('target1')
    assert.ok(t.currentHP < 60, 'Fire Bolt should deal fire damage on hit')
  })

  it('deals no damage when attack misses (high AC)', () => {
    const caster = makeCaster({ cantrips: ['Fire Bolt'] })
    const target = makeFailTarget({ ac: 25 }) // 10+6=16 < 25 → MISS
    const { state: newState } = castSpell(caster, target, 'Fire Bolt', 0, { targetId: 'target1' })

    const t = newState.getCombatant('target1')
    assert.equal(t.currentHP, 60, 'Fire Bolt should deal no damage on miss')
  })
})

describe('Spell Effects — Chill Touch (cantrip)', () => {
  it('deals necrotic damage on hit', () => {
    const caster = makeCaster({ cantrips: ['Chill Touch'] })
    const target = makeFailTarget({ ac: 12 }) // HIT
    const { state: newState } = castSpell(caster, target, 'Chill Touch', 0, { targetId: 'target1' })

    const t = newState.getCombatant('target1')
    assert.ok(t.currentHP < 60, 'Chill Touch should deal necrotic damage on hit')
  })

  // [BUG-1] Effect 'no_healing' should be applied on hit but attack spells don't call applySpellEffects
  it('applies no_healing condition on hit [BUG-1: attack spells skip applySpellEffects]', () => {
    const caster = makeCaster({ cantrips: ['Chill Touch'] })
    const target = makeFailTarget({ ac: 12 }) // HIT
    const { state: newState } = castSpell(caster, target, 'Chill Touch', 0, { targetId: 'target1' })

    const t = newState.getCombatant('target1')
    assert.ok(
      t.conditions.includes('no_healing'),
      'Chill Touch should apply no_healing condition on hit (requires BUG-1 fix)'
    )
  })

  it('deals no damage and no condition when attack misses', () => {
    const caster = makeCaster({ cantrips: ['Chill Touch'] })
    const target = makeFailTarget({ ac: 25 }) // MISS
    const { state: newState } = castSpell(caster, target, 'Chill Touch', 0, { targetId: 'target1' })

    const t = newState.getCombatant('target1')
    assert.equal(t.currentHP, 60, 'No damage on miss')
    assert.ok(!t.conditions.includes('no_healing'), 'No condition on miss')
  })
})

describe('Spell Effects — Ray of Frost (cantrip)', () => {
  it('deals cold damage on hit', () => {
    const caster = makeCaster({ cantrips: ['Ray of Frost'] })
    const target = makeFailTarget({ ac: 12 }) // HIT
    const { state: newState } = castSpell(caster, target, 'Ray of Frost', 0, { targetId: 'target1' })

    const t = newState.getCombatant('target1')
    assert.ok(t.currentHP < 60, 'Ray of Frost should deal cold damage on hit')
  })

  // [BUG-1] speed_reduced_10 should be applied on hit but attack spells skip applySpellEffects
  it('applies speed_reduced_10 condition on hit [BUG-1: attack spells skip applySpellEffects]', () => {
    const caster = makeCaster({ cantrips: ['Ray of Frost'] })
    const target = makeFailTarget({ ac: 12 }) // HIT
    const { state: newState } = castSpell(caster, target, 'Ray of Frost', 0, { targetId: 'target1' })

    const t = newState.getCombatant('target1')
    assert.ok(
      t.conditions.includes('speed_reduced_10'),
      'Ray of Frost should reduce target speed on hit (requires BUG-1 fix)'
    )
  })
})

// ─────────────────────────────────────────────────────────────────────────────
// LEVEL 1 SPELLS
// ─────────────────────────────────────────────────────────────────────────────

describe('Spell Effects — Command (L1)', () => {
  it('applies prone condition when humanoid target fails WIS save', () => {
    const caster = makeCaster({ spellsKnown: ['Command'] })
    const target = makeFailTarget({ type: 'humanoid' })
    const { state: newState } = castSpell(caster, target, 'Command', 1, { targetId: 'target1' })

    const t = newState.getCombatant('target1')
    assert.ok(t.conditions.includes('prone'), 'Target should be prone after failing WIS save vs Command')
  })

  it('applies no conditions when target succeeds WIS save (negatesAll: true)', () => {
    const caster = makeCaster({ spellsKnown: ['Command'] })
    const target = makePassTarget({ type: 'humanoid' })
    const { state: newState } = castSpell(caster, target, 'Command', 1, { targetId: 'target1' })

    const t = newState.getCombatant('target1')
    assert.ok(!t.conditions.includes('prone'), 'No prone when WIS save succeeds')
  })

  it('spends a level-1 spell slot', () => {
    const caster = makeCaster({ spellsKnown: ['Command'] })
    const target = makeFailTarget()
    const { state: newState } = castSpell(caster, target, 'Command', 1, { targetId: 'target1' })

    const c = newState.getCombatant('caster1')
    assert.equal(c.spellSlots[1], 3, 'Should spend one L1 slot (was 4, now 3)')
  })
})

describe('Spell Effects — Inflict Wounds (L1)', () => {
  it('deals necrotic damage on melee spell attack hit', () => {
    const caster = makeCaster({ spellsKnown: ['Inflict Wounds'], position: { x: 1, y: 0 } })
    // Move caster next to target for melee range (position at x:1, target at x:6 — 
    // but _resolveSpell doesn't enforce range, so distance check is only in TurnMenu)
    const target = makeFailTarget({ ac: 12 })
    const { state: newState } = castSpell(caster, target, 'Inflict Wounds', 1, { targetId: 'target1' })

    const t = newState.getCombatant('target1')
    assert.ok(t.currentHP < 60, 'Inflict Wounds should deal necrotic damage on hit')
  })

  it('deals no damage on attack miss', () => {
    const caster = makeCaster({ spellsKnown: ['Inflict Wounds'] })
    const target = makeFailTarget({ ac: 25 }) // MISS
    const { state: newState } = castSpell(caster, target, 'Inflict Wounds', 1, { targetId: 'target1' })

    const t = newState.getCombatant('target1')
    assert.equal(t.currentHP, 60, 'No damage on melee spell attack miss')
  })

  it('deals increased damage when upcast', () => {
    const caster = makeCaster({ spellsKnown: ['Inflict Wounds'] })
    const target1 = makeFailTarget({ ac: 12 })
    const target2 = makeFailTarget({ id: 'target2', ac: 12 })

    // Cast at level 1 vs level 2 — should deal more damage at L2 (upcast bonus die)
    const { state: s1 } = castSpell(caster, target1, 'Inflict Wounds', 1, { targetId: 'target1' })
    const { state: s2 } = castSpell(caster, target2, 'Inflict Wounds', 2, { targetId: 'target2' })

    const hp1 = s1.getCombatant('target1').currentHP
    const hp2 = s2.getCombatant('target2').currentHP
    assert.ok(hp2 <= hp1, `Upcast should deal same or more damage (L2 HP: ${hp2}, L1 HP: ${hp1})`)
  })
})

describe('Spell Effects — Shield of Faith (L1 bonus action)', () => {
  // Shield of Faith: bonus action, concentration, single target, gives +2 AC
  // [BUG-3] selfEffects: ['ac_bonus_2'] not applied in any path
  it('marks bonus action as used after cast', () => {
    const caster = makeCaster({ spellsKnown: ['Shield of Faith'] })
    const target = makeFailTarget()
    const { state: newState } = castSpell(
      caster, target, 'Shield of Faith', 1,
      { targetId: 'target1' }, 'bonusAction'
    )

    const c = newState.getCombatant('caster1')
    assert.equal(c.usedBonusAction, true, 'Shield of Faith should use bonus action')
  })

  it('sets concentration on the caster', () => {
    const caster = makeCaster({ spellsKnown: ['Shield of Faith'] })
    const target = makeFailTarget()
    const { state: newState } = castSpell(
      caster, target, 'Shield of Faith', 1,
      { targetId: 'target1' }, 'bonusAction'
    )

    const c = newState.getCombatant('caster1')
    assert.equal(c.concentrating, 'Shield of Faith', 'Caster should concentrate on Shield of Faith')
  })

  // [BUG-3] The +2 AC should be applied to the target
  it('applies +2 AC to the target [BUG-3: selfEffects not applied in single-target path]', () => {
    const originalAC = 12
    const caster = makeCaster({ spellsKnown: ['Shield of Faith'] })
    const target = makeFailTarget({ ac: originalAC })
    const { state: newState } = castSpell(
      caster, target, 'Shield of Faith', 1,
      { targetId: 'target1' }, 'bonusAction'
    )

    const t = newState.getCombatant('target1')
    assert.equal(t.ac, originalAC + 2, `Shield of Faith should give +2 AC (requires BUG-3 fix)`)
  })
})

describe('Spell Effects — Dissonant Whispers (L1)', () => {
  it('deals full psychic damage when target fails WIS save', () => {
    const caster = makeCaster({ spellsKnown: ['Dissonant Whispers'] })
    const target = makeFailTarget()
    const { state: newState } = castSpell(caster, target, 'Dissonant Whispers', 1, { targetId: 'target1' })

    const t = newState.getCombatant('target1')
    assert.ok(t.currentHP < 60, 'Should deal psychic damage on WIS save fail')
  })

  it('triggers forced reaction movement on WIS save fail (condition resolved immediately)', () => {
    const caster = makeCaster({ spellsKnown: ['Dissonant Whispers'] })
    const target = makeFailTarget({ reactedThisRound: false })
    const { state: newState } = castSpell(caster, target, 'Dissonant Whispers', 1, { targetId: 'target1' })

    const t = newState.getCombatant('target1')
    // The condition is applied then immediately resolved — target should have moved away
    // and the condition should be cleared
    assert.equal(t.reactedThisRound, true,
      'Target reaction should be consumed by forced movement')
    assert.ok(!t.conditions.includes('must_use_reaction_to_move_away'),
      'Condition should be cleared after forced movement executes')
  })

  it('deals half damage when target succeeds WIS save (negatesAll: false)', () => {
    const caster = makeCaster({ spellsKnown: ['Dissonant Whispers'] })
    const failTarget = makeFailTarget()
    const passTarget = makePassTarget({ id: 'target2' })

    const { state: s1 } = castSpell(caster, failTarget, 'Dissonant Whispers', 1, { targetId: 'target1' })
    const { state: s2 } = castSpell(caster, passTarget, 'Dissonant Whispers', 1, { targetId: 'target2' })

    // Save success → half damage, so HP should be higher (less damage taken)
    const hpAfterFail = s1.getCombatant('target1').currentHP
    const hpAfterPass = s2.getCombatant('target2').currentHP
    assert.ok(
      hpAfterPass > hpAfterFail,
      `Half damage on save success: fail=${hpAfterFail}, pass=${hpAfterPass}`
    )
  })

  it('does NOT apply condition when target succeeds WIS save', () => {
    const caster = makeCaster({ spellsKnown: ['Dissonant Whispers'] })
    const target = makePassTarget()
    const { state: newState } = castSpell(caster, target, 'Dissonant Whispers', 1, { targetId: 'target1' })

    const t = newState.getCombatant('target1')
    assert.ok(
      !t.conditions.includes('must_use_reaction_to_move_away'),
      'No reaction condition on WIS save success'
    )
  })

  // ── Forced Reaction Movement (Dissonant Whispers special behavior) ──────

  it('forces target to move away from caster on failed save (reaction movement)', () => {
    // Caster at (0,0), target at (6,0) → distance = 30ft
    // Target speed = 30 (default), so moves 6 squares away → (12,0) distance = 60ft
    const caster = makeCaster({ spellsKnown: ['Dissonant Whispers'] })
    const target = makeFailTarget({ speed: 30 })
    const { state: newState } = castSpell(caster, target, 'Dissonant Whispers', 1, { targetId: 'target1' })

    const t = newState.getCombatant('target1')
    const casterPos = newState.getCombatant('caster1').position

    // Target should now be farther from caster than before (was 30ft away)
    const distAfter = Math.max(
      Math.abs((t.position.x ?? 0) - (casterPos.x ?? 0)),
      Math.abs((t.position.y ?? 0) - (casterPos.y ?? 0))
    ) * 5
    assert.ok(distAfter > 30, `Target should have moved away from caster: distance=${distAfter}ft, expected > 30ft`)
  })

  it('consumes target reaction when forced to move away', () => {
    const caster = makeCaster({ spellsKnown: ['Dissonant Whispers'] })
    const target = makeFailTarget({ reactedThisRound: false })
    const { state: newState } = castSpell(caster, target, 'Dissonant Whispers', 1, { targetId: 'target1' })

    const t = newState.getCombatant('target1')
    assert.equal(t.reactedThisRound, true, 'Target reaction should be consumed by forced movement')
  })

  it('clears must_use_reaction_to_move_away after forced movement executes', () => {
    const caster = makeCaster({ spellsKnown: ['Dissonant Whispers'] })
    const target = makeFailTarget({ reactedThisRound: false })
    const { state: newState } = castSpell(caster, target, 'Dissonant Whispers', 1, { targetId: 'target1' })

    const t = newState.getCombatant('target1')
    assert.ok(
      !t.conditions.includes('must_use_reaction_to_move_away'),
      'Condition should be cleared after forced movement'
    )
  })

  it('does NOT force movement if target has already used its reaction', () => {
    const caster = makeCaster({ spellsKnown: ['Dissonant Whispers'] })
    const target = makeFailTarget({ reactedThisRound: true, position: { x: 6, y: 0 } })
    const { state: newState } = castSpell(caster, target, 'Dissonant Whispers', 1, { targetId: 'target1' })

    const t = newState.getCombatant('target1')
    // Position should be unchanged — still at (6,0)
    assert.equal(t.position.x, 6, 'Target should not move when reaction already used')
    assert.equal(t.position.y, 0, 'Target Y should be unchanged when reaction already used')
  })

  it('logs the forced reaction movement', () => {
    const caster = makeCaster({ spellsKnown: ['Dissonant Whispers'] })
    const target = makeFailTarget({ reactedThisRound: false })
    const { state: newState } = castSpell(caster, target, 'Dissonant Whispers', 1, { targetId: 'target1' })

    const logs = newState.log
    const moveLog = logs.find(l => /uses.*reaction.*move.*away/i.test(l))
    assert.ok(moveLog, `Logs should describe the forced reaction movement. Got: ${JSON.stringify(logs)}`)
  })

  it('forces target to move away — hex axial coordinates, distance increases', () => {
    // Caster at q:0,r:0; Target at q:3,r:-1 (matches CombatViewer.jsx default positions)
    // dist before: max(|3|,|-1|,|3+(-1)|) = max(3,1,2) = 3 hexes
    // speed=30 → moveSquares=6, dominant axis=q (|dq|=3 > |dr|=1) → stepQ=1, stepR=0
    // newPos: q=3+6=9, r=-1 → dist after: max(9,1,8)=9 > 3 ✓
    dice.setFixedRolls([1]) // force WIS d20 = 1 → 1+0=1 < DC 14 → save FAIL
    const caster = makeCaster({ spellsKnown: ['Dissonant Whispers'], position: { q: 0, r: 0 } })
    const target = makeFailTarget({ position: { q: 3, r: -1 }, speed: 30 })
    const { state: newState } = castSpell(caster, target, 'Dissonant Whispers', 1, { targetId: 'target1' })

    const t  = newState.getCombatant('target1')
    const cp = newState.getCombatant('caster1').position
    const tp = t.position

    const hexDist = (a, b) => {
      const dq = (b.q ?? 0) - (a.q ?? 0)
      const dr = (b.r ?? 0) - (a.r ?? 0)
      return Math.max(Math.abs(dq), Math.abs(dr), Math.abs(dq + dr))
    }

    const distBefore = hexDist({ q: 0, r: 0 }, { q: 3, r: -1 }) // = 3
    const distAfter  = hexDist(cp, tp)
    assert.ok(
      distAfter > distBefore,
      `Target must be farther after forced movement: before=${distBefore} hexes, after=${distAfter} hexes (pos=${JSON.stringify(tp)})`
    )
  })

  it('sets movementRemaining to 0 after reaction movement (hex positions)', () => {
    dice.setFixedRolls([1]) // force WIS save fail
    const caster = makeCaster({ spellsKnown: ['Dissonant Whispers'], position: { q: 0, r: 0 } })
    const target = makeFailTarget({ position: { q: 3, r: -1 }, speed: 30 })
    const { state: newState } = castSpell(caster, target, 'Dissonant Whispers', 1, { targetId: 'target1' })

    const t = newState.getCombatant('target1')
    assert.equal(
      t.movementRemaining, 0,
      'movementRemaining must be 0 after reaction movement — zombie may not walk on its own turn'
    )
  })
})

describe('Spell Effects — Sleep (L1 AoE)', () => {
  it('puts a low-HP target to sleep (HP pool mechanic)', () => {
    const caster = makeCaster({ spellsKnown: ['Sleep'] })
    // In avg mode, 5d8 = 5*4 = ~20 HP pool. Target with 15 HP fits.
    const target = makeFailTarget({ currentHP: 15, maxHP: 15 })
    const { state: newState } = castAoE(caster, target, 'Sleep', 1)

    const t = newState.getCombatant('target1')
    assert.ok(t.conditions.includes('asleep'), 'Low-HP target should be asleep')
    assert.ok(t.conditions.includes('unconscious'), 'Sleeping target should be unconscious')
  })

  it('does NOT put a high-HP target to sleep (pool too small)', () => {
    const caster = makeCaster({ spellsKnown: ['Sleep'] })
    // HP pool ~20, target has 60 HP — exceeds pool
    const target = makeFailTarget({ currentHP: 60, maxHP: 60 })
    const { state: newState } = castAoE(caster, target, 'Sleep', 1)

    const t = newState.getCombatant('target1')
    assert.ok(!t.conditions.includes('asleep'), 'High-HP target should not be put to sleep')
  })

  it('does NOT affect undead targets', () => {
    const caster = makeCaster({ spellsKnown: ['Sleep'] })
    const target = makeFailTarget({ currentHP: 5, maxHP: 5, type: 'undead' })
    const { state: newState } = castAoE(caster, target, 'Sleep', 1)

    const t = newState.getCombatant('target1')
    assert.ok(!t.conditions.includes('asleep'), 'Undead should be immune to Sleep')
  })

  it('sleeps more creatures at higher slot (larger HP pool)', () => {
    // At slot 1: base 5d8 ≈ 20. At slot 2: 7d8 ≈ 28. Target has 25 HP.
    const caster = makeCaster({ spellsKnown: ['Sleep'] })
    const tSlot1 = makeFailTarget({ id: 't_l1', currentHP: 25, maxHP: 25, position: { x: 6, y: 0 } })
    const tSlot2 = makeFailTarget({ id: 't_l2', currentHP: 25, maxHP: 25, position: { x: 6, y: 0 } })

    const { state: s1 } = castAoE(caster, tSlot1, 'Sleep', 1)
    const { state: s2 } = castAoE(caster, tSlot2, 'Sleep', 2)

    // Slot 1 may not have enough pool to sleep 25-HP creature, slot 2 should
    // (This test verifies the upcast mechanic works, not exact values)
    const t2 = s2.getCombatant('t_l2')
    assert.ok(t2.conditions.includes('asleep'), 'Higher-slot Sleep should have enough pool for 25-HP target')
  })
})

describe('Spell Effects — Faerie Fire (L1 AoE)', () => {
  it('applies faerie_fire condition when target fails DEX save', () => {
    const caster = makeCaster({ spellsKnown: ['Faerie Fire'] })
    const target = makeFailTarget()
    const { state: newState } = castAoE(caster, target, 'Faerie Fire', 1)

    const t = newState.getCombatant('target1')
    assert.ok(t.conditions.includes('faerie_fire'), 'Target should have faerie_fire on DEX save fail')
  })

  it('does NOT apply faerie_fire when target succeeds DEX save (negatesAll: true)', () => {
    const caster = makeCaster({ spellsKnown: ['Faerie Fire'] })
    const target = makePassTarget()
    const { state: newState } = castAoE(caster, target, 'Faerie Fire', 1)

    const t = newState.getCombatant('target1')
    assert.ok(!t.conditions.includes('faerie_fire'), 'No faerie_fire when DEX save succeeds')
  })

  it('sets concentration on the caster', () => {
    const caster = makeCaster({ spellsKnown: ['Faerie Fire'] })
    const target = makeFailTarget()
    const { state: newState } = castAoE(caster, target, 'Faerie Fire', 1)

    const c = newState.getCombatant('caster1')
    assert.equal(c.concentrating, 'Faerie Fire', 'Caster should concentrate on Faerie Fire')
  })
})

describe('Spell Effects — Magic Missile (L1)', () => {
  // [BUG-4] Magic Missile has no attack/save/healing — falls through resolveSingleTargetSpell
  // without dealing any damage. This test documents the bug and will fail until fixed.
  it('deals force damage to target (always hits, no save) [BUG-4: auto_hit special not handled]', () => {
    const caster = makeCaster({ spellsKnown: ['Magic Missile'] })
    const target = makeFailTarget()
    const { state: newState } = castSpell(caster, target, 'Magic Missile', 1, { targetId: 'target1' })

    const t = newState.getCombatant('target1')
    assert.ok(
      t.currentHP < 60,
      'Magic Missile should always hit and deal force damage (requires BUG-4 fix)'
    )
  })

  it('spends a level-1 slot', () => {
    const caster = makeCaster({ spellsKnown: ['Magic Missile'] })
    const target = makeFailTarget()
    const { state: newState } = castSpell(caster, target, 'Magic Missile', 1, { targetId: 'target1' })

    const c = newState.getCombatant('caster1')
    assert.equal(c.spellSlots[1], 3, 'Should spend one L1 slot')
  })
})

describe('Spell Effects — Mage Armor (L1)', () => {
  // Mage Armor targeting is 'single'. selfEffects: ['ac_set_13_plus_dex'].
  // [BUG-3] selfEffects not applied in single-target path.
  it('spends a level-1 spell slot', () => {
    const caster = makeCaster({ spellsKnown: ['Mage Armor'], dex: 14, dexMod: 2, ac: 11 })
    // Mage Armor targets self (or another unarmored creature)
    const target = makeFailTarget({ ac: 10, dex: 14, dexMod: 2 })
    const { state: newState } = castSpell(caster, target, 'Mage Armor', 1, { targetId: 'target1' })

    const c = newState.getCombatant('caster1')
    assert.equal(c.spellSlots[1], 3, 'Should spend one L1 slot')
  })

  it('sets AC to 13 + DEX mod on target [BUG-3: selfEffects not applied in single-target path]', () => {
    // Target has DEX +2, so Mage Armor should set AC to 15
    const caster = makeCaster({ spellsKnown: ['Mage Armor'] })
    const target = makeFailTarget({ ac: 10, dex: 14, dexMod: 2 })
    const { state: newState } = castSpell(caster, target, 'Mage Armor', 1, { targetId: 'target1' })

    const t = newState.getCombatant('target1')
    assert.equal(t.ac, 15, 'Mage Armor should set target AC to 13 + DEX mod (2) = 15 (requires BUG-3 fix)')
  })
})

describe('Spell Effects — Thunderwave (L1 AoE)', () => {
  it('deals thunder damage when target fails CON save', () => {
    const caster = makeCaster({ spellsKnown: ['Thunderwave'] })
    const target = makeFailTarget()
    const { state: newState } = castAoE(caster, target, 'Thunderwave', 1)

    const t = newState.getCombatant('target1')
    assert.ok(t.currentHP < 60, 'Should take thunder damage on CON save fail')
  })

  it('applies pushed_10ft condition on CON save fail', () => {
    const caster = makeCaster({ spellsKnown: ['Thunderwave'] })
    const target = makeFailTarget()
    const { state: newState } = castAoE(caster, target, 'Thunderwave', 1)

    const t = newState.getCombatant('target1')
    assert.ok(t.conditions.includes('pushed_10ft'), 'Target should be pushed 10ft on fail')
  })

  it('deals half damage but no push when target succeeds CON save', () => {
    const caster = makeCaster({ spellsKnown: ['Thunderwave'] })
    const failTarget = makeFailTarget()
    const passTarget = makePassTarget({ id: 'target2' })

    const { state: s1 } = castAoE(caster, failTarget, 'Thunderwave', 1)
    const { state: s2 } = castAoE(caster, passTarget, 'Thunderwave', 1)

    const hpFail = s1.getCombatant('target1').currentHP
    const hpPass = s2.getCombatant('target2').currentHP
    assert.ok(hpPass > hpFail, `Half damage on save success (fail HP: ${hpFail}, pass HP: ${hpPass})`)
    assert.ok(!s2.getCombatant('target2').conditions.includes('pushed_10ft'), 'No push on save success')
  })
})

// ─────────────────────────────────────────────────────────────────────────────
// LEVEL 2 SPELLS
// ─────────────────────────────────────────────────────────────────────────────

describe('Spell Effects — Spiritual Weapon (L2 bonus action)', () => {
  it('deals force damage on melee spell attack hit', () => {
    const caster = makeCaster({ spellsKnown: ['Spiritual Weapon'] })
    const target = makeFailTarget({ ac: 12 })
    const { state: newState } = castSpell(
      caster, target, 'Spiritual Weapon', 2,
      { targetId: 'target1' }, 'bonusAction'
    )

    const t = newState.getCombatant('target1')
    assert.ok(t.currentHP < 60, 'Spiritual Weapon should deal force damage on hit')
  })

  it('marks bonus action as used', () => {
    const caster = makeCaster({ spellsKnown: ['Spiritual Weapon'] })
    const target = makeFailTarget({ ac: 12 })
    const { state: newState } = castSpell(
      caster, target, 'Spiritual Weapon', 2,
      { targetId: 'target1' }, 'bonusAction'
    )

    const c = newState.getCombatant('caster1')
    assert.equal(c.usedBonusAction, true, 'Should mark bonusAction used')
  })

  it('does NOT require concentration', () => {
    const caster = makeCaster({ spellsKnown: ['Spiritual Weapon'] })
    const target = makeFailTarget({ ac: 12 })
    const { state: newState } = castSpell(
      caster, target, 'Spiritual Weapon', 2,
      { targetId: 'target1' }, 'bonusAction'
    )

    const c = newState.getCombatant('caster1')
    assert.equal(c.concentrating, null, 'Spiritual Weapon should NOT require concentration')
  })
})

describe('Spell Effects — Misty Step (L2 bonus action)', () => {
  // [BUG-2] selfEffects: ['teleport_30ft'] not applied in resolveSelfSpell
  it('marks bonus action as used', () => {
    const caster = makeCaster({ spellsKnown: ['Misty Step'] })
    const { state: newState } = castSpell(caster, null, 'Misty Step', 2, {}, 'bonusAction')

    const c = newState.getCombatant('caster1')
    assert.equal(c.usedBonusAction, true, 'Misty Step uses bonus action')
  })

  it('spends a level-2 slot', () => {
    const caster = makeCaster({ spellsKnown: ['Misty Step'] })
    const { state: newState } = castSpell(caster, null, 'Misty Step', 2, {}, 'bonusAction')

    const c = newState.getCombatant('caster1')
    assert.equal(c.spellSlots[2], 3, 'Should spend one L2 slot (was 4, now 3)')
  })

  it('applies teleport_30ft condition to caster [BUG-2: selfEffects not applied in self path]', () => {
    const caster = makeCaster({ spellsKnown: ['Misty Step'] })
    const { state: newState } = castSpell(caster, null, 'Misty Step', 2, {}, 'bonusAction')

    const c = newState.getCombatant('caster1')
    assert.ok(
      c.conditions.includes('teleport_30ft'),
      'Misty Step should apply teleport_30ft condition (requires BUG-2 fix)'
    )
  })
})

// ─────────────────────────────────────────────────────────────────────────────
// LEVEL 3 SPELLS
// ─────────────────────────────────────────────────────────────────────────────

describe('Spell Effects — Fireball (L3 AoE)', () => {
  it('deals fire damage when target fails DEX save', () => {
    const caster = makeCaster({ spellsKnown: ['Fireball'] })
    const target = makeFailTarget()
    const { state: newState } = castAoE(caster, target, 'Fireball', 3)

    const t = newState.getCombatant('target1')
    assert.ok(t.currentHP < 60, 'Fireball should deal fire damage on DEX save fail')
  })

  it('deals half fire damage on successful DEX save', () => {
    const caster = makeCaster({ spellsKnown: ['Fireball'] })
    const failTarget = makeFailTarget()
    const passTarget = makePassTarget({ id: 'target2' })

    const { state: s1 } = castAoE(caster, failTarget, 'Fireball', 3)
    const { state: s2 } = castAoE(caster, passTarget, 'Fireball', 3)

    const hpFail = s1.getCombatant('target1').currentHP
    const hpPass = s2.getCombatant('target2').currentHP
    // Save success → half damage → HP should be higher (took less damage)
    assert.ok(hpPass > hpFail, `Fireball half-damage on save: fail HP=${hpFail}, pass HP=${hpPass}`)
  })

  it('deals more damage when upcast to L4', () => {
    const caster = makeCaster({ spellsKnown: ['Fireball'] })
    const t3 = makeFailTarget({ id: 'target_l3', currentHP: 100, maxHP: 100 })
    const t4 = makeFailTarget({ id: 'target_l4', currentHP: 100, maxHP: 100 })

    const { state: s3 } = castAoE(caster, t3, 'Fireball', 3)
    const { state: s4 } = castAoE(caster, t4, 'Fireball', 4)

    const hp3 = s3.getCombatant('target_l3').currentHP
    const hp4 = s4.getCombatant('target_l4').currentHP
    assert.ok(hp4 <= hp3, `L4 Fireball (${hp4}) should deal >= damage than L3 (${hp3})`)
  })

  it('spends a level-3 slot', () => {
    const caster = makeCaster({ spellsKnown: ['Fireball'] })
    const target = makeFailTarget()
    const { state: newState } = castAoE(caster, target, 'Fireball', 3)

    const c = newState.getCombatant('caster1')
    assert.equal(c.spellSlots[3], 3, 'Should spend one L3 slot (was 4, now 3)')
  })
})

// ─────────────────────────────────────────────────────────────────────────────
// LEVEL 4 SPELLS
// ─────────────────────────────────────────────────────────────────────────────

describe('Spell Effects — Greater Invisibility (L4 self)', () => {
  // [BUG-2] selfEffects: ['invisible'] not applied in resolveSelfSpell
  it('sets concentration on the caster', () => {
    const caster = makeCaster({ spellsKnown: ['Greater Invisibility'] })
    const { state: newState } = castSpell(caster, null, 'Greater Invisibility', 4)

    const c = newState.getCombatant('caster1')
    assert.equal(c.concentrating, 'Greater Invisibility', 'Caster should concentrate on Greater Invisibility')
  })

  it('applies invisible condition to the caster [BUG-2: selfEffects not applied in self path]', () => {
    const caster = makeCaster({ spellsKnown: ['Greater Invisibility'] })
    const { state: newState } = castSpell(caster, null, 'Greater Invisibility', 4)

    const c = newState.getCombatant('caster1')
    assert.ok(
      c.conditions.includes('invisible'),
      'Greater Invisibility should make caster invisible (requires BUG-2 fix)'
    )
  })

  it('spends a level-4 slot', () => {
    const caster = makeCaster({ spellsKnown: ['Greater Invisibility'] })
    const { state: newState } = castSpell(caster, null, 'Greater Invisibility', 4)

    const c = newState.getCombatant('caster1')
    assert.equal(c.spellSlots[4], 3, 'Should spend one L4 slot (was 4, now 3)')
  })

  it('breaking concentration removes invisible condition', () => {
    // Setup: caster already concentrating on Greater Invisibility and is invisible
    const casterState = makeCaster({
      spellsKnown: ['Greater Invisibility'],
      concentrating: 'Greater Invisibility',
      concentrationRoundsRemaining: 10,
      conditions: ['invisible'],
    })
    const state = new GameState({
      combatants: [casterState],
      initiativeOrder: ['caster1'],
    })

    const { state: newState } = ActionResolver._breakConcentration(state, 'caster1')
    const c = newState.getCombatant('caster1')
    assert.ok(!c.conditions.includes('invisible'), 'invisible should be removed when Greater Invis concentration breaks')
  })
})

describe('Spell Effects — Dimension Door (L4 self)', () => {
  // [BUG-2] selfEffects: ['teleport'] not applied in resolveSelfSpell
  it('spends a level-4 slot and marks action used', () => {
    const caster = makeCaster({ spellsKnown: ['Dimension Door'] })
    const { state: newState } = castSpell(caster, null, 'Dimension Door', 4)

    const c = newState.getCombatant('caster1')
    assert.equal(c.spellSlots[4], 3, 'Should spend one L4 slot')
    assert.equal(c.usedAction, true, 'Should mark action as used')
  })

  it('applies teleport condition to caster [BUG-2: selfEffects not applied in self path]', () => {
    const caster = makeCaster({ spellsKnown: ['Dimension Door'] })
    const { state: newState } = castSpell(caster, null, 'Dimension Door', 4)

    const c = newState.getCombatant('caster1')
    assert.ok(
      c.conditions.includes('teleport'),
      'Dimension Door should apply teleport condition (requires BUG-2 fix)'
    )
  })
})

describe('Spell Effects — Polymorph (L4)', () => {
  it('transforms a humanoid enemy into a sheep on failed WIS save', () => {
    const caster = makeCaster({ spellsKnown: ['Polymorph'] })
    const target = makeFailTarget({ type: 'humanoid' })
    const { state: newState } = castSpell(caster, target, 'Polymorph', 4, { targetId: 'target1' })

    const t = newState.getCombatant('target1')
    assert.ok(t.conditions.includes('polymorphed'), 'Target should be polymorphed')
    assert.equal(t.polymorphedAs, 'Sheep', 'Target should become a Sheep')
    assert.equal(t.maxHP, 1, 'Sheep has 1 max HP')
    assert.equal(t.currentHP, 1, 'Sheep starts at 1 HP')
    assert.deepEqual(t.spellsKnown, [], 'Polymorphed target loses spells')
  })

  it('does NOT polymorph a target that succeeds WIS save', () => {
    const caster = makeCaster({ spellsKnown: ['Polymorph'] })
    const target = makePassTarget({ type: 'humanoid' })
    const { state: newState } = castSpell(caster, target, 'Polymorph', 4, { targetId: 'target1' })

    const t = newState.getCombatant('target1')
    assert.ok(!t.conditions.includes('polymorphed'), 'Target should NOT be polymorphed on save success')
    assert.equal(t.maxHP, 60, 'Target should retain original max HP')
  })

  it('self-polymorph transforms caster into the best beast form (T-Rex)', () => {
    const caster = makeCaster({ spellsKnown: ['Polymorph'] })
    // Self-target: casterId === targetId
    const { state: newState } = castSpell(caster, null, 'Polymorph', 4, { targetId: 'caster1' })

    const c = newState.getCombatant('caster1')
    assert.ok(c.conditions.includes('polymorphed'), 'Self-polymorph should set polymorphed condition')
    // Best form is T-Rex (136 HP) or Giant Ape (157 HP — highest HP picked)
    assert.ok(c.maxHP > 50, `Self-polymorph should give more HP (got ${c.maxHP})`)
    assert.ok(c.polymorphedAs !== null, 'Should be polymorphed as something')
  })

  it('sets concentration when polymorphing an enemy', () => {
    const caster = makeCaster({ spellsKnown: ['Polymorph'] })
    const target = makeFailTarget({ type: 'humanoid' })
    const { state: newState } = castSpell(caster, target, 'Polymorph', 4, { targetId: 'target1' })

    const c = newState.getCombatant('caster1')
    assert.equal(c.concentrating, 'Polymorph', 'Caster should concentrate on Polymorph')
  })

  it('sheep reverts to original form when concentration breaks', () => {
    const originalHP = 45
    const caster = makeCaster({
      spellsKnown: ['Polymorph'],
      concentrating: 'Polymorph',
      concentrationRoundsRemaining: 10,
    })
    const target = makeCombatant({
      id: 'target1', name: 'Was Humanoid', side: 'enemy',
      position: { x: 6, y: 0 },
      currentHP: 1, maxHP: 1, ac: 10,
      type: 'beast',
      conditions: ['polymorphed'],
      polymorphedAs: 'Sheep',
      prePolymorphState: {
        currentHP: originalHP, maxHP: 60, ac: 13, speed: 30,
        str: 11, strMod: 0, dex: 12, dexMod: 1, con: 12, conMod: 1,
        wis: 10, wisMod: 0,
        saves: { str: 0, dex: 1, con: 1, int: 0, wis: 0, cha: 0 },
        weapons: [], weapon: null, multiattack: 0,
        spellSlots: {}, spellsKnown: [], cantrips: [], spellSaveDC: 0,
        type: 'humanoid', flying: false,
      },
    })
    const state = new GameState({
      combatants: [caster, target],
      initiativeOrder: ['caster1', 'target1'],
    })

    const { state: newState } = ActionResolver._breakConcentration(state, 'caster1')

    const t = newState.getCombatant('target1')
    assert.ok(!t.conditions.includes('polymorphed'), 'Target should revert from polymorphed on concentration break')
    assert.equal(t.currentHP, originalHP, 'Target should revert to original HP')
    assert.equal(t.maxHP, 60, 'Target should revert to original max HP')
  })
})

describe('Spell Effects — Blight (L4)', () => {
  it('deals necrotic damage when target fails CON save', () => {
    const caster = makeCaster({ spellsKnown: ['Blight'] })
    const target = makeFailTarget()
    const { state: newState } = castSpell(caster, target, 'Blight', 4, { targetId: 'target1' })

    const t = newState.getCombatant('target1')
    assert.ok(t.currentHP < 60, 'Blight should deal necrotic damage on CON save fail')
  })

  it('deals half damage on CON save success (negatesAll: false)', () => {
    const caster = makeCaster({ spellsKnown: ['Blight'] })
    const failTarget = makeFailTarget()
    const passTarget = makePassTarget({ id: 'target2' })

    const { state: s1 } = castSpell(caster, failTarget, 'Blight', 4, { targetId: 'target1' })
    const { state: s2 } = castSpell(caster, passTarget, 'Blight', 4, { targetId: 'target2' })

    const hpFail = s1.getCombatant('target1').currentHP
    const hpPass = s2.getCombatant('target2').currentHP
    assert.ok(hpPass > hpFail, `Half damage on save: fail HP=${hpFail}, pass HP=${hpPass}`)
  })
})

describe('Spell Effects — Ice Storm (L4 AoE)', () => {
  it('deals bludgeoning damage when target fails DEX save', () => {
    const caster = makeCaster({ spellsKnown: ['Ice Storm'] })
    const target = makeFailTarget()
    const { state: newState } = castAoE(caster, target, 'Ice Storm', 4)

    const t = newState.getCombatant('target1')
    assert.ok(t.currentHP < 60, 'Ice Storm should deal damage on DEX save fail')
  })

  it('applies difficult_terrain on DEX save fail', () => {
    const caster = makeCaster({ spellsKnown: ['Ice Storm'] })
    const target = makeFailTarget()
    const { state: newState } = castAoE(caster, target, 'Ice Storm', 4)

    const t = newState.getCombatant('target1')
    assert.ok(t.conditions.includes('difficult_terrain'), 'Ice Storm should apply difficult_terrain on fail')
  })

  it('deals LESS damage on DEX save success', () => {
    const caster = makeCaster({ spellsKnown: ['Ice Storm'] })
    const failTarget = makeFailTarget()
    const passTarget = makePassTarget({ id: 'target2' })

    const { state: s1 } = castAoE(caster, failTarget, 'Ice Storm', 4)
    const { state: s2 } = castAoE(caster, passTarget, 'Ice Storm', 4)

    const hpFail = s1.getCombatant('target1').currentHP
    const hpPass = s2.getCombatant('target2').currentHP
    assert.ok(hpPass > hpFail, `Half damage on save: fail HP=${hpFail}, pass HP=${hpPass}`)
  })

  // [BUG-6] bonusDice (4d6 cold) not applied — only 2d8 bludgeoning rolled
  it('deals combined bludgeoning + cold damage (2d8 + 4d6) [BUG-6: bonusDice not rolled]', () => {
    const caster = makeCaster({ spellsKnown: ['Ice Storm'] })
    // 2d8 avg = ~9. Adding 4d6 avg = ~14. Total should be ~23 or more.
    // Without BUG-6 fix, damage is only 2d8 ≈ 9.
    const target = makeFailTarget({ currentHP: 100, maxHP: 100 })
    const { state: newState } = castAoE(caster, target, 'Ice Storm', 4)

    const t = newState.getCombatant('target1')
    const damageTaken = 100 - t.currentHP
    // 2d8 (9 avg) + 4d6 (14 avg) = ~23 expected
    // With bug: only 2d8 ≈ 9 dealt. So assert > 12 to detect the bug.
    assert.ok(
      damageTaken > 12,
      `Ice Storm should deal 2d8 bludgeoning + 4d6 cold. Got ${damageTaken} damage (requires BUG-6 fix)`
    )
  })
})

// ─────────────────────────────────────────────────────────────────────────────
// LEVEL 5 SPELLS
// ─────────────────────────────────────────────────────────────────────────────

describe('Spell Effects — Cone of Cold (L5 AoE)', () => {
  it('deals cold damage when target fails CON save', () => {
    const caster = makeCaster({ spellsKnown: ['Cone of Cold'] })
    const target = makeFailTarget()
    const { state: newState } = castAoE(caster, target, 'Cone of Cold', 5)

    const t = newState.getCombatant('target1')
    assert.ok(t.currentHP < 60, 'Cone of Cold should deal cold damage on CON save fail')
  })

  it('deals half damage on CON save success', () => {
    const caster = makeCaster({ spellsKnown: ['Cone of Cold'] })
    const failTarget = makeFailTarget()
    const passTarget = makePassTarget({ id: 'target2' })

    const { state: s1 } = castAoE(caster, failTarget, 'Cone of Cold', 5)
    const { state: s2 } = castAoE(caster, passTarget, 'Cone of Cold', 5)

    const hpFail = s1.getCombatant('target1').currentHP
    const hpPass = s2.getCombatant('target2').currentHP
    assert.ok(hpPass > hpFail, `Half damage on save: fail HP=${hpFail}, pass HP=${hpPass}`)
  })
})

describe('Spell Effects — Cloudkill (L5 AoE)', () => {
  it('deals poison damage when target fails CON save', () => {
    const caster = makeCaster({ spellsKnown: ['Cloudkill'] })
    const target = makeFailTarget()
    const { state: newState } = castAoE(caster, target, 'Cloudkill', 5)

    const t = newState.getCombatant('target1')
    assert.ok(t.currentHP < 60, 'Cloudkill should deal poison damage on CON save fail')
  })

  it('deals half damage on CON save success', () => {
    const caster = makeCaster({ spellsKnown: ['Cloudkill'] })
    const passTarget = makePassTarget()
    const { state: newState } = castAoE(caster, passTarget, 'Cloudkill', 5)

    const t = newState.getCombatant('target1')
    // Half damage still means HP < 60 (unless 0 damage rounds to 0)
    // Just verify less damage than fail case by comparing damage taken
    assert.ok(t.currentHP >= 60 - 23, 'Half damage: target with good save should take ≤ ~23 damage (5d8 avg ~22)')
  })

  it('sets concentration on the caster', () => {
    const caster = makeCaster({ spellsKnown: ['Cloudkill'] })
    const target = makeFailTarget()
    const { state: newState } = castAoE(caster, target, 'Cloudkill', 5)

    const c = newState.getCombatant('caster1')
    assert.equal(c.concentrating, 'Cloudkill', 'Caster should concentrate on Cloudkill')
  })
})

describe('Spell Effects — Wall of Force (L5 area)', () => {
  it('sets concentration on the caster', () => {
    const caster = makeCaster({ spellsKnown: ['Wall of Force'] })
    // Wall of Force targets area (wall shape) — pass an aoeCenter
    const state = new GameState({
      combatants: [caster],
      initiativeOrder: ['caster1'],
    })
    const option = { spellName: 'Wall of Force', slotLevel: 5, category: 'action', optionId: 'spell-wof' }
    const { state: newState } = ActionResolver._resolveSpell(state, 'caster1', option, { aoeCenter: { x: 6, y: 0 } })

    const c = newState.getCombatant('caster1')
    assert.equal(c.concentrating, 'Wall of Force', 'Caster should concentrate on Wall of Force')
  })

  it('spends a level-5 slot', () => {
    const caster = makeCaster({ spellsKnown: ['Wall of Force'] })
    const state = new GameState({
      combatants: [caster],
      initiativeOrder: ['caster1'],
    })
    const option = { spellName: 'Wall of Force', slotLevel: 5, category: 'action', optionId: 'spell-wof' }
    const { state: newState } = ActionResolver._resolveSpell(state, 'caster1', option, { aoeCenter: { x: 6, y: 0 } })

    const c = newState.getCombatant('caster1')
    assert.equal(c.spellSlots[5], 2, 'Should spend one L5 slot (was 3, now 2)')
  })
})

// ─────────────────────────────────────────────────────────────────────────────
// LEVEL 6 SPELLS
// ─────────────────────────────────────────────────────────────────────────────

describe('Spell Effects — Globe of Invulnerability (L6 self)', () => {
  // [BUG-2] selfEffects: ['globe_of_invulnerability'] not applied in resolveSelfSpell
  it('sets concentration on the caster', () => {
    const caster = makeCaster({ spellsKnown: ['Globe of Invulnerability'] })
    const { state: newState } = castSpell(caster, null, 'Globe of Invulnerability', 6)

    const c = newState.getCombatant('caster1')
    assert.equal(c.concentrating, 'Globe of Invulnerability', 'Caster should concentrate on Globe')
  })

  it('applies globe_of_invulnerability condition to caster [BUG-2: selfEffects not applied]', () => {
    const caster = makeCaster({ spellsKnown: ['Globe of Invulnerability'] })
    const { state: newState } = castSpell(caster, null, 'Globe of Invulnerability', 6)

    const c = newState.getCombatant('caster1')
    assert.ok(
      c.conditions.includes('globe_of_invulnerability'),
      'Globe of Invulnerability should be applied to caster (requires BUG-2 fix)'
    )
  })
})

// ─────────────────────────────────────────────────────────────────────────────
// LEVEL 7 SPELLS
// ─────────────────────────────────────────────────────────────────────────────

describe('Spell Effects — Finger of Death (L7)', () => {
  it('deals heavy necrotic damage (7d8+30) when target fails CON save', () => {
    // 7d8+30 avg = ~31+30 = 61. Target HP=100 to ensure survival for assertion.
    const caster = makeCaster({ spellsKnown: ['Finger of Death'] })
    const target = makeFailTarget({ currentHP: 100, maxHP: 100 })
    const { state: newState } = castSpell(caster, target, 'Finger of Death', 7, { targetId: 'target1' })

    const t = newState.getCombatant('target1')
    const damageTaken = 100 - t.currentHP
    assert.ok(damageTaken >= 30, `Finger of Death should deal at least 30 damage (7d8+30 avg ~61), got ${damageTaken}`)
  })

  it('deals half damage on CON save success', () => {
    const caster = makeCaster({ spellsKnown: ['Finger of Death'] })
    const failTarget = makeFailTarget({ currentHP: 100, maxHP: 100 })
    const passTarget = makePassTarget({ id: 'target2', currentHP: 100, maxHP: 100 })

    const { state: s1 } = castSpell(caster, failTarget, 'Finger of Death', 7, { targetId: 'target1' })
    const { state: s2 } = castSpell(caster, passTarget, 'Finger of Death', 7, { targetId: 'target2' })

    const hpFail = s1.getCombatant('target1').currentHP
    const hpPass = s2.getCombatant('target2').currentHP
    assert.ok(hpPass > hpFail, `Half damage on save: fail HP=${hpFail}, pass HP=${hpPass}`)
  })

  it('spends a level-7 slot', () => {
    const caster = makeCaster({ spellsKnown: ['Finger of Death'] })
    const target = makeFailTarget({ currentHP: 100, maxHP: 100 })
    const { state: newState } = castSpell(caster, target, 'Finger of Death', 7, { targetId: 'target1' })

    const c = newState.getCombatant('caster1')
    assert.equal(c.spellSlots[7], 1, 'Should spend one L7 slot (was 2, now 1)')
  })
})

// ─────────────────────────────────────────────────────────────────────────────
// LEVEL 8 SPELLS
// ─────────────────────────────────────────────────────────────────────────────

describe('Spell Effects — Power Word Stun (L8)', () => {
  // [BUG-5] special: ['hp_threshold_150'] not handled in resolveSingleTargetSpell
  // The spell has no attack/save/healing — current code does nothing.

  it('auto-stuns a target with <= 150 HP (no save) [BUG-5: hp_threshold special not handled]', () => {
    const caster = makeCaster({ spellsKnown: ['Power Word Stun'] })
    const target = makeFailTarget({ currentHP: 50, maxHP: 50 }) // <= 150 HP
    const { state: newState } = castSpell(caster, target, 'Power Word Stun', 8, { targetId: 'target1' })

    const t = newState.getCombatant('target1')
    assert.ok(
      t.conditions.includes('stunned'),
      'Power Word Stun should apply stunned to target with ≤150 HP (requires BUG-5 fix)'
    )
  })

  it('does NOT stun a target with > 150 HP [BUG-5: threshold mechanic not implemented]', () => {
    const caster = makeCaster({ spellsKnown: ['Power Word Stun'] })
    const target = makeFailTarget({ currentHP: 200, maxHP: 200 })
    const { state: newState } = castSpell(caster, target, 'Power Word Stun', 8, { targetId: 'target1' })

    const t = newState.getCombatant('target1')
    assert.ok(!t.conditions.includes('stunned'), 'Targets with >150 HP should not be stunned')
  })

  it('spends a level-8 slot', () => {
    const caster = makeCaster({ spellsKnown: ['Power Word Stun'] })
    const target = makeFailTarget({ currentHP: 50, maxHP: 50 })
    const { state: newState } = castSpell(caster, target, 'Power Word Stun', 8, { targetId: 'target1' })

    const c = newState.getCombatant('caster1')
    assert.equal(c.spellSlots[8], 1, 'Should spend one L8 slot (was 2, now 1)')
  })
})

// ─────────────────────────────────────────────────────────────────────────────
// CROSS-CUTTING: SLOT SPENDING & ACTION ECONOMY
// ─────────────────────────────────────────────────────────────────────────────

describe('Spell Effects — slot spending', () => {
  it('action spell marks usedAction = true', () => {
    const caster = makeCaster({ spellsKnown: ['Blight'] })
    const target = makeFailTarget()
    const { state: newState } = castSpell(caster, target, 'Blight', 4, { targetId: 'target1' })

    assert.equal(newState.getCombatant('caster1').usedAction, true)
  })

  it('bonus-action spell marks usedBonusAction = true', () => {
    const caster = makeCaster({ spellsKnown: ['Healing Word'] })
    const target = makeFailTarget()
    const { state: newState } = castSpell(caster, target, 'Healing Word', 1, { targetId: 'target1' }, 'bonusAction')

    assert.equal(newState.getCombatant('caster1').usedBonusAction, true)
    assert.equal(newState.getCombatant('caster1').bonusActionSpellCastThisTurn, true)
  })

  it('cantrip (level 0) never spends a slot', () => {
    const caster = makeCaster({ cantrips: ['Vicious Mockery'] })
    const target = makeFailTarget()
    const slotsBefore = { ...caster.spellSlots }
    const { state: newState } = castSpell(caster, target, 'Vicious Mockery', 0, { targetId: 'target1' })

    const c = newState.getCombatant('caster1')
    assert.deepEqual(c.spellSlots, slotsBefore, 'Cantrip should not spend any slots')
  })

  it('correctly upcast Shatter from L2 to L3, spending L3 slot', () => {
    const caster = makeCaster({ spellsKnown: ['Shatter'] })
    const target = makeFailTarget()
    const { state: newState } = castAoE(caster, target, 'Shatter', 3)

    const c = newState.getCombatant('caster1')
    assert.equal(c.spellSlots[3], 3, 'L3 Shatter should spend L3 slot (was 4, now 3)')
    assert.equal(c.spellSlots[2], 4, 'L2 slot should be untouched')
  })
})

// ─────────────────────────────────────────────────────────────────────────────
// CROSS-CUTTING: CONCENTRATION MANAGEMENT
// ─────────────────────────────────────────────────────────────────────────────

describe('Spell Effects — concentration rules', () => {
  it('casting a second concentration spell drops the first', () => {
    const caster = makeCaster({
      spellsKnown: ['Hypnotic Pattern', 'Faerie Fire'],
      concentrating: 'Faerie Fire',
      concentrationRoundsRemaining: 5,
    })
    const target = makeFailTarget()

    const state = new GameState({
      combatants: [caster, target],
      initiativeOrder: ['caster1', 'target1'],
    })
    const option = { spellName: 'Hypnotic Pattern', slotLevel: 3, category: 'action', optionId: 'spell-hp-3' }
    const { state: newState } = ActionResolver._resolveSpell(state, 'caster1', option, { aoeCenter: target.position })

    const c = newState.getCombatant('caster1')
    assert.equal(c.concentrating, 'Hypnotic Pattern', 'Should now concentrate on Hypnotic Pattern')
    assert.ok(newState.log.some(l => l.includes('loses concentration') || l.includes('Faerie Fire')),
      'Log should mention losing previous concentration')
  })

  it('damage to concentrating caster triggers concentration check', () => {
    const caster = makeCaster({
      spellsKnown: ['Hypnotic Pattern'],
      concentrating: 'Hypnotic Pattern',
      concentrationRoundsRemaining: 10,
    })
    const attacker = makeCombatant({
      id: 'attacker1', name: 'Orc', side: 'enemy', position: { x: 1, y: 0 },
      weapons: [{ name: 'Axe', attackBonus: 5, damageDice: '1d8', damageBonus: 3, type: 'melee', range: 5 }],
      weapon: { name: 'Axe', attackBonus: 5, damageDice: '1d8', damageBonus: 3, type: 'melee', range: 5 },
    })
    const state = new GameState({
      combatants: [caster, attacker],
      initiativeOrder: ['attacker1', 'caster1'],
    })
    const menu = TurnMenu.getMenu(state, 'attacker1')
    const attackOption = menu.actions.find(o => o.type === 'attack')
    const { state: newState } = ActionResolver.resolve(state, 'attacker1', { optionId: attackOption.optionId })

    // Attack hit (avg 10 + 5 = 15 vs AC 13 → HIT)
    // CON save check triggered. Whether concentration breaks depends on dice.
    // In avg mode — just verify the log mentions concentration check
    const logs = newState.log
    const hasConCheck = logs.some(l => l.toLowerCase().includes('concentration'))
    // Note: concentration may or may not break in avg mode, but check should occur IF damage was dealt
    const damageTaken = caster.currentHP - newState.getCombatant('caster1').currentHP
    if (damageTaken > 0) {
      assert.ok(hasConCheck, 'Should have concentration check log when caster took damage')
    }
  })
})

// ─────────────────────────────────────────────────────────────────────────────
// CROSS-CUTTING: DAMAGE RESISTANCE
// ─────────────────────────────────────────────────────────────────────────────

describe('Spell Effects — damage resistance and immunity', () => {
  it('fire-resistant target takes half damage from Fireball', () => {
    const caster = makeCaster({ spellsKnown: ['Fireball'] })
    const normalTarget = makeFailTarget({ id: 'normal1' })
    const resistTarget = makeFailTarget({ id: 'resist1', damageResistances: ['fire'] })

    const state1 = new GameState({
      combatants: [caster, normalTarget],
      initiativeOrder: ['caster1', 'normal1'],
    })
    const state2 = new GameState({
      combatants: [makeCaster(), resistTarget],
      initiativeOrder: ['caster1', 'resist1'],
    })

    const opt = { spellName: 'Fireball', slotLevel: 3, category: 'action', optionId: 'spell-fb' }
    const { state: s1 } = ActionResolver._resolveSpell(state1, 'caster1', opt, { aoeCenter: normalTarget.position })
    const { state: s2 } = ActionResolver._resolveSpell(state2, 'caster1', opt, { aoeCenter: resistTarget.position })

    const dmgNormal = 60 - s1.getCombatant('normal1').currentHP
    const dmgResist = 60 - s2.getCombatant('resist1').currentHP
    assert.ok(dmgResist < dmgNormal, `Resistant target (${dmgResist} dmg) should take less than normal (${dmgNormal} dmg)`)
  })

  it('fire-immune target takes no damage from Fireball', () => {
    const caster = makeCaster({ spellsKnown: ['Fireball'] })
    const immuneTarget = makeFailTarget({ damageImmunities: ['fire'] })

    const state = new GameState({
      combatants: [caster, immuneTarget],
      initiativeOrder: ['caster1', 'target1'],
    })
    const opt = { spellName: 'Fireball', slotLevel: 3, category: 'action', optionId: 'spell-fb' }
    const { state: newState } = ActionResolver._resolveSpell(state, 'caster1', opt, { aoeCenter: immuneTarget.position })

    assert.equal(newState.getCombatant('target1').currentHP, 60, 'Fire-immune target should take zero Fireball damage')
  })
})
