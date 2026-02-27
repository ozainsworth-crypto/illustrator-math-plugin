/**
 * 歧义提示组件
 * 
 * 在输入框下方显示歧义提示，支持展开查看候选项并切换
 */

import type { DetectedAmbiguity } from '../lib/ambiguity/types';

export class AmbiguityPrompt {
  private container: HTMLElement;
  private onCandidateSelected?: (ambiguityIndex: number, candidateIndex: number) => void;

  constructor(containerId: string) {
    const element = document.getElementById(containerId);
    if (!element) {
      throw new Error(`Container element #${containerId} not found`);
    }
    this.container = element;
  }

  /**
   * 显示歧义提示
   * @param ambiguities - 检测到的歧义列表
   */
  show(ambiguities: DetectedAmbiguity[]): void {
    if (ambiguities.length === 0) {
      this.hide();
      return;
    }

    this.container.innerHTML = '';
    this.container.style.display = 'block';

    // 创建提示条
    const promptBar = document.createElement('div');
    promptBar.className = 'ambiguity-prompt-bar';
    promptBar.innerHTML = `
      <span class="ambiguity-icon">⚠️</span>
      <span class="ambiguity-message">检测到 ${ambiguities.length} 处可能的歧义</span>
      <button class="ambiguity-toggle-btn" type="button">查看详情</button>
    `;

    // 创建详情面板
    const detailsPanel = document.createElement('div');
    detailsPanel.className = 'ambiguity-details-panel';
    detailsPanel.style.display = 'none';

    // 为每个歧义创建卡片
    ambiguities.forEach((ambiguity, ambIndex) => {
      const card = this.createAmbiguityCard(ambiguity, ambIndex);
      detailsPanel.appendChild(card);
    });

    // 绑定展开/收起事件
    const toggleBtn = promptBar.querySelector('.ambiguity-toggle-btn') as HTMLButtonElement;
    toggleBtn.addEventListener('click', () => {
      const isVisible = detailsPanel.style.display !== 'none';
      detailsPanel.style.display = isVisible ? 'none' : 'block';
      toggleBtn.textContent = isVisible ? '查看详情' : '收起';
    });

    this.container.appendChild(promptBar);
    this.container.appendChild(detailsPanel);
  }

  /**
   * 隐藏歧义提示
   */
  hide(): void {
    this.container.innerHTML = '';
    this.container.style.display = 'none';
  }

  /**
   * 设置候选项选择回调
   */
  onSelect(callback: (ambiguityIndex: number, candidateIndex: number) => void): void {
    this.onCandidateSelected = callback;
  }

  /**
   * 创建歧义卡片
   */
  private createAmbiguityCard(ambiguity: DetectedAmbiguity, ambIndex: number): HTMLElement {
    const card = document.createElement('div');
    card.className = 'ambiguity-card';

    // 卡片头部
    const header = document.createElement('div');
    header.className = 'ambiguity-card-header';
    header.innerHTML = `
      <div class="ambiguity-card-title">${ambiguity.message}</div>
      <div class="ambiguity-card-meta">
        <span class="ambiguity-range">位置: ${ambiguity.range.start}-${ambiguity.range.end}</span>
        <span class="ambiguity-text">"${ambiguity.range.text}"</span>
      </div>
    `;

    // 候选项列表
    const candidatesList = document.createElement('div');
    candidatesList.className = 'ambiguity-candidates-list';

    ambiguity.candidates.forEach((candidate, candIndex) => {
      const candidateItem = this.createCandidateItem(
        candidate,
        candIndex,
        ambIndex,
        candIndex === ambiguity.defaultIndex
      );
      candidatesList.appendChild(candidateItem);
    });

    card.appendChild(header);
    card.appendChild(candidatesList);

    return card;
  }

  /**
   * 创建候选项
   */
  private createCandidateItem(
    candidate: { label: string; tex: string; explanation: string },
    candIndex: number,
    ambIndex: number,
    isDefault: boolean
  ): HTMLElement {
    const item = document.createElement('div');
    item.className = `ambiguity-candidate-item ${isDefault ? 'default' : ''}`;

    item.innerHTML = `
      <div class="candidate-header">
        <input 
          type="radio" 
          name="ambiguity-${ambIndex}" 
          value="${candIndex}"
          ${isDefault ? 'checked' : ''}
          class="candidate-radio"
        />
        <label class="candidate-label">
          ${candidate.label}
          ${isDefault ? '<span class="default-badge">默认</span>' : ''}
        </label>
      </div>
      <div class="candidate-tex">
        <code>${candidate.tex}</code>
      </div>
      <div class="candidate-preview" data-tex="${candidate.tex}">
        <div class="preview-placeholder">加载预览...</div>
      </div>
      <div class="candidate-explanation">${candidate.explanation}</div>
    `;

    // 绑定选择事件
    const radio = item.querySelector('.candidate-radio') as HTMLInputElement;
    radio.addEventListener('change', () => {
      if (this.onCandidateSelected) {
        this.onCandidateSelected(ambIndex, candIndex);
      }

      // 更新样式
      const allItems = item.parentElement?.querySelectorAll('.ambiguity-candidate-item');
      allItems?.forEach((el) => el.classList.remove('selected'));
      item.classList.add('selected');
    });

    // 如果是默认选项，标记为已选择
    if (isDefault) {
      item.classList.add('selected');
    }

    return item;
  }

  /**
   * 渲染候选项的 MathJax 预览
   * @param renderFunction - MathJax 渲染函数
   */
  async renderPreviews(renderFunction: (tex: string) => Promise<string>): Promise<void> {
    const previews = this.container.querySelectorAll('.candidate-preview');

    for (const preview of Array.from(previews)) {
      const tex = preview.getAttribute('data-tex');
      if (!tex) continue;

      try {
        const svg = await renderFunction(tex);
        preview.innerHTML = svg;
      } catch (error) {
        preview.innerHTML = '<div class="preview-error">预览失败</div>';
        console.error('Failed to render preview:', error);
      }
    }
  }
}
