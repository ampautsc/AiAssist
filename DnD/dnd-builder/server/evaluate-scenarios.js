/**
 * Scenario-Based Build Evaluation Engine
 * 
 * Evaluates all 23 Lore Bard builds against 8 combat encounter types.
 * 
 * Key insight: Raw stat comparison is misleading. AC 20 with 91% concentration save
 * may be WORSE than AC 13 with 99.8% save — or BETTER — depending on who's attacking.
 * 
 * This engine computes: P(hit|AC) × P(fail save|damage) across real encounters,
 * factors in flight/invisibility/magic resistance, and ranks builds per scenario.
 * 
 * Usage: node server/evaluate-scenarios.js
 */

const mongoose = require('mongoose');
const path = require('path');
require('dotenv').config({ path: path.resolve(__dirname, '../.env') });

const Build = require(path.resolve(__dirname, './models/Build'));
require(path.resolve(__dirname, './models/Species'));
require(path.resolve(__dirname, './models/Feat'));
require(path.resolve(__dirname, './models/Item'));
const { computeBuildStats } = require(path.resolve(__dirname, './utils/buildCalculator'));

// ═══════════════════════════════════════════════════════════════════════════
// MATH ENGINE
// ═══════════════════════════════════════════════════════════════════════════

function clamp(v, lo, hi) { return Math.min(hi, Math.max(lo, v)); }
function pct(v) { return Math.round(v * 1000) / 10; }  // → 1 decimal %

/**
 * P(attack roll hits) given attacker bonus and target AC.
 * 5e: need d20+bonus ≥ AC. Nat 1 always misses, nat 20 always hits.
 */
function pHit(atkBonus, targetAC) {
  const needed = targetAC - atkBonus;
  if (needed <= 1) return 0.95;   // only nat 1 misses
  if (needed >= 20) return 0.05;  // only nat 20 hits
  return (21 - needed) / 20;
}

/** P(attack roll hits) with disadvantage — two d20s, take lower */
function pHitDisadv(atkBonus, targetAC) {
  const h = pHit(atkBonus, targetAC);
  return 1 - (1 - h) * (1 - h);  // P(at least one hits)... no.
  // Disadvantage: take the WORSE of two rolls = lower.
  // P(hit with disadv) = P(both rolls hit) = h * h... no.
  // Actually: you roll two d20s and take the LOWER. Hit if LOWER ≥ needed.
  // P(hit) = P(both dice ≥ needed) = h * h. Yes, that's right for the "needed" model.
  // Wait, let me think again. With normal roll: P(d20 ≥ needed) = h.
  // With disadvantage: take lower of two dice. P(lower ≥ needed) = P(both ≥ needed) = h².
}

// Fix the function:
function pHitWithDisadvantage(atkBonus, targetAC) {
  const h = pHit(atkBonus, targetAC);
  return h * h;
}

/**
 * P(failing a saving throw). 5e 2014: NO auto-fail on nat 1 for saves.
 * Succeed if d20 + bonus ≥ DC. Fail if d20 < DC - bonus.
 */
function pFailSave(saveBonus, dc) {
  const needed = dc - saveBonus;  // must roll this or higher
  if (needed <= 1) return 0;      // always succeed
  if (needed > 20) return 1;      // impossible to succeed
  return (needed - 1) / 20;
}

/** P(fail with advantage on the save) = must fail BOTH rolls */
function pFailSaveWithAdv(saveBonus, dc) {
  const f = pFailSave(saveBonus, dc);
  return f * f;
}

/** Concentration save DC from damage taken */
function conSaveDC(damage) {
  return Math.max(10, Math.floor(damage / 2));
}

/** P(concentration breaks from a single hit) */
function pConBreak(damage, conSaveBonus, hasAdvConSave) {
  const dc = conSaveDC(damage);
  return hasAdvConSave ? pFailSaveWithAdv(conSaveBonus, dc) : pFailSave(conSaveBonus, dc);
}


// ═══════════════════════════════════════════════════════════════════════════
// MONSTER DATABASE (from dnd5eapi.co)
// ═══════════════════════════════════════════════════════════════════════════

