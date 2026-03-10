"""
Perception and fog-of-war models.

A PerceptionSnapshot represents what a single creature knows about the
battlefield at a given moment — visible hexes, visible creatures, remembered
positions, and audible events. This is the "partial map" sent to the AI engine.
"""

from __future__ import annotations

from enum import Enum
from typing import Optional

from pydantic import BaseModel, Field

from models.creature import Condition, HexCoord


# ---------------------------------------------------------------------------
# Terrain / hex info as perceived
# ---------------------------------------------------------------------------

class TerrainType(str, Enum):
    OPEN = "open"
    DIFFICULT = "difficult"
    WALL = "wall"
    WATER = "water"
    PIT = "pit"
    ELEVATED = "elevated"
    COVER_HALF = "cover_half"
    COVER_THREE_QUARTER = "cover_three_quarter"
    COVER_FULL = "cover_full"


class LightLevel(str, Enum):
    BRIGHT = "bright"
    DIM = "dim"
    DARK = "dark"
    MAGICAL_DARKNESS = "magical_darkness"


class PerceivedHex(BaseModel):
    """A single hex tile as perceived by a creature."""
    coord: HexCoord
    terrain: TerrainType = TerrainType.OPEN
    light: LightLevel = LightLevel.BRIGHT
    elevation: int = 0
    occupant_id: Optional[str] = None      # creature_id if someone is standing here


# ---------------------------------------------------------------------------
# Perceived creature (limited info based on what you can observe)
# ---------------------------------------------------------------------------

class PerceivedCreature(BaseModel):
    """What one creature knows about another creature on the battlefield."""
    creature_id: str
    name: str
    team: str                                # "player", "enemy", "neutral"
    position: HexCoord
    hp_status: str = "healthy"               # "healthy", "wounded", "bloody", "near-death", "down"
    visible_conditions: list[Condition] = Field(default_factory=list)
    is_concentrating: bool = False           # observable if you can see them
    distance: int = 0                        # hex distance from the perceiver
    last_seen_round: int = 0                 # round number when last observed
    source: str = "vision"                   # "vision", "sound", "memory", "ally_report"


# ---------------------------------------------------------------------------
# Audible event
# ---------------------------------------------------------------------------

class AudibleEvent(BaseModel):
    """Something the creature heard but may not have seen."""
    description: str
    approximate_direction: Optional[str] = None   # "north", "southeast", etc.
    approximate_distance: int = 0                  # in hexes
    round_number: int = 0


# ---------------------------------------------------------------------------
# Perception snapshot — the "partial map" sent to the AI
# ---------------------------------------------------------------------------

class PerceptionSnapshot(BaseModel):
    """
    Everything a creature perceives at decision time.
    This is the fog-of-war-filtered view of the battlefield.
    """
    # Who is perceiving
    perceiver_id: str
    current_round: int = 1

    # What hexes can be seen
    visible_hexes: list[PerceivedHex] = Field(default_factory=list)

    # Creatures detected (by any sense)
    perceived_creatures: list[PerceivedCreature] = Field(default_factory=list)

    # Events heard but not seen
    audible_events: list[AudibleEvent] = Field(default_factory=list)

    # Recent combat events this creature witnessed (natural language descriptions)
    recent_events: list[str] = Field(default_factory=list)

    def visible_enemies(self, my_team: str) -> list[PerceivedCreature]:
        """Return perceived creatures on a different team."""
        return [c for c in self.perceived_creatures
                if c.team != my_team and c.source == "vision"]

    def visible_allies(self, my_team: str) -> list[PerceivedCreature]:
        """Return perceived creatures on the same team (excluding self)."""
        return [c for c in self.perceived_creatures
                if c.team == my_team and c.creature_id != self.perceiver_id]

    def nearest_enemy(self, my_team: str) -> Optional[PerceivedCreature]:
        """Return the closest visible enemy, or None."""
        enemies = self.visible_enemies(my_team)
        return min(enemies, key=lambda e: e.distance, default=None)

    def weakest_enemy(self, my_team: str) -> Optional[PerceivedCreature]:
        """Return the most injured visible enemy."""
        hp_order = {"down": 0, "near-death": 1, "bloody": 2, "wounded": 3, "healthy": 4}
        enemies = self.visible_enemies(my_team)
        return min(enemies, key=lambda e: hp_order.get(e.hp_status, 5), default=None)
