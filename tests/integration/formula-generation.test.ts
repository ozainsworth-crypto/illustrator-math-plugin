/**
 * 集成测试：LaTeX → SVG 完整流程
 * 测试输入 LaTeX → 渲染 → 预览 → 导出的完整流程
 */

import { describe, it, expect, beforeAll } from 'vitest';
import { WebFormulaGenerator } from '../../src/lib/formula-generator';

describe('LaTeX → SVG 完整流程集成测试', () => {
  let generator: WebFormulaGenerator;

  beforeAll(() => {
    // 创建公式生成器实例
    generator = new WebFormulaGenerator({
      mathjaxVersion: '4.1.0',
      outputFormat: 'svg',
      displayMode: true,
    });
  });

  it('应该成功渲染简单的 LaTeX 公式', async () => {
    const latex = '\\frac{a}{b}';
    const result = await generator.renderLatex(latex);

    // 验证无错误
    expect(result.errors).toHaveLength(0);

    // 验证 SVG 输出非空
    expect(result.svg).toBeDefined();
    expect(result.svgString).not.toBe('');

    // 验证 SVG 包含 viewBox 属性
    const viewBox = result.svg.getAttribute('viewBox');
    expect(viewBox).toBeTruthy();

    // 验证 SVG 包含必要的结构元素
    const hasStructure =
      result.svg.querySelector('g') !== null ||
      result.svg.querySelector('path') !== null ||
      result.svg.querySelector('use') !== null ||
      result.svg.querySelector('defs') !== null;
    expect(hasStructure).toBe(true);
  });

  it('应该成功渲染复杂的 LaTeX 公式', async () => {
    const latex = '\\sum_{i=1}^{n} x_i';
    const result = await generator.renderLatex(latex);

    // 验证无错误
    expect(result.errors).toHaveLength(0);

    // 验证 SVG 输出非空
    expect(result.svg).toBeDefined();
    expect(result.svgString).not.toBe('');

    // 验证 SVG 尺寸
    expect(result.width).toBeGreaterThan(0);
    expect(result.height).toBeGreaterThan(0);
  });

  it('应该处理无效的 LaTeX 输入', async () => {
    const latex = '\\invalid{command}';
    const result = await generator.renderLatex(latex);

    // 可能有错误或成功渲染（取决于 MathJax 的容错性）
    // 至少应该返回一个结果
    expect(result).toBeDefined();
    expect(result.svg).toBeDefined();
  });

  it('应该返回正确的 MathJax 版本', () => {
    const version = generator.getMathJaxVersion();
    expect(version).toBe('4.1.0');
  });
});
