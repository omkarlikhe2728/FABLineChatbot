const { Bot } = require('grammy');
const logger = require('../../../common/utils/logger');

class TelegramService {
  constructor(config) {
    this.config = config;
    this.bot = new Bot(config.botToken);
    logger.info(' Telegram service initialized');
  }

  async sendMessage(chatId, text, options = {}) {
    try {
      return await this.bot.api.sendMessage(chatId, text, {
        parse_mode: 'Markdown',
        ...options
      });
    } catch (error) {
      logger.error(`Error sending message to ${chatId}:`, error);
      throw error;
    }
  }

  async sendMessageWithKeyboard(chatId, text, keyboard) {
    try {
      return await this.sendMessage(chatId, text, {
        reply_markup: keyboard
      });
    } catch (error) {
      logger.error(`Error sending message with keyboard to ${chatId}:`, error);
      throw error;
    }
  }

  async sendPhoto(chatId, photo, options = {}) {
    try {
      return await this.bot.api.sendPhoto(chatId, photo, {
        parse_mode: 'Markdown',
        ...options
      });
    } catch (error) {
      logger.error(`Error sending photo to ${chatId}:`, error);
      throw error;
    }
  }

  async sendPhotoWithKeyboard(chatId, photo, caption, keyboard) {
    try {
      return await this.sendPhoto(chatId, photo, {
        caption,
        reply_markup: keyboard
      });
    } catch (error) {
      logger.error(`Error sending photo with keyboard to ${chatId}:`, error);
      throw error;
    }
  }

  async answerCallbackQuery(callbackQueryId, text, showAlert = false) {
    try {
      return await this.bot.api.answerCallbackQuery(callbackQueryId, {
        text,
        show_alert: showAlert
      });
    } catch (error) {
      logger.error(`Error answering callback query ${callbackQueryId}:`, error);
      throw error;
    }
  }

  async editMessageText(chatId, messageId, text, options = {}) {
    try {
      return await this.bot.api.editMessageText(chatId, messageId, text, {
        parse_mode: 'Markdown',
        ...options
      });
    } catch (error) {
      logger.error(`Error editing message ${messageId}:`, error);
      throw error;
    }
  }

  async getFile(fileId) {
    try {
      return await this.bot.api.getFile(fileId);
    } catch (error) {
      logger.error(`Error getting file ${fileId}:`, error);
      throw error;
    }
  }

  async getChat(chatId) {
    try {
      return await this.bot.api.getChat(chatId);
    } catch (error) {
      logger.error(`Error getting chat ${chatId}:`, error);
      throw error;
    }
  }

  getBot() {
    return this.bot;
  }
}

module.exports = TelegramService;
