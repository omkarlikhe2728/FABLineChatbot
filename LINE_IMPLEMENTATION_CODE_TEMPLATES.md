# LINE Banking Bot - Code Implementation Templates

## 📁 Complete Code Examples for Quick Start

---

## 1. Environment Configuration

### `.env` File
```env
# LINE Configuration
LINE_CHANNEL_ID=123456789
LINE_CHANNEL_SECRET=your_channel_secret_here
LINE_ACCESS_TOKEN=your_channel_access_token_here

# Server Configuration
PORT=3000
NODE_ENV=development

# Banking API Configuration
BANKING_API_BASE_URL=https://password-reset.lab.bravishma.com:6507/api/v1
BANKING_API_TIMEOUT=5000

# Session Configuration
SESSION_TIMEOUT=300000  # 5 minutes in milliseconds
DB_URL=mongodb://localhost:27017/line-banking-bot

# Logging
LOG_LEVEL=info
```

---

## 2. Webhook Receiver (Express Setup)

### `src/app.js`
```javascript
const express = require('express');
const bodyParser = require('body-parser');
const crypto = require('crypto');
const webhookController = require('./controllers/webhookController');
const errorHandler = require('./middleware/errorHandler');

const app = express();

// Middleware
app.use(bodyParser.json());
app.use(bodyParser.urlencoded({ extended: true }));

// LINE Signature Validation Middleware
const validateLineSignature = (req, res, next) => {
  const signature = req.headers['x-line-signature'];
  const body = req.rawBody || JSON.stringify(req.body);

  const hash = crypto
    .createHmac('sha256', process.env.LINE_CHANNEL_SECRET)
    .update(body)
    .digest('base64');

  if (hash !== signature) {
    console.error('Signature validation failed');
    return res.status(403).json({ message: 'Signature validation failed' });
  }

  next();
};

// Store raw body for signature validation
app.use((req, res, next) => {
  let data = '';
  req.on('data', (chunk) => {
    data += chunk;
  });
  req.on('end', () => {
    req.rawBody = data;
    next();
  });
});

// Health Check Endpoint
app.get('/health', (req, res) => {
  res.json({
    success: true,
    message: 'LINE Banking Bot is running',
    timestamp: new Date().toISOString(),
  });
});

// LINE Webhook Endpoint
app.post('/webhook', validateLineSignature, webhookController.handleWebhook);

// Error Handling
app.use(errorHandler.handle);

module.exports = app;
```

### `src/server.js`
```javascript
const app = require('./app');
const logger = require('./utils/logger');

const PORT = process.env.PORT || 3000;

app.listen(PORT, () => {
  logger.info(`LINE Banking Bot listening on port ${PORT}`);
});
```

---

## 3. Webhook Handler Controller

### `src/controllers/webhookController.js`
```javascript
const lineService = require('../services/lineService');
const messageHandler = require('../handlers/messageHandler');
const postbackHandler = require('../handlers/postbackHandler');
const sessionService = require('../services/sessionService');
const logger = require('../utils/logger');

class WebhookController {
  async handleWebhook(req, res) {
    try {
      const { events } = req.body;

      // Process all events from LINE
      await Promise.all(
        events.map(async (event) => {
          try {
            await this.processEvent(event);
          } catch (error) {
            logger.error(`Error processing event ${event.type}:`, error);
          }
        })
      );

      // LINE expects 200 OK response immediately
      res.status(200).json({ message: 'OK' });
    } catch (error) {
      logger.error('Webhook error:', error);
      res.status(500).json({ error: 'Internal Server Error' });
    }
  }

  async processEvent(event) {
    const { type, replyToken, source, message, postback, timestamp } = event;
    const userId = source.userId;

    // Log event
    logger.info(`Event received - Type: ${type}, UserID: ${userId}`);

    // Update session activity
    await sessionService.updateLastActivity(userId);

    switch (type) {
      case 'message':
        if (message.type === 'text') {
          await messageHandler.handleTextMessage(replyToken, userId, message);
        }
        break;

      case 'postback':
        await postbackHandler.handlePostback(replyToken, userId, postback);
        break;

      case 'follow':
        await this.handleFollow(replyToken, userId);
        break;

      case 'unfollow':
        await sessionService.deleteSession(userId);
        break;

      default:
        logger.debug(`Unknown event type: ${type}`);
    }
  }

  async handleFollow(replyToken, userId) {
    // Send welcome message when user follows bot
    const messages = [
      {
        type: 'image',
        originalContentUrl: 'https://www.bankfab.com/-/media/fab-uds/personal/promotions/2025/mclaren-f1-cards-offer/mclaren-homepage-banner-en.jpg',
        previewImageUrl: 'https://www.bankfab.com/-/media/fab-uds/personal/promotions/2025/mclaren-f1-cards-offer/mclaren-homepage-banner-en.jpg',
      },
      {
        type: 'text',
        text: 'Welcome to FAB Bank! 🏦\nI\'m your banking assistant. How can I help you today?',
      },
    ];

    await lineService.replyMessage(replyToken, messages);

    // Set initial session
    await sessionService.createSession(userId);
  }
}

module.exports = new WebhookController();
```

