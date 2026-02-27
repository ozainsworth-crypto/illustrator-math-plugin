/**
 * FormulaParser - 公式格式检测与转换
 * 
 * 功能：
 * - 检测输入格式（LaTeX、UnicodeMath、AsciiMath、富文本、未知）
 * - 转换 UnicodeMath 到 LaTeX
 * - 提供 AsciiMath 降级兜底（使用 Plurimath）
 * - 处理歧义和降级提示
 * 
 * 关联需求：需求 2（B1.1-3, B2.4-6）
 * 关联设计：设计文档"组件设计 > Formula_Parser"章节
 */

import { UnicodeMathParser } from './unicodemath-parser';
import type { ParseResult as UnicodeMathParseResult } from './unicodemath-parser';

// Plurimath 懒加载状态
// eslint-disable-next-line @typescript-eslint/no-explicit-any
let plurimathInstance: any = null;
let plurimathLoadAttempted = false;
let plurimathLoadError: string | null = null;

/**
 * 懒加载 Plurimath
 */
// eslint-disable-next-line @typescript-eslint/no-explicit-any
async function loadPlurimath(): Promise<any> {
  if (plurimathLoadAttempted) {
    return plurimathInstance;
  }

  plurimathLoadAttempted = true;

  try {
    const module = await import('@plurimath/plurimath');
    // Plurimath 可能导出为 default 或直接导出
    plurimathInstance = module.default || module;
    return plurimathInstance;
  } catch (e) {
    plurimathLoadError = e instanceof Error ? e.message : String(e);
    console.warn('Plurimath 加载失败，AsciiMath 转换将不可用:', plurimathLoadError);
    return null;
  }
}

/**
 * 公式格式枚举
 */
export const FormulaFormat = {
  /** LaTeX 格式 */
  LATEX: 'latex',
  /** UnicodeMath 格式 */
  UNICODEMATH: 'unicodemath',
  /** AsciiMath 格式 */
  ASCIIMATH: 'asciimath',
  /** 富文本格式 */
  RICH_TEXT: 'rich_text',
  /** 未知格式 */
  UNKNOWN: 'unknown',
} as const;

export type FormulaFormat = typeof FormulaFormat[keyof typeof FormulaFormat];

/**
 * 解析结果接口
 */
export interface ParseResult {
  /** 检测到的格式 */
  format: FormulaFormat;
  /** 转换后的 LaTeX */
  latex: string;
  /** 原始输入 */
  original: string;
  /** 是否成功 */
  success: boolean;
  /** 是否存在歧义 */
  ambiguous: boolean;
  /** 歧义类型（如果存在） */
  ambiguityType?: string;
  /** 备选方案（如果存在歧义） */
  alternatives?: string[];
  /** 置信度 (0-1) */
  confidence: number;
  /** 错误消息（如果失败） */
  error?: string;
  /** 是否使用了降级模式 */
  fallback?: boolean;
  /** 降级类型（如果使用了降级） */
  fallbackType?: 'asciimath' | 'manual';
}

/**
 * FormulaParser 类
 * 
 * 负责检测和转换公式格式
 */
export class FormulaParser {
  private unicodemathParser: UnicodeMathParser;

  constructor() {
    this.unicodemathParser = new UnicodeMathParser();
  }

  /**
   * 检测公式格式
   * @param input - 输入字符串
   * @returns 检测到的格式
   */
  detectFormat(input: string): FormulaFormat {
    if (!input || input.trim() === '') {
      return FormulaFormat.UNKNOWN;
    }

    const trimmed = input.trim();

    // 1. 检测富文本/HTML（包含 HTML 标签）
    if (this.isRichText(trimmed)) {
      return FormulaFormat.RICH_TEXT;
    }

    // 2. 检测 LaTeX 格式（以 \ 开头的控制词）
    if (this.isLatex(trimmed)) {
      return FormulaFormat.LATEX;
    }

    // 3. 检测 UnicodeMath 格式（包含 Unicode 数学符号或 UnicodeMath 特征）
    if (this.isUnicodeMath(trimmed)) {
      return FormulaFormat.UNICODEMATH;
    }

    // 4. 检测 AsciiMath 格式（纯 ASCII 数学表达式）
    // 注意：由于 UnicodeMath 也可以使用 ASCII 字符（如 a/b, x^2），
    // 我们优先将这些模式识别为 UnicodeMath（因为 PowerPoint 使用 UnicodeMath）
    // AsciiMath 主要用于降级兜底
    if (this.isAsciiMath(trimmed)) {
      return FormulaFormat.ASCIIMATH;
    }

    // 5. 未知格式
    return FormulaFormat.UNKNOWN;
  }

