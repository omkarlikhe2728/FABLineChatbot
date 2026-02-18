# Microsoft Teams FAB Bank Bot Implementation Plan
**Webhook URL:** `https://recent-jaimee-nonexaggerative.ngrok-free.dev/api/teams/webhook`

---

## 📋 Architecture Overview

```
Teams User
    │  (Bot Framework Activity)
    ▼
FABLineChatbot  POST /api/teams/webhook  (NEW ROUTE)
    │
    ├─ bankingService → Banking API (password-reset.lab.bravishma.com:6507)
    │                   (send OTP, verify OTP, balance, cards, mini statement)
    │
    ├─ sessionStore   → In-memory Map  (shared with other bots)
    │
    └─ liveChatService → Middleware POST /api/teams-direct/live-chat/message/{tenantId}
                         (same pattern as Telegram bot)

Agent replies:
Middleware → Avaya forwardToTeams() (NEW)
    ↓
FABLineChatbot receives proactive message push
    ↓
Teams User
```

**Key Pattern:** Identical to `telegram-fabbank` bot structure — 60% code reuse

---

## 🗂️ New Bot Directory Structure

```
src/bots/teams-fabbank/
├── config.js              # TeamsFabBankConfig (reads TEAMS_FABBANK_* env vars)
├── index.js               # TeamsFabBankBot class with handleWebhook()
├── controllers/
│   └── activityController.js  # Routes Bot Framework activities
├── handlers/
│   ├── commandHandler.js      # Welcome on membersAdded event
│   ├── actionHandler.js       # Adaptive Card action button routing
│   └── messageHandler.js      # Text + attachment message processing
└── services/
    ├── teamsService.js        # Bot Framework API wrapper
    ├── sessionService.js      # Thin wrapper over common SessionStore
    ├── dialogManager.js       # 15-state machine (copy from telegram-fabbank)
    ├── liveChatService.js     # Calls /api/teams-direct endpoints on middleware
    ├── bankingService.js      # Re-exports fabbank/services/bankingService (same as Telegram)
    └── templateService.js     # Teams Adaptive Card JSON builders
```

**Config file:** `config/teams-fabbank.json`
**Env file:** `.env.teams-fabbank`
**bots.json entry:**
```json
{
  "id": "teams-fabbank",
  "enabled": true,
  "envFile": ".env.teams-fabbank",
  "configFile": "config/teams-fabbank.json",
  "modulePath": "./bots/teams-fabbank"
}
```

---

## 📝 Files to Create (in FABLineChatbot)

### 1. src/bots/teams-fabbank/config.js

```javascript
const BaseBotConfig = require('../../common/core/BaseBotConfig');

class TeamsFabBankConfig extends BaseBotConfig {
  constructor() {
    super('teams-fabbank', 'TEAMS_FABBANK');

    this.botToken = process.env.TEAMS_FABBANK_BOT_TOKEN; // Will be unused - use appId/appPassword instead
    this.appId = process.env.TEAMS_FABBANK_APP_ID;
    this.appPassword = process.env.TEAMS_FABBANK_APP_PASSWORD;

    // Banking API
    this.bankingApiUrl = process.env.TEAMS_FABBANK_BANKING_API_URL ||
      'https://password-reset.lab.bravishma.com:6507/api/v1';
    this.bankingApiTimeout = parseInt(process.env.TEAMS_FABBANK_BANKING_API_TIMEOUT || '5000');

    // Live Chat Middleware
    this.liveChatApiUrl = process.env.TEAMS_FABBANK_LIVE_CHAT_API_URL ||
      'https://infobip-connector.lab.bravishma.com/';
    this.liveChatTimeout = parseInt(process.env.TEAMS_FABBANK_LIVE_CHAT_TIMEOUT || '20000');

    // Session
    this.sessionTimeout = parseInt(process.env.TEAMS_FABBANK_SESSION_TIMEOUT || '300000');
    this.tenantId = process.env.TEAMS_FABBANK_TENANT_ID || 'teams-fabbank';
  }
}

module.exports = TeamsFabBankConfig;
```

### 2. src/bots/teams-fabbank/index.js

