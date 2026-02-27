/**
 * 降级提示界面组件
 * 
 * 当检测到不支持的输入格式时，显示降级提示
 * 提供可操作的建议和替代方案
 */

export interface FallbackInfo {
  inputType: string;
  failureReason: string;
  suggestions: string[];
  originalContent: string;
}

export class FallbackPrompt {
  private container: HTMLElement;
  private onFormatSwitch?: (format: string) => void;
  private onManualEdit?: () => void;

  constructor(containerId: string) {
    const element = document.getElementById(containerId);
    if (!element) {
      throw new Error(`Container element #${containerId} not found`);
    }
    this.container = element;
  }

  /**
   * 显示降级提示
   * @param info - 降级信息
   */
  show(info: FallbackInfo): void {
    this.container.innerHTML = '';
    this.container.style.display = 'block';

    // 创建提示卡片
    const card = document.createElement('div');
    card.className = 'fallback-prompt-card';

    // 标题
    const title = document.createElement('div');
    title.className = 'fallback-prompt-title';
    title.innerHTML = `
      <span class="fallback-icon">⚠️</span>
      <span>无法处理此输入格式</span>
    `;

    // 输入类型
    const inputType = document.createElement('div');
    inputType.className = 'fallback-input-type';
    inputType.innerHTML = `
      <strong>检测到的输入类型：</strong> ${this.escapeHtml(info.inputType)}
    `;

    // 失败原因
    const reason = document.createElement('div');
    reason.className = 'fallback-reason';
    reason.innerHTML = `
      <strong>失败原因：</strong> ${this.escapeHtml(info.failureReason)}
    `;

    // 建议列表
    const suggestions = document.createElement('div');
    suggestions.className = 'fallback-suggestions';
    suggestions.innerHTML = `
      <strong>建议：</strong>
      <ul>
        ${info.suggestions.map(s => `<li>${this.escapeHtml(s)}</li>`).join('')}
      </ul>
    `;

    // 原始内容（可折叠）
    const originalContent = document.createElement('details');
    originalContent.className = 'fallback-original-content';
    originalContent.innerHTML = `
      <summary>查看原始内容</summary>
      <pre>${this.escapeHtml(info.originalContent)}</pre>
    `;

    // 操作按钮
    const actions = document.createElement('div');
    actions.className = 'fallback-actions';

    const switchToLatexBtn = document.createElement('button');
    switchToLatexBtn.className = 'btn btn-primary';
    switchToLatexBtn.textContent = '切换到 LaTeX 输入';
    switchToLatexBtn.addEventListener('click', () => {
      if (this.onFormatSwitch) {
        this.onFormatSwitch('latex');
      }
    });

    const switchToAsciiMathBtn = document.createElement('button');
    switchToAsciiMathBtn.className = 'btn btn-secondary';
    switchToAsciiMathBtn.textContent = '尝试 AsciiMath';
    switchToAsciiMathBtn.addEventListener('click', () => {
      if (this.onFormatSwitch) {
        this.onFormatSwitch('asciimath');
      }
    });

    const manualEditBtn = document.createElement('button');
    manualEditBtn.className = 'btn btn-secondary';
    manualEditBtn.textContent = '手动编辑';
    manualEditBtn.addEventListener('click', () => {
      if (this.onManualEdit) {
        this.onManualEdit();
      }
      this.hide();
    });

    const closeBtn = document.createElement('button');
    closeBtn.className = 'btn btn-text';
    closeBtn.textContent = '关闭';
    closeBtn.addEventListener('click', () => {
      this.hide();
    });

    actions.appendChild(switchToLatexBtn);
    actions.appendChild(switchToAsciiMathBtn);
    actions.appendChild(manualEditBtn);
    actions.appendChild(closeBtn);

    // 组装卡片
    card.appendChild(title);
    card.appendChild(inputType);
    card.appendChild(reason);
    card.appendChild(suggestions);
    card.appendChild(originalContent);
    card.appendChild(actions);

    this.container.appendChild(card);
  }

  /**
   * 隐藏降级提示
   */
  hide(): void {
    this.container.innerHTML = '';
    this.container.style.display = 'none';
  }

  /**
   * 设置格式切换回调
   */
  onSwitchFormat(callback: (format: string) => void): void {
    this.onFormatSwitch = callback;
  }

  /**
   * 设置手动编辑回调
   */
  onEdit(callback: () => void): void {
    this.onManualEdit = callback;
  }

  /**
   * 转义 HTML 特殊字符
   */
  private escapeHtml(text: string): string {
    const div = document.createElement('div');
    div.textContent = text;
    return div.innerHTML;
  }
}
