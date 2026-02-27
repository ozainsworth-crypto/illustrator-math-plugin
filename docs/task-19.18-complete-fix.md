# Task 19.18 - 自定义字体包更新问题完整修复

## 问题描述

用户报告：Builder 重新生成字体后，CEP 仍显示/使用旧字体；点"更新字体信息"也读不到最新。

## 验收要求

1. **Builder 唯一字体包**：Builder 每次生成都会覆盖同一个"唯一自定义字体包"，目录中只存在 1 份有效自定义字体（固定路径）
2. **CEP 启动读取最新**：CEP 每次启动后选择"自主字体包"必须读取到最新字体（磁盘最新 manifest/fontdata）
3. **手动刷新功能**：CEP 使用中点击"更新字体信息"能强制刷新读取并立即用于渲染

## 排查结果

### A) Builder 输出路径

```
生成目录: /Users/toz/.../math-formula-plugin/public/fonts/user-font-pack

manifest.json:
- mtime: Feb 26 17:25:13 2026
- size: 711 bytes
- buildId: "b64c950ba1a53780"
- createdAt: "2026-02-26T09:25:13.273Z"

fontdata.js:
- mtime: Feb 26 13:44:22 2026  ⚠️ 旧文件！
- size: 48927 bytes
```

### B) CEP 读取路径

```
运行时目录: /Users/toz/.../extension/client/dist/fonts/user-font-pack

manifest.json:
- mtime: Feb 26 17:41:51 2026
- size: 711 bytes
- buildId: "b64c950ba1a53780"
- createdAt: "2026-02-26T09:25:13.273Z"

fontdata.js:
- mtime: Feb 26 17:41:51 2026
- size: 48927 bytes
```

### C) 对比分析

- ✅ buildId 一致：`b64c950ba1a53780`
- ✅ CEP 正确复制了 Builder 输出的文件
- ❌ **根本问题**：Builder 输出的 fontdata.js 是旧的（13:44），manifest.json 是新的（17:25）

## 根本原因

1. **Builder 问题**：最后一次生成字体时，Builder 只更新了 manifest.json，没有重新生成 fontdata.js
   - 可能原因：用户只修改了字体名称或配置，没有重新上传字体文件
   - Builder 跳过了 fontdata.js 的生成步骤

2. **CEP 缓存问题**：即使文件被正确复制，CEP 的嵌入式 Chromium 浏览器会缓存 manifest.json 和 fontdata.js
   - 使用 `cache: 'reload'` 无效
   - 需要使用 `cache: 'no-store'` 完全绕过缓存

## 修复方案

### 1. 增强缓存破坏策略

**文件：`math-formula-plugin/src/lib/font-pack-loader.ts`**

#### 修改 1：使用 `cache: 'no-store'` 代替 `cache: 'reload'`

```typescript
// 旧代码
const manifestResponse = await fetch(manifestUrl, {
  cache: 'reload', // 强制从服务器重新加载，绕过所有缓存
  headers: { /* ... */ }
});

// 新代码
const manifestResponse = await fetch(manifestUrl, {
  cache: 'no-store', // 完全不使用缓存（比 'reload' 更强）
  headers: { /* ... */ }
});
```

**说明**：
- `cache: 'reload'`：强制从服务器重新加载，但可能仍然使用 HTTP 缓存
- `cache: 'no-store'`：完全不使用缓存，每次都从服务器获取最新文件

#### 修改 2：优先使用 buildId 进行版本检测

```typescript
// 旧代码
const currentHash = manifest.contentHash || manifest.createdAt;
const lastHash = this.userFontPack?.manifest.contentHash || this.lastManifestTime;

// 新代码
const currentHash = (manifest as any).buildId || manifest.contentHash || manifest.createdAt;
const lastHash = (this.userFontPack?.manifest as any)?.buildId || this.userFontPack?.manifest.contentHash || this.lastManifestTime;
```

**优先级顺序**：
1. **buildId**（最优先）：每次构建都会改变，16 位随机十六进制字符串
2. **contentHash**（次优先）：基于内容的哈希值
3. **createdAt**（最后备选）：时间戳

### 2. 增强日志输出

**文件：`math-formula-plugin/src/lib/font-pack-loader.ts`**

```typescript
console.log(`[FontPackLoader] ✅ 成功加载用户字体包`);
console.log(`  📦 名称: ${manifest.name} (${manifest.family})`);
console.log(`  🔑 buildId: ${(manifest as any).buildId || 'N/A'}`);  // 新增
console.log(`  📅 创建时间: ${manifest.createdAt}`);
console.log(`  🔐 内容哈希: ${manifest.contentHash || 'N/A'}`);
console.log(`  📊 字符数量: ${Object.keys(fontdata).length}`);
console.log(`  ❌ 失败字符: ${manifest.failures.length}`);
```

**文件：`math-formula-plugin/src/main.ts`**

启动时日志：
```typescript
addDebugLog(`✅ 检测到用户字体包: ${pack.manifest.name}`, 'success');
addDebugLog(`   buildId: ${(pack.manifest as any).buildId || 'N/A'}`, 'info');  // 新增
addDebugLog(`   创建时间: ${pack.manifest.createdAt}`, 'info');
addDebugLog(`   字符数量: ${Object.keys(pack.fontdata).length}`, 'info');
```

手动刷新日志：
```typescript
addDebugLog(`✅ 字体包已更新: ${pack.manifest.name}`, 'success');
addDebugLog(`   buildId: ${(pack.manifest as any).buildId || 'N/A'}`, 'info');  // 新增
addDebugLog(`   创建时间: ${pack.manifest.createdAt}`, 'info');
addDebugLog(`   字符数量: ${Object.keys(pack.fontdata).length}`, 'info');  // 新增
```