```javascript
const BotRegistry = require('../../common/core/BotRegistry');
const TeamsFabBankConfig = require('./config');
const ActivityController = require('./controllers/activityController');
const TeamsService = require('./services/teamsService');
const SessionService = require('./services/sessionService');
const DialogManager = require('./services/dialogManager');
const BankingService = require('./services/bankingService');
const TemplateService = require('./services/templateService');
const LiveChatService = require('./services/liveChatService');
const logger = require('../../common/utils/logger');

class TeamsFabBankBot {
  constructor() {
    try {
      this.config = new TeamsFabBankConfig();
      this.teamsService = new TeamsService(this.config);
      this.sessionService = new SessionService(this.config);
      this.dialogManager = new DialogManager(
        this.sessionService,
        new BankingService(this.config),
        new TemplateService(this.config),
        new LiveChatService(this.config),
        this.config
      );
      this.activityController = new ActivityController(
        this.teamsService,
        this.sessionService,
        this.dialogManager,
        new TemplateService(this.config)
      );

      logger.info(`TeamsFabBankBot initialized successfully`);
      BotRegistry.register('teams-fabbank', this);
    } catch (error) {
      logger.error('Failed to initialize TeamsFabBankBot', error);
      throw error;
    }
  }

  async handleWebhook(req, res) {
    try {
      const activity = req.body;
      await this.activityController.processActivity(activity, req, res);
    } catch (error) {
      logger.error('Error in handleWebhook', error);
      res.status(500).json({ error: error.message });
    }
  }
}

module.exports = TeamsFabBankBot;
```

### 3. src/bots/teams-fabbank/controllers/activityController.js

Routes Bot Framework activities (message, conversationUpdate, invoke):

```javascript
const { TurnContext, MessageFactory, CardFactory } = require('botbuilder');
const logger = require('../../../common/utils/logger');

class ActivityController {
  constructor(teamsService, sessionService, dialogManager, templateService) {
    this.teamsService = teamsService;
    this.sessionService = sessionService;
    this.dialogManager = dialogManager;
    this.templateService = templateService;
  }

  async processActivity(activity, req, res) {
    try {
      switch (activity.type) {
        case 'message':
          await this.handleMessage(activity);
          break;
        case 'conversationUpdate':
          await this.handleConversationUpdate(activity);
          break;
        case 'invoke':
          await this.handleInvoke(activity);
          break;
        default:
          logger.debug(`Unhandled activity type: ${activity.type}`);
      }
      res.status(200).json({ ok: true });
    } catch (error) {
      logger.error('Error processing activity', error);
      res.status(500).json({ error: error.message });
    }
  }

  async handleMessage(activity) {
    const userId = activity.from.id;
    const text = activity.text?.trim() || '';
    const actionData = activity.value; // Adaptive Card action data
    const conversationReference = TurnContext.getConversationReference(activity);

    // Get or create session
    let session = this.sessionService.getSession(userId);
    if (!session) {
      session = this.sessionService.createSession(userId);
    }

    // Store conversation reference for proactive messages
    this.sessionService.updateConversationReference(userId, conversationReference);

    const { dialogState, attributes } = session;

    // Process through dialog state machine
    const result = await this.dialogManager.processMessage(
      userId,
      dialogState,
      text,
      actionData,
      attributes
    );

    // Send response cards
    if (result.cards && result.cards.length > 0) {
      for (const card of result.cards) {
        await this.teamsService.sendAdaptiveCard(userId, card);
      }
    }

    // Update session state
    if (result.newDialogState) {
      this.sessionService.updateDialogState(userId, result.newDialogState);
    }
    if (result.attributes) {
      this.sessionService.updateAttributes(userId, result.attributes);
    }
  }

  async handleConversationUpdate(activity) {
    // Bot added to conversation
    for (const member of activity.membersAdded || []) {
      if (member.id !== activity.recipient.id) {
        const userId = activity.from.id;
        const conversationReference = TurnContext.getConversationReference(activity);

        // Create session
        this.sessionService.createSession(userId);
        this.sessionService.updateConversationReference(userId, conversationReference);

        // Send welcome card
        const welcomeCard = this.templateService.getWelcomeCard();
        await this.teamsService.sendAdaptiveCard(userId, welcomeCard);
      }
    }

    // Bot removed from conversation
    for (const member of activity.membersRemoved || []) {
      if (member.id === activity.recipient.id) {
        const userId = activity.from.id;
        this.sessionService.deleteSession(userId);
      }
    }
  }

  async handleInvoke(activity) {
    // Handle task module or other invoke activities if needed
    logger.debug('Invoke activity received', activity.name);
  }
}

module.exports = ActivityController;
```

