/**
 * FontSelector - 字体选择器 UI 组件（单用户字体包模型）
 * 
 * 显示 2 个字体选项（"自主字体" 和 "默认字体"），允许用户切换字体
 * 在"自主字体"旁显示提示图标，告知用户如何替换字体
 */

import type { FontPackLoader } from '../lib/font-pack-loader';

export class FontSelector {
  private container: HTMLElement;
  private fontPackLoader: FontPackLoader;
  private onFontChangeCallback: ((useUserFont: boolean) => void) | null = null;

  constructor(container: HTMLElement, fontPackLoader: FontPackLoader) {
    this.container = container;
    this.fontPackLoader = fontPackLoader;
  }

  /**
   * 渲染字体选择器
   */
  render(): void {
    // 清空容器
    this.container.innerHTML = '';

    // 获取用户字体包状态
    const status = this.fontPackLoader.getUserFontPackStatus();

    // 创建 segmented control（分段按钮）
    const segmentedControl = document.createElement('div');
    segmentedControl.className = 'segmented-control';

    // 选项 1：默认字体
    const defaultBtn = document.createElement('div');
    defaultBtn.className = 'segment-btn' + (!status.active ? ' active' : '');
    defaultBtn.textContent = '默认字体';
    defaultBtn.addEventListener('click', () => {
      if (!status.active) return; // 已经是默认字体，不需要切换
      this.handleFontChange(false);
    });
    segmentedControl.appendChild(defaultBtn);

    // 选项 2：自定义字体
    const userBtn = document.createElement('div');
    userBtn.className = 'segment-btn' + (status.active ? ' active' : '');
    userBtn.textContent = '自定义字体';
    
    // 如果用户字体包不存在，禁用此选项
    if (!status.exists) {
      userBtn.style.opacity = '0.5';
      userBtn.style.cursor = 'not-allowed';
      userBtn.title = '请先创建自主字体包';
    } else {
      userBtn.addEventListener('click', () => {
        if (status.active) return; // 已经是自主字体，不需要切换
        this.handleFontChange(true);
      });
    }
    
    segmentedControl.appendChild(userBtn);

    // 添加到容器
    this.container.appendChild(segmentedControl);

    // 添加字体信息显示
    const fontInfo = document.createElement('div');
    fontInfo.className = 'font-info-display';
    fontInfo.style.cssText = 'margin-top: 6px; font-size: 9px; color: var(--text-secondary); line-height: 1.4;';
    
    if (status.active && status.exists) {
      // 使用自定义字体：显示字体名称和更新时间
      const pack = this.fontPackLoader.getCurrentFontPack();
      if (pack && pack.manifest) {
        const fontName = pack.manifest.name || '未知字体';
        const createdAt = pack.manifest.createdAt ? new Date(pack.manifest.createdAt).toLocaleString('zh-CN') : '未知时间';
        fontInfo.textContent = `当前使用：${fontName}（更新于 ${createdAt}）`;
      } else {
        fontInfo.textContent = `当前使用：自定义字体`;
      }
    } else if (!status.active) {
      // 使用默认字体
      fontInfo.textContent = `当前使用：MathJax 原生开源字体`;
    } else {
      // 没有自定义字体
      fontInfo.textContent = `当前使用：MathJax 原生开源字体`;
    }
    
    this.container.appendChild(fontInfo);
  }



  /**
   * 处理字体切换
   */
  private handleFontChange(useUserFont: boolean): void {
    if (useUserFont) {
      // 应用用户字体包
      const success = this.fontPackLoader.applyUserFontPack();
      if (!success) {
        alert('无法应用用户字体包');
        // 重新渲染以恢复正确状态
        this.render();
        return;
      }
    } else {
      // 恢复默认字体
      this.fontPackLoader.restoreDefaultFont();
    }

    // 更新状态显示
    this.render();

    // 触发回调
    if (this.onFontChangeCallback) {
      this.onFontChangeCallback(useUserFont);
    }
  }

  /**
   * 设置字体切换回调
   * @param callback 回调函数
   */
  onFontChange(callback: (useUserFont: boolean) => void): void {
    this.onFontChangeCallback = callback;
  }
}
