# Rich Media Implementation - Complete Testing & Deployment Guide

**Status:** ✅ Implementation Complete (Phases 1-5)
**Date:** 2026-02-24
**Target:** Teams IT Support Bot
**Feature:** Rich Media Support in Live Chat

---

## ✅ Implementation Status

### Phase 1: Activity Controller ✅ COMPLETED
- [x] Extract `activity.attachments` from Teams message
- [x] Add `_detectMessageType()` method
- [x] Add `_buildMessageObject()` method
- [x] Check `dialogState === 'LIVE_CHAT_ACTIVE'`
- [x] Pass complete message objects to dialog manager
- **Files Modified:** `src/bots/teams-itsupport/controllers/activityController.js`
- **Lines Added:** 62 (includes helper methods)

### Phase 2: Dialog Manager ✅ COMPLETED
- [x] Modify `_handleLiveChat()` to accept message objects
- [x] Add backward compatibility for string inputs
- [x] Update exit keyword checking (text-only)
- [x] Forward complete message objects to liveChatService
- **Files Modified:** `src/bots/teams-itsupport/services/dialogManager.js`
- **Lines Added:** 54

### Phase 3: Live Chat Service ✅ COMPLETED
- [x] Add `_getDisplayName()` method with 70-char truncation
- [x] Update `sendMessage()` to handle message objects
- [x] Add display name truncation (Avaya requirement)
- [x] Support all message types in payload
- **Files Modified:** `src/bots/teams-itsupport/services/liveChatService.js`
- **Lines Added:** 81

### Phase 4: Middleware Controller 📋 DOCUMENTATION READY
- [x] Documentation created: `MIDDLEWARE_IMPLEMENTATION_PHASE4.md`
- [x] Code examples for all middleware functions
- [x] Download from Teams implementation
- [x] Upload to Avaya implementation
- [x] File validation and size checking
- [x] Error handling examples
- **Awaiting:** Middleware team implementation

### Phase 5: Agent Response Handler ✅ COMPLETED
- [x] Add `handleAgentResponse()` method to teamsService
- [x] Support attachments in proactive messages
- [x] Format attachments for Teams API
- [x] Documentation for middleware: `MIDDLEWARE_AGENT_RESPONSE_HANDLER.md`
- **Files Modified:** `src/bots/teams-itsupport/services/teamsService.js`
- **Lines Added:** 49

---

## 🧪 Testing Phases

### Pre-Testing Checklist

```bash
# 1. Verify all files are modified
ls -la src/bots/teams-itsupport/controllers/activityController.js
ls -la src/bots/teams-itsupport/services/dialogManager.js
ls -la src/bots/teams-itsupport/services/liveChatService.js
ls -la src/bots/teams-itsupport/services/teamsService.js

# 2. Verify no syntax errors
npm run lint

# 3. Verify startup
npm run dev
# Should see all 5 bots initialize successfully

# 4. Check logs for warnings
# Should not see any attachment-related errors
```

### Phase 1: Activity Controller Testing

**Test Case 1.1: Message with Image Attachment**

```
Setup:
  1. Start bot in live chat session
  2. User sends message with image

Expected:
  ✓ activityController._detectMessageType() returns 'image'
  ✓ _buildMessageObject() creates object with type, contentUrl, name
  ✓ dialogManager receives message object (not text)
  ✓ Logs show: "Message type detected: image"

Verify in Logs:
  "📎 Attachments: 1"
  "Message type detected: image"
  "🟢 LIVE_CHAT_ACTIVE with 1 attachment(s)"
```

**Test Case 1.2: Text Message with No Attachments**

```
Setup:
  1. User sends text-only message in live chat

Expected:
  ✓ _detectMessageType() returns 'text'
  ✓ Message flows through original path
  ✓ Backward compatibility maintained

Verify:
  "📎 Attachments: 0"
  No "LIVE_CHAT_ACTIVE with attachments" message
```

**Test Case 1.3: Non-Live Chat with Attachment**

```
Setup:
  1. User NOT in live chat
  2. User sends message with image

Expected:
  ✓ Message flows through text-only path
  ✓ Attachments ignored (not forwarded to agent)
  ✓ System works as before

Verify:
  Attachments not forwarded to middleware
```

### Phase 2: Dialog Manager Testing

**Test Case 2.1: Accept Message Object**

