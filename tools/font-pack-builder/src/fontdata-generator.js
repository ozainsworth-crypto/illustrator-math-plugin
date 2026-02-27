/**
 * FontdataGenerator - MathJax fontdata 生成器
 * 
 * 将提取的 glyph 数据转换为 MathJax 兼容的 fontdata 格式
 */

import fs from 'fs/promises';
import path from 'path';

export class FontdataGenerator {
  /**
   * 生成 fontdata.js 文件
   * @param {Object} extractionResult - 提取结果 { glyphs, failures, fallbacks }
   * @param {string} outputPath - 输出文件路径
   * @param {Object} options - 生成选项
   * @returns {Promise<void>}
   */
  static async generate(extractionResult, outputPath, options = {}) {
    const {
      fontName = 'CustomFont',
      format = 'es6', // 'es6' or 'cjs'
      enablePathCentering = false,  // 可选的 path 居中修正
      baseFontdata = null  // MathJax base fontdata（用于 keepOriginalAdvance）
    } = options;

    // 支持旧的 API（直接传入 glyphs）
    const glyphs = extractionResult.glyphs || extractionResult;

    // 1. 转换 glyphs 为 MathJax fontdata 格式
    const fontdata = this.convertToFontdata(glyphs, { enablePathCentering, baseFontdata });

    // 2. 生成 JavaScript 代码
    const code = this.generateCode(fontdata, fontName, format);

    // 3. 写入文件
    await fs.writeFile(outputPath, code, 'utf-8');
  }

  /**
   * 转换 glyphs 为 MathJax fontdata 格式
   * @param {Object} glyphs - 提取的 glyphs
   * @param {Object} options - 转换选项
   * @returns {Object} fontdata 对象
   */
  static convertToFontdata(glyphs, options = {}) {
    const {
      enablePathCentering = false,  // 可选的 path 居中修正
      baseFontdata = null  // MathJax base fontdata（用于 keepOriginalAdvance）
    } = options;
    
    console.log('\n[FontdataGenerator] 转换 glyphs 为 fontdata...');
    console.log(`  - Path 居中修正: ${enablePathCentering ? '启用' : '禁用'}`);
    console.log(`  - Base fontdata: ${baseFontdata ? '已提供' : '未提供'}`);
    
    const fontdata = {};
    const centeringLog = [];
    const keepOriginalAdvanceLog = [];

    for (const [char, glyphData] of Object.entries(glyphs)) {
      const codepoint = glyphData.codepoint;
      
      let path = glyphData.path;
      let metrics = { ...glyphData.metrics };
      
      // 如果启用 path 居中修正且字符需要 keepOriginalAdvance
      if (enablePathCentering && glyphData.keepOriginalAdvance) {
        const result = this.centerPath(path, glyphData.bbox, metrics.advanceWidth);
        path = result.path;
        
        if (result.dx !== 0) {
          centeringLog.push({
            char,
            codepoint,
            dx: result.dx,
            bboxCenter: (glyphData.bbox.xMin + glyphData.bbox.xMax) / 2,
            advanceCenter: metrics.advanceWidth / 2
          });
        }
      }
      
      // 应用 keepOriginalAdvance 策略
      let advanceWidth = metrics.advanceWidth;
      if (glyphData.keepOriginalAdvance && baseFontdata && baseFontdata[codepoint]) {
        const baseAdvanceWidth = baseFontdata[codepoint].w;
        if (baseAdvanceWidth !== undefined) {
          advanceWidth = baseAdvanceWidth;
          keepOriginalAdvanceLog.push({
            char,
            codepoint,
            userAdvance: metrics.advanceWidth,
            baseAdvance: baseAdvanceWidth
          });
        }
      }
      
      // MathJax fontdata 格式
      fontdata[codepoint] = {
        c: codepoint,                              // codepoint
        w: advanceWidth,                           // width (可能来自 base fontdata)
        h: metrics.height,                         // height
        d: metrics.depth,                          // depth
        ic: metrics.italicCorrection,              // italic correction
        sk: metrics.skew || 0,                     // skew
        path: path                                 // SVG path
      };
    }

    // 详细日志：问题 1 验证
    if (enablePathCentering && centeringLog.length > 0) {
      console.log('\n  📌 问题 1: Path 居中修正应用');
      centeringLog.forEach(log => {
        console.log(`    - '${log.char}' (U+${log.codepoint.toString(16).toUpperCase().padStart(4, '0')}): dx=${log.dx.toFixed(1)}, bboxCenter=${log.bboxCenter.toFixed(1)}, advanceCenter=${log.advanceCenter.toFixed(1)}`);
      });
    } else if (enablePathCentering) {
      console.log('\n  📌 问题 1: Path 居中修正启用，但无字符需要修正（偏移量 < 10）');
    }

    // 详细日志：keepOriginalAdvance 策略
    if (keepOriginalAdvanceLog.length > 0) {
      console.log('\n  📌 KeepOriginalAdvance 策略应用');
      keepOriginalAdvanceLog.forEach(log => {
        console.log(`    - '${log.char}' (U+${log.codepoint.toString(16).toUpperCase().padStart(4, '0')}): userAdvance=${log.userAdvance.toFixed(1)} → baseAdvance=${log.baseAdvance.toFixed(1)}`);
      });
    }

    return fontdata;
  }
  
