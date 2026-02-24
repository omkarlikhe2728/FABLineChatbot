# Teams IT Support Bot - Rich Media Live Chat Implementation Plan

## 📊 Analysis: FAB Bank LINE Bot vs Teams IT Support Bot

### ✅ FAB Bank LINE Chatbot - How It Works (Reference Architecture)

#### 1. **Webhook Reception** (`webhookController.js:82-106`)
```
LINE User sends ANY type of message (text, image, video, audio, file, location, sticker)
    ↓
Webhook receives complete event with message object
    ↓
If dialogState === LIVE_CHAT_ACTIVE:
    → Forward entire message object (not just text)
    → messageHandler.handleLiveChatMessage(replyToken, userId, event.message)
Else:
    → Only handle if message.type === 'text'
```

**Key Design:**
- Check dialog state FIRST to allow rich media in live chat
- Pass complete message object from LINE, don't extract/parse

#### 2. **Message Handler** (`messageHandler.js:55-99`)
```
handleLiveChatMessage(replyToken, userId, message)
    ↓
Pass entire message object to dialogManager
    ↓
dialogManager.processMessage(userId, dialogState, message, attributes)
                                                     ↑
                                            Complete object, not text
```

**Key Design:**
- Message parameter = entire LINE message object (not just text)
- Support all types: text, image, video, audio, file, location, sticker

#### 3. **Dialog Manager** (`dialogManager.js:842-897`)
```
_handleLiveChatMessage(userId, message)
    ↓
If typeof message === 'string':
    → Wrap: { type: 'text', text: message }
    ↓
If message.type === 'text':
    → Check exit keywords (only for text)
    ↓
Forward entire message object to liveChatService.sendMessage()
    ↓
Return { messages: [] }  // Agent will respond via middleware
```

**Key Design:**
- Backward compatibility: handle string or object
- Exit keywords only for text messages
- Forward raw message object, middleware handles type-specific processing

#### 4. **Live Chat Service** (`liveChatService.js:99-162`)
```
sendMessage(userId, message)
    ↓
If typeof message === 'string':
    → Wrap: { type: 'text', text: message }
    ↓
Get user profile for displayName
    ↓
Create payload:
    {
      userId: "LINE_USER_ID",
      displayName: "User Name",
      channel: "line",
      message: message  // ENTIRE object - could be text, image, video, etc.
    }
    ↓
POST to middleware: /api/line-direct/live-chat/message/{tenantId}
    ↓
Middleware handles:
    - For text: forward to Avaya
    - For image/video: download from LINE, forward URL/data to Avaya
    - For documents: handle type-specific processing
```

**Key Design:**
- Pass complete message object to middleware
- Middleware is responsible for type-specific handling
- Supports: text, image, video, audio, file, location, sticker

#### 5. **Middleware Handling** (Avaya connector)
- Receives message object with `type` field
- Based on type, handles appropriately:
  - **text**: Direct message to Avaya
  - **image/video**: Download from LINE using messageId, upload to Avaya
  - **audio/file**: Similar to video
  - **location**: Extract coordinates, format for Avaya
  - **sticker**: Handle or convert to image

**Result for Agent:**
- Agent sees rich media in Avaya dashboard
- Image thumbnails, video files, documents all visible
- Can respond with images/documents back

---

## ❌ Teams IT Support Bot - Current Limitations

### Current Flow:
```
Teams User sends message
    ↓
Activity webhook received
    ↓
handleMessage(activity)
    ├─ Extract: activity.text
    ├─ Extract: activity.value (Adaptive Card action data)
    └─ NO extraction of activity.attachments
    ↓
dialogManager.processMessage(..., text, ...)
    ├─ ONLY accepts text parameter
    ├─ Always creates: { type: 'text', text: text }
    └─ Never passes other types
    ↓
liveChatService.sendMessage(userId, { type: 'text', text })
    ├─ Sends to middleware: /api/teams-itsupport-direct/live-chat/message/{tenantId}
    └─ Middleware only receives text
    ↓
Agent in Avaya sees ONLY text
    ├─ Image sent by user: NOT visible
    ├─ Document sent by user: NOT visible
    ├─ Video sent by user: NOT visible
    └─ Only the message text appears (if any)
```

