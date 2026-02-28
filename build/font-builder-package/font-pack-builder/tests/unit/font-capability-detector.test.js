/**
 * FontCapabilityDetector 单元测试
 */

import { describe, it, expect, beforeAll } from 'vitest';
import { FontCapabilityDetector } from '../../src/font-capability-detector.js';
import { FontParser } from '../../src/font-parser.js';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const TEST_FONT_PATH = path.resolve(__dirname, '../../../../../puzzlettf1011.ttf');

describe('FontCapabilityDetector', () => {
  let font;
  let detector;

  beforeAll(async () => {
    const parser = new FontParser(TEST_FONT_PATH);
    await parser.load();
    font = parser.getFont();
    detector = new FontCapabilityDetector(font, TEST_FONT_PATH);
  });

  it('应该执行完整的能力检测', () => {
    const capabilities = detector.detect();
    
    expect(capabilities).toBeDefined();
    expect(capabilities).toHaveProperty('hasMATH');
    expect(capabilities).toHaveProperty('hasVariants');
    expect(capabilities).toHaveProperty('hasAssembly');
    expect(capabilities).toHaveProperty('coverage');
    expect(capabilities).toHaveProperty('timestamp');
  });

  it('应该检测 MATH table', () => {
    const mathTable = detector.detectMATHTable();
    
    expect(mathTable).toBeDefined();
    expect(mathTable).toHaveProperty('hasMATH');
    expect(typeof mathTable.hasMATH).toBe('boolean');
  });

  it('应该检测 OpenType 表列表', () => {
    const tables = detector.detectOpenTypeTables();
    
    expect(Array.isArray(tables)).toBe(true);
    // 应该至少包含一些基础表
    if (tables.length > 0) {
      expect(tables.some(t => ['cmap', 'glyf', 'head', 'hhea', 'hmtx', 'loca', 'maxp', 'name', 'post'].includes(t))).toBe(true);
    }
  });

  it('应该检测 Variants 能力', () => {
    const variants = detector.detectVariants();
    
    expect(variants).toBeDefined();
    expect(variants).toHaveProperty('hasVariants');
    expect(variants).toHaveProperty('method');
    expect(typeof variants.hasVariants).toBe('boolean');
  });

  it('应该检测 Assembly 能力', () => {
    const assembly = detector.detectAssembly();
    
    expect(assembly).toBeDefined();
    expect(assembly).toHaveProperty('hasAssembly');
    expect(assembly).toHaveProperty('method');
    expect(typeof assembly.hasAssembly).toBe('boolean');
  });

  it('应该检测 Glyph Coverage', () => {
    const coverage = detector.detectCoverage();
    
    expect(coverage).toBeDefined();
    expect(coverage).toHaveProperty('l1');
    expect(coverage).toHaveProperty('l2');
    expect(coverage).toHaveProperty('l3');
    
    expect(typeof coverage.l1).toBe('number');
    expect(typeof coverage.l2).toBe('number');
    expect(typeof coverage.l3).toBe('number');
    
    expect(coverage.l1).toBeGreaterThanOrEqual(0);
    expect(coverage.l1).toBeLessThanOrEqual(100);
  });

  it('应该检测 L3 目标符号覆盖率', () => {
    const l3Coverage = detector.detectL3Coverage();
    
    expect(l3Coverage).toBeDefined();
    expect(l3Coverage).toHaveProperty('byCategory');
    expect(l3Coverage).toHaveProperty('overall');
    
    expect(l3Coverage.overall).toHaveProperty('total');
    expect(l3Coverage.overall).toHaveProperty('available');
    expect(l3Coverage.overall).toHaveProperty('coverage');
  });

  it('应该计算字符覆盖率', () => {
    const testChars = ['A', 'B', 'C', '1', '2', '3'];
    const coverage = detector.calculateCoverage(testChars);
    
    expect(typeof coverage).toBe('number');
    expect(coverage).toBeGreaterThanOrEqual(0);
    expect(coverage).toBeLessThanOrEqual(100);
  });

  it('应该生成能力摘要', () => {
    detector.detect();
    const summary = detector.generateSummary();
    
    expect(typeof summary).toBe('string');
    expect(summary.length).toBeGreaterThan(0);
  });

  it('应该生成建议', () => {
    detector.detect();
    const recommendations = detector.generateRecommendations();
    
    expect(Array.isArray(recommendations)).toBe(true);
  });

  it('应该获取能力检测结果', () => {
    detector.detect();
    const capabilities = detector.getCapabilities();
    
    expect(capabilities).toBeDefined();
    expect(capabilities).toHaveProperty('hasMATH');
  });

  it('应该判断是否允许 L3 替换', () => {
    const mathTable = { hasMATH: true, version: '1.0' };
    const l3Coverage = {
      overall: { coverage: '85%', total: 20, available: 17 }
    };
    
    const allowed = detector.shouldAllowL3Replacement(mathTable, l3Coverage);
    expect(typeof allowed).toBe('boolean');
  });

  it('应该获取 L3 替换原因', () => {
    const mathTable = { hasMATH: true, version: '1.0' };
    const l3Coverage = {
      overall: { coverage: '85%', total: 20, available: 17 }
    };
    
    const reason = detector.getL3ReplacementReason(mathTable, l3Coverage);
    expect(typeof reason).toBe('string');
    expect(reason.length).toBeGreaterThan(0);
  });

  it('应该处理没有 MATH table 的情况', () => {
    const mathTable = { hasMATH: false, version: null };
    const l3Coverage = {
      overall: { coverage: '85%', total: 20, available: 17 }
    };
    
    const allowed = detector.shouldAllowL3Replacement(mathTable, l3Coverage);
    expect(allowed).toBe(false);
    
    const reason = detector.getL3ReplacementReason(mathTable, l3Coverage);
    expect(reason).toContain('MATH table');
  });

  it('应该处理低 L3 覆盖率的情况', () => {
    const mathTable = { hasMATH: true, version: '1.0' };
    const l3Coverage = {
      overall: { coverage: '50%', total: 20, available: 10 }
    };
    
    const allowed = detector.shouldAllowL3Replacement(mathTable, l3Coverage);
    expect(allowed).toBe(false);
    
    const reason = detector.getL3ReplacementReason(mathTable, l3Coverage);
    expect(reason).toContain('coverage insufficient');
  });
});
