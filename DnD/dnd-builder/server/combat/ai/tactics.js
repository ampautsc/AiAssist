/**
 * AI Tactics Module — generic priority-based tactical decision engine
 * 
 * Instead of per-creature hardcoded functions (bardTacticalDecision, cultFanaticTacticalDecision),
 * this module defines:
 * 
 *   1. EVALUATORS — small functions that assess a battlefield situation and propose an action
 *   2. PROFILES — ordered lists of evaluators that define a creature's tactical priorities
 *   3. A generic `makeDecision()` that runs evaluators in priority order
 * 
 * To add a new creature type, define a profile with the right evaluators — no new code needed.
 * To add a new tactic, write one evaluator and plug it into any profile.
 * 
 * The encounter runner expects: getDecision(combatant, allCombatants, round, log) => decision
 * This module provides that via makeTacticalAI(profileName) => getDecision function.
 */

const mech = require('../engine/mechanics');
const { getSpell, hasSpell } = require('../data/spells');

// ═══════════════════════════════════════════════════════════════════════════
// BATTLEFIELD ASSESSMENT — reusable context for evaluators
// ═══════════════════════════════════════════════════════════════════════════

/**
 * Build a snapshot of the battlefield for AI evaluators.
 * Computed once per turn, passed to all evaluators.
 */
function assessBattlefield(me, allCombatants, round) {
  const allies = allCombatants.filter(c => c.side === me.side && c.id !== me.id);
  const enemies = allCombatants.filter(c => c.side !== me.side);
  const activeEnemies = mech.getActiveEnemies(enemies);
  const aliveEnemies = mech.getAllAliveEnemies(enemies);
  const aliveAllies = allies.filter(a => mech.isAlive(a));
  const activeAllies = allies.filter(a => mech.isAlive(a) && !mech.isIncapacitated(a));

  const hpPct = me.currentHP / me.maxHP;
  const enemiesInMelee = activeEnemies.filter(e => mech.distanceBetween(me, e) <= 5);
  const charmedAllies = allies.filter(a => mech.hasCondition(a, 'charmed_hp'));
  const enemyCasters = activeEnemies.filter(e => e.spellsKnown && e.spellsKnown.length > 0);

  const hasConcentration = !!me.concentrating;
  const isFlying = !!me.flying;
  const isInvisible = mech.hasCondition(me, 'invisible');
  const canFly = me.gemFlight && me.gemFlight.uses > 0 && !me.flying;

  return {
    me, allCombatants, round,
    allies, enemies,
    activeEnemies, aliveEnemies,
    aliveAllies, activeAllies,
    hpPct, enemiesInMelee,
    charmedAllies, enemyCasters,
    hasConcentration, isFlying, isInvisible, canFly,
  };
}

// ═══════════════════════════════════════════════════════════════════════════
// TARGETING HELPERS
// ═══════════════════════════════════════════════════════════════════════════

/**
 * Select highest threat enemy: prioritize casters, then by HP%.
 */
function selectHighestThreat(enemies) {
  if (enemies.length === 0) return null;
  return [...enemies].sort((a, b) => {
    const aScore = (a.spellsKnown ? 10 : 0) + (a.currentHP / a.maxHP) * 5;
    const bScore = (b.spellsKnown ? 10 : 0) + (b.currentHP / b.maxHP) * 5;
    return bScore - aScore;
  })[0];
}

/**
 * Select weakest (lowest HP) enemy — good for finishing off.
 */
function selectWeakest(enemies) {
  if (enemies.length === 0) return null;
  return [...enemies].sort((a, b) => a.currentHP - b.currentHP)[0];
}

/**
 * Select closest charmed ally for shake-awake.
 */
function selectClosestCharmedAlly(me, charmedAllies) {
  if (charmedAllies.length === 0) return null;
  return [...charmedAllies].sort((a, b) =>
    mech.distanceBetween(me, a) - mech.distanceBetween(me, b)
  )[0];
}

// ═══════════════════════════════════════════════════════════════════════════
// EVALUATORS — each returns a decision or null (skip)
// ═══════════════════════════════════════════════════════════════════════════

/**
 * SURVIVAL: Cast Greater Invisibility when HP critical.
 * Applicable to creatures with GI in their spell list and a 4th-level slot.
 */
function evalSurvivalInvisibility(ctx) {
  const { me, canFly, hpPct } = ctx;
  if (hpPct >= 0.25) return null;
  if (!me.spellSlots || me.spellSlots[4] <= 0) return null;
  if (mech.hasCondition(me, 'invisible')) return null;
  if (!me.spellsKnown || !me.spellsKnown.includes('Greater Invisibility')) return null;

  const decision = {
    action: { type: 'cast_spell', spell: 'Greater Invisibility', level: 4, target: me },
    reasoning: `HP CRITICAL (${me.currentHP}/${me.maxHP}). Going invisible for survival.`,
  };
  if (canFly && !me.usedBonusAction) {
    decision.bonusAction = { type: 'gem_flight' };
  }
  return decision;
}

/**
 * OPENING: Gem Flight + Hypnotic Pattern on round 1 when no concentration.
 * Signature "Iron Concentration" opener: airborne + AoE disable.
 */
function evalOpeningAoEDisable(ctx) {
  const { me, round, activeEnemies, canFly } = ctx;
  if (round !== 1) return null;
  if (me.concentrating) return null;
  if (!me.spellSlots || me.spellSlots[3] <= 0) return null;
  if (!me.spellsKnown || !me.spellsKnown.includes('Hypnotic Pattern')) return null;
  if (activeEnemies.length < 1) return null;

  return {
    bonusAction: canFly ? { type: 'gem_flight' } : null,
    action: { type: 'cast_spell', spell: 'Hypnotic Pattern', level: 3, targets: activeEnemies },
    movement: canFly ? { type: 'fly_up', distance: 20, reason: 'Elevation to avoid melee' } : null,
    reasoning: `ROUND 1: ${activeEnemies.length} enemies. Opening with ${canFly ? 'Gem Flight + ' : ''}Hypnotic Pattern.`,
  };
}

