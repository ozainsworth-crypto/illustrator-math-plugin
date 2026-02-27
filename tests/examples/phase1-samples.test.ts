/**
 * 样例测试：10 条关键公式样例
 * 
 * 验证需求：A3.9
 * 
 * 每条样例验证：
 * 1. 可渲染（无错误）
 * 2. 可导出（SVG 字符串非空）
 * 3. 预览一致（SVG 包含必要结构）
 */

import { describe, it, expect, beforeAll } from 'vitest';
import { WebFormulaGenerator } from '../../src/lib/formula-generator';
import { initMathJax } from '../../src/lib/mathjax-loader';

describe('Phase 1 样例测试：10 条关键公式', () => {
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
   * 通用验证函数：验证公式可渲染、可导出、预览一致
   */
  async function validateFormula(latex: string, description: string): Promise<void> {
    const result = await generator.renderLatex(latex);

    // 1. 可渲染（无错误）
    expect(result.errors, `${description} - 应该无错误`).toHaveLength(0);

    // 2. 可导出（SVG 字符串非空）
    expect(result.svgString, `${description} - SVG 字符串应该非空`).toBeTruthy();
    expect(result.svgString.length, `${description} - SVG 字符串长度应该大于 0`).toBeGreaterThan(0);

    // 3. 预览一致（SVG 包含必要结构）
    expect(result.svg, `${description} - SVG 元素应该存在`).toBeDefined();
    expect(result.svg.tagName.toLowerCase(), `${description} - 应该是 svg 元素`).toBe('svg');

    // 验证 SVG 包含 viewBox 属性
    const viewBox = result.svg.getAttribute('viewBox');
    expect(viewBox, `${description} - 应该包含 viewBox 属性`).toBeTruthy();

    // 验证 SVG 至少包含 <path>, <use>, 或 <defs> 中之一
    const hasPath = result.svg.querySelector('path') !== null;
    const hasUse = result.svg.querySelector('use') !== null;
    const hasDefs = result.svg.querySelector('defs') !== null;
    expect(hasPath || hasUse || hasDefs, `${description} - 应该包含必要的结构元素`).toBe(true);

    // 验证 SVG 尺寸有效
    expect(result.width, `${description} - 宽度应该大于 0`).toBeGreaterThan(0);
    expect(result.height, `${description} - 高度应该大于 0`).toBeGreaterThan(0);
  }

  it('样例 1：分数 - \\frac{a}{b}', async () => {
    await validateFormula('\\frac{a}{b}', '分数');
  });

  it('样例 2：嵌套分数 - \\frac{1}{\\frac{2}{3}}', async () => {
    await validateFormula('\\frac{1}{\\frac{2}{3}}', '嵌套分数');
  });

  it('样例 3：上下标 - x^2 和 x_i^2', async () => {
    // 测试简单上标
    await validateFormula('x^2', '简单上标');
    
    // 测试上下标组合
    await validateFormula('x_i^2', '上下标组合');
  });

  it('样例 4：矩阵 - \\begin{matrix} a & b \\\\ c & d \\end{matrix}', async () => {
    await validateFormula('\\begin{matrix} a & b \\\\ c & d \\end{matrix}', '矩阵');
  });

  it('样例 5：根号 - \\sqrt{x} 和 \\sqrt[3]{x}', async () => {
    // 测试平方根
    await validateFormula('\\sqrt{x}', '平方根');
    
    // 测试 n 次根
    await validateFormula('\\sqrt[3]{x}', 'n 次根');
  });

  it('样例 6：求和 - \\sum_{i=1}^{n} x_i', async () => {
    await validateFormula('\\sum_{i=1}^{n} x_i', '求和');
  });

  it('样例 7：积分 - \\int_{0}^{\\infty} f(x) dx', async () => {
    await validateFormula('\\int_{0}^{\\infty} f(x) dx', '积分');
  });

  it('样例 8：括号伸缩 - \\left( \\frac{a}{b} \\right)', async () => {
    await validateFormula('\\left( \\frac{a}{b} \\right)', '括号伸缩');
  });

  it('样例 9：希腊字母 - \\alpha + \\beta = \\gamma', async () => {
    await validateFormula('\\alpha + \\beta = \\gamma', '希腊字母');
  });

  it('样例 10：函数名 - \\sin(x) + \\log(y)', async () => {
    await validateFormula('\\sin(x) + \\log(y)', '函数名');
  });

  /**
   * 额外测试：多行公式（需求 A3.9 中提到）
   */
  it('样例 11（额外）：多行公式 - aligned', async () => {
    await validateFormula('\\begin{aligned} x &= 1 \\\\ y &= 2 \\end{aligned}', '多行公式 aligned');
  });

  it('样例 12（额外）：多行公式 - cases', async () => {
    await validateFormula('\\begin{cases} x, & \\text{if } x > 0 \\\\ 0, & \\text{otherwise} \\end{cases}', '多行公式 cases');
  });

  /**
   * 额外测试：组合复杂表达（需求 A3.9 中提到）
   */
  it('样例 13（额外）：组合复杂表达 - f(x) = \\frac{\\sum_{i=1}^{n} x_i^2}{\\sqrt{n}}', async () => {
    await validateFormula('f(x) = \\frac{\\sum_{i=1}^{n} x_i^2}{\\sqrt{n}}', '组合复杂表达');
  });
});
