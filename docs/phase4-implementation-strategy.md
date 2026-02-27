# Phase 4 实现策略：A+ 增强版

**创建日期**：2026-02-11  
**状态**：✅ 已确定

---

## 策略概述

采用 **策略 A+**：复用现有 Web 应用 + 可调参数配置层 + Dev/Prod 双模式

### 核心目标

1. **Production 模式**：全离线稳定运行
   - 本地打包所有资源（MathJax、字体包、构建产物）
   - 无外部依赖，确保 Illustrator 内稳定运行
   - 完整的缓存和版本兼容处理

2. **Dev 模式**：支持 localhost 热更新
   - 指向 `http://localhost:5174`（Vite 开发服务器）
   - 便于频繁微调字符间距、位置等参数
   - 快速迭代，无需重新构建

3. **可调参数配置层**
   - 字符间距、位置、缩放等参数可配置
   - 支持运行时调整（Dev 模式）
   - 支持配置文件持久化（Prod 模式）

---

## 实现架构

### 目录结构

```
extension/
├── CSXS/
│   └── manifest.xml          # CEP 扩展清单
├── client/                   # CEP 面板前端
│   ├── index.html           # 入口 HTML（支持 dev/prod 切换）
│   ├── config.js            # 配置文件（dev/prod 模式切换）
│   ├── dist/                # Production 构建产物（从主工具复制）
│   │   ├── index.html
│   │   ├── assets/
│   │   └── ...
│   ├── lib/                 # 第三方库
│   │   ├── CSInterface.js   # CEP 接口库
│   │   └── mathjax/         # 本地 MathJax（Prod 模式）
│   └── fonts/               # 字体包目录（从主工具复制）
│       └── user-font-pack/
├── host/                    # ExtendScript 脚本
│   └── illustrator.jsx      # Illustrator 桥接脚本
└── .debug                   # 调试配置
```

### 模式切换机制

#### config.js 配置文件

```javascript
// extension/client/config.js
window.CEP_CONFIG = {
  // 模式：'dev' 或 'prod'
  mode: 'prod', // 默认 prod，开发时手动改为 'dev'
  
  // Dev 模式配置
  dev: {
    appUrl: 'http://localhost:5174',
    hotReload: true,
    debugMode: true
  },
  
  // Prod 模式配置
  prod: {
    appUrl: './dist/index.html',
    localMathJax: './lib/mathjax',
    localFonts: './fonts',
    cacheEnabled: true
  },
  
  // 可调参数
  params: {
    defaultWidth: 200,        // 插入宽度（pt）
    characterSpacing: 0,      // 字符间距调整
    positionOffset: { x: 0, y: 0 }, // 位置偏移
    scale: 1.0                // 缩放比例
  }
};
```

#### index.html 模式切换逻辑

```html
<!DOCTYPE html>
<html>
<head>
  <meta charset="UTF-8">
  <title>Math Formula Plugin</title>
  <script src="./config.js"></script>
  <script src="./lib/CSInterface.js"></script>
</head>
<body>
  <div id="app-container"></div>
  
  <script>
    // 根据模式加载不同的应用
    const config = window.CEP_CONFIG;
    
    if (config.mode === 'dev') {
      // Dev 模式：加载 localhost
      const iframe = document.createElement('iframe');
      iframe.src = config.dev.appUrl;
      iframe.style.width = '100%';
      iframe.style.height = '100%';
      iframe.style.border = 'none';
      document.getElementById('app-container').appendChild(iframe);
      
      console.log('[CEP] Dev mode: Loading from', config.dev.appUrl);
    } else {
      // Prod 模式：加载本地构建产物
      window.location.href = config.prod.appUrl;
      
      console.log('[CEP] Prod mode: Loading from', config.prod.appUrl);
    }
  </script>
</body>
</html>
```

---

## 实现步骤

### 阶段 1：基础架构（任务 14）

1. **创建 CEP 扩展目录结构**
   - ✅ 已创建：`extension/CSXS/`, `extension/client/`, `extension/host/`
   - ✅ 已创建：`manifest.xml`, `.debug`, `illustrator.jsx`

2. **创建配置文件**
   - 创建 `config.js`（模式切换配置）
   - 创建 `index.html`（模式切换逻辑）

3. **下载 CEP 依赖**
   - ✅ 已下载：`CSInterface.js`

### 阶段 2：Dev 模式集成（任务 15.1）

1. **配置 Dev 模式**
   - 设置 `config.js` 的 `mode` 为 `'dev'`
   - 启动主工具开发服务器：`npm run dev`（端口 5174）
   - 在 Illustrator 中打开扩展，验证可以加载 localhost

2. **验证 Phase 1-3 功能**
   - 验证 LaTeX 输入和预览
   - 验证 UnicodeMath 粘贴和转换
   - 验证自定义字体加载和应用

### 阶段 3：Prod 模式集成（任务 15.2）

1. **构建主工具**
   - 执行 `npm run build`
   - 复制 `dist/` 到 `extension/client/dist/`

2. **本地打包 MathJax**
   - 复制 `node_modules/mathjax/` 到 `extension/client/lib/mathjax/`
   - 更新 MathJax 加载路径（使用相对路径）

