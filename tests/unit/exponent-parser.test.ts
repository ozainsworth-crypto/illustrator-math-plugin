/**
 * 通用幂次解析器测试
 * 
 * 验收类别覆盖：
 * A) 非花括号幂：^2n, ^3x, ^n2（按规则只绑定一个原子，余下为 tail）
 * B) 花括号幂：^{2n}, ^{n+1}（整体为幂，不产生 tail）
 * C) 控制序列：^\alpha, ^\beta（单个控制序列为原子）
 * D) 边界情况：空字符串、无 tail、复杂表达式
 */

import { describe, it, expect } from 'vitest';
import { parseExponent } from '../../src/lib/ambiguity/exponent-parser';

describe('ExponentParser - 通用幂次绑定与 tail 保留规则', () => {
  describe('A) 非花括号幂 - 单原子绑定', () => {
    it('应该正确解析 ^2n（幂=2，tail=n）', () => {
      const result = parseExponent('2n');
      
      expect(result.exponent).toBe('2');
      expect(result.tail).toBe('n');
      expect(result.lengthInSource).toBe(1);
    });

    it('应该正确解析 ^3x（幂=3，tail=x）', () => {
      const result = parseExponent('3x');
      
      expect(result.exponent).toBe('3');
      expect(result.tail).toBe('x');
      expect(result.lengthInSource).toBe(1);
    });

    it('应该正确解析 ^n2（幂=n，tail=2）', () => {
      const result = parseExponent('n2');
      
      expect(result.exponent).toBe('n');
      expect(result.tail).toBe('2');
      expect(result.lengthInSource).toBe(1);
    });

    it('应该正确解析 ^nx（幂=n，tail=x）', () => {
      const result = parseExponent('nx');
      
      expect(result.exponent).toBe('n');
      expect(result.tail).toBe('x');
      expect(result.lengthInSource).toBe(1);
    });

    it('应该正确解析 ^abc（幂=a，tail=bc）', () => {
      const result = parseExponent('abc');
      
      expect(result.exponent).toBe('a');
      expect(result.tail).toBe('bc');
      expect(result.lengthInSource).toBe(1);
    });

    it('应该正确解析 ^2（幂=2，无 tail）', () => {
      const result = parseExponent('2');
      
      expect(result.exponent).toBe('2');
      expect(result.tail).toBe('');
      expect(result.lengthInSource).toBe(1);
    });

    it('应该正确解析 ^n（幂=n，无 tail）', () => {
      const result = parseExponent('n');
      
      expect(result.exponent).toBe('n');
      expect(result.tail).toBe('');
      expect(result.lengthInSource).toBe(1);
    });
  });

  describe('B) 花括号幂 - 完整内容绑定', () => {
    it('应该正确解析 ^{2n}（幂=2n，无 tail）', () => {
      const result = parseExponent('{2n}');
      
      expect(result.exponent).toBe('2n');
      expect(result.tail).toBe('');
      expect(result.lengthInSource).toBe(4); // {2n}
    });

    it('应该正确解析 ^{n+1}（幂=n+1，无 tail）', () => {
      const result = parseExponent('{n+1}');
      
      expect(result.exponent).toBe('n+1');
      expect(result.tail).toBe('');
      expect(result.lengthInSource).toBe(5); // {n+1}
    });

    it('应该正确解析 ^{3x}（幂=3x，无 tail）', () => {
      const result = parseExponent('{3x}');
      
      expect(result.exponent).toBe('3x');
      expect(result.tail).toBe('');
      expect(result.lengthInSource).toBe(4); // {3x}
    });

    it('应该正确解析 ^{n-1}（幂=n-1，无 tail）', () => {
      const result = parseExponent('{n-1}');
      
      expect(result.exponent).toBe('n-1');
      expect(result.tail).toBe('');
      expect(result.lengthInSource).toBe(5); // {n-1}
    });

    it('应该正确解析 ^{2n}x（幂=2n，tail=x）', () => {
      const result = parseExponent('{2n}x');
      
      expect(result.exponent).toBe('2n');
      expect(result.tail).toBe('x');
      expect(result.lengthInSource).toBe(4); // {2n}
    });

    it('应该正确解析 ^{n+1}m（幂=n+1，tail=m）', () => {
      const result = parseExponent('{n+1}m');
      
      expect(result.exponent).toBe('n+1');
      expect(result.tail).toBe('m');
      expect(result.lengthInSource).toBe(5); // {n+1}
    });
  });

  describe('C) 控制序列 - 单个控制序列为原子', () => {
    it('应该正确解析 ^\\alpha（幂=\\alpha，无 tail）', () => {
      const result = parseExponent('\\alpha');
      
      expect(result.exponent).toBe('\\alpha');
      expect(result.tail).toBe('');
      expect(result.lengthInSource).toBe(6); // \alpha
    });

    it('应该正确解析 ^\\beta（幂=\\beta，无 tail）', () => {
      const result = parseExponent('\\beta');
      
      expect(result.exponent).toBe('\\beta');
      expect(result.tail).toBe('');
      expect(result.lengthInSource).toBe(5); // \beta
    });

    it('应该正确解析 ^\\alpha 2（幂=\\alpha，tail=2）- 控制序列后紧跟数字', () => {
      // 控制序列后紧跟数字时，数字会被识别为 tail
      const result = parseExponent('\\alpha2');
      
      expect(result.exponent).toBe('\\alpha');
      expect(result.tail).toBe('2');
      expect(result.lengthInSource).toBe(6); // \alpha
    });

    it('应该正确解析 ^\\gamma 2（幂=\\gamma，tail=2）', () => {
      const result = parseExponent('\\gamma2');
      
      expect(result.exponent).toBe('\\gamma');
      expect(result.tail).toBe('2');
      expect(result.lengthInSource).toBe(6); // \gamma
    });
  });

  describe('D) 边界情况', () => {
    it('应该处理空字符串', () => {
      const result = parseExponent('');
      
      expect(result.exponent).toBe('');
      expect(result.tail).toBe('');
      expect(result.lengthInSource).toBe(0);
    });

    it('应该处理只有空格的情况', () => {
      const result = parseExponent(' ');
      
      expect(result.exponent).toBe(' ');
      expect(result.tail).toBe('');
      expect(result.lengthInSource).toBe(1);
    });

    it('应该正确处理 tail 后有空格的情况（^2n ）', () => {
      const result = parseExponent('2n ');
      
      expect(result.exponent).toBe('2');
      expect(result.tail).toBe('n');
      expect(result.lengthInSource).toBe(1);
    });

    it('应该正确处理 tail 后有运算符的情况（^2n+）', () => {
      const result = parseExponent('2n+');
      
      expect(result.exponent).toBe('2');
      expect(result.tail).toBe('n');
      expect(result.lengthInSource).toBe(1);
    });

    it('应该正确处理嵌套花括号（^{{a}}）', () => {
      const result = parseExponent('{{a}}');
      
      expect(result.exponent).toBe('{a}');
      expect(result.tail).toBe('');
      expect(result.lengthInSource).toBe(5); // {{a}}
    });

    it('应该正确处理转义花括号（^{\\{a\\}}）', () => {
      const result = parseExponent('{\\{a\\}}');
      
      expect(result.exponent).toBe('\\{a\\}');
      expect(result.tail).toBe('');
      expect(result.lengthInSource).toBe(7); // {\{a\}} - 实际长度为7个字符
    });
  });

  describe('E) 实际使用场景', () => {
    it('应该正确解析分数幂场景：\\frac{1}{a}^2n', () => {
      // 模拟从 ^ 后开始解析
      const afterCaret = '2n=b';
      const result = parseExponent(afterCaret);
      
      expect(result.exponent).toBe('2');
      expect(result.tail).toBe('n');
      expect(result.lengthInSource).toBe(1);
    });

    it('应该正确解析一般幂场景：a^2n', () => {
      const afterCaret = '2n+b';
      const result = parseExponent(afterCaret);
      
      expect(result.exponent).toBe('2');
      expect(result.tail).toBe('n');
      expect(result.lengthInSource).toBe(1);
    });

    it('应该正确解析括号幂场景：(a+b)^2n', () => {
      const afterCaret = '2n*c';
      const result = parseExponent(afterCaret);
      
      expect(result.exponent).toBe('2');
      expect(result.tail).toBe('n');
      expect(result.lengthInSource).toBe(1);
    });
  });
});
