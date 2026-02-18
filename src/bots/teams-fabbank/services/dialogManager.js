const logger = require('../../../common/utils/logger');
const validators = require('../../../common/utils/validators');

class DialogManager {
  constructor(sessionService, bankingService, templateService, liveChatService, config) {
    this.sessionService = sessionService;
    this.bankingService = bankingService;
    this.templateService = templateService;
    this.liveChatService = liveChatService;
    this.config = config;
    logger.info('DialogManager initialized');
  }

  /**
   * Main entry point - process message based on current dialog state
   */
  async processMessage(userId, dialogState, text, actionData, attributes) {
    try {
      logger.debug(`Processing message in state ${dialogState}, text: "${text}"`);

      // Route based on current state
      let result;
      switch (dialogState) {
        case 'MAIN_MENU':
          result = await this._handleMainMenu(userId, text, actionData, attributes);
          break;
        case 'CHECK_BALANCE':
          result = await this._handleCheckBalance(userId, text, attributes);
          break;
        case 'VERIFY_OTP':
          result = await this._handleVerifyOTP(userId, text, attributes);
          break;
        case 'SHOW_BALANCE':
          result = await this._handleShowBalance(userId, text, actionData, attributes);
          break;
        case 'GET_PHONE_FOR_CARDS':
          result = await this._handleGetPhoneForCards(userId, text, attributes);
          break;
        case 'CARD_ACTIONS_MENU':
          result = await this._handleCardActionsMenu(userId, text, actionData, attributes);
          break;
        case 'BLOCK_CARD':
          result = await this._handleBlockCard(userId, text, attributes);
          break;
        case 'CONFIRM_BLOCK_CARD':
          result = await this._handleConfirmBlockCard(userId, text, actionData, attributes);
          break;
        case 'UNBLOCK_CARD':
          result = await this._handleUnblockCard(userId, text, attributes);
          break;
        case 'CONFIRM_UNBLOCK_CARD':
          result = await this._handleConfirmUnblockCard(userId, text, actionData, attributes);
          break;
        case 'REPORT_LOST_CARD':
          result = await this._handleReportLostCard(userId, text, attributes);
          break;
        case 'CONFIRM_REPORT_LOST':
          result = await this._handleConfirmReportLost(userId, text, actionData, attributes);
          break;
        case 'VIEW_CARD_LIMITS':
          result = await this._handleViewCardLimits(userId, text, attributes);
          break;
        case 'LIVE_CHAT_ACTIVE':
          result = await this._handleLiveChat(userId, text, attributes);
          break;
        case 'SESSION_CLOSED':
          result = { cards: [this.templateService.getTextCard('Session Closed', 'Thank you for using FAB Bank')] };
          break;
        default:
          logger.warn(`Unknown dialog state: ${dialogState}`);
          result = { cards: [this.templateService.getMainMenuCard()], newDialogState: 'MAIN_MENU' };
      }

      return result || { cards: [] };
    } catch (error) {
      logger.error(`Error processing message in state ${dialogState}`, error);
      return {
        cards: [this.templateService.getErrorCard('Error', 'An error occurred. Returning to main menu.')],
        newDialogState: 'MAIN_MENU'
      };
    }
  }

  // ==================== MAIN MENU ====================
  async _handleMainMenu(userId, text, actionData, attributes) {
    const action = actionData?.action || text?.toLowerCase().trim();

    switch (action) {
      case 'check_balance':
        return {
          cards: [this.templateService.getPhoneInputPrompt()],
          newDialogState: 'CHECK_BALANCE'
        };

      case 'card_services':
        return {
          cards: [this.templateService.getPhoneInputPrompt('Enter phone number to view your cards')],
          newDialogState: 'GET_PHONE_FOR_CARDS'
        };

      case 'live_chat':
        return await this._startLiveChat(userId, attributes);

      case 'end_session':
        return {
          cards: [this.templateService.getTextCard('Session Ended', '👋 Thank you for using FAB Bank. Goodbye!')],
          newDialogState: 'SESSION_CLOSED'
        };

      default:
        return { cards: [this.templateService.getMainMenuCard()] };
    }
  }

