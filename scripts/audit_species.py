"""
Comprehensive species audit: extract key traits from raw wikidot text 
and compare against seed-species.js MANUAL_FIXES.
"""
import json, re, sys

with open('wikidot_species_raw.json', 'r', encoding='utf-8') as f:
    wikidot = json.load(f)

# ── Helper: extract the MotM (or best) section from raw content ──────────
def get_best_section(raw_content):
    """Return the MotM section if present, else the full content."""
    # Try to find MotM section
    motm_pattern = r"Mordenkainen Presents: Monsters of the Multiverse\s*(.*?)(?=\n(?:Volo's|Mordenkainen's Tome|Eberron|Unearthed Arcana|Explorer's|Mythic Odysseys|Guildmasters'|Strixhaven|Spelljammer|Dragonlance|Acquisitions|Van Richten|Astral Adventurer|Plane Shift|Source:)|\Z)"
    m = re.search(motm_pattern, raw_content, re.DOTALL | re.IGNORECASE)
    if m:
        return m.group(0)
    return raw_content

def extract_creature_type(text):
    m = re.search(r'Creature Type\.\s*You are (?:a |an )?(\w+)', text, re.I)
    if m:
        ct = m.group(1).capitalize()
        if ct in ('Fey', 'Humanoid', 'Construct', 'Undead', 'Monstrosity', 'Ooze', 'Aberration'):
            return ct
    # Also check for "Type. You are a Fey"
    m = re.search(r'\bYou are (?:a |an )?(\w+)\b', text, re.I)
    if m:
        ct = m.group(1).capitalize()
        if ct in ('Fey', 'Humanoid', 'Construct', 'Undead', 'Monstrosity', 'Ooze', 'Aberration'):
            return ct
    return None

def extract_darkvision(text):
    m = re.search(r'(?:Superior )?Darkvision\.\s*You can see in dim light within (\d+) feet', text, re.I)
    if m:
        return int(m.group(1))
    # Check for "you have darkvision out to N feet"
    m = re.search(r'darkvision.*?(\d+)\s*(?:ft|feet)', text, re.I)
    if m:
        return int(m.group(1))
    return 0

def extract_speed(text):
    speed = {}
    m = re.search(r'(?:walking|base) speed (?:is|of) (\d+)', text, re.I)
    if m:
        speed['walk'] = int(m.group(1))
    m = re.search(r'flying speed (?:equal to|of) (?:your walking speed|(\d+))', text, re.I)
    if m:
        speed['fly'] = int(m.group(1)) if m.group(1) else speed.get('walk', 30)
    m = re.search(r'swimming speed (?:equal to|of) (?:your walking speed|(\d+))', text, re.I)
    if m:
        speed['swim'] = int(m.group(1)) if m.group(1) else speed.get('walk', 30)
    m = re.search(r'climbing speed (?:equal to|of) (?:your walking speed|(\d+))', text, re.I)
    if m:
        speed['climb'] = int(m.group(1)) if m.group(1) else speed.get('walk', 30)
    return speed

def has_flight(text):
    """Check for PERMANENT flight (not temporary like Aasimar/Gem Dragonborn)."""
    # "flying speed equal to walking speed" that's always on
    if re.search(r'(?:you have a |have a )flying speed equal to your walking speed', text, re.I):
        return True
    if re.search(r'Flight\.\s*(?:Because of your wings, you|You) have a flying speed', text, re.I):
        return True
    return False

def extract_resistances(text):
    res = set()
    for m in re.finditer(r'resistance to (\w+) damage', text, re.I):
        res.add(m.group(1).lower())
    return sorted(res)

def extract_condition_immunities(text):
    imm = set()
    if re.search(r"immune to disease", text, re.I):
        imm.add('disease')
    if re.search(r"can't be poisoned|immune to the poisoned condition", text, re.I):
        imm.add('poisoned')
    if re.search(r"immune to.*?charmed", text, re.I):
        imm.add('charmed')
    if re.search(r"immune to.*?frightened", text, re.I):
        imm.add('frightened')
    return sorted(imm)

def has_magic_resistance(text):
    return bool(re.search(r'Magic Resistance\.\s*You have advantage on saving throws against spells', text, re.I))

def extract_cantrips(text):
    cantrips = []
    for m in re.finditer(r'you (?:know|learn) the (\w[\w\s/]+?) cantrip', text, re.I):
        cantrips.append(m.group(1).strip())
    return cantrips

