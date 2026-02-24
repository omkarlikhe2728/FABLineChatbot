# LINE Sands Hotel Bot - Deployment Guide

**Bot ID**: `sands`
**Platform**: LINE Messaging API
**Features**: Early Check-in, Booking Amendments, Live Chat, CSAT Survey
**Configuration File**: `config/sands.json`
**Environment File**: `.env.sands`

---

## 📋 Prerequisites

- Node.js v14+
- npm v6+
- LINE Business Account
- LINE Messaging API Channel
- Sands Hotel Booking API Access
- Live Chat API URL (for Avaya integration)
- Ngrok (for local testing)

---

## 🎯 What You Need to Deploy

### 1. **LINE Channel Credentials**
   - Channel ID
   - Channel Access Token
   - Channel Secret

### 2. **Hotel Booking API Credentials**
   - Booking API URL
   - API Authentication (if required)
   - API Timeout (milliseconds)

### 3. **Live Chat Integration**
   - Live Chat API URL
   - Avaya Tenant ID (default: SHOWMEAVAYA)

### 4. **Optional Configurations**
   - Hotel Name (default: "Sands Hotel Macau")
   - Hotel Image URL
   - Session Timeout (milliseconds)

---

## 🔧 Step-by-Step Deployment

### Step 1: Get LINE Channel Credentials