  // ==================== CHECK BALANCE FLOW ====================
  async _handleCheckBalance(userId, text, attributes) {
    if (!text) {
      return {
        cards: [this.templateService.getPhoneInputPrompt('Please enter your phone number')]
      };
    }

    const phone = validators.formatPhoneInput(text);
    if (!validators.isValidPhone(phone)) {
      logger.warn(`Invalid phone format: ${text}`);
      return {
        cards: [this.templateService.getErrorCard('Invalid Phone', 'Please enter valid phone (e.g., +971501234567)')]
      };
    }

    // Send OTP
    const otpResult = await this.bankingService.sendOTP(phone);
    if (!otpResult.success) {
      logger.error(`OTP send failed for phone ${phone}`);
      return {
        cards: [this.templateService.getErrorCard('Error', otpResult.message || 'Failed to send OTP')]
      };
    }

    logger.info(`OTP sent successfully for phone ${phone}`);
    return {
      cards: [this.templateService.getOTPInputPrompt()],
      newDialogState: 'VERIFY_OTP',
      attributes: { phone }
    };
  }

  // ==================== VERIFY OTP ====================
  async _handleVerifyOTP(userId, text, attributes) {
    if (!validators.isValidOTP(text)) {
      logger.warn(`Invalid OTP format: ${text}`);
      return {
        cards: [this.templateService.getErrorCard('Invalid OTP', 'OTP must be exactly 6 digits')]
      };
    }

    const phone = attributes?.phone;
    if (!phone) {
      logger.error('Phone not found in attributes for OTP verification');
      return {
        cards: [this.templateService.getErrorCard('Error', 'Session error. Please try again.')],
        newDialogState: 'MAIN_MENU'
      };
    }

    // Verify OTP
    const verifyResult = await this.bankingService.verifyOTP(phone, text);
    if (!verifyResult.success) {
      logger.error(`OTP verification failed for phone ${phone}`);
      return {
        cards: [this.templateService.getErrorCard('Verification Failed', 'Invalid OTP. Please try again.')]
      };
    }

    // Get balance
    const balanceResult = await this.bankingService.getBalance(phone);
    if (!balanceResult.success) {
      logger.error(`Balance fetch failed for phone ${phone}`);
      return {
        cards: [this.templateService.getErrorCard('Error', 'Failed to fetch balance')]
      };
    }

    const data = balanceResult.data || {};
    logger.info(`Balance fetched successfully for user ${userId}`);

    return {
      cards: [this.templateService.getBalanceCard(data)],
      newDialogState: 'SHOW_BALANCE',
      attributes: {
        phone,
        isAuthenticated: true,
        customerName: data.customerName,
        accountNumber: data.accountNumber,
        balance: data.balance,
        currency: data.currency || 'AED'
      }
    };
  }

  // ==================== SHOW BALANCE ====================
  async _handleShowBalance(userId, text, actionData, attributes) {
    const action = actionData?.action || text?.toLowerCase().trim();

    switch (action) {
      case 'view_mini_statement':
        return await this._handleMiniStatement(userId, attributes);

      case 'back_to_menu':
        return { cards: [this.templateService.getMainMenuCard()], newDialogState: 'MAIN_MENU' };

      default:
        return {
          cards: [this.templateService.getBalanceCard(attributes)]
        };
    }
  }

  // ==================== MINI STATEMENT ====================
  async _handleMiniStatement(userId, attributes) {
    const phone = attributes?.phone;
    if (!phone) {
      return {
        cards: [this.templateService.getErrorCard('Error', 'Phone information not found')],
        newDialogState: 'MAIN_MENU'
      };
    }

    const statementResult = await this.bankingService.getMiniStatement(phone, 5);
    if (!statementResult.success) {
      logger.error(`Mini statement fetch failed for phone ${phone}`);
      return {
        cards: [this.templateService.getErrorCard('Error', 'Failed to fetch statement')]
      };
    }

    const transactions = statementResult.data?.transactions || [];
    logger.info(`Mini statement fetched for user ${userId}`);

    return {
      cards: [this.templateService.getMiniStatementCard(transactions)],
      newDialogState: 'SHOW_BALANCE'
    };
  }

  // ==================== CARD SERVICES FLOW ====================
  async _handleGetPhoneForCards(userId, text, attributes) {
    if (!text) {
      return {
        cards: [this.templateService.getPhoneInputPrompt('Enter phone number to view cards')]
      };
    }

    const phone = validators.formatPhoneInput(text);
    if (!validators.isValidPhone(phone)) {
      logger.warn(`Invalid phone format: ${text}`);
      return {
        cards: [this.templateService.getErrorCard('Invalid Phone', 'Please enter valid phone (e.g., +971501234567)')]
      };
    }

    // Get cards
    const cardsResult = await this.bankingService.getCards(phone);
    if (!cardsResult.success) {
      logger.error(`Cards fetch failed for phone ${phone}`);
      return {
        cards: [this.templateService.getErrorCard('Error', 'Failed to fetch cards')]
      };
    }

    const cards = cardsResult.data?.cards || [];
    logger.info(`Cards fetched for user ${userId} - count: ${cards.length}`);

    return {
      cards: [this.templateService.getCardListCard(cards)],
      newDialogState: 'CARD_ACTIONS_MENU',
      attributes: { phone, cards }
    };
  }

