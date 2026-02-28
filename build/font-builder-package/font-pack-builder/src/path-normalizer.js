/**
 * PathNormalizer - SVG Path 归一化器
 * 
 * 将 opentype.js 的 path 转换为 MathJax fontdata 格式的 SVG path
 * 
 * CRITICAL: MathJax expects paths in a specific coordinate system:
 * 1. Scaled to 1000 units (regardless of original font unitsPerEm)
 * 2. Y-axis flipped (font coordinates are Y-up, SVG is Y-down)
 */

export class PathNormalizer {
  /**
   * 归一化 SVG path 字符串
   * @param {string} pathData - 原始 SVG path 数据
   * @param {Object} options - 归一化选项
   * @param {number} options.unitsPerEm - 字体的 unitsPerEm（必需，用于缩放到 1000 单位）
   * @param {number} options.precision - 保留小数位数（默认 1）
   * @returns {string} 归一化后的 path 字符串
   */
  static normalize(pathData, options = {}) {
    const {
      unitsPerEm = 1000,       // 字体的 unitsPerEm
      precision = 1            // 保留小数位数（与 gate3a 一致）
    } = options;

    if (!pathData || typeof pathData !== 'string') {
      return '';
    }

    // 计算缩放因子：目标是 1000 单位
    const scale = 1000 / unitsPerEm;

    // 应用缩放和 Y 轴翻转（与 gate3a-verify.html 的 scaleAndFlipPath 一致）
    const normalized = this.scaleAndFlipPath(pathData, scale, precision);

    return normalized;
  }

  /**
   * 缩放并翻转 Y 轴（与 gate3a-verify.html 的实现一致）
   * @param {string} pathData - 原始 path 数据
   * @param {number} scale - 缩放因子
   * @param {number} precision - 小数精度
   * @returns {string} 转换后的 path
   */
  static scaleAndFlipPath(pathData, scale, precision) {
    return pathData.replace(/([MLHVCSQTAZmlhvcsqtaz])([^MLHVCSQTAZmlhvcsqtaz]*)/g, (match, cmd, coords) => {
      const coordStr = coords.trim();
      if (!coordStr) return cmd;
      
      // 正确解析负数：匹配可选的负号 + 数字 + 可选的小数部分
      const nums = coordStr.match(/-?\d+\.?\d*/g);
      if (!nums || nums.length === 0) return cmd;
      
      const numbers = nums.map(Number);
      const upperCmd = cmd.toUpperCase();
      
      // 根据命令类型处理坐标
      if (upperCmd === 'H') {
        // 水平线：只缩放 X
        return cmd + ' ' + numbers.map(n => (n * scale).toFixed(precision)).join(' ');
      } else if (upperCmd === 'V') {
        // 垂直线：缩放并翻转 Y
        return cmd + ' ' + numbers.map(n => (-n * scale).toFixed(precision)).join(' ');
      } else if (upperCmd === 'Z') {
        // 闭合路径：无坐标
        return cmd;
      } else if (upperCmd === 'M' || upperCmd === 'L' || upperCmd === 'T') {
        // MoveTo, LineTo, SmoothQuadratic：(x,y) 对
        const flipped = [];
        for (let i = 0; i < numbers.length; i += 2) {
          flipped.push((numbers[i] * scale).toFixed(precision));
          flipped.push((-numbers[i + 1] * scale).toFixed(precision));
        }
        return cmd + ' ' + flipped.join(' ');
      } else if (upperCmd === 'C') {
        // CubicBezier：(x1,y1,x2,y2,x,y)
        const flipped = [];
        for (let i = 0; i < numbers.length; i += 2) {
          flipped.push((numbers[i] * scale).toFixed(precision));
          flipped.push((-numbers[i + 1] * scale).toFixed(precision));
        }
        return cmd + ' ' + flipped.join(' ');
      } else if (upperCmd === 'S' || upperCmd === 'Q') {
        // SmoothCubic, Quadratic：(x1,y1,x,y)
        const flipped = [];
        for (let i = 0; i < numbers.length; i += 2) {
          flipped.push((numbers[i] * scale).toFixed(precision));
          flipped.push((-numbers[i + 1] * scale).toFixed(precision));
        }
        return cmd + ' ' + flipped.join(' ');
      } else if (upperCmd === 'A') {
        // Arc：(rx,ry,rotation,large-arc,sweep,x,y)
        const flipped = [];
        for (let i = 0; i < numbers.length; i += 7) {
          flipped.push((numbers[i] * scale).toFixed(precision));      // rx
          flipped.push((numbers[i + 1] * scale).toFixed(precision));  // ry
          flipped.push(numbers[i + 2].toFixed(precision));            // rotation
          flipped.push(numbers[i + 3].toString());                    // large-arc-flag
          flipped.push(numbers[i + 4].toString());                    // sweep-flag
          flipped.push((numbers[i + 5] * scale).toFixed(precision));  // x
          flipped.push((-numbers[i + 6] * scale).toFixed(precision)); // y (翻转)
        }
        return cmd + ' ' + flipped.join(' ');
      } else {
        // 默认：缩放并翻转奇数索引（y 坐标）
        const flipped = [];
        for (let i = 0; i < numbers.length; i += 2) {
          flipped.push((numbers[i] * scale).toFixed(precision));
          flipped.push((-numbers[i + 1] * scale).toFixed(precision));
        }
        return cmd + ' ' + flipped.join(' ');
      }
    });
  }


  /**
   * 验证 path 数据有效性
   * @param {string} pathData - path 数据
   * @returns {boolean} 是否有效
   */
  static isValid(pathData) {
    if (!pathData || typeof pathData !== 'string') {
      return false;
    }

    // 检查是否包含有效的 SVG path 命令
    const hasValidCommands = /[MLHVCSQTAZ]/i.test(pathData);
    
    // 检查是否包含数字
    const hasNumbers = /\d/.test(pathData);

    return hasValidCommands && hasNumbers;
  }
}
