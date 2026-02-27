/**
 * AmbiguityResolver - 歧义对比界面组件
 * 
 * 功能：
 * - 显示原始粘贴内容
 * - 显示多种解析结果的 SVG 预览（并排对比）
 * - 显示每种解析结果对应的 LaTeX 代码
 * - 允许用户选择其中一种
 * - 允许用户手动编辑 LaTeX
 * 
 * 关联需求：需求 2（B3.7-8）
 */

export interface AmbiguityCandidate {
  label: string;
  latex: string;
  description: string;
}

export class AmbiguityResolver {
  private container: HTMLElement;
  private candidates: AmbiguityCandidate[] = [];
  private selectedIndex: number = 0;
  private onResolve?: (latex: string) => void;
  private onCancel?: () => void;

  constructor(containerId: string) {
    const element = document.getElementById(containerId);
    if (!element) {
      throw new Error(`Container element #${containerId} not found`);
    }
    this.container = element;
  }

  /**
   * 显示歧义对比界面
   * @param originalInput - 原始粘贴内容
   * @param candidates - 候选解析结果
   * @param defaultIndex - 默认选中的候选项索引
   */
  show(originalInput: string, candidates: AmbiguityCandidate[], defaultIndex: number = 0): void {
    this.candidates = candidates;
    this.selectedIndex = defaultIndex;

    this.container.innerHTML = '';
    this.container.style.display = 'block';

    // 创建对比界面容器
    const resolverContainer = document.createElement('div');
    resolverContainer.className = 'ambiguity-resolver-container';

    // 创建标题
    const title = document.createElement('div');
    title.className = 'resolver-title';
    title.innerHTML = `
      <span class="resolver-icon">⚠️</span>
      <span>检测到歧义，请选择正确的解释</span>
    `;

    // 创建原始内容显示
    const originalSection = document.createElement('div');
    originalSection.className = 'resolver-original-section';
    originalSection.innerHTML = `
      <div class="resolver-section-label">原始内容：</div>
      <div class="original-content">${this.escapeHtml(originalInput)}</div>
    `;

    // 创建候选项对比区域
    const candidatesSection = document.createElement('div');
    candidatesSection.className = 'resolver-candidates-section';
    candidatesSection.innerHTML = '<div class="resolver-section-label">请选择正确的解释：</div>';

    const candidatesGrid = document.createElement('div');
    candidatesGrid.className = 'candidates-grid';

    candidates.forEach((candidate, index) => {
      const candidateCard = this.createCandidateCard(candidate, index, index === defaultIndex);
      candidatesGrid.appendChild(candidateCard);
    });

    candidatesSection.appendChild(candidatesGrid);

    // 创建手动编辑区域
    const editSection = document.createElement('div');
    editSection.className = 'resolver-edit-section';
    editSection.innerHTML = `
      <div class="resolver-section-label">或手动编辑 LaTeX：</div>
      <textarea 
        class="latex-edit-input" 
        placeholder="输入 LaTeX 代码..."
        rows="3"
      >${candidates[defaultIndex]?.latex || ''}</textarea>
    `;

    // 创建操作按钮
    const actionsSection = document.createElement('div');
    actionsSection.className = 'resolver-actions';
    actionsSection.innerHTML = `
      <button class="btn btn-secondary resolver-cancel-btn">取消</button>
      <button class="btn btn-primary resolver-confirm-btn">确认</button>
    `;

    // 组装界面
    resolverContainer.appendChild(title);
    resolverContainer.appendChild(originalSection);
    resolverContainer.appendChild(candidatesSection);
    resolverContainer.appendChild(editSection);
    resolverContainer.appendChild(actionsSection);
    this.container.appendChild(resolverContainer);

    // 绑定事件
    this.bindEvents();
  }

  /**
   * 隐藏歧义对比界面
   */
  hide(): void {
    this.container.innerHTML = '';
    this.container.style.display = 'none';
  }

