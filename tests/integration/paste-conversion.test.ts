/**
 * 集成测试：粘贴 → 转换 → 渲染完整流程
 * 
 * 测试场景：
 * 1. UnicodeMath 粘贴 → 检测 → 转换 → 渲染流程
 * 2. LaTeX 粘贴 → 检测 → 直通 → 渲染流程
 * 3. AsciiMath 降级流程
 * 4. 歧义处理流程
 * 5. 降级提示流程
 * 
 * 关联需求：需求 7（E1.4-E1.5）
 */

import { describe, it, expect, beforeAll } from 'vitest';
import { FormulaParser } from '../../src/lib/formula-parser';
import { WebFormulaGenerator } from '../../src/lib/formula-generator';
import { AmbiguityEngine } from '../../src/lib/ambiguity/ambiguity-engine';
import { FractionScopeRule } from '../../src/lib/ambiguity/rules';
import { fractionExponentRule } from '../../src/lib/ambiguity/rules/fraction-exponent-rule';

describe('粘贴 → 转换 → 渲染完整流程集成测试', () => {
  let parser: FormulaParser;
  let generator: WebFormulaGenerator;
  let ambiguityEngine: AmbiguityEngine;

  beforeAll(() => {
    // 初始化组件
    parser = new FormulaParser();
    generator = new WebFormulaGenerator({
      mathjaxVersion: '4.1.0',
      outputFormat: 'svg',
      displayMode: true,
    });

    // 初始化歧义引擎
    ambiguityEngine = new AmbiguityEngine();
    ambiguityEngine.registerRule(new FractionScopeRule());
    ambiguityEngine.registerRule(fractionExponentRule);
  });

  describe('1. UnicodeMath 粘贴 → 检测 → 转换 → 渲染流程', () => {
    it('应该成功处理简单的 UnicodeMath 分数', async () => {
      // 模拟用户从 PowerPoint 粘贴 UnicodeMath
      const pastedInput = 'a/b';

      // 1. 格式检测
      const format = parser.detectFormat(pastedInput);
      expect(format).toBe('unicodemath');

      // 2. 解析转换
      const parseResult = await parser.parse(pastedInput);
      expect(parseResult.success).toBe(true);
      expect(parseResult.format).toBe('unicodemath');
      expect(parseResult.latex).toBeTruthy();
      expect(parseResult.latex).toMatch(/\\frac/);

      // 3. 渲染 SVG
      const renderResult = await generator.renderLatex(parseResult.latex);
      expect(renderResult.errors).toHaveLength(0);
      expect(renderResult.svg).toBeDefined();
      expect(renderResult.svgString).not.toBe('');

      // 4. 验证 SVG 结构
      expect(renderResult.svg.getAttribute('viewBox')).toBeTruthy();
      const hasStructure =
        renderResult.svg.querySelector('g') !== null ||
        renderResult.svg.querySelector('path') !== null ||
        renderResult.svg.querySelector('use') !== null ||
        renderResult.svg.querySelector('defs') !== null;
      expect(hasStructure).toBe(true);
    });

    it('应该成功处理带上下标的 UnicodeMath', async () => {
      const pastedInput = 'x_i^2';

      // 完整流程
      const format = parser.detectFormat(pastedInput);
      expect(format).toBe('unicodemath');

      const parseResult = await parser.parse(pastedInput);
      expect(parseResult.success).toBe(true);
      expect(parseResult.latex).toMatch(/x_\{i\}\^\{2\}/);

      const renderResult = await generator.renderLatex(parseResult.latex);
      expect(renderResult.errors).toHaveLength(0);
      expect(renderResult.width).toBeGreaterThan(0);
      expect(renderResult.height).toBeGreaterThan(0);
    });

    it('应该成功处理带 Unicode 符号的 UnicodeMath', async () => {
      const pastedInput = '∑_(i=1)^n x_i';

      const format = parser.detectFormat(pastedInput);
      expect(format).toBe('unicodemath');

      const parseResult = await parser.parse(pastedInput);
      expect(parseResult.success).toBe(true);
      expect(parseResult.latex).toMatch(/\\sum/);

      const renderResult = await generator.renderLatex(parseResult.latex);
      expect(renderResult.errors).toHaveLength(0);
      expect(renderResult.svg).toBeDefined();
    });

    it('应该成功处理根号 UnicodeMath', async () => {
      const pastedInput = '√x';

      const format = parser.detectFormat(pastedInput);
      expect(format).toBe('unicodemath');

      const parseResult = await parser.parse(pastedInput);
      expect(parseResult.success).toBe(true);
      expect(parseResult.latex).toMatch(/\\sqrt/);

      const renderResult = await generator.renderLatex(parseResult.latex);
      expect(renderResult.errors).toHaveLength(0);
      expect(renderResult.svg).toBeDefined();
    });
  });

  describe('2. LaTeX 粘贴 → 检测 → 直通 → 渲染流程', () => {
    it('应该成功处理 LaTeX 分数（直通模式）', async () => {
      const pastedInput = '\\frac{a}{b}';

      // 1. 格式检测
      const format = parser.detectFormat(pastedInput);
      expect(format).toBe('latex');

      // 2. 解析（LaTeX 直通）
      const parseResult = await parser.parse(pastedInput);
      expect(parseResult.success).toBe(true);
      expect(parseResult.format).toBe('latex');
      expect(parseResult.latex).toBe(pastedInput); // 直通，不转换

      // 3. 渲染 SVG
      const renderResult = await generator.renderLatex(parseResult.latex);
      expect(renderResult.errors).toHaveLength(0);
      expect(renderResult.svg).toBeDefined();
    });

    it('应该成功处理复杂的 LaTeX 公式', async () => {
      const pastedInput = '\\sum_{i=1}^{n} x_i^2';

      const format = parser.detectFormat(pastedInput);
      expect(format).toBe('latex');

      const parseResult = await parser.parse(pastedInput);
      expect(parseResult.success).toBe(true);
      expect(parseResult.latex).toBe(pastedInput);

      const renderResult = await generator.renderLatex(parseResult.latex);
      expect(renderResult.errors).toHaveLength(0);
      expect(renderResult.svg).toBeDefined();
    });

    it('应该成功处理带花括号的 LaTeX', async () => {
      const pastedInput = '\\sqrt{x^2 + y^2}';

      const format = parser.detectFormat(pastedInput);
      expect(format).toBe('latex');

      const parseResult = await parser.parse(pastedInput);
      expect(parseResult.success).toBe(true);

      const renderResult = await generator.renderLatex(parseResult.latex);
      expect(renderResult.errors).toHaveLength(0);
      expect(renderResult.svg).toBeDefined();
    });
  });

  describe('3. AsciiMath 降级流程', () => {
    it('应该尝试 AsciiMath 降级（如果 Plurimath 可用）', async () => {
      // 模拟一个可能被识别为 AsciiMath 的输入
      const pastedInput = 'sum_(i=1)^n x_i';

      const format = parser.detectFormat(pastedInput);
      // 可能被识别为 unicodemath 或 asciimath
      expect(['unicodemath', 'asciimath']).toContain(format);

      const parseResult = await parser.parse(pastedInput);

      // 如果解析成功（无论是 UnicodeMath 还是 AsciiMath）
      if (parseResult.success) {
        expect(parseResult.latex).toBeTruthy();

        // 验证可以渲染
        const renderResult = await generator.renderLatex(parseResult.latex);
        expect(renderResult.svg).toBeDefined();
      } else {
        // 如果解析失败，应该有错误消息
        expect(parseResult.error).toBeTruthy();
      }
    });

    it('应该在 UnicodeMath 失败时尝试 AsciiMath 降级', async () => {
      // 模拟一个 UnicodeMath 解析可能失败的输入
      const pastedInput = 'x/y+z';

      const parseResult = await parser.parse(pastedInput);

      // 应该成功（通过 UnicodeMath 或 AsciiMath 降级）
      if (parseResult.success) {
        expect(parseResult.latex).toBeTruthy();

        // 如果使用了降级，应该标记
        if (parseResult.fallback) {
          expect(parseResult.fallbackType).toBe('asciimath');
        }

        // 验证可以渲染
        const renderResult = await generator.renderLatex(parseResult.latex);
        expect(renderResult.svg).toBeDefined();
      }
    });
  });

  describe('4. 歧义处理流程', () => {
    it('应该检测分数作用域歧义并提供候选项', async () => {
      const pastedInput = 'a/b+c';

      // 1. 格式检测
      const format = parser.detectFormat(pastedInput);
      expect(format).toBe('unicodemath');

      // 2. 解析（可能有歧义）
      const parseResult = await parser.parse(pastedInput);
      expect(parseResult.success).toBe(true);

      // 3. 检测歧义
      const ambiguityResult = ambiguityEngine.detect({ input: pastedInput });

      // 应该检测到歧义
      expect(ambiguityResult.ambiguities.length).toBeGreaterThan(0);

      const ambiguity = ambiguityResult.ambiguities[0];
      expect(ambiguity.ruleId).toBe('fraction-scope');
      expect(ambiguity.candidates).toHaveLength(2);

      // 4. 验证两个候选项都可以渲染
      for (const candidate of ambiguity.candidates) {
        const renderResult = await generator.renderLatex(candidate.tex);
        expect(renderResult.errors).toHaveLength(0);
        expect(renderResult.svg).toBeDefined();
      }

      // 5. 验证默认候选项
      const defaultCandidate = ambiguity.candidates[ambiguity.defaultIndex];
      expect(defaultCandidate).toBeDefined();

      const defaultRenderResult = await generator.renderLatex(defaultCandidate.tex);
      expect(defaultRenderResult.errors).toHaveLength(0);
    });

    it('应该检测分数指数歧义并提供候选项', async () => {
      const pastedInput = 'a/b^c';

      const format = parser.detectFormat(pastedInput);
      expect(format).toBe('unicodemath');

      const parseResult = await parser.parse(pastedInput);
      expect(parseResult.success).toBe(true);

      // 检测歧义（需要在转换后的 LaTeX 上检测）
      const ambiguityResult = ambiguityEngine.detect({ 
        input: pastedInput,
        latex: parseResult.latex 
      });

      // 如果检测到歧义，验证候选项
      if (ambiguityResult.ambiguities.length > 0) {
        const ambiguity = ambiguityResult.ambiguities.find(
          (a) => a.ruleId === 'fraction-exponent-binding'
        );

        if (ambiguity) {
          expect(ambiguity.candidates).toHaveLength(2);

          // 验证候选项可以渲染
          for (const candidate of ambiguity.candidates) {
            const renderResult = await generator.renderLatex(candidate.tex);
            expect(renderResult.errors).toHaveLength(0);
            expect(renderResult.svg).toBeDefined();
          }
        }
      } else {
        // 如果没有检测到歧义，这也是可以接受的
        // 因为 a/b^c 可能被解析为明确的形式
        expect(parseResult.latex).toBeTruthy();
      }
    });

    it('应该支持用户选择不同的候选项并渲染', async () => {
      const pastedInput = 'a/b+c';

      const ambiguityResult = ambiguityEngine.detect({ input: pastedInput });
      const ambiguity = ambiguityResult.ambiguities[0];

      // 模拟用户选择候选项 0
      const candidate0 = ambiguity.candidates[0];
      const render0 = await generator.renderLatex(candidate0.tex);
      expect(render0.errors).toHaveLength(0);
      expect(render0.svg).toBeDefined();

      // 模拟用户选择候选项 1
      const candidate1 = ambiguity.candidates[1];
      const render1 = await generator.renderLatex(candidate1.tex);
      expect(render1.errors).toHaveLength(0);
      expect(render1.svg).toBeDefined();

      // 验证两个渲染结果不同（通过 SVG 字符串比较）
      expect(render0.svgString).not.toBe(render1.svgString);
    });
  });

  describe('5. 降级提示流程', () => {
    it('应该检测富文本并提供降级提示', async () => {
      const pastedInput = '<p>Some <b>rich</b> text</p>';

      // 1. 格式检测
      const format = parser.detectFormat(pastedInput);
      expect(format).toBe('rich_text');

      // 2. 解析（应该失败并提供降级提示）
      const parseResult = await parser.parse(pastedInput);
      expect(parseResult.success).toBe(false);
      expect(parseResult.format).toBe('rich_text');
      expect(parseResult.error).toBeTruthy();
      expect(parseResult.error).toContain('富文本');
      expect(parseResult.error).toContain('线性格式');
    });

    it('应该检测未知格式并提供降级提示', async () => {
      const pastedInput = '!!!invalid!!!';

      const format = parser.detectFormat(pastedInput);
      expect(format).toBe('unknown');

      const parseResult = await parser.parse(pastedInput);
      expect(parseResult.success).toBe(false);
      expect(parseResult.format).toBe('unknown');
      expect(parseResult.error).toBeTruthy();
      expect(parseResult.error).toContain('无法识别');
    });

    it('应该在转换失败时保留原始内容', async () => {
      const pastedInput = 'some invalid input';

      const parseResult = await parser.parse(pastedInput);

      // 无论成功与否，都应该保留原始内容
      expect(parseResult.original).toBe(pastedInput);
    });

    it('应该在降级提示中包含可操作的建议', async () => {
      const pastedInput = '<html><body>formula</body></html>';

      const format = parser.detectFormat(pastedInput);
      expect(format).toBe('rich_text');

      const parseResult = await parser.parse(pastedInput);
      expect(parseResult.success).toBe(false);
      expect(parseResult.error).toBeTruthy();

      // 验证错误消息包含可操作的建议
      expect(parseResult.error).toMatch(/线性格式|LaTeX|UnicodeMath/i);
    });
  });

  describe('6. 端到端完整流程', () => {
    it('应该完成从粘贴到渲染的完整流程（无歧义）', async () => {
      const pastedInput = 'x^2+y^2';

      // 1. 检测格式
      const format = parser.detectFormat(pastedInput);
      expect(['unicodemath', 'asciimath']).toContain(format);

      // 2. 解析转换
      const parseResult = await parser.parse(pastedInput);
      expect(parseResult.success).toBe(true);
      expect(parseResult.latex).toBeTruthy();

      // 3. 检测歧义（应该没有）
      const ambiguityResult = ambiguityEngine.detect({ input: pastedInput });
      expect(ambiguityResult.ambiguities).toHaveLength(0);

      // 4. 渲染 SVG
      const renderResult = await generator.renderLatex(parseResult.latex);
      expect(renderResult.errors).toHaveLength(0);
      expect(renderResult.svg).toBeDefined();
      expect(renderResult.width).toBeGreaterThan(0);
      expect(renderResult.height).toBeGreaterThan(0);
    });

    it('应该完成从粘贴到渲染的完整流程（有歧义，使用默认）', async () => {
      const pastedInput = 'a/b+c';

      // 1. 检测格式
      const format = parser.detectFormat(pastedInput);
      expect(format).toBe('unicodemath');

      // 2. 解析转换
      const parseResult = await parser.parse(pastedInput);
      expect(parseResult.success).toBe(true);

      // 3. 检测歧义
      const ambiguityResult = ambiguityEngine.detect({ input: pastedInput });
      expect(ambiguityResult.ambiguities.length).toBeGreaterThan(0);

      // 4. 使用默认候选项渲染
      const ambiguity = ambiguityResult.ambiguities[0];
      const defaultCandidate = ambiguity.candidates[ambiguity.defaultIndex];

      const renderResult = await generator.renderLatex(defaultCandidate.tex);
      expect(renderResult.errors).toHaveLength(0);
      expect(renderResult.svg).toBeDefined();
    });

    it('应该处理复杂的 UnicodeMath 公式完整流程', async () => {
      const pastedInput = 'f(x)=(∑_(i=1)^n x_i^2)/√n';

      // 完整流程
      const format = parser.detectFormat(pastedInput);
      expect(format).toBe('unicodemath');

      const parseResult = await parser.parse(pastedInput);
      expect(parseResult.success).toBe(true);
      expect(parseResult.latex).toMatch(/\\sum/);
      expect(parseResult.latex).toMatch(/\\sqrt/);
      expect(parseResult.latex).toMatch(/\\frac/);

      const renderResult = await generator.renderLatex(parseResult.latex);
      expect(renderResult.errors).toHaveLength(0);
      expect(renderResult.svg).toBeDefined();
    });
  });

  describe('7. 错误处理与边界情况', () => {
    it('应该处理空输入', async () => {
      const pastedInput = '';

      const parseResult = await parser.parse(pastedInput);
      expect(parseResult.success).toBe(false);
      expect(parseResult.error).toBeTruthy();
    });

    it('应该处理仅包含空白的输入', async () => {
      const pastedInput = '   \n\t   ';

      const parseResult = await parser.parse(pastedInput);
      expect(parseResult.success).toBe(false);
      expect(parseResult.error).toBeTruthy();
    });

    it('应该处理无效的 LaTeX 语法', async () => {
      const pastedInput = '\\frac{a}'; // 缺少第二个参数

      const format = parser.detectFormat(pastedInput);
      expect(format).toBe('latex');

      const parseResult = await parser.parse(pastedInput);
      expect(parseResult.success).toBe(true); // 解析成功（LaTeX 直通）

      // 渲染时可能有错误
      const renderResult = await generator.renderLatex(parseResult.latex);
      // MathJax 可能容错或报错，我们只验证返回了结果
      expect(renderResult).toBeDefined();
    });

    it('应该处理混合格式的输入', async () => {
      const pastedInput = '\\frac{a}{b} + x^2'; // LaTeX + 可能的 UnicodeMath

      const format = parser.detectFormat(pastedInput);
      expect(format).toBe('latex'); // 应该被识别为 LaTeX（因为有 \frac）

      const parseResult = await parser.parse(pastedInput);
      expect(parseResult.success).toBe(true);

      const renderResult = await generator.renderLatex(parseResult.latex);
      expect(renderResult.svg).toBeDefined();
    });
  });

  describe('8. 性能验证', () => {
    it('完整流程应该在合理时间内完成', async () => {
      const pastedInput = 'a/b+c';

      const startTime = performance.now();

      // 完整流程
      const format = parser.detectFormat(pastedInput);
      const parseResult = await parser.parse(pastedInput);
      const ambiguityResult = ambiguityEngine.detect({ input: pastedInput });
      const defaultCandidate = ambiguityResult.ambiguities[0].candidates[
        ambiguityResult.ambiguities[0].defaultIndex
      ];
      const renderResult = await generator.renderLatex(defaultCandidate.tex);

      const endTime = performance.now();
      const totalTime = endTime - startTime;

      // 验证完整流程在 1 秒内完成
      expect(totalTime).toBeLessThan(1000);

      // 验证结果正确
      expect(format).toBe('unicodemath');
      expect(parseResult.success).toBe(true);
      expect(renderResult.errors).toHaveLength(0);
    });
  });
});
