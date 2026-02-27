# Task 19.19 Cache Fix - Complete

## 问题总结

### 根本原因
缓存键生成逻辑**缺少 `fontName` 参数**，导致：
- 相同字体文件 + 相同选项 = 相同缓存键
- 不同的 `fontName`（test1, test2, test3）会命中同一个缓存条目
- 用户请求 test3，但返回了 test1 的缓存结果

### 证据
从浏览器控制台日志可以看到：

**用户请求**：
```javascript
Font name: test3
Charset options: {enableOptional: true, enableAdvanced: true, enableTextSymbols: true}
```

**缓存返回**（3.8 小时前的 test1）：
```javascript
Cache HIT ✓
Entry age: 230.7 minutes
Build Info: {fontPackName: 'test1', buildTime: '2026-02-27T02:08:09.206Z'}
Manifest: {name: 'test1', buildId: 'f9410c2293b808fb'}
```

**实际文件内容**（test2）：
```json
// build-info.json
{
  "fontPackName": "test2",
  "buildTime": "2026-02-27T02:18:35.936Z"
}

// manifest.json
{
  "name": "test2",
  "buildId": "369db04aa0f1c968"
}
```

## 修复方案

### 修改 1: `cache-service.js` - `generateCacheKey()`
**位置**: `math-formula-plugin/tools/font-pack-builder/web-ui/services/cache-service.js`

**修改前**：
```javascript
generateCacheKey(fileHash, options) {
  // ...
  const combined = `${fileHash}:${optionsStr}:${toolVersion}`;
  // ...
}
```

**修改后**：
```javascript
generateCacheKey(fileHash, fontName, options) {
  // ...
  // 【修复】缓存键包含 fontName，防止不同名称的字体包互相干扰
  const combined = `${fileHash}:${fontName}:${optionsStr}:${toolVersion}`;
  // ...
}
```

### 修改 2: `cache-service.js` - `get()` 方法
**位置**: 同上

**修改前**：
```javascript
async get(filePath, options) {
  // ...
  const cacheKey = this.generateCacheKey(fileHash, options);
  // ...
}
```

**修改后**：
```javascript
async get(filePath, fontName, options) {
  // ...
  const cacheKey = this.generateCacheKey(fileHash, fontName, options);
  
  // 【证据收集 A4】缓存查询
  console.log('[Evidence] ========== Cache Lookup ==========');
  console.log('[Evidence] Font name:', fontName);
  // ...
}
```

### 修改 3: `cache-service.js` - `set()` 方法
**位置**: 同上

**修改前**：
```javascript
async set(filePath, options, result) {
  // ...
  const cacheKey = this.generateCacheKey(fileHash, options);
  // ...
}
```

**修改后**：
```javascript
async set(filePath, fontName, options, result) {
  // ...
  const cacheKey = this.generateCacheKey(fileHash, fontName, options);
  
  // 【证据收集 A5】缓存保存
  console.log('[Evidence] ========== Cache Save ==========');
  console.log('[Evidence] Font name:', fontName);
  // ...
  
  // 记录 fontName 到索引用于调试
  index.entries.push({
    key: cacheKey,
    fileHash,
    fontName, // 新增
    options,
    // ...
  });
}
```

### 修改 4: `server.cjs` - `executeConversion()` 函数
**位置**: `math-formula-plugin/tools/font-pack-builder/web-ui/server/server.cjs`

**修改前**：
```javascript
// Line ~50
const cachedResult = await cacheService.get(inputPath, options);

// Line ~80
await cacheService.set(inputPath, options, result);
```

**修改后**：
```javascript
// Line ~50
const cachedResult = await cacheService.get(inputPath, fontName, options);

// Line ~80
await cacheService.set(inputPath, fontName, options, result);
```

### 修改 5: `server.cjs` - `startServer()` 函数（自动清除缓存）
**位置**: 同上

