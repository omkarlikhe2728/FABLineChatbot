# Microsoft Teams FAB Bank Bot - Deployment Guide

**Bot ID**: `teams-fabbank`
**Platform**: Microsoft Teams (Bot Framework)
**Features**: Check Balance, Card Services, Mini Statement, Live Chat
**Configuration File**: `config/teams-fabbank.json`
**Environment File**: `.env.teams-fabbank`

---

## 📋 Prerequisites

- Node.js v14+
- npm v6+
- Microsoft Azure Account (free tier available)
- Microsoft Teams Access
- FAB Bank API Access
- Live Chat API URL
- Ngrok (for local testing)
- Azure Bot Service registration

---

## 🎯 What You Need to Deploy

### 1. **Azure Bot Service Credentials**
   - App ID (Azure Application ID)
   - App Password (Azure Application Secret)
   - Tenant ID (Azure AD Tenant ID)

### 2. **Banking API Credentials**
   - Banking API URL
   - API Timeout (milliseconds)

### 3. **Live Chat Integration**
   - Live Chat API URL
   - Avaya Tenant ID (default: SHOWMEAVAYA)

### 4. **Teams Configuration**
   - Bot Display Name
   - Bot Description
   - App manifest (if publishing to Teams store)

---

## 🔧 Step-by-Step Deployment

### Step 1: Create Azure Bot Service