/**
 * CONCENTRATION ACTIVE — all enemies disabled → pick off weakest with cantrip/crossbow.
 * Vicious Mockery preferred: damage wakes the target, but VM imposes disadvantage
 * on their next attack, protecting concentration when they retaliate.
 * NOTE: Hypnotic Pattern charm breaks on the damaged creature only (others stay charmed).
 */
function evalConcentrationAllDisabled(ctx) {
  const { me, activeEnemies, aliveEnemies, canFly, enemies } = ctx;
  if (!me.concentrating) return null;
  if (activeEnemies.length > 0) return null;
  if (aliveEnemies.length === 0) return null;

  // Pick the weakest disabled enemy to finish off
  const target = selectWeakest(aliveEnemies);
  if (!target) return null;

  const decision = {};
  if (canFly && !me.flying && !me.usedBonusAction) {
    decision.bonusAction = { type: 'gem_flight' };
  }

  // Use Vicious Mockery: damage wakes them, but disadvantage protects us
  if (me.cantrips && me.cantrips.includes('Vicious Mockery')) {
    decision.action = { type: 'cast_cantrip', spell: 'Vicious Mockery', target };
    decision.reasoning = `All ${aliveEnemies.length} enemies disabled by ${me.concentrating}. Picking off ${target.name} (${target.currentHP}HP) with VM — disadvantage protects concentration when they wake.`;
    return decision;
  }

  // Fallback: crossbow for more raw damage
  const crossbow = me.weapons?.find(w => w.type === 'ranged');
  if (crossbow) {
    decision.action = { type: 'attack', weapon: crossbow, target };
    decision.reasoning = `All ${aliveEnemies.length} enemies disabled by ${me.concentrating}. Crossbow on ${target.name} (${target.currentHP}HP).`;
    return decision;
  }

  // Last resort: dodge
  decision.action = { type: 'dodge' };
  decision.reasoning = `All ${aliveEnemies.length} enemies disabled by ${me.concentrating}. No ranged options. Dodging.`;
  return decision;
}

/**
 * CONCENTRATION ACTIVE — enemies in melee → Vicious Mockery for disadvantage.
 * The disadvantage on their next attack protects concentration.
 */
function evalConcentrationMeleeViciousMockery(ctx) {
  const { me, enemiesInMelee } = ctx;
  if (!me.concentrating) return null;
  if (enemiesInMelee.length === 0) return null;
  if (!me.cantrips || !me.cantrips.includes('Vicious Mockery')) return null;

  const target = selectHighestThreat(enemiesInMelee);
  return {
    action: { type: 'cast_cantrip', spell: 'Vicious Mockery', target },
    reasoning: `Concentrating on ${me.concentrating}. Enemy in melee! Vicious Mockery for disadvantage (protects concentration).`,
  };
}

/**
 * CONCENTRATION ACTIVE — finish low-HP target with crossbow.
 */
function evalConcentrationFinishWithCrossbow(ctx) {
  const { me, activeEnemies } = ctx;
  if (!me.concentrating) return null;
  if (activeEnemies.length !== 1) return null;
  const target = activeEnemies[0];
  if (target.currentHP > 10) return null;
  if (!me.weapons || !me.weapons.find(w => w.name && w.name.toLowerCase().includes('crossbow'))) return null;

  const crossbow = me.weapons.find(w => w.name.toLowerCase().includes('crossbow'));
  return {
    action: { type: 'attack', weapon: crossbow, target },
    reasoning: `Concentrating on ${me.concentrating}. One enemy at ${target.currentHP}HP. Crossbow to finish.`,
  };
}

/**
 * CONCENTRATION ACTIVE — breath weapon on clustered enemies (free damage, no slot).
 */
function evalConcentrationBreathWeapon(ctx) {
  const { me, activeEnemies } = ctx;
  if (!me.concentrating) return null;
  if (!me.breathWeapon || me.breathWeapon.uses <= 0) return null;
  if (activeEnemies.length < 2) return null;

  const clustered = activeEnemies.filter(e => mech.distanceBetween(me, e) <= 15);
  if (clustered.length < 2) return null;

  return {
    action: { type: 'breath_weapon', targets: clustered },
    reasoning: `Concentrating on ${me.concentrating}. ${clustered.length} enemies in breath range. Free AoE damage!`,
  };
}

/**
 * CONCENTRATION ACTIVE — Vicious Mockery at range (default while concentrating).
 */
function evalConcentrationRangedViciousMockery(ctx) {
  const { me, activeEnemies } = ctx;
  if (!me.concentrating) return null;
  if (activeEnemies.length === 0) return null;
  if (!me.cantrips || !me.cantrips.includes('Vicious Mockery')) return null;

  const target = selectHighestThreat(activeEnemies);
  return {
    action: { type: 'cast_cantrip', spell: 'Vicious Mockery', target },
    reasoning: `Concentrating on ${me.concentrating}. Vicious Mockery on ${target.name} (disadvantage protects concentration).`,
  };
}

/**
 * CONCENTRATION ACTIVE — bonus action self-heal with Healing Word when HP < 50%.
 */
function evalConcentrationSelfHeal(ctx) {
  const { me, hpPct } = ctx;
  if (!me.concentrating) return null;
  if (hpPct >= 0.5) return null;
  if (!me.spellSlots || me.spellSlots[1] <= 0) return null;
  if (!me.spellsKnown || !me.spellsKnown.includes('Healing Word')) return null;
  if (me.usedBonusAction) return null;

  // This returns only the bonus action — will be merged into whatever decision follows.
  return { _bonusActionOnly: true, bonusAction: { type: 'cast_healing_word', level: 1, target: me } };
}

/**
 * NO CONCENTRATION — re-establish with Hypnotic Pattern if 2+ enemies.
 */
