/**
 * 分数幂绑定歧义规则测试
 */

import { describe, it, expect } from 'vitest';
import { fractionExponentRule } from '../../src/lib/ambiguity/rules/fraction-exponent-rule';
import type { AmbiguityContext } from '../../src/lib/ambiguity/types';

describe('FractionExponentRule', () => {
  describe('正确解析幂次，不吞并乘法项', () => {
    it('应该正确解析 \\frac{1}{a}^2n（幂=2，tail=n）', () => {
      const context: AmbiguityContext = {
        input: '\\frac{1}{a}^2n',
        latex: '\\frac{1}{a}^2n',
      };

      const matches = fractionExponentRule.detect(context);

      expect(matches).toHaveLength(1);
      expect(matches[0].range.text).toBe('\\frac{1}{a}^2n');
      expect(matches[0].context).toMatchObject({
        numerator: '1',
        denominator: 'a',
        exponent: '2',
        tail: ' n',
      });

      const candidates = fractionExponentRule.generateCandidates(context, matches[0]);
      expect(candidates).toHaveLength(2);

      // 候选 A: 分数整体的幂
      expect(candidates[0].label).toBe('分数整体的幂');
      expect(candidates[0].tex).toBe('\\left(\\frac{1}{a}\\right)^{2} n');
      expect(candidates[0].replacementTex).toBe('\\left(\\frac{1}{a}\\right)^{2} n');

      // 候选 B: 分母的幂
      expect(candidates[1].label).toBe('分母的幂');
      expect(candidates[1].tex).toBe('\\frac{1}{a^{2}} n');
      expect(candidates[1].replacementTex).toBe('\\frac{1}{a^{2}} n');
    });

    it('应该正确解析 \\frac{1}{a}^{2n}（幂=2n，tail=空）', () => {
      const context: AmbiguityContext = {
        input: '\\frac{1}{a}^{2n}',
        latex: '\\frac{1}{a}^{2n}',
      };

      const matches = fractionExponentRule.detect(context);

      expect(matches).toHaveLength(1);
      expect(matches[0].context).toMatchObject({
        numerator: '1',
        denominator: 'a',
        exponent: '2n',
        tail: '',
      });

      const candidates = fractionExponentRule.generateCandidates(context, matches[0]);

      // 候选 A
      expect(candidates[0].tex).toBe('\\left(\\frac{1}{a}\\right)^{2n}');

      // 候选 B
      expect(candidates[1].tex).toBe('\\frac{1}{a^{2n}}');
    });

    it('应该正确解析 \\frac{1}{a}^nx（幂=n，tail=x）', () => {
      const context: AmbiguityContext = {
        input: '\\frac{1}{a}^nx',
        latex: '\\frac{1}{a}^nx',
      };

      const matches = fractionExponentRule.detect(context);

      expect(matches).toHaveLength(1);
      expect(matches[0].context).toMatchObject({
        exponent: 'n',
        tail: ' x',
      });

      const candidates = fractionExponentRule.generateCandidates(context, matches[0]);
      expect(candidates[0].tex).toBe('\\left(\\frac{1}{a}\\right)^{n} x');
      expect(candidates[1].tex).toBe('\\frac{1}{a^{n}} x');
    });
  });

  describe('检测分数幂绑定歧义', () => {
    it('应该检测到 \\frac{x+1}{b}^3 的歧义', () => {
      const context: AmbiguityContext = {
        input: '\\frac{x+1}{b}^3',
        latex: '\\frac{x+1}{b}^3',
      };

      const matches = fractionExponentRule.detect(context);

      expect(matches).toHaveLength(1);

      const candidates = fractionExponentRule.generateCandidates(context, matches[0]);
      expect(candidates[0].tex).toBe('\\left(\\frac{x+1}{b}\\right)^{3}');
      expect(candidates[1].tex).toBe('\\frac{x+1}{b^{3}}');
    });

    it('应该检测到 \\frac{2}{x}^{n+1} 的歧义（指数带花括号）', () => {
      const context: AmbiguityContext = {
        input: '\\frac{2}{x}^{n+1}',
        latex: '\\frac{2}{x}^{n+1}',
      };

      const matches = fractionExponentRule.detect(context);

      expect(matches).toHaveLength(1);

      const candidates = fractionExponentRule.generateCandidates(context, matches[0]);
      expect(candidates[0].tex).toBe('\\left(\\frac{2}{x}\\right)^{n+1}');
      expect(candidates[1].tex).toBe('\\frac{2}{x^{n+1}}');
    });

    it('应该检测到多个分数幂的歧义', () => {
      const context: AmbiguityContext = {
        input: '\\frac{1}{a}^2 + \\frac{3}{b}^n',
        latex: '\\frac{1}{a}^2 + \\frac{3}{b}^n',
      };

      const matches = fractionExponentRule.detect(context);

      expect(matches).toHaveLength(2);
      expect(matches[0].range.text).toBe('\\frac{1}{a}^2');
      expect(matches[1].range.text).toBe('\\frac{3}{b}^n');
    });
  });

  describe('不应该误报', () => {
    it('不应该检测普通分数（无幂次）', () => {
      const context: AmbiguityContext = {
        input: '\\frac{1}{a}',
        latex: '\\frac{1}{a}',
      };

      const matches = fractionExponentRule.detect(context);

      expect(matches).toHaveLength(0);
    });

    it('不应该检测分母为复杂表达式的情况', () => {
      const context: AmbiguityContext = {
        input: '\\frac{1}{a+b}^2',
        latex: '\\frac{1}{a+b}^{2}',
      };

      const matches = fractionExponentRule.detect(context);

      // 分母为 a+b（包含运算符），不是简单项，不应检测为歧义
      expect(matches).toHaveLength(0);
    });

    it('不应该检测已经明确加括号的情况', () => {
      const context: AmbiguityContext = {
        input: '\\left(\\frac{1}{a}\\right)^2',
        latex: '\\left(\\frac{1}{a}\\right)^{2}',
      };

      const matches = fractionExponentRule.detect(context);

      // 已经明确加括号，不存在歧义
      expect(matches).toHaveLength(0);
    });
  });

  describe('规则元数据', () => {
    it('应该有正确的规则 ID', () => {
      expect(fractionExponentRule.id).toBe('fraction-exponent-binding');
    });

    it('应该有规则描述', () => {
      expect(fractionExponentRule.description).toBeTruthy();
    });

    it('应该有评分函数', () => {
      expect(typeof fractionExponentRule.score).toBe('function');
      
      // 创建一个有效的 match 对象
      const context: AmbiguityContext = {
        input: '\\frac{2}{a}^{2n}',
        latex: '\\frac{2}{a}^{2n}',
      };
      const matches = fractionExponentRule.detect(context);
      expect(matches).toHaveLength(1);
      
      if (fractionExponentRule.score) {
        const score = fractionExponentRule.score(context, matches[0]);
        expect(score.defaultIndex).toBe(0);
        expect(score.confidence).toBeGreaterThan(0);
      }
    });
  });

  describe('默认策略：分子为1时选择分母的幂', () => {
    it('当分子为1且分母为简单变量时，应默认选择"分母的幂"', () => {
      const context: AmbiguityContext = {
        input: '\\frac{1}{a}^{2n}',
        latex: '\\frac{1}{a}^{2n}',
      };

      const matches = fractionExponentRule.detect(context);
      expect(matches).toHaveLength(1);

      if (fractionExponentRule.score) {
        const score = fractionExponentRule.score(context, matches[0]);
        expect(score.defaultIndex).toBe(1); // 选择候选 B（分母的幂）
        expect(score.confidence).toBe(0.7);
      }
    });

    it('当分子为1且分母为带上标的简单变量时，应默认选择"分母的幂"', () => {
      const context: AmbiguityContext = {
        input: '\\frac{1}{a^{k}}^{2n}',
        latex: '\\frac{1}{a^{k}}^{2n}',
      };

      const matches = fractionExponentRule.detect(context);
      expect(matches).toHaveLength(1);

      if (fractionExponentRule.score) {
        const score = fractionExponentRule.score(context, matches[0]);
        expect(score.defaultIndex).toBe(1); // 选择候选 B（分母的幂）
      }
    });

    it('当分子不为1时，应默认选择"分数整体的幂"', () => {
      const context: AmbiguityContext = {
        input: '\\frac{2}{a}^{2n}',
        latex: '\\frac{2}{a}^{2n}',
      };

      const matches = fractionExponentRule.detect(context);
      expect(matches).toHaveLength(1);

      if (fractionExponentRule.score) {
        const score = fractionExponentRule.score(context, matches[0]);
        expect(score.defaultIndex).toBe(0); // 选择候选 A（分数整体的幂）
        expect(score.confidence).toBe(0.6);
      }
    });

    it('当分子为1但分母为复杂表达式时，应默认选择"分数整体的幂"', () => {
      const context: AmbiguityContext = {
        input: '\\frac{1}{a+b}^{2}',
        latex: '\\frac{1}{a+b}^{2}',
      };

      const matches = fractionExponentRule.detect(context);
      // 注意：这个不会被检测为歧义，因为分母不是简单项
      expect(matches).toHaveLength(0);
    });
  });

  describe('replacementTex 字段', () => {
    it('每个候选项应该包含 replacementTex 字段', () => {
      const context: AmbiguityContext = {
        input: '\\frac{1}{a}^{2n}',
        latex: '\\frac{1}{a}^{2n}',
      };

      const matches = fractionExponentRule.detect(context);
      const candidates = fractionExponentRule.generateCandidates(context, matches[0]);

      candidates.forEach((candidate) => {
        expect(candidate.replacementTex).toBeDefined();
        expect(candidate.replacementTex).toBeTruthy();
      });
    });

    it('replacementTex 应该与 tex 一致', () => {
      const context: AmbiguityContext = {
        input: '\\frac{1}{a}^{2n}',
        latex: '\\frac{1}{a}^{2n}',
      };

      const matches = fractionExponentRule.detect(context);
      const candidates = fractionExponentRule.generateCandidates(context, matches[0]);

      candidates.forEach((candidate) => {
        expect(candidate.replacementTex).toBe(candidate.tex);
      });
    });
  });
});
