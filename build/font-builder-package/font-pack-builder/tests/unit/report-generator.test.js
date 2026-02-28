/**
 * ReportGenerator 单元测试
 */

import { describe, it, expect, beforeAll, afterAll } from 'vitest';
import { ReportGenerator } from '../../src/report-generator.js';
import fs from 'fs/promises';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const TEST_FONT_PATH = path.resolve(__dirname, '../../../../../puzzlettf1011.ttf');
const TEST_OUTPUT_DIR = path.join(__dirname, '../temp-test-output');

describe('ReportGenerator', () => {
  beforeAll(async () => {
    await fs.mkdir(TEST_OUTPUT_DIR, { recursive: true });
  });

  afterAll(async () => {
    await fs.rm(TEST_OUTPUT_DIR, { recursive: true, force: true });
  });

  describe('calculateBuildId', () => {
    it('应该基于源字体路径和配置生成唯一 buildId', () => {
      const config = {
        enableDefault: true,
        enableOptional: false,
        enableAdvanced: false,
        enableTextSymbols: false,
        baseOnly: false,
        enablePathCentering: false
      };

      const buildId = ReportGenerator.calculateBuildId(TEST_FONT_PATH, config);
      
      expect(buildId).toBeDefined();
      expect(typeof buildId).toBe('string');
      expect(buildId.length).toBe(16);
      expect(/^[0-9a-f]{16}$/.test(buildId)).toBe(true);
    });

    it('应该为不同配置生成不同的 buildId', () => {
      const config1 = {
        enableDefault: true,
        enableOptional: false,
        enableAdvanced: false,
        enableTextSymbols: false,
        baseOnly: false,
        enablePathCentering: false
      };

      const config2 = {
        enableDefault: true,
        enableOptional: true,
        enableAdvanced: false,
        enableTextSymbols: false,
        baseOnly: false,
        enablePathCentering: false
      };

      const buildId1 = ReportGenerator.calculateBuildId(TEST_FONT_PATH, config1);
      const buildId2 = ReportGenerator.calculateBuildId(TEST_FONT_PATH, config2);
      
      expect(buildId1).not.toBe(buildId2);
    });

    it('应该为相同配置生成相同的 buildId', () => {
      const config = {
        enableDefault: true,
        enableOptional: false,
        enableAdvanced: false,
        enableTextSymbols: false,
        baseOnly: false,
        enablePathCentering: false
      };

      const buildId1 = ReportGenerator.calculateBuildId(TEST_FONT_PATH, config);
      const buildId2 = ReportGenerator.calculateBuildId(TEST_FONT_PATH, config);
      
      expect(buildId1).toBe(buildId2);
    });
  });

  describe('calculateSourceFontHash', () => {
    it('应该计算源字体文件的 SHA-256 hash', async () => {
      const hash = await ReportGenerator.calculateSourceFontHash(TEST_FONT_PATH);
      
      expect(hash).toBeDefined();
      expect(typeof hash).toBe('string');
      expect(hash.length).toBe(64); // SHA-256 produces 64 hex characters
      expect(/^[0-9a-f]{64}$/.test(hash)).toBe(true);
    });

    it('应该为相同文件生成相同的 hash', async () => {
      const hash1 = await ReportGenerator.calculateSourceFontHash(TEST_FONT_PATH);
      const hash2 = await ReportGenerator.calculateSourceFontHash(TEST_FONT_PATH);
      
      expect(hash1).toBe(hash2);
    });
  });

  describe('generateManifest', () => {
    it('应该生成完整的 manifest 对象', async () => {
      const glyphs = {
        0x0041: { char: 'A', codepoint: 0x0041, path: 'M 0 0', metrics: {} },
        0x0061: { char: 'a', codepoint: 0x0061, path: 'M 0 0', metrics: {} },
        0x0031: { char: '1', codepoint: 0x0031, path: 'M 0 0', metrics: {} }
      };

      const options = {
        fontName: 'TestFont',
        fontMetadata: {
          family: 'Test Family',
          format: 'ttf'
        },
        glyphs,
        failures: [],
        fallbacks: [],
        charsets: {
          enableDefault: true,
          enableOptional: false,
          enableAdvanced: false,
          enableTextSymbols: false
        },
        sourceFontPath: TEST_FONT_PATH,
        config: {
          enableDefault: true,
          enableOptional: false,
          enableAdvanced: false,
          enableTextSymbols: false,
          baseOnly: false,
          enablePathCentering: false
        },
        outputDir: TEST_OUTPUT_DIR
      };

      const manifest = await ReportGenerator.generateManifest(options);
      
      expect(manifest).toBeDefined();
      expect(manifest.name).toBe('TestFont');
      expect(manifest.version).toBe('1.0.0');
      expect(manifest.buildId).toBeDefined();
      expect(manifest.sourceFontHash).toBeDefined();
      expect(manifest.family).toBe('Test Family');
      expect(manifest.format).toBe('ttf');
      expect(manifest.coverage).toBeDefined();
      expect(manifest.charsets).toBeDefined();
      expect(manifest.failures).toEqual([]);
      expect(manifest.fallbacks).toEqual([]);
      expect(manifest.createdAt).toBeDefined();
      expect(manifest.fontdataFile).toBe('fontdata.js');
    });

    it('应该正确计算覆盖率', async () => {
      const glyphs = {
        0x0041: { char: 'A', codepoint: 0x0041 }, // A
        0x0042: { char: 'B', codepoint: 0x0042 }, // B
        0x0061: { char: 'a', codepoint: 0x0061 }, // a
        0x0062: { char: 'b', codepoint: 0x0062 }, // b
        0x0031: { char: '1', codepoint: 0x0031 }, // 1
        0x0032: { char: '2', codepoint: 0x0032 }  // 2
      };

      const options = {
        fontName: 'TestFont',
        fontMetadata: { family: 'Test', format: 'ttf' },
        glyphs,
        failures: [],
        fallbacks: [],
        charsets: {
          enableDefault: true,
          enableOptional: false,
          enableAdvanced: false,
          enableTextSymbols: false
        },
        sourceFontPath: TEST_FONT_PATH,
        config: {
          enableDefault: true,
          enableOptional: false,
          enableAdvanced: false,
          enableTextSymbols: false,
          baseOnly: false,
          enablePathCentering: false
        },
        outputDir: TEST_OUTPUT_DIR
      };

      const manifest = await ReportGenerator.generateManifest(options);
      
      expect(manifest.coverage.uppercase).toBe('AB');
      expect(manifest.coverage.lowercase).toBe('ab');
      expect(manifest.coverage.digits).toBe('12');
    });

    it('应该记录失败和回退的字符', async () => {
      const glyphs = {
        0x0041: { char: 'A', codepoint: 0x0041 }
      };

      const failures = [
        { char: 'Q', codepoint: 0x0051, reason: 'Missing glyph' }
      ];

      const fallbacks = [
        { char: 'Z', codepoint: 0x005A, reason: 'Invalid path' }
      ];

      const options = {
        fontName: 'TestFont',
        fontMetadata: { family: 'Test', format: 'ttf' },
        glyphs,
        failures,
        fallbacks,
        charsets: {
          enableDefault: true,
          enableOptional: false,
          enableAdvanced: false,
          enableTextSymbols: false
        },
        sourceFontPath: TEST_FONT_PATH,
        config: {
          enableDefault: true,
          enableOptional: false,
          enableAdvanced: false,
          enableTextSymbols: false,
          baseOnly: false,
          enablePathCentering: false
        },
        outputDir: TEST_OUTPUT_DIR
      };

      const manifest = await ReportGenerator.generateManifest(options);
      
      expect(manifest.failures).toEqual(['Q']);
      expect(manifest.fallbacks).toEqual(['Z']);
    });

    it('应该正确设置字符集标志', async () => {
      const glyphs = {
        0x0041: { char: 'A', codepoint: 0x0041 }
      };

      const options = {
        fontName: 'TestFont',
        fontMetadata: { family: 'Test', format: 'ttf' },
        glyphs,
        failures: [],
        fallbacks: [],
        charsets: {
          enableDefault: true,
          enableOptional: true,
          enableAdvanced: true,
          enableTextSymbols: true
        },
        sourceFontPath: TEST_FONT_PATH,
        config: {
          enableDefault: true,
          enableOptional: true,
          enableAdvanced: true,
          enableTextSymbols: true,
          baseOnly: false,
          enablePathCentering: false
        },
        outputDir: TEST_OUTPUT_DIR
      };

      const manifest = await ReportGenerator.generateManifest(options);
      
      expect(manifest.charsets.base).toBe(true);
      expect(manifest.charsets.extendedMathDefault).toBe(true);
      expect(manifest.charsets.extendedMathOptional).toBe(true);
      expect(manifest.charsets.extendedMathAdvanced).toBe(true);
      expect(manifest.charsets.extendedTextSymbols).toBe(true);
    });
  });

  describe('generateReport', () => {
    it('应该生成完整的 report 对象', async () => {
      const glyphs = {
        0x0041: { 
          char: 'A', 
          codepoint: 0x0041, 
          path: 'M 0 0', 
          metrics: {},
          keepOriginalAdvance: false,
          source: 'user-font'
        }
      };

      const options = {
        fontName: 'TestFont',
        glyphs,
        failures: [],
        fallbacks: [],
        l3Skipped: [],
        charsetManager: null,
        capabilities: {
          l3ReplacementAllowed: false,
          hasMATH: false,
          l3ReplacementReason: 'No MATH table'
        },
        sourceFontPath: TEST_FONT_PATH,
        config: {
          enableDefault: true,
          enableOptional: false,
          enableAdvanced: false,
          enableTextSymbols: false,
          baseOnly: false,
          enablePathCentering: false
        }
      };

      const report = await ReportGenerator.generateReport(options);
      
      expect(report).toBeDefined();
      expect(report.buildId).toBeDefined();
      expect(report.sourceFontHash).toBeDefined();
      expect(report.createdAt).toBeDefined();
      expect(report.fontName).toBe('TestFont');
      expect(report.statistics).toBeDefined();
      expect(report.byCategory).toBeDefined();
      expect(report.glyphs).toBeDefined();
      expect(report.failures).toEqual([]);
      expect(report.fallbacks).toEqual([]);
      expect(report.l3Skipped).toEqual([]);
      expect(report.variants).toBeDefined();
      expect(report.assemblies).toBeDefined();
      expect(report.advancedCharsetStatus).toBeDefined();
    });

    it('应该正确计算统计信息', async () => {
      const glyphs = {
        0x0041: { char: 'A', codepoint: 0x0041 },
        0x0042: { char: 'B', codepoint: 0x0042 },
        0x0043: { char: 'C', codepoint: 0x0043 }
      };

      const failures = [
        { char: 'Q', codepoint: 0x0051, reason: 'Missing' }
      ];

      const fallbacks = [
        { char: 'Z', codepoint: 0x005A, reason: 'Invalid' }
      ];

      const l3Skipped = [
        { char: '√', codepoint: 0x221A, reason: 'L3 symbol' }
      ];

      const options = {
        fontName: 'TestFont',
        glyphs,
        failures,
        fallbacks,
        l3Skipped,
        charsetManager: null,
        capabilities: null,
        sourceFontPath: TEST_FONT_PATH,
        config: {
          enableDefault: true,
          enableOptional: false,
          enableAdvanced: false,
          enableTextSymbols: false,
          baseOnly: false,
          enablePathCentering: false
        }
      };

      const report = await ReportGenerator.generateReport(options);
      
      expect(report.statistics.total).toBe(3);
      expect(report.statistics.successful).toBe(2); // total - failures
      expect(report.statistics.failed).toBe(1);
      expect(report.statistics.fallback).toBe(1);
      expect(report.statistics.l3Skipped).toBe(1);
    });

    it('应该格式化失败、回退和跳过的字符', async () => {
      const glyphs = {
        0x0041: { char: 'A', codepoint: 0x0041 }
      };

      const failures = [
        { char: 'Q', codepoint: 0x0051, category: 'uppercase', reason: 'Missing glyph' }
      ];

      const fallbacks = [
        { char: 'Z', codepoint: 0x005A, reason: 'Invalid path' }
      ];

      const l3Skipped = [
        { char: '√', codepoint: 0x221A, reason: 'L3 symbol requires MATH table' }
      ];

      const options = {
        fontName: 'TestFont',
        glyphs,
        failures,
        fallbacks,
        l3Skipped,
        charsetManager: null,
        capabilities: null,
        sourceFontPath: TEST_FONT_PATH,
        config: {
          enableDefault: true,
          enableOptional: false,
          enableAdvanced: false,
          enableTextSymbols: false,
          baseOnly: false,
          enablePathCentering: false
        }
      };

      const report = await ReportGenerator.generateReport(options);
      
      expect(report.failures).toHaveLength(1);
      expect(report.failures[0]).toEqual({
        char: 'Q',
        codepoint: 0x0051,
        category: 'uppercase',
        reason: 'Missing glyph'
      });

      expect(report.fallbacks).toHaveLength(1);
      expect(report.fallbacks[0]).toEqual({
        char: 'Z',
        codepoint: 0x005A,
        reason: 'Invalid path'
      });

      expect(report.l3Skipped).toHaveLength(1);
      expect(report.l3Skipped[0]).toEqual({
        char: '√',
        codepoint: 0x221A,
        reason: 'L3 symbol requires MATH table'
      });
    });

    it('应该设置 advancedCharsetStatus', async () => {
      const glyphs = {
        0x0041: { char: 'A', codepoint: 0x0041 }
      };

      const capabilities = {
        l3ReplacementAllowed: true,
        hasMATH: true,
        l3ReplacementReason: 'MATH table present with variants and assembly'
      };

      const options = {
        fontName: 'TestFont',
        glyphs,
        failures: [],
        fallbacks: [],
        l3Skipped: [],
        charsetManager: null,
        capabilities,
        sourceFontPath: TEST_FONT_PATH,
        config: {
          enableDefault: true,
          enableOptional: false,
          enableAdvanced: false,
          enableTextSymbols: false,
          baseOnly: false,
          enablePathCentering: false
        }
      };

      const report = await ReportGenerator.generateReport(options);
      
      expect(report.advancedCharsetStatus.available).toBe(true);
      expect(report.advancedCharsetStatus.variantsAssemblySupported).toBe(true);
      expect(report.advancedCharsetStatus.reason).toBe('MATH table present with variants and assembly');
    });
  });
});