function evalRecastHypnoticPattern(ctx) {
  const { me, activeEnemies } = ctx;
  if (me.concentrating) return null;
  if (activeEnemies.length < 2) return null;
  if (!me.spellSlots || me.spellSlots[3] <= 0) return null;
  if (!me.spellsKnown || !me.spellsKnown.includes('Hypnotic Pattern')) return null;

  return {
    action: { type: 'cast_spell', spell: 'Hypnotic Pattern', level: 3, targets: activeEnemies },
    reasoning: `No concentration active. ${activeEnemies.length} enemies. Recasting Hypnotic Pattern.`,
  };
}

/**
 * NO CONCENTRATION — Hold Person on single target.
 */
function evalCastHoldPerson(ctx) {
  const { me, activeEnemies } = ctx;
  if (me.concentrating) return null;
  if (activeEnemies.length < 1) return null;
  if (!me.spellSlots || me.spellSlots[2] <= 0) return null;
  if (!me.spellsKnown || !me.spellsKnown.includes('Hold Person')) return null;

  const target = selectHighestThreat(activeEnemies);
  return {
    action: { type: 'cast_spell', spell: 'Hold Person', level: 2, target },
    reasoning: `No concentration. Hold Person on ${target.name} (paralyzed = auto-crit in melee).`,
  };
}

/**
 * FALLBACK — Vicious Mockery or cantrip when low on slots.
 */
function evalFallbackCantrip(ctx) {
  const { me, activeEnemies } = ctx;
  if (activeEnemies.length === 0) return null;

  const target = selectHighestThreat(activeEnemies);

  // Prefer Vicious Mockery if known (disadvantage is great utility)
  if (me.cantrips && me.cantrips.includes('Vicious Mockery')) {
    return {
      action: { type: 'cast_cantrip', spell: 'Vicious Mockery', target },
      reasoning: `Low on slots. Vicious Mockery on ${target.name}.`,
    };
  }

  // Sacred Flame if known
  if (me.cantrips && me.cantrips.includes('Sacred Flame')) {
    return {
      action: { type: 'cast_cantrip', spell: 'Sacred Flame', target },
      reasoning: `Using Sacred Flame on ${target.name}.`,
    };
  }

  return null;
}

/**
 * ULTIMATE FALLBACK — Dodge.
 */
function evalDodge(_ctx) {
  return {
    action: { type: 'dodge' },
    reasoning: 'No valid targets or actions. Dodging.',
  };
}


// ═══════════════════════════════════════════════════════════════════════════
// CULT FANATIC EVALUATORS
// ═══════════════════════════════════════════════════════════════════════════

/**
 * INVISIBLE TARGET — buff self or shake allies when can't see target.
 */
function evalEnemyInvisibleFallback(ctx) {
  const { me, activeEnemies } = ctx;
  // Check if only enemies are invisible
  const visibleEnemies = activeEnemies.filter(e => !mech.hasCondition(e, 'invisible'));
  if (visibleEnemies.length > 0 || activeEnemies.length === 0) return null;

  // Spiritual Weapon bonus action still works (doesn't need sight)
  const bonusAction = me.spiritualWeapon && me.spiritualWeapon.active
    ? { type: 'spiritual_weapon_attack', target: activeEnemies[0] }
    : null;

  // Shield of Faith self-buff
  if (me.spellSlots && me.spellSlots[1] > 0 && !me.concentrating &&
      me.spellsKnown && me.spellsKnown.includes('Shield of Faith')) {
    return {
      action: { type: 'cast_spell', spell: 'Shield of Faith', level: 1, target: me },
      bonusAction,
      reasoning: `Can't see enemies (invisible). Shield of Faith on self (+2 AC).`,
    };
  }

  // Shake charmed ally
  const { charmedAllies } = ctx;
  if (charmedAllies.length > 0) {
    const ally = selectClosestCharmedAlly(me, charmedAllies);
    if (ally && mech.distanceBetween(me, ally) <= 5) {
      return {
        action: { type: 'shake_awake', target: ally },
        bonusAction,
        reasoning: `Can't see enemies. Shaking ${ally.name} awake.`,
      };
    }
    if (ally) {
      return {
        movement: { type: 'move_toward', target: ally, distance: Math.min(30, mech.distanceBetween(me, ally) - 5) },
        action: mech.distanceBetween(me, ally) <= 35 ? { type: 'shake_awake', target: ally } : { type: 'dodge' },
        bonusAction,
        reasoning: `Can't see enemies. Moving to shake ${ally.name} awake.`,
      };
    }
  }

  return {
    action: { type: 'dodge' },
    bonusAction,
    reasoning: `Can't see enemies (invisible). Dodging.`,
  };
}

/**
 * FLYING TARGET — ranged spells when can't reach with melee.
 */
function evalFlyingTargetRanged(ctx) {
  const { me, activeEnemies, allies, round } = ctx;

  // Check if primary target is flying and unreachable
  const target = selectHighestThreat(activeEnemies);
  if (!target) return null;
  if (!target.flying || mech.distanceBetween(me, target) <= 5) return null;

  const bonusAction = me.spiritualWeapon && me.spiritualWeapon.active
    ? { type: 'spiritual_weapon_attack', target }
    : null;

  // Hold Person — paralyze makes them fall!
  const allyAlreadyHolding = (allies || []).some(f =>
    f.concentrating === 'Hold Person' && mech.isAlive(f));
  if (round <= 3 && me.spellSlots && me.spellSlots[2] > 0 && !me.concentrating &&
      !allyAlreadyHolding && !mech.hasCondition(target, 'paralyzed') &&
      me.spellsKnown && me.spellsKnown.includes('Hold Person')) {

    // Is Spiritual Weapon available as bonus action?
    let swBonus = bonusAction;
    if (!swBonus && me.spellSlots && me.spellSlots[2] > 1 && !me.spiritualWeapon && !me.usedBonusAction &&
        me.spellsKnown && me.spellsKnown.includes('Spiritual Weapon')) {
      swBonus = { type: 'cast_spell', spell: 'Spiritual Weapon', level: 2, target };
    }
    return {
      action: { type: 'cast_spell', spell: 'Hold Person', level: 2, target },
      bonusAction: swBonus,
      reasoning: `Target is flying. Hold Person to paralyze → they fall!`,
    };
  }

  // Sacred Flame (no attack roll, works vs flying)
  if (me.cantrips && me.cantrips.includes('Sacred Flame')) {
    return {
      action: { type: 'cast_cantrip', spell: 'Sacred Flame', target },
      bonusAction,
      reasoning: `Target is flying. Sacred Flame at range.`,
    };
  }

  return null;
}

