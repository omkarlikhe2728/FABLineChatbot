# LINE Banking Bot - Complete Implementation Phases Guide

**This is a step-by-step guide to build the entire bot without failing. Follow each phase sequentially.**

---

## 📊 Overview: 9 Implementation Phases

| Phase | Name | Duration | Key Tasks |
|-------|------|----------|-----------|
| 1 | Infrastructure & Setup | 30 min | Project structure, env vars, dependencies |
| 2 | Core Webhook & Session | 45 min | Express app, webhook handler, sessions |
| 3 | Authentication System | 45 min | OTP send/verify with banking API |
| 4 | Check Balance Feature | 60 min | Phone input, OTP flow, balance display |
| 5 | Card Services Feature | 60 min | Get cards, block, unblock, report lost |
| 6 | Mini Statement & Limits | 45 min | Transactions, card limits display |
| 7 | Rich Message Templates | 60 min | Flex messages, carousels, formatting |
| 8 | Error Handling & Logging | 45 min | Validation, error responses, logging |
| 9 | Testing & Deployment | 90 min | Unit tests, integration tests, deployment |

**Total Time: ~6-7 hours | Recommended: 2 days**

---

# PHASE 1: Infrastructure & Setup (30 minutes)

## 📋 Objectives
- ✅ Set up project structure
- ✅ Install dependencies
- ✅ Create environment configuration
- ✅ Prepare folder structure

## 🎯 Step 1.1: Create Project Structure

**Execute these commands:**
```bash
# Create project directory
mkdir line-banking-bot
cd line-banking-bot

# Initialize Node project
npm init -y

# Create folder structure
mkdir -p src/{config,controllers,handlers,middleware,models,routes,services,utils,templates}
mkdir -p tests/{unit,integration,fixtures}
mkdir -p logs
```

## 🎯 Step 1.2: Install Dependencies

**Run:**
```bash
npm install @line/bot-sdk@13.0.0 axios@1.6.0 express@4.18.2 body-parser@1.20.2 dotenv@16.0.3

npm install --save-dev nodemon@2.0.20 jest@29.5.0 supertest@6.3.3
```

**Verify package.json has these dependencies:**
```json
{
  "name": "line-banking-bot",
  "version": "1.0.0",
  "description": "FAB Bank LINE Bot",
  "main": "src/server.js",
  "scripts": {
    "start": "node src/server.js",
    "dev": "nodemon src/server.js",
    "test": "jest"
  },
  "dependencies": {
    "@line/bot-sdk": "^13.0.0",
    "axios": "^1.6.0",
    "body-parser": "^1.20.2",
    "express": "^4.18.2",
    "dotenv": "^16.0.3"
  },
  "devDependencies": {
    "nodemon": "^2.0.20",
    "jest": "^29.5.0",
    "supertest": "^6.3.3"
  }
}
```

## 🎯 Step 1.3: Create Environment Files

**File: `.env.example`**
```env
# LINE Configuration
LINE_CHANNEL_ID=123456789
LINE_CHANNEL_SECRET=your_channel_secret_here
LINE_ACCESS_TOKEN=your_access_token_here

# Server Configuration
PORT=3000
NODE_ENV=development

# Banking API Configuration
BANKING_API_BASE_URL=https://password-reset.lab.bravishma.com:6507/api/v1
BANKING_API_TIMEOUT=5000

# Session Configuration
SESSION_TIMEOUT=300000

# Logging
LOG_LEVEL=info
```

**File: `.env` (with your actual credentials)**
```env
LINE_CHANNEL_ID=123456789
LINE_CHANNEL_SECRET=your_channel_secret_here
LINE_ACCESS_TOKEN=your_access_token_here
PORT=3000
NODE_ENV=development
BANKING_API_BASE_URL=https://password-reset.lab.bravishma.com:6507/api/v1
BANKING_API_TIMEOUT=5000
SESSION_TIMEOUT=300000
LOG_LEVEL=info
```

**File: `.gitignore`**
```
node_modules/
.env
.env.local
logs/
*.log
.DS_Store
```

## ✅ Phase 1 Validation Checklist

- [ ] All folders created successfully
- [ ] `npm install` completed without errors
- [ ] `package.json` has all dependencies
- [ ] `.env` file created with actual credentials
- [ ] `.env.example` created
- [ ] `.gitignore` created

**Test:**
```bash
npm list @line/bot-sdk
npm list axios
npm list express
```

All should show version numbers without errors.

---

# PHASE 2: Core Webhook & Session Management (45 minutes)

## 📋 Objectives
- ✅ Create Express app with webhook handler
- ✅ Implement LINE signature validation
- ✅ Create session management system
- ✅ Implement event routing

## 🎯 Step 2.1: Create Logger Utility

**File: `src/utils/logger.js`**
```javascript
const fs = require('fs');
const path = require('path');

class Logger {
  constructor() {
    this.logDir = path.join(__dirname, '../../logs');
    if (!fs.existsSync(this.logDir)) {
      fs.mkdirSync(this.logDir, { recursive: true });
    }
  }

  log(level, message, data = {}) {
    const timestamp = new Date().toISOString();
    const logEntry = `[${timestamp}] [${level}] ${message}`;
    const fullLog = Object.keys(data).length > 0
      ? `${logEntry} ${JSON.stringify(data)}`
      : logEntry;

    console.log(fullLog);

    // Write to file
    const logFile = path.join(this.logDir, `${level.toLowerCase()}.log`);
    fs.appendFileSync(logFile, fullLog + '\n');
  }

  error(message, error) {
    this.log('ERROR', message, error instanceof Error
      ? { error: error.message, stack: error.stack }
      : error);
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

## 🎯 Step 2.2: Create Session Service

**File: `src/services/sessionService.js`**
```javascript
const logger = require('../utils/logger');

