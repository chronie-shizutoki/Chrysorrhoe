const express = require('express');
const router = express.Router();
const WalletRepository = require('../repositories/WalletRepository');

const walletRepo = new WalletRepository();

// 输入验证中间件
const validateCreateWallet = (req, res, next) => {
  const { username, initialBalance } = req.body;
  
  if (!username || typeof username !== 'string') {
    return res.status(400).json({
      success: false,
      error: '用户名是必需的且必须是字符串'
    });
  }
  
  if (username.trim().length < 2 || username.trim().length > 50) {
    return res.status(400).json({
      success: false,
      error: '用户名长度必须在2-50个字符之间'
    });
  }
  
  // 验证用户名只能包含英语字母
  if (!/^[a-zA-Z]+$/.test(username.trim())) {
    return res.status(400).json({
      success: false,
      error: '用户名只能包含英语字母'
    });
  }
  
  if (initialBalance !== undefined && initialBalance !== 0) {
    return res.status(400).json({
      success: false,
      error: '初始余额只能是0'
    });
  }
  
  next();
};

const validateWalletId = (req, res, next) => {
  const { walletId } = req.params;
  
  if (!walletId || typeof walletId !== 'string') {
    return res.status(400).json({
      success: false,
      error: '钱包ID是必需的'
    });
  }
  
  next();
};

// 创建钱包
router.post('/', validateCreateWallet, async (req, res) => {
  try {
    const { username, initialBalance = 0 } = req.body;
    
    // 检查用户名是否已存在
    const existingWallet = await walletRepo.findByUsername(username.trim());
    if (existingWallet) {
      return res.status(409).json({
        success: false,
        error: '用户名已存在'
      });
    }
    
    // 创建钱包
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
    console.error('创建钱包错误:', error);
    res.status(500).json({
      success: false,
      error: error.message || '创建钱包失败'
    });
  }
});

// 获取钱包信息
router.get('/:walletId', validateWalletId, async (req, res) => {
  try {
    const { walletId } = req.params;
    
    const wallet = await walletRepo.findById(walletId);
    if (!wallet) {
      return res.status(404).json({
        success: false,
        error: '钱包不存在'
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
    console.error('获取钱包错误:', error);
    res.status(500).json({
      success: false,
      error: error.message || '获取钱包信息失败'
    });
  }
});

// 根据用户名获取钱包信息
router.get('/username/:username', async (req, res) => {
  try {
    const { username } = req.params;
    
    if (!username || typeof username !== 'string') {
      return res.status(400).json({
        success: false,
        error: '用户名是必需的'
      });
    }
    
    const wallet = await walletRepo.findByUsername(username);
    if (!wallet) {
      return res.status(404).json({
        success: false,
        error: '钱包不存在'
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
    console.error('获取钱包错误:', error);
    res.status(500).json({
      success: false,
      error: error.message || '获取钱包信息失败'
    });
  }
});

// 更新钱包余额
router.put('/:walletId/balance', validateWalletId, async (req, res) => {
  try {
    const { walletId } = req.params;
    const { amount } = req.body;
    
    if (typeof amount !== 'number' || amount < 0) {
      return res.status(400).json({
        success: false,
        error: '余额必须是非负数'
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
    console.error('更新余额错误:', error);
    if (error.message.includes('钱包不存在')) {
      return res.status(404).json({
        success: false,
        error: error.message
      });
    }
    res.status(500).json({
      success: false,
      error: error.message || '更新余额失败'
    });
  }
});

// 获取交易历史
router.get('/:walletId/transactions', validateWalletId, async (req, res) => {
  try {
    const { walletId } = req.params;
    const { page = 1, limit = 20 } = req.query;
    
    // 验证分页参数
    const pageNum = parseInt(page);
    const limitNum = parseInt(limit);
    
    if (isNaN(pageNum) || pageNum < 1) {
      return res.status(400).json({
        success: false,
        error: '页码必须是大于0的整数'
      });
    }
    
    if (isNaN(limitNum) || limitNum < 1 || limitNum > 100) {
      return res.status(400).json({
        success: false,
        error: '每页数量必须是1-100之间的整数'
      });
    }
    
    // 验证钱包是否存在
    const wallet = await walletRepo.findById(walletId);
    if (!wallet) {
      return res.status(404).json({
        success: false,
        error: '钱包不存在'
      });
    }
    
    // 获取交易历史
    const TransactionRepository = require('../repositories/TransactionRepository');
    const transactionRepo = new TransactionRepository();
    
    const offset = (pageNum - 1) * limitNum;
    const transactions = await transactionRepo.findByWalletId(walletId, { limit: limitNum, offset });
    const totalCount = await transactionRepo.countByWalletId(walletId);
    
    // 格式化交易记录
    const formattedTransactions = transactions.map(transaction => ({
      id: transaction.id,
      fromWalletId: transaction.from_wallet_id,
      toWalletId: transaction.to_wallet_id,
      amount: parseFloat(transaction.amount),
      transactionType: transaction.transaction_type,
      description: transaction.description,
      createdAt: transaction.created_at,
      // 添加交易方向信息
      direction: transaction.from_wallet_id === walletId ? 'outgoing' : 'incoming',
      // 添加对方钱包信息（如果需要）
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
    console.error('获取交易历史错误:', error);
    res.status(500).json({
      success: false,
      error: error.message || '获取交易历史失败'
    });
  }
});

// 获取详细交易历史（包含对方钱包用户名）
router.get('/:walletId/transactions/detailed', validateWalletId, async (req, res) => {
  try {
    const { walletId } = req.params;
    const { page = 1, limit = 20 } = req.query;
    
    // 验证分页参数
    const pageNum = parseInt(page);
    const limitNum = parseInt(limit);
    
    if (isNaN(pageNum) || pageNum < 1) {
      return res.status(400).json({
        success: false,
        error: '页码必须是大于0的整数'
      });
    }
    
    if (isNaN(limitNum) || limitNum < 1 || limitNum > 100) {
      return res.status(400).json({
        success: false,
        error: '每页数量必须是1-100之间的整数'
      });
    }
    
    // 验证钱包是否存在
    const wallet = await walletRepo.findById(walletId);
    if (!wallet) {
      return res.status(404).json({
        success: false,
        error: '钱包不存在'
      });
    }
    
    // 获取详细交易历史
    const TransactionRepository = require('../repositories/TransactionRepository');
    const transactionRepo = new TransactionRepository();
    
    const offset = (pageNum - 1) * limitNum;
    const transactions = await transactionRepo.findByWalletId(walletId, { limit: limitNum, offset });
    const totalCount = await transactionRepo.countByWalletId(walletId);
    
    // 格式化交易记录（已包含用户名信息）
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
    console.error('获取详细交易历史错误:', error);
    res.status(500).json({
      success: false,
      error: error.message || '获取详细交易历史失败'
    });
  }
});

module.exports = router;