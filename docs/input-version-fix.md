# InputVersion Bug 修复文档

## 问题描述

**Bug**: 用户输入新公式后，上一个公式的歧义选项仍然显示。

**复现步骤**:
1. 输入 `x^2^3` 触发歧义检测
2. 歧义面板出现，显示两个候选项
3. 不点击确认，直接输入新内容 `a+b`
4. **Bug**: 歧义面板仍然显示 `x^2^3` 的候选项

**根本原因**:
- 异步操作（解析、歧义检测、候选预览渲染）完成后，没有校验输入是否已经变化
- 导致旧结果回写到新输入的界面
- 缺少输入版本控制机制

---

## 修复方案

### 1. 引入 inputVersion 机制

**核心思想**: 为每次输入分配一个唯一的版本号，异步操作完成后校验版本号是否一致。

```typescript
// 全局版本号
let currentInputVersion = 0;

// 监听输入变化，递增版本号
latexInput.addEventListener('input', () => {
  currentInputVersion++;
  clearOldState();
});

// 异步操作开始时捕获版本号
const capturedVersion = currentInputVersion;

// 异步操作完成后校验版本号
if (capturedVersion !== currentInputVersion) {
  console.log('版本不一致，丢弃结果');
  return;
}
```

### 2. 立即清理旧状态

**触发时机**: `input` 事件触发时立即清理

**清理内容**:
- 歧义提示面板 (`ambiguityPrompt.hide()`)
- 歧义对比界面 (`ambiguityResolver.hide()`)
- 降级提示界面 (`fallbackPrompt.hide()`)
- 格式选择器 (`formatSelector.hide()`)
- 错误提示 (`hideError()`)

```typescript
function clearOldState(): void {
  ambiguityPrompt.hide();
  ambiguityResolver.hide();
  fallbackPrompt.hide();
  formatSelector.hide();
  hideError();
  console.log('[InputVersion] 旧状态已清理');
}
```

### 3. 版本校验点

在所有异步操作完成后添加版本校验：

#### 3.1 粘贴处理 (`handlePaste`)

```typescript
async function handlePaste(event: ClipboardEvent): Promise<void> {
  // 递增版本号
  currentInputVersion++;
  const capturedVersion = currentInputVersion;
  
  // 立即清理旧状态
  clearOldState();
  
  // 异步解析
  const parseResult = await formulaParser.parse(normalizedText);
  
  // 版本校验
  if (capturedVersion !== currentInputVersion) {
    console.log('版本不一致，丢弃粘贴结果');
    return;
  }
  
  // ... 继续处理
}
```

#### 3.2 渲染处理 (`handleRender`)

```typescript
async function handleRender(): Promise<void> {
  // 捕获版本号
  const capturedVersion = currentInputVersion;
  
  // 异步歧义检测
  const ambiguityResult = ambiguityEngine.detect(ambiguityContext);
  
  // 版本校验
  if (capturedVersion !== currentInputVersion) {
    console.log('版本不一致，丢弃歧义检测结果');
    return;
  }
  
  // 异步渲染
  await renderWithLatex(renderLatex, capturedVersion);
}
```

#### 3.3 候选预览渲染 (`renderPreviewsForAmbiguities`)

```typescript
async function renderPreviewsForAmbiguities(capturedVersion: number): Promise<void> {
  await ambiguityPrompt.renderPreviews(async (tex: string) => {
    // 渲染前校验
    if (capturedVersion !== currentInputVersion) {
      console.log('版本不一致，跳过预览渲染');
      return '';
    }
    
    const result = await generator.renderLatex(tex);
    
    // 渲染后再次校验
    if (capturedVersion !== currentInputVersion) {
      console.log('版本不一致，丢弃预览结果');
      return '';
    }
    
    return result.svgString;
  });
}
```

#### 3.4 最终渲染 (`renderWithLatex`)

```typescript
async function renderWithLatex(latex: string, capturedVersion: number): Promise<void> {
  const result = await generator.renderLatex(latex);
  
  // 版本校验
  if (capturedVersion !== currentInputVersion) {
    console.log('版本不一致，丢弃渲染结果');
    return;
  }
  
  // 更新 UI
  previewOutput.appendChild(result.svg.cloneNode(true));
}
```

---

## 改动文件列表

### 修改的文件

1. **src/main.ts** - 主应用逻辑
   - 添加 `currentInputVersion` 全局变量
   - 添加 `input` 事件监听器
   - 添加 `clearOldState()` 函数
   - 在所有异步操作中添加版本校验

### 新增的文件

1. **docs/input-version-fix.md** - 本文档
2. **test-input-version-fix.html** - 测试验证页面

