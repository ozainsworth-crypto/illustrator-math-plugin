# CEP UI 迁移计划

**日期**: 2026-02-25  
**参考 UI**: `index优化.html` (Gemini 优化 + 用户调整)  
**目标**: 以参考 UI 为视觉标准，迁移 CEP 面板 UI，不影响核心功能

---

## 一、DOM 映射表（已确认版本）

### 1.1 核心交互元素映射（必须保留 ID）

| 功能 | 参考 UI ID | 当前 ID | 最终策略 | 备注 |
|------|-----------|---------|---------|------|
| **LaTeX 输入框** | `latex-input` | `latex-input` | ✅ 保持 | 核心输入，ID 不变 |
| **渲染按钮** | `render-btn` | `render-btn` | ✅ 保持 | 主操作按钮 |
| **清空按钮** | 无 | `clear-btn` | ✅ 保留 | 保留逻辑，仅改样式 |
| **插入按钮** | `insert-btn` | `insert-btn` | ✅ 保持 | CEP 核心功能 |
| **字号输入** | `font-size` | `font-size-input` | ✅ 保持原 ID | 添加 `class="font-size"` |
| **预览容器** | `svg-preview` | `preview-output` | ✅ 保持原 ID | 外层添加 `id="svg-preview"` 包装 |
| **状态文本** | `status-text` | 无 | ➕ 新增 | 页脚状态显示 |
| **下载按钮** | 无 | `download-btn` | ⚠️ CSS 隐藏 | `body.cep` 下隐藏 |
| **复制按钮** | 无 | `copy-btn` | ⚠️ CSS 隐藏 | `body.cep` 下隐藏 |

**用户确认要点**:
1. ✅ `font-size-input` ID 不改，添加 `class="font-size"` 或 `data-ui="font-size"`
2. ✅ `preview-output` ID 不改，外层新增 `id="svg-preview"` 容器
3. ✅ 下载/复制采用 `body.cep` CSS 隐藏，保留 DOM 和 JS
4. ✅ 清空按钮保留逻辑，仅改样式
5. ✅ 字体选择器本轮不组件化，仅 UI 包装

### 1.2 容器结构映射

| 区域 | 参考 UI 结构 | 当前结构 | 迁移策略 |
|------|-------------|----------|----------|
| **顶部导航** | `.header-bar` + `.tab-nav` | `.header` + `.tab-navigation` | 采用参考 UI 结构 |
| **输入区** | `.content-area` > `textarea` | `.input-section` > `textarea` | 简化为参考结构 |
| **选项区** | `.settings-area` > `.options-row` | `.options-section` | 采用并行布局 |
| **字号设置** | `.col-size` > `.ai-combo-box` | `#font-size-container` | 采用 Adobe 风格组合框 |
| **字体选择** | `.col-font` > `.segmented-control` | `#font-selector-container` | 采用分段控件 |
| **预览区** | `.preview-box` | `.preview-section` | 采用网格背景样式 |
| **页脚** | `.footer-info` | `.footer` | 采用紧凑状态栏 |

### 1.3 组件容器映射（保持不变）

| 组件 | 当前 ID | 状态 | 说明 |
|------|---------|------|------|
| **歧义解析器** | `ambiguity-resolver` | ✅ 保持 | 组件自管理 DOM |
| **格式选择器** | `format-selector` | ✅ 保持 | 组件自管理 DOM |
| **降级提示** | `fallback-prompt` | ✅ 保持 | 组件自管理 DOM |
| **歧义提示** | `ambiguity-prompt` | ✅ 保持 | 组件自管理 DOM |
| **字体选择器** | `font-selector-container` | ✅ 保持 | 组件自管理 DOM |

---

## 二、迁移策略

### 2.1 HTML 结构调整

#### A. 顶部区域（采用参考 UI）
```html
<!-- 参考 UI 结构 -->
<header class="header-bar">
  <div class="brand-label">JOJOUP Math Font</div>
</header>

<nav class="tab-nav">
  <div class="tab-item active" data-tab="main">编辑器</div>
  <div class="tab-item" data-tab="debug">日志</div>
</nav>
```

