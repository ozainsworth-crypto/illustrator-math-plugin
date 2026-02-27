# Task 19.19 - 自动启动 Font Builder 服务修复

## 问题描述

CEP 面板点击"生成新字体"按钮时，无法自动启动 Font Builder Web UI 后端服务。

### 错误信息演变

1. **第一个错误**：
   ```
   启动脚本不存在: /Users/toz/Library/Application Support/Adobe/CEP/extensions/MathFormulaPlugin/scripts/start-font-builder.sh
   ```

2. **第二个错误**（修复第一个后）：
   ```
   启动失败: system 不是函数
   ```

## 根本原因

### 问题 1：scripts 文件夹未复制

`scripts/` 文件夹没有被复制到 CEP 扩展目录。

在 `scripts/build-cep-prod.sh` 构建脚本中，只复制了以下内容：
- 主工具构建产物 (`dist/`)
- MathJax 库 (`node_modules/mathjax`)
- 字体包 (`public/fonts/`)

但缺少了 `scripts/` 文件夹的复制步骤。

### 问题 2：ExtendScript 不支持 system() 函数

ExtendScript 环境中没有 `system()` 函数。尝试在 JSX 中直接执行 shell 命令会失败。

需要使用 CEP 的 `cep.process.createProcess()` API 来执行系统命令。

## 解决方案

### 修复 1：添加 scripts 文件夹复制步骤

修改 `scripts/build-cep-prod.sh`，在步骤 5 之前添加新步骤：

```bash
# 步骤 5: 复制 scripts 文件夹到 CEP
echo "步骤 5/6: 复制 scripts 文件夹到 CEP..."
rm -rf "$EXTENSION_DIR/scripts"
mkdir -p "$EXTENSION_DIR/scripts"
cp -r "$PROJECT_ROOT/scripts/"* "$EXTENSION_DIR/scripts/"
# 确保脚本有执行权限
chmod +x "$EXTENSION_DIR/scripts/"*.sh 2>/dev/null || true
echo "✓ scripts 文件夹已复制"
echo ""
```

### 修复 2：使用 CEP process API 执行脚本

#### 2.1 修改 JSX 代码 (`extension/host/illustrator.jsx`)

不在 JSX 中执行脚本，而是返回脚本路径给 CEP 端：

```javascript
function startFontBuilder() {
  try {
    // ... 路径检查代码 ...
    
    // 返回脚本路径，让 CEP 端使用 cep.process API 执行
    return '{"success":true,"message":"脚本路径已返回，请在 CEP 端执行","scriptPath":"' + scriptPath + '","needCEPExecution":true}';
    
  } catch (error) {
    // ... 错误处理 ...
  }
}
```

#### 2.2 修改 TypeScript 桥接代码 (`src/lib/illustrator-bridge.ts`)

在 CEP 端使用 `cep.process.createProcess()` 执行脚本：

```typescript
public async startFontBuilder(): Promise<{ success: boolean; message: string }> {
  // ... 调用 JSX 获取脚本路径 ...
  
  // 如果需要在 CEP 端执行
  if (parsed.needCEPExecution && parsed.scriptPath) {
    // 使用 CEP process API 执行脚本
    if (typeof window.cep !== 'undefined' && window.cep?.process) {
      const command = `bash "${parsed.scriptPath}"`;
      
      return new Promise((resolve) => {
        if (window.cep && window.cep.process) {
          window.cep.process.createProcess(command, (result: any) => {
            if (result.err === 0) {
              resolve({ success: true, message: 'Font Builder 服务启动脚本已执行' });
            } else {
              resolve({ success: false, message: `脚本执行失败: ${result.err}` });
            }
          });
        }
      });
    }
  }
}
```

#### 2.3 添加类型定义 (`src/global.d.ts`)

```typescript
interface Window {
  cep?: {
    util?: {
      openURLInDefaultBrowser(url: string): void;
    };
    process?: {
      createProcess: (command: string, callback: (result: any) => void) => void;
    };
  };
}
```

### 验证修复

1. **重新构建 CEP**：
   ```bash
   bash scripts/build-cep-prod.sh
   ```

2. **验证文件存在**：
   ```bash
   ls -la ~/Library/Application\ Support/Adobe/CEP/extensions/MathFormulaPlugin/scripts/
   ```
   
   应该看到：
   ```
   -rwxr-xr-x  start-font-builder.sh
   -rwxr-xr-x  build-cep-prod.sh
   -rwxr-xr-x  diagnose-builder-output.sh
   -rwxr-xr-x  diagnose-font-cache.sh
   -rwxr-xr-x  find-and-fix-font-pack.sh
   -rwxr-xr-x  force-rebuild-font-pack.sh
   ```

