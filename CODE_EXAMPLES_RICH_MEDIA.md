# Rich Media Implementation - Exact Code Examples

## 📝 Phase 1: Activity Controller Changes

### File: `src/bots/teams-itsupport/controllers/activityController.js`

**ADD: New helper methods**

```javascript
// ============ NEW METHODS (add after line 171) ============

/**
 * Detect message type based on content
 * @private
 */
_detectMessageType(text, attachments) {
  if (attachments && attachments.length > 0) {
    const attachment = attachments[0];
    const contentType = attachment.contentType || '';

    if (contentType.startsWith('image/')) return 'image';
    if (contentType.startsWith('video/')) return 'video';
    if (contentType.startsWith('audio/')) return 'audio';
    if (contentType.includes('document') ||
        contentType.includes('pdf') ||
        contentType.includes('word') ||
        contentType.includes('sheet')) {
      return 'document';
    }
    return 'file';
  }
  return 'text';
}

/**
 * Build message object similar to LINE format
 * @private
 */
_buildMessageObject(text, attachments, messageType) {
  const message = {
    type: messageType,
    text: text || '',
    attachments: attachments || []
  };

  // Add type-specific data
  if (messageType !== 'text' && attachments.length > 0) {
    const attachment = attachments[0];
    message.contentUrl = attachment.contentUrl;
    message.name = attachment.name;
    message.contentType = attachment.contentType;
  }

  return message;
}
```

**MODIFY: handleMessage method (Lines 72-127)**

```javascript
async handleMessage(activity) {
  try {
    const userId = activity.from.id;
    const text = activity.text?.trim() || '';
    const actionData = activity.value; // Adaptive Card action data

    // ✅ NEW: Extract attachments
    const attachments = activity.attachments || [];

    logger.info(`📨 Message from ${userId}: ${text.substring(0, 50)}`);
    logger.debug(`📦 Context available: ${!!this.context}, Service URL: ${this.context?.activity?.serviceUrl}`);
    logger.debug(`Attachments: ${attachments.length}`);

    // Get or create session
    let session = this.sessionService.getSession(userId);
    if (!session) {
      session = this.sessionService.createSession(userId);
      logger.info(`Created new session for ${userId}`);
    }

    // Update conversation reference for proactive messages
    this.sessionService.updateConversationReference(userId, activity);

    const { dialogState, attributes } = session;

    // ✅ NEW: Check if in LIVE_CHAT_ACTIVE to handle all types
    if (dialogState === 'LIVE_CHAT_ACTIVE' && attachments.length > 0) {
      logger.info(`🟢 LIVE_CHAT_ACTIVE with ${attachments.length} attachment(s)`);

      // Build complete message object with attachments
      const messageType = this._detectMessageType(text, attachments);
      const message = this._buildMessageObject(text, attachments, messageType);

      logger.debug(`Message type detected: ${messageType}`);

      // Process through dialog state machine
      const result = await this.dialogManager.processMessage(
        userId,
        dialogState,
        message,  // ✅ Pass complete object with attachments
        actionData,
        attributes
      );

      // Send response cards
      if (result.cards && result.cards.length > 0) {
        for (const card of result.cards) {
          await this.teamsService.sendAdaptiveCard(activity, card, this.context);
        }
        logger.debug(`Sent ${result.cards.length} cards to ${userId}`);
      }

      // Update session state
      if (result.newDialogState) {
        this.sessionService.updateDialogState(userId, result.newDialogState);
      }

      if (result.attributes) {
        this.sessionService.updateAttributes(userId, result.attributes);
      }

    } else {
      // Original handling: text-only or Adaptive Card actions
      // Process through dialog state machine
      const result = await this.dialogManager.processMessage(
        userId,
        dialogState,
        text,
        actionData,
        attributes
      );

      // Send response cards
      if (result.cards && result.cards.length > 0) {
        for (const card of result.cards) {
          await this.teamsService.sendAdaptiveCard(activity, card, this.context);
        }
        logger.debug(`Sent ${result.cards.length} cards to ${userId}`);
      }

      // Update session state
      if (result.newDialogState) {
        this.sessionService.updateDialogState(userId, result.newDialogState);
        logger.debug(`Updated dialog state to ${result.newDialogState} for ${userId}`);
      }

      if (result.attributes) {
        this.sessionService.updateAttributes(userId, result.attributes);
      }
    }
  } catch (error) {
    logger.error('Error in handleMessage', error);
    // Send error response to user
    await this.teamsService.sendAdaptiveCard(activity,
      this.templateService.getErrorCard('Error', 'An error occurred. Please try again.'),
      this.context
    );
  }
}
```

