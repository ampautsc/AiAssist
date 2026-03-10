/**
 * HexMap — SVG hex-grid combat map for encounter visualization
 *
 * Renders a flat-top hex grid showing combatant positions.
 * Grid units map to D&D 5ft squares (each hex = 5 feet).
 *
 * Coordinate system: offset coordinates (even-q)
 *   - x increases right
 *   - y increases downward
 *
 * Props:
 *   combatants  — array of { id, name, side, position:{x,y}, currentHP, maxHP,
 *                             alive, flying, conditions }
 *   gridWidth   — number of hex columns (default 12)
 *   gridHeight  — number of hex rows    (default 10)
 *   hexSize     — pixel radius of each hex (default 28)
 *   round       — current round number for label
 */

import { useMemo } from 'react'

// ─── HEX GEOMETRY ─────────────────────────────────────────────────────────────

const SQRT3 = Math.sqrt(3)

/**
 * Convert flat-top hex offset (col, row) to pixel center (cx, cy).
 * Flat-top: width = 2*size, height = sqrt(3)*size
 */
function hexToPixel(col, row, size) {
  const w = 2 * size
  const h = SQRT3 * size
  const cx = col * (w * 0.75) + size
  const cy = row * h + (col % 2 === 0 ? 0 : h / 2) + h / 2
  return { cx, cy }
}

/**
 * Build the 6 corner points of a flat-top hex centered at (cx, cy).
 */
function hexCorners(cx, cy, size) {
  const points = []
  for (let i = 0; i < 6; i++) {
    const angle = (Math.PI / 180) * (60 * i)
    points.push([cx + size * Math.cos(angle), cy + size * Math.sin(angle)])
  }
  return points.map(([x, y]) => `${x.toFixed(1)},${y.toFixed(1)}`).join(' ')
}

// ─── COLOUR HELPERS ───────────────────────────────────────────────────────────

function sideColor(side) {
  if (side === 'party') return '#4a9eff'
  if (side === 'enemy') return '#ff5c5c'
  return '#aaa'
}

function hpBarColor(pct) {
  if (pct >= 0.6) return '#5ddb8a'
  if (pct >= 0.3) return '#e8c170'
  return '#ff5c5c'
}

function conditionBadge(conditions = []) {
  const icons = []
  if (conditions.includes('frightened')) icons.push('😨')
  if (conditions.includes('charmed_hp') || conditions.includes('incapacitated')) icons.push('💫')
  if (conditions.includes('paralyzed')) icons.push('🔒')
  if (conditions.includes('invisible')) icons.push('👻')
  if (conditions.includes('prone')) icons.push('⬇️')
  if (conditions.includes('poisoned')) icons.push('☠️')
  return icons.join('')
}

// ─── MAIN COMPONENT ───────────────────────────────────────────────────────────

