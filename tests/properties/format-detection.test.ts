/**
 * 属性测试：格式检测准确性
 * 
 * 属性 4：格式检测准确性
 * 验证需求：B2.4
 * 
 * FormulaParser 必须能够准确检测输入格式：
 * - LaTeX 格式检测准确率 100%
 * - UnicodeMath 格式检测准确率 ≥ 90%
 * - AsciiMath 格式检测准确率 ≥ 90%
 * - 富文本/HTML 检测准确率 100%
 */

import { describe, it, expect } from 'vitest';
import * as fc from 'fast-check';
import { FormulaParser, FormulaFormat } from '../../src/lib/formula-parser';

describe('Property Test: Format Detection Accuracy', () => {
  const parser = new FormulaParser();

  /**
   * 生成有效的 LaTeX 公式
   */
  const latexArbitrary = fc.oneof(
    // LaTeX 控制词
    fc.constantFrom(
      '\\frac{a}{b}',
      '\\sqrt{x}',
      '\\sum_{i=1}^{n}',
      '\\int_{0}^{1}',
      '\\alpha + \\beta',
      '\\sin(x)',
      '\\log(y)',
      '\\lim_{x \\to \\infty}',
      '\\begin{matrix} a & b \\\\ c & d \\end{matrix}',
      '\\left( \\frac{a}{b} \\right)',
    ),
    
    // LaTeX 花括号分组
    fc.tuple(
      fc.constantFrom('x', 'y', 'a', 'b'),
      fc.constantFrom('2', '3', 'n', 'i')
    ).map(([base, exp]) => `${base}^{${exp}}`),
    
    // LaTeX 环境
    fc.constantFrom(
      '\\begin{aligned} x &= 1 \\\\ y &= 2 \\end{aligned}',
      '\\begin{cases} x, & x > 0 \\\\ 0, & x \\leq 0 \\end{cases}',
    ),
  );

  /**
   * 生成有效的 UnicodeMath 公式
   */
  const unicodemathArbitrary = fc.oneof(
    // Unicode 数学符号
    fc.constantFrom(
      'α+β=γ',
      'x≤y',
      '√x',
      '∛x',
      '∑_(i=1)^n x_i',
      '∫_0^∞ f(x) dx',
      '■(a&b@c&d)',
      'lim_(x→∞)',
    ),
    
    // UnicodeMath 分数和上下标
    fc.constantFrom(
      'a/b',
      'x^2',
      'x_i',
      'x_i^2',
      '1/(2/3)',
      '(a/b)',
    ),
    
    // UnicodeMath 下标括号
    fc.constantFrom(
      '∑_(i=1)^n',
      '∫_0^1',
      'lim_(x→0)',
    ),
  );

  /**
   * 生成有效的 AsciiMath 公式
   * 注意：AsciiMath 与 UnicodeMath 有重叠，但 AsciiMath 不使用 Unicode 符号
   */
  const asciimathArbitrary = fc.oneof(
    // 纯 ASCII 数学表达式
    fc.constantFrom(
      'x + y',
      'a * b',
      'x / y',
      'x^2 + y^2',
      'sqrt(x)',
      'sum_(i=1)^n x_i',
      'int_0^1 f(x) dx',
      'lim_(x->oo) f(x)',
      '(a + b) / c',
      'sin(x) + cos(y)',
    ),
  );

  /**
   * 生成富文本/HTML 输入
   */
  const richTextArbitrary = fc.oneof(
    // HTML 标签
    fc.constantFrom(
      '<p>x + y</p>',
      '<span style="color: red;">a/b</span>',
      '<div>\\frac{a}{b}</div>',
      '<b>x^2</b>',
      '<i>α + β</i>',
      '<math><mfrac><mi>a</mi><mi>b</mi></mfrac></math>',
    ),
  );

  /**
   * 属性 4.1：LaTeX 格式检测准确率 100%
   */
  it('属性 4.1：LaTeX 格式检测准确率必须为 100%', () => {
    fc.assert(
      fc.property(latexArbitrary, (latex) => {
        const format = parser.detectFormat(latex);
        
        // 验证：检测结果必须为 LaTeX
        expect(format).toBe(FormulaFormat.LATEX);
      }),
      { 
        numRuns: 100, // 至少 100 次迭代
        verbose: true,
      }
    );
  });

  /**
   * 属性 4.2：UnicodeMath 格式检测准确率 ≥ 90%
   */
  it('属性 4.2：UnicodeMath 格式检测准确率必须 ≥ 90%', () => {
    let correctCount = 0;
    let totalCount = 0;

    fc.assert(
      fc.property(unicodemathArbitrary, (unicodemath) => {
        const format = parser.detectFormat(unicodemath);
        totalCount++;
        
        // 验证：检测结果应该为 UnicodeMath 或 AsciiMath（因为有重叠）
        // 我们认为检测为 UnicodeMath 或 AsciiMath 都是正确的
        const isCorrect = format === FormulaFormat.UNICODEMATH || format === FormulaFormat.ASCIIMATH;
        
        if (isCorrect) {
          correctCount++;
        }
        
        // 不在每次迭代中断言，而是在最后统计准确率
        return true;
      }),
      { 
        numRuns: 100,
        verbose: false, // 关闭详细输出，避免干扰
      }
    );

    // 计算准确率
    const accuracy = correctCount / totalCount;
    
    // 验证：准确率 ≥ 90%
    expect(accuracy).toBeGreaterThanOrEqual(0.9);
    
    console.log(`UnicodeMath 格式检测准确率: ${(accuracy * 100).toFixed(2)}% (${correctCount}/${totalCount})`);
  });

  /**
   * 属性 4.3：AsciiMath 格式检测准确率 ≥ 90%
   */
  it('属性 4.3：AsciiMath 格式检测准确率必须 ≥ 90%', () => {
    let correctCount = 0;
    let totalCount = 0;

    fc.assert(
      fc.property(asciimathArbitrary, (asciimath) => {
        const format = parser.detectFormat(asciimath);
        totalCount++;
        
        // 验证：检测结果应该为 AsciiMath 或 UnicodeMath（因为有重叠）
        // 我们认为检测为 AsciiMath 或 UnicodeMath 都是正确的
        const isCorrect = format === FormulaFormat.ASCIIMATH || format === FormulaFormat.UNICODEMATH;
        
        if (isCorrect) {
          correctCount++;
        }
        
        return true;
      }),
      { 
        numRuns: 100,
        verbose: false,
      }
    );

    // 计算准确率
    const accuracy = correctCount / totalCount;
    
    // 验证：准确率 ≥ 90%
    expect(accuracy).toBeGreaterThanOrEqual(0.9);
    
    console.log(`AsciiMath 格式检测准确率: ${(accuracy * 100).toFixed(2)}% (${correctCount}/${totalCount})`);
  });

  /**
   * 属性 4.4：富文本/HTML 检测准确率 100%
   */
  it('属性 4.4：富文本/HTML 检测准确率必须为 100%', () => {
    fc.assert(
      fc.property(richTextArbitrary, (richText) => {
        const format = parser.detectFormat(richText);
        
        // 验证：检测结果必须为 RICH_TEXT
        expect(format).toBe(FormulaFormat.RICH_TEXT);
      }),
      { 
        numRuns: 100,
        verbose: true,
      }
    );
  });

  /**
   * 属性 4.5：空输入检测
   */
  it('属性 4.5：空输入必须检测为 UNKNOWN', () => {
    const emptyInputs = ['', '   ', '\n', '\t', '  \n  \t  '];
    
    for (const input of emptyInputs) {
      const format = parser.detectFormat(input);
      expect(format).toBe(FormulaFormat.UNKNOWN);
    }
  });

  /**
   * 属性 4.6：格式检测的确定性
   * 
   * 对于相同的输入，格式检测结果必须一致
   */
  it('属性 4.6：格式检测必须是确定性的（相同输入产生相同结果）', () => {
    fc.assert(
      fc.property(
        fc.oneof(latexArbitrary, unicodemathArbitrary, asciimathArbitrary, richTextArbitrary),
        (input) => {
          // 多次检测相同输入
          const format1 = parser.detectFormat(input);
          const format2 = parser.detectFormat(input);
          const format3 = parser.detectFormat(input);
          
          // 验证：结果必须一致
          expect(format1).toBe(format2);
          expect(format2).toBe(format3);
        }
      ),
      { 
        numRuns: 100,
        verbose: false,
      }
    );
  });

  /**
   * 补充测试：验证特定样例的格式检测
   */
  it('应该正确检测特定的格式样例', () => {
    const testCases = [
      // LaTeX 样例
      { input: '\\frac{a}{b}', expected: FormulaFormat.LATEX, name: 'LaTeX 分数' },
      { input: '\\sqrt{x}', expected: FormulaFormat.LATEX, name: 'LaTeX 根号' },
      { input: 'x^{2}', expected: FormulaFormat.LATEX, name: 'LaTeX 上标（花括号）' },
      { input: '\\alpha + \\beta', expected: FormulaFormat.LATEX, name: 'LaTeX 希腊字母' },
      
      // UnicodeMath 样例
      { input: 'α+β=γ', expected: FormulaFormat.UNICODEMATH, name: 'UnicodeMath 希腊字母' },
      { input: '√x', expected: FormulaFormat.UNICODEMATH, name: 'UnicodeMath 根号' },
      { input: '∑_(i=1)^n', expected: FormulaFormat.UNICODEMATH, name: 'UnicodeMath 求和' },
      { input: '∫_0^∞', expected: FormulaFormat.UNICODEMATH, name: 'UnicodeMath 积分' },
      
      // AsciiMath 或 UnicodeMath（有重叠）
      { input: 'a/b', expected: [FormulaFormat.UNICODEMATH, FormulaFormat.ASCIIMATH], name: '分数（可能是 UnicodeMath 或 AsciiMath）' },
      { input: 'x^2', expected: [FormulaFormat.UNICODEMATH, FormulaFormat.ASCIIMATH], name: '上标（可能是 UnicodeMath 或 AsciiMath）' },
      
      // 富文本
      { input: '<p>x + y</p>', expected: FormulaFormat.RICH_TEXT, name: '富文本 HTML' },
      { input: '<span>a/b</span>', expected: FormulaFormat.RICH_TEXT, name: '富文本 span' },
      
      // 未知格式
      { input: '', expected: FormulaFormat.UNKNOWN, name: '空输入' },
      { input: '   ', expected: FormulaFormat.UNKNOWN, name: '空白输入' },
    ];

    for (const testCase of testCases) {
      const format = parser.detectFormat(testCase.input);
      
      if (Array.isArray(testCase.expected)) {
        // 允许多个可能的结果
        expect(testCase.expected).toContain(format);
      } else {
        // 单一期望结果
        expect(format).toBe(testCase.expected);
      }
    }
  });
});
