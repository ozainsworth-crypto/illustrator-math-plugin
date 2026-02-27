# Phase 5 UI 设计方案

**创建时间**: 2026-02-24  
**基于**: `docs/phase5-ui-issues.md` 问题清单  
**目标**: 优化 UI 布局，提升用户体验，同时保持核心功能接口不变

## 设计原则

1. **渐进式优化**: 每次只改进一个区域，立即测试
2. **保持功能稳定**: 不修改核心功能接口（WebFormulaGenerator, IllustratorBridge, FontPackLoader, FormulaParser）
3. **视觉一致性**: 统一配色、间距、排版规范
4. **响应式适配**: 支持 Web 和 CEP 环境，适配不同尺寸

## UI 区域划分

### 1. 输入区（Input Area）
**位置**: 顶部  
**组件**:
- 格式选择器（Format Selector）
- LaTeX 输入框（Textarea）
- 快速示例按钮（Example Buttons）
- 歧义解析器（Ambiguity Resolver，按需显示）

**布局**:
```
┌─────────────────────────────────────┐
│ 格式: [自动检测 ▼]                  │
├─────────────────────────────────────┤
│ ┌─────────────────────────────────┐ │
│ │ 输入 LaTeX 公式...              │ │
│ │                                 │ │
│ │                                 │ │
│ └─────────────────────────────────┘ │
├─────────────────────────────────────┤
│ 快速示例: [a/b] [x²+y²] [√x] ...   │
└─────────────────────────────────────┘
```

**优化点**:
- 输入框高度: 120px（当前可能不足）
- 添加占位符文本: "输入 LaTeX 公式..."
- 格式选择器添加标签: "输入格式:"
- 快速示例按钮统一样式（使用 CSS 类）

### 2. 预览区（Preview Area）
**位置**: 输入区下方  
**组件**:
- SVG 预览容器（Preview Output）
- 加载指示器（Loading Indicator）
- 错误提示（Error Message）

**布局**:
```
┌─────────────────────────────────────┐
│ 预览                                │
├─────────────────────────────────────┤
│                                     │
│         [SVG 预览内容]              │
│                                     │
│   或 "公式预览将显示在这里"         │
│   或 "⏳ 渲染中..."                 │
│   或 "❌ 错误: ..."                 │
│                                     │
└─────────────────────────────────────┘
```

**优化点**:
- 最小高度: 200px
- 添加边框: 1px solid #e0e0e0
- 背景色: #fafafa（浅灰）
- SVG 居中显示
- 空状态占位符: "公式预览将显示在这里"（灰色文本）
- 加载状态: 添加旋转动画（CSS animation）
- 错误状态: 红色背景 + 图标

### 3. 选项区（Options Area）
**位置**: 预览区下方  
**组件**:
- 字体选择器（Font Selector）
- 字体包信息显示（Font Pack Info）
- 字号输入框（Font Size Input）

**布局**:
```
┌─────────────────────────────────────┐
│ 字体: [Latin Modern Math ▼]        │
│       更新时间: 2026-02-24 10:30    │
├─────────────────────────────────────┤
│ 字号: [12] pt                       │
└─────────────────────────────────────┘
```

**优化点**:
- 字体选择器和字号输入框并排显示（flex 布局）
- 字体包信息显示在字体选择器下方（小字，灰色）
- 字号输入框后添加 "pt" 标签
- 添加工具提示（title 属性）

### 4. 操作区（Actions Area）
**位置**: 底部  
**组件**:
- 渲染按钮（Render Button）
- 插入按钮（Insert Button，仅 CEP）
- 下载按钮（Download Button）
- 复制按钮（Copy Button）
- 清空按钮（Clear Button）

**布局**:
```
┌─────────────────────────────────────┐
│ [渲染] [插入到 AI] [下载] [复制] [清空] │
│  主按钮    主按钮    次按钮  次按钮  次按钮 │
└─────────────────────────────────────┘
```

**优化点**:
- 按钮顺序: 渲染 → 插入（CEP）→ 下载 → 复制 → 清空
- 主按钮样式: 蓝色背景（--primary-color）
- 次按钮样式: 白色背景 + 边框
- 统一按钮大小: padding: 0.6rem 1.2rem
- 统一圆角: border-radius: 4px
- 按钮间距: gap: 0.75rem
- 禁用状态: opacity: 0.5 + cursor: not-allowed

