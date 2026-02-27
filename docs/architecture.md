# Phase 3 架构文档

本文档整合了 Phase 3 的架构设计、技术决策和 Spike 验证结论。

---

## 目录

1. [架构更新](#架构更新)
2. [最终技术决策](#最终技术决策)
3. [Spike 验证结论](#spike-验证结论)

---

## 架构更新

### Phase 3 架构概览

Phase 3 实现了用户自定义字体的支持，采用"字体包"方案，核心架构包括：

#### 1. 字体包生成工具 (Font Pack Builder)

**位置**: `tools/font-pack-builder/`

**功能**:
- 从 TTF/OTF 字体文件提取字形数据
- 生成轻量级字体包（fontdata.js + manifest.json）
- 支持字符集配置和可选字符
- 提供 CLI 和 Web UI 两种使用方式

**核心模块**:
- `glyph-extractor.js` - 字形提取和 SVG path 生成
- `fontdata-generator.js` - fontdata.js 文件生成
- `charset-manager.js` - 字符集管理
- `font-capability-detector.js` - 字体能力检测（Math Table）
- `path-normalizer.js` - 路径规范化和跨平台兼容

**字符集策略**:
- **默认字符集**（84 个）：
  - 大写字母 A-Z（26 个）+ Mathematical Italic（26 个）
  - 小写字母 a-z（26 个）+ Mathematical Italic（26 个）
  - 数字 0-9（10 个）
  - 运算符：+ - = × · ÷ < > ≤ ≥ −（11 个，包含 U+002D 和 U+2212）
  - 定界符：| /（2 个）
  - 标点：. , : ; ' ! %（7 个）

- **可选字符集**（11 个，默认关闭）：
  - 括号：( ) [ ] { }（6 个）
  - 特殊符号：* ~ → ← –（5 个）

**CLI 选项**:
```bash
# 基本用法
node build.js -i font.ttf -o output -n "MyFont"

# 启用可选字符
node build.js -i font.ttf -o output -n "MyFont" --enable-optional

# 启用 path 居中修正
node build.js -i font.ttf -o output -n "MyFont" --enable-path-centering
```

#### 2. 字体包加载器 (Font Pack Loader)

**位置**: `src/lib/font-pack-loader.ts`

**功能**:
- 检测和加载用户字体包
- 轮询机制监听字体包更新
- 浏览器缓存控制（`cache: 'no-cache'`）
- 字体包版本管理

**加载流程**:
1. 检测 `public/fonts/user-font-pack/` 目录
2. 加载 `manifest.json` 获取元数据
3. 加载 `fontdata.js` 获取字形数据
4. 启动轮询机制（每 2 秒检查一次）
5. 检测到更新时触发重新渲染

**缓存策略**:
- 所有 fetch 请求使用 `cache: 'no-cache'`
- 确保页面刷新后获取最新字体包
- 利用 HTTP 缓存验证机制（ETag, Last-Modified）

#### 3. 字体选择器 (Font Selector)

**位置**: `src/components/font-selector.ts`

**功能**:
- 显示可用字体列表（默认字体 + 用户字体）
- 字体切换和预览
- 字体包信息展示
- 与 Font Pack Loader 集成

**UI 组件**:
- 字体下拉选择器
- 字体信息面板（字符数、创建时间、contentHash）
- 字体切换按钮

#### 4. 字形替换引擎

**位置**: `src/lib/formula-generator.ts`

**功能**:
- 在 MathJax 渲染后替换 SVG 中的字形
- 支持 Mathematical Italic Unicode 字符
- 保持原始排版信息（位置、大小、transform）
- 处理运算符居中对齐

**替换策略**:
1. 解析 MathJax 生成的 SVG
2. 遍历 `<defs>` 中的 `<path>` 元素
3. 根据 path ID 匹配字符（支持 Unicode 十进制、十六进制、Mathematical Italic）
4. 替换 path 的 `d` 属性为自定义字形
5. 保持原始 `transform` 属性

**运算符处理**:
- 运算符标记为 `keepOriginalAdvance`
- 仅替换 path，保持原 advance width
- 可选启用 `--enable-path-centering` 进行 path 居中修正

### 架构图

```
┌─────────────────────────────────────────────────────────────┐
│                        用户界面                              │
│  ┌──────────────┐  ┌──────────────┐  ┌──────────────┐      │
│  │ 公式输入框   │  │ 字体选择器   │  │ 渲染按钮     │      │
│  └──────────────┘  └──────────────┘  └──────────────┘      │
└─────────────────────────────────────────────────────────────┘
                            │
                            ▼
┌─────────────────────────────────────────────────────────────┐
│                      主应用逻辑                              │
│  ┌──────────────────────────────────────────────────────┐  │
│  │ main.ts                                              │  │
│  │  - 事件处理                                          │  │
│  │  - 流程控制                                          │  │
│  │  - 组件协调                                          │  │
│  └──────────────────────────────────────────────────────┘  │
└─────────────────────────────────────────────────────────────┘
                            │
        ┌───────────────────┼───────────────────┐
        ▼                   ▼                   ▼
┌──────────────┐  ┌──────────────────┐  ┌──────────────┐
│ Font Pack    │  │ Formula          │  │ Font         │
│ Loader       │  │ Generator        │  │ Selector     │
│              │  │                  │  │              │
│ - 检测字体包 │  │ - MathJax 渲染   │  │ - 字体列表   │
│ - 加载 fontdata│ │ - 字形替换       │  │ - 字体切换   │
│ - 轮询更新   │  │ - SVG 生成       │  │ - 信息展示   │
└──────────────┘  └──────────────────┘  └──────────────┘
        │                   │
        │                   ▼
        │         ┌──────────────────┐
        │         │ MathJax v4       │
        │         │ - LaTeX 解析     │
        │         │ - SVG 渲染       │
        │         └──────────────────┘
        │
        ▼
┌─────────────────────────────────────────────────────────────┐
│                    字体包生成工具                            │
│  ┌──────────────────────────────────────────────────────┐  │
│  │ Font Pack Builder                                    │  │
│  │  ┌────────────────┐  ┌────────────────┐            │  │
│  │  │ CLI (build.js) │  │ Web UI         │            │  │
│  │  └────────────────┘  └────────────────┘            │  │
│  │                                                      │  │
│  │  ┌────────────────────────────────────────────┐    │  │
│  │  │ 核心模块                                   │    │  │
│  │  │  - glyph-extractor.js                     │    │  │
│  │  │  - fontdata-generator.js                  │    │  │
│  │  │  - charset-manager.js                     │    │  │
│  │  │  - font-capability-detector.js            │    │  │
│  │  │  - path-normalizer.js                     │    │  │
│  │  └────────────────────────────────────────────┘    │  │
│  └──────────────────────────────────────────────────────┘  │
└─────────────────────────────────────────────────────────────┘
                            │
                            ▼
                  ┌──────────────────┐
                  │ 字体包输出       │
                  │  - fontdata.js   │
                  │  - manifest.json │
                  └──────────────────┘
```

### 数据流

#### 1. 字体包生成流程

```
用户字体文件 (TTF/OTF)
    │
    ▼
Font Pack Builder
    │
    ├─> glyph-extractor.js
    │   └─> 提取字形 → 生成 SVG path
    │
    ├─> charset-manager.js
    │   └─> 管理字符集 → 过滤字符
    │
    ├─> font-capability-detector.js
    │   └─> 检测 Math Table → 标记能力
    │
    ├─> path-normalizer.js
    │   └─> 规范化路径 → 跨平台兼容
    │
    └─> fontdata-generator.js
        └─> 生成 fontdata.js + manifest.json
            │
            ▼
        字体包输出
        ├─> fontdata.js (字形数据)
        └─> manifest.json (元数据)
```

#### 2. 字体包加载和使用流程

```
应用启动
    │
    ▼
Font Pack Loader
    │
    ├─> 检测字体包目录
    │   └─> public/fonts/user-font-pack/
    │
    ├─> 加载 manifest.json (cache: no-cache)
    │   └─> 获取字体名称、版本、contentHash
    │
    ├─> 加载 fontdata.js (cache: no-cache)
    │   └─> 获取字形数据 (glyphs)
    │
    ├─> 启动轮询机制 (每 2 秒)
    │   └─> 检测 contentHash 变化 → 触发更新
    │
    └─> 通知 Font Selector
        └─> 更新字体列表
            │
            ▼
        用户选择字体
            │
            ▼
        Formula Generator
            │
            ├─> MathJax 渲染 LaTeX → SVG
            │
            └─> 字形替换
                ├─> 解析 SVG <defs>
                ├─> 匹配 path ID
                ├─> 替换 path d 属性
                └─> 保持 transform
                    │
                    ▼
                最终 SVG 输出
```

### 关键技术点

#### 1. Mathematical Italic Unicode

MathJax 在数学模式下使用 Mathematical Italic Unicode 字符：

| 类型 | Unicode 范围 | 示例 |
|------|-------------|------|
| Mathematical Italic Capital | U+1D434 - U+1D44D | 𝐴𝐵𝐶...𝑍 |
| Mathematical Italic Small | U+1D44E - U+1D467 | 𝑎𝑏𝑐...𝑧 |

**解决方案**：
- 为每个字母同时提取普通字符和 Mathematical Italic 字符
- 'A' (U+0041) → 同时生成 'A' (U+0041) 和 '𝐴' (U+1D434)
- 'a' (U+0061) → 同时生成 'a' (U+0061) 和 '𝑎' (U+1D44E)

#### 2. 减号字符处理

MathJax 在数学模式下使用 U+2212 (MINUS SIGN '−')，而不是 U+002D (HYPHEN-MINUS '-')。

**解决方案**：
- 字符集同时包含 U+002D 和 U+2212
- 确保减号正确替换

#### 3. 运算符居中对齐

运算符（+ - = × · ÷ < > ≤ ≥ −）需要在公式中居中对齐。

**解决方案**：
- 运算符标记为 `keepOriginalAdvance`
- 仅替换 path，保持原 advance width
- 可选启用 `--enable-path-centering` 进行 path 居中修正

#### 4. 括号上标距离

括号替换会影响上标距离。

**解决方案**：
- 括号移到可选字符集（默认关闭）
- 用户可通过 `--enable-optional` 启用

#### 5. 浏览器缓存控制

页面刷新后，浏览器可能使用缓存的旧字体包。

**解决方案**：
- 所有 fetch 请求使用 `cache: 'no-cache'`
- 利用 HTTP 缓存验证机制（ETag, Last-Modified）
- 确保始终获取最新字体包

### 性能优化

#### 1. 字体包大小

- 仅提取必要字符（84 个默认 + 11 个可选）
- fontdata.js 文件大小：约 50-100 KB
- 相比完整 TTF 文件（数 MB），大幅减小

#### 2. 加载性能

- 字体包加载：< 200ms
- 单字符替换：< 10ms
- 总替换耗时：< 100ms

#### 3. 轮询机制

- 轮询间隔：2 秒
- 仅检查 manifest.json（小文件）
- 仅在 contentHash 变化时重新加载 fontdata.js

### 可扩展性

#### 1. 字符集扩展

- 通过修改 `charset-manager.js` 添加新字符集
- 支持自定义字符集配置

#### 2. 字体格式支持

- 当前支持：TTF, OTF
- 可扩展支持：WOFF, WOFF2（需要添加解析器）

#### 3. 渲染引擎支持

- 当前支持：MathJax v4
- 可扩展支持：KaTeX, MathML（需要适配字形替换逻辑）

---

## 最终技术决策

### 决策背景

Phase 3 的核心需求是支持用户自定义字体，我们评估了多个技术方案：

- **方案 A**：字符转路径（opentype.js）
- **方案 B**：完整字体嵌入（@font-face）
- **方案 C**：字体子集化（fonttools）
- **方案 D**：字体包方案（提取字形数据）

### 最终决策：方案 D（字体包方案）

**决策日期**：2026-02-05

**核心理由**：

1. **轻量级**：
   - 仅提取必要字符的字形数据
   - fontdata.js 文件大小：50-100 KB
   - 相比完整 TTF 文件（数 MB），大幅减小

2. **跨平台兼容**：
   - 不依赖字体文件格式
   - 不依赖浏览器字体渲染引擎
   - 纯 JavaScript 实现，无需外部依赖

3. **可控性强**：
   - 完全控制字形替换逻辑
   - 可以精确控制哪些字符被替换
   - 可以实现运算符居中、括号处理等特殊逻辑

4. **性能优秀**：
   - 字体包加载：< 200ms
   - 字形替换：< 100ms
   - 轮询机制开销小

5. **用户体验好**：
   - 支持热更新（轮询机制）
   - 无需刷新页面即可切换字体
   - 字体包生成简单（CLI + Web UI）

### 方案对比

| 方案 | 优点 | 缺点 | 决策 |
|------|------|------|------|
| A: 字符转路径 | 技术可行，可控性强 | 位置计算复杂，Illustrator 兼容性未知 | ❌ 放弃 |
| B: 完整字体嵌入 | 实现简单，兼容性好 | 文件大小大，无法精确控制 | ❌ 放弃 |
| C: 字体子集化 | 文件大小适中 | 依赖外部工具，跨平台兼容性差 | ❌ 放弃 |
| D: 字体包方案 | 轻量级，可控性强，性能好 | 需要实现字形提取和替换逻辑 | ✅ 采用 |

### 实施细节

#### 1. 字体包结构

```
user-font-pack/
├── fontdata.js      # 字形数据
└── manifest.json    # 元数据
```

**fontdata.js**:
```javascript
window.UserFontData = {
  fontName: "MyFont",
  glyphs: {
    "65": { char: "A", path: "M...", ... },  // 普通 'A'
    "1D434": { char: "𝐴", path: "M...", ... }, // Mathematical Italic 'A'
    ...
  }
};
```

**manifest.json**:
```json
{
  "fontName": "MyFont",
  "version": "1.0.0",
  "createdAt": "2026-02-05T10:00:00Z",
  "contentHash": "abc123...",
  "fontdataFile": "fontdata.js",
  "glyphCount": 134
}
```

#### 2. 字形提取流程

1. 使用 opentype.js 加载字体文件
2. 遍历字符集，提取每个字符的字形
3. 将字形转换为 SVG path
4. 为字母同时生成 Mathematical Italic 映射
5. 生成 fontdata.js 和 manifest.json

#### 3. 字形替换流程

1. MathJax 渲染 LaTeX → SVG
2. 解析 SVG 的 `<defs>` 部分
3. 遍历 `<path>` 元素
4. 根据 path ID 匹配字符
5. 替换 path 的 `d` 属性
6. 保持原始 `transform` 属性

### 技术风险和缓解措施

#### 风险 1：字形位置不准确

**缓解措施**：
- 保持 MathJax 的原始 transform 属性
- 仅替换 path 数据，不修改位置信息
- 运算符使用 `keepOriginalAdvance` 策略

#### 风险 2：浏览器缓存问题

**缓解措施**：
- 所有 fetch 请求使用 `cache: 'no-cache'`
- 利用 HTTP 缓存验证机制
- 轮询机制检测字体包更新

#### 风险 3：字符集不完整

**缓解措施**：
- 提供默认字符集（84 个常用字符）
- 支持可选字符集（11 个特殊字符）
- 支持自定义字符集扩展

#### 风险 4：性能问题

**缓解措施**：
- 字体包大小控制在 100 KB 以内
- 字形替换使用高效算法（< 100ms）
- 轮询间隔设置为 2 秒

### 未来改进方向

1. **字符集扩展**：
   - 支持希腊字母（α β γ ...）
   - 支持特殊数学符号（∫ ∑ ∏ ...）
   - 支持用户自定义字符集

2. **字体格式支持**：
   - 支持 WOFF/WOFF2 格式
   - 支持 Variable Fonts

3. **渲染引擎支持**：
   - 支持 KaTeX
   - 支持 MathML

4. **性能优化**：
   - 字形数据压缩
   - 增量更新机制
   - Web Worker 异步处理

---

## Spike 验证结论

### Spike 概述

在 Phase 3 实施前，我们进行了多个技术方案的 Spike 验证，以确保选择的方案可行。

### Spike A：字符转路径方案

**验证日期**：2026-02-05

**验证目标**：验证使用 opentype.js 将字符转换为 SVG path 的可行性

**验证结果**：✅ 基本可行，但需要改进

#### 核心发现

1. ✅ opentype.js 可以加载和解析字体
2. ✅ 可以将字符转换为 SVG path
3. ✅ 可以替换 MathJax 生成的 SVG 中的 path
4. ✅ 替换后的 SVG 可以显示
5. ✅ 性能可接受（字体加载 < 200ms，单字符转换 < 10ms）

#### 当前问题

- 字符位置不完全正确
- 字符大小可能不匹配
- 显示不完整（部分字符可能超出可视区域）

**原因**：当前使用简化的匹配策略（按顺序匹配），对于复杂公式（上标、下标、分数等）不够准确。

#### 改进方案

**方案 A1：改进匹配算法**
- 解析 MathJax 的内部结构
- 使用位置和大小信息匹配
- 使用字形特征匹配

**方案 A2：使用 MathJax 的 API**
- 研究 MathJax v4 API
- 获取每个字符对应的 SVG 元素
- 获取字符的位置和大小信息

**方案 A3：混合方案**
- 简单字符使用改进的匹配算法
- 复杂结构使用启发式规则
- 提供手动调整接口

#### 关键决策点

**Illustrator 兼容性测试**（最关键）：
- 下载替换后的 SVG
- 在 Adobe Illustrator 中打开
- 验证是否能正常打开和显示
- 验证是否有变形或缺字

**如果 Illustrator 测试通过**：
- 方案 A 可行，进入实现阶段
- 预计实现时间：1-2 周

**如果 Illustrator 测试失败**：
- 分析失败原因（SVG 格式、Path 数据、Transform 等）
- 寻找解决方案或重新评估需求

#### 技术细节

**坐标系转换**：

opentype.js 坐标系：
- 原点：左下角
- Y 轴：向上为正
- 单位：字体单位（通常 1000 或 2048）

SVG 坐标系：
- 原点：左上角
- Y 轴：向下为正
- 单位：像素

转换公式：
```javascript
scale = targetSize / unitsPerEm
translateX = bbox.x
translateY = bbox.y + bbox.height
transform = `translate(${translateX}, ${translateY}) scale(${scale}, ${-scale})`
```

**关键代码**：
```javascript
const glyph = customFont.charToGlyph(char);
const glyphPath = glyph.getPath(0, 0, unitsPerEm);
const pathData = glyphPath.toPathData(2);
pathElement.setAttribute('d', pathData);
pathElement.setAttribute('transform', newTransform);
```

### Spike 结论

基于 Spike A 的验证结果，我们决定采用**方案 D（字体包方案）**，而不是方案 A（字符转路径）。

**主要原因**：

1. **简化实现**：
   - 方案 D 不需要复杂的位置计算
   - 保持 MathJax 的原始 transform 属性
   - 仅替换 path 数据

2. **更好的可控性**：
   - 可以精确控制哪些字符被替换
   - 可以实现运算符居中、括号处理等特殊逻辑
   - 可以支持 Mathematical Italic Unicode

3. **更好的性能**：
   - 字体包预生成，运行时无需字体解析
   - 字形替换逻辑简单高效

4. **更好的用户体验**：
   - 支持热更新（轮询机制）
   - 字体包生成简单（CLI + Web UI）
   - 无需 Illustrator 兼容性验证

### 验证测试

在实施过程中，我们创建了多个验证测试页面：

1. **gate1-verify.html**：验证字体加载和基本显示
2. **gate2-verify.html**：验证字形替换逻辑
3. **gate3a-verify.html**：验证完整流程（3 个字符）
4. **test-font-replacement-regression.html**：回归测试（4 个质量问题）

所有验证测试均通过，确认方案 D 的可行性和稳定性。

---

## 总结

Phase 3 成功实现了用户自定义字体支持，采用"字体包"方案，具有以下特点：

1. **轻量级**：字体包大小 50-100 KB，相比完整 TTF 文件大幅减小
2. **高性能**：字体包加载 < 200ms，字形替换 < 100ms
3. **可控性强**：完全控制字形替换逻辑，支持特殊处理
4. **用户体验好**：支持热更新，字体包生成简单
5. **跨平台兼容**：纯 JavaScript 实现，无需外部依赖

Phase 3 的架构设计为后续扩展奠定了坚实基础，支持字符集扩展、字体格式扩展和渲染引擎扩展。
