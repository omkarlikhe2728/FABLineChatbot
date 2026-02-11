const logger = require('../../../common/utils/logger');

class DialogManager {
  constructor(config = {}) {
    this.sessionService = config.sessionService;
    this.lineService = config.lineService;
    this.airlineService = config.airlineService;
    this.liveChatService = config.liveChatService;
    this.templateService = config.templateService;
    logger.info('✅ ANA DialogManager initialized');
  }

  /**
   * Process a user message and return response messages
   */
  async processMessage(userId, messageType, messageData) {
    try {
      // Ensure session exists
      const session = this.sessionService.ensureSession(userId);
      const currentState = session.dialogState;

      logger.info(`Processing ${messageType} for user ${userId} in state: ${currentState}`);

      if (messageType === 'postback') {
        return await this._handlePostback(userId, messageData);
      } else if (messageType === 'text') {
        return await this._handleTextMessage(userId, currentState, messageData);
      } else if (messageType === 'follow') {
        return await this._handleFollowEvent(userId);
      }

      return null;
    } catch (error) {
      logger.error(`Error processing message for ${userId}: ${error.message}`);
      throw error;
    }
  }

  /**
   * Handle postback events (button clicks)
   */
  async _handlePostback(userId, data) {
    const action = data.action;
    logger.info(`Postback action: ${action} for user ${userId}`);

    switch (action) {
      case 'flight_status':
        return await this._startFlightStatus(userId);

      case 'baggage_allowance':
        return await this._startBaggageAllowance(userId);

      case 'baggage_class':
        return await this._processBaggageClass(userId, data.data.class);

      case 'live_chat':
        return await this._startLiveChat(userId);

      case 'main_menu':
        this.sessionService.setState(userId, 'MAIN_MENU');
        return [this.templateService.mainMenuButtons()];

      case 'end_session':
        return await this._startCSAT(userId);

      case 'csat_rating':
        return await this._processCSATRating(userId, data.data.rating);

      default:
        return [this.templateService.mainMenuButtons()];
    }
  }

  /**
   * Handle text messages
   */
  async _handleTextMessage(userId, currentState, text) {
    const lowerText = text.toLowerCase().trim();

    // Check if in live chat mode
    if (currentState === 'LIVE_CHAT_ACTIVE') {
      return await this._handleLiveChatMessage(userId, text);
    }

    // Handle text input based on current state
    switch (currentState) {
      case 'FLIGHT_STATUS_ASK_NUMBER':
        return await this._processFlightNumber(userId, text);

      case 'FLIGHT_STATUS_ASK_DATE':
        return await this._processFlightDate(userId, text);

      case 'CSAT_RATING':
        // Allow rating input or exit keywords
        if (/^[1-5]$/.test(text)) {
          return await this._processCSATRating(userId, text);
        }
        return [this.templateService.endSessionMessages('Guest')];

      default:
        // Check for keyword-based intents
        const intent = this._matchIntent(lowerText);
        if (intent) {
          return await this._handleIntent(userId, intent);
        }
        // Default: show welcome
        return await this._showWelcome(userId);
    }
  }

  /**
   * Handle follow event (user adds bot as friend)
   */
  async _handleFollowEvent(userId) {
    this.sessionService.ensureSession(userId);
    return await this._showWelcome(userId);
  }

  /**
   * Show welcome message
   */
  async _showWelcome(userId) {
    try {
      const profile = await this.lineService.getProfile(userId);
      const displayName = profile.displayName || 'Guest';
      this.sessionService.setState(userId, 'MAIN_MENU');
      return this.templateService.welcomeMessage(displayName);
    } catch (error) {
      logger.error(`Failed to get profile for ${userId}`);
      return this.templateService.welcomeMessage('Guest');
    }
  }

  /**
   * Start flight status flow
   */
  async _startFlightStatus(userId) {
    this.sessionService.setState(userId, 'FLIGHT_STATUS_ASK_NUMBER');
    return [this.templateService.askFlightNumber()];
  }

  /**
   * Process flight number input
   */
  async _processFlightNumber(userId, flightNumber) {
    // Validate flight number format (simple check)
    if (!flightNumber || flightNumber.length < 2) {
      return [this.templateService.invalidFlightNumberMessage()];
    }

    this.sessionService.setAttribute(userId, 'flightNumber', flightNumber.toUpperCase());
    this.sessionService.setState(userId, 'FLIGHT_STATUS_ASK_DATE');
    return [this.templateService.askFlightDate()];
  }

  /**
   * Process flight date and fetch status
   */
  async _processFlightDate(userId, flightDate) {
    // Validate date format (YYYY-MM-DD)
    if (!/^\d{4}-\d{2}-\d{2}$/.test(flightDate)) {
      return [this.templateService.invalidDateMessage()];
    }

    const flightNumber = this.sessionService.getAttribute(userId, 'flightNumber');

    // Call airline API
    const result = await this.airlineService.getFlightStatus(flightNumber, flightDate);

    if (!result.success) {
      this.sessionService.setState(userId, 'MAIN_MENU');
      return [
        this.templateService.apiErrorMessage('fetch flight status'),
        this.templateService.mainMenuButtons(),
      ];
    }

    // Display flight status
    const { data } = result;
    const statusMessage = this.templateService.flightStatusMessage(
      flightNumber,
      data.departure,
      data.arrival
    );

    this.sessionService.setState(userId, 'MAIN_MENU');
    return [statusMessage, this.templateService.whatElseMenu()];
  }