### 5. 调试区（Debug Area，仅 CEP）
**位置**: 底部（可折叠）  
**组件**:
- 调试日志（Debug Log）

**布局**:
```
┌─────────────────────────────────────┐
│ 调试日志 [展开/折叠]                │
├─────────────────────────────────────┤
│ [日志内容]                          │
└─────────────────────────────────────┘
```

**优化点**:
- 仅在 CEP 环境下渲染（条件渲染）
- 默认折叠状态
- 添加展开/折叠按钮

## 视觉风格规范

### 配色方案（Color Palette）

```css
:root {
  /* 主色（Primary） */
  --primary-color: #1976d2;        /* 蓝色 - 主按钮 */
  --primary-hover: #1565c0;        /* 深蓝 - 主按钮悬停 */
  
  /* 辅色（Secondary） */
  --secondary-color: #ffffff;      /* 白色 - 次按钮背景 */
  --secondary-border: #d0d0d0;     /* 灰色 - 次按钮边框 */
  --secondary-hover: #f5f5f5;      /* 浅灰 - 次按钮悬停 */
  
  /* 背景色（Background） */
  --bg-color: #ffffff;             /* 白色 - 主背景 */
  --bg-secondary: #fafafa;         /* 浅灰 - 预览区背景 */
  --bg-input: #ffffff;             /* 白色 - 输入框背景 */
  
  /* 文本色（Text） */
  --text-color: #333333;           /* 深灰 - 主文本 */
  --text-secondary: #666666;       /* 中灰 - 次要文本 */
  --text-placeholder: #999999;     /* 浅灰 - 占位符 */
  
  /* 边框色（Border） */
  --border-color: #e0e0e0;         /* 浅灰 - 边框 */
  --border-focus: #1976d2;         /* 蓝色 - 聚焦边框 */
  
  /* 状态色（State） */
  --success-color: #4caf50;        /* 绿色 - 成功 */
  --error-color: #d32f2f;          /* 红色 - 错误 */
  --warning-color: #ff9800;        /* 橙色 - 警告 */
  --info-color: #2196f3;           /* 蓝色 - 信息 */
}
```

### 间距规范（Spacing）

```css
:root {
  /* 间距单位 */
  --spacing-xs: 0.25rem;   /* 4px */
  --spacing-sm: 0.5rem;    /* 8px */
  --spacing-md: 0.75rem;   /* 12px */
  --spacing-lg: 1rem;      /* 16px */
  --spacing-xl: 1.5rem;    /* 24px */
  --spacing-xxl: 2rem;     /* 32px */
  
  /* 区域间距 */
  --section-gap: 1.5rem;   /* 区域之间的间距 */
  
  /* 组件内边距 */
  --input-padding: 0.75rem;
  --button-padding: 0.6rem 1.2rem;
  --container-padding: 1.5rem;
}
```

### 排版规范（Typography）

```css
:root {
  /* 字体大小 */
  --font-size-xs: 0.75rem;   /* 12px - 小字 */
  --font-size-sm: 0.875rem;  /* 14px - 次要文本 */
  --font-size-md: 1rem;      /* 16px - 正文 */
  --font-size-lg: 1.125rem;  /* 18px - 标题 */
  
  /* 行高 */
  --line-height-tight: 1.2;
  --line-height-normal: 1.5;
  --line-height-relaxed: 1.75;
  
  /* 字体族 */
  --font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, 
                 'Helvetica Neue', Arial, sans-serif;
  --font-family-mono: 'Monaco', 'Courier New', monospace;
}
```

### 圆角规范（Border Radius）

```css
:root {
  --radius-sm: 2px;    /* 小圆角 */
  --radius-md: 4px;    /* 中圆角 - 按钮、输入框 */
  --radius-lg: 8px;    /* 大圆角 - 卡片 */
}
```

### 阴影规范（Shadow）

