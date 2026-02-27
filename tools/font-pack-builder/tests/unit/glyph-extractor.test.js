/**
 * GlyphExtractor 单元测试
 */

import { describe, it, expect, beforeAll } from 'vitest';
import { GlyphExtractor } from '../../src/glyph-extractor.js';
import { FontParser } from '../../src/font-parser.js';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const TEST_FONT_PATH = path.resolve(__dirname, '../../../../../puzzlettf1011.ttf');

describe('GlyphExtractor', () => {
  let font;

  beforeAll(async () => {
    const parser = new FontParser(TEST_FONT_PATH);
    await parser.load();
    font = parser.getFont();
  });

  it('应该成功提取单个字符的 glyph', () => {
    const extractor = new GlyphExtractor(font);
    const result = extractor.extractGlyph('A');
    
    expect(result.success).toBe(true);
    expect(result.data).toBeDefined();
    expect(result.data.char).toBe('A');
    expect(result.data.codepoint).toBe(0x0041);
    expect(result.data.path).toBeDefined();
    expect(result.data.metrics).toBeDefined();
  });

  it('应该提取完整的 glyph 数据结构', () => {
    const extractor = new GlyphExtractor(font);
    const result = extractor.extractGlyph('A');
    
    expect(result.data).toHaveProperty('char');
    expect(result.data).toHaveProperty('codepoint');
    expect(result.data).toHaveProperty('glyphIndex');
    expect(result.data).toHaveProperty('path');
    expect(result.data).toHaveProperty('metrics');
    expect(result.data).toHaveProperty('bbox');
    expect(result.data).toHaveProperty('keepOriginalAdvance');
  });

  it('应该正确提取 metrics 数据', () => {
    const extractor = new GlyphExtractor(font);
    const result = extractor.extractGlyph('A');
    
    expect(result.data.metrics).toHaveProperty('advanceWidth');
    expect(result.data.metrics).toHaveProperty('height');
    expect(result.data.metrics).toHaveProperty('depth');
    expect(result.data.metrics).toHaveProperty('italicCorrection');
    expect(result.data.metrics).toHaveProperty('skew');
    
    expect(typeof result.data.metrics.advanceWidth).toBe('number');
    expect(typeof result.data.metrics.height).toBe('number');
    expect(typeof result.data.metrics.depth).toBe('number');
  });

  it('应该正确提取 bbox 数据', () => {
    const extractor = new GlyphExtractor(font);
    const result = extractor.extractGlyph('A');
    
    expect(result.data.bbox).toHaveProperty('xMin');
    expect(result.data.bbox).toHaveProperty('yMin');
    expect(result.data.bbox).toHaveProperty('xMax');
    expect(result.data.bbox).toHaveProperty('yMax');
    
    expect(typeof result.data.bbox.xMin).toBe('number');
    expect(typeof result.data.bbox.yMin).toBe('number');
    expect(typeof result.data.bbox.xMax).toBe('number');
    expect(typeof result.data.bbox.yMax).toBe('number');
  });

  it('应该为运算符设置 keepOriginalAdvance', () => {
    const extractor = new GlyphExtractor(font);
    const plusResult = extractor.extractGlyph('+');
    const minusResult = extractor.extractGlyph('-');
    
    if (plusResult.success) {
      expect(plusResult.data.keepOriginalAdvance).toBe(true);
    }
    
    if (minusResult.success) {
      expect(minusResult.data.keepOriginalAdvance).toBe(true);
    }
  });

  it('应该为字母数字设置 keepOriginalAdvance 为 false', () => {
    const extractor = new GlyphExtractor(font);
    const result = extractor.extractGlyph('A');
    
    expect(result.data.keepOriginalAdvance).toBe(false);
  });

  it('应该处理不存在的字符', () => {
    const extractor = new GlyphExtractor(font);
    const result = extractor.extractGlyph('😀'); // emoji 可能不存在
    
    // 可能成功或失败，取决于字体
    expect(result).toHaveProperty('success');
    if (!result.success) {
      expect(result.reason).toBeDefined();
    }
  });

  it('应该提取多个字符', () => {
    const extractor = new GlyphExtractor(font);
    const result = extractor.extract();
    
    expect(result).toHaveProperty('glyphs');
    expect(result).toHaveProperty('failures');
    expect(typeof result.glyphs).toBe('object');
    expect(Array.isArray(result.failures)).toBe(true);
  });

  it('应该正确解析 codepoint 字符串', () => {
    const extractor = new GlyphExtractor(font);
    
    expect(extractor.parseCodepoint('0x0041')).toBe(0x0041);
    expect(extractor.parseCodepoint('0X0041')).toBe(0x0041);
    expect(extractor.parseCodepoint('65')).toBe(65);
    expect(extractor.parseCodepoint(65)).toBe(65);
  });

  it('应该判断 L3 符号', () => {
    const extractor = new GlyphExtractor(font);
    
    expect(extractor.isL3Symbol(0x0028)).toBe(true); // (
    expect(extractor.isL3Symbol(0x0029)).toBe(true); // )
    expect(extractor.isL3Symbol(0x221A)).toBe(true); // √
    expect(extractor.isL3Symbol(0x222B)).toBe(true); // ∫
    expect(extractor.isL3Symbol(0x0041)).toBe(false); // A
  });

  it('应该生成字符集统计信息', () => {
    const extractor = new GlyphExtractor(font);
    const result = extractor.extract();
    const stats = extractor.getStatistics(result.glyphs);
    
    expect(stats).toHaveProperty('total');
    expect(stats).toHaveProperty('uppercase');
    expect(stats).toHaveProperty('lowercase');
    expect(stats).toHaveProperty('digits');
    
    expect(typeof stats.total).toBe('number');
    expect(typeof stats.uppercase).toBe('number');
    expect(typeof stats.lowercase).toBe('number');
    expect(typeof stats.digits).toBe('number');
  });
});
