/**
 * FontdataGenerator 单元测试
 */

import { describe, it, expect, beforeAll, afterAll } from 'vitest';
import { FontdataGenerator } from '../../src/fontdata-generator.js';
import fs from 'fs/promises';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const TEST_OUTPUT_DIR = path.join(__dirname, '../temp-test-output');

describe('FontdataGenerator', () => {
  beforeAll(async () => {
    await fs.mkdir(TEST_OUTPUT_DIR, { recursive: true });
  });

  afterAll(async () => {
    await fs.rm(TEST_OUTPUT_DIR, { recursive: true, force: true });
  });

  it('应该转换 glyphs 为 fontdata 格式', () => {
    const glyphs = {
      'A': {
        char: 'A',
        codepoint: 0x0041,
        path: 'M 100 200 L 300 400',
        metrics: {
          advanceWidth: 500,
          height: 700,
          depth: 0,
          italicCorrection: 0,
          skew: 0
        },
        keepOriginalAdvance: false
      }
    };

    const fontdata = FontdataGenerator.convertToFontdata(glyphs);
    
    expect(fontdata).toBeDefined();
    expect(fontdata[0x0041]).toBeDefined();
    expect(fontdata[0x0041].c).toBe(0x0041);
    expect(fontdata[0x0041].w).toBe(500);
    expect(fontdata[0x0041].h).toBe(700);
    expect(fontdata[0x0041].d).toBe(0);
    expect(fontdata[0x0041].path).toBe('M 100 200 L 300 400');
  });

  it('应该生成 ES6 格式的代码', () => {
    const fontdata = {
      0x0041: {
        c: 0x0041,
        w: 500,
        h: 700,
        d: 0,
        ic: 0,
        sk: 0,
        path: 'M 100 200 L 300 400'
      }
    };

    const code = FontdataGenerator.generateCode(fontdata, 'TestFont', 'es6');
    
    expect(code).toContain('export const fontdata');
    expect(code).toContain('TestFont');
    expect(code).toContain('0x0041');
  });

  it('应该生成 CommonJS 格式的代码', () => {
    const fontdata = {
      0x0041: {
        c: 0x0041,
        w: 500,
        h: 700,
        d: 0,
        ic: 0,
        sk: 0,
        path: 'M 100 200 L 300 400'
      }
    };

    const code = FontdataGenerator.generateCode(fontdata, 'TestFont', 'cjs');
    
    expect(code).toContain('module.exports');
    expect(code).toContain('TestFont');
    expect(code).toContain('0x0041');
  });

  it('应该生成 fontdata.js 文件', async () => {
    const glyphs = {
      'A': {
        char: 'A',
        codepoint: 0x0041,
        path: 'M 100 200 L 300 400',
        metrics: {
          advanceWidth: 500,
          height: 700,
          depth: 0,
          italicCorrection: 0,
          skew: 0
        },
        keepOriginalAdvance: false
      }
    };

    const outputPath = path.join(TEST_OUTPUT_DIR, 'fontdata.js');
    
    await FontdataGenerator.generate(glyphs, outputPath, {
      fontName: 'TestFont',
      format: 'es6'
    });

    const exists = await fs.access(outputPath).then(() => true).catch(() => false);
    expect(exists).toBe(true);

    const content = await fs.readFile(outputPath, 'utf-8');
    expect(content).toContain('export const fontdata');
    expect(content).toContain('TestFont');
  });

  it('应该处理多个字符', () => {
    const glyphs = {
      'A': {
        char: 'A',
        codepoint: 0x0041,
        path: 'M 100 200 L 300 400',
        metrics: { advanceWidth: 500, height: 700, depth: 0, italicCorrection: 0, skew: 0 },
        keepOriginalAdvance: false
      },
      'B': {
        char: 'B',
        codepoint: 0x0042,
        path: 'M 150 250 L 350 450',
        metrics: { advanceWidth: 550, height: 700, depth: 0, italicCorrection: 0, skew: 0 },
        keepOriginalAdvance: false
      }
    };

    const fontdata = FontdataGenerator.convertToFontdata(glyphs);
    
    expect(Object.keys(fontdata).length).toBe(2);
    expect(fontdata[0x0041]).toBeDefined();
    expect(fontdata[0x0042]).toBeDefined();
  });

  it('应该平移 path', () => {
    const path = 'M 100 200 L 300 400';
    const translated = FontdataGenerator.translatePath(path, 50, 0);
    
    expect(translated).toBeDefined();
    expect(translated).not.toBe(path);
    expect(translated).toContain('M');
    expect(translated).toContain('L');
  });

  it('应该处理零平移', () => {
    const path = 'M 100 200 L 300 400';
    const translated = FontdataGenerator.translatePath(path, 0, 0);
    
    expect(translated).toBe(path);
  });

  it('应该居中 path', () => {
    const path = 'M 100 200 L 300 400';
    const bbox = { xMin: 100, yMin: 200, xMax: 300, yMax: 400 };
    const advanceWidth = 500;
    
    const result = FontdataGenerator.centerPath(path, bbox, advanceWidth);
    
    expect(result).toHaveProperty('path');
    expect(result).toHaveProperty('dx');
    expect(typeof result.dx).toBe('number');
  });

  it('应该跳过小偏移的居中', () => {
    const path = 'M 100 200 L 300 400';
    const bbox = { xMin: 245, yMin: 200, xMax: 255, yMax: 400 }; // 中心接近 250
    const advanceWidth = 500; // 中心 250
    
    const result = FontdataGenerator.centerPath(path, bbox, advanceWidth);
    
    expect(result.dx).toBe(0); // 偏移量小于阈值，不居中
    expect(result.path).toBe(path);
  });
});
