# Phase 4 开发环境配置指南

## 概述

本文档提供 Phase 4（Adobe Illustrator CEP 集成）开发环境的完整配置指南。

**创建日期**：2026-02-11  
**状态**：✅ 配置指南

---

## 前置要求

### 必需软件

1. **Adobe Illustrator**
   - 推荐版本：2023 (v27.x) 或 2026 (v30.x)
   - 最低版本：CC 2020 (v24.x)
   - 下载地址：https://www.adobe.com/products/illustrator.html

2. **Node.js**
   - 版本：18.x 或更高
   - 已安装（用于 Phase 1-3 开发）

3. **代码编辑器**
   - 推荐：Visual Studio Code
   - 已安装

### 可选工具

1. **ZXPSignCmd**（用于签名扩展包）
   - 下载地址：https://github.com/Adobe-CEP/CEP-Resources/tree/master/ZXPSignCMD
   - 仅在发布时需要

2. **ExManCmd**（用于安装/卸载扩展）
   - 下载地址：https://github.com/Adobe-CEP/Getting-Started-guides
   - 可选，手动安装也可以

---

## CEP 扩展目录结构

### 创建扩展目录

```bash
cd math-formula-plugin
mkdir -p extension/CSXS
mkdir -p extension/client
mkdir -p extension/host
mkdir -p extension/client/lib
```

### 目录结构说明

```
math-formula-plugin/
├── extension/                    # CEP 扩展根目录
│   ├── CSXS/                    # CEP 配置目录
│   │   └── manifest.xml         # 扩展清单文件
│   ├── client/                  # 前端代码（运行在 CEP webview）
│   │   ├── index.html          # 面板 HTML
│   │   ├── main.ts             # 面板逻辑（TypeScript）
│   │   ├── styles.css          # 面板样式
│   │   └── lib/                # 第三方库（MathJax 等）
│   ├── host/                    # ExtendScript 代码（运行在 Illustrator）
│   │   └── illustrator.jsx     # Illustrator 脚本
│   └── .debug                   # 调试配置文件
```

---

## 配置步骤

### 步骤 1：启用 PlayerDebugMode

PlayerDebugMode 允许你在开发时加载未签名的扩展并使用 Chrome DevTools 调试。

#### macOS 配置

1. 打开终端，执行以下命令：

```bash
# 启用 CEP 11 调试模式（Illustrator 2023+）
defaults write com.adobe.CSXS.11 PlayerDebugMode 1

# 如果使用 Illustrator CC 2020-2022，启用 CEP 9
defaults write com.adobe.CSXS.9 PlayerDebugMode 1

# 验证配置
defaults read com.adobe.CSXS.11 PlayerDebugMode
# 应输出：1
```

2. 重启 Illustrator 使配置生效

#### Windows 配置

1. 打开注册表编辑器（Win + R，输入 `regedit`）

2. 导航到以下路径：
   ```
   HKEY_CURRENT_USER\Software\Adobe\CSXS.11
   ```

3. 如果 `CSXS.11` 键不存在，创建它：
   - 右键 `Adobe` → 新建 → 项 → 命名为 `CSXS.11`

4. 在 `CSXS.11` 下创建字符串值：
   - 右键 → 新建 → 字符串值
   - 名称：`PlayerDebugMode`
   - 值：`1`

5. 如果使用 Illustrator CC 2020-2022，在 `CSXS.9` 下重复上述步骤

6. 重启 Illustrator 使配置生效

### 步骤 2：创建 .debug 文件

`.debug` 文件告诉 CEP 在哪个端口启用远程调试。

创建 `extension/.debug` 文件：

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

**说明**：
- `Extension Id`：必须与 `manifest.xml` 中的 ID 一致
- `Host Name="ILST"`：Illustrator 的代码
- `Port="8088"`：调试端口，可以是 8000-9999 之间的任意端口

### 步骤 3：创建 manifest.xml

创建 `extension/CSXS/manifest.xml` 文件：

