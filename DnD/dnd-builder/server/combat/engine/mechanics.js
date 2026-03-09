/**
 * Combat Mechanics — core rules engine
 * 
 * Pure functions for: saving throws, attack rolls, damage rolls,
 * concentration saves, condition checks.
 * 
 * All functions depend on the dice engine — no hidden state.
 */

const dice = require('./dice');

// ═══════════════════════════════════════════════════════════════════════════
// ABILITY CHECKS & SAVING THROWS
// ═══════════════════════════════════════════════════════════════════════════

/**
 * @param {number} mod — ability modifier
 * @param {number} dc — difficulty class
 * @returns {{ roll: number, total: number, dc: number, success: boolean }}
 */
function makeAbilityCheck(mod, dc) {
  const roll = dice.d20();
  const total = roll + mod;
  return { roll, mod, total, dc, success: total >= dc };
}

/**
 * @param {number} saveBonus — total save bonus (mod + prof + magic items)
 * @param {number} dc
 * @param {boolean} hasAdvantage
 * @param {boolean} hasDisadvantage
 * @returns {{ result: number, saveBonus: number, total: number, dc: number, success: boolean, type: string }}
 */
function makeSavingThrow(saveBonus, dc, hasAdvantage = false, hasDisadvantage = false) {
  let result;
  let type = 'normal';
  
  if (hasAdvantage && !hasDisadvantage) {
    const adv = dice.rollWithAdvantage();
    result = adv.result;
    type = 'advantage';
  } else if (hasDisadvantage && !hasAdvantage) {
    const dis = dice.rollWithDisadvantage();
    result = dis.result;
    type = 'disadvantage';
  } else {
    result = dice.d20();
  }
  
  const total = result + saveBonus;
  return { result, saveBonus, total, dc, success: total >= dc, type };
}

// ═══════════════════════════════════════════════════════════════════════════
// ATTACK ROLLS
// ═══════════════════════════════════════════════════════════════════════════

/**
 * @param {number} attackBonus
 * @param {number} targetAC
 * @param {boolean} advantage
 * @param {boolean} disadvantage
 * @returns {{ natural: number, total: number, hits: boolean, isCrit: boolean, isMiss: boolean, type: string }}
 */
function makeAttackRoll(attackBonus, targetAC, advantage = false, disadvantage = false) {
  let natural;
  let type = 'normal';
  
  if (advantage && !disadvantage) {
    const adv = dice.rollWithAdvantage();
    natural = adv.result;
    type = 'advantage';
  } else if (disadvantage && !advantage) {
    const dis = dice.rollWithDisadvantage();
    natural = dis.result;
    type = 'disadvantage';
  } else {
    natural = dice.d20();
  }
  
  const total = natural + attackBonus;
  const isCrit = natural === 20;
  const isMiss = natural === 1;
  const hits = isCrit ? true : isMiss ? false : total >= targetAC;
  
  return { natural, attackBonus, total, targetAC, hits, isCrit, isMiss, type };
}

// ═══════════════════════════════════════════════════════════════════════════
// DAMAGE ROLLS
// ═══════════════════════════════════════════════════════════════════════════

/**
 * Roll damage from a dice string. Crits double dice count, not bonus.
 * @param {string} diceStr — e.g. "1d8", "2d6", "3d10"
 * @param {number} bonus — flat damage bonus
 * @param {boolean} crit — double dice count
 * @returns {{ rolls: number[], bonus: number, total: number, crit: boolean }}
 */
function rollDamage(diceStr, bonus, crit = false) {
  const match = diceStr.match(/^(\d+)d(\d+)$/);
  if (!match) throw new Error(`Invalid dice string: ${diceStr}`);
  const numDice = parseInt(match[1]) * (crit ? 2 : 1);
  const sides = parseInt(match[2]);
  const dieFn = dice.dieFns[sides];
  if (!dieFn) throw new Error(`Unsupported die size: d${sides}`);
  
  const rolls = dice.rollDice(numDice, dieFn);
  const total = rolls.reduce((a, b) => a + b, 0) + bonus;
  return { rolls, bonus, total, crit };
}

// ═══════════════════════════════════════════════════════════════════════════
// CONCENTRATION
// ═══════════════════════════════════════════════════════════════════════════

/**
 * Make a concentration save.
 * DC = max(10, floor(damage/2)). War Caster grants advantage.
 * @param {object} creature — must have saves.con, hasWarCaster
 * @param {number} damage
 * @returns {{ dc: number, result: number, saveBonus: number, total: number, success: boolean, type: string }}
 */
