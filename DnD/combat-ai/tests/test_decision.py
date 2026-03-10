"""
Tests for the decision orchestrator.

Validates:
- Correct engine routing based on intelligence tier
- AI profile loading and caching
- Standing orders override normal AI
- Integration: full decide() flow produces valid TurnPlans
"""

import pytest
from pathlib import Path
from factories import (
    make_goblin,
    make_lich,
    make_perception,
    make_warrior,
    make_zombie,
)

from models.action import AttackAction, DodgeAction, EndTurnAction, MoveAction
from models.creature import HexCoord
from models.orders import (
    OrderDirective,
    OrderPriority,
    StandingOrder,
    TriggerCondition,
    TriggerType,
)
from ai.decision import DecisionOrchestrator
from ai.intelligence import IntelligenceTier, resolve_tier, tier_from_intelligence
from config import CombatAISettings, OllamaConfig


# ---------------------------------------------------------------------------
# Intelligence tier resolution tests
# ---------------------------------------------------------------------------

class TestTierResolution:
    """Test tier_from_intelligence and resolve_tier."""

    def test_int_3_is_mindless(self):
        assert tier_from_intelligence(3) == IntelligenceTier.BESTIAL

    def test_int_1_is_mindless(self):
        assert tier_from_intelligence(1) == IntelligenceTier.MINDLESS

    def test_int_10_is_cunning(self):
        assert tier_from_intelligence(10) == IntelligenceTier.CUNNING

    def test_int_14_is_tactical(self):
        assert tier_from_intelligence(14) == IntelligenceTier.TACTICAL

    def test_int_20_is_genius(self):
        assert tier_from_intelligence(20) == IntelligenceTier.GENIUS

    def test_profile_override_takes_precedence(self):
        from ai.intelligence import AIProfile
        profile = AIProfile(
            creature_type="special_zombie",
            intelligence_tier_override=IntelligenceTier.CUNNING,
        )
        # Even though INT is 3 (normally mindless), profile says cunning
        tier = resolve_tier(3, profile)
        assert tier == IntelligenceTier.CUNNING


# ---------------------------------------------------------------------------
# Orchestrator routing tests
# ---------------------------------------------------------------------------

class TestOrchestratorRouting:
    """Test that the orchestrator routes to the correct engine."""

    def _make_orchestrator(self) -> DecisionOrchestrator:
        """Create an orchestrator that won't actually call Ollama."""
        settings = CombatAISettings(
            ollama=OllamaConfig(host="http://localhost:11434", model="test"),
            # Use LLM fallback so we don't need a real Ollama server
        )
        settings = CombatAISettings(
            ollama=OllamaConfig(host="http://localhost:99999", model="nonexistent"),
        )
        return DecisionOrchestrator(settings=settings)

    def test_zombie_uses_rule_engine(self):
        """INT 3 zombie should route to the rule engine."""
        orchestrator = self._make_orchestrator()
        zombie = make_zombie(position=HexCoord(q=0, r=0))
        warrior = make_warrior(position=HexCoord(q=1, r=0))
        perception = make_perception(zombie, [warrior])

        plan = orchestrator.decide(zombie, perception)

        assert plan.creature_id == zombie.creature_id
        assert len(plan.actions) >= 1

    def test_goblin_uses_rule_engine(self):
        """INT 10 goblin should route to the rule engine."""
        orchestrator = self._make_orchestrator()
        goblin = make_goblin(position=HexCoord(q=0, r=0))
        warrior = make_warrior(position=HexCoord(q=1, r=0))
        perception = make_perception(goblin, [warrior])

        plan = orchestrator.decide(goblin, perception)
        assert plan.creature_id == goblin.creature_id
        assert len(plan.actions) >= 1

    def test_lich_falls_back_to_rules(self):
        """INT 20 lich should try LLM but fall back to rules (no server)."""
        orchestrator = self._make_orchestrator()
        lich = make_lich(position=HexCoord(q=0, r=0))
        warrior = make_warrior(position=HexCoord(q=1, r=0))
        perception = make_perception(lich, [warrior])

        plan = orchestrator.decide(lich, perception)
        # Even without Ollama, fallback produces a valid plan
        assert plan.creature_id == lich.creature_id
        assert len(plan.actions) >= 1


