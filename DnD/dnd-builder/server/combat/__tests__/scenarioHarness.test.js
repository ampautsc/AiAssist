/**
 * Scenario Simulation Harness Tests
 * 
 * Tests the combat simulation harness that:
 *   - Defines 8 encounter scenarios matching evaluate-scenarios.js
 *   - Runs N simulations per scenario using the combat engine
 *   - Aggregates results (win rate, avg rounds, HP remaining, etc.)
 */

const { describe, it, beforeEach } = require('node:test');
const assert = require('node:assert/strict');
const dice = require('../engine/dice');
const {
  SCENARIOS,
  MONSTER_PROFILES,
  createScenarioCombatants,
  simulateScenario,
  simulateAllScenarios,
} = require('../scenarioHarness');


// ═══════════════════════════════════════════════════════════════════════════
// MOCK BUILD — replicates a populated Mongoose lean doc
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
  };
}


// ═══════════════════════════════════════════════════════════════════════════
// SCENARIO DEFINITION TESTS
// ═══════════════════════════════════════════════════════════════════════════

describe('SCENARIOS definitions', () => {
  it('has exactly 8 scenarios', () => {
    assert.equal(SCENARIOS.length, 8);
  });

  const expectedIds = [
    'undead-swarm', 'werewolf-pack', 'cult-fanatics', 'dragon-assault',
    'frost-giant-smash', 'lich-encounter', 'archmage-duel', 'mixed-encounter',
  ];

  for (const id of expectedIds) {
    it(`has scenario '${id}'`, () => {
      const s = SCENARIOS.find(s => s.id === id);
      assert.ok(s, `Missing scenario: ${id}`);
      assert.ok(s.name);
      assert.ok(s.foes.length > 0);
    });
  }

  it('all foe entries have template, count, and profile', () => {
    for (const scenario of SCENARIOS) {
      for (const foe of scenario.foes) {
        assert.ok(foe.template, `${scenario.id}: missing template`);
        assert.ok(typeof foe.count === 'number' && foe.count > 0, `${scenario.id}: bad count`);
        assert.ok(foe.profile, `${scenario.id}: missing profile`);
      }
    }
  });

  it('all profiles referenced in scenarios are valid AI profiles', () => {
    const validProfiles = new Set(Object.values(MONSTER_PROFILES));
    for (const scenario of SCENARIOS) {
      for (const foe of scenario.foes) {
        assert.ok(validProfiles.has(foe.profile), `Unknown profile: ${foe.profile} in ${scenario.id}`);
      }
    }
  });
});


// ═══════════════════════════════════════════════════════════════════════════
// COMBATANT CREATION TESTS
// ═══════════════════════════════════════════════════════════════════════════

describe('createScenarioCombatants', () => {
  it('creates bard + correct number of enemies for undead-swarm', () => {
    const build = mockBuild();
    const scenario = SCENARIOS.find(s => s.id === 'undead-swarm');
    const combatants = createScenarioCombatants(build, scenario);
    
    // 1 bard + 4 zombie + 4 skeleton + 2 ghoul = 11
    assert.equal(combatants.length, 11);
    
    const bard = combatants.find(c => c.side === 'party');
    assert.ok(bard);
    assert.equal(bard.class, 'Lore Bard');
    
    const enemies = combatants.filter(c => c.side === 'enemy');
    assert.equal(enemies.length, 10);
  });

  it('creates bard + 1 dragon for dragon-assault', () => {
    const build = mockBuild();
    const scenario = SCENARIOS.find(s => s.id === 'dragon-assault');
    const combatants = createScenarioCombatants(build, scenario);
    assert.equal(combatants.length, 2); // 1 bard + 1 dragon
    
    const dragon = combatants.find(c => c.side === 'enemy');
    assert.ok(dragon.breathWeapon);
  });

  it('assigns unique IDs to all combatants', () => {
    const build = mockBuild();
    const scenario = SCENARIOS.find(s => s.id === 'mixed-encounter');
    const combatants = createScenarioCombatants(build, scenario);
    
    const ids = combatants.map(c => c.id);
    const uniqueIds = new Set(ids);
    assert.equal(uniqueIds.size, ids.length, 'Duplicate IDs found');
  });

  it('positions enemies on the right side of the battlefield', () => {
    const build = mockBuild();
    const scenario = SCENARIOS.find(s => s.id === 'undead-swarm');
    const combatants = createScenarioCombatants(build, scenario);
    
    const bard = combatants.find(c => c.side === 'party');
    const enemies = combatants.filter(c => c.side === 'enemy');
    
    // Bard starts at left, enemies at right
    assert.ok(bard.position.x < enemies[0].position.x);
  });
});


