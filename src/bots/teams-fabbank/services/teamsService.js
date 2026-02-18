const { BotFrameworkAdapter, ConfigurationBotFrameworkAuthentication } = require('botbuilder');
const logger = require('../../../common/utils/logger');

class TeamsService {
  constructor(config) {
    this.appId = config.appId;
    this.appPassword = config.appPassword;
    this.microsoftAppTenantId = config.microsoftAppTenantId;
    this.botId = 'teams-fabbank';
    this.config = config;

    // Initialize Bot Framework Adapter
    logger.info(`🔐 Starting BotFrameworkAdapter initialization...`);
    logger.info(`📝 Configuration: appId=${this.appId?.substring(0, 12)}..., tenantId=${this.microsoftAppTenantId?.substring(0, 12)}...`);

    // Use direct credentials approach - more reliable for token generation
    try {
      logger.debug(`Initializing BotFrameworkAdapter with direct credentials...`);

      this.adapter = new BotFrameworkAdapter({
        appId: this.appId,
        appPassword: this.appPassword
      });

      logger.debug(`✅ BotFrameworkAdapter initialized with direct app credentials`);
      logger.info(`✅ BotFrameworkAdapter ready (credentials: appId present, appPassword present)`);
      this.authMethod = 'DirectCredentials';

    } catch (error) {
      logger.error('❌ Error initializing BotFrameworkAdapter:', error.message);
      throw new Error(`Cannot initialize BotFrameworkAdapter: ${error.message}`);
    }

    // Add error handling for adapter
    this.adapter.onTurnError = async (context, error) => {
      logger.error('🚨 BotFrameworkAdapter onTurnError:', {
        message: error.message,
        code: error.code,
        statusCode: error.statusCode
      });
      try {
        await context.sendTraceActivity('TurnError', `${error.message}`);
      } catch (traceError) {
        logger.error('Could not send trace activity:', traceError.message);
      }
    };

    logger.info(`✅ BotFrameworkAdapter fully initialized with ${this.authMethod}`);

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
      logger.debug(`Activity from: ${activity?.from?.id}, conversation: ${activity?.conversation?.id}`);
      logger.debug(`Context activity ID: ${context?.activity?.id}`);
      logger.debug(`Service URL: ${context?.activity?.serviceUrl}`);
      logger.debug(`Adapter type: ${this.adapter?.constructor?.name}`);

      // Card validation
      if (!cardJson.$schema) {
        logger.warn(`Card missing schema`);
      }

      logger.debug(`About to call context.sendActivity()...`);

      // Send the card directly using the context
      const response = await context.sendActivity({
        type: 'message',
        attachments: [{
          contentType: 'application/vnd.microsoft.card.adaptive',
          content: cardJson
        }]
      });

      logger.info(`✅ Adaptive Card sent successfully. Response ID: ${response?.id}`);
      return { success: true };
    } catch (error) {
      logger.error(`❌ Error sending Adaptive Card`, {
        error: error.message,
        code: error.code,
        statusCode: error.statusCode,
        activity: activity?.from?.id,
        serviceUrl: context?.activity?.serviceUrl,
        fullError: JSON.stringify(error, Object.getOwnPropertyNames(error))
      });

      // Log more details for Teams authorization errors
      if (error.message?.includes('Authorization') || error.statusCode === 401) {
        logger.error(`❌ Authorization error (401) - Adapter may not be getting token correctly:`, {
          errorCode: error.code,
          statusCode: error.statusCode,
          headers: error.headers,
          message: error.message,
          authMethod: this.authMethod,
          adapterAuth: this.adapter?.authentication?.constructor?.name
        });
      }

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
