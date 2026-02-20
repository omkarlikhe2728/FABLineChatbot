const axios = require('axios');
const logger = require('../../../common/utils/logger');

/**
 * Debug Service for Teams Bot
 * Traces the exact API calls and responses
 */
class DebugService {
  constructor(tokenService) {
    this.tokenService = tokenService;
  }

  /**
   * Test sending a message using manually generated token
   * Shows exactly what happens when calling Teams API
   */
  async testManualMessageSend(serviceUrl, conversationId, userId) {
    try {
      logger.info(`\n🔍 ========== MANUAL MESSAGE SEND TEST ==========`);
      logger.info(`Testing direct message send to Teams API using manual token`);

      // Step 1: Get token
      logger.info(`\nStep 1: Getting OAuth token...`);
      const token = await this.tokenService.getToken();
      logger.info(`✅ Token obtained: ${token.substring(0, 50)}...`);
      logger.info(`   Length: ${token.length} characters`);

      // Step 2: Prepare API endpoint
      logger.info(`\nStep 2: Preparing API endpoint...`);
      logger.info(`   Service URL: ${serviceUrl}`);
      logger.info(`   Conversation ID: ${conversationId}`);

      // Construct the API endpoint (Teams Bot Framework Connector API format)
      const endpoint = `${serviceUrl}v3/conversations/${conversationId}/activities`;
      logger.info(`   Full endpoint: ${endpoint}`);

      // Step 3: Prepare message payload
      logger.info(`\nStep 3: Preparing message payload...`);
      const payload = {
        type: 'message',
        text: '🧪 Test message from manual token send - Credentials are valid!'
      };
      logger.info(`   Payload: ${JSON.stringify(payload, null, 2)}`);

      // Step 4: Set headers
      logger.info(`\nStep 4: Setting HTTP headers...`);
      const headers = {
        'Authorization': `Bearer ${token}`,
        'Content-Type': 'application/json'
      };
      logger.info(`   Authorization: Bearer ${token.substring(0, 20)}...`);
      logger.info(`   Content-Type: application/json`);

      // Step 5: Make the API call
      logger.info(`\nStep 5: Making API call to Teams...`);
      logger.info(`   Method: POST`);
      logger.info(`   URL: ${endpoint}`);

      const response = await axios.post(endpoint, payload, {
        headers,
        timeout: 10000
      });

      logger.info(`\n✅ ========== SUCCESS ==========`);
      logger.info(`Message sent successfully to Teams API!`);
      logger.info(`Response status: ${response.status}`);
      logger.info(`Response ID: ${response.data?.id || 'unknown'}`);
      logger.info(`=============================\n`);

      return {
        success: true,
        status: response.status,
        data: response.data
      };
    } catch (error) {
      logger.error(`\n❌ ========== API CALL FAILED ==========`);
      logger.error(`Error when sending message to Teams API`);

      if (error.response) {
        logger.error(`\nHTTP Status: ${error.response.status}`);
        logger.error(`Status Text: ${error.response.statusText}`);
        logger.error(`\nResponse Headers:`, error.response.headers);
        logger.error(`\nResponse Body:`, error.response.data);

        // Analyze the error
        if (error.response.status === 401) {
          logger.error(`\n❌ Authorization Error (401)`);
          logger.error(`Even though token generation works, Teams API rejected it.`);
          logger.error(`\nPossible causes:`);
          logger.error(`1. Service URL format is wrong (should be like: https://smba.trafficmanager.net/in/)`);
          logger.error(`2. Conversation ID format is wrong`);
          logger.error(`3. Teams API endpoint changed or moved`);
          logger.error(`4. Bot not registered in Teams Channel`);
          logger.error(`5. Token scope is wrong for this operation`);
        } else if (error.response.status === 400) {
          logger.error(`\n❌ Bad Request (400)`);
          logger.error(`Payload format or endpoint URL is incorrect.`);
        } else if (error.response.status === 404) {
          logger.error(`\n❌ Not Found (404)`);
          logger.error(`Service URL or conversation ID doesn't exist.`);
        }
      } else if (error.request) {
        logger.error(`\nNo response from Teams API`);
        logger.error(`Cannot reach: ${error.config?.url}`);
        logger.error(`Error: ${error.message}`);
      } else {
        logger.error(`\nError: ${error.message}`);
      }

      logger.error(`=====================================\n`);

      return {
        success: false,
        status: error.response?.status,
        error: error.message,
        details: error.response?.data
      };
    }
  }

  /**
   * Log diagnostic info about adapter and context
   */
  logContextDiagnostics(context) {
    if (!context) {
      logger.warn('No context provided for diagnostic logging');
      return;
    }

    logger.info(`\n📋 ========== CONTEXT DIAGNOSTICS ==========`);
    logger.info(`Activity Details:`);
    logger.info(`   ID: ${context.activity?.id}`);
    logger.info(`   Type: ${context.activity?.type}`);
    logger.info(`   From: ${context.activity?.from?.id}`);
    logger.info(`   Conversation: ${context.activity?.conversation?.id}`);
    logger.info(`   Channel: ${context.activity?.channelId}`);
    logger.info(`\nService URL Info:`);
    logger.info(`   Service URL: ${context.activity?.serviceUrl}`);
    logger.info(`   URL Valid: ${this.validateServiceUrl(context.activity?.serviceUrl)}`);
    logger.info(`   URL Format: ${this.getServiceUrlFormat(context.activity?.serviceUrl)}`);
    logger.info(`\nAdapter Info:`);
    logger.info(`   Adapter type: ${context.adapter?.constructor?.name}`);
    logger.info(`   Bot ID: ${context.activity?.recipient?.id}`);
    logger.info(`===========================================\n`);
  }

  /**
   * Validate service URL format
   */
  validateServiceUrl(url) {
    if (!url) return false;
    // Valid format: https://smba.trafficmanager.net/{region}/
    const validPattern = /^https:\/\/smba\.trafficmanager\.net\/[a-z]+\/$/;
    return validPattern.test(url);
  }

  /**
   * Extract service URL format info
   */
  getServiceUrlFormat(url) {
    if (!url) return 'missing';
    if (url.includes('/amer/')) return 'Americas region';
    if (url.includes('/emea/')) return 'Europe/Middle East/Africa region';
    if (url.includes('/apac/')) return 'Asia Pacific region';
    if (url.includes('/in/')) return 'India region';
    if (url.includes('/teams/')) return 'Teams region';
    return 'unknown region';
  }
}

module.exports = DebugService;
