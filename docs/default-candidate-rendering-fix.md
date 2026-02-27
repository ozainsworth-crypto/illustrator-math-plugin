# 默认候选项渲染修复

## 问题描述

**症状**：
- 当输入 `\frac{1}{a}^2n` 时，初始渲染显示幂在整个分数上：`(1/a)² n`
- 但根据默认策略，分子为1时应该显示幂在分母上：`1/(a²) n`
- 用户需要手动选择"分母的幂"候选项才能看到正确的渲染

**根本原因**：
- 初始渲染使用的是原始输入 `latex`，而不是默认候选项的 `replacementTex`
- 虽然 `score()` 函数正确设置了 `defaultIndex: 1`（分母的幂），但渲染时没有使用这个默认候选项

## 修复方案

### 1. 使用默认候选项进行初始渲染

**修复内容**：
- 当检测到歧义时，不直接使用原始输入渲染
- 而是遍历所有歧义点，使用各自的默认候选项生成 `renderLatex`
- 从后往前替换，避免索引偏移问题

**代码修改**：
```typescript
// 在 handleRender() 中
let renderLatex = latex; // 用于渲染的 LaTeX

if (ambiguityResult.ambiguities.length > 0) {
  ambiguityPrompt.show(ambiguityResult.ambiguities);
  
  // 使用默认候选项生成初始渲染的 LaTeX
  // 从后往前替换，避免索引偏移问题
  const sortedAmbiguities = [...ambiguityResult.ambiguities].sort(
    (a, b) => b.range.start - a.range.start
  );
  
  for (const ambiguity of sortedAmbiguities) {
    const defaultCandidate = ambiguity.candidates[ambiguity.defaultIndex];
    const replacementTex = defaultCandidate.replacementTex || defaultCandidate.tex;
    
    renderLatex = 
      renderLatex.substring(0, ambiguity.range.start) +
      replacementTex +
      renderLatex.substring(ambiguity.range.end);
  }
  
  console.log('=== 使用默认候选项渲染 ===');
  console.log('renderLatex (with defaults):', renderLatex);
  
  // ... 设置候选项选择回调 ...
  await renderPreviewsForAmbiguities();
}

// 使用 renderLatex（默认候选项）或原始输入渲染
await renderWithLatex(renderLatex);
```

### 2. 处理多个歧义点

**关键点**：
- 从后往前替换，避免索引偏移
- 每个歧义点使用各自的默认候选项
- 支持不同的默认策略（分子为1 vs 分子不为1）

**示例**：
```typescript
// 输入：\frac{1}{a}^2n + \frac{2}{b}^3x
// 歧义1（分子=1）：defaultIndex=1（分母的幂）
// 歧义2（分子=2）：defaultIndex=0（分数整体的幂）

// 从后往前替换
sortedAmbiguities = [歧义2, 歧义1]

// 第1次替换（歧义2）
renderLatex = '\frac{1}{a}^2n + \left(\frac{2}{b}\right)^{3} x'

// 第2次替换（歧义1）
renderLatex = '\frac{1}{a^{2}} n + \left(\frac{2}{b}\right)^{3} x'

// 最终渲染：1/(a²) n + (2/b)³ x
```

## 测试验证

### 新增测试文件

**文件**：`tests/integration/default-candidate-rendering.test.ts`

**测试用例**：6个

**覆盖场景**：

1. **分子为1时**（3个测试）
   - `\frac{1}{a}^{2n}` 应默认渲染为 `\frac{1}{a^{2n}}`
   - `\frac{1}{a}^2n` 应默认渲染为 `\frac{1}{a^{2}} n`
   - `a^{2n}+\frac{1}{a}^2n=b` 应默认渲染为 `a^{2n}+\frac{1}{a^{2}} n=b`

2. **分子不为1时**（2个测试）
   - `\frac{2}{a}^{2n}` 应默认渲染为 `\left(\frac{2}{a}\right)^{2n}`
   - `\frac{x+1}{b}^3y` 应默认渲染为 `\left(\frac{x+1}{b}\right)^{3} y`

3. **多个歧义点**（1个测试）
   - `\frac{1}{a}^2n + \frac{2}{b}^3x` 应使用不同的默认候选项

### 测试结果

