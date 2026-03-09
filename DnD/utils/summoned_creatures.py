"""
Summoned Creatures for D&D 5e DPR Calculations

Models creatures summoned by spells like Conjure Animals.
"""

from dataclasses import dataclass
from typing import List


@dataclass
class SummonedCreature:
    """A creature summoned by a spell."""
    name: str
    attack_bonus: int
    damage_dice: int      # die size (e.g., 4 for d4)
    damage_count: int     # number of dice
    damage_mod: int       # flat damage modifier
    pack_tactics: bool = False  # advantage if ally within 5ft
    attacks_per_creature: int = 1  # Multiattack creatures get 2+
    
    def calculate_dpr(self, target_ac: int, count: int = 1, has_advantage: bool = False) -> dict:
        """
        Calculate DPR for multiple copies of this creature.
        
        Args:
            target_ac: Target's armor class
            count: Number of this creature attacking
            has_advantage: External advantage source (Pack Tactics provides its own)
        """
        # Pack Tactics grants advantage if active
        advantage = has_advantage or self.pack_tactics
        
        # Calculate hit probability manually (don't use Attack class)
        to_hit = self.attack_bonus
        needed_roll = target_ac - to_hit
        
        # Calculate base hit chance
        if needed_roll <= 1:
            base_hit = 0.95  # Everything except nat 1
        elif needed_roll >= 20:
            base_hit = 0.05  # Only nat 20
        else:
            base_hit = (21 - needed_roll) / 20
        
        # Apply advantage
        if advantage:
            miss_chance = 1 - base_hit
            hit_prob = 1 - (miss_chance ** 2)
            crit_prob = 1 - (0.95 ** 2)  # 9.75%
        else:
            hit_prob = base_hit
            crit_prob = 0.05
        
        # Calculate damage per attack
        avg_dice = self.damage_count * ((self.damage_dice + 1) / 2)
        damage = avg_dice + self.damage_mod
        crit_bonus = avg_dice  # Crits double dice only
        
        dpr_per_attack = (hit_prob * damage) + (crit_prob * crit_bonus)
        dpr_per_creature = dpr_per_attack * self.attacks_per_creature
        total_attacks = count * self.attacks_per_creature
        total_dpr = dpr_per_creature * count
        
        return {
            'creature': self.name,
            'count': count,
            'attacks_per_creature': self.attacks_per_creature,
            'total_attacks': total_attacks,
            'hit_chance': hit_prob,
            'crit_chance': crit_prob,
            'damage_per_hit': damage,
            'dpr_per_attack': dpr_per_attack,
            'dpr_per_creature': dpr_per_creature,
            'total_dpr': total_dpr
        }
    
    def calculate_opportunity_attack_dpr(self, target_ac: int, count: int = 1, 
                                          trigger_chance: float = 1.0, 
                                          has_advantage: bool = False) -> dict:
        """
        Calculate DPR from opportunity attacks.
        
        NOTE: Opportunity attacks are SINGLE attacks (no Multiattack).
        Each creature gets ONE reaction, ONE attack.
        """
        # OAs ignore Multiattack - save attacks_per_creature, set to 1
        original_attacks = self.attacks_per_creature
        self.attacks_per_creature = 1
        
        base_result = self.calculate_dpr(target_ac, count, has_advantage)
        
        # Restore
        self.attacks_per_creature = original_attacks
        
        return {
            'creature': self.name,
            'count': count,
            'trigger_chance': trigger_chance,
            'base_dpr': base_result['total_dpr'],
            'expected_dpr': base_result['total_dpr'] * trigger_chance
        }


# Pre-built creatures
def create_wolf() -> SummonedCreature:
    """
    Wolf (CR 1/4)
    Bite: +4 to hit, 2d4+2 piercing
    Pack Tactics: Advantage if ally within 5 ft of target
    """
    return SummonedCreature(
        name="Wolf",
        attack_bonus=4,
        damage_dice=4,
        damage_count=2,
        damage_mod=2,
        pack_tactics=True
    )


def create_velociraptor() -> SummonedCreature:
    """
    Velociraptor (CR 1/4) - Volo's Guide
    Multiattack: 2 attacks (bite + claws)
    Bite: +4 to hit, 1d6+3 piercing (avg 6.5)
    Claws: +4 to hit, 1d6+3 slashing (avg 6.5)
    Pack Tactics: Advantage if ally within 5 ft of target
    
    NOTE: attacks_per_creature=2 for Multiattack
    """
    return SummonedCreature(
        name="Velociraptor",
        attack_bonus=4,
        damage_dice=6,
        damage_count=1,
        damage_mod=3,
        pack_tactics=True,
        attacks_per_creature=2  # Multiattack!
    )


@dataclass
class SummonGroup:
    """A group of summoned creatures acting together."""
    creature: SummonedCreature
    count: int
    
    def calculate_dpr(self, target_ac: int) -> dict:
        """Calculate total DPR for this group."""
        return self.creature.calculate_dpr(target_ac, self.count)
    
    def calculate_opportunity_attack_dpr(self, target_ac: int, trigger_chance: float = 1.0) -> dict:
        """
        Calculate DPR from opportunity attacks.
        
        NOTE: OAs are single attacks - no Multiattack.
        """
        return self.creature.calculate_opportunity_attack_dpr(
            target_ac, self.count, trigger_chance
        )


def create_wolf_pack(count: int = 8) -> SummonGroup:
    """Create a pack of wolves (Conjure Animals, 3rd level)."""
    return SummonGroup(create_wolf(), count)


def create_velociraptor_pack(count: int = 8) -> SummonGroup:
    """Create a pack of velociraptors (Conjure Animals, 3rd level)."""
    return SummonGroup(create_velociraptor(), count)
