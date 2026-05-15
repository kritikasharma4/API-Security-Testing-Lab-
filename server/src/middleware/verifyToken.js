const jwt = require('jsonwebtoken');
const logBus = require('../logBus');

function verifyToken(req, res, next) {
  const authHeader = req.headers['authorization'];
  const token = authHeader && authHeader.split(' ')[1];

  if (!token) {
    logBus.emit('log', {
      type: 'WARN',
      message: `Unauthenticated request to protected route ${req.path}`,
      timestamp: new Date().toISOString(),
      meta: { ip: req.ip, path: req.path },
    });
    return res.status(401).json({ error: 'No token provided' });
  }

  try {
    const decoded = jwt.verify(token, process.env.JWT_SECRET);
    req.user = decoded;
    next();
  } catch {
    logBus.emit('log', {
      type: 'WARN',
      message: `Invalid or tampered token rejected from ${req.ip}`,
      timestamp: new Date().toISOString(),
      meta: { ip: req.ip, path: req.path },
    });
    return res.status(401).json({ error: 'Invalid or expired token' });
  }
}

module.exports = verifyToken;
