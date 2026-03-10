"""
LLM-driven combat AI decision engine.

Handles TACTICAL and GENIUS intelligence tiers by sending the creature's
perception snapshot to a local Ollama instance and parsing the structured
response. Falls back to the rule engine on failure.
"""

from __future__ import annotations

import json
import logging
from typing import Optional

from config import OllamaConfig
from models.action import (
    AttackAction,
    CastSpellAction,
    CombatAction,
    DashAction,
    DisengageAction,
    DodgeAction,
    EndTurnAction,
    MoveAction,
    TurnPlan,
)
from models.creature import CreatureState, HexCoord
from models.orders import StandingOrder
from models.perception import PerceivedCreature, PerceivedHex, PerceptionSnapshot
from ai.base import CombatAIEngine
from ai.intelligence import AIProfile, IntelligenceTier

logger = logging.getLogger(__name__)


# ---------------------------------------------------------------------------
# Prompt builder
# ---------------------------------------------------------------------------

def build_prompt(
    creature: CreatureState,
    perception: PerceptionSnapshot,
    standing_orders: list[StandingOrder],
    profile: Optional[AIProfile] = None,
) -> str:
    """Build the LLM prompt describing the creature's situation."""

    # Status summary
    conditions_str = ", ".join(c.value for c in creature.conditions) or "none"
    slots_str = _format_spell_slots(creature)
    attacks_str = _format_attacks(creature)

    # Perception
    enemies = perception.visible_enemies(creature.team)
    allies = perception.visible_allies(creature.team)
    enemies_str = _format_creatures(enemies) if enemies else "None visible"
    allies_str = _format_creatures(allies) if allies else "None visible"

    # Map (compact text grid representation)
    map_str = _format_map(perception.visible_hexes, creature.position)

    # Orders
    orders_str = "None"
    if standing_orders:
        orders_str = "\n".join(
            f"- {o.name or o.directive.value}: {o.directive.value} "
            f"(priority: {o.priority.value}, trigger: {o.trigger.trigger_type.value})"
            for o in standing_orders
        )

    # Recent events
    events_str = "\n".join(f"- {e}" for e in perception.recent_events[-6:]) if perception.recent_events else "None"

    # Personality
    personality = profile.personality if profile else "follows basic combat instincts"
    tactics = ", ".join(profile.preferred_tactics) if profile and profile.preferred_tactics else "none specified"

    prompt = f"""You are {creature.stat_block.name}, a {creature.stat_block.creature_type.value}.
Intelligence: {creature.stat_block.abilities.intelligence}. Personality: {personality}.
Preferred tactics: {tactics}.

STANDING ORDERS:
{orders_str}

YOUR STATUS:
- HP: {creature.current_hp}/{creature.stat_block.hit_points_max} ({creature.hp_status})
- AC: {creature.stat_block.armor_class}
- Position: ({creature.position.q}, {creature.position.r})
- Conditions: {conditions_str}
- Concentrating on: {creature.concentrating_on or "nothing"}
- Spell slots: {slots_str}
- Movement remaining: {creature.movement_remaining} hexes
- Speed: {creature.stat_block.speed} hexes/turn

YOUR ATTACKS:
{attacks_str}

SPELLS KNOWN: {", ".join(creature.stat_block.spells_known) or "none"}

BATTLEFIELD (your view):
{map_str}

VISIBLE ENEMIES:
{enemies_str}

VISIBLE ALLIES:
{allies_str}

RECENT EVENTS:
{events_str}

ROUND: {perception.current_round}

Choose your action for this turn. You may move (up to {creature.movement_remaining} hexes) AND take one action.

Available action types: move, attack, cast_spell, dash, dodge, disengage, end_turn

Respond with ONLY valid JSON in this exact format:
{{
  "move_to": {{"q": <int>, "r": <int>}} or null,
  "action": "attack" | "cast_spell" | "dash" | "dodge" | "disengage" | "end_turn",
  "attack_name": "<name>" or null,
  "spell_name": "<name>" or null,
  "spell_level": <int> or null,
  "target_id": "<creature_id>" or null,
  "target_hex": {{"q": <int>, "r": <int>}} or null,
  "reasoning": "<brief tactical reasoning>"
}}"""

    return prompt


