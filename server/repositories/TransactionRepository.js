const { dbAsync } = require('../config/database');
const { v4: uuidv4 } = require('uuid');
const { t } = require('../config/i18n');

/**
 * Transaction Data Access Layer  
 * Provides database operations methods for transactions
 */
class TransactionRepository {
  
  /**
   * Create New Transaction Record
   * @param {Object} transactionData - Transaction data
   * @param {string|null} transactionData.fromWalletId - Sender wallet ID
   * @param {string|null} transactionData.toWalletId - Receiver wallet ID
   * @param {number} transactionData.amount - Transaction amount
   * @param {string} transactionData.transactionType - Transaction type
   * @param {string} transactionData.description - Transaction description
   * @returns {Promise<Object>} Created transaction object
   */
  async create(transactionData) {
    const {
      fromWalletId,
      toWalletId,
      amount,
      transactionType,
      description = '',
      thirdPartyName = null
    } = transactionData;
    
    // Check transaction type
    const validTypes = ['transfer', 'system', 'interest_credit', 'interest_debit', 'third_party_payment', 'third_party_receipt'];
    if (!validTypes.includes(transactionType)) {
      throw new Error(t(null, 'errors.invalidTransactionType'));
    }
    
    // Check transaction amount
    if (typeof amount !== 'number' || amount <= 0) {
      throw new Error(t(null, 'errors.transactionAmountMustBePositive'));
    }
    
    const id = uuidv4();
    const now = new Date().toISOString();
    
    try {
      await dbAsync.run(
        `INSERT INTO transactions (id, from_wallet_id, to_wallet_id, amount, transaction_type, description, third_party_name, created_at) 
         VALUES (?, ?, ?, ?, ?, ?, ?, ?)`,
        [id, fromWalletId, toWalletId, amount, transactionType, description, thirdPartyName, now]
      );
      
      return await this.findById(id);
    } catch (error) {
      throw new Error(t(null, 'errors.createTransactionRecordFailed', { error: error.message }));
    }
  }

  /**
   * Find Transaction by ID
   * @param {string} id - Transaction ID
   * @returns {Promise<Object|null>} Transaction object or null
   */
  async findById(id) {
    try {
      const transaction = await dbAsync.get(
        `SELECT t.*, 
                fw.username as from_username,
                tw.username as to_username
         FROM transactions t
         LEFT JOIN wallets fw ON t.from_wallet_id = fw.id
         LEFT JOIN wallets tw ON t.to_wallet_id = tw.id
         WHERE t.id = ?`,
        [id]
      );
      return transaction || null;
    } catch (error) {
      throw new Error(t(null, 'errors.findTransactionByIdFailed', { error: error.message }));
    }
  }

  /**
   * Find Transactions by Wallet ID
   * @param {string} walletId - Wallet ID
   * @param {Object} options - Query options
   * @param {number} options.limit - Limit number
   * @param {number} options.offset - Offset number
   * @param {string|Array} options.type - Transaction type filter
   * @returns {Promise<Array>} Transaction list
   */
  async findByWalletId(walletId, options = {}) {
    const { limit = 10, offset = 0, type } = options;
    
    let sql = `
      SELECT t.*, 
             fw.username as from_username,
             tw.username as to_username,
             t.third_party_name
      FROM transactions t
      LEFT JOIN wallets fw ON t.from_wallet_id = fw.id
      LEFT JOIN wallets tw ON t.to_wallet_id = tw.id
      WHERE (t.from_wallet_id = ? OR t.to_wallet_id = ?)
    `;
    
    const params = [walletId, walletId];
    
    if (type) {
      if (Array.isArray(type)) {
        sql += ' AND t.transaction_type IN (' + type.map(() => '?').join(', ') + ')';
        params.push(...type);
      } else {
        sql += ' AND t.transaction_type = ?';
        params.push(type);
      }
    }
    
    sql += ' ORDER BY t.created_at DESC LIMIT ? OFFSET ?';
    params.push(limit, offset);
    
    try {
      const transactions = await dbAsync.all(sql, params);
      return transactions;
    } catch (error) {
      throw new Error(t(null, 'errors.findTransactionsByWalletIdFailed', { error: error.message }));
    }
  }