```
Setup:
  1. Dialog manager receives message object from activity controller

Input:
  {
    type: 'image',
    text: 'Check this',
    contentUrl: 'https://teams.microsoft.com/...',
    name: 'screenshot.png',
    contentType: 'image/png'
  }

Expected:
  ✓ Dialog manager accepts without error
  ✓ Forward to liveChatService with complete object
  ✓ Logs: "Forwarding image message to agent for user XXX"

Verify:
  ✓ No TypeErrors about text.toLowerCase()
  ✓ Message object passed to liveChatService unchanged
```

**Test Case 2.2: Backward Compatibility - String Input**

```
Setup:
  1. Dialog manager receives string (old behavior)

Input:
  "Hello agent!"

Expected:
  ✓ Converted to { type: 'text', text: 'Hello agent!' }
  ✓ Exit keywords still detected
  ✓ Message forwarded successfully

Verify:
  ✓ Old message format still works
  ✓ Exit keywords functional
```

**Test Case 2.3: Exit Keywords - Image Message**

```
Setup:
  1. User sends image with text "exit"

Expected:
  ✓ Exit keyword detected
  ✓ Live chat ended
  ✓ State changed to MAIN_MENU
  ✓ Image NOT forwarded to agent

Verify:
  ✓ Exit keyword checking works with message objects
  ✓ Image not sent to middleware
```

### Phase 3: Live Chat Service Testing

**Test Case 3.1: Display Name Truncation**

```
Setup:
  1. Live chat service processes message

Expected:
  ✓ _getDisplayName() truncates to 70 characters
  ✓ Longer names truncated with "..."
  ✓ Example: "Teams User 29:1YQp..." (70 chars max)

Verify:
  Check logs: "Display name prepared: ..."
  Count characters in payload displayName
  Should be ≤ 70 characters
```

**Test Case 3.2: Message Object Forwarding**

```
Setup:
  1. Service receives image message object
  2. Service sends to middleware

Payload Sent:
  {
    userId: "29:1YQp...",
    displayName: "Teams User 29:1...", // truncated
    channel: "teams",
    message: {
      type: "image",
      text: "Screenshot",
      contentUrl: "https://teams.../image",
      name: "screenshot.png",
      contentType: "image/png"
    }
  }

Expected:
  ✓ Complete message object in payload
  ✓ All attachment data preserved
  ✓ Middleware receives: POST /api/teams-itsupport-direct/live-chat/message/{tenantId}

Verify:
  ✓ Logs show: "Sending image message"
  ✓ Endpoint called with full object
  ✓ Success response from middleware
```

### Phase 4: Middleware Testing

**Awaiting Middleware Team Implementation**

Once middleware code is deployed:

**Test Case 4.1: Text Message**
```
Endpoint: POST /api/teams-itsupport-direct/live-chat/message/showmeavaya
Payload: { type: 'text', text: 'Hello agent!' }
Expected: Message appears in Avaya dashboard
Verify: Agent sees text ✅
```

**Test Case 4.2: Image Message**
```
Endpoint: POST /api/teams-itsupport-direct/live-chat/message/showmeavaya
Payload: {
  type: 'image',
  contentUrl: 'https://teams.microsoft.com/...',
  name: 'screenshot.png'
}
Expected: Image downloaded from Teams, uploaded to Avaya
Verify: Agent sees image thumbnail ✅
```

**Test Case 4.3: Document Message**
```
Payload: {
  type: 'document',
  contentUrl: 'https://teams.microsoft.com/...',
  name: 'error.pdf'
}
Expected: PDF downloaded, forwarded to Avaya
Verify: Agent can download PDF ✅
```

### Phase 5: Agent Response Testing

**Test Case 5.1: Agent Sends Text**

```
Setup:
  1. Agent composes text response in Avaya
  2. Avaya webhook triggers middleware
  3. Middleware calls teamsService.handleAgentResponse()

Expected:
  ✓ Text appears in Teams user chat
  ✓ Proactive message successful
  ✓ Logs: "✅ Agent response sent to Teams user XXX"

Verify:
  ✓ User sees text in Teams
  ✓ User has conversation context
```

**Test Case 5.2: Agent Sends Image**

```
Setup:
  1. Agent attaches image in Avaya
  2. Response includes attachment: {
       fileName: 'solution.png',
       contentType: 'image/png',
       url: 'https://avaya-storage/...'
     }

Expected:
  ✓ Image displays in Teams chat
  ✓ Attachment formatted for Teams API
  ✓ User can view and download

Verify in Teams:
  ✓ Image visible in chat
  ✓ Can view full-size
  ✓ Can download
```