3. **复制字体包**
   - 复制 `fonts/` 到 `extension/client/fonts/`

4. **配置 Prod 模式**
   - 设置 `config.js` 的 `mode` 为 `'prod'`
   - 在 Illustrator 中打开扩展，验证离线运行

### 阶段 4：Illustrator 桥接（任务 16）

1. **创建 IllustratorBridge 类**
   - 封装 CSInterface 通信
   - 实现 `insertSVG()` 方法
   - 实现临时文件管理

2. **实现插入功能**
   - SVG 字符串 → 临时文件
   - 调用 ExtendScript `insertSVGToDocument()`
   - 清理临时文件

3. **错误处理**
   - 检查文档是否打开
   - 处理权限错误
   - 显示友好的错误提示

### 阶段 5：可调参数配置（任务 16+）

1. **参数配置 UI**
   - 添加参数调整面板（可选，Phase 5）
   - 支持实时预览参数效果

2. **参数持久化**
   - 使用 LocalStorage 保存参数
   - 启动时加载保存的参数

### 阶段 6：CEP 环境优化（任务 15.3）

1. **缓存处理**
   - 实现 LocalStorage/IndexedDB 缓存
   - 缓存 MathJax 配置和字体包

2. **版本兼容**
   - 检测 CEP 版本
   - 检测 Illustrator 版本
   - 提供降级方案

3. **路径权限处理**
   - 处理临时文件路径（跨平台）
   - 处理字体包路径
   - 处理 MathJax 路径

---

## 开发工作流

### Dev 模式开发流程

1. 启动主工具开发服务器：
   ```bash
   cd math-formula-plugin
   npm run dev
   ```

2. 设置 CEP 为 Dev 模式：
   ```javascript
   // extension/client/config.js
   mode: 'dev'
   ```

3. 在 Illustrator 中打开扩展（窗口 > 扩展 > Math Formula Plugin）

4. 修改主工具代码后，浏览器自动热更新

5. 在 CEP 面板中刷新（右键 > Reload Extension）

### Prod 模式构建流程

1. 构建主工具：
   ```bash
   cd math-formula-plugin
   npm run build
   ```

2. 复制构建产物：
   ```bash
   # 复制 dist
   cp -r dist/* extension/client/dist/
   
   # 复制 MathJax
   cp -r node_modules/mathjax extension/client/lib/
   
   # 复制字体包
   cp -r fonts extension/client/
   ```

3. 设置 CEP 为 Prod 模式：
   ```javascript
   // extension/client/config.js
   mode: 'prod'
   ```

4. 在 Illustrator 中重载扩展

### 自动化构建脚本

创建 `scripts/build-cep.sh`：

```bash
#!/bin/bash
# 自动化 CEP 构建脚本

echo "构建主工具..."
npm run build

echo "复制构建产物到 CEP..."
rm -rf extension/client/dist
cp -r dist extension/client/

echo "复制 MathJax..."
rm -rf extension/client/lib/mathjax
cp -r node_modules/mathjax extension/client/lib/

echo "复制字体包..."
rm -rf extension/client/fonts
cp -r fonts extension/client/

echo "✅ CEP 构建完成！"
echo "请在 extension/client/config.js 中设置 mode: 'prod'"
```

---

## 优势分析

### 策略 A+ 的优势

1. **快速集成**
   - 复用现有 Web 应用，无需重写
   - 最小化代码修改，降低风险

2. **灵活开发**
   - Dev 模式支持热更新，快速迭代
   - 便于调试和参数微调

3. **稳定部署**
   - Prod 模式全离线，无外部依赖
   - 确保 Illustrator 内稳定运行

4. **可维护性**
   - 主工具和 CEP 扩展代码分离
   - 配置文件清晰，易于调整

5. **可扩展性**
   - 参数配置层支持未来扩展
   - 支持 Phase 5 的 UI 优化

---

## 风险与规避

### 风险 1：Dev 模式跨域问题

**症状**：CEP iframe 加载 localhost 时可能遇到 CORS 错误

**规避方式**：
- 在 Vite 配置中启用 CORS：
  ```javascript
  // vite.config.ts
  server: {
    cors: true,
    headers: {
      'Access-Control-Allow-Origin': '*'
    }
  }
  ```

### 风险 2：Prod 模式路径问题

**症状**：MathJax 或字体包路径错误，导致加载失败

**规避方式**：
- 使用相对路径（`./lib/mathjax`）
- 在构建脚本中验证路径
- 添加路径检测和错误提示

### 风险 3：缓存失效

**症状**：更新后 CEP 仍加载旧版本

**规避方式**：
- 在 `manifest.xml` 中更新版本号
- 清除 CEP 缓存（重启 Illustrator）
- 添加版本检测逻辑

---

## 总结

策略 A+ 结合了快速集成和灵活开发的优势，同时确保生产环境的稳定性。通过 Dev/Prod 双模式，既支持快速迭代，又保证离线稳定运行。

**下一步**：展开 Phase 4 的详细任务清单，按照上述策略逐步实现。
