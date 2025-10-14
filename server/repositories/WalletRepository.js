const { dbAsync } = require('../config/database');
const { v4: uuidv4 } = require('uuid');

/**
 * Wallet Data Access Layer
 * Provides database operations for wallet entities
 */
class WalletRepository {
  
  /**
   * Create New Wallet
   * @param {Object} walletData - Wallet data
   * @param {string} walletData.username - Username
   * @param {number} walletData.balance - Initial balance
   * @returns {Promise<Object>} Created wallet object
   */
  async create(walletData) {
    const { username, balance } = walletData;
    const id = uuidv4();
    const now = new Date().toISOString();
    
    // Validate username contains only English letters
    if (!/^[a-zA-Z]+$/.test(username.trim())) {
      throw new Error('Username can only contain English letters');
    }
    
    // Validate initial balance is 0
    if (balance !== undefined && balance !== 0) {
      throw new Error('Initial balance must be 0');
    }
    
    const actualBalance = balance === undefined ? 0 : balance;
    
    try {
      await dbAsync.run(
        `INSERT INTO wallets (id, username, balance, created_at, updated_at) 
         VALUES (?, ?, ?, ?, ?)`,
        [id, username, actualBalance, now, now]
      );
      
      return await this.findById(id);
    } catch (error) {
      if (error.message.includes('UNIQUE constraint failed')) {
        throw new Error('Username already exists');
      }
      throw new Error(`Failed to create wallet: ${error.message}`);
    }
  }

  /**
   * Find Wallet by ID
   * @param {string} id - Wallet ID
   * @returns {Promise<Object|null>} Wallet object or null
   */
  async findById(id) {
    try {
      const wallet = await dbAsync.get(
        'SELECT * FROM wallets WHERE id = ?',
        [id]
      );
      return wallet || null;
    } catch (error) {
      throw new Error(`Failed to find wallet by ID: ${error.message}`);
    }
  }

  /**
   * Find Wallet by Username
   * @param {string} username - Username
   * @returns {Promise<Object|null>} Wallet object or null
   */
  async findByUsername(username) {
    try {
      const wallet = await dbAsync.get(
        'SELECT * FROM wallets WHERE username = ?',
        [username]
      );
      return wallet || null;
    } catch (error) {
      throw new Error(`Failed to find wallet by username: ${error.message}`);
    }
  }

  /**
   * Get All Wallets
   * @param {Object} options - Query options
   * @param {number} options.limit - Limit number
   * @param {number} options.offset - Offset number
   * @returns {Promise<Array>} Wallet list
   */
  async findAll(options = {}) {
    const { limit = 50, offset = 0 } = options;
    
    try {
      // Handle null limit case
      const actualLimit = limit === null ? 0 : limit;
      const actualOffset = offset || 0;
      
      // When limit is 0, return all wallets
      const query = actualLimit > 0 
        ? 'SELECT * FROM wallets ORDER BY created_at DESC LIMIT ? OFFSET ?' 
        : 'SELECT * FROM wallets ORDER BY created_at DESC';
      
      const params = actualLimit > 0 ? [actualLimit, actualOffset] : [];
      
      const wallets = await dbAsync.all(query, params);
      return wallets;
    } catch (error) {
      throw new Error(`Failed to get wallet list: ${error.message}`);
    }
  }

  /**
   * Update Wallet
   * @param {string} id - Wallet ID
   * @param {Object} updates - Update data
   * @returns {Promise<Object>} Updated wallet object
   */
  async update(id, updates) {
    const allowedFields = ['username', 'balance'];
    const updateFields = [];
    const updateValues = [];
    
    // Build update fields
    for (const [key, value] of Object.entries(updates)) {
      if (allowedFields.includes(key)) {
        updateFields.push(`${key} = ?`);
        updateValues.push(value);
      }
    }
    
    if (updateFields.length === 0) {
      throw new Error('No valid update fields');
    }
    
    // Add updated_at field
    updateFields.push('updated_at = ?');
    updateValues.push(new Date().toISOString());
    updateValues.push(id);
    
    try {
      const result = await dbAsync.run(
        `UPDATE wallets SET ${updateFields.join(', ')} WHERE id = ?`,
        updateValues
      );
      
      if (result.changes === 0) {
        throw new Error('Wallet does not exist');
      }
      
      return await this.findById(id);
    } catch (error) {
      if (error.message.includes('UNIQUE constraint failed')) {
        throw new Error('Username already exists');
      }
      throw new Error(`Failed to update wallet: ${error.message}`);
    }
  }

