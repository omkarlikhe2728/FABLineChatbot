const axios = require('axios');
const logger = require('../utils/logger');

class BankingService {
  constructor() {
    this.baseURL = process.env.BANKING_API_BASE_URL;
    this.timeout = parseInt(process.env.BANKING_API_TIMEOUT || '5000');

    this.client = axios.create({
      baseURL: this.baseURL,
      timeout: this.timeout,
      headers: {
        'Content-Type': 'application/json',
      },
    });
  }

  async sendOTP(phone) {
    try {
      logger.info(`Sending OTP to ${this.maskPhone(phone)}`);

      const response = await this.client.post('/banking/auth/send-otp', {
        phone: this.formatPhone(phone),
      });

      logger.info(`OTP sent successfully to ${this.maskPhone(phone)}`);
      return response.data;
    } catch (error) {
      logger.error(`Send OTP failed for ${this.maskPhone(phone)}:`, error.message);
      return {
        success: false,
        message: error.response?.data?.message || 'Failed to send OTP',
      };
    }
  }

  async verifyOTP(phone, otp) {
    try {
      logger.info(`Verifying OTP for ${this.maskPhone(phone)}`);

      const response = await this.client.post('/banking/auth/verify-otp', {
        phone: this.formatPhone(phone),
        otp: otp,
      });

      logger.info(`OTP verified successfully for ${this.maskPhone(phone)}`);
      return response.data;
    } catch (error) {
      logger.error(`OTP verification failed for ${this.maskPhone(phone)}:`, error.message);
      return {
        success: false,
        data: { verified: false },
        message: error.response?.data?.message || 'OTP verification failed',
      };
    }
  }

  async getBalance(phone) {
    try {
      logger.info(`Fetching balance for ${this.maskPhone(phone)}`);

      const response = await this.client.get('/banking/account/balance', {
        params: { phone: this.formatPhone(phone) },
      });

      logger.info(`Balance fetched for ${this.maskPhone(phone)}`);
      return response.data;
    } catch (error) {
      logger.error(`Get balance failed for ${this.maskPhone(phone)}:`, error.message);
      return {
        success: false,
        message: error.response?.data?.message || 'Failed to fetch balance',
      };
    }
  }

  async getCards(phone) {
    try {
      logger.info(`Fetching cards for ${this.maskPhone(phone)}`);

      const response = await this.client.get('/banking/cards', {
        params: { phone: this.formatPhone(phone) },
      });

      logger.info(`Cards fetched for ${this.maskPhone(phone)}`);
      return response.data;
    } catch (error) {
      logger.error(`Get cards failed for ${this.maskPhone(phone)}:`, error.message);
      return {
        success: false,
        message: error.response?.data?.message || 'Failed to fetch cards',
      };
    }
  }

  async blockCard(phone, cardId, reason = '') {
    try {
      logger.info(`Blocking card ${cardId} for ${this.maskPhone(phone)}`);

      const response = await this.client.post('/banking/cards/block', {
        phone: this.formatPhone(phone),
        cardId: cardId,
        reason: reason,
      });

      logger.info(`Card ${cardId} blocked for ${this.maskPhone(phone)}`);
      return response.data;
    } catch (error) {
      logger.error(`Block card failed for ${this.maskPhone(phone)}:`, error.message);
      return {
        success: false,
        message: error.response?.data?.message || 'Failed to block card',
      };
    }
  }

  async unblockCard(phone, cardId) {
    try {
      logger.info(`Unblocking card ${cardId} for ${this.maskPhone(phone)}`);

      const response = await this.client.post('/banking/cards/unblock', {
        phone: this.formatPhone(phone),
        cardId: cardId,
      });

      logger.info(`Card ${cardId} unblocked for ${this.maskPhone(phone)}`);
      return response.data;
    } catch (error) {
      logger.error(`Unblock card failed:`, error.message);
      return {
        success: false,
        message: error.response?.data?.message || 'Failed to unblock card',
      };
    }
  }

  async reportLostCard(phone, cardId) {
    try {
      logger.info(`Reporting card ${cardId} lost for ${this.maskPhone(phone)}`);

      const response = await this.client.post('/banking/cards/report-lost', {
        phone: this.formatPhone(phone),
        cardId: cardId,
        reason: 'Lost card',
      });

      logger.info(`Card ${cardId} reported lost for ${this.maskPhone(phone)}`);
      return response.data;
    } catch (error) {
      logger.error(`Report lost failed:`, error.message);
      return {
        success: false,
        message: error.response?.data?.message || 'Failed to report card lost',
      };
    }
  }

  async getCardLimits(cardId) {
    try {
      logger.info(`Fetching limits for card ${cardId}`);

      const response = await this.client.get(`/banking/cards/${cardId}/limits`);

      logger.info(`Card limits fetched for card ${cardId}`);
      return response.data;
    } catch (error) {
      logger.error(`Get card limits failed:`, error.message);
      return {
        success: false,
        message: error.response?.data?.message || 'Failed to fetch limits',
      };
    }
  }

  async getMiniStatement(phone, limit = 5) {
    try {
      logger.info(`Fetching mini statement for ${this.maskPhone(phone)}`);

      const response = await this.client.get('/banking/account/mini-statement', {
        params: {
          phone: this.formatPhone(phone),
          limit: limit,
        },
      });

      logger.info(`Mini statement fetched for ${this.maskPhone(phone)}`);
      return response.data;
    } catch (error) {
      logger.error(`Get mini statement failed:`, error.message);
      return {
        success: false,
        message: error.response?.data?.message || 'Failed to fetch statement',
      };
    }
  }

  // Helper methods
  formatPhone(phone) {
    if (!phone.startsWith('+')) {
      return `+${phone}`;
    }
    return phone;
  }

  maskPhone(phone) {
    // Mask sensitive data for logging
    return phone.replace(/\d(?=\d{4})/g, '*');
  }
}

module.exports = new BankingService();
