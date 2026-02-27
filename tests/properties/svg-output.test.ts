/**
 * 属性测试：SVG 输出单一性
 * 
 * 属性 1：SVG 输出单一性
 * 验证需求：A1.4
 * 
 * 对于任何有效的 LaTeX 公式，渲染后的输出必须是单个 <svg> 元素，
 * 不得因换行或断行产生多个 SVG 片段
 */

import { describe, it, expect, beforeAll } from 'vitest';
import * as fc from 'fast-check';
import { WebFormulaGenerator } from '../../src/lib/formula-generator';
import { initMathJax } from '../../src/lib/mathjax-loader';

describe('Property Test: SVG Output Singularity', () => {
  let generator: WebFormulaGenerator;

  beforeAll(async () => {
    // 初始化 MathJax（仅一次）
    await initMathJax();
    
    // 创建公式生成器实例
    generator = new WebFormulaGenerator({
      mathjaxVersion: '4.1.0',
      outputFormat: 'svg',
      displayMode: true,
    });
  }, 30000); // 增加 beforeAll 超时时间

  /**
   * 生成有效的 LaTeX 公式
   * 使用 fast-check 的组合器生成各种 LaTeX 结构
   */
  const validLatexArbitrary = fc.oneof(
    // 简单表达式
    fc.constantFrom('x', 'y', 'z', 'a', 'b', 'c', 'n', 'm'),
    
    // 数字
    fc.integer({ min: 0, max: 100 }).map(n => n.toString()),
    
    // 分数
    fc.tuple(
      fc.constantFrom('a', 'b', 'x', 'y', '1', '2'),
      fc.constantFrom('b', 'c', 'y', 'z', '3', '4')
    ).map(([num, den]) => `\\frac{${num}}{${den}}`),
    
    // 上标
    fc.tuple(
      fc.constantFrom('x', 'y', 'z', 'a'),
      fc.constantFrom('2', '3', 'n', 'i')
    ).map(([base, exp]) => `${base}^{${exp}}`),
    
    // 下标
    fc.tuple(
      fc.constantFrom('x', 'y', 'z', 'a'),
      fc.constantFrom('i', 'j', 'n', '1')
    ).map(([base, sub]) => `${base}_{${sub}}`),
    
    // 上下标组合
    fc.tuple(
      fc.constantFrom('x', 'y', 'z'),
      fc.constantFrom('i', 'j', 'n'),
      fc.constantFrom('2', '3', 'k')
    ).map(([base, sub, exp]) => `${base}_{${sub}}^{${exp}}`),
    
    // 根号
    fc.constantFrom('x', 'y', '2', 'n').map(x => `\\sqrt{${x}}`),
    
    // 希腊字母
    fc.constantFrom('\\alpha', '\\beta', '\\gamma', '\\delta', '\\theta', '\\pi'),
    
    // 求和
    fc.tuple(
      fc.constantFrom('i', 'j', 'k'),
      fc.constantFrom('1', '0', 'a'),
      fc.constantFrom('n', 'm', 'b')
    ).map(([var_, from, to]) => `\\sum_{${var_}=${from}}^{${to}}`),
    
    // 积分
    fc.tuple(
      fc.constantFrom('0', 'a', '-\\infty'),
      fc.constantFrom('1', 'b', '\\infty')
    ).map(([from, to]) => `\\int_{${from}}^{${to}}`),
    
    // 括号
    fc.constantFrom('x', 'a', 'y').map(x => `\\left( ${x} \\right)`),
    
    // 函数
    fc.tuple(
      fc.constantFrom('\\sin', '\\cos', '\\tan', '\\log', '\\ln'),
      fc.constantFrom('x', 'y', 'theta')
    ).map(([fn, arg]) => `${fn}(${arg})`),
    
    // 矩阵（简单 2x2）
    fc.constantFrom(
      '\\begin{matrix} a & b \\\\ c & d \\end{matrix}',
      '\\begin{matrix} 1 & 2 \\\\ 3 & 4 \\end{matrix}'
    ),
    
    // 多行公式
    fc.constantFrom(
      '\\begin{aligned} x &= 1 \\\\ y &= 2 \\end{aligned}',
      '\\begin{cases} x, & \\text{if } x > 0 \\\\ 0, & \\text{otherwise} \\end{cases}'
    )
  );

  it('属性 1：对于任何有效的 LaTeX 公式，输出必须是单个 <svg> 元素', async () => {
    await fc.assert(
      fc.asyncProperty(validLatexArbitrary, async (latex) => {
        // 渲染 LaTeX
        const result = await generator.renderLatex(latex);
        
        // 验证没有错误
        expect(result.errors).toHaveLength(0);
        
        // 验证 SVG 元素存在
        expect(result.svg).toBeDefined();
        expect(result.svg.tagName.toLowerCase()).toBe('svg');
        
        // 验证输出为单个 SVG 元素
        // 通过检查 SVG 字符串中 <svg> 标签的数量
        const svgTagCount = (result.svgString.match(/<svg/g) || []).length;
        expect(svgTagCount).toBe(1);
        
        // 验证 SVG 包含 viewBox 属性
        const viewBox = result.svg.getAttribute('viewBox');
        expect(viewBox).toBeTruthy();
        expect(viewBox).toMatch(/^[\d\s.-]+$/); // viewBox 格式：数字和空格
        
        // 验证 SVG 至少包含 <path>, <use>, 或 <defs> 中之一
        // （适配 MathJax v4 实际输出结构）
        const hasPath = result.svg.querySelector('path') !== null;
        const hasUse = result.svg.querySelector('use') !== null;
        const hasDefs = result.svg.querySelector('defs') !== null;
        
        expect(hasPath || hasUse || hasDefs).toBe(true);
      }),
      { 
        numRuns: 100, // 至少 100 次迭代
        verbose: true, // 显示详细信息
      }
    );
  }, 60000); // 增加测试超时时间到 60 秒

  /**
   * 属性 2：有效 LaTeX 渲染完整性
   * 验证需求：A2.5, A2.6
   * 
   * 对于任何有效的 LaTeX 公式，Web_Formula_Generator 必须成功渲染为 SVG
   * 并在预览区域显示，且 SVG 必须包含必要的结构元素
   */
  it('属性 2：对于任何有效的 LaTeX 公式，必须成功渲染为 SVG 并包含必要结构', async () => {
    await fc.assert(
      fc.asyncProperty(validLatexArbitrary, async (latex) => {
        // 渲染 LaTeX
        const result = await generator.renderLatex(latex);
        
        // 验证有效 LaTeX 能成功渲染为 SVG（需求 A2.5）
        expect(result.svg).toBeDefined();
        expect(result.svg.tagName.toLowerCase()).toBe('svg');
        expect(result.svgString).toBeTruthy();
        expect(result.svgString.length).toBeGreaterThan(0);
        
        // 验证 SVG 包含 viewBox 属性
        const viewBox = result.svg.getAttribute('viewBox');
        expect(viewBox).toBeTruthy();
        expect(viewBox).toMatch(/^[\d\s.-]+$/);
        
        // 验证 SVG 至少包含 <path>, <use>, 或 <defs> 中之一
        // （适配 MathJax v4 实际输出结构）
        const hasPath = result.svg.querySelector('path') !== null;
        const hasUse = result.svg.querySelector('use') !== null;
        const hasDefs = result.svg.querySelector('defs') !== null;
        
        expect(hasPath || hasUse || hasDefs).toBe(true);
        
        // 验证无错误信息（需求 A2.6）
        expect(result.errors).toHaveLength(0);
        
        // 验证 SVG 尺寸有效
        expect(result.width).toBeGreaterThan(0);
        expect(result.height).toBeGreaterThan(0);
      }),
      { 
        numRuns: 100, // 至少 100 次迭代
        verbose: true, // 显示详细信息
      }
    );
  }, 60000); // 增加测试超时时间到 60 秒
});
