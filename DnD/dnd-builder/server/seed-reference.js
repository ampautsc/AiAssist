// seed-reference.js — Populates all reference collections for character management
// Run: node server/seed-reference.js
// Does NOT touch existing Build, Species, Feat, Item collections from seed.js

const mongoose = require('mongoose');
const path = require('path');
const https = require('https');
require('dotenv').config({ path: path.resolve(__dirname, '../.env') });

const Spell = require(path.resolve(__dirname, './models/Spell'));
const ClassFeature = require(path.resolve(__dirname, './models/ClassFeature'));
const Skill = require(path.resolve(__dirname, './models/Skill'));
const Background = require(path.resolve(__dirname, './models/Background'));
const LevelProgression = require(path.resolve(__dirname, './models/LevelProgression'));
const Condition = require(path.resolve(__dirname, './models/Condition'));
const Feat = require(path.resolve(__dirname, './models/Feat'));

// ─── HELPERS ────────────────────────────────────────────────────────────────

function fetchJson(url) {
  return new Promise((resolve, reject) => {
    https.get(url, { headers: { 'Accept': 'application/json' } }, (res) => {
      let data = '';
      res.on('data', chunk => data += chunk);
      res.on('end', () => {
        try { resolve(JSON.parse(data)); }
        catch (e) { reject(new Error(`Failed to parse JSON from ${url}: ${e.message}`)); }
      });
    }).on('error', reject);
  });
}

function sleep(ms) { return new Promise(r => setTimeout(r, ms)); }

// ─── SPELLS ─────────────────────────────────────────────────────────────────

