require('dotenv').config();
const express = require('express');
const helmet = require('helmet');
const morgan = require('morgan');
const cors = require('cors');
const authRoutes = require('./routes/auth');
const apiRoutes = require('./routes/api');
const logsRoutes = require('./routes/logs');
const errorHandler = require('./middleware/errorHandler');
const { globalLimiter } = require('./middleware/rateLimiter');
const logBus = require('./logBus');

const app = express();
const PORT = process.env.PORT || 4000;

app.use(helmet());
app.use(morgan('combined'));
app.use(cors({
  origin: process.env.ALLOWED_ORIGIN || 'http://localhost:3000',
  optionsSuccessStatus: 200
}));
app.use(express.json());
app.use(globalLimiter);

app.use((req, res, next) => {
  res.on('finish', () => {
    logBus.emit('log', {
      type: res.statusCode >= 400 ? 'WARN' : 'INFO',
      message: `${req.method} ${req.path} → ${res.statusCode}`,
      timestamp: new Date().toISOString(),
      meta: { ip: req.ip, status: res.statusCode },
    });
  });
  next();
});

app.get('/health', (req, res) => res.json({ status: 'ok' }));
app.use('/auth', authRoutes);
app.use('/api', apiRoutes);
app.use('/logs', logsRoutes);
app.use(errorHandler);

app.listen(PORT, () => console.log(`Server running on port ${PORT}`));

module.exports = app;
