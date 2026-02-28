/**
 * FontCapabilityDetector - 字体能力检测器
 * 
 * 检测字体是否支持 variants/assembly 等高级功能
 * 用于 Capability-Gated 替换策略
 */

import fs from 'fs';

export class FontCapabilityDetector {
  /**
   * 构造函数
   * @param {Object} font - opentype.js font 对象
   * @param {string} fontPath - 字体文件路径（用于二进制解析）
   */
  constructor(font, fontPath = null) {
    this.font = font;
    this.fontPath = fontPath;
    this.capabilities = null;
  }

  /**
   * 执行完整的能力检测
   * @returns {Object} 能力检测结果
   */
  detect() {
    console.log('\n[FontCapabilityDetector] 开始字体能力检测...');

    const mathTable = this.detectMATHTable();
    const detectedTables = this.detectOpenTypeTables();
    const variants = this.detectVariants();
    const assembly = this.detectAssembly();
    const coverage = this.detectCoverage();
    const l3Coverage = this.detectL3Coverage();

    this.capabilities = {
      hasMATH: mathTable.hasMATH,
      mathTableVersion: mathTable.version,
      detectedTables: detectedTables,
      hasVariants: variants.hasVariants,
      variantsMethod: variants.method,
      hasAssembly: assembly.hasAssembly,
      assemblyMethod: assembly.method,
      coverage: coverage,
      l3Coverage: l3Coverage,
      l3ReplacementAllowed: this.shouldAllowL3Replacement(mathTable, l3Coverage),
      l3ReplacementReason: this.getL3ReplacementReason(mathTable, l3Coverage),
      timestamp: new Date().toISOString()
    };

    console.log('✓ 能力检测完成');
    this.logCapabilities();

    return this.capabilities;
  }

  /**
   * 检测所有 OpenType 表（用于调试）
   * @returns {Array<string>} 表名列表
   */
  detectOpenTypeTables() {
    console.log('  - 检测 OpenType 表列表...');

    try {
      if (!this.fontPath) {
        console.log('    ⚠️  未提供字体文件路径，无法检测表列表');
        return [];
      }

      const buffer = fs.readFileSync(this.fontPath);
      const numTables = buffer.readUInt16BE(4);
      const tables = [];

      for (let i = 0; i < numTables; i++) {
        const offset = 12 + i * 16;
        const tag = buffer.toString('ascii', offset, offset + 4);
        tables.push(tag);
      }

      console.log(`    ✓ 找到 ${tables.length} 个表: ${tables.join(', ')}`);
      return tables;
    } catch (error) {
      console.log(`    ✗ 检测失败: ${error.message}`);
      return [];
    }
  }

  /**
   * 检测 OpenType MATH table
   * 使用二进制解析方案，因为 opentype.js 不支持 MATH 表
   * @returns {Object} { hasMATH: boolean, version?: string }
   */
  detectMATHTable() {
    console.log('  - 检测 OpenType MATH table...');

    try {
      // 如果没有提供 fontPath，尝试使用 opentype.js（虽然不支持 MATH 表）
      if (!this.fontPath) {
        console.log('    ⚠️  未提供字体文件路径，无法进行二进制检测');
        
        // Fallback: 检查 opentype.js 的 tables
        if (this.font.tables && this.font.tables.MATH) {
          const version = this.font.tables.MATH.version || 'unknown';
          console.log(`    ✓ 找到 MATH table (version: ${version})`);
          return { hasMATH: true, version };
        }
        
        console.log('    ✗ 未找到 MATH table');
        return { hasMATH: false, version: null };
      }

      // 使用二进制解析检测 MATH 表
      const buffer = fs.readFileSync(this.fontPath);
      
      // 读取表数量 (offset 4, 2 bytes)
      const numTables = buffer.readUInt16BE(4);
      
      // 读取表目录，查找 MATH 表
      for (let i = 0; i < numTables; i++) {
        const offset = 12 + i * 16;
        const tag = buffer.toString('ascii', offset, offset + 4);
        
        if (tag === 'MATH') {
          const tableOffset = buffer.readUInt32BE(offset + 8);
          const length = buffer.readUInt32BE(offset + 12);
          
          // 读取 MATH 表的版本号
          const mathVersion = buffer.readUInt32BE(tableOffset);
          const majorVersion = mathVersion >> 16;
          const minorVersion = mathVersion & 0xFFFF;
          const version = `${majorVersion}.${minorVersion}`;
          
          console.log(`    ✓ 找到 MATH table (version: ${version}, size: ${length} bytes)`);
          return { hasMATH: true, version };
        }
      }

      console.log('    ✗ 未找到 MATH table');
      return { hasMATH: false, version: null };
    } catch (error) {
      console.log(`    ✗ 检测失败: ${error.message}`);
      return { hasMATH: false, version: null };
    }
  }

