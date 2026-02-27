/**
 * Cache Service - 管理转换结果缓存
 * 
 * 功能:
 * - 基于文件 hash 和配置生成缓存 key
 * - 缓存转换结果(manifest 和 report)
 * - 实现缓存过期清理
 * - 避免重复转换相同的字体文件
 */

const fs = require('fs').promises;
const fsSync = require('fs');
const path = require('path');
const crypto = require('crypto');

class CacheService {
  constructor() {
    // 缓存目录
    this.cacheDir = path.join(__dirname, '../cache');
    this.cacheIndexFile = path.join(this.cacheDir, 'index.json');
    
    // 缓存配置
    this.maxCacheSize = 100; // 最多缓存 100 个结果
    this.maxCacheAge = 7 * 24 * 60 * 60 * 1000; // 7 天过期
  }

  /**
   * 初始化缓存服务
   */
  async initialize() {
    try {
      // 确保缓存目录存在
      try {
        await fs.access(this.cacheDir);
      } catch {
        await fs.mkdir(this.cacheDir, { recursive: true });
      }

      // 确保索引文件存在
      try {
        await fs.access(this.cacheIndexFile);
      } catch {
        await fs.writeFile(this.cacheIndexFile, JSON.stringify({ entries: [] }, null, 2));
      }
    } catch (error) {
      console.error('Failed to initialize cache service:', error);
      throw error;
    }
  }

  /**
   * 计算文件 hash
   * @param {string} filePath - 文件路径
   * @returns {Promise<string>} 文件 SHA256 hash
   */
  async calculateFileHash(filePath) {
    return new Promise((resolve, reject) => {
      const hash = crypto.createHash('sha256');
      const stream = fsSync.createReadStream(filePath);
      
      stream.on('data', (data) => hash.update(data));
      stream.on('end', () => resolve(hash.digest('hex')));
      stream.on('error', reject);
    });
  }

  /**
   * 获取 Builder 工具版本
   * @returns {string} 工具版本号
   */
  getToolVersion() {
    try {
      const packageJsonPath = path.join(__dirname, '..', '..', 'package.json');
      const packageJson = JSON.parse(fsSync.readFileSync(packageJsonPath, 'utf-8'));
      return packageJson.version || '1.0.0';
    } catch (error) {
      console.warn('Failed to read tool version, using default:', error.message);
      return '1.0.0';
    }
  }

  /**
   * 生成缓存 key
   * @param {string} fileHash - 文件 hash
   * @param {string} fontName - 字体包名称
   * @param {Object} options - 转换选项
   * @returns {string} 缓存 key
   */
  generateCacheKey(fileHash, fontName, options) {
    // 【关键护栏 2】缓存键包含完整配置，防止"配置变了却命中缓存"
    // 【修复】缓存键包含 fontName，防止不同名称的字体包互相干扰
    // 将选项标准化并排序
    const normalizedOptions = {
      enableOptional: options.enableOptional || false,
      enableAdvanced: options.enableAdvanced || false,
      enableTextSymbols: options.enableTextSymbols || false,
      // 添加其他可能影响输出的 flags
      pathCentering: options.pathCentering || false
    };
    
    // 获取工具版本
    const toolVersion = this.getToolVersion();
    
    // 组合所有影响输出的因素（包括 fontName）
    const optionsStr = JSON.stringify(normalizedOptions, Object.keys(normalizedOptions).sort());
    const combined = `${fileHash}:${fontName}:${optionsStr}:${toolVersion}`;
    
    return crypto.createHash('md5').update(combined).digest('hex');
  }

  /**
   * 读取缓存索引
   */
  async readIndex() {
    try {
      const data = await fs.readFile(this.cacheIndexFile, 'utf-8');
      return JSON.parse(data);
    } catch (error) {
      console.error('Failed to read cache index:', error);
      return { entries: [] };
    }
  }

  /**
   * 写入缓存索引
   */
  async writeIndex(index) {
    try {
      await fs.writeFile(this.cacheIndexFile, JSON.stringify(index, null, 2));
    } catch (error) {
      console.error('Failed to write cache index:', error);
      throw error;
    }
  }

