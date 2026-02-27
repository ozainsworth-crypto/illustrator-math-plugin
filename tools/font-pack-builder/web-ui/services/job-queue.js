/**
 * Job Queue Service
 * 
 * 管理转换任务的队列和状态
 */

const crypto = require('crypto');

class JobQueue {
  constructor() {
    this.jobs = new Map();
  }

  /**
   * 创建新任务
   * @param {string} fileId - 文件 ID
   * @param {string} fontName - 字体名称
   * @param {Object} options - 转换选项
   * @returns {string} jobId - 任务 ID
   */
  createJob(fileId, fontName, options) {
    const jobId = crypto.randomUUID();
    
    const job = {
      jobId,
      fileId,
      fontName,
      options,
      status: 'pending',
      progress: 0,
      message: '等待开始...',
      startedAt: new Date(),
      completedAt: null,
      result: null,
      error: null
    };
    
    this.jobs.set(jobId, job);
    return jobId;
  }

  /**
   * 获取任务状态
   * @param {string} jobId - 任务 ID
   * @returns {Object|null} 任务对象
   */
  getJob(jobId) {
    return this.jobs.get(jobId) || null;
  }

  /**
   * 更新任务状态
   * @param {string} jobId - 任务 ID
   * @param {Object} updates - 更新内容
   */
  updateJob(jobId, updates) {
    const job = this.jobs.get(jobId);
    if (!job) {
      throw new Error(`Job ${jobId} not found`);
    }
    
    Object.assign(job, updates);
    this.jobs.set(jobId, job);
  }

  /**
   * 设置任务为处理中
   * @param {string} jobId - 任务 ID
   * @param {string} message - 状态消息
   */
  setProcessing(jobId, message = '正在处理...') {
    this.updateJob(jobId, {
      status: 'processing',
      message,
      progress: 10
    });
  }

  /**
   * 更新任务进度
   * @param {string} jobId - 任务 ID
   * @param {number} progress - 进度 (0-100)
   * @param {string} message - 状态消息
   */
  updateProgress(jobId, progress, message) {
    this.updateJob(jobId, {
      progress: Math.min(100, Math.max(0, progress)),
      message
    });
  }

  /**
   * 设置任务为完成
   * @param {string} jobId - 任务 ID
   * @param {Object} result - 转换结果
   */
  setCompleted(jobId, result) {
    this.updateJob(jobId, {
      status: 'completed',
      progress: 100,
      message: '转换完成',
      completedAt: new Date(),
      result
    });
  }

  /**
   * 设置任务为失败
   * @param {string} jobId - 任务 ID
   * @param {string} error - 错误信息
   */
  setFailed(jobId, error) {
    this.updateJob(jobId, {
      status: 'failed',
      message: '转换失败',
      completedAt: new Date(),
      error
    });
  }

  /**
   * 清理旧任务（保留最近 50 个）
   */
  cleanup() {
    if (this.jobs.size <= 50) {
      return;
    }
    
    // 按创建时间排序
    const sortedJobs = Array.from(this.jobs.entries())
      .sort((a, b) => b[1].startedAt - a[1].startedAt);
    
    // 保留最近 50 个
    const toKeep = sortedJobs.slice(0, 50);
    this.jobs = new Map(toKeep);
  }
}

// 单例模式
let instance = null;

function getJobQueue() {
  if (!instance) {
    instance = new JobQueue();
  }
  return instance;
}

module.exports = getJobQueue;
