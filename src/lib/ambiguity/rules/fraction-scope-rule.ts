/**
 * 分数作用域歧义规则
 * 
 * 检测类似 a/b+c 的表达式，可能被解释为：
 * - 解释 A: a/(b+c) - 分数的分母是 b+c
 * - 解释 B: (a/b)+c - 分数是 a/b，然后加 c
 * 
 * 这是一个示例规则，用于验证歧义框架的可用性
 */

import type {
  AmbiguityRule,
  AmbiguityContext,
  AmbiguityMatch,
  AmbiguityCandidate,
} from '../types';

export class FractionScopeRule implements AmbiguityRule {
  readonly id = 'fraction-scope';
  readonly description = '分数作用域歧义：a/b+c 可能被解释为 a/(b+c) 或 (a/b)+c';
  readonly priority = 15; // 高于 SimpleFractionRule (10)，因为这是更具体的歧义

  /**
   * 检测分数作用域歧义
   * 
   * 匹配模式：word / word +/- word
   * 例如：a/b+c, x/y-z
   */
  detect(context: AmbiguityContext): AmbiguityMatch[] {
    const matches: AmbiguityMatch[] = [];
    const input = context.input;

    // 匹配模式：\w+/\w+[+-]\w+
    const pattern = /(\w+)\/(\w+)([+-])(\w+)/g;
    let match: RegExpExecArray | null;

    while ((match = pattern.exec(input)) !== null) {
      const fullMatch = match[0];
      const numerator = match[1];
      const denominator1 = match[2];
      const operator = match[3];
      const term = match[4];

      matches.push({
        range: {
          start: match.index,
          end: match.index + fullMatch.length,
          text: fullMatch,
        },
        context: {
          numerator,
          denominator1,
          operator,
          term,
        },
      });
    }

    return matches;
  }

  /**
   * 生成候选项
   */
  generateCandidates(
    _context: AmbiguityContext,
    match: AmbiguityMatch
  ): AmbiguityCandidate[] {
    const { numerator, denominator1, operator, term } = match.context as {
      numerator: string;
      denominator1: string;
      operator: string;
      term: string;
    };

    return [
      {
        label: '解释 A: 分母包含后续项',
        tex: `\\frac{${numerator}}{${denominator1}${operator}${term}}`,
        explanation: `将 ${match.range.text} 解释为 ${numerator}/(${denominator1}${operator}${term})`,
      },
      {
        label: '解释 B: 分数后加减',
        tex: `\\frac{${numerator}}{${denominator1}}${operator}${term}`,
        explanation: `将 ${match.range.text} 解释为 (${numerator}/${denominator1})${operator}${term}`,
      },
    ];
  }

  /**
   * 计算评分
   * 
   * 默认选择解释 B（分数后加减），因为这是更常见的数学表达习惯
   */
  score(
    _context: AmbiguityContext,
    _match: AmbiguityMatch
  ): { defaultIndex: number; confidence: number } {
    return {
      defaultIndex: 1, // 默认选择解释 B
      confidence: 0.6, // 中等置信度，建议用户确认
    };
  }
}
