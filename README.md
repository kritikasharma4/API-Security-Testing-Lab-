# API Security Testing Lab

A full-stack security lab that fires real attack payloads against a hardened REST API and shows you what happens — live. Built to demonstrate both offensive security thinking and layered API defense.

**Live demo:** [client-mu-ashen-58.vercel.app](https://client-mu-ashen-58.vercel.app)  
**API:** [api-security-testing-lab.onrender.com](https://api-security-testing-lab.onrender.com/health)

---

## What it does

The frontend runs six attack scenarios against the live server, one by one, and shows a real-time PASS/FAIL result for each. A live log stream panel shows server-side events as they happen — rate limit triggers, bad token rejections, honeypot probes — streamed from the server over SSE. After all attacks complete, an OWASP Top 10 scorecard maps each result to the risk it covers.

---

## Attack scenarios

| Scenario | What it does | Defense tested |
|----------|-------------|----------------|
| **JWT Tampering** | Gets a valid token, modifies the payload (escalates role to `superadmin`), re-signs with a fake signature | Signature verification rejects tampered tokens with 401 |
| **SQL Injection** | Fires 3 classic injection payloads (`OR 1=1 --`, `DROP TABLE users`, etc.) at the login endpoint | Input validation blocks all malformed inputs before they reach the DB |
| **CORS Probe** | Sends requests with `Origin: https://evil.com` | CORS whitelist only permits the known frontend origin |
| **Honeypot** | Probes an unprotected-looking endpoint `/api/secret` | Server serves convincing fake credentials and logs the probe as an ALERT |
| **Brute Force** | Makes 10 rapid login attempts against a real account | Login rate limiter triggers 429 after 5 attempts |
| **Rate Limit Bypass** | Spoofs `X-Forwarded-For` headers to fake a different IP after hitting the limit | Server ignores untrusted proxy headers |

---

## Security layers

| Layer | Implementation | What it stops |
|-------|---------------|--------------|
| Password hashing | bcrypt (saltRounds=12) | Credential leaks — hashes are computationally expensive to crack |
| JWT authentication | HS256, 1hr expiry, secret from env | Forged tokens, session hijacking |
| Rate limiting | express-rate-limit (5 login / 100 global per 15min per IP) | Brute force, credential stuffing |
| Security headers | helmet | Clickjacking (X-Frame-Options), MIME sniffing, XSS, enforces HTTPS |
| CORS whitelist | cors (exact origin match, no wildcard) | Cross-origin requests from untrusted domains |
| Input validation | express-validator (sanitize + length check all inputs) | SQL injection, malformed payloads |
| Honeypot detection | Unprotected `/api/secret` that serves fake data + emits ALERT | Logs automated probes that enumerate endpoints |
| Error handling | Global handler — no stack traces exposed to clients | Information disclosure |

---

## Live log stream

The server emits structured events to a singleton `EventEmitter` (`logBus`) whenever anything security-relevant happens. A `/logs/stream` SSE endpoint forwards those events to any connected browser. The frontend subscribes via `EventSource` when attacks start and shows a terminal-style panel with color-coded entries:

- `[INFO]` — every request with method, path, status
- `[WARN]` — bad or missing tokens, auth failures
- `[ALERT]` — rate limit triggers, honeypot probes

---

## OWASP Top 10 coverage

| Risk | Tested by | Pass condition |
|------|-----------|----------------|
| A01 Broken Access Control | JWT Tampering | Tampered token rejected with 401 |
| A02 Cryptographic Failures | JWT Tampering | Fake signature not accepted |
| A03 Injection | SQL Injection | All payloads blocked before reaching storage |
| A05 Security Misconfiguration | CORS Probe | Unknown origin blocked |
| A07 Authentication Failures | Brute Force | Rate limiter stops login attempts |

---

## Project structure

```
.
├── server/          Express API (Node.js) — deployed on Render
│   └── src/
│       ├── app.js               Entry point, middleware stack
│       ├── logBus.js            Singleton EventEmitter for log events
│       ├── routes/
│       │   ├── auth.js          /auth/register, /auth/login
│       │   ├── api.js           /api/profile, /api/admin, /api/secret (honeypot)
│       │   └── logs.js          /logs/stream (SSE endpoint)
│       └── middleware/
│           ├── verifyToken.js   JWT guard
│           ├── rateLimiter.js   Global + login rate limiters
│           └── errorHandler.js  Global error handler
│
├── client/          React + Vite + TypeScript — deployed on Vercel
│   └── src/
│       ├── App.tsx              State coordination (log active, results)
│       ├── components/
│       │   ├── AttackPanel.tsx  Runs scenarios, calls onStart/onComplete
│       │   ├── AttackCard.tsx   Individual scenario card with status
│       │   ├── LogPanel.tsx     SSE terminal panel (EventSource)
│       │   ├── OWASPCard.tsx    Post-run OWASP scorecard
│       │   └── SecurityLayers.tsx  Static defense overview
│       └── scenarios/
│           ├── jwtTampering.ts
│           ├── sqlInjection.ts
│           ├── corsProbe.ts
│           ├── honeypot.ts
│           ├── bruteForce.ts
│           └── rateLimitBypass.ts
│
└── attacker/        CLI attack runner (original Node.js version)
```

---

## API endpoints

| Method | Path | Auth | Description |
|--------|------|------|-------------|
| GET | `/health` | None | Health check |
| POST | `/auth/register` | None | Register a user (bcrypt hash stored) |
| POST | `/auth/login` | None | Login, returns signed JWT |
| GET | `/api/profile` | JWT | Protected profile endpoint |
| GET | `/api/admin` | JWT | Protected admin endpoint |
| GET | `/api/secret` | None | Honeypot — logs all probes, returns fake data |
| GET | `/logs/stream` | None | SSE stream of server log events |

---

## Run locally

```bash
# 1. Clone
git clone https://github.com/kritikasharma4/API-Security-Testing-Lab-.git
cd API-Security-Testing-Lab-

# 2. Start the server
cd server
cp .env.example .env        # fill in JWT_SECRET=any-long-random-string
npm install
node src/app.js             # runs on port 4000

# 3. Start the frontend (new terminal)
cd client
npm install
npm run dev                 # runs on http://localhost:5173

# 4. Open http://localhost:5173 and click "Run All Attacks"
```

Set `VITE_SERVER_URL=http://localhost:4000` in `client/.env` if the frontend can't reach the server.

---

## Tech stack

**Server:** Node.js, Express, jsonwebtoken, bcryptjs, express-rate-limit, express-validator, helmet, cors  
**Client:** React 18, Vite, TypeScript, Tailwind CSS v3, shadcn/ui, lucide-react  
**Deployment:** Render (server) + Vercel (client)
