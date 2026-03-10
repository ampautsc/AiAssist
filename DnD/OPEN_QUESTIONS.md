# Open Questions - D&D Character Creator

## What We Need to Know About a Character

### Core Identity
- [ ] Character Name
- [ ] Player Name
- [ ] Race (and subrace if applicable)
- [ ] Class (and subclass when chosen)
- [ ] Level
- [ ] Background
- [ ] Alignment
- [ ] Experience Points

### Ability Scores
- [ ] Strength (base, racial modifiers, final)
- [ ] Dexterity (base, racial modifiers, final)
- [ ] Constitution (base, racial modifiers, final)
- [ ] Intelligence (base, racial modifiers, final)
- [ ] Wisdom (base, racial modifiers, final)
- [ ] Charisma (base, racial modifiers, final)
- [ ] Ability Score Improvements taken

### Combat Stats
- [ ] Hit Points (max and current)
- [ ] Hit Dice (total and remaining)
- [ ] Armor Class
- [ ] Initiative modifier
- [ ] Speed
- [ ] Proficiency Bonus
- [ ] Death Saves (successes and failures)

### Proficiencies
- [ ] Armor proficiencies
- [ ] Weapon proficiencies
- [ ] Tool proficiencies
- [ ] Skill proficiencies
- [ ] Saving throw proficiencies
- [ ] Languages

### Skills & Saving Throws
For each skill:
- [ ] Base ability modifier
- [ ] Proficiency (yes/no/expertise)
- [ ] Final modifier

For each saving throw:
- [ ] Base ability modifier
- [ ] Proficiency status
- [ ] Final modifier

### Features & Traits
- [ ] Racial traits
- [ ] Class features (by level)
- [ ] Background features
- [ ] Feats (if taken)

### Equipment & Inventory
- [ ] Weapons (name, damage, properties)
- [ ] Armor (name, AC, type)
- [ ] Adventuring gear
- [ ] Currency (copper, silver, electrum, gold, platinum)
- [ ] Magic items
- [ ] Attunement slots (used/total)
- [ ] Carrying capacity

### Spellcasting (if applicable)
- [ ] Spellcasting ability
- [ ] Spell save DC
- [ ] Spell attack bonus
- [ ] Spell slots by level (total and remaining)
- [ ] Spells known/prepared
- [ ] Cantrips known
- [ ] Ritual casting capability
- [ ] Spellbook (for wizards)

### Personality & Roleplay
- [ ] Personality Traits
- [ ] Ideals
- [ ] Bonds
- [ ] Flaws
- [ ] Physical Description
- [ ] Age
- [ ] Height
- [ ] Weight
- [ ] Eyes
- [ ] Skin
- [ ] Hair
- [ ] Backstory

### Resource Tracking
- [ ] Current hit points
- [ ] Temporary hit points
- [ ] Spell slots remaining
- [ ] Hit dice remaining
- [ ] Class resource uses (rage, ki, channel divinity, etc.)
- [ ] Short rests taken
- [ ] Long rest tracking

### Advancement
- [ ] Current XP
- [ ] XP to next level
- [ ] Choices made at each level
- [ ] Subclass selection level
- [ ] ASI/Feat choices by level

## Technical Questions

### Data Validation
- [ ] How do we validate race/class/level combinations?
- [ ] How do we enforce prerequisites for feats?
- [ ] How do we validate spell selections?

### Calculations
- [ ] How do we calculate spell slots for multiclass characters?
- [ ] How do we handle features that scale with level?
- [ ] How do we calculate carrying capacity with size variations?

### User Interface
- [ ] What's the most intuitive flow for character creation?
- [ ] How do we display complex features clearly?
- [ ] How do we make spell management easy?

### Data Structure
- [ ] Best JSON schema for character data?
- [ ] How to structure class features to support all variations?
- [ ] How to handle spell lists efficiently?

## Rules Questions to Implement

### Character Creation Rules
1. Ability score generation methods (standard array, point buy, rolling) ✓
2. Racial ability score bonuses ✓
3. Starting equipment vs starting gold
4. Spell selection for starting casters
5. Skill proficiency selection order

### Subraces - Conditional Selections Needed
**Dwarf Subraces:**
- Mountain Dwarf (+2 STR, light/medium armor proficiency)
- Hill Dwarf (+1 WIS, +1 HP per level)

**Elf Subraces:**
- High Elf (+1 INT, wizard cantrip, extra language, longsword/shortsword/longbow/shortbow proficiency)
- Wood Elf (+1 WIS, +5 ft speed, mask of the wild, longsword/shortsword/longbow/shortbow proficiency)
- Dark Elf/Drow (+1 CHA, superior darkvision 120ft, sunlight sensitivity, drow magic, rapier/shortsword/hand crossbow proficiency)

**Halfling Subraces:**
- Lightfoot Halfling (+1 CHA, naturally stealthy)
- Stout Halfling (+1 CON, dwarven resilience against poison)

