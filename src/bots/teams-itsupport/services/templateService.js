const logger = require('../../../common/utils/logger');

class TemplateService {
  constructor(config) {
    this.config = config;
    this.botName = config.botName;
    logger.debug(`Service initialized`);
  }

  /**
   * Welcome card - shown when bot is added to conversation
   */
  getWelcomeCard() {
    const body = [];

    // Add welcome banner image if configured
    if (this.config.welcomeImage) {
      body.push({
        "type": "Image",
        "url": this.config.welcomeImage,
        "size": "stretch",
        "altText": "IT Support Welcome Banner"
      });
    }

    // Add welcome text
    body.push(
      {
        "type": "TextBlock",
        "text": "👋 Welcome to IT Support!",
        "size": "large",
        "weight": "bolder",
        "color": "accent"
      },
      {
        "type": "TextBlock",
        "text": "I'm your IT support assistant. How can I help you today?",
        "wrap": true,
        "spacing": "medium",
        "size": "default"
      }
    );

    // Add subtitle for issue selection
    body.push({
      "type": "TextBlock",
      "text": "Select the type of issue you're experiencing, or check an existing ticket.",
      "wrap": true,
      "spacing": "medium",
      "size": "default"
    });

    return {
      "$schema": "http://adaptivecards.io/schemas/adaptive-card.json",
      "type": "AdaptiveCard",
      "version": "1.5",
      "body": body,
      "actions": [
        {
          "type": "Action.Submit",
          "title": "🌐 Network Issue",
          "data": { "action": "issue_type_selected", "issueType": "network" }
        },
        {
          "type": "Action.Submit",
          "title": "📡 Broadband Issue",
          "data": { "action": "issue_type_selected", "issueType": "broadband" }
        },
        {
          "type": "Action.Submit",
          "title": "⚠️ Agent Connectivity Issue",
          "data": { "action": "issue_type_selected", "issueType": "agent_connectivity" }
        },
        {
          "type": "Action.Submit",
          "title": "🔍 Check Ticket Status",
          "data": { "action": "check_ticket_status" }
        },
        {
          "type": "Action.Submit",
          "title": "💬 Live Chat",
          "data": { "action": "live_chat" }
        },
        {
          "type": "Action.Submit",
          "title": "❌ End Session",
          "data": { "action": "end_session" }
        }
      ]
    };
  }

  /**
   * Main menu card
   */
  getMainMenuCard() {
    return this.getWelcomeCard();
  }

  /**
   * Issue type selection card with priorities
   */
  getIssueTypeCard() {
    return {
      "$schema": "http://adaptivecards.io/schemas/adaptive-card.json",
      "type": "AdaptiveCard",
      "version": "1.5",
      "body": [
        {
          "type": "TextBlock",
          "text": "Select Issue Type",
          "size": "large",
          "weight": "bolder"
        },
        {
          "type": "TextBlock",
          "text": "Choose the type of issue you're experiencing:",
          "wrap": true,
          "spacing": "medium",
          "size": "default"
        },
        {
          "type": "FactSet",
          "facts": [
            { "name": "Network Issue", "value": "MEDIUM Priority • 4 hours ETA" },
            { "name": "Broadband Issue", "value": "HIGH Priority • 2 hours ETA" },
            { "name": "Agent Connectivity", "value": "CRITICAL Priority • 30 min ETA" }
          ],
          "spacing": "medium"
        }
      ],
      "actions": [
        {
          "type": "Action.Submit",
          "title": "🌐 Network Issue",
          "data": { "action": "issue_type_selected", "issueType": "network" }
        },
        {
          "type": "Action.Submit",
          "title": "📡 Broadband Issue",
          "data": { "action": "issue_type_selected", "issueType": "broadband" }
        },
        {
          "type": "Action.Submit",
          "title": "⚠️ Agent Connectivity",
          "data": { "action": "issue_type_selected", "issueType": "agent_connectivity" }
        },
        {
          "type": "Action.Submit",
          "title": "⬅️ Back to Menu",
          "data": { "action": "back_to_menu" }
        }
      ]
    };
  }

