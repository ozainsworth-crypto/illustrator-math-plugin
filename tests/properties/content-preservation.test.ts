/**
 * 属性测试：转换失败内容保留
 * 
 * 属性 7：转换失败内容保留
 * 验证需求：B4.10
 * 
 * 当转换失败时：
 * 1. 原始内容必须被保留
 * 2. 用户可以查看原始内容
 * 3. 用户可以编辑原始内容（通过 original 字段）
 * 4. 失败信息必须清晰可见
 */

import { describe, it, expect } from 'vitest';
import * as fc from 'fast-check';
import { FormulaParser } from '../../src/lib/formula-parser';

describe('Property Test: Content Preservation on Conversion Failure', () => {
  const parser = new FormulaParser();

  /**
   * 生成可能失败的输入
   * 包括：富文本、未知格式、可能失败的 UnicodeMath
   */
  const failableInputArbitrary = fc.oneof(
    // 富文本（必定失败）
    fc.tuple(
      fc.constantFrom('p', 'div', 'span'),
      fc.constantFrom('x + y', 'a/b', 'x^2')
    ).map(([tag, content]) => `<${tag}>${content}</${tag}>`),
    
    // 未知格式（必定失败）
    fc.constantFrom(
      'Hello World',
      'Random text',
      '!!!',
      '???',
    ),
    
    // 可能失败的 UnicodeMath（复杂或不支持的语法）
    fc.constantFrom(
      'very_complex_unsupported_syntax',
      '∫∫∫ triple integral', // 可能不支持
      '∂²f/∂x²', // 偏导数可能不支持
      '⟨x|y⟩', // 量子力学符号可能不支持
    ),
  );

  /**
   * 属性 7.1：转换失败时原始内容必须被保留
   */
  it('属性 7.1：转换失败时原始内容必须被保留', async () => {
    await fc.assert(
      fc.asyncProperty(failableInputArbitrary, async (input) => {
        // 解析输入
        const result = await parser.parse(input);
        
        // 如果转换失败
        if (!result.success) {
          // 验证：原始内容必须被保留
          expect(result.original).toBeDefined();
          expect(result.original).toBeTruthy();
          
          // 验证：原始内容与输入一致（可能经过 trim）
          expect(result.original).toBe(input.trim());
        }
      }),
      { 
        numRuns: 100,
        verbose: false,
      }
    );
  });

  /**
   * 属性 7.2：原始内容必须完整（不被截断或修改）
   */
  it('属性 7.2：原始内容必须完整（不被截断或修改）', async () => {
    await fc.assert(
      fc.asyncProperty(failableInputArbitrary, async (input) => {
        // 解析输入
        const result = await parser.parse(input);
        
        // 如果转换失败
        if (!result.success) {
          const trimmedInput = input.trim();
          
          // 验证：原始内容长度一致
          expect(result.original.length).toBe(trimmedInput.length);
          
          // 验证：原始内容字符完全一致
          expect(result.original).toBe(trimmedInput);
          
          // 验证：没有被截断（检查开头和结尾）
          if (trimmedInput.length > 0) {
            expect(result.original[0]).toBe(trimmedInput[0]);
            expect(result.original[result.original.length - 1]).toBe(trimmedInput[trimmedInput.length - 1]);
          }
        }
      }),
      { 
        numRuns: 100,
        verbose: false,
      }
    );
  });

  /**
   * 属性 7.3：失败信息必须清晰可见
   */
  it('属性 7.3：失败信息必须清晰可见', async () => {
    await fc.assert(
      fc.asyncProperty(failableInputArbitrary, async (input) => {
        // 解析输入
        const result = await parser.parse(input);
        
        // 如果转换失败
        if (!result.success) {
          // 验证：必须有错误消息
          expect(result.error).toBeDefined();
          expect(result.error).toBeTruthy();
          expect(result.error!.length).toBeGreaterThan(0);
          
          // 验证：错误消息有意义（不是空白或过短）
          expect(result.error!.trim().length).toBeGreaterThan(5);
        }
      }),
      { 
        numRuns: 100,
        verbose: false,
      }
    );
  });

  /**
   * 属性 7.4：转换失败时 success 标志必须为 false
   */
  it('属性 7.4：转换失败时 success 标志必须为 false', async () => {
    await fc.assert(
      fc.asyncProperty(failableInputArbitrary, async (input) => {
        // 解析输入
        const result = await parser.parse(input);
        
        // 如果有错误消息，success 必须为 false
        if (result.error) {
          expect(result.success).toBe(false);
        }
        
        // 如果 success 为 false，必须有错误消息或歧义标志
        if (!result.success) {
          expect(result.error || result.ambiguous).toBeTruthy();
        }
      }),
      { 
        numRuns: 100,
        verbose: false,
      }
    );
  });

  /**
   * 属性 7.5：原始内容在多次解析中保持一致
   */
  it('属性 7.5：原始内容在多次解析中保持一致', async () => {
    await fc.assert(
      fc.asyncProperty(failableInputArbitrary, async (input) => {
        // 多次解析相同输入
        const result1 = await parser.parse(input);
        const result2 = await parser.parse(input);
        const result3 = await parser.parse(input);
        
        // 如果都失败
        if (!result1.success && !result2.success && !result3.success) {
          // 验证：原始内容必须一致
          expect(result1.original).toBe(result2.original);
          expect(result2.original).toBe(result3.original);
        }
      }),
      { 
        numRuns: 100,
        verbose: false,
      }
    );
  });

  /**
   * 属性 7.6：特殊字符在原始内容中被正确保留
   */
  it('属性 7.6：特殊字符在原始内容中被正确保留', async () => {
    const specialCharInputs = [
      '<p>x + y</p>',
      '<span style="color: red;">a/b</span>',
      'α + β = γ',
      'x ≤ y',
      '∫∫∫',
      '⟨x|y⟩',
      '∂²f/∂x²',
      'Hello World!',
      '你好世界',
      'Привет мир',
    ];

    for (const input of specialCharInputs) {
      // 解析输入
      const result = await parser.parse(input);
      
      // 如果转换失败
      if (!result.success) {
        // 验证：原始内容完全保留（包括特殊字符）
        expect(result.original).toBe(input.trim());
        
        // 验证：特殊字符没有被转义或修改
        for (let i = 0; i < input.trim().length; i++) {
          expect(result.original[i]).toBe(input.trim()[i]);
        }
      }
    }
  });

  /**
   * 属性 7.7：长输入在失败时也被完整保留
   */
  it('属性 7.7：长输入在失败时也被完整保留', async () => {
    // 生成长输入
    const longInputArbitrary = fc.tuple(
      fc.constantFrom('p', 'div', 'span'),
      fc.array(fc.constantFrom('x', 'y', 'a', 'b', '+', '-', '*', '/'), { minLength: 50, maxLength: 200 })
    ).map(([tag, chars]) => `<${tag}>${chars.join('')}</${tag}>`);

    await fc.assert(
      fc.asyncProperty(longInputArbitrary, async (longInput) => {
        // 解析长输入
        const result = await parser.parse(longInput);
        
        // 如果转换失败
        if (!result.success) {
          // 验证：原始内容长度一致
          expect(result.original.length).toBe(longInput.trim().length);
          
          // 验证：原始内容完全一致
          expect(result.original).toBe(longInput.trim());
        }
      }),
      { 
        numRuns: 50, // 减少迭代次数以节省时间
        verbose: false,
      }
    );
  });

  /**
   * 补充测试：验证特定失败场景的内容保留
   */
  it('应该在各种失败场景中保留原始内容', async () => {
    const testCases = [
      { 
        input: '<p>x + y</p>', 
        description: 'HTML 标签',
        shouldFail: true,
      },
      { 
        input: 'Hello World', 
        description: '纯文本（非数学）',
        shouldFail: true,
      },
      { 
        input: '   ', 
        description: '空白',
        shouldFail: true,
      },
      { 
        input: '<math><mfrac><mi>a</mi><mi>b</mi></mfrac></math>', 
        description: 'MathML',
        shouldFail: true,
      },
      { 
        input: '∫∫∫ triple integral', 
        description: '可能不支持的复杂语法',
        shouldFail: false, // 可能成功或失败
      },
    ];

    for (const testCase of testCases) {
      // 解析输入
      const result = await parser.parse(testCase.input);
      
      // 验证：原始内容被保留
      expect(result.original).toBeDefined();
      
      // 如果预期失败
      if (testCase.shouldFail) {
        expect(result.success).toBe(false);
      }
      
      // 如果实际失败
      if (!result.success) {
        // 验证：原始内容与输入一致
        // 注意：空白输入的 original 可能保留空白
        if (testCase.input.trim() === '') {
          expect(result.original).toBe(testCase.input);
        } else {
          expect(result.original).toBe(testCase.input.trim());
        }
        
        // 验证：有错误消息
        expect(result.error).toBeTruthy();
        
        console.log(`${testCase.description}:`);
        console.log(`  原始内容: "${result.original}"`);
        console.log(`  错误消息: "${result.error}"`);
      }
    }
  });

  /**
   * 属性 7.8：内容保留的完整性统计
   */
  it('属性 7.8：失败时内容保留率必须为 100%', async () => {
    let failureCount = 0;
    let preservationCount = 0;

    await fc.assert(
      fc.asyncProperty(failableInputArbitrary, async (input) => {
        // 解析输入
        const result = await parser.parse(input);
        
        // 统计失败次数
        if (!result.success) {
          failureCount++;
          
          // 检查内容是否被保留
          if (result.original === input.trim()) {
            preservationCount++;
          }
        }
        
        return true;
      }),
      { 
        numRuns: 100,
        verbose: false,
      }
    );

    // 计算保留率
    const preservationRate = failureCount > 0 ? preservationCount / failureCount : 1;
    
    // 输出统计信息
    console.log(`失败次数: ${failureCount}`);
    console.log(`内容保留次数: ${preservationCount}`);
    console.log(`内容保留率: ${(preservationRate * 100).toFixed(2)}%`);
    
    // 验证：保留率必须为 100%
    expect(preservationRate).toBe(1.0);
  });
});
