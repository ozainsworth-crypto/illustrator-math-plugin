/**
 * FontPackBuilder - 字体包构建器主类
 * 
 * 将用户 TTF/OTF 字体转换为 MathJax 兼容的字体包
 */

import fs from 'fs/promises';
import path from 'path';
import { FontParser } from './font-parser.js';
import { GlyphExtractor } from './glyph-extractor.js';
import { FontdataGenerator } from './fontdata-generator.js';
import { CharsetManager } from './charset-manager.js';
import { FontCapabilityDetector } from './font-capability-detector.js';
import { ReplacementReporter } from './replacement-reporter.js';
import { ReportGenerator } from './report-generator.js';

export class FontPackBuilder {
  constructor(options) {
    this.inputFont = options.inputFont;
    this.outputDir = options.outputDir;
    this.fontName = options.fontName;
    this.baseFontdata = options.baseFontdata;
    this.enableOptional = options.enableOptional || false;
    this.enableAdvanced = options.enableAdvanced || false;
    this.enableTextSymbols = options.enableTextSymbols || false;
    this.baseOnly = options.baseOnly || false;
    this.enablePathCentering = options.enablePathCentering || false;
    
    this.fontParser = null;
    this.fontMetadata = null;
    this.charsetManager = null;
    this.capabilities = null;
    this.glyphs = null;
    this.failures = [];
    this.fallbacks = [];
    this.l3Skipped = [];
  }

  /**
   * 构建字体包
   * @returns {Promise<Object>} manifest 对象
   */
  async build() {
    // 1. 验证输入文件存在
    await this.validateInput();

    // 2. 创建输出目录
    await this.createOutputDir();

    // 3. 初始化 CharsetManager
    console.log('⏳ 初始化字符集管理器...');
    await this.initCharsetManager();

    // 4. 解析字体文件
    console.log('⏳ 解析字体文件...');
    await this.parseFont();

    // 5. 检测字体能力
    console.log('⏳ 检测字体能力...');
    await this.detectCapabilities();

    // 6. 提取 glyph 数据
    console.log('⏳ 提取 glyph 数据...');
    await this.extractGlyphs();

    // 7. 生成 fontdata.js
    console.log('⏳ 生成 fontdata.js...');
    await this.generateFontdata();

    // 8. 生成 capabilities.json
    console.log('⏳ 生成 capabilities.json...');
    await this.generateCapabilitiesReport();

    // 9. 生成 replacement-report.json
    console.log('⏳ 生成 replacement-report.json...');
    await this.generateReplacementReport();

    // 10. 生成 manifest.json
    console.log('⏳ 生成 manifest.json...');
    const manifest = await this.generateManifest();

    // 11. 生成详细的 report.json
    console.log('⏳ 生成 report.json...');
    await this.generateDetailedReport();

    return manifest;
  }

  /**
   * 初始化 CharsetManager
   */
  async initCharsetManager() {
    this.charsetManager = new CharsetManager({
      enableDefault: !this.baseOnly,
      enableOptional: this.enableOptional,
      enableAdvanced: this.enableAdvanced,
      enableTextSymbols: this.enableTextSymbols,
      baseOnly: this.baseOnly
    });

    await this.charsetManager.load();

    const stats = this.charsetManager.getStatistics();
    console.log(`✓ 字符集加载完成: ${stats.total} 个字符`);
    console.log(`✓ 启用的字符集: ${this.charsetManager.getEnabledCharsets().join(', ')}`);
  }

  /**
   * 验证输入文件
   */
  async validateInput() {
    try {
      await fs.access(this.inputFont);
    } catch (error) {
      throw new Error(`输入字体文件不存在: ${this.inputFont}`);
    }

    const ext = path.extname(this.inputFont).toLowerCase();
    if (ext !== '.ttf' && ext !== '.otf') {
      throw new Error(`不支持的字体格式: ${ext}（仅支持 .ttf 和 .otf）`);
    }
  }

