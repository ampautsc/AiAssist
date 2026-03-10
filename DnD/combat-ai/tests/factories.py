"""
Shared factory functions for the combat AI test suite.

Provides pre-built creatures, maps, and perception snapshots so tests
can focus on behavior verification rather than setup boilerplate.
"""

from __future__ import annotations

import sys
from pathlib import Path

# Ensure the combat-ai package is importable
sys.path.insert(0, str(Path(__file__).parent.parent))

from models.creature import (
    AbilityScores,
    AttackDefinition,
    CreatureSize,
    CreatureStatBlock,
    CreatureState,
    CreatureType,
    DamageType,
    HexCoord,
    Senses,
    SpellSlots,
)
from models.action import TurnPlan
from models.perception import (
    LightLevel,
    PerceivedCreature,
    PerceivedHex,
    PerceptionSnapshot,
    TerrainType,
)
from models.orders import (
    OrderDirective,
    OrderPriority,
    StandingOrder,
    TriggerCondition,
    TriggerType,
)
from hex_adapter import SimpleHexMap


# ---------------------------------------------------------------------------
# Creature factories
# ---------------------------------------------------------------------------

def make_zombie(creature_id: str = "zombie_1", position: HexCoord | None = None) -> CreatureState:
    """Create a zombie CreatureState for testing."""
    stat_block = CreatureStatBlock(
        name="Zombie",
        creature_type=CreatureType.UNDEAD,
        size=CreatureSize.MEDIUM,
        armor_class=8,
        hit_points_max=22,
        speed=4,
        abilities=AbilityScores(strength=13, dexterity=6, constitution=16,
                                intelligence=3, wisdom=6, charisma=5),
        attacks=[
            AttackDefinition(name="Slam", attack_bonus=3, damage_dice="1d6+1",
                             damage_type=DamageType.BLUDGEONING, reach=1),
        ],
        senses=Senses(darkvision=12, passive_perception=8),
        challenge_rating=0.25,
    )
    state = CreatureState(
        creature_id=creature_id,
        stat_block=stat_block,
        team="enemy",
        position=position or HexCoord(q=0, r=0),
    )
    state.initialize_for_combat()
    return state


def make_wolf(creature_id: str = "wolf_1", position: HexCoord | None = None) -> CreatureState:
    """Create a wolf CreatureState for testing."""
    stat_block = CreatureStatBlock(
        name="Wolf",
        creature_type=CreatureType.BEAST,
        size=CreatureSize.MEDIUM,
        armor_class=13,
        hit_points_max=11,
        speed=8,
        abilities=AbilityScores(strength=12, dexterity=15, constitution=12,
                                intelligence=3, wisdom=12, charisma=6),
        attacks=[
            AttackDefinition(name="Bite", attack_bonus=4, damage_dice="2d4+2",
                             damage_type=DamageType.PIERCING, reach=1),
        ],
        senses=Senses(passive_perception=13),
        challenge_rating=0.25,
    )
    state = CreatureState(
        creature_id=creature_id,
        stat_block=stat_block,
        team="enemy",
        position=position or HexCoord(q=0, r=0),
    )
    state.initialize_for_combat()
    return state


def make_goblin(creature_id: str = "goblin_1", position: HexCoord | None = None) -> CreatureState:
    """Create a goblin CreatureState for testing."""
    stat_block = CreatureStatBlock(
        name="Goblin",
        creature_type=CreatureType.HUMANOID,
        size=CreatureSize.SMALL,
        armor_class=15,
        hit_points_max=7,
        speed=6,
        abilities=AbilityScores(strength=8, dexterity=14, constitution=10,
                                intelligence=10, wisdom=8, charisma=8),
        attacks=[
            AttackDefinition(name="Scimitar", attack_bonus=4, damage_dice="1d6+2",
                             damage_type=DamageType.SLASHING, reach=1),
            AttackDefinition(name="Shortbow", attack_bonus=4, damage_dice="1d6+2",
                             damage_type=DamageType.PIERCING, reach=1,
                             range_short=16, range_long=64),
        ],
        senses=Senses(darkvision=12, passive_perception=9),
        challenge_rating=0.25,
    )
    state = CreatureState(
        creature_id=creature_id,
        stat_block=stat_block,
        team="enemy",
        position=position or HexCoord(q=0, r=0),
    )
    state.initialize_for_combat()
    return state