  // ==================== CARD ACTIONS MENU ====================
  async _handleCardActionsMenu(userId, text, actionData, attributes) {
    const action = actionData?.action || text?.toLowerCase().trim();

    switch (action) {
      case 'block_card':
        return {
          cards: [this.templateService.getCardIdInputPrompt('Enter card number or last 4 digits')],
          newDialogState: 'BLOCK_CARD'
        };

      case 'unblock_card':
        return {
          cards: [this.templateService.getCardIdInputPrompt('Enter card number or last 4 digits')],
          newDialogState: 'UNBLOCK_CARD'
        };

      case 'report_lost_card':
        return {
          cards: [this.templateService.getCardIdInputPrompt('Enter card number or last 4 digits')],
          newDialogState: 'REPORT_LOST_CARD'
        };

      case 'back_to_menu':
        return { cards: [this.templateService.getMainMenuCard()], newDialogState: 'MAIN_MENU' };

      default:
        return {
          cards: [this.templateService.getCardListCard(attributes?.cards || [])]
        };
    }
  }

  // ==================== BLOCK CARD ====================
  async _handleBlockCard(userId, text, attributes) {
    if (!text) {
      return {
        cards: [this.templateService.getCardIdInputPrompt()]
      };
    }

    return {
      cards: [this.templateService.getConfirmCard('Block Card?', `You are about to block card ending in ${text.slice(-4)}. Continue?`)],
      newDialogState: 'CONFIRM_BLOCK_CARD',
      attributes: { ...attributes, cardId: text }
    };
  }

  async _handleConfirmBlockCard(userId, text, actionData, attributes) {
    const action = actionData?.action;

    if (action === 'confirm_no') {
      return { cards: [this.templateService.getMainMenuCard()], newDialogState: 'MAIN_MENU' };
    }

    if (action === 'confirm_yes') {
      const phone = attributes?.phone;
      const cardId = attributes?.cardId;

      const blockResult = await this.bankingService.blockCard(phone, cardId, 'Blocked by customer');
      if (!blockResult.success) {
        logger.error(`Card block failed for ${cardId}`);
        return {
          cards: [this.templateService.getErrorCard('Error', 'Failed to block card')]
        };
      }

      logger.info(`Card blocked successfully for user ${userId}`);
      return {
        cards: [this.templateService.getSuccessCard('Card Blocked', 'Your card has been blocked successfully.')],
        newDialogState: 'MAIN_MENU'
      };
    }

    return { cards: [this.templateService.getMainMenuCard()], newDialogState: 'MAIN_MENU' };
  }

  // ==================== UNBLOCK CARD ====================
  async _handleUnblockCard(userId, text, attributes) {
    if (!text) {
      return { cards: [this.templateService.getCardIdInputPrompt()] };
    }

    return {
      cards: [this.templateService.getConfirmCard('Unblock Card?', `Unblock card ending in ${text.slice(-4)}?`)],
      newDialogState: 'CONFIRM_UNBLOCK_CARD',
      attributes: { ...attributes, cardId: text }
    };
  }

  async _handleConfirmUnblockCard(userId, text, actionData, attributes) {
    const action = actionData?.action;

    if (action === 'confirm_no') {
      return { cards: [this.templateService.getMainMenuCard()], newDialogState: 'MAIN_MENU' };
    }

    if (action === 'confirm_yes') {
      const phone = attributes?.phone;
      const cardId = attributes?.cardId;

      const unblockResult = await this.bankingService.unblockCard(phone, cardId);
      if (!unblockResult.success) {
        logger.error(`Card unblock failed for ${cardId}`);
        return {
          cards: [this.templateService.getErrorCard('Error', 'Failed to unblock card')]
        };
      }

      logger.info(`Card unblocked successfully for user ${userId}`);
      return {
        cards: [this.templateService.getSuccessCard('Card Unblocked', 'Your card has been unblocked.')],
        newDialogState: 'MAIN_MENU'
      };
    }

    return { cards: [this.templateService.getMainMenuCard()], newDialogState: 'MAIN_MENU' };
  }

