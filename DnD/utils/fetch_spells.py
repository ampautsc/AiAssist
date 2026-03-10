import requests
import json
import os
import time

BASE_URL = "https://www.dnd5eapi.co"
SPELLS_DIR = os.path.join(os.path.dirname(os.path.dirname(__file__)), "spells")

def get_spell_level_file(level):
    if level == 0:
        return "SPELLS_CANTRIPS.md"
    else:
        return f"SPELLS_LEVEL_{level}.md"

def format_spell(spell):
    name = spell.get("name", "Unknown Spell")
    level = spell.get("level", 0)
    school = spell.get("school", {}).get("name", "Unknown School")
    
    level_str = "Cantrip" if level == 0 else f"Level {level}"
    
    casting_time = spell.get("casting_time", "Unknown")
    range_str = spell.get("range", "Unknown")
    
    components = spell.get("components", [])
    comp_str = ", ".join(components)
    if "M" in components and "material" in spell:
        comp_str += f" ({spell['material']})"
        
    duration = spell.get("duration", "Unknown")
    if spell.get("concentration", False):
        duration = f"Concentration, {duration}"
        
    classes = [c.get("name") for c in spell.get("classes", [])]
    classes_str = ", ".join(classes)
    
    # Try to infer tags based on damage types or description
    tags = []
    if "damage" in spell:
        tags.append("Damage")
    if "heal_at_slot_level" in spell:
        tags.append("Healing")
    if "buff" in spell.get("desc", [""])[0].lower():
        tags.append("Buff")
    if not tags:
        tags.append("Utility")
    tags_str = ", ".join(tags)
    
    desc = "\n\n".join(spell.get("desc", []))
    
    higher_levels = ""
    if "higher_level" in spell and spell["higher_level"]:
        higher_levels = "\n\n**At Higher Levels:**\n" + "\n\n".join(spell["higher_level"])
        
    template = f"""
### {name}
*{level_str} {school}*

- **Casting Time:** {casting_time}
- **Range:** {range_str}
- **Components:** {comp_str}
- **Duration:** {duration}
- **Classes:** {classes_str}
- **Tags:** {tags_str}

**Description:**
{desc}{higher_levels}

**Evaluation Notes:**
* [Pros/Cons for specific builds]
* [Synergies with class features or other spells]

---
"""
    return template

def main():
    print("Fetching spell list...")
    response = requests.get(f"{BASE_URL}/api/spells")
    if response.status_code != 200:
        print("Failed to fetch spell list.")
        return
        
    spells_data = response.json()
    spell_results = spells_data.get("results", [])
    total_spells = len(spell_results)
    print(f"Found {total_spells} spells. Fetching details...")
    
    # Group spells by level
    spells_by_level = {i: [] for i in range(10)}
    
    for i, spell_ref in enumerate(spell_results):
        print(f"Fetching {i+1}/{total_spells}: {spell_ref['name']}...")
        spell_url = f"{BASE_URL}{spell_ref['url']}"
        
        try:
            spell_resp = requests.get(spell_url, timeout=10)
            if spell_resp.status_code == 200:
                spell_detail = spell_resp.json()
                level = spell_detail.get("level", 0)
                formatted = format_spell(spell_detail)
                
                # Write immediately to avoid losing data on crash
                filename = get_spell_level_file(level)
                filepath = os.path.join(SPELLS_DIR, filename)
                with open(filepath, "a", encoding="utf-8") as f:
                    f.write(formatted)
            else:
                print(f"Failed to fetch {spell_ref['name']} (Status: {spell_resp.status_code})")
        except Exception as e:
            print(f"Error fetching {spell_ref['name']}: {e}")
            
        # Be nice to the API
        time.sleep(0.1)
        
    print("Done!")

if __name__ == "__main__":
    main()