const M = {
  zombie: {
    name: 'Zombie', cr: 0.25, hp: 22, wisSave: -2,
    immuneCharmed: false, melee: true, ranged: false, caster: false,
    attacks: [{ name: 'Slam', bonus: 3, avgDmg: 4 }],
  },
  skeleton: {
    name: 'Skeleton', cr: 0.25, hp: 13, wisSave: -1,
    immuneCharmed: false, melee: true, ranged: true, caster: false,
    attacks: [{ name: 'Shortbow', bonus: 4, avgDmg: 5 }],
  },
  ghoul: {
    name: 'Ghoul', cr: 1, hp: 22, wisSave: 0,
    immuneCharmed: true, melee: true, ranged: false, caster: false,
    attacks: [{ name: 'Claws', bonus: 4, avgDmg: 7 }],
  },
  ghast: {
    name: 'Ghast', cr: 2, hp: 36, wisSave: 0,
    immuneCharmed: true, melee: true, ranged: false, caster: false,
    attacks: [
      { name: 'Bite', bonus: 3, avgDmg: 12 },
      { name: 'Claws', bonus: 5, avgDmg: 10 }
    ],
  },
  cultFanatic: {
    name: 'Cult Fanatic', cr: 2, hp: 33, wisSave: 1,
    immuneCharmed: false, advVsCharm: true,  // Dark Devotion
    melee: true, ranged: false, caster: true,
    attacks: [
      { name: 'Dagger', bonus: 4, avgDmg: 4 },
      { name: 'Dagger', bonus: 4, avgDmg: 4 }
    ],
    canCastHoldPerson: true, holdPersonDC: 11,
  },
  werewolf: {
    name: 'Werewolf', cr: 3, hp: 58, wisSave: 0,
    immuneCharmed: false, melee: true, ranged: false, caster: false,
    attacks: [
      { name: 'Bite', bonus: 4, avgDmg: 6 },
      { name: 'Claws', bonus: 4, avgDmg: 7 }
    ],
  },
  youngRedDragon: {
    name: 'Young Red Dragon', cr: 10, hp: 178, wisSave: 4,
    immuneCharmed: false, melee: true, ranged: false, caster: false, flying: true,
    attacks: [
      { name: 'Bite', bonus: 10, avgDmg: 20 },
      { name: 'Claw', bonus: 10, avgDmg: 13 },
      { name: 'Claw', bonus: 10, avgDmg: 13 }
    ],
    breath: { dc: 17, stat: 'DEX', avgDmg: 56, half: true, round: 1 },
  },
  hillGiant: {
    name: 'Hill Giant', cr: 5, hp: 105, wisSave: -1,
    immuneCharmed: false, melee: true, ranged: true, caster: false,
    attacks: [
      { name: 'Greatclub', bonus: 8, avgDmg: 18 },
      { name: 'Greatclub', bonus: 8, avgDmg: 18 }
    ],
  },
  frostGiant: {
    name: 'Frost Giant', cr: 8, hp: 138, wisSave: 3,
    immuneCharmed: false, melee: true, ranged: true, caster: false,
    attacks: [
      { name: 'Greataxe', bonus: 9, avgDmg: 25 },
      { name: 'Greataxe', bonus: 9, avgDmg: 25 }
    ],
  },
  ogre: {
    name: 'Ogre', cr: 2, hp: 59, wisSave: -2,
    immuneCharmed: false, melee: true, ranged: false, caster: false,
    attacks: [{ name: 'Greatclub', bonus: 6, avgDmg: 13 }],
  },
  bandit: {
    name: 'Bandit', cr: 0.125, hp: 11, wisSave: 0,
    immuneCharmed: false, melee: true, ranged: true, caster: false,
    attacks: [{ name: 'Scimitar', bonus: 3, avgDmg: 4 }],
  },
  banditCaptain: {
    name: 'Bandit Captain', cr: 2, hp: 65, wisSave: 0,
    immuneCharmed: false, melee: true, ranged: true, caster: false,
    attacks: [
      { name: 'Scimitar', bonus: 5, avgDmg: 7 },
      { name: 'Scimitar', bonus: 5, avgDmg: 7 },
      { name: 'Dagger', bonus: 5, avgDmg: 5 }
    ],
  },
  mage: {
    name: 'Mage', cr: 6, hp: 40, wisSave: 3,
    immuneCharmed: false, melee: false, ranged: true, caster: true,
    attacks: [{ name: 'Fire Bolt', bonus: 7, avgDmg: 11 }],
    hasCounterspell: true,
    aoe: { name: 'Fireball', dc: 14, stat: 'DEX', avgDmg: 28, half: true },
  },
  lich: {
    name: 'Lich', cr: 21, hp: 135, wisSave: 9,
    immuneCharmed: true, melee: true, ranged: true, caster: true,
    legendaryRes: 3,
    attacks: [{ name: 'Paralyzing Touch', bonus: 12, avgDmg: 10 }],
    hasCounterspell: true,
    aoe: { name: 'Fireball', dc: 20, stat: 'DEX', avgDmg: 28, half: true },
    disruptLife: { dc: 18, avgDmg: 21, half: true },  // legendary action AoE
  },
  archmage: {
    name: 'Archmage', cr: 12, hp: 99, wisSave: 6,
    immuneCharmed: false, magicResistance: true,
    melee: false, ranged: true, caster: true,
    attacks: [{ name: 'Fire Bolt (cantrip)', bonus: 9, avgDmg: 11 }],
    hasCounterspell: true,
    aoe: { name: 'Cone of Cold', dc: 17, stat: 'CON', avgDmg: 36, half: true },
  },
};


// ═══════════════════════════════════════════════════════════════════════════
// 8 ENCOUNTER SCENARIOS
// ═══════════════════════════════════════════════════════════════════════════

