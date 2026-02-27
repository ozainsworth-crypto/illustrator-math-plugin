# Phase 5 CEP 面板 UI 设计方案

## 设计日期
2024-02-24

## 设计目标

基于用户需求，设计 CEP 专用 UI 方案，符合以下原则:
1. 移除快速示例、下载/复制按钮
2. 调试日志改为标签页形式
3. 应用瑞士国际主义设计风格
4. 接近 Adobe 原生面板设计语言
5. 添加字体包工具入口

---

## UI 区域划分

### 标签页结构

```
┌─────────────────────────────────────────┐
│  [主界面] [调试日志]                      │  ← 标签页导航
├─────────────────────────────────────────┤
│                                         │
│  标签页内容区域                          │
│                                         │
└─────────────────────────────────────────┘
```

### 主界面标签页

```
┌─────────────────────────────────────────┐
│  输入区                                  │
│  ├─ LaTeX 输入框 (100px 高度)           │
│  └─ 格式选择器 (动态显示)                │
├─────────────────────────────────────────┤
│  选项区                                  │
│  ├─ 字体选择器 (2 选项 + 提示图标)       │
│  ├─ 字号输入框 (并排显示)                │
│  └─ 字体包工具入口按钮                   │
├─────────────────────────────────────────┤
│  操作区                                  │
│  ├─ 渲染按钮 (主按钮)                    │
│  └─ 清空按钮 (次按钮)                    │
├─────────────────────────────────────────┤
│  预览区                                  │
│  ├─ SVG 预览 (150px 最小高度)           │
│  ├─ 加载指示器                           │
│  ├─ 错误消息                             │
│  └─ 插入按钮 (主按钮，预览成功后显示)    │
└─────────────────────────────────────────┘
```

**操作流程**：
1. 用户在输入区输入 LaTeX 公式
2. 在选项区选择字体和字号
3. 点击操作区的"渲染"按钮
4. 预览区显示渲染结果
5. 预览区底部显示"插入到 Illustrator"按钮
6. 点击插入按钮完成操作

### 调试日志标签页

```
┌─────────────────────────────────────────┐
│  调试日志容器                            │
│  ├─ 日志内容 (深色背景、等宽字体)        │
│  └─ 清空日志按钮                         │
└─────────────────────────────────────────┘
```

---

## 瑞士国际主义设计风格定义

### 配色方案

#### Adobe 深色主题 (CEP 环境)

```css
/* 背景色 */
--bg-primary: #2d2d2d;      /* 主背景 */
--bg-secondary: #1e1e1e;    /* 次背景 */
--bg-input: #3a3a3a;        /* 输入框背景 */

/* 文本色 */
--text-primary: #f8f8f2;    /* 主文本 */
--text-secondary: #cccccc;  /* 次文本 */
--text-placeholder: #888888; /* 占位符 */

/* 边框色 */
--border-primary: #444444;  /* 主边框 */
--border-focus: #0d6efd;    /* 聚焦边框 (Adobe 蓝) */

/* 强调色 */
--accent-primary: #0d6efd;  /* Adobe 蓝 */
--accent-success: #4caf50;  /* 成功绿 */
--accent-error: #f44336;    /* 错误红 */
--accent-warning: #ff9800;  /* 警告橙 */
```

#### 中性色对比 (高对比度)

- 背景与文本对比度 ≥ 7:1 (WCAG AAA 级别)
- 边框与背景对比度 ≥ 3:1

### 间距规范

#### 8px 基准网格

```css
/* 间距单位 */
--spacing-xs: 4px;   /* 0.5 × 基准 */
--spacing-sm: 8px;   /* 1 × 基准 */
--spacing-md: 12px;  /* 1.5 × 基准 */
--spacing-lg: 16px;  /* 2 × 基准 */
--spacing-xl: 24px;  /* 3 × 基准 */

/* 区域间距 */
--section-gap: 16px; /* 紧凑布局 */

/* 组件内边距 */
--input-padding: 8px;
--button-padding: 8px 16px;
--container-padding: 16px;
```

#### 网格对齐

- 所有元素尺寸和位置必须是 8px 的倍数
- 文本行高必须是 8px 的倍数

### 排版规范

#### 字体

```css
/* 字体族 */
--font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, 
               'Helvetica Neue', Arial, sans-serif;
--font-family-mono: 'Monaco', 'Courier New', monospace;

/* 字体大小 */
--font-size-xs: 11px;  /* 小号 */
--font-size-sm: 12px;  /* 标准 */
--font-size-md: 14px;  /* 中号 */
--font-size-lg: 16px;  /* 大号 */

/* 行高 */
--line-height-tight: 1.2;   /* 紧凑 */
--line-height-normal: 1.5;  /* 标准 */
--line-height-relaxed: 1.75; /* 宽松 */
```