---

## 📝 Phase 2: Dialog Manager Changes

### File: `src/bots/teams-itsupport/services/dialogManager.js`

**MODIFY: _handleLiveChat method (Lines 468-506)**

```javascript
async _handleLiveChat(userId, input, actionData, attributes) {
  try {
    // ✅ NEW: Handle both text (backward compat) and message objects
    let message = input;

    // Backward compatibility: convert string to message object
    if (typeof input === 'string') {
      message = { type: 'text', text: input };
    }

    // Validate message object
    if (!message || typeof message !== 'object') {
      logger.warn(`Invalid message format for live chat: ${typeof input}`);
      return {
        cards: [this.templateService.getErrorCard('Invalid', 'Invalid message format')]
      };
    }

    logger.info(`Live chat ${message.type} message from user ${userId}`);

    // ✅ NEW: Extract text for keyword checking
    const textContent = message.type === 'text' ? message.text : '';

    // Check for exit keywords (TEXT MESSAGES ONLY)
    if (message.type === 'text' && textContent) {
      const lowerText = textContent.toLowerCase().trim();
      const exitKeywords = /\b(exit|quit|end|bye|goodbye|done|disconnect|close|back to menu)\b/i;

      if (exitKeywords.test(lowerText)) {
        const endResult = await this.liveChatService.endLiveChat(userId);
        logger.info(`Live chat ended for user ${userId} (user initiated)`);

        return {
          cards: [this.templateService.getLiveChatEndedCard()],
          newDialogState: 'MAIN_MENU'
        };
      }
    }

    // ✅ NEW: Forward entire message object to agent
    try {
      logger.info(`Forwarding ${message.type} message to agent for user ${userId}`);
      const chatResult = await this.liveChatService.sendMessage(userId, message);

      if (chatResult.success) {
        logger.info(`${message.type} message sent to agent successfully`);
        // No card response - agent will respond directly via middleware
        return {
          cards: [],
          newDialogState: 'LIVE_CHAT_ACTIVE'
        };
      } else {
        logger.warn(`Failed to send ${message.type} message: ${chatResult.error}`);
        return {
          cards: [
            this.templateService.getErrorCard(
              'Failed',
              'Could not send your message. Please try again.'
            )
          ],
          newDialogState: 'LIVE_CHAT_ACTIVE'
        };
      }
    } catch (error) {
      logger.error(`Exception forwarding ${message.type} to agent:`, error);
      return {
        cards: [
          this.templateService.getErrorCard(
            'Error',
            'An error occurred while sending your message.'
          )
        ],
        newDialogState: 'LIVE_CHAT_ACTIVE'
      };
    }
  } catch (error) {
    logger.error(`Error in _handleLiveChat for user ${userId}`, error);
    return {
      cards: [this.templateService.getErrorCard('Error', 'An unexpected error occurred.')],
      newDialogState: 'MAIN_MENU'
    };
  }
}
```

---

## 📝 Phase 3: Live Chat Service Changes

### File: `src/bots/teams-itsupport/services/liveChatService.js`

**ADD: New helper method (after line 18)**

```javascript
/**
 * Get Teams user display name with truncation
 * Avaya API rejects displayName > 70 characters
 * @private
 */
async _getDisplayName(userId) {
  try {
    // Get display name from Teams user ID
    // Teams format: '29:1YQp_...' - extract meaningful part
    let displayName = 'Teams User';

    // Try to extract from user profile if available
    if (userId && userId.length > 0) {
      displayName = `Teams User ${userId.substring(0, 8)}`;
    }

    // Truncate to max 70 characters (Avaya API requirement)
    if (displayName.length > 70) {
      displayName = displayName.substring(0, 67) + '...';
    }

    logger.debug(`Display name prepared: "${displayName}" (${displayName.length} chars)`);
    return displayName;
  } catch (error) {
    logger.warn(`Error getting display name: ${error.message}. Using fallback.`);
    return 'Teams User';
  }
}
```

