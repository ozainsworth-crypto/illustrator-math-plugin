/**
 * 通用幂次绑定与 tail 保留规则
 * 
 * 核心规范：
 * 1. 幂次解析规则（Exponent Tokenization）
 *    - 若 ^ 后为 ^{...}：幂次为花括号内完整内容（允许多 token，如 2n）
 *    - 否则：幂次只能取一个"原子 token"（atomic token）
 *      * 单个数字（0-9）
 *      * 单个变量（a-zA-Z）
 *      * 单个控制序列（\alpha, \beta 等）
 *    - 幂原子之后紧跟的字符序列必须作为 tail 保留
 * 
 * 2. 候选生成不得改变语义
 *    - 不得把 tail 合并进幂次
 *    - 仅允许在 BASE^EXP 这段内部做结合重写
 *    - 输出必须是 ...^{EXP} tail（tail 保留在外）
 * 
 * 3. Replacement 与完整公式重渲染
 *    - 歧义选择后必须将原输入中对应片段改写为 replacementTex
 *    - replacementTex 必须保留 tail
 *    - resolvedInput 必须触发完整的检测/解析/渲染
 */

/**
 * 原子 token 定义：
 * - 单个数字：0-9
 * - 单个字母：a-zA-Z
 * - 控制序列：\alpha, \beta, \gamma 等（\后跟字母序列）
 */
export interface ExponentParseResult {
  /** 幂次部分（不包含 ^） */
  exponent: string;
  /** 后续乘法项或其他内容 */
  tail: string;
  /** 幂次在原始字符串中的长度（包括可能的花括号，但不包括 ^） */
  lengthInSource: number;
}

/**
 * 解析幂次表达式
 * 
 * @param exponentPart - ^ 后面的部分（不包含 ^）
 * @returns 解析结果：{ exponent, tail, lengthInSource }
 * 
 * @example
 * parseExponent('2n')      // => { exponent: '2', tail: 'n', lengthInSource: 1 }
 * parseExponent('{2n}')    // => { exponent: '2n', tail: '', lengthInSource: 4 }
 * parseExponent('nx')      // => { exponent: 'n', tail: 'x', lengthInSource: 1 }
 * parseExponent('{n+1}')   // => { exponent: 'n+1', tail: '', lengthInSource: 5 }
 * parseExponent('\\alpha') // => { exponent: '\\alpha', tail: '', lengthInSource: 6 }
 */
export function parseExponent(exponentPart: string): ExponentParseResult {
  // 情况 1: 花括号形式 ^{...}
  // 幂次为花括号内完整内容，支持多 token 和运算符
  if (exponentPart.startsWith('{')) {
    // 需要正确匹配嵌套的花括号
    let braceCount = 0;
    let closeBraceIndex = -1;
    
    for (let i = 0; i < exponentPart.length; i++) {
      const char = exponentPart[i];
      
      // 跳过转义字符（如 \{ 或 \}）
      if (char === '\\' && i + 1 < exponentPart.length) {
        i++; // 跳过下一个字符
        continue;
      }
      
      if (char === '{') {
        braceCount++;
      } else if (char === '}') {
        braceCount--;
        if (braceCount === 0) {
          closeBraceIndex = i;
          break;
        }
      }
    }
    
    if (closeBraceIndex !== -1) {
      const exponent = exponentPart.substring(1, closeBraceIndex);
      const afterBrace = exponentPart.substring(closeBraceIndex + 1);
      
      // 提取紧跟的乘法项（只匹配字母数字，直到遇到分隔符）
      const tailMatch = afterBrace.match(/^([a-zA-Z0-9]+)/);
      const tail = tailMatch ? tailMatch[1] : '';
      
      return {
        exponent,
        tail,
        lengthInSource: closeBraceIndex + 1, // 包括 { 和 }
      };
    }
  }

  // 情况 2: 非花括号形式 - 只取一个原子 token
  
  // 2a. 控制序列（如 \alpha, \beta）
  const controlSeqMatch = exponentPart.match(/^\\[a-zA-Z]+/);
  if (controlSeqMatch) {
    const exponent = controlSeqMatch[0];
    const afterControlSeq = exponentPart.substring(exponent.length);
    
    // 提取紧跟的乘法项
    const tailMatch = afterControlSeq.match(/^([a-zA-Z0-9]+)/);
    const tail = tailMatch ? tailMatch[1] : '';
    
    return {
      exponent,
      tail,
      lengthInSource: exponent.length,
    };
  }

  // 2b. 单个字符（数字或字母）
  if (exponentPart.length > 0) {
    const exponent = exponentPart[0];
    const afterFirst = exponentPart.substring(1);
    
    // 提取紧跟的乘法项
    const tailMatch = afterFirst.match(/^([a-zA-Z0-9]+)/);
    const tail = tailMatch ? tailMatch[1] : '';
    
    return {
      exponent,
      tail,
      lengthInSource: 1,
    };
  }

  // 无效情况
  return { exponent: '', tail: '', lengthInSource: 0 };
}

/**
 * 计算幂次在原始字符串中的实际长度（包括可能的花括号）
 * 用于计算 range.end
 * 
 * @param exponentPart - ^ 后面的部分
 * @param parseResult - parseExponent 的返回结果
 * @returns 幂次在原始字符串中的长度
 */
export function getExponentLengthInSource(
  _exponentPart: string,
  parseResult: ExponentParseResult
): number {
  return parseResult.lengthInSource;
}
