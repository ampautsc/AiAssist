"""
Tests for the perception / fog-of-war system.

Validates:
- Line-of-sight computation (hex ray casting)
- Walls blocking vision
- Darkvision, blindsight
- Visible hex computation
- PerceptionSnapshot construction
"""

import pytest
from factories import (
    make_arena_with_wall,
    make_perception,
    make_small_arena,
    make_warrior,
    make_zombie,
)

from models.creature import HexCoord, Senses
from models.perception import LightLevel, PerceivedHex, TerrainType
from perception.vision import compute_visible_hexes, has_line_of_sight, hex_line
from perception.awareness import AwarenessTracker, MemoryEntry
from perception.map_view import MapViewBuilder


# ---------------------------------------------------------------------------
# Hex line tests
# ---------------------------------------------------------------------------

class TestHexLine:
    """Test hex-grid line drawing."""

    def test_same_point(self):
        a = HexCoord(q=0, r=0)
        line = hex_line(a, a)
        assert len(line) == 1
        assert line[0] == a

    def test_adjacent(self):
        a = HexCoord(q=0, r=0)
        b = HexCoord(q=1, r=0)
        line = hex_line(a, b)
        assert len(line) == 2
        assert line[0] == a
        assert line[-1] == b

    def test_longer_line_has_correct_length(self):
        a = HexCoord(q=0, r=0)
        b = HexCoord(q=5, r=0)
        line = hex_line(a, b)
        assert len(line) == 6  # distance 5 + 1 for start

    def test_line_is_contiguous(self):
        """Every consecutive pair in the line should be adjacent (distance 1)."""
        a = HexCoord(q=-3, r=2)
        b = HexCoord(q=3, r=-1)
        line = hex_line(a, b)
        for i in range(len(line) - 1):
            assert line[i].distance_to(line[i + 1]) == 1, \
                f"Gap in line at index {i}: {line[i]} -> {line[i+1]}"


# ---------------------------------------------------------------------------
# Line of sight tests
# ---------------------------------------------------------------------------

class TestLineOfSight:
    """Test LOS blocking by walls."""

    def test_clear_los_on_open_field(self):
        arena = make_small_arena(5)
        a = HexCoord(q=-3, r=0)
        b = HexCoord(q=3, r=0)
        assert has_line_of_sight(a, b, arena.all_hexes())

    def test_wall_blocks_los(self):
        arena = make_arena_with_wall()
        # Wall at q=0, the observer is at q=-3 and target at q=3
        a = HexCoord(q=-3, r=0)
        b = HexCoord(q=3, r=0)
        assert not has_line_of_sight(a, b, arena.all_hexes()), \
            "Wall should block line of sight"

    def test_los_not_blocked_from_same_side(self):
        arena = make_arena_with_wall()
        # Both on the left side of the wall
        a = HexCoord(q=-3, r=0)
        b = HexCoord(q=-1, r=0)
        assert has_line_of_sight(a, b, arena.all_hexes())

    def test_adjacent_always_visible(self):
        arena = make_small_arena(3)
        a = HexCoord(q=0, r=0)
        b = HexCoord(q=1, r=0)
        assert has_line_of_sight(a, b, arena.all_hexes())


# ---------------------------------------------------------------------------
# Visible hex computation
# ---------------------------------------------------------------------------

class TestVisibleHexes:
    """Test compute_visible_hexes with various sensory configurations."""

    def test_open_field_sees_all_in_range(self):
        arena = make_small_arena(3)  # radius-3 arena
        senses = Senses(passive_perception=10)
        origin = HexCoord(q=0, r=0)

        visible = compute_visible_hexes(origin, senses, arena.all_hexes(), base_vision_range=12)
        # Should see all hexes in a radius-3 arena
        assert len(visible) == len(arena.all_hexes())

    def test_limited_vision_range(self):
        arena = make_small_arena(10)
        senses = Senses(passive_perception=10)
        origin = HexCoord(q=0, r=0)

        visible = compute_visible_hexes(origin, senses, arena.all_hexes(), base_vision_range=3)
        # Should only see hexes within 3 hexes
        for h in visible:
            assert origin.distance_to(h.coord) <= 3

    def test_wall_blocks_hexes_behind_it(self):
        arena = make_arena_with_wall()
        senses = Senses(passive_perception=10)
        origin = HexCoord(q=-3, r=0)

        visible = compute_visible_hexes(origin, senses, arena.all_hexes(), base_vision_range=12)
        visible_coords = {(h.coord.q, h.coord.r) for h in visible}

        # Should NOT see hexes directly behind the wall (q > 0, r=0)
        assert (3, 0) not in visible_coords, "Should not see through wall"

    def test_blindsight_ignores_walls(self):
        arena = make_arena_with_wall()
        senses = Senses(blindsight=4, passive_perception=10)
        origin = HexCoord(q=-1, r=0)  # 1 hex from wall

        visible = compute_visible_hexes(origin, senses, arena.all_hexes(), base_vision_range=12)
        visible_coords = {(h.coord.q, h.coord.r) for h in visible}

        # Blindsight 4 should "see" through the wall within range
        assert (1, 0) in visible_coords, "Blindsight should see through walls"

    def test_darkness_blocks_without_darkvision(self):
        from hex_adapter import SimpleHexMap
        arena = SimpleHexMap()
        for q in range(-3, 4):
            for r in range(max(-3, -q - 3), min(3, -q + 3) + 1):
                arena.add_hex(q, r, light=LightLevel.DARK)

        senses = Senses(darkvision=0, passive_perception=10)
        origin = HexCoord(q=0, r=0)

        visible = compute_visible_hexes(origin, senses, arena.all_hexes(), base_vision_range=12)
        # Origin itself might be included but distant dark hexes should not
        assert len(visible) < len(arena.all_hexes())


