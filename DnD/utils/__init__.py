"""
Utility functions for character creation
"""


def calculate_modifier(ability_score):
    """Calculate ability modifier from ability score"""
    return (ability_score - 10) // 2


def calculate_proficiency_bonus(level):
    """Calculate proficiency bonus based on character level"""
    return 2 + ((level - 1) // 4)


def point_buy_cost(score):
    """Calculate point buy cost for an ability score"""
    costs = {8: 0, 9: 1, 10: 2, 11: 3, 12: 4, 13: 5, 14: 7, 15: 9}
    return costs.get(score, 0)


def is_valid_point_buy(scores):
    """Validate point buy scores (27 points, 8-15 range)"""
    if any(score < 8 or score > 15 for score in scores):
        return False
    total_cost = sum(point_buy_cost(score) for score in scores)
    return total_cost == 27


STANDARD_ARRAY = [15, 14, 13, 12, 10, 8]


def calculate_spell_slots(character_class, level):
    """Calculate spell slots for a character"""
    # Spell slot tables for each full caster
    full_caster_slots = {
        1: [2, 0, 0, 0, 0, 0, 0, 0, 0],
        2: [3, 0, 0, 0, 0, 0, 0, 0, 0],
        3: [4, 2, 0, 0, 0, 0, 0, 0, 0],
        4: [4, 3, 0, 0, 0, 0, 0, 0, 0],
        5: [4, 3, 2, 0, 0, 0, 0, 0, 0],
        6: [4, 3, 3, 0, 0, 0, 0, 0, 0],
        7: [4, 3, 3, 1, 0, 0, 0, 0, 0],
        8: [4, 3, 3, 2, 0, 0, 0, 0, 0],
        9: [4, 3, 3, 3, 1, 0, 0, 0, 0],
        10: [4, 3, 3, 3, 2, 0, 0, 0, 0],
        11: [4, 3, 3, 3, 2, 1, 0, 0, 0],
        12: [4, 3, 3, 3, 2, 1, 0, 0, 0],
        13: [4, 3, 3, 3, 2, 1, 1, 0, 0],
        14: [4, 3, 3, 3, 2, 1, 1, 0, 0],
        15: [4, 3, 3, 3, 2, 1, 1, 1, 0],
        16: [4, 3, 3, 3, 2, 1, 1, 1, 0],
        17: [4, 3, 3, 3, 2, 1, 1, 1, 1],
        18: [4, 3, 3, 3, 3, 1, 1, 1, 1],
        19: [4, 3, 3, 3, 3, 2, 1, 1, 1],
        20: [4, 3, 3, 3, 3, 2, 2, 1, 1],
    }
    
    # Half caster spell slots (Paladin, Ranger)
    half_caster_slots = {
        1: [0, 0, 0, 0, 0, 0, 0, 0, 0],
        2: [2, 0, 0, 0, 0, 0, 0, 0, 0],
        3: [3, 0, 0, 0, 0, 0, 0, 0, 0],
        4: [3, 0, 0, 0, 0, 0, 0, 0, 0],
        5: [4, 2, 0, 0, 0, 0, 0, 0, 0],
        6: [4, 2, 0, 0, 0, 0, 0, 0, 0],
        7: [4, 3, 0, 0, 0, 0, 0, 0, 0],
        8: [4, 3, 0, 0, 0, 0, 0, 0, 0],
        9: [4, 3, 2, 0, 0, 0, 0, 0, 0],
        10: [4, 3, 2, 0, 0, 0, 0, 0, 0],
        11: [4, 3, 3, 0, 0, 0, 0, 0, 0],
        12: [4, 3, 3, 0, 0, 0, 0, 0, 0],
        13: [4, 3, 3, 1, 0, 0, 0, 0, 0],
        14: [4, 3, 3, 1, 0, 0, 0, 0, 0],
        15: [4, 3, 3, 2, 0, 0, 0, 0, 0],
        16: [4, 3, 3, 2, 0, 0, 0, 0, 0],
        17: [4, 3, 3, 3, 1, 0, 0, 0, 0],
        18: [4, 3, 3, 3, 1, 0, 0, 0, 0],
        19: [4, 3, 3, 3, 2, 0, 0, 0, 0],
        20: [4, 3, 3, 3, 2, 0, 0, 0, 0],
    }
    
    full_casters = ['Bard', 'Cleric', 'Druid', 'Sorcerer', 'Wizard']
    half_casters = ['Paladin', 'Ranger']
    
    if character_class in full_casters:
        return full_caster_slots.get(level, [0] * 9)
    elif character_class in half_casters:
        return half_caster_slots.get(level, [0] * 9)
    elif character_class == 'Warlock':
        # Warlock uses pact magic - different system
        return calculate_warlock_slots(level)
    
    return [0] * 9


def calculate_warlock_slots(level):
    """Calculate Warlock pact magic slots"""
    if level < 2:
        return [1, 0, 0, 0, 0, 0, 0, 0, 0]
    elif level < 11:
        slot_level = min((level + 1) // 2, 5)
        num_slots = 2 if level < 17 else (3 if level < 19 else 4)
        slots = [0] * 9
        slots[slot_level - 1] = num_slots
        return slots
    else:
        slots = [0] * 9
        slots[4] = 3 if level < 17 else 4
        return slots
