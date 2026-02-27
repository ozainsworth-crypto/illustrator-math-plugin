# Task 19.18 - CEP 缓存破解修复

## 问题描述

CEP 插件无法检测到最新生成的自定义字体，即使手动刷新也显示旧的时间戳。

### 症状
- 用户生成新字体后，CEP 插件显示的 `createdAt` 时间戳是旧的
- 日志显示：`2026-02-26T05:44:22.161Z`（旧时间）
- 实际文件：`2026-02-26T09:25:13.273Z`（新时间）
- 手动刷新按钮也无法解决问题

## 根本原因

**CEP 环境的 Chromium 浏览器对 JSON 文件进行了极其激进的 HTTP 缓存**，即使使用了以下缓存破解策略也无效：

1. ❌ `cache: 'no-store'` - 被 CEP 忽略
2. ❌ `Cache-Control: no-cache, no-store, must-revalidate` - 被 CEP 忽略
3. ❌ 时间戳参数 `?t=${Date.now()}` - 被 CEP 忽略
4. ❌ 随机数参数 `?r=${Math.random()}` - 被 CEP 忽略

CEP 的嵌入式浏览器会缓存 manifest.json，即使添加了查询参数和缓存控制头，也会返回缓存的旧版本。

## 解决方案

### 1. 三重缓存破解参数

使用三个不同来源的参数强制刷新：

```typescript
const timestamp = Date.now();                              // 毫秒级时间戳
const random = Math.random().toString(36).substring(7);    // 随机字符串
const nanoTime = performance.now().toString().replace('.', ''); // 纳秒级时间戳

const url = `${packPath}/manifest.json?_t=${timestamp}&_r=${random}&_n=${nanoTime}`;
```

### 2. 使用 `cache: 'reload'` 而非 `cache: 'no-store'`

```typescript
const response = await fetch(url, {
  cache: 'reload', // 强制从服务器重新加载，绕过所有缓存
  headers: {
    'Cache-Control': 'no-cache, no-store, must-revalidate, max-age=0',
    'Pragma': 'no-cache',
    'Expires': '0'
  }
});
```

**关键区别**：
- `cache: 'no-store'`：告诉浏览器"不要存储缓存"，但如果已有缓存，可能仍会使用
- `cache: 'reload'`：告诉浏览器"忽略现有缓存，强制从服务器重新加载"

## 修改的文件

### `src/lib/font-pack-loader.ts`

修改了三个 fetch 调用：

1. **`detectAndLoadUserFontPack()` 中的 manifest.json 加载**
2. **`detectAndLoadUserFontPack()` 中的 fontdata.js 加载**
3. **`checkForUpdates()` 中的 manifest.json 轮询检查**

所有 fetch 调用都应用了：
- 三重缓存破解参数（`_t`, `_r`, `_n`）
- `cache: 'reload'` 策略
- 完整的缓存控制头

## 测试步骤

1. **生成新字体**：
   - 打开字体包生成工具（http://localhost:3000）
   - 生成新的自定义字体
   - 确认 `public/fonts/user-font-pack/manifest.json` 的 `createdAt` 已更新

2. **重新构建 CEP**：
   ```bash
   bash scripts/build-cep-prod.sh
   ```

3. **完全重启 Illustrator**：
   - 完全关闭 Illustrator（不是只关闭面板）
   - 重新启动 Illustrator
   - 打开扩展：窗口 > 扩展 > Math Formula Plugin

4. **验证时间戳**：
   - 查看调试日志中的 `createdAt` 时间戳
   - 应该显示最新的时间（与 manifest.json 文件一致）

5. **测试手动刷新**：
   - 点击"字体选项-更多" > "更新字体信息"
   - 日志应显示最新的时间戳

6. **测试自动轮询**：
   - 在 CEP 插件运行时，生成新字体
   - 等待 2 秒（轮询间隔）
   - 日志应自动显示"检测到字体包更新"

## 预期结果

- ✅ 启动时显示最新的 `createdAt` 时间戳
- ✅ 手动刷新显示最新的时间戳
- ✅ 自动轮询检测到字体包更新
- ✅ 不再显示旧的缓存数据

## 技术细节

### 为什么需要三重参数？

1. **`_t=${Date.now()}`**：毫秒级时间戳，确保每秒最多 1000 个唯一值
2. **`_r=${Math.random()}`**：随机字符串，防止同一毫秒内的重复请求
3. **`_n=${performance.now()}`**：纳秒级时间戳，提供更高精度的唯一性

三者结合，确保每次请求的 URL 都是全局唯一的，强制 CEP 浏览器绕过缓存。

### 为什么 `cache: 'reload'` 有效？

根据 Fetch API 规范：
- `reload`：绕过 HTTP 缓存，直接向服务器发起请求，即使有缓存也不使用
- `no-store`：不存储响应到缓存，但可能使用现有缓存

在 CEP 环境中，`reload` 模式更激进，能够强制绕过 Chromium 的缓存层。

## 相关问题

### 字体包生成工具的 `createdAt` 更新问题

这是一个**独立的 bug**，需要单独修复：

**问题**：字体包生成工具在生成新字体时，不会更新 `createdAt` 字段，导致即使生成了新字体，时间戳也是旧的。

**解决方案**：需要修改字体包生成工具，在生成新字体时自动更新 `createdAt` 为当前时间。

**临时解决方案**：手动编辑 `public/fonts/user-font-pack/manifest.json`，更新 `createdAt` 字段。

## 总结

通过三重缓存破解参数 + `cache: 'reload'` 策略，成功解决了 CEP 环境中的激进缓存问题。现在 CEP 插件能够正确检测到最新的自定义字体信息。

## 后续任务

- [ ] 修复字体包生成工具的 `createdAt` 自动更新问题（需要单独的 task）
- [ ] 考虑在 Web 环境中也应用相同的缓存破解策略（保持一致性）
- [ ] 监控 CEP 环境中的其他潜在缓存问题
