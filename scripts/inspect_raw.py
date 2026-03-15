"""Inspect species-raw.json to see what data the seed script gets."""
import json

with open('species-raw.json', 'r', encoding='utf-8') as f:
    data = json.load(f)

print(f"Total species in species-raw.json: {len(data)}")
print()

for s in sorted(data, key=lambda x: x.get('name', '?')):
    name = s.get('name', '?')
    slug = s.get('slug', '?')
    ct = s.get('creatureType', '?')
    dv = s.get('darkvision', '?')
    flight = s.get('hasFlight', False)
    nat_ac = s.get('naturalArmorAC', None)
    res = s.get('resistances', [])
    ci = s.get('conditionImmunities', [])
    speed = s.get('speed', {})
    has_raw = bool(s.get('rawText', ''))
    traits = [t.get('name', '?') for t in s.get('traitList', [])]
    
    flags = []
    if ct and ct not in ('?', 'Humanoid', 'a'):
        flags.append(f"Type={ct}")
    if ct == 'a':
        flags.append("Type=BAD('a')")
    if dv and dv != '?' and dv > 0:
        flags.append(f"DV={dv}")
    if flight:
        flags.append("Flight")
    if nat_ac:
        flags.append(f"NatAC={nat_ac}")
    if res:
        flags.append(f"Res={res}")
    if ci:
        flags.append(f"CondImm={ci}")
    if speed.get('fly'):
        flags.append(f"Fly={speed['fly']}")
    if speed.get('swim'):
        flags.append(f"Swim={speed['swim']}")
    if speed.get('climb'):
        flags.append(f"Climb={speed['climb']}")
    if speed.get('walk') and speed['walk'] != 30:
        flags.append(f"Walk={speed['walk']}")
    
    flag_str = " | ".join(flags) if flags else ""
    print(f"  {name:<25} ({slug})  {flag_str}")
    if traits:
        print(f"    Traits: {', '.join(traits[:8])}")
