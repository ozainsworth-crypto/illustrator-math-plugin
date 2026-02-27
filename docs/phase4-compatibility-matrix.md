# Phase 4 兼容性矩阵

## 概述

本文档定义 Phase 4（Adobe Illustrator CEP 集成）的兼容性范围、必测组合和发布承诺。

**创建日期**：2026-02-11  
**最后更新**：2026-02-24  
**状态**：✅ 已确定并更新

---

## 兼容性范围定义

### Illustrator 版本范围

| 版本类型 | 版本号 | 说明 | 测试要求 | 当前状态 |
|---------|--------|------|---------|---------|
| **最低支持版本（Min）** | 2023 (v27.x) | 最低兼容版本 | 必须通过基础功能测试 | ⏳ 待测试 |
| **上一主版本（N-1）** | 2024 (v28.x) | 上一个主要版本 | 必须通过完整回归测试 | ⏳ 待测试 |
| **当前主测版本（N）** | 2026 (v30.x) | 当前主要版本 | 必须通过完整回归测试 | ✅ 已验证 |

**manifest.xml 版本范围**：`[17.0,99.9]`
- 允许在 Illustrator v17.0 及更高版本中加载
- 实际兼容承诺：2023 (v27.x) - 2026 (v30.x)
- 实际兼容承诺以本矩阵为准

**版本范围调整说明**：
- 原计划支持 CC 2020 (v24.x)，但考虑到三段式导入策略的 API 兼容性，调整最低版本为 2023 (v27.x)
- 如果 2023 版本测试失败，将进一步调整为 2024 (v28.x)

### 操作系统范围

#### macOS

| 版本类型 | 版本号 | 说明 | 测试要求 |
|---------|--------|------|---------|
| **最低支持版本** | 13.0 (Ventura) | 最低兼容版本 | 必须通过基础功能测试 |
| **当前主测版本** | 14.1 (Sonoma) | 当前主要版本 | 必须通过完整回归测试 |

#### Windows

| 版本类型 | 版本号 | 说明 | 测试要求 |
|---------|--------|------|---------|
| **最低支持版本** | Windows 10 (64-bit) | 最低兼容版本 | 必须通过基础功能测试 |
| **当前主测版本** | Windows 11 | 当前主要版本 | 必须通过完整回归测试 |

### 处理器架构

| 架构 | 平台 | 状态 | 测试要求 |
|------|------|------|---------|
| **Intel (x86_64)** | macOS | ✅ 支持 | 必须通过完整回归测试 |
| **Apple Silicon (arm64)** | macOS | ✅ 支持 | 必须通过完整回归测试 |
| **x64** | Windows | ✅ 支持 | 必须通过完整回归测试 |
| **ARM** | Windows | ⚠️ 风险项 | 待验证（如不支持需在发布说明中明确） |

### CEP 运行时版本

| 版本类型 | 版本号 | 说明 |
|---------|--------|------|
| **最低支持版本** | CEP 9 | 对应 Illustrator CC 2020 |
| **推荐版本** | CEP 11 | 对应 Illustrator 2023+ |

---

## 必测组合（至少 5 个）

以下组合必须在 Phase 4 发布前完成完整的回归测试清单（见需求文档 D8.23）：

### 组合 1：macOS Sonoma + Illustrator 2026 + Apple Silicon ✅
- **操作系统**：macOS 14.1 (Sonoma)
- **Illustrator**：2026 (v30.x)
- **处理器**：Apple Silicon (arm64)
- **CEP 版本**：CEP 11
- **测试优先级**：🔴 高（当前主测版本）
- **测试状态**：✅ 已验证（插入功能正常，三段式导入策略方法 A 成功）

### 组合 2：macOS Sonoma + Illustrator 2024 + Intel Mac
- **操作系统**：macOS 14.1 (Sonoma)
- **Illustrator**：2024 (v28.x)
- **处理器**：Intel (x86_64)
- **CEP 版本**：CEP 11
- **测试优先级**：🔴 高（上一主版本）
- **测试状态**：⏳ 待测试

### 组合 3：Windows 11 + Illustrator 2026 + x64
- **操作系统**：Windows 11
- **Illustrator**：2026 (v30.x)
- **处理器**：x64
- **CEP 版本**：CEP 11
- **测试优先级**：🔴 高（当前主测版本）
- **测试状态**：⏳ 待测试

