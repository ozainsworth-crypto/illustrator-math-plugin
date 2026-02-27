# 歧义框架集成指南

## 概述

歧义检测框架已成功集成到主应用中，提供了完整的歧义检测、候选项生成和用户选择流程。

## 集成架构

```
用户输入 LaTeX
    ↓
[AmbiguityEngine] 检测歧义
    ↓
[AmbiguityPrompt] 显示歧义提示（如果检测到）
    ↓
用户选择候选项
    ↓
[WebFormulaGenerator] 使用选中的候选项重新渲染
```

## 核心组件

### 1. AmbiguityEngine（歧义引擎）

**位置**: `src/lib/ambiguity/ambiguity-engine.ts`

**职责**: 
- 管理歧义规则注册
- 执行歧义检测
- 生成候选项
- 提供调试信息

**使用示例**:
```typescript
import { AmbiguityEngine } from './lib/ambiguity/ambiguity-engine';
import { allRules } from './lib/ambiguity/rules';

// 创建引擎实例
const engine = new AmbiguityEngine();

// 注册所有规则
engine.registerRules(allRules);

// 启用调试模式（可选）
engine.enableDebug();

// 检测歧义
const result = engine.detect({
  input: 'a/b+c',
  latex: 'a/b+c',
});

// 检查结果
if (result.ambiguities.length > 0) {
  console.log('检测到歧义:', result.ambiguities);
}
```

### 2. AmbiguityPrompt（歧义提示组件）

**位置**: `src/components/ambiguity-prompt.ts`

**职责**:
- 显示歧义提示条
- 展示候选项对比
- 处理用户选择
- 渲染候选项预览

**使用示例**:
```typescript
import { AmbiguityPrompt } from './components/ambiguity-prompt';

// 创建提示组件
const prompt = new AmbiguityPrompt('ambiguity-prompt');

// 显示歧义
prompt.show(ambiguities);

// 设置选择回调
prompt.onSelect((ambiguityIndex, candidateIndex) => {
  const ambiguity = ambiguities[ambiguityIndex];
  const candidate = ambiguity.candidates[candidateIndex];
  console.log('用户选择:', candidate.label);
});

// 渲染预览
await prompt.renderPreviews(async (tex) => {
  const result = await generator.renderLatex(tex);
  return result.svgString;
});
```

### 3. 歧义规则（Ambiguity Rules）

**位置**: `src/lib/ambiguity/rules/`

**当前规则**:
- `FractionScopeRule`: 检测分数范围歧义（如 `a/b+c`）

**添加新规则**:

1. 创建新规则文件 `src/lib/ambiguity/rules/my-rule.ts`:

```typescript
import type {
  AmbiguityRule,
  AmbiguityContext,
  AmbiguityMatch,
  AmbiguityCandidate,
} from '../types';

export class MyRule implements AmbiguityRule {
  readonly id = 'my-rule';
  readonly description = '我的规则描述';
  readonly priority = 10; // 可选，默认 0

  detect(context: AmbiguityContext): AmbiguityMatch[] {
    // 检测逻辑
    const matches: AmbiguityMatch[] = [];
    // ... 检测代码
    return matches;
  }

  generateCandidates(
    _context: AmbiguityContext,
    match: AmbiguityMatch
  ): AmbiguityCandidate[] {
    // 生成候选项
    return [
      {
        label: '解释 A',
        tex: '\\frac{a}{b}',
        explanation: '解释 A 的说明',
      },
      {
        label: '解释 B',
        tex: 'a/b',
        explanation: '解释 B 的说明',
      },
    ];
  }

  score?(_context: AmbiguityContext, _match: AmbiguityMatch) {
    return {
      defaultIndex: 0, // 默认选择第一个候选项
      confidence: 0.8, // 置信度 0-1
    };
  }
}
```

2. 在 `src/lib/ambiguity/rules/index.ts` 中注册:

```typescript
import { MyRule } from './my-rule';

export const allRules: AmbiguityRule[] = [
  new FractionScopeRule(),
  new MyRule(), // 添加新规则
];
```

## 集成流程

### main.ts 中的集成

