const express = require('express');
const bodyParser = require('body-parser');
const crypto = require('crypto');
const logger = require('./utils/logger');

const app = express();

// Proper way to capture raw body for LINE signature validation
app.use(bodyParser.json({
  verify: (req, res, buf, encoding) => {
    req.rawBody = buf.toString(encoding || 'utf8');
  }
}));

// LINE Signature Validation Middleware
const validateLineSignature = (req, res, next) => {
  const signature = req.headers['x-line-signature'];
  const body = req.rawBody || '';

  console.log('🔍 DEBUG: Webhook received');
  console.log('📨 Signature from LINE:', signature ? signature.substring(0, 20) + '...' : 'MISSING');
  console.log('📄 Body length:', body.length);
  console.log('🔑 Channel Secret:', process.env.LINE_CHANNEL_SECRET ? process.env.LINE_CHANNEL_SECRET.substring(0, 10) + '...' : 'MISSING');

  const hash = crypto
    .createHmac('sha256', process.env.LINE_CHANNEL_SECRET)
    .update(body)
    .digest('base64');

  console.log('🔐 Calculated hash:', hash.substring(0, 20) + '...');
  console.log('✅ Match:', hash === signature);

  if (hash !== signature) {
    logger.error('Signature validation failed');
    console.log('❌ VALIDATION FAILED - Signature mismatch');
    return res.status(403).json({ message: 'Invalid signature' });
  }

  console.log('✅ VALIDATION PASSED');
  next();
};

// Health Check
app.get('/health', (req, res) => {
  res.json({
    success: true,
    message: 'FAB Banking Bot is running',
    timestamp: new Date().toISOString(),
  });
});

// Real webhook endpoint
const webhookController = require('./controllers/webhookController');
app.post('/webhook', validateLineSignature, (req, res) => {
  webhookController.handleWebhook(req, res);
});

// Error handling
app.use((err, req, res, next) => {
  logger.error('Express error:', err);
  res.status(500).json({ error: 'Internal Server Error' });
});

module.exports = app;
