# Task 19.18 - Builder 不完整生成问题（第三轮修复）

## 问题描述

用户报告：使用 Builder Web UI 生成新字体包后，CEP 仍然显示/使用旧字体，即使点击"更新字体信息"也无法读取最新字体。

## 根本原因分析（第三轮）

### 前两轮修复回顾

**第一轮修复**：
- 问题：`FontSelector` UI 组件没有监听字体包更新事件
- 修复：在 `main.ts` 中注册 `fontPackLoader.onFontPackUpdated()` 回调
- 状态：✅ 已完成

**第二轮修复**：
- 问题：CEP 环境的 Chromium 浏览器对 manifest.json 进行了激进的 HTTP 缓存
- 修复：使用三重缓存破解参数（`_t`, `_r`, `_n`）+ `cache: 'no-store'`
- 状态：✅ 已完成

### 第三轮问题发现

根据用户提供的日志和文件时间戳分析：

```
Builder 输出目录: math-formula-plugin/public/fonts/user-font-pack/

manifest.json:          Feb 26 17:25:13 2026  ← 新文件 ✅
fontdata.js:            Feb 26 13:44:22 2026  ← 旧文件 ❌
capabilities.json:      Feb 26 13:44:22 2026  ← 旧文件 ❌
report.json:            Feb 26 13:44:22 2026  ← 旧文件 ❌
replacement-report.json: Feb 26 13:44:22 2026  ← 旧文件 ❌
```

**关键发现**：
1. 只有 `manifest.json` 被更新（17:25）
2. 所有其他文件都是旧的（13:44）
3. CEP 读取到的 buildId 是 `b64c950ba1a53780`（与 manifest.json 一致）
4. 但 fontdata.js 的内容是旧的（13:44 的版本）

**结论**：
- **Builder 本身没有被正确调用，或者调用失败了**
- Web UI 可能只更新了 manifest.json，但没有重新生成其他文件
- 这不是 CEP 缓存问题，而是 Builder 输出不完整的问题

## 可能的原因

### 原因 1：Builder Web UI 使用了缓存

查看 `web-ui/services/conversion-service.js`：

```javascript
// 清理旧文件（如果存在）
if (fs.existsSync(outputDir)) {
  console.log('[ConversionService] 清理旧字体包...');
  fs.rmSync(outputDir, { recursive: true, force: true });
}
```

这段代码应该会清理旧文件，但可能：
- 清理失败（权限问题）
- 清理被跳过（某种条件判断）
- 清理后 Builder 调用失败

### 原因 2：Builder 调用失败但没有报错

查看 `web-ui/server/server.cjs` 的 `executeConversion` 函数：

```javascript
// 检查缓存
const cachedResult = await cacheService.get(inputPath, options);

if (cachedResult) {
  console.log('Using cached result for conversion');
  // 使用缓存结果
  jobQueue.setCompleted(jobId, cachedResult);
  return;
}
```

**可能的问题**：
- 缓存服务返回了旧的结果
- 缓存的 manifest.json 被更新了，但 fontdata.js 等文件没有被更新
- 缓存键（cache key）计算不正确，导致使用了错误的缓存

### 原因 3：用户操作问题

用户可能：
1. 只修改了字体名称，没有重新上传字体文件
2. Web UI 检测到字体文件没有变化，跳过了 fontdata.js 的生成
3. 只更新了 manifest.json 的元数据

## 修复方案

### 方案 1：强制清理缓存并重新生成（推荐）

创建诊断和修复脚本：

1. **诊断脚本**：`scripts/diagnose-builder-output.sh`
   - 检查 Builder 输出目录的文件时间戳
   - 比较 manifest.json 和 fontdata.js 的时间戳
   - 检查 CEP 运行时目录的文件
   - 输出详细的诊断信息

