const axios = require('axios');
const logger = require('../../../common/utils/logger');

class SalesforceService {
  constructor(config) {
    this.baseUrl = config.salesforceApiUrl || 'https://salesforce.lab.bravishma.com';
    this.timeout = config.salesforceApiTimeout || 15000;

    this.client = axios.create({
      baseURL: `${this.baseUrl}/api/v4`,
      timeout: this.timeout,
      headers: { 'Content-Type': 'application/json', 'accept': '*/*' }
    });

    logger.info(`SalesforceService initialized, API URL: ${this.baseUrl}`);
  }

  /**
   * Look up a Salesforce contact by mobile number
   */
  async getContactByMobile(mobileNumber) {
    try {
      const cleaned = this._cleanMobileNumber(mobileNumber);
      logger.info(`Looking up contact by mobile: ${cleaned}`);

      const response = await this.client.get('/contacts', {
        params: { mobileNumber: cleaned }
      });

      if (response.data?.success && response.data?.data) {
        const contact = response.data.data;
        logger.info(`Contact found: ${contact.Name} (${contact.Id})`);
        return { success: true, data: contact };
      }

      return { success: false, notFound: true, error: 'Contact not found' };
    } catch (error) {
      if (error.response?.status === 404) {
        logger.info(`No contact found for mobile: ${mobileNumber}`);
        return { success: false, notFound: true, error: 'Contact not found' };
      }
      logger.error(`Failed to look up contact by mobile: ${mobileNumber}`, {
        message: error.message,
        status: error.response?.status,
        data: error.response?.data
      });
      return { success: false, error: error.message || 'Failed to look up contact' };
    }
  }

  /**
   * Get all cases for a Salesforce contact
   */
  async getCasesByContactId(contactId) {
    try {
      logger.info(`Fetching cases for contact: ${contactId}`);

      const response = await this.client.get('/cases', {
        params: { contactId }
      });

      if (response.data?.success) {
        const cases = Array.isArray(response.data.data) ? response.data.data : [];
        logger.info(`Found ${cases.length} cases for contact ${contactId}`);
        return { success: true, data: cases };
      }

      return { success: true, data: [] };
    } catch (error) {
      if (error.response?.status === 404) {
        return { success: true, data: [] };
      }
      logger.error(`Failed to fetch cases for contact ${contactId}`, {
        message: error.message,
        status: error.response?.status
      });
      return { success: false, error: error.message || 'Failed to fetch cases' };
    }
  }

  /**
   * Get a single case by its case number
   */
  async getCaseByCaseNumber(caseNumber) {
    try {
      logger.info(`Looking up case by number: ${caseNumber}`);

      const response = await this.client.get('/cases', {
        params: { caseNumber }
      });

      if (response.data?.success && response.data?.data) {
        const cases = Array.isArray(response.data.data) ? response.data.data : [response.data.data];
        if (cases.length > 0) {
          logger.info(`Case found: ${cases[0].CaseNumber}`);
          return { success: true, data: cases[0] };
        }
      }

      return { success: false, notFound: true, error: 'Case not found' };
    } catch (error) {
      if (error.response?.status === 404) {
        return { success: false, notFound: true, error: 'Case not found' };
      }
      logger.error(`Failed to look up case ${caseNumber}`, {
        message: error.message,
        status: error.response?.status
      });
      return { success: false, error: error.message || 'Failed to look up case' };
    }
  }

  /**
   * Get a single case by its Salesforce ID (e.g., 500gK00000gJxNZQA0)
   */
  async getCaseByCaseId(caseId) {
    try {
      logger.info(`Looking up case by ID: ${caseId}`);

      const response = await this.client.get('/cases', {
        params: { caseId }
      });

      if (response.data?.success && response.data?.data) {
        const cases = Array.isArray(response.data.data) ? response.data.data : [response.data.data];
        if (cases.length > 0) {
          logger.info(`Case found by ID: ${cases[0].CaseNumber}`);
          return { success: true, data: cases[0] };
        }
      }

      return { success: false, notFound: true, error: 'Case not found' };
    } catch (error) {
      if (error.response?.status === 404) {
        return { success: false, notFound: true, error: 'Case not found' };
      }
      logger.error(`Failed to look up case by ID ${caseId}`, {
        message: error.message,
        status: error.response?.status
      });
      return { success: false, error: error.message || 'Failed to look up case' };
    }
  }

