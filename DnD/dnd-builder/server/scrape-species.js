/**
 * scrape-species.js — Scrapes ALL D&D 5e species from dnd5e.wikidot.com
 * 
 * Usage: node server/scrape-species.js
 * Output: server/data/species-raw.json (array of parsed species objects)
 * 
 * Uses Node 20 built-in fetch with browser User-Agent to bypass wikidot ad redirects.
 * Parses HTML with cheerio into structured species data.
 */

const cheerio = require('cheerio');
const fs = require('fs');
const path = require('path');

const BASE_URL = 'https://dnd5e.wikidot.com';
const HEADERS = {
  'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36',
  'Accept': 'text/html,application/xhtml+xml'
};

// Delay between requests to be respectful
const DELAY_MS = 800;

// Species slugs to skip (UA duplicates of published versions)
const UA_SLUGS = new Set([
  'autognome-ua', 'giff-ua', 'glitchling-ua', 'hadozee-ua',
  'kender-ua', 'kender-ua-revised', 'owlfolk-ua', 'plasmoid-ua',
  'rabbitfolk-ua', 'revenant-ua', 'thri-kreen-ua', 'viashino-ua'
]);

// Source book abbreviation mapping
const SOURCE_MAP = {
  "Player's Handbook": 'PHB',
  "Mordenkainen Presents: Monsters of the Multiverse": 'MPMM',
  "Monsters of the Multiverse": 'MPMM',
  "Mordenkainen's Monsters of the Multiverse": 'MPMM',
  "Fizban's Treasury of Dragons": 'FTD',
  "Mordenkainen's Tome of Foes": 'MTF',
  "Sword Coast Adventurer's Guide": 'SCAG',
  "Volo's Guide to Monsters": 'VGM',
  "Eberron: Rising from the Last War": 'ERLW',
  "Guildmasters' Guide to Ravnica": 'GGR',
  "Mythic Odysseys of Theros": 'MOT',
  "The Wild Beyond the Witchlight": 'WBtW',
  "Van Richten's Guide to Ravenloft": 'VRG',
  "Astral Adventurer's Guide": 'AAG',
  "Spelljammer: Adventures in Space": 'SJ',
  "Explorer's Guide to Wildemount": 'EGtW',
  "Tasha's Cauldron of Everything": 'TCE',
  "Elemental Evil Player's Companion": 'EEPC',
  "One Grung Above": 'OGA',
  "Locathah Rising": 'LR',
  "Acquisitions Incorporated": 'AI',
  "Plane Shift: Kaladesh": 'PSK',
  "Plane Shift: Amonkhet": 'PSA',
  "Plane Shift: Ixalan": 'PSI',
  "Plane Shift: Zendikar": 'PSZ',
  "Plane Shift: Innistrad": 'PSIn',
  "Plane Shift: Dominaria": 'PSD',
  "Dragonlance: Shadow of the Dragon Queen": 'DSotDQ',
  "Unearthed Arcana": 'UA'
};

function getAbbrev(sourceFull) {
  for (const [key, val] of Object.entries(SOURCE_MAP)) {
    if (sourceFull.includes(key)) return val;
  }
  if (sourceFull.toLowerCase().includes('unearthed arcana')) return 'UA';
  return sourceFull;
}

// Slug to display name
function slugToName(slug) {
  const special = {
    'custom': 'Custom Lineage',
    'elf-astral': 'Astral Elf',
    'sea-elf': 'Sea Elf',
    'deep-gnome': 'Deep Gnome',
    'half-elf': 'Half-Elf',
    'half-orc': 'Half-Orc',
    'shadar-kai': 'Shadar-Kai',
    'yuan-ti': 'Yuan-Ti',
    'genasi-air': 'Air Genasi',
    'genasi-earth': 'Earth Genasi',
    'genasi-fire': 'Fire Genasi',
    'genasi-water': 'Water Genasi',
    'simic-hybrid': 'Simic Hybrid',
    'thri-kreen': 'Thri-kreen'
  };
  if (special[slug]) return special[slug];
  return slug.split('-').map(w => w.charAt(0).toUpperCase() + w.slice(1)).join(' ');
}