const SCENARIOS = [
  {
    id: 'undead-swarm',
    name: '💀 Undead Swarm',
    desc: 'Tomb breach — zombies, skeletons, and ghouls pour from alcoves',
    foes: [
      { monster: M.zombie, count: 4 },
      { monster: M.skeleton, count: 4 },
      { monster: M.ghoul, count: 2 },
    ],
    rounds: 5,
    notes: 'Ghouls IMMUNE to charmed → Hypnotic Pattern useless on them. Low WIS on the rest. Skeletons have bows (hit flyers).',
  },
  {
    id: 'werewolf-pack',
    name: '🐺 Werewolf Pack',
    desc: 'Full-moon ambush — 4 werewolves in hybrid form',
    foes: [
      { monster: M.werewolf, count: 4 },
    ],
    rounds: 5,
    notes: 'All melee. Immune to non-magical B/P/S. HP works (no charm immunity). 8 attacks/round if all up.',
  },
  {
    id: 'cult-fanatics',
    name: '⛪ Cult Fanatics',
    desc: 'Ritual chamber — 4 fanatics with Dark Devotion + 1 mage',
    foes: [
      { monster: M.cultFanatic, count: 4 },
      { monster: M.mage, count: 1 },
    ],
    rounds: 5,
    notes: 'HARDEST for control bard. Dark Devotion = ADV vs charm. Mage has Counterspell. Fanatics cast Hold Person.',
  },
  {
    id: 'dragon-assault',
    name: '🐉 Dragon Assault',
    desc: 'Young Red Dragon — breath weapon, multiattack, flight',
    foes: [
      { monster: M.youngRedDragon, count: 1 },
    ],
    rounds: 5,
    notes: 'Breath weapon DC 17 DEX for 56 avg dmg → concentration DC 28. Three attacks at +10. WIS +4 save.',
  },
  {
    id: 'frost-giant-smash',
    name: '🏔️ Frost Giant Smash',
    desc: 'Frost Giant with 2 ogre bodyguards',
    foes: [
      { monster: M.frostGiant, count: 1 },
      { monster: M.ogre, count: 2 },
    ],
    rounds: 5,
    notes: 'Massive damage per hit (25 avg). Frost Giant WIS +3. Ogres have terrible WIS (-2).',
  },
  {
    id: 'lich-encounter',
    name: '💀 Lich Encounter',
    desc: 'Ancient Lich — Legendary Resistance, Counterspell, immune to charmed',
    foes: [
      { monster: M.lich, count: 1 },
    ],
    rounds: 5,
    notes: 'Immune to charmed = HP USELESS. 3× Legendary Resistance. Counterspell. Tests pure survivability. DC 20 spells.',
  },
  {
    id: 'archmage-duel',
    name: '🧙 Archmage Duel',
    desc: 'Archmage with Magic Resistance, Counterspell, AoE damage',
    foes: [
      { monster: M.archmage, count: 1 },
    ],
    rounds: 5,
    notes: 'Magic Resistance = ADV on saves vs bard. Counterspell. WIS +6. Cone of Cold 36 avg dmg.',
  },
  {
    id: 'mixed-encounter',
    name: '⚔️ Mixed Encounter',
    desc: 'Bandit camp — captain, 4 bandits, mage advisor, 2 ogre enforcers',
    foes: [
      { monster: M.banditCaptain, count: 1 },
      { monster: M.bandit, count: 4 },
      { monster: M.mage, count: 1 },
      { monster: M.ogre, count: 2 },
    ],
    rounds: 5,
    notes: 'Realistic mixed. Mage has Counterspell. Varied WIS saves. Melee + ranged.',
  },
];


// ═══════════════════════════════════════════════════════════════════════════
// BUILD SPECIAL ABILITY DETECTION
// ═══════════════════════════════════════════════════════════════════════════

function detectAbilities(build) {
  const sp = build.species || {};
  const traits = sp.traitList || [];
  const items = build.items || [];
  const feats = (build.levelChoices || []).filter(c => c.feat).map(c => c.feat);

  const a = {
    permanentFlight: sp.hasFlight || false,
    limitedFlight: false,
    itemFlight: false,
    hiddenStep: false,    // Firbolg: invisible 1 turn
    feyStep: false,       // Eladrin: teleport + charm
    magicResistance: false,
    shellDefense: false,  // Tortle: +4 AC, speed 0
    isFey: sp.creatureType === 'Fey',
    poisonImmune: (sp.conditionImmunities || []).includes('poisoned'),
    dragonBreath: false,
    dragonFear: false,
  };

  for (const t of traits) {
    const n = (t.name || '').toLowerCase();
    if (n.includes('hidden step')) a.hiddenStep = true;
    if (n.includes('fey step')) a.feyStep = true;
    if (n.includes('magic resistance')) a.magicResistance = true;
    if (n.includes('shell defense')) a.shellDefense = true;
    if (n.includes('gem flight')) a.limitedFlight = true;
    if (n.includes('breath weapon')) a.dragonBreath = true;
  }

  for (const item of items) {
    if ((item.name || '').toLowerCase().includes('winged boots')) a.itemFlight = true;
  }

  for (const feat of feats) {
    if ((feat.name || '').toLowerCase().includes('dragon fear')) a.dragonFear = true;
  }

  // If limitedFlight was detected (e.g., Gem Flight), it overrides hasFlight flag
  if (a.limitedFlight) a.permanentFlight = false;
  a.canFly = a.permanentFlight || a.limitedFlight || a.itemFlight;
  // Turn when flight becomes available
  a.flyTurn = a.permanentFlight ? 0 :        // before combat even (Fairy)
              (a.itemFlight ? 1 : (a.limitedFlight ? 2 : 99));  // bonus action T1, or T2 for Gem

  return a;
}

/** Bard HP: Level 8, d8 hit die. 8 + CON at L1, avg 5 + CON per level after */
function bardHP(conMod) {
  return 8 + conMod + 7 * (5 + conMod);  // = 43 + 8×conMod
}


