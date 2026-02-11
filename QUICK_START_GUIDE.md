# LINE Banking Bot - Quick Start Guide

## 🚀 5-Minute Setup

### Step 1: Create LINE Business Account
- Go to [LINE Business](https://business.line.biz/)
- Create account with company details
- Verify your email

### Step 2: Create Messaging API Channel
- Login to [LINE Developers Console](https://developers.line.biz/console/)
- Create new Messaging API Channel
- Channel name: "FAB Banking Bot"
- Channel Description: "Banking services via LINE"
- Get:
  - Channel ID
  - Channel Secret
  - Channel Access Token

### Step 3: Clone & Setup Project
```bash
# Clone or create new project
mkdir fabl-line-banking-bot
cd fabl-line-banking-bot

# Initialize Node project
npm init -y

# Install dependencies
npm install @line/bot-sdk axios express body-parser dotenv

# Create folder structure
mkdir -p src/{config,controllers,handlers,middleware,models,routes,services,utils,templates}
mkdir -p tests/{unit,integration}
```

### Step 4: Create .env File
```env
# LINE Channel
LINE_CHANNEL_ID=your_channel_id_here
LINE_CHANNEL_SECRET=your_channel_secret_here
LINE_ACCESS_TOKEN=your_access_token_here

# Banking API
BANKING_API_BASE_URL=https://password-reset.lab.bravishma.com:6507/api/v1
BANKING_API_TIMEOUT=5000

# Session
SESSION_TIMEOUT=300000

# Server
PORT=3000
NODE_ENV=development
```

### Step 5: Create Basic Express App
**src/app.js**
```javascript
const express = require('express');
const crypto = require('crypto');

const app = express();
app.use(express.json());

// Signature validation
app.post('/webhook', (req, res) => {
  const signature = req.headers['x-line-signature'];
  const body = JSON.stringify(req.body);

  const hash = crypto
    .createHmac('sha256', process.env.LINE_CHANNEL_SECRET)
    .update(body)
    .digest('base64');

  if (hash === signature) {
    // Process events
    console.log('Event received:', req.body);
    res.json({ status: 'ok' });
  } else {
    res.status(403).json({ error: 'Invalid signature' });
  }
});

app.get('/health', (req, res) => {
  res.json({ status: 'ok' });
});

module.exports = app;
```

### Step 6: Start Server
```bash
# Start development server
npx nodemon src/app.js

# Or use npm script
# Add to package.json: "start": "node src/app.js"
npm start
```

### Step 7: Setup Webhook URL
1. Deploy to public URL (Ngrok for testing)
   ```bash
   ngrok http 3000
   # Copy the https URL
   ```

2. In LINE Developer Console:
   - Go to Messaging API Settings
   - Set Webhook URL: `https://your-ngrok-url/webhook`
   - Enable Webhook
   - Verify connection (test button)

### Step 8: Add Bot as Friend
1. In LINE Developers Console
2. Find QR Code or Bot ID
3. Scan with LINE app
4. Say "Hi" to test

---

## 📱 Core Dialogs Mapping

### Infobip → LINE Conversion

| Infobip | LINE Implementation |
|---------|-------------------|
| `SEND_MESSAGE (text)` | `POST /api/v1/message` → `{ type: 'text', text: '...' }` |
| `SEND_MESSAGE (image)` | `POST /api/v1/message` → `{ type: 'image', originalContentUrl: '...' }` |
| `BUTTON` (postback buttons) | Template Message with button actions |
| `GET_ATTRIBUTE` (text input) | Receive text message in handler |
| `API_CALL` | Use axios to call banking API |
| `EVALUATE_ATTRIBUTE` | JavaScript conditions in handler |
| `GO_TO_DIALOG` | Set `newDialogState` in response |
| `SEND_TO_AGENT` | Send to queue or call center |
| `CSAT` | Flex message with rating buttons |

---

## 🔄 Complete Example: Check Balance Flow

### Infobip Flow (Visual)
```
Send OTP Dialog → Get Phone → API Call → Get OTP → Verify OTP → Get Balance → Display
```

### LINE Code Flow

**1. User taps "Check Balance"**
```javascript
// postbackHandler.js
async handlePostback(replyToken, userId, postback) {
  if (postback.data === 'action=check_balance') {
    await sessionService.updateDialogState(userId, 'CHECK_BALANCE');

    await lineService.replyMessage(replyToken, [{
      type: 'text',
      text: 'Enter your phone: +919876543210'
    }]);
  }
}
```

**2. User sends phone number**
```javascript
// messageHandler.js
async handleTextMessage(replyToken, userId, message) {
  const session = await sessionService.getSession(userId);
  const input = message.text;

  // Validate phone
  if (!validators.isValidPhone(input)) {
    return { messages: [{ type: 'text', text: 'Invalid format' }] };
  }

  // Send OTP
  const result = await bankingService.sendOTP(input);

  return {
    messages: [{
      type: 'text',
      text: 'OTP sent. Enter 6-digit code:'
    }],
    newDialogState: 'VERIFY_OTP',
    attributes: { phone: input }
  };
}
```

**3. User sends OTP**
```javascript
// Verify in next message handler
const otpResult = await bankingService.verifyOTP(phone, input);

if (otpResult.data.verified) {
  // Get balance
  const balanceResult = await bankingService.getBalance(phone);

  // Format response
  const template = templateService.getBalanceTemplate(balanceResult.data);

  return {
    messages: [template],
    newDialogState: 'SHOW_BALANCE',
    attributes: { ...balanceResult.data, isAuthenticated: true }
  };
}
```

---

## 🎨 Key LINE Message Types

### 1. Simple Text
```javascript
{
  type: 'text',
  text: 'Hello! How can I help?'
}
```

### 2. Buttons Template
```javascript
{
  type: 'template',
  altText: 'Select an option',
  template: {
    type: 'buttons',
    text: 'What would you like to do?',
    actions: [
      {
        type: 'postback',
        label: 'Check Balance',
        data: 'action=check_balance'
      },
      {
        type: 'postback',
        label: 'Card Services',
        data: 'action=card_services'
      }
    ]
  }
}
```

### 3. Flex Message (Rich Format)
```javascript
{
  type: 'flex',
  altText: 'Account Balance',
  contents: {
    type: 'bubble',
    body: {
      type: 'box',
      layout: 'vertical',
      contents: [
        {
          type: 'text',
          text: 'Balance: $5,000',
          weight: 'bold',
          size: 'xl'
        }
      ]
    }
  }
}
```

### 4. Carousel (Multiple Cards)
```javascript
{
  type: 'flex',
  altText: 'Your Cards',
  contents: {
    type: 'carousel',
    contents: [
      {
        type: 'bubble',
        body: { /* card 1 */ }
      },
      {
        type: 'bubble',
        body: { /* card 2 */ }
      }
    ]
  }
}
```

---

## 🔌 Banking API Quick Reference

### Authentication
```javascript
// Send OTP
POST /banking/auth/send-otp
{ "phone": "+919876543210" }
→ { "success": true, "data": { "expiresInMinutes": 5 } }

// Verify OTP
POST /banking/auth/verify-otp
{ "phone": "+919876543210", "otp": "123456" }
→ { "success": true, "data": { "verified": true, "customerName": "John" } }
```

### Queries
```javascript
// Get Balance
GET /banking/account/balance?phone=%2B919876543210
→ { "data": { "balance": 5000, "accountNumber": "123456", ... } }

// Get Mini Statement
GET /banking/account/mini-statement?phone=%2B919876543210&limit=5
→ { "data": { "transactions": [...] } }

// Get Cards
GET /banking/cards?phone=%2B919876543210
→ { "data": [{ "cardType": "Visa", "cardNumber": "****2345", ... }] }
```

### Card Operations
```javascript
// Block Card
POST /banking/cards/block
{ "phone": "+919876543210", "cardId": "123", "reason": "Lost" }
→ { "success": true, "data": { "status": "BLOCKED" } }

// Unblock Card
POST /banking/cards/unblock
{ "phone": "+919876543210", "cardId": "123" }
→ { "success": true, "data": { "cardNumber": "****2345" } }

// Report Lost
POST /banking/cards/report-lost
{ "phone": "+919876543210", "cardId": "123", "reason": "Lost" }
→ { "success": true, "data": { "blockTimestamp": "2026-02-10T12:00:00Z" } }

// Get Limits
GET /banking/cards/{cardId}/limits
→ { "data": { "dailyLimit": 5000, "monthlyLimit": 50000, ... } }
```

---

## 📋 Checklist: Building Each Feature

### ✅ Check Balance Feature
- [ ] Create `POST /webhook` handler for postback
- [ ] Create message handler for phone input
- [ ] Validate phone format
- [ ] Call `POST /auth/send-otp`
- [ ] Handle OTP input
- [ ] Call `POST /auth/verify-otp`
- [ ] Call `GET /account/balance`
- [ ] Format balance in Flex Message
- [ ] Handle "View Mini Statement" button
- [ ] Test end-to-end

### ✅ Card Services Feature
- [ ] Get phone from user
- [ ] Call `GET /banking/cards`
- [ ] Display cards in carousel
- [ ] Create card action menu (Block, Unblock, Report Lost, View Limits)
- [ ] Handle block card flow (get ID, get reason, API call)
- [ ] Handle unblock flow (get ID, confirm, API call)
- [ ] Handle report lost flow (get ID, confirm, API call)
- [ ] Handle view limits flow (get ID, API call, display)

### ✅ Session Management
- [ ] Create session on follow
- [ ] Store dialog state
- [ ] Store user attributes
- [ ] Auto-expire after 5 minutes
- [ ] Delete on unfollow
- [ ] Update last activity on each message

### ✅ Error Handling
- [ ] Invalid phone format → show error + retry
- [ ] API timeout → show generic error
- [ ] API error → don't expose details
- [ ] Session expired → ask to follow again
- [ ] Invalid OTP → allow retry

---

## 🧪 Testing Checklist

### Manual Testing
- [ ] Send text message
- [ ] Tap button
- [ ] Phone input validation
- [ ] OTP flow
- [ ] Balance display
- [ ] Mini statement
- [ ] Card list display
- [ ] Block card action
- [ ] Back to menu
- [ ] Session timeout

### Test Cases
```bash
# Test phone input
Send: "919876543210"
→ Should fail (missing +)

Send: "+919876543210"
→ Should send OTP

# Test OTP
Send: "12345"
→ Should fail (5 digits)

Send: "123456"
→ Should verify and show balance

# Test card operations
Send: "123" (card ID)
→ Should block/unblock/show limits
```

---

## 🐛 Debugging Tips

### Enable Logging
```javascript
// In .env
LOG_LEVEL=debug

// In code
logger.debug('Dialog state:', session.dialogState);
logger.debug('Attributes:', session.attributes);
```

### Check Webhook Signature
```bash
# Use ngrok to monitor requests
ngrok inspect
# View all webhook requests here
```

### Test API Directly
```bash
# Test send OTP
curl -X POST https://password-reset.lab.bravishma.com:6507/api/v1/banking/auth/send-otp \
  -H "Content-Type: application/json" \
  -d '{"phone":"+919876543210"}'

# Test verify OTP
curl -X POST https://password-reset.lab.bravishma.com:6507/api/v1/banking/auth/verify-otp \
  -H "Content-Type: application/json" \
  -d '{"phone":"+919876543210","otp":"123456"}'
```

### Common Issues

**Issue**: "Cannot POST /webhook"
- **Solution**: Make sure endpoint matches in LINE console

**Issue**: "Signature validation failed"
- **Solution**: Check Channel Secret is correct

**Issue**: "User not found"
- **Solution**: Make sure user followed bot first

**Issue**: "OTP expired"
- **Solution**: OTP is valid for 5 minutes only

**Issue**: "API timeout"
- **Solution**: Check BANKING_API_BASE_URL is correct and accessible

---

## 📚 File Structure Reference

```
fabl-line-banking-bot/
├── src/
│   ├── app.js                    ← Express app
│   ├── server.js                 ← Server startup
│   ├── config/
│   │   └── lineConfig.js
│   ├── controllers/
│   │   └── webhookController.js  ← Event handler
│   ├── handlers/
│   │   ├── messageHandler.js     ← Text messages
│   │   └── postbackHandler.js    ← Button actions
│   ├── services/
│   │   ├── lineService.js        ← LINE SDK wrapper
│   │   ├── bankingService.js     ← API calls
│   │   ├── sessionService.js     ← User sessions
│   │   └── templateService.js    ← Message templates
│   ├── middleware/
│   │   └── errorHandler.js
│   ├── utils/
│   │   ├── logger.js
│   │   └── validators.js
│   └── templates/
│       ├── welcomeTemplate.js
│       ├── balanceTemplate.js
│       └── cardsTemplate.js
├── .env                          ← Credentials
├── .env.example                  ← Template
├── package.json
└── README.md
```

---

## 🎯 Next Steps After Setup

1. **Understand Existing Banking API**
   - Read `D:\DemoProjectsBackend\hotelbookingbackend\API-Documentation.md`
   - Test each endpoint with curl/Postman

2. **Build Dialog Manager**
   - Map all Infobip dialogs to LINE flows
   - Create state machine
   - Test each state transition

3. **Create Message Templates**
   - Design Flex messages for each response
   - Use LINE Flex Message Designer
   - Test rendering on LINE app

4. **Implement Error Handling**
   - Handle all API errors gracefully
   - Implement retry logic
   - Create fallback messages

5. **Deploy to Production**
   - Use env variables for credentials
   - Set up monitoring and logging
   - Configure rate limiting
   - Enable HTTPS

---

## 📞 Resources

- [LINE Messaging API Docs](https://developers.line.biz/en/services/messaging-api/)
- [LINE Bot SDK (Node.js)](https://github.com/line/line-bot-sdk-nodejs)
- [Flex Message Designer](https://flex-simulator.line.biz/)
- [Banking API Reference](./LINE_BANKING_CHATBOT_IMPLEMENTATION.md)
- [Code Templates](./LINE_IMPLEMENTATION_CODE_TEMPLATES.md)

---

## ✨ Pro Tips

1. **Use Flex Message Designer**: Design rich messages visually, copy JSON
2. **Test with ngrok**: Easy local testing without deployment
3. **Enable debug logging**: See exactly what's happening
4. **Use postback data for actions**: More reliable than keyword matching
5. **Always validate user input**: Phone format, OTP length, card ID
6. **Implement session timeout**: Security best practice
7. **Use HTTPS everywhere**: LINE requires secure webhooks
8. **Keep error messages simple**: Don't expose API details to users

---

**Version**: 1.0 | **Updated**: 2026-02-10 | **Difficulty**: Intermediate