  /**
   * Troubleshooting steps card (for network and broadband issues)
   */
  getTroubleshootingCard(issueType, steps) {
    const issueLabels = {
      'network': 'Network Issue',
      'broadband': 'Broadband Issue'
    };

    const stepsItems = steps.map((step, index) => ({
      "name": `Step ${index + 1}`,
      "value": step
    }));

    return {
      "$schema": "http://adaptivecards.io/schemas/adaptive-card.json",
      "type": "AdaptiveCard",
      "version": "1.5",
      "body": [
        {
          "type": "TextBlock",
          "text": "🔧 Let's Troubleshoot First",
          "size": "large",
          "weight": "bolder"
        },
        {
          "type": "TextBlock",
          "text": `Before we submit a ticket, let's try these quick steps to resolve your ${issueLabels[issueType]}.`,
          "wrap": true,
          "spacing": "medium",
          "size": "default"
        },
        {
          "type": "FactSet",
          "facts": stepsItems,
          "spacing": "medium"
        },
        {
          "type": "TextBlock",
          "text": "Did these steps resolve your issue?",
          "wrap": true,
          "spacing": "medium",
          "size": "medium",
          "weight": "bolder"
        }
      ],
      "actions": [
        {
          "type": "Action.Submit",
          "title": "✅ Issue Resolved",
          "data": { "action": "troubleshoot_resolved", "issueType": issueType }
        },
        {
          "type": "Action.Submit",
          "title": "❌ Still Not Resolved - Submit Ticket",
          "data": { "action": "troubleshoot_failed", "issueType": issueType }
        },
        {
          "type": "Action.Submit",
          "title": "⬅️ Back to Menu",
          "data": { "action": "back_to_menu" }
        }
      ]
    };
  }

  /**
   * Description input prompt
   */
  getDescriptionInputCard(issueType) {
    const issueLabels = {
      'network': 'Network Issue',
      'broadband': 'Broadband Issue',
      'agent_connectivity': 'Agent Connectivity Issue'
    };

    return {
      "$schema": "http://adaptivecards.io/schemas/adaptive-card.json",
      "type": "AdaptiveCard",
      "version": "1.5",
      "body": [
        {
          "type": "TextBlock",
          "text": "Describe Your Issue",
          "size": "large",
          "weight": "bolder"
        },
        {
          "type": "TextBlock",
          "text": `Issue Type: ${issueLabels[issueType]}`,
          "spacing": "small",
          "size": "default",
          "color": "accent"
        },
        {
          "type": "TextBlock",
          "text": "Please describe the issue in detail (at least 5 characters)",
          "wrap": true,
          "spacing": "medium",
          "size": "default"
        },
        {
          "type": "TextBlock",
          "text": "💡 Tip: Include what you were doing when the issue occurred",
          "wrap": true,
          "spacing": "small",
          "size": "medium",
          "color": "light",
          "isSubtle": true
        }
      ]
    };
  }