### 组合 4：macOS Sonoma + Illustrator 2023 + Apple Silicon
- **操作系统**：macOS 14.1 (Sonoma)
- **Illustrator**：2023 (v27.x)
- **处理器**：Apple Silicon (arm64)
- **CEP 版本**：CEP 11
- **测试优先级**：🟡 中（最低支持版本）
- **测试状态**：⏳ 待测试

### 组合 5：Windows 11 + Illustrator 2023 + x64
- **操作系统**：Windows 11
- **Illustrator**：2023 (v27.x)
- **处理器**：x64
- **CEP 版本**：CEP 11
- **测试优先级**：🟡 中（最低支持版本）
- **测试状态**：⏳ 待测试

### 可选组合（如有资源）

#### 组合 6：macOS Ventura + Illustrator CC 2020 + Intel Mac
- **操作系统**：macOS 13.0 (Ventura)
- **Illustrator**：CC 2020 (v24.x)
- **处理器**：Intel (x86_64)
- **CEP 版本**：CEP 9
- **测试优先级**：🟢 低（最低支持版本）

#### 组合 7：Windows 10 + Illustrator CC 2020 + x64
- **操作系统**：Windows 10 (64-bit)
- **Illustrator**：CC 2020 (v24.x)
- **处理器**：x64
- **CEP 版本**：CEP 9
- **测试优先级**：🟢 低（最低支持版本）

---

## 回归测试清单

每个必测组合都必须通过以下回归测试清单（详见需求文档 D8.23）：

### 基础环境
- [ ] 扩展在菜单中可见（窗口 > 扩展 > Math Formula Plugin）
- [ ] 面板可打开且不空白
- [ ] 面板可正常显示 UI 元素（输入框、按钮、预览区域）

### Phase 1 功能
- [ ] 输入 LaTeX（如 `\frac{a}{b}`）→ 预览显示正确
- [ ] 点击下载 → 导出 SVG 文件成功
- [ ] 控制台输出 MathJax 版本信息

### Phase 2 功能
- [ ] 粘贴 PowerPoint 线性格式（如 `a/b`）→ 自动识别为 UnicodeMath
- [ ] 转换为 LaTeX（`\frac{a}{b}`）→ 显示对比预览
- [ ] 触发歧义场景（如 `x^2^3`）→ 弹出多种解析结果对比
- [ ] 粘贴非纯文本（如富文本）→ 显示降级提示与操作指引

### Phase 3 功能
- [ ] 上传自定义 TTF 字体 → 字体列表中出现
- [ ] 选择自定义字体 → 预览中字母数字变化、符号不变
- [ ] 导出 SVG → 在未安装字体的环境打开，字母数字外观一致
- [ ] 切换回默认字体 → 预览恢复 MathJax 默认样式

### Phase 4 插入功能
- [ ] 点击"插入到 Illustrator"→ 检查文档是否打开
- [ ] 插入成功 → 对象类型为 PlacedItem（嵌入模式）
- [ ] 插入位置为视图中心（或回退到画板中心）
- [ ] 插入尺寸为 200pt 宽度（等比缩放）
- [ ] 插入的 SVG 在 Illustrator 中显示正确（字母数字字体效果保持、符号稳定）

### Phase 4 错误处理
- [ ] 无文档打开时点击插入 → 显示错误提示"请先打开或创建一个 Illustrator 文档"
- [ ] 权限不足时（如只读文档）→ 显示错误提示与可操作建议
- [ ] SVG 格式异常时 → 显示错误提示与诊断信息

---

## 已知限制与风险项

### 已知限制

#### 1. Illustrator 版本限制
- **不支持 CC 2019 及更早版本**：CEP 运行时版本过低，部分 API 不可用
- **CC 2020-2022 版本**：基础功能可用，但未经过完整测试，可能存在兼容性问题

#### 2. 操作系统限制
- **macOS 12.x (Monterey) 及更早版本**：未经测试，可能存在兼容性问题
- **Windows 8.1 及更早版本**：不支持

#### 3. 处理器架构限制
- **Windows on ARM**：未经测试，可能不兼容

### 风险项

