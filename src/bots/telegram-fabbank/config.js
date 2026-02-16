const logger = require('../../common/utils/logger');

// Telegram bot config - standalone, doesn't use LINE credentials
class TelegramFabBankConfig {
  constructor() {
    this.botId = 'telegram-fabbank';
    this.platform = 'telegram';
    this.envPrefix = 'TELEGRAM_FABBANK';

    // Telegram Bot Token
    this.botToken = process.env.TELEGRAM_FABBANK_BOT_TOKEN;
    if (!this.botToken) {
      throw new Error('TELEGRAM_FABBANK_BOT_TOKEN environment variable is required');
    }

    // Banking API Configuration
    this.bankingApiUrl = process.env.TELEGRAM_FABBANK_BANKING_API_URL || 'https://api.fabbank.com';
    this.bankingApiTimeout = parseInt(process.env.TELEGRAM_FABBANK_BANKING_API_TIMEOUT || '5000');

    // Live Chat Configuration
    this.liveChatApiUrl = process.env.TELEGRAM_FABBANK_LIVE_CHAT_API_URL || 'https://livechat-middleware.fabbank.com';

    // Bot Settings
    this.botName = process.env.TELEGRAM_FABBANK_BOT_NAME || 'FAB Bank Telegram Bot';
    this.sessionTimeout = parseInt(process.env.TELEGRAM_FABBANK_SESSION_TIMEOUT || '300000');
    this.otpExpiry = parseInt(process.env.TELEGRAM_FABBANK_OTP_EXPIRY || '300');
    // Welcome image is optional - set TELEGRAM_FABBANK_WELCOME_IMAGE to a valid image URL to enable
    this.welcomeImage = process.env.TELEGRAM_FABBANK_WELCOME_IMAGE || null;

    // Load bot-specific config
    this.loadBotConfig();

    this.validate();
  }

  loadBotConfig() {
    try {
      const configFile = require('../../../config/telegram-fabbank.json');
      this.botConfig = configFile;
      this.features = configFile.features || {};
      this.menu = configFile.menu || {};
      this.commands = configFile.commands || [];
    } catch (error) {
      logger.warn('Could not load telegram-fabbank.json config:', error.message);
      this.botConfig = {};
      this.features = {};
      this.menu = {};
      this.commands = [];
    }
  }

  validate() {
    if (!this.botToken) {
      throw new Error('Telegram bot token is required');
    }
    if (!this.bankingApiUrl) {
      throw new Error('Banking API URL is required');
    }
    logger.info(`TelegramFabBankConfig validated for bot: ${this.botId}`);
  }
}

module.exports = TelegramFabBankConfig;