  /**
   * Update Wallet Balance
   * @param {string} id - Wallet ID
   * @param {number} newBalance - New balance
   * @returns {Promise<Object>} Updated wallet object
   */
  async updateBalance(id, newBalance) {
    if (typeof newBalance !== 'number' || newBalance < 0) {
      throw new Error('Balance must be a non-negative number');
    }
    
    return await this.update(id, { balance: newBalance });
  }

  /**
   * Delete Wallet
   * @param {string} id - Wallet ID
   * @returns {Promise<boolean>} Whether deletion was successful
   */
  async delete(id) {
    try {
      // Check if there are any related transactions
      const transactionCount = await dbAsync.get(
        'SELECT COUNT(*) as count FROM transactions WHERE from_wallet_id = ? OR to_wallet_id = ?',
        [id, id]
      );
      
      if (transactionCount.count > 0) {
        throw new Error('Cannot delete wallet with existing transactions');
      }
      
      const result = await dbAsync.run(
        'DELETE FROM wallets WHERE id = ?',
        [id]
      );
      
      return result.changes > 0;
    } catch (error) {
      throw new Error(`Failed to delete wallet: ${error.message}`);
    }
  }

  /**
   * Get Wallet Count
   * @returns {Promise<number>} Wallet count
   */
  async count() {
    try {
      const result = await dbAsync.get('SELECT COUNT(*) as count FROM wallets');
      return result.count;
    } catch (error) {
      throw new Error(`Failed to get wallet count: ${error.message}`);
    }
  }

  /**
   * Check Username Exists
   * @param {string} username - Username
   * @returns {Promise<boolean>} Whether username exists
   */
  async usernameExists(username) {
    try {
      const result = await dbAsync.get(
        'SELECT COUNT(*) as count FROM wallets WHERE username = ?',
        [username]
      );
      return result.count > 0;
    } catch (error) {
      throw new Error(`Failed to check username existence: ${error.message}`);
    }
  }

  /**
   * Transfer Funds
   * @param {string} fromId - Sender wallet ID
   * @param {string} toId - Receiver wallet ID
   * @param {number} amount - Transfer amount
   * @returns {Promise<Object>} Transfer result
   */
  async transfer(fromId, toId, amount) {
    if (amount <= 0) {
      throw new Error('Transfer amount must be greater than 0');
    }
    
    try {
      // Begin transaction
      await dbAsync.beginTransaction();
      
      // Get sender wallet
      const fromWallet = await this.findById(fromId);
      if (!fromWallet) {
        throw new Error('Sender wallet does not exist');
      }
      
      // Get receiver wallet
      const toWallet = await this.findById(toId);
      if (!toWallet) {
        throw new Error('Receiver wallet does not exist');
      }
      
      // Check sender balance
      if (fromWallet.balance < amount) {
        throw new Error('Sender balance is insufficient');
      }
      
      // Update sender and receiver balances
      await this.updateBalance(fromId, fromWallet.balance - amount);
      await this.updateBalance(toId, toWallet.balance + amount);
      
      // Commit transaction
      await dbAsync.commit();
      
      return {
        success: true,
        fromWallet: await this.findById(fromId),
        toWallet: await this.findById(toId)
      };
    } catch (error) {
      // Rollback transaction
      await dbAsync.rollback();
      throw error;
    }
  }
}

module.exports = WalletRepository;