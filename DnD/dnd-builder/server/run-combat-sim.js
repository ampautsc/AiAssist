#!/usr/bin/env node
/**
 * Full Turn-by-Turn D&D 5e Combat Simulator
 * 
 * Gem Dragonborn Lore Bard (Iron Concentration) vs 4 Cult Fanatics
 * 
 * This is NOT the old pre-programmed "cast HP then dodge" system.
 * Every single turn: assess battlefield → decide action → resolve → log.
 * 
 * Tracks: HP, AC, conditions, concentration, spell slots, reactions,
 *         opportunity attacks, bonus actions, movement, free interactions.
 */

const fs = require('fs');
const path = require('path');

// ═══════════════════════════════════════════════════════════════════════════
// SHARED MODULE IMPORTS — migrated from local implementations
// ═══════════════════════════════════════════════════════════════════════════

const {
  setDiceMode, d20, d12, d10, d8, d6, d4,
  rollDice, rollWithAdvantage, rollWithDisadvantage,
} = require('./combat/engine/dice');

const {
  makeAbilityCheck, makeSavingThrow, makeAttackRoll, rollDamage,
  concentrationSave, isIncapacitated, isAlive,
  getActiveEnemies, getAllAliveEnemies,
  breakConcentration, distanceBetween,
} = require('./combat/engine/mechanics');

// ═══════════════════════════════════════════════════════════════════════════
// CHARACTER: GEM DRAGONBORN LORE BARD 8 — IRON CONCENTRATION
// ═══════════════════════════════════════════════════════════════════════════
// Build: Resilient(CON) +1 CON at L4, War Caster at L8
// Items: Cloak of Protection (+1 AC, +1 saves), Stone of Good Luck (+1 checks/saves)
// Species: Gem Dragonborn — telepathy 30ft, breath weapon 15ft cone,
//          Gem Flight (BA, PB/LR = 3 uses, 1 min, no concentration)
// Base stats: STR 8, DEX 14, CON 14+1(Resilient)=15, INT 8, WIS 12, CHA 16+2(species)=18
// Final: STR 8(-1), DEX 14(+2), CON 16(+3), INT 8(-1), WIS 12(+1), CHA 18(+4)
// Prof bonus: +3 (level 8)

function createBard() {
  return {
    id: 'bard',
    name: 'Gem Dragonborn Lore Bard (Iron Concentration)',
    side: 'party',
    class: 'Lore Bard',
    level: 8,
    race: 'Gem Dragonborn',
    
    // Ability scores
    str: 8, dex: 14, con: 16, int: 8, wis: 12, cha: 18,
    strMod: -1, dexMod: 2, conMod: 3, intMod: -1, wisMod: 1, chaMod: 4,
    profBonus: 3,
    
    // Combat stats
    maxHP: 8 + 3 + 7 * (5 + 3), // L1: 8+CON, L2-8: avg 5+CON each = 67
    currentHP: 67,
    tempHP: 0,
    ac: 11 + 2 + 1, // Leather(11) + DEX(+2) + Cloak(+1) = 14
    speed: 30,
    
    // Saves (proficient in DEX, CHA base; Resilient gives CON prof)
    saves: {
      str: -1,
      dex: 2 + 3,         // DEX + prof = +5
      con: 3 + 3 + 1 + 1, // CON + prof(Resilient) + Cloak + Luckstone = +8
      int: -1,
      wis: 1,
      cha: 4 + 3 + 1 + 1, // CHA + prof + Cloak + Luckstone = +9
    },
    
    // Concentration: War Caster (advantage) + CON save +8
    hasWarCaster: true,        // Advantage on concentration saves
    hasResilientCon: true,     // Proficiency in CON saves
    concentrating: null,       // What spell we're concentrating on
    
    // Spell slots (Level 8 Bard)
    spellSlots: { 1: 4, 2: 3, 3: 3, 4: 2 },
    maxSlots:   { 1: 4, 2: 3, 3: 3, 4: 2 },
    
    // Spells prepared/known (Lore Bard 8 knows 11 spells + 2 cantrips relevant)
    spellsKnown: [
      'Hypnotic Pattern', 'Hold Person', 'Counterspell', // Magical Secrets (Counterspell)
      'Healing Word', 'Faerie Fire', 'Dissonant Whispers',
      'Shatter', 'Invisibility', 'Silence',
      'Greater Invisibility', 'Dimension Door',
    ],
    cantrips: ['Vicious Mockery', 'Minor Illusion'],
    
    // Resources
    bardicInspirationDie: 'd8',
    bardicInspirationUses: 4, // CHA mod
    bardicInspirationMax: 4,
    cuttingWordsAvailable: true, // Uses Bardic Inspiration die
    
    // Species abilities
    breathWeapon: {
      uses: 3,        // PB/LR
      maxUses: 3,
      damage: '2d8',  // Level 5-10
      damageType: 'force', // Gem = varies by gem type; we'll say Sapphire = thunder or Amethyst = force
      save: 'DEX',
      dc: 8 + 3 + 3,  // 8 + prof + CON mod = 14
      shape: '15ft cone',
    },
    gemFlight: {
      uses: 3,         // PB/LR
      maxUses: 3,
      duration: 10,    // 1 minute = 10 rounds
      active: false,
      roundsRemaining: 0,
    },
    telepathy: 30, // 30ft telepathy, innate, always on
    
    // State tracking
    conditions: [],
    position: { x: 0, y: 0 },  // Grid position (5ft squares)
    flying: false,
    reactedThisRound: false,
    usedBonusAction: false,
    usedAction: false,
    usedFreeInteraction: false,
    movementRemaining: 30,
    concentrationRoundsRemaining: 0, // Track duration of concentration spells
    
    // Weapon
    weapon: { name: 'Light Crossbow', attackBonus: 2 + 3, damageDice: '1d8', damageBonus: 2, range: 80, longRange: 320 },
    
    // Equipment drawn
    handsFree: 1, // Holding crossbow in one hand, other free for somatic
    shieldEquipped: false,
    
    // Analytics
    totalDamageDealt: 0,
    totalDamageTaken: 0,
    totalHealing: 0,
    attacksMade: 0,
    attacksHit: 0,
    spellsCast: 0,
    concentrationSavesMade: 0,
    concentrationSavesFailed: 0,
    conditionsInflicted: 0,
    reactionsUsed: 0,
  };
}

// ═══════════════════════════════════════════════════════════════════════════
// ENEMIES: CULT FANATICS (CR 2 each)
// ═══════════════════════════════════════════════════════════════════════════
// MM stat block:
// HP 33 (6d8+6), AC 13 (leather armor), Speed 30ft
// STR 11(+0) DEX 14(+2) CON 12(+1) INT 10(+0) WIS 13(+1) CHA 14(+2)
// Skills: Deception +4, Persuasion +4, Religion +2
// Condition immunities: none
// Senses: passive Perception 11
// Challenge: 2 (450 XP)
// Dark Devotion: Advantage on saves vs being charmed or frightened
// Multiattack: Two melee attacks
// Dagger: +4 to hit, 1d4+2 piercing
// Spellcasting: 4th-level caster, spell save DC 11, spell attack +3
//   Cantrips: light, sacred flame, thaumaturgy
//   1st level (4 slots): command, inflict wounds, shield of faith
//   2nd level (3 slots): hold person, spiritual weapon

function createCultFanatic(index) {
  return {
    id: `cult_fanatic_${index}`,
    name: `Cult Fanatic ${index}`,
    side: 'enemy',
    type: 'humanoid',
    cr: 2,
    
    str: 11, dex: 14, con: 12, int: 10, wis: 13, cha: 14,
    strMod: 0, dexMod: 2, conMod: 1, intMod: 0, wisMod: 1, chaMod: 2,
    profBonus: 2,
    
    maxHP: 33,
    currentHP: 33,
    tempHP: 0,
    ac: 13, // leather armor
    speed: 30,
    
    saves: { str: 0, dex: 2, con: 1, int: 0, wis: 1, cha: 2 },
    
    // Dark Devotion: advantage on saves vs charmed/frightened
    darkDevotion: true,
    
    // Multiattack: 2 dagger attacks
    multiattack: 2,
    attacks: [
      { name: 'Dagger', bonus: 4, damageDice: '1d4', damageBonus: 2, damageType: 'piercing', range: 5 },
    ],
    
    // Spellcasting (4th-level caster, WIS-based)
    spellSlots: { 1: 4, 2: 3 },
    maxSlots:   { 1: 4, 2: 3 },
    spellSaveDC: 11,
    spellAttackBonus: 3,
    cantrips: ['Sacred Flame', 'Light', 'Thaumaturgy'],
    spellsKnown: ['Command', 'Inflict Wounds', 'Shield of Faith', 'Hold Person', 'Spiritual Weapon'],
    concentrating: null,
    
    // State
    conditions: [],
    position: { x: 0, y: 0 },
    reactedThisRound: false,
    usedBonusAction: false,
    usedAction: false,
    movementRemaining: 30,
    concentrationRoundsRemaining: 0,
    
    // Spiritual weapon tracking
    spiritualWeapon: null, // { active: true, roundsRemaining: N }
    
    // Analytics
    totalDamageDealt: 0,
    totalDamageTaken: 0,
    attacksMade: 0,
    attacksHit: 0,
    spellsCast: 0,
  };
}


// ═══════════════════════════════════════════════════════════════════════════
// COMBAT LOG
// ═══════════════════════════════════════════════════════════════════════════

const combatLog = [];
const jsonLog = {
  encounter: { name: 'Gem Dragonborn Iron Concentration vs 4 Cult Fanatics', terrain: 'Temple interior, stone pillars (half cover available)', lighting: 'Dim light (torches)', difficulty: 'Hard' },
  combatants: [],
  initiativeOrder: [],
  rounds: [],
  outcome: null,
  analytics: { perCombatant: [] },
};

function log(msg) {
  combatLog.push(msg);
  console.log(msg);
}

