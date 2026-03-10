/**
 * Combat AI Decision Engine for Lore Bard Builds
 * 
 * THIS FILE CONTAINS ALL CHARACTER DECISION-MAKING LOGIC.
 * Modify strategies here to change how builds play in combat simulations.
 * 
 * The simulator calls these functions to determine what action a build takes each turn.
 */

// ═══════════════════════════════════════════════════════════════════════════
// STRATEGY PROFILES
// ═══════════════════════════════════════════════════════════════════════════

const STRATEGIES = {
  // Opening turn strategies
  AGGRESSIVE_CONTROL: {
    name: 'Aggressive Control',
    priority: 'offense',
    turn1: 'cast_hypnotic_pattern',
    description: 'Cast Hypnotic Pattern immediately, accept incoming damage risk',
  },
  DEFENSIVE_SETUP: {
    name: 'Defensive Setup', 
    priority: 'defense',
    turn1: 'cast_greater_invisibility',
    description: 'Greater Invisibility T1, then cast offensively with enemy disadvantage',
  },
  SPECIES_ADVANTAGE: {
    name: 'Species Advantage',
    priority: 'hybrid',
    turn1: 'use_species_ability',
    description: 'Firbolg Hidden Step, Eladrin Fey Step, Gem Dragonborn breath before casting',
  },
  ADAPTIVE: {
    name: 'Adaptive',
    priority: 'contextual',
    turn1: 'evaluate_threat',
    description: 'Choose based on enemy count, types, and build defenses',
  },
};

// Strategy weights for decision-making (easily tunable)
const WEIGHTS = {
  // How much does each factor influence decisions?
  concentration_value: 10,      // Maintaining concentration spell is critical
  hp_preservation: 8,           // Staying alive matters
  enemy_disable_value: 9,       // Disabling enemies reduces future threat
  slot_efficiency: 5,           // Don't waste high-level slots unnecessarily
  action_economy: 7,            // Getting to cast matters (not wasting turn on defense if not needed)
};

// Threat assessment thresholds
const THREAT_THRESHOLDS = {
  high_damage_per_round: 15,    // If expected damage > this, go defensive
  low_hp_threshold: 0.3,        // If HP < 30%, prioritize defense/healing
  many_enemies: 5,              // If 5+ enemies, AoE control is critical
  few_enemies: 2,               // If ≤2 enemies, single-target may suffice
};


// ═══════════════════════════════════════════════════════════════════════════
// MAIN DECISION FUNCTIONS
// ═══════════════════════════════════════════════════════════════════════════

/**
 * Choose action for Turn 1 (opening move)
 * This is the most impactful decision in the encounter.
 */
function chooseTurn1Action(buildState, enemyStates, scenario) {
  const { computed, abilities, slots, conditions } = buildState;
  const activeEnemies = enemyStates.filter(e => !isDisabled(e));
  const enemyCount = activeEnemies.length;

  // DEFAULT STRATEGY: Let builds specify their preferred opening
  // This allows per-build customization via buildState.preferredStrategy
  const strategy = buildState.preferredStrategy || 'ADAPTIVE';

  if (strategy === 'AGGRESSIVE_CONTROL' || (strategy === 'ADAPTIVE' && enemyCount >= THREAT_THRESHOLDS.many_enemies)) {
    // Cast Hypnotic Pattern immediately
    if (slots[3] > 0) {
      return {
        type: 'cast_spell',
        spell: 'Hypnotic Pattern',
        slot: 3,
        targets: selectAoETargets(activeEnemies, 30), // 30ft cube
        reason: `Opening with HP: ${enemyCount} enemies, maximize disable chance`,
      };
    }
  }

  if (strategy === 'DEFENSIVE_SETUP' || (strategy === 'ADAPTIVE' && computed.finalAc <= 14 && !abilities.canFly)) {
    // Low AC builds go invisible first
    if (slots[4] > 0) {
      return {
        type: 'cast_spell',
        spell: 'Greater Invisibility',
        slot: 4,
        targets: ['self'],
        reason: 'Low AC build: Go invisible T1, cast offensively T2 with disadvantage on attacks',
      };
    }
  }

  if (strategy === 'SPECIES_ADVANTAGE' || abilities.hiddenStep) {
    // Firbolg: Hidden Step (BA) + Hypnotic Pattern (action)
    if (abilities.hiddenStep && abilities.hiddenStepUses > 0 && slots[3] > 0) {
      return {
        type: 'combo',
        bonusAction: { type: 'use_ability', ability: 'Hidden Step', reason: 'Invisible for incoming attacks' },
        action: { type: 'cast_spell', spell: 'Hypnotic Pattern', slot: 3, targets: selectAoETargets(activeEnemies, 30) },
        reason: 'Firbolg optimal: Hidden Step + HP, invisible when enemies react',
      };
    }
  }

  // FALLBACK: Hypnotic Pattern if we have the slot
  if (slots[3] > 0) {
    return {
      type: 'cast_spell',
      spell: 'Hypnotic Pattern',
      slot: 3,
      targets: selectAoETargets(activeEnemies, 30),
      reason: 'Default opening: Hypnotic Pattern',
    };
  }

  // Last resort: Hold Person on highest threat
  if (slots[2] > 0) {
    return {
      type: 'cast_spell',
      spell: 'Hold Person',
      slot: 2,
      targets: [selectHighestThreat(activeEnemies)],
      reason: 'No 3rd level slots, using Hold Person',
    };
  }

  return { type: 'dodge', reason: 'No spell slots, dodging' };
}