### 4. src/bots/teams-fabbank/handlers/messageHandler.js

```javascript
const logger = require('../../../common/utils/logger');

class MessageHandler {
  constructor(dialogManager, liveChatService, sessionService) {
    this.dialogManager = dialogManager;
    this.liveChatService = liveChatService;
    this.sessionService = sessionService;
  }

  async handleTextMessage(userId, text, attributes, dialogState) {
    if (dialogState === 'LIVE_CHAT_ACTIVE') {
      return await this.handleLiveChatMessage(userId, text);
    }

    return await this.dialogManager.processMessage(userId, dialogState, text, null, attributes);
  }

  async handleLiveChatMessage(userId, text) {
    // Check for exit keywords
    const exitKeywords = /\b(exit|quit|end chat|exit chat|close chat|back to bot|end live chat|end session|close session|menu|main menu|disconnect)\b/i;

    if (exitKeywords.test(text)) {
      // End live chat
      const endResult = await this.liveChatService.endLiveChat(userId);
      if (!endResult.success) {
        logger.warn(`Failed to end live chat for ${userId}`, endResult.error);
      }

      return {
        cards: [{ type: 'TextBlock', text: '✅ Chat ended. Back to main menu.' }],
        newDialogState: 'MAIN_MENU',
        attributes: {}
      };
    }

    // Forward message to agent
    const result = await this.liveChatService.sendMessage(userId, { type: 'text', text });
    if (!result.success) {
      logger.error(`Failed to send live chat message for ${userId}`, result.error);
      return {
        cards: [{ type: 'TextBlock', text: '❌ Failed to send message. Type "exit" to end chat.' }],
      };
    }

    return { cards: [] }; // No response needed for agent messages
  }

  async handleAttachmentMessage(userId, attachment, attributes, dialogState) {
    if (dialogState === 'LIVE_CHAT_ACTIVE') {
      // Forward attachment to agent
      return await this.liveChatService.sendMessage(userId, attachment);
    }

    return {
      cards: [{ type: 'TextBlock', text: '❌ Attachments not supported in this context.' }],
    };
  }
}

module.exports = MessageHandler;
```

### 5. src/bots/teams-fabbank/handlers/actionHandler.js

```javascript
const logger = require('../../../common/utils/logger');

class ActionHandler {
  constructor(dialogManager) {
    this.dialogManager = dialogManager;
  }

  async handleAction(userId, action, attributes, dialogState) {
    logger.info(`Action received: ${action} for user ${userId} in state ${dialogState}`);

    // Map actions to dialog states/transitions
    const actionMap = {
      'check_balance': { newState: 'CHECK_BALANCE' },
      'card_services': { newState: 'GET_PHONE_FOR_CARDS' },
      'live_chat': { method: '_startLiveChat' },
      'end_session': { method: '_endSession' },
      'back_to_menu': { newState: 'MAIN_MENU' },
      'confirm_yes': { method: '_handleConfirm', param: 'yes' },
      'confirm_no': { method: '_handleConfirm', param: 'no' },
    };

    const mapping = actionMap[action];
    if (!mapping) {
      logger.warn(`Unknown action: ${action}`);
      return { cards: [{ type: 'TextBlock', text: '❌ Unknown action.' }] };
    }

    if (mapping.newState) {
      return await this.dialogManager.processMessage(userId, dialogState, null, { action }, attributes);
    }

    return await this.dialogManager.processMessage(userId, dialogState, null, { action }, attributes);
  }
}

module.exports = ActionHandler;
```