1. Go to [LINE Developers Console](https://developers.line.biz/console/)
2. Login with your LINE Business Account
3. Create a new **Messaging API Channel**:
   - Provider: Create or select existing
   - Channel name: "Sands Hotel"
   - Description: "Sands Hotel Macau Concierge Bot"
   - Channel type: "Messaging API"
4. Go to **Basic Settings** tab:
   - Copy **Channel ID**
   - Copy **Channel Secret**
5. Go to **Messaging API** tab:
   - Copy **Channel Access Token**
   - If no token exists, click "Issue" to generate one

### Step 2: Get Booking API Credentials

Contact Sands Hotel technical team for:
- **Booking API URL**: `https://api.sandsmacau.com/booking/...` (or sandbox URL)
- **API Key**: If required
- **API Timeout**: Typically 5000ms
- **Available operations**: Check-in amendment, booking modification, etc.

### Step 3: Get Live Chat API URL

Contact your Avaya/Live Chat provider for:
- **Live Chat API URL**: Base URL for live chat endpoints
- **Tenant ID**: Organization identifier (default: SHOWMEAVAYA)
- **Authentication**: API key if required

### Step 4: Create `.env.sands` File

Create file: `FABLineChatbot/.env.sands`

```env
# ================================================
# LINE Sands Hotel Bot Configuration
# ================================================

# LINE Messaging API Credentials (REQUIRED)
# Get these from: https://developers.line.biz/console/
SANDS_LINE_CHANNEL_ID=<your_channel_id>
SANDS_LINE_CHANNEL_SECRET=<your_channel_secret>
SANDS_LINE_ACCESS_TOKEN=<your_channel_access_token>

# Hotel Booking API Configuration (REQUIRED)
# Contact Sands Hotel technical team
SANDS_BOOKING_API_URL=https://api.sandsmacau.com/booking
SANDS_BOOKING_API_TIMEOUT=5000

# Live Chat Configuration (REQUIRED)
# Contact your Avaya/Live Chat provider
SANDS_LIVE_CHAT_API_URL=https://your-livechat-server.com:6509/api
SANDS_LIVE_CHAT_TIMEOUT=20000

# Avaya Tenant ID (for live chat routing)
SANDS_AVAYA_TENANT=SHOWMEAVAYA

# Hotel Information (OPTIONAL)
SANDS_NAME=Sands Hotel Macau
SANDS_IMAGE_URL=https://pix10.agoda.net/hotelImages/281706/-1/a77bbebcc27ef04077cedc0ca3f366fa.jpg

# Session & Authentication (OPTIONAL)
SANDS_SESSION_TIMEOUT=300000
```

### Step 5: Update `config/sands.json` (if needed)

Most settings are already configured. You can override:

```json
{
  "hotelName": "Sands Hotel Macau",
  "hotelImageUrl": "https://custom-hotel-image-url.jpg",
  "welcomeMessage": "Welcome to Sands Hotel Macau Concierge! 🏨\n\nHow can I assist you today?",
  "features": {
    "earlyCheckIn": true,
    "bookingAmendments": true,
    "liveChat": true,
    "csatSurvey": true
  },
  "sessionTimeout": 300000
}
```

### Step 6: Enable Webhook in LINE Console

1. Go to **LINE Developers Console** → Your Channel → **Messaging API** tab
2. Find **Webhook Settings** section
3. Enable "Use webhook"
4. Set **Webhook URL**:
   - **Local (Development)**: `https://<your-ngrok-url>/webhook/sands`
   - **Production**: `https://your-domain.com/webhook/sands`
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

---

## 📱 Testing the Bot

### 1. Add Bot to LINE App

1. Scan the **QR code** from LINE Console → Your Channel → Basic Settings
2. Click "Add" to follow the bot

### 2. Test Features

| Feature | Test Action | Expected Response |
|---------|-------------|-------------------|
| **Welcome** | Send any message | Hotel welcome message + buttons |
| **Early Check-in** | Click "Early Check-in" | Check-in status form |
| **Booking Amendments** | Click "Booking Amendments" | Amendment options (Food, Extra Bed, Airport) |
| **Live Chat** | Click "Live Chat" | Live chat agent routing |
| **CSAT Survey** | After live chat | Rating request (1-5 stars) |
| **Main Menu** | Type "menu" | Main menu buttons |

### 3. Verify Webhook Connection

Check LINE Console → Webhook Log to verify:
- Webhook delivery success (HTTP 200)
- Message delivery times
- No failed deliveries

---

## ✅ Verification Checklist

- [ ] `.env.sands` file created with all required variables
- [ ] LINE Channel credentials are valid
- [ ] Booking API URL is accessible
- [ ] Live Chat API URL is configured
- [ ] Webhook URL set correctly in LINE Console
- [ ] Webhook events enabled (Message, Postback, Follow)
- [ ] Bot can be added from LINE app
- [ ] Welcome message displays with hotel image
- [ ] All 4 buttons visible (Early Check-in, Booking Amendments, Live Chat, End Session)
- [ ] Hotel name/image display correctly
- [ ] No errors in server logs

---

## 🔍 Troubleshooting

### Issue: Webhook URL verification fails

**Solution:**
1. Ensure ngrok is running: `ngrok http 3001`
2. Verify webhook URL format: `https://ngrok-url/webhook/sands`
3. Restart server and retry verification
4. Check server logs for webhook handler errors

### Issue: Hotel image not displaying

**Solution:**
1. Verify `SANDS_IMAGE_URL` is a valid, public URL
2. Check image CORS settings
3. Try a different image URL to test
4. Verify image dimensions are appropriate for LINE

### Issue: Booking API calls fail

**Solution:**
1. Test API manually: `curl SANDS_BOOKING_API_URL/health`
2. Verify `SANDS_BOOKING_API_URL` includes correct endpoint
3. Check if API requires authentication headers
4. Verify API timeout is sufficient

### Issue: Live chat routing fails

**Solution:**
1. Verify `SANDS_LIVE_CHAT_API_URL` is correct
2. Confirm `SANDS_AVAYA_TENANT=SHOWMEAVAYA` (or correct tenant)
3. Check if tenant ID is correct
4. Test live chat endpoint: `curl SANDS_LIVE_CHAT_API_URL/health`

---

## 📊 Bot Architecture

```
FABLineChatbot
├── src/bots/sands/
│   ├── config.js                    # Bot configuration
│   ├── index.js                     # Bot initialization
│   ├── controllers/
│   │   └── webhookController.js    # Webhook handler
│   ├── handlers/
│   │   ├── messageHandler.js       # Regular messages
│   │   └── callbackHandler.js      # Button postbacks
│   └── services/
│       ├── lineService.js          # LINE API wrapper
│       ├── bookingService.js       # Booking API client
│       ├── sessionService.js       # Session management
│       ├── dialogManager.js        # Conversation flow
│       ├── liveChatService.js      # Live chat integration
│       └── templateService.js      # Message templates
├── .env.sands                      # Bot credentials
└── config/sands.json               # Bot settings
```

---

## 🔐 Security Best Practices

1. **Never commit `.env.sands`**
   ```bash
   # Ensure .gitignore includes:
   .env
   .env.*
   .env.*.local
   ```

2. **Rotate Channel Access Token regularly**
   - Go to LINE Console → Messaging API → Issue new token
   - Update `.env.sands`
   - Restart server

3. **Validate booking modifications**
   - Verify customer identity before processing
   - Confirm booking reference number
   - Send confirmation messages

4. **Protect sensitive booking information**
   - Don't display full booking details in logs
   - Encrypt data in transit (HTTPS)
   - Use secure database for session storage

---

## 📚 Additional Resources

- **LINE Documentation**: https://developers.line.biz/en/
- **Booking API Integration**: Contact Sands Hotel team
- **Live Chat API**: Contact Avaya support

---

**Last Updated**: 2026-02-20
**Status**: ✅ Production Ready
