/**
 * ReplacementReporter - 替换报告生成器
 * 
 * 生成 L1/L2/L3 分层替换统计和报告
 */

export class ReplacementReporter {
  /**
   * 生成替换报告
   * @param {Object} extractionResult - 提取结果
   * @param {Object} capabilities - 字体能力
   * @param {Object} charsetManager - 字符集管理器
   * @returns {Object} 替换报告
   */
  static generateReport(extractionResult, capabilities, charsetManager) {
    const { glyphs, failures, fallbacks, l3Skipped = [] } = extractionResult;

    // 获取字符集统计
    const charset = charsetManager.getMergedCharset();
    
    // 分层统计
    const layerStats = {
      l1: this.getLayerStats(glyphs, failures, fallbacks, 'l1', charset),
      l2: this.getLayerStats(glyphs, failures, fallbacks, 'l2', charset),
      l3: this.getLayerStats(glyphs, failures, fallbacks, 'l3', charset)
    };

    // 生成报告
    return {
      summary: layerStats,
      skipped: {
        l3: l3Skipped.map(item => ({
          char: item.char,
          codepoint: `U+${item.codepoint.toString(16).toUpperCase().padStart(4, '0')}`,
          reason: item.reason
        }))
      },
      risks: this.generateRiskWarnings(capabilities, layerStats),
      recommendations: this.generateRecommendations(capabilities, layerStats)
    };
  }

  /**
   * 获取层级统计
   * @param {Object} glyphs - 提取的 glyphs
   * @param {Array} failures - 失败列表
   * @param {Array} fallbacks - 回退列表
   * @param {string} layer - 层级 (l1/l2/l3)
   * @param {Object} charset - 字符集
   * @returns {Object} 层级统计
   */
  static getLayerStats(glyphs, failures, fallbacks, layer, charset) {
    // 定义层级字符集
    const layerCodepoints = this.getLayerCodepoints(layer);
    
    let replaced = 0;
    let skipped = 0;
    let failed = 0;

    for (const codepoint of layerCodepoints) {
      if (glyphs[codepoint]) {
        replaced++;
      } else if (failures.some(f => f.codepoint === codepoint)) {
        failed++;
      } else {
        skipped++;
      }
    }

    const total = layerCodepoints.length;
    const coverage = total > 0 ? ((replaced / total) * 100).toFixed(1) : '0.0';

    return {
      total,
      replaced,
      skipped,
      failed,
      coverage: `${coverage}%`
    };
  }

