# Troubleshooting Guide

Solutions to common issues encountered during bot deployment and operation.

---

## 🚀 Startup Issues

### Issue: "Cannot find module 'X'"

**Symptoms:**
```
Error: Cannot find module 'grammy'
at Module._load (internal/modules/commonjs/loader.js:...)
```

**Solution:**
```bash
# Reinstall all dependencies
npm install

# Or reinstall specific package
npm install grammy
```

**Reason:** Missing `node_modules` or package not installed

---

### Issue: "EADDRINUSE: address already in use :::3001"

**Symptoms:**
```
Error: listen EADDRINUSE: address already in use :::3001
```

**Solution (Option 1: Kill existing process):**

```bash
# macOS/Linux: Find and kill process on port 3001
lsof -ti:3001 | xargs kill -9

# Windows: Find and kill process
netstat -ano | findstr :3001
taskkill /PID <PID> /F
```

**Solution (Option 2: Use different port):**

Edit `.env`:
```env
PORT=3002  # Changed from 3001
```

Then start server: `npm run dev`

**Reason:** Another application is using port 3001

---

### Issue: "ENOENT: no such file or directory, open '.env.fabbank'"

**Symptoms:**
```
Error: ENOENT: no such file or directory
```

**Solution:**
1. Create the missing `.env.*` file:
   ```bash
   touch .env.fabbank
   ```

2. Copy the required variables (see bot deployment guide)

3. Restart server: `npm run dev`

**Reason:** Environment file not created

---

### Issue: "Error: Bot registration failed"

**Symptoms:**
```
Error: Bot 'fabbank' failed to register
```

**Solution:**

1. Check `config/bots.json` has correct entry:
   ```json
   {
     "id": "fabbank",
     "enabled": true,
     "envFile": ".env.fabbank",
     "configFile": "config/fabbank.json",
     "modulePath": "./bots/fabbank"
   }
   ```

2. Verify `.env.fabbank` exists and has required variables

3. Check bot's `index.js` file is properly formatted

4. Review server logs for specific error

---

## 🔐 Credential Issues

### Issue: "Invalid Token" (Telegram)

**Symptoms:**
```
Error: Invalid token provided
Bot token is not a valid Telegram bot token
```

**Solution:**

1. Go to Telegram → @BotFather
2. Send `/token`
3. Select your bot
4. Copy the new token
5. Update `.env.telegram-fabbank`:
   ```env
   TELEGRAM_FABBANK_TOKEN=<new_token>
   ```
6. Restart server

**Reason:** Token is invalid, expired, or incorrectly copied

---

### Issue: "Channel is not matched" (LINE)

**Symptoms:**
```
Error: Line request signature verification failed
or
Bot does not respond to correct channel
```

**Solution:**

1. Verify Channel ID matches:
   ```bash
   grep CHANNEL_ID .env.fabbank
   # Compare with LINE Console → Basic Settings
   ```

2. Verify Channel Secret matches:
   ```bash
   grep CHANNEL_SECRET .env.fabbank
   # Compare with LINE Console → Basic Settings
   ```

3. Verify Channel Access Token matches:
   ```bash
   grep ACCESS_TOKEN .env.fabbank
   # Compare with LINE Console → Messaging API
   ```

4. Copy credentials exactly (no extra spaces)

5. Restart server: `npm run dev`

**Reason:** Credentials don't match between `.env` and platform console

---

### Issue: "Invalid Client ID / Client Secret" (Teams)

**Symptoms:**
```
Error: Authorization service returned error:
Unable to authenticate using the provided credentials
```

**Solution:**

1. Go to Azure Portal
2. Find Bot Service → Settings → Configuration
3. Copy **Microsoft App ID** again (exactly)
4. Click **Manage** → Certificates & secrets
5. Create NEW client secret:
   - Click **New client secret**
   - Add description
   - Copy the **Value** (not ID)
6. Update `.env.teams-fabbank`:
   ```env
   TEAMS_FABBANK_APP_ID=<app_id>
   TEAMS_FABBANK_APP_PASSWORD=<new_secret_value>
   ```
