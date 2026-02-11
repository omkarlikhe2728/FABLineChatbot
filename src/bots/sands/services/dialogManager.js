const logger = require('../../../common/utils/logger');

class DialogManager {
  constructor(config = {}) {
    this.sessionService = config.sessionService;
    this.lineService = config.lineService;
    this.bookingService = config.bookingService;
    this.liveChatService = config.liveChatService;
    this.templateService = config.templateService;
    logger.info('✅ Hotel DialogManager initialized');
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
      } else if (messageType === 'livechat_message') {
        return await this._handleLiveChatMessage(userId, messageData);
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
      case 'reset':
        this.sessionService.clearSession(userId);
        return [{ type: 'text', text: 'Your session has been cleared. Send any message to start a new conversation.' }];

      case 'main_menu':
        this.sessionService.setState(userId, 'MAIN_MENU');
        return [this.templateService.mainMenuButtons()];

      case 'early_checkin':
        return await this._startEarlyCheckIn(userId);

      case 'amend_booking':
        this.sessionService.setState(userId, 'AMEND_BOOKING_MENU');
        return [this.templateService.amendBookingMenu()];

      case 'food':
        return await this._startFood(userId);

      case 'extra_bed':
        return await this._startExtraBed(userId);

      case 'airport_pickup':
        return await this._startAirportPickup(userId);

      case 'live_chat':
        return await this._startLiveChat(userId);

      case 'end_live_chat':
        return await this._endLiveChat(userId);

      case 'food_breakfast':
      case 'food_lunch':
      case 'food_dinner':
        return this._setFoodType(userId, action);

      case 'confirm_yes':
        return await this._handleConfirmYes(userId);

      case 'confirm_no':
        this.sessionService.setState(userId, 'MAIN_MENU');
        return [this.templateService.whatElseMenu()];

      case 'end_session':
        return await this._startCSAT(userId);

      case 'csat_5':
      case 'csat_4':
      case 'csat_3':
      case 'csat_1':
        this.sessionService.clearSession(userId);
        return [this.templateService.thankYouMessage()];

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
      return await this._handleLiveChatMessage(userId, lowerText);
    }

