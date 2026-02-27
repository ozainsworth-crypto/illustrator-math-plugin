/* eslint-disable @typescript-eslint/no-unsafe-assignment */
/* eslint-disable @typescript-eslint/no-unsafe-member-access */
/* eslint-disable @typescript-eslint/no-unsafe-call */

import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { ErrorHandler, ErrorType } from '../../src/lib/error-handler';

describe('ErrorHandler', () => {
  describe('classifyError', () => {
    it('should classify syntax errors correctly', () => {
      const error = new Error('LaTeX syntax error at position 5');
      const type = ErrorHandler.classifyError(error);
      expect(type).toBe(ErrorType.SYNTAX_ERROR);
    });

    it('should classify parse errors as syntax errors', () => {
      const error = new Error('Failed to parse LaTeX expression');
      const type = ErrorHandler.classifyError(error);
      expect(type).toBe(ErrorType.SYNTAX_ERROR);
    });

    it('should classify render errors correctly', () => {
      const error = new Error('Failed to render SVG output');
      const type = ErrorHandler.classifyError(error);
      expect(type).toBe(ErrorType.RENDER_ERROR);
    });

    it('should classify SVG-related errors as render errors', () => {
      const error = new Error('SVG generation failed');
      const type = ErrorHandler.classifyError(error);
      expect(type).toBe(ErrorType.RENDER_ERROR);
    });

    it('should classify initialization errors correctly', () => {
      const error = new Error('MathJax 初始化失败');
      const type = ErrorHandler.classifyError(error);
      expect(type).toBe(ErrorType.INITIALIZATION_ERROR);
    });

    it('should classify MathJax-related errors as initialization errors', () => {
      const error = new Error('MathJax library not loaded');
      const type = ErrorHandler.classifyError(error);
      expect(type).toBe(ErrorType.INITIALIZATION_ERROR);
    });

    it('should classify unknown errors correctly', () => {
      const error = new Error('Something went wrong');
      const type = ErrorHandler.classifyError(error);
      expect(type).toBe(ErrorType.UNKNOWN_ERROR);
    });

    it('should handle string errors', () => {
      const type = ErrorHandler.classifyError('syntax error occurred');
      expect(type).toBe(ErrorType.SYNTAX_ERROR);
    });

    it('should handle empty error messages', () => {
      const error = new Error('');
      const type = ErrorHandler.classifyError(error);
      expect(type).toBe(ErrorType.UNKNOWN_ERROR);
    });
  });

  describe('formatError', () => {
    it('should format syntax errors with correct message', () => {
      const error = new Error('LaTeX syntax error at position 5');
      const formatted = ErrorHandler.formatError(error);

      expect(formatted.type).toBe(ErrorType.SYNTAX_ERROR);
      expect(formatted.message).toBe('LaTeX 语法错误');
      expect(formatted.details).toBe('LaTeX syntax error at position 5');
    });

    it('should format render errors with correct message', () => {
      const error = new Error('Failed to render SVG');
      const formatted = ErrorHandler.formatError(error);

      expect(formatted.type).toBe(ErrorType.RENDER_ERROR);
      expect(formatted.message).toBe('公式渲染失败');
      expect(formatted.details).toBe('Failed to render SVG');
    });

    it('should format initialization errors with correct message', () => {
      const error = new Error('MathJax 初始化失败');
      const formatted = ErrorHandler.formatError(error);

      expect(formatted.type).toBe(ErrorType.INITIALIZATION_ERROR);
      expect(formatted.message).toBe('MathJax 初始化失败');
      expect(formatted.details).toBe('MathJax 初始化失败');
    });

    it('should format unknown errors with correct message', () => {
      const error = new Error('Something unexpected happened');
      const formatted = ErrorHandler.formatError(error);

      expect(formatted.type).toBe(ErrorType.UNKNOWN_ERROR);
      expect(formatted.message).toBe('发生未知错误');
      expect(formatted.details).toBe('Something unexpected happened');
    });

    it('should handle string errors', () => {
      const formatted = ErrorHandler.formatError('parse error');

      expect(formatted.type).toBe(ErrorType.SYNTAX_ERROR);
      expect(formatted.message).toBe('LaTeX 语法错误');
      expect(formatted.details).toBe('parse error');
    });

    it('should return formatted error with all required fields', () => {
      const error = new Error('Test error');
      const formatted = ErrorHandler.formatError(error);

      expect(formatted).toHaveProperty('type');
      expect(formatted).toHaveProperty('message');
      expect(formatted).toHaveProperty('details');
    });
  });

  describe('logError', () => {
    let consoleErrorSpy: ReturnType<typeof vi.spyOn>;

    beforeEach(() => {
      consoleErrorSpy = vi.spyOn(console, 'error').mockImplementation(() => undefined);
    });

    afterEach(() => {
      if (consoleErrorSpy && typeof consoleErrorSpy.mockRestore === 'function') {
        consoleErrorSpy.mockRestore();
      }
    });

    it('should log error to console', () => {
      const error = new Error('Test error');
      ErrorHandler.logError(error);

      expect(consoleErrorSpy).toHaveBeenCalled();
    });

    it('should log error with timestamp', () => {
      const error = new Error('Test error');
      ErrorHandler.logError(error);

      const logCall = consoleErrorSpy.mock.calls[0];
      if (!logCall) throw new Error('No log call found');
      const logMessage = logCall[0] as string;

      expect(logMessage).toMatch(/\[\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}\.\d{3}Z\]/);
    });

    it('should log error with type', () => {
      const error = new Error('syntax error');
      ErrorHandler.logError(error);

      const logCall = consoleErrorSpy.mock.calls[0];
      if (!logCall) throw new Error('No log call found');
      const logMessage = logCall[0] as string;

      expect(logMessage).toContain(ErrorType.SYNTAX_ERROR);
    });

    it('should log error with message and details', () => {
      const error = new Error('Test error message');
      ErrorHandler.logError(error);

      const logCall = consoleErrorSpy.mock.calls[0];
      if (!logCall) throw new Error('No log call found');
      const logData = logCall[1] as { message: string; details: string };

      expect(logData.message).toBeDefined();
      expect(logData.details).toBe('Test error message');
    });

    it('should log error with context when provided', () => {
      const error = new Error('Test error');
      const context = 'Formula rendering';
      ErrorHandler.logError(error, context);

      const logCall = consoleErrorSpy.mock.calls[0];
      if (!logCall) throw new Error('No log call found');
      const logData = logCall[1] as { context?: string };

      expect(logData.context).toBe(context);
    });

    it('should log error without context when not provided', () => {
      const error = new Error('Test error');
      ErrorHandler.logError(error);

      const logCall = consoleErrorSpy.mock.calls[0];
      if (!logCall) throw new Error('No log call found');
      const logData = logCall[1] as { context?: string };

      expect(logData.context).toBeUndefined();
    });

    it('should handle string errors in logging', () => {
      ErrorHandler.logError('String error message');

      expect(consoleErrorSpy).toHaveBeenCalled();
      const logCall = consoleErrorSpy.mock.calls[0];
      if (!logCall) throw new Error('No log call found');
      const logData = logCall[1] as { details: string };

      expect(logData.details).toBe('String error message');
    });
  });

  describe('getUserMessage', () => {
    it('should generate user-friendly message for syntax errors', () => {
      const error = new Error('LaTeX syntax error');
      const message = ErrorHandler.getUserMessage(error);

      expect(message).toContain('LaTeX 语法错误');
      expect(message).toContain('LaTeX syntax error');
    });

    it('should generate user-friendly message for render errors', () => {
      const error = new Error('Failed to render SVG');
      const message = ErrorHandler.getUserMessage(error);

      expect(message).toContain('公式渲染失败');
      expect(message).toContain('Failed to render SVG');
    });

    it('should generate user-friendly message for initialization errors', () => {
      const error = new Error('MathJax initialization failed');
      const message = ErrorHandler.getUserMessage(error);

      expect(message).toContain('MathJax 初始化失败');
      expect(message).toContain('MathJax initialization failed');
    });

    it('should generate user-friendly message for unknown errors', () => {
      const error = new Error('Unexpected error');
      const message = ErrorHandler.getUserMessage(error);

      expect(message).toContain('发生未知错误');
      expect(message).toContain('Unexpected error');
    });

    it('should handle string errors', () => {
      const message = ErrorHandler.getUserMessage('parse error');

      expect(message).toContain('LaTeX 语法错误');
      expect(message).toContain('parse error');
    });

    it('should format message with colon separator', () => {
      const error = new Error('Test error');
      const message = ErrorHandler.getUserMessage(error);

      expect(message).toMatch(/：/);
    });
  });

  describe('Error type constants', () => {
    it('should have all required error types', () => {
      expect(ErrorType.SYNTAX_ERROR).toBe('syntax_error');
      expect(ErrorType.RENDER_ERROR).toBe('render_error');
      expect(ErrorType.INITIALIZATION_ERROR).toBe('initialization_error');
      expect(ErrorType.UNKNOWN_ERROR).toBe('unknown_error');
    });
  });
});