/**
 * Choose action for subsequent turns (after T1)
 * Reactive to current state: concentration up? HP low? Enemies disabled?
 */
function chooseCombatAction(buildState, enemyStates, scenario, round) {
  const { computed, abilities, slots, conditions, hp, concentratingOn } = buildState;
  const activeEnemies = enemyStates.filter(e => !isDisabled(e));
  const disabledEnemies = enemyStates.filter(e => isDisabled(e));
  const hpPct = hp.current / hp.max;

  // CRITICAL HP: Go defensive
  if (hpPct < THREAT_THRESHOLDS.low_hp_threshold) {
    // Try to get airborne if not already flying
    if (abilities.canFly && !conditions.includes('flying')) {
      // Permanent flight (Fairy): should already be flying, but safety check
      if (abilities.permanentFlight) {
        conditions.push('flying');
        // No action cost — still get a full action this turn
      }
      // Racial activated flight (Gem Dragonborn): bonus action, no spell, no concentration
      else if (abilities.limitedFlight && abilities.limitedFlightUses > 0) {
        return {
          type: 'combo',
          bonusAction: { type: 'use_ability', ability: 'Gem Flight', reason: 'Activating racial flight to escape' },
          action: { type: 'dodge' },
          reason: `HP at ${Math.round(hpPct*100)}%, activating Gem Flight (bonus action) + dodge`,
        };
      }
    }
    if (slots[4] > 0 && !conditions.includes('invisible')) {
      return {
        type: 'cast_spell',
        spell: 'Greater Invisibility',
        slot: 4,
        targets: ['self'],
        reason: `HP at ${Math.round(hpPct*100)}%, going invisible`,
      };
    }
  }

  // CONCENTRATION ACTIVE: Maintain it, don't recast
  if (concentratingOn) {
    // If most enemies disabled, clean up with cantrips
    if (disabledEnemies.length >= activeEnemies.length * 0.7) {
      return {
        type: 'cast_cantrip',
        spell: 'Vicious Mockery',
        targets: [selectHighestThreat(activeEnemies)],
        reason: `Concentration on ${concentratingOn}, ${disabledEnemies.length}/${enemyStates.length} disabled, cleanup mode`,
      };
    }
    
    // More enemies still active, but concentration is working — maintain
    return {
      type: 'dodge',
      reason: `Maintaining concentration on ${concentratingOn}, dodging to protect it`,
    };
  }

  // NO CONCENTRATION: Evaluate whether to cast offensively
  if (activeEnemies.length >= 3 && slots[3] > 0) {
    return {
      type: 'cast_spell',
      spell: 'Hypnotic Pattern',
      slot: 3,
      targets: selectAoETargets(activeEnemies, 30),
      reason: `Concentration dropped, ${activeEnemies.length} active enemies, recasting HP`,
    };
  }

  if (activeEnemies.length >= 1 && slots[2] > 0) {
    return {
      type: 'cast_spell',
      spell: 'Hold Person',
      slot: 2,
      targets: [selectHighestThreat(activeEnemies)],
      reason: 'Hold Person on remaining threat',
    };
  }

  // Cleanup with cantrips
  return {
    type: 'cast_cantrip',
    spell: 'Vicious Mockery',
    targets: [selectHighestThreat(activeEnemies)],
    reason: 'Cantrip cleanup, conserving slots',
  };
}


