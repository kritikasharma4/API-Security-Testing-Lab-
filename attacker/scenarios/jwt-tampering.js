const axios = require('axios');
const jwt = require('jsonwebtoken');

async function jwtTampering(baseURL) {
  // First register + login to get a valid token
  try {
    await axios.post(`${baseURL}/auth/register`, {
      name: 'Attacker',
      email: 'attacker@evil.com',
      password: 'attackpass123'
    });
  } catch {}

  let validToken;
  try {
    const res = await axios.post(`${baseURL}/auth/login`, {
      email: 'attacker@evil.com',
      password: 'attackpass123'
    });
    validToken = res.data.token;
  } catch {
    return { name: 'JWT Tampering', pass: false, detail: 'Could not obtain token to tamper' };
  }

  // Decode, modify payload, re-sign with wrong secret
  const decoded = jwt.decode(validToken);
  decoded.role = 'superadmin';
  const tamperedToken = jwt.sign(decoded, 'wrong_secret');

  try {
    await axios.get(`${baseURL}/api/admin`, {
      headers: { Authorization: `Bearer ${tamperedToken}` }
    });
    return { name: 'JWT Tampering', pass: false, detail: 'Tampered token was ACCEPTED — vulnerability detected!' };
  } catch (err) {
    const status = err.response?.status;
    return {
      name: 'JWT Tampering',
      pass: status === 401,
      detail: status === 401
        ? '401 Unauthorized — tampered token correctly rejected'
        : `Unexpected status: ${status}`
    };
  }
}

module.exports = jwtTampering;
