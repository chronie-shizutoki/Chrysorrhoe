/**
 * Repository Module Export
 * Provides a unified data access layer interface
 */

const WalletRepository = require('./WalletRepository');
const TransactionRepository = require('./TransactionRepository');

// Create Repository Instances
const walletRepository = new WalletRepository();
const transactionRepository = new TransactionRepository();

/**
 * Database Service Class
 * Provides a unified database operation interface
 */
class DatabaseService {
  constructor() {
    this.wallets = walletRepository;
    this.transactions = transactionRepository;
  }

  /**
   * Execute Transfer Operation (Includes Transaction)
   * @param {string} fromWalletId - Sender wallet ID
   * @param {string} toWalletId - Receiver wallet ID
   * @param {number} amount - Transfer amount
   * @param {string} description - Transaction description
   * @returns {Promise<Object>} Transfer result
   */
  async executeTransfer(fromWalletId, toWalletId, amount, description = '') {
    try {
      // Execute wallet balance update (includes transaction)
      const transferResult = await this.wallets.transfer(fromWalletId, toWalletId, amount);
      
      // Create transaction record
      const transaction = await this.transactions.createTransfer(
        fromWalletId, 
        toWalletId, 
        amount, 
        description
      );
      
      return {
        success: true,
        transaction,
        fromWallet: transferResult.fromWallet,
        toWallet: transferResult.toWallet
      };
    } catch (error) {
      throw new Error(`Transfer Operation Failed: ${error.message}`);
    }
  }

  /**
   * Create Wallet with Initial Deposit
   * @param {string} username - Username
   * @param {number} initialBalance - Initial balance
   * @returns {Promise<Object>} Creation result
   */
  async createWalletWithInitialDeposit(username, initialBalance = 0) {
    try {
      // Create wallet
      const wallet = await this.wallets.create({ username, balance: initialBalance });
      
      // If there is initial balance, create initial deposit record
      let transaction = null;
      if (initialBalance > 0) {
        transaction = await this.transactions.createInitialDeposit(
          wallet.id, 
          initialBalance, 
          'Initial Deposit'
        );
      }
      
      return {
        success: true,
        wallet,
        transaction
      };
    } catch (error) {
      throw new Error(`Create Wallet with Initial Deposit Failed: ${error.message}`);
    }
  }

  /**
   * Get Wallet Details (Includes Statistics)
   * @param {string} walletId - Wallet ID
   * @returns {Promise<Object>} Wallet details
   */
  async getWalletDetails(walletId) {
    try {
      const wallet = await this.wallets.findById(walletId);
      if (!wallet) {
        throw new Error('Wallet Does Not Exist');
      }
      
      const stats = await this.transactions.getWalletStats(walletId);
      
      return {
        ...wallet,
        stats
      };
    } catch (error) {
      throw new Error(`Get Wallet Details Failed: ${error.message}`);
    }
  }

  /**
   * Get Wallet Transaction History (Pagination)
   * @param {string} walletId - Wallet ID
   * @param {number} page - Page number (starting from 1)
   * @param {number} pageSize - Number of items per page
   * @returns {Promise<Object>} Paged transaction data
   */
  async getWalletTransactionHistory(walletId, page = 1, pageSize = 10) {
    try {
      const offset = (page - 1) * pageSize;
      const transactions = await this.transactions.findByWalletId(walletId, {
        limit: pageSize,
        offset
      });
      
      const totalCount = await this.transactions.countByWalletId(walletId);
      const totalPages = Math.ceil(totalCount / pageSize);
      
      return {
        transactions,
        pagination: {
          currentPage: page,
          pageSize,
          totalCount,
          totalPages,
          hasNextPage: page < totalPages,
          hasPrevPage: page > 1
        }
      };
    } catch (error) {
      throw new Error(`Get Wallet Transaction History Failed: ${error.message}`);
    }
  }
}

// Create Database Service Instance
const databaseService = new DatabaseService();

module.exports = {
  WalletRepository,
  TransactionRepository,
  DatabaseService,
  walletRepository,
  transactionRepository,
  databaseService
};