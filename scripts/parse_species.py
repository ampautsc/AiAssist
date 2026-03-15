"""
Parse scraped wikidot species data and extract MotM traits for comparison.
Focuses on extracting: creature type, darkvision, speed, resistances, 
innate spells, flight, natural armor, key trait names.
"""
import json
import re

with open("scripts/wikidot_species_raw.json", "r", encoding="utf-8") as f:
    species_data = json.load(f)

def extract_motm_section(content):
    """Extract the MotM section if present, otherwise return full content."""
    # Many pages have both MotM and older versions separated by headers
    # MotM section typically starts with "Mordenkainen Presents: Monsters of the Multiverse"
    # or "Mordenkainen Presents" 
    lines = content.split('\n')
    
    # Check if there's a MotM section
    motm_start = None
    next_section = None
    
    for i, line in enumerate(lines):
        if 'Mordenkainen Presents' in line or 'Monsters of the Multiverse' in line:
            motm_start = i
        elif motm_start is not None and (
            "Volo's Guide" in line or 
            "Mordenkainen's Tome" in line or
            "Elemental Evil" in line or
            "Eberron" in line or
            "Mythic Odysseys" in line or
            "Acquisitions Incorporated" in line or
            "Guildmasters' Guide" in line or
            "Explorer's Guide" in line or
            "Van Richten's" in line or
            "Spelljammer" in line or
            "Strixhaven" in line or
            "Wild Beyond" in line or
            "Dragonlance" in line or
            "Fizban's" in line
        ):
            next_section = i
            break
    
    if motm_start is not None:
        if next_section is not None:
            return '\n'.join(lines[motm_start:next_section])
        return '\n'.join(lines[motm_start:])
    
    return content

def parse_traits(text, name):
    """Extract key mechanical traits from text."""
    result = {
        "name": name,
        "source": "unknown",
        "creature_type": "Humanoid",
        "darkvision": 0,
        "speed": 30,
        "resistances": [],
        "condition_immunities": [],
        "innate_spells": [],
        "has_flight": False,
        "flight_restriction": None,
        "natural_armor_ac": None,
        "traits": [],
        "key_features": []
    }
    
    lower = text.lower()
    
    # Source detection
    if 'mordenkainen presents' in lower or 'monsters of the multiverse' in lower:
        result["source"] = "MPMM"
    elif "eberron" in lower:
        result["source"] = "ERLW"
    elif "spelljammer" in lower or "astral adventurer" in lower:
        result["source"] = "AAG"
    elif "van richten" in lower:
        result["source"] = "VRG"
    elif "strixhaven" in lower:
        result["source"] = "SCC"
    elif "wild beyond" in lower:
        result["source"] = "WBtW"
    elif "dragonlance" in lower:
        result["source"] = "DSotDQ"
    elif "guildmasters" in lower or "ravnica" in lower:
        result["source"] = "GGR"
    elif "mythic odysseys" in lower or "theros" in lower:
        result["source"] = "MOT"
    elif "fizban" in lower:
        result["source"] = "FTD"
    
    # Creature type
    ct_match = re.search(r'creature type\.\s*you are (?:a |an )?(\w+)', lower)
    if ct_match:
        ct = ct_match.group(1)
        if ct == 'fey': result["creature_type"] = "Fey"
        elif ct == 'construct': result["creature_type"] = "Construct"
        elif ct == 'humanoid': result["creature_type"] = "Humanoid"
        elif ct == 'monstrosity': result["creature_type"] = "Monstrosity"
        elif ct == 'ooze': result["creature_type"] = "Ooze"
        elif ct == 'aberration': result["creature_type"] = "Aberration"
    # Also check for "You are also considered a Fey" etc.
    if 'you are also considered a fey' in lower or 'you count as a fey' in lower:
        result["creature_type"] = "Fey"
    
    # Darkvision
    dv_match = re.search(r'darkvision\.\s*you can see in dim light within (\d+) feet', lower)
    if dv_match:
        result["darkvision"] = int(dv_match.group(1))
    else:
        # Check for "superior darkvision" 
        sdv_match = re.search(r'superior darkvision.*?(\d+)\s*(?:ft|feet)', lower)
        if sdv_match:
            result["darkvision"] = int(sdv_match.group(1))
    
    # Speed
    speed_match = re.search(r'(?:walking |base )?speed.*?(\d+)\s*feet', lower)
    if speed_match:
        result["speed"] = int(speed_match.group(1))
    
    # Resistances
    res_matches = re.findall(r'resistance to (\w+) damage', lower)
    for r in res_matches:
        if r not in result["resistances"]:
            result["resistances"].append(r)
    
    # Condition immunities
    if "immune to the poisoned condition" in lower or "can't be poisoned" in lower:
        result["condition_immunities"].append("poisoned")
    if "immune to disease" in lower:
        result["condition_immunities"].append("disease")
    
    # Flight
    if re.search(r'you have a flying speed', lower):
        result["has_flight"] = True
        if 'medium or heavy armor' in lower:
            result["flight_restriction"] = "no medium or heavy armor"
    
    # Natural Armor
    ac_match = re.search(r'(?:natural armor|shell).*?(?:base )?ac (?:of |is )?(\d+)', lower)
    if ac_match:
        result["natural_armor_ac"] = int(ac_match.group(1))
    
    # Innate spells - cantrips
    cantrip_matches = re.findall(r'you (?:know|learn) the\s+([A-Z][\w\s/\']+?)\s+cantrip', text)
    for spell in cantrip_matches:
        result["innate_spells"].append({"spell": spell.strip(), "level": 1})
    
    # Innate spells - leveled
    level_spell_matches = re.findall(r'(?:starting at|once you reach|when you reach) (\d+)(?:st|nd|rd|th) level.*?cast (?:the\s+)?([A-Z][\w\s/\']+?)(?:\s+spell|\s+once|\s+with|\s+without|\s+a number)', text)
    for level, spell in level_spell_matches:
        result["innate_spells"].append({"spell": spell.strip(), "level": int(level)})
    
    # Also "you can cast X" without level
    always_cast = re.findall(r'you can (?:also )?cast (?:the\s+)?([A-Z][\w\s/\']+?)\s+(?:spell\s+)?(?:once|with this|a number|without)', text)
    for spell in always_cast:
        s = spell.strip()
        if len(s) > 2 and len(s) < 40 and not any(x["spell"].lower() == s.lower() for x in result["innate_spells"]):
            result["innate_spells"].append({"spell": s, "level": 1})
    
    # Key features - extract named traits (bold headers or "TraitName." patterns)
    trait_matches = re.findall(r'(?:^|\n)([A-Z][\w\s\']+?)\.\s+(.+?)(?=\n[A-Z][\w\s\']+?\.|$)', text, re.DOTALL)
    for trait_name, trait_desc in trait_matches:
        tn = trait_name.strip()
        # Skip metadata traits
        if tn.lower() in ('creature type', 'type', 'age', 'alignment', 'size', 'speed', 
                          'languages', 'life span', 'ability score increase', 
                          'table of contents', 'fold', 'unfold'):
            continue
        if len(tn) < 40:
            result["traits"].append(tn)
    
    # Magic Resistance check
    if 'advantage on saving throws against spells' in lower:
        result["key_features"].append("Magic Resistance")
    
    # Advantage on saves against charm
    if 'advantage on saving throws' in lower and 'charmed' in lower:
        result["key_features"].append("Charm Resistance")
    
    # Telepathy
    if 'telepathic' in lower or 'telepathy' in lower:
        result["key_features"].append("Telepathy")
    
    return result

