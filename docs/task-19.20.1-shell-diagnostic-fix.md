# Task 19.20.1: Shell 诊断功能修复 - 协议修复版

## 问题描述

### 第一次问题
Shell 诊断功能失败，错误信息：
- `stderr="执行异常: app.system 不是函数"`
- `exitCode=-1`
- `stdout` 为空

根本原因：`app.system()` 不是有效的 ExtendScript 函数。

### 第二次问题（协议错误）
修复 `app.system()` 后，出现新问题：
- TypeScript 端 JSON.parse 失败
- 错误：`Unexpected token E in JSON at position 0`
- 根本原因：JSX 返回的不是 JSON（以 'E' 开头，可能是 "EvalScript error"）

## 修复方案

### 1. JSX 端修复 (`extension/host/illustrator.jsx`)

#### 核心原则：永远返回可解析的 JSON

**关键改进：**
1. **初始化完整的返回对象** - 确保所有字段都存在
2. **不允许 throw** - 所有异常都捕获并填入 stderr
3. **stdout/stderr 允许为空字符串，但字段必须存在**
4. **添加 rawSystemResult 字段** - 用于诊断原始返回值

**返回协议：**
```javascript
{
  success: boolean,
  exitCode: number,
  stdout: string,        // 允许为空，但必须存在
  stderr: string,        // 允许为空，但必须存在
  cmd: string,
  rawSystemResult: any,  // system.callSystem 的原始返回值
  diagnostics: {
    os: string,
    fileName: string,
    typeofSystem: string,
    typeofSystemCallSystem: string,
    executionMethod: string,
    systemCallSystemError?: string,
    fileExecuteError?: string,
    bridgeTalkError?: string,
    exception?: string,
    stdoutReadError?: string,
    stderrReadError?: string
  }
}
```

**执行方法优先级：**
1. **首选**: `system.callSystem(cmd)` - ExtendScript 标准接口
2. **Fallback 1**: `File.execute()` - 通过临时脚本文件执行
3. **Fallback 2**: `BridgeTalk` - 跨应用通信（异步）

### 2. TypeScript 桥接端修复 (`src/lib/illustrator-bridge.ts`)

#### 核心原则：JSON.parse 失败时不吞掉错误

**关键改进：**
1. **捕获 JSON.parse 异常**
2. **将原始返回字符串前 500 字符输出到日志**
3. **返回包含 PARSE_FAIL 标记的错误对象**

**错误处理：**
```typescript
try {
  const parsed = JSON.parse(result);
  return parsed;
} catch (parseError) {
  const rawPreview = result.substring(0, 500);
  console.error('[IllustratorBridge] JSON 解析失败:', parseError);
  console.error('[IllustratorBridge] 原始返回值:', rawPreview);
  
  return {
    success: false,
    exitCode: -1,
    stdout: '',
    stderr: `PARSE_FAIL: ${parseError.message}`,
    cmd,
    diagnostics: {
      exception: `JSON parse error: ${parseError.message}`,
      rawResponse: rawPreview
    }
  };
}
```

### 3. 诊断页面更新 (`src/main.ts`)

#### 核心原则：显示真实 stdout/stderr，不是 parse 失败造成的假错误

**关键改进：**
1. **检测 PARSE_FAIL 标记** - 如果存在，立即报告协议错误
2. **显示原始返回值** - 帮助调试协议问题
3. **更严格的验证逻辑**：
   - `echo hello` / `pwd` / `whoami` / `which bash` 必须 `exitCode=0` 且 `stdout` 非空
   - `ls /nonexistent` 必须 `exitCode!=0` 且 `stderr` 非空