// ═══════════════════════════════════════════════════════════════════════════
// BARD TACTICAL AI
// ═══════════════════════════════════════════════════════════════════════════
// The bard evaluates the battlefield EVERY turn and decides what to do.
// NO pre-programmed sequences. Pure tactical assessment.

function bardTacticalDecision(bard, enemies, round, turnLog) {
  const active = getActiveEnemies(enemies);
  const alive = getAllAliveEnemies(enemies);
  const hpPct = bard.currentHP / bard.maxHP;
  
  const decision = {
    movement: null,
    freeInteraction: null,
    action: null,
    bonusAction: null,
    reasoning: '',
  };

  // ── ASSESS BATTLEFIELD ──
  const hasConcentration = !!bard.concentrating;
  const enemiesInMelee = active.filter(e => distanceBetween(bard, e) <= 5);
  const enemyCasters = active.filter(e => e.spellsKnown && e.spellsKnown.length > 0);
  const enemiesCharmed = enemies.filter(e => e.conditions.includes('charmed_hp'));
  const needsToFly = !bard.flying && enemiesInMelee.length > 0;
  const canFly = bard.gemFlight.uses > 0 && !bard.flying;

  // ── PRIORITY 1: SURVIVAL (HP critical) ──
  if (hpPct < 0.25 && bard.spellSlots[4] > 0 && !bard.conditions.includes('invisible')) {
    decision.reasoning = `HP CRITICAL (${bard.currentHP}/${bard.maxHP}). Going invisible for survival.`;
    decision.action = { type: 'cast_spell', spell: 'Greater Invisibility', level: 4, target: 'self' };
    if (canFly && !bard.usedBonusAction) {
      decision.bonusAction = { type: 'gem_flight' };
    }
    return decision;
  }

  // ── PRIORITY 2: ALLY DOWN (if we had allies — solo for now) ──
  // Skipped in solo encounter
  
  // ── PRIORITY 3: OPENING MOVE (Round 1) ──
  if (round === 1 && !hasConcentration) {
    // Gem Dragonborn Turn 1: Activate Gem Flight (BA) + Hypnotic Pattern (Action)
    // This is the signature Iron Concentration move: get airborne where melee can't reach,
    // cast the AoE disable, then maintain it with near-unbreakable concentration
    
    if (active.length >= 3 && bard.spellSlots[3] > 0) {
      decision.reasoning = `ROUND 1: ${active.length} enemies. Opening with Gem Flight (BA) + Hypnotic Pattern (Action). Get airborne to avoid melee, disable the group.`;
      decision.bonusAction = canFly ? { type: 'gem_flight' } : null;
      decision.action = { type: 'cast_spell', spell: 'Hypnotic Pattern', level: 3, targets: active };
      decision.movement = { type: 'fly_up', distance: 20, reason: 'Elevation to avoid melee' };
      return decision;
    }
    
    if (active.length >= 1 && bard.spellSlots[3] > 0) {
      decision.reasoning = `ROUND 1: Only ${active.length} enemies. Hypnotic Pattern still best AoE option.`;
      decision.bonusAction = canFly ? { type: 'gem_flight' } : null;
      decision.action = { type: 'cast_spell', spell: 'Hypnotic Pattern', level: 3, targets: active };
      decision.movement = canFly ? { type: 'fly_up', distance: 20, reason: 'Get airborne' } : null;
      return decision;
    }
  }

  // ── PRIORITY 4: CONCENTRATION IS ACTIVE — CONTRIBUTE, DON'T JUST STAND THERE ──
  if (hasConcentration) {
    // Concentration is up. What's the best use of our action?
    const numCharmed = enemiesCharmed.length;
    const numActive = active.length;
    
    // Sub-priority: Self-heal with Healing Word (bonus action) if HP is low and we have slots
    if (hpPct < 0.5 && bard.spellSlots[1] > 0 && !bard.usedBonusAction) {
      decision.bonusAction = { type: 'cast_healing_word', level: 1, target: 'self' };
    }
    
    // Sub-priority: If enemies are breaking free (being shaken awake), need to deal damage
    // or disable the remaining active ones
    
    if (numActive === 0) {
      // All enemies disabled! Use action for utility
      decision.reasoning = `All ${alive.length} enemies disabled by ${bard.concentrating}. Maintaining concentration. Using turn to prepare/reposition.`;
      decision.action = { type: 'dodge' };
      decision.movement = bard.flying ? null : (canFly ? { type: 'fly_up', distance: 15, reason: 'Elevate for safety' } : null);
      if (canFly && !bard.flying && !bard.usedBonusAction) {
        decision.bonusAction = { type: 'gem_flight' };
      }
      return decision;
    }
    
    // Active enemies remain while we're concentrating
    // Options: Vicious Mockery (disadvantage on their next attack = protects concentration),
    //          Crossbow (more damage), Bardic Inspiration (if allies), Breath Weapon
    
    // If an enemy is in melee range, Vicious Mockery is GOLD — disadvantage protects us
    if (enemiesInMelee.length > 0) {
      const target = selectHighestThreatEnemy(enemiesInMelee);
      decision.reasoning = `Concentrating on ${bard.concentrating}. ${numActive} enemies still active. Enemy in melee! Vicious Mockery to impose disadvantage on their next attack (protects concentration).`;
      decision.action = { type: 'cast_cantrip', spell: 'Vicious Mockery', target };
      // Try to move away if possible
      if (bard.movementRemaining >= 5 && !bard.flying) {
        decision.movement = { type: 'move_away', from: target, distance: Math.min(bard.movementRemaining, 15), reason: 'Disengage from melee' };
      }
      return decision;
    }
    
    // No enemies in melee, we're at range — crossbow or Vicious Mockery?
    // Crossbow: +5 to hit, 1d8+2 (avg 6.5)
    // Vicious Mockery: DC 15 WIS save, 2d4 (avg 5) + disadvantage on next attack
    // Against cult fanatics (WIS save +1 vs DC 15): 65% chance to fail save
    // Vicious Mockery is better because the disadvantage protects concentration
    
    const target = selectHighestThreatEnemy(active);
    
    // But if there's only 1 enemy left and we want to finish them fast — crossbow might be better
    if (numActive === 1 && target.currentHP <= 10) {
      decision.reasoning = `Concentrating on ${bard.concentrating}. One enemy left at ${target.currentHP}HP. Crossbow to finish quickly (1d8+2 avg 6.5 > VM 2d4 avg 5).`;
      decision.action = { type: 'attack', weapon: 'crossbow', target };
      return decision;
    }
    
    // Use Breath Weapon if 2+ active enemies are clustered and we haven't used it
    if (numActive >= 2 && bard.breathWeapon.uses > 0) {
      const clustered = active.filter(e => distanceBetween(bard, e) <= 15);
      if (clustered.length >= 2) {
        decision.reasoning = `Concentrating on ${bard.concentrating}. ${numActive} active enemies, ${clustered.length} in breath range. Breath Weapon (2d8 force, DEX DC 14) — free damage, no spell slot!`;
        decision.action = { type: 'breath_weapon', targets: clustered };
        return decision;
      }
    }
    
    decision.reasoning = `Concentrating on ${bard.concentrating}. ${numActive} active enemies at range. Vicious Mockery on ${target.name} (disadvantage protects concentration).`;
    decision.action = { type: 'cast_cantrip', spell: 'Vicious Mockery', target };
    return decision;
  }

  // ── PRIORITY 5: NO CONCENTRATION — NEED TO ESTABLISH CONTROL ──
  // Concentration broke or we haven't cast yet
  
  if (active.length >= 2 && bard.spellSlots[3] > 0) {
    decision.reasoning = `No concentration active. ${active.length} active enemies. Recasting Hypnotic Pattern to regain control.`;
    decision.action = { type: 'cast_spell', spell: 'Hypnotic Pattern', level: 3, targets: active };
    return decision;
  }
  
  if (active.length >= 1 && bard.spellSlots[2] > 0) {
    const target = selectHighestThreatEnemy(active);
    decision.reasoning = `No concentration. ${active.length} active enemies. Hold Person on ${target.name} (paralyzed = auto-crit in melee).`;
    decision.action = { type: 'cast_spell', spell: 'Hold Person', level: 2, target };
    return decision;
  }
  
  // Low on slots — cantrip time
  if (active.length > 0) {
    const target = selectHighestThreatEnemy(active);
    decision.reasoning = `Low on spell slots. Vicious Mockery on ${target.name}.`;
    decision.action = { type: 'cast_cantrip', spell: 'Vicious Mockery', target };
    return decision;
  }

  // Fallback
  decision.reasoning = 'No valid targets or actions. Dodging.';
  decision.action = { type: 'dodge' };
  return decision;
}

// ═══════════════════════════════════════════════════════════════════════════
// BARD REACTION AI
// ═══════════════════════════════════════════════════════════════════════════

function bardReactionDecision(bard, trigger) {
  if (bard.reactedThisRound) return null;
  
  // Cutting Words: When an enemy makes an attack roll, ability check, or damage roll
  // Uses Bardic Inspiration die (d8). Subtract from the enemy's roll.
  if (trigger.type === 'enemy_attack_roll' && bard.bardicInspirationUses > 0) {
    const { roll, targetAC, attacker } = trigger;
    if (roll >= targetAC) {
      // It would hit. Can Cutting Words make it miss?
      const avgReduction = 4.5; // d8 average
      if (roll - 8 < targetAC) { // Maximum d8 roll could make it miss
        return { 
          type: 'cutting_words',
          die: d8(),
          reason: `Cutting Words to reduce ${attacker.name}'s attack roll (protecting ${bard.concentrating ? 'concentration' : 'HP'})`,
        };
      }
    }
  }
  
  // Counterspell: When an enemy casts a spell within 60ft
  if (trigger.type === 'enemy_casting_spell' && bard.spellSlots[3] > 0) {
    const { spell, caster } = trigger;
    // Counter dangerous spells: Hold Person (would paralyze us!), Inflict Wounds (big damage)
    if (spell === 'Hold Person' || spell === 'Inflict Wounds') {
      return {
        type: 'counterspell',
        slotLevel: 3,
        reason: `Counterspelling ${caster.name}'s ${spell} — too dangerous to let through`,
      };
    }
  }
  
  return null;
}


