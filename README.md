# FABLineChatbot - Multi-Platform Bot Framework 🤖

A complete multi-platform chatbot framework supporting **LINE**, **Microsoft Teams**, and **Telegram** with banking services, hotel concierge, airline reservations, and IT support solutions.

## 📚 Documentation

**All documentation has been moved to the `docs/` folder!**

👉 **[Start here: docs/README.md](./docs/README.md)** - Complete documentation index

### Quick Links
- 🚀 [Quick Start Guide](./docs/QUICK_START_GUIDE.md) - Launch in 5 minutes
- 📖 [Implementation Summary](./docs/IMPLEMENTATION_SUMMARY.md) - Project overview
- 🔍 [Quick Reference](./docs/QUICK_REFERENCE.md) - Common commands and APIs
- 🧪 [Testing Guide](./docs/TESTING_GUIDE.md) - Test all bots

## 🌐 Supported Platforms & Bots

### LINE Messaging API
- **FAB Bank** - Banking services (balance, cards, transactions)
- **Sands Hotel** - Hotel concierge services
- **ANA Airline** - Airline reservation services

### Microsoft Teams
- **FAB Bank Bot** - Banking services for Teams
- **IT Support Bot** - IT support ticketing system

### Telegram
- **FAB Bank Bot** - Banking services for Telegram

## ✨ Features

- **🔐 Secure Authentication**: OTP-based phone number verification
- **💰 Balance Inquiry**: View account balance, account details, and currency
- **💳 Card Services**:
  - View all cards with status
  - Block/unblock cards
  - Report lost cards
  - View card spending limits
- **📊 Transaction History**: View last 5 transactions with formatted dates and amounts
- **⏱️ Session Management**: Auto-timeout after 5 minutes of inactivity
- **🛡️ Security**: Rate limiting, input validation, signature verification
- **📝 Rich Logging**: Detailed logs for debugging and monitoring
- **✅ Comprehensive Testing**: 35+ unit and integration tests

## 🚀 Quick Start

### Prerequisites
- Node.js 14+
- npm 6+
- LINE Messaging API Channel (created in LINE Developers Console)

### Installation

```bash
# Clone or download repository
cd fab-line-banking-bot

# Install dependencies
npm install

# Configure environment variables
# Copy .env.example to .env and fill in your LINE credentials
cp .env.example .env
```

### Running

```bash
# Development mode (with auto-reload)
npm run dev

# Production mode
npm start

# Run tests
npm test
```

### LINE Setup