---

## 4. Message Handler

### `src/handlers/messageHandler.js`
```javascript
const lineService = require('../services/lineService');
const sessionService = require('../services/sessionService');
const dialogManager = require('../services/dialogManager');
const validators = require('../utils/validators');
const logger = require('../utils/logger');

class MessageHandler {
  async handleTextMessage(replyToken, userId, message) {
    const text = message.text.trim();

    try {
      // Get current session/dialog state
      const session = await sessionService.getSession(userId);

      if (!session) {
        await lineService.replyMessage(replyToken, [
          {
            type: 'text',
            text: 'Session expired. Please follow the bot again.',
          },
        ]);
        return;
      }

      const { dialogState, attributes } = session;

      logger.info(`Processing message: "${text}" in dialog: ${dialogState}`);

      // Route message based on current dialog state
      const result = await dialogManager.processMessage(
        userId,
        dialogState,
        text,
        attributes
      );

      if (result.messages) {
        await lineService.replyMessage(replyToken, result.messages);
      }

      if (result.newDialogState) {
        await sessionService.updateDialogState(userId, result.newDialogState);
      }

      if (result.attributes) {
        await sessionService.updateAttributes(userId, result.attributes);
      }
    } catch (error) {
      logger.error('Message handler error:', error);
      await lineService.replyMessage(replyToken, [
        {
          type: 'text',
          text: 'An error occurred. Please try again later.',
        },
      ]);
    }
  }
}

module.exports = new MessageHandler();
```

---

## 5. Postback Handler

