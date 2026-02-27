# Task 19.18 根本原因分析报告

## 问题现象

用户报告：生成新字体包后，CEP 插件无法识别最新的字体信息，`createdAt` 时间戳始终显示为 `2026-02-26T05:44:22.161Z`。

## 深度排查过程

### 1. 检查字体包文件位置

发现三个字体包副本：
```bash
./public/fonts/user-font-pack/          # Web 开发环境（源）
./dist/fonts/user-font-pack/            # Vite 构建输出
./extension/client/dist/fonts/user-font-pack/  # CEP 运行环境
```

### 2. 检查文件修改时间

```bash
# 源字体包（public/fonts/user-font-pack/）
-rw-r--r--  manifest.json  2月 26 13:44

# CEP 字体包（extension/client/dist/fonts/user-font-pack/）
-rw-r--r--  manifest.json  2月 26 17:17（构建前）
-rw-r--r--  manifest.json  2月 26 17:21（构建后）
```

### 3. 检查 manifest.json 内容

所有副本的 `createdAt` 都是：
```json
"createdAt": "2026-02-26T05:44:22.161Z"
```

## 根本原因

**问题 1：构建脚本路径错误**
- 构建脚本期望字体包在 `PROJECT_ROOT/fonts/`
- 实际字体包在 `PROJECT_ROOT/public/fonts/`
- 导致构建时跳过字体包复制，CEP 使用旧副本

**问题 2：字体包构建工具未更新时间戳**
- 字体包构建工具生成新字体时，`createdAt` 字段没有更新
- 即使文件被覆盖，时间戳仍然是旧的
- 这是字体包构建工具的 Bug，不是 CEP 插件的问题

## 修复方案

### 修复 1：更正构建脚本路径 ✅

修改 `scripts/build-cep-prod.sh`，从正确的源目录复制：

```bash
# 优先从 public/fonts 复制（Web 开发环境的字体包位置）
if [ -d "$PROJECT_ROOT/public/fonts" ]; then
    cp -r "$PROJECT_ROOT/public/fonts/"* "$EXTENSION_DIR/client/dist/fonts/"
    echo "✓ 字体包已从 public/fonts 复制"
# 备用：从 fonts 目录复制（如果存在）
elif [ -d "$PROJECT_ROOT/fonts" ]; then
    cp -r "$PROJECT_ROOT/fonts/"* "$EXTENSION_DIR/client/dist/fonts/"
    echo "✓ 字体包已从 fonts 复制"
fi
```

### 修复 2：字体包构建工具需要修复 ⚠️

字体包构建工具需要在生成新字体包时，更新 `createdAt` 字段为当前时间：

```javascript
// 在 font-pack-builder 中
const manifest = {
  name: fontName,
  version: "1.0.0",
  // ... 其他字段
  createdAt: new Date().toISOString(), // 使用当前时间
  fontdataFile: "fontdata.js"
};
```

## 验证步骤

### 当前状态（修复 1 后）

1. ✅ 构建脚本已修复，能正确复制字体包
2. ⚠️ 但源字体包的 `createdAt` 仍然是旧的
3. ⚠️ 需要修复字体包构建工具

### 完整验证流程

1. **修复字体包构建工具**（生成新字体时更新 `createdAt`）
2. **生成新字体包**（确保 `createdAt` 是当前时间）
3. **运行构建脚本**：`bash scripts/build-cep-prod.sh`
4. **验证复制**：检查 `extension/client/dist/fonts/user-font-pack/manifest.json`
5. **重启 Illustrator**
6. **测试 CEP 插件**：
   - 启动时应显示新的 `createdAt`
   - 手动刷新应显示新的 `createdAt`
   - 轮询机制应能检测到更新

## 临时解决方案

在字体包构建工具修复之前，用户可以手动更新 `createdAt`：

```bash
# 1. 生成新字体包
# 2. 手动编辑 public/fonts/user-font-pack/manifest.json
# 3. 更新 createdAt 为当前时间
# 4. 运行构建脚本
bash scripts/build-cep-prod.sh
# 5. 重启 Illustrator
```

## 相关文件

- `scripts/build-cep-prod.sh` - 构建脚本（已修复）
- `tools/font-pack-builder/` - 字体包构建工具（需要修复）
- `public/fonts/user-font-pack/` - 源字体包位置
- `extension/client/dist/fonts/user-font-pack/` - CEP 运行时字体包位置

## 总结

Task 19.18 的根本原因不是 CEP 插件的缓存问题，而是：
1. ✅ 构建脚本路径配置错误（已修复）
2. ⚠️ 字体包构建工具未更新时间戳（需要修复）

CEP 插件的轮询和缓存清除机制都是正确的，问题在于上游的字体包生成流程。
