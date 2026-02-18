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

// Telegram Webhook Endpoint (no signature validation needed)
// Format: POST /webhook/telegram-*
app.post('/webhook/telegram-:botId', async (req, res) => {
  try {
    const { botId } = req.params;
    const fullBotId = `telegram-${botId}`;
    const bot = BotRegistry.getBot(fullBotId);

    if (!bot) {
      logger.warn(`Telegram bot ${fullBotId} not found in registry`);
      return res.status(404).json({ message: `Bot ${fullBotId} not found` });
    }

    logger.info(`📱 Telegram webhook received for bot: ${fullBotId}`);
    await bot.handleWebhook(req, res);
  } catch (error) {
    logger.error('Telegram webhook handler error:', error);
    res.status(500).json({ error: 'Internal Server Error' });
  }
});

// LINE Webhook Endpoints (with signature validation)
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

// Teams Webhook Endpoint (no signature validation - uses Bot Framework JWT auth)
// Format: POST /api/teams/webhook
app.post('/api/teams/webhook', async (req, res) => {
  try {
    const bot = BotRegistry.getBot('teams-fabbank');

    if (!bot) {
      logger.warn('Teams bot (teams-fabbank) not found in registry');
      return res.status(404).json({ message: 'Teams bot not found' });
    }

    logger.info('💬 Teams webhook received');
    await bot.handleWebhook(req, res);
  } catch (error) {
    logger.error('Teams webhook handler error:', error);
    res.status(500).json({ error: 'Internal Server Error' });
  }
});

// Teams Proactive Message Endpoint (for agent replies from middleware)
// Format: POST /api/teams/push-message
app.post('/api/teams/push-message', async (req, res) => {
  try {
    const { userId, text, attachments } = req.body;

    if (!userId || !text) {
      return res.status(400).json({ error: 'Missing userId or text' });
    }

    const sessionStore = require('./common/services/sessionStore');
    const teamsService = BotRegistry.getBot('teams-fabbank')?.teamsService;

    if (!teamsService) {
      logger.error('Teams service not available');
      return res.status(500).json({ error: 'Teams service not available' });
    }

    // Get session with stored conversation reference
    const session = sessionStore.getSession('teams-fabbank', userId);
    if (!session?.attributes?.conversationReference) {
      logger.error(`No conversation reference found for user ${userId}`);
      return res.status(404).json({ error: 'Conversation not found' });
    }

    // Send proactive message
    const result = await teamsService.sendProactiveMessage(
      session.attributes.conversationReference,
      text,
      attachments
    );

    if (!result.success) {
      logger.error(`Failed to send proactive message to ${userId}`);
      return res.status(500).json({ error: 'Failed to send message' });
    }

    logger.info(`Proactive message sent to user ${userId}`);
    res.status(200).json({ success: true, message: 'Message sent' });
  } catch (error) {
    logger.error('Teams push message handler error:', error);
    res.status(500).json({ error: 'Internal Server Error' });
  }
});

// Teams OAuth Token Testing Endpoint (for debugging credential issues)
// Format: GET /api/teams/test-token
app.get('/api/teams/test-token', async (req, res) => {
  try {
    const bot = BotRegistry.getBot('teams-fabbank');

    if (!bot || !bot.teamsService) {
      return res.status(404).json({
        success: false,
        error: 'Teams bot not found in registry'
      });
    }

    logger.info('🧪 Teams OAuth Token Test requested');

    // Test token generation directly
    const result = await bot.teamsService.testTokenGeneration();

    res.status(result.success ? 200 : 401).json({
      success: result.success,
      token: result.success ? {
        length: result.token.length,
        prefix: result.token.substring(0, 50) + '...',
        expiresAt: result.decoded?.exp ? new Date(result.decoded.exp * 1000).toISOString() : 'unknown'
      } : null,
      decoded: result.decoded,
      error: result.error
    });
  } catch (error) {
    logger.error('Teams token test error:', error);
    res.status(500).json({
      success: false,
      error: error.message
    });
  }
});

// Error handling
app.use((err, req, res, next) => {
  logger.error('Express error:', err);
  res.status(500).json({ error: 'Internal Server Error' });
});

module.exports = app;