# ---------------------------------------------------------------------------
# Awareness tracker tests
# ---------------------------------------------------------------------------

class TestAwarenessTracker:
    """Test memory and intel sharing between creatures."""

    def test_remember_sighted_creature(self):
        from models.perception import PerceivedCreature
        tracker = AwarenessTracker()

        pc = PerceivedCreature(
            creature_id="enemy_1", name="Orc", team="enemy",
            position=HexCoord(q=5, r=0), hp_status="healthy",
            distance=5, last_seen_round=1,
        )
        tracker.record_sighting("wolf_1", pc, round_number=1)

        # On round 2, the creature is "remembered" but not currently visible
        remembered = tracker.get_remembered_creatures("wolf_1", current_round=2, tier="bestial")
        assert len(remembered) == 1
        assert remembered[0].creature_id == "enemy_1"
        assert remembered[0].source == "vision"

    def test_memory_expires_by_tier(self):
        from models.perception import PerceivedCreature
        tracker = AwarenessTracker()

        pc = PerceivedCreature(
            creature_id="enemy_1", name="Orc", team="enemy",
            position=HexCoord(q=5, r=0), hp_status="healthy",
            distance=5, last_seen_round=1,
        )
        tracker.record_sighting("zombie_1", pc, round_number=1)

        # Mindless tier: memory = 0 rounds → should NOT remember
        remembered = tracker.get_remembered_creatures("zombie_1", current_round=2, tier="mindless")
        assert len(remembered) == 0, "Mindless creatures should have no memory"

    def test_ally_intel_sharing(self):
        from models.perception import PerceivedCreature
        tracker = AwarenessTracker()

        pc = PerceivedCreature(
            creature_id="enemy_1", name="Thief", team="enemy",
            position=HexCoord(q=8, r=0), hp_status="healthy",
            distance=8, last_seen_round=1,
        )
        tracker.record_sighting("guard_1", pc, round_number=1)

        # Share intel from guard_1 to guard_2
        tracker.share_intel("guard_1", "guard_2", round_number=1)

        remembered = tracker.get_remembered_creatures("guard_2", current_round=2, tier="cunning")
        assert len(remembered) == 1
        assert remembered[0].source == "ally_report"


# ---------------------------------------------------------------------------
# MapViewBuilder tests
# ---------------------------------------------------------------------------

class TestMapViewBuilder:
    """Test the combined perception snapshot builder."""

    def test_builds_snapshot_with_visible_creatures(self):
        tracker = AwarenessTracker()
        builder = MapViewBuilder(awareness=tracker)

        zombie = make_zombie(position=HexCoord(q=0, r=0))
        warrior = make_warrior(position=HexCoord(q=2, r=0))
        arena = make_small_arena(5)

        snapshot = builder.build_perception(
            creature=zombie,
            all_creatures=[zombie, warrior],
            all_hexes=arena.all_hexes(),
            current_round=1,
        )

        assert snapshot.perceiver_id == zombie.creature_id
        assert len(snapshot.perceived_creatures) == 1
        assert snapshot.perceived_creatures[0].creature_id == "warrior_1"

    def test_dead_creatures_not_perceived(self):
        tracker = AwarenessTracker()
        builder = MapViewBuilder(awareness=tracker)

        zombie = make_zombie(position=HexCoord(q=0, r=0))
        dead_warrior = make_warrior(position=HexCoord(q=1, r=0))
        dead_warrior.current_hp = 0  # dead
        arena = make_small_arena(3)

        snapshot = builder.build_perception(
            creature=zombie,
            all_creatures=[zombie, dead_warrior],
            all_hexes=arena.all_hexes(),
            current_round=1,
        )

        assert len(snapshot.perceived_creatures) == 0, "Dead creatures should not be perceived"