// ═══════════════════════════════════════════════════════════════════════════
// ENEMY TACTICAL AI (Cult Fanatic — Average Intelligence INT 10)
// ═══════════════════════════════════════════════════════════════════════════
// Average intelligence: proper tactics — focus caster, use spells wisely,
// coordinate with allies, use Hold Person on dangerous targets.

function cultFanaticTacticalDecision(fanatic, bard, allFanatics, round) {
  const decision = { movement: null, action: null, bonusAction: null, reasoning: '' };
  
  if (isIncapacitated(fanatic)) return null;
  
  const isInMelee = distanceBetween(fanatic, bard) <= 5;
  const bardIsFlying = bard.flying;
  const bardIsInvisible = bard.conditions.includes('invisible');
  const myHpPct = fanatic.currentHP / fanatic.maxHP;
  
  // Can I see the bard?
  if (bardIsInvisible) {
    // Can't see the bard. Sacred Flame requires sight — fails. Melee requires seeing target for attacks.
    // Smart tactics: Use Spiritual Weapon (doesn't require sight), cast Shield of Faith on self,
    // try to shake allies awake, or move to block exits.
    
    // Spiritual Weapon BA still works — it's already summoned and doesn't require sight to command
    if (fanatic.spiritualWeapon && fanatic.spiritualWeapon.active) {
      // Spiritual Weapon attacks don't require sight! Just needs to be within 20ft.
      decision.bonusAction = { type: 'spiritual_weapon_attack', target: bard };
    }
    
    // Use Shield of Faith on self if not concentrating (buff AC while waiting)
    if (fanatic.spellSlots[1] > 0 && !fanatic.concentrating) {
      decision.reasoning = `Can't see bard (invisible). Casting Shield of Faith on self (+2 AC) while waiting.`;
      decision.action = { type: 'cast_spell', spell: 'Shield of Faith', level: 1, target: fanatic };
      return decision;
    }
    
    // Shake allies awake from Hypnotic Pattern if any are still charmed
    const charmedAllies = allFanatics.filter(f => f.conditions.includes('charmed_hp') && f.id !== fanatic.id);
    if (charmedAllies.length > 0) {
      const ally = charmedAllies[0];
      if (distanceBetween(fanatic, ally) <= 5) {
        decision.reasoning = `Can't see bard. Shaking ${ally.name} awake from charm.`;
        decision.action = { type: 'shake_awake', target: ally };
        return decision;
      } else {
        decision.reasoning = `Can't see bard. Moving to shake ${ally.name} awake.`;
        decision.movement = { type: 'move_toward', target: ally, distance: Math.min(30, distanceBetween(fanatic, ally) - 5) };
        decision.action = distanceBetween(fanatic, ally) <= 35 ? { type: 'shake_awake', target: ally } : { type: 'dodge' };
        return decision;
      }
    }
    
    // Nothing useful to do — Dodge and wait
    decision.reasoning = `Can't see the bard (invisible). No useful actions available. Dodging.`;
    decision.action = { type: 'dodge' };
    return decision;
  }

  // Can I reach the bard?
  if (bardIsFlying && !isInMelee) {
    // Can't reach flying bard with melee. Options:
    // 1. Sacred Flame cantrip (60ft, DEX save, no attack roll — works against flying!)
    // 2. Cast Hold Person (60ft) to paralyze and drop them
    // 3. Dash toward position below bard
    
    // Priority: Hold Person if we have slots (paralyze = they fall + auto-crit)
    // But DON'T cast if another fanatic is already concentrating on Hold Person on the bard
    const allyAlreadyHolding = allFanatics.some(f => f.id !== fanatic.id && f.concentrating === 'Hold Person' && isAlive(f));
    if (round <= 3 && fanatic.spellSlots[2] > 0 && !fanatic.concentrating && !allyAlreadyHolding && !bard.conditions.includes('paralyzed')) {
      decision.reasoning = `Bard is flying (${distanceBetween(fanatic, bard)}ft up). Casting Hold Person to paralyze → they fall! DC 11 WIS save.`;
      decision.action = { type: 'cast_spell', spell: 'Hold Person', level: 2, target: bard };
      // Spiritual Weapon as bonus action if available
      if (fanatic.spellSlots[2] > 1 && !fanatic.spiritualWeapon && !fanatic.usedBonusAction) {
        decision.bonusAction = { type: 'cast_spell', spell: 'Spiritual Weapon', level: 2, target: bard };
      } else if (fanatic.spiritualWeapon) {
        decision.bonusAction = { type: 'spiritual_weapon_attack', target: bard };
      }
      return decision;
    }
    
    // Sacred Flame (cantrip, no attack roll, DEX save DC 11)
    decision.reasoning = `Bard is flying. Using Sacred Flame cantrip (DEX save DC 11, ignores cover).`;
    decision.action = { type: 'cast_cantrip', spell: 'Sacred Flame', target: bard };
    if (fanatic.spiritualWeapon) {
      decision.bonusAction = { type: 'spiritual_weapon_attack', target: bard };
    }
    return decision;
  }
  
  // ROUND 1: Opening tactics
  if (round === 1) {
    // Spiritual Weapon (BA, 2nd level) + melee attacks or Hold Person
    if (fanatic.spellSlots[2] > 0 && !fanatic.spiritualWeapon) {
      decision.bonusAction = { type: 'cast_spell', spell: 'Spiritual Weapon', level: 2, target: bard };
    }
    
    // If in melee: multiattack with daggers
    if (isInMelee) {
      decision.reasoning = `Round 1: In melee range. Spiritual Weapon (BA) + Dagger multiattack (Action).`;
      decision.action = { type: 'multiattack', target: bard };
      return decision;
    }
    
    // Not in melee: move into range then attack or cast
    if (distanceBetween(fanatic, bard) <= 30 + 5) { // Can reach in one move
      decision.movement = { type: 'move_toward', target: bard, distance: Math.min(30, distanceBetween(fanatic, bard) - 5) };
      decision.reasoning = `Round 1: Moving to melee range. Dagger multiattack.`;
      decision.action = { type: 'multiattack', target: bard };
      return decision;
    }
    
    // Too far — Dash or cast at range
    decision.reasoning = `Round 1: Too far for melee. Sacred Flame at range.`;
    decision.action = { type: 'cast_cantrip', spell: 'Sacred Flame', target: bard };
    decision.movement = { type: 'move_toward', target: bard, distance: 30 };
    return decision;
  }
  
  // SUBSEQUENT ROUNDS: Evaluate priorities
  
  // If bard is concentrating on Hypnotic Pattern — breaking concentration is CRITICAL
  if (bard.concentrating === 'Hypnotic Pattern') {
    const alliesCharmed = allFanatics.filter(f => f.conditions.includes('charmed_hp'));
    
    if (alliesCharmed.length > 0) {
      // FIRST: Use action to shake awake an ally (action to touch a charmed creature)
      const charmedAlly = alliesCharmed[0];
      if (distanceBetween(fanatic, charmedAlly) <= 5) {
        decision.reasoning = `Allies charmed by Hypnotic Pattern! Shaking ${charmedAlly.name} awake (action). Then bonus attacking with Spiritual Weapon if available.`;
        decision.action = { type: 'shake_awake', target: charmedAlly };
        if (fanatic.spiritualWeapon) {
          decision.bonusAction = { type: 'spiritual_weapon_attack', target: bard };
        }
        decision.movement = null; // Already adjacent
        return decision;
      } else {
        // Move to charmed ally and shake awake
        decision.reasoning = `Moving to shake ${charmedAlly.name} awake from Hypnotic Pattern.`;
        decision.movement = { type: 'move_toward', target: charmedAlly, distance: Math.min(30, distanceBetween(fanatic, charmedAlly) - 5) };
        if (distanceBetween(fanatic, charmedAlly) - 5 <= 30) {
          decision.action = { type: 'shake_awake', target: charmedAlly };
        } else {
          decision.action = { type: 'dash' }; // Can't reach this turn
        }
        if (fanatic.spiritualWeapon) {
          decision.bonusAction = { type: 'spiritual_weapon_attack', target: bard };
        }
        return decision;
      }
    }
  }
  
  // Standard combat: Get to bard and attack
  if (isInMelee && !bardIsFlying) {
    decision.reasoning = `In melee with bard. Dagger multiattack.`;
    decision.action = { type: 'multiattack', target: bard };
    if (fanatic.spiritualWeapon) {
      decision.bonusAction = { type: 'spiritual_weapon_attack', target: bard };
    }
    return decision;
  }
  
  // Cast Inflict Wounds if in melee (big damage: 3d10, avg 16.5)
  if (isInMelee && fanatic.spellSlots[1] > 0 && !bardIsFlying) {
    decision.reasoning = `In melee. Inflict Wounds for heavy damage (3d10).`;
    decision.action = { type: 'cast_spell', spell: 'Inflict Wounds', level: 1, target: bard };
    if (fanatic.spiritualWeapon) {
      decision.bonusAction = { type: 'spiritual_weapon_attack', target: bard };
    }
    return decision;
  }
  
  // Not in melee — Sacred Flame or move closer
  decision.reasoning = `Not in melee. Sacred Flame at range.`;
  decision.action = { type: 'cast_cantrip', spell: 'Sacred Flame', target: bard };
  decision.movement = { type: 'move_toward', target: bard, distance: 30 };
  if (fanatic.spiritualWeapon) {
    decision.bonusAction = { type: 'spiritual_weapon_attack', target: bard };
  }
  return decision;
}


// ═══════════════════════════════════════════════════════════════════════════
// POSITION & TARGETING (distanceBetween imported from mechanics module)
// ═══════════════════════════════════════════════════════════════════════════

