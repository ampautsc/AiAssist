"""
Creature data models.

Static stat blocks and dynamic combat state for all creatures (monsters and PCs).
"""

from __future__ import annotations

from enum import Enum
from typing import Optional

from pydantic import BaseModel, Field


# ---------------------------------------------------------------------------
# Hex coordinate (axial)
# ---------------------------------------------------------------------------

class HexCoord(BaseModel):
    """Axial hex coordinate (q, r). s is derived: s = -q - r."""
    q: int = 0
    r: int = 0

    @property
    def s(self) -> int:
        return -self.q - self.r

    def distance_to(self, other: HexCoord) -> int:
        """Hex distance (number of steps)."""
        return max(abs(self.q - other.q), abs(self.r - other.r), abs(self.s - other.s))

    def __hash__(self) -> int:
        return hash((self.q, self.r))

    def __eq__(self, other: object) -> bool:
        if not isinstance(other, HexCoord):
            return NotImplemented
        return self.q == other.q and self.r == other.r


# ---------------------------------------------------------------------------
# Enums
# ---------------------------------------------------------------------------

class CreatureSize(str, Enum):
    TINY = "tiny"
    SMALL = "small"
    MEDIUM = "medium"
    LARGE = "large"
    HUGE = "huge"
    GARGANTUAN = "gargantuan"


class CreatureType(str, Enum):
    ABERRATION = "aberration"
    BEAST = "beast"
    CELESTIAL = "celestial"
    CONSTRUCT = "construct"
    DRAGON = "dragon"
    ELEMENTAL = "elemental"
    FEY = "fey"
    FIEND = "fiend"
    GIANT = "giant"
    HUMANOID = "humanoid"
    MONSTROSITY = "monstrosity"
    OOZE = "ooze"
    PLANT = "plant"
    UNDEAD = "undead"


class DamageType(str, Enum):
    BLUDGEONING = "bludgeoning"
    PIERCING = "piercing"
    SLASHING = "slashing"
    ACID = "acid"
    COLD = "cold"
    FIRE = "fire"
    FORCE = "force"
    LIGHTNING = "lightning"
    NECROTIC = "necrotic"
    POISON = "poison"
    PSYCHIC = "psychic"
    RADIANT = "radiant"
    THUNDER = "thunder"


class Condition(str, Enum):
    BLINDED = "blinded"
    CHARMED = "charmed"
    DEAFENED = "deafened"
    FRIGHTENED = "frightened"
    GRAPPLED = "grappled"
    INCAPACITATED = "incapacitated"
    INVISIBLE = "invisible"
    PARALYZED = "paralyzed"
    PETRIFIED = "petrified"
    POISONED = "poisoned"
    PRONE = "prone"
    RESTRAINED = "restrained"
    STUNNED = "stunned"
    UNCONSCIOUS = "unconscious"


# ---------------------------------------------------------------------------
# Ability scores
# ---------------------------------------------------------------------------

class AbilityScores(BaseModel):
    strength: int = 10
    dexterity: int = 10
    constitution: int = 10
    intelligence: int = 10
    wisdom: int = 10
    charisma: int = 10

    def modifier(self, ability: str) -> int:
        score = getattr(self, ability.lower())
        return (score - 10) // 2


# ---------------------------------------------------------------------------
# Senses
# ---------------------------------------------------------------------------

class Senses(BaseModel):
    """Creature sensory capabilities."""
    darkvision: int = 0          # range in hexes (0 = none)
    blindsight: int = 0
    tremorsense: int = 0
    truesight: int = 0
    passive_perception: int = 10


# ---------------------------------------------------------------------------
# Attack definition (part of stat block)
# ---------------------------------------------------------------------------

class AttackDefinition(BaseModel):
    """A single attack option from a creature's stat block."""
    name: str
    attack_bonus: int = 0
    damage_dice: str = "1d6"             # e.g. "2d6+4"
    damage_type: DamageType = DamageType.BLUDGEONING
    reach: int = 1                        # in hexes (1 = melee, >1 = reach/ranged)
    range_short: Optional[int] = None     # for ranged attacks
    range_long: Optional[int] = None
    properties: list[str] = Field(default_factory=list)  # "finesse", "two-handed", etc.


