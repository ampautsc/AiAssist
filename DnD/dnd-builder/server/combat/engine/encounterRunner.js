/**
 * Encounter Runner — generic combat loop
 * 
 * Runs a D&D 5e combat encounter given:
 *   - A list of combatants (from creature factory)
 *   - AI decision functions (pluggable per side or creature)
 *   - Victory conditions
 * 
 * Does NOT hardcode any specific creature or spell behavior.
 * All spell resolution goes through the spell resolver.
 * All combat mechanics go through the mechanics module.
 */

const dice = require('./dice');
const mech = require('./mechanics');
const spellResolver = require('./spellResolver');

// ═══════════════════════════════════════════════════════════════════════════
// ENCOUNTER CONFIG
// ═══════════════════════════════════════════════════════════════════════════

/**
 * @typedef {Object} EncounterConfig
 * @property {Object[]} combatants — array of creatures from createCreature()
 * @property {Object} aiHandlers — map of side/id to AI decision function
 * @property {number} maxRounds — default 20
 * @property {boolean} verbose — include detailed logging
 */

const DEFAULT_CONFIG = {
  maxRounds: 20,
  verbose: true,
};

// ═══════════════════════════════════════════════════════════════════════════
// INITIATIVE
// ═══════════════════════════════════════════════════════════════════════════

function rollInitiative(combatants) {
  const rolls = combatants.map(c => {
    const roll = dice.d20();
    const mod = c.dexMod || 0;
    return { combatant: c, roll, mod, total: roll + mod };
  });
  
  // Sort descending by total, then by DEX mod as tiebreaker
  rolls.sort((a, b) => b.total - a.total || b.mod - a.mod);
  return rolls;
}

// ═══════════════════════════════════════════════════════════════════════════
// TURN RESET
// ═══════════════════════════════════════════════════════════════════════════

function resetTurnState(combatant) {
  combatant.usedAction = false;
  combatant.usedBonusAction = false;
  combatant.usedFreeInteraction = false;
  combatant.movementRemaining = combatant.speed;
  combatant.reactedThisRound = false;
  
  // Clear vm_disadvantage (Vicious Mockery — only affects next attack)
  combatant.conditions = combatant.conditions.filter(c => c !== 'vm_disadvantage');
  
  // Remove dodging from previous turn
  mech.removeCondition(combatant, 'dodging');
  
  // Clear prone if flying
  if (combatant.flying && mech.hasCondition(combatant, 'prone')) {
    mech.removeCondition(combatant, 'prone');
  }
}

// ═══════════════════════════════════════════════════════════════════════════
// START-OF-TURN EFFECTS
// ═══════════════════════════════════════════════════════════════════════════

function processStartOfTurn(combatant, allCombatants, log) {
  // PRIORITY: Falling check FIRST — paralyzed/stunned/unconscious while flying
  // This must run before duration checks, because duration expiry would
  // set flying=false and skip the fall damage + prone.
  if (combatant.flying && combatant.conditions.some(c => 
    ['paralyzed', 'stunned', 'unconscious'].includes(c))) {
    combatant.flying = false;
    if (combatant.gemFlight) {
      combatant.gemFlight.active = false;
      combatant.gemFlight.roundsRemaining = 0;
    }
    
    const fallDmg = dice.d6() + dice.d6();
    combatant.currentHP -= fallDmg;
    combatant.totalDamageTaken = (combatant.totalDamageTaken || 0) + fallDmg;
    mech.addCondition(combatant, 'prone');
    
    log.push(`  ⚠ FALLING! ${combatant.name} crashes to the ground!`);
    log.push(`    → Falling damage: 2d6 = ${fallDmg} bludgeoning. HP: ${combatant.currentHP}/${combatant.maxHP}`);
    
    if (combatant.concentrating) {
      spellResolver.checkConcentrationFromDamage(combatant, fallDmg, allCombatants, log);
    }
    
    return combatant.currentHP <= 0 ? 'dead_from_fall' : 'fell';
  }
  
  // Gem Flight duration
  if (combatant.gemFlight && combatant.gemFlight.active) {
    combatant.gemFlight.roundsRemaining--;
    if (combatant.gemFlight.roundsRemaining <= 0) {
      combatant.gemFlight.active = false;
      combatant.flying = false;
      log.push(`  ⚠ Gem Flight expires! ${combatant.name} lands.`);
    }
  }
  
  // Spiritual Weapon duration
  if (combatant.spiritualWeapon && combatant.spiritualWeapon.active) {
    combatant.spiritualWeapon.roundsRemaining--;
    if (combatant.spiritualWeapon.roundsRemaining <= 0) {
      combatant.spiritualWeapon.active = false;
      combatant.spiritualWeapon = null;
    }
  }
  
  // Concentration spell duration
  if (combatant.concentrating && combatant.concentrationRoundsRemaining > 0) {
    combatant.concentrationRoundsRemaining--;
    if (combatant.concentrationRoundsRemaining <= 0) {
      log.push(`  ⚠ ${combatant.concentrating} expires (duration ended)!`);
      mech.breakConcentration(combatant, allCombatants);
    }
  }
  
  return 'ok';
}

