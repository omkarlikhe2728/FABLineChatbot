# Phase 5: Middleware Agent Response Handler - Display Media in Teams

## 📋 Overview

This guide provides the middleware implementation for handling agent responses from Avaya and forwarding them back to Teams users with attachments.

**Location:** Middleware repository (password-reset.lab.bravishma.com:6509)
**Endpoint:** `POST /api/teams-itsupport-direct/agent-response`
**Called by:** Avaya webhook when agent sends message

---

## 🔄 Data Flow

```
Avaya Agent sends RESPONSE with IMAGE
  ↓
Avaya webhook triggers middleware
  POST /api/teams-itsupport-direct/agent-response
  Payload:
  {
    userId: "29:1YQp...",
    text: "Here is the solution screenshot",
    attachments: [{
      fileName: "solution.png",
      contentType: "image/png",
      url: "https://avaya-storage/...",
      fileSize: 245000
    }]
  }
  ↓
Middleware receives response
  ↓
Build Teams-compatible attachment format
  ↓
Call FABLineChatbot.teamsService.handleAgentResponse()
  OR send proactive message directly
  ↓
Teams user sees IMAGE in chat ✅
```

---

## 💻 Implementation Code

### Step 1: Agent Response Endpoint in Middleware

```typescript
import { Controller, Post, Body, Logger, Res, Param } from '@nestjs/common';
import axios from 'axios';

@Controller('api/teams-itsupport-direct')
export class TeamsITSupportController {
  private logger = new Logger(TeamsITSupportController.name);

  /**
   * Handle agent response from Avaya
   * Receives message + attachments and forwards to Teams user
   */
  @Post('/agent-response')
  async handleAgentResponse(
    @Body() payload: {
      userId: string;
      text: string;
      attachments?: Array<{
        fileName: string;
        contentType: string;
        url: string;
        fileSize?: number;
      }>;
      conversationId?: string;
    },
    @Res() res: any
  ) {
    const { userId, text, attachments = [] } = payload;

    if (!userId || !text) {
      this.logger.error('Missing required fields: userId or text');
      return res.status(400).json({
        success: false,
        error: 'Missing userId or text'
      });
    }

    this.logger.info(`Processing agent response for Teams user ${userId}`);
    this.logger.debug(`Text: "${text.substring(0, 50)}...", Attachments: ${attachments.length}`);

    try {
      // Validate attachments
      if (attachments && attachments.length > 0) {
        for (const att of attachments) {
          if (!att.url || !att.contentType) {
            this.logger.warn(`Invalid attachment: missing url or contentType`);
          }
        }
      }

      // Forward to FABLineChatbot Teams service
      const result = await this.forwardToTeamsBot(userId, text, attachments);

      if (result.success) {
        this.logger.info(`Agent response forwarded to Teams user ${userId}`);
        return res.status(200).json({ success: true });
      } else {
        this.logger.error(`Failed to forward to Teams bot: ${result.error}`);
        return res.status(500).json({ success: false, error: result.error });
      }
    } catch (error) {
      this.logger.error(`Error handling agent response for user ${userId}`, error);
      return res.status(500).json({
        success: false,
        error: error.message
      });
    }
  }

  /**
   * Forward agent response to FABLineChatbot
   * Calls Teams service to send proactive message
   */
  private async forwardToTeamsBot(
    userId: string,
    text: string,
    attachments: Array<any>
  ): Promise<{ success: boolean; error?: string }> {
    try {
      const fabBotUrl = process.env.FABLINECHATBOT_URL;
      if (!fabBotUrl) {
        throw new Error('FABLINECHATBOT_URL not configured');
      }

      // Build payload for FABLineChatbot
      const payload = {
        userId,
        text,
        attachments: attachments.map(att => ({
          contentType: att.contentType,
          contentUrl: att.url,
          name: att.fileName,
          fileSize: att.fileSize
        }))
      };

      this.logger.debug(`Forwarding to FABLineChatbot at: ${fabBotUrl}`);

      // Call FABLineChatbot endpoint
      const response = await axios.post(
        `${fabBotUrl}/api/teams-itsupport/agent-response`,
        payload,
        {
          timeout: 15000,
          headers: {
            'Content-Type': 'application/json',
            'Authorization': `Bearer ${process.env.FABLINECHATBOT_API_KEY}`
          }
        }
      );

      if (response.data?.success) {
        this.logger.info(`Message sent to Teams user via FABLineChatbot`);
        return { success: true };
      } else {
        return {
          success: false,
          error: response.data?.error || 'Unknown error from FABLineChatbot'
        };
      }
    } catch (error) {
      this.logger.error(`Failed to forward to FABLineChatbot: ${error.message}`);
      return { success: false, error: error.message };
    }
  }
}
```

### Step 2: Alternative Direct Implementation (if FABLineChatbot not reachable)

