const dialogManager = require('../services/dialogManager');
const templateService = require('../services/templateService');
const logger = require('../../../common/utils/logger');

class MessageHandler {
  constructor(telegramService, sessionService, config, botId) {
    this.telegramService = telegramService;
    this.sessionService = sessionService;
    this.config = config;
    this.botId = botId;
  }

  async handleTextMessage(chatId, text, session) {
    try {
      // Update last activity (synchronous)
      this.sessionService.updateLastActivity(chatId);

      // Check if session is closed
      if (session.dialogState === 'SESSION_CLOSED') {
        await this.telegramService.sendMessage(
          chatId,
          '⏰ *Session Ended*\n\nType /start to begin a new session.'
        );
        return;
      }

      // Process message through dialog manager
      const result = await dialogManager.processMessage(
        chatId,
        session.dialogState,
        text,
        session.attributes
      );

      // Send response messages
      await this.sendDialogResponse(chatId, result);

      // Update session state if changed (synchronous)
      if (result.newDialogState && result.newDialogState !== session.dialogState) {
        this.sessionService.updateDialogState(chatId, result.newDialogState);
      }

      // Update session attributes if provided (synchronous)
      if (result.attributes) {
        this.sessionService.updateAttributes(chatId, result.attributes);
      }
    } catch (error) {
      logger.error(`Error handling text message for ${chatId}:`, error);
      await this.telegramService.sendMessage(
        chatId,
        templateService.formatErrorMessage(
          'Error',
          'An error occurred. Please try again or type /menu.'
        )
      );
    }
  }

  async handleMediaMessage(chatId, mediaType, message, session) {
    try {
      // Update last activity
      this.sessionService.updateLastActivity(chatId);

      // Only forward media if in live chat
      if (session.dialogState === 'LIVE_CHAT_ACTIVE') {
        await this.forwardMediaToLiveChat(chatId, mediaType, message);
      } else {
        // Not in live chat, inform user
        await this.telegramService.sendMessage(
          chatId,
          ' *Cannot Send Media*\n\nMedia can only be sent during live chat.\n\nType /menu to return to main menu.'
        );
      }
    } catch (error) {
      logger.error(`Error handling ${mediaType} message for ${chatId}:`, error);
      await this.telegramService.sendMessage(
        chatId,
        templateService.formatErrorMessage('Error', 'Failed to process media.')
      );
    }
  }

  async forwardMediaToLiveChat(chatId, mediaType, message) {
    try {
      const liveChatService = require('../services/liveChatService');

      const mediaData = {
        type: mediaType,
        chatId,
        timestamp: new Date()
      };

      // Extract media information based on type
      switch (mediaType) {
        case 'photo':
          mediaData.file_id = message.photo[message.photo.length - 1].file_id;
          mediaData.caption = message.caption || '';
          break;
        case 'video':
          mediaData.file_id = message.video.file_id;
          mediaData.caption = message.caption || '';
          mediaData.duration = message.video.duration;
          break;
        case 'document':
          mediaData.file_id = message.document.file_id;
          mediaData.file_name = message.document.file_name;
          mediaData.file_size = message.document.file_size;
          break;
        case 'voice':
          mediaData.file_id = message.voice.file_id;
          mediaData.duration = message.voice.duration;
          break;
        case 'audio':
          mediaData.file_id = message.audio.file_id;
          mediaData.title = message.audio.title;
          mediaData.performer = message.audio.performer;
          mediaData.duration = message.audio.duration;
          break;
        case 'location':
          mediaData.latitude = message.location.latitude;
          mediaData.longitude = message.location.longitude;
          break;
      }

      // Send to live chat middleware
      await liveChatService.sendMessage(chatId, mediaData);

      // Confirm to user
      await this.telegramService.sendMessage(
        chatId,
        ` *Media Sent*\n\nYour ${mediaType} has been sent to the support team.`
      );
    } catch (error) {
      logger.error(`Error forwarding ${mediaType} to live chat:`, error);
      throw error;
    }
  }

  async sendDialogResponse(chatId, result) {
    try {
      if (!result.messages || result.messages.length === 0) {
        return;
      }

      for (const msg of result.messages) {
        if (msg.type === 'text') {
          if (msg.keyboard) {
            await this.telegramService.sendMessageWithKeyboard(
              chatId,
              msg.text,
              msg.keyboard
            );
          } else {
            await this.telegramService.sendMessage(chatId, msg.text);
          }
        } else if (msg.type === 'photo') {
          if (msg.keyboard) {
            await this.telegramService.sendPhotoWithKeyboard(
              chatId,
              msg.url,
              msg.text,
              msg.keyboard
            );
          } else {
            await this.telegramService.sendPhoto(chatId, msg.url, {
              caption: msg.text
            });
          }
        }

        // Small delay between messages
        await new Promise(resolve => setTimeout(resolve, 100));
      }
    } catch (error) {
      logger.error(`Error sending dialog response for ${chatId}:`, error);
      throw error;
    }
  }
}

module.exports = MessageHandler;
