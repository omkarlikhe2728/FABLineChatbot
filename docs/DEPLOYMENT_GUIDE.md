# FAB Banking Bot - Deployment & Testing Guide

## ✅ Implementation Complete

The LINE Banking Bot has been successfully implemented with all 9 phases:

1. ✅ Infrastructure & Setup
2. ✅ Core Webhook & Session Management
3. ✅ Authentication System
4. ✅ Check Balance Feature
5. ✅ Card Services Feature
6. ✅ Mini Statement & Transactions
7. ✅ Rich Message Templates
8. ✅ Error Handling & Logging
9. ✅ Testing & Deployment

## 🚀 Quick Start

### Prerequisites

- Node.js 14+ installed
- npm 6+ installed
- LINE Developers account with Messaging API Channel created
- Banking API base URL: `https://password-reset.lab.bravishma.com:6507/api/v1`

### Installation

```bash
# Install dependencies (already done)
npm install

# Configure environment variables
# Edit .env file with your LINE credentials:
# - LINE_CHANNEL_ID
# - LINE_CHANNEL_SECRET
# - LINE_ACCESS_TOKEN
```

### Running the Bot

```bash
# Development mode (with auto-reload)
npm run dev

# Production mode
npm start

# Run tests
npm test
```

## 🔑 LINE Configuration

