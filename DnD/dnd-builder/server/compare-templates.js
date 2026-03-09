/**
 * Compare "Iron Concentration" template vs existing "Armored Tank" template
 * Shows the actual tradeoff for each species
 */
require('dotenv').config({ path: require('path').join(__dirname, '..', '.env') });
const mongoose = require('mongoose');
const Species = require('./models/Species');
const Feat = require('./models/Feat');
const Item = require('./models/Item');
const { computeBuildStats } = require('./utils/buildCalculator');

async function compare() {
  await mongoose.connect(process.env.MONGODB_URI || 'mongodb://localhost:27017/dnd-builder');
  
  const warCaster = await Feat.findOne({ name: 'War Caster' });
  const resilientCon = await Feat.findOne({ name: 'Resilient (CON)' });
  const modArmor = await Feat.findOne({ name: 'Moderately Armored' });
  const cloak = await Item.findOne({ name: 'Cloak of Protection' });
  const luckstone = await Item.findOne({ name: 'Stone of Good Luck (Luckstone)' });
  const cliLyre = await Item.findOne({ name: 'Instrument of the Bards (Cli Lyre)' });

  // Species that are most interesting for this comparison
  const targetSpecies = [
    'Gem Dragonborn', 'Satyr', 'Yuan-Ti', 'Firbolg', 'Eladrin', 
    'Tortle', 'Fairy', 'Deep Gnome', 'Githzerai', 'Tiefling',
    'Aasimar', 'Hexblood', 'Owlin'
  ];

  console.log('\n╔══════════════════════════════════════════════════════════════════════════════════════════╗');
  console.log('║  IRON CONCENTRATION vs ARMORED TANK — Side-by-Side Comparison                          ║');
  console.log('║  Iron Conc: Resilient(CON) + War Caster + Cloak + Luckstone                            ║');
  console.log('║  Armored:   Mod Armored + War Caster + Cli Lyre + Cloak                                ║');
  console.log('╚══════════════════════════════════════════════════════════════════════════════════════════╝\n');

  const B = { str: 8, dex: 14, con: 14, int: 8, wis: 12, cha: 16 };
  const BT = { str: 8, dex: 8, con: 14, int: 8, wis: 12, cha: 16 };

  for (const name of targetSpecies) {
    const sp = await Species.findOne({ name });
    if (!sp) { console.log(`  ⚠ ${name} not found`); continue; }
    
    const isTortle = name === 'Tortle';
    const base = isTortle ? BT : B;

    // Template A: Iron Concentration
    const ironBuild = {
      baseStats: base, level: 8, species: sp,
      speciesAsi: [{ stat: 'CHA', bonus: 2 }, { stat: 'CON', bonus: 1 }],
      levelChoices: [
        { level: 4, type: 'feat', feat: resilientCon, halfFeatStat: 'CON' },
        { level: 8, type: 'feat', feat: warCaster }
      ],
      items: [cloak, luckstone],
      ratings: { combat: 0, social: 0, fun: 0, durability: 0 }
    };

    // Template B: Armored Tank (existing pattern)
    const armoredBuild = {
      baseStats: base, level: 8, species: sp,
      speciesAsi: [{ stat: 'CHA', bonus: 2 }, { stat: isTortle ? 'CON' : 'DEX', bonus: 1 }],
      levelChoices: isTortle
        ? [ // Tortle doesn't need armor, so Resilient + War Caster with Bracers + Instrument
            { level: 4, type: 'feat', feat: resilientCon, halfFeatStat: 'CON' },
            { level: 8, type: 'feat', feat: warCaster }
          ]
        : [
            { level: 4, type: 'feat', feat: modArmor, halfFeatStat: 'DEX' },
            { level: 8, type: 'feat', feat: warCaster }
          ],
      items: [cliLyre, cloak],
      ratings: { combat: 0, social: 0, fun: 0, durability: 0 }
    };

    const iron = computeBuildStats(ironBuild);
    const armored = computeBuildStats(armoredBuild);

    // Notable species features
    const features = [];
    const t = sp.traits || {};
    if (t.magicResistance) features.push('Magic Resist');
    if (sp.naturalArmorAC) features.push(`Nat AC ${sp.naturalArmorAC}`);
    if (sp.hasFlight || t.permanentFlight) features.push('Flight');
    if (t.poisonImmunity) features.push('Poison Immune');
    if (t.innateTelepathy) features.push('Telepathy');
    if (t.feyType) features.push('Fey type');
    const traitListStr = (sp.traitList || []).join(' ');
    if (traitListStr.match(/hidden step/i)) features.push('Hidden Step');
    if (traitListStr.match(/fey step/i)) features.push('Fey Step');
    if (traitListStr.match(/breath weapon/i)) features.push('Breath Weapon');
    if (traitListStr.match(/suggestion/i)) features.push('Innate Suggestion');
    if (traitListStr.match(/shell defense/i)) features.push('Shell Defense');
    if (sp.innateSpells?.length > 0) {
      const spellNames = sp.innateSpells.map(s => s.spell || s.name || s).filter(s => typeof s === 'string');
      if (spellNames.length) features.push(`Spells: ${spellNames.slice(0,3).join(', ')}`);
    }

    const acDiff = iron.finalAc - armored.finalAc;
    const dcDiff = iron.spellDc - armored.spellDc;
    const concDiff = iron.concentrationHoldPct - armored.concentrationHoldPct;

    console.log(`  ┌─ ${name} ──────────────────────────────────────`);
    console.log(`  │  Features: ${features.join(', ') || 'none'}`);
    console.log(`  │`);
    console.log(`  │  ${''.padEnd(18)} ${'IRON CONC'.padStart(12)} ${'ARMORED'.padStart(12)} ${'DIFF'.padStart(8)}`);
    console.log(`  │  ${'AC'.padEnd(18)} ${String(iron.finalAc).padStart(12)} ${String(armored.finalAc).padStart(12)} ${(acDiff >= 0 ? '+' : '') + acDiff}`);
    console.log(`  │  ${'Spell DC'.padEnd(18)} ${String(iron.spellDc).padStart(12)} ${String(armored.spellDc).padStart(12)} ${(dcDiff >= 0 ? '+' : '') + dcDiff}`);
    console.log(`  │  ${'CHA'.padEnd(18)} ${String(iron.finalCha).padStart(12)} ${String(armored.finalCha).padStart(12)}`);
    console.log(`  │  ${'CON save'.padEnd(18)} ${(iron.conSaveType + ' +' + iron.conSaveBonus).padStart(12)} ${(armored.conSaveType + ' +' + armored.conSaveBonus).padStart(12)}`);
    console.log(`  │  ${'Conc Hold %'.padEnd(18)} ${(iron.concentrationHoldPct + '%').padStart(12)} ${(armored.concentrationHoldPct + '%').padStart(12)} ${(concDiff >= 0 ? '+' : '') + concDiff + '%'}`);
    
    // Verdict
    let verdict;
    if (name === 'Tortle') {
      verdict = '🏆 IRON CONC WINS: AC 18 is fine, +100% conc, no instrument still DC 15 is the cost';
    } else if (iron.finalAc >= 17) {
      verdict = '🏆 IRON CONC WINS: Natural armor compensates for no armor feat';
    } else if (features.includes('Flight') || features.includes('Hidden Step')) {
      verdict = '⚔️ IRON CONC VIABLE: Flight/invisibility means low AC matters less';
    } else if (features.includes('Magic Resist')) {
      verdict = '⚔️ CLOSE: Magic Resist + 100% conc is powerful, but AC 13 DC 15 hurts';
    } else {
      verdict = '🛡 ARMORED WINS: AC 20 + DC 16 >>> AC 13 + DC 15 when conc is already 91%+';
    }
    console.log(`  │`);
    console.log(`  │  ${verdict}`);
    console.log(`  └────────────────────────────────────────────────\n`);
  }

  // ── FINAL RECOMMENDATIONS ──
  console.log('═'.repeat(90));
  console.log('\n📋 FINAL RECOMMENDATIONS — Species where Iron Concentration is worth building:\n');
  console.log('  1. GEM DRAGONBORN ★ (User\'s pick)');
  console.log('     AC 13 is bad, BUT: Gem Flight gets you 30ft up where melee can\'t reach.');
  console.log('     Breath Weapon = non-conc AoE while Hypnotic Pattern runs.');
  console.log('     Telepathy coordinates with party from the sky. 100% conc = spell NEVER drops.');
  console.log('     PLAY PATTERN: Hypnotic Pattern → fly up → breathe on survivors → maintain from sky.');
  console.log('');
  console.log('  2. FIRBOLG');
  console.log('     Hidden Step = invisible for 3 turns. Can\'t target what you can\'t see.');
  console.log('     AC 13 is irrelevant during Hidden Step. 100% conc when eventually targeted.');
  console.log('');
  console.log('  3. SATYR');
  console.log('     Magic Resistance + 100% conc = virtually immune to all magic.');
  console.log('     AC 13 is the real weakness. Best against caster-heavy encounters.');
  console.log('');
  console.log('  4. FAIRY');
  console.log('     Permanent flight from level 1. Fey type. Innate Enlarge/Reduce + Faerie Fire.');
  console.log('     Fly 30ft up, AC doesn\'t matter, concentration never breaks.');
  console.log('');
  console.log('  5. YUAN-TI');
  console.log('     Magic Resist + Poison Immune + free Suggestion + 100% conc.');
  console.log('     Incredible social/defense combo. AC 13 is the only weakness.');
  console.log('');
  console.log('  ⚠️ FOR MOST OTHER SPECIES: The Armored Tank template (Mod Armored + War Caster)');
  console.log('     is strictly better. Going from 91% → 100% conc is NOT worth losing');
  console.log('     6-7 AC and 1 spell DC. The 91% build also has armor + instrument.');
  console.log('');

  await mongoose.disconnect();
}

compare().catch(err => { console.error(err); process.exit(1); });
