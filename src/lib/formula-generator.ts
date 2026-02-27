/**
 * WebFormulaGenerator 核心类
 * 负责协调公式生成的整体流程
 */

import { initMathJax, getMathJax, getMathJaxVersion, isMathJaxInitialized, injectFontdata } from './mathjax-loader';
import type { FontData } from './font-pack-loader';

/**
 * 公式生成器配置
 */
export interface FormulaGeneratorConfig {
  mathjaxVersion: string; // 锁定的 MathJax 版本
  outputFormat: 'svg'; // 输出格式
  displayMode: boolean; // 是否为显示模式
  fontdata?: FontData | null; // 可选的自定义字体数据
}

/**
 * SVG 渲染结果
 */
export interface SVGResult {
  svg: SVGElement; // SVG DOM 元素
  svgString: string; // SVG 字符串
  width: number; // 宽度（像素）
  height: number; // 高度（像素）
  errors: string[]; // 错误信息（如有）
  calibrationData?: CalibrationData; // 标尺校准数据
}

/**
 * 标尺校准数据
 */
export interface CalibrationData {
  xHeight: number;        // x-height (SVG 单位)
  emSize: number;         // em 大小 (SVG 单位)
  xHeightToEmRatio: number; // x-height / em 比例
}

/**
 * WebFormulaGenerator 类
 * 协调公式生成的整体流程
 */
export class WebFormulaGenerator {
  private config: FormulaGeneratorConfig;
  private calibrationDataCache: CalibrationData | null = null; // 缓存的标尺校准数据

  constructor(config: FormulaGeneratorConfig) {
    this.config = config;
  }

