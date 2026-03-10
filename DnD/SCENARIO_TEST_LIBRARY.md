# D&D 5e Character Unit Tests: The Stress Scenario Library

*A comprehensive library of "Unit Tests" designed to stress-test D&D 5e characters (particularly balanced around Tier 2 / Level 8). Use these to find gaps in a character's build, ensuring they aren't just "white-room damage calculators" but actual rounded adventurers.*

---

## 1. Combat Stress Tests

**Test Name:** The Minion Swarm
**Pillar:** Combat
**Description:** The character is surrounded by 30 CR 1/4 creatures (e.g., Goblins or Zombies) in a 60x60 ft enclosed room. The enemies spread out to avoid single small AoEs and use pack tactics or ranged shortbows. Character wins initiative.
**Success Criteria:** Survive 3 rounds and clear at least 20 enemies. Tests multi-target damage (AoE spells, Extra Attack + Cleave, Spirit Guardians) and AC/damage mitigation against massed low-attack-bonus strikes. Falls apart if the character is strictly single-target melee.

**Test Name:** The Flying Sniper
**Pillar:** Combat
**Description:** A CR 8 Assassin or ranged skirmisher with a Longbow of Warning and winged boots flies 120 feet in the air, using Bonus Action Hide in dense canopy or clouds. They deal high sneak-attack/poison damage.
**Success Criteria:** Force the enemy to the ground, close the distance, or win a ranged damage trade-off. Tests ranged capabilities, flight, Earthbind, or readying actions. Fails if the character has no ranged options beyond 30 feet.

**Test Name:** The Invisible Ambush
**Pillar:** Combat
**Description:** Three Duergar or invisible stalkers begin combat already invisible and surrounding the character. They get a surprise round.
**Success Criteria:** Survive the initial nova damage burst (approx. 40-50 damage) and successfully locate and retaliate against invisible targets. Tests high AC, Uncanny Dodge, Shield spell, perception (high passive), and anti-invisibility (Faerie Fire, Blindsight, See Invisibility).

**Test Name:** The Magic Vacuum
**Pillar:** Combat
**Description:** An enemy Mage casts *Antimagic Field* or a squad of enemies casts *Silence* and grapples the character. No somatic/verbal spells can be cast, and magic items become mundane.
**Success Criteria:** Break the grapple (DC 16 Athletics/Acrobatics) and move out of the zone, or defeat the enemies using strictly mundane martial prowess. Brutally exposes spellcasters with dumped Strength/Dexterity and no teleportation without verbal components.

**Test Name:** The Grapple & Drop
**Pillar:** Combat
**Description:** A Huge flying creature (like a Roc or Wyvern) swoops down, automatically grappling the character (DC 16 to resist), and flies 80 feet straight up. Next turn, it drops them.
**Success Criteria:** Avoid the initial grapple, break it before the drop, or survive/mitigate the 8d6 falling damage (Feather Fall, Slow Fall, flight). Tests Acrobatics/Athletics and vertical mobility.

**Test Name:** Mind Control Mayhem
**Pillar:** Combat
**Description:** A Vampire Spawn or Succubus successfully surprises the character and forces a DC 15-17 Wisdom saving throw against being Charmed or Dominated.
**Success Criteria:** Pass the Wisdom save, or have abilities that mitigate charm (Fey Ancestry, Aura of Devotion). Exposes low-Wisdom martial characters who become massive liabilities to their party.

**Test Name:** The Gear Breaker
**Pillar:** Combat
**Description:** Character is trapped in a narrow corridor with two Black Puddings or Rust Monsters. Every melee attack risks degrading non-magical weapons and armor, and the enemies deal passive acid/corrosive damage.
**Success Criteria:** Defeat the enemies without losing primary armor or weapons. Tests reliance on mundane gear, availability of magical weapons, save-based magic, and ranged kiting ability.

**Test Name:** The Extreme Range Engage
**Pillar:** Combat
**Description:** A target needs to be stopped from fleeing on a fresh horse starting 300 feet away across an open plain. Target is moving 120 feet per round (Dash).
**Success Criteria:** Catch or kill the target within 3 rounds (before they reach 600+ feet). Tests extreme mobility (Phantom Steed, Dimension Door) or ultra-long-range combat (Sharpshooter, Spell Sniper). Fails completely for standard 30ft speed, 60ft range characters.

