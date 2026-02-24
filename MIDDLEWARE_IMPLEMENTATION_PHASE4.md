# Phase 4: Middleware Controller - Handle Rich Media Attachments

## 📋 Overview

This guide provides the middleware implementation for handling rich media (images, videos, documents, audio) from Teams users to Avaya agents.

**Location:** Middleware repository (password-reset.lab.bravishma.com:6509)
**Files to Create/Modify:**
- `src/controllers/teams-itsupport.controller.ts` (or similar)
- Add/enhance the live chat message handler
- Add attachment download/upload handlers

---

## 🔄 Data Flow

```
Teams User sends IMAGE
  ↓
FABLineChatbot forwards complete message object to middleware
  POST /api/teams-itsupport-direct/live-chat/message/{tenantId}
  Payload:
  {
    userId: "29:1YQp...",
    displayName: "John Doe",
    channel: "teams",
    message: {
      type: "image",
      contentUrl: "https://teams.microsoft.com/...",
      name: "screenshot.png",
      contentType: "image/png",
      text: "Here's the issue"
    }
  }
  ↓
Middleware detects type: 'image'
  ↓
Download from Teams (using Bearer token)
  ↓
Upload to Avaya (using multipart/form-data)
  ↓
Agent sees IMAGE in Avaya dashboard
```

---

## 💻 Implementation Code

### Step 1: Add Helper Methods to Handle Attachments

```typescript
/**
 * Detect message type based on content
 */
private detectMessageType(message: any): string {
  if (message.type) return message.type;

  if (message.attachments && message.attachments.length > 0) {
    const att = message.attachments[0];
    const contentType = att.contentType || '';

    if (contentType.startsWith('image/')) return 'image';
    if (contentType.startsWith('video/')) return 'video';
    if (contentType.startsWith('audio/')) return 'audio';
    if (contentType.includes('pdf') || contentType.includes('document')) {
      return 'document';
    }
    return 'file';
  }

  return 'text';
}

/**
 * Get file extension from MIME type
 */
private getExtension(contentType: string): string {
  const extensions: { [key: string]: string } = {
    'image/png': 'png',
    'image/jpeg': 'jpg',
    'image/gif': 'gif',
    'image/webp': 'webp',
    'video/mp4': 'mp4',
    'video/quicktime': 'mov',
    'video/webm': 'webm',
    'audio/mpeg': 'mp3',
    'audio/wav': 'wav',
    'audio/ogg': 'ogg',
    'application/pdf': 'pdf',
    'application/msword': 'doc',
    'application/vnd.openxmlformats-officedocument.wordprocessingml.document': 'docx',
    'application/vnd.ms-excel': 'xls',
    'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet': 'xlsx',
    'text/plain': 'txt',
    'text/csv': 'csv'
  };

  return extensions[contentType] || 'bin';
}
```

### Step 2: Download from Teams

```typescript
/**
 * Download file from Teams URL using Bearer token
 * Teams content URLs expire after ~24 hours
 */
private async downloadFromTeams(contentUrl: string, contentType: string): Promise<Buffer> {
  try {
    if (!contentUrl) {
      throw new Error('No content URL provided');
    }

    this.logger.debug(`Downloading from Teams: ${contentUrl.substring(0, 50)}...`);

    // Get Teams bearer token from middleware auth
    const token = this.getTeamsAuthToken();

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
      this.logger.debug(`Downloaded ${response.data.length} bytes from Teams`);
      return Buffer.from(response.data);
    }

    throw new Error('No data received from Teams');
  } catch (error) {
    this.logger.error(`Failed to download from Teams: ${error.message}`);
    throw error;
  }
}

/**
 * Get Teams auth token (from middleware auth service)
 */
private getTeamsAuthToken(): string {
  // Implementation depends on your middleware auth setup
  // Options:
  // 1. Stored token from Teams Bot Framework adapter
  // 2. Service-to-service token
  // 3. Cached token with refresh

  const token = process.env.TEAMS_SERVICE_TOKEN;
  if (!token) {
    throw new Error('Teams service token not configured');
  }
  return token;
}
```

### Step 3: Upload to Avaya

