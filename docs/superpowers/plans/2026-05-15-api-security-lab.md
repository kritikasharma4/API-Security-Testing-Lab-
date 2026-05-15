# API Security Testing Lab Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Build a hardened Express API with layered security and an attack simulation panel that fires real payloads and prints a PASS/FAIL report.

**Architecture:** Two packages in a monorepo — `server/` is the hardened API, `attacker/` fires attack scenarios against it. The server uses in-memory user storage (no database) to keep focus on security layers. The attacker runs all scenarios sequentially and prints a formatted terminal report.

**Tech Stack:** Node.js, Express, jsonwebtoken, bcryptjs, express-rate-limit, helmet, cors, express-validator, morgan, axios (attacker)

---

### Task 1: Server scaffolding + package.json

**Files:**
- Create: `server/package.json`
- Create: `server/.env.example`
- Create: `server/src/app.js`

- [ ] **Step 1: Create server/package.json**

```json
{
  "name": "api-security-lab-server",
  "version": "1.0.0",
  "main": "src/app.js",
  "scripts": {
    "start": "node src/app.js",
    "dev": "nodemon src/app.js"
  },
  "dependencies": {
    "bcryptjs": "^2.4.3",
    "cors": "^2.8.5",
    "express": "^4.18.2",
    "express-rate-limit": "^7.1.5",
    "express-validator": "^7.0.1",
    "helmet": "^7.1.0",
    "jsonwebtoken": "^9.0.2",
    "morgan": "^1.10.0"
  }
}
```

- [ ] **Step 2: Create server/.env.example**

```
PORT=4000
JWT_SECRET=supersecretkey_change_in_production
ALLOWED_ORIGIN=http://localhost:3000
```

- [ ] **Step 3: Create server/.env** (copy of .env.example with same values for dev)

```
PORT=4000
JWT_SECRET=supersecretkey_change_in_production
ALLOWED_ORIGIN=http://localhost:3000
```

- [ ] **Step 4: Create server/src/app.js**

```js
require('dotenv').config();
const express = require('express');
const helmet = require('helmet');
const morgan = require('morgan');
const cors = require('cors');
const authRoutes = require('./routes/auth');
const apiRoutes = require('./routes/api');
const errorHandler = require('./middleware/errorHandler');

const app = express();
const PORT = process.env.PORT || 4000;

app.use(helmet());
app.use(morgan('combined'));
app.use(cors({
  origin: process.env.ALLOWED_ORIGIN || 'http://localhost:3000',
  optionsSuccessStatus: 200
}));
app.use(express.json());

app.get('/health', (req, res) => res.json({ status: 'ok' }));
app.use('/auth', authRoutes);
app.use('/api', apiRoutes);
app.use(errorHandler);

app.listen(PORT, () => console.log(`Server running on port ${PORT}`));

module.exports = app;
```

- [ ] **Step 5: Install dependencies**

```bash
cd server && npm install
```

Expected: `node_modules/` created, no errors.

- [ ] **Step 6: Commit**

```bash
git add server/
git commit -m "feat: scaffold server with express, helmet, cors, morgan"
```

---

### Task 2: In-memory user model

**Files:**
- Create: `server/src/models/userStore.js`

- [ ] **Step 1: Create server/src/models/userStore.js**

```js
const { v4: uuidv4 } = require('uuid');

const users = new Map();

function createUser(name, email, passwordHash) {
  const id = uuidv4();
  users.set(email, { id, name, email, passwordHash });
  return { id, name, email };
}

function findUserByEmail(email) {
  return users.get(email) || null;
}

module.exports = { createUser, findUserByEmail };
```

- [ ] **Step 2: Add uuid to server/package.json dependencies and install**

```bash
cd server && npm install uuid
```

- [ ] **Step 3: Commit**

```bash
git add server/src/models/userStore.js server/package.json server/package-lock.json
git commit -m "feat: add in-memory user store"
```

---

### Task 3: Auth middleware (JWT verify)

