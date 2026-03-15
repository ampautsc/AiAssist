/**
 * seed-species.js — Seeds MongoDB with comprehensive D&D 5e species data
 * 
 * Reads scraped data from server/data/species-raw.json
 * Applies post-processing fixes and variant splitting
 * Seeds the Species collection
 * 
 * Usage: node server/seed-species.js
 */

const mongoose = require('mongoose');
const path = require('path');
const fs = require('fs');
const cheerio = require('cheerio');
require('dotenv').config({ path: path.resolve(__dirname, '../.env') });

const Species = require(path.resolve(__dirname, './models/Species'));

// ============================================================
// POST-PROCESSING: Fix known parsing issues from scraper
// ============================================================

function fixCreatureType(species) {
  // The regex captured "a" from "You are a Humanoid" — fix by checking traitList
  for (const trait of (species.traitList || [])) {
    if (trait.name === 'Creature Type' || trait.name === 'Type') {
      const desc = trait.description.toLowerCase();
      if (desc.includes('fey')) return 'Fey';
      if (desc.includes('humanoid')) return 'Humanoid';
      if (desc.includes('construct')) return 'Construct';
      if (desc.includes('undead')) return 'Undead';
      if (desc.includes('monstrosity')) return 'Monstrosity';
      if (desc.includes('ooze')) return 'Ooze';
      if (desc.includes('aberration')) return 'Aberration';
    }
  }
  // Check raw text for creature type
  if (species.rawText) {
    const ctMatch = species.rawText.match(/(?:creature type|type)\.\s*you are (?:a |an )?(\w+)/i);
    if (ctMatch) {
      const ct = ctMatch[1].toLowerCase();
      if (ct === 'fey') return 'Fey';
      if (ct === 'humanoid') return 'Humanoid';
      if (ct === 'construct') return 'Construct';
      if (ct === 'undead') return 'Undead';
      if (ct === 'monstrosity') return 'Monstrosity';
      if (ct === 'ooze') return 'Ooze';
    }
  }
  return 'Humanoid'; // Default
}

function fixLanguages(species) {
  // Clean up parsed languages
  const cleaned = (species.languages || ['Common']).map(l => {
    return l.replace(/\s+that.*$/i, '').replace(/\s+you.*$/i, '').trim();
  }).filter(l => l && l.length < 20 && l.length > 1);
  return cleaned.length > 0 ? cleaned : ['Common'];
}

function fixNaturalWeapons(species) {
  // Remove false matches from flavor text tables
  return (species.naturalWeapons || []).filter(w => {
    // Real natural weapons have damage dice
    return w.damage && w.damage.match(/\d+d\d+/);
  });
}

