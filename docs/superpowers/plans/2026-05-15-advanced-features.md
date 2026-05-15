# Advanced Features Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Add three features to the API Security Testing Lab: a live SSE log stream showing server events in real time, a honeypot endpoint that serves convincing fake data and logs probes, and an OWASP Top 10 score card that appears after attacks complete.

**Architecture:** Server gets a singleton `logBus` EventEmitter that all middleware/routes emit to, plus a `/logs/stream` SSE endpoint that forwards those events to the browser. The honeypot is a new unprotected route that emits ALERT events. The frontend gets a LogPanel component (EventSource-based), a honeypot scenario, and an OWASPCard component. AttackPanel is refactored to accept `onComplete` and `onStart` callbacks so App.tsx can coordinate LogPanel and OWASPCard.

**Tech Stack:** Node.js EventEmitter (SSE), React useState/useRef/useEffect (LogPanel), TypeScript, Tailwind CSS, existing Express/React stack.

---

### Task 1: logBus singleton (server)

**Files:**
- Create: `server/src/logBus.js`

- [ ] **Step 1: Create `server/src/logBus.js`**

```js
const EventEmitter = require('events');

const logBus = new EventEmitter();
logBus.setMaxListeners(50);

module.exports = logBus;
```

- [ ] **Step 2: Verify it loads without error**

```bash
cd /Users/kritikasharma/Documents/API-Security-Testing-Lab-/server
node -e "const b = require('./src/logBus'); console.log(b.eventNames());"
```

Expected: `[]`

- [ ] **Step 3: Commit**

```bash
cd /Users/kritikasharma/Documents/API-Security-Testing-Lab-
git add server/src/logBus.js
git commit -m "feat: add logBus singleton EventEmitter"
```

---

### Task 2: SSE log stream endpoint (server)

**Files:**
- Create: `server/src/routes/logs.js`
- Modify: `server/src/app.js`

- [ ] **Step 1: Create `server/src/routes/logs.js`**

```js
const express = require('express');
const logBus = require('../logBus');

const router = express.Router();

router.get('/stream', (req, res) => {
  res.setHeader('Content-Type', 'text/event-stream');
  res.setHeader('Cache-Control', 'no-cache');
  res.setHeader('Connection', 'keep-alive');
  res.flushHeaders();

  const send = (event) => {
    res.write(`data: ${JSON.stringify(event)}\n\n`);
  };

  send({ type: 'INFO', message: 'Log stream connected', timestamp: new Date().toISOString() });

  const keepalive = setInterval(() => {
    res.write(': keepalive\n\n');
  }, 15000);

  logBus.on('log', send);

  req.on('close', () => {
    clearInterval(keepalive);
    logBus.off('log', send);
  });
});

module.exports = router;
```

- [ ] **Step 2: Mount logs route and add request logger in `server/src/app.js`**

Replace the entire file with:

```js
require('dotenv').config();
const express = require('express');
const helmet = require('helmet');
const morgan = require('morgan');
const cors = require('cors');
const authRoutes = require('./routes/auth');
const apiRoutes = require('./routes/api');
const logsRoutes = require('./routes/logs');
const errorHandler = require('./middleware/errorHandler');
const { globalLimiter } = require('./middleware/rateLimiter');
const logBus = require('./logBus');

const app = express();
const PORT = process.env.PORT || 4000;

app.use(helmet());
app.use(morgan('combined'));
app.use(cors({
  origin: process.env.ALLOWED_ORIGIN || 'http://localhost:3000',
  optionsSuccessStatus: 200
}));
app.use(express.json());
app.use(globalLimiter);

app.use((req, res, next) => {
  res.on('finish', () => {
    logBus.emit('log', {
      type: res.statusCode >= 400 ? 'WARN' : 'INFO',
      message: `${req.method} ${req.path} → ${res.statusCode}`,
      timestamp: new Date().toISOString(),
      meta: { ip: req.ip, status: res.statusCode },
    });
  });
  next();
});

app.get('/health', (req, res) => res.json({ status: 'ok' }));
app.use('/auth', authRoutes);
app.use('/api', apiRoutes);
app.use('/logs', logsRoutes);
app.use(errorHandler);

app.listen(PORT, () => console.log(`Server running on port ${PORT}`));

module.exports = app;
```

