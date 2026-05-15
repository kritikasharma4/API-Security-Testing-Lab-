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
