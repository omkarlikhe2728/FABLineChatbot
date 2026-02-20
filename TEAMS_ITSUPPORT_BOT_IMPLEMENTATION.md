# IT Support Teams Bot (`teams-itsupport`) — Complete Implementation Plan

**Last Updated:** 2026-02-19
**Status:** Plan Approved - Ready for Implementation
**Phases:** 16 (across 3 projects)

---

## Overview

Building a new IT Support Teams bot (`teams-itsupport`) in FABLineChatbot that enables Teams users (IT staff/employees) to:
- Report network issues
- Report broadband issues
- Report agent connectivity issues
- Create support tickets with auto-generated IDs in MySQL
- Check ticket status
- Live chat with Avaya agents

The bot follows the **exact same architecture** as the existing `teams-fabbank` bot (BotFrameworkAdapter + manual OAuth + Avaya middleware).

**Three projects involved:**
1. **hotelbookingbackend** — Add IT Support Ticket API (MySQL backend, existing project)
2. **bravishma_middleware_avaya** — Add agent connectivity for IT Support channel + fix missing teams-direct mount
3. **FABLineChatbot** — Add new `teams-itsupport` bot

---

## Architecture Diagram

```
Teams User (IT Staff/Employee)
        │
        ▼
POST /api/teams/itsupport/webhook          (FABLineChatbot)
        │
        ▼
TeamsItSupportBot.handleWebhook()
        │  BotFrameworkAdapter validates JWT
        ▼
activityController.processActivity()       (copy verbatim from teams-fabbank)
        │  Sanitizes Teams service URL, runs state machine
        ▼
DialogManager.processMessage()             (9-state IT Support machine)
        │
        ├─ submit_ticket flow ─▶ ItSupportService.createTicket()
        │                         │
        │                         ▼
        │                    POST http://localhost:3000/api/v1/it-support/tickets
        │                         │
        │                         ▼
        │                    hotelbookingbackend (MySQL db)
        │                    Creates IT-YYYYMMDD-XXXXXX ticket ID
        │
        └─ live_chat flow ──▶ LiveChatService
                              POST middleware /api/teams-itsupport-direct/live-chat/message/teams-itsupport
                              │
                              ▼
                         bravishma_middleware_avaya
                              │ Routes to Avaya agent
                              ▼
                         Avaya Agent replies
                              │
                              ▼ POST /api/teams/itsupport/push-message
                         FABLineChatbot (proactive message to user)
```

---

## Part 1: hotelbookingbackend — IT Support Ticket API

**Location:** `D:\DemoProjectsBackend\hotelbookingbackend`

### Project Analysis (Existing Patterns)
- **Database:** MySQL with `mysql2/promise` pool (async/await)
- **Architecture:** Model (SQL) → Service (logic) → Controller (thin) → Routes (validation)
- **ORM:** None — raw parameterized SQL queries
- **Validation:** Joi schemas + `validateRequest` middleware
- **ID Format:** `TYPE-YYYYMMDD-RANDOMHEX` (e.g., `HO-20260219-ABC123`, `PAY-20260219-XYZ789`)
- **Response Format:** `{ success: true/false, data: {...}, timestamp: "...", error?: {...} }`
- **Error Handling:** Custom error classes (NotFoundError, BadRequestError, ValidationError) + centralized errorHandler middleware

### 1.1 New SQL Migration File

**File:** `database/migrations/009_create_it_support_tickets.sql`

```sql
CREATE TABLE IF NOT EXISTS it_support_tickets (
    id              INT PRIMARY KEY AUTO_INCREMENT,
    ticket_id       VARCHAR(30) UNIQUE NOT NULL,     -- IT-YYYYMMDD-XXXXXX
    user_id         VARCHAR(255) NOT NULL,           -- Teams user ID from bot
    display_name    VARCHAR(255),                    -- Teams display name
    channel         VARCHAR(50) DEFAULT 'teams',
    issue_type      ENUM('network','broadband','agent_connectivity') NOT NULL,
    description     TEXT NOT NULL,
    priority        ENUM('MEDIUM','HIGH','CRITICAL') NOT NULL,
    status          ENUM('OPEN','IN_PROGRESS','RESOLVED','CLOSED') NOT NULL DEFAULT 'OPEN',
    eta_minutes     INT NOT NULL,                   -- 240 | 120 | 30
    assigned_to     VARCHAR(255) DEFAULT NULL,
    resolution      TEXT DEFAULT NULL,
    created_at      TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at      TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
    resolved_at     TIMESTAMP NULL,

    INDEX idx_ticket_id    (ticket_id),
    INDEX idx_user_id      (user_id),
    INDEX idx_status       (status),
    INDEX idx_issue_type   (issue_type),
    INDEX idx_created_at   (created_at)
) ENGINE=InnoDB;
```

**Key design decisions:**
- `ticket_id` is the user-facing ID (e.g., `IT-20260219-ABC123`), unique + indexed
- `id` is the internal auto-increment PK (not exposed to bot)
- `issue_type` uses ENUM to restrict values
- `eta_minutes` stored as integer for faster queries (240=4h, 120=2h, 30=30min)
- `status` uses ENUM with transitions: OPEN → IN_PROGRESS → RESOLVED → CLOSED
- `created_at` / `updated_at` automatic for audit trail

### 1.2 Priority & ETA Mapping (Service Logic)

| Issue Type           | Priority | ETA (min) | ETA Label  |
|----------------------|----------|-----------|------------|
| `network`            | MEDIUM   | 240       | 4 hours    |
| `broadband`          | HIGH     | 120       | 2 hours    |
| `agent_connectivity` | CRITICAL | 30        | 30 minutes |

This mapping is derived in the service, not stored in database.

### 1.3 Ticket ID Generation

**File:** `src/utils/bookingIdGenerator.js` (modify)

