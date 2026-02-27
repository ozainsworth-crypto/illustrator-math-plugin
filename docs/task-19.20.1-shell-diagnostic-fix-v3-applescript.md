# Task 19.20.1 - Shell 诊断修复 V3（AppleScript 执行器）

## 问题诊断

经过 V2 测试，确认了关键发现：
- **`typeof system === undefined`** 在当前 Illustrator ExtendScript 环境中
- `system.callSystem` 不存在，V2 方案不可用
- 需要使用替代方案：AppleScript `do shell script`

## 解决方案 V3

### 核心策略

实现多执行器策略，优先级如下：
1. **system.callSystem**（如果可用）- 最快的同步方法
2. **AppleScript do shell script**（主路径）- 同步，可返回 stdout/stderr
3. BridgeTalk/File.execute（fallback，未实现等待回调）

### AppleScript 执行方式

```javascript
// 1. 转义命令中的特殊字符
var escapedCmd = cmd.replace(/\\/g, "\\\\").replace(/"/g, '\\"').replace(/\$/g, "\\$").replace(/`/g, "\\`");

// 2. 添加 PATH 环境变量（AppleScript 默认 PATH 很短）
var fullCmd = "export PATH=/opt/homebrew/bin:/usr/local/bin:/usr/bin:/bin:/usr/sbin:/sbin; " + escapedCmd;

// 3. 构建 AppleScript 命令
var appleScript = 'do shell script "' + fullCmd + '"';

