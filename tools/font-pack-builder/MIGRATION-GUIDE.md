# Font Pack Builder 迁移指南

## 概述

本指南帮助您从旧版本的 Font Pack Builder 迁移到新版本（Phase 1-5 完整实现）。

## 版本信息

- **旧版本**：Phase 0（初始实现）
- **新版本**：Phase 5（完整实现）
- **迁移日期**：2026-02-10

---

## 主要变更

### 1. 默认行为变更

#### 旧版本（Phase 0）
- **默认字符集**：仅 base 字符集（62 个字符）
  - 大写字母：A-Z
  - 小写字母：a-z
  - 数字：0-9

#### 新版本（Phase 5）
- **默认字符集**：base + extended-math-default（84 个字符）
  - 大写字母：A-Z
  - 小写字母：a-z
  - 数字：0-9
  - **新增**：基础运算符（+ - = × · ÷ < > ≤ ≥ −）
  - **新增**：基础定界符（| /）
  - **新增**：基础标点（. , : ; ' ! % " ?）

**影响**：新版本默认会替换更多字符，可能影响公式的视觉效果。

---

### 2. 新增字符集

新版本引入了三个额外的字符集：

#### Extended-Math-Optional（11 个字符，默认关闭）
- 括号：( ) [ ] { }
- 特殊符号：* ~ → ← –

#### Extended-Math-Advanced（30 个字符，默认关闭）
- 伸缩括号、根号、积分、求和等可伸缩符号
- **需要字体支持 OpenType MATH 表**

#### Extended-Text-Symbols（默认关闭）
- 全角符号和特殊文本符号

---

### 3. 新增功能

#### 字体能力检测
- 自动检测 OpenType MATH 表
- 计算 L1/L2/L3 覆盖率
- 生成 `capabilities.json` 报告

#### 同形异码字符处理
- 自动处理 minus、slash、vertical line、not sign 等同形异码字符
- 全角字符自动映射到 ASCII

#### KeepOriginalAdvance 策略
- 运算符仅替换 glyph path，保持 MathJax 原 advance width
- 确保运算符间距和上标位置一致

#### Path Centering 优化
- 可选的 path 居中修正功能
- 使用 `--enable-path-centering` 启用

#### 失败回退机制
- 提取失败时自动回退到 MathJax base fontdata
- 记录 fallbacks 和 failures
- 确保字体包完整性

#### 详细报告
- `report.json`：详细构建报告
- `capabilities.json`：字体能力检测报告
- `replacement-report.json`：分层替换统计
- `manifest.json`：增强的元数据（buildId、sourceFontHash）

---

## 迁移步骤

### 步骤 1：了解默认行为变更

新版本默认会替换更多字符（84 个 vs 62 个）。如果您希望保持旧版本的行为，请使用 `--base-only` 参数。

### 步骤 2：选择迁移策略

#### 策略 A：使用新默认行为（推荐）

**适用场景**：
- 您希望获得更好的字体一致性
- 您的字体在运算符和标点上有良好的设计

**操作**：
```bash
# 无需任何参数，直接使用新默认行为
node build.js -i font.ttf -o output -n "MyFont"
```

**优点**：
- 更多字符使用您的自定义字体
- 更好的视觉一致性
- 智能的 keepOriginalAdvance 策略确保排版质量

**注意事项**：
- 检查运算符的视觉效果
- 如果运算符偏移，可以启用 `--enable-path-centering`

#### 策略 B：保持旧版本行为（向后兼容）

**适用场景**：
- 您已经在生产环境中使用旧版本
- 您不希望改变现有的视觉效果
- 您只想替换字母和数字

**操作**：
```bash
# 使用 --base-only 参数
node build.js -i font.ttf -o output -n "MyFont" --base-only
```

**优点**：
- 与旧版本完全一致
- 零风险迁移

**缺点**：
- 无法使用新功能（扩展字符集、能力检测等）

#### 策略 C：渐进式迁移（推荐用于生产环境）

**适用场景**：
- 您想逐步测试新功能
- 您需要在生产环境中验证效果

**操作**：
1. **第一阶段**：使用 `--base-only` 迁移到新版本
   ```bash
   node build.js -i font.ttf -o output -n "MyFont" --base-only
   ```

2. **第二阶段**：在测试环境中尝试新默认行为
   ```bash
   node build.js -i font.ttf -o output -n "MyFont"
   ```

3. **第三阶段**：根据需要启用可选字符集
   ```bash
   node build.js -i font.ttf -o output -n "MyFont" --enable-optional
   ```

4. **第四阶段**：如果字体支持 MATH 表，尝试高级字符集
   ```bash
   node build.js -i font.ttf -o output -n "MyFont" --enable-advanced
   ```