  /**
   * Get All Transactions
   * @param {Object} options - Query options
   * @param {number} options.limit - Limit number
   * @param {number} options.offset - Offset number
   * @param {string|Array} options.type - Transaction type filter
   * @returns {Promise<Array>} Transaction list
   */
  async findAll(options = {}) {
    const { limit = 50, offset = 0, type } = options;
    
    let sql = `
      SELECT t.*, 
             fw.username as from_username,
             tw.username as to_username,
             t.third_party_name
      FROM transactions t
      LEFT JOIN wallets fw ON t.from_wallet_id = fw.id
      LEFT JOIN wallets tw ON t.to_wallet_id = tw.id
    `;
    
    const params = [];
    
    if (type) {
      if (Array.isArray(type)) {
        sql += ' WHERE t.transaction_type IN (' + type.map(() => '?').join(', ') + ')';
        params.push(...type);
      } else {
        sql += ' WHERE t.transaction_type = ?';
        params.push(type);
      }
    }
    
    sql += ' ORDER BY t.created_at DESC LIMIT ? OFFSET ?';
    params.push(limit, offset);
    
    try {
      const transactions = await dbAsync.all(sql, params);
      return transactions;
    } catch (error) {
      throw new Error(t(null, 'errors.getAllTransactionsFailed', { error: error.message }));
    }
  }



  /**
   * Count All Transactions
   * @param {string} type - Optional transaction type filter
   * @returns {Promise<number>} Transaction count
   */
  async count(type) {
    try {
      let sql = 'SELECT COUNT(*) as count FROM transactions';
      let params = [];
      
      if (type) {
        if (Array.isArray(type)) {
          sql += ' WHERE transaction_type IN (' + type.map(() => '?').join(', ') + ')';
          params = [...type];
        } else {
          sql += ' WHERE transaction_type = ?';
          params = [type];
        }
      }
      
      const result = await dbAsync.get(sql, params);
      return result.count;
    } catch (error) {
      throw new Error(t(null, 'errors.countAllTransactionsFailed', { error: error.message }));
    }
  }

  /**
   * Count Transactions by Wallet ID
   * @param {string} walletId - Wallet ID
   * @param {string|Array} type - Optional transaction type filter
   * @returns {Promise<number>} Transaction count
   */
  async countByWalletId(walletId, type) {
    try {
      let sql = 'SELECT COUNT(*) as count FROM transactions WHERE from_wallet_id = ? OR to_wallet_id = ?';
      let params = [walletId, walletId];
      
      if (type) {
        if (Array.isArray(type)) {
          sql += ' AND transaction_type IN (' + type.map(() => '?').join(', ') + ')';
          params = [...params, ...type];
        } else {
          sql += ' AND transaction_type = ?';
          params = [...params, type];
        }
      }
      
      const result = await dbAsync.get(sql, params);
      return result.count;
    } catch (error) {
      throw new Error(t(null, 'errors.countTransactionsByWalletIdFailed', { error: error.message }));
    }
  }

  /**
   * Get Wallet Stats
   * @param {string} walletId - Wallet ID
   * @returns {Promise<Object>} Statistics
   */
  async getWalletStats(walletId) {
    try {
      // total transactions
      const totalCount = await this.countByWalletId(walletId);
      
      // transfer transactions
      const transferCount = await this.countByWalletId(walletId, 'transfer');
      
      // initial system transactions
      const systemCount = await this.countByWalletId(walletId, 'system');
      
      // total sent amount
      const sentResult = await dbAsync.get(
        'SELECT COALESCE(SUM(amount), 0) as total FROM transactions WHERE from_wallet_id = ?',
        [walletId]
      );
      
      // total received amount
      const receivedResult = await dbAsync.get(
        'SELECT COALESCE(SUM(amount), 0) as total FROM transactions WHERE to_wallet_id = ?',
        [walletId]
      );
      
      return {
        totalTransactions: totalCount,
        transferTransactions: transferCount,
        systemTransactions: systemCount,
        totalSent: sentResult.total,
        totalReceived: receivedResult.total
      };
    } catch (error) {
      throw new Error(t(null, 'errors.getWalletStatsFailed', { error: error.message }));
    }
  }

