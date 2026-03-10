"""
Tests for the LLM decision engine.

Uses mocked Ollama responses to test:
- Prompt building
- Response parsing (valid JSON, malformed JSON, code blocks)
- Fallback to rule engine on failure
- Engine name reporting
"""

import json
import pytest
from unittest.mock import MagicMock, patch
from factories import make_lich, make_perception, make_warrior

from models.action import AttackAction, CastSpellAction, EndTurnAction, MoveAction
from models.creature import HexCoord
from ai.intelligence import IntelligenceTier
from ai.llm_engine import LLMDecisionEngine, build_prompt, parse_llm_response
from ai.rule_engine import RuleBasedDecisionEngine
from config import OllamaConfig


# ---------------------------------------------------------------------------
# Prompt building tests
# ---------------------------------------------------------------------------

class TestPromptBuilding:
    """Verify the LLM prompt contains all required information."""

    def test_prompt_includes_creature_name(self):
        lich = make_lich()
        warrior = make_warrior(position=HexCoord(q=3, r=0))
        perception = make_perception(lich, [warrior])

        prompt = build_prompt(lich, perception, [])
        assert "Lich" in prompt

    def test_prompt_includes_hp_status(self):
        lich = make_lich()
        perception = make_perception(lich, [])

        prompt = build_prompt(lich, perception, [])
        assert f"{lich.current_hp}/{lich.stat_block.hit_points_max}" in prompt

    def test_prompt_includes_visible_enemies(self):
        lich = make_lich()
        warrior = make_warrior(position=HexCoord(q=3, r=0))
        perception = make_perception(lich, [warrior])

        prompt = build_prompt(lich, perception, [])
        assert "Warrior" in prompt
        assert "warrior_1" in prompt

    def test_prompt_includes_spells(self):
        lich = make_lich()
        perception = make_perception(lich, [])

        prompt = build_prompt(lich, perception, [])
        assert "fireball" in prompt
        assert "power_word_kill" in prompt

    def test_prompt_includes_available_actions(self):
        lich = make_lich()
        perception = make_perception(lich, [])

        prompt = build_prompt(lich, perception, [])
        assert "attack" in prompt
        assert "cast_spell" in prompt
        assert "dodge" in prompt


# ---------------------------------------------------------------------------
# Response parsing tests
# ---------------------------------------------------------------------------

class TestResponseParsing:
    """Test parsing of various LLM response formats."""

    def test_parse_attack_action(self):
        lich = make_lich()
        raw = json.dumps({
            "move_to": None,
            "action": "attack",
            "attack_name": "Paralyzing Touch",
            "spell_name": None,
            "spell_level": None,
            "target_id": "warrior_1",
            "target_hex": None,
            "reasoning": "Paralyze the warrior to neutralize melee threat",
        })

        plan = parse_llm_response(raw, lich)
        assert plan.creature_id == lich.creature_id
        assert len(plan.actions) == 1
        assert isinstance(plan.actions[0], AttackAction)
        assert plan.actions[0].target_id == "warrior_1"

    def test_parse_cast_spell_action(self):
        lich = make_lich()
        raw = json.dumps({
            "move_to": {"q": -2, "r": 0},
            "action": "cast_spell",
            "attack_name": None,
            "spell_name": "fireball",
            "spell_level": 3,
            "target_id": None,
            "target_hex": {"q": 3, "r": 0},
            "reasoning": "Fireball the cluster of adventurers",
        })

        plan = parse_llm_response(raw, lich)
        assert len(plan.actions) == 2  # move + cast
        assert isinstance(plan.actions[0], MoveAction)
        assert isinstance(plan.actions[1], CastSpellAction)
        assert plan.actions[1].spell_name == "fireball"

    def test_parse_move_and_attack(self):
        lich = make_lich()
        raw = json.dumps({
            "move_to": {"q": 1, "r": 0},
            "action": "attack",
            "attack_name": "Paralyzing Touch",
            "target_id": "fighter_1",
            "reasoning": "Close in for touch attack",
        })

        plan = parse_llm_response(raw, lich)
        assert len(plan.actions) == 2
        assert isinstance(plan.actions[0], MoveAction)
        assert isinstance(plan.actions[1], AttackAction)

    def test_parse_json_in_code_block(self):
        """LLMs sometimes wrap JSON in markdown code blocks."""
        lich = make_lich()
        raw = '```json\n{"move_to": null, "action": "dodge", "reasoning": "Defensive stance"}\n```'

        plan = parse_llm_response(raw, lich)
        assert len(plan.actions) >= 1

    def test_parse_end_turn(self):
        lich = make_lich()
        raw = json.dumps({
            "move_to": None,
            "action": "end_turn",
            "reasoning": "Conserving resources",
        })

        plan = parse_llm_response(raw, lich)
        assert len(plan.actions) == 1
        assert isinstance(plan.actions[0], EndTurnAction)

    def test_parse_invalid_json_raises(self):
        lich = make_lich()
        with pytest.raises(Exception):
            parse_llm_response("This is not JSON at all", lich)