# ---------------------------------------------------------------------------
# Response parser
# ---------------------------------------------------------------------------

def parse_llm_response(raw: str, creature: CreatureState) -> TurnPlan:
    """
    Parse the LLM's JSON response into a TurnPlan.
    Raises ValueError if the response can't be parsed.
    """
    # Extract JSON from potential markdown code blocks
    text = raw.strip()
    if "```json" in text:
        text = text.split("```json")[1].split("```")[0].strip()
    elif "```" in text:
        text = text.split("```")[1].split("```")[0].strip()

    data = json.loads(text)

    plan = TurnPlan(creature_id=creature.creature_id)
    reasoning = data.get("reasoning", "")

    # Parse movement
    move_to = data.get("move_to")
    if move_to and isinstance(move_to, dict):
        dest = HexCoord(q=move_to["q"], r=move_to["r"])
        if dest != creature.position:
            plan = plan.add(MoveAction(
                path=[dest],  # simplified; real pathfinding via hex adapter
                reasoning=f"Move: {reasoning}",
            ))

    # Parse main action
    action_type = data.get("action", "end_turn")
    match action_type:
        case "attack":
            plan = plan.add(AttackAction(
                attack_name=data.get("attack_name", creature.stat_block.attacks[0].name if creature.stat_block.attacks else "unarmed"),
                target_id=data.get("target_id", ""),
                reasoning=reasoning,
            ))
        case "cast_spell":
            plan = plan.add(CastSpellAction(
                spell_name=data.get("spell_name", ""),
                spell_level=data.get("spell_level", 0),
                target_id=data.get("target_id"),
                target_hex=HexCoord(**data["target_hex"]) if data.get("target_hex") else None,
                reasoning=reasoning,
            ))
        case "dash":
            plan = plan.add(DashAction(reasoning=reasoning))
        case "dodge":
            plan = plan.add(DodgeAction(reasoning=reasoning))
        case "disengage":
            plan = plan.add(DisengageAction(reasoning=reasoning))
        case "end_turn":
            plan = plan.add(EndTurnAction(reasoning=reasoning))
        case _:
            plan = plan.add(EndTurnAction(reasoning=f"Unknown action '{action_type}': {reasoning}"))

    return plan


# ---------------------------------------------------------------------------
# LLM decision engine
# ---------------------------------------------------------------------------

class LLMDecisionEngine(CombatAIEngine):
    """
    Decision engine that queries a local Ollama LLM for combat decisions.
    Used for TACTICAL and GENIUS intelligence tiers.
    """

    def __init__(
        self,
        tier: IntelligenceTier = IntelligenceTier.TACTICAL,
        profile: Optional[AIProfile] = None,
        ollama_config: Optional[OllamaConfig] = None,
        fallback_engine: Optional[CombatAIEngine] = None,
    ):
        self._tier = tier
        self._profile = profile
        self._config = ollama_config or OllamaConfig()
        self._fallback = fallback_engine

    def engine_name(self) -> str:
        return f"llm_engine({self._tier.value}, model={self._config.model})"

    def decide(
        self,
        creature: CreatureState,
        perception: PerceptionSnapshot,
        standing_orders: list[StandingOrder],
        legal_actions: list[str] | None = None,
    ) -> TurnPlan:
        prompt = build_prompt(creature, perception, standing_orders, self._profile)

        try:
            raw_response = self._call_ollama(prompt)
            plan = parse_llm_response(raw_response, creature)
            logger.info(
                "%s decided via LLM: %d actions",
                creature.creature_id,
                len(plan.actions),
            )
            return plan

        except Exception as e:
            logger.warning(
                "LLM decision failed for %s: %s. Falling back to rules.",
                creature.creature_id,
                str(e),
            )
            if self._fallback:
                return self._fallback.decide(creature, perception, standing_orders, legal_actions)

            # Last resort: end turn
            return TurnPlan(
                creature_id=creature.creature_id,
                actions=[EndTurnAction(reasoning=f"LLM failed: {e}")],
            )

    def _call_ollama(self, prompt: str) -> str:
        """
        Call the local Ollama instance.
        Import is deferred so the module works even if ollama isn't installed.
        """
        try:
            import ollama as ollama_lib
        except ImportError:
            raise RuntimeError(
                "ollama package not installed. Install with: pip install ollama"
            )

        client = ollama_lib.Client(host=self._config.host)
        response = client.chat(
            model=self._config.model,
            messages=[
                {"role": "system", "content": "You are a D&D 5e combat AI. Respond ONLY with valid JSON."},
                {"role": "user", "content": prompt},
            ],
            options={
                "temperature": self._config.temperature,
                "num_predict": 300,
            },
        )

        return response["message"]["content"]


