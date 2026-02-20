const logger = require('../../../common/utils/logger');

class TelegramTemplateService {
  constructor() {
    logger.info(' Telegram Template Service initialized');
  }

  getMainMenuKeyboard() {
    return {
      inline_keyboard: [
        [
          { text: '💳 Check Balance', callback_data: 'action=check_balance' },
          { text: '💰 Card Services', callback_data: 'action=card_services' }
        ],
        [
          { text: '💬 Live Chat', callback_data: 'action=live_chat' },
          { text: ' End Session', callback_data: 'action=end_session' }
        ]
      ]
    };
  }

  getBalanceKeyboard() {
    return {
      inline_keyboard: [
        [{ text: '📊 Mini Statement', callback_data: 'action=view_mini_statement' }],
        [{ text: '🏠 Back to Menu', callback_data: 'action=back_to_menu' }]
      ]
    };
  }

  getCardActionsKeyboard() {
    return {
      inline_keyboard: [
        [{ text: '🔒 Block Card', callback_data: 'action=block_card' }],
        [{ text: '🔓 Unblock Card', callback_data: 'action=unblock_card' }],
        [{ text: '⚠️ Report Lost', callback_data: 'action=report_lost_card' }],
        [{ text: '📊 View Limits', callback_data: 'action=view_card_limits' }],
        [{ text: '🏠 Back to Menu', callback_data: 'action=back_to_menu' }]
      ]
    };
  }

  getConfirmKeyboard(confirmAction, cancelAction = 'back_to_menu') {
    return {
      inline_keyboard: [
        [
          { text: ' Confirm', callback_data: `action=${confirmAction}` },
          { text: ' Cancel', callback_data: `action=${cancelAction}` }
        ]
      ]
    };
  }

  getYesNoKeyboard(yesAction, noAction) {
    return {
      inline_keyboard: [
        [
          { text: ' Yes', callback_data: `action=${yesAction}` },
          { text: ' No', callback_data: `action=${noAction}` }
        ]
      ]
    };
  }

  getBackToMenuKeyboard() {
    return {
      inline_keyboard: [
        [{ text: '🏠 Back to Menu', callback_data: 'action=back_to_menu' }]
      ]
    };
  }

  formatWelcomeMessage() {
    return 'Welcome to *FAB Bank* 🏦\n\nI\'m your banking assistant. How can I help you today?';
  }

  formatBalanceMessage(data) {
    if (!data) {
      return ' Unable to retrieve balance information';
    }

    return (
      `💰 *Account Balance*\n\n` +
      `*Name:* ${data.customerName || 'N/A'}\n` +
      `*Account:* ${data.accountNumber || 'N/A'}\n` +
      `*Type:* ${data.accountType || 'N/A'}\n` +
      `*Balance:* $${parseFloat(data.balance || 0).toFixed(2)} ${data.currency || 'AED'}`
    );
  }

  formatCardListMessage(cards) {
    if (!cards || cards.length === 0) {
      return ' No cards found for this account';
    }

    let message = `💳 *Your Cards*\n\n`;
    cards.forEach((card, index) => {
      const status = card.status === 'active' ? '' : '';
      message += `${index + 1}. ${status} ${card.cardType || 'Card'}\n`;
      message += `   ID: \`${card.cardId || 'N/A'}\`\n`;
      message += `   Status: ${card.status || 'Unknown'}\n\n`;
    });

    return message;
  }

  formatMiniStatementMessage(data) {
    if (!data || !data.transactions || data.transactions.length === 0) {
      return '📊 *Mini Statement*\n\nNo recent transactions';
    }

    let message = `📊 *Mini Statement*\n\n`;
    data.transactions.forEach((transaction, index) => {
      const type = transaction.type === 'debit' ? '➖' : '➕';
      message += `${index + 1}. ${type} $${Math.abs(transaction.amount).toFixed(2)}\n`;
      message += `   Date: ${transaction.date}\n`;
      message += `   Desc: ${transaction.description}\n\n`;
    });

    return message;
  }

  formatCardLimitsMessage(data) {
    if (!data) {
      return ' Unable to retrieve card limits';
    }

    return (
      `📊 *Card Limits*\n\n` +
      `*Card:* ${data.cardNumber || 'N/A'}\n` +
      `*Type:* ${data.cardType || 'N/A'}\n\n` +
      `*Daily Limit:* $${parseFloat(data.dailyLimit || 0).toFixed(2)}\n` +
      `*Monthly Limit:* $${parseFloat(data.monthlyLimit || 0).toFixed(2)}\n` +
      `*Used This Month:* $${parseFloat(data.usedThisMonth || 0).toFixed(2)}\n` +
      `*Remaining:* $${parseFloat(data.remainingLimit || 0).toFixed(2)}\n\n` +
      `*ATM Limit:* $${parseFloat(data.atmLimit || 0).toFixed(2)}\n` +
      `*POS Limit:* $${parseFloat(data.posLimit || 0).toFixed(2)}`
    );
  }

  formatErrorMessage(errorTitle, errorMessage) {
    return ` *${errorTitle}*\n\n${errorMessage}`;
  }

  formatSuccessMessage(title, message) {
    return ` *${title}*\n\n${message}`;
  }

  formatConfirmationMessage(title, details) {
    return `⚠️ *${title}*\n\n${details}\n\nPlease confirm this action.`;
  }

  formatLiveChatStartMessage() {
    return (
      `💬 *Live Chat Started*\n\n` +
      `You are now connected with our support team.\n` +
      `They are available 24/7 to help you.\n\n` +
      `Type \`exit\` or \`menu\` to end the chat.`
    );
  }

  formatLiveChatEndMessage() {
    return (
      `💬 *Chat Ended*\n\n` +
      `Thank you for using our support service.\n` +
      `We appreciate your feedback!`
    );
  }

  formatPhonePrompt() {
    return `Please enter your registered phone number:\n\n(e.g., +919876543210)`;
  }

  formatOtpPrompt() {
    return ` OTP sent to your registered phone number\n\nPlease enter the 6-digit OTP:`;
  }

  formatInvalidPhoneError() {
    return ` *Invalid Phone Number*\n\nPlease enter a valid phone number with country code\n(e.g., +919876543210)`;
  }

  formatInvalidOtpError() {
    return ` *Invalid OTP*\n\nOTP must be 6 digits. Please try again.`;
  }

  formatOtpExpiredError() {
    return ` *OTP Expired*\n\nYour OTP has expired. Please request a new one.`;
  }

  formatSessionExpiredMessage() {
    return `⏰ *Session Expired*\n\nYour session has expired due to inactivity.\n\nType /start to begin again.`;
  }

  formatGoodbyeMessage() {
    return `👋 *Thank you for using FAB Bank*\n\nWe appreciate your business!\n\nType /start to use the bot again.`;
  }
}

const templateService = new TelegramTemplateService();
module.exports = templateService;