**Test Name:** The Incorporeal Drain
**Pillar:** Combat
**Description:** Facing 4 Shadows (CR 1/2) in total darkness. They have resistance to non-magical damage and drain 1d4 Strength on every hit.
**Success Criteria:** Output radiant damage, magic weapon damage, or AoE before Strength drops to 0 (death). Brutally exposes low-Strength characters (Wizards/Rogues starting with 8 STR can die in 2-3 hits regardless of HP).

**Test Name:** Burrowing Hit-and-Run
**Pillar:** Combat
**Description:** A Bulette or similar burrowing monster attacks from underground, bites, and burrows away without provoking opportunity attacks.
**Success Criteria:** Deal consistent damage to a target only visible on the character's turn if they hold actions, or use Tremorsense/readied crowd control to pull it to the surface. Tests the ability to handle broken action-economy and readied actions.

**Test Name:** Escort the VIP
**Pillar:** Combat
**Description:** Protect a commoner (10 AC, 4 HP) from three CR 3 aggressive melee attackers for 4 rounds. 
**Success Criteria:** The commoner survives. Tests control spells (Wall of Force, Hypnotic Pattern), taunt mechanics (Compelled Duel, Ancestral Guardian), and repositioning (Vortex Warp, Telekinetic). Pure damage is often not enough to save the VIP.

**Test Name:** The Artillery Barrage
**Pillar:** Combat
**Description:** Character must cross a 100ft courtyard while taking two DC 15 Dexterity saving throws per round for 8d6 fire/bludgeoning damage (half on success) from siege weapons/spells.
**Success Criteria:** Cross the courtyard without dropping to 0 HP. Exposes characters with low Dexterity saves, lack of Evasion, or no Absorb Elements.

---

## 2. Social Stress Tests

**Test Name:** The Angry Mob
**Pillar:** Social
**Description:** A mob of 50 commoners believes the character is responsible for a local plague. They are currently non-lethal but hostile, holding pitchforks and torches. DC 18 to calm.
**Success Criteria:** De-escalate the situation without killing innocent civilians. Tests high Persuasion/Intimidation, mass-calming magic (Calm Emotions, Mass Suggestion), or creative illusions. Slaying the mob is considered a failure.

**Test Name:** The High-Insight Lie
**Pillar:** Social
**Description:** The character must convince an Ancient Sphinx, a Dragon, or a master Inquisitor (+10 to +14 Insight, passive 20-24) of a complete falsehood to gain passage.
**Success Criteria:** Beat a contested Deception check against a massive Insight, or use magic like Glibness, Modify Memory, or Actor feat. Consistently fails characters with dumped Charisma.

**Test Name:** The Zone of Truth Interrogation
**Pillar:** Social
**Description:** The character is placed in a *Zone of Truth* (DC 15 Charisma save) by high-ranking Paladins and asked directly if they committed a specific crime (which they did, or are covering for).
**Success Criteria:** Pass the CHA save repeatedly, or perfectly evade the question using half-truths and omissions without triggering the inquisitor's suspicion (DC 18 Deception/Persuasion with disadvantage).

**Test Name:** Royal Court Etiquette
**Pillar:** Social
**Description:** Attending a highly formal gala. The character must mingle to find a spy. Requires knowing which fork to use, how to address a Duke, and avoiding insulting the hosts.
**Success Criteria:** Three successful DC 15 checks using History, Insight, or Performance. Failing results in being thrown out by elite guards. Tests Intelligence/Wisdom skills in a Charisma setting. Exposes the "unwashed barbarian" trope.

**Test Name:** The Un-Bribable Guard
**Pillar:** Social
**Description:** An absolutely loyal, well-paid, magically warded guard blocks the only door to the objective. They cannot be charmed (immune) and refuse all gold.
**Success Criteria:** Find a social leverage point (Insight DC 18 to find a flaw/ideal), use disguises/forgery (Deception DC 17), or Intimidate (DC 19). Exposes players who rely solely on "I cast Suggestion" or throwing gold at problems.

