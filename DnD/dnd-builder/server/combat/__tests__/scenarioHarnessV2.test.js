/**
 * Scenario Simulation Harness V2 — Integration Tests
 *
 * Verifies that the v2 harness (immutable zero-trust engine):
 *   1. Produces results in the same shape as the v1 harness
 *   2. Uses GameState + v2 EncounterRunner + TacticsAdapter
 *   3. All simulations complete without errors
 *   4. Result values are within valid ranges
 *   5. Runs all 8 scenarios with a real build
 */

const { describe, it, beforeEach } = require('node:test')
const assert = require('node:assert/strict')
const dice = require('../engine/dice')
const {
  SCENARIOS,
  MONSTER_PROFILES,
  createScenarioState,
  simulateScenario,
  simulateAllScenarios,
} = require('../scenarioHarnessV2')
const { GameState } = require('../engine-v2/GameState')


// ═══════════════════════════════════════════════════════════════════════════
// MOCK BUILD — same as v1 harness tests for apples-to-apples comparison
// ═══════════════════════════════════════════════════════════════════════════

function mockBuild() {
  return {
    _id: 'build-test-iron',
    name: 'Gem Dragonborn — Iron Concentration',
    level: 8,
    baseStats: { str: 8, dex: 14, con: 14, int: 8, wis: 12, cha: 16 },
    speciesAsi: [
      { stat: 'CHA', bonus: 2 },
      { stat: 'CON', bonus: 1 },
    ],
    species: {
      name: 'Gem Dragonborn',
      creatureType: 'Humanoid',
      size: ['Medium'],
      speed: { walk: 30 },
      hasFlight: true,
      darkvision: 60,
      resistances: [],
      conditionImmunities: [],
      naturalArmorAC: null,
      traitList: [
        { name: 'Gem Ancestry', description: 'Force damage type.' },
        { name: 'Breath Weapon', description: '15ft cone, 2d8 force, DEX save.' },
        { name: 'Draconic Resistance', description: 'Resistance to force damage.' },
        { name: 'Psionic Mind', description: 'Telepathy 30ft.' },
        { name: 'Gem Flight', description: 'PB/long rest, 1 minute.' },
      ],
    },
    levelChoices: [
      {
        level: 4, type: 'feat',
        feat: {
          name: 'War Caster', isHalfFeat: false,
          grantsAdvConSaves: true, grantsProfConSaves: false,
          grantsArmorProficiency: null, bonusSpells: [],
        },
        halfFeatStat: null,
      },
      {
        level: 8, type: 'feat',
        feat: {
          name: 'Resilient (CON)', isHalfFeat: true,
          grantsAdvConSaves: false, grantsProfConSaves: true,
          grantsArmorProficiency: null, bonusSpells: [],
        },
        halfFeatStat: 'CON',
      },
    ],
    items: [
      { name: 'Bracers of Defense', acBonus: 2, saveBonus: 0, spellDcBonus: 0, spellAttackBonus: 0, requiresNoArmor: true, imposesCharmDisadvantage: false },
      { name: 'Cloak of Protection', acBonus: 1, saveBonus: 1, spellDcBonus: 0, spellAttackBonus: 0, requiresNoArmor: false, imposesCharmDisadvantage: false },
    ],
  }
}


// ═══════════════════════════════════════════════════════════════════════════
// STATE CREATION TESTS
// ═══════════════════════════════════════════════════════════════════════════