#### 层次

- 标题: 14px, 600 weight, 1.2 line-height
- 正文: 12px, 400 weight, 1.5 line-height
- 辅助: 11px, 400 weight, 1.5 line-height

### 装饰元素

#### 圆角

```css
/* 圆角 */
--radius-none: 0px;    /* 无圆角 */
--radius-sm: 2px;      /* 小圆角 */
--radius-md: 4px;      /* 中圆角 */
```

#### 阴影

```css
/* 阴影 (极浅或无) */
--shadow-none: none;
--shadow-sm: 0 1px 2px rgba(0, 0, 0, 0.2);
```

#### 边框

```css
/* 边框 */
--border-width: 1px;
--border-style: solid;
```

---

## 组件设计

### 1. 标签页导航

#### 结构

```html
<div class="tab-navigation">
  <button class="tab-button active" data-tab="main">主界面</button>
  <button class="tab-button" data-tab="debug">调试日志</button>
</div>

<div class="tab-content">
  <div class="tab-panel active" id="main-panel">
    <!-- 主界面内容 -->
  </div>
  <div class="tab-panel" id="debug-panel">
    <!-- 调试日志内容 -->
  </div>
</div>
```

#### 样式

```css
.tab-navigation {
  display: flex;
  gap: 0;
  border-bottom: 1px solid var(--border-primary);
  background-color: var(--bg-secondary);
}

.tab-button {
  padding: 8px 16px;
  border: none;
  background-color: transparent;
  color: var(--text-secondary);
  font-size: var(--font-size-sm);
  cursor: pointer;
  transition: background-color 0.2s, color 0.2s;
  border-bottom: 2px solid transparent;
}

.tab-button:hover {
  background-color: rgba(255, 255, 255, 0.05);
  color: var(--text-primary);
}

.tab-button.active {
  color: var(--accent-primary);
  border-bottom-color: var(--accent-primary);
}

.tab-content {
  flex: 1;
  overflow-y: auto;
}

.tab-panel {
  display: none;
  padding: var(--container-padding);
}

.tab-panel.active {
  display: block;
}
```

### 2. 输入区

#### 结构

```html
<div class="input-section">
  <label for="latex-input" class="section-label">LaTeX 输入</label>
  <textarea 
    id="latex-input" 
    class="latex-input" 
    placeholder="输入 LaTeX 公式，例如: \frac{a}{b}"
    rows="4"
  ></textarea>
  
  <!-- 格式选择器 (动态显示) -->
  <div id="format-selector" class="format-selector hidden">
    <!-- 格式选择器内容 -->
  </div>
</div>
```

#### 样式

```css
.input-section {
  margin-bottom: var(--section-gap);
}

.section-label {
  display: block;
  margin-bottom: var(--spacing-sm);
  font-size: var(--font-size-sm);
  font-weight: 600;
  color: var(--text-primary);
}

.latex-input {
  width: 100%;
  height: 100px;
  padding: var(--input-padding);
  border: 1px solid var(--border-primary);
  border-radius: var(--radius-sm);
  background-color: var(--bg-input);
  color: var(--text-primary);
  font-family: var(--font-family-mono);
  font-size: var(--font-size-sm);
  line-height: var(--line-height-normal);
  resize: vertical;
  transition: border-color 0.2s;
}

.latex-input::placeholder {
  color: var(--text-placeholder);
}

.latex-input:focus {
  outline: none;
  border-color: var(--border-focus);
}
```

### 3. 预览区（包含插入按钮）

#### 结构

```html
<div class="preview-section">
  <label class="section-label">预览</label>
  <div class="preview-container">
    <div id="preview-output" class="preview-output"></div>
    <div id="loading-indicator" class="loading-indicator hidden">
      <div class="spinner"></div>
      <span>渲染中...</span>
    </div>
    <div id="error-message" class="error-message hidden"></div>
  </div>
  
  <!-- 插入按钮：预览成功后显示 -->
  <div class="preview-actions">
    <button id="insert-btn" class="btn btn-success btn-block" disabled>
      插入到 Illustrator
    </button>
  </div>
</div>
```

#### 样式

