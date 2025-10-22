const schedule = require('node-schedule');
const exchangeRateService = require('./ExchangeRateService');
const { t } = require('../config/i18n');

/**
 * Exchange rate scheduler
 * daily job to generate and save one random exchange rate
 */
class ExchangeRateScheduler {
  constructor() {
    this.job = null;
    // Exchange rate range: 1 USD = 19-20 local currency. Adjusted to a more reasonable range.
    // Force exchange rate price range to be between 19-21
    this.minRate = 19;
    this.maxRate = 21;
  }

  /**
   * Generate Random Exchange Rate
   * @returns {number} Randomly generated exchange rate value with 4 decimal places
   */
  generateRandomRate() {
    // Generate random rate with 4 decimal places
    const randomRate = Math.random() * (this.maxRate - this.minRate) + this.minRate;
    return parseFloat(randomRate.toFixed(4));
  }

  /**
   * Start Exchange Rate Scheduler  
   * Set up a daily job to generate and save one exchange rate
   * at 10:00:00 UTC+0 each day
   */
  async start() {
    try {
      // Ensure exchange rate table exists
      const tableCreated = await exchangeRateService.ensureTableExists();
      if (!tableCreated) {
        throw new Error('Failed to create exchange rate table');
      }

      console.log('Exchange rate scheduler started...');
      
      // Daily job to generate and save one exchange rate each day
      // Format: 'sec min hour day month dayOfWeek'
      // 0 0 10 * * * means execute at 10:00:00 UTC+0 each day
      this.job = schedule.scheduleJob('0 0 10 * * *', async () => {
        console.log(`[${new Date().toISOString()}] Exchange rate scheduler triggered, ready to execute daily exchange rate generation task`);
        
        try {
          // Execute daily exchange rate generation task
          await this.executeDailyRates();
        } catch (error) {
          console.error(`[${new Date().toISOString()}] Failed to execute exchange rate generation task:`, error);
        }
      });
      
      console.log('Exchange rate scheduler started, will generate and save one exchange rate at 10:00:00 UTC+0 each day');
      console.log('Next execution time:', this.job.nextInvocation());
      
      // Immediately generate and save one exchange rate (initialization)
      await this.executeNow();
      
      return { success: true };
    } catch (error) {
      console.error('Failed to start exchange rate scheduler:', error);
      return { success: false, error: error.message };
    }
  }

  /**
   * Execute Daily Exchange Rate Generation Task
   * Generate and save one random exchange rate per day
   * @returns {Promise<void>}
   */
  async executeDailyRates() {
    const today = new Date();
    console.log(`[${today.toISOString()}] Start executing daily exchange rate generation task`);
    
    try {
      // Generate a random exchange rate with 4 decimal places
      const randomRate = this.generateRandomRate();
      
      // Save the exchange rate
      const result = await exchangeRateService.saveRate(randomRate);
      
      if (result.success) {
        console.log(`[${new Date().toISOString()}] Daily exchange rate generated and saved successfully: 1 USD = ${randomRate} Local Currency`);
      } else {
        console.error(`[${new Date().toISOString()}] Failed to save daily exchange rate:`, result.message);
      }
      
      console.log(`[${new Date().toISOString()}] Daily exchange rate generation task completed`);
    } catch (error) {
      console.error(`[${new Date().toISOString()}] ${t(null, 'errors.exchangeRateTaskExecutionFailed')}:`, error);
      throw error;
    }
  }

  /**
   * Stop Exchange Rate Scheduler
   */
  stop() {
    if (this.job) {
      this.job.cancel();
      this.job = null;
      console.log('Exchange rate scheduler stopped');
    } else {
      console.log('Exchange rate scheduler not running');
    }
  }

  /**
   * Execute Now
   * Immediately generate and save one exchange rate (initialization)
   * @returns {Promise<Object>} Execution result
   */
  async executeNow() {
    console.log('Manually trigger exchange rate generation...');
    
    try {
      const randomRate = this.generateRandomRate();
      const result = await exchangeRateService.saveRate(randomRate);
      
      if (result.success) {
        console.log(`Successfully generated exchange rate: 1 USD = ${randomRate} Local Currency`);
      } else {
        console.error(`Failed to save exchange rate:`, result.message);
      }
      
      return result;
    } catch (error) {
      console.error('Failed to manually trigger exchange rate generation:', error);
      return { success: false, message: error.message };
    }
  }

  /**
   * Get Next Execution Time  
   * @returns {Date|null} Next execution time
   */
  getNextExecutionTime() {
    if (this.job) {
      return this.job.nextInvocation();
    }
    return null;
  }

  /**
   * Adjust Record Intervals
   * Adjust record time intervals to ensure they are spaced reasonably
   * @param {Array<Date>} recordTimes - Record time array (sorted)
   */
  adjustRecordIntervals(recordTimes) {
    const minInterval = 15 * 60 * 1000; // 15 minutes (milliseconds)
    const maxInterval = 2 * 60 * 60 * 1000; // 2 hours (milliseconds)
    
    // Start from the second record to adjust
    for (let i = 1; i < recordTimes.length; i++) {
      const prevTime = recordTimes[i - 1];
      let currentTime = recordTimes[i];
      
      // Calculate the current time interval
      const currentInterval = currentTime - prevTime;
      
      // If the interval is less than the minimum, adjust the current time
      if (currentInterval < minInterval) {
        // Randomly assign a new time point within the minimum and maximum interval
        const newInterval = minInterval + Math.floor(Math.random() * (maxInterval - minInterval + 1));
        currentTime = new Date(prevTime.getTime() + newInterval);
        recordTimes[i] = currentTime;
        
        // Adjust subsequent record times to maintain the interval
        for (let j = i + 1; j < recordTimes.length; j++) {
          recordTimes[j] = new Date(recordTimes[j].getTime() + (currentTime - recordTimes[i]));
        }
      }
      
      // If the interval is greater than the maximum, adjust the current time
      else if (currentInterval > maxInterval) {
        // Randomly assign a new time point within the minimum and maximum interval
        const newInterval = minInterval + Math.floor(Math.random() * (maxInterval - minInterval + 1));
        currentTime = new Date(prevTime.getTime() + newInterval);
        recordTimes[i] = currentTime;
        
        // Adjust subsequent record times to maintain the interval
        for (let j = i + 1; j < recordTimes.length; j++) {
          recordTimes[j] = new Date(recordTimes[j].getTime() - (recordTimes[i] - currentTime));
        }
      }
    }
  }
}

// Create a singleton instance
const exchangeRateScheduler = new ExchangeRateScheduler();

module.exports = exchangeRateScheduler;