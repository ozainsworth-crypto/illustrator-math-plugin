# Task 19.19 - CEP Builder Bug Investigation

## 问题描述

**现象**：从 CEP 的"生成新字体"功能生成字体包 test3 后：
- Web UI 页面显示 test1 的信息（陈旧数据）
- `public/fonts/user-font-pack/` 目录仍然是 test2 的文件（未更新）
- CEP 未能检测到新字体包

**预期行为**：
- 生成 test3 后，应覆盖 `public/fonts/user-font-pack/` 目录
- build-info.json 应更新为 test3 的信息
- CEP 轮询机制应检测到更新并自动刷新

## 根因分析

### 当前架构问题

从代码分析发现：

1. **CEP "生成新字体" 按钮的实现**（`src/main.ts:400-440`）：
   ```typescript
   generateOption.addEventListener('click', () => {
     const fontToolUrl = 'http://localhost:3000';
     if (typeof window.cep !== 'undefined' && window.cep.util) {
       window.cep.util.openURLInDefaultBrowser(fontToolUrl);
     }
   });
   ```
   - 在**外部浏览器**中打开 Builder Web UI
   - 外部浏览器与 CEP 环境**完全隔离**

2. **Builder Web UI 的后端服务**（`web-ui/server/server.cjs`）：
   - 需要运行 Node.js HTTP 服务器（`node server.cjs`）
   - 监听 `http://127.0.0.1:3000`
   - 提供 `/api/upload`, `/api/convert`, `/api/status` 等端点

3. **问题根源**：
   - 用户从 CEP 点击"生成新字体"
   - 打开外部浏览器访问 `http://localhost:3000`
   - **如果 Builder Web UI 服务器未启动**：
     - 浏览器显示"无法访问此网站"
     - 或显示缓存的静态页面（无后端连接）
   - **即使服务器启动**：
     - 外部浏览器生成的字体包写入正确目录
     - 但 CEP 可能因为轮询间隔（2秒）未立即检测到
     - 或者用户看到的是浏览器缓存的旧页面

## 证据收集计划（Step A）

### A1. 确认 Builder Web UI 服务器状态

**目标**：确认用户点击"生成新字体"时，Builder Web UI 服务器是否在运行

**检查方法**：
```bash
# 检查端口 3000 是否被监听
lsof -i :3000

# 或使用 netstat
netstat -an | grep 3000
```

**预期结果**：
- 如果服务器运行：显示 `node` 进程监听 `127.0.0.1:3000`
- 如果服务器未运行：无输出

### A2. 添加前端日志（app.js）

在 `web-ui/public/app.js` 的关键位置添加日志：

```javascript
// 页面加载时
window.addEventListener('DOMContentLoaded', () => {
  console.log('[Evidence] Page URL:', window.location.href);
  console.log('[Evidence] Page loaded at:', new Date().toISOString());
  loadHistory();
  updateSummary();
});

// 转换按钮点击时
convertBtn.addEventListener('click', async () => {
  console.log('[Evidence] Convert button clicked');
  console.log('[Evidence] Selected file:', selectedFile ? selectedFile.name : 'null');
  console.log('[Evidence] Font name:', fontNameInput.value);
  console.log('[Evidence] Request URL:', window.location.origin + '/api/convert');
  
  // ... existing code ...
});

// 请求转换时
async function requestConversion(fileId, fontName, retries = 3) {
  console.log('[Evidence] Requesting conversion:', {
    fileId,
    fontName,
    requestUrl: '/api/convert',
    timestamp: new Date().toISOString()
  });
  
  // ... existing code ...
  
  const response = await fetch('/api/convert', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ fileId, fontName, options })
  });
  
  console.log('[Evidence] Convert response status:', response.status);
  const result = await response.json();
  console.log('[Evidence] Convert response:', result);
  
  return result;
}

// 显示成功结果时
function displaySuccess(result) {
  console.log('[Evidence] Display success called');
  console.log('[Evidence] Build info:', result.buildInfo);
  console.log('[Evidence] Manifest:', result.manifest);
  
  // ... existing code ...
}
```