**MODIFY: sendMessage method (Lines 56-79)**

```javascript
/**
 * Send message during active live chat
 * Supports all message types: text, image, video, audio, document, file
 */
async sendMessage(userId, message) {
  try {
    // ✅ NEW: Handle backward compatibility - convert string to message object
    if (typeof message === 'string') {
      message = { type: 'text', text: message };
    }

    // Validate message object
    if (!message || typeof message !== 'object') {
      logger.error(`Invalid message object for user ${userId}`, message);
      return {
        success: false,
        error: 'Invalid message format'
      };
    }

    const messageType = message.type || 'text';
    logger.info(`Sending ${messageType} live chat message for user ${userId}`);

    const endpoint = `${this.baseUrl}api/teams-itsupport-direct/live-chat/message/${this.tenantId}`;

    // ✅ NEW: Get display name with proper truncation
    const displayName = await this._getDisplayName(userId);

    // ✅ NEW: Build payload with complete message object
    const payload = {
      userId,
      displayName,  // Truncated to max 70 chars
      channel: 'teams',
      message: message  // ENTIRE object - can include attachments
    };

    logger.debug(`Endpoint: ${endpoint}`);
    logger.debug(`Sending ${messageType} message:`, {
      userId,
      displayName,
      messageType,
      hasAttachments: message.attachments?.length > 0,
      hasContentUrl: !!message.contentUrl
    });

    const response = await this.client.post(endpoint, payload);

    logger.info(` ${messageType} message sent successfully for user ${userId}`);
    return { success: true, data: response.data };
  } catch (error) {
    logger.error(`Failed to send ${message?.type || 'unknown'} message for user ${userId}`, {
      message: error.message,
      status: error.response?.status,
      data: error.response?.data
    });
    return {
      success: false,
      error: error.message || 'Failed to send message'
    };
  }
}
```

---

## 📝 Phase 4: Middleware Controller Changes

### File: `src/middleware/controllers/teams-itsupport.controller.ts` (or similar)

**ADD: Message type handling (in existing message handler)**

