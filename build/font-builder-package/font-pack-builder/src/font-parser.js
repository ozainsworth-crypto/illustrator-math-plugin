/**
 * FontParser - 字体文件解析器
 * 
 * 使用 opentype.js 加载和解析 TTF/OTF 字体文件
 */

import { readFileSync } from 'fs';
import opentypeModule from 'opentype.js';

// Handle both default and named exports
const opentype = opentypeModule.default || opentypeModule;

export class FontParser {
  constructor(fontPath) {
    this.fontPath = fontPath;
    this.font = null;
  }

  /**
   * 加载字体文件
   * @returns {Promise<Object>} 字体对象
   */
  async load() {
    try {
      const buffer = readFileSync(this.fontPath);
      this.font = opentype.parse(buffer.buffer);
      return this.font;
    } catch (error) {
      throw new Error(`字体文件解析失败: ${error.message}`);
    }
  }

  /**
   * 提取字体元数据
   * @returns {Object} 元数据对象
   */
  getMetadata() {
    if (!this.font) {
      throw new Error('字体尚未加载，请先调用 load()');
    }

    const names = this.font.names;
    
    return {
      family: this.getFontFamily(names),
      fullName: this.getFontName(names, 'fullName'),
      postScriptName: this.getFontName(names, 'postScriptName'),
      version: this.getFontName(names, 'version'),
      format: this.fontPath.endsWith('.otf') ? 'otf' : 'ttf',
      unitsPerEm: this.font.unitsPerEm,
      ascender: this.font.ascender,
      descender: this.font.descender,
      numGlyphs: this.font.numGlyphs
    };
  }

  /**
   * 获取字体族名称
   */
  getFontFamily(names) {
    // 优先使用英文名称
    return names.fontFamily?.en || 
           names.fontFamily?.['zh-CN'] || 
           names.fontFamily || 
           'Unknown';
  }

  /**
   * 获取字体名称
   */
  getFontName(names, key) {
    if (!names[key]) return '';
    return names[key].en || names[key]['zh-CN'] || names[key] || '';
  }

  /**
   * 验证字体文件有效性
   * @returns {Object} 验证结果
   */
  validate() {
    if (!this.font) {
      throw new Error('字体尚未加载，请先调用 load()');
    }

    const issues = [];

    // 检查必要的表
    if (!this.font.tables.cmap) {
      issues.push('缺少 cmap 表（字符映射表）');
    }

    if (!this.font.tables.glyf && !this.font.tables.CFF) {
      issues.push('缺少 glyf 或 CFF 表（字形轮廓表）');
    }

    if (!this.font.tables.head) {
      issues.push('缺少 head 表（字体头表）');
    }

    if (!this.font.tables.hhea) {
      issues.push('缺少 hhea 表（水平度量表）');
    }

    if (!this.font.tables.hmtx) {
      issues.push('缺少 hmtx 表（水平度量数据表）');
    }

    return {
      valid: issues.length === 0,
      issues
    };
  }

  /**
   * 获取字体对象（供其他模块使用）
   */
  getFont() {
    if (!this.font) {
      throw new Error('字体尚未加载，请先调用 load()');
    }
    return this.font;
  }
}
