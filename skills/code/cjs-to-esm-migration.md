# CJS to ESM Bulk Migration

## Category
code

## Tags
#cjs #esm #migration #module #conversion #javascript #monorepo

## Description
Pattern for efficiently converting CommonJS (require/module.exports) files to ESM (import/export) at scale using PowerShell scripted replacements. Especially useful when migrating dozens of files from a legacy codebase into an ESM monorepo.

## Prerequisites
- Source CJS files identified with their require/module.exports patterns
- Target ESM directory structure exists
- Test framework (vitest) configured in the target project
- Import path mapping known (e.g. `require('../data/spells')` → `import from '@dnd-platform/content/spells'`)

## Steps
1. **Grep for CJS patterns** in source file:
   ```powershell
   Select-String -Path $src -Pattern "require\(|module\.exports" | ForEach-Object { "$($_.LineNumber): $($_.Line.Trim())" }
   ```
2. **Grep for function declarations** to identify which need `export`:
   ```powershell
   Select-String -Path $src -Pattern '^function ' | ForEach-Object { "$($_.LineNumber): $($_.Line.Trim())" }
   ```
3. **Read the module.exports block** to see which functions are public
4. **PowerShell scripted conversion**:
   - Remove `'use strict'`
   - Replace each `require()` with corresponding `import` statement
   - Add `export` keyword to each public function declaration
   - Export constants that were in module.exports
   - Write file, then truncate module.exports block by line number
5. **Verify clean conversion**:
   ```powershell
   Select-String -Path $dst -Pattern "require\(|module\.exports|'use strict'" -Quiet
   ```
6. **Run tests** after EACH file to catch cross-module issues immediately

## Examples
```powershell
# Full conversion script pattern
$content = Get-Content $src -Raw
$content = $content -replace "'use strict'\s*\r?\n\r?\n", ""
$content = $content -replace "const dice = require\('../engine/dice'\)", "import * as dice from '../engine/dice.js'"
$content = $content -replace "(?m)^function resolve\(", "export function resolve("
Set-Content -Path $dst -Value $content -NoNewline -Encoding UTF8

# Truncate module.exports (line-number based, avoids Unicode regex issues)
$lines = Get-Content $dst
$exportLine = (Select-String -Path $dst -Pattern 'module\.exports').LineNumber
$trimmed = $lines[0..($exportLine - 3)]
Set-Content -Path $dst -Value $trimmed -Encoding UTF8
```

## Common Pitfalls
1. **Underscore prefix mismatch**: CJS files often export internal functions with aliases like `_resolveAttack: resolveAttack`. In ESM, these become `export function resolveAttack()` (no underscore). ALL callers that use `Module._resolveAttack` must be updated to `Module.resolveAttack`. Search all sibling modules before running tests.
2. **Unicode in comments breaks regex**: Box-drawing characters (─, ═, etc.) in section headers prevent PowerShell regex from matching. Use line-number-based truncation instead.
3. **Lazy requires**: CJS files sometimes have `require()` inside functions to avoid circular deps. Convert these to top-level static `import` — ESM handles circular deps through live bindings.
4. **`import *` vs named imports**: When the original uses `const Module = require('./Module')` and callers use `Module.function()`, convert to `import * as Module from './Module.js'` to preserve the namespace pattern.
5. **PowerShell stderr on git push**: `git push` writes to stderr by default, causing PowerShell exit code 1. This is cosmetic, not a failure.

## Related Skills
- skills/problem-solving/task-decomposition.md
- skills/code/code-review-checklist.md
