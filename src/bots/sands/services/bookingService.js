const axios = require('axios');
const logger = require('../../../common/utils/logger');

class BookingService {
  constructor(config = {}) {
    this.baseUrl = config.baseUrl || process.env.SANDS_BOOKING_API_URL;
    this.timeout = config.timeout || 5000;

    if (!this.baseUrl) {
      throw new Error(
        'Sands BookingService initialization error: Missing SANDS_BOOKING_API_URL. ' +
          'Check .env.sands configuration.'
      );
    }

    logger.info(`✅ Sands BookingService initialized with baseUrl: ${this.baseUrl}`);
  }

  /**
   * Get booking details by booking ID
   */
  async getBooking(bookingId) {
    try {
      logger.info(`Fetching booking details for ID: ${bookingId}`);

      const res = await axios.get(`${this.baseUrl}/bookings/${bookingId}`, {
        headers: { 'Content-Type': 'application/json' },
        timeout: this.timeout,
      });

      logger.info(`Booking found: ${bookingId}`);
      return {
        success: true,
        data: res.data.data || res.data,
      };
    } catch (error) {
      logger.error(`Booking API error fetching ${bookingId}: ${error.message}`);
      return {
        success: false,
        error: error.message,
        statusCode: error.response?.status,
      };
    }
  }

  /**
   * Add special request to a booking
   */
  async addSpecialRequest(bookingId, specialRequest, append = true) {
    try {
      logger.info(`Adding special request to booking ${bookingId}: ${specialRequest}`);

      const res = await axios.patch(
        `${this.baseUrl}/bookings/${bookingId}/special-requests`,
        {
          specialRequests: specialRequest,
          append: String(append),
        },
        {
          headers: { 'Content-Type': 'application/json' },
          timeout: this.timeout,
        }
      );

      logger.info(`Special request added successfully to booking ${bookingId}`);
      return {
        success: true,
        data: res.data.data || res.data,
      };
    } catch (error) {
      logger.error(`Booking API error adding request to ${bookingId}: ${error.message}`);
      return {
        success: false,
        error: error.message,
        statusCode: error.response?.status,
      };
    }
  }

  /**
   * Amend a booking with multiple types of requests
   * Used for food, extra bed, airport pickup, early check-in
   */
  async amendBooking(bookingId, amendments) {
    try {
      logger.info(`Amending booking ${bookingId} with:`, amendments);

      const specialRequest = this._formatSpecialRequest(amendments);
      return await this.addSpecialRequest(bookingId, specialRequest);
    } catch (error) {
      logger.error(`Booking amendment error for ${bookingId}: ${error.message}`);
      return {
        success: false,
        error: error.message,
      };
    }
  }

  /**
   * Format special request based on amendment type
   */
  _formatSpecialRequest(amendments) {
    if (typeof amendments === 'string') {
      return amendments;
    }

    const { type, data } = amendments;

    switch (type) {
      case 'early_checkin':
        return `Early Check-in: ${data.time}`;
      case 'food':
        return `Food Request: ${data.type.charAt(0).toUpperCase()}${data.type.slice(1)}`;
      case 'extra_bed':
        return `Extra Bed Request: ${data.details}`;
      case 'airport_pickup':
        return `Airport Pickup: ${data.time}`;
      default:
        return String(amendments);
    }
  }
}

// Create singleton instance
const defaultConfig = {
  baseUrl: process.env.SANDS_BOOKING_API_URL,
};
const defaultInstance = new BookingService(defaultConfig);

module.exports = defaultInstance;