    // Handle text input based on current state
    switch (currentState) {
      case 'EARLY_CHECKIN_ASK_ID':
        this.sessionService.setAttribute(userId, 'BookingId', text);
        return await this._fetchAndShowBooking(userId, text, 'EARLY_CHECKIN_ASK_TIME', 'askCheckinTime');

      case 'EARLY_CHECKIN_ASK_TIME':
        this.sessionService.setAttribute(userId, 'updateCheckInRequest', text);
        this.sessionService.setState(userId, 'EARLY_CHECKIN_CONFIRM');
        return [this.templateService.confirmSaveRequest()];

      case 'FOOD_ASK_ID':
        this.sessionService.setAttribute(userId, 'BookingId', text);
        return await this._fetchAndShowBooking(userId, text, 'FOOD_SELECT_TYPE', 'foodTypeMenu');

      case 'FOOD_SELECT_TYPE':
        return this._selectFoodByText(userId, lowerText);

      case 'EXTRA_BED_ASK_ID':
        this.sessionService.setAttribute(userId, 'BookingId', text);
        return await this._fetchAndShowBooking(userId, text, 'EXTRA_BED_ASK_DETAILS', 'askExtraBedDetails');

      case 'EXTRA_BED_ASK_DETAILS':
        this.sessionService.setAttribute(userId, 'extraBed', text);
        this.sessionService.setState(userId, 'EXTRA_BED_CONFIRM');
        return [this.templateService.confirmSaveRequest()];

      case 'AIRPORT_ASK_ID':
        this.sessionService.setAttribute(userId, 'BookingId', text);
        return await this._fetchAndShowBooking(userId, text, 'AIRPORT_ASK_TIME', 'askAirportPickupTime');

      case 'AIRPORT_ASK_TIME':
        this.sessionService.setAttribute(userId, 'updateCheckInRequest', text);
        this.sessionService.setState(userId, 'AIRPORT_CONFIRM');
        return [this.templateService.confirmSaveRequest()];

      case 'EARLY_CHECKIN_CONFIRM':
      case 'FOOD_CONFIRM':
      case 'EXTRA_BED_CONFIRM':
      case 'AIRPORT_CONFIRM':
        return this._handleConfirmationText(userId, currentState, lowerText);

      case 'CSAT_RATING':
        this.sessionService.clearSession(userId);
        return [this.templateService.thankYouMessage()];

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
   * Start early check-in flow
   */
  async _startEarlyCheckIn(userId) {
    const bookingId = this.sessionService.getAttribute(userId, 'BookingId');
    if (bookingId) {
      return await this._fetchAndShowBooking(userId, bookingId, 'EARLY_CHECKIN_ASK_TIME', 'askCheckinTime');
    }
    this.sessionService.setState(userId, 'EARLY_CHECKIN_ASK_ID');
    return [this.templateService.askBookingId()];
  }

  /**
   * Start food flow
   */
  async _startFood(userId) {
    const bookingId = this.sessionService.getAttribute(userId, 'BookingId');
    if (bookingId) {
      return await this._fetchAndShowBooking(userId, bookingId, 'FOOD_SELECT_TYPE', 'foodTypeMenu');
    }
    this.sessionService.setState(userId, 'FOOD_ASK_ID');
    return [this.templateService.askBookingId()];
  }

  /**
   * Start extra bed flow
   */
  async _startExtraBed(userId) {
    const bookingId = this.sessionService.getAttribute(userId, 'BookingId');
    if (bookingId) {
      return await this._fetchAndShowBooking(userId, bookingId, 'EXTRA_BED_ASK_DETAILS', 'askExtraBedDetails');
    }
    this.sessionService.setState(userId, 'EXTRA_BED_ASK_ID');
    return [this.templateService.askBookingId()];
  }

  /**
   * Start airport pickup flow
   */
  async _startAirportPickup(userId) {
    const bookingId = this.sessionService.getAttribute(userId, 'BookingId');
    if (bookingId) {
      return await this._fetchAndShowBooking(userId, bookingId, 'AIRPORT_ASK_TIME', 'askAirportPickupTime');
    }
    this.sessionService.setState(userId, 'AIRPORT_ASK_ID');
    return [this.templateService.askBookingId()];
  }

  /**
   * Fetch booking and show details
   */
  async _fetchAndShowBooking(userId, bookingId, nextState, templateMethod) {
    const result = await this.bookingService.getBooking(bookingId);

    if (!result.success) {
      this.sessionService.setState(userId, 'MAIN_MENU');
      return [
        this.templateService.bookingNotFoundMessage(bookingId),
        this.templateService.mainMenuButtons(),
      ];
    }

    // Store booking attributes
    this._storeBookingAttributes(userId, result.data);
    this.sessionService.setState(userId, nextState);

    const flexMsg = this.templateService.bookingDetailsFlexMessage(result.data);
    const actionMsg = this.templateService[templateMethod]();
    return [flexMsg, actionMsg];
  }

  /**
   * Store booking attributes in session
   */
  _storeBookingAttributes(userId, booking) {
    if (booking.guestName) this.sessionService.setAttribute(userId, 'guestName', booking.guestName);
    if (booking.roomType) this.sessionService.setAttribute(userId, 'roomType', booking.roomType);
    if (booking.checkInDate) this.sessionService.setAttribute(userId, 'checkInDate', booking.checkInDate);
    if (booking.checkOutDate) this.sessionService.setAttribute(userId, 'checkOutDate', booking.checkOutDate);
    if (booking.specialRequests) this.sessionService.setAttribute(userId, 'specialRequests', booking.specialRequests);
  }

  /**
   * Set food type from postback
   */
  _setFoodType(userId, action) {
    const typeMap = { food_breakfast: 'breakfast', food_lunch: 'lunch', food_dinner: 'dinner' };
    const foodType = typeMap[action];
    this.sessionService.setAttribute(userId, 'foodType', foodType);
    this.sessionService.setAttribute(userId, 'foodLabel', `Add ${foodType}`);
    this.sessionService.setState(userId, 'FOOD_CONFIRM');
    return [this.templateService.confirmSaveRequest()];
  }

  /**
   * Select food by text input
   */
  _selectFoodByText(userId, lowerText) {
    if (lowerText.includes('breakfast')) {
      return this._setFoodType(userId, 'food_breakfast');
    } else if (lowerText.includes('lunch')) {
      return this._setFoodType(userId, 'food_lunch');
    } else if (lowerText.includes('dinner')) {
      return this._setFoodType(userId, 'food_dinner');
    }
    return [
      { type: 'text', text: 'Please select breakfast, lunch, or dinner.' },
      this.templateService.foodTypeMenu(),
    ];
  }

  /**
   * Handle confirmation text (yes/no)
   */
  _handleConfirmationText(userId, currentState, lowerText) {
    if (/\b(yes|yeah|yep|confirm|ok|okay|sure)\b/.test(lowerText)) {
      return this._handleConfirmYes(userId);
    } else if (/\b(no|nope|cancel|back)\b/.test(lowerText)) {
      this.sessionService.setState(userId, 'MAIN_MENU');
      return [this.templateService.whatElseMenu()];
    }
    return [
      { type: 'text', text: 'Please reply Yes or No.' },
      this.templateService.confirmSaveRequest(),
    ];
  }

  /**
   * Handle confirmation (save request to booking)
   */
  async _handleConfirmYes(userId) {
    const session = this.sessionService.getSession(userId);
    const currentState = session.dialogState;
    const bookingId = this.sessionService.getAttribute(userId, 'BookingId');

    let result;
    let successMsg;

    switch (currentState) {
      case 'EARLY_CHECKIN_CONFIRM': {
        const time = this.sessionService.getAttribute(userId, 'updateCheckInRequest');
        result = await this.bookingService.addSpecialRequest(bookingId, `Early Checkin: ${time}`);
        successMsg = result.success
          ? `Early check-in request for ${time} has been saved. ✅`
          : 'Sorry, could not save your request.';
        break;
      }
      case 'FOOD_CONFIRM': {
        const foodType = this.sessionService.getAttribute(userId, 'foodType');
        result = await this.bookingService.addSpecialRequest(bookingId, `Food: ${foodType}`);
        successMsg = result.success ? `Thanks for adding ${foodType} to your booking 🍽️` : 'Sorry, could not save your request.';
        break;
      }
      case 'EXTRA_BED_CONFIRM': {
        const bed = this.sessionService.getAttribute(userId, 'extraBed');
        result = await this.bookingService.addSpecialRequest(bookingId, `Extra Bed: ${bed}`);
        successMsg = result.success ? `Extra bed request has been saved. ✅` : 'Sorry, could not save your request.';
        break;
      }
      case 'AIRPORT_CONFIRM': {
        const time = this.sessionService.getAttribute(userId, 'updateCheckInRequest');
        result = await this.bookingService.addSpecialRequest(bookingId, `Airport Pickup: ${time}`);
        successMsg = result.success ? `Airport pickup request for ${time} has been saved. ✅` : 'Sorry, could not save your request.';
        break;
      }
      default:
        successMsg = 'Request saved.';
    }

    this.sessionService.setState(userId, 'MAIN_MENU');
    return [{ type: 'text', text: successMsg }, this.templateService.whatElseMenu()];
  }

  /**
   * Start live chat
   */
  async _startLiveChat(userId) {
    this.sessionService.setState(userId, 'LIVE_CHAT_ACTIVE');

    // Notify user
    const messages = [this.templateService.agentMessage()];

    // Start live chat via middleware
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
   * End live chat
   */
  async _endLiveChat(userId) {
    try {
      await this.liveChatService.endLiveChat(userId);
      logger.info(`Live chat ended for user ${userId}`);
    } catch (error) {
      logger.error(`Failed to end live chat: ${error.message}`);
    }

    this.sessionService.clearSession(userId);
    return [this.templateService.liveChatEndedMessage(), this.templateService.mainMenuButtons()];
  }

  /**
   * Handle all message types during live chat
   * @param {string} userId - LINE user ID
   * @param {Object} message - Complete LINE message object from event.message
   */
  async _handleLiveChatMessage(userId, message) {
    // Check for exit keywords (text messages only)
    if (message.type === 'text') {
      const lowerText = message.text.toLowerCase().trim();
      const exitKeywords = /\b(exit|quit|end chat|exit chat|close chat|back to bot|end live chat|end session|close session|menu|main menu|disconnect)\b/i;

      if (exitKeywords.test(lowerText)) {
        await this.liveChatService.endLiveChat(userId);

        // Check if user specifically asked to end session (CSAT)
        if (/\b(end session|close session|disconnect)\b/i.test(lowerText)) {
          return await this._startCSAT(userId);
        }

        this.sessionService.clearSession(userId);
        return [this.templateService.liveChatEndedMessage(), this.templateService.mainMenuButtons()];
      }
    }

    // Forward entire message object to agent (all types: text, image, video, audio, file, location, sticker)
    logger.info(`Forwarding ${message.type} message to agent for user ${userId}`);
    const result = await this.liveChatService.sendMessage(userId, message);

    if (!result.success) {
      return [
        { type: 'text', text: `Sorry, unable to send ${message.type}. Type "menu" to return to main menu.` },
      ];
    }

    // No reply - agent will handle
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
   * Match text to intent
   */
  _matchIntent(text) {
    if (/\b(end session|close session|disconnect)\b/i.test(text)) return 'end_session';
    if (/\b(reset|clear|restart)\b/i.test(text)) return 'reset';
    if (/\b(main menu|menu|start)\b/i.test(text)) return 'main_menu';
    if (/\b(early check.?in|check in early)\b/i.test(text)) return 'early_checkin';
    if (/\b(add food|add breakfast|add lunch|add dinner)\b/i.test(text)) return 'food';
    if (/\b(amend|amendment|modify.*booking)\b/i.test(text)) return 'amend_booking';
    if (/\b(live chat|agent|support|connect.*agent)\b/i.test(text)) return 'live_chat';
    if (/\b(airport pickup|airport.*pickup)\b/i.test(text)) return 'airport_pickup';
    if (/\b(extra bed|additional bed|add.*bed)\b/i.test(text)) return 'extra_bed';
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