**Test Case 5.3: Agent Sends Multiple Attachments**

```
Setup:
  1. Agent sends 2 attachments (PDF + image)

Expected:
  ✓ Both attachments in Teams chat
  ✓ Each downloadable separately
  ✓ Message and attachments received together

Verify:
  ✓ 2 attachment icons in Teams
  ✓ Both downloadable
```

---

## 🔄 End-to-End Scenarios

### Scenario 1: User Reports Issue with Screenshot

```
Step 1: User starts live chat
  Command: Click "Live Chat"
  System: Transitions to LIVE_CHAT_ACTIVE

Step 2: User sends screenshot
  Action: User clicks "+" → Send image
  File: screenshot_error.png (image/png)

  ✅ Expected Flow:
    1. Activity extracted: attachments[0]
    2. Activity Controller detected type: 'image'
    3. Built message object with contentUrl
    4. Dialog Manager accepts message object
    5. Live Chat Service forwards to middleware
    6. Middleware downloads from Teams
    7. Middleware uploads to Avaya
    8. Agent sees image in Avaya dashboard ✅

Step 3: Agent analyzes and responds
  Agent: Composes response with solution screenshot

  ✅ Expected Flow:
    1. Avaya webhook triggered
    2. Middleware received response with attachment
    3. Called FABLineChatbot agent response endpoint
    4. teamsService formatted attachments
    5. Sent proactive message to Teams user
    6. User sees agent's screenshot ✅

Step 4: Conversation continues
  User: Sends another question (text)

  ✅ Expected:
    Backward compatibility: text flows through as before
```

### Scenario 2: User Sends Multiple Media Types

```
Step 1: Image
  User sends: screenshot.png
  Expected: Agent sees image ✅

Step 2: Document
  User sends: error_log.pdf
  Expected: Agent receives PDF ✅

Step 3: Video
  User sends: recording.mp4
  Expected: Agent can access video ✅

Step 4: Text with Exit
  User sends: "Thanks, exit"
  Expected:
    - Exit keyword detected ✅
    - Live chat ended ✅
    - No more messages sent ✅
    - Dialog state → MAIN_MENU ✅
```

### Scenario 3: Agent Sends Troubleshooting Video

```
Step 1: User describes complex issue
Step 2: Agent records troubleshooting video
Step 3: Agent sends video attachment
Step 4: User receives video in Teams
Step 5: User watches and follows steps
Step 6: Issue resolved ✅
```

---

## 📊 Performance Testing

### Metrics to Measure

| Metric | Target | Status |
|--------|--------|--------|
| Image upload time | < 5 sec | ⏳ Testing |
| Video upload time | < 10 sec | ⏳ Testing |
| Agent response time | < 2 sec | ⏳ Testing |
| File download success | 99% | ⏳ Testing |
| Message delivery | 100% | ⏳ Testing |

### Performance Test Cases

```
Test 1: Large Image Upload
  File: 5MB image
  Expected: Upload within 5 seconds

Test 2: Multiple Concurrent Messages
  Scenario: 5 users send images simultaneously
  Expected: All processed successfully

Test 3: Large Video File
  File: 20MB video
  Expected: Upload and delivery within 15 seconds

Test 4: Rapid Sequential Messages
  Scenario: User sends 3 images in quick succession
  Expected: All delivered in order
```

---

## 🐛 Debugging Guide

### Enable Debug Logging

```bash
# Set DEBUG environment variable
export DEBUG=*

# Or set in .env.teams-itsupport
LOG_LEVEL=debug

# Restart bot
npm run dev
```

### Monitor Key Log Points

1. **Activity Controller:**
   ```
   Watch for: "📎 Attachments: X"
   Watch for: "Message type detected: image|video|audio|document|file"
   Watch for: "🟢 LIVE_CHAT_ACTIVE with X attachment(s)"
   ```

2. **Dialog Manager:**
   ```
   Watch for: "Live chat image|video|etc message from user"
   Watch for: "Forwarding X message to agent"
   Watch for: "X message sent to agent successfully"
   ```

3. **Live Chat Service:**
   ```
   Watch for: "Sending image|video|etc live chat message"
   Watch for: "Display name prepared: ..."
   Watch for: "✅ image message sent successfully"
   ```

