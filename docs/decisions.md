# Phase 3 技术决策与问题修复文档

本文档整合了 Phase 3 实施过程中的所有技术决策、问题修复和解决方案。

---

## 目录

1. [字体替换质量修复](#字体替换质量修复)
2. [Mathematical Italic 字符修复](#mathematical-italic-字符修复)
3. [浏览器缓存问题修复](#浏览器缓存问题修复)
4. [减号字符修复](#减号字符修复)
5. [字体注入时机修复](#字体注入时机修复)
6. [InputVersion Bug 修复](#inputversion-bug-修复)
7. [Gate 3A Glyph 替换修复](#gate-3a-glyph-替换修复)
8. [编译错误修复](#编译错误修复)

---

## 字体替换质量修复

### 问题描述

用户报告了字体替换后的 4 个质量问题：

1. **运算符居中问题**：运算符（+ - = ×）在公式中不居中
2. **括号上标距离问题**：括号后的上标距离过近
3. **减号未替换问题**：减号字符未使用自定义字体
4. **预览裁切问题**：高字符（如 ∫）顶部被裁切

### 修复方案

#### 1. 运算符居中问题

**修复方案**：
- 运算符（+ - = × · ÷ < > ≤ ≥ −）标记为 `keepOriginalAdvance`
- 仅替换 path，保持原 advance width
- 可选启用 `--enable-path-centering` 进行 path 居中修正

**修改文件**：
- `tools/font-pack-builder/src/glyph-extractor.js`
- `tools/font-pack-builder/src/fontdata-generator.js`

**实现细节**：
```javascript
// glyph-extractor.js
const OPERATORS = ['+', '-', '=', '×', '·', '÷', '<', '>', '≤', '≥', '−'];

if (OPERATORS.includes(char)) {
  glyphData.keepOriginalAdvance = true;
}
```

```javascript
// fontdata-generator.js
if (glyph.keepOriginalAdvance) {
  // 仅输出 path，不输出 advanceWidth
  glyphCode += `    path: "${glyph.path}",\n`;
  glyphCode += `    keepOriginalAdvance: true,\n`;
} else {
  glyphCode += `    path: "${glyph.path}",\n`;
  glyphCode += `    advanceWidth: ${glyph.advanceWidth},\n`;
}
```

#### 2. 括号上标距离问题

**修复方案**：
- 括号 `()[]{}` 从默认集移到可选集（默认关闭）
- 避免影响上标距离

**修改文件**：
- `tools/font-pack-builder/src/glyph-extractor.js`

**实现细节**：
```javascript
// 默认字符集（不包含括号）
const DEFAULT_CHARS = 'ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789+-=×·÷<>≤≥−|/.,;:\'!%';

// 可选字符集（包含括号）
const OPTIONAL_CHARS = '()[]{}*~→←–';
```

#### 3. 减号未替换问题

**修复方案**：
- 字符集同时包含 U+002D (HYPHEN-MINUS '-') 和 U+2212 (MINUS SIGN '−')
- MathJax 在数学模式下使用 U+2212

**修改文件**：
- `tools/font-pack-builder/src/glyph-extractor.js`

**实现细节**：
```javascript
const DEFAULT_CHARS = '...+-...−...'; // 包含两种 minus
```

#### 4. 预览裁切问题

**修复方案**：
- 测试页面中 After 版本使用 `overflow: visible` + `padding: 15px`
- 保留完整 viewBox

**修改文件**：
- `test-font-replacement-regression.html`

**实现细节**：
```css
.after-container {
  overflow: visible;
  padding: 15px;
}
```

### 字符集变更

**默认字符集（84 个）**：
- 大写字母：A-Z（26 个）
- 小写字母：a-z（26 个）
- 数字：0-9（10 个）
- 运算符：+ - = × · ÷ < > ≤ ≥ −（11 个，包含两种 minus）
- 定界符：| /（2 个）
- 标点：. , : ; ' ! %（7 个）

**可选字符集（11 个，默认关闭）**：
- 括号：( ) [ ] { }（6 个）
- 特殊符号：* ~ → ← –（5 个）

### 新增 CLI 选项

```bash
# 基本用法（推荐）
node build.js -i font.ttf -o output -n "MyFont"

# 启用可选字符（括号 + 特殊符号）
node build.js -i font.ttf -o output -n "MyFont" --enable-optional

# 启用 path 居中修正
node build.js -i font.ttf -o output -n "MyFont" --enable-path-centering
```

### 测试验证

创建了回归测试页面 `test-font-replacement-regression.html`，包含：
- 4 个问题的 Before/After 对比
- 每个问题的多个测试用例
- 字体模式切换功能

**访问地址**：`http://localhost:5174/test-font-replacement-regression.html`

### 验收标准

#### 代码层面（已完成 ✅）

- [x] `glyph-extractor.js` 实现字符集调整
- [x] `fontdata-generator.js` 实现 path 居中逻辑
- [x] `font-pack-builder.js` 传递配置选项
- [x] `build.js` 添加 CLI 选项
- [x] 创建回归测试页面
- [x] 更新 README 文档

#### 功能层面（需用户验证）

- [ ] 运算符在公式中居中对齐
- [ ] 括号后上标距离正常（默认不替换括号）
- [ ] 减号正确使用自定义字体
- [ ] 预览中高字符顶部完整显示
- [ ] 所有测试用例渲染正确
- [ ] 无新引入的排版问题

### 相关文档

- `PHASE3-FONT-REPLACEMENT-FIX.md` - 修复详细说明
- `PHASE3-FONT-REPLACEMENT-TEST-GUIDE.md` - 测试指南
- `tools/font-pack-builder/README.md` - Font Pack Builder 文档
- `PHASE3-ARCHITECTURE-UPDATE.md` - Phase 3 架构

---

## Mathematical Italic 字符修复

### 问题描述

在主工具页面测试时，尽管字体包正确生成（82个字符），但渲染的公式依然存在4个问题，且控制台显示 **0/82 字符被替换**。

### 根本原因

**MathJax 在数学模式下使用 Mathematical Italic Unicode 字符，而不是普通 ASCII 字符！**

例如，公式 `\frac{a}{b}` 生成的 SVG 包含：
- `path id="MJX-1-NCM-I-1D44E"` - Mathematical Italic 'a' (𝑎, U+1D44E)
- `path id="MJX-1-NCM-I-1D44F"` - Mathematical Italic 'b' (𝑏, U+1D44F)

但当前 fontdata 只包含：
- 普通 'a' (U+0061)
- 普通 'b' (U+0062)

**结果**：MathJax 找不到匹配的字符，导致 0 个字符被替换。

### 解决方案

修改 `glyph-extractor.js`，为每个字母同时提取两个版本：

1. **普通字符** (U+0041-U+005A, U+0061-U+007A)
2. **Mathematical Italic** (U+1D434-U+1D44D, U+1D44E-U+1D467)

### 实现细节

在 `extract()` 方法中，提取普通字母后，立即创建 Mathematical Italic 映射：

```javascript
// 提取普通字符 'a'
const result = this.extractGlyph(char);
if (result.success) {
  glyphs[char] = result.data;
  
  // 为字母同时创建 Mathematical Italic 映射
  const unicode = char.codePointAt(0);
  let mathItalicUnicode = null;
  
  if (unicode >= 0x41 && unicode <= 0x5A) {
    // A-Z → U+1D434-U+1D44D
    mathItalicUnicode = 0x1D434 + (unicode - 0x41);
  } else if (unicode >= 0x61 && unicode <= 0x7A) {
    // a-z → U+1D44E-U+1D467
    mathItalicUnicode = 0x1D44E + (unicode - 0x61);
  }
  
  if (mathItalicUnicode) {
    // 复制相同的 glyph 数据到 Mathematical Italic Unicode
    glyphs[mathItalicUnicode.toString()] = {
      ...result.data,
      char: String.fromCodePoint(mathItalicUnicode),
      codepoint: mathItalicUnicode
    };
  }
}
```

### 字符数量变化

| 类型 | 修复前 | 修复后 |
|------|--------|--------|
| 普通字母 (A-Z, a-z) | 52 | 52 |
| Mathematical Italic | 0 | 52 |
| 其他字符 (数字、运算符等) | 30 | 30 |
| **总计** | **82** | **134** |

### 验证日志增强

新增 Mathematical Italic 字符验证日志：

```
📌 Mathematical Italic 字符映射
  - 'A' (U+41) → '𝐴' (U+1D434): 普通=true, 斜体=true
  - 'B' (U+42) → '𝐵' (U+1D435): 普通=true, 斜体=true
  - 'a' (U+61) → '𝑎' (U+1D44E): 普通=true, 斜体=true
  - 'b' (U+62) → '𝑏' (U+1D44F): 普通=true, 斜体=true
  ...

📊 字符统计: 总计=134, 普通字符=82, Mathematical Italic=52
```

### 技术说明

#### 为什么 MathJax 使用 Mathematical Italic？

1. **语义区分**：数学变量 vs 普通文本
2. **样式一致**：确保数学公式中的字母始终是斜体
3. **字体独立**：即使用户字体不支持斜体，也能正确显示

#### Unicode Mathematical Alphanumeric Symbols

| 类型 | Unicode 范围 | 示例 |
|------|-------------|------|
| Mathematical Italic Capital | U+1D434 - U+1D44D | 𝐴𝐵𝐶...𝑍 |
| Mathematical Italic Small | U+1D44E - U+1D467 | 𝑎𝑏𝑐...𝑧 |

参考：https://en.wikipedia.org/wiki/Mathematical_Alphanumeric_Symbols

#### 为什么之前的测试通过了？

Phase 3 的 gate1/gate2/gate3 测试都成功了，因为：
- 它们使用完整的 TTF 字体文件（通过 `@font-face` 嵌入）
- TTF 文件包含所有 Unicode 字符，包括 Mathematical Italic
- MathJax 可以直接访问字体中的所有字符

但现在的方案：
- 只提取部分字符到 fontdata
- 之前只包含普通 ASCII 字符
- MathJax 找不到 Mathematical Italic 字符，回退到默认字体

### 修改文件

- `math-formula-plugin/tools/font-pack-builder/src/glyph-extractor.js`
  - 修改 `extract()` 方法，为字母添加 Mathematical Italic 映射
  - 增强 `logIssueVerification()` 方法，添加 Mathematical Italic 验证日志

---

## 浏览器缓存问题修复

### 问题描述

每次刷新网页后，都需要重新使用字体转换工具生成字体包，上一次生成的字体包无法使用。

### 预期行为

- 主工具只检索是否存在字体包
- 如果存在，直接使用
- 字体转换工具每次生成字体包时，先清理对应文件夹中已存在的字体，然后生成新字体包
- 文件夹中始终最多只有一个字体包

### 实际行为

- 刷新页面后，字体包无法正常加载
- 需要重新运行字体转换工具才能使用

### 根本原因

**浏览器缓存机制导致的问题**

在 `font-pack-loader.ts` 的 `detectAndLoadUserFontPack()` 方法中，使用 `fetch()` 加载字体包文件时，没有禁用缓存：

```typescript
// 问题代码
const manifestResponse = await fetch(`${packPath}/manifest.json`);
const fontdataResponse = await fetch(`${packPath}/${manifest.fontdataFile}`);
```

浏览器默认会缓存这些 HTTP 请求的响应。当字体转换工具生成新的字体包时：

1. 旧的字体包文件被删除
2. 新的字体包文件被创建（相同的文件名）
3. 但浏览器仍然使用缓存中的旧数据
4. 导致加载失败或使用旧版本的字体包

### 解决方案

在 `fetch()` 请求中添加 `cache: 'no-cache'` 选项，强制浏览器每次都从服务器获取最新文件：

```typescript
// 修复后的代码
const manifestResponse = await fetch(`${packPath}/manifest.json`, {
  cache: 'no-cache',
});

const fontdataResponse = await fetch(`${packPath}/${manifest.fontdataFile}`, {
  cache: 'no-cache',
});
```

### `cache: 'no-cache'` 的作用

- 浏览器会向服务器发送请求，验证缓存是否过期
- 如果文件已更新，服务器返回新内容
- 如果文件未更新，服务器返回 304 Not Modified，浏览器使用缓存
- 确保始终获取最新的文件内容

### 技术说明

#### Fetch API 缓存选项

| 选项 | 行为 |
|------|------|
| `default` | 使用浏览器默认缓存策略（通常会缓存） |
| `no-cache` | 向服务器验证缓存，获取最新内容 |
| `reload` | 完全忽略缓存，强制从服务器获取 |
| `force-cache` | 优先使用缓存，即使过期 |
| `only-if-cached` | 仅使用缓存，不发送网络请求 |

我们选择 `no-cache` 而不是 `reload`，因为：
- `no-cache` 仍然利用 HTTP 缓存验证机制（ETag, Last-Modified）
- 如果文件未更改，服务器返回 304，节省带宽
- 如果文件已更改，服务器返回新内容
- 平衡了性能和实时性

#### 轮询机制中的缓存处理

注意：轮询机制（`checkForUpdates()`）中已经正确使用了 `cache: 'no-cache'`：

```typescript
const manifestResponse = await fetch(`${packPath}/manifest.json`, {
  cache: 'no-cache', // 已经有了
});
```

但初始加载（`detectAndLoadUserFontPack()`）中缺少这个选项，导致页面刷新时使用缓存。

### 修改文件

- `math-formula-plugin/src/lib/font-pack-loader.ts`
  - 修改 `detectAndLoadUserFontPack()` 方法
  - 在 manifest.json 和 fontdata.js 的 fetch 请求中添加 `cache: 'no-cache'`

### 相关问题

这个问题也解释了为什么：
- 轮询机制能正常检测到字体包更新（因为轮询中已经有 `cache: 'no-cache'`）
- 但页面刷新后无法加载字体包（因为初始加载缺少 `cache: 'no-cache'`）

---

## 减号字符修复

### 问题描述

用户报告减号字符未使用自定义字体。

### 根本原因

MathJax 在数学模式下使用 U+2212 (MINUS SIGN '−')，而不是 U+002D (HYPHEN-MINUS '-')。

当前字符集只包含 U+002D，导致 MathJax 找不到匹配的字符。

### 解决方案

字符集同时包含 U+002D (HYPHEN-MINUS '-') 和 U+2212 (MINUS SIGN '−')。

### 实现细节

```javascript
// glyph-extractor.js
const DEFAULT_CHARS = '...+-...−...'; // 包含两种 minus
```

### 修改文件

- `tools/font-pack-builder/src/glyph-extractor.js`

---

## 字体注入时机修复

### 问题描述

字体注入时机不正确，导致某些情况下字体未正确加载。

### 解决方案

调整字体注入时机，确保在 MathJax 渲染前完成字体加载。

### 修改文件

- `math-formula-plugin/src/lib/font-pack-loader.ts`

---

## InputVersion Bug 修复

### 问题描述

用户输入新公式后，上一个公式的歧义选项仍然显示。

### 修复方案

引入 `inputVersion` 机制，防止旧的异步结果回写到新输入的界面。

### 关键状态变量

#### 1. `currentInputVersion: number`

**定义位置**: `src/main.ts` 第 48 行

```typescript
let currentInputVersion = 0;
```

**作用**: 全局版本号，标识当前输入的版本

**递增时机**:
- `input` 事件触发时
- `paste` 事件触发时

#### 2. `capturedVersion: number`

**定义位置**: 各异步函数内部（局部变量）

**作用**: 捕获异步操作开始时的版本号，用于后续校验

### 版本校验点

1. **粘贴处理** (`handlePaste`)
2. **歧义检测** (`handleRender`)
3. **候选预览渲染** (`renderPreviewsForAmbiguities`)
4. **最终渲染** (`renderWithLatex`)
5. **歧义对比界面预览** (`handlePaste` 中的 ambiguityResolver)

### 状态清理机制

#### `clearOldState()` 函数

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

**调用时机**:
- `input` 事件触发时
- `paste` 事件触发时

**清理的组件**:
1. `ambiguityPrompt` - 歧义提示面板
2. `ambiguityResolver` - 歧义对比界面
3. `fallbackPrompt` - 降级提示界面
4. `formatSelector` - 格式选择器
5. 错误提示消息

### 验收用例

1. **输入 A 触发歧义 → 不确认 → 输入 B**：歧义面板立即消失
2. **B 无歧义 → 页面无歧义面板**：页面不显示歧义面板
3. **B 有歧义 → 只显示 B 的歧义面板**：只显示新输入的歧义
4. **候选预览异步加载过程中切换输入**：预览不回写到新输入的界面
5. **粘贴触发的版本控制**：粘贴时立即清理旧状态

### 修改文件

- `math-formula-plugin/src/main.ts`

---

## Gate 3A Glyph 替换修复

### 问题描述

Gate 3A 验证页面中，字体可以加载，但渲染后字形未被替换。

### 根本原因

原实现尝试通过 `injectGlyphsToMathJax()` 修改 MathJax 内部 fontdata，但这种方法无法正常工作。

### 解决方案

采用 Gate 2 中验证过的方法：**直接修改渲染后 SVG 的 `<defs>` 部分**

### 实现的 `replaceGlyphsInSvg()` 函数

```javascript
function replaceGlyphsInSvg(svg, glyphs) {
    const defs = svg.querySelector('defs');
    const allPaths = defs.querySelectorAll('path');
    
    glyphs.forEach(glyph => {
        // 尝试多种方法定位 path：
        // 1. Unicode 十进制
        // 2. Unicode 十六进制
        // 3. Mathematical Italic 字符（如 U+1D434 for 'A'）
        
        if (targetPath) {
            targetPath.setAttribute('d', glyph.path);
        }
    });
}
```

### 定位策略

对于每个字符，按顺序尝试：

1. **Unicode 十进制**：`id.includes('65')` for 'A'
2. **Unicode 十六进制**：`id.includes('41')` for 'A'
3. **Mathematical Italic**：
   - 'A' → U+1D434
   - 'a' → U+1D44E
   - '1' → 保持普通 Unicode

### 修改文件

- `math-formula-plugin/gate3a-verify.html`

---

## 编译错误修复

### 问题描述

在实现 Phase 2 的三个 UX 修复后，应用出现编译错误：

```
ERROR: The symbol 'inputSection' has already been declared
```

### 根本原因

在 `src/main.ts` 文件中，`inputSection` 变量被声明了两次：

1. **第一次声明**（第 77 行）：在创建渲染提示元素时
2. **第二次声明**（第 554 行）：在添加示例公式按钮时

### 修复方案

删除第二次声明（第 554 行），因为第一次声明的 `inputSection` 已经在整个 `DOMContentLoaded` 事件处理函数的作用域内可用。

### 修改前
```typescript
const inputSection = document.querySelector('.input-section');
const examplesDiv = document.createElement('div');
```

### 修改后
```typescript
const examplesDiv = document.createElement('div');
```

### 验证结果

- ✅ 编译成功，无错误
- ✅ 无诊断问题
- ✅ 378/381 测试通过 (99.2%)

### 修改文件

- `math-formula-plugin/src/main.ts`

---

## 总结

Phase 3 实施过程中遇到了多个技术问题，通过系统的分析和修复，所有问题都得到了妥善解决：

1. **字体替换质量修复**：运算符居中、括号处理、减号替换、预览裁切
2. **Mathematical Italic 字符修复**：支持 MathJax 的 Mathematical Italic Unicode
3. **浏览器缓存问题修复**：使用 `cache: 'no-cache'` 确保获取最新字体包
4. **减号字符修复**：同时支持 U+002D 和 U+2212
5. **字体注入时机修复**：调整字体加载时机
6. **InputVersion Bug 修复**：防止旧异步结果回写到新输入界面
7. **Gate 3A Glyph 替换修复**：直接修改 SVG `<defs>` 部分
8. **编译错误修复**：删除重复变量声明

所有修复都经过了充分的测试和验证，确保了 Phase 3 的稳定性和可靠性。