```xml
<?xml version="1.0" encoding="UTF-8"?>
<ExtensionManifest Version="7.0" ExtensionBundleId="com.example.mathformula">
  <ExtensionList>
    <Extension Id="com.example.mathformula.panel" Version="1.0.0" />
  </ExtensionList>
  
  <ExecutionEnvironment>
    <HostList>
      <!-- 允许在 Illustrator CC 2020 (v24.0) 及更高版本中加载 -->
      <Host Name="ILST" Version="[24.0,99.9]" />
    </HostList>
    
    <LocaleList>
      <Locale Code="All" />
    </LocaleList>
    
    <RequiredRuntimeList>
      <!-- CEP 11 对应 Illustrator 2023+ -->
      <RequiredRuntime Name="CSXS" Version="11.0" />
    </RequiredRuntimeList>
  </ExecutionEnvironment>
  
  <DispatchInfoList>
    <Extension Id="com.example.mathformula.panel">
      <DispatchInfo>
        <Resources>
          <MainPath>./client/index.html</MainPath>
          <ScriptPath>./host/illustrator.jsx</ScriptPath>
          <CEFCommandLine>
            <Parameter>--enable-nodejs</Parameter>
            <Parameter>--mixed-context</Parameter>
          </CEFCommandLine>
        </Resources>
        
        <Lifecycle>
          <AutoVisible>true</AutoVisible>
        </Lifecycle>
        
        <UI>
          <Type>Panel</Type>
          <Menu>Math Formula Plugin</Menu>
          <Geometry>
            <Size>
              <Height>600</Height>
              <Width>400</Width>
            </Size>
            <MinSize>
              <Height>400</Height>
              <Width>300</Width>
            </MinSize>
            <MaxSize>
              <Height>800</Height>
              <Width>600</Width>
            </MaxSize>
          </Geometry>
          <Icons>
            <!-- 可选：添加图标 -->
          </Icons>
        </UI>
      </DispatchInfo>
    </Extension>
  </DispatchInfoList>
</ExtensionManifest>
```

**关键配置说明**：
- `ExtensionBundleId`：扩展包的唯一标识符
- `Extension Id`：扩展的唯一标识符（与 `.debug` 中一致）
- `Host Name="ILST"`：Illustrator
- `Version="[24.0,99.9]"`：支持的 Illustrator 版本范围
- `RequiredRuntime Name="CSXS" Version="11.0"`：CEP 运行时版本
- `MainPath`：面板 HTML 文件路径
- `ScriptPath`：ExtendScript 文件路径
- `--enable-nodejs`：启用 Node.js 集成
- `--mixed-context`：允许混合上下文

### 步骤 4：安装扩展到 Illustrator

#### macOS 安装

1. 创建符号链接到 CEP 扩展目录：

```bash
# 创建 CEP 扩展目录（如果不存在）
mkdir -p ~/Library/Application\ Support/Adobe/CEP/extensions

# 创建符号链接
ln -s "$(pwd)/extension" ~/Library/Application\ Support/Adobe/CEP/extensions/MathFormulaPlugin

# 验证符号链接
ls -la ~/Library/Application\ Support/Adobe/CEP/extensions/
```

2. 重启 Illustrator

#### Windows 安装

1. 打开文件资源管理器，导航到：
   ```
   C:\Users\[YourUsername]\AppData\Roaming\Adobe\CEP\extensions
   ```

2. 如果 `extensions` 文件夹不存在，创建它

3. 创建符号链接（以管理员身份运行命令提示符）：

```cmd
mklink /D "C:\Users\[YourUsername]\AppData\Roaming\Adobe\CEP\extensions\MathFormulaPlugin" "C:\path\to\math-formula-plugin\extension"
```

4. 重启 Illustrator

### 步骤 5：验证安装

1. 启动 Adobe Illustrator

2. 在菜单栏中选择：
   - **窗口 > 扩展 > Math Formula Plugin**

3. 如果看到面板打开（即使是空白的），说明安装成功

4. 如果面板没有出现，检查：
   - PlayerDebugMode 是否启用
   - manifest.xml 配置是否正确
   - 符号链接是否创建成功
   - Illustrator 版本是否在支持范围内

---

## 调试工具配置

### Chrome DevTools 调试

1. 确保 PlayerDebugMode 已启用

