const line = require('@line/bot-sdk');
const logger = require('../../../common/utils/logger');

class LineService {
  constructor(config) {
    this.config = config;
    this.client = new line.Client({
      channelAccessToken: config.accessToken,
    });
  }

  async replyMessage(replyToken, messages) {
    try {
      const messageArray = Array.isArray(messages) ? messages : [messages];

      // LINE allows max 5 messages per reply
      if (messageArray.length > 5) {
        logger.warn(`Message count ${messageArray.length} exceeds 5, truncating`);
      }

      console.log('📤 Sending messages:', JSON.stringify(messageArray, null, 2));
      await this.client.replyMessage(replyToken, messageArray.slice(0, 5));
      logger.info(`Reply sent with ${messageArray.length} message(s)`);
    } catch (error) {
      logger.error('Error sending reply:', error);
      throw error;
    }
  }

  async pushMessage(userId, messages) {
    try {
      const messageArray = Array.isArray(messages) ? messages : [messages];
      await this.client.pushMessage(userId, messageArray.slice(0, 5));
      logger.info(`Push message sent to user ${userId}`);
    } catch (error) {
      logger.error('Error pushing message:', error);
      throw error;
    }
  }

  async getProfile(userId) {
    try {
      const profile = await this.client.getProfile(userId);
      return profile;
    } catch (error) {
      logger.error('Error getting profile:', error);
      throw error;
    }
  }
}

// Create default instance for backward compatibility
// Config will be initialized from environment variables
const defaultConfig = {
  accessToken: process.env.FABBANK_LINE_ACCESS_TOKEN,
};

const defaultInstance = new LineService(defaultConfig);

module.exports = defaultInstance;
