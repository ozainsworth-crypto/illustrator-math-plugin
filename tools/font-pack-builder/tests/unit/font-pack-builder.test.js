/**
 * FontPackBuilder 单元测试
 */

import { describe, it, expect, beforeAll, afterAll } from 'vitest';
import { FontPackBuilder } from '../../src/font-pack-builder.js';
import fs from 'fs/promises';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const TEST_FONT_PATH = path.resolve(__dirname, '../../../../../puzzlettf1011.ttf');
const TEST_OUTPUT_DIR = path.join(__dirname, '../temp-builder-test');

describe('FontPackBuilder', () => {
  beforeAll(async () => {
    await fs.mkdir(TEST_OUTPUT_DIR, { recursive: true });
  });

  afterAll(async () => {
    await fs.rm(TEST_OUTPUT_DIR, { recursive: true, force: true });
  });

  it('应该创建 FontPackBuilder 实例', () => {
    const builder = new FontPackBuilder({
      inputFont: TEST_FONT_PATH,
      outputDir: TEST_OUTPUT_DIR,
      fontName: 'TestFont',
      baseOnly: true
    });
    
    expect(builder).toBeDefined();
    expect(builder.inputFont).toBe(TEST_FONT_PATH);
    expect(builder.outputDir).toBe(TEST_OUTPUT_DIR);
    expect(builder.fontName).toBe('TestFont');
  });

  it('应该验证输入文件存在', async () => {
    const builder = new FontPackBuilder({
      inputFont: TEST_FONT_PATH,
      outputDir: TEST_OUTPUT_DIR,
      fontName: 'TestFont',
      baseOnly: true
    });
    
    await expect(builder.validateInput()).resolves.not.toThrow();
  });

  it('应该拒绝不存在的输入文件', async () => {
    const builder = new FontPackBuilder({
      inputFont: '/nonexistent/font.ttf',
      outputDir: TEST_OUTPUT_DIR,
      fontName: 'TestFont',
      baseOnly: true
    });
    
    await expect(builder.validateInput()).rejects.toThrow('输入字体文件不存在');
  });

  it('应该拒绝不支持的字体格式', async () => {
    const builder = new FontPackBuilder({
      inputFont: '/path/to/font.woff',
      outputDir: TEST_OUTPUT_DIR,
      fontName: 'TestFont',
      baseOnly: true
    });
    
    await expect(builder.validateInput()).rejects.toThrow('不支持的字体格式');
  });

  it('应该创建输出目录', async () => {
    const testDir = path.join(TEST_OUTPUT_DIR, 'test-create-dir');
    const builder = new FontPackBuilder({
      inputFont: TEST_FONT_PATH,
      outputDir: testDir,
      fontName: 'TestFont',
      baseOnly: true
    });
    
    await builder.createOutputDir();
    
    const exists = await fs.access(testDir).then(() => true).catch(() => false);
    expect(exists).toBe(true);
  });

  it('应该构建完整的字体包', async () => {
    const outputDir = path.join(TEST_OUTPUT_DIR, 'full-build');
    const builder = new FontPackBuilder({
      inputFont: TEST_FONT_PATH,
      outputDir,
      fontName: 'TestFont',
      baseOnly: true
    });
    
    const manifest = await builder.build();
    
    expect(manifest).toBeDefined();
    expect(manifest).toHaveProperty('id');
    expect(manifest).toHaveProperty('name');
    expect(manifest).toHaveProperty('version');
    
    // 验证生成的文件
    const fontdataExists = await fs.access(path.join(outputDir, 'fontdata.js')).then(() => true).catch(() => false);
    const manifestExists = await fs.access(path.join(outputDir, 'manifest.json')).then(() => true).catch(() => false);
    const capabilitiesExists = await fs.access(path.join(outputDir, 'capabilities.json')).then(() => true).catch(() => false);
    
    expect(fontdataExists).toBe(true);
    expect(manifestExists).toBe(true);
    expect(capabilitiesExists).toBe(true);
  }, 30000); // 增加超时时间

  it('应该支持扩展字符集选项', () => {
    const builder = new FontPackBuilder({
      inputFont: TEST_FONT_PATH,
      outputDir: TEST_OUTPUT_DIR,
      fontName: 'TestFont',
      enableOptional: true,
      enableAdvanced: false,
      baseOnly: false
    });
    
    expect(builder.enableOptional).toBe(true);
    expect(builder.enableAdvanced).toBe(false);
    expect(builder.baseOnly).toBe(false);
  });

  it('应该支持 path centering 选项', () => {
    const builder = new FontPackBuilder({
      inputFont: TEST_FONT_PATH,
      outputDir: TEST_OUTPUT_DIR,
      fontName: 'TestFont',
      enablePathCentering: true,
      baseOnly: true
    });
    
    expect(builder.enablePathCentering).toBe(true);
  });

  it('应该初始化 CharsetManager', async () => {
    const builder = new FontPackBuilder({
      inputFont: TEST_FONT_PATH,
      outputDir: TEST_OUTPUT_DIR,
      fontName: 'TestFont',
      baseOnly: true
    });
    
    await builder.initCharsetManager();
    
    expect(builder.charsetManager).toBeDefined();
  });

  it('应该解析字体文件', async () => {
    const builder = new FontPackBuilder({
      inputFont: TEST_FONT_PATH,
      outputDir: TEST_OUTPUT_DIR,
      fontName: 'TestFont',
      baseOnly: true
    });
    
    await builder.parseFont();
    
    expect(builder.fontParser).toBeDefined();
    expect(builder.fontMetadata).toBeDefined();
    expect(builder.fontMetadata).toHaveProperty('family');
    expect(builder.fontMetadata).toHaveProperty('format');
  });

  it('应该检测字体能力', async () => {
    const builder = new FontPackBuilder({
      inputFont: TEST_FONT_PATH,
      outputDir: TEST_OUTPUT_DIR,
      fontName: 'TestFont',
      baseOnly: true
    });
    
    await builder.parseFont();
    await builder.detectCapabilities();
    
    expect(builder.capabilities).toBeDefined();
    expect(builder.capabilities).toHaveProperty('hasMATH');
    expect(builder.capabilities).toHaveProperty('coverage');
  });
});
