require('dotenv').config();
const fs = require('fs');
const path = require('path');
const app = require('./app');
const logger = require('./common/utils/logger');
const BotRegistry = require('./common/core/BotRegistry');

const PORT = process.env.PORT || 3000;

// Initialize all bots from config
async function initializeBots() {
  try {
    // Load bot registry configuration
    const botsConfigPath = path.join(__dirname, '../config/bots.json');

    if (!fs.existsSync(botsConfigPath)) {
      logger.error(`Bots configuration file not found: ${botsConfigPath}`);
      throw new Error(`Missing bots configuration at ${botsConfigPath}`);
    }

    const botsConfig = JSON.parse(fs.readFileSync(botsConfigPath, 'utf8'));

    if (!botsConfig.bots || !Array.isArray(botsConfig.bots)) {
      throw new Error('Invalid bots configuration: expected "bots" array');
    }

    logger.debug(`Found ${botsConfig.bots.length} bot(s) in configuration`);

    // Initialize each enabled bot
    for (const botConfig of botsConfig.bots) {
      if (!botConfig.enabled) {
        logger.debug(`Skipping disabled bot: ${botConfig.id}`);
        continue;
      }

      try {
        logger.debug(`Initializing bot: ${botConfig.id}`);

        // Load bot-specific .env file
        const envPath = path.join(__dirname, '..', botConfig.envFile);
        if (fs.existsSync(envPath)) {
          require('dotenv').config({ path: envPath });
          logger.debug(`Loaded environment from: ${botConfig.envFile}`);
        } else {
          logger.warn(`Bot env file not found: ${botConfig.envFile}`);
        }

        // Dynamically import and instantiate bot
        const botModulePath = path.join(__dirname, botConfig.modulePath);
        const BotClass = require(botModulePath);
        const botInstance = new BotClass();

        // Register bot in registry
        BotRegistry.register(botConfig.id, botInstance);

        logger.debug(`Bot ${botConfig.id} initialized and registered`);
      } catch (error) {
        logger.error(`Failed to initialize bot ${botConfig.id}:`, error);
        throw error;
      }
    }

    return BotRegistry.getBotIds();
  } catch (error) {
    logger.error('Bot initialization failed:', error);
    throw error;
  }
}

// Start server
async function startServer() {
  try {
    // Initialize all bots before starting server
    const activeBots = await initializeBots();

    // Start Express server
    app.listen(PORT, () => {
      logger.info(`Multi-Bot Platform started on port ${PORT}`);
      logger.info(`Environment: ${process.env.NODE_ENV}`);
      logger.info(`Active bots: ${activeBots.join(', ')}`);
      logger.debug(`Webhook endpoints: POST /webhook/{botId}`);
      logger.debug(`Health checks: GET /health or GET /health/{botId}`);
    });
  } catch (error) {
    logger.error('Failed to start server:', error);
    process.exit(1);
  }
}

// Handle uncaught exceptions
process.on('uncaughtException', (error) => {
  logger.error('Uncaught exception:', error);
  process.exit(1);
});

// Start the server
startServer();