Add new function:
```javascript
const generateTicketId = () => {
  const date = new Date().toISOString().slice(0, 10).replace(/-/g, '');     // YYYYMMDD
  const random = Math.random().toString(36).substring(2, 8).toUpperCase();  // 6 random alphanumeric
  return `IT-${date}-${random}`;
};

module.exports = { generateBookingId, generateTicketId, ... };
```

Format: `IT-YYYYMMDD-XXXXXX` (follows existing `HO-YYYYMMDD-XXXXXX` pattern for handoffs)

### 1.4 Model File

**File:** `src/models/itSupportTicket.model.js` (new)

```javascript
const { pool } = require('../config/database');

const create = async (data) => {
  const { userId, displayName, issueType, description, priority, etaMinutes } = data;
  const [result] = await pool.query(`
    INSERT INTO it_support_tickets
      (user_id, display_name, issue_type, description, priority, status, eta_minutes)
    VALUES (?, ?, ?, ?, ?, 'OPEN', ?)
  `, [userId, displayName, issueType, description, priority, etaMinutes]);
  return result.insertId;
};

const findByTicketId = async (ticketId) => {
  const [rows] = await pool.query(
    'SELECT * FROM it_support_tickets WHERE ticket_id = ?',
    [ticketId]
  );
  return rows[0];
};

const findByUserId = async (userId, limit = 10) => {
  const [rows] = await pool.query(
    'SELECT * FROM it_support_tickets WHERE user_id = ? ORDER BY created_at DESC LIMIT ?',
    [userId, limit]
  );
  return rows;
};

const updateStatus = async (ticketId, newStatus, additionalFields = {}) => {
  let query = 'UPDATE it_support_tickets SET status = ?, updated_at = NOW()';
  const params = [newStatus];

  if (additionalFields.assignedTo) {
    query += ', assigned_to = ?';
    params.push(additionalFields.assignedTo);
  }
  if (additionalFields.resolution) {
    query += ', resolution = ?';
    params.push(additionalFields.resolution);
  }
  if (newStatus === 'RESOLVED') {
    query += ', resolved_at = NOW()';
  }

  query += ' WHERE ticket_id = ?';
  params.push(ticketId);

  await pool.query(query, params);
};

module.exports = { create, findByTicketId, findByUserId, updateStatus };
```

### 1.5 Validator File

**File:** `src/validators/itSupportTicket.validator.js` (new)

```javascript
const Joi = require('joi');

const createTicketSchema = Joi.object({
  userId:      Joi.string().max(255).required(),
  displayName: Joi.string().max(255),
  issueType:   Joi.string()
    .valid('network', 'broadband', 'agent_connectivity')
    .required(),
  description: Joi.string()
    .min(5)
    .max(5000)
    .required()
    .trim(),
});

const updateStatusSchema = Joi.object({
  status:      Joi.string()
    .valid('IN_PROGRESS', 'RESOLVED', 'CLOSED')
    .required(),
  assignedTo:  Joi.string().max(255),
  resolution:  Joi.string().max(2000)
});

module.exports = { createTicketSchema, updateStatusSchema };
```

### 1.6 Service File

**File:** `src/services/itSupportTicket.service.js` (new)

```javascript
const itSupportTicketModel = require('../models/itSupportTicket.model');
const { generateTicketId } = require('../utils/bookingIdGenerator');
const { NotFoundError, BadRequestError } = require('../utils/errors');

const PRIORITY_MAP = {
  network:              { priority: 'MEDIUM',   etaMinutes: 240, etaLabel: '4 hours' },
  broadband:            { priority: 'HIGH',     etaMinutes: 120, etaLabel: '2 hours' },
  agent_connectivity:   { priority: 'CRITICAL', etaMinutes: 30,  etaLabel: '30 minutes' }
};

const createTicket = async (ticketData) => {
  const { issueType, userId } = ticketData;

  // Get priority and ETA from mapping
  if (!PRIORITY_MAP[issueType]) {
    throw new BadRequestError(`Invalid issue type: ${issueType}`);
  }
  const { priority, etaMinutes, etaLabel } = PRIORITY_MAP[issueType];

  // Generate ticket ID and create record
  const ticketId = generateTicketId();
  const id = await itSupportTicketModel.create({
    ...ticketData,
    priority,
    etaMinutes
  });

  // Update the row with generated ticket_id
  await itSupportTicketModel._updateTicketId(id, ticketId);

  return {
    ticketId,
    priority,
    status: 'OPEN',
    etaLabel,
    etaMinutes,
    createdAt: new Date().toISOString()
  };
};

const getTicket = async (ticketId) => {
  const ticket = await itSupportTicketModel.findByTicketId(ticketId);
  if (!ticket) {
    throw new NotFoundError(`Ticket ${ticketId} not found`);
  }
  const { priority } = PRIORITY_MAP[ticket.issue_type] || {};
  return {
    ...ticket,
    etaLabel: PRIORITY_MAP[ticket.issue_type]?.etaLabel || 'N/A'
  };
};

const updateTicketStatus = async (ticketId, updateData) => {
  const ticket = await itSupportTicketModel.findByTicketId(ticketId);
  if (!ticket) {
    throw new NotFoundError(`Ticket ${ticketId} not found`);
  }

  // Validate status transition
  const validTransitions = {
    OPEN:         ['IN_PROGRESS', 'CLOSED'],
    IN_PROGRESS:  ['RESOLVED', 'CLOSED'],
    RESOLVED:     ['CLOSED'],
    CLOSED:       []
  };
  if (!validTransitions[ticket.status]?.includes(updateData.status)) {
    throw new BadRequestError(
      `Cannot transition from ${ticket.status} to ${updateData.status}`
    );
  }

  await itSupportTicketModel.updateStatus(ticketId, updateData.status, {
    assignedTo: updateData.assignedTo,
    resolution: updateData.resolution
  });

  return {
    ticketId,
    status: updateData.status,
    message: `Ticket status updated to ${updateData.status}`
  };
};

module.exports = { createTicket, getTicket, updateTicketStatus };
```