// Bard tactical analysis - what makes each spell good/bad for a Lore Bard
const BARD_SPELL_NOTES = {
  // === CANTRIPS ===
  'vicious-mockery':     { rating: 9, tags: ['control','debuff'], notes: 'Best Bard cantrip. Psychic damage + disadvantage on next attack. Your go-to when not casting leveled spells.' },
  'minor-illusion':      { rating: 8, tags: ['utility','social'], notes: 'Free cover, distractions, fake sounds. Creativity is your only limit.' },
  'prestidigitation':    { rating: 7, tags: ['utility','social'], notes: 'Flavor swiss army knife. Clean clothes, light candles, make smells. RP gold.' },
  'mage-hand':           { rating: 6, tags: ['utility'], notes: 'Invisible with Telekinetic. 30ft manipulation.' },
  'message':             { rating: 5, tags: ['utility','social'], notes: 'Silent party communication. Useful but situational.' },
  'light':               { rating: 4, tags: ['utility'], notes: 'If no one has darkvision. Usually redundant.' },
  'dancing-lights':      { rating: 4, tags: ['utility'], notes: 'Concentration = DO NOT TAKE. Uses your most valuable resource for a flashlight.' },
  'mending':             { rating: 3, tags: ['utility'], notes: 'Fix things. Very niche, but occasionally clutch.' },
  'true-strike':         { rating: 1, tags: ['offense'], notes: 'Worst cantrip in the game. Never take this.' },

  // === 1ST LEVEL ===
  'healing-word':        { rating: 10, tags: ['healing'], notes: 'MUST TAKE. Bonus action 60ft range. Picks up downed allies from safety. Never not prepare this.' },
  'silvery-barbs':       { rating: 10, tags: ['control','debuff'], notes: 'Reaction: force reroll on enemy success + give ally advantage. Best 1st-level spell in the game.' },
  'faerie-fire':         { rating: 9, tags: ['control','buff'], notes: 'DEX save. Advantage on all attacks vs affected creatures. Concentration but worth it at low levels.' },
  'dissonant-whispers':  { rating: 8, tags: ['damage','control'], notes: 'WIS save. Psychic damage + forced movement (provokes OAs). Single target but efficient.' },
  'hideous-laughter':    { rating: 8, tags: ['control'], notes: 'WIS save. Target prone + incapacitated. Concentration. Great single-target CC at Lv1.' },
  'charm-person':        { rating: 7, tags: ['social','control'], notes: 'Social encounters. Target knows they were charmed afterward — use carefully.' },
  'sleep':               { rating: 7, tags: ['control'], notes: 'No save. Devastating at Lv1, useless by Lv5. Swap out as you level.' },
  'detect-magic':        { rating: 7, tags: ['utility','exploration'], notes: 'Ritual castable. Know whats magical around you. Essential dungeon tool.' },
  'comprehend-languages':{ rating: 6, tags: ['utility','social'], notes: 'Ritual. Understand any language for 1 hour. Tongues is better at Lv3.' },
  'feather-fall':        { rating: 6, tags: ['utility'], notes: 'Reaction, no concentration. Saves lives when it matters. Niche but irreplaceable.' },
  'disguise-self':       { rating: 6, tags: ['social','utility'], notes: 'Free from Firbolg. Otherwise decent social/infiltration spell.' },
  'heroism':             { rating: 5, tags: ['buff'], notes: 'Temp HP per turn + immune to frightened. Concentration = competing with better spells.' },
  'bane':                { rating: 5, tags: ['debuff'], notes: 'CHA save. -1d4 to attacks and saves. Concentration. Fine but Faerie Fire is usually better.' },
  'unseen-servant':      { rating: 4, tags: ['utility'], notes: 'Ritual. Invisible butler. Creative uses but rarely combat-relevant.' },
  'animal-friendship':   { rating: 3, tags: ['social'], notes: 'WIS save. Beast only. Very niche.' },
  'speak-with-animals':  { rating: 3, tags: ['social','exploration'], notes: 'Ritual. Firbolg gets this free essentially. Fun RP, rarely critical.' },
  'thunderwave':         { rating: 3, tags: ['damage'], notes: 'Con save AoE. You are not a damage caster. Skip.' },
  'longstrider':         { rating: 3, tags: ['buff'], notes: '+10 speed, no concentration. Fine but not worth a spell known.' },
  'identify':            { rating: 3, tags: ['utility'], notes: 'Ritual. Short rest already identifies most items in most games.' },
  'silent-image':        { rating: 3, tags: ['utility'], notes: 'Concentration + action to modify. Too action-expensive for a Bard.' },
  'illusory-script':     { rating: 2, tags: ['utility'], notes: 'Ritual. Secret messages. Extremely niche.' },

  // === 2ND LEVEL ===
  'suggestion':          { rating: 10, tags: ['control','social'], notes: 'WIS save. "That sounds reasonable" = target does it. Encounter-ending social spell. Concentration.' },
  'hold-person':         { rating: 9, tags: ['control'], notes: 'WIS save. Paralyzed = auto-crit in melee. Concentration. Humanoids only.' },
  'heat-metal':          { rating: 9, tags: ['damage','control'], notes: 'CON save. Ongoing damage + disadvantage. No repeated save to end it. Best sustained damage spell for Bard.' },
  'invisibility':        { rating: 8, tags: ['utility','social'], notes: 'Concentration. Scouting, infiltration, escape. Upcast = multiple targets.' },
  'silence':             { rating: 8, tags: ['control','utility'], notes: 'Concentration. 20ft radius. Shuts down casters entirely. Combo with grapple.' },
  'lesser-restoration':  { rating: 7, tags: ['healing'], notes: 'Remove disease, blinded, deafened, paralyzed, poisoned. No concentration. Essential utility.' },
  'enhance-ability':     { rating: 7, tags: ['buff','social'], notes: 'Concentration. Advantage on ability checks of chosen type. Great for social scenes.' },
  'detect-thoughts':     { rating: 7, tags: ['social','utility'], notes: 'Concentration. Read surface thoughts, probe deeper with WIS save. Interrogation tool.' },
  'calm-emotions':       { rating: 6, tags: ['social','control'], notes: 'Suppress charmed/frightened OR make hostile creatures indifferent. Social encounter reset button.' },
  'blindness-deafness':  { rating: 6, tags: ['debuff'], notes: 'CON save. No concentration! Blind = attacks at disadvantage, advantage on attacks against.' },
  'see-invisibility':    { rating: 5, tags: ['utility'], notes: 'No concentration. See invisible creatures and into Ethereal. Situational but irreplaceable when needed.' },
  'zone-of-truth':       { rating: 5, tags: ['social'], notes: 'CHA save. Cant lie in the zone. Good RP, but targets know they were affected.' },
  'shatter':             { rating: 4, tags: ['damage'], notes: 'CON save. AoE damage. Youre not a blaster.' },
  'knock':               { rating: 4, tags: ['utility'], notes: 'Loud. Opens any lock. Useful but alerting.' },
  'magic-mouth':         { rating: 3, tags: ['utility'], notes: 'Ritual. Programmable message. Very niche.' },
  'locate-object':       { rating: 3, tags: ['utility','exploration'], notes: 'Concentration. Find a specific object within 1000ft. Plot-dependent.' },
  'locate-animals-or-plants': { rating: 2, tags: ['utility','exploration'], notes: 'Extremely niche.' },
  'animal-messenger':    { rating: 2, tags: ['utility'], notes: 'Ritual. Send a message via animal. Sending is strictly better at Lv3.' },
  'enthrall':            { rating: 2, tags: ['social'], notes: 'WIS save. Disadvantage on Perception. Concentration. Almost never useful.' },
  'crown-of-madness':    { rating: 1, tags: ['control'], notes: 'Concentration + action each turn to maintain. Worst 2nd-level spell on the Bard list.' },

  // === 3RD LEVEL ===
  'hypnotic-pattern':    { rating: 10, tags: ['control'], notes: 'THE Bard spell. 30ft cube, WIS save, charmed+incapacitated+speed 0. Ends on damage. Mass CC king.' },
  'dispel-magic':        { rating: 9, tags: ['utility'], notes: 'MUST HAVE. Remove any spell effect. Jack of All Trades adds to your ability check. Bards are the best dispellers.' },
  'fear':                { rating: 8, tags: ['control'], notes: 'WIS save. 30ft cone, frightened + forced dash away. Different save than Hypnotic Pattern — take both.' },
  'tongues':             { rating: 7, tags: ['social','utility'], notes: 'No concentration! Understand + speak any language for 1 hour. Better than Comprehend Languages.' },
  'sending':             { rating: 7, tags: ['utility','social'], notes: 'No concentration. 25-word message to anyone on the same plane. Long-range communication.' },
  'bestow-curse':        { rating: 7, tags: ['debuff'], notes: 'Touch. Concentration. Multiple curse options. At 5th level = no concentration. Very flexible.' },
  'speak-with-dead':     { rating: 6, tags: ['social','utility'], notes: 'Corpse answers 5 questions. Incredible for investigation/mystery campaigns.' },
  'major-image':         { rating: 6, tags: ['utility','social'], notes: 'Concentration. Full sensory illusion. Creative tool but action-intensive.' },
  'clairvoyance':        { rating: 5, tags: ['utility','exploration'], notes: 'Concentration. 10 min cast. Remote viewing. Slow but powerful scouting.' },
  'plant-growth':        { rating: 5, tags: ['control','utility'], notes: 'No save, no concentration. Quarter speed in 100ft radius. Terrain control.' },
  'tiny-hut':            { rating: 5, tags: ['utility'], notes: 'Ritual. 8 hours of safe rest. Essential for wilderness campaigns.' },
  'stinking-cloud':      { rating: 4, tags: ['control'], notes: 'CON save. Wastes action on fail. Concentration. Allies are affected too — careful positioning.' },
  'nondetection':        { rating: 3, tags: ['utility'], notes: 'Anti-divination. Very campaign-dependent.' },
  'speak-with-plants':   { rating: 3, tags: ['social','exploration'], notes: 'Niche. Plants are usually boring conversationalists.' },
  'glyph-of-warding':    { rating: 3, tags: ['utility'], notes: 'Cant move it. Expensive (200gp). Defense/trap setup only.' },

  // === 4TH LEVEL (available at Bard 7) ===
  'greater-invisibility': { rating: 9, tags: ['buff','control'], notes: 'Concentration. Invisibility that doesnt break on attack/cast. Insane on a Rogue or on yourself.' },
  'polymorph':           { rating: 9, tags: ['buff','control','utility'], notes: 'WIS save (enemies) or willing (allies). Turn ally into Giant Ape (157 HP). Emergency HP or CC.' },
  'dimension-door':      { rating: 8, tags: ['utility'], notes: 'No concentration. Teleport 500ft + bring one creature. Escape, infiltrate, bypass.' },
  'freedom-of-movement': { rating: 7, tags: ['buff'], notes: 'No concentration! Immune to difficult terrain, paralysis, restraints, underwater. Great pre-buff.' },
  'compulsion':          { rating: 5, tags: ['control'], notes: 'Concentration. WIS save each turn. Forced movement. Clunky and save-heavy.' },
  'confusion':           { rating: 5, tags: ['control'], notes: 'WIS save. Random behavior. Unreliable — Hypnotic Pattern is better.' },
  'hallucinatory-terrain':{ rating: 3, tags: ['utility'], notes: 'Takes 10 minutes to cast. Very niche terrain illusion.' },
  'locate-creature':     { rating: 3, tags: ['utility','exploration'], notes: 'Concentration. Campaign-dependent tracking spell.' },

  // === 5TH LEVEL (available at Bard 9) ===
  'hold-monster':        { rating: 9, tags: ['control'], notes: 'WIS save. Hold Person but works on ANY creature. Paralyzed = auto-crit. Concentration.' },
  'synaptic-static':     { rating: 9, tags: ['damage','debuff'], notes: 'INT save. 8d6 psychic in 20ft sphere + subtract d6 from attacks/saves for 1 minute. No concentration!' },
  'greater-restoration': { rating: 8, tags: ['healing'], notes: 'Remove curse, petrified, charm, stun, stat reduction. The "fix anything" spell.' },
  'mass-cure-wounds':    { rating: 7, tags: ['healing'], notes: '6 creatures in 30ft sphere heal 3d8+mod. Emergency mass healing.' },
  'animate-objects':     { rating: 7, tags: ['damage'], notes: 'Concentration. 10 Tiny objects = 10 attacks at +8 for 1d4+4 each. Best Bard damage spell.' },
  'dominate-person':     { rating: 7, tags: ['control','social'], notes: 'WIS save. Total control of humanoid. Concentration. Breaks on damage.' },
  'seeming':             { rating: 6, tags: ['social','utility'], notes: 'Disguise entire party for 8 hours. No concentration!' },
  'modify-memory':       { rating: 6, tags: ['social'], notes: 'WIS save. Rewrite 10 minutes of memory. Incredibly powerful in social campaigns.' },
  'scrying':             { rating: 5, tags: ['utility'], notes: 'Concentration. 10 min cast. Spy on anyone. Campaign-dependent.' },
  'dream':               { rating: 5, tags: ['utility','social'], notes: 'Message anyone in their sleep. Can deal psychic damage or deny rest. Long-range harassment.' },
  'geas':                { rating: 4, tags: ['control','social'], notes: '1 minute cast time. 5d10 psychic if they disobey. 30 days. Very specific use case.' },
  'mislead':             { rating: 4, tags: ['utility'], notes: 'Concentration. Invisible + illusory double. Greater Invisibility is usually better.' },
  'raise-dead':          { rating: 4, tags: ['healing'], notes: '500gp diamond. Bring back the dead. Essential but hopefully rare.' },
  'legend-lore':         { rating: 3, tags: ['utility'], notes: 'Learn lore about a person/place/thing. Campaign-dependent.' },
  'planar-binding':      { rating: 3, tags: ['utility'], notes: '1 hour cast. Bind a summoned creature. Very niche.' },
  'teleportation-circle':{ rating: 3, tags: ['utility'], notes: 'Permanent teleportation network. Campaign-scale utility.' },
  'awaken':              { rating: 2, tags: ['utility'], notes: 'Give INT to a beast/plant. 8 hour cast. Fun but impractical.' },

  // === 6TH LEVEL ===
  'eyebite':             { rating: 8, tags: ['control'], notes: 'Concentration. Each turn: sleep, panic, or sicken one creature. No save to end — lasts full minute.' },
  'mass-suggestion':     { rating: 8, tags: ['control','social'], notes: 'WIS save. Up to 12 creatures. 24 hours, no concentration! Campaign-warping.' },
  'irresistible-dance':  { rating: 7, tags: ['control'], notes: 'No save first round! Target wastes action dancing. Then WIS save each turn. Single target but reliable.' },
  'true-seeing':         { rating: 5, tags: ['utility'], notes: '1 hour. See through illusions, darkness, invisibility. 25gp component.' },
  'programmed-illusion': { rating: 4, tags: ['utility'], notes: 'Triggered illusion. Very creative but niche.' },
  'guards-and-wards':    { rating: 3, tags: ['utility'], notes: 'Protect a building. Very niche downtime spell.' },
  'find-the-path':       { rating: 2, tags: ['utility','exploration'], notes: 'Know the shortest path somewhere. Rarely needed.' },

  // === 7TH LEVEL ===
  'forcecage':           { rating: 9, tags: ['control'], notes: 'No save. No concentration. Cage or box. Traps anything. One of the best spells in the game.' },
  'teleport':            { rating: 8, tags: ['utility'], notes: 'Instant travel anywhere youve been. Familiarity determines accuracy.' },
  'resurrection':        { rating: 7, tags: ['healing'], notes: '1000gp diamond. Raise dead up to 100 years. Better than Raise Dead.' },
  'regenerate':          { rating: 5, tags: ['healing'], notes: 'Regrow limbs. 1 hour duration. Niche but irreplaceable.' },
  'magnificent-mansion':  { rating: 5, tags: ['utility'], notes: 'Extradimensional mansion for 24 hours. Luxury long rest.' },
  'etherealness':        { rating: 5, tags: ['utility'], notes: 'Enter Ethereal Plane. Scouting through walls.' },
  'project-image':       { rating: 4, tags: ['utility','social'], notes: 'Concentration. Illusory duplicate at any distance. Niche.' },
  'symbol':              { rating: 3, tags: ['utility'], notes: '1000gp. Glyph of Warding but bigger. Very niche.' },
  'mirage-arcane':       { rating: 3, tags: ['utility'], notes: 'Terrain illusion for 10 days. Campaign-scale.' },
  'arcane-sword':        { rating: 2, tags: ['damage'], notes: 'Concentration. Bad damage for a 7th level slot. Never take this.' },

  // === 8TH LEVEL ===
  'feeblemind':          { rating: 9, tags: ['control'], notes: 'INT save. 4d6 psychic + INT/CHA become 1. Creature cant cast spells. INT save to end every 30 days.' },
  'dominate-monster':    { rating: 8, tags: ['control'], notes: 'WIS save. Total control of any creature. Concentration.' },
  'glibness':            { rating: 8, tags: ['social'], notes: 'No concentration! 1 hour. Minimum 15 on CHA checks. Counterspell always succeeds up to 8th level.' },
  'mind-blank':          { rating: 7, tags: ['buff'], notes: 'No concentration! 24 hours. Immune to psychic damage, charm, divination, mind reading.' },
  'power-word-stun':     { rating: 7, tags: ['control'], notes: 'No save if under 150 HP. Stunned until CON save at end of each turn.' },

  // === 9TH LEVEL ===
  'true-polymorph':      { rating: 10, tags: ['buff','control','utility'], notes: 'Permanent transformation after concentration. Turn anything into anything. Campaign-defining.' },
  'foresight':           { rating: 9, tags: ['buff'], notes: 'No concentration! 8 hours. Advantage on everything, cant be surprised, attackers have disadvantage.' },
  'power-word-kill':     { rating: 7, tags: ['damage'], notes: 'No save if under 100 HP. Instant death. Clean but conditional.' },
};

