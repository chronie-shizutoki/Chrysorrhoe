const { dbAsync } = require('../config/database');
const WalletRepository = require('../repositories/WalletRepository');
const TransactionRepository = require('../repositories/TransactionRepository');

/**
 * 利息服务
 * 负责处理每月利息计算和发放
 */
class InterestService {
  constructor() {
    this.walletRepo = new WalletRepository();
    this.transactionRepo = new TransactionRepository();
    // 默认月利率 (1% 年化利率，月化为约 0.083%)
    this.monthlyInterestRate = 0.01 / 12;
  }

  /**
   * 设置月利率
   * @param {number} rate - 月利率（例如：0.0008表示0.08%）
   */
  setMonthlyInterestRate(rate) {
    if (typeof rate !== 'number') {
      throw new Error('利率必须是数字');
    }
    this.monthlyInterestRate = rate;
  }

  /**
   * 计算单个钱包的利息
   * @param {Object} wallet - 钱包对象
   * @returns {number} 计算的利息
   */
  calculateInterest(wallet) {
    const balance = parseFloat(wallet.balance);
    // 利息 = 余额 * 月利率
    return balance * this.monthlyInterestRate;
  }

  /**
   * 初始化利息发放记录表
   * 记录每次利息发放的状态，用于追踪和补发
   */
  async initInterestLogTable() {
    try {
      await dbAsync.run(`
        CREATE TABLE IF NOT EXISTS interest_logs (
          id TEXT PRIMARY KEY,
          period TEXT NOT NULL,
          status TEXT NOT NULL CHECK (status IN ('PENDING', 'PROCESSING', 'COMPLETED', 'FAILED')),
          total_wallets INTEGER NOT NULL DEFAULT 0,
          processed_count INTEGER NOT NULL DEFAULT 0,
          total_interest REAL NOT NULL DEFAULT 0,
          error_message TEXT,
          created_at TEXT NOT NULL DEFAULT (datetime('now')),
          updated_at TEXT NOT NULL DEFAULT (datetime('now'))
        );
        
        CREATE INDEX IF NOT EXISTS idx_interest_logs_period ON interest_logs(period);
        CREATE INDEX IF NOT EXISTS idx_interest_logs_status ON interest_logs(status);
      `);
    } catch (error) {
      console.error('初始化利息发放记录表失败:', error);
    }
  }

  /**
   * 获取指定月份的利息发放记录
   * @param {string} period - 期号，格式：YYYY-MM
   * @returns {Promise<Object|null>} 利息发放记录
   */
  async getInterestLogByPeriod(period) {
    try {
      const log = await dbAsync.get(
        'SELECT * FROM interest_logs WHERE period = ?',
        [period]
      );
      return log || null;
    } catch (error) {
      console.error('获取利息发放记录失败:', error);
      return null;
    }
  }

  /**
   * 创建新的利息发放记录
   * @param {string} period - 期号
   * @returns {Promise<string>} 记录ID
   */
  async createInterestLog(period) {
    const { v4: uuidv4 } = require('uuid');
    const id = uuidv4();
    
    try {
      await dbAsync.run(
        `INSERT INTO interest_logs (id, period, status)
         VALUES (?, ?, ?)`,
        [id, period, 'PENDING']
      );
      return id;
    } catch (error) {
      console.error('创建利息发放记录失败:', error);
      throw error;
    }
  }

  /**
   * 更新利息发放记录
   * @param {string} id - 记录ID
   * @param {Object} updates - 更新数据
   */
  async updateInterestLog(id, updates) {
    const allowedFields = ['status', 'total_wallets', 'processed_count', 'total_interest', 'error_message'];
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
      return;
    }
    
    // 添加updated_at字段
    updateFields.push('updated_at = ?');
    updateValues.push(new Date().toISOString());
    updateValues.push(id);
    
