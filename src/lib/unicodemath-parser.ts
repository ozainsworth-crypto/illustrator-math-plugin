/**
 * UnicodeMathParser - UnicodeMath 子集解析器
 * 
 * 功能：
 * - 解析 UnicodeMath 格式的数学表达式
 * - 转换为 LaTeX 格式
 * - 检测歧义并生成多种可能的解析结果
 * 
 * 支持的 UnicodeMath 子集基于 phase2-samples.json 的 20 条样例
 * 
 * 关联需求：需求 2（B2.4-5）
 * 关联设计：设计文档"组件设计 > Formula_Parser"章节
 */

export interface ParseResult {
  /** 转换后的 LaTeX */
  latex: string;
  /** 是否成功解析 */
  success: boolean;
  /** 是否存在歧义 */
  ambiguous: boolean;
  /** 歧义类型（如果存在） */
  ambiguityType?: string;
  /** 替代解析结果（如果存在歧义） */
  alternatives?: string[];
  /** 错误消息（如果失败） */
  error?: string;
}

export class UnicodeMathParser {
  /**
   * 解析 UnicodeMath 表达式
   * @param input - UnicodeMath 格式的输入
   * @returns 解析结果
   */
  parse(input: string): ParseResult {
    if (!input || input.trim() === '') {
      return {
        latex: '',
        success: false,
        ambiguous: false,
        error: '输入为空',
      };
    }

    try {
      const latex = this.toLatex(input);
      const ambiguityInfo = this.detectAmbiguity(input, latex);
      
      return {
        latex,
        success: true,
        ambiguous: ambiguityInfo.ambiguous,
        ambiguityType: ambiguityInfo.type,
        alternatives: ambiguityInfo.alternatives,
      };
    } catch (error) {
      return {
        latex: '',
        success: false,
        ambiguous: false,
        error: error instanceof Error ? error.message : '解析失败',
      };
    }
  }

  /**
   * 将 UnicodeMath 转换为 LaTeX
   * @param input - UnicodeMath 格式的输入
   * @returns LaTeX 格式的输出
   */
  toLatex(input: string): string {
    let result = input;

    // 解析顺序很重要：从最复杂到最简单
    // 1. 多行（需要先处理，因为包含等号）
    result = this.parseMultiline(result);
    
    // 2. 矩阵（在多行之后处理）
    result = this.parseMatrix(result);

    // 3. 求和/积分（包含上下限）
    result = this.parseSummation(result);
    result = this.parseIntegral(result);
    result = this.parseLimit(result);

    // 4. 根号（在分数之前处理）
    result = this.parseRoot(result);

    // 5. 分数（可能嵌套）
    result = this.parseFraction(result);

    // 6. 上下标
    result = this.parseSubscriptSuperscript(result);

    // 7. 括号伸缩
    result = this.parseStretchyParentheses(result);

    // 8. 希腊字母和运算符
    result = this.parseGreekLetters(result);
    result = this.parseOperators(result);

    // 9. 函数名
    result = this.parseFunctionNames(result);

    return result;
  }

  /**
   * 解析分数（含嵌套）
   * 支持：a/b → \frac{a}{b}
   * 支持：1/(2/3) → \frac{1}{\frac{2}{3}}
   */
  private parseFraction(input: string): string {
    let result = input;
    let changed = true;
    
    // 迭代处理，直到没有更多的分数可转换
    while (changed) {
      const before = result;
      
      // 处理括号内的分数：(expr) / (expr)
      result = result.replace(/\(([^()]+)\)\/\(([^()]+)\)/g, '\\frac{$1}{$2}');
      
      // 处理左边有括号的分数：(expr) / \sqrt{...}
      result = result.replace(/\(([^()]+)\)\/\\sqrt\{([^}]+)\}/g, '\\frac{$1}{\\sqrt{$2}}');
      
      // 处理左边有括号的分数：(expr) / word
      result = result.replace(/\(([^()]+)\)\/(\w+)/g, '\\frac{$1}{$2}');
      
      // 处理右边有括号的分数：word / (expr)
      result = result.replace(/(\w+)\/\(([^()]+)\)/g, '\\frac{$1}{$2}');
      
      // 处理简单分数：word / word
      result = result.replace(/(\w+)\/(\w+)/g, '\\frac{$1}{$2}');
      
      changed = (before !== result);
    }
    