```typescript
/**
 * Handle incoming live chat message from Teams user
 * Supports all message types: text, image, video, audio, document, file
 */
async handleLiveChatMessage(@Body() payload: any) {
  const { message, userId, displayName, channel } = payload;

  if (!message) {
    logger.error(`No message in payload for user ${userId}`);
    return { success: false, error: 'No message provided' };
  }

  const messageType = message.type || 'text';
  logger.info(`Received ${messageType} message from Teams user ${userId}`);

  try {
    // ✅ NEW: Handle based on message type
    switch (messageType) {
      case 'text':
        // Direct text forwarding to Avaya
        await this.sendTextToAvaya(
          message.text,
          userId,
          displayName,
          channel
        );
        break;

      case 'image':
      case 'video':
      case 'audio':
      case 'document':
      case 'file':
        // Download from Teams and forward to Avaya
        await this.sendAttachmentToAvaya(
          message,
          userId,
          displayName,
          channel,
          messageType
        );
        break;

      default:
        logger.warn(`Unknown message type: ${messageType}`);
        // Treat as text if no contentUrl
        if (message.text) {
          await this.sendTextToAvaya(message.text, userId, displayName, channel);
        }
    }

    return { success: true };
  } catch (error) {
    logger.error(`Error handling live chat message for user ${userId}`, error);
    return { success: false, error: error.message };
  }
}

/**
 * Send attachment from Teams to Avaya
 * Downloads from Teams URL and uploads to Avaya
 */
private async sendAttachmentToAvaya(
  message: any,
  userId: string,
  displayName: string,
  channel: string,
  messageType: string
) {
  try {
    logger.info(`Processing ${messageType} attachment from Teams user ${userId}`);

    // Step 1: Download file from Teams
    logger.debug(`Downloading ${messageType} from Teams...`);
    const fileBuffer = await this.downloadFromTeams(
      message.contentUrl,
      message.contentType
    );
    logger.debug(`Downloaded ${fileBuffer.length} bytes`);

    // Step 2: Prepare attachment metadata
    const attachmentData = {
      fileName: message.name || `attachment.${this.getExtension(message.contentType)}`,
      contentType: message.contentType,
      fileBuffer: fileBuffer,
      fileSize: fileBuffer.length,
      messageText: message.text || `Shared ${messageType}`
    };

    // Step 3: Send to Avaya with attachment
    logger.info(`Forwarding ${messageType} to Avaya for user ${userId}`);
    await this.sendToAvayaWithAttachment(
      userId,
      displayName,
      channel,
      attachmentData
    );

    logger.info(`${messageType} sent to Avaya successfully`);
  } catch (error) {
    logger.error(`Failed to process ${messageType} for user ${userId}`, error);
    throw error;
  }
}

/**
 * Download file from Teams URL using Bearer token
 * Teams content URLs expire after ~24 hours
 */
private async downloadFromTeams(
  contentUrl: string,
  contentType: string
): Promise<Buffer> {
  try {
    if (!contentUrl) {
      throw new Error('No content URL provided');
    }

    logger.debug(`Downloading from Teams: ${contentUrl.substring(0, 50)}...`);

    // Get Teams bearer token
    const token = this.getTeamsToken();

    // Download with timeout
    const response = await axios.get(contentUrl, {
      headers: {
        'Authorization': `Bearer ${token}`,
        'User-Agent': 'FABLineChatbot/1.0'
      },
      responseType: 'arraybuffer',
      timeout: 30000  // 30 second timeout
    });

    if (response.data) {
      logger.debug(`Downloaded ${response.data.length} bytes from Teams`);
      return Buffer.from(response.data);
    }

    throw new Error('No data received from Teams');
  } catch (error) {
    logger.error(`Failed to download from Teams: ${error.message}`);
    throw error;
  }
}

/**
 * Send attachment to Avaya for agent viewing
 * Uses Avaya API to create message with attachment
 */
private async sendToAvayaWithAttachment(
  userId: string,
  displayName: string,
  channel: string,
  attachmentData: any
): Promise<void> {
  try {
    const avayaEndpoint = `${process.env.AVAYA_API_URL}/messages/with-attachment`;

    // Prepare multipart form data
    const FormData = require('form-data');
    const form = new FormData();

    form.append('userId', userId);
    form.append('displayName', displayName);
    form.append('channel', channel);
    form.append('messageText', attachmentData.messageText);
    form.append('fileName', attachmentData.fileName);
    form.append('contentType', attachmentData.contentType);

    // Append file buffer
    form.append('file', attachmentData.fileBuffer, {
      filename: attachmentData.fileName,
      contentType: attachmentData.contentType
    });

    logger.debug(`Sending to Avaya: ${avayaEndpoint}`);

    const response = await axios.post(avayaEndpoint, form, {
      headers: form.getHeaders(),
      timeout: 30000
    });

    logger.info(`Attachment received by Avaya agent`);
  } catch (error) {
    logger.error(`Failed to send attachment to Avaya: ${error.message}`);
    throw error;
  }
}

/**
 * Send text message to Avaya
 */
private async sendTextToAvaya(
  text: string,
  userId: string,
  displayName: string,
  channel: string
): Promise<void> {
  try {
    const avayaEndpoint = `${process.env.AVAYA_API_URL}/messages/send`;

    const payload = {
      userId,
      displayName,
      channel,
      messageText: text,
      messageType: 'text',
      timestamp: new Date().toISOString()
    };

    await axios.post(avayaEndpoint, payload);
    logger.debug(`Text message sent to Avaya for user ${userId}`);
  } catch (error) {
    logger.error(`Failed to send text to Avaya: ${error.message}`);
    throw error;
  }
}

/**
 * Get file extension from MIME type
 */
private getExtension(contentType: string): string {
  const extensions: { [key: string]: string } = {
    'image/png': 'png',
    'image/jpeg': 'jpg',
    'image/gif': 'gif',
    'video/mp4': 'mp4',
    'video/quicktime': 'mov',
    'audio/mpeg': 'mp3',
    'audio/wav': 'wav',
    'application/pdf': 'pdf',
    'application/msword': 'doc',
    'application/vnd.openxmlformats-officedocument.wordprocessingml.document': 'docx',
    'application/vnd.ms-excel': 'xls',
    'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet': 'xlsx'
  };

  return extensions[contentType] || 'bin';
}
```