### A3. 添加后端日志（conversion-service.js）

在 `web-ui/services/conversion-service.js` 的 `convert()` 方法中添加详细日志：

```javascript
async convert(inputPath, fontName, options = {}) {
  try {
    console.log('[Evidence] ========== Conversion Start ==========');
    console.log('[Evidence] Input path (absolute):', path.resolve(inputPath));
    console.log('[Evidence] Font name:', fontName);
    console.log('[Evidence] Options:', JSON.stringify(options, null, 2));
    
    // 验证输入文件
    await this.validateFont(inputPath);
    
    // 准备输出目录
    const outputDir = path.join(this.outputBaseDir, 'user-font-pack');
    console.log('[Evidence] Output dir (absolute):', path.resolve(outputDir));
    console.log('[Evidence] Output dir exists before cleanup:', fs.existsSync(outputDir));
    
    // 清理旧文件
    if (fs.existsSync(outputDir)) {
      console.log('[Evidence] Cleaning old font pack...');
      fs.rmSync(outputDir, { recursive: true, force: true });
      console.log('[Evidence] Cleanup complete, dir exists:', fs.existsSync(outputDir));
    }
    
    // 执行转换
    console.log('[Evidence] Executing builder...');
    const result = await this.executeBuilder(args);
    console.log('[Evidence] Builder execution complete');
    
    // 验证输出
    await this.validateOutput(outputDir);
    console.log('[Evidence] Output validation complete');
    
    // 列出生成的文件
    const files = fs.readdirSync(outputDir);
    console.log('[Evidence] Generated files:');
    files.forEach(file => {
      const filePath = path.join(outputDir, file);
      const stats = fs.statSync(filePath);
      console.log(`  - ${file}: ${stats.size} bytes, mtime: ${stats.mtime.toISOString()}`);
    });
    
    // 生成 build-info
    const buildInfo = await this.generateBuildInfo(inputPath, outputDir, fontName, options);
    console.log('[Evidence] Build info generated:', {
      buildHash: buildInfo.buildHash.substring(0, 8),
      buildTime: buildInfo.buildTime,
      fontPackName: buildInfo.fontPackName
    });
    
    console.log('[Evidence] ========== Conversion Complete ==========');
    
    return { success: true, manifest, report, buildInfo, outputDir };
    
  } catch (error) {
    console.error('[Evidence] ========== Conversion Failed ==========');
    console.error('[Evidence] Error:', error);
    throw error;
  }
}
```

### A4. 添加缓存日志（cache-service.js）

在 `web-ui/services/cache-service.js` 中添加日志：

```javascript
async get(inputPath, options) {
  const cacheKey = this.generateCacheKey(inputPath, options);
  console.log('[Evidence] Cache lookup:', {
    cacheKey: cacheKey.substring(0, 16),
    inputPath,
    options
  });
  
  // ... existing code ...
  
  if (cacheEntry) {
    console.log('[Evidence] Cache HIT:', {
      cacheKey: cacheKey.substring(0, 16),
      timestamp: cacheEntry.timestamp
    });
  } else {
    console.log('[Evidence] Cache MISS:', {
      cacheKey: cacheKey.substring(0, 16)
    });
  }
  
  return cacheEntry ? cacheEntry.result : null;
}
```

## 验证步骤

### 步骤 1：检查服务器状态

```bash
# 在终端运行
cd math-formula-plugin/tools/font-pack-builder/web-ui
lsof -i :3000
```

**预期输出**：
- 如果服务器运行：`node ... server.cjs`
- 如果服务器未运行：无输出

### 步骤 2：启动服务器（如果未运行）

```bash
cd math-formula-plugin/tools/font-pack-builder/web-ui
bash start-ui.sh
```

### 步骤 3：从 CEP 生成 test3

1. 打开 CEP 扩展
2. 点击"字体选项-更多" → "生成新字体"
3. 在打开的浏览器中：
   - 选择字体文件
   - 输入名称：test3
   - 点击"开始转换"
