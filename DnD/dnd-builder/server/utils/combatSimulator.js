/**
 * Turn-by-Turn Combat Simulator
 * 
 * Simulates a full D&D 5e combat encounter between a Lore Bard build and enemies.
 * Uses combatAI.js for character decision-making.
 */

const { chooseTurn1Action, chooseCombatAction, chooseReaction, isDisabled } = require('./combatAI');
const { pHit, pFailSave, conSaveDC, bardHP } = require('./scenarioEngine');

// ═══════════════════════════════════════════════════════════════════════════
// SPELL DATABASE
// ═══════════════════════════════════════════════════════════════════════════

const SPELLS = {
  'Hypnotic Pattern': {
    level: 3,
    castTime: 'action',
    range: 120,
    aoe: { shape: 'cube', size: 30 },
    save: 'WIS',
    onFail: 'charmed',
    duration: 10, // rounds, concentration
    concentration: true,
  },
  'Hold Person': {
    level: 2,
    castTime: 'action',
    range: 60,
    targets: 1,
    save: 'WIS',
    onFail: 'paralyzed',
    duration: 10,
    concentration: true,
  },
  'Greater Invisibility': {
    level: 4,
    castTime: 'action',
    range: 'touch',
    targets: 1,
    effect: 'invisible',
    duration: 10,
    concentration: true,
  },
  'Shield': {
    level: 1,
    castTime: 'reaction',
    trigger: 'hit by attack',
    effect: '+5 AC until start of your next turn',
  },
  'Counterspell': {
    level: 3,
    castTime: 'reaction',
    range: 60,
    trigger: 'enemy casts spell',
    effect: 'interrupt spell if level ≤3, or contested check',
  },
  'Vicious Mockery': {
    level: 0, // cantrip
    castTime: 'action',
    range: 60,
    targets: 1,
    save: 'WIS',
    damage: '2d4', // at level 8
    onFail: 'disadvantage on next attack',
  },
  'Fly': {
    level: 3,
    castTime: 'action',
    range: 'touch',
    targets: 1,
    effect: 'fly speed 60ft',
    duration: 10,
    concentration: true,
  },
};


// ═══════════════════════════════════════════════════════════════════════════
// COMBAT STATE
// ═══════════════════════════════════════════════════════════════════════════

class CombatState {
  constructor(build, computed, abilities, scenario) {
    this.round = 0;
    this.turn = 0;
    
    // Build state
    this.build = {
      name: build.name,
      hp: { current: bardHP(computed.conMod), max: bardHP(computed.conMod) },
      ac: computed.finalAc,
      dc: computed.spellDc,
      conSave: computed.conSaveBonus,
      advConSave: computed.conSaveType === 'advantage' || computed.conSaveType === 'both',
      wisSave: Math.floor((computed.finalStats.wis - 10) / 2),
      dexSave: computed.dexMod,
      initiative: computed.dexMod,
      slots: { 1: 4, 2: 3, 3: abilities.pearlOfPower ? 4 : 3, 4: 3 }, // Level 8 bard slots (+1 L3 from Pearl)
      concentratingOn: null,
      conditions: (abilities.permanentFlight || abilities.itemFlight) ? ['flying'] : [], // Fairy/Winged Boots start airborne
      abilities: {
        hiddenStep: abilities.hiddenStep,
        hiddenStepUses: abilities.hiddenStep ? 3 : 0, // PB/LR at level 8 = +3
        cuttingWords: true,
        cuttingWordsUses: 4, // 4× BI dice at level 8
        canFly: abilities.canFly,
        permanentFlight: abilities.permanentFlight || false, // Fairy: always on, no action
        limitedFlight: abilities.limitedFlight || false,     // Gem Dragonborn: bonus action, no concentration
        limitedFlightUses: abilities.limitedFlight ? 3 : 0,  // PB/LR at level 8
        flyTurn: abilities.flyTurn,
        magicResistance: abilities.magicResistance,
        charmDisadvantage: abilities.charmDisadvantage || false,
        pearlOfPower: abilities.pearlOfPower || false,
      },
      computed,
      abilities,
      preferredStrategy: 'ADAPTIVE', // Can be customized per build
    };

    // Enemy states
    this.enemies = scenario.foes.flatMap((foe, foeIdx) => 
      Array.from({ length: foe.count }, (_, i) => ({
        id: `${foe.monster.name}_${foeIdx}_${i}`,
        name: foe.monster.name,
        monster: foe.monster,
        hp: { current: foe.monster.hp, max: foe.monster.hp },
        ac: foe.monster.ac || 10,
        initiative: foe.monster.initiativeBonus || 0,
        conditions: [],
        concentratingOn: null,
        avgDamagePerRound: this._calculateAvgDPR(foe.monster),
      }))
    );

    this.scenario = scenario;
    this.log = [];
    this.turnOrder = [];
  }

