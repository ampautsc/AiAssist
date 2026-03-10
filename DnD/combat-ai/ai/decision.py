"""
Decision orchestrator.

Top-level entry point for combat AI decisions. Routes each creature to the
appropriate engine based on its intelligence tier and AI profile.
"""

from __future__ import annotations

import logging
from pathlib import Path
from typing import Optional

from config import CombatAISettings, DEFAULT_SETTINGS
from models.action import TurnPlan
from models.creature import CreatureState
from models.orders import StandingOrder
from models.perception import PerceptionSnapshot
from ai.base import CombatAIEngine
from ai.intelligence import (
    AIProfile,
    IntelligenceTier,
    load_profile,
    resolve_tier,
    tier_uses_llm,
)
from ai.llm_engine import LLMDecisionEngine
from ai.rule_engine import RuleBasedDecisionEngine

logger = logging.getLogger(__name__)


class DecisionOrchestrator:
    """
    Routes combat decisions to the appropriate engine based on creature
    intelligence tier and AI profile.

    Usage:
        orchestrator = DecisionOrchestrator()
        turn_plan = orchestrator.decide(creature_state, perception, orders)
    """

    def __init__(self, settings: Optional[CombatAISettings] = None):
        self._settings = settings or DEFAULT_SETTINGS
        self._profile_cache: dict[str, Optional[AIProfile]] = {}
        self._engine_cache: dict[str, CombatAIEngine] = {}

    def decide(
        self,
        creature: CreatureState,
        perception: PerceptionSnapshot,
        standing_orders: list[StandingOrder] | None = None,
        legal_actions: list[str] | None = None,
    ) -> TurnPlan:
        """
        Main entry point: decide what a creature does on its turn.

        1. Load AI profile for the creature type
        2. Resolve intelligence tier
        3. Route to the appropriate engine (rule-based or LLM)
        4. Return the resulting TurnPlan
        """
        orders = standing_orders or []

        # Load profile (cached)
        profile = self._get_profile(creature.stat_block.name.lower().replace(" ", "_"))

        # Resolve tier
        tier = resolve_tier(creature.stat_block.intelligence_score, profile)

        # Get or create engine
        engine = self._get_engine(tier, profile)

        logger.info(
            "Deciding for %s (INT %d, tier=%s, engine=%s)",
            creature.creature_id,
            creature.stat_block.intelligence_score,
            tier.value,
            engine.engine_name(),
        )

        plan = engine.decide(creature, perception, orders, legal_actions)

        logger.info(
            "%s turn plan: %d actions - %s",
            creature.creature_id,
            len(plan.actions),
            ", ".join(a.action_type.value if hasattr(a, 'action_type') else str(a) for a in plan.actions),
        )

        return plan

    def _get_profile(self, creature_key: str) -> Optional[AIProfile]:
        """Load and cache an AI profile for a creature type."""
        if creature_key not in self._profile_cache:
            self._profile_cache[creature_key] = load_profile(
                creature_key, self._settings.profiles_dir
            )
        return self._profile_cache[creature_key]

    def _get_engine(
        self,
        tier: IntelligenceTier,
        profile: Optional[AIProfile],
    ) -> CombatAIEngine:
        """Get or create an engine for the given tier."""
        cache_key = f"{tier.value}_{profile.creature_type if profile else 'default'}"

        if cache_key not in self._engine_cache:
            if tier_uses_llm(tier):
                # LLM engine with rule-based fallback
                fallback = RuleBasedDecisionEngine(
                    tier=tier,
                    profile=profile,
                    noise_factor=self._settings.ai.rule_noise_factor,
                )
                engine: CombatAIEngine = LLMDecisionEngine(
                    tier=tier,
                    profile=profile,
                    ollama_config=self._settings.ollama,
                    fallback_engine=fallback if self._settings.ai.llm_fallback_to_rules else None,
                )
            else:
                engine = RuleBasedDecisionEngine(
                    tier=tier,
                    profile=profile,
                    noise_factor=self._settings.ai.rule_noise_factor,
                )
            self._engine_cache[cache_key] = engine

        return self._engine_cache[cache_key]
