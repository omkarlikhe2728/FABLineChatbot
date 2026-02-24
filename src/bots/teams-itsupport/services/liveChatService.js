const axios = require('axios');
const logger = require('../../../common/utils/logger');

class LiveChatService {
  constructor(config) {
    this.baseUrl = config.liveChatApiUrl;
    this.tenantId = config.tenantId;
    this.timeout = config.liveChatTimeout;
    this.botId = 'teams-itsupport';

    this.client = axios.create({
      timeout: this.timeout,
      headers: { 'Content-Type': 'application/json' }
    });

    logger.debug(`Service initialized for ${this.botId}`);
    logger.debug(`Middleware URL: ${this.baseUrl}, Tenant: ${this.tenantId}`);
  }

  /**
   * Get Teams user display name with truncation
   * Avaya API rejects displayName > 70 characters
   * @private
   */
  async _getDisplayName(userId) {
    try {
      // Get display name from Teams user ID
      // Teams format: '29:1YQp_...' - extract meaningful part
      let displayName = 'Teams User';

      // Try to extract from user ID if available
      if (userId && userId.length > 0) {
        displayName = `Teams User ${userId.substring(0, 8)}`;
      }

      // Truncate to max 70 characters (Avaya API requirement)
      if (displayName.length > 70) {
        displayName = displayName.substring(0, 67) + '...';
      }

      logger.debug(`Display name prepared: "${displayName}" (${displayName.length} chars)`);
      return displayName;
    } catch (error) {
      logger.warn(`Error getting display name: ${error.message}. Using fallback.`);
      return 'Teams User';
    }
  }

  /**
   * Start live chat session
   * Sends initial message to Avaya via middleware
   */
  async startLiveChat(userId, displayName, initialMessage) {
    try {
      const endpoint = `${this.baseUrl}api/teams-itsupport-direct/live-chat/start`;
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
   * Forwards raw Teams webhook data as-is to middleware
   * @param {string} userId - Teams user ID
   * @param {object} rawWebhookData - Raw Teams webhook data object (text, image, pdf, video, audio)
   * @param {string} displayName - User's display name from Teams (optional, falls back to generated name)
   */
  async sendMessage(userId, rawWebhookData, displayName) {
    try {
      const endpoint = `${this.baseUrl}api/teams-itsupport-direct/live-chat/message/${this.tenantId}`;

      // Use provided displayName or generate one, truncate to max 70 chars (Avaya requirement)
      if (!displayName) {
        displayName = await this._getDisplayName(userId);
      }
      if (displayName.length > 70) {
        displayName = displayName.substring(0, 67) + '...';
      }

      // Send raw Teams webhook data as-is in the message field
      const payload = {
        userId,
        displayName,
        channel: 'teams',
        message: rawWebhookData  // Raw Teams webhook data object as-is
      };

      logger.info(`Sending raw webhook data to middleware for user ${userId}`);
      logger.debug(`Endpoint: ${endpoint}`);
      logger.debug(`Payload keys: userId, displayName="${displayName}", channel=teams, message keys: [${Object.keys(rawWebhookData || {}).join(', ')}]`);

      const response = await this.client.post(endpoint, payload);

      logger.info(`✅ Raw webhook data sent successfully for user ${userId}`);
      return { success: true, data: response.data };
    } catch (error) {
      logger.error(`Failed to send message for user ${userId}`, {
        message: error.message,
        status: error.response?.status,
        data: error.response?.data
      });
      return {
        success: false,
        error: error.message || 'Failed to send message'
      };
    }
  }

  /**
   * End live chat session
   */
  async endLiveChat(userId) {
    try {
      const endpoint = `${this.baseUrl}api/teams-itsupport-direct/live-chat/end`;
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
