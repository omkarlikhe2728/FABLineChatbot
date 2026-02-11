# LINE Banking Chatbot Implementation Guide
**FAB Bank - LINE Messaging API Integration**

---

## 📋 Table of Contents
1. [Overview](#overview)
2. [Architecture Comparison](#architecture-comparison)
3. [Bot Flow Diagrams](#bot-flow-diagrams)
4. [LINE-Specific Integration](#line-specific-integration)
5. [Backend API Integration](#backend-api-integration)
6. [Message Templates & Types](#message-templates--types)
7. [Implementation Roadmap](#implementation-roadmap)
8. [Security & Best Practices](#security--best-practices)

---

## 🎯 Overview

### Current State: Infobip WhatsApp Bot
- **Platform**: WhatsApp
- **Bot Name**: Banking Assistant(FAB)Bot
- **Channel**: WHATSAPP
- **Features**:
  - OTP-based authentication
  - Check balance & mini statement
  - Card services (block, unblock, report lost, view limits)
  - Live chat handoff
  - Session management with CSAT

### Target State: LINE Banking Bot
- **Platform**: LINE Messaging API
- **Advantages over WhatsApp**:
  - Better rich media support (Flex Messages, Carousel)
  - Richer interactive elements
  - Better analytics
  - In-app experience without leaving LINE
  - Lower per-message costs

---

## 🏗️ Architecture Comparison

### Infobip Architecture (WhatsApp)
```
User (WhatsApp)
    ↓
Infobip Platform
    ↓
Dialog Flow (Visual Editor)
    ↓
Backend API (Node.js)
    ↓
Database
```

### Recommended LINE Architecture
```
User (LINE App)
    ↓
LINE Messaging API
    ↓
Your Backend (Node.js/Express)
    ↓
Dialog Manager (Custom or Third-party)
    ↓
Banking API (hotelbookingbackend)
    ↓
Database
```

---

## 🔄 Bot Flow Diagrams

### Main Flow
```
START
  ↓
[Welcome Message with Image]
  ↓
[Delay 1s]
  ↓
MAIN MENU DIALOG
  ├─ Check Balance
  ├─ Card Services
  ├─ Live Chat
  └─ End Session
```

### Check Balance Flow
```
MAIN MENU (Check Balance)
  ↓
[Get Phone Number Input]
  ↓
[API: Send OTP]
  ↓
[Get OTP Input]
  ↓
[API: Verify OTP]
  ↓
AUTHENTICATE
  ├─ Success → [API: Get Balance]
  │  ↓
  │  [Display Balance]
  │  ↓
  │  [Options: Mini Statement / Back to Menu]
  │  ↓
  │  [Get User Input]
  │
  └─ Failure → [Invalid OTP Message]
     ↓
     [Retry OTP]
```

### Card Services Flow
```
MAIN MENU (Card Services)
  ↓
[Get Phone Number]
  ↓
[API: Get Cards List]
  ↓
[Display Cards]
  ↓
[Show Card Actions List]
  │
  ├─ Block Card
  │  ├─ [Get Card ID]
  │  ├─ [Get Block Reason]
  │  ├─ [API: Block Card]
  │  └─ [Show Result]
  │
  ├─ Unblock Card
  │  ├─ [Get Card ID]
  │  ├─ [Confirmation]
  │  ├─ [API: Unblock Card]
  │  └─ [Show Result]
  │
  ├─ Report Lost Card
  │  ├─ [Get Card ID]
  │  ├─ [Get Last Location]
  │  ├─ [Confirmation]
  │  ├─ [API: Report Lost]
  │  └─ [Show Result]
  │
  └─ View Card Limits
     ├─ [Get Card ID]
     ├─ [API: Get Card Limits]
     └─ [Display Limits]
```

---

## 📱 LINE-Specific Integration

### 1. LINE Messaging API Setup

#### Prerequisites
- LINE Business Account
- Messaging API Channel
- Channel ID and Channel Secret
- Channel Access Token

#### Environment Setup
```env
# .env
LINE_CHANNEL_ID=your_channel_id
LINE_CHANNEL_SECRET=your_channel_secret
LINE_ACCESS_TOKEN=your_access_token

# Backend APIs
BANKING_API_BASE_URL=https://password-reset.lab.bravishma.com:6507/api/v1
BANKING_API_TIMEOUT=5000

# Session Management
SESSION_TIMEOUT=300000  # 5 minutes
```

### 2. LINE Message Types Mapping

#### Infobip → LINE Message Conversion

| Infobip Type | Description | LINE Equivalent |
|--------------|-------------|-----------------|
| SEND_WHATSAPP (Text) | Simple text message | Text Message |
| SEND_WHATSAPP (Image) | Image with caption | Image Message + Text |
| BUTTON (Quick Reply) | Buttons at bottom | Quick Reply Buttons |
| LIST_PICKER | List of options | Template Message (Buttons) or Flex Message |
| SEND_TO_AGENT | Handoff to agent | Transfer to Rich Menu or Queue |
| CSAT | Customer satisfaction | Flex Message with Ratings |

### 3. LINE Rich Message Examples

#### Welcome Message (Flex Message)
```json
{
  "type": "flex",
  "altText": "Welcome to FAB Bank",
  "contents": {
    "type": "bubble",
    "hero": {
      "type": "image",
      "url": "https://www.bankfab.com/-/media/fab-uds/personal/promotions/2025/mclaren-f1-cards-offer/mclaren-homepage-banner-en.jpg",
      "size": "full",
      "aspectRatio": "20:13",
      "aspectMode": "cover"
    },
    "body": {
      "type": "box",
      "layout": "vertical",
      "contents": [
        {
          "type": "text",
          "text": "Welcome to FAB Bank!",
          "weight": "bold",
          "size": "xl"
        },
        {
          "type": "text",
          "text": "I'm your banking assistant 🏦",
          "size": "sm",
          "color": "#999999",
          "margin": "md"
        }
      ]
    }
  }
}
```

#### Main Menu (Template Message with Quick Reply)
```json
{
  "type": "template",
  "altText": "Select an option",
  "template": {
    "type": "buttons",
    "text": "Please select an option",
    "actions": [
      {
        "type": "postback",
        "label": "💳 Check Balance",
        "data": "action=check_balance"
      },
      {
        "type": "postback",
        "label": "💰 Card Services",
        "data": "action=card_services"
      },
      {
        "type": "postback",
        "label": "💬 Live Chat",
        "data": "action=live_chat"
      }
    ]
  }
}
```

#### Balance Display (Flex Message)
```json
{
  "type": "flex",
  "altText": "Your Account Balance",
  "contents": {
    "type": "bubble",
    "body": {
      "type": "box",
      "layout": "vertical",
      "contents": [
        {
          "type": "text",
          "text": "💰 Account Balance",
          "weight": "bold",
          "size": "xl",
          "margin": "md"
        },
        {
          "type": "separator",
          "margin": "md"
        },
        {
          "type": "box",
          "layout": "vertical",
          "margin": "md",
          "spacing": "sm",
          "contents": [
            {
              "type": "box",
              "layout": "baseline",
              "contents": [
                {
                  "type": "text",
                  "text": "Name:",
                  "color": "#aaaaaa",
                  "size": "sm",
                  "flex": 2
                },
                {
                  "type": "text",
                  "text": "{{customerName}}",
                  "wrap": true,
                  "color": "#666666",
                  "size": "sm",
                  "flex": 3
                }
              ]
            },
            {
              "type": "box",
              "layout": "baseline",
              "contents": [
                {
                  "type": "text",
                  "text": "Account:",
                  "color": "#aaaaaa",
                  "size": "sm",
                  "flex": 2
                },
                {
                  "type": "text",
                  "text": "{{accountNumber}}",
                  "wrap": true,
                  "color": "#666666",
                  "size": "sm",
                  "flex": 3
                }
              ]
            },
            {
              "type": "box",
              "layout": "baseline",
              "contents": [
                {
                  "type": "text",
                  "text": "Type:",
                  "color": "#aaaaaa",
                  "size": "sm",
                  "flex": 2
                },
                {
                  "type": "text",
                  "text": "{{accountType}}",
                  "wrap": true,
                  "color": "#666666",
                  "size": "sm",
                  "flex": 3
                }
              ]
            },
            {
              "type": "box",
              "layout": "baseline",
              "contents": [
                {
                  "type": "text",
                  "text": "Balance:",
                  "color": "#aaaaaa",
                  "size": "sm",
                  "flex": 2,
                  "weight": "bold"
                },
                {
                  "type": "text",
                  "text": "${{balance}}",
                  "wrap": true,
                  "color": "#27ae60",
                  "size": "lg",
                  "flex": 3,
                  "weight": "bold"
                }
              ]
            }
          ]
        },
        {
          "type": "separator",
          "margin": "md"
        }
      ]
    },
    "footer": {
      "type": "box",
      "layout": "vertical",
      "spacing": "sm",
      "contents": [
        {
          "type": "button",
          "style": "link",
          "height": "sm",
          "action": {
            "type": "postback",
            "label": "View Mini Statement",
            "data": "action=view_mini_statement"
          }
        },
        {
          "type": "button",
          "style": "link",
          "height": "sm",
          "action": {
            "type": "postback",
            "label": "Back to Menu",
            "data": "action=back_to_menu"
          }
        }
      ]
    }
  }
}
```

#### Card Services (Flex Carousel)
```json
{
  "type": "flex",
  "altText": "Your Cards",
  "contents": {
    "type": "carousel",
    "contents": [
      {
        "type": "bubble",
        "body": {
          "type": "box",
          "layout": "vertical",
          "contents": [
            {
              "type": "text",
              "text": "Visa Card",
              "weight": "bold",
              "size": "lg"
            },
            {
              "type": "box",
              "layout": "baseline",
              "margin": "md",
              "contents": [
                {
                  "type": "text",
                  "text": "Card No:",
                  "color": "#aaaaaa",
                  "size": "sm",
                  "flex": 1
                },
                {
                  "type": "text",
                  "text": "****2345",
                  "wrap": true,
                  "color": "#666666",
                  "size": "sm",
                  "flex": 2
                }
              ]
            },
            {
              "type": "box",
              "layout": "baseline",
              "margin": "sm",
              "contents": [
                {
                  "type": "text",
                  "text": "Expiry:",
                  "color": "#aaaaaa",
                  "size": "sm",
                  "flex": 1
                },
                {
                  "type": "text",
                  "text": "12/25",
                  "wrap": true,
                  "color": "#666666",
                  "size": "sm",
                  "flex": 2
                }
              ]
            },
            {
              "type": "box",
              "layout": "baseline",
              "margin": "sm",
              "contents": [
                {
                  "type": "text",
                  "text": "Status:",
                  "color": "#aaaaaa",
                  "size": "sm",
                  "flex": 1
                },
                {
                  "type": "text",
                  "text": "ACTIVE",
                  "wrap": true,
                  "color": "#27ae60",
                  "size": "sm",
                  "flex": 2,
                  "weight": "bold"
                }
              ]
            },
            {
              "type": "box",
              "layout": "baseline",
              "margin": "sm",
              "contents": [
                {
                  "type": "text",
                  "text": "Limit:",
                  "color": "#aaaaaa",
                  "size": "sm",
                  "flex": 1
                },
                {
                  "type": "text",
                  "text": "$5,000",
                  "wrap": true,
                  "color": "#666666",
                  "size": "sm",
                  "flex": 2
                }
              ]
            }
          ]
        }
      }
    ]
  }
}
```

---

## 🔌 Backend API Integration

### Current Backend Structure
```
D:\DemoProjectsBackend\hotelbookingbackend
├── src/
│   ├── controllers/
│   │   └── bankingController.js (Banking operations)
│   ├── routes/
│   │   └── banking.js (Banking API endpoints)
│   ├── models/ (Database schemas)
│   ├── services/ (Business logic)
│   ├── middleware/ (Authentication, validation)
│   └── utils/ (Helpers)
├── API-Documentation.md
└── package.json
```

### Banking API Endpoints Reference

#### Authentication
```
POST /api/v1/banking/auth/send-otp
- Send OTP to phone
- Request: { "phone": "+919876543210" }
- Response: { "success": true, "data": { "expiresInMinutes": 5 }, "message": "OTP sent" }

POST /api/v1/banking/auth/verify-otp
- Verify OTP
- Request: { "phone": "+919876543210", "otp": "123456" }
- Response: { "success": true, "data": { "verified": true, "customerName": "John Doe" }, "message": "OTP verified" }
```

#### Account Operations
```
GET /api/v1/banking/account/balance?phone=%2B919876543210
- Get account balance
- Response: { "success": true, "data": { "accountNumber": "123456789", "balance": 5000, "currency": "USD", "accountType": "Savings", "customerName": "John Doe" } }

GET /api/v1/banking/account/mini-statement?phone=%2B919876543210&limit=5
- Get last N transactions
- Response: { "success": true, "data": { "transactions": [...] } }
```

#### Card Operations
```
GET /api/v1/banking/cards?phone=%2B919876543210
- Get all cards
- Response: { "success": true, "data": [{ "cardType": "Visa", "cardNumber": "****2345", ... }] }

POST /api/v1/banking/cards/block
- Block a card
- Request: { "phone": "+919876543210", "cardId": "123", "reason": "Lost" }
- Response: { "success": true, "data": { "status": "BLOCKED" } }

POST /api/v1/banking/cards/unblock
- Unblock a card
- Request: { "phone": "+919876543210", "cardId": "123" }
- Response: { "success": true, "data": { "cardNumber": "****2345" } }

POST /api/v1/banking/cards/report-lost
- Report card as lost
- Request: { "phone": "+919876543210", "cardId": "123", "reason": "Lost wallet" }
- Response: { "success": true, "data": { "blockTimestamp": "2026-02-10T12:00:00Z" } }

GET /api/v1/banking/cards/{cardId}/limits
- Get card limits
- Response: { "success": true, "data": { "dailyLimit": 5000, "monthlyLimit": 50000, "atmLimit": 2000, "posLimit": 5000 } }
```

---

## 💬 Message Templates & Types

### Input/Output Mapping

#### Phone Number Input
```
LINE Input: User types phone number
Processing: Validate format (+1-15 digits)
Validation: Check if valid international format
Storage: attributeId: 935981 (phone)
API Call: POST /auth/send-otp with {phone: "+{{phone}}"}
```

#### OTP Input
```
LINE Input: User types 6-digit OTP
Processing: Trim whitespace
Validation: Must be exactly 6 digits
Storage: attributeId: 970417 (otp)
API Call: POST /auth/verify-otp with {phone, otp}
```

#### Button Selection
```
LINE Input: User taps postback button
PostBack Data: action=check_balance
Processing: Route to appropriate dialog
No validation needed
Direct action trigger
```

---

## 🚀 Implementation Roadmap

### Phase 1: Infrastructure Setup (Week 1)
- [ ] Set up LINE Business Account
- [ ] Create Messaging API Channel
- [ ] Get Channel Credentials (ID, Secret, Access Token)
- [ ] Set up webhook endpoint
- [ ] Configure environment variables

### Phase 2: Core Backend Implementation (Week 2)
- [ ] Create LINE webhook receiver endpoint
- [ ] Implement event handling (message, postback, follow)
- [ ] Implement session management
- [ ] Create state machine for dialog flow
- [ ] Integrate with existing banking APIs

### Phase 3: Dialog Implementation (Week 3)
- [ ] Welcome flow
- [ ] Main menu
- [ ] Check balance dialog
- [ ] Card services dialog
- [ ] OTP authentication
- [ ] Error handling

### Phase 4: Rich Messages (Week 4)
- [ ] Flex message templates
- [ ] Carousel cards for card listing
- [ ] Button styling and actions
- [ ] Image handling

### Phase 5: Testing & Deployment (Week 5)
- [ ] Unit tests for handlers
- [ ] Integration tests with backend APIs
- [ ] User acceptance testing
- [ ] Performance testing
- [ ] Production deployment

---

## 📦 Project Structure for LINE Bot

```
fabl-line-banking-bot/
├── src/
│   ├── config/
│   │   ├── lineConfig.js (LINE SDK configuration)
│   │   └── env.js (Environment variables)
│   ├── controllers/
│   │   ├── webhookController.js (LINE event handler)
│   │   ├── dialogController.js (Dialog state management)
│   │   └── bankingController.js (Banking operations)
│   ├── handlers/
│   │   ├── messageHandler.js (Text message handling)
│   │   ├── postbackHandler.js (Button/action handling)
│   │   └── eventHandler.js (Follow, unfollow, etc.)
│   ├── services/
│   │   ├── lineService.js (LINE API integration)
│   │   ├── bankingService.js (Banking API calls)
│   │   ├── sessionService.js (Session/state management)
│   │   └── templateService.js (Message template builder)
│   ├── middleware/
│   │   ├── lineSignature.js (LINE signature validation)
│   │   └── errorHandler.js (Global error handling)
│   ├── utils/
│   │   ├── logger.js
│   │   ├── validators.js
│   │   └── formatters.js
│   ├── templates/
│   │   ├── welcomeTemplate.js
│   │   ├── balanceTemplate.js
│   │   ├── cardsTemplate.js
│   │   └── errorTemplate.js
│   ├── app.js (Express app)
│   └── server.js (Server startup)
├── tests/
│   ├── unit/
│   ├── integration/
│   └── fixtures/
├── .env
├── .env.example
├── package.json
└── README.md
```

---

## 🛡️ Security & Best Practices

### 1. LINE Signature Validation
```javascript
// Every incoming webhook must be validated
const crypto = require('crypto');

function validateLineSignature(body, signature) {
  const hash = crypto
    .createHmac('sha256', CHANNEL_SECRET)
    .update(body)
    .digest('base64');

  return hash === signature;
}
```

### 2. Sensitive Data Handling
- **Never log phone numbers, OTPs, or personal data**
- **Use database encryption for stored phone numbers**
- **Mask card numbers in displays (last 4 digits only)**
- **Use HTTPS for all API calls**
- **Validate all inputs server-side**

### 3. Rate Limiting
```javascript
// Prevent abuse
app.use(rateLimit({
  windowMs: 15 * 60 * 1000, // 15 minutes
  max: 100, // limit each IP to 100 requests per windowMs
  message: 'Too many requests from this IP'
}));
```

### 4. Session Security
- Session timeout: 5 minutes (as per Infobip config)
- Use secure session tokens
- Clear session data on logout
- Implement re-authentication for sensitive operations

### 5. API Security
- Use API gateway/rate limiting
- Implement request signing
- Use CORS properly
- Validate phone number format
- Implement OTP expiry (5 minutes)

### 6. Error Handling
- **Don't expose backend errors to users**
- Use generic error messages
- Log detailed errors server-side
- Implement fallback to live chat agent

---

## 🔐 Database Schema Considerations

### Session Storage
```javascript
{
  userId: String (LINE user ID),
  phone: String (encrypted),
  sessionToken: String,
  dialogState: String (current_dialog_name),
  attributes: {
    phone: String,
    otp: String,
    isAuthenticated: Boolean,
    customerName: String,
    accountNumber: String,
    balance: Number,
    cardId: String,
    ... (other form fields)
  },
  createdAt: DateTime,
  expiresAt: DateTime (5 minutes from creation),
  lastActivity: DateTime
}
```

---

## 📊 Sample Request/Response Flows

### Complete Check Balance Flow

**1. User sends "Check Balance"**
```
User Input → LINE Postback
{
  "type": "postback",
  "postback": {
    "data": "action=check_balance"
  }
}
```

**2. Bot requests phone number**
```
Bot Response → TEXT + QUICK REPLY
"Please enter your registered phone number (e.g., 919876543210)"
```

**3. User enters phone**
```
User Input → TEXT MESSAGE
"+919876543210"
```

**4. Bot validates & calls Send OTP API**
```
Backend → Banking API
POST /api/v1/banking/auth/send-otp
{
  "phone": "+919876543210"
}

Response:
{
  "success": true,
  "data": {
    "expiresInMinutes": 5
  },
  "message": "OTP sent successfully"
}
```

**5. Bot asks for OTP**
```
Bot Response → TEXT MESSAGE
"OTP has been sent to your registered phone. Valid for 5 minutes."
"Please enter the 6-digit OTP:"
```

**6. User enters OTP**
```
User Input → TEXT MESSAGE
"123456"
```

**7. Bot verifies OTP**
```
Backend → Banking API
POST /api/v1/banking/auth/verify-otp
{
  "phone": "+919876543210",
  "otp": "123456"
}

Response:
{
  "success": true,
  "data": {
    "verified": true,
    "customerName": "John Doe"
  }
}
```

**8. Bot fetches balance**
```
Backend → Banking API
GET /api/v1/banking/account/balance?phone=%2B919876543210

Response:
{
  "success": true,
  "data": {
    "accountNumber": "123456789",
    "balance": 5000.00,
    "currency": "USD",
    "accountType": "Savings",
    "customerName": "John Doe"
  }
}
```

**9. Bot displays balance with Flex Message**
```
Bot Response → FLEX MESSAGE
{
  "type": "flex",
  "altText": "Your Account Balance",
  "contents": { ... (as shown in templates section) ... }
}
```

**10. User selects "View Mini Statement"**
```
Backend → Banking API
GET /api/v1/banking/account/mini-statement?phone=%2B919876543210&limit=5

Response:
{
  "success": true,
  "data": {
    "transactions": [
      {
        "date": "2026-02-10",
        "description": "Grocery store purchase",
        "amount": 50.00,
        "type": "DEBIT"
      },
      ...
    ]
  }
}
```

**11. Bot displays transactions**
```
Bot Response → TEXT MESSAGE
"Last 5 Transactions:
1. 2026-02-10 - Grocery store - $50.00
2. 2026-02-09 - Restaurant - $35.00
..."
```

---

## 🔧 Implementation Notes

### Key Differences from Infobip
1. **No Visual Dialog Editor**: Use code-based dialog management
2. **Different Message Format**: Follow LINE SDK patterns
3. **Rich Messages**: Use Flex Messages instead of generic templates
4. **Postback Data**: Use structured data attributes
5. **User IDs**: LINE uses unique user IDs instead of phone numbers

### Migration Checklist
- [ ] Translate all Infobip dialogs to LINE-compatible flows
- [ ] Convert WhatsApp message formats to LINE templates
- [ ] Implement session management (not built-in like Infobip)
- [ ] Create state machine for dialog flow
- [ ] Implement all error scenarios
- [ ] Add comprehensive logging
- [ ] Set up monitoring and alerts

### Testing Strategy
1. **Unit Tests**: Dialog logic, API calls
2. **Integration Tests**: Full flow with mock banking API
3. **User Acceptance Testing**: Real LINE bot with test numbers
4. **Load Testing**: Concurrent users
5. **Security Testing**: Input validation, auth bypass attempts

---

## 📱 LINE-Specific Features to Leverage

1. **Rich Menu**: Persistent menu at bottom of chat
2. **Flex Messages**: Complex, visually appealing layouts
3. **Carousel**: Multi-card display for card listings
4. **Buttons**: Interactive action buttons
5. **Quick Reply**: Fast response options
6. **URI Actions**: Deep linking to web pages
7. **Rich Menu**: Customizable persistent menu
8. **LIFF**: LINE Front-end Framework for web integration

---

## 🚨 Error Handling Strategy

```
User Action
    ↓
Validation
    ├─ Invalid Format → User message + Retry
    ├─ Invalid Input → User message + Retry
    └─ Valid ↓
API Call
    ├─ Timeout → "Service temporarily unavailable. Try again?"
    ├─ Error → "We encountered an issue. Please try again later"
    ├─ Network Error → "Connection error. Retrying..."
    └─ Success ↓
Display Result
    ↓
Next Action Options
```

---

## 📈 Monitoring & Analytics

### Key Metrics to Track
- Message volume by type
- Dialog completion rates
- Authentication success rate
- API response times
- Error rates by endpoint
- User retention
- Session duration

### Logging Levels
```
ERROR: API failures, authentication failures, system errors
WARN: Retries, validation failures, slow responses
INFO: User actions, dialog transitions, API calls
DEBUG: Variable states, detailed flow information
```

---

## 💡 Next Steps

1. **Create LINE Developer Account** and get channel credentials
2. **Review Banking API Documentation** in `/DemoProjectsBackend/hotelbookingbackend/API-Documentation.md`
3. **Clone Backend Repository** and understand current implementation
4. **Design Dialog State Machine** with all possible states and transitions
5. **Build Message Template Library** for all user-facing messages
6. **Implement Webhook Handler** to receive LINE events
7. **Create Service Layer** for Banking API integration
8. **Build Dialog Manager** to handle multi-step conversations
9. **Test End-to-End** flows with actual LINE app
10. **Deploy to Production** with proper monitoring

---

## 📞 Support & References

- [LINE Messaging API Documentation](https://developers.line.biz/en/services/messaging-api/)
- [LINE SDK for Node.js](https://github.com/line/line-bot-sdk-nodejs)
- [Flex Message Designer](https://flex-simulator.line.biz/)
- [Banking API Docs](./banking-api-endpoints.md)

---

**Last Updated**: 2026-02-10
**Version**: 1.0
