const schedule = require('node-schedule');
const InterestService = require('./InterestService');

/**
 * 利息调度器
 * 负责安排和管理每月利息计算任务
 */
class InterestScheduler {
  constructor() {
    this.interestService = new InterestService();
    this.monthlyJob = null;
    this.checkJob = null;
  }

  /**
   * 启动利息调度器
   * 设置每月1日 UTC+0 00:00 执行一次利息计算
   * 同时设置每日检查是否有遗漏的利息需要补发
   */
  async start() {
    try {
      // 确保利息交易类型已配置
      await this.interestService.ensureInterestTransactionTypes();
      
      console.log('启动利息调度器...');
      
      // 每月1日 UTC+0 00:00 执行任务
      // 格式: '秒 分 时 日 月 星期'
      // 0 0 0 1 * * 表示每月1日00:00:00执行
      this.monthlyJob = schedule.scheduleJob('0 0 0 1 * *', async () => {
        console.log(`[${new Date().toISOString()}] 执行每月利息计算任务`);
        
        try {
          const result = await this.interestService.processMonthlyInterest();
          if (result.success) {
            console.log(`[${new Date().toISOString()}] 利息计算任务执行成功:`, result);
          } else {
            console.error(`[${new Date().toISOString()}] 利息计算任务执行失败:`, result.message);
          }
        } catch (error) {
          console.error(`[${new Date().toISOString()}] 利息计算任务发生异常:`, error);
        }
      });
      
      // 每日UTC+0 12:00检查是否有遗漏的利息需要补发
      this.checkJob = schedule.scheduleJob('0 0 12 * * *', async () => {
        console.log(`[${new Date().toISOString()}] 执行利息补发检查任务`);
        
        try {
          const result = await this.interestService.checkAnd补发Interest();
          if (result.success) {
            console.log(`[${new Date().toISOString()}] 利息补发检查任务执行成功:`, result);
          } else {
            console.error(`[${new Date().toISOString()}] 利息补发检查任务执行失败:`, result.message);
          }
        } catch (error) {
          console.error(`[${new Date().toISOString()}] 利息补发检查任务发生异常:`, error);
        }
      });
      
      console.log('利息调度器已启动，将在每月1日 UTC+0 00:00 执行利息计算');
      console.log('下次执行利息计算时间:', this.monthlyJob.nextInvocation());
      console.log('利息补发检查调度已启动，将在每日 UTC+0 12:00 执行检查');
      console.log('下次执行检查时间:', this.checkJob.nextInvocation());
      
      // 启动时立即检查一次是否有遗漏的利息需要补发
      this.checkMissingInterest();
      
      return { success: true };
    } catch (error) {
      console.error('启动利息调度器失败:', error);
      return { success: false, error: error.message };
    }
  }

  /**
   * 停止利息调度器
   */
  stop() {
    if (this.monthlyJob) {
      this.monthlyJob.cancel();
      this.monthlyJob = null;
    }
    
    if (this.checkJob) {
      this.checkJob.cancel();
      this.checkJob = null;
    }
    
    console.log('利息调度器已停止');
  }

  /**
   * 立即执行一次利息计算（用于测试或手动触发）
   * @returns {Promise<Object>} 执行结果
   */
  async executeNow() {
    console.log('手动触发利息计算...');
    return await this.interestService.processMonthlyInterest();
  }

  /**
   * 立即执行一次特定月份的利息计算
   * @param {string} period - 月份，格式：YYYY-MM
   * @returns {Promise<Object>} 执行结果
   */
  async executeForPeriod(period) {
    console.log(`手动触发${period}月份利息计算...`);
    return await this.interestService.processMonthlyInterest(period);
  }

  /**
   * 立即执行利息补发检查
   * @returns {Promise<Object>} 执行结果
   */
  async checkMissingInterest() {
    console.log('手动触发利息补发检查...');
    return await this.interestService.checkAnd补发Interest();
  }

  /**
   * 获取下一次执行时间
   * @returns {Date|null} 下一次执行时间
   */
  getNextExecutionTime() {
    if (this.monthlyJob) {
      return this.monthlyJob.nextInvocation();
    }
    return null;
  }

  /**
   * 获取下一次检查时间
   * @returns {Date|null} 下一次检查时间
   */
  getNextCheckTime() {
    if (this.checkJob) {
      return this.checkJob.nextInvocation();
    }
    return null;
  }
}

// 创建单例实例
const interestScheduler = new InterestScheduler();

module.exports = interestScheduler;