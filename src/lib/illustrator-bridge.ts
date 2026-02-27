/**
 * Illustrator Bridge
 * 
 * CEP 环境下与 Illustrator 主机通信的桥接类
 * 负责将 SVG 插入到 Illustrator 文档中
 */

/* eslint-disable @typescript-eslint/no-explicit-any */
/* eslint-disable @typescript-eslint/no-unsafe-assignment */
/* eslint-disable @typescript-eslint/no-unsafe-call */
/* eslint-disable @typescript-eslint/no-unsafe-member-access */

// CEP CSInterface 类型声明
declare global {
  interface Window {
    __adobe_cep__?: {
      evalScript: (script: string, callback?: (result: string) => void) => void;
    };
    CSInterface?: any;
  }
}

export interface InsertResult {
  success: boolean;
  message: string;
  markerFound?: boolean;
  tempFilePath?: string;
}

export interface DocumentCheckResult {
  hasDocument: boolean;
}

export class IllustratorBridge {
  private isCEPEnvironment: boolean;
  private csInterface: any;

  constructor() {
    // 检测是否在 CEP 环境中
    // 优先使用 CSInterface，回退到 __adobe_cep__
    this.isCEPEnvironment = typeof window !== 'undefined' && 
      (!!window.CSInterface || !!window.__adobe_cep__);
    
    if (this.isCEPEnvironment) {
      // 创建 CSInterface 实例
      if (window.CSInterface) {
        this.csInterface = new window.CSInterface();
        console.log('[IllustratorBridge] CEP 环境已检测（使用 CSInterface）');
      } else {
        console.log('[IllustratorBridge] CEP 环境已检测（使用 __adobe_cep__）');
      }
    } else {
      console.log('[IllustratorBridge] 非 CEP 环境（Web 模式）');
    }
  }
  
  /**
   * 执行 ExtendScript 脚本
   */
  private evalScript(script: string): Promise<string> {
    console.log('[IllustratorBridge] 执行脚本:', script.substring(0, 100) + '...');
    
    return new Promise((resolve, reject) => {
      if (this.csInterface) {
        // 使用 CSInterface
        this.csInterface.evalScript(script, (result: string) => {
          console.log('[IllustratorBridge] CSInterface 返回结果:', result);
          resolve(result);
        });
      } else if (window.__adobe_cep__) {
        // 回退到 __adobe_cep__
        window.__adobe_cep__.evalScript(script, (result: string) => {
          console.log('[IllustratorBridge] __adobe_cep__ 返回结果:', result);
          resolve(result);
        });
      } else {
        const error = 'CEP 环境不可用';
        console.error('[IllustratorBridge]', error);
        reject(new Error(error));
      }
    });
  }
  
  /**
   * 调试：获取文档状态
   */
  public async debugDocumentStatus(): Promise<string> {
    if (!this.isCEPEnvironment) {
      return 'DEBUG: 非 CEP 环境';
    }

    try {
      // 内联 ExtendScript 代码，不使用 JSON.stringify
      const script = `
        (function() {
          try {
            var docCount = app.documents.length;
            var activeName = docCount > 0 ? app.activeDocument.name : "none";
            return "DEBUG docs=" + docCount + ", active=" + activeName;
          } catch (error) {
            return "DEBUG ERROR: " + error.message;
          }
        })();
      `;
      const result = await this.evalScript(script);
      console.log('[IllustratorBridge] 调试结果:', result);
      return result;
    } catch (error) {
      const errorMsg = error instanceof Error ? error.message : String(error);
      console.error('[IllustratorBridge] 调试失败:', errorMsg);
      return 'DEBUG ERROR: ' + errorMsg;
    }
  }

  /**
   * 检查是否在 CEP 环境中
   */
  public isInCEP(): boolean {
    return this.isCEPEnvironment;
  }

