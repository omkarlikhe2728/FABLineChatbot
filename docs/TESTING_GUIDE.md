# FAB Bank LINE Bot - Testing Guide

## Quick Start

### Step 1: Kill Any Running Processes
```bash
# Kill any node processes using port 3000
taskkill /IM node.exe /F
```

### Step 2: Start the Bot
```bash
cd "d:\Chatbot\Hotel Website Chatbot Design\FABLineChatbot"
npm run dev
```

You should see:
```
[nodemon] starting `node src/server.js`
✅ FAB Banking Bot listening on port 3000
✅ Environment: development
```

### Step 3: Verify Health Endpoint
Open browser and visit: `http://localhost:3000/health`

Expected response:
```json
{
  "success": true,
  "message": "FAB Banking Bot is running",
  "timestamp": "2026-02-10T13:00:00.000Z"
}
```

### Step 4: LINE Console Configuration

In LINE Developers Console for your bot:

1. **Go to Messaging API settings**
2. **Find "Webhook settings"**
   - Webhook URL: `https://your-server.com/webhook`
   - If local testing: Use ngrok tunnel or deploy to server
   - Enable webhook usage ✓

3. **Event subscription settings** (IMPORTANT!)
   - ✓ Follow events
   - ✓ Message events
   - ✓ **Postback events** ← MUST ENABLE FOR BUTTONS
   - ✓ Leave postback events enabled

### Step 5: Test in LINE App

#### Test 1: Welcome Message with Banner Image
1. Add bot as a friend in LINE app (search by bot ID: 2008872779)
2. Should receive:
   - 📷 FAB Bank promotional banner image (McLaren F1 card offer)
   - 💬 Welcome text: "Welcome to FAB Bank! 🏦..."
   - 🔘 4 buttons: Check Balance, Card Services, Live Chat, End Session

#### Test 2: Text Input to Main Menu
1. Type any text in chat (e.g., "hello")
2. Bot should respond with menu buttons
3. Look for keywords in dialog (case-insensitive):
   - Type "balance" or "check" → Triggers Check Balance flow
   - Type "card" or "service" → Triggers Card Services flow
   - Type "end", "close", or "exit" → Ends session

#### Test 3: Check Balance Flow (Full)
1. Click "Check Balance" button
2. Should see: "✅ You selected: Check Balance"
3. Bot asks: "Please enter your registered phone number (e.g., +919876543210 or 9876543210)"
4. Enter phone: `9876543210` or `+919876543210`
   - Expected: "✅ OTP sent successfully! Valid for 5 minutes."
5. Enter OTP: `123456` (or actual OTP from API)
   - If verified: Shows balance with name, account, type, balance, currency
   - If not verified: "❌ Invalid OTP. Please try again."

#### Test 4: Mini Statement from Balance
1. After balance is displayed, click "View Mini Statement"
2. Should show:
   - Last 5 transactions with date, description, amount
   - Current balance at bottom
   - "Back to Menu" button

#### Test 5: Card Services Flow
1. Click "Card Services" button
2. Enter phone number
3. Bot shows your cards:
   ```
   Your Cards:
   1. VISA - 1234****5678 (ACTIVE)
   2. MASTERCARD - 5678****9012 (BLOCKED)
   ```
4. Click action buttons:
   - "Block Card" → Ask for card ID
   - "Unblock Card" → Ask for card ID + confirmation
   - "Report Lost" → Ask for card ID + confirmation
   - "View Card Limits" → Shows daily/monthly limits

#### Test 6: Live Chat
1. Click "Live Chat" button
2. Should see: "✅ You selected: Live Chat"
3. Agent message appears with contact info:
   - 📞 +1 800 123 4567
   - 📧 support@fabbank.com
   - 💬 Chat available 24/7

#### Test 7: Button Clickability
- **Prerequisites**: Postback events MUST be enabled in LINE console
- Buttons should be clickable (not gray/disabled)
- When clicking, should see `🔘 Postback received: action=xxxx` in console
- Each button action should trigger appropriate dialog state

#### Test 8: Session Timeout
1. Start a session (Check Balance)
2. Don't interact for 5+ minutes
3. Send a message
4. Should receive: "Session expired. Please follow the bot again."

#### Test 9: Back to Menu
1. From any dialog state (balance, cards, etc.)
2. Click "Back to Menu" button
3. Should return to main menu with 4 buttons

