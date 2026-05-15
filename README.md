# API Security Testing Lab

A hardened REST API with a built-in attack simulation panel. Demonstrates layered security defense and offensive security thinking.

## What's inside

| Package | Purpose |
|---------|---------|
| `server/` | Hardened Express API with JWT, bcrypt, rate limiting, helmet, CORS, input validation |
| `attacker/` | Attack simulation panel — fires real payloads, prints PASS/FAIL report |

## Quick Start

### 1. Start the server
```bash
cd server
cp .env.example .env
npm install
node src/app.js
```

### 2. Run the attack panel (new terminal)
```bash
cd attacker
npm install
node report.js
```

### 3. Expected output
```
[PASS] Brute Force             → 429 Too Many Requests triggered
[PASS] JWT Tampering           → 401 Unauthorized
[PASS] SQL Injection           → All payloads blocked (400)
[PASS] Rate Limit Bypass       → Spoofed headers ignored
[PASS] CORS Probe              → Unknown origin blocked
Result: 5/5 attacks blocked — ALL DEFENSES HELD ✓
```

## API Endpoints

| Method | Path | Auth | Description |
|--------|------|------|-------------|
| GET | `/health` | None | Health check |
| POST | `/auth/register` | None | Register user |
| POST | `/auth/login` | None | Login, returns JWT |
| GET | `/api/profile` | JWT | Get profile |
| GET | `/api/admin` | JWT | Admin endpoint |

## Security layers

See [SECURITY.md](./SECURITY.md) for full documentation of every security layer and OWASP Top 10 coverage.