# ---------------------------------------------------------------------------
# Formatting helpers (for prompt building)
# ---------------------------------------------------------------------------

def _format_spell_slots(creature: CreatureState) -> str:
    if not creature.spell_slots.has_any_slots():
        return "none"
    parts = []
    for level in sorted(creature.spell_slots.slots.keys()):
        if level > 0 and creature.spell_slots.slots[level] > 0:
            parts.append(f"L{level}: {creature.spell_slots.slots[level]}")
    return ", ".join(parts) if parts else "none"


def _format_attacks(creature: CreatureState) -> str:
    if not creature.stat_block.attacks:
        return "  None"
    lines = []
    for atk in creature.stat_block.attacks:
        range_str = f"reach {atk.reach}" if atk.range_long is None else f"range {atk.range_short}/{atk.range_long}"
        lines.append(f"  - {atk.name}: +{atk.attack_bonus} to hit, {range_str}, {atk.damage_dice} {atk.damage_type.value}")
    return "\n".join(lines)


def _format_creatures(creatures: list[PerceivedCreature]) -> str:
    lines = []
    for c in creatures:
        cond = ", ".join(cd.value for cd in c.visible_conditions)
        conc = " [CONCENTRATING]" if c.is_concentrating else ""
        lines.append(
            f"  - {c.name} ({c.creature_id}): {c.hp_status}, "
            f"dist={c.distance} hexes, at ({c.position.q},{c.position.r})"
            f"{conc}{', conditions: ' + cond if cond else ''}"
        )
    return "\n".join(lines)


def _format_map(hexes: list[PerceivedHex], my_pos: HexCoord) -> str:
    """Compact text representation of visible hexes."""
    if not hexes:
        return "  (no map data available)"

    # Build a simple text grid centered on the perceiver
    lines = []
    hex_set = {(h.coord.q, h.coord.r): h for h in hexes}

    # Find bounds
    qs = [h.coord.q for h in hexes]
    rs = [h.coord.r for h in hexes]
    min_q, max_q = min(qs), max(qs)
    min_r, max_r = min(rs), max(rs)

    terrain_chars = {
        "open": ".", "difficult": "~", "wall": "#", "water": "w",
        "pit": "v", "elevated": "^", "cover_half": "/", "cover_three_quarter": "|",
        "cover_full": "#",
    }

    for r in range(min_r, max_r + 1):
        row = ""
        for q in range(min_q, max_q + 1):
            h = hex_set.get((q, r))
            if h is None:
                row += " "
            elif q == my_pos.q and r == my_pos.r:
                row += "@"
            elif h.occupant_id:
                row += "X"
            else:
                row += terrain_chars.get(h.terrain.value, "?")
        lines.append(f"  {row}")

    return "\n".join(lines)
