const logger = require('../../../common/utils/logger');

class DialogManager {
  constructor(sessionService, salesforceService, templateService, liveChatService, config) {
    this.sessionService = sessionService;
    this.salesforceService = salesforceService;
    this.templateService = templateService;
    this.liveChatService = liveChatService;
    this.config = config;
    logger.info('DialogManager initialized for IT Support bot (Salesforce integration)');
  }

  /**
   * Main entry point - process message based on current dialog state
   */
  async processMessage(userId, dialogState, text, actionData, attributes, displayName) {
    try {
      logger.debug(`Processing message in state ${dialogState}, text: "${text}", displayName: "${displayName}"`);

      let result;
      switch (dialogState) {
        case 'MAIN_MENU':
          result = await this._handleMainMenu(userId, text, actionData, attributes, displayName);
          break;
        case 'SELECT_ISSUE_TYPE':
          result = await this._handleSelectIssueType(userId, text, actionData, attributes, displayName);
          break;
        case 'TROUBLESHOOTING':
          result = await this._handleTroubleshooting(userId, text, actionData, attributes, displayName);
          break;
        case 'COLLECT_MOBILE':
          result = await this._handleCollectMobile(userId, text, actionData, attributes, displayName);
          break;
        case 'SHOW_EXISTING_CASES':
          result = await this._handleShowExistingCases(userId, text, actionData, attributes, displayName);
          break;
        case 'COLLECT_DESCRIPTION':
          result = await this._handleCollectDescription(userId, text, actionData, attributes, displayName);
          break;
        case 'CONFIRM_TICKET':
          result = await this._handleConfirmTicket(userId, text, actionData, attributes, displayName);
          break;
        case 'TICKET_CREATED':
          result = await this._handleTicketCreated(userId, text, actionData, attributes, displayName);
          break;
        case 'CHECK_TICKET_STATUS':
          result = await this._handleCheckTicketStatus(userId, text, actionData, attributes, displayName);
          break;
        case 'COLLECT_MOBILE_STATUS':
          result = await this._handleCollectMobileStatus(userId, text, actionData, attributes, displayName);
          break;
        case 'SHOW_TICKET_STATUS':
          result = await this._handleShowTicketStatus(userId, text, actionData, attributes, displayName);
          break;
        case 'COLLECT_MOBILE_LIVECHAT':
          result = await this._handleCollectMobileLiveChat(userId, text, actionData, attributes, displayName);
          break;
        case 'LIVE_CHAT_ACTIVE':
          result = await this._handleLiveChat(userId, text, actionData, attributes, displayName);
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
  async _handleMainMenu(userId, text, actionData, attributes, displayName = 'Teams User') {
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
              this.templateService.getTextCard(issueLabel, ''),
              this.templateService.getTroubleshootingCard(issueType, steps)
            ],
            newDialogState: 'TROUBLESHOOTING',
            attributes: { issueType }
          };
        }
        // agent_connectivity - ask for mobile number first
        return {
          cards: [
            this.templateService.getTextCard('Agent Connectivity Issue', ''),
            this.templateService.getMobileInputCard('ticket')
          ],
          newDialogState: 'COLLECT_MOBILE',
          attributes: { issueType }
        };

      case 'check_ticket_status':
        // Show options: by case number or by mobile
        return {
          cards: [this.templateService.getCheckStatusOptionsCard()],
          newDialogState: 'CHECK_TICKET_STATUS'
        };

      case 'live_chat':
        // Ask for mobile number before connecting to agent
        return {
          cards: [
            this.templateService.getTextCard('Live Chat', ''),
            this.templateService.getMobileInputCard('livechat')
          ],
          newDialogState: 'COLLECT_MOBILE_LIVECHAT'
        };

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
  async _handleSelectIssueType(userId, text, actionData, attributes, displayName = 'Teams User') {
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

      // For agent_connectivity, ask for mobile number
      return {
        cards: [this.templateService.getMobileInputCard('ticket')],
        newDialogState: 'COLLECT_MOBILE',
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
  async _handleTroubleshooting(userId, text, actionData, attributes, displayName = 'Teams User') {
    const action = actionData?.action;
    const issueType = attributes?.issueType;

    if (action === 'troubleshoot_resolved') {
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
      // Troubleshooting didn't help - ask for mobile number before ticket submission
      return {
        cards: [
          this.templateService.getTextCard("Troubleshooting Didn't Help", ''),
          this.templateService.getMobileInputCard('ticket')
        ],
        newDialogState: 'COLLECT_MOBILE',
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

  // ==================== COLLECT MOBILE (Ticket Flow) ====================
  async _handleCollectMobile(userId, text, actionData, attributes, displayName = 'Teams User') {
    if (actionData?.action === 'back_to_menu') {
      return {
        cards: [this.templateService.getTextCard('Back to Menu', ''), this.templateService.getMainMenuCard()],
        newDialogState: 'MAIN_MENU'
      };
    }

    const mobileNumber = text?.trim();

    // Validate mobile format
    if (!mobileNumber || !this.salesforceService.validateMobileFormat(mobileNumber)) {
      return {
        cards: [
          this.templateService.getErrorCard('Invalid Mobile Number',
            'Please enter a valid mobile number (e.g., 919890903580 or +919890903580)'),
          this.templateService.getMobileInputCard('ticket')
        ],
        newDialogState: 'COLLECT_MOBILE'
      };
    }

    // Look up contact in Salesforce
    const contactResult = await this.salesforceService.getContactByMobile(mobileNumber);

    if (!contactResult.success) {
      if (contactResult.notFound) {
        // Contact not found - still allow case creation with just MobileNumber
        return {
          cards: [
            this.templateService.getTextCard('Contact Not Found',
              `No contact found for ${mobileNumber}. You can still submit a case.`),
            this.templateService.getDescriptionInputCard(attributes?.issueType)
          ],
          newDialogState: 'COLLECT_DESCRIPTION',
          attributes: { ...attributes, mobileNumber, contactId: null, accountId: null, contactName: null }
        };
      }
      // API error
      return {
        cards: [
          this.templateService.getErrorCard('Lookup Failed', 'Could not look up contact. Please try again.'),
          this.templateService.getMobileInputCard('ticket')
        ],
        newDialogState: 'COLLECT_MOBILE'
      };
    }

    // Contact found - save info and fetch existing cases
    const contact = contactResult.data;
    const newAttributes = {
      ...attributes,
      mobileNumber,
      contactId: contact.Id,
      accountId: contact.AccountId,
      contactName: contact.Name,
      contactEmail: contact.Email
    };

    const casesResult = await this.salesforceService.getCasesByContactId(contact.Id);

    if (casesResult.success && casesResult.data && casesResult.data.length > 0) {
      // Has existing cases - show them
      return {
        cards: [
          this.templateService.getContactFoundCard(contact),
          this.templateService.getExistingCasesCard(casesResult.data, contact, true)
        ],
        newDialogState: 'SHOW_EXISTING_CASES',
        attributes: { ...newAttributes, existingCases: casesResult.data }
      };
    }

    // No existing cases - go directly to description collection
    return {
      cards: [
        this.templateService.getContactFoundCard(contact),
        this.templateService.getTextCard('No Existing Cases', "No open cases found. Let's create a new one."),
        this.templateService.getDescriptionInputCard(attributes?.issueType)
      ],
      newDialogState: 'COLLECT_DESCRIPTION',
      attributes: newAttributes
    };
  }

  // ==================== SHOW EXISTING CASES ====================
  async _handleShowExistingCases(userId, text, actionData, attributes, displayName = 'Teams User') {
    const action = actionData?.action;

    if (action === 'create_new_case') {
      // User wants to create a new case despite existing ones
      return {
        cards: [this.templateService.getDescriptionInputCard(attributes?.issueType)],
        newDialogState: 'COLLECT_DESCRIPTION',
        attributes
      };
    }

    if (action === 'back_to_menu') {
      return {
        cards: [this.templateService.getTextCard('Back to Menu', ''), this.templateService.getMainMenuCard()],
        newDialogState: 'MAIN_MENU'
      };
    }

    // Re-show existing cases for unrecognized input
    const cases = attributes?.existingCases || [];
    const contact = { Name: attributes?.contactName, Email: attributes?.contactEmail };
    return {
      cards: [this.templateService.getExistingCasesCard(cases, contact, true)],
      newDialogState: 'SHOW_EXISTING_CASES'
    };
  }

  // ==================== COLLECT DESCRIPTION ====================
  async _handleCollectDescription(userId, text, actionData, attributes, displayName = 'Teams User') {
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

    // Show confirmation with contact info
    return {
      cards: [this.templateService.getConfirmTicketCard(
        issueType, description, attributes?.contactName, attributes?.mobileNumber
      )],
      newDialogState: 'CONFIRM_TICKET',
      attributes: { ...attributes, description }
    };
  }

  // ==================== CONFIRM TICKET ====================
  async _handleConfirmTicket(userId, text, actionData, attributes, displayName = 'Teams User') {
    const action = actionData?.action;
    const issueType = actionData?.issueType || attributes?.issueType;
    const description = actionData?.description || attributes?.description;

    if (action === 'confirm_ticket') {
      // Create case via Salesforce
      const subject = this.salesforceService.mapIssueToSubject(issueType);
      const priority = this.salesforceService.mapIssueToPriority(issueType);

      const caseParams = {
        Subject: subject,
        Description: description,
        Priority: priority,
        Origin: 'Web'
      };

      // Use ContactId+AccountId if available, otherwise MobileNumber
      if (attributes?.contactId && attributes?.accountId) {
        caseParams.ContactId = attributes.contactId;
        caseParams.AccountId = attributes.accountId;
      } else if (attributes?.mobileNumber) {
        caseParams.MobileNumber = attributes.mobileNumber;
      }

      const caseResult = await this.salesforceService.createCase(caseParams);

      if (caseResult.success) {
        return {
          cards: [
            this.templateService.getTextCard('Create Case', ''),
            this.templateService.getCaseCreatedCard(caseResult.data, {
              issueType,
              priority,
              contactName: attributes?.contactName || 'N/A'
            })
          ],
          newDialogState: 'TICKET_CREATED',
          attributes: { caseData: caseResult.data }
        };
      } else {
        return {
          cards: [
            this.templateService.getTextCard('Create Case', ''),
            this.templateService.getErrorCard('Failed', `Failed to create case: ${caseResult.error}`)
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
        attributes: { ...attributes, issueType }
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
      cards: [this.templateService.getConfirmTicketCard(
        issueType, description, attributes?.contactName, attributes?.mobileNumber
      )],
      newDialogState: 'CONFIRM_TICKET'
    };
  }

  // ==================== TICKET CREATED ====================
  async _handleTicketCreated(userId, text, actionData, attributes, displayName = 'Teams User') {
    const action = actionData?.action;

    if (action === 'check_ticket_status') {
      return {
        cards: [this.templateService.getCheckStatusOptionsCard()],
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
  async _handleCheckTicketStatus(userId, text, actionData, attributes, displayName = 'Teams User') {
    const action = actionData?.action;

    // Handle button actions from the options card
    if (action === 'status_by_case_number') {
      return {
        cards: [this.templateService.getTicketIdInputCard()],
        newDialogState: 'CHECK_TICKET_STATUS',
        attributes: { statusLookupMode: 'case_number' }
      };
    }

    if (action === 'status_by_mobile') {
      return {
        cards: [this.templateService.getMobileInputCard('status')],
        newDialogState: 'COLLECT_MOBILE_STATUS'
      };
    }

    if (action === 'back_to_menu') {
      return {
        cards: [this.templateService.getTextCard('Back to Menu', ''), this.templateService.getMainMenuCard()],
        newDialogState: 'MAIN_MENU'
      };
    }

    // Text input - treat as case number
    const caseNumber = text?.trim();

    if (!caseNumber) {
      return {
        cards: [this.templateService.getCheckStatusOptionsCard()],
        newDialogState: 'CHECK_TICKET_STATUS'
      };
    }

    // Validate case number format
    if (!this.salesforceService.validateCaseNumberFormat(caseNumber)) {
      return {
        cards: [
          this.templateService.getErrorCard('Invalid Format',
            'Case number must be a numeric value (e.g., 00001064)'),
          this.templateService.getTicketIdInputCard()
        ],
        newDialogState: 'CHECK_TICKET_STATUS',
        attributes: { statusLookupMode: 'case_number' }
      };
    }

    // Fetch case from Salesforce
    const caseResult = await this.salesforceService.getCaseByCaseNumber(caseNumber);

    if (caseResult.success) {
      return {
        cards: [this.templateService.getCaseStatusCard(caseResult.data)],
        newDialogState: 'SHOW_TICKET_STATUS',
        attributes: { caseNumber }
      };
    } else if (caseResult.notFound) {
      return {
        cards: [
          this.templateService.getErrorCard('Case Not Found', `No case found with number: ${caseNumber}`),
          this.templateService.getTicketIdInputCard()
        ],
        newDialogState: 'CHECK_TICKET_STATUS',
        attributes: { statusLookupMode: 'case_number' }
      };
    } else {
      return {
        cards: [
          this.templateService.getErrorCard('Failed', 'Could not retrieve case status. Please try again.'),
          this.templateService.getTicketIdInputCard()
        ],
        newDialogState: 'CHECK_TICKET_STATUS',
        attributes: { statusLookupMode: 'case_number' }
      };
    }
  }

  // ==================== COLLECT MOBILE FOR STATUS ====================
  async _handleCollectMobileStatus(userId, text, actionData, attributes, displayName = 'Teams User') {
    if (actionData?.action === 'back_to_menu') {
      return {
        cards: [this.templateService.getTextCard('Back to Menu', ''), this.templateService.getMainMenuCard()],
        newDialogState: 'MAIN_MENU'
      };
    }

    const mobileNumber = text?.trim();

    if (!mobileNumber || !this.salesforceService.validateMobileFormat(mobileNumber)) {
      return {
        cards: [
          this.templateService.getErrorCard('Invalid Mobile Number',
            'Please enter a valid mobile number (e.g., 919890903580 or +919890903580)'),
          this.templateService.getMobileInputCard('status')
        ],
        newDialogState: 'COLLECT_MOBILE_STATUS'
      };
    }

    // Look up contact first
    const contactResult = await this.salesforceService.getContactByMobile(mobileNumber);

    if (!contactResult.success) {
      if (contactResult.notFound) {
        return {
          cards: [
            this.templateService.getTextCard('No Contact Found',
              `No contact found for ${mobileNumber}. No cases to display.`),
            this.templateService.getMainMenuCard()
          ],
          newDialogState: 'MAIN_MENU'
        };
      }
      return {
        cards: [
          this.templateService.getErrorCard('Lookup Failed', 'Could not look up contact. Please try again.'),
          this.templateService.getMobileInputCard('status')
        ],
        newDialogState: 'COLLECT_MOBILE_STATUS'
      };
    }

    // Contact found - fetch their cases
    const contact = contactResult.data;
    const casesResult = await this.salesforceService.getCasesByContactId(contact.Id);

    if (casesResult.success && casesResult.data && casesResult.data.length > 0) {
      return {
        cards: [
          this.templateService.getContactFoundCard(contact),
          this.templateService.getExistingCasesCard(casesResult.data, contact, false)
        ],
        newDialogState: 'SHOW_TICKET_STATUS'
      };
    }

    return {
      cards: [
        this.templateService.getContactFoundCard(contact),
        this.templateService.getTextCard('No Cases Found', `No cases found for ${contact.Name}.`),
        this.templateService.getMainMenuCard()
      ],
      newDialogState: 'MAIN_MENU'
    };
  }

  // ==================== SHOW TICKET STATUS ====================
  async _handleShowTicketStatus(userId, text, actionData, attributes, displayName = 'Teams User') {
    const action = actionData?.action;

    if (action === 'check_ticket_status') {
      return {
        cards: [this.templateService.getCheckStatusOptionsCard()],
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

  // ==================== COLLECT MOBILE FOR LIVE CHAT ====================
  async _handleCollectMobileLiveChat(userId, text, actionData, attributes, displayName = 'Teams User') {
    if (actionData?.action === 'back_to_menu') {
      return {
        cards: [this.templateService.getTextCard('Back to Menu', ''), this.templateService.getMainMenuCard()],
        newDialogState: 'MAIN_MENU'
      };
    }

    const mobileNumber = text?.trim();

    if (!mobileNumber || !this.salesforceService.validateMobileFormat(mobileNumber)) {
      return {
        cards: [
          this.templateService.getErrorCard('Invalid Mobile Number',
            'Please enter a valid mobile number.'),
          this.templateService.getMobileInputCard('livechat')
        ],
        newDialogState: 'COLLECT_MOBILE_LIVECHAT'
      };
    }

    // Optionally look up contact for better display name
    let contactName = displayName;
    try {
      const contactResult = await this.salesforceService.getContactByMobile(mobileNumber);
      if (contactResult.success && contactResult.data?.Name) {
        contactName = contactResult.data.Name;
      }
    } catch (e) {
      // Non-critical - proceed with Teams display name
    }

    // Start live chat
    const chatResult = await this.liveChatService.startLiveChat(
      userId,
      contactName,
      `Customer initiated IT support live chat (mobile: ${mobileNumber})`
    );

    if (chatResult.success) {
      logger.info(`🟢 LIVE CHAT ACTIVE - User ${userId} (${contactName}) connected to IT support agent`);
      return {
        cards: [
          this.templateService.getTextCard('Live Chat', ''),
          this.templateService.getLiveChatStartingCard()
        ],
        newDialogState: 'LIVE_CHAT_ACTIVE',
        attributes: { mobileNumber, contactName }
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

  // ==================== LIVE CHAT ====================
  async _handleLiveChat(userId, input, actionData, attributes, displayName = 'Teams User') {
    try {
      // input is raw Teams webhook data object (text, image, pdf, video, audio)
      const rawWebhookData = input;

      // Extract text for exit keyword checking (raw webhook data has .text for text messages)
      const textContent = (typeof input === 'string') ? input : (input?.text || '');

      logger.info(`Live chat message from user ${userId}, hasText: ${!!textContent}, hasAttachments: ${!!(rawWebhookData?.attachments?.length)}`);

      // Check for exit keywords (text messages only)
      if (textContent) {
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

      // Forward raw Teams webhook data as-is to middleware
      try {
        logger.info(`Forwarding raw webhook data to agent for user ${userId}`);
        const chatResult = await this.liveChatService.sendMessage(userId, rawWebhookData, displayName);

        if (chatResult.success) {
          logger.info(`Raw webhook data sent to agent successfully`);
          return {
            cards: [],
            newDialogState: 'LIVE_CHAT_ACTIVE'
          };
        } else {
          logger.warn(`Failed to send message: ${chatResult.error}`);
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
        logger.error(`Exception forwarding webhook data to agent:`, error);
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
