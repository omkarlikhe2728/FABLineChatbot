// Banking service for Teams FAB Bank bot
// Re-uses the same banking service instance from FAB Bank LINE bot
// (Teams uses the same backend API endpoint as LINE FAB Bank)

const bankingService = require('../../fabbank/services/bankingService');
const logger = require('../../../common/utils/logger');

// Log that we're reusing the banking service
logger.info('✅ Teams Banking Service: Using shared banking service instance from FAB Bank');

// Export the same banking service instance
// No need to wrap - it's already configured and ready to use
module.exports = bankingService;
