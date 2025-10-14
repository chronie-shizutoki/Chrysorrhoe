const express = require('express');
const router = express.Router();
const TransactionRepository = require('../repositories/TransactionRepository');

const transactionRepo = new TransactionRepository();

// Get single transaction details
router.get('/:transactionId', async (req, res) => {
  try {
    const { transactionId } = req.params;
    
    if (!transactionId || typeof transactionId !== 'string') {
      return res.status(400).json({
        success: false,
        error: 'Transaction ID is required'
      });
    }
    
    const transaction = await transactionRepo.findById(transactionId);
    if (!transaction) {
      return res.status(404).json({
        success: false,
        error: 'Transaction not found'
      });
    }
    
    res.json({
      success: true,
      transaction: {
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
      }
    });
    
  } catch (error) {
    console.error('Error fetching transaction details:', error);
    res.status(500).json({
      success: false,
      error: error.message || 'Failed to fetch transaction details'
    });
  }
});

// Get all transaction records (admin only)
router.get('/', async (req, res) => {
  try {
    const { page = 1, limit = 10, type } = req.query;
    
    // Validate pagination parameters
    const pageNum = parseInt(page);
    const limitNum = parseInt(limit);
    
    if (isNaN(pageNum) || pageNum < 1) {
      return res.status(400).json({
        success: false,
        error: 'Page number must be a positive integer'
      });
    }
    
    if (isNaN(limitNum) || limitNum < 1 || limitNum > 100) {
      return res.status(400).json({
        success: false,
        error: 'Limit must be between 1 and 100'
      });
    }
    
    const offset = (pageNum - 1) * limitNum;
    const transactions = await transactionRepo.findAll({ limit: limitNum, offset, type });
    const totalCount = await transactionRepo.count(type);
    
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
        limit: limitNum,
        hasNextPage: pageNum < totalPages,
        hasPreviousPage: pageNum > 1
      }
    });
    
  } catch (error) {
    console.error('Error fetching transaction records:', error);
    res.status(500).json({
      success: false,
      error: error.message || 'Failed to fetch transaction records'
    });
  }
});

module.exports = router;