  /**
   * 解析并转换为 LaTeX
   * @param input - 输入字符串
   * @returns 解析结果
   */
  async parse(input: string): Promise<ParseResult> {
    if (!input || input.trim() === '') {
      return {
        format: FormulaFormat.UNKNOWN,
        latex: '',
        original: input,
        success: false,
        ambiguous: false,
        confidence: 0,
        error: '输入为空',
      };
    }

    const format = this.detectFormat(input);
    const original = input.trim();

    switch (format) {
      case FormulaFormat.LATEX:
        return this.handleLatex(original);

      case FormulaFormat.UNICODEMATH:
        return await this.handleUnicodeMath(original);

      case FormulaFormat.ASCIIMATH:
        return await this.handleAsciiMath(original);

      case FormulaFormat.RICH_TEXT:
        return this.handleRichText(original);

      case FormulaFormat.UNKNOWN:
      default:
        return this.handleUnknown(original);
    }
  }

  /**
   * 处理 LaTeX 格式（直通）
   */
  private handleLatex(input: string): ParseResult {
    return {
      format: FormulaFormat.LATEX,
      latex: input,
      original: input,
      success: true,
      ambiguous: false,
      confidence: 1.0,
    };
  }

  /**
   * 处理 UnicodeMath 格式（转换）
   */
  private async handleUnicodeMath(input: string): Promise<ParseResult> {
    const parseResult: UnicodeMathParseResult = this.unicodemathParser.parse(input);

    if (!parseResult.success) {
      // UnicodeMath 解析失败，尝试 AsciiMath 降级
      return await this.tryAsciiMathFallback(input);
    }

    return {
      format: FormulaFormat.UNICODEMATH,
      latex: parseResult.latex,
      original: input,
      success: true,
      ambiguous: parseResult.ambiguous,
      ambiguityType: parseResult.ambiguityType,
      alternatives: parseResult.alternatives,
      confidence: parseResult.ambiguous ? 0.6 : 0.9,
    };
  }

  /**
   * 处理 AsciiMath 格式（使用 Plurimath）
   */
  private async handleAsciiMath(input: string): Promise<ParseResult> {
    // 懒加载 Plurimath
    // eslint-disable-next-line @typescript-eslint/no-unsafe-assignment
    const Plurimath = await loadPlurimath();

    // 检查 Plurimath 是否可用
    if (!Plurimath) {
      return {
        format: FormulaFormat.ASCIIMATH,
        latex: '',
        original: input,
        success: false,
        ambiguous: false,
        confidence: 0,
        error: `AsciiMath 转换不可用：Plurimath 库加载失败${plurimathLoadError ? ` (${plurimathLoadError})` : ''}`,
        fallback: true,
        fallbackType: 'manual',
      };
    }

    try {
      // 使用 Plurimath 进行 AsciiMath → LaTeX 转换
      // eslint-disable-next-line @typescript-eslint/no-unsafe-assignment, @typescript-eslint/no-unsafe-call
      const formula = new Plurimath(input, 'asciimath');
      // eslint-disable-next-line @typescript-eslint/no-unsafe-assignment, @typescript-eslint/no-unsafe-call, @typescript-eslint/no-unsafe-member-access
      const latex = formula.toLatex();

      return {
        format: FormulaFormat.ASCIIMATH,
        // eslint-disable-next-line @typescript-eslint/no-unsafe-assignment
        latex,
        original: input,
        success: true,
        ambiguous: false,
        confidence: 0.8, // AsciiMath 转换置信度较高
      };
    } catch (e) {
      const error = e instanceof Error ? e.message : String(e);
      return {
        format: FormulaFormat.ASCIIMATH,
        latex: '',
        original: input,
        success: false,
        ambiguous: false,
        confidence: 0,
        error: `AsciiMath 转换失败: ${error}`,
        fallback: true,
        fallbackType: 'manual',
      };
    }
  }

  /**
   * 处理富文本格式（降级提示）
   */
  private handleRichText(input: string): ParseResult {
    return {
      format: FormulaFormat.RICH_TEXT,
      latex: '',
      original: input,
      success: false,
      ambiguous: false,
      confidence: 0,
      error: '检测到富文本格式，无法解析。请在 PowerPoint/Word 中选中公式，右键选择"线性格式"，然后重新复制。',
    };
  }

  /**
   * 处理未知格式（降级提示）
   */
  private handleUnknown(input: string): ParseResult {
    return {
      format: FormulaFormat.UNKNOWN,
      latex: '',
      original: input,
      success: false,
      ambiguous: false,
      confidence: 0,
      error: '无法识别的格式。请确保输入为 LaTeX 或 PowerPoint 线性格式（UnicodeMath）。',
    };
  }