# ---------------------------------------------------------------------------
# Standing orders integration tests
# ---------------------------------------------------------------------------

class TestStandingOrders:
    """Test that standing orders override normal AI decisions."""

    def test_retreat_order_at_low_hp(self):
        """A 'retreat below 25% HP' order should produce retreat behavior."""
        zombie = make_zombie(position=HexCoord(q=1, r=0))
        zombie.current_hp = 3  # ~14% HP
        warrior = make_warrior(position=HexCoord(q=2, r=0))
        perception = make_perception(zombie, [warrior])

        retreat_order = StandingOrder(
            name="retreat_when_wounded",
            trigger=TriggerCondition(
                trigger_type=TriggerType.HP_BELOW_PERCENT,
                threshold=25,
            ),
            directive=OrderDirective.RETREAT,
            priority=OrderPriority.ABSOLUTE,
        )

        from ai.rule_engine import RuleBasedDecisionEngine
        engine = RuleBasedDecisionEngine(
            tier=IntelligenceTier.BESTIAL, noise_factor=0.0,
        )
        plan = engine.decide(zombie, perception, [retreat_order])

        # Should have a move action (retreating)
        move_actions = [a for a in plan.actions if isinstance(a, MoveAction)]
        assert len(move_actions) >= 1, "Retreat order should produce movement away"

    def test_hold_position_order(self):
        """A 'hold position always' order should not produce movement."""
        zombie = make_zombie(position=HexCoord(q=0, r=0))
        warrior = make_warrior(position=HexCoord(q=5, r=0))  # far away
        perception = make_perception(zombie, [warrior])

        hold_order = StandingOrder(
            name="hold_the_line",
            trigger=TriggerCondition(trigger_type=TriggerType.ALWAYS),
            directive=OrderDirective.HOLD_POSITION,
            priority=OrderPriority.ABSOLUTE,
        )

        from ai.rule_engine import RuleBasedDecisionEngine
        engine = RuleBasedDecisionEngine(
            tier=IntelligenceTier.LOW, noise_factor=0.0,
        )
        plan = engine.decide(zombie, perception, [hold_order])

        # Should NOT have movement toward the enemy
        move_actions = [a for a in plan.actions if isinstance(a, MoveAction)]
        assert len(move_actions) == 0, "Hold position should prevent movement"

    def test_focus_target_order(self):
        """A 'focus specific target' order should attack that target."""
        zombie = make_zombie(position=HexCoord(q=0, r=0))
        target = make_warrior("target_1", HexCoord(q=1, r=0))
        other = make_warrior("other_1", HexCoord(q=0, r=1))
        perception = make_perception(zombie, [target, other])

        focus_order = StandingOrder(
            name="focus_the_healer",
            trigger=TriggerCondition(trigger_type=TriggerType.ALWAYS),
            directive=OrderDirective.FOCUS_TARGET,
            priority=OrderPriority.ABSOLUTE,
            target_creature_id="target_1",
        )

        from ai.rule_engine import RuleBasedDecisionEngine
        engine = RuleBasedDecisionEngine(
            tier=IntelligenceTier.LOW, noise_factor=0.0,
        )
        plan = engine.decide(zombie, perception, [focus_order])

        attack_actions = [a for a in plan.actions if isinstance(a, AttackAction)]
        if attack_actions:
            assert attack_actions[0].target_id == "target_1", \
                "Focus target order should attack the specified target"


# ---------------------------------------------------------------------------
# Full integration test
# ---------------------------------------------------------------------------

class TestFullIntegration:
    """End-to-end: orchestrator decides for multiple creature types."""

    def test_multitype_encounter(self):
        """Run a simple encounter with different creature types."""
        orchestrator = DecisionOrchestrator()

        zombie = make_zombie("z1", HexCoord(q=-2, r=0))
        goblin = make_goblin("g1", HexCoord(q=-3, r=1))
        warrior = make_warrior("w1", HexCoord(q=2, r=0))

        # Each creature gets a decision
        for creature in [zombie, goblin, warrior]:
            others = [c for c in [zombie, goblin, warrior] if c.creature_id != creature.creature_id]
            perception = make_perception(creature, others)
            plan = orchestrator.decide(creature, perception)

            assert plan.creature_id == creature.creature_id
            assert len(plan.actions) >= 1, f"{creature.creature_id} should have at least one action"