2. 在 Illustrator 中打开扩展面板

3. 打开 Chrome 浏览器，访问：
   ```
   http://localhost:8088
   ```
   （端口号与 `.debug` 文件中配置的一致）

4. 点击扩展名称，打开 DevTools

5. 现在可以：
   - 查看控制台日志
   - 调试 JavaScript 代码
   - 检查 DOM 元素
   - 监控网络请求

### 日志文件位置

#### macOS
- **CEP 日志**：`~/Library/Logs/CSXS/`
- **扩展日志**：查看 `CEPHtmlEngine.log`

#### Windows
- **CEP 日志**：`C:\Users\[Username]\AppData\Local\Temp\`
- **扩展日志**：查看 `CEPHtmlEngine.log`

### ExtendScript 调试

1. 在 Illustrator 中，选择：
   - **文件 > 脚本 > 其他脚本...**

2. 选择 `extension/host/illustrator.jsx`

3. 如果脚本执行成功，说明 ExtendScript 代码正常

4. 使用 `$.writeln()` 输出调试信息到 ExtendScript Toolkit（如果安装）

---

## 开发工作流

### 热重载流程

开发时无需每次都重启 Illustrator：

1. 修改代码后保存

2. 在 CEP 面板中右键 → **Reload Extension**
   - 或在 DevTools 控制台执行：
     ```javascript
     window.cep.util.reloadExtension()
     ```

3. 面板会重新加载，显示最新代码

### 构建流程

Phase 4 需要将 Phase 1-3 的 Web 应用打包到 CEP 扩展中：

1. **构建 Web 应用**：
   ```bash
   cd math-formula-plugin
   npm run build
   ```

2. **复制构建产物到 CEP 扩展**：
   ```bash
   # 复制 dist 目录到 extension/client
   cp -r dist/* extension/client/
   ```

3. **本地打包 MathJax**：
   ```bash
   # 复制 MathJax 库到 extension/client/lib
   cp -r node_modules/mathjax extension/client/lib/
   ```

4. **重载扩展**：
   - 在 Illustrator 中重载扩展

### 测试流程

1. **单元测试**（在 Node.js 环境）：
   ```bash
   npm run test
   ```

2. **集成测试**（在 CEP 环境）：
   - 手动测试：在 Illustrator 中打开扩展，测试功能
   - 自动化测试：使用 Playwright 或 Puppeteer（可选）

3. **跨平台测试**：
   - 在 macOS 和 Windows 上分别测试
   - 在不同 Illustrator 版本上测试

---

## 常见问题排查

### 问题 1：扩展在菜单中不可见

**可能原因**：
- PlayerDebugMode 未启用
- manifest.xml 配置错误
- 符号链接未创建或路径错误
- Illustrator 版本不在支持范围内

**解决方法**：
1. 验证 PlayerDebugMode：
   ```bash
   # macOS
   defaults read com.adobe.CSXS.11 PlayerDebugMode
   
   # Windows：检查注册表
   ```

2. 验证 manifest.xml：
   - 检查 XML 语法是否正确
   - 检查 Extension Id 是否唯一
   - 检查 Host Version 范围

3. 验证符号链接：
   ```bash
   # macOS
   ls -la ~/Library/Application\ Support/Adobe/CEP/extensions/
   
   # Windows：检查文件夹是否存在
   ```

4. 重启 Illustrator

### 问题 2：面板显示空白

**可能原因**：
- HTML 文件路径错误
- JavaScript 加载失败
- MathJax 加载失败
- CORS 错误

**解决方法**：
1. 打开 Chrome DevTools（http://localhost:8088）

2. 查看控制台错误日志

3. 检查网络请求是否成功

4. 验证 HTML 文件路径：
   - `MainPath` 应指向 `./client/index.html`
   - 路径相对于 `extension/` 目录

5. 检查 MathJax 加载：
   - 确保 MathJax 库已复制到 `extension/client/lib/mathjax/`
   - 检查 HTML 中的 script 标签路径

### 问题 3：ExtendScript 通信失败

**可能原因**：
- ExtendScript 文件路径错误
- JSX 语法错误
- CSInterface 未正确初始化

**解决方法**：
1. 验证 ExtendScript 文件路径：
   - `ScriptPath` 应指向 `./host/illustrator.jsx`

2. 手动运行 JSX 脚本：
   - 在 Illustrator 中：文件 > 脚本 > 其他脚本...
   - 选择 `extension/host/illustrator.jsx`
   - 查看是否有语法错误

3. 检查 CSInterface 初始化：
   ```javascript
   // 在 client/main.ts 中
   const csInterface = new CSInterface();
   console.log('CSInterface initialized:', csInterface);
   ```

4. 测试通信：
   ```javascript
   csInterface.evalScript('alert("Hello from ExtendScript")', (result) => {
     console.log('Result:', result);
   });
   ```

### 问题 4：无法访问 Chrome DevTools

**可能原因**：
- `.debug` 文件配置错误
- 端口被占用
- PlayerDebugMode 未启用

**解决方法**：
1. 验证 `.debug` 文件：
   - 检查 Extension Id 是否与 manifest.xml 一致
   - 检查端口号是否在 8000-9999 范围内

2. 更换端口：
   - 在 `.debug` 文件中更改端口号
   - 重启 Illustrator
   - 访问新端口：http://localhost:[新端口]

3. 验证 PlayerDebugMode（见问题 1）

---

## 环境验证清单

完成配置后，使用以下清单验证环境：

- [ ] PlayerDebugMode 已启用（macOS 或 Windows）
- [ ] `.debug` 文件已创建并配置正确
- [ ] `manifest.xml` 已创建并配置正确
- [ ] 扩展目录已创建（CSXS、client、host）
- [ ] 符号链接已创建到 CEP 扩展目录
- [ ] Illustrator 已重启
- [ ] 扩展在 Illustrator 菜单中可见（窗口 > 扩展 > Math Formula Plugin）
- [ ] 面板可以打开（即使是空白的）
- [ ] Chrome DevTools 可以访问（http://localhost:8088）
- [ ] 控制台可以输出日志
- [ ] 热重载功能可用（window.cep.util.reloadExtension()）

---

## 下一步

环境配置完成后，可以开始 Phase 4 的实现任务：

1. **任务 14**：创建 CEP 扩展基础架构
   - 创建 `index.html`、`main.ts`、`illustrator.jsx`
   - 配置 TypeScript 编译
   - 配置 Vite 构建

2. **任务 15**：嵌入 Web 公式生成器
   - 将 Phase 1-3 的 Web 应用嵌入 CEP webview
   - 本地打包 MathJax
   - 适配 CEP 环境

3. **任务 16**：实现 Illustrator 桥接与插入功能
   - 实现 IllustratorBridge 类
   - 实现临时文件管理
   - 实现插入逻辑

4. **任务 17**：跨平台兼容性验证
   - 在必测组合上运行回归测试
   - 记录已知限制
   - 实现降级模式

5. **任务 18**：Phase 4 验收与交付
   - 运行所有自动化验证
   - 编写变更说明
   - 准备发布

---

## 参考资源

### 官方文档

- **CEP 资源**：https://github.com/Adobe-CEP/CEP-Resources
- **CEP 入门指南**：https://github.com/Adobe-CEP/Getting-Started-guides
- **Illustrator 脚本参考**：https://www.adobe.com/devnet/illustrator/scripting.html
- **ExtendScript Toolkit**：https://www.adobe.com/products/extendscript-toolkit.html

### 社区资源

- **CEP 论坛**：https://community.adobe.com/t5/creative-cloud-extensions/ct-p/ct-creative-cloud-extensions
- **Stack Overflow**：搜索 "adobe cep" 或 "illustrator extendscript"

---

## 总结

Phase 4 开发环境配置完成后，你将拥有：

1. ✅ 启用了 PlayerDebugMode 的 Illustrator
2. ✅ 配置好的 CEP 扩展目录结构
3. ✅ 可用的 Chrome DevTools 调试工具
4. ✅ 热重载开发工作流
5. ✅ 完整的环境验证清单

现在可以开始 Phase 4 的实现任务了！