### `src/handlers/postbackHandler.js`
```javascript
const lineService = require('../services/lineService');
const sessionService = require('../services/sessionService');
const dialogManager = require('../services/dialogManager');
const templateService = require('../services/templateService');
const bankingService = require('../services/bankingService');
const logger = require('../utils/logger');

class PostbackHandler {
  async handlePostback(replyToken, userId, postback) {
    const { data } = postback;

    try {
      // Parse postback data (format: action=check_balance&param=value)
      const params = new URLSearchParams(data);
      const action = params.get('action');

      logger.info(`Postback received - Action: ${action}, UserID: ${userId}`);

      const session = await sessionService.getSession(userId);

      switch (action) {
        case 'check_balance':
          await this.startCheckBalance(replyToken, userId);
          break;

        case 'card_services':
          await this.startCardServices(replyToken, userId);
          break;

        case 'view_mini_statement':
          await this.viewMiniStatement(replyToken, userId, session);
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

        case 'live_chat':
          await this.transferToAgent(replyToken, userId);
          break;

        case 'back_to_menu':
          await this.showMainMenu(replyToken, userId);
          break;

        case 'end_session':
          await this.endSession(replyToken, userId);
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
        text: 'Please enter your registered phone number (e.g., 919876543210)',
      },
    ]);
  }

  async startCardServices(replyToken, userId) {
    await sessionService.updateDialogState(userId, 'GET_PHONE_FOR_CARDS');

    await lineService.replyMessage(replyToken, [
      {
        type: 'text',
        text: 'Please enter your registered phone number to view your cards (e.g., 919876543210)',
      },
    ]);
  }

  async viewMiniStatement(replyToken, userId, session) {
    const { attributes } = session;
    const phone = attributes.phone;

    if (!phone) {
      await lineService.replyMessage(replyToken, [
        {
          type: 'text',
          text: 'Session expired. Please start again.',
        },
      ]);
      return;
    }

    try {
      const result = await bankingService.getMiniStatement(phone, 5);

      if (!result.success) {
        throw new Error(result.message || 'Failed to fetch statement');
      }

      const transactionText = this.formatTransactions(result.data.transactions);

      await lineService.replyMessage(replyToken, [
        {
          type: 'text',
          text: `Last 5 Transactions:\n\n${transactionText}\n\nCurrent Balance: $${attributes.balance}`,
        },
      ]);

      await this.showMainMenu(replyToken, userId);
    } catch (error) {
      logger.error('Mini statement error:', error);
      await lineService.replyMessage(replyToken, [
        {
          type: 'text',
          text: 'Failed to fetch statement. Please try again.',
        },
      ]);
    }
  }

  async showMainMenu(replyToken, userId) {
    await sessionService.updateDialogState(userId, 'MAIN_MENU');

    const message = templateService.getMainMenuTemplate();
    await lineService.replyMessage(replyToken, [message]);
  }

  async endSession(replyToken, userId) {
    // Show thank you message
    const messages = [
      {
        type: 'image',
        originalContentUrl: 'https://www.bankfab.com/-/media/fab-uds/personal/promotions/2025/mclaren-f1-cards-offer/mclaren-homepage-banner-en.jpg',
        previewImageUrl: 'https://www.bankfab.com/-/media/fab-uds/personal/promotions/2025/mclaren-f1-cards-offer/mclaren-homepage-banner-en.jpg',
      },
      {
        type: 'text',
        text: 'Thank you for using FAB Bank! Have a great day! 👋',
      },
    ];

    await lineService.replyMessage(replyToken, messages);

    // Clean up session
    await sessionService.deleteSession(userId);
  }

  async transferToAgent(replyToken, userId) {
    const message = {
      type: 'text',
      text: 'Please wait while we connect you with a customer service representative...',
    };

    await lineService.replyMessage(replyToken, [message]);

    // In production, integrate with your CRM/support system
    await sessionService.updateDialogState(userId, 'AGENT_HANDOFF');
  }

  async startBlockCard(replyToken, userId) {
    await sessionService.updateDialogState(userId, 'BLOCK_CARD');

    await lineService.replyMessage(replyToken, [
      {
        type: 'text',
        text: 'Enter the Card ID you want to block:',
      },
    ]);
  }

  async startUnblockCard(replyToken, userId) {
    await sessionService.updateDialogState(userId, 'UNBLOCK_CARD');

    await lineService.replyMessage(replyToken, [
      {
        type: 'text',
        text: 'Enter the Card ID you want to unblock:',
      },
    ]);
  }

  async startReportLostCard(replyToken, userId) {
    await sessionService.updateDialogState(userId, 'REPORT_LOST_CARD');

    await lineService.replyMessage(replyToken, [
      {
        type: 'text',
        text: 'Enter the Card ID of your lost card:',
      },
    ]);
  }

  async startViewCardLimits(replyToken, userId) {
    await sessionService.updateDialogState(userId, 'VIEW_CARD_LIMITS');

    await lineService.replyMessage(replyToken, [
      {
        type: 'text',
        text: 'Enter the Card ID to view limits:',
      },
    ]);
  }

  formatTransactions(transactions) {
    if (!Array.isArray(transactions) || transactions.length === 0) {
      return 'No recent transactions.';
    }

    return transactions
      .slice(0, 5)
      .map((txn, idx) => {
        const date = new Date(txn.date).toLocaleDateString('en-IN');
        const amount =
          txn.type === 'DEBIT'
            ? `-$${Math.abs(txn.amount).toFixed(2)}`
            : `+$${txn.amount.toFixed(2)}`;

        return `${idx + 1}. ${date}\n${txn.description}\n${amount}`;
      })
      .join('\n\n');
  }
}

module.exports = new PostbackHandler();
```

---

## 6. LINE Service (SDK Integration)