  /**
   * 创建输出目录
   */
  async createOutputDir() {
    try {
      await fs.mkdir(this.outputDir, { recursive: true });
    } catch (error) {
      throw new Error(`无法创建输出目录: ${this.outputDir}`);
    }
  }

  /**
   * 解析字体文件
   */
  async parseFont() {
    this.fontParser = new FontParser(this.inputFont);
    await this.fontParser.load();
    
    // 验证字体有效性
    const validation = this.fontParser.validate();
    if (!validation.valid) {
      console.warn('⚠️  字体文件存在问题:');
      validation.issues.forEach(issue => console.warn(`  - ${issue}`));
    }
    
    // 提取元数据
    this.fontMetadata = this.fontParser.getMetadata();
    console.log(`✓ 字体族: ${this.fontMetadata.family}`);
    console.log(`✓ 格式: ${this.fontMetadata.format}`);
    console.log(`✓ 字形数量: ${this.fontMetadata.numGlyphs}`);
  }

  /**
   * 检测字体能力
   */
  async detectCapabilities() {
    const detector = new FontCapabilityDetector(
      this.fontParser.getFont(),
      this.inputFont  // 传递字体文件路径用于二进制解析
    );
    this.capabilities = detector.detect();
    
    console.log(`✓ 字体能力检测完成`);
    console.log(`  - MATH table: ${this.capabilities.hasMATH ? '✓' : '✗'}`);
    console.log(`  - Variants: ${this.capabilities.hasVariants ? '✓' : '✗'}`);
    console.log(`  - Assembly: ${this.capabilities.hasAssembly ? '✓' : '✗'}`);
    console.log(`  - L1 覆盖率: ${this.capabilities.coverage.l1.toFixed(1)}%`);
    console.log(`  - L2 覆盖率: ${this.capabilities.coverage.l2.toFixed(1)}%`);
    console.log(`  - L3 覆盖率: ${this.capabilities.coverage.l3.toFixed(1)}%`);
  }

  /**
   * 提取 glyph 数据
   */
  async extractGlyphs() {
    const extractor = new GlyphExtractor(this.fontParser.getFont(), {
      charsetManager: this.charsetManager,
      baseFontdata: this.baseFontdata,
      enablePathCentering: this.enablePathCentering,
      capabilities: this.capabilities  // 传递 capabilities
    });

    const result = extractor.extract();
    this.glyphs = result.glyphs;
    this.failures = result.failures || [];
    this.fallbacks = result.fallbacks || [];
    this.l3Skipped = result.l3Skipped || [];

    console.log(`✓ 成功提取 ${Object.keys(this.glyphs).length} 个字符`);

    if (this.l3Skipped.length > 0) {
      console.warn(`⏭️ 跳过 L3 符号: ${this.l3Skipped.length} 个`);
    }

    if (this.fallbacks.length > 0) {
      console.warn(`⚠️  回退到 MathJax 默认: ${this.fallbacks.length} 个字符`);
    }

    if (this.failures.length > 0) {
      console.warn(`⚠️  失败 ${this.failures.length} 个字符:`);
      this.failures.slice(0, 5).forEach(f => {
        console.warn(`  - '${f.char}' (${f.category || 'unknown'}): ${f.reason}`);
      });
      if (this.failures.length > 5) {
        console.warn(`  ... 还有 ${this.failures.length - 5} 个失败字符`);
      }
    }
  }

  /**
   * 生成 fontdata.js
   */
  async generateFontdata() {
    const fontdataPath = path.join(this.outputDir, 'fontdata.js');
    
    await FontdataGenerator.generate(this.glyphs, fontdataPath, {
      fontName: this.fontName || 'CustomFont',
      format: 'es6',
      enablePathCentering: this.enablePathCentering || false,
      baseFontdata: this.baseFontdata  // 传递 baseFontdata 用于 keepOriginalAdvance
    });

    console.log(`✓ 生成 fontdata.js (${Object.keys(this.glyphs).length} 个字符)`);
  }