  /**
   * 检查缓存是否存在
   * @param {string} filePath - 字体文件路径
   * @param {string} fontName - 字体包名称
   * @param {Object} options - 转换选项
   * @returns {Promise<Object|null>} 缓存的结果或 null
   */
  async get(filePath, fontName, options) {
    try {
      await this.initialize();
      
      // 计算文件 hash
      const fileHash = await this.calculateFileHash(filePath);
      
      // 生成缓存 key（包含 fontName）
      const cacheKey = this.generateCacheKey(fileHash, fontName, options);
      
      // 【证据收集 A4】缓存查询
      console.log('[Evidence] ========== Cache Lookup ==========');
      console.log('[Evidence] File path:', filePath);
      console.log('[Evidence] File hash:', fileHash.substring(0, 16) + '...');
      console.log('[Evidence] Font name:', fontName);
      console.log('[Evidence] Options:', JSON.stringify(options, null, 2));
      console.log('[Evidence] Cache key:', cacheKey.substring(0, 16) + '...');
      
      // 读取索引
      const index = await this.readIndex();
      
      // 查找缓存条目
      const entry = index.entries.find(e => e.key === cacheKey);
      
      if (!entry) {
        console.log('[Evidence] Cache MISS - No entry found');
        console.log('[Evidence] =====================================');
        return null;
      }
      
      // 检查是否过期
      const age = Date.now() - new Date(entry.createdAt).getTime();
      if (age > this.maxCacheAge) {
        console.log(`[Evidence] Cache MISS - Entry expired (age: ${(age / (24 * 60 * 60 * 1000)).toFixed(1)} days)`);
        console.log('[Evidence] =====================================');
        console.log(`Cache expired for key: ${cacheKey}`);
        await this.delete(cacheKey);
        return null;
      }
      
      // 读取缓存文件
      const cacheFilePath = path.join(this.cacheDir, `${cacheKey}.json`);
      
      try {
        await fs.access(cacheFilePath);
      } catch {
        // 缓存文件不存在，清理索引
        console.log('[Evidence] Cache MISS - Cache file not found');
        console.log('[Evidence] =====================================');
        await this.delete(cacheKey);
        return null;
      }
      
      const cacheData = await fs.readFile(cacheFilePath, 'utf-8');
      const result = JSON.parse(cacheData);
      
      // 更新访问时间
      entry.lastAccessedAt = new Date().toISOString();
      entry.accessCount = (entry.accessCount || 0) + 1;
      await this.writeIndex(index);
      
      console.log('[Evidence] Cache HIT ✓');
      console.log('[Evidence] Entry created at:', entry.createdAt);
      console.log('[Evidence] Entry age:', (age / (60 * 1000)).toFixed(1), 'minutes');
      console.log('[Evidence] Access count:', entry.accessCount);
      console.log('[Evidence] =====================================');
      console.log(`Cache hit for key: ${cacheKey}`);
      return result;
      
    } catch (error) {
      console.error('[Evidence] Cache lookup error:', error);
      console.error('Failed to get cache:', error);
      return null;
    }
  }

  /**
   * 保存缓存
   * @param {string} filePath - 字体文件路径
   * @param {string} fontName - 字体包名称
   * @param {Object} options - 转换选项
   * @param {Object} result - 转换结果
   */
  async set(filePath, fontName, options, result) {
    try {
      await this.initialize();
      
      // 计算文件 hash
      const fileHash = await this.calculateFileHash(filePath);
      
      // 生成缓存 key（包含 fontName）
      const cacheKey = this.generateCacheKey(fileHash, fontName, options);
      
      // 【证据收集 A5】缓存保存
      console.log('[Evidence] ========== Cache Save ==========');
      console.log('[Evidence] File path:', filePath);
      console.log('[Evidence] File hash:', fileHash.substring(0, 16) + '...');
      console.log('[Evidence] Font name:', fontName);
      console.log('[Evidence] Options:', JSON.stringify(options, null, 2));
      console.log('[Evidence] Cache key:', cacheKey.substring(0, 16) + '...');
      
      // 写入缓存文件
      const cacheFilePath = path.join(this.cacheDir, `${cacheKey}.json`);
      await fs.writeFile(cacheFilePath, JSON.stringify(result, null, 2));
      
      // 更新索引
      const index = await this.readIndex();
      
      // 检查是否已存在
      const existingIndex = index.entries.findIndex(e => e.key === cacheKey);
      
      if (existingIndex >= 0) {
        // 更新现有条目
        index.entries[existingIndex] = {
          ...index.entries[existingIndex],
          fontName, // 记录 fontName 用于调试
          updatedAt: new Date().toISOString(),
          lastAccessedAt: new Date().toISOString()
        };
        console.log('[Evidence] Cache entry updated');
      } else {
        // 添加新条目
        index.entries.push({
          key: cacheKey,
          fileHash,
          fontName, // 记录 fontName 用于调试
          options,
          createdAt: new Date().toISOString(),
          lastAccessedAt: new Date().toISOString(),
          accessCount: 0
        });
        console.log('[Evidence] New cache entry created');
      }
      
      // 清理旧缓存
      await this.cleanup(index);
      
      await this.writeIndex(index);
      
      console.log(`[Evidence] Cache saved successfully`);
      console.log('[Evidence] =====================================');
      
    } catch (error) {
      console.error('[Evidence] Cache save error:', error);
      console.error('Failed to set cache:', error);
      // 不抛出错误，缓存失败不应影响主流程
    }
  }

