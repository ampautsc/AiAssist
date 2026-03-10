"""
Build Calculator and DPR Calculator
Calculates damage per round for different builds
"""


def calculate_modifier(ability_score):
    """Calculate ability modifier"""
    return (ability_score - 10) // 2


def calculate_to_hit(level, ability_mod, proficiency=True, magic_bonus=0, feat_penalty=0):
    """Calculate to-hit bonus"""
    prof_bonus = 2 + ((level - 1) // 4) if proficiency else 0
    return ability_mod + prof_bonus + magic_bonus + feat_penalty


def calculate_damage(
    weapon_damage_dice,
    weapon_damage_count,
    ability_mod,
    magic_bonus=0,
    extra_damage=0,
    extra_damage_dice=0,
    extra_damage_count=0
):
    """Calculate average damage per hit"""
    # Average of a die is (max + 1) / 2
    weapon_avg = weapon_damage_count * ((weapon_damage_dice + 1) / 2)
    extra_avg = extra_damage_count * ((extra_damage_dice + 1) / 2) if extra_damage_dice > 0 else 0
    
    total_damage = weapon_avg + ability_mod + magic_bonus + extra_damage + extra_avg
    return total_damage


def calculate_hit_chance(to_hit_bonus, target_ac=15):
    """Calculate hit probability"""
    needed_roll = target_ac - to_hit_bonus
    
    if needed_roll <= 1:
        return 0.95  # Always hit except on nat 1
    elif needed_roll >= 20:
        return 0.05  # Only hit on nat 20
    else:
        return (21 - needed_roll) / 20


def calculate_dpr(
    level,
    ability_score,
    weapon_damage_dice,
    weapon_damage_count=1,
    attacks_per_round=1,
    bonus_action_attack=False,
    magic_weapon_bonus=0,
    sharpshooter=False,
    extra_damage_per_hit=0,
    extra_damage_dice=0,
    extra_damage_count=0,
    target_ac=15,
    advantage=False,
    disadvantage=False
):
    """
    Calculate Damage Per Round
    
    Args:
        level: Character level
        ability_score: Primary attacking ability (DEX or STR)
        weapon_damage_dice: Die size (6 for d6, 8 for d8, etc.)
        weapon_damage_count: Number of dice
        attacks_per_round: Number of attacks from Extra Attack
        bonus_action_attack: Whether you get a bonus action attack
        magic_weapon_bonus: +1/+2/+3 weapon
        sharpshooter: Using Sharpshooter -5/+10
        extra_damage_per_hit: Flat damage bonus (like Sneak Attack, Divine Smite)
        extra_damage_dice: Extra damage die size
        extra_damage_count: Number of extra damage dice
        target_ac: Enemy armor class
        advantage: Rolling with advantage
        disadvantage: Rolling with disadvantage
    
    Returns:
        dict with DPR breakdown
    """
    ability_mod = calculate_modifier(ability_score)
    
    # Calculate to-hit
    feat_penalty = -5 if sharpshooter else 0
    to_hit = calculate_to_hit(level, ability_mod, True, magic_weapon_bonus, feat_penalty)
    
    # Calculate damage per hit
    sharpshooter_damage = 10 if sharpshooter else 0
    damage_per_hit = calculate_damage(
        weapon_damage_dice,
        weapon_damage_count,
        ability_mod,
        magic_weapon_bonus,
        sharpshooter_damage + extra_damage_per_hit,
        extra_damage_dice,
        extra_damage_count
    )
    
    # Calculate hit chance
    base_hit_chance = calculate_hit_chance(to_hit, target_ac)
    
    if advantage:
        hit_chance = 1 - ((1 - base_hit_chance) ** 2)
    elif disadvantage:
        hit_chance = base_hit_chance ** 2
    else:
        hit_chance = base_hit_chance
    
    # Critical hits (5% chance, double weapon dice only)
    crit_damage = weapon_damage_count * ((weapon_damage_dice + 1) / 2)
    if extra_damage_dice > 0:
        crit_damage += extra_damage_count * ((extra_damage_dice + 1) / 2)
    
    # Expected damage per attack
    expected_damage_per_attack = (hit_chance * damage_per_hit) + (0.05 * crit_damage)
    
    # Total attacks
    total_attacks = attacks_per_round
    if bonus_action_attack:
        total_attacks += 1
    
    total_dpr = expected_damage_per_attack * total_attacks
    
    return {
        'dpr': round(total_dpr, 2),
        'to_hit': to_hit,
        'hit_chance': round(hit_chance * 100, 1),
        'damage_per_hit': round(damage_per_hit, 2),
        'attacks_per_round': total_attacks,
        'expected_per_attack': round(expected_damage_per_attack, 2)
    }


def compare_builds(builds):
    """
    Compare multiple builds side by side
    
    Args:
        builds: List of build configurations
    
    Returns:
        Comparison dict
    """
    results = []
    
    for build in builds:
        dpr_result = calculate_dpr(**build['stats'])
        
        results.append({
            'name': build['name'],
            'description': build.get('description', ''),
            'dpr': dpr_result['dpr'],
            'to_hit': dpr_result['to_hit'],
            'hit_chance': dpr_result['hit_chance'],
            'utility': build.get('utility', []),
            'spell_slots': build.get('spell_slots', {}),
            'breakdown': dpr_result
        })
    
    # Sort by DPR
    results.sort(key=lambda x: x['dpr'], reverse=True)
    
    return results


# Example: Ranged Bard Builds
if __name__ == '__main__':
    # College of Valor Bard with Sharpshooter
    valor_sharpshooter = {
        'name': 'Valor Bard - Sharpshooter',
        'description': 'College of Valor, Longbow, Sharpshooter feat',
        'stats': {
            'level': 8,
            'ability_score': 18,  # 16 base + 2 ASI
            'weapon_damage_dice': 8,
            'weapon_damage_count': 1,
            'attacks_per_round': 2,  # Extra Attack from Valor
            'sharpshooter': True,
            'magic_weapon_bonus': 1,
            'target_ac': 16
        },
        'utility': ['Bardic Inspiration', 'Full spellcasting', 'Jack of All Trades'],
        'spell_slots': {1: 4, 2: 3, 3: 3, 4: 2}
    }
    
    # College of Lore Bard with Magic Initiate
    lore_versatile = {
        'name': 'Lore Bard - Spell Focus',
        'description': 'College of Lore, Light Crossbow, focus on spells',
        'stats': {
            'level': 8,
            'ability_score': 20,  # 16 + 2 ASI to max CHA
            'weapon_damage_dice': 8,
            'weapon_damage_count': 1,
            'attacks_per_round': 1,
            'target_ac': 16
        },
        'utility': ['Bardic Inspiration', 'Cutting Words', 'Full spellcasting', 'Extra Magical Secrets', 'Jack of All Trades'],
        'spell_slots': {1: 4, 2: 3, 3: 3, 4: 2}
    }
    
    # College of Valor with Crossbow Expert
    valor_crossbow = {
        'name': 'Valor Bard - Crossbow Expert',
        'description': 'College of Valor, Hand Crossbow, Crossbow Expert',
        'stats': {
            'level': 8,
            'ability_score': 18,
            'weapon_damage_dice': 6,
            'weapon_damage_count': 1,
            'attacks_per_round': 2,  # Extra Attack
            'bonus_action_attack': True,  # Crossbow Expert
            'magic_weapon_bonus': 1,
            'target_ac': 16
        },
        'utility': ['Bardic Inspiration', 'Full spellcasting', 'Jack of All Trades'],
        'spell_slots': {1: 4, 2: 3, 3: 3, 4: 2}
    }
    
    builds = [valor_sharpshooter, lore_versatile, valor_crossbow]
    comparison = compare_builds(builds)
    
    print("=== RANGED BARD BUILD COMPARISON ===\n")
    for i, build in enumerate(comparison, 1):
        print(f"{i}. {build['name']}")
        print(f"   DPR: {build['dpr']}")
        print(f"   To Hit: +{build['to_hit']} ({build['hit_chance']}% hit chance)")
        print(f"   Description: {build['description']}")
        print(f"   Utility: {', '.join(build['utility'])}")
        print(f"   Spell Slots: {build['spell_slots']}")
        print(f"   Breakdown: {build['breakdown']}")
        print()
