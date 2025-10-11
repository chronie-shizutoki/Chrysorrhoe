const { dbAsync } = require('../config/database');
const { v4: uuidv4 } = require('uuid');

/**
 * 钱包数据访问层
 * 提供钱包相关的数据库操作方法
 */
class WalletRepository {
  
  /**
   * 创建新钱包
   * @param {Object} walletData - 钱包数据
   * @param {string} walletData.username - 用户名
   * @param {number} walletData.balance - 初始余额
   * @returns {Promise<Object>} 创建的钱包对象
   */
  async create(walletData) {
    const { username, balance } = walletData;
    const id = uuidv4();
    const now = new Date().toISOString();
    
    // 验证用户名只能包含英语字母
    if (!/^[a-zA-Z]+$/.test(username.trim())) {
      throw new Error('用户名只能包含英语字母');
    }
    
    // 验证初始余额只能是0
    if (balance !== undefined && balance !== 0) {
      throw new Error('初始余额只能是0');
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
        throw new Error('用户名已存在');
      }
      throw new Error(`创建钱包失败: ${error.message}`);
    }
  }

  /**
   * 根据ID查找钱包
   * @param {string} id - 钱包ID
   * @returns {Promise<Object|null>} 钱包对象或null
   */
  async findById(id) {
    try {
      const wallet = await dbAsync.get(
        'SELECT * FROM wallets WHERE id = ?',
        [id]
      );
      return wallet || null;
    } catch (error) {
      throw new Error(`查找钱包失败: ${error.message}`);
    }
  }

  /**
   * 根据用户名查找钱包
   * @param {string} username - 用户名
   * @returns {Promise<Object|null>} 钱包对象或null
   */
  async findByUsername(username) {
    try {
      const wallet = await dbAsync.get(
        'SELECT * FROM wallets WHERE username = ?',
        [username]
      );
      return wallet || null;
    } catch (error) {
      throw new Error(`查找钱包失败: ${error.message}`);
    }
  }

  /**
   * 获取所有钱包
   * @param {Object} options - 查询选项
   * @param {number} options.limit - 限制数量
   * @param {number} options.offset - 偏移量
   * @returns {Promise<Array>} 钱包列表
   */
  async findAll(options = {}) {
    const { limit = 50, offset = 0 } = options;
    
    try {
      // 处理limit为null的情况
      const actualLimit = limit === null ? 0 : limit;
      const actualOffset = offset || 0;
      
      // 当limit为0时，表示不限制数量
      const query = actualLimit > 0 
        ? 'SELECT * FROM wallets ORDER BY created_at DESC LIMIT ? OFFSET ?' 
        : 'SELECT * FROM wallets ORDER BY created_at DESC';
      
      const params = actualLimit > 0 ? [actualLimit, actualOffset] : [];
      
      const wallets = await dbAsync.all(query, params);
      return wallets;
    } catch (error) {
      throw new Error(`获取钱包列表失败: ${error.message}`);
    }
  }

  /**
   * 更新钱包信息
   * @param {string} id - 钱包ID
   * @param {Object} updates - 更新数据
   * @returns {Promise<Object>} 更新后的钱包对象
   */
  async update(id, updates) {
    const allowedFields = ['username', 'balance'];
    const updateFields = [];
    const updateValues = [];
    
    // 构建更新字段
    for (const [key, value] of Object.entries(updates)) {
      if (allowedFields.includes(key)) {
        updateFields.push(`${key} = ?`);
        updateValues.push(value);
      }
    }
    
    if (updateFields.length === 0) {
      throw new Error('没有有效的更新字段');
    }
    
    // 添加updated_at字段
    updateFields.push('updated_at = ?');
    updateValues.push(new Date().toISOString());
    updateValues.push(id);
    
    try {
      const result = await dbAsync.run(
        `UPDATE wallets SET ${updateFields.join(', ')} WHERE id = ?`,
        updateValues
      );
      
      if (result.changes === 0) {
        throw new Error('钱包不存在');
      }
      
      return await this.findById(id);
    } catch (error) {
      if (error.message.includes('UNIQUE constraint failed')) {
        throw new Error('用户名已存在');
      }
      throw new Error(`更新钱包失败: ${error.message}`);
    }
  }

  /**
   * 更新钱包余额
   * @param {string} id - 钱包ID
   * @param {number} newBalance - 新余额
   * @returns {Promise<Object>} 更新后的钱包对象
   */
  async updateBalance(id, newBalance) {
    if (typeof newBalance !== 'number' || newBalance < 0) {
      throw new Error('余额必须为非负数');
    }
    
    return await this.update(id, { balance: newBalance });
  }

  /**
   * 删除钱包
   * @param {string} id - 钱包ID
   * @returns {Promise<boolean>} 是否删除成功
   */
  async delete(id) {
    try {
      // 检查是否有相关交易
      const transactionCount = await dbAsync.get(
        'SELECT COUNT(*) as count FROM transactions WHERE from_wallet_id = ? OR to_wallet_id = ?',
        [id, id]
      );
      
      if (transactionCount.count > 0) {
        throw new Error('无法删除有交易记录的钱包');
      }
      
      const result = await dbAsync.run(
        'DELETE FROM wallets WHERE id = ?',
        [id]
      );
      
      return result.changes > 0;
    } catch (error) {
      throw new Error(`删除钱包失败: ${error.message}`);
    }
  }

  /**
   * 获取钱包总数
   * @returns {Promise<number>} 钱包总数
   */
  async count() {
    try {
      const result = await dbAsync.get('SELECT COUNT(*) as count FROM wallets');
      return result.count;
    } catch (error) {
      throw new Error(`获取钱包总数失败: ${error.message}`);
    }
  }

  /**
   * 检查用户名是否存在
   * @param {string} username - 用户名
   * @returns {Promise<boolean>} 是否存在
   */
  async usernameExists(username) {
    try {
      const result = await dbAsync.get(
        'SELECT COUNT(*) as count FROM wallets WHERE username = ?',
        [username]
      );
      return result.count > 0;
    } catch (error) {
      throw new Error(`检查用户名失败: ${error.message}`);
    }
  }

  /**
   * 批量转账操作（事务）
   * @param {string} fromId - 发送方钱包ID
   * @param {string} toId - 接收方钱包ID
   * @param {number} amount - 转账金额
   * @returns {Promise<Object>} 转账结果
   */
  async transfer(fromId, toId, amount) {
    if (amount <= 0) {
      throw new Error('转账金额必须大于0');
    }
    
    try {
      // 开始事务
      await dbAsync.beginTransaction();
      
      // 获取发送方钱包
      const fromWallet = await this.findById(fromId);
      if (!fromWallet) {
        throw new Error('发送方钱包不存在');
      }
      
      // 获取接收方钱包
      const toWallet = await this.findById(toId);
      if (!toWallet) {
        throw new Error('接收方钱包不存在');
      }
      
      // 检查余额
      if (fromWallet.balance < amount) {
        throw new Error('余额不足');
      }
      
      // 更新余额
      await this.updateBalance(fromId, fromWallet.balance - amount);
      await this.updateBalance(toId, toWallet.balance + amount);
      
      // 提交事务
      await dbAsync.commit();
      
      return {
        success: true,
        fromWallet: await this.findById(fromId),
        toWallet: await this.findById(toId)
      };
    } catch (error) {
      // 回滚事务
      await dbAsync.rollback();
      throw error;
    }
  }
}

module.exports = WalletRepository;