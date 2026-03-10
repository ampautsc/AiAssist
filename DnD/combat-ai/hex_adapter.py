"""
Hex map interface adapter.

Defines the interface this module expects from the external hex map library
(being built by a separate agent). This adapter decouples the combat AI
from the hex library's implementation details.

When the hex library is ready, implement HexMapAdapter by wrapping the
library's classes. Until then, SimpleHexMap provides a basic in-memory
implementation for testing.
"""

from __future__ import annotations

from abc import ABC, abstractmethod

from models.creature import HexCoord
from models.perception import LightLevel, PerceivedHex, TerrainType


# ---------------------------------------------------------------------------
# Abstract interface (what the combat AI expects)
# ---------------------------------------------------------------------------

class HexMapAdapter(ABC):
    """
    Interface that the combat AI module uses to interact with the hex map.
    Implement this by wrapping whatever hex library is available.
    """

    @abstractmethod
    def get_hex(self, q: int, r: int) -> PerceivedHex | None:
        """Get hex data at the given coordinate, or None if out of bounds."""
        ...

    @abstractmethod
    def line_of_sight(self, from_hex: HexCoord, to_hex: HexCoord) -> bool:
        """Check if there is clear line of sight between two hexes."""
        ...

    @abstractmethod
    def hexes_in_range(self, center: HexCoord, radius: int) -> list[PerceivedHex]:
        """Get all hexes within a given radius of the center."""
        ...

    @abstractmethod
    def pathfind(
        self, from_hex: HexCoord, to_hex: HexCoord, movement_budget: int,
    ) -> list[HexCoord]:
        """
        Find a path from one hex to another within a movement budget.
        Returns the path as an ordered list of hex coords (not including start).
        Returns empty list if no path exists.
        """
        ...

    @abstractmethod
    def neighbors(self, coord: HexCoord) -> list[PerceivedHex]:
        """Get the 6 neighboring hexes of the given coordinate."""
        ...

    @abstractmethod
    def all_hexes(self) -> dict[tuple[int, int], PerceivedHex]:
        """Get all hexes in the map as a dict keyed by (q, r)."""
        ...


# ---------------------------------------------------------------------------
# Simple in-memory implementation (for testing)
# ---------------------------------------------------------------------------

# The 6 axial directions for hex grids
HEX_DIRECTIONS = [
    (1, 0), (-1, 0), (0, 1), (0, -1), (1, -1), (-1, 1),
]


class SimpleHexMap(HexMapAdapter):
    """
    Basic in-memory hex map implementation for testing.
    Create a map, add hexes, and the combat AI can query it.
    """

    def __init__(self) -> None:
        self._hexes: dict[tuple[int, int], PerceivedHex] = {}

    def add_hex(
        self,
        q: int,
        r: int,
        terrain: TerrainType = TerrainType.OPEN,
        light: LightLevel = LightLevel.BRIGHT,
        elevation: int = 0,
    ) -> None:
        """Add a hex tile to the map."""
        self._hexes[(q, r)] = PerceivedHex(
            coord=HexCoord(q=q, r=r),
            terrain=terrain,
            light=light,
            elevation=elevation,
        )

    def create_arena(self, radius: int, terrain: TerrainType = TerrainType.OPEN) -> None:
        """Create a hexagonal arena of the given radius centered at (0,0)."""
        for q in range(-radius, radius + 1):
            for r in range(max(-radius, -q - radius), min(radius, -q + radius) + 1):
                self.add_hex(q, r, terrain)

    def set_wall(self, q: int, r: int) -> None:
        """Set a hex to be a wall (blocks LOS and movement)."""
        self.add_hex(q, r, terrain=TerrainType.WALL)

    def get_hex(self, q: int, r: int) -> PerceivedHex | None:
        return self._hexes.get((q, r))

    def line_of_sight(self, from_hex: HexCoord, to_hex: HexCoord) -> bool:
        from perception.vision import has_line_of_sight
        return has_line_of_sight(from_hex, to_hex, self._hexes)

    def hexes_in_range(self, center: HexCoord, radius: int) -> list[PerceivedHex]:
        results = []
        for (q, r), tile in self._hexes.items():
            if center.distance_to(HexCoord(q=q, r=r)) <= radius:
                results.append(tile)
        return results

    def pathfind(
        self, from_hex: HexCoord, to_hex: HexCoord, movement_budget: int,
    ) -> list[HexCoord]:
        """
        Simple BFS pathfinding. Walls are impassable.
        Returns path within movement budget (not including start).
        """
        if from_hex == to_hex:
            return []

        blocking = {TerrainType.WALL, TerrainType.COVER_FULL, TerrainType.PIT}
        visited: set[tuple[int, int]] = {(from_hex.q, from_hex.r)}
        queue: list[tuple[HexCoord, list[HexCoord]]] = [(from_hex, [])]

        while queue:
            current, path = queue.pop(0)

            if len(path) >= movement_budget:
                continue

            for dq, dr in HEX_DIRECTIONS:
                nq, nr = current.q + dq, current.r + dr
                if (nq, nr) in visited:
                    continue

                tile = self._hexes.get((nq, nr))
                if tile is None or tile.terrain in blocking:
                    continue

                visited.add((nq, nr))
                neighbor = HexCoord(q=nq, r=nr)
                new_path = [*path, neighbor]

                if neighbor == to_hex:
                    return new_path

                queue.append((neighbor, new_path))

        # No full path found; return partial path (closest approach)
        if queue:
            # Return the path that got closest
            best = min(queue, key=lambda x: x[0].distance_to(to_hex))
            return best[1] if best[1] else []
        return []

    def neighbors(self, coord: HexCoord) -> list[PerceivedHex]:
        results = []
        for dq, dr in HEX_DIRECTIONS:
            tile = self._hexes.get((coord.q + dq, coord.r + dr))
            if tile:
                results.append(tile)
        return results

    def all_hexes(self) -> dict[tuple[int, int], PerceivedHex]:
        return dict(self._hexes)