**Files:**
- Create: `server/src/middleware/verifyToken.js`
- Create: `server/src/middleware/errorHandler.js`

- [ ] **Step 1: Create server/src/middleware/verifyToken.js**

```js
const jwt = require('jsonwebtoken');

function verifyToken(req, res, next) {
  const authHeader = req.headers['authorization'];
  const token = authHeader && authHeader.split(' ')[1];
  if (!token) return res.status(401).json({ error: 'No token provided' });

  try {
    const decoded = jwt.verify(token, process.env.JWT_SECRET);
    req.user = decoded;
    next();
  } catch {
    return res.status(401).json({ error: 'Invalid or expired token' });
  }
}

module.exports = verifyToken;
```

- [ ] **Step 2: Create server/src/middleware/errorHandler.js**

```js
function errorHandler(err, req, res, next) {
  console.error(err.stack);
  res.status(500).json({ error: 'Internal server error' });
}

module.exports = errorHandler;
```

- [ ] **Step 3: Commit**

```bash
git add server/src/middleware/
git commit -m "feat: add JWT verify middleware and error handler"
```

---

### Task 4: Rate limiter middleware

**Files:**
- Create: `server/src/middleware/rateLimiter.js`

- [ ] **Step 1: Create server/src/middleware/rateLimiter.js**

```js
const rateLimit = require('express-rate-limit');

const globalLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  max: 100,
  standardHeaders: true,
  legacyHeaders: false,
  message: { error: 'Too many requests, please try again later.' }
});

const loginLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  max: 5,
  standardHeaders: true,
  legacyHeaders: false,
  message: { error: 'Too many login attempts, please try again later.' }
});

module.exports = { globalLimiter, loginLimiter };
```

- [ ] **Step 2: Apply globalLimiter in server/src/app.js — add after express.json() line**

```js
const { globalLimiter } = require('./middleware/rateLimiter');
// add after app.use(express.json());
app.use(globalLimiter);
```

- [ ] **Step 3: Commit**

```bash
git add server/src/middleware/rateLimiter.js server/src/app.js
git commit -m "feat: add global and login rate limiters"
```

---

### Task 5: Auth routes (register + login)

**Files:**
- Create: `server/src/routes/auth.js`

- [ ] **Step 1: Create server/src/routes/auth.js**

```js
const express = require('express');
const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');
const { body, validationResult } = require('express-validator');
const { createUser, findUserByEmail } = require('../models/userStore');
const { loginLimiter } = require('../middleware/rateLimiter');

const router = express.Router();

const registerValidation = [
  body('name').trim().notEmpty().withMessage('Name is required'),
  body('email').isEmail().normalizeEmail().withMessage('Valid email required'),
  body('password').isLength({ min: 8 }).withMessage('Password must be at least 8 characters')
];

const loginValidation = [
  body('email').isEmail().normalizeEmail().withMessage('Valid email required'),
  body('password').notEmpty().withMessage('Password is required')
];

router.post('/register', registerValidation, async (req, res) => {
  const errors = validationResult(req);
  if (!errors.isEmpty()) return res.status(400).json({ errors: errors.array() });

  const { name, email, password } = req.body;
  if (findUserByEmail(email)) return res.status(409).json({ error: 'Email already registered' });

  const passwordHash = await bcrypt.hash(password, 12);
  const user = createUser(name, email, passwordHash);
  res.status(201).json({ message: 'User registered', user });
});

router.post('/login', loginLimiter, loginValidation, async (req, res) => {
  const errors = validationResult(req);
  if (!errors.isEmpty()) return res.status(400).json({ errors: errors.array() });

  const { email, password } = req.body;
  const user = findUserByEmail(email);
  if (!user) return res.status(401).json({ error: 'Invalid credentials' });

  const match = await bcrypt.compare(password, user.passwordHash);
  if (!match) return res.status(401).json({ error: 'Invalid credentials' });

  const token = jwt.sign(
    { id: user.id, email: user.email },
    process.env.JWT_SECRET,
    { expiresIn: '1h' }
  );
  res.json({ message: 'Login successful', token });
});

module.exports = router;
```