### Missing Pieces:
1. ❌ Activity controller doesn't extract attachment data
2. ❌ Activity controller doesn't check LIVE_CHAT_ACTIVE state
3. ❌ Dialog manager doesn't handle non-text messages during live chat
4. ❌ Live chat service only sends text messages
5. ❌ Middleware doesn't receive attachment metadata

---

## 🎯 Implementation Plan: Add Rich Media Support

### Phase 1: Activity Controller - Extract All Message Types (**Files: activityController.js**)

**Current Problem (Line 72-76):**
```javascript
async handleMessage(activity) {
  const userId = activity.from.id;
  const text = activity.text?.trim() || '';  // ❌ Only text
  const actionData = activity.value;          // Only Adaptive Card actions
}
```

**Changes Required:**
```javascript
async handleMessage(activity) {
  const userId = activity.from.id;
  const text = activity.text?.trim() || '';
  const actionData = activity.value;

  // ✅ NEW: Extract attachments (images, documents, videos, etc.)
  const attachments = activity.attachments || [];

  // ✅ NEW: Extract message type
  const messageType = this._detectMessageType(text, attachments);

  // Get session
  let session = this.sessionService.getSession(userId);
  if (!session) {
    session = this.sessionService.createSession(userId);
  }

  const { dialogState } = session;

  // ✅ NEW: Check if in LIVE_CHAT_ACTIVE to handle all types
  if (dialogState === 'LIVE_CHAT_ACTIVE') {
    // Build complete message object
    const message = this._buildMessageObject(text, attachments, messageType);

    // Process through dialog manager (pass message object, not just text)
    const result = await this.dialogManager.processMessage(
      userId,
      dialogState,
      message,  // ✅ Complete object with attachments
      actionData,
      session.attributes
    );
  } else {
    // Original behavior: only text outside live chat
    const result = await this.dialogManager.processMessage(
      userId,
      dialogState,
      text,
      actionData,
      session.attributes
    );
  }

  // Send response cards...
}

// ✅ NEW: Detect message type
_detectMessageType(text, attachments) {
  if (attachments && attachments.length > 0) {
    const attachment = attachments[0];
    if (attachment.contentType.startsWith('image/')) return 'image';
    if (attachment.contentType.startsWith('video/')) return 'video';
    if (attachment.contentType.startsWith('audio/')) return 'audio';
    if (attachment.contentType.includes('document') ||
        attachment.contentType.includes('pdf')) return 'document';
    return 'file';
  }
  return 'text';
}

// ✅ NEW: Build message object similar to LINE format
_buildMessageObject(text, attachments, messageType) {
  const message = {
    type: messageType,
    text: text || '',
    attachments: attachments || []
  };

  // Add type-specific data
  if (messageType === 'image' && attachments.length > 0) {
    message.contentUrl = attachments[0].contentUrl;
    message.name = attachments[0].name;
    message.contentType = attachments[0].contentType;
  } else if (messageType === 'document' && attachments.length > 0) {
    message.contentUrl = attachments[0].contentUrl;
    message.name = attachments[0].name;
    message.contentType = attachments[0].contentType;
  }

  return message;
}
```

**Deliverables:**
- [ ] Extract `activity.attachments` array
- [ ] Detect message type (image, video, audio, document, text, file)
- [ ] Build message object with type and attachment data
- [ ] Check dialogState to allow rich media in LIVE_CHAT_ACTIVE
- [ ] Pass message object to dialogManager instead of just text

---

### Phase 2: Dialog Manager - Handle Rich Media (**Files: dialogManager.js**)

**Current Problem (Lines 468-506):**
```javascript
async _handleLiveChat(userId, text, actionData, attributes) {
  if (!text) {
    return { cards: [] };
  }

  const message = text.toLowerCase().trim();

  // ❌ Only handles text, converts to message object
  await liveChatService.sendMessage(userId, {
    type: 'text',
    text: text
  });
}
```

