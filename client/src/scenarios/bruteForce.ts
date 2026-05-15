import type { ScenarioResult } from './types';

export async function bruteForce(baseURL: string): Promise<ScenarioResult> {
  const statuses: number[] = [];
  for (let i = 0; i < 10; i++) {
    try {
      const res = await fetch(`${baseURL}/auth/login`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email: 'victim@example.com', password: `wrongpassword${i}` }),
      });
      statuses.push(res.status);
    } catch {
      statuses.push(0);
    }
  }
  const blocked = statuses.includes(429);
  return {
    name: 'Brute Force',
    pass: blocked,
    detail: blocked
      ? `429 Too Many Requests triggered after ${statuses.indexOf(429) + 1} attempts`
      : `No rate limiting detected. Statuses: ${statuses.join(', ')}`,
  };
}
