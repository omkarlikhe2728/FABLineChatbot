# Teams Bot Manual OAuth Token Generation - Debugging Guide

## Overview

Instead of relying on BotFrameworkAdapter to generate OAuth tokens automatically, you can now test token generation **directly** using the Microsoft Identity Platform. This helps you:

1. **Verify credentials are correct** - Test if App ID + Password work
2. **Identify credential issues** - Get specific error messages from OAuth endpoint
3. **Understand the OAuth flow** - See exactly what happens during token generation
4. **Debug HTTP 401 errors** - Know if the issue is credentials or adapter configuration

---

## Architecture: BotFrameworkAdapter vs Manual Token Generation

### **Before (Automatic - Current)**

```
Teams sends message
         ↓
BotFrameworkAdapter.process() receives request
         ↓
BotFrameworkAdapter validates incoming JWT ✅
         ↓
context.sendActivity() is called
         ↓
BotFrameworkAdapter internally:
  1. Reads appId and appPassword from constructor
  2. Makes HTTP POST to login.microsoftonline.com/oauth2/token
  3. If credentials wrong → HTTP 401 (doesn't show why)
  4. If credentials correct → Gets token and sends message ✅
```

**Problem:** If credentials are wrong, you only get "HTTP 401" without details about which credential is wrong.

### **Now (Manual Token Generation - For Testing)**

```
You call: GET /api/teams/test-token
         ↓
TokenService directly makes HTTP POST to:
  https://login.microsoftonline.com/{tenantId}/oauth2/v2.0/token
         ↓
Request body:
{
  "grant_type": "client_credentials",
  "client_id": "YOUR_APP_ID",
  "client_secret": "YOUR_APP_PASSWORD",
  "scope": "https://api.botframework.com/.default"
}
         ↓
Response analysis:
  ✅ HTTP 200 → Token generated, credentials are VALID
  ❌ HTTP 400 → Bad request (wrong client_id format or scope)
  ❌ HTTP 401 → Credentials rejected (wrong password or expired secret)
  ❌ Timeout → Can't reach Microsoft servers
```

**Benefit:** You get detailed error messages showing exactly what's wrong.

---

## Step 1: Test Token Generation Endpoint

### **Start Your Bot**

```bash
npm run dev
```

You should see diagnostic output:
```
📋 ========== TEAMS BOT CREDENTIALS DIAGNOSTIC ==========
📌 Bot ID: teams-fabbank
📌 App ID (full): YOUR_APP_ID_HERE
📌 App Password Present: YES ✅
📌 App Password Length: 40 characters
...
```

### **Test Token Generation**

Open your browser or use `curl`:

```bash
# Using curl
curl http://localhost:3002/api/teams/test-token

# Using PowerShell
Invoke-WebRequest http://localhost:3002/api/teams/test-token

# Using VS Code REST Client or Postman
GET http://localhost:3002/api/teams/test-token
```

### **Successful Response (Credentials Valid)**

```json
{
  "success": true,
  "token": {
    "length": 1234,
    "prefix": "eyJhbGciOiJSUzI1NiIsImtpZCI6IjEyMzQ1Ng...",
    "expiresAt": "2026-02-18T14:30:00.000Z"
  },
  "decoded": {
    "aud": "https://api.botframework.com",
    "iss": "https://sts.windows.net/YOUR_TENANT_ID_HERE/",
    "iat": 1739900400,
    "exp": 1739904000,
    "appid": "YOUR_APP_ID_HERE"
  }
}
```

**What this means:**
- ✅ Credentials are **100% valid**
- ✅ Microsoft Identity Platform accepted your request
- ✅ Token can be used to call Teams/Bot Framework APIs
- ✅ Token expires in 3600 seconds (1 hour)

### **Failed Response (Credentials Invalid)**

```json
{
  "success": false,
  "token": null,
  "decoded": null,
  "error": "Request failed with status code 401"
}
```

**Check logs for details:**

```
❌ ========== TOKEN GENERATION FAILED ==========
HTTP Status: 401
Error Message: invalid_client
Error Description: AADSTS7000215: Invalid client secret provided...
```

---

## Step 2: Interpret Error Responses

### **HTTP 401: Unauthorized**

```
Error: invalid_client
Description: AADSTS7000215: Invalid client secret provided
```

**Causes:**
1. ❌ App Password is wrong - doesn't match what's in Azure Portal
2. ❌ App Password is expired - created before today, set to expire
3. ❌ App ID is wrong - doesn't match Azure App registration

**Fix:**
1. Go to Azure Portal > App registrations > Your Bot
2. Click **Certificates & secrets**
3. Check if current secret is **Expired** (red X or past date)
4. If expired:
   - Click **Delete** (trash icon)
   - Click **+ New client secret**
   - Enter description: `bot-secret`
   - Select expiration: **24 months**
   - Click **Add**
   - **COPY THE VALUE** (not ID) - this is your new password
5. Update `.env.teams-fabbank`:
   ```bash
   TEAMS_FABBANK_APP_PASSWORD=<NEW_VALUE_FROM_AZURE>
   ```
6. Restart bot: `npm run dev`
7. Re-test: `curl http://localhost:3002/api/teams/test-token`

---

### **HTTP 400: Bad Request**

```
Error: invalid_request
Description: AADSTS90002: Tenant ID is invalid
```

