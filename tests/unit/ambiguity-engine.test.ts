/* eslint-disable @typescript-eslint/explicit-function-return-type */

/**
 * 歧义引擎单元测试
 * 
 * 验证歧义检测框架的核心功能
 */

import { describe, it, expect, beforeEach } from 'vitest';
import { AmbiguityEngine } from '../../src/lib/ambiguity/ambiguity-engine';
import { FractionScopeRule } from '../../src/lib/ambiguity/rules';
import type { AmbiguityContext } from '../../src/lib/ambiguity/types';

describe('AmbiguityEngine', () => {
  let engine: AmbiguityEngine;

  beforeEach(() => {
    engine = new AmbiguityEngine();
  });

  describe('规则注册', () => {
    it('应该能够注册单个规则', () => {
      const rule = new FractionScopeRule();
      engine.registerRule(rule);

      const rules = engine.getRules();
      expect(rules).toHaveLength(1);
      expect(rules[0].id).toBe('fraction-scope');
    });

    it('应该能够批量注册规则', () => {
      const rules = [new FractionScopeRule()];
      engine.registerRules(rules);

      expect(engine.getRules()).toHaveLength(1);
    });

    it('应该能够清除所有规则', () => {
      engine.registerRule(new FractionScopeRule());
      expect(engine.getRules()).toHaveLength(1);

      engine.clearRules();
      expect(engine.getRules()).toHaveLength(0);
    });
  });

  describe('歧义检测', () => {
    beforeEach(() => {
      engine.registerRule(new FractionScopeRule());
    });

    it('应该检测到分数作用域歧义 a/b+c', () => {
      const context: AmbiguityContext = {
        input: 'a/b+c',
      };

      const result = engine.detect(context);

      expect(result.ambiguities).toHaveLength(1);
      expect(result.ambiguities[0].ruleId).toBe('fraction-scope');
      expect(result.ambiguities[0].range.text).toBe('a/b+c');
    });

    it('应该检测到分数作用域歧义 x/y-z', () => {
      const context: AmbiguityContext = {
        input: 'x/y-z',
      };

      const result = engine.detect(context);

      expect(result.ambiguities).toHaveLength(1);
      expect(result.ambiguities[0].range.text).toBe('x/y-z');
    });

    it('不应该为简单分数标记歧义 a/b', () => {
      const context: AmbiguityContext = {
        input: 'a/b',
      };

      const result = engine.detect(context);

      expect(result.ambiguities).toHaveLength(0);
    });

    it('不应该为明确括号表达式标记歧义 a/(b+c)', () => {
      const context: AmbiguityContext = {
        input: 'a/(b+c)',
      };

      const result = engine.detect(context);

      expect(result.ambiguities).toHaveLength(0);
    });

    it('不应该为简单加法标记歧义 a+b', () => {
      const context: AmbiguityContext = {
        input: 'a+b',
      };

      const result = engine.detect(context);

      expect(result.ambiguities).toHaveLength(0);
    });
  });

  describe('候选项生成', () => {
    beforeEach(() => {
      engine.registerRule(new FractionScopeRule());
    });

    it('应该生成 2 个候选项', () => {
      const context: AmbiguityContext = {
        input: 'a/b+c',
      };

      const result = engine.detect(context);

      expect(result.ambiguities[0].candidates).toHaveLength(2);
    });

    it('候选项应该包含不同的 LaTeX 表达式', () => {
      const context: AmbiguityContext = {
        input: 'a/b+c',
      };

      const result = engine.detect(context);
      const candidates = result.ambiguities[0].candidates;

      expect(candidates[0].tex).toBe('\\frac{a}{b+c}');
      expect(candidates[1].tex).toBe('\\frac{a}{b}+c');
      expect(candidates[0].tex).not.toBe(candidates[1].tex);
    });

    it('候选项应该包含标签和解释', () => {
      const context: AmbiguityContext = {
        input: 'a/b+c',
      };

      const result = engine.detect(context);
      const candidates = result.ambiguities[0].candidates;

      expect(candidates[0].label).toBeTruthy();
      expect(candidates[0].explanation).toBeTruthy();
      expect(candidates[1].label).toBeTruthy();
      expect(candidates[1].explanation).toBeTruthy();
    });
  });

  describe('评分与默认选择', () => {
    beforeEach(() => {
      engine.registerRule(new FractionScopeRule());
    });

    it('应该有默认选择的候选索引', () => {
      const context: AmbiguityContext = {
        input: 'a/b+c',
      };

      const result = engine.detect(context);

      expect(result.ambiguities[0].defaultIndex).toBeDefined();
      expect(result.ambiguities[0].defaultIndex).toBeGreaterThanOrEqual(0);
      expect(result.ambiguities[0].defaultIndex).toBeLessThan(2);
    });

    it('应该有置信度值', () => {
      const context: AmbiguityContext = {
        input: 'a/b+c',
      };

      const result = engine.detect(context);

      expect(result.ambiguities[0].confidence).toBeDefined();
      expect(result.ambiguities[0].confidence).toBeGreaterThanOrEqual(0);
      expect(result.ambiguities[0].confidence).toBeLessThanOrEqual(1);
    });

    it('默认应该选择解释 B（分数后加减）', () => {
      const context: AmbiguityContext = {
        input: 'a/b+c',
      };

      const result = engine.detect(context);
      const ambiguity = result.ambiguities[0];

      expect(ambiguity.defaultIndex).toBe(1);
      expect(ambiguity.candidates[1].label).toContain('解释 B');
    });
  });

  describe('调试信息', () => {
    beforeEach(() => {
      engine.registerRule(new FractionScopeRule());
    });

    it('应该提供命中的规则列表', () => {
      const context: AmbiguityContext = {
        input: 'a/b+c',
      };

      const result = engine.detect(context);

      expect(result.debug.matchedRules).toContain('fraction-scope');
    });

    it('应该提供检测时间信息', () => {
      const context: AmbiguityContext = {
        input: 'a/b+c',
      };

      const result = engine.detect(context);

      expect(result.debug.totalTime).toBeGreaterThanOrEqual(0);
      expect(result.debug.ruleTimings['fraction-scope']).toBeGreaterThanOrEqual(0);
    });

    it('无歧义时命中规则列表应为空', () => {
      const context: AmbiguityContext = {
        input: 'a+b',
      };

      const result = engine.detect(context);

      expect(result.debug.matchedRules).toHaveLength(0);
    });
  });

  describe('多个歧义检测', () => {
    beforeEach(() => {
      engine.registerRule(new FractionScopeRule());
    });

    it('应该检测到多个歧义', () => {
      const context: AmbiguityContext = {
        input: 'a/b+c and x/y-z',
      };

      const result = engine.detect(context);

      expect(result.ambiguities).toHaveLength(2);
      expect(result.ambiguities[0].range.text).toBe('a/b+c');
      expect(result.ambiguities[1].range.text).toBe('x/y-z');
    });
  });

  describe('错误处理', () => {
    it('规则执行失败不应该中断整体流程', () => {
      // 创建一个会抛出错误的规则
      const faultyRule = {
        id: 'faulty-rule',
        description: 'A faulty rule',
        detect: () => {
          throw new Error('Rule failed');
        },
        generateCandidates: () => [],
      };

      engine.registerRule(faultyRule);
      engine.registerRule(new FractionScopeRule());

      const context: AmbiguityContext = {
        input: 'a/b+c',
      };

      // 应该不会抛出错误
      expect(() => engine.detect(context)).not.toThrow();

      // 应该仍然能检测到其他规则的歧义
      const result = engine.detect(context);
      expect(result.ambiguities).toHaveLength(1);
      expect(result.ambiguities[0].ruleId).toBe('fraction-scope');
    });
  });
});