- [ ] **Step 3: Test SSE endpoint locally**

```bash
cd /Users/kritikasharma/Documents/API-Security-Testing-Lab-/server
node src/app.js &
sleep 1
curl -N http://localhost:4000/logs/stream &
curl http://localhost:4000/health
sleep 2
kill %1 %2
```

Expected: SSE stream prints `data: {"type":"INFO","message":"Log stream connected"...}` then `data: {"type":"INFO","message":"GET /health → 200"...}`

- [ ] **Step 4: Commit**

```bash
cd /Users/kritikasharma/Documents/API-Security-Testing-Lab-
git add server/src/routes/logs.js server/src/app.js
git commit -m "feat: add SSE log stream endpoint at /logs/stream"
```

---

### Task 3: Emit events from middleware (server)

**Files:**
- Modify: `server/src/middleware/rateLimiter.js`
- Modify: `server/src/middleware/verifyToken.js`

- [ ] **Step 1: Replace `server/src/middleware/rateLimiter.js`**

```js
const rateLimit = require('express-rate-limit');
const logBus = require('../logBus');

const globalLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  max: 100,
  standardHeaders: true,
  legacyHeaders: false,
  message: { error: 'Too many requests, please try again later.' },
  handler: (req, res, next, options) => {
    logBus.emit('log', {
      type: 'ALERT',
      message: `Global rate limit triggered for ${req.ip}`,
      timestamp: new Date().toISOString(),
      meta: { ip: req.ip, path: req.path },
    });
    res.status(options.statusCode).json(options.message);
  },
});

const loginLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  max: 5,
  standardHeaders: true,
  legacyHeaders: false,
  message: { error: 'Too many login attempts, please try again later.' },
  handler: (req, res, next, options) => {
    logBus.emit('log', {
      type: 'ALERT',
      message: `Login rate limit triggered — brute force detected from ${req.ip}`,
      timestamp: new Date().toISOString(),
      meta: { ip: req.ip },
    });
    res.status(options.statusCode).json(options.message);
  },
});

module.exports = { globalLimiter, loginLimiter };
```

- [ ] **Step 2: Replace `server/src/middleware/verifyToken.js`**

```js
const jwt = require('jsonwebtoken');
const logBus = require('../logBus');

function verifyToken(req, res, next) {
  const authHeader = req.headers['authorization'];
  const token = authHeader && authHeader.split(' ')[1];

  if (!token) {
    logBus.emit('log', {
      type: 'WARN',
      message: `Unauthenticated request to protected route ${req.path}`,
      timestamp: new Date().toISOString(),
      meta: { ip: req.ip, path: req.path },
    });
    return res.status(401).json({ error: 'No token provided' });
  }

  try {
    const decoded = jwt.verify(token, process.env.JWT_SECRET);
    req.user = decoded;
    next();
  } catch {
    logBus.emit('log', {
      type: 'WARN',
      message: `Invalid or tampered token rejected from ${req.ip}`,
      timestamp: new Date().toISOString(),
      meta: { ip: req.ip, path: req.path },
    });
    return res.status(401).json({ error: 'Invalid or expired token' });
  }
}

module.exports = verifyToken;
```

- [ ] **Step 3: Commit**

```bash
cd /Users/kritikasharma/Documents/API-Security-Testing-Lab-
git add server/src/middleware/rateLimiter.js server/src/middleware/verifyToken.js
git commit -m "feat: emit logBus events from rate limiter and verifyToken middleware"
```

---

### Task 4: Honeypot endpoint (server)

**Files:**
- Modify: `server/src/routes/api.js`