**Changes Required:**
```javascript
async _handleLiveChat(userId, input, actionData, attributes) {
  // ✅ NEW: Handle both text (backward compat) and message objects
  let message = input;

  // Backward compatibility: convert string to message object
  if (typeof input === 'string') {
    message = { type: 'text', text: input };
  }

  // ✅ NEW: Extract text for keyword checking
  const textContent = message.type === 'text' ? message.text : '';

  // Check for exit keywords (text messages only)
  if (message.type === 'text') {
    const lowerText = textContent.toLowerCase().trim();
    const exitKeywords = /\b(exit|quit|end|bye|goodbye|done|disconnect)\b/i;

    if (exitKeywords.test(lowerText)) {
      await liveChatService.endLiveChat(userId);
      return {
        cards: [this.templateService.getLiveChatEndedCard()],
        newDialogState: 'MAIN_MENU'
      };
    }
  }

  // ✅ NEW: Forward entire message object (including attachments) to agent
  try {
    logger.info(`Forwarding ${message.type} message to agent for user ${userId}`);
    const chatResult = await this.liveChatService.sendMessage(userId, message);

    if (chatResult.success) {
      logger.info(`${message.type} message forwarded to agent for user ${userId}`);
      return {
        cards: [],  // No card response - agent will respond directly
        newDialogState: 'LIVE_CHAT_ACTIVE'
      };
    } else {
      return {
        cards: [this.templateService.getErrorCard('Failed', 'Could not send message')],
        newDialogState: 'LIVE_CHAT_ACTIVE'
      };
    }
  } catch (error) {
    logger.error(`Failed to send message to agent: ${error.message}`);
    return {
      cards: [this.templateService.getErrorCard('Failed', 'Could not send message')],
      newDialogState: 'LIVE_CHAT_ACTIVE'
    };
  }
}
```

**Signature Change:**
```javascript
// BEFORE:
processMessage(userId, dialogState, text, actionData, attributes)

// AFTER:
processMessage(userId, dialogState, input, actionData, attributes)
//                                   ↑ Can be string OR message object
```

**Deliverables:**
- [ ] Accept both string (backward compat) and message object parameters
- [ ] Extract text from message object for keyword checking
- [ ] Only check exit keywords for text messages
- [ ] Pass entire message object to liveChatService
- [ ] Handle all message types: text, image, video, audio, document, file

---

### Phase 3: Live Chat Service - Forward Rich Media (**Files: liveChatService.js**)

**Current Implementation (Lines 56-79):**
```javascript
async sendMessage(userId, message) {
  const endpoint = `${this.baseUrl}api/teams-itsupport-direct/live-chat/message/${this.tenantId}`;

  const payload = {
    userId,
    displayName: `Teams User ${userId}`,
    channel: 'teams',
    message  // Currently only receives { type: 'text', text: '...' }
  };

  const response = await this.client.post(endpoint, payload);
}
```

**Changes Required:**
```javascript
async sendMessage(userId, message) {
  try {
    // ✅ NEW: Handle backward compatibility (string input)
    if (typeof message === 'string') {
      message = { type: 'text', text: message };
    }

    const messageType = message.type || 'text';
    logger.info(`Sending ${messageType} live chat message for user ${userId}`);

    const endpoint = `${this.baseUrl}api/teams-itsupport-direct/live-chat/message/${this.tenantId}`;

    // ✅ NEW: Get Teams user display name (truncate to max 70 chars)
    const displayName = await this._getDisplayName(userId);

    const payload = {
      userId,
      displayName,
      channel: 'teams',
      message: message  // ✅ Pass entire message object with all types
    };

    logger.debug(`Forwarding ${messageType} to middleware:`, {
      endpoint,
      userId,
      messageType,
      hasAttachments: message.attachments?.length > 0
    });

    const response = await this.client.post(endpoint, payload);

    logger.info(`${messageType} message sent successfully for user ${userId}`);
    return { success: true, data: response.data };
  } catch (error) {
    logger.error(`Failed to send ${message?.type || 'unknown'} message for ${userId}`, {
      message: error.message,
      status: error.response?.status
    });
    return { success: false, error: error.message };
  }
}

// ✅ NEW: Get Teams user display name with truncation
async _getDisplayName(userId) {
  // Extract from Teams user ID or use fallback
  // Teams format: '29:1YQp...'
  // Truncate to max 70 chars (Avaya API requirement)
  let displayName = `Teams User ${userId}`;

  if (displayName.length > 70) {
    displayName = displayName.substring(0, 67) + '...';
  }

  return displayName;
}
```

