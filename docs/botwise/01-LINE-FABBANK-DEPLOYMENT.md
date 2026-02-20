# LINE FAB Bank Bot - Deployment Guide

**Bot ID**: `fabbank`
**Platform**: LINE Messaging API
**Features**: Check Balance, Card Services, Mini Statement, Live Chat
**Configuration File**: `config/fabbank.json`
**Environment File**: `.env.fabbank`

---

## 📋 Prerequisites

- Node.js v14+
- npm v6+
- LINE Business Account
- LINE Messaging API Channel
- FAB Bank API Access (for banking features)
- Live Chat API URL (for Avaya integration)
- Ngrok (for local testing)

---

## 🎯 What You Need to Deploy

### 1. **LINE Channel Credentials**
   - Channel ID
   - Channel Access Token
   - Channel Secret

### 2. **Banking API Credentials**
   - Banking API URL
   - API Timeout (milliseconds)

### 3. **Live Chat Integration**
   - Live Chat API URL
   - Avaya Tenant ID (default: SHOWMEAVAYA)

### 4. **Optional Configurations**
   - Welcome Banner Image URL
   - Custom OTP Expiry (seconds)
   - Session Timeout (milliseconds)

---

## 🔧 Step-by-Step Deployment

### Step 1: Get LINE Channel Credentials

