const axios = require('axios');
const logger = require('../../../common/utils/logger');

class AirlineService {
  constructor(config) {
    this.config = config;
    this.baseURL = config.apiUrl;
    this.timeout = config.apiTimeout || 5000;

    this.client = axios.create({
      baseURL: this.baseURL,
      timeout: this.timeout,
      headers: {
        'Content-Type': 'application/json',
      },
    });
  }

  /**
   * Get flight status by flight number and date
   */
  async getFlightStatus(flightNumber, flightDate) {
    try {
      logger.info(`Fetching flight status for flight ${flightNumber} on ${flightDate}`);

      const response = await this.client.get('/flight-status', {
        params: {
          flightNumber: flightNumber,
          flightDate: flightDate,
        },
      });

      logger.info(`Flight status retrieved for ${flightNumber}`);
      return response.data;
    } catch (error) {
      logger.error(`Get flight status failed for ${flightNumber}: ${error.message}`);
      return {
        success: false,
        message: error.response?.data?.message || 'Failed to fetch flight status',
      };
    }
  }

  /**
   * Get baggage allowance by travel class
   */
  async getBaggageAllowance(travelClass) {
    try {
      logger.info(`Fetching baggage allowance for ${travelClass} class`);

      const response = await this.client.get('/baggage', {
        params: {
          class: travelClass.toUpperCase(),
        },
      });

      logger.info(`Baggage allowance retrieved for ${travelClass}`);
      return response.data;
    } catch (error) {
      logger.error(`Get baggage allowance failed for ${travelClass}: ${error.message}`);
      return {
        success: false,
        message: error.response?.data?.message || 'Failed to fetch baggage allowance',
      };
    }
  }
}

// Create singleton instance
const defaultConfig = {
  apiUrl: process.env.ANA_AIRLINE_API_URL || 'https://password-reset.lab.bravishma.com:6507/api/v1/airline',
  apiTimeout: parseInt(process.env.ANA_AIRLINE_API_TIMEOUT || '5000'),
};
const defaultInstance = new AirlineService(defaultConfig);

module.exports = defaultInstance;
