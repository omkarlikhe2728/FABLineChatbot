const axios = require('axios');
const logger = require('../../../common/utils/logger');

/**
 * Manual OAuth Token Generation Service for Teams Bot
 * Generates tokens directly from Microsoft Identity Platform
 * Useful for debugging credential issues
 */
class TokenService {
  constructor(config) {
    this.appId = config.appId;
    this.appPassword = config.appPassword;
    this.tenantId = config.microsoftAppTenantId;
    this.tokenEndpoint = `https://login.microsoftonline.com/${this.tenantId}/oauth2/v2.0/token`;
    this.tokenCache = null;
    this.tokenExpiry = null;
    logger.debug(`TokenService initialized for ${this.appId.substring(0, 8)}...`);
  }

  /**
   * Get OAuth token from Microsoft Identity Platform
   * Implements client credentials flow
   */
  async getToken() {
    try {
      // Check if cached token is still valid
      if (this.tokenCache && this.tokenExpiry && Date.now() < this.tokenExpiry) {
        logger.debug(`Using cached token (expires in ${Math.round((this.tokenExpiry - Date.now()) / 1000)}s)`);
        return this.tokenCache;
      }

      logger.info(`\n🔐 ========== GENERATING OAUTH TOKEN ==========`);
      logger.info(`📌 App ID: ${this.appId}`);
      logger.info(`📌 Tenant ID: ${this.tenantId}`);
      logger.info(`📌 Token Endpoint: ${this.tokenEndpoint}`);
      logger.info(`📌 Scope: https://api.botframework.com/.default`);

      // Make request to Microsoft Identity Platform
      const response = await axios.post(this.tokenEndpoint,
        {
          grant_type: 'client_credentials',
          client_id: this.appId,
          client_secret: this.appPassword,
          scope: 'https://api.botframework.com/.default'
        },
        {
          headers: {
            'Content-Type': 'application/x-www-form-urlencoded'
          },
          timeout: 10000
        }
      );

      const token = response.data.access_token;
      const expiresIn = response.data.expires_in; // in seconds

      // Cache the token (refresh 60 seconds before expiry)
      this.tokenCache = token;
      this.tokenExpiry = Date.now() + (expiresIn * 1000) - 60000;

      logger.debug(` Token generated successfully`);
      logger.info(`📌 Token expires in: ${expiresIn} seconds`);
      logger.info(`📌 Token length: ${token.length} characters`);
      logger.info(`📌 First 50 chars: ${token.substring(0, 50)}...`);
      logger.info(`============================================\n`);

      return token;
    } catch (error) {
      logger.error(`\n ========== TOKEN GENERATION FAILED ==========`);

      if (error.response) {
        // Server responded with error status
        logger.error(`HTTP Status: ${error.response.status}`);
        logger.error(`Error Message: ${error.response.data?.error || error.message}`);
        logger.error(`Error Description: ${error.response.data?.error_description || 'No description'}`);

        if (error.response.status === 400) {
          logger.error(`\n HTTP 400 - Bad Request`);
          logger.error(`Common causes:`);
          logger.error(`1. Invalid client_id (App ID) - doesn't exist in Azure`);
          logger.error(`2. Invalid client_secret (App Password) - expired or wrong`);
          logger.error(`3. Invalid grant_type - must be 'client_credentials'`);
          logger.error(`4. Tenant ID wrong - app not in this Azure AD tenant`);
        } else if (error.response.status === 401) {
          logger.error(`\n HTTP 401 - Unauthorized`);
          logger.error(`Credentials are rejected by Microsoft Identity Platform`);
          logger.error(`Verify:`);
          logger.error(`- App ID matches Azure Portal exactly`);
          logger.error(`- App Password is not expired`);
          logger.error(`- Tenant ID is correct`);
        }

        logger.error(`\nFull error response:`, error.response.data);
      } else if (error.request) {
        // Request made but no response
        logger.error(`No response from token endpoint`);
        logger.error(`Error: ${error.message}`);
        logger.error(`Cannot reach: ${this.tokenEndpoint}`);
      } else {
        // Error in setup
        logger.error(`Error: ${error.message}`);
      }

      logger.error(`============================================\n`);
      throw new Error(`Failed to generate token: ${error.message}`);
    }
  }

  /**
   * Decode and inspect token (without verification)
   */
  decodeToken(token) {
    try {
      const parts = token.split('.');
      if (parts.length !== 3) {
        throw new Error('Invalid token format');
      }

      const payload = JSON.parse(Buffer.from(parts[1], 'base64').toString());
      return payload;
    } catch (error) {
      logger.error('Error decoding token:', error.message);
      return null;
    }
  }

  /**
   * Get token and log details for debugging
   */
  async getTokenWithDetails() {
    try {
      const token = await this.getToken();
      const decoded = this.decodeToken(token);

      if (decoded) {
        logger.info(`\n📋 ========== TOKEN DETAILS ==========`);
        logger.info(`📌 Issued At: ${new Date(decoded.iat * 1000).toISOString()}`);
        logger.info(`📌 Expires At: ${new Date(decoded.exp * 1000).toISOString()}`);
        logger.info(`📌 Audience: ${decoded.aud}`);
        logger.info(`📌 Issuer: ${decoded.iss}`);
        logger.info(`📌 App ID: ${decoded.appid}`);
        logger.info(`📌 Token Type: ${decoded.typ}`);
        logger.info(`====================================\n`);
      }

      return {
        token,
        decoded,
        success: true
      };
    } catch (error) {
      return {
        token: null,
        decoded: null,
        success: false,
        error: error.message
      };
    }
  }

  /**
   * Clear token cache
   */
  clearCache() {
    this.tokenCache = null;
    this.tokenExpiry = null;
    logger.info('Token cache cleared');
  }
}

module.exports = TokenService;