// ═══════════════════════════════════════════════════════════════════════════
// EVALUATION ENGINE
// ═══════════════════════════════════════════════════════════════════════════

function evaluateBuild(build, computed, abilities, scenario) {
  const AC = computed.finalAc;
  const conSave = computed.conSaveBonus;
  const advCon = computed.conSaveType === 'advantage' || computed.conSaveType === 'both';
  const DC = computed.spellDc;
  const hp = bardHP(computed.conMod);
  const dexSave = computed.dexMod;       // bard isn't proficient in DEX saves
  const chaSave = computed.chaMod + 3;   // bard IS proficient in CHA saves (prof +3)
  const wisSave = Math.floor((computed.finalStats.wis - 10) / 2);
  
  // Account for Cloak/Luckstone save bonuses for non-CON saves too
  let allSaveBonus = 0;
  for (const item of (build.items || [])) {
    if (item.saveBonus) allSaveBonus += item.saveBonus;
  }

  // ────────────────────────────────────────────────────────────────────
  // 1. OPENING SPELL: How many enemies does Hypnotic Pattern remove?
  // ────────────────────────────────────────────────────────────────────
  let totalFoes = 0;
  let expectedCharmed = 0;
  const survivingFoes = [];  // foes still active after HP

  for (const { monster: m, count } of scenario.foes) {
    for (let i = 0; i < count; i++) {
      totalFoes++;
      let failRate;

      if (m.immuneCharmed) {
        failRate = 0;
      } else if (m.advVsCharm || m.magicResistance) {
        // Enemy has advantage on the save → less likely to fail
        failRate = pFailSaveWithAdv(m.wisSave, DC);
      } else {
        failRate = pFailSave(m.wisSave, DC);
      }

      expectedCharmed += failRate;
      const surviveRate = 1 - failRate;

      if (surviveRate > 0.01) {
        survivingFoes.push({ monster: m, weight: surviveRate });
      }
    }
  }

  const ccPct = totalFoes > 0 ? expectedCharmed / totalFoes : 0;

  // ────────────────────────────────────────────────────────────────────
  // 2. ROUND-BY-ROUND CONCENTRATION + SURVIVAL
  // ────────────────────────────────────────────────────────────────────
  // Bard in a 4-person party → ~33% of targeted attacks hit them (caster aggro)
  const TARGET_RATE = 0.33;

  let concProb = 1.0;   // cumulative P(concentration still up)
  let hpLeft = hp;       // expected HP remaining
  const roundLog = [];

  for (let r = 1; r <= scenario.rounds; r++) {
    let roundConcHold = 1.0;
    let roundDmg = 0;

    // Is bard flying this round?
    const flying = r > abilities.flyTurn;
    // Firbolg Hidden Step: can go invisible on T1 (cast spell + Hidden Step as bonus)
    const invisible = abilities.hiddenStep && r === 1;

    // ── Weapon attacks from surviving foes ──
    for (const { monster: m, weight } of survivingFoes) {
      // Skip normal attacks if this monster used breath weapon this round
      if (m.breath && r === (m.breath.round || 1)) continue;

      // Can this enemy reach the bard?
      const canReach = invisible ? false :
                       flying ? (m.ranged || m.caster || m.flying) : true;
      if (!canReach) continue;

      for (const atk of m.attacks) {
        const effectiveWeight = weight * TARGET_RATE;
        const hitP = pHit(atk.bonus, AC) * effectiveWeight;
        const breakP = pConBreak(atk.avgDmg, conSave, advCon);

        roundConcHold *= (1 - hitP * breakP);
        roundDmg += hitP * atk.avgDmg;
      }
    }

    // ── Breath weapons (dragon uses breath OR multiattack, not both) ──
    for (const { monster: m, count } of scenario.foes) {
      if (m.breath && r === (m.breath.round || 1)) {
        // Breath weapon is a DEX save — AC doesn't matter
        if (invisible) continue;  // breath aims at visible targets
        // Flying doesn't help vs dragon (dragon is also flying)

        const bw = m.breath;
        const bardSave = dexSave + allSaveBonus;
        const failBWSave = pFailSave(bardSave, bw.dc);

        // CORRECT math: conditional probability, NOT expected damage
        // P(break) = P(fail save) × P(break|full dmg) + P(succeed save) × P(break|half dmg)
        const fullDmg = bw.avgDmg;
        const halfDmg = bw.half ? Math.floor(bw.avgDmg / 2) : 0;
        const breakIfFull = pConBreak(fullDmg, conSave, advCon);
        const breakIfHalf = bw.half ? pConBreak(halfDmg, conSave, advCon) : 0;
        const bwBreak = failBWSave * breakIfFull + (1 - failBWSave) * breakIfHalf;

        const avgDmgTaken = failBWSave * fullDmg + (1 - failBWSave) * halfDmg;
        roundConcHold *= (1 - bwBreak * count);
        roundDmg += avgDmgTaken * count;

        // SKIP normal attacks on breath round (dragon uses breath OR multiattack)
        continue; // handled below — mark this round as breath-round
      }
    }

    // Check if this is a breath round for any monster (to skip their normal attacks)
    const isBreathRound = scenario.foes.some(f => f.monster.breath && r === (f.monster.breath.round || 1));

    // ── AoE spells from caster enemies (Fireball, Cone of Cold, etc.) ──
    for (const { monster: m, count } of scenario.foes) {
      if (m.aoe && r <= 2) {
        // Casters typically open with their big AoE
        if (invisible) continue;

        const aoe = m.aoe;
        let bardSaveVsAoE = (aoe.stat === 'DEX' ? dexSave : 
                             aoe.stat === 'CON' ? conSave : wisSave) + allSaveBonus;
        
        // Bard's Magic Resistance helps here
        let failAoE;
        if (abilities.magicResistance) {
          failAoE = pFailSaveWithAdv(bardSaveVsAoE, aoe.dc);
        } else {
          failAoE = pFailSave(bardSaveVsAoE, aoe.dc);
        }

        // Conditional probability: P(break) = P(fail)×P(break|full) + P(save)×P(break|half)
        const fullDmg = aoe.avgDmg;
        const halfDmg = aoe.half ? Math.floor(aoe.avgDmg / 2) : 0;
        const breakFull = pConBreak(fullDmg, conSave, advCon);
        const breakHalf = aoe.half ? pConBreak(halfDmg, conSave, advCon) : 0;
        const brkP = failAoE * breakFull + (1 - failAoE) * breakHalf;
        const avgDmg = failAoE * fullDmg + (1 - failAoE) * halfDmg;
        
        // 50% chance AoE is aimed at bard's area (party is spread)
        const aoeTargetRate = 0.5;
        roundConcHold *= (1 - brkP * count * aoeTargetRate);
        roundDmg += avgDmg * count * aoeTargetRate;
      }
    }

    // ── Lich Disrupt Life (legendary action, 20ft AoE each round) ──
    for (const { monster: m, count } of scenario.foes) {
      if (m.disruptLife && r >= 2) {
        if (invisible) continue;
        const dl = m.disruptLife;
        let bardSaveDL = conSave + allSaveBonus;
        let failDL = abilities.magicResistance ? 
                     pFailSaveWithAdv(bardSaveDL, dl.dc) : pFailSave(bardSaveDL, dl.dc);
        
        // Only hits if bard within 20ft — flying bard at 30ft is safe
        const inRange = !flying;
        if (inRange) {
          const dmg = failDL * dl.avgDmg + (1 - failDL) * (dl.half ? dl.avgDmg / 2 : 0);
          const brkP = pConBreak(dmg, conSave, advCon);
          roundConcHold *= (1 - brkP * count);
          roundDmg += dmg * count;
        }
      }
    }

    concProb *= roundConcHold;
    hpLeft -= roundDmg;

    roundLog.push({
      round: r,
      flying,
      invisible,
      concCumulative: pct(concProb),
      hpRemaining: Math.round(Math.max(0, hpLeft)),
      dmgThisRound: Math.round(roundDmg * 10) / 10,
    });
  }

  // ────────────────────────────────────────────────────────────────────
  // 3. COUNTERSPELL RISK
  // ────────────────────────────────────────────────────────────────────
  let counterspellEnemies = 0;
  for (const { monster: m, count } of scenario.foes) {
    if (m.hasCounterspell) counterspellEnemies += count;
  }
  // P(opening spell gets countered) ≈ 1 if enemy has it and is within 60ft
  // Bard can counter-counterspell with Cutting Words or their own reaction
  const counterRisk = counterspellEnemies > 0 ? 0.5 : 0; // ~50% with counter-counter

  // ────────────────────────────────────────────────────────────────────
  // 4. ENEMY SPELL DISABLE RISK (Hold Person, Power Word Stun, etc.)
  // ────────────────────────────────────────────────────────────────────
  let disableRisk = 0;
  for (const { monster: m, count } of scenario.foes) {
    if (m.canCastHoldPerson) {
      // Hold Person: WIS save
      let wisSaveTotal = wisSave + allSaveBonus;
      let failHP = abilities.magicResistance ?
                   pFailSaveWithAdv(wisSaveTotal, m.holdPersonDC) :
                   pFailSave(wisSaveTotal, m.holdPersonDC);
      disableRisk += failHP * count * 0.3; // not every fanatic uses it every round
    }
  }
  disableRisk = Math.min(0.9, disableRisk);

  // ────────────────────────────────────────────────────────────────────
  // 5. COMPILE NOTES
  // ────────────────────────────────────────────────────────────────────
  const notes = [];

  if (abilities.canFly) {
    const meleeOnly = scenario.foes.filter(f => f.monster.melee && !f.monster.ranged && !f.monster.caster && !f.monster.flying);
    const meleeCount = meleeOnly.reduce((s, f) => s + f.count, 0);
    if (meleeCount > 0) notes.push(`✈ Flight negates ${meleeCount} melee-only enemies`);
  }
  if (abilities.hiddenStep) notes.push('👻 Hidden Step: invisible on T1');
  if (abilities.magicResistance) {
    const casters = scenario.foes.filter(f => f.monster.caster);
    if (casters.length > 0) notes.push('🛡 Magic Resistance: ADV on saves vs enemy spells');
  }
  if (counterRisk > 0) notes.push(`⚠ Counterspell risk: ~${Math.round(counterRisk*100)}% opening spell blocked`);

  const immuneCount = scenario.foes.reduce((s, f) => s + (f.monster.immuneCharmed ? f.count : 0), 0);
  if (immuneCount > 0) notes.push(`🚫 ${immuneCount}/${totalFoes} enemies immune to Hypnotic Pattern`);

  const advCharmCount = scenario.foes.reduce((s, f) => s + (f.monster.advVsCharm ? f.count : 0), 0);
  if (advCharmCount > 0) notes.push(`⬆ ${advCharmCount} enemies have ADV on saves vs charm`);

  // ────────────────────────────────────────────────────────────────────
  // 6. SCORE (0–100)
  // ────────────────────────────────────────────────────────────────────
  const conc3 = roundLog.length >= 3 ? roundLog[2].concCumulative / 100 : concProb;
  const hpPct = Math.max(0, hpLeft) / hp;

  const score = Math.round(
    (ccPct * 30 +                            // 30%: opening CC effectiveness
     conc3 * 30 +                            // 30%: concentration holds 3 rounds
     Math.min(1, hpPct) * 15 +              // 15%: survivability
     (1 - counterRisk) * 15 +                // 15%: not getting counterspelled
     (1 - disableRisk) * 10                  // 10%: not getting disabled
    ) * 100
  ) / 100;

  return {
    build: build.name,
    scenario: scenario.name,
    // Key stats
    AC, DC, conSave, advCon, hp,
    canFly: abilities.canFly,
    flyTurn: abilities.flyTurn,
    magicRes: abilities.magicResistance,
    hiddenStep: abilities.hiddenStep,
    // Results
    totalFoes,
    expectedCharmed: Math.round(expectedCharmed * 100) / 100,
    ccPct: pct(ccPct),
    conc3Rounds: roundLog.length >= 3 ? roundLog[2].concCumulative : pct(concProb),
    conc5Rounds: pct(concProb),
    hpAfter5: Math.round(Math.max(0, hpLeft)),
    counterRisk: pct(counterRisk),
    score,
    notes,
    roundLog,
  };
}