If you can't reach FABLineChatbot, implement directly in middleware:

```typescript
/**
 * Alternative: Send directly to Teams API
 * Use this if middleware has direct Teams API access
 */
private async sendDirectlyToTeams(
  userId: string,
  text: string,
  attachments: Array<any>,
  conversationRef: any
): Promise<{ success: boolean; error?: string }> {
  try {
    // Get Teams bearer token
    const token = this.getTeamsToken();

    // Prepare Teams API endpoint
    const serviceUrl = conversationRef.serviceUrl;
    const conversationId = conversationRef.conversationId;

    if (!serviceUrl || !conversationId) {
      throw new Error('Missing serviceUrl or conversationId');
    }

    const endpoint = `${serviceUrl}v3/conversations/${conversationId}/activities`;

    // Build message payload
    const payload = {
      type: 'message',
      text: text,
      from: {
        id: process.env.TEAMS_BOT_ID,
        name: 'IT Support Agent'
      },
      attachments: attachments.map(att => ({
        contentType: att.contentType,
        contentUrl: att.url,
        name: att.fileName
      }))
    };

    // Send to Teams API
    const response = await axios.post(endpoint, payload, {
      headers: {
        'Authorization': `Bearer ${token}`,
        'Content-Type': 'application/json'
      },
      timeout: 10000
    });

    this.logger.info(`Message sent to Teams user ${userId}`);
    return { success: true };
  } catch (error) {
    this.logger.error(`Failed to send to Teams API: ${error.message}`);
    return { success: false, error: error.message };
  }
}

private getTeamsToken(): string {
  // Get from your auth service or cache
  const token = process.env.TEAMS_SERVICE_TOKEN;
  if (!token) {
    throw new Error('Teams service token not available');
  }
  return token;
}
```

---

## 🔌 FABLineChatbot Endpoint

Add this endpoint to FABLineChatbot for receiving agent responses:

**File:** `src/bots/teams-itsupport/app.js` or routes

```javascript
// Add this route to handle agent responses
app.post('/api/teams-itsupport/agent-response', async (req, res) => {
  try {
    const { userId, text, attachments = [] } = req.body;

    if (!userId || !text) {
      return res.status(400).json({ success: false, error: 'Missing userId or text' });
    }

    // Call teamsService to send proactive message
    const result = await teamsService.handleAgentResponse(userId, text, attachments);

    if (result.success) {
      return res.status(200).json({ success: true });
    } else {
      return res.status(500).json({ success: false, error: result.error });
    }
  } catch (error) {
    console.error('Error in agent response handler:', error);
    return res.status(500).json({ success: false, error: error.message });
  }
});
```

---

## 📝 Payload Examples

### Example 1: Agent Sends Text Only

```json
{
  "userId": "29:1YQp_...",
  "text": "The issue is typically resolved by clearing your browser cache. Try this and let me know.",
  "attachments": []
}
```

Result: ✅ Text message in Teams chat

### Example 2: Agent Sends Image

```json
{
  "userId": "29:1YQp_...",
  "text": "Here's a screenshot showing where to find the setting:",
  "attachments": [
    {
      "fileName": "screenshot.png",
      "contentType": "image/png",
      "url": "https://avaya-storage.example.com/files/screenshot_12345.png",
      "fileSize": 245000
    }
  ]
}
```

Result: ✅ Text + Image in Teams chat, user can view/download

### Example 3: Agent Sends Multiple Attachments

```json
{
  "userId": "29:1YQp_...",
  "text": "Here are the troubleshooting guides and a video tutorial:",
  "attachments": [
    {
      "fileName": "Troubleshooting Guide.pdf",
      "contentType": "application/pdf",
      "url": "https://avaya-storage.example.com/files/guide_12345.pdf",
      "fileSize": 1024000
    },
    {
      "fileName": "tutorial.mp4",
      "contentType": "video/mp4",
      "url": "https://avaya-storage.example.com/files/tutorial_12345.mp4",
      "fileSize": 5242880
    }
  ]
}
```

Result: ✅ Text + PDF + Video in Teams chat

---

## 🧪 Testing the Agent Response Handler

### Test 1: Send Text Response

```bash
curl -X POST http://localhost:3001/api/teams-itsupport-direct/agent-response \
  -H "Content-Type: application/json" \
  -d '{
    "userId": "29:test123",
    "text": "The solution is to restart your application.",
    "attachments": []
  }'
```

Expected: ✅ Text appears in Teams user chat

### Test 2: Send Image Response

```bash
curl -X POST http://localhost:3001/api/teams-itsupport-direct/agent-response \
  -H "Content-Type: application/json" \
  -d '{
    "userId": "29:test123",
    "text": "Here is the screenshot:",
    "attachments": [
      {
        "fileName": "solution.png",
        "contentType": "image/png",
        "url": "https://example.com/solution.png",
        "fileSize": 150000
      }
    ]
  }'
```

