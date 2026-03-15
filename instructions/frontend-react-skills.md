# React / Frontend UI Workflow Rules

1. **Verify UI Changes Against the Live Page**
   - NEVER assume an edit worked just because ESLint or tests passed.
   - Vite serve check (Status 200).
   - Browser smoke test (Zero page errors).
   - Run E2E tests (`npx playwright test`).

2. **Component Conventions**
   - No color-only differentiation, high contrast at small sizes.
   - Separate state from presentation.

3. **Error Recovery**
   - Use error boundaries.
   - Ensure you are hitting the correct running server port (`3001` vs Vite's `5173`).
