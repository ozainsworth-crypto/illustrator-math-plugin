// Illustrator ExtendScript
// 此脚本运行在 Illustrator 主机环境中

/**
 * Base64 编码函数（ExtendScript 兼容）
 * @param {string} str - 要编码的字符串
 * @returns {string} Base64 编码后的字符串
 */
function base64Encode(str) {
  var base64chars = "ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789+/";
  var result = "";
  var i = 0;
  
  while (i < str.length) {
    var a = str.charCodeAt(i++);
    var b = i < str.length ? str.charCodeAt(i++) : 0;
    var c = i < str.length ? str.charCodeAt(i++) : 0;
    
    var bitmap = (a << 16) | (b << 8) | c;
    
    result += base64chars.charAt((bitmap >> 18) & 63);
    result += base64chars.charAt((bitmap >> 12) & 63);
    result += (i > str.length + 1) ? "=" : base64chars.charAt((bitmap >> 6) & 63);
    result += (i > str.length) ? "=" : base64chars.charAt(bitmap & 63);
  }
  
  return result;
}

/**
 * 通用 Shell 执行函数（V5 - 原子化 AppleScript）
 * 执行 shell 命令并捕获输出
 * @param {string} cmd - 要执行的 shell 命令
 * @returns {string} 文本协议字符串：OK|exit=<code>|out=<b64>|err=<b64>|raw=<b64>|cmd=<b64>|method=<method>|script=<b64> 或 ERR|...
 */
