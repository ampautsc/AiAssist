"""
Map view builder.

Combines vision (line-of-sight), awareness (memory/sounds), and the
hex map adapter to produce a PerceptionSnapshot — the "partial map"
sent to each creature's AI engine on its turn.
"""

from __future__ import annotations

from config import CombatAISettings, DEFAULT_SETTINGS
from models.creature import CreatureState, HexCoord
from models.perception import (
    PerceivedCreature,
    PerceivedHex,
    PerceptionSnapshot,
)
from perception.awareness import AwarenessTracker
from perception.vision import compute_visible_hexes


class MapViewBuilder:
    """
    Builds a PerceptionSnapshot for a creature.

    Combines:
    - Direct vision (hex line-of-sight from vision.py)
    - Memory (remembered positions from awareness.py)
    - Sounds (audible events from awareness.py)
    - Recent combat events (passed in by the combat manager)

    Requires a hex map adapter to provide terrain data.
    """

    def __init__(
        self,
        awareness: AwarenessTracker,
        settings: CombatAISettings | None = None,
    ):
        self._awareness = awareness
        self._settings = settings or DEFAULT_SETTINGS

    def build_perception(
        self,
        creature: CreatureState,
        all_creatures: list[CreatureState],
        all_hexes: dict[tuple[int, int], PerceivedHex],
        current_round: int,
        recent_events: list[str] | None = None,
        intelligence_tier: str = "low",
    ) -> PerceptionSnapshot:
        """
        Build the fog-of-war snapshot for one creature.

        Args:
            creature: The perceiving creature.
            all_creatures: All creatures currently in the encounter.
            all_hexes: The full hex map (will be filtered to visible hexes).
            current_round: Current combat round number.
            recent_events: Natural-language descriptions of recent combat events.
            intelligence_tier: The creature's tier (affects memory duration).

        Returns:
            PerceptionSnapshot with only the information this creature has.
        """
        # 1. Compute visible hexes via line-of-sight
        visible_hexes = compute_visible_hexes(
            origin=creature.position,
            senses=creature.stat_block.senses,
            all_hexes=all_hexes,
            base_vision_range=self._settings.perception.default_vision_range,
        )
        visible_coords = {(h.coord.q, h.coord.r) for h in visible_hexes}

        # 2. Determine which creatures are directly visible
        perceived: list[PerceivedCreature] = []
        for other in all_creatures:
            if other.creature_id == creature.creature_id:
                continue
            if not other.is_alive:
                continue

            pos_key = (other.position.q, other.position.r)
            if pos_key in visible_coords:
                dist = creature.position.distance_to(other.position)
                pc = PerceivedCreature(
                    creature_id=other.creature_id,
                    name=other.stat_block.name,
                    team=other.team,
                    position=other.position,
                    hp_status=other.hp_status,
                    visible_conditions=list(other.conditions),
                    is_concentrating=other.concentrating_on is not None,
                    distance=dist,
                    last_seen_round=current_round,
                    source="vision",
                )
                perceived.append(pc)

                # Record the sighting in the awareness tracker
                self._awareness.record_sighting(
                    creature.creature_id, pc, current_round
                )

        # 3. Add remembered creatures (not currently visible)
        remembered = self._awareness.get_remembered_creatures(
            creature.creature_id, current_round, intelligence_tier
        )
        visible_ids = {p.creature_id for p in perceived}
        for mem in remembered:
            if mem.creature_id not in visible_ids:
                perceived.append(mem)

        # 4. Get audible events
        sounds = self._awareness.get_sounds(creature.creature_id, current_round)

        # 5. Assemble snapshot
        return PerceptionSnapshot(
            perceiver_id=creature.creature_id,
            current_round=current_round,
            visible_hexes=visible_hexes,
            perceived_creatures=perceived,
            audible_events=sounds,
            recent_events=recent_events or [],
        )