2. **修复脚本**：`scripts/force-rebuild-font-pack.sh`
   - 读取现有 manifest.json 的字体名称
   - 提示用户提供原始字体文件路径
   - 完全删除旧的输出目录
   - 调用 Builder 重新生成所有文件
   - 验证所有文件的时间戳一致

### 方案 2：修复 Builder Web UI 的缓存逻辑

修改 `web-ui/services/cache-service.js`：

```javascript
// 缓存键应该包含字体文件的哈希值
const cacheKey = await this.generateCacheKey(inputPath, options);

// 生成缓存键时，计算字体文件的 SHA256 哈希
async generateCacheKey(inputPath, options) {
  const fileBuffer = await fs.promises.readFile(inputPath);
  const hash = crypto.createHash('sha256').update(fileBuffer).digest('hex');
  const optionsHash = crypto.createHash('sha256').update(JSON.stringify(options)).digest('hex');
  return `${hash}-${optionsHash}`;
}
```

### 方案 3：禁用 Builder Web UI 的缓存（临时方案）

修改 `web-ui/server/server.cjs`：

```javascript
// 注释掉缓存检查
// const cachedResult = await cacheService.get(inputPath, options);
// if (cachedResult) { ... }

// 始终执行完整的转换
const result = await conversionService.convert(inputPath, fontName, options);
```

## 实施步骤

### 步骤 1：诊断当前状态

```bash
cd math-formula-plugin
bash scripts/diagnose-builder-output.sh
```

预期输出：
- Builder 输出目录的文件列表和时间戳
- manifest.json 和 fontdata.js 的时间戳对比
- buildId 和 createdAt 信息
- CEP 运行时目录的状态

### 步骤 2：强制重新生成字体包

```bash
cd math-formula-plugin
bash scripts/force-rebuild-font-pack.sh
```

脚本会：
1. 读取现有字体包名称
2. 提示用户提供原始字体文件路径
3. 完全删除旧的输出目录
4. 调用 Builder 重新生成
5. 验证所有文件的时间戳一致

### 步骤 3：重新构建 CEP

```bash
cd math-formula-plugin
bash scripts/build-cep-prod.sh
```

### 步骤 4：验证修复

1. 完全重启 Illustrator
2. 打开 Math Formula Plugin 扩展
3. 切换到"调试"标签页
4. 查看日志中的 buildId 和 createdAt
5. 验证与 manifest.json 一致

预期日志：
```
[18:30:00] ✅ 检测到用户字体包: 初中数学字体0226
[18:30:00]    buildId: <新的 buildId>
[18:30:00]    创建时间: <新的时间戳>
[18:30:00]    字符数量: 73
```

## 验收标准

1. ✅ Builder 输出目录中所有文件的时间戳一致
2. ✅ manifest.json 和 fontdata.js 的 mtime 相同
3. ✅ CEP 读取到的 buildId 与最新的 manifest.json 一致
4. ✅ CEP 渲染使用的是最新的 fontdata.js
5. ✅ 用户可以看到新字体的渲染效果

## 后续优化建议

### 1. 增强 Builder Web UI 的错误处理

在 `web-ui/services/conversion-service.js` 中：

```javascript
async convert(inputPath, fontName, options = {}) {
  try {
    // 清理旧文件（如果存在）
    if (fs.existsSync(outputDir)) {
      console.log('[ConversionService] 清理旧字体包...');
      fs.rmSync(outputDir, { recursive: true, force: true });
      
      // 验证清理成功
      if (fs.existsSync(outputDir)) {
        throw new Error('Failed to clean old font pack directory');
      }
    }
    
    // 执行转换
    const result = await this.executeBuilder(args);
    
    // 验证所有文件都已生成
    const requiredFiles = ['manifest.json', 'fontdata.js', 'capabilities.json', 'report.json'];
    for (const file of requiredFiles) {
      const filePath = path.join(outputDir, file);
      if (!fs.existsSync(filePath)) {
        throw new Error(`Required file not generated: ${file}`);
      }
    }
    
    // 验证文件时间戳一致性
    const manifestTime = fs.statSync(path.join(outputDir, 'manifest.json')).mtime;
    const fontdataTime = fs.statSync(path.join(outputDir, 'fontdata.js')).mtime;
    
    if (Math.abs(manifestTime - fontdataTime) > 1000) { // 允许 1 秒误差
      console.warn('[ConversionService] Warning: File timestamps are inconsistent');
    }
    
    return result;
  } catch (error) {
    console.error('Conversion error:', error);
    throw error;
  }
}
```

