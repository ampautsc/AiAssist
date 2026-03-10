import requests
import json

BASE_URL = "https://www.dnd5eapi.co"

def main():
    print("Fetching spell list...")
    response = requests.get(f"{BASE_URL}/api/spells")
    if response.status_code != 200:
        print("Failed to fetch spell list.")
        return
        
    spells_data = response.json()
    spell_results = spells_data.get("results", [])
    total_spells = len(spell_results)
    print(f"Found {total_spells} spells. Analyzing class availability...")
    
    bard_exclusive = []
    bard_spells = []
    
    for i, spell_ref in enumerate(spell_results):
        spell_url = f"{BASE_URL}{spell_ref['url']}"
        spell_resp = requests.get(spell_url)
        
        if spell_resp.status_code == 200:
            spell_detail = spell_resp.json()
            classes = [c.get("name") for c in spell_detail.get("classes", [])]
            
            if "Bard" in classes:
                bard_spells.append({
                    "name": spell_detail.get("name"),
                    "level": spell_detail.get("level"),
                    "classes": classes
                })
                
                if classes == ["Bard"]:
                    bard_exclusive.append({
                        "name": spell_detail.get("name"),
                        "level": spell_detail.get("level"),
                        "school": spell_detail.get("school", {}).get("name", "Unknown")
                    })
    
    print("\n" + "="*60)
    print("BARD-EXCLUSIVE SPELLS (Only Bards can cast these)")
    print("="*60)
    
    if not bard_exclusive:
        print("No spells found that are exclusive to Bards.")
    else:
        # Sort by level
        bard_exclusive.sort(key=lambda x: x["level"])
        
        current_level = -1
        for spell in bard_exclusive:
            if spell["level"] != current_level:
                current_level = spell["level"]
                level_str = "Cantrip" if current_level == 0 else f"Level {current_level}"
                print(f"\n--- {level_str} ---")
            print(f"  • {spell['name']} ({spell['school']})")
    
    print(f"\n\nTotal Bard-exclusive spells: {len(bard_exclusive)}")
    print(f"Total spells available to Bards: {len(bard_spells)}")

if __name__ == "__main__":
    main()