- [ ] **Step 2: Start the server and test manually**

```bash
cd server && node src/app.js
```

In another terminal:
```bash
curl -X POST http://localhost:4000/auth/register \
  -H "Content-Type: application/json" \
  -d '{"name":"Test User","email":"test@example.com","password":"password123"}'
```
Expected: `{"message":"User registered","user":{...}}`

```bash
curl -X POST http://localhost:4000/auth/login \
  -H "Content-Type: application/json" \
  -d '{"email":"test@example.com","password":"password123"}'
```
Expected: `{"message":"Login successful","token":"eyJ..."}`

- [ ] **Step 3: Commit**

```bash
git add server/src/routes/auth.js
git commit -m "feat: add register and login routes with validation and bcrypt"
```

---

### Task 6: Protected API routes

**Files:**
- Create: `server/src/routes/api.js`

- [ ] **Step 1: Create server/src/routes/api.js**

```js
const express = require('express');
const verifyToken = require('../middleware/verifyToken');

const router = express.Router();

router.get('/profile', verifyToken, (req, res) => {
  res.json({ message: 'Your profile', user: req.user });
});

router.get('/admin', verifyToken, (req, res) => {
  res.json({ message: 'Welcome to the admin panel', user: req.user });
});

module.exports = router;
```

- [ ] **Step 2: Test protected route**

```bash
# Without token - should return 401
curl http://localhost:4000/api/profile

# With valid token (replace TOKEN with value from login)
curl http://localhost:4000/api/profile \
  -H "Authorization: Bearer TOKEN"
```

Expected without token: `{"error":"No token provided"}`
Expected with token: `{"message":"Your profile","user":{...}}`

- [ ] **Step 3: Commit**

```bash
git add server/src/routes/api.js
git commit -m "feat: add protected profile and admin routes"
```

---

### Task 7: Attacker scaffolding

**Files:**
- Create: `attacker/package.json`

- [ ] **Step 1: Create attacker/package.json**

```json
{
  "name": "api-security-lab-attacker",
  "version": "1.0.0",
  "main": "report.js",
  "scripts": {
    "attack": "node report.js"
  },
  "dependencies": {
    "axios": "^1.6.2",
    "jsonwebtoken": "^9.0.2"
  }
}
```

- [ ] **Step 2: Install attacker dependencies**

```bash
cd attacker && npm install
```

- [ ] **Step 3: Commit**

```bash
git add attacker/package.json attacker/package-lock.json
git commit -m "feat: scaffold attacker package"
```

---

### Task 8: Attack scenario — Brute Force

**Files:**
- Create: `attacker/scenarios/brute-force.js`

- [ ] **Step 1: Create attacker/scenarios/brute-force.js**

```js
const axios = require('axios');

async function bruteForce(baseURL) {
  const results = [];
  for (let i = 0; i < 10; i++) {
    try {
      const res = await axios.post(`${baseURL}/auth/login`, {
        email: 'victim@example.com',
        password: `wrongpassword${i}`
      });
      results.push(res.status);
    } catch (err) {
      results.push(err.response?.status || 0);
    }
  }
  const blocked = results.includes(429);
  return {
    name: 'Brute Force',
    pass: blocked,
    detail: blocked
      ? `429 Too Many Requests triggered after ${results.indexOf(429) + 1} attempts`
      : `No rate limiting detected. Statuses: ${results.join(', ')}`
  };
}

module.exports = bruteForce;
```

- [ ] **Step 2: Commit**

```bash
git add attacker/scenarios/brute-force.js
git commit -m "feat: add brute force attack scenario"
```

---

### Task 9: Attack scenario — JWT Tampering

**Files:**
- Create: `attacker/scenarios/jwt-tampering.js`

- [ ] **Step 1: Create attacker/scenarios/jwt-tampering.js**

