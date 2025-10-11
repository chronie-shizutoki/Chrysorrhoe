const express = require('express');
const router = express.Router();
const { dbAsync } = require('../config/database');
const WalletRepository = require('../repositories/WalletRepository');
const TransactionRepository = require('../repositories/TransactionRepository');

const walletRepo = new WalletRepository();
const transactionRepo = new TransactionRepository();

// 第三方支付输入验证中间件
const validateThirdPartyPayment = async (req, res, next) => {
  const { walletId, username, amount, thirdPartyId, thirdPartyName, description = '' } = req.body;
  
  // 确保要么提供钱包ID，要么提供用户名
  if ((!walletId && !username) || typeof walletId !== 'string' && typeof username !== 'string') {
    return res.status(400).json({
      success: false,
      error: '钱包ID或用户名是必需的'
    });
  }
  
  // 第三方信息验证
  if (!thirdPartyId || typeof thirdPartyId !== 'string') {
    return res.status(400).json({
      success: false,
      error: '第三方ID是必需的'
    });
  }
  
  if (!thirdPartyName || typeof thirdPartyName !== 'string') {
    return res.status(400).json({
      success: false,
      error: '第三方名称是必需的'
    });
  }
  
  // 金额验证
  if (typeof amount !== 'number' || amount <= 0) {
    return res.status(400).json({
      success: false,
      error: '金额必须是大于0的数字'
    });
  }
  
  // 检查金额精度（最多2位小数）
  if (Math.round(amount * 100) !== amount * 100) {
    return res.status(400).json({
      success: false,
      error: '金额最多支持2位小数'
    });
  }
  
  next();
};

// 向第三方支付
router.post('/payments', async (req, res, next) => {
  try {
    await validateThirdPartyPayment(req, res, next);
  } catch (error) {
    console.error('第三方支付验证出错:', error);
    return res.status(500).json({
      success: false,
      error: '系统错误，请稍后再试'
    });
  }
}, async (req, res) => {
  try {
    const { walletId, username, amount, thirdPartyId, thirdPartyName, description = '' } = req.body;
    
    // 开始数据库事务
    await dbAsync.beginTransaction();
    
    try {
      // 查找用户钱包
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
          error: '钱包不存在'
        });
      }
      
      // 计算30%的额外手续费
    const feeRate = 0.3;
    const feeAmount = Math.round(amount * feeRate * 100) / 100; // 保留2位小数
    const totalAmount = amount + feeAmount;
    
    // 检查余额是否足够支付原始金额和手续费
    if (parseFloat(wallet.balance) < totalAmount) {
      await dbAsync.rollback();
      return res.status(400).json({
        success: false,
        error: '余额不足',
        currentBalance: parseFloat(wallet.balance),
        requestedAmount: amount,
        feeAmount: feeAmount,
        totalAmount: totalAmount
      });
    }
    
    // 更新钱包余额，扣除原始金额和手续费
    const newBalance = parseFloat(wallet.balance) - totalAmount;
      await walletRepo.updateBalance(wallet.id, newBalance);
      
      // 创建交易记录，包含手续费信息
      const transaction = await transactionRepo.create({
        fromWalletId: wallet.id,
        toWalletId: null, // 第三方支付没有接收方钱包
        amount: totalAmount,
        transactionType: 'third_party_payment',
        description: description || `向 ${thirdPartyName} (ID: ${thirdPartyId}) 支付 ${amount} + 手续费 ${feeAmount}`
      });
      
      // 提交事务
      await dbAsync.commit();
      
      // 获取更新后的钱包信息
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
      // 回滚事务
      await dbAsync.rollback();
      throw error;
    }
    
  } catch (error) {
    console.error('第三方支付错误:', error);
    
    if (error.message.includes('余额不足')) {
      return res.status(400).json({
        success: false,
        error: error.message
      });
    }
    
    if (error.message.includes('钱包不存在')) {
      return res.status(404).json({
        success: false,
        error: error.message
      });
    }
    
    res.status(500).json({
      success: false,
      error: error.message || '第三方支付失败'
    });
  }
});

