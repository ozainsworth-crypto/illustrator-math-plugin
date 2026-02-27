/**
 * History Service - 管理转换历史记录
 * 
 * 功能:
 * - 保存转换历史记录到 JSON 文件
 * - 查询历史记录
 * - 自动清理旧记录(保留最近 50 条)
 */

const fs = require('fs').promises;
const path = require('path');

class HistoryService {
  constructor() {
    // 历史记录文件路径
    this.historyFile = path.join(__dirname, '../data/history.json');
    this.maxRecords = 50; // 最多保留 50 条记录
  }

  /**
   * 初始化历史记录文件
   */
  async initialize() {
    try {
      const dataDir = path.dirname(this.historyFile);
      
      // 确保 data 目录存在
      try {
        await fs.access(dataDir);
      } catch {
        await fs.mkdir(dataDir, { recursive: true });
      }

      // 确保历史记录文件存在
      try {
        await fs.access(this.historyFile);
      } catch {
        await fs.writeFile(this.historyFile, JSON.stringify({ records: [] }, null, 2));
      }
    } catch (error) {
      console.error('Failed to initialize history service:', error);
      throw error;
    }
  }

  /**
   * 读取历史记录
   */
  async readHistory() {
    try {
      const data = await fs.readFile(this.historyFile, 'utf-8');
      return JSON.parse(data);
    } catch (error) {
      console.error('Failed to read history:', error);
      return { records: [] };
    }
  }

  /**
   * 写入历史记录
   */
  async writeHistory(history) {
    try {
      await fs.writeFile(this.historyFile, JSON.stringify(history, null, 2));
    } catch (error) {
      console.error('Failed to write history:', error);
      throw error;
    }
  }

  /**
   * 添加历史记录
   * @param {Object} record - 历史记录对象
   * @param {string} record.fontName - 字体名称
   * @param {string} record.fileName - 原始文件名
   * @param {number} record.fileSize - 文件大小(字节)
   * @param {string} record.status - 状态: 'success' | 'failed'
   * @param {Object} record.options - 转换选项
   * @param {Object} [record.result] - 转换结果(成功时)
   * @param {string} [record.error] - 错误信息(失败时)
   */
  async addRecord(record) {
    try {
      await this.initialize();
      
      const history = await this.readHistory();
      
      // 创建新记录
      const newRecord = {
        id: Date.now().toString(),
        timestamp: new Date().toISOString(),
        fontName: record.fontName,
        fileName: record.fileName,
        fileSize: record.fileSize,
        status: record.status,
        options: record.options,
        result: record.result || null,
        error: record.error || null
      };

      // 添加到记录列表开头
      history.records.unshift(newRecord);

      // 清理旧记录(保留最近 maxRecords 条)
      if (history.records.length > this.maxRecords) {
        history.records = history.records.slice(0, this.maxRecords);
      }

      await this.writeHistory(history);
      
      return newRecord;
    } catch (error) {
      console.error('Failed to add history record:', error);
      throw error;
    }
  }

  /**
   * 获取所有历史记录
   * @param {number} [limit] - 限制返回数量
   */
  async getRecords(limit = null) {
    try {
      await this.initialize();
      
      const history = await this.readHistory();
      
      if (limit && limit > 0) {
        return history.records.slice(0, limit);
      }
      
      return history.records;
    } catch (error) {
      console.error('Failed to get history records:', error);
      return [];
    }
  }

  /**
   * 根据 ID 获取单条记录
   * @param {string} id - 记录 ID
   */
  async getRecordById(id) {
    try {
      const history = await this.readHistory();
      return history.records.find(record => record.id === id) || null;
    } catch (error) {
      console.error('Failed to get history record by id:', error);
      return null;
    }
  }

  /**
   * 清空所有历史记录
   */
  async clearHistory() {
    try {
      await this.writeHistory({ records: [] });
      return true;
    } catch (error) {
      console.error('Failed to clear history:', error);
      throw error;
    }
  }

  /**
   * 删除指定记录
   * @param {string} id - 记录 ID
   */
  async deleteRecord(id) {
    try {
      const history = await this.readHistory();
      const index = history.records.findIndex(record => record.id === id);
      
      if (index === -1) {
        return false;
      }

      history.records.splice(index, 1);
      await this.writeHistory(history);
      
      return true;
    } catch (error) {
      console.error('Failed to delete history record:', error);
      throw error;
    }
  }

  /**
   * 获取统计信息
   */
  async getStatistics() {
    try {
      const records = await this.getRecords();
      
      const total = records.length;
      const successful = records.filter(r => r.status === 'success').length;
      const failed = records.filter(r => r.status === 'failed').length;
      
      return {
        total,
        successful,
        failed,
        successRate: total > 0 ? ((successful / total) * 100).toFixed(1) : '0.0'
      };
    } catch (error) {
      console.error('Failed to get statistics:', error);
      return {
        total: 0,
        successful: 0,
        failed: 0,
        successRate: '0.0'
      };
    }
  }
}

// 导出单例
module.exports = new HistoryService();
