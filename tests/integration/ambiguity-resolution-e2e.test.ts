/**
 * 歧义解析端到端测试
 * 
 * 验证歧义选择后 resolvedInput 成为 source of truth
 */

import { describe, it, expect } from 'vitest';
import { AmbiguityEngine } from '../../src/lib/ambiguity/ambiguity-engine';
import { fractionExponentRule } from '../../src/lib/ambiguity/rules/fraction-exponent-rule';
import type { AmbiguityContext } from '../../src/lib/ambiguity/types';

describe('歧义解析端到端测试 - Source of Truth', () => {
  describe('单个歧义点', () => {
    it('选择"分母的幂"后，resolvedInput 应包含正确的 LaTeX', () => {
      const engine = new AmbiguityEngine();
      engine.registerRule(fractionExponentRule);

      // 原始输入
      const rawInput = '\\frac{1}{a}^{2n}';
      
      const context: AmbiguityContext = {
        input: rawInput,
        latex: rawInput,
      };

      // 检测歧义
      const result = engine.detect(context);
      expect(result.ambiguities).toHaveLength(1);

      const ambiguity = result.ambiguities[0];
      
      // 选择候选 B（分母的幂）
      const selectedCandidate = ambiguity.candidates[1];
      expect(selectedCandidate.label).toBe('分母的幂');

      // 生成 resolvedInput
      const replacementTex = selectedCandidate.replacementTex!;
      const resolvedInput =
        rawInput.substring(0, ambiguity.range.start) +
        replacementTex +
        rawInput.substring(ambiguity.range.end);

      // 验证 resolvedInput
      expect(resolvedInput).toBe('\\frac{1}{a^{2n}}');
      
      // 验证 resolvedInput 不再包含原始的歧义模式
      expect(resolvedInput).not.toContain('\\frac{1}{a}^{2n}');
      
      // 验证 resolvedInput 包含选择的候选项
      expect(resolvedInput).toContain('\\frac{1}{a^{2n}}');
    });

    it('选择"分数整体的幂"后，resolvedInput 应包含正确的 LaTeX', () => {
      const engine = new AmbiguityEngine();
      engine.registerRule(fractionExponentRule);

      const rawInput = '\\frac{1}{a}^{2n}';
      
      const context: AmbiguityContext = {
        input: rawInput,
        latex: rawInput,
      };

      const result = engine.detect(context);
      const ambiguity = result.ambiguities[0];
      
      // 选择候选 A（分数整体的幂）
      const selectedCandidate = ambiguity.candidates[0];
      expect(selectedCandidate.label).toBe('分数整体的幂');

      // 生成 resolvedInput
      const replacementTex = selectedCandidate.replacementTex!;
      const resolvedInput =
        rawInput.substring(0, ambiguity.range.start) +
        replacementTex +
        rawInput.substring(ambiguity.range.end);

      // 验证 resolvedInput
      expect(resolvedInput).toBe('\\left(\\frac{1}{a}\\right)^{2n}');
      
      // 验证包含括号
      expect(resolvedInput).toContain('\\left(');
      expect(resolvedInput).toContain('\\right)');
    });
  });

  describe('带 tail 的歧义点', () => {
    it('选择"分母的幂"后，resolvedInput 应保留 tail', () => {
      const engine = new AmbiguityEngine();
      engine.registerRule(fractionExponentRule);

      const rawInput = '\\frac{1}{a}^2n';
      
      const context: AmbiguityContext = {
        input: rawInput,
        latex: rawInput,
      };

      const result = engine.detect(context);
      const ambiguity = result.ambiguities[0];
      
      // 选择候选 B（分母的幂）
      const selectedCandidate = ambiguity.candidates[1];

      // 生成 resolvedInput
      const replacementTex = selectedCandidate.replacementTex!;
      const resolvedInput =
        rawInput.substring(0, ambiguity.range.start) +
        replacementTex +
        rawInput.substring(ambiguity.range.end);

      // 验证 resolvedInput 保留 tail
      expect(resolvedInput).toBe('\\frac{1}{a^{2}} n');
      expect(resolvedInput).toContain(' n');
      
      // 验证没有重复 tail
      expect(resolvedInput).not.toContain('nn');
    });
  });

  describe('完整公式中的歧义点', () => {
    it('选择"分母的幂"后，完整公式应正确替换', () => {
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
      
      // 选择候选 B（分母的幂）
      const selectedCandidate = ambiguity.candidates[1];

      // 生成 resolvedInput
      const replacementTex = selectedCandidate.replacementTex!;
      const resolvedInput =
        rawInput.substring(0, ambiguity.range.start) +
        replacementTex +
        rawInput.substring(ambiguity.range.end);

      // 验证 resolvedInput
      expect(resolvedInput).toBe('a^{2n}+\\frac{1}{a^{2}} n=b');
      
      // 验证前文本保留
      expect(resolvedInput).toContain('a^{2n}+');
      
      // 验证后文本保留
      expect(resolvedInput).toContain('=b');
      
      // 验证歧义片段被正确替换
      expect(resolvedInput).toContain('\\frac{1}{a^{2}} n');
      
      // 验证没有重复
      expect(resolvedInput).not.toContain('nn');
    });
  });

  describe('多个歧义点', () => {
    it('应该能够逐个解析多个歧义点', () => {
      const engine = new AmbiguityEngine();
      engine.registerRule(fractionExponentRule);

      // 原始输入包含2个歧义点
      let currentInput = '\\frac{1}{a}^2n + \\frac{3}{b}^3x';
      
      // 第一次检测
      let context: AmbiguityContext = {
        input: currentInput,
        latex: currentInput,
      };

      let result = engine.detect(context);
      expect(result.ambiguities).toHaveLength(2);

      // 解析第一个歧义点（选择"分母的幂"）
      const ambiguity1 = result.ambiguities[0];
      const selectedCandidate1 = ambiguity1.candidates[1];
      const replacementTex1 = selectedCandidate1.replacementTex!;
      currentInput =
        currentInput.substring(0, ambiguity1.range.start) +
        replacementTex1 +
        currentInput.substring(ambiguity1.range.end);

      // 验证第一次替换
      expect(currentInput).toContain('\\frac{1}{a^{2}} n');
      
      // 第二次检测（使用更新后的 currentInput）
      context = {
        input: currentInput,
        latex: currentInput,
      };

      result = engine.detect(context);
      
      // 应该还能检测到第二个歧义点
      expect(result.ambiguities.length).toBeGreaterThan(0);
      
      // 解析第二个歧义点（选择"分母的幂"）
      const ambiguity2 = result.ambiguities[0];
      const selectedCandidate2 = ambiguity2.candidates[1];
      const replacementTex2 = selectedCandidate2.replacementTex!;
      currentInput =
        currentInput.substring(0, ambiguity2.range.start) +
        replacementTex2 +
        currentInput.substring(ambiguity2.range.end);

      // 验证最终结果
      expect(currentInput).toContain('\\frac{1}{a^{2}} n');
      expect(currentInput).toContain('\\frac{3}{b^{3}} x');
    });
  });

  describe('重新检测验证', () => {
    it('resolvedInput 不应再被检测为歧义', () => {
      const engine = new AmbiguityEngine();
      engine.registerRule(fractionExponentRule);

      const rawInput = '\\frac{1}{a}^{2n}';
      
      // 第一次检测
      let context: AmbiguityContext = {
        input: rawInput,
        latex: rawInput,
      };

      let result = engine.detect(context);
      expect(result.ambiguities).toHaveLength(1);

      // 选择候选并生成 resolvedInput
      const ambiguity = result.ambiguities[0];
      const selectedCandidate = ambiguity.candidates[1];
      const replacementTex = selectedCandidate.replacementTex!;
      const resolvedInput =
        rawInput.substring(0, ambiguity.range.start) +
        replacementTex +
        rawInput.substring(ambiguity.range.end);

      // 第二次检测（使用 resolvedInput）
      context = {
        input: resolvedInput,
        latex: resolvedInput,
      };

      result = engine.detect(context);
      
      // resolvedInput 不应再被检测为歧义
      expect(result.ambiguities).toHaveLength(0);
    });

    it('带 tail 的 resolvedInput 不应再被检测为歧义', () => {
      const engine = new AmbiguityEngine();
      engine.registerRule(fractionExponentRule);

      const rawInput = '\\frac{1}{a}^2n';
      
      // 第一次检测
      let context: AmbiguityContext = {
        input: rawInput,
        latex: rawInput,
      };

      let result = engine.detect(context);
      expect(result.ambiguities).toHaveLength(1);

      // 选择候选并生成 resolvedInput
      const ambiguity = result.ambiguities[0];
      const selectedCandidate = ambiguity.candidates[1];
      const replacementTex = selectedCandidate.replacementTex!;
      const resolvedInput =
        rawInput.substring(0, ambiguity.range.start) +
        replacementTex +
        rawInput.substring(ambiguity.range.end);

      // 验证 resolvedInput
      expect(resolvedInput).toBe('\\frac{1}{a^{2}} n');

      // 第二次检测（使用 resolvedInput）
      context = {
        input: resolvedInput,
        latex: resolvedInput,
      };

      result = engine.detect(context);
      
      // resolvedInput 不应再被检测为歧义
      expect(result.ambiguities).toHaveLength(0);
    });
  });
});
