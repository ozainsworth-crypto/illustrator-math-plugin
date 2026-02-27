# Task 19.19 - 证据收集代码已就绪

## 完成状态

✅ 已完成 Step A（证据收集）的代码添加

## 已添加的证据收集点

### A2. 前端日志（app.js）

已在以下位置添加 `[Evidence]` 日志：

1. **页面加载时**：
   - Page URL（file:// 还是 http://？）
   - Page protocol
   - 加载时间戳
   - User agent

2. **转换按钮点击时**：
   - 选中的文件名和大小
   - 字体包名称
   - 字符集选项
   - 时间戳

3. **请求转换时**：
   - Request URL（完整 URL）
   - Request method 和 body
   - Response status 和 headers
   - Response body（包含 jobId）

4. **显示成功结果时**：
   - Build info（buildHash, buildTime, fontPackName）
   - Manifest（name, buildId, createdAt）

### A3. 后端日志（conversion-service.js）

已在 `convert()` 方法中添加详细日志：

1. **转换开始**：
   - Input path（相对路径和绝对路径）
   - Font name
   - Options（完整 JSON）
   - 时间戳

2. **输出目录信息**：
   - Output base dir
   - Output dir（相对路径和绝对路径）
   - 清理前后的目录存在状态

3. **Builder 执行**：
   - Builder command（完整命令）
   - Builder stdout length

4. **生成的文件列表**：
   - 每个文件的名称、大小、mtime

5. **Build info 摘要**：
   - buildHash（前 8 位）
   - buildTime
   - fontPackName
   - toolVersion
   - 文件数量

6. **错误信息**（如果失败）：
   - Error message
   - Error stack

### A4. 缓存日志（cache-service.js）

已在 `get()` 方法中添加缓存查询日志：

1. **缓存查询**：
   - File path
   - File hash（前 16 位）
   - Options（完整 JSON）
   - Cache key（前 16 位）

2. **缓存结果**：
   - Cache HIT 或 MISS
   - 如果 HIT：
     - Entry created at
     - Entry age（分钟）
     - Access count
   - 如果 MISS：
     - 原因（No entry found / Entry expired / Cache file not found）

## 下一步操作

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
   - 选择字体文件（jojoupMath0224.ttf）
   - 输入名称：test3
   - 点击"开始转换"
4. **打开浏览器控制台**（F12 → Console）
5. **观察终端日志**（运行 start-ui.sh 的终端）

### 步骤 4：收集证据

#### 从浏览器控制台复制：

搜索并复制所有 `[Evidence]` 开头的日志，特别关注：

```
[Evidence] Page URL: ???
[Evidence] Page protocol: ???
[Evidence] Request URL: ???
[Evidence] Response status: ???
[Evidence] Build info: { buildHash: ???, buildTime: ???, fontPackName: ??? }
```

#### 从终端复制：

搜索并复制所有 `[Evidence]` 开头的日志，特别关注：

```
[Evidence] Input path (absolute): ???
[Evidence] Output dir (absolute): ???
[Evidence] Generated files: ???
[Evidence] Build info summary: ???
[Evidence] Cache HIT/MISS: ???
```

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
- 浏览器显示"无法访问此网站"
- Page URL 可能是 `file:///...`

**解决方案**：启动服务器（步骤 2）

### 场景 B：缓存命中

**症状**：
- `[Evidence] Cache HIT ✓` 出现
- buildTime 和 test2 相同

**解决方案**：点击"清除缓存"按钮后重试

### 场景 C：输出目录路径错误

**症状**：
- Output dir (absolute) 路径不正确
- 文件写入错误位置

**解决方案**：检查 conversion-service.js 的路径计算

## 证据收集完成后

请将以下信息提供给我：

1. **浏览器控制台日志**（所有 `[Evidence]` 行）
2. **终端日志**（所有 `[Evidence]` 行）
3. **文件系统验证结果**（ls 和 cat 命令的输出）

根据这些证据，我将确定：
- 问题的根本原因
- 最佳修复方案（修复嵌入式 Web UI 或采用 CLI 桥接方案）
- 具体的实现步骤

## 相关文档

- 详细调查报告：`task-19.19-cep-builder-bug-investigation.md`
- Task 19.19 定义：`.kiro/specs/math-formula-plugin/tasks.md`