/**
 * OPENING ROUND — Spiritual Weapon (BA) + melee or ranged.
 */
function evalOpeningSpiritualWeapon(ctx) {
  const { me, round, activeEnemies } = ctx;
  if (round !== 1) return null;
  if (!me.spellSlots || me.spellSlots[2] <= 0) return null;
  if (me.spiritualWeapon) return null;
  if (!me.spellsKnown || !me.spellsKnown.includes('Spiritual Weapon')) return null;

  const target = selectHighestThreat(activeEnemies);
  if (!target) return null;

  const isInMelee = mech.distanceBetween(me, target) <= 5;

  if (isInMelee && me.multiattack) {
    return {
      bonusAction: { type: 'cast_spell', spell: 'Spiritual Weapon', level: 2, target },
      action: { type: 'multiattack', target },
      reasoning: `Round 1: In melee. Spiritual Weapon (BA) + multiattack.`,
    };
  }

  if (mech.distanceBetween(me, target) <= 35 && me.multiattack) {
    return {
      movement: { type: 'move_toward', target, distance: Math.min(30, mech.distanceBetween(me, target) - 5) },
      bonusAction: { type: 'cast_spell', spell: 'Spiritual Weapon', level: 2, target },
      action: { type: 'multiattack', target },
      reasoning: `Round 1: Moving to melee. Spiritual Weapon + multiattack.`,
    };
  }

  // Too far
  return {
    bonusAction: { type: 'cast_spell', spell: 'Spiritual Weapon', level: 2, target },
    action: (me.cantrips && me.cantrips.includes('Sacred Flame'))
      ? { type: 'cast_cantrip', spell: 'Sacred Flame', target }
      : { type: 'dodge' },
    movement: { type: 'move_toward', target, distance: 30 },
    reasoning: `Round 1: Too far for melee. Spiritual Weapon + ranged.`,
  };
}

/**
 * SHAKE AWAKE — prioritize freeing charmed allies from Hypnotic Pattern.
 */
function evalShakeAwakeAllies(ctx) {
  const { me, charmedAllies, activeEnemies } = ctx;
  if (charmedAllies.length === 0) return null;

  // Only if enemy is concentrating on HP
  const hpConcentrators = activeEnemies.filter(e => e.concentrating === 'Hypnotic Pattern');
  // Even without that check, charmed_hp allies should be freed
  if (charmedAllies.length === 0) return null;

  const ally = selectClosestCharmedAlly(me, charmedAllies);
  if (!ally) return null;

  const bonusAction = me.spiritualWeapon && me.spiritualWeapon.active
    ? { type: 'spiritual_weapon_attack', target: selectHighestThreat(activeEnemies) || me }
    : null;

  if (mech.distanceBetween(me, ally) <= 5) {
    return {
      action: { type: 'shake_awake', target: ally },
      bonusAction,
      reasoning: `Ally charmed by Hypnotic Pattern! Shaking ${ally.name} awake.`,
    };
  }

  const dist = mech.distanceBetween(me, ally) - 5;
  return {
    movement: { type: 'move_toward', target: ally, distance: Math.min(30, dist) },
    action: dist <= 30 ? { type: 'shake_awake', target: ally } : { type: 'dodge' },
    bonusAction,
    reasoning: `Moving to shake ${ally.name} awake from charm.`,
  };
}

/**
 * RANGED WEAPON ATTACK — throw javelin, shoot bow, etc. when target is out of melee.
 * Works for any creature with a ranged weapon (ogres, bandits, etc.)
 */
function evalRangedWeaponAttack(ctx) {
  const { me, activeEnemies } = ctx;
  const rangedWeapon = me.weapons?.find(w => w.type === 'ranged');
  if (!rangedWeapon) return null;

  const target = selectHighestThreat(activeEnemies);
  if (!target) return null;

  const dist = mech.distanceBetween(me, target);
  // Only use ranged if can't reach melee (> 5ft) AND within weapon range
  if (dist <= 5) return null;
  const maxRange = rangedWeapon.longRange || rangedWeapon.range || 60;
  if (dist > maxRange) return null;

  return {
    action: { type: 'attack', weapon: rangedWeapon, target },
    reasoning: `Can't reach melee (${dist}ft). ${rangedWeapon.name} at ${target.name}.`,
  };
}

/**
 * MELEE COMBAT — multiattack or weapon attack when in melee range.
 */
function evalMeleeAttack(ctx) {
  const { me, activeEnemies } = ctx;
  const target = selectHighestThreat(activeEnemies);
  if (!target) return null;
  if (mech.distanceBetween(me, target) > 5) return null;

  const bonusAction = me.spiritualWeapon && me.spiritualWeapon.active
    ? { type: 'spiritual_weapon_attack', target }
    : null;

  if (me.multiattack) {
    return {
      action: { type: 'multiattack', target },
      bonusAction,
      reasoning: `In melee with ${target.name}. Multiattack.`,
    };
  }

  const weapon = me.weapons?.[0] || me.weapon;
  if (weapon) {
    return {
      action: { type: 'attack', weapon, target },
      bonusAction,
      reasoning: `In melee with ${target.name}. ${weapon.name} attack.`,
    };
  }

  return null;
}

/**
 * INFLICT WOUNDS — big melee spell damage when in range.
 */