### 6. src/bots/teams-fabbank/handlers/commandHandler.js

```javascript
const logger = require('../../../common/utils/logger');

class CommandHandler {
  constructor(templateService) {
    this.templateService = templateService;
  }

  async handleCommand(userId, command) {
    logger.info(`Command received: ${command} for user ${userId}`);

    switch (command.toLowerCase()) {
      case '/start':
      case '/help':
        return {
          cards: [this.templateService.getMainMenuCard()]
        };
      case '/menu':
        return {
          cards: [this.templateService.getMainMenuCard()],
          newDialogState: 'MAIN_MENU'
        };
      default:
        return {
          cards: [{ type: 'TextBlock', text: '❌ Unknown command. Try /help or /menu' }]
        };
    }
  }
}

module.exports = CommandHandler;
```

### 7. src/bots/teams-fabbank/services/teamsService.js

```javascript
const axios = require('axios');
const logger = require('../../../common/utils/logger');

class TeamsService {
  constructor(config) {
    this.appId = config.appId;
    this.appPassword = config.appPassword;
    this.botId = 'teams-fabbank';

    // Note: In real implementation, you'd use BotFrameworkAdapter
    // This is a simplified HTTP client version
    this.client = axios.create({
      timeout: 10000,
      headers: {
        'Content-Type': 'application/json'
      }
    });
  }

  async sendAdaptiveCard(userId, cardJson) {
    try {
      // In production, use BotFrameworkAdapter.continueConversation()
      // This would be called from the main Express app
      logger.info(`Sending Adaptive Card to ${userId}`);
      // Card sending handled by Express middleware with stored conversationReference
      return { success: true };
    } catch (error) {
      logger.error(`Error sending Adaptive Card to ${userId}`, error);
      return { success: false, error: error.message };
    }
  }

  async sendProactiveMessage(conversationReference, text) {
    try {
      // This would be called from middleware when agent replies
      logger.info(`Sending proactive message via conversation reference`);
      return { success: true };
    } catch (error) {
      logger.error('Error sending proactive message', error);
      return { success: false, error: error.message };
    }
  }

  async getUserProfile(userId) {
    try {
      logger.debug(`Getting profile for user ${userId}`);
      // Would call Teams API
      return { success: true, data: { displayName: `Teams User ${userId}` } };
    } catch (error) {
      logger.error(`Error getting profile for ${userId}`, error);
      return { success: false, error: error.message };
    }
  }
}

module.exports = TeamsService;
```

### 8. src/bots/teams-fabbank/services/sessionService.js

Thin wrapper over common `SessionStore`:

```javascript
const sessionStore = require('../../../common/services/sessionStore');

class SessionService {
  constructor(config) {
    this.botId = 'teams-fabbank';
    this.sessionTimeout = config.sessionTimeout;
  }

  createSession(userId, initialData = {}) {
    return sessionStore.createSession(
      this.botId,
      userId,
      { dialogState: 'MAIN_MENU', ...initialData },
      this.sessionTimeout
    );
  }

  getSession(userId) {
    return sessionStore.getSession(this.botId, userId);
  }

  updateDialogState(userId, newState) {
    sessionStore.updateDialogState(this.botId, userId, newState);
  }

  updateAttributes(userId, attrs) {
    sessionStore.updateAttributes(this.botId, userId, attrs);
  }

  updateConversationReference(userId, reference) {
    sessionStore.updateAttributes(this.botId, userId, { conversationReference: reference });
  }

  deleteSession(userId) {
    sessionStore.deleteSession(this.botId, userId);
  }
}

module.exports = SessionService;
```

### 9. src/bots/teams-fabbank/services/bankingService.js

Same as Telegram — re-export from LINE FAB Bank:

```javascript
// Import banking service from line-fabbank (platform-agnostic)
const BankingService = require('../../fabbank/services/bankingService');
module.exports = BankingService;
```

### 10. src/bots/teams-fabbank/services/dialogManager.js

Copy from `telegram-fabbank/services/dialogManager.js` with Teams Adaptive Card calls instead of inline keyboards. **15 states identical:**