  /**
   * 检查是否有打开的文档
   */
  public async checkDocument(): Promise<DocumentCheckResult> {
    if (!this.isCEPEnvironment) {
      console.log('[IllustratorBridge] 非 CEP 环境，跳过文档检查');
      return { hasDocument: false };
    }

    try {
      console.log('[IllustratorBridge] 开始检查文档...');
      
      // 内联 ExtendScript 代码，不使用 JSON.stringify，改用字符串拼接
      const script = `
        (function() {
          try {
            // 第一次检测
            var docCount = app.documents.length;
            
            if (docCount === 0) {
              // 等待 150ms 后重试
              $.sleep(150);
              docCount = app.documents.length;
              
              if (docCount === 0) {
                return '{"hasDocument":false,"error":"ERR:NO_DOC docs=0","debug":"检测到 0 个文档（已重试）"}';
              }
            }
            
            // 有文档，返回成功
            var activeName = app.activeDocument.name;
            // 转义文档名中的特殊字符
            activeName = activeName.replace(/\\\\/g, "\\\\\\\\").replace(/"/g, '\\\\"');
            return '{"hasDocument":true,"docCount":' + docCount + ',"activeName":"' + activeName + '","debug":"检测到 ' + docCount + ' 个文档，当前文档: ' + activeName + '"}';
            
          } catch (error) {
            var errorMsg = error.message.replace(/\\\\/g, "\\\\\\\\").replace(/"/g, '\\\\"');
            return '{"hasDocument":false,"error":"ERR:EXCEPTION ' + errorMsg + '","debug":"文档检测异常: ' + errorMsg + '"}';
          }
        })();
      `;
      
      const result = await this.evalScript(script);
      
      console.log('[IllustratorBridge] checkDocument 原始返回:', result);
      console.log('[IllustratorBridge] 返回值类型:', typeof result);
      console.log('[IllustratorBridge] 返回值长度:', result ? result.length : 0);
      
      if (!result || result.trim() === '') {
        console.error('[IllustratorBridge] evalScript 返回空结果！');
        return { hasDocument: false };
      }
      
      // 尝试解析 JSON
      let parsed: DocumentCheckResult & { error?: string; debug?: string };
      try {
        parsed = JSON.parse(result);
      } catch (parseError) {
        console.error('[IllustratorBridge] JSON 解析失败:', parseError);
        console.error('[IllustratorBridge] 原始返回值:', result);
        console.error('[IllustratorBridge] 返回值前 100 个字符:', result.substring(0, 100));
        
        // 如果解析失败，返回默认值并记录详细错误
        return { 
          hasDocument: false
        };
      }
      
      console.log('[IllustratorBridge] 文档检查结果:', parsed);
      
      // 如果有调试信息，显示在控制台
      if (parsed.debug) {
        console.log('[IllustratorBridge] 调试信息:', parsed.debug);
      }
      
      // 如果有错误信息，显示在控制台
      if (parsed.error) {
        console.error('[IllustratorBridge] 错误信息:', parsed.error);
      }
      
      return parsed;
    } catch (error) {
      console.error('[IllustratorBridge] 检查文档失败:', error);
      return { hasDocument: false };
    }
  }

  /**
   * 插入 SVG 到 Illustrator 文档
   * 
   * @param svgString - SVG 字符串
   * @param defaultWidth - 默认宽度（pt），默认 200
   * @returns 插入结果
   */
  public async insertSVG(svgString: string, defaultWidth: number = 200): Promise<InsertResult> {
    if (!this.isCEPEnvironment) {
      return {
        success: false,
        message: '当前不在 CEP 环境中，无法插入到 Illustrator',
      };
    }

    try {
      // 1. 检查是否有打开的文档
      const docCheck = await this.checkDocument();
      if (!docCheck.hasDocument) {
        return {
          success: false,
          message: '请先打开或创建一个 Illustrator 文档',
        };
      }

      // 2. 创建临时 SVG 文件
      console.log('[IllustratorBridge] 开始创建临时 SVG 文件...');
      const tempFilePath = await this.createTempSVGFile(svgString);
      console.log('[IllustratorBridge] 临时文件路径:', tempFilePath);
      
      // 3. 验证文件是否存在
      const fileExists = await this.verifyFileExists(tempFilePath);
      console.log('[IllustratorBridge] 文件存在验证:', fileExists);
      
      if (!fileExists) {
        return {
          success: false,
          message: `临时文件创建失败或不存在: ${tempFilePath}`,
        };
      }
      
      // 4. 调用 ExtendScript 插入 SVG
      console.log('[IllustratorBridge] 开始插入 SVG...');
      const insertResult = await this.callInsertSVG(tempFilePath, defaultWidth);
      
      // 5. 删除临时文件
      console.log('[IllustratorBridge] 开始删除临时文件...');
      await this.deleteTempFile(tempFilePath);
      
      return insertResult;
    } catch (error) {
      const errorMsg = error instanceof Error ? error.message : String(error);
      console.error('[IllustratorBridge] insertSVG 异常:', errorMsg);
      return {
        success: false,
        message: `插入失败: ${errorMsg}`,
      };
    }
  }