    try {
      await dbAsync.run(
        `UPDATE interest_logs SET ${updateFields.join(', ')} WHERE id = ?`,
        updateValues
      );
    } catch (error) {
      console.error('更新利息发放记录失败:', error);
    }
  }

  /**
   * 获取需要补发利息的月份
   * @returns {Promise<Array<string>>} 需要补发的月份列表
   */
  async getPendingInterestPeriods() {
    try {
      // 获取所有状态为PENDING或FAILED的记录
      const logs = await dbAsync.all(
        `SELECT period FROM interest_logs 
         WHERE status IN ('PENDING', 'FAILED') 
         ORDER BY period ASC`
      );
      return logs.map(log => log.period);
    } catch (error) {
      console.error('获取待处理利息发放记录失败:', error);
      return [];
    }
  }

  /**
   * 处理所有钱包的每日利息
   * @returns {Promise<Object>} 处理结果
   * @deprecated 改用processMonthlyInterest
   */
  async processDailyInterest() {
    console.warn('processDailyInterest方法已废弃，请使用processMonthlyInterest');
    return await this.processMonthlyInterest();
  }

  /**
   * 处理所有钱包的每月利息
   * @param {string} targetPeriod - 可选，指定要处理的月份，格式：YYYY-MM
   * @returns {Promise<Object>} 处理结果
   */
  async processMonthlyInterest(targetPeriod = null) {
    // 如果未指定月份，使用当前月份
    const period = targetPeriod || new Date().toISOString().slice(0, 7); // 格式：YYYY-MM
    console.log(`开始处理${period}月份利息...`);
    
    // 初始化利息发放记录表
    await this.initInterestLogTable();
    
    // 检查该月份的利息是否已经处理过
    const existingLog = await this.getInterestLogByPeriod(period);
    if (existingLog && existingLog.status === 'COMPLETED') {
      console.log(`${period}月份利息已经处理完成，无需重复处理`);
      return {
        success: true,
        message: `${period}月份利息已经处理完成`,
        period,
        processedCount: existingLog.processed_count,
        totalInterest: existingLog.total_interest
      };
    }
    
    // 创建或获取记录ID
    let logId;
    if (existingLog) {
      logId = existingLog.id;
    } else {
      logId = await this.createInterestLog(period);
    }
    
    // 更新记录状态为处理中
    await this.updateInterestLog(logId, { status: 'PROCESSING' });
    
    try {
      // 开始事务
      await dbAsync.beginTransaction();
      
      try {
        // 获取所有钱包
        const wallets = await this.walletRepo.findAll({ limit: null });
        
        // 更新总钱包数
        await this.updateInterestLog(logId, { total_wallets: wallets.length });
        
        if (!wallets || wallets.length === 0) {
          await dbAsync.commit();
          await this.updateInterestLog(logId, {
            status: 'COMPLETED',
            processed_count: 0,
            total_interest: 0
          });
          return {
            success: true,
            message: '没有钱包需要处理利息',
            period,
            processedCount: 0,
            totalInterest: 0
          };
        }

        let totalInterest = 0;
        let processedCount = 0;

        // 为每个钱包计算并应用利息
        for (const wallet of wallets) {
          const interest = this.calculateInterest(wallet);
          
          if (Math.abs(interest) > 0) { // 只处理有利息变动的钱包
            const newBalance = parseFloat(wallet.balance) + interest;
            
            // 更新钱包余额
            await this.walletRepo.updateBalance(wallet.id, newBalance);
            
            // 创建利息交易记录
            const description = interest > 0 
              ? `${period}月利息收入: ${interest.toFixed(2)}` 
              : `${period}月利息支出: ${Math.abs(interest).toFixed(2)}`;
            
            if (interest > 0) {
              await this.transactionRepo.createInterestCredit(
                wallet.id,
                interest,
                description
              );
            } else {
              await this.transactionRepo.createInterestDebit(
                wallet.id,
                Math.abs(interest),
                description
              );
            }
            
            totalInterest += interest;
            processedCount++;
          }
        }

        // 提交事务
        await dbAsync.commit();
        
        // 更新记录为完成状态
        await this.updateInterestLog(logId, {
          status: 'COMPLETED',
          processed_count: processedCount,
          total_interest: totalInterest
        });
        
        console.log(`${period}月份利息处理完成: 共处理 ${processedCount} 个钱包，总利息 ${totalInterest.toFixed(2)}`);
        
        return {
          success: true,
          message: '每月利息处理成功',
          period,
          processedCount,
          totalInterest
        };
        
      } catch (error) {
        // 回滚事务
        await dbAsync.rollback();
        // 更新记录为失败状态
        await this.updateInterestLog(logId, {
          status: 'FAILED',
          error_message: error.message
        });
        throw error;
      }
    } catch (error) {
      console.error(`处理${period}月份利息时出错:`, error);
      return {
        success: false,
        message: error.message,
        period,
        error: error
      };
    }
  }

  /**
   * 检查并补发遗漏的利息
   * @returns {Promise<Object>} 补发结果
   */
  async checkAnd补发Interest() {
    console.log('开始检查并补发遗漏的利息...');
    
    // 获取需要补发的月份
    const pendingPeriods = await this.getPendingInterestPeriods();
    
    if (pendingPeriods.length === 0) {
      console.log('没有发现需要补发的利息');
      return {
        success: true,
        message: '没有需要补发的利息',
        processedPeriods: []
      };
    }
    
    const processedPeriods = [];
    let allSuccess = true;
    
    for (const period of pendingPeriods) {
      console.log(`开始补发${period}月份的利息...`);
      
      try {
        const result = await this.processMonthlyInterest(period);
        if (result.success) {
          processedPeriods.push({
            period,
            success: true,
            processedCount: result.processedCount,
            totalInterest: result.totalInterest
          });
          console.log(`${period}月份利息补发成功`);
        } else {
          processedPeriods.push({
            period,
            success: false,
            message: result.message
          });
          allSuccess = false;
          console.error(`${period}月份利息补发失败:`, result.message);
        }
      } catch (error) {
        processedPeriods.push({
          period,
          success: false,
          message: error.message
        });
        allSuccess = false;
        console.error(`${period}月份利息补发异常:`, error);
      }
    }
    
    console.log(`利息补发完成，共处理 ${pendingPeriods.length} 个月份`);
    
    return {
      success: allSuccess,
      message: allSuccess ? '所有遗漏利息补发成功' : '部分利息补发失败',
      processedPeriods
    };
  }

  /**
   * 检查并创建必要的交易类型
   * 确保transactions表支持interest_credit和interest_debit交易类型
   */
  async ensureInterestTransactionTypes() {
    // 在实际应用中，可能需要检查数据库约束或枚举类型
    // 这里简化处理，因为当前的TransactionRepository允许任何交易类型
    console.log('确保利息交易类型已配置');
  }
}

module.exports = InterestService;