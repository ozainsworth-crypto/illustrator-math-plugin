/**
 * 默认候选项渲染测试
 * 
 * 验证当检测到歧义时，初始渲染使用默认候选项而不是原始输入
 */

import { describe, it, expect } from 'vitest';
import { AmbiguityEngine } from '../../src/lib/ambiguity/ambiguity-engine';
import { fractionExponentRule } from '../../src/lib/ambiguity/rules/fraction-exponent-rule';
import type { AmbiguityContext } from '../../src/lib/ambiguity/types';

describe('默认候选项渲染测试', () => {
  describe('分子为1时，应使用"分母的幂"作为默认候选项', () => {
    it('\\frac{1}{a}^{2n} 应默认渲染为 \\frac{1}{a^{2n}}', () => {
      const engine = new AmbiguityEngine();
      engine.registerRule(fractionExponentRule);

      const rawInput = '\\frac{1}{a}^{2n}';
      
      const context: AmbiguityContext = {
        input: rawInput,
        latex: rawInput,
      };

      // 检测歧义
      const result = engine.detect(context);
      expect(result.ambiguities).toHaveLength(1);

      const ambiguity = result.ambiguities[0];
      
      // 验证默认索引为 1（分母的幂）
      expect(ambiguity.defaultIndex).toBe(1);
      
      // 获取默认候选项
      const defaultCandidate = ambiguity.candidates[ambiguity.defaultIndex];
      expect(defaultCandidate.label).toBe('分母的幂');
      
      // 生成初始渲染的 LaTeX（使用默认候选项）
      const replacementTex = defaultCandidate.replacementTex!;
      const renderLatex = 
        rawInput.substring(0, ambiguity.range.start) +
        replacementTex +
        rawInput.substring(ambiguity.range.end);
      
      // 验证初始渲染使用"分母的幂"
      expect(renderLatex).toBe('\\frac{1}{a^{2n}}');
      expect(renderLatex).not.toContain('\\left(');
      expect(renderLatex).not.toContain('\\right)');
    });

    it('\\frac{1}{a}^2n 应默认渲染为 \\frac{1}{a^{2}} n', () => {
      const engine = new AmbiguityEngine();
      engine.registerRule(fractionExponentRule);

      const rawInput = '\\frac{1}{a}^2n';
      
      const context: AmbiguityContext = {
        input: rawInput,
        latex: rawInput,
      };

      const result = engine.detect(context);
      expect(result.ambiguities).toHaveLength(1);

      const ambiguity = result.ambiguities[0];
      expect(ambiguity.defaultIndex).toBe(1);
      
      const defaultCandidate = ambiguity.candidates[ambiguity.defaultIndex];
      const replacementTex = defaultCandidate.replacementTex!;
      const renderLatex = 
        rawInput.substring(0, ambiguity.range.start) +
        replacementTex +
        rawInput.substring(ambiguity.range.end);
      
      // 验证初始渲染使用"分母的幂"并保留 tail
      expect(renderLatex).toBe('\\frac{1}{a^{2}} n');
      expect(renderLatex).toContain(' n');
    });

    it('a^{2n}+\\frac{1}{a}^2n=b 应默认渲染为 a^{2n}+\\frac{1}{a^{2}} n=b', () => {
      const engine = new AmbiguityEngine();
      engine.registerRule(fractionExponentRule);

      const rawInput = 'a^{2n}+\\frac{1}{a}^2n=b';
      
      const context: AmbiguityContext = {
        input: rawInput,
        latex: rawInput,
      };

      const result = engine.detect(context);
      expect(result.ambiguities).toHaveLength(1);

      const ambiguity = result.ambiguities[0];
      expect(ambiguity.defaultIndex).toBe(1);
      
      const defaultCandidate = ambiguity.candidates[ambiguity.defaultIndex];
      const replacementTex = defaultCandidate.replacementTex!;
      const renderLatex = 
        rawInput.substring(0, ambiguity.range.start) +
        replacementTex +
        rawInput.substring(ambiguity.range.end);
      
      // 验证完整公式中的默认渲染
      expect(renderLatex).toBe('a^{2n}+\\frac{1}{a^{2}} n=b');
      expect(renderLatex).toContain('a^{2n}+');
      expect(renderLatex).toContain('=b');
    });
  });

  describe('分子不为1时，应使用"分数整体的幂"作为默认候选项', () => {
    it('\\frac{2}{a}^{2n} 应默认渲染为 \\left(\\frac{2}{a}\\right)^{2n}', () => {
      const engine = new AmbiguityEngine();
      engine.registerRule(fractionExponentRule);

      const rawInput = '\\frac{2}{a}^{2n}';
      
      const context: AmbiguityContext = {
        input: rawInput,
        latex: rawInput,
      };

      const result = engine.detect(context);
      expect(result.ambiguities).toHaveLength(1);

      const ambiguity = result.ambiguities[0];
      
      // 验证默认索引为 0（分数整体的幂）
      expect(ambiguity.defaultIndex).toBe(0);
      
      const defaultCandidate = ambiguity.candidates[ambiguity.defaultIndex];
      expect(defaultCandidate.label).toBe('分数整体的幂');
      
      const replacementTex = defaultCandidate.replacementTex!;
      const renderLatex = 
        rawInput.substring(0, ambiguity.range.start) +
        replacementTex +
        rawInput.substring(ambiguity.range.end);
      
      // 验证初始渲染使用"分数整体的幂"
      expect(renderLatex).toBe('\\left(\\frac{2}{a}\\right)^{2n}');
      expect(renderLatex).toContain('\\left(');
      expect(renderLatex).toContain('\\right)');
    });

    it('\\frac{x+1}{b}^3y 应默认渲染为 \\left(\\frac{x+1}{b}\\right)^{3} y', () => {
      const engine = new AmbiguityEngine();
      engine.registerRule(fractionExponentRule);

      const rawInput = '\\frac{x+1}{b}^3y';
      
      const context: AmbiguityContext = {
        input: rawInput,
        latex: rawInput,
      };

      const result = engine.detect(context);
      expect(result.ambiguities).toHaveLength(1);

      const ambiguity = result.ambiguities[0];
      expect(ambiguity.defaultIndex).toBe(0);
      
      const defaultCandidate = ambiguity.candidates[ambiguity.defaultIndex];
      const replacementTex = defaultCandidate.replacementTex!;
      const renderLatex = 
        rawInput.substring(0, ambiguity.range.start) +
        replacementTex +
        rawInput.substring(ambiguity.range.end);
      
      // 验证初始渲染使用"分数整体的幂"并保留 tail
      expect(renderLatex).toBe('\\left(\\frac{x+1}{b}\\right)^{3} y');
      expect(renderLatex).toContain(' y');
    });
  });

  describe('多个歧义点时，应分别使用各自的默认候选项', () => {
    it('\\frac{1}{a}^2n + \\frac{2}{b}^3x 应使用不同的默认候选项', () => {
      const engine = new AmbiguityEngine();
      engine.registerRule(fractionExponentRule);

      const rawInput = '\\frac{1}{a}^2n + \\frac{2}{b}^3x';
      
      const context: AmbiguityContext = {
        input: rawInput,
        latex: rawInput,
      };

      const result = engine.detect(context);
      expect(result.ambiguities).toHaveLength(2);

      // 第一个歧义：分子为1，默认"分母的幂"
      const ambiguity1 = result.ambiguities[0];
      expect(ambiguity1.defaultIndex).toBe(1);
      
      // 第二个歧义：分子为2，默认"分数整体的幂"
      const ambiguity2 = result.ambiguities[1];
      expect(ambiguity2.defaultIndex).toBe(0);
      
      // 从后往前替换，避免索引偏移
      let renderLatex = rawInput;
      const sortedAmbiguities = [ambiguity2, ambiguity1];
      
      for (const ambiguity of sortedAmbiguities) {
        const defaultCandidate = ambiguity.candidates[ambiguity.defaultIndex];
        const replacementTex = defaultCandidate.replacementTex!;
        
        renderLatex = 
          renderLatex.substring(0, ambiguity.range.start) +
          replacementTex +
          renderLatex.substring(ambiguity.range.end);
      }
      
      // 验证初始渲染使用各自的默认候选项
      expect(renderLatex).toBe('\\frac{1}{a^{2}} n + \\left(\\frac{2}{b}\\right)^{3} x');
      expect(renderLatex).toContain('\\frac{1}{a^{2}} n');
      expect(renderLatex).toContain('\\left(\\frac{2}{b}\\right)^{3} x');
    });
  });
});