4. **观察浏览器控制台**（F12 → Console）
5. **观察终端日志**（运行 start-ui.sh 的终端）

### 步骤 4：收集证据

从浏览器控制台复制：
- `[Evidence]` 开头的所有日志
- 特别关注：
  - Page URL（file:// 还是 http://？）
  - Request URL 和 response
  - Build info 中的 buildHash 和 buildTime

从终端复制：
- `[Evidence]` 和 `[ConversionService]` 开头的所有日志
- 特别关注：
  - Input path (absolute)
  - Output dir (absolute)
  - Generated files 列表
  - Cache 状态

### 步骤 5：验证文件系统

```bash
# 检查 user-font-pack 目录
ls -la math-formula-plugin/public/fonts/user-font-pack/

# 查看 build-info.json
cat math-formula-plugin/public/fonts/user-font-pack/build-info.json | jq '.buildTime, .fontPackName, .buildHash'

# 查看 manifest.json
cat math-formula-plugin/public/fonts/user-font-pack/manifest.json | jq '.name, .buildId, .createdAt'
```

## 预期问题场景

### 场景 A：服务器未启动

**症状**：
- 浏览器显示"无法访问此网站"或空白页
- 无法上传文件或点击转换按钮无响应

**解决方案**：
- 启动 Builder Web UI 服务器
- 或改用 CLI 桥接方案（推荐）

### 场景 B：浏览器缓存问题

**症状**：
- Page URL 是 `file:///...` 而不是 `http://localhost:3000`
- 页面显示旧数据（test1）
- 点击转换按钮无网络请求

**解决方案**：
- 清除浏览器缓存
- 强制刷新（Cmd+Shift+R）
- 或改用 CLI 桥接方案（推荐）

### 场景 C：缓存命中导致未重新生成

**症状**：
- 转换成功但文件未更新
- Cache HIT 日志出现
- buildTime 和 test2 相同

**解决方案**：
- 点击"清除缓存"按钮
- 或修改字符集选项强制重新生成

### 场景 D：输出目录路径错误

**症状**：
- 转换成功但文件写入错误位置
- Output dir (absolute) 路径不正确

**解决方案**：
- 检查 `conversion-service.js` 中的 `outputBaseDir` 路径
- 确保相对路径计算正确

## 下一步行动

**在收集完证据后**，根据实际情况选择修复方案：

### 方案 A：修复嵌入式 Web UI（如果服务器正常运行）

适用于：服务器运行正常，但 CEP 未检测到更新

**修复内容**：
1. 增强 CEP 轮询机制的日志
2. 缩短轮询间隔（从 2 秒改为 1 秒）
3. 添加手动刷新提示

### 方案 B：CLI 桥接方案（推荐）

适用于：服务器未启动或浏览器缓存问题频繁

**修复内容**：
1. 在 `extension/host/illustrator.jsx` 添加 JSX 函数：
   ```javascript
   function generateFontPack(fontPath, packName) {
     // 调用 builder CLI
     // 返回生成结果
   }
   ```

2. 在 `src/lib/illustrator-bridge.ts` 添加方法：
   ```typescript
   async generateFontPack(fontPath: string, packName: string): Promise<GenerateResult>
   ```

3. 修改 CEP UI 的"生成新字体"按钮：
   - 显示文件选择对话框
   - 调用 JSX 桥接函数
   - 等待生成完成
   - 自动触发"更新字体信息"

**优势**：
- 无需启动 HTTP 服务器
- 无浏览器缓存问题
- 生成完成后自动刷新 CEP
- 更稳定可靠

## 总结

当前问题的核心是：**CEP "生成新字体" 功能依赖外部浏览器和 HTTP 服务器，导致不稳定**。

**推荐方案**：采用 CLI 桥接方案（方案 B），彻底解决架构问题。

**临时方案**：如果用户需要立即使用，可以：
1. 手动启动 Builder Web UI 服务器
2. 从浏览器生成字体包
3. 返回 CEP 点击"更新字体信息"
