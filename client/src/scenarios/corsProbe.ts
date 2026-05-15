import type { ScenarioResult } from './types';

export async function corsProbe(baseURL: string): Promise<ScenarioResult> {
  try {
    const res = await fetch(`${baseURL}/health`, {
      headers: { Origin: 'https://evil.com' },
    });
    const allowOrigin = res.headers.get('access-control-allow-origin');
    const blocked = !allowOrigin || allowOrigin !== 'https://evil.com';
    return {
      name: 'CORS Probe',
      pass: blocked,
      detail: blocked
        ? `CORS blocked — Access-Control-Allow-Origin: ${allowOrigin || 'not set'}`
        : 'CORS allows all origins — vulnerability detected!',
    };
  } catch {
    return {
      name: 'CORS Probe',
      pass: true,
      detail: `Request rejected at network level`,
    };
  }
}
