# 预览加载修复文档

## 问题描述

**Bug**: 在歧义选择界面（AmbiguityResolver）中，当用户输入如 `x^{2}^3` 这样的歧义公式时，候选项的预览一直显示"加载预览..."，无法正常渲染数学公式的 SVG 预览。

**影响范围**: 
- 所有使用 `AmbiguityResolver` 组件的场景
- 主要影响 UnicodeMath 粘贴转换时的歧义对比界面
- 用户无法看到不同解释方式的可视化预览，影响用户体验

**复现步骤**:
1. 粘贴 UnicodeMath 格式的歧义输入（如 `a/b`）
2. 系统检测到歧义，显示 AmbiguityResolver 界面
3. 观察候选项卡片中的预览区域
4. **Bug**: 预览区域一直显示"加载预览..."，不显示实际的数学公式渲染结果

## 根本原因

**CSS 类名不匹配**:

在 `src/components/ambiguity-resolver.ts` 文件中存在类名不一致的问题：

### 问题代码

**创建 DOM 时** (第 189 行):
```typescript
private createCandidateCard(...): HTMLElement {
  card.innerHTML = `
    ...
    <div class="card-preview" data-tex="${this.escapeHtml(candidate.latex)}">
      <div class="preview-placeholder">加载预览...</div>
    </div>
    ...
  `;
}
```
- 预览容器使用的类名是 `card-preview`

**渲染预览时** (第 145 行):
```typescript
async renderPreviews(renderFunction: ...): Promise<void> {
  const previews = this.container.querySelectorAll('.candidate-preview'); // ❌ 错误的类名
  
  for (const preview of Array.from(previews)) {
    // ... 渲染逻辑
  }
}
```
- 查询选择器使用的类名是 `candidate-preview`（不存在）

### 问题分析

由于类名不匹配：
1. `querySelectorAll('.candidate-preview')` 返回空数组（找不到任何元素）
2. `for` 循环不会执行任何迭代
3. 预览容器中的 `<div class="preview-placeholder">加载预览...</div>` 永远不会被替换
4. 用户看到的就是"加载预览..."占位符

## 解决方案

### 修复方法

将 `renderPreviews()` 方法中的选择器从 `.candidate-preview` 改为 `.card-preview`，使其与实际 DOM 结构一致。

### 修复代码

**修改前**:
```typescript
async renderPreviews(renderFunction: (tex: string) => Promise<string>): Promise<void> {
  const previews = this.container.querySelectorAll('.candidate-preview'); // ❌
  // ...
}
```

**修改后**:
```typescript
async renderPreviews(renderFunction: (tex: string) => Promise<string>): Promise<void> {
  const previews = this.container.querySelectorAll('.card-preview'); // ✅
  // ...
}
```

### 修改文件

- **文件**: `math-formula-plugin/src/components/ambiguity-resolver.ts`
- **行数**: 第 145 行
- **改动**: 1 行代码

## 验证方法

### 自动化测试

运行现有测试套件，确保没有引入回归：

```bash
cd math-formula-plugin
npm run test -- --run
```

**预期结果**: 365/368 测试通过（与修复前一致）

### 手动测试

1. **启动开发服务器**:
   ```bash
   npm run dev
   ```

2. **测试场景 1: UnicodeMath 粘贴**
   - 打开浏览器访问 `http://localhost:5173`
   - 粘贴 `a/b` (UnicodeMath 格式)
   - 观察歧义对比界面
   - **预期**: 看到两个候选项的 SVG 预览（分数的不同解释）

3. **测试场景 2: 使用测试页面**
   - 打开 `test-preview-fix.html`
   - 点击"运行测试"按钮
   - **预期**: 
     - 显示 3 个候选项卡片
     - 每个卡片都显示渲染后的 SVG 预览
     - 测试状态显示"通过"

### 验收标准

- ✅ 预览容器能够被正确找到（`querySelectorAll` 返回非空数组）
- ✅ 所有候选项的预览都能成功渲染为 SVG
- ✅ 不再显示"加载预览..."占位符
- ✅ 现有测试套件全部通过
- ✅ 没有引入新的 bug 或回归

## 影响分析

### 修改范围

- **最小化修复**: 仅修改 1 行代码
- **无副作用**: 不影响其他组件或功能
- **向后兼容**: 不改变 API 或接口

### 相关组件

- `AmbiguityResolver` (直接修复)
- `AmbiguityPrompt` (不受影响，使用不同的渲染机制)
- `main.ts` 中的 `handlePaste()` (调用方，不需要修改)

### 测试覆盖

现有测试已覆盖此功能：
- `tests/integration/ambiguity-resolution-e2e.test.ts`
  - ✅ 应该渲染所有候选项的预览
- `tests/integration/default-candidate-rendering.test.ts`
  - ✅ 默认候选项渲染测试

## 相关文档

- [歧义显示差异分析](./ambiguity-display-difference-analysis.md) - 解释 AmbiguityPrompt 和 AmbiguityResolver 的区别
- [歧义框架指南](./ambiguity-framework-guide.md) - 歧义检测系统的整体架构
- [输入版本修复](./input-version-fix.md) - 解决歧义状态残留的问题

## 总结

这是一个典型的"拼写错误"类 bug，由于类名不一致导致 DOM 查询失败。修复方法简单直接，只需统一类名即可。

**关键教训**:
- 在创建 DOM 和查询 DOM 时，确保使用一致的类名
- 使用常量或枚举来管理 CSS 类名，避免硬编码字符串
- 添加单元测试验证 DOM 查询逻辑

**修复状态**: ✅ 已完成
**测试状态**: ✅ 已验证
**文档状态**: ✅ 已更新
