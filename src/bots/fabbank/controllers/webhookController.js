const lineService = require('../services/lineService');
const sessionService = require('../services/sessionService');
const logger = require('../../../common/utils/logger');

class WebhookController {
  async handleWebhook(req, res) {
    try {
      const { events } = req.body;
      console.log('✅ WEBHOOK HANDLER CALLED');
      console.log('📦 Events count:', events ? events.length : 0);

      // Process all events
      await Promise.all(
        events.map(async (event) => {
          try {
            await this.processEvent(event);
          } catch (error) {
            logger.error(`Error processing event:`, error);
            console.log('❌ Event processing error:', error.message);
          }
        })
      );

      console.log('✅ Webhook processing complete');
      res.status(200).json({ message: 'OK' });
    } catch (error) {
      logger.error('Webhook error:', error);
      console.log('❌ Webhook error:', error.message);
      res.status(500).json({ error: 'Internal Server Error' });
    }
  }

  async processEvent(event) {
    const { type, replyToken, source } = event;
    const userId = source.userId;

    console.log('📥 EVENT RECEIVED:', type.toUpperCase(), 'from user:', userId);
    logger.info(`Event: ${type} from user ${userId}`);

    // Create session if it doesn't exist (except for unfollow)
    if (type !== 'unfollow') {
      const existingSession = await sessionService.getSession(userId);
      if (!existingSession) {
        console.log(`📝 Creating new session for user ${userId}`);
        await sessionService.createSession(userId);
      }
    }

    // Update last activity
    await sessionService.updateLastActivity(userId);

    switch (type) {
      case 'follow':
        await this.handleFollow(replyToken, userId);
        break;

      case 'unfollow':
        await sessionService.deleteSession(userId);
        break;

      case 'message':
        if (event.message.type === 'text') {
          const messageHandler = require('../handlers/messageHandler');
          await messageHandler.handleTextMessage(replyToken, userId, event.message);
        }
        break;

      case 'postback':
        const postbackHandler = require('../handlers/postbackHandler');
        await postbackHandler.handlePostback(replyToken, userId, event.postback);
        break;

      default:
        logger.debug(`Unknown event type: ${type}`);
    }
  }

  async handleFollow(replyToken, userId) {
    logger.info(`User ${userId} followed bot`);

    // Create session
    await sessionService.createSession(userId);

    // Send welcome message with image
    const bannerImage = 'https://www.bankfab.com/-/media/fab-uds/personal/promotions/2025/mclaren-f1-cards-offer/mclaren-homepage-banner-en.jpg?h=670&iar=0&w=1440&hash=AACC95307F56FA4DD937F75AF531DA93';

    const welcomeImageMessage = {
      type: 'image',
      originalContentUrl: bannerImage,
      previewImageUrl: bannerImage,
    };

    const welcomeMessage = {
      type: 'text',
      text: 'Welcome to FAB Bank! 🏦\nI\'m your banking assistant. How can I help you today?',
    };

    const menuMessage = {
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
    };

    await lineService.replyMessage(replyToken, [welcomeImageMessage, welcomeMessage, menuMessage]);
  }
}

module.exports = new WebhookController();
