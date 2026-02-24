# Telegram FAB Bank Bot - Deployment Guide

**Bot ID**: `telegram-fabbank`
**Platform**: Telegram Bot API
**Features**: Check Balance, Card Services, Mini Statement, Live Chat
**Configuration File**: `config/telegram-fabbank.json`
**Environment File**: `.env.telegram-fabbank`

---

## 📋 Prerequisites

- Node.js v14+
- npm v6+
- Telegram Account (free)
- FAB Bank API Access
- Live Chat API URL (for Avaya integration)
- Ngrok (optional, for local webhook testing)
- Grammy library (Telegram framework - included)

---

## 🎯 What You Need to Deploy

### 1. **Telegram Bot Token**
   - Create via BotFather on Telegram
   - Looks like: `123456:ABCDEFGHIJKLmnopqrst`

### 2. **Banking API Credentials**
   - Banking API URL
   - API Timeout (milliseconds)

### 3. **Live Chat Integration**
   - Live Chat API URL
   - Avaya Tenant ID (default: SHOWMEAVAYA)

### 4. **Webhook Configuration** (for production)
   - Public webhook URL
   - Or use polling (simpler for development)

---

## 🔧 Step-by-Step Deployment

### Step 1: Create Telegram Bot via BotFather

1. Open **Telegram App** on your phone or desktop
2. Search for and open **@BotFather** (official Telegram bot creator)
3. Send message: `/start`
4. Send message: `/newbot`
5. **BotFather asks:**
   - "Alright, a new bot. How are we going to call it?"
   - Reply: `FAB Bank Bot` (or any name you prefer)
   - "Good. Now let's choose a username for your bot."
   - Reply: `fab_bank_bot_<yourname>` (must be unique and end with "bot")
6. **BotFather responds with:**
   - ✅ Bot created successfully!
   - 🔑 **Token**: `<your_token_here>` - **SAVE THIS**
   - 📱 Link to add bot

**Example Token Format:**
```
123456789:ABCDEFGHIJKLmnopqrstuVWXYZabcdef
```

### Step 2: Configure Bot Settings (Optional but Recommended)

After bot creation, send BotFather these commands:

```
/setcommands
```

Then provide:
```
start - Start the bot
help - Show help
menu - Show main menu
```

### Step 3: Get FAB Banking API Credentials

Contact FAB Bank technical team for:
- **Banking API URL**: `https://api.bankfab.com/v1/...` (sandbox or production)
- **API Key/Authentication**: If required
- **API Timeout**: Typically 5000ms

### Step 4: Get Live Chat API URL

Contact Avaya/Live Chat provider for:
- **Live Chat API URL**: Base URL for live chat endpoints
- **Tenant ID**: Organization identifier (default: SHOWMEAVAYA)
- **Authentication**: API key if required

### Step 5: Create `.env.telegram-fabbank` File

Create file: `FABLineChatbot/.env.telegram-fabbank`

```env
# ================================================
# Telegram FAB Bank Bot Configuration
# ================================================

# Telegram Bot Credentials (REQUIRED)
# Get from BotFather: @BotFather on Telegram
TELEGRAM_FABBANK_TOKEN=<your_bot_token_from_botfather>

# Connection Method (REQUIRED - choose one)
# polling: Works locally, polls Telegram for updates
# webhook: Production setup, requires public URL
TELEGRAM_FABBANK_MODE=polling

# Webhook Configuration (only if using webhook mode)
# TELEGRAM_FABBANK_WEBHOOK_URL=https://your-domain.com/webhook/telegram-fabbank
# TELEGRAM_FABBANK_WEBHOOK_SECRET=<random-secret-string>

# Banking API Configuration (REQUIRED)
# Contact FAB Bank technical team
TELEGRAM_FABBANK_BANKING_API_URL=https://api.bankfab.com/v1/banking
TELEGRAM_FABBANK_BANKING_API_TIMEOUT=5000

# Live Chat Configuration (REQUIRED)
# Contact your Avaya/Live Chat provider
TELEGRAM_FABBANK_LIVE_CHAT_API_URL=https://your-livechat-server.com:6509/api
TELEGRAM_FABBANK_LIVE_CHAT_TIMEOUT=20000

# Avaya Tenant ID (for live chat routing)
TELEGRAM_FABBANK_AVAYA_TENANT=SHOWMEAVAYA

# Welcome Message Configuration (OPTIONAL)
TELEGRAM_FABBANK_WELCOME_IMAGE=https://www.bankfab.com/images/banner.jpg

# Session & Authentication (OPTIONAL)
TELEGRAM_FABBANK_SESSION_TIMEOUT=300000
TELEGRAM_FABBANK_OTP_EXPIRY=300
```