// ═══════════════════════════════════════════════════════════════════════════
// END-OF-TURN SAVES
// ═══════════════════════════════════════════════════════════════════════════

function processEndOfTurnSaves(combatant, allCombatants, log) {
  // Hold Person repeat save
  if (mech.hasCondition(combatant, 'paralyzed')) {
    const holders = allCombatants.filter(c => 
      c.concentrating === 'Hold Person' && c.side !== combatant.side && mech.isAlive(c));
    
    if (holders.length > 0) {
      const dc = holders[0].spellSaveDC || 11;
      const save = mech.makeSavingThrow(combatant.saves.wis, dc);
      
      if (save.success) {
        mech.removeCondition(combatant, 'paralyzed');
        log.push(`  END OF TURN: WIS save vs Hold Person [d20:${save.result}+${save.saveBonus}=${save.total} vs DC ${dc}] SUCCESS! No longer paralyzed!`);
      } else {
        log.push(`  END OF TURN: WIS save vs Hold Person [d20:${save.result}+${save.saveBonus}=${save.total} vs DC ${dc}] FAIL. Still paralyzed.`);
      }
    }
  }
  
  // Dragon Fear: frightened repeat save at end of each turn
  if (mech.hasCondition(combatant, 'frightened')) {
    // Find the creature that frightened this combatant (the one with Dragon Fear)
    const fearSources = allCombatants.filter(c =>
      c.side !== combatant.side && mech.isAlive(c) && c.dragonFear
    );
    
    if (fearSources.length > 0) {
      const dc = fearSources[0].dragonFear.dc;
      const save = mech.makeSavingThrow(combatant.saves.wis, dc);
      
      if (save.success) {
        mech.removeCondition(combatant, 'frightened');
        log.push(`  END OF TURN: WIS save vs Dragon Fear [d20:${save.result}+${save.saveBonus}=${save.total} vs DC ${dc}] SUCCESS! ${combatant.name} is no longer frightened!`);
      } else {
        log.push(`  END OF TURN: WIS save vs Dragon Fear [d20:${save.result}+${save.saveBonus}=${save.total} vs DC ${dc}] FAIL. Still frightened.`);
      }
    }
  }
  
  // Hypnotic Pattern: no repeat save (need to be shaken awake as an action)
}

// ═══════════════════════════════════════════════════════════════════════════
// ACTION RESOLUTION — delegates to spell resolver or mechanics
// ═══════════════════════════════════════════════════════════════════════════

function resolveDecision(combatant, decision, allCombatants, log) {
  if (!decision) {
    log.push(`  No valid actions available.`);
    return;
  }
  
  if (decision.reasoning) {
    log.push(`  REASONING: ${decision.reasoning}`);
  }
  
  // Resolve movement
  if (decision.movement) {
    resolveMovement(combatant, decision.movement, log);
  }
  
  // Resolve bonus action (often first: Gem Flight, Spiritual Weapon, Healing Word)
  if (decision.bonusAction) {
    resolveActionItem(combatant, decision.bonusAction, allCombatants, log);
    combatant.usedBonusAction = true;
  }
  
  // Resolve main action
  if (decision.action) {
    resolveActionItem(combatant, decision.action, allCombatants, log);
    combatant.usedAction = true;
  }
}

