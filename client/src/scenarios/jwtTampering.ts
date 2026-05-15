import type { ScenarioResult } from './types';

function base64UrlEncode(str: string): string {
  return btoa(str).replace(/\+/g, '-').replace(/\//g, '_').replace(/=/g, '');
}

function buildTamperedToken(validToken: string): string {
  const [, payloadB64] = validToken.split('.');
  const payload = JSON.parse(atob(payloadB64.replace(/-/g, '+').replace(/_/g, '/')));
  payload.role = 'superadmin';
  const header = base64UrlEncode(JSON.stringify({ alg: 'HS256', typ: 'JWT' }));
  const newPayload = base64UrlEncode(JSON.stringify(payload));
  const fakeSignature = base64UrlEncode('invalid_signature');
  return `${header}.${newPayload}.${fakeSignature}`;
}

export async function jwtTampering(baseURL: string): Promise<ScenarioResult> {
  try {
    await fetch(`${baseURL}/auth/register`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ name: 'Attacker', email: 'attacker_fe@evil.com', password: 'attackpass123' }),
    });
  } catch {}

  let validToken: string | null = null;
  try {
    const res = await fetch(`${baseURL}/auth/login`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ email: 'attacker_fe@evil.com', password: 'attackpass123' }),
    });
    if (res.ok) {
      const data = await res.json();
      validToken = data.token;
    }
  } catch {}

  if (!validToken) {
    return { name: 'JWT Tampering', pass: false, detail: 'Could not obtain token to tamper' };
  }

  const tamperedToken = buildTamperedToken(validToken);
  const res = await fetch(`${baseURL}/api/admin`, {
    headers: { Authorization: `Bearer ${tamperedToken}` },
  });

  if (res.status === 401) {
    return { name: 'JWT Tampering', pass: true, detail: '401 Unauthorized — tampered token correctly rejected' };
  }
  return { name: 'JWT Tampering', pass: false, detail: `Tampered token was ACCEPTED (status ${res.status}) — vulnerability detected!` };
}