#### Test 10: End Session
1. Click "End Session" button
2. Should receive: "✅ You selected: End Session. Thank you for using FAB Bank! Have a great day! 👋"
3. Session should be deleted
4. Next message requires new session

---

## Console Debugging

### Look for These Debug Messages

**Successful webhook:**
```
🔍 DEBUG: Webhook received
✅ WEBHOOK HANDLER CALLED
📦 Events count: 1
📥 EVENT RECEIVED: FOLLOW from user: Ux1234567890...
✅ Webhook processing complete
```

**Successful button click:**
```
📥 EVENT RECEIVED: POSTBACK from user: Ux1234567890...
🔘 Postback received: action=check_balance
✅ Postback action parsed: check_balance
📤 Sending messages: [...]
```

**OTP flow:**
```
📄 Sending OTP to +*****3210
✅ OTP sent successfully
📄 Verifying OTP for +*****3210
✅ OTP verified
💰 Fetching balance for +*****3210
✅ Balance fetched
```

### Common Issues & Solutions

| Issue | Cause | Solution |
|-------|-------|----------|
| "Buttons not clickable" | Postback events not enabled | Go to LINE console → Event subscription → Enable postback |
| "Session expired" | Session not created | Bot will auto-create, just retry |
| "Invalid signature" | Wrong channel secret | Check .env LINE_CHANNEL_SECRET |
| "OTP failed" | Banking API not running | Verify BANKING_API_BASE_URL is correct |
| "Port 3000 in use" | Old node process | Kill with `taskkill /IM node.exe /F` |
| "Cannot find module" | Dependencies not installed | Run `npm install` |

---

## Test Checklist

Use this to verify all features work:

### Core Features
- [ ] Bot starts without errors (`npm run dev`)
- [ ] Health endpoint returns success
- [ ] Welcome message shows banner image
- [ ] Welcome message shows text + 4 buttons

### User Interactions
- [ ] Buttons are clickable (not disabled/gray)
- [ ] Postback events are received in console
- [ ] Text input works (type "balance" triggers Check Balance)
- [ ] Back to Menu returns to main menu

### Check Balance Flow
- [ ] Click "Check Balance" button
- [ ] Enter phone number → OTP sent
- [ ] Enter OTP → Balance displayed
- [ ] Mini statement shows transactions
- [ ] Back to Menu works from balance screen

### Card Services Flow
- [ ] Click "Card Services" button
- [ ] Enter phone → Cards listed
- [ ] Block card → Confirmation dialog
- [ ] Unblock card → Confirmation dialog
- [ ] Report lost → Confirmation dialog
- [ ] View limits → Shows daily/monthly limits

### Session Management
- [ ] New user: Session auto-created
- [ ] Session: Persists across messages
- [ ] Timeout: After 5 min inactivity, "Session expired"
- [ ] End Session: Deletes session

### Other Features
- [ ] Live Chat → Shows agent info
- [ ] End Session → Closes session
- [ ] Error handling → User-friendly messages
- [ ] Logging → Console shows debug messages

---

## Performance Notes

- **Response time**: Should be < 2 seconds per message
- **Webhook**: Should process within 3 seconds (LINE timeout)
- **Logging**: Check `logs/` folder for detailed logs
- **Memory**: In-memory session storage uses ~1KB per session

---

## Deployment to Production

When ready to deploy (e.g., to AWS, Heroku, Docker):

1. **Update .env with production credentials**
   - Real LINE channel credentials
   - Real banking API URL
   - Production database for sessions (Redis)

2. **Update webhook URL in LINE console**
   - From local URL to production domain
   - Ensure HTTPS is enabled
   - SSL/TLS certificate required

3. **Session storage**
   - Upgrade from in-memory to Redis
   - Edit `src/services/sessionService.js`
   - Update session timeout per requirements

4. **Monitoring**
   - Set up error tracking (Sentry, etc.)
   - Monitor webhook response times
   - Track session metrics

5. **Testing in production**
   - Test with real banking API
   - Verify OTP flow with actual phone numbers
   - Load test with multiple concurrent users

---

## Support

For issues:
1. Check console logs for error messages
2. Verify LINE console webhook settings
3. Check .env credentials are correct
4. Ensure banking API is accessible
5. Review IMPLEMENTATION_STATUS.md for feature details

---

**Ready to test!** 🚀
Run `npm run dev` and start testing the bot in LINE app.