  /**
   * 设置确认回调
   */
  onConfirm(callback: (latex: string) => void): void {
    this.onResolve = callback;
  }

  /**
   * 设置取消回调
   */
  onCancelClick(callback: () => void): void {
    this.onCancel = callback;
  }

  /**
   * 渲染候选项的 SVG 预览
   * @param renderFunction - MathJax 渲染函数
   */
  async renderPreviews(renderFunction: (tex: string) => Promise<string>): Promise<void> {
    const previews = this.container.querySelectorAll('.card-preview');

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

  /**
   * 创建候选项卡片
   */
  private createCandidateCard(
    candidate: AmbiguityCandidate,
    index: number,
    isDefault: boolean
  ): HTMLElement {
    const card = document.createElement('div');
    card.className = `candidate-card ${isDefault ? 'selected' : ''}`;
    card.dataset.index = String(index);

    card.innerHTML = `
      <div class="card-header">
        <input 
          type="radio" 
          name="ambiguity-resolver" 
          value="${index}"
          ${isDefault ? 'checked' : ''}
          class="card-radio"
        />
        <span class="card-label">${candidate.label}</span>
      </div>
      <div class="card-preview" data-tex="${this.escapeHtml(candidate.latex)}">
        <div class="preview-placeholder">加载预览...</div>
      </div>
      <div class="card-latex">
        <code>${this.escapeHtml(candidate.latex)}</code>
      </div>
      <div class="card-description">${candidate.description}</div>
    `;

    return card;
  }

  /**
   * 绑定事件
   */
  private bindEvents(): void {
    // 候选项选择事件
    const cards = this.container.querySelectorAll('.candidate-card');
    cards.forEach((card) => {
      card.addEventListener('click', () => {
        const index = parseInt(card.getAttribute('data-index') || '0', 10);
        this.selectCandidate(index);
      });

      const radio = card.querySelector('.card-radio') as HTMLInputElement;
      radio.addEventListener('change', () => {
        const index = parseInt(radio.value, 10);
        this.selectCandidate(index);
      });
    });

    // 手动编辑输入事件
    const editInput = this.container.querySelector('.latex-edit-input') as HTMLTextAreaElement;
    if (editInput) {
      editInput.addEventListener('input', () => {
        // 取消所有候选项的选中状态
        cards.forEach((card) => card.classList.remove('selected'));
        const radios = this.container.querySelectorAll('.card-radio');
        radios.forEach((radio) => {
          if (radio instanceof HTMLInputElement) {
            radio.checked = false;
          }
        });
      });
    }

    // 确认按钮
    const confirmBtn = this.container.querySelector('.resolver-confirm-btn');
    confirmBtn?.addEventListener('click', () => {
      const editInput = this.container.querySelector('.latex-edit-input') as HTMLTextAreaElement;
      const latex = editInput?.value.trim() || this.candidates[this.selectedIndex]?.latex || '';

      if (this.onResolve) {
        this.onResolve(latex);
      }
      this.hide();
    });

    // 取消按钮
    const cancelBtn = this.container.querySelector('.resolver-cancel-btn');
    cancelBtn?.addEventListener('click', () => {
      if (this.onCancel) {
        this.onCancel();
      }
      this.hide();
    });
  }

  /**
   * 选择候选项
   */
  private selectCandidate(index: number): void {
    this.selectedIndex = index;

    // 更新卡片样式
    const cards = this.container.querySelectorAll('.candidate-card');
    cards.forEach((card, i) => {
      if (i === index) {
        card.classList.add('selected');
      } else {
        card.classList.remove('selected');
      }
    });

    // 更新编辑框内容
    const editInput = this.container.querySelector('.latex-edit-input') as HTMLTextAreaElement;
    if (editInput && this.candidates[index]) {
      editInput.value = this.candidates[index].latex;
    }
  }

  /**
   * 转义 HTML
   */
  private escapeHtml(text: string): string {
    const div = document.createElement('div');
    div.textContent = text;
    return div.innerHTML;
  }
}
