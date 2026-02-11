const line = require('@line/bot-sdk');
const logger = require('../../../common/utils/logger');

class LineService {
  constructor(config = {}) {
    const channelAccessToken = config.accessToken || process.env.SANDS_LINE_ACCESS_TOKEN;

    if (!channelAccessToken) {
      throw new Error(
        'Sands LineService initialization error: Missing SANDS_LINE_ACCESS_TOKEN. ' +
          'Check .env.sands configuration.'
      );
    }

    this.client = new line.messagingApi.MessagingApiClient({
      channelAccessToken: channelAccessToken,
    });

    logger.info('✅ Sands LineService initialized');
  }

  /**
   * Get user profile from LINE
   */
  async getProfile(userId) {
    try {
      const profile = await this.client.getProfile(userId);
      logger.info(`Retrieved profile for user ${userId}: ${profile.displayName}`);
      return profile;
    } catch (error) {
      logger.error(`Failed to get profile for ${userId}: ${error.message}`);
      throw error;
    }
  }

  /**
   * Reply to a message event
   */
  async reply(replyToken, messages) {
    try {
      logger.info(`Sending reply message (token: ${replyToken.substring(0, 10)}...)`);
      const result = await this.client.replyMessage({
        replyToken: replyToken,
        messages: messages,
      });
      logger.info('Reply sent successfully');
      return result;
    } catch (error) {
      logger.error(`replyMessage failed: ${error.message}`);

      // If reply token expired, try push message instead
      if (error.status === 400 && error.body && error.body.toString().includes('Invalid reply token')) {
        logger.warn(`Reply token expired — attempting push message fallback`);
        throw new Error('Reply token expired - cannot send message');
      }

      throw error;
    }
  }

  /**
   * Push message to a user
   */
  async pushMessage(userId, messages) {
    try {
      logger.info(`Pushing message to user ${userId}`);
      const result = await this.client.pushMessage({
        to: userId,
        messages: messages,
      });
      logger.info('Push message sent successfully');
      return result;
    } catch (error) {
      logger.error(`pushMessage failed: ${error.message}`);
      throw error;
    }
  }

  /**
   * Check if reply token is valid
   */
  isValidReplyToken(replyToken) {
    if (!replyToken) return false;
    if (/^0+$/.test(replyToken)) return false;
    if (replyToken === 'ffffffffffffffffffffffffffffffff') return false;
    return true;
  }
}

// Create singleton instance
const defaultConfig = {
  accessToken: process.env.SANDS_LINE_ACCESS_TOKEN,
};
const defaultInstance = new LineService(defaultConfig);

module.exports = defaultInstance;
