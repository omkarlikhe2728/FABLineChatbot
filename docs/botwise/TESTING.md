# Testing & Verification Guide

Complete guide for testing all bots after deployment.

---

## 🎯 Testing Overview

### Before Testing
- ✅ Server is running: `npm run dev`
- ✅ All required `.env` files are created
- ✅ All credentials are valid
- ✅ Webhook URLs are configured in respective platforms
- ✅ Ngrok tunnel is active (if local testing)

### What to Test
1. **Webhook Connection**: Bot receives messages from platform
2. **Bot Initialization**: Bot starts without errors
3. **Basic Features**: All bot features work correctly
4. **Error Handling**: Bot gracefully handles errors
5. **Session Management**: User sessions are tracked correctly

---

## 🧪 Server Health Check

### Test 1: Server is Running

```bash
# Check if server responds to health check
curl http://localhost:3001/health
```

**Expected Response:**
```json
{"status":"ok"}
```

**If Failed:**
1. Ensure server is running: `npm run dev`
2. Ensure port is correct: Check `PORT=3001` in `.env`
3. Check for errors in terminal output

### Test 2: Check Server Logs

While server is running, look for:

```
✓ Bots initialized successfully
✓ Server running on port 3001
✓ <bot-name> bot registered
✓ Webhook routes configured
```

**Red flags:**
- ❌ `Error loading .env` - Missing environment file
- ❌ `Cannot find module` - Missing dependency
- ❌ `EADDRINUSE` - Port already in use
- ❌ `Invalid credentials` - Wrong API keys

---

## 📱 LINE Bot Testing

### Prerequisites
- LINE Business Account
- Bot added to LINE app
- Webhook enabled in LINE Console
- `.env.fabbank` (or `.env.sands` / `.env.ana`) configured

### Test 1: Webhook Connectivity

**In LINE Console:**
1. Go to **Messaging API** tab
2. Scroll to **Webhook** section
3. Click **Verify** button
4. Should show: ✅ "Success"

**If Failed:**
- Check ngrok tunnel is running
- Verify webhook URL is correct
- Restart server

### Test 2: Message Reception

1. Open LINE app
2. Open conversation with your bot
3. Send a test message: `Hello`
4. Bot should respond within 2-3 seconds

**Check server logs:**
```
[Webhook] Received message from user: <user_id>
[DialogManager] Processing message in state: MAIN_MENU
[Response] Sent to user: <user_id>
```

**If Bot Doesn't Respond:**
1. Check bot is followed in LINE app
2. Check server logs for errors
3. Verify `.env` credentials are correct
4. Ensure webhook is enabled in LINE Console

### Test 3: Feature Testing

**FAB Bank Bot:**

| Feature | Test Steps | Expected Result |
|---------|-----------|-----------------|
| **Welcome** | Send `/start` or first message | Welcome image + 4 buttons |
| **Check Balance** | Click "Check Balance" | "Enter phone number:" prompt |
| **Card Services** | Click "Card Services" | Card options menu |
| **Mini Statement** | Click button in Card Services | Transaction list |
| **Live Chat** | Click "Live Chat" button | Live chat connection message |
| **End Session** | Click "End Session" | "Session ended" confirmation |

**Sands Hotel Bot:**

| Feature | Test Steps | Expected Result |
|---------|-----------|-----------------|
| **Welcome** | Send first message | Hotel image + menu buttons |
| **Early Check-in** | Click button | Check-in form |
| **Booking Amendments** | Click button | Amendment options |
| **Food** | Select food option | Meal confirmation |
| **Live Chat** | Click button | Agent connection |

**ANA Airline Bot:**

| Feature | Test Steps | Expected Result |
|---------|-----------|-----------------|
| **Welcome** | Send first message | Airline image + 3 buttons |
| **Flight Status** | Click button | "Enter booking reference:" |
| **Baggage Allowance** | Click button | Baggage information |
| **Live Chat** | Click button | Agent connection |

### Test 4: Session Management

1. Send message 1: "Hi"
2. Note session created in logs
3. Send message 2: "Help"
4. Same session should be used
5. Wait 5 minutes
6. Send message 3: "Hi again"
7. New session should be created

**Check logs:**
```
[Session] Created session: <session_id>
[Session] Retrieved session: <session_id>
[Session] Expired session: <session_id> (after timeout)
```

### Test 5: Error Handling

1. Send OTP without phone number
   - Should show: "Please enter phone number first"
