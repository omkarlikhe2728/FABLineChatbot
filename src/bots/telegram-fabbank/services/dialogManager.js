const bankingService = require('./bankingService');
const templateService = require('./templateService');
const validators = require('../../../common/utils/validators');
const logger = require('../../../common/utils/logger');

class TelegramDialogManager {
  async processMessage(chatId, currentState, messageText, attributes = {}) {
    try {
      logger.info(`Dialog: ${currentState} | Input: ${messageText.substring(0, 50)}`);

      let result = {
        messages: [],
        newDialogState: currentState,
        attributes: attributes
      };

      switch (currentState) {
        case 'MAIN_MENU':
          // Main menu should only be reached via callbacks, not text
          result.messages = [
            {
              type: 'text',
              text: 'Please use the menu buttons below:',
              keyboard: templateService.getMainMenuKeyboard()
            }
          ];
          break;

        case 'CHECK_BALANCE':
          result = await this.handleCheckBalance(messageText, result);
          break;

        case 'VERIFY_OTP':
          result = await this.handleVerifyOtp(messageText, result, attributes);
          break;

        case 'SHOW_BALANCE':
          result = await this.handleShowBalance(messageText, result, attributes);
          break;

        case 'GET_PHONE_FOR_CARDS':
          result = await this.handleGetPhoneForCards(messageText, result);
          break;

        case 'CARD_ACTIONS_MENU':
          result = await this.handleCardActionsMenu(messageText, result, attributes);
          break;

        case 'BLOCK_CARD':
          result = await this.handleBlockCard(messageText, result);
          break;

        case 'CONFIRM_BLOCK_CARD':
          result = await this.handleConfirmBlockCard(messageText, result, attributes);
          break;

        case 'UNBLOCK_CARD':
          result = await this.handleUnblockCard(messageText, result);
          break;

        case 'CONFIRM_UNBLOCK_CARD':
          result = await this.handleConfirmUnblockCard(messageText, result, attributes);
          break;

        case 'REPORT_LOST_CARD':
          result = await this.handleReportLostCard(messageText, result);
          break;

        case 'CONFIRM_REPORT_LOST':
          result = await this.handleConfirmReportLost(messageText, result, attributes);
          break;

        case 'VIEW_CARD_LIMITS':
          result = await this.handleViewCardLimits(messageText, result, attributes);
          break;

        case 'LIVE_CHAT_ACTIVE':
          result = await this.handleLiveChat(chatId, messageText, result);
          break;

        case 'SESSION_CLOSED':
          result.messages = [{
            type: 'text',
            text: '⏰ *Session Closed*\n\nType /start to begin a new session.'
          }];
          break;

        default:
          logger.warn(`Unknown state: ${currentState}`);
          result.messages = [{
            type: 'text',
            text: '❌ *Unknown State*\n\nPlease type /start to restart.'
          }];
      }

      return result;
    } catch (error) {
      logger.error(`Dialog error in state ${currentState}:`, error);
      return {
        messages: [{
          type: 'text',
          text: templateService.formatErrorMessage('Error', 'An error occurred. Please try again.')
        }],
        newDialogState: 'MAIN_MENU',
        attributes
      };
    }
  }

  async handleCheckBalance(phoneInput, result) {
    try {
      // Validate phone
      if (!validators.isValidPhone(phoneInput)) {
        result.messages = [{
          type: 'text',
          text: templateService.formatInvalidPhoneError()
        }];
        result.newDialogState = 'CHECK_BALANCE';
        return result;
      }

      const phone = validators.formatPhoneInput(phoneInput);

      // Send OTP
      const otpResult = await bankingService.sendOTP(phone);

      if (!otpResult.success) {
        result.messages = [{
          type: 'text',
          text: templateService.formatErrorMessage('OTP Error', otpResult.message || 'Could not send OTP')
        }];
        result.newDialogState = 'CHECK_BALANCE';
        return result;
      }

      result.messages = [{
        type: 'text',
        text: templateService.formatOtpPrompt()
      }];
      result.newDialogState = 'VERIFY_OTP';
      result.attributes = { phone };

      return result;
    } catch (error) {
      logger.error('Error in CHECK_BALANCE:', error);
      result.messages = [{
        type: 'text',
        text: templateService.formatErrorMessage('Error', 'Could not process request')
      }];
      result.newDialogState = 'CHECK_BALANCE';
      return result;
    }
  }