  /**
   * 获取层级对应的 codepoints
   * @param {string} layer - 层级
   * @returns {Array<number>} codepoints
   */
  static getLayerCodepoints(layer) {
    const L1_CHARS = [
      // 字母数字
      ...Array.from('ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789').map(c => c.codePointAt(0)),
      // 基础运算符
      0x002B, 0x002D, 0x003D, 0x00D7, 0x00F7, 0x003C, 0x003E, 0x2264, 0x2265
    ];

    const L2_CHARS = [
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

    const L3_CHARS = [
      0x0028, 0x0029, // ( )
      0x005B, 0x005D, // [ ]
      0x007B, 0x007D, // { }
      0x2308, 0x2309, // ⌈ ⌉
      0x230A, 0x230B, // ⌊ ⌋
      0x221A, // √
      0x222B, 0x222C, 0x222D, 0x222E, 0x222F, 0x2230, // ∫∬∭∮∯∰
      0x2211, 0x220F, 0x2210, 0x22C0, 0x22C1, 0x22C2, 0x22C3, // ∑∏∐⋀⋁⋂⋃
      0x2190, 0x2192, 0x2194, 0x21D0, 0x21D2, 0x21D4 // ←→↔⇐⇒⇔
    ];

    switch (layer) {
      case 'l1':
        return L1_CHARS;
      case 'l2':
        return L2_CHARS;
      case 'l3':
        return L3_CHARS;
      default:
        return [];
    }
  }

  /**
   * 生成风险警告
   * @param {Object} capabilities - 字体能力
   * @param {Object} layerStats - 层级统计
   * @returns {Array<string>} 风险列表
   */
  static generateRiskWarnings(capabilities, layerStats) {
    const risks = [];

    // L1 覆盖率低
    if (parseFloat(layerStats.l1.coverage) < 95) {
      risks.push('⚠️ L1 coverage is low. Some basic characters may not render correctly.');
    }

    // L2 覆盖率低
    if (parseFloat(layerStats.l2.coverage) < 70) {
      risks.push('⚠️ L2 coverage is low. Many extended math symbols will use MathJax defaults.');
    }

    // L3 替换启用但覆盖率低
    if (capabilities.l3ReplacementAllowed && parseFloat(layerStats.l3.coverage) < 80) {
      risks.push('⚠️ L3 replacement enabled but coverage is low. Some stretchy symbols may not work correctly.');
    }

    // L3 替换启用的一般风险
    if (capabilities.l3ReplacementAllowed) {
      risks.push('ℹ️ L3 replacement enabled. Ensure font has proper MATH table support.');
      risks.push('ℹ️ Path centering applied to L3 symbols. Visual regression testing recommended.');
    }

    return risks;
  }

  /**
   * 生成建议
   * @param {Object} capabilities - 字体能力
   * @param {Object} layerStats - 层级统计
   * @returns {Array<string>} 建议列表
   */
  static generateRecommendations(capabilities, layerStats) {
    const recommendations = [];

    // 完美情况
    if (capabilities.l3ReplacementAllowed && 
        parseFloat(layerStats.l1.coverage) >= 95 &&
        parseFloat(layerStats.l2.coverage) >= 70 &&
        parseFloat(layerStats.l3.coverage) >= 80) {
      recommendations.push('✅ Font has excellent math support. All features enabled.');
      recommendations.push('💡 Consider running regression tests to verify rendering quality.');
      return recommendations;
    }

    // L3 不允许
    if (!capabilities.l3ReplacementAllowed) {
      if (!capabilities.hasMATH) {
        recommendations.push('💡 Font does not have OpenType MATH table. L3 features will use MathJax defaults.');
        recommendations.push('💡 For full math support, consider using professional math fonts: STIX Two Math, Latin Modern Math, or Cambria Math.');
      } else {
        const l3Coverage = capabilities.l3Coverage?.overall?.coverage || '0%';
        recommendations.push(`💡 Font has MATH table but L3 coverage is insufficient (${l3Coverage}). L3 features will use MathJax defaults.`);
        recommendations.push('💡 Ensure font includes all required L3 target glyphs (brackets, radicals, integrals, large operators, arrows).');
      }
    }

    // L1/L2 覆盖率建议
    if (parseFloat(layerStats.l1.coverage) < 95) {
      recommendations.push('💡 Improve L1 coverage by ensuring font includes all basic alphanumeric characters and operators.');
    }

    if (parseFloat(layerStats.l2.coverage) < 70) {
      recommendations.push('💡 Improve L2 coverage by adding extended math symbols (summation, integral, set operators, etc.).');
    }

    return recommendations;
  }

  /**
   * 格式化报告为可读文本
   * @param {Object} report - 报告对象
   * @returns {string} 格式化文本
   */
  static formatReport(report) {
    let text = '\n📊 替换报告\n';
    text += '━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━\n\n';

    // 摘要
    text += '📈 分层统计:\n';
    text += `  L1 (基础): ${report.summary.l1.coverage} (${report.summary.l1.replaced}/${report.summary.l1.total})\n`;
    text += `  L2 (扩展): ${report.summary.l2.coverage} (${report.summary.l2.replaced}/${report.summary.l2.total})\n`;
    text += `  L3 (结构): ${report.summary.l3.coverage} (${report.summary.l3.replaced}/${report.summary.l3.total})\n\n`;

    // 跳过的 L3 符号
    if (report.skipped.l3.length > 0) {
      text += '⏭️ 跳过的 L3 符号:\n';
      report.skipped.l3.forEach(item => {
        text += `  - ${item.char} (${item.codepoint}): ${item.reason}\n`;
      });
      text += '\n';
    }

    // 风险
    if (report.risks.length > 0) {
      text += '⚠️ 风险提示:\n';
      report.risks.forEach(risk => {
        text += `  ${risk}\n`;
      });
      text += '\n';
    }

    // 建议
    if (report.recommendations.length > 0) {
      text += '💡 建议:\n';
      report.recommendations.forEach(rec => {
        text += `  ${rec}\n`;
      });
      text += '\n';
    }

    text += '━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━\n';

    return text;
  }
}
