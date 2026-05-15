const express = require('express');
const verifyToken = require('../middleware/verifyToken');

const router = express.Router();

router.get('/profile', verifyToken, (req, res) => {
  res.json({ message: 'Your profile', user: req.user });
});

router.get('/admin', verifyToken, (req, res) => {
  res.json({ message: 'Welcome to the admin panel', user: req.user });
});

module.exports = router;