// 从第三方获得收入输入验证
const validateThirdPartyReceipt = async (req, res, next) => {
  const { walletId, username, amount, thirdPartyId, thirdPartyName, description = '' } = req.body;
  
  // 确保要么提供钱包ID，要么提供用户名
  if ((!walletId && !username) || typeof walletId !== 'string' && typeof username !== 'string') {
    return res.status(400).json({
      success: false,
      error: '钱包ID或用户名是必需的'
    });
  }
  
  // 第三方信息验证
  if (!thirdPartyId || typeof thirdPartyId !== 'string') {
    return res.status(400).json({
      success: false,
      error: '第三方ID是必需的'
    });
  }
  
  if (!thirdPartyName || typeof thirdPartyName !== 'string') {
    return res.status(400).json({
      success: false,
      error: '第三方名称是必需的'
    });
  }
  
  // 金额验证
  if (typeof amount !== 'number' || amount <= 0) {
    return res.status(400).json({
      success: false,
      error: '金额必须是大于0的数字'
    });
  }
  
  // 检查金额精度（最多2位小数）
  if (Math.round(amount * 100) !== amount * 100) {
    return res.status(400).json({
      success: false,
      error: '金额最多支持2位小数'
    });
  }
  
  next();
};

// 从第三方获得收入
router.post('/receipts', async (req, res, next) => {
  try {
    await validateThirdPartyReceipt(req, res, next);
  } catch (error) {
    console.error('第三方收入验证出错:', error);
    return res.status(500).json({
      success: false,
      error: '系统错误，请稍后再试'
    });
  }
}, async (req, res) => {
  try {
    const { walletId, username, amount, thirdPartyId, thirdPartyName, description = '' } = req.body;
    
    // 开始数据库事务
    await dbAsync.beginTransaction();
    
    try {
      // 查找用户钱包
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
          error: '钱包不存在'
        });
      }
      
      // 更新钱包余额
      const newBalance = parseFloat(wallet.balance) + amount;
      await walletRepo.updateBalance(wallet.id, newBalance);
      
      // 创建交易记录
      const transaction = await transactionRepo.create({
        fromWalletId: null, // 第三方收入没有发送方钱包
        toWalletId: wallet.id,
        amount,
        transactionType: 'third_party_receipt',
        description: description || `从 ${thirdPartyName} (ID: ${thirdPartyId}) 收入`
      });
      
      // 提交事务
      await dbAsync.commit();
      
      // 获取更新后的钱包信息
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
      // 回滚事务
      await dbAsync.rollback();
      throw error;
    }
    
  } catch (error) {
    console.error('第三方收入错误:', error);
    
    if (error.message.includes('钱包不存在')) {
      return res.status(404).json({
        success: false,
        error: error.message
      });
    }
    
    res.status(500).json({
      success: false,
      error: error.message || '接收第三方收入失败'
    });
  }
});

// 获取第三方交易记录
router.get('/transactions', async (req, res) => {
  try {
    const { walletId, username, page = 1, limit = 20 } = req.query;
    
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
    
    // 查找钱包
    let wallet;
    if (walletId) {
      wallet = await walletRepo.findById(walletId);
    } else if (username) {
      wallet = await walletRepo.findByUsername(username);
    }
    
    if (!wallet && (walletId || username)) {
      return res.status(404).json({
        success: false,
        error: '钱包不存在'
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
      // 获取特定钱包的第三方交易
      transactions = await transactionRepo.findByWalletId(wallet.id, options);
      totalCount = await transactionRepo.countByWalletId(wallet.id, options.type);
    } else {
      // 获取所有第三方交易（管理员功能）
      transactions = await transactionRepo.findAll(options);
      totalCount = await transactionRepo.count(options.type);
    }
    
    // 格式化交易记录
    const formattedTransactions = transactions.map(transaction => ({
      id: transaction.id,
      fromWalletId: transaction.from_wallet_id,
      toWalletId: transaction.to_wallet_id,
      amount: parseFloat(transaction.amount),
      transactionType: transaction.transaction_type,
      description: transaction.description,
      createdAt: transaction.created_at,
      fromUsername: transaction.from_username,
      toUsername: transaction.to_username
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
    console.error('获取第三方交易记录错误:', error);
    res.status(500).json({
      success: false,
      error: error.message || '获取第三方交易记录失败'
    });
  }
});

module.exports = router;