- [ ] **Step 1: Replace `server/src/routes/api.js`**

```js
const express = require('express');
const verifyToken = require('../middleware/verifyToken');
const logBus = require('../logBus');

const router = express.Router();

router.get('/profile', verifyToken, (req, res) => {
  res.json({ message: 'Your profile', user: req.user });
});

router.get('/admin', verifyToken, (req, res) => {
  res.json({ message: 'Welcome to the admin panel', user: req.user });
});

router.get('/secret', (req, res) => {
  logBus.emit('log', {
    type: 'ALERT',
    message: `HONEYPOT TRIGGERED — probe detected from ${req.ip}`,
    timestamp: new Date().toISOString(),
    meta: { ip: req.ip, userAgent: req.headers['user-agent'] },
  });

  res.json({
    warning: 'you should not be here',
    users: [
      { id: 1, email: 'admin@company.com', role: 'superadmin', passwordHash: '$2b$12$fakeHashOnlyForDemo000000000000000000000000000' },
      { id: 2, email: 'cto@company.com', role: 'admin', passwordHash: '$2b$12$anotherFakeHashForDemo0000000000000000000000' },
    ],
    adminToken: 'eyJhbGciOiJIUzI1NiJ9.eyJyb2xlIjoic3VwZXJhZG1pbiJ9.fakeSignatureForDemoOnly',
    dbConnectionString: 'postgresql://admin:sup3rS3cr3t@internal-db:5432/prod',
  });
});

module.exports = router;
```

- [ ] **Step 2: Test honeypot locally**

```bash
cd /Users/kritikasharma/Documents/API-Security-Testing-Lab-/server
node src/app.js &
sleep 1
curl -s http://localhost:4000/api/secret | python3 -m json.tool
kill %1
```

Expected: JSON with `warning`, `users`, `adminToken`, `dbConnectionString` fields, HTTP 200.

- [ ] **Step 3: Commit**

```bash
cd /Users/kritikasharma/Documents/API-Security-Testing-Lab-
git add server/src/routes/api.js
git commit -m "feat: add honeypot endpoint at /api/secret"
```

---

### Task 5: Honeypot scenario (client)

**Files:**
- Create: `client/src/scenarios/honeypot.ts`
- Modify: `client/src/scenarios/index.ts`
- Modify: `client/src/components/AttackCard.tsx`

- [ ] **Step 1: Create `client/src/scenarios/honeypot.ts`**

```ts
import type { ScenarioResult } from './types';

export async function honeypot(baseURL: string): Promise<ScenarioResult> {
  try {
    const res = await fetch(`${baseURL}/api/secret`);
    if (res.ok) {
      const data = await res.json();
      return {
        name: 'Honeypot',
        pass: true,
        detail: `Probe detected & logged — fake credentials served (adminToken: ${String(data.adminToken).slice(0, 20)}...)`,
      };
    }
    return {
      name: 'Honeypot',
      pass: false,
      detail: `Honeypot endpoint returned ${res.status} — not reachable`,
    };
  } catch {
    return {
      name: 'Honeypot',
      pass: false,
      detail: 'Honeypot endpoint unreachable',
    };
  }
}
```

- [ ] **Step 2: Update `client/src/scenarios/index.ts`**

```ts
export { bruteForce } from './bruteForce';
export { jwtTampering } from './jwtTampering';
export { sqlInjection } from './sqlInjection';
export { rateLimitBypass } from './rateLimitBypass';
export { corsProbe } from './corsProbe';
export { honeypot } from './honeypot';
export type { ScenarioResult, ScenarioFn } from './types';
```

- [ ] **Step 3: Add Honeypot to DESCRIPTIONS in `client/src/components/AttackCard.tsx`**

Replace the DESCRIPTIONS constant:

```ts
const DESCRIPTIONS: Record<string, string> = {
  'Brute Force': '10 rapid login attempts — tests rate limiting',
  'JWT Tampering': 'Re-signs a valid token with wrong secret — tests signature verification',
  'SQL Injection': '3 classic injection payloads — tests input validation',
  'Rate Limit Bypass': 'Spoofs IP headers after hitting limit — tests trust config',
  'CORS Probe': 'Sends evil.com Origin header — tests CORS whitelist',
  'Honeypot': 'Probes unprotected /api/secret — tests detection capability',
};
```

- [ ] **Step 4: Verify TypeScript builds**

```bash
cd /Users/kritikasharma/Documents/API-Security-Testing-Lab-/client && npm run build 2>&1 | tail -5
```

Expected: `✓ built in Xms`, no errors.

- [ ] **Step 5: Commit**

```bash
cd /Users/kritikasharma/Documents/API-Security-Testing-Lab-
git add client/src/scenarios/honeypot.ts client/src/scenarios/index.ts client/src/components/AttackCard.tsx
git commit -m "feat: add honeypot attack scenario"
```

---

### Task 6: Refactor AttackPanel to expose callbacks (client)

**Files:**
- Modify: `client/src/components/AttackPanel.tsx`

- [ ] **Step 1: Replace `client/src/components/AttackPanel.tsx`**

```tsx
import { useState } from 'react';
import { Play, RotateCcw } from 'lucide-react';
import { AttackCard } from './AttackCard';
import { bruteForce, jwtTampering, sqlInjection, rateLimitBypass, corsProbe, honeypot } from '../scenarios';
import type { ScenarioResult, ScenarioFn } from '../scenarios/types';
import { cn } from '../lib/utils';

const SERVER_URL = import.meta.env.VITE_SERVER_URL || 'https://api-security-testing-lab.onrender.com';

const SCENARIOS: { fn: ScenarioFn; name: string }[] = [
  { fn: jwtTampering, name: 'JWT Tampering' },
  { fn: sqlInjection, name: 'SQL Injection' },
  { fn: corsProbe, name: 'CORS Probe' },
  { fn: honeypot, name: 'Honeypot' },
  { fn: bruteForce, name: 'Brute Force' },
  { fn: rateLimitBypass, name: 'Rate Limit Bypass' },
];

type CardStatus = 'idle' | 'running' | 'done';

interface CardState {
  status: CardStatus;
  result?: ScenarioResult;
}

interface AttackPanelProps {
  onStart: () => void;
  onComplete: (results: ScenarioResult[]) => void;
  onReset: () => void;
}

export function AttackPanel({ onStart, onComplete, onReset }: AttackPanelProps) {
  const [cards, setCards] = useState<CardState[]>(SCENARIOS.map(() => ({ status: 'idle' })));
  const [running, setRunning] = useState(false);
  const [done, setDone] = useState(false);

  async function runAll() {
    setRunning(true);
    setDone(false);
    setCards(SCENARIOS.map(() => ({ status: 'idle' })));
    onStart();

    const results: ScenarioResult[] = [];
    for (let i = 0; i < SCENARIOS.length; i++) {
      setCards(prev => prev.map((c, idx) => idx === i ? { status: 'running' } : c));
      const result = await SCENARIOS[i].fn(SERVER_URL);
      results.push(result);
      setCards(prev => prev.map((c, idx) => idx === i ? { status: 'done', result } : c));
    }

    setRunning(false);
    setDone(true);
    onComplete(results);
  }

  function reset() {
    setCards(SCENARIOS.map(() => ({ status: 'idle' })));
    setDone(false);
    onReset();
  }

  const results = cards.filter(c => c.status === 'done' && c.result).map(c => c.result!);
  const passed = results.filter(r => r.pass).length;

  return (
    <section className="mx-auto max-w-4xl px-6 py-8">
      <div className="flex items-center justify-between mb-6">
        <div>
          <h2 className="text-lg font-semibold text-white">Attack Panel</h2>
          <p className="text-sm text-zinc-400 mt-0.5">Fires real payloads against the live API</p>
        </div>
        <div className="flex gap-2">
          {done && (
            <button
              onClick={reset}
              className="flex items-center gap-2 px-4 py-2 rounded-lg text-sm font-medium bg-zinc-800 text-zinc-300 hover:bg-zinc-700 transition-colors"
            >
              <RotateCcw className="h-4 w-4" /> Reset
            </button>
          )}
          <button
            onClick={runAll}
            disabled={running}
            className={cn(
              'flex items-center gap-2 px-4 py-2 rounded-lg text-sm font-medium transition-colors',
              running
                ? 'bg-zinc-700 text-zinc-400 cursor-not-allowed'
                : 'bg-emerald-600 text-white hover:bg-emerald-500',
            )}
          >
            <Play className="h-4 w-4" />
            {running ? 'Running...' : 'Run All Attacks'}
          </button>
        </div>
      </div>

      <div className="space-y-3">
        {SCENARIOS.map((s, i) => (
          <AttackCard
            key={s.name}
            name={s.name}
            description=""
            status={cards[i].status}
            result={cards[i].result}
          />
        ))}
      </div>

      {done && (
        <div className={cn(
          'mt-6 rounded-lg border p-4 text-center',
          passed === SCENARIOS.length
            ? 'border-emerald-700 bg-emerald-950/40 text-emerald-400'
            : 'border-red-700 bg-red-950/40 text-red-400',
        )}>
          <p className="font-semibold text-lg">
            {passed}/{SCENARIOS.length} attacks blocked
            {passed === SCENARIOS.length ? ' — ALL DEFENSES HELD ✓' : ' — VULNERABILITIES FOUND ✗'}
          </p>
        </div>
      )}
    </section>
  );
}
```

