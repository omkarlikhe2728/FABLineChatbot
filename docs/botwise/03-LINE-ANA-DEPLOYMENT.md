# LINE ANA Airline Bot - Deployment Guide

**Bot ID**: `ana`
**Platform**: LINE Messaging API
**Features**: Flight Status, Baggage Allowance, Live Chat, CSAT Survey
**Configuration File**: `config/ana.json`
**Environment File**: `.env.ana`

---

## 📋 Prerequisites

- Node.js v14+
- npm v6+
- LINE Business Account
- LINE Messaging API Channel
- ANA Airline API Access
- Live Chat API URL (for Avaya integration)
- Ngrok (for local testing)

---

## 🎯 What You Need to Deploy

### 1. **LINE Channel Credentials**
   - Channel ID
   - Channel Access Token
   - Channel Secret

### 2. **ANA Airline API Credentials**
   - Airline API URL
   - API Key/Authentication (if required)
   - API Timeout (milliseconds)

### 3. **Live Chat Integration**
   - Live Chat API URL
   - Avaya Tenant ID (default: SHOWMEAVAYA)

### 4. **Optional Configurations**
   - Welcome Banner Image URL
   - Session Timeout (milliseconds)

---

## 🔧 Step-by-Step Deployment

### Step 1: Get LINE Channel Credentials

