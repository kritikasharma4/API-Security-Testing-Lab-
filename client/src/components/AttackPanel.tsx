import { useState } from 'react';
import { Play, RotateCcw } from 'lucide-react';
import { AttackCard } from './AttackCard';
import { bruteForce, jwtTampering, sqlInjection, rateLimitBypass, corsProbe } from '../scenarios';
import type { ScenarioResult, ScenarioFn } from '../scenarios/types';
import { cn } from '../lib/utils';

const SERVER_URL = import.meta.env.VITE_SERVER_URL || 'https://api-security-testing-lab.onrender.com';

const SCENARIOS: { fn: ScenarioFn; name: string }[] = [
  { fn: bruteForce, name: 'Brute Force' },
  { fn: jwtTampering, name: 'JWT Tampering' },
  { fn: sqlInjection, name: 'SQL Injection' },
  { fn: rateLimitBypass, name: 'Rate Limit Bypass' },
  { fn: corsProbe, name: 'CORS Probe' },
];

type CardStatus = 'idle' | 'running' | 'done';

interface CardState {
  status: CardStatus;
  result?: ScenarioResult;
}

export function AttackPanel() {
  const [cards, setCards] = useState<CardState[]>(SCENARIOS.map(() => ({ status: 'idle' })));
  const [running, setRunning] = useState(false);
  const [done, setDone] = useState(false);

  async function runAll() {
    setRunning(true);
    setDone(false);
    setCards(SCENARIOS.map(() => ({ status: 'idle' })));

    for (let i = 0; i < SCENARIOS.length; i++) {
      setCards(prev => prev.map((c, idx) => idx === i ? { status: 'running' } : c));
      const result = await SCENARIOS[i].fn(SERVER_URL);
      setCards(prev => prev.map((c, idx) => idx === i ? { status: 'done', result } : c));
    }

    setRunning(false);
    setDone(true);
  }

  function reset() {
    setCards(SCENARIOS.map(() => ({ status: 'idle' })));
    setDone(false);
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
