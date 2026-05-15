import { Lock, Key, Shield, Globe, FileCheck, AlertCircle, Zap } from 'lucide-react';

const LAYERS = [
  {
    icon: Lock,
    title: 'Password Hashing',
    tech: 'bcryptjs',
    detail: 'saltRounds=12, timing-safe compare',
  },
  {
    icon: Key,
    title: 'JWT Authentication',
    tech: 'jsonwebtoken',
    detail: 'HS256, 1hr expiry, env-based secret',
  },
  {
    icon: Zap,
    title: 'Rate Limiting',
    tech: 'express-rate-limit',
    detail: '5 login / 100 global per 15min per IP',
  },
  {
    icon: Shield,
    title: 'Security Headers',
    tech: 'helmet',
    detail: 'CSP, HSTS, X-Frame-Options, nosniff',
  },
  {
    icon: Globe,
    title: 'CORS',
    tech: 'cors',
    detail: 'Whitelist only — no wildcard origins',
  },
  {
    icon: FileCheck,
    title: 'Input Validation',
    tech: 'express-validator',
    detail: 'Sanitize & validate all request bodies',
  },
  {
    icon: AlertCircle,
    title: 'Error Handling',
    tech: 'custom middleware',
    detail: 'No stack traces exposed to clients',
  },
];

export function SecurityLayers() {
  return (
    <section className="mx-auto max-w-4xl px-6 pb-12">
      <div className="border-t border-zinc-800 pt-8">
        <h2 className="text-lg font-semibold text-white mb-1">Security Layers</h2>
        <p className="text-sm text-zinc-400 mb-6">Every defense the API uses</p>
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
          {LAYERS.map(({ icon: Icon, title, tech, detail }) => (
            <div key={title} className="rounded-lg border border-zinc-800 bg-zinc-900 p-4">
              <div className="flex items-center gap-2 mb-2">
                <Icon className="h-4 w-4 text-emerald-400 shrink-0" />
                <span className="font-medium text-white text-sm">{title}</span>
              </div>
              <span className="inline-block text-xs font-mono bg-zinc-800 text-zinc-300 px-2 py-0.5 rounded mb-2">
                {tech}
              </span>
              <p className="text-xs text-zinc-400">{detail}</p>
            </div>
          ))}
        </div>
      </div>
    </section>
  );
}