### 1.7 Controller File

**File:** `src/controllers/itSupportTicket.controller.js` (new)

```javascript
const itSupportTicketService = require('../services/itSupportTicket.service');
const { formatSuccess } = require('../utils/responseFormatter');

const createTicket = async (req, res, next) => {
  try {
    const result = await itSupportTicketService.createTicket(req.body);
    res.status(201).json(formatSuccess(result, 'Ticket created successfully'));
  } catch (error) {
    next(error);
  }
};

const getTicket = async (req, res, next) => {
  try {
    const { ticketId } = req.params;
    const result = await itSupportTicketService.getTicket(ticketId);
    res.json(formatSuccess(result));
  } catch (error) {
    next(error);
  }
};

const updateTicketStatus = async (req, res, next) => {
  try {
    const { ticketId } = req.params;
    const result = await itSupportTicketService.updateTicketStatus(ticketId, req.body);
    res.json(formatSuccess(result));
  } catch (error) {
    next(error);
  }
};

module.exports = { createTicket, getTicket, updateTicketStatus };
```

### 1.8 Routes File

**File:** `src/routes/itSupportTicket.routes.js` (new)

```javascript
const express = require('express');
const router = express.Router();
const controller = require('../controllers/itSupportTicket.controller');
const validateRequest = require('../middleware/validateRequest');
const { createTicketSchema, updateStatusSchema } = require('../validators/itSupportTicket.validator');

// POST /api/v1/it-support/tickets
router.post('/', validateRequest(createTicketSchema), controller.createTicket);

// GET /api/v1/it-support/tickets/:ticketId
router.get('/:ticketId', controller.getTicket);

// PATCH /api/v1/it-support/tickets/:ticketId/status
router.patch('/:ticketId/status', validateRequest(updateStatusSchema), controller.updateTicketStatus);

module.exports = router;
```

### 1.9 Registration in Existing Files

**File:** `src/routes/index.js` (modify)

Add after existing routes:
```javascript
const itSupportTicketRoutes = require('./itSupportTicket.routes');

// ... existing routes ...

router.use('/it-support/tickets', itSupportTicketRoutes);
```

**File:** `src/models/index.js` (modify)

Add to exports:
```javascript
const itSupportTicketModel = require('./itSupportTicket.model');

module.exports = {
  // ... existing models ...
  itSupportTicketModel
};
```

**File:** `src/utils/bookingIdGenerator.js` (modify)

Add function:
```javascript
const generateTicketId = () => {
  const date = new Date().toISOString().slice(0, 10).replace(/-/g, '');
  const random = Math.random().toString(36).substring(2, 8).toUpperCase();
  return `IT-${date}-${random}`;
};

module.exports = { generateBookingId, generateTicketId, ... };
```

### 1.10 Final API Endpoints

| Method | URL | Description | Response |
|--------|-----|-------------|----------|
| `POST` | `http://localhost:3000/api/v1/it-support/tickets` | Create ticket | `{ success: true, data: { ticketId, priority, status: "OPEN", etaLabel, createdAt } }` |
| `GET`  | `http://localhost:3000/api/v1/it-support/tickets/:ticketId` | Get ticket | `{ success: true, data: { ticketId, issueType, priority, status, etaLabel, ... } }` |
| `PATCH`| `http://localhost:3000/api/v1/it-support/tickets/:ticketId/status` | Update status | `{ success: true, data: { ticketId, status, message } }` |

---

## Part 2: bravishma_middleware_avaya — Agent Connectivity

**Location:** `D:\NodeJS\bravishma_middleware_avaya`

### Critical Issue Found
**`teams-direct.routes.ts` exists BUT is NOT mounted in `routes/index.ts`** — this breaks Teams live chat for `teams-fabbank` and must be fixed before adding IT Support support.

### 2.1 Fix Missing teams-direct Mount

**File:** `src/routes/index.ts` (modify)

Add import (if not already present):
```typescript
import teamsDirectRoutes from './teams-direct.routes';
```

Add mount:
```typescript
router.use('/teams-direct', teamsDirectRoutes);
```

This fixes the missing route for `teams-fabbank` bot.

### 2.2 Add IT Support Project to Enum

**File:** `src/types/project.types.ts` (modify)

Add enum value:
```typescript
export enum ProjectName {
    DEFAULT = 'default',
    SHOWMEAVAYA = 'showmeavaya',
    ANA = 'ana',
    TEAMS_FABBANK = 'teams-fabbank',
    TEAMS_IT_SUPPORT = 'teams-itsupport',  // ADD THIS
}
```

### 2.3 Create IT Support Direct Routes

**File:** `src/routes/teams-itsupport-direct.routes.ts` (new)

Clone from `teams-direct.routes.ts`:
```typescript
import { Router } from 'express';
import { TeamsItSupportDirectController } from '../controllers/teams-itsupport-direct.controller';

const router = Router();
const controller = new TeamsItSupportDirectController();

router.post('/live-chat/start',                    (req, res) => controller.startLiveChat(req, res));
router.post('/live-chat/message/:projectName',    (req, res) => controller.sendLiveChatMessage(req, res));
router.post('/live-chat/end',                      (req, res) => controller.endLiveChatSession(req, res));

export default router;
```

### 2.4 Create IT Support Direct Controller

**File:** `src/controllers/teams-itsupport-direct.controller.ts` (new)

Clone from `teams-direct.controller.ts` with **one critical change:**

