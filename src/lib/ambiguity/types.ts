/**
 * 歧义处理框架 - 类型定义
 * 
 * 提供可扩展的歧义检测与候选生成系统
 */

/**
 * 文本范围定位信息
 */
export interface TextRange {
  /** 起始位置 */
  start: number;
  /** 结束位置 */
  end: number;
  /** 匹配的文本 */
  text: string;
}

/**
 * 歧义候选项
 */
export interface AmbiguityCandidate {
  /** 候选标签（如 "解释 A", "解释 B"） */
  label: string;
  /** 候选的 LaTeX 表达式 */
  tex: string;
  /** 候选的解释说明 */
  explanation: string;
  /** 用于替换原输入中歧义片段的 LaTeX（用于完整公式重渲染） */
  replacementTex?: string;
}

/**
 * 歧义匹配结果
 */
export interface AmbiguityMatch {
  /** 匹配的文本范围 */
  range: TextRange;
  /** 匹配的上下文信息（可选） */
  context?: Record<string, unknown>;
}

/**
 * 检测到的歧义
 */
export interface DetectedAmbiguity {
  /** 规则 ID */
  ruleId: string;
  /** 歧义描述消息 */
  message: string;
  /** 歧义位置 */
  range: TextRange;
  /** 候选项列表 */
  candidates: AmbiguityCandidate[];
  /** 默认选择的候选索引 */
  defaultIndex: number;
  /** 置信度 (0-1) */
  confidence: number;
}

/**
 * 歧义检测上下文
 */
export interface AmbiguityContext {
  /** 原始输入 */
  input: string;
  /** 已转换的 LaTeX（如果有） */
  latex?: string;
  /** 额外的上下文信息 */
  metadata?: Record<string, unknown>;
}

/**
 * 歧义规则接口
 */
export interface AmbiguityRule {
  /** 规则唯一标识 */
  readonly id: string;
  
  /** 规则描述 */
  readonly description: string;
  
  /** 规则优先级（数字越大优先级越高，默认 0） */
  readonly priority?: number;
  
  /**
   * 检测歧义
   * @param context - 检测上下文
   * @returns 匹配结果数组
   */
  detect(context: AmbiguityContext): AmbiguityMatch[];
  
  /**
   * 生成候选项
   * @param context - 检测上下文
   * @param match - 匹配结果
   * @returns 候选项数组
   */
  generateCandidates(
    context: AmbiguityContext,
    match: AmbiguityMatch
  ): AmbiguityCandidate[];
  
  /**
   * 计算评分（可选）
   * @param context - 检测上下文
   * @param match - 匹配结果
   * @returns 评分结果 { defaultIndex, confidence }
   */
  score?(
    context: AmbiguityContext,
    match: AmbiguityMatch
  ): { defaultIndex: number; confidence: number };
}

/**
 * 歧义引擎结果
 */
export interface AmbiguityEngineResult {
  /** 检测到的歧义列表 */
  ambiguities: DetectedAmbiguity[];
  
  /** 调试信息 */
  debug: {
    /** 命中的规则列表 */
    matchedRules: string[];
    /** 总检测时间（毫秒） */
    totalTime: number;
    /** 每个规则的检测时间 */
    ruleTimings: Record<string, number>;
  };
}
