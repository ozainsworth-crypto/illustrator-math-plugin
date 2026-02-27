/**
 * MathJax v4 加载器
 * 负责初始化 MathJax 并配置 SVG 输出处理器
 *
 * 使用 MathJax v4.1.0 的 tex-svg 组合包（本地 npm 依赖）
 * 禁止依赖任何远程渲染 API 或 CDN
 */

// MathJax 版本信息（锁定版本 - 需求 A1.1）
export const MATHJAX_VERSION = '4.1.0';

// MathJax 全局对象类型定义
interface MathJaxGlobal {
  tex2svg: (latex: string, options?: { display?: boolean }) => HTMLElement;
  tex2svgPromise?: (latex: string, options?: { display?: boolean }) => Promise<HTMLElement>;
  startup?: {
    promise?: Promise<void>;
    ready?: () => void;
  };
  version?: string;
  config?: {
    svg?: {
      fontCache?: string;
      [key: string]: unknown;
    };
    [key: string]: unknown;
  };
  [key: string]: unknown;
}

declare global {
  interface Window {
    MathJax: MathJaxGlobal;
  }
}

// MathJax 初始化状态
let isInitialized = false;
let initPromise: Promise<void> | null = null;

/**
 * 初始化 MathJax
 * 使用本地 npm 依赖的 MathJax v4（ES 模块动态导入）
 */
export async function initMathJax(): Promise<void> {
  if (isInitialized) {
    return; // 已初始化
  }

  if (initPromise) {
    return initPromise; // 正在初始化，返回现有 Promise
  }

  initPromise = (async (): Promise<void> => {
    try {
      // 使用一个标志来跟踪 ready 回调是否被调用
      let readyCalled = false;

      // 配置 MathJax（必须在加载模块前设置）
      window.MathJax = {
        tex: {
          inlineMath: [['$', '$']],
          displayMath: [['$$', '$$']],
          packages: { '[+]': ['ams', 'base', 'newcommand', 'configmacros'] },
        },
        svg: {
          fontCache: 'local',
        },
        options: {
          // 启用错误显示（MathJax v4）
          renderActions: {
            addMenu: [], // 禁用菜单
          },
        },
        startup: {
          ready: () => {
            readyCalled = true;
            
            // 调用默认的 ready 函数（如果存在）
            // @ts-expect-error - MathJax 内部 API
            if (window.MathJax.startup.defaultReady) {
              // @ts-expect-error - MathJax 内部 API
              // eslint-disable-next-line @typescript-eslint/no-unsafe-call
              window.MathJax.startup.defaultReady();
            }
          },
        },
      } as unknown as MathJaxGlobal;

      // 使用 ES 模块动态导入（Vite 原生支持）
      // 这确保使用本地 npm 依赖，不依赖 CDN
      await import('mathjax/tex-svg.js');

      // 等待 ready 回调被调用
      let attempts = 0;
      while (!readyCalled && attempts < 50) {
        await new Promise((r) => setTimeout(r, 100));
        attempts++;
      }

      if (!readyCalled) {
        console.warn('MathJax ready 回调未被调用，但继续初始化');
      }

      // 额外等待确保完全初始化
      await new Promise((r) => setTimeout(r, 200));

      if (!window.MathJax.tex2svg) {
        throw new Error('tex2svg 方法不存在');
      }

      isInitialized = true;
    } catch (error) {
      console.error('MathJax 初始化失败:', error);
      const err = error instanceof Error ? error : new Error(String(error));
      throw err;
    }
  })();

  return initPromise;
}

/**
 * 获取 MathJax 版本
 */
export function getMathJaxVersion(): string {
  return MATHJAX_VERSION;
}

/**
 * 检查 MathJax 是否已初始化
 */
export function isMathJaxInitialized(): boolean {
  return isInitialized;
}

/**
 * 获取 MathJax 全局对象
 */
export function getMathJax(): MathJaxGlobal {
  if (!isInitialized || !window.MathJax) {
    throw new Error('MathJax 未初始化，请先调用 initMathJax()');
  }
  return window.MathJax;
}

/**
 * 注入自定义字体数据到 MathJax
 * 必须在渲染前调用,以便 MathJax 使用自定义字体进行布局计算
 * 
 * @param fontdata 自定义字体数据
 */
export function injectFontdata(fontdata: Record<string, { c: number; w: number; h: number; d: number; path: string }>): void {
  if (!isInitialized || !window.MathJax) {
    throw new Error('MathJax 未初始化，请先调用 initMathJax()');
  }

  try {
    // 访问 MathJax 内部的字体数据结构
    // MathJax v4 使用 CommonHTML/SVG 输出,字体数据存储在特定路径
    // eslint-disable-next-line @typescript-eslint/no-unsafe-assignment, @typescript-eslint/no-explicit-any
    const mjx = window.MathJax as any;
    
    // 尝试访问 SVG 字体数据
    // eslint-disable-next-line @typescript-eslint/no-unsafe-member-access
    if (mjx.svgData && mjx.svgData[0] && mjx.svgData[0].fonts) {
      // eslint-disable-next-line @typescript-eslint/no-unsafe-assignment, @typescript-eslint/no-unsafe-member-access
      const fonts = mjx.svgData[0].fonts;
      
      // 查找 MathJax 字体对象
      for (const fontName in fonts) {
        // eslint-disable-next-line @typescript-eslint/no-unsafe-assignment, @typescript-eslint/no-unsafe-member-access
        const font = fonts[fontName];
        // eslint-disable-next-line @typescript-eslint/no-unsafe-member-access
        if (font && font.data) {
          console.log(`[MathJax FontInjection] 找到字体: ${fontName}`);
          
          // 注入自定义字形数据
          for (const [char, glyphData] of Object.entries(fontdata)) {
            const unicode = glyphData.c;
            const unicodeHex = unicode.toString(16).toUpperCase();
            
            // 将字形数据注入到 MathJax 字体对象
            // eslint-disable-next-line @typescript-eslint/no-unsafe-member-access
            if (!font.data[unicode]) {
              // eslint-disable-next-line @typescript-eslint/no-unsafe-member-access
              font.data[unicode] = {};
            }
            
            // eslint-disable-next-line @typescript-eslint/no-unsafe-assignment, @typescript-eslint/no-unsafe-member-access
            font.data[unicode] = {
              // eslint-disable-next-line @typescript-eslint/no-unsafe-member-access
              ...font.data[unicode],
              p: glyphData.path,  // SVG path
              w: glyphData.w,     // width
              h: glyphData.h,     // height  
              d: glyphData.d,     // depth
            };
            
            console.log(`[MathJax FontInjection] 注入字符 '${char}' (U+${unicodeHex})`);
          }
        }
      }
      
      console.log(`[MathJax FontInjection] 成功注入 ${Object.keys(fontdata).length} 个字符`);
    } else {
      console.warn('[MathJax FontInjection] 无法访问 MathJax 字体数据结构');
    }
  } catch (error) {
    console.error('[MathJax FontInjection] 注入失败:', error);
  }
}
