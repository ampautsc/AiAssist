"""
D&D 5e DPR Calculation Library
Accurate damage per round calculations including all modifiers and edge cases
"""
import math
from typing import Dict, List, Optional, Tuple


class Attack:
    """Represents a single attack with all modifiers"""
    
    def __init__(
        self,
        ability_mod: int,
        proficiency: int,
        weapon_damage_dice: int,
        weapon_damage_count: int = 1,
        magic_bonus: int = 0,
        fighting_style_to_hit: int = 0,
        fighting_style_damage: int = 0,
        magic_item_damage: int = 0,
        sharpshooter: bool = False,
        advantage: bool = False,
        elven_accuracy: bool = False
    ):
        """
        Initialize attack parameters
        
        Args:
            ability_mod: Ability modifier (DEX or STR)
            proficiency: Proficiency bonus
            weapon_damage_dice: Die size (6 for d6, 8 for d8, etc.)
            weapon_damage_count: Number of dice (usually 1)
            magic_bonus: Magic weapon bonus (applies to hit and damage)
            fighting_style_to_hit: Fighting style bonus to hit (Archery = +2)
            fighting_style_damage: Fighting style bonus to damage
            magic_item_damage: Other magic item damage bonus (Bracers of Archery = +2)
            sharpshooter: Using Sharpshooter feat (-5 to hit, +10 damage)
            advantage: Has advantage on attack
            elven_accuracy: Has Elven Accuracy feat (reroll one die when advantage)
        """
        self.ability_mod = ability_mod
        self.proficiency = proficiency
        self.weapon_damage_dice = weapon_damage_dice
        self.weapon_damage_count = weapon_damage_count
        self.magic_bonus = magic_bonus
        self.fighting_style_to_hit = fighting_style_to_hit
        self.fighting_style_damage = fighting_style_damage
        self.magic_item_damage = magic_item_damage
        self.sharpshooter = sharpshooter
        self.advantage = advantage
        self.elven_accuracy = elven_accuracy
    
    def get_to_hit(self) -> int:
        """Calculate total to-hit bonus"""
        base = self.ability_mod + self.proficiency + self.magic_bonus + self.fighting_style_to_hit
        penalty = -5 if self.sharpshooter else 0
        return base + penalty
    
    def get_average_weapon_damage(self) -> float:
        """Calculate average weapon damage (dice only, no modifiers)"""
        return self.weapon_damage_count * ((self.weapon_damage_dice + 1) / 2)
    
    def get_damage_per_hit(self) -> float:
        """Calculate average damage per hit (excluding crits)"""
        weapon_avg = self.get_average_weapon_damage()
        modifiers = (
            self.ability_mod + 
            self.magic_bonus + 
            self.fighting_style_damage + 
            self.magic_item_damage
        )
        if self.sharpshooter:
            modifiers += 10
        
        return weapon_avg + modifiers
    
    def get_crit_damage(self) -> float:
        """Calculate additional damage from critical hit (doubles dice only)"""
        return self.get_average_weapon_damage()
    
    def get_hit_probability(self, target_ac: int) -> float:
        """
        Calculate probability of hitting target AC
        
        Accounts for:
        - Natural 1 always misses
        - Natural 20 always hits
        - Advantage (roll twice, take higher)
        - Elven Accuracy (roll three times, take highest)
        """
        to_hit = self.get_to_hit()
        needed_roll = target_ac - to_hit
        
        # Natural 20 always hits
        if needed_roll <= 1:
            return 0.95  # Everything except nat 1
        
        # Natural 1 always misses
        if needed_roll >= 20:
            return 0.05  # Only nat 20
        
        # Calculate base probability
        base_prob = (21 - needed_roll) / 20
        
        # Apply advantage mechanics
        if self.advantage:
            miss_chance = 1 - base_prob
            if self.elven_accuracy:
                # Roll 3 dice, take highest: 1 - (miss)^3
                return 1 - (miss_chance ** 3)
            else:
                # Roll 2 dice, take highest: 1 - (miss)^2
                return 1 - (miss_chance ** 2)
        
        return base_prob
    
    def get_crit_probability(self) -> float:
        """
        Calculate probability of critical hit
        
        Accounts for:
        - Normal: 5% (nat 20)
        - Advantage: 9.75%
        - Elven Accuracy: 14.26%
        """
        if self.advantage:
            miss_crit_chance = 19 / 20
            if self.elven_accuracy:
                # 1 - probability of rolling no 20s on 3 dice
                return 1 - (miss_crit_chance ** 3)
            else:
                # 1 - probability of rolling no 20s on 2 dice
                return 1 - (miss_crit_chance ** 2)
        
        return 0.05  # 1 in 20
    
    def calculate_dpr(self, target_ac: int) -> Dict[str, float]:
        """
        Calculate damage per round for this attack
        
        Returns:
            Dictionary with:
            - to_hit: Attack bonus
            - hit_chance: Probability to hit (0-1)
            - crit_chance: Probability to crit (0-1)
            - damage_per_hit: Average damage on hit
            - crit_damage: Additional damage on crit
            - expected_damage: Expected damage for this attack
            - dpr: Same as expected_damage (for single attack)
        """
        to_hit = self.get_to_hit()
        hit_prob = self.get_hit_probability(target_ac)
        crit_prob = self.get_crit_probability()
        damage = self.get_damage_per_hit()
        crit_extra = self.get_crit_damage()
        
        # Expected damage = (hit prob × damage) + (crit prob × extra crit damage)
        expected = (hit_prob * damage) + (crit_prob * crit_extra)
        
        return {
            'to_hit': to_hit,
            'hit_chance': hit_prob,
            'crit_chance': crit_prob,
            'damage_per_hit': damage,
            'crit_damage': crit_extra,
            'expected_damage': expected,
            'dpr': expected
        }


