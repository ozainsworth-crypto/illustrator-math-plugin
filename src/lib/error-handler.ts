/**
 * 错误处理器
 * 负责错误分类、消息生成和日志记录
 */

import { ErrorMessageTemplates, formatErrorMessage, type ErrorMessage } from './error-messages';

/**
 * 错误类型
 */
export const ErrorType = {
  SYNTAX_ERROR: 'syntax_error', // LaTeX 语法错误
  RENDER_ERROR: 'render_error', // 渲染错误
  INITIALIZATION_ERROR: 'initialization_error', // 初始化错误
  CONVERSION_ERROR: 'conversion_error', // 格式转换错误
  DOCUMENT_ERROR: 'document_error', // 文档相关错误
  FONT_ERROR: 'font_error', // 字体相关错误
  NETWORK_ERROR: 'network_error', // 网络错误
  UNKNOWN_ERROR: 'unknown_error', // 未知错误
} as const;

export type ErrorType = (typeof ErrorType)[keyof typeof ErrorType];

/**
 * 格式化的错误信息
 */
export interface FormattedError {
  type: ErrorType;
  message: string;
  details?: string;
  position?: {
    line: number;
    column: number;
  };
  errorMessage?: ErrorMessage;
}

/**
 * 错误处理器类
 */
export class ErrorHandler {
  /**
   * 分类错误
   */
  static classifyError(error: Error | string): ErrorType {
    const errorMessage = typeof error === 'string' ? error : error.message;

    if (errorMessage.includes('syntax') || errorMessage.includes('parse') || errorMessage.includes('语法')) {
      return ErrorType.SYNTAX_ERROR;
    }

    if (errorMessage.includes('render') || errorMessage.includes('SVG') || errorMessage.includes('渲染')) {
      return ErrorType.RENDER_ERROR;
    }

    if (errorMessage.includes('初始化') || errorMessage.includes('MathJax') || errorMessage.includes('加载')) {
      return ErrorType.INITIALIZATION_ERROR;
    }

    if (errorMessage.includes('转换') || errorMessage.includes('conversion') || errorMessage.includes('UnicodeMath')) {
      return ErrorType.CONVERSION_ERROR;
    }

    if (errorMessage.includes('文档') || errorMessage.includes('document') || errorMessage.includes('插入')) {
      return ErrorType.DOCUMENT_ERROR;
    }

    if (errorMessage.includes('字体') || errorMessage.includes('font')) {
      return ErrorType.FONT_ERROR;
    }

    if (errorMessage.includes('网络') || errorMessage.includes('network') || errorMessage.includes('连接')) {
      return ErrorType.NETWORK_ERROR;
    }

    return ErrorType.UNKNOWN_ERROR;
  }

  /**
   * 生成友好的错误消息
   */
  static formatError(error: Error | string, context?: { position?: number; input?: string; fontName?: string }): FormattedError {
    const errorMessage = typeof error === 'string' ? error : error.message;
    const type = this.classifyError(error);

    let message = '';
    let errorMsg: ErrorMessage | undefined;
    const details = errorMessage;

    switch (type) {
      case ErrorType.SYNTAX_ERROR:
        message = 'LaTeX 语法错误';
        errorMsg = ErrorMessageTemplates.latexSyntaxError(errorMessage, context?.position);
        break;
      case ErrorType.RENDER_ERROR:
        message = '公式渲染失败';
        if (errorMessage.includes('timeout') || errorMessage.includes('超时')) {
          errorMsg = ErrorMessageTemplates.renderTimeout();
        } else {
          errorMsg = ErrorMessageTemplates.genericError(errorMessage);
        }
        break;
      case ErrorType.INITIALIZATION_ERROR:
        message = 'MathJax 初始化失败';
        errorMsg = ErrorMessageTemplates.mathjaxLoadFailed();
        break;
      case ErrorType.CONVERSION_ERROR:
        message = '格式转换失败';
        errorMsg = ErrorMessageTemplates.unicodemathConversionFailed(context?.input || '');
        break;
      case ErrorType.DOCUMENT_ERROR:
        message = '文档操作失败';
        if (errorMessage.includes('未打开') || errorMessage.includes('no document')) {
          errorMsg = ErrorMessageTemplates.noDocumentOpen();
        } else {
          errorMsg = ErrorMessageTemplates.insertFailed(errorMessage);
        }
        break;
      case ErrorType.FONT_ERROR:
        message = '字体加载失败';
        errorMsg = ErrorMessageTemplates.fontPackLoadFailed(context?.fontName || '未知字体', errorMessage);
        break;
      case ErrorType.NETWORK_ERROR:
        message = '网络错误';
        errorMsg = ErrorMessageTemplates.mathjaxLoadFailed();
        break;
      default:
        message = '发生未知错误';
        errorMsg = ErrorMessageTemplates.genericError(errorMessage);
    }

    return {
      type,
      message,
      details,
      errorMessage: errorMsg,
    };
  }

  /**
   * 记录错误日志
   */
  static logError(error: Error | string, context?: string): void {
    const formatted = this.formatError(error);
    const timestamp = new Date().toISOString();

    console.error(`[${timestamp}] ${formatted.type}:`, {
      message: formatted.message,
      details: formatted.details,
      context,
    });
  }

  /**
   * 生成用户友好的错误提示（简短版本）
   */
  static getUserMessage(error: Error | string): string {
    const formatted = this.formatError(error);
    return `${formatted.message}${formatted.details ? `：${formatted.details}` : ''}`;
  }

  /**
   * 生成用户友好的错误提示（完整版本，包含建议）
   */
  static getUserMessageHTML(error: Error | string, context?: { position?: number; input?: string; fontName?: string }, showTechnical: boolean = false): string {
    const formatted = this.formatError(error, context);
    if (formatted.errorMessage) {
      return formatErrorMessage(formatted.errorMessage, showTechnical);
    }
    return `<div class="error-message-card"><div class="error-title"><span class="error-icon">⚠️</span><strong>${formatted.message}</strong></div><div class="error-description">${formatted.details || ''}</div></div>`;
  }
}

