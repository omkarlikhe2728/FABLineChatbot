const logger = require('../../../common/utils/logger');

class DialogManager {
  constructor(sessionService, itSupportService, templateService, liveChatService, config) {
    this.sessionService = sessionService;
    this.itSupportService = itSupportService;
    this.templateService = templateService;
    this.liveChatService = liveChatService;
    this.config = config;
    logger.info('DialogManager initialized for IT Support bot');
  }

  /**
   * Main entry point - process message based on current dialog state
   */
  async processMessage(userId, dialogState, text, actionData, attributes) {
    try {
      logger.debug(`Processing message in state ${dialogState}, text: "${text}"`);

      let result;
      switch (dialogState) {
        case 'MAIN_MENU':
          result = await this._handleMainMenu(userId, text, actionData, attributes);
          break;
        case 'SELECT_ISSUE_TYPE':
          result = await this._handleSelectIssueType(userId, text, actionData, attributes);
          break;
        case 'TROUBLESHOOTING':
          result = await this._handleTroubleshooting(userId, text, actionData, attributes);
          break;
        case 'COLLECT_DESCRIPTION':
          result = await this._handleCollectDescription(userId, text, actionData, attributes);
          break;
        case 'CONFIRM_TICKET':
          result = await this._handleConfirmTicket(userId, text, actionData, attributes);
          break;
        case 'TICKET_CREATED':
          result = await this._handleTicketCreated(userId, text, actionData, attributes);
          break;
        case 'CHECK_TICKET_STATUS':
          result = await this._handleCheckTicketStatus(userId, text, actionData, attributes);
          break;
        case 'SHOW_TICKET_STATUS':
          result = await this._handleShowTicketStatus(userId, text, actionData, attributes);
          break;
        case 'LIVE_CHAT_ACTIVE':
          result = await this._handleLiveChat(userId, text, actionData, attributes);
          break;
        case 'SESSION_CLOSED':
          result = { cards: [this.templateService.getTextCard('Session Closed', 'Thank you for using IT Support')] };
          break;
        default:
          logger.warn(`Unknown dialog state: ${dialogState}`);
          result = { cards: [this.templateService.getMainMenuCard()], newDialogState: 'MAIN_MENU' };
      }

      return result || { cards: [] };
    } catch (error) {
      logger.error(`Error processing message in state ${dialogState}`, error);
      return {
        cards: [this.templateService.getErrorCard('Error', 'An error occurred. Returning to main menu.')],
        newDialogState: 'MAIN_MENU'
      };
    }
  }

  // ==================== MAIN MENU ====================
  async _handleMainMenu(userId, text, actionData, attributes) {
    const action = actionData?.action || text?.toLowerCase().trim();
    const issueType = actionData?.issueType;

    switch (action) {
      case 'issue_type_selected':
        // Issue type selected directly from main menu
        if (issueType === 'network' || issueType === 'broadband') {
          const steps = this.config.troubleshootingSteps?.[issueType] || [];
          const issueLabel = issueType === 'network' ? 'Network Issue' : 'Broadband Issue';
          return {
            cards: [
              // Show what was selected - simple text card
              this.templateService.getTextCard(issueLabel, ''),
              // Show troubleshooting steps
              this.templateService.getTroubleshootingCard(issueType, steps)
            ],
            newDialogState: 'TROUBLESHOOTING',
            attributes: { issueType }
          };
        }
        // agent_connectivity - go directly to description
        return {
          cards: [
            // Show what was selected
            this.templateService.getTextCard('Agent Connectivity Issue', ''),
            // Show description input
            this.templateService.getDescriptionInputCard(issueType)
          ],
          newDialogState: 'COLLECT_DESCRIPTION',
          attributes: { issueType }
        };

      case 'check_ticket_status':
        return {
          cards: [
            this.templateService.getTextCard('Check Ticket Status', ''),
            this.templateService.getTicketIdInputCard()
          ],
          newDialogState: 'CHECK_TICKET_STATUS'
        };

      case 'live_chat': {
        const chatResult = await this.liveChatService.startLiveChat(
          userId,
          'Teams User',
          'Customer initiated IT support live chat'
        );

        if (chatResult.success) {
          logger.info(`🟢 LIVE CHAT ACTIVE - User ${userId} connected to IT support agent`);
          return {
            cards: [
              this.templateService.getTextCard('Live Chat', ''),
              this.templateService.getLiveChatStartingCard()
            ],
            newDialogState: 'LIVE_CHAT_ACTIVE'
          };
        } else {
          return {
            cards: [
              this.templateService.getTextCard('Live Chat', ''),
              this.templateService.getErrorCard('Failed', 'Could not start live chat. Please try again.')
            ],
            newDialogState: 'MAIN_MENU'
          };
        }
      }

      case 'end_session':
        return {
          cards: [
            this.templateService.getTextCard('End Session', ''),
            this.templateService.getTextCard('Goodbye', 'Thank you for using IT Support. Session ended.')
          ],
          newDialogState: 'SESSION_CLOSED'
        };

      default:
        return {
          cards: [this.templateService.getMainMenuCard()],
          newDialogState: 'MAIN_MENU'
        };
    }
  }