#### 1. CEP 面板空白/不加载
- **症状**：面板打开后显示空白，无任何 UI 元素
- **可能原因**：
  - CEP 运行时版本不兼容
  - MathJax 加载失败
  - JavaScript 错误导致面板初始化失败
- **诊断方法**：
  - 启用 PlayerDebugMode，打开 Chrome DevTools
  - 查看控制台错误日志
  - 检查 CEP 日志文件（见"安装路径与日志位置"）
- **规避方式**：
  - 升级 Illustrator 到推荐版本（2023 或 2026）
  - 使用降级模式（仅导出 SVG，手动置入 Illustrator）

#### 2. 不同 Illustrator 小版本行为差异
- **症状**：同一主版本的不同小版本（如 v27.1.0 vs v27.2.0）行为不一致
- **可能原因**：
  - ExtendScript API 变更
  - CEP 运行时更新
  - Illustrator 内部实现变更
- **记录格式**：
  ```
  版本：Illustrator 2023 v27.1.0
  症状：ExtendScript 调用 `app.activeDocument.placedItems.add()` 失败
  规避方式：升级到 v27.2.0 或使用替代 API
  ```
- **更新策略**：每发现一个不兼容问题，更新本文档并提供规避方案

#### 3. 跨平台路径处理差异
- **症状**：Windows 上临时文件路径包含反斜杠，导致 ExtendScript 解析失败
- **规避方式**：统一使用正斜杠 `/`，Illustrator 支持跨平台路径

---

## 调试与开发环境配置

### PlayerDebugMode 配置

#### macOS
1. 创建 `.debug` 文件：
   ```xml
   <?xml version="1.0" encoding="UTF-8"?>
   <ExtensionList>
     <Extension Id="com.example.mathformula.panel">
       <HostList>
         <Host Name="ILST" Port="8088"/>
       </HostList>
     </Extension>
   </ExtensionList>
   ```
2. 放置到扩展目录：`~/Library/Application Support/Adobe/CEP/extensions/[ExtensionID]/.debug`
3. 启用调试模式：
   ```bash
   defaults write com.adobe.CSXS.11 PlayerDebugMode 1
   ```
4. 重启 Illustrator

#### Windows
1. 创建 `.debug` 文件（同上）
2. 放置到扩展目录：`C:\Users\[Username]\AppData\Roaming\Adobe\CEP\extensions\[ExtensionID]\.debug`
3. 启用调试模式（注册表）：
   ```
   HKEY_CURRENT_USER\Software\Adobe\CSXS.11
   PlayerDebugMode = "1" (字符串类型)
   ```
4. 重启 Illustrator

### 安装路径与日志位置

#### macOS
- **扩展安装路径**：`~/Library/Application Support/Adobe/CEP/extensions/[ExtensionID]/`
- **CEP 日志路径**：`~/Library/Logs/CSXS/`
- **临时文件路径**：`~/Library/Application Support/MathFormulaPlugin/temp/`

#### Windows
- **扩展安装路径**：`C:\Users\[Username]\AppData\Roaming\Adobe\CEP\extensions\[ExtensionID]\`
- **CEP 日志路径**：`C:\Users\[Username]\AppData\Local\Temp\`
- **临时文件路径**：`C:\Users\[Username]\AppData\Local\MathFormulaPlugin\temp\`

### 重载流程

开发态支持热重载，无需重启 Illustrator：

1. 修改代码后保存
2. 在 CEP 面板中打开 Chrome DevTools（右键 > Inspect）
3. 在控制台执行：
   ```javascript
   window.cep.util.reloadExtension()
   ```
4. 或关闭面板后重新打开

---

## 降级策略

### 降级触发条件

以下情况触发降级模式：

1. **CEP 面板无法加载**：
   - CEP 运行时版本不兼容（< CEP 9）
   - MathJax 加载失败
   - 面板初始化错误

2. **关键能力不可用**：
   - ExtendScript 通信失败
   - 插入功能异常
   - 临时文件创建失败

3. **不支持的版本**：
   - Illustrator 版本 < CC 2020
   - macOS 版本 < 13.0
   - Windows 版本 < 10

### 降级路径

#### 方案 A：仅导出模式（推荐）

**功能**：
- 用户仍可在 CEP 面板中生成公式并导出 SVG 文件
- 提示用户手动将 SVG 文件拖入 Illustrator 或使用"文件 > 置入"

**UI 提示**：
- 面板顶部显示黄色提示条
- 提示内容："检测到 CEP 运行时版本过低，插入功能不可用。您仍可导出 SVG 文件并手动置入 Illustrator。"
- 插入按钮变为"导出 SVG"

**实现**：
- 禁用 `IllustratorBridge.insertSVG()` 方法
- 启用 `SVGExporter.exportSVG()` 方法
- 显示降级提示条

#### 方案 B：外部 Web 生成器模式

**功能**：
- 提供一个独立的 Web 页面链接（可在浏览器中打开）
- 用户在 Web 页面中生成公式并下载 SVG，然后手动导入 Illustrator

**UI 提示**：
- 面板顶部显示黄色提示条
- 提示内容："检测到环境不兼容，CEP 插件无法正常运行。请使用外部 Web 生成器：[链接]"
- 提供"打开 Web 生成器"按钮

**实现**：
- 检测到降级条件时，显示降级提示条
- 提供外部 Web 生成器链接（如 `https://example.com/math-formula-generator`）
- 用户点击链接后在浏览器中打开