  /**
   * 检测 Variants 能力
   * @returns {Object} { hasVariants: boolean, method: string }
   */
  detectVariants() {
    console.log('  - 检测 Variants 能力...');

    try {
      // 方法 1: 检查 MATH table 的 MathVariants
      if (this.font.tables && this.font.tables.MATH) {
        const mathTable = this.font.tables.MATH;
        
        // 检查 MathVariants 子表
        if (mathTable.mathVariants || mathTable.variants) {
          console.log('    ✓ 找到 MATH.MathVariants 子表');
          return { hasVariants: true, method: 'MATH' };
        }
      }

      // 方法 2: 检查常见 variant glyph 命名模式
      const variantPatterns = ['.size1', '.size2', '.size3', '.size4'];
      const testChars = ['parenleft', 'parenright', 'bracketleft', 'bracketright'];
      
      let foundVariants = 0;
      for (const baseChar of testChars) {
        for (const pattern of variantPatterns) {
          const variantName = baseChar + pattern;
          const glyph = this.font.glyphs.get(this.font.glyphNames.indexOf(variantName));
          
          if (glyph && glyph.index > 0) {
            foundVariants++;
            break; // 找到一个就够了
          }
        }
      }

      if (foundVariants >= 2) {
        console.log(`    ✓ 找到 variant glyphs (命名模式: ${foundVariants}/${testChars.length})`);
        return { hasVariants: true, method: 'naming' };
      }

      console.log('    ✗ 未找到 variants');
      return { hasVariants: false, method: 'none' };
    } catch (error) {
      console.log(`    ✗ 检测失败: ${error.message}`);
      return { hasVariants: false, method: 'none' };
    }
  }

  /**
   * 检测 Assembly 能力
   * @returns {Object} { hasAssembly: boolean, method: string }
   */
  detectAssembly() {
    console.log('  - 检测 Assembly 能力...');

    try {
      // 方法 1: 检查 MATH table 的 MathGlyphConstruction
      if (this.font.tables && this.font.tables.MATH) {
        const mathTable = this.font.tables.MATH;
        
        // 检查 MathGlyphConstruction 子表
        if (mathTable.mathGlyphConstruction || mathTable.glyphConstruction) {
          console.log('    ✓ 找到 MATH.MathGlyphConstruction 子表');
          return { hasAssembly: true, method: 'MATH' };
        }
      }

      // 方法 2: 检查常见 assembly part 命名模式
      const partPatterns = ['.top', '.mid', '.bot', '.ext'];
      const testChars = ['parenleft', 'parenright', 'radical'];
      
      let foundParts = 0;
      for (const baseChar of testChars) {
        for (const pattern of partPatterns) {
          const partName = baseChar + pattern;
          const glyph = this.font.glyphs.get(this.font.glyphNames.indexOf(partName));
          
          if (glyph && glyph.index > 0) {
            foundParts++;
            break; // 找到一个就够了
          }
        }
      }

      if (foundParts >= 2) {
        console.log(`    ✓ 找到 assembly parts (命名模式: ${foundParts}/${testChars.length})`);
        return { hasAssembly: true, method: 'naming' };
      }

      console.log('    ✗ 未找到 assembly parts');
      return { hasAssembly: false, method: 'none' };
    } catch (error) {
      console.log(`    ✗ 检测失败: ${error.message}`);
      return { hasAssembly: false, method: 'none' };
    }
  }

