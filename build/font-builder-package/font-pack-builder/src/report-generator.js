/**
 * ReportGenerator - 报告生成器
 * 
 * 生成 manifest.json 和详细的 report.json
 */

import fs from 'fs/promises';
import crypto from 'crypto';

export class ReportGenerator {
  /**
   * 计算 buildId
   * 基于源字体路径和配置生成唯一标识
   * 
   * @param {string} sourceFontPath - 源字体文件路径
   * @param {Object} config - 构建配置
   * @returns {string} buildId (SHA-256 hash 前 16 位)
   */
  static calculateBuildId(sourceFontPath, config) {
    const configStr = JSON.stringify({
      enableDefault: config.enableDefault,
      enableOptional: config.enableOptional,
      enableAdvanced: config.enableAdvanced,
      enableTextSymbols: config.enableTextSymbols,
      baseOnly: config.baseOnly,
      enablePathCentering: config.enablePathCentering
    });
    
    const hash = crypto.createHash('sha256');
    hash.update(sourceFontPath);
    hash.update(configStr);
    
    return hash.digest('hex').substring(0, 16);
  }

  /**
   * 计算源字体文件的 hash
   * 
   * @param {string} sourceFontPath - 源字体文件路径
   * @returns {Promise<string>} SHA-256 hash
   */
  static async calculateSourceFontHash(sourceFontPath) {
    const buffer = await fs.readFile(sourceFontPath);
    const hash = crypto.createHash('sha256');
    hash.update(buffer);
    return hash.digest('hex');
  }

  /**
   * 生成 manifest.json
   * 
   * @param {Object} options - 生成选项
   * @returns {Object} manifest 对象
   */
  static async generateManifest(options) {
    const {
      fontName,
      fontMetadata,
      glyphs,
      failures,
      fallbacks,
      charsets,
      sourceFontPath,
      config,
      outputDir
    } = options;

    // 计算 buildId 和 sourceFontHash
    const buildId = this.calculateBuildId(sourceFontPath, config);
    const sourceFontHash = await this.calculateSourceFontHash(sourceFontPath);

    // 转换 codepoint keys 为字符用于覆盖率计算
    const chars = Object.keys(glyphs).map(cp => String.fromCodePoint(parseInt(cp)));
    
    const uppercase = chars.filter(c => /[A-Z]/.test(c)).join('');
    const lowercase = chars.filter(c => /[a-z]/.test(c)).join('');
    const digits = chars.filter(c => /[0-9]/.test(c)).join('');

    const manifest = {
      name: fontName,
      version: '1.0.0',
      buildId,
      sourceFontHash,
      family: fontMetadata?.family || fontName,
      format: fontMetadata?.format || 'unknown',
      coverage: {
        uppercase,
        lowercase,
        digits
      },
      charsets: {
        base: true,
        extendedMathDefault: charsets.enableDefault,
        extendedMathOptional: charsets.enableOptional,
        extendedMathAdvanced: charsets.enableAdvanced,
        extendedTextSymbols: charsets.enableTextSymbols
      },
      failures: failures.map(f => f.char),
      fallbacks: fallbacks.map(f => f.char),
      createdAt: new Date().toISOString(),
      fontdataFile: 'fontdata.js'
    };

    return manifest;
  }

  /**
   * 生成详细的 report.json
   * 
   * @param {Object} options - 生成选项
   * @returns {Object} report 对象
   */
  static async generateReport(options) {
    const {
      fontName,
      glyphs,
      failures,
      fallbacks,
      l3Skipped,
      charsetManager,
      capabilities,
      sourceFontPath,
      config
    } = options;

    // 计算 buildId 和 sourceFontHash
    const buildId = this.calculateBuildId(sourceFontPath, config);
    const sourceFontHash = await this.calculateSourceFontHash(sourceFontPath);

    // 统计信息
    const statistics = {
      total: Object.keys(glyphs).length,
      successful: Object.keys(glyphs).length - failures.length,
      failed: failures.length,
      fallback: fallbacks.length,
      l3Skipped: l3Skipped?.length || 0
    };

    // 按类别统计
    const byCategory = this._calculateCategoryStats(glyphs, charsetManager);

    // Glyph 详情
    const glyphDetails = this._collectGlyphDetails(glyphs, charsetManager);

    // Advanced charset 状态
    const advancedCharsetStatus = {
      available: capabilities?.l3ReplacementAllowed || false,
      variantsAssemblySupported: capabilities?.hasMATH || false,
      regressionTestsPassed: false, // 需要从回归测试结果读取
      reason: capabilities?.l3ReplacementReason || 'Unknown'
    };

    // Variants 和 Assemblies 统计（当前策略不提取这些数据）
    const variantsStats = {
      total: 0,
      successful: 0,
      failed: 0,
      details: []
    };

    const assembliesStats = {
      total: 0,
      successful: 0,
      failed: 0,
      details: []
    };

    const report = {
      buildId,
      sourceFontHash,
      createdAt: new Date().toISOString(),
      fontName,
      statistics,
      byCategory,
      glyphs: glyphDetails,
      failures: failures.map(f => ({
        char: f.char,
        codepoint: f.codepoint,
        category: f.category || 'unknown',
        reason: f.reason
      })),
      fallbacks: fallbacks.map(f => ({
        char: f.char,
        codepoint: f.codepoint,
        reason: f.reason
      })),
      l3Skipped: (l3Skipped || []).map(s => ({
        char: s.char,
        codepoint: s.codepoint,
        reason: s.reason
      })),
      variants: variantsStats,
      assemblies: assembliesStats,
      advancedCharsetStatus
    };

    return report;
  }

  /**
   * 按类别计算统计信息
   * @private
   */
  static _calculateCategoryStats(glyphs, charsetManager) {
    const stats = {};
    
    if (!charsetManager) {
      return stats;
    }
    
    const charset = charsetManager.getMergedCharset();
    const charsMap = charset?.chars || new Map();

    for (const [codepoint, glyph] of Object.entries(glyphs)) {
      const cp = parseInt(codepoint);
      const charConfig = charsMap.get(cp);
      const category = charConfig?.category || 'unknown';

      if (!stats[category]) {
        stats[category] = { total: 0, successful: 0 };
      }
      stats[category].total++;
      stats[category].successful++;
    }

    return stats;
  }

  /**
   * 收集 glyph 详情
   * @private
   */
  static _collectGlyphDetails(glyphs, charsetManager) {
    const details = [];
    
    if (!charsetManager) {
      return details;
    }
    
    const charset = charsetManager.getMergedCharset();
    const charsMap = charset?.chars || new Map();

    for (const [codepoint, glyph] of Object.entries(glyphs)) {
      const cp = parseInt(codepoint);
      const charConfig = charsMap.get(cp);
      
      details.push({
        char: String.fromCodePoint(cp),
        codepoint: `U+${cp.toString(16).toUpperCase().padStart(4, '0')}`,
        category: charConfig?.category || 'unknown',
        keepOriginalAdvance: glyph.keepOriginalAdvance || false,
        pathCentering: glyph.enablePathCentering || false,
        pathCenteringDx: glyph.pathCenteringDx || 0,
        source: glyph.source || 'user-font'
      });
    }

    return details;
  }
}