// ═══════════════════════════════════════════════════════════════════════════
// SIMULATION TESTS (deterministic with average dice)
// ═══════════════════════════════════════════════════════════════════════════

describe('simulateScenario — single run', () => {
  beforeEach(() => {
    dice.setDiceMode('average');
  });

  it('returns result with expected shape', () => {
    const build = mockBuild();
    const scenario = SCENARIOS.find(s => s.id === 'undead-swarm');
    
    const result = simulateScenario(build, scenario, { numRuns: 1, verbose: false });
    
    assert.ok(result);
    assert.equal(result.scenarioId, 'undead-swarm');
    assert.equal(result.scenarioName, scenario.name);
    assert.equal(result.numRuns, 1);
    assert.ok(typeof result.winRate === 'number');
    assert.ok(result.winRate >= 0 && result.winRate <= 1);
    assert.ok(typeof result.avgRounds === 'number');
    assert.ok(result.avgRounds > 0);
    assert.ok(typeof result.avgBardHpPct === 'number');
    assert.ok(result.avgBardHpPct >= 0 && result.avgBardHpPct <= 1);
    assert.ok(Array.isArray(result.runs));
    assert.equal(result.runs.length, 1);
  });

  it('each run has winner, rounds, and analytics', () => {
    const build = mockBuild();
    const scenario = SCENARIOS.find(s => s.id === 'werewolf-pack');
    
    const result = simulateScenario(build, scenario, { numRuns: 1, verbose: false });
    const run = result.runs[0];
    
    assert.ok(run.winner);
    assert.ok(run.rounds > 0);
    assert.ok(Array.isArray(run.analytics));
    assert.ok(run.analytics.length > 0);
  });
});

describe('simulateScenario — aggregation', () => {
  beforeEach(() => {
    dice.setDiceMode('average');
  });

  it('win rate is between 0 and 1', () => {
    const build = mockBuild();
    const scenario = SCENARIOS.find(s => s.id === 'undead-swarm');
    
    const result = simulateScenario(build, scenario, { numRuns: 3, verbose: false });
    assert.ok(result.winRate >= 0);
    assert.ok(result.winRate <= 1);
    assert.equal(result.numRuns, 3);
  });

  it('average rounds equals actual rounds for deterministic single run', () => {
    const build = mockBuild();
    const scenario = SCENARIOS.find(s => s.id === 'undead-swarm');
    
    const result = simulateScenario(build, scenario, { numRuns: 1, verbose: false });
    assert.equal(result.avgRounds, result.runs[0].rounds);
  });
});


// ═══════════════════════════════════════════════════════════════════════════
// FULL SUITE — all 8 scenarios run without crashing
// ═══════════════════════════════════════════════════════════════════════════

describe('simulateAllScenarios — smoke test', () => {
  beforeEach(() => {
    dice.setDiceMode('average');
  });

  it('runs all 8 scenarios and returns aggregated results', () => {
    const build = mockBuild();
    
    const results = simulateAllScenarios(build, { numRuns: 1, verbose: false });
    
    assert.ok(Array.isArray(results));
    assert.equal(results.length, 8);
    
    for (const r of results) {
      assert.ok(r.scenarioId);
      assert.ok(r.scenarioName);
      assert.ok(typeof r.winRate === 'number');
      assert.ok(typeof r.avgRounds === 'number');
      assert.ok(typeof r.avgBardHpPct === 'number');
    }
  });

  it('returns results keyed by scenario id', () => {
    const build = mockBuild();
    const results = simulateAllScenarios(build, { numRuns: 1, verbose: false });
    
    const ids = results.map(r => r.scenarioId);
    assert.ok(ids.includes('undead-swarm'));
    assert.ok(ids.includes('lich-encounter'));
    assert.ok(ids.includes('dragon-assault'));
    assert.ok(ids.includes('mixed-encounter'));
  });
});


// ═══════════════════════════════════════════════════════════════════════════
// DETERMINISTIC CONSISTENCY (average dice should give same result twice)
// ═══════════════════════════════════════════════════════════════════════════

describe('simulateScenario — determinism', () => {
  it('average dice mode produces identical results for same scenario', () => {
    const build = mockBuild();
    const scenario = SCENARIOS.find(s => s.id === 'werewolf-pack');
    
    dice.setDiceMode('average');
    const r1 = simulateScenario(build, scenario, { numRuns: 1, verbose: false });
    
    dice.setDiceMode('average');
    const r2 = simulateScenario(build, scenario, { numRuns: 1, verbose: false });
    
    assert.equal(r1.runs[0].winner, r2.runs[0].winner);
    assert.equal(r1.runs[0].rounds, r2.runs[0].rounds);
  });
});
