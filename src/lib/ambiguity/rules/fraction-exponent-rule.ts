/**
 * 分数幂绑定歧义规则
 * 
 * 检测模式：\frac{N}{X}^E
 * 其中 X 为简单项，E 为幂次（遵循通用幂次绑定规则）
 * 
 * 歧义：
 * - 候选 A: (\frac{N}{X})^{E} - 分数整体的幂
 * - 候选 B: \frac{N}{X^{E}} - 分母的幂
 * 
 * 使用通用幂次解析器确保：
 * - ^{2n} → 幂=2n，tail=''
 * - ^2n → 幂=2，tail=' n'（n 为乘法项）
 */

import type {
  AmbiguityRule,
  AmbiguityContext,
  AmbiguityMatch,
  AmbiguityCandidate,
} from '../types';
import { parseExponent } from '../exponent-parser';

export const fractionExponentRule: AmbiguityRule = {
  id: 'fraction-exponent-binding',
  description: '检测 \\frac{N}{X}^E 模式中幂次的绑定歧义',
  priority: 10,

  detect(context: AmbiguityContext): AmbiguityMatch[] {
    const { latex } = context;
    if (!latex) return [];

    const matches: AmbiguityMatch[] = [];

    // 匹配模式：\frac{...}{简单项}^
    // 然后手动解析幂次部分（因为需要处理花括号嵌套）
    const fractionPattern = /\\frac\{([^{}]+)\}\{([a-zA-Z0-9]+(?:\^\{[^{}]+\})?)\}\^/g;

    let match;
    while ((match = fractionPattern.exec(latex)) !== null) {
      const numerator = match[1];
      const denominator = match[2];
      const matchEnd = match.index + match[0].length;
      
      // 从 ^ 后面开始解析幂次
      const afterCaret = latex.substring(matchEnd);
      
      // 使用通用幂次解析器
      const parseResult = parseExponent(afterCaret);
      const { exponent, tail } = parseResult;

      // 如果没有解析到有效的幂次，跳过
      if (!exponent) continue;

      // 计算匹配的完整文本（包含 \frac{N}{X}^E 和 tail）
      const start = match.index;
      
      // 使用通用解析器的 lengthInSource
      const expLengthInSource = parseResult.lengthInSource;
      
      // range.end 应该包含幂次和 tail，这样替换时不会重复
      const end = matchEnd + expLengthInSource + tail.length;
      const fractionPart = latex.substring(start, end);

      matches.push({
        range: {
          start,
          end,
          text: fractionPart,
        },
        context: {
          numerator,
          denominator,
          exponent,
          tail: tail.trim() ? ` ${tail.trim()}` : '', // 保留空格作为乘法分隔
        },
      });
    }

    return matches;
  },

  generateCandidates(
    _context: AmbiguityContext,
    match: AmbiguityMatch
  ): AmbiguityCandidate[] {
    const { numerator, denominator, exponent, tail } = match.context as {
      numerator: string;
      denominator: string;
      exponent: string;
      tail: string;
    };

    return [
      {
        label: '分数整体的幂',
        tex: `\\left(\\frac{${numerator}}{${denominator}}\\right)^{${exponent}}${tail}`,
        explanation: `将整个分数 (${numerator}/${denominator}) 作为底数，幂次为 ${exponent}${tail ? `，后续乘以${tail.trim()}` : ''}`,
        replacementTex: `\\left(\\frac{${numerator}}{${denominator}}\\right)^{${exponent}}${tail}`,
      },
      {
        label: '分母的幂',
        tex: `\\frac{${numerator}}{${denominator}^{${exponent}}}${tail}`,
        explanation: `只有分母 ${denominator} 作为底数，幂次为 ${exponent}${tail ? `，后续乘以${tail.trim()}` : ''}`,
        replacementTex: `\\frac{${numerator}}{${denominator}^{${exponent}}}${tail}`,
      },
    ];
  },

  score(
    _context: AmbiguityContext,
    match: AmbiguityMatch
  ) {
    const { numerator, denominator } = match.context as {
      numerator: string;
      denominator: string;
      exponent: string;
      tail: string;
    };

    // 特殊规则：当分子为 1 且分母为简单项时，默认选择"分母的幂"
    const isNumeratorOne = numerator.trim() === '1';
    const isSimpleDenominator = /^[a-zA-Z](\^\{[^{}]+\})?$/.test(denominator.trim());

    if (isNumeratorOne && isSimpleDenominator) {
      return {
        defaultIndex: 1, // 选择"分母的幂"
        confidence: 0.7,
      };
    }

    return {
      defaultIndex: 0, // 默认选择分数整体的幂
      confidence: 0.6,
    };
  },
};