7. Restart server

**Reason:** Secret expired or incorrectly copied (paste errors common with long strings)

---

## 🌐 Webhook Issues

### Issue: "Webhook URL verification failed" (LINE)

**Symptoms:**
- In LINE Console → Messaging API → Webhook Settings
- Click "Verify" → Shows error
- Webhook is not being called

**Solution:**

1. Check ngrok is running:
   ```bash
   # Should show output with forwarding URL
   ngrok http 3001
   ```

2. Verify webhook URL in LINE Console:
   - Should be: `https://<ngrok-url>/webhook/fabbank`
   - Check for typos (ngrok URLs are long, easy to mistype)

3. Verify server is running:
   ```bash
   npm run dev
   ```

4. Check webhook route exists in `app.js`

5. Test manually:
   ```bash
   curl https://<ngrok-url>/webhook/fabbank
   # Should return 405 or 400 (not found), NOT timeout
   ```

6. If manual test fails:
   - Ngrok URL is incorrect
   - Server not running
   - Route doesn't exist

**Solution Steps:**
1. Stop and restart ngrok
2. Copy new ngrok URL
3. Update webhook URL in LINE Console
4. Click Verify again

**Reason:** Ngrok URL changed, server not running, or route doesn't exist

---

### Issue: "Webhook is not being called" (Teams)

**Symptoms:**
- Webhook URL is set correctly
- Bot doesn't respond to messages in Teams
- No errors in Azure logs

**Solution:**

1. Verify webhook URL in Azure Bot Service:
   - Azure Portal → Bot Service → Configuration
   - Find **Messaging endpoint**
   - Should be: `https://<ngrok-url>/api/teams/webhook`

2. Test webhook manually:
   ```bash
   curl -X POST https://<ngrok-url>/api/teams/webhook \
     -H "Content-Type: application/json" \
     -d '{"type":"message","text":"test"}'
   ```

3. Check server logs for webhook handler errors

4. Verify Azure credentials in `.env.teams-fabbank`

5. Test in Azure Portal → Test in Web Chat first (bypasses webhook)

---

## 📱 Bot Doesn't Respond

### Issue: Bot added but doesn't respond to messages

**Symptoms:**
- Bot can be added to platform
- Messages are sent but no response
- No errors visible

**Solution (for LINE):**

1. Check webhook is enabled:
   - LINE Console → Messaging API → Webhook Settings
   - Toggle "Use webhook" → should be ON
   - Webhook URL should be set and verified

2. Check events are enabled:
   - Scroll down in Webhook Settings
   - Enable: Message, Follow/Unfollow, Postback

3. Check server logs:
   ```bash
   npm run dev  # Look for:
   # [Webhook] Message received from user
   # [DialogManager] Processing message
   # [Response] Sent to user
   ```

4. If no logs appear:
   - Webhook is not being delivered
   - Check LINE Console → Webhook Log for delivery status
   - If status is "Failed", webhook URL is wrong

**Solution (for Telegram):**

1. Check server is running:
   ```bash
   npm run dev
   ```

2. Check polling is active in logs:
   ```
   [Telegram] Polling started
   [Telegram] Waiting for updates...
   ```

3. Check bot token is correct:
   ```bash
   grep TELEGRAM_FABBANK_TOKEN .env.telegram-fabbank
   ```

4. If bot token wrong:
   - Go to @BotFather
   - Send `/token`
   - Select bot
   - Get new token
   - Update `.env.telegram-fabbank`
   - Restart server

**Solution (for Teams):**

1. Test in Azure first:
   - Azure Portal → Bot Service
   - Click "Test in Web Chat"
   - Type message
   - If no response, webhook is broken

2. If no response in Web Chat:
   - Check `.env.teams-fabbank` credentials
   - Check webhook URL is set
   - Check server logs for errors

3. If response in Web Chat but not Teams:
   - Check Teams desktop/app is updated
   - Try on Teams web version
   - Verify bot is properly installed in Teams

