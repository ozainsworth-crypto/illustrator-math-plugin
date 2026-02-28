#!/usr/bin/env node

/**
 * Font Pack Builder Web UI - HTTP Server
 * 
 * 本地 HTTP 服务器，提供 Web UI 和 API 端点
 */

const express = require('express');
const path = require('path');
const http = require('http');
const multer = require('multer');
const fs = require('fs');
const crypto = require('crypto');
const ConversionService = require('../services/conversion-service.js');
const getJobQueue = require('../services/job-queue.js');
const historyService = require('../services/history-service.js');
const cacheService = require('../services/cache-service.js');

// 配置
const DEFAULT_PORT = process.env.PORT ? parseInt(process.env.PORT) : 3000;
const MAX_PORT = DEFAULT_PORT + 10;
const HOST = '127.0.0.1';
const UPLOAD_DIR = path.join(__dirname, '..', 'uploads');
const MAX_FILE_SIZE = 100 * 1024 * 1024; // 100MB
const LARGE_FILE_WARNING = 50 * 1024 * 1024; // 50MB

/**
 * 异步执行转换
 */
async function executeConversion(jobId, inputPath, fontName, options, fileId, fileName, fileSize) {
  const jobQueue = getJobQueue();
  const conversionService = new ConversionService();
  
  try {
    // 设置为处理中
    jobQueue.setProcessing(jobId, '正在检查缓存...');
    
    // 检查缓存（包含 fontName）
    const cachedResult = await cacheService.get(inputPath, fontName, options);
    
    if (cachedResult) {
      console.log('Using cached result for conversion');
      
      // 使用缓存结果
      jobQueue.updateProgress(jobId, 90, '使用缓存结果...');
      
      // 清理上传的文件
      await conversionService.cleanup(fileId);
      
      // 设置为完成
      jobQueue.setCompleted(jobId, cachedResult);
      
      // 添加到历史记录
      await historyService.addRecord({
        fontName,
        fileName,
        fileSize,
        status: 'success',
        options,
        result: cachedResult,
        fromCache: true
      });
      
      // 清理旧任务
      jobQueue.cleanup();
      
      return;
    }
    
    // 缓存未命中，执行转换
    jobQueue.updateProgress(jobId, 10, '正在验证字体文件...');
    
    // 模拟进度更新
    await new Promise(resolve => setTimeout(resolve, 500));
    jobQueue.updateProgress(jobId, 20, '正在提取字形数据...');
    
    await new Promise(resolve => setTimeout(resolve, 500));
    jobQueue.updateProgress(jobId, 40, '正在处理字符集...');
    
    await new Promise(resolve => setTimeout(resolve, 500));
    jobQueue.updateProgress(jobId, 60, '正在生成字体包...');
    
    // 执行实际转换
    const result = await conversionService.convert(inputPath, fontName, options);
    
    jobQueue.updateProgress(jobId, 80, '正在保存缓存...');
    
    // 保存到缓存（包含 fontName）
    await cacheService.set(inputPath, fontName, options, result);
    
    jobQueue.updateProgress(jobId, 90, '正在清理临时文件...');
    
    // 清理上传的文件
    await conversionService.cleanup(fileId);
    
    // 设置为完成
    jobQueue.setCompleted(jobId, result);
    
    // 添加到历史记录
    await historyService.addRecord({
      fontName,
      fileName,
      fileSize,
      status: 'success',
      options,
      result
    });
    
    // 清理旧任务
    jobQueue.cleanup();
    
  } catch (error) {
    console.error('Conversion execution error:', error);
    jobQueue.setFailed(jobId, error.message || 'Conversion failed');
    
    // 添加失败记录到历史
    await historyService.addRecord({
      fontName,
      fileName,
      fileSize,
      status: 'failed',
      options,
      error: error.message || 'Conversion failed'
    });
    
    // 尝试清理文件
    try {
      await conversionService.cleanup(fileId);
    } catch (cleanupError) {
      console.error('Cleanup error:', cleanupError);
    }
  }
}

/**
 * 检查端口是否可用
 */
