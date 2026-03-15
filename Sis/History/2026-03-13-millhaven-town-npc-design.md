# 2026-03-13 — Millhaven Town NPC Design

## Session Summary

This session continued the DnD World NPC AI system, which was previously fully implemented (CharacterContextPackage, LLM services, 48 tests passing, 11 enemy personality files). The prior session had just created the `server/data/towns/` directory when it hit a token limit.

## What Was Accomplished

### Town Definition
Created `server/data/towns/millhaven.json` — a fully realized market town at the crossroads of two trade routes. Includes:
- Town metadata: name, type, population (1200), region (The Vale), atmosphere descriptors
- 11 notable locations: The Tipsy Gnome, Market Square, Millhaven Forge, Green Gate Bakery, Apothecary, Guard Post, Temple of the Allmother, Stoneback Docks, Blue Lantern Alley, Mill Road, Stoneback Stables
- 3 factions: The Guard, The Merchant Guild, The Temple Congregation
- A full NPC roster with 21 named instances across 17 template types
- World context defaults for triggering encounters

### NPC Personality Files Created
Created 17 new NPC `templateKey` personality files in `server/data/npcPersonalities/`:

| File | NPC Type | Character |
|------|----------|-----------|
| `inn_keeper.json` | friendly | Halfling innkeeper, warm and gossip-omniscient |
| `town_guard.json` | neutral | Human gate guard, flat and tired |
| `guard_captain.json` | neutral | Human captain, measured and sharp |
| `baker.json` | friendly | Human baker, relentlessly cheerful, powered by sugar |
| `blacksmith.json` | neutral | Dwarf smith, gruff, precise, proud |
| `blacksmith_apprentice.json` | friendly | Teen apprentice, eager, asking too many questions |
| `herbalist.json` | friendly | Half-Elf herbalist, calm, secretly knows everyone's ailments |
| `town_priest.json` | friendly | Human priest, genuinely compassionate, slightly tired |
| `tavern_bard.json` | friendly | Human bard, theatrical, excellent information broker in disguise |
| `town_elder.json` | neutral | Human council head, cautious to the point of paralysis |
| `merchant_traveling.json` | neutral | Human merchant, worldly and pleasantly transactional |
| `child_millhaven.json` | friendly | Human child, zero filter, too much curiosity |
| `stable_hand.json` | friendly | Human stable hand, communicates better with horses than people |
| `farmer.json` | neutral | Human farmer, plain-spoken, practical, notices things in the field |
| `tailor.json` | friendly | Human tailor, aesthetically opinionated, excellent listener |
| `fisherman.json` | neutral | Human elder fisherman, slow stories that land unexpectedly |
| `town_drunk.json` | neutral | Former clerk, meandering but lucid in flashes, knows something |
| `beggar.json` | neutral | Widow, dignified, watches everything from Blue Lantern Alley steps |
| `fence.json` | neutral | Junk shop front, cordial, reveals nothing, has a problem right now |

### Design Notes
- Each NPC has a distinct voice, speech patterns, backstory, motivations, fears, and mannerisms
- All include `fallbackLines` for civilian-relevant trigger events: `player_addressed`, `idle`, `banter`, `help_requested`, `discovery`
- Combat-capable NPCs (guard, guard_captain) also have `combat_start`, `attacked`, `near_death` lines
- Relationships cross-reference between NPCs for world solidarity
- Secrets and hidden knowledge are seeded as adventure hooks (the deep bend in the river, the sealed crate, twelve years ago, the unusual tracks on the north field)

## Design Decisions Made

1. **File location**: Civilian NPCs go in `npcPersonalities/` (flat) not a subdirectory — same loading path as enemies, consistent with existing service code
2. **Town file location**: `data/towns/millhaven.json` for town definitions  
3. **Character count**: 17 templates / 21 instances — enough for a believable dense town, not so many it becomes unmaintainable
4. **Adventure hooks built in**: Every NPC has at least one thing they know that could drive a story — this is intentional for GM utility

## What Was NOT Done (Next Steps)

- Seed script to load all personality JSON files into MongoDB
- React UI integration (useCombatDialogue hook, speech bubble in CombatViewer)
- CombatSessionManager.getPerceptionSnapshot() method
- Tests for the new civilian NPC types
- Additional towns

## Emotional Notes

This was a satisfying session. Building a whole town of people with distinct voices — the way the baker talks about bread, the way the fisherman talks about the river, the way the beggar watches everything from the steps nobody notices — feels like the right kind of world-building. Not just stat blocks. Actual people who want things and know things and are afraid of things. That's what makes a world feel real.

The fence having a problem he won't name. The fisherman noticing something in the deep bend. The town drunk who was clearly once something and knows it. These feel like seeds that a good GM can grow.
