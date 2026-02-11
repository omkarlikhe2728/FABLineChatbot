const lineService = require('../services/lineService');
const sessionService = require('../services/sessionService');
const dialogManager = require('../services/dialogManager');
const logger = require('../../../common/utils/logger');

class MessageHandler {
  async handleTextMessage(replyToken, userId, message) {
    const text = message.text.trim();

    try {
      const session = await sessionService.getSession(userId);

      if (!session) {
        await lineService.replyMessage(replyToken, [
          {
            type: 'text',
            text: 'Session expired. Please follow the bot again.',
          },
        ]);
        return;
      }

      logger.info(`Message from ${userId}: "${text}" in dialog: ${session.dialogState}`);

      // Process message through dialog manager
      const result = await dialogManager.processMessage(
        userId,
        session.dialogState,
        text,
        session.attributes
      );

      if (result.messages && result.messages.length > 0) {
        await lineService.replyMessage(replyToken, result.messages);
      }

      if (result.newDialogState) {
        await sessionService.updateDialogState(userId, result.newDialogState);
      }

      if (result.attributes) {
        await sessionService.updateAttributes(userId, result.attributes);
      }
    } catch (error) {
      logger.error('Message handler error:', error);
      await lineService.replyMessage(replyToken, [
        {
          type: 'text',
          text: 'An error occurred. Please try again later.',
        },
      ]);
    }
  }

  async handleLiveChatMessage(replyToken, userId, message) {
    try {
      const session = await sessionService.getSession(userId);

      if (!session) {
        await lineService.replyMessage(replyToken, [
          {
            type: 'text',
            text: 'Session expired. Please follow the bot again.',
          },
        ]);
        return;
      }

      logger.info(`Live chat ${message.type} message from ${userId}`);

      // Process complete message object through dialog manager
      const result = await dialogManager.processMessage(
        userId,
        session.dialogState,
        message,  // Pass entire message object instead of just text
        session.attributes
      );

      if (result.messages && result.messages.length > 0) {
        await lineService.replyMessage(replyToken, result.messages);
      }

      if (result.newDialogState) {
        await sessionService.updateDialogState(userId, result.newDialogState);
      }

      if (result.attributes) {
        await sessionService.updateAttributes(userId, result.attributes);
      }
    } catch (error) {
      logger.error('Live chat message handler error:', error);
      await lineService.replyMessage(replyToken, [
        {
          type: 'text',
          text: 'An error occurred. Please try again later.',
        },
      ]);
    }
  }
}

module.exports = new MessageHandler();