function selectHighestThreatEnemy(enemies) {
  return enemies.sort((a, b) => {
    // Prioritize: casters > high HP > melee
    const aScore = (a.spellsKnown ? 10 : 0) + (a.currentHP / a.maxHP) * 5;
    const bScore = (b.spellsKnown ? 10 : 0) + (b.currentHP / b.maxHP) * 5;
    return bScore - aScore;
  })[0];
}


// ═══════════════════════════════════════════════════════════════════════════
// ACTION RESOLUTION
// ═══════════════════════════════════════════════════════════════════════════

function resolveAction(actor, action, allCombatants, turnLog) {
  if (!action) return;
  
  switch (action.type) {
    case 'cast_spell':
      return resolveCastSpell(actor, action, allCombatants, turnLog);
    case 'cast_cantrip':
      return resolveCastCantrip(actor, action, turnLog);
    case 'attack':
      return resolveAttack(actor, action, turnLog);
    case 'multiattack':
      return resolveMultiattack(actor, action, turnLog);
    case 'breath_weapon':
      return resolveBreathWeapon(actor, action, turnLog);
    case 'dodge':
      actor.conditions.push('dodging');
      turnLog.push(`  ACTION: Dodge. Attacks against ${actor.name} have disadvantage until next turn.`);
      return;
    case 'shake_awake':
      return resolveShakeAwake(actor, action, turnLog);
    case 'dash':
      actor.movementRemaining += actor.speed;
      turnLog.push(`  ACTION: Dash. Movement doubled to ${actor.movementRemaining}ft.`);
      return;
    case 'ready':
      turnLog.push(`  ACTION: Ready — "${action.trigger}" → ${action.readiedAction}`);
      return;
    case 'spiritual_weapon_attack':
      return resolveSpiritualWeaponAttack(actor, action, turnLog);
  }
}

function resolveBonusAction(actor, action, allCombatants, turnLog) {
  if (!action) return;
  
  switch (action.type) {
    case 'gem_flight':
      actor.gemFlight.uses--;
      actor.gemFlight.active = true;
      actor.gemFlight.roundsRemaining = 10;
      actor.flying = true;
      turnLog.push(`  BONUS ACTION: Gem Flight activated! Flying for 1 minute (${actor.gemFlight.uses} uses remaining). NO concentration.`);
      return;
    case 'cast_spell':
      if (action.spell === 'Spiritual Weapon') {
        if (actor.spellSlots[2] > 0) {
          actor.spellSlots[2]--;
          actor.spiritualWeapon = { active: true, roundsRemaining: 10 };
          actor.spellsCast++;
          // Immediate attack
          const target = action.target;
          // Advantage if target is paralyzed/stunned/unconscious
          const swTargetParalyzed = target.conditions && target.conditions.includes('paralyzed');
          const swHasAdv = swTargetParalyzed || (target.conditions && (target.conditions.includes('stunned') || target.conditions.includes('unconscious')));
          const atkResult = makeAttackRoll(actor.spellAttackBonus, target.ac, swHasAdv, false);
          if (atkResult.hits) {
            const isCrit = atkResult.isCrit || (swTargetParalyzed && distanceBetween(actor, target) <= 5);
            const dmg = rollDamage('1d8', actor.wisMod, isCrit);
            target.currentHP -= dmg.total;
            target.totalDamageTaken = (target.totalDamageTaken || 0) + dmg.total;
            actor.totalDamageDealt += dmg.total;
            actor.attacksHit++;
            turnLog.push(`  BONUS ACTION: Spiritual Weapon created & attacks ${target.name}! [d20${swHasAdv ? '(ADV-paralyzed)' : ''}:${atkResult.natural}+${actor.spellAttackBonus}=${atkResult.total} vs AC ${target.ac}] ${isCrit ? 'CRIT! ' : ''}HIT for ${dmg.total} force damage (${dmg.rolls.join('+')}+${dmg.bonus}). ${target.name} HP: ${target.currentHP}/${target.maxHP}`);
            
            // Concentration check on target
            if (target.concentrating) {
              const conSave = concentrationSave(target, dmg.total);
              if (conSave.success) {
                turnLog.push(`    → Concentration save: [d20${conSave.type === 'advantage' ? '(ADV: War Caster)' : ''}:${conSave.result}+${conSave.saveBonus}=${conSave.total} vs DC ${conSave.dc}] MAINTAINED!`);
                target.concentrationSavesMade++;
              } else {
                turnLog.push(`    → Concentration save: [d20${conSave.type === 'advantage' ? '(ADV: War Caster)' : ''}:${conSave.result}+${conSave.saveBonus}=${conSave.total} vs DC ${conSave.dc}] BROKEN! ${target.concentrating} ends!`);
                target.concentrationSavesFailed++;
                breakConcentration(target, _allCombatants);
              }
            }
          } else {
            turnLog.push(`  BONUS ACTION: Spiritual Weapon created & attacks ${target.name}! [d20${swHasAdv ? '(ADV-paralyzed)' : ''}:${atkResult.natural}+${actor.spellAttackBonus}=${atkResult.total} vs AC ${target.ac}] MISS.`);
          }
          actor.attacksMade++;
        }
      }
      return;
    case 'spiritual_weapon_attack':
      return resolveSpiritualWeaponAttack(actor, action, turnLog);
  }
}

function resolveSpiritualWeaponAttack(actor, action, turnLog) {
  if (!actor.spiritualWeapon || !actor.spiritualWeapon.active) return;
  
  const target = action.target;
  
  // Advantage on attacks vs paralyzed/stunned/unconscious targets
  const targetParalyzed = target.conditions && target.conditions.includes('paralyzed');
  const targetStunned = target.conditions && target.conditions.includes('stunned');
  const targetUnconscious = target.conditions && target.conditions.includes('unconscious');
  const hasAdvantage = targetParalyzed || targetStunned || targetUnconscious;
  
  // Check if bard wants to use Cutting Words reaction to reduce this attack
  let cuttingWordsReduction = 0;
  const atkResult = makeAttackRoll(actor.spellAttackBonus, target.ac, hasAdvantage, false);
  
  if (target.id === 'bard' && atkResult.hits && !target.reactedThisRound && target.bardicInspirationUses > 0) {
    // Can Cutting Words make it miss? (d8 max = 8)
    if (atkResult.total - 8 < target.ac) {
      cuttingWordsReduction = d8();
      target.bardicInspirationUses--;
      target.reactedThisRound = true;
      target.reactionsUsed++;
      const newTotal = atkResult.total - cuttingWordsReduction;
      if (newTotal < target.ac) {
        actor.attacksMade++;
        turnLog.push(`  BONUS ACTION: Spiritual Weapon attacks ${target.name}! [d20${hasAdvantage ? '(ADV-paralyzed)' : ''}:${atkResult.natural}+${actor.spellAttackBonus}=${atkResult.total} vs AC ${target.ac}] → REACTION: Cutting Words! (-${cuttingWordsReduction}, new total ${newTotal}) MISS!`);
        return;
      }
      // Cutting Words wasn't enough
      turnLog.push(`    (Cutting Words: -${cuttingWordsReduction}, but total ${newTotal} still hits)`);
    }
  }
  
  actor.attacksMade++;
  
  if (atkResult.hits) {
    // Auto-crit if within 5ft of paralyzed target (Spiritual Weapon is force — treat as melee-range spell)
    const isCrit = atkResult.isCrit || (targetParalyzed && distanceBetween(actor, target) <= 5);
    const dmg = rollDamage('1d8', actor.wisMod, isCrit);
    target.currentHP -= dmg.total;
    target.totalDamageTaken = (target.totalDamageTaken || 0) + dmg.total;
    actor.totalDamageDealt += dmg.total;
    actor.attacksHit++;
    turnLog.push(`  BONUS ACTION: Spiritual Weapon attacks ${target.name}! [d20${hasAdvantage ? '(ADV-paralyzed)' : ''}:${atkResult.natural}+${actor.spellAttackBonus}=${atkResult.total} vs AC ${target.ac}] ${isCrit ? 'CRITICAL ' : ''}HIT for ${dmg.total} force damage. ${target.name} HP: ${target.currentHP}/${target.maxHP}`);
    
    // Concentration check on bard
    if (target.concentrating) {
      const conSave = concentrationSave(target, dmg.total);
      if (conSave.success) {
        turnLog.push(`    → Concentration save: [d20${conSave.type === 'advantage' ? '(ADV: War Caster)' : ''}:${conSave.result}+${conSave.saveBonus}=${conSave.total} vs DC ${conSave.dc}] MAINTAINED!`);
        target.concentrationSavesMade++;
      } else {
        turnLog.push(`    → Concentration save: [d20${conSave.type === 'advantage' ? '(ADV: War Caster)' : ''}:${conSave.result}+${conSave.saveBonus}=${conSave.total} vs DC ${conSave.dc}] BROKEN! ${target.concentrating} ends!`);
        target.concentrationSavesFailed++;
        breakConcentration(target, _allCombatants);
      }
    }
  } else {
    turnLog.push(`  BONUS ACTION: Spiritual Weapon attacks ${target.name}! [d20${hasAdvantage ? '(ADV-paralyzed)' : ''}:${atkResult.natural}+${actor.spellAttackBonus}=${atkResult.total} vs AC ${target.ac}] MISS.`);
  }
}

// Use a module-level variable to pass allCombatants to nested functions
let _allCombatants = [];