function resolveMovement(combatant, movement, log) {
  if (movement.type === 'fly_up') {
    log.push(`  MOVEMENT: Flies up ${movement.distance || 20}ft.`);
  } else if (movement.type === 'move_toward' && movement.target) {
    log.push(`  MOVEMENT: Moves toward ${movement.target.name || 'target'}.`);
    if (movement.target.position) {
      combatant.position.y += Math.sign(movement.target.position.y - combatant.position.y) * 
        Math.min(6, Math.abs(movement.target.position.y - combatant.position.y));
    }
  } else if (movement.type === 'move_away') {
    log.push(`  MOVEMENT: Moves away.`);
  }
}

function resolveActionItem(combatant, action, allCombatants, log) {
  switch (action.type) {
    case 'cast_spell':
      spellResolver.resolveSpell(combatant, action, allCombatants, log, action.options || {});
      break;
      
    case 'cast_cantrip':
      spellResolver.resolveCantrip(combatant, action, allCombatants, log, action.options || {});
      break;
      
    case 'attack':
      resolveWeaponAttack(combatant, action, allCombatants, log);
      break;
      
    case 'multiattack':
      resolveMultiattack(combatant, action, allCombatants, log);
      break;
      
    case 'breath_weapon':
      resolveBreathWeapon(combatant, action, allCombatants, log);
      break;
      
    case 'dodge':
      mech.addCondition(combatant, 'dodging');
      log.push(`  ACTION: Dodge. Attacks against have disadvantage.`);
      break;
      
    case 'shake_awake':
      resolveShakeAwake(combatant, action, log);
      break;
      
    case 'gem_flight':
      if (combatant.gemFlight && combatant.gemFlight.uses > 0) {
        combatant.gemFlight.uses--;
        combatant.gemFlight.active = true;
        combatant.gemFlight.roundsRemaining = combatant.gemFlight.duration;
        combatant.flying = true;
        log.push(`  BONUS: Gem Flight activated (${combatant.gemFlight.uses}/${combatant.gemFlight.max} remaining). Flying for ${combatant.gemFlight.duration} rounds.`);
      }
      break;
      
    case 'dragon_fear':
      resolveDragonFear(combatant, action, allCombatants, log);
      break;
      
    default:
      log.push(`  Unknown action type: ${action.type}`);
  }
}

// ═══════════════════════════════════════════════════════════════════════════
// WEAPON ATTACK RESOLUTION
// ═══════════════════════════════════════════════════════════════════════════

function resolveWeaponAttack(attacker, action, allCombatants, log) {
  const target = action.target;
  const weapon = action.weapon || attacker.weapon;
  if (!weapon || !target) return;
  
  let advantage = action.advantage || false;
  let disadvantage = action.disadvantage || false;
  
  // Invisible attacker gets advantage
  if (mech.hasCondition(attacker, 'invisible')) advantage = true;
  // Attacking invisible target gets disadvantage
  if (mech.hasCondition(target, 'invisible')) disadvantage = true;
  // Paralyzed target: advantage & auto-crit within 5ft
  if (mech.hasCondition(target, 'paralyzed')) advantage = true;
  // Frightened: disadvantage on attack rolls while source of fear is visible
  if (mech.hasFrightenedDisadvantage(attacker, allCombatants)) disadvantage = true;
  
  const atkResult = mech.makeAttackRoll(weapon.attackBonus, target.ac, advantage, disadvantage);
  attacker.attacksMade = (attacker.attacksMade || 0) + 1;
  
  // Paralyzed auto-crit within 5ft
  const isCrit = atkResult.isCrit || (mech.hasCondition(target, 'paralyzed') && 
    mech.distanceBetween(attacker, target) <= 5);
  
  if (atkResult.hits) {
    attacker.attacksHit = (attacker.attacksHit || 0) + 1;
    const dmg = mech.rollDamage(weapon.damageDice, weapon.damageBonus, isCrit);
    target._hpBrokenByDamage = false; // Reset flag before damage
    spellResolver.applyDamage(target, dmg.total, attacker);
    
    log.push(`    → ${weapon.name}: [d20:${atkResult.natural}+${weapon.attackBonus}=${atkResult.total} vs AC ${target.ac}] ${isCrit ? 'CRITICAL ' : ''}HIT! ${dmg.total} damage. ${target.name} HP: ${target.currentHP}/${target.maxHP}`);
    
    // Log HP charm break from damage
    if (target._hpBrokenByDamage) {
      log.push(`    → ⚠ ${target.name}: Charm broken by damage! No longer incapacitated.`);
      target._hpBrokenByDamage = false;
    }
    
    if (target.concentrating) {
      spellResolver.checkConcentrationFromDamage(target, dmg.total, allCombatants, log);
    }
  } else {
    log.push(`    → ${weapon.name}: [d20:${atkResult.natural}+${weapon.attackBonus}=${atkResult.total} vs AC ${target.ac}] MISS.`);
  }
}

