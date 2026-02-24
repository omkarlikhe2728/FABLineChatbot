# Rich Media Flow: LINE Bot vs Teams Bot (Visual Comparison)

## 🟢 FAB BANK LINE BOT - WORKING ARCHITECTURE

### How User Sends Image → Agent Receives in Avaya

```
┌─────────────────────────────────────────────────────────────────┐
│                   TEAMS USER SENDS MESSAGE                       │
│                    (Text, Image, Video, etc)                     │
└────────────────────────┬──────────────────────────────────────────┘
                         │
                    [LINE Webhook]
                         │
          ┌──────────────┴──────────────┐
          │   event.message object       │
          │   ├─ type: "text|image|..."  │
          │   ├─ text: "Hello"           │
          │   ├─ id: "message_id"        │
          │   └─ contentProvider: {...}  │
          └──────────────┬──────────────┘
                         │
        ┌────────────────▼─────────────────┐
        │  webhookController.processEvent  │
        │  (Line 49-120)                   │
        │                                  │
        │  1. Check session.dialogState    │
        │  2. IF = LIVE_CHAT_ACTIVE:       │
        │       → Handle ALL message types │
        │  3. ELSE:                        │
        │       → Only handle text         │
        └────────────────┬─────────────────┘
                         │
                         │ (Line 91-96)
                    [LIVE CHAT ACTIVE]
                         │
        ┌────────────────▼──────────────────────┐
        │  messageHandler.handleLiveChatMessage │
        │  (Line 55-99)                         │
        │                                       │
        │  Pass ENTIRE message object          │
        │  (not just text!)                    │
        └────────────────┬──────────────────────┘
                         │
        ┌────────────────▼───────────────────────────┐
        │  dialogManager._handleLiveChatMessage      │
        │  (Line 842-897)                           │
        │                                           │
        │  1. Accept string OR message object       │
        │  2. If text: check exit keywords          │
        │  3. Forward ENTIRE object to agent        │
        └────────────────┬───────────────────────────┘
                         │
        ┌────────────────▼──────────────────────┐
        │  liveChatService.sendMessage()        │
        │  (Line 99-162)                        │
        │                                       │
        │  const payload = {                   │
        │    userId: "LINE_USER_ID",           │
        │    displayName: "John Doe",          │
        │    channel: "line",                  │
        │    message: {                        │◄─── COMPLETE OBJECT
        │      type: "image",                  │     with all data
        │      id: "msg_123",                  │
        │      contentUrl: "...",              │
        │      ...                             │
        │    }                                 │
        │  }                                   │
        └────────────────┬──────────────────────┘
                         │
                    [MIDDLEWARE]
                         │
        ┌────────────────▼──────────────────────┐
        │  POST /api/line-direct/              │
        │      live-chat/message/{tenantId}    │
        │                                       │
        │  1. Detect type: "image"             │
        │  2. Download from LINE using ID      │
        │  3. Upload to Avaya with metadata    │
        └────────────────┬──────────────────────┘
                         │
              ┌──────────▼──────────┐
              │   AVAYA DASHBOARD   │
              │                     │
              │  👤 John Doe        │
              │  🖼️ [Image Thumb]   │
              │  🔗 View Full Size  │
              │  💾 Download        │
              └─────────────────────┘
```

---

## 🔴 TEAMS IT SUPPORT BOT - CURRENT STATE (LIMITED)

### User Sends Image → Agent Gets Only Text

