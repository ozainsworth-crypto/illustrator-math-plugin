# 重叠歧义过滤修复

## 问题描述

**Bug 1**: 输入 `a/b+c` 时，渲染结果显示为 `a/b + cab + c`（内容重复）

**Bug 2**: 输入 `a/b+c` 时，无法检测出是 `\frac{a}{b}+c` 还是 `\frac{a}{b+c}` 的歧义

## 根本原因

两个歧义规则检测到了**重叠的范围**：

1. **SimpleFractionRule** 检测到 `a/b`（range: [0, 3]）
   - 生成候选项：`\frac{a}{b}` 或 `a/b`

2. **FractionScopeRule** 检测到 `a/b+c`（range: [0, 5]）
   - 生成候选项：`\frac{a}{b+c}` 或 `\frac{a}{b}+c`

### Bug 1 的原因

当替换逻辑从后往前处理时：
1. 先处理 `FractionScopeRule` 的匹配（range [0, 5]），替换为 `\frac{a}{b}+c`
2. 然后处理 `SimpleFractionRule` 的匹配（range [0, 3]），但此时字符串已经变了，导致错误替换

### Bug 2 的原因

添加重叠过滤逻辑后，由于两个规则优先级相同（都是 10），`SimpleFractionRule` 先注册，所以它的匹配被保留，`FractionScopeRule` 的匹配被过滤掉了。

## 解决方案

### 第一步：添加重叠过滤逻辑

在 `AmbiguityEngine` 中添加**重叠检测和过滤逻辑**，保留优先级高的规则，过滤掉被覆盖的低优先级匹配。

### 第二步：调整规则优先级

提高 `FractionScopeRule` 的优先级（从 10 → 15），让它优先于 `SimpleFractionRule`（优先级 10）执行。

**原理**：
- `FractionScopeRule` 是更具体的歧义规则（检测 `a/b+c` 的分母范围）
- `SimpleFractionRule` 是更通用的规则（只检测 `a/b` 是否转换为分数）
- 当两者都匹配时，应该优先使用更具体的规则

## 实现细节

### 1. 重叠过滤逻辑

**文件**: `src/lib/ambiguity/ambiguity-engine.ts`

添加了两个新方法：
- `filterOverlappingAmbiguities()`: 过滤重叠的歧义
- `rangesOverlap()`: 检查两个范围是否重叠

```typescript
private rangesOverlap(
  range1: { start: number; end: number },
  range2: { start: number; end: number }
): boolean {
  return range1.start < range2.end && range2.start < range1.end;
}
```

### 2. 优先级调整

**文件**: `src/lib/ambiguity/rules/fraction-scope-rule.ts`

```typescript
export class FractionScopeRule implements AmbiguityRule {
  readonly priority = 15; // 高于 SimpleFractionRule (10)
}
```

## 测试验证

### 单元测试

**文件**: `tests/unit/simple-fraction-rule.test.ts`

验证 `SimpleFractionRule` 的基本功能：
- ✅ 检测 `a/b`
- ✅ 检测 `a/b+c` 中的 `a/b`
- ✅ 检测 `a/b*c` 中的 `a/b`

### 集成测试

**文件**: `tests/integration/overlapping-ambiguity.test.ts`

测试场景：
1. ✅ `a/b+c` - 只保留 FractionScopeRule 的匹配（优先级更高）
2. ✅ `a/b*c` - 只有 SimpleFractionRule 匹配（FractionScopeRule 不匹配 `*`）
3. ✅ `a/b + c/d` - 两个不重叠的分数，都保留
4. ✅ `a/b` - 只有 SimpleFractionRule 匹配

所有测试通过（13/13）。

## 预期行为

### 输入: `a/b+c`

**检测阶段**:
- FractionScopeRule 检测到 `a/b+c` [0, 5]（优先级 15）
- SimpleFractionRule 检测到 `a/b` [0, 3]（优先级 10）
- **过滤后**: 只保留 FractionScopeRule 的 `a/b+c` [0, 5]

**歧义提示**:
- 候选项 1: `\frac{a}{b+c}` - 分母包含后续项
- 候选项 2: `\frac{a}{b}+c` - 分数后加减（默认）