### 降级模式验收

**验收判据**：
- 故意触发降级条件（如在不支持的环境运行）
- 面板应显示降级提示并提供可用功能
- 用户仍可生成和导出公式

---

## 发布承诺

### 兼容承诺

**承诺范围**：
- **Illustrator**：CC 2020 (v24.x) - 2026 (v30.x)
- **macOS**：13.0 (Ventura) - 14.1 (Sonoma)
- **Windows**：Windows 10 (64-bit) - Windows 11
- **处理器**：Intel Mac、Apple Silicon、Windows x64

**测试覆盖**：
- 必测组合（5 个）：完整回归测试
- 可选组合（2 个）：基础功能测试（如有资源）

### 已知限制声明

**发布说明中必须包含**：
- 支持的 Illustrator 版本范围
- 支持的操作系统版本范围
- 支持的处理器架构
- 已知不兼容版本和症状
- 降级模式说明

**示例发布说明**：
```
本扩展在以下环境中经过测试：
- Illustrator CC 2020 (v24.x) - 2026 (v30.x)
- macOS 13.0 (Ventura) - 14.1 (Sonoma)
- Windows 10 (64-bit) - Windows 11
- Intel Mac、Apple Silicon、Windows x64

推荐使用 Illustrator 2023 或 2026 版本以获得最佳体验。

已知限制：
- 不支持 Illustrator CC 2019 及更早版本
- 不支持 macOS 12.x (Monterey) 及更早版本
- Windows on ARM 未经测试，可能不兼容

如果在不支持的环境中遇到问题，扩展将自动切换到降级模式（仅导出 SVG）。
```

### 用户反馈处理

**反馈渠道**：
- GitHub Issues（如有）
- 用户支持邮箱
- Adobe Exchange 评论区

**处理流程**：
1. 收集用户反馈（版本、操作系统、症状、错误日志）
2. 评估是否为已知限制
3. 如果是新问题，更新本文档并提供规避方案
4. 如果影响范围广，考虑发布补丁版本
5. 评估是否需要扩展兼容性矩阵

---

## 更新记录

| 日期 | 版本 | 更新内容 | 更新人 |
|------|------|---------|--------|
| 2026-02-11 | 1.0.0 | 初始版本，定义兼容性矩阵和必测组合 | Kiro AI Agent |
| 2026-02-24 | 1.1.0 | 更新必测组合顺序和测试状态，调整版本范围说明 | Kiro AI Agent |

---

## 总结

Phase 4 兼容性矩阵已确定，包括：

1. **兼容性范围**：Illustrator CC 2020 - 2026、macOS 13.0 - 14.1、Windows 10 - 11、Intel Mac + Apple Silicon + Windows x64
2. **必测组合**：5 个组合，覆盖当前主测版本和上一主版本
3. **回归测试清单**：基础环境、Phase 1-4 功能、错误处理
4. **已知限制与风险项**：CEP 面板空白、版本差异、路径处理
5. **降级策略**：仅导出模式或外部 Web 生成器模式
6. **发布承诺**：明确支持范围和已知限制

**下一步**：Phase 4 Gate 条件已满足，可以开始 Phase 4 实现。