// Key non-Bard spells worth stealing via Magical Secrets (Lore Bard gets at Lv6)
const MAGICAL_SECRETS_CANDIDATES = {
  'counterspell':        { rating: 10, tags: ['control'], notes: 'THE Magical Secrets pick. Reaction counter any spell. Jack of All Trades adds to your check. Bards are the best Counterspellers in the game.', source: 'Wizard/Sorcerer/Warlock' },
  'spirit-guardians':    { rating: 9, tags: ['damage','control'], notes: 'Lore Bard Lv6 pick. 3d8 radiant AoE around you + half speed. Concentration. Turns Bard into zone control monster with Mod Armored.', source: 'Cleric' },
  'aura-of-vitality':    { rating: 8, tags: ['healing'], notes: 'Bonus action 2d6 healing each turn for 1 minute. 20d6 total healing from one 3rd-level slot. Best healing efficiency in the game.', source: 'Paladin' },
  'find-steed':          { rating: 7, tags: ['utility','buff'], notes: 'Permanent intelligent mount. Self-targeting spells affect it too. Concentration spells on both of you.', source: 'Paladin' },
  'pass-without-trace':  { rating: 7, tags: ['utility'], notes: '+10 Stealth to entire party. No concentration on some readings (it is concentration). Party infiltration.', source: 'Druid/Ranger' },
  'shield':              { rating: 7, tags: ['defense'], notes: 'Reaction +5 AC. Expensive Magical Secrets pick for defense, but nothing else gives +5 AC as reaction.', source: 'Wizard/Sorcerer' },
  'haste':               { rating: 7, tags: ['buff'], notes: 'Concentration. Double speed, +2 AC, extra action. Powerful but devastating if concentration drops (target loses a turn).', source: 'Wizard/Sorcerer' },
  'fireball':            { rating: 5, tags: ['damage'], notes: 'Iconic blast but Bards arent blasters. If you want AoE damage, take it. Usually Hypnotic Pattern > Fireball.', source: 'Wizard/Sorcerer' },
  'revivify':            { rating: 6, tags: ['healing'], notes: 'Raise dead within 1 minute. 300gp diamond. If no Cleric in party, someone needs this.', source: 'Cleric/Paladin' },
  'slow':                { rating: 6, tags: ['control'], notes: 'WIS save. -2 AC, half speed, no reactions, maybe lose action. Concentration. Solid but competes with Hypnotic Pattern.', source: 'Wizard/Sorcerer' },
  'wall-of-force':       { rating: 8, tags: ['control'], notes: 'Lv10 Magical Secrets. No save. Impenetrable wall or dome. Splits encounters. Nothing passes through.', source: 'Wizard' },
  'steel-wind-strike':   { rating: 6, tags: ['damage'], notes: 'Lv10. 6d10 force to up to 5 creatures + teleport. Bards best single-turn damage option if you want it.', source: 'Ranger/Wizard' },
  'find-greater-steed':  { rating: 7, tags: ['utility','buff'], notes: 'Lv10. Flying intelligent mount (Pegasus). Self-targeting spells affect both. Incredible utility.', source: 'Paladin' },
  'destructive-wave':    { rating: 5, tags: ['damage','control'], notes: 'Lv10. 5d6+5d6 in 30ft + prone. Con save. AoE nuke + knockdown. Fun but Bards have better options.', source: 'Paladin' },
  'simulacrum':          { rating: 9, tags: ['utility'], notes: 'Lv14. Copy of yourself with half HP. Retains all spell slots. Game-breaking if DM allows it.', source: 'Wizard' },
  'wish':                { rating: 10, tags: ['utility'], notes: 'Lv18. Do anything. The ultimate Magical Secrets pick at high levels.', source: 'Wizard/Sorcerer' },
};