```typescript
// 1. 导入依赖
import { AmbiguityEngine } from './lib/ambiguity/ambiguity-engine';
import { allRules } from './lib/ambiguity/rules';
import { AmbiguityPrompt } from './components/ambiguity-prompt';

// 2. 创建实例
const ambiguityEngine = new AmbiguityEngine();
ambiguityEngine.registerRules(allRules);
ambiguityEngine.enableDebug();

const ambiguityPrompt = new AmbiguityPrompt('ambiguity-prompt');

// 3. 在渲染流程中集成
async function handleRender() {
  const latex = latexInput.value.trim();

  // 检测歧义
  const ambiguityResult = ambiguityEngine.detect({
    input: latex,
    latex: latex,
  });

  // 显示歧义提示
  if (ambiguityResult.ambiguities.length > 0) {
    ambiguityPrompt.show(ambiguityResult.ambiguities);

    // 设置选择回调
    ambiguityPrompt.onSelect(async (ambiguityIndex, candidateIndex) => {
      const ambiguity = ambiguityResult.ambiguities[ambiguityIndex];
      const selectedCandidate = ambiguity.candidates[candidateIndex];
      await renderWithLatex(selectedCandidate.tex);
    });

    // 渲染预览
    await renderPreviewsForAmbiguities();
  }

  // 渲染公式
  await renderWithLatex(latex);
}
```

## 测试歧义检测

### 测试用例

在输入框中输入以下公式，应该触发歧义检测：

1. **分数范围歧义**: `a/b+c`
   - 候选 A: `\frac{a}{b+c}` (分母包含后续项)
   - 候选 B: `\frac{a}{b}+c` (分数后加法) - 默认

2. **分数范围歧义**: `x/y-z`
   - 候选 A: `\frac{x}{y-z}` (分母包含后续项)
   - 候选 B: `\frac{x}{y}-z` (分数后减法) - 默认

### 预期行为

1. 输入歧义公式后点击"渲染"
2. 在输入框下方显示黄色提示条："检测到 1 处可能的歧义"
3. 点击"查看详情"展开歧义卡片
4. 卡片显示:
   - 歧义描述
   - 歧义位置和文本
   - 两个候选项（并排对比）
   - 每个候选项的 LaTeX 代码
   - 每个候选项的预览（MathJax 渲染）
   - 默认选项标记
5. 选择不同的候选项，预览区域实时更新

## 调试

### 启用调试模式

```typescript
ambiguityEngine.enableDebug();
```

### 调试输出

在浏览器控制台中查看:
- 检测到的歧义数量
- 命中的规则列表
- 每个规则的检测时间
- 详细的歧义信息

### 示例输出

```
🔍 Ambiguity Engine Debug Info
Total ambiguities detected: 1
Matched rules: ['fraction-scope']
Total detection time: 2.34ms
Rule timings: { 'fraction-scope': 2.12ms }

Detected Ambiguities:
  1. fraction-scope
    Message: 分数范围歧义：分母是否包含后续的加减项？
    Range: { start: 0, end: 5, text: 'a/b+c' }
    Candidates: 2
    Default: 解释 B（分数后加减）
    Confidence: 0.6
```

## 性能考虑

- **检测时间**: 目标 < 10ms（当前实现约 2-5ms）
- **规则优先级**: 高优先级规则先执行
- **错误隔离**: 单个规则失败不影响其他规则
- **调试开销**: 调试模式会增加少量性能开销，生产环境建议禁用

## 未来扩展

### 计划添加的规则

1. **SuperscriptAmbiguityRule**: 多级上标歧义（如 `x^2^3`）
2. **BracketPriorityRule**: 括号优先级歧义
3. **ImplicitMultiplicationRule**: 隐式乘法歧义（如 `2x` vs `2*x`）

### 扩展点

- 规则可以访问上下文元数据
- 规则可以返回多个匹配
- 规则可以自定义评分逻辑
- 候选项可以包含额外的解释信息

## 相关文档

- [歧义框架设计指南](./ambiguity-framework-guide.md)
- [UnicodeMath 支持子集](./unicodemath-supported-subset.md)
- [需求文档](../.kiro/specs/math-formula-plugin/requirements.md)
- [设计文档](../.kiro/specs/math-formula-plugin/design.md)
