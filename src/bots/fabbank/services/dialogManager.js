const bankingService = require('./bankingService');
const liveChatService = require('./liveChatService');
const lineService = require('./lineService');
const validators = require('../../../common/utils/validators');
const logger = require('../../../common/utils/logger');

class DialogManager {
  async processMessage(userId, dialogState, input, attributes) {
    try {
      switch (dialogState) {
        case 'CHECK_BALANCE':
          return await this.handleCheckBalanceInput(input, attributes);

        case 'VERIFY_OTP':
          return await this.handleVerifyOTP(input, attributes);

        case 'GET_PHONE_FOR_CARDS':
          return await this.handleGetPhoneForCards(input, attributes);

        case 'CARD_ACTIONS_MENU':
          return { messages: [] };

        case 'BLOCK_CARD':
          return await this.handleBlockCardInput(input, attributes);

        case 'CONFIRM_BLOCK_CARD':
          return await this.handleConfirmBlockCard(input, attributes);

        case 'UNBLOCK_CARD':
          return await this.handleUnblockCardInput(input, attributes);

        case 'CONFIRM_UNBLOCK_CARD':
          return await this.handleConfirmUnblockCard(input, attributes);

        case 'REPORT_LOST_CARD':
          return await this.handleReportLostCardInput(input, attributes);

        case 'CONFIRM_REPORT_LOST':
          return await this.handleConfirmReportLost(input, attributes);

        case 'VIEW_CARD_LIMITS':
          return await this.handleViewCardLimitsInput(input, attributes);

        case 'MAIN_MENU':
          return this.handleMainMenuInput(input);

        case 'LIVE_CHAT_ACTIVE':
          return await this._handleLiveChatMessage(userId, input);

        case 'SESSION_CLOSED':
          return {
            messages: [
              {
                type: 'text',
                text: 'Session has ended. Please follow the bot again to start a new session.',
              },
            ],
          };

        default:
          logger.debug(`No handler for dialog: ${dialogState}`);
          return { messages: [] };
      }
    } catch (error) {
      logger.error(`Dialog error in ${dialogState}:`, error);
      return {
        messages: [
          {
            type: 'text',
            text: 'An error occurred. Please try again.',
          },
        ],
      };
    }
  }

  handleMainMenuInput(input) {
    const lowerInput = input.toLowerCase().trim();

    // Check if user typed a menu option
    if (lowerInput.includes('balance') || lowerInput.includes('check')) {
      return {
        messages: [
          {
            type: 'text',
            text: '💳 Starting Balance Check...\n\nPlease enter your phone number (e.g., 9876543210 or +919876543210)',
          },
        ],
        newDialogState: 'CHECK_BALANCE',
      };
    }

    if (lowerInput.includes('card') || lowerInput.includes('service')) {
      return {
        messages: [
          {
            type: 'text',
            text: '💰 Starting Card Services...\n\nPlease enter your phone number to fetch your cards',
          },
        ],
        newDialogState: 'GET_PHONE_FOR_CARDS',
      };
    }

    if (lowerInput.includes('end') || lowerInput.includes('close') || lowerInput.includes('exit')) {
      return {
        messages: [
          {
            type: 'text',
            text: 'Thank you for using FAB Bank! Have a great day! 👋',
          },
        ],
        newDialogState: 'SESSION_CLOSED',
      };
    }

    // Default: show menu with buttons
    return {
      messages: [
        {
          type: 'text',
          text: '👇 Please select an option:',
        },
        {
          type: 'template',
          altText: 'Main Menu',
          template: {
            type: 'buttons',
            text: 'What would you like to do?',
            actions: [
              {
                type: 'postback',
                label: 'Check Balance',
                data: 'action=check_balance',
                displayText: 'Check Balance',
              },
              {
                type: 'postback',
                label: 'Card Services',
                data: 'action=card_services',
                displayText: 'Card Services',
              },
              {
                type: 'postback',
                label: 'Live Chat',
                data: 'action=live_chat',
                displayText: 'Live Chat',
              },
              {
                type: 'postback',
                label: 'End Session',
                data: 'action=end_session',
                displayText: 'End Session',
              },
            ],
          },
        },
      ],
    };
  }

