# 快速开始指南

这是 MathJax 字符集提取 + OTF 子集化工具链的快速开始指南。

## 5 分钟快速上手

### 步骤 1: 下载字体 (2 分钟)

访问 http://www.gust.org.pl/projects/e-foundry/lm-math 下载字体:

```bash
# 下载后，移动到 fonts/ 目录
mv ~/Downloads/latinmodern-math-1959.otf fonts/latinmodern-math.otf

# 验证
file fonts/latinmodern-math.otf
# 应该显示: OpenType font data
```

**遇到问题?** 查看 [DOWNLOAD-FONT.md](./DOWNLOAD-FONT.md)

### 步骤 2: 运行工具链 (1 分钟)

```bash
./run-all.sh
```

这会自动:
- ✅ 提取 MathJax 使用的 Unicode 字符 (1615 个)
- ✅ 生成精简版字体 (减少 70-80% 大小)
- ✅ 生成详细报告和使用指南

### 步骤 3: 验证结果 (1 分钟)

```bash
./verify-subset.sh
```

检查:
- ✅ 文件类型正确
- ✅ 文件大小合理
- ✅ 包含必要的字体表 (MATH, GPOS, GSUB, etc.)
- ✅ 字符数量正确

### 步骤 4: 编辑字体 (根据需要)

```bash
# 使用 FontForge (免费)
fontforge output/latinmodern-math.mathjax-subset.otf

# 或使用 Glyphs (macOS)
open output/latinmodern-math.mathjax-subset.otf
```

### 步骤 5: 生成字体包 (1 分钟)

```bash
cd ../font-pack-builder
./转换字体.command
```

按提示操作:
1. 选择编辑后的字体文件
2. 输入字体包名称
3. 可选字符直接按 Enter 跳过

## 输出文件

```
output/
├── unicodes.txt                          # Unicode 列表 (1615 个字符)
├── report.json                           # 详细统计报告
├── latinmodern-math.mathjax-subset.otf   # 精简版字体 (~100-150KB)
└── USAGE.md                              # 使用指南
```

## 常见问题

### Q: 字体下载失败怎么办?
A: 查看 [DOWNLOAD-FONT.md](./DOWNLOAD-FONT.md)，提供了多种下载方法。

### Q: pyftsubset 未安装?
A: 运行 `pip3 install fonttools`

### Q: 子集化后字体无法使用?
A: 运行 `./verify-subset.sh` 检查问题，确保 MATH 表存在。

### Q: 如何查看提取了哪些字符?
A: 查看 `output/report.json`，包含详细的字符列表和范围统计。

### Q: 可以修改提取的字符范围吗?
A: 可以，编辑 `extract-mathjax-unicodes.cjs` 中的 `UNICODE_RANGES` 和 `addCommonMathCharacters()` 方法。

## 完整文档

- [README.md](./README.md) - 完整使用指南和技术细节
- [DOWNLOAD-FONT.md](./DOWNLOAD-FONT.md) - 字体下载指南
- [output/USAGE.md](./output/USAGE.md) - 子集字体使用指南 (运行后生成)

## 工作流程图

```
1. 下载字体
   ↓
2. 运行 ./run-all.sh
   ├─ 提取 Unicode (extract-mathjax-unicodes.cjs)
   └─ 子集化字体 (subset-otf.py)
   ↓
3. 验证结果 (./verify-subset.sh)
   ↓
4. 编辑字形 (FontForge/Glyphs)
   ↓
5. 生成字体包 (font-pack-builder)
   ↓
6. 测试渲染 (npm run dev)
```

## 需要帮助?

1. 查看 [README.md](./README.md) 的"故障排除"部分
2. 运行 `./verify-subset.sh` 诊断问题
3. 查看 `output/report.json` 了解提取的字符详情

## 下一步

完成字体编辑后:
1. 使用 font-pack-builder 生成字体包
2. 在浏览器中测试公式渲染
3. 验证字体替换是否正常工作

祝编辑愉快! 🎨