1. Create Messaging API Channel in [LINE Developers Console](https://developers.line.biz/console/)
2. Copy credentials to `.env`:
   ```env
   LINE_CHANNEL_ID=your_channel_id
   LINE_CHANNEL_SECRET=your_channel_secret
   LINE_ACCESS_TOKEN=your_access_token
   ```
3. Set webhook URL in LINE Console: `https://your-domain.com/webhook`
4. Enable webhook in LINE Console settings

## 📋 Usage Examples

### Balance Check Flow
```
User: Tap "Check Balance"
Bot:  Enter phone number
User: 9876543210
Bot:  OTP sent! Enter 6-digit code
User: 123456
Bot:  💰 Balance: $5,000.00 USD
```

### Card Management Flow
```
User: Tap "Card Services"
Bot:  Enter phone number
User: +919876543210
Bot:  Shows all cards in carousel
User: Tap "Block Card"
Bot:  Enter card ID
User: CARD123
Bot:  ✅ Card blocked successfully!
```

## 📁 Project Structure

```
src/
├── app.js                 # Express application
├── server.js              # Server entry point
├── controllers/           # Request handlers
├── handlers/              # LINE event handlers (message, postback)
├── middleware/            # Express middleware
├── services/              # Business logic
│   ├── bankingService.js         # Banking API client
│   ├── dialogManager.js          # Conversation flow
│   ├── lineService.js            # LINE SDK wrapper
│   ├── sessionService.js         # User session management
│   └── templateService.js        # Rich message templates
├── utils/                 # Utilities
│   ├── logger.js                 # Logging
│   └── validators.js             # Input validation
└── templates/             # Message templates (for Flex messages)

tests/
├── unit/                  # Unit tests
└── integration/           # Integration tests
```

## 🧪 Testing

```bash
# Run all tests
npm test

# Run specific test file
npm test tests/unit/validators.test.js

# Run with coverage
npm test -- --coverage

# Watch mode
npm test -- --watch
```

**Test Coverage:**
- ✅ 14 Validator tests
- ✅ 9 Session Service tests
- ✅ 12 Dialog Flow tests
- **Total: 35+ tests passing**

## 🔧 Configuration

### Environment Variables

```env
# LINE Messaging API
LINE_CHANNEL_ID=your_channel_id
LINE_CHANNEL_SECRET=your_channel_secret
LINE_ACCESS_TOKEN=your_access_token

# Server
PORT=3000
NODE_ENV=development

# Banking API
BANKING_API_BASE_URL=https://password-reset.lab.bravishma.com:6507/api/v1
BANKING_API_TIMEOUT=5000

# Session
SESSION_TIMEOUT=300000  # 5 minutes

# Logging
LOG_LEVEL=info
```

## 🔒 Security Features

- **Signature Validation**: All webhook requests verified using HMAC-SHA256
- **Rate Limiting**: Max 30 requests per minute per user
- **Input Validation**: Phone numbers, OTP codes, and all user inputs validated
- **Input Sanitization**: XSS prevention through HTML tag and quote removal
- **Sensitive Data Masking**: Phone numbers masked in logs
- **Session Timeout**: Auto-expire sessions after 5 minutes
- **HTTPS Only**: Webhook endpoint requires SSL/HTTPS

## 📊 API Integration

The bot integrates with FAB Bank's banking API endpoints:

```
POST   /banking/auth/send-otp           # Send OTP to phone
POST   /banking/auth/verify-otp         # Verify OTP code
GET    /banking/account/balance         # Get account balance
GET    /banking/cards                   # Get all cards
POST   /banking/cards/block             # Block a card
POST   /banking/cards/unblock           # Unblock a card
POST   /banking/cards/report-lost       # Report lost card
GET    /banking/cards/{id}/limits       # Get card limits
GET    /banking/account/mini-statement  # Get transactions
```

## 📚 Documentation

- [IMPLEMENTATION_PHASES.md](./IMPLEMENTATION_PHASES.md) - Detailed implementation guide for all 9 phases
- [DEPLOYMENT_GUIDE.md](./DEPLOYMENT_GUIDE.md) - Complete deployment and testing guide
- [QUICK_START_GUIDE.md](./QUICK_START_GUIDE.md) - 5-minute quick start

## 🚀 Deployment

### Heroku
```bash
heroku create fab-banking-bot
heroku config:set LINE_CHANNEL_ID=xxx
git push heroku main
```

### Docker
```bash
docker build -t fab-banking-bot .
docker run -p 3000:3000 --env-file .env fab-banking-bot
```

### AWS Lambda
```bash
sam deploy
```

### Self-hosted
```bash
npm install -g pm2
pm2 start src/server.js --name "fab-banking-bot"
```

See [DEPLOYMENT_GUIDE.md](./DEPLOYMENT_GUIDE.md) for detailed instructions.

## 🐛 Troubleshooting

### Bot not responding?
1. Check server: `npm run dev`
2. Verify webhook URL in LINE Console
3. Check logs: `tail -f logs/error.log`

### OTP not being sent?
1. Verify banking API URL in `.env`
2. Check API connectivity: `curl https://...`
3. Verify phone format: `+91` prefix required

### Session timing out too quickly?
Edit `.env`: `SESSION_TIMEOUT=600000`

See [DEPLOYMENT_GUIDE.md](./DEPLOYMENT_GUIDE.md) for more troubleshooting.

## 📈 Monitoring

Bot logs are saved to `logs/` directory:
- `info.log` - General information
- `error.log` - Errors
- `debug.log` - Debug info
- `warn.log` - Warnings

Check bot health:
```bash
curl http://localhost:3000/health
```

## 📝 Implementation Summary

✅ **Phase 1**: Infrastructure & Setup
✅ **Phase 2**: Core Webhook & Session Management
✅ **Phase 3**: Authentication System
✅ **Phase 4**: Check Balance Feature
✅ **Phase 5**: Card Services Feature
✅ **Phase 6**: Mini Statement & Transactions
✅ **Phase 7**: Rich Message Templates
✅ **Phase 8**: Error Handling & Logging
✅ **Phase 9**: Testing & Deployment

**Total Implementation Time**: ~7 hours (recommended 2 days)

## 🎯 Next Steps

1. **Configure LINE Credentials**: Update `.env` with your LINE channel details
2. **Test Locally**: Run `npm run dev` and test all flows
3. **Deploy**: Choose your deployment platform and deploy
4. **Configure Webhook**: Set webhook URL in LINE Console
5. **Test in Production**: Add bot as friend and test all features

## 📞 Support

For issues or questions:
1. Check [DEPLOYMENT_GUIDE.md](./DEPLOYMENT_GUIDE.md) troubleshooting section
2. Review logs in `logs/` directory
3. Run tests: `npm test`
4. Check [LINE Developers Documentation](https://developers.line.biz/en/docs/)

## 📄 License

MIT License - See LICENSE file for details

## 🎉 Ready to Deploy!

The bot is fully implemented, tested, and ready for production deployment.

**Happy banking! 🏦**
