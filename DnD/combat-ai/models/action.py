"""
Combat action models.

All possible actions a creature can take on its turn, represented as
a discriminated union via Pydantic. Start with Move + Attack + CastSpell;
additional actions will be added iteratively.
"""

from __future__ import annotations

from enum import Enum
from typing import Annotated, Literal, Optional, Union

from pydantic import BaseModel, Field

from models.creature import HexCoord


class ActionType(str, Enum):
    MOVE = "move"
    ATTACK = "attack"
    CAST_SPELL = "cast_spell"
    DASH = "dash"
    DODGE = "dodge"
    DISENGAGE = "disengage"
    END_TURN = "end_turn"


# ---------------------------------------------------------------------------
# Individual action types
# ---------------------------------------------------------------------------

class MoveAction(BaseModel):
    """Move along a path of hex coordinates."""
    action_type: Literal[ActionType.MOVE] = ActionType.MOVE
    path: list[HexCoord]                     # ordered list of hexes to traverse
    reasoning: str = ""

    @property
    def destination(self) -> HexCoord:
        return self.path[-1] if self.path else HexCoord()

    @property
    def cost(self) -> int:
        """Movement cost in hexes (1 per step, terrain modifiers applied elsewhere)."""
        return len(self.path)


class AttackAction(BaseModel):
    """Make a weapon attack against a target creature."""
    action_type: Literal[ActionType.ATTACK] = ActionType.ATTACK
    attack_name: str                         # must match an AttackDefinition.name
    target_id: str                           # creature_id of the target
    reasoning: str = ""


class CastSpellAction(BaseModel):
    """Cast a spell, optionally at a target or location."""
    action_type: Literal[ActionType.CAST_SPELL] = ActionType.CAST_SPELL
    spell_name: str
    spell_level: int = 0                     # 0 = cantrip
    target_id: Optional[str] = None          # creature target
    target_hex: Optional[HexCoord] = None    # area/location target
    reasoning: str = ""


class DashAction(BaseModel):
    """Use action to double movement this turn."""
    action_type: Literal[ActionType.DASH] = ActionType.DASH
    reasoning: str = ""


class DodgeAction(BaseModel):
    """Use action to impose disadvantage on attacks against you."""
    action_type: Literal[ActionType.DODGE] = ActionType.DODGE
    reasoning: str = ""


class DisengageAction(BaseModel):
    """Use action to avoid opportunity attacks for the rest of the turn."""
    action_type: Literal[ActionType.DISENGAGE] = ActionType.DISENGAGE
    reasoning: str = ""


class EndTurnAction(BaseModel):
    """Explicitly end turn without further action."""
    action_type: Literal[ActionType.END_TURN] = ActionType.END_TURN
    reasoning: str = ""


# ---------------------------------------------------------------------------
# Discriminated union
# ---------------------------------------------------------------------------

CombatAction = Annotated[
    Union[
        MoveAction,
        AttackAction,
        CastSpellAction,
        DashAction,
        DodgeAction,
        DisengageAction,
        EndTurnAction,
    ],
    Field(discriminator="action_type"),
]


# ---------------------------------------------------------------------------
# Turn plan (ordered sequence of actions for one turn)
# ---------------------------------------------------------------------------

class TurnPlan(BaseModel):
    """
    A creature's full plan for its turn: an ordered sequence of actions.
    Typically: optional move + one main action (+ future: bonus action, reaction).
    """
    creature_id: str
    actions: list[CombatAction] = Field(default_factory=list)

    def add(self, action: CombatAction) -> TurnPlan:
        """Return a new TurnPlan with the action appended."""
        return TurnPlan(
            creature_id=self.creature_id,
            actions=[*self.actions, action],
        )
