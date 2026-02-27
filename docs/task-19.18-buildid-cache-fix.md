# Task 19.18 - 使用 buildId 解决 CEP 缓存问题

## 问题描述

CEP 插件无法检测到最新生成的字体包，即使：
1. 生成了新的字体包
2. 运行了 `bash scripts/build-cep-prod.sh` 构建脚本
3. 完全重启了 Illustrator
4. 点击了"手动更新字体信息"按钮

日志显示 `createdAt` 时间戳始终是旧的：
- 实际文件：`2026-02-26T09:25:13.273Z`（17:25）
- CEP 读取：`2026-02-26T05:44:22.161Z`（13:44）

## 根本原因

CEP 的嵌入式 Chromium 浏览器对 manifest.json 文件进行了**强缓存**，即使使用了以下缓存破坏策略也无效：

```typescript
const manifestUrl = `${packPath}/manifest.json?_t=${timestamp}&_r=${random}&_n=${nanoTime}`;
const manifestResponse = await fetch(manifestUrl, {
  cache: 'reload',
  headers: {
    'Cache-Control': 'no-cache, no-store, must-revalidate, max-age=0',
    'Pragma': 'no-cache',
    'Expires': '0'
  }
});
```

CEP 浏览器忽略了这些缓存控制指令，继续返回缓存的旧版本。

## 解决方案

使用 manifest.json 中的 `buildId` 字段进行版本检测，而不是依赖 `createdAt` 时间戳。

### 为什么 buildId 有效？

1. **每次构建都会改变**：字体包构建工具在每次生成时都会创建新的 `buildId`（16 位随机十六进制字符串）
2. **内容级别的变化检测**：即使文件被缓存，`buildId` 的变化也能被检测到
3. **更可靠**：不依赖文件系统时间戳或 HTTP 缓存头

### 代码修改

**文件：`math-formula-plugin/src/lib/font-pack-loader.ts`**

#### 修改 1：轮询检查更新时优先使用 buildId

```typescript
// 旧代码
const currentHash = manifest.contentHash || manifest.createdAt;
const lastHash = this.userFontPack?.manifest.contentHash || this.lastManifestTime;

// 新代码
const currentHash = (manifest as any).buildId || manifest.contentHash || manifest.createdAt;
const lastHash = (this.userFontPack?.manifest as any)?.buildId || this.userFontPack?.manifest.contentHash || this.lastManifestTime;
```

#### 修改 2：启动轮询时记录 buildId

```typescript
// 旧代码
this.lastManifestTime = this.userFontPack.manifest.contentHash || this.userFontPack.manifest.createdAt;

// 新代码
this.lastManifestTime = (this.userFontPack.manifest as any).buildId || this.userFontPack.manifest.contentHash || this.userFontPack.manifest.createdAt;
```

### 优先级顺序

1. **buildId**（最优先）：每次构建都会改变
2. **contentHash**（次优先）：基于内容的哈希值
3. **createdAt**（最后备选）：时间戳

## 测试步骤

1. 生成新的字体包（使用字体包构建工具）
2. 运行 `bash scripts/build-cep-prod.sh`
3. 完全关闭 Illustrator
4. 重新启动 Illustrator
5. 打开 Math Formula Plugin 扩展
6. 检查日志中的 `buildId` 是否与 manifest.json 一致

### 预期结果

- 日志显示：`初始哈希值: <buildId>`（16 位十六进制字符串）
- 字体信息显示最新的 `createdAt` 时间
- 轮询机制能够检测到新的字体包更新

## 相关文件

- `math-formula-plugin/src/lib/font-pack-loader.ts`：字体包加载器
- `math-formula-plugin/public/fonts/user-font-pack/manifest.json`：字体包清单
- `math-formula-plugin/extension/client/dist/fonts/user-font-pack/manifest.json`：CEP 运行时字体包清单

## 技术细节

### manifest.json 结构示例

```json
{
  "name": "初中数学字体0226",
  "version": "1.0.0",
  "buildId": "b64c950ba1a53780",
  "sourceFontHash": "4d4fd7519d0e808aabce249c020efa07853008cb3bcdac421866673fa685b04a",
  "family": "JOJO初中数学公式260226 Medium",
  "format": "ttf",
  "createdAt": "2026-02-26T09:25:13.273Z",
  "fontdataFile": "fontdata.js"
}
```

### buildId 生成逻辑

字体包构建工具使用以下逻辑生成 `buildId`：

```javascript
const buildId = crypto.randomBytes(8).toString('hex'); // 16 位十六进制字符串
```

每次构建都会生成新的随机 ID，确保唯一性。

## 已知限制

1. **需要重启 Illustrator**：即使使用 `buildId`，CEP 浏览器仍然会缓存文件，必须完全重启 Illustrator 才能清除缓存
2. **手动刷新按钮的局限性**：手动刷新按钮只能重新读取已加载的文件，无法强制 CEP 浏览器清除缓存

## 后续优化建议

1. **添加 buildId 到日志**：在调试日志中显示当前加载的 `buildId`，方便用户确认版本
2. **版本不匹配警告**：如果检测到 `buildId` 不匹配，显示明确的警告提示用户重启 Illustrator
3. **自动重启提示**：当检测到新版本时，提示用户需要重启 Illustrator 才能应用更新

## 修复状态

- [x] 代码修改完成
- [x] 构建脚本测试通过
- [ ] 用户验证（等待用户测试新字体包生成 + 重启 Illustrator）

## 相关任务

- Task 19.18：自定义字体读取 bug 修复
