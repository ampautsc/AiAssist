"""Final verification: cross-check all MANUAL_FIXES against wikidot raw text."""
import json, re

with open('wikidot_species_raw.json', 'r', encoding='utf-8') as f:
    wikidot = json.load(f)

# Build a lookup by slug
wiki_by_slug = {}
for sp in wikidot:
    slug = sp.get('slug', sp['name'].lower().replace(' ', '-').replace('(', '').replace(')', ''))
    wiki_by_slug[slug] = sp

# Key species to verify with their expected MotM values
EXPECTED = {
    # MotM species
    'centaur':     {'type': 'Fey', 'dv': 0, 'speed_walk': 40},
    'satyr':       {'type': 'Fey', 'dv': 0, 'speed_walk': 35, 'magic_res': True},
    'yuan-ti':     {'type': 'Humanoid', 'dv': 60, 'res': ['poison'], 'magic_res': True},
    'changeling':  {'type': 'Fey', 'dv': 0},
    'fairy':       {'type': 'Fey', 'dv': 0, 'flight': True},
    'eladrin':     {'type': 'Humanoid', 'dv': 60},
    'shadar-kai':  {'type': 'Humanoid', 'dv': 60, 'res': ['necrotic']},
    'goblin':      {'type': 'Humanoid', 'dv': 60, 'speed_walk': 30},
    'bugbear':     {'type': 'Humanoid', 'dv': 60},
    'hobgoblin':   {'type': 'Humanoid', 'dv': 60},
    'kobold':      {'type': 'Humanoid', 'dv': 60},
    'harengon':    {'type': 'Humanoid', 'dv': 0},
    'aarakocra':   {'type': 'Humanoid', 'dv': 0, 'flight': True},
    'aasimar':     {'type': 'Humanoid', 'dv': 60, 'res': ['necrotic', 'radiant']},
    'deep-gnome':  {'type': 'Humanoid', 'dv': 120},
    'duergar':     {'type': 'Humanoid', 'dv': 120, 'res': ['poison']},
    'firbolg':     {'type': 'Humanoid', 'dv': 0},
    'githyanki':   {'type': 'Humanoid', 'dv': 0, 'res': ['psychic']},
    'githzerai':   {'type': 'Humanoid', 'dv': 0, 'res': ['psychic']},
    'goliath':     {'type': 'Humanoid', 'dv': 0, 'res': ['cold']},
    'kenku':       {'type': 'Humanoid', 'dv': 0},
    'lizardfolk':  {'type': 'Humanoid', 'dv': 0, 'nat_ac': 13},
    'minotaur':    {'type': 'Humanoid', 'dv': 0},
    'orc':         {'type': 'Humanoid', 'dv': 60},
    'sea-elf':     {'type': 'Humanoid', 'dv': 60, 'res': ['cold']},
    'shifter':     {'type': 'Humanoid', 'dv': 60},
    'tabaxi':      {'type': 'Humanoid', 'dv': 60, 'climb': 30},
    'tortle':      {'type': 'Humanoid', 'dv': 0, 'nat_ac': 17},
    'triton':      {'type': 'Humanoid', 'dv': 60, 'res': ['cold']},
    # Spelljammer
    'autognome':   {'type': 'Construct', 'dv': 0, 'res': ['poison'], 'nat_ac': 13},
    'giff':        {'type': 'Humanoid', 'dv': 0},
    'hadozee':     {'type': 'Humanoid', 'dv': 0},
    'plasmoid':    {'type': 'Ooze', 'dv': 60, 'res': ['poison']},
    'thri-kreen':  {'type': 'Monstrosity', 'dv': 60, 'nat_ac': 13},
    # Other books
    'owlin':       {'type': 'Humanoid', 'dv': 120, 'flight': True},
    'dhampir':     {'type': 'Humanoid', 'dv': 60},
    'hexblood':    {'type': 'Fey', 'dv': 60},
    'reborn':      {'type': 'Humanoid', 'dv': 60, 'res': ['poison']},
    'warforged':   {'type': 'Humanoid', 'dv': 0, 'res': ['poison']},
    'kalashtar':   {'type': 'Humanoid', 'dv': 0, 'res': ['psychic']},
    'leonin':      {'type': 'Humanoid', 'dv': 60, 'speed_walk': 35},
    'loxodon':     {'type': 'Humanoid', 'dv': 0, 'nat_ac': 12},
}

print("FINAL VERIFICATION: Expected traits vs WikiDot raw text")
print("=" * 60)

errors = 0
verified = 0

for slug, expected in sorted(EXPECTED.items()):
    sp = wiki_by_slug.get(slug)
    if not sp:
        print(f"  WARNING: {slug} not found in wikidot data!")
        continue
    
    content = sp['content']
    # Find best section (MotM or Spelljammer)
    motm = re.search(r'Mordenkainen Presents: Monsters of the Multiverse(.*?)(?=\nVolo|Mordenkainen.s Tome|\nEberron|\Z)', content, re.DOTALL)
    sj = re.search(r'Source: Spelljammer.*?\n(.*?)$', content, re.DOTALL)
    section = motm.group(0) if motm else (sj.group(0) if sj else content)
    
    issues = []
    
    # Verify creature type
    if 'type' in expected:
        if expected['type'] == 'Fey':
            if not re.search(r'You are (?:a )?Fey', section, re.I):
                issues.append(f"Type: expected Fey, not found in text")
        elif expected['type'] == 'Construct':
            if not re.search(r'You are a Construct', section, re.I):
                issues.append(f"Type: expected Construct, not found in text")
        elif expected['type'] == 'Ooze':
            if not re.search(r'You are an Ooze', section, re.I):
                issues.append(f"Type: expected Ooze, not found in text")
        elif expected['type'] == 'Monstrosity':
            if not re.search(r'You are a Monstrosity', section, re.I):
                issues.append(f"Type: expected Monstrosity, not found in text")
    
    # Verify darkvision
    if 'dv' in expected:
        dv_match = re.search(r'Darkvision\.\s*You can see.*?(\d+)\s*feet', section, re.I)
        actual_dv = int(dv_match.group(1)) if dv_match else 0
        if actual_dv != expected['dv']:
            issues.append(f"DV: expected {expected['dv']}, found {actual_dv}")
    
    # Verify resistances
    if 'res' in expected:
        actual_res = sorted(set(m.lower() for m in re.findall(r'resistance to (\w+) damage', section, re.I) if m.lower() not in ('all', 'the')))
        expected_res = sorted(expected['res'])
        if actual_res != expected_res:
            issues.append(f"Res: expected {expected_res}, found {actual_res}")
    
    # Verify magic resistance
    if expected.get('magic_res'):
        if not re.search(r'Magic Resistance\.\s*You have advantage on saving throws against spells', section, re.I):
            issues.append(f"Magic Resistance: expected but not found")
    
    if issues:
        print(f"  ✗ {slug}: {'; '.join(issues)}")
        errors += 1
    else:
        print(f"  ✓ {slug}")
        verified += 1

print(f"\nResults: {verified} verified, {errors} issues")
