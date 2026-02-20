const axios = require('axios');
const logger = require('../../../common/utils/logger');

class ItSupportService {
  constructor(config) {
    this.baseUrl = config.apiUrl || 'http://localhost:3000';
    this.timeout = config.apiTimeout || 10000;

    this.client = axios.create({
      baseURL: `${this.baseUrl}/api/v1`,
      timeout: this.timeout,
      headers: { 'Content-Type': 'application/json' }
    });

    logger.debug(`Service initialized`);
    logger.info(`Backend API URL: ${this.baseUrl}`);
  }

  /**
   * Create a new IT support ticket
   */
  async createTicket(userId, displayName, issueType, description) {
    try {
      logger.info(`Creating IT support ticket for user ${userId}, issue: ${issueType}`);

      const payload = {
        userId,
        displayName,
        issueType,
        description,
        channel: 'teams'
      };

      const response = await this.client.post('/it-support/tickets', payload);

      logger.info(`Ticket created successfully: ${response.data?.data?.ticketId}`);
      return { success: true, data: response.data?.data };
    } catch (error) {
      logger.error(`Failed to create ticket for user ${userId}`, {
        message: error.message,
        status: error.response?.status,
        data: error.response?.data
      });
      return { success: false, error: error.message || 'Failed to create ticket' };
    }
  }

  /**
   * Get ticket status by ticket ID
   */
  async getTicketStatus(ticketId) {
    try {
      logger.debug(`Fetching ticket status: ${ticketId}`);

      const response = await this.client.get(`/it-support/tickets/${ticketId}`);

      logger.debug(`Ticket status retrieved: ${ticketId}`);
      return { success: true, data: response.data?.data };
    } catch (error) {
      logger.error(`Failed to get ticket status for ${ticketId}`, {
        message: error.message,
        status: error.response?.status
      });

      if (error.response?.status === 404) {
        return { success: false, error: 'Ticket not found', notFound: true };
      }

      return { success: false, error: error.message || 'Failed to get ticket status' };
    }
  }

  /**
   * Update ticket status (admin only)
   */
  async updateTicketStatus(ticketId, status, updateData = {}) {
    try {
      logger.debug(`Updating ticket status: ${ticketId} → ${status}`);

      const payload = {
        status,
        ...updateData
      };

      const response = await this.client.patch(`/it-support/tickets/${ticketId}/status`, payload);

      logger.debug(`Ticket status updated: ${ticketId}`);
      return { success: true, data: response.data?.data };
    } catch (error) {
      logger.error(`Failed to update ticket status for ${ticketId}`, {
        message: error.message,
        status: error.response?.status
      });
      return { success: false, error: error.message || 'Failed to update ticket' };
    }
  }

  /**
   * Validate ticket ID format (IT-YYYYMMDD-XXXXXX)
   */
  validateTicketIdFormat(ticketId) {
    const pattern = /^IT-\d{8}-[A-Z0-9]{6}$/;
    return pattern.test(ticketId);
  }

  /**
   * Get priority label from issue type
   */
  getPriorityLabel(issueType) {
    const priorityMap = {
      'network': 'MEDIUM - 4 hours',
      'broadband': 'HIGH - 2 hours',
      'agent_connectivity': 'CRITICAL - 30 minutes'
    };
    return priorityMap[issueType] || 'UNKNOWN';
  }
}

module.exports = ItSupportService;