```javascript
const logger = require('../../../common/utils/logger');
const validators = require('../../../common/utils/validators');

class DialogManager {
  constructor(sessionService, bankingService, templateService, liveChatService, config) {
    this.sessionService = sessionService;
    this.bankingService = bankingService;
    this.templateService = templateService;
    this.liveChatService = liveChatService;
    this.config = config;
  }

  async processMessage(userId, dialogState, text, actionData, attributes) {
    try {
      // Route based on current dialog state
      switch (dialogState) {
        case 'MAIN_MENU':
          return await this._handleMainMenu(userId, text, actionData, attributes);
        case 'CHECK_BALANCE':
          return await this._handleCheckBalance(userId, text, attributes);
        case 'VERIFY_OTP':
          return await this._handleVerifyOTP(userId, text, attributes);
        case 'SHOW_BALANCE':
          return await this._handleShowBalance(userId, text, actionData, attributes);
        // ... (all 15 states)
        case 'LIVE_CHAT_ACTIVE':
          return await this._handleLiveChat(userId, text, attributes);
        default:
          return { cards: [this.templateService.getMainMenuCard()], newDialogState: 'MAIN_MENU' };
      }
    } catch (error) {
      logger.error(`Error in processMessage state ${dialogState}`, error);
      return {
        cards: [this.templateService.getErrorCard('Error', error.message)],
        newDialogState: 'MAIN_MENU'
      };
    }
  }

  async _handleMainMenu(userId, text, actionData, attributes) {
    const action = actionData?.action || text?.toLowerCase();

    switch (action) {
      case 'check_balance':
        return {
          cards: [this.templateService.getPhoneInputPrompt('Enter your phone number (e.g., +971501234567)')],
          newDialogState: 'CHECK_BALANCE'
        };
      case 'card_services':
        return {
          cards: [this.templateService.getPhoneInputPrompt('Enter your phone number to view cards')],
          newDialogState: 'GET_PHONE_FOR_CARDS'
        };
      case 'live_chat':
        return await this._startLiveChat(userId, attributes);
      case 'end_session':
        return {
          cards: [this.templateService.getTextCard('Thank you', 'Session ended. Goodbye!')],
          newDialogState: 'SESSION_CLOSED'
        };
      default:
        return { cards: [this.templateService.getMainMenuCard()] };
    }
  }

  async _handleCheckBalance(userId, text, attributes) {
    if (!text) return { cards: [this.templateService.getPhoneInputPrompt('Enter phone number')] };

    const phone = validators.formatPhoneInput(text);
    if (!validators.isValidPhone(phone)) {
      return {
        cards: [this.templateService.getErrorCard('Invalid Phone', `Please enter valid phone (e.g., +971501234567)`)]
      };
    }

    // Send OTP
    const otpResult = await this.bankingService.sendOTP(phone);
    if (!otpResult.success) {
      return {
        cards: [this.templateService.getErrorCard('Error', otpResult.message || 'Failed to send OTP')]
      };
    }

    return {
      cards: [this.templateService.getOTPInputPrompt('Enter 6-digit OTP sent to your phone')],
      newDialogState: 'VERIFY_OTP',
      attributes: { phone }
    };
  }

  async _handleVerifyOTP(userId, text, attributes) {
    if (!validators.isValidOTP(text)) {
      return {
        cards: [this.templateService.getErrorCard('Invalid OTP', 'OTP must be exactly 6 digits')]
      };
    }

    const phone = attributes.phone;
    const verifyResult = await this.bankingService.verifyOTP(phone, text);
    if (!verifyResult.success) {
      return {
        cards: [this.templateService.getErrorCard('Failed', verifyResult.message || 'OTP verification failed')]
      };
    }

    // Get balance
    const balanceResult = await this.bankingService.getBalance(phone);
    if (!balanceResult.success) {
      return {
        cards: [this.templateService.getErrorCard('Error', 'Failed to fetch balance')]
      };
    }

    const data = balanceResult.data;
    return {
      cards: [this.templateService.getBalanceCard(data)],
      newDialogState: 'SHOW_BALANCE',
      attributes: {
        phone,
        isAuthenticated: true,
        customerName: data.customerName,
        accountNumber: data.accountNumber,
        balance: data.balance,
        currency: data.currency
      }
    };
  }

  // ... (remaining 12 state handlers - follow same pattern)

  async _startLiveChat(userId, attributes) {
    const displayName = attributes?.customerName || `Teams User ${userId}`;
    const result = await this.liveChatService.startLiveChat(
      userId,
      displayName,
      'User started live chat'
    );

    if (!result.success) {
      return {
        cards: [this.templateService.getErrorCard('Error', result.error || 'Failed to connect to agent')]
      };
    }

    return {
      cards: [this.templateService.getLiveChatStartingCard()],
      newDialogState: 'LIVE_CHAT_ACTIVE'
    };
  }

  async _handleLiveChat(userId, text, attributes) {
    // Handled by messageHandler.handleLiveChatMessage()
    return { cards: [] };
  }
}

module.exports = DialogManager;
```

