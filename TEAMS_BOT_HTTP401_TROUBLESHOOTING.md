# Teams Bot HTTP 401 Authorization Error - Comprehensive Fix Guide

## Problem
Bot receives messages successfully but fails to send Adaptive Card responses with:
```
❌ Error sending Adaptive Card
HTTP 401: Authorization has been denied for this request
```

## Root Cause
The HTTP 401 error occurs during **outbound OAuth token generation**. When the bot tries to send a message back to Teams, the BotFrameworkAdapter cannot generate a valid OAuth token because credentials are incorrect or mismatched.

---

## Step-by-Step Verification Checklist

### **Step 1: Verify App Registration in Azure Portal**

1. Go to [Azure Portal](https://portal.azure.com)
2. Search for **App registrations**
3. Find your Teams bot app (e.g., `FAB Bank Teams Bot`)
4. **Copy the Application (client) ID** - save this for verification

---

### **Step 2: Verify Client Secret in Azure Portal**

1. In the same app registration, click **Certificates & secrets** (left sidebar)
2. Under **Client secrets**, you should see your secret with description (e.g., `bot-secret`)
3. **IMPORTANT**: The secret value is ONLY shown once when you create it
4. Check the **Expiration** date - if it says "Expired", create a new one:
   - Click **+ New client secret**
   - Enter description: `bot-secret`
   - Select expiration: **24 months** (or longer)
   - Click **Add**
   - **IMMEDIATELY COPY** the secret Value (NOT the ID)

---

### **Step 3: Verify Tenant ID in Azure Portal**

1. In Azure Portal, search for **Azure Active Directory**
2. Click **Tenant information**
3. **Copy the Tenant ID** - this is your Microsoft Entra ID directory ID

---

### **Step 4: Update .env File with Verified Credentials**

**CRITICAL**: Values must match **EXACTLY** (no extra spaces, no truncation)

Edit `.env.teams-fabbank`:

```bash
# Teams Bot Framework Credentials - FROM AZURE PORTAL
TEAMS_FABBANK_APP_ID=<APPLICATION_ID_FROM_AZURE>
TEAMS_FABBANK_APP_PASSWORD=<SECRET_VALUE_FROM_AZURE_CERTIFICATES_&_SECRETS>
TEAMS_FABBANK_MICROSOFT_APP_TENANT_ID=<TENANT_ID_FROM_AZURE>
```

**Example** (with real values):
```bash
TEAMS_FABBANK_APP_ID=bd74fdbe-b319-415c-bc3d-d09c15cfc8ee
TEAMS_FABBANK_APP_PASSWORD=H6_8Q~xHCA5Hb4V7tEr-JTns3Kz72kJ00UZMOahL
TEAMS_FABBANK_MICROSOFT_APP_TENANT_ID=070760c9-5bc3-44ab-a4fe-ee465c541500
```

---

### **Step 5: Verify Azure Bot Service Configuration**

1. In Azure Portal, search for **Bot services** or **Bot channels registration**
2. Find your Teams bot resource
3. Go to **Configuration**
4. Verify the **Microsoft App ID** matches your Application ID
5. Verify the **Microsoft App password** (it shows as `*****`) was set to your client secret
6. **Save** if you made any changes

---

### **Step 6: Verify Teams Channel in Azure Bot Service**

1. In your Bot Service, click **Channels**
2. You should see **Teams** channel listed with a checkmark
3. If Teams channel is missing:
   - Click **+ Add a channel**
   - Select **Teams**
   - Click **Connect**

---

### **Step 7: Verify ngrok Tunnel Configuration**

The webhook URL in Teams Channel must point to your ngrok URL:

1. Start ngrok: `ngrok http 3002` (or your bot port)
2. Copy the HTTPS URL (e.g., `https://xxxxx.ngrok-free.dev`)
3. In Azure Bot Service > Channels > Teams:
   - Verify the webhook URL is: `https://xxxxx.ngrok-free.dev/api/teams/webhook`
4. This URL must match where Teams will send messages

---

### **Step 8: Check Environment Variables Load Correctly**

Restart your bot and check the startup logs:

```bash
npm run dev
```

Look for this diagnostic output:

```
📋 ========== TEAMS BOT CREDENTIALS DIAGNOSTIC ==========
📌 Bot ID: teams-fabbank
📌 App ID (full): bd74fdbe-b319-415c-bc3d-d09c15cfc8ee
📌 App ID (masked): bd74fdbe...cfc8ee
📌 App Password Present: YES ✅
📌 App Password Length: 40 characters
📌 Tenant ID (full): 070760c9-5bc3-44ab-a4fe-ee465c541500
📌 Tenant ID (masked): 070760c9...c541500
📌 Auth Method: DirectCredentials
📌 Adapter Type: BotFrameworkAdapter
========================================================
```

**If App Password shows "NO ❌"**: Your .env file is not loaded correctly.

---

### **Step 9: Test with a Simple Message**

1. In Teams, send a message to your bot: `hello`
2. Check logs for:
   - **Service URL sanitization message** (should show original → cleaned URL)
   - **Outbound message diagnostic** (should show credentials present)
   - If HTTP 401 occurs, you'll see a diagnostic error with current config values

---

## Common Issues & Solutions

| Issue | Solution |
|-------|----------|
| App Password shows "NO ❌" | Restart bot. Check .env file path. Verify TEAMS_FABBANK_APP_PASSWORD is set. |
| HTTP 401 error persists | Check if app password is expired. Create new secret in Azure. Update .env. Restart bot. |
| "AADSTS700016" error | App ID doesn't exist in Azure tenant. Verify Azure App registration ID matches .env. |
| Service URL has tenant ID | Service URL sanitization in code fixes this automatically. Check logs to verify sanitization. |
| Bot doesn't receive messages | Webhook URL in Teams Channel doesn't match ngrok URL. Update Channel configuration. |

---

## Detailed OAuth Token Flow

When you call `context.sendActivity()`:

```
1. BotFrameworkAdapter extracts credentials from constructor
   ✅ App ID: bd74fdbe-b319-415c-bc3d-d09c15cfc8ee
   ✅ App Password: H6_8Q~xHCA5Hb4V7tEr-JTns3Kz72kJ00UZMOahL

2. Adapter makes HTTP POST to:
   https://login.microsoftonline.com/{tenantId}/oauth2/v2.0/token

3. Request body contains:
   {
     "grant_type": "client_credentials",
     "client_id": "bd74fdbe-b319-415c-bc3d-d09c15cfc8ee",
     "client_secret": "H6_8Q~xHCA5Hb4V7tEr-JTns3Kz72kJ00UZMOahL",
     "scope": "https://api.botframework.com/.default"
   }

4. If credentials are WRONG:
   ❌ Login.microsoftonline.com rejects request
   ❌ OAuth token generation fails
   ❌ Adapter gets HTTP 401
   ❌ context.sendActivity() throws 401 error

5. If credentials are CORRECT:
   ✅ OAuth token returned
   ✅ Adapter uses token to send message to Teams
   ✅ Teams receives Adaptive Card
   ✅ User sees response
```

---

## Quick Restart Steps After Fixing Credentials

```bash
# 1. Stop the bot (Ctrl+C)

# 2. Verify .env file has correct values
cat .env.teams-fabbank

# 3. Start the bot
npm run dev

# 4. Send test message in Teams
# Watch logs for HTTP 401 error or success message
```

---

## Still Getting HTTP 401?

If you've verified all steps above and still get HTTP 401:

1. **Check Azure Portal again** - Copy values again to be 100% sure
2. **Verify no hidden characters** - Paste into text editor, check for spaces at ends
3. **Check Tenant ID** - Azure has both "Tenant ID" and "Directory (tenant) ID" - use the latter
4. **Create new secret** - Old secrets may be corrupted. Create new 24-month secret in Certificates & secrets
5. **Verify ngrok URL** - Make sure Teams Channel points to correct ngrok tunnel URL
6. **Check .env file loading** - Restart bot and look for credential diagnostic in logs

---

## Reference: File Locations

- **Bot Service**: `src/bots/teams-fabbank/services/teamsService.js`
- **Activity Controller**: `src/bots/teams-fabbank/controllers/activityController.js`
- **Configuration**: `.env.teams-fabbank`
- **Bot Config Class**: `src/bots/teams-fabbank/config.js`
- **App Router**: `src/app.js` (lines 134-149 for Teams webhook)