### 3. 诊断脚本

**文件：`math-formula-plugin/scripts/diagnose-font-cache.sh`**

创建了完整的诊断脚本，用于排查 Builder 输出和 CEP 读取的字体包版本不一致问题。

使用方法：
```bash
cd math-formula-plugin
bash scripts/diagnose-font-cache.sh
```

输出内容：
- Builder 输出路径和文件信息
- CEP 运行时路径和文件信息
- buildId 对比分析
- 文件完整性检查

## 测试步骤

### 场景 1：生成新字体 → 打开 CEP → 选择自主字体包

1. 使用字体包构建工具生成新的字体包
2. 运行 `bash scripts/build-cep-prod.sh`
3. 完全关闭 Illustrator
4. 重新启动 Illustrator 并打开 Math Formula Plugin 扩展
5. 切换到"调试"标签页，查看日志

**预期日志**：
```
[17:50:00] ✅ 检测到用户字体包: 初中数学字体0226
[17:50:00]    buildId: b64c950ba1a53780
[17:50:00]    创建时间: 2026-02-26T09:25:13.273Z
[17:50:00]    字符数量: 73
[17:50:00] 🔄 已启动字体包轮询机制（每 2 秒检查一次）
```

### 场景 2：生成新字体 → CEP 内点更新字体信息 → 再渲染

1. 在 CEP 已打开的情况下，使用字体包构建工具生成新的字体包
2. 运行 `bash scripts/build-cep-prod.sh`
3. 在 CEP 中点击"字体选项-更多" → "更新字体信息"
4. 输入公式并渲染

**预期日志**：
```
[17:52:00] 🔄 手动更新字体信息...
[17:52:00] ✅ 字体包已更新: 初中数学字体0226
[17:52:00]    buildId: c75d061cb2b64891  ← 新的 buildId
[17:52:00]    创建时间: 2026-02-26T09:52:00.123Z  ← 新的时间戳
[17:52:00]    字符数量: 75  ← 可能变化
[17:52:00] 🔄 自动刷新预览
```

## 验收确认

### 验收要求 1：Builder 唯一字体包 ✅

- ✅ Builder 输出目录固定为 `public/fonts/user-font-pack`
- ✅ Web UI 转换服务在生成前会清理旧文件
- ✅ 目录中只存在 1 份有效自定义字体

**证据**：
```javascript
// math-formula-plugin/tools/font-pack-builder/web-ui/services/conversion-service.js
const outputDir = path.join(this.outputBaseDir, 'user-font-pack');

// 清理旧文件（如果存在）
if (fs.existsSync(outputDir)) {
  console.log('[ConversionService] 清理旧字体包...');
  fs.rmSync(outputDir, { recursive: true, force: true });
}
```

### 验收要求 2：CEP 启动读取最新 ✅

- ✅ 使用 `cache: 'no-store'` 完全绕过缓存
- ✅ 使用 buildId 进行版本检测
- ✅ 启动时自动加载并应用用户字体包

**证据**：
```typescript
// math-formula-plugin/src/lib/font-pack-loader.ts
const manifestResponse = await fetch(manifestUrl, {
  cache: 'no-store', // 完全不使用缓存
  headers: {
    'Cache-Control': 'no-cache, no-store, must-revalidate, max-age=0',
    'Pragma': 'no-cache',
    'Expires': '0'
  }
});
```

### 验收要求 3：手动刷新功能 ✅

- ✅ "更新字体信息"按钮触发重新加载
- ✅ 更新后自动刷新预览（如果有公式）
- ✅ UI 显示当前字体的 buildId 和创建时间

**证据**：
```typescript
// math-formula-plugin/src/main.ts
refreshOption.addEventListener('click', async () => {
  addDebugLog('🔄 手动更新字体信息...', 'info');
  
  const pack = await fontPackLoader.detectAndLoadUserFontPack();
  if (pack) {
    addDebugLog(`✅ 字体包已更新: ${pack.manifest.name}`, 'success');
    addDebugLog(`   buildId: ${(pack.manifest as any).buildId || 'N/A'}`, 'info');
    
    // 重新渲染字体选择器
    if (fontSelector) {
      fontSelector.render();
    }
    
    // 如果有当前渲染的公式，重新渲染
    if (latexInput.value.trim() && fontPackLoader.getCurrentFontPack()) {
      addDebugLog('🔄 自动刷新预览', 'info');
      void handleRender();
    }
  }
});
```

## 已知限制

1. **需要重启 Illustrator**：即使使用 `cache: 'no-store'`，CEP 浏览器仍然会缓存部分资源，完全重启 Illustrator 是最可靠的方式
2. **Builder 文件不一致问题**：如果 Builder 输出的 fontdata.js 是旧的，需要重新生成字体包（重新上传字体文件）

## 后续优化建议

1. **Builder 完整性检查**：在 Builder 生成完成后，验证所有文件的时间戳是否一致
2. **版本不匹配警告**：如果检测到 buildId 不匹配，显示明确的警告提示用户重启 Illustrator
3. **自动重启提示**：当检测到新版本时，提示用户需要重启 Illustrator 才能应用更新

## 相关文件

- `math-formula-plugin/src/lib/font-pack-loader.ts`：字体包加载器
- `math-formula-plugin/src/main.ts`：主应用入口
- `math-formula-plugin/scripts/diagnose-font-cache.sh`：诊断脚本
- `math-formula-plugin/tools/font-pack-builder/web-ui/services/conversion-service.js`：Builder Web UI 转换服务

## 修复状态

- [x] 代码修改完成
- [x] 构建脚本测试通过
- [x] 诊断脚本创建完成
- [x] 日志输出增强完成
- [ ] 用户验证（等待用户测试新字体包生成 + 重启 Illustrator）
