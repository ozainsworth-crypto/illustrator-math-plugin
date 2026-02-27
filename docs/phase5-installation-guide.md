# Math Formula Plugin - 安装指南（测试版本）

**版本**: 1.0.0-beta  
**更新日期**: 2026-02-26  
**适用于**: Adobe Illustrator 2023-2026

---

## 系统要求

### 支持的 Illustrator 版本
- Adobe Illustrator 2026 (v30.x) ✅ 已验证
- Adobe Illustrator 2024 (v28.x) ⏳ 待验证
- Adobe Illustrator 2023 (v27.x) ⏳ 待验证

### 支持的操作系统
- **macOS**: 12.0 (Monterey) 或更高版本
  - Intel Mac (x64)
  - Apple Silicon (arm64) ✅ 已验证
- **Windows**: 10 或更高版本
  - x64 架构

### 其他要求
- CEP 版本：CEP 6.0 或更高版本（Illustrator 自带）
- 磁盘空间：约 50 MB
- 内存：建议 4 GB 或更多

---

## 安装步骤

### 方法 1：.zxp 安装包安装（推荐）

**适用场景**：测试用户、最终用户

**步骤**：

1. **下载 .zxp 文件**

   从发布页面下载 `MathFormulaPlugin-v1.0.0-beta.zxp`

2. **安装 ZXP 安装器**

   下载并安装以下工具之一：
   - [Anastasiy's Extension Manager](https://install.anastasiy.com/)（推荐）
   - [ZXPInstaller](https://zxpinstaller.com/)

3. **安装扩展**

   - 打开 Extension Manager 或 ZXPInstaller
   - 拖拽 `MathFormulaPlugin-v1.0.0-beta.zxp` 到窗口中
   - 按照提示完成安装

4. **重启 Illustrator**

   完全退出 Illustrator，然后重新启动。

5. **验证安装**

   在 Illustrator 中，选择菜单：
   ```
   窗口 > 扩展 > 数学公式生成器
   ```

   如果看到扩展面板，说明安装成功！

### 方法 2：开发者安装（仅供开发测试）

**适用场景**：开发者、内部测试

**步骤**：

1. **启用 CEP 调试模式**

   在终端中运行：
   ```bash
   cd math-formula-plugin
   ./scripts/enable-cep-debug.sh
   ```

2. **构建生产版本**

   ```bash
   npm install
   npm run build:cep-prod
   ```

3. **创建符号链接**

   **macOS**:
   ```bash
   ln -s "$(pwd)/extension" ~/Library/Application\ Support/Adobe/CEP/extensions/MathFormulaPlugin
   ```

   **Windows**:
   ```cmd
   mklink /D "%APPDATA%\Adobe\CEP\extensions\MathFormulaPlugin" "C:\path\to\math-formula-plugin\extension"
   ```

4. **重启 Illustrator**

---

## 首次使用

### 1. 打开扩展面板

在 Illustrator 中，选择菜单：
```
窗口 > 扩展 > 数学公式生成器
```

扩展面板将在右侧打开。

### 2. 创建或打开文档

在使用插入功能前，请确保：
- 已创建新文档，或
- 已打开现有文档

### 3. 输入第一个公式

在输入框中输入 LaTeX 公式，例如：
```latex
\frac{a}{b}
```

预览区将实时显示渲染结果。

### 4. 插入到 Illustrator

点击"插入到 Illustrator"按钮，公式将作为矢量图形插入到当前文档中。

---

## 快速故障排除

### 扩展在菜单中找不到？

1. 确认 Illustrator 版本在支持范围内（2023-2026）
2. 重启 Illustrator
3. 检查 CEP 扩展目录：
   - macOS: `~/Library/Application Support/Adobe/CEP/extensions/`
   - Windows: `%APPDATA%\Adobe\CEP\extensions\`

### 面板打开后是空白的？

1. 完全退出 Illustrator 并重新启动
2. 检查 CEP 日志：
   - macOS: `~/Library/Logs/CSXS/`
   - Windows: `%APPDATA%\Adobe\CEP\logs\`
3. 尝试重新安装扩展

### 插入功能不工作？

1. 确认已打开或创建 Illustrator 文档
2. 查看插件面板中的"调试日志"标签页
3. 尝试手动导出 SVG 并在 Illustrator 中打开

---

## 获取帮助

如果遇到问题，请参考：
- **使用指南**: `docs/phase5-usage-guide.md`
- **已知限制**: `docs/phase5-known-limitations.md`
- **反馈方式**: `docs/phase5-feedback-guide.md`

---

**最后更新**: 2026-02-26  
**版本**: 1.0.0-beta
