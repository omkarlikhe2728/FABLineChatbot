const templateService = require('../services/templateService');
const dialogManager = require('../services/dialogManager');
const logger = require('../../../common/utils/logger');

class CallbackHandler {
  constructor(telegramService, sessionService, config, botId) {
    this.telegramService = telegramService;
    this.sessionService = sessionService;
    this.config = config;
    this.botId = botId;
  }

  async handleCallback(chatId, action, session) {
    try {
      // Update last activity
      this.sessionService.updateLastActivity(chatId);

      switch (action) {
        case 'check_balance':
          await this.startCheckBalance(chatId);
          break;

        case 'card_services':
          await this.startCardServices(chatId);
          break;

        case 'live_chat':
          await this.startLiveChat(chatId);
          break;

        case 'end_session':
          await this.endSession(chatId);
          break;

        case 'back_to_menu':
          await this.showMainMenu(chatId);
          break;

        case 'view_mini_statement':
          await this.viewMiniStatement(chatId, session);
          break;

        case 'block_card':
          await this.startBlockCard(chatId);
          break;

        case 'unblock_card':
          await this.startUnblockCard(chatId);
          break;

        case 'report_lost_card':
          await this.startReportLostCard(chatId);
          break;

        case 'view_card_limits':
          await this.startViewCardLimits(chatId);
          break;

        default:
          logger.warn(`Unknown callback action: ${action}`);
          await this.telegramService.sendMessage(
            chatId,
            '❌ *Unknown Action*\n\nPlease try again.'
          );
      }
    } catch (error) {
      logger.error(`Error handling callback ${action} for ${chatId}:`, error);
      await this.telegramService.sendMessage(
        chatId,
        templateService.formatErrorMessage('Error', 'Failed to process your request.')
      );
    }
  }

  async startCheckBalance(chatId) {
    this.sessionService.updateDialogState(chatId, 'CHECK_BALANCE');
    await this.telegramService.sendMessage(
      chatId,
      templateService.formatPhonePrompt()
    );
  }

  async startCardServices(chatId) {
    this.sessionService.updateDialogState(chatId, 'GET_PHONE_FOR_CARDS');
    await this.telegramService.sendMessage(
      chatId,
      'Please enter your phone number to view your cards:'
    );
  }

  async startLiveChat(chatId) {
    try {
      const liveChatService = require('../services/liveChatService');

      // Get user info
      const chat = await this.telegramService.getChat(chatId);
      const displayName = chat.first_name || `User ${chatId}`;

      // Start live chat session
      await liveChatService.startLiveChat(
        chatId,
        displayName,
        'User started live chat'
      );

      // Update dialog state
      this.sessionService.updateDialogState(chatId, 'LIVE_CHAT_ACTIVE');

      // Send message
      await this.telegramService.sendMessage(
        chatId,
        templateService.formatLiveChatStartMessage()
      );
    } catch (error) {
      logger.error(`Error starting live chat for ${chatId}:`, error);
      await this.telegramService.sendMessage(
        chatId,
        '❌ *Live Chat Unavailable*\n\nCould not connect to live chat service. Please try again later.'
      );
    }
  }

  async endSession(chatId) {
    this.sessionService.deleteSession(chatId);
    await this.telegramService.sendMessage(
      chatId,
      templateService.formatGoodbyeMessage()
    );
  }

  async showMainMenu(chatId) {
    this.sessionService.updateDialogState(chatId, 'MAIN_MENU');
    await this.telegramService.sendMessageWithKeyboard(
      chatId,
      'How can I help you today?',
      templateService.getMainMenuKeyboard()
    );
  }

  async viewMiniStatement(chatId, session) {
    try {
      if (!session.attributes || !session.attributes.phone) {
        await this.telegramService.sendMessage(
          chatId,
          '❌ *Session Error*\n\nPlease check balance first to view mini statement.'
        );
        return;
      }

      const bankingService = require('../services/bankingService');
      const statement = await bankingService.getMiniStatement(session.attributes.phone, 5);

      const message = templateService.formatMiniStatementMessage(statement.data);

      await this.telegramService.sendMessageWithKeyboard(
        chatId,
        message,
        templateService.getBalanceKeyboard()
      );
    } catch (error) {
      logger.error(`Error viewing mini statement for ${chatId}:`, error);
      await this.telegramService.sendMessage(
        chatId,
        templateService.formatErrorMessage(
          'Error',
          'Could not retrieve mini statement. Please try again.'
        )
      );
    }
  }

  async startBlockCard(chatId) {
    this.sessionService.updateDialogState(chatId, 'BLOCK_CARD');
    await this.telegramService.sendMessage(
      chatId,
      'Please enter the Card ID you want to block:'
    );
  }

  async startUnblockCard(chatId) {
    this.sessionService.updateDialogState(chatId, 'UNBLOCK_CARD');
    await this.telegramService.sendMessage(
      chatId,
      'Please enter the Card ID you want to unblock:'
    );
  }

  async startReportLostCard(chatId) {
    this.sessionService.updateDialogState(chatId, 'REPORT_LOST_CARD');
    await this.telegramService.sendMessage(
      chatId,
      'Please enter the Card ID of the lost card:'
    );
  }

  async startViewCardLimits(chatId) {
    this.sessionService.updateDialogState(chatId, 'VIEW_CARD_LIMITS');
    await this.telegramService.sendMessage(
      chatId,
      'Please enter the Card ID to view limits:'
    );
  }
}

module.exports = CallbackHandler;
