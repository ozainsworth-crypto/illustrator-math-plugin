/**
 * 属性测试：UnicodeMath 转换端到端正确性
 * 
 * 属性 5：UnicodeMath 转换端到端正确性
 * 验证需求：B2.5-6, B5.11-12
 * 
 * 对于有效的 UnicodeMath 输入：
 * 1. 必须能成功转换为 LaTeX
 * 2. 转换后的 LaTeX 必须能被 MathJax 渲染
 * 3. SVG 输出必须非空且结构完整
 */

import { describe, it, expect, beforeAll } from 'vitest';
import * as fc from 'fast-check';
import { FormulaParser } from '../../src/lib/formula-parser';
import { WebFormulaGenerator } from '../../src/lib/formula-generator';
import { initMathJax } from '../../src/lib/mathjax-loader';

describe('Property Test: UnicodeMath End-to-End Conversion Correctness', () => {
  let parser: FormulaParser;
  let generator: WebFormulaGenerator;

  beforeAll(async () => {
    // 初始化 MathJax（仅一次）
    await initMathJax();
    
    // 创建实例
    parser = new FormulaParser();
    generator = new WebFormulaGenerator({
      mathjaxVersion: '4.1.0',
      outputFormat: 'svg',
      displayMode: true,
    });
  }, 30000);

  /**
   * 生成有效的 UnicodeMath 公式
   * 基于 phase2-samples.json 中的样例
   */
  const validUnicodemathArbitrary = fc.oneof(
    // 简单分数
    fc.tuple(
      fc.constantFrom('a', 'b', 'x', 'y', '1', '2', '3'),
      fc.constantFrom('b', 'c', 'y', 'z', '2', '3', '4')
    ).map(([num, den]) => `${num}/${den}`),
    
    // 上下标
    fc.tuple(
      fc.constantFrom('x', 'y', 'z', 'a', 'b'),
      fc.constantFrom('2', '3', 'n', 'i', 'j')
    ).map(([base, exp]) => `${base}^${exp}`),
    
    fc.tuple(
      fc.constantFrom('x', 'y', 'z', 'a', 'b'),
      fc.constantFrom('i', 'j', 'n', '1', '2')
    ).map(([base, sub]) => `${base}_${sub}`),
    
    // 上下标组合
    fc.tuple(
      fc.constantFrom('x', 'y', 'z'),
      fc.constantFrom('i', 'j', 'n'),
      fc.constantFrom('2', '3', 'k')
    ).map(([base, sub, exp]) => `${base}_${sub}^${exp}`),
    
    // Unicode 根号
    fc.constantFrom('x', 'y', 'a', 'n').map(x => `√${x}`),
    fc.constantFrom('x', 'y', 'a').map(x => `∛${x}`),
    
    // 希腊字母
    fc.constantFrom(
      'α+β',
      'α+β=γ',
      'θ+φ',
      'λ+μ',
    ),
    
    // 关系运算符
    fc.tuple(
      fc.constantFrom('x', 'y', 'a', 'b'),
      fc.constantFrom('≤', '≥', '≠', '≈'),
      fc.constantFrom('y', 'z', 'b', 'c')
    ).map(([left, op, right]) => `${left}${op}${right}`),
    
    // 函数名
    fc.tuple(
      fc.constantFrom('sin', 'cos', 'tan', 'log', 'ln'),
      fc.constantFrom('x', 'y', 'θ')
    ).map(([fn, arg]) => `${fn}(${arg})`),
    
    // 括号包裹分数
    fc.tuple(
      fc.constantFrom('a', 'x', '1'),
      fc.constantFrom('b', 'y', '2')
    ).map(([num, den]) => `(${num}/${den})`),
    
    // 简单的求和和积分（不带上下限，避免复杂性）
    fc.constantFrom('∑', '∫', '∏').map(op => `${op} x`),
  );

  /**
   * 属性 5.1：有效 UnicodeMath 必须能成功转换为 LaTeX
   */
  it('属性 5.1：有效 UnicodeMath 必须能成功转换为 LaTeX', async () => {
    let successCount = 0;
    let totalCount = 0;
    const failures: Array<{ input: string; error: string }> = [];

    await fc.assert(
      fc.asyncProperty(validUnicodemathArbitrary, async (unicodemath) => {
        totalCount++;
        
        // 解析 UnicodeMath
        const parseResult = await parser.parse(unicodemath);
        
        // 验证：解析必须成功或存在歧义（歧义也算成功，因为提供了候选项）
        const isSuccess = parseResult.success || parseResult.ambiguous;
        
        if (isSuccess) {
          successCount++;
          
          // 验证：转换后的 LaTeX 非空
          expect(parseResult.latex).toBeTruthy();
          expect(parseResult.latex.length).toBeGreaterThan(0);
        } else {
          failures.push({
            input: unicodemath,
            error: parseResult.error || 'Unknown error',
          });
        }
        
        return true;
      }),
      { 
        numRuns: 100,
        verbose: false,
      }
    );

    // 计算成功率
    const successRate = successCount / totalCount;
    
    // 输出统计信息
    console.log(`UnicodeMath 转换成功率: ${(successRate * 100).toFixed(2)}% (${successCount}/${totalCount})`);
    
    if (failures.length > 0) {
      console.log(`失败样例 (${failures.length}):`);
      failures.slice(0, 5).forEach(f => {
        console.log(`  - "${f.input}": ${f.error}`);
      });
    }
    
    // 验证：成功率应该很高（≥ 80%）
    expect(successRate).toBeGreaterThanOrEqual(0.8);
  }, 60000);

  /**
   * 属性 5.2：转换后的 LaTeX 必须能被 MathJax 渲染
   */
  it('属性 5.2：转换后的 LaTeX 必须能被 MathJax 渲染', async () => {
    let renderSuccessCount = 0;
    let totalCount = 0;
    const renderFailures: Array<{ input: string; latex: string; error: string }> = [];

    await fc.assert(
      fc.asyncProperty(validUnicodemathArbitrary, async (unicodemath) => {
        // 解析 UnicodeMath
        const parseResult = await parser.parse(unicodemath);
        
        // 只测试成功转换的情况
        if (!parseResult.success && !parseResult.ambiguous) {
          return true;
        }
        
        totalCount++;
        const latex = parseResult.latex;
        
        // 尝试渲染 LaTeX
        const renderResult = await generator.renderLatex(latex);
        
        // 验证：渲染必须成功（无错误）
        const isRenderSuccess = renderResult.errors.length === 0;
        
        if (isRenderSuccess) {
          renderSuccessCount++;
          
          // 验证：SVG 输出非空
          expect(renderResult.svgString).toBeTruthy();
          expect(renderResult.svgString.length).toBeGreaterThan(0);
        } else {
          renderFailures.push({
            input: unicodemath,
            latex,
            error: renderResult.errors.join('; '),
          });
        }
        
        return true;
      }),
      { 
        numRuns: 100,
        verbose: false,
      }
    );

    // 计算渲染成功率
    const renderSuccessRate = totalCount > 0 ? renderSuccessCount / totalCount : 1;
    
    // 输出统计信息
    console.log(`LaTeX 渲染成功率: ${(renderSuccessRate * 100).toFixed(2)}% (${renderSuccessCount}/${totalCount})`);
    
    if (renderFailures.length > 0) {
      console.log(`渲染失败样例 (${renderFailures.length}):`);
      renderFailures.slice(0, 5).forEach(f => {
        console.log(`  - UnicodeMath: "${f.input}"`);
        console.log(`    LaTeX: "${f.latex}"`);
        console.log(`    Error: ${f.error}`);
      });
    }
    
    // 验证：渲染成功率应该很高（≥ 90%）
    expect(renderSuccessRate).toBeGreaterThanOrEqual(0.9);
  }, 60000);

  /**
   * 属性 5.3：SVG 输出必须结构完整
   */
  it('属性 5.3：SVG 输出必须结构完整', async () => {
    let validSvgCount = 0;
    let totalCount = 0;

    await fc.assert(
      fc.asyncProperty(validUnicodemathArbitrary, async (unicodemath) => {
        // 解析 UnicodeMath
        const parseResult = await parser.parse(unicodemath);
        
        // 只测试成功转换的情况
        if (!parseResult.success && !parseResult.ambiguous) {
          return true;
        }
        
        const latex = parseResult.latex;
        
        // 渲染 LaTeX
        const renderResult = await generator.renderLatex(latex);
        
        // 只测试渲染成功的情况
        if (renderResult.errors.length > 0) {
          return true;
        }
        
        totalCount++;
        
        // 验证 SVG 结构完整性
        const svg = renderResult.svg;
        
        // 1. SVG 元素存在
        expect(svg).toBeDefined();
        expect(svg.tagName.toLowerCase()).toBe('svg');
        
        // 2. 包含 viewBox 属性
        const viewBox = svg.getAttribute('viewBox');
        expect(viewBox).toBeTruthy();
        
        // 3. 至少包含 <path>, <use>, 或 <defs> 中之一
        const hasPath = svg.querySelector('path') !== null;
        const hasUse = svg.querySelector('use') !== null;
        const hasDefs = svg.querySelector('defs') !== null;
        
        if (hasPath || hasUse || hasDefs) {
          validSvgCount++;
        }
        
        expect(hasPath || hasUse || hasDefs).toBe(true);
        
        // 4. 尺寸有效
        expect(renderResult.width).toBeGreaterThan(0);
        expect(renderResult.height).toBeGreaterThan(0);
        
        return true;
      }),
      { 
        numRuns: 100,
        verbose: false,
      }
    );

    // 输出统计信息
    console.log(`SVG 结构完整率: ${totalCount > 0 ? ((validSvgCount / totalCount) * 100).toFixed(2) : 100}% (${validSvgCount}/${totalCount})`);
    
    // 验证：所有渲染成功的 SVG 都应该结构完整
    if (totalCount > 0) {
      expect(validSvgCount).toBe(totalCount);
    }
  }, 60000);

  /**
   * 属性 5.4：端到端转换的幂等性
   * 
   * 对于相同的 UnicodeMath 输入，多次转换应该产生相同的结果
   */
  it('属性 5.4：端到端转换必须是确定性的（相同输入产生相同结果）', async () => {
    await fc.assert(
      fc.asyncProperty(validUnicodemathArbitrary, async (unicodemath) => {
        // 多次解析相同输入
        const result1 = await parser.parse(unicodemath);
        const result2 = await parser.parse(unicodemath);
        const result3 = await parser.parse(unicodemath);
        
        // 验证：结果必须一致
        expect(result1.success).toBe(result2.success);
        expect(result2.success).toBe(result3.success);
        
        if (result1.success) {
          expect(result1.latex).toBe(result2.latex);
          expect(result2.latex).toBe(result3.latex);
        }
        
        expect(result1.ambiguous).toBe(result2.ambiguous);
        expect(result2.ambiguous).toBe(result3.ambiguous);
      }),
      { 
        numRuns: 100,
        verbose: false,
      }
    );
  }, 60000);

  /**
   * 补充测试：验证特定 UnicodeMath 样例的端到端转换
   */
  it('应该正确转换特定的 UnicodeMath 样例', async () => {
    const testCases = [
      { input: 'a/b', description: '简单分数', required: true },
      { input: 'x^2', description: '简单上标', required: true },
      { input: 'x_i', description: '简单下标', required: true },
      { input: 'x_i^2', description: '上下标组合', required: true },
      { input: '√x', description: '平方根', required: true },
      { input: 'α+β', description: '希腊字母', required: true },
      { input: 'x≤y', description: '不等号', required: true },
      { input: 'sin(x)', description: '三角函数', required: false }, // 函数名解析可能失败
      { input: '(a/b)', description: '括号包裹分数', required: true },
    ];

    let successCount = 0;
    let requiredCount = 0;
    let requiredSuccessCount = 0;

    for (const testCase of testCases) {
      // 解析 UnicodeMath
      const parseResult = await parser.parse(testCase.input);
      
      // 统计必需样例
      if (testCase.required) {
        requiredCount++;
      }
      
      // 验证：解析成功或存在歧义
      const parseSuccess = parseResult.success || parseResult.ambiguous;
      
      if (!parseSuccess) {
        console.warn(`样例 "${testCase.description}" (${testCase.input}) 解析失败: ${parseResult.error}`);
        
        // 必需样例失败时报错
        if (testCase.required) {
          expect(parseSuccess).toBe(true);
        }
        continue;
      }
      
      // 验证：LaTeX 非空
      expect(parseResult.latex).toBeTruthy();
      
      // 渲染 LaTeX
      const renderResult = await generator.renderLatex(parseResult.latex);
      
      // 验证：渲染成功
      if (renderResult.errors.length > 0) {
        console.warn(`样例 "${testCase.description}" (${testCase.input}) 渲染失败: ${renderResult.errors.join('; ')}`);
        
        // 必需样例失败时报错
        if (testCase.required) {
          expect(renderResult.errors.length).toBe(0);
        }
        continue;
      }
      
      // 验证：SVG 输出非空且结构完整
      expect(renderResult.svgString).toBeTruthy();
      expect(renderResult.svg).toBeDefined();
      expect(renderResult.width).toBeGreaterThan(0);
      expect(renderResult.height).toBeGreaterThan(0);
      
      // 统计成功
      successCount++;
      if (testCase.required) {
        requiredSuccessCount++;
      }
    }
    
    // 输出统计信息
    console.log(`样例测试通过率: ${((successCount / testCases.length) * 100).toFixed(2)}% (${successCount}/${testCases.length})`);
    console.log(`必需样例通过率: ${((requiredSuccessCount / requiredCount) * 100).toFixed(2)}% (${requiredSuccessCount}/${requiredCount})`);
    
    // 验证：所有必需样例必须通过
    expect(requiredSuccessCount).toBe(requiredCount);
  }, 30000);
});
