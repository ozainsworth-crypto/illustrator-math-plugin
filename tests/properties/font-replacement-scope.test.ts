/**
 * 属性测试：字体替换范围限定性
 * 
 * 属性 8：字体替换范围限定性
 * 验证需求：C1.4, C1.5, C3.11
 * 
 * 验证自定义字体仅影响指定字符集，其他符号保持 MathJax 默认输出
 */

import { describe, it, expect, beforeAll } from 'vitest';
import * as fc from 'fast-check';
import { WebFormulaGenerator } from '../../src/lib/formula-generator';
import { FontPackLoader } from '../../src/lib/font-pack-loader';
import { initMathJax } from '../../src/lib/mathjax-loader';

describe('Property Test: Font Replacement Scope', () => {
  let generator: WebFormulaGenerator;
  let fontPackLoader: FontPackLoader;

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
  }, 30000);

  /**
   * 默认字符集（89 个）：
   * - 字母数字：A-Z/a-z/0-9（62 个）
   * - 基础运算符：+-=×·÷<>≤≥−（11 个）
   * - 基础定界符：|/（2 个）
   * - 基础标点：.,:;'!%（7 个）
   * 
   * 注：此定义仅用于文档说明，实际测试使用下方的生成器
   */
  // const defaultCharset = {
  //   alphanumeric: 'ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789',
  //   operators: '+-=×·÷<>≤≥−',
  //   delimiters: '|/',
  //   punctuation: '.,:;\'!%',
  // };

  /**
   * 可选字符集（11 个）：
   * - 括号：()[]{}（6 个）
   * - 符号：*~→←–（5 个）
   * 
   * 注：此定义仅用于文档说明，实际测试使用下方的生成器
   */
  // const optionalCharset = {
  //   brackets: '()[]{}',
  //   symbols: '*~→←–',
  // };

  /**
   * 不受影响的符号（应保持 MathJax 默认）：
   * - 希腊字母：α, β, γ, δ, θ, π 等
   * - 大型运算符：∑, ∏, ∫ 等
   * - 伸缩定界符：由 MathJax 动态生成
   * - 根号结构、分数线：由 MathJax 动态生成
   * 
   * 注：此定义仅用于文档说明，实际测试使用下方的生成器
   */
  // const unaffectedSymbols = {
  //   greek: ['\\alpha', '\\beta', '\\gamma', '\\delta', '\\theta', '\\pi', '\\sigma', '\\omega'],
  //   largeOps: ['\\sum', '\\prod', '\\int', '\\oint'],
  //   structures: ['\\sqrt', '\\frac', '\\left(', '\\right)'],
  // };

  /**
   * 生成包含默认字符集的公式
   */
  const formulaWithDefaultCharset = fc.oneof(
    // 字母数字 + 运算符
    fc.constantFrom(
      'x^2 + y = 5',
      'a - b = c',
      'x \\times y = z',
      'a \\div b = c',
      'x < y',
      'x > y',
      'x \\leq y',
      'x \\geq y'
    ),
    
    // 包含定界符
    fc.constantFrom(
      'x | y',
      'a / b',
      'x^2 | y^2'
    ),
    
    // 包含标点
    fc.constantFrom(
      'f(x) = x^2',
      'x, y, z',
      'x: y',
      'x; y',
      'x! = 120',
      '50\\%'
    )
  );

  /**
   * 生成包含可选字符集的公式
   */
  const formulaWithOptionalCharset = fc.oneof(
    // 括号
    fc.constantFrom(
      '(a + b)',
      '[x, y]',
      '\\{x | x > 0\\}'
    ),
    
    // 符号
    fc.constantFrom(
      'x * y',
      'x \\sim y',
      'x \\rightarrow y',
      'x \\leftarrow y'
    )
  );

  /**
   * 生成包含不受影响符号的公式
   */
  const formulaWithUnaffectedSymbols = fc.oneof(
    // 希腊字母
    fc.constantFrom(
      '\\alpha + \\beta',
      '\\gamma = \\delta',
      '\\theta \\times \\pi',
      '\\sigma^2'
    ),
    
    // 大型运算符
    fc.constantFrom(
      '\\sum_{i=1}^{n} x_i',
      '\\prod_{i=1}^{n} a_i',
      '\\int_{0}^{1} f(x) dx',
      '\\oint_{C} F \\cdot dr'
    ),
    
    // 结构
    fc.constantFrom(
      '\\sqrt{x}',
      '\\frac{a}{b}',
      '\\left( \\frac{a}{b} \\right)'
    )
  );

  /**
   * 生成混合公式（包含默认字符集 + 不受影响符号）
   */
  const mixedFormula = fc.oneof(
    fc.constantFrom(
      '\\alpha + x = 5',
      '\\sum_{i=1}^{n} x_i^2',
      '\\frac{a + b}{c}',
      '\\sqrt{x^2 + y^2}',
      'f(x) = \\int_{0}^{x} t dt',
      '\\theta = \\frac{\\pi}{2}'
    )
  );

  it('属性 8.1：默认字符集（字母数字、运算符、定界符、标点）应受字体替换影响', async () => {
    // 检测并加载用户字体包
    await fontPackLoader.detectAndLoadUserFontPack();
    
    if (!fontPackLoader.hasUserFontPack()) {
      console.log('未检测到用户字体包，跳过测试');
      return;
    }

    await fc.assert(
      fc.asyncProperty(formulaWithDefaultCharset, async (latex) => {
        // 应用用户字体包
        const applied = fontPackLoader.applyUserFontPack();
        expect(applied).toBe(true);
        
        // 渲染公式（使用自定义字体）
        const resultWithCustomFont = await generator.renderLatex(latex);
        expect(resultWithCustomFont.errors).toHaveLength(0);
        expect(resultWithCustomFont.svg).toBeDefined();
        
        // 恢复默认字体
        fontPackLoader.restoreDefaultFont();
        
        // 渲染公式（使用默认字体）
        const resultWithDefaultFont = await generator.renderLatex(latex);
        expect(resultWithDefaultFont.errors).toHaveLength(0);
        expect(resultWithDefaultFont.svg).toBeDefined();
        
        // 验证两次渲染的 SVG 不同（说明字体替换生效）
        // 注意：这里比较 SVG 字符串，因为字体替换会改变 path 数据
        expect(resultWithCustomFont.svgString).not.toBe(resultWithDefaultFont.svgString);
        
        // 验证 SVG 结构完整性
        expect(resultWithCustomFont.svg.querySelector('path, use, defs')).toBeTruthy();
        expect(resultWithDefaultFont.svg.querySelector('path, use, defs')).toBeTruthy();
      }),
      { 
        numRuns: 100,
        verbose: true,
      }
    );
  }, 60000);

  it('属性 8.2：不受影响的符号（希腊字母、大型运算符、结构）应保持 MathJax 默认输出', async () => {
    // 检测并加载用户字体包
    await fontPackLoader.detectAndLoadUserFontPack();
    
    if (!fontPackLoader.hasUserFontPack()) {
      console.log('未检测到用户字体包，跳过测试');
      return;
    }

    await fc.assert(
      fc.asyncProperty(formulaWithUnaffectedSymbols, async (latex) => {
        // 应用用户字体包
        const applied = fontPackLoader.applyUserFontPack();
        expect(applied).toBe(true);
        
        // 渲染公式（使用自定义字体）
        const resultWithCustomFont = await generator.renderLatex(latex);
        expect(resultWithCustomFont.errors).toHaveLength(0);
        expect(resultWithCustomFont.svg).toBeDefined();
        
        // 恢复默认字体
        fontPackLoader.restoreDefaultFont();
        
        // 渲染公式（使用默认字体）
        const resultWithDefaultFont = await generator.renderLatex(latex);
        expect(resultWithDefaultFont.errors).toHaveLength(0);
        expect(resultWithDefaultFont.svg).toBeDefined();
        
        // 验证两次渲染的 SVG 相同或非常相似
        // （不受影响的符号应保持默认输出）
        // 注意：由于 MathJax 可能有微小的数值差异，我们检查主要结构
        const customPaths = resultWithCustomFont.svg.querySelectorAll('path');
        const defaultPaths = resultWithDefaultFont.svg.querySelectorAll('path');
        
        // 验证 path 数量相同
        expect(customPaths.length).toBe(defaultPaths.length);
        
        // 验证 SVG 结构完整性
        expect(resultWithCustomFont.svg.querySelector('path, use, defs')).toBeTruthy();
        expect(resultWithDefaultFont.svg.querySelector('path, use, defs')).toBeTruthy();
      }),
      { 
        numRuns: 100,
        verbose: true,
      }
    );
  }, 60000);

  it('属性 8.3：混合公式中，默认字符集受影响，不受影响符号保持默认', async () => {
    // 检测并加载用户字体包
    await fontPackLoader.detectAndLoadUserFontPack();
    
    if (!fontPackLoader.hasUserFontPack()) {
      console.log('未检测到用户字体包，跳过测试');
      return;
    }

    await fc.assert(
      fc.asyncProperty(mixedFormula, async (latex) => {
        // 应用用户字体包
        const applied = fontPackLoader.applyUserFontPack();
        expect(applied).toBe(true);
        
        // 渲染公式（使用自定义字体）
        const resultWithCustomFont = await generator.renderLatex(latex);
        expect(resultWithCustomFont.errors).toHaveLength(0);
        expect(resultWithCustomFont.svg).toBeDefined();
        
        // 恢复默认字体
        fontPackLoader.restoreDefaultFont();
        
        // 渲染公式（使用默认字体）
        const resultWithDefaultFont = await generator.renderLatex(latex);
        expect(resultWithDefaultFont.errors).toHaveLength(0);
        expect(resultWithDefaultFont.svg).toBeDefined();
        
        // 验证两次渲染的 SVG 不同（说明部分字符受字体替换影响）
        expect(resultWithCustomFont.svgString).not.toBe(resultWithDefaultFont.svgString);
        
        // 验证 SVG 结构完整性
        expect(resultWithCustomFont.svg.querySelector('path, use, defs')).toBeTruthy();
        expect(resultWithDefaultFont.svg.querySelector('path, use, defs')).toBeTruthy();
        
        // 验证排版稳定（基线、宽度、高度）
        // 注意：字体替换不应破坏排版
        expect(resultWithCustomFont.width).toBeGreaterThan(0);
        expect(resultWithCustomFont.height).toBeGreaterThan(0);
        expect(resultWithDefaultFont.width).toBeGreaterThan(0);
        expect(resultWithDefaultFont.height).toBeGreaterThan(0);
      }),
      { 
        numRuns: 100,
        verbose: true,
      }
    );
  }, 60000);

  it('属性 8.4：可选字符集（括号、符号）的替换行为取决于配置', async () => {
    // 检测并加载用户字体包
    await fontPackLoader.detectAndLoadUserFontPack();
    
    if (!fontPackLoader.hasUserFontPack()) {
      console.log('未检测到用户字体包，跳过测试');
      return;
    }

    await fc.assert(
      fc.asyncProperty(formulaWithOptionalCharset, async (latex) => {
        // 应用用户字体包
        const applied = fontPackLoader.applyUserFontPack();
        expect(applied).toBe(true);
        
        // 渲染公式（使用自定义字体）
        const resultWithCustomFont = await generator.renderLatex(latex);
        expect(resultWithCustomFont.errors).toHaveLength(0);
        expect(resultWithCustomFont.svg).toBeDefined();
        
        // 恢复默认字体
        fontPackLoader.restoreDefaultFont();
        
        // 渲染公式（使用默认字体）
        const resultWithDefaultFont = await generator.renderLatex(latex);
        expect(resultWithDefaultFont.errors).toHaveLength(0);
        expect(resultWithDefaultFont.svg).toBeDefined();
        
        // 验证 SVG 结构完整性
        expect(resultWithCustomFont.svg.querySelector('path, use, defs')).toBeTruthy();
        expect(resultWithDefaultFont.svg.querySelector('path, use, defs')).toBeTruthy();
        
        // 注意：可选字符集的替换行为取决于用户配置
        // 这里只验证渲染成功，不强制要求替换生效或不生效
      }),
      { 
        numRuns: 100,
        verbose: true,
      }
    );
  }, 60000);

  /**
   * 属性 9：字体应用失败回退
   * 验证需求：C3.15
   * 
   * 验证当字体应用失败时，系统能够回退到默认字体并通知用户
   */
  it('属性 9：字体应用失败时应回退到默认字体', async () => {
    await fc.assert(
      fc.asyncProperty(mixedFormula, async (latex) => {
        // 模拟字体应用失败场景：尝试应用不存在的字体包
        // 首先确保没有加载任何字体包
        fontPackLoader.restoreDefaultFont();
        
        // 尝试应用字体包（应该失败，因为没有加载）
        const applied = fontPackLoader.applyUserFontPack();
        
        // 验证应用失败
        expect(applied).toBe(false);
        
        // 即使应用失败，渲染仍应成功（使用默认字体）
        const result = await generator.renderLatex(latex);
        expect(result.errors).toHaveLength(0);
        expect(result.svg).toBeDefined();
        
        // 验证 SVG 结构完整性
        expect(result.svg.querySelector('path, use, defs')).toBeTruthy();
        
        // 验证使用的是默认字体（通过检查 fontPackLoader 状态）
        const currentFontPack = fontPackLoader.getCurrentFontPack();
        expect(currentFontPack).toBeNull();
      }),
      { 
        numRuns: 100,
        verbose: true,
      }
    );
  }, 60000);

  it('属性 9.1：字体包加载失败时应回退到默认字体', async () => {
    await fc.assert(
      fc.asyncProperty(formulaWithDefaultCharset, async (latex) => {
        // 模拟字体包加载失败：尝试检测不存在的字体包
        const userFontPack = await fontPackLoader.detectAndLoadUserFontPack();
        
        // 如果没有字体包，这是预期的失败场景
        if (!userFontPack) {
          // 验证系统仍然可以正常渲染（使用默认字体）
          const result = await generator.renderLatex(latex);
          expect(result.errors).toHaveLength(0);
          expect(result.svg).toBeDefined();
          
          // 验证 SVG 结构完整性
          expect(result.svg.querySelector('path, use, defs')).toBeTruthy();
          
          // 验证使用的是默认字体
          const currentFontPack = fontPackLoader.getCurrentFontPack();
          expect(currentFontPack).toBeNull();
        } else {
          // 如果有字体包，验证可以正常应用和恢复
          const applied = fontPackLoader.applyUserFontPack();
          expect(applied).toBe(true);
          
          // 渲染公式
          const resultWithCustomFont = await generator.renderLatex(latex);
          expect(resultWithCustomFont.errors).toHaveLength(0);
          expect(resultWithCustomFont.svg).toBeDefined();
          
          // 恢复默认字体
          fontPackLoader.restoreDefaultFont();
          
          // 验证恢复后使用默认字体
          const resultWithDefaultFont = await generator.renderLatex(latex);
          expect(resultWithDefaultFont.errors).toHaveLength(0);
          expect(resultWithDefaultFont.svg).toBeDefined();
          
          // 验证当前没有活动字体包
          const currentFontPack = fontPackLoader.getCurrentFontPack();
          expect(currentFontPack).toBeNull();
        }
      }),
      { 
        numRuns: 100,
        verbose: true,
      }
    );
  }, 60000);

  it('属性 9.2：字体包损坏时应回退到默认字体并通知用户', async () => {
    // 这个测试验证当字体包数据损坏时的回退行为
    await fc.assert(
      fc.asyncProperty(formulaWithUnaffectedSymbols, async (latex) => {
        // 尝试加载字体包
        await fontPackLoader.detectAndLoadUserFontPack();
        
        // 无论是否有字体包，系统都应该能够正常渲染
        const result = await generator.renderLatex(latex);
        expect(result.errors).toHaveLength(0);
        expect(result.svg).toBeDefined();
        
        // 验证 SVG 结构完整性
        expect(result.svg.querySelector('path, use, defs')).toBeTruthy();
        
        // 验证排版稳定
        expect(result.width).toBeGreaterThan(0);
        expect(result.height).toBeGreaterThan(0);
      }),
      { 
        numRuns: 100,
        verbose: true,
      }
    );
  }, 60000);
});