### `src/services/lineService.js`
```javascript
const line = require('@line/bot-sdk');
const logger = require('../utils/logger');

class LineService {
  constructor() {
    this.client = new line.Client({
      channelAccessToken: process.env.LINE_ACCESS_TOKEN,
    });
  }

  async replyMessage(replyToken, messages) {
    try {
      // Ensure messages is array
      const messageArray = Array.isArray(messages) ? messages : [messages];

      // LINE only allows max 5 messages per reply
      if (messageArray.length > 5) {
        logger.warn('Message count exceeds 5, truncating');
      }

      await this.client.replyMessage(replyToken, messageArray.slice(0, 5));
      logger.debug(`Reply sent with ${messageArray.length} messages`);
    } catch (error) {
      logger.error('Error sending reply:', error);
      throw error;
    }
  }

  async pushMessage(userId, messages) {
    try {
      const messageArray = Array.isArray(messages) ? messages : [messages];
      await this.client.pushMessage(userId, messageArray.slice(0, 5));
      logger.debug(`Push message sent to ${userId}`);
    } catch (error) {
      logger.error('Error pushing message:', error);
      throw error;
    }
  }

  async getProfile(userId) {
    try {
      const profile = await this.client.getProfile(userId);
      return profile;
    } catch (error) {
      logger.error('Error getting profile:', error);
      throw error;
    }
  }
}

module.exports = new LineService();
```

---

## 7. Banking Service Integration

### `src/services/bankingService.js`
```javascript
const axios = require('axios');
const logger = require('../utils/logger');

class BankingService {
  constructor() {
    this.baseURL = process.env.BANKING_API_BASE_URL;
    this.timeout = parseInt(process.env.BANKING_API_TIMEOUT || '5000');
    this.client = axios.create({
      baseURL: this.baseURL,
      timeout: this.timeout,
      headers: {
        'Content-Type': 'application/json',
      },
    });
  }

  async sendOTP(phone) {
    try {
      logger.debug(`Sending OTP to ${this.maskPhone(phone)}`);

      const response = await this.client.post('/banking/auth/send-otp', {
        phone: this.formatPhone(phone),
      });

      return response.data;
    } catch (error) {
      logger.error('Send OTP error:', error.message);
      return {
        success: false,
        message: error.response?.data?.message || 'Failed to send OTP',
      };
    }
  }

  async verifyOTP(phone, otp) {
    try {
      logger.debug(`Verifying OTP for ${this.maskPhone(phone)}`);

      const response = await this.client.post('/banking/auth/verify-otp', {
        phone: this.formatPhone(phone),
        otp: otp,
      });

      return response.data;
    } catch (error) {
      logger.error('Verify OTP error:', error.message);
      return {
        success: false,
        data: { verified: false },
        message: error.response?.data?.message || 'OTP verification failed',
      };
    }
  }

  async getBalance(phone) {
    try {
      logger.debug(`Fetching balance for ${this.maskPhone(phone)}`);

      const response = await this.client.get('/banking/account/balance', {
        params: { phone: this.formatPhone(phone) },
      });

      return response.data;
    } catch (error) {
      logger.error('Get balance error:', error.message);
      return {
        success: false,
        message: error.response?.data?.message || 'Failed to fetch balance',
      };
    }
  }

  async getMiniStatement(phone, limit = 5) {
    try {
      logger.debug(`Fetching mini statement for ${this.maskPhone(phone)}`);

      const response = await this.client.get(
        '/banking/account/mini-statement',
        {
          params: {
            phone: this.formatPhone(phone),
            limit: limit,
          },
        }
      );

      return response.data;
    } catch (error) {
      logger.error('Get mini statement error:', error.message);
      return {
        success: false,
        message: error.response?.data?.message || 'Failed to fetch statement',
      };
    }
  }

  async getCards(phone) {
    try {
      logger.debug(`Fetching cards for ${this.maskPhone(phone)}`);

      const response = await this.client.get('/banking/cards', {
        params: { phone: this.formatPhone(phone) },
      });

      return response.data;
    } catch (error) {
      logger.error('Get cards error:', error.message);
      return {
        success: false,
        message: error.response?.data?.message || 'Failed to fetch cards',
      };
    }
  }

  async blockCard(phone, cardId, reason = '') {
    try {
      logger.debug(
        `Blocking card ${cardId} for ${this.maskPhone(phone)}`
      );

      const response = await this.client.post('/banking/cards/block', {
        phone: this.formatPhone(phone),
        cardId: cardId,
        reason: reason,
      });

      return response.data;
    } catch (error) {
      logger.error('Block card error:', error.message);
      return {
        success: false,
        message: error.response?.data?.message || 'Failed to block card',
      };
    }
  }

  async unblockCard(phone, cardId) {
    try {
      logger.debug(`Unblocking card ${cardId} for ${this.maskPhone(phone)}`);

      const response = await this.client.post('/banking/cards/unblock', {
        phone: this.formatPhone(phone),
        cardId: cardId,
      });

      return response.data;
    } catch (error) {
      logger.error('Unblock card error:', error.message);
      return {
        success: false,
        message: error.response?.data?.message || 'Failed to unblock card',
      };
    }
  }

  async reportLostCard(phone, cardId) {
    try {
      logger.debug(`Reporting card ${cardId} lost for ${this.maskPhone(phone)}`);

      const response = await this.client.post('/banking/cards/report-lost', {
        phone: this.formatPhone(phone),
        cardId: cardId,
        reason: 'Lost',
      });

      return response.data;
    } catch (error) {
      logger.error('Report lost card error:', error.message);
      return {
        success: false,
        message: error.response?.data?.message || 'Failed to report card lost',
      };
    }
  }

  async getCardLimits(cardId) {
    try {
      logger.debug(`Fetching limits for card ${cardId}`);

      const response = await this.client.get(
        `/banking/cards/${cardId}/limits`
      );

      return response.data;
    } catch (error) {
      logger.error('Get card limits error:', error.message);
      return {
        success: false,
        message: error.response?.data?.message || 'Failed to fetch limits',
      };
    }
  }

  // Helper methods
  formatPhone(phone) {
    // Convert to international format if needed
    if (!phone.startsWith('+')) {
      return `+${phone}`;
    }
    return phone;
  }

  maskPhone(phone) {
    // For logging - mask sensitive data
    return phone.replace(/\d(?=\d{4})/g, '*');
  }
}

module.exports = new BankingService();
```

