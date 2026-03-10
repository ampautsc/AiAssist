# Scoring System Overhaul — Development Plan

## The Verdict: The Current Scoring System is Broken

The rankings don't pass the smell test because the system doesn't model what actually matters for a Lore Bard. It rewards hiding and surviving instead of *winning encounters*. A Tabaxi with Winged Boots is #1 not because Tabaxi is a strong species choice — it isn't — but because the distance model makes flight a binary immunity to melee, the win condition counts "enemies still charmed after 5 rounds" as a victory even though nobody's dead, and 3 simulations is statistical noise where any build with flight gets lucky.

Here's what's wrong, why it's wrong, and how we fix it.

---

## Part 1: What's Actually Wrong (The DM Audit)

### Problem 1: The Win Condition is a Lie

**Current behavior:** Victory = all enemies dead OR (round ≥ 5 AND all enemies incapacitated).

**Why it's wrong:** Incapacitation after 5 rounds is not a win. Hypnotic Pattern's charm ends the instant concentration drops. The enemies have full HP. A solo Lore Bard 8 cannot kill a Frost Giant (138 HP) with Vicious Mockery (5 avg/round). After "winning," the bard is standing in a room with fully healthy, now *very angry* enemies. Any DM would tell you this is a loss with extra steps.

**What a DM knows:** A win means threats are *eliminated* — dead, fled, or permanently disabled. Holding concentration on HP for 5 rounds while dealing zero meaningful damage is stalling, not winning. The party would need to be there dealing damage during that window for it to matter, and this is a solo simulation.

**Fix:** Incapacitation-only wins should score as partial successes (maybe 30-40 points), not full victories. True wins require meaningful damage dealt — enemies must be dead or reduced below a threshold. Alternatively, model the party: the bard's CC opens a window for allies to deal damage, and the build's score reflects how much of that window it creates.

### Problem 2: Flight is Modeled as God Mode

**Current behavior:** `distanceBetween(flyer, ground) = 25` always. Melee range is 5ft. Therefore melee-only creatures literally cannot attack flyers. Ever.

**Why it's wrong from D&D gameplay:**
- Smart enemies don't just stand there. They ready actions, throw rocks, use furniture as improvised weapons, or retreat to cover.
- Ogres have javelins (30/120 range) — the math engine marks them `ranged: false` while the combat engine DOES give them javelins. The two engines disagree.
- The bard still needs to be within 60ft to cast most spells (120ft for some). Coming within 60ft of a Hill Giant with a rock (60/240 range) means you're in danger.
- Environment matters. Indoor encounters limit flight. Caverns have ceilings. The werewolf ambush is presumably in a forest, not an open field.
- Concentration checks from falling: if the bard gets paralyzed, stunned, or knocked unconscious while flying, they fall. The encounter runner models this, but the math engine doesn't.
- Flight that requires an item (Winged Boots) can be targeted by Dispel Magic or negated by anti-magic. Some enemies are smarter than "stand here and get charmed."

**The data proves this:** In Frost Giant Smash, flyers score 100 because ogres "can't reach." But the frost giant CAN throw rocks. A solo bard with DC 16 has only ~40% chance to charm a Frost Giant (WIS +3). If HP fails, the bard is hovering 25ft up getting pelted with 4d10+6 boulders. That's not a guaranteed win — it's a coin flip that the system treats as auto-win.

**Fix:** Flight should provide advantage, not immunity. Model it as:
- 50-75% damage reduction from melee-only enemies (they can improvise, ready actions, use environment)
- Full exposure to ranged/caster enemies
- Environmental ceiling limits per scenario (indoor = limited flight, outdoor = full flight)
- Concentration risk: if concentration breaks while flying, the bard falls and takes damage

### Problem 3: Additional Magical Secrets Don't Exist in the Model

**This is the single biggest failure in the entire system.**

A Level 6 Lore Bard gets **Additional Magical Secrets** — 2 spells from ANY class list in the game. This is the defining power of the subclass. This is why people PLAY Lore Bard. And the simulator doesn't model it at all.

`buildConverter.js` hardcodes `LORE_BARD_KNOWN` — every single build gets the exact same spell list. Whether your Additional Magical Secrets are Conjure Animals, Spirit Guardians, Fireball, Find Steed, or Counterspell — it makes zero difference to the simulation.

