const rateLimit = require('express-rate-limit');
const logBus = require('../logBus');

const globalLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  max: 100,
  standardHeaders: true,
  legacyHeaders: false,
  message: { error: 'Too many requests, please try again later.' },
  handler: (req, res, next, options) => {
    logBus.emit('log', {
      type: 'ALERT',
      message: `Global rate limit triggered for ${req.ip}`,
      timestamp: new Date().toISOString(),
      meta: { ip: req.ip, path: req.path },
    });
    res.status(options.statusCode).json(options.message);
  },
});

const loginLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  max: 5,
  standardHeaders: true,
  legacyHeaders: false,
  message: { error: 'Too many login attempts, please try again later.' },
  handler: (req, res, next, options) => {
    logBus.emit('log', {
      type: 'ALERT',
      message: `Login rate limit triggered — brute force detected from ${req.ip}`,
      timestamp: new Date().toISOString(),
      meta: { ip: req.ip },
    });
    res.status(options.statusCode).json(options.message);
  },
});

module.exports = { globalLimiter, loginLimiter };
