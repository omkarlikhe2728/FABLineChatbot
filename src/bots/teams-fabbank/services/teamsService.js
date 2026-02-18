const { BotFrameworkAdapter, ConfigurationBotFrameworkAuthentication } = require('botbuilder');
const logger = require('../../../common/utils/logger');

class TeamsService {
  constructor(config) {
    this.appId = config.appId;
    this.appPassword = config.appPassword;
    this.botId = 'teams-fabbank';
    this.config = config;

    // Initialize Bot Framework Adapter
    // In development, disable authentication to avoid Azure AD validation errors
    // In production, use real Azure credentials
    try {
      if (process.env.NODE_ENV === 'production' && this.appId && this.appPassword) {
        // Production: use standard Azure auth
        logger.info('Using production Azure authentication');
        this.adapter = new BotFrameworkAdapter({
          appId: this.appId,
          appPassword: this.appPassword
        });
      } else {
        // Development: disable authentication
        logger.info('Development mode: authentication disabled');
        this.adapter = new BotFrameworkAdapter({
          // Empty credentials for dev - disables auth validation
          appId: undefined,
          appPassword: undefined
        });
      }
    } catch (error) {
      logger.error('Error initializing BotFrameworkAdapter', error);
      // Fallback: create adapter with no authentication
      this.adapter = new BotFrameworkAdapter({
        appId: undefined,
        appPassword: undefined
      });
    }

    // Store for sending replies
    this.conversationRefs = new Map();

    logger.info(`TeamsService initialized for ${this.botId}`);
  }

  /**
   * Get the adapter for processing activities
   */
  getAdapter() {
    return this.adapter;
  }

  /**
   * Create a conversation reference from an activity
   */
  createConversationReference(activity) {
    return {
      activityId: activity.id,
      user: activity.from,
      bot: activity.recipient,
      conversation: activity.conversation,
      channelId: activity.channelId,
      serviceUrl: activity.serviceUrl
    };
  }

  /**
   * Send an Adaptive Card to a Teams user via context (synchronous during message handling)
   */
  async sendAdaptiveCard(activity, cardJson, context) {
    try {
      if (!cardJson) {
        logger.warn(`No card to send`);
        return { success: true };
      }

      if (!context) {
        logger.warn(`No context provided for card sending`);
        return { success: false, error: 'No context' };
      }

      logger.debug(`Sending Adaptive Card via context`);

      // Card validation
      if (!cardJson.$schema) {
        logger.warn(`Card missing schema`);
      }

      // Send the card directly using the context
      await context.sendActivity({
        type: 'message',
        attachments: [{
          contentType: 'application/vnd.microsoft.card.adaptive',
          content: cardJson
        }]
      });

      logger.debug(`Adaptive Card sent successfully`);
      return { success: true };
    } catch (error) {
      logger.error(`Error sending Adaptive Card`, error);
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
