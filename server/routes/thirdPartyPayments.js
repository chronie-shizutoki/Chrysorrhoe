const express = require('express');
const router = express.Router();
const { dbAsync } = require('../config/database');
const WalletRepository = require('../repositories/WalletRepository');
const TransactionRepository = require('../repositories/TransactionRepository');
const { t } = require('../config/i18n');

const walletRepo = new WalletRepository();
const transactionRepo = new TransactionRepository();

// Third-party payment input validation middleware
const validateThirdPartyPayment = async (req, res, next) => {
  const { walletId, username, amount, thirdPartyId, thirdPartyName, description = '' } = req.body;
  
  // Ensure either walletId or username is provided, and they are strings
  if ((!walletId && !username) || typeof walletId !== 'string' && typeof username !== 'string') {
    return res.status(400).json({
      success: false,
      error: t(req, 'thirdPartyPayments.walletIdOrUsernameRequired')
    });
  }
  
  // Third-party information validation
  if (!thirdPartyId || typeof thirdPartyId !== 'string') {
    return res.status(400).json({
      success: false,
      error: 'Third-party ID is required'
    });
  }
  
  if (!thirdPartyName || typeof thirdPartyName !== 'string') {
    return res.status(400).json({
      success: false,
      error: 'Third-party name is required'
    });
  }
  
  // Amount validation
  if (typeof amount !== 'number' || amount <= 0) {
    return res.status(400).json({
      success: false,
      error: 'Amount must be a number greater than 0'
    });
  }
  
  // Check amount precision (up to 2 decimal places)
  if (Math.round(amount * 100) !== amount * 100) {
    return res.status(400).json({
      success: false,
      error: 'Amount must have up to 2 decimal places'
    });
  }
  
  next();
};

// Third-party payment endpoint
router.post('/payments', async (req, res, next) => {
  try {
    await validateThirdPartyPayment(req, res, next);
  } catch (error) {
    console.error('Error validating third-party payment:', error);
    return res.status(500).json({
      success: false,
      error: 'System error, please try again later'
    });
  }
}, async (req, res) => {
  try {
    const { walletId, username, amount, thirdPartyId, thirdPartyName, description = '' } = req.body;
    
    // Begin database transaction
    await dbAsync.beginTransaction();
    
    try {
      // Find user wallet
      let wallet;
      if (walletId) {
        wallet = await walletRepo.findById(walletId);
      } else if (username) {
        wallet = await walletRepo.findByUsername(username);
      }
      
      if (!wallet) {
        await dbAsync.rollback();
        return res.status(404).json({
          success: false,
          error: 'Wallet does not exist'
        });
      }
      
      // Calculate 30% extra fee
    const feeRate = 0.3;
    const feeAmount = Math.round(amount * feeRate * 100) / 100; // Keep 2 decimal places
    const totalAmount = amount + feeAmount;
    
    // Check if wallet balance is sufficient
    if (parseFloat(wallet.balance) < totalAmount) {
      await dbAsync.rollback();
      return res.status(400).json({
        success: false,
        error: 'Wallet balance is insufficient',
        currentBalance: parseFloat(wallet.balance),
        requestedAmount: amount,
        feeAmount: feeAmount,
        totalAmount: totalAmount
      });
    }
    
    // Update wallet balance, deducting original amount and fee
    const newBalance = parseFloat(wallet.balance) - totalAmount;
      await walletRepo.updateBalance(wallet.id, newBalance);
      
      // Create transaction record, including fee information
      const transaction = await transactionRepo.create({
        fromWalletId: wallet.id,
        toWalletId: null, // Third-party payment has no receiver wallet
        amount: totalAmount,
        transactionType: 'third_party_payment',
        description: description || `Pay ${amount} + ${feeAmount} fee to ${thirdPartyName} (ID: ${thirdPartyId})`,
        thirdPartyName: thirdPartyName
      });
      
      // Commit transaction
      await dbAsync.commit();
      
      // Get updated wallet information
      const updatedWallet = await walletRepo.findById(wallet.id);
      
      res.status(201).json({
        success: true,
        transaction: {
          id: transaction.id,
          fromWalletId: transaction.from_wallet_id,
          toWalletId: transaction.to_wallet_id,
          amount: parseFloat(transaction.amount),
          originalAmount: amount,
          feeAmount: feeAmount,
          transactionType: transaction.transaction_type,
          description: transaction.description,
          createdAt: transaction.created_at
        },
        wallet: {
          id: updatedWallet.id,
          username: updatedWallet.username,
          balance: parseFloat(updatedWallet.balance)
        },
        thirdPartyInfo: {
          id: thirdPartyId,
          name: thirdPartyName
        }
      });
      
    } catch (error) {
      // Rollback transaction on error
      await dbAsync.rollback();
      throw error;
    }
    
  } catch (error) {
    console.error('Error in third-party payment:', error);
    
    if (error.message.includes('Wallet balance is insufficient')) {
      return res.status(400).json({
        success: false,
        error: error.message
      });
    }
    
    if (error.message.includes('Wallet does not exist')) {
      return res.status(404).json({
        success: false,
        error: error.message
      });
    }
    
    res.status(500).json({
      success: false,
      error: error.message || 'Third-party payment failed'
    });
  }
});