---

### 步骤 3：验证迁移结果

#### 检查构建报告

查看 `report.json` 文件：
```json
{
  "statistics": {
    "total": 158,
    "successful": 158,
    "failed": 0,
    "fallback": 0
  }
}
```

- `successful`：成功从用户字体提取的字符数
- `fallback`：回退到 MathJax base fontdata 的字符数
- `failed`：完全失败的字符数（应该为 0）

#### 检查字体能力

查看 `capabilities.json` 文件：
```json
{
  "hasMATH": true,
  "l1Coverage": { "coverage": "100.0%" },
  "l2Coverage": { "coverage": "84.6%" },
  "l3Coverage": { "coverage": "100.0%" }
}
```

- `hasMATH`：字体是否支持 OpenType MATH 表
- `l1Coverage`：基础字符覆盖率
- `l2Coverage`：扩展数学符号覆盖率
- `l3Coverage`：可伸缩符号覆盖率

#### 视觉验证

1. 在主工具中加载新字体包
2. 测试以下公式：
   - 基础公式：`x + y = z`
   - 运算符：`a × b ÷ c`
   - 上标：`x^2 + y^2`
   - 分数：`\frac{a}{b}`
   - 根号：`\sqrt{x}`（如果启用了 advanced）

3. 检查以下方面：
   - 字符是否正确显示
   - 运算符间距是否合理
   - 上标位置是否正确
   - 分数线是否对齐

---

## 常见问题

### Q1: 迁移后公式显示异常怎么办？

**A**: 按以下步骤排查：

1. **检查 report.json**：查看是否有 fallback 或 failed 字符
2. **尝试 --base-only**：确认是否是扩展字符集导致的问题
3. **启用 path centering**：如果运算符偏移，使用 `--enable-path-centering`
4. **查看 capabilities.json**：确认字体能力是否符合预期

### Q2: 如何回退到旧版本行为？

**A**: 使用 `--base-only` 参数即可：
```bash
node build.js -i font.ttf -o output -n "MyFont" --base-only
```

这与旧版本的行为完全一致。

### Q3: 新版本生成的字体包能在旧版本主工具中使用吗？

**A**: 可以。新版本生成的 `fontdata.js` 格式与旧版本兼容。但是：
- 旧版本主工具无法读取新的报告文件（report.json、capabilities.json）
- 旧版本主工具无法利用新的元数据（buildId、sourceFontHash）

### Q4: 我的字体没有 MATH 表，能使用新版本吗？

**A**: 完全可以。新版本会自动检测字体能力：
- 没有 MATH 表时，会跳过 advanced 字符集
- 基础功能（base + extended-math-default）不受影响
- 工具会在 capabilities.json 中说明原因

### Q5: 迁移后字体包大小会增加吗？

**A**: 会略有增加：
- 旧版本：约 62 个字符
- 新版本（默认）：约 84 个字符
- 新版本（启用 optional）：约 95 个字符
- 新版本（启用 advanced）：约 125 个字符

但增加的大小通常可以忽略不计（几 KB）。

---

## 最佳实践

### 1. 生产环境迁移

- 使用渐进式迁移策略（策略 C）
- 在测试环境中充分验证
- 保留旧版本字体包作为备份

### 2. 新项目

- 直接使用新默认行为（base + extended-math-default）
- 根据字体特性选择是否启用 optional 和 advanced
- 查看 capabilities.json 了解字体能力

### 3. 字体选择

- **普通字体**：使用默认设置即可
- **专业数学字体**（如 Latin Modern Math）：可以启用 advanced 字符集
- **设计字体**：根据设计特点选择启用 optional

### 4. 问题排查

1. 始终先查看 `report.json` 和 `capabilities.json`
2. 使用 `--base-only` 作为基准测试
3. 逐步启用扩展字符集，定位问题

---

## 技术支持

如果遇到迁移问题，请查看：
1. `README.md` - 完整的技术文档
2. `使用说明.md` - 中文使用指南
3. `PHASE3-ACCEPTANCE.md` - Phase 3 验收文档
4. `PHASE4-ACCEPTANCE.md` - Phase 4 验收文档

---

## 总结

新版本 Font Pack Builder 提供了更强大的功能和更好的用户体验：
- ✅ 更多字符支持（84 个 vs 62 个）
- ✅ 智能字体能力检测
- ✅ 自动失败回退机制
- ✅ 详细的构建报告
- ✅ 向后兼容模式（--base-only）

**推荐迁移路径**：
1. 新项目：直接使用新默认行为
2. 现有项目：使用 `--base-only` 保持兼容，逐步测试新功能
3. 生产环境：渐进式迁移，充分验证

祝您迁移顺利！
