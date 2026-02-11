const line = require('@line/bot-sdk');
const logger = require('../utils/logger');

class LineService {
  constructor() {
    this.client = new line.Client({
      channelAccessToken: process.env.LINE_ACCESS_TOKEN,
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

module.exports = new LineService();
