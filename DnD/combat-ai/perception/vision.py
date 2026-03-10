"""
Line-of-sight computation on the hex grid.

Determines which hexes a creature can see based on position, senses,
light levels, and obstacles. Uses hex-grid ray casting.
"""

from __future__ import annotations

from models.creature import HexCoord, Senses
from models.perception import LightLevel, PerceivedHex, TerrainType


# ---------------------------------------------------------------------------
# Hex grid ray casting
# ---------------------------------------------------------------------------

def _lerp(a: float, b: float, t: float) -> float:
    return a + (b - a) * t


def _cube_lerp(
    aq: float, ar: float, as_: float,
    bq: float, br: float, bs: float,
    t: float,
) -> tuple[float, float, float]:
    return _lerp(aq, bq, t), _lerp(ar, br, t), _lerp(as_, bs, t)


def _cube_round(q: float, r: float, s: float) -> tuple[int, int]:
    """Round fractional cube coordinates to the nearest hex."""
    rq = round(q)
    rr = round(r)
    rs = round(s)

    dq = abs(rq - q)
    dr = abs(rr - r)
    ds = abs(rs - s)

    if dq > dr and dq > ds:
        rq = -rr - rs
    elif dr > ds:
        rr = -rq - rs
    # else rs = -rq - rr (implicit)

    return int(rq), int(rr)


def hex_line(start: HexCoord, end: HexCoord) -> list[HexCoord]:
    """
    Return the list of hexes on a line from start to end (inclusive).
    Uses cube-coordinate linear interpolation.
    """
    n = start.distance_to(end)
    if n == 0:
        return [start]

    results: list[HexCoord] = []
    # Nudge to avoid ambiguous edges
    eps = 1e-6
    sq, sr, ss = start.q + eps, start.r + eps, start.s - 2 * eps
    eq, er, es = end.q + eps, end.r + eps, end.s - 2 * eps

    for i in range(n + 1):
        t = i / n
        fq, fr, fs = _cube_lerp(sq, sr, ss, eq, er, es, t)
        hq, hr = _cube_round(fq, fr, fs)
        results.append(HexCoord(q=hq, r=hr))

    return results


def has_line_of_sight(
    origin: HexCoord,
    target: HexCoord,
    hex_map: dict[tuple[int, int], PerceivedHex],
) -> bool:
    """
    Check if there is clear line of sight between two hexes.
    Walls and full cover block LOS. Origin and target are not blocking.
    """
    line = hex_line(origin, target)
    blocking = {TerrainType.WALL, TerrainType.COVER_FULL}

    for hex_coord in line[1:-1]:  # skip origin and target themselves
        key = (hex_coord.q, hex_coord.r)
        tile = hex_map.get(key)
        if tile and tile.terrain in blocking:
            return False

    return True


# ---------------------------------------------------------------------------
# Visible hex computation
# ---------------------------------------------------------------------------

def compute_visible_hexes(
    origin: HexCoord,
    senses: Senses,
    all_hexes: dict[tuple[int, int], PerceivedHex],
    base_vision_range: int = 12,
) -> list[PerceivedHex]:
    """
    Compute all hexes visible from the origin given the creature's senses.

    Checks line-of-sight for each hex within vision range. Darkvision
    extends range into dim/dark areas. Blindsight/tremorsense bypass walls
    within their range.
    """
    visible: list[PerceivedHex] = []

    # Effective vision range
    vision_range = base_vision_range

    for (hq, hr), tile in all_hexes.items():
        coord = HexCoord(q=hq, r=hr)
        dist = origin.distance_to(coord)

        # Check blindsight/tremorsense first (bypass walls)
        if senses.blindsight > 0 and dist <= senses.blindsight:
            visible.append(tile)
            continue
        if senses.tremorsense > 0 and dist <= senses.tremorsense:
            visible.append(tile)
            continue
        if senses.truesight > 0 and dist <= senses.truesight:
            visible.append(tile)
            continue

        # Normal vision / darkvision
        effective_range = vision_range
        if tile.light in (LightLevel.DIM, LightLevel.DARK):
            if senses.darkvision > 0:
                effective_range = min(senses.darkvision, vision_range)
            else:
                # Can't see in darkness without darkvision
                if tile.light == LightLevel.DARK:
                    continue
                # Dim light: halved range
                effective_range = vision_range // 2

        if tile.light == LightLevel.MAGICAL_DARKNESS:
            # Only truesight (handled above) can see through magical darkness
            continue

        if dist > effective_range:
            continue

        # Check LOS (walls block)
        if has_line_of_sight(origin, coord, all_hexes):
            visible.append(tile)

    return visible
