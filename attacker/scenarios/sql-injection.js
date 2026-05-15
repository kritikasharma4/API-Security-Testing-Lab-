const axios = require('axios');

const payloads = [
  { email: "' OR 1=1 --", password: 'anything' },
  { email: 'admin@example.com', password: "' OR '1'='1" },
  { email: '; DROP TABLE users; --', password: 'test' }
];

async function sqlInjection(baseURL) {
  const results = [];
  for (const payload of payloads) {
    try {
      const res = await axios.post(`${baseURL}/auth/login`, payload);
      results.push({ payload: payload.email, status: res.status, blocked: false });
    } catch (err) {
      const status = err.response?.status || 0;
      results.push({ payload: payload.email, status, blocked: status === 400 || status === 401 });
    }
  }
  const allBlocked = results.every(r => r.blocked);
  return {
    name: 'SQL Injection',
    pass: allBlocked,
    detail: allBlocked
      ? `All ${payloads.length} injection payloads returned 400/401`
      : `Some payloads not blocked: ${results.filter(r => !r.blocked).map(r => r.payload).join(', ')}`
  };
}

module.exports = sqlInjection;
