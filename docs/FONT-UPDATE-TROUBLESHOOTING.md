# 自定义字体包更新问题排查指南

## 问题症状

- 使用 Builder Web UI 生成新字体包后，CEP 仍然显示旧字体
- 点击"更新字体信息"按钮也无法读取最新字体
- 日志显示的 buildId 和创建时间没有变化

## 快速修复步骤

### 步骤 1：诊断问题

打开终端，运行诊断脚本：

```bash
cd /path/to/math-formula-plugin
bash scripts/diagnose-builder-output.sh
```

**查看输出**，重点关注：

1. **文件时间戳是否一致**：
   ```
   manifest.json:          Feb 26 17:25:13 2026
   fontdata.js:            Feb 26 13:44:22 2026  ← 如果这个时间和上面不一样，说明有问题
   ```

2. **buildId 信息**：
   ```
   manifest.json 内容:
     buildId: b64c950ba1a53780
     createdAt: 2026-02-26T09:25:13.273Z
   ```

### 步骤 2：强制重新生成字体包

如果诊断发现文件时间戳不一致，运行修复脚本：

```bash
bash scripts/force-rebuild-font-pack.sh
```

脚本会：
1. 读取现有字体包名称
2. 提示你输入原始字体文件路径（.ttf 或 .otf）
3. 完全删除旧的字体包目录
4. 重新生成所有文件
5. 验证文件完整性

**示例交互**：
```
字体包名称: 初中数学字体0226
请提供原始字体文件路径
字体文件路径 (.ttf 或 .otf): /Users/toz/Desktop/jojoupMath0224.ttf
```

### 步骤 3：重新构建 CEP

```bash
bash scripts/build-cep-prod.sh
```

### 步骤 4：完全重启 Illustrator

**重要**：必须完全退出 Illustrator，不是只关闭扩展面板。

1. 退出 Illustrator（Cmd+Q）
2. 等待 5 秒
3. 重新启动 Illustrator

### 步骤 5：验证修复

1. 打开 Math Formula Plugin 扩展
2. 切换到"调试"标签页
3. 查看日志输出

**预期日志**：
```
[18:30:00] ✅ 检测到用户字体包: 初中数学字体0226
[18:30:00]    buildId: <新的 buildId，应该和之前不同>
[18:30:00]    创建时间: <新的时间戳>
[18:30:00]    字符数量: 73
```

4. 输入公式并渲染，验证使用的是新字体

## 常见问题

### Q1: 为什么会出现这个问题？

**A**: Builder Web UI 在某些情况下会使用缓存结果，导致只更新了 `manifest.json`，但没有重新生成 `fontdata.js` 等文件。这通常发生在：
- 只修改了字体名称，没有重新上传字体文件
- 缓存机制误判字体文件没有变化
- Builder 调用失败但没有报错

### Q2: 修复脚本会删除我的字体包吗？

**A**: 是的，修复脚本会完全删除旧的字体包目录，然后重新生成。但你需要提供原始字体文件路径，所以不会丢失数据。

### Q3: 我没有原始字体文件了怎么办？

**A**: 如果你没有原始字体文件，可以尝试：
1. 从备份中恢复
2. 重新从字体来源获取
3. 如果字体文件在 Builder Web UI 的上传目录中，可以从那里找到

### Q4: 修复后还是不行怎么办？

**A**: 请提供以下信息以便进一步诊断：
1. 诊断脚本的完整输出
2. 修复脚本的完整输出
3. CEP 插件的调试日志（"调试"标签页的内容）
4. Builder Web UI 的浏览器控制台日志

## 预防措施

为了避免将来再次出现这个问题：

### 1. 每次生成字体包时都重新上传字体文件

不要只修改字体名称或选项，始终重新上传字体文件。

### 2. 验证生成结果

生成完成后，检查 Builder 输出目录：

```bash
ls -lh math-formula-plugin/public/fonts/user-font-pack/
```

确保所有文件的时间戳一致。

### 3. 使用诊断脚本定期检查

在重新构建 CEP 之前，运行诊断脚本：

```bash
bash scripts/diagnose-builder-output.sh
```

如果发现问题，先运行修复脚本。

## 技术细节

### Builder 输出文件

一个完整的字体包应该包含以下文件：

- `manifest.json`：字体包元数据（名称、版本、buildId、创建时间等）
- `fontdata.js`：MathJax 字体数据（glyph 的 SVG path、metrics 等）
- `capabilities.json`：字体能力报告（MATH table、variants、assembly 等）
- `report.json`：详细的转换报告（统计信息、失败字符等）
- `replacement-report.json`：字符替换报告

**所有这些文件的 mtime（修改时间）应该相同**，因为它们是在同一次 Builder 运行中生成的。

### CEP 缓存机制

CEP 环境使用 Chromium 浏览器，会对 HTTP 资源进行缓存。我们已经实现了多层缓存破解：

1. `cache: 'no-store'`：完全不使用缓存
2. 时间戳参数：`?_t=<timestamp>`
3. 随机数参数：`?_r=<random>`
4. 纳秒级时间戳：`?_n=<nanotime>`

但即使有这些措施，如果 Builder 输出的文件本身就是旧的，CEP 也无法读取到新数据。

### buildId 的作用

`buildId` 是一个 16 位随机十六进制字符串，每次 Builder 运行时都会生成新的 buildId。它用于：

1. 唯一标识一次字体包构建
2. 检测字体包是否有更新（通过比较 buildId）
3. 调试和追踪问题

如果 buildId 没有变化，说明 Builder 没有重新运行，或者使用了缓存结果。

## 相关文档

- `docs/task-19.18-builder-incomplete-generation.md`：详细的技术分析
- `docs/task-19.18-complete-fix.md`：前两轮修复文档
- `scripts/diagnose-builder-output.sh`：诊断脚本
- `scripts/force-rebuild-font-pack.sh`：修复脚本

## 联系支持

如果以上步骤无法解决问题，请提供：

1. 诊断脚本输出
2. 修复脚本输出
3. CEP 调试日志
4. Builder Web UI 控制台日志
5. 操作系统和 Illustrator 版本

我们会尽快帮你解决问题。