  /**
   * Ticket confirmation card (with contact info from Salesforce)
   */
  getConfirmTicketCard(issueType, description, contactName, mobileNumber) {
    const issueLabels = {
      'network': 'Network Issue',
      'broadband': 'Broadband Issue',
      'agent_connectivity': 'Agent Connectivity Issue'
    };

    const priorityInfo = {
      'network': { priority: 'MEDIUM', eta: '4 hours' },
      'broadband': { priority: 'HIGH', eta: '2 hours' },
      'agent_connectivity': { priority: 'CRITICAL', eta: '30 minutes' }
    };

    const info = priorityInfo[issueType];

    const items = [
      { label: "Issue Type", value: issueLabels[issueType] || issueType },
      { label: "Priority", value: info?.priority || 'MEDIUM' },
      { label: "ETA", value: info?.eta || 'TBD' }
    ];

    if (contactName) {
      items.push({ label: "Contact", value: contactName });
    }
    if (mobileNumber) {
      items.push({ label: "Mobile", value: mobileNumber });
    }

    items.push({
      label: "Description",
      value: description.substring(0, 50) + (description.length > 50 ? '...' : '')
    });

    return {
      "$schema": "http://adaptivecards.io/schemas/adaptive-card.json",
      "type": "AdaptiveCard",
      "version": "1.5",
      "body": [
        {
          "type": "TextBlock",
          "text": "Confirm Your Case",
          "size": "large",
          "weight": "bolder"
        },
        {
          "type": "Container",
          "style": "emphasis",
          "items": items.map(item => ({
            "type": "TextBlock",
            "text": `**${item.label}:** ${item.value}`,
            "wrap": true,
            "spacing": "small"
          }))
        },
        {
          "type": "TextBlock",
          "text": "Is this correct? Submit to create the case or edit your response.",
          "wrap": true,
          "spacing": "medium",
          "size": "medium"
        }
      ],
      "actions": [
        {
          "type": "Action.Submit",
          "title": "Submit Case",
          "data": { "action": "confirm_ticket", "issueType": issueType, "description": description }
        },
        {
          "type": "Action.Submit",
          "title": "✏️ Edit Description",
          "data": { "action": "edit_description", "issueType": issueType }
        },
        {
          "type": "Action.Submit",
          "title": "↩️ Back to Menu",
          "data": { "action": "back_to_menu" }
        }
      ]
    };
  }

  /**
   * Ticket created success card
   */
  getTicketCreatedCard(data) {
    if (!data || !data.ticketId) {
      return this.getErrorCard('Error', 'Failed to create ticket');
    }

    return {
      "$schema": "http://adaptivecards.io/schemas/adaptive-card.json",
      "type": "AdaptiveCard",
      "version": "1.5",
      "body": [
        {
          "type": "Container",
          "style": "good",
          "items": [
            {
              "type": "TextBlock",
              "text": " Ticket Created Successfully",
              "size": "large",
              "weight": "bolder",
              "color": "light"
            }
          ]
        },
        {
          "type": "TextBlock",
          "text": "Your support ticket has been created. Our team will contact you soon.",
          "wrap": true,
          "spacing": "medium"
        },
        {
          "type": "FactSet",
          "facts": [
            { "name": "Ticket ID", "value": data.ticketId },
            { "name": "Priority", "value": data.priority },
            { "name": "ETA", "value": data.etaLabel },
            { "name": "Status", "value": data.status }
          ],
          "spacing": "medium"
        },
        {
          "type": "TextBlock",
          "text": "📌 Save your ticket ID for reference",
          "wrap": true,
          "spacing": "medium",
          "size": "medium",
          "color": "accent"
        }
      ],
      "actions": [
        {
          "type": "Action.Submit",
          "title": "🔍 Check Another Ticket",
          "data": { "action": "check_ticket_status" }
        },
        {
          "type": "Action.Submit",
          "title": "📋 Back to Menu",
          "data": { "action": "back_to_menu" }
        }
      ]
    };
  }

  /**
   * Case number input prompt (Salesforce format)
   */
  getTicketIdInputCard() {
    return {
      "$schema": "http://adaptivecards.io/schemas/adaptive-card.json",
      "type": "AdaptiveCard",
      "version": "1.5",
      "body": [
        {
          "type": "TextBlock",
          "text": "Check Case Status",
          "size": "large",
          "weight": "bolder"
        },
        {
          "type": "TextBlock",
          "text": "Enter your case number or case ID to check the status:",
          "wrap": true,
          "spacing": "medium",
          "size": "default"
        },
        {
          "type": "TextBlock",
          "text": "Format: e.g., 00001064 or 500gK00000gJxNZQA0",
          "wrap": true,
          "spacing": "small",
          "size": "medium",
          "color": "light",
          "isSubtle": true
        }
      ]
    };
  }