---

## 关键状态变量说明

### 1. `currentInputVersion: number`

**作用**: 全局版本号，标识当前输入的版本

**初始值**: `0`

**递增时机**:
- `input` 事件触发时
- `paste` 事件触发时

**使用方式**:
```typescript
// 递增版本号
currentInputVersion++;

// 捕获版本号
const capturedVersion = currentInputVersion;

// 校验版本号
if (capturedVersion !== currentInputVersion) {
  // 版本不一致，丢弃结果
  return;
}
```

### 2. `capturedVersion: number`

**作用**: 捕获的版本号，用于异步操作完成后的校验

**生命周期**: 局部变量，仅在异步函数内有效

**捕获时机**: 异步操作开始时

**校验时机**: 异步操作完成后

---

## 验收用例

### 用例 1: 输入 A 触发歧义 → 不确认 → 输入 B

**步骤**:
1. 输入 `x^2^3` 触发歧义
2. 歧义面板出现
3. 不点确认，直接输入 `a+b`

**预期**:
- ✅ 歧义面板立即消失
- ✅ 不显示 `x^2^3` 的候选项
- ✅ 控制台输出版本递增日志

### 用例 2: B 无歧义 → 页面无歧义面板

**步骤**:
1. 输入 `x^2^3` 触发歧义
2. 输入 `\frac{a}{b}` (无歧义)
3. 点击渲染

**预期**:
- ✅ 页面不显示歧义面板
- ✅ 预览显示分数公式

### 用例 3: B 有歧义 → 只显示 B 的歧义面板

**步骤**:
1. 输入 `x^2^3` 触发歧义
2. 输入 `a/b^c` (分数指数歧义)
3. 点击渲染

**预期**:
- ✅ 只显示 `a/b^c` 的歧义面板
- ✅ 不显示 `x^2^3` 的候选项

### 用例 4: 候选预览异步加载过程中切换输入

**步骤**:
1. 输入 `x^2^3` 并点击渲染
2. 在预览加载过程中立即输入 `y+z`
3. 等待所有异步操作完成

**预期**:
- ✅ 预览不回写到新输入的界面
- ✅ 页面显示 `y+z` 的渲染结果
- ✅ 控制台输出版本不一致日志

### 用例 5: 粘贴触发的版本控制

**步骤**:
1. 输入 `x^2^3` 触发歧义
2. 粘贴 `a/b` (UnicodeMath)

**预期**:
- ✅ 粘贴时立即清理旧状态
- ✅ 显示格式选择器
- ✅ 不显示 `x^2^3` 的歧义面板

---

## 测试方法

### 1. 手动测试

打开 `test-input-version-fix.html` 查看详细的测试用例和步骤。

在实际应用中 (`http://localhost:5173`) 执行测试用例，观察:
- UI 行为是否符合预期
- 控制台日志是否输出版本信息
- 是否有旧状态残留

### 2. 自动化测试

运行现有的测试套件，确保修复没有引入新问题:

```bash
npm run test -- --run
```

### 3. 回归测试

确保原有功能不受影响:
- LaTeX 输入和渲染
- UnicodeMath 粘贴和转换
- 歧义检测和选择（单次输入）
- 降级提示
- 格式切换

---

## 日志输出

修复后，控制台会输出以下日志：

```
[InputVersion] 输入变化，版本递增到: 1
[InputVersion] 旧状态已清理
[InputVersion] handleRender 开始，捕获版本: 1
[InputVersion] 输入变化，版本递增到: 2
[InputVersion] 旧状态已清理
[InputVersion] 版本不一致，丢弃歧义检测结果。捕获版本: 1, 当前版本: 2
```

---

## 最小修复原则

本次修复遵循最小修复原则：

1. **只修改必要的文件**: 仅修改 `src/main.ts`
2. **不改变现有逻辑**: 只添加版本控制和清理逻辑
3. **不引入新依赖**: 使用原生 JavaScript 实现
4. **不改变 API**: 组件接口保持不变
5. **向后兼容**: 不影响现有功能

---

## 总结

通过引入 `inputVersion` 机制和立即清理旧状态，成功修复了用户输入新公式后旧歧义选项残留的 Bug。

**核心改进**:
- ✅ 输入变化时立即清理旧状态
- ✅ 异步操作完成后校验版本号
- ✅ 版本不一致时丢弃旧结果
- ✅ 避免旧结果回写到新输入的界面

**影响范围**: 最小化，仅修改 `src/main.ts`

**测试覆盖**: 5 个验收用例 + 回归测试

**日志追踪**: 所有版本控制操作都有日志输出，便于调试
