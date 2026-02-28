# MathJax 子集字体使用指南

## 生成的文件

- `latinmodern-math.mathjax-subset.otf` - 精简版 Latin Modern Math 字体
- `unicodes.txt` - 包含的 Unicode 列表
- `report.json` - 详细的字符集报告

## 使用方法

### 1. 在字体编辑器中打开

**FontForge:**
```bash
fontforge latinmodern-math.mathjax-subset.otf
```

**Glyphs (macOS):**
- 双击 `latinmodern-math.mathjax-subset.otf` 打开

### 2. 编辑字形

这个子集字体只包含 MathJax 实际使用的字符，文件更小，编辑更快。

### 3. 导出并使用

编辑完成后，导出为 TTF/OTF 格式，然后使用字体转换工具生成字体包：

```bash
cd ../../font-pack-builder
./转换字体.command
```

## 包含的字符范围

查看 `report.json` 了解详细的字符列表和范围统计。

## 注意事项

1. **MATH 表**: 子集化保留了 MATH 表，确保数学排版正确
2. **Layout 表**: 保留了 GPOS/GSUB/GDEF 表，确保字形定位和替换正常
3. **兼容性**: 子集字体与原始字体完全兼容

## 验证

使用现有的测试页面验证字体是否正常工作：

```bash
cd ../..
npm run dev
```

然后在浏览器中测试公式渲染。
