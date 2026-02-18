const { BotFrameworkAdapter, ConfigurationBotFrameworkAuthentication } = require('botbuilder');
const logger = require('../../../common/utils/logger');

class TeamsService {
  constructor(config) {
    this.appId = config.appId;
    this.appPassword = config.appPassword;
    this.botId = 'teams-fabbank';
    this.config = config;

    // Create credentials provider
    const credentialsProvider = {
      getAppPassword: async () => this.appPassword,
      isTrustedService: async () => true, // Allow all services in dev
      validateAppId: async () => true
    };

    // Initialize Bot Framework Adapter with custom auth in development
    try {
      if (process.env.NODE_ENV === 'production' && this.appId && this.appPassword) {
        // Production: use standard Azure auth
        this.adapter = new BotFrameworkAdapter({
          appId: this.appId,
          appPassword: this.appPassword
        });
      } else {
        // Development: use permissive auth
        this.adapter = new BotFrameworkAdapter({
          appId: this.appId || 'test-app-id',
          appPassword: this.appPassword || 'test-app-password',
          credentialsProvider
        });
      }
    } catch (error) {
      logger.error('Error initializing BotFrameworkAdapter', error);
      // Fallback: create adapter with minimal config
      this.adapter = new BotFrameworkAdapter({
        appId: this.appId || 'test-app-id',
        appPassword: this.appPassword || 'test-app-password'
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
   * Send an Adaptive Card to a Teams user via activity/conversation reference
   */
  async sendAdaptiveCard(activityOrRef, cardJson) {
    try {
      if (!cardJson) {
        logger.warn(`No card to send`);
        return { success: true };
      }

      if (!activityOrRef) {
        logger.warn(`No activity or conversation reference provided`);
        return { success: false, error: 'No activity/reference' };
      }

      logger.debug(`Sending Adaptive Card via adapter`);

      // Card validation
      if (!cardJson.$schema) {
        logger.warn(`Card missing schema`);
      }

      // Create proper conversation reference from activity if needed
      const conversationRef = activityOrRef.serviceUrl
        ? this.createConversationReference(activityOrRef)
        : activityOrRef;

      // Send the card using the adapter
      await this.adapter.continueConversation(conversationRef, async context => {
        await context.sendActivity({
          type: 'message',
          attachments: [{
            contentType: 'application/vnd.microsoft.card.adaptive',
            content: cardJson
          }]
        });
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