  async handleVerifyOtp(otpInput, result, attributes) {
    try {
      // Validate OTP
      if (!otpInput || !/^\d{6}$/.test(otpInput)) {
        result.messages = [{
          type: 'text',
          text: templateService.formatInvalidOtpError()
        }];
        result.newDialogState = 'VERIFY_OTP';
        return result;
      }

      const { phone } = attributes;
      if (!phone) {
        result.messages = [{
          type: 'text',
          text: templateService.formatErrorMessage('Error', 'Session lost. Please try again.')
        }];
        result.newDialogState = 'MAIN_MENU';
        return result;
      }

      // Verify OTP
      const verifyResult = await bankingService.verifyOTP(phone, otpInput);

      if (!verifyResult.success) {
        result.messages = [{
          type: 'text',
          text: templateService.formatErrorMessage('Invalid OTP', verifyResult.message || 'OTP verification failed')
        }];
        result.newDialogState = 'VERIFY_OTP';
        return result;
      }

      // Get balance
      const balanceResult = await bankingService.getBalance(phone);

      if (!balanceResult.success) {
        result.messages = [{
          type: 'text',
          text: templateService.formatErrorMessage('Error', 'Could not retrieve balance')
        }];
        result.newDialogState = 'CHECK_BALANCE';
        return result;
      }

      const balanceMessage = templateService.formatBalanceMessage(balanceResult.data);

      result.messages = [{
        type: 'text',
        text: balanceMessage,
        keyboard: templateService.getBalanceKeyboard()
      }];
      result.newDialogState = 'SHOW_BALANCE';
      result.attributes = {
        ...attributes,
        isAuthenticated: true,
        customerName: balanceResult.data.customerName,
        accountNumber: balanceResult.data.accountNumber,
        balance: balanceResult.data.balance,
        currency: balanceResult.data.currency
      };

      return result;
    } catch (error) {
      logger.error('Error in VERIFY_OTP:', error);
      result.messages = [{
        type: 'text',
        text: templateService.formatErrorMessage('Error', 'OTP verification failed')
      }];
      result.newDialogState = 'VERIFY_OTP';
      return result;
    }
  }

  async handleShowBalance(input, result, attributes) {
    // In SHOW_BALANCE, only buttons should trigger actions
    result.messages = [{
      type: 'text',
      text: templateService.formatBalanceMessage(attributes),
      keyboard: templateService.getBalanceKeyboard()
    }];
    result.newDialogState = 'SHOW_BALANCE';
    return result;
  }

  async handleGetPhoneForCards(phoneInput, result) {
    try {
      if (!validators.isValidPhone(phoneInput)) {
        result.messages = [{
          type: 'text',
          text: templateService.formatInvalidPhoneError()
        }];
        result.newDialogState = 'GET_PHONE_FOR_CARDS';
        return result;
      }

      const phone = validators.formatPhoneInput(phoneInput);

      // Get cards
      const cardsResult = await bankingService.getCards(phone);

      if (!cardsResult.success || !cardsResult.data || cardsResult.data.length === 0) {
        result.messages = [{
          type: 'text',
          text: '❌ *No Cards Found*\n\nNo cards found for this phone number.'
        }];
        result.newDialogState = 'GET_PHONE_FOR_CARDS';
        return result;
      }

      const cardListMessage = templateService.formatCardListMessage(cardsResult.data);

      result.messages = [{
        type: 'text',
        text: cardListMessage,
        keyboard: templateService.getCardActionsKeyboard()
      }];
      result.newDialogState = 'CARD_ACTIONS_MENU';
      result.attributes = { phone, cards: cardsResult.data };

      return result;
    } catch (error) {
      logger.error('Error in GET_PHONE_FOR_CARDS:', error);
      result.messages = [{
        type: 'text',
        text: templateService.formatErrorMessage('Error', 'Could not retrieve cards')
      }];
      result.newDialogState = 'GET_PHONE_FOR_CARDS';
      return result;
    }
  }