export default function HexMap({
  combatants = [],
  gridWidth = 12,
  gridHeight = 10,
  hexSize = 28,
  round = null,
}) {
  // Pre-compute hex grid pixel dimensions
  const colSpacing = hexSize * 1.5
  const rowSpacing = SQRT3 * hexSize
  const totalWidth = gridWidth * colSpacing + hexSize
  const totalHeight = gridHeight * rowSpacing + rowSpacing

  // Group combatants by hex cell for stacking
  const cellMap = useMemo(() => {
    const m = new Map()
    for (const c of combatants) {
      const key = `${c.position?.x ?? 0},${c.position?.y ?? 0}`
      if (!m.has(key)) m.set(key, [])
      m.get(key).push(c)
    }
    return m
  }, [combatants])

  // Build list of occupied cells
  const cellEntries = useMemo(() => {
    const entries = []
    cellMap.forEach((list, key) => {
      const [col, row] = key.split(',').map(Number)
      entries.push({ col, row, occupants: list })
    })
    return entries
  }, [cellMap])

  // All empty hex cells to render as background
  const allCells = useMemo(() => {
    const cells = []
    for (let col = 0; col < gridWidth; col++) {
      for (let row = 0; row < gridHeight; row++) {
        cells.push({ col, row })
      }
    }
    return cells
  }, [gridWidth, gridHeight])

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '0.5rem' }}>
      {round !== null && (
        <div style={{ fontSize: '0.85rem', color: '#8bb8e8', fontWeight: 600 }}>
          📍 Positions — Round {round === 0 ? 'Start' : round}
        </div>
      )}
      <svg
        width={totalWidth}
        height={totalHeight}
        viewBox={`0 0 ${totalWidth} ${totalHeight}`}
        style={{ background: '#1a1e2e', borderRadius: '8px', border: '1px solid #333' }}
        aria-label={`Hex combat map${round !== null ? `, round ${round}` : ''}`}
      >
        {/* ── Background hexes ── */}
        {allCells.map(({ col, row }) => {
          const { cx, cy } = hexToPixel(col, row, hexSize)
          const pts = hexCorners(cx, cy, hexSize)
          const key = `${col},${row}`
          const occupied = cellMap.has(key)
          return (
            <polygon
              key={`hex-${key}`}
              points={pts}
              fill={occupied ? 'rgba(255,255,255,0.04)' : '#1a1e2e'}
              stroke="#2a3040"
              strokeWidth={1}
            />
          )
        })}

        {/* ── Grid labels (column/row markers at edges) ── */}
        {Array.from({ length: gridWidth }, (_, col) => {
          const { cx } = hexToPixel(col, 0, hexSize)
          return (
            <text
              key={`col-label-${col}`}
              x={cx}
              y={8}
              textAnchor="middle"
              fill="#333"
              fontSize={8}
              fontFamily="monospace"
            >
              {col * 5}
            </text>
          )
        })}

        {/* ── Combatants ── */}
        {cellEntries.map(({ col, row, occupants }) => {
          const { cx, cy } = hexToPixel(col, row, hexSize)
          const r = hexSize - 5

          if (occupants.length === 1) {
            const c = occupants[0]
            const hpPct = c.maxHP > 0 ? c.currentHP / c.maxHP : 0
            const color = sideColor(c.side)
            const isAlive = c.alive !== false
            const label = conditionBadge(c.conditions)
            const initials = c.name.split(' ').map(w => w[0]).join('').slice(0, 2).toUpperCase()

            return (
              <g key={`combatant-${c.id}`} role="img" aria-label={`${c.name} at (${col},${row})`}>
                {/* Token circle */}
                <circle
                  cx={cx}
                  cy={cy}
                  r={r}
                  fill={isAlive ? color : '#555'}
                  fillOpacity={isAlive ? 0.85 : 0.4}
                  stroke={isAlive ? '#fff' : '#888'}
                  strokeWidth={c.flying ? 3 : 1.5}
                  strokeDasharray={c.flying ? '3,2' : undefined}
                />
                {/* Initials */}
                <text
                  x={cx}
                  y={cy + 5}
                  textAnchor="middle"
                  fill="#fff"
                  fontSize={12}
                  fontWeight={700}
                  fontFamily="monospace"
                >
                  {initials}
                </text>
                {/* HP bar at bottom of hex */}
                {isAlive && (
                  <>
                    <rect
                      x={cx - r + 2}
                      y={cy + r - 6}
                      width={(r * 2 - 4)}
                      height={4}
                      fill="#333"
                      rx={2}
                    />
                    <rect
                      x={cx - r + 2}
                      y={cy + r - 6}
                      width={Math.max(0, (r * 2 - 4) * hpPct)}
                      height={4}
                      fill={hpBarColor(hpPct)}
                      rx={2}
                    />
                  </>
                )}
                {/* Condition badges */}
                {label && (
                  <text
                    x={cx}
                    y={cy - r + 2}
                    textAnchor="middle"
                    fontSize={9}
                  >
                    {label}
                  </text>
                )}
                {/* Flying indicator */}
                {c.flying && (
                  <text
                    x={cx + r - 4}
                    y={cy - r + 8}
                    fontSize={9}
                    textAnchor="end"
                  >
                    ✈
                  </text>
                )}
              </g>
            )
          }

          // Multiple combatants in same cell — mini tokens
          return occupants.map((c, idx) => {
            const angle = (idx / occupants.length) * 2 * Math.PI - Math.PI / 2
            const offset = r * 0.5
            const tx = cx + offset * Math.cos(angle)
            const ty = cy + offset * Math.sin(angle)
            const mini = (r * 0.45)
            const isAlive = c.alive !== false
            const color = sideColor(c.side)
            const initials = c.name[0]?.toUpperCase() || '?'

            return (
              <g key={`combatant-${c.id}-${idx}`}>
                <circle
                  cx={tx}
                  cy={ty}
                  r={mini}
                  fill={isAlive ? color : '#555'}
                  fillOpacity={isAlive ? 0.85 : 0.4}
                  stroke="#fff"
                  strokeWidth={1}
                />
                <text
                  x={tx}
                  y={ty + 4}
                  textAnchor="middle"
                  fill="#fff"
                  fontSize={9}
                  fontWeight={700}
                  fontFamily="monospace"
                >
                  {initials}
                </text>
              </g>
            )
          })
        })}
      </svg>

      {/* ── Legend ── */}
      <div style={{ display: 'flex', gap: '1rem', flexWrap: 'wrap', fontSize: '0.75rem', color: '#aaa' }}>
        <span>
          <svg width={12} height={12} style={{ verticalAlign: 'middle', marginRight: 3 }}>
            <circle cx={6} cy={6} r={5} fill="#4a9eff" />
          </svg>
          Party
        </span>
        <span>
          <svg width={12} height={12} style={{ verticalAlign: 'middle', marginRight: 3 }}>
            <circle cx={6} cy={6} r={5} fill="#ff5c5c" />
          </svg>
          Enemy
        </span>
        <span>✈ Flying (dashed border)</span>
        <span>😨 Frightened  💫 Incapacitated  🔒 Paralyzed  👻 Invisible</span>
        <span style={{ color: '#555' }}>Grid = 5ft per hex</span>
      </div>

      {/* ── Combatant roster ── */}
      {combatants.length > 0 && (
        <div style={{ display: 'flex', gap: '0.5rem', flexWrap: 'wrap' }}>
          {combatants.map(c => {
            const hpPct = c.maxHP > 0 ? c.currentHP / c.maxHP : 0
            const isAlive = c.alive !== false
            return (
              <div
                key={c.id}
                style={{
                  background: '#1e2535',
                  border: `1px solid ${sideColor(c.side)}55`,
                  borderRadius: '6px',
                  padding: '0.25rem 0.5rem',
                  fontSize: '0.75rem',
                  opacity: isAlive ? 1 : 0.5,
                  minWidth: '110px',
                }}
              >
                <div style={{ color: sideColor(c.side), fontWeight: 600, fontSize: '0.8rem' }}>
                  {c.name}
                  {c.flying ? ' ✈' : ''}
                </div>
                <div style={{ color: hpBarColor(hpPct) }}>
                  HP: {c.currentHP}/{c.maxHP}
                </div>
                {(c.conditions?.length > 0) && (
                  <div style={{ color: '#e8a070', fontSize: '0.7rem' }}>
                    {c.conditions.join(', ')}
                  </div>
                )}
                <div style={{ color: '#555', fontSize: '0.65rem' }}>
                  ({c.position?.x ?? 0}, {c.position?.y ?? 0})
                </div>
              </div>
            )
          })}
        </div>
      )}
    </div>
  )
}
