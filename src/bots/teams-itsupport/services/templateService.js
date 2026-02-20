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
   * Ticket confirmation card
   */
  getConfirmTicketCard(issueType, description) {
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

    return {
      "$schema": "http://adaptivecards.io/schemas/adaptive-card.json",
      "type": "AdaptiveCard",
      "version": "1.5",
      "body": [
        {
          "type": "TextBlock",
          "text": "Confirm Your Ticket",
          "size": "large",
          "weight": "bolder"
        },
        {
          "type": "Container",
          "style": "emphasis",
          "items": [
            {
              "type": "FactSet",
              "facts": [
                { "name": "Issue Type", "value": issueLabels[issueType] },
                { "name": "Priority", "value": info.priority },
                { "name": "ETA", "value": info.eta },
                { "name": "Description", "value": description.substring(0, 50) + (description.length > 50 ? '...' : '') }
              ]
            }
          ]
        },
        {
          "type": "TextBlock",
          "text": "Is this correct? Submit to create the ticket or edit your response.",
          "wrap": true,
          "spacing": "medium",
          "size": "medium"
        }
      ],
      "actions": [
        {
          "type": "Action.Submit",
          "title": " Submit Ticket",
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
   * Ticket ID input prompt
   */
  getTicketIdInputCard() {
    return {
      "$schema": "http://adaptivecards.io/schemas/adaptive-card.json",
      "type": "AdaptiveCard",
      "version": "1.5",
      "body": [
        {
          "type": "TextBlock",
          "text": "Check Ticket Status",
          "size": "large",
          "weight": "bolder"
        },
        {
          "type": "TextBlock",
          "text": "Enter your ticket ID to check the status:",
          "wrap": true,
          "spacing": "medium",
          "size": "default"
        },
        {
          "type": "TextBlock",
          "text": "Format: IT-YYYYMMDD-XXXXXX (e.g., IT-20260219-A1B2C3)",
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
          "type": "Container",
          "style": "attention",
          "items": [
            {
              "type": "TextBlock",
              "text": ` ${title}`,
              "size": "large",
              "weight": "bolder",
              "color": "light"
            }
          ]
        },
        {
          "type": "TextBlock",
          "text": message,
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
