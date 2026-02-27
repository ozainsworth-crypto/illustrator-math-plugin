/**
 * UnicodeMathParser 单元测试
 * 
 * 测试每个解析规则的正确性
 * 
 * 关联需求：需求 2（B2.5）
 */

import { describe, it, expect } from 'vitest';
import { UnicodeMathParser } from '../../src/lib/unicodemath-parser';

describe('UnicodeMathParser', () => {
  const parser = new UnicodeMathParser();

  describe('基础功能', () => {
    it('应该处理空输入', () => {
      const result = parser.parse('');
      expect(result.success).toBe(false);
      expect(result.error).toBe('输入为空');
    });

    it('应该处理纯空白输入', () => {
      const result = parser.parse('   ');
      expect(result.success).toBe(false);
      expect(result.error).toBe('输入为空');
    });
  });

  describe('分数解析', () => {
    it('应该解析简单分数 a/b', () => {
      const result = parser.parse('a/b');
      expect(result.success).toBe(true);
      expect(result.latex).toBe('\\frac{a}{b}');
    });

    it('应该解析嵌套分数 1/(2/3)', () => {
      const result = parser.parse('1/(2/3)');
      expect(result.success).toBe(true);
      expect(result.latex).toBe('\\frac{1}{\\frac{2}{3}}');
    });

    it('应该解析复杂嵌套分数 (a/b)/(c/d)', () => {
      const result = parser.parse('(a/b)/(c/d)');
      expect(result.success).toBe(true);
      expect(result.latex).toBe('\\frac{\\frac{a}{b}}{\\frac{c}{d}}');
    });

    it('应该解析左边有括号的分数 (a+b)/c', () => {
      const result = parser.parse('(a+b)/c');
      expect(result.success).toBe(true);
      expect(result.latex).toBe('\\frac{a+b}{c}');
    });

    it('应该解析右边有括号的分数 a/(b+c)', () => {
      const result = parser.parse('a/(b+c)');
      expect(result.success).toBe(true);
      expect(result.latex).toBe('\\frac{a}{b+c}');
    });
  });

  describe('上下标解析', () => {
    it('应该解析简单上标 x^2', () => {
      const result = parser.parse('x^2');
      expect(result.success).toBe(true);
      expect(result.latex).toBe('x^{2}');
    });

    it('应该解析简单下标 x_i', () => {
      const result = parser.parse('x_i');
      expect(result.success).toBe(true);
      expect(result.latex).toBe('x_{i}');
    });

    it('应该解析上下标组合 x_i^2', () => {
      const result = parser.parse('x_i^2');
      expect(result.success).toBe(true);
      expect(result.latex).toBe('x_{i}^{2}');
    });

    it('应该解析多级上标 x^(y^z)', () => {
      const result = parser.parse('x^(y^z)');
      expect(result.success).toBe(true);
      expect(result.latex).toContain('x^{');
      expect(result.latex).toContain('y^{z}');
    });
  });

  describe('根号解析', () => {
    it('应该解析平方根 √x', () => {
      const result = parser.parse('√x');
      expect(result.success).toBe(true);
      expect(result.latex).toBe('\\sqrt{x}');
    });

    it('应该解析立方根 ∛x', () => {
      const result = parser.parse('∛x');
      expect(result.success).toBe(true);
      expect(result.latex).toBe('\\sqrt[3]{x}');
    });
  });

  describe('括号伸缩解析', () => {
    it('应该为包含分数的括号添加伸缩 (a/b)', () => {
      const result = parser.parse('(a/b)');
      expect(result.success).toBe(true);
      expect(result.latex).toContain('\\left(');
      expect(result.latex).toContain('\\right)');
      expect(result.latex).toContain('\\frac{a}{b}');
    });

    it('应该为包含分数的方括号添加伸缩 [(a+b)/c]', () => {
      const result = parser.parse('[(a+b)/c]');
      expect(result.success).toBe(true);
      expect(result.latex).toContain('\\left[');
      expect(result.latex).toContain('\\right]');
      expect(result.latex).toContain('\\frac{a+b}{c}');
    });

    it('不应该为简单表达式添加伸缩 (x+y)', () => {
      const result = parser.parse('(x+y)');
      expect(result.success).toBe(true);
      expect(result.latex).toBe('(x+y)');
      expect(result.latex).not.toContain('\\left');
    });
  });

  describe('求和/积分解析', () => {
    it('应该解析求和 ∑_(i=1)^n', () => {
      const result = parser.parse('∑_(i=1)^n x_i');
      expect(result.success).toBe(true);
      expect(result.latex).toContain('\\sum_{i=1}^{n}');
      expect(result.latex).toContain('x_{i}');
    });

    it('应该解析积分 ∫_0^∞', () => {
      const result = parser.parse('∫_0^∞ f(x) dx');
      expect(result.success).toBe(true);
      expect(result.latex).toContain('\\int_{0}^{\\infty}');
    });
  });

  describe('矩阵解析', () => {
    it('应该解析 2×2 矩阵 ■(a&b@c&d)', () => {
      const result = parser.parse('■(a&b@c&d)');
      expect(result.success).toBe(true);
      expect(result.latex).toContain('\\begin{matrix}');
      expect(result.latex).toContain('a & b');
      expect(result.latex).toContain('c & d');
      expect(result.latex).toContain('\\end{matrix}');
    });
  });

  describe('希腊字母解析', () => {
    it('应该解析希腊字母 α+β=γ', () => {
      const result = parser.parse('α+β=γ');
      expect(result.success).toBe(true);
      expect(result.latex).toBe('\\alpha+\\beta=\\gamma');
    });

    it('应该解析多个希腊字母', () => {
      const result = parser.parse('θ π ω');
      expect(result.success).toBe(true);
      expect(result.latex).toContain('\\theta');
      expect(result.latex).toContain('\\pi');
      expect(result.latex).toContain('\\omega');
    });
  });

  describe('运算符解析', () => {
    it('应该解析不等号 x≤y', () => {
      const result = parser.parse('x≤y');
      expect(result.success).toBe(true);
      expect(result.latex).toContain('\\leq');
    });

    it('应该解析大于等于 x≥y', () => {
      const result = parser.parse('x≥y');
      expect(result.success).toBe(true);
      expect(result.latex).toContain('\\geq');
    });
  });

  describe('多行解析', () => {
    it('应该解析多行对齐 ■(x=1@y=2)', () => {
      const result = parser.parse('■(x=1@y=2)');
      expect(result.success).toBe(true);
      expect(result.latex).toContain('\\begin{aligned}');
      expect(result.latex).toContain('x &= 1');
      expect(result.latex).toContain('y &= 2');
      expect(result.latex).toContain('\\end{aligned}');
    });
  });

  describe('函数名解析', () => {
    it('应该解析三角函数 sin(x)', () => {
      const result = parser.parse('sin(x)');
      expect(result.success).toBe(true);
      expect(result.latex).toBe('\\sin(x)');
    });

    it('应该解析对数函数 log(y)', () => {
      const result = parser.parse('log(y)');
      expect(result.success).toBe(true);
      expect(result.latex).toBe('\\log(y)');
    });

    it('应该解析多个函数', () => {
      const result = parser.parse('sin(x) + cos(y)');
      expect(result.success).toBe(true);
      expect(result.latex).toContain('\\sin(x)');
      expect(result.latex).toContain('\\cos(y)');
    });
  });

  describe('组合表达式解析', () => {
    it('应该解析复杂组合表达式', () => {
      const result = parser.parse('f(x)=(∑_(i=1)^n x_i^2)/√n');
      expect(result.success).toBe(true);
      expect(result.latex).toContain('\\sum_{i=1}^{n}');
      expect(result.latex).toContain('\\sqrt{n}');
      expect(result.latex).toContain('\\frac');
    });

    it('应该解析积分与多项式', () => {
      const result = parser.parse('∫_0^1 (x^2+1) dx');
      expect(result.success).toBe(true);
      expect(result.latex).toContain('\\int_{0}^{1}');
      expect(result.latex).toContain('x^{2}');
    });

    it('应该解析极限表达式', () => {
      const result = parser.parse('lim_(x→∞) (1+1/x)^x');
      expect(result.success).toBe(true);
      expect(result.latex).toContain('\\lim_{x');
      expect(result.latex).toContain('\\to');
      expect(result.latex).toContain('\\infty');
    });
  });

  describe('歧义检测', () => {
    it('应该检测多级上标歧义 x^(y^z)', () => {
      const result = parser.parse('x^(y^z)');
      expect(result.success).toBe(true);
      expect(result.ambiguous).toBe(true);
      expect(result.ambiguityType).toBe('多级上标歧义');
      expect(result.alternatives).toBeDefined();
      expect(result.alternatives?.length).toBeGreaterThan(0);
    });

    it('应该检测连续上标歧义 x^2^3', () => {
      const result = parser.parse('x^2^3');
      expect(result.success).toBe(true);
      expect(result.ambiguous).toBe(true);
      expect(result.ambiguityType).toBe('连续上标歧义');
      expect(result.alternatives).toBeDefined();
    });

    it('不应该为简单表达式标记歧义', () => {
      const result = parser.parse('x^2');
      expect(result.success).toBe(true);
      expect(result.ambiguous).toBe(false);
    });

    it('不应该为明确的括号表达式标记歧义', () => {
      const result = parser.parse('(a+b)/c');
      expect(result.success).toBe(true);
      expect(result.ambiguous).toBe(false);
    });
  });
});
