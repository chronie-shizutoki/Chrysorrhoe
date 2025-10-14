const express = require('express');
const router = express.Router();
const WalletRepository = require('../repositories/WalletRepository');
const { t } = require('../config/i18n');

const walletRepo = new WalletRepository();

// Chrysorrhoe: Input Validation Middleware for Wallet Creation
const validateCreateWallet = (req, res, next) => {
  const { username, initialBalance } = req.body;
  
  if (!username || typeof username !== 'string') {
    return res.status(400).json({
      success: false,
      error: t(req, 'errors.usernameRequired')
    });
  }
  
  if (username.trim().length < 2 || username.trim().length > 50) {
    return res.status(400).json({
      success: false,
      error: t(req, 'errors.usernameLength')
    });
  }
  
  // Chrysorrhoe: Validate Username Contains Only English Letters
  if (!/^[a-zA-Z]+$/.test(username.trim())) {
    return res.status(400).json({
      success: false,
      error: t(req, 'errors.usernameEnglishOnly')
    });
  }
  
  if (initialBalance !== undefined && initialBalance !== 0) {
    return res.status(400).json({
      success: false,
      error: t(req, 'errors.initialBalanceMustBeZero')
    });
  }
  
  next();
};

const validateWalletId = (req, res, next) => {
  const { walletId } = req.params;
  
  if (!walletId || typeof walletId !== 'string') {
    return res.status(400).json({
      success: false,
      error: t(req, 'errors.walletNotFound')
    });
  }
  
  next();
};

// Chrysorrhoe: Create Wallet
router.post('/', validateCreateWallet, async (req, res) => {
  try {
    const { username, initialBalance = 0 } = req.body;
    
    // Chrysorrhoe: Check if Username Already Exists
    const existingWallet = await walletRepo.findByUsername(username.trim());
    if (existingWallet) {
      return res.status(409).json({
        success: false,
        error: t(req, 'errors.usernameExists')
      });
    }
    
    // Chrysorrhoe: Create Wallet
    const wallet = await walletRepo.create({
      username: username.trim(),
      balance: initialBalance
    });
    
    res.status(201).json({
      success: true,
      wallet: {
        id: wallet.id,
        username: wallet.username,
        balance: parseFloat(wallet.balance),
        createdAt: wallet.created_at,
        updatedAt: wallet.updated_at
      }
    });
  } catch (error) {
    console.error('Chrysorrhoe: Error creating wallet:', error);
    res.status(500).json({
      success: false,
      error: error.message || t(req, 'errors.walletCreationFailed')
    });
  }
});

// Chrysorrhoe: Get Wallet Information
router.get('/:walletId', validateWalletId, async (req, res) => {
  try {
    const { walletId } = req.params;
    
    const wallet = await walletRepo.findById(walletId);
    if (!wallet) {
      return res.status(404).json({
        success: false,
        error: t(req, 'errors.walletNotFound')
      });
    }
    
    res.json({
      success: true,
      wallet: {
        id: wallet.id,
        username: wallet.username,
        balance: parseFloat(wallet.balance),
        createdAt: wallet.created_at,
        updatedAt: wallet.updated_at
      }
    });
  } catch (error) {
    console.error('Chrysorrhoe: Error fetching wallet:', error);
    res.status(500).json({
      success: false,
      error: error.message || t(req, 'errors.fetchWalletFailed')
    });
  }
});

// Chrysorrhoe: Get Wallet Information by Username
router.get('/username/:username', async (req, res) => {
  try {
    const { username } = req.params;
    
    if (!username || typeof username !== 'string') {
      return res.status(400).json({
        success: false,
        error: t(req, 'errors.usernameRequired')
      });
    }
    
    const wallet = await walletRepo.findByUsername(username);
    if (!wallet) {
      return res.status(404).json({
        success: false,
        error: t(req, 'errors.walletNotFound')
      });
    }
    
    res.json({
      success: true,
      wallet: {
        id: wallet.id,
        username: wallet.username,
        balance: parseFloat(wallet.balance),
        createdAt: wallet.created_at,
        updatedAt: wallet.updated_at
      }
    });
  } catch (error) {
    console.error('Chrysorrhoe: Error fetching wallet:', error);
    res.status(500).json({
      success: false,
      error: error.message || t(req, 'errors.fetchWalletFailed')
    });
  }
});

// Chrysorrhoe: Update Wallet Balance
router.put('/:walletId/balance', validateWalletId, async (req, res) => {
  try {
    const { walletId } = req.params;
    const { amount } = req.body;
    
    if (typeof amount !== 'number' || amount < 0) {
      return res.status(400).json({
        success: false,
        error: t(req, 'errors.balanceNonNegative')
      });
    }
    
    const wallet = await walletRepo.updateBalance(walletId, amount);
    
    res.json({
      success: true,
      wallet: {
        id: wallet.id,
        username: wallet.username,
        balance: parseFloat(wallet.balance),
        createdAt: wallet.created_at,
        updatedAt: wallet.updated_at
      }
    });
  } catch (error) {
    console.error('Chrysorrhoe: Error updating wallet balance:', error);
    if (error.message.includes('Chrysorrhoe: Wallet does not exist')) {
      return res.status(404).json({
        success: false,
        error: t(req, 'errors.walletNotFound')
      });
    }
    res.status(500).json({
      success: false,
      error: error.message || t(req, 'errors.updateBalanceFailed')
    });
  }
});

