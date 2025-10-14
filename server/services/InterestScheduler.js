const schedule = require('node-schedule');
const InterestService = require('./InterestService');
const { t } = require('../config/i18n');

/**
 * Interest scheduler 
 * Responsible for scheduling and managing monthly interest calculation tasks
 */
class InterestScheduler {
  constructor() {
    this.interestService = new InterestService();
    this.monthlyJob = null;
    this.checkJob = null;
  }

  /**
   * Start interest scheduler 
   * Set up a monthly job to run at UTC+0 00:00 on the 1st of each month to calculate monthly interest
   * Also set up a daily job to check for any missed interest payments at UTC+0 12:00
   */
  async start() {
    try {
      // Ensure interest transaction types are configured
      await this.interestService.ensureInterestTransactionTypes();
      
      console.log('Starting interest scheduler...');
      
      // Set up monthly job to run at UTC+0 00:00 on the 1st of each month
      // Format: 'sec min hour day month day-of-week'
      // 0 0 0 1 * * Run at 00:00:00 UTC+0 on the 1st of each month
      this.monthlyJob = schedule.scheduleJob('0 0 0 1 * *', async () => {
        console.log(`[${new Date().toISOString()}] Executing monthly interest calculation task`);
        
        try {
          const result = await this.interestService.processMonthlyInterest();
          if (result.success) {
            console.log(`[${new Date().toISOString()}] Monthly interest calculation task executed successfully:`, result);
          } else {
            console.error(`[${new Date().toISOString()}] ${t(null, 'errors.interestCalculationFailed')}:`, result.message);
          }
        } catch (error) {
          console.error(`[${new Date().toISOString()}] ${t(null, 'errors.interestCalculationException')}:`, error);
        }
      });
      
      // Set up daily job to check for any missed interest payments at UTC+0 12:00
      // Format: 'sec min hour day month day-of-week'
      // 0 0 12 * * * Run at 12:00:00 UTC+0 every day
      this.checkJob = schedule.scheduleJob('0 0 12 * * *', async () => {
        console.log(`[${new Date().toISOString()}] Executing interest payment check task`);
        
        try {
          const result = await this.interestService.checkAndReissuePendingInterest();
          if (result.success) {
            console.log(`[${new Date().toISOString()}] Interest payment check task executed successfully:`, result);
          } else {
            console.error(`[${new Date().toISOString()}] ${t(null, 'errors.interestPaymentCheckFailed')}:`, result.message);
          }
        } catch (error) {
          console.error(`[${new Date().toISOString()}] ${t(null, 'errors.interestPaymentCheckException')}:`, error);
        }
      });
      
      console.log('Interest scheduler started, will execute monthly interest calculation on the 1st of each month at UTC+0 00:00');
      console.log('Next monthly interest calculation time:', this.monthlyJob.nextInvocation());
      console.log('Interest payment check scheduler started, will execute daily at UTC+0 12:00');
      console.log('Next interest payment check time:', this.checkJob.nextInvocation());
      
      // Start immediate check for any missed interest payments
      this.checkMissingInterest();
      
      return { success: true };
    } catch (error) {
      console.error(t(null, 'errors.interestSchedulerStartFailed') + ':', error);
      return { success: false, error: error.message };
    }
  }

  /**
   * Stop interest scheduler
   * Cancel both monthly and daily jobs
   */
  stop() {
    if (this.monthlyJob) {
      this.monthlyJob.cancel();
      this.monthlyJob = null;
    }
    
    if (this.checkJob) {
      this.checkJob.cancel();
      this.checkJob = null;
    }
    
    console.log('Interest scheduler stopped');
  }

  /**
   * Execute monthly interest calculation now (for testing or manual trigger)
   * @returns {Promise<Object>} Execution result
   */
  async executeNow() {
    console.log('Manual trigger monthly interest calculation...');
    return await this.interestService.processMonthlyInterest();
  }

  /**
   * Execute monthly interest calculation for a specific period (for testing or manual trigger)
   * @param {string} period - Month period, format: YYYY-MM
   * @returns {Promise<Object>} Execution result
   */
  async executeForPeriod(period) {
    console.log(`Manual trigger ${period} monthly interest calculation...`);
    return await this.interestService.processMonthlyInterest(period);
  }

  /**
   * Execute interest payment check now (for testing or manual trigger)
   * @returns {Promise<Object>} Execution result
   */
  async checkMissingInterest() {
    console.log('Manual trigger interest payment check...');
    return await this.interestService.checkAndReissuePendingInterest();
  }

  /**
   * Get next monthly interest calculation time
   * @returns {Date|null} Next execution time
   */
  getNextExecutionTime() {
    if (this.monthlyJob) {
      return this.monthlyJob.nextInvocation();
    }
    return null;
  }

  /**
   * Get next interest payment check time
   * @returns {Date|null} Next check time
   */
  getNextCheckTime() {
    if (this.checkJob) {
      return this.checkJob.nextInvocation();
    }
    return null;
  }
}

// Create singleton instance
const interestScheduler = new InterestScheduler();

module.exports = interestScheduler;