/**
 * CharsetManager 单元测试
 */

import { describe, it, expect, beforeEach } from 'vitest';
import { CharsetManager } from '../../src/charset-manager.js';

describe('CharsetManager', () => {
  let manager;

  beforeEach(() => {
    manager = new CharsetManager({ baseOnly: true });
  });

  it('应该加载基础字符集', async () => {
    await manager.load();
    
    const merged = manager.getMergedCharset();
    expect(merged).toBeDefined();
    expect(merged.characters).toBeInstanceOf(Map);
    expect(merged.characters.size).toBeGreaterThan(0);
  });

  it('应该包含字母数字字符', async () => {
    await manager.load();
    
    const merged = manager.getMergedCharset();
    
    // 检查大写字母
    expect(merged.characters.has(0x0041)).toBe(true); // A
    expect(merged.characters.has(0x005A)).toBe(true); // Z
    
    // 检查小写字母
    expect(merged.characters.has(0x0061)).toBe(true); // a
    expect(merged.characters.has(0x007A)).toBe(true); // z
    
    // 检查数字
    expect(merged.characters.has(0x0030)).toBe(true); // 0
    expect(merged.characters.has(0x0039)).toBe(true); // 9
  });

  it('应该包含基础运算符', async () => {
    await manager.load();
    
    const merged = manager.getMergedCharset();
    
    expect(merged.characters.has(0x002B)).toBe(true); // +
    expect(merged.characters.has(0x002D)).toBe(true); // -
    expect(merged.characters.has(0x003D)).toBe(true); // =
  });

  it('应该正确解析 codepoint', () => {
    expect(manager.parseCodepoint('0x0041')).toBe(0x0041);
    expect(manager.parseCodepoint('0X0041')).toBe(0x0041);
    expect(manager.parseCodepoint('65')).toBe(65);
    expect(manager.parseCodepoint(65)).toBe(65);
  });

  it('应该获取字符的替换策略', async () => {
    await manager.load();
    
    const strategy = manager.getReplacementStrategy(0x0041); // A
    
    expect(strategy).toBeDefined();
    expect(strategy).toHaveProperty('keepOriginalAdvance');
    expect(strategy).toHaveProperty('enablePathCentering');
    expect(strategy).toHaveProperty('category');
  });

  it('应该返回 null 对于不存在的字符', async () => {
    await manager.load();
    
    const strategy = manager.getReplacementStrategy(0x9999);
    expect(strategy).toBeNull();
  });

  it('应该生成统计信息', async () => {
    await manager.load();
    
    const stats = manager.getStatistics();
    
    expect(stats).toHaveProperty('total');
    expect(stats).toHaveProperty('byCategory');
    expect(stats).toHaveProperty('bySource');
    expect(stats.total).toBeGreaterThan(0);
  });

  it('应该列出启用的字符集', async () => {
    await manager.load();
    
    const enabled = manager.getEnabledCharsets();
    
    expect(Array.isArray(enabled)).toBe(true);
    expect(enabled).toContain('base');
  });

  it('应该支持扩展字符集选项', async () => {
    const extendedManager = new CharsetManager({
      enableDefault: true,
      enableOptional: false,
      baseOnly: false
    });
    
    await extendedManager.load();
    
    const enabled = extendedManager.getEnabledCharsets();
    expect(enabled).toContain('base');
    expect(enabled).toContain('extended-math-default');
  });

  it('应该检查 advanced 字符集可用性', () => {
    const available = manager.isAdvancedAvailable();
    expect(typeof available).toBe('boolean');
  });

  it('应该在未加载时抛出错误', () => {
    expect(() => manager.getMergedCharset()).toThrow('Charset not loaded');
    expect(() => manager.getReplacementStrategy(0x0041)).toThrow('Charset not loaded');
    expect(() => manager.getStatistics()).toThrow('Charset not loaded');
  });

  it('应该处理 homoglyphs', async () => {
    await manager.load();
    
    const merged = manager.getMergedCharset();
    expect(Array.isArray(merged.homoglyphs)).toBe(true);
  });

  it('应该处理 normalized mappings', async () => {
    await manager.load();
    
    const merged = manager.getMergedCharset();
    expect(Array.isArray(merged.normalizedMappings)).toBe(true);
  });
});