### 11. src/bots/teams-fabbank/services/liveChatService.js

Calls middleware's `teams-direct` endpoints:

```javascript
const axios = require('axios');
const logger = require('../../../common/utils/logger');

class LiveChatService {
  constructor(config) {
    this.baseUrl = config.liveChatApiUrl;
    this.tenantId = config.tenantId;
    this.timeout = config.liveChatTimeout;
    this.client = axios.create({
      timeout: this.timeout,
      headers: { 'Content-Type': 'application/json' }
    });
  }

  async startLiveChat(userId, displayName, initialMessage) {
    try {
      const response = await this.client.post(
        `${this.baseUrl}/api/teams-direct/live-chat/message/${this.tenantId}`,
        {
          userId,
          displayName,
          channel: 'teams',
          message: { type: 'text', text: initialMessage }
        }
      );
      return { success: true, data: response.data };
    } catch (error) {
      logger.error(`Failed to start live chat for ${userId}`, error.message);
      return { success: false, error: error.message };
    }
  }

  async sendMessage(userId, message) {
    try {
      const response = await this.client.post(
        `${this.baseUrl}/api/teams-direct/live-chat/message/${this.tenantId}`,
        {
          userId,
          displayName: `Teams User ${userId}`,
          channel: 'teams',
          message
        }
      );
      return { success: true, data: response.data };
    } catch (error) {
      logger.error(`Failed to send live chat message for ${userId}`, error.message);
      return { success: false, error: error.message };
    }
  }

  async endLiveChat(userId) {
    try {
      const response = await this.client.post(
        `${this.baseUrl}/api/teams-direct/live-chat/end`,
        {
          userId,
          channel: 'teams'
        }
      );
      return { success: true, data: response.data };
    } catch (error) {
      logger.error(`Failed to end live chat for ${userId}`, error.message);
      return { success: false, error: error.message };
    }
  }
}

module.exports = LiveChatService;
```

### 12. src/bots/teams-fabbank/services/templateService.js

Adaptive Card builders:

