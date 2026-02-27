# Font Pack Builder

独立字体转换工具，将用户的 TTF/OTF 字体转换为 MathJax 兼容的字体包。

## 功能概述

Font Pack Builder 是一个强大的字体转换工具，用于：
- 解析 TTF/OTF 字体文件
- 提取字母数字字符和扩展数学符号的 glyph 数据
- 支持四套可配置的字符集（base, extended-math-default, extended-math-optional, extended-math-advanced）
- 智能检测字体能力（OpenType MATH 表、L1/L2/L3 覆盖率）
- 应用 keepOriginalAdvance 策略和 path centering 优化
- 处理同形异码字符（homoglyphs）的自动覆盖
- 生成 MathJax 兼容的 fontdata.js
- 生成详细的构建报告和元数据
- 提供失败回退机制，确保字体包完整性

## 架构设计

采用独立工具架构和 Capability-Gated 策略：
- **独立工具**：Font Pack Builder（本工具）
- **主工具**：Web Demo / CEP 扩展（加载和应用字体包）
- **分离原因**：字体转换是一次性操作，不应集成到主渲染工具中
- **Capability-Gated 策略**：只替换 glyph path（L1/L2/L3），保留 MathJax 原生排版规则（variants/assembly）

## 安装

```bash
cd tools/font-pack-builder
npm install
```

## 使用方法

### 🎯 推荐方式：双击运行脚本（无需命令行）

这是最简单的使用方式，适合不熟悉命令行的用户：

#### macOS 用户

1. 双击运行 `转换字体.command` 文件
2. 将您的字体文件拖拽到终端窗口
3. 按提示输入字体包名称（或直接回车使用默认名称）
4. 等待转换完成

**首次运行提示**：如果 macOS 提示"无法验证开发者"，请右键点击文件 → 选择"打开" → 在对话框中点击"打开"。

#### Linux 用户

1. 双击运行 `convert-font.sh` 脚本
2. 将您的字体文件拖拽到终端窗口
3. 按提示输入字体包名称（或直接回车使用默认名称）
4. 等待转换完成

#### Windows 用户

1. 双击运行 `convert-font.bat` 脚本
2. 将您的字体文件拖拽到命令行窗口
3. 按提示输入字体包名称（或直接回车使用默认名称）
4. 等待转换完成

**输出位置**：字体包会自动保存到 `public/fonts/user-font-pack/` 目录，可以直接在主工具中使用。

---

### 🔧 高级用法：命令行方式

如果您熟悉命令行，可以使用以下方式获得更多控制：

#### 基本用法

```bash
node build.js -i <font.ttf> -o <output-dir> -n <font-name>
```

#### 参数说明

- `-i, --input <path>`: 输入字体文件路径（TTF/OTF）
- `-o, --output <path>`: 输出目录路径
- `-n, --name <name>`: 字体包名称
- `-b, --base-fontdata <path>`: MathJax 基础 fontdata 模板路径（可选）
- `--enable-optional`: 启用 extended-math-optional 字符集（默认关闭）
- `--enable-advanced`: 启用 extended-math-advanced 字符集（需要字体支持 MATH 表，默认关闭）
- `--enable-text-symbols`: 启用 extended-text-symbols 字符集（默认关闭）
- `--base-only`: 仅使用 base 字符集，禁用所有扩展（向后兼容模式）
- `--enable-path-centering`: 启用运算符 path 居中修正（默认关闭）

#### 示例

```bash
# 基本用法（base + extended-math-default，推荐）
node build.js -i ~/fonts/MyFont.ttf -o ./output/my-font -n "MyFont"

# 向后兼容模式（仅 base 字符集）
node build.js -i ~/fonts/MyFont.ttf -o ./output/my-font -n "MyFont" --base-only

# 启用可选字符集（包含次常用数学符号）
node build.js -i ~/fonts/MyFont.ttf -o ./output/my-font -n "MyFont" --enable-optional

# 启用高级字符集（需要字体支持 MATH 表）
node build.js -i ~/fonts/MyFont.ttf -o ./output/my-font -n "MyFont" --enable-advanced

# 启用文本符号字符集（全角符号等）
node build.js -i ~/fonts/MyFont.ttf -o ./output/my-font -n "MyFont" --enable-text-symbols

# 启用 path 居中修正（如果运算符偏移）
node build.js -i ~/fonts/MyFont.ttf -o ./output/my-font -n "MyFont" --enable-path-centering

# 完整选项（所有扩展 + path centering）
node build.js -i ~/fonts/MyFont.ttf -o ./output/my-font -n "MyFont" \
  --enable-optional --enable-advanced --enable-text-symbols --enable-path-centering

# 转换到默认用户字体包目录
node build.js -i ~/fonts/MyFont.ttf -o ../../public/fonts/user-font-pack -n "MyFont"
```

