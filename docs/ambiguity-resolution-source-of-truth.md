# 歧义解析 Source of Truth 修复

## 问题描述

**症状**：
- 歧义弹窗中的候选预览正确显示（例如：分子为1时，幂在分母上）
- 但回到"完整公式渲染"后，幂仍显示在分数整体上
- 说明歧义选择没有真正成为最终渲染/导出的 source of truth

**根本原因**：
在 `main.ts` 的 `handleRender()` 函数中，当检测到歧义时：
1. ✅ 显示歧义提示
2. ✅ 设置候选项选择回调
3. ✅ 渲染预览
4. ❌ **继续执行第3步，使用原始 `latex` 渲染完整公式**

这导致即使用户选择了候选项并更新了 `latexInput.value`，完整公式渲染仍然使用的是旧的 `latex` 变量。

## 修复方案

### 1. 统一 Source of Truth

**修复内容**：
- 选择 candidate 后，生成 `resolvedInput`（完整公式字符串）
- 将 `resolvedInput` 写回 `latexInput.value`
- 确保 UI 输入框内容就是 `resolvedInput`
- 渲染与导出 SVG 只使用 `currentInput`（即已写回的 `resolvedInput`）

**初始渲染使用默认候选项**：
- 当检测到歧义时，不使用原始输入渲染
- 而是使用默认候选项的 `replacementTex` 生成 `renderLatex`
- 这样分子为1时，初始渲染就会显示幂在分母上

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
  
  ambiguityPrompt.onSelect((ambiguityIndex, candidateIndex) => {
    // ... 用户选择后更新输入框并重新渲染 ...
  });
  
  await renderPreviewsForAmbiguities();
}

// 使用 renderLatex（默认候选项）或原始输入渲染
await renderWithLatex(renderLatex);
```

### 2. 锁定解析路径

**当前实现**：
- 歧义选择后，`resolvedInput` 被写回 `latexInput.value`
- 重新调用 `handleRender()` 时，使用更新后的 `latexInput.value`
- 由于 `resolvedInput` 已经是明确的 LaTeX（如 `\frac{1}{a^{2}}`），不会再被检测为歧义
- 因此自然锁定了解析路径，不会被 UnicodeMath 转译覆盖

**验证**：
- 测试用例 "resolvedInput 不应再被检测为歧义" 验证了这一点
- `\frac{1}{a^{2}}` 不会被检测为歧义，因为幂次已经明确在分母上

### 3. 防止 AST/二次生成覆盖

**当前实现**：
- 系统直接使用 LaTeX 字符串渲染，不经过 AST 转换
- `resolvedInput` 直接传递给 `renderWithLatex()`
- 不存在 "UnicodeMath parse AST → toLatex → render" 的路径
- 因此不会被 AST 重新生成覆盖

### 4. Debug 输出

**添加的 Debug 输出**：
```typescript
console.log('=== handleRender DEBUG ===');
console.log('rawInput:', latex);
console.log('ambiguities detected:', ambiguityResult.ambiguities.length);

console.log('=== 用户选择候选项 ===');
console.log(`ambiguityIndex: ${ambiguityIndex}, candidateIndex: ${candidateIndex}`);
console.log(`selectedCandidate.label: ${selectedCandidate.label}`);

console.log('=== 歧义替换 DEBUG ===');
console.log('rawInput:', latex);
console.log('range:', ambiguity.range);
console.log('replacementTex:', replacementTex);
console.log('resolvedInput:', resolvedInput);
console.log('latexInput.value after update:', latexInput.value);

console.log('renderInput (final):', latex);
```

**Debug 输出示例**：
```
=== handleRender DEBUG ===
rawInput: \frac{1}{a}^{2n}
ambiguities detected: 1

=== 用户选择候选项 ===
ambiguityIndex: 0, candidateIndex: 1
selectedCandidate.label: 分母的幂

=== 歧义替换 DEBUG ===
rawInput: \frac{1}{a}^{2n}
range: { start: 0, end: 17, text: '\frac{1}{a}^{2n}' }
replacementTex: \frac{1}{a^{2n}}
resolvedInput: \frac{1}{a^{2n}}
latexInput.value after update: \frac{1}{a^{2n}}