```css
:root {
  --shadow-sm: 0 1px 2px rgba(0, 0, 0, 0.05);
  --shadow-md: 0 2px 4px rgba(0, 0, 0, 0.1);
  --shadow-lg: 0 4px 8px rgba(0, 0, 0, 0.15);
}
```

## 响应式适配

### Web 环境（宽度 ≥ 600px）
- 使用标准间距（--section-gap: 1.5rem）
- 按钮横向排列
- 字体选择器和字号输入框并排

### CEP 环境（宽度 < 600px）
- 减小间距（--section-gap: 1rem）
- 按钮可能换行（flex-wrap: wrap）
- 字体选择器和字号输入框可能堆叠

### 小尺寸面板（宽度 < 400px）
- 进一步减小间距（--section-gap: 0.75rem）
- 按钮堆叠排列（flex-direction: column）
- 减小字体大小（--font-size-md: 0.875rem）

## 动画规范

### 加载动画（Loading Animation）

```css
@keyframes spin {
  from { transform: rotate(0deg); }
  to { transform: rotate(360deg); }
}

.loading-spinner {
  display: inline-block;
  width: 20px;
  height: 20px;
  border: 2px solid var(--border-color);
  border-top-color: var(--primary-color);
  border-radius: 50%;
  animation: spin 0.8s linear infinite;
}
```

### 过渡动画（Transition）

```css
/* 按钮悬停 */
.btn {
  transition: background-color 0.2s ease, 
              border-color 0.2s ease,
              transform 0.1s ease;
}

.btn:hover {
  transform: translateY(-1px);
}

/* 输入框聚焦 */
input, textarea, select {
  transition: border-color 0.2s ease, 
              box-shadow 0.2s ease;
}
```

## 工具提示（Tooltip）

### 实现方式
使用原生 `title` 属性（简单实现）或自定义 Tooltip 组件（高级实现）

### 建议添加 Tooltip 的元素
- 渲染按钮: "渲染 LaTeX 公式为 SVG"
- 插入按钮: "插入 SVG 到 Illustrator 文档"
- 下载按钮: "下载 SVG 文件"
- 复制按钮: "复制 SVG 代码到剪贴板"
- 清空按钮: "清空输入和预览"
- 字体选择器: "选择数学字体（仅影响字母数字）"
- 字号输入框: "设置字号（单位: pt）"

## 成功/错误反馈

### 成功提示（Success Toast）
- 位置: 右上角
- 样式: 绿色背景 + 白色文本 + 图标
- 持续时间: 2 秒
- 触发场景: 插入成功、复制成功

### 错误提示（Error Message）
- 位置: 预览区内
- 样式: 红色背景 + 白色文本 + 图标
- 持续时间: 持续显示，直到用户操作
- 触发场景: 渲染失败、插入失败

## 实施顺序

按照 Task 19.3-19.11 的顺序逐步实施：

1. **Task 19.3**: 优化输入区布局
2. **Task 19.4**: 优化预览区布局
3. **Task 19.5**: 优化选项区布局
4. **Task 19.6**: 优化操作区布局
5. **Task 19.7**: 添加加载指示器
6. **Task 19.8**: 添加成功/错误状态反馈
7. **Task 19.9**: 添加工具提示和帮助文本
8. **Task 19.10**: 统一视觉风格（应用 CSS 变量）
9. **Task 19.11**: 优化 CEP 面板适配
10. **Task 19.12**: 验收与总结

## 护栏检查

每次 UI 迭代后，必须确认：

✅ 核心功能接口未修改：
- `WebFormulaGenerator.renderLatex()`, `getMathJaxVersion()`, `exportSVG()`, `getCalibrationData()`
- `IllustratorBridge.insertSVG()`, `checkDocumentStatus()`, `isCEPEnvironment()`
- `FontPackLoader.detectAndLoadUserFontPack()`, `applyUserFontPack()`, `restoreDefaultFont()`
- `FormulaParser.detectFormat()`, `convert()`

✅ 回归测试通过：
- `npm run lint` (Exit Code 0)
- `npm run typecheck` (Exit Code 0)
- `npm run test` (≥98.0% pass rate)
- 5 个关键插入用例全部通过

✅ 测试结果已记录到 `docs/phase5-regression-test-log.md`