**Gnome Subraces:**
- Forest Gnome (+1 DEX, natural illusionist, speak with small beasts)
- Rock Gnome (+1 CON, artificer's lore, tinker)

**Dragonborn - Dragon Type Selection:**
Must choose draconic ancestry:
- Black (Acid damage, 5x30 ft line)
- Blue (Lightning damage, 5x30 ft line)
- Brass (Fire damage, 5x30 ft line)
- Bronze (Lightning damage, 5x30 ft line)
- Copper (Acid damage, 5x30 ft line)
- Gold (Fire damage, 15 ft cone)
- Green (Poison damage, 15 ft cone)
- Red (Fire damage, 15 ft cone)
- Silver (Cold damage, 15 ft cone)
- White (Cold damage, 15 ft cone)

**Tiefling Variants (from supplements):**
- Standard PHB Tiefling (Asmodeus bloodline)
- Other bloodlines in variant rules

**Half-Elf - Ability Score Choices:**
Must select 2 different ability scores to increase by 1

### Class-Specific Conditional Selections

**Cleric - Domain Selection (Level 1):**
- Life Domain (PHB)
- Light Domain (PHB)
- Knowledge Domain (PHB)
- Nature Domain (PHB)
- Tempest Domain (PHB)
- Trickery Domain (PHB)
- War Domain (PHB)

**Fighter - Fighting Style (Level 1):**
- Archery, Defense, Dueling, Great Weapon Fighting, Protection, Two-Weapon Fighting
**Fighter - Martial Archetype (Level 3):**
- Champion, Battle Master, Eldritch Knight

**Wizard - Arcane Tradition (Level 2):**
- Abjuration, Conjuration, Divination, Enchantment, Evocation, Illusion, Necromancy, Transmutation

**Rogue - Roguish Archetype (Level 3):**
- Thief, Assassin, Arcane Trickster

**Barbarian - Primal Path (Level 3):**
- Path of the Berserker, Path of the Totem Warrior

**Bard - Bard College (Level 3):**
- College of Lore, College of Valor

**Druid - Druid Circle (Level 2):**
- Circle of the Land, Circle of the Moon

**Monk - Monastic Tradition (Level 3):**
- Way of the Open Hand, Way of Shadow, Way of the Four Elements

**Paladin - Sacred Oath (Level 3):**
- Oath of Devotion, Oath of the Ancients, Oath of Vengeance

**Ranger - Ranger Archetype (Level 3):**
- Hunter, Beast Master
**Ranger - Favored Enemy (Level 1):** Choose type
**Ranger - Natural Explorer (Level 1):** Choose terrain type

**Sorcerer - Sorcerous Origin (Level 1):**
- Draconic Bloodline (must choose dragon ancestor)
- Wild Magic

**Warlock - Otherworldly Patron (Level 1):**
- The Fiend, The Archfey, The Great Old One
**Warlock - Pact Boon (Level 3):**
- Pact of the Chain, Pact of the Blade, Pact of the Tome

### Skill Selection Questions
**Fighter:** Choose 2 from list
**Wizard:** Choose 2 from list
**Rogue:** Choose 4 from list
**Cleric:** Choose 2 from list
**Barbarian:** Choose 2 from list
**Bard:** Choose ANY 3 skills
**Druid:** Choose 2 from list
**Monk:** Choose 2 from list
**Paladin:** Choose 2 from list
**Ranger:** Choose 3 from list
**Sorcerer:** Choose 2 from list
**Warlock:** Choose 2 from list

### Background-Specific Choices
**Hermit:** Define your discovery
**Charlatan:** Choose your con specialty
**Guild Artisan:** Choose your artisan's tools type
**Entertainer:** Choose your entertainment type and musical instrument
**Criminal:** Choose your criminal specialty
**Soldier:** Choose your specialty (infantry, cavalry, etc.)

### Starting Equipment Choices
Each class has multiple equipment package options - need UI to select from choices marked (a), (b), (c)

### Spellcasting Initialization
**Full Casters at Level 1:**
- **Bard:** Know 4 cantrips, 4 spells from bard list
- **Cleric:** Know all cleric cantrips, prepare WIS mod + level spells
- **Druid:** Know 2 cantrips, prepare WIS mod + level spells
- **Sorcerer:** Know 4 cantrips, 2 spells from sorcerer list
- **Warlock:** Know 2 cantrips, 2 spells from warlock list (Pact Magic)
- **Wizard:** Know 3 cantrips, 6 spells in spellbook from wizard list

### Multiclassing (Optional Rule)
1. Prerequisites (minimum ability scores)
2. Proficiency gains from multiclassing
3. Spell slot calculation
4. Hit point calculation
5. Class feature limitations

### Optional Rules Support
1. Feats (instead of ASI)
2. Variant human traits
3. Custom lineages (Tasha's)
4. Customizing ability scores (Tasha's)

### Leveling Up Process
1. Hit point increase (roll or average)
2. New class features
3. Spell selection/preparation changes
4. Ability score improvement timing (levels 4, 8, 12, 16, 19)
5. Subclass selection levels (varies by class)

## Content Coverage Questions

### What Needs to be in the Library?
- [ ] All PHB races and variants
- [ ] All expansion races
- [ ] All classes with progression tables
- [ ] All subclasses with features by level
- [ ] All backgrounds with features
- [ ] All equipment with properties
- [ ] All spells with full descriptions
- [ ] All feats with prerequisites

### How Detailed Should Content Be?
- [ ] Full spell descriptions or summaries?
- [ ] Complete feature text or just mechanics?
- [ ] Equipment descriptions or just stats?
- [ ] Should we include flavor text?