// In-memory store (use Redis in production)
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

    // Auto-expire session
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
      logger.debug(`Dialog state: ${dialogState} for user ${userId}`);
    }
  }

  async updateAttributes(userId, newAttributes) {
    const session = sessions.get(userId);
    if (session) {
      session.attributes = { ...session.attributes, ...newAttributes };
      session.lastActivity = Date.now();
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

## 🎯 Step 2.3: Create LINE Service

**File: `src/services/lineService.js`**
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
      const messageArray = Array.isArray(messages) ? messages : [messages];

      // LINE allows max 5 messages per reply
      if (messageArray.length > 5) {
        logger.warn(`Message count ${messageArray.length} exceeds 5, truncating`);
      }

      await this.client.replyMessage(replyToken, messageArray.slice(0, 5));
      logger.info(`Reply sent with ${messageArray.length} message(s)`);
    } catch (error) {
      logger.error('Error sending reply:', error);
      throw error;
    }
  }

  async pushMessage(userId, messages) {
    try {
      const messageArray = Array.isArray(messages) ? messages : [messages];
      await this.client.pushMessage(userId, messageArray.slice(0, 5));
      logger.info(`Push message sent to user ${userId}`);
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

## 🎯 Step 2.4: Create Main Express App

**File: `src/app.js`**
```javascript
const express = require('express');
const bodyParser = require('body-parser');
const crypto = require('crypto');
const logger = require('./utils/logger');

const app = express();

// Middleware
app.use(bodyParser.json());

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

// LINE Signature Validation Middleware
const validateLineSignature = (req, res, next) => {
  const signature = req.headers['x-line-signature'];
  const body = req.rawBody || JSON.stringify(req.body);

  const hash = crypto
    .createHmac('sha256', process.env.LINE_CHANNEL_SECRET)
    .update(body)
    .digest('base64');

  if (hash !== signature) {
    logger.error('Signature validation failed');
    return res.status(403).json({ message: 'Invalid signature' });
  }

  next();
};

// Health Check
app.get('/health', (req, res) => {
  res.json({
    success: true,
    message: 'LINE Banking Bot is running',
    timestamp: new Date().toISOString(),
  });
});

// Placeholder webhook (will be implemented in next file)
app.post('/webhook', validateLineSignature, (req, res) => {
  logger.info('Webhook received');
  res.status(200).json({ message: 'OK' });
});

// Error handling
app.use((err, req, res, next) => {
  logger.error('Express error:', err);
  res.status(500).json({ error: 'Internal Server Error' });
});

module.exports = app;
```

## 🎯 Step 2.5: Create Server Entry Point

**File: `src/server.js`**
```javascript
require('dotenv').config();
const app = require('./app');
const logger = require('./utils/logger');

const PORT = process.env.PORT || 3000;

app.listen(PORT, () => {
  logger.info(`LINE Banking Bot listening on port ${PORT}`);
  logger.info(`Environment: ${process.env.NODE_ENV}`);
});
```

## ✅ Phase 2 Validation Checklist

- [ ] All service files created
- [ ] logger.js working
- [ ] sessionService.js created
- [ ] lineService.js created
- [ ] app.js created
- [ ] server.js created
- [ ] .env configured with your LINE credentials

**Test:**
```bash
npm run dev

# In another terminal
curl http://localhost:3000/health

# Should return: {"success":true,"message":"LINE Banking Bot is running"...}
```

---

# PHASE 3: Authentication System (45 minutes)

## 📋 Objectives
- ✅ Create Banking API service
- ✅ Implement Send OTP endpoint
- ✅ Implement Verify OTP endpoint
- ✅ Create validators
- ✅ Test with actual banking API

## 🎯 Step 3.1: Create Validators

**File: `src/utils/validators.js`**
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
      // If starts with 0, remove it
      if (cleaned.startsWith('0')) {
        cleaned = cleaned.substring(1);
      }

      // Assume country code 91 (India) if too short
      if (cleaned.length <= 10) {
        cleaned = '91' + cleaned;
      }

      cleaned = '+' + cleaned;
    }

    return cleaned;
  }

  isValidOTP(otp) {
    // Exactly 6 digits
    return /^\d{6}$/.test(otp);
  }

  sanitizeInput(input) {
    // Remove dangerous content
    return input
      .replace(/<script[^>]*>.*?<\/script>/gi, '')
      .replace(/[<>\"']/g, '')
      .trim();
  }
}

module.exports = new Validators();
```

## 🎯 Step 3.2: Create Banking API Service

**File: `src/services/bankingService.js`**
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
      logger.info(`Sending OTP to ${this.maskPhone(phone)}`);

      const response = await this.client.post('/banking/auth/send-otp', {
        phone: this.formatPhone(phone),
      });

      logger.info(`OTP sent successfully to ${this.maskPhone(phone)}`);
      return response.data;
    } catch (error) {
      logger.error(`Send OTP failed for ${this.maskPhone(phone)}:`, error.message);
      return {
        success: false,
        message: error.response?.data?.message || 'Failed to send OTP',
      };
    }
  }

  async verifyOTP(phone, otp) {
    try {
      logger.info(`Verifying OTP for ${this.maskPhone(phone)}`);

      const response = await this.client.post('/banking/auth/verify-otp', {
        phone: this.formatPhone(phone),
        otp: otp,
      });

      logger.info(`OTP verified successfully for ${this.maskPhone(phone)}`);
      return response.data;
    } catch (error) {
      logger.error(`OTP verification failed for ${this.maskPhone(phone)}:`, error.message);
      return {
        success: false,
        data: { verified: false },
        message: error.response?.data?.message || 'OTP verification failed',
      };
    }
  }

  async getBalance(phone) {
    try {
      logger.info(`Fetching balance for ${this.maskPhone(phone)}`);

      const response = await this.client.get('/banking/account/balance', {
        params: { phone: this.formatPhone(phone) },
      });

      logger.info(`Balance fetched for ${this.maskPhone(phone)}`);
      return response.data;
    } catch (error) {
      logger.error(`Get balance failed for ${this.maskPhone(phone)}:`, error.message);
      return {
        success: false,
        message: error.response?.data?.message || 'Failed to fetch balance',
      };
    }
  }

  // Helper methods
  formatPhone(phone) {
    if (!phone.startsWith('+')) {
      return `+${phone}`;
    }
    return phone;
  }

  maskPhone(phone) {
    // Mask sensitive data for logging
    return phone.replace(/\d(?=\d{4})/g, '*');
  }
}

module.exports = new BankingService();
```

## 🎯 Step 3.3: Create Webhook Controller

**File: `src/controllers/webhookController.js`**
```javascript
const lineService = require('../services/lineService');
const sessionService = require('../services/sessionService');
const logger = require('../utils/logger');

class WebhookController {
  async handleWebhook(req, res) {
    try {
      const { events } = req.body;

      // Process all events
      await Promise.all(
        events.map(async (event) => {
          try {
            await this.processEvent(event);
          } catch (error) {
            logger.error(`Error processing event:`, error);
          }
        })
      );

      res.status(200).json({ message: 'OK' });
    } catch (error) {
      logger.error('Webhook error:', error);
      res.status(500).json({ error: 'Internal Server Error' });
    }
  }

  async processEvent(event) {
    const { type, replyToken, source } = event;
    const userId = source.userId;

    logger.info(`Event: ${type} from user ${userId}`);

    switch (type) {
      case 'follow':
        await this.handleFollow(replyToken, userId);
        break;

      case 'unfollow':
        await sessionService.deleteSession(userId);
        break;

      case 'message':
        // Will implement in Phase 4
        logger.info(`Message from ${userId}`);
        break;

      case 'postback':
        // Will implement in Phase 4
        logger.info(`Postback from ${userId}`);
        break;

      default:
        logger.debug(`Unknown event type: ${type}`);
    }
  }

  async handleFollow(replyToken, userId) {
    logger.info(`User ${userId} followed bot`);

    // Create session
    await sessionService.createSession(userId);

    // Send welcome message
    const messages = [
      {
        type: 'text',
        text: 'Welcome to FAB Bank! 🏦\nI\'m your banking assistant.',
      },
    ];

    await lineService.replyMessage(replyToken, messages);
  }
}

module.exports = new WebhookController();
```

## 🎯 Step 3.4: Update App with Real Webhook

**File: `src/app.js` (Update only the webhook endpoint)**
```javascript
// Replace the placeholder webhook with:
const webhookController = require('./controllers/webhookController');

// ... existing code ...

// Real webhook endpoint
app.post('/webhook', validateLineSignature, (req, res) => {
  webhookController.handleWebhook(req, res);
});

// ... rest of code ...
```

## ✅ Phase 3 Validation Checklist

- [ ] validators.js created and tested
- [ ] bankingService.js created
- [ ] webhookController.js created
- [ ] app.js updated with real webhook
- [ ] server.js runs without errors
- [ ] Can start server: `npm run dev`

**Test:**
```bash
npm run dev

# Test validators
node -e "
const validators = require('./src/utils/validators');
console.log('Test 1:', validators.isValidPhone('+919876543210')); // true
console.log('Test 2:', validators.formatPhoneInput('9876543210')); // +919876543210
console.log('Test 3:', validators.isValidOTP('123456')); // true
"

# Test banking API connection
node -e "
const bankingService = require('./src/services/bankingService');
bankingService.sendOTP('+919876543210').then(r => console.log(r));
"
```

---

# PHASE 4: Check Balance Feature (60 minutes)

## 📋 Objectives
- ✅ Create message and postback handlers
- ✅ Implement phone input → OTP → verification flow
- ✅ Fetch and display balance
- ✅ Create dialog manager
- ✅ Test end-to-end

## 🎯 Step 4.1: Create Message Handler

**File: `src/handlers/messageHandler.js`**
```javascript
const lineService = require('../services/lineService');
const sessionService = require('../services/sessionService');
const dialogManager = require('../services/dialogManager');
const logger = require('../utils/logger');

class MessageHandler {
  async handleTextMessage(replyToken, userId, message) {
    const text = message.text.trim();

    try {
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

      logger.info(`Message from ${userId}: "${text}" in dialog: ${session.dialogState}`);

      // Process message through dialog manager
      const result = await dialogManager.processMessage(
        userId,
        session.dialogState,
        text,
        session.attributes
      );

      if (result.messages && result.messages.length > 0) {
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

## 🎯 Step 4.2: Create Postback Handler

**File: `src/handlers/postbackHandler.js`**
```javascript
const lineService = require('../services/lineService');
const sessionService = require('../services/sessionService');
const bankingService = require('../services/bankingService');
const logger = require('../utils/logger');

class PostbackHandler {
  async handlePostback(replyToken, userId, postback) {
    const { data } = postback;

    try {
      const params = new URLSearchParams(data);
      const action = params.get('action');

      logger.info(`Postback from ${userId}: action=${action}`);

      switch (action) {
        case 'check_balance':
          await this.startCheckBalance(replyToken, userId);
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
        text: 'Please enter your registered phone number (e.g., +919876543210 or 9876543210)',
      },
    ]);
  }

  async showMainMenu(replyToken, userId) {
    await sessionService.updateDialogState(userId, 'MAIN_MENU');

    const message = {
      type: 'template',
      altText: 'Main Menu',
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

    await lineService.replyMessage(replyToken, [message]);
  }

  async endSession(replyToken, userId) {
    await lineService.replyMessage(replyToken, [
      {
        type: 'text',
        text: 'Thank you for using FAB Bank! Have a great day! 👋',
      },
    ]);

    await sessionService.deleteSession(userId);
  }
}

module.exports = new PostbackHandler();
```

## 🎯 Step 4.3: Create Dialog Manager (Core Logic)

**File: `src/services/dialogManager.js`**
```javascript
const bankingService = require('./bankingService');
const validators = require('../utils/validators');
const logger = require('../utils/logger');

class DialogManager {
  async processMessage(userId, dialogState, input, attributes) {
    try {
      switch (dialogState) {
        case 'CHECK_BALANCE':
          return await this.handleCheckBalanceInput(input, attributes);

        case 'VERIFY_OTP':
          return await this.handleVerifyOTP(input, attributes);

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
}

module.exports = new DialogManager();
```

## 🎯 Step 4.4: Update Webhook Controller

**File: `src/controllers/webhookController.js` (Update processEvent method)**
```javascript
const messageHandler = require('../handlers/messageHandler');
const postbackHandler = require('../handlers/postbackHandler');

// ... existing code ...

async processEvent(event) {
  const { type, replyToken, source, message, postback } = event;
  const userId = source.userId;

  logger.info(`Event: ${type} from user ${userId}`);

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
      if (message.type === 'text') {
        await messageHandler.handleTextMessage(replyToken, userId, message);
      }
      break;

    case 'postback':
      await postbackHandler.handlePostback(replyToken, userId, postback);
      break;

    default:
      logger.debug(`Unknown event type: ${type}`);
  }
}
```

## ✅ Phase 4 Validation Checklist

- [ ] messageHandler.js created
- [ ] postbackHandler.js created
- [ ] dialogManager.js created
- [ ] webhookController.js updated
- [ ] Server starts: `npm run dev`
- [ ] No console errors
- [ ] Logs appear correctly

**Test:**
```bash
npm run dev

# In another terminal, test dialog manager
node -e "
const dialogManager = require('./src/services/dialogManager');
dialogManager.processMessage('test', 'CHECK_BALANCE', '9876543210', {}).then(r => {
  console.log(JSON.stringify(r, null, 2));
});
"
```

---

# PHASE 5: Card Services Feature (60 minutes)

## 📋 Objectives
- ✅ Create banking API methods for card operations
- ✅ Implement get cards flow
- ✅ Implement block card flow
- ✅ Implement unblock card flow
- ✅ Implement report lost card flow

## 🎯 Step 5.1: Extend Banking Service

**File: `src/services/bankingService.js` (Add these methods)**
```javascript
// Add these methods to the BankingService class

async getCards(phone) {
  try {
    logger.info(`Fetching cards for ${this.maskPhone(phone)}`);

    const response = await this.client.get('/banking/cards', {
      params: { phone: this.formatPhone(phone) },
    });

    logger.info(`Cards fetched for ${this.maskPhone(phone)}`);
    return response.data;
  } catch (error) {
    logger.error(`Get cards failed for ${this.maskPhone(phone)}:`, error.message);
    return {
      success: false,
      message: error.response?.data?.message || 'Failed to fetch cards',
    };
  }
}

async blockCard(phone, cardId, reason = '') {
  try {
    logger.info(`Blocking card ${cardId} for ${this.maskPhone(phone)}`);

    const response = await this.client.post('/banking/cards/block', {
      phone: this.formatPhone(phone),
      cardId: cardId,
      reason: reason,
    });

    logger.info(`Card ${cardId} blocked for ${this.maskPhone(phone)}`);
    return response.data;
  } catch (error) {
    logger.error(`Block card failed for ${this.maskPhone(phone)}:`, error.message);
    return {
      success: false,
      message: error.response?.data?.message || 'Failed to block card',
    };
  }
}

async unblockCard(phone, cardId) {
  try {
    logger.info(`Unblocking card ${cardId} for ${this.maskPhone(phone)}`);

    const response = await this.client.post('/banking/cards/unblock', {
      phone: this.formatPhone(phone),
      cardId: cardId,
    });

    logger.info(`Card ${cardId} unblocked for ${this.maskPhone(phone)}`);
    return response.data;
  } catch (error) {
    logger.error(`Unblock card failed:`, error.message);
    return {
      success: false,
      message: error.response?.data?.message || 'Failed to unblock card',
    };
  }
}

async reportLostCard(phone, cardId) {
  try {
    logger.info(`Reporting card ${cardId} lost for ${this.maskPhone(phone)}`);

    const response = await this.client.post('/banking/cards/report-lost', {
      phone: this.formatPhone(phone),
      cardId: cardId,
      reason: 'Lost card',
    });

    logger.info(`Card ${cardId} reported lost for ${this.maskPhone(phone)}`);
    return response.data;
  } catch (error) {
    logger.error(`Report lost failed:`, error.message);
    return {
      success: false,
      message: error.response?.data?.message || 'Failed to report card lost',
    };
  }
}

async getCardLimits(cardId) {
  try {
    logger.info(`Fetching limits for card ${cardId}`);

    const response = await this.client.get(`/banking/cards/${cardId}/limits`);

    logger.info(`Card limits fetched for card ${cardId}`);
    return response.data;
  } catch (error) {
    logger.error(`Get card limits failed:`, error.message);
    return {
      success: false,
      message: error.response?.data?.message || 'Failed to fetch limits',
    };
  }
}
```

## 🎯 Step 5.2: Extend Dialog Manager

**File: `src/services/dialogManager.js` (Add to switch case)**
```javascript
// In processMessage switch statement, add these cases:

case 'CARD_SERVICES':
  return await this.handleCardServicesInput(input, attributes);

case 'GET_PHONE_FOR_CARDS':
  return await this.handleGetPhoneForCards(input, attributes);

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
```

**Add these new methods to DialogManager class:**
```javascript
async handleCardServicesInput(input, attributes) {
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

async handleGetPhoneForCards(input, attributes) {
  // Same as handleCardServicesInput
  return this.handleCardServicesInput(input, attributes);
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
        text: `✅ Card ${cardId} blocked successfully!\n\nYour card has been blocked and cannot be used for transactions.`,
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
        text: `✅ Card ${cardId} unblocked successfully!\n\nYour card is now active and ready to use.`,
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
```

## 🎯 Step 5.3: Update Postback Handler

**File: `src/handlers/postbackHandler.js` (Add to switch statement)**
```javascript
case 'card_services':
  await this.startCardServices(replyToken, userId);
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

case 'confirm_unblock':
  await this.handleConfirmUnblock(replyToken, userId);
  break;

case 'confirm_report_lost':
  await this.handleConfirmReportLost(replyToken, userId);
  break;
```

**Add these methods to PostbackHandler class:**
```javascript
async startCardServices(replyToken, userId) {
  await sessionService.updateDialogState(userId, 'GET_PHONE_FOR_CARDS');

  await lineService.replyMessage(replyToken, [
    {
      type: 'text',
      text: 'Please enter your registered phone number to view your cards',
    },
  ]);
}

async startBlockCard(replyToken, userId) {
  await sessionService.updateDialogState(userId, 'BLOCK_CARD');

  await lineService.replyMessage(replyToken, [
    {
      type: 'text',
      text: 'Enter the Card ID to block:',
    },
  ]);
}

async startUnblockCard(replyToken, userId) {
  await sessionService.updateDialogState(userId, 'UNBLOCK_CARD');

  await lineService.replyMessage(replyToken, [
    {
      type: 'text',
      text: 'Enter the Card ID to unblock:',
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

async handleConfirmUnblock(replyToken, userId) {
  const session = await sessionService.getSession(userId);
  const cardId = new URLSearchParams(replyToken).get('cardId');

  if (session && cardId) {
    await sessionService.updateAttributes(userId, { cardId });
    await sessionService.updateDialogState(userId, 'CONFIRM_UNBLOCK_CARD');
  }
}

async handleConfirmReportLost(replyToken, userId) {
  const session = await sessionService.getSession(userId);
  const cardId = new URLSearchParams(replyToken).get('cardId');

  if (session && cardId) {
    await sessionService.updateAttributes(userId, { cardId });
    await sessionService.updateDialogState(userId, 'CONFIRM_REPORT_LOST');
  }
}
```

## ✅ Phase 5 Validation Checklist

- [ ] Banking service extended with card methods
- [ ] Dialog manager updated with all card handlers
- [ ] Postback handler updated with card actions
- [ ] Server starts: `npm run dev`
- [ ] No console errors
- [ ] Can test card flows

---

# PHASE 6: Mini Statement & Transactions (45 minutes)

## 📋 Objectives
- ✅ Create mini statement API method
- ✅ Format transactions display
- ✅ Add mini statement to dialog flow
- ✅ Test transaction display

## 🎯 Step 6.1: Extend Banking Service

**File: `src/services/bankingService.js` (Add this method)**
```javascript
async getMiniStatement(phone, limit = 5) {
  try {
    logger.info(`Fetching mini statement for ${this.maskPhone(phone)}`);

    const response = await this.client.get('/banking/account/mini-statement', {
      params: {
        phone: this.formatPhone(phone),
        limit: limit,
      },
    });

    logger.info(`Mini statement fetched for ${this.maskPhone(phone)}`);
    return response.data;
  } catch (error) {
    logger.error(`Get mini statement failed:`, error.message);
    return {
      success: false,
      message: error.response?.data?.message || 'Failed to fetch statement',
    };
  }
}
```

## 🎯 Step 6.2: Add Mini Statement Handler to Dialog Manager

**File: `src/services/dialogManager.js` (Add to switch case)**
```javascript
case 'SHOW_BALANCE':
  return await this.handleShowBalance(input, attributes);
```

**Add this new method:**
```javascript
async handleShowBalance(input, attributes) {
  // This is handled by postback, not by text input
  return { messages: [] };
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
```

## 🎯 Step 6.3: Update Postback Handler

**File: `src/handlers/postbackHandler.js` (Add to switch statement)**
```javascript
case 'view_mini_statement':
  await this.viewMiniStatement(replyToken, userId);
  break;
```

**Add this method:**
```javascript
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
```

## ✅ Phase 6 Validation Checklist

- [ ] Banking service has getMiniStatement method
- [ ] Dialog manager has mini statement handlers
- [ ] Postback handler has view_mini_statement case
- [ ] Server runs without errors
- [ ] Transactions format correctly

---

# PHASE 7: Rich Message Templates (60 minutes)

## 📋 Objectives
- ✅ Create template service for Flex messages
- ✅ Create balance display template
- ✅ Create card carousel template
- ✅ Create button templates
- ✅ Update all messages to use templates

## 🎯 Step 7.1: Create Template Service

**File: `src/services/templateService.js`**
```javascript
class TemplateService {
  getMainMenuTemplate() {
    return {
      type: 'template',
      altText: 'Main Menu',
      template: {
        type: 'buttons',
        text: '🏦 FAB Bank Services\n\nHow can I help you?',
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
            label: '❌ Exit',
            data: 'action=end_session',
          },
        ],
      },
    };
  }

  getBalanceFlexTemplate(data) {
    return {
      type: 'flex',
      altText: `Balance: $${data.balance}`,
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
                this.createBalanceRow('Name:', data.customerName),
                this.createBalanceRow('Account:', data.accountNumber),
                this.createBalanceRow('Type:', data.accountType),
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
                label: '📊 Mini Statement',
                data: 'action=view_mini_statement',
              },
            },
            {
              type: 'button',
              style: 'link',
              height: 'sm',
              action: {
                type: 'postback',
                label: '🏠 Back to Menu',
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
      altText: `Your ${cards.length} card(s)`,
      contents: {
        type: 'carousel',
        contents: cards.slice(0, 10).map((card) => this.createCardBubble(card)),
      },
    };
  }

  createCardBubble(card) {
    const statusColor = card.status === 'ACTIVE' ? '#27ae60' : '#e74c3c';

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
            margin: 'md',
          },
          {
            type: 'box',
            layout: 'baseline',
            margin: 'md',
            contents: [
              {
                type: 'text',
                text: 'Card:',
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
                text: 'Expiry:',
                color: '#aaaaaa',
                size: 'sm',
                flex: 1,
              },
              {
                type: 'text',
                text: card.expiryDate
                  ? new Date(card.expiryDate).toLocaleDateString('en-IN')
                  : 'N/A',
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
                color: statusColor,
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

  createBalanceRow(label, value) {
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

  getConfirmTemplate(title, message, confirmLabel, confirmAction, cancelLabel) {
    return {
      type: 'template',
      altText: title,
      template: {
        type: 'buttons',
        text: message,
        actions: [
          {
            type: 'postback',
            label: confirmLabel,
            data: confirmAction,
          },
          {
            type: 'postback',
            label: cancelLabel,
            data: 'action=back_to_menu',
          },
        ],
      },
    };
  }

  getSuccessTemplate(title, message) {
    return {
      type: 'text',
      text: `✅ ${title}\n\n${message}`,
    };
  }

  getErrorTemplate(title, message) {
    return {
      type: 'text',
      text: `❌ ${title}\n\n${message}`,
    };
  }
}

module.exports = new TemplateService();
```

## 🎯 Step 7.2: Update Postback Handler to Use Templates

**File: `src/handlers/postbackHandler.js` (Update methods)**
```javascript
const templateService = require('../services/templateService');

// Update showMainMenu method
async showMainMenu(replyToken, userId) {
  await sessionService.updateDialogState(userId, 'MAIN_MENU');
  const message = templateService.getMainMenuTemplate();
  await lineService.replyMessage(replyToken, [message]);
}
```

## 🎯 Step 7.3: Update Dialog Manager to Use Templates

**File: `src/services/dialogManager.js` (Update handleVerifyOTP)**
```javascript
const templateService = require('./templateService');

// In handleVerifyOTP, replace the messages section with:
const balanceTemplate = templateService.getBalanceFlexTemplate(data);

return {
  messages: [balanceTemplate],
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
```

## ✅ Phase 7 Validation Checklist

- [ ] templateService.js created
- [ ] All templates have correct structure
- [ ] Messages use templates
- [ ] Flex messages render correctly
- [ ] Cards display in carousel
- [ ] Server runs without errors

---

# PHASE 8: Error Handling & Logging (45 minutes)

## 📋 Objectives
- ✅ Add comprehensive error handling
- ✅ Implement input validation
- ✅ Create error response messages
- ✅ Add detailed logging
- ✅ Handle edge cases

## 🎯 Step 8.1: Create Error Handler Middleware

**File: `src/middleware/errorHandler.js`**
```javascript
const logger = require('../utils/logger');

class ErrorHandler {
  handle(err, req, res, next) {
    logger.error('Unhandled error:', err);

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

## 🎯 Step 8.2: Update App with Error Handler

**File: `src/app.js` (Add before module.exports)**
```javascript
const errorHandler = require('./middleware/errorHandler');

// Add at the end of file, before module.exports
app.use((err, req, res, next) => {
  errorHandler.handle(err, req, res, next);
});

module.exports = app;
```

## 🎯 Step 8.3: Update Services with Better Error Handling

**File: `src/services/bankingService.js` (Wrap all API calls)**
```javascript
// Already added in Step 3, but ensure all methods have try-catch

// Add timeout handling:
this.client.interceptors.response.use(
  (response) => response,
  (error) => {
    if (error.code === 'ECONNABORTED') {
      logger.error('Banking API timeout');
      return {
        success: false,
        message: 'Service is temporarily unavailable. Please try again.',
      };
    }
    throw error;
  }
);
```

## 🎯 Step 8.4: Add Rate Limiting and Security

**File: `src/middleware/security.js`**
```javascript
const logger = require('../utils/logger');

class SecurityMiddleware {
  // Track requests per user
  static userRequests = new Map();

  static checkRateLimit(userId, maxRequests = 30, timeWindow = 60000) {
    const now = Date.now();
    const key = userId;

    if (!this.userRequests.has(key)) {
      this.userRequests.set(key, []);
    }

    const requests = this.userRequests.get(key);
    const recentRequests = requests.filter((time) => now - time < timeWindow);

    if (recentRequests.length >= maxRequests) {
      logger.warn(`Rate limit exceeded for user ${userId}`);
      return false;
    }

    recentRequests.push(now);
    this.userRequests.set(key, recentRequests);
    return true;
  }

  static validateInput(input, maxLength = 1000) {
    if (!input || typeof input !== 'string') {
      return false;
    }

    if (input.length > maxLength) {
      logger.warn(`Input exceeds max length: ${input.length}`);
      return false;
    }

    // Check for malicious patterns
    const maliciousPatterns = [/<script/i, /javascript:/i, /onerror=/i];
    if (maliciousPatterns.some((pattern) => pattern.test(input))) {
      logger.warn('Malicious input detected');
      return false;
    }

    return true;
  }
}

module.exports = SecurityMiddleware;
```

## 🎯 Step 8.5: Update Webhook Controller with Rate Limiting

**File: `src/controllers/webhookController.js` (Add import and check)**
```javascript
const SecurityMiddleware = require('../middleware/security');

async processEvent(event) {
  const { type, source } = event;
  const userId = source.userId;

  // Check rate limit
  if (!SecurityMiddleware.checkRateLimit(userId)) {
    logger.warn(`Rate limit exceeded for user ${userId}`);
    return;
  }

  // ... rest of code ...
}
```

## ✅ Phase 8 Validation Checklist

- [ ] errorHandler.js created
- [ ] security.js created
- [ ] app.js uses error handler
- [ ] All API calls have error handling
- [ ] Rate limiting implemented
- [ ] Input validation in place
- [ ] Server runs without errors
- [ ] Logs show detailed information

---

# PHASE 9: Testing & Deployment (90 minutes)

## 📋 Objectives
- ✅ Write unit tests
- ✅ Write integration tests
- ✅ Test all features end-to-end
- ✅ Deploy to production
- ✅ Monitor and log

## 🎯 Step 9.1: Create Test Setup

**File: `jest.config.js`**
```javascript
module.exports = {
  testEnvironment: 'node',
  testMatch: ['**/__tests__/**/*.js', '**/?(*.)+(spec|test).js'],
  coveragePathIgnorePatterns: ['/node_modules/', '/logs/'],
  collectCoverageFrom: ['src/**/*.js'],
  verbose: true,
};
```

## 🎯 Step 9.2: Create Unit Tests

**File: `tests/unit/validators.test.js`**
```javascript
const validators = require('../../src/utils/validators');

describe('Validators', () => {
  test('isValidPhone - valid international format', () => {
    expect(validators.isValidPhone('+919876543210')).toBe(true);
  });

  test('isValidPhone - invalid format', () => {
    expect(validators.isValidPhone('919876543210')).toBe(false);
  });

  test('isValidOTP - valid 6 digits', () => {
    expect(validators.isValidOTP('123456')).toBe(true);
  });

  test('isValidOTP - invalid 5 digits', () => {
    expect(validators.isValidOTP('12345')).toBe(false);
  });

  test('formatPhoneInput - adds country code', () => {
    const result = validators.formatPhoneInput('9876543210');
    expect(result).toBe('+919876543210');
  });

  test('formatPhoneInput - keeps + prefix', () => {
    const result = validators.formatPhoneInput('+919876543210');
    expect(result).toBe('+919876543210');
  });
});
```

**File: `tests/unit/sessionService.test.js`**
```javascript
const sessionService = require('../../src/services/sessionService');

describe('SessionService', () => {
  const userId = 'test_user_123';

  test('createSession - creates new session', async () => {
    const session = await sessionService.createSession(userId);
    expect(session.userId).toBe(userId);
    expect(session.dialogState).toBe('MAIN_MENU');
  });

  test('getSession - retrieves existing session', async () => {
    await sessionService.createSession(userId);
    const session = await sessionService.getSession(userId);
    expect(session).not.toBeNull();
    expect(session.userId).toBe(userId);
  });

  test('updateDialogState - updates state', async () => {
    await sessionService.createSession(userId);
    await sessionService.updateDialogState(userId, 'CHECK_BALANCE');
    const session = await sessionService.getSession(userId);
    expect(session.dialogState).toBe('CHECK_BALANCE');
  });

  test('updateAttributes - updates attributes', async () => {
    await sessionService.createSession(userId);
    await sessionService.updateAttributes(userId, { phone: '+919876543210' });
    const session = await sessionService.getSession(userId);
    expect(session.attributes.phone).toBe('+919876543210');
  });

  test('deleteSession - removes session', async () => {
    await sessionService.createSession(userId);
    await sessionService.deleteSession(userId);
    const session = await sessionService.getSession(userId);
    expect(session).toBeNull();
  });
});
```

## 🎯 Step 9.3: Create Integration Tests

**File: `tests/integration/dialogFlow.test.js`**
```javascript
const dialogManager = require('../../src/services/dialogManager');

describe('Dialog Flow Integration', () => {
  test('Check Balance Flow - phone input', async () => {
    const result = await dialogManager.processMessage(
      'user123',
      'CHECK_BALANCE',
      '9876543210',
      {}
    );

    expect(result.messages).not.toBeNull();
    expect(result.messages.length).toBeGreaterThan(0);
    expect(result.newDialogState).toBe('VERIFY_OTP');
    expect(result.attributes.phone).toBeDefined();
  });

  test('Check Balance Flow - invalid phone', async () => {
    const result = await dialogManager.processMessage(
      'user123',
      'CHECK_BALANCE',
      'invalid',
      {}
    );

    expect(result.messages[0].type).toBe('text');
    expect(result.messages[0].text).toContain('Invalid');
  });

  test('Check Balance Flow - invalid OTP', async () => {
    const result = await dialogManager.processMessage(
      'user123',
      'VERIFY_OTP',
      '12345',
      { phone: '+919876543210' }
    );

    expect(result.messages[0].type).toBe('text');
    expect(result.messages[0].text).toContain('Invalid OTP');
  });
});
```

## 🎯 Step 9.4: Create Testing Script

**File: `tests/manual-test-guide.md`**
```markdown
# Manual Testing Guide

## Test Case 1: Welcome Flow
1. Add bot as friend in LINE app
2. Bot should send welcome message
3. User should be able to tap "Check Balance" button

## Test Case 2: Check Balance Flow
1. Tap "Check Balance"
2. Enter phone: 9876543210
3. OTP should be sent (check banking API logs)
4. Enter OTP: 123456 (or actual OTP)
5. Should display balance with customer name
6. Should show "View Mini Statement" button

## Test Case 3: Mini Statement
1. Tap "View Mini Statement"
2. Should display last 5 transactions
3. Should show current balance

## Test Case 4: Card Services
1. Tap "Card Services"
2. Enter phone
3. Should display all cards in carousel
4. Tap "Block Card"
5. Enter card ID
6. Enter block reason
7. Should show success message

## Test Case 5: Back to Menu
1. From any screen, tap "Back to Menu"
2. Should return to main menu
3. Session state should be correct

## Test Case 6: Session Timeout
1. Don't interact for 5+ minutes
2. Send a message
3. Should get "Session expired" message
4. User needs to follow bot again
```

## 🎯 Step 9.5: Run All Tests

**Execute:**
```bash
# Run all tests
npm test

# Run with coverage
npm test -- --coverage

# Run specific test file
npm test -- tests/unit/validators.test.js

# Run in watch mode
npm test -- --watch
```

## 🎯 Step 9.6: Deployment Checklist

**Create `.env.production`:**
```env
LINE_CHANNEL_ID=your_production_channel_id
LINE_CHANNEL_SECRET=your_production_secret
LINE_ACCESS_TOKEN=your_production_token
PORT=3000
NODE_ENV=production
BANKING_API_BASE_URL=https://password-reset.lab.bravishma.com:6507/api/v1
BANKING_API_TIMEOUT=5000
SESSION_TIMEOUT=300000
LOG_LEVEL=warn
```

## 🎯 Step 9.7: Production Deployment Steps

**Deploy to Heroku (example):**
```bash
# Install Heroku CLI
# Create Heroku app
heroku create line-banking-bot

# Set environment variables
heroku config:set LINE_CHANNEL_ID=xxx
heroku config:set LINE_CHANNEL_SECRET=xxx
heroku config:set LINE_ACCESS_TOKEN=xxx

# Deploy
git push heroku main

# View logs
heroku logs --tail
```

**Or Docker:**
```bash
# Create Dockerfile
FROM node:16
WORKDIR /app
COPY package*.json ./
RUN npm install
COPY src ./src
EXPOSE 3000
CMD ["npm", "start"]

# Build and run
docker build -t line-banking-bot .
docker run -p 3000:3000 --env-file .env.production line-banking-bot
```

## 🎯 Step 9.8: Monitoring Setup

**File: `src/utils/monitoring.js`**
```javascript
const logger = require('./logger');

class Monitoring {
  static metrics = {
    totalWebhooks: 0,
    totalMessages: 0,
    totalErrors: 0,
    startTime: Date.now(),
  };

  static recordWebhook() {
    this.metrics.totalWebhooks++;
  }

  static recordMessage() {
    this.metrics.totalMessages++;
  }

  static recordError() {
    this.metrics.totalErrors++;
  }

  static getMetrics() {
    const uptime = Date.now() - this.metrics.startTime;

    return {
      ...this.metrics,
      uptime: `${Math.floor(uptime / 1000 / 60)} minutes`,
      messagesPerMinute: Math.round(
        (this.metrics.totalMessages / uptime) * 60 * 1000
      ),
      errorRate: (
        (this.metrics.totalErrors / this.metrics.totalWebhooks) *
        100
      ).toFixed(2) + '%',
    };
  }
}

module.exports = Monitoring;
```

**Add to app.js:**
```javascript
const Monitoring = require('./utils/monitoring');

// Add metrics endpoint
app.get('/metrics', (req, res) => {
  res.json(Monitoring.getMetrics());
});
```

## ✅ Phase 9 Validation Checklist

- [ ] All tests pass: `npm test`
- [ ] Test coverage > 70%
- [ ] Manual testing completed (all test cases)
- [ ] No errors in logs
- [ ] Deployed successfully
- [ ] Webhook URL set in LINE console
- [ ] Monitoring metrics show healthy stats
- [ ] Bot responds to all user inputs
- [ ] Error handling works correctly
- [ ] Session management works correctly

---

# 🎉 Implementation Complete!

## Final Checklist

- [ ] All 9 phases completed
- [ ] All tests passing
- [ ] Bot deployed and running
- [ ] LINE webhook configured
- [ ] Monitoring active
- [ ] Documentation complete
- [ ] Team trained on bot usage

## Next Steps

1. **Monitor in Production**: Check logs daily
2. **Gather User Feedback**: Improve based on usage
3. **Add New Features**: Requests, loan applications, etc.
4. **Scale**: Increase server capacity if needed
5. **Security Audit**: Regular security reviews

## Support Contacts

- **Banking API Issues**: Check with backend team
- **LINE Integration Issues**: LINE Developers Console
- **Bot Logic Issues**: Review dialog manager

---

**Version**: 1.0 | **Created**: 2026-02-10 | **Status**: Ready for Implementation
