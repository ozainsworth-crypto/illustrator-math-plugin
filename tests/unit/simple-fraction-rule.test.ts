/**
 * SimpleFractionRule 单元测试
 * 
 * 测试简单分数识别规则
 */

import { describe, it, expect } from 'vitest';
import { SimpleFractionRule } from '../../src/lib/ambiguity/rules/simple-fraction-rule';
import type { AmbiguityContext } from '../../src/lib/ambiguity/types';

describe('SimpleFractionRule', () => {
  const rule = new SimpleFractionRule();

  describe('detect', () => {
    it('应该检测到简单分数 a/b', () => {
      const context: AmbiguityContext = {
        input: 'a/b',
        latex: 'a/b',
      };

      const matches = rule.detect(context);

      expect(matches).toHaveLength(1);
      expect(matches[0].range.text).toBe('a/b');
      expect(matches[0].range.start).toBe(0);
      expect(matches[0].range.end).toBe(3);
    });

    it('应该检测到 a/b+c 中的分数（只有 a/b）', () => {
      const context: AmbiguityContext = {
        input: 'a/b+c',
        latex: 'a/b+c',
      };

      const matches = rule.detect(context);

      expect(matches).toHaveLength(1);
      expect(matches[0].range.text).toBe('a/b');
      expect(matches[0].range.start).toBe(0);
      expect(matches[0].range.end).toBe(3);
      expect(matches[0].context).toEqual({
        original: 'a/b',
        numerator: 'a',
        denominator: 'b',
      });
    });

    it('应该检测到多个分数', () => {
      const context: AmbiguityContext = {
        input: 'a/b + c/d',
        latex: 'a/b + c/d',
      };

      const matches = rule.detect(context);

      expect(matches).toHaveLength(2);
      expect(matches[0].range.text).toBe('a/b');
      expect(matches[1].range.text).toBe('c/d');
    });

    it('应该跳过已经是 \\frac 格式的输入', () => {
      const context: AmbiguityContext = {
        input: '\\frac{a}{b}',
        latex: '\\frac{a}{b}',
      };

      const matches = rule.detect(context);

      expect(matches).toHaveLength(0);
    });

    it('应该检测到括号形式的分数', () => {
      const context: AmbiguityContext = {
        input: '(x+1)/(y+2)',
        latex: '(x+1)/(y+2)',
      };

      const matches = rule.detect(context);

      expect(matches).toHaveLength(1);
      expect(matches[0].range.text).toBe('(x+1)/(y+2)');
    });

    it('应该正确处理 a/b*c（只检测 a/b）', () => {
      const context: AmbiguityContext = {
        input: 'a/b*c',
        latex: 'a/b*c',
      };

      const matches = rule.detect(context);

      expect(matches).toHaveLength(1);
      expect(matches[0].range.text).toBe('a/b');
      expect(matches[0].range.start).toBe(0);
      expect(matches[0].range.end).toBe(3);
      expect(matches[0].context).toEqual({
        original: 'a/b',
        numerator: 'a',
        denominator: 'b',
      });
    });

    it('应该正确处理 x+a/b（只检测 a/b）', () => {
      const context: AmbiguityContext = {
        input: 'x+a/b',
        latex: 'x+a/b',
      };

      const matches = rule.detect(context);

      expect(matches).toHaveLength(1);
      expect(matches[0].range.text).toBe('a/b');
      expect(matches[0].range.start).toBe(2);
      expect(matches[0].range.end).toBe(5);
    });
  });

  describe('generateCandidates', () => {
    it('应该生成两个候选项：分数格式和保持原样', () => {
      const context: AmbiguityContext = {
        input: 'a/b',
        latex: 'a/b',
      };

      const matches = rule.detect(context);
      const candidates = rule.generateCandidates(context, matches[0]);

      expect(candidates).toHaveLength(2);
      expect(candidates[0].label).toBe('分数格式');
      expect(candidates[0].tex).toBe('\\frac{a}{b}');
      expect(candidates[1].label).toBe('保持原样');
      expect(candidates[1].tex).toBe('a/b');
    });
  });

  describe('score', () => {
    it('应该默认选择分数格式（索引 0）', () => {
      const context: AmbiguityContext = {
        input: 'a/b',
        latex: 'a/b',
      };

      const matches = rule.detect(context);
      const score = rule.score!(context, matches[0]);

      expect(score.defaultIndex).toBe(0);
      expect(score.confidence).toBeGreaterThan(0.5);
    });
  });
});