  /**
   * 检测 Glyph Coverage（L1/L2/L3 覆盖率）
   * @returns {Object} { l1: number, l2: number, l3: number }
   */
  detectCoverage() {
    console.log('  - 检测 Glyph Coverage...');

    try {
      // L1: 字母数字 + 基础运算符
      const l1Chars = [
        // 字母数字
        ...Array.from('ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789'),
        // 基础运算符
        ...Array.from('+-=×÷<>≤≥')
      ];

      // L2: 扩展数学符号
      const l2Chars = [
        0x2211, // ∑ SUMMATION
        0x222B, // ∫ INTEGRAL
        0x00B1, // ± PLUS-MINUS
        0x221E, // ∞ INFINITY
        0x2200, // ∀ FOR ALL
        0x21D2, // ⇒ RIGHTWARDS DOUBLE ARROW
        0x21D4, // ⇔ LEFT RIGHT DOUBLE ARROW
        0x2208, // ∈ ELEMENT OF
        0x2209, // ∉ NOT AN ELEMENT OF
        0x2282, // ⊂ SUBSET OF
        0x2283, // ⊃ SUPERSET OF
        0x2286, // ⊆ SUBSET OF OR EQUAL TO
        0x2287  // ⊇ SUPERSET OF OR EQUAL TO
      ];

      // L3: 可伸缩符号（需要 variants/assembly）
      const l3Chars = [
        0x0028, // ( LEFT PARENTHESIS
        0x0029, // ) RIGHT PARENTHESIS
        0x005B, // [ LEFT SQUARE BRACKET
        0x005D, // ] RIGHT SQUARE BRACKET
        0x007B, // { LEFT CURLY BRACKET
        0x007D, // } RIGHT CURLY BRACKET
        0x221A, // √ SQUARE ROOT
        0x222B, // ∫ INTEGRAL (also in L2)
        0x2211  // ∑ SUMMATION (also in L2)
      ];

      const l1Coverage = this.calculateCoverage(l1Chars);
      const l2Coverage = this.calculateCoverage(l2Chars);
      const l3Coverage = this.calculateCoverage(l3Chars);

      console.log(`    L1 覆盖率: ${l1Coverage.toFixed(1)}% (${l1Coverage >= 95 ? '✓' : '✗'})`);
      console.log(`    L2 覆盖率: ${l2Coverage.toFixed(1)}% (${l2Coverage >= 70 ? '✓' : '⚠️'})`);
      console.log(`    L3 覆盖率: ${l3Coverage.toFixed(1)}% (${l3Coverage >= 80 ? '✓' : '⚠️'})`);

      return {
        l1: l1Coverage,
        l2: l2Coverage,
        l3: l3Coverage
      };
    } catch (error) {
      console.log(`    ✗ 检测失败: ${error.message}`);
      return { l1: 0, l2: 0, l3: 0 };
    }
  }

  /**
   * 计算字符覆盖率
   * @param {Array} chars - 字符数组（字符串或 codepoint）
   * @returns {number} 覆盖率百分比
   */
  calculateCoverage(chars) {
    let found = 0;
    let total = chars.length;

    for (const char of chars) {
      const codepoint = typeof char === 'string' ? char.codePointAt(0) : char;
      const glyph = this.font.charToGlyph(String.fromCodePoint(codepoint));
      
      if (glyph && glyph.index > 0) {
        found++;
      }
    }

    return total > 0 ? (found / total) * 100 : 0;
  }

  /**
   * 检测 L3 目标符号覆盖率
   * L3 = 可伸缩符号（需要 variants/assembly）
   * @returns {Object} L3 覆盖率详情
   */
  detectL3Coverage() {
    console.log('  - 检测 L3 目标符号覆盖率...');

    try {
      // 定义 L3 目标符号集合
      const L3_TARGET_SYMBOLS = {
        // 伸缩括号
        brackets: [0x0028, 0x0029, 0x005B, 0x005D, 0x007B, 0x007D, 
                   0x2308, 0x2309, 0x230A, 0x230B],  // ⌈⌉⌊⌋
        // 根号
        radicals: [0x221A],  // √
        // 积分
        integrals: [0x222B, 0x222C, 0x222D, 0x222E, 0x222F, 0x2230],  // ∫∬∭∮∯∰
        // 求和/乘积
        largeOps: [0x2211, 0x220F, 0x2210, 0x22C0, 0x22C1, 0x22C2, 0x22C3],  // ∑∏∐⋀⋁⋂⋃
        // 长箭头
        arrows: [0x2190, 0x2192, 0x2194, 0x21D0, 0x21D2, 0x21D4]  // ←→↔⇐⇒⇔
      };

      const results = {};
      let totalAvailable = 0;
      let totalSymbols = 0;

      for (const [category, codepoints] of Object.entries(L3_TARGET_SYMBOLS)) {
        const available = [];
        const missing = [];

        for (const cp of codepoints) {
          const glyph = this.font.charToGlyph(String.fromCodePoint(cp));
          if (glyph && glyph.index > 0) {
            available.push(cp);
          } else {
            missing.push(cp);
          }
        }

        const coverage = (available.length / codepoints.length * 100).toFixed(1);
        
        results[category] = {
          total: codepoints.length,
          available: available.length,
          coverage: `${coverage}%`,
          missing: missing.map(cp => `U+${cp.toString(16).toUpperCase().padStart(4, '0')}`)
        };

        totalAvailable += available.length;
        totalSymbols += codepoints.length;

        console.log(`    ${category}: ${coverage}% (${available.length}/${codepoints.length})`);
      }

      const overallCoverage = (totalAvailable / totalSymbols * 100).toFixed(1);
      console.log(`    ✓ L3 总体覆盖率: ${overallCoverage}%`);

      return {
        byCategory: results,
        overall: {
          total: totalSymbols,
          available: totalAvailable,
          coverage: `${overallCoverage}%`
        }
      };
    } catch (error) {
      console.log(`    ✗ 检测失败: ${error.message}`);
      return {
        byCategory: {},
        overall: { total: 0, available: 0, coverage: '0%' }
      };
    }
  }