  /**
   * Ticket status display card
   */
  getTicketStatusCard(data) {
    if (!data || !data.ticketId) {
      return this.getErrorCard('Error', 'Unable to display ticket status');
    }

    return {
      "$schema": "http://adaptivecards.io/schemas/adaptive-card.json",
      "type": "AdaptiveCard",
      "version": "1.5",
      "body": [
        {
          "type": "TextBlock",
          "text": "Ticket Status",
          "size": "large",
          "weight": "bolder"
        },
        {
          "type": "FactSet",
          "facts": [
            { "name": "Ticket ID", "value": data.ticketId },
            { "name": "Issue Type", "value": data.issueType },
            { "name": "Priority", "value": data.priority },
            { "name": "Status", "value": data.status },
            { "name": "ETA", "value": data.etaLabel },
            { "name": "Created", "value": new Date(data.createdAt).toLocaleDateString() }
          ],
          "spacing": "medium"
        },
        ...(data.assignedTo ? [{
          "type": "TextBlock",
          "text": `Assigned to: ${data.assignedTo}`,
          "spacing": "medium",
          "size": "medium",
          "color": "accent"
        }] : []),
        ...(data.resolution ? [{
          "type": "TextBlock",
          "text": `Resolution: ${data.resolution}`,
          "wrap": true,
          "spacing": "medium",
          "size": "medium"
        }] : [])
      ],
      "actions": [
        {
          "type": "Action.Submit",
          "title": "🔍 Check Another Ticket",
          "data": { "action": "check_ticket_status" }
        },
        {
          "type": "Action.Submit",
          "title": "📋 Back to Menu",
          "data": { "action": "back_to_menu" }
        }
      ]
    };
  }

  /**
   * Live chat starting card
   */
  getLiveChatStartingCard() {
    return {
      "$schema": "http://adaptivecards.io/schemas/adaptive-card.json",
      "type": "AdaptiveCard",
      "version": "1.5",
      "body": [
        {
          "type": "Container",
          "style": "emphasis",
          "items": [
            {
              "type": "TextBlock",
              "text": "💬 Connecting to Live Chat...",
              "size": "large",
              "weight": "bolder"
            }
          ]
        },
        {
          "type": "TextBlock",
          "text": "Please wait while we connect you to an IT support agent.",
          "wrap": true,
          "spacing": "medium"
        },
        {
          "type": "TextBlock",
          "text": "Average wait time: 2-5 minutes",
          "wrap": true,
          "spacing": "small",
          "size": "medium",
          "color": "light"
        }
      ]
    };
  }

  /**
   * Live chat ended card
   */
  getLiveChatEndedCard() {
    return {
      "$schema": "http://adaptivecards.io/schemas/adaptive-card.json",
      "type": "AdaptiveCard",
      "version": "1.5",
      "body": [
        {
          "type": "TextBlock",
          "text": "👋 Live Chat Ended",
          "size": "large",
          "weight": "bolder"
        },
        {
          "type": "TextBlock",
          "text": "Thank you for chatting with our IT support team. Is there anything else we can help you with?",
          "wrap": true,
          "spacing": "medium"
        }
      ],
      "actions": [
        {
          "type": "Action.Submit",
          "title": "📋 Back to Menu",
          "data": { "action": "back_to_menu" }
        }
      ]
    };
  }

  // ==================== SALESFORCE INTEGRATION CARDS ====================

