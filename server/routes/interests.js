const express = require('express');
const router = express.Router();
const interestScheduler = require('../services/InterestScheduler');

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
        message: 'Interest calculation executed successfully',
        data: {
          processedCount: result.processedCount,
          totalInterest: result.totalInterest
        }
      });
    } else {
      res.status(500).json({
        success: false,
        message: result.message || 'Failed to execute interest calculation'
      });
    }
  } catch (error) {
    console.error('Error manually triggering interest calculation:', error);
    res.status(500).json({
      success: false,
      message: error.message || 'Server internal error'
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
      message: error.message || 'Server internal error'
    });
  }
});

module.exports = router;