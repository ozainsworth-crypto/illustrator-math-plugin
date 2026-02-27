# 歧义处理框架使用指南

**版本**: 1.0.0  
**日期**: 2026-02-02  
**状态**: Phase 2 实现

---

## 概述

歧义处理框架提供了一个可扩展的系统，用于检测数学表达式中的歧义并生成候选解释。框架采用规则驱动的设计，新增歧义类型只需添加新的规则文件，无需修改核心引擎。

### 核心特性

- ✅ **可扩展**: 基于规则系统，易于添加新的歧义类型
- ✅ **可配置**: 支持优先级、评分、置信度等配置
- ✅ **可测试**: 完整的单元测试和集成测试覆盖
- ✅ **可视化**: 提供 UI 组件展示歧义和候选项
- ✅ **高性能**: 检测时间 < 10ms，支持性能监控

---

## 架构设计

### 核心组件

```
AmbiguityEngine (核心引擎)
├── 规则注册与管理
├── 歧义检测
├── 候选生成
├── 评分与默认选择
└── 调试信息输出

AmbiguityRule (规则接口)
├── detect() - 检测歧义
├── generateCandidates() - 生成候选项
└── score() - 计算评分（可选）

AmbiguityPrompt (UI 组件)
├── 显示歧义提示
├── 展示候选列表
├── MathJax 预览
└── 用户选择处理
```

### 数据流

```
输入文本
    ↓
AmbiguityEngine.detect()
    ↓
遍历所有规则
    ↓
规则.detect() → 匹配结果
    ↓
规则.generateCandidates() → 候选项
    ↓
规则.score() → 默认选择
    ↓
返回 DetectedAmbiguity[]
    ↓
AmbiguityPrompt.show()
    ↓
用户选择候选项
    ↓
使用选中的 LaTeX 渲染
```

---

## 快速开始

### 1. 创建歧义引擎

```typescript
import { AmbiguityEngine } from './lib/ambiguity/ambiguity-engine';
import { FractionScopeRule } from './lib/ambiguity/rules';

// 创建引擎实例
const engine = new AmbiguityEngine();

// 注册规则
engine.registerRule(new FractionScopeRule());

// 启用调试模式（可选）
engine.enableDebug();
```

### 2. 检测歧义

```typescript
import type { AmbiguityContext } from './lib/ambiguity/types';

const context: AmbiguityContext = {
  input: 'a/b+c',
  latex: '\\frac{a}{b}+c', // 可选
};

const result = engine.detect(context);

console.log('检测到的歧义:', result.ambiguities.length);
console.log('命中的规则:', result.debug.matchedRules);
console.log('检测时间:', result.debug.totalTime, 'ms');
```

### 3. 使用 UI 组件

```typescript
import { AmbiguityPrompt } from './components/ambiguity-prompt';

// 创建 UI 组件
const prompt = new AmbiguityPrompt('ambiguity-prompt');

// 显示歧义
prompt.show(result.ambiguities);

// 渲染 MathJax 预览
await prompt.renderPreviews(async (tex) => {
  return await generator.renderLatex(tex);
});

// 监听用户选择
prompt.onSelect((ambiguityIndex, candidateIndex) => {
  const ambiguity = result.ambiguities[ambiguityIndex];
  const candidate = ambiguity.candidates[candidateIndex];
  
  console.log('用户选择:', candidate.label);
  console.log('使用 LaTeX:', candidate.tex);
  
  // 使用选中的 LaTeX 重新渲染
  generator.renderLatex(candidate.tex);
});
```

---

## 创建自定义规则

### 规则接口

```typescript
export interface AmbiguityRule {
  readonly id: string;              // 规则唯一标识
  readonly description: string;     // 规则描述
  readonly priority?: number;       // 优先级（可选）
  
  detect(context: AmbiguityContext): AmbiguityMatch[];
  generateCandidates(context: AmbiguityContext, match: AmbiguityMatch): AmbiguityCandidate[];
  score?(context: AmbiguityContext, match: AmbiguityMatch): { defaultIndex: number; confidence: number };
}
```

### 示例：创建新规则

```typescript
// src/lib/ambiguity/rules/my-custom-rule.ts

import type {
  AmbiguityRule,
  AmbiguityContext,
  AmbiguityMatch,
  AmbiguityCandidate,
} from '../types';

export class MyCustomRule implements AmbiguityRule {
  readonly id = 'my-custom-rule';
  readonly description = '我的自定义歧义规则';
  readonly priority = 10;

  detect(context: AmbiguityContext): AmbiguityMatch[] {
    const matches: AmbiguityMatch[] = [];
    const input = context.input;

    // 实现检测逻辑
    const pattern = /your-pattern/g;
    let match: RegExpExecArray | null;

    while ((match = pattern.exec(input)) !== null) {
      matches.push({
        range: {
          start: match.index,
          end: match.index + match[0].length,
          text: match[0],
        },
        context: {
          // 保存匹配的上下文信息
        },
      });
    }

    return matches;
  }

  generateCandidates(
    context: AmbiguityContext,
    match: AmbiguityMatch
  ): AmbiguityCandidate[] {
    return [
      {
        label: '解释 A',
        tex: '\\latex_a',
        explanation: '解释 A 的说明',
      },
      {
        label: '解释 B',
        tex: '\\latex_b',
        explanation: '解释 B 的说明',
      },
    ];
  }

  score(
    context: AmbiguityContext,
    match: AmbiguityMatch
  ): { defaultIndex: number; confidence: number } {
    return {
      defaultIndex: 0,  // 默认选择第一个候选项
      confidence: 0.7,  // 置信度 70%
    };
  }
}
```