  /**
   * Mobile number input card
   * @param {string} context - 'ticket' | 'livechat' | 'status'
   */
  getMobileInputCard(context = 'ticket') {
    const subtitles = {
      'ticket': "We'll look up your contact information and existing cases.",
      'livechat': "We need your contact number before connecting you to an agent.",
      'status': "We'll find all cases associated with your number."
    };

    return {
      "$schema": "http://adaptivecards.io/schemas/adaptive-card.json",
      "type": "AdaptiveCard",
      "version": "1.5",
      "body": [
        {
          "type": "TextBlock",
          "text": "📱 Enter Your Mobile Number",
          "size": "large",
          "weight": "bolder"
        },
        {
          "type": "TextBlock",
          "text": subtitles[context] || subtitles['ticket'],
          "wrap": true,
          "spacing": "medium",
          "size": "default"
        },
        {
          "type": "TextBlock",
          "text": "Please type your mobile number (e.g., 919890903580)",
          "wrap": true,
          "spacing": "medium",
          "size": "default",
          "color": "accent"
        }
      ],
      "actions": [
        {
          "type": "Action.Submit",
          "title": "⬅️ Back to Menu",
          "data": { "action": "back_to_menu" }
        }
      ]
    };
  }

  /**
   * Contact not found card - asks user to re-enter mobile or go back
   */
  getContactNotFoundCard(mobileNumber) {
    return {
      "$schema": "http://adaptivecards.io/schemas/adaptive-card.json",
      "type": "AdaptiveCard",
      "version": "1.5",
      "body": [
        {
          "type": "Container",
          "style": "attention",
          "items": [
            {
              "type": "TextBlock",
              "text": "Contact Not Found",
              "size": "medium",
              "weight": "bolder",
              "color": "dark"
            }
          ]
        },
        {
          "type": "TextBlock",
          "text": `No contact found for **${mobileNumber}** in our system.`,
          "wrap": true,
          "spacing": "medium",
          "size": "default"
        },
        {
          "type": "TextBlock",
          "text": "A valid contact is required to submit a case. Please check your number and try again, or contact your administrator.",
          "wrap": true,
          "spacing": "small",
          "size": "default"
        },
        {
          "type": "TextBlock",
          "text": "Please type a different mobile number or go back to the menu.",
          "wrap": true,
          "spacing": "medium",
          "size": "default",
          "color": "accent"
        }
      ],
      "actions": [
        {
          "type": "Action.Submit",
          "title": "⬅️ Back to Menu",
          "data": { "action": "back_to_menu" }
        }
      ]
    };
  }

  /**
   * Contact found display card
   */
  getContactFoundCard(contact) {
    const items = [
      { label: "Name", value: contact.Name || 'N/A' }
    ];
    if (contact.Email) {
      items.push({ label: "Email", value: contact.Email });
    }
    if (contact.MobilePhone) {
      items.push({ label: "Mobile", value: contact.MobilePhone });
    }

    return {
      "$schema": "http://adaptivecards.io/schemas/adaptive-card.json",
      "type": "AdaptiveCard",
      "version": "1.5",
      "body": [
        {
          "type": "Container",
          "style": "good",
          "items": [
            {
              "type": "TextBlock",
              "text": "Contact Found",
              "size": "medium",
              "weight": "bolder",
              "color": "dark"
            }
          ]
        },
        ...items.map(item => ({
          "type": "TextBlock",
          "text": `**${item.label}:** ${item.value}`,
          "wrap": true,
          "spacing": "small"
        }))
      ]
    };
  }