```javascript
class TemplateService {
  constructor(config) {
    this.config = config;
  }

  getWelcomeCard() {
    return {
      "$schema": "http://adaptivecards.io/schemas/adaptive-card.json",
      "type": "AdaptiveCard",
      "version": "1.5",
      "body": [
        { "type": "TextBlock", "text": "👋 Welcome to FAB Bank!", "size": "large", "weight": "bolder" },
        { "type": "TextBlock", "text": "I'm your banking assistant. How can I help you today?", "wrap": true, "spacing": "medium" }
      ],
      "actions": [
        { "type": "Action.Submit", "title": "💰 Check Balance", "data": { "action": "check_balance" } },
        { "type": "Action.Submit", "title": "🎴 Card Services", "data": { "action": "card_services" } },
        { "type": "Action.Submit", "title": "💬 Live Chat", "data": { "action": "live_chat" } },
        { "type": "Action.Submit", "title": "❌ End Session", "data": { "action": "end_session" } }
      ]
    };
  }

  getMainMenuCard() {
    return this.getWelcomeCard();
  }

  getPhoneInputPrompt(message) {
    return {
      "$schema": "http://adaptivecards.io/schemas/adaptive-card.json",
      "type": "AdaptiveCard",
      "version": "1.5",
      "body": [
        { "type": "TextBlock", "text": message, "wrap": true }
      ]
    };
  }

  getOTPInputPrompt(message) {
    return {
      "$schema": "http://adaptivecards.io/schemas/adaptive-card.json",
      "type": "AdaptiveCard",
      "version": "1.5",
      "body": [
        { "type": "TextBlock", "text": message, "wrap": true }
      ]
    };
  }

  getBalanceCard(data) {
    return {
      "$schema": "http://adaptivecards.io/schemas/adaptive-card.json",
      "type": "AdaptiveCard",
      "version": "1.5",
      "body": [
        {
          "type": "Container",
          "items": [
            { "type": "TextBlock", "text": "💰 Account Balance", "size": "large", "weight": "bolder" },
            {
              "type": "FactSet",
              "facts": [
                { "name": "Name:", "value": data.customerName },
                { "name": "Account #:", "value": data.accountNumber },
                { "name": "Balance:", "value": `${data.currency} ${data.balance}` }
              ]
            }
          ]
        }
      ],
      "actions": [
        { "type": "Action.Submit", "title": "📋 View Statement", "data": { "action": "view_mini_statement" } },
        { "type": "Action.Submit", "title": "↩️ Back to Menu", "data": { "action": "back_to_menu" } }
      ]
    };
  }

  getErrorCard(title, message) {
    return {
      "$schema": "http://adaptivecards.io/schemas/adaptive-card.json",
      "type": "AdaptiveCard",
      "version": "1.5",
      "body": [
        { "type": "TextBlock", "text": `❌ ${title}`, "size": "large", "color": "attention" },
        { "type": "TextBlock", "text": message, "wrap": true }
      ]
    };
  }

  getTextCard(title, message) {
    return {
      "$schema": "http://adaptivecards.io/schemas/adaptive-card.json",
      "type": "AdaptiveCard",
      "version": "1.5",
      "body": [
        { "type": "TextBlock", "text": title, "size": "large", "weight": "bolder" },
        { "type": "TextBlock", "text": message, "wrap": true, "spacing": "medium" }
      ]
    };
  }

  getLiveChatStartingCard() {
    return this.getTextCard('⏳ Connecting to Agent', 'Please wait while we connect you with an agent...');
  }
}

module.exports = TemplateService;
```

---

## 📝 Files to Modify (in FABLineChatbot)

### 1. config/bots.json

Add Teams bot entry:

```json
{
  "id": "teams-fabbank",
  "enabled": true,
  "envFile": ".env.teams-fabbank",
  "configFile": "config/teams-fabbank.json",
  "modulePath": "./bots/teams-fabbank"
}
```

### 2. .env.teams-fabbank (NEW FILE)

```ini
# Teams Bot Framework Credentials
TEAMS_FABBANK_APP_ID=<your-azure-app-id>
TEAMS_FABBANK_APP_PASSWORD=<your-azure-app-password>

# Banking API
TEAMS_FABBANK_BANKING_API_URL=https://password-reset.lab.bravishma.com:6507/api/v1
TEAMS_FABBANK_BANKING_API_TIMEOUT=5000

# Live Chat Middleware
TEAMS_FABBANK_LIVE_CHAT_API_URL=https://infobip-connector.lab.bravishma.com/
TEAMS_FABBANK_LIVE_CHAT_TIMEOUT=20000

# Bot Settings
TEAMS_FABBANK_BOT_NAME=FAB Bank Teams
TEAMS_FABBANK_SESSION_TIMEOUT=300000
TEAMS_FABBANK_TENANT_ID=teams-fabbank
```

### 3. src/app.js

Add Teams webhook route:

```javascript
// Teams bot webhook — no signature validation (Bot Framework auth)
app.post('/api/teams/webhook', async (req, res) => {
  const bot = BotRegistry.getBot('teams-fabbank');
  if (!bot) {
    res.status(404).json({ error: 'Teams bot not found' });
    return;
  }
  await bot.handleWebhook(req, res);
});
```

