const MessageHandler = require('../handlers/messageHandler');
const CallbackHandler = require('../handlers/callbackHandler');
const CommandHandler = require('../handlers/commandHandler');
const logger = require('../../../common/utils/logger');

class UpdateController {
  constructor(telegramService, sessionService, config, botId) {
    this.telegramService = telegramService;
    this.sessionService = sessionService;
    this.config = config;
    this.botId = botId;

    this.messageHandler = new MessageHandler(
      telegramService,
      sessionService,
      config,
      botId
    );
    this.callbackHandler = new CallbackHandler(
      telegramService,
      sessionService,
      config,
      botId
    );
    this.commandHandler = new CommandHandler(
      telegramService,
      sessionService,
      config,
      botId
    );
  }

  async processUpdate(update) {
    try {
      if (update.message) {
        await this.handleMessage(update.message);
      } else if (update.callback_query) {
        await this.handleCallbackQuery(update.callback_query);
      } else {
        logger.debug('Unhandled update type:', update);
      }
    } catch (error) {
      logger.error('Error processing update:', error);
    }
  }

  async handleMessage(message) {
    const chatId = message.chat.id;

    try {
      // Ensure session exists (synchronous)
      let session = this.sessionService.getSession(chatId);
      if (!session) {
        this.sessionService.createSession(chatId);
        session = this.sessionService.getSession(chatId);
      }

      // Handle commands
      if (message.text && message.text.startsWith('/')) {
        const command = message.text.substring(1).split(' ')[0];
        await this.commandHandler.handleCommand(chatId, command, message);
        return;
      }

      // Handle regular messages
      if (message.text) {
        await this.messageHandler.handleTextMessage(chatId, message.text, session);
      } else if (message.photo) {
        await this.messageHandler.handleMediaMessage(chatId, 'photo', message, session);
      } else if (message.video) {
        await this.messageHandler.handleMediaMessage(chatId, 'video', message, session);
      } else if (message.document) {
        await this.messageHandler.handleMediaMessage(chatId, 'document', message, session);
      } else if (message.voice) {
        await this.messageHandler.handleMediaMessage(chatId, 'voice', message, session);
      } else if (message.audio) {
        await this.messageHandler.handleMediaMessage(chatId, 'audio', message, session);
      } else if (message.location) {
        await this.messageHandler.handleMediaMessage(chatId, 'location', message, session);
      } else {
        // Unsupported message type
        await this.telegramService.sendMessage(
          chatId,
          '❌ *Unsupported Message Type*\n\nPlease send text or use the menu buttons.'
        );
      }
    } catch (error) {
      logger.error(`Error handling message for ${chatId}:`, error);
      await this.telegramService.sendMessage(
        chatId,
        '❌ *Error*\n\nAn error occurred. Please try again or type /menu to return to the main menu.'
      );
    }
  }

  async handleCallbackQuery(callbackQuery) {
    const chatId = callbackQuery.from.id;

    try {
      // Answer callback query (shows loading state)
      await this.telegramService.answerCallbackQuery(callbackQuery.id);

      // Get session (synchronous)
      const session = this.sessionService.getSession(chatId);
      if (!session) {
        await this.telegramService.sendMessage(
          chatId,
          '⏰ *Session Expired*\n\nYour session has expired. Type /start to begin again.'
        );
        return;
      }

      // Parse action
      const params = new URLSearchParams(callbackQuery.data);
      const action = params.get('action');

      // Handle callback
      await this.callbackHandler.handleCallback(chatId, action, session);
    } catch (error) {
      logger.error(`Error handling callback query for ${chatId}:`, error);
      await this.telegramService.sendMessage(
        chatId,
        '❌ *Error*\n\nAn error occurred while processing your request.'
      );
    }
  }
}

module.exports = UpdateController;