class AttackSequence:
    """Represents a sequence of attacks in one round"""
    
    def __init__(self, attacks: List[Attack]):
        """
        Initialize attack sequence
        
        Args:
            attacks: List of Attack objects for this round
        """
        self.attacks = attacks
    
    def calculate_round_dpr(self, target_ac: int) -> Dict[str, any]:
        """
        Calculate total DPR for all attacks in this round
        
        Returns:
            Dictionary with:
            - attacks: List of individual attack results
            - total_dpr: Sum of all attack DPRs
            - average_to_hit: Average attack bonus
            - average_hit_chance: Average hit probability
        """
        results = []
        total_dpr = 0
        
        for attack in self.attacks:
            result = attack.calculate_dpr(target_ac)
            results.append(result)
            total_dpr += result['dpr']
        
        avg_to_hit = sum(r['to_hit'] for r in results) / len(results)
        avg_hit_chance = sum(r['hit_chance'] for r in results) / len(results)
        
        return {
            'attacks': results,
            'total_dpr': total_dpr,
            'average_to_hit': avg_to_hit,
            'average_hit_chance': avg_hit_chance,
            'num_attacks': len(results)
        }


class MultiRoundCombat:
    """Represents combat over multiple rounds"""
    
    def __init__(self, rounds: List[AttackSequence]):
        """
        Initialize multi-round combat
        
        Args:
            rounds: List of AttackSequence objects, one per round
        """
        self.rounds = rounds
    
    def calculate_total_damage(self, target_ac: int) -> Dict[str, any]:
        """
        Calculate expected damage over all rounds
        
        Returns:
            Dictionary with:
            - rounds: List of per-round results
            - total_damage: Sum across all rounds
            - average_dpr: Average damage per round
            - num_rounds: Number of rounds
        """
        round_results = []
        total_damage = 0
        
        for round_seq in self.rounds:
            result = round_seq.calculate_round_dpr(target_ac)
            round_results.append(result)
            total_damage += result['total_dpr']
        
        num_rounds = len(self.rounds)
        avg_dpr = total_damage / num_rounds if num_rounds > 0 else 0
        
        return {
            'rounds': round_results,
            'total_damage': total_damage,
            'average_dpr': avg_dpr,
            'num_rounds': num_rounds
        }


def calculate_proficiency_bonus(level: int) -> int:
    """Calculate proficiency bonus from character level"""
    return 2 + ((level - 1) // 4)


def calculate_ability_modifier(ability_score: int) -> int:
    """Calculate ability modifier from ability score"""
    return (ability_score - 10) // 2