Also add route for proactive messages from middleware:

```javascript
// Receive proactive message from middleware when agent replies
app.post('/api/teams/push-message', async (req, res) => {
  try {
    const { userId, text } = req.body;
    const session = sessionStore.getSession('teams-fabbank', userId);

    if (!session?.conversationReference) {
      res.status(404).json({ error: 'Conversation reference not found' });
      return;
    }

    const bot = BotRegistry.getBot('teams-fabbank');
    // Call bot's method to send proactive message
    await bot.teamsService.sendProactiveMessage(session.conversationReference, text);
    res.status(200).json({ sent: true });
  } catch (error) {
    logger.error('Error sending proactive message', error);
    res.status(500).json({ error: error.message });
  }
});
```

### 4. package.json

Add Bot Framework dependency:

```json
{
  "dependencies": {
    "botbuilder": "^4.20.0"
  }
}
```

---

## 📋 Middleware Changes Required

### 1. New File: src/routes/teams-direct.routes.ts

```
POST /api/teams-direct/live-chat/start
POST /api/teams-direct/live-chat/message/:projectName
POST /api/teams-direct/live-chat/end
```

### 2. New File: src/controllers/teams-direct.controller.ts

Clone of `telegram-direct.controller.ts` with `channelName: 'TEAMS'`

### 3. Modify: src/controllers/avaya.controller.ts

Add TEAMS branch in `handleWebhookCallback()`:

```typescript
} else if (channelName.toLowerCase() === 'teams') {
    await this.forwardToTeams(webhookData);
}

private async forwardToTeams(webhookData: AvayaWebhookPayload) {
  const userId = webhookData.headers.to?.[0];
  const text = webhookData.body?.text || '';

  // Call FABLineChatbot proactive message endpoint
  await axios.post('https://recent-jaimee-nonexaggerative.ngrok-free.dev/api/teams/push-message', {
    userId,
    text
  });
}
```

### 4. Modify: src/types/project.types.ts

Add `TEAMS_FABBANK = 'teams-fabbank'` to `ProjectName` enum

### 5. Modify: .env

Add:
```
TEAMS_BOT_BASE_URL=https://recent-jaimee-nonexaggerative.ngrok-free.dev
```

---

## 🚀 Implementation Order

### Phase 1: Setup (30 min)
- [ ] Add `.env.teams-fabbank` to FABLineChatbot
- [ ] Add entry to `config/bots.json`
- [ ] Create `config/teams-fabbank.json`
- [ ] Add `npm install botbuilder` to package.json

### Phase 2: FABLineChatbot Services (4 hours)
- [ ] Create all 12 service files in `src/bots/teams-fabbank/`
- [ ] Implement dialog state machine (copy from Telegram + adapt)
- [ ] Implement Adaptive Card templates

### Phase 3: FABLineChatbot Routes (1 hour)
- [ ] Add `/api/teams/webhook` route in `app.js`
- [ ] Add `/api/teams/push-message` route for proactive messages
- [ ] Test bot initialization

### Phase 4: Middleware Routes (2 hours)
- [ ] Create `teams-direct.routes.ts`
- [ ] Create `teams-direct.controller.ts`
- [ ] Add TEAMS branch to `avaya.controller.ts`
- [ ] Update `ProjectName` enum

### Phase 5: Testing (2 hours)
- [ ] Welcome message
- [ ] OTP flow
- [ ] Card services
- [ ] Live chat
- [ ] Session timeout

**Total: 9-11 hours**

---

## ✅ Quick Start

```bash
# 1. Install botbuilder
npm install botbuilder

# 2. Create bot files (see above)

# 3. Update config/bots.json with teams-fabbank entry

# 4. Create .env.teams-fabbank with credentials

# 5. Add routes to app.js

# 6. Start FABLineChatbot
npm run dev

# 7. Confirm Teams bot initializes:
# [TeamsBot] teams-fabbank initialized successfully

# 8. Sideload Teams app manifest in Teams
```

This follows the **exact same pattern** as `telegram-fabbank` — 60% code reuse, clean architecture, all business logic in FABLineChatbot, live chat via middleware.
