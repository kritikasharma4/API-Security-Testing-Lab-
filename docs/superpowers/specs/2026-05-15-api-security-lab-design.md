# API Security Testing Lab — Design Spec
**Date:** 2026-05-15  
**Target:** DevSecOps / Security Engineer roles  
**Stack:** Node.js + Express (JavaScript)

---

## Overview

A monorepo containing two parts:
1. **`server/`** — A hardened REST API with layered security (JWT, rate limiting, helmet, CORS, input validation, bcrypt)
2. **`attacker/`** — An attack simulation panel that fires real attack payloads at the server and prints a PASS/FAIL report

The goal is to demonstrate both defensive security (building a hardened API) and offensive security thinking (simulating attacks to verify defenses).

---

## Project Structure

```
API-Security-Testing-Lab/
├── server/
│   ├── src/
│   │   ├── routes/          # auth.js, users.js, protected.js
│   │   ├── middleware/      # rateLimiter.js, verifyToken.js, validateInput.js, logger.js
│   │   ├── controllers/     # authController.js, userController.js
│   │   ├── models/          # user.js (in-memory store with bcrypt)
│   │   └── app.js
│   ├── .env.example
│   └── package.json
│
├── attacker/
│   ├── scenarios/
│   │   ├── brute-force.js
│   │   ├── jwt-tampering.js
│   │   ├── sql-injection.js
│   │   ├── rate-limit-bypass.js
│   │   └── cors-probe.js
│   ├── report.js            # Orchestrates all scenarios, prints report
│   └── package.json
│
├── SECURITY.md              # Documents every security layer
└── README.md                # Setup, demo instructions, screenshots
```

---

## Server: Security Layers

| Layer | Library | Implementation |
|-------|---------|----------------|
| Password hashing | `bcryptjs` | saltRounds=12, hash on register, compare on login |
| Authentication | `jsonwebtoken` | HS256, 1hr expiry, verified via middleware on protected routes |
| Rate limiting | `express-rate-limit` | 5 requests/15min on `/auth/login`, 100 requests/15min globally |
| Security headers | `helmet` | Full default config (CSP, HSTS, X-Frame-Options, etc.) |
| CORS | `cors` | Whitelist `http://localhost:3000` only, block all other origins |
| Input validation | `express-validator` | Sanitize + validate all request bodies, return 400 on failure |
| Request logging | `morgan` | Combined format, logs method, path, status, response time |
| Error handling | Custom middleware | Catches all errors, never leaks stack traces, returns generic messages |

---

## Server: API Endpoints

| Method | Path | Auth | Description |
|--------|------|------|-------------|
| POST | `/auth/register` | None | Register user, hash password |
| POST | `/auth/login` | None | Login, return JWT (rate limited: 5/15min) |
| GET | `/api/profile` | JWT required | Get user profile |
| GET | `/api/admin` | JWT required | Protected admin endpoint |
| GET | `/health` | None | Health check |

---

## Attacker: Attack Scenarios

### 1. Brute Force (`brute-force.js`)
- Fires 50 rapid POST requests to `/auth/login` with wrong credentials
- Expects: first few return 401, then 429 Too Many Requests
- **Verdict:** PASS if 429 is triggered within 5 attempts

### 2. JWT Tampering (`jwt-tampering.js`)
- Obtains a valid token, then modifies the payload (change role to admin, extend expiry)
- Sends modified token to `/api/admin`
- **Verdict:** PASS if server returns 401 Unauthorized

### 3. SQL Injection (`sql-injection.js`)
- Sends injection payloads in login body: `' OR 1=1 --`, `; DROP TABLE users;`
- **Verdict:** PASS if server returns 400 Bad Request (validator catches it)

### 4. Rate Limit Bypass (`rate-limit-bypass.js`)
- After hitting rate limit, retries with spoofed `X-Forwarded-For` headers
- **Verdict:** PASS if rate limit still applies (server ignores spoofed headers)

### 5. CORS Probe (`cors-probe.js`)
- Sends requests with `Origin: https://evil.com`
- **Verdict:** PASS if response lacks `Access-Control-Allow-Origin` or returns CORS error

---

## Attack Report Format

```
╔══════════════════════════════════════════════════════╗
║          API SECURITY TESTING LAB — REPORT           ║
╠══════════════════════════════════════════════════════╣
║ Server: http://localhost:4000                         ║
║ Time:   2026-05-15T10:00:00Z                         ║
╠══════════════════════════════════════════════════════╣
║ [PASS] Brute Force          → 429 after 5 attempts   ║
║ [PASS] JWT Tampering        → 401 Unauthorized       ║
║ [PASS] SQL Injection        → 400 Bad Request        ║
║ [PASS] Rate Limit Bypass    → 429 (spoof ignored)    ║
║ [PASS] CORS Probe           → CORS blocked           ║
╠══════════════════════════════════════════════════════╣
║ Result: 5/5 attacks blocked ✓                        ║
╚══════════════════════════════════════════════════════╝
```

---

## Data Model

No database — uses an in-memory Map for simplicity. Keeps the project focused on security, not data persistence.

```js
// users store: Map<email, { id, name, email, passwordHash }>
```

---

## Out of Scope
- Database (in-memory only)
- Frontend UI
- Deployment / Docker
- OAuth / social login