def extract_key_traits(text):
    """Extract trait names from the text."""
    traits = []
    # Match patterns like "Trait Name. Description" 
    for m in re.finditer(r'(?:^|\n\s*)([A-Z][\w\s\'-]+?)\.\s+(?=[A-Z])', text):
        name = m.group(1).strip()
        # Filter out non-trait matches
        skip = {'Ability Score Increase', 'Creature Type', 'Size', 'Speed', 'Languages', 
                'Age', 'Alignment', 'Life Span', 'Source', 'Type'}
        if name not in skip and len(name) < 40:
            traits.append(name)
    return traits

def extract_natural_armor(text):
    m = re.search(r'(?:base AC|AC) of (\d+)', text, re.I)
    if m:
        return int(m.group(1))
    return None

def extract_natural_weapons(text):
    weapons = []
    for m in re.finditer(r'(\w[\w\s]+?)\.\s*(?:You (?:can use|have).*?(?:unarmed|natural).*?(\d+d\d+))', text, re.I):
        weapons.append({'name': m.group(1).strip(), 'damage': m.group(2)})
    # Simpler: check for Xd6 damage in context of unarmed/natural
    for m in re.finditer(r'(?:unarmed strike|make unarmed strikes).*?(\d+d\d+)\s*\+\s*your Strength modifier\s+(\w+)\s+damage', text, re.I):
        weapons.append({'damage': m.group(1), 'type': m.group(2)})
    return weapons

def get_size(text):
    if re.search(r'You are Medium or Small', text, re.I):
        return ['Medium', 'Small']
    if re.search(r'You are Small', text, re.I):
        return ['Small']
    if re.search(r'You are Medium', text, re.I):
        return ['Medium']
    return None

# ── MANUAL_FIXES from seed-species.js (reconstructed) ──────────────────
MANUAL_FIXES = {
    'fairy': {'creatureType': 'Fey', 'hasFlight': True, 'darkvision': None},
    'satyr': {'creatureType': 'Fey', 'darkvision': 0, 'resistances': []},
    'yuan-ti': {'creatureType': 'Humanoid', 'darkvision': 60, 'resistances': ['poison'], 'conditionImmunities': []},
    'tortle': {'creatureType': 'Humanoid', 'naturalArmorAC': 17},
    'firbolg': {'creatureType': 'Humanoid'},
    'eladrin': {'creatureType': 'Humanoid', 'darkvision': 60},
    'shadar-kai': {'creatureType': 'Humanoid', 'darkvision': 60, 'resistances': ['necrotic']},
    'goblin': {'creatureType': 'Humanoid', 'darkvision': 60, 'resistances': [], 'conditionImmunities': []},
    'aarakocra': {'creatureType': 'Humanoid', 'hasFlight': True},
    'aasimar': {'creatureType': 'Humanoid', 'darkvision': 60, 'hasFlight': False, 'resistances': ['necrotic', 'radiant']},
    'changeling': {'creatureType': 'Fey'},
    'owlin': {'creatureType': 'Humanoid', 'darkvision': 120, 'hasFlight': True},
    'kalashtar': {'creatureType': 'Humanoid', 'resistances': ['psychic']},
    'warforged': {'creatureType': 'Humanoid', 'conditionImmunities': ['disease'], 'resistances': ['poison']},
    'dhampir': {'creatureType': 'Humanoid', 'darkvision': 60},
    'hexblood': {'creatureType': 'Fey', 'darkvision': 60},
    'reborn': {'creatureType': 'Humanoid', 'resistances': ['poison']},
    'verdan': {'creatureType': 'Humanoid'},
    'custom': {'creatureType': 'Humanoid'},
    'minotaur': {'creatureType': 'Humanoid', 'hasFlight': False, 'naturalArmorAC': None},
    'orc': {},
    'elf': {'hasFlight': False},
    'tiefling': {'hasFlight': False},
    'simic-hybrid': {'naturalArmorAC': None},
}

# ── Run the audit ────────────────────────────────────────────────────────
print("=" * 80)
print("COMPREHENSIVE SPECIES AUDIT: WikiDot vs seed-species.js")
print("=" * 80)

issues = []
info = []