  /**
   * Start baggage allowance flow
   */
  async _startBaggageAllowance(userId) {
    this.sessionService.setState(userId, 'BAGGAGE_ASK_CLASS');
    return [this.templateService.travelClassButtons()];
  }

  /**
   * Process baggage class selection
   */
  async _processBaggageClass(userId, travelClass) {
    if (!travelClass || !['ECONOMY', 'BUSINESS', 'FIRST'].includes(travelClass.toUpperCase())) {
      return [this.templateService.travelClassButtons()];
    }

    // Call airline API
    const result = await this.airlineService.getBaggageAllowance(travelClass);

    if (!result.success) {
      this.sessionService.setState(userId, 'MAIN_MENU');
      return [
        this.templateService.apiErrorMessage('fetch baggage allowance'),
        this.templateService.mainMenuButtons(),
      ];
    }

    // Display baggage allowance
    const { data } = result;
    const bagMessage = this.templateService.baggageAllowanceMessage(
      travelClass,
      data.checkedBagKg,
      data.cabinBagKg
    );

    this.sessionService.setState(userId, 'MAIN_MENU');
    return [bagMessage, this.templateService.whatElseMenu()];
  }

  /**
   * Start live chat
   */
  async _startLiveChat(userId) {
    this.sessionService.setState(userId, 'LIVE_CHAT_ACTIVE');

    // Notify user
    const messages = [this.templateService.agentMessage()];

    // Start live chat via API
    try {
      const profile = await this.lineService.getProfile(userId);
      await this.liveChatService.startLiveChat(userId, profile.displayName, 'Customer initiated live chat');
      logger.info(`Live chat started for user ${userId}`);
    } catch (error) {
      logger.error(`Failed to start live chat for ${userId}: ${error.message}`);
      // Continue anyway - user already notified
    }

    return messages;
  }

  /**
   * Handle messages during live chat
   */
  async _handleLiveChatMessage(userId, text) {
    // Check for exit keywords
    const exitKeywords = /\b(exit|quit|end chat|exit chat|close chat|back to bot|end live chat|end session|close session|menu|main menu|disconnect)\b/i;
    if (exitKeywords.test(text)) {
      await this.liveChatService.endLiveChat(userId);

      // Check if user specifically asked to end session (CSAT)
      if (/\b(end session|close session|disconnect)\b/i.test(text)) {
        return await this._startCSAT(userId);
      }

      this.sessionService.setState(userId, 'MAIN_MENU');
      return [this.templateService.liveChatEndedMessage(), this.templateService.mainMenuButtons()];
    }

    // Forward message to agent
    const result = await this.liveChatService.sendMessage(userId, text);
    if (!result.success) {
      return [
        { type: 'text', text: 'Sorry, unable to reach the agent. Type "menu" to return to main menu.' },
      ];
    }

    // Don't reply — agent will reply via middleware
    return null;
  }

  /**
   * Start CSAT survey
   */
  async _startCSAT(userId) {
    this.sessionService.setState(userId, 'CSAT_RATING');

    try {
      const profile = await this.lineService.getProfile(userId);
      return this.templateService.endSessionMessages(profile.displayName);
    } catch (error) {
      logger.error(`Failed to get profile for CSAT: ${error.message}`);
      return this.templateService.endSessionMessages('Guest');
    }
  }

  /**
   * Process CSAT rating
   */
  async _processCSATRating(userId, rating) {
    logger.info(`CSAT rating received from user ${userId}: ${rating}`);
    this.sessionService.clearSession(userId);
    return [this.templateService.thankYouMessage()];
  }

  /**
   * Match text to intent
   */
  _matchIntent(text) {
    if (/\b(end session|close session|disconnect)\b/i.test(text)) return 'end_session';
    if (/\b(flight status|check flight|flight.*status)\b/i.test(text)) return 'flight_status';
    if (/\b(baggage|luggage|bag)\b/i.test(text)) return 'baggage_allowance';
    if (/\b(live chat|agent|support|connect.*agent)\b/i.test(text)) return 'live_chat';
    if (/\b(main menu|menu|start|home)\b/i.test(text)) return 'main_menu';
    return null;
  }

  /**
   * Handle text-matched intents
   */
  async _handleIntent(userId, intent) {
    // Convert intent to postback
    const postbackData = { action: intent };
    return await this._handlePostback(userId, postbackData);
  }
}

// Create singleton instance (services will be injected from webhookController)
const defaultInstance = new DialogManager();

module.exports = defaultInstance;