**新增功能**：
```javascript
async function startServer() {
  try {
    // 【自动清除缓存】每次启动时清除缓存，确保 CEP 生成新字体时不会命中旧缓存
    console.log('Clearing cache on startup...');
    try {
      await cacheService.clear();
      console.log('Cache cleared successfully');
    } catch (error) {
      console.warn('Failed to clear cache on startup:', error.message);
      // 不阻止服务器启动
    }
    
    // 查找可用端口
    const port = await findAvailablePort();
    // ...
  }
}
```

**原因**：
- CEP 每次点击"生成新字体"按钮时，会启动 Web UI 服务
- 自动清除缓存确保每次生成都是全新的，不会受旧缓存影响
- 即使清除失败也不会阻止服务器启动，保证可用性

## 验证步骤

### 1. 重启 Web UI
从 CEP 点击"生成新字体"按钮，或手动运行：
```bash
cd math-formula-plugin/tools/font-pack-builder/web-ui
bash start-ui.sh
```

**预期终端输出**：
```
Clearing cache on startup...
Cache cleared successfully
======================================
  Font Pack Builder Web UI
======================================
```

### 2. 生成 test3
1. 上传相同的字体文件（puzzlettf260226.ttf）
2. 字体包名称：test3
3. 选项：与 test1 相同（enableOptional: true, enableAdvanced: true, enableTextSymbols: true）
4. 点击"转换"

### 3. 预期结果
**缓存行为**：
```
[Evidence] ========== Cache Lookup ==========
[Evidence] Font name: test3
[Evidence] Cache MISS - No entry found
```

**生成结果**：
```json
// build-info.json
{
  "fontPackName": "test3",
  "buildTime": "2026-02-27T10:XX:XX.XXXZ",
  "buildHash": "<new-hash>"
}

// manifest.json
{
  "name": "test3",
  "buildId": "<new-build-id>",
  "createdAt": "2026-02-27T10:XX:XX.XXXZ"
}
```

### 4. CEP 验证
1. 重新构建 CEP：`bash scripts/build-cep-prod.sh`
2. 重启 Illustrator
3. 打开 CEP 扩展
4. 验证字体选择器显示 "test3"

## 技术细节

### 缓存键组成（修复后）
```
MD5(fileHash:fontName:optionsStr:toolVersion)
```

**示例**：
- test1: `MD5(4d4fd751...:test1:{"enableOptional":true,...}:1.0.0)` → `abc123...`
- test2: `MD5(4d4fd751...:test2:{"enableOptional":true,...}:1.0.0)` → `def456...`
- test3: `MD5(4d4fd751...:test3:{"enableOptional":true,...}:1.0.0)` → `ghi789...`

### 为什么需要包含 fontName？
1. **用户意图不同**：即使字体文件和选项相同，用户可能想要生成不同名称的字体包
2. **输出目录不同**：不同的 fontName 会生成到不同的目录
3. **manifest.json 不同**：manifest 中的 `name` 字段会不同
4. **build-info.json 不同**：build-info 中的 `fontPackName` 字段会不同

### 为什么启动时自动清除缓存？
1. **CEP 使用场景**：每次点击"生成新字体"都应该是全新生成
2. **避免混淆**：用户不需要手动清除缓存，减少操作步骤
3. **简化流程**：启动即清除，确保每次生成都是最新的
4. **容错设计**：清除失败不会阻止服务器启动

### 证据收集增强
修复后的代码包含详细的证据日志：
- `[Evidence]` 标记所有关键信息
- 缓存查询时记录 fontName
- 缓存保存时记录 fontName
- 缓存命中/未命中的原因

## 相关文件

### 修改的文件
- `math-formula-plugin/tools/font-pack-builder/web-ui/services/cache-service.js`
- `math-formula-plugin/tools/font-pack-builder/web-ui/server/server.cjs`

### 相关文档
- `math-formula-plugin/docs/task-19.19-cep-builder-bug-investigation.md` - 问题调查报告
- `math-formula-plugin/docs/task-19.19-evidence-collection-ready.md` - 证据收集指南

## 状态
✅ **修复完成** - 2026-02-27

等待用户验证：
1. 重启 Web UI（自动清除缓存）
2. 生成 test3
3. 验证 CEP 读取