function resolveMultiattack(attacker, action, allCombatants, log) {
  const target = action.target;
  const count = attacker.multiattack || 1;
  const weapon = attacker.weapons?.[0] || attacker.weapon;
  
  log.push(`  ACTION: Multiattack (${count}× ${weapon?.name || 'weapon'}) on ${target?.name}`);
  
  for (let i = 0; i < count; i++) {
    if (!mech.isAlive(target)) break;
    resolveWeaponAttack(attacker, { ...action, weapon, type: 'attack' }, allCombatants, log);
  }
}

function resolveBreathWeapon(attacker, action, allCombatants, log) {
  const bw = attacker.breathWeapon;
  if (!bw || bw.uses <= 0) return;
  
  bw.uses--;
  const targets = action.targets || [];
  const dc = bw.dc;
  
  log.push(`  ACTION: Breath Weapon (${bw.shape}, DC ${dc} ${bw.save} save, ${bw.damage} ${bw.damageType}). ${bw.uses}/${bw.max} uses remaining.`);
  
  const parsed = dice.parseDiceAndRoll(bw.damage);
  
  for (const target of targets) {
    if (!mech.isAlive(target)) continue;
    const saveAbility = bw.save.toLowerCase();
    const save = mech.makeSavingThrow(target.saves[saveAbility] || 0, dc);
    
    if (!save.success) {
      spellResolver.applyDamage(target, parsed.total, attacker);
      log.push(`    → ${target.name}: ${bw.save} save FAIL! ${parsed.total} ${bw.damageType} damage. HP: ${target.currentHP}/${target.maxHP}`);
    } else {
      const halfDmg = Math.floor(parsed.total / 2);
      spellResolver.applyDamage(target, halfDmg, attacker);
      log.push(`    → ${target.name}: ${bw.save} save SUCCESS! ${halfDmg} damage (half). HP: ${target.currentHP}/${target.maxHP}`);
    }
  }
}

function resolveShakeAwake(combatant, action, log) {
  const target = action.target;
  if (!target) return;
  
  mech.removeAllConditions(target, 'charmed_hp', 'incapacitated');
  log.push(`  ACTION: Shakes ${target.name} awake! Charmed + Incapacitated removed.`);
}