  /**
   * 判断是否允许 L3 替换
   * @param {Object} mathTable - MATH 表检测结果
   * @param {Object} l3Coverage - L3 覆盖率
   * @returns {boolean}
   */
  shouldAllowL3Replacement(mathTable, l3Coverage) {
    // 必须有 MATH 表
    if (!mathTable.hasMATH) {
      return false;
    }

    // L3 总体覆盖率必须 >= 80%
    const overallCoverage = parseFloat(l3Coverage.overall.coverage);
    if (overallCoverage < 80) {
      return false;
    }

    return true;
  }

  /**
   * 获取 L3 替换原因
   * @param {Object} mathTable - MATH 表检测结果
   * @param {Object} l3Coverage - L3 覆盖率
   * @returns {string}
   */
  getL3ReplacementReason(mathTable, l3Coverage) {
    if (!mathTable.hasMATH) {
      return 'Font does not have MATH table';
    }

    const overallCoverage = parseFloat(l3Coverage.overall.coverage);
    if (overallCoverage < 80) {
      return `L3 coverage insufficient: ${l3Coverage.overall.coverage} (minimum 80% required)`;
    }

    return 'Font has MATH table and sufficient L3 coverage';
  }

  /**
   * 计算字符覆盖率
   * @param {Array} chars - 字符数组（字符串或 codepoint）
   * @returns {number} 覆盖率百分比
   */
  calculateCoverage(chars) {
    let found = 0;
    let total = chars.length;

    for (const char of chars) {
      const codepoint = typeof char === 'string' ? char.codePointAt(0) : char;
      const glyph = this.font.charToGlyph(String.fromCodePoint(codepoint));
      
      if (glyph && glyph.index > 0) {
        found++;
      }
    }

    return total > 0 ? (found / total) * 100 : 0;
  }

  /**
   * 生成 capabilities.json 报告
   * @param {string} outputPath - 输出文件路径
   * @returns {Promise<void>}
   */
  async generateCapabilitiesReport(outputPath) {
    if (!this.capabilities) {
      throw new Error('请先调用 detect() 方法');
    }

    const fs = await import('fs/promises');
    const report = {
      ...this.capabilities,
      summary: this.generateSummary(),
      recommendations: this.generateRecommendations()
    };

    await fs.writeFile(outputPath, JSON.stringify(report, null, 2), 'utf-8');
    console.log(`\n✓ 生成 capabilities.json: ${outputPath}`);
  }

  /**
   * 生成能力摘要
   * @returns {string}
   */
  generateSummary() {
    if (!this.capabilities) return 'No capabilities detected';

    const { hasMATH, hasVariants, hasAssembly, coverage } = this.capabilities;

    // 有 MATH 表 + variants/assembly = 专业数学字体
    if (hasMATH && hasVariants && hasAssembly && coverage.l3 >= 80) {
      return 'Professional math font - Full L3 support available';
    } 
    // 有 MATH 表但没有 variants/assembly = 有潜力但需要进一步实现
    else if (hasMATH && coverage.l1 >= 95 && coverage.l2 >= 70) {
      return 'Math font with MATH table - L1/L2 support available, L3 requires implementation';
    }
    // 没有 MATH 表但覆盖率好 = 标准字体
    else if (!hasMATH && coverage.l1 >= 95 && coverage.l2 >= 70) {
      return 'Standard font - L1/L2 support available, L3 not supported';
    } 
    // 只有基础覆盖
    else if (coverage.l1 >= 95) {
      return 'Basic font - L1 support available, L2/L3 limited';
    } 
    // 覆盖率不足
    else {
      return 'Limited font - Partial L1 support, L2/L3 not recommended';
    }
  }

