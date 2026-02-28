/**
 * MetricsCalculator - 字体度量计算器
 * 
 * 计算 MathJax fontdata 所需的字体度量信息
 */

export class MetricsCalculator {
  /**
   * 计算完整的 metrics
   * @param {Object} glyph - opentype.js glyph 对象
   * @param {Object} font - opentype.js font 对象
   * @returns {Object} metrics 对象
   */
  static calculate(glyph, font) {
    const unitsPerEm = font.unitsPerEm || 1000;
    const ascender = font.ascender || 0;
    const descender = font.descender || 0;

    // 1. Advance width（字符宽度）
    const advanceWidth = this.calculateAdvanceWidth(glyph, unitsPerEm);

    // 2. Height（字符高度）
    const height = this.calculateHeight(glyph, ascender, unitsPerEm);

    // 3. Depth（基线以下深度）
    const depth = this.calculateDepth(glyph, descender, unitsPerEm);

    // 4. Italic correction（斜体修正）
    const italicCorrection = this.calculateItalicCorrection(glyph, unitsPerEm);

    // 5. Skew（倾斜）
    const skew = 0; // 大多数情况下为 0

    return {
      advanceWidth,
      height,
      depth,
      italicCorrection,
      skew
    };
  }

  /**
   * 计算 advance width
   * @param {Object} glyph - glyph 对象
   * @param {number} unitsPerEm - 字体的 unitsPerEm
   * @returns {number} advance width（归一化到 1000 单位）
   */
  static calculateAdvanceWidth(glyph, unitsPerEm) {
    const rawWidth = glyph.advanceWidth || 0;
    // 归一化到 1000 单位（MathJax 标准）
    return Math.round((rawWidth / unitsPerEm) * 1000);
  }

  /**
   * 计算 height（基线以上高度）
   * @param {Object} glyph - glyph 对象
   * @param {number} ascender - 字体的 ascender
   * @param {number} unitsPerEm - 字体的 unitsPerEm
   * @returns {number} height（归一化到 1000 单位）
   */
  static calculateHeight(glyph, ascender, unitsPerEm) {
    const bbox = glyph.getBoundingBox();
    const yMax = bbox.y2 || 0;
    
    // 如果 yMax 为 0，使用 ascender
    const rawHeight = yMax > 0 ? yMax : ascender;
    
    // 归一化到 1000 单位
    return Math.round((rawHeight / unitsPerEm) * 1000);
  }

  /**
   * 计算 depth（基线以下深度）
   * @param {Object} glyph - glyph 对象
   * @param {number} descender - 字体的 descender
   * @param {number} unitsPerEm - 字体的 unitsPerEm
   * @returns {number} depth（归一化到 1000 单位，正值）
   */
  static calculateDepth(glyph, descender, unitsPerEm) {
    const bbox = glyph.getBoundingBox();
    const yMin = bbox.y1 || 0;
    
    // depth 是基线以下的距离，应该是正值
    const rawDepth = yMin < 0 ? Math.abs(yMin) : 0;
    
    // 归一化到 1000 单位
    return Math.round((rawDepth / unitsPerEm) * 1000);
  }

  /**
   * 计算 italic correction
   * @param {Object} glyph - glyph 对象
   * @param {number} unitsPerEm - 字体的 unitsPerEm
   * @returns {number} italic correction（归一化到 1000 单位）
   */
  static calculateItalicCorrection(glyph, unitsPerEm) {
    // Italic correction 通常用于斜体字符
    // 对于大多数字符，可以设为 0
    // 如果需要更精确的计算，可以基于 glyph 的倾斜角度
    
    const bbox = glyph.getBoundingBox();
    const advanceWidth = glyph.advanceWidth || 0;
    const xMax = bbox.x2 || 0;
    
    // 如果字符右边界超出 advance width，计算差值
    const rawCorrection = xMax > advanceWidth ? xMax - advanceWidth : 0;
    
    // 归一化到 1000 单位
    return Math.round((rawCorrection / unitsPerEm) * 1000);
  }

  /**
   * 验证 metrics 有效性
   * @param {Object} metrics - metrics 对象
   * @returns {boolean} 是否有效
   */
  static isValid(metrics) {
    if (!metrics || typeof metrics !== 'object') {
      return false;
    }

    // 检查必要的字段
    const requiredFields = ['advanceWidth', 'height', 'depth'];
    for (const field of requiredFields) {
      if (typeof metrics[field] !== 'number' || isNaN(metrics[field])) {
        return false;
      }
    }

    // 检查值的合理性
    if (metrics.advanceWidth < 0 || metrics.height < 0 || metrics.depth < 0) {
      return false;
    }

    return true;
  }
}