function evalInflictWounds(ctx) {
  const { me, activeEnemies } = ctx;
  if (!me.spellSlots || me.spellSlots[1] <= 0) return null;
  if (!me.spellsKnown || !me.spellsKnown.includes('Inflict Wounds')) return null;

  const target = selectHighestThreat(activeEnemies);
  if (!target) return null;
  if (mech.distanceBetween(me, target) > 5) return null;

  const bonusAction = me.spiritualWeapon && me.spiritualWeapon.active
    ? { type: 'spiritual_weapon_attack', target }
    : null;

  return {
    action: { type: 'cast_spell', spell: 'Inflict Wounds', level: 1, target },
    bonusAction,
    reasoning: `In melee. Inflict Wounds for heavy damage (3d10).`,
  };
}

/**
 * RANGED CANTRIP with move toward target.
 */
function evalRangedCantripWithApproach(ctx) {
  const { me, activeEnemies } = ctx;
  const target = selectHighestThreat(activeEnemies);
  if (!target) return null;

  const bonusAction = me.spiritualWeapon && me.spiritualWeapon.active
    ? { type: 'spiritual_weapon_attack', target }
    : null;

  if (me.cantrips && me.cantrips.includes('Sacred Flame')) {
    return {
      action: { type: 'cast_cantrip', spell: 'Sacred Flame', target },
      movement: { type: 'move_toward', target, distance: 30 },
      bonusAction,
      reasoning: `Not in melee. Sacred Flame + approaching.`,
    };
  }

  return null;
}


// ═══════════════════════════════════════════════════════════════════════════
// REACTION EVALUATORS
// ═══════════════════════════════════════════════════════════════════════════

/**
 * Cutting Words — reduce enemy attack roll using Bardic Inspiration die.
 */
function evalCuttingWords(me, trigger) {
  if (me.reactedThisRound) return null;
  if (trigger.type !== 'enemy_attack_roll') return null;
  if (!me.bardicInspirationUses || me.bardicInspirationUses <= 0) return null;

  const { roll, targetAC } = trigger;
  if (roll < targetAC) return null; // Would miss anyway

  // Maximum d8 roll (8) could make it miss?
  if (roll - 8 >= targetAC) return null; // Even max reduction can't save it

  return {
    type: 'cutting_words',
    die: 8, // The encounter runner handles rolling
    reason: `Cutting Words to reduce attack (protecting ${me.concentrating ? 'concentration' : 'HP'})`,
  };
}

/**
 * Counterspell — counter dangerous enemy spells.
 */
function evalCounterspell(me, trigger) {
  if (me.reactedThisRound) return null;
  if (trigger.type !== 'enemy_casting_spell') return null;
  if (!me.spellSlots || me.spellSlots[3] <= 0) return null;
  if (!me.spellsKnown || !me.spellsKnown.includes('Counterspell')) return null;

  const { spell } = trigger;
  // Counter dangerous spells: Hold Person (paralyze!), Inflict Wounds (big damage)
  const dangerousSpells = ['Hold Person', 'Inflict Wounds', 'Hypnotic Pattern', 'Command'];
  if (!dangerousSpells.includes(spell)) return null;

  return {
    type: 'counterspell',
    slotLevel: 3,
    reason: `Counterspelling ${trigger.caster?.name || 'enemy'}'s ${spell} — too dangerous`,
  };
}


// ═══════════════════════════════════════════════════════════════════════════
// PROFILES — ordered evaluator lists defining creature behavior
// ═══════════════════════════════════════════════════════════════════════════

/**
 * Profile registry. Each profile is an array of evaluator functions.
 * The first evaluator to return non-null wins.
 */
const PROFILES = {};

// Lore Bard — "Iron Concentration" style:
// 1. Survive (GI when critical)
// 2. Opening AoE disable (Gem Flight + HP)
// 3. Maintain concentration (Dodge if all disabled, VM in melee, finish low targets, breath weapon, VM at range)
// 4. Re-establish control (HP if 2+, Hold Person if 1)
// 5. Cantrip fallback
// 6. Dodge fallback
PROFILES['lore_bard'] = [
  evalSurvivalInvisibility,
  evalOpeningAoEDisable,
  evalConcentrationAllDisabled,
  evalConcentrationMeleeViciousMockery,
  evalConcentrationFinishWithCrossbow,
  evalConcentrationBreathWeapon,
  evalConcentrationRangedViciousMockery,
  evalRecastHypnoticPattern,
  evalCastHoldPerson,
  evalFallbackCantrip,
  evalDodge,
];

// Cult Fanatic — average intelligence (INT 10):
// 1. Can't see target → fallback
// 2. Target flying → ranged options
// 3. Shake awake charmed allies
// 4. Opening round → Spiritual Weapon + melee
// 5. Melee attack (multiattack preferred)
// 6. Inflict Wounds in melee
// 7. Ranged cantrip + approach
// 8. Dodge fallback
PROFILES['cult_fanatic'] = [
  evalEnemyInvisibleFallback,
  evalFlyingTargetRanged,
  evalShakeAwakeAllies,
  evalOpeningSpiritualWeapon,
  evalMeleeAttack,
  evalInflictWounds,
  evalRangedCantripWithApproach,
  evalDodge,
];

// Generic melee — creature with weapons. Will try melee first, then ranged
// weapons (javelins, etc.), then approach and close distance.
PROFILES['generic_melee'] = [
  evalMeleeAttack,
  evalRangedWeaponAttack,
  evalApproachAndMelee,
  evalDodge,
];

// Generic ranged — creature with ranged weapons (shortbow, etc.) or cantrips
// Priority: shake allies > ranged weapon > cantrip > approach melee > dodge
PROFILES['generic_ranged'] = [
  evalShakeAwakeAllies,
  evalRangedWeaponAttack,
  evalFallbackCantrip,
  evalApproachAndMelee,
  evalDodge,
];


// ═══════════════════════════════════════════════════════════════════════════
// MONSTER-SPECIFIC EVALUATORS
// ═══════════════════════════════════════════════════════════════════════════

/**
 * DRAGON: Breath weapon on round 1 or when targets are clustered.
 * Breath weapon recharges on 5-6 per round, but for simplicity we model
 * it as uses-based (matching creature template).
 */