**Test Name:** The Pure Language Barrier
**Pillar:** Social
**Description:** The character must negotiate a complex trade deal with an elemental or outsider that only speaks Primordial/Deep Speech, and mind-reading magic fails due to an amulet.
**Success Criteria:** Cast Tongues/Comprehend Languages, or succeed on a series of difficult DC 18 Performance/Insight checks to communicate via pantomime and empathy.

**Test Name:** The Fey Wordplay Bargain
**Pillar:** Social
**Description:** An Archfey offers a deal: "Give me your attention for a moment, and I shall grant you passage." 
**Success Criteria:** Realize the trap (Insight/Arcana DC 16) before agreeing, preventing the Fey from literally stealing the character's "attention" (permanent disadvantage on Perception). Tests player paranoia and character Wisdom.

**Test Name:** The Doppelganger Paranoia
**Pillar:** Social
**Description:** The character is locked in a room with three allied NPCs. One is a Doppelganger. The Doppelganger has perfectly copied memories up to 24 hours ago.
**Success Criteria:** Identify the fake through subtle behavioral tells (Insight DC 17), logical deduction (Investigation DC 16), or forced reveals (Moonbeam).

**Test Name:** The Possessed Ally
**Pillar:** Social / Combat
**Description:** A beloved NPC or party member is possessed by a Ghost. They are subtly trying to sabotage the mission in a social setting (a diplomatic meeting).
**Success Criteria:** Notice the behavioral shift (Insight DC 16), and safely remove the ghost (Protection from Evil and Good, Turn Undead, Dispel Evil) without dealing lethal damage to the host or causing a diplomatic incident.

**Test Name:** The Smear Campaign
**Pillar:** Social
**Description:** Wanted posters with exactly the character's face are plastered across town for a murder they didn't commit. Guards are actively looking for them (Passive Perception 14).
**Success Criteria:** Navigate the city using Disguise Self, Stealth, or Forgery tools to gather evidence, then present it to the magistrate (Persuasion DC 16). Tests anonymity and reputation management.

---

## 3. Exploration & Survival Stress Tests

**Test Name:** The Endless Chasm
**Pillar:** Exploration
**Description:** The character triggers a trapdoor and falls into a 1,000-foot deep pitch-black chasm. They fall 500 feet per round.
**Success Criteria:** Arrest the fall before hitting the bottom on round 2. Tests reactions (Feather Fall), flight speed, wall-climbing abilities (Spider Climb combined with piercing the wall), or teleportation to a ledge. A pure ground-pounder takes 20d6 damage.

**Test Name:** The Blizzard Whitewash
**Pillar:** Survival
**Description:** Caught in a magical blizzard. Visibility is 5 feet. Temperatures inflict DC 15 Constitution saves every hour against Exhaustion. The path is lost.
**Success Criteria:** Navigate to shelter (Survival DC 18 with disadvantage), mitigate cold (Cold resistance, Tiny Hut, Create Bonfire), and keep the party together. Brutally exposes parties without ranger/druid survival skills or magical shelters.

**Test Name:** The Rooftop Escape
**Pillar:** Exploration
**Description:** Fleeing city guards across wet, slanted rooftops. Requires jumping 15-foot gaps, climbing chimneys, and maintaining speed.
**Success Criteria:** Succeed on consecutive DC 15 Athletics (jumping/climbing) and Acrobatics (balancing) checks. Failing halves speed or causes a fall into the streets. Exposes slow characters and heavy armor wearers.