// ═══════════════════════════════════════════════════════════════════════════
// PARTY COMPOSITION ANALYSIS
// ═══════════════════════════════════════════════════════════════════════════

function analyzePartyNeeds(build, computed, abilities, allResults) {
  const needs = [];
  const strengths = [];
  const weaknesses = [];

  const AC = computed.finalAc;
  const conSave = computed.conSaveBonus;
  const advCon = computed.conSaveType === 'advantage' || computed.conSaveType === 'both';
  const DC = computed.spellDc;

  // ── Survivability assessment ──
  if (AC <= 14 && !abilities.canFly) {
    needs.push('Strong frontline (Fighter/Paladin) to absorb melee attacks');
    weaknesses.push(`Low AC (${AC}) without flight — easy target for melee`);
  }
  if (AC <= 14 && abilities.canFly) {
    strengths.push(`Flight compensates for AC ${AC} — melee can't reach`);
    needs.push('Ranged support to handle flying enemies');
  }
  if (AC >= 19) {
    strengths.push(`High AC (${AC}) — hard to hit even without flight`);
  }

  // ── Concentration assessment ──
  if (advCon && conSave >= 7) {
    strengths.push(`Iron concentration (ADV +${conSave}) — nearly unbreakable at DC 10`);
  } else if (advCon) {
    strengths.push(`Advantage on CON saves (+${conSave}) — reliable concentration`);
  } else if (conSave >= 5) {
    strengths.push(`Good CON save (+${conSave}) — solid concentration`);
  } else {
    weaknesses.push(`Weak CON save (+${conSave}) — concentration fragile`);
    needs.push('Healer (Cleric/Druid) to restore HP if concentration drops');
  }

  // ── Spell DC assessment ──
  if (DC >= 17) {
    strengths.push(`High spell DC (${DC}) — more enemies fail saves`);
  } else if (DC === 16) {
    // neutral
  } else {
    weaknesses.push(`Lower DC (${DC}) — harder to land key spells`);
  }

  // ── Special abilities ──
  if (abilities.magicResistance) {
    strengths.push('Magic Resistance — excellent vs caster encounters');
  }
  if (abilities.hiddenStep) {
    strengths.push('Hidden Step — 1 turn of invisibility for safe setup');
  }
  if (abilities.dragonFear) {
    strengths.push('Dragon Fear — non-concentration AoE frighten');
  }

  // ── Scenario-based needs ──
  const worstScenarios = allResults
    .filter(r => r.build === build.name)
    .sort((a, b) => a.score - b.score)
    .slice(0, 2);

  for (const worst of worstScenarios) {
    if (worst.scenario.includes('Lich') || worst.scenario.includes('Archmage')) {
      needs.push('Anti-magic support (Paladin Aura, Counterspell caster) for high-CR caster encounters');
    }
    if (worst.scenario.includes('Dragon')) {
      needs.push('Fire resistance/absorb elements support for breath weapon encounters');
    }
    if (worst.scenario.includes('Frost Giant') || worst.scenario.includes('Smash')) {
      needs.push('Tanky frontline to intercept massive melee hits');
    }
  }

  // Deduplicate
  return {
    build: build.name,
    strengths: [...new Set(strengths)],
    weaknesses: [...new Set(weaknesses)],
    partyNeeds: [...new Set(needs)],
    bestWith: suggestPartyComp(AC, DC, abilities, advCon, conSave),
  };
}