  /**
   * 尝试 AsciiMath 降级兜底
   */
  private async tryAsciiMathFallback(input: string): Promise<ParseResult> {
    // 尝试将输入作为 AsciiMath 处理
    const asciiMathResult = await this.handleAsciiMath(input);

    if (asciiMathResult.success) {
      return {
        ...asciiMathResult,
        fallback: true,
        fallbackType: 'asciimath',
        confidence: 0.6, // 降级模式置信度较低
      };
    }

    // AsciiMath 也失败，返回错误
    return {
      format: FormulaFormat.UNICODEMATH,
      latex: '',
      original: input,
      success: false,
      ambiguous: false,
      confidence: 0,
      error: 'UnicodeMath 解析失败，且 AsciiMath 降级也失败。请检查输入格式或手动编辑为 LaTeX。',
    };
  }

  /**
   * 检测是否为富文本/HTML
   */
  private isRichText(input: string): boolean {
    // 检测 HTML 标签
    const htmlTagPattern = /<[^>]+>/;
    return htmlTagPattern.test(input);
  }

  /**
   * 检测是否为 LaTeX 格式
   */
  private isLatex(input: string): boolean {
    // LaTeX 特征1：包含反斜杠控制词（如 \frac, \sqrt, \sum 等）
    const latexPattern = /\\[a-zA-Z]+/;
    if (latexPattern.test(input)) {
      return true;
    }

    // LaTeX 特征2：包含花括号（LaTeX 分组语法）
    // 这有助于区分 LaTeX 和 UnicodeMath（UnicodeMath 使用括号而非花括号）
    if (input.includes('{') || input.includes('}')) {
      return true;
    }

    return false;
  }

  /**
   * 检测是否为 UnicodeMath 格式
   */
  private isUnicodeMath(input: string): boolean {
    // UnicodeMath 特征1：包含 Unicode 数学符号
    const unicodeMathSymbols = [
      '√', '∛', '∜', // 根号
      '∑', '∏', '∫', '∮', // 求和、积分
      '∞', '∂', '∇', // 无穷、偏导、梯度
      '≤', '≥', '≠', '≈', '≡', // 关系符号
      '∈', '∉', '⊂', '⊃', '∪', '∩', // 集合符号
      '∀', '∃', '∧', '∨', '¬', // 逻辑符号
      '→', '←', '↔', '⇒', '⇐', '⇔', // 箭头
      'α', 'β', 'γ', 'δ', 'ε', 'ζ', 'η', 'θ', // 希腊字母（小写）
      'ι', 'κ', 'λ', 'μ', 'ν', 'ξ', 'ο', 'π',
      'ρ', 'σ', 'τ', 'υ', 'φ', 'χ', 'ψ', 'ω',
      'Α', 'Β', 'Γ', 'Δ', 'Ε', 'Ζ', 'Η', 'Θ', // 希腊字母（大写）
      'Ι', 'Κ', 'Λ', 'Μ', 'Ν', 'Ξ', 'Ο', 'Π',
      'Ρ', 'Σ', 'Τ', 'Υ', 'Φ', 'Χ', 'Ψ', 'Ω',
      '■', // 矩阵符号
    ];

    const hasUnicodeSymbol = unicodeMathSymbols.some((symbol) => input.includes(symbol));
    
    if (hasUnicodeSymbol) {
      return true;
    }

    // UnicodeMath 特征2：包含 UnicodeMath 特有的模式
    // 例如：下标使用 _ 后跟括号（如 ∑_(i=1)^n）
    // 或者简单的分数和上下标（a/b, x^2, x_i）
    // 这些模式在 PowerPoint 线性格式中很常见
    const unicodemathPatterns = [
      /_\(/,           // 下标括号：_(...)
      /\^[a-zA-Z0-9]+/, // 上标：^n, ^2
      /_[a-zA-Z0-9]+/,  // 下标：_i, _1
      /[a-zA-Z0-9]+\/[a-zA-Z0-9]+/, // 分数：a/b
    ];

    return unicodemathPatterns.some((pattern) => pattern.test(input));
  }

  /**
   * 检测是否为 AsciiMath 格式
   */
  private isAsciiMath(input: string): boolean {
    // AsciiMath 特征：
    // 1. 纯 ASCII 字符
    // 2. 包含数学运算符（+, -, *, /, ^, _）
    // 3. 不包含 LaTeX 控制词（\）
    // 4. 不包含 Unicode 数学符号

    // 排除 LaTeX
    if (this.isLatex(input)) {
      return false;
    }

    // 排除 UnicodeMath
    if (this.isUnicodeMath(input)) {
      return false;
    }

    // 检测是否包含数学运算符
    const mathOperators = /[+\-*/^_()[\]{}=<>]/;
    return mathOperators.test(input);
  }
}