## 输出格式

### 目录结构

```
output-dir/
├── fontdata.js              # MathJax fontdata（ES6 模块）
├── manifest.json            # 字体包元数据（包含 buildId 和 sourceFontHash）
├── report.json              # 详细构建报告
├── capabilities.json        # 字体能力检测报告
└── replacement-report.json  # 分层替换统计报告
```

### fontdata.js

ES6 模块格式的 MathJax fontdata：

```javascript
export const fontdata = {
  "65": {  // 'A' 的 Unicode codepoint
    "c": 65,
    "w": 722,    // advance width
    "h": 716,    // height
    "d": 0,      // depth
    "ic": 0,     // italic correction
    "sk": 0,     // skew
    "path": "M ..."  // SVG path
  },
  // ... 更多字符
};
```

### manifest.json

字体包元数据（包含构建追溯信息）：

```json
{
  "name": "MyFont",
  "version": "1.0.0",
  "buildId": "2f82a2118f731c5c",
  "sourceFontHash": "6075562b771f8b82f0c179e363389684f2dd09de30038269e2628e504bd7be0f",
  "family": "My Font Family",
  "format": "ttf",
  "coverage": {
    "uppercase": "ABCDEFGHIJKLMNOPQRSTUVWXYZ",
    "lowercase": "abcdefghijklmnopqrstuvwxyz",
    "digits": "0123456789"
  },
  "charsets": {
    "base": true,
    "extendedMathDefault": true,
    "extendedMathOptional": false,
    "extendedMathAdvanced": false,
    "extendedTextSymbols": false
  },
  "failures": [],
  "fallbacks": [],
  "createdAt": "2026-02-10T00:00:00.000Z",
  "fontdataFile": "fontdata.js"
}
```

### report.json

详细的构建报告（包含统计信息和 glyph 详情）：

```json
{
  "buildId": "2f82a2118f731c5c",
  "sourceFontHash": "6075562b771f8b82...",
  "createdAt": "2026-02-10T00:00:00.000Z",
  "fontName": "MyFont",
  "statistics": {
    "total": 158,
    "successful": 158,
    "failed": 0,
    "fallback": 0,
    "l3Skipped": 0
  },
  "byCategory": {
    "operators": { "total": 11, "successful": 11 },
    "letters": { "total": 52, "successful": 52 }
  },
  "glyphs": [
    {
      "char": "+",
      "codepoint": "U+002B",
      "category": "operators",
      "keepOriginalAdvance": true,
      "pathCentering": true,
      "pathCenteringDx": 15.5,
      "source": "user-font"
    }
  ],
  "failures": [],
  "fallbacks": [],
  "advancedCharsetStatus": {
    "available": true,
    "reason": "Font has MATH table and sufficient L3 coverage"
  }
}
```

### capabilities.json

字体能力检测报告：

```json
{
  "hasMATH": true,
  "mathVersion": "1.0",
  "l1Coverage": { "total": 71, "available": 71, "coverage": "100.0%" },
  "l2Coverage": { "total": 13, "available": 11, "coverage": "84.6%" },
  "l3Coverage": {
    "byCategory": {
      "brackets": { "total": 10, "available": 10, "coverage": "100.0%" },
      "radicals": { "total": 1, "available": 1, "coverage": "100.0%" },
      "integrals": { "total": 6, "available": 6, "coverage": "100.0%" }
    },
    "overall": { "total": 30, "available": 30, "coverage": "100.0%" }
  },
  "l3ReplacementAllowed": true,
  "l3ReplacementReason": "Font has MATH table and sufficient L3 coverage"
}
```

### replacement-report.json

分层替换统计报告：

```json
{
  "summary": {
    "l1": { "total": 71, "replaced": 71, "coverage": "100.0%" },
    "l2": { "total": 13, "replaced": 11, "coverage": "84.6%" },
    "l3": { "total": 30, "replaced": 12, "coverage": "40.0%" }
  },
  "risks": [
    "ℹ️ L3 replacement enabled. Ensure font has proper MATH table support."
  ],
  "recommendations": [
    "✓ Font has excellent L1 coverage (100.0%)",
    "✓ Font has good L2 coverage (84.6%)"
  ]
}
```

## 字符集策略

### 默认行为

**默认启用**：base + extended-math-default（共 84 个字符）

