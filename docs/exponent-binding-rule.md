# 通用幂次绑定与 Tail 保留规则

## 概述

本文档定义了适用于所有出现 `^` 的情况的通用幂次解析规则，确保幂次绑定的一致性和语义正确性。

## 核心规范

### 1. 幂次解析规则（Exponent Tokenization）

#### 1.1 花括号形式：`^{...}`
- **规则**：幂次为花括号内完整内容
- **特性**：允许多 token 和运算符
- **示例**：
  - `^{2n}` → 幂次 = `2n`，tail = ``
  - `^{n+1}` → 幂次 = `n+1`，tail = ``
  - `^{n-1}` → 幂次 = `n-1`，tail = ``

#### 1.2 非花括号形式：`^x`
- **规则**：幂次只能取一个"原子 token"（atomic token）
- **原子 token 定义**：
  - 单个数字：`0-9`
  - 单个字母：`a-zA-Z`
  - 单个控制序列：`\alpha`, `\beta`, `\gamma` 等（`\` 后跟字母序列）
- **示例**：
  - `^2n` → 幂次 = `2`，tail = `n`
  - `^nx` → 幂次 = `n`，tail = `x`
  - `^\alpha2` → 幂次 = `\alpha`，tail = `2`

#### 1.3 Tail 保留规则
- **规则**：幂原子之后紧跟的字符序列必须作为 tail 保留
- **语义**：tail 由上层解析为乘法/后继项，不得自动并入幂次
- **提取规则**：只匹配紧跟的字母数字序列 `[a-zA-Z0-9]+`，直到遇到分隔符（空格、运算符等）

### 2. 候选生成不得改变语义

#### 2.1 基本原则
- **禁止**：把 tail 合并进幂次
- **允许**：仅在 `BASE^EXP` 这段内部做结合重写
- **输出格式**：`...^{EXP} tail`（tail 保留在外）

#### 2.2 示例
对于 `\frac{1}{a}^2n`：
- ✅ 正确：候选 A = `\left(\frac{1}{a}\right)^{2} n`
- ✅ 正确：候选 B = `\frac{1}{a^{2}} n`
- ❌ 错误：候选 A = `\left(\frac{1}{a}\right)^{2n}`（吞并了 tail）

### 3. Replacement 与完整公式重渲染

#### 3.1 Range 计算
- **range.start**：歧义片段的起始位置
- **range.end**：必须包含幂次和 tail 的结束位置
- **range.text**：完整的歧义片段（包括 tail）

#### 3.2 Replacement 流程
1. 用户选择候选项
2. 从 `replacementTex` 获取替换文本（包含 tail）
3. 执行替换：`resolvedInput = originalInput.substring(0, range.start) + replacementTex + originalInput.substring(range.end)`
4. 触发完整的检测/解析/渲染流程
5. 预览与导出 SVG 均基于 `resolvedInput`

## 实现

### 核心模块

#### `exponent-parser.ts`
提供通用幂次解析功能：

```typescript
export interface ExponentParseResult {
  exponent: string;        // 幂次部分
  tail: string;            // 后续乘法项
  lengthInSource: number;  // 幂次在原始字符串中的长度
}

export function parseExponent(exponentPart: string): ExponentParseResult
```

### 使用示例

```typescript
import { parseExponent } from './exponent-parser';

// 解析 ^ 后的内容
const afterCaret = '2n+b';
const result = parseExponent(afterCaret);

console.log(result.exponent);        // '2'
console.log(result.tail);            // 'n'
console.log(result.lengthInSource);  // 1

// 计算 range.end
const matchEnd = /* ^ 的位置 + 1 */;
const rangeEnd = matchEnd + result.lengthInSource + result.tail.length;
```

## 受影响的规则

当前使用通用幂次解析器的歧义规则：

1. **fraction-exponent-rule**（分数幂绑定歧义）
   - 检测模式：`\frac{N}{X}^E`
   - 使用解析器确保正确处理 `^2n` vs `^{2n}`

## 验收测试覆盖

### A) 非花括号幂
- ✅ `^2n` → 幂=2，tail=n
- ✅ `^3x` → 幂=3，tail=x
- ✅ `^n2` → 幂=n，tail=2

### B) 花括号幂
- ✅ `^{2n}` → 幂=2n，tail=空
- ✅ `^{n+1}` → 幂=n+1，tail=空

### C) 分数基底
- ✅ `\frac{1}{a}^2n` → 候选保留 tail
- ✅ `\frac{2}{a}^3x` → 候选保留 tail

### D) 一般基底
- ✅ `a^2n` → 幂=2，tail=n
- ✅ `(a+b)^2n` → 幂=2，tail=n

### E) 完整公式重渲染
- ✅ `a^{2n}+\frac{1}{a}^2n=b` → 选择候选后正确替换
- ✅ `a^{n}+\frac{1}{a}^n` → 选择候选后正确替换

## 测试文件

- **单元测试**：`tests/unit/exponent-parser.test.ts`（26个测试用例）
- **集成测试**：`tests/unit/fraction-exponent-rule.test.ts`（18个测试用例）
- **端到端测试**：`tests/integration/fraction-exponent-ambiguity.test.ts`（9个测试用例）

## 扩展指南

### 为新规则添加幂次解析支持

1. 导入解析器：
```typescript
import { parseExponent } from '../exponent-parser';
```

2. 在检测逻辑中使用：
```typescript
const afterCaret = latex.substring(caretPosition + 1);
const parseResult = parseExponent(afterCaret);
const { exponent, tail, lengthInSource } = parseResult;
```

3. 计算正确的 range：
```typescript
const rangeEnd = caretPosition + 1 + lengthInSource + tail.length;
```

4. 在候选生成中保留 tail：
```typescript
{
  label: '候选项',
  tex: `...^{${exponent}}${tail ? ` ${tail.trim()}` : ''}`,
  replacementTex: `...^{${exponent}}${tail ? ` ${tail.trim()}` : ''}`,
}
```

## 注意事项

1. **控制序列贪婪匹配**：`\alphan` 会被解析为一个完整的控制序列，而不是 `\alpha` + `n`。实际使用中，控制序列后通常有空格或非字母字符。

2. **Tail 提取限制**：只提取紧跟的字母数字序列，不包括空格或运算符。这确保了语义的正确性。

3. **Range 计算**：`range.end` 必须包含 tail，否则替换时会导致 tail 重复。

4. **完整公式渲染**：选择候选后必须重新渲染完整公式，而不是只渲染局部片段。