### Step 6: Update `config/telegram-fabbank.json` (if needed)

Most settings are already configured:

```json
{
  "botName": "FAB Bank Telegram Bot",
  "welcomeImage": "https://www.bankfab.com/images/banner.jpg",
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

### Step 7: Choose Connection Mode

**For Local Development (Recommended for Testing):**

Use **Polling Mode** (already configured):
```env
TELEGRAM_FABBANK_MODE=polling
```
- No webhook needed
- Works behind firewalls
- Simpler to set up
- Slightly higher latency

**For Production Deployment:**

Use **Webhook Mode**:
```env
TELEGRAM_FABBANK_MODE=webhook
TELEGRAM_FABBANK_WEBHOOK_URL=https://your-domain.com/webhook/telegram-fabbank
TELEGRAM_FABBANK_WEBHOOK_SECRET=your-random-secret-key
```
- Lower latency
- Requires public URL with HTTPS
- Requires SSL certificate
- More scalable

---

## 🚀 Running the Bot

### Installation

```bash
# Navigate to project directory
cd FABLineChatbot

# Install dependencies
npm install
```

### Start the Server

**Development Mode (Polling):**
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
✓ Telegram FAB Bank bot (telegram-fabbank) registered
✓ Bot polling started (or webhook active)
```

---

## 📱 Testing the Bot

### 1. Find and Add Bot to Telegram

**Option A: Search by username**
1. Open Telegram
2. Click "Search" (magnifying glass)
3. Search for your bot username: `@fab_bank_bot_<yourname>`
4. Click on result and click "START"

**Option B: Use bot link**
1. From BotFather response, use the link provided
2. Click link → Opens Telegram → Click "START"

### 2. Test Basic Features

Send these messages to test:

| Action | Send | Expected Response |
|--------|------|-------------------|
| **Start** | `/start` | Welcome message with buttons |
| **Help** | `/help` | Help information |
| **Menu** | `/menu` | Main menu |
| **Check Balance** | Click button or `/balance` | "Enter phone number:" |
| **OTP Verification** | `<phone>` then `<otp>` | "Enter OTP:" then balance info |
| **Card Services** | Click button | Card options |
| **Live Chat** | Click button | Live chat connection |
| **End Session** | `/end` | "Session ended" message |

### 3. Verify Bot is Working

Check server logs for:
```
✓ Update received from Telegram
✓ User message processed
✓ Response sent to user
```

---

## ✅ Verification Checklist

- [ ] `.env.telegram-fabbank` file created with all required variables
- [ ] Telegram bot token is valid (created via BotFather)
- [ ] Bot can be found and added from Telegram app
- [ ] Banking API URL is accessible and working
- [ ] Live Chat API URL is configured
- [ ] Server starts without errors: `npm run dev`
- [ ] Bot responds to `/start` command
- [ ] Bot displays welcome message
- [ ] Main menu buttons appear and are clickable
- [ ] All features respond without errors
- [ ] No "Error" messages in server logs
- [ ] Polling is active and receiving updates

---

## 🔍 Troubleshooting

### Issue: Bot doesn't respond to messages

**Solution:**
1. Verify token in `.env.telegram-fabbank` is correct
   - Copy exactly from BotFather message
   - No extra spaces
2. Check server is running: `npm run dev`
3. Check logs for error messages
4. Verify polling mode is active
5. Try restarting server

### Issue: "Invalid Token" error

**Solution:**
1. Go back to BotFather
2. Send `/token`
3. Select your bot
4. Copy new token and update `.env.telegram-fabbank`
5. Restart server

### Issue: Bot doesn't appear in Telegram search

**Solution:**
1. Verify bot name is unique (ends with "bot")
2. Ask BotFather for bot link: `/token` → select bot → copy link
3. Share link directly with users
4. Users can also find via forward → Recent → Your Bot

### Issue: Banking API calls fail

