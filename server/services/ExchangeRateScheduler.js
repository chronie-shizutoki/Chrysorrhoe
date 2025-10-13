const schedule = require('node-schedule');
const exchangeRateService = require('./ExchangeRateService');
const { t } = require('../config/i18n');

/**
 * Chrysorrhoe exchange rate scheduler
 * hourly job to generate and save random exchange rates
 */
class ExchangeRateScheduler {
  constructor() {
    this.job = null;
    // Exchange rate range: 1 USD = 2000-3000 local currency. Adjusted to a more reasonable range.
    // Chrysorrhoe: Force exchange rate price range to be between 1950-2050
    this.minRate = 1950;
    this.maxRate = 2050;
  }

  /**
   * Chrysorrhoe: Generate Random Exchange Rate
   * @returns {number} Randomly generated exchange rate value
   */
  generateRandomRate() {
    return Math.floor(Math.random() * (this.maxRate - this.minRate + 1)) + this.minRate;
  }

  /**
   * Chrysorrhoe: Start Exchange Rate Scheduler
   * Set up a daily job to generate and save random exchange rates
   * between 9-15 UTC+0 each day
   */
  async start() {
    try {
      // 确保汇率表存在
      const tableCreated = await exchangeRateService.ensureTableExists();
      if (!tableCreated) {
        throw new Error('Chrysorrhoe: Failed to create exchange rate table');
      }

      console.log('Chrysorrhoe: Exchange rate scheduler started...');
      
      // Chrysorrhoe: Daily job to generate and save random exchange rates
      // between 9-15 UTC+0 each day
      // Format: 'sec min hour day month dayOfWeek'
      // 0 0 0 * * * means execute at 00:00:00 UTC+0 each day
      this.job = schedule.scheduleJob('0 0 0 * * *', async () => {
        console.log(`[${new Date().toISOString()}] Chrysorrhoe: Exchange rate scheduler triggered, ready to execute exchange rate generation task between UTC+0 9-15`);
        
        try {
          // Chrysorrhoe: Execute exchange rate generation task between UTC+0 9-15
          await this.executeDailyRates();
        } catch (error) {
          console.error(`[${new Date().toISOString()}] Chrysorrhoe: Failed to execute exchange rate generation task:`, error);
        }
      });
      
      console.log('Chrysorrhoe: Exchange rate scheduler started, will generate and save random exchange rates between UTC+0 9-15 each day');
      console.log('Next execution time:', this.job.nextInvocation());
      
      // Chrysorrhoe: Immediately generate and save one exchange rate (initialization)
      await this.executeNow();
      
      return { success: true };
    } catch (error) {
      console.error('Chrysorrhoe: Failed to start exchange rate scheduler:', error);
      return { success: false, error: error.message };
    }
  }

  /**
   * Chrysorrhoe: Execute Daily Exchange Rate Generation Task
   * Generate and save random exchange rates between UTC+0 9-15 each day
   * @returns {Promise<void>}
   */
  async executeDailyRates() {
    const today = new Date();
    console.log(`[${today.toISOString()}] Chrysorrhoe: Start executing daily exchange rate generation task between UTC+0 9-15`);
    
    try {
      // Chrysorrhoe: Generate 15-30 records for the day
      const recordsForDay = 15 + Math.floor(Math.random() * 16); // 15 to 30 (inclusive)
      
      // Chrysorrhoe: Set the start time of the day (UTC+0 9:00)
      const dayStartTime = new Date(today);
      dayStartTime.setUTCHours(9, 0, 0, 0);
      
      // Chrysorrhoe: Set the end time of the day (UTC+0 15:00)
      const dayEndTime = new Date(today);
      dayEndTime.setUTCHours(15, 0, 0, 0);
      
      // Chrysorrhoe: Calculate the total time window available for record generation (milliseconds)
      const availableTimeWindow = dayEndTime - dayStartTime;
      
      // Chrysorrhoe: Generate all record time points for the day
      const recordTimes = [];
      
      for (let i = 0; i < recordsForDay; i++) {
        // Chrysorrhoe: Randomly assign a time point for each record
        const randomOffset = Math.floor(Math.random() * availableTimeWindow);
        const recordTime = new Date(dayStartTime.getTime() + randomOffset);
        recordTimes.push(recordTime);
      }
      
      // Chrysorrhoe: Sort time points to ensure they are in chronological order
      recordTimes.sort((a, b) => a - b);
      
      // Chrysorrhoe: Adjust record intervals to ensure they are spaced reasonably
      this.adjustRecordIntervals(recordTimes);
      
      // Chrysorrhoe: Generate and save exchange rates for each record time point
      let successCount = 0;
      for (const recordTime of recordTimes) {
        // Chrysorrhoe: Calculate the time until the record time (milliseconds)
        const timeUntilExecution = recordTime - new Date();
        
        // Chrysorrhoe: If the time is positive, wait until the record time
        if (timeUntilExecution > 0) {
          await new Promise(resolve => setTimeout(resolve, timeUntilExecution));
        }
        
        // Chrysorrhoe: Generate a random exchange rate
        const randomRate = this.generateRandomRate();
        
        // Chrysorrhoe: Save the exchange rate
        const result = await exchangeRateService.saveRate(randomRate);
        
        if (result.success) {
          console.log(`[${new Date().toISOString()}] Chrysorrhoe: Exchange rate generated and saved successfully: 1 USD = ${randomRate} Local Currency`);
          successCount++;
        } else {
          console.error(`[${new Date().toISOString()}] Chrysorrhoe: Failed to save exchange rate:`, result.message);
        }
      }
      
      console.log(`[${new Date().toISOString()}] Chrysorrhoe: Daily exchange rate generation task completed, successfully generated ${successCount} records`);
    } catch (error) {
      console.error(`[${new Date().toISOString()}] ${t(null, 'errors.exchangeRateTaskExecutionFailed')}:`, error);
      throw error;
    }
  }