**Why this matters from a DM chair:**

- **Conjure Animals (Druid 3rd):** Summon 8 wolves. Pack Tactics (advantage on attacks when ally adjacent). Knockdown (STR save or prone = advantage for melee allies). This is 8 extra attacks per round from a single 3rd-level slot. The bard can concentrate on this while using cantrips/bonus actions. Against werewolves? Wolves deal non-magical damage (immune). But against undead, cultists, bandits? Absolute carnage. This completely changes the action economy math.

- **Spirit Guardians (Cleric 3rd):** 3d8 radiant damage to every enemy that starts its turn within 15ft or enters the area. Doesn't require the bard to use its action. Halves enemy speed. In the Undead Swarm scenario, this is an AoE damage-over-time spell that kills zombies (22 HP) in ~2 rounds passively.

- **Fireball (Wizard 3rd):** 8d6 fire, 20ft radius. Against the undead swarm (zombies 22 HP, skeletons 13 HP), a single Fireball can clear most of the encounter before it starts.

- **Counterspell (already in bard list at 10th, but early at 6th via Magical Secrets):** Wait, this IS already in the hardcoded list. Good. But the point stands for everything else.

- **Find Steed (Paladin 2nd):** Permanent intelligent mount that shares buff spells. Cast Greater Invisibility on yourself, the mount is invisible too. Doubles mobility. Extra body to absorb hits.

- **Aura of Vitality (Paladin 3rd):** 2d6 healing per bonus action for 1 minute (10 rounds). Total: 20d6 ≈ 70 HP healed over the encounter. This is the best sustained healing in tier 2.

The current system evaluates 454 builds across 75 species but treats them ALL as having the same spell list. The thing that actually differentiates powerful Lore Bard builds — their spell theft — is invisible.

**Fix:** Magical Secrets spell choices must be a first-class build variable. Each build template should specify its Additional Magical Secrets picks. The spell registry, creature templates, and AI tactics all need to support these spells. This is the #1 priority.

### Problem 4: The AI Only Knows One Strategy

The `lore_bard` tactical profile is:
1. HP low? → Greater Invisibility
2. Round 1? → Hypnotic Pattern
3. Concentrating + all disabled? → Dodge
4. Concentrating + melee threat? → Vicious Mockery
5. Concentrating → Vicious Mockery at range
6. No concentration → Recast HP
7. No concentration → Hold Person
8. Fallback → Cantrip or Dodge

This is "cast HP, then spam Vicious Mockery." One strategy. No adaptation. No decision-making about *which* concentration spell to use. No assessment of "HP is useless against charm-immune enemies, I should do something else." No summon tactics. No direct damage options. No Cutting Words reaction.

A real Lore Bard player adapts:
- Against charm-immune enemies (ghouls, lich): skip HP entirely, use Hold Person / direct damage / summons
- Against a single big target (dragon, giant): Hold Person for paralysis, or Faerie Fire for advantage, not HP
- Against lots of weak targets: Fireball or Shatter to just kill them, not charm them
- Against a caster: prioritize Counterspell and positioning over CC
- When concentration is up on summons: use Cutting Words and Bardic Inspiration to support the summons, not Vicious Mockery

**Fix:** The AI needs encounter-aware strategy selection. Before round 1, analyze the enemy composition and pick a plan. Multiple tactics profiles per spell loadout.

### Problem 5: The Scoring Weights Are Backwards

**Math engine:** CC 30%, Concentration 30%, HP Survival 15%, Counter Resist 15%, Disable Resist 10%

**What this actually rewards:**
- 60% of the score is "did Hypnotic Pattern work and hold?" That's basically just Spell DC + CON save.
- Only 15% is survival. A build that dies but charmed everyone first scores higher than a build that survives but charmed fewer.
- 15% for counterspell resistance is a flat penalty (0.5 if any enemy has it, 0 otherwise). This doesn't differentiate builds at all — every build faces the same counterspell risk.
- Disable resistance (10%) depends on WIS save, which barely varies between builds.
- **Damage output: 0%.** A build that deals zero damage and a build that kills everything score the same on 100% of the dimensions that matter to the formula.