```typescript
import { Request, Response } from 'express';
import { avayaService } from '../services/avaya.service';
import { conversationCache } from '../utils/conversationCache';
import { logger } from '../utils/logger';

export class TeamsItSupportDirectController {
  async startLiveChat(req: Request, res: Response): Promise<void> {
    // ... copy entire method from teams-direct.controller.ts ...
  }

  async sendLiveChatMessage(req: Request, res: Response): Promise<void> {
    const { userId, displayName, message } = req.body;
    const projectName = req.params.projectName || 'default';

    if (!conversationCache.hasConversation(userId)) {
      return res.status(404).json({ error: 'Conversation not found' });
    }

    const avayaPayload = {
      channel: 'messaging',
      body: { type: 'text', text: message?.text || '' },
      headers: {
        from: userId,
        channelName: 'TEAMS_IT_SUPPORT',  // <-- CRITICAL DIFFERENCE FROM teams-direct
        channelAddress: userId,
      },
      sender: { displayName },
    };

    await avayaService.sendMessageToAvaya(avayaPayload, projectName);
    res.status(200).json({ received: true });
  }

  async endLiveChatSession(req: Request, res: Response): Promise<void> {
    // ... copy entire method from teams-direct.controller.ts ...
  }
}
```

**Critical:** `channelName: 'TEAMS_IT_SUPPORT'` (not `'TEAMS'`) ensures Avaya callbacks route to IT Support bot.

### 2.5 Update Avaya Controller

**File:** `src/controllers/avaya.controller.ts` (modify)

In `handleWebhookCallback()` method, add new routing case:

```typescript
if (webhookData.headers.channelName.toLowerCase() === 'whatsapp') {
    await this.forwardToWhatsApp(webhookData, projectName);
} else if (webhookData.headers.channelName.toLowerCase() === 'line') {
    await this.forwardToLine(webhookData, projectName);
} else if (webhookData.headers.channelName.toLowerCase() === 'teams') {
    await this.forwardToTeams(webhookData, projectName);
} else if (webhookData.headers.channelName.toLowerCase() === 'teams_it_support') {  // ADD THIS
    await this.forwardToTeamsItSupport(webhookData, projectName);
}
```

Add new private method:
```typescript
private async forwardToTeamsItSupport(message: AvayaWebhookResponse, projectName: ProjectName): Promise<void> {
    try {
        const teamsUserId = message.headers?.to?.[0];
        const agentText = message.body?.text || '';
        const baseUrl = process.env.TEAMS_IT_SUPPORT_BOT_BASE_URL || 'http://localhost:3000';

        const response = await axios.post(
            `${baseUrl}/api/teams/itsupport/push-message`,
            { userId: teamsUserId, text: agentText, attachments: [] },
            { timeout: 10000 }
        );

        logger.info(`Agent message forwarded to IT Support Teams bot for user ${teamsUserId}`);
    } catch (error) {
        logger.error('Failed to forward message to IT Support Teams bot', error);
        throw error;
    }
}
```

### 2.6 Mount IT Support Direct Routes

**File:** `src/routes/index.ts` (modify)

Add import:
```typescript
import teamsItSupportDirectRoutes from './teams-itsupport-direct.routes';
```

Add mount:
```typescript
router.use('/teams-itsupport-direct', teamsItSupportDirectRoutes);
```

### 2.7 Update Environment Variables

**File:** `.env` (modify)

Add:
```
TEAMS_IT_SUPPORT_BOT_BASE_URL=https://recent-jaimee-nonexaggerative.ngrok-free.dev
```

(Same ngrok URL as `TEAMS_BOT_BASE_URL` — both bots run in same FABLineChatbot process on port 3000)

---

## Part 3: FABLineChatbot — teams-itsupport Bot

**Location:** `d:\Chatbot\Hotel Website Chatbot Design\FABLineChatbot`

### 3.1 Dialog State Machine

```
┌─ MAIN_MENU ─────┐
│                 │
├─ submit_ticket ────── SELECT_ISSUE_TYPE ──────────┐
│                                                     │
├─ check_ticket_status - CHECK_TICKET_STATUS - SHOW_TICKET_STATUS
│                                    │
├─ live_chat ─────────────── LIVE_CHAT_ACTIVE ──────┤
│                                   │                 │
├─ end_session ───────────── SESSION_CLOSED          │
│                                                     │
└─────────────────── COLLECT_DESCRIPTION             │
                            │                         │
                            └─ CONFIRM_TICKET ───────┤
                                   │                  │
                                   └─ TICKET_CREATED ─┘
```

**9 States:**
1. `MAIN_MENU` — Welcome with 4 buttons
2. `SELECT_ISSUE_TYPE` — Choose network/broadband/agent_connectivity
3. `COLLECT_DESCRIPTION` — Free-text issue description
4. `CONFIRM_TICKET` — Review before submit (Confirm / Edit / Back)
5. `TICKET_CREATED` — Success screen with ticket ID
6. `CHECK_TICKET_STATUS` — Prompt for ticket ID input
7. `SHOW_TICKET_STATUS` — Display ticket details
8. `LIVE_CHAT_ACTIVE` — Live chat with agent
9. `SESSION_CLOSED` — Terminal state

### 3.2 Files to Create

| File | Pattern | Key Differences |
|------|---------|-----------------|
| `src/bots/teams-itsupport/config.js` | Adapt from `teams-fabbank` | `TEAMS_ITSUPPORT_*` prefix, `itSupportApiUrl` instead of banking URL |
| `src/bots/teams-itsupport/index.js` | Adapt from `teams-fabbank` | Import `ItSupportService` instead of `BankingService` |
| `src/bots/teams-itsupport/controllers/activityController.js` | **COPY VERBATIM** | Zero changes — fully generic |
| `src/bots/teams-itsupport/services/teamsService.js` | Adapt from `teams-fabbank` | Change `this.botId = 'teams-itsupport'` (1 line only) |
| `src/bots/teams-itsupport/services/tokenService.js` | **COPY VERBATIM** | Zero changes |
| `src/bots/teams-itsupport/services/debugService.js` | **COPY VERBATIM** | Zero changes |
| `src/bots/teams-itsupport/services/sessionService.js` | Adapt from `teams-fabbank` | Change `this.botId = 'teams-itsupport'` (1 line only) |
| `src/bots/teams-itsupport/services/itSupportService.js` | **NEW** | axios calls to hotelbookingbackend API |
| `src/bots/teams-itsupport/services/liveChatService.js` | Adapt from `teams-fabbank` | Endpoint: `api/teams-itsupport-direct/live-chat/message/{tenantId}` |
| `src/bots/teams-itsupport/services/dialogManager.js` | **NEW** | 9-state IT Support machine |
| `src/bots/teams-itsupport/services/templateService.js` | **NEW** | 11 Adaptive Card factories |

