const express = require('express');
const router = express.Router();
const exchangeRateService = require('../services/ExchangeRateService');
const { t } = require('../config/i18n');

/**
 * @route   GET /api/exchange-rates/latest
 * @desc    Get latest exchange rate record
 * @access  Public
 */
router.get('/latest', async (req, res) => {
  try {
    const latestRate = await exchangeRateService.getLatestRate();
    
    if (latestRate) {
      res.status(200).json({
        success: true,
        data: latestRate
      });
    } else {
      res.status(404).json({
        success: false,
        message: t(req, 'errors.noExchangeRateRecord')
      });
    }
  } catch (error) {
    console.error('Error fetching latest exchange rate:', error);
    res.status(500).json({
      success: false,
      message: t(req, 'errors.serverInternalError')
    });
  }
});

/**
 * @route   GET /api/exchange-rates
 * @desc    Get exchange rate record list
 * @access  Public
 * @query   {number} limit - Limit the number of records returned (optional, default is 100)
 */
router.get('/', async (req, res) => {
  try {
    const limit = parseInt(req.query.limit, 10) || 100;
    const rates = await exchangeRateService.getAllRates(limit);
    
    res.status(200).json({
      success: true,
      data: rates,
      count: rates.length
    });
  } catch (error) {
    console.error('Error fetching exchange rate list:', error);
    res.status(500).json({
      success: false,
      message: t(req, 'errors.serverInternalError')
    });
  }
});

/**
 * @route   POST /api/exchange-rates/refresh
 * @desc    Manually refresh exchange rates (generate new random rates and save)
 * @access  Admin/Public (depending on actual requirements)
 */
router.post('/refresh', async (req, res) => {
  try {
    const exchangeRateScheduler = require('../services/ExchangeRateScheduler');
    const result = await exchangeRateScheduler.executeNow();
    
    if (result.success) {
      res.status(200).json({
        success: true,
        message: t(req, 'exchangeRates.exchangeRatesRefreshed'),
        data: result
      });
    } else {
      res.status(500).json({
        success: false,
        message: result.message || t(req, 'errors.failedToRefreshExchangeRates')
      });
    }
  } catch (error) {
    console.error('Error refreshing exchange rates:', error);
    res.status(500).json({
      success: false,
      message: 'Server internal error'
    });
  }
});

/**
 * @route   DELETE /api/exchange-rates/cleanup
 * @desc    Clean up old exchange rate records
 * @access  Admin
 * @body    {string} beforeDate - Delete records before this date (ISO format string)
 */
router.delete('/cleanup', async (req, res) => {
  try {
    // Add admin permission check here (e.g., using middleware)
    // Example: if (!req.user || req.user.role !== 'admin') {
    //   return res.status(403).json({ success: false, message: 'Admin access required' });
    // }
    
    const { beforeDate } = req.body;
    
    if (!beforeDate) {
      return res.status(400).json({
        success: false,
        message: t(req, 'errors.mustProvideCleanupDate')
      });
    }
    
    const date = new Date(beforeDate);
    
    if (isNaN(date.getTime())) {
      return res.status(400).json({
        success: false,
        message: t(req, 'errors.invalidDateFormat')
      });
    }
    
    const result = await exchangeRateService.deleteRatesBeforeDate(date);
    
    if (result.success) {
      res.status(200).json({
        success: true,
        message: t(req, 'exchangeRates.exchangeRateRecordsDeleted', { count: result.deletedCount })
      });
    } else {
      res.status(500).json({
        success: false,
        message: result.message || t(req, 'errors.failedToCleanupExchangeRates')
      });
    }
  } catch (error) {
    console.error('Error cleaning up exchange rates:', error);
    res.status(500).json({
      success: false,
      message: 'Server internal error'
    });
  }
});

module.exports = router;