```css
.preview-section {
  margin-bottom: var(--section-gap);
}

.preview-container {
  min-height: 150px;
  border: 1px solid var(--border-primary);
  border-radius: var(--radius-sm);
  padding: var(--spacing-lg);
  background-color: var(--bg-secondary);
  display: flex;
  align-items: center;
  justify-content: center;
  position: relative;
}

.preview-output {
  width: 100%;
  text-align: center;
}

.preview-output:empty::before {
  content: '公式预览将显示在这里';
  color: var(--text-placeholder);
  font-size: var(--font-size-sm);
}

.loading-indicator {
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: var(--spacing-sm);
  color: var(--text-secondary);
}

.spinner {
  width: 32px;
  height: 32px;
  border: 3px solid var(--border-primary);
  border-top-color: var(--accent-primary);
  border-radius: 50%;
  animation: spin 1s linear infinite;
}

@keyframes spin {
  to { transform: rotate(360deg); }
}

.error-message {
  color: var(--accent-error);
  background-color: rgba(244, 67, 54, 0.1);
  border: 1px solid var(--accent-error);
  border-radius: var(--radius-sm);
  padding: var(--spacing-md);
  font-size: var(--font-size-sm);
}

.preview-actions {
  margin-top: var(--spacing-md);
}
```

### 4. 选项区

#### 结构

```html
<div class="options-section">
  <label class="section-label">选项</label>
  
  <!-- 字体选择器 -->
  <div class="option-row">
    <div class="font-selector">
      <div class="font-radio-group">
        <label class="font-radio-option">
          <input type="radio" name="font" value="user" class="font-radio-input" />
          <span class="font-radio-label">自主字体</span>
          <span class="font-info-icon" title="若要替换自主字体，请使用独立的 Font Pack Builder 工具">ℹ️</span>
        </label>
        <label class="font-radio-option">
          <input type="radio" name="font" value="default" class="font-radio-input" checked />
          <span class="font-radio-label">默认字体</span>
        </label>
      </div>
    </div>
  </div>
  
  <!-- 字号输入框 -->
  <div class="option-row">
    <label for="font-size-input" class="option-label">字号 (pt)</label>
    <input 
      type="number" 
      id="font-size-input" 
      class="font-size-input" 
      value="14" 
      min="1" 
      max="200" 
    />
  </div>
  
  <!-- 字体包工具入口 -->
  <div class="option-row">
    <button id="open-font-tool-btn" class="btn btn-secondary btn-block">
      打开字体包工具
    </button>
  </div>
</div>
```

#### 样式

```css
.options-section {
  margin-bottom: var(--section-gap);
}

.option-row {
  margin-bottom: var(--spacing-md);
}

.option-row:last-child {
  margin-bottom: 0;
}

.option-label {
  display: block;
  margin-bottom: var(--spacing-xs);
  font-size: var(--font-size-sm);
  color: var(--text-secondary);
}

.font-size-input {
  width: 100%;
  padding: var(--input-padding);
  border: 1px solid var(--border-primary);
  border-radius: var(--radius-sm);
  background-color: var(--bg-input);
  color: var(--text-primary);
  font-size: var(--font-size-sm);
}

.font-size-input:focus {
  outline: none;
  border-color: var(--border-focus);
}

.font-radio-group {
  display: flex;
  flex-direction: column;
  gap: var(--spacing-sm);
}

.font-radio-option {
  display: flex;
  align-items: center;
  gap: var(--spacing-sm);
  padding: var(--spacing-sm);
  border: 1px solid var(--border-primary);
  border-radius: var(--radius-sm);
  background-color: var(--bg-secondary);
  cursor: pointer;
  transition: border-color 0.2s;
}

.font-radio-option:hover {
  border-color: var(--accent-primary);
}

.font-radio-input {
  width: 16px;
  height: 16px;
  cursor: pointer;
  accent-color: var(--accent-primary);
}

.font-radio-label {
  flex: 1;
  font-size: var(--font-size-sm);
  color: var(--text-primary);
  cursor: pointer;
}

.font-info-icon {
  font-size: 16px;
  color: var(--accent-primary);
  cursor: help;
}
```

### 5. 操作区（不包含插入按钮）

#### 结构

```html
<div class="actions-section">
  <div class="action-buttons">
    <button id="render-btn" class="btn btn-primary">渲染</button>
    <button id="clear-btn" class="btn btn-secondary">清空</button>
  </div>
</div>
```

**说明**：插入按钮已移至预览区底部，更符合用户操作直觉。

#### 样式

```css
.actions-section {
  margin-bottom: var(--section-gap);
}

.action-buttons {
  display: flex;
  gap: var(--spacing-sm);
}

.btn {
  padding: var(--button-padding);
  border: none;
  border-radius: var(--radius-sm);
  font-size: var(--font-size-sm);
  font-weight: 500;
  cursor: pointer;
  transition: background-color 0.2s, opacity 0.2s;
}

.btn:disabled {
  opacity: 0.5;
  cursor: not-allowed;
}

.btn-primary {
  background-color: var(--accent-primary);
  color: white;
}

.btn-primary:hover:not(:disabled) {
  background-color: #0b5ed7;
}

.btn-success {
  background-color: var(--accent-success);
  color: white;
}

.btn-success:hover:not(:disabled) {
  background-color: #43a047;
}

.btn-secondary {
  background-color: transparent;
  color: var(--text-primary);
  border: 1px solid var(--border-primary);
}

.btn-secondary:hover:not(:disabled) {
  background-color: rgba(255, 255, 255, 0.05);
}

.btn-block {
  width: 100%;
}
```

