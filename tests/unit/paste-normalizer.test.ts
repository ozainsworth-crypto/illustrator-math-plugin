import { describe, it, expect } from 'vitest';
import { PasteNormalizer } from '../../src/lib/paste-normalizer';
import dirtySamples from '../examples/dirty-input-samples.json';

describe('PasteNormalizer', () => {
  const normalizer = new PasteNormalizer();

  describe('normalize', () => {
    it('应该成功提取纯文本', () => {
      const mockDataTransfer = createMockDataTransfer('text/plain', 'x + y = z');
      const result = normalizer.normalize(mockDataTransfer);

      expect(result.success).toBe(true);
      expect(result.detectedType).toBe('plain-text');
      expect(result.text).toBe('x + y = z');
    });

    it('应该拒绝 HTML 内容', () => {
      const mockDataTransfer = createMockDataTransfer('text/html', '<p>x + y = z</p>');
      const result = normalizer.normalize(mockDataTransfer);

      expect(result.success).toBe(false);
      expect(result.detectedType).toBe('html');
      expect(result.error).toContain('非纯文本格式');
    });

    it('应该拒绝富文本内容', () => {
      const mockDataTransfer = createMockDataTransfer('text/rtf', '{\\rtf1 x + y = z}');
      const result = normalizer.normalize(mockDataTransfer);

      expect(result.success).toBe(false);
      expect(result.detectedType).toBe('rich-text');
      expect(result.error).toContain('非纯文本格式');
    });

    it('应该处理 null clipboardData', () => {
      const result = normalizer.normalize(null);

      expect(result.success).toBe(false);
      expect(result.detectedType).toBe('unknown');
      expect(result.error).toContain('无法访问剪贴板数据');
    });
  });

  describe('extractPlainText', () => {
    it('应该提取 text/plain 内容', () => {
      const mockDataTransfer = createMockDataTransfer('text/plain', 'Hello World');
      const text = normalizer.extractPlainText(mockDataTransfer);

      expect(text).toBe('Hello World');
    });

    it('应该在没有 text/plain 时返回 null', () => {
      const mockDataTransfer = createMockDataTransfer('text/html', '<p>Hello</p>');
      const text = normalizer.extractPlainText(mockDataTransfer);

      expect(text).toBeNull();
    });

    it('应该在 text/plain 为空时返回 null', () => {
      const mockDataTransfer = createMockDataTransfer('text/plain', '');
      const text = normalizer.extractPlainText(mockDataTransfer);

      expect(text).toBeNull();
    });
  });

  describe('脏输入样例测试', () => {
    // 测试样例 1: 包含零宽字符的输入
    it(`样例 ${dirtySamples.samples[0].id}: ${dirtySamples.samples[0].name}`, () => {
      const sample = dirtySamples.samples[0];
      const mockDataTransfer = createMockDataTransfer('text/plain', sample.input);
      const result = normalizer.normalize(mockDataTransfer);

      expect(result.success).toBe(true);
      expect(result.text).toBe(sample.expected);
    });

    // 测试样例 2: 包含 HTML 标签的输入（注意：这个测试的是纯文本中的 HTML 字符串，不是真正的 HTML）
    it(`样例 ${dirtySamples.samples[1].id}: ${dirtySamples.samples[1].name}`, () => {
      const sample = dirtySamples.samples[1];
      const mockDataTransfer = createMockDataTransfer('text/plain', sample.input);
      const result = normalizer.normalize(mockDataTransfer);

      expect(result.success).toBe(true);
      // HTML 标签作为纯文本保留，但空白被归一化
      expect(result.text).toBe(sample.input);
    });

    // 测试样例 4: 包含多种空白字符的输入
    it(`样例 ${dirtySamples.samples[3].id}: ${dirtySamples.samples[3].name}`, () => {
      const sample = dirtySamples.samples[3];
      const mockDataTransfer = createMockDataTransfer('text/plain', sample.input);
      const result = normalizer.normalize(mockDataTransfer);

      expect(result.success).toBe(true);
      expect(result.text).toBe(sample.expected);
    });

    // 测试样例 5: 包含不同换行符的输入
    it(`样例 ${dirtySamples.samples[4].id}: ${dirtySamples.samples[4].name}`, () => {
      const sample = dirtySamples.samples[4];
      const mockDataTransfer = createMockDataTransfer('text/plain', sample.input);
      const result = normalizer.normalize(mockDataTransfer);

      expect(result.success).toBe(true);
      expect(result.text).toBe(sample.expected);
    });

    // 测试样例 6: 包含 BOM 的输入
    it(`样例 ${dirtySamples.samples[5].id}: ${dirtySamples.samples[5].name}`, () => {
      const sample = dirtySamples.samples[5];
      const mockDataTransfer = createMockDataTransfer('text/plain', sample.input);
      const result = normalizer.normalize(mockDataTransfer);

      expect(result.success).toBe(true);
      expect(result.text).toBe(sample.expected);
    });

    // 测试样例 7: 包含控制字符的输入
    it(`样例 ${dirtySamples.samples[6].id}: ${dirtySamples.samples[6].name}`, () => {
      const sample = dirtySamples.samples[6];
      const mockDataTransfer = createMockDataTransfer('text/plain', sample.input);
      const result = normalizer.normalize(mockDataTransfer);

      expect(result.success).toBe(true);
      expect(result.text).toBe(sample.expected);
    });

    // 测试样例 8: 包含全角字符的输入
    it(`样例 ${dirtySamples.samples[7].id}: ${dirtySamples.samples[7].name}`, () => {
      const sample = dirtySamples.samples[7];
      const mockDataTransfer = createMockDataTransfer('text/plain', sample.input);
      const result = normalizer.normalize(mockDataTransfer);

      expect(result.success).toBe(true);
      expect(result.text).toBe(sample.expected);
    });

    // 测试样例 9: 包含 emoji 的输入
    it(`样例 ${dirtySamples.samples[8].id}: ${dirtySamples.samples[8].name}`, () => {
      const sample = dirtySamples.samples[8];
      const mockDataTransfer = createMockDataTransfer('text/plain', sample.input);
      const result = normalizer.normalize(mockDataTransfer);

      expect(result.success).toBe(true);
      expect(result.text).toBe(sample.expected);
    });

    // 测试样例 10: 混合多种脏数据的输入
    it(`样例 ${dirtySamples.samples[9].id}: ${dirtySamples.samples[9].name}`, () => {
      const sample = dirtySamples.samples[9];
      const mockDataTransfer = createMockDataTransfer('text/plain', sample.input);
      const result = normalizer.normalize(mockDataTransfer);

      expect(result.success).toBe(true);
      // 注意：HTML 标签作为纯文本保留（因为是 text/plain），但其他脏数据被清理
      // BOM、零宽字符、多种空白、控制字符都被清理，但 HTML 标签字符串保留
      expect(result.text).toBe('<p>x + y\n=z</p>');
    });
  });

  describe('边界情况', () => {
    it('应该处理空字符串', () => {
      const mockDataTransfer = createMockDataTransfer('text/plain', '');
      const result = normalizer.normalize(mockDataTransfer);

      expect(result.success).toBe(false);
    });

    it('应该处理只包含空白的字符串', () => {
      const mockDataTransfer = createMockDataTransfer('text/plain', '   \n\n   ');
      const result = normalizer.normalize(mockDataTransfer);

      expect(result.success).toBe(true);
      expect(result.text).toBe('');
    });

    it('应该压缩多个连续空格', () => {
      const mockDataTransfer = createMockDataTransfer('text/plain', 'x    +    y    =    z');
      const result = normalizer.normalize(mockDataTransfer);

      expect(result.success).toBe(true);
      expect(result.text).toBe('x + y = z');
    });

    it('应该移除多余的空行', () => {
      const mockDataTransfer = createMockDataTransfer('text/plain', 'x = 1\n\n\n\ny = 2');
      const result = normalizer.normalize(mockDataTransfer);

      expect(result.success).toBe(true);
      expect(result.text).toBe('x = 1\n\ny = 2');
    });

    it('应该移除行首行尾空白', () => {
      const mockDataTransfer = createMockDataTransfer('text/plain', '  x + y = z  \n  a + b = c  ');
      const result = normalizer.normalize(mockDataTransfer);

      expect(result.success).toBe(true);
      expect(result.text).toBe('x + y = z\na + b = c');
    });
  });
});

/**
 * 创建模拟的 DataTransfer 对象
 */
function createMockDataTransfer(type: string, data: string): DataTransfer {
  const types = [type];
  const dataMap = new Map<string, string>();
  dataMap.set(type, data);

  return {
    types,
    getData: (t: string) => dataMap.get(t) || '',
  } as unknown as DataTransfer;
}
