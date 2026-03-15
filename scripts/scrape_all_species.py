"""
Scrape ALL published species from dnd5e.wikidot.com and extract MotM traits.
Outputs a JSON summary for comparison against seed-species.js.
"""
import json
import time
from playwright.sync_api import sync_playwright

# All published (non-UA) species from the index
SPECIES_PAGES = [
    # Standard
    ("Dragonborn", "/lineage:dragonborn"),
    ("Dwarf", "/lineage:dwarf"),
    ("Elf", "/lineage:elf"),
    ("Gnome", "/lineage:gnome"),
    ("Half-Elf", "/lineage:half-elf"),
    ("Half-Orc", "/lineage:half-orc"),
    ("Halfling", "/lineage:halfling"),
    ("Human", "/lineage:human"),
    ("Tiefling", "/lineage:tiefling"),
    # Custom
    ("Custom Lineage", "/lineage:custom"),
    # Exotic
    ("Aarakocra", "/lineage:aarakocra"),
    ("Aasimar", "/lineage:aasimar"),
    ("Changeling", "/lineage:changeling"),
    ("Deep Gnome", "/lineage:deep-gnome"),
    ("Duergar", "/lineage:duergar"),
    ("Eladrin", "/lineage:eladrin"),
    ("Fairy", "/lineage:fairy"),
    ("Firbolg", "/lineage:firbolg"),
    ("Genasi (Air)", "/lineage:genasi-air"),
    ("Genasi (Earth)", "/lineage:genasi-earth"),
    ("Genasi (Fire)", "/lineage:genasi-fire"),
    ("Genasi (Water)", "/lineage:genasi-water"),
    ("Githyanki", "/lineage:githyanki"),
    ("Githzerai", "/lineage:githzerai"),
    ("Goliath", "/lineage:goliath"),
    ("Harengon", "/lineage:harengon"),
    ("Kenku", "/lineage:kenku"),
    ("Locathah", "/lineage:locathah"),
    ("Owlin", "/lineage:owlin"),
    ("Satyr", "/lineage:satyr"),
    ("Sea Elf", "/lineage:sea-elf"),
    ("Shadar-Kai", "/lineage:shadar-kai"),
    ("Tabaxi", "/lineage:tabaxi"),
    ("Tortle", "/lineage:tortle"),
    ("Triton", "/lineage:triton"),
    ("Verdan", "/lineage:verdan"),
    # Monstrous
    ("Bugbear", "/lineage:bugbear"),
    ("Centaur", "/lineage:centaur"),
    ("Goblin", "/lineage:goblin"),
    ("Grung", "/lineage:grung"),
    ("Hobgoblin", "/lineage:hobgoblin"),
    ("Kobold", "/lineage:kobold"),
    ("Lizardfolk", "/lineage:lizardfolk"),
    ("Minotaur", "/lineage:minotaur"),
    ("Orc", "/lineage:orc"),
    ("Shifter", "/lineage:shifter"),
    ("Yuan-Ti", "/lineage:yuan-ti"),
    # Dragonlance
    ("Kender", "/lineage:kender"),
    # Eberron
    ("Kalashtar", "/lineage:kalashtar"),
    ("Warforged", "/lineage:warforged"),
    # Plane Shift
    ("Aetherborn", "/lineage:aetherborn"),
    ("Aven", "/lineage:aven"),
    ("Khenra", "/lineage:khenra"),
    ("Kor", "/lineage:kor"),
    ("Merfolk", "/lineage:merfolk"),
    ("Naga", "/lineage:naga"),
    ("Siren", "/lineage:siren"),
    ("Vampire", "/lineage:vampire"),
    # Ravenloft
    ("Dhampir", "/lineage:dhampir"),
    ("Hexblood", "/lineage:hexblood"),
    ("Reborn", "/lineage:reborn"),
    # Ravnica
    ("Loxodon", "/lineage:loxodon"),
    ("Simic Hybrid", "/lineage:simic-hybrid"),
    ("Vedalken", "/lineage:vedalken"),
    # Spelljammer
    ("Astral Elf", "/lineage:elf-astral"),
    ("Autognome", "/lineage:autognome"),
    ("Giff", "/lineage:giff"),
    ("Hadozee", "/lineage:hadozee"),
    ("Plasmoid", "/lineage:plasmoid"),
    ("Thri-kreen", "/lineage:thri-kreen"),
    # Theros
    ("Leonin", "/lineage:leonin"),
]

BASE_URL = "https://dnd5e.wikidot.com"

def scrape_species(page, name, path):
    """Scrape a single species page and return its text content."""
    url = f"{BASE_URL}{path}"
    try:
        page.goto(url, wait_until='domcontentloaded', timeout=20000)
        page.wait_for_timeout(1500)
        content = page.locator('#page-content').inner_text()
        return {"name": name, "url": url, "content": content}
    except Exception as e:
        return {"name": name, "url": url, "error": str(e)}

def main():
    results = []
    with sync_playwright() as p:
        browser = p.chromium.launch(headless=True)
        pg = browser.new_page()
        
        total = len(SPECIES_PAGES)
        for i, (name, path) in enumerate(SPECIES_PAGES):
            print(f"[{i+1}/{total}] Scraping {name}...", flush=True)
            result = scrape_species(pg, name, path)
            results.append(result)
            if "error" in result:
                print(f"  ERROR: {result['error']}")
            else:
                lines = result["content"].count('\n')
                print(f"  OK ({lines} lines)")
            time.sleep(0.5)  # Be polite
        
        browser.close()
    
    # Save raw results
    out_path = "scripts/wikidot_species_raw.json"
    with open(out_path, 'w', encoding='utf-8') as f:
        json.dump(results, f, indent=2, ensure_ascii=False)
    print(f"\nSaved {len(results)} species to {out_path}")

if __name__ == "__main__":
    main()
