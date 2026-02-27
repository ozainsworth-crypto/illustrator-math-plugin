# 歧义显示方式差异分析

## 问题描述

当前系统中，`x^2^3` 这种连续上标歧义和 `a/b+c` 这种分数范围歧义在界面中显示的方式不同。

---

## 两种歧义显示方式

### 方式 1: AmbiguityPrompt（歧义提示组件）

**使用场景**: LaTeX 输入 → 点击渲染 → 检测到歧义

**示例**: 输入 `x^2^3` 或 `a/b+c`，点击"渲染公式"按钮

**显示位置**: 输入框下方，可展开/收起的提示条

**UI 特点**:
- 提示条显示: "⚠️ 检测到 N 处可能的歧义"
- 点击"查看详情"展开详情面板
- 每个歧义显示为一个卡片
- 卡片内包含候选项列表（单选按钮）
- 每个候选项显示: 标签、LaTeX 代码、预览、说明
- 选择候选项后，自动更新输入框并重新渲染

**代码路径**: `src/components/ambiguity-prompt.ts`

**触发流程**:
```
用户输入 LaTeX (如 x^2^3)
    ↓
点击"渲染公式"按钮
    ↓
handleRender() 函数
    ↓
ambiguityEngine.detect() 检测歧义
    ↓
ambiguityPrompt.show() 显示歧义提示
    ↓
用户选择候选项
    ↓
更新输入框 → 重新渲染
```

---

### 方式 2: AmbiguityResolver（歧义对比界面）

**使用场景**: UnicodeMath 粘贴 → 自动转换 → 检测到歧义

**示例**: 粘贴 `a/b` (UnicodeMath 格式)，系统检测到可能的歧义

**显示位置**: 输入框下方，独立的对比界面

**UI 特点**:
- 标题显示: "⚠️ 检测到歧义，请选择正确的解释"
- 显示原始粘贴内容
- 候选项以网格形式并排显示（卡片式）
- 每个候选项显示: 标签、预览、LaTeX 代码、描述
- 提供手动编辑 LaTeX 的文本框
- 确认/取消按钮

**代码路径**: `src/components/ambiguity-resolver.ts`

**触发流程**:
```
用户粘贴 UnicodeMath (如 a/b)
    ↓
handlePaste() 函数
    ↓
formulaParser.parse() 解析并转换
    ↓
parseResult.ambiguous === true
    ↓
ambiguityResolver.show() 显示对比界面
    ↓
用户选择候选项或手动编辑
    ↓
确认 → 更新输入框 → 渲染
```

---

## 差异原因分析

### 1. 触发路径不同

| 特性 | AmbiguityPrompt | AmbiguityResolver |
|------|----------------|-------------------|
| **触发来源** | LaTeX 输入 + 手动渲染 | UnicodeMath 粘贴 + 自动转换 |
| **检测时机** | `handleRender()` 中 | `handlePaste()` 中 |
| **检测引擎** | `ambiguityEngine.detect()` | `formulaParser.parse()` 返回 `ambiguous` 标志 |
| **歧义来源** | LaTeX 语法本身的歧义 | UnicodeMath → LaTeX 转换的歧义 |

### 2. 数据结构不同

#### AmbiguityPrompt 使用的数据结构

```typescript
// 来自 ambiguityEngine.detect()
interface DetectedAmbiguity {
  message: string;              // 歧义描述
  range: {                      // 歧义位置
    start: number;
    end: number;
    text: string;
  };
  candidates: Array<{           // 候选项
    label: string;
    tex: string;
    replacementTex?: string;    // 用于替换的 LaTeX
    explanation: string;
  }>;
  defaultIndex: number;         // 默认候选项索引
}
```

**特点**:
- 包含歧义的精确位置（range）
- 候选项有 `replacementTex`，用于局部替换
- 支持多个歧义同时存在

#### AmbiguityResolver 使用的数据结构

