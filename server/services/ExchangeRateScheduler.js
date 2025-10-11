const schedule = require('node-schedule');
const exchangeRateService = require('./ExchangeRateService');

/**
 * 汇率调度器
 * 负责每小时生成和保存随机汇率
 */
class ExchangeRateScheduler {
  constructor() {
    this.job = null;
    // Exchange rate range: 1 USD = 2000-3000 local currency. Adjusted to a more reasonable range.
    // 强制汇率价格范围范围锁定：1美元 = 1950-2050本地货币
    this.minRate = 1950;
    this.maxRate = 2050;
  }

  /**
   * 生成随机汇率
   * @returns {number} 随机生成的汇率值
   */
  generateRandomRate() {
    return Math.floor(Math.random() * (this.maxRate - this.minRate + 1)) + this.minRate;
  }

  /**
   * 启动汇率调度器
   * 设置为每天UTC+0 9-15时随机时间段中生成15-30次随机汇率
   */
  async start() {
    try {
      // 确保汇率表存在
      const tableCreated = await exchangeRateService.ensureTableExists();
      if (!tableCreated) {
        throw new Error('创建汇率表失败');
      }

      console.log('启动汇率调度器...');
      
      // 每天执行一次任务，在UTC时间0点触发，然后在触发后随机选择9-15点之间的时间段执行
      // 格式: '秒 分 时 日 月 星期'
      // 0 0 0 * * * 表示每天0点0分0秒执行
      this.job = schedule.scheduleJob('0 0 0 * * *', async () => {
        console.log(`[${new Date().toISOString()}] 汇率调度器触发，准备在今天UTC+0 9-15时之间执行汇率生成任务`);
        
        try {
          // 在当天UTC+0 9-15时之间执行汇率生成任务
          await this.executeDailyRates();
        } catch (error) {
          console.error(`[${new Date().toISOString()}] 汇率生成任务发生异常:`, error);
        }
      });
      
      console.log('汇率调度器已启动，将每天在UTC+0 9-15时之间的随机时间段生成15-30次随机汇率');
      console.log('下次执行时间:', this.job.nextInvocation());
      
      // 立即生成并保存一次汇率（初始化）
      await this.executeNow();
      
      return { success: true };
    } catch (error) {
      console.error('启动汇率调度器失败:', error);
      return { success: false, error: error.message };
    }
  }

  /**
   * 执行每日汇率生成任务
   * 在UTC+0 9-15时之间随机生成15-30次汇率
   * @returns {Promise<void>}
   */
  async executeDailyRates() {
    const today = new Date();
    console.log(`[${today.toISOString()}] 开始执行每日汇率生成任务`);
    
    try {
      // 为当天生成15-30条记录
      const recordsForDay = 15 + Math.floor(Math.random() * 16); // 15到30之间（包括30）
      
      // 设置当天的开始时间（UTC+0 9:00）
      const dayStartTime = new Date(today);
      dayStartTime.setUTCHours(9, 0, 0, 0);
      
      // 设置当天的结束时间（UTC+0 15:00）
      const dayEndTime = new Date(today);
      dayEndTime.setUTCHours(15, 0, 0, 0);
      
      // 计算当天可以使用的总时间（毫秒）
      const availableTimeWindow = dayEndTime - dayStartTime;
      
      // 生成当天的所有记录时间点
      const recordTimes = [];
      
      for (let i = 0; i < recordsForDay; i++) {
        // 为每条记录随机分配一个时间点
        const randomOffset = Math.floor(Math.random() * availableTimeWindow);
        const recordTime = new Date(dayStartTime.getTime() + randomOffset);
        recordTimes.push(recordTime);
      }
      
      // 对时间点进行排序，确保它们按时间顺序排列
      recordTimes.sort((a, b) => a - b);
      
      // 调整记录时间，确保每条记录之间的间隔合理
      this.adjustRecordIntervals(recordTimes);
      
      // 为每条记录生成并保存汇率
      let successCount = 0;
      for (const recordTime of recordTimes) {
        // 计算当前时间与计划执行时间的差值（毫秒）
        const timeUntilExecution = recordTime - new Date();
        
        // 如果差值为正，等待到计划执行时间
        if (timeUntilExecution > 0) {
          await new Promise(resolve => setTimeout(resolve, timeUntilExecution));
        }
        
        // 生成随机汇率
        const randomRate = this.generateRandomRate();
        
        // 保存汇率
        const result = await exchangeRateService.saveRate(randomRate);
        
        if (result.success) {
          console.log(`[${new Date().toISOString()}] 汇率生成并保存成功: 1美元 = ${randomRate} 本地货币`);
          successCount++;
        } else {
          console.error(`[${new Date().toISOString()}] 保存汇率失败:`, result.message);
        }
      }
      
      console.log(`[${new Date().toISOString()}] 每日汇率生成任务完成，成功生成 ${successCount} 条汇率记录`);
    } catch (error) {
      console.error(`[${new Date().toISOString()}] 执行每日汇率生成任务时出错:`, error);
      throw error;
    }
  }