1. Go to [LINE Developers Console](https://developers.line.biz/console/)
2. Login with your LINE Business Account
3. Create a new **Messaging API Channel**:
   - Provider: Create or select existing
   - Channel name: "ANA Airline"
   - Description: "ANA Flight Services Bot"
   - Channel type: "Messaging API"
4. Go to **Basic Settings** tab:
   - Copy **Channel ID**
   - Copy **Channel Secret**
5. Go to **Messaging API** tab:
   - Copy **Channel Access Token**
   - If no token exists, click "Issue" to generate one

### Step 2: Get ANA Airline API Credentials

Contact ANA technical team for:
- **Airline API URL**: `https://api.ana.co.jp/v1/...` (or sandbox URL)
- **API Key**: Authentication credential if required
- **API Timeout**: Typically 5000ms
- **Available endpoints**: Flight status, baggage allowance, booking reference lookup

**Default API URL** (configured in code):
```
https://password-reset.lab.bravishma.com:6507/api/v1/airline
```

If using default, ensure this URL is accessible from your network.

### Step 3: Get Live Chat API URL

Contact your Avaya/Live Chat provider for:
- **Live Chat API URL**: Base URL for live chat endpoints
- **Tenant ID**: Organization identifier (default: SHOWMEAVAYA)
- **Authentication**: API key if required

### Step 4: Create `.env.ana` File

Create file: `FABLineChatbot/.env.ana`

```env
# ================================================
# LINE ANA Airline Bot Configuration
# ================================================

# LINE Messaging API Credentials (REQUIRED)
# Get these from: https://developers.line.biz/console/
ANA_LINE_CHANNEL_ID=<your_channel_id>
ANA_LINE_CHANNEL_SECRET=<your_channel_secret>
ANA_LINE_ACCESS_TOKEN=<your_channel_access_token>

# ANA Airline API Configuration (REQUIRED)
# Contact ANA technical team
# Default: https://password-reset.lab.bravishma.com:6507/api/v1/airline
ANA_AIRLINE_API_URL=https://password-reset.lab.bravishma.com:6507/api/v1/airline
ANA_AIRLINE_API_TIMEOUT=5000

# Live Chat Configuration (REQUIRED)
# Contact your Avaya/Live Chat provider
ANA_LIVE_CHAT_API_URL=https://your-livechat-server.com:6509/api
ANA_LIVE_CHAT_TIMEOUT=20000

# Avaya Tenant ID (for live chat routing)
ANA_AVAYA_TENANT=SHOWMEAVAYA

# Welcome Message Configuration (OPTIONAL)
ANA_WELCOME_IMAGE=https://www.ana.co.jp/www2/wws_common/images/top/tc1/hero/hero_pc_2512_FlyOtaku-Kawaii.jpg

# Session & Authentication (OPTIONAL)
ANA_SESSION_TIMEOUT=900000
```

### Step 5: Update `config/ana.json` (if needed)

Most settings are already configured. You can override:

```json
{
  "botName": "ANA - All Nippon Airways",
  "airlineName": "ANA (All Nippon Airways)",
  "welcomeImage": "https://custom-airline-image-url.jpg",
  "features": {
    "flightStatus": true,
    "baggageAllowance": true,
    "liveChat": true,
    "csat": true
  },
  "sessionTimeout": 900000,
  "apiTimeout": 5000
}
```

### Step 6: Enable Webhook in LINE Console

1. Go to **LINE Developers Console** → Your Channel → **Messaging API** tab
2. Find **Webhook Settings** section
3. Enable "Use webhook"
4. Set **Webhook URL**:
   - **Local (Development)**: `https://<your-ngrok-url>/webhook/ana`
   - **Production**: `https://your-domain.com/webhook/ana`
5. Click **Verify** to test (should show "Success")
6. Enable the following events:
   - Message
   - Follow/Unfollow
   - Join/Leave
   - Postback

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
✓ ANA bot (ana) registered
✓ Webhook: POST /webhook/ana active
```

---

## 📱 Testing the Bot

### 1. Add Bot to LINE App

1. Scan the **QR code** from LINE Console → Your Channel → Basic Settings
2. Click "Add" to follow the bot

### 2. Test Features

| Feature | Test Action | Expected Response |
|---------|-------------|-------------------|
| **Welcome** | Send any message or "Hi" | ANA welcome message + image + buttons |
| **Flight Status** | Click "Flight Status" button | "Enter your booking reference:" prompt |
| **Baggage Allowance** | Click "Baggage Allowance" button | "Baggage allowance information" |
| **Live Chat** | Click "Live Chat" button | Live chat agent connection |
| **CSAT Survey** | After live chat | Rating prompt (1-5 stars) |
| **Menu** | Type "menu" | Show main menu buttons |

### 3. Verify Webhook Connection

Check LINE Console → Messaging API → Webhook Log:
- Verify webhook deliveries show success (HTTP 200)
- Check message delivery times
- Look for any failed deliveries

---

## ✅ Verification Checklist

- [ ] `.env.ana` file created with all required variables
- [ ] LINE Channel credentials are valid
- [ ] Airline API URL is accessible
  - Test: `curl ANA_AIRLINE_API_URL/health` (or appropriate endpoint)
- [ ] Live Chat API URL is configured
- [ ] Webhook URL set correctly in LINE Console
- [ ] Webhook events enabled (Message, Postback, Follow)
- [ ] Bot can be added from LINE app
- [ ] Welcome message displays with airline image
- [ ] All 3 menu buttons visible (Flight Status, Baggage, Live Chat)
- [ ] No errors in server logs

---

## 🔍 Troubleshooting

### Issue: Webhook URL verification fails

**Solution:**
1. Check if ngrok is running: `ngrok http 3001`
2. Verify webhook URL: `https://ngrok-url/webhook/ana`
3. Ensure `/webhook/ana` route exists in `app.js`
4. Restart server: `npm run dev`
5. Try verification again in LINE Console

### Issue: Bot not responding to messages

**Solution:**
1. Verify `ANA_LINE_CHANNEL_ID` and `ANA_LINE_CHANNEL_SECRET` match LINE Console
2. Ensure bot is followed in LINE app
3. Check server logs for webhook handler errors
4. Verify webhook is enabled in LINE Console

### Issue: Flight status API returns errors

**Solution:**
1. Verify `ANA_AIRLINE_API_URL` is correct
2. Test API manually: `curl ANA_AIRLINE_API_URL/health`
3. Check if API requires authentication headers
4. Verify timeout value (increase if needed): `ANA_AIRLINE_API_TIMEOUT`
5. Check API documentation for required parameters

### Issue: Baggage allowance information not displaying

**Solution:**
1. Verify airline API includes baggage endpoint
2. Check API response format matches expected format
3. Review server logs for API errors
4. Test API endpoint: `curl ANA_AIRLINE_API_URL/baggage`

### Issue: Live chat not connecting

**Solution:**
1. Verify `ANA_LIVE_CHAT_API_URL` is correct and accessible
2. Confirm `ANA_AVAYA_TENANT` matches your Avaya tenant
3. Test live chat endpoint: `curl ANA_LIVE_CHAT_API_URL/health`
4. Check if authentication is required for live chat API

---

## 📊 Bot Architecture

```
FABLineChatbot
├── src/bots/ana/
│   ├── config.js                    # Bot configuration
│   ├── index.js                     # Bot initialization
│   ├── controllers/
│   │   └── webhookController.js    # Webhook handler
│   ├── handlers/
│   │   ├── messageHandler.js       # Regular messages
│   │   └── callbackHandler.js      # Button postbacks
│   └── services/
│       ├── lineService.js          # LINE API wrapper
│       ├── airlineService.js       # ANA API client
│       ├── sessionService.js       # Session management
│       ├── dialogManager.js        # Conversation flow
│       ├── liveChatService.js      # Live chat integration
│       └── templateService.js      # Message templates
├── .env.ana                        # Bot credentials
└── config/ana.json                 # Bot settings
```

---

## 🔐 Security Best Practices

1. **Never commit `.env.ana`**
   ```bash
   # Ensure .gitignore includes:
   .env
   .env.*
   .env.*.local
   ```

2. **Rotate Channel Access Token**
   - Go to LINE Console → Messaging API → Issue new token
   - Update `.env.ana`
   - Restart server

3. **Secure API Communications**
   - Use HTTPS for all API calls
   - Verify SSL certificates
   - Don't log sensitive booking data

4. **Protect User Information**
   - Validate booking reference format
   - Don't display full PNR details in logs
   - Encrypt session data

5. **Monitor API Usage**
   - Track API call rates
   - Alert on unusual patterns
   - Review failed authentication attempts

---

## 📚 Additional Resources

- **LINE Documentation**: https://developers.line.biz/en/
- **LINE Messaging API**: https://developers.line.biz/en/reference/messaging-api/
- **ANA Official Website**: https://www.ana.co.jp/
- **ANA API Documentation**: Contact ANA technical team

---

## 🎓 Next Steps

1. **Test all airline features** once deployed
2. **Set up log monitoring** for production environment
3. **Configure email alerts** for API failures
4. **Monitor CSAT ratings** from customers
5. **Plan upgrades** for real-time flight status integration

---

**Last Updated**: 2026-02-20
**Status**: ✅ Production Ready