async function seedSpells() {
  await Spell.deleteMany({});
  console.log('Cleared spells collection');

  // Fetch all Bard spells from 5e API
  const bardList = await fetchJson('https://www.dnd5eapi.co/api/2014/classes/bard/spells');
  console.log(`Fetched ${bardList.count} Bard spells from 5e API`);

  const spells = [];
  let fetched = 0;

  for (const entry of bardList.results) {
    const detail = await fetchJson(`https://www.dnd5eapi.co${entry.url}`);
    fetched++;
    if (fetched % 20 === 0) console.log(`  Fetched ${fetched}/${bardList.count} spell details...`);

    const notes = BARD_SPELL_NOTES[entry.index] || {};

    spells.push({
      index: entry.index,
      name: detail.name,
      source: 'PHB',
      level: detail.level,
      school: detail.school?.name || 'Unknown',
      ritual: detail.ritual || false,
      concentration: detail.concentration || false,
      castingTime: detail.casting_time,
      range: detail.range,
      components: detail.components || [],
      material: detail.material || null,
      duration: detail.duration,
      description: detail.desc || [],
      higherLevel: detail.higher_level || [],
      savingThrow: detail.dc?.dc_type?.name?.toUpperCase() || null,
      damageType: detail.damage?.damage_type?.name || null,
      healingSpell: !!(detail.heal_at_slot_level),
      areaOfEffect: detail.area_of_effect ? { type: detail.area_of_effect.type, size: detail.area_of_effect.size } : undefined,
      classes: (detail.classes || []).map(c => c.name),
      subclasses: (detail.subclasses || []).map(s => s.name),
      bardNative: true,
      magicalSecretsCandidate: false,
      tags: notes.tags || [],
      bardRating: notes.rating || 5,
      bardNotes: notes.notes || null,
    });

    // Be nice to the API
    if (fetched % 10 === 0) await sleep(200);
  }

  // Now add Magical Secrets candidates (non-Bard spells)
  for (const [index, meta] of Object.entries(MAGICAL_SECRETS_CANDIDATES)) {
    try {
      const detail = await fetchJson(`https://www.dnd5eapi.co/api/2014/spells/${index}`);
      fetched++;

      spells.push({
        index: index,
        name: detail.name,
        source: 'PHB',
        level: detail.level,
        school: detail.school?.name || 'Unknown',
        ritual: detail.ritual || false,
        concentration: detail.concentration || false,
        castingTime: detail.casting_time,
        range: detail.range,
        components: detail.components || [],
        material: detail.material || null,
        duration: detail.duration,
        description: detail.desc || [],
        higherLevel: detail.higher_level || [],
        savingThrow: detail.dc?.dc_type?.name?.toUpperCase() || null,
        damageType: detail.damage?.damage_type?.name || null,
        healingSpell: !!(detail.heal_at_slot_level),
        areaOfEffect: detail.area_of_effect ? { type: detail.area_of_effect.type, size: detail.area_of_effect.size } : undefined,
        classes: (detail.classes || []).map(c => c.name),
        subclasses: (detail.subclasses || []).map(s => s.name),
        bardNative: false,
        magicalSecretsCandidate: true,
        magicalSecretsNotes: `${meta.source}. ${meta.notes}`,
        tags: meta.tags || [],
        bardRating: meta.rating || 5,
        bardNotes: meta.notes || null,
      });

      if (fetched % 5 === 0) await sleep(200);
    } catch (e) {
      console.warn(`  Could not fetch Magical Secrets spell: ${index} — ${e.message}`);
    }
  }

  // Dedup (some Magical Secrets candidates might already be on Bard list)
  const seen = new Set();
  const deduped = [];
  for (const spell of spells) {
    if (seen.has(spell.index)) {
      // Merge: mark existing bard spell as also a MS candidate
      const existing = deduped.find(s => s.index === spell.index);
      if (existing && spell.magicalSecretsCandidate) {
        existing.magicalSecretsCandidate = true;
        existing.magicalSecretsNotes = spell.magicalSecretsNotes;
      }
      continue;
    }
    seen.add(spell.index);
    deduped.push(spell);
  }

  await Spell.insertMany(deduped);
  console.log(`Seeded ${deduped.length} spells (${spells.filter(s => s.bardNative).length} Bard native, ${Object.keys(MAGICAL_SECRETS_CANDIDATES).length} Magical Secrets candidates)`);
  return deduped.length;
}

// ─── CLASS FEATURES ─────────────────────────────────────────────────────────

async function seedClassFeatures() {
  await ClassFeature.deleteMany({});

  const features = [
    // === BARD BASE CLASS ===
    { name: 'Spellcasting', class: 'Bard', level: 1,
      description: ['You have learned to untangle and reshape the fabric of reality in harmony with your wishes and music. Your spells are part of your vast repertoire, magic that you can tune to different situations.'],
      mechanicalSummary: 'CHA-based full caster. Spells known (not prepared). Ritual casting. Instrument as arcane focus.',
      actionCost: 'Varies', usesPerDay: 'spell slots', tags: ['offense','defense','utility','healing'] },

    { name: 'Bardic Inspiration', class: 'Bard', level: 1,
      description: ['You can inspire others through stirring words or music. To do so, you use a bonus action on your turn to choose one creature other than yourself within 60 feet of you who can hear you. That creature gains one Bardic Inspiration die.', 'Once within the next 10 minutes, the creature can roll the die and add the number rolled to one ability check, attack roll, or saving throw it makes.'],
      mechanicalSummary: 'BA 60ft. Target adds d6/d8/d10/d12 to one check/attack/save. CHA mod uses/long rest.',
      scalesAtLevel: [1, 5, 10, 15], scalingDescription: 'd6 → d8 (Lv5) → d10 (Lv10) → d12 (Lv15)',
      actionCost: 'Bonus Action', usesPerDay: 'CHA mod/long rest', tags: ['support','offense','defense'] },

    { name: 'Jack of All Trades', class: 'Bard', level: 2,
      description: ['Starting at 2nd level, you can add half your proficiency bonus, rounded down, to any ability check you make that doesnt already include your proficiency bonus.'],
      mechanicalSummary: '+half prof to all non-proficient ability checks. Includes initiative, Counterspell, Dispel Magic checks.',
      actionCost: 'Passive', usesPerDay: 'unlimited', tags: ['utility'] },

    { name: 'Song of Rest', class: 'Bard', level: 2,
      description: ['Beginning at 2nd level, you can use soothing music or oration to help revitalize your wounded allies during a short rest. If you or any friendly creatures who can hear your performance regain hit points at the end of the short rest by spending one or more Hit Dice, each of those creatures regains an extra 1d6 hit points.'],
      mechanicalSummary: 'Short rest: allies who spend Hit Dice heal extra d6/d8/d10/d12.',
      scalesAtLevel: [2, 9, 13, 17], scalingDescription: 'd6 → d8 (Lv9) → d10 (Lv13) → d12 (Lv17)',
      actionCost: 'Short Rest', usesPerDay: '1/short rest', tags: ['healing','support'] },

    { name: 'Expertise', class: 'Bard', level: 3,
      description: ['At 3rd level, choose two of your skill proficiencies. Your proficiency bonus is doubled for any ability check you make that uses either of the chosen proficiencies.', 'At 10th level, you can choose another two skill proficiencies to gain this benefit.'],
      mechanicalSummary: 'Double prof bonus on 2 skills (2 more at Lv10). Persuasion + Deception = +11 at Lv8.',
      scalesAtLevel: [3, 10], scalingDescription: '2 skills → 4 skills (Lv10)',
      actionCost: 'Passive', usesPerDay: 'unlimited', tags: ['social','utility'] },

    { name: 'Font of Inspiration', class: 'Bard', level: 5,
      description: ['Beginning when you reach 5th level, you regain all of your expended uses of Bardic Inspiration when you finish a short or long rest.'],
      mechanicalSummary: 'Bardic Inspiration now recharges on SHORT rest.',
      actionCost: 'Passive', usesPerDay: 'unlimited', tags: ['support'] },

    { name: 'Countercharm', class: 'Bard', level: 6,
      description: ['At 6th level, you gain the ability to use musical notes or words of power to disrupt mind-influencing effects. As an action, you can start a performance that lasts until the end of your next turn. During that time, you and any friendly creatures within 30 feet of you have advantage on saving throws against being frightened or charmed.'],
      mechanicalSummary: 'Action: allies in 30ft get advantage on charm/frighten saves until end of next turn.',
      actionCost: 'Action', usesPerDay: 'unlimited', tags: ['defense','support'] },

    { name: 'Magical Secrets', class: 'Bard', level: 10,
      description: ['By 10th level, you have plundered magical knowledge from a wide spectrum of disciplines. Choose two spells from any class, including this one. A spell you choose must be of a level you can cast, as shown on the Bard table, or a cantrip.', 'The chosen spells count as bard spells for you and are included in the number in the Spells Known column of the Bard table.'],
      mechanicalSummary: 'Learn 2 spells from ANY class spell list. They count as Bard spells. Additional 2 at Lv14, Lv18.',
      scalesAtLevel: [10, 14, 18], scalingDescription: '2 spells → 4 total (Lv14) → 6 total (Lv18)',
      actionCost: 'Passive', usesPerDay: 'permanent', tags: ['utility','offense','healing'] },

    { name: 'Ability Score Improvement', class: 'Bard', level: 4,
      description: ['When you reach 4th level, and again at 8th, 12th, 16th, and 19th level, you can increase one ability score of your choice by 2, or you can increase two ability scores of your choice by 1. As normal, you cant increase an ability score above 20 using this feature.', 'Using the optional feats rule, you can forgo taking this feature to take a feat of your choice instead.'],
      mechanicalSummary: 'ASI or Feat at levels 4, 8, 12, 16, 19.',
      scalesAtLevel: [4, 8, 12, 16, 19], scalingDescription: '+2 to one stat or +1 to two, or take a feat',
      actionCost: 'Passive', usesPerDay: 'permanent', tags: [] },

    { name: 'Superior Inspiration', class: 'Bard', level: 20,
      description: ['At 20th level, when you roll initiative and have no uses of Bardic Inspiration left, you regain one use.'],
      mechanicalSummary: 'If you have 0 Bardic Inspiration when rolling initiative, regain 1.',
      actionCost: 'Passive', usesPerDay: 'unlimited', tags: ['support'] },

    // === COLLEGE OF LORE ===
    { name: 'Bonus Proficiencies (Lore)', class: 'Bard', subclass: 'College of Lore', level: 3,
      description: ['When you join the College of Lore at 3rd level, you gain proficiency with three skills of your choice.'],
      mechanicalSummary: '3 additional skill proficiencies. Bard starts with 3, Lore adds 3 = 6 total + background.',
      actionCost: 'Passive', usesPerDay: 'permanent', tags: ['utility','social'] },

    { name: 'Cutting Words', class: 'Bard', subclass: 'College of Lore', level: 3,
      description: ['Also at 3rd level, you learn how to use your wit to distract, confuse, and otherwise sap the confidence and competence of others. When a creature that you can see within 60 feet of you makes an attack roll, an ability check, or a damage roll, you can use your reaction to expend one of your uses of Bardic Inspiration, rolling a Bardic Inspiration die and subtracting the number rolled from the creatures roll.'],
      mechanicalSummary: 'Reaction 60ft: subtract Bardic Inspiration die from enemy attack/check/damage roll.',
      actionCost: 'Reaction', usesPerDay: 'Uses Bardic Inspiration', tags: ['defense','control'] },

    { name: 'Additional Magical Secrets (Lore)', class: 'Bard', subclass: 'College of Lore', level: 6,
      description: ['At 6th level, you learn two spells of your choice from any class. A spell you choose must be of a level you can cast, as shown on the Bard table, or a cantrip. The chosen spells count as bard spells for you but dont count against the number of bard spells you know.'],
      mechanicalSummary: 'Learn 2 spells from ANY class at Lv6 (4 levels before other Bards). These are EXTRA — dont count against spells known.',
      actionCost: 'Passive', usesPerDay: 'permanent', tags: ['utility','offense','healing'] },

    { name: 'Peerless Skill', class: 'Bard', subclass: 'College of Lore', level: 14,
      description: ['Starting at 14th level, when you make an ability check, you can expend one use of Bardic Inspiration. Roll a Bardic Inspiration die and add the number rolled to your ability check. You can choose to do so after you roll the die for the ability check, but before the DM tells you whether you succeed or fail.'],
      mechanicalSummary: 'Add Bardic Inspiration die to your own ability checks. Decide after seeing your roll.',
      actionCost: 'Passive', usesPerDay: 'Uses Bardic Inspiration', tags: ['utility','social'] },
  ];

  await ClassFeature.insertMany(features);
  console.log(`Seeded ${features.length} class features`);
  return features.length;
}