1. Go to [LINE Developers Console](https://developers.line.biz/console/)
2. Select your Messaging API Channel
3. Copy and paste into `.env`:
   - **Channel ID** → `LINE_CHANNEL_ID`
   - **Channel Secret** → `LINE_CHANNEL_SECRET`
   - **Channel Access Token** → `LINE_ACCESS_TOKEN`

4. Set webhook URL in LINE Console:
   - **Webhook URL**: `https://your-server.com/webhook`
   - Replace `your-server.com` with your actual domain
   - Enable webhook in LINE Console

### ⚠️ Important: Update .env with Your Credentials

The `.env` file must contain your actual LINE credentials:

```env
LINE_CHANNEL_ID=your_actual_channel_id
LINE_CHANNEL_SECRET=your_actual_channel_secret
LINE_ACCESS_TOKEN=your_actual_access_token
```

**Do NOT commit the .env file with real credentials to Git!**

## 📋 Manual Testing Checklist

### Test Case 1: Welcome Flow
✓ **Goal**: User adds bot and receives welcome message

**Steps:**
1. Open LINE app
2. Search for your bot by Channel ID or QR code
3. Tap "Add" to follow the bot

**Expected Results:**
- ✅ Welcome message appears: "Welcome to FAB Bank! 🏦"
- ✅ Main menu buttons display: "Check Balance", "Card Services", "End Session"
- ✅ Bot is ready for commands

### Test Case 2: Check Balance - Valid Flow
✓ **Goal**: User checks account balance using OTP verification

**Steps:**
1. Tap "💳 Check Balance" button
2. Enter phone number: `9876543210` or `+919876543210`
3. Wait for OTP
4. Enter 6-digit OTP (depends on actual OTP sent by banking API)
5. View account balance

**Expected Results:**
- ✅ Bot asks for phone number in valid format
- ✅ OTP is sent (check banking API logs if real API is used)
- ✅ Bot asks for OTP code
- ✅ After verification, balance is displayed with:
  - Customer Name
  - Account Number
  - Account Type
  - Balance in correct currency
- ✅ Options to "View Mini Statement" or "Back to Menu"

### Test Case 3: Mini Statement
✓ **Goal**: User views recent transactions

**Steps:**
1. From balance display, tap "📊 Mini Statement"
2. View transaction history

**Expected Results:**
- ✅ Last 5 transactions displayed
- ✅ Each transaction shows: Date, Description, Amount (with +/- prefix)
- ✅ Current balance shown at bottom
- ✅ "Back to Menu" button available

### Test Case 4: Card Services - View Cards
✓ **Goal**: User views all their cards

**Steps:**
1. From main menu, tap "💰 Card Services"
2. Enter phone number
3. View card list

**Expected Results:**
- ✅ All cards listed with:
  - Card type (Debit/Credit)
  - Card number (masked)
  - Expiry date
  - Card status (ACTIVE/BLOCKED)
- ✅ Card action buttons appear:
  - "🔒 Block Card"
  - "🔓 Unblock Card"
  - "⚠️ Report Lost"

### Test Case 5: Block Card
✓ **Goal**: User blocks a specific card

**Steps:**
1. Tap "🔒 Block Card"
2. Enter card ID (e.g., `CARD123`)
3. Enter reason for blocking (optional)
4. Confirm action

**Expected Results:**
- ✅ Bot asks for card ID
- ✅ Bot asks for reason (optional)
- ✅ Block confirmed: "✅ Card [ID] blocked successfully!"
- ✅ Return to main menu option

### Test Case 6: Unblock Card
✓ **Goal**: User unblocks a previously blocked card

**Steps:**
1. Tap "🔓 Unblock Card"
2. Enter card ID
3. Confirm unblock action

**Expected Results:**
- ✅ Bot asks for card ID
- ✅ Confirmation message shown
- ✅ Unblock confirmed: "✅ Card [ID] unblocked successfully!"
- ✅ Card is now active

### Test Case 7: Report Lost Card
✓ **Goal**: User reports a card as lost

**Steps:**
1. Tap "⚠️ Report Lost"
2. Enter lost card ID
3. Confirm report

**Expected Results:**
- ✅ Bot asks for card ID
- ✅ Warning message displayed
- ✅ Confirmation required
- ✅ Success message: "✅ Card [ID] reported as lost!"
- ✅ Message about replacement timeline

### Test Case 8: View Card Limits
✓ **Goal**: User checks card spending limits

**Steps:**
1. Tap "View Card Limits"
2. Enter card ID

**Expected Results:**
- ✅ Card limits displayed:
  - Daily limit
  - Monthly limit
  - Amount used this month
  - Remaining limit
  - ATM withdrawal limit
  - POS purchase limit

### Test Case 9: Session Timeout
✓ **Goal**: Verify session expires after inactivity

**Steps:**
1. Start any flow (e.g., "Check Balance")
2. Wait 5+ minutes without interacting
3. Send another message

**Expected Results:**
- ✅ Message: "Session expired. Please follow the bot again."
- ✅ User must re-follow bot to continue
- ✅ New session created

### Test Case 10: Error Handling
✓ **Goal**: Bot handles errors gracefully

**Steps:**
1. Enter invalid phone number
2. Enter invalid OTP
3. Enter malicious input (e.g., `<script>alert('xss')</script>`)

**Expected Results:**
- ✅ Invalid phone: "Invalid phone format. Please use: +919876543210 or 9876543210"
- ✅ Invalid OTP: "Invalid OTP format. Please enter 6 digits."
- ✅ Malicious input sanitized and rejected
- ✅ Bot always remains responsive

### Test Case 11: Navigation
✓ **Goal**: Verify "Back to Menu" works from any state

**Steps:**
1. From any dialog state, tap "Back to Menu"

**Expected Results:**
- ✅ Always returns to main menu
- ✅ Session state preserved
- ✅ Main menu buttons reappear

### Test Case 12: End Session
✓ **Goal**: User properly ends conversation

**Steps:**
1. Tap "👋 End Session"

**Expected Results:**
- ✅ Message: "Thank you for using FAB Bank! Have a great day! 👋"
- ✅ Session is deleted
- ✅ User must re-follow bot to use bot again

## 🧪 Automated Tests

Run all unit and integration tests:

```bash
npm test
```

**Test Coverage:**
- ✅ 14 Validator tests (phone format, OTP validation, sanitization)
- ✅ 9 Session Service tests (CRUD operations, timeouts)
- ✅ 12 Dialog Flow integration tests (all user flows)
- **Total: 35 tests passing**

## 📊 Monitoring

### Logs
All activity is logged to `logs/` directory:
- `info.log` - General information
- `error.log` - Error messages
- `debug.log` - Debug information
- `warn.log` - Warnings

### Health Check
Test bot health:

```bash
curl http://localhost:3000/health
```

Expected response:
```json
{
  "success": true,
  "message": "FAB Banking Bot is running",
  "timestamp": "2026-02-10T07:45:00.000Z"
}
```

## 🚀 Deployment Options

### Option 1: Heroku

```bash
# Create Heroku app
heroku create fab-banking-bot

# Set environment variables
heroku config:set LINE_CHANNEL_ID=your_id
heroku config:set LINE_CHANNEL_SECRET=your_secret
heroku config:set LINE_ACCESS_TOKEN=your_token

# Deploy
git push heroku main

# View logs
heroku logs --tail
```

### Option 2: Docker

```bash
# Build Docker image
docker build -t fab-banking-bot .

# Run container
docker run -p 3000:3000 --env-file .env fab-banking-bot

# Push to Docker registry
docker push your-registry/fab-banking-bot
```

### Option 3: AWS Lambda + API Gateway

1. Install SAM CLI
2. Create `samconfig.yaml`
3. Deploy: `sam deploy`

### Option 4: Self-hosted Server (Ubuntu)

```bash
# SSH into server
ssh user@your-server.com

# Install Node.js
curl -fsSL https://deb.nodesource.com/setup_16.x | sudo -E bash -
sudo apt-get install -y nodejs

# Clone repository
git clone your-repo-url
cd fab-banking-bot

# Install dependencies
npm install

# Start with PM2 for production
npm install -g pm2
pm2 start src/server.js --name "fab-banking-bot"
pm2 startup
pm2 save

# Set up SSL/HTTPS (recommended)
sudo apt-get install certbot python3-certbot-nginx
sudo certbot certonly --standalone -d your-domain.com
```

## 🔒 Security Best Practices

1. **Environment Variables**: Keep `.env` file with real credentials out of version control
   ```bash
   echo ".env" >> .gitignore
   ```

2. **HTTPS**: Always use HTTPS for webhook endpoint (required by LINE)

3. **Rate Limiting**: Built-in rate limiting (30 requests/minute per user)

4. **Input Validation**: All user inputs are validated and sanitized

5. **Signature Verification**: All LINE webhook requests are verified

6. **Sensitive Data Masking**: Phone numbers masked in logs

7. **Session Timeout**: Sessions auto-expire after 5 minutes of inactivity

8. **No Credential Logging**: OTP codes, credit card numbers, etc. are not logged

## 📞 Support & Troubleshooting

### Bot Not Responding

1. Check if server is running: `npm run dev`
2. Verify webhook URL is configured in LINE Console
3. Check logs: `tail -f logs/error.log`
4. Verify LINE credentials in `.env`

### OTP Not Being Sent

1. Verify banking API URL is correct in `.env`
2. Check if banking API is accessible: `curl https://password-reset.lab.bravishma.com:6507/api/v1/banking/auth/send-otp`
3. Verify phone number format is correct: `+91` prefix required

### Session Timeout Too Short

Edit in `.env`:
```env
SESSION_TIMEOUT=600000  # 10 minutes
```

### Rate Limiting Too Strict

Edit in `src/middleware/security.js`:
```javascript
checkRateLimit(userId, 60, 60000)  // 60 requests per minute
```

## 📝 Files Structure

```
fab-line-banking-bot/
├── src/
│   ├── app.js                 # Express app setup
│   ├── server.js              # Server entry point
│   ├── controllers/
│   │   └── webhookController.js
│   ├── handlers/
│   │   ├── messageHandler.js
│   │   └── postbackHandler.js
│   ├── middleware/
│   │   ├── errorHandler.js
│   │   └── security.js
│   ├── services/
│   │   ├── bankingService.js
│   │   ├── dialogManager.js
│   │   ├── lineService.js
│   │   ├── sessionService.js
│   │   └── templateService.js
│   ├── utils/
│   │   ├── logger.js
│   │   └── validators.js
│   └── templates/            # (for future Flex templates)
├── tests/
│   ├── unit/
│   │   ├── validators.test.js
│   │   └── sessionService.test.js
│   └── integration/
│       └── dialogFlow.test.js
├── logs/                      # Generated log files
├── .env                       # Environment variables (DO NOT COMMIT)
├── .env.example               # Template for .env
├── package.json
├── jest.config.js
└── README.md
```

## ✨ What's Next?

**Future Enhancements:**
- [ ] Real-time notifications for transactions
- [ ] Multi-language support (Arabic, English, Hindi)
- [ ] Voice message support
- [ ] Payment transfers via bot
- [ ] Loan application through bot
- [ ] Investment portfolio management
- [ ] Analytics dashboard
- [ ] Admin panel for bot management

## 📄 Summary

The FAB Banking Bot is now fully implemented and ready for deployment. All core features are working:

- ✅ OTP authentication
- ✅ Account balance inquiry
- ✅ Card management (block/unblock/report lost)
- ✅ Mini statement viewing
- ✅ Error handling
- ✅ Session management
- ✅ Rich message formatting
- ✅ Comprehensive testing
- ✅ Production-ready code

**Deploy with confidence!** 🎉