**改动点**:
- 移除 `<h1>` 和 `.subtitle`
- 采用 `.brand-label` 紧凑标题
- 标签页改为 `<div>` 而非 `<button>`

#### B. 输入区（简化结构）
```html
<!-- 参考 UI 结构 -->
<label class="section-label">LaTeX 表达式</label>
<textarea id="latex-input" class="code-editor" 
  placeholder="输入 LaTeX 公式，例如：\frac{a}{b}"></textarea>
```

**改动点**:
- 移除 `<section>` 包装
- 使用 `<label>` 替代 `<h2>`
- textarea 类名改为 `code-editor`

#### C. 选项区（并行布局）
```html
<!-- 参考 UI 结构 -->
<div class="settings-area">
  <div class="options-row">
    <!-- 左：字号 -->
    <div class="col-size">
      <label class="section-label">字号</label>
      <div class="font-size-wrapper">
        <div class="ai-label-icon"><!-- Tt 图标 --></div>
        <div class="ai-combo-box">
          <div class="ai-stepper">...</div>
          <div class="ai-field-area">
            <input type="number" id="font-size" class="ai-input" value="14">
            <span class="ai-unit">pt</span>
          </div>
          <div class="ai-drop-btn">...</div>
        </div>
      </div>
    </div>
    
    <!-- 右：字体 -->
    <div class="col-font">
      <label class="section-label">字体系统</label>
      <div class="segmented-control">
        <div class="segment-btn active">默认</div>
        <div class="segment-btn">自主字体包</div>
      </div>
    </div>
  </div>
  
  <!-- 右下角工具按钮 -->
  <div id="font-tool-btn" class="font-tool-button">...</div>
</div>
```

**改动点**:
- 采用 `.options-row` 并行布局
- 字号采用 Adobe 风格组合框（带步进器）
- 字体选择改为分段控件
- 添加右下角工具按钮

#### D. 按钮区（简化）
```html
<!-- 参考 UI 结构 -->
<button id="render-btn" class="btn btn-primary">渲染公式预览</button>

<!-- 结果区（按需显示） -->
<div id="result-group" style="display: none;">
  <div class="preview-box">
    <div id="svg-preview"></div>
  </div>
  <button id="insert-btn" class="btn btn-quick-action">置入到画布</button>
</div>
```

**改动点**:
- 移除 `<section>` 包装
- 清空按钮移到其他位置或移除
- 预览区采用网格背景
- 插入按钮采用 Quick Action 风格

#### E. 页脚（紧凑状态栏）
```html
<!-- 参考 UI 结构 -->
<footer class="footer-info">
  <span>MathJax v4.1.0</span>
  <span id="status-text">就绪</span>
</footer>
```

**改动点**:
- 采用紧凑双栏布局
- 添加状态文本显示

### 2.2 CSS 变量调整

#### A. 颜色变量（采用参考 UI）
```css
:root {
  /* Adobe Spectrum 标准色 */
  --ai-bg: #535353;
  --ai-header-bg: #464646;
  --ai-input-bg: #454545;
  --ai-focus-bg: #ffffff;
  --ai-border-dark: #3e3e3e;
  --ai-border-idle: #606060;
  --ai-border-hover: #747474;
  --ai-selected-bg: #303030;
  --ai-hover-bg: #5a5a5a;
  
  --text-primary: #e1e1e1;
  --text-secondary: #a0a0a0;
  --text-dim: #888888;
  
  --accent-blue: #2090f1;
}
```

#### B. 字体和间距
```css
:root {
  --font-ui: "Inter", -apple-system, "Segoe UI", sans-serif;
  --font-mono: "Monaco", "Menlo", "Cascadia Code", monospace;
}

body {
  font-size: 11px; /* 紧凑字号 */
}
```

### 2.3 JavaScript 选择器更新