2. Enter invalid phone format
   - Should show: "Invalid phone number format"
3. Click back when at main menu
   - Should show: "You are at main menu" (no error)

---

## 📱 Telegram Bot Testing

### Prerequisites
- Telegram bot token from BotFather
- Bot added to Telegram
- `.env.telegram-fabbank` configured
- Server running with polling mode

### Test 1: Bot Appears in Telegram

1. Open Telegram
2. Search for your bot username
3. Bot should appear in results
4. Click and open bot

**If Not Found:**
- Verify bot name is unique (ends with "bot")
- Ask BotFather for bot link: `/token` → select bot

### Test 2: Bot Responds to Commands

Send these commands:

```
/start      → Welcome message + buttons
/help       → Help information
/menu       → Main menu
/balance    → Check balance flow
```

**Expected: Bot responds within 1-2 seconds**

### Test 3: Feature Testing

| Feature | Test | Expected |
|---------|------|----------|
| **Start** | `/start` | Welcome with buttons |
| **Check Balance** | Click button | Phone number prompt |
| **OTP Flow** | Enter phone + OTP | Balance shown |
| **Cards** | Click "Card Services" | Card menu |
| **Live Chat** | Click button | Live chat connection |

### Test 4: Button Interactions

1. Send `/menu`
2. Click **Check Balance** button
3. Should show: "Enter phone number:"
4. Type phone number
5. Should show: "Enter OTP:"

### Test 5: Session Persistence

1. Start bot: `/start`
2. Type phone number: `971501234567`
3. Wait without responding
4. After 5 minutes, message should say: "Session expired"

---

## 🎮 Microsoft Teams Bot Testing

### Prerequisites
- Azure Bot Service created
- Azure credentials in `.env.teams-*`
- Webhook URL configured in Azure
- Ngrok running (if local testing)

### Test 1: Bot Appears in Teams

1. Open Microsoft Teams
2. Click **+ Create** or **Browse apps**
3. Search for your bot
4. Click **Add**
5. Bot should appear in app drawer

**If Not Found:**
- Go to Azure Portal → Bot Service
- Click **Channels** → **Teams** → **Configure**
- Copy installation link

### Test 2: Test in Web Chat

Fastest way to test:

1. Azure Portal → Your Bot Service
2. Click **Test in Web Chat**
3. Type: "Hello"
4. Bot should respond
5. This confirms webhook connection

### Test 3: Message in Teams Chat

1. Open Teams app
2. Open bot conversation
3. Send message: "Hi"
4. Bot should respond within 1-2 seconds

**Check logs:**
```
[Webhook] Teams message received
[ActivityHandler] Processing activity
[Response] Adaptive card sent
```

### Test 4: Adaptive Card Display

1. Send `/start`
2. Check if welcome card displays correctly:
   - ✅ All text visible
   - ✅ Buttons clickable
   - ✅ Images load (if any)
   - ✅ Colors/formatting correct

**If Cards Don't Display:**
- Check JSON format in server logs
- Verify Teams client is updated
- Try simpler card first

### Test 5: Feature Testing

| Feature | Action | Expected |
|---------|--------|----------|
| **Start** | `/start` | Welcome adaptive card |
| **Check Balance** | Click button | Phone input prompt |
| **Card Services** | Click button | Card options |
| **Live Chat** | Click button | Agent routing |

---

## 🔍 Common Testing Issues & Solutions

### Issue: Bot Responds Slowly (>3 seconds)

**Causes:**
- API timeout configured too high
- API endpoint is slow
- Network latency
- Server overloaded

**Solutions:**
1. Check API endpoints are responding:
   ```bash
   curl -i <BANKING_API_URL>/health
   ```
2. Check timeout values in `.env`:
   ```env
   DEFAULT_API_TIMEOUT=5000
   ```
3. Check server CPU/memory usage
4. Check network connectivity

### Issue: Bot Doesn't Receive Webhook Messages

**Causes:**
- Webhook not enabled in platform
- Webhook URL is incorrect
- Ngrok tunnel expired
- Credentials don't match

**Solutions:**
1. Verify webhook is enabled:
   - LINE: Messaging API → Webhook Settings → Use webhook ✓
   - Telegram: None (uses polling)
   - Teams: Webhook URL set in Azure Bot Service
2. Verify webhook URL:
   - Should be HTTPS (not HTTP)
   - Should match what's configured in platform
   - Should be publicly accessible
3. Restart ngrok if URL changed:
   ```bash
   ngrok http 3001
   ```
