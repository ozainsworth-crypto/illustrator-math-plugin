/**
 * FontPackLoader - 字体包加载器（单用户字体包模型）
 * 
 * 负责检测、加载和应用单一用户字体包到 MathJax
 * 
 * 用户字体包模型：
 * - 唯一性：固定目录 /fonts/user-font-pack/，固定 manifest.id = "user-font-pack"
 * - 字体选项：仅 2 个选项（"自主字体" 和 "默认字体"）
 * - 默认行为：启动时自动检测 user-font-pack，如果存在则自动使用
 * 
 * 集成策略：
 * - 基于 Phase 2 已完成的主工具（不重写输入/格式检测/歧义/转译链路）
 * - 集成点：WebFormulaGenerator.renderLatex() 方法
 * - 最小侵入改动：在 MathJax.tex2svg() 调用前注入 fontdata
 */

/**
 * 字体 glyph 数据接口
 */
export interface FontGlyphData {
  c: number; // codepoint
  w: number; // width
  h: number; // height
  d: number; // depth
  path: string; // SVG path
}

/**
 * 字体数据接口
 */
export interface FontData {
  [char: string]: FontGlyphData;
}

/**
 * 字体包清单接口
 */
export interface FontPackManifest {
  id?: string; // 可选的字体包 ID
  name: string;
  fontName?: string; // 可选的字体名称（向后兼容）
  version: string;
  family: string;
  format: string;
  coverage: {
    uppercase: string;
    lowercase: string;
    digits: string;
  };
  failures: string[];
  failedGlyphs?: string[]; // 可选的失败字形列表（向后兼容）
  createdAt: string;
  fontdataFile: string;
  contentHash?: string; // 可选的内容哈希
}

/**
 * 字体包接口
 */
export interface FontPack {
  id: string;
  manifest: FontPackManifest;
  fontdata: FontData; // MathJax fontdata 对象
  path: string;
}

/**
 * 用户字体包状态接口
 */
export interface UserFontPackStatus {
  exists: boolean;
  active: boolean;
  name: string | null;
  updatedAt: string | null;
  failureCount: number;
}

/**
 * 字体包加载器类（单用户字体包模型）
 */
export class FontPackLoader {
  private userFontPack: FontPack | null = null;
  private isUserFontActive: boolean = false;
  private readonly USER_FONT_PACK_ID = 'user-font-pack';
  private readonly USER_FONT_PACK_PATH = './fonts/user-font-pack';
  
  // 轮询机制相关
  private pollingIntervalId: number | null = null;
  private lastManifestTime: string | null = null;
  private readonly DEFAULT_POLLING_INTERVAL = 2000; // 2 秒
  private onFontPackUpdatedCallback: (() => void) | null = null;

