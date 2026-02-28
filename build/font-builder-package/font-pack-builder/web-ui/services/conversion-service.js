/**
 * ConversionService - 字体转换服务
 * 
 * 封装 Font Pack Builder 调用逻辑
 */

const { spawn } = require('child_process');
const path = require('path');
const fs = require('fs');
const crypto = require('crypto');

class ConversionService {
  constructor() {
    // Font Pack Builder 路径
    this.builderPath = path.join(__dirname, '..', '..', 'build.js');
    this.outputBaseDir = path.join(__dirname, '..', '..', '..', '..', 'public', 'fonts');
  }

  /**
   * 执行字体转换
   * @param {string} inputPath - 输入字体文件路径
   * @param {string} fontName - 字体包名称（仅用于 manifest，不影响输出目录）
   * @param {Object} options - 转换选项
   * @returns {Promise<Object>} 转换结果
   */
  async convert(inputPath, fontName, options = {}) {
    try {
      // 【证据收集 A3】转换开始
      console.log('[Evidence] ========================================');
      console.log('[Evidence] ========== Conversion Start ===========');
      console.log('[Evidence] ========================================');
      console.log('[Evidence] Input path (relative):', inputPath);
      console.log('[Evidence] Input path (absolute):', path.resolve(inputPath));
      console.log('[Evidence] Font name:', fontName);
      console.log('[Evidence] Options:', JSON.stringify(options, null, 2));
      console.log('[Evidence] Timestamp:', new Date().toISOString());
      
      // 验证输入文件
      await this.validateFont(inputPath);
      console.log('[Evidence] ✓ Font validation passed');
      
      // 准备输出目录 - 固定为 user-font-pack（单用户字体包模型）
      const outputDir = path.join(this.outputBaseDir, 'user-font-pack');
      console.log('[Evidence] Output base dir:', this.outputBaseDir);
      console.log('[Evidence] Output dir (relative):', outputDir);
      console.log('[Evidence] Output dir (absolute):', path.resolve(outputDir));
      console.log('[Evidence] Output dir exists before cleanup:', fs.existsSync(outputDir));
      
      // 清理旧文件（如果存在）
      if (fs.existsSync(outputDir)) {
        console.log('[Evidence] Cleaning old font pack...');
        fs.rmSync(outputDir, { recursive: true, force: true });
        
        // 验证清理成功
        if (fs.existsSync(outputDir)) {
          throw new Error('Failed to clean old font pack directory');
        }
        console.log('[Evidence] ✓ Cleanup complete, dir exists:', fs.existsSync(outputDir));
      }
      
      // 构建命令参数 - 使用命名选项
      const args = [
        this.builderPath,
        '--input', inputPath,
        '--output', outputDir,
        '--name', fontName
      ];
      
      // 添加字符集选项
      if (options.enableOptional) {
        args.push('--enable-optional');
      }
      
      if (options.enableAdvanced) {
        args.push('--enable-advanced');
      }
      
      if (options.enableTextSymbols) {
        args.push('--enable-text-symbols');
      }
      
      // 如果没有启用任何扩展字符集，使用 base-only 模式
      if (!options.enableOptional && !options.enableAdvanced && !options.enableTextSymbols) {
        args.push('--base-only');
      }
      
      console.log('[ConversionService] 执行 Builder:', args.join(' '));
      console.log('[Evidence] Builder command:', 'node', args.join(' '));
      
      // 执行转换
      const result = await this.executeBuilder(args);
      
      console.log('[ConversionService] Builder 执行完成');
      console.log('[Evidence] ✓ Builder execution complete');
      console.log('[Evidence] Builder stdout length:', result.length);
      
      // 验证输出完整性
      await this.validateOutput(outputDir);
      console.log('[Evidence] ✓ Output validation complete');
      
      // 【证据收集 A3】列出生成的文件
      console.log('[Evidence] ========== Generated Files ==========');
      const files = fs.readdirSync(outputDir);
      files.forEach(file => {
        const filePath = path.join(outputDir, file);
        const stats = fs.statSync(filePath);
        console.log(`[Evidence]   ${file}:`);
        console.log(`[Evidence]     - Size: ${stats.size} bytes (${(stats.size / 1024).toFixed(1)} KB)`);
        console.log(`[Evidence]     - mtime: ${stats.mtime.toISOString()}`);
      });
      console.log('[Evidence] ============================================');
      
      // 读取结果文件
      const manifest = await this.readManifest(outputDir);
      const report = await this.readReport(outputDir);
      
      // 【关键护栏 1】生成 build-info.json 作为版本锚点
      const buildInfo = await this.generateBuildInfo(inputPath, outputDir, fontName, options);
      
      console.log('[ConversionService] build-info.json 已生成:', buildInfo.buildHash.substring(0, 8));
      console.log('[Evidence] ✓ build-info.json generated');
      console.log('[Evidence] Build info summary:', {
        buildHash: buildInfo.buildHash.substring(0, 8),
        buildTime: buildInfo.buildTime,
        fontPackName: buildInfo.fontPackName,
        toolVersion: buildInfo.toolVersion,
        filesCount: buildInfo.files.length
      });
      
      console.log('[Evidence] ========================================');
      console.log('[Evidence] ========== Conversion Complete ========');
      console.log('[Evidence] ========================================');
      
      return {
        success: true,
        manifest,
        report,
        buildInfo,
        outputDir
      };
      
    } catch (error) {
      console.error('[ConversionService] Conversion error:', error);
      console.error('[Evidence] ========================================');
      console.error('[Evidence] ========== Conversion Failed ==========');
      console.error('[Evidence] ========================================');
      console.error('[Evidence] Error message:', error.message);
      console.error('[Evidence] Error stack:', error.stack);
      throw error;
    }
  }

