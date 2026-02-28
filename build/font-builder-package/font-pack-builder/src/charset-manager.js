/**
 * CharsetManager - 字符集管理器
 * 
 * 负责加载、合并和管理多层级字符集配置
 */

import fs from 'fs/promises';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// Gate flags for advanced charset
const VARIANTS_ASSEMBLY_SUPPORTED = false;  // Will be set to true in Phase 3
const REGRESSION_TESTS_PASSED = false;      // Will be set to true in Phase 3

export class CharsetManager {
  /**
   * 构造函数
   * @param {Object} options - 配置选项
   * @param {boolean} options.enableDefault - 启用 extended-math-default
   * @param {boolean} options.enableOptional - 启用 extended-math-optional
   * @param {boolean} options.enableAdvanced - 启用 extended-math-advanced
   * @param {boolean} options.enableTextSymbols - 启用 extended-text-symbols
   * @param {boolean} options.baseOnly - 仅使用 base 字符集
   */
  constructor(options = {}) {
    this.options = {
      enableDefault: options.baseOnly ? false : (options.enableDefault !== false),
      enableOptional: options.enableOptional || false,
      enableAdvanced: options.enableAdvanced || false,
      enableTextSymbols: options.enableTextSymbols || false,
      baseOnly: options.baseOnly || false
    };

    this.charsets = {
      base: null,
      extendedMathDefault: null,
      extendedMathOptional: null,
      extendedMathAdvanced: null,
      extendedTextSymbols: null
    };

    this.charsetsDir = path.join(__dirname, '../charsets');
    this.mergedCharset = null;
  }

  /**
   * 加载字符集配置
   * @returns {Promise<void>}
   */
  async load() {
    // Load base charset (always)
    this.charsets.base = await this.loadBaseCharset();

    // Load extended charsets based on options
    if (this.options.enableDefault) {
      this.charsets.extendedMathDefault = await this.loadCharsetFile('extended-math-default.json');
    }

    if (this.options.enableOptional) {
      this.charsets.extendedMathOptional = await this.loadCharsetFile('extended-math-optional.json');
    }

    if (this.options.enableAdvanced) {
      // Check gate conditions
      if (!this.isAdvancedAvailable()) {
        console.warn('⚠️  Advanced charset cannot be enabled:');
        console.warn('   Variants/assembly support not yet implemented or regression tests not passed');
        console.warn('   Continuing without advanced charset.');
        this.options.enableAdvanced = false;
      } else {
        this.charsets.extendedMathAdvanced = await this.loadCharsetFile('extended-math-advanced.json');
      }
    }

    if (this.options.enableTextSymbols) {
      this.charsets.extendedTextSymbols = await this.loadCharsetFile('extended-text-symbols.json');
    }

    // Merge all enabled charsets
    this.mergedCharset = this.mergeCharsets();
  }

  /**
   * 加载基础字符集
   * @returns {Promise<Object>}
   */
  async loadBaseCharset() {
    // Base charset: A-Z, a-z, 0-9, basic operators, delimiters, punctuation
    return {
      name: 'base',
      version: '1.0.0',
      categories: {
        uppercase: {
          characters: 'ABCDEFGHIJKLMNOPQRSTUVWXYZ'.split(''),
          codepoints: Array.from({ length: 26 }, (_, i) => `0x${(0x0041 + i).toString(16).toUpperCase()}`),
          keepOriginalAdvance: false,
          enablePathCentering: false
        },
        lowercase: {
          characters: 'abcdefghijklmnopqrstuvwxyz'.split(''),
          codepoints: Array.from({ length: 26 }, (_, i) => `0x${(0x0061 + i).toString(16).toUpperCase()}`),
          keepOriginalAdvance: false,
          enablePathCentering: false
        },
        digits: {
          characters: '0123456789'.split(''),
          codepoints: Array.from({ length: 10 }, (_, i) => `0x${(0x0030 + i).toString(16).toUpperCase()}`),
          keepOriginalAdvance: false,
          enablePathCentering: false
        },
        basicOperators: {
          characters: ['+', '-', '=', '<', '>'],
          codepoints: ['0x002B', '0x002D', '0x003D', '0x003C', '0x003E'],
          keepOriginalAdvance: true,
          enablePathCentering: false
        },
        delimiters: {
          characters: ['(', ')', '[', ']', '{', '}', '|'],
          codepoints: ['0x0028', '0x0029', '0x005B', '0x005D', '0x007B', '0x007D', '0x007C'],
          keepOriginalAdvance: true,
          enablePathCentering: false
        },
        punctuation: {
          characters: ['.', ',', ':', ';', '!', '?', '\'', '"'],
          codepoints: ['0x002E', '0x002C', '0x003A', '0x003B', '0x0021', '0x003F', '0x0027', '0x0022'],
          keepOriginalAdvance: false,
          enablePathCentering: false
        }
      },
      homoglyphs: [],
      normalizedMappings: []
    };
  }

