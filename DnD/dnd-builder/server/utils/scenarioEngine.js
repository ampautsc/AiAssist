/**
 * Scenario-Based Build Evaluation Engine
 * 
 * Evaluates Lore Bard builds against combat encounter types.
 * Extracted from evaluate-scenarios.js to be importable by API routes.
 *
 * Key insight: Raw stat comparison is misleading. AC 20 with 91% concentration save
 * may be WORSE than AC 13 with 99.8% save — depending on who's attacking.
 *
 * Current: Computes P(hit|AC) × P(fail save|damage) with expected values.
 * Future: Will be replaced by turn-by-turn simulator (combatSimulator.js) which
 * models full action economy, spell choices, reactions, and dynamic strategy.
 * This file kept for reference and backwards compatibility during migration.
 */

const { computeBuildStats } = require('./buildCalculator');

// ═══════════════════════════════════════════════════════════════════════════
// MATH ENGINE
// ═══════════════════════════════════════════════════════════════════════════

function clamp(v, lo, hi) { return Math.min(hi, Math.max(lo, v)); }
function pct(v) { return Math.round(v * 1000) / 10; }

/** P(attack roll hits) given attacker bonus and target AC */
function pHit(atkBonus, targetAC) {
  const needed = targetAC - atkBonus;
  if (needed <= 1) return 0.95;
  if (needed >= 20) return 0.05;
  return (21 - needed) / 20;
}

/** P(attack roll hits) with disadvantage */
function pHitWithDisadvantage(atkBonus, targetAC) {
  const h = pHit(atkBonus, targetAC);
  return h * h;
}

/** P(failing a saving throw). 5e 2014: NO auto-fail on nat 1 */
function pFailSave(saveBonus, dc) {
  const needed = dc - saveBonus;
  if (needed <= 1) return 0;
  if (needed > 20) return 1;
  return (needed - 1) / 20;
}

/** P(fail with advantage on save) = must fail BOTH rolls */
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
    immuneCharmed: false, advVsCharm: true,
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
    immuneCharmed: false, melee: true, ranged: true, caster: false,
    attacks: [
      { name: 'Greatclub', bonus: 6, avgDmg: 13 },
      { name: 'Javelin', bonus: 6, avgDmg: 11 },
    ],
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
    disruptLife: { dc: 18, avgDmg: 21, half: true },
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
    foes: [{ monster: M.werewolf, count: 4 }],
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
    foes: [{ monster: M.youngRedDragon, count: 1 }],
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
    foes: [{ monster: M.lich, count: 1 }],
    rounds: 5,
    notes: 'Immune to charmed = HP USELESS. 3× Legendary Resistance. Counterspell. Tests pure survivability. DC 20 spells.',
  },
  {
    id: 'archmage-duel',
    name: '🧙 Archmage Duel',
    desc: 'Archmage with Magic Resistance, Counterspell, AoE damage',
    foes: [{ monster: M.archmage, count: 1 }],
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
    hiddenStep: false,
    feyStep: false,
    magicResistance: false,
    shellDefense: false,
    isFey: sp.creatureType === 'Fey',
    poisonImmune: (sp.conditionImmunities || []).includes('poisoned'),
    dragonBreath: false,
    dragonFear: false,
    charmDisadvantage: false,
    pearlOfPower: false,
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
    if (item.imposesCharmDisadvantage) a.charmDisadvantage = true;
    if ((item.name || '').toLowerCase().includes('pearl of power')) a.pearlOfPower = true;
  }

  for (const feat of feats) {
    if ((feat.name || '').toLowerCase().includes('dragon fear')) a.dragonFear = true;
  }

  if (a.limitedFlight) a.permanentFlight = false;
  a.canFly = a.permanentFlight || a.limitedFlight || a.itemFlight;
  a.flyTurn = (a.permanentFlight || a.itemFlight) ? 0 :
              (a.limitedFlight ? 2 : 99);
  a.flyType = a.permanentFlight ? 'permanent' :
             a.itemFlight ? 'item' :
             a.limitedFlight ? 'limited' : null;

  return a;
}