**Combat engine:** Win rate + efficiency bonus (rounds + HP remaining)

This is *slightly* better because win rate matters. But the broken win condition (incapacitation = win) means the same problems manifest — HP charm + survival = win, regardless of damage dealt.

**Fix:** Scoring should reflect what a DM values:
- **Encounter resolved** (enemies dead/fled/permanently disabled) — this should be 40-50% of the score
- **Efficiency** (resources spent, rounds taken) — 20%
- **Survivability** (HP remaining, no near-death moments) — 15%
- **Versatility** (did the strategy still work when the primary plan failed?) — 15%
- **Adaptability deductions** (scenarios where the build is completely helpless should tank the score) — 10%

### Problem 6: Statistical Noise (3 Simulations)

3 runs per scenario per build. That's nothing. D&D combat has enormous variance — a single critical hit, a single failed save, completely changes the outcome. With 3 simulations, the rankings are dominated by luck, not build quality.

The proof: Tabaxi Winged Striker is #1 at 73.2. Triton Winged Striker (same template, different species) is #8 at 69.7. There is NO mechanical reason for a 3.5 point gap between these two. Tabaxi gets Feline Agility (double one movement, useless while flying) and climb speed. Triton gets cold resistance and limited amphibious utility. Neither meaningfully impacts combat. The gap is pure simulation noise.

**Fix:** Run 100+ simulations per scenario-build pair. Ideally 500. The combat engine runs fast — this is just a configuration change.

### Problem 7: Species Traits Aren't Properly Differentiated

Some species-specific traits are enormous in 5e and the system barely models them:

- **Deep Gnome / Yuan-Ti / Satyr / Vedalken:** Magic Resistance (advantage on saves vs spells). Against the Lich (DC 20), Archmage (DC 17), and any caster encounter, this is *massive*. The probability of failing a DC 20 CON save drops from ~75% to ~56% with advantage. This should be a major differentiator in caster-heavy scenarios and the system does model it, but the overall weight is diluted.

- **Halfling Lucky:** Reroll natural 1s on attacks, saves, and ability checks. Not modeled in either engine. This affects concentration saves, HP saves, everything.

- **Gem Dragonborn Breath Weapon:** Free AoE damage that doesn't cost a spell slot and doesn't require concentration. In the "concentrating on HP" strategy, this is pure bonus damage. The combat engine does model this in tactics, which is good.

- **Gem Dragonborn Limited Flight:** Takes a bonus action and has uses per long rest. Activates round 2+ (modeled as `flyTurn: 2`). The delay matters — round 1 you're on the ground taking hits.

**Fix:** Properly model all species combat traits. Halfling Lucky, Gnome Cunning / Magic Resistance, damage resistances (fire for Tiefling vs dragon encounter), condition immunities (elf sleep immunity). Each of these should create measurable scoring differences in the right scenarios.

### Problem 8: Solo Bard Framing Ignores the Class's Purpose

A Lore Bard is a force multiplier. Bardic Inspiration, Cutting Words, Healing Word to pick up downed allies, CC to create advantage for the party's damage dealers. Solo, the bard can't deal enough damage to finish encounters. This is why incapacitation-only "wins" happen — the bard can disable but not kill.

**Fix (two options):**
- **Option A: Add simulated party members.** Even abstract ones — a Fighter that deals X DPR to incapacitated targets, a Rogue that gets Sneak Attack on targets the bard gives advantage to. The bard's score becomes "how much did your actions enable total party damage?"
- **Option B: Reframe scoring around contribution, not kills.** Score the bard on: % of enemy actions denied (through CC), % of damage mitigated (through CC/debuffs), % of forced disadvantage, resource efficiency. Accept that the bard doesn't kill things and measure what they actually do.

Option A is more work but more accurate. Option B is more pragmatic.

---

## Part 2: Development Plan

### Phase 1: Fix the Fundamentals (Data Integrity)

**Goal:** Make the simulation produce reliable, meaningful numbers before adding new features.

#### Step 1.1 — Increase Simulation Count
- Change default from 3 to 200 simulations per scenario-build pair
- Add configurable `--sims` parameter (already exists, just change default)
- Validate that rankings stabilize at 200 (run twice, compare rank correlation)
- **Testing:** Run same build 2× at 200 sims, verify score within ±3 points