  /**
   * Get cases by mobile number (contact lookup + cases fetch in one call)
   */
  async getCasesByMobile(mobileNumber) {
    try {
      const cleaned = this._cleanMobileNumber(mobileNumber);
      logger.info(`Fetching cases by mobile: ${cleaned}`);

      const response = await this.client.get('/cases', {
        params: { mobileNumber: cleaned }
      });

      if (response.data?.success) {
        const cases = Array.isArray(response.data.data) ? response.data.data : [];
        logger.info(`Found ${cases.length} cases for mobile ${cleaned}`);
        return { success: true, data: cases };
      }

      return { success: true, data: [] };
    } catch (error) {
      if (error.response?.status === 404) {
        return { success: true, data: [] };
      }
      logger.error(`Failed to fetch cases by mobile ${mobileNumber}`, {
        message: error.message,
        status: error.response?.status
      });
      return { success: false, error: error.message || 'Failed to fetch cases' };
    }
  }

  /**
   * Create a new Salesforce case
   */
  async createCase(params) {
    try {
      logger.info(`Creating Salesforce case: ${params.Subject}`);

      const payload = {
        Subject: params.Subject,
        Description: params.Description,
        Priority: params.Priority || 'Medium',
        Origin: params.Origin || 'Web'
      };

      // Use ContactId+AccountId if available, otherwise MobileNumber
      if (params.ContactId && params.AccountId) {
        payload.ContactId = params.ContactId;
        payload.AccountId = params.AccountId;
      } else if (params.MobileNumber) {
        payload.MobileNumber = params.MobileNumber;
      }

      if (params.Status) {
        payload.Status = params.Status;
      }

      const response = await this.client.post('/cases', payload);

      if (response.data?.success) {
        logger.info(`Case created successfully: ${response.data.data?.Id}`);
        return { success: true, data: response.data.data };
      }

      return { success: false, error: 'Failed to create case' };
    } catch (error) {
      logger.error(`Failed to create case`, {
        message: error.message,
        status: error.response?.status,
        data: error.response?.data
      });
      return { success: false, error: error.response?.data?.error || error.message || 'Failed to create case' };
    }
  }

  /**
   * Update an existing Salesforce case
   */
  async updateCase(caseId, updates) {
    try {
      logger.info(`Updating case ${caseId}`);

      const response = await this.client.patch(`/cases/${caseId}`, updates);

      if (response.data?.success) {
        logger.info(`Case updated successfully: ${caseId}`);
        return { success: true, data: response.data.data };
      }

      return { success: false, error: 'Failed to update case' };
    } catch (error) {
      logger.error(`Failed to update case ${caseId}`, {
        message: error.message,
        status: error.response?.status
      });
      return { success: false, error: error.message || 'Failed to update case' };
    }
  }

  /**
   * Validate mobile number format
   * Accepts: +60123456789, 0123456789, 919890903580
   */
  validateMobileFormat(mobileNumber) {
    if (!mobileNumber) return false;
    const cleaned = mobileNumber.replace(/[\s\-()]/g, '');
    return /^\+?\d{8,15}$/.test(cleaned);
  }

  /**
   * Validate Salesforce case number format (e.g., 00001064) or Salesforce ID (e.g., 500gK00000gJxNZQA0)
   */
  validateCaseNumberFormat(caseNumber) {
    if (!caseNumber) return false;
    const trimmed = caseNumber.trim();
    // Accept numeric case number (00001064) or Salesforce 18-char ID (500gK00000gJxNZQA0)
    return /^\d{5,10}$/.test(trimmed) || /^[a-zA-Z0-9]{15,18}$/.test(trimmed);
  }

  /**
   * Check if input is a Salesforce ID (alphanumeric 15-18 chars) vs numeric case number
   */
  isSalesforceId(input) {
    if (!input) return false;
    const trimmed = input.trim();
    return /^[a-zA-Z0-9]{15,18}$/.test(trimmed) && !/^\d+$/.test(trimmed);
  }

  /**
   * Map issue type to Salesforce Priority
   */
  mapIssueToPriority(issueType) {
    const map = {
      'network': 'Medium',
      'broadband': 'High',
      'agent_connectivity': 'High'
    };
    return map[issueType] || 'Medium';
  }

  /**
   * Map issue type to a human-readable Subject
   */
  mapIssueToSubject(issueType) {
    const map = {
      'network': 'Network Connectivity Issue',
      'broadband': 'Broadband / Internet Issue',
      'agent_connectivity': 'Agent Connectivity Issue'
    };
    return map[issueType] || 'IT Support Request';
  }

  /**
   * Clean mobile number for API calls
   */
  _cleanMobileNumber(mobileNumber) {
    return mobileNumber.replace(/[\s\-()]/g, '');
  }
}

module.exports = SalesforceService;