Expected: ✅ Image displays in Teams chat

### Test 3: Send Document

```bash
curl -X POST http://localhost:3001/api/teams-itsupport-direct/agent-response \
  -H "Content-Type: application/json" \
  -d '{
    "userId": "29:test123",
    "text": "Please refer to this document:",
    "attachments": [
      {
        "fileName": "FAQ.pdf",
        "contentType": "application/pdf",
        "url": "https://example.com/faq.pdf",
        "fileSize": 500000
      }
    ]
  }'
```

Expected: ✅ PDF displays and can be downloaded

---

## ⚙️ Environment Variables

Add to middleware `.env`:

```bash
# FABLineChatbot connection
FABLINECHATBOT_URL=https://teknowledge.lab.bravishma.com
FABLINECHATBOT_API_KEY=your_api_key_here

# Teams API (if using direct implementation)
TEAMS_BOT_ID=teams-itsupport-bot-id
TEAMS_SERVICE_TOKEN=your_teams_service_token

# Logging
LOG_LEVEL=debug
```

---

## 🔒 Security Checklist

- [ ] Validate userId format (should match Teams format)
- [ ] Validate attachment URLs (should be from Avaya storage)
- [ ] Validate content types (whitelist allowed MIME types)
- [ ] Check file sizes before forwarding
- [ ] Verify caller is authorized (use Bearer token)
- [ ] Log all agent response forwarding
- [ ] Rate limit agent responses (prevent spam)
- [ ] Sanitize text content (prevent XSS)
- [ ] Validate conversation reference exists
- [ ] Handle missing/expired conversation references gracefully

---

## 📊 Flow Diagram

```
┌─────────────────────────┐
│  Avaya Agent Dashboard  │
│  Composes Response      │
│  Attaches Screenshot    │
└────────────┬────────────┘
             │
    Clicks "Send to Teams"
             │
┌────────────▼────────────────────────┐
│ Avaya Webhook triggered              │
│ POST /api/teams-itsupport-direct/    │
│       agent-response                 │
│                                      │
│ Payload:                             │
│ {                                    │
│   userId: "29:1YQp...",              │
│   text: "Here's the fix",            │
│   attachments: [{                    │
│     fileName: "screenshot.png",      │
│     contentType: "image/png",        │
│     url: "https://avaya/.../img"    │
│   }]                                 │
│ }                                    │
└────────────┬────────────────────────┘
             │
    Forward to FABLineChatbot
             │
┌────────────▼──────────────────────────────┐
│ FABLineChatbot                              │
│ /api/teams-itsupport/agent-response        │
│                                            │
│ Call teamsService.handleAgentResponse()    │
│ ├─ Get conversation reference              │
│ ├─ Build Teams attachment format           │
│ └─ sendProactiveMessage(convRef, text,att) │
└────────────┬──────────────────────────────┘
             │
    Call Teams API
             │
┌────────────▼─────────────────────────┐
│ Teams API: POST v3/conversations/... │
│ Payload:                             │
│ {                                    │
│   type: "message",                   │
│   text: "Here's the fix",            │
│   attachments: [{                    │
│     contentType: "image/png",        │
│     contentUrl: "https://avaya/...", │
│     name: "screenshot.png"           │
│   }]                                 │
│ }                                    │
└────────────┬─────────────────────────┘
             │
┌────────────▼──────────────────┐
│ Teams User Chat               │
│ 💬 Here's the fix             │
│ 🖼️ [Screenshot Preview]       │
│   ✓ Can view                  │
│   ✓ Can download              │
└───────────────────────────────┘
```

---

## ✅ Implementation Checklist

- [ ] Create `/api/teams-itsupport-direct/agent-response` endpoint
- [ ] Add `handleAgentResponse()` method
- [ ] Add `forwardToTeamsBot()` method
- [ ] Add error handling for missing conversationRef
- [ ] Add attachment format conversion
- [ ] Test text-only responses
- [ ] Test single attachment response
- [ ] Test multiple attachments response
- [ ] Test with large files (20MB+)
- [ ] Test backward compatibility
- [ ] Add logging for all agent responses
- [ ] Add rate limiting
- [ ] Add security validation
- [ ] Performance test (< 2 sec response time)

---

## 📞 Integration Points

### 1. Avaya Integration
- **Trigger:** Avaya webhook when agent sends Teams message
- **Payload:** Must include userId, text, attachments array
- **Response:** Middleware returns 200 OK

### 2. FABLineChatbot Integration
- **Endpoint:** `POST /api/teams-itsupport/agent-response`
- **Payload:** userId, text, attachments (Teams format)
- **Response:** { success: true/false }

### 3. Teams API Integration
- **Endpoint:** `v3/conversations/{conversationId}/activities`
- **Method:** POST with Bearer token
- **Payload:** Message with attachments array

