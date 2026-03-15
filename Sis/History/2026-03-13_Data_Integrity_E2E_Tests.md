# 2026-03-13 — Data Integrity E2E Tests & Stale Server Fix

## What Happened
Creator reported "the whole web page has an error." Investigation revealed it was a **stale server issue** — the API and Vite dev servers from the previous session were running old code. After killing and restarting both servers, the page loaded with zero errors.

## Root Cause
The previous session modified CombatViewer.jsx extensively (sync effect, position markers, encounter config, wrapper div). The servers weren't restarted to pick up these changes, so the running processes served stale code that conflicted with the updated frontend. The `playwright.config.ts` uses `reuseExistingServer: true`, which compounded the issue.

## What Was Built
Created **18 new E2E tests** in `tests/e2e/combat-data-integrity.spec.ts` covering a class of bugs that previous tests missed:

### Page Health (3 tests)
- No JavaScript errors during page load and session creation
- No console.error messages during page load
- Page does not reload after initial load (catches infinite loop bugs)

### Session Markers in DOM (3 tests)
- combat-viewer wrapper has a non-empty session ID (`data-session-id`)
- Entity position markers exist for bard (`party-1`) and zombie (`zombie-1`)
- Entity position markers have numeric q and r attributes

### Position Sync — Map Matches Server (5 tests)
- Bard map position matches server position after session creation
- Zombie map position matches server position after session creation
- Bard starts at expected hex coordinates (0, 0)
- Zombie starts at expected hex coordinates (3, -1)
- Server positions use hex (q,r) coordinates, not legacy (x,y)

### HP Sync — Map Matches Server (3 tests)
- Zombie server HP is a positive number after session creation
- Bard server HP is a positive number after session creation
- Zombie HP updates on map after taking Vicious Mockery damage

### Position Sync After Movement (1 test)
- After player moves one hex, map position updates to match server

### Data Integrity Across Combat Actions (3 tests)
- No JS errors after casting a spell and ending turn
- Combat log accumulates entries without duplicates
- All entity markers remain valid after multiple operations

## Key Detail Discovered
The bard's entity ID is `party-1` (from `MOCK_HUD_DATA.activeCharacter.id`), not `gem_dragonborn_lore_bard_8` (which is the templateKey). Initial tests failed because of this mismatch — fixed and all tests pass.

## Final Test Counts
- **87/87 E2E tests** (69 original + 18 new data integrity tests)
- **1461/1461 engine unit tests**

## Decisions Made
- No code changes were needed — the "error" was purely a stale server issue
- Tests were designed to catch the specific bug classes from prior sessions: HP field name mismatches (`currentHP`/`maxHP` vs `hp`/`maxHp`), position format issues (`q,r` vs `x,y`), sync effect infinite loops, and DOM marker integrity

## Lesson
Always restart both servers (API on 3001, Vite on 5173) after code changes. The `reuseExistingServer: true` in Playwright config means stale servers will be reused without warning.