1. Go to [LINE Developers Console](https://developers.line.biz/console/)
2. Login with your LINE Business Account
3. Create a new **Messaging API Channel** if you don't have one:
   - Provider: Create or select existing
   - Channel name: "FAB Bank"
   - Description: "FAB Bank Services Bot"
   - Channel type: "Messaging API"
4. Once created, go to **Basic Settings** tab:
   - Copy **Channel ID** (numeric ID)
   - Copy **Channel Secret** (32-character string)
5. Go to **Messaging API** tab:
   - Copy **Channel Access Token** (long string starting with "Channel...")
   - If no token exists, click "Issue" to generate one

**Where to Find Them:**
```
LINE Console → Your Channel → Messaging API Tab
├── Channel ID: Found in "Channel basic information"
├── Channel Access Token: Found in "Messaging API" section
└── Channel Secret: Found in "Basic Settings"
```

### Step 2: Get FAB Banking API Credentials

Contact FAB Bank technical team for:
- **Banking API URL**: `https://api.bankfab.com/v1/...` (or your sandbox URL)
- **API Key/Authentication**: If required
- **API Timeout**: Typically 5000ms

### Step 3: Get Live Chat API URL

Contact your Avaya/Live Chat provider for:
- **Live Chat API URL**: Base URL for live chat endpoints
- **Tenant ID**: Organization identifier (example: SHOWMEAVAYA)
- **Authentication**: API key if required

### Step 4: Create `.env.fabbank` File

Create file: `FABLineChatbot/.env.fabbank`

```env
# ================================================
# LINE FAB Bank Bot Configuration
# ================================================

# LINE Messaging API Credentials (REQUIRED)
# Get these from: https://developers.line.biz/console/
FABBANK_LINE_CHANNEL_ID=<your_channel_id>
FABBANK_LINE_CHANNEL_SECRET=<your_channel_secret>
FABBANK_LINE_ACCESS_TOKEN=<your_channel_access_token>

# Banking API Configuration (REQUIRED)
# Contact FAB Bank technical team
FABBANK_BANKING_API_URL=https://api.bankfab.com/v1/banking
FABBANK_BANKING_API_TIMEOUT=5000

# Live Chat Configuration (REQUIRED)
# Contact your Avaya/Live Chat provider
FABBANK_LIVE_CHAT_API_URL=https://your-livechat-server.com:6509/api
FABBANK_LIVE_CHAT_TIMEOUT=20000

# Avaya Tenant ID (for live chat routing)
FABBANK_AVAYA_TENANT=SHOWMEAVAYA

# Welcome Message Configuration (OPTIONAL)
FABBANK_WELCOME_IMAGE=https://www.bankfab.com/-/media/fab-uds/personal/promotions/2025/mclaren-f1-cards-offer/mclaren-homepage-banner-en.jpg

# Session & Authentication (OPTIONAL)
FABBANK_SESSION_TIMEOUT=300000
FABBANK_OTP_EXPIRY=300
```

### Step 5: Update `config/fabbank.json` (if needed)

Most settings are already configured. You can override:

```json
{
  "botName": "FAB Bank Bot",
  "welcomeImage": "https://custom-url-if-needed.jpg",
  "features": {
    "checkBalance": true,
    "cardServices": true,
    "liveChat": true,
    "miniStatement": true
  },
  "sessionTimeout": 300000,
  "otpExpiry": 300
}
```

### Step 6: Enable Webhook in LINE Console

1. Go to **LINE Developers Console** → Your Channel → **Messaging API** tab
2. Find **Webhook Settings** section
3. Enable "Use webhook"
4. Set **Webhook URL**:
   - **Local (Development)**: `https://<your-ngrok-url>/webhook/fabbank`
   - **Production**: `https://your-domain.com/webhook/fabbank`
5. Click **Verify** to test (should show "Success")
6. Enable the following events:
   - Message
   - Follow/Unfollow
   - Join/Leave
   - Postback

**Example Webhook URL (with Ngrok)**:
```
https://abc123def456.ngrok-free.dev/webhook/fabbank
```

### Step 7: Set Webhook Secret

In LINE Console → Messaging API tab → Webhook Settings:
- Verify the **Webhook Secret** matches your `FABBANK_LINE_CHANNEL_SECRET` in `.env.fabbank`

---

## 🚀 Running the Bot

### Installation

```bash
# Navigate to project directory
cd FABLineChatbot

# Install dependencies (if not already done)
npm install
```

### Start the Server

**Development Mode:**
```bash
npm run dev
```

**Production Mode:**
```bash
npm start
```

### Expected Output

```
✓ Bots initialized successfully
✓ Server running on port 3001
✓ FAB Bank bot (fabbank) registered
✓ Webhook: POST /webhook/fabbank active
```

---

## 📱 Testing the Bot

### 1. Add Bot to LINE App

1. Scan the **QR code** from LINE Console → Your Channel → Basic Settings
2. Or search for your bot by name
3. Click "Add" to follow the bot

### 2. Test Basic Features

Send messages to test:

| Feature | Test Message | Expected Response |
|---------|--------------|-------------------|
| **Start** | `/start` or `Hi` | Welcome message with image + buttons |
| **Check Balance** | Click "Check Balance" button | "Enter phone number:" prompt |
| **OTP Verification** | Enter phone, then OTP | "Enter OTP:" prompt |
| **Card Services** | Click "Card Services" | Card options menu |
| **Live Chat** | Click "Live Chat" | Live chat connection |
| **End Session** | Click "End Session" | "Session ended" message |

### 3. Verify Webhook Connection

```bash
# Check ngrok tunnel (if using local testing)
curl https://<ngrok-url>/webhook/fabbank

# Should return 404 (not a GET endpoint)
# This confirms ngrok connection works
```

### 4. Monitor Logs

Look for:
- ✅ `Webhook received: /webhook/fabbank`
- ✅ `Session created: fabbank:...`
- ✅ `Message processed: ...`
- ❌ Any error messages in red

---

## ✅ Verification Checklist

Before considering deployment complete:

- [ ] `.env.fabbank` file created with all required variables
- [ ] LINE Channel ID, Secret, and Access Token are valid
- [ ] Banking API URL is accessible and working
- [ ] Live Chat API URL is configured
- [ ] Webhook URL set in LINE Console
- [ ] Webhook events enabled (Message, Postback, Follow/Unfollow)
- [ ] Bot appears in LINE Console → Channel list
- [ ] Bot can be added from LINE app
- [ ] Welcome message displays correctly with image
- [ ] All 4 buttons appear (Check Balance, Card Services, Live Chat, End Session)
- [ ] Postback events trigger correctly
- [ ] No errors in server logs

---

## 🔍 Troubleshooting

### Issue: Webhook fails verification in LINE Console

**Solution:**
1. Check if ngrok tunnel is still active: `ngrok http 3001`
2. Verify webhook URL is correct: `https://ngrok-url/webhook/fabbank`
3. Ensure server is running: `npm run dev`
4. Check if `/webhook/fabbank` route exists in `app.js`

### Issue: Bot not responding to messages

**Solution:**
1. Verify `FABBANK_LINE_CHANNEL_ID` and `FABBANK_LINE_CHANNEL_SECRET` are correct
2. Check if bot is followed in LINE app
3. Look for webhook delivery failures in LINE Console
4. Check server logs for errors
5. Verify webhook is enabled in LINE Console

### Issue: "Channel is not matched" error

**Solution:**
1. Channel ID mismatch between `.env` and LINE Console
2. Regenerate and copy Channel ID again carefully
3. Update `.env.fabbank` and restart server

### Issue: Banking API calls fail

**Solution:**
1. Verify `FABBANK_BANKING_API_URL` is correct and accessible
2. Test API manually: `curl FABBANK_BANKING_API_URL/health`
3. Check if API requires authentication headers
4. Verify timeout is sufficient (increase `FABBANK_BANKING_API_TIMEOUT`)

### Issue: Live chat not connecting

**Solution:**
1. Verify `FABBANK_LIVE_CHAT_API_URL` is correct and accessible
2. Confirm `FABBANK_AVAYA_TENANT` matches your Avaya tenant ID
3. Check if live chat API requires authentication
4. Verify timeout is sufficient (increase `FABBANK_LIVE_CHAT_TIMEOUT`)

---

## 📊 Bot Architecture

```
FABLineChatbot
├── src/bots/fabbank/
│   ├── config.js                    # Bot configuration
│   ├── index.js                     # Bot initialization
│   ├── controllers/
│   │   └── webhookController.js    # Webhook handler
│   ├── handlers/
│   │   ├── commandHandler.js       # /start, /help, etc.
│   │   ├── messageHandler.js       # Regular messages
│   │   └── callbackHandler.js      # Button postbacks
│   └── services/
│       ├── lineService.js          # LINE API wrapper
│       ├── bankingService.js       # Banking API client
│       ├── sessionService.js       # Session management
│       ├── dialogManager.js        # Conversation flow
│       ├── liveChatService.js      # Live chat integration
│       └── templateService.js      # Message templates
├── .env.fabbank                    # Bot credentials
└── config/fabbank.json             # Bot settings
```

---

## 🔐 Security Best Practices

1. **Never commit `.env.fabbank`**
   ```bash
   # Add to .gitignore
   .env
   .env.*
   .env.*.local
   ```

2. **Rotate Channel Access Token regularly**
   - Go to LINE Console → Messaging API → Issue new token
   - Update `.env.fabbank`
   - Restart server

3. **Use HTTPS in production**
   - Replace ngrok URL with actual domain
   - Install SSL certificate
   - Update webhook URL in LINE Console

4. **Validate user input**
   - OTP verification
   - Phone number format
   - API responses

5. **Monitor webhook logs**
   - LINE Console shows all webhook deliveries
   - Check for failed deliveries
   - Investigate error responses

---

## 📚 Additional Resources

- **LINE Documentation**: https://developers.line.biz/en/
- **Messaging API Reference**: https://developers.line.biz/en/reference/messaging-api/
- **Webhook Guide**: https://developers.line.biz/en/reference/messaging-api-built-in-rich-menus/
- **OAuth 2.0 Flow**: https://developers.line.biz/en/docs/messaging-api/using-oauth/

---

## 🎓 Next Steps

1. **After successful deployment**, test all features:
   - Check Balance flow
   - Card Services options
   - Mini Statement
   - Live Chat routing

2. **Monitor in production**:
   - Check LINE Console webhook logs daily
   - Set up log aggregation (e.g., ELK, Datadog)
   - Monitor API response times

3. **Gather analytics**:
   - Track user engagement
   - Monitor error rates
   - Analyze conversation flows

---

**Last Updated**: 2026-02-20
**Status**: ✅ Production Ready