  /**
   * Existing cases list card
   * @param {Array} cases - Salesforce case objects
   * @param {object} contact - { Name, Email }
   * @param {boolean} showCreateButton - show "Create New Case" button (false for status-only lookup)
   */
  getExistingCasesCard(cases, contact, showCreateButton = true) {
    const body = [
      {
        "type": "TextBlock",
        "text": `Existing Cases for ${contact?.Name || 'Contact'}`,
        "size": "large",
        "weight": "bolder"
      },
      {
        "type": "TextBlock",
        "text": `Found ${cases.length} case(s):`,
        "spacing": "medium",
        "size": "default"
      }
    ];

    // Show up to 5 most recent cases
    const recentCases = cases.slice(0, 5);
    recentCases.forEach((c, index) => {
      if (index > 0) {
        body.push({ "type": "TextBlock", "text": "---", "spacing": "small" });
      }
      body.push({
        "type": "Container",
        "style": "emphasis",
        "items": [
          {
            "type": "TextBlock",
            "text": `**Case #:** ${c.CaseNumber || 'N/A'}`,
            "wrap": true,
            "spacing": "small"
          },
          {
            "type": "TextBlock",
            "text": `**Subject:** ${c.Subject || 'N/A'}`,
            "wrap": true,
            "spacing": "small"
          },
          {
            "type": "TextBlock",
            "text": `**Status:** ${c.Status || 'N/A'}`,
            "wrap": true,
            "spacing": "small"
          },
          {
            "type": "TextBlock",
            "text": `**Priority:** ${c.Priority || 'N/A'}`,
            "wrap": true,
            "spacing": "small"
          }
        ]
      });
    });

    if (cases.length > 5) {
      body.push({
        "type": "TextBlock",
        "text": `... and ${cases.length - 5} more case(s)`,
        "spacing": "small",
        "isSubtle": true
      });
    }

    const actions = [];
    if (showCreateButton) {
      actions.push({
        "type": "Action.Submit",
        "title": "Create New Case",
        "data": { "action": "create_new_case" }
      });
    }
    actions.push({
      "type": "Action.Submit",
      "title": "📋 Back to Menu",
      "data": { "action": "back_to_menu" }
    });

    return {
      "$schema": "http://adaptivecards.io/schemas/adaptive-card.json",
      "type": "AdaptiveCard",
      "version": "1.5",
      "body": body,
      "actions": actions
    };
  }

  /**
   * Case created success card (Salesforce)
   */
  getCaseCreatedCard(caseData, details = {}) {
    if (!caseData || !caseData.Id) {
      return this.getErrorCard('Error', 'Failed to create case');
    }

    const items = [];
    if (caseData.CaseNumber) {
      items.push({ label: "Case Number", value: caseData.CaseNumber });
    }
    items.push({ label: "Case ID", value: caseData.Id });
    if (details.issueType) {
      const issueLabels = {
        'network': 'Network Issue',
        'broadband': 'Broadband Issue',
        'agent_connectivity': 'Agent Connectivity Issue'
      };
      items.push({ label: "Issue Type", value: issueLabels[details.issueType] || details.issueType });
    }
    if (details.priority) {
      items.push({ label: "Priority", value: details.priority });
    }
    if (details.contactName) {
      items.push({ label: "Contact", value: details.contactName });
    }

    return {
      "$schema": "http://adaptivecards.io/schemas/adaptive-card.json",
      "type": "AdaptiveCard",
      "version": "1.5",
      "body": [
        {
          "type": "Container",
          "style": "good",
          "items": [
            {
              "type": "TextBlock",
              "text": "Case Created Successfully",
              "size": "large",
              "weight": "bolder",
              "color": "light"
            }
          ]
        },
        {
          "type": "TextBlock",
          "text": "Your support case has been logged in Salesforce. Our team will contact you soon.",
          "wrap": true,
          "spacing": "medium"
        },
        ...items.map(item => ({
          "type": "TextBlock",
          "text": `**${item.label}:** ${item.value}`,
          "wrap": true,
          "spacing": "small"
        })),
        {
          "type": "TextBlock",
          "text": "📌 Save your Case ID for reference",
          "wrap": true,
          "spacing": "medium",
          "size": "medium",
          "color": "accent"
        }
      ],
      "actions": [
        {
          "type": "Action.Submit",
          "title": "🔍 Check Case Status",
          "data": { "action": "check_ticket_status" }
        },
        {
          "type": "Action.Submit",
          "title": "📋 Back to Menu",
          "data": { "action": "back_to_menu" }
        }
      ]
    };
  }