---

## 🔗 API Connection Issues

### Issue: "Cannot reach banking API" / "ECONNREFUSED"

**Symptoms:**
```
Error: connect ECONNREFUSED 127.0.0.1:5000
or
Error: Request failed with status code 503
```

**Solution:**

1. Check API URL in `.env`:
   ```bash
   grep BANKING_API_URL .env.fabbank
   ```

2. Test API is accessible:
   ```bash
   curl -i https://api.bankfab.com/v1/banking/health
   # Should return HTTP 200 or similar
   ```

3. If curl fails:
   - API URL is wrong
   - API is down
   - Network connectivity issue
   - Firewall blocking

4. Check timeout is sufficient:
   ```env
   DEFAULT_API_TIMEOUT=5000  # milliseconds
   # Increase if API is slow:
   DEFAULT_API_TIMEOUT=10000
   ```

5. Check if API requires authentication:
   - API might need API key header
   - Check API documentation
   - Update code to include auth headers

**Reason:** API is unreachable, down, or timeout is too short

---

### Issue: "Unauthorized" when calling API

**Symptoms:**
```
Error: Request failed with status code 401
or
{"error":"Unauthorized"}
```

**Solution:**

1. Check API requires authentication:
   - Review API documentation
   - Check if API key needed

2. If API key needed, add to request:
   - Check service code (e.g., `bankingService.js`)
   - Add Authorization header:
     ```javascript
     headers: {
       'Authorization': `Bearer ${API_KEY}`,
       'Content-Type': 'application/json'
     }
     ```

3. Update `.env` with API key:
   ```env
   BANKING_API_KEY=<your_api_key>
   ```

4. Test manually with curl:
   ```bash
   curl -H "Authorization: Bearer YOUR_KEY" \
     https://api.bankfab.com/v1/banking/balance
   ```

5. If manual request works but bot request fails:
   - Check headers in code match manual request
   - Check API key is being read from `.env`

**Reason:** Missing or incorrect API authentication

---

## 💬 Live Chat Issues

### Issue: Live chat not connecting / "Cannot reach live chat API"

**Symptoms:**
```
Error: Live chat service unavailable
or
Cannot POST to live chat endpoint
```

**Solution:**

1. Check live chat API URL:
   ```bash
   grep LIVE_CHAT_API_URL .env.fabbank
   # Should return actual URL
   ```

2. Test live chat API:
   ```bash
   curl -i https://your-livechat-server.com:6509/api/health
   # Should return success response
   ```

3. If curl fails:
   - Live chat URL is wrong
   - Live chat service is down
   - Firewall/network issue

4. Check Avaya tenant ID:
   ```bash
   grep AVAYA_TENANT .env.fabbank
   # Default: SHOWMEAVAYA
   # Should match your actual tenant
   ```

5. If tenant wrong:
   - Update `.env.fabbank`
   - Restart server

6. Check timeout:
   ```env
   LIVE_CHAT_TIMEOUT=20000  # 20 seconds
   # Increase if live chat is slow
   ```

---

### Issue: Live chat agent doesn't receive message

**Symptoms:**
- User clicks "Live Chat"
- User sends messages
- Agent system doesn't receive messages
- No errors in bot logs

**Solution:**

1. Check live chat middleware is running
2. Check message is being forwarded to middleware:
   - Search server logs for "live chat message forwarded"
3. Check middleware API URL is correct
4. Check live chat system is configured to receive messages from this bot
5. Check tenant ID is correct
6. Monitor API calls:
   ```bash
   tail -f logs/*.log | grep "live chat"
   ```

---

## 📊 Session Issues

### Issue: "User already has active session"

**Symptoms:**
- User gets error message
- Cannot start new bot conversation
- Session shows as active but shouldn't be

**Solution:**

1. Restart server (clears in-memory sessions):
   ```bash
   # Stop: Ctrl+C
   # Start: npm run dev
   ```

