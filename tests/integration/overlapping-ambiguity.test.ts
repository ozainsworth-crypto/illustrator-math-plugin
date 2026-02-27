/**
 * 重叠歧义过滤集成测试
 * 
 * 测试当多个规则检测到重叠范围时，引擎是否正确过滤
 */

import { describe, it, expect, beforeEach } from 'vitest';
import { AmbiguityEngine } from '../../src/lib/ambiguity/ambiguity-engine';
import { SimpleFractionRule } from '../../src/lib/ambiguity/rules/simple-fraction-rule';
import { FractionScopeRule } from '../../src/lib/ambiguity/rules/fraction-scope-rule';
import type { AmbiguityContext } from '../../src/lib/ambiguity/types';

describe('重叠歧义过滤', () => {
  let engine: AmbiguityEngine;

  beforeEach(() => {
    engine = new AmbiguityEngine();
    // 注册规则：FractionScopeRule 优先级更高（15），SimpleFractionRule 优先级 10
    engine.registerRule(new SimpleFractionRule());
    engine.registerRule(new FractionScopeRule());
  });

  it('应该只保留 FractionScopeRule 的匹配（a/b+c），过滤掉 SimpleFractionRule 的重叠匹配（a/b）', () => {
    const context: AmbiguityContext = {
      input: 'a/b+c',
      latex: 'a/b+c',
    };

    const result = engine.detect(context);

    // 应该只有一个歧义（FractionScopeRule 的 a/b+c，因为它优先级更高）
    expect(result.ambiguities).toHaveLength(1);
    expect(result.ambiguities[0].ruleId).toBe('fraction-scope');
    expect(result.ambiguities[0].range.start).toBe(0);
    expect(result.ambiguities[0].range.end).toBe(5);
    expect(result.ambiguities[0].range.text).toBe('a/b+c');
    
    // 验证候选项
    expect(result.ambiguities[0].candidates).toHaveLength(2);
    expect(result.ambiguities[0].candidates[0].label).toContain('分母包含后续项');
    expect(result.ambiguities[0].candidates[1].label).toContain('分数后加减');
  });

  it('应该正确处理 a/b*c（只有 SimpleFractionRule 匹配）', () => {
    const context: AmbiguityContext = {
      input: 'a/b*c',
      latex: 'a/b*c',
    };

    const result = engine.detect(context);

    // FractionScopeRule 不匹配 a/b*c（只匹配 +/-），所以只有 SimpleFractionRule
    expect(result.ambiguities).toHaveLength(1);
    expect(result.ambiguities[0].ruleId).toBe('simple-fraction');
    expect(result.ambiguities[0].range.text).toBe('a/b');
  });

  it('应该正确处理多个不重叠的分数', () => {
    const context: AmbiguityContext = {
      input: 'a/b + c/d',
      latex: 'a/b + c/d',
    };

    const result = engine.detect(context);

    // 应该有两个歧义（两个独立的分数）
    expect(result.ambiguities).toHaveLength(2);
    expect(result.ambiguities[0].range.text).toBe('a/b');
    expect(result.ambiguities[1].range.text).toBe('c/d');
  });

  it('应该正确处理单独的 a/b（没有重叠）', () => {
    const context: AmbiguityContext = {
      input: 'a/b',
      latex: 'a/b',
    };

    const result = engine.detect(context);

    // 只有 SimpleFractionRule 匹配（FractionScopeRule 需要 +/- 后续项）
    expect(result.ambiguities).toHaveLength(1);
    expect(result.ambiguities[0].ruleId).toBe('simple-fraction');
  });
});
