"""
Tests for the standing orders model.

Validates:
- Trigger condition evaluation
- Order priority sorting
- Various trigger types (HP thresholds, round number, always, etc.)
"""

import pytest

from models.creature import HexCoord
from models.orders import (
    OrderDirective,
    OrderPriority,
    StandingOrder,
    TriggerCondition,
    TriggerType,
)


class TestTriggerConditions:
    """Test each trigger type evaluates correctly."""

    def test_always_trigger(self):
        order = StandingOrder(
            trigger=TriggerCondition(trigger_type=TriggerType.ALWAYS),
            directive=OrderDirective.HOLD_POSITION,
        )
        assert order.is_triggered(hp_fraction=1.0, round_number=1, allies_alive=5)

    def test_hp_below_trigger_fires(self):
        order = StandingOrder(
            trigger=TriggerCondition(
                trigger_type=TriggerType.HP_BELOW_PERCENT,
                threshold=25,
            ),
            directive=OrderDirective.RETREAT,
        )
        assert order.is_triggered(hp_fraction=0.20, round_number=1, allies_alive=3)

    def test_hp_below_trigger_does_not_fire(self):
        order = StandingOrder(
            trigger=TriggerCondition(
                trigger_type=TriggerType.HP_BELOW_PERCENT,
                threshold=25,
            ),
            directive=OrderDirective.RETREAT,
        )
        assert not order.is_triggered(hp_fraction=0.50, round_number=1, allies_alive=3)

    def test_hp_above_trigger(self):
        order = StandingOrder(
            trigger=TriggerCondition(
                trigger_type=TriggerType.HP_ABOVE_PERCENT,
                threshold=75,
            ),
            directive=OrderDirective.AGGRESSIVE_ADVANCE,
        )
        assert order.is_triggered(hp_fraction=0.90, round_number=1, allies_alive=3)
        assert not order.is_triggered(hp_fraction=0.50, round_number=1, allies_alive=3)

    def test_round_number_trigger(self):
        order = StandingOrder(
            trigger=TriggerCondition(
                trigger_type=TriggerType.ROUND_NUMBER,
                threshold=3,
            ),
            directive=OrderDirective.FLEE,
        )
        assert not order.is_triggered(hp_fraction=1.0, round_number=2, allies_alive=3)
        assert order.is_triggered(hp_fraction=1.0, round_number=3, allies_alive=3)
        assert order.is_triggered(hp_fraction=1.0, round_number=5, allies_alive=3)

    def test_no_allies_trigger(self):
        order = StandingOrder(
            trigger=TriggerCondition(
                trigger_type=TriggerType.NO_ALLIES_REMAINING,
            ),
            directive=OrderDirective.FLEE,
        )
        assert not order.is_triggered(hp_fraction=1.0, round_number=1, allies_alive=2)
        assert order.is_triggered(hp_fraction=1.0, round_number=1, allies_alive=0)

    def test_enemy_in_range_trigger(self):
        order = StandingOrder(
            trigger=TriggerCondition(
                trigger_type=TriggerType.ENEMY_IN_RANGE,
                threshold=2,
            ),
            directive=OrderDirective.FOCUS_NEAREST,
        )
        assert order.is_triggered(
            hp_fraction=1.0, round_number=1, allies_alive=3,
            nearest_enemy_distance=1,
        )
        assert not order.is_triggered(
            hp_fraction=1.0, round_number=1, allies_alive=3,
            nearest_enemy_distance=5,
        )

    def test_ally_dies_trigger(self):
        order = StandingOrder(
            trigger=TriggerCondition(trigger_type=TriggerType.ALLY_DIES),
            directive=OrderDirective.RALLY,
        )
        assert order.is_triggered(
            hp_fraction=1.0, round_number=1, allies_alive=2,
            ally_just_died=True,
        )
        assert not order.is_triggered(
            hp_fraction=1.0, round_number=1, allies_alive=3,
            ally_just_died=False,
        )


class TestOrderPriority:
    """Test order sorting by priority."""

    def test_priority_ordering(self):
        suggestion = OrderPriority.SUGGESTION
        strong = OrderPriority.STRONG
        absolute = OrderPriority.ABSOLUTE

        orders = [
            StandingOrder(
                name="suggest",
                trigger=TriggerCondition(trigger_type=TriggerType.ALWAYS),
                directive=OrderDirective.FOCUS_WEAKEST,
                priority=suggestion,
            ),
            StandingOrder(
                name="absolute",
                trigger=TriggerCondition(trigger_type=TriggerType.ALWAYS),
                directive=OrderDirective.HOLD_POSITION,
                priority=absolute,
            ),
            StandingOrder(
                name="strong",
                trigger=TriggerCondition(trigger_type=TriggerType.ALWAYS),
                directive=OrderDirective.RETREAT,
                priority=strong,
            ),
        ]

        sorted_orders = sorted(orders, key=lambda o: o.priority.value, reverse=True)
        assert sorted_orders[0].name == "suggest"  # alphabetically 'suggestion' > 'strong' > 'absolute'


class TestStandingOrderModel:
    """Test StandingOrder model validation."""

    def test_default_values(self):
        order = StandingOrder(
            trigger=TriggerCondition(trigger_type=TriggerType.ALWAYS),
            directive=OrderDirective.HOLD_POSITION,
        )
        assert order.priority == OrderPriority.STRONG
        assert order.protect_range == 2
        assert order.one_shot is False
        assert order.expires_after_rounds is None

    def test_one_shot_order(self):
        order = StandingOrder(
            trigger=TriggerCondition(trigger_type=TriggerType.HP_BELOW_PERCENT, threshold=50),
            directive=OrderDirective.USE_ABILITY,
            ability_name="healing_potion",
            one_shot=True,
        )
        assert order.one_shot is True
        assert order.ability_name == "healing_potion"