**Supported Message Types:**
```javascript
// Text message
{ type: 'text', text: 'Hello agent' }

// Image message
{
  type: 'image',
  contentUrl: 'https://teams.microsoft.com/...',
  name: 'screenshot.png',
  contentType: 'image/png'
}

// Document message
{
  type: 'document',
  contentUrl: 'https://teams.microsoft.com/...',
  name: 'report.pdf',
  contentType: 'application/pdf'
}

// Video message
{
  type: 'video',
  contentUrl: 'https://teams.microsoft.com/...',
  name: 'recording.mp4',
  contentType: 'video/mp4'
}

// Audio message
{
  type: 'audio',
  contentUrl: 'https://teams.microsoft.com/...',
  name: 'voice.m4a',
  contentType: 'audio/m4a'
}

// File (generic)
{
  type: 'file',
  contentUrl: 'https://teams.microsoft.com/...',
  name: 'data.xlsx',
  contentType: 'application/vnd.ms-excel'
}
```

**Deliverables:**
- [ ] Accept message object with all types
- [ ] Extract display name and truncate to 70 chars (Avaya requirement)
- [ ] Pass complete message object to middleware
- [ ] Log message type for debugging
- [ ] Support all content types: image, video, audio, document, file, text

---

### Phase 4: Middleware Enhancement (**Files: middleware/teams-itsupport.controller.ts**)

**Current Endpoint:** `/api/teams-itsupport-direct/live-chat/message/{tenantId}`

**Enhancement Required:**

```typescript
// Handle incoming message from Teams user to agent
@Post('/live-chat/message/:tenantId')
async handleLiveChatMessage(
  @Body() payload: {
    userId: string;
    displayName: string;
    channel: 'teams';
    message: {
      type: 'text' | 'image' | 'video' | 'audio' | 'document' | 'file';
      text?: string;
      contentUrl?: string;
      name?: string;
      contentType?: string;
      attachments?: any[];
    };
  }
) {
  const { message, userId, displayName } = payload;

  // ✅ NEW: Handle based on message type
  switch (message.type) {
    case 'text':
      // Send text to Avaya directly
      await this.sendToAvaya(message.text, userId, displayName);
      break;

    case 'image':
    case 'video':
    case 'audio':
    case 'document':
    case 'file':
      // ✅ NEW: Download from Teams, upload to Avaya
      const downloadedContent = await this.downloadFromTeams(
        message.contentUrl
      );
      await this.sendToAvayaWithAttachment(
        downloadedContent,
        message.name,
        message.contentType,
        userId,
        displayName
      );
      break;
  }
}

// ✅ NEW: Helper to download from Teams URL
private async downloadFromTeams(contentUrl: string): Promise<Buffer> {
  // Use Teams Bearer token to download
  const token = await this.getTeamsToken();
  const response = await axios.get(contentUrl, {
    headers: { Authorization: `Bearer ${token}` },
    responseType: 'arraybuffer'
  });
  return response.data;
}

// ✅ NEW: Helper to send attachment to Avaya
private async sendToAvayaWithAttachment(
  fileContent: Buffer,
  fileName: string,
  contentType: string,
  userId: string,
  displayName: string
) {
  // Send to Avaya with file attachment
  // Avaya API typically uses multipart/form-data
  const formData = new FormData();
  formData.append('userId', userId);
  formData.append('displayName', displayName);
  formData.append('content', fileContent);
  formData.append('fileName', fileName);
  formData.append('contentType', contentType);

  await axios.post(
    `${AVAYA_API_URL}/messages/with-attachment`,
    formData,
    { headers: formData.getHeaders() }
  );
}
```