#### Step 1.2 — Fix the Win Condition
- Redefine victory tiers:
  - **Decisive Victory (100 pts):** All enemies dead
  - **Tactical Victory (60 pts):** All enemies incapacitated AND bard HP > 50% (could theoretically finish them)
  - **Pyrrhic Victory (30 pts):** All enemies incapacitated but bard nearly dead
  - **Stalemate (15 pts):** Combat timed out, bard alive, some enemies up
  - **Defeat (0 pts):** Bard unconscious/dead
- **Testing:** Run current top builds against Frost Giant. Verify that "HP and hover" no longer scores 100.

#### Step 1.3 — Fix the Distance Model
- Replace binary 25ft with graduated model:
  - Flying vs melee-only ground: 75% of attacks miss (not 100%)
  - Flying vs reach weapons: 50% miss
  - Flying vs ranged: normal (no miss chance from elevation alone)
  - Flying vs caster: normal
  - Indoor/cavern scenarios: flying limited to +10ft elevation (still in reach range)
- Alternatively: model actual altitude as a z-coordinate. Flying bard at z=30 is out of melee reach but at z=15 could be reached by a readied action + jump.
- **Testing:** Winged Striker builds should score ~10-15% better than non-flyers against pure melee, not 50%+ better.

#### Step 1.4 — Fix Ogre Data Inconsistency
- Math engine ogre: add `ranged: true` (they have javelins)
- Both engines should agree on creature capabilities
- **Testing:** Flight advantage against Frost Giant Smash should decrease with this fix.

### Phase 2: Model What Actually Matters (Magical Secrets)

**Goal:** The defining feature of Lore Bard — Additional Magical Secrets — must be a build variable.

#### Step 2.1 — Add Magical Secrets to Build Templates
- Each build template in `seed.js` gets an `additionalMagicalSecrets` field: two spells from any class list
- Create 3-4 Magical Secrets combinations per build template to test:
  - **Conjure Animals + Counterspell** (summoner/controller)
  - **Spirit Guardians + Counterspell** (melee AoE)
  - **Fireball + Counterspell** (blaster)
  - **Find Steed + Aura of Vitality** (sustain/mobility)
  - **Conjure Animals + Fireball** (action economy + burst)
- **Testing:** Same template with different Magical Secrets should produce significantly different scores.

#### Step 2.2 — Add Stolen Spells to the Spell Registry
- Implement in `spells.js`:
  - **Conjure Animals** — summon creatures, concentration, 1 hour, requires summon resolution
  - **Spirit Guardians** — AoE damage aura, concentration, 10 minutes, 3d8 radiant per failed save
  - **Fireball** — 8d6 fire, DEX save, 20ft sphere, instantaneous
  - **Find Steed** — summon warhorse/other, permanent until killed, shares self-targeting spells
  - **Aura of Vitality** — bonus action 2d6 healing each round, concentration, 1 minute
- **Testing:** Each spell should have unit tests for damage, duration, targeting, and concentration interactions.

