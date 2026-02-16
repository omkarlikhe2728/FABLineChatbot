// Import live chat service from line-fabbank and adapt for Telegram
const BaseLiveChatService = require('../../fabbank/services/liveChatService');
const logger = require('../../../common/utils/logger');

class TelegramLiveChatService extends BaseLiveChatService {
  constructor(config) {
    super(config);
    // Override botId for Telegram
    this.botId = 'telegram-fabbank';
    logger.info(`✅ Telegram Live Chat Service initialized with botId: ${this.botId}`);
  }

  async sendMessage(chatId, message) {
    try {
      // Ensure the endpoint uses Telegram prefix
      const endpoint = `${this.baseUrl}/api/telegram-direct/live-chat/message/${this.botId}`;

      const payload = {
        chatId,
        channel: 'telegram',
        message
      };

      const response = await this.client.post(endpoint, payload);
      return response.data;
    } catch (error) {
      logger.error(`Error sending live chat message for ${this.botId}:`, error);
      throw error;
    }
  }

  async startLiveChat(chatId, displayName, initialMessage) {
    try {
      const endpoint = `${this.baseUrl}/api/telegram-direct/live-chat/start`;

      const payload = {
        chatId,
        displayName,
        message: initialMessage,
        channel: 'telegram'
      };

      const response = await this.client.post(endpoint, payload);
      return response.data;
    } catch (error) {
      logger.error(`Error starting live chat for ${this.botId}:`, error);
      throw error;
    }
  }

  async endLiveChat(chatId) {
    try {
      const endpoint = `${this.baseUrl}/api/telegram-direct/live-chat/end`;

      const payload = {
        chatId,
        channel: 'telegram'
      };

      const response = await this.client.post(endpoint, payload);
      return response.data;
    } catch (error) {
      logger.error(`Error ending live chat for ${this.botId}:`, error);
      throw error;
    }
  }
}

// Create singleton instance
const config = {
  baseUrl: process.env.TELEGRAM_FABBANK_LIVE_CHAT_API_URL || 'https://livechat-middleware.fabbank.com',
  timeout: parseInt(process.env.TELEGRAM_FABBANK_LIVE_CHAT_TIMEOUT || '5000')
};

const liveChatService = new TelegramLiveChatService(config);

module.exports = liveChatService;