for sp in wikidot:
    name = sp['name']
    slug = sp.get('slug', name.lower().replace(' ', '-').replace('(', '').replace(')', ''))
    raw = sp.get('content', '')
    
    # Use MotM section if available
    best = get_best_section(raw)
    has_motm = 'Mordenkainen Presents: Monsters of the Multiverse' in raw
    
    # Extract traits from wikidot
    wiki_type = extract_creature_type(best)
    wiki_dv = extract_darkvision(best)
    wiki_speed = extract_speed(best)
    wiki_flight = has_flight(best)
    wiki_res = extract_resistances(best)
    wiki_cond_imm = extract_condition_immunities(best)
    wiki_magic_res = has_magic_resistance(best)
    wiki_cantrips = extract_cantrips(best)
    wiki_nat_armor = extract_natural_armor(best)
    wiki_size = get_size(best)
    
    # Get what seed-species.js has (via manual fix or default processing)
    fix = MANUAL_FIXES.get(slug, {})
    
    # Print summary
    print(f"\n{'─' * 60}")
    print(f"  {name} (slug: {slug}) {'[MotM]' if has_motm else ''}")
    print(f"{'─' * 60}")
    print(f"  WikiDot: Type={wiki_type or '?'}, DV={wiki_dv}, Speed={wiki_speed}, Flight={wiki_flight}")
    print(f"           Res={wiki_res}, CondImm={wiki_cond_imm}, MagicRes={wiki_magic_res}")
    print(f"           Cantrips={wiki_cantrips}, NatArmor={wiki_nat_armor}, Size={wiki_size}")
    
    if fix:
        print(f"  SeedFix: {fix}")
    
    # ── Check for discrepancies ──
    
    # 1. Creature Type
    if wiki_type and fix.get('creatureType') and fix['creatureType'] != wiki_type:
        msg = f"  ⚠ {name}: CREATURE TYPE mismatch — WikiDot={wiki_type}, Fix={fix['creatureType']}"
        print(msg)
        issues.append(msg)
    
    # 2. Darkvision
    if fix.get('darkvision') is not None and wiki_dv != fix['darkvision']:
        msg = f"  ⚠ {name}: DARKVISION mismatch — WikiDot={wiki_dv}, Fix={fix['darkvision']}"
        print(msg)
        issues.append(msg)
    
    # 3. Resistances
    if 'resistances' in fix and sorted(fix['resistances']) != wiki_res:
        msg = f"  ⚠ {name}: RESISTANCE mismatch — WikiDot={wiki_res}, Fix={fix['resistances']}"
        print(msg)
        issues.append(msg)
    
    # 4. Condition Immunities
    if 'conditionImmunities' in fix and sorted(fix['conditionImmunities']) != wiki_cond_imm:
        msg = f"  ⚠ {name}: CONDITION IMMUNITY mismatch — WikiDot={wiki_cond_imm}, Fix={fix['conditionImmunities']}"
        print(msg)
        issues.append(msg)
    
    # 5. Flight
    if 'hasFlight' in fix and fix['hasFlight'] != wiki_flight:
        msg = f"  ⚠ {name}: FLIGHT mismatch — WikiDot={wiki_flight}, Fix={fix['hasFlight']}"
        print(msg)
        issues.append(msg)
    
    # ── Species WITHOUT manual fixes that may need them ──
    if not fix and has_motm:
        needs_fix = []
        if wiki_type and wiki_type != 'Humanoid':
            needs_fix.append(f"Type={wiki_type}")
        if wiki_magic_res:
            needs_fix.append("has Magic Resistance")
        if wiki_flight:
            needs_fix.append("has Flight")
        if wiki_nat_armor:
            needs_fix.append(f"NatArmor={wiki_nat_armor}")
        if wiki_dv and wiki_dv != 60:
            needs_fix.append(f"DV={wiki_dv} (non-standard)")
        if needs_fix:
            msg = f"  ℹ {name}: MotM species WITHOUT manual fix, notable: {', '.join(needs_fix)}"
            print(msg)
            info.append(msg)

# ── Check for species in seed that aren't in wikidot ──
print(f"\n{'=' * 80}")
print("SPECIES IN MANUAL_FIXES NOT IN WIKIDOT:")
print(f"{'=' * 80}")
wikidot_slugs = set()
for sp in wikidot:
    slug = sp.get('slug', sp['name'].lower().replace(' ', '-').replace('(', '').replace(')', ''))
    wikidot_slugs.add(slug)

for slug in MANUAL_FIXES:
    if slug not in wikidot_slugs and slug != 'custom':
        print(f"  {slug} — in MANUAL_FIXES but no wikidot page")

# ── Summary ──
print(f"\n{'=' * 80}")
print("AUDIT SUMMARY")
print(f"{'=' * 80}")
print(f"Total species on WikiDot: {len(wikidot)}")
print(f"Species with MANUAL_FIXES: {len(MANUAL_FIXES)}")
print(f"Discrepancies found: {len(issues)}")
print(f"Info/suggestions: {len(info)}")

if issues:
    print("\n⚠ ISSUES TO FIX:")
    for i in issues:
        print(i)

if info:
    print("\nℹ ITEMS TO REVIEW:")
    for i in info:
        print(i)
