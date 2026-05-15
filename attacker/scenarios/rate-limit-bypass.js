const axios = require('axios');

async function rateLimitBypass(baseURL) {
  // First trigger rate limit
  for (let i = 0; i < 6; i++) {
    try {
      await axios.post(`${baseURL}/auth/login`, {
        email: 'bypass@example.com',
        password: 'wrongpass'
      });
    } catch {}
  }

  // Now try to bypass with spoofed IP headers
  const spoofHeaders = [
    { 'X-Forwarded-For': '1.2.3.4' },
    { 'X-Real-IP': '5.6.7.8' },
    { 'CF-Connecting-IP': '9.10.11.12' }
  ];

  let bypassed = false;
  for (const headers of spoofHeaders) {
    try {
      const res = await axios.post(`${baseURL}/auth/login`,
        { email: 'bypass@example.com', password: 'wrongpass' },
        { headers }
      );
      if (res.status === 401) { bypassed = true; break; }
    } catch (err) {
      if (err.response?.status !== 429) { bypassed = true; break; }
    }
  }

  return {
    name: 'Rate Limit Bypass',
    pass: !bypassed,
    detail: !bypassed
      ? 'Rate limit held — spoofed IP headers ignored'
      : 'Rate limit bypassed via header spoofing — vulnerability detected!'
  };
}

module.exports = rateLimitBypass;
