# D&D 5e Character Creator

A comprehensive web-based character creator for Dungeons & Dragons 5th Edition (2014 rules), including all official expansions.

## Features

### Character Creation
- Step-by-step wizard interface
- Multiple ability score generation methods
- All official races and subraces
- All classes and subclasses
- Complete backgrounds
- Equipment selection

### Character Management
- Beautiful character sheet display
- Full progression system (levels 1-20)
- Equipment and inventory management
- Spell tracking and management
- Resource tracking (spell slots, hit dice, etc.)

### Content Library
Includes all content from:
- Player's Handbook
- Xanathar's Guide to Everything
- Tasha's Cauldron of Everything
- Sword Coast Adventurer's Guide
- Volo's Guide to Monsters
- Mordenkainen's Tome of Foes
- Elemental Evil Player's Companion

## Installation

### Prerequisites
- Python 3.8 or higher

### Setup
```bash
# Navigate to the DnD directory
cd DnD

# Install dependencies
pip install -r requirements.txt

# Run the application
python app.py
```

The application will be available at `http://localhost:5000`

## Usage

### Creating a Character
1. Click "Create New Character"
2. Follow the step-by-step wizard:
   - Choose ability score method
   - Select race
   - Select class
   - Choose background
   - Finalize details
3. Review and save your character

### Leveling Up
1. Open an existing character
2. Click "Level Up"
3. Follow the level-up wizard to gain new features

### Managing Characters
- All characters are saved as JSON files in the `characters/` directory
- Export/import characters for backup or sharing
- Edit characters at any time

## Project Structure
```
DnD/
├── app.py                 # Flask application
├── requirements.txt       # Python dependencies
├── static/               # CSS, JavaScript, images
├── templates/            # HTML templates
├── data/                 # D&D content library (JSON)
├── items/                # Markdown documentation for D&D items
├── spells/               # Markdown documentation for D&D spells
├── characters/           # Saved characters
└── utils/               # Python utilities
```

## Documentation
- [Items Master Index](items/ITEMS_INDEX.md)
- [Spells Master Index](spells/SPELLS_INDEX.md)

## Development Status
See [DEVELOPMENT_PLAN.md](DEVELOPMENT_PLAN.md) for full roadmap and progress.

## License
This is a personal project for creating D&D characters. All D&D content is © Wizards of the Coast.
