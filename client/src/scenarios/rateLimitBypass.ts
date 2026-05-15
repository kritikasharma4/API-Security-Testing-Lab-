import type { ScenarioResult } from './types';

export async function rateLimitBypass(baseURL: string): Promise<ScenarioResult> {
  for (let i = 0; i < 6; i++) {
    try {
      await fetch(`${baseURL}/auth/login`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email: 'bypass_fe@example.com', password: 'wrongpass' }),
      });
    } catch {}
  }

  const spoofHeaders: Record<string, string>[] = [
    { 'X-Forwarded-For': '1.2.3.4' },
    { 'X-Real-IP': '5.6.7.8' },
    { 'CF-Connecting-IP': '9.10.11.12' },
  ];

  let bypassed = false;
  for (const spoofHeader of spoofHeaders) {
    try {
      const fetchHeaders: Record<string, string> = { 'Content-Type': 'application/json', ...spoofHeader };
      const res = await fetch(`${baseURL}/auth/login`, {
        method: 'POST',
        headers: fetchHeaders,
        body: JSON.stringify({ email: 'bypass_fe@example.com', password: 'wrongpass' }),
      });
      if (res.status !== 429) { bypassed = true; break; }
    } catch {}
  }

  return {
    name: 'Rate Limit Bypass',
    pass: !bypassed,
    detail: !bypassed
      ? 'Rate limit held — spoofed IP headers ignored'
      : 'Rate limit bypassed via header spoofing — vulnerability detected!',
  };
}