function resolveDragonFear(attacker, action, allCombatants, log) {
  const df = attacker.dragonFear;
  if (!df || df.uses <= 0) {
    log.push(`  ACTION: Dragon Fear — no uses remaining!`);
    return;
  }
  
  df.uses--;
  const targets = action.targets || [];
  const dc = df.dc;
  
  log.push(`  ACTION: Dragon Fear (${df.shape}, DC ${dc} WIS save or frightened 1 minute). ${df.uses}/${df.max} uses remaining.`);
  
  for (const target of targets) {
    if (!mech.isAlive(target)) continue;
    if (mech.hasCondition(target, 'frightened')) {
      log.push(`    → ${target.name}: Already frightened. Skipping.`);
      continue;
    }
    
    // Immunity: creatures immune to frightened condition
    const immunities = target.immunities?.conditions || [];
    if (immunities.includes('frightened')) {
      log.push(`    → ${target.name}: Immune to frightened! No effect.`);
      continue;
    }
    
    // Dark Devotion: advantage on saves vs frightened
    const hasAdv = target.darkDevotion || false;
    const save = mech.makeSavingThrow(target.saves.wis, dc, hasAdv);
    
    if (!save.success) {
      mech.addCondition(target, 'frightened');
      attacker.conditionsInflicted = (attacker.conditionsInflicted || 0) + 1;
      log.push(`    → ${target.name}: WIS save FAIL [d20:${save.result}+${save.saveBonus}=${save.total} vs DC ${dc}]! FRIGHTENED! (Disadvantage on attacks/checks, can't move closer.)`);
    } else {
      log.push(`    → ${target.name}: WIS save SUCCESS [d20:${save.result}+${save.saveBonus}=${save.total} vs DC ${dc}]. Not frightened.`);
    }
  }
}

// ═══════════════════════════════════════════════════════════════════════════
// VICTORY CONDITIONS
// ═══════════════════════════════════════════════════════════════════════════

function checkVictory(allCombatants, round) {
  const party = allCombatants.filter(c => c.side === 'party');
  const enemies = allCombatants.filter(c => c.side === 'enemy');
  
  const partyAlive = party.filter(c => mech.isAlive(c));
  const enemiesAlive = enemies.filter(c => mech.isAlive(c));
  const enemiesActive = mech.getActiveEnemies(enemies);
  
  if (partyAlive.length === 0) {
    return { over: true, winner: 'enemy', reason: 'Party defeated' };
  }
  
  if (enemiesAlive.length === 0) {
    return { over: true, winner: 'party', reason: 'All enemies defeated' };
  }
  
  // All enemies incapacitated: the bard should be picking them off with cantrips.
  // Damage breaks HP charm on each target individually, so the bard can thin the herd.
  // Only declare stalemate if we've reached round 15+ without progress — the bard
  // may have valid kill strategies that take more than 10 rounds to execute.
  if (enemiesActive.length === 0 && enemiesAlive.length > 0 && round >= 15) {
    return { over: true, winner: 'draw', reason: `All enemies incapacitated but alive — stalemate at round ${round}` };
  }
  
  return { over: false };
}

// ═══════════════════════════════════════════════════════════════════════════
// MAIN ENCOUNTER LOOP
// ═══════════════════════════════════════════════════════════════════════════

/**
 * Run a complete combat encounter.
 * 
 * @param {Object} config
 * @param {Object[]} config.combatants — creatures from createCreature()
 * @param {Function} config.getDecision — (combatant, allCombatants, round, log) => decision
 * @param {number} [config.maxRounds=20]
 * @param {boolean} [config.verbose=true]
 * @returns {{ winner: string, rounds: number, log: string[], analytics: Object, positionSnapshots: Object[] }}
 */
