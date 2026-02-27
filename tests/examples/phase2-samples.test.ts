/**
 * 样例测试：20 条 UnicodeMath 样例验证
 * 
 * 验证需求：需求 2（B5.11-12）
 * 
 * 每条样例验证：
 * 1. 可转换（UnicodeMath → LaTeX）
 * 2. 可渲染（LaTeX → SVG）
 * 3. 预览一致（SVG 包含必要结构）
 * 
 * 验收标准：通过率 ≥ 80%（16/20）
 */

import { describe, it, expect, beforeAll, afterAll } from 'vitest';
import { FormulaParser } from '../../src/lib/formula-parser';
import { WebFormulaGenerator } from '../../src/lib/formula-generator';
import { initMathJax } from '../../src/lib/mathjax-loader';
import samplesData from '../../../archive/spike/phase2-samples.json';

describe('Phase 2 样例测试：20 条 UnicodeMath 样例', () => {
  let parser: FormulaParser;
  let generator: WebFormulaGenerator;
  
  // 统计结果
  const results = {
    total: 0,
    passed: 0,
    failed: 0,
    failedSamples: [] as Array<{
      id: number;
      unicodeMath: string;
      description: string;
      reason: string;
    }>,
  };

  beforeAll(async () => {
    // 初始化 MathJax（仅一次）
    await initMathJax();
    
    // 创建解析器和生成器实例
    parser = new FormulaParser();
    generator = new WebFormulaGenerator({
      mathjaxVersion: '4.1.0',
      outputFormat: 'svg',
      displayMode: true,
    });
  }, 30000); // 增加 beforeAll 超时时间

  afterAll(() => {
    // 输出统计结果
    console.log('\n=== Phase 2 样例测试统计 ===');
    console.log(`总样例数: ${results.total}`);
    console.log(`通过数: ${results.passed}`);
    console.log(`失败数: ${results.failed}`);
    console.log(`通过率: ${((results.passed / results.total) * 100).toFixed(1)}%`);
    console.log(`目标通过率: ≥ 80% (16/20)`);
    
    if (results.failed > 0) {
      console.log('\n失败样例详情:');
      results.failedSamples.forEach((sample) => {
        console.log(`  [${sample.id}] ${sample.description}`);
        console.log(`    输入: ${sample.unicodeMath}`);
        console.log(`    原因: ${sample.reason}`);
      });
    }
    
    // 验证是否达到目标通过率
    const passRate = (results.passed / results.total) * 100;
    if (passRate >= 80) {
      console.log('\n✅ 通过率达标！');
    } else {
      console.log('\n❌ 通过率未达标，需要改进。');
    }
  });

  /**
   * 通用验证函数：验证 UnicodeMath 可转换、可渲染、预览一致
   */
  async function validateSample(
    id: number,
    unicodeMath: string,
    _expectedLatex: string,
    description: string,
    ambiguous?: boolean
  ): Promise<void> {
    results.total++;
    
    try {
      // 1. 可转换（UnicodeMath → LaTeX）
      const parseResult = await parser.parse(unicodeMath);
      
      // 检查转换是否成功
      if (!parseResult.success) {
        throw new Error(`转换失败: ${parseResult.error || '未知错误'}`);
      }
      
      // 检查是否生成了 LaTeX
      expect(parseResult.latex, `${description} - 应该生成 LaTeX`).toBeTruthy();
      expect(parseResult.latex.length, `${description} - LaTeX 长度应该大于 0`).toBeGreaterThan(0);
      
      // 如果标记为歧义，验证歧义处理
      if (ambiguous) {
        expect(parseResult.ambiguous, `${description} - 应该检测到歧义`).toBe(true);
        expect(parseResult.alternatives, `${description} - 应该提供备选方案`).toBeDefined();
        expect(parseResult.alternatives!.length, `${description} - 备选方案数量应该大于 0`).toBeGreaterThan(0);
      }
      
      // 2. 可渲染（LaTeX → SVG）
      const renderResult = await generator.renderLatex(parseResult.latex);
      
      // 检查渲染是否成功
      expect(renderResult.errors, `${description} - 渲染应该无错误`).toHaveLength(0);
      
      // 3. 预览一致（SVG 包含必要结构）
      expect(renderResult.svgString, `${description} - SVG 字符串应该非空`).toBeTruthy();
      expect(renderResult.svgString.length, `${description} - SVG 字符串长度应该大于 0`).toBeGreaterThan(0);
      
      expect(renderResult.svg, `${description} - SVG 元素应该存在`).toBeDefined();
      expect(renderResult.svg.tagName.toLowerCase(), `${description} - 应该是 svg 元素`).toBe('svg');
      
      // 验证 SVG 包含 viewBox 属性
      const viewBox = renderResult.svg.getAttribute('viewBox');
      expect(viewBox, `${description} - 应该包含 viewBox 属性`).toBeTruthy();
      
      // 验证 SVG 至少包含 <path>, <use>, 或 <defs> 中之一
      const hasPath = renderResult.svg.querySelector('path') !== null;
      const hasUse = renderResult.svg.querySelector('use') !== null;
      const hasDefs = renderResult.svg.querySelector('defs') !== null;
      expect(hasPath || hasUse || hasDefs, `${description} - 应该包含必要的结构元素`).toBe(true);
      
      // 验证 SVG 尺寸有效
      expect(renderResult.width, `${description} - 宽度应该大于 0`).toBeGreaterThan(0);
      expect(renderResult.height, `${description} - 高度应该大于 0`).toBeGreaterThan(0);
      
      // 测试通过
      results.passed++;
      
    } catch (error) {
      // 测试失败，记录失败信息
      results.failed++;
      results.failedSamples.push({
        id,
        unicodeMath,
        description,
        reason: error instanceof Error ? error.message : String(error),
      });
      
      // 重新抛出错误，让测试框架记录失败
      throw error;
    }
  }

  // 提取所有样例
  const allSamples = samplesData.categories.flatMap((category) =>
    category.samples.map((sample) => ({
      ...sample,
      category: category.category,
    }))
  );

  // 为每个样例生成测试用例
  allSamples.forEach((sample) => {
    it(`样例 ${sample.id}: ${sample.description} - ${sample.unicodeMath}`, async () => {
      await validateSample(
        sample.id,
        sample.unicodeMath,
        sample.expectedLatex,
        sample.description,
        ('ambiguous' in sample && sample.ambiguous) ?? false
      );
    });
  });
});
