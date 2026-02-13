const axios = require('axios');
const logger = require('../../../common/utils/logger');

const lineService = require('../services/lineService');

class LiveChatService {
  constructor(config = {}) {
    this.baseUrl = config.baseUrl || process.env.FABBANK_LIVE_CHAT_API_URL;
    this.timeout = config.timeout || 5000;
    this.botId = config.botId || 'fabbank';
    this.tenantId = config.tenantId || 'showmeavaya';

    this.lineService = lineService;

    if (!this.baseUrl) {
      logger.warn(
        'FAB Bank LiveChatService initialization warning: Missing FABBANK_LIVE_CHAT_API_URL. ' +
          'Live chat feature will not be available. Check .env.fabbank configuration.'
      );
    } else {
      logger.info(`✅ FAB Bank LiveChatService initialized with baseUrl: ${this.baseUrl}, botId: ${this.botId}, tenantId: ${this.tenantId}`);
    }
  }

  /**
   * Initiate live chat session via middleware
   */
  async startLiveChat(userId, displayName, initialMessage = '') {
    try {
      if (!this.baseUrl) {
        logger.warn(`Live chat API not configured for user ${userId}`);
        return {
          success: false,
          error: 'Live chat service not configured',
        };
      }

      logger.info(`Starting live chat for user ${userId}: ${displayName}`);

      let initMsg = {
        type: 'text',
        text: initialMessage || 'Customer initiated live chat',
      };

      const response = await axios.post(
        `${this.baseUrl}/api/line-direct/live-chat/message/${this.tenantId}`,
        {
          userId,
          displayName,
          channel: 'line',
          message: initMsg,
        },
        {
          timeout: this.timeout,
        }
      );

      logger.info(`Live chat started successfully for user ${userId}`);
      return {
        success: true,
        data: response.data,
      };
    } catch (error) {
      logger.error(`Failed to start live chat for ${userId}: ${error.message}`);
      return {
        success: false,
        error: error.message,
        statusCode: error.response?.status,
      };
    }
  }

  /**
   * Send message to live chat agent
   * @param {string} userId - LINE user ID
   * @param {Object|string} message - Complete LINE message object or text string
   * @returns {Promise<Object>} - API response
   */
  async sendMessage(userId, message) {
    try {
      if (!this.baseUrl) {
        logger.warn(`Live chat API not configured for user ${userId}`);
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
      logger.info(`Sending ${messageType} live chat message for user ${userId}`);

      const profile = await this.lineService.getProfile(userId);

      // Send entire LINE message object to middleware
      const payload = {
        userId,
        displayName: profile.displayName,
        channel: 'line',
        message: message, // Complete LINE message object (type, id, text, contentProvider, etc.)
      };

      const response = await axios.post(
        `${this.baseUrl}/api/line-direct/live-chat/message/${this.tenantId}`,
        payload,
        {
          timeout: this.timeout,
          headers: { 'Content-Type': 'application/json' },
        }
      );

      logger.info(`Live chat ${messageType} sent successfully for user ${userId}`);
      return {
        success: true,
        data: response.data,
      };
    } catch (error) {
      logger.error(`Failed to send live chat message for ${userId}: ${error.message}`);
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
  async endLiveChat(userId) {
    try {
      if (!this.baseUrl) {
        logger.warn(`Live chat API not configured for user ${userId}`);
        return {
          success: false,
          error: 'Live chat service not configured',
        };
      }

      logger.info(`Ending live chat for user ${userId}`);

      const response = await axios.post(
        `${this.baseUrl}/api/line-direct/live-chat/end`,
        { userId },
        {
          timeout: this.timeout,
        }
      );

      logger.info(`Live chat ended successfully for user ${userId}`);
      return {
        success: true,
        data: response.data,
      };
    } catch (error) {
      logger.error(`Failed to end live chat for ${userId}: ${error.message}`);
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
  baseUrl: process.env.FABBANK_LIVE_CHAT_API_URL,
  botId: 'fabbank',
  tenantId: 'showmeavaya',
};
const defaultInstance = new LiveChatService(defaultConfig);

module.exports = defaultInstance;