### 3.3 itSupportService.js

```javascript
const axios = require('axios');
const logger = require('../../../common/utils/logger');

class ItSupportService {
  constructor(config) {
    this.baseUrl = config.itSupportApiUrl;
    this.botId = 'teams-itsupport';

    this.client = axios.create({
      baseURL: this.baseUrl,
      timeout: config.itSupportApiTimeout,
      headers: { 'Content-Type': 'application/json' }
    });

    logger.info(`ItSupportService initialized. API URL: ${this.baseUrl}`);
  }

  async createTicket(userId, displayName, issueType, description) {
    try {
      logger.info(`Creating ticket for user ${userId}, issueType: ${issueType}`);
      const response = await this.client.post('/api/v1/it-support/tickets', {
        userId,
        displayName: displayName || `Teams User ${userId}`,
        issueType,
        description
      });

      const data = response.data?.data || {};
      logger.info(`Ticket created: ${data.ticketId} priority=${data.priority}`);
      return { success: true, ...data };
    } catch (error) {
      logger.error(`Failed to create ticket for user ${userId}`, {
        message: error.message,
        status: error.response?.status,
        data: error.response?.data
      });
      return { success: false, error: error.response?.data?.error || 'Failed to create ticket' };
    }
  }

  async getTicketStatus(ticketId) {
    try {
      logger.info(`Fetching ticket status for ${ticketId}`);
      const response = await this.client.get(`/api/v1/it-support/tickets/${ticketId}`);
      const data = response.data?.data || {};

      logger.info(`Ticket ${ticketId} status: ${data.status}`);
      return { success: true, ...data };
    } catch (error) {
      if (error.response?.status === 404) {
        logger.warn(`Ticket not found: ${ticketId}`);
        return { success: false, error: `Ticket ${ticketId} not found` };
      }
      logger.error(`Failed to fetch ticket ${ticketId}`, {
        message: error.message,
        status: error.response?.status
      });
      return { success: false, error: error.response?.data?.error || 'Failed to fetch ticket status' };
    }
  }
}

module.exports = ItSupportService;
```

### 3.4 dialogManager.js Structure

The dialogManager has 9 handler methods:

```javascript
async processMessage(userId, dialogState, text, actionData, attributes) {
  // Main dispatcher - routes to handler based on dialogState
  switch(dialogState) {
    case 'MAIN_MENU': return this._handleMainMenu(userId, text, actionData, attributes);
    case 'SELECT_ISSUE_TYPE': return this._handleSelectIssueType(userId, text, actionData, attributes);
    case 'COLLECT_DESCRIPTION': return this._handleCollectDescription(userId, text, attributes);
    case 'CONFIRM_TICKET': return this._handleConfirmTicket(userId, text, actionData, attributes);
    case 'TICKET_CREATED': return this._handleTicketCreated(userId, text, actionData, attributes);
    case 'CHECK_TICKET_STATUS': return this._handleCheckTicketStatus(userId, text, attributes);
    case 'SHOW_TICKET_STATUS': return this._handleShowTicketStatus(userId, text, actionData, attributes);
    case 'LIVE_CHAT_ACTIVE': return this._handleLiveChat(userId, text, attributes);
    case 'SESSION_CLOSED': return { cards: [this.templateService.getTextCard(...)] };
  }
}

_handleMainMenu(userId, text, actionData, attributes) {
  // Check action and route to SELECT_ISSUE_TYPE, CHECK_TICKET_STATUS, LIVE_CHAT_ACTIVE, or SESSION_CLOSED
}

_handleSelectIssueType(userId, text, actionData, attributes) {
  // Validate issueType is one of: network, broadband, agent_connectivity
  // Store in attributes.issueType
  // Route to COLLECT_DESCRIPTION
}

_handleCollectDescription(userId, text, attributes) {
  // Validate description length >= 5 chars
  // Store in attributes.description
  // Route to CONFIRM_TICKET
  // Show summary card with issue type, description, auto-assigned priority
}

_handleConfirmTicket(userId, text, actionData, attributes) {
  // If confirm_yes: call itSupportService.createTicket() → TICKET_CREATED
  // If confirm_no/back_to_menu: return to appropriate state
}

_handleTicketCreated(userId, text, actionData, attributes) {
  // If check_another: route to CHECK_TICKET_STATUS
  // If back_to_menu: route to MAIN_MENU
}

_handleCheckTicketStatus(userId, text, attributes) {
  // Validate text matches TKT-YYYYMMDD-XXXX format (regex)
  // If valid: call itSupportService.getTicketStatus() → SHOW_TICKET_STATUS
  // If invalid: show format error, prompt again
}

_handleShowTicketStatus(userId, text, actionData, attributes) {
  // If check_another: route to CHECK_TICKET_STATUS
  // If back_to_menu: route to MAIN_MENU
}

_handleLiveChat(userId, text, attributes) {
  // If text contains exit keywords (exit|quit|end chat|end session|close|menu): route to MAIN_MENU
  // Otherwise: call liveChatService.sendMessage()
  // Stay in LIVE_CHAT_ACTIVE
}

_startLiveChat(userId, attributes) {
  // Call liveChatService.startLiveChat()
  // Route to LIVE_CHAT_ACTIVE
}
```

### 3.5 templateService.js — 11 Adaptive Cards