  /**
   * 获取或计算标尺校准数据（使用固定参考字符 'x'）
   * 计算 x-height 和 em 大小，以及它们的比例
   * 只计算一次并缓存，确保所有公式使用相同的标尺数据
   * @returns 标尺校准数据
   */
  private async getCalibrationData(): Promise<CalibrationData> {
    // 如果已缓存，直接返回
    if (this.calibrationDataCache !== null) {
      return this.calibrationDataCache;
    }

    try {
      // 确保 MathJax 已初始化
      if (!isMathJaxInitialized()) {
        await initMathJax();
      }

      const MathJax = getMathJax();
      
      // 使用固定参考字符 'x' 渲染
      const refSvgElement = MathJax.tex2svg('x', {
        display: this.config.displayMode,
      });

      const refSvg = refSvgElement.querySelector('svg');
      if (!refSvg) {
        console.warn('[CalibrationData] 无法渲染参考字符，使用默认值');
        this.calibrationDataCache = { xHeight: 450, emSize: 1000, xHeightToEmRatio: 0.45 };
        return this.calibrationDataCache;
      }

      // 临时添加到 DOM 以计算 bbox
      const tempContainer = document.createElement('div');
      tempContainer.style.position = 'absolute';
      tempContainer.style.left = '-9999px';
      tempContainer.style.top = '-9999px';
      tempContainer.style.visibility = 'hidden';
      document.body.appendChild(tempContainer);
      
      const refSvgClone = refSvg.cloneNode(true) as SVGElement;
      tempContainer.appendChild(refSvgClone);

      // 1. 计算 x-height（字符 'x' 的 bbox 高度）
      const useElement = refSvgClone.querySelector('use');
      if (!useElement) {
        document.body.removeChild(tempContainer);
        console.warn('[CalibrationData] 未找到 <use> 元素，使用默认值');
        this.calibrationDataCache = { xHeight: 450, emSize: 1000, xHeightToEmRatio: 0.45 };
        return this.calibrationDataCache;
      }

      const href = useElement.getAttribute('href') || useElement.getAttribute('xlink:href');
      if (!href) {
        document.body.removeChild(tempContainer);
        console.warn('[CalibrationData] 未找到 href，使用默认值');
        this.calibrationDataCache = { xHeight: 450, emSize: 1000, xHeightToEmRatio: 0.45 };
        return this.calibrationDataCache;
      }

      const pathId = href.replace('#', '');
      const path = refSvgClone.querySelector(`#${CSS.escape(pathId)}`) as SVGGraphicsElement;
      if (!path) {
        document.body.removeChild(tempContainer);
        console.warn('[CalibrationData] 未找到对应的 path，使用默认值');
        this.calibrationDataCache = { xHeight: 450, emSize: 1000, xHeightToEmRatio: 0.45 };
        return this.calibrationDataCache;
      }

      const xBbox = path.getBBox();
      if (!xBbox || xBbox.height <= 0) {
        document.body.removeChild(tempContainer);
        console.warn('[CalibrationData] x-height bbox 无效，使用默认值');
        this.calibrationDataCache = { xHeight: 450, emSize: 1000, xHeightToEmRatio: 0.45 };
        return this.calibrationDataCache;
      }

      const xHeight = xBbox.height;

      // 2. 使用固定的 unitsPerEm = 1000
      // MathJax 和大多数数学字体使用 1000 units per em 的坐标系
      // 这与 fontdata 的坐标系一致
      const unitsPerEm = 1000;

      document.body.removeChild(tempContainer);

      // 3. 计算比例
      const xHeightToEmRatio = xHeight / unitsPerEm;

      this.calibrationDataCache = {
        xHeight,
        emSize: unitsPerEm,
        xHeightToEmRatio,
      };

      console.log(`[CalibrationData] 标尺校准数据已缓存:`);
      console.log(`  x-height: ${xHeight.toFixed(3)} (SVG 单位)`);
      console.log(`  units per em: ${unitsPerEm} (固定值)`);
      console.log(`  x-height/em ratio: ${xHeightToEmRatio.toFixed(4)}`);

      // 在 CEP 环境中输出一次性日志到调试日志区域
      // eslint-disable-next-line @typescript-eslint/no-explicit-any, @typescript-eslint/no-unsafe-member-access
      if (typeof window !== 'undefined' && (window as any).__adobe_cep__) {
        const debugLog = document.getElementById('debug-log');
        if (debugLog) {
          // eslint-disable-next-line @typescript-eslint/explicit-function-return-type
          const addLog = (msg: string, type: string = 'info') => {
            const timestamp = new Date().toLocaleTimeString();
            const span = document.createElement('span');
            span.className = `log-${type}`;
            span.textContent = `[${timestamp}] ${msg}\n`;
            debugLog.appendChild(span);
            debugLog.scrollTop = debugLog.scrollHeight;
          };
          
          addLog(`📏 标尺校准数据（固定值，已缓存）:`, 'success');
          addLog(`  x-height: ${xHeight.toFixed(3)} (SVG 单位)`, 'info');
          addLog(`  em size: ${unitsPerEm.toFixed(3)} (SVG 单位)`, 'info');
          addLog(`  x-height/em ratio: ${xHeightToEmRatio.toFixed(4)}`, 'info');
        }
      }

      return this.calibrationDataCache;
    } catch (error) {
      console.error('[CalibrationData] 计算失败:', error);
      this.calibrationDataCache = { xHeight: 450, emSize: 1000, xHeightToEmRatio: 0.45 };
      return this.calibrationDataCache;
    }
  }

