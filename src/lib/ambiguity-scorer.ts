/**
 * AmbiguityScorer - 歧义评分与自动选择组件
 * 
 * 功能：
 * - 基于置信度评分歧义候选项
 * - 实现自动选择规则（置信度差异 > 阈值时自动选择）
 * - 分类歧义类型
 * 
 * 关联需求：需求 2（B3.7-8）
 * 关联设计：设计文档"组件设计 > AmbiguityScorer"章节
 */

/**
 * 歧义类型枚举
 */
export const AmbiguityType = {
  /** 多级上标歧义 (如 x^2^3) */
  MULTI_LEVEL_SUPERSCRIPT: 'multi_level_superscript',
  /** 多级下标歧义 (如 x_i_j) */
  MULTI_LEVEL_SUBSCRIPT: 'multi_level_subscript',
  /** 分数范围歧义 (如 a/b/c) */
  FRACTION_SCOPE: 'fraction_scope',
  /** 括号优先级歧义 (如 (a+b)/c vs a/(b+c)) */
  PARENTHESIS_PRIORITY: 'parenthesis_priority',
  /** 运算符优先级歧义 */
  OPERATOR_PRIORITY: 'operator_priority',
  /** 矩阵分隔符歧义 */
  MATRIX_DELIMITER: 'matrix_delimiter',
  /** 其他未分类歧义 */
  OTHER: 'other',
} as const;

export type AmbiguityType = typeof AmbiguityType[keyof typeof AmbiguityType];

/**
 * 候选项接口
 */
export interface Candidate {
  /** 候选项标签 */
  label: string;
  /** 转换后的 LaTeX */
  latex: string;
  /** 置信度 (0-1) */
  confidence: number;
  /** 描述 */
  description?: string;
}

/**
 * 评分结果接口
 */
export interface ScoringResult {
  /** 是否应该自动选择 */
  shouldAutoSelect: boolean;
  /** 推荐的候选项索引 */
  recommendedIndex: number;
  /** 置信度差异 */
  confidenceDelta: number;
  /** 最高置信度 */
  maxConfidence: number;
  /** 歧义类型 */
  ambiguityType: AmbiguityType;
}

/**
 * 评分配置接口
 */
export interface ScorerConfig {
  /** 自动选择的置信度差异阈值 (默认 0.3) */
  autoSelectThreshold: number;
  /** 最低置信度阈值 (默认 0.6) */
  minConfidenceThreshold: number;
  /** 是否启用自动选择 (默认 true) */
  enableAutoSelect: boolean;
}

/**
 * 默认配置
 */
const DEFAULT_CONFIG: ScorerConfig = {
  autoSelectThreshold: 0.3,
  minConfidenceThreshold: 0.6,
  enableAutoSelect: true,
};

/**
 * AmbiguityScorer 类
 * 
 * 负责评分歧义候选项并决定是否自动选择
 */
export class AmbiguityScorer {
  private config: ScorerConfig;

  constructor(config?: Partial<ScorerConfig>) {
    this.config = { ...DEFAULT_CONFIG, ...config };
  }

  /**
   * 评分候选项并决定是否自动选择
   * @param candidates - 候选项列表
   * @param ambiguityType - 歧义类型
   * @returns 评分结果
   */
  score(candidates: Candidate[], ambiguityType: AmbiguityType = AmbiguityType.OTHER): ScoringResult {
    if (candidates.length === 0) {
      throw new Error('候选项列表不能为空');
    }

    if (candidates.length === 1) {
      // 只有一个候选项，直接选择
      return {
        shouldAutoSelect: true,
        recommendedIndex: 0,
        confidenceDelta: 1.0,
        maxConfidence: candidates[0].confidence,
        ambiguityType,
      };
    }

    // 按置信度排序（降序）
    const sortedCandidates = candidates
      .map((candidate, index) => ({ candidate, originalIndex: index }))
      .sort((a, b) => b.candidate.confidence - a.candidate.confidence);

    const topCandidate = sortedCandidates[0];
    const secondCandidate = sortedCandidates[1];

    const maxConfidence = topCandidate.candidate.confidence;
    const confidenceDelta = maxConfidence - secondCandidate.candidate.confidence;

    // 决策逻辑：
    // 1. 如果禁用自动选择，总是返回 false
    // 2. 如果最高置信度 < 最低阈值，不自动选择
    // 3. 如果置信度差异 >= 阈值，自动选择
    const shouldAutoSelect =
      this.config.enableAutoSelect &&
      maxConfidence >= this.config.minConfidenceThreshold &&
      confidenceDelta >= this.config.autoSelectThreshold;

    return {
      shouldAutoSelect,
      recommendedIndex: topCandidate.originalIndex,
      confidenceDelta,
      maxConfidence,
      ambiguityType,
    };
  }

  /**
   * 分类歧义类型
   * @param ruleId - 规则 ID
   * @param input - 输入字符串
   * @returns 歧义类型
   */
  classifyAmbiguityType(ruleId: string, input: string): AmbiguityType {
    // 基于规则 ID 分类
    if (ruleId.includes('superscript') || ruleId.includes('exponent')) {
      return AmbiguityType.MULTI_LEVEL_SUPERSCRIPT;
    }

    if (ruleId.includes('subscript')) {
      return AmbiguityType.MULTI_LEVEL_SUBSCRIPT;
    }

    if (ruleId.includes('fraction') || ruleId.includes('division')) {
      return AmbiguityType.FRACTION_SCOPE;
    }

    if (ruleId.includes('parenthesis') || ruleId.includes('bracket')) {
      return AmbiguityType.PARENTHESIS_PRIORITY;
    }

    if (ruleId.includes('operator')) {
      return AmbiguityType.OPERATOR_PRIORITY;
    }

    if (ruleId.includes('matrix')) {
      return AmbiguityType.MATRIX_DELIMITER;
    }

    // 基于输入内容分类
    if (input.includes('^') && input.match(/\^.*\^/)) {
      return AmbiguityType.MULTI_LEVEL_SUPERSCRIPT;
    }

    if (input.includes('_') && input.match(/_.*_/)) {
      return AmbiguityType.MULTI_LEVEL_SUBSCRIPT;
    }

    if (input.match(/\/.*\//)) {
      return AmbiguityType.FRACTION_SCOPE;
    }

    return AmbiguityType.OTHER;
  }

  /**
   * 更新配置
   * @param config - 新配置
   */
  updateConfig(config: Partial<ScorerConfig>): void {
    this.config = { ...this.config, ...config };
  }

  /**
   * 获取当前配置
   */
  getConfig(): Readonly<ScorerConfig> {
    return { ...this.config };
  }

  /**
   * 重置为默认配置
   */
  resetConfig(): void {
    this.config = { ...DEFAULT_CONFIG };
  }
}

/**
 * 创建默认的 AmbiguityScorer 实例
 */
export function createAmbiguityScorer(config?: Partial<ScorerConfig>): AmbiguityScorer {
  return new AmbiguityScorer(config);
}