**Test Name:** The Anti-Magic Vault
**Pillar:** Exploration
**Description:** A purely mechanical lock mechanism on a 2-foot thick adamantine door. The room radiates Antimagic. 
**Success Criteria:** Pick the lock (Thieves' Tools DC 20) or physically lift the massive deadbolt via a hidden mechanism (Athletics DC 22). Exposes parties that rely entirely on the *Knock* spell or *Passwall* to bypass dungeons.

**Test Name:** The Filling Room
**Pillar:** Exploration
**Description:** The doors slam shut, locking magically. Water pours in, filling the room completely in 3 rounds. The release lever is hidden behind a puzzle panel.
**Success Criteria:** Hold breath (Con mod minutes), find the lever underwater (Investigation DC 16 at disadvantage due to murkiness), and pull it (Athletics DC 15). Tests underwater capability and under-pressure mental checks.

**Test Name:** The Teleporting Labyrinth
**Pillar:** Exploration
**Description:** A 4-way intersection where looping corridors magically teleport the character back to the start facing a different direction.
**Success Criteria:** Perceive the teleportation seam (Arcana/Perception DC 17), mark the walls to track the loop, or use planar travel / divination (Locate Object) to break the spatial loop.

**Test Name:** Toxic Spore Cloud
**Pillar:** Survival
**Description:** A 100-foot long corridor filled with dense, invisible toxic gas. Every round spent inside requires a DC 16 Constitution save (3d6 poison damage + poisoned condition).
**Success Criteria:** Hold breath (prevents inhalation effects) or sprint through in 1-2 rounds using Dashes. Tests Constitution, Poison resistance, and movement speed. 

**Test Name:** Underwater Attrition
**Pillar:** Exploration / Combat
**Description:** A vital key is located at the bottom of a 100-foot deep lake. A Water Elemental guards it.
**Success Criteria:** Survive the swim down, the combat with disadvantage on standard melee weapons, and the swim up. Tests Water Breathing, swim speed buffs, and adaptation of weapon choices (piercing vs slashing/bludgeoning).

**Test Name:** The Magical Darkness Void
**Pillar:** Exploration
**Description:** An area shrouded in an upcast *Darkness* spell (beats standard darkvision) filled with floor spikes and tripwires.
**Success Criteria:** Navigate the 60-foot room safely. Tests Blindsight, Devil's Sight, high-level light spells (Daylight), or meticulous physical probing (Investigation/Perception DC 18 with disadvantage).

**Test Name:** The Desert Sun
**Pillar:** Survival
**Description:** A 3-day trek across a desert with no oases. Characters need 2 gallons of water per day. Foraging yields nothing.
**Success Criteria:** Provide enough water for the party (Create/Destroy Water, Decanter of Endless Water, survival caches) or survive a spiraling series of Exhaustion checks. Exposes lack of logistical planning.

**Test Name:** The Chase Obstacle Course
**Pillar:** Exploration
**Description:** Pursuing a fleeing nimble thief through a crowded market. Carts block the way, crowds form walls of people, and the thief drops caltrops.
**Success Criteria:** Maintain pace using Dash, maneuver around obstacles (Acrobatics DC 15), push through crowds (Athletics DC 15). If the character fails 3 checks, the thief escapes.

---

## 4. Famous Campaign Set-Pieces & Tropes

**Test Name:** The Amber Temple Run *(Inspired by Curse of Strahd)*
**Pillar:** Combat / Exploration
**Description:** The character must cross a narrow, icy walkway over a lethal drop, while a hidden Arcanaloth casts *Fireball* and *Chain Lightning* from total cover in the dark 100 feet away.
**Success Criteria:** Survive massive elemental burst damage while balancing on slick ice (Acrobatics DC 15 every time damage is taken to not fall). Tests elemental resistances, balance, and dealing with heavily obscured ultra-deadly casters.

**Test Name:** Dinner with the Darklord *(Inspired by Curse of Strahd)*
**Pillar:** Social
**Description:** The BBEG invites the character to a truce dinner. The food is exquisite, the BBEG is polite but constantly casting *Detect Thoughts* and probing for insecurities.
**Success Criteria:** Maintain composure, hide the party's true plans (Charisma/Deception DC 18, or mind-shielding magic), and avoid being provoked into attacking on the BBEG's turf. Exposes impulsive "murder-hobo" or easily provoked characters.

**Test Name:** The Sphere of Annihilation Trap *(Inspired by Tomb of Horrors/Annihilation)*
**Pillar:** Exploration
**Description:** The character is sucked toward a gaping black demonic face on the wall. A localized gravity effect pulls them 10 feet closer every round (Strength DC 15 to resist). Touching the blackness is instant death.
**Success Criteria:** Escape the gravity well using movement magic (Misty Step) or secure themselves (pitons, ropes, immovable rod). Exposes characters with no teleportation or low Strength who get slowly dragged to their doom.

**Test Name:** Demogorgon's Madness *(Inspired by Out of the Abyss)*
**Pillar:** Combat / Survival
**Description:** A CR 20+ entity rises from the water. The character cannot win a fight. Just looking at the entity forces a DC 17 Wisdom save against Long-Term Madness.
**Success Criteria:** Acknowledge an unwinnable fight and run away at full speed while avoiding looking backward. Tests Wisdom saves, player ego (willingness to flee), and movement tech. 

**Test Name:** The Infernal Vehicle Chase *(Inspired by Descent into Avernus)*
**Pillar:** Exploration / Combat
**Description:** Driving a mad-max style war machine across a wasteland at 100 mph. Enemies board the vehicle.
**Success Criteria:** Handle the vehicle's controls (Land Vehicles proficiency / Dexterity DC 16) while fighting off boarders in high winds (Ranged attacks at disadvantage). Exposes lack of tool proficiencies and forces tactical positioning on a moving object.

**Test Name:** The Dragon Attack on Greenest *(Inspired by Tyranny of Dragons)*
**Pillar:** Combat / Survival
**Description:** An Adult Blue Dragon makes strafing runs with its breath weapon every 1d4 rounds on the town while the character fights cultists on the ground.
**Success Criteria:** Manage spell slots and HP over an extended 10-round endurance event without taking a short rest, avoiding clustering for the breath weapon, and dealing with Frightful Presence (DC 16 Wis save). Exposes "nova" builds that run out of resources in 2 rounds.

**Test Name:** The Weeping Colossus Lava Leaps *(Inspired by Princes of the Apocalypse)*
**Pillar:** Exploration
**Description:** Combat takes place over flowing magma. The only footholds are floating rock slabs that sink 1 round after being stepped on.
**Success Criteria:** Constantly use movement to jump between slabs (Athletics DC 14 for long jumps) while engaged in combat. Falling results in 10d10 fire damage. Exposes heavy armor/low strength characters without flight who easily miss jumps.

**Test Name:** The Giant's Bag Toss *(Inspired by Storm King's Thunder)*
**Pillar:** Combat
**Description:** A Hill Giant grabs the character (grapple), stuffs them in its sack (blinded, restrained), and then runs away with them to eat them later.
**Success Criteria:** Cut their way out of the sack from the inside (Slashing/Piercing damage against AC 11, 15 HP) and survive the fall, or escape the grapple dynamically. Exposes bludgeoning-only characters or casters who need line of sight for all vocal/somatic spells.