---

## 8. Session Service

### `src/services/sessionService.js`
```javascript
const logger = require('../utils/logger');

// In-memory store (use Redis or DB in production)
const sessions = new Map();

class SessionService {
  async createSession(userId) {
    const session = {
      userId,
      dialogState: 'MAIN_MENU',
      attributes: {},
      createdAt: Date.now(),
      lastActivity: Date.now(),
    };

    sessions.set(userId, session);
    logger.info(`Session created for user ${userId}`);

    // Set auto-expire
    setTimeout(() => {
      sessions.delete(userId);
      logger.info(`Session expired for user ${userId}`);
    }, parseInt(process.env.SESSION_TIMEOUT || '300000'));

    return session;
  }

  async getSession(userId) {
    return sessions.get(userId) || null;
  }

  async updateDialogState(userId, dialogState) {
    const session = sessions.get(userId);
    if (session) {
      session.dialogState = dialogState;
      session.lastActivity = Date.now();
      logger.debug(`Dialog state updated to ${dialogState} for user ${userId}`);
    }
  }

  async updateAttributes(userId, newAttributes) {
    const session = sessions.get(userId);
    if (session) {
      session.attributes = {
        ...session.attributes,
        ...newAttributes,
      };
      session.lastActivity = Date.now();
      logger.debug(`Attributes updated for user ${userId}`);
    }
  }

  async updateLastActivity(userId) {
    const session = sessions.get(userId);
    if (session) {
      session.lastActivity = Date.now();
    }
  }

  async deleteSession(userId) {
    sessions.delete(userId);
    logger.info(`Session deleted for user ${userId}`);
  }

  async getSessionData(userId) {
    const session = sessions.get(userId);
    return session ? { ...session } : null;
  }
}

module.exports = new SessionService();
```

---

## 9. Template Service