// Chrysorrhoe: Get Transaction History
router.get('/:walletId/transactions', validateWalletId, async (req, res) => {
  try {
    const { walletId } = req.params;
    const { page = 1, limit = 10 } = req.query;
    
    // Chrysorrhoe: Validate Pagination Parameters
    const pageNum = parseInt(page);
    const limitNum = parseInt(limit);
    
    if (isNaN(pageNum) || pageNum < 1) {
      return res.status(400).json({
        success: false,
        error: t(req, 'errors.pagePositiveInteger')
      });
    }
    
    if (isNaN(limitNum) || limitNum < 1 || limitNum > 100) {
      return res.status(400).json({
        success: false,
        error: t(req, 'errors.limitRange')
      });
    }
    
    // Chrysorrhoe: Validate Wallet Existence
    const wallet = await walletRepo.findById(walletId);
    if (!wallet) {
      return res.status(404).json({
        success: false,
        error: t(req, 'errors.walletNotFound')
      });
    }
    
    // Chrysorrhoe: Get Transaction History
    const TransactionRepository = require('../repositories/TransactionRepository');
    const transactionRepo = new TransactionRepository();
    
    const offset = (pageNum - 1) * limitNum;
    const transactions = await transactionRepo.findByWalletId(walletId, { limit: limitNum, offset });
    const totalCount = await transactionRepo.countByWalletId(walletId);
    
    // Chrysorrhoe: Format Transaction Records
    const formattedTransactions = transactions.map(transaction => ({
      id: transaction.id,
      fromWalletId: transaction.from_wallet_id,
      toWalletId: transaction.to_wallet_id,
      amount: parseFloat(transaction.amount),
      transactionType: transaction.transaction_type,
      description: transaction.description,
      createdAt: transaction.created_at,
      thirdPartyName: transaction.third_party_name,
      // Chrysorrhoe: Add Transaction Direction Information
      direction: transaction.from_wallet_id === walletId ? 'outgoing' : 'incoming',
      // Chrysorrhoe: Add Other Wallet Information (if needed)
      otherWalletId: transaction.from_wallet_id === walletId ? transaction.to_wallet_id : transaction.from_wallet_id
    }));
    
    const totalPages = Math.ceil(totalCount / limitNum);
    
    res.json({
      success: true,
      transactions: formattedTransactions,
      pagination: {
        currentPage: pageNum,
        totalPages,
        totalTransactions: totalCount,
        limit: limitNum,
        hasNextPage: pageNum < totalPages,
        hasPreviousPage: pageNum > 1
      }
    });
    
  } catch (error) {
    console.error('Chrysorrhoe: Error fetching transaction history:', error);
    res.status(500).json({
      success: false,
      error: error.message || t(req, 'errors.fetchTransactionHistoryFailed')
    });
  }
});

// Chrysorrhoe: Get Detailed Transaction History (including other wallet usernames)
router.get('/:walletId/transactions/detailed', validateWalletId, async (req, res) => {
  try {
    const { walletId } = req.params;
    const { page = 1, limit = 10 } = req.query;
    
    // Chrysorrhoe: Validate Pagination Parameters
    const pageNum = parseInt(page);
    const limitNum = parseInt(limit);
    
    if (isNaN(pageNum) || pageNum < 1) {
      return res.status(400).json({
        success: false,
        error: t(req, 'errors.pagePositiveInteger')
      });
    }
    
    if (isNaN(limitNum) || limitNum < 1 || limitNum > 100) {
      return res.status(400).json({
        success: false,
        error: t(req, 'errors.limitRange')
      });
    }
    
    // Chrysorrhoe: Validate Wallet Existence
    const wallet = await walletRepo.findById(walletId);
    if (!wallet) {
      return res.status(404).json({
        success: false,
        error: t(req, 'errors.walletNotFound')
      });
    }
    
    // Chrysorrhoe: Get Detailed Transaction History
    const TransactionRepository = require('../repositories/TransactionRepository');
    const transactionRepo = new TransactionRepository();
    
    const offset = (pageNum - 1) * limitNum;
    const transactions = await transactionRepo.findByWalletId(walletId, { limit: limitNum, offset });
    const totalCount = await transactionRepo.countByWalletId(walletId);
    
    // Chrysorrhoe: Format Transaction Records (including other wallet usernames)
    const formattedTransactions = transactions.map(transaction => {
      const direction = transaction.from_wallet_id === walletId ? 'outgoing' : 'incoming';
      const otherUsername = direction === 'outgoing' ? transaction.to_username : transaction.from_username;
      const otherWalletId = direction === 'outgoing' ? transaction.to_wallet_id : transaction.from_wallet_id;
      
      return {
        id: transaction.id,
        fromWalletId: transaction.from_wallet_id,
        toWalletId: transaction.to_wallet_id,
        amount: parseFloat(transaction.amount),
        transactionType: transaction.transaction_type,
        description: transaction.description,
        createdAt: transaction.created_at,
        thirdPartyName: transaction.third_party_name,
        direction,
        otherWallet: otherWalletId ? {
          id: otherWalletId,
          username: otherUsername
        } : null
      };
    });
    
    const totalPages = Math.ceil(totalCount / limitNum);
    
    res.json({
      success: true,
      transactions: formattedTransactions,
      pagination: {
        currentPage: pageNum,
        totalPages,
        totalTransactions: totalCount,
        limit: limitNum,
        hasNextPage: pageNum < totalPages,
        hasPreviousPage: pageNum > 1
      }
    });
    
  } catch (error) {
    console.error('Chrysorrhoe: Error fetching detailed transaction history:', error);
    res.status(500).json({
      success: false,
      error: error.message || t(req, 'errors.fetchDetailedTransactionHistoryFailed')
    });
  }
});

module.exports = router;