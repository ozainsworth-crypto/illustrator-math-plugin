/**
 * 歧义引擎 - 核心实现
 * 
 * 提供可扩展的歧义检测与候选生成系统
 * 新增歧义只需添加新的规则文件，无需修改核心引擎
 */

import type {
  AmbiguityRule,
  AmbiguityContext,
  AmbiguityEngineResult,
  DetectedAmbiguity,
} from './types';

export class AmbiguityEngine {
  private rules: AmbiguityRule[] = [];
  private debugMode = false;

  /**
   * 注册歧义规则
   * @param rule - 歧义规则
   */
  registerRule(rule: AmbiguityRule): void {
    this.rules.push(rule);
    // 按优先级排序（优先级高的先执行）
    this.rules.sort((a, b) => (b.priority ?? 0) - (a.priority ?? 0));
  }

  /**
   * 批量注册规则
   * @param rules - 规则数组
   */
  registerRules(rules: AmbiguityRule[]): void {
    rules.forEach((rule) => this.registerRule(rule));
  }

  /**
   * 启用调试模式
   */
  enableDebug(): void {
    this.debugMode = true;
  }

  /**
   * 禁用调试模式
   */
  disableDebug(): void {
    this.debugMode = false;
  }

  /**
   * 检测歧义
   * @param context - 检测上下文
   * @returns 检测结果
   */
  detect(context: AmbiguityContext): AmbiguityEngineResult {
    const startTime = performance.now();
    const ambiguities: DetectedAmbiguity[] = [];
    const matchedRules: string[] = [];
    const ruleTimings: Record<string, number> = {};

    // 遍历所有规则
    for (const rule of this.rules) {
      const ruleStartTime = performance.now();

      try {
        // 检测匹配
        const matches = rule.detect(context);

        if (matches.length > 0) {
          matchedRules.push(rule.id);

          // 为每个匹配生成候选项
          for (const match of matches) {
            const candidates = rule.generateCandidates(context, match);

            // 计算评分
            let defaultIndex = 0;
            let confidence = 0.5;

            if (rule.score) {
              const scoreResult = rule.score(context, match);
              defaultIndex = scoreResult.defaultIndex;
              confidence = scoreResult.confidence;
            }

            // 添加到结果
            ambiguities.push({
              ruleId: rule.id,
              message: rule.description,
              range: match.range,
              candidates,
              defaultIndex,
              confidence,
            });
          }
        }
      } catch (error) {
        // 规则执行失败，记录错误但不中断整体流程
        if (this.debugMode) {
          console.error(`Rule ${rule.id} failed:`, error);
        }
      }

      const ruleEndTime = performance.now();
      ruleTimings[rule.id] = ruleEndTime - ruleStartTime;
    }

    // 过滤重叠的歧义（保留优先级高的，即先检测到的）
    const filteredAmbiguities = this.filterOverlappingAmbiguities(ambiguities);

    const endTime = performance.now();

    const result: AmbiguityEngineResult = {
      ambiguities: filteredAmbiguities,
      debug: {
        matchedRules,
        totalTime: endTime - startTime,
        ruleTimings,
      },
    };

    if (this.debugMode) {
      this.logDebugInfo(result);
    }

    return result;
  }

  /**
   * 过滤重叠的歧义
   * 
   * 当多个歧义的范围重叠时，保留优先级高的（先检测到的）
   * 规则已按优先级排序，所以先检测到的优先级更高
   * 
   * @param ambiguities - 原始歧义列表
   * @returns 过滤后的歧义列表
   */
  private filterOverlappingAmbiguities(
    ambiguities: DetectedAmbiguity[]
  ): DetectedAmbiguity[] {
    const filtered: DetectedAmbiguity[] = [];

    for (const ambiguity of ambiguities) {
      // 检查是否与已接受的歧义重叠
      const hasOverlap = filtered.some((accepted) =>
        this.rangesOverlap(ambiguity.range, accepted.range)
      );

      if (!hasOverlap) {
        filtered.push(ambiguity);
      } else if (this.debugMode) {
        console.log(
          `[AmbiguityEngine] 过滤重叠歧义: ${ambiguity.ruleId} [${ambiguity.range.start}, ${ambiguity.range.end}]`
        );
      }
    }

    return filtered;
  }

  /**
   * 检查两个范围是否重叠
   * 
   * @param range1 - 范围1
   * @param range2 - 范围2
   * @returns 是否重叠
   */
  private rangesOverlap(
    range1: { start: number; end: number },
    range2: { start: number; end: number }
  ): boolean {
    // 两个范围重叠的条件：
    // range1.start < range2.end && range2.start < range1.end
    return range1.start < range2.end && range2.start < range1.end;
  }

  /**
   * 获取已注册的规则列表
   */
  getRules(): ReadonlyArray<AmbiguityRule> {
    return this.rules;
  }

  /**
   * 清除所有规则
   */
  clearRules(): void {
    this.rules = [];
  }

  /**
   * 输出调试信息
   */
  private logDebugInfo(result: AmbiguityEngineResult): void {
    console.group('🔍 Ambiguity Engine Debug Info');
    console.log('Total ambiguities detected:', result.ambiguities.length);
    console.log('Matched rules:', result.debug.matchedRules);
    console.log('Total detection time:', `${result.debug.totalTime.toFixed(2)}ms`);
    console.log('Rule timings:', result.debug.ruleTimings);

    if (result.ambiguities.length > 0) {
      console.group('Detected Ambiguities:');
      result.ambiguities.forEach((amb, index) => {
        console.group(`${index + 1}. ${amb.ruleId}`);
        console.log('Message:', amb.message);
        console.log('Range:', amb.range);
        console.log('Candidates:', amb.candidates.length);
        console.log('Default:', amb.candidates[amb.defaultIndex]?.label);
        console.log('Confidence:', amb.confidence);
        console.groupEnd();
      });
      console.groupEnd();
    }

    console.groupEnd();
  }
}

/**
 * 创建默认的歧义引擎实例
 */
export function createAmbiguityEngine(): AmbiguityEngine {
  return new AmbiguityEngine();
}