**诊断输出示例：**
```
=== Shell 诊断开始 ===

测试 0: 系统信息诊断
  $.os: MacOS
  $.fileName: /path/to/illustrator.jsx
  typeof system: object
  typeof system.callSystem: function
  执行方法: system.callSystem
  rawSystemResult: 0

测试 1: echo hello
  exitCode: 0
  stdout: "hello"
  结果: ✅ 通过

测试 2: pwd
  exitCode: 0
  stdout: "/Users/username"
  结果: ✅ 通过

测试 3: whoami
  exitCode: 0
  stdout: "username"
  结果: ✅ 通过

测试 4: which bash
  exitCode: 0
  stdout: "/bin/bash"
  结果: ✅ 通过

测试 5: 测试错误捕获 (ls /nonexistent)
  exitCode: 2
  stdout: (空)
  stderr: "ls: /nonexistent: No such file or directory"
  结果: ✅ 通过（正确捕获错误）

=== Shell 诊断完成 ===
✅ runShell() 函数工作正常
```

**如果出现协议错误：**
```
测试 0: 系统信息诊断
❌ JSON 解析失败: PARSE_FAIL: Unexpected token E in JSON at position 0
  原始返回值: EvalScript error: ...

=== Shell 诊断失败 ===
❌ JSX 返回协议错误，无法解析 JSON
```

## 验证步骤

1. **构建扩展**:
   ```bash
   cd math-formula-plugin
   bash scripts/build-cep-prod.sh
   ```

2. **重启 Illustrator**:
   - 完全关闭 Adobe Illustrator
   - 重新启动 Illustrator
   - 打开扩展：窗口 > 扩展 > Math Formula Plugin

3. **运行诊断**:
   - 切换到"日志"标签页
   - 点击"Shell 诊断"按钮
   - 查看诊断输出

4. **预期结果**:
   - 所有 5 个测试应该显示 ✅ 通过
   - 诊断信息应该显示正确的执行方法
   - 不应该有 "PARSE_FAIL" 错误
   - 不应该有 "app.system 不是函数" 错误

## 回归验收标准

- ✅ `echo hello` - exitCode=0 且 stdout 包含 "hello"
- ✅ `pwd` - exitCode=0 且 stdout 非空
- ✅ `whoami` - exitCode=0 且 stdout 非空
- ✅ `which bash` - exitCode=0 且 stdout 包含 "bash"
- ✅ `ls /nonexistent` - exitCode!=0 且 stderr 非空
- ✅ 诊断页最终仅在上述条件满足时显示 ✅

## 技术细节

### 协议设计原则

1. **永远可解析** - JSX 端任何情况下都返回有效 JSON
2. **字段完整性** - 所有字段都必须存在，即使为空
3. **错误透明** - 不吞掉任何错误，都记录到 diagnostics
4. **调试友好** - 提供 rawSystemResult 和 rawResponse 用于诊断

### ExtendScript Shell 执行方法对比

| 方法 | 优点 | 缺点 | 可用性 |
|------|------|------|--------|
| `system.callSystem()` | 标准接口，同步执行，返回退出码 | 需要 ExtendScript Toolkit | ✅ 推荐 |
| `File.execute()` | 可执行脚本文件 | 需要创建临时文件，权限管理 | ⚠️ Fallback |
| `BridgeTalk` | 跨应用通信 | 异步，复杂，依赖 Bridge | ⚠️ 最后手段 |
| `app.system()` | N/A | ❌ 不存在 | ❌ 错误 |

### 输出捕获机制

使用文件重定向捕获 stdout 和 stderr：
```javascript
var redirectedCmd = cmd + " > " + stdoutFile.fsName + " 2> " + stderrFile.fsName;
```

## 相关文件

- `extension/host/illustrator.jsx` - JSX 端协议修复
- `src/lib/illustrator-bridge.ts` - TypeScript 桥接端错误处理
- `src/main.ts` - 诊断函数更新

## 状态

✅ 已完成
- JSX 端使用正确的 ExtendScript 接口
- JSX 端确保永远返回有效 JSON
- TypeScript 端捕获 JSON.parse 失败并显示原始返回值
- 添加完整的诊断信息输出（包括 rawSystemResult）
- 更新验证逻辑，不再误报成功
- 构建和部署完成

## 下一步

用户需要：
1. 重启 Illustrator
2. 运行 Shell 诊断验证修复
3. 确认所有测试通过
4. 如果仍有问题，查看日志中的 rawResponse 字段定位协议问题