  /**
   * Get Transactions by Date Range
   * @param {string} walletId - Wallet ID
   * @param {string} startDate - Start date (ISO string)
   * @param {string} endDate - End date (ISO string)
   * @returns {Promise<Array>} Transaction list
   */
  async findByDateRange(walletId, startDate, endDate) {
    try {
      const transactions = await dbAsync.all(
        `SELECT t.*, 
                fw.username as from_username,
                tw.username as to_username,
                t.third_party_name
         FROM transactions t
         LEFT JOIN wallets fw ON t.from_wallet_id = fw.id
         LEFT JOIN wallets tw ON t.to_wallet_id = tw.id
         WHERE (t.from_wallet_id = ? OR t.to_wallet_id = ?)
           AND t.created_at >= ? AND t.created_at <= ?
         ORDER BY t.created_at DESC`,
        [walletId, walletId, startDate, endDate]
      );
      return transactions;
    } catch (error) {
      throw new Error(t(null, 'errors.getTransactionsByDateRangeFailed', { error: error.message }));
    }
  }

  /**
   * Delete Transaction
   * @param {string} id - Transaction ID
   * @returns {Promise<boolean>} Whether deletion was successful
   */
  async delete(id) {
    try {
      const result = await dbAsync.run(
        'DELETE FROM transactions WHERE id = ?',
        [id]
      );
      return result.changes > 0;
    } catch (error) {
      throw new Error(t(null, 'errors.deleteTransactionFailed', { error: error.message }));
    }
  }

  /**
   * Create Transfer Transaction
   * @param {string} fromWalletId - Sender wallet ID
   * @param {string} toWalletId - Receiver wallet ID
   * @param {number} amount - Transfer amount
   * @param {string} description - Transaction description
   * @returns {Promise<Object>} Created transaction object
   */
  async createTransfer(fromWalletId, toWalletId, amount, description = '') {
    return await this.create({
      fromWalletId,
      toWalletId,
      amount,
      transactionType: 'transfer',
      description
    });
  }

  /**
   * Create Initial System Transaction
   * @param {string} toWalletId - Receiver wallet ID
   * @param {number} amount - System amount
   * @param {string} description - Transaction description
   * @returns {Promise<Object>} Created transaction object
   */
  async createInitialSystem(toWalletId, amount, description) {
    const defaultDescription = t(null, 'transactions.systemTransaction');
    return await this.create({
      fromWalletId: null,
      toWalletId,
      amount,
      transactionType: 'system',
      description: description || defaultDescription
    });
  }

  /**
   * Create Interest Credit Transaction
   * @param {string} toWalletId - Receiver wallet ID
   * @param {number} amount - Interest amount
   * @param {string} description - Transaction description
   * @returns {Promise<Object>} Created transaction object
   */
  async createInterestCredit(toWalletId, amount, description) {
    const defaultDescription = t(null, 'transactions.interestIncome');
    return await this.create({
      fromWalletId: null,
      toWalletId,
      amount,
      transactionType: 'interest_credit',
      description: description || defaultDescription
    });
  }

  /**
   * Create Interest Debit Transaction
   * @param {string} toWalletId - Receiver wallet ID
   * @param {number} amount - Interest amount
   * @param {string} description - Transaction description
   * @returns {Promise<Object>} Created transaction object
   */
  async createInterestDebit(toWalletId, amount, description) {
    const defaultDescription = t(null, 'transactions.interestExpense');
    return await this.create({
      fromWalletId: null,
      toWalletId,
      amount,
      transactionType: 'interest_debit',
      description: description || defaultDescription
    });
  }
}

module.exports = TransactionRepository;