```javascript
// Main menu cards
getWelcomeCard()          // 4 buttons + welcome banner
getMainMenuCard()         // Same as getWelcomeCard()

// Issue submission flow
getIssueTypeCard()        // 3 buttons: Network, Broadband, Agent Connectivity (FactSet with priority/ETA)
getDescriptionInputCard(issueType)  // Prompt to type description
getTicketConfirmCard(issueType, description)  // Review with Confirm/Edit/Back buttons

// Success flow
getTicketCreatedCard(data)  // Green success card with ticket ID, priority, ETA

// Ticket lookup flow
getTicketIdInputCard()      // Prompt for IT-YYYYMMDD-XXXXXX format
getTicketStatusCard(data)   // FactSet with all ticket details + Refresh/Check Another/Back buttons

// Generic/shared (copied from teams-fabbank)
getErrorCard(title, msg)    // Red error card
getTextCard(title, msg)     // Plain text card
getLiveChatStartingCard()   // "Connecting to agent..."
getLiveChatEndedCard()      // "Chat ended" + back to menu button
```

### 3.6 Configuration Files

**File:** `.env.teams-itsupport` (new)

```
# Teams Bot Framework Credentials (get from Azure Portal)
TEAMS_ITSUPPORT_APP_ID=<your-azure-app-id>
TEAMS_ITSUPPORT_APP_PASSWORD=<your-azure-app-password>
TEAMS_ITSUPPORT_MICROSOFT_APP_TENANT_ID=<your-tenant-id>

# IT Support API (hotelbookingbackend)
TEAMS_ITSUPPORT_API_URL=http://localhost:3000
TEAMS_ITSUPPORT_API_TIMEOUT=10000

# Live Chat Middleware (Avaya)
TEAMS_ITSUPPORT_LIVE_CHAT_API_URL=https://infobip-connector.lab.bravishma.com/
TEAMS_ITSUPPORT_LIVE_CHAT_TIMEOUT=20000

# Bot Settings
TEAMS_ITSUPPORT_BOT_NAME=IT Support Bot
TEAMS_ITSUPPORT_SESSION_TIMEOUT=300000
TEAMS_ITSUPPORT_TENANT_ID=teams-itsupport

# Optional
TEAMS_ITSUPPORT_WELCOME_IMAGE=
TEAMS_ITSUPPORT_LOG_LEVEL=info
```

**File:** `config/teams-itsupport.json` (new)

```json
{
  "botName": "IT Support Bot",
  "features": {
    "submitTicket": true,
    "checkTicketStatus": true,
    "liveChat": true
  },
  "menu": {
    "buttons": [
      { "label": "🎫 Submit Support Ticket", "action": "submit_ticket" },
      { "label": "🔍 Check Ticket Status",   "action": "check_ticket_status" },
      { "label": "💬 Live Chat with Agent",  "action": "live_chat" },
      { "label": "❌ End Session",            "action": "end_session" }
    ]
  },
  "issueTypes": [
    { "id": "network",              "label": "Network Issue",            "priority": "MEDIUM",   "etaMinutes": 240 },
    { "id": "broadband",            "label": "Broadband Issue",          "priority": "HIGH",     "etaMinutes": 120 },
    { "id": "agent_connectivity",   "label": "Agent Connectivity Issue", "priority": "CRITICAL", "etaMinutes": 30 }
  ],
  "sessionTimeout": 300000
}
```

### 3.7 Registration Files

**File:** `config/bots.json` (modify)

Add entry after `teams-fabbank`:
```json
{
  "id": "teams-itsupport",
  "enabled": true,
  "platform": "teams",
  "envFile": ".env.teams-itsupport",
  "configFile": "config/teams-itsupport.json",
  "modulePath": "./bots/teams-itsupport"
}
```

**File:** `src/app.js` (modify)

Add 2 new route blocks after existing Teams FAB Bank routes (lines 134-194):

```javascript
// ==================== Teams IT Support Bot ====================

// Teams IT Support Bot Webhook
app.post('/api/teams/itsupport/webhook', async (req, res) => {
  try {
    const bot = BotRegistry.getBot('teams-itsupport');
    if (!bot) {
      logger.warn('Teams IT Support bot not found in registry');
      return res.status(404).json({ message: 'Teams IT Support bot not found' });
    }
    logger.info('💬 Teams IT Support webhook received');
    await bot.handleWebhook(req, res);
  } catch (error) {
    logger.error('Teams IT Support webhook handler error:', error);
    res.status(500).json({ error: 'Internal Server Error' });
  }
});

// Teams IT Support Proactive Message Endpoint (agent replies from middleware)
app.post('/api/teams/itsupport/push-message', async (req, res) => {
  try {
    const { userId, text, attachments } = req.body;

    if (!userId || !text) {
      return res.status(400).json({ error: 'Missing userId or text' });
    }

    const sessionStore = require('./common/services/sessionStore');
    const teamsService = BotRegistry.getBot('teams-itsupport')?.teamsService;

    if (!teamsService) {
      logger.error('Teams IT Support service not available');
      return res.status(500).json({ error: 'Teams service not available' });
    }

    const session = sessionStore.getSession('teams-itsupport', userId);
    if (!session?.attributes?.conversationReference) {
      logger.error(`No conversation reference found for user ${userId}`);
      return res.status(404).json({ error: 'Conversation not found' });
    }

    const result = await teamsService.sendProactiveMessage(
      session.attributes.conversationReference,
      text,
      attachments
    );

    if (!result.success) {
      return res.status(500).json({ error: 'Failed to send message' });
    }

    logger.info(`IT Support proactive message sent to user ${userId}`);
    res.status(200).json({ success: true, message: 'Message sent' });
  } catch (error) {
    logger.error('Teams IT Support push message handler error:', error);
    res.status(500).json({ error: 'Internal Server Error' });
  }
});
```

---

## Implementation Phases

