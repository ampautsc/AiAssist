const mongoose = require('mongoose');
const path = require('path');
require('dotenv').config({ path: path.resolve(__dirname, '../.env') });

const Species = require(path.resolve(__dirname, './models/Species'));
const Feat = require(path.resolve(__dirname, './models/Feat'));
const Item = require(path.resolve(__dirname, './models/Item'));
const Build = require(path.resolve(__dirname, './models/Build'));

async function seed() {
  await mongoose.connect(process.env.MONGODB_URI);
  console.log('Connected to MongoDB');

  // Clear feats, items, and builds (Species managed by seed-species.js)
  await Promise.all([
    Feat.deleteMany({}),
    Item.deleteMany({}),
    Build.deleteMany({})
  ]);
  console.log('Cleared feats, items, and builds (species preserved)');

  // ============================================================
  // FEATS
  // ============================================================
  const featsData = [
    {
      name: 'Moderately Armored',
      isHalfFeat: true, halfFeatStat: 'DEX',
      grantsArmorProficiency: 'medium+shield',
      grantsAdvConSaves: false, grantsProfConSaves: false,
      description: 'Gain proficiency with medium armor and shields. +1 DEX.',
      mechanicalSummary: 'Half plate + shield = AC 19. +1 DEX.',
      tags: ['defense']
    },
    {
      name: 'War Caster',
      isHalfFeat: false,
      grantsAdvConSaves: true, grantsProfConSaves: false,
      description: 'Advantage on CON saves for concentration. Somatic components with hands full. Opportunity attack with spell.',
      mechanicalSummary: 'Adv CON saves + somatic w/ shield',
      tags: ['defense', 'concentration']
    },
    {
      name: 'Resilient (CON)',
      isHalfFeat: true, halfFeatStat: 'CON',
      grantsAdvConSaves: false, grantsProfConSaves: true,
      description: '+1 CON, gain proficiency in CON saving throws.',
      mechanicalSummary: 'Prof CON saves. Scales with level.',
      tags: ['defense', 'concentration']
    },
    {
      name: 'Fey Touched',
      isHalfFeat: true, halfFeatStat: 'CHA',
      description: '+1 CHA. Learn Misty Step + one 1st-level divination/enchantment spell. Cast each 1/day free, or with spell slots.',
      mechanicalSummary: '+1 CHA, free Misty Step + 1st-level spell',
      bonusSpells: ['Misty Step'],
      tags: ['mobility', 'offense']
    },
    {
      name: 'Telekinetic',
      isHalfFeat: true, halfFeatStat: 'CHA',
      description: '+1 CHA. Mage Hand invisible, 60ft range. BA shove creature 5ft (CHA save DC = spell DC).',
      mechanicalSummary: '+1 CHA, BA 5ft shove (spell DC), invisible Mage Hand',
      tags: ['offense', 'utility']
    },
    {
      name: 'Telepathic',
      isHalfFeat: true, halfFeatStat: 'CHA',
      description: '+1 CHA. 60ft telepathy. Cast Detect Thoughts 1/day free.',
      mechanicalSummary: '+1 CHA, 60ft telepathy, Detect Thoughts 1/day',
      bonusSpells: ['Detect Thoughts'],
      tags: ['social', 'utility']
    },
    {
      name: 'Dragon Fear',
      isHalfFeat: true, halfFeatStat: 'CHA',
      prerequisite: 'Dragonborn',
      description: '+1 CHA. Replace breath weapon use with 30ft AoE frighten (WIS save, 1 min, repeat save each turn). NOT concentration.',
      mechanicalSummary: '+1 CHA, 30ft AoE frighten (no concentration)',
      tags: ['offense', 'crowd-control']
    },
    {
      name: 'Lucky',
      isHalfFeat: false,
      description: '3 luck points/day. Reroll d20 after seeing result, or force attacker to reroll.',
      mechanicalSummary: '3 rerolls per day on any d20',
      tags: ['defense', 'utility']
    },
    {
      name: 'Inspiring Leader',
      isHalfFeat: false,
      description: '10 min speech gives 6 creatures temp HP = level + CHA mod.',
      mechanicalSummary: 'Party temp HP = Lv + CHA mod after rest',
      tags: ['support']
    },
    {
      name: 'Sentinel',
      isHalfFeat: false,
      description: 'OA on disengage, OA reduces speed to 0, reaction attack when ally is attacked.',
      mechanicalSummary: 'Lock down melee, punish movement',
      tags: ['defense', 'offense']
    },
    {
      name: 'Alert',
      isHalfFeat: false,
      description: "+5 initiative. Can't be surprised. Hidden creatures don't gain advantage on attacks.",
      mechanicalSummary: '+5 initiative, no surprise',
      tags: ['utility']
    }
  ];
  const feats = {};
  for (const f of featsData) {
    feats[f.name] = await Feat.create(f);
  }
  console.log(`Seeded ${Object.keys(feats).length} feats`);

  // ============================================================
  // ITEMS
  // ============================================================
  const itemsData = [
    {
      name: 'Instrument of the Bards (Cli Lyre)',
      rarity: 'rare', requiresAttunement: true, slot: 'instrument',
      imposesCharmDisadvantage: true,
      grantedSpells: ['Fly', 'Invisibility', 'Levitate', 'Protection from Evil and Good', 'Stone Shape', 'Wall of Fire', 'Wind Wall'],
      description: 'While playing, you can cast charm spells that impose disadvantage on the target\'s saving throw. Cast each granted spell 1/day using your spellcasting ability and spell save DC. Unattuned creatures take 2d4 psychic damage on failed DC 15 WIS save.',
      mechanicalSummary: 'Disadvantage on charm saves when playing + 7 bonus spells 1/day (Fly, Invisibility, Levitate, Prot E&G, Stone Shape, Wall of Fire, Wind Wall)',
      tags: ['utility', 'social', 'offense']
    },
    {
      name: 'Instrument of the Bards (Doss Lute)',
      rarity: 'uncommon', requiresAttunement: true, slot: 'instrument',
      imposesCharmDisadvantage: true,
      grantedSpells: ['Fly', 'Invisibility', 'Levitate', 'Protection from Evil and Good', 'Animal Friendship', 'Protection from Energy', 'Protection from Poison'],
      description: 'While playing, you can cast charm spells that impose disadvantage on the target\'s saving throw. Cast each granted spell 1/day using your spellcasting ability and spell save DC. Unattuned creatures take 2d4 psychic damage on failed DC 15 WIS save.',
      mechanicalSummary: 'Disadvantage on charm saves when playing + 7 bonus spells 1/day (Fly, Invisibility, Levitate, Prot E&G, Animal Friendship, Prot Energy, Prot Poison)',
      tags: ['utility', 'defense']
    },
    {
      name: 'Cloak of Protection',
      rarity: 'uncommon', requiresAttunement: true, slot: 'cloak',
      acBonus: 1, saveBonus: 1,
      description: '+1 AC and +1 to all saving throws.',
      mechanicalSummary: '+1 AC, +1 all saves',
      tags: ['defense', 'concentration']
    },
    {
      name: 'Stone of Good Luck (Luckstone)',
      rarity: 'uncommon', requiresAttunement: true, slot: 'pocket',
      saveBonus: 1,
      description: '+1 to ability checks and saving throws.',
      mechanicalSummary: '+1 all checks AND saves',
      tags: ['utility', 'defense']
    },
    {
      name: 'Pearl of Power',
      rarity: 'uncommon', requiresAttunement: true, slot: 'pocket',
      description: 'Regain one expended spell slot of 3rd level or lower. 1/day.',
      mechanicalSummary: 'Regain 1 spell slot (3rd or lower) per day',
      tags: ['utility']
    },
    {
      name: 'Bracers of Defense',
      rarity: 'uncommon', requiresAttunement: true, slot: 'hands',
      acBonus: 2, requiresNoArmor: true, requiresNoShield: true,
      description: '+2 AC while wearing no armor and no shield.',
      mechanicalSummary: '+2 AC (no armor/shield)',
      tags: ['defense']
    },
    {
      name: 'Winged Boots',
      rarity: 'uncommon', requiresAttunement: true, slot: 'feet',
      description: 'Flying speed equal to walking speed for 4 hours/day.',
      mechanicalSummary: '4 hours of flight per day',
      tags: ['mobility']
    },
    {
      name: 'Sentinel Shield',
      rarity: 'uncommon', requiresAttunement: false, slot: 'shield',
      description: 'Advantage on initiative rolls and Perception checks.',
      mechanicalSummary: 'Adv initiative + Adv Perception',
      tags: ['utility', 'defense']
    },
    {
      name: 'Hat of Disguise',
      rarity: 'uncommon', requiresAttunement: true, slot: 'head',
      description: 'Cast Disguise Self at will.',
      mechanicalSummary: 'At-will Disguise Self',
      tags: ['social']
    },
    {
      name: 'Amulet of Proof Against Detection',
      rarity: 'uncommon', requiresAttunement: true, slot: 'neck',
      description: "Can't be targeted by divination magic or perceived through scrying.",
      mechanicalSummary: 'Immune to scrying and divination targeting',
      tags: ['defense', 'social']
    },
    {
      name: 'Ring of Mind Shielding',
      rarity: 'uncommon', requiresAttunement: true, slot: 'ring',
      description: "Thoughts can't be read. Telepathy only works if you allow it. Lies can't be magically detected.",
      mechanicalSummary: 'Immune to thought reading + lie detection',
      tags: ['social', 'defense']
    },
    {
      name: 'Medallion of Thoughts',
      rarity: 'uncommon', requiresAttunement: true, slot: 'neck',
      description: 'Cast Detect Thoughts 3/day (DC 13 WIS save).',
      mechanicalSummary: 'Detect Thoughts 3/day',
      tags: ['social']
    },
    {
      name: 'Boots of Elvenkind',
      rarity: 'uncommon', requiresAttunement: false, slot: 'feet',
      description: 'Advantage on Stealth checks to move silently.',
      mechanicalSummary: 'Adv Stealth (movement)',
      tags: ['utility', 'social']
    },
    {
      name: 'Cloak of Elvenkind',
      rarity: 'uncommon', requiresAttunement: true, slot: 'cloak',
      description: 'Advantage on Stealth checks to hide. Creatures have disadvantage on Perception to spot you.',
      mechanicalSummary: 'Adv Stealth (hide) + Disadv to spot you',
      tags: ['utility', 'social']
    },
    {
      name: 'Eyes of Charming',
      rarity: 'uncommon', requiresAttunement: true, slot: 'head',
      description: 'Cast Charm Person (DC 13) 3/day.',
      mechanicalSummary: 'Charm Person 3/day (DC 13)',
      tags: ['social']
    },
    {
      name: 'Circlet of Blasting',
      rarity: 'uncommon', requiresAttunement: false, slot: 'head',
      description: 'Cast Scorching Ray 1/day (+5 to hit, three rays of 2d6 fire).',
      mechanicalSummary: 'Scorching Ray 1/day',
      tags: ['offense']
    },
    {
      name: "Rhythm-Maker's Drum (+1)",
      rarity: 'uncommon', requiresAttunement: true, slot: 'instrument',
      spellDcBonus: 1, spellAttackBonus: 1,
      description: '+1 bonus to spell attack rolls and spell save DCs of your bard spells. Can be used as a spellcasting focus.',
      mechanicalSummary: '+1 spell DC, +1 spell attack (bard focus)',
      tags: ['offense', 'utility']
    }
  ];
  const items = {};
  for (const i of itemsData) {
    items[i.name] = await Item.create(i);
  }
  console.log(`Seeded ${Object.keys(items).length} items`);

  // ============================================================
  // SPECIES — Look up existing species (seeded by seed-species.js)
  // ============================================================
  // ── Load ALL species from the database ──
  // Every documented species gets every template = full coverage
  const allSpeciesDocs = await Species.find({}).sort({ name: 1 });
  const species = {};
  for (const doc of allSpeciesDocs) {
    species[doc.name] = doc;
  }
  console.log(`Found ${Object.keys(species).length} species for builds`);
  if (Object.keys(species).length === 0) {
    console.error('❌ No species found! Run seed-species.js first!');
    process.exit(1);
  }

  // ============================================================
  // BUILD TEMPLATES — Applied uniformly to ALL species
  //
  // Fair comparison methodology: the ONLY variable is species.
  // Same base stats, same feats, same items across all builds
  // within a template. Species traits (flight, Magic Resistance,
  // Hidden Step, Fey Step, Dragon Fear, natural armor, etc.)
  // are the ONLY differentiators.
  // ============================================================
  const BASE_STATS = { str: 8, dex: 14, con: 14, int: 8, wis: 12, cha: 16 };

  const TEMPLATES = [
    // ── SET 1: BARDIC MUSICIAN (the ONLY instrument build) ──────────
    // CHA 20 (Fey Touched + ASI), Cli Lyre charm disadvantage, AC 14
    {
      id: 'bardic-musician',
      name: 'Bardic Musician',
      archetype: 'glass-cannon',
      speciesAsiSecondary: 'CON',
      levelChoices: [
        { level: 4, type: 'feat', featName: 'Fey Touched', halfFeatStat: 'CHA' },
        { level: 8, type: 'asi', asiIncreases: [{ stat: 'CHA', bonus: 1 }, { stat: 'CON', bonus: 1 }] },
      ],
      customLineageBonusFeat: { level: 1, type: 'feat', featName: 'Lucky' },
      itemNames: ['Instrument of the Bards (Cli Lyre)', 'Cloak of Protection'],
      philosophy: 'Instrument of the Bards charm disadvantage + CHA 20 = DC 16 + enemies save at disadvantage. Glass cannon.',
      combatLoop: 'T1: Hypnotic Pattern DC 16 (targets save at disadvantage). T2+: Maintain concentration. Misty Step to escape.',
      risks: 'Low AC (14). No CON save protection. Concentration fragile.',
      rewards: 'Charm disadvantage is ~equivalent to +5 DC. Misty Step. CHA 20.',
      ratings: { combat: 8, social: 8, fun: 8, durability: 4 },
    },
    // ── SET 2: ARMORED TANK ─────────────────────────────────────────
    // AC 20 (half-plate + shield), ADV CON saves, +2 all saves, DC 15
    {
      id: 'armored-tank',
      name: 'Armored Tank',
      archetype: 'tank',
      speciesAsiSecondary: 'CON',
      levelChoices: [
        { level: 4, type: 'feat', featName: 'Moderately Armored', halfFeatStat: 'DEX' },
        { level: 8, type: 'feat', featName: 'War Caster' },
      ],
      customLineageBonusFeat: { level: 1, type: 'feat', featName: 'Lucky' },
      itemNames: ['Cloak of Protection', 'Stone of Good Luck (Luckstone)'],
      philosophy: 'Maximum defense. AC 20 + ADV CON saves + +2 all saves from items. No instrument.',
      combatLoop: 'T1: Hypnotic Pattern DC 15. T2+: Nearly invulnerable behind AC 20 + ADV CON saves.',
      risks: 'CHA 18 (DC 15). No Misty Step. No charm disadvantage.',
      rewards: 'Highest durability. AC 20 + ADV CON + +2 saves.',
      ratings: { combat: 7, social: 6, fun: 6, durability: 9 },
    },
    // ── SET 3: ARMORED ESCAPIST ─────────────────────────────────────
    // AC 20, Misty Step, Pearl of Power extra slot, DC 15
    {
      id: 'armored-escapist',
      name: 'Armored Escapist',
      archetype: 'balanced',
      speciesAsiSecondary: 'CON',
      levelChoices: [
        { level: 4, type: 'feat', featName: 'Moderately Armored', halfFeatStat: 'DEX' },
        { level: 8, type: 'feat', featName: 'Fey Touched', halfFeatStat: 'CHA' },
      ],
      customLineageBonusFeat: { level: 1, type: 'feat', featName: 'Lucky' },
      itemNames: ['Cloak of Protection', 'Pearl of Power'],
      philosophy: 'AC 20 + Misty Step mobility + extra 3rd-level slot from Pearl of Power. Well-rounded.',
      combatLoop: 'T1: Hypnotic Pattern DC 15. T2+: Maintain behind AC 20. Misty Step if cornered. Pearl recovers a slot.',
      risks: 'No ADV CON saves. CHA 19 (DC 15 same as CHA 18). No charm disadvantage.',
      rewards: 'AC 20, Misty Step, extra spell slot. Best overall flexibility.',
      ratings: { combat: 7, social: 7, fun: 8, durability: 7 },
    },
    // ── SET 4: UNARMORED CASTER ─────────────────────────────────────
    // CHA 20, Bracers of Defense (AC 15), DC 16, Misty Step
    {
      id: 'unarmored-caster',
      name: 'Unarmored Caster',
      archetype: 'glass-cannon',
      speciesAsiSecondary: 'CON',
      levelChoices: [
        { level: 4, type: 'feat', featName: 'Fey Touched', halfFeatStat: 'CHA' },
        { level: 8, type: 'asi', asiIncreases: [{ stat: 'CHA', bonus: 1 }, { stat: 'CON', bonus: 1 }] },
      ],
      customLineageBonusFeat: { level: 1, type: 'feat', featName: 'Lucky' },
      itemNames: ['Bracers of Defense', 'Cloak of Protection'],
      philosophy: 'CHA 20 DC 16 with Bracers + Cloak for AC 15. No instrument. Tests raw DC vs charm disadvantage.',
      combatLoop: 'T1: Hypnotic Pattern DC 16. T2+: Maintain. Misty Step to escape. Bracers give AC 15.',
      risks: 'AC 15 still low. No CON save advantage. No charm disadvantage.',
      rewards: 'DC 16 + Misty Step + Bracers AC 15. Direct comparison to Bardic Musician.',
      ratings: { combat: 8, social: 7, fun: 7, durability: 5 },
    },
    // ── SET 5: IRON CONCENTRATION ───────────────────────────────────
    // Resilient CON + War Caster = +7-8 CON save with ADV, DC 15, AC 14
    {
      id: 'iron-concentration',
      name: 'Iron Concentration',
      archetype: 'tank',
      speciesAsiSecondary: 'CON',
      levelChoices: [
        { level: 4, type: 'feat', featName: 'Resilient (CON)', halfFeatStat: 'CON' },
        { level: 8, type: 'feat', featName: 'War Caster' },
      ],
      customLineageBonusFeat: { level: 1, type: 'feat', featName: 'Lucky' },
      itemNames: ['Cloak of Protection', 'Stone of Good Luck (Luckstone)'],
      philosophy: 'Unbreakable concentration. Prof + ADV CON saves + +2 from items. DC 10 is automatic.',
      combatLoop: 'T1: Hypnotic Pattern DC 15. T2+: Concentration cannot break at DC 10. Dodge or cantrip.',
      risks: 'Low AC (14). No mobility. CHA 18 (DC 15). No instrument.',
      rewards: '99%+ concentration hold at DC 10. The pure math build.',
      ratings: { combat: 7, social: 6, fun: 5, durability: 8 },
    },
    // ── SET 6: DRAGON FEAR CASTER ────────────────────────────────────
    // CHA 20, Dragon Fear (no-conc AoE frighten), Drum +1 DC 17, AC 13
    // DRAGONBORN ONLY: Dragon Fear requires Dragonborn heritage
    {
      id: 'dragon-fear-caster',
      name: 'Dragon Fear Caster',
      archetype: 'controller',
      speciesAsiSecondary: 'CON',
      speciesFilter: 'Dragonborn',  // Only generate for species with "Dragonborn" in name
      levelChoices: [
        { level: 4, type: 'feat', featName: 'Fey Touched', halfFeatStat: 'CHA' },
        { level: 8, type: 'feat', featName: 'Dragon Fear', halfFeatStat: 'CHA' },
      ],
      customLineageBonusFeat: null,
      itemNames: ["Rhythm-Maker's Drum (+1)", 'Stone of Good Luck (Luckstone)'],
      philosophy: 'CHA 20 + Drum (+1 DC) = DC 17. Dragon Fear trades breath weapon for non-concentration 30ft AoE frighten (WIS save). Maintain concentration on Hypnotic Pattern while Dragon Fear locks down anyone who saved. Luckstone adds +1 to all saves.',
      combatLoop: 'T1: Hypnotic Pattern DC 17 from Drum. T2: Dragon Fear (replaces breath weapon) on creatures that saved — 30ft AoE frighten, no concentration. T3+: Maintain HP concentration, frightened creatures have disadv on ability checks and can\'t move closer. Misty Step for escape.',
      risks: 'Low AC (13, no armor feat, no defensive items). No CON save protection. Concentration fragile.',
      rewards: 'DC 17 (highest non-instrument-disadvantage DC). Two independent crowd-control effects simultaneously. Dragon Fear is a huge action-economy win — frighten without concentration.',
      ratings: { combat: 9, social: 7, fun: 9, durability: 4 },
    },
    // ── SET 7: WINGED STRIKER — REMOVED ─────────────────────────────
    // Winged Boots gave free flight to ALL species, skewing every build
    // toward evasion/flight dominance. Dropped to let species-native
    // flight and other archetypes compete on their own merits.
  ];

  // Auto-generate species notes from actual DB traits
  function generateSpeciesNote(speciesDoc) {
    const traits = [];
    const notes = [];

    if (speciesDoc.hasFlight) {
      traits.push('Permanent flight');
      notes.push('Permanent flight enables aerial concentration maintenance.');
    }
    if (speciesDoc.naturalArmorAC) {
      traits.push(`Natural AC ${speciesDoc.naturalArmorAC}`);
      notes.push(`Natural AC ${speciesDoc.naturalArmorAC} replaces standard armor calculations.`);
    }
    const hasMagicRes = speciesDoc.traitList?.some(t =>
      t.name?.toLowerCase().includes('magic resistance'));
    if (hasMagicRes) {
      traits.push('Magic Resistance (Adv on spell saves)');
      notes.push('Magic Resistance provides advantage on saves against spells.');
    }
    if (speciesDoc.resistances?.length > 0) {
      traits.push(`Resistance: ${speciesDoc.resistances.join(', ')}`);
    }
    if (speciesDoc.conditionImmunities?.length > 0) {
      traits.push(`Condition immunity: ${speciesDoc.conditionImmunities.join(', ')}`);
    }
    if (speciesDoc.damageImmunities?.length > 0) {
      traits.push(`Damage immunity: ${speciesDoc.damageImmunities.join(', ')}`);
    }
    if (speciesDoc.innateSpells?.length > 0) {
      const spellNames = speciesDoc.innateSpells.map(s => s.spell).join(', ');
      traits.push(`Innate spells: ${spellNames}`);
    }
    if (speciesDoc.creatureType === 'Fey') {
      traits.push('Fey creature type');
    }
    // Notable traits from traitList (skip Magic Resistance already handled)
    const notableTraits = speciesDoc.traitList?.filter(t =>
      t.name && !t.name.toLowerCase().includes('magic resistance')
    ).map(t => t.name) || [];
    if (notableTraits.length > 0 && notableTraits.length <= 5) {
      traits.push(notableTraits.join(', '));
    } else if (notableTraits.length > 5) {
      traits.push(notableTraits.slice(0, 5).join(', ') + ` (+${notableTraits.length - 5} more)`);
    }

    return {
      trait: traits.join(' + ') || 'Standard racial traits',
      note: notes.join(' ') || 'Standard species with typical racial traits.',
    };
  }

  // Build SPECIES_NOTES dynamically from all species in database
  const SPECIES_NOTES = {};
  for (const [name, doc] of Object.entries(species)) {
    SPECIES_NOTES[name] = generateSpeciesNote(doc);
  }

  // ── Generate all builds: TEMPLATES × SPECIES ──
  const buildsData = [];
  for (const template of TEMPLATES) {
    for (const [speciesName, speciesDoc] of Object.entries(species)) {
      // Skip species that don't match the template's species filter
      if (template.speciesFilter && !speciesName.includes(template.speciesFilter)) {
        continue;
      }

      const isCustomLineage = speciesName === 'Custom Lineage';
      const speciesNote = SPECIES_NOTES[speciesName] || { trait: '', note: '' };

      // Species ASI: all get +2 CHA. Standard species get +1 in template's secondary.
      // Custom Lineage only gets +2 (no +1) — that's their real tradeoff.
      const speciesAsi = isCustomLineage
        ? [{ stat: 'CHA', bonus: 2 }]
        : [{ stat: 'CHA', bonus: 2 }, { stat: template.speciesAsiSecondary, bonus: 1 }];

      // Level choices: template feats/ASIs + Custom Lineage bonus feat
      const levelChoices = [];
      if (isCustomLineage && template.customLineageBonusFeat) {
        const bonus = template.customLineageBonusFeat;
        levelChoices.push({
          level: bonus.level,
          type: bonus.type,
          feat: feats[bonus.featName]._id,
          halfFeatStat: bonus.halfFeatStat,
        });
      }
      for (const choice of template.levelChoices) {
        if (choice.type === 'feat') {
          levelChoices.push({
            level: choice.level,
            type: 'feat',
            feat: feats[choice.featName]._id,
            halfFeatStat: choice.halfFeatStat,
          });
        } else if (choice.type === 'asi') {
          levelChoices.push({
            level: choice.level,
            type: 'asi',
            asiIncreases: choice.asiIncreases,
          });
        }
      }

      // Items: always the same per template
      const itemIds = template.itemNames.map(name => items[name]._id);

      buildsData.push({
        name: `${speciesName} — ${template.name}`,
        species: speciesDoc._id,
        level: 8,
        baseStats: BASE_STATS,
        speciesAsi,
        levelChoices,
        items: itemIds,
        archetype: template.archetype,
        philosophy: `${template.philosophy} Species: ${speciesNote.note}`,
        combatLoop: `${template.combatLoop} Species: ${speciesNote.trait}.`,
        risks: template.risks,
        rewards: `${template.rewards} Species bonus: ${speciesNote.trait}.`,
        ratings: template.ratings,
      });
    }
  }

  for (const b of buildsData) {
    await Build.create(b);
  }
  console.log(`Seeded ${buildsData.length} builds (${TEMPLATES.length} templates × ${Object.keys(species).length} species)`);

  console.log('\nDone! Database seeded successfully.');
  await mongoose.disconnect();
}

seed().catch(err => {
  console.error('Seed error:', err);
  process.exit(1);
});
