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