```typescript
/**
 * Send attachment to Avaya for agent viewing
 * Uses Avaya API to create message with attachment
 */
private async sendToAvayaWithAttachment(
  userId: string,
  displayName: string,
  channel: string,
  attachmentData: {
    fileName: string;
    contentType: string;
    fileBuffer: Buffer;
    messageText: string;
  }
): Promise<void> {
  try {
    const avayaEndpoint = `${process.env.AVAYA_API_URL}/messages/with-attachment`;

    // Prepare multipart form data
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

    this.logger.debug(`Sending to Avaya: ${avayaEndpoint}`);

    const response = await axios.post(avayaEndpoint, form, {
      headers: form.getHeaders(),
      timeout: 30000,
      maxContentLength: 100 * 1024 * 1024  // 100MB limit
    });

    this.logger.info(`Attachment received by Avaya agent`);
  } catch (error) {
    this.logger.error(`Failed to send attachment to Avaya: ${error.message}`);
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

    await axios.post(avayaEndpoint, payload, {
      timeout: 15000
    });

    this.logger.debug(`Text message sent to Avaya for user ${userId}`);
  } catch (error) {
    this.logger.error(`Failed to send text to Avaya: ${error.message}`);
    throw error;
  }
}
```

### Step 4: Main Message Handler

```typescript
/**
 * Handle incoming live chat message from Teams user
 * Supports all message types: text, image, video, audio, document, file
 */
@Post('/live-chat/message/:tenantId')
async handleLiveChatMessage(
  @Body() payload: any,
  @Param('tenantId') tenantId: string,
  @Res() res: any
) {
  const { message, userId, displayName, channel } = payload;

  if (!message) {
    this.logger.error(`No message in payload for user ${userId}`);
    return res.status(400).json({ success: false, error: 'No message provided' });
  }

  const messageType = this.detectMessageType(message);
  this.logger.info(`Received ${messageType} message from Teams user ${userId}`);

  try {
    // Handle based on message type
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
        this.logger.warn(`Unknown message type: ${messageType}`);
        // Treat as text if no contentUrl
        if (message.text) {
          await this.sendTextToAvaya(message.text, userId, displayName, channel);
        }
    }

    return res.status(200).json({ success: true });
  } catch (error) {
    this.logger.error(`Error handling live chat message for user ${userId}`, error);
    return res.status(500).json({ success: false, error: error.message });
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
    this.logger.info(`Processing ${messageType} attachment from Teams user ${userId}`);

    // Validate required fields
    if (!message.contentUrl) {
      throw new Error(`Missing contentUrl for ${messageType} attachment`);
    }

    // Step 1: Download file from Teams
    this.logger.debug(`Downloading ${messageType} from Teams...`);
    const fileBuffer = await this.downloadFromTeams(
      message.contentUrl,
      message.contentType
    );
    this.logger.debug(`Downloaded ${fileBuffer.length} bytes`);

    // Validate file size (example: 50MB limit)
    const MAX_FILE_SIZE = 50 * 1024 * 1024;  // 50MB
    if (fileBuffer.length > MAX_FILE_SIZE) {
      throw new Error(
        `File too large: ${fileBuffer.length} bytes (max: ${MAX_FILE_SIZE} bytes)`
      );
    }

    // Step 2: Prepare attachment metadata
    const attachmentData = {
      fileName: message.name || `attachment.${this.getExtension(message.contentType)}`,
      contentType: message.contentType,
      fileBuffer: fileBuffer,
      messageText: message.text || `Shared ${messageType}`
    };

    // Step 3: Send to Avaya with attachment
    this.logger.info(`Forwarding ${messageType} to Avaya for user ${userId}`);
    await this.sendToAvayaWithAttachment(
      userId,
      displayName,
      channel,
      attachmentData
    );

    this.logger.info(`${messageType} sent to Avaya successfully`);
  } catch (error) {
    this.logger.error(`Failed to process ${messageType} for user ${userId}`, error);
    throw error;
  }
}
```

---

## ⚙️ Environment Variables Required

Add to middleware `.env`:

```bash
# Teams Service Token (for downloading files from Teams)
TEAMS_SERVICE_TOKEN=your_teams_service_token_here

# Avaya API Endpoint
AVAYA_API_URL=https://your-avaya-api-endpoint.com

# File upload limits
MAX_FILE_SIZE=52428800  # 50MB in bytes
MAX_FILE_TIMEOUT=30000  # 30 seconds

# Teams content expiry (informational)
TEAMS_CONTENT_URL_EXPIRY_HOURS=24
```

---

## 📦 Required npm Packages

Ensure these are installed in middleware:

```json
{
  "axios": "^1.4.0",
  "form-data": "^4.0.0"
}
```

---

## 🧪 Testing the Middleware

### Test 1: Send Text Message
```bash
curl -X POST http://localhost:3001/api/teams-itsupport-direct/live-chat/message/showmeavaya \
  -H "Content-Type: application/json" \
  -d '{
    "userId": "29:test123",
    "displayName": "John Doe",
    "channel": "teams",
    "message": {
      "type": "text",
      "text": "Hello agent!"
    }
  }'
```

