const logger = require('../../../common/utils/logger');

class TemplateService {
  constructor(config) {
    this.config = config;
    this.botName = config.botName;
    logger.info(`TemplateService initialized`);
  }

  /**
   * Welcome card - shown when bot is added to conversation
   */
  getWelcomeCard() {
    return {
      "$schema": "http://adaptivecards.io/schemas/adaptive-card.json",
      "type": "AdaptiveCard",
      "version": "1.5",
      "body": [
        {
          "type": "TextBlock",
          "text": "👋 Welcome to FAB Bank!",
          "size": "large",
          "weight": "bolder",
          "color": "accent"
        },
        {
          "type": "TextBlock",
          "text": "I'm your banking assistant. How can I help you today?",
          "wrap": true,
          "spacing": "medium",
          "size": "default"
        }
      ],
      "actions": [
        {
          "type": "Action.Submit",
          "title": "💰 Check Balance",
          "data": { "action": "check_balance" }
        },
        {
          "type": "Action.Submit",
          "title": "🎴 Card Services",
          "data": { "action": "card_services" }
        },
        {
          "type": "Action.Submit",
          "title": "💬 Live Chat",
          "data": { "action": "live_chat" }
        },
        {
          "type": "Action.Submit",
          "title": "❌ End Session",
          "data": { "action": "end_session" }
        }
      ]
    };
  }

  /**
   * Main menu card
   */
  getMainMenuCard() {
    return this.getWelcomeCard();
  }

  /**
   * Phone number input prompt
   */
  getPhoneInputPrompt(message = 'Enter your phone number (e.g., +971501234567)') {
    return {
      "$schema": "http://adaptivecards.io/schemas/adaptive-card.json",
      "type": "AdaptiveCard",
      "version": "1.5",
      "body": [
        {
          "type": "TextBlock",
          "text": message,
          "wrap": true,
          "size": "default"
        },
        {
          "type": "TextBlock",
          "text": "Please reply with your phone number",
          "size": "small",
          "color": "light",
          "spacing": "small"
        }
      ]
    };
  }

  /**
   * OTP input prompt
   */
  getOTPInputPrompt(message = 'Enter the 6-digit OTP sent to your phone') {
    return {
      "$schema": "http://adaptivecards.io/schemas/adaptive-card.json",
      "type": "AdaptiveCard",
      "version": "1.5",
      "body": [
        {
          "type": "TextBlock",
          "text": "🔐 Verify OTP",
          "size": "large",
          "weight": "bolder"
        },
        {
          "type": "TextBlock",
          "text": message,
          "wrap": true,
          "spacing": "medium"
        },
        {
          "type": "TextBlock",
          "text": "Please reply with exactly 6 digits",
          "size": "small",
          "color": "light"
        }
      ]
    };
  }

  /**
   * Balance display card
   */
  getBalanceCard(data) {
    if (!data || !data.customerName) {
      logger.warn('Invalid data for balance card');
      return this.getErrorCard('Error', 'Unable to display balance');
    }

    return {
      "$schema": "http://adaptivecards.io/schemas/adaptive-card.json",
      "type": "AdaptiveCard",
      "version": "1.5",
      "body": [
        {
          "type": "Container",
          "items": [
            {
              "type": "TextBlock",
              "text": "💰 Account Balance",
              "size": "large",
              "weight": "bolder"
            },
            {
              "type": "FactSet",
              "facts": [
                {
                  "name": "Name:",
                  "value": data.customerName
                },
                {
                  "name": "Account #:",
                  "value": data.accountNumber || 'N/A'
                },
                {
                  "name": "Balance:",
                  "value": `${data.currency || 'AED'} ${data.balance || '0.00'}`
                }
              ],
              "spacing": "large"
            }
          ],
          "style": "accent"
        }
      ],
      "actions": [
        {
          "type": "Action.Submit",
          "title": "📋 View Statement",
          "data": { "action": "view_mini_statement" }
        },
        {
          "type": "Action.Submit",
          "title": "↩️ Back to Menu",
          "data": { "action": "back_to_menu" }
        }
      ]
    };
  }

  /**
   * Card list display
   */
  getCardListCard(cards) {
    if (!cards || cards.length === 0) {
      return this.getErrorCard('No Cards', 'No cards found for this account');
    }

    const cardItems = cards.map((card, index) => ({
      "type": "Container",
      "items": [
        {
          "type": "TextBlock",
          "text": `Card ${index + 1}: ${card.cardType || 'Credit Card'}`,
          "weight": "bolder"
        },
        {
          "type": "TextBlock",
          "text": `****${card.lastFourDigits || '****'}`,
          "size": "large"
        },
        {
          "type": "TextBlock",
          "text": `Status: ${card.status || 'Active'}`,
          "color": card.status === 'Active' ? 'good' : 'warning',
          "spacing": "small"
        }
      ],
      "spacing": "medium",
      "separator": index < cards.length - 1
    }));

    return {
      "$schema": "http://adaptivecards.io/schemas/adaptive-card.json",
      "type": "AdaptiveCard",
      "version": "1.5",
      "body": [
        {
          "type": "TextBlock",
          "text": "🎴 Your Cards",
          "size": "large",
          "weight": "bolder"
        },
        ...cardItems
      ],
      "actions": [
        {
          "type": "Action.Submit",
          "title": "🔒 Block Card",
          "data": { "action": "block_card" }
        },
        {
          "type": "Action.Submit",
          "title": "🔓 Unblock Card",
          "data": { "action": "unblock_card" }
        },
        {
          "type": "Action.Submit",
          "title": "📴 Report Lost",
          "data": { "action": "report_lost_card" }
        },
        {
          "type": "Action.Submit",
          "title": "↩️ Back to Menu",
          "data": { "action": "back_to_menu" }
        }
      ]
    };
  }