async function isPortAvailable(port) {
  return new Promise((resolve) => {
    const server = http.createServer();
    
    server.once('error', (err) => {
      if (err.code === 'EADDRINUSE') {
        resolve(false);
      } else {
        resolve(false);
      }
    });
    
    server.once('listening', () => {
      server.close();
      resolve(true);
    });
    
    server.listen(port, HOST);
  });
}

/**
 * 查找可用端口
 */
async function findAvailablePort(startPort = DEFAULT_PORT) {
  for (let port = startPort; port <= MAX_PORT; port++) {
    if (await isPortAvailable(port)) {
      return port;
    }
  }
  throw new Error(`No available ports found between ${startPort} and ${MAX_PORT}`);
}

/**
 * 配置 Multer 文件上传
 */
function setupMulter() {
  // 确保上传目录存在
  if (!fs.existsSync(UPLOAD_DIR)) {
    fs.mkdirSync(UPLOAD_DIR, { recursive: true });
  }
  
  // 配置存储
  const storage = multer.diskStorage({
    destination: (req, file, cb) => {
      cb(null, UPLOAD_DIR);
    },
    filename: (req, file, cb) => {
      // 生成唯一文件名：UUID + 原始扩展名
      const fileId = crypto.randomUUID();
      const ext = path.extname(file.originalname);
      cb(null, `${fileId}${ext}`);
    }
  });
  
  // 文件过滤器
  const fileFilter = (req, file, cb) => {
    const allowedExtensions = ['.ttf', '.otf'];
    const ext = path.extname(file.originalname).toLowerCase();
    
    if (allowedExtensions.includes(ext)) {
      cb(null, true);
    } else {
      cb(new Error('Invalid file type. Only .ttf and .otf files are allowed.'));
    }
  };
  
  return multer({
    storage,
    fileFilter,
    limits: {
      fileSize: MAX_FILE_SIZE
    }
  });
}

/**
 * 创建并配置 Express 应用
 */
