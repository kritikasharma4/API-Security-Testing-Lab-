const express = require('express');
const logBus = require('../logBus');

const router = express.Router();

router.get('/stream', (req, res) => {
  res.setHeader('Content-Type', 'text/event-stream');
  res.setHeader('Cache-Control', 'no-cache');
  res.setHeader('Connection', 'keep-alive');
  res.flushHeaders();

  const send = (event) => {
    res.write(`data: ${JSON.stringify(event)}\n\n`);
  };

  send({ type: 'INFO', message: 'Log stream connected', timestamp: new Date().toISOString() });

  const keepalive = setInterval(() => {
    res.write(': keepalive\n\n');
  }, 15000);

  logBus.on('log', send);

  req.on('close', () => {
    clearInterval(keepalive);
    logBus.off('log', send);
  });
});

module.exports = router;