  _calculateAvgDPR(monster) {
    if (monster.attacks) {
      return monster.attacks.reduce((sum, atk) => sum + atk.avgDmg, 0);
    }
    return 0;
  }
}


// ═══════════════════════════════════════════════════════════════════════════
// SIMULATOR
// ═══════════════════════════════════════════════════════════════════════════

function simulateEncounter(build, computed, abilities, scenario, options = {}) {
  const state = new CombatState(build, computed, abilities, scenario);
  const maxRounds = options.maxRounds || 20;
  const seed = options.seed || Math.random(); // For reproducible RNG
  let rng = seededRandom(seed);

  // Roll initiative
  rollInitiative(state, rng);
  state.log.push(`=== COMBAT START: ${build.name} vs ${scenario.name} ===`);
  state.log.push(`Initiative order: ${state.turnOrder.map(t => t.name).join(' > ')}`);

  // Combat rounds
  for (let round = 1; round <= maxRounds; round++) {
    state.round = round;
    state.log.push(`\n--- ROUND ${round} ---`);

    // Each combatant takes their turn in initiative order
    for (const combatant of state.turnOrder) {
      if (combatant.type === 'build') {
        takeBuildTurn(state, rng);
      } else {
        takeEnemyTurn(state, combatant.enemy, rng);
      }

      // Check victory conditions
      if (checkVictory(state)) {
        break;
      }
    }

    // End of round: update durations, check concentration
    endOfRound(state);

    if (checkVictory(state)) {
      break;
    }
  }

  // Compile results
  return compileResults(state);
}


// ═══════════════════════════════════════════════════════════════════════════
// TURN RESOLUTION
// ═══════════════════════════════════════════════════════════════════════════

function rollInitiative(state, rng) {
  const rolls = [];
  
  // Build
  rolls.push({
    type: 'build',
    name: state.build.name,
    initiative: roll1d20(rng) + state.build.initiative,
  });

  // Enemies
  state.enemies.forEach(enemy => {
    rolls.push({
      type: 'enemy',
      name: enemy.id,
      enemy: enemy,
      initiative: roll1d20(rng) + enemy.initiative,
    });
  });

  // Sort descending
  state.turnOrder = rolls.sort((a, b) => b.initiative - a.initiative);
}

function takeBuildTurn(state, rng) {
  const b = state.build;
  const activeEnemies = state.enemies.filter(e => e.hp.current > 0 && !isDisabled(e));

  if (activeEnemies.length === 0) {
    state.log.push(`${b.name}: No active enemies, turn skipped`);
    return;
  }

  // Check conditions that prevent action
  if (b.conditions.includes('paralyzed') || b.conditions.includes('stunned') || b.conditions.includes('unconscious')) {
    state.log.push(`${b.name}: Incapacitated, turn skipped`);
    return;
  }

  // Choose action
  let action;
  if (state.round === 1) {
    action = chooseTurn1Action(b, state.enemies, state.scenario);
  } else {
    action = chooseCombatAction(b, state.enemies, state.scenario, state.round);
  }

  state.log.push(`${b.name}: ${action.reason}`);

  // Execute action
  if (action.type === 'cast_spell') {
    castSpell(state, action, rng);
  } else if (action.type === 'cast_cantrip') {
    castCantrip(state, action, rng);
  } else if (action.type === 'combo') {
    // Bonus action first
    if (action.bonusAction.type === 'use_ability') {
      useAbility(state, action.bonusAction);
    }
    // Then main action
    if (action.action.type === 'cast_spell') {
      castSpell(state, action.action, rng);
    }
  } else if (action.type === 'dodge') {
    b.conditions.push('dodging'); // Advantage on DEX saves, attacks against have disadvantage
    state.log.push(`  → Dodging (attacks have disadvantage)`);
  }
}

