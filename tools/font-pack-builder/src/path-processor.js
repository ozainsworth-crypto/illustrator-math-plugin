/**
 * PathProcessor - SVG Path 处理器
 * 
 * 提供 path centering 和 path 平移功能
 * 与 PathNormalizer 配合使用
 */

import { PathNormalizer } from './path-normalizer.js';

export class PathProcessor {
  /**
   * 归一化 path（委托给 PathNormalizer）
   * @param {string} path - 原始 SVG path
   * @param {Object} options - 归一化选项
   * @returns {string} 归一化后的 path
   */
  static normalize(path, options) {
    return PathNormalizer.normalize(path, options);
  }

  /**
   * 应用 path centering
   * @param {string} path - 归一化后的 path（1000 units）
   * @param {Object} bbox - bounding box（1000 units）
   * @param {number} advanceWidth - advance width（1000 units）
   * @returns {Object}
   * {
   *   path: string,           // 居中后的 path
   *   dx: number,             // X 方向偏移量
   *   bboxCenter: number,     // bbox 中心 X 坐标
   *   advanceCenter: number   // advance 中心 X 坐标
   * }
   */
  static centerPath(path, bbox, advanceWidth) {
    // 计算 bbox 中心
    const bboxCenter = (bbox.xMin + bbox.xMax) / 2;
    
    // 计算 advance 中心
    const advanceCenter = advanceWidth / 2;
    
    // 计算偏移量
    const dx = advanceCenter - bboxCenter;
    
    // 阈值检查：如果偏移量很小（< 10 units），不修正
    if (Math.abs(dx) < 10) {
      return {
        path,
        dx: 0,
        bboxCenter,
        advanceCenter,
        applied: false
      };
    }
    
    // 应用平移
    const centeredPath = this.translatePath(path, dx, 0);
    
    return {
      path: centeredPath,
      dx,
      bboxCenter,
      advanceCenter,
      applied: true
    };
  }

  /**
   * 平移 path
   * @param {string} path - SVG path
   * @param {number} dx - X 方向偏移
   * @param {number} dy - Y 方向偏移
   * @returns {string} 平移后的 path
   */
  static translatePath(path, dx, dy) {
    if (!path || typeof path !== 'string') {
      return path;
    }
    
    // 如果偏移量为 0，直接返回
    if (dx === 0 && dy === 0) {
      return path;
    }
    
    // 使用正则表达式替换坐标
    // 匹配 SVG path 命令和坐标
    return path.replace(/([MLHVCSQTAZmlhvcsqtaz])([^MLHVCSQTAZmlhvcsqtaz]*)/g, (match, cmd, coords) => {
      const coordStr = coords.trim();
      if (!coordStr) return cmd;
      
      // 解析数字（包括负数）
      const nums = coordStr.match(/-?\d+\.?\d*/g);
      if (!nums || nums.length === 0) return cmd;
      
      const numbers = nums.map(Number);
      const upperCmd = cmd.toUpperCase();
      
      // 根据命令类型处理坐标
      if (upperCmd === 'H') {
        // 水平线：只平移 X
        return cmd + ' ' + numbers.map(n => (n + dx).toFixed(1)).join(' ');
      } else if (upperCmd === 'V') {
        // 垂直线：只平移 Y
        return cmd + ' ' + numbers.map(n => (n + dy).toFixed(1)).join(' ');
      } else if (upperCmd === 'Z') {
        // 闭合路径：无坐标
        return cmd;
      } else if (upperCmd === 'M' || upperCmd === 'L' || upperCmd === 'T') {
        // MoveTo, LineTo, SmoothQuadratic：(x,y) 对
        const translated = [];
        for (let i = 0; i < numbers.length; i += 2) {
          translated.push((numbers[i] + dx).toFixed(1));
          translated.push((numbers[i + 1] + dy).toFixed(1));
        }
        return cmd + ' ' + translated.join(' ');
      } else if (upperCmd === 'C') {
        // CubicBezier：(x1,y1,x2,y2,x,y)
        const translated = [];
        for (let i = 0; i < numbers.length; i += 2) {
          translated.push((numbers[i] + dx).toFixed(1));
          translated.push((numbers[i + 1] + dy).toFixed(1));
        }
        return cmd + ' ' + translated.join(' ');
      } else if (upperCmd === 'S' || upperCmd === 'Q') {
        // SmoothCubic, Quadratic：(x1,y1,x,y)
        const translated = [];
        for (let i = 0; i < numbers.length; i += 2) {
          translated.push((numbers[i] + dx).toFixed(1));
          translated.push((numbers[i + 1] + dy).toFixed(1));
        }
        return cmd + ' ' + translated.join(' ');
      } else if (upperCmd === 'A') {
        // Arc：(rx,ry,rotation,large-arc,sweep,x,y)
        const translated = [];
        for (let i = 0; i < numbers.length; i += 7) {
          translated.push(numbers[i].toFixed(1));                    // rx (不平移)
          translated.push(numbers[i + 1].toFixed(1));                // ry (不平移)
          translated.push(numbers[i + 2].toFixed(1));                // rotation (不平移)
          translated.push(numbers[i + 3].toString());                // large-arc-flag
          translated.push(numbers[i + 4].toString());                // sweep-flag
          translated.push((numbers[i + 5] + dx).toFixed(1));         // x (平移)
          translated.push((numbers[i + 6] + dy).toFixed(1));         // y (平移)
        }
        return cmd + ' ' + translated.join(' ');
      } else {
        // 默认：平移所有坐标对
        const translated = [];
        for (let i = 0; i < numbers.length; i += 2) {
          translated.push((numbers[i] + dx).toFixed(1));
          translated.push((numbers[i + 1] + dy).toFixed(1));
        }
        return cmd + ' ' + translated.join(' ');
      }
    });
  }

  /**
   * 验证 path 有效性（委托给 PathNormalizer）
   * @param {string} path - SVG path
   * @returns {boolean}
   */
  static isValid(path) {
    return PathNormalizer.isValid(path);
  }
}