function suggestPartyComp(ac, dc, abilities, advCon, conSave) {
  if (ac >= 19 && advCon) {
    return 'Flexible — strong in almost any party. Best with a dedicated damage dealer (Rogue, Fighter) since you handle CC + durability.';
  }
  if (abilities.canFly && advCon) {
    return 'Ranged-heavy party. You fly above and CC while party damages from range. Need 1 melee to clean up.';
  }
  if (abilities.canFly && !advCon) {
    return 'Needs a healer. Flight keeps you safe from melee but AoE/ranged still threatens concentration. Healer can restore you if hit.';
  }
  if (ac >= 19 && dc >= 17) {
    return 'Best all-rounder. Pair with any balanced party. Your DC handles CC, your AC handles survival.';
  }
  if (dc >= 17 && ac <= 14) {
    return 'Glass cannon setup. NEEDS strong frontline (Paladin, Fighter, Barbarian) and possibly healer. You end fights fast IF protected.';
  }
  if (abilities.magicResistance) {
    return 'Excellent anti-mage. Pair with melee to handle physical encounters where your resistance does not apply.';
  }
  return 'Balanced party recommended: 1 frontline, 1 healer/support, 1 damage dealer.';
}


// ═══════════════════════════════════════════════════════════════════════════
// MAIN
// ═══════════════════════════════════════════════════════════════════════════