  /**
   * 加载字符集配置文件
   * @param {string} filename - 配置文件名
   * @returns {Promise<Object>}
   */
  async loadCharsetFile(filename) {
    const filePath = path.join(this.charsetsDir, filename);
    
    try {
      const content = await fs.readFile(filePath, 'utf-8');
      const config = JSON.parse(content);
      
      // Validate config structure
      if (!config.name || !config.categories) {
        throw new Error(`Invalid charset config: ${filename}`);
      }
      
      return config;
    } catch (error) {
      if (error.code === 'ENOENT') {
        throw new Error(`Charset file not found: ${filename}`);
      }
      throw new Error(`Failed to load charset ${filename}: ${error.message}`);
    }
  }

  /**
   * 合并所有启用的字符集
   * @returns {Object}
   */
  mergeCharsets() {
    const merged = {
      characters: new Map(),  // Map<codepoint, CharConfig>
      homoglyphs: [],
      normalizedMappings: []
    };

    // Merge charsets in order: base -> default -> optional -> advanced -> text
    const charsetsToMerge = [
      this.charsets.base,
      this.charsets.extendedMathDefault,
      this.charsets.extendedMathOptional,
      this.charsets.extendedMathAdvanced,
      this.charsets.extendedTextSymbols
    ].filter(Boolean);

    for (const charset of charsetsToMerge) {
      // Merge categories
      for (const [categoryName, category] of Object.entries(charset.categories)) {
        for (let i = 0; i < category.codepoints.length; i++) {
          const codepoint = this.parseCodepoint(category.codepoints[i]);
          const char = category.characters[i];
          
          merged.characters.set(codepoint, {
            char,
            codepoint,
            category: categoryName,
            keepOriginalAdvance: category.keepOriginalAdvance,
            enablePathCentering: category.enablePathCentering,
            requiresVariants: category.requiresVariants || false,
            source: charset.name
          });
        }
      }

      // Merge homoglyphs
      if (charset.homoglyphs && charset.homoglyphs.length > 0) {
        merged.homoglyphs.push(...charset.homoglyphs);
      }

      // Merge normalized mappings
      if (charset.normalizedMappings && charset.normalizedMappings.length > 0) {
        merged.normalizedMappings.push(...charset.normalizedMappings);
      }
    }

    return merged;
  }

  /**
   * 解析 codepoint 字符串（支持十进制和十六进制）
   * @param {string} codepointStr - Codepoint 字符串
   * @returns {number}
   */
  parseCodepoint(codepointStr) {
    if (typeof codepointStr === 'number') {
      return codepointStr;
    }

    if (codepointStr.startsWith('0x') || codepointStr.startsWith('0X')) {
      return parseInt(codepointStr, 16);
    }

    return parseInt(codepointStr, 10);
  }

  /**
   * 获取合并后的字符集
   * @returns {Object}
   */
  getMergedCharset() {
    if (!this.mergedCharset) {
      throw new Error('Charset not loaded. Call load() first.');
    }
    return this.mergedCharset;
  }

  /**
   * 获取字符的替换策略
   * @param {number} codepoint - Unicode codepoint
   * @returns {Object|null}
   */
  getReplacementStrategy(codepoint) {
    if (!this.mergedCharset) {
      throw new Error('Charset not loaded. Call load() first.');
    }

    const charConfig = this.mergedCharset.characters.get(codepoint);
    if (!charConfig) {
      return null;
    }

    return {
      keepOriginalAdvance: charConfig.keepOriginalAdvance,
      enablePathCentering: charConfig.enablePathCentering,
      category: charConfig.category,
      requiresVariants: charConfig.requiresVariants
    };
  }

  /**
   * 检查 advanced 字符集是否可用
   * @returns {boolean}
   */
  isAdvancedAvailable() {
    return VARIANTS_ASSEMBLY_SUPPORTED && REGRESSION_TESTS_PASSED;
  }

  /**
   * 获取启用的字符集列表
   * @returns {Array<string>}
   */
  getEnabledCharsets() {
    const enabled = ['base'];
    
    if (this.options.enableDefault) enabled.push('extended-math-default');
    if (this.options.enableOptional) enabled.push('extended-math-optional');
    if (this.options.enableAdvanced) enabled.push('extended-math-advanced');
    if (this.options.enableTextSymbols) enabled.push('extended-text-symbols');
    
    return enabled;
  }

  /**
   * 获取字符集统计信息
   * @returns {Object}
   */
  getStatistics() {
    if (!this.mergedCharset) {
      throw new Error('Charset not loaded. Call load() first.');
    }

    const stats = {
      total: this.mergedCharset.characters.size,
      byCategory: {},
      bySource: {},
      homoglyphGroups: this.mergedCharset.homoglyphs.length,
      normalizedMappings: this.mergedCharset.normalizedMappings.length
    };

    for (const charConfig of this.mergedCharset.characters.values()) {
      // Count by category
      stats.byCategory[charConfig.category] = (stats.byCategory[charConfig.category] || 0) + 1;
      
      // Count by source
      stats.bySource[charConfig.source] = (stats.bySource[charConfig.source] || 0) + 1;
    }

    return stats;
  }
}