#### Step 2.3 — Add Summon Mechanics to Combat Engine
- Conjure Animals needs:
  - Summoned creature templates (8 wolves, 4 elk, 2 brown bears, etc.)
  - Summon AI (simple: attack nearest enemy, pack tactics if applicable)
  - Initiative for summoned creatures (act on bard's turn after bard)
  - Concentration tracking: if bard loses concentration, all summons vanish
  - Damage tracking for individual summons
- **Testing:** Bard with Conjure Animals (8 wolves) should dramatically increase DPR in scenarios with non-resistant enemies.

#### Step 2.4 — Update buildConverter.js
- Read `additionalMagicalSecrets` from build document
- Include them in the creature's `spellsKnown` list
- Known spells should vary per build, not be hardcoded
- **Testing:** Different builds produce different `spellsKnown` arrays.

### Phase 3: Smart AI (Strategy Selection)

**Goal:** The bard AI should analyze the encounter and pick appropriate tactics.

#### Step 3.1 — Pre-Combat Strategy Selection
- Before round 1, analyze enemy roster:
  - Count charm-immune enemies → reduces HP effectiveness
  - Count casters with Counterspell → increases need for positioning/Subtle Spell
  - Count melee-only enemies → flight value assessment
  - Assess total enemy DPR → survivability urgency
- Select strategy based on loadout + encounter:
  - **Control:** Open HP → maintain → cantrip (current strategy, for low-save enemies)
  - **Summon:** Open Conjure Animals → protect concentration → let summons kill
  - **Aura:** Cast Spirit Guardians → wade in → let aura damage kill
  - **Blast:** Fireball → Shatter → cantrip (for swarms of weak enemies)
  - **Duel:** Counterspell priority → Hold Person → attrition (for single caster enemies)
- **Testing:** Against undead swarm (ghouls immune to charm), AI should prefer Fireball/Spirit Guardians over HP.

#### Step 3.2 — Implement Cutting Words
- Reaction ability: subtract Bardic Inspiration die from enemy attack roll, ability check, or damage roll
- Should trigger when:
  - Enemy attacks and roll + modifier just barely hits
  - Enemy is making a save against a key spell
  - Big damage incoming that threatens concentration
- d8 at level 8, uses = CHA mod per long rest (5 uses with CHA 20)
- **Testing:** Cutting Words should measurably improve concentration hold rate and reduce damage taken.

#### Step 3.3 — Encounter-Specific Tactics Profiles
- Create mapping: spell loadout × encounter type → tactics profile
- Profile adjusts evaluator priority order based on what works
- Example: Conjure Animals build against werewolves should NOT summon (wolves deal non-magical damage, werewolves immune), should fall back to Hold Person / HP
- **Testing:** Verify that stupid choices (summoning wolves against werewolves) don't happen.

### Phase 4: Scoring Overhaul

**Goal:** Score what matters, not what's easy to measure.

#### Step 4.1 — New Scoring Components
Replace current metrics with:

| Component | Weight | What It Measures |
|---|---|---|
| **Damage Dealt** | 25% | Total enemy HP reduced / Total enemy HP pool. Did you actually kill anything? |
| **Encounter Resolved** | 25% | Victory tier score (decisive/tactical/pyrrhic/stalemate/defeat) |
| **Action Denial** | 20% | % of enemy-turns where the enemy was incapacitated, charmed, held, frightened |
| **Survivability** | 15% | Bard HP% at end. Weighted: never dropping below 50% is better than yo-yoing |
| **Resource Efficiency** | 15% | Spell slots remaining / total slots. Winning with fewer resources = better |

#### Step 4.2 — Scenario-Specific Scoring Context
- Undead Swarm: damage dealt weight increases (lots of low-HP targets to actually kill)
- Lich Encounter: survival weight increases (this IS a survivability test)
- Cult Fanatics: action denial weight increases (the casters are the threat, denying their turns matters)
- Dragon: survivability vs breath + can you actually CC a WIS +4 monster?

#### Step 4.3 — Worst-Scenario Floor
- A build that scores 0 on ANY scenario should receive a penalty to overall average
- The best build is one that performs consistently, not one that aces 6 scenarios and completely fails 2
- Apply: `overallScore = avgScore - (worstScore < 10 ? 15 : 0) - (worstScore === 0 ? 20 : 0)`
- **Testing:** Builds that are completely helpless in a scenario (0 score) should drop significantly in rankings.

### Phase 5: Party Context (Stretch Goal)

#### Step 5.1 — Abstract Party Members
- Add 2-3 abstract party members to each simulation:
  - **Fighter:** 2 attacks/round at +7, 1d8+4 damage each. Attacks incapacitated/prone targets with advantage.
  - **Rogue:** 1 attack at +7, 1d6+4 + 3d6 sneak attack (when ally adjacent or target has disadvantage). 
  - **Cleric:** Heals 1d8+3 per round as bonus action. Casts Bless or Spiritual Weapon.
- Bard's score reflects party performance: how much extra damage/healing did the party deal BECAUSE of the bard's actions?
- **Testing:** CC bard builds should score much higher because the party can capitalize on incapacitated enemies.

#### Step 5.2 — Party Synergy Scoring
- "Enablement score" = party DPR with bard actions - party DPR without bard actions
- Bardic Inspiration value = expected hit rate improvement × party damage per hit
- Cutting Words value = expected damage reduction × number of enemy attacks
- CC value = action economy: every enemy turn denied = one ally turn gained

---

## Part 3: Immediate Priority — What to Build First

**Ordering by impact on ranking accuracy:**

1. **Increase sims to 200** (Step 1.1) — 30 minutes. Eliminates statistical noise. Changes are a config change.
2. **Fix win condition** (Step 1.2) — 2 hours. Eliminates fake wins from HP-and-hover.
3. **Fix flight model** (Step 1.3) — 2 hours. Eliminates flight = god mode.
4. **Fix ogre data** (Step 1.4) — 15 minutes. Data consistency.
5. **Add Magical Secrets as build variable** (Steps 2.1-2.4) — 8 hours. The biggest single improvement.
6. **New scoring formula** (Step 4.1) — 4 hours. Measures what matters.
7. **Encounter-aware AI** (Steps 3.1-3.3) — 8 hours. Makes the bard fight smart.
8. **Party context** (Phase 5) — 16 hours. The ultimate fix but high effort.

**Total estimated time: ~40 hours for Phases 1-4. Phase 5 is an additional week.**

---

## Part 4: Expected Outcome After Fix

### What SHOULD Be Strong (DM Perspective)

A well-built Lore Bard 8 needs:
1. **High Spell DC** — DC 17 (Dragon Fear Caster) >> DC 16 >> DC 15. This is the #1 stat.
2. **Iron Concentration** — Resilient CON + War Caster = proficiency + advantage on CON saves. This should be consistently top-tier because the bard's entire strategy depends on maintaining concentration.
3. **The Right Magical Secrets** — Conjure Animals for action economy, Spirit Guardians for close-range AoE, Fireball for burst. These should differentiate builds more than species choice.
4. **Magic Resistance species** (Deep Gnome, Yuan-Ti, Satyr, Vedalken) should dominate caster-heavy scenarios (Lich, Archmage, Cult Fanatics).
5. **Consistent scoring** — the best build doesn't have a 0 anywhere.

### What SHOULD Be Weak
- Builds that dump AC to 13-14 with no concentration protection
- Builds that rely entirely on one strategy (HP-only) against charm-immune enemies
- Builds with DC 15 trying to CC high-WIS targets
- Purely defensive builds that survive but accomplish nothing

### Expected Post-Fix Top Tier
1. **Dragon Fear Caster builds** with DC 17 + good Magical Secrets (Conjure Animals). Highest DC in the system, breath weapon for free damage, but restricted to Dragonborn species.
2. **Iron Concentration builds** with Magic Resistance species + Conjure Animals. Concentration almost never breaks, summons provide the DPR the bard lacks, Magic Resistance handles enemy casters.
3. **Bardic Musician builds** with CHA 20 (DC 16) + Cli Lyre charm disadvantage + Conjure Animals. High DC, enemies have disadvantage on charm saves, strong action economy.

### Expected Post-Fix Bottom Tier
- Armored Escapist (DC 15, no concentration advantage, AC doesn't matter if you lose concentration)
- Armored Tank without Magical Secrets that provide damage (AC 20 is great, but can't win encounters solo)
- Any build with DC 15 against scenarios with WIS +3 or higher enemies

---

## Acceptance Criteria

The scoring overhaul is complete when:
- [ ] A human DM looks at the top 10 and bottom 10 and says "yeah, that makes sense"
- [ ] Species with Magic Resistance rank higher in caster-heavy scenarios
- [ ] Iron Concentration (Resilient CON + War Caster) ranks higher than glass cannon builds in high-damage scenarios
- [ ] DC 17 builds (Dragon Fear) outperform DC 15 builds in CC-focused encounters
- [ ] Additional Magical Secrets choices create measurable score differences between otherwise-identical builds
- [ ] No build scores 100% on Frost Giant or Lich by just flying and waiting
- [ ] Rankings are stable across repeated evaluations (rank correlation > 0.95 at 200 sims)
- [ ] Builds that are helpless in a scenario (no viable strategy) receive explicit penalties
- [ ] Tabaxi is NOT #1 unless there's a real mechanical reason beyond "flight + noise"