```
┌──────────────────────────────────────────────────────────┐
│            TEAMS USER SENDS MESSAGE & IMAGE              │
│              activity.attachments[0]                      │
└────────────────────┬─────────────────────────────────────┘
                     │
              [Teams Webhook]
                     │
     ┌───────────────▼───────────────┐
     │  activity object              │
     │  ├─ text: "Here's the issue"  │
     │  ├─ attachments: [{           │◄─── IMAGE HERE!
     │  │    contentUrl: "...",       │
     │  │    contentType: "image/png" │
     │  │  }]                         │
     │  └─ value: {...}              │
     └───────────────┬───────────────┘
                     │
     ┌───────────────▼──────────────────┐
     │ ActivityController.handleMessage │
     │ (Line 72-127)                    │
     │                                  │
     │ Extract:                         │
     │ ├─ text = "Here's the issue"    │
     │ ├─ actionData = {...}           │
     │ └─ ❌ attachments IGNORED!      │
     │                                  │
     │ NO check for LIVE_CHAT_ACTIVE   │
     │ (Line 94-100)                   │
     └───────────────┬──────────────────┘
                     │
     ┌───────────────▼────────────────────────┐
     │ DialogManager.processMessage()         │
     │ (Line 16)                              │
     │                                        │
     │ Receives: text = "Here's the issue"   │
     │ ❌ NO message object                   │
     │ ❌ NO attachment data                  │
     └───────────────┬────────────────────────┘
                     │
     ┌───────────────▼────────────────────────┐
     │ DialogManager._handleLiveChat()        │
     │ (Line 468-506)                         │
     │                                        │
     │ Creates:                               │
     │ message = {                            │
     │   type: "text",                        │◄─── FORCED TO TEXT!
     │   text: "Here's the issue"             │
     │ }                                      │
     │                                        │
     │ ❌ Image attachment discarded          │
     └───────────────┬────────────────────────┘
                     │
     ┌───────────────▼──────────────────────┐
     │ LiveChatService.sendMessage()        │
     │ (Line 56-79)                         │
     │                                      │
     │ const payload = {                    │
     │   userId: "29:1YQp...",              │
     │   displayName: "Teams User...",      │
     │   channel: "teams",                  │
     │   message: {                         │
     │     type: "text",                    │◄─── ONLY TEXT!
     │     text: "Here's the issue"         │
     │   }                                  │
     │ }                                    │
     └───────────────┬──────────────────────┘
                     │
                [MIDDLEWARE]
                     │
     ┌───────────────▼──────────────────┐
     │  POST /api/teams-itsupport-      │
     │      direct/live-chat/message    │
     │                                  │
     │  Receives ONLY text              │
     │  ❌ No image data                 │
     └───────────────┬──────────────────┘
                     │
          ┌──────────▼──────────┐
          │   AVAYA DASHBOARD   │
          │                     │
          │  👤 Teams User...   │
          │  💬 "Here's the..." │
          │  ❌ No image!       │
          │  ❌ No attachment!  │
          └─────────────────────┘
```

---

## 🎯 WHAT NEEDS TO CHANGE

### 1️⃣ Activity Controller - Extract Attachments

```diff
  async handleMessage(activity) {
    const userId = activity.from.id;
    const text = activity.text?.trim() || '';
+   const attachments = activity.attachments || [];  // ← NEW
+
+   // Check session state
    let session = this.sessionService.getSession(userId);
+   const { dialogState } = session;
+
+   // ← NEW: Check for LIVE_CHAT_ACTIVE
+   if (dialogState === 'LIVE_CHAT_ACTIVE' && attachments.length > 0) {
+     // Build message object with attachments
+     const message = this._buildMessageObject(text, attachments);
+     // Pass to dialogManager
+     const result = await this.dialogManager.processMessage(
+       userId,
+       dialogState,
+       message,  // ← Object with attachments
+       actionData,
+       attributes
+     );
+   } else {
+     // Original text-only handling
+   }
  }
```

### 2️⃣ Dialog Manager - Handle Message Objects

```diff
  async _handleLiveChat(userId, text, actionData, attributes) {
-   if (!text) {
-     return { cards: [] };
-   }
-
-   const message = text.toLowerCase().trim();
+   // Accept string OR message object
+   let message = text;  // Could be string or object
+
+   if (typeof text === 'string') {
+     message = { type: 'text', text };
+   }
+
+   // Only check keywords for text messages
+   if (message.type === 'text') {
+     const exitKeywords = [...];
+     if (exitKeywords.test(message.text)) {
+       // Exit logic
+     }
+   }

    // Forward ENTIRE message object (including attachments)
    await liveChatService.sendMessage(userId, message);
  }
```

### 3️⃣ Live Chat Service - Support All Types

```diff
  async sendMessage(userId, message) {
+   // Handle string (backward compat)
+   if (typeof message === 'string') {
+     message = { type: 'text', text: message };
+   }
+
-   const payload = {
+   const messageType = message.type || 'text';
+   logger.info(`Sending ${messageType} message...`);
+
+   const payload = {
      userId,
-     displayName: `Teams User ${userId}`,
+     displayName: this._truncateDisplayName(`Teams User ${userId}`),
      channel: 'teams',
-     message: { type: 'text', text }
+     message: message  // ← Pass entire object!
    };
  }
```

### 4️⃣ Middleware - Handle Attachments

```diff
  async handleLiveChatMessage(@Body() payload) {
    const { message, userId } = payload;
+
+   switch (message.type) {
+     case 'image':
+     case 'document':
+     case 'video':
+       // Download from Teams
+       const file = await this.downloadFromTeams(message.contentUrl);
+       // Send to Avaya with attachment
+       await this.sendToAvayaWithAttachment(file, message);
+       break;
+
+     case 'text':
+     default:
+       await this.sendTextToAvaya(message.text);
+   }
  }
```

---

## 📊 Side-by-Side Comparison

