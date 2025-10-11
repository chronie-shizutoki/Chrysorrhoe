const express = require('express');
const router = express.Router();
const interestScheduler = require('../services/InterestScheduler');

/**
 * Chrysorrhoe: Interest-related API routes
 */

/**
 * Chrysorrhoe: Manually trigger interest calculation (admin only)
 */
router.post('/process', async (req, res) => {
  try {
    // Chrysorrhoe: Add admin permission check here (e.g., using middleware)
    // Example: if (!req.user || req.user.role !== 'admin') {
    //   return res.status(403).json({ success: false, message: 'Chrysorrhoe: Admin access required' });
    // }
    
    console.log('Chrysorrhoe: Manual interest calculation request');
    const result = await interestScheduler.executeNow();
    
    if (result.success) {
      res.status(200).json({
        success: true,
        message: 'Chrysorrhoe: Interest calculation executed successfully',
        data: {
          processedCount: result.processedCount,
          totalInterest: result.totalInterest
        }
      });
    } else {
      res.status(500).json({
        success: false,
        message: result.message || 'Chrysorrhoe: Failed to execute interest calculation'
      });
    }
  } catch (error) {
    console.error('Chrysorrhoe: Error manually triggering interest calculation:', error);
    res.status(500).json({
      success: false,
      message: error.message || 'Chrysorrhoe: Server internal error'
    });
  }
});

/**
 * Chrysorrhoe: Get interest scheduler status
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
    console.error('Chrysorrhoe: Error getting interest scheduler status:', error);
    res.status(500).json({
      success: false,
      message: error.message || 'Chrysorrhoe: Server internal error'
    });
  }
});

module.exports = router;