4. Verify credentials match between platform and `.env`

### Issue: Session Errors

**Causes:**
- Session timeout too short
- Multiple sessions created for same user
- Session data corrupted

**Solutions:**
1. Check session timeout:
   ```env
   DEFAULT_SESSION_TIMEOUT=300000  # 5 minutes
   ```
2. Restart server to clear in-memory sessions
3. Check server logs for session errors
4. Verify `sessionKey` format matches expectations

### Issue: API Call Failures

**Causes:**
- API URL is incorrect
- API requires authentication
- API is down or unreachable
- Timeout is too short

**Solutions:**
1. Test API manually:
   ```bash
   curl -i <API_URL>/health
   ```
2. Verify API URL in `.env`:
   ```env
   BANKING_API_URL=https://api.bankfab.com/v1/banking
   ```
3. Check if API requires auth headers
4. Increase timeout if needed:
   ```env
   DEFAULT_API_TIMEOUT=10000  # 10 seconds
   ```

### Issue: "Channel is not matched" Error (LINE)

**Causes:**
- Channel ID mismatch between `.env` and LINE Console
- Wrong bot credentials used

**Solutions:**
1. Verify Channel ID in `.env`:
   ```bash
   grep CHANNEL_ID .env.fabbank
   ```
2. Compare with LINE Console → Basic Settings
3. Copy exactly (no spaces)
4. Restart server

---

## 📊 Logging & Debugging

### Enable Debug Logging

Edit `.env`:
```env
LOG_LEVEL=debug  # Shows all debug messages
# or
LOG_LEVEL=trace  # Shows very detailed logs
```

### Check Logs in Real Time

**Terminal 1: Run server**
```bash
npm run dev
```

**Terminal 2: Watch specific logs**
```bash
# macOS/Linux
tail -f logs/*.log | grep "ERROR\|WARN\|DEBUG"

# Or use grep to filter
npm run dev 2>&1 | grep "webhook\|session\|error"
```

### Save Logs to File

Server may already log to files. Check:
```bash
ls -la logs/
```

If files exist, view them:
```bash
cat logs/error.log
cat logs/info.log
tail -f logs/*.log
```

---

## ✅ Complete Testing Checklist

### Setup Tests
- [ ] Server starts without errors: `npm run dev`
- [ ] Health check works: `curl http://localhost:3001/health`
- [ ] All `.env` files created with credentials
- [ ] Ngrok tunnel is active (if testing locally)

### Platform Connection Tests
- [ ] Webhook URL is correct in platform console
- [ ] Webhook verification succeeds (LINE only)
- [ ] Bot can be added to platform app
- [ ] First message triggers webhook delivery

### Feature Tests
- [ ] Welcome message displays correctly
- [ ] Main menu buttons appear
- [ ] Button clicks are responsive
- [ ] Error messages are user-friendly
- [ ] Session timeout works

### Error Handling Tests
- [ ] Invalid input shows appropriate error
- [ ] API failure shows graceful error
- [ ] Session expiration handled properly
- [ ] No sensitive data logged

### Performance Tests
- [ ] Response time < 3 seconds
- [ ] Concurrent users don't cause issues
- [ ] Memory usage remains stable
- [ ] No memory leaks after extended use

---

## 🚀 Production Testing

Before going live:

1. **Load Testing**: Simulate multiple concurrent users
   ```bash
   # Example: Use Apache Bench or similar
   ab -n 100 -c 10 http://localhost:3001/health
   ```

2. **Extended Run**: Keep bot running for 24 hours
   - Monitor memory/CPU
   - Check for crashes
   - Review logs for issues

3. **Failover Testing**: Restart server
   - Does bot reconnect to platforms?
   - Are active sessions recovered?
   - Any data loss?

4. **API Integration Testing**: Full end-to-end flows
   - Check Balance → OTP → Display balance
   - Live Chat → Route to agent → Handle response
   - Card Services → Show options → Process selection

5. **Security Testing**
   - Don't log sensitive data (passwords, OTPs)
   - Validate all user inputs
   - Use HTTPS for all connections

---

## 📞 Still Having Issues?

1. **Check SETUP.md** for initial configuration
2. **Check bot-specific deployment guide** for platform setup
3. **Review server logs** for error messages
4. **Check TROUBLESHOOTING.md** for common issues
5. **Ask in team chat** with error logs attached

---

**Last Updated**: 2026-02-20
**Testing Version**: 1.0
