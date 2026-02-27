/**
 * GlyphExtractor - Glyph 提取器
 * 
 * 从字体中提取指定字符的 glyph 数据
 */

import { PathNormalizer } from './path-normalizer.js';
import { PathProcessor } from './path-processor.js';
import { MetricsCalculator } from './metrics-calculator.js';

export class GlyphExtractor {
  constructor(font, config = {}) {
    this.font = font;
    this.charsetManager = config.charsetManager || null;
    this.baseFontdata = config.baseFontdata || null;
    this.enablePathCentering = config.enablePathCentering || false;
    this.capabilities = config.capabilities || null;  // 字体能力检测结果
    
    this.config = {
      enableDefaultReplacement: true,
      enableOptionalReplacement: config.enableOptionalReplacement || false,
      optionalChars: config.optionalChars || ['*', '~', '→', '←']
    };

    // 定义默认字符集
    this.defaultChars = {
      alphanumeric: 'ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789',
      operators: '+-=×·÷<>≤≥−',
      delimiters: '|/',
      punctuation: '.,:;\'!%'
    };

    this.optionalChars = {
      brackets: '()[]{}',
      symbols: '*~→←–'
    };
    
    this.keepOriginalAdvanceChars = new Set(this.defaultChars.operators);

    // L3 目标符号集合（用于 gate 检查）
    this.L3_TARGET_SYMBOLS = new Set([
      0x0028, 0x0029, // ( )
      0x005B, 0x005D, // [ ]
      0x007B, 0x007D, // { }
      0x2308, 0x2309, // ⌈ ⌉
      0x230A, 0x230B, // ⌊ ⌋
      0x221A, // √
      0x222B, 0x222C, 0x222D, 0x222E, 0x222F, 0x2230, // ∫∬∭∮∯∰
      0x2211, 0x220F, 0x2210, 0x22C0, 0x22C1, 0x22C2, 0x22C3, // ∑∏∐⋀⋁⋂⋃
      0x2190, 0x2192, 0x2194, 0x21D0, 0x21D2, 0x21D4 // ←→↔⇐⇒⇔
    ]);

    // L3 跳过列表
    this.l3Skipped = [];
  }

  /**
   * 提取所有需要的 glyph
   */
  extract() {
    // Use CharsetManager if available
    if (this.charsetManager) {
      return this.extractWithCharsetManager();
    }

    // Legacy extraction
    const glyphs = {};
    const failures = [];

    const defaultCharString = Object.values(this.defaultChars).join('');
    for (const char of defaultCharString) {
      const result = this.extractGlyph(char);
      if (result.success) {
        glyphs[char] = result.data;
      } else {
        failures.push({ char, reason: result.reason, type: 'default' });
      }
    }

    return { glyphs, failures, fallbacks: [], l3Skipped: [] };
  }

  /**
   * 使用 CharsetManager 提取 glyphs
   */
  extractWithCharsetManager() {
    const glyphs = {};
    const failures = [];
    const fallbacks = [];
    this.l3Skipped = [];  // 重置 L3 跳过列表

    const charset = this.charsetManager.getMergedCharset();

    console.log('\n[GlyphExtractor] 使用 CharsetManager 提取 glyph 数据...');

    // 1. Process homoglyph groups
    for (const group of charset.homoglyphs) {
      const result = this.processHomoglyphGroup(group);
      
      if (result.success) {
        for (const codepointStr of group.codepoints) {
          const codepoint = this.parseCodepoint(codepointStr);
          glyphs[codepoint] = {
            ...result.glyphData,
            codepoint,
            char: String.fromCodePoint(codepoint)
          };
        }
      }
    }

    // 2. Process normalized mappings
    for (const mapping of charset.normalizedMappings) {
      const fromCodepoint = this.parseCodepoint(mapping.from);
      const toCodepoint = this.parseCodepoint(mapping.to);
      
      const result = this.extractGlyphByCodepoint(toCodepoint);
      
      if (result.success) {
        glyphs[fromCodepoint] = {
          ...result.data,
          codepoint: fromCodepoint,
          char: String.fromCodePoint(fromCodepoint)
        };
      }
    }

    // 3. Extract regular characters with L3 gate check
    for (const [codepoint, charConfig] of charset.characters.entries()) {
      if (glyphs[codepoint]) continue;

      // L3 gate check
      if (this.isL3Symbol(codepoint)) {
        const gateCheck = this.shouldExtractL3Glyph(codepoint);
        
        if (!gateCheck.allowed) {
          // L3 不允许提取，跳过
          this.l3Skipped.push({
            codepoint,
            char: charConfig.char,
            reason: gateCheck.reason
          });
          console.log(`  ⏭️ 跳过 L3 符号 '${charConfig.char}' (U+${codepoint.toString(16).toUpperCase().padStart(4, '0')}): ${gateCheck.reason}`);
          continue;
        }
      }

      const result = this.extractGlyphByCodepoint(codepoint, charConfig);
      
      if (result.success) {
        glyphs[codepoint] = result.data;
      } else {
        failures.push({
          char: charConfig.char,
          codepoint,
          category: charConfig.category,
          reason: result.reason
        });
      }
    }

    console.log(`✓ 提取完成: ${Object.keys(glyphs).length} 个字符`);
    if (this.l3Skipped.length > 0) {
      console.log(`⏭️ 跳过 L3 符号: ${this.l3Skipped.length} 个`);
    }

    return { glyphs, failures, fallbacks, l3Skipped: this.l3Skipped };
  }

