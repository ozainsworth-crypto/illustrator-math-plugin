/**
 * 简单分数规则
 * 
 * 检测简单的分数模式（如 a/b）并提供转换为 LaTeX 分数的选项
 * 
 * 匹配模式：
 * - a/b → \frac{a}{b}
 * - (expr)/b → \frac{expr}{b}
 * - a/(expr) → \frac{a}{expr}
 * 
 * 不匹配：
 * - 已经是 \frac{}{} 格式的
 * - 在 URL 或文件路径中的斜杠
 */

import type {
  AmbiguityRule,
  AmbiguityContext,
  AmbiguityMatch,
  AmbiguityCandidate,
} from '../types';

export class SimpleFractionRule implements AmbiguityRule {
  id = 'simple-fraction';
  description = '检测到简单分数表达式（如 a/b），可能需要转换为分数格式';
  priority = 10; // 较高优先级，在其他规则之前执行

  detect(context: AmbiguityContext): AmbiguityMatch[] {
    const { latex } = context;
    const matches: AmbiguityMatch[] = [];

    // 如果没有 latex，使用 input
    const input = latex || context.input;

    // 跳过已经包含 \frac 的输入
    if (input.includes('\\frac')) {
      return matches;
    }

    // 匹配简单分数模式：word/word 或 (expr)/(expr)
    // 使用更精确的正则表达式来避免误匹配
    // 关键：使用负向前瞻确保分母后面不是运算符的一部分
    const patterns = [
      // 模式1: (expr)/(expr) - 括号包裹的表达式
      /\(([^()]+)\)\/\(([^()]+)\)/g,
      // 模式2: (expr)/word - 左边括号，右边单词（后面必须是边界或运算符）
      /\(([^()]+)\)\/([a-zA-Z0-9]+)(?=[+\-*/^_\s]|$)/g,
      // 模式3: word/(expr) - 左边单词，右边括号
      /([a-zA-Z0-9]+)\/\(([^()]+)\)/g,
      // 模式4: word/word - 最简单的情况（前后都必须是边界或运算符）
      /(?:^|[+\-*/^_\s(])([a-zA-Z0-9]+)\/([a-zA-Z0-9]+)(?=[+\-*/^_\s)]|$)/g,
    ];

    for (const pattern of patterns) {
      let match: RegExpExecArray | null;
      while ((match = pattern.exec(input)) !== null) {
        // 对于模式4，需要调整索引（因为包含了前导字符）
        let startOffset = 0;
        let fullMatch = match[0];
        
        // 如果匹配包含前导字符（非字母数字），跳过它
        if (match[0].length > 0 && !/[a-zA-Z0-9(]/.test(match[0][0])) {
          startOffset = 1;
          fullMatch = match[0].substring(1);
        }
        
        const numerator = match[1];
        const denominator = match[2];

        matches.push({
          range: {
            start: match.index + startOffset,
            end: match.index + match[0].length,
            text: fullMatch,
          },
          context: {
            original: fullMatch,
            numerator,
            denominator,
          },
        });
      }
    }

    return matches;
  }

  generateCandidates(
    _context: AmbiguityContext,
    match: AmbiguityMatch
  ): AmbiguityCandidate[] {
    const { numerator, denominator } = match.context as {
      numerator: string;
      denominator: string;
    };

    return [
      {
        label: '分数格式',
        tex: `\\frac{${numerator}}{${denominator}}`,
        replacementTex: `\\frac{${numerator}}{${denominator}}`,
        explanation: `显示为分数：${numerator} 在上，${denominator} 在下`,
      },
      {
        label: '保持原样',
        tex: `${numerator}/${denominator}`,
        replacementTex: `${numerator}/${denominator}`,
        explanation: '保持斜杠形式（可能显示为普通文本）',
      },
    ];
  }

  score(
    _context: AmbiguityContext,
    _match: AmbiguityMatch
  ): { defaultIndex: number; confidence: number } {
    // 默认选择分数格式（索引 0）
    return {
      defaultIndex: 0,
      confidence: 0.8, // 较高置信度，因为大多数情况下用户想要分数格式
    };
  }
}

export const simpleFractionRule = new SimpleFractionRule();