| Component | LINE Bot ✅ | Teams Bot ❌ | Status |
|-----------|-----------|-----------|--------|
| **Attachment Extraction** | ✅ Full event.message | ❌ Ignored | Needs Phase 1 |
| **Dialog State Check** | ✅ Checks state | ❌ Missing | Needs Phase 1 |
| **Message Object Pass** | ✅ Complete object | ❌ Text only | Needs Phase 2 |
| **Backward Compat** | ✅ Built-in | ⚠️ Not needed | Phase 2 |
| **Exit Keywords** | ✅ Text only | ❌ Text assumed | Needs Phase 2 |
| **Middleware Handling** | ✅ Type-based | ❌ Text only | Needs Phase 4 |
| **Agent Response Display** | ✅ All types | ❌ Text only | Needs Phase 5 |

---

## 🔄 Data Structure Transformation

### BEFORE (Current Teams Bot)
```javascript
// Activity from Teams
{
  type: 'message',
  from: { id: '29:1YQp...' },
  text: 'Here is a screenshot',
  attachments: [{
    contentType: 'image/png',
    contentUrl: 'https://teams.microsoft.com/image.png',
    name: 'screenshot.png'
  }]
}

// Activity Controller extracts
→ text = 'Here is a screenshot'
→ ❌ attachments discarded

// DialogManager creates
→ { type: 'text', text: 'Here is a screenshot' }

// Middleware receives
→ { type: 'text', text: 'Here is a screenshot' }

// Agent sees
→ 💬 "Here is a screenshot"
→ ❌ No image
```

### AFTER (Enhanced Teams Bot)
```javascript
// Activity from Teams
{
  type: 'message',
  from: { id: '29:1YQp...' },
  text: 'Here is a screenshot',
  attachments: [{
    contentType: 'image/png',
    contentUrl: 'https://teams.microsoft.com/image.png',
    name: 'screenshot.png'
  }]
}

// Activity Controller extracts
→ text = 'Here is a screenshot'
→ ✅ attachments captured
→ _buildMessageObject() creates...

{
  type: 'image',
  text: 'Here is a screenshot',
  contentUrl: 'https://teams.microsoft.com/image.png',
  name: 'screenshot.png',
  contentType: 'image/png',
  attachments: [...]
}

// DialogManager receives
→ ✅ Complete message object
→ ✅ Passes to liveChatService

// Middleware receives
→ ✅ Complete message with type 'image'
→ ✅ Downloads image
→ ✅ Uploads to Avaya

// Agent sees
→ 💬 "Here is a screenshot"
→ 🖼️ [Image Thumbnail]
→ ✅ Can view/download
```

---

## 📋 Quick Implementation Order

### Day 1: Core Changes
1. Phase 1: Activity Controller attachment extraction
2. Phase 2: Dialog Manager rich media support
3. Test: Ensure message objects flow through system

### Day 2: Integration
4. Phase 3: Live Chat Service updates
5. Phase 4: Middleware attachment handling
6. Test: Images reach agent in Avaya

### Day 3: Completion
7. Phase 5: Agent response display
8. End-to-end testing
9. Documentation

---

## 🧪 Testing Checklist

```
BEFORE IMPLEMENTATION
✓ Backup current code
✓ Create feature branch: feature/teams-rich-media
✓ Note current working state

DURING IMPLEMENTATION
✓ Phase 1 done? Test message extraction
✓ Phase 2 done? Test dialog flow
✓ Phase 3 done? Test middleware receives object
✓ Phase 4 done? Test agent sees attachments
✓ Phase 5 done? Test user sees agent response

FINAL VERIFICATION
□ Text-only messages still work
□ Exit keywords still work
□ Image sends correctly
□ Video sends correctly
□ Document sends correctly
□ Agent can reply with images
□ Agent responses display in Teams
□ No errors in logs
□ Performance acceptable

COMMIT CHECKLIST
□ All tests passing
□ Code follows existing patterns
□ Comments added for complex logic
□ No console.logs left
□ Environment variables documented
```

---

## 💡 Key Insights

1. **LINE Bot Already Has It** → Copy the pattern!
   - Webhook receives complete message object
   - Dialog manager handles all types
   - Middleware does type-specific processing

2. **Teams Has All Data** → Just extract it!
   - `activity.attachments` exists but ignored
   - ContentUrl available from Teams
   - Can download and forward immediately

3. **Middleware Needs Minimal Changes**
   - Add type detection (1 function)
   - Add file download (1 function)
   - Add Avaya attachment upload (1 function)

4. **Agent Experience Improves Instantly**
   - User sends image → Agent sees image
   - Faster problem resolution
   - Better customer satisfaction