4. **Teams Service (Agent Response):**
   ```
   Watch for: "Processing agent response for Teams user"
   Watch for: "Adding X attachment(s) to agent response"
   Watch for: "✅ Proactive message sent successfully"
   ```

### Common Issues & Solutions

| Issue | Symptom | Solution |
|-------|---------|----------|
| Attachment extracted but not forwarded | Middleware doesn't receive image | Check if `dialogState === 'LIVE_CHAT_ACTIVE'` |
| Message object errors | "text.toLowerCase() is not a function" | Ensure dialog manager handles objects, not strings |
| Display name too long | Avaya rejects message | Check truncation in liveChatService |
| Agent response doesn't appear | User doesn't see agent message | Verify conversation reference stored |
| Large files timeout | Upload fails for > 10MB | Increase timeout in middleware |

---

## 📋 Deployment Checklist

### Pre-Deployment

- [ ] All code changes implemented
- [ ] No syntax errors: `npm run lint` ✅
- [ ] All unit tests passing: `npm run test` ⏳
- [ ] Integration tests passing ⏳
- [ ] Team code review approved ⏳
- [ ] Documentation reviewed ⏳

### Deployment Steps

1. **Create Feature Branch**
   ```bash
   git checkout -b feature/teams-rich-media
   ```

2. **Commit Changes**
   ```bash
   git add src/bots/teams-itsupport/controllers/activityController.js
   git add src/bots/teams-itsupport/services/dialogManager.js
   git add src/bots/teams-itsupport/services/liveChatService.js
   git add src/bots/teams-itsupport/services/teamsService.js

   git commit -m "feat: Add rich media support to Teams IT Support bot

   - Phase 1: Extract attachments in activity controller
   - Phase 2: Handle message objects in dialog manager
   - Phase 3: Forward complete messages in live chat service
   - Phase 5: Display agent attachments in Teams

   Supports: image, video, audio, document, file types
   Backward compatible with text-only messages"
   ```

3. **Push and Create PR**
   ```bash
   git push origin feature/teams-rich-media
   ```

4. **Staging Deployment**
   - Deploy to staging environment
   - Run all test cases
   - Verify logs
   - Get approval

5. **Production Deployment**
   - Deploy during off-peak hours
   - Monitor error logs
   - Monitor performance metrics
   - Have rollback plan ready

### Rollback Plan

If issues arise:

```bash
git revert <commit-hash>
git push origin master
npm run dev
# Service should revert to text-only behavior
```

---

## ✅ Sign-Off Checklist

### Development Complete
- [ ] Phase 1 implemented and tested
- [ ] Phase 2 implemented and tested
- [ ] Phase 3 implemented and tested
- [ ] Phase 5 implemented and tested
- [ ] All helper methods working
- [ ] Error handling complete
- [ ] Logging comprehensive

### Middleware Ready
- [ ] Phase 4 code received from middleware team
- [ ] Middleware tested with test payloads
- [ ] File download/upload working
- [ ] Error handling verified

### Testing Complete
- [ ] All 13+ test cases passing
- [ ] E2E scenarios verified
- [ ] Performance acceptable
- [ ] Backward compatibility confirmed
- [ ] Load tested

### Deployment Ready
- [ ] Code reviewed
- [ ] All tests passing
- [ ] Logs clean
- [ ] Documentation complete
- [ ] Team trained

---

## 📞 Support & Questions

### FAB Bank LINE Bot Reference
- Pattern: `src/bots/fabbank/services/liveChatService.js`
- Dialog Manager: `src/bots/fabbank/services/dialogManager.js`
- Message Handler: `src/bots/fabbank/handlers/messageHandler.js`

### Documentation Files
- [TEAMS_RICH_MEDIA_IMPLEMENTATION_PLAN.md](TEAMS_RICH_MEDIA_IMPLEMENTATION_PLAN.md)
- [RICH_MEDIA_FLOW_COMPARISON.md](RICH_MEDIA_FLOW_COMPARISON.md)
- [CODE_EXAMPLES_RICH_MEDIA.md](CODE_EXAMPLES_RICH_MEDIA.md)
- [MIDDLEWARE_IMPLEMENTATION_PHASE4.md](MIDDLEWARE_IMPLEMENTATION_PHASE4.md)
- [MIDDLEWARE_AGENT_RESPONSE_HANDLER.md](MIDDLEWARE_AGENT_RESPONSE_HANDLER.md)

