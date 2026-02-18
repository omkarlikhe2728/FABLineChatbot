const logger = require('../../../common/utils/logger');

class ActivityController {
  constructor(teamsService, sessionService, dialogManager, templateService) {
    this.teamsService = teamsService;
    this.sessionService = sessionService;
    this.dialogManager = dialogManager;
    this.templateService = templateService;
  }

  async processActivity(activity, req, res) {
    try {
      logger.debug(`Processing activity type: ${activity.type} from userId: ${activity.from?.id}`);

      switch (activity.type) {
        case 'message':
          await this.handleMessage(activity);
          break;
        case 'conversationUpdate':
          await this.handleConversationUpdate(activity);
          break;
        case 'invoke':
          await this.handleInvoke(activity);
          break;
        default:
          logger.debug(`Unhandled activity type: ${activity.type}`);
      }

      res.status(200).json({ ok: true });
    } catch (error) {
      logger.error('Error processing activity', error);
      res.status(500).json({ error: error.message });
    }
  }

  async handleMessage(activity) {
    try {
      const userId = activity.from.id;
      const text = activity.text?.trim() || '';
      const actionData = activity.value; // Adaptive Card action data

      logger.info(`Message from ${userId}: ${text.substring(0, 50)}`);

      // Get or create session
      let session = this.sessionService.getSession(userId);
      if (!session) {
        session = this.sessionService.createSession(userId);
        logger.info(`Created new session for ${userId}`);
      }

      // Update conversation reference for proactive messages
      this.sessionService.updateConversationReference(userId, activity);

      const { dialogState, attributes } = session;

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
          await this.teamsService.sendAdaptiveCard(userId, card);
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
    } catch (error) {
      logger.error('Error in handleMessage', error);
      // Send error response to user
      const userId = activity.from.id;
      await this.teamsService.sendAdaptiveCard(userId,
        this.templateService.getErrorCard('Error', 'An error occurred. Please try again.')
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
          await this.teamsService.sendAdaptiveCard(userId, welcomeCard);
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
      logger.error('Error in handleConversationUpdate', error);
    }
  }

  async handleInvoke(activity) {
    try {
      logger.debug(`Invoke activity: ${activity.name}`);
      // Handle task module or other invoke activities if needed
    } catch (error) {
      logger.error('Error in handleInvoke', error);
    }
  }
}

module.exports = ActivityController;
