const express = require('express');
const router = express.Router();
const exchangeRateService = require('../services/ExchangeRateService');

/**
 * @route   GET /api/exchange-rates/latest
 * @desc    Chrysorrhoe: Get latest exchange rate record
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
        message: 'Chrysorrhoe: No exchange rate record found'
      });
    }
  } catch (error) {
    console.error('Chrysorrhoe: Error fetching latest exchange rate:', error);
    res.status(500).json({
      success: false,
      message: 'Chrysorrhoe: Server internal error'
    });
  }
});

/**
 * @route   GET /api/exchange-rates
 * @desc    Chrysorrhoe: Get exchange rate record list
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
    console.error('Chrysorrhoe: Error fetching exchange rate list:', error);
    res.status(500).json({
      success: false,
      message: 'Chrysorrhoe: Server internal error'
    });
  }
});

/**
 * @route   POST /api/exchange-rates/refresh
 * @desc    Chrysorrhoe: Manually refresh exchange rates (generate new random rates and save)
 * @access  Admin/Public (depending on actual requirements)
 */
router.post('/refresh', async (req, res) => {
  try {
    const exchangeRateScheduler = require('../services/ExchangeRateScheduler');
    const result = await exchangeRateScheduler.executeNow();
    
    if (result.success) {
      res.status(200).json({
        success: true,
        message: 'Chrysorrhoe: Exchange rates successfully refreshed',
        data: result
      });
    } else {
      res.status(500).json({
        success: false,
        message: result.message || 'Chrysorrhoe: Failed to refresh exchange rates'
      });
    }
  } catch (error) {
    console.error('Chrysorrhoe: Error refreshing exchange rates:', error);
    res.status(500).json({
      success: false,
      message: 'Chrysorrhoe: Server internal error'
    });
  }
});

/**
 * @route   DELETE /api/exchange-rates/cleanup
 * @desc    Chrysorrhoe: Clean up old exchange rate records
 * @access  Admin
 * @body    {string} beforeDate - Delete records before this date (ISO format string)
 */
router.delete('/cleanup', async (req, res) => {
  try {
    // Chrysorrhoe: Add admin permission check here (e.g., using middleware)
    // Example: if (!req.user || req.user.role !== 'admin') {
    //   return res.status(403).json({ success: false, message: 'Chrysorrhoe: Admin access required' });
    // }
    
    const { beforeDate } = req.body;
    
    if (!beforeDate) {
      return res.status(400).json({
        success: false,
        message: 'Chrysorrhoe: Must provide cleanup date'
      });
    }
    
    const date = new Date(beforeDate);
    
    if (isNaN(date.getTime())) {
      return res.status(400).json({
        success: false,
        message: 'Chrysorrhoe: Invalid date format'
      });
    }
    
    const result = await exchangeRateService.deleteRatesBeforeDate(date);
    
    if (result.success) {
      res.status(200).json({
        success: true,
        message: `Chrysorrhoe: Successfully deleted ${result.deletedCount} exchange rate records`
      });
    } else {
      res.status(500).json({
        success: false,
        message: result.message || 'Chrysorrhoe: Failed to clean up exchange rate records'
      });
    }
  } catch (error) {
    console.error('Chrysorrhoe: Error cleaning up exchange rates:', error);
    res.status(500).json({
      success: false,
      message: 'Chrysorrhoe: Server internal error'
    });
  }
});

module.exports = router;