function evalDragonBreathWeapon(ctx) {
  const { me, activeEnemies, round } = ctx;
  if (!me.breathWeapon || me.breathWeapon.uses <= 0) return null;
  
  // Use breath weapon if 1+ enemies in range (prioritize round 1)
  const inRange = activeEnemies.filter(e => mech.distanceBetween(me, e) <= 15);
  if (inRange.length === 0) return null;
  
  // Always use on round 1; after that, only if 2+ targets in range
  if (round > 1 && inRange.length < 2) return null;
  
  return {
    action: { type: 'breath_weapon', targets: inRange },
    reasoning: `Breath Weapon on ${inRange.length} targets! (${me.breathWeapon.uses} uses remaining)`,
  };
}

/**
 * DRAGON: Multiattack (bite + 2 claws) as primary combat action.
 */
function evalDragonMultiattack(ctx) {
  const { me, activeEnemies } = ctx;
  if (!me.multiattack) return null;
  const target = selectHighestThreat(activeEnemies);
  if (!target) return null;
  
  return {
    action: { type: 'multiattack', target },
    reasoning: `Multiattack on ${target.name} (${me.multiattack} attacks).`,
  };
}

/**
 * DRAGON: Fly-by attack — if not already flying, take flight.
 */
function evalDragonFlyUp(ctx) {
  const { me, activeEnemies } = ctx;
  if (me.flying) return null;
  if (!me.innateFlying) return null;
  
  const target = selectHighestThreat(activeEnemies);
  return {
    action: me.multiattack ? { type: 'multiattack', target } : { type: 'dodge' },
    movement: { type: 'fly_up', distance: 30, reason: 'Take flight for aerial advantage' },
    reasoning: 'Taking flight for tactical advantage.',
  };
}

/**
 * GIANT: Throw rock at flying or distant target.
 */
function evalGiantRockThrow(ctx) {
  const { me, activeEnemies } = ctx;
  const rangedWeapon = me.weapons?.find(w => w.type === 'ranged');
  if (!rangedWeapon) return null;
  
  const target = selectHighestThreat(activeEnemies);
  if (!target) return null;
  
  // Only throw rocks if target is flying or > 10ft away
  if (!target.flying && mech.distanceBetween(me, target) <= 10) return null;
  
  return {
    action: { type: 'attack', weapon: rangedWeapon, target },
    reasoning: `Throwing rock at ${target.name} (${target.flying ? 'flying' : 'distant'}).`,
  };
}

/**
 * GIANT: Close and smash with melee multiattack.
 */
function evalGiantMelee(ctx) {
  const { me, activeEnemies } = ctx;
  const target = selectHighestThreat(activeEnemies);
  if (!target) return null;
  
  if (me.multiattack) {
    return {
      action: { type: 'multiattack', target },
      movement: mech.distanceBetween(me, target) > 5 
        ? { type: 'move_toward', target, distance: Math.min(me.speed || 40, mech.distanceBetween(me, target) - 5) }
        : null,
      reasoning: `Closing to melee. Multiattack on ${target.name}.`,
    };
  }
  
  const weapon = me.weapons?.find(w => w.type === 'melee') || me.weapons?.[0];
  if (!weapon) return null;
  
  return {
    action: { type: 'attack', weapon, target },
    movement: mech.distanceBetween(me, target) > 5 
      ? { type: 'move_toward', target, distance: Math.min(me.speed || 40, mech.distanceBetween(me, target) - 5) }
      : null,
    reasoning: `${weapon.name} attack on ${target.name}.`,
  };
}

/**
 * MAGE: Open with Fireball if 2+ enemies clustered.
 */
function evalMageFireball(ctx) {
  const { me, activeEnemies } = ctx;
  if (!me.spellSlots || me.spellSlots[3] <= 0) return null;
  if (!me.spellsKnown || !me.spellsKnown.includes('Fireball')) return null;
  if (activeEnemies.length < 1) return null;  // will almost always fire on 1+
  
  return {
    action: { type: 'cast_spell', spell: 'Fireball', level: 3, targets: activeEnemies },
    reasoning: `Fireball on ${activeEnemies.length} targets!`,
  };
}

/**
 * MAGE: Shield as defensive reaction.
 * (Handled in reaction profile, not turn evaluator)
 */

/**
 * MAGE: Fire Bolt cantrip for sustained damage.
 */
function evalMageFireBolt(ctx) {
  const { me, activeEnemies } = ctx;
  if (!me.cantrips || !me.cantrips.includes('Fire Bolt')) return null;
  const target = selectHighestThreat(activeEnemies);
  if (!target) return null;
  
  return {
    action: { type: 'cast_cantrip', spell: 'Fire Bolt', target },
    reasoning: `Fire Bolt at ${target.name}.`,
  };
}

/**
 * MAGE: Misty Step (bonus action) to escape melee.
 */
function evalMageMistyStep(ctx) {
  const { me, enemiesInMelee } = ctx;
  if (enemiesInMelee.length === 0) return null;
  if (!me.spellSlots || me.spellSlots[2] <= 0) return null;
  if (!me.spellsKnown || !me.spellsKnown.includes('Misty Step')) return null;
  if (me.usedBonusAction) return null;
  
  return {
    _bonusActionOnly: true,
    bonusAction: { type: 'cast_spell', spell: 'Misty Step', level: 2, target: me },
    reasoning: 'Misty Step to escape melee!',
  };
}

/**
 * LICH: Use Power Word Stun if target HP ≤150.
 */
function evalLichPowerWordStun(ctx) {
  const { me, activeEnemies } = ctx;
  if (!me.spellSlots || me.spellSlots[8] <= 0) return null;
  if (!me.spellsKnown || !me.spellsKnown.includes('Power Word Stun')) return null;
  
  // Use on a target with ≤150 HP (auto-stun, no save)
  const target = activeEnemies.find(e => e.currentHP <= 150);
  if (!target) return null;
  
  return {
    action: { type: 'cast_spell', spell: 'Power Word Stun', level: 8, target },
    reasoning: `Power Word Stun on ${target.name} (HP ${target.currentHP} ≤ 150). Auto-stun!`,
  };
}