function fixInnateSpells(species) {
  // Extract spells more carefully from rawText
  const spells = [];
  const text = species.rawText || '';
  const seen = new Set();

  // Cantrip patterns
  const cantripMatches = text.matchAll(/you (?:know|learn) the\s+(\w[\w\s/]+?)\s+cantrip/gi);
  for (const m of cantripMatches) {
    const spell = m[1].trim();
    if (spell.length < 30 && !seen.has(spell.toLowerCase())) {
      seen.add(spell.toLowerCase());
      spells.push({
        spell,
        levelRequired: 1,
        frequency: 'at will',
        spellcastingAbility: extractSpellAbility(text)
      });
    }
  }

  // "Starting at Xth level, you can cast Y"
  const levelCastMatches = text.matchAll(/(?:starting at|once you reach|when you reach) (\d+)(?:st|nd|rd|th) level.*?(?:you can (?:also )?cast|cast) (?:the\s+)?([A-Z][\w'\s/]+?)(?:\s+spell|\s+once|\s+with|\s+without)/gi);
  for (const m of levelCastMatches) {
    const level = parseInt(m[1]);
    let spell = m[2].trim().replace(/\s+(?:once|with|without|a number|spell).*$/i, '').trim();
    if (spell.length > 2 && spell.length < 40 && !seen.has(spell.toLowerCase())) {
      seen.add(spell.toLowerCase());
      spells.push({
        spell,
        levelRequired: level,
        frequency: '1/long rest',
        spellcastingAbility: extractSpellAbility(text)
      });
    }
  }

  // "you can cast X" without level requirement (always available, 1/long rest)
  const alwaysCastMatches = text.matchAll(/you can (?:also )?cast (?:the\s+)?([A-Z][\w'\s/]+?)\s+(?:spell\s+)?(?:once|with this|a number of times|without)/gi);
  for (const m of alwaysCastMatches) {
    let spell = m[1].trim().replace(/\s+(?:once|with|without|a number|spell).*$/i, '').trim();
    if (spell.length > 2 && spell.length < 40 && !seen.has(spell.toLowerCase())) {
      seen.add(spell.toLowerCase());
      spells.push({
        spell,
        levelRequired: 1,
        frequency: '1/long rest',
        spellcastingAbility: extractSpellAbility(text)
      });
    }
  }

  return spells.length > 0 ? spells : species.innateSpells || [];
}

function extractSpellAbility(text) {
  if (text.match(/Intelligence, Wisdom, or Charisma/i)) return 'INT/WIS/CHA';
  const match = text.match(/(Intelligence|Wisdom|Charisma) is your spellcasting ability/i) ||
                text.match(/spellcasting ability.*?is\s+(Intelligence|Wisdom|Charisma)/i);
  if (match) {
    const stat = match[1].toLowerCase();
    if (stat === 'intelligence') return 'INT';
    if (stat === 'wisdom') return 'WIS';
    if (stat === 'charisma') return 'CHA';
  }
  return null;
}

function extractDarkvisionFromTraits(species) {
  for (const trait of (species.traitList || [])) {
    if (trait.name?.toLowerCase().includes('darkvision') || trait.name?.toLowerCase().includes('superior darkvision')) {
      const match = trait.description.match(/(\d+)\s*(?:ft|feet)/i);
      if (match) return parseInt(match[1]);
    }
  }
  return species.darkvision || 0;
}

function extractResistancesFromTraits(species) {
  const resistances = new Set(species.resistances || []);
  for (const trait of (species.traitList || [])) {
    const desc = (trait.description || '').toLowerCase();
    const resMatch = desc.matchAll(/resistance to (\w+) damage/gi);
    for (const m of resMatch) {
      resistances.add(m[1].toLowerCase());
    }
  }
  return [...resistances];
}

function extractConditionImmunitiesFromTraits(species) {
  const immunities = new Set(species.conditionImmunities || []);
  for (const trait of (species.traitList || [])) {
    const desc = (trait.description || '').toLowerCase();
    if (desc.includes("can't be poisoned") || desc.includes('immune to the poisoned')) {
      immunities.add('poisoned');
    }
    if (desc.includes('immune to disease')) {
      immunities.add('disease');
    }
  }
  return [...immunities];
}

function processSpecies(raw) {
  const processed = { ...raw };

  // Fix creature type
  processed.creatureType = fixCreatureType(raw);

  // Fix languages
  processed.languages = fixLanguages(raw);

  // Fix natural weapons (remove false positives)
  processed.naturalWeapons = fixNaturalWeapons(raw);

  // Fix darkvision from trait descriptions
  processed.darkvision = extractDarkvisionFromTraits(raw);

  // Fix resistances from trait descriptions
  processed.resistances = extractResistancesFromTraits(raw);

  // Fix condition immunities from trait descriptions
  processed.conditionImmunities = extractConditionImmunitiesFromTraits(raw);

  // Fix innate spells
  processed.innateSpells = fixInnateSpells(raw);

  // Filter traitList to remove non-trait entries
  const skipTraitNames = new Set([
    'creature type', 'type', 'age', 'alignment', 'size', 'speed',
    'languages', 'life span', 'ability score increase'
  ]);
  processed.traitList = (raw.traitList || []).filter(t => {
    const name = (t.name || '').toLowerCase();
    return !skipTraitNames.has(name) && t.description && t.description.length > 5;
  });

  // Remove duplicate traits (same name)
  const seenTraits = new Set();
  processed.traitList = processed.traitList.filter(t => {
    const key = t.name.toLowerCase();
    if (seenTraits.has(key)) return false;
    seenTraits.add(key);
    return true;
  });

  return processed;
}

// ============================================================
// MANUAL CORRECTIONS for known species
// ============================================================

const MANUAL_FIXES = {
  'fairy': {
    creatureType: 'Fey',
    hasFlight: true,
    flightRestriction: 'no medium or heavy armor',
    innateSpells: [
      { spell: 'Druidcraft', levelRequired: 1, frequency: 'at will', spellcastingAbility: 'INT/WIS/CHA' },
      { spell: 'Faerie Fire', levelRequired: 3, frequency: '1/long rest', spellcastingAbility: 'INT/WIS/CHA' },
      { spell: 'Enlarge/Reduce', levelRequired: 5, frequency: '1/long rest', spellcastingAbility: 'INT/WIS/CHA' }
    ],
    traitListAdd: [
      { name: 'Flight', description: 'You have a flying speed equal to your walking speed. To use this speed, you can\'t be wearing medium or heavy armor.' },
      { name: 'Fairy Magic', description: 'You know the Druidcraft cantrip. Starting at 3rd level, you can cast Faerie Fire with this trait. Starting at 5th level, you can cast Enlarge/Reduce with this trait. Once you cast Faerie Fire or Enlarge/Reduce with this trait, you can\'t cast that spell with it again until you finish a long rest. You can also cast either of those spells using any spell slots you have of the appropriate level. Intelligence, Wisdom, or Charisma is your spellcasting ability for these spells.' }
    ]
  },
  'satyr': {
    creatureType: 'Fey',
    darkvision: 0,
    speed: { walk: 35 },
    resistances: [],
    traitListRemove: ['Fey'],
    naturalWeapons: [
      { name: 'Ram', damage: '1d6 + STR bludgeoning', description: 'Unarmed strike with horns.' }
    ],
    traitListAdd: [
      { name: 'Magic Resistance', description: 'You have advantage on saving throws against spells.' },
      { name: 'Mirthful Leaps', description: 'Whenever you make a long or high jump, you can roll a d8 and add the number to the number of feet you cover, even when making a standing jump. This extra distance costs movement as normal.' },
      { name: 'Reveler', description: 'You have proficiency in the Performance and Persuasion skills, and you have proficiency with one musical instrument of your choice.' },
      { name: 'Ram', description: 'You can use your head and horns to make unarmed strikes. When you hit with them, the strike deals 1d6 + your Strength modifier bludgeoning damage.' }
    ]
  },
  'yuan-ti': {
    creatureType: 'Humanoid',
    darkvision: 60,
    resistances: ['poison'],
    conditionImmunities: [],
    traitListRemove: ['Innate Spellcasting', 'Poison Immunity'],
    innateSpells: [
      { spell: 'Poison Spray', levelRequired: 1, frequency: 'at will', spellcastingAbility: 'INT/WIS/CHA' },
      { spell: 'Animal Friendship', levelRequired: 3, frequency: 'PB/long rest', spellcastingAbility: 'INT/WIS/CHA', notes: 'snakes only' },
      { spell: 'Suggestion', levelRequired: 3, frequency: '1/long rest', spellcastingAbility: 'INT/WIS/CHA' }
    ],
    traitListAdd: [
      { name: 'Magic Resistance', description: 'You have advantage on saving throws against spells.' },
      { name: 'Poison Resilience', description: 'You have advantage on saving throws you make to avoid or end the poisoned condition on yourself. You also have resistance to poison damage.' },
      { name: 'Serpentine Spellcasting', description: 'You know the Poison Spray cantrip. Starting at 3rd level, you can cast Animal Friendship (snakes only, PB/long rest) and Suggestion (1/long rest). INT, WIS, or CHA is your spellcasting ability.' }
    ]
  },
  'tortle': {
    creatureType: 'Humanoid',
    naturalArmorAC: 17,
    traitListAdd: [
      { name: 'Shell Defense', description: 'You can withdraw into your shell as an action. Until you emerge, you gain a +4 bonus to your AC, and you have advantage on Strength and Constitution saving throws. While in your shell, you are prone, your speed is 0, you have disadvantage on Dexterity saving throws, and you can\'t take reactions. You can emerge as a bonus action.' },
      { name: 'Hold Breath', description: 'You can hold your breath for up to 1 hour.' },
      { name: 'Natural Armor', description: 'Your shell provides you a base AC of 17 (your Dexterity modifier doesn\'t affect this number). You can\'t wear light, medium, or heavy armor, but if you are using a shield, you can apply the shield\'s bonus as normal.' },
      { name: 'Claws', description: 'You can use your claws to make unarmed strikes. When you hit with them, the strike deals 1d6 + your Strength modifier slashing damage.' }
    ],
    naturalWeapons: [
      { name: 'Claws', damage: '1d6 + STR slashing', description: 'Unarmed strike with claws.' }
    ]
  },
  'firbolg': {
    creatureType: 'Humanoid',
    innateSpells: [
      { spell: 'Detect Magic', levelRequired: 1, frequency: '1/long rest', spellcastingAbility: 'INT/WIS/CHA' },
      { spell: 'Disguise Self', levelRequired: 1, frequency: '1/long rest', spellcastingAbility: 'INT/WIS/CHA' }
    ],
    traitListAdd: [
      { name: 'Hidden Step', description: 'As a bonus action, you can magically turn invisible until the start of your next turn or until you attack, deal damage, or force someone to make a saving throw. You can use this trait a number of times equal to your proficiency bonus, and you regain all expended uses when you finish a long rest.' },
      { name: 'Powerful Build', description: 'You count as one size larger when determining your carrying capacity and the weight you can push, drag, or lift.' },
      { name: 'Speech of Beast and Leaf', description: 'You have the ability to communicate in a limited manner with Beasts, Plants, and vegetation. They can understand the meaning of your words, though you have no special ability to understand them in return.' },
      { name: 'Firbolg Magic', description: 'You can cast Detect Magic and Disguise Self with this trait. When you use this version of Disguise Self, you can seem up to 3 feet shorter or taller. Once you cast either of these spells with this trait, you can\'t cast that spell with it again until you finish a long rest. You can also cast these spells using any spell slots you have of the appropriate level.' }
    ]
  },
  'eladrin': {
    creatureType: 'Humanoid',
    darkvision: 60,
    traitListAdd: [
      { name: 'Fey Ancestry', description: 'You have advantage on saving throws you make to avoid or end the charmed condition on yourself.' },
      { name: 'Fey Step', description: 'As a bonus action, you can magically teleport up to 30 feet to an unoccupied space you can see. You can use this trait a number of times equal to your proficiency bonus, and you regain all expended uses when you finish a long rest. When you reach 3rd level, your Fey Step gains an additional effect based on your season, which you can change when you finish a long rest.' },
      { name: 'Trance', description: 'You don\'t need to sleep, and magic can\'t put you to sleep. You can finish a long rest in 4 hours if you spend those hours in a trancelike meditation. Trance Proficiencies: whenever you finish a long rest, you gain two proficiencies that you don\'t otherwise have.' },
      { name: 'Keen Senses', description: 'You have proficiency in the Perception skill.' }
    ]
  },
  'shadar-kai': {
    creatureType: 'Humanoid',
    darkvision: 60,
    resistances: ['necrotic'],
    traitListAdd: [
      { name: 'Blessing of the Raven Queen', description: 'As a bonus action, you can magically teleport up to 30 feet to an unoccupied space you can see. You can use this trait a number of times equal to your proficiency bonus, and you regain all expended uses when you finish a long rest. Starting at 3rd level, you also gain resistance to all damage when you teleport using this trait. The resistance lasts until the start of your next turn.' },
      { name: 'Fey Ancestry', description: 'You have advantage on saving throws you make to avoid or end the charmed condition on yourself.' },
      { name: 'Trance', description: 'You don\'t need to sleep, and magic can\'t put you to sleep. You can finish a long rest in 4 hours. Trance Proficiencies: whenever you finish a long rest, you gain two proficiencies that you don\'t otherwise have.' },
      { name: 'Necrotic Resistance', description: 'You have resistance to necrotic damage.' }
    ]
  },
  'goblin': {
    creatureType: 'Humanoid',
    darkvision: 60,
    speed: { walk: 30 },
    resistances: [],
    damageImmunities: [],
    traitListRemove: ['Speak with Small Beasts', 'Agile Climber', 'Grit', 'Tribe'],
    traitListAdd: [
      { name: 'Fey Ancestry', description: 'You have advantage on saving throws you make to avoid or end the charmed condition on yourself.' },
      { name: 'Fury of the Small', description: 'When you damage a creature with an attack or a spell and the creature\'s size is larger than yours, you can cause the attack or spell to deal extra damage to the creature. The extra damage equals your proficiency bonus. You can use this trait a number of times equal to your proficiency bonus, regaining all expended uses when you finish a long rest.' },
      { name: 'Nimble Escape', description: 'You can take the Disengage or Hide action as a bonus action on each of your turns.' }
    ]
  },
  'aarakocra': {
    creatureType: 'Humanoid',
    hasFlight: true,
    flightRestriction: 'no medium or heavy armor',
    speed: { walk: 30, fly: 30 },
    naturalWeapons: [
      { name: 'Talons', damage: '1d6 + STR slashing', description: 'Unarmed strike using talons.' }
    ],
    innateSpells: [
      { spell: 'Gust of Wind', levelRequired: 3, frequency: '1/long rest', spellcastingAbility: 'INT/WIS/CHA' }
    ],
    traitListAdd: [
      { name: 'Flight', description: 'You have a flying speed equal to your walking speed. To use this speed, you can\'t be wearing medium or heavy armor.' },
      { name: 'Talons', description: 'You have talons that you can use to make unarmed strikes. When you hit with them, the strike deals 1d6 + your Strength modifier slashing damage.' },
      { name: 'Wind Caller', description: 'Starting at 3rd level, you can cast the Gust of Wind spell with this trait, without requiring a material component. Once you cast the spell with this trait, you can\'t do so again until you finish a long rest. You can also cast the spell using any spell slots you have of 2nd level or higher. Intelligence, Wisdom, or Charisma is your spellcasting ability for it.' }
    ]
  },
  'aasimar': {
    creatureType: 'Humanoid',
    darkvision: 60,
    hasFlight: false, // Celestial Revelation (Radiant Soul) gives 1 min flight 1/long rest — NOT permanent
    resistances: ['necrotic', 'radiant'],
    traitListRemove: ['Necrotic Shroud', 'Radiant Consumption', 'Radiant Soul'],
    innateSpells: [
      { spell: 'Light', levelRequired: 1, frequency: 'at will', spellcastingAbility: 'CHA' }
    ],
    traitListAdd: [
      { name: 'Celestial Resistance', description: 'You have resistance to necrotic damage and radiant damage.' },
      { name: 'Healing Hands', description: 'As an action, you can touch a creature and roll a number of d4s equal to your proficiency bonus. The creature regains hit points equal to the total rolled. Once you use this trait, you can\'t use it again until you finish a long rest.' },
      { name: 'Light Bearer', description: 'You know the Light cantrip. Charisma is your spellcasting ability for it.' },
      { name: 'Celestial Revelation', description: 'When you reach 3rd level, choose one of the following revelation options. You can use a bonus action to unleash the celestial energy within yourself, gaining the benefits of that revelation. Your transformation lasts for 1 minute or until you end it as a bonus action. Once you transform, you can\'t do so again until you finish a long rest. Necrotic Shroud: creatures other than allies within 10 ft that can see you must succeed on a CHA save (DC 8 + prof + CHA mod) or be frightened until end of your next turn; once per turn deal extra necrotic damage equal to your proficiency bonus. Radiant Consumption: shed bright light 10 ft / dim 10 ft; at end of each turn, each creature within 10 ft takes radiant damage equal to your proficiency bonus; once per turn deal extra radiant damage equal to your proficiency bonus. Radiant Soul: gain flying speed equal to walking speed; once per turn deal extra radiant damage equal to your proficiency bonus.' }
    ]
  },
  'changeling': {
    creatureType: 'Fey',
    traitListRemove: ['Change Appearance', 'Unsettling Visage', 'Divergent Persona'],
    traitListAdd: [
      { name: 'Shapechanger', description: 'As an action, you can change your appearance and your voice. You determine the specifics of the changes. You can\'t duplicate the appearance of a creature you\'ve never seen, and you revert to your natural form if you die. You can make yourself appear as a member of another race, though none of your game statistics change. You can also adjust your height and weight between Medium and Small size categories.' },
      { name: 'Changeling Instincts', description: 'You gain proficiency with two of the following skills of your choice: Deception, Insight, Intimidation, or Persuasion.' }
    ],
    skillChoices: { count: 2, from: ['Deception', 'Insight', 'Intimidation', 'Persuasion'] }
  },
  'owlin': {
    source: 'SCC',
    sourceFull: 'Strixhaven: A Curriculum of Chaos',
    creatureType: 'Humanoid',
    darkvision: 120,
    hasFlight: true,
    flightRestriction: 'no medium or heavy armor',
    traitListAdd: [
      { name: 'Darkvision', description: 'You can see in dim light within 120 feet of you as if it were bright light, and in darkness as if it were dim light.' },
      { name: 'Flight', description: 'You have a flying speed equal to your walking speed. To use this speed, you can\'t be wearing medium or heavy armor.' },
      { name: 'Silent Feathers', description: 'You have proficiency in the Stealth skill.' }
    ],
    skillProficiencies: ['Stealth']
  },
  'kalashtar': {
    source: 'ERLW',
    sourceFull: 'Eberron: Rising from the Last War',
    creatureType: 'Humanoid',
    traitListAdd: [
      { name: 'Dual Mind', description: 'You have advantage on all Wisdom saving throws.' },
      { name: 'Mental Discipline', description: 'You have resistance to psychic damage.' },
      { name: 'Mind Link', description: 'You can speak telepathically to any creature you can see, provided the creature is within a number of feet of you equal to 10 times your level. The creature understands you only if the two of you share a language.' },
      { name: 'Severed from Dreams', description: 'Kalashtar sleep, but they don\'t connect to the plane of dreams as other creatures do. Instead, their minds draw from the memories of their otherworldly spirit while they sleep. As such, you are immune to spells and other magical effects that require you to dream, like the Dream spell, but not to spells and effects that put you to sleep, like the Sleep spell.' }
    ],
    resistances: ['psychic']
  },
  'warforged': {
    source: 'ERLW',
    sourceFull: 'Eberron: Rising from the Last War',
    creatureType: 'Humanoid',
    conditionImmunities: ['disease'],
    traitListAdd: [
      { name: 'Constructed Resilience', description: 'You have advantage on saving throws against being poisoned, and you have resistance to poison damage. You don\'t need to eat, drink, or breathe. You are immune to disease. You don\'t need to sleep, and magic can\'t put you to sleep.' },
      { name: 'Sentry\'s Rest', description: 'When you take a long rest, you must spend at least six hours in an inactive, motionless state, rather than sleeping. In this state, you appear inert, but it doesn\'t render you unconscious, and you can see and hear as normal.' },
      { name: 'Integrated Protection', description: 'You gain a +1 bonus to Armor Class. You can don only armor you are proficient with, and it must be incorporated into your body over the course of 1 hour, during which you remain in contact with the armor. To doff armor, you must spend 1 hour removing it. You can rest while donning or doffing armor in this way. While you live, the armor incorporated into your body can\'t be removed against your will.' },
      { name: 'Specialized Design', description: 'You gain one skill proficiency and one tool proficiency of your choice.' }
    ],
    resistances: ['poison']
  },
  'verdan': {
    source: 'AI',
    sourceFull: 'Acquisitions Incorporated',
    creatureType: 'Humanoid'
  },
  'custom': {
    source: 'TCE',
    sourceFull: "Tasha's Cauldron of Everything",
    creatureType: 'Humanoid',
    asiDescription: 'Increase one ability score by 2',
    asiFixed: [{ stat: 'ANY', bonus: 2 }],
    traitListAdd: [
      { name: 'Custom Origin', description: 'Choose a feat for which you qualify. At 1st level, you gain this feat. Choose either darkvision (60 ft) or a skill proficiency.' }
    ]
  },
  'dhampir': {
    creatureType: 'Humanoid',
    darkvision: 60,
    traitListAdd: [
      { name: 'Ancestral Legacy', description: 'If you replace a race with this lineage, you can keep the following elements of that race: any skill proficiencies you gained from it and any climbing, flying, or swimming speed you gained from it. If you don\'t keep any of those elements or you choose this lineage at character creation, you gain proficiency in two skills of your choice.' },
      { name: 'Vampiric Bite', description: 'Your fanged bite is a natural weapon that deals 1d4 + Constitution modifier piercing damage. You gain a bonus equal to the piercing damage to your next ability check or attack roll within the same turn (once per turn). When you use your bite against a willing creature or one grappled/incapacitated/restrained, you can empower yourself for 1 minute: climbing speed equal to walking speed, and bonus to Constitution ability checks and saves equal to Constitution modifier (minimum +1). PB times per long rest.' },
      { name: 'Spider Climb', description: 'You have a climbing speed equal to your walking speed. In addition, at 3rd level, you can move up, down, and across vertical surfaces and upside down along ceilings, while leaving your hands free.' },
      { name: 'Deathless Nature', description: 'You don\'t need to breathe.' }
    ]
  },
  'hexblood': {
    creatureType: 'Fey',
    darkvision: 60,
    innateSpells: [
      { spell: 'Disguise Self', levelRequired: 1, frequency: '1/long rest', spellcastingAbility: 'INT/WIS/CHA' },
      { spell: 'Hex', levelRequired: 1, frequency: '1/long rest', spellcastingAbility: 'INT/WIS/CHA' }
    ],
    traitListAdd: [
      { name: 'Ancestral Legacy', description: 'If you replace a race with this lineage, you can keep the following elements of that race: any skill proficiencies you gained from it and any climbing, flying, or swimming speed you gained from it. If you don\'t keep any of those elements or you choose this lineage at character creation, you gain proficiency in two skills of your choice.' },
      { name: 'Eerie Token', description: 'You can harmlessly remove a lock of your hair, a tooth, or a fingernail and imbue it with magic. While the token is imbued, you can telepathically speak to and hear from it within 10 miles. You can also cast it as a one-use focus for spells.' },
      { name: 'Hex Magic', description: 'You can cast Disguise Self and Hex once each per long rest. Intelligence, Wisdom, or Charisma is your spellcasting ability.' }
    ]
  },
  'reborn': {
    creatureType: 'Humanoid',
    darkvision: 60,
    traitListAdd: [
      { name: 'Ancestral Legacy', description: 'If you replace a race with this lineage, you can keep the following elements of that race: any skill proficiencies you gained from it and any climbing, flying, or swimming speed you gained from it. If you don\'t keep any of those elements or you choose this lineage at character creation, you gain proficiency in two skills of your choice.' },
      { name: 'Deathless Nature', description: 'You have advantage on saving throws against disease and being poisoned, and you have resistance to poison damage. You don\'t need to eat, drink, or breathe. You don\'t need to sleep and are immune to magic that would put you to sleep. During a long rest, you enter a trancelike state for 4 hours.' },
      { name: 'Knowledge from a Past Life', description: 'When you make an ability check that uses a skill, you can roll a d6 and add the number rolled to the check. You can use this feature a number of times equal to your proficiency bonus, and you regain all expended uses when you finish a long rest.' }
    ],
    resistances: ['poison']
  },

  // ── DECONTAMINATION FIXES ─────────────────────────────────────────────
  // These species had traits from other source books contaminating their data.
  // The scraper combined multiple source book entries into single species.

  'minotaur': {
    // MPMM Minotaur: Horns, Goring Rush, Hammering Horns, Labyrinthine Recall,
    // Imposing Presence. Does NOT have Relentless Endurance / Savage Attacks (Half-Orc).
    creatureType: 'Humanoid',
    hasFlight: false,
    naturalArmorAC: null,
    traitListRemove: ['Relentless Endurance', 'Savage Attacks', 'Natural Weapon', 'Menacing'],
    naturalWeapons: [
      { name: 'Horns', damage: '1d6 + STR piercing', description: 'Unarmed strike with horns.' }
    ]
  },
  'orc': {
    // MPMM Orc: Adrenaline Rush, Powerful Build, Relentless Endurance, Darkvision.
    // Does NOT have Savage Attacks (Half-Orc only), Aggressive / Menacing / Primal Intuition (VGtM).
    traitListRemove: ['Savage Attacks', 'Aggressive', 'Primal Intuition', 'Menacing']
  },
  'elf': {
    // Generic Elf should NOT have permanent flight (Avariel sub-race only).
    // Also remove sub-race specific weapon/magic traits from scraper contamination.
    hasFlight: false,
    traitListRemove: ['Flight', 'Grugach Weapon Training', 'Mul Daya Magic']
  },
  'tiefling': {
    // Standard Tiefling does NOT have flight ("Winged" variant only, mutually exclusive
    // with Infernal Legacy). Also remove the variant trait itself.
    hasFlight: false,
    traitListRemove: ['Winged']
  },
  'simic-hybrid': {
    // Simic Hybrid Carapace is +1 AC bonus (5th level enhancement), NOT a natural armor
    // base AC of 5. The scraper incorrectly parsed it as naturalArmorAC.
    naturalArmorAC: null
  },

  // ── MotM SPECIES — Trait contamination cleanup ────────────────────────
  // Many MotM species had traits from older sources (VGtM, MToF, ERLW, GGtR,
  // SCAG) contaminating their data because the scraper combined all source
  // sections into a single entry.

  'centaur': {
    // MotM Centaur: Fey type, speed 40, Charge, Equine Build, Hooves, Natural Affinity.
    // GGtR contamination: 'Fey' (creature-type-as-trait), 'Survivor'.
    creatureType: 'Fey',
    speed: { walk: 40 },
    traitListRemove: ['Fey', 'Survivor'],
    naturalWeapons: [
      { name: 'Hooves', damage: '1d6 + STR bludgeoning', description: 'Unarmed strike with hooves.' }
    ]
  },
  'lizardfolk': {
    // MotM Lizardfolk: Bite, Hold Breath, Hungry Jaws, Natural Armor (AC 13+DEX),
    // Nature's Intuition. No darkvision. VGtM contamination: Cunning Artisan, Hunter's Lore.
    creatureType: 'Humanoid',
    naturalArmorAC: 13,
    traitListRemove: ['Cunning Artisan', "Hunter's Lore"],
    naturalWeapons: [
      { name: 'Bite', damage: '1d6 + STR slashing', description: 'Unarmed strike with fanged maw.' }
    ]
  },
  'shifter': {
    // MotM Shifter: Bestial Instincts, DV 60, Shifting (PB/long rest, choose subtype).
    // ERLW contamination: 'Keen Senses' (Perception prof, not in MotM).
    creatureType: 'Humanoid',
    darkvision: 60,
    traitListRemove: ['Keen Senses']
  },
  'kobold': {
    // MotM Kobold: DV 60, Draconic Cry (PB/long rest), Kobold Legacy (choose one).
    // VGtM contamination: 'Grovel, Cower, and Beg', 'Pack Tactics'.
    creatureType: 'Humanoid',
    darkvision: 60,
    traitListRemove: ['Grovel, Cower, and Beg', 'Pack Tactics']
  },
  'kenku': {
    // MotM Kenku: Expert Duplication, Kenku Recall (PB/long rest), Mimicry.
    // VGtM contamination: 'Expert Forgery', 'Kenku Training'.
    creatureType: 'Humanoid',
    traitListRemove: ['Expert Forgery', 'Kenku Training']
  },
  'hobgoblin': {
    // MotM Hobgoblin: DV 60, Fey Ancestry, Fey Gift (Help as BA, PB/long rest),
    // Fortune from the Many (PB/long rest). VGtM contamination: 'Martial Training'.
    creatureType: 'Humanoid',
    darkvision: 60,
    traitListRemove: ['Martial Training']
  },
  'githyanki': {
    // MotM Githyanki: Astral Knowledge, Githyanki Psionics (Mage Hand, Jump, Misty Step),
    // Psychic Resilience (resist psychic). MToF contamination: Decadent Mastery,
    // Martial Prodigy (armor/weapon profs), Gith Tables, Fidelity.
    creatureType: 'Humanoid',
    resistances: ['psychic'],
    traitListRemove: ['Decadent Mastery', 'Martial Prodigy', 'Gith Tables', 'Fidelity']
  },
  'githzerai': {
    // MotM Githzerai: Githzerai Psionics (Mage Hand, Shield, Detect Thoughts),
    // Mental Discipline (adv vs charmed/frightened), Psychic Resilience.
    // MToF contamination: Gith Tables, Faith, Courage, Duty (flavor headings).
    creatureType: 'Humanoid',
    resistances: ['psychic'],
    traitListRemove: ['Gith Tables', 'Faith', 'Courage', 'Duty']
  },
  'sea-elf': {
    // MotM Sea Elf: Child of the Sea (swim=walk, breathe air+water), Fey Ancestry,
    // Friend of the Sea, Keen Senses, Trance. MToF contamination: 'Sea Elf Training'.
    creatureType: 'Humanoid',
    darkvision: 60,
    resistances: [],
    traitListRemove: ['Sea Elf Training']
  },
  'deep-gnome': {
    // MotM Deep Gnome: DV 120 (Superior), Gift of the Svirfneblin (Nondetection at will
    // + 1/long rest spell), Gnomish Magic Resistance (adv INT/WIS/CHA saves vs spells),
    // Svirfneblin Camouflage (adv Stealth in rocky terrain).
    // SCAG/MToF contamination: 'Gnome Cunning' (duplicate of Gnomish Magic Resistance),
    // 'Stone Camouflage' (duplicate of Svirfneblin Camouflage).
    creatureType: 'Humanoid',
    darkvision: 120,
    traitListRemove: ['Gnome Cunning', 'Stone Camouflage']
  },
  'duergar': {
    // MotM Duergar: DV 120, Duergar Magic (Enlarge/Reduce, Invisibility), Dwarven
    // Resilience (adv poison saves + resist poison), Psionic Fortitude (adv vs
    // charmed/stunned). SCAG contamination: Duergar Resilience (overlaps Psionic
    // Fortitude), Dwarven Combat Training, Tool Proficiency, Stonecunning.
    creatureType: 'Humanoid',
    darkvision: 120,
    resistances: ['poison'],
    traitListRemove: ['Duergar Resilience', 'Dwarven Combat Training', 'Tool Proficiency', 'Stonecunning']
  },
  'goliath': {
    // MotM Goliath: Little Giant (Powerful Build + Athletics prof), Mountain Born
    // (cold resistance + altitude acclimation), Stone's Endurance (1d12+CON reduce,
    // PB/long rest). VGtM contamination: 'Natural Athlete' and 'Powerful Build'
    // (both folded into Little Giant in MotM).
    creatureType: 'Humanoid',
    resistances: ['cold'],
    traitListRemove: ['Natural Athlete', 'Powerful Build']
  },
  'tabaxi': {
    // MotM Tabaxi: DV 60, Cat's Claws (1d6+STR, climb=walk speed), Cat's Talent
    // (Perception + Stealth prof), Feline Agility. VGtM had climb 20 and 1d4 claws;
    // MotM upgraded climb to = walking speed (30) and claws to 1d6.
    creatureType: 'Humanoid',
    darkvision: 60,
    speed: { walk: 30, climb: 30 },
    naturalWeapons: [
      { name: 'Claws', damage: '1d6 + STR slashing', description: 'Unarmed strike with claws.' }
    ]
  },
  'triton': {
    // MotM Triton: DV 60, Amphibious, Control Air and Water (innate spells),
    // Emissary of the Sea, Guardian of the Depths (cold resist + deep water).
    // VGtM contamination: 'Guardians of the Depths' (plural, different from MotM singular).
    creatureType: 'Humanoid',
    darkvision: 60,
    resistances: ['cold'],
    traitListRemove: ['Guardians of the Depths']
  },

  // ── NON-MotM SPECIES — Data fixes ────────────────────────────────────
  'autognome': {
    // Spelljammer: Construct type, AC 13+DEX, resist poison, immune disease.
    // Scraper contamination: 'Ram' (from another species).
    source: 'SJ',
    sourceFull: 'Spelljammer: Adventures in Space',
    creatureType: 'Construct',
    naturalArmorAC: 13,
    resistances: ['poison'],
    conditionImmunities: ['disease'],
    traitListRemove: ['Ram'],
    traitListAdd: [
      { name: 'Armored Casing', description: 'You are encased in a thin metal or some other durable material. While you aren\'t wearing armor, your base Armor Class is 13 + your Dexterity modifier.' },
      { name: 'Built for Success', description: 'You can add a d4 to one attack roll, ability check, or saving throw you make, and you can do so after seeing the d20 roll but before the effects of the roll are resolved. You can use this trait a number of times equal to your proficiency bonus, and you regain all expended uses when you finish a long rest.' },
      { name: 'Healing Machine', description: 'If the Mending spell is cast on you, you can spend a Hit Die, roll it, and regain a number of hit points equal to the roll plus your Constitution modifier (minimum of 1 hit point). In addition, you benefit from Cure Wounds, Healing Word, Mass Cure Wounds, Mass Healing Word, and Spare the Dying.' },
      { name: 'Mechanical Nature', description: 'You have resistance to poison damage and immunity to disease, and you have advantage on saving throws against being paralyzed or poisoned. You don\'t need to eat, drink, or breathe.' },
      { name: 'Sentry\'s Rest', description: 'When you take a long rest, you spend at least 6 hours in an inactive, motionless state, instead of sleeping. In this state, you appear inert, but you remain conscious.' },
      { name: 'Specialized Design', description: 'You gain proficiency with two tools of your choice, selected from the Player\'s Handbook.' }
    ]
  },
  'giff': {
    // Spelljammer: Humanoid, swim=walk, Astral Spark, Firearms Mastery, Hippo Build.
    // Scraper failed to extract any traits — adding them manually.
    source: 'SJ',
    sourceFull: 'Spelljammer: Adventures in Space',
    creatureType: 'Humanoid',
    speed: { walk: 30, swim: 30 },
    traitListAdd: [
      { name: 'Astral Spark', description: 'When you hit a target with a simple or martial weapon, you can cause the target to take extra force damage equal to your proficiency bonus. You can use this trait a number of times equal to your proficiency bonus, no more than once per turn, and you regain all expended uses when you finish a long rest.' },
      { name: 'Firearms Mastery', description: 'You have proficiency with all firearms and ignore the loading property of any firearm. Attacking at long range with a firearm doesn\'t impose disadvantage on your attack roll.' },
      { name: 'Hippo Build', description: 'You have advantage on Strength-based ability checks and Strength saving throws. In addition, you count as one size larger when determining your carrying capacity and the weight you can push, drag, or lift.' }
    ]
  },
  'leonin': {
    // Mythic Odysseys of Theros: DV 60, speed 35, Claws, Hunter's Instincts, Daunting Roar.
    source: 'MOoT',
    sourceFull: 'Mythic Odysseys of Theros',
    creatureType: 'Humanoid',
    darkvision: 60,
    speed: { walk: 35 },
    naturalWeapons: [
      { name: 'Claws', damage: '1d4 + STR slashing', description: 'Unarmed strike with claws.' }
    ]
  },
  'loxodon': {
    // Guildmasters' Guide to Ravnica: Natural Armor 12+CON.
    source: 'GGtR',
    sourceFull: "Guildmasters' Guide to Ravnica",
    creatureType: 'Humanoid',
    naturalArmorAC: 12
  },
  'plasmoid': {
    // Spelljammer: Ooze type, DV 60, Amorphous, Hold Breath, Natural Resilience
    // (resist poison + adv poison saves), Shape Self.
    source: 'SJ',
    sourceFull: 'Spelljammer: Adventures in Space',
    creatureType: 'Ooze',
    darkvision: 60,
    resistances: ['poison']
  },
  'thri-kreen': {
    // Spelljammer: Monstrosity type, DV 60, Chameleon Carapace (AC 13+DEX),
    // Secondary Arms, Sleepless, Thri-kreen Telepathy.
    source: 'SJ',
    sourceFull: 'Spelljammer: Adventures in Space',
    creatureType: 'Monstrosity',
    darkvision: 60,
    naturalArmorAC: 13
  }
};

// ============================================================
// DRAGONBORN VARIANTS — Split from single page into separate species
// ============================================================

const DRAGONBORN_VARIANTS = [
  {
    name: 'Dragonborn',
    slug: 'dragonborn',
    source: 'PHB',
    sourceFull: "Player's Handbook",
    creatureType: 'Humanoid',
    size: ['Medium'],
    speed: { walk: 30 },
    darkvision: 0,
    languages: ['Common', 'Draconic'],
    asiDescription: 'STR +2, CHA +1',
    asiFixed: [{ stat: 'STR', bonus: 2 }, { stat: 'CHA', bonus: 1 }],
    asiFlexible: false,
    resistances: [],
    traitList: [
      { name: 'Draconic Ancestry', description: 'Choose a dragon type. This determines your breath weapon damage type (acid/cold/fire/lightning/poison) and area (5x30 line or 15ft cone), and your damage resistance.' },
      { name: 'Breath Weapon', description: 'Action: exhale destructive energy in area determined by ancestry. DC = 8 + CON mod + proficiency bonus. 2d6 damage (DEX or CON save for half). Increases to 3d6 at 6th, 4d6 at 11th, 5d6 at 16th. 1/short or long rest.' },
      { name: 'Damage Resistance', description: 'You have resistance to the damage type associated with your draconic ancestry.' }
    ],
    innateSpells: [],
    description: 'Born of dragons, dragonborn walk proudly through a world that greets them with fearful incomprehension. The PHB dragonborn has a breath weapon and damage resistance tied to their draconic ancestry.'
  },
  {
    name: 'Chromatic Dragonborn',
    slug: 'dragonborn',
    source: 'FTD',
    sourceFull: "Fizban's Treasury of Dragons",
    creatureType: 'Humanoid',
    size: ['Medium'],
    speed: { walk: 30 },
    darkvision: 0,
    languages: ['Common', 'Draconic'],
    asiDescription: 'Choose +2/+1 or +1/+1/+1',
    asiFixed: [],
    asiFlexible: true,
    resistances: [],
    traitList: [
      { name: 'Chromatic Ancestry', description: 'Choose Black (acid), Blue (lightning), Green (poison), Red (fire), or White (cold). This determines your breath weapon damage type and your resistance.' },
      { name: 'Breath Weapon', description: 'Action or replace one attack: 15ft cone or 30ft line (5ft wide). DEX save (DC = 8 + CON + prof). 1d10 damage, increasing by 1d10 at 5th, 11th, and 17th level. PB uses per long rest.' },
      { name: 'Draconic Resistance', description: 'You have resistance to the damage type associated with your Chromatic Ancestry.' },
      { name: 'Chromatic Warding', description: 'Starting at 5th level, as an action, you can channel your draconic energy to protect yourself. For 1 minute, you become immune to the damage type associated with your Chromatic Ancestry. Once you use this trait, you can\'t do so again until you finish a long rest.' }
    ],
    innateSpells: [],
    description: 'Fizban\'s chromatic dragonborn. Upgraded breath weapon (PB uses, scales better) plus Chromatic Warding for temporary immunity at 5th level.'
  },
  {
    name: 'Metallic Dragonborn',
    slug: 'dragonborn',
    source: 'FTD',
    sourceFull: "Fizban's Treasury of Dragons",
    creatureType: 'Humanoid',
    size: ['Medium'],
    speed: { walk: 30 },
    darkvision: 0,
    languages: ['Common', 'Draconic'],
    asiDescription: 'Choose +2/+1 or +1/+1/+1',
    asiFixed: [],
    asiFlexible: true,
    resistances: [],
    traitList: [
      { name: 'Metallic Ancestry', description: 'Choose Brass (fire), Bronze (lightning), Copper (acid), Gold (fire), or Silver (cold). This determines your breath weapon damage type and resistance.' },
      { name: 'Breath Weapon', description: 'Action or replace one attack: 15ft cone. DEX save (DC = 8 + CON + prof). 1d10 damage, increasing at 5th/11th/17th level. PB uses per long rest.' },
      { name: 'Draconic Resistance', description: 'You have resistance to the damage type associated with your Metallic Ancestry.' },
      { name: 'Metallic Breath Weapon', description: 'At 5th level, gain a second breath weapon (15ft cone, PB uses/long rest): choose Enervating Breath (CON save or incapacitated until start of your next turn) or Repulsion Breath (STR save or pushed 20 feet).' }
    ],
    innateSpells: [],
    description: 'Fizban\'s metallic dragonborn. Upgraded breath weapon plus a second utility breath at 5th level (incapacitate or push).'
  },
  {
    name: 'Gem Dragonborn',
    slug: 'dragonborn',
    source: 'FTD',
    sourceFull: "Fizban's Treasury of Dragons",
    creatureType: 'Humanoid',
    size: ['Medium'],
    speed: { walk: 30 },
    darkvision: 0,
    languages: ['Common', 'Draconic'],
    asiDescription: 'Choose +2/+1 or +1/+1/+1',
    asiFixed: [],
    asiFlexible: true,
    resistances: [],
    hasFlight: true,
    flightRestriction: 'equal to walking speed, 1 minute, PB/long rest',
    traitList: [
      { name: 'Gem Ancestry', description: 'Choose Amethyst (force), Crystal (radiant), Emerald (psychic), Sapphire (thunder), or Topaz (necrotic). This determines your breath weapon damage type and resistance.' },
      { name: 'Breath Weapon', description: 'Action or replace one attack: 15ft cone. DEX save (DC = 8 + CON + prof). 1d10 damage, increasing at 5th/11th/17th level. PB uses per long rest.' },
      { name: 'Draconic Resistance', description: 'You have resistance to the damage type associated with your Gem Ancestry.' },
      { name: 'Psionic Mind', description: 'You can send telepathic messages to any creature you can see within 30 feet. You don\'t need to share a language, but the creature must understand at least one language.' },
      { name: 'Gem Flight', description: 'Starting at 5th level, you can use a bonus action to manifest spectral wings that last for 1 minute. You gain a flying speed equal to your walking speed. PB uses per long rest.' }
    ],
    innateSpells: [],
    description: 'Fizban\'s gem dragonborn. Psionic damage types, telepathy, and limited flight at 5th level.'
  }
];

// Mountain Dwarf variant — needs separate entry for builds
const MOUNTAIN_DWARF = {
  name: 'Mountain Dwarf',
  slug: 'dwarf',
  source: 'PHB',
  sourceFull: "Player's Handbook",
  creatureType: 'Humanoid',
  size: ['Medium'],
  speed: { walk: 25 },
  darkvision: 60,
  languages: ['Common', 'Dwarvish'],
  asiDescription: 'STR +2, CON +2',
  asiFixed: [{ stat: 'STR', bonus: 2 }, { stat: 'CON', bonus: 2 }],
  asiFlexible: false,
  resistances: ['poison'],
  conditionImmunities: [],
  armorProficiencies: ['light', 'medium'],
  weaponProficiencies: ['battleaxe', 'handaxe', 'light hammer', 'warhammer'],
  toolProficiencies: [],
  traitList: [
    { name: 'Dwarven Resilience', description: 'You have advantage on saving throws against poison, and you have resistance to poison damage.' },
    { name: 'Dwarven Combat Training', description: 'You have proficiency with the battleaxe, handaxe, light hammer, and warhammer.' },
    { name: 'Dwarven Armor Training', description: 'You have proficiency with light and medium armor.' },
    { name: 'Stonecunning', description: 'Whenever you make an Intelligence (History) check related to the origin of stonework, you are considered proficient in the History skill and add double your proficiency bonus to the check.' },
    { name: 'Tool Proficiency', description: 'You gain proficiency with the artisan\'s tools of your choice: smith\'s tools, brewer\'s supplies, or mason\'s tools.' }
  ],
  innateSpells: [],
  description: 'Mountain dwarves are strong and hardy, with light and medium armor proficiency and +2 STR/+2 CON — the best ASI in the PHB for martial multiclass builds.',
  hasFlight: false,
  naturalArmorAC: null,
  naturalWeapons: []
};

// ============================================================
// MAIN SEED FUNCTION
// ============================================================

async function seed() {
  await mongoose.connect(process.env.MONGODB_URI);
  console.log('Connected to MongoDB');

  // Read scraped data
  const rawDataPath = path.join(__dirname, 'data', 'species-raw.json');
  if (!fs.existsSync(rawDataPath)) {
    console.error('ERROR: species-raw.json not found. Run scrape-species.js first.');
    process.exit(1);
  }
  const rawData = JSON.parse(fs.readFileSync(rawDataPath, 'utf-8'));
  console.log(`Loaded ${rawData.length} scraped species`);

  // Process all species
  const allSpecies = [];

  // 1. Add manually-defined dragonborn variants
  for (const db of DRAGONBORN_VARIANTS) {
    allSpecies.push(db);
  }
  // Add Mountain Dwarf
  allSpecies.push(MOUNTAIN_DWARF);

  // 2. Process scraped species (skip dragonborn since we manually defined variants)
  const skipSlugs = new Set(['dragonborn']); // Already handled above

  for (const raw of rawData) {
    if (skipSlugs.has(raw.slug)) continue;

    // Apply post-processing fixes
    let processed = processSpecies(raw);

    // Apply manual fixes if available
    const fix = MANUAL_FIXES[raw.slug];
    if (fix) {
      // Process trait removals FIRST (before additions or other overrides)
      if (fix.traitListRemove) {
        const removeNames = new Set(fix.traitListRemove.map(n => n.toLowerCase()));
        processed.traitList = (processed.traitList || []).filter(
          t => !removeNames.has((t.name || '').toLowerCase())
        );
      }

      // Then apply all other fixes
      for (const [key, val] of Object.entries(fix)) {
        if (key === 'traitListRemove') continue; // Already handled above
        if (key === 'traitListAdd') {
          // Append traits, avoiding duplicates
          const existingNames = new Set((processed.traitList || []).map(t => t.name.toLowerCase()));
          for (const trait of val) {
            if (!existingNames.has(trait.name.toLowerCase())) {
              processed.traitList.push(trait);
            }
          }
        } else {
          processed[key] = val;
        }
      }
    }

    allSpecies.push(processed);
  }

  console.log(`Total species to seed: ${allSpecies.length}`);

  // Clear existing species
  await Species.deleteMany({});
  console.log('Cleared existing species');

  // Insert all species
  let inserted = 0;
  let errors = 0;
  for (const sp of allSpecies) {
    try {
      // Clean up for MongoDB
      const doc = {
        name: sp.name,
        slug: sp.slug,
        source: sp.source || '',
        sourceFull: sp.sourceFull || '',
        description: sp.description || '',
        creatureType: sp.creatureType || 'Humanoid',
        size: sp.size || ['Medium'],
        speed: sp.speed || { walk: 30 },
        darkvision: sp.darkvision || 0,
        languages: sp.languages || ['Common'],
        asiDescription: sp.asiDescription || '',
        asiFixed: sp.asiFixed || [],
        asiFlexible: sp.asiFlexible || false,
        resistances: sp.resistances || [],
        damageImmunities: sp.damageImmunities || [],
        conditionImmunities: sp.conditionImmunities || [],
        innateSpells: sp.innateSpells || [],
        hasFlight: sp.hasFlight || false,
        flightRestriction: sp.flightRestriction || null,
        naturalArmorAC: sp.naturalArmorAC || null,
        naturalWeapons: sp.naturalWeapons || [],
        armorProficiencies: sp.armorProficiencies || [],
        weaponProficiencies: sp.weaponProficiencies || [],
        toolProficiencies: sp.toolProficiencies || [],
        skillProficiencies: sp.skillProficiencies || [],
        skillChoices: sp.skillChoices || null,
        traitList: sp.traitList || [],
        variants: sp.variants || [],
        rawText: (sp.rawText || '').substring(0, 5000),
        // Legacy fields — null unless manually set
        tier: sp.tier || null,
        nonSpellAbilities: sp.nonSpellAbilities || [],
        socialKit: sp.socialKit || null,
        combatNotes: sp.combatNotes || null,
        flavorText: sp.flavorText || null
      };

      await Species.create(doc);
      inserted++;
    } catch (err) {
      console.error(`  ✗ Error inserting ${sp.name}: ${err.message}`);
      errors++;
    }
  }

  console.log(`\n=== SEED COMPLETE ===`);
  console.log(`Inserted: ${inserted}`);
  console.log(`Errors: ${errors}`);
  console.log(`Total in collection: ${await Species.countDocuments()}`);

  // Print summary
  console.log('\n--- Species Summary ---');
  const summary = await Species.find({}, 'name source creatureType darkvision hasFlight').sort({ name: 1 });
  for (const s of summary) {
    const flags = [];
    if (s.creatureType !== 'Humanoid') flags.push(s.creatureType);
    if (s.darkvision > 0) flags.push(`DV${s.darkvision}`);
    if (s.hasFlight) flags.push('Flight');
    console.log(`  ${s.name} (${s.source}) ${flags.length > 0 ? '— ' + flags.join(', ') : ''}`);
  }

  await mongoose.disconnect();
}

seed().catch(err => {
  console.error('Fatal error:', err);
  process.exit(1);
});