  /**
   * 检测并加载用户字体包（如果存在）
   * @returns Promise<FontPack | null> 用户字体包（如果存在）
   */
  async detectAndLoadUserFontPack(): Promise<FontPack | null> {
    try {
      const packPath = this.USER_FONT_PACK_PATH;
      console.log(`[FontPackLoader] 尝试加载用户字体包，路径: ${packPath}`);

      // 1. 尝试加载 manifest.json（使用 cache: 'no-store' 完全绕过缓存）
      // 使用时间戳 + 随机数 + 纳秒级时间戳三重参数强制刷新缓存
      const timestamp = Date.now();
      const random = Math.random().toString(36).substring(7);
      const nanoTime = performance.now().toString().replace('.', '');
      const manifestUrl = `${packPath}/manifest.json?_t=${timestamp}&_r=${random}&_n=${nanoTime}`;
      console.log(`[FontPackLoader] 请求 manifest URL: ${manifestUrl}`);
      
      const manifestResponse = await fetch(manifestUrl, {
        cache: 'no-store', // 完全不使用缓存（比 'reload' 更强）
        headers: {
          'Cache-Control': 'no-cache, no-store, must-revalidate, max-age=0',
          'Pragma': 'no-cache',
          'Expires': '0'
        }
      });
      
      console.log(`[FontPackLoader] manifest 响应状态: ${manifestResponse.status}`);
      
      if (!manifestResponse.ok) {
        console.log('[FontPackLoader] 未检测到用户字体包');
        return null;
      }
      const manifestData: unknown = await manifestResponse.json();

      // 2. 验证 manifest 格式
      if (!this.validateManifest(manifestData)) {
        console.error('[FontPackLoader] 用户字体包 manifest 格式无效');
        return null;
      }
      
      const manifest = manifestData;

      // 3. 加载 fontdata.js（使用 cache: 'no-store' 完全绕过缓存）
      // 使用相同的时间戳、随机数和纳秒级时间戳参数强制刷新缓存
      const fontdataResponse = await fetch(`${packPath}/${manifest.fontdataFile}?_t=${timestamp}&_r=${random}&_n=${nanoTime}`, {
        cache: 'no-store', // 完全不使用缓存（比 'reload' 更强）
        headers: {
          'Cache-Control': 'no-cache, no-store, must-revalidate, max-age=0',
          'Pragma': 'no-cache',
          'Expires': '0'
        }
      });
      if (!fontdataResponse.ok) {
        console.error('[FontPackLoader] 无法加载用户字体包 fontdata');
        return null;
      }
      const fontdataText = await fontdataResponse.text();
      
      // Extract the fontdata object from the ES6 module
      // The file exports: export const fontdata = { ... };
      const fontdataMatch = fontdataText.match(/export\s+const\s+fontdata\s*=\s*(\{[\s\S]*\});?\s*$/);
      if (!fontdataMatch) {
        console.error('[FontPackLoader] 用户字体包 fontdata 格式无效');
        return null;
      }
      
      // Parse the fontdata object using Function constructor (safer than eval)
      const fontdataObjectStr = fontdataMatch[1];
      // eslint-disable-next-line @typescript-eslint/no-implied-eval, @typescript-eslint/no-unsafe-call
      const fontdata = new Function(`return ${fontdataObjectStr}`)() as FontData;

      // 4. 验证 fontdata 格式
      if (!this.validateFontdata(fontdata)) {
        console.error('[FontPackLoader] 用户字体包 fontdata 格式无效');
        return null;
      }

      // 5. 创建 FontPack 对象
      this.userFontPack = {
        id: this.USER_FONT_PACK_ID,
        manifest,
        fontdata,
        path: packPath,
      };

      // 详细日志：验证字体包加载
      console.log(`[FontPackLoader] ✅ 成功加载用户字体包`);
      console.log(`  📦 名称: ${manifest.name} (${manifest.family})`);
      console.log(`  🔑 buildId: ${(manifest as any).buildId || 'N/A'}`);
      console.log(`  📅 创建时间: ${manifest.createdAt}`);
      console.log(`  🔐 内容哈希: ${manifest.contentHash || 'N/A'}`);
      console.log(`  📊 字符数量: ${Object.keys(fontdata).length}`);
      console.log(`  ❌ 失败字符: ${manifest.failures.length}`);
      
      return this.userFontPack;
    } catch (error) {
      console.error('[FontPackLoader] 加载用户字体包失败:', error);
      return null;
    }
  }

  /**
   * 应用用户字体包到 MathJax（注入 fontdata）
   * @returns boolean 是否成功应用
   */
  applyUserFontPack(): boolean {
    if (!this.userFontPack) {
      console.warn('[FontPackLoader] 无法应用用户字体包：字体包未加载');
      return false;
    }

    this.isUserFontActive = true;
    console.log('[FontPackLoader] 已应用用户字体包');
    return true;
  }

  /**
   * 恢复默认字体
   */
  restoreDefaultFont(): void {
    this.isUserFontActive = false;
    console.log('[FontPackLoader] 已恢复默认字体');
  }

  /**
   * 检查用户字体包是否存在
   * @returns boolean
   */
  hasUserFontPack(): boolean {
    return this.userFontPack !== null;
  }

