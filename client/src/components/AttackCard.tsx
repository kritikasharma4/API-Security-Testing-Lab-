import { CheckCircle, XCircle, Loader2 } from 'lucide-react';
import { cn } from '../lib/utils';
import type { ScenarioResult } from '../scenarios/types';

interface AttackCardProps {
  name: string;
  description: string;
  status: 'idle' | 'running' | 'done';
  result?: ScenarioResult;
}

const DESCRIPTIONS: Record<string, string> = {
  'Brute Force': '10 rapid login attempts — tests rate limiting',
  'JWT Tampering': 'Re-signs a valid token with wrong secret — tests signature verification',
  'SQL Injection': '3 classic injection payloads — tests input validation',
  'Rate Limit Bypass': 'Spoofs IP headers after hitting limit — tests trust config',
  'CORS Probe': 'Sends evil.com Origin header — tests CORS whitelist',
  'Honeypot': 'Probes unprotected /api/secret — tests detection capability',
};

export function AttackCard({ name, status, result }: AttackCardProps) {
  return (
    <div
      className={cn(
        'rounded-lg border p-4 transition-all duration-300',
        status === 'idle' && 'border-zinc-800 bg-zinc-900 opacity-50',
        status === 'running' && 'border-zinc-600 bg-zinc-900',
        status === 'done' && result?.pass && 'border-emerald-800 bg-emerald-950/40',
        status === 'done' && !result?.pass && 'border-red-800 bg-red-950/40',
      )}
    >
      <div className="flex items-start justify-between gap-4">
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-2 mb-1">
            <span className="font-semibold text-white text-sm">{name}</span>
          </div>
          <p className="text-xs text-zinc-400">{DESCRIPTIONS[name] ?? ''}</p>
          {status === 'done' && result && (
            <p className={cn('text-xs mt-2 font-mono', result.pass ? 'text-emerald-400' : 'text-red-400')}>
              {result.detail}
            </p>
          )}
        </div>
        <div className="shrink-0 mt-0.5">
          {status === 'idle' && <div className="h-5 w-5 rounded-full border-2 border-zinc-700" />}
          {status === 'running' && <Loader2 className="h-5 w-5 text-zinc-400 animate-spin" />}
          {status === 'done' && result?.pass && <CheckCircle className="h-5 w-5 text-emerald-400" />}
          {status === 'done' && !result?.pass && <XCircle className="h-5 w-5 text-red-400" />}
        </div>
      </div>
    </div>
  );
}