/** Bard HP: Level 8, d8 hit die. 8 + CON at L1, avg 5 + CON per level after */
function bardHP(conMod) {
  return 8 + conMod + 7 * (5 + conMod);
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
  const dexSave = computed.dexMod;
  const chaSave = computed.chaMod + 3;
  const wisSave = Math.floor((computed.finalStats.wis - 10) / 2);

  let allSaveBonus = 0;
  for (const item of (build.items || [])) {
    if (item.saveBonus) allSaveBonus += item.saveBonus;
  }

  // 1. OPENING SPELL: How many enemies does Hypnotic Pattern remove?
  let totalFoes = 0;
  let expectedCharmed = 0;
  const survivingFoes = [];

  for (const { monster: m, count } of scenario.foes) {
    for (let i = 0; i < count; i++) {
      totalFoes++;
      let failRate;
      if (m.immuneCharmed) {
        failRate = 0;
      } else if (m.advVsCharm || m.magicResistance) {
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

  // 2. ROUND-BY-ROUND CONCENTRATION + SURVIVAL
  const TARGET_RATE = 0.33;
  let concProb = 1.0;
  let hpLeft = hp;
  const roundLog = [];

  for (let r = 1; r <= scenario.rounds; r++) {
    let roundConcHold = 1.0;
    let roundDmg = 0;

    const flying = r > abilities.flyTurn;
    const invisible = abilities.hiddenStep && r === 1;

    // Weapon attacks from surviving foes
    for (const { monster: m, weight } of survivingFoes) {
      if (m.breath && r === (m.breath.round || 1)) continue;
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

    // Breath weapons
    for (const { monster: m, count } of scenario.foes) {
      if (m.breath && r === (m.breath.round || 1)) {
        if (invisible) continue;
        const bw = m.breath;
        const bardSave = dexSave + allSaveBonus;
        const failBWSave = pFailSave(bardSave, bw.dc);

        const fullDmg = bw.avgDmg;
        const halfDmg = bw.half ? Math.floor(bw.avgDmg / 2) : 0;
        const breakIfFull = pConBreak(fullDmg, conSave, advCon);
        const breakIfHalf = bw.half ? pConBreak(halfDmg, conSave, advCon) : 0;
        const bwBreak = failBWSave * breakIfFull + (1 - failBWSave) * breakIfHalf;

        const avgDmgTaken = failBWSave * fullDmg + (1 - failBWSave) * halfDmg;
        roundConcHold *= (1 - bwBreak * count);
        roundDmg += avgDmgTaken * count;
        continue;
      }
    }

    // AoE spells from caster enemies
    for (const { monster: m, count } of scenario.foes) {
      if (m.aoe && r <= 2) {
        if (invisible) continue;
        const aoe = m.aoe;
        let bardSaveVsAoE = (aoe.stat === 'DEX' ? dexSave :
                             aoe.stat === 'CON' ? conSave : wisSave) + allSaveBonus;

        let failAoE;
        if (abilities.magicResistance) {
          failAoE = pFailSaveWithAdv(bardSaveVsAoE, aoe.dc);
        } else {
          failAoE = pFailSave(bardSaveVsAoE, aoe.dc);
        }

        const fullDmg = aoe.avgDmg;
        const halfDmg = aoe.half ? Math.floor(aoe.avgDmg / 2) : 0;
        const breakFull = pConBreak(fullDmg, conSave, advCon);
        const breakHalf = aoe.half ? pConBreak(halfDmg, conSave, advCon) : 0;
        const brkP = failAoE * breakFull + (1 - failAoE) * breakHalf;
        const avgDmg = failAoE * fullDmg + (1 - failAoE) * halfDmg;

        const aoeTargetRate = 0.5;
        roundConcHold *= (1 - brkP * count * aoeTargetRate);
        roundDmg += avgDmg * count * aoeTargetRate;
      }
    }

    // Lich Disrupt Life
    for (const { monster: m, count } of scenario.foes) {
      if (m.disruptLife && r >= 2) {
        if (invisible) continue;
        const dl = m.disruptLife;
        let bardSaveDL = conSave + allSaveBonus;
        let failDL = abilities.magicResistance ?
                     pFailSaveWithAdv(bardSaveDL, dl.dc) : pFailSave(bardSaveDL, dl.dc);

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

  // 3. COUNTERSPELL RISK
  let counterspellEnemies = 0;
  for (const { monster: m, count } of scenario.foes) {
    if (m.hasCounterspell) counterspellEnemies += count;
  }
  const counterRisk = counterspellEnemies > 0 ? 0.5 : 0;

  // 4. ENEMY SPELL DISABLE RISK
  let disableRisk = 0;
  for (const { monster: m, count } of scenario.foes) {
    if (m.canCastHoldPerson) {
      let wisSaveTotal = wisSave + allSaveBonus;
      let failHP = abilities.magicResistance ?
                   pFailSaveWithAdv(wisSaveTotal, m.holdPersonDC) :
                   pFailSave(wisSaveTotal, m.holdPersonDC);
      disableRisk += failHP * count * 0.3;
    }
  }
  disableRisk = Math.min(0.9, disableRisk);

  // 5. NOTES
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
  if (counterRisk > 0) notes.push(`⚠ Counterspell risk: ~${Math.round(counterRisk * 100)}% opening spell blocked`);

  const immuneCount = scenario.foes.reduce((s, f) => s + (f.monster.immuneCharmed ? f.count : 0), 0);
  if (immuneCount > 0) notes.push(`🚫 ${immuneCount}/${totalFoes} enemies immune to Hypnotic Pattern`);

  const advCharmCount = scenario.foes.reduce((s, f) => s + (f.monster.advVsCharm ? f.count : 0), 0);
  if (advCharmCount > 0) notes.push(`⬆ ${advCharmCount} enemies have ADV on saves vs charm`);

  // 6. SCORE (0–100)
  const conc3 = roundLog.length >= 3 ? roundLog[2].concCumulative / 100 : concProb;
  const hpPct = Math.max(0, hpLeft) / hp;

  const score = Math.round(
    (ccPct * 30 +
     conc3 * 30 +
     Math.min(1, hpPct) * 15 +
     (1 - counterRisk) * 15 +
     (1 - disableRisk) * 10
    ) * 100
  ) / 100;

  return {
    buildId: build._id,
    build: build.name,
    scenarioId: scenario.id,
    scenario: scenario.name,
    AC, DC, conSave, advCon, hp,
    canFly: abilities.canFly,
    flyTurn: abilities.flyTurn,
    flyType: abilities.flyType,
    magicRes: abilities.magicResistance,
    hiddenStep: abilities.hiddenStep,
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

function analyzePartyNeeds(build, computed, abilities, allResults) {
  const needs = [];
  const strengths = [];
  const weaknesses = [];

  const AC = computed.finalAc;
  const conSave = computed.conSaveBonus;
  const advCon = computed.conSaveType === 'advantage' || computed.conSaveType === 'both';
  const DC = computed.spellDc;

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

  if (DC >= 17) {
    strengths.push(`High spell DC (${DC}) — more enemies fail saves`);
  } else if (DC < 16) {
    weaknesses.push(`Lower DC (${DC}) — harder to land key spells`);
  }

  if (abilities.magicResistance) {
    strengths.push('Magic Resistance — excellent vs caster encounters');
  }
  if (abilities.hiddenStep) {
    strengths.push('Hidden Step — 1 turn of invisibility for safe setup');
  }
  if (abilities.dragonFear) {
    strengths.push('Dragon Fear — non-concentration AoE frighten');
  }

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

  return {
    buildId: build._id,
    build: build.name,
    strengths: [...new Set(strengths)],
    weaknesses: [...new Set(weaknesses)],
    partyNeeds: [...new Set(needs)],
    bestWith: suggestPartyComp(AC, DC, abilities, advCon, conSave),
  };
}


// ═══════════════════════════════════════════════════════════════════════════
// COMBAT ENGINE EVALUATION (Turn-by-Turn via modular combat engine)
// ═══════════════════════════════════════════════════════════════════════════

/**
 * Run turn-by-turn combat simulations using the modular combat engine.
 * 
 * Uses the combat engine modules (creatures, tactics, encounterRunner, etc.)
 * instead of the old combatSimulator. Produces result entries compatible with
 * compileEvaluationResults().
 * 
 * @param {Object[]} builds — populated build documents
 * @param {Object} options — { simulations: number }
 * @returns {Object[]} allResults — compatible with compileEvaluationResults()
 */
function runCombatEngineEvaluation(builds, options = {}) {
  const { simulateScenario, SCENARIOS: ENGINE_SCENARIOS } = require('../combat/scenarioHarness');
  const { dice } = require('../combat');
  const fs = require('fs');
  const path = require('path');
  const numRuns = options.simulations || 10;

  console.log(`[COMBAT ENGINE] Starting: ${builds.length} builds × ${ENGINE_SCENARIOS.length} scenarios × ${numRuns} sims`);

  // Use random dice for real simulation
  dice.setDiceMode('random');

  // Prepare combat-logs directory
  const logDir = path.resolve(__dirname, '../../combat-logs');
  if (!fs.existsSync(logDir)) fs.mkdirSync(logDir, { recursive: true });

  const allResults = [];
  let completed = 0;
  const total = builds.length * ENGINE_SCENARIOS.length;

  for (const build of builds) {
    const computed = computeBuildStats(build);
    const abilities = detectAbilities(build);

    for (const scenario of ENGINE_SCENARIOS) {
      const simResult = simulateScenario(build, scenario, {
        numRuns,
        logRuns: 3,
        verbose: false,
      });

      completed++;
      if (completed % 50 === 0 || completed === total) {
        console.log(`[COMBAT ENGINE] Progress: ${completed}/${total} (${Math.round(completed / total * 100)}%)`);
      }

      // Write combat logs to disk (first N runs that have logs)
      const sampleLogs = simResult.runs
        .filter(r => r.log && r.log.length > 0)
        .map((r, idx) => ({
          runIndex: idx,
          winner: r.winner,
          rounds: r.rounds,
          bardHpPct: r.bardHpPct,
          log: r.log,
          analytics: r.analytics,
          positionSnapshots: r.positionSnapshots || [],
        }));

      if (sampleLogs.length > 0) {
        const logFile = path.join(logDir, `${build._id}_${scenario.id}.json`);
        fs.writeFileSync(logFile, JSON.stringify({
          buildId: String(build._id),
          buildName: build.name,
          scenarioId: scenario.id,
          scenarioName: scenario.name,
          numRuns,
          winRate: simResult.winRate,
          avgRounds: simResult.avgRounds,
          sampleLogs,
        }, null, 0)); // compact JSON (no indentation) to save space
      }

      // Strip logs and snapshots from runs before passing to result compilation (save memory)
      for (const run of simResult.runs) {
        delete run.log;
        delete run.positionSnapshots;
      }

      // Map new engine results to legacy dashboard format
      const winRate = simResult.winRate;
      const avgRounds = simResult.avgRounds;
      const avgHPPct = simResult.avgBardHpPct * 100;
      const avgFinalHP = Math.round(simResult.avgBardHpPct * bardHP(computed.conMod));
      const victories = simResult.runs.filter(r => r.winner === 'party').length;
      const defeats = simResult.runs.filter(r => r.winner === 'enemy').length;
      const stalemates = simResult.runs.filter(r => r.winner === 'draw').length;

      // Score: win rate is primary, efficiency secondary
      const baseScore = (victories * 100 + stalemates * 50) / numRuns;
      const efficiencyBonus = Math.min(20,
        (10 - avgRounds) * 1.5 +
        (avgHPPct / 100) * 10
      );
      const score = Math.max(0, Math.min(100, baseScore + efficiencyBonus));

      // Get best simulation for notes
      const bestRun = simResult.runs.find(r => r.winner === 'party') || simResult.runs[0];

      allResults.push({
        buildId: build._id,
        build: build.name,
        scenarioId: scenario.id,
        scenario: scenario.name,
        // Stats
        AC: computed.finalAc,
        DC: computed.spellDc,
        conSave: computed.conSaveBonus,
        advCon: computed.conSaveType === 'advantage' || computed.conSaveType === 'both',
        hp: bardHP(computed.conMod),
        canFly: abilities.canFly,
        flyTurn: abilities.flyTurn,
        flyType: abilities.flyType,
        magicRes: abilities.magicResistance,
        hiddenStep: abilities.hiddenStep,
        totalFoes: scenario.foes.reduce((sum, f) => sum + f.count, 0),
        // Simulation results
        simulations: numRuns,
        winRate: pct(winRate),
        victories,
        defeats,
        stalemates,
        avgRounds,
        avgFinalHP,
        avgHPPct: Math.round(avgHPPct),
        score: Math.round(score * 100) / 100,
        // Legacy fields for dashboard compatibility
        ccPct: winRate > 0.5 ? 70 : 40,
        conc3Rounds: avgHPPct > 50 ? 85 : 60,
        conc5Rounds: avgHPPct > 30 ? 75 : 45,
        hpAfter5: avgFinalHP,
        counterRisk: 0,
        // Empty roundLog (old per-round format) — replaced by combatSummary
        roundLog: [],
        // New: per-combatant analytics from best run
        combatSummary: bestRun.analytics || [],
        notes: [
          `${victories}W/${defeats}L/${stalemates}S in ${numRuns} sims`,
          `Win rate: ${Math.round(winRate * 100)}%`,
          `Avg ${avgRounds.toFixed(1)} rounds`,
        ],
      });
    }
  }

  return allResults;
}


// ═══════════════════════════════════════════════════════════════════════════
// SIMULATION-BASED EVALUATION (Monte Carlo — OLD simulator)
// ═══════════════════════════════════════════════════════════════════════════

/**
 * Run simulated encounters and aggregate results
 * Uses Monte Carlo sampling: run N simulations per build/scenario, aggregate stats
 */
function runSimulatedEvaluation(builds, options = {}) {
  const { simulateEncounter } = require('./combatSimulator');
  const simulations = options.simulations || 3; // Run N sims per build/scenario (reduced for speed)
  
  console.log(`[SIMULATION] Starting evaluation: ${builds.length} builds × ${SCENARIOS.length} scenarios × ${simulations} simulations = ${builds.length * SCENARIOS.length * simulations} encounters`);
  
  const buildData = builds.map(b => ({
    build: b,
    computed: computeBuildStats(b),
    abilities: detectAbilities(b),
  }));

  const allResults = [];
  let completed = 0;
  const total = builds.length * SCENARIOS.length;
  
  for (const { build, computed, abilities } of buildData) {
    for (const scenario of SCENARIOS) {
      // Run multiple simulations with different RNG seeds
      const simResults = [];
      for (let i = 0; i < simulations; i++) {
        try {
          const seed = (build._id.toString().charCodeAt(0) + scenario.id.charCodeAt(0)) * 1000 + i;
          const result = simulateEncounter(build, computed, abilities, scenario, { seed, maxRounds: 20 });
          simResults.push(result);
        } catch (err) {
          console.error(`[SIMULATION ERROR] Build ${build.name} vs ${scenario.name} sim ${i}: ${err.message}`);
          // Push a defeat result so we don't break aggregation
          simResults.push({ result: 'defeat', rounds: 0, finalHP: 0, hpPct: 0, slotsUsed: {1:0,2:0,3:0,4:0}, enemiesKilled: 0, log: [], keyMoments: [] });
        }
      }
      
      completed++;
      if (completed % 10 === 0 || completed === total) {
        console.log(`[SIMULATION] Progress: ${completed}/${total} (${Math.round(completed/total*100)}%)`);
      }
      
      // Aggregate results
      const victories = simResults.filter(r => r.result === 'victory').length;
      const defeats = simResults.filter(r => r.result === 'defeat').length;
      const stalemates = simResults.filter(r => r.result === 'stalemate').length;
      const winRate = victories / simulations;
      
      const avgRounds = simResults.reduce((sum, r) => sum + r.rounds, 0) / simulations;
      const avgFinalHP = simResults.reduce((sum, r) => sum + r.finalHP, 0) / simulations;
      const avgHPPct = simResults.reduce((sum, r) => sum + r.hpPct, 0) / simulations;
      
      const avgSlotsUsed = {
        1: simResults.reduce((sum, r) => sum + r.slotsUsed[1], 0) / simulations,
        2: simResults.reduce((sum, r) => sum + r.slotsUsed[2], 0) / simulations,
        3: simResults.reduce((sum, r) => sum + r.slotsUsed[3], 0) / simulations,
        4: simResults.reduce((sum, r) => sum + r.slotsUsed[4], 0) / simulations,
      };
      
      // Score: Primarily win rate, secondarily efficiency
      // Win = 100 pts, Stalemate = 50 pts (survived but didn't win), Defeat = 0 pts
      // Bonus for efficiency: fewer rounds, more HP remaining, fewer slots used
      const baseScore = (victories * 100 + stalemates * 50) / simulations;
      const efficiencyBonus = Math.min(20, 
        (10 - avgRounds) * 1.5 + // Faster wins = better
        (avgHPPct / 100) * 10 + // More HP remaining = better
        (16 - (avgSlotsUsed[1] + avgSlotsUsed[2] + avgSlotsUsed[3] + avgSlotsUsed[4])) * 0.5 // Fewer slots = better
      );
      const score = Math.max(0, Math.min(100, baseScore + efficiencyBonus));
      
      // Get one representative simulation for detailed log
      const bestSim = simResults.find(r => r.result === 'victory') || simResults[0];
      
      allResults.push({
        buildId: build._id,
        build: build.name,
        scenarioId: scenario.id,
        scenario: scenario.name,
        // Stats
        AC: computed.finalAc,
        DC: computed.spellDc,
        conSave: computed.conSaveBonus,
        advCon: computed.conSaveType === 'advantage' || computed.conSaveType === 'both',
        hp: bardHP(computed.conMod),
        canFly: abilities.canFly,
        flyTurn: abilities.flyTurn,
        flyType: abilities.flyType,
        magicRes: abilities.magicResistance,
        hiddenStep: abilities.hiddenStep,
        totalFoes: scenario.foes.reduce((sum, f) => sum + f.count, 0),
        // Simulation results
        simulations,
        winRate: pct(winRate),
        victories,
        defeats,
        stalemates,
        avgRounds: Math.round(avgRounds * 10) / 10,
        avgFinalHP: Math.round(avgFinalHP),
        avgHPPct: Math.round(avgHPPct),
        avgSlotsUsed,
        score: Math.round(score * 100) / 100,
        // Legacy fields for dashboard compatibility (derived from simulation)
        ccPct: winRate > 0.5 ? 70 : 40, // Approximation: high win rate = good CC
        conc3Rounds: avgHPPct > 50 ? 85 : 60, // Approximation
        conc5Rounds: avgHPPct > 30 ? 75 : 45, // Approximation  
        hpAfter5: Math.round(avgFinalHP),
        counterRisk: 0,
        notes: [
          `${victories}W/${defeats}L/${stalemates}S in ${simulations} sims`,
          `Win rate: ${Math.round(winRate * 100)}%`,
          `Avg ${avgRounds.toFixed(1)} rounds`,
          bestSim.keyMoments[0] || 'N/A',
        ],
        roundLog: bestSim.log.slice(0, 30).map((line, i) => ({
          round: Math.floor(i / 3) + 1,
          text: line,
        })),
        simulationDetails: {
          bestSimLog: bestSim.log,
          bestSimKeyMoments: bestSim.keyMoments,
        },
      });
    }
  }
  
  return allResults;
}


// ═══════════════════════════════════════════════════════════════════════════
// FULL EVALUATION (used by API endpoint)
// ═══════════════════════════════════════════════════════════════════════════

function runFullEvaluation(builds, options = {}) {
  const useCombatEngine = options.useCombatEngine !== false; // Default to new combat engine
  const useSimulation = options.useSimulation === true;      // Old simulator (explicit opt-in)
  
  if (useCombatEngine && !useSimulation) {
    // NEW: Full turn-by-turn combat engine (modular, tested)
    const allResults = runCombatEngineEvaluation(builds, options);
    return compileEvaluationResults(allResults, builds);
  }
  
  if (useSimulation) {
    // OLD: Previous Monte Carlo simulator
    const allResults = runSimulatedEvaluation(builds, options);
    return compileEvaluationResults(allResults, builds);
  }
  
  // Legacy math-based evaluation (kept for comparison)
  const buildData = builds.map(b => ({
    build: b,
    computed: computeBuildStats(b),
    abilities: detectAbilities(b),
  }));

  const allResults = [];
  for (const { build, computed, abilities } of buildData) {
    for (const scenario of SCENARIOS) {
      allResults.push(evaluateBuild(build, computed, abilities, scenario));
    }
  }
  
  return compileEvaluationResults(allResults, builds);
}

function compileEvaluationResults(allResults, builds) {
  const buildData = builds.map(b => ({
    build: b,
    computed: computeBuildStats(b),
    abilities: detectAbilities(b),
  }));

  // Per-scenario rankings
  const scenarioResults = SCENARIOS.map(scenario => {
    const results = allResults
      .filter(r => r.scenarioId === scenario.id)
      .sort((a, b) => b.score - a.score);
    return {
      id: scenario.id,
      name: scenario.name,
      desc: scenario.desc,
      notes: scenario.notes,
      rounds: scenario.rounds,
      foesSummary: scenario.foes.map(f => {
        const name = f.monster?.name || f.template || 'unknown';
        return `${f.count}× ${name}`;
      }).join(', '),
      rankings: results,
    };
  });

  // Per-build summaries
  const buildSummaries = buildData.map(({ build, computed, abilities }) => {
    const results = allResults.filter(r => r.build === build.name);
    const avgScore = Math.round(results.reduce((s, r) => s + r.score, 0) / results.length * 100) / 100;
    const sorted = [...results].sort((a, b) => b.score - a.score);
    const best = sorted[0];
    const worst = sorted[sorted.length - 1];

    return {
      buildId: build._id,
      name: build.name,
      species: build.species?.name || 'Unknown',
      archetype: build.archetype,
      avgScore,
      best: { scenario: best.scenario, scenarioId: best.scenarioId, score: best.score },
      worst: { scenario: worst.scenario, scenarioId: worst.scenarioId, score: worst.score },
      ac: computed.finalAc,
      dc: computed.spellDc,
      conSave: computed.conSaveBonus,
      advCon: computed.conSaveType === 'advantage' || computed.conSaveType === 'both',
      concentrationHoldPct: computed.concentrationHoldPct,
      canFly: abilities.canFly,
      flyTurn: abilities.flyTurn,
      flyType: abilities.flyType,
      magicRes: abilities.magicResistance,
      hiddenStep: abilities.hiddenStep,
      dragonFear: abilities.dragonFear,
    };
  }).sort((a, b) => b.avgScore - a.avgScore);

  // Iron Concentration comparison
  const ironComparison = SCENARIOS.map(scenario => {
    const ironResults = allResults.filter(r =>
      r.build.includes('Iron Concentration') &&
      r.scenarioId === scenario.id
    ).sort((a, b) => b.conc3Rounds - a.conc3Rounds);

    const armoredResults = allResults.filter(r =>
      r.build.includes('Armored Tank') &&
      r.scenarioId === scenario.id
    ).sort((a, b) => b.conc3Rounds - a.conc3Rounds);

    if (ironResults.length > 0 && armoredResults.length > 0) {
      const iron = ironResults[0];
      const armored = armoredResults[0];
      const winner = iron.conc3Rounds > armored.conc3Rounds ? 'IRON' :
                     armored.conc3Rounds > iron.conc3Rounds ? 'ARMORED' : 'TIE';
      return {
        scenarioId: scenario.id,
        scenario: scenario.name,
        iron: { build: iron.build, ac: iron.AC, conc3: iron.conc3Rounds, conc5: iron.conc5Rounds, hp: iron.hpAfter5 },
        armored: { build: armored.build, ac: armored.AC, conc3: armored.conc3Rounds, conc5: armored.conc5Rounds, hp: armored.hpAfter5 },
        winner,
        diff: Math.abs(iron.conc3Rounds - armored.conc3Rounds).toFixed(1),
      };
    }
    return null;
  }).filter(Boolean);

  // Party composition analysis
  const partyAnalysis = buildData.map(({ build, computed, abilities }) => {
    return analyzePartyNeeds(build, computed, abilities, allResults);
  });

  return {
    scenarioResults,
    buildSummaries,
    ironComparison,
    partyAnalysis,
    scenarios: SCENARIOS.map(s => ({ id: s.id, name: s.name, desc: s.desc, notes: s.notes })),
  };
}


module.exports = {
  // Math
  pHit, pHitWithDisadvantage, pFailSave, pFailSaveWithAdv, conSaveDC, pConBreak, pct, clamp,
  // Data
  MONSTERS: M,
  SCENARIOS,
  // Engine
  detectAbilities,
  bardHP,
  evaluateBuild,
  analyzePartyNeeds,
  suggestPartyComp,
  runFullEvaluation,
  runCombatEngineEvaluation,
};
