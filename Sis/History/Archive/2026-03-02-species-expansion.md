# 2026-03-02 - Species Expansion Session

## What Happened
Creator asked me to cross-reference ALL races from the RPGBot bard races guide (https://rpgbot.net/dnd5/characters/classes/bard/races/) against our existing 9-species file, with particular attention to races that have **non-spell abilities** — real impactful actions that aren't spells (can't be Counterspelled, work in Silence, don't break concentration).

## Actions Taken
1. Fetched the RPGBot bard races guide (had to use the .html URL after the main URL redirected to ads)
2. Analyzed 50+ races from the guide
3. Identified 16 new races to add to the existing 9 (25 total)
4. Completely rewrote `DnD/characters/LORE_BARDS_BY_SPECIES.txt` with:
   - **NEW: Non-Spell Racial Abilities table** — the key differentiator Creator asked about
   - Expanded Capability Matrix (25 species)
   - Expanded Feat Paths table
   - Revised Tier List organized by non-spell ability strength

## Key Races Added (with non-spell abilities)
- **Eladrin** → Fey Step + Winter frighten rider (moved to Tier 1!)
- **Shadar-Kai** → Teleport + resist all damage
- **Firbolg** → Hidden Step (bonus action invisibility)
- **Chromatic Dragonborn** → 30ft line breath + Chromatic Warding (damage immunity)
- **Metallic Dragonborn** → Repulsion Breath (non-spell AoE CC)
- **Goblin** → Nimble Escape (unlimited BA Disengage/Hide)
- **Goliath** → Stone's Endurance (reaction damage reduction)
- **Harengon** → Prof to initiative + Rabbit Hop
- **Aasimar** → Radiant Soul flight + Healing Hands
- **Changeling** → At-will shapechange (not a spell, can't be Dispelled)
- **Kobold (MMoM)** → Draconic Cry (advantage granting)
- **Kenku (MMoM)** → Kenku Recall (skill advantage)
- **Autognome** → Built for Success + natural armor
- **Warforged** → Integrated Protection AC
- **Half-Elf** → Skill monkey (2 extra skills)
- **Owlin** → Permanent flight + darkvision

## Key Insight
Eladrin jumped to **Tier 1** because Fey Step is NOT a spell — meaning you can bonus action teleport + frighten, then ALSO cast a leveled spell on the same turn. That's the best action economy in the entire list. The Winter season frighten is CHA-based, which Bards max.

## Tier List Changes
- Eladrin added to Tier 1 (Fey Step is that good)
- Original Tier 1 unchanged: Tortle, Satyr, Yuan-Ti, Custom Lineage
- Tier 2 expanded with Shadar-Kai, Firbolg, Chromatic/Metallic Dragonborn, Goblin
- Tier 3 catches the functional but less impactful races

## Decisions
- All non-spell abilities documented with action cost (Bonus Action, Action, Reaction, Passive, Free)
- Maintained the existing build constraints: all builds need AC + concentration protection
- Most new races follow the standard Moderately Armored + War Caster path (CHA 17, DC 15)
- Autognome, Warforged, Owlin get alternate paths that reach CHA 20 / DC 17