function runEncounter(config) {
  const { combatants, getDecision, maxRounds = 20, verbose = true } = config;
  const allCombatants = [...combatants];
  const fullLog = [];
  const positionSnapshots = [];   // Per-round position tracking for hex map replay
  
  function log(msg) {
    fullLog.push(msg);
    if (verbose) console.log(msg);
  }
  
  /** Record a snapshot of all combatant positions + state for hex map display */
  function recordSnapshot(round, phase) {
    positionSnapshots.push({
      round,
      phase,
      combatants: allCombatants.map(c => ({
        id: c.id,
        name: c.name,
        side: c.side,
        position: { ...(c.position || { x: 0, y: 0 }) },
        currentHP: c.currentHP,
        maxHP: c.maxHP,
        alive: mech.isAlive(c),
        flying: !!c.flying,
        conditions: [...(c.conditions || [])],
      })),
    });
  }
  
  // Roll initiative
  const initOrder = rollInitiative(allCombatants);
  const turnOrder = initOrder.map(ir => ir.combatant);
  
  if (verbose) {
    log('═══ INITIATIVE ═══');
    initOrder.forEach((ir, i) => {
      log(`  ${i+1}. ${ir.combatant.name}: [d20:${ir.roll}+${ir.mod}=${ir.total}]`);
    });
    log('');
  }
  
  // Snapshot starting positions
  recordSnapshot(0, 'start');
  
  // Combat loop
  let result = { over: false };
  let roundCount = 0;
  
  for (let round = 1; round <= maxRounds && !result.over; round++) {
    roundCount = round;
    log(`\n══ ROUND ${round} ══`);
    
    for (const combatant of turnOrder) {
      if (result.over) break;
      if (!mech.isAlive(combatant)) continue;
      
      const turnLog = [];
      
      // Reset turn state
      resetTurnState(combatant);
      
      // Start-of-turn effects
      const sotResult = processStartOfTurn(combatant, allCombatants, turnLog);
      if (sotResult === 'dead_from_fall') {
        turnLog.push(`  ☠ ${combatant.name} dies from falling!`);
        turnLog.forEach(l => log(l));
        result = checkVictory(allCombatants, round);
        continue;
      }
      
      // Turn header
      const condStr = combatant.conditions.length > 0 ? ` | Cond: [${combatant.conditions.join(', ')}]` : '';
      const concStr = combatant.concentrating ? ` | Conc: ${combatant.concentrating}` : '';
      turnLog.push(`\n--- ${combatant.name} --- HP: ${combatant.currentHP}/${combatant.maxHP} | AC: ${combatant.ac}${condStr}${concStr}`);
      
      // Check incapacitated
      if (mech.isIncapacitated(combatant)) {
        turnLog.push(`  ** INCAPACITATED ** Cannot take actions.`);
        processEndOfTurnSaves(combatant, allCombatants, turnLog);
        turnLog.forEach(l => log(l));
        continue;
      }
      
      // Get AI decision
      const decision = getDecision(combatant, allCombatants, round, turnLog);
      
      // Resolve the decision
      resolveDecision(combatant, decision, allCombatants, turnLog);
      
      // End-of-turn saves
      processEndOfTurnSaves(combatant, allCombatants, turnLog);
      
      // Log the turn
      turnLog.forEach(l => log(l));
      
      // Check victory
      result = checkVictory(allCombatants, round);
    }
    
    // Snapshot end-of-round positions for hex map replay
    recordSnapshot(round, 'end');
  }
  
  // Build analytics
  const analytics = buildAnalytics(allCombatants);
  
  return {
    winner: result.winner || 'draw',
    reason: result.reason || `Combat ended after ${roundCount} rounds`,
    rounds: roundCount,
    log: fullLog,
    analytics,
    combatants: allCombatants,
    positionSnapshots,
  };
}

// ═══════════════════════════════════════════════════════════════════════════
// ANALYTICS
// ═══════════════════════════════════════════════════════════════════════════

function buildAnalytics(allCombatants) {
  return allCombatants.map(c => ({
    name: c.name,
    side: c.side,
    finalHP: Math.max(0, c.currentHP),
    maxHP: c.maxHP,
    alive: mech.isAlive(c),
    damageDealt: c.totalDamageDealt || 0,
    damageTaken: c.totalDamageTaken || 0,
    attacksMade: c.attacksMade || 0,
    attacksHit: c.attacksHit || 0,
    hitRate: c.attacksMade > 0 ? Math.round((c.attacksHit / c.attacksMade) * 100) : 0,
    spellsCast: c.spellsCast || 0,
    concentrationSaves: {
      made: c.concentrationSavesMade || 0,
      failed: c.concentrationSavesFailed || 0,
    },
    conditionsInflicted: c.conditionsInflicted || 0,
    conditions: [...(c.conditions || [])],
  }));
}

module.exports = {
  runEncounter,
  rollInitiative,
  resetTurnState,
  processStartOfTurn,
  processEndOfTurnSaves,
  resolveDecision,
  resolveWeaponAttack,
  resolveMultiattack,
  resolveBreathWeapon,
  resolveDragonFear,
  resolveShakeAwake,
  checkVictory,
  buildAnalytics,
};
