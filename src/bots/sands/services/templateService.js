const logger = require('../../../common/utils/logger');

class TemplateService {
  constructor(config = {}) {
    this.hotelImageUrl = config.hotelImageUrl || process.env.SANDS_IMAGE_URL;
    this.hotelName = config.hotelName || process.env.SANDS_NAME || 'Sands Hotel Macau';
    logger.info(`✅ Sands TemplateService initialized`);
  }

  /**
   * Welcome message with hotel image and main menu
   */
  welcomeMessage(displayName) {
    return [
      {
        type: 'image',
        originalContentUrl: this.hotelImageUrl,
        previewImageUrl: this.hotelImageUrl,
      },
      {
        type: 'text',
        text: `Hello ${displayName},\nWelcome to ${this.hotelName}! 🏨\n\nI'm your digital concierge, available 24/7 to assist you.\nHow may I help you today?`,
      },
      this.mainMenuButtons(),
    ];
  }

  /**
   * Main menu buttons
   */
  mainMenuButtons() {
    return {
      type: 'template',
      altText: 'Hotel Main Menu',
      template: {
        type: 'buttons',
        text: 'Welcome to Sands Hotel Macau! 🏨\n\nHow can I assist you?',
        actions: [
          {
            type: 'postback',
            label: '🏨 Early Check-in',
            data: 'action=early_checkin',
            displayText: '🏨 Early Check-in',
          },
          {
            type: 'postback',
            label: '✏️ Amend Booking',
            data: 'action=amend_booking',
            displayText: '✏️ Amend Booking',
          },
          {
            type: 'postback',
            label: '💬 Live Chat',
            data: 'action=live_chat',
            displayText: '💬 Live Chat',
          },
          {
            type: 'postback',
            label: '👋 End Session',
            data: 'action=end_session',
            displayText: '👋 End Session',
          },
        ],
      },
    };
  }

  /**
   * Amend booking menu
   */
  amendBookingMenu() {
    return {
      type: 'template',
      altText: 'Booking Amendments',
      template: {
        type: 'buttons',
        text: 'What would you like to amend? 📝',
        actions: [
          {
            type: 'postback',
            label: '🍽️ Add Food',
            data: 'action=food',
            displayText: '🍽️ Add Food',
          },
          {
            type: 'postback',
            label: '🛏️ Extra Bed',
            data: 'action=extra_bed',
            displayText: '🛏️ Extra Bed',
          },
          {
            type: 'postback',
            label: '🚗 Airport Pickup',
            data: 'action=airport_pickup',
            displayText: '🚗 Airport Pickup',
          },
          {
            type: 'postback',
            label: '↩️ Back',
            data: 'action=main_menu',
            displayText: '↩️ Back to Menu',
          },
        ],
      },
    };
  }

  /**
   * Food type selection menu
   */
  foodTypeMenu() {
    return {
      type: 'template',
      altText: 'Select Meal',
      template: {
        type: 'buttons',
        text: 'Select which meal you would like to add 🍴:',
        actions: [
          {
            type: 'postback',
            label: '☀️ Breakfast',
            data: 'action=food_breakfast',
            displayText: '☀️ Breakfast',
          },
          {
            type: 'postback',
            label: '🌤️ Lunch',
            data: 'action=food_lunch',
            displayText: '🌤️ Lunch',
          },
          {
            type: 'postback',
            label: '🌙 Dinner',
            data: 'action=food_dinner',
            displayText: '🌙 Dinner',
          },
        ],
      },
    };
  }

  /**
   * Booking details as flex message (rich format)
   */
  bookingDetailsFlexMessage(booking) {
    return {
      type: 'flex',
      altText: 'Booking Details',
      contents: {
        type: 'bubble',
        header: {
          type: 'box',
          layout: 'vertical',
          contents: [
            {
              type: 'text',
              text: '🏨 Booking Reference',
              weight: 'bold',
              size: 'xl',
              color: '#1DB446',
            },
          ],
        },
        body: {
          type: 'box',
          layout: 'vertical',
          spacing: 'md',
          contents: [
            {
              type: 'box',
              layout: 'baseline',
              spacing: 'sm',
              contents: [
                { type: 'text', text: 'Guest:', color: '#aaaaaa', size: 'sm', flex: 2 },
                { type: 'text', text: booking.guestName || 'N/A', wrap: true, weight: 'bold', flex: 3 },
              ],
            },
            {
              type: 'box',
              layout: 'baseline',
              spacing: 'sm',
              contents: [
                { type: 'text', text: 'Check-in:', color: '#aaaaaa', size: 'sm', flex: 2 },
                { type: 'text', text: booking.checkInDate || 'N/A', wrap: true, weight: 'bold', flex: 3 },
              ],
            },
            {
              type: 'box',
              layout: 'baseline',
              spacing: 'sm',
              contents: [
                { type: 'text', text: 'Check-out:', color: '#aaaaaa', size: 'sm', flex: 2 },
                { type: 'text', text: booking.checkOutDate || 'N/A', wrap: true, weight: 'bold', flex: 3 },
              ],
            },
            {
              type: 'box',
              layout: 'baseline',
              spacing: 'sm',
              contents: [
                { type: 'text', text: 'Room:', color: '#aaaaaa', size: 'sm', flex: 2 },
                { type: 'text', text: booking.roomType || 'N/A', wrap: true, weight: 'bold', flex: 3 },
              ],
            },
            {
              type: 'box',
              layout: 'baseline',
              spacing: 'sm',
              contents: [
                { type: 'text', text: 'Requests:', color: '#aaaaaa', size: 'sm', flex: 2 },
                {
                  type: 'text',
                  text: booking.specialRequests || 'None',
                  wrap: true,
                  weight: 'bold',
                  flex: 3,
                },
              ],
            },
            {
              type: 'separator',
              margin: 'md',
            },
          ],
        },
      },
    };
  }