function resolveCastSpell(caster, action, allCombatants, turnLog) {
  _allCombatants = allCombatants;
  const spell = action.spell;
  const level = action.level;
  
  // Spend slot
  if (level > 0 && caster.spellSlots[level] !== undefined) {
    caster.spellSlots[level]--;
  }
  caster.spellsCast++;
  
  // Drop existing concentration if casting a new concentration spell
  const concentrationSpells = ['Hypnotic Pattern', 'Hold Person', 'Greater Invisibility', 'Fly', 'Faerie Fire', 'Shield of Faith'];
  if (concentrationSpells.includes(spell) && caster.concentrating) {
    turnLog.push(`    → Dropping concentration on ${caster.concentrating}`);
    breakConcentration(caster, allCombatants);
  }
  
  switch (spell) {
    case 'Hypnotic Pattern': {
      const targets = action.targets || [];
      let charmedCount = 0;
      const dc = caster.id === 'bard' ? (8 + caster.profBonus + caster.chaMod) : caster.spellSaveDC;
      
      turnLog.push(`  ACTION: Cast Hypnotic Pattern (Level ${level} slot, ${caster.spellSlots[level]} remaining). DC ${dc} WIS save. 30ft cube.`);
      
      targets.forEach(target => {
        if (!isAlive(target) || isIncapacitated(target)) return;
        
        // Dark Devotion gives advantage on saves vs charmed
        const hasAdv = target.darkDevotion || target.magicResistance || false;
        const save = makeSavingThrow(target.saves.wis, dc, hasAdv, false);
        
        if (!save.success) {
          target.conditions.push('charmed_hp'); // Specifically from Hypnotic Pattern
          target.conditions.push('incapacitated');
          charmedCount++;
          caster.conditionsInflicted++;
          turnLog.push(`    → ${target.name}: WIS save [d20${hasAdv ? '(ADV)' : ''}:${save.result}+${save.saveBonus}=${save.total} vs DC ${dc}] FAIL! Charmed + Incapacitated + Speed 0.${hasAdv ? ' (Had advantage from Dark Devotion!)' : ''}`);
        } else {
          turnLog.push(`    → ${target.name}: WIS save [d20${hasAdv ? '(ADV)' : ''}:${save.result}+${save.saveBonus}=${save.total} vs DC ${dc}] SUCCESS. Resists.${hasAdv ? ' (Had advantage from Dark Devotion)' : ''}`);
        }
      });
      
      if (charmedCount > 0) {
        caster.concentrating = 'Hypnotic Pattern';
        caster.concentrationRoundsRemaining = 10; // 1 minute
        turnLog.push(`    → ${charmedCount}/${targets.length} enemies charmed! Concentrating on Hypnotic Pattern.`);
      } else {
        turnLog.push(`    → NO enemies charmed. Spell wasted.`);
      }
      return;
    }
    
    case 'Hold Person': {
      const target = action.target;
      const dc = caster.id === 'bard' ? (8 + caster.profBonus + caster.chaMod) : caster.spellSaveDC;
      
      turnLog.push(`  ACTION: Cast Hold Person (Level ${level} slot, ${caster.spellSlots[level]} remaining). DC ${dc} WIS save on ${target.name}.`);
      
      // Check Counterspell reaction from bard
      if (caster.side === 'enemy' && target.id === 'bard') {
        const reaction = bardReactionDecision(target, { type: 'enemy_casting_spell', spell: 'Hold Person', caster });
        if (reaction && reaction.type === 'counterspell' && target.spellSlots[3] > 0) {
          target.spellSlots[3]--;
          target.reactedThisRound = true;
          target.reactionsUsed++;
          // Counterspell at 3rd level vs 2nd level spell = auto-success
          turnLog.push(`    → ${target.name} uses REACTION: Counterspell (Level 3 slot)! Auto-counters the Level 2 Hold Person!`);
          return;
        }
      }
      
      const save = makeSavingThrow(target.saves.wis, dc);
      
      if (!save.success) {
        target.conditions.push('paralyzed');
        caster.concentrating = 'Hold Person';
        caster.concentrationRoundsRemaining = 10; // 1 minute
        caster.conditionsInflicted = (caster.conditionsInflicted || 0) + 1;
        turnLog.push(`    → ${target.name}: WIS save [d20:${save.result}+${save.saveBonus}=${save.total} vs DC ${dc}] FAIL! PARALYZED! (Auto-fail STR/DEX saves, attacks have advantage, crits within 5ft)`);
      } else {
        turnLog.push(`    → ${target.name}: WIS save [d20:${save.result}+${save.saveBonus}=${save.total} vs DC ${dc}] SUCCESS. Resists.`);
      }
      return;
    }
    
    case 'Greater Invisibility': {
      turnLog.push(`  ACTION: Cast Greater Invisibility (Level ${level} slot, ${caster.spellSlots[level]} remaining). Self. Concentration, up to 1 minute.`);
      caster.conditions.push('invisible');
      caster.concentrating = 'Greater Invisibility';
      caster.concentrationRoundsRemaining = 10; // 1 minute
      turnLog.push(`    → ${caster.name} is INVISIBLE. Attacks against have disadvantage. Attacks from have advantage. Doesn't end on attack/spell.`);
      return;
    }
    
    case 'Inflict Wounds': {
      const target = action.target;
      turnLog.push(`  ACTION: Cast Inflict Wounds (Level ${level} slot). Melee spell attack vs ${target.name}.`);
      
      const atkResult = makeAttackRoll(caster.spellAttackBonus, target.ac);
      caster.attacksMade++;
      
      if (atkResult.hits) {
        const dmg = rollDamage('3d10', 0, atkResult.isCrit);
        target.currentHP -= dmg.total;
        target.totalDamageTaken = (target.totalDamageTaken || 0) + dmg.total;
        caster.totalDamageDealt += dmg.total;
        caster.attacksHit++;
        turnLog.push(`    → Melee spell attack: [d20:${atkResult.natural}+${caster.spellAttackBonus}=${atkResult.total} vs AC ${target.ac}] ${atkResult.isCrit ? 'CRITICAL ' : ''}HIT! ${dmg.total} necrotic damage (${dmg.rolls.join('+')}). ${target.name} HP: ${target.currentHP}/${target.maxHP}`);
        
        // Concentration check
        if (target.concentrating) {
          const conSave = concentrationSave(target, dmg.total);
          if (conSave.success) {
            turnLog.push(`    → Concentration save: [d20${conSave.type === 'advantage' ? '(ADV)' : ''}:${conSave.result}+${conSave.saveBonus}=${conSave.total} vs DC ${conSave.dc}] MAINTAINED!`);
            target.concentrationSavesMade++;
          } else {
            turnLog.push(`    → Concentration save: BROKEN! ${target.concentrating} ends!`);
            target.concentrationSavesFailed++;
            breakConcentration(target, allCombatants);
          }
        }
      } else {
        turnLog.push(`    → Melee spell attack: [d20:${atkResult.natural}+${caster.spellAttackBonus}=${atkResult.total} vs AC ${target.ac}] MISS.`);
      }
      return;
    }
    
    case 'Command': {
      const target = action.target;
      const dc = caster.spellSaveDC;
      turnLog.push(`  ACTION: Cast Command — "Grovel!" (Level 1 slot). DC ${dc} WIS save on ${target.name}.`);
      const save = makeSavingThrow(target.saves.wis, dc);
      if (!save.success) {
        target.conditions.push('prone');
        turnLog.push(`    → FAIL! ${target.name} falls prone and ends turn.`);
      } else {
        turnLog.push(`    → SUCCESS. ${target.name} resists.`);
      }
      return;
    }
    
    case 'Shield of Faith': {
      turnLog.push(`  ACTION: Cast Shield of Faith (Level 1 slot). +2 AC to self. Concentration.`);
      caster.ac += 2;
      caster.concentrating = 'Shield of Faith';
      return;
    }
  }
}

function resolveCastCantrip(caster, action, turnLog) {
  const spell = action.spell;
  const target = action.target;
  
  switch (spell) {
    case 'Vicious Mockery': {
      const dc = 8 + caster.profBonus + caster.chaMod;
      turnLog.push(`  ACTION: Vicious Mockery on ${target.name}. DC ${dc} WIS save. 2d4 psychic + disadvantage on next attack.`);
      
      const save = makeSavingThrow(target.saves.wis, dc);
      if (!save.success) {
        const dmg = d4() + d4();
        target.currentHP -= dmg;
        target.totalDamageTaken = (target.totalDamageTaken || 0) + dmg;
        caster.totalDamageDealt += dmg;
        target.conditions.push('vm_disadvantage'); // Disadvantage on next attack roll
        turnLog.push(`    → WIS save [d20:${save.result}+${save.saveBonus}=${save.total} vs DC ${dc}] FAIL! ${dmg} psychic damage. ${target.name} has disadvantage on next attack. HP: ${target.currentHP}/${target.maxHP}`);
      } else {
        turnLog.push(`    → WIS save [d20:${save.result}+${save.saveBonus}=${save.total} vs DC ${dc}] SUCCESS. No effect.`);
      }
      return;
    }
    
    case 'Sacred Flame': {
      const dc = caster.spellSaveDC;
      const target2 = action.target;
      turnLog.push(`  ACTION: Sacred Flame on ${target2.name}. DC ${dc} DEX save. 1d8 radiant. (Ignores cover)`);
      
      // Paralyzed/stunned/unconscious creatures auto-fail STR and DEX saves
      const autoFailDex = target2.conditions && (target2.conditions.includes('paralyzed') || target2.conditions.includes('stunned') || target2.conditions.includes('unconscious'));
      const save = autoFailDex ? { result: 0, saveBonus: target2.saves.dex, total: 0, dc, success: false, nat20: false, nat1: true, type: 'auto-fail' } : makeSavingThrow(target2.saves.dex, dc);
      if (!save.success) {
        const dmg = d8();
        target2.currentHP -= dmg;
        caster.totalDamageDealt += dmg;
        turnLog.push(`    → DEX save [${autoFailDex ? 'AUTO-FAIL (paralyzed)' : `d20:${save.result}+${save.saveBonus}=${save.total}`} vs DC ${dc}] FAIL! ${dmg} radiant damage. ${target2.name} HP: ${target2.currentHP}/${target2.maxHP}`);
        target2.totalDamageTaken = (target2.totalDamageTaken || 0) + dmg;
        
        // Concentration check
        if (target2.concentrating) {
          const conSave = concentrationSave(target2, dmg);
          if (conSave.success) {
            turnLog.push(`    → Concentration save: [d20${conSave.type === 'advantage' ? '(ADV: War Caster)' : ''}:${conSave.result}+${conSave.saveBonus}=${conSave.total} vs DC ${conSave.dc}] MAINTAINED!`);
            target2.concentrationSavesMade++;
          } else {
            turnLog.push(`    → Concentration save: [d20${conSave.type === 'advantage' ? '(ADV: War Caster)' : ''}:${conSave.result}+${conSave.saveBonus}=${conSave.total} vs DC ${conSave.dc}] BROKEN! ${target2.concentrating} ends!`);
            target2.concentrationSavesFailed++;
            breakConcentration(target2, _allCombatants);
          }
        }
      } else {
        turnLog.push(`    → DEX save [d20:${save.result}+${save.saveBonus}=${save.total} vs DC ${dc}] SUCCESS. No damage.`);
      }
      return;
    }
  }
}

