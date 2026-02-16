// Telegram-specific live chat service (standalone, doesn't extend FAB Bank service)
const axios = require('axios');
const logger = require('../../../common/utils/logger');

class TelegramLiveChatService {
  constructor(config = {}) {
    this.baseUrl = config.baseUrl || process.env.TELEGRAM_FABBANK_LIVE_CHAT_API_URL || 'https://livechat-middleware.fabbank.com';
    this.timeout = config.timeout || parseInt(process.env.TELEGRAM_FABBANK_LIVE_CHAT_TIMEOUT || '5000');
    this.botId = 'telegram-fabbank';

    // Create axios client for API calls
    this.client = axios.create({
      baseURL: this.baseUrl,
      timeout: this.timeout,
      headers: {
        'Content-Type': 'application/json'
      }
    });

    logger.info(`✅ Telegram Live Chat Service initialized with baseUrl: ${this.baseUrl}, botId: ${this.botId}`);
  }

  async sendMessage(chatId, message) {
    try {
      const endpoint = `/api/telegram-direct/live-chat/message/${this.botId}`;

      const payload = {
        chatId,
        channel: 'telegram',
        message
      };

      const response = await this.client.post(endpoint, payload);
      return response.data;
    } catch (error) {
      logger.error(`Error sending live chat message for ${this.botId}:`, error.message);
      throw error;
    }
  }

  async startLiveChat(chatId, displayName, initialMessage) {
    try {
      const endpoint = `/api/telegram-direct/live-chat/start`;

      const payload = {
        chatId,
        displayName,
        message: initialMessage || 'Customer initiated live chat',
        channel: 'telegram'
      };

      const response = await this.client.post(endpoint, payload);
      return response.data;
    } catch (error) {
      logger.error(`Error starting live chat for ${this.botId}:`, error.message);
      throw error;
    }
  }

  async endLiveChat(chatId) {
    try {
      const endpoint = `/api/telegram-direct/live-chat/end`;

      const payload = {
        chatId,
        channel: 'telegram'
      };

      const response = await this.client.post(endpoint, payload);
      return response.data;
    } catch (error) {
      logger.error(`Error ending live chat for ${this.botId}:`, error.message);
      throw error;
    }
  }

  isAvailable() {
    return !!this.baseUrl;
  }
}

// Create singleton instance
const config = {
  baseUrl: process.env.TELEGRAM_FABBANK_LIVE_CHAT_API_URL || 'https://livechat-middleware.fabbank.com',
  timeout: parseInt(process.env.TELEGRAM_FABBANK_LIVE_CHAT_TIMEOUT || '5000')
};

const liveChatService = new TelegramLiveChatService(config);

module.exports = liveChatService;