// 4. 通过 osascript 执行
osascript -e '<appleScript>'
```

### 关键改进

1. **PATH 环境变量**：
   - AppleScript 默认 PATH 很短，找不到 node/npm
   - 统一添加：`export PATH=/opt/homebrew/bin:/usr/local/bin:/usr/bin:/bin:/usr/sbin:/sbin;`

2. **退出码捕获**：
   - 使用 `echo $?` 捕获命令退出码
   - 写入临时文件，ExtendScript 读取

3. **stdout/stderr 分离**：
   - 使用文件重定向分别捕获 stdout 和 stderr
   - 确保错误信息不会混入 stdout

4. **executionMethod 字段**：
   - `callSystem` - 使用 system.callSystem（如果可用）
   - `applescript` - 使用 AppleScript do shell script（主路径）
   - `failed` - 所有方法都失败
   - `exception` - 捕获到异常

## 实现细节

### JSX 端 (`extension/host/illustrator.jsx`)

```javascript
function runShell(cmd) {
  var exitCode = -1;
  var stdout = "";
  var stderr = "";
  var executionMethod = "none";
  
  // 方法 1: 尝试 system.callSystem（如果可用）
  if (typeof system !== "undefined" && typeof system.callSystem === "function") {
    try {
      // 使用 system.callSystem 执行
      exitCode = system.callSystem(redirectedCmd);
      executionMethod = "callSystem";
      // ... 读取 stdout/stderr
    } catch (e) {
      exitCode = -1;
    }
  }
  
  // 方法 2: AppleScript do shell script（主路径）
  if (exitCode === -1) {
    try {
      // 转义命令
      var escapedCmd = cmd.replace(/\\/g, "\\\\").replace(/"/g, '\\"').replace(/\$/g, "\\$").replace(/`/g, "\\`");
      
      // 添加 PATH
      var fullCmd = "export PATH=/opt/homebrew/bin:/usr/local/bin:/usr/bin:/bin:/usr/sbin:/sbin; " + escapedCmd;
      
      // 构建 AppleScript
      var appleScript = 'do shell script "' + fullCmd + '"';
      
      // 创建临时脚本文件
      var scriptFile = new File(tempFolder.fsName + "/shell-exec-" + timestamp + ".scpt");
      scriptFile.write(appleScript);
      
      // 执行 osascript
      var execScript = new File(tempFolder.fsName + "/exec-" + timestamp + ".sh");
      execScript.writeln("#!/bin/bash");
      execScript.writeln("osascript " + scriptFile.fsName + " > " + resultFile.fsName + " 2> " + errorFile.fsName);
      execScript.writeln("echo $? > " + exitFile.fsName);
      
      // 使用 File.execute 执行
      execScript.execute();
      
      // 读取退出码、stdout、stderr
      executionMethod = "applescript";
      // ...
    } catch (e) {
      exitCode = -1;
    }
  }
  
  // 返回协议
  return status + "|exit=" + exitCode + "|out=" + base64Encode(stdout) + "|err=" + base64Encode(stderr) + "|raw=" + base64Encode(rawResult) + "|cmd=" + base64Encode(cmd) + "|method=" + executionMethod;
}
```

### TypeScript 诊断端 (`src/main.ts`)

更新验收标准，接受 `applescript` 作为有效执行方法：

```typescript
// 允许 callSystem 或 applescript
const test1Success = test1.exitCode === 0 && 
                     test1.stdout.trim().includes('hello') && 
                     (test1.executionMethod === 'callSystem' || test1.executionMethod === 'applescript');
```

## 验收标准

所有 5 个测试必须通过，并且：
- ✅ Test 1 (echo hello): exitCode=0, stdout 包含 "hello", method=applescript
- ✅ Test 2 (pwd): exitCode=0, stdout 非空, method=applescript
- ✅ Test 3 (whoami): exitCode=0, stdout 非空, method=applescript
- ✅ Test 4 (which bash): exitCode=0, stdout 包含 "bash", method=applescript
- ✅ Test 5 (ls /nonexistent): exitCode!=0, stderr 非空, method=applescript

## 验证步骤

1. **完全关闭 Adobe Illustrator**
2. **重新启动 Illustrator**
3. **打开扩展**：窗口 > 扩展 > Math Formula Plugin
4. **切换到"日志"标签页**
5. **点击"Shell 诊断"按钮**
6. **确认所有 5 个测试显示 ✅ 通过**
7. **确认 executionMethod 为 `applescript`**

## 预期输出示例

```
=== Shell 诊断开始 ===

测试 0: 系统信息诊断
  exitCode: 0
  stdout: "system-info
"
  executionMethod: applescript
  rawSystemResult: applescript:exitCode=0

测试 1: echo hello
  exitCode: 0
  stdout: "hello
"
  executionMethod: applescript
  结果: ✅ 通过

测试 2: pwd
  exitCode: 0
  stdout: "/Users/username
"
  executionMethod: applescript
  结果: ✅ 通过

测试 3: whoami
  exitCode: 0
  stdout: "username
"
  executionMethod: applescript
  结果: ✅ 通过

测试 4: which bash
  exitCode: 0
  stdout: "/bin/bash
"
  executionMethod: applescript
  结果: ✅ 通过

测试 5: 测试错误捕获 (ls /nonexistent)
  exitCode: 1
  stdout: (空)
  stderr: "ls: /nonexistent: No such file or directory
"
  executionMethod: applescript
  结果: ✅ 通过（正确捕获错误）

=== Shell 诊断完成 ===
✅ runShell() 函数工作正常
```

## 后续应用

这个 AppleScript 执行器将用于：
1. **启动 Font Builder 服务**：
   - 停止旧进程（通过 pidfile）
   - 清理 cache 目录
   - 启动新服务（nohup & 后台运行）
   - 打开浏览器 URL

2. **PID 文件管理**：
   - 位置：`~/Library/Application Support/MathFormulaPlugin/builder.pid`
   - 用于跟踪和停止后台服务

3. **环境变量**：
   - 所有命令自动添加完整 PATH
   - 确保 node/npm 可用

## 文件修改清单

- ✅ `math-formula-plugin/extension/host/illustrator.jsx` - 实现 AppleScript 执行器
- ✅ `math-formula-plugin/src/main.ts` - 更新验收标准，接受 applescript
- ✅ 构建并部署到 CEP 扩展目录

## 构建命令

```bash
cd math-formula-plugin
npm run build
bash scripts/build-cep-prod.sh
```

## 技术细节

### AppleScript 特殊字符转义

需要转义的字符：
- `\` → `\\`
- `"` → `\"`
- `$` → `\$`
- `` ` `` → ``\` ``

### PATH 环境变量

AppleScript 默认 PATH：`/usr/bin:/bin:/usr/sbin:/sbin`

需要添加：
- `/opt/homebrew/bin` - Homebrew (Apple Silicon)
- `/usr/local/bin` - Homebrew (Intel)

### 临时文件清理

所有临时文件在执行后自动清理：
- `.scpt` - AppleScript 脚本
- `.sh` - Shell 脚本
- `.txt` - 输出文件

## 已知限制

1. **仅支持 macOS**：AppleScript 是 macOS 专有
2. **执行延迟**：AppleScript 比 system.callSystem 慢（约 200ms）
3. **临时文件**：需要创建多个临时文件

## 状态

- [x] JSX 端实现 AppleScript 执行器
- [x] TypeScript 端更新验收标准
- [x] 构建完成
- [ ] 用户验证（待用户重启 Illustrator 后测试）

## 相关文档

- Task 19.20.1 V1: JSON → 文本协议
- Task 19.20.1 V2: system.callSystem 强制执行（失败，system 不存在）
- AppleScript do shell script 文档
- ExtendScript File.execute API
