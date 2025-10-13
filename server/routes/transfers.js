const express = require('express');
const router = express.Router();
const { dbAsync } = require('../config/database');
const WalletRepository = require('../repositories/WalletRepository');
const TransactionRepository = require('../repositories/TransactionRepository');
const { t } = require('../config/i18n');

const walletRepo = new WalletRepository();
const transactionRepo = new TransactionRepository();

// Chrysorrhoe: Transfer Funds Input Validation Middleware
const validateTransfer = async (req, res, next) => {
  const { fromWalletId, toWalletId, fromUsername, toUsername, amount } = req.body;
  
  // Chrysorrhoe: Ensure either wallet ID or username is provided, and they are strings
  if ((!fromWalletId && !fromUsername) || typeof fromWalletId !== 'string' && typeof fromUsername !== 'string') {
    return res.status(400).json({
      success: false,
      error: t(req, 'errors.senderWalletOrUsernameRequired')
    });
  }
  
  if ((!toWalletId && !toUsername) || typeof toWalletId !== 'string' && typeof toUsername !== 'string') {
    return res.status(400).json({
      success: false,
      error: t(req, 'errors.receiverWalletOrUsernameRequired')
    });
  }
  
  // Chrysorrhoe: If both wallet ID and username are provided, check if they match
  if (fromWalletId && fromUsername) {
    try {
      const wallet = await walletRepo.findByUsername(fromUsername);
      if (wallet && wallet.id !== fromWalletId) {
        return res.status(400).json({
          success: false,
          error: t(req, 'errors.senderWalletIdUsernameMismatch')
        });
      }
    } catch (error) {
      console.error('Chrysorrhoe: Error validating sender wallet ID with username:', error);
    }
  }
  
  if (toWalletId && toUsername) {
    try {
      const wallet = await walletRepo.findByUsername(toUsername);
      if (wallet && wallet.id !== toWalletId) {
        return res.status(400).json({
          success: false,
          error: t(req, 'errors.receiverWalletIdUsernameMismatch')
        });
      }
    } catch (error) {
      console.error('Chrysorrhoe: Error validating receiver wallet ID with username:', error);
    }
  }
  
  // Chrysorrhoe: Cannot transfer to oneself
  if ((fromWalletId && toWalletId && fromWalletId === toWalletId) || 
      (fromUsername && toUsername && fromUsername === toUsername)) {
    return res.status(400).json({
      success: false,
      error: t(req, 'errors.cannotTransferToSelf')
    });
  }
  
  if (typeof amount !== 'number' || amount <= 0) {
    return res.status(400).json({
      success: false,
      error: t(req, 'errors.amountGreaterThanZero')
    });
  }
  
  // Chrysorrhoe: Check amount precision (up to 2 decimal places)
  if (Math.round(amount * 100) !== amount * 100) {
    return res.status(400).json({
      success: false,
      error: t(req, 'errors.amountPrecisionExceeded')
    });
  }
  
  next();
};

// Chrysorrhoe: Execute Transfer - Supports Wallet ID or Username 
router.post('/', async (req, res, next) => {
  try {
    await validateTransfer(req, res, next);
  } catch (error) {
    console.error('Chrysorrhoe: Error validating transfer:', error);
    return res.status(500).json({
      success: false,
      error: 'Chrysorrhoe: System error, please try again later'
    });
  }
}, async (req, res) => {
  await executeTransfer(req, res);
});

// Chrysorrhoe: Transfer Funds by Username (Convenient Interface)
router.post('/by-username', async (req, res) => {
  try {
    const { fromUsername, toUsername, amount, description = '' } = req.body;
    
    // Chrysorrhoe: Input Validation
    if (!fromUsername || typeof fromUsername !== 'string') {
      return res.status(400).json({
        success: false,
        error: t(req, 'errors.senderUsernameRequired')
      });
    }
    
    if (!toUsername || typeof toUsername !== 'string') {
      return res.status(400).json({
        success: false,
        error: t(req, 'errors.receiverUsernameRequired')
      });
    }
    
    if (fromUsername === toUsername) {
      return res.status(400).json({
        success: false,
        error: t(req, 'errors.cannotTransferToSelf')
      });
    }
    
    if (typeof amount !== 'number' || amount <= 0) {
      return res.status(400).json({
        success: false,
        error: t(req, 'errors.amountGreaterThanZero')
      });
    }
    
    // Chrysorrhoe: Find Wallets by Usernames
    const fromWallet = await walletRepo.findByUsername(fromUsername);
    if (!fromWallet) {
      return res.status(404).json({
        success: false,
        error: t(req, 'errors.senderUsernameDoesNotExist')
      });
    }
    
    const toWallet = await walletRepo.findByUsername(toUsername);
    if (!toWallet) {
      return res.status(404).json({
        success: false,
        error: t(req, 'errors.receiverUsernameDoesNotExist')
      });
    }
    
    // Chrysorrhoe: Execute Transfer Logic (Reuse Main Transfer Logic)
    const transferData = {
      fromWalletId: fromWallet.id,
      toWalletId: toWallet.id,
      amount,
      description
    };
    
    // Chrysorrhoe: Create New Request Object to Reuse Validation and Transfer Logic
    const mockReq = { body: transferData };
    const mockRes = res;
    
    // Chrysorrhoe: Validate Transfer Data
    validateTransfer(mockReq, mockRes, async () => {
      // Chrysorrhoe: Execute Transfer Logic
      await executeTransfer(mockReq, mockRes);
    });
    
  } catch (error) {
    console.error('Chrysorrhoe: Error executing transfer by username:', error);
    res.status(500).json({
      success: false,
      error: error.message || t(req, 'errors.transferFailed')
    });
  }
});