  /**
   * Case status display card (Salesforce)
   */
  getCaseStatusCard(caseData) {
    if (!caseData) {
      return this.getErrorCard('Error', 'Unable to display case status');
    }

    const items = [
      { label: "Case #", value: caseData.CaseNumber || 'N/A' },
      { label: "Subject", value: caseData.Subject || 'N/A' },
      { label: "Status", value: caseData.Status || 'N/A' },
      { label: "Priority", value: caseData.Priority || 'N/A' },
      { label: "Origin", value: caseData.Origin || 'N/A' }
    ];

    if (caseData.CreatedDate) {
      items.push({ label: "Created", value: new Date(caseData.CreatedDate).toLocaleDateString() });
    }

    if (caseData.Description) {
      const desc = caseData.Description.substring(0, 200) + (caseData.Description.length > 200 ? '...' : '');
      items.push({ label: "Description", value: desc });
    }

    const body = [
      {
        "type": "TextBlock",
        "text": "Case Status",
        "size": "large",
        "weight": "bolder"
      },
      ...items.map(item => ({
        "type": "TextBlock",
        "text": `**${item.label}:** ${item.value}`,
        "wrap": true,
        "spacing": "small"
      }))
    ];

    return {
      "$schema": "http://adaptivecards.io/schemas/adaptive-card.json",
      "type": "AdaptiveCard",
      "version": "1.5",
      "body": body,
      "actions": [
        {
          "type": "Action.Submit",
          "title": "🔍 Check Another Case",
          "data": { "action": "check_ticket_status" }
        },
        {
          "type": "Action.Submit",
          "title": "📋 Back to Menu",
          "data": { "action": "back_to_menu" }
        }
      ]
    };
  }

  /**
   * Check status options card (by case number or by mobile)
   */
  getCheckStatusOptionsCard() {
    return {
      "$schema": "http://adaptivecards.io/schemas/adaptive-card.json",
      "type": "AdaptiveCard",
      "version": "1.5",
      "body": [
        {
          "type": "TextBlock",
          "text": "🔍 Check Case Status",
          "size": "large",
          "weight": "bolder"
        },
        {
          "type": "TextBlock",
          "text": "How would you like to look up your case?",
          "wrap": true,
          "spacing": "medium",
          "size": "default"
        }
      ],
      "actions": [
        {
          "type": "Action.Submit",
          "title": "🔢 By Case Number",
          "data": { "action": "status_by_case_number" }
        },
        {
          "type": "Action.Submit",
          "title": "📱 By Mobile Number",
          "data": { "action": "status_by_mobile" }
        },
        {
          "type": "Action.Submit",
          "title": "⬅️ Back to Menu",
          "data": { "action": "back_to_menu" }
        }
      ]
    };
  }

  /**
   * Error card
   */
  getErrorCard(title, message) {
    return {
      "$schema": "http://adaptivecards.io/schemas/adaptive-card.json",
      "type": "AdaptiveCard",
      "version": "1.5",
      "body": [
        {
          "type": "TextBlock",
          "text": `⚠️ ${title}`,
          "size": "large",
          "weight": "bolder",
          "color": "attention"
        },
        {
          "type": "TextBlock",
          "text": message,
          "wrap": true,
          "spacing": "medium",
          "size": "default",
          "color": "dark"
        }
      ],
      "actions": [
        {
          "type": "Action.Submit",
          "title": "📋 Back to Menu",
          "data": { "action": "back_to_menu" }
        }
      ]
    };
  }

  /**
   * Simple text card
   */
  getTextCard(title, message) {
    return {
      "$schema": "http://adaptivecards.io/schemas/adaptive-card.json",
      "type": "AdaptiveCard",
      "version": "1.5",
      "body": [
        {
          "type": "TextBlock",
          "text": title,
          "size": "large",
          "weight": "bolder"
        },
        {
          "type": "TextBlock",
          "text": message,
          "wrap": true,
          "spacing": "medium"
        }
      ]
    };
  }
}

module.exports = TemplateService;