### `src/services/templateService.js`
```javascript
class TemplateService {
  getMainMenuTemplate() {
    return {
      type: 'template',
      altText: 'Select an option',
      template: {
        type: 'buttons',
        text: 'Please select an option',
        actions: [
          {
            type: 'postback',
            label: '💳 Check Balance',
            data: 'action=check_balance',
          },
          {
            type: 'postback',
            label: '💰 Card Services',
            data: 'action=card_services',
          },
          {
            type: 'postback',
            label: '💬 Live Chat',
            data: 'action=live_chat',
          },
        ],
      },
    };
  }

  getBalanceTemplate(data) {
    return {
      type: 'flex',
      altText: 'Your Account Balance',
      contents: {
        type: 'bubble',
        body: {
          type: 'box',
          layout: 'vertical',
          contents: [
            {
              type: 'text',
              text: '💰 Account Balance',
              weight: 'bold',
              size: 'xl',
              margin: 'md',
            },
            {
              type: 'separator',
              margin: 'md',
            },
            {
              type: 'box',
              layout: 'vertical',
              margin: 'md',
              spacing: 'sm',
              contents: [
                this.createDetailRow('Name:', data.customerName),
                this.createDetailRow('Account:', data.accountNumber),
                this.createDetailRow('Type:', data.accountType),
                {
                  type: 'box',
                  layout: 'baseline',
                  contents: [
                    {
                      type: 'text',
                      text: 'Balance:',
                      color: '#aaaaaa',
                      size: 'sm',
                      flex: 2,
                      weight: 'bold',
                    },
                    {
                      type: 'text',
                      text: `$${parseFloat(data.balance).toFixed(2)}`,
                      wrap: true,
                      color: '#27ae60',
                      size: 'lg',
                      flex: 3,
                      weight: 'bold',
                    },
                  ],
                },
              ],
            },
            {
              type: 'separator',
              margin: 'md',
            },
          ],
        },
        footer: {
          type: 'box',
          layout: 'vertical',
          spacing: 'sm',
          contents: [
            {
              type: 'button',
              style: 'link',
              height: 'sm',
              action: {
                type: 'postback',
                label: 'View Mini Statement',
                data: 'action=view_mini_statement',
              },
            },
            {
              type: 'button',
              style: 'link',
              height: 'sm',
              action: {
                type: 'postback',
                label: 'Back to Menu',
                data: 'action=back_to_menu',
              },
            },
          ],
        },
      },
    };
  }

  getCardListTemplate(cards) {
    return {
      type: 'flex',
      altText: 'Your Cards',
      contents: {
        type: 'carousel',
        contents: cards.map((card) => this.createCardBubble(card)),
      },
    };
  }

  createCardBubble(card) {
    return {
      type: 'bubble',
      body: {
        type: 'box',
        layout: 'vertical',
        contents: [
          {
            type: 'text',
            text: card.cardType,
            weight: 'bold',
            size: 'lg',
          },
          {
            type: 'box',
            layout: 'baseline',
            margin: 'md',
            contents: [
              {
                type: 'text',
                text: 'Card No:',
                color: '#aaaaaa',
                size: 'sm',
                flex: 1,
              },
              {
                type: 'text',
                text: card.cardNumber,
                wrap: true,
                color: '#666666',
                size: 'sm',
                flex: 2,
              },
            ],
          },
          {
            type: 'box',
            layout: 'baseline',
            margin: 'sm',
            contents: [
              {
                type: 'text',
                text: 'Status:',
                color: '#aaaaaa',
                size: 'sm',
                flex: 1,
              },
              {
                type: 'text',
                text: card.status,
                wrap: true,
                color:
                  card.status === 'ACTIVE' ? '#27ae60' : '#e74c3c',
                size: 'sm',
                flex: 2,
                weight: 'bold',
              },
            ],
          },
        ],
      },
    };
  }

  createDetailRow(label, value) {
    return {
      type: 'box',
      layout: 'baseline',
      contents: [
        {
          type: 'text',
          text: label,
          color: '#aaaaaa',
          size: 'sm',
          flex: 2,
        },
        {
          type: 'text',
          text: value,
          wrap: true,
          color: '#666666',
          size: 'sm',
          flex: 3,
        },
      ],
    };
  }
}

module.exports = new TemplateService();
```

---

## 10. Package.json Dependencies

### `package.json`
```json
{
  "name": "line-banking-chatbot",
  "version": "1.0.0",
  "description": "FAB Bank LINE Messaging API Bot",
  "main": "src/server.js",
  "scripts": {
    "start": "node src/server.js",
    "dev": "nodemon src/server.js",
    "test": "jest",
    "test:watch": "jest --watch"
  },
  "dependencies": {
    "@line/bot-sdk": "^13.0.0",
    "axios": "^1.6.0",
    "body-parser": "^1.20.2",
    "express": "^4.18.2",
    "dotenv": "^16.0.3",
    "crypto": "^1.0.1"
  },
  "devDependencies": {
    "nodemon": "^2.0.20",
    "jest": "^29.5.0",
    "supertest": "^6.3.3"
  }
}
```

---

## 11. Logger Utility

