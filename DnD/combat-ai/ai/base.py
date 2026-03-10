"""
Abstract base class for combat AI decision engines.

All engines (rule-based, LLM-driven, player-controlled) implement this
interface so they can be swapped transparently by the orchestrator.
"""

from __future__ import annotations

from abc import ABC, abstractmethod

from models.action import TurnPlan
from models.creature import CreatureState
from models.orders import StandingOrder
from models.perception import PerceptionSnapshot


class CombatAIEngine(ABC):
    """
    Interface for a combat decision engine.

    Given a creature's current state, what it perceives, and any standing
    orders, produce a TurnPlan (ordered list of actions for its turn).
    """

    @abstractmethod
    def decide(
        self,
        creature: CreatureState,
        perception: PerceptionSnapshot,
        standing_orders: list[StandingOrder],
        legal_actions: list[str] | None = None,
    ) -> TurnPlan:
        """
        Decide what the creature does on its turn.

        Args:
            creature: The creature's full combat state.
            perception: Fog-of-war filtered view of the battlefield.
            standing_orders: Active orders that may override AI decisions.
            legal_actions: Optional constraint list of action types allowed.

        Returns:
            TurnPlan with one or more actions to execute in order.
        """
        ...

    @abstractmethod
    def engine_name(self) -> str:
        """Human-readable name of this engine (for logging)."""
        ...
