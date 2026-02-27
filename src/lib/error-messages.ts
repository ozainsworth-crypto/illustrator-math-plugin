/**
 * 友好的错误消息模板
 * 
 * 为用户提供清晰、可操作的错误提示
 */

export interface ErrorMessage {
  title: string;
  description: string;
  suggestions: string[];
  technicalDetails?: string;
}

export class ErrorMessageTemplates {
  /**
   * LaTeX 语法错误
   */
  static latexSyntaxError(error: string, position?: number): ErrorMessage {
    return {
      title: '公式语法错误',
      description: '输入的 LaTeX 公式包含语法错误，无法正确渲染。',
      suggestions: [
        '检查括号是否配对（如 \\left( 和 \\right)）',
        '检查命令是否拼写正确（如 \\frac、\\sqrt）',
        '检查是否缺少必要的参数（如 \\frac{分子}{分母}）',
        position !== undefined ? `错误位置大约在第 ${position} 个字符附近` : '仔细检查公式的每个部分'
      ],
      technicalDetails: error
    };
  }

  /**
   * 文档未打开错误
   */
  static noDocumentOpen(): ErrorMessage {
    return {
      title: '未打开 Illustrator 文档',
      description: '无法插入公式，因为当前没有打开的 Illustrator 文档。',
      suggestions: [
        '在 Illustrator 中创建一个新文档（文件 > 新建）',
        '或打开一个现有文档（文件 > 打开）',
        '然后重新点击"插入到画布"按钮'
      ]
    };
  }

  /**
   * 插入失败错误
   */
  static insertFailed(reason: string): ErrorMessage {
    return {
      title: '插入失败',
      description: '无法将公式插入到 Illustrator 文档中。',
      suggestions: [
        '确保 Illustrator 文档处于可编辑状态',
        '检查文档是否被锁定或只读',
        '尝试重新渲染公式后再插入',
        '如果问题持续，请尝试重启 Illustrator'
      ],
      technicalDetails: reason
    };
  }

  /**
   * 字体包加载失败
   */
  static fontPackLoadFailed(fontName: string, reason: string): ErrorMessage {
    return {
      title: '字体包加载失败',
      description: `无法加载自定义字体包"${fontName}"。`,
      suggestions: [
        '检查字体包文件是否存在于 fonts/user-font-pack/ 目录',
        '确保 manifest.json 和 fontdata.js 文件格式正确',
        '尝试使用字体包构建工具重新生成字体包',
        '或切换回默认字体继续使用'
      ],
      technicalDetails: reason
    };
  }

  /**
   * UnicodeMath 转换失败
   */
  static unicodemathConversionFailed(input: string): ErrorMessage {
    return {
      title: 'UnicodeMath 转换失败',
      description: '无法将粘贴的内容转换为 LaTeX 公式。',
      suggestions: [
        '确保在 PowerPoint/Word 中选中公式后，右键选择"线性格式"',
        '然后复制纯文本内容（不要复制为图片或富文本）',
        '或直接切换到 LaTeX 输入模式手动输入公式',
        '也可以尝试使用 AsciiMath 格式输入'
      ],
      technicalDetails: `输入内容: ${input.substring(0, 100)}${input.length > 100 ? '...' : ''}`
    };
  }

  /**
   * 富文本格式错误
   */
  static richTextDetected(): ErrorMessage {
    return {
      title: '检测到富文本格式',
      description: '粘贴的内容包含富文本格式，无法直接解析为公式。',
      suggestions: [
        '在 PowerPoint/Word 中选中公式，右键选择"线性格式"',
        '然后使用"仅保留文本"方式粘贴（Ctrl/Cmd + Shift + V）',
        '或在记事本中粘贴一次，再从记事本复制纯文本',
        '也可以直接在输入框中手动输入 LaTeX 公式'
      ]
    };
  }

  /**
   * 渲染超时错误
   */
  static renderTimeout(): ErrorMessage {
    return {
      title: '渲染超时',
      description: '公式渲染时间过长，可能是公式过于复杂。',
      suggestions: [
        '尝试简化公式（拆分为多个较小的公式）',
        '检查是否有嵌套过深的结构（如多层分数）',
        '减少矩阵的行列数',
        '如果问题持续，请尝试重新加载插件'
      ]
    };
  }

  /**
   * 网络错误（MathJax 加载失败）
   */
  static mathjaxLoadFailed(): ErrorMessage {
    return {
      title: 'MathJax 加载失败',
      description: '无法加载数学公式渲染引擎。',
      suggestions: [
        '检查网络连接是否正常',
        '尝试重新加载插件',
        '如果使用离线版本，检查 MathJax 库文件是否完整',
        '联系技术支持获取帮助'
      ]
    };
  }

  /**
   * 通用错误
   */
  static genericError(error: string): ErrorMessage {
    return {
      title: '发生错误',
      description: '处理过程中发生了意外错误。',
      suggestions: [
        '尝试重新执行操作',
        '检查输入内容是否正确',
        '如果问题持续，请尝试重新加载插件',
        '或联系技术支持并提供错误详情'
      ],
      technicalDetails: error
    };
  }

  /**
   * 字号超出范围错误
   */
  static fontSizeOutOfRange(value: number, min: number, max: number): ErrorMessage {
    return {
      title: '字号超出范围',
      description: `输入的字号 ${value}pt 超出了允许的范围。`,
      suggestions: [
        `请输入 ${min}-${max}pt 之间的字号`,
        '常用字号：12pt（正文）、14pt（标题）、18pt（大标题）',
        '或使用步进器按钮调整字号'
      ]
    };
  }

  /**
   * 临时文件创建失败
   */
  static tempFileCreationFailed(reason: string): ErrorMessage {
    return {
      title: '临时文件创建失败',
      description: '无法创建临时 SVG 文件，插入操作无法继续。',
      suggestions: [
        '检查磁盘空间是否充足',
        '检查临时文件目录的写入权限',
        '尝试重启 Illustrator',
        '如果问题持续，请联系技术支持'
      ],
      technicalDetails: reason
    };
  }
}

/**
 * 格式化错误消息为 HTML
 */
export function formatErrorMessage(error: ErrorMessage, showTechnical: boolean = false): string {
  let html = `
    <div class="error-message-card">
      <div class="error-title">
        <span class="error-icon">⚠️</span>
        <strong>${error.title}</strong>
      </div>
      <div class="error-description">${error.description}</div>
  `;

  if (error.suggestions.length > 0) {
    html += `
      <div class="error-suggestions">
        <strong>建议操作：</strong>
        <ul>
          ${error.suggestions.map(s => `<li>${s}</li>`).join('')}
        </ul>
      </div>
    `;
  }

  if (showTechnical && error.technicalDetails) {
    html += `
      <details class="error-technical">
        <summary>技术详情</summary>
        <pre>${error.technicalDetails}</pre>
      </details>
    `;
  }

  html += `</div>`;
  return html;
}