**Causes:**
1. ❌ Tenant ID is wrong - doesn't match Azure AD directory
2. ❌ Tenant ID is malformed - extra characters or spaces
3. ❌ App doesn't exist in this tenant

**Fix:**
1. Go to Azure Portal > **Azure Active Directory**
2. Click **Tenant information**
3. Copy **Directory (tenant) ID** (UUID format)
4. Update `.env.teams-fabbank`:
   ```bash
   TEAMS_FABBANK_MICROSOFT_APP_TENANT_ID=YOUR_TENANT_ID_HERE
   ```
5. Restart bot and re-test

---

### **Timeout / No Response**

```
Error: Error: timeout of 10000ms exceeded
```

**Causes:**
1. ❌ Cannot reach `login.microsoftonline.com` - network issue
2. ❌ Firewall blocking OAuth endpoint
3. ❌ DNS resolution problem

**Fix:**
1. Check internet connection: `ping login.microsoftonline.com`
2. Try from another network (home WiFi vs office network)
3. Check if behind corporate proxy - may need proxy configuration

---

## Step 3: Token Inspection

When token generation succeeds, you get decoded token details:

```json
{
  "aud": "https://api.botframework.com",           // Who the token is for
  "iss": "https://sts.windows.net/.../",           // Who issued it
  "iat": 1739900400,                               // Issued at (Unix timestamp)
  "exp": 1739904000,                               // Expires at (Unix timestamp)
  "appid": "bd74fdbe-b319-415c-bc3d-d09c15cfc8ee"  // Your App ID
}
```

**How to verify expiry time:**

```bash
# Convert Unix timestamp to human-readable date (bash)
date -d @1739904000

# Or online: https://www.unixtimestamp.com/
# Enter: 1739904000
# Result: Wed Feb 18 2026 14:00:00 GMT
```

---

## Step 4: Integration with Outbound Messages

Once you've verified credentials work with `/api/teams/test-token`, the HTTP 401 error when sending messages suggests:

1. **Credentials are valid** ✅ (test-token proves it)
2. **Issue is with adapter configuration** ❌ (something in BotFrameworkAdapter setup)

### **Possible Adapter Issues:**

**Issue 1: Service URL Format**
- **Symptom:** Message sent but adapter fails to authenticate to Teams API
- **Fix:** `activityController.js` sanitizes this automatically
- **Verify:** Check logs for "Service URL sanitized" message

**Issue 2: Adapter Authentication Configuration**
- **Symptom:** Token generated but not used correctly
- **Fix:** Currently using `DirectCredentials` which is correct
- **Verify:** Check startup logs for "Auth Method: DirectCredentials"

**Issue 3: Scope Mismatch**
- **Symptom:** Token generated but Teams API rejects it
- **Fix:** Ensure scope is `https://api.botframework.com/.default`
- **Verify:** Check decoded token `aud` field equals `https://api.botframework.com`

---

## Complete Debugging Workflow

```
❌ HTTP 401 error when sending message
         ↓
1. Call GET /api/teams/test-token
         ↓
   ✅ success: true
   └─→ Credentials are VALID
       Go to Step 2 (Adapter configuration issue)

   ❌ success: false
   └─→ Credentials are INVALID
       Go to Step 2 (Fix credentials in Azure Portal)

2. Check error details in bot logs
   └─→ "invalid_client" → Fix client secret
   └─→ "invalid tenant" → Fix Tenant ID
   └─→ "timeout" → Network issue
   └─→ "success but still 401" → Adapter config issue

3. Fix issue and restart bot

4. Re-test: Call GET /api/teams/test-token
   └─→ Should show success: true now

5. Test message in Teams
   └─→ Should receive response or better error message
```

---

## Advanced: Using Tokens Directly (Advanced Users)

If you want to use the generated token directly (not through BotFrameworkAdapter), you can:

```javascript
// Get a token
const token = await teamsService.tokenService.getToken();

// Use it in API calls to Teams Bot Framework Connector
const config = {
  headers: {
    'Authorization': `Bearer ${token}`,
    'Content-Type': 'application/json'
  }
};

// Send message to Teams API
const response = await axios.post(
  `${context.activity.serviceUrl}v3/conversations/${context.activity.conversation.id}/activities`,
  {
    type: 'message',
    text: 'Hello from manual token!'
  },
  config
);
```

However, this is not recommended because BotFrameworkAdapter handles token caching and refresh automatically.

---

## Key Files Modified

| File | Purpose |
|------|---------|
| `src/bots/teams-fabbank/services/tokenService.js` | New: Manual OAuth token generation |
| `src/bots/teams-fabbank/services/teamsService.js` | Updated: Uses TokenService for testing |
| `src/app.js` | Updated: Added `/api/teams/test-token` endpoint |

---

## Summary

**Manual token generation lets you:**
1. ✅ Verify credentials immediately
2. ✅ Get specific error messages (not just "HTTP 401")
3. ✅ Test credentials without sending test messages in Teams
4. ✅ Distinguish between credential issues and adapter issues
5. ✅ Debug the OAuth flow step-by-step

**Next time you see HTTP 401:**
1. Call `GET /api/teams/test-token`
2. Check if `success: true` or `success: false`
3. Act accordingly based on error message
4. You'll know exactly what needs fixing!