// ─── SKILLS ─────────────────────────────────────────────────────────────────

async function seedSkills() {
  await Skill.deleteMany({});

  const skills = [
    { name: 'Acrobatics', ability: 'DEX', description: 'Balance, tumbling, flips, escaping bindings.', bardProficient: true, expertiseCandidate: false, expertiseNotes: 'Rarely needed for a Bard. Low priority.' },
    { name: 'Animal Handling', ability: 'WIS', description: 'Calm, control, intuit animal behavior.', bardProficient: true, expertiseCandidate: false, expertiseNotes: 'Very niche. Firbolg gets advantage innately with beasts.' },
    { name: 'Arcana', ability: 'INT', description: 'Recall lore about spells, magic items, planes.', bardProficient: true, expertiseCandidate: false, expertiseNotes: 'INT-based. Jack of All Trades already helps. Low CHA synergy.' },
    { name: 'Athletics', ability: 'STR', description: 'Climb, jump, swim, grapple, shove.', bardProficient: true, expertiseCandidate: false, expertiseNotes: 'STR-based. Not your stat. Skip.' },
    { name: 'Deception', ability: 'CHA', description: 'Mislead, fast-talk, con, disguise, lie convincingly.', bardProficient: true, expertiseCandidate: true, expertiseNotes: 'TOP TIER EXPERTISE. CHA-based. Bard staple. +11 at Lv8 with Expertise + CHA 18.' },
    { name: 'History', ability: 'INT', description: 'Recall lore about events, people, nations, wars.', bardProficient: true, expertiseCandidate: false, expertiseNotes: 'INT-based. Jack of All Trades covers it.' },
    { name: 'Insight', ability: 'WIS', description: 'Detect lies, read intentions, sense motives.', bardProficient: true, expertiseCandidate: true, expertiseNotes: 'SOLID EXPERTISE. Detects lies in social encounters. WIS-based but still very useful for a social character.' },
    { name: 'Intimidation', ability: 'CHA', description: 'Threaten, coerce, bully, menace.', bardProficient: true, expertiseCandidate: true, expertiseNotes: 'CHA-based. Good alternative to Persuasion for certain characters.' },
    { name: 'Investigation', ability: 'INT', description: 'Search, deduce, find clues, analyze.', bardProficient: true, expertiseCandidate: false, expertiseNotes: 'INT-based. Useful but Jack of All Trades is usually enough.' },
    { name: 'Medicine', ability: 'WIS', description: 'Stabilize dying, diagnose illness.', bardProficient: true, expertiseCandidate: false, expertiseNotes: 'Healing Word makes this redundant.' },
    { name: 'Nature', ability: 'INT', description: 'Recall lore about terrain, plants, animals, weather.', bardProficient: true, expertiseCandidate: false, expertiseNotes: 'INT-based. Very niche.' },
    { name: 'Perception', ability: 'WIS', description: 'Spot, listen, detect hidden creatures/objects.', bardProficient: true, expertiseCandidate: true, expertiseNotes: 'GOOD EXPERTISE. Most rolled skill in the game. WIS-based but universally useful.' },
    { name: 'Performance', ability: 'CHA', description: 'Entertain, play instruments, act, orate.', bardProficient: true, expertiseCandidate: false, expertiseNotes: 'CHA-based but rarely tested mechanically. RP value only.' },
    { name: 'Persuasion', ability: 'CHA', description: 'Influence, negotiate, convince, charm through speech.', bardProficient: true, expertiseCandidate: true, expertiseNotes: 'TOP TIER EXPERTISE. THE Bard skill. +11 at Lv8. This is why you play a Bard.' },
    { name: 'Religion', ability: 'INT', description: 'Recall lore about deities, rituals, holy symbols.', bardProficient: true, expertiseCandidate: false, expertiseNotes: 'INT-based. Very niche.' },
    { name: 'Sleight of Hand', ability: 'DEX', description: 'Pick pockets, plant items, palm objects.', bardProficient: true, expertiseCandidate: false, expertiseNotes: 'DEX-based. Fun for a grifter build but not core.' },
    { name: 'Stealth', ability: 'DEX', description: 'Hide, sneak, avoid detection.', bardProficient: true, expertiseCandidate: true, expertiseNotes: 'SOLID EXPERTISE. DEX-based but essential for infiltration builds. Firbolg + Hidden Step + Stealth Expertise = ghost.' },
    { name: 'Survival', ability: 'WIS', description: 'Track, forage, navigate, predict weather.', bardProficient: true, expertiseCandidate: false, expertiseNotes: 'WIS-based. Very campaign-dependent. Usually skip.' },
  ];

  await Skill.insertMany(skills);
  console.log(`Seeded ${skills.length} skills`);
  return skills.length;
}

// ─── BACKGROUNDS ────────────────────────────────────────────────────────────