# ---------------------------------------------------------------------------
# LLM engine with mocked Ollama
# ---------------------------------------------------------------------------

class TestLLMEngineWithMock:
    """Test the LLM engine with a mocked Ollama client."""

    def _make_engine_with_mock(self, mock_response: str):
        """Create an LLM engine with a mocked ollama call."""
        fallback = RuleBasedDecisionEngine(
            tier=IntelligenceTier.TACTICAL, noise_factor=0.0,
        )
        engine = LLMDecisionEngine(
            tier=IntelligenceTier.GENIUS,
            ollama_config=OllamaConfig(model="test-model"),
            fallback_engine=fallback,
        )
        # Mock the internal _call_ollama method
        engine._call_ollama = MagicMock(return_value=mock_response)
        return engine

    def test_successful_llm_decision(self):
        response = json.dumps({
            "move_to": None,
            "action": "cast_spell",
            "spell_name": "fireball",
            "spell_level": 3,
            "target_hex": {"q": 3, "r": 0},
            "reasoning": "Fireball the group",
        })

        engine = self._make_engine_with_mock(response)
        lich = make_lich()
        warrior = make_warrior(position=HexCoord(q=3, r=0))
        perception = make_perception(lich, [warrior])

        plan = engine.decide(lich, perception, [])
        assert len(plan.actions) >= 1
        assert isinstance(plan.actions[0], CastSpellAction)
        engine._call_ollama.assert_called_once()

    def test_fallback_on_invalid_response(self):
        """When the LLM returns garbage, should fall back to rule engine."""
        engine = self._make_engine_with_mock("I am not valid JSON!!")
        lich = make_lich()
        warrior = make_warrior(position=HexCoord(q=1, r=0))
        perception = make_perception(lich, [warrior])

        plan = engine.decide(lich, perception, [])
        # Should still produce a valid plan via fallback
        assert len(plan.actions) >= 1
        assert plan.creature_id == lich.creature_id

    def test_fallback_on_exception(self):
        """When Ollama throws an exception, should fall back."""
        fallback = RuleBasedDecisionEngine(
            tier=IntelligenceTier.TACTICAL, noise_factor=0.0,
        )
        engine = LLMDecisionEngine(
            tier=IntelligenceTier.GENIUS,
            ollama_config=OllamaConfig(),
            fallback_engine=fallback,
        )
        engine._call_ollama = MagicMock(side_effect=RuntimeError("Connection refused"))

        lich = make_lich()
        warrior = make_warrior(position=HexCoord(q=1, r=0))
        perception = make_perception(lich, [warrior])

        plan = engine.decide(lich, perception, [])
        assert len(plan.actions) >= 1

    def test_engine_name_includes_model(self):
        engine = LLMDecisionEngine(
            tier=IntelligenceTier.GENIUS,
            ollama_config=OllamaConfig(model="mistral"),
        )
        assert "mistral" in engine.engine_name()
        assert "genius" in engine.engine_name()
