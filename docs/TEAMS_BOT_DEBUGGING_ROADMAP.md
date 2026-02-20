# Teams Bot HTTP 401 Debugging Roadmap

## 🎯 Current Status

✅ **Step 1 Complete: Credentials Verified**
```
Manual OAuth token generation: SUCCESS
App ID: bd74fdbe-b319-415c-bc3d-d09c15cfc8ee ✅
Tenant ID: 070760c9-5bc3-44ab-a4fe-ee465c541500 ✅
Token scope: https://api.botframework.com ✅
Credentials are 100% VALID
```

---

## ❓ What's the Real Issue?

Since token generation works perfectly, the HTTP 401 error when sending messages is **NOT caused by invalid credentials**.

The issue must be one of:
1. **Service URL format** (even though we sanitize it)
2. **API endpoint format** (how we're calling Teams API)
3. **Adapter configuration** (how BotFrameworkAdapter uses tokens)
4. **Teams Bot Channel registration** (misconfiguration in Azure)

---

## 🧪 Step 2: Deep API Call Debugging

Now we'll test the actual API calls to Teams to pinpoint the exact failure.

### **Part 1: Send a Test Message in Teams**

1. Start your bot:
   ```bash
   npm run dev
   ```

2. Send a message in Teams to the bot (e.g., "hello")

3. **Watch the logs carefully** - look for:
   ```
   📨 Message from USERID: hello
   📦 Context available: true
   Service URL: https://smba.trafficmanager.net/in/
   Conversation ID: 19:xxxxxxxxxxxxx@thread.v2
   ```

4. **Copy these values** - you'll need them:
   - **Service URL**: `https://smba.trafficmanager.net/in/` (or another region)
   - **Conversation ID**: `19:xxxxxxxxxxxxx@thread.v2`

### **Part 2: Test Manual Message Send**

Now test sending a message directly to Teams API using the captured values:

```bash
# Replace with values from your logs
curl -X POST http://localhost:3002/api/teams/test-send \
  -H "Content-Type: application/json" \
  -d '{
    "serviceUrl": "https://smba.trafficmanager.net/in/",
    "conversationId": "19:xxxxxxxxxxxxx@thread.v2"
  }'
```

**Or using PowerShell:**
```powershell
$body = @{
    serviceUrl = "https://smba.trafficmanager.net/in/"
    conversationId = "19:xxxxxxxxxxxxx@thread.v2"
} | ConvertTo-Json

Invoke-WebRequest -Uri "http://localhost:3002/api/teams/test-send" `
  -Method Post `
  -ContentType "application/json" `
  -Body $body
```

### **Part 3: Interpret the Results**

#### **✅ Success Response:**
```json
{
  "success": true,
  "status": 201,
  "data": {
    "id": "1234567890"
  }
}
```

**This means:**
- ✅ Credentials are valid (we knew this)
- ✅ Service URL is correct
- ✅ Conversation ID is correct
- ✅ Teams API accepted the message
- ✅ **Your bot should work!**

**Next steps:**
- Restart bot
- Send message in Teams
- Check logs for any other errors

---

#### **❌ HTTP 401 Response:**
```json
{
  "success": false,
  "status": 401,
  "error": "Authorization has been denied for this request"
}
```

**Check the logs for details:**
```
❌ Authorization Error (401)
Even though token generation works, Teams API rejected it.

Possible causes:
1. Service URL format is wrong
2. Conversation ID format is wrong
3. Teams API endpoint changed or moved
4. Bot not registered in Teams Channel
5. Token scope is wrong for this operation
```

**Fix each:**

**Cause 1: Service URL Format**
- Valid: `https://smba.trafficmanager.net/in/`
- Invalid: `https://smba.trafficmanager.net/in/070760c9-5bc3-44ab-a4fe-ee465c541500/`
- **Fix:** Copy exactly from logs - should NOT have tenant ID

**Cause 2: Conversation ID Format**
- Valid: `19:xxxxxxxxxxxxx@thread.v2`
- Invalid: Just `xxxxxxxxxxxxx` (missing prefix/suffix)
- **Fix:** Include full ID from logs exactly

**Cause 3: Bot Not Registered**
- Go to Azure Portal > Bot Service > Channels
- Verify **Teams** channel exists and is connected
- If missing: Click **+ Add a channel** > select **Teams** > **Connect**

**Cause 4: Token Scope**
- Token scope in test: `https://api.botframework.com`
- This is correct for Bot Framework Connector API

**Cause 5: Service URL Region**
- Different regions: `/in/`, `/amer/`, `/emea/`, `/apac/`, `/teams/`
- If you're in India: use `/in/`
- If you're in Americas: use `/amer/`
- Make sure you're using the right region

---

#### **❌ HTTP 400 Response:**
```json
{
  "success": false,
  "status": 400,
  "error": "Bad Request"
}
```

**Check logs:**
```
Payload format or endpoint URL is incorrect.
Response Body: { "error": "..." }
```

**Fixes:**
- Ensure Service URL ends with `/`
- Ensure Conversation ID is in correct format
- Verify message payload is valid JSON

---

#### **❌ HTTP 404 Response:**
```json
{
  "success": false,
  "status": 404,
  "error": "Not Found"
}
```

**Check logs:**
```
Service URL or conversation ID doesn't exist.
```

**Fixes:**
- Service URL might be wrong (typo or wrong region)
- Conversation ID might be from a deleted conversation
- Send a new message in Teams to get fresh conversation ID

---

## 📊 Debugging Decision Tree

```
START: "I'm getting HTTP 401 when sending messages in Teams"
  ↓
1. Run: GET /api/teams/test-token
  ├─ success: true ✅ (You are here!)
  │  └─→ Credentials are valid, proceed to Step 2
  │
  └─ success: false ❌
     └─→ Fix credentials in Azure Portal (earlier guide)

2. Send message in Teams → Copy serviceUrl and conversationId from logs

3. Run: POST /api/teams/test-send with those values
  ├─ success: true ✅
  │  └─→ API works! Issue is elsewhere (adapter or webhook)
  │     └─→ Restart bot and test in Teams again
  │
  ├─ status: 401 ❌
  │  └─→ Check: Service URL format, Conversation ID, Teams Channel config
  │
  ├─ status: 400 ❌
  │  └─→ Check: URL ends with /, ID format is correct
  │
  └─ status: 404 ❌
     └─→ Send new message in Teams, get fresh conversation ID, retry

4. Still having issues?
  └─→ Share logs from POST /api/teams/test-send response
     └─→ Share the exact serviceUrl and conversationId you're using
     └─→ Share any error response body from Teams API
```

---

## 🔧 Important: Extract Values from Logs

When you send a test message, look for this in logs:

```
📨 Message from 29:xxxxxxxxxxxxxx: hello
📦 Context available: true, Service URL: https://smba.trafficmanager.net/in/
Activity from: 29:xxxxxxxxxxxxxx, conversation: 19:yyyyyyyyyyyyyyy@thread.v2
```

**Extract:**
- `Service URL`: `https://smba.trafficmanager.net/in/`
- `Conversation ID`: `19:yyyyyyyyyyyyyyy@thread.v2`

These exact values must be passed to the test endpoint.

---

## 📋 Testing Checklist

- [ ] Run `/api/teams/test-token` → confirms credentials valid ✅
- [ ] Send message in Teams → check logs for serviceUrl and conversationId
- [ ] Run `POST /api/teams/test-send` with captured values
- [ ] Check response - is it success or error?
- [ ] If error, read error message carefully
- [ ] Fix issue based on error type (401, 400, 404)
- [ ] Restart bot and test in Teams again

---

## 🚀 Next Steps

1. **Share the output of these tests:**
   - GET /api/teams/test-token (you already did - SUCCESS ✅)
   - serviceUrl and conversationId from your logs
   - Response from POST /api/teams/test-send

2. **Based on the results, we'll know exactly what to fix**

---

## Summary

You've successfully proven:
✅ Credentials are 100% valid
✅ OAuth token generation works
✅ Microsoft Identity Platform accepts your app

Now we'll test:
❓ Teams API accepts your service URL and conversation ID
❓ BotFrameworkAdapter is using the token correctly
❓ Bot Framework Connector API is reachable

This will pinpoint the exact cause of HTTP 401!