  // ==================== REPORT LOST CARD ====================
  async _handleReportLostCard(userId, text, attributes) {
    if (!text) {
      return { cards: [this.templateService.getCardIdInputPrompt()] };
    }

    return {
      cards: [this.templateService.getConfirmCard('Report Lost?', `Report card ending in ${text.slice(-4)} as lost?`)],
      newDialogState: 'CONFIRM_REPORT_LOST',
      attributes: { ...attributes, cardId: text }
    };
  }

  async _handleConfirmReportLost(userId, text, actionData, attributes) {
    const action = actionData?.action;

    if (action === 'confirm_no') {
      return { cards: [this.templateService.getMainMenuCard()], newDialogState: 'MAIN_MENU' };
    }

    if (action === 'confirm_yes') {
      const phone = attributes?.phone;
      const cardId = attributes?.cardId;

      const reportResult = await this.bankingService.reportLostCard(phone, cardId);
      if (!reportResult.success) {
        logger.error(`Report lost card failed for ${cardId}`);
        return {
          cards: [this.templateService.getErrorCard('Error', 'Failed to report card')]
        };
      }

      logger.info(`Card reported as lost for user ${userId}`);
      return {
        cards: [this.templateService.getSuccessCard('Card Reported', 'Your card has been reported as lost. A new card will be issued.')],
        newDialogState: 'MAIN_MENU'
      };
    }

    return { cards: [this.templateService.getMainMenuCard()], newDialogState: 'MAIN_MENU' };
  }

  // ==================== VIEW CARD LIMITS ====================
  async _handleViewCardLimits(userId, text, attributes) {
    if (!text) {
      return { cards: [this.templateService.getCardIdInputPrompt('Enter card number')] };
    }

    const cardId = text.trim();
    const limitsResult = await this.bankingService.getCardLimits(cardId);

    if (!limitsResult.success) {
      logger.error(`Card limits fetch failed for ${cardId}`);
      return {
        cards: [this.templateService.getErrorCard('Error', 'Failed to fetch card limits')]
      };
    }

    const limits = limitsResult.data || {};
    const message = `Daily Limit: ${limits.dailyLimit || 'N/A'} | Monthly Limit: ${limits.monthlyLimit || 'N/A'}`;

    return {
      cards: [this.templateService.getTextCard('Card Limits', message)],
      newDialogState: 'MAIN_MENU'
    };
  }

  // ==================== LIVE CHAT ====================
  async _startLiveChat(userId, attributes) {
    const displayName = attributes?.customerName || `Teams User ${userId}`;
    const result = await this.liveChatService.startLiveChat(
      userId,
      displayName,
      'User started live chat'
    );

    if (!result.success) {
      logger.error(`Failed to start live chat for user ${userId}`);
      return {
        cards: [this.templateService.getErrorCard('Connection Error', result.error || 'Failed to connect to agent')]
      };
    }

    logger.info(`Live chat started for user ${userId}`);
    return {
      cards: [this.templateService.getLiveChatStartingCard()],
      newDialogState: 'LIVE_CHAT_ACTIVE'
    };
  }

  async _handleLiveChat(userId, text, attributes) {
    // Check for exit keywords
    const exitKeywords = /\b(exit|quit|end chat|end session|close|menu|disconnect)\b/i;

    if (text && exitKeywords.test(text)) {
      logger.info(`User ${userId} exiting live chat`);

      const endResult = await this.liveChatService.endLiveChat(userId);
      if (!endResult.success) {
        logger.warn(`Failed to end live chat for ${userId}: ${endResult.error}`);
      }

      return {
        cards: [
          this.templateService.getLiveChatEndedCard('You have exited the chat'),
          this.templateService.getMainMenuCard()
        ],
        newDialogState: 'MAIN_MENU'
      };
    }

    // Forward message to agent
    if (text) {
      const sendResult = await this.liveChatService.sendMessage(userId, {
        type: 'text',
        text
      });

      if (!sendResult.success) {
        logger.error(`Failed to send live chat message for user ${userId}`);
        return {
          cards: [this.templateService.getErrorCard('Error', 'Failed to send message. Type "exit" to end chat.')]
        };
      }

      logger.debug(`Live chat message sent for user ${userId}`);
    }

    // No response needed - agent will reply separately
    return { cards: [] };
  }
}

module.exports = DialogManager;