这是推荐的默认配置，适合大多数使用场景。

### 字符集详解

#### 1. Base 字符集（62 个，始终启用）

- **大写字母**：A-Z（26 个）
- **小写字母**：a-z（26 个）
- **数字**：0-9（10 个）

#### 2. Extended-Math-Default 字符集（22 个，默认启用）

- **基础运算符**：+ - = × · ÷ < > ≤ ≥ −（11 个）
  - 注意：包含 U+002D (HYPHEN-MINUS '-') 和 U+2212 (MINUS SIGN '−')
  - 采用 **keepOriginalAdvance 策略**（仅替换 path，保持 MathJax 原 advance width）
- **基础定界符**：| /（2 个）
- **基础标点**：. , : ; ' ! % " ?（9 个）

#### 3. Extended-Math-Optional 字符集（11 个，默认关闭）

使用 `--enable-optional` 启用

- **括号类**：( ) [ ] { }（6 个）
  - 默认不替换，避免影响上标距离
- **特殊符号**：* ~ → ← –（5 个）
  - 包含 U+2013 (EN DASH '–')

#### 4. Extended-Math-Advanced 字符集（30 个，默认关闭）

使用 `--enable-advanced` 启用（需要字体支持 OpenType MATH 表）

- **伸缩括号**：( ) [ ] { } ⟨ ⟩ ⌈ ⌉ ⌊ ⌋（12 个）
- **根号**：√（1 个）
- **积分符号**：∫ ∬ ∭ ∮ ∯ ∰（6 个）
- **求和/乘积**：∑ ∏ ∐ ⋃ ⋂ ⋀ ⋁（7 个）
- **长箭头**：← → ↔ ⇐ ⇒ ⇔（6 个）

**启用条件**：
- 字体必须包含 OpenType MATH 表
- L3 目标符号覆盖率充足
- 工具会自动检测，不满足条件时会警告并跳过

#### 5. Extended-Text-Symbols 字符集（默认关闭）

使用 `--enable-text-symbols` 启用

- **全角符号**：全角字母、数字、标点等
- **特殊文本符号**：其他文本相关符号

### 向后兼容模式

使用 `--base-only` 参数可以禁用所有扩展字符集，仅使用 base 字符集（62 个字符）。这与旧版本的行为完全一致。

```bash
node build.js -i font.ttf -o output -n "MyFont" --base-only
```

## 同形异码字符处理

工具会自动处理同形异码字符（homoglyphs），确保视觉相同的字符使用一致的 glyph：

### Homoglyph 组

1. **Minus 组**：
   - U+002D (HYPHEN-MINUS '-')
   - U+2212 (MINUS SIGN '−')
   - 优先使用 U+2212，失败时回退到 U+002D

2. **Slash 组**：
   - U+002F (SOLIDUS '/')
   - U+2215 (DIVISION SLASH '∕')
   - 优先使用 U+002F

3. **Vertical Line 组**：
   - U+007C (VERTICAL LINE '|')
   - U+2223 (DIVIDES '∣')
   - 优先使用 U+007C

4. **Not Sign 组**：
   - U+00AC (NOT SIGN '¬')
   - U+2310 (REVERSED NOT SIGN '⌐')
   - 优先使用 U+00AC

### Normalized Mappings

全角字符自动映射到对应的 ASCII 字符：
- 全角字母 → ASCII 字母
- 全角数字 → ASCII 数字
- 全角标点 → ASCII 标点

## KeepOriginalAdvance 策略

对于运算符（+ - = × · ÷ < > ≤ ≥ −），工具采用 **keepOriginalAdvance 策略**：

- **替换内容**：仅替换 glyph path（字形轮廓）
- **保持不变**：使用 MathJax 原 advance width（字符宽度）
- **目的**：确保运算符间距和上标位置与 MathJax 默认行为一致

## Path Centering 优化

使用 `--enable-path-centering` 可以启用 path 居中修正：

- **检测**：计算 glyph bbox 中心与 advance width 中心的偏移
- **修正**：当偏移超过阈值（10 units）时，平移 path 使其居中
- **适用场景**：某些字体的运算符 path 偏左或偏右时
- **记录**：修正的偏移量会记录在 report.json 的 pathCenteringDx 字段

## 字体能力检测

工具会自动检测字体的能力，生成 capabilities.json 报告：

### 检测项目

1. **OpenType MATH 表**：检测字体是否包含 MATH 表及其版本
2. **L1 覆盖率**：基础字符（字母、数字、基础运算符）
3. **L2 覆盖率**：扩展数学符号
4. **L3 覆盖率**：可伸缩符号（括号、根号、积分、求和等）

