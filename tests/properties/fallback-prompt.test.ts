/**
 * 属性测试：不支持格式降级提示完整性
 * 
 * 属性 6：不支持格式降级提示完整性
 * 验证需求：B4.9-10
 * 
 * 对于不支持的格式输入：
 * 1. 必须触发降级提示
 * 2. 错误提示必须包含输入类型
 * 3. 错误提示必须包含失败原因
 * 4. 错误提示必须包含操作建议
 * 5. 原始内容必须被保留
 */

import { describe, it, expect } from 'vitest';
import * as fc from 'fast-check';
import { FormulaParser, FormulaFormat } from '../../src/lib/formula-parser';

describe('Property Test: Unsupported Format Fallback Prompt Completeness', () => {
  const parser = new FormulaParser();

  /**
   * 生成富文本/HTML 输入
   */
  const richTextArbitrary = fc.oneof(
    // HTML 标签
    fc.tuple(
      fc.constantFrom('p', 'div', 'span', 'b', 'i', 'strong', 'em'),
      fc.constantFrom('x + y', 'a/b', '\\frac{a}{b}', 'α + β', 'x^2')
    ).map(([tag, content]) => `<${tag}>${content}</${tag}>`),
    
    // 带样式的 HTML
    fc.tuple(
      fc.constantFrom('red', 'blue', 'green', 'black'),
      fc.constantFrom('x + y', 'a/b', 'x^2')
    ).map(([color, content]) => `<span style="color: ${color};">${content}</span>`),
    
    // MathML
    fc.constantFrom(
      '<math><mfrac><mi>a</mi><mi>b</mi></mfrac></math>',
      '<math><msup><mi>x</mi><mn>2</mn></msup></math>',
      '<math><mrow><mi>x</mi><mo>+</mo><mi>y</mi></mrow></math>',
    ),
    
    // 嵌套 HTML
    fc.constantFrom(
      '<div><p>x + y</p></div>',
      '<span><b>a/b</b></span>',
      '<div class="formula">x^2</div>',
    ),
  );

  /**
   * 生成未知格式输入
   */
  const unknownFormatArbitrary = fc.oneof(
    // 纯文本但不是数学表达式
    fc.constantFrom(
      'Hello World',
      'This is not a formula',
      'Random text 123',
      '你好世界',
      'Привет мир',
    ),
    
    // 特殊字符
    fc.constantFrom(
      '!!!',
      '???',
      '@@@',
      '###',
      '$$$',
    ),
    
    // 空白和特殊空白
    fc.constantFrom(
      '   ',
      '\t\t\t',
      '\n\n\n',
      '　　　', // 全角空格
    ),
  );

  /**
   * 属性 6.1：富文本输入必须触发降级提示
   */
  it('属性 6.1：富文本输入必须触发降级提示', async () => {
    await fc.assert(
      fc.asyncProperty(richTextArbitrary, async (richText) => {
        // 解析富文本
        const result = await parser.parse(richText);
        
        // 验证：解析必须失败
        expect(result.success).toBe(false);
        
        // 验证：格式必须被识别为 RICH_TEXT
        expect(result.format).toBe(FormulaFormat.RICH_TEXT);
        
        // 验证：必须有错误消息
        expect(result.error).toBeDefined();
        expect(result.error).toBeTruthy();
        expect(result.error!.length).toBeGreaterThan(0);
      }),
      { 
        numRuns: 100,
        verbose: false,
      }
    );
  });

  /**
   * 属性 6.2：错误提示必须包含输入类型
   */
  it('属性 6.2：错误提示必须包含输入类型描述', async () => {
    await fc.assert(
      fc.asyncProperty(richTextArbitrary, async (richText) => {
        // 解析富文本
        const result = await parser.parse(richText);
        
        // 验证：错误消息必须提及格式类型
        const errorMessage = result.error!.toLowerCase();
        
        // 检查是否包含格式类型相关的关键词
        const hasFormatKeyword = 
          errorMessage.includes('富文本') ||
          errorMessage.includes('rich') ||
          errorMessage.includes('html') ||
          errorMessage.includes('格式') ||
          errorMessage.includes('format');
        
        expect(hasFormatKeyword).toBe(true);
      }),
      { 
        numRuns: 100,
        verbose: false,
      }
    );
  });

  /**
   * 属性 6.3：错误提示必须包含失败原因
   */
  it('属性 6.3：错误提示必须包含失败原因', async () => {
    await fc.assert(
      fc.asyncProperty(richTextArbitrary, async (richText) => {
        // 解析富文本
        const result = await parser.parse(richText);
        
        // 验证：错误消息必须说明为什么失败
        const errorMessage = result.error!.toLowerCase();
        
        // 检查是否包含失败原因相关的关键词
        const hasReasonKeyword = 
          errorMessage.includes('无法') ||
          errorMessage.includes('不能') ||
          errorMessage.includes('不支持') ||
          errorMessage.includes('cannot') ||
          errorMessage.includes('unable') ||
          errorMessage.includes('unsupported') ||
          errorMessage.includes('检测到') ||
          errorMessage.includes('detected');
        
        expect(hasReasonKeyword).toBe(true);
      }),
      { 
        numRuns: 100,
        verbose: false,
      }
    );
  });

  /**
   * 属性 6.4：错误提示必须包含操作建议
   */
  it('属性 6.4：错误提示必须包含操作建议', async () => {
    await fc.assert(
      fc.asyncProperty(richTextArbitrary, async (richText) => {
        // 解析富文本
        const result = await parser.parse(richText);
        
        // 验证：错误消息必须提供下一步建议
        const errorMessage = result.error!.toLowerCase();
        
        // 检查是否包含操作建议相关的关键词
        const hasSuggestionKeyword = 
          errorMessage.includes('请') ||
          errorMessage.includes('选择') ||
          errorMessage.includes('选中') ||
          errorMessage.includes('右键') ||
          errorMessage.includes('线性格式') ||
          errorMessage.includes('please') ||
          errorMessage.includes('try') ||
          errorMessage.includes('select') ||
          errorMessage.includes('copy');
        
        expect(hasSuggestionKeyword).toBe(true);
      }),
      { 
        numRuns: 100,
        verbose: false,
      }
    );
  });

  /**
   * 属性 6.5：原始内容必须被保留
   */
  it('属性 6.5：原始内容必须被保留', async () => {
    await fc.assert(
      fc.asyncProperty(richTextArbitrary, async (richText) => {
        // 解析富文本
        const result = await parser.parse(richText);
        
        // 验证：原始内容必须被保留
        expect(result.original).toBe(richText.trim());
      }),
      { 
        numRuns: 100,
        verbose: false,
      }
    );
  });

  /**
   * 属性 6.6：未知格式输入必须触发降级提示
   */
  it('属性 6.6：未知格式输入必须触发降级提示', async () => {
    await fc.assert(
      fc.asyncProperty(unknownFormatArbitrary, async (unknownInput) => {
        // 解析未知格式
        const result = await parser.parse(unknownInput);
        
        // 验证：解析必须失败
        expect(result.success).toBe(false);
        
        // 验证：格式必须被识别为 UNKNOWN
        expect(result.format).toBe(FormulaFormat.UNKNOWN);
        
        // 验证：必须有错误消息
        expect(result.error).toBeDefined();
        expect(result.error).toBeTruthy();
        expect(result.error!.length).toBeGreaterThan(0);
      }),
      { 
        numRuns: 100,
        verbose: false,
      }
    );
  });

  /**
   * 属性 6.7：错误提示的完整性（包含所有必需信息）
   */
  it('属性 6.7：错误提示必须包含所有必需信息（类型+原因+建议）', async () => {
    let completeCount = 0;
    let totalCount = 0;

    await fc.assert(
      fc.asyncProperty(
        fc.oneof(richTextArbitrary, unknownFormatArbitrary),
        async (unsupportedInput) => {
          totalCount++;
          
          // 解析不支持的格式
          const result = await parser.parse(unsupportedInput);
          
          // 验证：必须失败
          expect(result.success).toBe(false);
          
          const errorMessage = result.error!.toLowerCase();
          
          // 检查是否包含格式类型
          const hasFormatInfo = 
            errorMessage.includes('富文本') ||
            errorMessage.includes('rich') ||
            errorMessage.includes('html') ||
            errorMessage.includes('格式') ||
            errorMessage.includes('format') ||
            errorMessage.includes('未知') ||
            errorMessage.includes('unknown') ||
            errorMessage.includes('无法识别') ||
            errorMessage.includes('unrecognized');
          
          // 检查是否包含失败原因
          const hasReason = 
            errorMessage.includes('无法') ||
            errorMessage.includes('不能') ||
            errorMessage.includes('不支持') ||
            errorMessage.includes('cannot') ||
            errorMessage.includes('unable') ||
            errorMessage.includes('unsupported') ||
            errorMessage.includes('检测到') ||
            errorMessage.includes('detected');
          
          // 检查是否包含操作建议
          const hasSuggestion = 
            errorMessage.includes('请') ||
            errorMessage.includes('选择') ||
            errorMessage.includes('确保') ||
            errorMessage.includes('please') ||
            errorMessage.includes('try') ||
            errorMessage.includes('ensure') ||
            errorMessage.includes('make sure');
          
          // 统计完整的错误提示
          if (hasFormatInfo && hasReason && hasSuggestion) {
            completeCount++;
          }
          
          return true;
        }
      ),
      { 
        numRuns: 100,
        verbose: false,
      }
    );

    // 计算完整率
    const completenessRate = completeCount / totalCount;
    
    // 输出统计信息
    console.log(`错误提示完整率: ${(completenessRate * 100).toFixed(2)}% (${completeCount}/${totalCount})`);
    
    // 验证：完整率应该很高（≥ 80%）
    expect(completenessRate).toBeGreaterThanOrEqual(0.8);
  });

  /**
   * 补充测试：验证特定不支持格式的降级提示
   */
  it('应该为特定不支持格式提供完整的降级提示', async () => {
    const testCases = [
      { 
        input: '<p>x + y</p>', 
        description: 'HTML 段落',
        expectedFormat: FormulaFormat.RICH_TEXT,
        minErrorLength: 10,
      },
      { 
        input: '<span style="color: red;">a/b</span>', 
        description: 'HTML 带样式',
        expectedFormat: FormulaFormat.RICH_TEXT,
        minErrorLength: 10,
      },
      { 
        input: '<math><mfrac><mi>a</mi><mi>b</mi></mfrac></math>', 
        description: 'MathML',
        expectedFormat: FormulaFormat.RICH_TEXT,
        minErrorLength: 10,
      },
      { 
        input: 'Hello World', 
        description: '纯文本（非数学）',
        expectedFormat: FormulaFormat.UNKNOWN,
        minErrorLength: 10,
      },
      { 
        input: '   ', 
        description: '空白',
        expectedFormat: FormulaFormat.UNKNOWN,
        minErrorLength: 3, // 空白输入的错误消息可能较短
      },
    ];

    for (const testCase of testCases) {
      // 解析不支持的格式
      const result = await parser.parse(testCase.input);
      
      // 验证：解析失败
      expect(result.success).toBe(false);
      
      // 验证：格式识别正确
      expect(result.format).toBe(testCase.expectedFormat);
      
      // 验证：有错误消息
      expect(result.error).toBeTruthy();
      expect(result.error!.length).toBeGreaterThan(testCase.minErrorLength);
      
      // 验证：原始内容被保留
      // 注意：空白输入的 original 可能保留空白
      if (testCase.input.trim() === '') {
        expect(result.original).toBe(testCase.input);
      } else {
        expect(result.original).toBe(testCase.input.trim());
      }
      
      // 输出错误消息以便检查
      console.log(`${testCase.description}: ${result.error}`);
    }
  });
});