  /**
   * 获取用户字体包状态
   * @returns UserFontPackStatus
   */
  getUserFontPackStatus(): UserFontPackStatus {
    if (!this.userFontPack) {
      return {
        exists: false,
        active: false,
        name: null,
        updatedAt: null,
        failureCount: 0,
      };
    }

    return {
      exists: true,
      active: this.isUserFontActive,
      name: `${this.userFontPack.manifest.name} (${this.userFontPack.manifest.family})`,
      updatedAt: this.userFontPack.manifest.createdAt,
      failureCount: this.userFontPack.manifest.failures.length,
    };
  }

  /**
   * 获取当前字体包
   * @returns FontPack | null
   */
  getCurrentFontPack(): FontPack | null {
    return this.isUserFontActive ? this.userFontPack : null;
  }

  /**
   * 获取当前 fontdata
   * @returns FontData | null
   */
  getCurrentFontdata(): FontData | null {
    return this.isUserFontActive && this.userFontPack ? this.userFontPack.fontdata : null;
  }

  /**
   * 启动轮询机制，检测 manifest.json 更新
   * @param intervalMs 轮询间隔（毫秒），默认 2000ms
   */
  startPolling(intervalMs: number = this.DEFAULT_POLLING_INTERVAL): void {
    // 如果已经在轮询，先停止
    if (this.pollingIntervalId !== null) {
      this.stopPolling();
    }

    console.log(`[FontPackLoader] 启动轮询机制，间隔 ${intervalMs}ms`);

    // 记录当前 manifest 哈希值（优先使用 buildId，其次使用 contentHash，最后使用 createdAt）
    if (this.userFontPack) {
      this.lastManifestTime = (this.userFontPack.manifest as any).buildId || this.userFontPack.manifest.contentHash || this.userFontPack.manifest.createdAt;
      console.log(`[FontPackLoader] 初始哈希值: ${this.lastManifestTime}`);
    }

    // 启动定时器
    this.pollingIntervalId = window.setInterval(() => {
      void this.checkForUpdates();
    }, intervalMs);
  }

  /**
   * 停止轮询机制
   */
  stopPolling(): void {
    if (this.pollingIntervalId !== null) {
      window.clearInterval(this.pollingIntervalId);
      this.pollingIntervalId = null;
      console.log('[FontPackLoader] 已停止轮询机制');
    }
  }

