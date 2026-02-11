const logger = require('../../../common/utils/logger');

class TemplateService {
  constructor(config = {}) {
    this.welcomeImage = config.welcomeImage || process.env.ANA_WELCOME_IMAGE || 'https://www.ana.co.jp/www2/wws_common/images/top/tc1/hero/hero_pc_2512_FlyOtaku-Kawaii.jpg';
    this.airlineName = config.airlineName || 'ANA (All Nippon Airways)';
    logger.info(`✅ ANA TemplateService initialized`);
  }

  /**
   * Welcome message with airline image and main menu
   */
  welcomeMessage(displayName) {
    return [
      {
        type: 'image',
        originalContentUrl: this.welcomeImage,
        previewImageUrl: this.welcomeImage,
      },
      {
        type: 'text',
        text: `👋 Hi ${displayName}!\nWelcome to ${this.airlineName}.\nI'm your virtual travel assistant ✈️\nHow can I help you today?`,
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
      altText: 'ANA Main Menu',
      template: {
        type: 'buttons',
        text: '${this.airlineName}\n\nHow can I assist you?',
        actions: [
          {
            type: 'postback',
            label: '✈️ Flight Status',
            data: 'action=flight_status',
            displayText: '✈️ Flight Status',
          },
          {
            type: 'postback',
            label: '🧳 Baggage Allowance',
            data: 'action=baggage_allowance',
            displayText: '🧳 Baggage Allowance',
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
   * Ask for flight number
   */
  askFlightNumber() {
    return {
      type: 'text',
      text: '✈️ Please enter your flight number (e.g., NH123)',
    };
  }

  /**
   * Ask for flight date
   */
  askFlightDate() {
    return {
      type: 'text',
      text: '📅 Please enter your flight date (e.g., 2026-02-15)',
    };
  }

  /**
   * Flight status result message
   */
  flightStatusMessage(flightNumber, departure, arrival) {
    return {
      type: 'text',
      text: `Flight ✈️ ${flightNumber} is *On Time*\nDeparture: ${departure}\nArrival: ${arrival}`,
    };
  }

  /**
   * Travel class selection for baggage
   */
  travelClassButtons() {
    return {
      type: 'template',
      altText: 'Select Travel Class',
      template: {
        type: 'buttons',
        text: 'Please select your travel class 🎫',
        actions: [
          {
            type: 'postback',
            label: '💼 Economy',
            data: 'action=baggage_class&class=ECONOMY',
            displayText: '💼 Economy',
          },
          {
            type: 'postback',
            label: '✨ Business',
            data: 'action=baggage_class&class=BUSINESS',
            displayText: '✨ Business',
          },
          {
            type: 'postback',
            label: '👑 First Class',
            data: 'action=baggage_class&class=FIRST',
            displayText: '👑 First Class',
          },
        ],
      },
    };
  }

  /**
   * Baggage allowance result message
   */
  baggageAllowanceMessage(travelClass, checkedBagKg, cabinBagKg) {
    return {
      type: 'text',
      text: `Checked Baggage: ${checkedBagKg}\nCabin Baggage: ${cabinBagKg}\n\nEnjoy your ${travelClass} experience! ✈️`,
    };
  }

  /**
   * Continuation menu (after flight status or baggage)
   */
  whatElseMenu() {
    return {
      type: 'template',
      altText: 'Continue or Exit',
      template: {
        type: 'buttons',
        text: 'What else can I help you with?',
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
   * Live chat agent message
   */
  agentMessage() {
    return {
      type: 'text',
      text: 'Please wait while we connect you with an agent... 💬',
    };
  }

  /**
   * Live chat ended message
   */
  liveChatEndedMessage() {
    return {
      type: 'text',
      text: 'Live chat session has ended. Thank you for your patience! 👋',
    };
  }

  /**
   * CSAT rating message with end session images
   */
  endSessionMessages(displayName) {
    return [
      {
        type: 'image',
        originalContentUrl: this.welcomeImage,
        previewImageUrl: this.welcomeImage,
      },
      {
        type: 'text',
        text: `Thank you ${displayName} for the conversation.\n\nIt would be great if you share your feedback.\n\nHow would you rate your overall satisfaction with the service you received on a scale from 1 to 5?\n\n1 = very bad\n2 = poor\n3 = average\n4 = good\n5 = excellent`,
      },
      {
        type: 'template',
        altText: 'Rate Your Experience',
        template: {
          type: 'buttons',
          text: 'Please rate your experience:',
          actions: [
            {
              type: 'postback',
              label: '1 - Very Bad',
              data: 'action=csat_rating&rating=1',
              displayText: '1 - Very Bad',
            },
            {
              type: 'postback',
              label: '2 - Poor',
              data: 'action=csat_rating&rating=2',
              displayText: '2 - Poor',
            },
            {
              type: 'postback',
              label: '3 - Average',
              data: 'action=csat_rating&rating=3',
              displayText: '3 - Average',
            },
            {
              type: 'postback',
              label: '4 - Good',
              data: 'action=csat_rating&rating=4',
              displayText: '4 - Good',
            },
          ],
        },
      },
      {
        type: 'template',
        altText: '5 - Excellent',
        template: {
          type: 'buttons',
          text: 'Please rate your experience:',
          actions: [
            {
              type: 'postback',
              label: '5 - Excellent',
              data: 'action=csat_rating&rating=5',
              displayText: '5 - Excellent',
            },
          ],
        },
      },
    ];
  }

  /**
   * Thank you message after CSAT
   */
  thankYouMessage() {
    return {
      type: 'text',
      text: 'Thank you for your feedback! Have a great flight with ANA! ✈️',
    };
  }

  /**
   * Invalid flight number error message
   */
  invalidFlightNumberMessage() {
    return {
      type: 'text',
      text: '❌ Invalid flight number format. Please enter a valid flight number (e.g., NH123)',
    };
  }

  /**
   * Invalid date format error message
   */
  invalidDateMessage() {
    return {
      type: 'text',
      text: '❌ Invalid date format. Please use YYYY-MM-DD format (e.g., 2026-02-15)',
    };
  }

  /**
   * API error message
   */
  apiErrorMessage(operation) {
    return {
      type: 'text',
      text: `❌ Unable to ${operation} at the moment. Please try again later or contact support.`,
    };
  }
}

// Create singleton instance
const defaultConfig = {
  welcomeImage: process.env.ANA_WELCOME_IMAGE,
  airlineName: 'ANA (All Nippon Airways)',
};
const defaultInstance = new TemplateService(defaultConfig);

module.exports = defaultInstance;
