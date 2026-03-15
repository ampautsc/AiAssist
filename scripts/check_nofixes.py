"""Check key trait lines for species without manual fixes."""
import json, re

data = json.load(open('wikidot_species_raw.json', 'r', encoding='utf-8'))
check = ['Centaur','Lizardfolk','Shifter','Autognome','Plasmoid','Thri-kreen',
         'Sea Elf','Triton','Goliath','Orc','Bugbear','Hobgoblin','Kobold',
         'Githyanki','Githzerai','Leonin','Kender','Deep Gnome','Duergar',
         'Genasi (Air)','Genasi (Earth)','Genasi (Fire)','Genasi (Water)',
         'Tabaxi','Kenku','Loxodon','Simic Hybrid','Vedalken',
         'Astral Elf','Giff','Hadozee']

for sp in data:
    if sp['name'] in check:
        content = sp['content']
        # Find MotM section
        m = re.search(r'Mordenkainen Presents: Monsters of the Multiverse(.*?)(?=\nVolo|Mordenkainen.s Tome|\nEberron|\nMythic|\nGuildmasters|\nExplorer|\nSpelljammer|\nDragonlance|\Z)', content, re.DOTALL)
        section = m.group(0) if m else content[:2000]
        
        print(f"===== {sp['name']} =====")
        
        # Check creature type
        ct = re.search(r'Creature Type\.\s*(.*?)(?=Size|$)', section, re.I | re.DOTALL)
        if ct:
            print(f"  TYPE: {ct.group(1).strip()[:150]}")
        
        # Check speed
        spd = re.search(r'Speed\.\s*(.*?)(?=\n|Darkvision|$)', section, re.I)
        if spd:
            print(f"  SPEED: {spd.group(1).strip()[:150]}")
        
        # Check darkvision
        dv = re.search(r'(?:Superior )?Darkvision\.\s*(.*?)(?=\n[A-Z]|$)', section, re.I)
        if dv:
            print(f"  DV: {dv.group(1).strip()[:150]}")
        elif 'Darkvision' not in section:
            print(f"  DV: NONE")
        
        # Check natural armor
        na = re.search(r'(?:Natural Armor|Shell)\.\s*(.*?)(?=\n[A-Z]|$)', section, re.I)
        if na:
            print(f"  NAT ARMOR: {na.group(1).strip()[:200]}")
        
        # Check resistances
        res = re.findall(r'resistance to (\w+) damage', section, re.I)
        if res:
            print(f"  RESISTANCES: {res}")
        
        # Check condition immunities
        if re.search(r"immune to disease", section, re.I):
            print(f"  COND IMM: disease")
        if re.search(r"immune to.*?poisoned", section, re.I):
            print(f"  COND IMM: poisoned")
        
        # Check flight
        if re.search(r'flying speed', section, re.I):
            fl = re.search(r'(.*?flying speed.*?)(?=\n|$)', section, re.I)
            if fl:
                print(f"  FLIGHT: {fl.group(1).strip()[:150]}")
        
        print()
