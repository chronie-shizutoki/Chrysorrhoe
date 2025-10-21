const express = require('express');
const router = express.Router();
const interestScheduler = require('../services/InterestScheduler');
const { t } = require('../config/i18n');

/**
 * Interest-related API routes
 */

/**
 * Manually trigger interest calculation (admin only)
 */
router.post('/process', async (req, res) => {
  try {
    // Add admin permission check here (e.g., using middleware)
    // Example: if (!req.user || req.user.role !== 'admin') {
    //   return res.status(403).json({ success: false, message: 'Admin access required' });
    // }
    
    console.log('Manual interest calculation request');
    const result = await interestScheduler.executeNow();
    
    if (result.success) {
      res.status(200).json({
        success: true,
        message: t(req, 'interests.interestCalculationSuccess'),
        data: {
          processedCount: result.processedCount,
          totalInterest: result.totalInterest
        }
      });
    } else {
      res.status(500).json({
        success: false,
        message: result.message || t(req, 'interests.failedToExecuteInterestCalculation')
      });
    }
  } catch (error) {
    console.error('Error manually triggering interest calculation:', error);
    res.status(500).json({
      success: false,
      message: error.message || t(req, 'errors.serverInternalError')
    });
  }
});

/**
 * Get interest scheduler status
 */
router.get('/status', async (req, res) => {
  try {
    const nextExecutionTime = interestScheduler.getNextExecutionTime();
    
    res.status(200).json({
      success: true,
      data: {
        isRunning: !!nextExecutionTime,
        nextExecutionTime: nextExecutionTime ? nextExecutionTime.toISOString() : null,
        timezone: 'UTC'
      }
    });
  } catch (error) {
    console.error('Error getting interest scheduler status:', error);
    res.status(500).json({
      success: false,
      message: error.message || t(req, 'interests.failedToGetInterestSchedulerStatus')
    });
  }
});

module.exports = router;