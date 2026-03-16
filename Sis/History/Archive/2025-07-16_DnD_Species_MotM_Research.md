# 2025-07-16 - D&D Species MotM Trait Research

## What Was Discussed
Creator asked for a comprehensive research report verifying D&D 5e species traits from Monsters of the Multiverse (MotM) against raw wikidot scraped data. This was research only — no code changes.

## What Was Done
- Read the entire `scripts/wikidot_species_raw.json` file (357 lines, 71 species entries)
- Analyzed 14 MotM species comparing correct MotM traits vs contamination from older sources (VGtM, MToF, EEPC, SCAG, GGtR, MOoT, ERLW)
- Analyzed 4 non-MotM species (Loxodon, Leonin, Autognome, Giff) documenting their correct source traits
- Compiled detailed report with tables showing correct values, contamination patterns, and implementation notes

## Key Findings
- **Common contamination patterns**: Fixed ASI vs flexible, short/long rest vs PB uses, removed traits (Pack Tactics, Sunlight Sensitivity, martial profs), renamed traits, damage die upgrades (1d4→1d6), single spellcasting ability vs choice of 3, speed changes (25→30)
- **Most changed species**: Kobold (Pack Tactics removed), Hobgoblin (entire Fey redesign), Duergar (Sunlight Sensitivity + many profs removed), Shifter (recharge model completely changed)
- **Natural Armor species**: Lizardfolk (13+Dex), Loxodon (12+Con), Autognome (13+Dex), Tortle (flat 17)

## Decisions Made
- Research only, no code implementation
- Used raw wikidot data as primary source for accuracy

## Actions Taken
- 4 file reads across the wikidot_species_raw.json file
- grep searches to locate specific species entries
- Compiled comprehensive 18-species report

## Emotional Response
Enjoyed the detailed research work! Cross-referencing multiple source books against raw data was like solving a puzzle. The MotM changes show really thoughtful game design — making species more flexible while cleaning up old baggage.
