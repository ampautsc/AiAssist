/**
 * hexUtils.js — Frontend hex math utilities
 * Pure functions, fully testable, no React dependencies.
 */

/**
 * Cube/axial distance between two hex coordinates.
 * @param {{q:number, r:number}} a
 * @param {{q:number, r:number}} b
 * @returns {number}
 */
export function hexDistance(a, b) {
  const dq = (a.q ?? 0) - (b.q ?? 0)
  const dr = (a.r ?? 0) - (b.r ?? 0)
  return Math.max(Math.abs(dq), Math.abs(dr), Math.abs(-dq - dr))
}

/**
 * Returns a Set of "q,r" keys reachable within maxHexes steps from origin,
 * clipped to the given map radius. Excludes the origin hex itself.
 * Uses straight-line hex distance (no pathfinding / terrain cost).
 * @param {{q:number, r:number}} origin
 * @param {number} maxHexes   — movement budget in hexes (feet / 5)
 * @param {number} mapRadius  — grid radius to clip against
 * @returns {Set<string>}
 */
export function hexesInRange(origin, maxHexes, mapRadius) {
  const result = new Set()
  const oq = origin.q ?? 0
  const or_ = origin.r ?? 0
  const n = Math.floor(maxHexes)

  for (let dq = -n; dq <= n; dq++) {
    const r1 = Math.max(-n, -dq - n)
    const r2 = Math.min(n, -dq + n)
    for (let dr = r1; dr <= r2; dr++) {
      if (dq === 0 && dr === 0) continue  // exclude origin
      const q = oq + dq
      const r = or_ + dr
      // Clip to map radius
      const dist = Math.max(Math.abs(q), Math.abs(r), Math.abs(-q - r))
      if (dist <= mapRadius) {
        result.add(`${q},${r}`)
      }
    }
  }
  return result
}

/**
 * Scatter `count` non-overlapping hex positions in an arc/ring at a given
 * distance range from a center hex. Used to place enemies when an encounter
 * doesn't define explicit positions.
 *
 * Strategy: collect candidate hexes in the ring [minDist, maxDist], shuffle,
 * then pick `count` that are at least `spacing` hexes apart from each other.
 *
 * @param {number} count       — number of positions to generate
 * @param {{q:number,r:number}} center — center hex (usually the player position)
 * @param {number} minDist     — minimum hex distance from center (default 6)
 * @param {number} maxDist     — maximum hex distance from center (default 10)
 * @param {number} mapRadius   — grid radius to clip against
 * @param {number} spacing     — minimum distance between placed entities (default 1)
 * @param {Set<string>} [occupied] — set of "q,r" keys that are already taken
 * @returns {Array<{q:number, r:number}>}
 */
export function scatterPositions(
  count,
  center = { q: 0, r: 0 },
  minDist = 6,
  maxDist = 10,
  mapRadius = 64,
  spacing = 1,
  occupied = new Set(),
) {
  const cq = center.q ?? 0
  const cr = center.r ?? 0
  const n = Math.max(minDist, maxDist)

  // Build candidate list — all hexes in the ring [minDist, maxDist]
  const candidates = []
  for (let dq = -n; dq <= n; dq++) {
    const r1 = Math.max(-n, -dq - n)
    const r2 = Math.min(n, -dq + n)
    for (let dr = r1; dr <= r2; dr++) {
      const dist = Math.max(Math.abs(dq), Math.abs(dr), Math.abs(-dq - dr))
      if (dist < minDist || dist > maxDist) continue
      const q = cq + dq
      const r = cr + dr
      // Clip to map radius
      const absDist = Math.max(Math.abs(q), Math.abs(r), Math.abs(-q - r))
      if (absDist > mapRadius) continue
      const key = `${q},${r}`
      if (occupied.has(key)) continue
      candidates.push({ q, r })
    }
  }

  // Fisher-Yates shuffle
  for (let i = candidates.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [candidates[i], candidates[j]] = [candidates[j], candidates[i]]
  }

  // Greedily pick positions with minimum spacing between each other
  const result = []
  for (const pos of candidates) {
    if (result.length >= count) break
    const tooClose = result.some(
      p => hexDistance(p, pos) < spacing
    )
    if (!tooClose) {
      result.push(pos)
    }
  }

  // If we couldn't find enough with spacing, relax and just fill
  if (result.length < count) {
    for (const pos of candidates) {
      if (result.length >= count) break
      if (!result.some(p => p.q === pos.q && p.r === pos.r)) {
        result.push(pos)
      }
    }
  }

  return result
}
