# MathJax 字符集提取 + OTF 子集化工具链

这个工具链用于生成可编辑的精简版 Latin Modern Math 字体，只包含 MathJax 实际使用的字符。

## 功能

1. **Unicode 提取** (`extract-mathjax-unicodes.cjs`)
   - 扫描 MathJax 库，提取所有被引用的 Unicode codepoints
   - 输出 `unicodes.txt` (pyftsubset 格式) 和 `report.json` (详细报告)

2. **字体子集化** (`subset-otf.py`)
   - 使用 pyftsubset 对 Latin Modern Math 字体进行子集化
   - 保留 MATH 表和必要的 layout 表 (GPOS/GSUB/GDEF)
   - 输出精简版 OTF 字体文件

## 前置要求

### Node.js
确保已安装 Node.js (项目已有)

### Python 3 + fonttools
```bash
# macOS/Linux
pip3 install fonttools

# 或使用 pip
pip install fonttools
```

验证安装:
```bash
pyftsubset --help
```

### Latin Modern Math 字体

**重要**: 由于网络限制，自动下载可能失败。请参考 [DOWNLOAD-FONT.md](./DOWNLOAD-FONT.md) 获取详细的下载指南。

快速下载步骤:

1. 访问 GUST 字体项目: http://www.gust.org.pl/projects/e-foundry/lm-math
2. 下载 `latinmodern-math-1959.zip`
3. 解压并重命名为 `latinmodern-math.otf`
4. 移动到 `fonts/` 目录:
   ```bash
   mkdir -p fonts
   mv ~/Downloads/latinmodern-math-1959.otf fonts/latinmodern-math.otf
   ```

验证下载:
```bash
# 应该显示 "OpenType font data" 和约 450-550KB
file fonts/latinmodern-math.otf
ls -lh fonts/latinmodern-math.otf
```

## 使用方法

### 方法 1: 使用便捷脚本 (推荐)

```bash
# 一键执行完整流程
./run-all.sh
```

这会自动执行:
1. Unicode 提取
2. 字体子集化
3. 生成报告和使用指南

### 方法 2: 分步执行

#### 步骤 1: 提取 Unicode 字符集

```bash
node extract-mathjax-unicodes.cjs
```

输出:
- `output/unicodes.txt` - Unicode 列表 (逗号分隔)
- `output/report.json` - 详细报告

#### 步骤 2: 字体子集化

```bash
python3 subset-otf.py
```

输出:
- `output/latinmodern-math.mathjax-subset.otf` - 精简版字体
- `output/USAGE.md` - 使用指南

## 输出文件说明

### `output/unicodes.txt`
pyftsubset 格式的 Unicode 列表:
```
U+0030,U+0031,U+0032,...
```

### `output/report.json`
详细的字符集报告:
```json
{
  "totalCount": 200,
  "ranges": {
    "Basic Latin Digits": { "count": 10, ... },
    "Mathematical Italic": { "count": 52, ... }
  },
  "keySymbols": {
    "U+2212": { "name": "MINUS SIGN", "covered": true }
  },
  "sources": {
    "svg": 150,
    "chtml": 120,
    "tex": 180
  }
}
```

### `output/latinmodern-math.mathjax-subset.otf`
精简版字体文件，特点:
- 只包含 MathJax 使用的字符
- 保留 MATH 表 (数学排版)
- 保留 layout 表 (字形定位和替换)
- 文件大小显著减小 (约 70-80% 减少)

## 编辑字体

### 使用 FontForge (免费)

```bash
# 安装 FontForge (macOS)
brew install fontforge

# 打开字体
fontforge output/latinmodern-math.mathjax-subset.otf
```

### 使用 Glyphs (macOS, 商业软件)

双击 `output/latinmodern-math.mathjax-subset.otf` 在 Glyphs 中打开

### 使用 FontLab (商业软件)

文件 → 打开 → 选择 `output/latinmodern-math.mathjax-subset.otf`

## 编辑后的工作流程

1. **编辑字形**: 在字体编辑器中修改需要的字形
2. **导出字体**: 导出为 TTF 或 OTF 格式
3. **生成字体包**: 使用字体转换工具生成字体包
   ```bash
   cd ../font-pack-builder
   ./转换字体.command
   ```
4. **测试**: 在浏览器中测试公式渲染

## 验证

### 检查字体表

```bash
# 列出字体包含的表
ttx -l output/latinmodern-math.mathjax-subset.otf
```

应该包含:
- ✅ MATH - 数学排版表
- ✅ GPOS - 字形定位
- ✅ GSUB - 字形替换
- ✅ GDEF - 字形定义
- ✅ cmap - 字符映射
- ✅ name - 字体名称

### 测试渲染

```bash
cd ../..
npm run dev
```

在浏览器中打开测试页面，验证字体是否正常工作。

## 故障排除

### pyftsubset 未找到

```bash
# 安装 fonttools
pip3 install fonttools

# 验证
pyftsubset --help
```

### 字体文件不存在

确保 `fonts/latinmodern-math.otf` 存在:
```bash
ls -lh fonts/latinmodern-math.otf
```

如果不存在，参考"前置要求"部分下载。

### Unicode 文件不存在

先运行提取脚本:
```bash
node extract-mathjax-unicodes.cjs
```

### 子集化后字体无法使用

检查是否保留了 MATH 表:
```bash
ttx -l output/latinmodern-math.mathjax-subset.otf | grep MATH
```

如果缺失，可能是 pyftsubset 版本问题，尝试更新:
```bash
pip3 install --upgrade fonttools
```

## 技术细节

### Unicode 提取策略

1. **扫描 MathJax 源码**
   - SVG 输出模块
   - CHTML 输出模块
   - TeX 输入模块

2. **模式匹配**
   - `U+XXXX` 格式
   - `\uXXXX` 格式
   - `0xXXXX` 格式
   - HTML entities (`&#xXXXX;`, `&#DDDD;`)
   - 实际 Unicode 字符

3. **补充常用字符**
   - 基本 ASCII (0-9, A-Z, a-z)
   - Mathematical Italic (U+1D434-U+1D467)
   - 数学运算符 (U+2212, U+00D7, etc.)
   - 希腊字母 (U+0391-U+03C9)

### 子集化参数

```bash
pyftsubset \
  --layout-features=*      # 保留所有 layout features
  --glyph-names            # 保留 glyph 名称
  --symbol-cmap            # 保留 symbol cmap
  --legacy-cmap            # 保留 legacy cmap
  --notdef-glyph           # 保留 .notdef
  --recommended-glyphs     # 保留推荐 glyphs
  --name-IDs=*             # 保留所有 name IDs
  --hinting                # 保留 hinting
  --no-desubroutinize      # 不优化 CFF
```

## 许可证

- **工具链**: MIT License
- **Latin Modern Math 字体**: GUST Font License (可自由使用和修改)

## 相关文档

- [MATHJAX-REFERENCE-FONTS.md](../../MATHJAX-REFERENCE-FONTS.md) - MathJax 参考字体信息
- [Font Pack Builder](../font-pack-builder/README.md) - 字体包生成工具
- [Phase 3 Architecture](../../PHASE3-ARCHITECTURE-UPDATE.md) - 字体替换架构

## 支持

如有问题，请查看:
1. 本 README 的"故障排除"部分
2. `output/report.json` 中的详细信息
3. `output/USAGE.md` 中的使用指南
