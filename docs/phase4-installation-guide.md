# Math Formula Plugin - 安装与使用指南

**版本**: 1.0.0-dev  
**更新日期**: 2026-02-24  
**适用于**: Adobe Illustrator 2023-2026

---

## 目录

1. [系统要求](#系统要求)
2. [安装方法](#安装方法)
3. [首次使用](#首次使用)
4. [基本操作](#基本操作)
5. [自定义字体配置](#自定义字体配置)
6. [常见问题解答](#常见问题解答)
7. [故障排除](#故障排除)

---

## 系统要求

### 支持的 Illustrator 版本
- Adobe Illustrator 2026 (v30.x) ✅ 已验证
- Adobe Illustrator 2024 (v28.x) ⏳ 待验证
- Adobe Illustrator 2023 (v27.x) ⏳ 待验证

### 支持的操作系统
- macOS 12.0 (Monterey) 或更高版本
  - Intel Mac (x64)
  - Apple Silicon (arm64) ✅ 已验证
- Windows 10 或更高版本
  - x64 架构

### 其他要求
- CEP 版本：CEP 6.0 或更高版本（Illustrator 自带）
- 磁盘空间：约 50 MB（包含 MathJax 库）
- 内存：建议 4 GB 或更多

---

## 安装方法

### 方法 1：开发者安装（推荐用于测试）

**适用场景**：开发测试、本地调试

**步骤**：

1. **启用 CEP 调试模式**

   在终端中运行：
   ```bash
   cd math-formula-plugin
   ./scripts/enable-cep-debug.sh
   ```

   这将启用所有 CSXS 版本（6-12）的调试模式。

2. **构建生产版本**

   ```bash
   npm install
   npm run build:cep-prod
   ```

   这将：
   - 构建 Vite 应用到 `dist/`
   - 复制资源到 `extension/client/dist/`
   - 打包 MathJax 库

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

   完全退出 Illustrator，然后重新启动。

5. **验证安装**

   在 Illustrator 中，选择菜单：
   ```
   窗口 > 扩展 > Math Formula Plugin
   ```

   如果看到扩展面板，说明安装成功！

### 方法 2：.zxp 安装包安装（推荐用于最终用户）

**适用场景**：正式发布、分发给用户

**步骤**：

1. **下载 .zxp 文件**

   从发布页面下载 `MathFormulaPlugin.zxp`

2. **安装 ZXP 安装器**

   下载并安装以下工具之一：
   - [Anastasiy's Extension Manager](https://install.anastasiy.com/)（推荐）
   - [ZXPInstaller](https://zxpinstaller.com/)

3. **安装扩展**

   - 打开 Extension Manager 或 ZXPInstaller
   - 拖拽 `MathFormulaPlugin.zxp` 到窗口中
   - 按照提示完成安装

4. **重启 Illustrator**

5. **验证安装**

   在 Illustrator 中，选择菜单：
   ```
   窗口 > 扩展 > Math Formula Plugin
   ```

---

## 首次使用

### 1. 打开扩展面板

在 Illustrator 中，选择菜单：
```
窗口 > 扩展 > Math Formula Plugin
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

## 基本操作

### LaTeX 输入

**支持的 LaTeX 语法**：

- **分数**：`\frac{a}{b}`
- **上下标**：`x^2`, `x_i`, `x_i^2`
- **根号**：`\sqrt{x}`, `\sqrt[3]{x}`
- **求和**：`\sum_{i=1}^{n} x_i`
- **积分**：`\int_{0}^{\infty} f(x) dx`
- **括号伸缩**：`\left( \frac{a}{b} \right)`
- **矩阵**：`\begin{matrix} a & b \\ c & d \end{matrix}`
- **希腊字母**：`\alpha`, `\beta`, `\gamma`
- **函数名**：`\sin(x)`, `\log(y)`

**实时预览**：

输入公式后，预览区会实时显示渲染结果。如果有语法错误，会显示错误提示。

### UnicodeMath 粘贴

**从 PowerPoint 粘贴公式**：

1. 在 PowerPoint 中选择公式
2. 复制（Ctrl/Cmd + C）
3. 在插件输入框中粘贴（Ctrl/Cmd + V）
4. 插件会自动识别 UnicodeMath 格式并转换为 LaTeX

**支持的 UnicodeMath 语法**：

- **分数**：`a/b`
- **上下标**：`x^2`, `x_i`
- **根号**：`√x`, `∛x`
- **求和**：`∑_(i=1)^n x_i`
- **积分**：`∫_0^∞ f(x) dx`

**歧义处理**：

如果输入存在歧义（如 `x^2^3`），插件会显示多种解析结果供您选择。

### 格式切换

在格式选择器中，您可以手动切换输入格式：
- **LaTeX**：直接输入 LaTeX 代码
- **UnicodeMath**：粘贴 PowerPoint 公式
- **AsciiMath**：简化的数学表达式（降级兜底）

### 插入到 Illustrator

**插入步骤**：

1. 确保已打开或创建 Illustrator 文档
2. 在输入框中输入公式
3. 点击"插入到 Illustrator"按钮
4. 公式将作为矢量图形插入到文档中

**插入属性**：

- **对象类型**：Group/PathItems（矢量）
- **插入位置**：当前视图中心（或画板中心）
- **插入尺寸**：宽度约 200pt（等比缩放）
- **字号统一**：所有公式的 em 大小（x-height）保持一致

**注意事项**：

- 插入的公式是矢量图形，可以自由缩放、旋转、编辑
- 插入后，公式不再与插件关联，无法直接编辑公式内容
- 如需修改公式，请在插件中重新输入并插入

---

## 自定义字体配置

### 使用自定义字体

插件支持使用自定义字体替换公式中的字母数字（A-Z, a-z, 0-9），同时保持数学符号的默认样式。

### 配置步骤

#### 1. 准备字体文件

准备您的 TTF 或 OTF 字体文件，例如：
- `MyCustomFont.ttf`

#### 2. 使用 Font Pack Builder 工具

Font Pack Builder 是一个独立的命令行工具，用于将字体文件转换为 MathJax 字体包。

**安装依赖**：

```bash
cd tools/font-pack-builder
npm install
```

**转换字体**：

**macOS/Linux**:
```bash
./转换字体.command
```

或手动运行：
```bash
node build.js --input /path/to/MyCustomFont.ttf --output ../../extension/client/dist/fonts/user-font-pack --name "My Custom Font"
```

**Windows**:
```cmd
convert-font.bat
```

或手动运行：
```cmd
node build.js --input C:\path\to\MyCustomFont.ttf --output ..\..\extension\client\dist\fonts\user-font-pack --name "My Custom Font"
```

**输出**：

工具会在 `extension/client/dist/fonts/user-font-pack/` 目录下生成：
- `manifest.json`：字体包元数据
- `fontdata.js`：MathJax 字体数据

#### 3. 在插件中使用

1. 重新加载插件（或等待 2 秒自动检测）
2. 在字体选择器中选择"自主字体"
3. 预览区会显示使用自定义字体的公式
4. 插入到 Illustrator 后，字母数字将使用自定义字体

### 字体替换范围

**默认替换字符**（89 个）：
- 字母数字：A-Z, a-z, 0-9（62 个）
- 基础运算符：+ - = × · ÷ < > ≤ ≥ −（11 个）
- 基础定界符：| /（2 个）
- 基础标点：. , : ; ' ! %（7 个）

**可选替换字符**（11 个）：
- 括号：( ) [ ] { }（6 个）
- 符号：* ~ → ← –（5 个）

**不受影响的符号**：
- 希腊字母（α, β, γ 等）
- 伸缩定界符（由 MathJax 动态生成）
- 根号结构、分数线（由 MathJax 动态生成）
- 大型运算符（∑, ∏, ∫ 等）

### 字体包管理

**查看字体包信息**：

在字体选择器中，可以看到：
- 字体名称（如 "My Custom Font"）
- 更新时间（如 "2026-02-24 10:30"）
- 失败字形数量（如 "2 个字符提取失败"）

**更新字体包**：

1. 使用 Font Pack Builder 重新转换字体
2. 插件会在 2 秒内自动检测并重新加载
3. 预览区会自动刷新（如果有当前公式）

**恢复默认字体**：

在字体选择器中选择"默认字体"，公式将使用 MathJax 默认字体。

---

## 常见问题解答

### Q1: 扩展在菜单中找不到？

**A**: 请检查以下几点：

1. **确认 CEP 调试模式已启用**：
   ```bash
   defaults read com.adobe.CSXS.11 PlayerDebugMode
   # 应该返回 1
   ```

2. **确认符号链接正确**：
   ```bash
   ls -la ~/Library/Application\ Support/Adobe/CEP/extensions/
   # 应该看到 MathFormulaPlugin -> /path/to/extension
   ```

3. **重启 Illustrator**：
   完全退出 Illustrator，然后重新启动。

4. **检查 Illustrator 版本**：
   确认您的 Illustrator 版本在支持范围内（2023-2026）。

### Q2: 面板打开后是空白的？

**A**: 这通常是资源加载问题，请检查：

1. **确认已构建生产版本**：
   ```bash
   npm run build:cep-prod
   ```

2. **检查 dist 目录**：
   ```bash
   ls extension/client/dist/
   # 应该看到 index.html, assets/, fonts/ 等
   ```

3. **查看 CEP 日志**：
   - macOS: `~/Library/Logs/CSXS/`
   - Windows: `%APPDATA%\Adobe\CEP\logs\`

4. **使用 Chrome DevTools 调试**：
   - 在 Chrome 中访问 `http://localhost:8088`
   - 查看控制台错误

### Q3: 插入功能不工作？

**A**: 请检查：

1. **确认已打开文档**：
   在使用插入功能前，必须先创建或打开 Illustrator 文档。

2. **检查临时文件目录**：
   ```bash
   ls ~/Library/Application\ Support/MathFormulaPlugin/
   # 应该看到临时 SVG 文件（如果插入失败）
   ```

3. **查看插件日志**：
   在插件面板底部的日志区域查看详细错误信息。

4. **尝试手动导出 SVG**：
   点击"下载 SVG"按钮，然后在 Illustrator 中手动打开 SVG 文件。

### Q4: 自定义字体不生效？

**A**: 请检查：

1. **确认字体包已生成**：
   ```bash
   ls extension/client/dist/fonts/user-font-pack/
   # 应该看到 manifest.json 和 fontdata.js
   ```

2. **检查 manifest.json**：
   ```bash
   cat extension/client/dist/fonts/user-font-pack/manifest.json
   # 确认 id 为 "user-font-pack"
   ```

3. **重新加载插件**：
   关闭并重新打开插件面板。

4. **查看失败清单**：
   在 manifest.json 中查看 `failedGlyphs` 字段，确认哪些字符提取失败。

### Q5: 公式字号不一致？

**A**: 插件使用固定标尺高度方案确保字号一致，如果遇到问题：

1. **确认使用相同字号**：
   在插入前，确保输入框中的字号设置相同（默认 14pt）。

2. **检查标尺识别**：
   查看插件日志，确认标尺识别成功。

3. **手动调整**：
   如果自动字号统一失败，可以在 Illustrator 中手动调整公式大小。

### Q6: 如何在 Windows 上使用？

**A**: Windows 支持正在验证中，基本步骤与 macOS 相同：

1. **启用 CEP 调试模式**：
   创建注册表项：
   ```
   HKEY_CURRENT_USER\Software\Adobe\CSXS.11
   PlayerDebugMode = "1" (String)
   ```

2. **创建符号链接**：
   ```cmd
   mklink /D "%APPDATA%\Adobe\CEP\extensions\MathFormulaPlugin" "C:\path\to\extension"
   ```

3. **其他步骤与 macOS 相同**

---

## 故障排除

### 调试模式

**启用 Chrome DevTools**：

1. 确认 `.debug` 文件存在：
   ```bash
   cat extension/.debug
   # 应该看到端口配置（8088）
   ```

2. 在 Chrome 中访问：
   ```
   http://localhost:8088
   ```

3. 选择 "Math Formula Plugin" 进行调试

**查看日志**：

- **插件日志**：在插件面板底部的日志区域
- **CEP 日志**：
  - macOS: `~/Library/Logs/CSXS/`
  - Windows: `%APPDATA%\Adobe\CEP\logs\`
- **ExtendScript 日志**：在 ExtendScript Toolkit 中查看

### 常见错误

#### 错误：Cannot find module 'mathjax'

**原因**：MathJax 库未正确打包

**解决方案**：
```bash
npm run build:cep-prod
```

#### 错误：PlacedItem.file is not a function

**原因**：Illustrator 版本不支持 `placedItems.add()` API

**解决方案**：插件会自动使用三段式导入策略的其他方法（方法 A 或 B）

#### 错误：Worker is not defined

**原因**：MathJax 在 Node.js 测试环境中尝试创建 Web Worker

**解决方案**：这是测试环境问题，不影响实际使用，可以忽略

### 性能问题

**面板加载慢**：

- 确认网络连接正常（Dev 模式需要访问 localhost:5174）
- 使用 Prod 模式（完全离线）
- 检查 MathJax 库是否正确打包

**公式渲染慢**：

- 简化公式（避免过于复杂的嵌套）
- 使用 LaTeX 直通（避免 UnicodeMath 转换开销）
- 检查字体包大小（过大的字体包会影响加载速度）

**插入慢**：

- 检查临时文件目录权限
- 简化公式（减少 SVG 复杂度）
- 使用方法 A（OpenCopyPaste）而非方法 C（PlacedItem）

### 重置插件

如果遇到无法解决的问题，可以尝试重置插件：

1. **删除符号链接**：
   ```bash
   rm ~/Library/Application\ Support/Adobe/CEP/extensions/MathFormulaPlugin
   ```

2. **清理临时文件**：
   ```bash
   rm -rf ~/Library/Application\ Support/MathFormulaPlugin/
   ```

3. **重新构建**：
   ```bash
   npm run build:cep-prod
   ```

4. **重新创建符号链接**：
   ```bash
   ln -s "$(pwd)/extension" ~/Library/Application\ Support/Adobe/CEP/extensions/MathFormulaPlugin
   ```

5. **重启 Illustrator**

---

## 获取帮助

如果您遇到问题或有建议，请：

1. **查看文档**：
   - 兼容性矩阵：`docs/phase4-compatibility-matrix.md`
   - 已知限制：`docs/phase4-known-limitations.md`（待创建）
   - 故障排除：`docs/phase4-cep-troubleshooting.md`

2. **查看日志**：
   - 插件日志：在插件面板底部
   - CEP 日志：`~/Library/Logs/CSXS/`

3. **联系支持**：
   - 提交 Issue（如果是开源项目）
   - 发送邮件给开发团队

---

## 附录

### 文件路径参考

**macOS**:
- CEP 扩展目录：`~/Library/Application Support/Adobe/CEP/extensions/`
- 临时文件目录：`~/Library/Application Support/MathFormulaPlugin/`
- CEP 日志目录：`~/Library/Logs/CSXS/`

**Windows**:
- CEP 扩展目录：`%APPDATA%\Adobe\CEP\extensions\`
- 临时文件目录：`%APPDATA%\MathFormulaPlugin\`
- CEP 日志目录：`%APPDATA%\Adobe\CEP\logs\`

### 相关文档

- 需求文档：`.kiro/specs/math-formula-plugin/requirements.md`
- 设计文档：`.kiro/specs/math-formula-plugin/design.md`
- 兼容性矩阵：`docs/phase4-compatibility-matrix.md`
- 回归测试清单：`docs/phase4-regression-test-checklist.md`
- Font Pack Builder README：`tools/font-pack-builder/README.md`

---

**最后更新**: 2026-02-24  
**版本**: 1.0.0-dev