function runShell(cmd) {
  // 初始化变量
  var exitCode = -1;
  var stdout = "";
  var stderr = "";
  var rawResult = "";
  var executionMethod = "none";
  var scriptPath = "";
  var scriptContent = "";
  var diagnostics = "";
  
  try {
    // 检测操作系统
    var isMac = $.os.indexOf("Mac") >= 0;
    
    if (!isMac) {
      stderr = "不支持的操作系统: " + $.os;
      return "ERR|exit=-1|out=" + base64Encode("") + "|err=" + base64Encode(stderr) + "|raw=" + base64Encode("") + "|cmd=" + base64Encode(cmd) + "|method=none|script=" + base64Encode("");
    }
    
    // 诊断信息
    var systemInfo = "typeof system=" + (typeof system) + "; $.os=" + $.os + "; ";
    
    // 方法 1: 尝试 system.callSystem（如果可用）
    if (typeof system !== "undefined" && typeof system.callSystem === "function") {
      try {
        // 创建临时文件来捕获输出
        var tempFolder = Folder.temp;
        var timestamp = new Date().getTime();
        var stdoutFile = new File(tempFolder.fsName + "/shell-stdout-" + timestamp + ".txt");
        var stderrFile = new File(tempFolder.fsName + "/shell-stderr-" + timestamp + ".txt");
        
        var redirectedCmd = cmd + " > " + stdoutFile.fsName + " 2> " + stderrFile.fsName;
        exitCode = system.callSystem(redirectedCmd);
        executionMethod = "callSystem";
        rawResult = String(exitCode);
        
        // 等待文件写入
        $.sleep(100);
        
        // 读取输出
        if (stdoutFile.exists) {
          stdoutFile.encoding = "UTF-8";
          stdoutFile.open("r");
          stdout = stdoutFile.read();
          stdoutFile.close();
          stdoutFile.remove();
        }
        
        if (stderrFile.exists) {
          stderrFile.encoding = "UTF-8";
          stderrFile.open("r");
          stderr = stderrFile.read();
          stderrFile.close();
          stderrFile.remove();
        }
      } catch (e) {
        // callSystem 失败，继续尝试 AppleScript
        exitCode = -1;
        stderr = "system.callSystem failed: " + e.message + "; ";
      }
    }
    
    // 方法 2: AppleScript 原子化执行（主路径）
    if (exitCode === -1) {
      try {
        // 创建临时目录（如果不存在）
        var homeFolder = Folder("~");
        var appSupportFolder = new Folder(homeFolder.fsName + "/Library/Application Support/MathFormulaPlugin");
        if (!appSupportFolder.exists) {
          appSupportFolder.create();
        }
        var tmpFolder = new Folder(appSupportFolder.fsName + "/tmp");
        if (!tmpFolder.exists) {
          tmpFolder.create();
        }
        
        // 创建临时 shell 脚本
        var timestamp = new Date().getTime();
        var shellScriptFile = new File(tmpFolder.fsName + "/run-shell-" + timestamp + ".sh");
        scriptPath = shellScriptFile.fsName;
        
        // 构建脚本内容
        scriptContent = "#!/bin/bash\n";
        scriptContent += "export PATH=/opt/homebrew/bin:/usr/local/bin:/usr/bin:/bin:/usr/sbin:/sbin\n";
        scriptContent += cmd + "\n";
        
        // 写入脚本文件
        shellScriptFile.encoding = "UTF-8";
        shellScriptFile.open("w");
        shellScriptFile.write(scriptContent);
        shellScriptFile.close();
        
        // 诊断：脚本文件是否存在（写入后）
        var scriptExistsBefore = shellScriptFile.exists;
        diagnostics += "scriptExistsBefore=" + scriptExistsBefore + "; ";
        
        // 构建 AppleScript 命令（原子化：chmod + 执行）
        // 使用 quoted form of 处理路径中的空格
        var appleScriptCmd = 'try\n';
        appleScriptCmd += '  set scriptPath to "' + scriptPath.replace(/"/g, '\\"') + '"\n';
        appleScriptCmd += '  set chmodCmd to "chmod +x " & quoted form of scriptPath\n';
        appleScriptCmd += '  do shell script chmodCmd\n';
        appleScriptCmd += '  set execCmd to quoted form of scriptPath & " 2>&1"\n';
        appleScriptCmd += '  set out to do shell script execCmd\n';
        appleScriptCmd += '  return "OK|exit=0|out=" & out\n';
        appleScriptCmd += 'on error errMsg number errNum\n';
        appleScriptCmd += '  return "ERR|exit=" & errNum & "|err=" & errMsg\n';
        appleScriptCmd += 'end try';
        
        diagnostics += "appleScriptLength=" + appleScriptCmd.length + "; ";
        
        // 写入 AppleScript 文件
        var appleScriptFile = new File(tmpFolder.fsName + "/run-" + timestamp + ".scpt");
        appleScriptFile.encoding = "UTF-8";
        appleScriptFile.open("w");
        appleScriptFile.write(appleScriptCmd);
        appleScriptFile.close();
        
        // 使用 system.callSystem 执行 osascript（如果可用）
        var osascriptCmd = "osascript " + appleScriptFile.fsName;
        var resultFile = new File(tmpFolder.fsName + "/result-" + timestamp + ".txt");
        var osascriptExitCode = -1;
        
        if (typeof system !== "undefined" && typeof system.callSystem === "function") {
          // 使用 system.callSystem 执行
          osascriptExitCode = system.callSystem(osascriptCmd + " > " + resultFile.fsName + " 2>&1");
          diagnostics += "osascriptExitCode=" + osascriptExitCode + "; ";
        } else {
          // 降级：使用 File 对象的 execute 方法（但这会触发 Xcode）
          diagnostics += "system.callSystem不可用; ";
          stderr = "system.callSystem 不可用，无法执行 osascript";
          exitCode = -1;
          executionMethod = "failed";
          
          // 清理临时文件
          if (shellScriptFile.exists) shellScriptFile.remove();
          if (appleScriptFile.exists) appleScriptFile.remove();
          
          var scriptInfo = "path=" + scriptPath + "; diagnostics=" + diagnostics;
          return "ERR|exit=-1|out=" + base64Encode("") + "|err=" + base64Encode(stderr) + "|raw=" + base64Encode("") + "|cmd=" + base64Encode(cmd) + "|method=failed|script=" + base64Encode(scriptInfo);
        }
        
        // 等待执行完成
        $.sleep(300);
        
        // 读取 AppleScript 返回的协议
        var rawResponse = "";
        if (resultFile.exists) {
          resultFile.encoding = "UTF-8";
          resultFile.open("r");
          rawResponse = resultFile.read();
          resultFile.close();
          resultFile.remove();
        } else {
          diagnostics += "resultFileNotFound; ";
        }
        
        rawResult = rawResponse;
        diagnostics += "rawResponseLength=" + rawResponse.length + "; ";
        
        // 诊断：脚本文件是否存在（执行后）
        var scriptExistsAfter = shellScriptFile.exists;
        diagnostics += "scriptExistsAfter=" + scriptExistsAfter + "; ";
        
        // 解析协议：OK|exit=0|out=<...> 或 ERR|exit=N|err=<...>
        if (rawResponse.indexOf("OK|exit=") === 0) {
          // 成功
          executionMethod = "applescript";
          exitCode = 0;
          
          // 提取 out 部分
          var outIndex = rawResponse.indexOf("|out=");
          if (outIndex > 0) {
            stdout = rawResponse.substring(outIndex + 5);
          }
        } else if (rawResponse.indexOf("ERR|exit=") === 0) {
          // 失败
          executionMethod = "applescript";
          
          // 提取 exit code
          var exitMatch = rawResponse.match(/ERR\|exit=(-?\d+)/);
          if (exitMatch) {
            exitCode = parseInt(exitMatch[1]);
          } else {
            exitCode = 1;
          }
          
          // 提取 err 部分
          var errIndex = rawResponse.indexOf("|err=");
          if (errIndex > 0) {
            stderr = rawResponse.substring(errIndex + 5);
          } else {
            stderr = rawResponse;
          }
        } else {
          // 无法解析
          executionMethod = "applescript";
          exitCode = -1;
          stderr = "AppleScript 返回格式错误: " + rawResponse.substring(0, 200);
          diagnostics += "parseError; ";
        }
        
        // 清理临时文件
        if (shellScriptFile.exists) shellScriptFile.remove();
        if (appleScriptFile.exists) appleScriptFile.remove();
        
      } catch (e) {
        stderr += "AppleScript execution failed: " + e.message + "; ";
        diagnostics += "exception=" + e.message + "; ";
        exitCode = -1;
      }
    }
    
    // 如果所有方法都失败
    if (exitCode === -1 && executionMethod === "none") {
      stderr += "All execution methods failed; " + systemInfo;
      return "ERR|exit=-1|out=" + base64Encode("") + "|err=" + base64Encode(stderr) + "|raw=" + base64Encode(systemInfo) + "|cmd=" + base64Encode(cmd) + "|method=failed|script=" + base64Encode(diagnostics);
    }
    
    // 截断输出（前 500 字符）
    var maxLen = 500;
    if (stdout.length > maxLen) {
      stdout = stdout.substring(0, maxLen) + "...";
    }
    if (stderr.length > maxLen) {
      stderr = stderr.substring(0, maxLen) + "...";
    }
    
    // 返回协议（添加 script 字段）
    var status = exitCode === 0 ? "OK" : "ERR";
    var scriptInfo = "path=" + scriptPath + "; diagnostics=" + diagnostics + "; content=" + scriptContent.substring(0, 100);
    return status + "|exit=" + exitCode + "|out=" + base64Encode(stdout) + "|err=" + base64Encode(stderr) + "|raw=" + base64Encode(rawResult) + "|cmd=" + base64Encode(cmd) + "|method=" + executionMethod + "|script=" + base64Encode(scriptInfo);
    
  } catch (error) {
    var errorMsg = "执行异常: " + error.message;
    return "ERR|exit=-1|out=" + base64Encode("") + "|err=" + base64Encode(errorMsg) + "|raw=" + base64Encode("") + "|cmd=" + base64Encode(cmd) + "|method=exception|script=" + base64Encode(diagnostics);
  }
}

/**
 * 调试函数：返回文档状态信息
 */
function debugDocumentStatus() {
  try {
    var docCount = app.documents.length;
    var activeName = docCount > 0 ? app.activeDocument.name : "none";
    return "DEBUG docs=" + docCount + ", active=" + activeName;
  } catch (error) {
    return "DEBUG ERROR: " + error.message;
  }
}

/**
 * 检查是否有打开的文档（增强版，带重试和详细错误信息）
 * @returns {string} JSON 字符串，包含 hasDocument
 */
function checkDocument() {
  try {
    // 第一次检测
    var docCount = app.documents.length;
    
    if (docCount === 0) {
      // 等待 150ms 后重试
      $.sleep(150);
      docCount = app.documents.length;
      
      if (docCount === 0) {
        return JSON.stringify({
          hasDocument: false,
          error: "ERR:NO_DOC docs=0",
          debug: "检测到 0 个文档（已重试）"
        });
      }
    }
    
    // 有文档，返回成功
    var activeName = app.activeDocument.name;
    return JSON.stringify({
      hasDocument: true,
      docCount: docCount,
      activeName: activeName,
      debug: "检测到 " + docCount + " 个文档，当前文档: " + activeName
    });
    
  } catch (error) {
    return JSON.stringify({
      hasDocument: false,
      error: "ERR:EXCEPTION " + error.message,
      debug: "文档检测异常: " + error.message
    });
  }
}

/**
 * 插入 SVG 到当前文档
 * @param {string} svgPath - SVG 文件的绝对路径
 * @param {number} defaultWidth - 默认宽度（pt）
 * @returns {string} JSON 字符串，包含 success 和 message
 */
function insertSVGToDocument(svgPath, defaultWidth) {
  try {
    // 检查是否有打开的文档
    if (app.documents.length === 0) {
      return JSON.stringify({
        success: false,
        message: "请先打开或创建一个 Illustrator 文档",
        error: "ERR:NO_DOC docs=0"
      });
    }
    
    var doc = app.activeDocument;
    
    // 创建 PlacedItem（置入项）
    var placedItem = doc.placedItems.add();
    
    // 设置文件路径（使用正斜杠，跨平台兼容）
    var file = new File(svgPath);
    placedItem.file = file;
    
    // 嵌入文件
    placedItem.embed();
    
    // 设置尺寸（等比缩放到指定宽度）
    if (defaultWidth && defaultWidth > 0) {
      var scale = defaultWidth / placedItem.width;
      placedItem.width = defaultWidth;
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
    
    return JSON.stringify({
      success: true,
      message: "SVG 已成功插入到文档"
    });
    
  } catch (error) {
    return JSON.stringify({
      success: false,
      message: "插入失败: " + error.message,
      error: "ERR:INSERT_FAILED " + error.message
    });
  }
}

/**
 * 启动 Font Builder Web UI 服务器
 * 通过调用 scripts/start-font-builder.sh 脚本
 * @returns {string} JSON 字符串，包含 success 和 message
 */
function startFontBuilder() {
  try {
    // 检测操作系统
    var isMac = $.os.indexOf("Mac") >= 0;
    
    if (!isMac) {
      return '{"success":false,"message":"当前仅支持 macOS 系统"}';
    }
    
    // 使用 CEP 扩展的标准路径
    // macOS: ~/Library/Application Support/Adobe/CEP/extensions/MathFormulaPlugin
    var homeFolder = Folder("~");
    var extensionFolder = new Folder(homeFolder.fsName + "/Library/Application Support/Adobe/CEP/extensions/MathFormulaPlugin");
    
    // 检查扩展目录是否存在
    if (!extensionFolder.exists) {
      return '{"success":false,"message":"扩展目录不存在: ' + extensionFolder.fsName + '"}';
    }
    
    // 构建脚本路径
    var scriptPath = extensionFolder.fsName + "/scripts/start-font-builder.sh";
    
    // 检查脚本是否存在
    var scriptFile = new File(scriptPath);
    if (!scriptFile.exists) {
      return '{"success":false,"message":"启动脚本不存在: ' + scriptPath + '"}';
    }
    
    // 返回脚本路径，让 CEP 端使用 cep.process API 执行
    // ExtendScript 没有 system() 函数，需要在 CEP 端执行
    return '{"success":true,"message":"脚本路径已返回，请在 CEP 端执行","scriptPath":"' + scriptPath + '","needCEPExecution":true}';
    
  } catch (error) {
    var errorMsg = error.message.replace(/\\/g, "\\\\").replace(/"/g, '\\"');
    return '{"success":false,"message":"启动失败: ' + errorMsg + '","error":"ERR:START_FAILED"}';
  }
}