#### A. 需要更新的选择器
```typescript
// 原: #font-size-input → 新: #font-size
const fontSizeInput = document.getElementById('font-size') as HTMLInputElement;

// 原: #preview-output → 新: #svg-preview
const previewOutput = document.getElementById('svg-preview') as HTMLDivElement;

// 新增: 状态文本
const statusText = document.getElementById('status-text') as HTMLSpanElement;

// 新增: 结果组容器
const resultGroup = document.getElementById('result-group') as HTMLDivElement;
```

#### B. 需要添加的逻辑
```typescript
// 1. 渲染成功后显示结果区
function showResultGroup() {
  const resultGroup = document.getElementById('result-group');
  if (resultGroup) {
    resultGroup.style.display = 'block';
  }
}

// 2. 更新状态文本
function updateStatus(text: string) {
  const statusText = document.getElementById('status-text');
  if (statusText) {
    statusText.textContent = text;
  }
}

// 3. 字号步进器逻辑
document.getElementById('step-up')?.addEventListener('click', (e) => {
  e.stopPropagation();
  const input = document.getElementById('font-size') as HTMLInputElement;
  input.value = String(parseInt(input.value) + 1);
});

document.getElementById('step-down')?.addEventListener('click', (e) => {
  e.stopPropagation();
  const input = document.getElementById('font-size') as HTMLInputElement;
  input.value = String(Math.max(6, parseInt(input.value) - 1));
});
```

### 2.4 CEP 环境处理（方案 A：CSS 隐藏）

#### A. 添加 body.cep 类
```typescript
// 在 main.ts 中检测 CEP 环境
if (illustratorBridge.isInCEP()) {
  document.body.classList.add('cep');
  console.log('[CEP] CEP 环境已检测，应用 CEP 样式');
}
```

#### B. CSS 隐藏下载/复制按钮
```css
/* CEP 环境隐藏 Web 专用按钮 */
body.cep #download-btn,
body.cep #copy-btn,
body.cep .actions-section {
  display: none !important;
}
```

---

## 三、实施步骤

### Step 1: 备份当前文件
```bash
cp math-formula-plugin/index.html math-formula-plugin/index.html.backup
cp math-formula-plugin/src/style.css math-formula-plugin/src/style.css.backup
cp math-formula-plugin/src/main.ts math-formula-plugin/src/main.ts.backup
```

### Step 2: 更新 HTML 结构
- 文件: `math-formula-plugin/index.html`
- 改动: 采用参考 UI 结构
- 保留: 所有核心 ID 和组件容器

### Step 3: 更新 CSS 样式
- 文件: `math-formula-plugin/src/style.css`
- 改动: 采用参考 UI 颜色和组件样式
- 新增: Adobe 风格组合框、分段控件、网格背景

### Step 4: 更新 JavaScript 逻辑
- 文件: `math-formula-plugin/src/main.ts`
- 改动: 更新选择器映射
- 新增: 步进器逻辑、状态更新、CEP 类检测

### Step 5: 回归验证
```bash
# 自动化测试
npm run lint
npm run typecheck
npm run build

# 手动测试（Web）
npm run dev
# 测试: 渲染、歧义、错误、下载、复制

# 手动测试（CEP）
npm run build:cep
# 测试: 渲染、歧义、插入、字号统一
# 验证: 下载/复制按钮不可见
```

---

## 四、风险评估

### 4.1 低风险改动 ✅
- HTML 结构调整（保留所有核心 ID）
- CSS 颜色和样式更新
- 添加 body.cep 类
- 添加状态文本显示

### 4.2 中风险改动 ⚠️
- 字号输入 ID 改名（`font-size-input` → `font-size`）
  - **缓解**: 更新所有引用，测试验证
- 预览容器 ID 改名（`preview-output` → `svg-preview`）
  - **缓解**: 更新所有引用，测试验证
- 字体选择器改为分段控件
  - **缓解**: 保留 FontSelector 组件接口，仅改 UI