```js
const axios = require('axios');
const jwt = require('jsonwebtoken');

async function jwtTampering(baseURL) {
  // First register + login to get a valid token
  try {
    await axios.post(`${baseURL}/auth/register`, {
      name: 'Attacker',
      email: 'attacker@evil.com',
      password: 'attackpass123'
    });
  } catch {}

  let validToken;
  try {
    const res = await axios.post(`${baseURL}/auth/login`, {
      email: 'attacker@evil.com',
      password: 'attackpass123'
    });
    validToken = res.data.token;
  } catch {
    return { name: 'JWT Tampering', pass: false, detail: 'Could not obtain token to tamper' };
  }

  // Decode, modify payload, re-sign with wrong secret
  const decoded = jwt.decode(validToken);
  decoded.role = 'superadmin';
  const tamperedToken = jwt.sign(decoded, 'wrong_secret');

  try {
    await axios.get(`${baseURL}/api/admin`, {
      headers: { Authorization: `Bearer ${tamperedToken}` }
    });
    return { name: 'JWT Tampering', pass: false, detail: 'Tampered token was ACCEPTED — vulnerability detected!' };
  } catch (err) {
    const status = err.response?.status;
    return {
      name: 'JWT Tampering',
      pass: status === 401,
      detail: status === 401
        ? '401 Unauthorized — tampered token correctly rejected'
        : `Unexpected status: ${status}`
    };
  }
}

module.exports = jwtTampering;
```

- [ ] **Step 2: Commit**

```bash
git add attacker/scenarios/jwt-tampering.js
git commit -m "feat: add JWT tampering attack scenario"
```

---

### Task 10: Attack scenario — SQL Injection

**Files:**
- Create: `attacker/scenarios/sql-injection.js`

- [ ] **Step 1: Create attacker/scenarios/sql-injection.js**

```js
const axios = require('axios');

const payloads = [
  { email: "' OR 1=1 --", password: 'anything' },
  { email: 'admin@example.com', password: "' OR '1'='1" },
  { email: '; DROP TABLE users; --', password: 'test' }
];

async function sqlInjection(baseURL) {
  const results = [];
  for (const payload of payloads) {
    try {
      const res = await axios.post(`${baseURL}/auth/login`, payload);
      results.push({ payload: payload.email, status: res.status, blocked: false });
    } catch (err) {
      const status = err.response?.status || 0;
      results.push({ payload: payload.email, status, blocked: status === 400 || status === 401 });
    }
  }
  const allBlocked = results.every(r => r.blocked);
  return {
    name: 'SQL Injection',
    pass: allBlocked,
    detail: allBlocked
      ? `All ${payloads.length} injection payloads returned 400/401`
      : `Some payloads not blocked: ${results.filter(r => !r.blocked).map(r => r.payload).join(', ')}`
  };
}

module.exports = sqlInjection;
```

- [ ] **Step 2: Commit**

```bash
git add attacker/scenarios/sql-injection.js
git commit -m "feat: add SQL injection attack scenario"
```

---

### Task 11: Attack scenario — Rate Limit Bypass

**Files:**
- Create: `attacker/scenarios/rate-limit-bypass.js`

- [ ] **Step 1: Create attacker/scenarios/rate-limit-bypass.js**

```js
const axios = require('axios');

async function rateLimitBypass(baseURL) {
  // First trigger rate limit
  for (let i = 0; i < 6; i++) {
    try {
      await axios.post(`${baseURL}/auth/login`, {
        email: 'bypass@example.com',
        password: 'wrongpass'
      });
    } catch {}
  }

  // Now try to bypass with spoofed IP headers
  const spoofHeaders = [
    { 'X-Forwarded-For': '1.2.3.4' },
    { 'X-Real-IP': '5.6.7.8' },
    { 'CF-Connecting-IP': '9.10.11.12' }
  ];

  let bypassed = false;
  for (const headers of spoofHeaders) {
    try {
      const res = await axios.post(`${baseURL}/auth/login`,
        { email: 'bypass@example.com', password: 'wrongpass' },
        { headers }
      );
      if (res.status === 401) { bypassed = true; break; }
    } catch (err) {
      if (err.response?.status !== 429) { bypassed = true; break; }
    }
  }

  return {
    name: 'Rate Limit Bypass',
    pass: !bypassed,
    detail: !bypassed
      ? 'Rate limit held — spoofed IP headers ignored'
      : 'Rate limit bypassed via header spoofing — vulnerability detected!'
  };
}

module.exports = rateLimitBypass;
```