  /**
   * 渲染 LaTeX 为 SVG
   * @param latex LaTeX 公式字符串
   * @param fontdata 可选的自定义字体数据（覆盖配置中的 fontdata）
   * @returns SVG 渲染结果
   */
  async renderLatex(latex: string, fontdata?: FontData | null): Promise<SVGResult> {
    // 确保 MathJax 已初始化
    if (!isMathJaxInitialized()) {
      await initMathJax();
    }

    const errors: string[] = [];

    try {
      // 获取 MathJax 实例
      const MathJax = getMathJax();

      // 检查 tex2svg 方法是否存在
      if (!MathJax.tex2svg) {
        console.error('MathJax object:', MathJax);
        console.error('Available methods:', Object.keys(MathJax));
        throw new Error('MathJax.tex2svg 方法不存在。可能的原因：MathJax 未正确初始化或版本不兼容');
      }

      // 尝试在渲染前注入自定义字体数据（如果提供）
      const customFontdata = fontdata ?? this.config.fontdata;
      if (customFontdata) {
        console.log('[FormulaGenerator] 尝试在渲染前注入自定义字体数据');
        try {
          injectFontdata(customFontdata);
        } catch (err) {
          console.warn('[FormulaGenerator] 渲染前注入失败，将在渲染后替换 SVG path', err);
        }
      }

      // 使用 MathJax 渲染 LaTeX
      const svgElement = MathJax.tex2svg(latex, {
        display: this.config.displayMode,
      });

      // 提取 SVG 元素（MathJax 返回的是包含 SVG 的容器）
      const svg = svgElement.querySelector('svg');

      if (!svg) {
        throw new Error('MathJax 渲染失败：未生成 SVG 元素');
      }

      // 如果有自定义字体数据，在渲染后替换 SVG path（后备方案）
      if (customFontdata) {
        console.log('[FormulaGenerator] === 开始字体替换 ===');
        this.injectFontdataToSVG(svg, customFontdata);
        console.log('[FormulaGenerator] === 字体替换完成 ===');
        
        // DEBUG: 验证替换后的 SVG
        const defs = svg.querySelector('defs');
        if (defs) {
          const paths = defs.querySelectorAll('path');
          console.log('[FormulaGenerator] 替换后验证:');
          paths.forEach((p, idx) => {
            const d = p.getAttribute('d');
            console.log(`  [${idx}] ${p.id}: ${d?.substring(0, 30)}...`);
          });
        }
      }

      // 检查 MathJax 错误标记（需求 A2.8）
      // MathJax v4 在遇到错误时会在 SVG 中添加特殊的错误元素
      this.detectMathJaxErrors(svgElement, svg, errors);

      // 如果检测到错误，返回错误结果
      if (errors.length > 0) {
        return {
          svg: document.createElementNS('http://www.w3.org/2000/svg', 'svg'),
          svgString: '',
          width: 0,
          height: 0,
          errors,
        };
      }

      // 确保输出为单个 SVG 元素（需求 A1.4）
      this.ensureSingleSVG(svg);

      // 获取 SVG 尺寸
      const width = this.getSVGWidth(svg);
      const height = this.getSVGHeight(svg);

      // 获取固定的标尺校准数据（只计算一次并缓存）
      const calibrationData = await this.getCalibrationData();
      
      // 添加标尺到 SVG（静默，不输出日志）
      if (calibrationData.xHeight > 0) {
        this.addCalibrationMarker(svg, calibrationData);
      }

      // 获取 SVG 字符串
      const svgString = this.getSVGString(svg);
      
      // DEBUG: 验证序列化后的字符串
      if (customFontdata) {
        console.log('[FormulaGenerator] === SVG 序列化验证 ===');
        console.log(`  SVG 字符串长度: ${svgString.length}`);
        
        // 检查是否包含 minus sign 的 path ID
        if (svgString.includes('2212')) {
          console.log('  ✓ SVG 字符串包含 U+2212 (MINUS SIGN) 引用');
          
          // 尝试提取 minus sign 的 path 数据
          const minusPathMatch = svgString.match(/id="[^"]*2212[^"]*"[^>]*d="([^"]*)"/);
          if (minusPathMatch) {
            console.log(`  Minus path 数据: ${minusPathMatch[1].substring(0, 50)}...`);
          }
        } else {
          console.log('  ✗ SVG 字符串不包含 U+2212 引用');
        }
      }

      return {
        svg,
        svgString,
        width,
        height,
        errors,
        calibrationData,
      };
    } catch (err) {
      // 捕获渲染错误
      const errorMessage = err instanceof Error ? err.message : String(err);
      errors.push(errorMessage);

      // 返回错误结果
      return {
        svg: document.createElementNS('http://www.w3.org/2000/svg', 'svg'),
        svgString: '',
        width: 0,
        height: 0,
        errors,
      };
    }
  }

  /**
   * 将 ASCII 字母转换为 Mathematical Italic Unicode
   * MathJax 对字母使用 Mathematical Italic 范围而不是普通 ASCII
   * 
   * @param ascii ASCII Unicode 值
   * @returns Mathematical Italic Unicode 值，如果不是字母则返回 null
   */
  private getMathematicalItalicUnicode(ascii: number): number | null {
    // Uppercase A-Z: U+0041-U+005A -> U+1D434-U+1D44D
    if (ascii >= 0x41 && ascii <= 0x5A) {
      return 0x1D434 + (ascii - 0x41);
    }
    // Lowercase a-z: U+0061-U+007A -> U+1D44E-U+1D467
    if (ascii >= 0x61 && ascii <= 0x7A) {
      return 0x1D44E + (ascii - 0x61);
    }
    return null;
  }

  /**
   * 根据 Unicode 十六进制值查找 path 元素
   * 
   * @param paths path 元素数组
   * @param unicodeHex Unicode 十六进制字符串（大写）
   * @returns 找到的 path 元素或 null
   */
  private findPathByUnicode(paths: Element[], unicodeHex: string): Element | null {
    // 方法 1: 精确匹配 -HEX$ 格式
    const pattern1 = new RegExp(`-${unicodeHex}$`);
    let targetPath = Array.from(paths).find(p => p.id && pattern1.test(p.id)) ?? null;
    
    // 方法 2: 匹配包含 HEX 的 ID
    if (!targetPath) {
      const pattern2 = new RegExp(`[^0-9A-F]${unicodeHex}(?:[^0-9A-F]|$)`);
      targetPath = Array.from(paths).find(p => p.id && pattern2.test(p.id)) ?? null;
    }
    
    return targetPath;
  }

  /**
   * 注入自定义字体数据到 SVG（后备方案）
   * 通过修改 SVG 的 <defs> 部分来替换 glyph paths
   * 
   * @param svg SVG 元素
   * @param fontdata 自定义字体数据
   */
  private injectFontdataToSVG(svg: SVGElement, fontdata: FontData): void {
    const defs = svg.querySelector('defs');
    if (!defs) {
      console.warn('[FontInjection] 未找到 <defs> 元素，无法注入字体数据');
      return;
    }

    const allPaths = defs.querySelectorAll('path');
    console.log(`[FontInjection] 找到 ${allPaths.length} 个 path 定义`);
    console.log(`[FontInjection] 需要替换 ${Object.keys(fontdata).length} 个字符`);
    
    // DEBUG: 输出所有 path IDs
    console.log('[FontInjection] 可用的 path IDs:');
    allPaths.forEach((p, idx) => {
      console.log(`  [${idx}] id="${p.id}"`);
    });

    let replacedCount = 0;
    const pathsArray = Array.from(allPaths);

    // 遍历 fontdata 中的每个字符
    // 注意: fontdata 的 key 是 Unicode 十进制字符串 (如 "65" 代表 'A')
    for (const [, glyphData] of Object.entries(fontdata)) {
      const unicode = glyphData.c;
      const char = String.fromCodePoint(unicode);
      const unicodeHex = unicode.toString(16).toUpperCase();
      
      // 尝试多种匹配模式
      let targetPath: Element | null = null;
      
      // 方法 1: 尝试匹配普通 Unicode
      targetPath = this.findPathByUnicode(pathsArray, unicodeHex);
      
      // 方法 2: 如果是字母，尝试匹配 Mathematical Italic Unicode
      // MathJax 对字母使用 Mathematical Italic 范围（U+1D400-U+1D7FF）
      if (!targetPath) {
        const mathItalicUnicode = this.getMathematicalItalicUnicode(unicode);
        if (mathItalicUnicode) {
          const mathItalicHex = mathItalicUnicode.toString(16).toUpperCase();
          targetPath = this.findPathByUnicode(pathsArray, mathItalicHex);
          
          if (targetPath) {
            console.log(`[FontInjection] 使用 Mathematical Italic 映射: '${char}' (U+${unicodeHex}) -> U+${mathItalicHex}`);
          }
        }
      }

      // 如果找到目标 path，替换它
      if (targetPath) {
        // 验证新 path 不为空
        if (!glyphData.path || glyphData.path.trim() === '') {
          console.error(`[FontInjection] 字符 '${char}' 的 path 为空！`);
          continue;
        }

        // DEBUG: 记录替换前的 path
        const oldPath = targetPath.getAttribute('d');
        
        targetPath.setAttribute('d', glyphData.path);
        replacedCount++;
        
        // DEBUG: 验证替换是否生效
        const newPath = targetPath.getAttribute('d');
        const isChanged = oldPath !== newPath;
        const isSame = oldPath === glyphData.path;
        
        console.log(`[FontInjection] ✓ 成功替换 '${char}' (U+${unicodeHex})`);
        console.log(`  - Path ID: ${targetPath.id}`);
        console.log(`  - 旧 Path 前50字符: ${oldPath?.substring(0, 50)}...`);
        console.log(`  - 新 Path 前50字符: ${glyphData.path.substring(0, 50)}...`);
        console.log(`  - setAttribute 后读取: ${newPath?.substring(0, 50)}...`);
        console.log(`  - 是否改变: ${isChanged ? 'YES' : 'NO'}`);
        console.log(`  - 原本就相同: ${isSame ? 'YES (字体相同!)' : 'NO'}`);
      }
    }

    console.log(`[FontInjection] 替换完成: ${replacedCount}/${Object.keys(fontdata).length} 个字符`);
    
    if (replacedCount === 0) {
      console.warn('[FontInjection] ⚠️ 没有任何字符被替换！可能的原因:');
      console.warn('  1. SVG 中的 path ID 格式与预期不符');
      console.warn('  2. MathJax 使用了不同的字符编码（如 Mathematical Italic）');
      console.warn('  3. 公式中没有使用 fontdata 中的字符');
    }
  }

  /**
   * 检测 MathJax 错误标记
   * MathJax v4 在遇到解析错误时会在输出中添加错误信息
   * 
   * @param container MathJax 返回的容器元素
   * @param svg SVG 元素
   * @param errors 错误数组（会被修改）
   */
  private detectMathJaxErrors(container: HTMLElement, svg: SVGElement, errors: string[]): void {
    // 获取完整的 HTML 输出用于调试
    const containerHTML = container.outerHTML;
    const svgHTML = svg.outerHTML;
    
    // 方法 1：检查容器中的 .mjx-error 类（MathJax 错误标记）
    const errorElements = container.querySelectorAll('.mjx-error, [data-mjx-error], .mjx-merror');
    if (errorElements.length > 0) {
      errorElements.forEach((errorEl) => {
        const errorText = errorEl.textContent || errorEl.getAttribute('title') || errorEl.getAttribute('data-mjx-error');
        if (errorText) {
          errors.push(`LaTeX 解析错误: ${errorText}`);
        }
      });
      return;
    }

    // 方法 2：检查 SVG 中的红色文本（MathJax 通常用红色显示错误）
    const textElements = svg.querySelectorAll('text, tspan');
    textElements.forEach((textEl) => {
      const text = textEl.textContent || '';
      const fill = textEl.getAttribute('fill') || textEl.getAttribute('style');
      
      // 检查是否为红色文本（MathJax 错误通常是红色）
      const isRedText = fill && (fill.includes('red') || fill.includes('#F00') || fill.includes('rgb(255, 0, 0)'));
      
      // 检查是否包含常见的错误关键词
      const hasErrorKeyword = 
        text.includes('undefined') ||
        text.includes('Missing') ||
        text.includes('Extra') ||
        text.includes('Illegal') ||
        text.includes('Error') ||
        text.toLowerCase().includes('control sequence');
      
      if (isRedText || hasErrorKeyword) {
        errors.push(`LaTeX 解析错误: ${text.trim()}`);
      }
    });

    // 方法 3：检查 SVG 的 title 元素（MathJax 可能在这里放置错误信息）
    const titleElement = svg.querySelector('title');
    if (titleElement) {
      const titleText = titleElement.textContent || '';
      if (
        titleText.toLowerCase().includes('error') ||
        titleText.toLowerCase().includes('undefined') ||
        titleText.toLowerCase().includes('missing')
      ) {
        errors.push(`LaTeX 解析错误: ${titleText}`);
      }
    }

    // 方法 4：检查 SVG 是否包含 merror 元素（MathML 错误元素）
    const merrorElements = svg.querySelectorAll('merror, [data-mjx-error]');
    if (merrorElements.length > 0) {
      merrorElements.forEach((merror) => {
        const errorText = merror.textContent || merror.getAttribute('data-mjx-error');
        if (errorText) {
          errors.push(`LaTeX 解析错误: ${errorText}`);
        }
      });
    }

    // 方法 5：检查 SVG 的 data 属性中是否有错误信息
    const dataError = svg.getAttribute('data-error') || container.getAttribute('data-error');
    if (dataError) {
      errors.push(`LaTeX 解析错误: ${dataError}`);
    }

    // 方法 6：检查 SVG 内容是否包含错误相关的文本
    // MathJax 可能直接将错误文本渲染到 SVG 中
    if (svgHTML.toLowerCase().includes('undefined control sequence') ||
        svgHTML.toLowerCase().includes('missing') ||
        svgHTML.toLowerCase().includes('extra') ||
        containerHTML.toLowerCase().includes('mjx-error')) {
      // 尝试提取错误文本
      const allText = Array.from(textElements)
        .map(el => el.textContent || '')
        .join(' ')
        .trim();
      
      if (allText && allText.length > 0 && !errors.length) {
        errors.push(`LaTeX 解析错误: ${allText}`);
      }
    }
  }

  /**
   * 添加双标记到 SVG（tag + 标尺）
   * 用于 Illustrator 插入时的字号统一缩放
   * 
   * Tag 方块特征（用于可靠识别）：
   * - id="mf_calib_tag"
   * - 尺寸：width=12, height=12（固定尺寸，易于识别）
   * - 颜色：fill=#ff00ff（独特的洋红色）
   * - 透明度：fill-opacity=0.02
   * 
   * 标尺竖线特征（用于测量字号）：
   * - id="mf_calib_xheight"
   * - 尺寸：width=1, height=xHeight（细长竖线，使用固定 x-height）
   * - 颜色：fill=#ff00ff（与 tag 相同）
   * - 透明度：fill-opacity=0.01
   * - data-xheight-to-em-ratio：存储 x-height/em 比例（用于 JSX 计算）
   * 
   * 放置策略：
   * - 放在公式内容的主 <g> 元素内部（与 path 同级）
   * - 确保标尺与公式共享同一 transform/scale 上下文
   * - 放在 viewBox 左下角边缘（避免扩展 bbox）
   * 
   * @param svg SVG 元素
   * @param calibrationData 标尺校准数据（包含 x-height 和 x-height/em 比例）
   */
  private addCalibrationMarker(svg: SVGElement, calibrationData: CalibrationData): void {
    try {
      // 查找公式内容的主 <g> 元素（MathJax 生成的 SVG 结构）
      // 通常是 <svg><defs>...</defs><g>...</g></svg>
      const mainGroup = svg.querySelector('g');
      
      if (!mainGroup) {
        console.warn('[CalibrationMarker] 未找到主 <g> 元素，标尺将添加到 SVG 根节点');
        // 降级方案：添加到 SVG 根节点
        this.addCalibrationMarkerToRoot(svg, calibrationData);
        return;
      }

      // 获取 viewBox 以确定放置位置
      const viewBox = svg.getAttribute('viewBox');
      let x = 0;
      let y = 0;
      
      if (viewBox) {
        const parts = viewBox.split(' ');
        if (parts.length >= 4) {
          x = parseFloat(parts[0]); // viewBox minX
          y = parseFloat(parts[1]) + parseFloat(parts[3]); // viewBox minY + height (左下角)
        }
      }
      
      // 创建 tag 方块（12×12，用于可靠识别）
      const tag = document.createElementNS('http://www.w3.org/2000/svg', 'rect');
      tag.setAttribute('id', 'mf_calib_tag');
      tag.setAttribute('width', '12');
      tag.setAttribute('height', '12');
      tag.setAttribute('x', x.toString());
      tag.setAttribute('y', (y - 12).toString()); // 左下角
      tag.setAttribute('fill', '#ff00ff'); // 独特的洋红色
      tag.setAttribute('fill-opacity', '0.02'); // 非零透明度
      tag.setAttribute('stroke', 'none');

      // 创建标尺竖线（1×xHeight，用于测量字号）
      const ruler = document.createElementNS('http://www.w3.org/2000/svg', 'rect');
      ruler.setAttribute('id', 'mf_calib_xheight');
      ruler.setAttribute('width', '1');
      ruler.setAttribute('height', calibrationData.xHeight.toString());
      ruler.setAttribute('x', (x + 13).toString()); // tag 右侧相邻
      ruler.setAttribute('y', (y - calibrationData.xHeight).toString());
      ruler.setAttribute('fill', '#ff00ff'); // 与 tag 相同颜色
      ruler.setAttribute('fill-opacity', '0.01'); // 非零透明度
      ruler.setAttribute('stroke', 'none');
      // 存储 x-height/em 比例，供 JSX 使用
      ruler.setAttribute('data-xheight-to-em-ratio', calibrationData.xHeightToEmRatio.toString());

      // 添加到主 <g> 元素内部（与公式内容同级，共享 transform）
      mainGroup.appendChild(tag);
      mainGroup.appendChild(ruler);
      
      console.log(`[CalibrationMarker] 标尺已添加到主 <g> 内部`);
      console.log(`  x-height: ${calibrationData.xHeight.toFixed(3)}`);
      console.log(`  x-height/em ratio: ${calibrationData.xHeightToEmRatio.toFixed(4)}`);
    } catch (error) {
      console.error('[CalibrationMarker] 添加标尺失败:', error);
      // 静默失败
    }
  }

  /**
   * 降级方案：将标尺添加到 SVG 根节点
   * 当找不到主 <g> 元素时使用
   */
  private addCalibrationMarkerToRoot(svg: SVGElement, calibrationData: CalibrationData): void {
    try {
      // 获取 viewBox 以确定放置位置
      const viewBox = svg.getAttribute('viewBox');
      let x = 0;
      let y = 0;
      
      if (viewBox) {
        const parts = viewBox.split(' ');
        if (parts.length >= 4) {
          x = parseFloat(parts[0]); // viewBox minX
          y = parseFloat(parts[1]) + parseFloat(parts[3]); // viewBox minY + height (左下角)
        }
      }
      
      // 创建 tag 方块（12×12，用于可靠识别）
      const tag = document.createElementNS('http://www.w3.org/2000/svg', 'rect');
      tag.setAttribute('id', 'mf_calib_tag');
      tag.setAttribute('width', '12');
      tag.setAttribute('height', '12');
      tag.setAttribute('x', x.toString());
      tag.setAttribute('y', (y - 12).toString()); // 左下角
      tag.setAttribute('fill', '#ff00ff'); // 独特的洋红色
      tag.setAttribute('fill-opacity', '0.02'); // 非零透明度
      tag.setAttribute('stroke', 'none');

      // 创建标尺竖线（1×xHeight，用于测量字号）
      const ruler = document.createElementNS('http://www.w3.org/2000/svg', 'rect');
      ruler.setAttribute('id', 'mf_calib_xheight');
      ruler.setAttribute('width', '1');
      ruler.setAttribute('height', calibrationData.xHeight.toString());
      ruler.setAttribute('x', (x + 13).toString()); // tag 右侧相邻
      ruler.setAttribute('y', (y - calibrationData.xHeight).toString());
      ruler.setAttribute('fill', '#ff00ff'); // 与 tag 相同颜色
      ruler.setAttribute('fill-opacity', '0.01'); // 非零透明度
      ruler.setAttribute('stroke', 'none');
      // 存储 x-height/em 比例，供 JSX 使用
      ruler.setAttribute('data-xheight-to-em-ratio', calibrationData.xHeightToEmRatio.toString());

      // 添加到 SVG 根节点（先添加 tag，再添加标尺）
      svg.appendChild(tag);
      svg.appendChild(ruler);
      
      console.log(`[CalibrationMarker] 标尺已添加到 SVG 根节点（降级方案）`);
      console.log(`  x-height: ${calibrationData.xHeight.toFixed(3)}`);
      console.log(`  x-height/em ratio: ${calibrationData.xHeightToEmRatio.toFixed(4)}`);
    } catch {
      // 静默失败
    }
  }

  /**
   * 获取 MathJax 版本信息
   */
  getMathJaxVersion(): string {
    return getMathJaxVersion();
  }

  /**
   * 导出 SVG 文件
   * @param svg SVG 元素
   * @param filename 文件名
   */
  exportSVG(svg: SVGElement, filename: string): void {
    const svgString = this.getSVGString(svg);
    const blob = new Blob([svgString], { type: 'image/svg+xml' });
    const url = URL.createObjectURL(blob);

    const link = document.createElement('a');
    link.href = url;
    link.download = filename;
    link.click();

    // 清理 URL
    URL.revokeObjectURL(url);
  }

  /**
   * 确保输出为单个 SVG 元素
   * 处理多行公式，避免生成多个 SVG 片段（需求 A1.4）
   */
  private ensureSingleSVG(svg: SVGElement): void {
    // 检查是否为单个 SVG 元素
    const svgCount = svg.ownerDocument?.querySelectorAll('svg').length ?? 1;
    if (svgCount > 1) {
      console.warn('检测到多个 SVG 元素，已合并为单个 SVG');
    }

    // 验证 SVG 包含必要的结构元素（需求 A4.10）
    const hasStructure =
      svg.querySelector('g') !== null ||
      svg.querySelector('path') !== null ||
      svg.querySelector('use') !== null ||
      svg.querySelector('defs') !== null;

    if (!hasStructure) {
      console.warn('SVG 缺少必要的结构元素（g, path, use, defs）');
    }
  }

  /**
   * 获取 SVG 宽度
   */
  private getSVGWidth(svg: SVGElement): number {
    const width = svg.getAttribute('width');
    if (width) {
      return parseFloat(width);
    }

    const viewBox = svg.getAttribute('viewBox');
    if (viewBox) {
      const parts = viewBox.split(' ');
      if (parts.length >= 3) {
        return parseFloat(parts[2]);
      }
    }

    return svg.getBoundingClientRect().width;
  }

  /**
   * 获取 SVG 高度
   */
  private getSVGHeight(svg: SVGElement): number {
    const height = svg.getAttribute('height');
    if (height) {
      return parseFloat(height);
    }

    const viewBox = svg.getAttribute('viewBox');
    if (viewBox) {
      const parts = viewBox.split(' ');
      if (parts.length >= 4) {
        return parseFloat(parts[3]);
      }
    }

    return svg.getBoundingClientRect().height;
  }

  /**
   * 获取 SVG 字符串
   */
  private getSVGString(svg: SVGElement): string {
    const serializer = new XMLSerializer();
    return serializer.serializeToString(svg);
  }
}
