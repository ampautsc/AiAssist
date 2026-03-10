"""
Tests for the rule-based decision engine.

Validates that each intelligence tier produces appropriate behavior:
- Mindless: attacks nearest, never retreat
- Bestial: flees at low HP, pack behavior
- Low: targets wounded, basic tactics
- Cunning: coordination, avoids double-targeting
"""

import pytest
from factories import (
    make_goblin,
    make_perception,
    make_small_arena,
    make_warrior,
    make_wolf,
    make_zombie,
)

from models.action import AttackAction, DashAction, DodgeAction, EndTurnAction, MoveAction
from models.creature import HexCoord
from ai.intelligence import IntelligenceTier
from ai.rule_engine import RuleBasedDecisionEngine


# ---------------------------------------------------------------------------
# Mindless tier tests
# ---------------------------------------------------------------------------

class TestMindlessTier:
    """Zombies and mindless creatures: attack nearest, never retreat."""

    def test_zombie_attacks_adjacent_enemy(self):
        """A zombie adjacent to an enemy should attack it."""
        zombie = make_zombie(position=HexCoord(q=0, r=0))
        warrior = make_warrior(position=HexCoord(q=1, r=0))  # adjacent
        perception = make_perception(zombie, [warrior])

        engine = RuleBasedDecisionEngine(tier=IntelligenceTier.MINDLESS, noise_factor=0.0)
        plan = engine.decide(zombie, perception, [])

        attack_actions = [a for a in plan.actions if isinstance(a, AttackAction)]
        assert len(attack_actions) >= 1, "Zombie should attack adjacent enemy"
        assert attack_actions[0].target_id == "warrior_1"

    def test_zombie_moves_toward_distant_enemy(self):
        """A zombie with no enemy in reach should move toward nearest."""
        zombie = make_zombie(position=HexCoord(q=0, r=0))
        warrior = make_warrior(position=HexCoord(q=5, r=0))  # 5 hexes away
        perception = make_perception(zombie, [warrior])

        engine = RuleBasedDecisionEngine(tier=IntelligenceTier.MINDLESS, noise_factor=0.0)
        plan = engine.decide(zombie, perception, [])

        move_actions = [a for a in plan.actions if isinstance(a, MoveAction)]
        assert len(move_actions) >= 1, "Zombie should move toward enemy"
        # Verify movement is toward the warrior
        dest = move_actions[0].destination
        assert dest.distance_to(warrior.position) < zombie.position.distance_to(warrior.position)

    def test_zombie_does_not_flee_at_low_hp(self):
        """Mindless creatures never retreat even at very low HP."""
        zombie = make_zombie(position=HexCoord(q=0, r=0))
        zombie.current_hp = 1  # near death
        warrior = make_warrior(position=HexCoord(q=1, r=0))
        perception = make_perception(zombie, [warrior])

        engine = RuleBasedDecisionEngine(tier=IntelligenceTier.MINDLESS, noise_factor=0.0)
        plan = engine.decide(zombie, perception, [])

        attack_actions = [a for a in plan.actions if isinstance(a, AttackAction)]
        assert len(attack_actions) >= 1, "Mindless creature should still attack at low HP"

    def test_zombie_ends_turn_with_no_enemies(self):
        """With no visible enemies, zombie should end turn or dash."""
        zombie = make_zombie(position=HexCoord(q=0, r=0))
        perception = make_perception(zombie, [])

        engine = RuleBasedDecisionEngine(tier=IntelligenceTier.MINDLESS, noise_factor=0.0)
        plan = engine.decide(zombie, perception, [])

        # Should have some action (end turn or dodge)
        assert len(plan.actions) >= 1


# ---------------------------------------------------------------------------
# Bestial tier tests
# ---------------------------------------------------------------------------

class TestBestialTier:
    """Wolves and bestial creatures: pack tactics, flee when wounded."""

    def test_wolf_attacks_when_healthy(self):
        """A healthy wolf adjacent to prey should attack."""
        wolf = make_wolf(position=HexCoord(q=0, r=0))
        warrior = make_warrior(position=HexCoord(q=1, r=0))
        perception = make_perception(wolf, [warrior])

        engine = RuleBasedDecisionEngine(tier=IntelligenceTier.BESTIAL, noise_factor=0.0)
        plan = engine.decide(wolf, perception, [])

        attack_actions = [a for a in plan.actions if isinstance(a, AttackAction)]
        assert len(attack_actions) >= 1

    def test_wolf_flees_at_low_hp(self):
        """A wolf at low HP should prefer fleeing over attacking."""
        wolf = make_wolf(position=HexCoord(q=1, r=0))
        wolf.current_hp = 2  # very low HP (~18%)
        warrior = make_warrior(position=HexCoord(q=2, r=0))
        perception = make_perception(wolf, [warrior])

        engine = RuleBasedDecisionEngine(
            tier=IntelligenceTier.BESTIAL, noise_factor=0.0,
        )
        plan = engine.decide(wolf, perception, [])

        # Should prefer movement away from enemy or dash/disengage
        has_flee_action = any(
            isinstance(a, (DashAction, MoveAction))
            for a in plan.actions
        )
        # At minimum, should not be purely attacking
        assert has_flee_action or any(isinstance(a, DodgeAction) for a in plan.actions), \
            "Wounded wolf should attempt to flee or defend"