    return result;
  }

  /**
   * 解析上下标（多级）
   * 支持：x^2 → x^{2}
   * 支持：x_i^2 → x_{i}^{2}
   * 支持：x^(y^z) → x^{y^{z}}（可能存在歧义）
   */
  private parseSubscriptSuperscript(input: string): string {
    // 处理上标
    let result = input.replace(/(\w+)\^(\w+)/g, '$1^{$2}');
    
    // 处理下标
    result = result.replace(/(\w+)_(\w+)/g, '$1_{$2}');
    
    // 处理括号中的上下标
    result = result.replace(/(\w+)\^\(([^)]+)\)/g, '$1^{$2}');
    result = result.replace(/(\w+)_\(([^)]+)\)/g, '$1_{$2}');
    
    return result;
  }

  /**
   * 解析根号（含 n 次根）
   * 支持：√x → \sqrt{x}
   * 支持：∛x → \sqrt[3]{x}
   */
  private parseRoot(input: string): string {
    // 立方根
    let result = input.replace(/∛(\w+)/g, '\\sqrt[3]{$1}');
    
    // 平方根
    result = result.replace(/√(\w+)/g, '\\sqrt{$1}');
    
    return result;
  }

  /**
   * 解析求和（上下限）
   * 支持：∑_(i=1)^n x_i → \sum_{i=1}^{n} x_{i}
   */
  private parseSummation(input: string): string {
    // 处理求和符号及其上下限
    return input.replace(/∑_\(([^)]+)\)\^(\w+)/g, '\\sum_{$1}^{$2}');
  }

  /**
   * 解析积分（上下限）
   * 支持：∫_0^∞ f(x) dx → \int_{0}^{\infty} f(x) dx
   */
  private parseIntegral(input: string): string {
    // 先处理无穷符号
    let result = input.replace(/∞/g, '\\infty');
    
    // 处理积分符号及其上下限
    result = result.replace(/∫_(\w+)\^(\w+)/g, '\\int_{$1}^{$2}');
    result = result.replace(/∫_(\w+)\^\\infty/g, '\\int_{$1}^{\\infty}');
    
    return result;
  }

  /**
   * 解析极限
   * 支持：lim_(x→∞) → \lim_{x \to \infty}
   */
  private parseLimit(input: string): string {
    // 处理极限符号
    let result = input.replace(/lim_\(([^)]+)\)/g, '\\lim_{$1}');
    
    // 处理箭头符号
    result = result.replace(/→/g, ' \\to ');
    
    return result;
  }

  /**
   * 解析括号伸缩
   * 支持：(a/b) → \left(\frac{a}{b}\right)
   * 支持：[(a+b)/c] → \left[\frac{a+b}{c}\right]
   */
  private parseStretchyParentheses(input: string): string {
    // 智能判断是否需要 \left \right
    // 如果括号内包含 \frac, \sum, \int 等大型结构，则添加 \left \right
    
    // 处理圆括号
    let result = input.replace(/\(([^()]+)\)/g, (_match, content: string) => {
      if (this.needsStretchyBrackets(content)) {
        return `\\left(${content}\\right)`;
      }
      return `(${content})`;
    });
    
    // 处理方括号
    result = result.replace(/\[([^[\]]+)\]/g, (_match, content: string) => {
      if (this.needsStretchyBrackets(content)) {
        return `\\left[${content}\\right]`;
      }
      return `[${content}]`;
    });
    
    return result;
  }

  /**
   * 判断是否需要伸缩括号
   */
  private needsStretchyBrackets(content: string): boolean {
    // 如果包含分数、求和、积分等大型结构，则需要伸缩括号
    return (
      content.includes('\\frac') ||
      content.includes('\\sum') ||
      content.includes('\\int') ||
      content.includes('\\sqrt')
    );
  }

  /**
   * 解析矩阵
   * 支持：■(a&b@c&d) → \begin{matrix} a & b \\ c & d \end{matrix}
   */
  private parseMatrix(input: string): string {
    // 查找矩阵符号 ■
    const matrixRegex = /■\(([^)]+)\)/g;
    
    return input.replace(matrixRegex, (_match, content: string) => {
      // 分割行（@ 表示换行）
      const rows = content.split('@');
      
      // 处理每一行（& 表示列分隔）
      const latexRows = rows.map((row: string) => row.replace(/&/g, ' & ')).join(' \\\\ ');
      
      return `\\begin{matrix} ${latexRows} \\end{matrix}`;
    });
  }

  /**
   * 解析希腊字母
   * 支持：α → \alpha, β → \beta, γ → \gamma 等
   */
  private parseGreekLetters(input: string): string {
    const greekMap: Record<string, string> = {
      α: '\\alpha',
      β: '\\beta',
      γ: '\\gamma',
      δ: '\\delta',
      ε: '\\epsilon',
      ζ: '\\zeta',
      η: '\\eta',
      θ: '\\theta',
      ι: '\\iota',
      κ: '\\kappa',
      λ: '\\lambda',
      μ: '\\mu',
      ν: '\\nu',
      ξ: '\\xi',
      ο: '\\omicron',
      π: '\\pi',
      ρ: '\\rho',
      σ: '\\sigma',
      τ: '\\tau',
      υ: '\\upsilon',
      φ: '\\phi',
      χ: '\\chi',
      ψ: '\\psi',
      ω: '\\omega',
    };

    let result = input;
    for (const [unicode, latex] of Object.entries(greekMap)) {
      result = result.replace(new RegExp(unicode, 'g'), latex);
    }
    return result;
  }

  /**
   * 解析运算符
   * 支持：≤ → \leq, ≥ → \geq 等
   */
  private parseOperators(input: string): string {
    const operatorMap: Record<string, string> = {
      '≤': ' \\leq ',
      '≥': ' \\geq ',
      '≠': ' \\neq ',
      '≈': ' \\approx ',
      '×': ' \\times ',
      '÷': ' \\div ',
    };

    let result = input;
    for (const [unicode, latex] of Object.entries(operatorMap)) {
      result = result.replace(new RegExp(unicode.replace(/[.*+?^${}()|[\]\\]/g, '\\$&'), 'g'), latex);
    }
    return result;
  }

  /**
   * 解析多行
   * 支持：■(x=1@y=2) → \begin{aligned} x &= 1 \\ y &= 2 \end{aligned}
   */
  private parseMultiline(input: string): string {
    // 检测是否是多行对齐（包含等号）
    const multilineRegex = /■\(([^)]+)\)/g;
    
    return input.replace(multilineRegex, (_match, content: string) => {
      // 如果包含 &（列分隔），则是矩阵，不是多行
      if (content.includes('&') && !content.includes('=')) {
        return _match; // 保持原样，让 parseMatrix 处理
      }
      
      // 如果包含等号，则是多行对齐
      if (content.includes('=')) {
        // 分割行（@ 表示换行）
        const rows = content.split('@');
        
        // 处理每一行，在等号前添加对齐符号
        const latexRows = rows.map((row: string) => row.replace(/=/g, ' &= ')).join(' \\\\ ');
        
        return `\\begin{aligned} ${latexRows} \\end{aligned}`;
      }
      
      return _match; // 保持原样
    });
  }

  /**
   * 解析函数名
   * 支持：sin(x) → \sin(x), log(y) → \log(y) 等
   */
  private parseFunctionNames(input: string): string {
    const functions = ['sin', 'cos', 'tan', 'log', 'ln', 'exp', 'lim', 'max', 'min'];
    
    let result = input;
    for (const func of functions) {
      // 匹配函数名后跟括号的情况
      const regex = new RegExp(`\\b${func}\\(`, 'g');
      result = result.replace(regex, `\\${func}(`);
    }
    return result;
  }

  /**
   * 检测歧义
   * @param input - 原始 UnicodeMath 输入
   * @param latex - 转换后的 LaTeX
   * @returns 歧义信息
   */
  private detectAmbiguity(
    input: string,
    latex: string
  ): { ambiguous: boolean; type?: string; alternatives?: string[] } {
    // 检测多级上标歧义：x^(y^z) 可能被解释为 x^{y^z} 或 (x^y)^z
    if (this.hasNestedSuperscript(input)) {
      return {
        ambiguous: true,
        type: '多级上标歧义',
        alternatives: [
          latex, // 当前解析：x^{y^{z}}
          this.parseAlternativeSuperscript(input), // 替代解析：(x^{y})^{z}
        ],
      };
    }

    // 检测连续上标歧义：x^2^3 可能被解释为 x^{2^3} 或 (x^2)^3
    if (this.hasConsecutiveSuperscript(input)) {
      return {
        ambiguous: true,
        type: '连续上标歧义',
        alternatives: [
          latex, // 当前解析
          this.parseAlternativeConsecutiveSuperscript(input), // 替代解析
        ],
      };
    }

    // 检测括号优先级歧义
    if (this.hasBracketAmbiguity(input)) {
      return {
        ambiguous: true,
        type: '括号优先级歧义',
        alternatives: [latex],
      };
    }

    return { ambiguous: false };
  }

  /**
   * 检测是否有嵌套上标
   */
  private hasNestedSuperscript(input: string): boolean {
    return /\^\([^)]*\^[^)]*\)/.test(input);
  }

  /**
   * 检测是否有连续上标
   */
  private hasConsecutiveSuperscript(input: string): boolean {
    return /\w\^\w\^\w/.test(input);
  }

  /**
   * 检测是否有括号优先级歧义
   */
  private hasBracketAmbiguity(input: string): boolean {
    // 简单实现：检测复杂的括号嵌套
    const openCount = (input.match(/\(/g) || []).length;
    const closeCount = (input.match(/\)/g) || []).length;
    return openCount !== closeCount || openCount > 2;
  }

  /**
   * 生成替代的上标解析
   */
  private parseAlternativeSuperscript(input: string): string {
    // 简单实现：将 x^(y^z) 解析为 (x^y)^z
    return input.replace(/(\w)\^\((\w)\^(\w)\)/, '($1^{$2})^{$3}');
  }

  /**
   * 生成替代的连续上标解析
   */
  private parseAlternativeConsecutiveSuperscript(input: string): string {
    // 简单实现：将 x^2^3 解析为 (x^2)^3
    return input.replace(/(\w)\^(\w)\^(\w)/, '($1^{$2})^{$3}');
  }
}