  /**
   * 停止汇率调度器
   */
  stop() {
    if (this.job) {
      this.job.cancel();
      this.job = null;
      console.log('汇率调度器已停止');
    } else {
      console.log('汇率调度器未运行');
    }
  }

  /**
   * 立即执行一次汇率生成和保存
   * @returns {Promise<Object>} 执行结果
   */
  async executeNow() {
    console.log('手动触发汇率生成...');
    
    try {
      const randomRate = this.generateRandomRate();
      const result = await exchangeRateService.saveRate(randomRate);
      
      if (result.success) {
        console.log(`手动生成汇率成功: 1美元 = ${randomRate} 本地货币`);
      }
      
      return result;
    } catch (error) {
      console.error('手动生成汇率时出错:', error);
      return { success: false, message: error.message };
    }
  }

  /**
   * 获取下一次执行时间
   * @returns {Date|null} 下一次执行时间
   */
  getNextExecutionTime() {
    if (this.job) {
      return this.job.nextInvocation();
    }
    return null;
  }

  /**
   * 生成过去10年的历史汇率数据
   * 到2025/9/7，在每天UTC+0 9:00-15:00之间生成10-30条随机汇率数据
   * 每条记录之间必须间隔15分钟-2小时
   * @returns {Promise<Object>} 生成结果
   */
  async generateHistoricalRates() {
    try {
      console.log('开始生成过去10年的历史汇率数据...');
      
      // 确保汇率表存在
      const tableCreated = await exchangeRateService.ensureTableExists();
      if (!tableCreated) {
        throw new Error('创建汇率表失败');
      }

      const endDate = new Date('2025-09-07T00:00:00Z');
      const startDate = new Date(endDate.getTime() - 10 * 365 * 24 * 60 * 60 * 1000);
      let currentDate = new Date(startDate);
      let count = 0;

      // 计算总天数并估算总记录数（用于进度显示）
      const totalDays = Math.ceil((endDate - startDate) / (1000 * 60 * 60 * 24));
      const estimatedTotalRecords = totalDays * 20; // 估算每天20条记录
      const batchSize = Math.max(1, Math.floor(estimatedTotalRecords / 100)); // 分成100批显示进度
      
      while (currentDate <= endDate) {
        // 为当天生成10-30条记录
        const recordsForDay = 10 + Math.floor(Math.random() * 21); // 10到30之间（包括30）
        
        // 设置当天的开始时间（UTC+0 9:00）
        const dayStartTime = new Date(currentDate);
        dayStartTime.setUTCHours(9, 0, 0, 0);
        
        // 设置当天的结束时间（UTC+0 15:00）
        const dayEndTime = new Date(currentDate);
        dayEndTime.setUTCHours(15, 0, 0, 0);
        
        // 计算当天可以使用的总时间（毫秒）
        const availableTimeWindow = dayEndTime - dayStartTime;
        
        // 生成当天的所有记录时间点
        const recordTimes = [];
        
        for (let i = 0; i < recordsForDay; i++) {
          // 为每条记录随机分配一个时间点
          const randomOffset = Math.floor(Math.random() * availableTimeWindow);
          const recordTime = new Date(dayStartTime.getTime() + randomOffset);
          recordTimes.push(recordTime);
        }
        
        // 对时间点进行排序，确保它们按时间顺序排列
        recordTimes.sort((a, b) => a - b);
        
        // 调整记录时间，确保每条记录之间的间隔在15分钟-2小时之间
        this.adjustRecordIntervals(recordTimes);
        
        // 为每条记录生成并保存汇率
        for (const recordTime of recordTimes) {
          // 生成随机汇率
          const randomRate = this.generateRandomRate();
          
          // 保存汇率
          const result = await exchangeRateService.saveRate(randomRate, recordTime);
          
          if (result.success) {
            count++;
          } else {
            console.error(`保存历史汇率失败 (${recordTime.toISOString()}):`, result.message);
          }
          
          // 显示进度
          if (count % batchSize === 0) {
            const progress = Math.min(100, Math.floor((count / estimatedTotalRecords) * 100));
            console.log(`进度: ${progress}% (已生成 ${count} 条记录)`);
          }
        }
        
        // 移动到下一天
        currentDate.setDate(currentDate.getDate() + 1);
      }
      
      console.log(`成功生成 ${count} 条历史汇率数据，覆盖从 ${startDate.toISOString()} 到 ${endDate.toISOString()} 的时间段`);
      
      return {
        success: true,
        count,
        startDate: startDate.toISOString(),
        endDate: endDate.toISOString()
      };
    } catch (error) {
      console.error('生成历史汇率数据时出错:', error);
      return {
        success: false,
        message: error.message
      };
    }
  }

