# Advanced Features Design Spec

**Date:** 2026-05-15  
**Project:** API Security Testing Lab  
**Features:** Live SSE Log Stream, Honeypot Endpoint, OWASP Score Card

---

## Overview

Three additions to the existing API Security Testing Lab that make it more technically impressive for interviews. All features integrate with the existing server (Node.js/Express on Render) and client (React/Vite on Vercel).

---

## Feature 1: Live SSE Log Stream

### Server

**New file: `server/src/logBus.js`**
- Singleton Node.js `EventEmitter` instance
- Exported and imported by any middleware or route that wants to emit log events
- Events have shape: `{ type: 'INFO' | 'WARN' | 'ALERT', message: string, timestamp: string, meta?: object }`

**New file: `server/src/routes/logs.js`**
- `GET /logs/stream` — SSE endpoint
- Sets headers: `Content-Type: text/event-stream`, `Cache-Control: no-cache`, `Connection: keep-alive`
- On connect: subscribes to `logBus` and forwards each event as `data: <JSON>\n\n`
- On client disconnect: removes listener to avoid memory leaks
- No auth required (logs are read-only, non-sensitive structured events)

**Modified: `server/src/app.js`**
- Mount `/logs` route
- Replace morgan with a custom request logger middleware that emits to `logBus` for every request: method, path, status, ip

**Modified: `server/src/middleware/rateLimiter.js`**
- On rate limit hit: emit `ALERT` event to `logBus`: `"Rate limit triggered for <ip> on <path>"`

**Modified: `server/src/middleware/verifyToken.js`**
- On invalid/expired token: emit `WARN` event: `"Invalid token rejected from <ip>"`
- On missing token: emit `WARN` event: `"Unauthenticated request to protected route"`

### Client

**New file: `client/src/components/LogPanel.tsx`**
- Terminal-style panel: black background, monospace font, colored prefixes
  - `[INFO]` — green
  - `[WARN]` — yellow  
  - `[ALERT]` — red
- `EventSource` connects to `${SERVER_URL}/logs/stream` when attacks start
- Disconnects (`.close()`) when attacks finish
- Auto-scrolls to bottom on new entries
- Max 100 entries in state to avoid memory issues
- Shows "Connecting to log stream..." placeholder before first event

**Modified: `client/src/components/AttackPanel.tsx`**
- Passes `onStart` and `onComplete` callbacks down, or lifts SSE connection into `App.tsx`
- LogPanel rendered below AttackPanel, receives log entries via shared state in App.tsx

---

## Feature 2: Honeypot Endpoint

### Server

**Modified: `server/src/routes/api.js`**
- Add `GET /api/secret` — no `verifyToken` middleware (intentionally unprotected, looks like a forgotten endpoint)
- Returns convincing fake data:
```json
{
  "warning": "you should not be here",
  "users": [
    { "id": 1, "email": "admin@company.com", "role": "superadmin", "passwordHash": "$2b$12$fakeHashHere" },
    { "id": 2, "email": "cto@company.com", "role": "admin", "passwordHash": "$2b$12$anotherFakeHash" }
  ],
  "adminToken": "eyJhbGciOiJIUzI1NiJ9.eyJyb2xlIjoic3VwZXJhZG1pbiJ9.fakeSignature",
  "dbConnectionString": "postgresql://admin:sup3rS3cr3t@internal-db:5432/prod"
}
```
- Emits `ALERT` to `logBus`: `"HONEYPOT TRIGGERED — probe detected from <ip>"`
- Returns HTTP 200 (convincing — attacker thinks they found something)

### Client

**New file: `client/src/scenarios/honeypot.ts`**
- `GET ${baseURL}/api/secret` with no auth header
- Always returns `pass: true` — if the server responds at all, the honeypot worked (it detected and logged the probe)
- Detail: `"Honeypot triggered — fake credentials served and probe logged"`
- Shows a snippet of the fake data received in the detail message

**Modified: `client/src/components/AttackPanel.tsx`**
- Add honeypot as 4th scenario (before brute force): JWT Tampering, SQL Injection, CORS Probe, **Honeypot**, Brute Force, Rate Limit Bypass

**Modified: `client/src/components/AttackCard.tsx`**
- Add description for Honeypot: `"Probes unprotected /api/secret — tests detection capability"`

**Modified: `client/src/scenarios/index.ts`**
- Export `honeypot`

---

## Feature 3: OWASP Score Card

### Client only — no server changes

**New file: `client/src/components/OWASPCard.tsx`**
- Props: `results: ScenarioResult[]`
- Rendered in `App.tsx` below the AttackPanel, only when results are non-empty
- 5 rows mapping attack results to OWASP risks:

| OWASP Risk | Tested By | Pass condition |
|------------|-----------|----------------|
| A01 Broken Access Control | JWT Tampering | pass === true |
| A02 Cryptographic Failures | JWT Tampering | pass === true |
| A03 Injection | SQL Injection | pass === true |
| A05 Security Misconfiguration | CORS Probe | pass === true |
| A07 Authentication Failures | Brute Force | pass === true |

- Each row: risk ID chip (e.g. `A01`), risk name, attack name, `MITIGATED` (emerald) or `EXPOSED` (red) badge
- Header: "OWASP Top 10 Coverage"
- Subtitle: "Based on attack simulation results"

**Modified: `client/src/components/AttackPanel.tsx`**
- Expose `results` to parent via callback `onComplete(results: ScenarioResult[])`

**Modified: `client/src/App.tsx`**
- Hold `results` state
- Pass `onComplete` to `AttackPanel`
- Render `<OWASPCard results={results} />` below `<AttackPanel />`

---

## Data Flow

```
Attack runs → server processes request
           → logBus.emit(event)
           → SSE handler pushes to all connected EventSources
           → LogPanel receives event, appends to log list

Honeypot hit → server returns fake data + emits ALERT
             → frontend shows honeypot PASS + fake data snippet
             → LogPanel shows red ALERT entry

All attacks done → AttackPanel calls onComplete(results)
                → App.tsx sets results state
                → OWASPCard renders with mapped results
```

---

## Constraints

- SSE connection has no auth — log events must contain no sensitive data (no passwords, no real tokens, no user emails)
- Honeypot fake data must look real but be obviously fake on inspection (bcrypt hashes that don't decode, JWT with fake signature)
- CORS: `/logs/stream` must be included in the server's CORS config so the browser can connect
- On Render free tier, SSE connections may timeout after ~30s of inactivity — emit a keepalive comment (`": keepalive\n\n"`) every 15s