- [ ] **Step 2: Verify TypeScript builds**

```bash
cd /Users/kritikasharma/Documents/API-Security-Testing-Lab-/client && npm run build 2>&1 | tail -5
```

Expected: build fails because App.tsx doesn't pass required props yet — that's fine, fix in next task.

- [ ] **Step 3: Commit**

```bash
cd /Users/kritikasharma/Documents/API-Security-Testing-Lab-
git add client/src/components/AttackPanel.tsx
git commit -m "feat: refactor AttackPanel to accept onStart/onComplete/onReset callbacks"
```

---

### Task 7: LogPanel component (client)

**Files:**
- Create: `client/src/components/LogPanel.tsx`

- [ ] **Step 1: Create `client/src/components/LogPanel.tsx`**

```tsx
import { useEffect, useRef, useState } from 'react';
import { Terminal } from 'lucide-react';

interface LogEvent {
  type: 'INFO' | 'WARN' | 'ALERT';
  message: string;
  timestamp: string;
}

interface LogPanelProps {
  serverURL: string;
  active: boolean;
}

const COLOR: Record<LogEvent['type'], string> = {
  INFO: 'text-emerald-400',
  WARN: 'text-yellow-400',
  ALERT: 'text-red-400',
};

export function LogPanel({ serverURL, active }: LogPanelProps) {
  const [logs, setLogs] = useState<LogEvent[]>([]);
  const bottomRef = useRef<HTMLDivElement>(null);
  const esRef = useRef<EventSource | null>(null);

  useEffect(() => {
    if (active && !esRef.current) {
      const es = new EventSource(`${serverURL}/logs/stream`);
      esRef.current = es;
      es.onmessage = (e) => {
        try {
          const event: LogEvent = JSON.parse(e.data);
          setLogs(prev => [...prev.slice(-99), event]);
        } catch {}
      };
    }
    if (!active && esRef.current) {
      esRef.current.close();
      esRef.current = null;
    }
    return () => {
      if (esRef.current) {
        esRef.current.close();
        esRef.current = null;
      }
    };
  }, [active, serverURL]);

  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [logs]);

  if (!active && logs.length === 0) return null;

  return (
    <section className="mx-auto max-w-4xl px-6 pb-8">
      <div className="rounded-lg border border-zinc-800 bg-black overflow-hidden">
        <div className="flex items-center gap-2 px-4 py-2 border-b border-zinc-800 bg-zinc-950">
          <Terminal className="h-4 w-4 text-zinc-400" />
          <span className="text-xs font-mono text-zinc-400">Live Server Log Stream</span>
          {active && (
            <span className="ml-auto flex items-center gap-1.5 text-xs text-emerald-400">
              <span className="h-1.5 w-1.5 rounded-full bg-emerald-400 animate-pulse" />
              LIVE
            </span>
          )}
        </div>
        <div className="p-4 font-mono text-xs space-y-1 max-h-64 overflow-y-auto">
          {logs.length === 0 && (
            <p className="text-zinc-600">Connecting to log stream...</p>
          )}
          {logs.map((log, i) => (
            <div key={i} className="flex gap-3">
              <span className="text-zinc-600 shrink-0">
                {new Date(log.timestamp).toLocaleTimeString()}
              </span>
              <span className={`shrink-0 font-bold ${COLOR[log.type]}`}>
                [{log.type}]
              </span>
              <span className="text-zinc-300">{log.message}</span>
            </div>
          ))}
          <div ref={bottomRef} />
        </div>
      </div>
    </section>
  );
}
```

