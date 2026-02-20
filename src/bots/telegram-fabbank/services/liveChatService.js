// Telegram live chat service - mirrors FAB Bank (LINE) pattern for consistency
const axios = require('axios');
const logger = require('../../../common/utils/logger');

class TelegramLiveChatService {
  constructor(config = {}) {
    this.baseUrl = config.baseUrl || process.env.TELEGRAM_FABBANK_LIVE_CHAT_API_URL;
    this.timeout = config.timeout || parseInt(process.env.TELEGRAM_FABBANK_LIVE_CHAT_TIMEOUT || '20000');
    this.botId = config.botId || 'telegram-fabbank';
    this.tenantId = config.tenantId || 'telegram-fabbank'; // Use bot ID as tenant identifier

    if (!this.baseUrl) {
      logger.warn(
        'Telegram LiveChatService initialization warning: Missing TELEGRAM_FABBANK_LIVE_CHAT_API_URL. ' +
        'Live chat feature will not be available. Check .env.telegram-fabbank configuration.'
      );
    } else {
      logger.info(
        `✅ Telegram LiveChatService initialized with baseUrl: ${this.baseUrl}, botId: ${this.botId}, tenantId: ${this.tenantId}`
      );
    }
  }

  /**
   * Initiate live chat session via middleware
   * Uses same endpoint pattern as LINE bot for consistency
   */
  async startLiveChat(chatId, displayName, initialMessage = '') {
    try {
      if (!this.baseUrl) {
        logger.warn(`Live chat API not configured for user ${chatId}`);
        return {
          success: false,
          error: 'Live chat service not configured',
        };
      }

      logger.info(`Starting live chat for user ${chatId}: ${displayName}`);

      const initMsg = {
        type: 'text',
        text: initialMessage || 'Customer initiated live chat',
      };

      console.log(
        'telegram_connector_url=',
        `"${this.baseUrl}/api/telegram-direct/live-chat/message/${this.tenantId}"`
      );
      console.log(
        'telegram_connector_payload=',
        JSON.stringify({
          chatId,
          displayName,
          channel: 'telegram',
          message: initMsg,
        })
      );

      const response = await axios.post(
        `${this.baseUrl}/api/telegram-direct/live-chat/message/${this.tenantId}`,
        {
          chatId,
          displayName,
          channel: 'telegram',
          message: initMsg,
        },
        {
          timeout: this.timeout,
        }
      );

      logger.info(`Live chat started successfully for user ${chatId}`);
      return {
        success: true,
        data: response.data,
      };
    } catch (error) {
      logger.error(`Failed to start live chat for ${chatId}: ${error.message}`);
      return {
        success: false,
        error: error.message,
        statusCode: error.response?.status,
      };
    }
  }

  /**
   * Send message to live chat agent
   * @param {string} chatId - Telegram user ID (chat ID)
   * @param {Object|string} message - Telegram message object or text string
   * @returns {Promise<Object>} - API response with success flag
   */
  async sendMessage(chatId, message) {
    try {
      if (!this.baseUrl) {
        logger.warn(`Live chat API not configured for user ${chatId}`);
        return {
          success: false,
          error: 'Live chat service not configured',
        };
      }

      // Handle backward compatibility - if string passed, wrap it
      if (typeof message === 'string') {
        message = { type: 'text', text: message };
      }

      const messageType = message.type || 'text';
      logger.info(`Sending ${messageType} live chat message for user ${chatId}`);

      // Send entire Telegram message object to middleware
      const payload = {
        chatId,
        displayName: `Telegram User ${chatId}`,
        channel: 'telegram',
        message: message,
      };

      console.log(
        'telegram_connector_url=',
        `"${this.baseUrl}/api/telegram-direct/live-chat/message/${this.tenantId}"`
      );
      console.log('telegram_connector_payload=', JSON.stringify(payload));

      const response = await axios.post(
        `${this.baseUrl}/api/telegram-direct/live-chat/message/${this.tenantId}`,
        payload,
        {
          timeout: this.timeout,
          headers: { 'Content-Type': 'application/json' },
        }
      );

      logger.info(`Live chat ${messageType} sent successfully for user ${chatId}`);
      return {
        success: true,
        data: response.data,
      };
    } catch (error) {
      logger.error(`Failed to send live chat message for ${chatId}: ${error.message}`);
      console.log('error ', error);
      return {
        success: false,
        error: error.message,
        statusCode: error.response?.status,
      };
    }
  }

  /**
   * End live chat session
   */
  async endLiveChat(chatId) {
    try {
      if (!this.baseUrl) {
        logger.warn(`Live chat API not configured for user ${chatId}`);
        return {
          success: false,
          error: 'Live chat service not configured',
        };
      }

      logger.info(`Ending live chat for user ${chatId}`);

      const response = await axios.post(
        `${this.baseUrl}/api/telegram-direct/live-chat/end`,
        { chatId, channel: 'telegram' },
        {
          timeout: this.timeout,
        }
      );

      logger.info(`Live chat ended successfully for user ${chatId}`);
      return {
        success: true,
        data: response.data,
      };
    } catch (error) {
      logger.error(`Failed to end live chat for ${chatId}: ${error.message}`);
      // Don't fail if end fails — user already disconnected
      return {
        success: false,
        error: error.message,
      };
    }
  }

  /**
   * Check if live chat is available
   */
  isAvailable() {
    return !!this.baseUrl;
  }
}

// Create singleton instance
const defaultConfig = {
  baseUrl: process.env.TELEGRAM_FABBANK_LIVE_CHAT_API_URL,
  botId: 'telegram-fabbank',
  tenantId: 'showmeavaya',
  timeout: parseInt(process.env.TELEGRAM_FABBANK_LIVE_CHAT_TIMEOUT || '20000'),
};
const defaultInstance = new TelegramLiveChatService(defaultConfig);

module.exports = defaultInstance;