```
✓ tests/integration/default-candidate-rendering.test.ts (6 tests) 3ms
  ✓ 默认候选项渲染测试 (6)
    ✓ 分子为1时，应使用"分母的幂"作为默认候选项 (3)
      ✓ \frac{1}{a}^{2n} 应默认渲染为 \frac{1}{a^{2n}}
      ✓ \frac{1}{a}^2n 应默认渲染为 \frac{1}{a^{2}} n
      ✓ a^{2n}+\frac{1}{a}^2n=b 应默认渲染为 a^{2n}+\frac{1}{a^{2}} n=b
    ✓ 分子不为1时，应使用"分数整体的幂"作为默认候选项 (2)
      ✓ \frac{2}{a}^{2n} 应默认渲染为 \left(\frac{2}{a}\right)^{2n}
      ✓ \frac{x+1}{b}^3y 应默认渲染为 \left(\frac{x+1}{b}\right)^{3} y
    ✓ 多个歧义点时，应分别使用各自的默认候选项 (1)
      ✓ \frac{1}{a}^2n + \frac{2}{b}^3x 应使用不同的默认候选项

Test Files  19 passed (19)
Tests  295 passed (295)
```

## 关键改动文件

### 1. `src/main.ts`

**改动内容**：
- 添加 `renderLatex` 变量用于存储渲染用的 LaTeX
- 检测到歧义时，使用默认候选项生成 `renderLatex`
- 从后往前替换多个歧义点
- 使用 `renderLatex` 而不是原始 `latex` 进行渲染

**关键代码**：
```typescript
let renderLatex = latex;

if (ambiguityResult.ambiguities.length > 0) {
  // 使用默认候选项生成初始渲染的 LaTeX
  const sortedAmbiguities = [...ambiguityResult.ambiguities].sort(
    (a, b) => b.range.start - a.range.start
  );
  
  for (const ambiguity of sortedAmbiguities) {
    const defaultCandidate = ambiguity.candidates[ambiguity.defaultIndex];
    const replacementTex = defaultCandidate.replacementTex || defaultCandidate.tex;
    
    renderLatex = 
      renderLatex.substring(0, ambiguity.range.start) +
      replacementTex +
      renderLatex.substring(ambiguity.range.end);
  }
  
  // ... 设置回调 ...
}

await renderWithLatex(renderLatex);
```

### 2. `tests/integration/default-candidate-rendering.test.ts`

**新增文件**：验证默认候选项渲染逻辑

## 验收结果

### ✅ 分子为1时默认渲染正确

- [x] `\frac{1}{a}^{2n}` 默认渲染为 `\frac{1}{a^{2n}}`（幂在分母上）
- [x] `\frac{1}{a}^2n` 默认渲染为 `\frac{1}{a^{2}} n`（幂在分母上，保留 tail）
- [x] 完整公式中的歧义点正确渲染

### ✅ 分子不为1时默认渲染正确

- [x] `\frac{2}{a}^{2n}` 默认渲染为 `\left(\frac{2}{a}\right)^{2n}`（幂在整个分数上）
- [x] `\frac{x+1}{b}^3y` 默认渲染为 `\left(\frac{x+1}{b}\right)^{3} y`（幂在整个分数上，保留 tail）

### ✅ 多个歧义点正确处理

- [x] 每个歧义点使用各自的默认候选项
- [x] 从后往前替换，避免索引偏移
- [x] 不同的默认策略正确应用

### ✅ 用户交互流程

- [x] 用户立即看到正确的预览（使用默认候选项）
- [x] 用户可以查看歧义提示并选择其他候选项
- [x] 用户选择后立即重新渲染

### ✅ 测试覆盖

- [x] 6 个新增测试全部通过
- [x] 所有 295 个测试通过
- [x] 向后兼容性良好

## Debug 输出示例

### 分子为1的情况

```
=== handleRender DEBUG ===
rawInput: \frac{1}{a}^2n
ambiguities detected: 1

=== 使用默认候选项渲染 ===
renderLatex (with defaults): \frac{1}{a^{2}} n

renderInput (final): \frac{1}{a^{2}} n
```

### 多个歧义点的情况

```
=== handleRender DEBUG ===
rawInput: \frac{1}{a}^2n + \frac{2}{b}^3x
ambiguities detected: 2

=== 使用默认候选项渲染 ===
renderLatex (with defaults): \frac{1}{a^{2}} n + \left(\frac{2}{b}\right)^{3} x

renderInput (final): \frac{1}{a^{2}} n + \left(\frac{2}{b}\right)^{3} x
```

## 总结

本次修复通过在初始渲染时使用默认候选项，确保分子为1时幂显示在分母上，符合数学习惯。同时支持多个歧义点使用各自的默认策略，提供智能化的用户体验。

**关键修复**：
- 初始渲染使用默认候选项而不是原始输入
- 从后往前替换多个歧义点，避免索引偏移
- 每个歧义点使用各自的默认策略

**用户价值**：
- 用户立即看到正确的预览（分子为1时幂在分母上）
- 用户可以选择其他候选项，立即重新渲染
- 多个歧义点智能处理，符合数学习惯

**测试覆盖**：
- 新增6个测试
- 总测试数：295个
- 通过率：100%

**向后兼容性**：
- 所有原有测试继续通过
- 没有破坏任何现有功能
