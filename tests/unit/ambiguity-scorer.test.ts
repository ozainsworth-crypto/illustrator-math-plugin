/**
 * AmbiguityScorer 单元测试
 * 
 * 测试范围：
 * - 评分逻辑
 * - 自动选择规则
 * - 歧义类型分类
 * 
 * 关联需求：需求 2（B3.7-8）
 */

import { describe, it, expect, beforeEach } from 'vitest';
import {
  AmbiguityScorer,
  AmbiguityType,
  createAmbiguityScorer,
  type Candidate,
} from '../../src/lib/ambiguity-scorer';

describe('AmbiguityScorer', () => {
  let scorer: AmbiguityScorer;

  beforeEach(() => {
    scorer = new AmbiguityScorer();
  });

  describe('构造函数和配置', () => {
    it('应该使用默认配置创建实例', () => {
      const config = scorer.getConfig();
      expect(config.autoSelectThreshold).toBe(0.3);
      expect(config.minConfidenceThreshold).toBe(0.6);
      expect(config.enableAutoSelect).toBe(true);
    });

    it('应该接受自定义配置', () => {
      const customScorer = new AmbiguityScorer({
        autoSelectThreshold: 0.5,
        minConfidenceThreshold: 0.7,
      });
      const config = customScorer.getConfig();
      expect(config.autoSelectThreshold).toBe(0.5);
      expect(config.minConfidenceThreshold).toBe(0.7);
      expect(config.enableAutoSelect).toBe(true);
    });

    it('应该支持更新配置', () => {
      scorer.updateConfig({ autoSelectThreshold: 0.4 });
      const config = scorer.getConfig();
      expect(config.autoSelectThreshold).toBe(0.4);
      expect(config.minConfidenceThreshold).toBe(0.6);
    });

    it('应该支持重置配置', () => {
      scorer.updateConfig({ autoSelectThreshold: 0.5 });
      scorer.resetConfig();
      const config = scorer.getConfig();
      expect(config.autoSelectThreshold).toBe(0.3);
    });

    it('应该通过工厂函数创建实例', () => {
      const factoryScorer = createAmbiguityScorer({ autoSelectThreshold: 0.4 });
      const config = factoryScorer.getConfig();
      expect(config.autoSelectThreshold).toBe(0.4);
    });
  });

  describe('评分逻辑', () => {
    it('应该在只有一个候选项时自动选择', () => {
      const candidates: Candidate[] = [
        { label: 'Option 1', latex: 'x^{2}', confidence: 0.8 },
      ];

      const result = scorer.score(candidates);
      expect(result.shouldAutoSelect).toBe(true);
      expect(result.recommendedIndex).toBe(0);
      expect(result.maxConfidence).toBe(0.8);
      expect(result.confidenceDelta).toBe(1.0);
    });

    it('应该在置信度差异大于阈值时自动选择', () => {
      const candidates: Candidate[] = [
        { label: 'Option 1', latex: 'x^{2^{3}}', confidence: 0.9 },
        { label: 'Option 2', latex: '(x^{2})^{3}', confidence: 0.5 },
      ];

      const result = scorer.score(candidates);
      expect(result.shouldAutoSelect).toBe(true);
      expect(result.recommendedIndex).toBe(0);
      expect(result.confidenceDelta).toBe(0.4);
      expect(result.maxConfidence).toBe(0.9);
    });

    it('应该在置信度差异小于阈值时不自动选择', () => {
      const candidates: Candidate[] = [
        { label: 'Option 1', latex: 'x^{2^{3}}', confidence: 0.7 },
        { label: 'Option 2', latex: '(x^{2})^{3}', confidence: 0.6 },
      ];

      const result = scorer.score(candidates);
      expect(result.shouldAutoSelect).toBe(false);
      expect(result.recommendedIndex).toBe(0);
      expect(result.confidenceDelta).toBeCloseTo(0.1, 10);
    });

    it('应该在最高置信度低于最低阈值时不自动选择', () => {
      const candidates: Candidate[] = [
        { label: 'Option 1', latex: 'x^{2^{3}}', confidence: 0.5 },
        { label: 'Option 2', latex: '(x^{2})^{3}', confidence: 0.1 },
      ];

      const result = scorer.score(candidates);
      expect(result.shouldAutoSelect).toBe(false);
      expect(result.maxConfidence).toBe(0.5);
    });

    it('应该正确排序候选项并返回原始索引', () => {
      const candidates: Candidate[] = [
        { label: 'Option 1', latex: 'x^{2^{3}}', confidence: 0.5 },
        { label: 'Option 2', latex: '(x^{2})^{3}', confidence: 0.9 },
        { label: 'Option 3', latex: 'x^{6}', confidence: 0.3 },
      ];

      const result = scorer.score(candidates);
      expect(result.recommendedIndex).toBe(1); // Option 2 的原始索引
      expect(result.maxConfidence).toBe(0.9);
    });

    it('应该在禁用自动选择时总是返回 false', () => {
      scorer.updateConfig({ enableAutoSelect: false });

      const candidates: Candidate[] = [
        { label: 'Option 1', latex: 'x^{2^{3}}', confidence: 0.9 },
        { label: 'Option 2', latex: '(x^{2})^{3}', confidence: 0.1 },
      ];

      const result = scorer.score(candidates);
      expect(result.shouldAutoSelect).toBe(false);
    });

    it('应该抛出错误当候选项列表为空', () => {
      expect(() => scorer.score([])).toThrow('候选项列表不能为空');
    });
  });

  describe('歧义类型分类', () => {
    it('应该识别多级上标歧义', () => {
      const type1 = scorer.classifyAmbiguityType('superscript-ambiguity', 'x^2^3');
      expect(type1).toBe(AmbiguityType.MULTI_LEVEL_SUPERSCRIPT);

      const type2 = scorer.classifyAmbiguityType('exponent-rule', 'a^b^c');
      expect(type2).toBe(AmbiguityType.MULTI_LEVEL_SUPERSCRIPT);

      const type3 = scorer.classifyAmbiguityType('unknown', 'x^2^3');
      expect(type3).toBe(AmbiguityType.MULTI_LEVEL_SUPERSCRIPT);
    });

    it('应该识别多级下标歧义', () => {
      const type1 = scorer.classifyAmbiguityType('subscript-ambiguity', 'x_i_j');
      expect(type1).toBe(AmbiguityType.MULTI_LEVEL_SUBSCRIPT);

      const type2 = scorer.classifyAmbiguityType('unknown', 'a_b_c');
      expect(type2).toBe(AmbiguityType.MULTI_LEVEL_SUBSCRIPT);
    });

    it('应该识别分数范围歧义', () => {
      const type1 = scorer.classifyAmbiguityType('fraction-scope', 'a/b/c');
      expect(type1).toBe(AmbiguityType.FRACTION_SCOPE);

      const type2 = scorer.classifyAmbiguityType('division-rule', '1/2/3');
      expect(type2).toBe(AmbiguityType.FRACTION_SCOPE);

      const type3 = scorer.classifyAmbiguityType('unknown', 'a/b/c');
      expect(type3).toBe(AmbiguityType.FRACTION_SCOPE);
    });

    it('应该识别括号优先级歧义', () => {
      const type1 = scorer.classifyAmbiguityType('parenthesis-priority', '(a+b)/c');
      expect(type1).toBe(AmbiguityType.PARENTHESIS_PRIORITY);

      const type2 = scorer.classifyAmbiguityType('bracket-rule', '[a+b]/c');
      expect(type2).toBe(AmbiguityType.PARENTHESIS_PRIORITY);
    });

    it('应该识别运算符优先级歧义', () => {
      const type = scorer.classifyAmbiguityType('operator-priority', 'a+b*c');
      expect(type).toBe(AmbiguityType.OPERATOR_PRIORITY);
    });

    it('应该识别矩阵分隔符歧义', () => {
      const type = scorer.classifyAmbiguityType('matrix-delimiter', '■(a&b@c&d)');
      expect(type).toBe(AmbiguityType.MATRIX_DELIMITER);
    });

    it('应该将未知类型归类为 OTHER', () => {
      const type = scorer.classifyAmbiguityType('unknown-rule', 'some input');
      expect(type).toBe(AmbiguityType.OTHER);
    });
  });

  describe('评分结果包含歧义类型', () => {
    it('应该在评分结果中包含歧义类型', () => {
      const candidates: Candidate[] = [
        { label: 'Option 1', latex: 'x^{2^{3}}', confidence: 0.9 },
        { label: 'Option 2', latex: '(x^{2})^{3}', confidence: 0.5 },
      ];

      const result = scorer.score(candidates, AmbiguityType.MULTI_LEVEL_SUPERSCRIPT);
      expect(result.ambiguityType).toBe(AmbiguityType.MULTI_LEVEL_SUPERSCRIPT);
    });

    it('应该默认使用 OTHER 类型', () => {
      const candidates: Candidate[] = [
        { label: 'Option 1', latex: 'x^{2}', confidence: 0.8 },
      ];

      const result = scorer.score(candidates);
      expect(result.ambiguityType).toBe(AmbiguityType.OTHER);
    });
  });

  describe('边界情况', () => {
    it('应该处理所有候选项置信度相同的情况', () => {
      const candidates: Candidate[] = [
        { label: 'Option 1', latex: 'x^{2^{3}}', confidence: 0.7 },
        { label: 'Option 2', latex: '(x^{2})^{3}', confidence: 0.7 },
      ];

      const result = scorer.score(candidates);
      expect(result.confidenceDelta).toBe(0);
      expect(result.shouldAutoSelect).toBe(false);
    });

    it('应该处理置信度为 0 的候选项', () => {
      const candidates: Candidate[] = [
        { label: 'Option 1', latex: 'x^{2^{3}}', confidence: 0.8 },
        { label: 'Option 2', latex: '(x^{2})^{3}', confidence: 0 },
      ];

      const result = scorer.score(candidates);
      expect(result.shouldAutoSelect).toBe(true);
      expect(result.confidenceDelta).toBe(0.8);
    });

    it('应该处理置信度为 1 的候选项', () => {
      const candidates: Candidate[] = [
        { label: 'Option 1', latex: 'x^{2}', confidence: 1.0 },
        { label: 'Option 2', latex: 'x^2', confidence: 0.5 },
      ];

      const result = scorer.score(candidates);
      expect(result.shouldAutoSelect).toBe(true);
      expect(result.maxConfidence).toBe(1.0);
    });

    it('应该处理多个候选项（> 2）', () => {
      const candidates: Candidate[] = [
        { label: 'Option 1', latex: 'x^{2^{3}}', confidence: 0.5 },
        { label: 'Option 2', latex: '(x^{2})^{3}', confidence: 0.9 },
        { label: 'Option 3', latex: 'x^{6}', confidence: 0.3 },
        { label: 'Option 4', latex: 'x^{2}^{3}', confidence: 0.7 },
      ];

      const result = scorer.score(candidates);
      expect(result.recommendedIndex).toBe(1);
      expect(result.maxConfidence).toBe(0.9);
      expect(result.confidenceDelta).toBeCloseTo(0.2, 10); // 0.9 - 0.7
    });
  });

  describe('配置阈值调整', () => {
    it('应该根据自定义阈值做出决策', () => {
      const customScorer = new AmbiguityScorer({
        autoSelectThreshold: 0.5,
        minConfidenceThreshold: 0.8,
      });

      const candidates: Candidate[] = [
        { label: 'Option 1', latex: 'x^{2^{3}}', confidence: 0.9 },
        { label: 'Option 2', latex: '(x^{2})^{3}', confidence: 0.5 },
      ];

      const result = customScorer.score(candidates);
      expect(result.shouldAutoSelect).toBe(false); // 置信度差异 0.4 < 0.5
    });

    it('应该在最高置信度低于自定义最低阈值时不自动选择', () => {
      const customScorer = new AmbiguityScorer({
        minConfidenceThreshold: 0.95,
      });

      const candidates: Candidate[] = [
        { label: 'Option 1', latex: 'x^{2^{3}}', confidence: 0.9 },
        { label: 'Option 2', latex: '(x^{2})^{3}', confidence: 0.1 },
      ];

      const result = customScorer.score(candidates);
      expect(result.shouldAutoSelect).toBe(false);
    });
  });
});
