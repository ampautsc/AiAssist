"""
D&D 5e Character Creator - Flask Application
Main application entry point
"""
from flask import Flask, render_template, request, jsonify, send_file
import json
import os
from pathlib import Path

app = Flask(__name__)
app.config['SECRET_KEY'] = 'dnd-character-creator-secret-key'

# Paths
DATA_DIR = Path(__file__).parent / 'data'
CHARACTERS_DIR = Path(__file__).parent / 'characters'

# Ensure directories exist
CHARACTERS_DIR.mkdir(exist_ok=True)


def load_data(filename):
    """Load JSON data from data directory"""
    filepath = DATA_DIR / filename
    if filepath.exists():
        with open(filepath, 'r', encoding='utf-8') as f:
            return json.load(f)
    return {}


@app.route('/')
def index():
    """Home page - list all characters"""
    characters = []
    if CHARACTERS_DIR.exists():
        for char_file in CHARACTERS_DIR.glob('*.json'):
            try:
                with open(char_file, 'r', encoding='utf-8') as f:
                    char_data = json.load(f)
                    characters.append({
                        'filename': char_file.name,
                        'name': char_data.get('name', 'Unknown'),
                        'race': char_data.get('race', 'Unknown'),
                        'class': char_data.get('class', 'Unknown'),
                        'level': char_data.get('level', 1)
                    })
            except:
                continue
    
    return render_template('index.html', characters=characters)


@app.route('/build-calculator')
def build_calculator():
    """Build calculator and comparison tool"""
    return render_template('build-calculator.html')


@app.route('/create')
def create():
    """Character creation wizard"""
    return render_template('create.html')


@app.route('/character/<filename>')
def character(filename):
    """View character sheet"""
    char_file = CHARACTERS_DIR / filename
    if not char_file.exists():
        return "Character not found", 404
    
    with open(char_file, 'r', encoding='utf-8') as f:
        char_data = json.load(f)
    
    return render_template('character.html', character=char_data, filename=filename)


@app.route('/level-up/<filename>')
def level_up(filename):
    """Level up interface"""
    char_file = CHARACTERS_DIR / filename
    if not char_file.exists():
        return "Character not found", 404
    
    with open(char_file, 'r', encoding='utf-8') as f:
        char_data = json.load(f)
    
    return render_template('level-up.html', character=char_data, filename=filename)


# API Routes
@app.route('/api/races')
def api_races():
    """Get all available races"""
    return jsonify(load_data('races.json'))


@app.route('/api/classes')
def api_classes():
    """Get all available classes"""
    return jsonify(load_data('classes.json'))


@app.route('/api/backgrounds')
def api_backgrounds():
    """Get all available backgrounds"""
    return jsonify(load_data('backgrounds.json'))


@app.route('/api/equipment')
def api_equipment():
    """Get all available equipment"""
    return jsonify(load_data('equipment.json'))


@app.route('/api/spells')
def api_spells():
    """Get all available spells"""
    return jsonify(load_data('spells.json'))


@app.route('/api/feats')
def api_feats():
    """Get all available feats"""
    return jsonify(load_data('feats.json'))


@app.route('/api/character/save', methods=['POST'])
def api_save_character():
    """Save a character"""
    char_data = request.json
    
    # Generate filename from character name
    char_name = char_data.get('name', 'character')
    filename = f"{char_name.lower().replace(' ', '_')}.json"
    char_file = CHARACTERS_DIR / filename
    
    # Save character
    with open(char_file, 'w', encoding='utf-8') as f:
        json.dump(char_data, f, indent=2)
    
    return jsonify({'success': True, 'filename': filename})


@app.route('/api/character/<filename>', methods=['GET'])
def api_get_character(filename):
    """Get character data"""
    char_file = CHARACTERS_DIR / filename
    if not char_file.exists():
        return jsonify({'error': 'Character not found'}), 404
    
    with open(char_file, 'r', encoding='utf-8') as f:
        char_data = json.load(f)
    
    return jsonify(char_data)


@app.route('/api/character/<filename>', methods=['PUT'])
def api_update_character(filename):
    """Update character data"""
    char_file = CHARACTERS_DIR / filename
    if not char_file.exists():
        return jsonify({'error': 'Character not found'}), 404
    
    char_data = request.json
    
    with open(char_file, 'w', encoding='utf-8') as f:
        json.dump(char_data, f, indent=2)
    
    return jsonify({'success': True})


@app.route('/api/character/<filename>', methods=['DELETE'])
def api_delete_character(filename):
    """Delete a character"""
    char_file = CHARACTERS_DIR / filename
    if not char_file.exists():
        return jsonify({'error': 'Character not found'}), 404
    
    char_file.unlink()
    return jsonify({'success': True})


if __name__ == '__main__':
    app.run(debug=True, host='127.0.0.1', port=5000)