async function sleep(ms) {
  return new Promise(resolve => setTimeout(resolve, ms));
}

async function fetchPage(slug) {
  const url = `${BASE_URL}/lineage:${slug}`;
  console.log(`  Fetching ${url}...`);
  try {
    const resp = await fetch(url, { headers: HEADERS, redirect: 'follow' });
    if (!resp.ok) {
      console.warn(`  ⚠ HTTP ${resp.status} for ${slug}`);
      return null;
    }
    const html = await resp.text();
    if (html.length < 1000 || html.includes('inmobi') || html.includes('scalibur')) {
      console.warn(`  ⚠ Ad redirect detected for ${slug}, retrying...`);
      await sleep(2000);
      const resp2 = await fetch(url, { headers: HEADERS, redirect: 'follow' });
      return resp2.ok ? await resp2.text() : null;
    }
    return html;
  } catch (err) {
    console.error(`  ✗ Error fetching ${slug}: ${err.message}`);
    return null;
  }
}

function parseSpeciesPage(html, slug) {
  const $ = cheerio.load(html);
  const pageContent = $('#page-content');
  if (!pageContent.length) return null;

  const result = {
    name: slugToName(slug),
    slug: slug,
    source: '',
    sourceFull: '',
    description: '',
    creatureType: 'Humanoid',
    size: ['Medium'],
    speed: { walk: 30 },
    darkvision: 0,
    languages: ['Common'],
    asiDescription: '',
    asiFixed: [],
    asiFlexible: false,
    resistances: [],
    damageImmunities: [],
    conditionImmunities: [],
    innateSpells: [],
    hasFlight: false,
    flightRestriction: null,
    naturalArmorAC: null,
    naturalWeapons: [],
    armorProficiencies: [],
    weaponProficiencies: [],
    toolProficiencies: [],
    skillProficiencies: [],
    traitList: [],
    variants: [],
    rawText: ''
  };

  // Get all text for raw storage and parsing
  const rawText = pageContent.text().replace(/\s+/g, ' ').trim();
  result.rawText = rawText.substring(0, 8000); // Cap for storage

  // Identify source sections using the collapsible blocks or headings
  // WikiDot uses specific patterns for section headers
  const sections = [];
  let currentSource = '';
  let currentSourceFull = '';
  let currentVariant = '';
  let currentTraits = [];
  let currentText = '';

  // Strategy: Walk through all elements in page-content
  // Source book names appear as direct text children or in specific heading-like elements
  // Traits appear as bold text followed by descriptions

  // First, try to identify the primary source (MPMM appears first on most pages)
  const tocItems = [];
  pageContent.find('.yui-nav li a, .collapsible-block-folded a, .collapsible-block-unfolded .collapsible-block-link').each(function() {
    tocItems.push($(this).text().trim());
  });

  // Parse the HTML structure
  // The page typically has collapsible sections per source book
  // Or direct content sections separated by source headings

  // Get all direct children divs/elements
  const contentHtml = pageContent.html();

  // Extract sections by finding source book markers
  // Common pattern: source name appears in bold or as a heading before traits
  const sourceBookNames = [
    "Monsters of the Multiverse", "Mordenkainen Presents: Monsters of the Multiverse",
    "Player's Handbook", "Fizban's Treasury of Dragons",
    "Mordenkainen's Tome of Foes", "Sword Coast Adventurer's Guide",
    "Volo's Guide to Monsters", "Eberron: Rising from the Last War",
    "Guildmasters' Guide to Ravnica", "Mythic Odysseys of Theros",
    "The Wild Beyond the Witchlight", "Van Richten's Guide to Ravenloft",
    "Astral Adventurer's Guide", "Spelljammer: Adventures in Space",
    "Explorer's Guide to Wildemount", "Tasha's Cauldron of Everything",
    "Elemental Evil Player's Companion", "One Grung Above",
    "Locathah Rising", "Acquisitions Incorporated",
    "Dragonlance: Shadow of the Dragon Queen"
  ];

  // Parse trait blocks: Look for bold text (trait names) followed by descriptions
  function parseTraitsFromElement(el) {
    const traits = [];
    let currentTraitName = '';
    let currentTraitDesc = '';

    // Walk through child nodes
    $(el).children().each(function() {
      const tag = this.tagName?.toLowerCase();
      const text = $(this).text().trim();

      if (!text) return;

      // Bold/strong = trait name
      if (tag === 'strong' || tag === 'b') {
        // Save previous trait
        if (currentTraitName && currentTraitDesc) {
          traits.push({ name: currentTraitName, description: currentTraitDesc.trim() });
        }
        currentTraitName = text.replace(/\.$/, '');
        currentTraitDesc = '';
      } else if (tag === 'p') {
        // Paragraph might contain embedded bold
        const boldInP = $(this).find('strong, b').first();
        if (boldInP.length) {
          // Save previous
          if (currentTraitName && currentTraitDesc) {
            traits.push({ name: currentTraitName, description: currentTraitDesc.trim() });
          }
          currentTraitName = boldInP.text().trim().replace(/\.$/, '');
          currentTraitDesc = text.replace(boldInP.text().trim(), '').trim();
        } else if (currentTraitName) {
          currentTraitDesc += ' ' + text;
        }
      } else if (currentTraitName) {
        currentTraitDesc += ' ' + text;
      }
    });

    // Save last trait
    if (currentTraitName && currentTraitDesc) {
      traits.push({ name: currentTraitName, description: currentTraitDesc.trim() });
    }
    return traits;
  }

  // Simpler approach: parse the full text line by line looking for patterns
  function parseFromText(text) {
    const data = {
      creatureType: 'Humanoid',
      size: ['Medium'],
      speed: { walk: 30 },
      darkvision: 0,
      languages: ['Common'],
      asiDescription: '',
      asiFixed: [],
      asiFlexible: false,
      resistances: [],
      damageImmunities: [],
      conditionImmunities: [],
      innateSpells: [],
      hasFlight: false,
      flightRestriction: null,
      naturalArmorAC: null,
      naturalWeapons: [],
      traits: []
    };

    // Creature Type
    const ctMatch = text.match(/creature type is\s+(\w+)/i) ||
                    text.match(/type\.\s*you(?:r creature type)? (?:are|is)\s+(\w+)/i);
    if (ctMatch) data.creatureType = ctMatch[1];

    // Size
    const sizeMatch = text.match(/your size is (Small or Medium|Medium or Small|Small|Medium|Large)/i);
    if (sizeMatch) {
      const s = sizeMatch[1];
      if (s.toLowerCase().includes(' or ')) {
        data.size = s.split(' or ').map(x => x.trim());
      } else {
        data.size = [s];
      }
    }

    // Speed
    const speedMatch = text.match(/(?:base )?walking speed (?:is |of )(\d+)/i);
    if (speedMatch) data.speed.walk = parseInt(speedMatch[1]);

    // Flying speed
    const flyMatch = text.match(/flying speed (?:of |is |equal to )(?:your (?:walking|base) speed|(\d+))/i);
    if (flyMatch) {
      data.hasFlight = true;
      data.speed.fly = flyMatch[1] ? parseInt(flyMatch[1]) : data.speed.walk;
    }
    if (text.match(/you (?:can fly|have (?:a )?(?:natural )?flight|can use.*to fly)/i)) {
      data.hasFlight = true;
      if (!data.speed.fly) data.speed.fly = data.speed.walk;
    }
    // Flight restriction
    if (data.hasFlight) {
      const flightRestrict = text.match(/(?:can't|cannot) (?:use this (?:flying|flight).*?|fly.*?)(?:while|if|when).*?(?:wearing|medium|heavy)/i) ||
                             text.match(/(?:medium or heavy armor|heavy armor).*?(?:fly|flight)/i) ||
                             text.match(/(?:fly|flight).*?(?:medium or heavy armor|heavy armor)/i);
      if (flightRestrict) {
        data.flightRestriction = 'no medium or heavy armor';
      }
    }

    // Swimming speed
    const swimMatch = text.match(/swimming speed (?:of |is )(\d+)/i);
    if (swimMatch) data.speed.swim = parseInt(swimMatch[1]);

    // Climbing speed
    const climbMatch = text.match(/climbing speed (?:of |is )(\d+)/i);
    if (climbMatch) data.speed.climb = parseInt(climbMatch[1]);

    // Darkvision
    const dvMatch = text.match(/darkvision.*?(\d+)\s*(?:ft|feet)/i);
    if (dvMatch) data.darkvision = parseInt(dvMatch[1]);

    // Superior Darkvision override
    const sdvMatch = text.match(/superior darkvision.*?(\d+)\s*(?:ft|feet)/i);
    if (sdvMatch) data.darkvision = parseInt(sdvMatch[1]);

    // Languages
    const langMatch = text.match(/(?:speak|read|write)[, ]+(?:and )?(?:read[, ]+(?:and )?)?(?:write[, ]+(?:and )?)?(.+?)(?:\.|You)/i);
    if (langMatch) {
      const langStr = langMatch[1];
      const langs = langStr.split(/,\s*(?:and\s+)?|\s+and\s+/)
        .map(l => l.trim())
        .filter(l => l && l.length < 30 && !l.includes('your choice'));
      if (langs.length > 0) data.languages = langs;
    }

    // ASI
    const asiPatterns = text.match(/ability score(?:s)?\s+(?:increase|each increase)\.?\s*(.+?)(?:Age|Alignment|Size|\.(?:\s+[A-Z]))/is);
    if (asiPatterns) {
      const asiText = asiPatterns[1].trim();
      data.asiDescription = asiText.substring(0, 200);

      // Check for flexible ASI (MPMM style)
      if (asiText.match(/increase one.*?by 2.*?another.*?by 1/i) ||
          asiText.match(/three different.*?by 1/i) ||
          asiText.match(/choose/i)) {
        data.asiFlexible = true;
      }

      // Extract fixed ASI
      const statMatches = asiText.matchAll(/(\w+) score increases? by (\d)/gi);
      for (const m of statMatches) {
        const stat = m[1].toUpperCase().substring(0, 3);
        if (['STR', 'DEX', 'CON', 'INT', 'WIS', 'CHA'].includes(stat)) {
          data.asiFixed.push({ stat, bonus: parseInt(m[2]) });
        }
      }
      // "each increase by 1" pattern (human)
      if (asiText.match(/each increase by 1/i)) {
        data.asiFixed = [
          { stat: 'STR', bonus: 1 }, { stat: 'DEX', bonus: 1 },
          { stat: 'CON', bonus: 1 }, { stat: 'INT', bonus: 1 },
          { stat: 'WIS', bonus: 1 }, { stat: 'CHA', bonus: 1 }
        ];
      }
    }

    // Resistances
    const resMatches = text.matchAll(/resistance to (\w+) damage/gi);
    for (const m of resMatches) {
      const dmgType = m[1].toLowerCase();
      if (!data.resistances.includes(dmgType)) data.resistances.push(dmgType);
    }

    // Damage immunities
    const immMatches = text.matchAll(/(?:immune|immunity) to (\w+) damage/gi);
    for (const m of immMatches) {
      const dmgType = m[1].toLowerCase();
      if (!data.damageImmunities.includes(dmgType)) data.damageImmunities.push(dmgType);
    }

    // Condition immunities
    if (text.match(/can(?:'t|not) be (?:put to sleep|charmed).*magic/i) ||
        text.match(/advantage on saving throws against being charmed/i)) {
      // Fey Ancestry / Magic Resistance - note as trait, not full immunity
    }
    if (text.match(/immune to (?:the )?poison(?:ed)? condition/i) ||
        text.match(/can(?:'t|not) be poisoned/i)) {
      if (!data.conditionImmunities.includes('poisoned')) data.conditionImmunities.push('poisoned');
    }
    if (text.match(/immune to disease/i)) {
      if (!data.conditionImmunities.includes('disease')) data.conditionImmunities.push('disease');
    }

    // Natural Armor
    const nacMatch = text.match(/(?:natural armor|shell).*?(?:AC|armor class).*?(\d+)/i) ||
                     text.match(/(?:AC|armor class).*?(?:equals?\s+)?(\d+).*?(?:natural|shell|carapace)/i);
    if (nacMatch) data.naturalArmorAC = parseInt(nacMatch[1]);

    // Natural Weapons
    const clawMatch = text.match(/((?:claws?|talons?|bite|horns?|fangs?|ram|tusks?))\.\s*(.+?)(?:\.|$)/im);
    if (clawMatch) {
      const dmgMatch = clawMatch[2].match(/(\d+d\d+(?:\s*\+\s*\w+)?)\s*(\w+)\s*damage/i);
      data.naturalWeapons.push({
        name: clawMatch[1],
        damage: dmgMatch ? `${dmgMatch[1]} ${dmgMatch[2]}` : clawMatch[2].substring(0, 100),
        description: clawMatch[2].substring(0, 200)
      });
    }

    return data;
  }

  // === MAIN PARSING ===

  // Get full page text
  const fullText = pageContent.text();

  // Identify the FIRST (most recent) source section
  // MPMM pages: the first content block after TOC is usually the MPMM version
  // For the primary version, parse the first substantial text block

  // Find all collapsible blocks (wikidot uses these for source sections)
  const blocks = [];
  pageContent.find('.collapsible-block').each(function() {
    const blockText = $(this).text().trim();
    // Try to identify the source from the block's heading
    let sourceName = '';
    $(this).find('.collapsible-block-link').each(function() {
      sourceName = $(this).text().trim();
    });
    if (!sourceName) {
      // Check first line
      const firstLine = blockText.split('\n')[0]?.trim();
      if (firstLine && firstLine.length < 100) sourceName = firstLine;
    }
    blocks.push({ source: sourceName, text: blockText });
  });

  // If no collapsible blocks, the content is directly in page-content
  if (blocks.length === 0) {
    // Parse the entire page as one section
    const parsed = parseFromText(fullText);
    Object.assign(result, parsed);

    // Find the source from the text
    for (const srcName of sourceBookNames) {
      if (fullText.includes(srcName)) {
        result.sourceFull = srcName;
        result.source = getAbbrev(srcName);
        break;
      }
    }

    // Extract traits from the HTML structure
    result.traitList = extractTraits(pageContent, $);
  } else {
    // Multiple source blocks - pick the best one
    // Priority: MPMM > FTD > TCE > latest book > PHB
    const priority = ['MPMM', 'FTD', 'TCE', 'AAG', 'WBtW', 'VRG', 'MOT', 'GGR', 'ERLW', 'MTF', 'VGM', 'SCAG', 'PHB'];

    let bestBlock = null;
    let bestPriority = Infinity;

    for (const block of blocks) {
      const abbrev = getAbbrev(block.source);
      const idx = priority.indexOf(abbrev);
      if (idx !== -1 && idx < bestPriority) {
        bestPriority = idx;
        bestBlock = block;
      }
    }

    // If no priority match, use first block (usually the most recent)
    if (!bestBlock && blocks.length > 0) {
      bestBlock = blocks[0];
    }

    if (bestBlock) {
      const parsed = parseFromText(bestBlock.text);
      Object.assign(result, parsed);
      result.sourceFull = bestBlock.source;
      result.source = getAbbrev(bestBlock.source);
    }

    // Store other blocks as variants
    for (const block of blocks) {
      if (block === bestBlock) continue;
      const varParsed = parseFromText(block.text);
      result.variants.push({
        name: block.source,
        source: getAbbrev(block.source),
        sourceFull: block.source,
        ...varParsed,
        rawText: block.text.substring(0, 3000)
      });
    }
  }

  // Parse innate spellcasting from the full text of the primary version
  result.innateSpells = extractInnateSpells(result.rawText || fullText);

  // Extract first paragraph as description
  const firstP = pageContent.find('p').first().text().trim();
  if (firstP && firstP.length > 50 && !firstP.match(/^(Ability|Age|Alignment|Size|Speed)/)) {
    result.description = firstP.substring(0, 500);
  }

  // If no traitList yet, extract from parsed text
  if (result.traitList.length === 0) {
    result.traitList = extractTraitsFromText(result.rawText || fullText);
  }

  return result;
}

function extractTraits(pageContent, $) {
  const traits = [];
  const seen = new Set();

  // Find bold elements followed by text = trait patterns
  pageContent.find('strong, b').each(function() {
    const name = $(this).text().trim().replace(/\.$/, '');
    if (!name || name.length > 50) return;

    // Skip source book names, common headers
    const skip = ['Ability Score Increase', 'Age', 'Alignment', 'Size', 'Speed',
      'Languages', 'Darkvision', 'Superior Darkvision', 'Table of Contents',
      'Fold', 'Unfold', 'Variant'];
    if (skip.some(s => name.toLowerCase() === s.toLowerCase())) return;
    if (seen.has(name.toLowerCase())) return;

    // Get the description (text after the bold element)
    let desc = '';
    const parent = $(this).parent();
    if (parent.length) {
      desc = parent.text().replace(name, '').trim();
      if (desc.startsWith('.')) desc = desc.substring(1).trim();
    }

    if (desc && desc.length > 10) {
      seen.add(name.toLowerCase());
      traits.push({ name, description: desc.substring(0, 500) });
    }
  });

  return traits;
}

function extractTraitsFromText(text) {
  const traits = [];
  const seen = new Set();

  // Common trait name patterns from D&D species
  const traitPatterns = [
    'Fey Ancestry', 'Magic Resistance', 'Brave', 'Lucky', 'Halfling Nimbleness',
    'Trance', 'Keen Senses', 'Relentless Endurance', 'Savage Attacks',
    'Celestial Resistance', 'Healing Hands', 'Light Bearer',
    'Draconic Ancestry', 'Breath Weapon', 'Damage Resistance',
    'Gnome Cunning', 'Natural Illusionist', 'Speak with Small Beasts',
    'Skill Versatility', 'Menacing', 'Stone Cunning',
    'Infernal Legacy', 'Hellish Resistance', 'Nimble Escape',
    'Fury of the Small', 'Fairy Magic', 'Flight',
    'Hidden Step', 'Powerful Build', 'Speech of Beast and Leaf',
    'Firbolg Magic', 'Fey Step', 'Blessing of the Raven Queen',
    'Necrotic Resistance', 'Shell Defense', 'Hold Breath',
    'Draconic Cry', 'Chromatic Warding', 'Metallic Breath Weapon',
    'Gem Flight', 'Psionic Mind', 'Telepathic Reprisal',
    'Mirthful Leaps', 'Reveler', 'Ram', 'Innate Spellcasting',
    'Magic Resistance', 'Poison Immunity', 'Animal Friendship',
    'Poison Spray', 'Suggestion', 'Changeling Instincts',
    'Shapechanger', 'Astral Fire', 'Astral Trance',
    'Githyanki Psionics', 'Githzerai Psionics', 'Mental Discipline',
    'Kenku Recall', 'Expert Duplication', 'Leporine Senses',
    'Lucky Footwork', 'Rabbit Hop', 'Silent Feathers',
    'Cat\'s Claws', 'Cat\'s Talent', 'Feline Agility',
    'Control Air', 'Amphibious', 'Emissary of the Sea',
    'Guardian of the Depths', 'Constructed Resilience',
    'Sentry\'s Rest', 'Integrated Protection', 'Specialized Design'
  ];

  for (const traitName of traitPatterns) {
    const regex = new RegExp(`${traitName.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')}\\.?\\s*(.+?)(?=\\.|$)`, 'i');
    const match = text.match(regex);
    if (match && !seen.has(traitName.toLowerCase())) {
      seen.add(traitName.toLowerCase());
      traits.push({
        name: traitName,
        description: match[1].trim().substring(0, 500)
      });
    }
  }

  return traits;
}

function extractInnateSpells(text) {
  const spells = [];
  const seen = new Set();

  // Pattern: "you know the X cantrip"
  const cantripMatch = text.matchAll(/you (?:know|learn) the\s+(\w[\w\s]+?)\s+cantrip/gi);
  for (const m of cantripMatch) {
    const spell = m[1].trim();
    if (!seen.has(spell.toLowerCase())) {
      seen.add(spell.toLowerCase());
      spells.push({
        spell,
        levelRequired: 1,
        frequency: 'at will',
        spellcastingAbility: extractSpellAbility(text)
      });
    }
  }

  // Pattern: "starting at 3rd level, you can cast X"
  const levelSpellPatterns = [
    { regex: /(?:once you|starting at|when you) reach (\d+)(?:st|nd|rd|th) level.*?cast (?:the\s+)?(\w[\w'\s]+?)(?:\s+spell|\s+once|\s+with)/gi, group: [1, 2] },
    { regex: /at (\d+)(?:st|nd|rd|th) level.*?cast (?:the\s+)?(\w[\w'\s]+?)(?:\s+spell|\s+once|\s+with)/gi, group: [1, 2] },
    { regex: /(?:you can (?:also )?cast|can cast) (?:the\s+)?(\w[\w'\s]+?)\s+(?:spell\s+)?(?:once|with this|a number)/gi, levelDefault: 1, group: [1] }
  ];

  for (const pattern of levelSpellPatterns) {
    const matches = text.matchAll(pattern.regex);
    for (const m of matches) {
      let level, spell;
      if (pattern.group.length === 2) {
        level = parseInt(m[pattern.group[0]]);
        spell = m[pattern.group[1]].trim();
      } else {
        level = pattern.levelDefault || 1;
        spell = m[pattern.group[0]].trim();
      }

      // Clean up spell name
      spell = spell.replace(/\s+(once|with|without|a number).*$/i, '').trim();

      // Skip non-spell text
      if (spell.length > 40 || spell.match(/^(this|that|these|your|each|one)/i)) continue;

      if (!seen.has(spell.toLowerCase())) {
        seen.add(spell.toLowerCase());
        spells.push({
          spell,
          levelRequired: level,
          frequency: '1/long rest',
          spellcastingAbility: extractSpellAbility(text)
        });
      }
    }
  }

  return spells;
}

function extractSpellAbility(text) {
  const match = text.match(/(Intelligence|Wisdom|Charisma) is your spellcasting ability/i) ||
                text.match(/spellcasting ability.*?(Intelligence|Wisdom|Charisma)/i) ||
                text.match(/(Intelligence|Wisdom|Charisma).*?spellcasting ability/i);
  if (match) {
    const stat = match[1].toLowerCase();
    if (stat === 'intelligence') return 'INT';
    if (stat === 'wisdom') return 'WIS';
    if (stat === 'charisma') return 'CHA';
  }
  // Check for choice
  if (text.match(/Intelligence, Wisdom, or Charisma/i)) return 'INT/WIS/CHA';
  return null;
}

async function getSpeciesSlugs() {
  console.log('Fetching species index page...');
  const html = await fetchPage('');
  if (!html) {
    console.error('Failed to fetch index page, using hardcoded list');
    return getHardcodedSlugs();
  }

  const $ = cheerio.load(html);
  const slugs = new Set();
  $('a[href*="/lineage:"]').each(function() {
    const href = $(this).attr('href');
    const match = href.match(/\/lineage:(.+)/);
    if (match && match[1]) {
      const slug = match[1];
      if (!UA_SLUGS.has(slug)) slugs.add(slug);
    }
  });

  console.log(`Found ${slugs.size} non-UA species`);
  return [...slugs];
}

function getHardcodedSlugs() {
  return [
    'dragonborn', 'dwarf', 'elf', 'gnome', 'half-elf', 'half-orc', 'halfling', 'human', 'tiefling',
    'custom', 'aarakocra', 'aasimar', 'changeling', 'deep-gnome', 'duergar', 'eladrin', 'fairy',
    'firbolg', 'genasi-air', 'genasi-earth', 'genasi-fire', 'genasi-water', 'githyanki', 'githzerai',
    'goliath', 'harengon', 'kenku', 'locathah', 'owlin', 'satyr', 'sea-elf', 'shadar-kai',
    'tabaxi', 'tortle', 'triton', 'verdan', 'bugbear', 'centaur', 'goblin', 'grung', 'hobgoblin',
    'kobold', 'lizardfolk', 'minotaur', 'orc', 'shifter', 'yuan-ti', 'kender', 'kalashtar',
    'warforged', 'aetherborn', 'aven', 'khenra', 'kor', 'merfolk', 'naga', 'siren', 'vampire',
    'dhampir', 'hexblood', 'reborn', 'loxodon', 'simic-hybrid', 'vedalken', 'elf-astral',
    'autognome', 'giff', 'hadozee', 'plasmoid', 'thri-kreen', 'leonin'
  ];
}

async function main() {
  console.log('=== D&D 5e Species Scraper ===\n');

  // Ensure output directory exists
  const dataDir = path.join(__dirname, 'data');
  if (!fs.existsSync(dataDir)) fs.mkdirSync(dataDir, { recursive: true });

  // Get list of species slugs
  const slugs = await getSpeciesSlugs();
  console.log(`\nScraping ${slugs.length} species pages...\n`);

  const results = [];
  const failed = [];

  for (let i = 0; i < slugs.length; i++) {
    const slug = slugs[i];
    console.log(`[${i + 1}/${slugs.length}] ${slug}`);

    const html = await fetchPage(slug);
    if (!html) {
      failed.push(slug);
      console.log(`  ✗ Failed`);
      await sleep(DELAY_MS);
      continue;
    }

    const parsed = parseSpeciesPage(html, slug);
    if (parsed) {
      results.push(parsed);
      console.log(`  ✓ ${parsed.name} — ${parsed.source || 'unknown source'} — ${parsed.traitList.length} traits, ${parsed.innateSpells.length} spells, ${parsed.variants.length} variants`);
    } else {
      failed.push(slug);
      console.log(`  ✗ Failed to parse`);
    }

    // Save raw HTML for debugging
    const htmlDir = path.join(dataDir, 'html');
    if (!fs.existsSync(htmlDir)) fs.mkdirSync(htmlDir, { recursive: true });
    fs.writeFileSync(path.join(htmlDir, `${slug}.html`), html, 'utf-8');

    await sleep(DELAY_MS);
  }

  // Save parsed results
  const outputPath = path.join(dataDir, 'species-raw.json');
  fs.writeFileSync(outputPath, JSON.stringify(results, null, 2), 'utf-8');
  console.log(`\n=== RESULTS ===`);
  console.log(`Parsed: ${results.length} species`);
  console.log(`Failed: ${failed.length} — ${failed.join(', ')}`);
  console.log(`Output: ${outputPath}`);

  if (failed.length > 0) {
    console.log(`\nFailed slugs saved to: ${path.join(dataDir, 'species-failed.json')}`);
    fs.writeFileSync(path.join(dataDir, 'species-failed.json'), JSON.stringify(failed, null, 2), 'utf-8');
  }
}

main().catch(err => {
  console.error('Fatal error:', err);
  process.exit(1);
});