  // ==================== SELECT ISSUE TYPE ====================
  async _handleSelectIssueType(userId, text, actionData, attributes) {
    const action = actionData?.action;
    const issueType = actionData?.issueType;

    if (action === 'issue_type_selected' && issueType) {
      // For network and broadband issues, show troubleshooting first
      if (issueType === 'network' || issueType === 'broadband') {
        const steps = this.config.troubleshootingSteps?.[issueType] || [];
        return {
          cards: [this.templateService.getTroubleshootingCard(issueType, steps)],
          newDialogState: 'TROUBLESHOOTING',
          attributes: { issueType }
        };
      }

      // For agent_connectivity, go directly to description
      return {
        cards: [this.templateService.getDescriptionInputCard(issueType)],
        newDialogState: 'COLLECT_DESCRIPTION',
        attributes: { issueType }
      };
    }

    if (action === 'back_to_menu') {
      return {
        cards: [
          this.templateService.getTextCard('Back to Menu', ''),
          this.templateService.getMainMenuCard()
        ],
        newDialogState: 'MAIN_MENU'
      };
    }

    // Invalid input
    return {
      cards: [this.templateService.getIssueTypeCard()],
      newDialogState: 'SELECT_ISSUE_TYPE'
    };
  }

  // ==================== TROUBLESHOOTING ====================
  async _handleTroubleshooting(userId, text, actionData, attributes) {
    const action = actionData?.action;
    const issueType = attributes?.issueType;

    if (action === 'troubleshoot_resolved') {
      // Issue fixed by troubleshooting steps - no ticket needed
      return {
        cards: [
          this.templateService.getTextCard('Issue Resolved', ''),
          this.templateService.getTextCard(
            '✅ Great! Issue Resolved',
            'Glad the troubleshooting steps helped. If the issue returns, feel free to submit a ticket.'
          ),
          this.templateService.getMainMenuCard()
        ],
        newDialogState: 'MAIN_MENU'
      };
    }

    if (action === 'troubleshoot_failed') {
      // Troubleshooting didn't help - proceed to ticket submission
      return {
        cards: [
          this.templateService.getTextCard('Troubleshooting Didn\'t Help', ''),
          this.templateService.getDescriptionInputCard(issueType)
        ],
        newDialogState: 'COLLECT_DESCRIPTION',
        attributes: { issueType }
      };
    }

    if (action === 'back_to_menu') {
      return {
        cards: [
          this.templateService.getTextCard('Back to Menu', ''),
          this.templateService.getMainMenuCard()
        ],
        newDialogState: 'MAIN_MENU'
      };
    }

    // Re-show troubleshooting card for any unexpected input
    const steps = this.config.troubleshootingSteps?.[issueType] || [];
    return {
      cards: [this.templateService.getTroubleshootingCard(issueType, steps)],
      newDialogState: 'TROUBLESHOOTING'
    };
  }

  // ==================== COLLECT DESCRIPTION ====================
  async _handleCollectDescription(userId, text, actionData, attributes) {
    const action = actionData?.action;
    const issueType = attributes?.issueType;

    // Handle back to menu button
    if (action === 'back_to_menu') {
      return {
        cards: [
          this.templateService.getTextCard('Back to Menu', ''),
          this.templateService.getMainMenuCard()
        ],
        newDialogState: 'MAIN_MENU'
      };
    }

    const description = text?.trim();

    if (!description || description.length < 5) {
      return {
        cards: [
          this.templateService.getErrorCard(
            'Description Too Short',
            'Please provide at least 5 characters describing your issue.'
          ),
          this.templateService.getDescriptionInputCard(issueType)
        ],
        newDialogState: 'COLLECT_DESCRIPTION'
      };
    }

    // Show confirmation
    return {
      cards: [this.templateService.getConfirmTicketCard(issueType, description)],
      newDialogState: 'CONFIRM_TICKET',
      attributes: { issueType, description }
    };
  }