  /**
   * Confirmation message
   */
  confirmSaveRequest() {
    return {
      type: 'template',
      altText: 'Confirm Request',
      template: {
        type: 'buttons',
        text: 'Would you like to save this request? ✅',
        actions: [
          {
            type: 'postback',
            label: 'Yes ✓',
            data: 'action=confirm_yes',
            displayText: 'Yes ✓',
          },
          {
            type: 'postback',
            label: 'No ✗',
            data: 'action=confirm_no',
            displayText: 'No ✗',
          },
        ],
      },
    };
  }

  /**
   * What else menu (after completing an action)
   */
  whatElseMenu() {
    return {
      type: 'template',
      altText: 'What Else',
      template: {
        type: 'buttons',
        text: 'What else can I help you with? 😊',
        actions: [
          {
            type: 'postback',
            label: '🏠 Main Menu',
            data: 'action=main_menu',
            displayText: '🏠 Main Menu',
          },
          {
            type: 'postback',
            label: '💬 Live Chat',
            data: 'action=live_chat',
            displayText: '💬 Live Chat',
          },
          {
            type: 'postback',
            label: '👋 End Session',
            data: 'action=end_session',
            displayText: '👋 End Session',
          },
        ],
      },
    };
  }

  /**
   * Live chat agent connection message
   */
  agentMessage() {
    return {
      type: 'text',
      text: 'Please wait while we connect you with an Agent. 💬\n\nA team member will assist you shortly. You can also reach us at:\n📞 +853 8898 1111\n📧 concierge@sandsmacao.com',
    };
  }

  /**
   * End session message with CSAT survey
   */
  endSessionMessages(displayName) {
    return [
      {
        type: 'image',
        originalContentUrl: this.hotelImageUrl,
        previewImageUrl: this.hotelImageUrl,
      },
      {
        type: 'text',
        text: `Thank you ${displayName} for using our service! 🙏`,
      },
      {
        type: 'template',
        altText: 'Rate Your Experience',
        template: {
          type: 'buttons',
          text: 'How would you rate your overall experience with our concierge?',
          actions: [
            {
              type: 'postback',
              label: '⭐⭐⭐⭐⭐ Excellent',
              data: 'action=csat_5',
              displayText: '⭐⭐⭐⭐⭐ Excellent',
            },
            {
              type: 'postback',
              label: '⭐⭐⭐⭐ Good',
              data: 'action=csat_4',
              displayText: '⭐⭐⭐⭐ Good',
            },
            {
              type: 'postback',
              label: '⭐⭐⭐ Average',
              data: 'action=csat_3',
              displayText: '⭐⭐⭐ Average',
            },
            {
              type: 'postback',
              label: '⭐⭐ Poor',
              data: 'action=csat_1',
              displayText: '⭐⭐ Poor',
            },
          ],
        },
      },
    ];
  }

  /**
   * Ask for booking ID
   */
  askBookingId() {
    return {
      type: 'text',
      text: 'Please share your Booking ID to proceed.',
    };
  }

  /**
   * Ask for early check-in time
   */
  askCheckinTime() {
    return {
      type: 'text',
      text: 'Please let me know what time you would like to check in.',
    };
  }

  /**
   * Ask for extra bed details
   */
  askExtraBedDetails() {
    return {
      type: 'text',
      text: 'Please provide details about the extra bed you would like to add.',
    };
  }

  /**
   * Ask for airport pickup time
   */
  askAirportPickupTime() {
    return {
      type: 'text',
      text: 'Please let me know the time you would like to be picked up from the airport.',
    };
  }

  /**
   * Error message for not found booking
   */
  bookingNotFoundMessage(bookingId) {
    return {
      type: 'text',
      text: `I cannot find a booking with ID: ${bookingId}\n\nPlease double-check and try again.`,
    };
  }

  /**
   * Live chat ended message
   */
  liveChatEndedMessage() {
    return {
      type: 'text',
      text: 'Your live chat session has ended. Thank you for connecting with us! 👋',
    };
  }

  /**
   * Thank you message after CSAT
   */
  thankYouMessage() {
    return {
      type: 'text',
      text: 'Thank you for your feedback! 🙏\n\nYour session has ended. Send any message to start a new conversation.',
    };
  }
}

// Create singleton instance
const defaultInstance = new TemplateService({
  hotelImageUrl: process.env.SANDS_IMAGE_URL,
  hotelName: process.env.SANDS_NAME || 'Sands Hotel Macau',
});

module.exports = defaultInstance;