async function seedBackgrounds() {
  await Background.deleteMany({});

  const backgrounds = [
    {
      name: 'Charlatan', source: 'PHB',
      skillProficiencies: ['Deception', 'Sleight of Hand'],
      toolProficiencies: ['Disguise kit', 'Forgery kit'],
      equipment: ['Fine clothes', 'Disguise kit', 'Con tools', '15 gp'],
      feature: { name: 'False Identity', description: 'You have a second identity with documentation, acquaintances, and disguises. You can forge documents.' },
      description: 'You know how to work a crowd, read a mark, and run a con.',
      bardSynergy: 'Perfect for a grifter Bard. Deception proficiency + Disguise kit + False Identity. Stack with Expertise in Deception for +11.',
      bardRating: 9,
    },
    {
      name: 'Criminal / Spy', source: 'PHB',
      skillProficiencies: ['Deception', 'Stealth'],
      toolProficiencies: ["Thieves' tools", 'Gaming set'],
      equipment: ['Crowbar', 'Dark common clothes with hood', '15 gp'],
      feature: { name: 'Criminal Contact', description: 'You have a reliable and trustworthy contact who acts as your liaison to a network of criminals.' },
      description: 'You have a history on the wrong side of the law.',
      bardSynergy: 'Deception + Stealth = infiltration core. Criminal Contact gives you a fence/informant. Great for intrigue campaigns.',
      bardRating: 8,
    },
    {
      name: 'Entertainer', source: 'PHB',
      skillProficiencies: ['Acrobatics', 'Performance'],
      toolProficiencies: ['Disguise kit', 'Musical instrument'],
      equipment: ['Musical instrument', 'Favor of an admirer', 'Costume', '15 gp'],
      feature: { name: 'By Popular Demand', description: 'You can always find a place to perform. Free lodging in exchange for performing.' },
      description: 'You thrive on the spotlight and the stage.',
      bardSynergy: 'Thematic fit but weak skills — Performance is rarely tested, Acrobatics is niche. Free lodging is nice but minor.',
      bardRating: 5,
    },
    {
      name: 'Noble', source: 'PHB',
      skillProficiencies: ['History', 'Persuasion'],
      toolProficiencies: ['Gaming set'],
      languages: 1,
      equipment: ['Fine clothes', 'Signet ring', 'Scroll of pedigree', '25 gp'],
      feature: { name: 'Position of Privilege', description: 'People assume the best of you. Welcome in high society. Common folk make every effort to accommodate you.' },
      description: 'You understand wealth, power, and privilege.',
      bardSynergy: 'Persuasion proficiency from background frees up Bard skill picks. Position of Privilege opens social doors. Good starting gold.',
      bardRating: 7,
    },
    {
      name: 'Courtier', source: 'SCAG',
      skillProficiencies: ['Insight', 'Persuasion'],
      languages: 2,
      equipment: ['Fine clothes', '5 gp'],
      feature: { name: 'Court Functionary', description: 'You know the inner workings of government and can navigate bureaucracies with ease.' },
      description: 'You know the courts and the people who run them.',
      bardSynergy: 'BEST BARD BACKGROUND. Insight + Persuasion = two top-tier Bard skills from background. Two languages. Court access.',
      bardRating: 10,
    },
    {
      name: 'Urban Bounty Hunter', source: 'SCAG',
      skillProficiencies: ['Deception', 'Insight'],
      toolProficiencies: ['Gaming set', "Thieves' tools"],
      equipment: ['Appropriate clothes', '20 gp'],
      feature: { name: 'Ear to the Ground', description: 'You have contacts in every town who can provide information about criminals and their lairs.' },
      description: 'You track people for coin in the city streets.',
      bardSynergy: 'Deception + Insight = social powerhouse. Ear to the Ground = urban information network. Strong for city campaigns.',
      bardRating: 8,
    },
    {
      name: 'Sage', source: 'PHB',
      skillProficiencies: ['Arcana', 'History'],
      languages: 2,
      equipment: ['Ink', 'Quill', 'Small knife', 'Letter from dead colleague', 'Common clothes', '10 gp'],
      feature: { name: 'Researcher', description: 'When you dont know a piece of lore, you know where to find it.' },
      description: 'You spent years learning the lore of the multiverse.',
      bardSynergy: 'INT-based skills dont synergize well, but Researcher feature is useful for knowledge Bards. Two languages.',
      bardRating: 5,
    },
    {
      name: 'Far Traveler', source: 'SCAG',
      skillProficiencies: ['Insight', 'Perception'],
      toolProficiencies: ['Musical instrument'],
      languages: 1,
      equipment: ['Travelers clothes', 'Musical instrument or gaming set', 'Maps', '5 gp'],
      feature: { name: 'All Eyes on You', description: 'Your accent, mannerisms, and appearance mark you as foreign. People are curious about you and your homeland.' },
      description: 'You come from a distant place few have heard of.',
      bardSynergy: 'Insight + Perception = two of the best WIS skills. All Eyes on You gives natural social hooks. Musical instrument tool.',
      bardRating: 7,
    },
    {
      name: 'Faction Agent', source: 'SCAG',
      skillProficiencies: ['Insight'],
      toolProficiencies: [],
      languages: 2,
      equipment: ['Faction badge', 'Copy of faction text', 'Common clothes', '15 gp'],
      feature: { name: 'Safe Haven', description: 'You can find safe houses, fellow faction members, and supplies from your faction network.' },
      description: 'You serve an organization that operates across the realm.',
      bardSynergy: 'Insight + choice of second skill. Safe Haven gives network access. Two languages. Flexible.',
      bardRating: 7,
    },
    {
      name: 'Guild Artisan', source: 'PHB',
      skillProficiencies: ['Insight', 'Persuasion'],
      toolProficiencies: ['Artisan tools'],
      languages: 1,
      equipment: ['Artisan tools', 'Letter of introduction', 'Travelers clothes', '15 gp'],
      feature: { name: 'Guild Membership', description: 'Your guild provides lodging, food, and legal protection. You can access guildhalls in any city.' },
      description: 'You are a member of a guild of craftspeople.',
      bardSynergy: 'Insight + Persuasion = same as Courtier. Guild Membership provides social network. Strong alternative to Courtier.',
      bardRating: 8,
    },
  ];

  await Background.insertMany(backgrounds);
  console.log(`Seeded ${backgrounds.length} backgrounds`);
  return backgrounds.length;
}

// ─── LEVEL PROGRESSION ──────────────────────────────────────────────────────

