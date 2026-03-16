# Build Validation and Testing Standards

*Derived from UI white-screen crashes and modular combat engine migrations (March 2026).*

## 1. Static Analysis is a Liar
Code checking tools (ESLint, `get_errors`, TypeScript compilers) do **not** guarantee runtime success.
- **Vite/Babel Strictness:** What looks perfectly valid to an editor can result in an HTTP 500 error from Babel parsing limits (e.g. multiple `else if` lines).
- **Rule:** You are never "done" with UI work just because the errors list is empty.

## 2. The Golden Triad of UI Verification
After ANY frontend UI file modification (`.jsx, .tsx`), execute this exact routine:
1. **The Server Layer (Vite 200 Test):**
   ```javascript
   node -e "fetch('http://localhost:5173/src/path/to/edited/File.jsx').then(r=>console.log('Status:',r.status))"
   ```
2. **The Browser Layer (Blank Screen Test):**
   - Headless check to ensure DOM elements render without Console Errors.
3. **The User Layer (E2E Tests):**
   - `npx playwright test --reporter=line`
   - Playwright validates the actual behavior of the components against the true backend APIs.

## 3. Verify Your Ports
The system contains multiple APIs (e.g., `DPR Scenarios` vs. `D&D Combat API`). Both frequently clash on Port `3001`.
- Always verify the correct backend is listening on Port 3001 using a POST/GET sniff. E2E tests against a falsely open mismatch port will give a false feeling of failure or success.

## 4. Test Preservation during Refactoring
When migrating from Monolith architectures to Modular systems (e.g., D&D `run-combat-sim.js` migration):
- Leave tightly-coupled legacy test factories intact as a boundary until ready.
- Do NOT carry over known bugs for the sake of strict compatibility unless explicitly ordered. (Example: Hypnotic Pattern splice array bugs should be rewritten and tests updated, not preserved).