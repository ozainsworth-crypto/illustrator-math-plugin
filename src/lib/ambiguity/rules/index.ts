/**
 * 歧义规则索引
 * 
 * 导出所有可用的歧义规则
 * 新增规则时，只需在此文件中导入并导出即可
 */

import type { AmbiguityRule } from '../types';

export { FractionScopeRule } from './fraction-scope-rule';
export { SimpleFractionRule } from './simple-fraction-rule';

// 未来可以在这里添加更多规则：
// export { SuperscriptAmbiguityRule } from './superscript-ambiguity-rule';
// export { BracketPriorityRule } from './bracket-priority-rule';
// export { ImplicitMultiplicationRule } from './implicit-multiplication-rule';

/**
 * 所有已注册的规则列表
 * 新增规则时，需要在此数组中添加实例
 */
import { FractionScopeRule } from './fraction-scope-rule';
import { fractionExponentRule } from './fraction-exponent-rule';
import { simpleFractionRule } from './simple-fraction-rule';

export const allRules: AmbiguityRule[] = [
  simpleFractionRule, // 优先级最高，先检测简单分数
  new FractionScopeRule(),
  fractionExponentRule,
  // 未来添加更多规则实例：
  // new SuperscriptAmbiguityRule(),
  // new BracketPriorityRule(),
  // new ImplicitMultiplicationRule(),
];
