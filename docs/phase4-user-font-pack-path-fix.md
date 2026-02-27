# Phase 4 - 用户字体包路径修复

## 问题描述

用户报告在 CEP 环境中，"自主字体"选项处于不可选择（disabled）状态。

## 根本原因

`FontPackLoader` 使用的路径 `/fonts/user-font-pack` 是绝对路径，在 CEP 环境中无法正确解析。

### 路径问题分析

1. **Web 环境**：`/fonts/user-font-pack` 可以工作（相对于服务器根目录）
2. **CEP 环境**：需要使用相对于 `index.html` 的路径
3. **实际文件位置**：`extension/client/dist/fonts/user-font-pack/`

## 解决方案

### 修改路径为相对路径

将 `FontPackLoader` 中的路径从绝对路径改为相对路径：

```typescript
// 修改前
private readonly USER_FONT_PACK_PATH = '/fonts/user-font-pack';

// 修改后
private readonly USER_FONT_PACK_PATH = './fonts/user-font-pack';
```

### 增强调试日志

添加详细的调试日志以便诊断加载问题：

```typescript
console.log(`[FontPackLoader] 尝试加载用户字体包，路径: ${packPath}`);
console.log(`[FontPackLoader] 请求 manifest URL: ${manifestUrl}`);
console.log(`[FontPackLoader] manifest 响应状态: ${manifestResponse.status}`);
```

## 验证步骤

1. 构建项目：`npm run build`
2. 构建 CEP 扩展：`bash scripts/build-cep-prod.sh`
3. 完全关闭 Adobe Illustrator
4. 重新启动 Illustrator
5. 打开扩展：窗口 > 扩展 > Math Formula Plugin
6. 检查"自主字体"选项是否可选择
7. 查看浏览器控制台日志（右键扩展面板 > Inspect）

## 预期结果

- "自主字体"选项应该可以选择
- 控制台应显示成功加载字体包的日志
- 字体选择器应显示字体包名称和状态

## 相关文件

- `src/lib/font-pack-loader.ts` - 字体包加载器（路径修复）
- `extension/client/dist/fonts/user-font-pack/` - 字体包文件位置
- `scripts/build-cep-prod.sh` - CEP 构建脚本

## Phase 归属

Phase 4 - Adobe Illustrator CEP Integration

## 状态

✅ 已修复，等待用户验证