async function seedLevelProgression() {
  await LevelProgression.deleteMany({});

  // Bard level 1–20 from 5e SRD
  const levels = [
    { level: 1,  proficiencyBonus: 2, cantripsKnown: 2, spellsKnown: 4,  spellSlots: {1:2,2:0,3:0,4:0,5:0,6:0,7:0,8:0,9:0}, bardicInspirationDie: 6,  songOfRestDie: 0,  magicalSecretsSlots: 0, features: ['Spellcasting','Bardic Inspiration (d6)'] },
    { level: 2,  proficiencyBonus: 2, cantripsKnown: 2, spellsKnown: 5,  spellSlots: {1:3,2:0,3:0,4:0,5:0,6:0,7:0,8:0,9:0}, bardicInspirationDie: 6,  songOfRestDie: 6,  magicalSecretsSlots: 0, features: ['Jack of All Trades','Song of Rest (d6)'] },
    { level: 3,  proficiencyBonus: 2, cantripsKnown: 2, spellsKnown: 6,  spellSlots: {1:4,2:2,3:0,4:0,5:0,6:0,7:0,8:0,9:0}, bardicInspirationDie: 6,  songOfRestDie: 6,  magicalSecretsSlots: 0, features: ['Expertise','Bard College','Bonus Proficiencies (Lore)','Cutting Words'] },
    { level: 4,  proficiencyBonus: 2, cantripsKnown: 3, spellsKnown: 7,  spellSlots: {1:4,2:3,3:0,4:0,5:0,6:0,7:0,8:0,9:0}, bardicInspirationDie: 6,  songOfRestDie: 6,  magicalSecretsSlots: 0, features: ['ASI / Feat'] },
    { level: 5,  proficiencyBonus: 3, cantripsKnown: 3, spellsKnown: 8,  spellSlots: {1:4,2:3,3:2,4:0,5:0,6:0,7:0,8:0,9:0}, bardicInspirationDie: 8,  songOfRestDie: 6,  magicalSecretsSlots: 0, features: ['Bardic Inspiration (d8)','Font of Inspiration'] },
    { level: 6,  proficiencyBonus: 3, cantripsKnown: 3, spellsKnown: 9,  spellSlots: {1:4,2:3,3:3,4:0,5:0,6:0,7:0,8:0,9:0}, bardicInspirationDie: 8,  songOfRestDie: 6,  magicalSecretsSlots: 2, features: ['Countercharm','Additional Magical Secrets (Lore)'] },
    { level: 7,  proficiencyBonus: 3, cantripsKnown: 3, spellsKnown: 10, spellSlots: {1:4,2:3,3:3,4:1,5:0,6:0,7:0,8:0,9:0}, bardicInspirationDie: 8,  songOfRestDie: 6,  magicalSecretsSlots: 2, features: [] },
    { level: 8,  proficiencyBonus: 3, cantripsKnown: 3, spellsKnown: 11, spellSlots: {1:4,2:3,3:3,4:2,5:0,6:0,7:0,8:0,9:0}, bardicInspirationDie: 8,  songOfRestDie: 6,  magicalSecretsSlots: 2, features: ['ASI / Feat'] },
    { level: 9,  proficiencyBonus: 4, cantripsKnown: 3, spellsKnown: 12, spellSlots: {1:4,2:3,3:3,4:3,5:1,6:0,7:0,8:0,9:0}, bardicInspirationDie: 8,  songOfRestDie: 8,  magicalSecretsSlots: 2, features: ['Song of Rest (d8)'] },
    { level: 10, proficiencyBonus: 4, cantripsKnown: 4, spellsKnown: 14, spellSlots: {1:4,2:3,3:3,4:3,5:2,6:0,7:0,8:0,9:0}, bardicInspirationDie: 10, songOfRestDie: 8,  magicalSecretsSlots: 4, features: ['Expertise','Bardic Inspiration (d10)','Magical Secrets'] },
    { level: 11, proficiencyBonus: 4, cantripsKnown: 4, spellsKnown: 15, spellSlots: {1:4,2:3,3:3,4:3,5:2,6:1,7:0,8:0,9:0}, bardicInspirationDie: 10, songOfRestDie: 8,  magicalSecretsSlots: 4, features: [] },
    { level: 12, proficiencyBonus: 4, cantripsKnown: 4, spellsKnown: 15, spellSlots: {1:4,2:3,3:3,4:3,5:2,6:1,7:0,8:0,9:0}, bardicInspirationDie: 10, songOfRestDie: 8,  magicalSecretsSlots: 4, features: ['ASI / Feat'] },
    { level: 13, proficiencyBonus: 5, cantripsKnown: 4, spellsKnown: 16, spellSlots: {1:4,2:3,3:3,4:3,5:2,6:1,7:1,8:0,9:0}, bardicInspirationDie: 10, songOfRestDie: 10, magicalSecretsSlots: 4, features: ['Song of Rest (d10)'] },
    { level: 14, proficiencyBonus: 5, cantripsKnown: 4, spellsKnown: 18, spellSlots: {1:4,2:3,3:3,4:3,5:2,6:1,7:1,8:0,9:0}, bardicInspirationDie: 10, songOfRestDie: 10, magicalSecretsSlots: 6, features: ['Magical Secrets','Peerless Skill'] },
    { level: 15, proficiencyBonus: 5, cantripsKnown: 4, spellsKnown: 19, spellSlots: {1:4,2:3,3:3,4:3,5:2,6:1,7:1,8:1,9:0}, bardicInspirationDie: 12, songOfRestDie: 10, magicalSecretsSlots: 6, features: ['Bardic Inspiration (d12)'] },
    { level: 16, proficiencyBonus: 5, cantripsKnown: 4, spellsKnown: 19, spellSlots: {1:4,2:3,3:3,4:3,5:2,6:1,7:1,8:1,9:0}, bardicInspirationDie: 12, songOfRestDie: 10, magicalSecretsSlots: 6, features: ['ASI / Feat'] },
    { level: 17, proficiencyBonus: 6, cantripsKnown: 4, spellsKnown: 20, spellSlots: {1:4,2:3,3:3,4:3,5:2,6:1,7:1,8:1,9:1}, bardicInspirationDie: 12, songOfRestDie: 12, magicalSecretsSlots: 6, features: ['Song of Rest (d12)'] },
    { level: 18, proficiencyBonus: 6, cantripsKnown: 4, spellsKnown: 22, spellSlots: {1:4,2:3,3:3,4:3,5:3,6:1,7:1,8:1,9:1}, bardicInspirationDie: 12, songOfRestDie: 12, magicalSecretsSlots: 8, features: ['Magical Secrets'] },
    { level: 19, proficiencyBonus: 6, cantripsKnown: 4, spellsKnown: 22, spellSlots: {1:4,2:3,3:3,4:3,5:3,6:2,7:1,8:1,9:1}, bardicInspirationDie: 12, songOfRestDie: 12, magicalSecretsSlots: 8, features: ['ASI / Feat'] },
    { level: 20, proficiencyBonus: 6, cantripsKnown: 4, spellsKnown: 22, spellSlots: {1:4,2:3,3:3,4:3,5:3,6:2,7:2,8:1,9:1}, bardicInspirationDie: 12, songOfRestDie: 12, magicalSecretsSlots: 8, features: ['Superior Inspiration'] },
  ];

  // Compute derived fields
  for (const lv of levels) {
    lv.class = 'Bard';
    const slots = lv.spellSlots;
    lv.maxSpellLevel = 0;
    lv.totalSpellSlots = 0;
    for (let i = 9; i >= 1; i--) {
      if (slots[i] > 0 && lv.maxSpellLevel === 0) lv.maxSpellLevel = i;
      lv.totalSpellSlots += slots[i];
    }
  }

  await LevelProgression.insertMany(levels);
  console.log(`Seeded ${levels.length} level progressions`);
  return levels.length;
}

// ─── CONDITIONS ─────────────────────────────────────────────────────────────

async function seedConditions() {
  await Condition.deleteMany({});

  const conditions = [
    { name: 'Blinded', description: ['A blinded creature cant see and automatically fails any ability check that requires sight.','Attack rolls against the creature have advantage, and the creatures attack rolls have disadvantage.'], mechanicalSummary: 'Cant see. Attacks have disadvantage. Attacks against have advantage.', removedBy: ['Lesser Restoration','Greater Restoration','Heal'], tags: ['sensory'] },
    { name: 'Charmed', description: ['A charmed creature cant attack the charmer or target the charmer with harmful abilities or magical effects.','The charmer has advantage on any ability check to interact socially with the creature.'], mechanicalSummary: 'Cant harm charmer. Charmer has advantage on social checks.', removedBy: ['Calm Emotions','Dispel Magic','Greater Restoration'], tags: ['mental'] },
    { name: 'Deafened', description: ['A deafened creature cant hear and automatically fails any ability check that requires hearing.'], mechanicalSummary: 'Cant hear. Fails hearing checks.', removedBy: ['Lesser Restoration','Greater Restoration'], tags: ['sensory'] },
    { name: 'Exhaustion', description: ['Exhaustion has 6 levels. For each level: Lv1 disadvantage on ability checks, Lv2 speed halved, Lv3 disadvantage on attacks/saves, Lv4 HP max halved, Lv5 speed reduced to 0, Lv6 death.'], mechanicalSummary: '6 levels of increasing debilitation. Lv6 = death.', removedBy: ['Greater Restoration (1 level)','Long rest (1 level)'], tags: ['physical'] },
    { name: 'Frightened', description: ['A frightened creature has disadvantage on ability checks and attack rolls while the source of its fear is within line of sight.','The creature cant willingly move closer to the source of its fear.'], mechanicalSummary: 'Disadvantage on checks/attacks if source visible. Cant approach source.', removedBy: ['Calm Emotions','Heroism','Dispel Magic'], tags: ['mental'] },
    { name: 'Grappled', description: ['A grappled creatures speed becomes 0, and it cant benefit from any bonus to its speed.','The condition ends if the grappler is incapacitated.','The condition also ends if an effect removes the grappled creature from the reach of the grappler.'], mechanicalSummary: 'Speed 0. Ends if grappler incapacitated or forced apart.', removedBy: ['Freedom of Movement','Misty Step (teleport away)'], tags: ['physical'] },
    { name: 'Incapacitated', description: ['An incapacitated creature cant take actions or reactions.'], mechanicalSummary: 'No actions or reactions.', removedBy: ['Depends on source'], tags: ['mental','incapacitated'] },
    { name: 'Invisible', description: ['An invisible creature is impossible to see without the aid of magic or a special sense.','Attack rolls against the creature have disadvantage, and the creatures attack rolls have advantage.'], mechanicalSummary: 'Cant be seen. Attacks have advantage. Attacks against have disadvantage. Cant be targeted by most spells.', removedBy: ['See Invisibility','Faerie Fire','Truesight'], tags: ['sensory'] },
    { name: 'Paralyzed', description: ['A paralyzed creature is incapacitated and cant move or speak.','The creature automatically fails STR and DEX saving throws.','Attack rolls against the creature have advantage.','Any attack that hits the creature is a critical hit if the attacker is within 5 feet.'], mechanicalSummary: 'Incapacitated + cant move/speak. Auto-fail STR/DEX saves. Melee hits = auto-crit.', removedBy: ['Greater Restoration','Freedom of Movement'], tags: ['physical','incapacitated'] },
    { name: 'Petrified', description: ['A petrified creature is transformed, along with any nonmagical object it is wearing or carrying, into a solid inanimate substance (usually stone).','Its weight increases by a factor of ten. It ceases aging.','The creature is incapacitated, cant move or speak, and is unaware of its surroundings.','Resistance to all damage. Immune to poison and disease.'], mechanicalSummary: 'Turned to stone. Incapacitated. Unaware. Resistant to all damage.', removedBy: ['Greater Restoration','Stone to Flesh'], tags: ['physical','incapacitated'] },
    { name: 'Poisoned', description: ['A poisoned creature has disadvantage on attack rolls and ability checks.'], mechanicalSummary: 'Disadvantage on attacks and ability checks.', removedBy: ['Lesser Restoration','Protection from Poison','Yuan-Ti immune'], tags: ['physical'] },
    { name: 'Prone', description: ['A prone creatures only movement option is to crawl. Standing up costs half your movement.','The creature has disadvantage on attack rolls.','An attack roll against the creature has advantage if the attacker is within 5 feet. Otherwise, the attack roll has disadvantage.'], mechanicalSummary: 'Crawl only. Half movement to stand. Melee attacks against have advantage.', removedBy: ['Standing up (half movement)'], tags: ['physical'] },
    { name: 'Restrained', description: ['A restrained creatures speed becomes 0.','Attack rolls against the creature have advantage, and the creatures attack rolls have disadvantage.','The creature has disadvantage on DEX saving throws.'], mechanicalSummary: 'Speed 0. Attacks against have advantage. Disadvantage on DEX saves.', removedBy: ['Freedom of Movement','STR check vs DC'], tags: ['physical'] },
    { name: 'Stunned', description: ['A stunned creature is incapacitated, cant move, and can speak only falteringly.','The creature automatically fails STR and DEX saving throws.','Attack rolls against the creature have advantage.'], mechanicalSummary: 'Incapacitated + cant move. Auto-fail STR/DEX saves. Attacks against have advantage.', removedBy: ['Greater Restoration'], tags: ['physical','incapacitated'] },
    { name: 'Unconscious', description: ['An unconscious creature is incapacitated, cant move or speak, and is unaware of its surroundings.','The creature drops whatever its holding and falls prone.','Attack rolls against the creature have advantage.','Any attack that hits is a critical hit if within 5 feet.'], mechanicalSummary: 'Incapacitated + prone + unaware. Melee hits = auto-crit.', removedBy: ['Healing Word','Any healing','Taking damage'], tags: ['physical','incapacitated'] },
  ];

  await Condition.insertMany(conditions);
  console.log(`Seeded ${conditions.length} conditions`);
  return conditions.length;
}

