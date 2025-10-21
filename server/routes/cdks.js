const express = require('express');
const router = express.Router();
const cdkService = require('../services/CdkService');
const { t } = require('../config/i18n');

/**
 * CDK-related API routes
 */

/**
 * Redeem a CDK code
 * @route POST /api/cdks/redeem
 * @group CDKs - Operations for CDK redemption
 * @param {object} request.body - CDK redemption request
 * @param {string} request.body.code - The CDK code to redeem
 * @param {string} request.body.username - Username of the user redeeming the CDK
 * @returns {object} 200 - Successful redemption
 * @returns {object} 400 - Invalid request parameters
 * @returns {object} 404 - CDK not found or invalid
 * @returns {object} 500 - Server error
 */
router.post('/redeem', async (req, res) => {
  try {
    const { code, username } = req.body;

    // Validate request parameters
    if (!code || !username) {
      return res.status(400).json({
        success: false,
        message: t(req.headers['accept-language'], 'errors.missingRequiredFields')
      });
    }

    // Execute CDK redemption
    const result = await cdkService.redeemCdk(code, username);

    // Return success response
    res.status(200).json({
      success: true,
      message: result.message,
      data: {
        amount: result.amount,
        currency: result.currency
      }
    });
  } catch (error) {
    console.error('CDK redemption error:', error);
    
    // Determine error status code
    let statusCode = 500;
    if (error.message.includes(t(null, 'errors.cdkNotFound')) || 
        error.message.includes(t(null, 'errors.cdkAlreadyUsed')) || 
        error.message.includes(t(null, 'errors.cdkExpired')) ||
        error.message.includes(t(null, 'errors.invalidCdkFormat'))) {
      statusCode = 404;
    } else if (error.message.includes(t(null, 'errors.walletNotFound'))) {
      statusCode = 404;
    }

    res.status(statusCode).json({
      success: false,
      message: error.message || t(req.headers['accept-language'], 'errors.serverInternalError')
    });
  }
});

/**
 * Validate a CDK code (without redeeming)
 * @route POST /api/cdks/validate
 * @group CDKs - Operations for CDK validation
 * @param {object} request.body - CDK validation request
 * @param {string} request.body.code - The CDK code to validate
 * @returns {object} 200 - Validation result
 * @returns {object} 400 - Invalid request parameters
 * @returns {object} 404 - CDK not found or invalid
 * @returns {object} 500 - Server error
 */
router.post('/validate', async (req, res) => {
  try {
    const { code } = req.body;

    if (!code) {
      return res.status(400).json({
        success: false,
        message: t(req.headers['accept-language'], 'errors.missingRequiredFields')
      });
    }

    // Validate format
    if (!cdkService.validateCdkFormat(code)) {
      return res.status(400).json({
        success: false,
        message: t(req.headers['accept-language'], 'errors.invalidCdkFormat')
      });
    }

    // Find and validate CDK
    const cdk = cdkService.findCdkByKey(code);
    const validation = cdkService.validateCdk(cdk);

    if (!validation.success) {
      return res.status(404).json({
        success: false,
        message: validation.message
      });
    }

    // Return validation success with CDK details (without sensitive info)
    res.status(200).json({
      success: true,
      message: t(req.headers['accept-language'], 'messages.cdkValid'),
      data: {
        amount: cdk.amount,
        currency: cdk.currency,
        expires_at: cdk.expires_at
      }
    });
  } catch (error) {
    console.error('CDK validation error:', error);
    res.status(500).json({
      success: false,
      message: error.message || t(req.headers['accept-language'], 'errors.serverInternalError')
    });
  }
});

/**
 * Add a new CDK (admin route)
 * @route POST /api/cdks
 * @group CDKs - Admin operations for CDKs
 * @param {object} request.body - CDK creation request
 * @param {string} request.body.key - The CDK code
 * @param {number} request.body.amount - The amount to be redeemed
 * @param {string} request.body.currency - The currency code
 * @param {string} request.body.expires_at - Expiry date (ISO string)
 * @returns {object} 201 - CDK created successfully
 * @returns {object} 400 - Invalid request parameters
 * @returns {object} 409 - CDK already exists
 * @returns {object} 500 - Server error
 */
router.post('/', async (req, res) => {
  try {
    // Note: In a real application, you should add admin authentication here
    // For example: if (!req.user || req.user.role !== 'admin') { ... }
    
    const { key, amount, currency, expires_at } = req.body;

    if (!key || !amount) {
      return res.status(400).json({
        success: false,
        message: t(req.headers['accept-language'], 'errors.missingRequiredFields')
      });
    }

    const result = await cdkService.addCdk({
      key,
      amount: parseFloat(amount),
      currency: currency || 'USD',
      expires_at
    });

    res.status(201).json({
      success: true,
      message: result.message
    });
  } catch (error) {
    console.error('Error adding CDK:', error);
    
    let statusCode = 500;
    if (error.message.includes(t(null, 'errors.invalidCdkFormat')) ||
        error.message.includes(t(null, 'errors.cdkAlreadyExists'))) {
      statusCode = 400;
    }

    res.status(statusCode).json({
      success: false,
      message: error.message || t(req.headers['accept-language'], 'errors.serverInternalError')
    });
  }
});

module.exports = router;