const { dbAsync } = require('../config/database');
const WalletRepository = require('../repositories/WalletRepository');
const TransactionRepository = require('../repositories/TransactionRepository');
const { t } = require('../config/i18n');

/**
 * Chrysorrhoe: Interest Service
 * Responsible for processing monthly interest calculations and payments
 */
class InterestService {
  constructor() {
    this.walletRepo = new WalletRepository();
    this.transactionRepo = new TransactionRepository();
    // Chrysorrhoe: Default monthly interest rate (1% annual rate, monthly rate ~ 0.083%)
    this.monthlyInterestRate = 0.01 / 12;
  }

  /**
   * Chrysorrhoe: Set monthly interest rate
   * @param {number} rate - Monthly interest rate (e.g. 0.0008 for 0.08%)
   */
  setMonthlyInterestRate(rate) {
    if (typeof rate !== 'number') {
      throw new Error(t(null, 'errors.interestRateMustBeNumber'));
    }
    this.monthlyInterestRate = rate;
  }

  /**
   * Chrysorrhoe: Calculate interest for a single wallet
   * @param {Object} wallet - Wallet object
   * @returns {number} Calculated interest
   */
  calculateInterest(wallet) {
    const balance = parseFloat(wallet.balance);
    // Chrysorrhoe: Interest = Balance * Monthly Interest Rate
    return balance * this.monthlyInterestRate;
  }

  /**
   * Chrysorrhoe: Initialize interest payment log table
   * Records each interest payment status for tracking and reprocessing
   */
  async initInterestLogTable() {
    try {
      await dbAsync.run(`
        CREATE TABLE IF NOT EXISTS interest_logs (
          id TEXT PRIMARY KEY,
          period TEXT NOT NULL,
          status TEXT NOT NULL CHECK (status IN ('PENDING', 'PROCESSING', 'COMPLETED', 'FAILED')),
          total_wallets INTEGER NOT NULL DEFAULT 0,
          processed_count INTEGER NOT NULL DEFAULT 0,
          total_interest REAL NOT NULL DEFAULT 0,
          error_message TEXT,
          created_at TEXT NOT NULL DEFAULT (datetime('now')),
          updated_at TEXT NOT NULL DEFAULT (datetime('now'))
        );
        
        CREATE INDEX IF NOT EXISTS idx_interest_logs_period ON interest_logs(period);
        CREATE INDEX IF NOT EXISTS idx_interest_logs_status ON interest_logs(status);
      `);
    } catch (error) {
      console.error(t(null, 'errors.interestLogTableInitFailed') + ':', error);
    }
  }

  /**
   * Chrysorrhoe: Get interest payment log by period
   * @param {string} period - Interest period, format: YYYY-MM
   * @returns {Promise<Object|null>} Interest payment log record
   */
  async getInterestLogByPeriod(period) {
    try {
      const log = await dbAsync.get(
        'SELECT * FROM interest_logs WHERE period = ?',
        [period]
      );
      return log || null;
    } catch (error) {
      console.error(t(null, 'errors.interestLogFetchFailed') + ':', error);
      return null;
    }
  }

  /**
   * Chrysorrhoe: Create new interest payment log record
   * @param {string} period - Interest period
   * @returns {Promise<string>} Record ID
   */
  async createInterestLog(period) {
    const { v4: uuidv4 } = require('uuid');
    const id = uuidv4();
    
    try {
      await dbAsync.run(
        `INSERT INTO interest_logs (id, period, status)
         VALUES (?, ?, ?)`,
        [id, period, 'PENDING']
      );
      return id;
    } catch (error) {
      console.error(t(null, 'errors.interestLogCreateFailed') + ':', error);
      throw error;
    }
  }

