# Task 19.17 Tooltip 修复报告

## 问题描述

用户报告三点按钮的 tooltip 未显示"字体选项-更多"，其他 3 项修复已验收成功：
- ✅ z-index 层级修复（下拉菜单显示在分割线上方）
- ✅ Hover 效果（菜单项背景色变化）
- ✅ Active 效果（点击时 opacity 变化）
- ❌ Tooltip 文本未更新

## 根本原因分析

### 问题根源

**JavaScript 设置 title 属性的方式不可靠**

原代码在 `src/main.ts` 中通过 JavaScript 动态设置：
```typescript
if (fontToolBtn) {
  fontToolBtn.title = '字体选项-更多';
  // ...
}
```

**可能的失败原因：**
1. **执行时机问题**：JavaScript 代码可能在 DOM 完全加载前执行
2. **元素获取失败**：`getElementById` 可能返回 null
3. **浏览器缓存**：CEP webview 可能缓存了旧的 DOM 状态
4. **属性覆盖**：其他代码可能覆盖了 title 属性

### 最佳实践

**直接在 HTML 中定义 title 属性更可靠：**
- ✅ 在 DOM 解析时就存在
- ✅ 不依赖 JavaScript 执行时机
- ✅ 不会被缓存问题影响
- ✅ 符合 HTML 语义化标准

## 修复方案

### 修改内容

**文件：`math-formula-plugin/index.html`**

**修改前：**
```html
<div id="font-tool-btn" class="font-tool-button">
  <svg width="16" height="16" viewBox="0 0 16 16">
    <circle cx="3" cy="8" r="1.6" fill="currentColor"/>
    <circle cx="8" cy="8" r="1.6" fill="currentColor"/>
    <circle cx="13" cy="8" r="1.6" fill="currentColor"/>
  </svg>
</div>
```

**修改后：**
```html
<div id="font-tool-btn" class="font-tool-button" title="字体选项-更多">
  <svg width="16" height="16" viewBox="0 0 16 16">
    <circle cx="3" cy="8" r="1.6" fill="currentColor"/>
    <circle cx="8" cy="8" r="1.6" fill="currentColor"/>
    <circle cx="13" cy="8" r="1.6" fill="currentColor"/>
  </svg>
</div>
```

**关键变化：**
- 在 `<div>` 标签中直接添加 `title="字体选项-更多"` 属性

### JavaScript 代码保留

虽然 HTML 中已经定义了 title，但 `src/main.ts` 中的代码仍然保留：
```typescript
fontToolBtn.title = '字体选项-更多';
```

**保留原因：**
- 作为双重保险（defense in depth）
- 如果 HTML 被修改，JavaScript 仍能确保 title 正确
- 不影响性能（只是一次属性赋值）

## 构建与部署

### 执行的操作

```bash
# 1. 修改 HTML 文件
# 2. 重新构建并部署到 CEP
bash scripts/build-cep-prod.sh
```

### 验证结果

```bash
$ grep -o 'title="字体选项-更多"' extension/client/dist/index.html
title="字体选项-更多"  ✅
```

**确认：**
- ✅ HTML 文件已更新
- ✅ 构建产物已同步到 CEP 扩展目录
- ✅ title 属性已包含在部署文件中

## 用户操作指南

### 重新加载 CEP 扩展

**必须重启 Illustrator：**
1. **完全关闭** Adobe Illustrator
2. **重新启动** Illustrator
3. 打开扩展：窗口 → 扩展 → 数学公式生成器

**为什么必须重启？**
- CEP webview 会缓存 HTML 文件
- 只关闭面板不会清除缓存
- 必须重启 Illustrator 才能加载新的 HTML

### 验证修复效果

**测试步骤：**
1. 打开 Math Formula Plugin 面板
2. 将鼠标悬停在三点按钮（⋮）上
3. 等待 1-2 秒
4. 应该看到 tooltip 显示："字体选项-更多"

**如果仍未显示：**
1. 确认已完全关闭并重启 Illustrator
2. 检查是否有多个 Illustrator 进程在运行（Activity Monitor）
3. 尝试清除 CEP 缓存：
   ```bash
   rm -rf ~/Library/Caches/Adobe/CEP/extensions/MathFormulaPlugin
   ```
4. 重启 Illustrator

## Task 19.17 完整验收清单

### ✅ 所有 4 项修复已完成

1. ✅ **z-index 层级修复**
   - 下拉菜单显示在分割线上方
   - z-index: 10000

2. ✅ **Hover 效果**
   - 鼠标悬停菜单项，背景色变为 `rgba(255, 255, 255, 0.1)`
   - 鼠标离开，背景色恢复透明

3. ✅ **Active 效果**
   - 点击菜单项时，opacity 变为 0.6
   - 释放鼠标，opacity 恢复 1

4. ✅ **Tooltip 文本**
   - 三点按钮 tooltip 显示"字体选项-更多"
   - 直接在 HTML 中定义，更可靠

## 经验教训

### 问题根源
动态设置 HTML 属性（如 title）不如直接在 HTML 中定义可靠，特别是在 CEP webview 环境中。

### 最佳实践

**优先级顺序：**
1. **首选**：直接在 HTML 中定义属性
2. **备选**：JavaScript 动态设置（作为双重保险）
3. **避免**：仅依赖 JavaScript 设置关键属性

**CEP 开发特殊注意事项：**
- CEP webview 有强缓存机制
- 修改 HTML/CSS/JS 后必须重启 Illustrator
- 不要依赖浏览器的"强制刷新"（Cmd+Shift+R）
- 使用 `build-cep-prod.sh` 确保文件同步

### 建议改进

**为所有交互元素添加 title：**
```html
<!-- 好的做法 -->
<button id="my-btn" title="按钮说明">按钮</button>

<!-- 不好的做法 -->
<button id="my-btn">按钮</button>
<script>
  document.getElementById('my-btn').title = '按钮说明';
</script>
```

## 状态更新

- ✅ Task 19.17 所有 4 项修复已完成
- ✅ 构建产物已同步到 CEP 扩展
- ✅ Tooltip 已验证包含在 HTML 中
- ⏳ 等待用户重启 Illustrator 并最终验收

## 下一步

用户需要：
1. **完全关闭** Adobe Illustrator（确保所有进程都退出）
2. **重新启动** Illustrator
3. 打开扩展并测试 tooltip
4. 确认显示"字体选项-更多"

---

**报告生成时间**: 2026-02-26 17:15
**Phase**: Phase 5 - Task 19.17
**状态**: Tooltip 修复完成，等待最终验收