  async handleCardActionsMenu(input, result, attributes) {
    result.messages = [{
      type: 'text',
      text: 'Please select an action:',
      keyboard: templateService.getCardActionsKeyboard()
    }];
    result.newDialogState = 'CARD_ACTIONS_MENU';
    return result;
  }

  async handleBlockCard(cardIdInput, result) {
    result.attributes = { cardId: cardIdInput.trim() };
    result.messages = [{
      type: 'text',
      text: `Please enter a reason for blocking card ${cardIdInput}:`
    }];
    result.newDialogState = 'CONFIRM_BLOCK_CARD';
    return result;
  }

  async handleConfirmBlockCard(reason, result, attributes) {
    try {
      const { phone, cardId } = attributes;

      const blockResult = await bankingService.blockCard(phone, cardId, reason);

      if (!blockResult.success) {
        result.messages = [{
          type: 'text',
          text: templateService.formatErrorMessage('Error', blockResult.message || 'Could not block card')
        }];
        result.newDialogState = 'CARD_ACTIONS_MENU';
        return result;
      }

      result.messages = [{
        type: 'text',
        text: templateService.formatSuccessMessage('Card Blocked', `Card ${cardId} has been blocked successfully.`),
        keyboard: templateService.getBackToMenuKeyboard()
      }];
      result.newDialogState = 'MAIN_MENU';
      return result;
    } catch (error) {
      logger.error('Error in CONFIRM_BLOCK_CARD:', error);
      result.messages = [{
        type: 'text',
        text: templateService.formatErrorMessage('Error', 'Could not block card')
      }];
      result.newDialogState = 'CARD_ACTIONS_MENU';
      return result;
    }
  }

  async handleUnblockCard(cardIdInput, result) {
    result.attributes = { cardId: cardIdInput.trim() };
    result.messages = [{
      type: 'text',
      text: templateService.formatConfirmationMessage(
        'Unblock Card',
        `Are you sure you want to unblock card ${cardIdInput}?`
      ),
      keyboard: templateService.getConfirmKeyboard('confirm_unblock_card', 'cancel_unblock_card')
    }];
    result.newDialogState = 'CONFIRM_UNBLOCK_CARD';
    return result;
  }

  async handleConfirmUnblockCard(confirmation, result, attributes) {
    try {
      const { phone, cardId } = attributes;

      const unblockResult = await bankingService.unblockCard(phone, cardId);

      if (!unblockResult.success) {
        result.messages = [{
          type: 'text',
          text: templateService.formatErrorMessage('Error', unblockResult.message || 'Could not unblock card')
        }];
        result.newDialogState = 'CARD_ACTIONS_MENU';
        return result;
      }

      result.messages = [{
        type: 'text',
        text: templateService.formatSuccessMessage('Card Unblocked', `Card ${cardId} has been unblocked successfully.`),
        keyboard: templateService.getBackToMenuKeyboard()
      }];
      result.newDialogState = 'MAIN_MENU';
      return result;
    } catch (error) {
      logger.error('Error in CONFIRM_UNBLOCK_CARD:', error);
      result.messages = [{
        type: 'text',
        text: templateService.formatErrorMessage('Error', 'Could not unblock card')
      }];
      result.newDialogState = 'CARD_ACTIONS_MENU';
      return result;
    }
  }

  async handleReportLostCard(cardIdInput, result) {
    result.attributes = { cardId: cardIdInput.trim() };
    result.messages = [{
      type: 'text',
      text: templateService.formatConfirmationMessage(
        'Report Lost Card',
        `You are reporting card ${cardIdInput} as lost.`
      ),
      keyboard: templateService.getConfirmKeyboard('confirm_report_lost', 'cancel_report_lost')
    }];
    result.newDialogState = 'CONFIRM_REPORT_LOST';
    return result;
  }