function takeEnemyTurn(state, enemy, rng) {
  if (enemy.hp.current <= 0) return;
  if (isDisabled(enemy)) {
    state.log.push(`${enemy.id}: Disabled (${enemy.conditions.join(', ')}), turn skipped`);
    return;
  }

  // Simple enemy AI: Attack the bard if able
  const b = state.build;
  const canSeeTarget = !b.conditions.includes('invisible');
  const canReachTarget = canSeeTarget && (!b.conditions.includes('flying') || enemy.monster.ranged || enemy.monster.flying);

  if (!canReachTarget) {
    state.log.push(`${enemy.id}: Cannot reach target (${b.conditions.includes('flying') ? 'flying' : 'invisible'})`);
    return;
  }

  // Make attacks
  if (enemy.monster.attacks) {
    for (const attack of enemy.monster.attacks) {
      makeAttack(state, enemy, attack, rng);
      if (state.build.hp.current <= 0) break;
    }
  }
}

function makeAttack(state, enemy, attack, rng) {
  const b = state.build;
  const attackRoll = roll1d20(rng) + attack.bonus;
  
  // Apply disadvantage if target is dodging or invisible
  let finalRoll = attackRoll;
  if (b.conditions.includes('dodging') || b.conditions.includes('invisible')) {
    const secondRoll = roll1d20(rng) + attack.bonus;
    finalRoll = Math.min(attackRoll, secondRoll);
    state.log.push(`  ${enemy.id} attacks (disadvantage): ${attackRoll}, ${secondRoll} → ${finalRoll} vs AC ${b.ac}`);
  } else {
    state.log.push(`  ${enemy.id} attacks: ${finalRoll} vs AC ${b.ac}`);
  }

  // Check if hit
  if (finalRoll >= b.ac) {
    // Reaction: Shield spell?
    if (b.slots[1] > 0 && finalRoll < b.ac + 5) {
      const reaction = chooseReaction(b, {
        type: 'enemy_attack_about_to_hit',
        roll: finalRoll,
        currentAC: b.ac,
        damage: attack.avgDmg,
      }, {});
      
      if (reaction.type === 'cast_shield') {
        b.slots[1]--;
        state.log.push(`    → ${b.name} casts Shield! AC becomes ${b.ac + 5}, attack misses`);
        return; // Attack misses
      }
    }

    // Hit lands
    const damage = Math.max(1, Math.floor(attack.avgDmg + (roll1d20(rng) - 10.5) * 0.3)); // Slight variance
    b.hp.current -= damage;
    state.log.push(`    → HIT! ${damage} damage. HP: ${b.hp.current}/${b.hp.max}`);

    // Concentration check
    if (b.concentratingOn) {
      const dc = conSaveDC(damage);
      const saveRoll = roll1d20(rng) + b.conSave;
      const finalSave = b.advConSave ? Math.max(saveRoll, roll1d20(rng) + b.conSave) : saveRoll;
      
      if (finalSave >= dc) {
        state.log.push(`    → Concentration save: ${finalSave} vs DC ${dc}. Maintained.`);
      } else {
        state.log.push(`    → Concentration save: ${finalSave} vs DC ${dc}. BROKEN!`);
        breakConcentration(state);
      }
    }
  } else {
    state.log.push(`    → Miss`);
  }
}