### L3 替换决策

工具使用 **Capability-Gated 策略** 决定是否替换 L3 符号：

- **允许替换**：字体有 MATH 表 且 L3 覆盖率充足
- **跳过替换**：字体无 MATH 表 或 L3 覆盖率不足
- **自动回退**：跳过的 L3 符号保持使用 MathJax 默认字体

这确保了即使字体不支持高级特性，基础功能仍然正常工作。

### 单 Glyph 失败回退

当某个字符的 glyph 提取失败时：
1. **尝试回退**：从 MathJax base fontdata 获取该字符的 glyph
2. **记录回退**：成功回退时记录到 manifest.json 和 report.json 的 `fallbacks` 数组
3. **记录失败**：base 也缺失时记录到 `failures` 数组
4. **继续构建**：构建过程继续，不会中断
5. **确保完整性**：最终生成的 fontdata 不会产生缺字

### 失败原因

常见失败原因：
- 字体文件中缺少该字符的 glyph
- Glyph path 提取失败
- Metrics 数据异常

### 示例输出

```
⚠️  回退 2 个字符到 MathJax base fontdata:
  - '×' (operator): 用户字体中不存在该字符
  - '÷' (operator): 无法提取 glyph path

✓ 所有字符都有可用的 glyph（用户字体 + 回退）
```

## 故障排除

### 问题：字体文件无法加载

**症状**：
```
❌ 构建失败:
输入字体文件不存在: /path/to/font.ttf
```

**解决方案**：
- 检查文件路径是否正确
- 确认文件格式为 .ttf 或 .otf

### 问题：大量字符提取失败

**症状**：
```
⚠️  失败 50 个字符
```

**可能原因**：
- 字体文件损坏或不完整
- 字体格式不标准
- 字体缺少必要的字形表（glyf 或 CFF）

**解决方案**：
- 使用字体编辑工具（如 FontForge）检查字体文件
- 尝试重新导出字体文件
- 使用其他字体文件

### 问题：Metrics 异常

**症状**：
- 生成的 SVG 中字符位置不正确
- 字符宽度或高度异常

**解决方案**：
- 检查字体的 metrics 数据（使用 FontForge 等工具）
- 调整 metrics 归一化参数（需要修改代码）

## 技术细节

### 依赖库

- **opentype.js**: 字体文件解析
- **commander**: 命令行参数解析
- **chalk**: 终端输出美化
- **crypto**: SHA-256 hash 计算（buildId 和 sourceFontHash）

### 核心模块

- `FontParser`: 字体文件解析器
- `CharsetManager`: 字符集配置管理器
- `FontCapabilityDetector`: 字体能力检测器（MATH 表、L1/L2/L3 覆盖率）
- `GlyphExtractor`: Glyph 数据提取器（支持 Capability-Gated 提取）
- `PathProcessor`: SVG path 处理器（归一化、居中修正）
- `FontdataGenerator`: MathJax fontdata 生成器
- `ReportGenerator`: 构建报告生成器（manifest.json、report.json）
- `ReplacementReporter`: 分层替换统计报告生成器

### 坐标系归一化

MathJax 使用 1000 单位的归一化坐标系：
- 所有 metrics 归一化到 1000 单位
- SVG path 坐标归一化到 1000 单位
- 保持字符比例和基线对齐
- 所有归一化在 merge 前完成，确保一致性

## 开发与测试

### 运行测试

```bash
npm test
```

### 测试覆盖率

```bash
npm run test:coverage
```

### Lint 检查

```bash
npm run lint
```

## 已知限制

1. **仅支持 TTF/OTF 格式**：不支持 WOFF、WOFF2 等 Web 字体格式
2. **Variants/Assembly 不完全支持**：使用 Capability-Gated 策略，只替换 glyph path，保留 MathJax 排版规则
3. **单字体处理**：每次只能处理一个字体文件
4. **L3 符号依赖 MATH 表**：高级字符集需要字体包含 OpenType MATH 表

## 未来增强

- 支持批量处理多个字体文件
- 支持自定义字符集配置
- 提供 GUI 界面
- 支持更多字体格式（WOFF, WOFF2）
- 自动 metrics 调整和优化

## 相关文档

- [Phase 3 验收文档](PHASE3-ACCEPTANCE.md)
- [Phase 4 验收文档](PHASE4-ACCEPTANCE.md)
- [使用说明（中文）](使用说明.md)
- [Phase 3 架构更新](../../PHASE3-ARCHITECTURE-UPDATE.md)

## 许可证

与主项目相同