**Test Name:** The Cassalanter Collateral *(Inspired by Waterdeep Dragon Heist)*
**Pillar:** Combat / Social
**Description:** An assassin fights the character in a crowded wealthy market square. The assassin deliberately uses civilians as cover.
**Success Criteria:** Defeat or capture the assassin without killing civilians with AoE spells or errant arrows, and without the City Watch arriving in 4 rounds to arrest the character. Tests precision combat over blanket damage. 

**Test Name:** The Doppelganger Mirror Room *(Inspired by classic tropes)*
**Pillar:** Combat / Exploration
**Description:** A magical trap creates a perfect, hostile shadow-clone of the character with all their stats, current HP, and spell slots. 
**Success Criteria:** Defeat yourself. This brutally turns every min-maxed strength of the character against them. High AC characters can't hit themselves; nova casters blow themselves up. Tests the character's ability to exploit their own defined weaknesses.

**Test Name:** The Avalon Avalanche *(Inspired by Rime of the Frostmaiden)*
**Pillar:** Survival
**Description:** A massive wall of snow sweeps down the mountain. 300 feet away, moving 100 feet per round.
**Success Criteria:** Find total cover, outrun it, or survive the bludgeoning damage and subsequently dig out of 15 feet of packed snow before suffocating (Athletics DC 16). Exposes low mobility and low Strength.