  /**
   * 将 path 居中到 advance width
   * @param {string} path - SVG path
   * @param {Object} bbox - bounding box
   * @param {number} advanceWidth - advance width (1000 单位)
   * @returns {Object} { path, dx }
   */
  static centerPath(path, bbox, advanceWidth) {
    // 计算 bbox 中心
    const bboxCenter = (bbox.xMin + bbox.xMax) / 2;
    
    // 计算 advance 中心
    const advanceCenter = advanceWidth / 2;
    
    // 计算需要的平移量
    const dx = advanceCenter - bboxCenter;
    
    // 如果平移量很小，不做修正
    if (Math.abs(dx) < 10) {  // 阈值 10 单位
      return { path, dx: 0 };
    }
    
    // 应用平移到 path
    const centeredPath = this.translatePath(path, dx, 0);
    
    return { path: centeredPath, dx };
  }
  
  /**
   * 平移 SVG path
   * @param {string} path - SVG path
   * @param {number} dx - X 方向平移
   * @param {number} dy - Y 方向平移
   * @returns {string} 平移后的 path
   */
  static translatePath(path, dx, dy) {
    if (dx === 0 && dy === 0) {
      return path;
    }
    
    // 简单的正则替换方式（适用于归一化后的 path）
    // 匹配所有数字（包括负数和小数）
    const numberRegex = /-?\d+\.?\d*/g;
    let isX = true;  // 交替处理 X 和 Y 坐标
    
    return path.replace(numberRegex, (match) => {
      const num = parseFloat(match);
      const translated = isX ? num + dx : num + dy;
      isX = !isX;
      return translated.toFixed(1);
    });
  }

  /**
   * 生成 JavaScript 代码
   * @param {Object} fontdata - fontdata 对象
   * @param {string} fontName - 字体名称
   * @param {string} format - 输出格式
   * @returns {string} JavaScript 代码
   */
  static generateCode(fontdata, fontName, format) {
    const dataStr = JSON.stringify(fontdata, null, 2);

    if (format === 'es6') {
      return `/**
 * MathJax fontdata for ${fontName}
 * Generated by Font Pack Builder
 */

export const fontdata = ${dataStr};
`;
    } else {
      // CommonJS format
      return `/**
 * MathJax fontdata for ${fontName}
 * Generated by Font Pack Builder
 */

module.exports = {
  fontdata: ${dataStr}
};
`;
    }
  }

  /**
   * 加载基础 fontdata 模板（如果提供）
   * @param {string} templatePath - 模板文件路径
   * @returns {Promise<Object>} 基础 fontdata
   */
  static async loadBaseFontdata(templatePath) {
    try {
      const content = await fs.readFile(templatePath, 'utf-8');
      
      // 尝试解析 JSON
      if (templatePath.endsWith('.json')) {
        return JSON.parse(content);
      }
      
      // 尝试解析 JavaScript 模块
      // 这里简化处理，实际可能需要更复杂的解析
      return {};
    } catch (error) {
      console.warn(`⚠️  无法加载基础 fontdata 模板: ${error.message}`);
      return {};
    }
  }

  /**
   * 合并自定义 fontdata 和基础 fontdata
   * @param {Object} customFontdata - 自定义 fontdata
   * @param {Object} baseFontdata - 基础 fontdata
   * @returns {Object} 合并后的 fontdata
   */
  static merge(customFontdata, baseFontdata) {
    // 自定义 fontdata 覆盖基础 fontdata
    return {
      ...baseFontdata,
      ...customFontdata
    };
  }
}