/**
 * LICH: Finger of Death for heavy single-target damage.
 */
function evalLichFingerOfDeath(ctx) {
  const { me, activeEnemies } = ctx;
  if (!me.spellSlots || me.spellSlots[7] <= 0) return null;
  if (!me.spellsKnown || !me.spellsKnown.includes('Finger of Death')) return null;
  
  const target = selectHighestThreat(activeEnemies);
  if (!target) return null;
  
  return {
    action: { type: 'cast_spell', spell: 'Finger of Death', level: 7, target },
    reasoning: `Finger of Death on ${target.name}. 7d8+30 necrotic.`,
  };
}

/**
 * LICH: Cloudkill for sustained AoE damage.
 */
function evalLichCloudkill(ctx) {
  const { me, activeEnemies } = ctx;
  if (me.concentrating) return null;
  if (!me.spellSlots || me.spellSlots[5] <= 0) return null;
  if (!me.spellsKnown || !me.spellsKnown.includes('Cloudkill')) return null;
  if (activeEnemies.length < 2) return null;
  
  return {
    action: { type: 'cast_spell', spell: 'Cloudkill', level: 5, targets: activeEnemies },
    reasoning: `Cloudkill on ${activeEnemies.length} targets. Sustained AoE damage.`,
  };
}

/**
 * LICH: Legendary Resistance — used by the reaction system, not turn evaluator.
 * Implemented as a special reaction: when a save fails, auto-succeed instead.
 */
function evalLegendaryResistance(me, trigger) {
  if (me.reactedThisRound) return null;
  if (trigger.type !== 'failed_save') return null;
  if (!me.legendaryResistance || me.legendaryResistance.uses <= 0) return null;
  
  return {
    type: 'legendary_resistance',
    reason: `Legendary Resistance! Auto-succeeds save (${me.legendaryResistance.uses} uses left).`,
  };
}

/**
 * ARCHMAGE: Cone of Cold opener — big AoE damage.
 */
function evalArchmageConeOfCold(ctx) {
  const { me, activeEnemies, round } = ctx;
  if (round > 2) return null;  // only use early
  if (!me.spellSlots || me.spellSlots[5] <= 0) return null;
  if (!me.spellsKnown || !me.spellsKnown.includes('Cone of Cold')) return null;
  if (activeEnemies.length < 1) return null;
  
  return {
    action: { type: 'cast_spell', spell: 'Cone of Cold', level: 5, targets: activeEnemies },
    reasoning: `Cone of Cold on ${activeEnemies.length} targets! 8d8 cold damage.`,
  };
}

/**
 * Generic approach + melee for creatures that need to close distance.
 */
function evalApproachAndMelee(ctx) {
  const { me, activeEnemies } = ctx;
  const target = selectHighestThreat(activeEnemies);
  if (!target) return null;
  
  const dist = mech.distanceBetween(me, target);
  if (dist <= 5) return null; // already in melee, use evalMeleeAttack
  
  const weapon = me.weapons?.find(w => w.type === 'melee') || me.weapons?.[0];
  const canReach = dist <= (me.speed || 30) + 5;
  
  if (canReach && weapon) {
    return {
      movement: { type: 'move_toward', target, distance: dist - 5 },
      action: me.multiattack ? { type: 'multiattack', target } : { type: 'attack', weapon, target },
      reasoning: `Closing ${dist}ft to melee ${target.name}.`,
    };
  }
  
  // Dash toward target
  return {
    movement: { type: 'move_toward', target, distance: me.speed || 30 },
    action: { type: 'dodge' },
    reasoning: `Moving toward ${target.name} (${dist}ft away). Dashing.`,
  };
}


// ═══════════════════════════════════════════════════════════════════════════
// NEW MONSTER PROFILES
// ═══════════════════════════════════════════════════════════════════════════

// Dragon — fly, breath weapon, multiattack
// Priority: breath > multiattack > take flight
PROFILES['dragon'] = [
  evalDragonBreathWeapon,
  evalDragonMultiattack,
  evalDragonFlyUp,
  evalDodge,
];

// Giant / Bruiser — close + smash, throw rocks at flyers
// Priority: throw rocks at flying/distant > close to melee > approach > dodge
PROFILES['giant_bruiser'] = [
  evalGiantRockThrow,
  evalGiantMelee,
  evalApproachAndMelee,
  evalDodge,
];

// Mage — Fireball opener, Counterspell (reaction), Fire Bolt sustain
// Priority: escape melee (Misty Step BA) > Fireball > Fire Bolt > dodge
PROFILES['mage_caster'] = [
  evalMageMistyStep,
  evalMageFireball,
  evalMageFireBolt,
  evalDodge,
];

// Archmage — Cone of Cold opener, Fireball, Fire Bolt
// Priority: Cone of Cold early > Fireball > Fire Bolt > dodge
PROFILES['archmage_caster'] = [
  evalMageMistyStep,
  evalArchmageConeOfCold,
  evalMageFireball,
  evalMageFireBolt,
  evalDodge,
];

// Lich — Power Word Stun, Finger of Death, Cloudkill, Fireball
// Priority: PW:Stun if target ≤150HP > Finger of Death > Cloudkill > Fireball > cantrip > dodge
PROFILES['lich_caster'] = [
  evalLichPowerWordStun,
  evalLichFingerOfDeath,
  evalLichCloudkill,
  evalMageFireball,
  evalFallbackCantrip,
  evalDodge,
];

// Undead melee — approach and attack, shake awake allies from HP
PROFILES['undead_melee'] = [
  evalShakeAwakeAllies,
  evalMeleeAttack,
  evalApproachAndMelee,
  evalDodge,
];


// ═══════════════════════════════════════════════════════════════════════════
// REACTION PROFILES
// ═══════════════════════════════════════════════════════════════════════════

