# 分数歧义检测测试指南

## 测试环境准备

1. 完全关闭 Adobe Illustrator
2. 重新启动 Illustrator
3. 打开扩展：窗口 > 扩展 > Math Formula Plugin

## 测试用例

### 测试1: 简单分数 `a/b`

**输入**: `a/b`

**预期行为**:
1. 输入框显示: `a/b`（保持不变）
2. 预览区显示: 分数形式（a 在上，b 在下）
3. 歧义提示出现，显示两个选项：
   - 选项1（默认）: "分数格式" - `\frac{a}{b}`
   - 选项2: "保持原样" - `a/b`

**验证点**:
- [ ] 输入框内容没有改变
- [ ] 预览显示分数
- [ ] 歧义提示出现
- [ ] 有两个候选项

---

### 测试2: 分数加法 `a/b+c`

**输入**: `a/b+c`

**预期行为**:
1. 输入框显示: `a/b+c`（保持不变）
2. 预览区显示: `a/b + c`（分数 a/b 加上 c）
3. 歧义提示出现，显示两个选项：
   - 选项1: "解释 A: 分母包含后续项" - `\frac{a}{b+c}`
   - 选项2（默认）: "解释 B: 分数后加减" - `\frac{a}{b}+c`

**验证点**:
- [ ] 输入框内容没有改变
- [ ] 预览显示 `a/b + c`（不是 `a/b + cab + c`）
- [ ] 歧义提示出现
- [ ] 有两个候选项
- [ ] 默认选项是"解释 B"

---

### 测试3: 分数乘法 `a/b*c`

**输入**: `a/b*c`

**预期行为**:
1. 输入框显示: `a/b*c`（保持不变）
2. 预览区显示: `a/b × c`（分数 a/b 乘以 c）
3. 歧义提示出现，显示两个选项：
   - 选项1（默认）: "分数格式" - `\frac{a}{b}`
   - 选项2: "保持原样" - `a/b`

**验证点**:
- [ ] 输入框内容没有改变
- [ ] 预览显示 `a/b × c`
- [ ] 歧义提示出现
- [ ] 只检测到 `a/b` 的歧义（不是 `a/b*c`）

---

### 测试4: 两个分数 `a/b + c/d`

**输入**: `a/b + c/d`

**预期行为**:
1. 输入框显示: `a/b + c/d`（保持不变）
2. 预览区显示: 两个分数相加
3. 歧义提示出现，显示两个独立的歧义：
   - 第一个歧义: `a/b` 的两个选项
   - 第二个歧义: `c/d` 的两个选项

**验证点**:
- [ ] 输入框内容没有改变
- [ ] 预览显示两个分数
- [ ] 检测到两个独立的歧义

---

## 已知问题排查

### 问题1: 输入 `a/b` 没有歧义提示

**可能原因**:
- SimpleFractionRule 没有正确注册
- 正则表达式匹配失败

**排查步骤**:
1. 打开浏览器开发者工具（CEP > 调试）
2. 查看控制台输出
3. 检查是否有 "ambiguities detected: 0" 的日志

### 问题2: 输入 `a/b+c` 显示重复内容

**可能原因**:
- 重叠过滤逻辑失效
- 两个规则都被应用了

**排查步骤**:
1. 打开浏览器开发者工具
2. 查看控制台输出
3. 检查是否有 "过滤重叠歧义" 的日志

### 问题3: 输入 `a/b+c` 只显示简单分数歧义

**可能原因**:
- FractionScopeRule 优先级不够高
- FractionScopeRule 被过滤掉了

**排查步骤**:
1. 检查 `fraction-scope-rule.ts` 的 priority 是否为 15
2. 检查 `simple-fraction-rule.ts` 的 priority 是否为 10
3. 确认 FractionScopeRule 在 `rules/index.ts` 中已注册

---

## 调试信息收集

如果测试失败，请提供以下信息：

1. **输入内容**: 
2. **实际显示**: 
3. **预期显示**: 
4. **控制台日志**: 
5. **歧义提示内容**: 

---

## 技术细节

### 规则优先级

- FractionScopeRule: priority = 15（更具体的规则）
- SimpleFractionRule: priority = 10（更通用的规则）

### 重叠过滤逻辑

当两个规则检测到重叠的范围时：
1. 保留优先级高的规则（FractionScopeRule）
2. 过滤掉优先级低的规则（SimpleFractionRule）

### 匹配范围

- SimpleFractionRule 匹配 `a/b` [0, 3]
- FractionScopeRule 匹配 `a/b+c` [0, 5]
- 由于范围重叠，只保留 FractionScopeRule

---

## 回归测试清单

在修改代码后，必须运行以下测试：

- [ ] 单元测试: `npm test simple-fraction-rule.test.ts`
- [ ] 集成测试: `npm test overlapping-ambiguity.test.ts`
- [ ] 手动测试: 上述4个测试用例
- [ ] 构建测试: `npm run build`
- [ ] CEP 部署: `bash scripts/build-cep-prod.sh`
- [ ] Illustrator 测试: 完全重启后测试

---

## 相关文档

- [重叠歧义修复文档](./overlapping-ambiguity-fix.md)
- [歧义框架指南](./ambiguity-framework-guide.md)
- [Phase 5 回归测试日志](./phase5-regression-test-log.md)
