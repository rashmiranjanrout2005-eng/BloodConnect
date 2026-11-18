const dns = require('dns');
const express = require('express');
const mongoose = require('mongoose');
const path = require('path');
require('dotenv').config();

const authRoutes = require('./routes/authRoutes');
const donorRoutes = require('./routes/donorRoutes');
const requestRoutes = require('./routes/requestRoutes');
const { requireAuth } = require('./middleware/requireAuth');
const { emailConfigured, verifyEmailConfiguration } = require('./services/emailService');

const app = express();
const PORT = process.env.PORT || 5000;
const MONGO_URI = process.env.MONGO_URI || 'mongodb://127.0.0.1:27017/bloodconnect';

app.use(express.json({ limit: '16kb' }));

// Serve static frontend files so one server runs both frontend & backend
app.use(express.static(path.join(__dirname, '../frontend')));

// API Routes
app.use('/api/auth', authRoutes);
app.use('/api/donors', requireAuth, donorRoutes);
app.use('/api/requests', requireAuth, requestRoutes);

// Health Check Endpoint
app.get('/api/health', (req, res) => {
  const databaseConnected = mongoose.connection.readyState === 1;
  res.status(databaseConnected ? 200 : 503).json({
    status: databaseConnected ? 'OK' : 'UNAVAILABLE',
    databaseConnected,
    emailConfigured
  });
});

// Fallback to frontend index.html for any other route
app.get('*', (req, res) => {
  res.sendFile(path.join(__dirname, '../frontend/index.html'));
});

async function startServer() {
  if (process.env.NODE_ENV === 'production' && !process.env.MONGO_URI) {
    throw new Error('MONGO_URI must be configured in production.');
  }

  if (MONGO_URI.startsWith('mongodb+srv://')) {
    const mongoHost = new URL(MONGO_URI).hostname;
    const srvRecord = `_mongodb._tcp.${mongoHost}`;
    try {
      await dns.promises.resolveSrv(srvRecord);
    } catch (error) {
      if (error.code !== 'ECONNREFUSED') throw error;
      const dnsServers = (process.env.MONGO_DNS_SERVERS || '1.1.1.1,1.0.0.1')
        .split(',')
        .map((server) => server.trim())
        .filter(Boolean);
      dns.setServers(dnsServers);
      await dns.promises.resolveSrv(srvRecord);
    }
  }

  await mongoose.connect(MONGO_URI);
  console.log('Connected to MongoDB.');
  
  if (emailConfigured) {
    try {
      await verifyEmailConfiguration();
      console.log('SMTP email delivery is ready.');
    } catch (err) {
      console.log('SMTP check skipped or failed:', err.message);
    }
  }

  app.listen(PORT, () => {
    console.log(`Blood Connect is listening on port ${PORT}.`);
  });
}

startServer().catch((error) => {
  console.error('Blood Connect could not start:', error.message);
  process.exit(1);
});