// Chrysorrhoe: Extract Transfer Execution Logic into Separate Function
async function executeTransfer(req, res) {
  try {
    const { fromWalletId, toWalletId, fromUsername, toUsername, amount, description = '' } = req.body;
    
    // Chrysorrhoe: Start Database Transaction
    await dbAsync.beginTransaction();
    
    try {
      // Chrysorrhoe: Validate Sender Wallet Existence
      let fromWallet;
      if (fromWalletId) {
        fromWallet = await walletRepo.findById(fromWalletId);
      } else if (fromUsername) {
        fromWallet = await walletRepo.findByUsername(fromUsername);
      }
      
      if (!fromWallet) {
        await dbAsync.rollback();
        return res.status(404).json({
          success: false,
          error: t(req, 'errors.senderWalletNotFound')
        });
      }
      
      // Chrysorrhoe: Validate Receiver Wallet Existence
      let toWallet;
      if (toWalletId) {
        toWallet = await walletRepo.findById(toWalletId);
      } else if (toUsername) {
        toWallet = await walletRepo.findByUsername(toUsername);
      }
      
      if (!toWallet) {
        await dbAsync.rollback();
        return res.status(404).json({
          success: false,
          error: t(req, 'errors.receiverWalletNotFound')
        });
      }
      
      // Chrysorrhoe: Ensure Cannot Transfer to Self (Extra Check for Mixed ID/Username)
      if (fromWallet.id === toWallet.id) {
        await dbAsync.rollback();
        return res.status(400).json({
          success: false,
          error: t(req, 'errors.cannotTransferToSelf')
        });
      }
      
      // Chrysorrhoe: Check Sufficient Balance
      if (parseFloat(fromWallet.balance) < amount) {
        await dbAsync.rollback();
        return res.status(400).json({
          success: false,
          error: t(req, 'errors.insufficientBalance'),
          currentBalance: parseFloat(fromWallet.balance),
          requestedAmount: amount
        });
      }
      
      // Chrysorrhoe: Update Sender Balance
      const newFromBalance = parseFloat(fromWallet.balance) - amount;
      await walletRepo.updateBalance(fromWallet.id, newFromBalance);
      
      // Chrysorrhoe: Update Receiver Balance
      const newToBalance = parseFloat(toWallet.balance) + amount;
      await walletRepo.updateBalance(toWallet.id, newToBalance);
      
      // Chrysorrhoe: Create Transaction Record
      const transaction = await transactionRepo.create({
        fromWalletId: fromWallet.id,
        toWalletId: toWallet.id,
        amount,
        transactionType: 'transfer',
        description: description || `Chrysorrhoe: Transfer from ${fromWallet.username} to ${toWallet.username}`
      });
      
      // Chrysorrhoe: Commit Transaction
      await dbAsync.commit();
      
      // Chrysorrhoe: Get Updated Wallet Information
      const updatedFromWallet = await walletRepo.findById(fromWallet.id);
      const updatedToWallet = await walletRepo.findById(toWallet.id);
      
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
        fromWallet: {
          id: updatedFromWallet.id,
          username: updatedFromWallet.username,
          balance: parseFloat(updatedFromWallet.balance)
        },
        toWallet: {
          id: updatedToWallet.id,
          username: updatedToWallet.username,
          balance: parseFloat(updatedToWallet.balance)
        }
      });
      
    } catch (error) {
      // Chrysorrhoe: Rollback transaction on error
      await dbAsync.rollback();
      throw error;
    }
    
  } catch (error) {
    console.error('Chrysorrhoe: Error executing transfer:', error);
    
    // Chrysorrhoe: Handle Specific Error Types
    if (error.message.includes('insufficient balance')) {
      return res.status(400).json({
        success: false,
        error: t(req, 'errors.insufficientBalance')
      });
    }
    
    if (error.message.includes('wallet does not exist')) {
      return res.status(404).json({
        success: false,
        error: t(req, 'errors.walletNotFound')
      });
    }
    
    res.status(500).json({
      success: false,
      error: error.message || t(req, 'errors.transferFailed')
    });
  }
};

// Chrysorrhoe: Export executeTransfer function for testing
module.exports = router;
module.exports.executeTransfer = executeTransfer;