  async handleCheckBalanceInput(input, attributes) {
    const phone = validators.formatPhoneInput(input);

    if (!validators.isValidPhone(phone)) {
      return {
        messages: [
          {
            type: 'text',
            text: 'Invalid phone format. Please use: +919876543210 or 9876543210',
          },
        ],
      };
    }

    // Send OTP via banking API
    const otpResult = await bankingService.sendOTP(phone);

    if (!otpResult.success) {
      return {
        messages: [
          {
            type: 'text',
            text: `Failed to send OTP: ${otpResult.message}`,
          },
        ],
      };
    }

    return {
      messages: [
        {
          type: 'text',
          text: `✅ OTP sent successfully!\nValid for ${otpResult.data.expiresInMinutes || 5} minutes.\n\nPlease enter the 6-digit OTP:`,
        },
      ],
      newDialogState: 'VERIFY_OTP',
      attributes: { phone },
    };
  }

  async handleVerifyOTP(input, attributes) {
    const otp = input.trim();

    if (!validators.isValidOTP(otp)) {
      return {
        messages: [
          {
            type: 'text',
            text: 'Invalid OTP format. Please enter 6 digits.',
          },
        ],
      };
    }

    const { phone } = attributes;

    if (!phone) {
      return {
        messages: [
          {
            type: 'text',
            text: 'Session error. Please start again.',
          },
        ],
      };
    }

    // Verify OTP
    const verifyResult = await bankingService.verifyOTP(phone, otp);

    if (!verifyResult.success || !verifyResult.data.verified) {
      return {
        messages: [
          {
            type: 'text',
            text: '❌ Invalid OTP. Please try again.',
          },
        ],
      };
    }

    // Get balance
    const balanceResult = await bankingService.getBalance(phone);

    if (!balanceResult.success) {
      return {
        messages: [
          {
            type: 'text',
            text: 'Failed to fetch balance. Please try again later.',
          },
        ],
      };
    }

    const data = balanceResult.data;
    const balanceMessage = {
      type: 'text',
      text: `💰 Account Balance\n\nName: ${data.customerName}\nAccount: ${data.accountNumber}\nType: ${data.accountType}\nBalance: $${parseFloat(data.balance).toFixed(2)} ${data.currency}\n\nWhat would you like to do next?`,
    };

    const optionsMessage = {
      type: 'template',
      altText: 'Options',
      template: {
        type: 'buttons',
        text: 'Select an option:',
        actions: [
          {
            type: 'postback',
            label: 'View Mini Statement',
            data: 'action=view_mini_statement',
          },
          {
            type: 'postback',
            label: 'Back to Menu',
            data: 'action=back_to_menu',
          },
        ],
      },
    };

    return {
      messages: [balanceMessage, optionsMessage],
      newDialogState: 'SHOW_BALANCE',
      attributes: {
        ...attributes,
        isAuthenticated: true,
        customerName: data.customerName,
        accountNumber: data.accountNumber,
        accountType: data.accountType,
        balance: data.balance,
        currency: data.currency,
      },
    };
  }

  async handleGetPhoneForCards(input, attributes) {
    const phone = validators.formatPhoneInput(input);

    if (!validators.isValidPhone(phone)) {
      return {
        messages: [
          {
            type: 'text',
            text: 'Invalid phone format. Please use: +919876543210 or 9876543210',
          },
        ],
      };
    }

    // Fetch cards
    const cardsResult = await bankingService.getCards(phone);

    if (!cardsResult.success) {
      return {
        messages: [
          {
            type: 'text',
            text: `Failed to fetch cards: ${cardsResult.message}`,
          },
        ],
      };
    }

    if (!cardsResult.data || cardsResult.data.length === 0) {
      return {
        messages: [
          {
            type: 'text',
            text: 'No cards found for your account.',
          },
        ],
      };
    }

    // Display cards
    const cardsList = cardsResult.data
      .map((card, idx) =>
        `${idx + 1}. ${card.cardType} - ${card.cardNumber} (${card.status})`
      )
      .join('\n');

    const message = {
      type: 'text',
      text: `Your Cards:\n${cardsList}\n\nWhat would you like to do?`,
    };

    const options = {
      type: 'template',
      altText: 'Card Actions',
      template: {
        type: 'buttons',
        text: 'Select action:',
        actions: [
          {
            type: 'postback',
            label: '🔒 Block Card',
            data: 'action=block_card',
          },
          {
            type: 'postback',
            label: '🔓 Unblock Card',
            data: 'action=unblock_card',
          },
          {
            type: 'postback',
            label: '⚠️ Report Lost',
            data: 'action=report_lost_card',
          },
        ],
      },
    };

    return {
      messages: [message, options],
      newDialogState: 'CARD_ACTIONS_MENU',
      attributes: { ...attributes, phone, cards: cardsResult.data },
    };
  }