  /**
   * 验证字体文件
   * @param {string} filePath - 字体文件路径
   * @returns {Promise<Object>} 验证结果
   */
  async validateFont(filePath) {
    return new Promise((resolve, reject) => {
      // 检查文件是否存在
      if (!fs.existsSync(filePath)) {
        return reject(new Error('Font file not found'));
      }
      
      // 检查文件扩展名
      const ext = path.extname(filePath).toLowerCase();
      if (!['.ttf', '.otf'].includes(ext)) {
        return reject(new Error('Invalid font file format'));
      }
      
      // 检查文件大小
      const stats = fs.statSync(filePath);
      if (stats.size === 0) {
        return reject(new Error('Font file is empty'));
      }
      
      resolve({
        valid: true,
        size: stats.size,
        format: ext
      });
    });
  }

  /**
   * 执行 Font Pack Builder
   * @param {Array} args - 命令参数
   * @returns {Promise<string>} 执行输出
   */
  executeBuilder(args) {
    return new Promise((resolve, reject) => {
      const process = spawn('node', args, {
        cwd: path.dirname(this.builderPath)
      });
      
      let stdout = '';
      let stderr = '';
      
      process.stdout.on('data', (data) => {
        stdout += data.toString();
      });
      
      process.stderr.on('data', (data) => {
        stderr += data.toString();
      });
      
      process.on('close', (code) => {
        if (code !== 0) {
          reject(new Error(`Font Pack Builder failed with code ${code}: ${stderr}`));
        } else {
          resolve(stdout);
        }
      });
      
      process.on('error', (error) => {
        reject(new Error(`Failed to execute Font Pack Builder: ${error.message}`));
      });
    });
  }

  /**
   * 读取 manifest.json
   * @param {string} outputDir - 输出目录
   * @returns {Promise<Object>} manifest 内容
   */
  async readManifest(outputDir) {
    const manifestPath = path.join(outputDir, 'manifest.json');
    
    if (!fs.existsSync(manifestPath)) {
      throw new Error('Manifest file not found');
    }
    
    const content = fs.readFileSync(manifestPath, 'utf8');
    return JSON.parse(content);
  }

  /**
   * 读取 report.json
   * @param {string} outputDir - 输出目录
   * @returns {Promise<Object>} report 内容
   */
  async readReport(outputDir) {
    const reportPath = path.join(outputDir, 'report.json');
    
    if (!fs.existsSync(reportPath)) {
      // report 文件可能不存在，返回空对象
      return {};
    }
    
    const content = fs.readFileSync(reportPath, 'utf8');
    return JSON.parse(content);
  }

  /**
   * 清理临时文件
   * @param {string} fileId - 文件 ID
   */
  async cleanup(fileId) {
    try {
      const uploadsDir = path.join(__dirname, '..', 'uploads');
      const files = fs.readdirSync(uploadsDir);
      
      for (const file of files) {
        if (file.startsWith(fileId)) {
          const filePath = path.join(uploadsDir, file);
          fs.unlinkSync(filePath);
          console.log(`Cleaned up: ${filePath}`);
        }
      }
    } catch (error) {
      console.error('Cleanup error:', error);
      // 不抛出错误，清理失败不应影响主流程
    }
  }