- [ ] **Step 2: Verify TypeScript compiles (will still fail at App.tsx level)**

```bash
cd /Users/kritikasharma/Documents/API-Security-Testing-Lab-/client
npx tsc --noEmit 2>&1 | head -20
```

- [ ] **Step 3: Commit**

```bash
cd /Users/kritikasharma/Documents/API-Security-Testing-Lab-
git add client/src/components/LogPanel.tsx
git commit -m "feat: add LogPanel component with EventSource SSE connection"
```

---

### Task 8: OWASPCard component (client)

**Files:**
- Create: `client/src/components/OWASPCard.tsx`

- [ ] **Step 1: Create `client/src/components/OWASPCard.tsx`**

```tsx
import { cn } from '../lib/utils';
import type { ScenarioResult } from '../scenarios/types';

interface OWASPCardProps {
  results: ScenarioResult[];
}

const OWASP_ROWS = [
  { id: 'A01', name: 'Broken Access Control', testedBy: 'JWT Tampering' },
  { id: 'A02', name: 'Cryptographic Failures', testedBy: 'JWT Tampering' },
  { id: 'A03', name: 'Injection', testedBy: 'SQL Injection' },
  { id: 'A05', name: 'Security Misconfiguration', testedBy: 'CORS Probe' },
  { id: 'A07', name: 'Authentication Failures', testedBy: 'Brute Force' },
];

export function OWASPCard({ results }: OWASPCardProps) {
  if (results.length === 0) return null;

  const byName = Object.fromEntries(results.map(r => [r.name, r]));

  return (
    <section className="mx-auto max-w-4xl px-6 pb-12">
      <div className="rounded-lg border border-zinc-800 bg-zinc-900 overflow-hidden">
        <div className="px-5 py-4 border-b border-zinc-800">
          <h2 className="text-sm font-semibold text-white">OWASP Top 10 Coverage</h2>
          <p className="text-xs text-zinc-400 mt-0.5">Based on attack simulation results</p>
        </div>
        <div className="divide-y divide-zinc-800">
          {OWASP_ROWS.map(({ id, name, testedBy }) => {
            const result = byName[testedBy];
            const mitigated = result?.pass ?? false;
            return (
              <div key={id} className="flex items-center gap-4 px-5 py-3">
                <span className="text-xs font-mono font-bold text-zinc-500 w-8 shrink-0">{id}</span>
                <div className="flex-1 min-w-0">
                  <p className="text-sm text-white">{name}</p>
                  <p className="text-xs text-zinc-500">tested by {testedBy}</p>
                </div>
                <span className={cn(
                  'text-xs font-mono font-semibold px-2.5 py-1 rounded-full shrink-0',
                  mitigated
                    ? 'bg-emerald-950/60 text-emerald-400 border border-emerald-800'
                    : 'bg-red-950/60 text-red-400 border border-red-800',
                )}>
                  {mitigated ? 'MITIGATED' : 'EXPOSED'}
                </span>
              </div>
            );
          })}
        </div>
      </div>
    </section>
  );
}
```