  /**
   * 创建临时 SVG 文件
   * 
   * @param svgString - SVG 字符串
   * @returns 临时文件的绝对路径
   */
  private async createTempSVGFile(svgString: string): Promise<string> {
    const timestamp = Date.now();
    const filename = `math-formula-${timestamp}.svg`;
    
    // 转义 SVG 字符串中的特殊字符
    const escapedSvg = svgString
      .replace(/\\/g, '\\\\')
      .replace(/"/g, '\\"')
      .replace(/\n/g, '\\n')
      .replace(/\r/g, '\\r');
    
    // 使用 ExtendScript 创建临时文件，不使用 JSON.stringify
    const script = `
      (function() {
        try {
          var tempFolder = Folder.temp;
          var tempFile = new File(tempFolder.fsName + "/${filename}");
          
          tempFile.encoding = "UTF-8";
          tempFile.open("w");
          tempFile.write("${escapedSvg}");
          tempFile.close();
          
          var path = tempFile.fsName.replace(/\\\\/g, "/");
          return '{"success":true,"path":"' + path + '"}';
        } catch (error) {
          var errorMsg = error.message.replace(/\\\\/g, "\\\\\\\\").replace(/"/g, '\\\\"');
          return '{"success":false,"error":"' + errorMsg + '"}';
        }
      })();
    `;
    
    try {
      const result = await this.evalScript(script);
      const parsed = JSON.parse(result) as { success: boolean; path?: string; error?: string };
      
      if (parsed.success && parsed.path) {
        console.log('[IllustratorBridge] 临时文件已创建:', parsed.path);
        return parsed.path;
      } else {
        throw new Error(parsed.error || '创建临时文件失败');
      }
    } catch {
      throw new Error('解析临时文件创建结果失败');
    }
  }

  /**
   * 调用 ExtendScript 插入 SVG
   * 
   * @param svgPath - SVG 文件的绝对路径
   * @param defaultWidth - 默认宽度（pt）
   * @returns 插入结果
   */
  private async callInsertSVG(svgPath: string, defaultWidth: number): Promise<InsertResult> {
    // 转义路径中的反斜杠（Windows）
    const escapedPath = svgPath.replace(/\\/g, '/');
    
    console.log('[IllustratorBridge] callInsertSVG 参数:', { svgPath, escapedPath, defaultWidth });
    
    // 内联 ExtendScript 代码，不使用 JSON.stringify
    const script = `
      (function() {
        try {
          // 检查是否有打开的文档
          if (app.documents.length === 0) {
            return '{"success":false,"message":"请先打开或创建一个 Illustrator 文档","error":"ERR:NO_DOC docs=0"}';
          }
          
          var doc = app.activeDocument;
          
          // 验证文件路径
          var file = new File("${escapedPath}");
          if (!file.exists) {
            return '{"success":false,"message":"文件不存在: ${escapedPath}","error":"ERR:FILE_NOT_FOUND"}';
          }
          
          // 创建 PlacedItem（置入项）
          var placedItem = doc.placedItems.add();
          
          // 设置文件路径
          placedItem.file = file;
          
          // 嵌入文件
          placedItem.embed();
          
          // 设置尺寸（等比缩放到指定宽度）
          if (${defaultWidth} && ${defaultWidth} > 0) {
            var scale = ${defaultWidth} / placedItem.width;
            placedItem.width = ${defaultWidth};
            placedItem.height = placedItem.height * scale;
          }
          
          // 设置位置为视图中心
          try {
            var view = doc.views[0];
            var centerX = view.centerPoint[0];
            var centerY = view.centerPoint[1];
            
            placedItem.position = [
              centerX - placedItem.width / 2,
              centerY + placedItem.height / 2
            ];
          } catch (e) {
            // 如果获取视图中心失败，使用画板中心
            var artboard = doc.artboards[doc.artboards.getActiveArtboardIndex()];
            var bounds = artboard.artboardRect;
            var centerX = (bounds[0] + bounds[2]) / 2;
            var centerY = (bounds[1] + bounds[3]) / 2;
            
            placedItem.position = [
              centerX - placedItem.width / 2,
              centerY + placedItem.height / 2
            ];
          }
          
          return '{"success":true,"message":"SVG 已成功插入到文档"}';
          
        } catch (error) {
          var errorMsg = error.message.replace(/\\\\/g, "\\\\\\\\").replace(/"/g, '\\\\"');
          return '{"success":false,"message":"插入失败: ' + errorMsg + '","error":"ERR:INSERT_FAILED ' + errorMsg + '"}';
        }
      })();
    `;
    
    try {
      const result = await this.evalScript(script);
      console.log('[IllustratorBridge] callInsertSVG 原始返回:', result);
      const parsed = JSON.parse(result) as InsertResult;
      console.log('[IllustratorBridge] 插入结果:', parsed);
      return parsed;
    } catch (error) {
      console.error('[IllustratorBridge] 解析插入结果失败:', error);
      return {
        success: false,
        message: '解析插入结果失败',
      };
    }
  }

  /**
   * 验证文件是否存在
   * 
   * @param filePath - 文件的绝对路径
   * @returns 文件是否存在
   */
  private async verifyFileExists(filePath: string): Promise<boolean> {
    const escapedPath = filePath.replace(/\\/g, '/');
    
    const script = `
      (function() {
        try {
          var file = new File("${escapedPath}");
          var exists = file.exists;
          var length = exists ? file.length : 0;
          return '{"exists":' + exists + ',"length":' + length + ',"path":"' + file.fsName + '"}';
        } catch (error) {
          var errorMsg = error.message.replace(/\\\\/g, "\\\\\\\\").replace(/"/g, '\\\\"');
          return '{"exists":false,"error":"' + errorMsg + '"}';
        }
      })();
    `;
    
    try {
      const result = await this.evalScript(script);
      const parsed = JSON.parse(result) as { exists: boolean; length?: number; path?: string; error?: string };
      
      console.log('[IllustratorBridge] 文件验证结果:', parsed);
      
      if (parsed.error) {
        console.error('[IllustratorBridge] 文件验证错误:', parsed.error);
      }
      
      return parsed.exists;
    } catch (error) {
      console.error('[IllustratorBridge] 解析文件验证结果失败:', error);
      return false;
    }
  }

  /**
   * 启动 Font Builder Web UI 服务器
   * 调用 scripts/start-font-builder.sh 脚本
   * 
   * @returns Promise<{success: boolean, message: string}>
   */
  public async startFontBuilder(): Promise<{ success: boolean; message: string }> {
    if (!this.isCEPEnvironment) {
      return {
        success: false,
        message: '非 CEP 环境，无法启动服务'
      };
    }

    try {
      // 先调用 JSX 获取脚本路径
      const script = 'startFontBuilder()';
      const result = await this.evalScript(script);
      
      console.log('[IllustratorBridge] startFontBuilder JSX 返回:', result);
      
      const parsed = JSON.parse(result) as { 
        success: boolean; 
        message: string; 
        scriptPath?: string;
        needCEPExecution?: boolean;
      };
      
      console.log('[IllustratorBridge] 解析结果:', parsed);
      
      // 如果 JSX 返回失败，直接返回
      if (!parsed.success) {
        console.error('[IllustratorBridge] JSX 返回失败:', parsed.message);
        return parsed;
      }
      
      // 如果需要在 CEP 端执行
      if (parsed.needCEPExecution && parsed.scriptPath) {
        console.log('[IllustratorBridge] 需要在 CEP 端执行脚本:', parsed.scriptPath);
        console.log('[IllustratorBridge] 检查 window.cep:', typeof window.cep);
        console.log('[IllustratorBridge] 检查 window.cep.process:', typeof window.cep?.process);
        
        // 使用 CEP process API 执行脚本
        if (typeof window.cep !== 'undefined' && window.cep?.process) {
          console.log('[IllustratorBridge] CEP process API 可用，准备执行脚本');
          
          // 构建命令：使用 bash 执行脚本
          const command = `bash "${parsed.scriptPath}"`;
          console.log('[IllustratorBridge] 执行命令:', command);
          
          return new Promise((resolve) => {
            // 使用 cep.process.createProcess 执行命令
            // 类型守卫确保 window.cep 和 window.cep.process 存在
            if (window.cep && window.cep.process) {
              console.log('[IllustratorBridge] 调用 cep.process.createProcess...');
              
              window.cep.process.createProcess(command, (result: any) => {
                console.log('[IllustratorBridge] CEP process 执行结果:', result);
                
                if (result.err === 0) {
                  resolve({
                    success: true,
                    message: 'Font Builder 服务启动脚本已执行'
                  });
                } else {
                  resolve({
                    success: false,
                    message: `脚本执行失败: ${result.err}`
                  });
                }
              });
            } else {
              console.error('[IllustratorBridge] window.cep 或 window.cep.process 不存在');
              resolve({
                success: false,
                message: 'CEP process API 不可用（类型守卫失败）'
              });
            }
          });
        } else {
          console.error('[IllustratorBridge] CEP process API 不可用');
          console.error('[IllustratorBridge] window.cep:', window.cep);
          
          // 降级方案：直接打开浏览器
          console.log('[IllustratorBridge] 尝试降级方案：直接打开浏览器');
          if (window.cep?.util?.openURLInDefaultBrowser) {
            window.cep.util.openURLInDefaultBrowser('http://localhost:5175');
            return {
              success: true,
              message: 'CEP process API 不可用，已直接打开浏览器（需手动启动服务）'
            };
          }
          
          return {
            success: false,
            message: 'CEP process API 不可用，请手动运行: bash ' + parsed.scriptPath
          };
        }
      }
      
      console.log('[IllustratorBridge] 不需要 CEP 执行，返回 JSX 结果');
      return parsed;
    } catch (error) {
      const errorMsg = error instanceof Error ? error.message : String(error);
      console.error('[IllustratorBridge] 启动 Font Builder 失败:', errorMsg);
      console.error('[IllustratorBridge] 错误堆栈:', error);
      return {
        success: false,
        message: '启动失败: ' + errorMsg
      };
    }
  }

  /**
   * 执行 Shell 命令（通用函数）
   * 调用 JSX 的 runShell(cmd) 函数
   * 
   * @param cmd - 要执行的 shell 命令
   * @returns Promise<{success: boolean, exitCode: number, stdout: string, stderr: string, cmd: string, diagnostics?: any, rawSystemResult?: any}>
   */
  /**
     * Base64 解码函数
     * @param str - Base64 编码的字符串
     * @returns 解码后的字符串
     */
    private base64Decode(str: string): string {
      try {
        return atob(str);
      } catch (error) {
        console.error('[IllustratorBridge] Base64 decode error:', error);
        return '';
      }
    }

    /**
     * 解析文本协议返回值
     * 格式：OK|exit=<code>|out=<b64>|err=<b64>|raw=<b64>|cmd=<b64>|method=<method>|script=<b64>
     * 或：ERR|exit=<code>|out=<b64>|err=<b64>|raw=<b64>|cmd=<b64>|method=<method>|script=<b64>
     */
    private parseShellProtocol(result: string): {
      success: boolean;
      exitCode: number;
      stdout: string;
      stderr: string;
      cmd: string;
      rawSystemResult?: string;
      executionMethod?: string;
      scriptInfo?: string;
      diagnostics?: {
        rawResponse?: string;
        parseError?: string;
      };
    } {
      try {
        // 分割协议字符串
        const parts = result.split('|');

        if (parts.length < 2) {
          throw new Error('Invalid protocol format');
        }

        const status = parts[0];
        const success = status === 'OK';

        // 解析 key=value 对
        const fields: Record<string, string> = {};
        for (let i = 1; i < parts.length; i++) {
          const pair = parts[i];
          const eqIndex = pair.indexOf('=');
          if (eqIndex > 0) {
            const key = pair.substring(0, eqIndex);
            const value = pair.substring(eqIndex + 1);
            fields[key] = value;
          }
        }

        // 解码 base64 字段
        const exitCode = parseInt(fields.exit || '-1', 10);
        const stdout = this.base64Decode(fields.out || '');
        const stderr = this.base64Decode(fields.err || '');
        const rawSystemResult = this.base64Decode(fields.raw || '');
        const cmd = this.base64Decode(fields.cmd || '');
        const executionMethod = fields.method || 'unknown';
        const scriptInfo = this.base64Decode(fields.script || '');

        return {
          success,
          exitCode,
          stdout,
          stderr,
          cmd,
          rawSystemResult: rawSystemResult || undefined,
          executionMethod,
          scriptInfo: scriptInfo || undefined
        };
      } catch (error) {
        const errorMsg = error instanceof Error ? error.message : String(error);
        const rawPreview = result.substring(0, 300);

        console.error('[IllustratorBridge] Protocol parse error:', errorMsg);
        console.error('[IllustratorBridge] Raw response (first 300 chars):', rawPreview);

        return {
          success: false,
          exitCode: -1,
          stdout: '',
          stderr: `PARSE_FAIL: ${errorMsg}`,
          cmd: '',
          diagnostics: {
            rawResponse: rawPreview,
            parseError: errorMsg
          }
        };
      }
    }

    /**
     * 执行 Shell 命令（通用函数）
     * 调用 JSX 的 runShell(cmd) 函数
     * 
     * @param cmd - 要执行的 shell 命令
     * @returns Promise<{success: boolean, exitCode: number, stdout: string, stderr: string, cmd: string, rawSystemResult?: string, executionMethod?: string, scriptInfo?: string, diagnostics?: any}>
     */
    public async runShell(cmd: string): Promise<{ 
      success: boolean; 
      exitCode: number; 
      stdout: string; 
      stderr: string; 
      cmd: string;
      rawSystemResult?: string;
      executionMethod?: string;
      scriptInfo?: string;
      diagnostics?: {
        rawResponse?: string;
        parseError?: string;
      };
    }> {
      if (!this.isCEPEnvironment) {
        return {
          success: false,
          exitCode: -1,
          stdout: '',
          stderr: '非 CEP 环境，无法执行 Shell 命令',
          cmd
        };
      }

      try {
        // 转义命令中的特殊字符
        const escapedCmd = cmd.replace(/\\/g, '\\\\').replace(/"/g, '\\"').replace(/\n/g, '\\n').replace(/\r/g, '\\r');

        // 调用 JSX 的 runShell 函数
        const script = `runShell("${escapedCmd}")`;
        const result = await this.evalScript(script);

        console.log('[IllustratorBridge] runShell JSX 返回 (前 200 字符):', result.substring(0, 200));

        // 解析文本协议
        const parsed = this.parseShellProtocol(result);

        console.log('[IllustratorBridge] runShell 解析结果:', {
          success: parsed.success,
          exitCode: parsed.exitCode,
          stdoutLength: parsed.stdout.length,
          stderrLength: parsed.stderr.length,
          hasRawSystemResult: !!parsed.rawSystemResult,
          executionMethod: parsed.executionMethod,
          hasScriptInfo: !!parsed.scriptInfo
        });

        return parsed;
      } catch (error) {
        const errorMsg = error instanceof Error ? error.message : String(error);
        console.error('[IllustratorBridge] runShell 失败:', errorMsg);
        return {
          success: false,
          exitCode: -1,
          stdout: '',
          stderr: `执行失败: ${errorMsg}`,
          cmd
        };
      }
    }

  /**
   * 删除临时文件
   * 
   * @param filePath - 文件的绝对路径
   */
  private async deleteTempFile(filePath: string): Promise<void> {
    const escapedPath = filePath.replace(/\\/g, '/');
    
    const script = `
      (function() {
        try {
          var file = new File("${escapedPath}");
          if (file.exists) {
            file.remove();
          }
          return '{"success":true}';
        } catch (error) {
          var errorMsg = error.message.replace(/\\\\/g, "\\\\\\\\").replace(/"/g, '\\\\"');
          return '{"success":false,"error":"' + errorMsg + '"}';
        }
      })();
    `;
    
    try {
      const result = await this.evalScript(script);
      const parsed = JSON.parse(result) as { success: boolean; error?: string };
      
      if (!parsed.success) {
        console.warn('[IllustratorBridge] 删除临时文件失败:', parsed.error);
      }
    } catch (error) {
      console.warn('[IllustratorBridge] 解析删除结果失败:', error);
    }
  }
}