// From third-party receipt input validation
const validateThirdPartyReceipt = async (req, res, next) => {
  const { walletId, username, amount, thirdPartyId, thirdPartyName, description = '' } = req.body;
  
  // Ensure either wallet ID or username is provided
  if ((!walletId && !username) || typeof walletId !== 'string' && typeof username !== 'string') {
    return res.status(400).json({
      success: false,
      error: 'Wallet ID or username is required'
    });
  }
  
  // Third-party information validation
  if (!thirdPartyId || typeof thirdPartyId !== 'string') {
    return res.status(400).json({
      success: false,
      error: 'Third-party ID is required'
    });
  }
  
  if (!thirdPartyName || typeof thirdPartyName !== 'string') {
    return res.status(400).json({
      success: false,
      error: 'Third-party name is required'
    });
  }
  
  // Amount validation
  if (typeof amount !== 'number' || amount <= 0) {
    return res.status(400).json({
      success: false,
      error: 'Amount must be a number greater than 0'
    });
  }
  
  // Check amount precision (up to 2 decimal places)
  if (Math.round(amount * 100) !== amount * 100) {
    return res.status(400).json({
      success: false,
      error: 'Amount must have up to 2 decimal places'
    });
  }
  
  next();
};

// From third-party receipt input validation
router.post('/receipts', async (req, res, next) => {
  try {
    await validateThirdPartyReceipt(req, res, next);
  } catch (error) {
    console.error('Error validating third-party receipt:', error);
    return res.status(500).json({
      success: false,
      error: 'System error, please try again later'
    });
  }
}, async (req, res) => {
  try {
    const { walletId, username, amount, thirdPartyId, thirdPartyName, description = '' } = req.body;
    
    // Begin database transaction
    await dbAsync.beginTransaction();
    
    try {
      // Find user wallet
      let wallet;
      if (walletId) {
        wallet = await walletRepo.findById(walletId);
      } else if (username) {
        wallet = await walletRepo.findByUsername(username);
      }
      
      if (!wallet) {
        await dbAsync.rollback();
        return res.status(404).json({
          success: false,
          error: 'Wallet does not exist'
        });
      }
      
      // Update wallet balance
      const newBalance = parseFloat(wallet.balance) + amount;
      await walletRepo.updateBalance(wallet.id, newBalance);
      
      // Create transaction record
      const transaction = await transactionRepo.create({
        fromWalletId: null, // Third-party receipt has no sender wallet
        toWalletId: wallet.id,
        amount,
        transactionType: 'third_party_receipt',
        description: description || `Received from ${thirdPartyName} (ID: ${thirdPartyId})`,
        thirdPartyName: thirdPartyName
      });
      
      // Commit transaction
      await dbAsync.commit();
      
      // Get updated wallet information
      const updatedWallet = await walletRepo.findById(wallet.id);
      
      res.status(201).json({
        success: true,
        transaction: {
          id: transaction.id,
          fromWalletId: transaction.from_wallet_id,
          toWalletId: transaction.to_wallet_id,
          amount: parseFloat(transaction.amount),
          transactionType: transaction.transaction_type,
          description: transaction.description,
          createdAt: transaction.created_at
        },
        wallet: {
          id: updatedWallet.id,
          username: updatedWallet.username,
          balance: parseFloat(updatedWallet.balance)
        },
        thirdPartyInfo: {
          id: thirdPartyId,
          name: thirdPartyName
        }
      });
      
    } catch (error) {
      // Rollback transaction
      await dbAsync.rollback();
      throw error;
    }
    
  } catch (error) {
    console.error('Error processing third-party receipt:', error);
    
    if (error.message.includes('Wallet does not exist')) {  
      return res.status(404).json({
        success: false,
        error: error.message
      });
    }
    
    res.status(500).json({
      success: false,
      error: error.message || t(req, 'thirdPartyPayments.failedToProcessThirdPartyReceipt')
    });
  }
});