| # | Project | Phase Title | Tasks |
|---|---------|-------------|-------|
| **1** | hotelbookingbackend | SQL Migration | Create `it_support_tickets` table |
| **2** | hotelbookingbackend | Backend Services | Create model, service, validator, controller |
| **3** | hotelbookingbackend | Backend Routes | Create routes file + register in index.js |
| **4** | hotelbookingbackend | Backend Config | Add generateTicketId() to bookingIdGenerator.js |
| **5** | hotelbookingbackend | Testing | Verify API endpoints with curl/Postman |
| **6** | middleware | Fix Missing Route | Mount `teams-direct` in routes/index.ts |
| **7** | middleware | Add Enum Value | Add `TEAMS_IT_SUPPORT` to ProjectName |
| **8** | middleware | New Routes | Create `teams-itsupport-direct.routes.ts` |
| **9** | middleware | New Controller | Create `teams-itsupport-direct.controller.ts` with `channelName: 'TEAMS_IT_SUPPORT'` |
| **10** | middleware | Update Avaya | Add TEAMS_IT_SUPPORT case in avaya.controller.ts |
| **11** | middleware | Mount Routes | Mount `teams-itsupport-direct` in routes/index.ts |
| **12** | middleware | Update Config | Add TEAMS_IT_SUPPORT_BOT_BASE_URL to .env |
| **13** | FABLineChatbot | Config Files | Create `.env.teams-itsupport` + `config/teams-itsupport.json` |
| **14** | FABLineChatbot | Bot Registration | Add entry to `config/bots.json` |
| **15** | FABLineChatbot | Copy Services | Create 5 verbatim copies (teamsService, tokenService, etc.) + 1 adapted (sessionService) |
| **16** | FABLineChatbot | New Services | Create `itSupportService.js` + `liveChatService.js` |
| **17** | FABLineChatbot | New Templates | Create `templateService.js` with 11 cards |
| **18** | FABLineChatbot | State Machine | Create `dialogManager.js` with 9 states |
| **19** | FABLineChatbot | Bot Controller | Copy `activityController.js` verbatim |
| **20** | FABLineChatbot | Bot Index | Create `index.js` (TeamsItSupportBot class) + `config.js` |
| **21** | FABLineChatbot | Routes | Add 2 new routes to `src/app.js` |
| **22** | Azure Portal | Bot Registration | Create new App Registration for teams-itsupport |
| **23** | All | Verification | End-to-end testing across all 3 projects |

---

## Critical Notes

### 1. Teams Service botId Hardcode
In `services/teamsService.js`, line 11 has `this.botId = 'teams-fabbank'`. When copying for IT Support, **must change to `'teams-itsupport'`**.

### 2. teams-direct Was Never Mounted
Phase 6 (middleware) fixes a critical issue: `teams-direct` routes exist but aren't mounted in `routes/index.ts`. This breaks Teams live chat entirely and must be fixed first.

### 3. Channel Name Discrimination
The middleware routes agent replies based on `channelName` from Avaya callback:
- `'TEAMS'` → `forwardToTeams()` → FAB Bank bot
- `'TEAMS_IT_SUPPORT'` → `forwardToTeamsItSupport()` → IT Support bot

Both routes POST to their respective bot's `/api/teams/{botId}/push-message` endpoint.

### 4. Port 3000 Conflict
Both `hotelbookingbackend` and `FABLineChatbot` default to port 3000. Solutions:
- Change `hotelbookingbackend` to PORT=3001
- Or set `TEAMS_ITSUPPORT_API_URL=http://localhost:3001` in FABLineChatbot

### 5. itSupportService is NEW, NOT a re-export
Unlike `teams-fabbank` which re-exports the LINE `BankingService` singleton, `teams-itsupport` creates a **new instance** of `ItSupportService`:
```javascript
this.itSupportService = new ItSupportService(this.config);  // instantiate
```

### 6. Same ngrok URL for Both Teams Bots
Both bots run in the same FABLineChatbot process on port 3000, so they share the same ngrok tunnel:
```
TEAMS_BOT_BASE_URL=https://recent-jaimee-nonexaggerative.ngrok-free.dev
TEAMS_IT_SUPPORT_BOT_BASE_URL=https://recent-jaimee-nonexaggerative.ngrok-free.dev (same)
```

### 7. No Changes to teams-fabbank Bot
The plan modifies **zero** files inside `src/bots/teams-fabbank/`. Only `config/bots.json` and `src/app.js` (shared files) are modified to add the new bot.

### 8. Ticket ID Format
`IT-YYYYMMDD-XXXXXX` follows the existing `HO-YYYYMMDD-XXXXXX` (handoff) and `PAY-YYYYMMDD-XXXXXX` (payment) patterns already used in hotelbookingbackend.

---

## Verification Checklist

### hotelbookingbackend Verification

```bash
# Start server
npm run dev   # should listen on port 3000 (or 3001)

# Test ticket creation
curl -X POST http://localhost:3000/api/v1/it-support/tickets \
  -H "Content-Type: application/json" \
  -d '{ "userId": "user123", "issueType": "broadband", "description": "No internet connection" }'

# Expected response (201):
# { "success": true, "data": { "ticketId": "IT-20260219-ABC123", "priority": "HIGH", "etaLabel": "2 hours" } }

# Test get ticket
curl http://localhost:3000/api/v1/it-support/tickets/IT-20260219-ABC123

# Expected response (200):
# { "success": true, "data": { "ticketId": "IT-20260219-ABC123", "issueType": "broadband", "priority": "HIGH", "status": "OPEN" } }

# Test invalid ticket
curl http://localhost:3000/api/v1/it-support/tickets/IT-00000000-INVALID

# Expected response (404):
# { "success": false, "error": { "message": "Ticket IT-00000000-INVALID not found", "code": "NOT_FOUND" } }
```

### FABLineChatbot Verification

