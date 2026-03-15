"""Check raw wikidot text for specific species."""
import json, re

data = json.load(open('wikidot_species_raw.json', 'r', encoding='utf-8'))
check = ['Autognome', 'Giff', 'Centaur', 'Lizardfolk', 'Tabaxi', 'Shifter']

for sp in data:
    if sp['name'] in check:
        content = sp['content']
        print(f"===== {sp['name']} =====")
        # Print important sections (first 3000 chars or so)
        print(content[:3000])
        print("\n")
