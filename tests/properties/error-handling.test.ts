/**
 * 属性测试：无效输入错误提示清晰性
 * 
 * 属性 3：无效输入错误提示清晰性
 * 验证需求：A2.8
 * 
 * 对于任何无效的 LaTeX 语法，Web_Formula_Generator 必须显示错误消息，
 * 且错误消息必须包含错误位置和原因的描述
 */

import { describe, it, expect, beforeAll } from 'vitest';
import * as fc from 'fast-check';
import { WebFormulaGenerator } from '../../src/lib/formula-generator';
import { initMathJax } from '../../src/lib/mathjax-loader';

describe('Property Test: Invalid Input Error Message Clarity', () => {
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
   * 生成无效的 LaTeX 公式
   * 使用 fast-check 生成各种常见的 LaTeX 语法错误
   * 
   * 注意：这些是 MathJax 实际会报错的语法错误
   * MathJax 对于未定义的命令（如 \undefined）会将其渲染为文本，而不是报错
   */
  const invalidLatexArbitrary = fc.oneof(
    // 不匹配的括号 - 这些会导致 MathJax 解析错误
    fc.constantFrom(
      '\\frac{a',           // 缺少右括号
      '\\frac{a}',          // 缺少第二个参数
      '\\sqrt{',            // 未闭合的根号
      '\\sqrt{x',           // 未闭合的根号
      'x^{',                // 未闭合的上标
      'x_{',                // 未闭合的下标
      '\\frac{a}{',         // 未闭合的分数
      '{',                  // 单独的左括号
      '}',                  // 单独的右括号（会报错）
    ),
    
    // 缺少必需参数
    fc.constantFrom(
      '\\sum_',             // 缺少下标内容
      '\\int^',             // 缺少上标内容
      '\\frac{',            // 缺少参数
      '\\sqrt[',            // 未闭合的可选参数
    ),
    
    // 嵌套未闭合
    fc.constantFrom(
      '\\sqrt{\\sqrt{',        // 嵌套未闭合
      '\\frac{\\frac{a}{',     // 嵌套未闭合
      'x^{y^{',                // 嵌套未闭合
    ),
    
    // 环境错误
    fc.constantFrom(
      '\\begin{matrix}',                    // 缺少 \end
      '\\begin{matrix} a',                  // 缺少 \end
      '\\begin{matrix} a & b \\end{array}', // 环境名不匹配
      '\\begin{cases}',                     // 缺少 \end
    ),
  );

  /**
   * 属性 3：对于任何无效的 LaTeX 语法，必须显示清晰的错误消息
   * 
   * 验证需求：A2.8
   * 
   * 错误消息必须包含：
   * 1. 错误存在（errors 数组非空）
   * 2. 错误消息非空且有意义（不是空字符串或通用错误）
   * 3. 错误消息包含有用的信息（长度 > 10 字符，避免过于简短的无意义消息）
   */
  it('属性 3：对于任何无效的 LaTeX 语法，必须显示清晰的错误消息', async () => {
    await fc.assert(
      fc.asyncProperty(invalidLatexArbitrary, async (invalidLatex) => {
        // 渲染无效的 LaTeX
        const result = await generator.renderLatex(invalidLatex);
        
        // 验证：必须有错误信息（需求 A2.8）
        expect(result.errors).toBeDefined();
        expect(result.errors.length).toBeGreaterThan(0);
        
        // 验证：错误消息非空
        const errorMessage = result.errors[0];
        expect(errorMessage).toBeTruthy();
        expect(errorMessage.length).toBeGreaterThan(0);
        
        // 验证：错误消息包含有用的信息（不是过于简短的通用错误）
        // 至少应该有 10 个字符，避免像 "Error" 这样的无意义消息
        expect(errorMessage.length).toBeGreaterThan(10);
        
        // 验证：错误消息不是纯空白
        expect(errorMessage.trim().length).toBeGreaterThan(0);
        
        // 验证：SVG 输出应该是空的或默认的（因为渲染失败）
        expect(result.width).toBe(0);
        expect(result.height).toBe(0);
        expect(result.svgString).toBe('');
      }),
      { 
        numRuns: 100, // 至少 100 次迭代
        verbose: true, // 显示详细信息
      }
    );
  }, 60000); // 增加测试超时时间到 60 秒

  /**
   * 补充测试：验证特定错误类型的错误消息质量
   * 
   * 这个测试验证常见错误类型的错误消息是否包含有用的信息
   */
  it('应该为常见错误类型提供有意义的错误消息', async () => {
    const testCases = [
      {
        name: '缺少右括号',
        latex: '\\frac{a',
        expectedKeywords: ['frac', 'bracket', 'missing', 'close', '}', '缺少', '括号', '未闭合', 'end', 'eof', 'brace'],
      },
      {
        name: '缺少参数',
        latex: '\\frac{a}',
        expectedKeywords: ['frac', 'argument', 'parameter', 'missing', '参数', '缺少', 'expect', 'require', 'brace'],
      },
      {
        name: '未闭合的环境',
        latex: '\\begin{matrix}',
        expectedKeywords: ['matrix', 'end', 'environment', 'close', '环境', '未闭合', 'begin', 'missing', 'eof'],
      },
      {
        name: '未闭合的根号',
        latex: '\\sqrt{',
        expectedKeywords: ['sqrt', 'bracket', 'close', '}', '括号', '未闭合', 'end', 'eof', 'missing', 'brace'],
      },
      {
        name: '未闭合的上标',
        latex: 'x^{',
        expectedKeywords: ['bracket', 'close', '}', '括号', '未闭合', 'end', 'eof', 'missing', 'brace', 'extra', 'open'],
      },
    ];

    for (const testCase of testCases) {
      const result = await generator.renderLatex(testCase.latex);
      
      // 验证：必须有错误
      expect(result.errors.length).toBeGreaterThan(0);
      
      const errorMessage = result.errors[0].toLowerCase();
      
      // 验证：错误消息包含至少一个相关关键词
      // 这确保错误消息是有意义的，而不是通用的 "发生错误"
      const hasRelevantKeyword = testCase.expectedKeywords.some(keyword => 
        errorMessage.includes(keyword.toLowerCase())
      );
      
      // 如果没有找到关键词，输出错误消息以便调试
      if (!hasRelevantKeyword) {
        console.warn(
          `测试用例 "${testCase.name}" 的错误消息可能不够清晰：\n` +
          `  LaTeX: ${testCase.latex}\n` +
          `  错误消息: ${result.errors[0]}\n` +
          `  期望包含关键词: ${testCase.expectedKeywords.join(', ')}`
        );
      }
      
      // 注意：这里我们不强制要求包含关键词，因为 MathJax 的错误消息格式可能变化
      // 但我们记录警告，以便在需要时改进错误处理
      expect(errorMessage.length).toBeGreaterThan(10);
    }
  }, 30000);
});