  /**
   * 生成 capabilities.json
   */
  async generateCapabilitiesReport() {
    const capabilitiesPath = path.join(this.outputDir, 'capabilities.json');
    
    const detector = new FontCapabilityDetector(this.fontParser.getFont());
    detector.capabilities = this.capabilities; // 使用已检测的结果
    
    await detector.generateCapabilitiesReport(capabilitiesPath);
    
    console.log(`✓ 生成 capabilities.json`);
  }

  /**
   * 生成 replacement-report.json
   */
  async generateReplacementReport() {
    const reportPath = path.join(this.outputDir, 'replacement-report.json');
    
    const extractionResult = {
      glyphs: this.glyphs,
      failures: this.failures,
      fallbacks: this.fallbacks,
      l3Skipped: this.l3Skipped || []
    };
    
    const report = ReplacementReporter.generateReport(
      extractionResult,
      this.capabilities,
      this.charsetManager
    );
    
    await fs.writeFile(reportPath, JSON.stringify(report, null, 2), 'utf-8');
    
    // 输出格式化报告到控制台
    console.log(ReplacementReporter.formatReport(report));
    
    console.log(`✓ 生成 replacement-report.json`);
  }

  /**
   * 生成 manifest.json
   */
  async generateManifest() {
    const manifest = await ReportGenerator.generateManifest({
      fontName: this.fontName,
      fontMetadata: this.fontMetadata,
      glyphs: this.glyphs,
      failures: this.failures,
      fallbacks: this.fallbacks,
      charsets: {
        enableDefault: !this.baseOnly,
        enableOptional: this.enableOptional,
        enableAdvanced: this.enableAdvanced,
        enableTextSymbols: this.enableTextSymbols
      },
      sourceFontPath: this.inputFont,
      config: {
        enableDefault: !this.baseOnly,
        enableOptional: this.enableOptional,
        enableAdvanced: this.enableAdvanced,
        enableTextSymbols: this.enableTextSymbols,
        baseOnly: this.baseOnly,
        enablePathCentering: this.enablePathCentering
      },
      outputDir: this.outputDir
    });

    const manifestPath = path.join(this.outputDir, 'manifest.json');
    await fs.writeFile(manifestPath, JSON.stringify(manifest, null, 2));

    console.log(`✓ 生成 manifest.json`);
    console.log(`  - buildId: ${manifest.buildId}`);
    console.log(`  - sourceFontHash: ${manifest.sourceFontHash.substring(0, 16)}...`);

    return manifest;
  }

  /**
   * 生成详细的 report.json
   */
  async generateDetailedReport() {
    const reportPath = path.join(this.outputDir, 'report.json');
    
    const report = await ReportGenerator.generateReport({
      fontName: this.fontName,
      glyphs: this.glyphs,
      failures: this.failures,
      fallbacks: this.fallbacks,
      l3Skipped: this.l3Skipped,
      charsetManager: this.charsetManager,
      capabilities: this.capabilities,
      sourceFontPath: this.inputFont,
      config: {
        enableDefault: !this.baseOnly,
        enableOptional: this.enableOptional,
        enableAdvanced: this.enableAdvanced,
        enableTextSymbols: this.enableTextSymbols,
        baseOnly: this.baseOnly,
        enablePathCentering: this.enablePathCentering
      }
    });
    
    await fs.writeFile(reportPath, JSON.stringify(report, null, 2), 'utf-8');
    
    console.log(`✓ 生成 report.json`);
    console.log(`  - 总字符数: ${report.statistics.total}`);
    console.log(`  - 成功: ${report.statistics.successful}`);
    console.log(`  - 失败: ${report.statistics.failed}`);
    console.log(`  - 回退: ${report.statistics.fallback}`);
  }
}