def make_warrior(creature_id: str = "warrior_1", position: HexCoord | None = None) -> CreatureState:
    """Create a simple player warrior for testing."""
    stat_block = CreatureStatBlock(
        name="Warrior",
        creature_type=CreatureType.HUMANOID,
        size=CreatureSize.MEDIUM,
        armor_class=16,
        hit_points_max=45,
        speed=6,
        abilities=AbilityScores(strength=16, dexterity=12, constitution=14,
                                intelligence=10, wisdom=12, charisma=8),
        attacks=[
            AttackDefinition(name="Longsword", attack_bonus=5, damage_dice="1d8+3",
                             damage_type=DamageType.SLASHING, reach=1),
        ],
        senses=Senses(passive_perception=11),
        challenge_rating=3.0,
    )
    state = CreatureState(
        creature_id=creature_id,
        stat_block=stat_block,
        team="player",
        position=position or HexCoord(q=3, r=0),
    )
    state.initialize_for_combat()
    return state


def make_lich(creature_id: str = "lich_1", position: HexCoord | None = None) -> CreatureState:
    """Create a lich for testing LLM-tier decisions."""
    stat_block = CreatureStatBlock(
        name="Lich",
        creature_type=CreatureType.UNDEAD,
        size=CreatureSize.MEDIUM,
        armor_class=17,
        hit_points_max=135,
        speed=6,
        abilities=AbilityScores(strength=11, dexterity=16, constitution=16,
                                intelligence=20, wisdom=14, charisma=16),
        attacks=[
            AttackDefinition(name="Paralyzing Touch", attack_bonus=12,
                             damage_dice="3d6", damage_type=DamageType.COLD, reach=1),
        ],
        spells_known=["fireball", "counterspell", "power_word_kill", "shield",
                      "magic_missile", "disintegrate", "globe_of_invulnerability"],
        spell_slots_max=SpellSlots(slots={0: 99, 1: 4, 2: 3, 3: 3, 4: 3, 5: 3, 6: 1, 7: 1, 8: 1, 9: 1}),
        senses=Senses(truesight=24, passive_perception=19),
        challenge_rating=21.0,
        proficiency_bonus=7,
    )
    state = CreatureState(
        creature_id=creature_id,
        stat_block=stat_block,
        team="enemy",
        position=position or HexCoord(q=0, r=0),
    )
    state.initialize_for_combat()
    return state


# ---------------------------------------------------------------------------
# Map factories
# ---------------------------------------------------------------------------

def make_small_arena(radius: int = 5) -> SimpleHexMap:
    """Create a small open hex arena for testing."""
    arena = SimpleHexMap()
    arena.create_arena(radius)
    return arena


def make_arena_with_wall() -> SimpleHexMap:
    """Create an arena with a wall across the middle for LOS tests."""
    arena = SimpleHexMap()
    arena.create_arena(6)
    # Wall across q=0 from r=-2 to r=2
    for r in range(-2, 3):
        arena.set_wall(0, r)
    return arena


# ---------------------------------------------------------------------------
# Perception factories
# ---------------------------------------------------------------------------

def make_perception(
    perceiver: CreatureState,
    visible_creatures: list[CreatureState],
    hex_map: SimpleHexMap | None = None,
    current_round: int = 1,
    recent_events: list[str] | None = None,
) -> PerceptionSnapshot:
    """Build a simple PerceptionSnapshot for testing."""
    perceived = []
    for other in visible_creatures:
        if other.creature_id == perceiver.creature_id:
            continue
        dist = perceiver.position.distance_to(other.position)
        perceived.append(PerceivedCreature(
            creature_id=other.creature_id,
            name=other.stat_block.name,
            team=other.team,
            position=other.position,
            hp_status=other.hp_status,
            visible_conditions=list(other.conditions),
            is_concentrating=other.concentrating_on is not None,
            distance=dist,
            last_seen_round=current_round,
            source="vision",
        ))

    visible_hexes = []
    if hex_map:
        visible_hexes = [tile for tile in hex_map.all_hexes().values()]

    return PerceptionSnapshot(
        perceiver_id=perceiver.creature_id,
        current_round=current_round,
        visible_hexes=visible_hexes,
        perceived_creatures=perceived,
        recent_events=recent_events or [],
    )