  async handleConfirmReportLost(confirmation, result, attributes) {
    try {
      const { phone, cardId } = attributes;

      const reportResult = await bankingService.reportLostCard(phone, cardId, 'Lost card');

      if (!reportResult.success) {
        result.messages = [{
          type: 'text',
          text: templateService.formatErrorMessage('Error', reportResult.message || 'Could not report card')
        }];
        result.newDialogState = 'CARD_ACTIONS_MENU';
        return result;
      }

      result.messages = [{
        type: 'text',
        text: templateService.formatSuccessMessage('Card Reported', `Card ${cardId} has been reported as lost.`),
        keyboard: templateService.getBackToMenuKeyboard()
      }];
      result.newDialogState = 'MAIN_MENU';
      return result;
    } catch (error) {
      logger.error('Error in CONFIRM_REPORT_LOST:', error);
      result.messages = [{
        type: 'text',
        text: templateService.formatErrorMessage('Error', 'Could not report card')
      }];
      result.newDialogState = 'CARD_ACTIONS_MENU';
      return result;
    }
  }

  async handleViewCardLimits(cardIdInput, result, attributes) {
    try {
      const { phone } = attributes;

      const limitsResult = await bankingService.getCardLimits(cardIdInput, phone);

      if (!limitsResult.success) {
        result.messages = [{
          type: 'text',
          text: templateService.formatErrorMessage('Error', 'Could not retrieve card limits')
        }];
        result.newDialogState = 'CARD_ACTIONS_MENU';
        return result;
      }

      const limitsMessage = templateService.formatCardLimitsMessage(limitsResult.data);

      result.messages = [{
        type: 'text',
        text: limitsMessage,
        keyboard: templateService.getBackToMenuKeyboard()
      }];
      result.newDialogState = 'MAIN_MENU';
      return result;
    } catch (error) {
      logger.error('Error in VIEW_CARD_LIMITS:', error);
      result.messages = [{
        type: 'text',
        text: templateService.formatErrorMessage('Error', 'Could not retrieve card limits')
      }];
      result.newDialogState = 'CARD_ACTIONS_MENU';
      return result;
    }
  }

  async handleLiveChat(chatId, messageText, result) {
    try {
      const liveChatService = require('./liveChatService');

      // Check for exit keywords
      const exitKeywords = ['exit', 'quit', 'end', 'menu', 'back', '/menu'];
      if (exitKeywords.some(keyword => messageText.toLowerCase().includes(keyword))) {
        const endResult = await liveChatService.endLiveChat(chatId);

        result.messages = [{
          type: 'text',
          text: templateService.formatLiveChatEndMessage(),
          keyboard: templateService.getMainMenuKeyboard()
        }];
        result.newDialogState = 'MAIN_MENU';
        return result;
      }

      // Send message to live chat
      const sendResult = await liveChatService.sendMessage(chatId, {
        type: 'text',
        text: messageText
      });

      if (!sendResult.success) {
        logger.error(`Failed to send live chat message: ${sendResult.error}`);
        result.messages = [{
          type: 'text',
          text: templateService.formatErrorMessage('Error', 'Could not send message to live chat')
        }];
        result.newDialogState = 'LIVE_CHAT_ACTIVE';
        return result;
      }

      result.messages = [{
        type: 'text',
        text: '✅ *Message Sent*\n\nYour message has been sent to the support team.'
      }];
      result.newDialogState = 'LIVE_CHAT_ACTIVE';

      return result;
    } catch (error) {
      logger.error('Error in LIVE_CHAT_ACTIVE:', error);
      result.messages = [{
        type: 'text',
        text: templateService.formatErrorMessage('Error', 'Could not send message to live chat')
      }];
      result.newDialogState = 'LIVE_CHAT_ACTIVE';
      return result;
    }
  }
}

const dialogManager = new TelegramDialogManager();
module.exports = dialogManager;
