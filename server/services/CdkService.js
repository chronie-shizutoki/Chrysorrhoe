const fs = require('fs').promises;
const path = require('path');
const { dbAsync } = require('../config/database');
const WalletRepository = require('../repositories/WalletRepository');
const TransactionRepository = require('../repositories/TransactionRepository');
const { t } = require('../config/i18n');

/**
 * CDK Service
 * Responsible for managing and validating CDK codes for currency redemption
 */
class CdkService {
  constructor() {
    this.walletRepo = new WalletRepository();
    this.transactionRepo = new TransactionRepository();
    this.cdksFilePath = path.join(__dirname, '..', 'data', 'cdks.json');
    this.cdks = [];
    this.loadCdks();
  }

  /**
   * Load CDK data from JSON file
   */
  async loadCdks() {
    try {
      const data = await fs.readFile(this.cdksFilePath, 'utf8');
      const parsedData = JSON.parse(data);
      this.cdks = parsedData.cdks || [];
      console.log(`${this.cdks.length} CDK entries loaded`);
    } catch (error) {
      console.error('Error loading CDK data:', error);
      this.cdks = [];
    }
  }

  /**
   * Save CDK data back to JSON file
   */
  async saveCdks() {
    try {
      const data = { cdks: this.cdks };
      await fs.writeFile(this.cdksFilePath, JSON.stringify(data, null, 2), 'utf8');
    } catch (error) {
      console.error('Error saving CDK data:', error);
      throw new Error(t(null, 'errors.cdkDataSaveFailed'));
    }
  }

  /**
   * Validate CDK format
   * @param {string} cdk - The CDK code to validate
   * @returns {boolean} True if format is valid
   */
  validateCdkFormat(cdk) {
    const cdkRegex = /^[a-zA-Z0-9]{4}-[a-zA-Z0-9]{4}-[a-zA-Z0-9]{4}-[a-zA-Z0-9]{4}-[a-zA-Z0-9]{4}-[a-zA-Z0-9]{4}$/;
    return cdkRegex.test(cdk);
  }

  /**
   * Find CDK by key
   * @param {string} key - The CDK key
   * @returns {Object|null} CDK object or null if not found
   */
  findCdkByKey(key) {
    return this.cdks.find(cdk => cdk.key === key) || null;
  }

  /**
   * Check if CDK is valid for redemption
   * @param {Object} cdk - The CDK object
   * @returns {Object} Validation result with success flag and message
   */
  validateCdk(cdk) {
    if (!cdk) {
      return { success: false, message: t(null, 'errors.cdkNotFound') };
    }

    if (cdk.status !== 'ACTIVE') {
      return { success: false, message: t(null, 'errors.cdkAlreadyUsed') };
    }

    const now = new Date();
    const expiresAt = new Date(cdk.expires_at);
    if (now > expiresAt) {
      return { success: false, message: t(null, 'errors.cdkExpired') };
    }

    return { success: true };
  }

  /**
   * Redeem CDK for a user
   * @param {string} cdkKey - The CDK key
   * @param {string} username - The username of the user redeeming
   * @returns {Promise<Object>} Redemption result
   */
  async redeemCdk(cdkKey, username) {
    try {
      // Validate format first
      if (!this.validateCdkFormat(cdkKey)) {
        throw new Error(t(null, 'errors.invalidCdkFormat'));
      }

      // Find and validate CDK
      const cdk = this.findCdkByKey(cdkKey);
      const validation = this.validateCdk(cdk);
      
      if (!validation.success) {
        throw new Error(validation.message);
      }

      // Check if user exists and get wallet
      const wallet = await this.walletRepo.findByUsername(username);
      if (!wallet) {
        throw new Error(t(null, 'errors.walletNotFound'));
      }

      // Begin transaction
      await dbAsync.run('BEGIN TRANSACTION');

      try {
        // Update wallet balance
        const newBalance = parseFloat(wallet.balance) + cdk.amount;
        await this.walletRepo.updateBalance(wallet.id, newBalance);

        // Create transaction record
        const transactionData = {
          fromWalletId: null,
          toWalletId: wallet.id,
          amount: cdk.amount,
          transactionType: 'system', // 使用系统支持的交易类型
          description: t(null, 'transactions.cdkRedemption', { keyPrefix: cdkKey.substring(0, 8) })
        };
        await this.transactionRepo.create(transactionData);

        // Mark CDK as used
        cdk.status = 'USED';
        cdk.used_at = new Date().toISOString();
        cdk.used_by = username;
        await this.saveCdks();

        // Commit transaction
        await dbAsync.run('COMMIT');

        return {
          success: true,
          amount: cdk.amount,
          currency: cdk.currency,
          message: t(null, 'messages.cdkRedeemedSuccessfully')
        };
      } catch (error) {
        // Rollback transaction on error
        await dbAsync.run('ROLLBACK');
        throw error;
      }
    } catch (error) {
      console.error('CDK redemption error:', error);
      throw error;
    }
  }

  /**
   * Add a new CDK
   * @param {Object} cdkData - CDK data object
   * @returns {Promise<Object>} Result
   */
  async addCdk(cdkData) {
    try {
      // Validate format
      if (!this.validateCdkFormat(cdkData.key)) {
        throw new Error(t(null, 'errors.invalidCdkFormat'));
      }

      // Check if CDK already exists
      if (this.findCdkByKey(cdkData.key)) {
        throw new Error(t(null, 'errors.cdkAlreadyExists'));
      }

      const newCdk = {
        key: cdkData.key,
        amount: parseFloat(cdkData.amount),
        currency: cdkData.currency || 'USD',
        status: 'ACTIVE',
        created_at: new Date().toISOString(),
        expires_at: cdkData.expires_at || new Date(Date.now() + 365 * 24 * 60 * 60 * 1000).toISOString() // Default 1 year expiry
      };

      this.cdks.push(newCdk);
      await this.saveCdks();

      return { success: true, message: t(null, 'messages.cdkAddedSuccessfully') };
    } catch (error) {
      console.error('Error adding CDK:', error);
      throw error;
    }
  }
}

module.exports = new CdkService();