  async handleBlockCardInput(input, attributes) {
    const cardId = validators.sanitizeInput(input);

    if (!cardId) {
      return {
        messages: [
          {
            type: 'text',
            text: 'Invalid card ID. Please try again.',
          },
        ],
      };
    }

    return {
      messages: [
        {
          type: 'text',
          text: 'Reason for blocking (optional):',
        },
      ],
      newDialogState: 'CONFIRM_BLOCK_CARD',
      attributes: { ...attributes, cardId },
    };
  }

  async handleConfirmBlockCard(input, attributes) {
    const { phone, cardId } = attributes;

    if (!phone || !cardId) {
      return {
        messages: [
          {
            type: 'text',
            text: 'Session error. Please start again.',
          },
        ],
      };
    }

    const reason = validators.sanitizeInput(input) || 'User request';

    const blockResult = await bankingService.blockCard(phone, cardId, reason);

    if (!blockResult.success) {
      return {
        messages: [
          {
            type: 'text',
            text: `Failed to block card: ${blockResult.message}`,
          },
        ],
      };
    }

    return {
      messages: [
        {
          type: 'text',
          text: `✅ Card ${cardId} blocked successfully!`,
        },
        {
          type: 'template',
          altText: 'Next Action',
          template: {
            type: 'buttons',
            text: 'What next?',
            actions: [
              {
                type: 'postback',
                label: 'Back to Menu',
                data: 'action=back_to_menu',
              },
            ],
          },
        },
      ],
      newDialogState: 'MAIN_MENU',
      attributes: { ...attributes },
    };
  }

  async handleUnblockCardInput(input, attributes) {
    const cardId = validators.sanitizeInput(input);

    if (!cardId) {
      return {
        messages: [
          {
            type: 'text',
            text: 'Invalid card ID. Please try again.',
          },
        ],
      };
    }

    return {
      messages: [
        {
          type: 'text',
          text: `Are you sure you want to unblock card ${cardId}?`,
        },
        {
          type: 'template',
          altText: 'Confirm',
          template: {
            type: 'buttons',
            text: 'Confirm unblock?',
            actions: [
              {
                type: 'postback',
                label: '✅ Yes, Unblock',
                data: `action=confirm_unblock&cardId=${cardId}`,
              },
              {
                type: 'postback',
                label: '❌ Cancel',
                data: 'action=back_to_menu',
              },
            ],
          },
        },
      ],
      newDialogState: 'CONFIRM_UNBLOCK_CARD',
      attributes: { ...attributes, cardId },
    };
  }

  async handleConfirmUnblockCard(input, attributes) {
    const { phone, cardId } = attributes;

    if (!phone || !cardId) {
      return {
        messages: [
          {
            type: 'text',
            text: 'Session error. Please start again.',
          },
        ],
      };
    }

    const unblockResult = await bankingService.unblockCard(phone, cardId);

    if (!unblockResult.success) {
      return {
        messages: [
          {
            type: 'text',
            text: `Failed to unblock card: ${unblockResult.message}`,
          },
        ],
      };
    }

    return {
      messages: [
        {
          type: 'text',
          text: `✅ Card ${cardId} unblocked successfully!`,
        },
        {
          type: 'template',
          altText: 'Next Action',
          template: {
            type: 'buttons',
            text: 'What next?',
            actions: [
              {
                type: 'postback',
                label: 'Back to Menu',
                data: 'action=back_to_menu',
              },
            ],
          },
        },
      ],
      newDialogState: 'MAIN_MENU',
    };
  }