**渲染阶段**:
- 使用默认候选项（候选项 2）
- 最终渲染: `\frac{a}{b}+c` ✅

### 输入: `a/b`

**检测阶段**:
- SimpleFractionRule 检测到 `a/b` [0, 3]
- FractionScopeRule 不匹配（需要 `+/-` 后续项）
- **过滤后**: 只有 SimpleFractionRule 的 `a/b` [0, 3]

**歧义提示**:
- 候选项 1: `\frac{a}{b}` - 分数格式（默认）
- 候选项 2: `a/b` - 保持原样

**渲染阶段**:
- 使用默认候选项（候选项 1）
- 最终渲染: `\frac{a}{b}` ✅

### 输入: `a/b*c`

**检测阶段**:
- SimpleFractionRule 检测到 `a/b` [0, 3]
- FractionScopeRule 不匹配（只匹配 `+/-`）
- **过滤后**: 只有 SimpleFractionRule 的 `a/b` [0, 3]

**歧义提示**:
- 候选项 1: `\frac{a}{b}` - 分数格式（默认）
- 候选项 2: `a/b` - 保持原样

**渲染阶段**:
- 使用默认候选项（候选项 1）
- 最终渲染: `\frac{a}{b}*c` ✅

## 影响范围

### 修改的文件
- `src/lib/ambiguity/ambiguity-engine.ts` - 添加重叠过滤逻辑
- `src/lib/ambiguity/rules/fraction-scope-rule.ts` - 提高优先级（10 → 15）
- `src/lib/ambiguity/rules/simple-fraction-rule.ts` - 移除调试日志
- `tests/unit/simple-fraction-rule.test.ts` - 增强测试断言
- `tests/integration/overlapping-ambiguity.test.ts` - 更新测试用例

### 新增的文件
- `tests/integration/overlapping-ambiguity.test.ts` - 重叠歧义过滤测试
- `docs/overlapping-ambiguity-fix.md` - 本文档

### 不影响的功能
- 其他歧义规则的行为
- 用户选择候选项的流程
- 输入框内容保持不变的设计原则

## 验收标准

- [x] 输入 `a/b` 能正确识别为分数
- [x] 输入 `a/b+c` 能正确检测出两种解释的歧义
- [x] 输入 `a/b+c` 默认渲染为 `\frac{a}{b}+c`
- [x] 输入 `a/b*c` 能正确识别 `a/b` 为分数
- [x] 输入框内容在用户确认前保持不变
- [x] 所有单元测试通过（9/9）
- [x] 所有集成测试通过（4/4）
- [x] 构建成功，无 TypeScript 错误

## 部署说明

1. 运行 `npm run build` 构建
2. 运行 `bash scripts/build-cep-prod.sh` 部署到 CEP
3. 完全关闭并重启 Adobe Illustrator
4. 测试以下输入：
   - `a/b` → 显示简单分数歧义
   - `a/b+c` → 显示分母范围歧义（两个候选项）
   - `a/b*c` → 显示简单分数歧义

## 设计原则

### 规则优先级设计

1. **更具体的规则优先级更高**
   - `FractionScopeRule` (15) > `SimpleFractionRule` (10)
   - 原因：`a/b+c` 的分母范围歧义比简单的分数转换更具体

2. **重叠过滤保留高优先级**
   - 当多个规则检测到重叠范围时，保留优先级高的
   - 避免同一位置出现多个冲突的歧义

3. **不同层次的歧义可以共存**
   - 如果未来需要同时显示多个层次的歧义，可以修改过滤逻辑
   - 当前设计优先简洁性，避免用户困惑

## 后续优化建议

1. **调试日志清理**: 已完成 ✅
2. **测试文件清理**: 删除临时调试文件（`test-fraction-debug.html`, `test-regex-debug.js`）
3. **文档更新**: 在 `ambiguity-framework-guide.md` 中说明重叠过滤机制和优先级设计
4. **性能优化**: 如果规则数量增多，考虑使用区间树优化重叠检测

## 相关 Issue

- Bug #1: 输入 `a/b` 无法识别为分数 ✅ 已修复
- Bug #2: 输入 `a/b+c` 渲染结果错误 ✅ 已修复
- Bug #3: 输入 `a/b+c` 无法检测分母范围歧义 ✅ 已修复