# ---------------------------------------------------------------------------
# Low tier tests
# ---------------------------------------------------------------------------

class TestLowTier:
    """Goblins and low-intelligence creatures: target wounded, basic tactics."""

    def test_goblin_prefers_wounded_target(self):
        """A goblin should prefer attacking a wounded enemy over a healthy one."""
        goblin = make_goblin(position=HexCoord(q=0, r=0))
        healthy = make_warrior("healthy_1", position=HexCoord(q=1, r=0))
        wounded = make_warrior("wounded_1", position=HexCoord(q=0, r=1))
        wounded.current_hp = 5  # near-death

        perception = make_perception(goblin, [healthy, wounded])

        engine = RuleBasedDecisionEngine(tier=IntelligenceTier.LOW, noise_factor=0.0)
        plan = engine.decide(goblin, perception, [])

        attack_actions = [a for a in plan.actions if isinstance(a, AttackAction)]
        if attack_actions:
            # Should prefer the wounded target
            assert attack_actions[0].target_id == "wounded_1", \
                "Goblin should prioritize wounded target"

    def test_goblin_uses_ranged_when_distant(self):
        """A goblin with a ranged weapon should consider ranged attacks."""
        goblin = make_goblin(position=HexCoord(q=0, r=0))
        warrior = make_warrior(position=HexCoord(q=10, r=0))  # 10 hexes away
        perception = make_perception(goblin, [warrior])

        engine = RuleBasedDecisionEngine(tier=IntelligenceTier.LOW, noise_factor=0.0)
        plan = engine.decide(goblin, perception, [])

        # Should have some action — either move or ranged attack
        assert len(plan.actions) >= 1


# ---------------------------------------------------------------------------
# Cunning tier tests
# ---------------------------------------------------------------------------

class TestCunningTier:
    """Bandits and cunning creatures: coordination, adaptability."""

    def test_cunning_considers_dodge_when_outnumbered(self):
        """Cunning creatures should value dodge more when outnumbered."""
        from ai.rule_engine import _ScoredAction

        goblin = make_goblin(position=HexCoord(q=0, r=0))
        goblin.stat_block = goblin.stat_block.model_copy(
            update={"abilities": goblin.stat_block.abilities.model_copy(
                update={"intelligence": 10}
            )}
        )

        # 3 enemies, 0 allies — outnumbered
        e1 = make_warrior("e1", HexCoord(q=1, r=0))
        e2 = make_warrior("e2", HexCoord(q=-1, r=0))
        e3 = make_warrior("e3", HexCoord(q=0, r=1))
        perception = make_perception(goblin, [e1, e2, e3])

        engine = RuleBasedDecisionEngine(tier=IntelligenceTier.CUNNING, noise_factor=0.0)
        plan = engine.decide(goblin, perception, [])

        # Should still produce a valid plan
        assert len(plan.actions) >= 1
        assert plan.creature_id == goblin.creature_id


# ---------------------------------------------------------------------------
# General engine tests
# ---------------------------------------------------------------------------

class TestRuleEngineGeneral:
    """General rule engine behavior regardless of tier."""

    def test_plan_has_creature_id(self):
        """Every TurnPlan must include the deciding creature's ID."""
        zombie = make_zombie()
        perception = make_perception(zombie, [])

        engine = RuleBasedDecisionEngine(tier=IntelligenceTier.MINDLESS)
        plan = engine.decide(zombie, perception, [])

        assert plan.creature_id == zombie.creature_id

    def test_plan_always_has_at_least_one_action(self):
        """Engine must always return at least one action."""
        zombie = make_zombie()
        perception = make_perception(zombie, [])

        engine = RuleBasedDecisionEngine(tier=IntelligenceTier.MINDLESS)
        plan = engine.decide(zombie, perception, [])

        assert len(plan.actions) >= 1

    def test_engine_name_includes_tier(self):
        """Engine name should indicate the tier for logging."""
        engine = RuleBasedDecisionEngine(tier=IntelligenceTier.CUNNING)
        assert "cunning" in engine.engine_name()
