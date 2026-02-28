/**
 * FontParser 单元测试
 */

import { describe, it, expect, beforeAll } from 'vitest';
import { FontParser } from '../../src/font-parser.js';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// 使用项目根目录的测试字体
const TEST_FONT_PATH = path.resolve(__dirname, '../../../../../puzzlettf1011.ttf');

describe('FontParser', () => {
  let parser;

  beforeAll(async () => {
    parser = new FontParser(TEST_FONT_PATH);
    await parser.load();
  });

  it('应该成功加载字体文件', () => {
    expect(parser.getFont()).toBeDefined();
    expect(parser.getFont().numGlyphs).toBeGreaterThan(0);
  });

  it('应该提取字体元数据', () => {
    const metadata = parser.getMetadata();
    
    expect(metadata).toBeDefined();
    expect(metadata.family).toBeDefined();
    expect(metadata.format).toMatch(/^(ttf|otf)$/);
    expect(metadata.unitsPerEm).toBeGreaterThan(0);
    expect(metadata.numGlyphs).toBeGreaterThan(0);
  });

  it('应该验证字体文件有效性', () => {
    const validation = parser.validate();
    
    expect(validation).toBeDefined();
    expect(validation.valid).toBe(true);
    expect(validation.issues).toHaveLength(0);
  });

  it('未加载字体时应该抛出错误', () => {
    const newParser = new FontParser(TEST_FONT_PATH);
    
    expect(() => newParser.getMetadata()).toThrow('字体尚未加载');
    expect(() => newParser.validate()).toThrow('字体尚未加载');
    expect(() => newParser.getFont()).toThrow('字体尚未加载');
  });
});
