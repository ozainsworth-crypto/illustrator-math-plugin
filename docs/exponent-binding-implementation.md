# 通用幂次绑定与 Tail 保留规则 - 实现说明

## 实现概述

本次实现将分数幂绑定修复提升为通用的"幂次绑定与 tail 保留规则"，适用于所有出现 `^` 的情况。

## 核心模块

### 1. 幂次解析器（Exponent Parser）

**文件**：`src/lib/ambiguity/exponent-parser.ts`

**功能**：提供通用的幂次解析功能，确保所有歧义规则使用一致的 tokenization 逻辑。

**接口**：

```typescript
export interface ExponentParseResult {
  exponent: string;        // 幂次部分（不包含 ^）
  tail: string;            // 后续乘法项
  lengthInSource: number;  // 幂次在原始字符串中的长度
}

export function parseExponent(exponentPart: string): ExponentParseResult
```

**Token 定义**：

1. **花括号形式** `^{...}`：
   - 幂次 = 花括号内完整内容
   - 支持多 token 和运算符（如 `2n`, `n+1`, `n-1`）
   - Tail = 花括号后紧跟的字母数字序列

2. **非花括号形式** `^x`：
   - 幂次 = 单个原子 token
   - 原子类型：
     - 单个数字：`0-9`
     - 单个字母：`a-zA-Z`
     - 单个控制序列：`\alpha`, `\beta` 等
   - Tail = 原子后紧跟的字母数字序列

**边界处理**：

- 转义字符：正确处理 `\{` 和 `\}` 不作为花括号边界
- 嵌套花括号：支持 `{{a}}` 等嵌套结构
- 控制序列：贪婪匹配 `\[a-zA-Z]+`
- Tail 提取：只匹配 `[a-zA-Z0-9]+`，不包括空格或运算符

### 2. 分数幂绑定规则（Fraction Exponent Rule）

**文件**：`src/lib/ambiguity/rules/fraction-exponent-rule.ts`

**更新内容**：

1. 导入通用解析器：
```typescript
import { parseExponent } from '../exponent-parser';
```

2. 使用解析器替代本地实现：
```typescript
const parseResult = parseExponent(afterCaret);
const { exponent, tail, lengthInSource } = parseResult;
```

3. 使用 `lengthInSource` 计算 range：
```typescript
const rangeEnd = matchEnd + lengthInSource + tail.length;
```

4. 在候选生成中保留 tail：
```typescript
{
  label: '分数整体的幂',
  tex: `\\left(\\frac{${numerator}}{${denominator}}\\right)^{${exponent}}${tail}`,
  replacementTex: `\\left(\\frac{${numerator}}{${denominator}}\\right)^{${exponent}}${tail}`,
}
```

## 测试覆盖

### 单元测试

**文件**：`tests/unit/exponent-parser.test.ts`

**测试用例**：26个

**覆盖类别**：
- A) 非花括号幂 - 单原子绑定（7个测试）
- B) 花括号幂 - 完整内容绑定（6个测试）
- C) 控制序列 - 单个控制序列为原子（4个测试）
- D) 边界情况（6个测试）
- E) 实际使用场景（3个测试）

### 集成测试

**文件1**：`tests/unit/fraction-exponent-rule.test.ts`

**测试用例**：18个

**覆盖内容**：
- 正确解析幂次，不吞并乘法项
- 检测分数幂绑定歧义
- 不应该误报
- 规则元数据
- 默认策略：分子为1时选择分母的幂
- replacementTex 字段

**文件2**：`tests/integration/fraction-exponent-ambiguity.test.ts`

**测试用例**：9个

**覆盖内容**：
- 检测并提供两种解释
- 正确处理幂和乘法项
- 处理 LaTeX 命令输入
- 检测多个分数幂歧义
- 提供 UI 展示信息
- 支持完整公式的替换和重渲染
- 默认策略验证

**文件3**：`tests/integration/exponent-binding-comprehensive.test.ts`

**测试用例**：13个

**验收类别覆盖**：
- A) 非花括号幂：`^2n`, `^3x`, `^n2`（3个测试）
- B) 花括号幂：`^{2n}`, `^{n+1}`（2个测试）
- C) 分数基底：`\frac{1}{a}^2n`, `\frac{2}{a}^3x`（2个测试）
- D) 一般基底：`a^2n`, `(a+b)^2n`（1个测试）
- E) 完整公式重渲染（3个测试）
- F) 默认策略验证（2个测试）

## 测试结果

### 总体统计

