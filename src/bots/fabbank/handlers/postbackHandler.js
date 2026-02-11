const lineService = require('../services/lineService');
const sessionService = require('../services/sessionService');
const bankingService = require('../services/bankingService');
const dialogManager = require('../services/dialogManager');
const logger = require('../../../common/utils/logger');

class PostbackHandler {
  async handlePostback(replyToken, userId, postback) {
    const { data } = postback;

    try {
      console.log('🔘 Postback received:', data);
      const params = new URLSearchParams(data);
      const action = params.get('action');

      console.log('✅ Postback action parsed:', action);
      logger.info(`Postback from ${userId}: action=${action}`);

      switch (action) {
        case 'check_balance':
          await this.startCheckBalance(replyToken, userId);
          break;

        case 'card_services':
          await this.startCardServices(replyToken, userId);
          break;

        case 'back_to_menu':
          await this.showMainMenu(replyToken, userId);
          break;

        case 'end_session':
          await this.endSession(replyToken, userId);
          break;

        case 'live_chat':
          await this.startLiveChat(replyToken, userId);
          break;

        case 'end_live_chat':
          await this.endLiveChat(replyToken, userId);
          break;

        case 'view_mini_statement':
          await this.viewMiniStatement(replyToken, userId);
          break;

        case 'block_card':
          await this.startBlockCard(replyToken, userId);
          break;

        case 'unblock_card':
          await this.startUnblockCard(replyToken, userId);
          break;

        case 'report_lost_card':
          await this.startReportLostCard(replyToken, userId);
          break;

        case 'view_card_limits':
          await this.startViewCardLimits(replyToken, userId);
          break;

        default:
          logger.warn(`Unknown action: ${action}`);
      }
    } catch (error) {
      logger.error('Postback handler error:', error);
      await lineService.replyMessage(replyToken, [
        {
          type: 'text',
          text: 'An error occurred. Please try again.',
        },
      ]);
    }
  }

  async startCheckBalance(replyToken, userId) {
    await sessionService.updateDialogState(userId, 'CHECK_BALANCE');

    await lineService.replyMessage(replyToken, [
      {
        type: 'text',
        text: '✅ You selected: Check Balance\n\nPlease enter your registered phone number (e.g., +919876543210 or 9876543210)',
      },
    ]);
  }

  async startCardServices(replyToken, userId) {
    await sessionService.updateDialogState(userId, 'GET_PHONE_FOR_CARDS');

    await lineService.replyMessage(replyToken, [
      {
        type: 'text',
        text: '✅ You selected: Card Services\n\nPlease enter your registered phone number to view your cards',
      },
    ]);
  }

  async startBlockCard(replyToken, userId) {
    await sessionService.updateDialogState(userId, 'BLOCK_CARD');

    await lineService.replyMessage(replyToken, [
      {
        type: 'text',
        text: '✅ You selected: Block Card\n\nEnter the Card ID to block:',
      },
    ]);
  }

  async startUnblockCard(replyToken, userId) {
    await sessionService.updateDialogState(userId, 'UNBLOCK_CARD');

    await lineService.replyMessage(replyToken, [
      {
        type: 'text',
        text: '✅ You selected: Unblock Card\n\nEnter the Card ID to unblock:',
      },
    ]);
  }

  async startReportLostCard(replyToken, userId) {
    await sessionService.updateDialogState(userId, 'REPORT_LOST_CARD');

    await lineService.replyMessage(replyToken, [
      {
        type: 'text',
        text: '✅ You selected: Report Lost Card\n\nEnter the Card ID of your lost card:',
      },
    ]);
  }

  async startViewCardLimits(replyToken, userId) {
    await sessionService.updateDialogState(userId, 'VIEW_CARD_LIMITS');

    await lineService.replyMessage(replyToken, [
      {
        type: 'text',
        text: '✅ You selected: View Card Limits\n\nEnter the Card ID to view limits:',
      },
    ]);
  }

  async showMainMenu(replyToken, userId) {
    await sessionService.updateDialogState(userId, 'MAIN_MENU');

    await lineService.replyMessage(replyToken, [
      {
        type: 'text',
        text: '✅ Back to Main Menu',
      },
      {
        type: 'template',
        altText: 'Main Menu',
        template: {
          type: 'buttons',
          text: 'Please select an option',
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
    ]);
  }

  async endSession(replyToken, userId) {
    await lineService.replyMessage(replyToken, [
      {
        type: 'text',
        text: '✅ You selected: End Session\n\nThank you for using FAB Bank! Have a great day! 👋',
      },
    ]);

    await sessionService.deleteSession(userId);
  }

  async startLiveChat(replyToken, userId) {
    // Start live chat via dialogManager
    const result = await dialogManager._startLiveChat(userId);

    // Update session state
    if (result.newDialogState) {
      await sessionService.updateDialogState(userId, result.newDialogState);
    }

    // Send response to user
    if (result.messages && result.messages.length > 0) {
      await lineService.replyMessage(replyToken, result.messages);
    }
  }

  async endLiveChat(replyToken, userId) {
    // Clear session and return to main menu
    await sessionService.updateDialogState(userId, 'MAIN_MENU');

    await lineService.replyMessage(replyToken, [
      {
        type: 'text',
        text: 'Your live chat session has ended. Thank you for connecting with us! 👋',
      },
      {
        type: 'text',
        text: 'Choose an option:\n\n1️⃣ Check Balance\n2️⃣ Card Services\n3️⃣ Mini Statement\n4️⃣ Live Chat\n5️⃣ End Session',
      },
    ]);
  }

  async viewMiniStatement(replyToken, userId) {
    try {
      const session = await sessionService.getSession(userId);

      if (!session || !session.attributes.phone) {
        await lineService.replyMessage(replyToken, [
          {
            type: 'text',
            text: 'Session expired. Please start again.',
          },
        ]);
        return;
      }

      const { phone } = session.attributes;
      const balance = session.attributes.balance || 0;

      const dialogManager = require('../services/dialogManager');
      const result = await dialogManager.viewMiniStatement(phone, balance);

      if (result.messages && result.messages.length > 0) {
        await lineService.replyMessage(replyToken, result.messages);
      }
    } catch (error) {
      logger.error('Mini statement error:', error);
      await lineService.replyMessage(replyToken, [
        {
          type: 'text',
          text: 'An error occurred. Please try again.',
        },
      ]);
    }
  }
}

module.exports = new PostbackHandler();
