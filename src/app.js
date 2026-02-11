const express = require('express');
const bodyParser = require('body-parser');
const crypto = require('crypto');
const logger = require('./common/utils/logger');
const BotRegistry = require('./common/core/BotRegistry');

const app = express();

// Proper way to capture raw body for LINE signature validation
app.use(bodyParser.json({
  verify: (req, res, buf, encoding) => {
    req.rawBody = buf.toString(encoding || 'utf8');
  }
}));

// Multi-Bot Signature Validation Middleware
const validateBotSignature = (req, res, next) => {
  const { botId } = req.params;
  const signature = req.headers['x-line-signature'];
  const body = req.rawBody || '';

  console.log(`🔍 Webhook received for bot: ${botId}`);
  console.log('📨 Signature from LINE:', signature ? signature.substring(0, 20) + '...' : 'MISSING');

  // Get bot from registry
  const bot = BotRegistry.getBot(botId);
  if (!bot) {
    logger.warn(`Bot ${botId} not found in registry`);
    console.log(`❌ Bot not found: ${botId}`);
    return res.status(404).json({ message: `Bot ${botId} not found` });
  }

  // Get bot config
  const botConfig = bot.getConfig();
  const channelSecret = botConfig.channelSecret;

  console.log('🔑 Channel Secret configured:', !!channelSecret);

  // Validate signature using bot-specific secret
  const hash = crypto
    .createHmac('sha256', channelSecret)
    .update(body)
    .digest('base64');

  console.log('🔐 Calculated hash:', hash.substring(0, 20) + '...');
  console.log('✅ Match:', hash === signature);

  if (hash !== signature) {
    logger.error(`Signature validation failed for bot ${botId}`);
    console.log(`❌ VALIDATION FAILED for bot ${botId}`);
    return res.status(403).json({ message: 'Invalid signature' });
  }

  console.log(`✅ VALIDATION PASSED for bot ${botId}`);
  req.bot = bot; // Attach bot to request
  next();
};

// Health Check (generic)
app.get('/health', (req, res) => {
  res.json({
    success: true,
    message: 'Multi-Bot Platform is running',
    timestamp: new Date().toISOString(),
    activeBots: BotRegistry.getBotIds(),
  });
});

// Health Check (per-bot)
app.get('/health/:botId', (req, res) => {
  const { botId } = req.params;
  const bot = BotRegistry.getBot(botId);

  if (!bot) {
    return res.status(404).json({
      success: false,
      message: `Bot ${botId} not found`,
    });
  }

  res.json({
    success: true,
    message: `Bot ${botId} is running`,
    botId: botId,
    timestamp: new Date().toISOString(),
  });
});

// Multi-Bot Webhook Endpoints
// Format: POST /webhook/:botId
app.post('/webhook/:botId', validateBotSignature, async (req, res) => {
  try {
    const bot = req.bot;
    await bot.handleWebhook(req, res);
  } catch (error) {
    logger.error('Webhook handler error:', error);
    res.status(500).json({ error: 'Internal Server Error' });
  }
});

app.get('/test/:botId', (req, res) => {
  const { botId } = req.params;
  const bot = BotRegistry.getBot(botId);

  res.send({
    bot
  })

})

// Error handling
app.use((err, req, res, next) => {
  logger.error('Express error:', err);
  res.status(500).json({ error: 'Internal Server Error' });
});

module.exports = app;
