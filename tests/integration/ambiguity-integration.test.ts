/**
 * 歧义处理框架集成测试
 * 
 * 验证歧义检测、候选生成、UI 展示的完整链路
 */

import { describe, it, expect, beforeEach } from 'vitest';
import { AmbiguityEngine } from '../../src/lib/ambiguity/ambiguity-engine';
import { FractionScopeRule } from '../../src/lib/ambiguity/rules';
import type { AmbiguityContext, AmbiguityMatch, AmbiguityCandidate } from '../../src/lib/ambiguity/types';

describe('歧义处理框架集成测试', () => {
  let engine: AmbiguityEngine;

  beforeEach(() => {
    engine = new AmbiguityEngine();
    engine.registerRule(new FractionScopeRule());
  });

  describe('完整链路验证', () => {
    it('应该完成检测 → 候选生成 → 默认选择的完整流程', () => {
      const context: AmbiguityContext = {
        input: 'a/b+c',
      };

      // 1. 检测歧义
      const result = engine.detect(context);
      expect(result.ambiguities).toHaveLength(1);

      const ambiguity = result.ambiguities[0];

      // 2. 验证候选项已生成
      expect(ambiguity.candidates).toHaveLength(2);
      expect(ambiguity.candidates[0].tex).toBeTruthy();
      expect(ambiguity.candidates[1].tex).toBeTruthy();

      // 3. 验证默认选择
      expect(ambiguity.defaultIndex).toBeDefined();
      const defaultCandidate = ambiguity.candidates[ambiguity.defaultIndex];
      expect(defaultCandidate).toBeTruthy();

      // 4. 验证候选项可用于渲染
      expect(defaultCandidate.tex).toMatch(/\\frac/);
    });

    it('应该支持用户切换候选项', () => {
      const context: AmbiguityContext = {
        input: 'a/b+c',
      };

      const result = engine.detect(context);
      const ambiguity = result.ambiguities[0];

      // 模拟用户选择不同的候选项
      const candidate0 = ambiguity.candidates[0];
      const candidate1 = ambiguity.candidates[1];

      // 验证两个候选项的 LaTeX 不同
      expect(candidate0.tex).not.toBe(candidate1.tex);

      // 验证两个候选项都可以用于渲染
      expect(candidate0.tex).toMatch(/\\frac\{a\}\{b\+c\}/);
      expect(candidate1.tex).toMatch(/\\frac\{a\}\{b\}\+c/);
    });
  });

  describe('示例规则验证', () => {
    it('示例：分数作用域歧义 a/b+c', () => {
      const context: AmbiguityContext = {
        input: 'a/b+c',
      };

      const result = engine.detect(context);

      // 验证检测命中
      expect(result.ambiguities).toHaveLength(1);
      expect(result.ambiguities[0].ruleId).toBe('fraction-scope');

      // 验证候选数量 = 2
      expect(result.ambiguities[0].candidates).toHaveLength(2);

      // 验证候选 tex 不同
      const cand0 = result.ambiguities[0].candidates[0];
      const cand1 = result.ambiguities[0].candidates[1];
      expect(cand0.tex).not.toBe(cand1.tex);

      // 验证候选项包含必要信息
      expect(cand0.label).toBeTruthy();
      expect(cand0.explanation).toBeTruthy();
      expect(cand1.label).toBeTruthy();
      expect(cand1.explanation).toBeTruthy();
    });

    it('示例：无歧义样例 a/b 不应误报', () => {
      const context: AmbiguityContext = {
        input: 'a/b',
      };

      const result = engine.detect(context);

      // 验证不会误报
      expect(result.ambiguities).toHaveLength(0);
    });

    it('示例：明确括号 a/(b+c) 不应误报', () => {
      const context: AmbiguityContext = {
        input: 'a/(b+c)',
      };

      const result = engine.detect(context);

      // 验证不会误报
      expect(result.ambiguities).toHaveLength(0);
    });
  });

  describe('UI 集成场景', () => {
    it('应该提供 UI 所需的所有信息', () => {
      const context: AmbiguityContext = {
        input: 'a/b+c',
      };

      const result = engine.detect(context);
      const ambiguity = result.ambiguities[0];

      // UI 需要的信息
      expect(ambiguity.message).toBeTruthy(); // 显示给用户的消息
      expect(ambiguity.range).toBeTruthy(); // 定位信息
      expect(ambiguity.range.text).toBe('a/b+c'); // 高亮文本
      expect(ambiguity.candidates).toHaveLength(2); // 候选列表
      expect(ambiguity.defaultIndex).toBeGreaterThanOrEqual(0); // 默认选择
      expect(ambiguity.confidence).toBeGreaterThan(0); // 置信度
    });

    it('应该支持多个歧义的展示', () => {
      const context: AmbiguityContext = {
        input: 'a/b+c and x/y-z',
      };

      const result = engine.detect(context);

      // 验证检测到多个歧义
      expect(result.ambiguities).toHaveLength(2);

      // 每个歧义都有完整信息
      result.ambiguities.forEach((amb) => {
        expect(amb.message).toBeTruthy();
        expect(amb.candidates).toHaveLength(2);
        expect(amb.defaultIndex).toBeGreaterThanOrEqual(0);
      });
    });
  });

  describe('性能验证', () => {
    it('检测时间应该在合理范围内', () => {
      const context: AmbiguityContext = {
        input: 'a/b+c',
      };

      const result = engine.detect(context);

      // 验证检测时间 < 10ms
      expect(result.debug.totalTime).toBeLessThan(10);
    });

    it('应该提供性能调试信息', () => {
      const context: AmbiguityContext = {
        input: 'a/b+c',
      };

      const result = engine.detect(context);

      // 验证调试信息完整
      expect(result.debug.matchedRules).toBeDefined();
      expect(result.debug.totalTime).toBeGreaterThanOrEqual(0);
      expect(result.debug.ruleTimings).toBeDefined();
      expect(result.debug.ruleTimings['fraction-scope']).toBeGreaterThanOrEqual(0);
    });
  });

  describe('可扩展性验证', () => {
    it('应该支持动态添加新规则', () => {
      // 创建一个简单的测试规则
      const testRule = {
        id: 'test-rule',
        description: 'Test rule',
        priority: 5,
        detect: (ctx: AmbiguityContext): AmbiguityMatch[] => {
          if (ctx.input.includes('test')) {
            return [
              {
                range: {
                  start: 0,
                  end: ctx.input.length,
                  text: ctx.input,
                },
              },
            ];
          }
          return [];
        },
        generateCandidates: (): AmbiguityCandidate[] => [
          {
            label: 'Test A',
            tex: 'test_a',
            explanation: 'Test explanation A',
          },
          {
            label: 'Test B',
            tex: 'test_b',
            explanation: 'Test explanation B',
          },
        ],
      };

      engine.registerRule(testRule);

      const context: AmbiguityContext = {
        input: 'test input',
      };

      const result = engine.detect(context);

      // 验证新规则生效
      expect(result.ambiguities.length).toBeGreaterThan(0);
      const testAmbiguity = result.ambiguities.find((a) => a.ruleId === 'test-rule');
      expect(testAmbiguity).toBeDefined();
    });
  });
});