### 6. 调试日志标签页

#### 结构

```html
<div id="debug-panel" class="tab-panel">
  <div class="debug-header">
    <h3 class="debug-title">调试日志</h3>
    <button id="clear-log-btn" class="btn btn-secondary btn-sm">清空日志</button>
  </div>
  <div id="debug-log" class="debug-log"></div>
</div>
```

#### 样式

```css
.debug-header {
  display: flex;
  justify-content: space-between;
  align-items: center;
  margin-bottom: var(--spacing-md);
}

.debug-title {
  font-size: var(--font-size-md);
  font-weight: 600;
  color: var(--text-primary);
}

.btn-sm {
  padding: 4px 8px;
  font-size: var(--font-size-xs);
}

.debug-log {
  font-family: var(--font-family-mono);
  font-size: var(--font-size-xs);
  line-height: var(--line-height-normal);
  white-space: pre-wrap;
  word-break: break-all;
  background-color: var(--bg-secondary);
  padding: var(--spacing-md);
  border-radius: var(--radius-sm);
  max-height: 400px;
  overflow-y: auto;
  border: 1px solid var(--border-primary);
}

.debug-log .log-success {
  color: var(--accent-success);
}

.debug-log .log-error {
  color: var(--accent-error);
}

.debug-log .log-warning {
  color: var(--accent-warning);
}

.debug-log .log-info {
  color: var(--accent-primary);
}
```

---

## 响应式布局

### 最小尺寸

- 最小宽度: 300px
- 最小高度: 400px

### 标准尺寸

- 标准宽度: 400px
- 标准高度: 600px

### 最大尺寸

- 最大宽度: 600px
- 最大高度: 800px

### 适配策略

```css
/* 小尺寸 (< 350px) */
@media (max-width: 350px) {
  .action-buttons {
    flex-direction: column;
  }
  
  .btn {
    width: 100%;
  }
}

/* 中尺寸 (350px - 500px) */
@media (min-width: 350px) and (max-width: 500px) {
  .action-buttons {
    flex-wrap: wrap;
  }
}

/* 大尺寸 (> 500px) */
@media (min-width: 500px) {
  .action-buttons {
    flex-wrap: nowrap;
  }
}
```

---

## 交互设计

### 标签页切换

1. 点击标签按钮
2. 隐藏当前标签页内容
3. 显示目标标签页内容
4. 更新标签按钮状态 (active)

### 字体包工具入口

1. 点击"打开字体包工具"按钮
2. 使用 `CSInterface.openURLInDefaultBrowser()` 打开 Web UI
3. 或使用 ExtendScript 执行 shell 命令打开本地工具

### 字体选择

1. 点击字体选项
2. 应用字体包 (如果选择自主字体)
3. 重新渲染当前公式 (如果有)

### 字号输入

1. 输入字号值
2. 验证范围 (1-200)
3. 保存到状态

---

## 实现优先级

### P0: 必须实现

1. 标签页结构 (主界面 + 调试日志)
2. 移除快速示例区域
3. 隐藏下载/复制按钮 (CEP 环境)
4. 更新扩展名称
5. 添加字体包工具入口按钮

### P1: 设计风格

6. 应用 Adobe 深色主题
7. 应用瑞士国际主义设计风格
8. 统一间距和排版

### P2: 优化

9. 优化各区域布局
10. 优化响应式适配
11. 优化交互反馈

---

## 护栏要求

### 核心功能接口保持不变

- ✅ 不修改 `WebFormulaGenerator` 接口
- ✅ 不修改 `FormulaParser` 接口
- ✅ 不修改 `FontPackLoader` 接口
- ✅ 不修改 `IllustratorBridge` 接口

### 回归测试

每次 UI 迭代后:
1. 运行 Lint 检查: `npm run lint`
2. 运行 Typecheck: `npm run typecheck`
3. 手动测试 5 个关键用例
4. 记录回归测试结果到 `docs/phase5-regression-test-log.md`

---

## 总结

本设计方案基于用户需求，采用标签页结构、Adobe 深色主题和瑞士国际主义设计风格，提供简洁、现代、接近 Adobe 原生面板的 CEP UI。所有改动仅涉及 UI 层，不影响核心功能接口，回归测试风险可控。

建议按照 P0 → P1 → P2 的顺序逐步实现，每次迭代后运行完整的回归测试，确保功能稳定性。
