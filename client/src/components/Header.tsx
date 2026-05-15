import { Shield } from 'lucide-react';

const SERVER_URL = import.meta.env.VITE_SERVER_URL || 'https://api-security-testing-lab.onrender.com';
const GITHUB_URL = 'https://github.com/kritikasharma4/API-Security-Testing-Lab-';

export function Header() {
  return (
    <header className="border-b border-zinc-800 bg-zinc-950 px-6 py-5">
      <div className="mx-auto max-w-4xl flex items-center justify-between">
        <div className="flex items-center gap-3">
          <Shield className="h-7 w-7 text-emerald-400" />
          <div>
            <h1 className="text-xl font-bold text-white tracking-tight">API Security Testing Lab</h1>
            <p className="text-sm text-zinc-400">Live attack simulation against a hardened REST API</p>
          </div>
        </div>
        <div className="flex items-center gap-3">
          <a
            href={SERVER_URL + '/health'}
            target="_blank"
            rel="noopener noreferrer"
            className="text-xs font-mono bg-zinc-800 text-zinc-300 px-3 py-1.5 rounded-md hover:bg-zinc-700 transition-colors"
          >
            API ↗
          </a>
          <a
            href={GITHUB_URL}
            target="_blank"
            rel="noopener noreferrer"
            className="text-xs font-mono bg-zinc-800 text-zinc-300 px-3 py-1.5 rounded-md hover:bg-zinc-700 transition-colors"
          >
            GitHub ↗
          </a>
        </div>
      </div>
    </header>
  );
}