  /**
   * 验证输出完整性
   * @param {string} outputDir - 输出目录
   * @throws {Error} 如果验证失败
   */
  async validateOutput(outputDir) {
    console.log('[ConversionService] 验证输出完整性...');
    
    // 必需文件列表
    const requiredFiles = [
      'manifest.json',
      'fontdata.js',
      'capabilities.json',
      'report.json'
    ];
    
    // 检查所有必需文件是否存在
    for (const file of requiredFiles) {
      const filePath = path.join(outputDir, file);
      if (!fs.existsSync(filePath)) {
        throw new Error(`Required file not generated: ${file}`);
      }
    }
    
    console.log('[ConversionService] ✓ 所有必需文件已生成');
    
    // 验证文件时间戳一致性（允许 1 秒误差）
    const manifestTime = fs.statSync(path.join(outputDir, 'manifest.json')).mtime.getTime();
    const fontdataTime = fs.statSync(path.join(outputDir, 'fontdata.js')).mtime.getTime();
    
    const timeDiff = Math.abs(manifestTime - fontdataTime);
    if (timeDiff > 1000) {
      console.warn(`[ConversionService] Warning: File timestamps differ by ${timeDiff}ms`);
    } else {
      console.log('[ConversionService] ✓ 文件时间戳一致');
    }
  }

  /**
   * 获取 Builder 工具版本
   * @returns {string} 工具版本号
   */
  getToolVersion() {
    try {
      const packageJsonPath = path.join(__dirname, '..', '..', 'package.json');
      const packageJson = JSON.parse(fs.readFileSync(packageJsonPath, 'utf-8'));
      return packageJson.version || '1.0.0';
    } catch (error) {
      console.warn('Failed to read tool version, using default:', error.message);
      return '1.0.0';
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
      const stream = fs.createReadStream(filePath);
      
      stream.on('data', (data) => hash.update(data));
      stream.on('end', () => resolve(hash.digest('hex')));
      stream.on('error', reject);
    });
  }

  /**
   * 生成 build-info.json
   * @param {string} inputPath - 输入字体文件路径
   * @param {string} outputDir - 输出目录
   * @param {string} fontName - 字体包名称
   * @param {Object} options - 转换选项
   * @returns {Promise<Object>} build-info 内容
   */
  async generateBuildInfo(inputPath, outputDir, fontName, options) {
    console.log('[ConversionService] 生成 build-info.json...');
    
    // 计算源字体文件 hash
    const sourceFontHash = await this.calculateFileHash(inputPath);
    
    // 获取工具版本
    const toolVersion = this.getToolVersion();
    
    // 获取所有输出文件的信息
    const files = [];
    const outputFiles = [
      'manifest.json',
      'fontdata.js',
      'capabilities.json',
      'report.json',
      'replacement-report.json'
    ];
    
    let combinedHash = crypto.createHash('sha256');
    
    for (const file of outputFiles) {
      const filePath = path.join(outputDir, file);
      if (fs.existsSync(filePath)) {
        const stats = fs.statSync(filePath);
        const fileHash = await this.calculateFileHash(filePath);
        
        files.push({
          name: file,
          size: stats.size,
          mtime: stats.mtime.toISOString(),
          hash: fileHash.substring(0, 16) // 只保留前 16 位
        });
        
        // 累积到组合 hash
        combinedHash.update(fileHash);
      }
    }
    
    // 生成 buildHash（基于所有输出文件的内容）
    const buildHash = combinedHash.digest('hex');
    
    // 构建 build-info 对象
    const buildInfo = {
      buildTime: new Date().toISOString(),
      buildHash,
      sourceFontHash,
      sourceFontName: path.basename(inputPath),
      fontPackName: fontName,
      toolVersion,
      options: {
        enableOptional: options.enableOptional || false,
        enableAdvanced: options.enableAdvanced || false,
        enableTextSymbols: options.enableTextSymbols || false,
        pathCentering: options.pathCentering || false
      },
      files
    };
    
    // 写入 build-info.json
    const buildInfoPath = path.join(outputDir, 'build-info.json');
    fs.writeFileSync(buildInfoPath, JSON.stringify(buildInfo, null, 2));
    
    console.log('[ConversionService] ✓ build-info.json 已生成');
    
    return buildInfo;
  }
}

module.exports = ConversionService;