function createApp() {
  const app = express();
  const upload = setupMulter();
  
  // 中间件
  app.use(express.json());
  app.use(express.urlencoded({ extended: true }));
  
  // 静态文件服务
  const publicDir = path.join(__dirname, '..', 'public');
  app.use(express.static(publicDir));
  
  // 健康检查端点
  app.get('/api/health', (req, res) => {
    res.json({ status: 'ok', timestamp: new Date().toISOString() });
  });
  
  // 文件上传端点
  app.post('/api/upload', upload.single('font'), (req, res) => {
    try {
      if (!req.file) {
        return res.status(400).json({
          success: false,
          error: 'No file uploaded'
        });
      }
      
      const file = req.file;
      const fileId = path.basename(file.filename, path.extname(file.filename));
      
      // 检查文件大小警告
      const warning = file.size > LARGE_FILE_WARNING 
        ? 'File is larger than 50MB, conversion may take longer'
        : null;
      
      res.json({
        success: true,
        fileId,
        fileName: file.originalname,
        fileSize: file.size,
        filePath: file.path,
        warning
      });
      
    } catch (error) {
      console.error('Upload error:', error);
      res.status(500).json({
        success: false,
        error: error.message || 'Upload failed'
      });
    }
  });
  
  // 转换端点（异步，返回 jobId）
  app.post('/api/convert', async (req, res) => {
    try {
      const { fileId, fontName, options } = req.body;
      
      // 验证请求参数
      if (!fileId) {
        return res.status(400).json({
          success: false,
          error: 'Missing fileId parameter'
        });
      }
      
      if (!fontName) {
        return res.status(400).json({
          success: false,
          error: 'Missing fontName parameter'
        });
      }
      
      // 查找上传的文件
      const uploadedFiles = fs.readdirSync(UPLOAD_DIR);
      const uploadedFile = uploadedFiles.find(f => f.startsWith(fileId));
      
      if (!uploadedFile) {
        return res.status(404).json({
          success: false,
          error: 'Uploaded file not found'
        });
      }
      
      // 获取文件信息
      const filePath = path.join(UPLOAD_DIR, uploadedFile);
      const fileStats = fs.statSync(filePath);
      const fileName = uploadedFile;
      const fileSize = fileStats.size;
      
      // 创建任务
      const jobQueue = getJobQueue();
      const jobId = jobQueue.createJob(fileId, fontName, options || {});
      
      // 立即返回 jobId
      res.json({
        success: true,
        jobId,
        message: 'Conversion job created'
      });
      
      // 异步执行转换
      const inputPath = path.join(UPLOAD_DIR, uploadedFile);
      executeConversion(jobId, inputPath, fontName, options || {}, fileId, fileName, fileSize);
      
    } catch (error) {
      console.error('Conversion error:', error);
      res.status(500).json({
        success: false,
        error: error.message || 'Conversion failed'
      });
    }
  });
  
  // 进度查询端点
  app.get('/api/status/:jobId', (req, res) => {
    try {
      const { jobId } = req.params;
      const jobQueue = getJobQueue();
      const job = jobQueue.getJob(jobId);
      
      if (!job) {
        return res.status(404).json({
          success: false,
          error: 'Job not found'
        });
      }
      
      res.json({
        success: true,
        jobId: job.jobId,
        status: job.status,
        progress: job.progress,
        message: job.message,
        result: job.result,
        error: job.error
      });
      
    } catch (error) {
      console.error('Status query error:', error);
      res.status(500).json({
        success: false,
        error: error.message || 'Status query failed'
      });
    }
  });
  
  // 历史记录 API 端点
  
  // 获取历史记录列表
  app.get('/api/history', async (req, res) => {
    try {
      const limit = req.query.limit ? parseInt(req.query.limit) : null;
      const records = await historyService.getRecords(limit);
      
      res.json({
        success: true,
        records
      });
    } catch (error) {
      console.error('Get history error:', error);
      res.status(500).json({
        success: false,
        error: error.message || 'Failed to get history'
      });
    }
  });
  
  // 获取单条历史记录
  app.get('/api/history/:id', async (req, res) => {
    try {
      const { id } = req.params;
      const record = await historyService.getRecordById(id);
      
      if (!record) {
        return res.status(404).json({
          success: false,
          error: 'Record not found'
        });
      }
      
      res.json({
        success: true,
        record
      });
    } catch (error) {
      console.error('Get history record error:', error);
      res.status(500).json({
        success: false,
        error: error.message || 'Failed to get history record'
      });
    }
  });
  
  // 清空历史记录
  app.delete('/api/history', async (req, res) => {
    try {
      await historyService.clearHistory();
      
      res.json({
        success: true,
        message: 'History cleared'
      });
    } catch (error) {
      console.error('Clear history error:', error);
      res.status(500).json({
        success: false,
        error: error.message || 'Failed to clear history'
      });
    }
  });
  
  // 删除单条历史记录
  app.delete('/api/history/:id', async (req, res) => {
    try {
      const { id } = req.params;
      const deleted = await historyService.deleteRecord(id);
      
      if (!deleted) {
        return res.status(404).json({
          success: false,
          error: 'Record not found'
        });
      }
      
      res.json({
        success: true,
        message: 'Record deleted'
      });
    } catch (error) {
      console.error('Delete history record error:', error);
      res.status(500).json({
        success: false,
        error: error.message || 'Failed to delete history record'
      });
    }
  });
  
  // 获取统计信息
  app.get('/api/history/stats', async (req, res) => {
    try {
      const stats = await historyService.getStatistics();
      
      res.json({
        success: true,
        stats
      });
    } catch (error) {
      console.error('Get statistics error:', error);
      res.status(500).json({
        success: false,
        error: error.message || 'Failed to get statistics'
      });
    }
  });
  
  // 缓存管理 API 端点
  
  // 获取缓存统计信息
  app.get('/api/cache/stats', async (req, res) => {
    try {
      const stats = await cacheService.getStatistics();
      
      res.json({
        success: true,
        stats
      });
    } catch (error) {
      console.error('Get cache statistics error:', error);
      res.status(500).json({
        success: false,
        error: error.message || 'Failed to get cache statistics'
      });
    }
  });
  
  // 清空缓存
  app.delete('/api/cache', async (req, res) => {
    try {
      await cacheService.clear();
      
      res.json({
        success: true,
        message: 'Cache cleared'
      });
    } catch (error) {
      console.error('Clear cache error:', error);
      res.status(500).json({
        success: false,
        error: error.message || 'Failed to clear cache'
      });
    }
  });
  
  // 打开文件夹端点
  app.post('/api/open-folder', async (req, res) => {
    try {
      const { path: folderPath } = req.body;
      
      if (!folderPath) {
        return res.status(400).json({
          success: false,
          error: 'Missing path parameter'
        });
      }
      
      // 构建完整路径（字体包保存在 math-formula-plugin/public/fonts/{fontName}）
      // 从 web-ui/server 目录向上 4 级到达 math-formula-plugin，然后进入 public/fonts
      const fullPath = path.resolve(__dirname, '..', '..', '..', '..', 'public', 'fonts', folderPath);
      
      console.log('Attempting to open folder:', fullPath);
      
      // 检查路径是否存在
      if (!fs.existsSync(fullPath)) {
        console.error('Folder not found:', fullPath);
        return res.status(404).json({
          success: false,
          error: 'Folder not found'
        });
      }
      
      // 根据操作系统打开文件夹
      const { exec } = require('child_process');
      const platform = process.platform;
      
      let command;
      if (platform === 'darwin') {
        // macOS
        command = `open "${fullPath}"`;
      } else if (platform === 'win32') {
        // Windows
        command = `explorer "${fullPath}"`;
      } else {
        // Linux
        command = `xdg-open "${fullPath}"`;
      }
      
      exec(command, (error) => {
        if (error) {
          console.error('Open folder error:', error);
          return res.status(500).json({
            success: false,
            error: 'Failed to open folder'
          });
        }
        
        res.json({
          success: true,
          message: 'Folder opened'
        });
      });
      
    } catch (error) {
      console.error('Open folder error:', error);
      res.status(500).json({
        success: false,
        error: error.message || 'Failed to open folder'
      });
    }
  });
  
  // 错误处理中间件
  app.use((err, req, res, next) => {
    if (err instanceof multer.MulterError) {
      if (err.code === 'LIMIT_FILE_SIZE') {
        return res.status(400).json({
          success: false,
          error: `File too large. Maximum size is ${MAX_FILE_SIZE / (1024 * 1024)}MB`
        });
      }
      return res.status(400).json({
        success: false,
        error: err.message
      });
    }
    
    if (err) {
      return res.status(400).json({
        success: false,
        error: err.message
      });
    }
    
    next();
  });
  
  // 主页路由
  app.get('/', (req, res) => {
    res.sendFile(path.join(publicDir, 'index.html'));
  });
  
  return app;
}