```typescript
// 来自 formulaParser.parse()
interface ParseResult {
  success: boolean;
  latex: string;                // 默认转换结果
  ambiguous: boolean;           // 是否存在歧义
  alternatives?: string[];      // 备选转换结果（完整的 LaTeX）
  ambiguityType?: string;       // 歧义类型
}

// 转换为 AmbiguityCandidate
interface AmbiguityCandidate {
  label: string;
  latex: string;                // 完整的 LaTeX 公式
  description: string;
}
```

**特点**:
- 不包含歧义的精确位置
- 候选项是完整的 LaTeX 公式（不是局部替换）
- 只处理单个歧义（整个公式的歧义）

### 3. 交互方式不同

| 特性 | AmbiguityPrompt | AmbiguityResolver |
|------|----------------|-------------------|
| **展开方式** | 可展开/收起 | 始终展开 |
| **候选项布局** | 垂直列表 | 网格布局（并排对比） |
| **原始内容** | 不显示 | 显示原始粘贴内容 |
| **手动编辑** | 不支持 | 支持手动编辑 LaTeX |
| **确认方式** | 选择后自动应用 | 需要点击"确认"按钮 |

### 4. 设计目的不同

#### AmbiguityPrompt 的设计目的

- **场景**: 用户已经输入了 LaTeX，对 LaTeX 语法有一定了解
- **目标**: 提示用户输入可能存在歧义，让用户选择正确的解释
- **假设**: 用户知道自己想要什么，只是 LaTeX 语法有多种解释
- **交互**: 轻量级提示，不打断用户流程

#### AmbiguityResolver 的设计目的

- **场景**: 用户粘贴了 UnicodeMath，可能不了解 LaTeX 语法
- **目标**: 帮助用户理解转换结果，选择正确的解释
- **假设**: 用户可能不熟悉 LaTeX，需要更多的视觉对比和说明
- **交互**: 重量级对比界面，需要用户明确确认

---

## 具体示例对比

### 示例 1: `x^2^3` (连续上标歧义)

#### 使用 AmbiguityPrompt

**触发方式**: 输入 `x^2^3`，点击"渲染公式"

**显示效果**:
```
⚠️ 检测到 1 处可能的歧义  [查看详情]

[展开后]
┌─────────────────────────────────────┐
│ 多级指数歧义                         │
│ 位置: 0-5  "x^2^3"                  │
│                                     │
│ ○ 右结合 (默认)                     │
│   x^{2^{3}}                         │
│   [预览: x²³]                       │
│   指数作用于指数                     │
│                                     │
│ ○ 左结合                            │
│   (x^{2})^{3}                       │
│   [预览: (x²)³]                     │
│   先计算内层指数                     │
└─────────────────────────────────────┘
```

**代码位置**: `src/main.ts` 第 352-415 行

```typescript
// handleRender() 中
const ambiguityResult = ambiguityEngine.detect(ambiguityContext);
if (ambiguityResult.ambiguities.length > 0) {
  ambiguityPrompt.show(ambiguityResult.ambiguities);
  // ...
}
```

---

### 示例 2: `a/b` (UnicodeMath 粘贴)

#### 使用 AmbiguityResolver

**触发方式**: 粘贴 `a/b` (UnicodeMath 格式)

**显示效果**:
```
⚠️ 检测到歧义，请选择正确的解释

原始内容：
a/b

请选择正确的解释：
┌──────────────┐  ┌──────────────┐
│ ○ 默认解释    │  │ ○ 备选解释 1  │
│              │  │              │
│ [预览: a/b]  │  │ [预览: a÷b]  │
│              │  │              │
│ \frac{a}{b}  │  │ a \div b     │
│              │  │              │
│ 系统推荐的   │  │ 另一种可能的 │
│ 解释方式     │  │ 解释方式     │
└──────────────┘  └──────────────┘

或手动编辑 LaTeX：
┌─────────────────────────────────────┐
│ \frac{a}{b}                         │
└─────────────────────────────────────┘

[取消]  [确认]
```

