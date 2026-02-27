/**
 * 通用幂次绑定规则 - 综合验收测试
 * 
 * 验收类别覆盖：
 * A) 非花括号幂：^2n, ^3x, ^n2
 * B) 花括号幂：^{2n}, ^{n+1}
 * C) 分数基底：\frac{1}{a}^2n, \frac{2}{a}^3x
 * D) 一般基底：a^2n, (a+b)^2n
 * E) 完整公式重渲染
 */

import { describe, it, expect } from 'vitest';
import { AmbiguityEngine } from '../../src/lib/ambiguity/ambiguity-engine';
import { fractionExponentRule } from '../../src/lib/ambiguity/rules/fraction-exponent-rule';
import type { AmbiguityContext } from '../../src/lib/ambiguity/types';

describe('通用幂次绑定规则 - 综合验收测试', () => {
  describe('A) 非花括号幂 - 单原子绑定', () => {
    it('应该正确处理 \\frac{1}{a}^2n（幂=2，tail=n）', () => {
      const engine = new AmbiguityEngine();
      engine.registerRule(fractionExponentRule);

      const context: AmbiguityContext = {
        input: '\\frac{1}{a}^2n',
        latex: '\\frac{1}{a}^2n',
      };

      const result = engine.detect(context);
      expect(result.ambiguities).toHaveLength(1);

      const ambiguity = result.ambiguities[0];
      
      // 验证候选项保留 tail
      expect(ambiguity.candidates[0].tex).toBe('\\left(\\frac{1}{a}\\right)^{2} n');
      expect(ambiguity.candidates[1].tex).toBe('\\frac{1}{a^{2}} n');
      
      // 验证 replacementTex 也保留 tail
      expect(ambiguity.candidates[0].replacementTex).toBe('\\left(\\frac{1}{a}\\right)^{2} n');
      expect(ambiguity.candidates[1].replacementTex).toBe('\\frac{1}{a^{2}} n');
    });

    it('应该正确处理 \\frac{2}{a}^3x（幂=3，tail=x）', () => {
      const engine = new AmbiguityEngine();
      engine.registerRule(fractionExponentRule);

      const context: AmbiguityContext = {
        input: '\\frac{2}{a}^3x',
        latex: '\\frac{2}{a}^3x',
      };

      const result = engine.detect(context);
      expect(result.ambiguities).toHaveLength(1);

      const ambiguity = result.ambiguities[0];
      
      // 验证候选项保留 tail
      expect(ambiguity.candidates[0].tex).toBe('\\left(\\frac{2}{a}\\right)^{3} x');
      expect(ambiguity.candidates[1].tex).toBe('\\frac{2}{a^{3}} x');
    });

    it('应该正确处理 \\frac{1}{b}^n2（幂=n，tail=2）', () => {
      const engine = new AmbiguityEngine();
      engine.registerRule(fractionExponentRule);

      const context: AmbiguityContext = {
        input: '\\frac{1}{b}^n2',
        latex: '\\frac{1}{b}^n2',
      };

      const result = engine.detect(context);
      expect(result.ambiguities).toHaveLength(1);

      const ambiguity = result.ambiguities[0];
      
      // 验证候选项保留 tail
      expect(ambiguity.candidates[0].tex).toBe('\\left(\\frac{1}{b}\\right)^{n} 2');
      expect(ambiguity.candidates[1].tex).toBe('\\frac{1}{b^{n}} 2');
    });
  });

  describe('B) 花括号幂 - 完整内容绑定', () => {
    it('应该正确处理 \\frac{1}{a}^{2n}（幂=2n，无 tail）', () => {
      const engine = new AmbiguityEngine();
      engine.registerRule(fractionExponentRule);

      const context: AmbiguityContext = {
        input: '\\frac{1}{a}^{2n}',
        latex: '\\frac{1}{a}^{2n}',
      };

      const result = engine.detect(context);
      expect(result.ambiguities).toHaveLength(1);

      const ambiguity = result.ambiguities[0];
      
      // 验证候选项使用完整幂次
      expect(ambiguity.candidates[0].tex).toBe('\\left(\\frac{1}{a}\\right)^{2n}');
      expect(ambiguity.candidates[1].tex).toBe('\\frac{1}{a^{2n}}');
    });

    it('应该正确处理 \\frac{2}{x}^{n+1}（幂=n+1，无 tail）', () => {
      const engine = new AmbiguityEngine();
      engine.registerRule(fractionExponentRule);

      const context: AmbiguityContext = {
        input: '\\frac{2}{x}^{n+1}',
        latex: '\\frac{2}{x}^{n+1}',
      };

      const result = engine.detect(context);
      expect(result.ambiguities).toHaveLength(1);

      const ambiguity = result.ambiguities[0];
      
      // 验证候选项使用完整幂次（包括运算符）
      expect(ambiguity.candidates[0].tex).toBe('\\left(\\frac{2}{x}\\right)^{n+1}');
      expect(ambiguity.candidates[1].tex).toBe('\\frac{2}{x^{n+1}}');
    });
  });

  describe('C) 分数基底 - 候选生成保留 tail', () => {
    it('应该在分数幂绑定中正确保留 tail', () => {
      const engine = new AmbiguityEngine();
      engine.registerRule(fractionExponentRule);

      const context: AmbiguityContext = {
        input: '\\frac{1}{a}^2n',
        latex: '\\frac{1}{a}^2n',
      };

      const result = engine.detect(context);
      const ambiguity = result.ambiguities[0];

      // 验证两个候选项都保留了 tail
      ambiguity.candidates.forEach(candidate => {
        expect(candidate.tex).toContain(' n');
        expect(candidate.replacementTex).toContain(' n');
      });
    });

    it('应该在复杂表达式中正确保留 tail', () => {
      const engine = new AmbiguityEngine();
      engine.registerRule(fractionExponentRule);

      const context: AmbiguityContext = {
        input: '\\frac{x+1}{b}^3y',
        latex: '\\frac{x+1}{b}^3y',
      };

      const result = engine.detect(context);
      expect(result.ambiguities).toHaveLength(1);

      const ambiguity = result.ambiguities[0];
      
      // 验证候选项保留 tail
      expect(ambiguity.candidates[0].tex).toBe('\\left(\\frac{x+1}{b}\\right)^{3} y');
      expect(ambiguity.candidates[1].tex).toBe('\\frac{x+1}{b^{3}} y');
    });
  });

  describe('D) 一般基底 - 通用规则适用性', () => {
    it('应该遵循相同的 tokenization 规则（概念验证）', async () => {
      // 注意：当前只有 fraction-exponent-rule 使用通用解析器
      // 这个测试验证解析器本身的通用性
      
      const { parseExponent } = await import('../../src/lib/ambiguity/exponent-parser');
      
      // 模拟 a^2n 的场景
      const result1 = parseExponent('2n+b');
      expect(result1.exponent).toBe('2');
      expect(result1.tail).toBe('n');
      
      // 模拟 (a+b)^2n 的场景
      const result2 = parseExponent('2n*c');
      expect(result2.exponent).toBe('2');
      expect(result2.tail).toBe('n');
    });
  });

  describe('E) 完整公式重渲染', () => {
    it('应该正确替换并重渲染：a^{2n}+\\frac{1}{a}^2n=b', () => {
      const engine = new AmbiguityEngine();
      engine.registerRule(fractionExponentRule);

      const originalInput = 'a^{2n}+\\frac{1}{a}^2n=b';
      const context: AmbiguityContext = {
        input: originalInput,
        latex: originalInput,
      };

      const result = engine.detect(context);
      expect(result.ambiguities).toHaveLength(1);

      const ambiguity = result.ambiguities[0];
      const selectedCandidate = ambiguity.candidates[1]; // 选择"分母的幂"

      // 执行替换
      const replacementTex = selectedCandidate.replacementTex!;
      const resolvedInput =
        originalInput.substring(0, ambiguity.range.start) +
        replacementTex +
        originalInput.substring(ambiguity.range.end);

      // 验证替换结果
      expect(resolvedInput).toBe('a^{2n}+\\frac{1}{a^{2}} n=b');
      
      // 验证前文本保留
      expect(resolvedInput).toContain('a^{2n}+');
      
      // 验证后文本保留
      expect(resolvedInput).toContain('=b');
      
      // 验证歧义片段被正确替换，tail 保留
      expect(resolvedInput).toContain('\\frac{1}{a^{2}} n');
      
      // 验证没有重复
      expect(resolvedInput).not.toContain('nn');
    });

    it('应该正确替换并重渲染：a^{n}+\\frac{1}{a}^n', () => {
      const engine = new AmbiguityEngine();
      engine.registerRule(fractionExponentRule);

      const originalInput = 'a^{n}+\\frac{1}{a}^n';
      const context: AmbiguityContext = {
        input: originalInput,
        latex: originalInput,
      };

      const result = engine.detect(context);
      expect(result.ambiguities).toHaveLength(1);

      const ambiguity = result.ambiguities[0];
      const selectedCandidate = ambiguity.candidates[1]; // 选择"分母的幂"

      // 执行替换
      const replacementTex = selectedCandidate.replacementTex!;
      const resolvedInput =
        originalInput.substring(0, ambiguity.range.start) +
        replacementTex +
        originalInput.substring(ambiguity.range.end);

      // 验证替换结果
      expect(resolvedInput).toBe('a^{n}+\\frac{1}{a^{n}}');
      
      // 验证前文本保留
      expect(resolvedInput).toContain('a^{n}+');
      
      // 验证歧义片段被正确替换
      expect(resolvedInput).toContain('\\frac{1}{a^{n}}');
    });

    it('应该正确处理多个歧义的替换', () => {
      const engine = new AmbiguityEngine();
      engine.registerRule(fractionExponentRule);

      const originalInput = '\\frac{1}{a}^2n + \\frac{3}{b}^3x';
      const context: AmbiguityContext = {
        input: originalInput,
        latex: originalInput,
      };

      const result = engine.detect(context);
      expect(result.ambiguities).toHaveLength(2);

      // 验证第一个歧义
      const ambiguity1 = result.ambiguities[0];
      expect(ambiguity1.candidates[1].replacementTex).toBe('\\frac{1}{a^{2}} n');

      // 验证第二个歧义
      const ambiguity2 = result.ambiguities[1];
      expect(ambiguity2.candidates[1].replacementTex).toBe('\\frac{3}{b^{3}} x');
    });
  });

  describe('F) 默认策略验证', () => {
    it('当分子为1时应默认选择"分母的幂"', () => {
      const engine = new AmbiguityEngine();
      engine.registerRule(fractionExponentRule);

      const context: AmbiguityContext = {
        input: '\\frac{1}{a}^{2n}',
        latex: '\\frac{1}{a}^{2n}',
      };

      const result = engine.detect(context);
      const ambiguity = result.ambiguities[0];

      // 验证默认选择为候选 B（分母的幂）
      expect(ambiguity.defaultIndex).toBe(1);
    });

    it('当分子不为1时应默认选择"分数整体的幂"', () => {
      const engine = new AmbiguityEngine();
      engine.registerRule(fractionExponentRule);

      const context: AmbiguityContext = {
        input: '\\frac{2}{a}^{2n}',
        latex: '\\frac{2}{a}^{2n}',
      };

      const result = engine.detect(context);
      const ambiguity = result.ambiguities[0];

      // 验证默认选择为候选 A（分数整体的幂）
      expect(ambiguity.defaultIndex).toBe(0);
    });
  });
});