### `src/utils/logger.js`
```javascript
const fs = require('fs');
const path = require('path');

const LOG_LEVEL = {
  ERROR: 'ERROR',
  WARN: 'WARN',
  INFO: 'INFO',
  DEBUG: 'DEBUG',
};

const LEVEL_PRIORITY = {
  ERROR: 0,
  WARN: 1,
  INFO: 2,
  DEBUG: 3,
};

class Logger {
  constructor() {
    this.currentLevel = process.env.LOG_LEVEL || 'INFO';
    this.logDir = path.join(__dirname, '../../logs');

    // Create logs directory if it doesn't exist
    if (!fs.existsSync(this.logDir)) {
      fs.mkdirSync(this.logDir, { recursive: true });
    }
  }

  log(level, message, data = {}) {
    if (
      LEVEL_PRIORITY[level] >
      LEVEL_PRIORITY[this.currentLevel]
    ) {
      return;
    }

    const timestamp = new Date().toISOString();
    const logMessage = `[${timestamp}] [${level}] ${message}`;
    const fullLog = data && Object.keys(data).length > 0
      ? `${logMessage} ${JSON.stringify(data)}`
      : logMessage;

    console.log(fullLog);

    // Also write to file
    this.writeToFile(level, fullLog);
  }

  writeToFile(level, message) {
    const logFile = path.join(this.logDir, `${level.toLowerCase()}.log`);
    fs.appendFileSync(logFile, message + '\n');
  }

  error(message, error) {
    this.log('ERROR', message, error instanceof Error ? { error: error.message, stack: error.stack } : error);
  }

  warn(message, data) {
    this.log('WARN', message, data);
  }

  info(message, data) {
    this.log('INFO', message, data);
  }

  debug(message, data) {
    this.log('DEBUG', message, data);
  }
}

module.exports = new Logger();
```

---

## 12. Error Handler Middleware

### `src/middleware/errorHandler.js`
```javascript
const logger = require('../utils/logger');

class ErrorHandler {
  handle(err, req, res, next) {
    logger.error('Unhandled error:', err);

    // Don't expose internal error details
    const statusCode = err.statusCode || 500;
    const message = err.message || 'Internal Server Error';

    res.status(statusCode).json({
      success: false,
      message: statusCode === 500 ? 'An error occurred' : message,
      timestamp: new Date().toISOString(),
    });
  }
}

module.exports = new ErrorHandler();
```

---

## 13. Validators Utility

### `src/utils/validators.js`
```javascript
class Validators {
  isValidPhone(phone) {
    // International format: +[country-code][number] (8-15 digits after +)
    const phoneRegex = /^\+\d{8,15}$/;
    return phoneRegex.test(phone);
  }

  formatPhoneInput(input) {
    // Remove spaces and special characters
    let cleaned = input.replace(/\D/g, '');

    // Add + if not present
    if (!cleaned.startsWith('+')) {
      // If starts with 0, remove it (for local formats)
      if (cleaned.startsWith('0')) {
        cleaned = cleaned.substring(1);
      }

      // Assume country code 91 (India) if not provided
      if (!cleaned.match(/^\d{1,3}\d{8,}/)) {
        cleaned = '91' + cleaned;
      }

      cleaned = '+' + cleaned;
    }

    return cleaned;
  }

  isValidOTP(otp) {
    // 6 digit number
    return /^\d{6}$/.test(otp);
  }

  isValidCardId(cardId) {
    return cardId && cardId.toString().length > 0;
  }

  sanitizeInput(input) {
    // Remove script tags and dangerous content
    return input
      .replace(/<script[^>]*>.*?<\/script>/gi, '')
      .replace(/[<>\"']/g, '')
      .trim();
  }
}

module.exports = new Validators();
```

---

## 14. Dialog Manager (State Machine)