  /**
   * 处理同形异码字符组
   */
  processHomoglyphGroup(group) {
    for (const preferredCodepointStr of group.preferredSource) {
      const codepoint = this.parseCodepoint(preferredCodepointStr);
      const result = this.extractGlyphByCodepoint(codepoint);
      
      if (result.success) {
        return {
          success: true,
          glyphData: result.data,
          sourceCodepoint: codepoint
        };
      }
    }

    return { success: false, reason: 'All preferred sources failed' };
  }

  /**
   * 通过 codepoint 提取 glyph
   */
  extractGlyphByCodepoint(codepoint, charConfig = null) {
    const char = String.fromCodePoint(codepoint);
    const result = this.extractGlyph(char);
    
    if (result.success && charConfig) {
      result.data.keepOriginalAdvance = charConfig.keepOriginalAdvance;
      result.data.enablePathCentering = charConfig.enablePathCentering;
      result.data.category = charConfig.category;
      result.data.source = 'user-font';
      
      // 应用 path centering（如果启用且配置允许）
      if (this.enablePathCentering && charConfig.enablePathCentering) {
        const centeringResult = PathProcessor.centerPath(
          result.data.path,
          result.data.bbox,
          result.data.metrics.advanceWidth
        );
        
        if (centeringResult.applied) {
          result.data.path = centeringResult.path;
          result.data.pathCentering = {
            enabled: true,
            dx: centeringResult.dx,
            bboxCenter: centeringResult.bboxCenter,
            advanceCenter: centeringResult.advanceCenter
          };
        } else {
          result.data.pathCentering = {
            enabled: false,
            dx: 0
          };
        }
      } else {
        result.data.pathCentering = {
          enabled: false,
          dx: 0
        };
      }
    }
    
    return result;
  }

  /**
   * 提取单个字符的 glyph 数据
   */
  extractGlyph(char) {
    try {
      const codepoint = char.codePointAt(0);
      const glyph = this.font.charToGlyph(char);

      if (!glyph || glyph.index === 0) {
        return { success: false, reason: '字体中不存在该字符的 glyph' };
      }

      const path = glyph.getPath(0, 0, this.font.unitsPerEm);
      const pathData = path.toPathData(2);

      const normalizedPath = PathNormalizer.normalize(pathData, {
        unitsPerEm: this.font.unitsPerEm,
        precision: 1
      });

      if (!PathNormalizer.isValid(normalizedPath)) {
        return { success: false, reason: 'glyph path 为空或无效' };
      }

      const metrics = MetricsCalculator.calculate(glyph, this.font);
      
      if (!MetricsCalculator.isValid(metrics)) {
        return { success: false, reason: 'metrics 数据无效' };
      }

      const bbox = glyph.getBoundingBox();
      const keepOriginalAdvance = this.keepOriginalAdvanceChars.has(char);

      return {
        success: true,
        data: {
          char,
          codepoint,
          glyphIndex: glyph.index,
          path: normalizedPath,
          metrics,
          bbox: {
            xMin: bbox.x1 || 0,
            yMin: bbox.y1 || 0,
            xMax: bbox.x2 || 0,
            yMax: bbox.y2 || 0
          },
          keepOriginalAdvance
        }
      };
    } catch (error) {
      return { success: false, reason: `提取失败: ${error.message}` };
    }
  }

  /**
   * 解析 codepoint 字符串
   */
  parseCodepoint(codepointStr) {
    if (typeof codepointStr === 'number') return codepointStr;
    if (codepointStr.startsWith('0x') || codepointStr.startsWith('0X')) {
      return parseInt(codepointStr, 16);
    }
    return parseInt(codepointStr, 10);
  }

  /**
   * 判断是否为 L3 符号
   * @param {number} codepoint - Unicode codepoint
   * @returns {boolean}
   */
  isL3Symbol(codepoint) {
    return this.L3_TARGET_SYMBOLS.has(codepoint);
  }

  /**
   * 判断是否应该提取 L3 glyph
   * @param {number} codepoint - Unicode codepoint
   * @returns {Object} { allowed: boolean, reason: string }
   */
  shouldExtractL3Glyph(codepoint) {
    // 如果没有 capabilities，默认允许（向后兼容）
    if (!this.capabilities) {
      return { allowed: true, reason: 'No capabilities check (backward compatible)' };
    }

    // 检查是否允许 L3 替换
    if (!this.capabilities.l3ReplacementAllowed) {
      return { 
        allowed: false, 
        reason: this.capabilities.l3ReplacementReason || 'L3 replacement not allowed'
      };
    }

    // 检查该 glyph 是否在字体中存在
    const glyph = this.font.charToGlyph(String.fromCodePoint(codepoint));
    if (!glyph || glyph.index === 0) {
      return {
        allowed: false,
        reason: 'Glyph not found in font'
      };
    }

    return { allowed: true, reason: 'L3 replacement allowed' };
  }

  /**
   * 解析 codepoint 字符串
   */
  parseCodepoint(codepointStr) {
    if (typeof codepointStr === 'number') return codepointStr;
    if (codepointStr.startsWith('0x') || codepointStr.startsWith('0X')) {
      return parseInt(codepointStr, 16);
    }
    return parseInt(codepointStr, 10);
  }

  /**
   * 获取字符集统计信息
   */
  getStatistics(glyphs) {
    const chars = Object.keys(glyphs);
    return {
      total: chars.length,
      uppercase: chars.filter(c => /[A-Z]/.test(c)).length,
      lowercase: chars.filter(c => /[a-z]/.test(c)).length,
      digits: chars.filter(c => /[0-9]/.test(c)).length
    };
  }
}