=== handleRender DEBUG ===
rawInput: \frac{1}{a^{2n}}
ambiguities detected: 0
renderInput (final): \frac{1}{a^{2n}}
```

## 测试验证

### 新增测试文件

**文件**：
1. `tests/integration/ambiguity-resolution-e2e.test.ts` - 端到端测试
2. `tests/integration/default-candidate-rendering.test.ts` - 默认候选项渲染测试

**测试用例**：13个（7个端到端 + 6个默认渲染）

**覆盖场景**：

**端到端测试（7个）**：
1. **单个歧义点**（2个测试）
   - 选择"分母的幂"后，resolvedInput 应包含正确的 LaTeX
   - 选择"分数整体的幂"后，resolvedInput 应包含正确的 LaTeX

2. **带 tail 的歧义点**（1个测试）
   - 选择"分母的幂"后，resolvedInput 应保留 tail
   - 验证没有重复 tail

3. **完整公式中的歧义点**（1个测试）
   - 选择"分母的幂"后，完整公式应正确替换
   - 验证前文本、后文本、歧义片段都正确

4. **多个歧义点**（1个测试）
   - 应该能够逐个解析多个歧义点
   - 验证每次替换都正确

5. **重新检测验证**（2个测试）
   - resolvedInput 不应再被检测为歧义
   - 带 tail 的 resolvedInput 不应再被检测为歧义

**默认候选项渲染测试（6个）**：
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
✓ tests/integration/ambiguity-resolution-e2e.test.ts (7 tests) 3ms
  ✓ 歧义解析端到端测试 - Source of Truth (7)
    ✓ 单个歧义点 (2)
    ✓ 带 tail 的歧义点 (1)
    ✓ 完整公式中的歧义点 (1)
    ✓ 多个歧义点 (1)
    ✓ 重新检测验证 (2)

✓ tests/integration/default-candidate-rendering.test.ts (6 tests) 3ms
  ✓ 默认候选项渲染测试 (6)
    ✓ 分子为1时，应使用"分母的幂"作为默认候选项 (3)
    ✓ 分子不为1时，应使用"分数整体的幂"作为默认候选项 (2)
    ✓ 多个歧义点时，应分别使用各自的默认候选项 (1)

Test Files  19 passed (19)
Tests  295 passed (295)
```

## 关键改动文件

### 1. `src/main.ts`

**改动内容**：
- 添加 debug 输出
- 在候选项选择回调中添加 `ambiguityPrompt.hide()`
- **关键修复**：初始渲染使用默认候选项而不是原始输入
- 从后往前替换多个歧义点，避免索引偏移
- 用户选择候选项后，更新输入框并重新渲染

**关键代码**：
```typescript
let renderLatex = latex; // 用于渲染的 LaTeX

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
  await renderPreviewsForAmbiguities();
}

// 使用 renderLatex（默认候选项）渲染
await renderWithLatex(renderLatex);
```

### 2. `tests/integration/ambiguity-resolution-e2e.test.ts`

**新增文件**：端到端测试，验证 source of truth 修复

## 验收结果

### ✅ 统一 Source of Truth
- 选择 candidate 后，`resolvedInput` 被写回 `latexInput.value`
- 渲染与导出 SVG 只使用 `currentInput`
- 测试验证：所有7个端到端测试通过

### ✅ 锁定解析路径
- `resolvedInput` 不会再被检测为歧义
- 自然锁定 format=LaTeX
- 测试验证："重新检测验证"测试通过

### ✅ 防止 AST/二次生成覆盖
- 系统直接使用 LaTeX 字符串渲染
- 不存在 AST 覆盖路径
- 测试验证：完整公式渲染正确

### ✅ Debug 输出
- 添加了完整的 debug 输出
- 可以追踪 rawInput → resolvedInput → renderInput 的完整流程

### ✅ 多处歧义点场景
- 测试验证：可以逐个解析多个歧义点
- 每次替换都正确生效

## 总结

本次修复通过在初始渲染时使用默认候选项，确保分子为1时幂显示在分母上。当用户选择候选项后，`resolvedInput` 被写回输入框并重新渲染，成为真正的 source of truth。

**关键修复**：
- **初始渲染使用默认候选项**：不再使用原始输入，而是使用默认候选项的 `replacementTex`
- 从后往前替换多个歧义点，避免索引偏移
- 添加 `ambiguityPrompt.hide()` 隐藏歧义提示
- 添加完整的 debug 输出
- 用户选择后，`resolvedInput` 写回输入框并重新渲染

**用户体验改进**：
- 用户可以立即看到正确的公式预览（使用默认候选项）
- 分子为1时，幂自动显示在分母上（符合数学习惯）
- 同时可以查看歧义提示并选择其他候选项
- 选择后立即重新渲染，无需手动触发

**测试覆盖**：
- 新增13个测试（7个端到端 + 6个默认渲染）
- 总测试数：295个
- 通过率：100%

**向后兼容性**：
- 所有原有测试继续通过
- 没有破坏任何现有功能