**Deliverables:**
- [ ] Detect message type
- [ ] For text: send directly to Avaya
- [ ] For files: download from Teams, upload to Avaya
- [ ] Send file metadata (name, contentType) to Avaya
- [ ] Handle all media types

---

### Phase 5: Agent Response Handler - Display Media in Teams (**Files: middleware/teams-itsupport.controller.ts**)

**When Agent Sends Response with Attachments:**

```typescript
// Middleware receives from Avaya: agent response with attachments
// Need to convert to Teams-compatible format

@Post('/agent-response')
async handleAgentResponse(
  @Body() payload: {
    userId: string;
    text: string;
    attachments?: {
      type: 'image' | 'document' | 'video' | 'audio' | 'file';
      url: string;
      name: string;
      contentType: string;
    }[];
  }
) {
  const { userId, text, attachments } = payload;

  // Build Teams-compatible message
  const teamsMessage = {
    type: 'message',
    text: text,
    from: { id: TEAMS_BOT_ID, name: 'IT Support Agent' },
    attachments: []
  };

  // ✅ NEW: Handle attachments
  if (attachments && attachments.length > 0) {
    for (const attachment of attachments) {
      teamsMessage.attachments.push({
        contentType: attachment.contentType,
        contentUrl: attachment.url,
        name: attachment.name
      });
    }
  }

  // Send to Teams user via teamsService
  const conversationRef = this.getConversationReference(userId);
  await this.teamsService.sendProactiveMessage(
    conversationRef,
    text,
    teamsMessage.attachments
  );
}
```

**Deliverables:**
- [ ] Extract attachments from Avaya response
- [ ] Build Teams attachment format
- [ ] Send via teamsService.sendProactiveMessage()
- [ ] Display attachments in Teams chat

---

## 📋 Implementation Checklist

### Phase 1: Activity Controller
- [ ] Extract `activity.attachments` from Teams message
- [ ] Detect message type (image, video, audio, document, file, text)
- [ ] Add `_buildMessageObject()` method
- [ ] Add `_detectMessageType()` method
- [ ] Check dialogState === 'LIVE_CHAT_ACTIVE' to allow rich media
- [ ] Pass message object (not just text) to dialogManager during live chat
- [ ] Test with image, video, audio, document, text messages
- [ ] Commit: `feat: Extract attachment data in activity controller`

### Phase 2: Dialog Manager
- [ ] Update `_handleLiveChat()` to accept message objects
- [ ] Add backward compatibility for string inputs
- [ ] Extract text from message objects for exit keyword checking
- [ ] Check exit keywords only for text messages
- [ ] Pass entire message object to liveChatService
- [ ] Test all message types in live chat
- [ ] Commit: `feat: Support rich media in dialog manager live chat`

### Phase 3: Live Chat Service
- [ ] Add `_getDisplayName()` method with 70-char truncation
- [ ] Update `sendMessage()` to handle message objects
- [ ] Add type-specific logging
- [ ] Support all message types in payload
- [ ] Test endpoint receives complete message objects
- [ ] Commit: `feat: Forward rich media to middleware in live chat service`

### Phase 4: Middleware Controller
- [ ] Add type detection in message handler
- [ ] Add `downloadFromTeams()` method
- [ ] Add `sendToAvayaWithAttachment()` method
- [ ] Handle each media type appropriately
- [ ] Test Avaya receives files and metadata
- [ ] Commit: `feat: Handle rich media forwarding to Avaya in middleware`

### Phase 5: Agent Response Handler
- [ ] Add attachment handling in agent response
- [ ] Build Teams-compatible attachment format
- [ ] Integrate with `teamsService.sendProactiveMessage()`
- [ ] Test agent images/documents display in Teams
- [ ] Commit: `feat: Display agent attachments in Teams chat`