### 2. 添加 Builder 输出验证

在 `tools/font-pack-builder/src/font-pack-builder.js` 的 `build()` 方法末尾：

```javascript
async build() {
  // ... 现有代码 ...
  
  // 验证所有文件都已生成
  const requiredFiles = [
    'manifest.json',
    'fontdata.js',
    'capabilities.json',
    'report.json',
    'replacement-report.json'
  ];
  
  for (const file of requiredFiles) {
    const filePath = path.join(this.outputDir, file);
    if (!fs.existsSync(filePath)) {
      throw new Error(`Failed to generate required file: ${file}`);
    }
  }
  
  console.log('✓ 所有必需文件已生成');
  
  return manifest;
}
```

### 3. 禁用或修复缓存机制

如果缓存导致问题，考虑：

**选项 A**：完全禁用缓存（最简单）

```javascript
// 在 web-ui/server/server.cjs 中注释掉缓存检查
// const cachedResult = await cacheService.get(inputPath, options);
```

**选项 B**：修复缓存键生成逻辑

```javascript
// 缓存键应该包含字体文件的内容哈希
const fileHash = await this.calculateFileHash(inputPath);
const cacheKey = `${fileHash}-${JSON.stringify(options)}`;
```

## 相关文件

- `math-formula-plugin/scripts/diagnose-builder-output.sh`（新增）
- `math-formula-plugin/scripts/force-rebuild-font-pack.sh`（新增）
- `math-formula-plugin/tools/font-pack-builder/web-ui/services/conversion-service.js`
- `math-formula-plugin/tools/font-pack-builder/web-ui/server/server.cjs`
- `math-formula-plugin/tools/font-pack-builder/src/font-pack-builder.js`
- `math-formula-plugin/docs/task-19.18-complete-fix.md`（前两轮修复文档）

## 修复状态

- [x] 创建诊断脚本（`diagnose-builder-output.sh`）
- [x] 创建修复脚本（`force-rebuild-font-pack.sh`）
- [x] 编写修复文档
- [ ] 用户执行诊断脚本
- [ ] 用户执行修复脚本
- [ ] 用户验证修复结果
- [ ] 根据验证结果决定是否需要修改 Builder Web UI 代码

## 用户操作指南

### 立即修复步骤

1. **运行诊断脚本**：
   ```bash
   cd /path/to/math-formula-plugin
   bash scripts/diagnose-builder-output.sh
   ```

2. **查看诊断结果**，确认问题：
   - manifest.json 和 fontdata.js 的时间戳是否不一致
   - buildId 是什么

3. **运行修复脚本**：
   ```bash
   bash scripts/force-rebuild-font-pack.sh
   ```
   
   脚本会提示你输入原始字体文件路径（.ttf 或 .otf）

4. **重新构建 CEP**：
   ```bash
   bash scripts/build-cep-prod.sh
   ```

5. **完全重启 Illustrator**

6. **验证修复**：
   - 打开 Math Formula Plugin 扩展
   - 切换到"调试"标签页
   - 查看日志中的 buildId 和创建时间
   - 输入公式并渲染，验证使用的是新字体

### 如果修复脚本无法解决问题

请提供以下信息：

1. 诊断脚本的完整输出
2. 修复脚本的完整输出
3. Builder Web UI 的控制台日志（浏览器开发者工具）
4. CEP 插件的调试日志

我们将根据这些信息进一步分析问题。
