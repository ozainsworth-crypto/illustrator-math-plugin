/**
 * MetricsCalculator 单元测试
 */

import { describe, it, expect, beforeAll } from 'vitest';
import { MetricsCalculator } from '../../src/metrics-calculator.js';
import { FontParser } from '../../src/font-parser.js';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const TEST_FONT_PATH = path.resolve(__dirname, '../../../../../puzzlettf1011.ttf');

describe('MetricsCalculator', () => {
  let font;
  let glyphA;

  beforeAll(async () => {
    const parser = new FontParser(TEST_FONT_PATH);
    await parser.load();
    font = parser.getFont();
    glyphA = font.charToGlyph('A');
  });

  it('应该计算完整的 metrics', () => {
    const metrics = MetricsCalculator.calculate(glyphA, font);
    
    expect(metrics).toBeDefined();
    expect(metrics).toHaveProperty('advanceWidth');
    expect(metrics).toHaveProperty('height');
    expect(metrics).toHaveProperty('depth');
    expect(metrics).toHaveProperty('italicCorrection');
    expect(metrics).toHaveProperty('skew');
  });

  it('应该计算 advanceWidth', () => {
    const advanceWidth = MetricsCalculator.calculateAdvanceWidth(glyphA, font.unitsPerEm);
    
    expect(typeof advanceWidth).toBe('number');
    expect(advanceWidth).toBeGreaterThan(0);
    expect(advanceWidth).toBeLessThan(2000); // 合理范围
  });

  it('应该计算 height', () => {
    const height = MetricsCalculator.calculateHeight(glyphA, font.ascender, font.unitsPerEm);
    
    expect(typeof height).toBe('number');
    expect(height).toBeGreaterThanOrEqual(0);
  });

  it('应该计算 depth', () => {
    const depth = MetricsCalculator.calculateDepth(glyphA, font.descender, font.unitsPerEm);
    
    expect(typeof depth).toBe('number');
    expect(depth).toBeGreaterThanOrEqual(0);
  });

  it('应该计算 italicCorrection', () => {
    const italicCorrection = MetricsCalculator.calculateItalicCorrection(glyphA, font.unitsPerEm);
    
    expect(typeof italicCorrection).toBe('number');
    expect(italicCorrection).toBeGreaterThanOrEqual(0);
  });

  it('应该验证 metrics 有效性', () => {
    const validMetrics = {
      advanceWidth: 500,
      height: 700,
      depth: 0,
      italicCorrection: 0,
      skew: 0
    };
    
    expect(MetricsCalculator.isValid(validMetrics)).toBe(true);
  });

  it('应该拒绝无效的 metrics', () => {
    expect(MetricsCalculator.isValid(null)).toBe(false);
    expect(MetricsCalculator.isValid(undefined)).toBe(false);
    expect(MetricsCalculator.isValid({})).toBe(false);
    
    const invalidMetrics1 = {
      advanceWidth: -100, // 负值
      height: 700,
      depth: 0
    };
    expect(MetricsCalculator.isValid(invalidMetrics1)).toBe(false);
    
    const invalidMetrics2 = {
      advanceWidth: 'invalid', // 非数字
      height: 700,
      depth: 0
    };
    expect(MetricsCalculator.isValid(invalidMetrics2)).toBe(false);
  });

  it('应该归一化到 1000 单位', () => {
    const metrics = MetricsCalculator.calculate(glyphA, font);
    
    // 所有 metrics 应该在合理范围内（归一化到 1000 单位）
    expect(metrics.advanceWidth).toBeGreaterThan(0);
    expect(metrics.advanceWidth).toBeLessThan(2000);
    expect(metrics.height).toBeGreaterThanOrEqual(0);
    expect(metrics.height).toBeLessThan(2000);
    expect(metrics.depth).toBeGreaterThanOrEqual(0);
    expect(metrics.depth).toBeLessThan(1000);
  });

  it('应该处理不同字符的 metrics', () => {
    const glyphLowerA = font.charToGlyph('a');
    const glyphDigit = font.charToGlyph('1');
    
    const metricsA = MetricsCalculator.calculate(glyphA, font);
    const metricsLowerA = MetricsCalculator.calculate(glyphLowerA, font);
    const metricsDigit = MetricsCalculator.calculate(glyphDigit, font);
    
    // 大写字母通常比小写字母高
    expect(metricsA.height).toBeGreaterThanOrEqual(metricsLowerA.height);
    
    // 所有 metrics 都应该有效
    expect(MetricsCalculator.isValid(metricsA)).toBe(true);
    expect(MetricsCalculator.isValid(metricsLowerA)).toBe(true);
    expect(MetricsCalculator.isValid(metricsDigit)).toBe(true);
  });
});