Expected: ✅ Message appears in Avaya dashboard

### Test 2: Send Image
```bash
curl -X POST http://localhost:3001/api/teams-itsupport-direct/live-chat/message/showmeavaya \
  -H "Content-Type: application/json" \
  -d '{
    "userId": "29:test123",
    "displayName": "John Doe",
    "channel": "teams",
    "message": {
      "type": "image",
      "text": "Here is my screenshot",
      "contentUrl": "https://teams.microsoft.com/content/...",
      "name": "screenshot.png",
      "contentType": "image/png"
    }
  }'
```

Expected: ✅ Image downloaded from Teams and forwarded to Avaya

### Test 3: Send Document
```bash
curl -X POST http://localhost:3001/api/teams-itsupport-direct/live-chat/message/showmeavaya \
  -H "Content-Type: application/json" \
  -d '{
    "userId": "29:test123",
    "displayName": "John Doe",
    "channel": "teams",
    "message": {
      "type": "document",
      "text": "Here is the error log",
      "contentUrl": "https://teams.microsoft.com/content/...",
      "name": "error.pdf",
      "contentType": "application/pdf"
    }
  }'
```

Expected: ✅ PDF downloaded and sent to Avaya

---

## 🔒 Security Considerations

1. **File Type Validation**
   ```typescript
   private validateFileType(contentType: string): boolean {
     const ALLOWED_TYPES = [
       'image/png', 'image/jpeg', 'image/gif', 'image/webp',
       'video/mp4', 'video/webm',
       'audio/mpeg', 'audio/wav',
       'application/pdf',
       'application/msword',
       'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
       'application/vnd.ms-excel',
       'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet'
     ];
     return ALLOWED_TYPES.includes(contentType);
   }
   ```

2. **File Size Validation** - Implement in `sendAttachmentToAvaya()`
   ```typescript
   const MAX_FILE_SIZE = 50 * 1024 * 1024;  // 50MB
   if (fileBuffer.length > MAX_FILE_SIZE) {
     throw new Error('File exceeds maximum allowed size');
   }
   ```

3. **Teams URL Expiry** - Download immediately, don't cache URLs
   - Teams URLs expire in ~24 hours
   - Always download and process immediately
   - Don't store URLs for later use

4. **Authentication** - Verify Teams user token
   ```typescript
   private validateTeamsToken(authorization: string): boolean {
     // Verify JWT token from Teams
     // Ensure user identity matches
     return true;  // Implement verification
   }
   ```

5. **Audit Logging** - Log all file transfers
   ```typescript
   this.logger.info('File transfer audit', {
     userId,
     fileName: attachmentData.fileName,
     fileSize: attachmentData.fileBuffer.length,
     contentType: attachmentData.contentType,
     timestamp: new Date().toISOString(),
     source: 'teams',
     destination: 'avaya'
   });
   ```

---

## 📝 Error Handling

```typescript
try {
  // Attempt to download/upload
} catch (error) {
  // Handle specific errors
  if (error.code === 'ECONNREFUSED') {
    this.logger.error('Cannot connect to Avaya API');
  } else if (error.response?.status === 401) {
    this.logger.error('Teams authentication failed - token expired?');
  } else if (error.response?.status === 413) {
    this.logger.error('File too large for Avaya API');
  } else if (error.code === 'ETIMEDOUT') {
    this.logger.error('Download from Teams timed out');
  } else {
    this.logger.error(`Unknown error: ${error.message}`);
  }

  // Return appropriate error to user
  throw new Error('Could not send attachment. Please try again.');
}
```

---

## ✅ Implementation Checklist for Middleware Team

- [ ] Add `_getExtension()` method
- [ ] Add `_detectMessageType()` method
- [ ] Add `downloadFromTeams()` method with timeout
- [ ] Add `sendTextToAvaya()` method
- [ ] Add `sendToAvayaWithAttachment()` method
- [ ] Modify `handleLiveChatMessage()` to detect types
- [ ] Add type-based routing logic
- [ ] Add file size validation
- [ ] Add file type whitelist validation
- [ ] Add error handling for all scenarios
- [ ] Add comprehensive logging
- [ ] Test with images
- [ ] Test with videos
- [ ] Test with documents
- [ ] Test with audio files
- [ ] Test error scenarios (timeout, large file, invalid type)
- [ ] Test backward compatibility (text-only messages)
- [ ] Load testing with multiple concurrent uploads
- [ ] Performance testing (ensure < 5 sec for 10MB file)