- **总测试数**：282个（269个原有 + 13个新增综合测试）
- **通过率**：100%
- **新增测试文件**：2个
  - `tests/unit/exponent-parser.test.ts`（26个测试）
  - `tests/integration/exponent-binding-comprehensive.test.ts`（13个测试）

### 验收测试结果

#### A) 非花括号幂
✅ `\frac{1}{a}^2n` → 幂=2，tail=n，候选保留 tail
✅ `\frac{2}{a}^3x` → 幂=3，tail=x，候选保留 tail
✅ `\frac{1}{b}^n2` → 幂=n，tail=2，候选保留 tail

#### B) 花括号幂
✅ `\frac{1}{a}^{2n}` → 幂=2n，无 tail
✅ `\frac{2}{x}^{n+1}` → 幂=n+1，无 tail（支持运算符）

#### C) 分数基底
✅ `\frac{1}{a}^2n` → 候选生成保留 tail
✅ `\frac{x+1}{b}^3y` → 复杂表达式中保留 tail

#### D) 一般基底
✅ 解析器遵循相同的 tokenization 规则
✅ 可用于任何基底类型（概念验证）

#### E) 完整公式重渲染
✅ `a^{2n}+\frac{1}{a}^2n=b` → 选择候选后：`a^{2n}+\frac{1}{a^{2}} n=b`
✅ `a^{n}+\frac{1}{a}^n` → 选择候选后：`a^{n}+\frac{1}{a^{n}}`
✅ 多个歧义的替换正确处理

## 受影响的规则列表

### 当前使用通用解析器的规则

1. **fraction-exponent-rule**（分数幂绑定歧义）
   - 文件：`src/lib/ambiguity/rules/fraction-exponent-rule.ts`
   - 检测模式：`\frac{N}{X}^E`
   - 使用解析器确保正确处理幂次和 tail

### 未来可扩展的规则

通用解析器设计为可被任何需要处理幂次的歧义规则使用，包括但不限于：

- 一般幂次绑定歧义（如 `a^2n` vs `a^{2n}`）
- 括号幂次绑定歧义（如 `(a+b)^2n`）
- 根式幂次绑定歧义（如 `\sqrt{a}^2n`）

## 扩展指南

### 为新规则添加幂次解析支持

1. **导入解析器**：
```typescript
import { parseExponent } from '../exponent-parser';
```

2. **在检测逻辑中使用**：
```typescript
// 找到 ^ 的位置
const caretPosition = /* ... */;
const afterCaret = latex.substring(caretPosition + 1);

// 解析幂次
const parseResult = parseExponent(afterCaret);
const { exponent, tail, lengthInSource } = parseResult;
```

3. **计算正确的 range**：
```typescript
const start = /* 基底的起始位置 */;
const end = caretPosition + 1 + lengthInSource + tail.length;
const matchedText = latex.substring(start, end);
```

4. **在候选生成中保留 tail**：
```typescript
{
  label: '候选项',
  tex: `BASE^{${exponent}}${tail ? ` ${tail.trim()}` : ''}`,
  replacementTex: `BASE^{${exponent}}${tail ? ` ${tail.trim()}` : ''}`,
}
```

## 文档

### 规范文档
- **文件**：`docs/exponent-binding-rule.md`
- **内容**：完整的规范定义、使用示例、验收测试覆盖

### 实现文档
- **文件**：`docs/exponent-binding-implementation.md`（本文档）
- **内容**：实现细节、测试结果、扩展指南

## 注意事项

1. **控制序列贪婪匹配**：
   - `\alphan` 会被解析为一个完整的控制序列
   - 实际使用中，控制序列后通常有空格或非字母字符

2. **Tail 提取限制**：
   - 只提取紧跟的字母数字序列 `[a-zA-Z0-9]+`
   - 不包括空格或运算符
   - 这确保了语义的正确性

3. **Range 计算**：
   - `range.end` 必须包含 tail
   - 否则替换时会导致 tail 重复

4. **完整公式渲染**：
   - 选择候选后必须重新渲染完整公式
   - 不是只渲染局部片段

## 性能考虑

- 解析器使用简单的字符串操作和正则表达式
- 时间复杂度：O(n)，其中 n 是幂次部分的长度
- 空间复杂度：O(1)，只返回固定大小的结果对象
- 对性能影响可忽略不计

## 向后兼容性

- ✅ 所有原有测试（269个）继续通过
- ✅ 没有破坏任何现有功能
- ✅ 新增功能完全向后兼容
