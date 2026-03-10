"""
Rule-based combat AI decision engine.

Handles MINDLESS through CUNNING intelligence tiers using scored-priority
heuristics. Each tier adds more sophisticated evaluation on top of the previous.
"""

from __future__ import annotations

import random
from typing import Optional

from models.action import (
    AttackAction,
    CombatAction,
    DashAction,
    DisengageAction,
    DodgeAction,
    EndTurnAction,
    MoveAction,
    TurnPlan,
)
from models.creature import CreatureState, HexCoord
from models.orders import OrderDirective, StandingOrder
from models.perception import PerceivedCreature, PerceptionSnapshot
from ai.base import CombatAIEngine
from ai.intelligence import AIProfile, IntelligenceTier


# ---------------------------------------------------------------------------
# Scored action candidate
# ---------------------------------------------------------------------------

class _ScoredAction:
    """Internal: an action candidate with a priority score."""

    def __init__(self, action: CombatAction, score: float, label: str = ""):
        self.action = action
        self.score = score
        self.label = label

    def __repr__(self) -> str:
        return f"_ScoredAction({self.label}, score={self.score:.2f})"


# ---------------------------------------------------------------------------
# Rule-based engine
# ---------------------------------------------------------------------------

class RuleBasedDecisionEngine(CombatAIEngine):
    """
    Deterministic-ish decision engine using heuristic scoring.

    Evaluates all legal actions, scores them with tier-appropriate heuristics,
    and picks the highest-scoring action (with optional noise for variety).
    """

    def __init__(
        self,
        tier: IntelligenceTier = IntelligenceTier.LOW,
        profile: Optional[AIProfile] = None,
        noise_factor: float = 0.15,
    ):
        self._tier = tier
        self._profile = profile
        self._noise = noise_factor

    def engine_name(self) -> str:
        return f"rule_engine({self._tier.value})"

    def decide(
        self,
        creature: CreatureState,
        perception: PerceptionSnapshot,
        standing_orders: list[StandingOrder],
        legal_actions: list[str] | None = None,
    ) -> TurnPlan:
        plan = TurnPlan(creature_id=creature.creature_id)

        # 1. Check standing orders first — if any trigger, they override AI
        order_action = self._check_orders(creature, perception, standing_orders)
        if order_action is not None:
            plan = plan.add(order_action)
            return plan

        # 2. Build and score action candidates
        candidates = self._generate_candidates(creature, perception)

        if not candidates:
            return plan.add(EndTurnAction(reasoning="No viable actions available"))

        # 3. Apply tier-appropriate scoring
        self._score_candidates(candidates, creature, perception)

        # 4. Add noise for non-mindless tiers
        if self._tier != IntelligenceTier.MINDLESS and self._noise > 0:
            for c in candidates:
                c.score += random.uniform(-self._noise, self._noise)

        # 5. Sort by score descending, pick top
        candidates.sort(key=lambda c: c.score, reverse=True)

        # Build turn plan: try to include movement + main action
        move_candidate = next((c for c in candidates if isinstance(c.action, MoveAction)), None)
        main_candidate = next((c for c in candidates if not isinstance(c.action, MoveAction)), None)

        if move_candidate and move_candidate.score > 0:
            plan = plan.add(move_candidate.action)

        if main_candidate:
            plan = plan.add(main_candidate.action)
        else:
            plan = plan.add(EndTurnAction(reasoning="No beneficial main action found"))

        return plan

    # -------------------------------------------------------------------
    # Standing order evaluation
    # -------------------------------------------------------------------

    def _check_orders(
        self,
        creature: CreatureState,
        perception: PerceptionSnapshot,
        orders: list[StandingOrder],
    ) -> Optional[CombatAction]:
        """Check if any standing order triggers and return the directive action."""
        nearest = perception.nearest_enemy(creature.team)
        nearest_dist = nearest.distance if nearest else 999

        for order in sorted(orders, key=lambda o: o.priority.value, reverse=True):
            triggered = order.is_triggered(
                hp_fraction=creature.hp_fraction,
                round_number=perception.current_round,
                allies_alive=len(perception.visible_allies(creature.team)),
                nearest_enemy_distance=nearest_dist,
                ally_just_died=False,  # TODO: track from recent events
            )
            if not triggered:
                continue

            return self._order_to_action(order, creature, perception)

        return None

    def _order_to_action(
        self,
        order: StandingOrder,
        creature: CreatureState,
        perception: PerceptionSnapshot,
    ) -> CombatAction:
        """Convert a standing order directive into a concrete action."""
        match order.directive:
            case OrderDirective.FLEE | OrderDirective.RETREAT:
                # Move away from nearest enemy
                nearest = perception.nearest_enemy(creature.team)
                if nearest:
                    away = self._hex_away_from(creature.position, nearest.position,
                                               creature.movement_remaining)
                    return MoveAction(
                        path=[away],
                        reasoning=f"Order: {order.directive.value} (trigger: {order.trigger.trigger_type.value})",
                    )
                return DashAction(reasoning=f"Order: {order.directive.value}")

            case OrderDirective.HOLD_POSITION:
                # Attack from current position if possible
                nearest = perception.nearest_enemy(creature.team)
                if nearest and self._can_attack(creature, nearest):
                    attack = self._best_attack(creature, nearest)
                    if attack:
                        return attack
                return DodgeAction(reasoning="Order: hold position, no targets in range")

            case OrderDirective.FOCUS_TARGET:
                target = self._find_creature(order.target_creature_id, perception)
                if target:
                    return self._attack_or_approach(creature, target, perception)
                return EndTurnAction(reasoning="Order: focus target not visible")

            case OrderDirective.FOCUS_WEAKEST:
                weakest = perception.weakest_enemy(creature.team)
                if weakest:
                    return self._attack_or_approach(creature, weakest, perception)
                return EndTurnAction(reasoning="Order: no enemies visible")

            case OrderDirective.FOCUS_NEAREST:
                nearest = perception.nearest_enemy(creature.team)
                if nearest:
                    return self._attack_or_approach(creature, nearest, perception)
                return EndTurnAction(reasoning="Order: no enemies visible")

            case OrderDirective.AGGRESSIVE_ADVANCE:
                nearest = perception.nearest_enemy(creature.team)
                if nearest:
                    return self._move_toward(creature.position, nearest.position,
                                             creature.movement_remaining,
                                             "Order: aggressive advance")
                return DashAction(reasoning="Order: advance, searching for enemies")

            case _:
                return EndTurnAction(reasoning=f"Order: {order.directive.value} (unhandled)")

    # -------------------------------------------------------------------
    # Candidate generation
    # -------------------------------------------------------------------

    def _generate_candidates(
        self,
        creature: CreatureState,
        perception: PerceptionSnapshot,
    ) -> list[_ScoredAction]:
        """Generate all legal action candidates."""
        candidates: list[_ScoredAction] = []
        enemies = perception.visible_enemies(creature.team)

        # Melee/ranged attacks against visible enemies
        for enemy in enemies:
            for attack_def in creature.stat_block.attacks:
                dist = creature.position.distance_to(enemy.position)
                in_reach = dist <= attack_def.reach
                in_range = (attack_def.range_long is not None and
                            dist <= attack_def.range_long)
                if in_reach or in_range:
                    candidates.append(_ScoredAction(
                        AttackAction(
                            attack_name=attack_def.name,
                            target_id=enemy.creature_id,
                            reasoning=f"Attack {enemy.name} with {attack_def.name}",
                        ),
                        score=0.0,
                        label=f"attack_{enemy.creature_id}_{attack_def.name}",
                    ))

        # Move toward nearest enemy if can't attack
        if enemies and not any(isinstance(c.action, AttackAction) for c in candidates):
            nearest = min(enemies, key=lambda e: e.distance)
            approach = self._move_toward(creature.position, nearest.position,
                                         creature.stat_block.speed,
                                         f"Approach {nearest.name}")
            candidates.append(_ScoredAction(approach, score=0.0, label="move_approach"))

        # Move + attack combo: if we could reach an enemy by moving first
        for enemy in enemies:
            dist = creature.position.distance_to(enemy.position)
            for attack_def in creature.stat_block.attacks:
                needed = dist - attack_def.reach
                if 0 < needed <= creature.stat_block.speed:
                    candidates.append(_ScoredAction(
                        MoveAction(
                            path=[enemy.position],  # simplified; pathfinding TODO
                            reasoning=f"Move into range of {enemy.name}",
                        ),
                        score=0.0,
                        label=f"move_to_{enemy.creature_id}",
                    ))

        # Dodge (defensive)
        candidates.append(_ScoredAction(
            DodgeAction(reasoning="Take defensive stance"),
            score=0.0,
            label="dodge",
        ))

        # Dash (if no enemies in range and want to close distance)
        if enemies and not any(isinstance(c.action, AttackAction) for c in candidates):
            candidates.append(_ScoredAction(
                DashAction(reasoning="Dash to close distance"),
                score=0.0,
                label="dash",
            ))

        # Survival options: always generate flee/disengage when bestial+
        # and HP is low, even if attack is available
        if (self._tier.value in ("bestial", "low", "cunning") and
                creature.hp_fraction < 0.30):
            # Disengage to safely retreat
            candidates.append(_ScoredAction(
                DisengageAction(reasoning="Disengage to flee"),
                score=0.0,
                label="disengage_flee",
            ))
            # Dash away
            candidates.append(_ScoredAction(
                DashAction(reasoning="Dash to escape"),
                score=0.0,
                label="dash_flee",
            ))

        return candidates

    # -------------------------------------------------------------------
    # Tier-based scoring
    # -------------------------------------------------------------------

    def _score_candidates(
        self,
        candidates: list[_ScoredAction],
        creature: CreatureState,
        perception: PerceptionSnapshot,
    ) -> None:
        """Score each candidate using tier-appropriate heuristics."""
        for c in candidates:
            c.score = self._base_score(c.action, creature, perception)

            if self._tier.value in ("bestial", "low", "cunning"):
                c.score += self._survival_score(c.action, creature, perception)

            if self._tier.value in ("low", "cunning"):
                c.score += self._tactical_score(c.action, creature, perception)

            if self._tier == IntelligenceTier.CUNNING:
                c.score += self._cunning_score(c.action, creature, perception)

            # Apply profile preference bonuses
            if self._profile:
                c.score += self._profile_score(c.action, creature, perception)

    def _base_score(
        self, action: CombatAction, creature: CreatureState,
        perception: PerceptionSnapshot,
    ) -> float:
        """Mindless-level scoring: attack nearest, that's it."""
        if isinstance(action, AttackAction):
            target = self._find_creature(action.target_id, perception)
            if target:
                # Prefer closer targets
                return 5.0 - (target.distance * 0.5)
            return 3.0

        if isinstance(action, MoveAction):
            nearest = perception.nearest_enemy(creature.team)
            if nearest and action.path:
                dest = action.path[-1]
                new_dist = dest.distance_to(nearest.position)
                return 2.0 - (new_dist * 0.3)
            return 1.0

        if isinstance(action, DashAction):
            return 1.0

        if isinstance(action, DodgeAction):
            return 0.5

        return 0.0

    def _survival_score(
        self, action: CombatAction, creature: CreatureState,
        perception: PerceptionSnapshot,
    ) -> float:
        """Bestial+ scoring: self-preservation instinct."""
        bonus = 0.0
        flee_threshold = 0.20
        if self._profile and self._profile.flee_hp_percent > 0:
            flee_threshold = self._profile.flee_hp_percent / 100.0

        if creature.hp_fraction <= flee_threshold:
            # Strongly prefer flee/disengage/dash when low HP
            if isinstance(action, (DisengageAction, DashAction)):
                bonus += 5.0
            elif isinstance(action, MoveAction):
                # Check if moving away from enemies
                nearest = perception.nearest_enemy(creature.team)
                if nearest and action.path:
                    dest = action.path[-1]
                    if dest.distance_to(nearest.position) > creature.position.distance_to(nearest.position):
                        bonus += 3.0
            elif isinstance(action, AttackAction):
                bonus -= 2.0  # discourage attacking when should flee

        if isinstance(action, DodgeAction) and creature.hp_fraction < 0.5:
            bonus += 1.0

        return bonus

    def _tactical_score(
        self, action: CombatAction, creature: CreatureState,
        perception: PerceptionSnapshot,
    ) -> float:
        """Low+ scoring: target selection heuristics."""
        bonus = 0.0

        if isinstance(action, AttackAction):
            target = self._find_creature(action.target_id, perception)
            if target:
                # Prefer wounded targets
                hp_bonuses = {"near-death": 3.0, "bloody": 2.0, "wounded": 1.0, "healthy": 0.0}
                bonus += hp_bonuses.get(target.hp_status, 0.0)

                # Prefer concentrating targets (break their spell)
                if target.is_concentrating:
                    bonus += 1.5

        return bonus

    def _cunning_score(
        self, action: CombatAction, creature: CreatureState,
        perception: PerceptionSnapshot,
    ) -> float:
        """Cunning-level scoring: coordination and cover awareness."""
        bonus = 0.0

        if isinstance(action, AttackAction):
            target = self._find_creature(action.target_id, perception)
            if target:
                # Avoid double-targeting: slightly prefer targets not already
                # engaged by allies (simplified: prefer isolated enemies)
                allies_near_target = sum(
                    1 for a in perception.visible_allies(creature.team)
                    if a.position.distance_to(target.position) <= 2
                )
                if allies_near_target == 0:
                    bonus += 0.5  # unengaged target — flank opportunity
                elif allies_near_target >= 2:
                    bonus -= 0.5  # already being focused, spread damage

        if isinstance(action, DodgeAction):
            # Cunning creatures dodge more readily when outnumbered
            enemies = perception.visible_enemies(creature.team)
            allies = perception.visible_allies(creature.team)
            if len(enemies) > len(allies) + 1:
                bonus += 1.0

        return bonus

    def _profile_score(
        self, action: CombatAction, creature: CreatureState,
        perception: PerceptionSnapshot,
    ) -> float:
        """Apply bonuses from the creature's AI profile."""
        if not self._profile:
            return 0.0

        bonus = 0.0

        if isinstance(action, AttackAction):
            target = self._find_creature(action.target_id, perception)
            if target and "casters" in self._profile.preferred_targets:
                if target.is_concentrating:
                    bonus += 2.0
            if target and "wounded" in self._profile.preferred_targets:
                if target.hp_status in ("bloody", "near-death"):
                    bonus += 1.5

        return bonus

    # -------------------------------------------------------------------
    # Helpers
    # -------------------------------------------------------------------

    def _find_creature(
        self, creature_id: Optional[str], perception: PerceptionSnapshot,
    ) -> Optional[PerceivedCreature]:
        """Find a perceived creature by ID."""
        if not creature_id:
            return None
        return next((c for c in perception.perceived_creatures
                      if c.creature_id == creature_id), None)

    def _can_attack(self, creature: CreatureState, target: PerceivedCreature) -> bool:
        """Check if creature has any attack that reaches the target."""
        dist = creature.position.distance_to(target.position)
        return any(
            dist <= atk.reach or (atk.range_long is not None and dist <= atk.range_long)
            for atk in creature.stat_block.attacks
        )

    def _best_attack(
        self, creature: CreatureState, target: PerceivedCreature,
    ) -> Optional[AttackAction]:
        """Pick the best available attack against a target."""
        dist = creature.position.distance_to(target.position)
        for atk in creature.stat_block.attacks:
            if dist <= atk.reach or (atk.range_long is not None and dist <= atk.range_long):
                return AttackAction(
                    attack_name=atk.name,
                    target_id=target.creature_id,
                    reasoning=f"Best available attack on {target.name}",
                )
        return None

    def _attack_or_approach(
        self, creature: CreatureState, target: PerceivedCreature,
        perception: PerceptionSnapshot,
    ) -> CombatAction:
        """Attack a target if in range, otherwise move toward it."""
        if self._can_attack(creature, target):
            attack = self._best_attack(creature, target)
            if attack:
                return attack
        return self._move_toward(
            creature.position, target.position,
            creature.stat_block.speed,
            f"Approaching {target.name}",
        )

    @staticmethod
    def _move_toward(
        from_hex: HexCoord, to_hex: HexCoord, budget: int, reason: str,
    ) -> MoveAction:
        """
        Simplified move toward a target hex within movement budget.
        Real pathfinding will be provided by the hex map adapter.
        """
        # Simple: step directly toward target (no obstacle avoidance)
        path: list[HexCoord] = []
        current = from_hex
        for _ in range(budget):
            if current == to_hex:
                break
            best = current
            best_dist = current.distance_to(to_hex)
            for dq, dr in [(1, 0), (-1, 0), (0, 1), (0, -1), (1, -1), (-1, 1)]:
                neighbor = HexCoord(q=current.q + dq, r=current.r + dr)
                d = neighbor.distance_to(to_hex)
                if d < best_dist:
                    best = neighbor
                    best_dist = d
            if best == current:
                break
            path.append(best)
            current = best

        if not path:
            path = [from_hex]  # stay put

        return MoveAction(path=path, reasoning=reason)

    @staticmethod
    def _hex_away_from(
        from_hex: HexCoord, threat_hex: HexCoord, budget: int,
    ) -> HexCoord:
        """Find a hex that moves away from a threat within movement budget."""
        current = from_hex
        for _ in range(budget):
            best = current
            best_dist = current.distance_to(threat_hex)
            for dq, dr in [(1, 0), (-1, 0), (0, 1), (0, -1), (1, -1), (-1, 1)]:
                neighbor = HexCoord(q=current.q + dq, r=current.r + dr)
                d = neighbor.distance_to(threat_hex)
                if d > best_dist:
                    best = neighbor
                    best_dist = d
            if best == current:
                break
            current = best
        return current