/**
 * 启动服务器
 */
async function startServer() {
  try {
    // 【自动清除缓存】每次启动时清除缓存，确保 CEP 生成新字体时不会命中旧缓存
    console.log('Clearing cache on startup...');
    try {
      await cacheService.clear();
      console.log('Cache cleared successfully');
    } catch (error) {
      console.warn('Failed to clear cache on startup:', error.message);
      // 不阻止服务器启动
    }
    
    // 查找可用端口
    const port = await findAvailablePort();
    
    // 创建应用
    const app = createApp();
    const server = http.createServer(app);
    
    // 启动服务器
    server.listen(port, HOST, () => {
      console.log('');
      console.log('='.repeat(60));
      console.log('  Font Pack Builder Web UI');
      console.log('='.repeat(60));
      console.log('');
      console.log(`  Server running at: http://${HOST}:${port}`);
      console.log('');
      console.log('  Press Ctrl+C to stop');
      console.log('');
      console.log('='.repeat(60));
      console.log('');
    });
    
    // 优雅关闭
    const shutdown = () => {
      console.log('\n\nShutting down server...');
      server.close(() => {
        console.log('Server closed');
        process.exit(0);
      });
      
      // 强制关闭超时
      setTimeout(() => {
        console.error('Forced shutdown');
        process.exit(1);
      }, 5000);
    };
    
    process.on('SIGTERM', shutdown);
    process.on('SIGINT', shutdown);
    
    return { server, port };
    
  } catch (error) {
    console.error('Failed to start server:', error.message);
    process.exit(1);
  }
}

// 如果直接运行此文件，启动服务器
if (require.main === module) {
  startServer();
}

// 导出供测试使用
module.exports = {
  createApp,
  findAvailablePort,
  isPortAvailable,
  startServer
};
