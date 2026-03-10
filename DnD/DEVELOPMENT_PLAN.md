# D&D 5e Character Creator - Development Plan

## Project Overview
A comprehensive D&D 5th Edition (2014 rules) character creator web application that handles full character creation, progression, equipment, and abilities.

## Technology Stack
- **Backend**: Python Flask
- **Frontend**: HTML5, CSS3, JavaScript
- **UI Framework**: Bootstrap 5 (modern, responsive, beautiful)
- **Data Storage**: JSON files
- **Character Exports**: JSON format

## Project Structure
```
DnD/
├── app.py                          # Flask application entry point
├── requirements.txt                # Python dependencies
├── README.md                       # Project documentation
├── OPEN_QUESTIONS.md              # Development questions and TODOs
├── static/
│   ├── css/
│   │   └── style.css              # Custom styles
│   ├── js/
│   │   ├── character-creator.js   # Character creation logic
│   │   ├── character-display.js   # Character sheet display
│   │   └── utils.js               # Utility functions
│   └── images/                    # Icons, backgrounds, etc.
├── templates/
│   ├── base.html                  # Base template
│   ├── index.html                 # Home page
│   ├── create.html                # Character creation wizard
│   ├── character.html             # Character sheet view
│   └── level-up.html              # Level up interface
├── data/                          # D&D 5e content library (JSON)
│   ├── races.json                 # All playable races
│   ├── classes.json               # All classes and subclasses
│   ├── backgrounds.json           # Character backgrounds
│   ├── equipment.json             # Weapons, armor, gear
│   ├── spells.json                # All spells
│   ├── feats.json                 # Optional feats
│   └── skills.json                # Skill list
├── characters/                    # Saved characters (JSON)
└── utils/
    ├── __init__.py
    ├── character_builder.py       # Character creation logic
    ├── level_calculator.py        # XP and leveling
    ├── dice_roller.py             # Dice rolling utilities
    └── validators.py              # Data validation
```

## Development Phases

### Phase 1: Foundation Setup ✓
- [x] Create DnD folder structure
- [x] Set up Flask application skeleton
- [x] Create requirements.txt
- [x] Set up basic HTML templates with Bootstrap
- [x] Create OPEN_QUESTIONS.md

### Phase 2: Data Library Creation
Build comprehensive JSON libraries for all D&D 5e content:

#### 2.1 Core Rules (Player's Handbook)
- [ ] Races: Human, Elf, Dwarf, Halfling, Dragonborn, Gnome, Half-Elf, Half-Orc, Tiefling
- [ ] Classes: Barbarian, Bard, Cleric, Druid, Fighter, Monk, Paladin, Ranger, Rogue, Sorcerer, Warlock, Wizard
- [ ] Subclasses for all classes
- [ ] Backgrounds
- [ ] Equipment (weapons, armor, adventuring gear)
- [ ] Spells (all PHB spells)
- [ ] Feats

#### 2.2 Expansion Content
- [ ] **Xanathar's Guide to Everything**: Additional subclasses, spells, racial feats
- [ ] **Tasha's Cauldron of Everything**: Custom lineages, additional subclasses, variant features
- [ ] **Sword Coast Adventurer's Guide**: Regional backgrounds, variant races
- [ ] **Volo's Guide to Monsters**: Monstrous races (Goblin, Kobold, Orc, etc.)
- [ ] **Mordenkainen's Tome of Foes**: Variant subraces (Eladrin, Shadar-kai, etc.)
- [ ] **Elemental Evil Player's Companion**: Genasi and additional spells

### Phase 3: Character Creation Workflow
Step-by-step wizard interface:

1. **Ability Scores**
   - Standard Array (15, 14, 13, 12, 10, 8)
   - Point Buy system
   - Manual entry
   - Roll 4d6 drop lowest (with re-roll option)

2. **Race Selection**
   - Display all available races
   - Show racial traits, ability score increases
   - Subraces where applicable

3. **Class Selection**
   - Display all classes
   - Show hit dice, proficiencies, equipment
   - Starting equipment selection

4. **Background**
   - Select background
   - Personality traits, ideals, bonds, flaws
   - Background features

5. **Final Details**
   - Character name, alignment
   - Physical description
   - Equipment customization
   - Starting gold (if not taking equipment)

6. **Review & Save**
   - Complete character sheet preview
   - Save as JSON file

### Phase 4: Character Sheet Display
- [ ] Beautiful, readable character sheet layout
- [ ] All stats clearly displayed
- [ ] Proficiency bonuses calculated
- [ ] Spell slots (for casters)
- [ ] Equipment inventory
- [ ] Features and traits
- [ ] Combat stats (AC, HP, initiative, etc.)

### Phase 5: Level Up System
- [ ] XP tracking
- [ ] Automated level-up wizard
- [ ] Hit points (rolled or average)
- [ ] New class features
- [ ] Spell selection for casters
- [ ] Ability score improvements / feats
- [ ] Subclass selection at appropriate levels

### Phase 6: Advanced Features
- [ ] Multiple character management
- [ ] Character export/import
- [ ] Print-friendly character sheet
- [ ] Dice roller integration
- [ ] Spell preparation tracking
- [ ] Short/long rest management
- [ ] Death saves tracking
- [ ] Inventory weight calculation

## Open Questions to Address

### Character Creation Rules
1. How to handle multiclassing rules?
2. Should we enforce race/class restrictions or allow all combinations?
3. Optional rules support (feats, multiclassing)?

### Spell System
4. How to handle spell preparation vs spells known?
5. Cantrip scaling by character level
6. Spell slot management

### Equipment
7. Starting gold alternative to equipment packages?
8. Magic item support?
9. Attunement tracking?

### Combat Features
10. How to calculate and display attack bonuses?
11. Weapon properties and their effects?
12. Action economy display?

### Leveling
13. XP tracking vs milestone leveling?
14. Hit point rolling vs taking average?
15. Retroactive changes when abilities improve?

## Success Criteria
- ✓ Creates valid D&D 5e characters following all rules
- ✓ Beautiful, intuitive UI
- ✓ Runs locally without issues
- ✓ All official 2014 content included
- ✓ Character progression through all 20 levels
- ✓ Can be hosted as web application later
- ✓ Fast and responsive

## Timeline Estimate
- Phase 1: Foundation - 1 day
- Phase 2: Data Library - 3-4 days (lots of data entry)
- Phase 3: Character Creation - 2-3 days
- Phase 4: Character Sheet - 1-2 days
- Phase 5: Level Up - 2 days
- Phase 6: Advanced Features - 2-3 days

**Total: ~2 weeks for full implementation**

## Next Steps
1. Set up Flask application structure
2. Install dependencies
3. Create base templates
4. Start building data library (races first, then classes)
5. Build character creation wizard iteratively
