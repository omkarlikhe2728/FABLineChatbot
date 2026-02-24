# Microsoft Teams IT Support Bot - Deployment Guide

**Bot ID**: `teams-itsupport`
**Platform**: Microsoft Teams (Bot Framework)
**Features**: Ticket Management, Knowledge Base, IT Support Services
**Configuration File**: `config/teams-itsupport.json`
**Environment File**: `.env.teams-itsupport`

---

## 📋 Prerequisites

- Node.js v14+
- npm v6+
- Microsoft Azure Account
- Microsoft Teams Access
- IT Support System API Access (if integrating with existing system)
- Ngrok (for local testing)
- Azure Bot Service registration

---

## 🎯 What You Need to Deploy

### 1. **Azure Bot Service Credentials**
   - App ID (Azure Application ID)
   - App Password (Azure Application Secret)
   - Tenant ID (Azure AD Tenant ID)

### 2. **IT Support Integration** (Optional)
   - Support Ticket System API URL
   - API Authentication credentials
   - Knowledge Base API URL

### 3. **Teams Configuration**
   - Bot Display Name
   - Bot Icon/Logo
   - Teams Channel IDs (if channel-specific deployment)

---

## 🔧 Step-by-Step Deployment

### Step 1: Create Azure Bot Service

1. Go to [Azure Portal](https://portal.azure.com)
2. Click **Create a resource** → Search for **"Bot Service"**
3. Click **Create** on "Bot Service"
4. Fill in the form:
   - **Resource group**: Create new or use existing (e.g., "it-support-bots")
   - **Name**: `itsupport-teams-bot` (must be unique)
   - **Pricing tier**: **Free (F0)** or **Standard (S1)**
   - **Bot template**: **Echo Bot**
5. Click **Create** (takes 1-2 minutes)

### Step 2: Register Azure Application & Get Credentials

1. Once Bot Service is created, go to **Settings** → **Configuration**
2. Copy **Microsoft App ID** (your App ID)
3. Click **Manage** next to Microsoft App ID
4. Go to **Certificates & secrets** → **New client secret**
5. Create secret:
   - **Description**: `IT Support Teams Bot`
   - **Expires**: Never (or your preference)
6. Copy the **Value** (your App Password)
   - ⚠️ **SAVE IMMEDIATELY** - can't see it again!

**You now have:**
- ✅ **App ID**: Alphanumeric string
- ✅ **App Password**: Secret key

### Step 3: Get Azure Tenant ID

1. Go to **Azure Active Directory**
2. Go to **Overview** → Find **Tenant ID**
3. Copy and save

### Step 4: Create `.env.teams-itsupport` File

Create file: `FABLineChatbot/.env.teams-itsupport`

```env
# ================================================
# Microsoft Teams IT Support Bot Configuration
# ================================================

# Azure Bot Service Credentials (REQUIRED)
# Get from Azure Portal → Bot Service → Settings → Configuration
TEAMS_ITSUPPORT_APP_ID=<your_microsoft_app_id>
TEAMS_ITSUPPORT_APP_PASSWORD=<your_microsoft_app_password>
TEAMS_ITSUPPORT_MICROSOFT_APP_TENANT_ID=<your_azure_tenant_id>

# IT Support Integration (OPTIONAL)
# Contact your IT support system provider
TEAMS_ITSUPPORT_TICKET_API_URL=https://support-system.company.com/api/tickets
TEAMS_ITSUPPORT_TICKET_API_KEY=<your_api_key>
TEAMS_ITSUPPORT_KNOWLEDGE_BASE_URL=https://kb.company.com/api/search

# Bot Display Configuration (OPTIONAL)
TEAMS_ITSUPPORT_BOT_NAME=IT Support Bot
TEAMS_ITSUPPORT_BOT_DESCRIPTION=IT support and ticketing system

# Session & Authentication (OPTIONAL)
TEAMS_ITSUPPORT_SESSION_TIMEOUT=600000

# Webhook Base URL (REQUIRED for production)
# Local: https://your-ngrok-url.ngrok-free.dev
# Production: https://your-domain.com
TEAMS_ITSUPPORT_BOT_BASE_URL=https://your-ngrok-url.ngrok-free.dev
```

### Step 5: Update `config/teams-itsupport.json` (if needed)

Pre-configured settings can be customized:

```json
{
  "botName": "IT Support Bot",
  "features": {
    "ticketing": true,
    "knowledgeBase": true,
    "liveSupport": true,
    "statusCheck": true
  },
  "sessionTimeout": 600000,
  "supportChannels": ["support-team"]
}
```

### Step 6: Set Webhook URL in Azure

1. Go to Azure Portal → Your Bot Service → **Settings** → **Configuration**
2. Find **Messaging endpoint**
3. Set to:
   - **Local**: `https://<your-ngrok-url>/api/teams/webhook`
   - **Production**: `https://your-domain.com/api/teams/webhook`
4. Click **Apply**

---

## 🚀 Running the Bot

### Installation

```bash
cd FABLineChatbot
npm install
```

### Start the Server

**Development:**
```bash
npm run dev
```

**Production:**
```bash
npm start
```

---

## 📱 Testing the Bot

### 1. Add Bot to Teams

1. Open Microsoft Teams
2. Click **+ Create** or **Browse apps**
3. Search for your IT Support bot
4. Click **Add** to install

### 2. Test Features

Send messages to test:

| Feature | Action | Expected Response |
|---------|--------|-------------------|
| **Start** | Send any message | Welcome card + help text |
| **Create Ticket** | Click "Create Ticket" | Ticket creation form |
| **View Status** | Click "Check Ticket Status" | Status information |
| **Search KB** | Type "How to reset password" | Knowledge base results |
| **Live Support** | Click "Talk to Support" | Agent routing |

### 3. Verify in Azure Portal

1. Azure Portal → Bot Service → **Test in Web Chat**
2. Send test message
3. Should get immediate response

---

## ✅ Verification Checklist

- [ ] `.env.teams-itsupport` created with all required variables
- [ ] Azure App ID, App Password, Tenant ID are valid
- [ ] Webhook URL set correctly in Azure Bot Service
- [ ] Server starts without errors: `npm run dev`
- [ ] Ngrok tunnel active (if testing locally)
- [ ] Bot can be added to Teams
- [ ] Welcome message displays correctly
- [ ] All features respond without errors
- [ ] No errors in server logs

---

## 🔍 Troubleshooting

### Issue: "Invalid Authentication" error

**Solution:**
1. Verify App ID and App Password in `.env.teams-itsupport`
2. If unsure, generate new client secret in Azure:
   - Azure Portal → App Registrations → Your app → Certificates & secrets
   - Delete old, create new
   - Update `.env.teams-itsupport`
   - Restart server

### Issue: Webhook URL verification fails

**Solution:**
1. Check ngrok is running: `ngrok http 3001`
2. Verify URL format: `https://ngrok-url/api/teams/webhook`
3. Ensure route exists in `app.js`
4. Restart server and retry

### Issue: Bot doesn't respond

**Solution:**
1. Verify credentials are correct
2. Check server logs for errors
3. Ensure ngrok tunnel is active
4. Restart server

---

## 📊 Bot Architecture

```
FABLineChatbot
├── src/bots/teams-itsupport/
│   ├── config.js                # Bot configuration
│   ├── index.js                 # Bot initialization
│   ├── controllers/
│   │   └── webhookController.js # Teams webhook handler
│   ├── handlers/
│   │   └── messageHandler.js    # Message processing
│   └── services/
│       ├── teamsService.js      # Teams API wrapper
│       ├── ticketService.js     # Ticket system integration
│       └── kbService.js         # Knowledge base integration
├── .env.teams-itsupport         # Bot credentials
└── config/teams-itsupport.json  # Bot settings
```

---

## 🔐 Security Best Practices

1. **Protect credentials**
   - Never commit `.env.teams-itsupport`
   - Rotate App Password regularly

2. **Use HTTPS in production**
   - Replace ngrok URL with actual domain
   - Install SSL certificate

3. **Restrict API access**
   - Use API keys for ticket system
   - Implement rate limiting

4. **Monitor access**
   - Log all ticket operations
   - Alert on unusual activity

---

## 📚 Additional Resources

- **Microsoft Teams Developer Portal**: https://dev.teams.microsoft.com
- **Bot Framework Documentation**: https://docs.microsoft.com/en-us/azure/bot-service/

---

**Last Updated**: 2026-02-20
**Status**: ✅ Production Ready