---

## 🔄 Data Flow Diagram

```
TEAMS USER sends IMAGE
    ↓
Teams Webhook → activity.attachments
    ↓
ActivityController._buildMessageObject()
    {
      type: 'image',
      contentUrl: 'https://teams...',
      name: 'screenshot.png',
      contentType: 'image/png'
    }
    ↓
DialogManager._handleLiveChat(message_object)
    ↓
LiveChatService.sendMessage(message_object)
    ↓
POST /api/teams-itsupport-direct/live-chat/message/showmeavaya
{
  userId: '29:1YQp...',
  displayName: 'John Doe',
  channel: 'teams',
  message: {
    type: 'image',
    contentUrl: 'https://teams.../image.png',
    name: 'screenshot.png',
    contentType: 'image/png'
  }
}
    ↓
Middleware Controller
    ├─ Detects type: 'image'
    ├─ Downloads from Teams URL
    └─ Uploads to Avaya with metadata
    ↓
AVAYA AGENT sees IMAGE
─────────────────────────────────────────────
AGENT sends IMAGE + TEXT
    ↓
Middleware receives Avaya response
    ↓
Convert to Teams format:
{
  type: 'message',
  text: 'Here is the solution screenshot',
  attachments: [{
    contentType: 'image/png',
    contentUrl: 'https://avaya-storage/...',
    name: 'solution.png'
  }]
}
    ↓
TeamsService.sendProactiveMessage()
    ↓
Teams API POST v3/conversations/{conversationId}/activities
    ↓
TEAMS USER sees IMAGE IN CHAT ✅
```

---

## 🧪 Testing Scenarios

### Scenario 1: User Sends Image During Live Chat
1. Open Teams, start live chat with IT Support
2. Send an image (screenshot)
3. Verify:
   - Activity controller extracts attachment
   - Image URL captured
   - Middleware downloads image
   - Agent sees image in Avaya dashboard

### Scenario 2: User Sends Document During Live Chat
1. Start live chat
2. Upload PDF or Word document
3. Verify:
   - Attachment extracted
   - File metadata sent to middleware
   - Agent receives file link in Avaya
   - Can download/preview

### Scenario 3: Agent Sends Image Response
1. User sends issue image
2. Agent responds with solution image
3. Verify:
   - Middleware receives agent response with image
   - Image displayed in Teams chat
   - User can view/download

### Scenario 4: Backward Compatibility
1. Ensure text-only messages still work
2. Ensure exit keywords still work
3. Ensure old dialog states not affected

---

## 🔒 Security Considerations

1. **Teams Content URLs are temporary** - Usually expire in 24 hours
   - Store if needed for long-term access
   - Or process immediately during download

2. **File Type Validation**
   - Validate MIME types against whitelist
   - Prevent malicious files being uploaded
   - Limit file size (e.g., 25MB max)

3. **Authentication**
   - All middleware endpoints should require Teams bot token
   - Validate userId matches Teams user
   - Log all file transfers for audit trail

4. **Data Privacy**
   - Ensure files not stored longer than necessary
   - Comply with data residency requirements
   - Use HTTPS for all file transfers

---

## 📝 Migration Path (No Breaking Changes)

All changes are backward compatible:
- String inputs still accepted and converted to message objects
- Text-only conversations work unchanged
- Exit keywords still function
- Only new capability is rich media in LIVE_CHAT_ACTIVE state

---

## 🎓 Key Differences: LINE vs Teams Media Handling

| Aspect | LINE | Teams |
|--------|------|-------|
| **Attachment Location** | `event.message.type` | `activity.attachments[]` |
| **URL Format** | LINE media ID | HTTPS content URL (temporary) |
| **Access** | LINE SDK with token | Teams API with Bearer token |
| **File Size** | Varies | Typically 25MB max |
| **Expiry** | Permanent | 24 hours (usually) |
| **Types** | text, image, video, audio, file, location, sticker | All MIME types |
| **Middleware Processing** | Download from LINE, forward to Avaya | Download from Teams, forward to Avaya |

