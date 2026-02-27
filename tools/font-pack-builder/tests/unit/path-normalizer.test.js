/**
 * PathNormalizer 单元测试
 */

import { describe, it, expect } from 'vitest';
import { PathNormalizer } from '../../src/path-normalizer.js';

describe('PathNormalizer', () => {
  it('应该归一化简单的 path', () => {
    const path = 'M 100 200 L 300 400';
    const normalized = PathNormalizer.normalize(path, {
      unitsPerEm: 1000,
      precision: 1
    });
    
    expect(normalized).toBeDefined();
    expect(typeof normalized).toBe('string');
    expect(normalized.length).toBeGreaterThan(0);
  });

  it('应该处理负数坐标', () => {
    const path = 'M -100 -200 L 300 400';
    const normalized = PathNormalizer.normalize(path, {
      unitsPerEm: 1000,
      precision: 1
    });
    
    expect(normalized).toBeDefined();
    expect(normalized).toContain('-');
  });

  it('应该应用精度设置', () => {
    const path = 'M 100.123456 200.789012 L 300.456789 400.123456';
    
    const normalized1 = PathNormalizer.normalize(path, {
      unitsPerEm: 1000,
      precision: 1
    });
    
    const normalized2 = PathNormalizer.normalize(path, {
      unitsPerEm: 1000,
      precision: 2
    });
    
    expect(normalized1).toBeDefined();
    expect(normalized2).toBeDefined();
    // 精度 1 应该比精度 2 更短（更少小数位）
    expect(normalized1.length).toBeLessThanOrEqual(normalized2.length);
  });

  it('应该验证 path 有效性', () => {
    expect(PathNormalizer.isValid('M 100 200 L 300 400')).toBe(true);
    expect(PathNormalizer.isValid('M 0 0')).toBe(true);
    expect(PathNormalizer.isValid('')).toBe(false);
    expect(PathNormalizer.isValid(null)).toBe(false);
    expect(PathNormalizer.isValid(undefined)).toBe(false);
  });

  it('应该处理曲线命令', () => {
    const path = 'M 100 200 C 150 250 200 250 250 200';
    const normalized = PathNormalizer.normalize(path, {
      unitsPerEm: 1000,
      precision: 1
    });
    
    expect(normalized).toBeDefined();
    expect(normalized).toContain('C');
  });

  it('应该处理二次贝塞尔曲线', () => {
    const path = 'M 100 200 Q 150 250 200 200';
    const normalized = PathNormalizer.normalize(path, {
      unitsPerEm: 1000,
      precision: 1
    });
    
    expect(normalized).toBeDefined();
    expect(normalized).toContain('Q');
  });

  it('应该处理闭合路径', () => {
    const path = 'M 100 200 L 300 400 L 100 400 Z';
    const normalized = PathNormalizer.normalize(path, {
      unitsPerEm: 1000,
      precision: 1
    });
    
    expect(normalized).toBeDefined();
    expect(normalized).toContain('Z');
  });

  it('应该处理空 path', () => {
    const normalized = PathNormalizer.normalize('', {
      unitsPerEm: 1000,
      precision: 1
    });
    
    expect(normalized).toBe('');
  });

  it('应该使用默认选项', () => {
    const path = 'M 100 200 L 300 400';
    const normalized = PathNormalizer.normalize(path);
    
    expect(normalized).toBeDefined();
    expect(typeof normalized).toBe('string');
  });

  it('应该处理多个子路径', () => {
    const path = 'M 100 200 L 300 400 M 500 600 L 700 800';
    const normalized = PathNormalizer.normalize(path, {
      unitsPerEm: 1000,
      precision: 1
    });
    
    expect(normalized).toBeDefined();
    // 应该包含两个 M 命令
    const mCount = (normalized.match(/M/g) || []).length;
    expect(mCount).toBeGreaterThanOrEqual(2);
  });
});