- [ ] **Step 2: Commit**

```bash
cd /Users/kritikasharma/Documents/API-Security-Testing-Lab-
git add client/src/components/OWASPCard.tsx
git commit -m "feat: add OWASPCard component"
```

---

### Task 9: Wire everything together in App.tsx (client)

**Files:**
- Modify: `client/src/App.tsx`

- [ ] **Step 1: Replace `client/src/App.tsx`**

```tsx
import { useState } from 'react';
import { Header } from './components/Header';
import { AttackPanel } from './components/AttackPanel';
import { LogPanel } from './components/LogPanel';
import { OWASPCard } from './components/OWASPCard';
import { SecurityLayers } from './components/SecurityLayers';
import type { ScenarioResult } from './scenarios/types';

const SERVER_URL = import.meta.env.VITE_SERVER_URL || 'https://api-security-testing-lab.onrender.com';

export default function App() {
  const [logActive, setLogActive] = useState(false);
  const [results, setResults] = useState<ScenarioResult[]>([]);

  function handleStart() {
    setResults([]);
    setLogActive(true);
  }

  function handleComplete(r: ScenarioResult[]) {
    setResults(r);
    setLogActive(false);
  }

  function handleReset() {
    setResults([]);
    setLogActive(false);
  }

  return (
    <div className="min-h-screen bg-zinc-950 text-white">
      <Header />
      <main>
        <AttackPanel
          onStart={handleStart}
          onComplete={handleComplete}
          onReset={handleReset}
        />
        <LogPanel serverURL={SERVER_URL} active={logActive} />
        <OWASPCard results={results} />
        <SecurityLayers />
      </main>
    </div>
  );
}
```

- [ ] **Step 2: Verify TypeScript builds cleanly**

```bash
cd /Users/kritikasharma/Documents/API-Security-Testing-Lab-/client && npm run build 2>&1 | tail -5
```

Expected: `✓ built in Xms`, no errors.

- [ ] **Step 3: Commit**

```bash
cd /Users/kritikasharma/Documents/API-Security-Testing-Lab-
git add client/src/App.tsx
git commit -m "feat: wire LogPanel, OWASPCard into App with shared state"
```

---

### Task 10: Push server + redeploy both

**Files:** None (deployment only)

- [ ] **Step 1: Push all commits to GitHub**

```bash
cd /Users/kritikasharma/Documents/API-Security-Testing-Lab-
git push origin main 2>&1
```

Expected: All commits pushed to `https://github.com/kritikasharma4/API-Security-Testing-Lab-`

- [ ] **Step 2: Redeploy client to Vercel**

```bash
cd /Users/kritikasharma/Documents/API-Security-Testing-Lab-/client
npx vercel --prod 2>&1 | grep "Aliased:"
```

Expected: `Aliased: https://client-mu-ashen-58.vercel.app`

- [ ] **Step 3: Trigger Render redeploy**

Render auto-deploys on push to main. Go to the Render dashboard and confirm the deploy started. Wait for it to show "Live".

- [ ] **Step 4: Verify end-to-end**

Open `https://client-mu-ashen-58.vercel.app`:
1. Click **Run All Attacks**
2. Log panel should appear below the attack cards with a green "LIVE" indicator
3. Logs should stream in as each attack fires
4. Honeypot card should show PASS with fake data snippet
5. After completion: OWASP score card should appear
6. A red `[ALERT]` entry should appear in logs when Honeypot runs
