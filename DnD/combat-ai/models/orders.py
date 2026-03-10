"""
Standing orders model.

Orders are directives given to a creature (or group) before or during combat
that override normal AI decision-making when their trigger conditions are met.
Encounter designers use orders to script specific behaviors — a boss retreating
at 50% HP, guards holding a choke point, minions protecting the caster, etc.
"""

from __future__ import annotations

from enum import Enum
from typing import Optional

from pydantic import BaseModel, Field

from models.creature import HexCoord


# ---------------------------------------------------------------------------
# Trigger conditions
# ---------------------------------------------------------------------------

class TriggerType(str, Enum):
    """What event or state activates this order."""
    HP_BELOW_PERCENT = "hp_below_percent"
    HP_ABOVE_PERCENT = "hp_above_percent"
    ALLY_DIES = "ally_dies"
    ALLY_HP_BELOW_PERCENT = "ally_hp_below_percent"
    ENEMY_IN_RANGE = "enemy_in_range"
    ENEMY_ENTERS_HEX = "enemy_enters_hex"
    ROUND_NUMBER = "round_number"
    NO_ALLIES_REMAINING = "no_allies_remaining"
    CONCENTRATING_ALLY_THREATENED = "concentrating_ally_threatened"
    ALWAYS = "always"                       # always active (e.g., "hold position")


class TriggerCondition(BaseModel):
    """A condition that, when met, activates a standing order."""
    trigger_type: TriggerType
    threshold: Optional[float] = None       # percent (0-100) or range (hexes) or round number
    target_hex: Optional[HexCoord] = None   # for hex-based triggers
    target_creature_id: Optional[str] = None  # for creature-based triggers


# ---------------------------------------------------------------------------
# Order directives
# ---------------------------------------------------------------------------

class OrderDirective(str, Enum):
    """What the creature should do when the order triggers."""
    RETREAT = "retreat"                     # move away from enemies
    HOLD_POSITION = "hold_position"        # don't move, attack from current hex
    PROTECT_HEX = "protect_hex"            # stay within N hexes of a location
    PROTECT_ALLY = "protect_ally"          # stay close to a specific ally
    FOCUS_TARGET = "focus_target"          # prioritize a specific enemy
    FOCUS_NEAREST = "focus_nearest"        # attack whatever is closest
    FOCUS_WEAKEST = "focus_weakest"        # attack the most injured enemy
    FOCUS_CASTERS = "focus_casters"        # prioritize spellcasters
    USE_ABILITY = "use_ability"            # use a specific ability/spell
    FLEE = "flee"                          # leave the battlefield entirely
    RALLY = "rally"                        # move toward allies, regroup
    AGGRESSIVE_ADVANCE = "aggressive_advance"  # push forward, close distance


# ---------------------------------------------------------------------------
# Standing order
# ---------------------------------------------------------------------------

class OrderPriority(str, Enum):
    """How strongly this order overrides normal AI."""
    SUGGESTION = "suggestion"              # AI considers it, may override
    STRONG = "strong"                      # AI follows unless obviously suicidal
    ABSOLUTE = "absolute"                  # AI must follow, no exceptions


class StandingOrder(BaseModel):
    """
    A directive that overrides normal AI decision-making when triggered.
    Multiple orders can be active; highest priority wins on conflict.
    """
    name: str = ""
    trigger: TriggerCondition
    directive: OrderDirective
    priority: OrderPriority = OrderPriority.STRONG
    target_creature_id: Optional[str] = None   # for FOCUS_TARGET, PROTECT_ALLY
    target_hex: Optional[HexCoord] = None      # for PROTECT_HEX
    protect_range: int = 2                      # hexes for PROTECT_HEX/PROTECT_ALLY
    ability_name: Optional[str] = None          # for USE_ABILITY
    expires_after_rounds: Optional[int] = None  # auto-expire after N rounds
    one_shot: bool = False                      # if True, trigger once then deactivate

    def is_triggered(self, hp_fraction: float, round_number: int,
                     allies_alive: int, **context) -> bool:
        """
        Evaluate whether this order's trigger condition is currently met.
        Additional context can be passed as keyword args for complex triggers.
        """
        t = self.trigger
        match t.trigger_type:
            case TriggerType.ALWAYS:
                return True
            case TriggerType.HP_BELOW_PERCENT:
                return (hp_fraction * 100) < (t.threshold or 25)
            case TriggerType.HP_ABOVE_PERCENT:
                return (hp_fraction * 100) > (t.threshold or 75)
            case TriggerType.ALLY_DIES:
                return context.get("ally_just_died", False)
            case TriggerType.NO_ALLIES_REMAINING:
                return allies_alive <= 0
            case TriggerType.ROUND_NUMBER:
                return round_number >= (t.threshold or 1)
            case TriggerType.ENEMY_IN_RANGE:
                nearest_dist = context.get("nearest_enemy_distance", 999)
                return nearest_dist <= (t.threshold or 1)
            case _:
                return False