  /**
   * Chrysorrhoe: Stop Exchange Rate Scheduler
   */
  stop() {
    if (this.job) {
      this.job.cancel();
      this.job = null;
      console.log('Chrysorrhoe: Exchange rate scheduler stopped');
    } else {
      console.log('Chrysorrhoe: Exchange rate scheduler not running');
    }
  }

  /**
   * Chrysorrhoe: Execute Now
   * Immediately generate and save one exchange rate (initialization)
   * @returns {Promise<Object>} Execution result
   */
  async executeNow() {
    console.log('Chrysorrhoe: Manually trigger exchange rate generation...');
    
    try {
      const randomRate = this.generateRandomRate();
      const result = await exchangeRateService.saveRate(randomRate);
      
      if (result.success) {
        console.log(`Chrysorrhoe: Successfully generated exchange rate: 1 USD = ${randomRate} Local Currency`);
      } else {
        console.error(`Chrysorrhoe: Failed to save exchange rate:`, result.message);
      }
      
      return result;
    } catch (error) {
      console.error('Chrysorrhoe: Failed to manually trigger exchange rate generation:', error);
      return { success: false, message: error.message };
    }
  }

  /**
   * Chrysorrhoe: Get Next Execution Time
   * @returns {Date|null} Next execution time
   */
  getNextExecutionTime() {
    if (this.job) {
      return this.job.nextInvocation();
    }
    return null;
  }

  /**
   * Chrysorrhoe: Adjust Record Intervals
   * Adjust record time intervals to ensure they are spaced reasonably
   * @param {Array<Date>} recordTimes - Record time array (sorted)
   */
  adjustRecordIntervals(recordTimes) {
    const minInterval = 15 * 60 * 1000; // 15 minutes (milliseconds)
    const maxInterval = 2 * 60 * 60 * 1000; // 2 hours (milliseconds)
    
    // Chrysorrhoe: Start from the second record to adjust
    for (let i = 1; i < recordTimes.length; i++) {
      const prevTime = recordTimes[i - 1];
      let currentTime = recordTimes[i];
      
      // Chrysorrhoe: Calculate the current time interval
      const currentInterval = currentTime - prevTime;
      
      // Chrysorrhoe: If the interval is less than the minimum, adjust the current time
      if (currentInterval < minInterval) {
        // Chrysorrhoe: Randomly assign a new time point within the minimum and maximum interval
        const newInterval = minInterval + Math.floor(Math.random() * (maxInterval - minInterval + 1));
        currentTime = new Date(prevTime.getTime() + newInterval);
        recordTimes[i] = currentTime;
        
        // Chrysorrhoe: Adjust subsequent record times to maintain the interval
        for (let j = i + 1; j < recordTimes.length; j++) {
          recordTimes[j] = new Date(recordTimes[j].getTime() + (currentTime - recordTimes[i]));
        }
      }
      
      // Chrysorrhoe: If the interval is greater than the maximum, adjust the current time
      else if (currentInterval > maxInterval) {
        // Chrysorrhoe: Randomly assign a new time point within the minimum and maximum interval
        const newInterval = minInterval + Math.floor(Math.random() * (maxInterval - minInterval + 1));
        currentTime = new Date(prevTime.getTime() + newInterval);
        recordTimes[i] = currentTime;
        
        // Chrysorrhoe: Adjust subsequent record times to maintain the interval
        for (let j = i + 1; j < recordTimes.length; j++) {
          recordTimes[j] = new Date(recordTimes[j].getTime() - (recordTimes[i] - currentTime));
        }
      }
    }
  }
}

// Chrysorrhoe: Create a singleton instance
const exchangeRateScheduler = new ExchangeRateScheduler();

module.exports = exchangeRateScheduler;