function resolveAttack(attacker, action, turnLog) {
  const target = action.target;
  const weapon = attacker.weapon;
  
  const atkResult = makeAttackRoll(weapon.attackBonus, target.ac);
  attacker.attacksMade++;
  
  turnLog.push(`  ACTION: Attack with ${weapon.name} on ${target.name}. [d20:${atkResult.natural}+${weapon.attackBonus}=${atkResult.total} vs AC ${target.ac}]`);
  
  if (atkResult.hits) {
    const dmg = rollDamage(weapon.damageDice, weapon.damageBonus, atkResult.isCrit);
    target.currentHP -= dmg.total;
    target.totalDamageTaken = (target.totalDamageTaken || 0) + dmg.total;
    attacker.totalDamageDealt += dmg.total;
    attacker.attacksHit++;
    turnLog.push(`    → ${atkResult.isCrit ? 'CRITICAL ' : ''}HIT! ${dmg.total} damage (${dmg.rolls.join('+')}+${dmg.bonus}). ${target.name} HP: ${target.currentHP}/${target.maxHP}`);
    
    if (target.concentrating) {
      const conSave = concentrationSave(target, dmg.total);
      if (conSave.success) {
        turnLog.push(`    → Concentration save: [d20${conSave.type === 'advantage' ? '(ADV: War Caster)' : ''}:${conSave.result}+${conSave.saveBonus}=${conSave.total} vs DC ${conSave.dc}] MAINTAINED!`);
        target.concentrationSavesMade++;
      } else {
        turnLog.push(`    → Concentration save: [d20${conSave.type === 'advantage' ? '(ADV: War Caster)' : ''}:${conSave.result}+${conSave.saveBonus}=${conSave.total} vs DC ${conSave.dc}] BROKEN! ${target.concentrating} ends!`);
        target.concentrationSavesFailed++;
        breakConcentration(target, _allCombatants);
      }
    }
  } else {
    turnLog.push(`    → MISS.`);
  }
}

function resolveMultiattack(attacker, action, turnLog) {
  const target = action.target;
  const numAttacks = attacker.multiattack || 1;
  const attack = attacker.attacks[0]; // Daggers
  
  turnLog.push(`  ACTION: Multiattack (${numAttacks} attacks) on ${target.name}.`);
  
  for (let i = 0; i < numAttacks; i++) {
    if (!isAlive(target)) {
      turnLog.push(`    Attack ${i+1}: ${target.name} is already down. No attack.`);
      break;
    }
    
    const hasDisadv = attacker.conditions.includes('vm_disadvantage') && i === 0;
    const targetDodging = target.conditions.includes('dodging');
    const targetInvisible = target.conditions.includes('invisible');
    const disadv = hasDisadv || targetDodging || targetInvisible;
    
    // Advantage on attacks vs paralyzed/stunned/unconscious/prone(melee)
    const targetParalyzed = target.conditions.includes('paralyzed');
    const targetStunned = target.conditions.includes('stunned');
    const targetUnconscious = target.conditions.includes('unconscious');
    const targetProne = target.conditions.includes('prone') && distanceBetween(attacker, target) <= 5;
    const hasAdv = targetParalyzed || targetStunned || targetUnconscious || targetProne;
    
    // Roll the attack (advantage and disadvantage cancel out)
    const effectiveAdv = hasAdv && !disadv;
    const effectiveDisadv = disadv && !hasAdv;
    const atkResult = makeAttackRoll(attack.bonus, target.ac, effectiveAdv, effectiveDisadv);
    
    // Cutting Words reaction — check BEFORE resolving hit
    let cuttingWordsUsed = false;
    if (target.id === 'bard' && atkResult.hits && !target.reactedThisRound && target.bardicInspirationUses > 0 && !isIncapacitated(target)) {
      if (atkResult.total - 8 < target.ac) {
        const cwRoll = d8();
        target.bardicInspirationUses--;
        target.reactedThisRound = true;
        target.reactionsUsed++;
        cuttingWordsUsed = true;
        const newTotal = atkResult.total - cwRoll;
        if (newTotal < target.ac) {
          attacker.attacksMade++;
          const advNote = effectiveAdv ? ' (ADV-paralyzed)' : effectiveDisadv ? ' (DISADV)' : '';
          turnLog.push(`    Attack ${i+1}: [d20${advNote}:${atkResult.natural}+${attack.bonus}=${atkResult.total} vs AC ${target.ac}] → REACTION: Cutting Words (-${cwRoll}, new total: ${newTotal}) MISS!`);
          if (hasDisadv) {
            const idx = attacker.conditions.indexOf('vm_disadvantage');
            if (idx >= 0) attacker.conditions.splice(idx, 1);
          }
          continue;
        }
        turnLog.push(`    (Cutting Words: -${cwRoll}, but total ${newTotal} still hits)`);
      }
    }
    
    attacker.attacksMade++;
    
    const advNote = effectiveAdv ? ' (ADV' + (targetParalyzed ? '-paralyzed' : '') + (targetProne ? '-prone' : '') + ')' : effectiveDisadv ? ' (DISADVANTAGE' + (hasDisadv ? ' - Vicious Mockery' : '') + (targetDodging ? ' - Dodge' : '') + (targetInvisible ? ' - Invisible' : '') + ')' : '';
    
    if (atkResult.hits) {
      // Auto-crit: attacks within 5ft of paralyzed creature are critical hits
      const autoCrit = targetParalyzed && distanceBetween(attacker, target) <= 5;
      const isCrit = atkResult.isCrit || autoCrit;
      const dmg = rollDamage(attack.damageDice, attack.damageBonus, isCrit);
      target.currentHP -= dmg.total;
      attacker.totalDamageDealt += dmg.total;
      attacker.attacksHit++;
      target.totalDamageTaken = (target.totalDamageTaken || 0) + dmg.total;
      turnLog.push(`    Attack ${i+1}: [d20${advNote}:${atkResult.natural}+${attack.bonus}=${atkResult.total} vs AC ${target.ac}] ${isCrit ? (autoCrit ? 'AUTO-CRIT (paralyzed within 5ft)! ' : 'CRITICAL HIT! ') : ''}HIT! ${dmg.total} ${attack.damageType} damage. ${target.name} HP: ${target.currentHP}/${target.maxHP}`);
      
      // Concentration check on bard
      if (target.concentrating) {
        const conSave = concentrationSave(target, dmg.total);
        if (conSave.success) {
          turnLog.push(`      → Concentration save: [d20${conSave.type === 'advantage' ? '(ADV: War Caster)' : ''}:${conSave.result}+${conSave.saveBonus}=${conSave.total} vs DC ${conSave.dc}] MAINTAINED!`);
          target.concentrationSavesMade++;
        } else {
          turnLog.push(`      → Concentration save: [d20${conSave.type === 'advantage' ? '(ADV: War Caster)' : ''}:${conSave.result}+${conSave.saveBonus}=${conSave.total} vs DC ${conSave.dc}] BROKEN! ${target.concentrating} ends!`);
          target.concentrationSavesFailed++;
          breakConcentration(target, _allCombatants);
        }
      }
    } else {
      turnLog.push(`    Attack ${i+1}: [d20${advNote}:${atkResult.natural}+${attack.bonus}=${atkResult.total} vs AC ${target.ac}] MISS.`);
    }
    
    // Remove VM disadvantage after first attack
    if (hasDisadv) {
      const idx = attacker.conditions.indexOf('vm_disadvantage');
      if (idx >= 0) attacker.conditions.splice(idx, 1);
    }
  }
}

function resolveBreathWeapon(actor, action, turnLog) {
  const bw = actor.breathWeapon;
  bw.uses--;
  
  const targets = action.targets || [];
  turnLog.push(`  ACTION: Breath Weapon! ${bw.shape}, ${bw.damage} ${bw.damageType} damage. DC ${bw.dc} ${bw.save} save. (${bw.uses} uses remaining)`);
  
  const dmgRolls = rollDice(2, d8);
  const totalDmg = dmgRolls.reduce((s, r) => s + r, 0);
  turnLog.push(`    Damage roll: ${dmgRolls.join(' + ')} = ${totalDmg} ${bw.damageType}`);
  
  targets.forEach(target => {
    if (!isAlive(target)) return;
    const save = makeSavingThrow(target.saves.dex, bw.dc);
    if (save.success) {
      const halfDmg = Math.floor(totalDmg / 2);
      target.currentHP -= halfDmg;
      actor.totalDamageDealt += halfDmg;
      target.totalDamageTaken = (target.totalDamageTaken || 0) + halfDmg;
      turnLog.push(`    → ${target.name}: DEX save [d20:${save.result}+${save.saveBonus}=${save.total} vs DC ${bw.dc}] SUCCESS. Half damage: ${halfDmg}. HP: ${target.currentHP}/${target.maxHP}`);
    } else {
      target.currentHP -= totalDmg;
      actor.totalDamageDealt += totalDmg;
      target.totalDamageTaken = (target.totalDamageTaken || 0) + totalDmg;
      turnLog.push(`    → ${target.name}: DEX save [d20:${save.result}+${save.saveBonus}=${save.total} vs DC ${bw.dc}] FAIL! Full damage: ${totalDmg}. HP: ${target.currentHP}/${target.maxHP}`);
    }
  });
}