  // ==================== CONFIRM TICKET ====================
  async _handleConfirmTicket(userId, text, actionData, attributes) {
    const action = actionData?.action;
    const issueType = actionData?.issueType || attributes?.issueType;
    const description = actionData?.description || attributes?.description;

    if (action === 'confirm_ticket') {
      // Create the ticket
      const ticketResult = await this.itSupportService.createTicket(
        userId,
        'Teams User',
        issueType,
        description
      );

      if (ticketResult.success) {
        return {
          cards: [
            this.templateService.getTextCard('Create Ticket', ''),
            this.templateService.getTicketCreatedCard(ticketResult.data)
          ],
          newDialogState: 'TICKET_CREATED',
          attributes: { ticketData: ticketResult.data }
        };
      } else {
        return {
          cards: [
            this.templateService.getTextCard('Create Ticket', ''),
            this.templateService.getErrorCard('Failed', 'Failed to create ticket. Please try again.')
          ],
          newDialogState: 'MAIN_MENU'
        };
      }
    }

    if (action === 'edit_description') {
      return {
        cards: [
          this.templateService.getTextCard('Edit Description', ''),
          this.templateService.getDescriptionInputCard(issueType)
        ],
        newDialogState: 'COLLECT_DESCRIPTION',
        attributes: { issueType }
      };
    }

    if (action === 'back_to_menu') {
      return {
        cards: [
          this.templateService.getTextCard('Back to Menu', ''),
          this.templateService.getMainMenuCard()
        ],
        newDialogState: 'MAIN_MENU'
      };
    }

    return {
      cards: [this.templateService.getConfirmTicketCard(issueType, description)],
      newDialogState: 'CONFIRM_TICKET'
    };
  }

  // ==================== TICKET CREATED ====================
  async _handleTicketCreated(userId, text, actionData, attributes) {
    const action = actionData?.action;

    if (action === 'check_ticket_status') {
      return {
        cards: [
          this.templateService.getTextCard('Check Ticket Status', ''),
          this.templateService.getTicketIdInputCard()
        ],
        newDialogState: 'CHECK_TICKET_STATUS'
      };
    }

    if (action === 'back_to_menu') {
      return {
        cards: [
          this.templateService.getTextCard('Back to Menu', ''),
          this.templateService.getMainMenuCard()
        ],
        newDialogState: 'MAIN_MENU'
      };
    }

    return {
      cards: [this.templateService.getMainMenuCard()],
      newDialogState: 'MAIN_MENU'
    };
  }

  // ==================== CHECK TICKET STATUS ====================
  async _handleCheckTicketStatus(userId, text, actionData, attributes) {
    const ticketId = text?.trim().toUpperCase();

    if (!ticketId) {
      return {
        cards: [this.templateService.getTicketIdInputCard()],
        newDialogState: 'CHECK_TICKET_STATUS'
      };
    }

    // Validate ticket ID format
    if (!this.itSupportService.validateTicketIdFormat(ticketId)) {
      return {
        cards: [
          this.templateService.getErrorCard(
            'Invalid Format',
            'Ticket ID must be in format: IT-YYYYMMDD-XXXXXX (e.g., IT-20260219-A1B2C3)'
          ),
          this.templateService.getTicketIdInputCard()
        ],
        newDialogState: 'CHECK_TICKET_STATUS'
      };
    }

    // Fetch ticket status
    const ticketResult = await this.itSupportService.getTicketStatus(ticketId);

    if (ticketResult.success) {
      return {
        cards: [this.templateService.getTicketStatusCard(ticketResult.data)],
        newDialogState: 'SHOW_TICKET_STATUS',
        attributes: { ticketId }
      };
    } else {
      if (ticketResult.notFound) {
        return {
          cards: [
            this.templateService.getErrorCard(
              'Ticket Not Found',
              `No ticket found with ID: ${ticketId}`
            ),
            this.templateService.getTicketIdInputCard()
          ],
          newDialogState: 'CHECK_TICKET_STATUS'
        };
      } else {
        return {
          cards: [
            this.templateService.getErrorCard(
              'Failed',
              'Could not retrieve ticket status. Please try again.'
            ),
            this.templateService.getTicketIdInputCard()
          ],
          newDialogState: 'CHECK_TICKET_STATUS'
        };
      }
    }
  }

  // ==================== SHOW TICKET STATUS ====================
  async _handleShowTicketStatus(userId, text, actionData, attributes) {
    const action = actionData?.action;

    if (action === 'check_ticket_status') {
      return {
        cards: [
          this.templateService.getTextCard('Check Another Ticket', ''),
          this.templateService.getTicketIdInputCard()
        ],
        newDialogState: 'CHECK_TICKET_STATUS'
      };
    }

    if (action === 'back_to_menu') {
      return {
        cards: [
          this.templateService.getTextCard('Back to Menu', ''),
          this.templateService.getMainMenuCard()
        ],
        newDialogState: 'MAIN_MENU'
      };
    }

    return {
      cards: [this.templateService.getMainMenuCard()],
      newDialogState: 'MAIN_MENU'
    };
  }

  // ==================== LIVE CHAT ====================
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

      // ✅ NEW: Forward entire message object to agent (including attachments)
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
}

module.exports = DialogManager;