// ─── EXPANDED FEATS ─────────────────────────────────────────────────────────
// These ADD to the existing feats in seed.js, not replace them

async function seedExpandedFeats() {
  // Get existing feat names to avoid duplicates
  const existing = await Feat.find({}, { name: 1 });
  const existingNames = new Set(existing.map(f => f.name));

  const newFeats = [
    { name: 'Actor', isHalfFeat: true, halfFeatStat: 'CHA', description: '+1 CHA. Advantage on Deception and Performance checks when pretending to be someone else. Mimic speech/sounds heard.', mechanicalSummary: '+1 CHA, advantage on disguise checks, mimic voices', tags: ['social'] },
    { name: 'Elven Accuracy', isHalfFeat: true, halfFeatStat: 'CHA', prerequisite: 'Elf or Half-Elf', description: '+1 CHA. Whenever you have advantage on an attack roll using DEX, INT, WIS, or CHA, reroll one die.', mechanicalSummary: '+1 CHA, triple advantage on CHA attacks', tags: ['offense'] },
    { name: 'Metamagic Adept', isHalfFeat: false, description: 'Learn 2 Metamagic options. 2 sorcery points/long rest. Subtle Spell = cast without V/S components (uncounterspellable).', mechanicalSummary: '2 sorcery points, 2 Metamagic options (take Subtle Spell)', tags: ['offense','utility'] },
    { name: 'Skill Expert', isHalfFeat: true, halfFeatStat: 'ANY', description: '+1 to any ability score. Gain proficiency in one skill. Gain expertise in one skill you are proficient in.', mechanicalSummary: '+1 any stat, 1 proficiency, 1 expertise', tags: ['utility','social'] },
    { name: 'Shadow Touched', isHalfFeat: true, halfFeatStat: 'CHA', description: '+1 CHA. Learn Invisibility + one 1st-level illusion or necromancy spell. Cast each 1/day free.', mechanicalSummary: '+1 CHA, free Invisibility + 1st-level spell', bonusSpells: ['Invisibility'], tags: ['utility'] },
    { name: 'Gift of the Gem Dragon', isHalfFeat: true, halfFeatStat: 'CHA', prerequisite: 'Gem Dragonborn', description: '+1 CHA. Reaction: when hit, deal 2d8 force damage and push 10ft (INT/WIS/CHA save).', mechanicalSummary: '+1 CHA, reaction 2d8 force + push on being hit', tags: ['defense','offense'] },
    { name: 'Ritual Caster', isHalfFeat: false, description: 'Cast ritual spells from a chosen class list. Add rituals you find to your ritual book.', mechanicalSummary: 'Ritual casting from any class list (Wizard rituals most valuable)', tags: ['utility'] },
    { name: 'Magic Initiate', isHalfFeat: false, description: 'Learn 2 cantrips and 1 first-level spell from another class list. Cast the 1st-level spell 1/day free.', mechanicalSummary: '2 cantrips + 1st-level spell from any class', tags: ['offense','utility'] },
    { name: 'Tough', isHalfFeat: false, description: 'HP max increases by 2 per level (retroactive). At Lv8 = +16 HP.', mechanicalSummary: '+2 HP per level (16 HP at Lv8)', tags: ['defense'] },
    { name: 'Observant', isHalfFeat: true, halfFeatStat: 'WIS', description: '+1 WIS. +5 to passive Perception and Investigation. Read lips.', mechanicalSummary: '+1 WIS, +5 passive Perception/Investigation, lip reading', tags: ['utility'] },
    { name: 'Resilient (WIS)', isHalfFeat: true, halfFeatStat: 'WIS', description: '+1 WIS, gain proficiency in WIS saving throws.', mechanicalSummary: 'Prof WIS saves. Protects against most mental CC.', tags: ['defense'] },
    { name: 'Mounted Combatant', isHalfFeat: false, description: 'Advantage on melee attacks vs unmounted smaller creatures. Redirect attacks from mount to you. Mount takes half/no damage on DEX saves.', mechanicalSummary: 'Advantage vs smaller creatures, protect mount', prerequisite: 'Find Steed recommended', tags: ['offense','defense'] },
    { name: 'Shield Master', isHalfFeat: false, prerequisite: 'Shield proficiency', description: 'BA shove with shield. Add shield AC bonus to DEX saves vs single-target effects. Reaction: take no damage on successful DEX save (Evasion).', mechanicalSummary: 'BA shove, +2 DEX saves, Evasion on success', tags: ['defense'] },
    { name: 'Crossbow Expert', isHalfFeat: false, description: 'Ignore loading. No disadvantage at 5ft. BA attack with hand crossbow after Attack action.', mechanicalSummary: 'Ignore loading, no close-range disadvantage, BA attack', tags: ['offense'] },
  ];

  const toInsert = newFeats.filter(f => !existingNames.has(f.name));
  if (toInsert.length > 0) {
    await Feat.insertMany(toInsert);
  }
  console.log(`Seeded ${toInsert.length} new feats (${existingNames.size} already existed)`);
  return toInsert.length;
}

// ─── MAIN ───────────────────────────────────────────────────────────────────

async function main() {
  try {
    await mongoose.connect(process.env.MONGODB_URI);
    console.log('Connected to MongoDB\n');

    console.log('═══════════════════════════════════════');
    console.log('  Seeding Reference Collections');
    console.log('═══════════════════════════════════════\n');

    const spellCount = await seedSpells();
    const featureCount = await seedClassFeatures();
    const skillCount = await seedSkills();
    const bgCount = await seedBackgrounds();
    const levelCount = await seedLevelProgression();
    const conditionCount = await seedConditions();
    const featCount = await seedExpandedFeats();

    console.log('\n═══════════════════════════════════════');
    console.log('  Seed Complete!');
    console.log('═══════════════════════════════════════');
    console.log(`  Spells:           ${spellCount}`);
    console.log(`  Class Features:   ${featureCount}`);
    console.log(`  Skills:           ${skillCount}`);
    console.log(`  Backgrounds:      ${bgCount}`);
    console.log(`  Level Progression:${levelCount}`);
    console.log(`  Conditions:       ${conditionCount}`);
    console.log(`  New Feats:        ${featCount}`);
    console.log('═══════════════════════════════════════\n');

    await mongoose.connection.close();
  } catch (err) {
    console.error('Seed failed:', err);
    process.exit(1);
  }
}

main();