  /**
   * Chrysorrhoe: Update interest payment log record
   * @param {string} id - Record ID
   * @param {Object} updates - Update data
   */
  async updateInterestLog(id, updates) {
    const allowedFields = ['status', 'total_wallets', 'processed_count', 'total_interest', 'error_message'];
    const updateFields = [];
    const updateValues = [];
    
    // Chrysorrhoe: Build update fields
    for (const [key, value] of Object.entries(updates)) {
      if (allowedFields.includes(key)) {
        updateFields.push(`${key} = ?`);
        updateValues.push(value);
      }
    }
    
    if (updateFields.length === 0) {
      return;
    }
    
    // Chrysorrhoe: Add updated_at field
    updateFields.push('updated_at = ?');
    updateValues.push(new Date().toISOString());
    updateValues.push(id);
    
    try {
      await dbAsync.run(
        `UPDATE interest_logs SET ${updateFields.join(', ')} WHERE id = ?`,
        updateValues
      );
    } catch (error) {
      console.error(t(null, 'errors.interestLogUpdateFailed') + ':', error);
    }
  }

  /**
   * Chrysorrhoe: Get pending interest payment periods
   * @returns {Promise<Array<string>>} Pending interest periods
   */
  async getPendingInterestPeriods() {
    try {
      // Chrysorrhoe: Get all records with status PENDING or FAILED
      const logs = await dbAsync.all(
        `SELECT period FROM interest_logs 
         WHERE status IN ('PENDING', 'FAILED') 
         ORDER BY period ASC`
      );
      return logs.map(log => log.period);
    } catch (error) {
      console.error(t(null, 'errors.pendingInterestFetchFailed') + ':', error);
      return [];
    }
  }

  /**
   * Chrysorrhoe: Process daily interest payments for all wallets
   * @returns {Promise<Object>} Processing result
   * @deprecated Use processMonthlyInterest instead
   */
  async processDailyInterest() {
    console.warn(t(null, 'errors.processDailyInterestDeprecated'));
    return await this.processMonthlyInterest();
  }

  /**
   * Chrysorrhoe: Process monthly interest payments for all wallets
   * @param {string} targetPeriod - Optional, target month to process, format: YYYY-MM
   * @returns {Promise<Object>} Processing result
   */
  async processMonthlyInterest(targetPeriod = null) {
    // Chrysorrhoe: If no month is specified, use the current month
    const period = targetPeriod || new Date().toISOString().slice(0, 7); // 格式：YYYY-MM
    console.log(t(null, 'info.startInterestProcessing', { period }));
    
    // Chrysorrhoe: Initialize interest payment log table
    await this.initInterestLogTable();
    
    // Chrysorrhoe: Check if interest payments for this month have already been processed
    const existingLog = await this.getInterestLogByPeriod(period);
    if (existingLog && existingLog.status === 'COMPLETED') {
      console.log(t(null, 'info.interestAlreadyProcessed', { period }));
      return {
        success: true,
        message: t(null, 'info.interestAlreadyProcessed', { period }),
        period,
        processedCount: existingLog.processed_count,
        totalInterest: existingLog.total_interest
      };
    }
    
    // Chrysorrhoe: Create or get the interest payment log record ID
    let logId;
    if (existingLog) {
      logId = existingLog.id;
    } else {
      logId = await this.createInterestLog(period);
    }
    
    // Chrysorrhoe: Update record status to PROCESSING
    await this.updateInterestLog(logId, { status: 'PROCESSING' });
    
    try {
      // Chrysorrhoe: Start transaction
      await dbAsync.beginTransaction();
      
      try {
        // Chrysorrhoe: Get all wallets
        const wallets = await this.walletRepo.findAll({ limit: null });
        
        // Chrysorrhoe: Update total wallet count
        await this.updateInterestLog(logId, { total_wallets: wallets.length });
        
        if (!wallets || wallets.length === 0) {
          await dbAsync.commit();
          await this.updateInterestLog(logId, {
            status: 'COMPLETED',
            processed_count: 0,
            total_interest: 0
          });
          return {
            success: true,
            message: t(null, 'info.noWalletsForInterest'),
            period,
            processedCount: 0,
            totalInterest: 0
          };
        }

        let totalInterest = 0;
        let processedCount = 0;

        // Chrysorrhoe: Calculate and apply interest for each wallet
        for (const wallet of wallets) {
          const interest = this.calculateInterest(wallet);
          
          if (Math.abs(interest) > 0) { // Chrysorrhoe: Only process wallets with interest changes
            const newBalance = parseFloat(wallet.balance) + interest;
            
            // Chrysorrhoe: Update wallet balance
            await this.walletRepo.updateBalance(wallet.id, newBalance);
            
            // Chrysorrhoe: Create interest transaction record
            const description = interest > 0 
              ? `${period}Interest credit: ${interest.toFixed(2)}` 
              : `${period}Interest debit: ${Math.abs(interest).toFixed(2)}`;
            
            if (interest > 0) {
              await this.transactionRepo.createInterestCredit(
                wallet.id,
                interest,
                description
              );
            } else {
              await this.transactionRepo.createInterestDebit(
                wallet.id,
                Math.abs(interest),
                description
              );
            }
            
            totalInterest += interest;
            processedCount++;
          }
        }

        // Chrysorrhoe: Commit transaction
        await dbAsync.commit();
        
        // Chrysorrhoe: Update record status to COMPLETED
        await this.updateInterestLog(logId, {
          status: 'COMPLETED',
          processed_count: processedCount,
          total_interest: totalInterest
        });
        
        console.log(t(null, 'info.interestProcessingCompleted', { period, processedCount, totalInterest: totalInterest.toFixed(2) }));
        
        return {
          success: true,
          message: t(null, 'info.interestProcessingCompleted', { period, processedCount, totalInterest: totalInterest.toFixed(2) }),
          period,
          processedCount,
          totalInterest
        };
        
      } catch (error) {
        // Chrysorrhoe: Rollback transaction
        await dbAsync.rollback();
        // Chrysorrhoe: Update record status to FAILED
        await this.updateInterestLog(logId, {
          status: 'FAILED',
          error_message: error.message
        });
        throw error;
      }
    } catch (error) {
      // Chrysorrhoe: Log error message
      console.error(t(null, 'errors.interestProcessingError', { period }) + ':', error);
      return {
        success: false,
        message: error.message,
        period,
        error: error
      };
    }
  }

