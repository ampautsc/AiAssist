# Skill: Service Health Verification

## Category
code

## Tags
#validation #server #health-check #deployment #verification

## Description
After starting any server or service, verify it is actually responding to requests before reporting success. Console output showing "listening on port X" is NOT proof — the service may crash, fail to bind, or error after initial output. This skill exists because of a specific failure: reporting a Vite dev server as "Running" based on console output alone, when it was not actually serving pages.

## Prerequisites
- A server or service has been started (backend API, frontend dev server, database, etc.)
- The expected port and endpoint are known

## Steps
1. Start the server process
2. Wait an appropriate duration (2-5 seconds) for startup to complete
3. Make an actual HTTP request to the health/status endpoint
4. Verify the response status code is 200 (or expected code)
5. For frontend servers: fetch an actual page and verify content length > 0
6. Only THEN report "Running" or "Success"

## Examples

**Backend API (Node/Express on port 3001):**
```powershell
# Start server in background, then health check
Invoke-RestMethod -Uri http://localhost:3001/api/health -TimeoutSec 5 | ConvertTo-Json
```

**Vite Frontend (port 5173):**
```powershell
$r = Invoke-WebRequest -Uri http://localhost:5173 -TimeoutSec 5 -UseBasicParsing
Write-Host "Status: $($r.StatusCode) Content-Length: $($r.Content.Length)"
```

**Generic pattern:**
```powershell
Start-Sleep -Seconds 3
try {
    $r = Invoke-RestMethod -Uri "http://localhost:$PORT/health" -TimeoutSec 5
    Write-Host "VERIFIED: Service responding on port $PORT"
} catch {
    Write-Host "FAILED: Service not responding - $_"
}
```

## Common Pitfalls
- Trusting console output ("Server listening on port 3001") as proof of success
- Not waiting long enough before the health check
- Checking the wrong port or endpoint
- Not testing with an actual HTTP request (just checking if the process is running)
- Reporting success from a background process without checking its output

## Anti-Pattern (What NOT To Do)
```
Start server in background → See "listening" in console → Report "Running" ← THIS IS A LIE
```

## Related Skills
- `skills/code/code-review-checklist.md`

## Origin
March 15, 2026 — Reported Vite dev server as "Running" without HTTP verification. Boss got "this site can't be reached." Violated Rule #2.
