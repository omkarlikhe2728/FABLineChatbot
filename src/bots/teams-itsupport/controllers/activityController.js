const logger = require("../../../common/utils/logger");

class ActivityController {
  constructor(teamsService, sessionService, dialogManager, templateService) {
    this.teamsService = teamsService;
    this.sessionService = sessionService;
    this.dialogManager = dialogManager;
    this.templateService = templateService;
  }

  async processActivity(activity, req, res, context) {
    try {
      // Log full webhook data for debugging
      console.log("TEAMS_WEBHOOK_DATA=", JSON.stringify(req.body));

      // 🔧 FIX: Sanitize incoming Service URL - Remove tenant ID if present
      // Microsoft Teams sometimes appends tenant ID to the service URL, which breaks Bot Framework API calls
      // Official format should be: https://smba.trafficmanager.net/{region}/ (e.g., /in/, /amer/, /emea/)
      // Not: https://smba.trafficmanager.net/{region}/{tenantId}/
      if (activity.serviceUrl) {
        const cleanedMatch = activity.serviceUrl.match(
          /^(https:\/\/smba\.trafficmanager\.net\/[a-z]+\/)/,
        );
        if (cleanedMatch) {
          const cleanedUrl = cleanedMatch[1];
          if (cleanedUrl !== activity.serviceUrl) {
            logger.warn(
              `⚠️  Service URL contains extra components. Sanitizing...`,
            );
            logger.warn(`   Original: ${activity.serviceUrl}`);
            logger.warn(`   Cleaned:  ${cleanedUrl}`);
            activity.serviceUrl = cleanedUrl;
            logger.debug(` Service URL sanitized successfully`);
          }
        }
      }

      logger.debug(
        `Processing activity type: ${activity.type} from userId: ${activity.from?.id}`,
      );

      // Also sanitize the context's activity service URL (BotFrameworkAdapter may use this)
      if (context?.activity?.serviceUrl) {
        const contextMatch = context.activity.serviceUrl.match(
          /^(https:\/\/smba\.trafficmanager\.net\/[a-z]+\/)/,
        );
        if (contextMatch) {
          const contextCleanedUrl = contextMatch[1];
          if (contextCleanedUrl !== context.activity.serviceUrl) {
            logger.debug(`Also sanitizing context.activity.serviceUrl`);
            context.activity.serviceUrl = contextCleanedUrl;
          }
        }
      }

      // Store context and raw webhook data for use in handlers
      this.context = context;
      this.rawWebhookData = req.body;

      switch (activity.type) {
        case "message":
          await this.handleMessage(activity);
          break;
        case "conversationUpdate":
          await this.handleConversationUpdate(activity);
          break;
        case "invoke":
          await this.handleInvoke(activity);
          break;
        default:
          logger.debug(`Unhandled activity type: ${activity.type}`);
      }

      res.status(200).json({ ok: true });
    } catch (error) {
      logger.error("Error processing activity", error);
      res.status(500).json({ error: error.message });
    }
  }

  async handleMessage(activity) {
    try {
      const userId = activity.from.id;
      const displayName = activity.from.name || "Teams User"; // Get real user name from Teams
      const text = activity.text?.trim() || "";
      const actionData = activity.value; // Adaptive Card action data

      // ✅ NEW: Extract attachments from Teams message
      const attachments = activity.attachments || [];

      logger.info(
        `📨 Message from ${userId} (${displayName}): ${text.substring(0, 50)}`,
      );
      logger.debug(
        `📦 Context available: ${!!this.context}, Service URL: ${this.context?.activity?.serviceUrl}`,
      );
      logger.debug(`📎 Attachments: ${attachments.length}`);

      // Get or create session
      let session = this.sessionService.getSession(userId);
      if (!session) {
        session = this.sessionService.createSession(userId);
        logger.info(`Created new session for ${userId}`);
      }

      // Update conversation reference for proactive messages
      this.sessionService.updateConversationReference(userId, activity);

      const { dialogState, attributes } = session;

      // When in LIVE_CHAT_ACTIVE, forward raw Teams webhook data as-is to middleware
      if (dialogState === "LIVE_CHAT_ACTIVE") {
        logger.info(
          `🟢 LIVE_CHAT_ACTIVE - forwarding raw webhook data to middleware`,
        );

        // Pass raw Teams webhook data object directly (text, image, pdf, video, audio)
        const result = await this.dialogManager.processMessage(
          userId,
          dialogState,
          this.rawWebhookData, // Raw Teams webhook data as-is
          actionData,
          attributes,
          displayName,
        );

        // Send response cards (e.g. live chat ended card)
        if (result.cards && result.cards.length > 0) {
          for (const card of result.cards) {
            await this.teamsService.sendAdaptiveCard(
              activity,
              card,
              this.context,
            );
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
          attributes,
          displayName, // ✅ Pass real user name from Teams
        );

        // Send response cards
        if (result.cards && result.cards.length > 0) {
          for (const card of result.cards) {
            await this.teamsService.sendAdaptiveCard(
              activity,
              card,
              this.context,
            );
          }
          logger.debug(`Sent ${result.cards.length} cards to ${userId}`);
        }

        // Update session state
        if (result.newDialogState) {
          this.sessionService.updateDialogState(userId, result.newDialogState);
          logger.debug(
            `Updated dialog state to ${result.newDialogState} for ${userId}`,
          );
        }

        if (result.attributes) {
          this.sessionService.updateAttributes(userId, result.attributes);
        }
      }
    } catch (error) {
      logger.error("Error in handleMessage", error);
      // Send error response to user
      await this.teamsService.sendAdaptiveCard(
        activity,
        this.templateService.getErrorCard(
          "Error",
          "An error occurred. Please try again.",
        ),
        this.context,
      );
    }
  }

  async handleConversationUpdate(activity) {
    try {
      logger.debug(`Conversation update event`);

      // Bot added to conversation
      for (const member of activity.membersAdded || []) {
        if (member.id !== activity.recipient.id) {
          const userId = activity.from.id;
          logger.info(`Bot added to conversation by ${userId}`);

          // Create session
          this.sessionService.createSession(userId);

          // Store conversation activity for proactive messaging
          this.sessionService.updateConversationReference(userId, activity);

          // Send welcome card
          const welcomeCard = this.templateService.getWelcomeCard();
          await this.teamsService.sendAdaptiveCard(
            activity,
            welcomeCard,
            this.context,
          );
        }
      }

      // Bot removed from conversation
      for (const member of activity.membersRemoved || []) {
        if (member.id === activity.recipient.id) {
          const userId = activity.from.id;
          logger.info(`Bot removed from conversation with ${userId}`);
          this.sessionService.deleteSession(userId);
        }
      }
    } catch (error) {
      logger.error("Error in handleConversationUpdate", error);
    }
  }

  async handleInvoke(activity) {
    try {
      logger.debug(`Invoke activity: ${activity.name}`);
      // Handle task module or other invoke activities if needed
    } catch (error) {
      logger.error("Error in handleInvoke", error);
    }
  }
}

module.exports = ActivityController;