  /**
   * Confirmation card
   */
  getConfirmCard(title, message) {
    return {
      "$schema": "http://adaptivecards.io/schemas/adaptive-card.json",
      "type": "AdaptiveCard",
      "version": "1.5",
      "body": [
        {
          "type": "TextBlock",
          "text": title,
          "size": "large",
          "weight": "bolder"
        },
        {
          "type": "TextBlock",
          "text": message,
          "wrap": true,
          "spacing": "medium"
        }
      ],
      "actions": [
        {
          "type": "Action.Submit",
          "title": "✅ Yes",
          "data": { "action": "confirm_yes" }
        },
        {
          "type": "Action.Submit",
          "title": "❌ No",
          "data": { "action": "confirm_no" }
        }
      ]
    };
  }

  /**
   * Mini statement / transaction list
   */
  getMiniStatementCard(transactions) {
    if (!transactions || transactions.length === 0) {
      return this.getTextCard('No Transactions', 'No recent transactions found');
    }

    const txnFacts = transactions.map(tx => ({
      "name": `${tx.date || 'N/A'} - ${tx.merchant || 'Unknown'}`,
      "value": `${tx.currency || 'AED'} ${tx.amount || '0.00'}`
    }));

    return {
      "$schema": "http://adaptivecards.io/schemas/adaptive-card.json",
      "type": "AdaptiveCard",
      "version": "1.5",
      "body": [
        {
          "type": "TextBlock",
          "text": "📋 Mini Statement",
          "size": "large",
          "weight": "bolder"
        },
        {
          "type": "FactSet",
          "facts": txnFacts,
          "spacing": "medium"
        }
      ],
      "actions": [
        {
          "type": "Action.Submit",
          "title": "↩️ Back to Menu",
          "data": { "action": "back_to_menu" }
        }
      ]
    };
  }

  /**
   * Error card
   */
  getErrorCard(title, message) {
    return {
      "$schema": "http://adaptivecards.io/schemas/adaptive-card.json",
      "type": "AdaptiveCard",
      "version": "1.5",
      "body": [
        {
          "type": "TextBlock",
          "text": `❌ ${title}`,
          "size": "large",
          "color": "attention",
          "weight": "bolder"
        },
        {
          "type": "TextBlock",
          "text": message,
          "wrap": true,
          "spacing": "medium"
        }
      ]
    };
  }

  /**
   * Success card
   */
  getSuccessCard(title, message) {
    return {
      "$schema": "http://adaptivecards.io/schemas/adaptive-card.json",
      "type": "AdaptiveCard",
      "version": "1.5",
      "body": [
        {
          "type": "TextBlock",
          "text": `✅ ${title}`,
          "size": "large",
          "color": "good",
          "weight": "bolder"
        },
        {
          "type": "TextBlock",
          "text": message,
          "wrap": true,
          "spacing": "medium"
        }
      ]
    };
  }

  /**
   * Text-only card
   */
  getTextCard(title, message) {
    return {
      "$schema": "http://adaptivecards.io/schemas/adaptive-card.json",
      "type": "AdaptiveCard",
      "version": "1.5",
      "body": [
        {
          "type": "TextBlock",
          "text": title,
          "size": "large",
          "weight": "bolder"
        },
        {
          "type": "TextBlock",
          "text": message,
          "wrap": true,
          "spacing": "medium"
        }
      ]
    };
  }

  /**
   * Live chat starting card
   */
  getLiveChatStartingCard() {
    return this.getTextCard('⏳ Connecting to Agent', 'Please wait while we connect you with an agent...');
  }

  /**
   * Live chat ended card
   */
  getLiveChatEndedCard(reason = '') {
    const message = reason ? `Chat ended: ${reason}` : 'Your live chat session has ended';
    return {
      "$schema": "http://adaptivecards.io/schemas/adaptive-card.json",
      "type": "AdaptiveCard",
      "version": "1.5",
      "body": [
        {
          "type": "TextBlock",
          "text": "✅ Chat Ended",
          "size": "large",
          "color": "good",
          "weight": "bolder"
        },
        {
          "type": "TextBlock",
          "text": message,
          "wrap": true,
          "spacing": "medium"
        }
      ],
      "actions": [
        {
          "type": "Action.Submit",
          "title": "↩️ Back to Menu",
          "data": { "action": "back_to_menu" }
        }
      ]
    };
  }

  /**
   * Card ID input prompt
   */
  getCardIdInputPrompt(message = 'Enter card number (last 4 digits or full number)') {
    return {
      "$schema": "http://adaptivecards.io/schemas/adaptive-card.json",
      "type": "AdaptiveCard",
      "version": "1.5",
      "body": [
        {
          "type": "TextBlock",
          "text": message,
          "wrap": true
        }
      ]
    };
  }
}

module.exports = TemplateService;
