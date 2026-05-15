const express = require('express');
const verifyToken = require('../middleware/verifyToken');
const logBus = require('../logBus');

const router = express.Router();

router.get('/profile', verifyToken, (req, res) => {
  res.json({ message: 'Your profile', user: req.user });
});

router.get('/admin', verifyToken, (req, res) => {
  res.json({ message: 'Welcome to the admin panel', user: req.user });
});

router.get('/secret', (req, res) => {  // intentionally unauthenticated — honeypot trap
  logBus.emit('log', {
    type: 'ALERT',
    message: `HONEYPOT TRIGGERED — probe detected from ${req.ip}`,
    timestamp: new Date().toISOString(),
    meta: { ip: req.ip, userAgent: req.headers['user-agent'] },
  });

  res.json({
    warning: 'you should not be here',
    users: [
      { id: 1, email: 'admin@company.com', role: 'superadmin', passwordHash: '$2b$12$fakeHashOnlyForDemo000000000000000000000000000' },
      { id: 2, email: 'cto@company.com', role: 'admin', passwordHash: '$2b$12$anotherFakeHashForDemo0000000000000000000000' },
    ],
    adminToken: 'eyJhbGciOiJIUzI1NiJ9.eyJyb2xlIjoic3VwZXJhZG1pbiJ9.fakeSignatureForDemoOnly',
    dbConnectionString: 'postgresql://admin:FAKE_PASSWORD_DO_NOT_USE@internal-db:5432/prod',
  });
});

module.exports = router;
