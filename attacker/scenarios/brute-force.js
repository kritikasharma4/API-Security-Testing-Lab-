const axios = require('axios');

async function bruteForce(baseURL) {
  const results = [];
  for (let i = 0; i < 10; i++) {
    try {
      const res = await axios.post(`${baseURL}/auth/login`, {
        email: 'victim@example.com',
        password: `wrongpassword${i}`
      });
      results.push(res.status);
    } catch (err) {
      results.push(err.response?.status || 0);
    }
  }
  const blocked = results.includes(429);
  return {
    name: 'Brute Force',
    pass: blocked,
    detail: blocked
      ? `429 Too Many Requests triggered after ${results.indexOf(429) + 1} attempts`
      : `No rate limiting detected. Statuses: ${results.join(', ')}`
  };
}

module.exports = bruteForce;