print("=" * 80)
print("SPECIES TRAIT COMPARISON: Wikidot vs seed-species.js")
print("=" * 80)

all_parsed = []
for sp in species_data:
    if "error" in sp:
        print(f"\n!!! {sp['name']}: SCRAPE ERROR - {sp['error']}")
        continue
    
    content = sp["content"]
    # Use MotM section if available
    motm = extract_motm_section(content)
    parsed = parse_traits(motm, sp["name"])
    all_parsed.append(parsed)

# Now print the comparison
for parsed in all_parsed:
    name = parsed["name"]
    print(f"\n--- {name} ({parsed['source']}) ---")
    print(f"  Type: {parsed['creature_type']}")
    print(f"  DV: {parsed['darkvision']}")
    print(f"  Speed: {parsed['speed']}")
    if parsed['resistances']:
        print(f"  Resistances: {', '.join(parsed['resistances'])}")
    if parsed['condition_immunities']:
        print(f"  Condition Immunities: {', '.join(parsed['condition_immunities'])}")
    if parsed['has_flight']:
        print(f"  Flight: YES ({parsed['flight_restriction'] or 'no restriction'})")
    if parsed['natural_armor_ac']:
        print(f"  Natural Armor: AC {parsed['natural_armor_ac']}")
    if parsed['innate_spells']:
        print(f"  Innate Spells: {', '.join(s['spell'] + ' (L' + str(s['level']) + ')' for s in parsed['innate_spells'])}")
    if parsed['key_features']:
        print(f"  Key Features: {', '.join(parsed['key_features'])}")
    if parsed['traits']:
        print(f"  Traits: {', '.join(parsed['traits'][:10])}")

# Save parsed results
with open("scripts/wikidot_species_parsed.json", "w", encoding="utf-8") as f:
    json.dump(all_parsed, f, indent=2, ensure_ascii=False)
print(f"\n\nSaved parsed data to scripts/wikidot_species_parsed.json")
