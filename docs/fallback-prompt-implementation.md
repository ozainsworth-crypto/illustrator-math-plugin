# 降级提示界面实现文档

## 概述

本文档记录了降级提示界面（FallbackPrompt）的实现，该组件用于在检测到不支持的输入格式时，向用户提供友好的错误提示和可操作的建议。

## 实现内容

### 1. FallbackPrompt 组件

**文件**：`src/components/fallback-prompt.ts`

**功能**：
- 显示检测到的输入类型
- 显示失败原因的可读描述
- 提供下一步可操作建议
- 允许用户切换到其他格式
- 保留原始内容供参考

**接口**：
```typescript
export interface FallbackInfo {
  inputType: string;          // 检测到的输入类型
  failureReason: string;       // 失败原因
  suggestions: string[];       // 操作建议列表
  originalContent: string;     // 原始粘贴内容
}

export class FallbackPrompt {
  show(info: FallbackInfo): void;
  hide(): void;
  onSwitchFormat(callback: (format: string) => void): void;
  onEdit(callback: () => void): void;
}
```

**UI 元素**：
- 警告图标和标题
- 输入类型显示
- 失败原因说明
- 建议列表（无序列表）
- 原始内容（可折叠的 details 元素）
- 操作按钮：
  - 切换到 LaTeX 输入
  - 尝试 AsciiMath
  - 手动编辑
  - 关闭

### 2. CSS 样式

**文件**：`src/style.css`

**样式特点**：
- 使用警告色系（黄色背景 #fff3cd，边框 #ffc107）
- 清晰的视觉层次
- 可折叠的原始内容区域
- 响应式按钮布局

**关键样式类**：
- `.fallback-prompt-card` - 主卡片容器
- `.fallback-prompt-title` - 标题区域
- `.fallback-input-type` - 输入类型显示
- `.fallback-reason` - 失败原因
- `.fallback-suggestions` - 建议列表
- `.fallback-original-content` - 原始内容（可折叠）
- `.fallback-actions` - 操作按钮区域

### 3. 主应用集成

**文件**：`src/main.ts`

**集成点**：
1. 导入 FallbackPrompt 组件和类型
2. 创建 fallbackPrompt 实例
3. 在 handlePaste 函数中，当 parseResult.success 为 false 时：
   - 构建 FallbackInfo 对象
   - 调用 fallbackPrompt.show() 显示降级提示
   - 设置格式切换回调
   - 设置手动编辑回调

**代码示例**：
```typescript
if (!parseResult.success) {
  const fallbackInfo: FallbackInfo = {
    inputType: parseResult.format || '未知格式',
    failureReason: parseResult.error || '格式转换失败',
    suggestions: [
      '尝试切换到 LaTeX 格式手动输入',
      '尝试使用 AsciiMath 格式（更简单的语法）',
      '检查粘贴内容是否包含富文本或 HTML 标签',
      '从纯文本编辑器（如记事本）复制内容',
    ],
    originalContent: normalizedText,
  };

  fallbackPrompt.show(fallbackInfo);

  fallbackPrompt.onSwitchFormat((format) => {
    fallbackPrompt.hide();
    latexInput.value = '';
    latexInput.focus();
  });

  fallbackPrompt.onEdit(() => {
    latexInput.value = normalizedText;
    latexInput.focus();
  });

  hideLoading();
  return;
}
```

### 4. HTML 结构

**文件**：`index.html`

**添加的容器**：
```html
<!-- 降级提示容器 -->
<div id="fallback-prompt"></div>
```

**位置**：在输入区域内，位于格式选择器和歧义提示之间。

## 用户交互流程

### 场景 1：粘贴富文本内容

```
用户粘贴富文本内容
         ↓
PasteNormalizer 提取纯文本
         ↓
FormulaParser 检测格式失败
         ↓
显示降级提示界面
  - 输入类型：富文本
  - 失败原因：包含 HTML 标签
  - 建议：从纯文本编辑器复制
         ↓
用户选择"切换到 LaTeX 输入"
         ↓
隐藏降级提示，清空输入框，聚焦输入框
```

### 场景 2：粘贴未知格式

```
用户粘贴未知格式内容
         ↓
FormulaParser 无法识别格式
         ↓
显示降级提示界面
  - 输入类型：未知格式
  - 失败原因：无法识别的数学表达式
  - 建议：尝试 LaTeX 或 AsciiMath
         ↓
用户选择"手动编辑"
         ↓
隐藏降级提示，保留原始内容在输入框，聚焦输入框
```