### `src/services/dialogManager.js`
```javascript
const bankingService = require('./bankingService');
const templateService = require('./templateService');
const validators = require('../utils/validators');
const logger = require('../utils/logger');

class DialogManager {
  async processMessage(userId, dialogState, input, attributes) {
    const messages = [];
    let newDialogState = dialogState;
    let updatedAttributes = { ...attributes };

    try {
      switch (dialogState) {
        case 'MAIN_MENU':
          // Main menu doesn't handle text input
          return { messages: [], newDialogState };

        case 'CHECK_BALANCE':
          return await this.handleCheckBalanceInput(
            input,
            updatedAttributes
          );

        case 'GET_PHONE_FOR_CARDS':
          return await this.handleGetPhoneForCards(input, updatedAttributes);

        case 'SEND_OTP':
          // Automatic - no user input needed
          return { messages: [], newDialogState };

        case 'VERIFY_OTP':
          return await this.handleVerifyOTP(input, updatedAttributes);

        case 'BLOCK_CARD':
          return await this.handleBlockCardInput(input, updatedAttributes);

        case 'UNBLOCK_CARD':
          return await this.handleUnblockCardInput(input, updatedAttributes);

        case 'REPORT_LOST_CARD':
          return await this.handleReportLostCardInput(input, updatedAttributes);

        case 'VIEW_CARD_LIMITS':
          return await this.handleViewCardLimitsInput(input, updatedAttributes);

        default:
          return { messages: [], newDialogState };
      }
    } catch (error) {
      logger.error(`Dialog processing error in ${dialogState}:`, error);
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

  async handleCheckBalanceInput(input, attributes) {
    const phone = validators.formatPhoneInput(input);

    if (!validators.isValidPhone(phone)) {
      return {
        messages: [
          {
            type: 'text',
            text: 'Invalid phone number format. Please use international format (e.g., +919876543210)',
          },
        ],
      };
    }

    // Send OTP
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
          text: `OTP has been sent to your phone. Valid for ${otpResult.data.expiresInMinutes} minutes.\n\nPlease enter the 6-digit OTP:`,
        },
      ],
      newDialogState: 'VERIFY_OTP',
      attributes: { phone },
    };
  }

  async handleVerifyOTP(input, attributes) {
    if (!validators.isValidOTP(input)) {
      return {
        messages: [
          {
            type: 'text',
            text: 'Invalid OTP format. Please enter a 6-digit number.',
          },
        ],
      };
    }

    const { phone } = attributes;
    const otpResult = await bankingService.verifyOTP(phone, input);

    if (!otpResult.success || !otpResult.data.verified) {
      return {
        messages: [
          {
            type: 'text',
            text: 'Invalid OTP. Please try again.',
          },
        ],
      };
    }

    // Fetch balance
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

    const balanceTemplate = templateService.getBalanceTemplate(
      balanceResult.data
    );

    return {
      messages: [balanceTemplate],
      newDialogState: 'SHOW_BALANCE_OPTIONS',
      attributes: {
        ...attributes,
        isAuthenticated: true,
        customerName: otpResult.data.customerName,
        ...balanceResult.data,
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
            text: 'Invalid phone number format.',
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
            text: 'Failed to fetch cards. Please try again.',
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

    const cardsTemplate = templateService.getCardListTemplate(cardsResult.data);

    const actions = {
      type: 'template',
      altText: 'Select card action',
      template: {
        type: 'buttons',
        text: 'What would you like to do?',
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
      messages: [cardsTemplate, actions],
      newDialogState: 'CARD_SERVICES_MENU',
      attributes: {
        ...attributes,
        phone,
        cards: cardsResult.data,
      },
    };
  }

  async handleBlockCardInput(input, attributes) {
    const cardId = validators.sanitizeInput(input);

    if (!cardId) {
      return {
        messages: [
          {
            type: 'text',
            text: 'Invalid card ID.',
          },
        ],
      };
    }

    return {
      messages: [
        {
          type: 'text',
          text: 'Please enter the reason for blocking (optional):',
        },
      ],
      newDialogState: 'GET_BLOCK_REASON',
      attributes: { ...attributes, cardId },
    };
  }

  // ... Other dialog handlers follow similar pattern
}

module.exports = new DialogManager();
```

---

## 15. Starting the Bot

### Quick Start
```bash
# Install dependencies
npm install

# Create .env file with your credentials
cp .env.example .env
# Edit .env with your LINE channel credentials

# Run development server
npm run dev

# Or for production
npm start
```

### Setup Webhook in LINE Developer Console
1. Go to LINE Developers > Channel Settings
2. Set Webhook URL to: `https://your-domain.com/webhook`
3. Enable Webhook
4. Get your Channel Access Token
5. Get your Channel Secret

---

## 🎯 Testing the Bot

### Test Messages to Send
```
1. Send "Check Balance"
   → Bot asks for phone number

2. Send "+919876543210"
   → Bot sends OTP

3. Send "123456" (6-digit OTP)
   → Bot shows balance

4. Tap "View Mini Statement"
   → Bot shows last 5 transactions
```

---

**Version**: 1.0 | **Updated**: 2026-02-10