function concentrationSave(creature, damage) {
  const dc = Math.max(10, Math.floor(damage / 2));
  const hasAdv = !!creature.hasWarCaster;
  const save = makeSavingThrow(creature.saves.con, dc, hasAdv);
  return { dc, ...save };
}

// ═══════════════════════════════════════════════════════════════════════════
// CONDITIONS
// ═══════════════════════════════════════════════════════════════════════════

const INCAPACITATING_CONDITIONS = ['paralyzed', 'stunned', 'unconscious', 'charmed_hp', 'incapacitated'];

function isIncapacitated(creature) {
  return creature.conditions.some(c => INCAPACITATING_CONDITIONS.includes(c));
}

function isAlive(creature) {
  return creature.currentHP > 0;
}

function hasCondition(creature, condition) {
  return creature.conditions.includes(condition);
}

function addCondition(creature, condition) {
  if (!creature.conditions.includes(condition)) {
    creature.conditions.push(condition);
  }
}

function removeCondition(creature, condition) {
  const idx = creature.conditions.indexOf(condition);
  if (idx >= 0) creature.conditions.splice(idx, 1);
  return idx >= 0;
}

/**
 * Remove all instances of a condition from a creature.
 * Safer than the old splice-by-index approach which had the index shift bug.
 */
function removeAllConditions(creature, ...conditionNames) {
  creature.conditions = creature.conditions.filter(c => !conditionNames.includes(c));
}

function getActiveEnemies(enemies) {
  return enemies.filter(e => isAlive(e) && !isIncapacitated(e));
}

function getAllAliveEnemies(enemies) {
  return enemies.filter(e => isAlive(e));
}

// ═══════════════════════════════════════════════════════════════════════════
// CONCENTRATION BREAK — spell-specific cleanup
// ═══════════════════════════════════════════════════════════════════════════

/**
 * Break concentration on a spell and clean up its effects.
 * Uses removeAllConditions to avoid the old splice index-shift bug.
 */
function breakConcentration(caster, allCombatants) {
  const spell = caster.concentrating;
  caster.concentrating = null;
  caster.concentrationRoundsRemaining = 0;
  
  if (spell === 'Hypnotic Pattern') {
    allCombatants.forEach(c => {
      removeAllConditions(c, 'charmed_hp', 'incapacitated');
    });
  } else if (spell === 'Hold Person') {
    allCombatants.forEach(c => {
      removeCondition(c, 'paralyzed');
    });
  } else if (spell === 'Greater Invisibility') {
    removeCondition(caster, 'invisible');
  } else if (spell === 'Shield of Faith') {
    caster.ac -= 2;
  }
}

// ═══════════════════════════════════════════════════════════════════════════
// DISTANCE
// ═══════════════════════════════════════════════════════════════════════════

/**
 * Distance between two combatants, accounting for flight altitude.
 * Flying creatures are 30ft above ground by default. This means:
 *   - Melee (5ft reach) can NOT reach flyers (needs ≤5ft, gets 30+)
 *   - Reach weapons (10ft) can NOT reach flyers
 *   - Ranged/thrown weapons CAN reach flyers (javelin 30ft, rock 60ft, bow 80ft+)
 *   - Spells CAN reach flyers (most have 60ft+ range)
 * The distance now uses actual 3D distance (Pythagorean with horizontal + vertical).
 */
function distanceBetween(a, b) {
  const dx = (a.position?.x || 0) - (b.position?.x || 0);
  const dy = (a.position?.y || 0) - (b.position?.y || 0);
  const horizontalDist = Math.max(Math.abs(dx), Math.abs(dy)) * 5;

  // Both flying or both grounded — horizontal distance only
  if ((a.flying && b.flying) || (!a.flying && !b.flying)) {
    return horizontalDist;
  }

  // One flying, one grounded — add vertical component (30ft altitude)
  const altitude = 30;
  // D&D uses largest dimension for diagonal movement on grid,
  // so 3D distance = max(horizontal, vertical) + min(horizontal, vertical)/2 (approximation)
  // But for simplicity and accuracy: use Euclidean then round to nearest 5ft
  const rawDist = Math.sqrt(horizontalDist * horizontalDist + altitude * altitude);
  return Math.round(rawDist / 5) * 5;
}

module.exports = {
  makeAbilityCheck, makeSavingThrow,
  makeAttackRoll, rollDamage,
  concentrationSave,
  INCAPACITATING_CONDITIONS,
  isIncapacitated, isAlive, hasCondition,
  addCondition, removeCondition, removeAllConditions,
  getActiveEnemies, getAllAliveEnemies,
  breakConcentration,
  distanceBetween,
};
