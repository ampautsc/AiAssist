"""
Awareness and memory system.

Tracks what creatures know beyond direct line-of-sight: sounds,
ally reports, and remembered positions. Intelligence tier affects
memory duration.
"""

from __future__ import annotations

from dataclasses import dataclass, field

from config import PerceptionConfig
from models.creature import HexCoord
from models.perception import AudibleEvent, PerceivedCreature


# ---------------------------------------------------------------------------
# Memory entry
# ---------------------------------------------------------------------------

@dataclass
class MemoryEntry:
    """A remembered creature sighting."""
    creature_id: str
    name: str
    team: str
    last_known_position: HexCoord
    last_known_hp_status: str
    round_observed: int
    source: str = "vision"  # "vision", "sound", "ally_report"


# ---------------------------------------------------------------------------
# Creature awareness tracker
# ---------------------------------------------------------------------------

class AwarenessTracker:
    """
    Maintains per-creature awareness state across rounds.
    Tracks remembered positions, sounds, and ally-shared intel.
    """

    def __init__(self, config: PerceptionConfig | None = None):
        self._config = config or PerceptionConfig()
        # creature_id -> {target_creature_id -> MemoryEntry}
        self._memory: dict[str, dict[str, MemoryEntry]] = {}
        # creature_id -> list of audible events
        self._sounds: dict[str, list[AudibleEvent]] = {}

    def record_sighting(
        self,
        observer_id: str,
        target: PerceivedCreature,
        round_number: int,
    ) -> None:
        """Record that observer saw a target this round."""
        if observer_id not in self._memory:
            self._memory[observer_id] = {}

        self._memory[observer_id][target.creature_id] = MemoryEntry(
            creature_id=target.creature_id,
            name=target.name,
            team=target.team,
            last_known_position=target.position,
            last_known_hp_status=target.hp_status,
            round_observed=round_number,
            source="vision",
        )

    def record_sound(
        self,
        listener_id: str,
        event: AudibleEvent,
    ) -> None:
        """Record an audible event for a creature."""
        if listener_id not in self._sounds:
            self._sounds[listener_id] = []
        self._sounds[listener_id].append(event)

    def share_intel(
        self,
        from_id: str,
        to_id: str,
        round_number: int,
    ) -> None:
        """
        Share one creature's knowledge with an ally.
        Simulates verbal communication during combat.
        """
        if from_id not in self._memory:
            return
        if to_id not in self._memory:
            self._memory[to_id] = {}

        for target_id, entry in self._memory[from_id].items():
            existing = self._memory[to_id].get(target_id)
            # Only update if the shared info is newer
            if existing is None or entry.round_observed > existing.round_observed:
                self._memory[to_id][target_id] = MemoryEntry(
                    creature_id=entry.creature_id,
                    name=entry.name,
                    team=entry.team,
                    last_known_position=entry.last_known_position,
                    last_known_hp_status=entry.last_known_hp_status,
                    round_observed=entry.round_observed,
                    source="ally_report",
                )

    def get_remembered_creatures(
        self,
        observer_id: str,
        current_round: int,
        tier: str,
    ) -> list[PerceivedCreature]:
        """
        Get remembered (but not currently visible) creatures.
        Memory duration depends on the creature's intelligence tier.
        """
        max_memory_rounds = self._config.memory_rounds_by_tier.get(tier, 2)
        entries = self._memory.get(observer_id, {})

        remembered: list[PerceivedCreature] = []
        for entry in entries.values():
            age = current_round - entry.round_observed
            if age <= max_memory_rounds and age > 0:  # age=0 means current (handled by vision)
                remembered.append(PerceivedCreature(
                    creature_id=entry.creature_id,
                    name=entry.name,
                    team=entry.team,
                    position=entry.last_known_position,
                    hp_status=entry.last_known_hp_status,
                    last_seen_round=entry.round_observed,
                    source=entry.source,
                ))

        return remembered

    def get_sounds(self, listener_id: str, current_round: int) -> list[AudibleEvent]:
        """Get recent audible events for a creature."""
        events = self._sounds.get(listener_id, [])
        # Only return sounds from the last 2 rounds
        return [e for e in events if current_round - e.round_number <= 2]

    def cleanup_round(self, current_round: int) -> None:
        """Remove very old memories and sounds to prevent unbounded growth."""
        # Remove memories older than the maximum possible retention (genius = 99)
        for observer_id in list(self._memory.keys()):
            entries = self._memory[observer_id]
            to_remove = [
                tid for tid, entry in entries.items()
                if current_round - entry.round_observed > 100
            ]
            for tid in to_remove:
                del entries[tid]

        # Remove old sounds
        for listener_id in list(self._sounds.keys()):
            self._sounds[listener_id] = [
                e for e in self._sounds[listener_id]
                if current_round - e.round_number <= 3
            ]
