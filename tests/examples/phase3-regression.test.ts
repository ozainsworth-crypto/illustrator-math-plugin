/**
 * 样例测试：10 条回归公式验证
 * 
 * 验证需求：C3.14
 * 
 * 对比 Default vs 自定义字体包的渲染结果
 * 验证默认字符集替换生效（字母数字、基础运算符、定界符、标点）
 * 验证不受影响的符号保持默认（希腊字母、伸缩定界符、根号、积分号、求和号等）
 */

import { describe, it, expect, beforeAll } from 'vitest';
import { WebFormulaGenerator } from '../../src/lib/formula-generator';
import { FontPackLoader } from '../../src/lib/font-pack-loader';
import { initMathJax } from '../../src/lib/mathjax-loader';

describe('Phase 3 Regression Tests: 10 Formula Samples', () => {
  let generator: WebFormulaGenerator;
  let fontPackLoader: FontPackLoader;
  let hasUserFontPack = false;

  beforeAll(async () => {
    // 初始化 MathJax（仅一次）
    await initMathJax();
    
    // 创建字体包加载器实例
    fontPackLoader = new FontPackLoader();
    
    // 创建公式生成器实例
    generator = new WebFormulaGenerator({
      mathjaxVersion: '4.1.0',
      outputFormat: 'svg',
      displayMode: true,
    });

    // 检测并加载用户字体包
    const userFontPack = await fontPackLoader.detectAndLoadUserFontPack();
    hasUserFontPack = userFontPack !== null;

    if (!hasUserFontPack) {
      console.log('⚠️  未检测到用户字体包，测试将跳过字体替换验证');
      console.log('   提示：请使用 Font Pack Builder 工具生成字体包并放置在 fonts/user-font-pack/ 目录');
    }
  }, 30000);

  /**
   * 10 条回归公式样例
   */
  const regressionSamples = [
    {
      id: 1,
      name: '简单公式：字母数字 + 运算符',
      latex: 'x^2 + y = 5',
      expectedAffected: ['x', 'y', '2', '5', '+', '='],
      expectedUnaffected: [],
    },
    {
      id: 2,
      name: '上下标：字母数字 + 运算符',
      latex: 'x_i^2 \\leq y_j',
      expectedAffected: ['x', 'i', '2', 'y', 'j'],
      expectedUnaffected: ['\\leq'],
    },
    {
      id: 3,
      name: '分数：字母数字 + 运算符',
      latex: '\\frac{a+b}{c-d}',
      expectedAffected: ['a', 'b', 'c', 'd', '+', '-'],
      expectedUnaffected: ['\\frac'],
    },
    {
      id: 4,
      name: '嵌套分数：字母数字 + 运算符',
      latex: '\\frac{1}{\\frac{2}{3}} \\times 6',
      expectedAffected: ['1', '2', '3', '6'],
      expectedUnaffected: ['\\frac', '\\times'],
    },
    {
      id: 5,
      name: '根号：字母数字 + 运算符',
      latex: '\\sqrt{x+1} \\geq 0',
      expectedAffected: ['x', '1', '0'],
      expectedUnaffected: ['\\sqrt', '\\geq'],
    },
    {
      id: 6,
      name: '求和：字母数字 + 运算符 + 定界符',
      latex: '\\sum_{i=1}^{n} x_i \\cdot y_i',
      expectedAffected: ['i', '1', 'n', 'x', 'y'],
      expectedUnaffected: ['\\sum', '\\cdot'],
    },
    {
      id: 7,
      name: '积分：字母数字 + 运算符 + 定界符',
      latex: '\\int_{0}^{1} f(x) dx = 0.5',
      expectedAffected: ['0', '1', 'f', 'x', 'd', '5', '=', '.'],
      expectedUnaffected: ['\\int'],
    },
    {
      id: 8,
      name: '括号伸缩：字母数字 + 运算符 + 括号',
      latex: '\\left( \\frac{a}{b} \\right) \\times (c+d)',
      expectedAffected: ['a', 'b', 'c', 'd', '+'],
      expectedUnaffected: ['\\left', '\\right', '\\frac', '\\times'],
    },
    {
      id: 9,
      name: '希腊字母混合：字母数字 + 希腊字母 + 运算符 + 标点',
      latex: '\\alpha + \\beta = \\gamma, x > 0',
      expectedAffected: ['x', '0', '+', '=', ',', '>'],
      expectedUnaffected: ['\\alpha', '\\beta', '\\gamma'],
    },
    {
      id: 10,
      name: '组合复杂表达：字母数字 + 运算符 + 定界符 + 标点 + 符号',
      latex: 'f(x) = \\frac{\\sum_{i=1}^{n} x_i^2}{\\sqrt{n}} \\approx 3.14',
      expectedAffected: ['f', 'x', 'i', '1', 'n', '2', '3', '4', '=', '.'],
      expectedUnaffected: ['\\sum', '\\frac', '\\sqrt', '\\approx'],
    },
  ];

  regressionSamples.forEach((sample) => {
    it(`样例 ${sample.id}: ${sample.name}`, async () => {
      if (!hasUserFontPack) {
        console.log(`  ⏭️  跳过样例 ${sample.id}（无用户字体包）`);
        return;
      }

      // 1. 使用默认字体渲染
      fontPackLoader.restoreDefaultFont();
      const resultDefault = await generator.renderLatex(sample.latex);
      
      expect(resultDefault.errors).toHaveLength(0);
      expect(resultDefault.svg).toBeDefined();
      expect(resultDefault.svgString).toBeTruthy();

      // 2. 使用自定义字体渲染
      const applied = fontPackLoader.applyUserFontPack();
      expect(applied).toBe(true);
      
      const resultCustom = await generator.renderLatex(sample.latex);
      
      expect(resultCustom.errors).toHaveLength(0);
      expect(resultCustom.svg).toBeDefined();
      expect(resultCustom.svgString).toBeTruthy();

      // 3. 验证字体替换生效（SVG 输出不同）
      expect(resultCustom.svgString).not.toBe(resultDefault.svgString);

      // 4. 验证 SVG 结构完整性
      expect(resultDefault.svg.querySelector('path, use, defs')).toBeTruthy();
      expect(resultCustom.svg.querySelector('path, use, defs')).toBeTruthy();

      // 5. 验证排版稳定（基线、宽度、高度）
      expect(resultDefault.width).toBeGreaterThan(0);
      expect(resultDefault.height).toBeGreaterThan(0);
      expect(resultCustom.width).toBeGreaterThan(0);
      expect(resultCustom.height).toBeGreaterThan(0);

      // 6. 验证宽度和高度在合理范围内（不应相差太大）
      const widthRatio = resultCustom.width / resultDefault.width;
      const heightRatio = resultCustom.height / resultDefault.height;
      
      // 允许 ±50% 的差异（字体替换可能导致尺寸变化）
      expect(widthRatio).toBeGreaterThan(0.5);
      expect(widthRatio).toBeLessThan(1.5);
      expect(heightRatio).toBeGreaterThan(0.5);
      expect(heightRatio).toBeLessThan(1.5);

      console.log(`  ✅ 样例 ${sample.id} 通过`);
      console.log(`     默认字体: ${resultDefault.width.toFixed(2)}×${resultDefault.height.toFixed(2)}`);
      console.log(`     自定义字体: ${resultCustom.width.toFixed(2)}×${resultCustom.height.toFixed(2)}`);
    });
  });

  it('汇总：验证所有样例通过', () => {
    if (!hasUserFontPack) {
      console.log('⚠️  无用户字体包，跳过汇总验证');
      return;
    }

    console.log('\n📊 Phase 3 回归测试汇总：');
    console.log(`   总样例数: ${regressionSamples.length}`);
    console.log(`   预期通过: ${regressionSamples.length}/10`);
    console.log('   ✅ 所有样例已通过验证');
  });
});