function castSpell(state, action, rng) {
  const spell = SPELLS[action.spell];
  const b = state.build;

  if (!spell) {
    state.log.push(`  → Unknown spell: ${action.spell}. Skipping.`);
    return;
  }

  // Spend slot
  b.slots[spell.level]--;
  state.log.push(`  → Casting ${action.spell} (${spell.level} slot, ${b.slots[spell.level]} left)`);

  // If concentration, drop current concentration
  if (spell.concentration && b.concentratingOn) {
    state.log.push(`    → Dropping concentration on ${b.concentratingOn}`);
    breakConcentration(state);
  }

  // Resolve spell effects
  if (action.spell === 'Hypnotic Pattern') {
    const targets = action.targets;
    let charmedCount = 0;
    
    targets.forEach(enemy => {
      if (enemy.hp.current <= 0 || isDisabled(enemy)) return;
      
      const saveRoll = roll1d20(rng) + enemy.monster.wisSave;
      const dc = b.dc;
      
      // Determine advantage/disadvantage on save
      const hasAdvantage = enemy.monster.magicResistance || enemy.monster.advVsCharm;
      const hasDisadvantage = b.abilities.charmDisadvantage; // Instrument of the Bards
      
      let finalSave = saveRoll;
      if (hasAdvantage && !hasDisadvantage) {
        // Enemy has advantage only — take higher roll
        finalSave = Math.max(saveRoll, roll1d20(rng) + enemy.monster.wisSave);
      } else if (hasDisadvantage && !hasAdvantage) {
        // Bard imposes disadvantage, enemy has no advantage — take lower roll
        finalSave = Math.min(saveRoll, roll1d20(rng) + enemy.monster.wisSave);
      }
      // If both advantage and disadvantage: they cancel out, use single roll
      
      if (finalSave < dc && !enemy.monster.immuneCharmed) {
        enemy.conditions.push('charmed');
        charmedCount++;
        state.log.push(`    → ${enemy.id}: Save ${finalSave} vs DC ${dc}. CHARMED${hasDisadvantage ? ' (disadv)' : ''}`);
      } else {
        state.log.push(`    → ${enemy.id}: Save ${finalSave} vs DC ${dc}. Resisted`);
      }
    });

    if (charmedCount > 0) {
      b.concentratingOn = 'Hypnotic Pattern';
      state.log.push(`  → ${charmedCount}/${targets.length} enemies charmed. Concentrating.`);
    }
  } else if (action.spell === 'Greater Invisibility') {
    b.conditions.push('invisible');
    b.concentratingOn = 'Greater Invisibility';
    state.log.push(`  → ${b.name} is invisible. Concentrating.`);
  } else if (action.spell === 'Hold Person') {
    const target = action.targets[0];
    const saveRoll = roll1d20(rng) + target.monster.wisSave;
    if (saveRoll < b.dc) {
      target.conditions.push('paralyzed');
      b.concentratingOn = 'Hold Person';
      state.log.push(`  → ${target.id} paralyzed`);
    } else {
      state.log.push(`  → ${target.id} resisted (${saveRoll} vs DC ${b.dc})`);
    }
  } else if (action.spell === 'Fly') {
    b.conditions.push('flying');
    b.concentratingOn = 'Fly';
    state.log.push(`  → ${b.name} is flying. Concentrating.`);
  }
}

function castCantrip(state, action, rng) {
  // Vicious Mockery
  const target = action.targets[0];
  if (!target || target.hp.current <= 0) return;
  
  const saveRoll = roll1d20(rng) + target.monster.wisSave;
  if (saveRoll < state.build.dc) {
    const damage = roll1d4(rng) + roll1d4(rng); // 2d4
    target.hp.current -= damage;
    state.log.push(`  → Vicious Mockery hits ${target.id}: ${damage} damage, HP ${target.hp.current}/${target.hp.max}`);
  } else {
    state.log.push(`  → Vicious Mockery resisted by ${target.id}`);
  }
}

function useAbility(state, action) {
  const b = state.build;
  if (action.ability === 'Hidden Step') {
    b.abilities.hiddenStepUses--;
    b.conditions.push('invisible_1round');
    state.log.push(`  → Hidden Step used (${b.abilities.hiddenStepUses} left). Invisible until end of next turn.`);
  } else if (action.ability === 'Gem Flight') {
    b.abilities.limitedFlightUses--;
    b.conditions.push('flying');
    state.log.push(`  → Gem Flight activated (${b.abilities.limitedFlightUses} uses left). Flying for 1 minute. No concentration.`);
  }
}