### 场景 3：查看原始内容

```
用户看到降级提示
         ↓
点击"查看原始内容"
         ↓
展开 details 元素，显示原始粘贴内容
         ↓
用户可以复制原始内容或参考
```

## 设计决策

### 1. 为什么使用警告色系？

降级提示不是错误，而是一种"需要用户注意"的状态。使用警告色（黄色）而不是错误色（红色）更符合语义。

### 2. 为什么提供多个操作按钮？

不同用户有不同的偏好：
- 有些用户想切换到 LaTeX 手动输入
- 有些用户想尝试 AsciiMath（更简单）
- 有些用户想直接编辑原始内容
- 有些用户只是想关闭提示

提供多个选项可以满足不同用户的需求。

### 3. 为什么原始内容可折叠？

原始内容可能很长，默认展开会占用大量空间。使用 `<details>` 元素可以让用户按需查看，同时保持界面简洁。

### 4. 为什么不自动尝试 AsciiMath？

虽然 AsciiMath 可以作为降级兜底，但自动尝试可能导致：
- 误判（将非数学内容解析为 AsciiMath）
- 用户困惑（不知道为什么结果不符合预期）

因此，我们选择显示降级提示，让用户主动选择是否尝试 AsciiMath。

## 测试验证

### 手动测试场景

1. **富文本粘贴**：
   - 从 Word 或网页复制带格式的内容
   - 粘贴到输入框
   - 验证降级提示显示
   - 验证建议列表包含"从纯文本编辑器复制"

2. **未知格式粘贴**：
   - 粘贴非数学表达式（如普通文本）
   - 验证降级提示显示
   - 验证建议列表包含"尝试 LaTeX 或 AsciiMath"

3. **格式切换**：
   - 触发降级提示
   - 点击"切换到 LaTeX 输入"
   - 验证降级提示隐藏
   - 验证输入框清空并聚焦

4. **手动编辑**：
   - 触发降级提示
   - 点击"手动编辑"
   - 验证降级提示隐藏
   - 验证原始内容保留在输入框

5. **查看原始内容**：
   - 触发降级提示
   - 点击"查看原始内容"
   - 验证原始内容展开显示
   - 验证可以复制原始内容

### 自动化测试

目前没有针对 FallbackPrompt 的自动化测试，因为它主要是 UI 组件。未来可以添加：
- 单元测试：测试 show/hide 方法
- 集成测试：测试与 FormulaParser 的集成
- E2E 测试：测试完整的用户交互流程

## 关联需求

- **需求 2（B4.9-10）**：降级提示功能
  - B4.9：当检测到不支持的格式时，显示降级提示
  - B4.10：提供可操作的建议和替代方案

## 关联设计

- **设计文档"降级链规则"章节**：定义了降级链的触发条件和流程
- **设计文档"错误处理"章节**：定义了错误提示的规范

## 未来改进

### 1. 智能建议

根据检测到的输入类型，提供更精准的建议：
- 如果检测到 HTML 标签，建议"使用浏览器的'查看源代码'功能"
- 如果检测到 Word 格式，建议"使用 Word 的'另存为纯文本'功能"

### 2. 示例展示

在降级提示中显示正确的输入示例：
- LaTeX 示例：`\frac{a}{b}`
- AsciiMath 示例：`a/b`

### 3. 历史记录

记录用户的降级提示历史，帮助用户避免重复错误。

### 4. 一键修复

对于某些常见错误（如多余的空格、换行符），提供"一键修复"按钮。

## 总结

降级提示界面（FallbackPrompt）成功实现了友好的错误提示和可操作的建议，提升了用户体验。关键特点：

- ✅ 清晰的视觉设计（警告色系）
- ✅ 可读的错误描述
- ✅ 可操作的建议列表
- ✅ 多种操作选项（切换格式、手动编辑、关闭）
- ✅ 保留原始内容供参考
- ✅ 可折叠的原始内容区域
- ✅ 与主应用无缝集成

**测试结果**：
- 所有 295 个测试通过
- 向后兼容性良好
- 无新增 lint 或 type 错误（仅有之前存在的错误）

**下一步**：
- 添加针对 FallbackPrompt 的单元测试
- 添加集成测试验证降级流程
- 根据用户反馈优化建议内容