async function main() {
  await mongoose.connect(process.env.MONGODB_URI);
  console.log('Connected to MongoDB\n');

  // Load all builds (populated)
  const builds = await Build.find()
    .populate('species')
    .populate('levelChoices.feat')
    .populate('items')
    .lean({ virtuals: true });

  console.log(`Loaded ${builds.length} builds\n`);

  // Compute stats and detect abilities for each build
  const buildData = builds.map(b => ({
    build: b,
    computed: computeBuildStats(b),
    abilities: detectAbilities(b),
  }));

  // Run all evaluations
  const allResults = [];
  for (const { build, computed, abilities } of buildData) {
    for (const scenario of SCENARIOS) {
      allResults.push(evaluateBuild(build, computed, abilities, scenario));
    }
  }

  // ── OUTPUT: Per-Scenario Rankings ──────────────────────────────────────
  console.log('═'.repeat(100));
  console.log('  SCENARIO-BASED BUILD EVALUATION — Level 8 College of Lore Bard');
  console.log('  P(hit|AC) × P(fail save|damage) across real encounters');
  console.log('═'.repeat(100));

  for (const scenario of SCENARIOS) {
    const results = allResults
      .filter(r => r.scenario === scenario.name)
      .sort((a, b) => b.score - a.score);

    console.log(`\n${'─'.repeat(100)}`);
    console.log(`  ${scenario.name}`);
    console.log(`  ${scenario.desc}`);
    console.log(`  ${scenario.notes}`);
    console.log(`${'─'.repeat(100)}`);
    console.log(
      'Rank'.padEnd(5) +
      'Build'.padEnd(40) +
      'Score'.padEnd(7) +
      'CC%'.padEnd(7) +
      'Conc3R'.padEnd(8) +
      'Conc5R'.padEnd(8) +
      'HP'.padEnd(6) +
      'AC'.padEnd(5) +
      'DC'.padEnd(5) +
      'Fly'.padEnd(5) +
      'Notes'
    );

    results.forEach((r, i) => {
      const flyIcon = r.canFly ? (r.flyTurn === 0 ? '✈P' : r.flyTurn === 1 ? '✈I' : '✈L') : '  ';
      const notesStr = r.notes.slice(0, 2).join(' | ');

      console.log(
        `#${i + 1}`.padEnd(5) +
        r.build.padEnd(40) +
        `${r.score}`.padEnd(7) +
        `${r.ccPct}%`.padEnd(7) +
        `${r.conc3Rounds}%`.padEnd(8) +
        `${r.conc5Rounds}%`.padEnd(8) +
        `${r.hpAfter5}`.padEnd(6) +
        `${r.AC}`.padEnd(5) +
        `${r.DC}`.padEnd(5) +
        flyIcon.padEnd(5) +
        notesStr
      );
    });

    // Top 3 insight
    console.log(`\n  🏆 Best: ${results[0].build} (${results[0].score})`);
    if (results.length > 1) {
      console.log(`  🥈 2nd:  ${results[1].build} (${results[1].score})`);
    }
    console.log(`  💀 Worst: ${results[results.length - 1].build} (${results[results.length - 1].score})`);
  }

  // ── OUTPUT: Per-Build Summary ──────────────────────────────────────────
  console.log(`\n\n${'═'.repeat(100)}`);
  console.log('  PER-BUILD SUMMARY — Average Score Across All 8 Scenarios');
  console.log('═'.repeat(100));

  const buildSummaries = buildData.map(({ build, computed, abilities }) => {
    const results = allResults.filter(r => r.build === build.name);
    const avgScore = Math.round(results.reduce((s, r) => s + r.score, 0) / results.length * 100) / 100;
    const bestScenario = results.sort((a, b) => b.score - a.score)[0];
    const worstScenario = results.sort((a, b) => a.score - b.score)[0];

    return {
      name: build.name,
      avgScore,
      bestScenario: bestScenario.scenario,
      bestScore: bestScenario.score,
      worstScenario: worstScenario.scenario,
      worstScore: worstScenario.score,
      ac: computed.finalAc,
      dc: computed.spellDc,
      conSave: computed.conSaveBonus,
      advCon: computed.conSaveType === 'advantage' || computed.conSaveType === 'both',
      fly: abilities.canFly,
      magRes: abilities.magicResistance,
    };
  }).sort((a, b) => b.avgScore - a.avgScore);

  console.log(
    'Rank'.padEnd(5) +
    'Build'.padEnd(40) +
    'Avg'.padEnd(7) +
    'Best'.padEnd(22) +
    'Worst'.padEnd(22) +
    'AC'.padEnd(5) +
    'DC'.padEnd(5) +
    'CON'.padEnd(6) +
    'Special'
  );

  buildSummaries.forEach((s, i) => {
    const specials = [];
    if (s.fly) specials.push('Fly');
    if (s.magRes) specials.push('MagRes');
    if (s.advCon) specials.push('AdvCON');

    console.log(
      `#${i + 1}`.padEnd(5) +
      s.name.padEnd(40) +
      `${s.avgScore}`.padEnd(7) +
      `${s.bestScenario.replace(/[^\w\s]/g, '').trim().substring(0, 18)} ${s.bestScore}`.padEnd(22) +
      `${s.worstScenario.replace(/[^\w\s]/g, '').trim().substring(0, 18)} ${s.worstScore}`.padEnd(22) +
      `${s.ac}`.padEnd(5) +
      `${s.dc}`.padEnd(5) +
      `+${s.conSave}`.padEnd(6) +
      specials.join(', ')
    );
  });

  // ── OUTPUT: Party Composition ──────────────────────────────────────────
  console.log(`\n\n${'═'.repeat(100)}`);
  console.log('  PARTY COMPOSITION ANALYSIS');
  console.log('═'.repeat(100));

  for (const { build, computed, abilities } of buildData) {
    const analysis = analyzePartyNeeds(build, computed, abilities, allResults);
    console.log(`\n  📋 ${analysis.build}`);
    if (analysis.strengths.length) console.log(`     ✅ ${analysis.strengths.join(' | ')}`);
    if (analysis.weaknesses.length) console.log(`     ❌ ${analysis.weaknesses.join(' | ')}`);
    if (analysis.partyNeeds.length) console.log(`     🎯 ${analysis.partyNeeds.join(' | ')}`);
    console.log(`     🤝 ${analysis.bestWith}`);
  }

  // ── OUTPUT: The Iron Concentration Question ────────────────────────────
  console.log(`\n\n${'═'.repeat(100)}`);
  console.log('  THE IRON CONCENTRATION QUESTION');
  console.log('  AC 13 + 99.8% save  vs  AC 19-20 + 91% save');
  console.log('  Which one actually holds concentration better in real combat?');
  console.log('═'.repeat(100));

  // Find the iron concentration builds and their armored counterparts
  const ironBuilds = buildData.filter(b => b.build.name.includes('Iron Concentration') || b.build.name.includes('Flying Fortress'));
  const armoredBuilds = buildData.filter(b => 
    (b.build.name.includes('Standard Tank') || b.build.name.includes('Unkillable Wall') || 
     b.build.name.includes('Double CC') || b.build.name.includes('Full Package'))
  );

  if (ironBuilds.length > 0 && armoredBuilds.length > 0) {
    for (const scenario of SCENARIOS) {
      const ironResults = allResults.filter(r => 
        (r.build.includes('Iron Concentration') || r.build.includes('Flying Fortress')) && 
        r.scenario === scenario.name
      ).sort((a, b) => b.conc3Rounds - a.conc3Rounds);

      const armoredResults = allResults.filter(r =>
        (r.build.includes('Standard Tank') || r.build.includes('Unkillable Wall') || 
         r.build.includes('Double CC') || r.build.includes('Full Package')) &&
        r.scenario === scenario.name
      ).sort((a, b) => b.conc3Rounds - a.conc3Rounds);

      if (ironResults.length > 0 && armoredResults.length > 0) {
        const iron = ironResults[0];
        const armored = armoredResults[0];
        const winner = iron.conc3Rounds > armored.conc3Rounds ? 'IRON' : 
                       armored.conc3Rounds > iron.conc3Rounds ? 'ARMORED' : 'TIE';
        const diff = Math.abs(iron.conc3Rounds - armored.conc3Rounds);

        console.log(`\n  ${scenario.name}`);
        console.log(`    Iron:    ${iron.build.padEnd(35)} AC ${iron.AC}, Conc 3R: ${iron.conc3Rounds}%, 5R: ${iron.conc5Rounds}%, HP: ${iron.hpAfter5}`);
        console.log(`    Armored: ${armored.build.padEnd(35)} AC ${armored.AC}, Conc 3R: ${armored.conc3Rounds}%, 5R: ${armored.conc5Rounds}%, HP: ${armored.hpAfter5}`);
        console.log(`    Winner: ${winner} (${diff.toFixed(1)}% difference)`);
      }
    }
  }

  console.log('\n\nDone. Evaluation complete.');
  await mongoose.disconnect();
}

main().catch(err => {
  console.error('Error:', err);
  process.exit(1);
});