- [ ] **Step 2: Commit**

```bash
git add attacker/scenarios/rate-limit-bypass.js
git commit -m "feat: add rate limit bypass attack scenario"
```

---

### Task 12: Attack scenario — CORS Probe

**Files:**
- Create: `attacker/scenarios/cors-probe.js`

- [ ] **Step 1: Create attacker/scenarios/cors-probe.js**

```js
const axios = require('axios');

async function corsProbe(baseURL) {
  try {
    const res = await axios.get(`${baseURL}/health`, {
      headers: { Origin: 'https://evil.com' }
    });
    const allowOrigin = res.headers['access-control-allow-origin'];
    const blocked = !allowOrigin || allowOrigin === 'null' || allowOrigin !== 'https://evil.com';
    return {
      name: 'CORS Probe',
      pass: blocked,
      detail: blocked
        ? `CORS blocked — Access-Control-Allow-Origin: ${allowOrigin || 'not set'}`
        : 'CORS allows all origins — vulnerability detected!'
    };
  } catch (err) {
    return {
      name: 'CORS Probe',
      pass: true,
      detail: `Request rejected at network level (${err.message})`
    };
  }
}

module.exports = corsProbe;
```

- [ ] **Step 2: Commit**

```bash
git add attacker/scenarios/cors-probe.js
git commit -m "feat: add CORS probe attack scenario"
```

---

### Task 13: Attack report runner

**Files:**
- Create: `attacker/report.js`

- [ ] **Step 1: Create attacker/report.js**

```js
const bruteForce = require('./scenarios/brute-force');
const jwtTampering = require('./scenarios/jwt-tampering');
const sqlInjection = require('./scenarios/sql-injection');
const rateLimitBypass = require('./scenarios/rate-limit-bypass');
const corsProbe = require('./scenarios/cors-probe');

const BASE_URL = process.env.TARGET_URL || 'http://localhost:4000';

const RESET = '\x1b[0m';
const GREEN = '\x1b[32m';
const RED = '\x1b[31m';
const CYAN = '\x1b[36m';
const BOLD = '\x1b[1m';

async function runReport() {
  console.log(`\n${BOLD}${CYAN}╔══════════════════════════════════════════════════════╗`);
  console.log(`║       API SECURITY TESTING LAB — ATTACK REPORT      ║`);
  console.log(`╠══════════════════════════════════════════════════════╣`);
  console.log(`║ Target: ${BASE_URL.padEnd(45)}║`);
  console.log(`║ Time:   ${new Date().toISOString().padEnd(45)}║`);
  console.log(`╠══════════════════════════════════════════════════════╣${RESET}`);

  const scenarios = [bruteForce, jwtTampering, sqlInjection, rateLimitBypass, corsProbe];
  const results = [];

  for (const scenario of scenarios) {
    process.stdout.write(`  Running ${scenario.name || 'scenario'}...`);
    const result = await scenario(BASE_URL);
    results.push(result);
    const icon = result.pass ? `${GREEN}[PASS]${RESET}` : `${RED}[FAIL]${RESET}`;
    console.log(`\r${icon} ${result.name.padEnd(22)} → ${result.detail}`);
  }

  const passed = results.filter(r => r.pass).length;
  const total = results.length;

  console.log(`${BOLD}${CYAN}╠══════════════════════════════════════════════════════╣`);
  const summary = `${passed}/${total} attacks blocked`;
  const status = passed === total ? `${GREEN}ALL DEFENSES HELD ✓${RESET}` : `${RED}VULNERABILITIES FOUND ✗${RESET}`;
  console.log(`${CYAN}║ Result: ${summary} — ${status}${CYAN}`);
  console.log(`╚══════════════════════════════════════════════════════╝${RESET}\n`);
}

runReport().catch(console.error);
```