**代码位置**: `src/main.ts` 第 210-240 行

```typescript
// handlePaste() 中
if (parseResult.ambiguous && parseResult.alternatives) {
  const candidates: AmbiguityCandidate[] = [
    { label: '默认解释', latex: parseResult.latex, ... },
    ...parseResult.alternatives.map((alt, index) => ({ ... })),
  ];
  ambiguityResolver.show(normalizedText, candidates, 0);
  // ...
}
```

---

## 为什么会有两种方式？

### 历史原因

1. **AmbiguityPrompt** 是为 LaTeX 输入设计的，基于 `ambiguityEngine` 检测
2. **AmbiguityResolver** 是为 UnicodeMath 粘贴设计的，基于 `formulaParser` 转换结果

### 技术原因

1. **检测机制不同**:
   - LaTeX 歧义检测: 基于规则引擎，可以精确定位歧义位置
   - UnicodeMath 转换歧义: 基于解析器，只能提供整体的备选方案

2. **数据结构不同**:
   - LaTeX 歧义: 局部替换（`replacementTex`）
   - UnicodeMath 歧义: 整体替换（完整的 LaTeX）

3. **用户场景不同**:
   - LaTeX 用户: 熟悉 LaTeX，需要轻量级提示
   - UnicodeMath 用户: 可能不熟悉 LaTeX，需要更多视觉对比

---

## 是否需要统一？

### 统一的优点

1. **一致性**: 用户体验更统一
2. **可维护性**: 只需要维护一套 UI 组件
3. **代码简洁**: 减少重复代码

### 统一的缺点

1. **场景差异**: 两种场景的需求确实不同
2. **数据结构差异**: 需要大量适配代码
3. **用户体验**: 可能牺牲某一场景的最佳体验

### 建议

**保持两种方式，但增加一致性**:

1. **视觉风格统一**: 使用相同的颜色、字体、间距
2. **交互模式统一**: 都支持展开/收起、都支持手动编辑
3. **术语统一**: 使用相同的标签和描述文字
4. **文档说明**: 在文档中明确说明两种方式的差异和使用场景

---

## 改进建议

### 短期改进（不改变架构）

1. **视觉统一**:
   - 统一颜色方案（警告色、选中色、边框色）
   - 统一字体和间距
   - 统一图标和按钮样式

2. **交互增强**:
   - AmbiguityPrompt 增加手动编辑功能
   - AmbiguityResolver 增加展开/收起功能
   - 两者都支持键盘快捷键（如 Enter 确认）

3. **文档完善**:
   - 在用户文档中说明两种歧义提示的差异
   - 提供示例截图和使用场景说明

### 长期改进（架构重构）

1. **统一数据结构**:
   - 定义通用的 `Ambiguity` 接口
   - `ambiguityEngine` 和 `formulaParser` 都返回相同的数据结构

2. **统一 UI 组件**:
   - 创建一个通用的 `AmbiguityUI` 组件
   - 根据数据结构自动适配显示方式
   - 支持多种布局模式（列表、网格、对比）

3. **统一交互流程**:
   - 定义统一的歧义处理流程
   - 统一的回调接口
   - 统一的状态管理

---

## 总结

### 差异原因

1. **触发路径不同**: LaTeX 输入 vs UnicodeMath 粘贴
2. **检测机制不同**: `ambiguityEngine` vs `formulaParser`
3. **数据结构不同**: 局部替换 vs 整体替换
4. **设计目的不同**: 轻量级提示 vs 重量级对比

### 当前状态

- **AmbiguityPrompt**: 用于 LaTeX 输入的歧义提示（如 `x^2^3`）
- **AmbiguityResolver**: 用于 UnicodeMath 粘贴的歧义对比（如 `a/b`）

### 建议

**保持两种方式，但增加一致性**，通过视觉统一、交互增强和文档完善来改善用户体验。

长期可以考虑架构重构，统一数据结构和 UI 组件，但需要权衡开发成本和收益。
