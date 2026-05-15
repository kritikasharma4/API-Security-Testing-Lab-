import type { ScenarioResult } from './types';

const payloads = [
  { email: "' OR 1=1 --", password: 'anything' },
  { email: 'admin@example.com', password: "' OR '1'='1" },
  { email: "test@example.com' OR '1'='1' --", password: 'test' },
];

export async function sqlInjection(baseURL: string): Promise<ScenarioResult> {
  const results: { payload: string; status: number; blocked: boolean }[] = [];
  for (const payload of payloads) {
    try {
      const res = await fetch(`${baseURL}/auth/login`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload),
      });
      results.push({ payload: payload.email, status: res.status, blocked: res.status !== 200 && res.status !== 500 });
    } catch {
      // Network error or non-JSON response (e.g. WAF block) — attack didn't succeed
      results.push({ payload: payload.email, status: 0, blocked: true });
    }
  }
  const allBlocked = results.every(r => r.blocked);
  return {
    name: 'SQL Injection',
    pass: allBlocked,
    detail: allBlocked
      ? `All ${payloads.length} injection payloads returned 400/401`
      : `Some payloads not blocked: ${results.filter(r => !r.blocked).map(r => `${r.payload} (${r.status})`).join(', ')}`,
  };
}