describe('createScenarioState — v2', () => {
  it('returns a GameState + profileMap', () => {
    const build = mockBuild()
    const scenario = SCENARIOS.find(s => s.id === 'undead-swarm')
    const { state, profileMap } = createScenarioState(build, scenario)

    assert.ok(state instanceof GameState, 'state should be a GameState')
    assert.ok(typeof profileMap === 'object', 'profileMap should be an object')
  })

  it('GameState has correct number of combatants for undead-swarm', () => {
    const build = mockBuild()
    const scenario = SCENARIOS.find(s => s.id === 'undead-swarm')
    const { state } = createScenarioState(build, scenario)

    // 1 bard + 4 zombie + 4 skeleton + 2 ghoul = 11
    assert.equal(state.combatantCount, 11)
  })

  it('bard is party side, enemies are enemy side', () => {
    const build = mockBuild()
    const scenario = SCENARIOS.find(s => s.id === 'dragon-assault')
    const { state } = createScenarioState(build, scenario)

    const bard = state.getCombatant('bard-0')
    assert.ok(bard, 'bard should exist')
    assert.equal(bard.side, 'party')

    const all = state.getAllCombatants()
    const enemies = all.filter(c => c.side === 'enemy')
    assert.equal(enemies.length, 1) // 1 dragon
    assert.ok(enemies[0].id.startsWith('young_red_dragon'))
  })

  it('profileMap maps bard to lore_bard', () => {
    const build = mockBuild()
    const scenario = SCENARIOS.find(s => s.id === 'dragon-assault')
    const { profileMap } = createScenarioState(build, scenario)

    assert.equal(profileMap['bard-0'], 'lore_bard')
  })

  it('profileMap maps every enemy to a valid profile', () => {
    const build = mockBuild()
    const scenario = SCENARIOS.find(s => s.id === 'mixed-encounter')
    const { state, profileMap } = createScenarioState(build, scenario)

    const enemies = state.getAllCombatants().filter(c => c.side === 'enemy')
    for (const enemy of enemies) {
      assert.ok(profileMap[enemy.id], `Missing profile for ${enemy.id}`)
    }
  })

  it('all combatant IDs are unique', () => {
    const build = mockBuild()
    const scenario = SCENARIOS.find(s => s.id === 'mixed-encounter')
    const { state } = createScenarioState(build, scenario)

    const all = state.getAllCombatants()
    const ids = all.map(c => c.id)
    const unique = new Set(ids)
    assert.equal(unique.size, ids.length, 'Duplicate IDs found')
  })
})


// ═══════════════════════════════════════════════════════════════════════════
// SIMULATION RESULT SHAPE — must match v1 harness format
// ═══════════════════════════════════════════════════════════════════════════

describe('simulateScenario v2 — result shape', () => {
  beforeEach(() => {
    dice.setDiceMode('average')
  })

  it('returns result with expected shape', () => {
    const build = mockBuild()
    const scenario = SCENARIOS.find(s => s.id === 'undead-swarm')

    const result = simulateScenario(build, scenario, { numRuns: 1 })

    assert.ok(result)
    assert.equal(result.scenarioId, 'undead-swarm')
    assert.equal(result.scenarioName, scenario.name)
    assert.equal(result.numRuns, 1)
    assert.ok(typeof result.winRate === 'number')
    assert.ok(typeof result.avgRounds === 'number')
    assert.ok(typeof result.avgBardHpPct === 'number')
    assert.ok(Array.isArray(result.runs))
    assert.equal(result.runs.length, 1)
  })

  it('each run has winner, rounds, bardHpPct, analytics', () => {
    const build = mockBuild()
    const scenario = SCENARIOS.find(s => s.id === 'werewolf-pack')

    const result = simulateScenario(build, scenario, { numRuns: 1 })
    const run = result.runs[0]

    assert.ok(['party', 'enemy', 'draw'].includes(run.winner))
    assert.ok(typeof run.rounds === 'number')
    assert.ok(run.rounds >= 1 && run.rounds <= 20)
    assert.ok(typeof run.bardHpPct === 'number')
    assert.ok(run.bardHpPct >= 0 && run.bardHpPct <= 1)
    assert.ok(Array.isArray(run.analytics))
    assert.ok(run.analytics.length > 0)
  })

  it('analytics entries have expected fields', () => {
    const build = mockBuild()
    const scenario = SCENARIOS.find(s => s.id === 'werewolf-pack')

    const result = simulateScenario(build, scenario, { numRuns: 1 })
    const analytic = result.runs[0].analytics[0]

    assert.ok(typeof analytic.id === 'string')
    assert.ok(typeof analytic.name === 'string')
    assert.ok(typeof analytic.side === 'string')
    assert.ok(typeof analytic.survived === 'boolean')
    assert.ok(typeof analytic.finalHP === 'number')
    assert.ok(typeof analytic.maxHP === 'number')
    assert.ok(typeof analytic.damageDealt === 'number')
    assert.ok(typeof analytic.attacksMade === 'number')
    assert.ok(typeof analytic.hitRate === 'number')
    assert.ok(typeof analytic.spellsCast === 'number')
  })

  it('first N runs include combat log and positionSnapshots', () => {
    const build = mockBuild()
    const scenario = SCENARIOS.find(s => s.id === 'werewolf-pack')

    const result = simulateScenario(build, scenario, { numRuns: 3, logRuns: 2 })

    // First 2 runs should have logs
    assert.ok(Array.isArray(result.runs[0].log))
    assert.ok(result.runs[0].log.length > 0)
    assert.ok(Array.isArray(result.runs[0].positionSnapshots))

    assert.ok(Array.isArray(result.runs[1].log))

    // Third run should NOT have log
    assert.equal(result.runs[2].log, undefined)
  })

  it('winRate is between 0 and 1', () => {
    const build = mockBuild()
    const scenario = SCENARIOS.find(s => s.id === 'werewolf-pack')

    const result = simulateScenario(build, scenario, { numRuns: 3 })
    assert.ok(result.winRate >= 0 && result.winRate <= 1)
  })

  it('bardHpPct is between 0 and 1', () => {
    const build = mockBuild()
    const scenario = SCENARIOS.find(s => s.id === 'werewolf-pack')

    const result = simulateScenario(build, scenario, { numRuns: 3 })
    assert.ok(result.avgBardHpPct >= 0 && result.avgBardHpPct <= 1)
  })
})