**Solution:**
1. Verify `TELEGRAM_FABBANK_BANKING_API_URL` is correct
2. Test API manually: `curl <api-url>/health`
3. Check if API requires authentication headers
4. Verify timeout is sufficient: `TELEGRAM_FABBANK_BANKING_API_TIMEOUT`

### Issue: Live chat not connecting

**Solution:**
1. Verify `TELEGRAM_FABBANK_LIVE_CHAT_API_URL` is correct and accessible
2. Confirm `TELEGRAM_FABBANK_AVAYA_TENANT` is correct
3. Test endpoint: `curl <live-chat-url>/health`
4. Check if authentication is required

### Issue: "User already has active session"

**Solution:**
1. User's session hasn't expired yet
2. Increase `TELEGRAM_FABBANK_SESSION_TIMEOUT` if needed (in milliseconds)
3. Or wait for session to expire (default: 5 minutes)

---

## 📊 Bot Architecture

```
FABLineChatbot
├── src/bots/telegram-fabbank/
│   ├── config.js                    # Bot configuration
│   ├── index.js                     # Bot initialization
│   ├── handlers/
│   │   ├── commandHandler.js       # /start, /help, /menu
│   │   ├── messageHandler.js       # Regular text messages
│   │   ├── callbackHandler.js      # Button clicks
│   │   ├── inlineHandler.js        # Inline buttons
│   │   └── liveChatHandler.js      # Live chat routing
│   └── services/
│       ├── telegramService.js      # Telegram API wrapper
│       ├── bankingService.js       # Banking API client
│       ├── sessionService.js       # Session management
│       ├── dialogManager.js        # Conversation flow
│       ├── liveChatService.js      # Live chat integration
│       └── templateService.js      # Message templates
├── .env.telegram-fabbank           # Bot credentials
└── config/telegram-fabbank.json    # Bot settings
```

---

## 📡 Polling vs Webhook

### Polling Mode (Recommended for Development)
**Advantages:**
- ✅ No webhook needed
- ✅ Works behind firewalls
- ✅ No HTTPS/SSL required
- ✅ Simpler setup

**Disadvantages:**
- ❌ Slightly higher latency
- ❌ More bandwidth usage
- ❌ Not ideal for high-volume bots

### Webhook Mode (Recommended for Production)
**Advantages:**
- ✅ Lower latency
- ✅ More efficient
- ✅ Better for high volume
- ✅ Industry standard

**Disadvantages:**
- ❌ Requires public URL
- ❌ Requires SSL certificate
- ❌ More complex setup
- ❌ Firewall whitelist needed

**To switch to webhook mode:**
```env
# 1. Update .env.telegram-fabbank
TELEGRAM_FABBANK_MODE=webhook
TELEGRAM_FABBANK_WEBHOOK_URL=https://your-domain.com/webhook/telegram-fabbank
TELEGRAM_FABBANK_WEBHOOK_SECRET=your-random-secret-key

# 2. Ensure your server has public HTTPS URL
# 3. Update webhook route in app.js (if not already done)
# 4. Restart server
```

---

## 🔐 Security Best Practices

1. **Protect your bot token**
   ```bash
   # Add to .gitignore
   .env
   .env.*
   .env.*.local
   ```

2. **Rotate token if compromised**
   - Go to BotFather → `/token` → select bot → get new token
   - Update `.env.telegram-fabbank`
   - Restart server

3. **Use webhook secret in production**
   - Generate random secret: `node -e "console.log(require('crypto').randomBytes(32).toString('hex'))"`
   - Set `TELEGRAM_FABBANK_WEBHOOK_SECRET`
   - Verify signature on incoming requests

4. **Enable two-factor authentication**
   - On Telegram account (Settings → Privacy)
   - Protects bot owner's account

5. **Monitor bot activity**
   - Set up logs for all API calls
   - Alert on suspicious patterns
   - Track error rates

---

## 📚 Additional Resources

- **Telegram Bot API**: https://core.telegram.org/bots/api
- **Grammy (Framework)**: https://grammy.dev/
- **BotFather Commands**: Send `/help` to @BotFather
- **Telegram Security**: https://core.telegram.org/bots/faq

---

## 🎓 Next Steps

1. **Deploy to production** when ready
2. **Switch to webhook mode** for better performance
3. **Set up monitoring** and alerting
4. **Gather analytics** on user engagement
5. **Collect feedback** for improvements

---

**Last Updated**: 2026-02-20
**Status**: ✅ Production Ready
