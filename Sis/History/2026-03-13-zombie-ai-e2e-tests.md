# 2026-03-13 — Zombie AI E2E Tests

## What Was Discussed
Creator noticed that despite the zombie AI being implemented server-side, there were no E2E tests proving it actually works in the UI. The question: "did you write e2e tests that actually validate it?"

## What Was Learned
**Critical Lesson: The server running in memory has stale, cached code.**
Node.js caches `require()` results per process. When I make file changes, any already-running server process continues using the old loaded module. Smoke tests (fresh `node -e` processes) always see updated code, but the live API server does not until restarted. This is why the smoke test showed zombie AI working but the live UI did not.

## Diagnosis
The `endTurn` API was returning:
- `activeId: zombie-1` (should be `party-1` after AI runs)
- `logs: undefined` (no AI log lines)
- Zombie position unchanged

Root cause: server process was running old code before my `CombatSessionManager.js` changes were applied. The new `executeAiTurns`, `aiProfileMap`, and `logs: aiLogs` in the return were never executing in the live API.

## Actions Taken

### 1. Wrote `tests/e2e/combat-ai.spec.ts` (8 tests)
- Player (bard) goes first
- After player ends turn, zombie AI runs and control returns to player
- Zombie moves from starting position toward player
- Zombie map position (UI) matches server position
- Combat log shows "Zombie moves" entry
- Combat log shows "Zombie attacks" entry
- Zombie AI fires every round without errors
- No error toast after AI turn

### 2. Added `getSessionActiveId()` to `CombatPage` helper
New method queries the REST API session state and returns the current active combatant ID. Used to assert whose turn it is.

### 3. Killed stale server (PID 75740) and restarted
`node server/index.js` from dnd-builder directory. Fresh server loaded updated `CombatSessionManager.js`.

### 4. Verified
- 8/8 new AI tests pass
- 95/95 full E2E suite passes (no regressions)

## Decisions Made
- E2E tests use `assertLogContains` with 8-second timeout to handle async combat log updates
- Tests use `getSessionActiveId()` (API query) not UI polling to verify turn state
- Position tests use both `getServerEntityPosition` and `getMapEntityPosition` to verify UI↔server sync

## Key File Locations
- New spec: `tests/e2e/combat-ai.spec.ts`
- Updated helper: `tests/e2e/helpers/combat-page.ts` → `getSessionActiveId()`