```bash
# Start FABLineChatbot
npm run dev

# Check bot registered
curl http://localhost:3000/health

# Expected response includes:
# { "activeBots": [ "fabbank", "sands", "ana", "telegram-fabbank", "teams-fabbank", "teams-itsupport" ] }

# Check individual bot
curl http://localhost:3000/health/teams-itsupport

# Expected response:
# { "botId": "teams-itsupport", "success": true, "status": "RUNNING" }
```

### Teams UI Verification

1. **Welcome Card** — Main menu shows 4 buttons (Submit Ticket, Check Status, Live Chat, End Session)
2. **Submit Ticket Flow** — Click button → issue type selection → description prompt → confirmation → ticket created
3. **Ticket ID** — Display format is `IT-YYYYMMDD-XXXXXX` (e.g., `IT-20260219-A1B2C3`)
4. **Check Status** — Enter ticket ID → status card displays with details
5. **Invalid Format** — Type invalid ID → error with format hint
6. **Not Found** — Valid format but non-existent → "Ticket not found" error
7. **Live Chat** — Click button → connects to Avaya agent; type "exit" → returns to main menu
8. **Session Key** — Logs show `teams-itsupport:{teamsUserId}` format

### Middleware Verification

```bash
# Test teams-direct endpoint (should work after Phase 6 fix)
curl -X POST https://infobip-connector.lab.bravishma.com/api/teams-direct/live-chat/message/teams-fabbank \
  -H "Content-Type: application/json" \
  -d '{ "userId": "user1", "displayName": "John", "message": { "type": "text", "text": "test" } }'

# Test teams-itsupport-direct endpoint (new)
curl -X POST https://infobip-connector.lab.bravishma.com/api/teams-itsupport-direct/live-chat/message/teams-itsupport \
  -H "Content-Type: application/json" \
  -d '{ "userId": "user1", "displayName": "Jane", "message": { "type": "text", "text": "test" } }'

# Both should return 200 { received: true }
```

---

## Known Issues & Limitations

### Current (Before Implementation)
1. ❌ `teams-direct` not mounted in middleware — blocks all Teams live chat (both bots)
2. ❌ No IT Support ticket system

### Will Be Fixed
1. ✅ Phase 6 fixes `teams-direct` mounting
2. ✅ Phase 5-12 add IT Support agent connectivity
3. ✅ Phase 1-5 add ticket API

### By Design (Not Bugs)
1. **In-memory sessions** — FABLineChatbot sessions expire after 5 minutes (Redis upgrade documented for production)
2. **No database persistence** — Session state is ephemeral (requires ngrok/firewall tunnel for multi-server)
3. **Manual OAuth for outbound messages** — BotFrameworkAdapter.context.sendActivity() returns HTTP 401 (workaround proven to work)

---

## Helpful Patterns to Reference

### Existing teams-fabbank Files (Read-Only Reference)
- `src/bots/teams-fabbank/services/teamsService.js` — OAuth + manual axios pattern (copy with 1-line change)
- `src/bots/teams-fabbank/services/tokenService.js` — Client credentials flow (copy verbatim)
- `src/bots/teams-fabbank/services/sessionService.js` — Session wrapper (copy with 1-line change)
- `src/bots/teams-fabbank/controllers/activityController.js` — Activity routing (copy verbatim)
- `src/bots/teams-fabbank/services/templateService.js` — Adaptive Card factories (reference pattern)

### Existing hotelbookingbackend Files (Read-Only Reference)
- `src/models/booking.model.js` — MySQL model pattern (raw sql2/promise pool)
- `src/services/booking.service.js` — Service pattern with validation
- `src/controllers/bookings.controller.js` — Thin controller pattern
- `src/routes/bookings.routes.js` — Route definition pattern
- `src/validators/booking.validator.js` — Joi schema pattern

---

## Git Commit Messages (Suggested)

When committing implementation, use these message patterns:

```
feat: Add IT Support ticket API to hotelbookingbackend

- Create it_support_tickets table (MySQL)
- Add model, service, validator, controller, routes
- Implement ticket creation with auto-generated IT-YYYYMMDD-XXXXXX IDs
- Add priority assignment by issue type (network/broadband/agent_connectivity)
```

```
feat: Add teams-itsupport bot to FABLineChatbot

- Create bot directory with 11 files (copy from teams-fabbank pattern)
- Implement 9-state dialog machine for IT support tickets
- Create 11 Adaptive Card templates for UI
- Register bot in bots.json and app.js routes
- Support live chat with Avaya agents
```

```
fix: Mount missing teams-direct routes in middleware

- teams-direct was defined but not imported/mounted in routes/index.ts
- Fix enables Teams live chat for both teams-fabbank and teams-itsupport
```

```
feat: Add teams-itsupport-direct channel to middleware

- Create new routes and controller for IT Support Teams bot
- Add TEAMS_IT_SUPPORT project to ProjectName enum
- Update avaya.controller to route agent replies correctly
```

---

## Success Criteria

✅ Implementation is complete when:

1. **hotelbookingbackend** — All 3 API endpoints working (POST /tickets, GET /:id, PATCH /:id/status)
2. **FABLineChatbot** — 6 bots active (fabbank, sands, ana, telegram-fabbank, teams-fabbank, teams-itsupport)
3. **Middleware** — `teams-direct` mounted + `teams-itsupport-direct` routes working
4. **Teams UX** — Welcome card → Submit Ticket → Ticket created with ID → Status check → Live chat all functional
5. **Ticket ID Format** — Generated as `IT-YYYYMMDD-XXXXXX` with proper priority assignment
6. **Agent Connectivity** — Live chat messages route to correct bot endpoint via middleware

---

## Next Steps After Approval

1. Save this plan document in the project (✅ already saved as TEAMS_ITSUPPORT_BOT_IMPLEMENTATION.md)
2. Start with Phase 1 (hotelbookingbackend SQL migration)
3. Test each phase before proceeding to the next
4. Commit changes with suggested message format
5. Deploy and verify end-to-end
