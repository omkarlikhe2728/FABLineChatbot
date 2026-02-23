const { BotFrameworkAdapter, ConfigurationBotFrameworkAuthentication } = require('botbuilder');
const logger = require('../../../common/utils/logger');
const TokenService = require('./tokenService');
const DebugService = require('./debugService');

class TeamsService {
  constructor(config) {
    this.appId = config.appId;
    this.appPassword = config.appPassword;
    this.microsoftAppTenantId = config.microsoftAppTenantId;
    this.botId = 'teams-itsupport';
    this.config = config;

    // Initialize manual token service for debugging/fallback
    this.tokenService = new TokenService(config);
    this.debugService = new DebugService(this.tokenService);

    // Initialize Bot Framework Adapter
    logger.debug(`Starting BotFrameworkAdapter initialization`);
    logger.debug(`Configuration: appId=${this.appId?.substring(0, 12)}..., tenantId=${this.microsoftAppTenantId?.substring(0, 12)}...`);

    // Use direct credentials approach - more reliable for token generation
    try {
      logger.debug(`Initializing BotFrameworkAdapter with direct credentials...`);

      this.adapter = new BotFrameworkAdapter({
        appId: this.appId,
        appPassword: this.appPassword
      });

      logger.debug(` BotFrameworkAdapter initialized with direct app credentials`);
      logger.debug(` BotFrameworkAdapter ready (credentials: appId present, appPassword present)`);
      this.authMethod = 'DirectCredentials';

    } catch (error) {
      logger.error(' Error initializing BotFrameworkAdapter:', error.message);
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

    logger.debug(` BotFrameworkAdapter fully initialized with ${this.authMethod}`);

    // Diagnostic logging - credentials validation
    logger.debug(`TEAMS BOT CREDENTIALS`);
    logger.debug(`Bot ID: ${this.botId}`);
    logger.debug(`App ID (full): ${this.appId}`);
    logger.debug(`App ID (masked): ${this.appId?.substring(0, 10)}...${this.appId?.substring(this.appId.length - 6)}`);
    logger.debug(`App Password Present: ${!!this.appPassword ? 'YES' : 'NO'}`);
    logger.debug(`App Password Length: ${this.appPassword?.length || 0} characters`);
    logger.debug(`Tenant ID (full): ${this.microsoftAppTenantId}`);
    logger.debug(`Tenant ID (masked): ${this.microsoftAppTenantId?.substring(0, 10)}...${this.microsoftAppTenantId?.substring(this.microsoftAppTenantId.length - 6)}`);
    logger.debug(`Auth Method: ${this.authMethod}`);
    logger.debug(`Adapter Type: ${this.adapter?.constructor?.name}`);

    // Store for sending replies
    this.conversationRefs = new Map();

    logger.debug(`Service initialized for ${this.botId}`);
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

      logger.info(`\n📤 ========== OUTBOUND MESSAGE DIAGNOSTIC ==========`);
      logger.info(`Sending Adaptive Card via context.sendActivity()`);
      logger.info(`Activity from: ${activity?.from?.id}`);
      logger.info(`Conversation: ${activity?.conversation?.id}`);
      logger.info(`Context Activity ID: ${context?.activity?.id}`);
      logger.info(`Service URL (from context): ${context?.activity?.serviceUrl}`);
      logger.info(`Service URL Valid Format: ${this.debugService?.validateServiceUrl(context?.activity?.serviceUrl) ? 'YES ' : 'NO '}`);
      logger.info(`Service URL Region: ${this.debugService?.getServiceUrlFormat(context?.activity?.serviceUrl)}`);
      logger.info(`Adapter Type: ${this.adapter?.constructor?.name}`);
      logger.info(`Auth Method: ${this.authMethod}`);
      logger.info(`================================================\n`);

      // Card validation
      if (!cardJson.$schema) {
        logger.warn(`Card missing schema`);
      }

      logger.debug(`About to send Adaptive Card...`);

      // 🔧 WORKAROUND: Use manual token + axios instead of context.sendActivity()
      // Reason: BotFrameworkAdapter.context.sendActivity() fails with HTTP 401
      //         even though manual token generation and API calls work perfectly
      // Solution: Replicate what the adapter should do internally

      try {
        // Step 1: Get OAuth token using our manual TokenService
        logger.debug(`Getting OAuth token for outbound message...`);
        const token = await this.tokenService.getToken();
        logger.debug(` Token obtained`);

        // Step 2: Prepare the API endpoint
        const serviceUrl = context.activity.serviceUrl;
        const conversationId = context.activity.conversation.id;
        const endpoint = `${serviceUrl}v3/conversations/${conversationId}/activities`;

        logger.debug(`API endpoint: ${endpoint}`);

        // Step 3: Prepare the message payload
        const axios = require('axios');
        const payload = {
          type: 'message',
          attachments: [{
            contentType: 'application/vnd.microsoft.card.adaptive',
            content: cardJson
          }]
        };

        // Step 4: Make the API call using axios
        const response = await axios.post(endpoint, payload, {
          headers: {
            'Authorization': `Bearer ${token}`,
            'Content-Type': 'application/json'
          },
          timeout: 10000
        });

        logger.debug(` Adaptive Card sent successfully via direct API call. Response ID: ${response.data?.id}`);
        return { success: true };
      } catch (manualError) {
        logger.warn(`Manual API call failed, will throw error: ${manualError.message}`);
        throw manualError;
      }
    } catch (error) {
      logger.error(` Error sending Adaptive Card`, {
        error: error.message,
        code: error.code,
        statusCode: error.statusCode,
        activity: activity?.from?.id,
        serviceUrl: context?.activity?.serviceUrl,
        fullError: JSON.stringify(error, Object.getOwnPropertyNames(error))
      });

      // Log more details for Teams authorization errors
      if (error.message?.includes('Authorization') || error.statusCode === 401) {
        logger.error(`\n ========== AUTHORIZATION ERROR (401) ==========`);
        logger.error(`This means the bot cannot generate an OAuth token to send messages.`);
        logger.error(`\nVERIFICATION CHECKLIST:`);
        logger.error(`1. Is App ID correct in Azure Portal > App registrations?`);
        logger.error(`2. Is App Password/Secret valid and NOT expired?`);
        logger.error(`3. Is Tenant ID correct in Azure Portal > Azure AD?`);
        logger.error(`4. Do .env values exactly match Azure (no extra spaces)?`);
        logger.error(`\nCurrent Configuration:`);
        logger.error(`📌 App ID: ${this.appId}`);
        logger.error(`📌 App Password Length: ${this.appPassword?.length} chars`);
        logger.error(`📌 Tenant ID: ${this.microsoftAppTenantId}`);
        logger.error(`===================================================\n`);
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

      logger.info(`📤 Sending proactive message from agent: ${text.substring(0, 50)}`);
      logger.debug(`Using conversation reference:`, {
        serviceUrl: conversationReference.serviceUrl,
        conversationId: conversationReference.conversation?.id
      });

      // Get OAuth token for Teams API call
      const token = await this.tokenService.getToken();
      logger.debug(`🔐 OAuth token obtained for proactive message`);

      // Prepare the API endpoint
      const serviceUrl = conversationReference.serviceUrl;
      const conversationId = conversationReference.conversation?.id;

      if (!serviceUrl || !conversationId) {
        logger.error('Missing serviceUrl or conversationId in conversation reference', {
          serviceUrl: !!serviceUrl,
          conversationId: !!conversationId
        });
        return { success: false, error: 'Invalid conversation reference' };
      }

      const endpoint = `${serviceUrl}v3/conversations/${conversationId}/activities`;
      logger.debug(`Teams API endpoint: ${endpoint}`);

      // Prepare the message payload
      const axios = require('axios');
      const payload = {
        type: 'message',
        text: text,
        from: {
          id: this.appId,
          name: 'IT Support Agent'
        }
      };

      if (attachments && attachments.length > 0) {
        payload.attachments = attachments;
      }

      logger.debug(`Payload prepared, making API call...`);

      // Make the API call
      const response = await axios.post(endpoint, payload, {
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json'
        },
        timeout: 10000
      });

      logger.info(`✅ Proactive message sent successfully. Response ID: ${response.data?.id}`);
      return { success: true, data: { id: response.data?.id } };
    } catch (error) {
      logger.error('Error sending proactive message', {
        message: error.message,
        code: error.code,
        statusCode: error.response?.status,
        responseData: error.response?.data
      });
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

  /**
   * Test OAuth token generation directly
   * Useful for debugging credential issues
   */
  async testTokenGeneration() {
    logger.info(`\n🧪 ========== TESTING OAUTH TOKEN GENERATION ==========`);
    logger.info(`Testing direct OAuth token generation with current credentials...`);

    const result = await this.tokenService.getTokenWithDetails();

    if (result.success) {
      logger.debug(` Token generation SUCCESSFUL`);
      logger.info(`This means your credentials are valid and working.`);
      logger.info(`If you're still getting HTTP 401 errors, the issue is likely:`);
      logger.info(`  1. Service URL format (should be cleaned by activityController)`);
      logger.info(`  2. Adapter configuration issue`);
    } else {
      logger.error(` Token generation FAILED`);
      logger.error(`Your credentials are not valid. Error: ${result.error}`);
      logger.error(`Steps to fix:`);
      logger.error(`  1. Check App ID in Azure Portal > App registrations`);
      logger.error(`  2. Check client secret is not expired`);
      logger.error(`  3. Create new secret if expired`);
      logger.error(`  4. Verify Tenant ID matches Azure AD > Tenant ID`);
    }

    logger.info(`================================================\n`);
    return result;
  }

  /**
   * Test sending a message using manually generated token
   * Simulates what BotFrameworkAdapter does internally
   */
  async testManualMessageSend(serviceUrl, conversationId) {
    logger.info(`\n🧪 ========== TESTING MESSAGE SEND TO TEAMS API ==========`);
    logger.info(`Using manually generated token to send test message`);
    logger.info(`This shows what the adapter should be doing internally\n`);

    const result = await this.debugService.testManualMessageSend(
      serviceUrl,
      conversationId,
      'test-user'
    );

    if (result.success) {
      logger.debug(` Direct message send SUCCESSFUL`);
      logger.info(`This proves your credentials and service URL are valid.`);
      logger.info(`If BotFrameworkAdapter still fails, the issue is in adapter config.`);
    } else {
      logger.error(` Direct message send FAILED`);
      logger.error(`Issue: HTTP ${result.status} - ${result.error}`);
      if (result.status === 401) {
        logger.error(`Even though token generation works, Teams API rejected the request.`);
        logger.error(`Check: Service URL format and Conversation ID`);
      }
    }

    logger.info(`=======================================================\n`);
    return result;
  }
}

module.exports = TeamsService;