3. **重启 Illustrator**：
   - 完全关闭 Adobe Illustrator
   - 重新启动 Illustrator
   - 打开扩展：窗口 > 扩展 > Math Formula Plugin

4. **测试自动启动**：
   - 点击"生成新字体"按钮
   - 应该看到：
     - 后端服务自动启动（端口 5175）
     - 浏览器自动打开 `http://localhost:5175`
     - 调试日志显示"✅ 服务启动成功"

## 技术细节

### CEP Process API

CEP 提供了 `cep.process.createProcess()` API 用于执行系统命令：

```javascript
window.cep.process.createProcess(command, callback)
```

- **command**: 要执行的命令字符串
- **callback**: 回调函数，接收执行结果
  - `result.err`: 退出码（0 表示成功）
  - `result.data`: 标准输出

### 架构设计

```
┌─────────────────────────────────────────────────────────────┐
│ CEP UI (TypeScript)                                         │
│  - main.ts: 按钮点击事件                                    │
│  - illustrator-bridge.ts: 桥接层                            │
│    └─> startFontBuilder()                                   │
│         ├─> evalScript('startFontBuilder()')               │
│         │   (调用 JSX 获取脚本路径)                         │
│         └─> cep.process.createProcess()                     │
│             (在 CEP 端执行脚本)                             │
└─────────────────────────────────────────────────────────────┘
                           │
                           ▼
┌─────────────────────────────────────────────────────────────┐
│ ExtendScript (JSX)                                          │
│  - illustrator.jsx: startFontBuilder()                      │
│    └─> 验证脚本路径存在                                     │
│    └─> 返回 {needCEPExecution: true, scriptPath: "..."}    │
└─────────────────────────────────────────────────────────────┘
                           │
                           ▼
┌─────────────────────────────────────────────────────────────┐
│ Shell Script                                                │
│  - start-font-builder.sh                                    │
│    ├─> 停止旧服务 (pidfile + lsof)                         │
│    ├─> 清理缓存 (rm -rf cache/)                            │
│    ├─> 启动新服务 (nohup node server.cjs &)                │
│    ├─> 等待服务就绪 (curl 轮询)                            │
│    └─> 打开浏览器 (open http://localhost:5175)             │
└─────────────────────────────────────────────────────────────┘
```

### 为什么不能在 JSX 中直接执行？

ExtendScript 是 Adobe 的脚本引擎，基于 ECMAScript 3，运行在沙箱环境中：

- ❌ 没有 `system()` 函数
- ❌ 没有 `exec()` 函数
- ❌ 没有 Node.js 的 `child_process`
- ✅ 有 `File` 和 `Folder` 对象（文件系统访问）
- ✅ 可以通过 CEP 桥接调用系统功能

因此，需要在 CEP 端（浏览器环境）使用 CEP API 执行系统命令。

## 相关文件

- `math-formula-plugin/scripts/build-cep-prod.sh` - CEP 构建脚本（已修改）
- `math-formula-plugin/scripts/start-font-builder.sh` - 服务启动脚本
- `math-formula-plugin/extension/host/illustrator.jsx` - JSX 桥接代码（已修改）
- `math-formula-plugin/src/lib/illustrator-bridge.ts` - TypeScript 桥接类（已修改）
- `math-formula-plugin/src/global.d.ts` - 全局类型定义（已修改）
- `math-formula-plugin/src/main.ts` - 按钮事件处理

## 测试状态

- ✅ 构建脚本已修改（添加 scripts 文件夹复制）
- ✅ JSX 代码已修改（返回脚本路径而非执行）
- ✅ TypeScript 桥接代码已修改（使用 cep.process API）
- ✅ 类型定义已添加（cep.process）
- ✅ CEP 已重新构建
- ✅ scripts 文件夹已复制到扩展目录
- ✅ 脚本文件有执行权限
- ✅ TypeScript 编译通过
- ⏳ 等待用户重启 Illustrator 并测试

## 下一步

用户需要：
1. 完全关闭 Adobe Illustrator
2. 重新启动 Illustrator
3. 打开 CEP 扩展
4. 点击"生成新字体"按钮
5. 验证服务自动启动并打开浏览器
6. 生成 test3 字体包
7. 验证 build-info.json 和 manifest.json 正确更新

## 预期结果

点击"生成新字体"按钮后：
- 调试日志显示：`🚀 正在启动字体包生成服务...`
- 调试日志显示：`✅ 服务启动成功`（或类似消息）
- 浏览器自动打开 `http://localhost:5175`
- 可以在 Web UI 中生成新字体包
- 生成完成后，CEP 自动检测到更新（轮询机制）
- 字体选择器自动刷新显示新字体包信息