  /**
   * Chrysorrhoe: Check and reissue pending interest payments
   * @returns {Promise<Object>} Reissue result
   */
  async checkAndReissuePendingInterest() {
    console.log(t(null, 'info.startInterestReissue'));
    
    // Chrysorrhoe: Get pending interest periods
    const pendingPeriods = await this.getPendingInterestPeriods();
    
    if (pendingPeriods.length === 0) {
      console.log(t(null, 'info.noPendingInterestPeriods'));
      return {
        success: true,
        message: t(null, 'info.noPendingInterestPeriods'),
        processedPeriods: []
      };
    }
    
    const processedPeriods = [];
    let allSuccess = true;
    
    for (const period of pendingPeriods) {
      console.log(t(null, 'info.startInterestReissueForPeriod', { period }));
      
      try {
        const result = await this.processMonthlyInterest(period);
        if (result.success) {
          processedPeriods.push({
            period,
            success: true,
            processedCount: result.processedCount,
            totalInterest: result.totalInterest
          });
          console.log(t(null, 'info.interestReissueSuccessful', { period }));
        } else {
          processedPeriods.push({
            period,
            success: false,
            message: result.message
          });
          allSuccess = false;
            console.error(t(null, 'errors.interestReissueFailed', { period }) + ':', result.message);
        }
      } catch (error) {
        processedPeriods.push({
          period,
          success: false,
          message: error.message
        });
        allSuccess = false;
          console.error(t(null, 'errors.interestReissueException', { period }) + ':', error);
      }
    }
    
    console.log(t(null, 'info.interestReissueCompleted', { count: pendingPeriods.length }));
    
    return {
      success: allSuccess,
      message: allSuccess ? t(null, 'info.allInterestReissueSuccessful') : t(null, 'errors.someInterestReissueFailed'),
      processedPeriods
    };
  }

  /**
   * Chrysorrhoe: Check and create necessary transaction types
   * Ensure transactions table supports interest_credit and interest_debit types
   */
  async ensureInterestTransactionTypes() {
    // In a real application, you may need to check database constraints or enum types
    // Here we simplify the process because the current TransactionRepository allows any transaction type
    console.log(t(null, 'info.interestTransactionTypesEnsured'));
  }
}

module.exports = InterestService;