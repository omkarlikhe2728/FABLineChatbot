const axios = require('axios');
const logger = require('../../../common/utils/logger');

class LiveChatService {
  constructor(config) {
    this.baseUrl = config.liveChatApiUrl;
    this.tenantId = config.tenantId;
    this.timeout = config.liveChatTimeout;
    this.botId = 'teams-fabbank';

    this.client = axios.create({
      timeout: this.timeout,
      headers: { 'Content-Type': 'application/json' }
    });

    logger.info(`LiveChatService initialized for ${this.botId}`);
    logger.info(`Middleware URL: ${this.baseUrl}, Tenant: ${this.tenantId}`);
  }

  /**
   * Start live chat session
   * Sends initial message to Avaya via middleware
   */
  async startLiveChat(userId, displayName, initialMessage) {
    try {
      const endpoint = `${this.baseUrl}api/teams-direct/live-chat/message/${this.tenantId}`;
      logger.info(`Starting live chat for user ${userId} at ${endpoint}`);

      const payload = {
        userId,
        displayName,
        channel: 'teams',
        message: {
          type: 'text',
          text: initialMessage
        }
      };

      const response = await this.client.post(endpoint, payload);

      logger.info(`Live chat started for user ${userId}`);
      return { success: true, data: response.data };
    } catch (error) {
      logger.error(`Failed to start live chat for user ${userId}`, {
        message: error.message,
        status: error.response?.status,
        data: error.response?.data
      });
      return { success: false, error: error.message || 'Failed to start live chat' };
    }
  }

  /**
   * Send message during active live chat
   */
  async sendMessage(userId, message) {
    try {
      const endpoint = `${this.baseUrl}api/teams-direct/live-chat/message/${this.tenantId}`;
      logger.debug(`Sending live chat message from user ${userId}`);

      const payload = {
        userId,
        displayName: `Teams User ${userId}`,
        channel: 'teams',
        message
      };

      const response = await this.client.post(endpoint, payload);

      logger.debug(`Message sent to live chat for user ${userId}`);
      return { success: true, data: response.data };
    } catch (error) {
      logger.error(`Failed to send live chat message for user ${userId}`, {
        message: error.message,
        status: error.response?.status
      });
      return { success: false, error: error.message || 'Failed to send message' };
    }
  }

  /**
   * End live chat session
   */
  async endLiveChat(userId) {
    try {
      const endpoint = `${this.baseUrl}api/teams-direct/live-chat/end`;
      logger.info(`Ending live chat for user ${userId}`);

      const payload = {
        userId,
        channel: 'teams'
      };

      const response = await this.client.post(endpoint, payload);

      logger.info(`Live chat ended for user ${userId}`);
      return { success: true, data: response.data };
    } catch (error) {
      logger.error(`Failed to end live chat for user ${userId}`, {
        message: error.message,
        status: error.response?.status
      });
      return { success: false, error: error.message || 'Failed to end chat' };
    }
  }

  /**
   * Check if user is in active live chat
   */
  isLiveChat(dialogState) {
    return dialogState === 'LIVE_CHAT_ACTIVE';
  }

  /**
   * Get middleware base URL
   */
  getMiddlewareUrl() {
    return this.baseUrl;
  }
}

module.exports = LiveChatService;