// Get third-party transaction records
router.get('/transactions', async (req, res) => {
  try {
    const { walletId, username, page = 1, limit = 10 } = req.query;
    
    // Validate pagination parameters
    const pageNum = parseInt(page);
    const limitNum = parseInt(limit);
    
    if (isNaN(pageNum) || pageNum < 1) {
      return res.status(400).json({
        success: false,
        error: t(req, 'errors.pageNumberMustBePositive')
      });
    }
    
    if (isNaN(limitNum) || limitNum < 1 || limitNum > 100) {
      return res.status(400).json({
        success: false,
        error: t(req, 'errors.limitMustBeBetween', { min: 1, max: 100 })
      });
    }
    
    // Find wallet
    let wallet;
    if (walletId) {
      wallet = await walletRepo.findById(walletId);
    } else if (username) {
      wallet = await walletRepo.findByUsername(username);
    }
    
    if (!wallet && (walletId || username)) {
      return res.status(404).json({
        success: false,
        error: t(req, 'thirdPartyPayments.walletDoesNotExist')  
      });
    }
    
    const offset = (pageNum - 1) * limitNum;
    const options = {
      limit: limitNum,
      offset,
      type: ['third_party_payment', 'third_party_receipt']
    };
    
    let transactions;
    let totalCount;
    
    if (wallet) {
      // Get specific wallet's third-party transactions
      transactions = await transactionRepo.findByWalletId(wallet.id, options);
      totalCount = await transactionRepo.countByWalletId(wallet.id, options.type);
    } else {
      // Get all third-party transactions (admin only)
      transactions = await transactionRepo.findAll(options);
      totalCount = await transactionRepo.count(options.type);
    }
    
    // Format transaction records
    const formattedTransactions = transactions.map(transaction => ({
      id: transaction.id,
      fromWalletId: transaction.from_wallet_id,
      toWalletId: transaction.to_wallet_id,
      amount: parseFloat(transaction.amount),
      transactionType: transaction.transaction_type,
      description: transaction.description,
      createdAt: transaction.created_at,
      fromUsername: transaction.from_username,
      toUsername: transaction.to_username,
      thirdPartyName: transaction.third_party_name
    }));
    
    const totalPages = Math.ceil(totalCount / limitNum);
    
    res.json({
      success: true,
      transactions: formattedTransactions,
      pagination: {
        currentPage: pageNum,
        totalPages,
        totalTransactions: totalCount,
        limit: limitNum
      }
    });
    
  } catch (error) {
    console.error('Error fetching third-party transactions:', error);
    res.status(500).json({
      success: false,
      error: error.message || 'Failed to fetch third-party transactions'
    });
  }
});

module.exports = router;