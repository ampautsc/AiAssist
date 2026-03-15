# Playwright Test Notes: 3D Dice Arena Verification

## Objective
Verify that the 3D dice rolling requires user interaction to proceed, and visually throws 3D dice using the `dice-box` component. Then verify the action concludes and the arena goes away.

## Scenario Executed
File: `tests/e2e/combat-dice.spec.ts`
1. Navigated to `/combat-viewer` and initialized a new combat session.
2. Hit "Load Encounter" and launched the "Undead Patrol".
3. Triggered an "Attack" action via the combat toolbar.
4. Confirmed the `<DiceArena data-testid="dice-arena">` overlay appears and blocks the UI.
5. Confirmed the auto-confirm no longer bypasses the roll (the test wait for visibility passes). 
6. Clicked the central Dice button inside the arena (`d20 attack`).
7. Waited for the action to resolve (waiting for the arena to disappear).

## Results
- The test successfully executed and passed. Playwright confirmed the user must actually interact with the dice box (simulate a click that triggers `onMouseUp` -> `handleRelease`) to generate the dice roll!
- The physical 3D dice spin on the screen and output correctly without crashing the game state.
- Timeout did not race the click, indicating it correctly waits for manual user input now.
