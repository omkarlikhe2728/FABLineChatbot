const logger = require('../../../common/utils/logger');

class TeamsService {
  constructor(config) {
    this.appId = config.appId;
    this.appPassword = config.appPassword;
    this.botId = 'teams-fabbank';
    this.config = config;
    logger.info(`TeamsService initialized for ${this.botId}`);
  }

  /**
   * Send an Adaptive Card to a Teams user
   * Note: Actual sending happens via Express middleware with stored activity
   */
  async sendAdaptiveCard(userId, cardJson) {
    try {
      if (!cardJson) {
        logger.warn(`No card to send to ${userId}`);
        return { success: true };
      }

      logger.debug(`Preparing Adaptive Card for ${userId}`);

      // Card validation
      if (!cardJson.$schema) {
        logger.warn(`Card missing schema for ${userId}`);
      }

      return { success: true, data: { cardJson } };
    } catch (error) {
      logger.error(`Error preparing Adaptive Card for ${userId}`, error);
      return { success: false, error: error.message };
    }
  }

  /**
   * Send a proactive message via stored conversation reference
   * Called from middleware when agent replies
   */
  async sendProactiveMessage(conversationReference, text, attachments = []) {
    try {
      if (!conversationReference) {
        logger.error('No conversation reference provided for proactive message');
        return { success: false, error: 'No conversation reference' };
      }

      logger.debug(`Preparing proactive message: ${text.substring(0, 50)}`);

      return {
        success: true,
        data: {
          conversationReference,
          message: {
            type: 'message',
            text,
            attachments: attachments.length > 0 ? attachments : undefined
          }
        }
      };
    } catch (error) {
      logger.error('Error preparing proactive message', error);
      return { success: false, error: error.message };
    }
  }

  /**
   * Get Teams user profile
   */
  async getUserProfile(userId) {
    try {
      logger.debug(`Getting profile for user ${userId}`);
      // In real Bot Framework implementation, this would use the adapter
      // For now, return basic info
      return {
        success: true,
        data: {
          id: userId,
          displayName: `Teams User ${userId}`
        }
      };
    } catch (error) {
      logger.error(`Error getting profile for ${userId}`, error);
      return { success: false, error: error.message };
    }
  }

  /**
   * Validate Teams token (if needed for security)
   */
  validateToken(token) {
    try {
      // Basic validation - in production, verify JWT
      return token && token.length > 0;
    } catch (error) {
      logger.error('Error validating token', error);
      return false;
    }
  }
}

module.exports = TeamsService;