  async handleReportLostCardInput(input, attributes) {
    const cardId = validators.sanitizeInput(input);

    if (!cardId) {
      return {
        messages: [
          {
            type: 'text',
            text: 'Invalid card ID. Please try again.',
          },
        ],
      };
    }

    return {
      messages: [
        {
          type: 'text',
          text: `⚠️ Report Lost Card\n\nCard ID: ${cardId}\n\nThis will immediately block your card to prevent misuse.`,
        },
        {
          type: 'template',
          altText: 'Confirm',
          template: {
            type: 'buttons',
            text: 'Confirm report lost?',
            actions: [
              {
                type: 'postback',
                label: '✅ Confirm',
                data: `action=confirm_report_lost&cardId=${cardId}`,
              },
              {
                type: 'postback',
                label: '❌ Cancel',
                data: 'action=back_to_menu',
              },
            ],
          },
        },
      ],
      newDialogState: 'CONFIRM_REPORT_LOST',
      attributes: { ...attributes, cardId },
    };
  }

  async handleConfirmReportLost(input, attributes) {
    const { phone, cardId } = attributes;

    if (!phone || !cardId) {
      return {
        messages: [
          {
            type: 'text',
            text: 'Session error. Please start again.',
          },
        ],
      };
    }

    const reportResult = await bankingService.reportLostCard(phone, cardId);

    if (!reportResult.success) {
      return {
        messages: [
          {
            type: 'text',
            text: `Failed to report card: ${reportResult.message}`,
          },
        ],
      };
    }

    return {
      messages: [
        {
          type: 'text',
          text: `✅ Card ${cardId} reported as lost!\n\nYour card has been blocked immediately. You will receive a replacement card within 5-7 business days.`,
        },
        {
          type: 'template',
          altText: 'Next Action',
          template: {
            type: 'buttons',
            text: 'What next?',
            actions: [
              {
                type: 'postback',
                label: 'Back to Menu',
                data: 'action=back_to_menu',
              },
            ],
          },
        },
      ],
      newDialogState: 'MAIN_MENU',
    };
  }

  async handleViewCardLimitsInput(input, attributes) {
    const cardId = validators.sanitizeInput(input);

    if (!cardId) {
      return {
        messages: [
          {
            type: 'text',
            text: 'Invalid card ID. Please try again.',
          },
        ],
      };
    }

    const limitsResult = await bankingService.getCardLimits(cardId);

    if (!limitsResult.success) {
      return {
        messages: [
          {
            type: 'text',
            text: `Failed to fetch limits: ${limitsResult.message}`,
          },
        ],
      };
    }

    const data = limitsResult.data;
    return {
      messages: [
        {
          type: 'text',
          text: `💳 Card Limits\n\nCard: ${data.cardNumber}\nType: ${data.cardType}\n\nDaily Limit: $${data.dailyLimit}\nMonthly Limit: $${data.monthlyLimit}\nUsed This Month: $${data.usedThisMonth}\nRemaining: $${data.remainingLimit}\n\nATM Limit: $${data.atmLimit}\nPOS Limit: $${data.posLimit}`,
        },
        {
          type: 'template',
          altText: 'Next Action',
          template: {
            type: 'buttons',
            text: 'What next?',
            actions: [
              {
                type: 'postback',
                label: 'Back to Menu',
                data: 'action=back_to_menu',
              },
            ],
          },
        },
      ],
      newDialogState: 'MAIN_MENU',
    };
  }

