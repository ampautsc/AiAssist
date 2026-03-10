/**
 * Analyze the "Ultimate Concentration" build template across all species
 * Template: War Caster + Resilient (CON) + Cloak of Protection + Stone of Good Luck
 * 
 * Purpose: Find which species are standouts for maximum concentration holding
 */
require('dotenv').config({ path: require('path').join(__dirname, '..', '.env') });
const mongoose = require('mongoose');
const Species = require('./models/Species');
const Feat = require('./models/Feat');
const Item = require('./models/Item');
const { computeBuildStats } = require('./utils/buildCalculator');

async function analyze() {
  await mongoose.connect(process.env.MONGODB_URI || 'mongodb://localhost:27017/dnd-builder');
  
  // Load required feats and items
  const warCaster = await Feat.findOne({ name: 'War Caster' });
  const resilientCon = await Feat.findOne({ name: 'Resilient (CON)' });
  const cloak = await Item.findOne({ name: 'Cloak of Protection' });
  const luckstone = await Item.findOne({ name: 'Stone of Good Luck (Luckstone)' });
  
  if (!warCaster || !resilientCon || !cloak || !luckstone) {
    console.error('Missing feat/item:', { warCaster: !!warCaster, resilientCon: !!resilientCon, cloak: !!cloak, luckstone: !!luckstone });
    process.exit(1);
  }

  // Get ALL species from database
  const allSpecies = await Species.find().sort({ name: 1 });
  console.log(`\nAnalyzing ${allSpecies.length} species with Ultimate Concentration build:\n`);
  console.log(`Build: War Caster + Resilient(CON) | Cloak of Protection + Stone of Good Luck`);
  console.log(`Base: CHA 16 rolled | Tasha's +2 CHA +1 varies\n`);
  console.log('='.repeat(120));
  console.log(
    'Species'.padEnd(25) +
    'AC'.padStart(4) +
    'DC'.padStart(5) +
    'CHA'.padStart(5) +
    'CON'.padStart(5) +
    'Conc%'.padStart(7) +
    'ConType'.padStart(10) +
    'ConBonus'.padStart(9) +
    '  Species Features'
  );
  console.log('-'.repeat(120));

  const results = [];

  for (const sp of allSpecies) {
    // Determine best +1 ASI placement
    // Tortle: +1 CON (no DEX needed), base DEX 8
    // Others: try both +1 CON and +1 DEX, pick the one that benefits most
    const isTortle = sp.name === 'Tortle';
    const baseStats = isTortle
      ? { str: 8, dex: 8, con: 14, int: 8, wis: 12, cha: 16 }
      : { str: 8, dex: 14, con: 14, int: 8, wis: 12, cha: 16 };

    // For this build, +1 CON is almost always better (Resilient makes CON odd→even matter)
    // But let's compute both and pick better
    const variants = [
      { label: '+1 CON', speciesAsi: [{ stat: 'CHA', bonus: 2 }, { stat: 'CON', bonus: 1 }] },
    ];
    if (!isTortle) {
      variants.push({ label: '+1 DEX', speciesAsi: [{ stat: 'CHA', bonus: 2 }, { stat: 'DEX', bonus: 1 }] });
    }

    // Custom Lineage only gets +2, not +2/+1
    const isCustom = sp.name === 'Custom Lineage';
    if (isCustom) {
      variants.length = 0;
      variants.push({ label: '+2 CHA', speciesAsi: [{ stat: 'CHA', bonus: 2 }] });
    }

    let best = null;
    for (const v of variants) {
      // Custom Lineage gets 3 feat slots (lv1, lv4, lv8)
      const levelChoices = isCustom
        ? [
            { level: 1, type: 'feat', feat: resilientCon, halfFeatStat: 'CON' },
            { level: 4, type: 'feat', feat: warCaster },
            // Level 8 is FREE — could be Fey Touched, Telepathic, etc.
            // For this comparison, leave it as just the two core feats
            { level: 8, type: 'asi', asiIncreases: [{ stat: 'CHA', bonus: 1 }, { stat: 'CON', bonus: 1 }] }
          ]
        : [
            { level: 4, type: 'feat', feat: resilientCon, halfFeatStat: 'CON' },
            { level: 8, type: 'feat', feat: warCaster }
          ];

      const build = {
        baseStats,
        level: 8,
        species: sp,
        speciesAsi: v.speciesAsi,
        levelChoices,
        items: [cloak, luckstone],
        ratings: { combat: 0, social: 0, fun: 0, durability: 0 }
      };

      const computed = computeBuildStats(build);
      const result = { species: sp, variant: v.label, computed, build };
      if (!best || computed.concentrationHoldPct > best.computed.concentrationHoldPct ||
          (computed.concentrationHoldPct === best.computed.concentrationHoldPct && computed.finalAc > best.computed.finalAc)) {
        best = result;
      }
    }

    // Build a features summary from the traits object and traitList
    const features = [];
    const t = sp.traits || {};
    if (t.magicResistance || sp.magicResistance) features.push('Magic Resist');
    if (sp.naturalArmorAC) features.push(`Natural AC ${sp.naturalArmorAC}`);
    if (sp.hasFlight || t.permanentFlight) features.push('Flight');
    if (sp.creatureType && sp.creatureType !== 'Humanoid') features.push(sp.creatureType);
    if (t.feyType) features.push('Fey');
    if (t.poisonImmunity) features.push('Poison Immune');
    if (t.innateTelepathy) features.push('Telepathy');
    
    // Check traitList for notable abilities
    const traitListStr = (sp.traitList || []).join(', ');
    const nonSpellStr = (sp.nonSpellAbilities || []).join(', ');
    const allTraitText = traitListStr + ' ' + nonSpellStr;
    if (allTraitText.match(/hidden step/i)) features.push('Hidden Step');
    if (allTraitText.match(/fey step/i)) features.push('Fey Step');
    if (allTraitText.match(/breath weapon/i)) features.push('Breath Weapon');
    if (allTraitText.match(/suggestion/i)) features.push('Innate Suggestion');
    if (allTraitText.match(/shell defense/i)) features.push('Shell Defense');
    if (allTraitText.match(/mental discipline|psychic/i) && !features.includes('Telepathy')) features.push('Psychic Ability');
    if (allTraitText.match(/charm/i) && allTraitText.match(/advantage|resist/i)) features.push('Charm Resist');
    if (sp.darkvision && sp.darkvision >= 120) features.push(`DV ${sp.darkvision}ft`);
    if (sp.resistances && sp.resistances.length > 0) features.push(`Resist: ${sp.resistances.join(', ')}`);
    if (sp.conditionImmunities && sp.conditionImmunities.length > 0) features.push(`Immune: ${sp.conditionImmunities.join(', ')}`);
    if (sp.innateSpells && sp.innateSpells.length > 0) features.push(`Innate: ${sp.innateSpells.map(s=>s.name||s).join(', ').substring(0,40)}`);
    results.push({ ...best, features });
  }

  // Sort by concentration hold %, then AC
  results.sort((a, b) => {
    if (b.computed.concentrationHoldPct !== a.computed.concentrationHoldPct)
      return b.computed.concentrationHoldPct - a.computed.concentrationHoldPct;
    return b.computed.finalAc - a.computed.finalAc;
  });

  for (const r of results) {
    const c = r.computed;
    const featStr = r.features.filter(f => !f.startsWith('DV')).join(', ');
    console.log(
      r.species.name.padEnd(25) +
      String(c.finalAc).padStart(4) +
      String(c.spellDc).padStart(5) +
      String(c.finalCha).padStart(5) +
      String(c.finalStats.con).padStart(5) +
      (c.concentrationHoldPct + '%').padStart(7) +
      c.conSaveType.padStart(10) +
      ('+' + c.conSaveBonus).padStart(9) +
      '  ' + featStr
    );
  }

  // Highlight standouts
  console.log('\n' + '='.repeat(120));
  console.log('\n🏆 STANDOUT SPECIES FOR THIS BUILD:\n');
  
  const standouts = results.filter(r => {
    const feats = r.features.filter(f => !f.startsWith('DV'));
    // Has notable combat/defensive features
    return feats.some(f => 
      ['Magic Resist', 'Hidden Step', 'Fey Step', 'Breath Weapon', 'Natural AC 17',
       'Poison Immune', 'Innate Suggestion', 'Shell Defense (+4 AC)', 'Flight',
       'Telepathy', 'Charm Resist', 'Save Adv'].includes(f)
    );
  });

  for (const r of standouts) {
    const c = r.computed;
    const feats = r.features.filter(f => !f.startsWith('DV'));
    console.log(`  ${r.species.name} (${r.species.source || '?'})`);
    console.log(`    AC ${c.finalAc} | DC ${c.spellDc} | CHA ${c.finalCha} | CON ${c.finalStats.con} | Conc: ${c.concentrationHoldPct}% (${c.conSaveType} +${c.conSaveBonus})`);
    console.log(`    Features: ${feats.join(', ')}`);
    console.log(`    Why: ${getWhyNote(r.species.name, feats)}`);
    console.log('');
  }

  await mongoose.disconnect();
}

function getWhyNote(name, feats) {
  const notes = {
    'Tortle': 'AC 18 without armor feat. Shell Defense = AC 22. Solves the biggest weakness of this build (low AC).',
    'Satyr': 'Magic Resistance + both CON protections = nearly impossible to disable. Fey type blocks many effects.',
    'Yuan-Ti': 'Magic Resistance + Poison Immunity + free Suggestion. Defensive AND social powerhouse.',
    'Firbolg': 'Hidden Step = 3 rounds invisible. No one can target you to break concentration.',
    'Eladrin': 'Fey Step = bonus action teleport + Autumn charm. Adds CC without using spell slots.',
    'Gem Dragonborn': 'Breath weapon = non-concentration AoE damage. Telepathy + Gem Flight. Versatile toolkit on top of iron concentration.',
    'Kalashtar': 'Resistance to psychic damage. Telepathy. Advantage on WIS saves stacks with Magic Resistance conceptually.',
    'Githzerai': 'Mental Discipline = advantage vs charmed/frightened. Shield spell 1/day = emergency AC +5.',
  };
  return notes[name] || `Notable features: ${feats.join(', ')}`;
}

analyze().catch(err => { console.error(err); process.exit(1); });
