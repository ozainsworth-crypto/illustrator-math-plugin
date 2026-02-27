/**
 * ErrorHandler - 统一错误处理
 * 
 * 提供一致的错误响应格式和用户友好的错误消息
 */

// 错误代码定义
const ERROR_CODES = {
  // 文件相关错误
  FILE_NOT_FOUND: 'FILE_NOT_FOUND',
  INVALID_FILE_FORMAT: 'INVALID_FILE_FORMAT',
  FILE_TOO_LARGE: 'FILE_TOO_LARGE',
  FILE_EMPTY: 'FILE_EMPTY',
  
  // 上传相关错误
  UPLOAD_FAILED: 'UPLOAD_FAILED',
  NO_FILE_UPLOADED: 'NO_FILE_UPLOADED',
  
  // 转换相关错误
  CONVERSION_FAILED: 'CONVERSION_FAILED',
  FONT_PARSE_ERROR: 'FONT_PARSE_ERROR',
  MISSING_GLYPHS: 'MISSING_GLYPHS',
  
  // 服务器相关错误
  PORT_OCCUPIED: 'PORT_OCCUPIED',
  SERVER_START_FAILED: 'SERVER_START_FAILED',
  
  // 权限相关错误
  PERMISSION_DENIED: 'PERMISSION_DENIED',
  OUTPUT_DIR_ERROR: 'OUTPUT_DIR_ERROR',
  
  // 网络相关错误
  NETWORK_TIMEOUT: 'NETWORK_TIMEOUT',
  CONNECTION_LOST: 'CONNECTION_LOST',
  
  // 通用错误
  INTERNAL_ERROR: 'INTERNAL_ERROR',
  INVALID_REQUEST: 'INVALID_REQUEST'
};

// 错误消息映射
const ERROR_MESSAGES = {
  [ERROR_CODES.FILE_NOT_FOUND]: '文件未找到',
  [ERROR_CODES.INVALID_FILE_FORMAT]: '无效的文件格式，仅支持 .ttf 和 .otf 文件',
  [ERROR_CODES.FILE_TOO_LARGE]: '文件过大',
  [ERROR_CODES.FILE_EMPTY]: '文件为空',
  [ERROR_CODES.UPLOAD_FAILED]: '文件上传失败',
  [ERROR_CODES.NO_FILE_UPLOADED]: '未选择文件',
  [ERROR_CODES.CONVERSION_FAILED]: '字体转换失败',
  [ERROR_CODES.FONT_PARSE_ERROR]: '字体文件解析失败',
  [ERROR_CODES.MISSING_GLYPHS]: '字体缺少必要的字形',
  [ERROR_CODES.PORT_OCCUPIED]: '端口被占用',
  [ERROR_CODES.SERVER_START_FAILED]: '服务器启动失败',
  [ERROR_CODES.PERMISSION_DENIED]: '权限不足',
  [ERROR_CODES.OUTPUT_DIR_ERROR]: '输出目录错误',
  [ERROR_CODES.NETWORK_TIMEOUT]: '网络请求超时',
  [ERROR_CODES.CONNECTION_LOST]: '连接丢失',
  [ERROR_CODES.INTERNAL_ERROR]: '内部错误',
  [ERROR_CODES.INVALID_REQUEST]: '无效的请求'
};

// 错误建议映射
const ERROR_SUGGESTIONS = {
  [ERROR_CODES.FILE_NOT_FOUND]: [
    '请确认文件路径正确',
    '检查文件是否已被删除或移动'
  ],
  [ERROR_CODES.INVALID_FILE_FORMAT]: [
    '请选择有效的字体文件（.ttf 或 .otf）',
    '确认文件扩展名正确'
  ],
  [ERROR_CODES.FILE_TOO_LARGE]: [
    '尝试使用较小的字体文件',
    '大文件转换可能需要较长时间，请耐心等待'
  ],
  [ERROR_CODES.FONT_PARSE_ERROR]: [
    '字体文件可能已损坏，请尝试其他文件',
    '确认字体文件格式正确'
  ],
  [ERROR_CODES.PERMISSION_DENIED]: [
    '尝试以管理员权限运行',
    '检查文件和目录的访问权限'
  ],
  [ERROR_CODES.OUTPUT_DIR_ERROR]: [
    '检查输出目录是否存在',
    '确认有写入权限'
  ],
  [ERROR_CODES.NETWORK_TIMEOUT]: [
    '检查网络连接',
    '尝试重新发送请求'
  ],
  [ERROR_CODES.CONNECTION_LOST]: [
    '检查服务器是否正在运行',
    '尝试刷新页面'
  ]
};

class ErrorHandler {
  /**
   * 创建标准错误响应
   * @param {string} code - 错误代码
   * @param {string} details - 详细信息（可选）
   * @returns {Object} 错误响应对象
   */
  static createErrorResponse(code, details = null) {
    const message = ERROR_MESSAGES[code] || ERROR_MESSAGES[ERROR_CODES.INTERNAL_ERROR];
    const suggestions = ERROR_SUGGESTIONS[code] || [];
    
    return {
      success: false,
      error: {
        code,
        message,
        details,
        suggestions
      }
    };
  }

  /**
   * 处理错误并返回响应
   * @param {Error} error - 错误对象
   * @returns {Object} 错误响应对象
   */
  static handle(error) {
    // 根据错误消息推断错误类型
    const message = error.message.toLowerCase();
    
    if (message.includes('not found')) {
      return this.createErrorResponse(ERROR_CODES.FILE_NOT_FOUND, error.message);
    }
    
    if (message.includes('invalid') && message.includes('format')) {
      return this.createErrorResponse(ERROR_CODES.INVALID_FILE_FORMAT, error.message);
    }
    
    if (message.includes('permission') || message.includes('eacces')) {
      return this.createErrorResponse(ERROR_CODES.PERMISSION_DENIED, error.message);
    }
    
    if (message.includes('timeout')) {
      return this.createErrorResponse(ERROR_CODES.NETWORK_TIMEOUT, error.message);
    }
    
    if (message.includes('parse') || message.includes('parsing')) {
      return this.createErrorResponse(ERROR_CODES.FONT_PARSE_ERROR, error.message);
    }
    
    // 默认内部错误
    return this.createErrorResponse(ERROR_CODES.INTERNAL_ERROR, error.message);
  }

  /**
   * 记录错误日志
   * @param {Error} error - 错误对象
   * @param {Object} context - 上下文信息
   */
  static log(error, context = {}) {
    const logEntry = {
      timestamp: new Date().toISOString(),
      error: {
        message: error.message,
        stack: error.stack
      },
      context
    };
    
    console.error('[ErrorHandler]', JSON.stringify(logEntry, null, 2));
  }
}

module.exports = {
  ErrorHandler,
  ERROR_CODES,
  ERROR_MESSAGES,
  ERROR_SUGGESTIONS
};
