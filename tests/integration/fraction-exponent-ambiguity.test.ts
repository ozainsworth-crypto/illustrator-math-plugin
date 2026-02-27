/**
 * 分数幂绑定歧义集成测试
 * 
 * 测试从输入检测到歧义提示的完整流程
 */

import { describe, it, expect } from 'vitest';
import { AmbiguityEngine } from '../../src/lib/ambiguity/ambiguity-engine';
import { fractionExponentRule } from '../../src/lib/ambiguity/rules/fraction-exponent-rule';
import type { AmbiguityContext } from '../../src/lib/ambiguity/types';

describe('分数幂绑定歧义集成测试', () => {
  it('应该检测并提供 \\frac{1}{a}^{2n} 的两种解释', () => {
    const engine = new AmbiguityEngine();
    engine.registerRule(fractionExponentRule);

    const context: AmbiguityContext = {
      input: '\\frac{1}{a}^{2n}',
      latex: '\\frac{1}{a}^{2n}',
    };

    const result = engine.detect(context);

    expect(result.ambiguities.length).toBeGreaterThan(0);
    expect(result.ambiguities).toHaveLength(1);

    const ambiguity = result.ambiguities[0];
    expect(ambiguity.ruleId).toBe('fraction-exponent-binding');
    expect(ambiguity.candidates).toHaveLength(2);

    // 验证候选项 A: 分数整体的幂
    expect(ambiguity.candidates[0].label).toBe('分数整体的幂');
    expect(ambiguity.candidates[0].tex).toBe('\\left(\\frac{1}{a}\\right)^{2n}');
    expect(ambiguity.candidates[0].explanation).toContain('整个分数');

    // 验证候选项 B: 分母的幂
    expect(ambiguity.candidates[1].label).toBe('分母的幂');
    expect(ambiguity.candidates[1].tex).toBe('\\frac{1}{a^{2n}}');
    expect(ambiguity.candidates[1].explanation).toContain('分母');

    // 验证默认选择（分子为1时默认选择"分母的幂"）
    expect(ambiguity.defaultIndex).toBe(1);
  });

  it('应该正确处理 \\frac{1}{a}^2n（幂=2，乘法项=n）', () => {
    const engine = new AmbiguityEngine();
    engine.registerRule(fractionExponentRule);

    const context: AmbiguityContext = {
      input: '\\frac{1}{a}^2n',
      latex: '\\frac{1}{a}^2n',
    };

    const result = engine.detect(context);

    expect(result.ambiguities.length).toBeGreaterThan(0);
    const ambiguity = result.ambiguities[0];

    // 验证候选项正确保留乘法项 n
    expect(ambiguity.candidates[0].tex).toBe('\\left(\\frac{1}{a}\\right)^{2} n');
    expect(ambiguity.candidates[1].tex).toBe('\\frac{1}{a^{2}} n');

    // 验证 replacementTex 也包含乘法项
    expect(ambiguity.candidates[0].replacementTex).toBe('\\left(\\frac{1}{a}\\right)^{2} n');
    expect(ambiguity.candidates[1].replacementTex).toBe('\\frac{1}{a^{2}} n');
  });

  it('应该正确处理包含 LaTeX 命令的输入（不走 UnicodeMath 解析）', () => {
    const engine = new AmbiguityEngine();
    engine.registerRule(fractionExponentRule);

    // 这个输入包含 \frac 命令，应该被识别为 LaTeX
    const context: AmbiguityContext = {
      input: '\\frac{1}{a}^2n',
      latex: '\\frac{1}{a}^2n',
    };

    const result = engine.detect(context);

    // 应该检测到歧义
    expect(result.ambiguities.length).toBeGreaterThan(0);
    expect(result.ambiguities[0].ruleId).toBe('fraction-exponent-binding');
  });

  it('应该在复杂表达式中检测多个分数幂歧义', () => {
    const engine = new AmbiguityEngine();
    engine.registerRule(fractionExponentRule);

    const context: AmbiguityContext = {
      input: '\\frac{1}{a}^2 + \\frac{3}{b}^n - \\frac{x}{y}^{m+1}',
      latex: '\\frac{1}{a}^2 + \\frac{3}{b}^n - \\frac{x}{y}^{m+1}',
    };

    const result = engine.detect(context);

    expect(result.ambiguities.length).toBeGreaterThan(0);
    expect(result.ambiguities).toHaveLength(3);

    // 验证每个歧义都有正确的候选项
    result.ambiguities.forEach((ambiguity) => {
      expect(ambiguity.ruleId).toBe('fraction-exponent-binding');
      expect(ambiguity.candidates).toHaveLength(2);
      expect(ambiguity.candidates[0].label).toBe('分数整体的幂');
      expect(ambiguity.candidates[1].label).toBe('分母的幂');
    });
  });

  it('应该提供可用于 UI 展示的完整信息', () => {
    const engine = new AmbiguityEngine();
    engine.registerRule(fractionExponentRule);

    const context: AmbiguityContext = {
      input: '\\frac{1}{a}^{2n}',
      latex: '\\frac{1}{a}^{2n}',
    };

    const result = engine.detect(context);
    const ambiguity = result.ambiguities[0];

    // 验证 UI 所需的所有字段
    expect(ambiguity.message).toBeTruthy();
    expect(ambiguity.range.start).toBeGreaterThanOrEqual(0);
    expect(ambiguity.range.end).toBeGreaterThan(ambiguity.range.start);
    expect(ambiguity.range.text).toBeTruthy();

    ambiguity.candidates.forEach((candidate) => {
      expect(candidate.label).toBeTruthy();
      expect(candidate.tex).toBeTruthy();
      expect(candidate.explanation).toBeTruthy();
    });
  });

  it('应该支持完整公式的替换和重渲染：a^{2n}+\\frac{1}{a}^2n=b', () => {
    const engine = new AmbiguityEngine();
    engine.registerRule(fractionExponentRule);

    // 测试用例：a^{2n}+\frac{1}{a}^2n=b
    const originalInput = 'a^{2n}+\\frac{1}{a}^2n=b';
    const context: AmbiguityContext = {
      input: originalInput,
      latex: originalInput,
    };

    const result = engine.detect(context);
    expect(result.ambiguities).toHaveLength(1);

    const ambiguity = result.ambiguities[0];
    const selectedCandidate = ambiguity.candidates[1]; // 选择"分母的幂"

    // 验证 replacementTex 存在
    expect(selectedCandidate.replacementTex).toBeDefined();

    // 执行替换
    const replacementTex = selectedCandidate.replacementTex!;
    const resolvedInput =
      originalInput.substring(0, ambiguity.range.start) +
      replacementTex +
      originalInput.substring(ambiguity.range.end);

    // 验证替换结果
    expect(resolvedInput).toBe('a^{2n}+\\frac{1}{a^{2}} n=b');
    expect(resolvedInput).toContain('a^{2n}+'); // 前文本保留
    expect(resolvedInput).toContain('=b'); // 后文本保留
    expect(resolvedInput).toContain('\\frac{1}{a^{2}} n'); // 歧义片段被替换，乘法项保留
  });

  it('应该支持完整公式的替换和重渲染：a^{n}+\\frac{1}{a}^n', () => {
    const engine = new AmbiguityEngine();
    engine.registerRule(fractionExponentRule);

    // 测试用例：a^{n}+\frac{1}{a}^n
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
    expect(resolvedInput).toContain('a^{n}+'); // 前文本保留
    expect(resolvedInput).toContain('\\frac{1}{a^{n}}'); // 歧义片段被替换
  });

  it('应该在分子为1时默认选择"分母的幂"', () => {
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

  it('应该在分子不为1时默认选择"分数整体的幂"', () => {
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
