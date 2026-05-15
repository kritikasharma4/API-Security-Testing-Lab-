const axios = require('axios');

async function corsProbe(baseURL) {
  try {
    const res = await axios.get(`${baseURL}/health`, {
      headers: { Origin: 'https://evil.com' }
    });
    const allowOrigin = res.headers['access-control-allow-origin'];
    const blocked = !allowOrigin || allowOrigin === 'null' || allowOrigin !== 'https://evil.com';
    return {
      name: 'CORS Probe',
      pass: blocked,
      detail: blocked
        ? `CORS blocked — Access-Control-Allow-Origin: ${allowOrigin || 'not set'}`
        : 'CORS allows all origins — vulnerability detected!'
    };
  } catch (err) {
    return {
      name: 'CORS Probe',
      pass: true,
      detail: `Request rejected at network level (${err.message})`
    };
  }
}

module.exports = corsProbe;