---

## 📝 Phase 5: Agent Response Handler

### File: `src/middleware/controllers/teams-itsupport.controller.ts` (add to existing)

**ADD: Handle agent response with attachments**

```typescript
/**
 * Handle agent response from Avaya
 * Forwards message and attachments to Teams user
 */
async handleAgentResponse(@Body() payload: any) {
  const { userId, text, attachments } = payload;

  try {
    logger.info(`Processing agent response for Teams user ${userId}`);

    // Get conversation reference for proactive messaging
    const conversationRef = this.teamsService.getConversationReference(userId);

    if (!conversationRef) {
      logger.error(`No conversation reference for user ${userId}`);
      return { success: false, error: 'User not found' };
    }

    // Build Teams-compatible attachments
    let teamsAttachments = [];

    if (attachments && attachments.length > 0) {
      for (const attachment of attachments) {
        teamsAttachments.push({
          contentType: attachment.contentType,
          contentUrl: attachment.url || attachment.contentUrl,
          name: attachment.fileName || attachment.name
        });
      }
    }

    logger.debug(`Agent response: text="${text}", attachments=${teamsAttachments.length}`);

    // Send via proactive messaging
    const result = await this.teamsService.sendProactiveMessage(
      conversationRef,
      text,
      teamsAttachments
    );

    if (result.success) {
      logger.info(`Agent response sent to Teams user ${userId}`);
      return { success: true };
    } else {
      logger.error(`Failed to send agent response: ${result.error}`);
      return { success: false, error: result.error };
    }
  } catch (error) {
    logger.error(`Error handling agent response for ${userId}`, error);
    return { success: false, error: error.message };
  }
}
```

---

## 🔍 Testing Code Examples

### Test 1: Verify Message Extraction
```javascript
// In activity controller test
test('should extract attachments from Teams activity', () => {
  const activity = {
    type: 'message',
    from: { id: '29:test' },
    text: 'Here is screenshot',
    attachments: [{
      contentType: 'image/png',
      contentUrl: 'https://teams.microsoft.com/...',
      name: 'screenshot.png'
    }]
  };

  const attachments = activity.attachments || [];
  const messageType = controller._detectMessageType(activity.text, attachments);

  expect(attachments.length).toBe(1);
  expect(messageType).toBe('image');
});
```

### Test 2: Verify Dialog Manager Accepts Message Objects
```javascript
// In dialog manager test
test('should accept message object in live chat', async () => {
  const messageObject = {
    type: 'image',
    text: 'Screenshot',
    contentUrl: 'https://...',
    name: 'screenshot.png',
    contentType: 'image/png'
  };

  const result = await dialogManager._handleLiveChat('user123', messageObject, {}, {});

  expect(result.cards.length).toBe(0);  // No immediate response
  expect(result.newDialogState).toBe('LIVE_CHAT_ACTIVE');
});
```

### Test 3: Verify Live Chat Service Sends Complete Object
```javascript
// In live chat service test
test('should send complete message object to middleware', async () => {
  const message = {
    type: 'video',
    text: 'Video clip',
    contentUrl: 'https://teams.microsoft.com/video.mp4',
    name: 'video.mp4',
    contentType: 'video/mp4'
  };

  const result = await liveChatService.sendMessage('user123', message);

  expect(result.success).toBe(true);
  // Verify axios was called with complete message object
  expect(mockAxios.post).toHaveBeenCalledWith(
    expect.any(String),
    expect.objectContaining({
      message: message  // Full object
    })
  );
});
```

---

## 🎯 Summary of Changes

| File | Changes | Lines | Type |
|------|---------|-------|------|
| `activityController.js` | Add attachment extraction, message building | +50 | Feature |
| `dialogManager.js` | Support message objects, handle all types | +30 | Feature |
| `liveChatService.js` | Forward complete objects, display name truncation | +25 | Feature |
| `teams-itsupport.controller.ts` | Handle attachments, download/upload, agent response | +150 | Feature |

**Total Lines Added:** ~255 lines across 4 files
**Total Lines Modified:** ~15 lines (backward compatible changes)
**Breaking Changes:** None ✅

