const templateService = require('../services/templateService');
const logger = require('../../../common/utils/logger');

class CommandHandler {
  constructor(telegramService, sessionService, config, botId) {
    this.telegramService = telegramService;
    this.sessionService = sessionService;
    this.config = config;
    this.botId = botId;
  }

  async handleCommand(chatId, command, message) {
    try {
      switch (command.toLowerCase()) {
        case 'start':
          await this.handleStart(chatId);
          break;

        case 'menu':
          await this.handleMenu(chatId);
          break;

        case 'help':
          await this.handleHelp(chatId);
          break;

        default:
          await this.telegramService.sendMessage(
            chatId,
            `❌ *Unknown Command*\n\nCommand /${command} is not recognized.\n\nType /help for available commands.`
          );
      }
    } catch (error) {
      logger.error(`Error handling command /${command} for ${chatId}:`, error);
      await this.telegramService.sendMessage(
        chatId,
        '❌ *Error*\n\nAn error occurred while processing your command.'
      );
    }
  }

  async handleStart(chatId) {
    try {
      // Create new session
      const existingSession = this.sessionService.getSession(chatId);
      if (existingSession) {
        this.sessionService.deleteSession(chatId);
      }

      this.sessionService.createSession(chatId);

      // Send welcome message with photo (if configured)
      if (this.config.welcomeImage) {
        logger.info(`🖼️ Sending welcome image from: ${this.config.welcomeImage}`);
        try {
          await this.telegramService.sendPhotoWithKeyboard(
            chatId,
            this.config.welcomeImage,
            templateService.formatWelcomeMessage(),
            templateService.getMainMenuKeyboard()
          );
          logger.info(`✅ Welcome image sent successfully to ${chatId}`);
        } catch (photoError) {
          // Fallback to text if photo fails
          logger.warn(`⚠️ Could not send welcome photo: ${photoError.message}`);
          logger.info(`Falling back to text message for ${chatId}`);
          await this.telegramService.sendMessageWithKeyboard(
            chatId,
            templateService.formatWelcomeMessage(),
            templateService.getMainMenuKeyboard()
          );
        }
      } else {
        // Send welcome message as text if no image configured
        logger.info(`ℹ️ No welcome image configured, sending text message only`);
        await this.telegramService.sendMessageWithKeyboard(
          chatId,
          templateService.formatWelcomeMessage(),
          templateService.getMainMenuKeyboard()
        );
      }

      logger.info(`User ${chatId} started bot`);
    } catch (error) {
      logger.error(`Error in /start command for ${chatId}:`, error);
      await this.telegramService.sendMessage(
        chatId,
        '❌ *Error*\n\nCould not start bot. Please try again.'
      );
    }
  }

  async handleMenu(chatId) {
    try {
      // Ensure session exists
      let session = this.sessionService.getSession(chatId);
      if (!session) {
        this.sessionService.createSession(chatId);
      }

      // Return to main menu
      this.sessionService.updateDialogState(chatId, 'MAIN_MENU');

      await this.telegramService.sendMessageWithKeyboard(
        chatId,
        templateService.formatWelcomeMessage(),
        templateService.getMainMenuKeyboard()
      );

      logger.info(`User ${chatId} requested main menu`);
    } catch (error) {
      logger.error(`Error in /menu command for ${chatId}:`, error);
      await this.telegramService.sendMessage(
        chatId,
        '❌ *Error*\n\nCould not show menu. Please try again.'
      );
    }
  }

  async handleHelp(chatId) {
    try {
      const helpMessage = (
        `*FAB Bank Bot Help*\n\n` +
        `Available Commands:\n` +
        `/start - Start the bot and show welcome message\n` +
        `/menu - Show main menu\n` +
        `/help - Show this help message\n\n` +
        `Features:\n` +
        `💳 *Check Balance* - View your account balance and mini statement\n` +
        `💰 *Card Services* - Block/Unblock cards, report lost card, view limits\n` +
        `💬 *Live Chat* - Connect with our support team 24/7\n` +
        `❌ *End Session* - Close your current session\n\n` +
        `*Authentication:*\n` +
        `We use OTP (One-Time Password) for secure access.\n` +
        `OTPs are valid for 5 minutes.\n\n` +
        `*Privacy:*\n` +
        `Your session will automatically expire after 5 minutes of inactivity.\n\n` +
        `For more help, start a *Live Chat* with our support team.`
      );

      await this.telegramService.sendMessageWithKeyboard(
        chatId,
        helpMessage,
        templateService.getMainMenuKeyboard()
      );

      logger.info(`User ${chatId} requested help`);
    } catch (error) {
      logger.error(`Error in /help command for ${chatId}:`, error);
      await this.telegramService.sendMessage(
        chatId,
        '❌ *Error*\n\nCould not show help. Please try again.'
      );
    }
  }
}

module.exports = CommandHandler;