  /**
   * 生成建议
   * @returns {Array<string>}
   */
  generateRecommendations() {
    if (!this.capabilities) return [];

    const recommendations = [];
    const { hasMATH, hasVariants, hasAssembly, coverage } = this.capabilities;

    // MATH 表相关建议
    if (hasMATH && !hasVariants && !hasAssembly) {
      recommendations.push('Font has OpenType MATH table but variants/assembly extraction is not yet implemented. L3 features (stretchy brackets, radicals, integrals) will use MathJax defaults for now.');
      recommendations.push('Future implementation: Extract variants/assembly data from MATH table to enable full L3 support.');
    } else if (!hasMATH) {
      recommendations.push('Font does not have OpenType MATH table. L3 features (stretchy brackets, radicals, integrals) will use MathJax defaults.');
      recommendations.push('For full math support, consider using professional math fonts: STIX Two Math, Latin Modern Math, or Cambria Math.');
    }

    // 覆盖率相关建议
    if (coverage.l1 < 95) {
      recommendations.push('L1 coverage is low. Some basic characters may not render correctly.');
    }

    if (coverage.l2 < 70) {
      recommendations.push('L2 coverage is low. Many extended math symbols will use MathJax defaults.');
    }

    if (coverage.l3 < 80 && (hasVariants || hasAssembly)) {
      recommendations.push('L3 coverage is low despite having variants/assembly support. Some stretchy symbols may not work correctly.');
    }

    // 完美情况
    if (hasMATH && hasVariants && hasAssembly && coverage.l1 >= 95 && coverage.l2 >= 70 && coverage.l3 >= 80) {
      recommendations.push('Font has excellent math support. All features enabled.');
    }

    return recommendations;
  }

  /**
   * 记录能力检测结果到控制台
   */
  logCapabilities() {
    if (!this.capabilities) return;

    console.log('\n📊 字体能力检测结果:');
    console.log('  ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
    console.log(`  OpenType MATH table: ${this.capabilities.hasMATH ? '✓ 是' : '✗ 否'}`);
    if (this.capabilities.mathTableVersion) {
      console.log(`    版本: ${this.capabilities.mathTableVersion}`);
    }
    if (this.capabilities.detectedTables && this.capabilities.detectedTables.length > 0) {
      console.log(`  检测到的表: ${this.capabilities.detectedTables.join(', ')}`);
    }
    console.log(`  Variants 支持: ${this.capabilities.hasVariants ? '✓ 是' : '✗ 否'} (${this.capabilities.variantsMethod})`);
    console.log(`  Assembly 支持: ${this.capabilities.hasAssembly ? '✓ 是' : '✗ 否'} (${this.capabilities.assemblyMethod})`);
    console.log('  ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
    console.log('  覆盖率:');
    console.log(`    L1 (基础): ${this.capabilities.coverage.l1.toFixed(1)}%`);
    console.log(`    L2 (扩展): ${this.capabilities.coverage.l2.toFixed(1)}%`);
    console.log(`    L3 (结构): ${this.capabilities.coverage.l3.toFixed(1)}%`);
    if (this.capabilities.l3Coverage) {
      console.log('  ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
      console.log('  L3 目标符号覆盖率:');
      for (const [category, info] of Object.entries(this.capabilities.l3Coverage.byCategory)) {
        const status = info.available === info.total ? '✓' : info.available > 0 ? '⚠️' : '✗';
        console.log(`    ${status} ${category}: ${info.coverage} (${info.available}/${info.total})`);
        if (info.missing.length > 0 && info.missing.length <= 3) {
          console.log(`      缺失: ${info.missing.join(', ')}`);
        } else if (info.missing.length > 3) {
          console.log(`      缺失: ${info.missing.slice(0, 3).join(', ')} ... (共 ${info.missing.length} 个)`);
        }
      }
      console.log(`    总体: ${this.capabilities.l3Coverage.overall.coverage}`);
    }
    console.log('  ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
    console.log(`  L3 替换: ${this.capabilities.l3ReplacementAllowed ? '✓ 允许' : '✗ 不允许'}`);
    console.log(`  原因: ${this.capabilities.l3ReplacementReason}`);
    console.log('  ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
    console.log(`  摘要: ${this.generateSummary()}`);
    console.log('  ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━\n');
  }

  /**
   * 获取能力检测结果
   * @returns {Object}
   */
  getCapabilities() {
    return this.capabilities;
  }
}