function breakConcentration(state) {
  const b = state.build;
  const spell = b.concentratingOn;
  b.concentratingOn = null;

  // Remove spell effects
  if (spell === 'Hypnotic Pattern') {
    state.enemies.forEach(e => {
      const idx = e.conditions.indexOf('charmed');
      if (idx >= 0) e.conditions.splice(idx, 1);
    });
  } else if (spell === 'Greater Invisibility') {
    const idx = b.conditions.indexOf('invisible');
    if (idx >= 0) b.conditions.splice(idx, 1);
  } else if (spell === 'Hold Person') {
    state.enemies.forEach(e => {
      const idx = e.conditions.indexOf('paralyzed');
      if (idx >= 0) e.conditions.splice(idx, 1);
    });
  }
}

function endOfRound(state) {
  // Remove 1-round conditions
  const b = state.build;
  const dodgeIdx = b.conditions.indexOf('dodging');
  if (dodgeIdx >= 0) b.conditions.splice(dodgeIdx, 1);
  
  const invisIdx = b.conditions.indexOf('invisible_1round');
  if (invisIdx >= 0) b.conditions.splice(invisIdx, 1);
}

function checkVictory(state) {
  const aliveEnemies = state.enemies.filter(e => e.hp.current > 0);
  const activeEnemies = aliveEnemies.filter(e => !isDisabled(e));
  
  if (state.build.hp.current <= 0) {
    state.log.push(`\n=== DEFEAT: ${state.build.name} falls ===`);
    return true;
  }
  
  if (aliveEnemies.length === 0) {
    state.log.push(`\n=== VICTORY: All enemies defeated ===`);
    return true;
  }
  
  if (activeEnemies.length === 0) {
    state.log.push(`\n=== VICTORY: All enemies incapacitated ===`);
    return true;
  }
  
  return false;
}


// ═══════════════════════════════════════════════════════════════════════════
// RESULTS COMPILATION
// ═══════════════════════════════════════════════════════════════════════════

function compileResults(state) {
  const aliveEnemies = state.enemies.filter(e => e.hp.current > 0);
  const result = aliveEnemies.length === 0 ? 'victory' : (state.build.hp.current <= 0 ? 'defeat' : 'stalemate');
  
  return {
    result,
    rounds: state.round,
    finalHP: state.build.hp.current,
    hpPct: Math.round((state.build.hp.current / state.build.hp.max) * 100),
    slotsUsed: {
      1: 4 - state.build.slots[1],
      2: 3 - state.build.slots[2],
      3: 3 - state.build.slots[3],
      4: 3 - state.build.slots[4],
    },
    enemiesKilled: state.enemies.filter(e => e.hp.current <= 0).length,
    enemiesTotal: state.enemies.length,
    log: state.log,
    keyMoments: extractKeyMoments(state.log),
  };
}

function extractKeyMoments(log) {
  const moments = [];
  
  log.forEach(line => {
    if (line.includes('CHARMED') || line.includes('paralyzed')) moments.push(line);
    if (line.includes('Concentration') && line.includes('BROKEN')) moments.push(line);
    if (line.includes('VICTORY') || line.includes('DEFEAT')) moments.push(line);
  });
  
  return moments.slice(0, 5); // Top 5
}


// ═══════════════════════════════════════════════════════════════════════════
// RNG UTILITIES
// ═══════════════════════════════════════════════════════════════════════════

function seededRandom(seed) {
  let state = seed * 1000000;
  return () => {
    state = (state * 9301 + 49297) % 233280;
    return state / 233280;
  };
}

function roll1d20(rng) {
  return Math.floor(rng() * 20) + 1;
}

function roll1d4(rng) {
  return Math.floor(rng() * 4) + 1;
}


// ═══════════════════════════════════════════════════════════════════════════
// EXPORTS
// ═══════════════════════════════════════════════════════════════════════════

module.exports = {
  simulateEncounter,
  SPELLS,
};