  /**
   * 删除缓存
   * @param {string} cacheKey - 缓存 key
   */
  async delete(cacheKey) {
    try {
      // 删除缓存文件
      const cacheFilePath = path.join(this.cacheDir, `${cacheKey}.json`);
      
      try {
        await fs.unlink(cacheFilePath);
      } catch {
        // 文件可能已经不存在
      }
      
      // 更新索引
      const index = await this.readIndex();
      index.entries = index.entries.filter(e => e.key !== cacheKey);
      await this.writeIndex(index);
      
      console.log(`Cache deleted for key: ${cacheKey}`);
      
    } catch (error) {
      console.error('Failed to delete cache:', error);
    }
  }

  /**
   * 清理过期和超量缓存
   * @param {Object} index - 缓存索引
   */
  async cleanup(index) {
    try {
      const now = Date.now();
      
      // 删除过期条目
      const validEntries = [];
      
      for (const entry of index.entries) {
        const age = now - new Date(entry.createdAt).getTime();
        
        if (age > this.maxCacheAge) {
          // 删除过期缓存文件
          const cacheFilePath = path.join(this.cacheDir, `${entry.key}.json`);
          try {
            await fs.unlink(cacheFilePath);
          } catch {
            // 忽略删除错误
          }
        } else {
          validEntries.push(entry);
        }
      }
      
      // 如果超过最大数量，删除最少使用的
      if (validEntries.length > this.maxCacheSize) {
        // 按访问次数和最后访问时间排序
        validEntries.sort((a, b) => {
          const scoreA = (a.accessCount || 0) + (now - new Date(a.lastAccessedAt).getTime()) / 1000000;
          const scoreB = (b.accessCount || 0) + (now - new Date(b.lastAccessedAt).getTime()) / 1000000;
          return scoreA - scoreB;
        });
        
        // 删除多余的条目
        const toDelete = validEntries.splice(0, validEntries.length - this.maxCacheSize);
        
        for (const entry of toDelete) {
          const cacheFilePath = path.join(this.cacheDir, `${entry.key}.json`);
          try {
            await fs.unlink(cacheFilePath);
          } catch {
            // 忽略删除错误
          }
        }
      }
      
      // 更新索引
      index.entries = validEntries;
      
    } catch (error) {
      console.error('Failed to cleanup cache:', error);
    }
  }

  /**
   * 清空所有缓存
   */
  async clear() {
    try {
      const index = await this.readIndex();
      
      // 删除所有缓存文件
      for (const entry of index.entries) {
        const cacheFilePath = path.join(this.cacheDir, `${entry.key}.json`);
        try {
          await fs.unlink(cacheFilePath);
        } catch {
          // 忽略删除错误
        }
      }
      
      // 清空索引
      await this.writeIndex({ entries: [] });
      
      console.log('All cache cleared');
      
    } catch (error) {
      console.error('Failed to clear cache:', error);
      throw error;
    }
  }

  /**
   * 获取缓存统计信息
   */
  async getStatistics() {
    try {
      const index = await this.readIndex();
      
      const total = index.entries.length;
      const totalAccessCount = index.entries.reduce((sum, e) => sum + (e.accessCount || 0), 0);
      
      // 计算缓存大小
      let totalSize = 0;
      for (const entry of index.entries) {
        const cacheFilePath = path.join(this.cacheDir, `${entry.key}.json`);
        try {
          const stats = await fs.stat(cacheFilePath);
          totalSize += stats.size;
        } catch {
          // 忽略错误
        }
      }
      
      return {
        total,
        totalAccessCount,
        totalSize,
        totalSizeMB: (totalSize / (1024 * 1024)).toFixed(2),
        averageAccessCount: total > 0 ? (totalAccessCount / total).toFixed(1) : '0.0'
      };
      
    } catch (error) {
      console.error('Failed to get cache statistics:', error);
      return {
        total: 0,
        totalAccessCount: 0,
        totalSize: 0,
        totalSizeMB: '0.00',
        averageAccessCount: '0.0'
      };
    }
  }
}

// 导出单例
module.exports = new CacheService();
