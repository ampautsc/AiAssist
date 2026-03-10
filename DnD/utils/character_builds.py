"""
Structured data models for D&D character builds and comparisons.

This replaces the ad-hoc parameter passing with proper class hierarchies.
"""

from dataclasses import dataclass, field
from typing import List, Optional
from utils.dpr_calculator import Attack, AttackSequence


@dataclass
class FeatSet:
    """Represents a collection of feats a character has."""
    crossbow_expert: bool = False
    elven_accuracy: bool = False
    sharpshooter: bool = False
    fighting_initiate_archery: bool = False
    
    def __str__(self):
        feats = []
        if self.crossbow_expert:
            feats.append("CE")
        if self.elven_accuracy:
            feats.append("EA")
        if self.sharpshooter:
            feats.append("SS")
        if self.fighting_initiate_archery:
            feats.append("Archery")
        return " + ".join(feats) if feats else "No Feats"


@dataclass
class Weapon:
    """Represents a weapon with its properties."""
    name: str
    damage_dice: int
    damage_count: int = 1
    magic_bonus: int = 0
    
    def __str__(self):
        magic = f"+{self.magic_bonus} " if self.magic_bonus > 0 else ""
        return f"{magic}{self.name}"


@dataclass
class MagicItems:
    """Magic items that affect combat."""
    bracers_of_archery: bool = False  # +2 damage to longbow/shortbow
    
    def get_damage_bonus(self, weapon: Weapon) -> int:
        """Get total damage bonus from magic items."""
        bonus = 0
        if self.bracers_of_archery and weapon.name in ["Longbow", "Shortbow"]:
            bonus += 2
        return bonus


@dataclass
class ClassFeatures:
    """Class and subclass features."""
    class_name: str
    subclass: Optional[str] = None
    extra_attack: bool = False
    fighting_style_archery: bool = False  # Built-in class feature
    pet_help_action: bool = False  # Beast Master
    
    def __str__(self):
        if self.subclass:
            return f"{self.subclass} {self.class_name}"
        return self.class_name


@dataclass
class AdvantageSource:
    """Source of advantage on attacks."""
    source: str
    affects_all_attacks: bool
    attacks_with_advantage: int = 1  # If not all attacks
    
    @staticmethod
    def pet_help():
        return AdvantageSource("Pet Help Action", False, 1)
    
    @staticmethod
    def none():
        return AdvantageSource("None", False, 0)


@dataclass
class CharacterBuild:
    """Complete character build with all relevant stats."""
    name: str
    level: int
    class_features: ClassFeatures
    dex: int
    proficiency_bonus: int
    weapon: Weapon
    feats: FeatSet
    magic_items: MagicItems = field(default_factory=MagicItems)
    advantage_source: AdvantageSource = field(default_factory=AdvantageSource.none)
    
    def get_attack_count(self) -> int:
        """Calculate total attacks per round."""
        attacks = 1  # Base attack action
        
        if self.class_features.extra_attack:
            attacks = 2  # Extra Attack
        
        if self.feats.crossbow_expert and self.weapon.name == "Hand Crossbow":
            attacks += 1  # Bonus action attack
        
        return attacks
    
    def create_attack_sequence(self, target_ac: int = 16) -> AttackSequence:
        """Create the attack sequence for this build."""
        attacks = []
        attack_count = self.get_attack_count()
        advantage_count = 0
        
        if self.advantage_source.affects_all_attacks:
            advantage_count = attack_count
        else:
            advantage_count = self.advantage_source.attacks_with_advantage
        
        # Get bonuses
        ability_mod = (self.dex - 10) // 2
        magic_item_damage = self.magic_items.get_damage_bonus(self.weapon)
        
        # Fighting style to-hit bonus
        fighting_to_hit = 0
        if self.class_features.fighting_style_archery:
            fighting_to_hit = 2
        if self.feats.fighting_initiate_archery:
            fighting_to_hit = 2
        
        # Create each attack
        for i in range(attack_count):
            has_advantage = i < advantage_count
            
            attack = Attack(
                ability_mod=ability_mod,
                proficiency=self.proficiency_bonus,
                weapon_damage_dice=self.weapon.damage_dice,
                weapon_damage_count=self.weapon.damage_count,
                magic_bonus=self.weapon.magic_bonus,
                fighting_style_to_hit=fighting_to_hit,
                fighting_style_damage=0,
                magic_item_damage=magic_item_damage,
                sharpshooter=self.feats.sharpshooter,
                advantage=has_advantage,
                elven_accuracy=self.feats.elven_accuracy if has_advantage else False
            )
            attacks.append(attack)
        
        return AttackSequence(attacks)
    
    def calculate_dpr(self, target_ac: int = 16) -> dict:
        """Calculate DPR for this build."""
        sequence = self.create_attack_sequence(target_ac)
        return sequence.calculate_round_dpr(target_ac)
    
    def __str__(self):
        return f"{self.name} ({self.class_features}, {self.feats}, {self.weapon})"


# Pre-built character templates
def create_lore_bard_build(feats: FeatSet, advantage: AdvantageSource) -> CharacterBuild:
    """Level 8 Lore Bard (no Extra Attack)."""
    return CharacterBuild(
        name="Lore Bard",
        level=8,
        class_features=ClassFeatures("Bard", "Lore", extra_attack=False),
        dex=18,
        proficiency_bonus=3,
        weapon=Weapon("Hand Crossbow", 6),
        feats=feats,
        advantage_source=advantage
    )


def create_swords_bard_build(feats: FeatSet, advantage: AdvantageSource) -> CharacterBuild:
    """Level 8 Swords Bard (Extra Attack at 6)."""
    return CharacterBuild(
        name="Swords Bard",
        level=8,
        class_features=ClassFeatures("Bard", "Swords", extra_attack=True),
        dex=18,
        proficiency_bonus=3,
        weapon=Weapon("Hand Crossbow", 6),
        feats=feats,
        advantage_source=advantage
    )


def create_bows_bard_build(feats: FeatSet, advantage: AdvantageSource) -> CharacterBuild:
    """Level 8 Bows Bard (hypothetical - Swords Bard with Archery instead of Dueling)."""
    return CharacterBuild(
        name="Bows Bard",
        level=8,
        class_features=ClassFeatures("Bard", "Bows", extra_attack=True, fighting_style_archery=True),
        dex=18,
        proficiency_bonus=3,
        weapon=Weapon("Hand Crossbow", 6),
        feats=feats,
        advantage_source=advantage
    )


def create_beast_master_ranger_build(feats: FeatSet, weapon: Weapon, magic_items: MagicItems) -> CharacterBuild:
    """Level 8 Beast Master Ranger with pet Help action."""
    return CharacterBuild(
        name="Beast Master Ranger",
        level=8,
        class_features=ClassFeatures("Ranger", "Beast Master", extra_attack=True, 
                                     fighting_style_archery=True, pet_help_action=True),
        dex=18,
        proficiency_bonus=3,
        weapon=weapon,
        feats=feats,
        magic_items=magic_items,
        advantage_source=AdvantageSource.pet_help()
    )


def create_ranger_build(feats: FeatSet, weapon: Weapon, advantage: AdvantageSource) -> CharacterBuild:
    """Level 8 Ranger (generic)."""
    return CharacterBuild(
        name="Ranger",
        level=8,
        class_features=ClassFeatures("Ranger", extra_attack=True, fighting_style_archery=True),
        dex=18,
        proficiency_bonus=3,
        weapon=weapon,
        feats=feats,
        advantage_source=advantage
    )