function resolveShakeAwake(actor, action, turnLog) {
  const target = action.target;
  // Shaking a creature awake from Hypnotic Pattern: Use action to shake (auto-success)
  const charmIdx = target.conditions.indexOf('charmed_hp');
  const incapIdx = target.conditions.indexOf('incapacitated');
  if (charmIdx >= 0) target.conditions.splice(charmIdx, 1);
  if (incapIdx >= 0) target.conditions.splice(incapIdx, 1);
  
  turnLog.push(`  ACTION: Shakes ${target.name} awake from Hypnotic Pattern! ${target.name} is no longer charmed.`);
}

// breakConcentration imported from combat/engine/mechanics module


// ═══════════════════════════════════════════════════════════════════════════
// MAIN COMBAT LOOP
// ═══════════════════════════════════════════════════════════════════════════

function runCombat() {
  // Create combatants
  const bard = createBard();
  const enemies = [
    createCultFanatic(1),
    createCultFanatic(2),
    createCultFanatic(3),
    createCultFanatic(4),
  ];
  const allCombatants = [bard, ...enemies];
  _allCombatants = allCombatants;
  
  // Set initial positions (temple interior)
  // Bard starts at south end, fanatics at north end, ~40ft apart
  bard.position = { x: 4, y: 0 }; // 20ft from center
  enemies[0].position = { x: 2, y: 6 }; // 30ft away
  enemies[1].position = { x: 4, y: 7 }; // 35ft away
  enemies[2].position = { x: 6, y: 6 }; // 30ft away  
  enemies[3].position = { x: 5, y: 8 }; // 40ft away
  
  log('╔══════════════════════════════════════════════════════════════════╗');
  log('║  D&D 5e COMBAT SIMULATION                                      ║');
  log('║  Gem Dragonborn Lore Bard 8 (Iron Concentration)               ║');
  log('║  vs 4 Cult Fanatics (CR 2 each)                                ║');
  log('╚══════════════════════════════════════════════════════════════════╝');
  log('');
  log('ENCOUNTER: Temple of the Dark Cult');
  log('TERRAIN: Temple interior. Stone pillars provide half cover. Dim light (torches).');
  log('DIFFICULTY: Hard (4 × CR 2 = 1,800 XP vs Level 8 party of 1)');
  log('');
  
  // ── COMBATANT SUMMARY ──
  log('═══ COMBATANTS ═══');
  log(`${bard.name}`);
  log(`  HP: ${bard.maxHP} | AC: ${bard.ac} | Speed: ${bard.speed}ft | Spell DC: ${8 + bard.profBonus + bard.chaMod}`);
  log(`  CON Save: +${bard.saves.con} with ADVANTAGE (War Caster) | Concentration @ DC 10: ~99.8%`);
  log(`  Slots: 1st×${bard.spellSlots[1]}, 2nd×${bard.spellSlots[2]}, 3rd×${bard.spellSlots[3]}, 4th×${bard.spellSlots[4]}`);
  log(`  Species: Gem Flight (BA, 3/LR, no concentration), Breath Weapon (15ft cone 2d8 force, 3/LR), Telepathy 30ft`);
  log(`  Key Feats: Resilient(CON), War Caster, Lucky (Custom Lineage)`);
  log(`  Items: Cloak of Protection (+1 AC/saves), Stone of Good Luck (+1 checks/saves)`);
  log('');
  enemies.forEach(e => {
    log(`${e.name} (CR ${e.cr})`);
    log(`  HP: ${e.maxHP} | AC: ${e.ac} | Speed: ${e.speed}ft | Spell DC: ${e.spellSaveDC}`);
    log(`  Dark Devotion: ADVANTAGE on saves vs charmed/frightened`);
    log(`  Multiattack: 2 daggers (+4, 1d4+2)`);
    log(`  Spells: Hold Person, Spiritual Weapon, Inflict Wounds, Command, Shield of Faith, Sacred Flame`);
  });
  log('');
  
  // ── ROLL INITIATIVE ──
  log('═══ INITIATIVE ═══');
  const initiativeRolls = allCombatants.map(c => {
    const roll = d20();
    const mod = c.dexMod;
    return { combatant: c, roll, mod, total: roll + mod };
  });
  initiativeRolls.sort((a, b) => b.total - a.total || b.mod - a.mod);
  
  initiativeRolls.forEach((ir, i) => {
    log(`  ${i+1}. ${ir.combatant.name}: [d20:${ir.roll}+${ir.mod}=${ir.total}]`);
  });
  log('');
  
  const turnOrder = initiativeRolls.map(ir => ir.combatant);
  
  // ── COMBAT ROUNDS ──
  const maxRounds = 20;
  let combatOver = false;
  
  for (let round = 1; round <= maxRounds && !combatOver; round++) {
    log(`╔══════════════════════════════════════════════════════════════╗`);
    log(`║  ROUND ${round}                                                    ║`);
    log(`╚══════════════════════════════════════════════════════════════╝`);
    
    for (const combatant of turnOrder) {
      if (combatOver) break;
      if (!isAlive(combatant)) continue;
      
      const turnLog = [];
      
      // Reset per-turn resources
      combatant.usedAction = false;
      combatant.usedBonusAction = false;
      combatant.usedFreeInteraction = false;
      combatant.movementRemaining = combatant.speed;
      
      // Remove dodging from previous turn
      const dodgeIdx = combatant.conditions.indexOf('dodging');
      if (dodgeIdx >= 0) combatant.conditions.splice(dodgeIdx, 1);
      
      // Clear ALL vm_disadvantage at start of turn (Vicious Mockery: disadvantage on NEXT attack roll only)
      combatant.conditions = combatant.conditions.filter(c => c !== 'vm_disadvantage');
      
      // Clear prone if flying (you can't be prone while flying — standing costs half movement on ground)
      if (combatant.flying && combatant.conditions.includes('prone')) {
        const proneIdx = combatant.conditions.indexOf('prone');
        if (proneIdx >= 0) combatant.conditions.splice(proneIdx, 1);
      }
      
      // Clear prone if creature takes any movement (costs half speed to stand up)
      // We'll handle this when they decide to move
      
      // Reset reaction at start of own turn
      combatant.reactedThisRound = false;
      
      // ── START OF TURN EFFECTS ──
      // Gem Flight duration
      if (combatant.gemFlight && combatant.gemFlight.active) {
        combatant.gemFlight.roundsRemaining--;
        if (combatant.gemFlight.roundsRemaining <= 0) {
          combatant.gemFlight.active = false;
          combatant.flying = false;
          turnLog.push(`  ⚠ Gem Flight expires! ${combatant.name} lands.`);
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
          turnLog.push(`  ⚠ ${combatant.concentrating} expires (duration ended)!`);
          breakConcentration(combatant, allCombatants);
        }
      }
      
      // ── FALLING: Paralyzed/stunned/unconscious while flying = fall immediately ──
      if (combatant.flying && (combatant.conditions.includes('paralyzed') || combatant.conditions.includes('stunned') || combatant.conditions.includes('unconscious'))) {
        combatant.flying = false;
        if (combatant.gemFlight) {
          combatant.gemFlight.active = false;
          combatant.gemFlight.roundsRemaining = 0;
        }
        // Fall 20ft (the elevation we fly at): 2d6 falling damage
        const fallDmg = d6() + d6();
        combatant.currentHP -= fallDmg;
        combatant.totalDamageTaken = (combatant.totalDamageTaken || 0) + fallDmg;
        turnLog.push(`  ⚠ FALLING! ${combatant.name} is ${combatant.conditions.includes('paralyzed') ? 'paralyzed' : 'incapacitated'} while flying — crashes to the ground!`);
        turnLog.push(`    → Falling damage: 2d6 = ${fallDmg} bludgeoning damage. ${combatant.name} HP: ${combatant.currentHP}/${combatant.maxHP}`);
        combatant.conditions.push('prone');
        
        // Concentration check from falling damage
        if (combatant.concentrating) {
          const conSave = concentrationSave(combatant, fallDmg);
          if (conSave.success) {
            turnLog.push(`    → Concentration save vs fall: [d20${conSave.type === 'advantage' ? '(ADV: War Caster)' : ''}:${conSave.result}+${conSave.saveBonus}=${conSave.total} vs DC ${conSave.dc}] MAINTAINED!`);
            combatant.concentrationSavesMade++;
          } else {
            turnLog.push(`    → Concentration save vs fall: [d20${conSave.type === 'advantage' ? '(ADV: War Caster)' : ''}:${conSave.result}+${conSave.saveBonus}=${conSave.total} vs DC ${conSave.dc}] BROKEN! ${combatant.concentrating} ends!`);
            combatant.concentrationSavesFailed++;
            breakConcentration(combatant, allCombatants);
          }
        }
        
        // Check if fall killed them
        if (combatant.currentHP <= 0) {
          turnLog.forEach(l => log(l));
          log(`\n${'═'.repeat(60)}`);
          log(`  ☠ ${combatant.name} dies from falling damage at ${combatant.currentHP} HP!`);
          log(`${'═'.repeat(60)}`);
          combatOver = true;
          break;
        }
      }
      
      // ── TURN HEADER ──
      const condStr = combatant.conditions.length > 0 ? ` | Conditions: [${combatant.conditions.join(', ')}]` : '';
      const concStr = combatant.concentrating ? ` | Concentrating: ${combatant.concentrating}` : '';
      const flyStr = combatant.flying ? ' | FLYING' : '';
      
      turnLog.push(`\n--- ${combatant.name} ---`);
      turnLog.push(`  HP: ${combatant.currentHP}/${combatant.maxHP} | AC: ${combatant.ac}${flyStr}${condStr}${concStr}`);
      
      if (combatant.spellSlots) {
        const slotStr = Object.entries(combatant.spellSlots).map(([l, n]) => `${l}st:${n}`).join(', ');
        turnLog.push(`  Spell Slots: ${slotStr}`);
      }
      
      // ── CHECK IF INCAPACITATED ──
      // Incapacitated creatures can't take actions/bonus actions, but they STILL get
      // end-of-turn saves (Hold Person). We skip the tactical decision, NOT the whole turn.
      if (isIncapacitated(combatant)) {
        turnLog.push(`  ** INCAPACITATED ** (${combatant.conditions.join(', ')}). Cannot take actions.`);
        
        // ── END OF TURN SAVES (even while incapacitated!) ──
        if (combatant.conditions.includes('paralyzed')) {
          const casters = allCombatants.filter(c => c.concentrating === 'Hold Person' && c.side !== combatant.side && isAlive(c));
          if (casters.length > 0) {
            const dc = casters[0].spellSaveDC || 11;
            const save = makeSavingThrow(combatant.saves.wis, dc);
            if (save.success) {
              const idx = combatant.conditions.indexOf('paralyzed');
              if (idx >= 0) combatant.conditions.splice(idx, 1);
              // Also remove prone from falling — they can stand up next turn
              turnLog.push(`  END OF TURN: WIS save vs Hold Person [d20:${save.result}+${save.saveBonus}=${save.total} vs DC ${dc}] SUCCESS! No longer paralyzed!`);
            } else {
              turnLog.push(`  END OF TURN: WIS save vs Hold Person [d20:${save.result}+${save.saveBonus}=${save.total} vs DC ${dc}] FAIL. Still paralyzed.`);
            }
          }
        }
        
        turnLog.forEach(l => log(l));
        continue;
      }
      
      // ── TACTICAL DECISION ──
      let decision;
      if (combatant.id === 'bard') {
        decision = bardTacticalDecision(combatant, enemies, round, turnLog);
      } else {
        decision = cultFanaticTacticalDecision(combatant, bard, enemies, round);
      }
      
      if (!decision) {
        turnLog.push(`  No valid actions available.`);
        turnLog.forEach(l => log(l));
        continue;
      }
      
      turnLog.push(`  REASONING: ${decision.reasoning}`);
      
      // ── RESOLVE MOVEMENT (can happen before, during, or after actions) ──
      if (decision.movement) {
        if (decision.movement.type === 'fly_up') {
          turnLog.push(`  MOVEMENT: Flies up ${decision.movement.distance}ft. ${decision.movement.reason}`);
        } else if (decision.movement.type === 'move_toward') {
          turnLog.push(`  MOVEMENT: Moves ${decision.movement.distance}ft toward ${decision.movement.target.name || 'target'}.`);
          // Update position (simplified)
          combatant.position.y += Math.sign(decision.movement.target.position.y - combatant.position.y) * Math.min(6, Math.abs(decision.movement.target.position.y - combatant.position.y));
        } else if (decision.movement.type === 'move_away') {
          turnLog.push(`  MOVEMENT: Moves ${decision.movement.distance}ft away from ${decision.movement.from.name}.`);
        }
      }
      
      // ── RESOLVE BONUS ACTION (often comes first — Gem Flight, Spiritual Weapon) ──
      if (decision.bonusAction) {
        resolveBonusAction(combatant, decision.bonusAction, allCombatants, turnLog);
        combatant.usedBonusAction = true;
      }
      
      // ── RESOLVE ACTION ──
      if (decision.action) {
        resolveAction(combatant, decision.action, allCombatants, turnLog);
        combatant.usedAction = true;
      }
      
      // ── END OF TURN SAVES ──
      // Paralyzed creatures (from Hold Person) save at end of their turn
      // NOTE: If the creature was incapacitated at start of turn, this is handled
      // in the incapacitated block above. This catches cases where a creature
      // becomes paralyzed DURING their own turn (unlikely but possible).
      if (combatant.conditions.includes('paralyzed')) {
        const casters = allCombatants.filter(c => c.concentrating === 'Hold Person' && c.side !== combatant.side && isAlive(c));
        if (casters.length > 0) {
          const dc = casters[0].spellSaveDC || 11;
          const save = makeSavingThrow(combatant.saves.wis, dc);
          if (save.success) {
            const idx = combatant.conditions.indexOf('paralyzed');
            if (idx >= 0) combatant.conditions.splice(idx, 1);
            turnLog.push(`  END OF TURN: WIS save vs Hold Person [d20:${save.result}+${save.saveBonus}=${save.total} vs DC ${dc}] SUCCESS! No longer paralyzed.`);
          } else {
            turnLog.push(`  END OF TURN: WIS save vs Hold Person [d20:${save.result}+${save.saveBonus}=${save.total} vs DC ${dc}] FAIL. Still paralyzed.`);
          }
        }
      }
      
      // ── LOG THE TURN ──
      turnLog.forEach(l => log(l));
      
      // ── CHECK VICTORY ──
      if (bard.currentHP <= 0) {
        log(`\n${'═'.repeat(60)}`);
        log(`  ☠ DEFEAT — ${bard.name} falls at ${bard.currentHP} HP!`);
        log(`${'═'.repeat(60)}`);
        combatOver = true;
      }
      
      const aliveEnemies = getAllAliveEnemies(enemies);
      if (aliveEnemies.length === 0) {
        log(`\n${'═'.repeat(60)}`);
        log(`  🏆 VICTORY — All enemies defeated!`);
        log(`${'═'.repeat(60)}`);
        combatOver = true;
      }
      
      const activeEnemies = getActiveEnemies(enemies);
      if (activeEnemies.length === 0 && aliveEnemies.length > 0 && round >= 2) {
        // All enemies incapacitated but alive — bard can finish them off
        // Only call it a win if they've been incapacitated for a while
        if (round >= 5) {
          log(`\n${'═'.repeat(60)}`);
          log(`  🏆 VICTORY — All enemies incapacitated for ${round - 1} rounds!`);
          log(`${'═'.repeat(60)}`);
          combatOver = true;
        }
      }
    }
  }
  
  // ── ANALYTICS ──
  log('');
  log('╔══════════════════════════════════════════════════════════════╗');
  log('║  COMBAT ANALYTICS                                           ║');
  log('╚══════════════════════════════════════════════════════════════╝');
  
  log(`\n${bard.name}:`);
  log(`  Final HP: ${bard.currentHP}/${bard.maxHP} (${Math.round(bard.currentHP/bard.maxHP*100)}%)`);
  log(`  Damage Dealt: ${bard.totalDamageDealt}`);
  log(`  Damage Taken: ${bard.totalDamageTaken || 0} (HP lost: ${bard.maxHP - bard.currentHP})`);
  log(`  Healing Done: ${bard.totalHealing || 0}`);
  log(`  Attacks Made: ${bard.attacksMade} | Hits: ${bard.attacksHit} | Hit Rate: ${bard.attacksMade ? Math.round(bard.attacksHit/bard.attacksMade*100) : 0}%`);
  log(`  Spells Cast: ${bard.spellsCast}`);
  log(`  Concentration Saves: ${bard.concentrationSavesMade} made / ${bard.concentrationSavesMade + bard.concentrationSavesFailed} total`);
  log(`  Conditions Inflicted: ${bard.conditionsInflicted}`);
  log(`  Reactions Used: ${bard.reactionsUsed}`);
  log(`  Remaining Slots: 1st×${bard.spellSlots[1]}, 2nd×${bard.spellSlots[2]}, 3rd×${bard.spellSlots[3]}, 4th×${bard.spellSlots[4]}`);
  log(`  Gem Flight Uses: ${bard.gemFlight.uses}/${bard.gemFlight.maxUses} | Breath Weapon: ${bard.breathWeapon.uses}/${bard.breathWeapon.maxUses}`);
  log(`  Bardic Inspiration: ${bard.bardicInspirationUses}/${bard.bardicInspirationMax}`);
  
  enemies.forEach(e => {
    log(`\n${e.name}:`);
    log(`  Final HP: ${Math.max(0, e.currentHP)}/${e.maxHP}`);
    log(`  Damage Dealt: ${e.totalDamageDealt}`);
    log(`  Attacks Made: ${e.attacksMade} | Hits: ${e.attacksHit}`);
    log(`  Spells Cast: ${e.spellsCast}`);
    log(`  Conditions: ${e.conditions.length > 0 ? e.conditions.join(', ') : 'none'}`);
  });
  
  // ── SAVE LOG ──
  const logPath = path.join(__dirname, '..', 'combat-logs', `combat-gem-dragonborn-iron-conc-vs-cult-fanatics-${Date.now()}.md`);
  const mdLog = `# Combat Log: Gem Dragonborn Iron Concentration vs 4 Cult Fanatics\n\n\`\`\`\n${combatLog.join('\n')}\n\`\`\`\n`;
  fs.writeFileSync(logPath, mdLog);
  console.log(`\nCombat log saved to: ${logPath}`);
  
  return combatLog;
}

// ── EXPORTS FOR TESTING ──
module.exports = {
  // Dice engine
  setDiceMode,
  d20, d12, d10, d8, d6, d4, rollDice, rollWithAdvantage, rollWithDisadvantage,
  // Character creation
  createBard, createCultFanatic,
  // Combat mechanics
  makeAbilityCheck, makeSavingThrow, makeAttackRoll, rollDamage,
  concentrationSave, isIncapacitated, isAlive, getActiveEnemies, getAllAliveEnemies,
  // Position & targeting
  distanceBetween, selectHighestThreatEnemy,
  // Action resolution
  resolveAction, resolveBonusAction, resolveCastSpell, resolveCastCantrip,
  resolveAttack, resolveMultiattack, resolveBreathWeapon, resolveShakeAwake,
  resolveSpiritualWeaponAttack, breakConcentration,
  // AI
  bardTacticalDecision, bardReactionDecision, cultFanaticTacticalDecision,
  // Main loop
  runCombat,
};

// ── RUN (only when executed directly, not when imported for testing) ──
if (require.main === module) {
  runCombat();
}