# ---------------------------------------------------------------------------
# Spell slot representation
# ---------------------------------------------------------------------------

class SpellSlots(BaseModel):
    """Spell slot tracking. Index 0 = cantrips (unlimited), 1-9 = levels."""
    slots: dict[int, int] = Field(default_factory=dict)

    def available(self, level: int) -> int:
        return self.slots.get(level, 0)

    def expend(self, level: int) -> SpellSlots:
        """Return new SpellSlots with one slot expended. Raises if none available."""
        current = self.available(level)
        if current <= 0:
            raise ValueError(f"No level {level} spell slots remaining")
        new_slots = dict(self.slots)
        new_slots[level] = current - 1
        return SpellSlots(slots=new_slots)

    def has_any_slots(self) -> bool:
        return any(v > 0 for k, v in self.slots.items() if k > 0)


# ---------------------------------------------------------------------------
# Creature stat block (static, loaded from YAML)
# ---------------------------------------------------------------------------

class CreatureStatBlock(BaseModel):
    """
    Static creature definition — loaded once from data files.
    Represents the creature's base capabilities, not combat state.
    """
    name: str
    creature_type: CreatureType = CreatureType.HUMANOID
    size: CreatureSize = CreatureSize.MEDIUM
    armor_class: int = 10
    hit_points_max: int = 10
    speed: int = 6                        # hexes per turn (30ft = 6 hexes at 5ft/hex)
    abilities: AbilityScores = Field(default_factory=AbilityScores)
    attacks: list[AttackDefinition] = Field(default_factory=list)
    spells_known: list[str] = Field(default_factory=list)  # spell names
    spell_slots_max: SpellSlots = Field(default_factory=SpellSlots)
    senses: Senses = Field(default_factory=Senses)
    damage_resistances: list[DamageType] = Field(default_factory=list)
    damage_immunities: list[DamageType] = Field(default_factory=list)
    condition_immunities: list[Condition] = Field(default_factory=list)
    special_abilities: list[str] = Field(default_factory=list)
    challenge_rating: float = 0.0
    proficiency_bonus: int = 2

    @property
    def intelligence_score(self) -> int:
        return self.abilities.intelligence


# ---------------------------------------------------------------------------
# Creature combat state (mutable, changes each round)
# ---------------------------------------------------------------------------

class CreatureState(BaseModel):
    """
    Dynamic combat state for a creature in an active encounter.
    Updated each round as the creature takes/receives actions.
    """
    creature_id: str                      # unique ID in this encounter
    stat_block: CreatureStatBlock
    team: str = "enemy"                   # "player", "enemy", "neutral"
    position: HexCoord = Field(default_factory=HexCoord)
    current_hp: int = 0                   # set to stat_block.hit_points_max at start
    temporary_hp: int = 0
    spell_slots: SpellSlots = Field(default_factory=SpellSlots)
    conditions: list[Condition] = Field(default_factory=list)
    concentrating_on: Optional[str] = None  # spell name or None
    death_saves_success: int = 0
    death_saves_failure: int = 0
    has_reaction: bool = True
    has_bonus_action: bool = True
    movement_remaining: int = 0           # hexes left this turn

    @property
    def is_alive(self) -> bool:
        return self.current_hp > 0

    @property
    def is_conscious(self) -> bool:
        return self.is_alive and Condition.UNCONSCIOUS not in self.conditions

    @property
    def hp_fraction(self) -> float:
        max_hp = self.stat_block.hit_points_max
        return self.current_hp / max_hp if max_hp > 0 else 0.0

    @property
    def hp_status(self) -> str:
        """Human-readable HP status (for LLM prompts and perception)."""
        frac = self.hp_fraction
        if frac >= 0.75:
            return "healthy"
        elif frac >= 0.50:
            return "wounded"
        elif frac >= 0.25:
            return "bloody"
        elif frac > 0.0:
            return "near-death"
        else:
            return "down"

    def initialize_for_combat(self) -> None:
        """Set dynamic fields from the stat block at combat start."""
        self.current_hp = self.stat_block.hit_points_max
        self.spell_slots = self.stat_block.spell_slots_max.model_copy()
        self.movement_remaining = self.stat_block.speed