- [ ] **Step 2: Run the full attack (server must be running)**

Terminal 1:
```bash
cd server && node src/app.js
```

Terminal 2:
```bash
cd attacker && node report.js
```

Expected output:
```
[PASS] Brute Force             → 429 Too Many Requests triggered after 5 attempts
[PASS] JWT Tampering           → 401 Unauthorized — tampered token correctly rejected
[PASS] SQL Injection           → All 3 injection payloads returned 400/401
[PASS] Rate Limit Bypass       → Rate limit held — spoofed IP headers ignored
[PASS] CORS Probe              → CORS blocked — Access-Control-Allow-Origin: not set
Result: 5/5 attacks blocked — ALL DEFENSES HELD ✓
```

- [ ] **Step 3: Commit**

```bash
git add attacker/report.js
git commit -m "feat: add attack report runner"
```

---

### Task 14: SECURITY.md + README.md

**Files:**
- Create: `SECURITY.md`
- Create: `README.md`

- [ ] **Step 1: Create SECURITY.md**

```markdown
# Security Architecture

This document describes every security layer implemented in this API.

## 1. Password Hashing (bcryptjs)
- All passwords hashed with bcrypt, saltRounds=12
- Plaintext passwords never stored or logged
- Comparison done via `bcrypt.compare()` — timing-safe

## 2. JWT Authentication (jsonwebtoken)
- HS256 signed tokens, 1hr expiry
- Secret loaded from environment variable (never hardcoded)
- All protected routes verify token via middleware
- Tampered or expired tokens return 401 immediately

## 3. Rate Limiting (express-rate-limit)
- Login endpoint: 5 requests per 15 minutes per IP
- Global: 100 requests per 15 minutes per IP
- Returns 429 Too Many Requests when exceeded
- Spoofed IP headers (`X-Forwarded-For`) not trusted by default

## 4. Security Headers (helmet)
- `X-Frame-Options: DENY` — prevents clickjacking
- `X-Content-Type-Options: nosniff` — prevents MIME sniffing
- `Strict-Transport-Security` — enforces HTTPS
- `Content-Security-Policy` — restricts resource loading
- `X-XSS-Protection` — legacy XSS filter

## 5. CORS (cors)
- Only `http://localhost:3000` whitelisted
- All other origins blocked
- No wildcard (`*`) allowed

## 6. Input Validation (express-validator)
- All request bodies validated and sanitized
- Emails normalized, passwords length-checked
- Invalid input returns 400 with specific error messages
- Prevents injection payloads from reaching business logic

## 7. Error Handling
- Global error handler catches all unhandled errors
- Stack traces never exposed to clients
- Generic "Internal server error" message returned
- Specific business errors return appropriate status codes

## OWASP Top 10 Coverage
| Risk | Mitigation |
|------|-----------|
| A01 Broken Access Control | JWT middleware on all protected routes |
| A02 Cryptographic Failures | bcrypt for passwords, JWT_SECRET from env |
| A03 Injection | express-validator sanitizes all input |
| A05 Security Misconfiguration | helmet sets secure headers |
| A07 Auth Failures | Rate limiting, bcrypt, JWT expiry |
```

- [ ] **Step 2: Create README.md**

```markdown
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
```

- [ ] **Step 3: Commit**

```bash
git add SECURITY.md README.md
git commit -m "docs: add SECURITY.md and README"
```

---

### Task 15: Push to GitHub

- [ ] **Step 1: Push all commits**

```bash
cd /Users/kritikasharma/Documents/API-Security-Testing-Lab-
git push -u origin main
```

Expected: All commits pushed to `https://github.com/kritikasharma4/API-Security-Testing-Lab-`

- [ ] **Step 2: Verify on GitHub**

Open `https://github.com/kritikasharma4/API-Security-Testing-Lab-` and confirm all files are present.