  /**
   * 调整记录时间间隔，确保每条记录之间的间隔在15分钟-2小时之间
   * @param {Array<Date>} recordTimes - 记录时间数组（已排序）
   */
  adjustRecordIntervals(recordTimes) {
    const minInterval = 15 * 60 * 1000; // 15分钟（毫秒）
    const maxInterval = 2 * 60 * 60 * 1000; // 2小时（毫秒）
    
    // 从第二条记录开始调整
    for (let i = 1; i < recordTimes.length; i++) {
      const prevTime = recordTimes[i - 1];
      let currentTime = recordTimes[i];
      
      // 计算当前时间间隔
      const currentInterval = currentTime - prevTime;
      
      // 如果间隔小于最小值，调整当前时间
      if (currentInterval < minInterval) {
        // 随机选择一个在最小和最大间隔之间的值
        const newInterval = minInterval + Math.floor(Math.random() * (maxInterval - minInterval + 1));
        currentTime = new Date(prevTime.getTime() + newInterval);
        recordTimes[i] = currentTime;
        
        // 调整后续所有记录的时间
        for (let j = i + 1; j < recordTimes.length; j++) {
          recordTimes[j] = new Date(recordTimes[j].getTime() + (currentTime - recordTimes[i]));
        }
      }
      // 如果间隔大于最大值，也进行调整
      else if (currentInterval > maxInterval) {
        // 随机选择一个在最小和最大间隔之间的值
        const newInterval = minInterval + Math.floor(Math.random() * (maxInterval - minInterval + 1));
        currentTime = new Date(prevTime.getTime() + newInterval);
        recordTimes[i] = currentTime;
        
        // 调整后续所有记录的时间
        for (let j = i + 1; j < recordTimes.length; j++) {
          recordTimes[j] = new Date(recordTimes[j].getTime() - (recordTimes[i] - currentTime));
        }
      }
    }
  }
}

// 创建单例实例
const exchangeRateScheduler = new ExchangeRateScheduler();

module.exports = exchangeRateScheduler;