/**
 * Decide whether to use a reaction (Cutting Words, Counterspell, Shield)
 * Called when a triggering event occurs.
 */
function chooseReaction(buildState, trigger, context) {
  const { computed, abilities, slots, conditions, hp, concentratingOn } = buildState;
  const hpPct = hp.current / hp.max;

  // CUTTING WORDS: Reduce enemy attack roll
  if (trigger.type === 'enemy_attack_roll') {
    const { roll, targetAC, damage } = trigger;
    const wouldHit = roll >= targetAC;
    
    // Only use if it would prevent a hit AND we have uses left
    if (wouldHit && abilities.cuttingWordsUses > 0) {
      const avgReduction = 4.5; // 1d8 average
      const likelyPreventsHit = (roll - avgReduction) < targetAC;
      
      if (likelyPreventsHit) {
        // Extra weight if we're concentrating
        const value = concentratingOn ? WEIGHTS.concentration_value : WEIGHTS.hp_preservation;
        if (value >= 7) {
          return {
            type: 'use_cutting_words',
            reason: concentratingOn 
              ? `Preventing hit to protect concentration on ${concentratingOn}`
              : 'Preventing hit to preserve HP',
          };
        }
      }
    }
  }

  // SHIELD SPELL: +5 AC when attacked
  if (trigger.type === 'enemy_attack_about_to_hit') {
    const { roll, currentAC, damage } = trigger;
    const wouldMiss = (roll < currentAC + 5);
    
    if (wouldMiss && slots[1] > 0) {
      // Use Shield if we're concentrating or HP is low
      if (concentratingOn || hpPct < 0.5) {
        return {
          type: 'cast_shield',
          reason: concentratingOn 
            ? `Shield to protect concentration on ${concentratingOn}`
            : 'Shield to preserve HP',
        };
      }
    }
  }

  // COUNTERSPELL: Enemy casting a spell
  if (trigger.type === 'enemy_casting_spell') {
    const { spellLevel, casterName } = trigger;
    
    // Always counter high-level spells (5+)
    if (spellLevel >= 5 && slots[3] > 0) {
      return {
        type: 'cast_counterspell',
        reason: `Countering level ${spellLevel} spell from ${casterName}`,
      };
    }
    
    // Counter AoE spells that would hit us
    if (trigger.spellName && ['Fireball', 'Lightning Bolt', 'Cone of Cold'].includes(trigger.spellName) && slots[3] > 0) {
      return {
        type: 'cast_counterspell',
        reason: `Countering ${trigger.spellName} AoE`,
      };
    }
  }

  return { type: 'no_reaction', reason: 'Saving resources' };
}


// ═══════════════════════════════════════════════════════════════════════════
// HELPER FUNCTIONS
// ═══════════════════════════════════════════════════════════════════════════

function isDisabled(enemyState) {
  const disablingConditions = ['charmed', 'paralyzed', 'unconscious', 'stunned', 'incapacitated'];
  return disablingConditions.some(c => enemyState.conditions.includes(c));
}

function selectAoETargets(enemies, radiusFt) {
  // Simple heuristic: Select position that hits most enemies
  // In real implementation, would calculate optimal AoE placement
  return enemies.slice(0, Math.min(10, enemies.length)); // HP hits up to 10 creatures in 30ft cube
}

function selectHighestThreat(enemies) {
  // Prioritize by: 1) damage potential, 2) HP remaining, 3) abilities
  return enemies.sort((a, b) => {
    const aThreat = (a.avgDamagePerRound || 0) * (a.hp.current / a.hp.max);
    const bThreat = (b.avgDamagePerRound || 0) * (b.hp.current / b.hp.max);
    return bThreat - aThreat;
  })[0];
}


// ═══════════════════════════════════════════════════════════════════════════
// EXPORTS
// ═══════════════════════════════════════════════════════════════════════════

module.exports = {
  // Main decision functions
  chooseTurn1Action,
  chooseCombatAction,
  chooseReaction,
  
  // Strategy configuration (export so it can be modified)
  STRATEGIES,
  WEIGHTS,
  THREAT_THRESHOLDS,
  
  // Helpers
  isDisabled,
  selectAoETargets,
  selectHighestThreat,
};
