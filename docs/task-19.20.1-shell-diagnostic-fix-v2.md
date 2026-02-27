# Task 19.20.1 - Shell 诊断修复 V2（强制同步执行）

## 问题描述

Shell 诊断功能在第一次修复后仍然失败：
- `exitCode=0` 但 `stdout` 全空
- `rawSystemResult=async`
- 说明 `runShell` 走了异步执行路径（BridgeTalk fallback）
- BridgeTalk 是异步的，返回时没有等待回调，导致所有 stdout 为空

## 根本原因

之前的实现逻辑有问题：
1. 即使 `system.callSystem` 可用，也会因为某些条件（如 `exitCode === -1`）而 fallback 到异步方法
2. BridgeTalk 是异步的，无法同步返回 stdout/stderr
3. 没有强制要求使用同步方法（`system.callSystem`）

## 解决方案

### 1. JSX 端修改 (`extension/host/illustrator.jsx`)

**核心改动**：
- 移除所有异步 fallback（File.execute、BridgeTalk）
- 强制使用 `system.callSystem` 作为唯一执行方法
- 如果 `system.callSystem` 不可用或失败，直接返回错误
- 添加 `method` 字段到协议中，用于诊断

**新协议格式**：
```
OK|exit=<code>|out=<b64>|err=<b64>|raw=<b64>|cmd=<b64>|method=<method>
ERR|exit=<code>|out=<b64>|err=<b64>|raw=<b64>|cmd=<b64>|method=<method>
```

**method 可能的值**：
- `callSystem` - 成功使用 system.callSystem（正常情况）
- `failed` - system.callSystem 失败或不可用
- `exception` - 捕获到异常
- `none` - 不支持的操作系统

**诊断信息**：
- 打印 `typeof system`
- 打印 `typeof system.callSystem`
- 打印 `$.os`
- 在 stderr 中包含这些信息（如果失败）

### 2. TypeScript 桥接端修改 (`src/lib/illustrator-bridge.ts`)

**核心改动**：
- 更新 `parseShellProtocol()` 解析 `method` 字段
- 更新返回类型，添加 `executionMethod?: string`
- 在日志中输出 `executionMethod`

### 3. 诊断页面修改 (`src/main.ts`)

**核心改动**：
- 在每个测试中显示 `executionMethod`
- 验证逻辑更新：要求 `executionMethod === 'callSystem'`
- 如果使用了非同步方法，显示警告

**新验收标准**：
- Test 1 (echo hello): `exitCode=0` AND `stdout` 包含 "hello" AND `method=callSystem`
- Test 2 (pwd): `exitCode=0` AND `stdout` 非空 AND `method=callSystem`
- Test 3 (whoami): `exitCode=0` AND `stdout` 非空 AND `method=callSystem`
- Test 4 (which bash): `exitCode=0` AND `stdout` 包含 "bash" AND `method=callSystem`
- Test 5 (ls /nonexistent): `exitCode!=0` AND `stderr` 非空 AND `method=callSystem`

## 实现细节

### JSX 执行逻辑

```javascript
// 方法 1: 强制使用 system.callSystem (首选且唯一同步方法)
var callSystemAvailable = false;
var callSystemError = "";

if (typeof system !== "undefined" && typeof system.callSystem === "function") {
  callSystemAvailable = true;
  try {
    exitCode = system.callSystem(redirectedCmd);
    executionMethod = "callSystem";
    rawResult = String(exitCode);
  } catch (e) {
    callSystemError = e.message;
    exitCode = -1;
    stderr += "system.callSystem exception: " + e.message + "; ";
  }
} else {
  stderr += "system.callSystem not available; " + systemInfo;
}

// 如果 system.callSystem 失败或不可用，返回错误（不再尝试异步 fallback）
if (exitCode === -1) {
  stderr += "CRITICAL: system.callSystem failed or unavailable; ";
  stderr += systemInfo;
  if (callSystemError) {
    stderr += "error=" + callSystemError + "; ";
  }
  
  return "ERR|exit=-1|out=" + base64Encode("") + "|err=" + base64Encode(stderr) + "|raw=" + base64Encode(systemInfo) + "|cmd=" + base64Encode(cmd) + "|method=failed";
}
```

### 诊断输出示例

```
测试 1: echo hello
  exitCode: 0
  stdout: "hello
"
  executionMethod: callSystem
  结果: ✅ 通过
```

如果使用了错误的方法：
```
测试 1: echo hello
  exitCode: 0
  stdout: ""
  executionMethod: async
  结果: ❌ 失败
  ⚠️ 警告: 使用了非同步方法 (async)，应该使用 callSystem
```

## 验证步骤

1. **完全关闭 Adobe Illustrator**
2. **重新启动 Illustrator**
3. **打开扩展**：窗口 > 扩展 > Math Formula Plugin
4. **切换到"日志"标签页**
5. **点击"Shell 诊断"按钮**
6. **确认所有 5 个测试显示 ✅ 通过**
7. **确认所有测试的 `executionMethod` 都是 `callSystem`**

## 预期结果

所有测试应该通过，并且：
- ✅ Test 1: stdout 包含 "hello"，method=callSystem
- ✅ Test 2: stdout 非空（显示当前目录），method=callSystem
- ✅ Test 3: stdout 非空（显示用户名），method=callSystem
- ✅ Test 4: stdout 包含 "bash"，method=callSystem
- ✅ Test 5: exitCode!=0，stderr 非空（显示错误信息），method=callSystem

## 如果仍有问题

如果诊断仍然失败，请检查：
1. `executionMethod` 的值（应该是 `callSystem`）
2. 如果是 `failed`，查看 stderr 中的诊断信息：
   - `typeof system`
   - `typeof system.callSystem`
   - `$.os`
3. 如果 `system.callSystem` 不可用，说明 ExtendScript 环境配置有问题

## 文件修改清单

- ✅ `math-formula-plugin/extension/host/illustrator.jsx` - 移除异步 fallback，强制使用 callSystem
- ✅ `math-formula-plugin/src/lib/illustrator-bridge.ts` - 解析 method 字段
- ✅ `math-formula-plugin/src/main.ts` - 显示 executionMethod，更新验收标准
- ✅ 构建并部署到 CEP 扩展目录

## 构建命令

```bash
cd math-formula-plugin
npm run build
bash scripts/build-cep-prod.sh
```

## 相关文档

- Task 19.20.1 原始修复（JSON → 文本协议）
- ExtendScript 文档：system.callSystem API
- CEP 调试指南

## 状态

- [x] JSX 端修改完成
- [x] TypeScript 桥接端修改完成
- [x] 诊断页面修改完成
- [x] 构建完成
- [ ] 用户验证（待用户重启 Illustrator 后测试）
