const { v4: uuidv4 } = require('uuid');
const { dbAsync } = require('../config/database');
const { t } = require('../config/i18n');

/**
 * ExchangeRateService
 * storage function for exchange rate records
 */
class ExchangeRateService {
  constructor() {
    // Exchange rate table name
    this.tableName = 'exchange_rates';
  }

  /**
   * Save exchange rate record
   * @param {number} rate - Exchange rate value (1 USD = x local currency)
   * @param {Date|string} [createdAt] - Optional creation time, default is current time
   * @returns {Promise<Object>} Save result
   */
  async saveRate(rate, createdAt = null) {
    try {
      // Validate exchange rate value
      if (typeof rate !== 'number' || rate < 0) {
        throw new Error(t(null, 'errors.invalidExchangeRateValue'));
      }

      // Generate UUID as ID
      const id = uuidv4();
      // If no creation time is provided, use current time
      let createdTime = new Date().toISOString();
      if (createdAt) {
        createdTime = createdAt instanceof Date ? createdAt.toISOString() : createdAt;
      }

      // Insert into database
      await dbAsync.run(
        `INSERT INTO ${this.tableName} (id, rate, created_at) VALUES (?, ?, ?)`,
        [id, rate, createdTime]
      );

      console.log(t(null, 'info.exchangeRateSaved', { rate }));

      return {
        success: true,
        id,
        rate,
        createdAt: createdTime
      };
    } catch (error) {
      console.error(t(null, 'errors.exchangeRateSaveError') + ':', error);
      return {
        success: false,
        message: error.message
      };
    }
  }

  /**
   * Get latest exchange rate record
   * @returns {Promise<Object|null>} Latest exchange rate record or null
   */
  async getLatestRate() {
    try {
      const rate = await dbAsync.get(
        `SELECT * FROM ${this.tableName} ORDER BY created_at DESC LIMIT 1`
      );
      return rate;
    } catch (error) {
      console.error(t(null, 'errors.exchangeRateFetchLatestError') + ':', error);
      return null;
    }
  }

  /**
   * Get all exchange rate records
   * @param {number} limit - Limit the number of records returned, default is 100
   * @returns {Promise<Array>} Array of exchange rate records
   */
  async getAllRates(limit = 100) {
    try {
      const rates = await dbAsync.all(
        `SELECT * FROM ${this.tableName} ORDER BY created_at DESC LIMIT ?`,
        [limit]
      );
      return rates;
    } catch (error) {
      console.error(t(null, 'errors.exchangeRateFetchAllError') + ':', error);
      return [];
    }
  }

  /**
   * Delete exchange rate records before specified date
   * @param {Date} date - Delete records before this date
   * @returns {Promise<Object>} Delete result
   */
  async deleteRatesBeforeDate(date) {
    try {
      if (!(date instanceof Date)) {
        throw new Error(t(null, 'errors.invalidDateObject'));
      }

      const result = await dbAsync.run(
        `DELETE FROM ${this.tableName} WHERE created_at < ?`,
        [date.toISOString()]
      );

      // Log successful deletion
      console.log(t(null, 'info.exchangeRateRecordsDeleted', { count: result.changes, date: date.toISOString() }));

      return {
        success: true,
        deletedCount: result.changes
      };
    } catch (error) {
      console.error(t(null, 'errors.exchangeRateDeleteError') + ':', error);
      return {
        success: false,
        message: error.message
      };
    }
  }

  /**
   * Ensure exchange rate table exists
   * @returns {Promise<boolean>} Table exists or created successfully
   */
  async ensureTableExists() {
    try {
      // Check if table exists
      const tableExists = await dbAsync.get(
        `SELECT name FROM sqlite_master WHERE type='table' AND name='${this.tableName}'`
      );

      // If table does not exist, create table  
      if (!tableExists) {
        await dbAsync.run(
          `CREATE TABLE IF NOT EXISTS ${this.tableName} (
            id TEXT PRIMARY KEY,
            rate REAL NOT NULL,
            created_at TEXT NOT NULL DEFAULT (datetime('now'))
          )`
        );
        // Log successful table creation
        console.log(t(null, 'info.exchangeRateTableCreated', { tableName: this.tableName }));
      }

      return true;
    } catch (error) {
      console.error(t(null, 'errors.exchangeRateTableEnsureError') + ':', error);
      return false;
    }
  }
}

// Create singleton instance
const exchangeRateService = new ExchangeRateService();

module.exports = exchangeRateService;