### 注册新规则

```typescript
// src/lib/ambiguity/rules/index.ts

export { FractionScopeRule } from './fraction-scope-rule';
export { MyCustomRule } from './my-custom-rule';  // 添加新规则

// 使用
import { MyCustomRule } from './lib/ambiguity/rules';

engine.registerRule(new MyCustomRule());
```

---

## 内置规则

### FractionScopeRule (分数作用域歧义)

**规则 ID**: `fraction-scope`

**检测模式**: `word / word +/- word`

**示例**:
- 输入: `a/b+c`
- 候选 A: `\frac{a}{b+c}` (分母包含后续项)
- 候选 B: `\frac{a}{b}+c` (分数后加减) ⭐ 默认

**优先级**: 10

**置信度**: 0.6 (中等，建议用户确认)

---

## 测试

### 单元测试

```typescript
import { describe, it, expect } from 'vitest';
import { AmbiguityEngine } from './lib/ambiguity/ambiguity-engine';
import { MyCustomRule } from './lib/ambiguity/rules';

describe('MyCustomRule', () => {
  it('应该检测到歧义', () => {
    const engine = new AmbiguityEngine();
    engine.registerRule(new MyCustomRule());

    const result = engine.detect({ input: 'test input' });

    expect(result.ambiguities).toHaveLength(1);
    expect(result.ambiguities[0].ruleId).toBe('my-custom-rule');
  });
});
```

### 集成测试

```typescript
describe('完整链路测试', () => {
  it('应该完成检测 → 候选生成 → 用户选择的完整流程', () => {
    const engine = new AmbiguityEngine();
    engine.registerRule(new MyCustomRule());

    // 1. 检测
    const result = engine.detect({ input: 'test' });
    expect(result.ambiguities).toHaveLength(1);

    // 2. 获取候选项
    const candidates = result.ambiguities[0].candidates;
    expect(candidates).toHaveLength(2);

    // 3. 模拟用户选择
    const selectedCandidate = candidates[1];
    expect(selectedCandidate.tex).toBeTruthy();
  });
});
```

---

## 性能优化

### 规则优先级

规则按优先级从高到低执行。高优先级规则先执行，可以提前返回结果。

```typescript
export class HighPriorityRule implements AmbiguityRule {
  readonly priority = 100;  // 高优先级
  // ...
}

export class LowPriorityRule implements AmbiguityRule {
  readonly priority = 1;    // 低优先级
  // ...
}
```

### 性能监控

```typescript
const result = engine.detect(context);

console.log('总检测时间:', result.debug.totalTime, 'ms');
console.log('各规则耗时:', result.debug.ruleTimings);
```

### 调试模式

```typescript
engine.enableDebug();  // 启用调试输出

const result = engine.detect(context);
// 控制台会输出详细的调试信息

engine.disableDebug(); // 禁用调试输出
```

---

## 最佳实践

### 1. 规则设计原则

- ✅ **单一职责**: 每个规则只检测一种歧义类型
- ✅ **明确边界**: 清晰定义规则的适用范围
- ✅ **避免误报**: 宁可漏检，不要误报
- ✅ **提供上下文**: 在 match.context 中保存有用的信息

### 2. 候选项设计

- ✅ **清晰标签**: 使用易懂的标签（如"解释 A"、"解释 B"）
- ✅ **详细解释**: 提供足够的说明帮助用户理解
- ✅ **合理默认**: 选择最常见的解释作为默认

### 3. 评分策略

- ✅ **置信度范围**: 0.0 - 1.0
  - 0.0 - 0.3: 低置信度，强烈建议用户确认
  - 0.4 - 0.6: 中等置信度，建议用户确认
  - 0.7 - 1.0: 高置信度，可以自动选择

### 4. 测试覆盖

- ✅ **正向测试**: 验证能检测到歧义
- ✅ **负向测试**: 验证不会误报
- ✅ **边界测试**: 测试边界情况
- ✅ **性能测试**: 验证检测时间在合理范围内

---

## 常见问题

### Q: 如何添加新的歧义类型？

A: 创建新的规则类实现 `AmbiguityRule` 接口，然后在 `rules/index.ts` 中导出，最后注册到引擎。

### Q: 规则的执行顺序是什么？

A: 按优先级从高到低执行。相同优先级的规则按注册顺序执行。

### Q: 如何调试规则？

A: 启用调试模式 `engine.enableDebug()`，控制台会输出详细信息。

### Q: 候选项数量有限制吗？

A: 没有硬性限制，但建议不超过 3-4 个，以免用户选择困难。

### Q: 如何处理规则执行失败？

A: 引擎会捕获规则执行错误，不会中断整体流程。调试模式下会输出错误信息。

---

## 未来扩展

### 计划中的规则

- [ ] 上标歧义规则 (SuperscriptAmbiguityRule)
- [ ] 括号优先级规则 (BracketPriorityRule)
- [ ] 隐式乘法规则 (ImplicitMultiplicationRule)
- [ ] 函数参数歧义规则 (FunctionArgumentRule)

### 框架增强

- [ ] 规则依赖管理
- [ ] 规则冲突检测
- [ ] 批量检测优化
- [ ] 规则热重载

---

## 参考资料

- [类型定义](../src/lib/ambiguity/types.ts)
- [核心引擎](../src/lib/ambiguity/ambiguity-engine.ts)
- [示例规则](../src/lib/ambiguity/rules/fraction-scope-rule.ts)
- [单元测试](../tests/unit/ambiguity-engine.test.ts)
- [集成测试](../tests/integration/ambiguity-integration.test.ts)

---

**文档维护**: 随着框架演进，本文档将持续更新。
