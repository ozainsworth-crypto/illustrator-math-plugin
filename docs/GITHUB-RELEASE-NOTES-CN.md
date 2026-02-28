# GitHub Release 发布说明 - v1.0.0-beta

**用于创建 GitHub Release 的中文发布说明**

---

## Release 标题
Math Formula Plugin v1.0.0-beta - Phase 5 测试版本

## 标签
v1.0.0-beta

## 发布说明

### 🎉 Adobe Illustrator 数学公式插件 - Beta 测试版

一款强大的 CEP 扩展，为 Adobe Illustrator 带来数学公式支持，包含 LaTeX 输入、PowerPoint 集成和自定义字体支持。

---

### ✨ 核心功能

- **LaTeX 输入**：直接输入 LaTeX 公式，实时预览
- **PowerPoint 集成**：直接从 Microsoft PowerPoint 粘贴公式  
- **自定义字体支持**：使用您自己的 OpenType Math 字体，自动字形替换
- **歧义解析**：智能处理数学符号歧义（分数、指数）
- **格式检测**：自动检测 LaTeX、UnicodeMath 和 PowerPoint 格式
- **离线运行**：初始设置后完全离线工作

---

### 📦 安装方法

#### 快速安装（推荐）
1. 下载下方的 `MathFormulaPlugin-v1.0.0-beta.zxp`
2. 使用 [Anastasiy's Extension Manager](https://install.anastasiy.com/) 或 [ZXPInstaller](https://aescripts.com/learn/zxp-installer/) 安装
3. 重启 Adobe Illustrator
4. 通过 **窗口 > 扩展 > Math Formula Plugin** 访问

#### 详细安装说明
查看 `INSTALLATION.txt`（包含在发布资源中）获取完整安装说明，包括手动安装和故障排除。

---

### 🔧 系统要求

- **Adobe Illustrator**：2023 或更高版本（v27.x - v30.x）
- **操作系统**：macOS 12+ 或 Windows 10/11
- **CEP 版本**：9.0 或更高版本

---

### 📖 文档

完整文档可在仓库中查看：
- [安装指南](https://github.com/ozainsworth-crypto/illustrator-math-plugin/blob/main/docs/phase5-installation-guide.md)
- [使用指南](https://github.com/ozainsworth-crypto/illustrator-math-plugin/blob/main/docs/phase5-usage-guide.md)
- [已知限制](https://github.com/ozainsworth-crypto/illustrator-math-plugin/blob/main/docs/phase5-known-limitations.md)
- [反馈指南](https://github.com/ozainsworth-crypto/illustrator-math-plugin/blob/main/docs/phase5-feedback-guide.md)

---

### ⚠️ 已知限制（Beta 版本）

这是一个 beta 测试版本。已知限制包括：

1. **字体支持**：仅支持包含 MATH 表的 OpenType 字体
2. **LaTeX 子集**：支持常用数学符号（不支持所有 LaTeX 宏）
3. **性能**：首次加载 MathJax 需要 2-3 秒
4. **CEP Shell**：外部脚本执行功能已禁用（将在 Phase 6 修复）
5. **键盘快捷键**：尚未实现（计划在 Phase 6 实现）

查看[已知限制](https://github.com/ozainsworth-crypto/illustrator-math-plugin/blob/main/docs/phase5-known-limitations.md)获取完整详情。

---

### 🐛 问题反馈

请通过以下方式报告错误和反馈：
- **GitHub Issues**：[创建 Issue](https://github.com/ozainsworth-crypto/illustrator-math-plugin/issues)
- **反馈指南**：查看 [docs/phase5-feedback-guide.md](https://github.com/ozainsworth-crypto/illustrator-math-plugin/blob/main/docs/phase5-feedback-guide.md)

报告问题时，请包含：
- Adobe Illustrator 版本
- 操作系统版本
- 重现步骤
- 错误消息（如有）

---

### 🚀 下一步计划（Phase 6）

下一版本计划改进：
- 稳定性增强
- 性能优化
- CEP Shell 执行修复
- 键盘快捷键实现
- 扩展文档

---

### 📊 测试状态

**Phase 5 验收**：✅ 所有标准已满足
- ✅ 可安装的 ZXP 包（已签名并验证）
- ✅ 最小文档完成
- ✅ 核心功能正常工作
- ✅ 回归测试通过

---

### 🙏 致谢

- [MathJax](https://www.mathjax.org/) 提供数学渲染
- [Plurimath](https://github.com/plurimath/plurimath) 提供格式转换
- Adobe CEP 提供扩展框架

---

### 📝 发布资源

本次发布包含：
- `MathFormulaPlugin-v1.0.0-beta.zxp` - 可安装的 CEP 扩展（6.2 MB）
- `font-pack-builder-v1.0.0-beta.zip` - 独立字体包构建工具（1.0 MB）
- `INSTALLATION.txt` - 完整安装说明
- 源代码（zip/tar.gz）- 本次发布的完整源代码

#### 各包内容说明

**MathFormulaPlugin-v1.0.0-beta.zxp**：
- Adobe Illustrator 的 CEP 扩展
- 预构建的默认字体包
- 安装后即可使用

**font-pack-builder-v1.0.0-beta.zip**：
- 独立的字体转换工具
- 易用的 Web UI 界面
- 自动化命令行工具
- 完整文档
- 使用此工具从您自己的 OpenType Math 字体创建自定义字体包

---

### 🎯 使用场景

#### 基础用户（使用默认字体）
1. 下载并安装 `MathFormulaPlugin-v1.0.0-beta.zxp`
2. 在 Illustrator 中打开插件
3. 输入 LaTeX 公式或从 PowerPoint 粘贴
4. 插入到画板

#### 高级用户（自定义字体）
1. 下载 `MathFormulaPlugin-v1.0.0-beta.zxp` 和 `font-pack-builder-v1.0.0-beta.zip`
2. 安装 CEP 扩展
3. 解压字体构建工具，运行 Web UI：
   ```bash
   cd font-pack-builder/web-ui
   npm install
   npm start
   ```
4. 在 http://localhost:3000 转换您的字体
5. 将生成的字体包复制到 CEP 扩展的 fonts 文件夹

---

### 📂 字体包构建工具使用

**font-pack-builder** 工具包含：
- **CLI 工具**：命令行批量转换
- **Web UI**：图形界面，易于使用
- **完整文档**：详细的使用说明
- **示例字体**：Latin Modern Math 示例

**支持的字体**：
- Latin Modern Math
- STIX Two Math
- Cambria Math
- Asana Math
- 任何包含 MATH 表的 OpenType 字体

**输出内容**：
- `fontdata.js` - MathJax 字体度量数据
- `manifest.json` - 字体元数据
- `capabilities.json` - 字体能力信息
- `report.json` - 构建报告
- `replacement-report.json` - 字形替换信息

---

### 💡 快速开始

#### 使用插件
1. 打开 Adobe Illustrator
2. 窗口 > 扩展 > Math Formula Plugin
3. 输入公式：`\frac{a}{b}` 或 `x^2 + y^2 = r^2`
4. 点击"插入到 Illustrator"

#### 构建自定义字体包
1. 解压 `font-pack-builder-v1.0.0-beta.zip`
2. 进入 `font-pack-builder/web-ui`
3. 运行 `npm install && npm start`
4. 在浏览器中打开 http://localhost:3000
5. 上传您的 .otf/.ttf 字体文件
6. 点击"开始转换"
7. 下载生成的字体包

---

### 🔗 相关链接

- **项目主页**：https://github.com/ozainsworth-crypto/illustrator-math-plugin
- **问题反馈**：https://github.com/ozainsworth-crypto/illustrator-math-plugin/issues
- **文档**：查看仓库中的 `docs/` 文件夹

---

**为数学排版社区用心打造** ❤️