  /**
   * 检查 manifest.json 是否有更新
   */
  private async checkForUpdates(): Promise<void> {
    try {
      const packPath = this.USER_FONT_PACK_PATH;

      // 1. 尝试加载 manifest.json（使用 cache: 'no-store' 完全绕过缓存）
      // 使用时间戳 + 随机数 + 纳秒级时间戳三重参数强制刷新缓存
      const timestamp = Date.now();
      const random = Math.random().toString(36).substring(7);
      const nanoTime = performance.now().toString().replace('.', '');
      const manifestResponse = await fetch(`${packPath}/manifest.json?_t=${timestamp}&_r=${random}&_n=${nanoTime}`, {
        cache: 'no-store', // 完全不使用缓存（比 'reload' 更强）
        headers: {
          'Cache-Control': 'no-cache, no-store, must-revalidate, max-age=0',
          'Pragma': 'no-cache',
          'Expires': '0'
        }
      });

      if (!manifestResponse.ok) {
        // manifest 不存在，可能用户删除了字体包
        if (this.userFontPack !== null) {
          console.log('[FontPackLoader] 检测到用户字体包已删除');
          this.userFontPack = null;
          this.isUserFontActive = false;
          this.lastManifestTime = null;
          
          // 触发更新回调
          if (this.onFontPackUpdatedCallback) {
            this.onFontPackUpdatedCallback();
          }
        }
        return;
      }

      const manifestData: unknown = await manifestResponse.json();

      // 2. 验证 manifest 格式
      if (!this.validateManifest(manifestData)) {
        console.error('[FontPackLoader] 轮询检测到无效的 manifest 格式');
        return;
      }

      const manifest = manifestData;

      // 3. 检查是否有更新（优先使用 buildId，其次使用 contentHash，最后使用 createdAt）
      const currentHash = (manifest as any).buildId || manifest.contentHash || manifest.createdAt;
      const lastHash = (this.userFontPack?.manifest as any)?.buildId || this.userFontPack?.manifest.contentHash || this.lastManifestTime;
      
      console.log(`[FontPackLoader] 轮询检查更新:`);
      console.log(`  当前哈希: ${currentHash}`);
      console.log(`  上次哈希: ${lastHash}`);
      
      if (lastHash === currentHash) {
        // 没有变化，跳过
        return;
      }

      console.log('[FontPackLoader] 🔄 检测到字体包更新，重新加载...');
      console.log(`  旧: ${lastHash}`);
      console.log(`  新: ${currentHash}`);

      // 4. 重新加载字体包
      const newFontPack = await this.detectAndLoadUserFontPack();

      if (newFontPack) {
        // 更新成功，记录新的哈希值
        this.lastManifestTime = newFontPack.manifest.contentHash || newFontPack.manifest.createdAt;

        // 如果之前用户字体是激活状态，保持激活
        if (this.isUserFontActive) {
          this.applyUserFontPack();
          console.log('[FontPackLoader] ✅ 字体包更新完成，已重新应用');
        } else {
          console.log('[FontPackLoader] ✅ 字体包更新完成，等待用户激活');
        }

        // 触发更新回调
        if (this.onFontPackUpdatedCallback) {
          console.log('[FontPackLoader] 触发更新回调');
          this.onFontPackUpdatedCallback();
        }
      } else {
        console.error('[FontPackLoader] ❌ 字体包重新加载失败');
      }
    } catch (error) {
      // 轮询过程中的错误不应该中断轮询
      console.error('[FontPackLoader] 轮询检查更新失败:', error);
    }
  }

  /**
   * 设置字体包更新回调
   * @param callback 回调函数
   */
  onFontPackUpdated(callback: () => void): void {
    this.onFontPackUpdatedCallback = callback;
  }

  /**
   * 验证 manifest 格式
   * @param manifest 
   * @returns boolean
   */
  private validateManifest(manifest: unknown): manifest is FontPackManifest {
    if (!manifest || typeof manifest !== 'object') {
      return false;
    }
    
    const m = manifest as Record<string, unknown>;
    
    return (
      typeof m.name === 'string' &&
      typeof m.version === 'string' &&
      typeof m.family === 'string' &&
      typeof m.format === 'string' &&
      m.coverage !== null &&
      typeof m.coverage === 'object' &&
      typeof (m.coverage as Record<string, unknown>).uppercase === 'string' &&
      typeof (m.coverage as Record<string, unknown>).lowercase === 'string' &&
      typeof (m.coverage as Record<string, unknown>).digits === 'string' &&
      Array.isArray(m.failures) &&
      typeof m.createdAt === 'string' &&
      typeof m.fontdataFile === 'string'
    );
  }

  /**
   * 验证 fontdata 格式
   * @param fontdata 
   * @returns boolean
   */
  private validateFontdata(fontdata: unknown): fontdata is FontData {
    if (!fontdata || typeof fontdata !== 'object') {
      return false;
    }

    // 检查至少有一个字符的 fontdata
    const keys = Object.keys(fontdata);
    if (keys.length === 0) {
      return false;
    }

    // 检查第一个字符的 fontdata 格式
    const firstChar = (fontdata as Record<string, unknown>)[keys[0]];
    if (!firstChar || typeof firstChar !== 'object') {
      return false;
    }
    
    const glyph = firstChar as Record<string, unknown>;
    return (
      typeof glyph.c === 'number' &&
      typeof glyph.w === 'number' &&
      typeof glyph.h === 'number' &&
      typeof glyph.d === 'number' &&
      typeof glyph.path === 'string'
    );
  }
}