1. Go to [Azure Portal](https://portal.azure.com)
2. Click **Create a resource** → Search for **"Bot Service"**
3. Click **Create** on "Bot Service"
4. Fill in the form:
   - **Resource group**: Create new (e.g., "fabbank-bots")
   - **Name**: `fabbank-teams-bot` (must be unique)
   - **Pricing tier**: **Free (F0)** or **Standard (S1)**
   - **Bot template**: **Echo Bot**
5. Click **Create** (takes 1-2 minutes)

### Step 2: Register Azure Application

1. Once Bot Service is created, go to **Settings** → **Configuration**
2. You'll see **Microsoft App ID** → Copy this (this is your App ID)
3. Click **Manage** next to Microsoft App ID
4. Go to **Certificates & secrets** → **New client secret**
5. Create new secret:
   - **Description**: `FabBank Teams Bot`
   - **Expires**: Never (or your preference)
6. Copy the **Value** (this is your App Password)
   - ⚠️ **SAVE THIS IMMEDIATELY** - you can't see it again!

**You now have:**
- ✅ **App ID**: Alphanumeric string
- ✅ **App Password**: Looks like `abcD~XyZ...` (keep secret!)

### Step 3: Get Tenant ID

1. In Azure Portal, go to **Azure Active Directory**
2. Go to **Overview** → Find **Tenant ID** (UUID format)
3. Copy and save this

**You now have:**
- ✅ **Tenant ID**: UUID (e.g., `12345678-1234-5678-1234-567890123456`)

### Step 4: Get FAB Banking API Credentials

Contact FAB Bank technical team for:
- **Banking API URL**: `https://api.bankfab.com/v1/...`
- **API Authentication**: If required
- **API Timeout**: Typically 5000ms

### Step 5: Get Live Chat API URL

Contact Avaya/Live Chat provider for:
- **Live Chat API URL**: Base URL for live chat endpoints
- **Tenant ID**: Organization identifier (SHOWMEAVAYA)
- **Authentication**: API key if required

### Step 6: Create `.env.teams-fabbank` File

Create file: `FABLineChatbot/.env.teams-fabbank`

```env
# ================================================
# Microsoft Teams FAB Bank Bot Configuration
# ================================================

# Azure Bot Service Credentials (REQUIRED)
# Get from Azure Portal → Bot Service → Settings → Configuration
TEAMS_FABBANK_APP_ID=<your_microsoft_app_id>
TEAMS_FABBANK_APP_PASSWORD=<your_microsoft_app_password>
TEAMS_FABBANK_MICROSOFT_APP_TENANT_ID=<your_azure_tenant_id>

# Banking API Configuration (REQUIRED)
# Contact FAB Bank technical team
TEAMS_FABBANK_BANKING_API_URL=https://api.bankfab.com/v1/banking
TEAMS_FABBANK_BANKING_API_TIMEOUT=5000

# Live Chat Configuration (REQUIRED)
# Contact your Avaya/Live Chat provider
TEAMS_FABBANK_LIVE_CHAT_API_URL=https://your-livechat-server.com:6509/api
TEAMS_FABBANK_LIVE_CHAT_TIMEOUT=20000

# Avaya Tenant ID (for live chat routing)
TEAMS_FABBANK_AVAYA_TENANT=SHOWMEAVAYA

# Bot Display Configuration (OPTIONAL)
TEAMS_FABBANK_BOT_NAME=FAB Bank Bot
TEAMS_FABBANK_BOT_DESCRIPTION=Banking services for FAB Bank customers

# Session & Authentication (OPTIONAL)
TEAMS_FABBANK_SESSION_TIMEOUT=300000
TEAMS_FABBANK_OTP_EXPIRY=300

# Webhook Base URL (REQUIRED for production)
# Local: https://your-ngrok-url.ngrok-free.dev
# Production: https://your-domain.com
TEAMS_FABBANK_BOT_BASE_URL=https://your-ngrok-url.ngrok-free.dev
```

### Step 7: Update `config/teams-fabbank.json` (if needed)

Most settings are pre-configured. You can override:

```json
{
  "botName": "FAB Bank Teams Bot",
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

### Step 8: Set Webhook URL in Azure Bot Service

1. Go to Azure Portal → Your Bot Service → **Settings** → **Configuration**
2. Find **Messaging endpoint**
3. Set it to:
   - **Local (Development)**: `https://<your-ngrok-url>/api/teams/webhook`
   - **Production**: `https://your-domain.com/api/teams/webhook`
4. Click **Apply**

**Example with Ngrok:**
```
https://abc123def456.ngrok-free.dev/api/teams/webhook
```

### Step 9: Set Up Ngrok for Local Testing (Optional)

If testing locally, use Ngrok to create a public tunnel:

```bash
# Download ngrok from https://ngrok.com
# Or if installed via npm:
npm install -g ngrok

# Start ngrok tunnel
ngrok http 3001

# Copy the HTTPS URL (e.g., https://abc123def456.ngrok-free.dev)
# Update TEAMS_FABBANK_BOT_BASE_URL in .env.teams-fabbank
```

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
✓ Teams FAB Bank bot (teams-fabbank) registered
✓ Webhook: POST /api/teams/webhook active
```

---

## 📱 Testing the Bot in Teams

### 1. Add Bot to Teams

**Option A: Use Azure Portal**
1. Go to Azure Portal → Your Bot Service
2. Click **Test in Web Chat** to test instantly
3. Or: **Channels** → **Teams** → Click **Configure**
4. Link to Teams app marketplace

**Option B: Direct Teams Installation**
1. Open Microsoft Teams app
2. Click **+ Create app** or **Browse app gallery**
3. Search for your bot by name (if published)
4. Or use installation link from Azure Bot Service

### 2. Test Features

Send messages to test:

| Feature | Action | Expected Response |
|---------|--------|-------------------|
| **Start** | Send any message or `/help` | Welcome card + buttons |
| **Check Balance** | Click "Check Balance" button | "Enter phone number:" |
| **OTP Verification** | Enter phone then OTP | Balance information |
| **Card Services** | Click "Card Services" button | Card options |
| **Mini Statement** | Click "Mini Statement" button | Transaction list |
| **Live Chat** | Click "Live Chat" button | Adaptive card with live chat connection |
| **End Session** | Click "End Session" button | Session ended confirmation |

### 3. Verify Webhook Connection

Azure Bot Service automatically logs webhook calls:
1. Go to Azure Portal → Bot Service → **Test in Web Chat**
2. Send test message
3. Should see immediate response
4. Or check server logs for webhook delivery

---

## ✅ Verification Checklist

- [ ] `.env.teams-fabbank` created with all required variables
- [ ] Azure App ID, App Password, and Tenant ID are valid
- [ ] Webhook URL set correctly in Azure Bot Service configuration
- [ ] Banking API URL is accessible and working
- [ ] Live Chat API URL is configured
- [ ] Server starts without errors: `npm run dev`
- [ ] Ngrok tunnel is active (if testing locally)
- [ ] Bot can be added to Teams
- [ ] "Test in Web Chat" works in Azure Portal
- [ ] Welcome message displays with adaptive card
- [ ] All 4 buttons visible (Check Balance, Card Services, Live Chat, End Session)
- [ ] Button clicks trigger correct dialog states
- [ ] No "error" messages in server logs
- [ ] Adaptive cards render correctly in Teams

---

## 🔍 Troubleshooting

### Issue: Bot doesn't respond in Teams

**Solution:**
1. Verify Azure App ID and App Password in `.env.teams-fabbank`
2. Check webhook URL in Azure Bot Service matches your ngrok URL
3. Ensure ngrok tunnel is running: `ngrok http 3001`
4. Restart server: `npm run dev`
5. Check server logs for webhook handler errors

### Issue: "Invalid Authentication" error

**Solution:**
1. Verify Azure App ID is correct (copy exactly from Azure Portal)
2. Verify App Password is correct (⚠️ paste carefully - long string with `~`)
3. If unsure, generate new client secret in Azure:
   - Azure Portal → App Registrations → Your app → Certificates & secrets
   - Delete old secret, create new one
   - Update `.env.teams-fabbank`
   - Restart server

### Issue: "Unauthorized" when accessing banking API

**Solution:**
1. Verify banking API credentials are correct
2. Test API manually: `curl TEAMS_FABBANK_BANKING_API_URL/health`
3. Check if API requires authentication headers
4. Verify timeout is sufficient: `TEAMS_FABBANK_BANKING_API_TIMEOUT`

### Issue: Webhook URL verification fails

**Solution:**
1. Check ngrok is running: `ngrok http 3001`
2. Verify webhook URL format: `https://ngrok-url/api/teams/webhook`
3. Ensure `/api/teams/webhook` route exists in `app.js`
4. Restart server and retry in Azure Portal

### Issue: Adaptive cards not rendering correctly

**Solution:**
1. Verify adaptive card JSON format is valid
2. Check Teams client version (update Teams if needed)
3. Test with simpler card first
4. Review server logs for card generation errors

### Issue: Session timeout or "User already has active session"

**Solution:**
1. Check `TEAMS_FABBANK_SESSION_TIMEOUT` value (in milliseconds, default 5 minutes)
2. Increase timeout if needed: `TEAMS_FABBANK_SESSION_TIMEOUT=600000` (10 minutes)
3. Restart server
4. Or clear session manually and test again

---

## 📊 Bot Architecture

```
FABLineChatbot
├── src/bots/teams-fabbank/
│   ├── config.js                    # Bot configuration
│   ├── index.js                     # Bot initialization
│   ├── controllers/
│   │   └── webhookController.js    # Teams webhook handler
│   ├── handlers/
│   │   ├── messageHandler.js       # Regular messages
│   │   ├── callbackHandler.js      # Button actions
│   │   └── liveChatHandler.js      # Live chat routing
│   └── services/
│       ├── teamsService.js         # Teams API wrapper
│       ├── bankingService.js       # Banking API client
│       ├── sessionService.js       # Session management
│       ├── dialogManager.js        # Conversation flow
│       ├── liveChatService.js      # Live chat integration
│       ├── templateService.js      # Adaptive card templates
│       └── tokenService.js         # OAuth token generation
├── .env.teams-fabbank              # Bot credentials
└── config/teams-fabbank.json       # Bot settings
```

---

## 🔐 Security Best Practices

1. **Never commit `.env.teams-fabbank`**
   ```bash
   # Add to .gitignore
   .env
   .env.*
   .env.*.local
   ```

2. **Rotate App Password regularly**
   - Go to Azure Portal → App Registrations → Your app → Certificates & secrets
   - Delete old secret, create new one
   - Update `.env.teams-fabbank`
   - Restart server

3. **Use HTTPS in production**
   - Replace ngrok URL with actual domain
   - Install SSL certificate
   - Update webhook URL in Azure Bot Service

4. **Restrict Bot Framework credentials scope**
   - App Password should only have bot-related permissions
   - Review Azure app permissions in Azure Portal

5. **Monitor webhook logs**
   - Set up Application Insights in Azure Portal
   - Monitor error rates and response times
   - Alert on authentication failures

6. **Validate user identity**
   - Implement OTP verification flow
   - Don't display sensitive data without authentication
   - Verify user before processing banking operations

---

## 📡 Deployment Environments

### Development (Local with Ngrok)
```env
TEAMS_FABBANK_BOT_BASE_URL=https://your-ngrok-url.ngrok-free.dev
NODE_ENV=development
LOG_LEVEL=debug
```

### Production (On Server)
```env
TEAMS_FABBANK_BOT_BASE_URL=https://your-domain.com
NODE_ENV=production
LOG_LEVEL=info
```

---

## 📚 Additional Resources

- **Microsoft Teams Developer Portal**: https://dev.teams.microsoft.com
- **Bot Framework Documentation**: https://docs.microsoft.com/en-us/azure/bot-service/
- **Adaptive Cards Designer**: https://adaptivecards.io/designer/
- **Teams Webhook Reference**: https://docs.microsoft.com/en-us/azure/bot-service/rest-api/bot-framework-rest-connector-api-reference

---

## 🎓 Next Steps

1. **Test bot thoroughly** in Teams
2. **Set up Application Insights** for monitoring
3. **Configure webhook logging** for debugging
4. **Test with multiple users** in Teams channel
5. **Deploy to production** with HTTPS domain

---

**Last Updated**: 2026-02-20
**Status**: ✅ Production Ready (with known HTTP 401 workaround applied - see MEMORY.md)
