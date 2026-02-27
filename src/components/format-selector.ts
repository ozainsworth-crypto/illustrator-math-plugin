/**
 * FormatSelector - 格式选择器 UI 组件
 * 
 * 功能：
 * - 显示检测到的格式类型
 * - 允许用户手动切换格式（UnicodeMath / LaTeX / AsciiMath）
 * - 实时更新预览
 * 
 * 关联需求：需求 2（B3.8, B4.9）
 */

import type { FormulaFormat } from '../lib/formula-parser';

export interface FormatOption {
  value: FormulaFormat;
  label: string;
  description: string;
}

export class FormatSelector {
  private container: HTMLElement;
  private currentFormat: FormulaFormat | null = null;
  private onFormatChange?: (format: FormulaFormat) => void;

  constructor(containerId: string) {
    const element = document.getElementById(containerId);
    if (!element) {
      throw new Error(`Container element #${containerId} not found`);
    }
    this.container = element;
  }

  /**
   * 显示格式选择器
   * @param detectedFormat - 检测到的格式
   * @param availableFormats - 可用的格式选项
   */
  show(detectedFormat: FormulaFormat, availableFormats: FormatOption[]): void {
    this.currentFormat = detectedFormat;
    this.container.innerHTML = '';
    this.container.style.display = 'block';

    // 创建格式选择器容器
    const selectorContainer = document.createElement('div');
    selectorContainer.className = 'format-selector-container';

    // 创建折叠式标题栏（显示当前格式）
    const header = document.createElement('div');
    header.className = 'format-selector-header';
    
    const currentFormatLabel = this.getFormatLabel(detectedFormat);
    header.innerHTML = `
      <span class="format-icon">🔍</span>
      <span class="format-current-label">检测到格式：<strong>${currentFormatLabel}</strong></span>
      <span class="format-toggle-icon">▼</span>
    `;

    // 创建格式选项列表（默认隐藏）
    const optionsList = document.createElement('div');
    optionsList.className = 'format-options-list';
    optionsList.style.display = 'none';

    availableFormats.forEach((option) => {
      const optionItem = this.createFormatOption(option, option.value === detectedFormat);
      optionsList.appendChild(optionItem);
    });

    // 绑定展开/收起事件
    header.addEventListener('click', () => {
      const isExpanded = optionsList.style.display !== 'none';
      optionsList.style.display = isExpanded ? 'none' : 'block';
      
      // 更新箭头方向
      const toggleIcon = header.querySelector('.format-toggle-icon');
      if (toggleIcon) {
        toggleIcon.textContent = isExpanded ? '▼' : '▲';
      }
    });

    selectorContainer.appendChild(header);
    selectorContainer.appendChild(optionsList);
    this.container.appendChild(selectorContainer);
  }

  /**
   * 隐藏格式选择器
   */
  hide(): void {
    this.container.innerHTML = '';
    this.container.style.display = 'none';
    this.currentFormat = null;
  }

  /**
   * 设置格式变化回调
   */
  onChange(callback: (format: FormulaFormat) => void): void {
    this.onFormatChange = callback;
  }

  /**
   * 获取当前选中的格式
   */
  getCurrentFormat(): FormulaFormat | null {
    return this.currentFormat;
  }

  /**
   * 创建格式选项
   */
  private createFormatOption(option: FormatOption, isSelected: boolean): HTMLElement {
    const item = document.createElement('div');
    item.className = `format-option-item ${isSelected ? 'selected' : ''}`;

    item.innerHTML = `
      <input 
        type="radio" 
        name="format-selector" 
        value="${option.value}"
        ${isSelected ? 'checked' : ''}
        class="format-radio"
        id="format-${option.value}"
      />
      <label class="format-label" for="format-${option.value}">
        <span class="format-name">${option.label}</span>
        <span class="format-description">${option.description}</span>
      </label>
    `;

    // 绑定选择事件
    const radio = item.querySelector('.format-radio') as HTMLInputElement;
    radio.addEventListener('change', () => {
      if (this.onFormatChange) {
        this.currentFormat = option.value;
        this.onFormatChange(option.value);
      }

      // 更新样式
      const allItems = this.container.querySelectorAll('.format-option-item');
      allItems.forEach((el) => el.classList.remove('selected'));
      item.classList.add('selected');
    });

    return item;
  }

  /**
   * 获取格式的显示标签
   */
  private getFormatLabel(format: FormulaFormat): string {
    const labels: Record<string, string> = {
      latex: 'LaTeX',
      unicodemath: 'UnicodeMath',
      asciimath: 'AsciiMath',
      rich_text: '富文本',
      unknown: '未知格式',
    };
    return labels[format] || format;
  }
}