const REACTION_PROFILES = {};

REACTION_PROFILES['lore_bard'] = [evalCuttingWords, evalCounterspell];
REACTION_PROFILES['cult_fanatic'] = []; // No notable reactions
REACTION_PROFILES['generic_melee'] = [];
REACTION_PROFILES['generic_ranged'] = [];
REACTION_PROFILES['dragon'] = [];           // No spell reactions
REACTION_PROFILES['giant_bruiser'] = [];    // No spell reactions
REACTION_PROFILES['mage_caster'] = [evalCounterspell];
REACTION_PROFILES['archmage_caster'] = [evalCounterspell];
REACTION_PROFILES['lich_caster'] = [evalLegendaryResistance, evalCounterspell];
REACTION_PROFILES['undead_melee'] = [];


// ═══════════════════════════════════════════════════════════════════════════
// DECISION ENGINE
// ═══════════════════════════════════════════════════════════════════════════

/**
 * Run evaluators in priority order. First non-null result wins.
 * If a bonus-action-only evaluator fires (like self-heal), merge it
 * into the next real decision.
 */
function makeDecision(profileName, me, allCombatants, round) {
  const evaluators = PROFILES[profileName];
  if (!evaluators) {
    throw new Error(`Unknown AI profile: ${profileName}`);
  }

  const ctx = assessBattlefield(me, allCombatants, round);
  let pendingBonusAction = null;

  // Check self-heal evaluator first (it only contributes a bonus action)
  const selfHeal = evalConcentrationSelfHeal(ctx);
  if (selfHeal && selfHeal._bonusActionOnly) {
    pendingBonusAction = selfHeal.bonusAction;
  }

  for (const evaluator of evaluators) {
    const result = evaluator(ctx);
    if (result) {
      if (result._bonusActionOnly) {
        pendingBonusAction = result.bonusAction;
        continue;
      }
      // Merge pending bonus action if the decision doesn't already have one
      if (pendingBonusAction && !result.bonusAction) {
        result.bonusAction = pendingBonusAction;
      }
      return result;
    }
  }

  // Should never reach here (evalDodge always returns), but just in case
  return { action: { type: 'dodge' }, reasoning: 'No evaluator matched. Dodging.' };
}

/**
 * Make a reaction decision for a trigger.
 */
function makeReaction(profileName, me, trigger) {
  const evaluators = REACTION_PROFILES[profileName] || [];
  for (const evaluator of evaluators) {
    const result = evaluator(me, trigger);
    if (result) return result;
  }
  return null;
}

/**
 * Create a getDecision callback compatible with encounterRunner.runEncounter().
 * Maps each combatant to its profile via tags or a lookup.
 * 
 * @param {Object} profileMap — maps combatant id or tag to profile name
 *   e.g. { 'bard-1': 'lore_bard', 'fanatic-1': 'cult_fanatic' }
 *   OR a function: (combatant) => profileName
 * @returns {Function} getDecision(combatant, allCombatants, round, log) => decision
 */
function makeTacticalAI(profileMap) {
  const resolve = typeof profileMap === 'function'
    ? profileMap
    : (combatant) => profileMap[combatant.id] || profileMap[combatant.name] || 'generic_melee';

  return function getDecision(combatant, allCombatants, round, _log) {
    const profileName = resolve(combatant);
    return makeDecision(profileName, combatant, allCombatants, round);
  };
}

/**
 * Create a reaction callback for a specific profile.
 */
function makeReactionAI(profileMap) {
  const resolve = typeof profileMap === 'function'
    ? profileMap
    : (combatant) => profileMap[combatant.id] || profileMap[combatant.name] || 'generic_melee';

  return function getReaction(combatant, trigger) {
    const profileName = resolve(combatant);
    return makeReaction(profileName, combatant, trigger);
  };
}


// ═══════════════════════════════════════════════════════════════════════════
// PROFILE MANAGEMENT
// ═══════════════════════════════════════════════════════════════════════════

function registerProfile(name, evaluators) {
  PROFILES[name] = evaluators;
}

function registerReactionProfile(name, evaluators) {
  REACTION_PROFILES[name] = evaluators;
}

function getProfileNames() {
  return Object.keys(PROFILES);
}

function getProfile(name) {
  return PROFILES[name] || null;
}


module.exports = {
  // Core API
  makeTacticalAI,
  makeReactionAI,
  makeDecision,
  makeReaction,
  assessBattlefield,

  // Targeting
  selectHighestThreat,
  selectWeakest,
  selectClosestCharmedAlly,

  // Profile management
  registerProfile,
  registerReactionProfile,
  getProfileNames,
  getProfile,
  PROFILES,
  REACTION_PROFILES,

  // Individual evaluators (for testing and custom profiles)
  evalSurvivalInvisibility,
  evalOpeningAoEDisable,
  evalConcentrationAllDisabled,
  evalConcentrationMeleeViciousMockery,
  evalConcentrationFinishWithCrossbow,
  evalConcentrationBreathWeapon,
  evalConcentrationRangedViciousMockery,
  evalConcentrationSelfHeal,
  evalRecastHypnoticPattern,
  evalCastHoldPerson,
  evalFallbackCantrip,
  evalDodge,
  evalEnemyInvisibleFallback,
  evalFlyingTargetRanged,
  evalOpeningSpiritualWeapon,
  evalShakeAwakeAllies,
  evalMeleeAttack,
  evalInflictWounds,
  evalRangedCantripWithApproach,
  evalCuttingWords,
  evalCounterspell,

  // Monster evaluators
  evalDragonBreathWeapon,
  evalDragonMultiattack,
  evalDragonFlyUp,
  evalGiantRockThrow,
  evalGiantMelee,
  evalMageFireball,
  evalMageFireBolt,
  evalMageMistyStep,
  evalLichPowerWordStun,
  evalLichFingerOfDeath,
  evalLichCloudkill,
  evalLegendaryResistance,
  evalArchmageConeOfCold,
  evalApproachAndMelee,
};