  async viewMiniStatement(phone, balance) {
    try {
      const result = await bankingService.getMiniStatement(phone, 5);

      if (!result.success) {
        return {
          messages: [
            {
              type: 'text',
              text: `Failed to fetch statement: ${result.message}`,
            },
          ],
        };
      }

      const transactionText = this.formatTransactions(result.data.transactions);

      return {
        messages: [
          {
            type: 'text',
            text: `📊 Last 5 Transactions:\n\n${transactionText}\n\n💰 Current Balance: $${balance}`,
          },
          {
            type: 'template',
            altText: 'Next Action',
            template: {
              type: 'buttons',
              text: 'What next?',
              actions: [
                {
                  type: 'postback',
                  label: 'Back to Menu',
                  data: 'action=back_to_menu',
                },
              ],
            },
          },
        ],
      };
    } catch (error) {
      logger.error('Mini statement error:', error);
      return {
        messages: [
          {
            type: 'text',
            text: 'Failed to fetch transactions. Please try again later.',
          },
        ],
      };
    }
  }

  formatTransactions(transactions) {
    if (!Array.isArray(transactions) || transactions.length === 0) {
      return 'No recent transactions.';
    }

    return transactions
      .slice(0, 5)
      .map((txn, idx) => {
        const date = new Date(txn.date).toLocaleDateString('en-IN');
        const amount = txn.type === 'DEBIT'
          ? `-$${Math.abs(txn.amount).toFixed(2)}`
          : `+$${txn.amount.toFixed(2)}`;

        return `${idx + 1}. ${date}\n   ${txn.description}\n   ${amount}`;
      })
      .join('\n\n');
  }

  /**
   * Start live chat session
   */
  async _startLiveChat(userId) {
    try {
      // Get user profile for display name
      const profile = await lineService.getProfile(userId);
      const displayName = profile ? profile.displayName : 'Customer';

      // Start live chat via middleware
      await liveChatService.startLiveChat(userId, displayName, 'Customer initiated live chat');
      logger.info(`Live chat started for user ${userId}`);

      return {
        messages: [
          {
            type: 'text',
            text: '💬 Please wait while we connect you with an agent.\n\nA FAB Bank team member will assist you shortly. You can also reach us at:\n📞 +1 800 123 4567\n📧 support@fabbank.com\n\n💬 Chat available 24/7',
          },
        ],
        newDialogState: 'LIVE_CHAT_ACTIVE',
      };
    } catch (error) {
      logger.error(`Failed to start live chat for ${userId}: ${error.message}`);
      // Continue with live chat anyway - user can still chat
      return {
        messages: [
          {
            type: 'text',
            text: '💬 Connecting you with an agent...\n\nYou are now in live chat mode. Type your message to connect with a FAB Bank representative.',
          },
        ],
        newDialogState: 'LIVE_CHAT_ACTIVE',
      };
    }
  }

  /**
   * Handle messages during live chat
   */
  async _handleLiveChatMessage(userId, text) {
    // Check for exit keywords
    const exitKeywords = /\b(exit|quit|end chat|exit chat|close chat|back to bot|end live chat|end session|close session|menu|main menu|disconnect)\b/i;

    if (exitKeywords.test(text)) {
      await liveChatService.endLiveChat(userId);

      // Check if user specifically asked to end session
      if (/\b(end session|close session)\b/i.test(text)) {
        return {
          messages: [
            {
              type: 'text',
              text: 'Thank you for using FAB Bank. Your session has ended. Please follow the bot again to start a new conversation.',
            },
          ],
          newDialogState: 'SESSION_CLOSED',
        };
      }

      // Otherwise return to main menu
      return {
        messages: [
          {
            type: 'text',
            text: 'Your live chat session has ended. Thank you for connecting with us! 👋',
          },
          {
            type: 'text',
            text: 'Choose an option:\n\n1️⃣ Check Balance\n2️⃣ Card Services\n3️⃣ Mini Statement\n4️⃣ Live Chat\n5️⃣ End Session',
          },
        ],
        newDialogState: 'MAIN_MENU',
      };
    }

    // Forward message to agent
    try {
      await liveChatService.sendMessage(userId, text);
      logger.info(`Message forwarded to agent for user ${userId}`);
    } catch (error) {
      logger.error(`Failed to send message to agent: ${error.message}`);
    }

    // Don't send any reply - agent will respond via middleware
    return { messages: [] };
  }
}

// Create and export singleton instance for backward compatibility
const defaultInstance = new DialogManager();

module.exports = defaultInstance;