// ═══════════════════════════════════════════════════════════════════════════
// FULL SIMULATION — ALL 8 SCENARIOS
// ═══════════════════════════════════════════════════════════════════════════

describe('simulateAllScenarios v2 — all 8 scenarios', () => {
  beforeEach(() => {
    dice.setDiceMode('average')
  })

  it('runs all 8 scenarios and returns valid results', () => {
    const build = mockBuild()
    const results = simulateAllScenarios(build, { numRuns: 1 })

    assert.equal(results.length, 8)

    const expectedIds = [
      'undead-swarm', 'werewolf-pack', 'cult-fanatics', 'dragon-assault',
      'frost-giant-smash', 'lich-encounter', 'archmage-duel', 'mixed-encounter',
    ]

    for (const id of expectedIds) {
      const r = results.find(r => r.scenarioId === id)
      assert.ok(r, `Missing result for scenario: ${id}`)
      assert.equal(r.numRuns, 1)
      assert.ok(r.runs.length === 1)
    }
  })

  it('each scenario produces a winner (no crashes)', () => {
    const build = mockBuild()
    const results = simulateAllScenarios(build, { numRuns: 1 })

    for (const r of results) {
      const run = r.runs[0]
      assert.ok(
        ['party', 'enemy', 'draw'].includes(run.winner),
        `Scenario ${r.scenarioId}: unexpected winner '${run.winner}'`
      )
    }
  })

  it('encounters run within round limits', () => {
    const build = mockBuild()
    const results = simulateAllScenarios(build, { numRuns: 1 })

    for (const r of results) {
      const run = r.runs[0]
      assert.ok(
        run.rounds >= 1 && run.rounds <= 20,
        `Scenario ${r.scenarioId}: ${run.rounds} rounds (out of range)`
      )
    }
  })
})


// ═══════════════════════════════════════════════════════════════════════════
// CONSISTENCY — V2 USES SAME SCENARIOS AS V1
// ═══════════════════════════════════════════════════════════════════════════

describe('v2 harness — scenario consistency', () => {
  it('uses the same SCENARIOS as v1 harness', () => {
    const v1Harness = require('../scenarioHarness')

    assert.strictEqual(SCENARIOS, v1Harness.SCENARIOS,
      'v2 should reuse v1 SCENARIOS array (same reference)')
  })

  it('uses the same MONSTER_PROFILES as v1 harness', () => {
    const v1Harness = require('../scenarioHarness')

    assert.strictEqual(MONSTER_PROFILES, v1Harness.MONSTER_PROFILES,
      'v2 should reuse v1 MONSTER_PROFILES (same reference)')
  })
})


// ═══════════════════════════════════════════════════════════════════════════
// MULTIPLE RUNS — AGGREGATION
// ═══════════════════════════════════════════════════════════════════════════

describe('simulateScenario v2 — multiple runs aggregation', () => {
  beforeEach(() => {
    dice.setDiceMode('average')
  })

  it('aggregates correctly across multiple runs', () => {
    const build = mockBuild()
    const scenario = SCENARIOS.find(s => s.id === 'undead-swarm')

    const result = simulateScenario(build, scenario, { numRuns: 5 })

    assert.equal(result.numRuns, 5)
    assert.equal(result.runs.length, 5)

    // With average dice all runs should produce identical results
    const winners = new Set(result.runs.map(r => r.winner))
    // All same winner in deterministic mode
    assert.equal(winners.size, 1, 'Deterministic mode should produce consistent winners')
  })

  it('avgRounds is the mean of all runs', () => {
    const build = mockBuild()
    const scenario = SCENARIOS.find(s => s.id === 'werewolf-pack')

    const result = simulateScenario(build, scenario, { numRuns: 3 })

    const manualAvg = result.runs.reduce((s, r) => s + r.rounds, 0) / result.runs.length
    // Allow rounding tolerance
    assert.ok(
      Math.abs(result.avgRounds - manualAvg) < 0.2,
      `avgRounds ${result.avgRounds} doesn't match manual average ${manualAvg}`
    )
  })
})
