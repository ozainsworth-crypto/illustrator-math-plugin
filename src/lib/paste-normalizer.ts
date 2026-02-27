/**
 * PasteNormalizer - 输入归一化与清洗
 * 
 * 功能：
 * - 仅提取纯文本内容（text/plain）
 * - 过滤富文本、HTML、图片等非纯文本格式
 * - 清理不可见字符、空白字符、换行符
 * 
 * 关联需求：需求 2（B1.1-3）
 */

export interface NormalizeResult {
  /** 归一化后的纯文本 */
  text: string;
  /** 是否成功提取纯文本 */
  success: boolean;
  /** 检测到的输入类型 */
  detectedType: 'plain-text' | 'rich-text' | 'html' | 'unknown';
  /** 错误消息（如果失败） */
  error?: string;
}

export class PasteNormalizer {
  /**
   * 归一化粘贴内容
   * @param clipboardData - ClipboardEvent.clipboardData 或 DataTransfer 对象
   * @returns 归一化结果
   */
  normalize(clipboardData: DataTransfer | null): NormalizeResult {
    if (!clipboardData) {
      return {
        text: '',
        success: false,
        detectedType: 'unknown',
        error: '无法访问剪贴板数据',
      };
    }

    // 尝试提取纯文本
    const plainText = this.extractPlainText(clipboardData);

    if (plainText === null) {
      // 检测是否包含富文本或 HTML
      const hasHtml = clipboardData.types.includes('text/html');
      const hasRtf = clipboardData.types.includes('text/rtf');

      return {
        text: '',
        success: false,
        detectedType: hasHtml ? 'html' : hasRtf ? 'rich-text' : 'unknown',
        error: '检测到非纯文本格式，无法解析',
      };
    }

    // 清理和归一化文本
    const normalizedText = this.cleanText(plainText);

    return {
      text: normalizedText,
      success: true,
      detectedType: 'plain-text',
    };
  }

  /**
   * 提取纯文本内容
   * @param clipboardData - ClipboardEvent.clipboardData 或 DataTransfer 对象
   * @returns 纯文本内容，如果不存在则返回 null
   */
  extractPlainText(clipboardData: DataTransfer): string | null {
    // 仅提取 text/plain MIME 类型
    if (!clipboardData.types.includes('text/plain')) {
      return null;
    }

    const text = clipboardData.getData('text/plain');
    return text || null;
  }

  /**
   * 清理和归一化文本
   * @param text - 原始文本
   * @returns 清理后的文本
   */
  private cleanText(text: string): string {
    let cleaned = text;

    // 1. 移除 BOM (Byte Order Mark)
    cleaned = this.removeBOM(cleaned);

    // 2. 移除不可见字符
    cleaned = this.removeInvisibleCharacters(cleaned);

    // 3. 归一化空白字符
    cleaned = this.normalizeWhitespace(cleaned);

    // 4. 归一化换行符
    cleaned = this.normalizeLineBreaks(cleaned);

    return cleaned;
  }

  /**
   * 移除 BOM (Byte Order Mark)
   */
  private removeBOM(text: string): string {
    // 移除 UTF-8 BOM (U+FEFF)
    return text.replace(/^\uFEFF/, '');
  }

  /**
   * 移除不可见字符
   * - 零宽字符（Zero-Width Space, Zero-Width Joiner 等）
   * - 控制字符（除了换行、制表符）
   */
  private removeInvisibleCharacters(text: string): string {
    return (
      text
        // 移除零宽字符
        .replace(/[\u200B-\u200D\uFEFF]/g, '') // Zero-Width Space, ZWSP, ZWJ, ZWNJ
        // 移除其他不可见 Unicode 字符
        .replace(/[\u2060-\u206F]/g, '') // Word Joiner, invisible operators
        // 移除控制字符（保留换行 \n, \r 和制表符 \t）
        // eslint-disable-next-line no-control-regex
        .replace(/[\x00-\x08\x0B\x0C\x0E-\x1F\x7F]/g, '')
    );
  }

  /**
   * 归一化空白字符
   * - 将多种空白字符统一为标准空格（U+0020）
   * - 移除行首行尾空白
   * - 压缩连续空白为单个空格
   */
  private normalizeWhitespace(text: string): string {
    return (
      text
        // 将各种空白字符统一为标准空格
        .replace(/[\u00A0\u1680\u2000-\u200A\u202F\u205F\u3000]/g, ' ') // NBSP, 全角空格等
        // 将制表符替换为空格
        .replace(/\t/g, ' ')
        // 压缩连续空格为单个空格（但保留换行）
        .replace(/ +/g, ' ')
        // 移除行首行尾空白
        .split('\n')
        .map((line) => line.trim())
        .join('\n')
    );
  }

  /**
   * 归一化换行符
   * - 统一换行符为 \n
   * - 移除多余的空行（保留最多 1 个空行）
   */
  private normalizeLineBreaks(text: string): string {
    return (
      text
        // 统一换行符为 \n
        .replace(/\r\n/g, '\n') // Windows
        .replace(/\r/g, '\n') // Old Mac
        // 移除多余的空行（保留最多 1 个空行）
        .replace(/\n{3,}/g, '\n\n')
        // 移除开头和结尾的空行
        .replace(/^\n+/, '')
        .replace(/\n+$/, '')
    );
  }
}