2. Or increase session timeout:
   ```env
   DEFAULT_SESSION_TIMEOUT=600000  # 10 minutes
   # From default: DEFAULT_SESSION_TIMEOUT=300000  # 5 minutes
   ```

3. Or manually clear session via API (if available):
   - Depends on implementation
   - May need to add endpoint

**Reason:** User's previous session hasn't expired yet

---

### Issue: Session data is lost / User needs to re-authenticate after refresh

**Symptoms:**
- User navigates away and back
- Needs to enter phone/OTP again
- Session state is not preserved

**Solution:**

This is expected behavior with in-memory sessions. Options:

1. **Increase session timeout**:
   ```env
   DEFAULT_SESSION_TIMEOUT=1800000  # 30 minutes
   ```

2. **Switch to Redis** (persistent storage):
   - Install Redis
   - Configure session store to use Redis
   - Sessions survive server restart

3. **Use localStorage** (frontend, if applicable):
   - Store session token in browser
   - Send with each request

**For Production:** Use Redis or database for persistent sessions

---

## 🐛 Feature-Specific Issues

### Check Balance Not Working

**Symptoms:**
- User clicks "Check Balance"
- Bot shows: "Enter phone number:"
- User enters phone
- No response OR error message

**Solution:**

1. Check banking API works:
   ```bash
   curl -i https://api.bankfab.com/v1/banking/balance \
     -H "Authorization: Bearer YOUR_TOKEN"
   ```

2. Check phone validation:
   - Phone format might be wrong
   - Check code validates phone correctly
   - Look in `dialogManager.js`

3. Check OTP service:
   - OTP might not be sending
   - Check if OTP service is implemented
   - Check OTP timeout (default 5 minutes)

4. Check logs:
   ```bash
   npm run dev 2>&1 | grep -i balance
   ```

---

### Live Chat State Machine Stuck

**Symptoms:**
- Live chat state not progressing
- User stuck in "waiting for agent" state
- No way to exit

**Solution:**

1. Check dialog state in code:
   - Look at `dialogManager.js`
   - Find state transition for live chat

2. Verify live chat service returns proper response:
   - Should return success/error status
   - Check response format

3. Add timeout for "waiting for agent":
   - If agent doesn't connect in 2 minutes
   - Return to main menu

4. Check logs for state transitions:
   ```bash
   npm run dev 2>&1 | grep "state:"
   ```

---

## 🔍 Logging & Debugging

### Enable More Detailed Logging

**In `.env`:**
```env
LOG_LEVEL=debug
# Options: error, warn, info, debug, trace
```

### View Specific Error Logs

**Show only errors:**
```bash
npm run dev 2>&1 | grep -i "error"
```

**Show specific service logs:**
```bash
npm run dev 2>&1 | grep "BankingService\|LiveChat\|Session"
```

**Save logs to file:**
```bash
npm run dev > bot.log 2>&1 &
tail -f bot.log
```

---

## ✅ Debugging Checklist

When something breaks:

- [ ] Check server logs for error messages
- [ ] Verify all credentials are correct and valid
- [ ] Check API endpoints are accessible (use curl)
- [ ] Verify webhook URLs are configured correctly
- [ ] Ensure all `.env` files are created with required variables
- [ ] Test with simpler flows first (e.g., just send message, no buttons)
- [ ] Check platform logs (LINE Console, Azure Portal, etc.)
- [ ] Verify network connectivity (ping google.com)
- [ ] Check if firewall is blocking connections
- [ ] Restart server and try again

---

## 📞 Still Stuck?

1. **Google the error message**: Often find solutions quickly
2. **Check platform documentation**:
   - LINE: https://developers.line.biz
   - Telegram: https://core.telegram.org/bots
   - Teams: https://docs.microsoft.com/azure/bot-service
3. **Review project README** for overview
4. **Check bot-specific deployment guide** for platform setup
5. **Ask team** with:
   - Full error message (from server logs)
   - Steps to reproduce
   - What you've already tried
   - Screenshots if applicable

---

**Last Updated**: 2026-02-20
**Version**: 1.0