### 4.3 高风险改动 ❌
- 无（所有核心业务逻辑保持不变）

---

## 五、回滚计划

如果回归测试失败：

1. **立即回滚**:
   ```bash
   mv math-formula-plugin/index.html.backup math-formula-plugin/index.html
   mv math-formula-plugin/src/style.css.backup math-formula-plugin/src/style.css
   mv math-formula-plugin/src/main.ts.backup math-formula-plugin/src/main.ts
   ```

2. **分析失败原因**:
   - 检查哪个测试失败
   - 检查控制台错误
   - 检查 DOM 选择器是否正确

3. **修复或延期**:
   - 如果可以快速修复（< 30 分钟），修复后重新测试
   - 否则延期改动，记录问题

---

## 六、验收标准

### 6.1 自动化测试
- ✅ `npm run lint` 通过（无错误）
- ✅ `npm run typecheck` 通过（无类型错误）
- ✅ `npm run build` 成功（无构建错误）
- ✅ 测试套件通过率 ≥ 98.0%

### 6.2 Web Demo 回归
- ✅ 渲染公式正常（`\frac{a}{b}`）
- ✅ 歧义选择正常（`x^2^3`）
- ✅ 错误提示正常（`\frac{a`）
- ✅ 下载 SVG 可用
- ✅ 复制 SVG 可用

### 6.3 CEP 回归
- ✅ 渲染公式正常
- ✅ 歧义选择正常
- ✅ 插入 Illustrator 正常
- ✅ 字号统一正常（marker=found）
- ✅ 下载/复制按钮不可见
- ✅ 字体选择器可用
- ✅ 字号输入可用

### 6.4 视觉验收
- ✅ 采用 Adobe Spectrum 配色
- ✅ 紧凑布局（11px 字号）
- ✅ 并行选项布局
- ✅ Adobe 风格组合框
- ✅ 分段控件样式
- ✅ 网格背景预览
- ✅ 紧凑状态栏

---

## 七、变更文件清单

### 7.1 必改文件
1. `math-formula-plugin/index.html` - HTML 结构
2. `math-formula-plugin/src/style.css` - CSS 样式
3. `math-formula-plugin/src/main.ts` - JavaScript 逻辑

### 7.2 可能改动文件
1. `math-formula-plugin/src/components/font-selector.ts` - 字体选择器组件（如需适配分段控件）

### 7.3 不改文件（READ-ONLY）
1. `math-formula-plugin/src/lib/formula-generator.ts`
2. `math-formula-plugin/src/lib/illustrator-bridge.ts`
3. `math-formula-plugin/src/lib/font-pack-loader.ts`
4. `math-formula-plugin/src/lib/formula-parser.ts`
5. `math-formula-plugin/src/lib/unicodemath-parser.ts`
6. `math-formula-plugin/extension/host/illustrator.jsx`

---

## 八、时间估算

- **Step 1-2**: HTML 结构更新 - 30 分钟
- **Step 3**: CSS 样式更新 - 45 分钟
- **Step 4**: JavaScript 更新 - 30 分钟
- **Step 5**: 回归验证 - 45 分钟
- **总计**: 约 2.5 小时

---

## 九、下一步行动

**请确认以下问题后，我将开始实施**:

1. ✅ 是否同意字号输入 ID 改名（`font-size-input` → `font-size`）？
2. ✅ 是否同意预览容器 ID 改名（`preview-output` → `svg-preview`）？
3. ✅ 是否同意采用方案 A（CSS 隐藏下载/复制按钮）？
4. ✅ 是否同意移除清空按钮（或保留但调整样式）？
5. ✅ 是否同意字体选择器改为分段控件样式？

**确认后，我将按以下顺序执行**:
1. 创建备份
2. 更新 HTML
3. 更新 CSS
4. 更新 JavaScript
5. 运行回归测试
6. 输出变更总结

---

**文档状态**: 等待用户确认  
**创建日期**: 2026-02-25  
**创建者**: Kiro AI Agent
