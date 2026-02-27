/* eslint-disable @typescript-eslint/no-explicit-any */
/* eslint-disable @typescript-eslint/no-unsafe-assignment */
/* eslint-disable @typescript-eslint/no-unsafe-call */
/* eslint-disable @typescript-eslint/no-unsafe-member-access */
/* eslint-disable @typescript-eslint/no-unsafe-argument */

import './style.css';
import { WebFormulaGenerator } from './lib/formula-generator';
import type { SVGResult } from './lib/formula-generator';
import { AmbiguityEngine } from './lib/ambiguity/ambiguity-engine';
import { allRules } from './lib/ambiguity/rules';
import { AmbiguityPrompt } from './components/ambiguity-prompt';
import type { AmbiguityContext } from './lib/ambiguity/types';
import { FormulaParser, FormulaFormat } from './lib/formula-parser';
import { PasteNormalizer } from './lib/paste-normalizer';
import { FormatSelector } from './components/format-selector';
import type { FormatOption } from './components/format-selector';
import { AmbiguityResolver } from './components/ambiguity-resolver';
import type { AmbiguityCandidate } from './components/ambiguity-resolver';
import { FallbackPrompt } from './components/fallback-prompt';
import type { FallbackInfo } from './components/fallback-prompt';
import { FontPackLoader } from './lib/font-pack-loader';
import { FontSelector } from './components/font-selector';
import { IllustratorBridge } from './lib/illustrator-bridge';
import type { InsertResult } from './lib/illustrator-bridge';

// 创建公式生成器实例
const generator = new WebFormulaGenerator({
  mathjaxVersion: '4.1.0',
  outputFormat: 'svg',
  displayMode: true,
});

// 创建字体包加载器实例
const fontPackLoader = new FontPackLoader();

// 创建 Illustrator 桥接实例
const illustratorBridge = new IllustratorBridge();

// 自动检测并加载用户字体包（启动时）
// 如果检测到用户字体包，自动应用（单一字体包模型）
const fontPackLoadPromise = fontPackLoader.detectAndLoadUserFontPack().then((pack) => {
  if (pack) {
    console.log('[Startup] 已检测到用户字体包，自动应用');
    // 自动应用用户字体包
    fontPackLoader.applyUserFontPack();
    // addDebugLog 在 DOMContentLoaded 后才可用，这里先用 console.log
  } else {
    console.log('[Startup] 未检测到用户字体包，使用默认字体');
  }
  
  // 启动轮询机制
  fontPackLoader.startPolling();
  console.log('[Startup] 已启动字体包轮询机制');
  
  return pack;
}).catch((error) => {
  console.error('[Startup] 用户字体包检测失败:', error);
  return null;
});

// 创建歧义引擎实例并注册规则
const ambiguityEngine = new AmbiguityEngine();
ambiguityEngine.registerRules(allRules);
ambiguityEngine.enableDebug(); // 启用调试模式以查看检测过程

// 创建歧义提示组件
const ambiguityPrompt = new AmbiguityPrompt('ambiguity-prompt');

// 创建歧义对比界面
const ambiguityResolver = new AmbiguityResolver('ambiguity-resolver');

// 创建降级提示界面
const fallbackPrompt = new FallbackPrompt('fallback-prompt');

// 创建公式解析器和粘贴归一化器
const formulaParser = new FormulaParser();
const pasteNormalizer = new PasteNormalizer();

// 创建格式选择器
const formatSelector = new FormatSelector('format-selector');

// 当前渲染的 SVG 结果
let currentSVGResult: SVGResult | null = null;

// inputVersion 机制：防止旧的异步结果回写到新输入的界面
let currentInputVersion = 0;

// 防抖定时器（用于自动预览）
let renderDebounceTimer: number | null = null;

// 字体选择器实例（需要在多处访问）
let fontSelector: FontSelector | null = null;

// 初始化应用
document.addEventListener('DOMContentLoaded', () => {
  console.log('Math Formula Plugin - Phase 1 初始化');

  // 获取 DOM 元素
  const latexInput = document.getElementById('latex-input') as HTMLTextAreaElement;
  const refreshPreviewBtn = document.getElementById('refresh-preview-btn') as HTMLButtonElement;
  const insertBtn = document.getElementById('insert-btn') as HTMLButtonElement;
  const downloadBtn = document.getElementById('download-btn') as HTMLButtonElement;
  const copyBtn = document.getElementById('copy-btn') as HTMLButtonElement;
  const previewOutput = document.getElementById('preview-output') as HTMLDivElement;
  const loadingIndicator = document.getElementById('loading-indicator') as HTMLDivElement;
  const errorMessage = document.getElementById('error-message') as HTMLDivElement;
  const previewSection = document.getElementById('preview-section') as HTMLElement;
  const actionsSection = document.querySelector('.actions-section') as HTMLElement;

  // 标签页元素（新 UI 使用 div.tab-item）
  const tabButtons = document.querySelectorAll('.tab-item');
  const tabPanels = document.querySelectorAll('.tab-panel');

  // 调试日志区域
  const debugLog = document.getElementById('debug-log') as HTMLDivElement;
  const clearLogBtn = document.getElementById('clear-log-btn') as HTMLButtonElement;
  const shellDiagnosticsBtn = document.getElementById('shell-diagnostics-btn') as HTMLButtonElement;
  
  // 强制启用文本选择（覆盖全局 user-select: none）
  if (debugLog) {
    debugLog.style.webkitUserSelect = 'text';
    debugLog.style.userSelect = 'text';
  }

  // 字号输入框（保持原 ID）
  const fontSizeContainer = document.getElementById('font-size-container') as HTMLElement;
  const fontSizeInput = document.getElementById('font-size-input') as HTMLInputElement;
  
  // 新 UI 元素
  const resultGroup = document.getElementById('result-group') as HTMLDivElement;
  const stepUpBtn = document.getElementById('step-up') as HTMLDivElement;
  const stepDownBtn = document.getElementById('step-down') as HTMLDivElement;
  const fontToolBtn = document.getElementById('font-tool-btn') as HTMLDivElement;

  // 调试日志函数
  function addDebugLog(message: string, type: 'info' | 'success' | 'error' | 'warning' = 'info'): void {
    if (!debugLog) return;
    const timestamp = new Date().toLocaleTimeString();
    const logClass = `log-${type}`;
    const logLine = `[${timestamp}] ${message}\n`;
    const span = document.createElement('span');
    span.className = logClass;
    span.textContent = logLine;
    // 强制启用文本选择（覆盖全局 user-select: none）
    span.style.webkitUserSelect = 'text';
    span.style.userSelect = 'text';
    debugLog.appendChild(span);
    debugLog.scrollTop = debugLog.scrollHeight;
  }
  
  // 启动时输出字体包检测信息到调试日志
  void fontPackLoadPromise.then((pack) => {
    if (pack) {
      addDebugLog(`✅ 检测到用户字体包: ${pack.manifest.name}`, 'success');
      addDebugLog(`   buildId: ${(pack.manifest as any).buildId || 'N/A'}`, 'info');
      addDebugLog(`   创建时间: ${pack.manifest.createdAt}`, 'info');
      addDebugLog(`   字符数量: ${Object.keys(pack.fontdata).length}`, 'info');
    } else {
      addDebugLog('ℹ️ 未检测到用户字体包，使用默认字体', 'info');
    }
    addDebugLog('🔄 已启动字体包轮询机制（每 2 秒检查一次）', 'info');
  }).catch((error) => {
    addDebugLog(`❌ 用户字体包检测失败: ${error instanceof Error ? error.message : String(error)}`, 'error');
  });

  // 标签页切换逻辑（新 UI 使用 div.tab-item）
  function switchTab(targetTab: string): void {
    // 更新标签按钮状态
    tabButtons.forEach((btn) => {
      const element = btn as HTMLElement;
      if (element.dataset.tab === targetTab) {
        element.classList.add('active');
      } else {
        element.classList.remove('active');
      }
    });

    // 更新标签页内容显示
    tabPanels.forEach((panel) => {
      const panelElement = panel as HTMLDivElement;
      if (panelElement.id === `${targetTab}-panel`) {
        panelElement.classList.add('active');
      } else {
        panelElement.classList.remove('active');
      }
    });

    console.log(`[Tab] 切换到标签页: ${targetTab}`);
  }

  // 绑定标签页切换事件（新 UI 使用 div 而非 button）
  tabButtons.forEach((btn) => {
    btn.addEventListener('click', () => {
      const element = btn as HTMLElement;
      const targetTab = element.dataset.tab;
      if (targetTab) {
        switchTab(targetTab);
      }
    });
  });

  // 清空日志按钮事件
  if (clearLogBtn) {
    clearLogBtn.addEventListener('click', () => {
      if (debugLog) {
        debugLog.innerHTML = '';
        addDebugLog('日志已清空', 'info');
      }
    });
  }

  // Shell 诊断按钮事件
  if (shellDiagnosticsBtn) {
    shellDiagnosticsBtn.addEventListener('click', () => {
      void runShellDiagnostics();
    });
  }

  // Shell 诊断测试函数
  async function runShellDiagnostics(): Promise<void> {
    addDebugLog('=== Shell 诊断开始 ===', 'info');
    addDebugLog('', 'info');

    if (!illustratorBridge.isInCEP()) {
      addDebugLog('❌ 不在 CEP 环境中，无法执行 Shell 诊断', 'error');
      return;
    }

    try {
      // 测试 0: 系统信息诊断
      addDebugLog('测试 0: 系统信息诊断', 'info');
      const test0 = await illustratorBridge.runShell('echo "system-info"');
      
      // 检查是否有解析错误
      if (test0.stderr.startsWith('PARSE_FAIL:')) {
        addDebugLog(`❌ 协议解析失败: ${test0.stderr}`, 'error');
        if (test0.diagnostics?.rawResponse) {
          addDebugLog(`  原始返回值 (前 300 字符): ${test0.diagnostics.rawResponse}`, 'error');
        }
        addDebugLog('', 'info');
        addDebugLog('=== Shell 诊断失败 ===', 'error');
        addDebugLog('❌ JSX 返回协议错误，无法解析', 'error');
        return;
      }
      
      addDebugLog(`  exitCode: ${test0.exitCode}`, 'info');
      addDebugLog(`  stdout: "${test0.stdout}"`, 'info');
      addDebugLog(`  executionMethod: ${test0.executionMethod || 'unknown'}`, 'info');
      if (test0.rawSystemResult) {
        addDebugLog(`  rawSystemResult (前 200 字符): ${test0.rawSystemResult.substring(0, 200)}`, 'info');
      }
      if (test0.scriptInfo) {
        addDebugLog(`  scriptInfo (前 300 字符): ${test0.scriptInfo.substring(0, 300)}`, 'info');
      }
      if (test0.stderr) {
        addDebugLog(`  stderr: "${test0.stderr}"`, 'warning');
      }
      addDebugLog('', 'info');
      
      // 测试 1: echo hello
      addDebugLog('测试 1: echo hello', 'info');
      const test1 = await illustratorBridge.runShell('echo hello');
      addDebugLog(`  exitCode: ${test1.exitCode}`, 'info');
      addDebugLog(`  stdout: "${test1.stdout}"`, 'info');
      addDebugLog(`  executionMethod: ${test1.executionMethod || 'unknown'}`, 'info');
      if (test1.scriptInfo) {
        addDebugLog(`  scriptInfo (前 200 字符): ${test1.scriptInfo.substring(0, 200)}`, 'info');
      }
      if (test1.stderr) {
        addDebugLog(`  stderr: "${test1.stderr}"`, 'warning');
      }
      
      // 验证 test1 是否成功
      const test1Success = test1.exitCode === 0 && test1.stdout.trim().includes('hello') && (test1.executionMethod === 'callSystem' || test1.executionMethod === 'applescript');
      addDebugLog(`  结果: ${test1Success ? '✅ 通过' : '❌ 失败'}`, test1Success ? 'success' : 'error');
      if (!test1Success && test1.executionMethod !== 'callSystem' && test1.executionMethod !== 'applescript') {
        addDebugLog(`  ⚠️ 警告: 使用了非同步方法 (${test1.executionMethod})，应该使用 callSystem 或 applescript`, 'warning');
      }
      addDebugLog('', 'info');
      
      // 测试 2: pwd
      addDebugLog('测试 2: pwd', 'info');
      const test2 = await illustratorBridge.runShell('pwd');
      addDebugLog(`  exitCode: ${test2.exitCode}`, 'info');
      addDebugLog(`  stdout: "${test2.stdout}"`, 'info');
      addDebugLog(`  executionMethod: ${test2.executionMethod || 'unknown'}`, 'info');
      if (test2.stderr) {
        addDebugLog(`  stderr: "${test2.stderr}"`, 'warning');
      }
      const test2Success = test2.exitCode === 0 && test2.stdout.trim().length > 0 && (test2.executionMethod === 'callSystem' || test2.executionMethod === 'applescript');
      addDebugLog(`  结果: ${test2Success ? '✅ 通过' : '❌ 失败'}`, test2Success ? 'success' : 'error');
      addDebugLog('', 'info');
      
      // 测试 3: whoami
      addDebugLog('测试 3: whoami', 'info');
      const test3 = await illustratorBridge.runShell('whoami');
      addDebugLog(`  exitCode: ${test3.exitCode}`, 'info');
      addDebugLog(`  stdout: "${test3.stdout}"`, 'info');
      addDebugLog(`  executionMethod: ${test3.executionMethod || 'unknown'}`, 'info');
      if (test3.stderr) {
        addDebugLog(`  stderr: "${test3.stderr}"`, 'warning');
      }
      const test3Success = test3.exitCode === 0 && test3.stdout.trim().length > 0 && (test3.executionMethod === 'callSystem' || test3.executionMethod === 'applescript');
      addDebugLog(`  结果: ${test3Success ? '✅ 通过' : '❌ 失败'}`, test3Success ? 'success' : 'error');
      addDebugLog('', 'info');
      
      // 测试 4: which bash
      addDebugLog('测试 4: which bash', 'info');
      const test4 = await illustratorBridge.runShell('which bash');
      addDebugLog(`  exitCode: ${test4.exitCode}`, 'info');
      addDebugLog(`  stdout: "${test4.stdout}"`, 'info');
      addDebugLog(`  executionMethod: ${test4.executionMethod || 'unknown'}`, 'info');
      if (test4.stderr) {
        addDebugLog(`  stderr: "${test4.stderr}"`, 'warning');
      }
      const test4Success = test4.exitCode === 0 && test4.stdout.trim().includes('bash') && (test4.executionMethod === 'callSystem' || test4.executionMethod === 'applescript');
      addDebugLog(`  结果: ${test4Success ? '✅ 通过' : '❌ 失败'}`, test4Success ? 'success' : 'error');
      addDebugLog('', 'info');

      // 测试 5: 测试错误捕获（使用 false 命令）
      addDebugLog('测试 5: 测试错误捕获 (false)', 'info');
      const test5 = await illustratorBridge.runShell('false');
      addDebugLog(`  exitCode: ${test5.exitCode}`, 'info');
      addDebugLog(`  stdout: ${test5.stdout || '(空)'}`, 'info');
      addDebugLog(`  stderr: "${test5.stderr}"`, 'info');
      addDebugLog(`  executionMethod: ${test5.executionMethod || 'unknown'}`, 'info');
      if (test5.scriptInfo) {
        addDebugLog(`  scriptInfo (前 200 字符): ${test5.scriptInfo.substring(0, 200)}`, 'info');
      }
      if (test5.rawSystemResult) {
        addDebugLog(`  rawSystemResult (前 200 字符): ${test5.rawSystemResult.substring(0, 200)}`, 'info');
      }
      const test5Success = test5.exitCode !== 0 && (test5.executionMethod === 'callSystem' || test5.executionMethod === 'applescript');
      addDebugLog(`  结果: ${test5Success ? '✅ 通过（正确捕获错误）' : '❌ 失败（应该返回非零退出码）'}`, test5Success ? 'success' : 'warning');
      addDebugLog('', 'info');

      // 总结
      const allTestsPassed = test1Success && test2Success && test3Success && test4Success && test5Success;
      addDebugLog('=== Shell 诊断完成 ===', allTestsPassed ? 'success' : 'error');
      
      if (allTestsPassed) {
        addDebugLog('✅ runShell() 函数工作正常', 'success');
      } else {
        addDebugLog('❌ runShell() 函数存在问题，请检查上述失败的测试', 'error');
      }
    } catch (error) {
      addDebugLog(`❌ 诊断过程出错: ${error instanceof Error ? error.message : String(error)}`, 'error');
    }
  }

  // 如果在 CEP 环境中，添加 body.cep 类，显示插入按钮和字号输入框，隐藏下载/复制按钮
  if (illustratorBridge.isInCEP()) {
    // 添加 CEP 环境类（用于 CSS 隐藏下载/复制按钮）
    document.body.classList.add('cep');
    
    insertBtn.style.display = 'block';
    if (fontSizeContainer) {
      fontSizeContainer.style.display = 'block';
    }
    // 下载和复制按钮通过 CSS body.cep 规则隐藏
    // 隐藏操作区（Web 环境专用）
    if (actionsSection) {
      actionsSection.style.display = 'none';
    }
    console.log('[CEP] CEP 环境已检测，应用 CEP 样式');
    
    // 自动运行 CEP 桥接测试
    void runCEPDiagnostics();
  } else {
    // Web 环境：显示操作区
    if (actionsSection) {
      actionsSection.style.display = 'block';
    }
  }

  // 显示 MathJax 版本信息（仅在控制台）
  console.log(`MathJax version: ${generator.getMathJaxVersion()}`);
  
  // 显示结果区（新 UI）
  function showResultGroup(): void {
    if (resultGroup) {
      resultGroup.style.display = 'block';
    }
  }
  
  // 字号步进器逻辑（新 UI）
  if (stepUpBtn && fontSizeInput) {
    stepUpBtn.addEventListener('click', (e) => {
      e.stopPropagation();
      const currentValue = parseInt(fontSizeInput.value) || 14;
      fontSizeInput.value = String(currentValue + 1);
    });
  }
  
  if (stepDownBtn && fontSizeInput) {
    stepDownBtn.addEventListener('click', (e) => {
      e.stopPropagation();
      const currentValue = parseInt(fontSizeInput.value) || 14;
      fontSizeInput.value = String(Math.max(6, currentValue - 1));
    });
  }
  
  // 字号下拉按钮逻辑（新 UI）- 显示下拉菜单
  const dropBtn = document.querySelector('.ai-drop-btn') as HTMLElement;
  let dropdownMenu: HTMLElement | null = null;
  
  if (dropBtn && fontSizeInput) {
    // 创建下拉菜单
    dropdownMenu = document.createElement('div');
    dropdownMenu.className = 'font-size-dropdown hidden';
    
    // 预设字号选项
    const fontSizes = [6, 8, 10, 12, 14, 16, 18, 24, 36, 48, 72];
    
    fontSizes.forEach(size => {
      const option = document.createElement('div');
      option.className = 'dropdown-option';
      option.textContent = `${size} pt`;
      option.dataset.value = String(size);
      
      option.addEventListener('click', () => {
        fontSizeInput.value = String(size);
        if (dropdownMenu) {
          dropdownMenu.classList.add('hidden');
        }
      });
      
      if (dropdownMenu) {
        dropdownMenu.appendChild(option);
      }
    });
    
    // 插入到字号容器中
    const fontSizeWrapper = document.querySelector('.font-size-wrapper');
    if (fontSizeWrapper && dropdownMenu) {
      fontSizeWrapper.appendChild(dropdownMenu);
    }
    
    // 下拉按钮点击事件
    dropBtn.addEventListener('click', (e) => {
      e.stopPropagation();
      if (dropdownMenu) {
        dropdownMenu.classList.toggle('hidden');
      }
    });
    
    // 点击外部关闭下拉菜单
    document.addEventListener('click', (e) => {
      if (dropdownMenu && !dropdownMenu.classList.contains('hidden')) {
        const target = e.target as HTMLElement;
        if (!dropBtn.contains(target) && !dropdownMenu.contains(target)) {
          dropdownMenu.classList.add('hidden');
        }
      }
    });
  }
  
  // 字号输入框聚焦时全选（新 UI 优化）
  if (fontSizeInput) {
    fontSizeInput.addEventListener('focus', () => {
      fontSizeInput.select();
    });
  }
  
  // 字体工具按钮逻辑（新 UI）- 改为下拉菜单
  if (fontToolBtn) {
    // 修改按钮的 title
    fontToolBtn.title = '字体选项-更多';
    
    // 创建下拉菜单
    const fontToolDropdown = document.createElement('div');
    fontToolDropdown.className = 'font-tool-dropdown hidden';
    fontToolDropdown.style.cssText = `
      position: absolute;
      top: 100%;
      right: 0;
      margin-top: 4px;
      background: var(--ai-input-bg);
      border: 1px solid var(--ai-border-idle);
      border-radius: 4px;
      box-shadow: 0 4px 12px rgba(0, 0, 0, 0.5);
      min-width: 160px;
      z-index: 10000;
      overflow: hidden;
    `;
    
    // 选项1: 更新字体信息
    const refreshOption = document.createElement('div');
    refreshOption.className = 'dropdown-option';
    refreshOption.textContent = '更新字体信息';
    refreshOption.style.cssText = `
      padding: 8px 12px;
      cursor: pointer;
      font-size: 11px;
      color: var(--text-primary);
      border-bottom: 1px solid var(--ai-border-idle);
      transition: background-color 0.15s ease, opacity 0.15s ease;
    `;
    refreshOption.addEventListener('mouseenter', () => {
      refreshOption.style.backgroundColor = 'rgba(255, 255, 255, 0.1)';
    });
    refreshOption.addEventListener('mouseleave', () => {
      refreshOption.style.backgroundColor = 'transparent';
    });
    refreshOption.addEventListener('mousedown', () => {
      refreshOption.style.opacity = '0.6';
    });
    refreshOption.addEventListener('mouseup', () => {
      refreshOption.style.opacity = '1';
    });
    refreshOption.addEventListener('click', async () => {
      fontToolDropdown.classList.add('hidden');
      addDebugLog('🔄 手动更新字体信息...', 'info');
      
      // 重新加载字体包
      const pack = await fontPackLoader.detectAndLoadUserFontPack();
      if (pack) {
        addDebugLog(`✅ 字体包已更新: ${pack.manifest.name}`, 'success');
        addDebugLog(`   buildId: ${(pack.manifest as any).buildId || 'N/A'}`, 'info');
        addDebugLog(`   创建时间: ${pack.manifest.createdAt}`, 'info');
        addDebugLog(`   字符数量: ${Object.keys(pack.fontdata).length}`, 'info');
        
        // 重新渲染字体选择器（使用已存在的实例）
        if (fontSelector) {
          fontSelector.render();
          console.log('[FontSelector] 手动刷新后已重新渲染');
        }
        
        // 如果有当前渲染的公式，重新渲染
        if (latexInput.value.trim() && fontPackLoader.getCurrentFontPack()) {
          addDebugLog('🔄 自动刷新预览', 'info');
          void handleRender();
        }
      } else {
        addDebugLog('ℹ️ 未检测到用户字体包', 'warning');
      }
    });
    fontToolDropdown.appendChild(refreshOption);
    
    // 选项2: 生成新字体
    const generateOption = document.createElement('div');
    generateOption.className = 'dropdown-option';
    generateOption.textContent = '生成新字体';
    generateOption.style.cssText = `
      padding: 8px 12px;
      cursor: pointer;
      font-size: 11px;
      color: var(--text-primary);
      transition: background-color 0.15s ease, opacity 0.15s ease;
    `;
    generateOption.addEventListener('mouseenter', () => {
      generateOption.style.backgroundColor = 'rgba(255, 255, 255, 0.1)';
    });
    generateOption.addEventListener('mouseleave', () => {
      generateOption.style.backgroundColor = 'transparent';
    });
    generateOption.addEventListener('mousedown', () => {
      generateOption.style.opacity = '0.6';
    });
    generateOption.addEventListener('mouseup', () => {
      generateOption.style.opacity = '1';
    });
    generateOption.addEventListener('click', async () => {
      fontToolDropdown.classList.add('hidden');
      const fontToolUrl = 'http://localhost:5175';
      
      try {
        // 如果在 CEP 环境中，调用启动脚本
        if (typeof window.cep !== 'undefined' && window.cep.util) {
          addDebugLog('🚀 正在启动字体包生成服务...', 'info');
          
          // 添加超时保护
          const timeoutPromise = new Promise<{ success: boolean; message: string }>((resolve) => {
            setTimeout(() => {
              resolve({
                success: false,
                message: '启动超时（20秒）'
              });
            }, 20000);
          });
          
          // 调用 JSX 脚本启动服务（带超时）
          const startResult = await Promise.race([
            illustratorBridge.startFontBuilder(),
            timeoutPromise
          ]);
          
          addDebugLog(`📋 启动结果: ${JSON.stringify(startResult)}`, 'info');
          
          if (startResult.success) {
            console.log('[FontTool] Font Builder 启动成功');
            addDebugLog('✅ 服务启动成功', 'success');
            
            // 如果消息中包含"直接打开浏览器"，说明使用了降级方案
            if (startResult.message.includes('直接打开浏览器')) {
              addDebugLog('ℹ️ 请手动启动服务: bash ~/Library/Application\\ Support/Adobe/CEP/extensions/MathFormulaPlugin/scripts/start-font-builder.sh', 'warning');
            }
          } else {
            console.warn('[FontTool] Font Builder 启动失败:', startResult.message);
            addDebugLog(`⚠️ 启动失败: ${startResult.message}`, 'warning');
            
            // 提供手动启动指引
            addDebugLog('💡 手动启动方法：', 'info');
            addDebugLog('1. 打开终端', 'info');
            addDebugLog('2. 运行: bash ~/Library/Application\\ Support/Adobe/CEP/extensions/MathFormulaPlugin/scripts/start-font-builder.sh', 'info');
            addDebugLog('3. 或直接在浏览器打开: http://localhost:5175', 'info');
          }
          
          addDebugLog('🔧 字体包生成工具已打开', 'info');
        } else {
          // 非 CEP 环境，直接打开
          window.open(fontToolUrl, '_blank');
          console.log('[FontTool] 已在新窗口中打开字体包工具');
          addDebugLog('🔧 已打开字体包生成工具', 'info');
        }
      } catch (error) {
        console.error('[FontTool] 操作失败:', error);
        addDebugLog(`❌ 操作失败: ${error instanceof Error ? error.message : String(error)}`, 'error');
        addDebugLog(`❌ 错误堆栈: ${error instanceof Error ? error.stack : 'N/A'}`, 'error');
      }
    });
    fontToolDropdown.appendChild(generateOption);
    
    // 将下拉菜单添加到按钮的父容器
    const fontToolContainer = fontToolBtn.parentElement;
    if (fontToolContainer) {
      fontToolContainer.style.position = 'relative';
      fontToolContainer.appendChild(fontToolDropdown);
    }
    
    // 按钮点击事件 - 切换下拉菜单
    fontToolBtn.addEventListener('click', (e) => {
      e.stopPropagation();
      fontToolDropdown.classList.toggle('hidden');
    });
    
    // 点击外部关闭下拉菜单
    document.addEventListener('click', (e) => {
      if (!fontToolDropdown.classList.contains('hidden')) {
        const target = e.target as HTMLElement;
        if (!fontToolBtn.contains(target) && !fontToolDropdown.contains(target)) {
          fontToolDropdown.classList.add('hidden');
        }
      }
    });
  }
  
  // 初始化字体选择器（等待字体包加载完成）
  const fontSelectorContainer = document.getElementById('font-selector-container');
  if (fontSelectorContainer) {
    fontSelector = new FontSelector(fontSelectorContainer, fontPackLoader);
    
    // 等待字体包加载完成后再渲染
    void fontPackLoadPromise.then(() => {
      // 渲染字体选择器
      fontSelector?.render();
      console.log('[FontSelector] 字体选择器已渲染');
    });
    
    // 设置字体切换回调
    fontSelector.onFontChange((useUserFont) => {
      console.log(`字体切换到: ${useUserFont ? '自主字体' : '默认字体'}`);
      
      // 如果有当前渲染的公式，重新渲染
      if (latexInput.value.trim()) {
        void handleRender();
      }
    });
    
    // 设置字体包更新回调（轮询检测到更新时触发）
    fontPackLoader.onFontPackUpdated(() => {
      console.log('[Polling] 检测到字体包更新，刷新字体选择器');
      addDebugLog('🔄 检测到字体包更新', 'success');
      
      // 重新渲染字体选择器以显示最新状态
      fontSelector?.render();
      
      // 如果有当前渲染的公式且用户字体是激活状态，自动刷新预览
      if (latexInput.value.trim() && fontPackLoader.getCurrentFontPack()) {
        console.log('[Polling] 自动刷新预览');
        addDebugLog('🔄 自动刷新预览', 'info');
        void handleRender();
      }
    });
  }

  // 监听输入框变化，递增 inputVersion 并清理旧状态，启动防抖自动预览
  latexInput.addEventListener('input', () => {
    currentInputVersion++;
    console.log(`[InputVersion] 输入变化，版本递增到: ${currentInputVersion}`);
    
    // 立即清理旧状态
    clearOldState();
    
    // 清除之前的防抖定时器
    if (renderDebounceTimer !== null) {
      clearTimeout(renderDebounceTimer);
    }
    
    // 显示"预览生成中..."状态
    if (latexInput.value.trim()) {
      showLoading();
    }
    
    // 设置新的防抖定时器（1000ms）
    renderDebounceTimer = window.setTimeout(() => {
      const latex = latexInput.value.trim();
      if (latex) {
        // 显示预览区
        if (previewSection) {
          previewSection.style.display = 'block';
        }
        void handleRender();
      }
    }, 1000);
  });

  // 清理旧状态的函数
  function clearOldState(): void {
    // 隐藏歧义提示
    ambiguityPrompt.hide();
    
    // 隐藏歧义对比界面
    ambiguityResolver.hide();
    
    // 隐藏降级提示
    fallbackPrompt.hide();
    
    // 隐藏格式选择器
    formatSelector.hide();
    
    // 清空错误提示
    hideError();
    
    console.log('[InputVersion] 旧状态已清理');
  }

  // 粘贴事件监听（粘贴时立即渲染，不使用防抖）
  latexInput.addEventListener('paste', (event: ClipboardEvent) => {
    // 清除防抖定时器（粘贴时立即渲染）
    if (renderDebounceTimer !== null) {
      clearTimeout(renderDebounceTimer);
      renderDebounceTimer = null;
    }
    void handlePaste(event);
  });

  // 刷新预览按钮事件（手动刷新）
  if (refreshPreviewBtn) {
    refreshPreviewBtn.addEventListener('click', () => {
      // 清除防抖定时器
      if (renderDebounceTimer !== null) {
        clearTimeout(renderDebounceTimer);
        renderDebounceTimer = null;
      }
      
      const latex = latexInput.value.trim();
      if (latex) {
        // 显示预览区
        if (previewSection) {
          previewSection.style.display = 'block';
        }
        void handleRender();
      } else {
        showError('请输入 LaTeX 公式');
      }
    });
  }
  
  // 键盘快捷键：Cmd/Ctrl+Enter 手动刷新预览
  latexInput.addEventListener('keydown', (event: KeyboardEvent) => {
    if ((event.metaKey || event.ctrlKey) && event.key === 'Enter') {
      event.preventDefault();
      
      // 清除防抖定时器
      if (renderDebounceTimer !== null) {
        clearTimeout(renderDebounceTimer);
        renderDebounceTimer = null;
      }
      
      const latex = latexInput.value.trim();
      if (latex) {
        // 显示预览区
        if (previewSection) {
          previewSection.style.display = 'block';
        }
        void handleRender();
      }
    }
  });

  // 粘贴处理函数
  async function handlePaste(event: ClipboardEvent): Promise<void> {
    // 阻止默认粘贴行为
    event.preventDefault();

    const clipboardData = event.clipboardData;
    if (!clipboardData) {
      return;
    }

    // 递增 inputVersion（粘贴也算输入变化）
    currentInputVersion++;
    const capturedVersion = currentInputVersion;
    console.log(`[InputVersion] 粘贴触发，版本: ${capturedVersion}`);

    // 立即清理旧状态
    clearOldState();

    // 归一化粘贴内容
    const normalizeResult = pasteNormalizer.normalize(clipboardData);

    if (!normalizeResult.success) {
      // 归一化失败，显示错误
      showError(normalizeResult.error || '无法提取纯文本内容');
      return;
    }

    const normalizedText = normalizeResult.text;

    // 显示加载状态
    showLoading();

    try {
      // 使用 FormulaParser 检测格式并转换
      const parseResult = await formulaParser.parse(normalizedText);

      // 版本校验：如果版本不一致，丢弃结果
      if (capturedVersion !== currentInputVersion) {
        console.log(`[InputVersion] 版本不一致，丢弃粘贴结果。捕获版本: ${capturedVersion}, 当前版本: ${currentInputVersion}`);
        return;
      }

      // 显示格式选择器（无论成功或失败）
      const availableFormats: FormatOption[] = [
        {
          value: FormulaFormat.LATEX,
          label: 'LaTeX',
          description: '标准 LaTeX 数学公式格式',
        },
        {
          value: FormulaFormat.UNICODEMATH,
          label: 'UnicodeMath',
          description: 'PowerPoint/Word 线性格式',
        },
        {
          value: FormulaFormat.ASCIIMATH,
          label: 'AsciiMath',
          description: '简化的 ASCII 数学表达式',
        },
      ];

      formatSelector.show(parseResult.format, availableFormats);

      // 设置格式切换回调
      formatSelector.onChange((newFormat) => {
        console.log(`用户切换格式到: ${newFormat}`);
        // 使用新格式重新解析
        void reParseWithFormat(normalizedText, newFormat);
      });

      if (!parseResult.success) {
        // 转换失败，显示降级提示
        const fallbackInfo: FallbackInfo = {
          inputType: parseResult.format || '未知格式',
          failureReason: parseResult.error || '格式转换失败',
          suggestions: [
            '尝试切换到 LaTeX 格式手动输入',
            '尝试使用 AsciiMath 格式（更简单的语法）',
            '检查粘贴内容是否包含富文本或 HTML 标签',
            '从纯文本编辑器（如记事本）复制内容',
          ],
          originalContent: normalizedText,
        };

        fallbackPrompt.show(fallbackInfo);

        // 设置格式切换回调
        fallbackPrompt.onSwitchFormat((format) => {
          console.log(`用户切换到格式: ${format}`);
          fallbackPrompt.hide();
          // 清空输入框，让用户手动输入
          latexInput.value = '';
          latexInput.focus();
        });

        // 设置手动编辑回调
        fallbackPrompt.onEdit(() => {
          // 保留原始内容在输入框中
          latexInput.value = normalizedText;
          latexInput.focus();
        });

        hideLoading();
        return;
      }

      // 转换成功，更新输入框为转换后的 LaTeX
      latexInput.value = parseResult.latex;

      // 如果存在歧义，显示歧义对比界面
      if (parseResult.ambiguous && parseResult.alternatives && parseResult.alternatives.length > 0) {
        console.log('检测到歧义:', parseResult.ambiguityType);

        // 创建候选项列表
        const candidates: AmbiguityCandidate[] = [
          {
            label: '默认解释',
            latex: parseResult.latex,
            description: '系统推荐的解释方式',
          },
          ...parseResult.alternatives.map((alt, index) => ({
            label: `备选解释 ${index + 1}`,
            latex: alt,
            description: '另一种可能的解释方式',
          })),
        ];

        // 显示歧义对比界面
        ambiguityResolver.show(normalizedText, candidates, 0);

        // 设置确认回调
        ambiguityResolver.onConfirm((selectedLatex) => {
          latexInput.value = selectedLatex;
          void handleRender();
        });

        // 设置取消回调
        ambiguityResolver.onCancelClick(() => {
          // 使用默认解释继续
          void handleRender();
        });

        // 渲染预览（带版本校验）
        await ambiguityResolver.renderPreviews(async (tex: string) => {
          // 版本校验：如果版本不一致，返回空字符串
          if (capturedVersion !== currentInputVersion) {
            console.log(`[InputVersion] 版本不一致，跳过预览渲染。捕获版本: ${capturedVersion}, 当前版本: ${currentInputVersion}`);
            return '';
          }
          
          // 获取当前字体数据（如果有）
          const fontdata = fontPackLoader.getCurrentFontdata();
          const result = await generator.renderLatex(tex, fontdata);
          
          // 再次校验版本（渲染完成后）
          if (capturedVersion !== currentInputVersion) {
            console.log(`[InputVersion] 版本不一致，丢弃预览结果。捕获版本: ${capturedVersion}, 当前版本: ${currentInputVersion}`);
            return '';
          }
          
          return result.svgString;
        });

        hideLoading();
        return;
      }

      // 自动触发渲染
      await handleRender();
    } catch (error) {
      const errorMsg = error instanceof Error ? error.message : String(error);
      showError(`粘贴处理失败：${errorMsg}`);
      // 保留原始内容
      latexInput.value = normalizedText;
      hideLoading();
    }
  }

  // 使用指定格式重新解析
  async function reParseWithFormat(text: string, _format: typeof FormulaFormat[keyof typeof FormulaFormat]): Promise<void> {
    showLoading();

    try {
      // 根据格式重新解析
      const parseResult = await formulaParser.parse(text);

      if (!parseResult.success) {
        showError(parseResult.error || '格式转换失败');
        latexInput.value = text;
        hideLoading();
        return;
      }

      // 更新输入框
      latexInput.value = parseResult.latex;

      // 自动触发渲染
      await handleRender();
    } catch (error) {
      const errorMsg = error instanceof Error ? error.message : String(error);
      showError(`格式转换失败：${errorMsg}`);
      hideLoading();
    }
  }

  // 渲染处理函数
  async function handleRender(): Promise<void> {
    const rawInput = latexInput.value.trim();

    if (!rawInput) {
      showError('请输入 LaTeX 公式');
      return;
    }

    // 捕获当前版本
    const capturedVersion = currentInputVersion;
    console.log(`[InputVersion] handleRender 开始，捕获版本: ${capturedVersion}`);

    // DEBUG: 输出当前输入
    console.log('=== handleRender DEBUG ===');
    console.log('rawInput:', rawInput);

    // 显示加载状态
    showLoading();

    try {
      // 使用原始输入作为 LaTeX（不进行格式转换）
      const latex = rawInput;

      // 1. 检测歧义
      const ambiguityContext: AmbiguityContext = {
        input: latex,
        latex: latex,
      };

      const ambiguityResult = ambiguityEngine.detect(ambiguityContext);

      // 版本校验：如果版本不一致，丢弃结果
      if (capturedVersion !== currentInputVersion) {
        console.log(`[InputVersion] 版本不一致，丢弃歧义检测结果。捕获版本: ${capturedVersion}, 当前版本: ${currentInputVersion}`);
        return;
      }

      // DEBUG: 输出歧义检测结果
      console.log('ambiguities detected:', ambiguityResult.ambiguities.length);

      // 2. 如果检测到歧义，显示歧义提示
      let renderLatex = latex; // 用于渲染的 LaTeX（可能是原始输入或默认候选项）
      
      if (ambiguityResult.ambiguities.length > 0) {
        ambiguityPrompt.show(ambiguityResult.ambiguities);

        // 使用默认候选项生成初始渲染的 LaTeX
        // 从后往前替换，避免索引偏移问题
        const sortedAmbiguities = [...ambiguityResult.ambiguities].sort(
          (a, b) => b.range.start - a.range.start
        );
        
        for (const ambiguity of sortedAmbiguities) {
          const defaultCandidate = ambiguity.candidates[ambiguity.defaultIndex];
          const replacementTex = defaultCandidate.replacementTex || defaultCandidate.tex;
          
          renderLatex = 
            renderLatex.substring(0, ambiguity.range.start) +
            replacementTex +
            renderLatex.substring(ambiguity.range.end);
        }

        console.log('=== 使用默认候选项渲染 ===');
        console.log('renderLatex (with defaults):', renderLatex);

        // 设置候选项选择回调
        ambiguityPrompt.onSelect((ambiguityIndex, candidateIndex) => {
          const ambiguity = ambiguityResult.ambiguities[ambiguityIndex];
          const selectedCandidate = ambiguity.candidates[candidateIndex];

          console.log(`=== 用户选择候选项 ===`);
          console.log(`ambiguityIndex: ${ambiguityIndex}, candidateIndex: ${candidateIndex}`);
          console.log(`selectedCandidate.label: ${selectedCandidate.label}`);

          // 使用 replacementTex 替换原输入中的歧义片段，生成完整公式
          const replacementTex = selectedCandidate.replacementTex || selectedCandidate.tex;
          const resolvedInput = 
            latex.substring(0, ambiguity.range.start) +
            replacementTex +
            latex.substring(ambiguity.range.end);

          // DEBUG: 输出替换结果
          console.log('=== 歧义替换 DEBUG ===');
          console.log('rawInput:', latex);
          console.log('range:', ambiguity.range);
          console.log('replacementTex:', replacementTex);
          console.log('resolvedInput:', resolvedInput);

          // 更新输入框为解析后的完整公式
          latexInput.value = resolvedInput;

          // DEBUG: 确认输入框已更新
          console.log('latexInput.value after update:', latexInput.value);

          // 隐藏歧义提示
          ambiguityPrompt.hide();

          // 重新执行完整的检测/解析/渲染流程
          void handleRender();
        });

        // 渲染预览（使用默认候选项，带版本校验）
        await renderPreviewsForAmbiguities(capturedVersion);
      }

      // 版本校验：如果版本不一致，丢弃结果
      if (capturedVersion !== currentInputVersion) {
        console.log(`[InputVersion] 版本不一致，丢弃渲染结果。捕获版本: ${capturedVersion}, 当前版本: ${currentInputVersion}`);
        return;
      }

      // 3. 使用 WebFormulaGenerator 渲染（使用默认候选项或原始输入）
      // DEBUG: 输出即将渲染的 LaTeX
      console.log('renderInput (final):', renderLatex);
      await renderWithLatex(renderLatex, capturedVersion);
    } catch (error) {
      const errorMsg = error instanceof Error ? error.message : String(error);
      showError(`渲染失败：${errorMsg}`);
    }
  }

  // 使用指定的 LaTeX 渲染公式（带版本校验）
  async function renderWithLatex(latex: string, capturedVersion: number): Promise<void> {
    try {
      // 获取当前字体数据（如果有）
      const fontdata = fontPackLoader.getCurrentFontdata();
      
      const result = await generator.renderLatex(latex, fontdata);

      // 版本校验：如果版本不一致，丢弃结果
      if (capturedVersion !== currentInputVersion) {
        console.log(`[InputVersion] 版本不一致，丢弃渲染结果。捕获版本: ${capturedVersion}, 当前版本: ${currentInputVersion}`);
        return;
      }

      // 检查是否有错误
      if (result.errors.length > 0) {
        showError(`渲染错误：${result.errors.join(', ')}`);
        return;
      }

      // 保存当前结果
      currentSVGResult = result;

      // 在 CEP 环境中显示标尺信息
      if (illustratorBridge.isInCEP() && result.calibrationData) {
        addDebugLog(`📏 标尺校准数据:`, 'info');
        addDebugLog(`  x-height: ${result.calibrationData.xHeight.toFixed(3)} (SVG 单位)`, 'info');
        addDebugLog(`  em size: ${result.calibrationData.emSize.toFixed(3)} (SVG 单位)`, 'info');
        addDebugLog(`  x-height/em ratio: ${result.calibrationData.xHeightToEmRatio.toFixed(4)}`, 'info');
      } else if (illustratorBridge.isInCEP() && !result.calibrationData) {
        addDebugLog(`⚠️ 未检测到标尺校准数据，将使用默认宽度缩放`, 'warning');
      }

      // 显示预览
      hideLoading();
      previewOutput.innerHTML = '';
      previewOutput.appendChild(result.svg.cloneNode(true));
      
      // 显示结果区（新 UI）
      showResultGroup();

      // 启用操作按钮
      downloadBtn.disabled = false;
      copyBtn.disabled = false;
      if (illustratorBridge.isInCEP()) {
        insertBtn.disabled = false;
      }

      // 隐藏错误消息
      hideError();
    } catch (error) {
      const errorMsg = error instanceof Error ? error.message : String(error);
      showError(`渲染失败：${errorMsg}`);
    }
  }

  // 为歧义候选项渲染预览（带版本校验）
  async function renderPreviewsForAmbiguities(capturedVersion: number): Promise<void> {
    try {
      await ambiguityPrompt.renderPreviews(async (tex: string) => {
        // 版本校验：如果版本不一致，返回空字符串
        if (capturedVersion !== currentInputVersion) {
          console.log(`[InputVersion] 版本不一致，跳过预览渲染。捕获版本: ${capturedVersion}, 当前版本: ${currentInputVersion}`);
          return '';
        }
        
        // 获取当前字体数据（如果有）
        const fontdata = fontPackLoader.getCurrentFontdata();
        const result = await generator.renderLatex(tex, fontdata);
        
        // 再次校验版本（渲染完成后）
        if (capturedVersion !== currentInputVersion) {
          console.log(`[InputVersion] 版本不一致，丢弃预览结果。捕获版本: ${capturedVersion}, 当前版本: ${currentInputVersion}`);
          return '';
        }
        
        return result.svgString;
      });
    } catch (error) {
      console.error('Failed to render ambiguity previews:', error);
    }
  }

  // 插入按钮事件
  insertBtn.addEventListener('click', () => {
    console.log('[Main] 插入按钮被点击');
    void handleInsertToIllustrator();
  });

  // CEP 诊断测试函数
  async function runCEPDiagnostics(): Promise<void> {
    addDebugLog('=== CEP 桥接诊断开始 ===', 'info');
    addDebugLog('', 'info');

    try {
      // 测试 1: CEP 环境检测
      addDebugLog('测试 1: CEP 环境检测', 'info');
      const isCEP = illustratorBridge.isInCEP();
      addDebugLog(`结果: ${isCEP ? '✓ 是 CEP 环境' : '✗ 不是 CEP 环境'}`, isCEP ? 'success' : 'error');
      addDebugLog('', 'info');

      if (!isCEP) {
        addDebugLog('❌ 不在 CEP 环境中，无法继续测试', 'error');
        return;
      }

      // 测试 2: 检查 CSInterface 和 __adobe_cep__
      addDebugLog('测试 2: 检查 CEP API 可用性', 'info');
      const hasCSInterface = typeof window.CSInterface !== 'undefined';
      const hasAdobeCEP = typeof window.__adobe_cep__ !== 'undefined';
      addDebugLog(`CSInterface: ${hasCSInterface ? '✓ 可用' : '✗ 不可用'}`, hasCSInterface ? 'success' : 'warning');
      addDebugLog(`__adobe_cep__: ${hasAdobeCEP ? '✓ 可用' : '✗ 不可用'}`, hasAdobeCEP ? 'success' : 'warning');
      addDebugLog('', 'info');

      // 测试 3: 执行最简单的 ExtendScript
      addDebugLog('测试 3: 执行简单的 ExtendScript', 'info');
      try {
        const simpleResult = await (illustratorBridge as any).evalScript('(function() { return "Hello from ExtendScript!"; })()');
        addDebugLog(`返回: ${simpleResult}`, 'success');
      } catch (error) {
        addDebugLog(`错误: ${error instanceof Error ? error.message : String(error)}`, 'error');
      }
      addDebugLog('', 'info');

      // 测试 4: 获取文档数量
      addDebugLog('测试 4: 获取 Illustrator 文档数量', 'info');
      try {
        const docCountResult = await (illustratorBridge as any).evalScript('(function() { try { return "文档数量: " + app.documents.length; } catch(e) { return "错误: " + e.message; } })()');
        addDebugLog(`返回: ${docCountResult}`, 'success');
      } catch (error) {
        addDebugLog(`错误: ${error instanceof Error ? error.message : String(error)}`, 'error');
      }
      addDebugLog('', 'info');

      // 测试 5: 调用 debugDocumentStatus
      addDebugLog('测试 5: 调用 debugDocumentStatus()', 'info');
      try {
        const debugStatus = await illustratorBridge.debugDocumentStatus();
        addDebugLog(`返回: ${debugStatus}`, 'success');
      } catch (error) {
        addDebugLog(`错误: ${error instanceof Error ? error.message : String(error)}`, 'error');
      }
      addDebugLog('', 'info');

      // 测试 6: 调用 checkDocument
      addDebugLog('测试 6: 调用 checkDocument()', 'info');
      try {
        const checkResult = await illustratorBridge.checkDocument();
        addDebugLog(`返回: ${JSON.stringify(checkResult, null, 2)}`, checkResult.hasDocument ? 'success' : 'warning');
        
        // 如果返回 false 但实际有文档，说明有问题
        if (!checkResult.hasDocument) {
          addDebugLog('⚠️ 注意：checkDocument 返回 false，但测试 4 显示有文档', 'warning');
          addDebugLog('这可能是 JSON 解析问题，请查看浏览器控制台的详细日志', 'warning');
        }
      } catch (error) {
        addDebugLog(`错误: ${error instanceof Error ? error.message : String(error)}`, 'error');
      }
      addDebugLog('', 'info');

      // 测试 7: 直接获取 evalScript 原始返回值
      addDebugLog('测试 7: 直接获取 checkDocument 的原始返回值（不使用JSON）', 'info');
      try {
        const rawScript = `
          (function() {
            try {
              var docCount = app.documents.length;
              if (docCount === 0) {
                $.sleep(150);
                docCount = app.documents.length;
                if (docCount === 0) {
                  return '{"hasDocument":false,"error":"ERR:NO_DOC docs=0","debug":"检测到 0 个文档（已重试）"}';
                }
              }
              var activeName = app.activeDocument.name;
              activeName = activeName.replace(/\\\\/g, "\\\\\\\\").replace(/"/g, '\\\\"');
              return '{"hasDocument":true,"docCount":' + docCount + ',"activeName":"' + activeName + '","debug":"检测到 ' + docCount + ' 个文档，当前文档: ' + activeName + '"}';
            } catch (error) {
              var errorMsg = error.message.replace(/\\\\/g, "\\\\\\\\").replace(/"/g, '\\\\"');
              return '{"hasDocument":false,"error":"ERR:EXCEPTION ' + errorMsg + '","debug":"文档检测异常: ' + errorMsg + '"}';
            }
          })();
        `;
        const rawResult = await (illustratorBridge as any).evalScript(rawScript);
        addDebugLog(`原始返回值: "${rawResult}"`, 'info');
        addDebugLog(`返回值类型: ${typeof rawResult}`, 'info');
        addDebugLog(`返回值长度: ${rawResult ? rawResult.length : 0}`, 'info');
        if (rawResult && rawResult.length > 0) {
          addDebugLog(`前 200 字符: ${rawResult.substring(0, 200)}`, 'info');
          // 尝试解析
          try {
            const parsed = JSON.parse(rawResult);
            addDebugLog(`✓ JSON 解析成功: ${JSON.stringify(parsed)}`, 'success');
          } catch (e) {
            addDebugLog(`✗ JSON 解析失败: ${e instanceof Error ? e.message : String(e)}`, 'error');
          }
        }
      } catch (error) {
        addDebugLog(`错误: ${error instanceof Error ? error.message : String(error)}`, 'error');
      }
      addDebugLog('', 'info');

      addDebugLog('=== CEP 桥接诊断完成 ===', 'success');
    } catch (error) {
      addDebugLog(`诊断过程出错: ${error instanceof Error ? error.message : String(error)}`, 'error');
    }
  }

  // 插入到 Illustrator 处理函数
  async function handleInsertToIllustrator(): Promise<void> {
    console.log('[Main] handleInsertToIllustrator 开始');
    addDebugLog('=== 开始插入 SVG 到 Illustrator ===', 'info');
    
    if (!currentSVGResult) {
      showError('没有可插入的 SVG');
      addDebugLog('错误: 没有可插入的 SVG', 'error');
      return;
    }

    // 获取目标字号
    const targetFontSize = fontSizeInput ? parseFloat(fontSizeInput.value) : 14;
    if (isNaN(targetFontSize) || targetFontSize <= 0) {
      showError('字号必须是正数');
      addDebugLog('错误: 字号无效', 'error');
      return;
    }

    // 显示加载状态
    const originalText = insertBtn.textContent;
    insertBtn.disabled = true;
    insertBtn.textContent = '插入中...';

    addDebugLog(`目标字号: ${targetFontSize} pt`, 'info');
    
    // 强制数值校验 ratio
    if (!currentSVGResult.calibrationData) {
      addDebugLog('✗ 错误: 未检测到标尺校准数据', 'error');
      showError('标尺校准数据缺失，无法应用字号统一。请重新渲染公式。');
      insertBtn.textContent = originalText;
      insertBtn.disabled = false;
      return;
    }
    
    const ratio = Number(currentSVGResult.calibrationData.xHeightToEmRatio);
    const fontPackName = fontPackLoader.getCurrentFontPack()?.manifest.name || '默认字体';
    
    // 校验 ratio 是否为有限数且在 (0, 1) 范围内
    if (!Number.isFinite(ratio) || ratio <= 0 || ratio >= 1) {
      addDebugLog(`✗ 错误: ratio 值无效: ${ratio}`, 'error');
      addDebugLog(`  来源: ${fontPackName}`, 'error');
      showError(`标尺校准数据异常 (ratio=${ratio})，无法应用字号统一。请检查字体包或重新渲染。`);
      insertBtn.textContent = originalText;
      insertBtn.disabled = false;
      return;
    }
    
    addDebugLog(`标尺校准数据:`, 'info');
    addDebugLog(`  x-height: ${currentSVGResult.calibrationData.xHeight.toFixed(3)} (SVG 单位)`, 'info');
    addDebugLog(`  x-height/em ratio: ${ratio.toFixed(4)}`, 'info');
    addDebugLog(`  来源: ${fontPackName}`, 'info');
    addDebugLog(`  → 将传递给 JSX: ratio=${ratio.toFixed(4)}`, 'info');

    try {
      addDebugLog('步骤 1: 检查文档状态...', 'info');
      console.log('[Main] 调用 insertSVG...');
      
      // 使用自定义的 insertSVG 方法，带调试日志和字号参数
      const result = await insertSVGWithDebug(currentSVGResult.svgString, targetFontSize);
      console.log('[Main] insertSVG 返回结果:', result);

      if (result.success) {
        // 显示成功提示
        addDebugLog('✓ SVG 已成功插入到文档', 'success');
        insertBtn.textContent = '✓ 已插入';
        setTimeout(() => {
          insertBtn.textContent = originalText;
          insertBtn.disabled = false;
        }, 2000);
      } else {
        // 显示错误提示
        console.error('[Main] 插入失败:', result.message);
        addDebugLog(`✗ 插入失败: ${result.message}`, 'error');
        showError(result.message);
        insertBtn.textContent = originalText;
        insertBtn.disabled = false;
      }
    } catch (error) {
      const errorMsg = error instanceof Error ? error.message : String(error);
      console.error('[Main] 插入异常:', errorMsg);
      addDebugLog(`✗ 插入异常: ${errorMsg}`, 'error');
      showError(`插入失败：${errorMsg}`);
      insertBtn.textContent = originalText;
      insertBtn.disabled = false;
    }
  }

  // 带调试日志的插入函数
  async function insertSVGWithDebug(svgString: string, targetFontSize: number): Promise<InsertResult> {
    let tempFilePath = '';
    
    try {
      // DEBUG: 检查 SVG 字符串中是否包含标尺
      if (svgString.includes('mf_calib_xheight')) {
        addDebugLog('✓ SVG 字符串包含标尺标记', 'success');
      } else {
        addDebugLog('✗ SVG 字符串不包含标尺标记', 'error');
      }
      
      // 1. 检查文档
      addDebugLog('检查 Illustrator 文档...', 'info');
      const docCheck = await illustratorBridge.checkDocument();
      if (!docCheck.hasDocument) {
        addDebugLog('✗ 没有打开的文档', 'error');
        return { success: false, message: '请先打开或创建一个 Illustrator 文档' };
      }
      addDebugLog('✓ 文档检查通过', 'success');

      // 2. 创建临时文件
      addDebugLog('步骤 2: 创建临时 SVG 文件...', 'info');
      tempFilePath = await createTempSVGFileWithDebug(svgString);
      addDebugLog(`✓ 临时文件已创建: ${tempFilePath}`, 'success');

      // 3. 验证文件
      addDebugLog('步骤 3: 验证文件是否存在...', 'info');
      const fileExists = await verifyFileExistsWithDebug(tempFilePath);
      if (!fileExists) {
        addDebugLog('✗ 文件验证失败', 'error');
        return { success: false, message: '临时文件创建失败或不存在' };
      }
      addDebugLog('✓ 文件验证通过', 'success');

      // 4. 插入 SVG（传递字号参数）
      addDebugLog('步骤 4: 插入 SVG 到文档（按字号统一缩放）...', 'info');
      addDebugLog(`插入参数: 路径=${tempFilePath}, 目标字号=${targetFontSize}pt`, 'info');
      const insertResult = await callInsertSVGWithDebug(tempFilePath, targetFontSize);
      
      // 5. 清理临时文件（根据标尺查找结果决定是否删除）
      if (insertResult.success) {
        if (insertResult.markerFound === false) {
          // 未找到标尺，保留文件以便手动检查
          addDebugLog('步骤 5: 未找到标尺，保留临时文件以便诊断', 'warning');
          addDebugLog(`⚠️ 临时文件路径: ${tempFilePath}`, 'warning');
          addDebugLog('  请手动检查 SVG 文件，查看标尺是否存在', 'info');
        } else {
          // 找到标尺，正常删除
          addDebugLog('步骤 5: 清理临时文件...', 'info');
          await deleteTempFileWithDebug(tempFilePath);
          addDebugLog('✓ 临时文件已删除', 'success');
        }
      } else {
        addDebugLog(`⚠️ 插入失败，保留临时文件以便手动验证: ${tempFilePath}`, 'warning');
      }

      return insertResult;
    } catch (error) {
      const errorMsg = error instanceof Error ? error.message : String(error);
      addDebugLog(`✗ 异常: ${errorMsg}`, 'error');
      if (tempFilePath) {
        addDebugLog(`⚠️ 临时文件路径: ${tempFilePath}`, 'warning');
      }
      return { success: false, message: `插入失败: ${errorMsg}` };
    }
  }

  // 创建临时文件（带调试）- 使用 Folder.userData 以提高稳定性
  async function createTempSVGFileWithDebug(svgString: string): Promise<string> {
    const timestamp = Date.now();
    const filename = `math-formula-${timestamp}.svg`;
    
    const escapedSvg = svgString
      .replace(/\\/g, '\\\\')
      .replace(/"/g, '\\"')
      .replace(/\n/g, '\\n')
      .replace(/\r/g, '\\r');
    
    const script = `
      (function() {
        try {
          // 使用 Folder.userData 而非 Folder.temp 以提高跨版本稳定性
          var userDataFolder = Folder.userData;
          var tempDir = new Folder(userDataFolder.fsName + "/MathFormulaPlugin");
          if (!tempDir.exists) {
            tempDir.create();
          }
          
          var tempFile = new File(tempDir.fsName + "/${filename}");
          
          tempFile.encoding = "UTF-8";
          tempFile.open("w");
          tempFile.write("${escapedSvg}");
          tempFile.close();
          
          // 规范化路径：使用 fsName 确保路径格式正确
          var normalizedPath = new File(tempFile.fsName).fsName;
          return '{"success":true,"path":"' + normalizedPath + '"}';
        } catch (error) {
          var errorMsg = error.message.replace(/\\\\/g, "\\\\\\\\").replace(/"/g, '\\\\"');
          return '{"success":false,"error":"' + errorMsg + '"}';
        }
      })();
    `;
    
    const result = await (illustratorBridge as any).evalScript(script);
    const parsed = JSON.parse(result) as { success: boolean; path?: string; error?: string };
    
    if (parsed.success && parsed.path) {
      return parsed.path;
    } else {
      throw new Error(parsed.error || '创建临时文件失败');
    }
  }

  // 验证文件存在（带调试）
  async function verifyFileExistsWithDebug(filePath: string): Promise<boolean> {
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
    
    const result = await (illustratorBridge as any).evalScript(script);
    const parsed = JSON.parse(result) as { exists: boolean; length?: number; path?: string; error?: string };
    
    if (parsed.error) {
      addDebugLog(`文件验证错误: ${parsed.error}`, 'error');
    } else {
      addDebugLog(`文件信息: 存在=${parsed.exists}, 大小=${parsed.length} bytes, 路径=${parsed.path}`, 'info');
    }
    
    return parsed.exists;
  }

  // 调用插入 SVG（带调试）- 使用分隔符协议传参 + 增强标尺查找
  async function callInsertSVGWithDebug(svgPath: string, targetFontSize: number): Promise<InsertResult> {
    const escapedPath = svgPath.replace(/\\/g, '/');
    
    // 获取 x-height/em 比例（从 calibrationData）
    const xHeightToEmRatio = currentSVGResult?.calibrationData?.xHeightToEmRatio ?? 0.45;
    
    // 使用分隔符协议传参：path||targetFontPt||ratio
    const params = `${escapedPath}||${targetFontSize}||${xHeightToEmRatio}`;
    
    const script = `
      (function() {
        // 解析分隔符协议参数
        var params = "${params}";
        var parts = params.split("||");
        var svgPath = parts[0];
        var targetFontPt = parseFloat(parts[1]);
        var xHeightToEmRatio = parseFloat(parts[2]);
        
        var methodUsed = "";
        var objectCount = 0;
        var errorLog = [];
        
        try {
          if (app.documents.length === 0) {
            return "ERR|NO_DOC|请先打开或创建一个 Illustrator 文档";
          }
          
          var doc = app.activeDocument;
          
          // 规范化文件路径
          var file = new File(svgPath);
          var normalizedFile = new File(file.fsName);
          
          if (!normalizedFile.exists) {
            return "ERR|FILE_NOT_FOUND|文件不存在: " + normalizedFile.fsName;
          }
          
          var insertedItem = null;
          var success = false;
          
          // ========== 方法 A: Open -> SelectAll -> Copy -> Close -> Paste ==========
          try {
            methodUsed = "A:OpenCopyPaste";
            
            // 打开 SVG 文件到临时文档
            var tempDoc = app.open(normalizedFile);
            
            // 全选
            tempDoc.selectObjectsOnActiveArtboard();
            if (tempDoc.selection.length === 0) {
              for (var i = 0; i < tempDoc.pageItems.length; i++) {
                tempDoc.pageItems[i].selected = true;
              }
            }
            
            // 复制
            app.copy();
            
            // 关闭临时文档（不保存）
            tempDoc.close(SaveOptions.DONOTSAVECHANGES);
            
            // 粘贴到目标文档
            app.paste();
            
            // 获取粘贴的对象（使用 selection 作为入口）
            if (doc.selection.length > 0) {
              // 如果有多个对象，创建组
              if (doc.selection.length > 1) {
                insertedItem = doc.groupItems.add();
                for (var i = doc.selection.length - 1; i >= 0; i--) {
                  doc.selection[i].moveToBeginning(insertedItem);
                }
              } else {
                insertedItem = doc.selection[0];
              }
              
              objectCount = doc.selection.length;
              success = true;
            }
          } catch (methodAError) {
            errorLog.push("方法A失败: " + methodAError.message);
            
            // ========== 方法 B: groupItems.createFromFile ==========
            try {
              methodUsed = "B:GroupItemsCreateFromFile";
              
              if (doc.groupItems && typeof doc.groupItems.createFromFile === 'function') {
                insertedItem = doc.groupItems.createFromFile(normalizedFile);
                objectCount = 1;
                success = true;
              } else {
                throw new Error("groupItems.createFromFile 不可用");
              }
            } catch (methodBError) {
              errorLog.push("方法B失败: " + methodBError.message);
              
              // ========== 方法 C: placedItems.add() + embed ==========
              try {
                methodUsed = "C:PlacedItemsAdd";
                
                var placedItem = doc.placedItems.add();
                placedItem.file = normalizedFile;
                placedItem.embed();
                
                insertedItem = placedItem;
                objectCount = 1;
                success = true;
              } catch (methodCError) {
                errorLog.push("方法C失败: " + methodCError.message);
                return "ERR|IMPORT_FAILED|" + errorLog.join("; ");
              }
            }
          }
          
          // 如果成功插入，查找标尺并按字号缩放
          if (success && insertedItem) {
            var ruler = null;
            var tag = null;
            
            // 统计信息（用于诊断）
            var totalItemsTraversed = 0;
            var allPathItems = [];
            var debugItems = [];
            
            // 递归收集所有 PathItem（包括 CompoundPathItem 内的 path）
            function collectAllPaths(item, depth) {
              if (!item) return;
              if (!depth) depth = 0;
              
              totalItemsTraversed++;
              
              // 记录前 30 个 item 的信息（用于诊断）
              if (debugItems.length < 30) {
                try {
                  var bounds = item.geometricBounds;
                  var w = bounds[2] - bounds[0];
                  var h = bounds[1] - bounds[3];
                  debugItems.push({
                    typename: item.typename,
                    w: w.toFixed(2),
                    h: h.toFixed(2)
                  });
                } catch (e) {
                  debugItems.push({
                    typename: item.typename,
                    w: "N/A",
                    h: "N/A"
                  });
                }
              }
              
              // 收集 PathItem 和 CompoundPathItem
              if (item.typename === "PathItem" || item.typename === "CompoundPathItem") {
                try {
                  var bounds = item.geometricBounds;
                  var w = bounds[2] - bounds[0];
                  var h = bounds[1] - bounds[3];
                  
                  if (w > 0 && h > 0) {
                    // 计算中心点
                    var centerX = (bounds[0] + bounds[2]) / 2;
                    var centerY = (bounds[1] + bounds[3]) / 2;
                    
                    allPathItems.push({
                      item: item,
                      w: w,
                      h: h,
                      area: w * h,
                      centerX: centerX,
                      centerY: centerY
                    });
                  }
                } catch (e) {}
              }
              
              // 递归查找子项（GroupItem）
              if (item.typename === "GroupItem" && item.pageItems) {
                for (var i = 0; i < item.pageItems.length; i++) {
                  collectAllPaths(item.pageItems[i], depth + 1);
                }
              }
              
              // 递归查找 CompoundPathItem 的子路径
              if (item.typename === "CompoundPathItem" && item.pathItems) {
                for (var i = 0; i < item.pathItems.length; i++) {
                  collectAllPaths(item.pathItems[i], depth + 1);
                }
              }
            }
            
            // 从 insertedItem 开始递归收集
            collectAllPaths(insertedItem, 0);
            
            // 步骤 1: 找到最小的近似正方形作为 tag
            var tagCandidate = null;
            var minArea = Infinity;
            
            for (var i = 0; i < allPathItems.length; i++) {
              var path = allPathItems[i];
              var maxDim = Math.max(path.w, path.h);
              var diff = Math.abs(path.w - path.h);
              
              // 近似正方形：abs(w-h) < 0.2*max(w,h)
              if (diff < 0.2 * maxDim && path.area < minArea) {
                tagCandidate = path;
                minArea = path.area;
              }
            }
            
            if (tagCandidate) {
              tag = tagCandidate.item;
              
              // 步骤 2: 找到高宽比最大的细长竖线，且与 tag 成对匹配
              var rulerCandidate = null;
              var maxAspect = 0;
              var minDistance = Infinity;
              
              for (var i = 0; i < allPathItems.length; i++) {
                var path = allPathItems[i];
                
                // 跳过 tag 本身
                if (path.item === tag) continue;
                
                // 细长竖线特征
                var aspect = path.h / Math.max(path.w, 0.001);
                var isTall = aspect > 20;
                var isTallerThanTag = path.h > tagCandidate.h * 10;
                
                if (isTall && isTallerThanTag) {
                  // 计算与 tag 中心点的距离
                  var dx = path.centerX - tagCandidate.centerX;
                  var dy = path.centerY - tagCandidate.centerY;
                  var distance = Math.sqrt(dx * dx + dy * dy);
                  
                  // 选择距离最近的高宽比最大的竖线
                  if (aspect > maxAspect || (aspect >= maxAspect * 0.8 && distance < minDistance)) {
                    rulerCandidate = path;
                    maxAspect = aspect;
                    minDistance = distance;
                  }
                }
              }
              
              if (rulerCandidate) {
                ruler = rulerCandidate.item;
              }
            }
            
            // 如果找到标尺，计算缩放并应用
            if (ruler && tag) {
              // 计算标尺高度（pt）
              var rulerBounds = ruler.geometricBounds;
              var markerHeightPt = rulerBounds[1] - rulerBounds[3];
              
              // 计算目标 x-height（pt）
              var targetXHeightPt = targetFontPt * xHeightToEmRatio;
              
              // 计算缩放比例
              var scale = targetXHeightPt / markerHeightPt;
              
              // 等比缩放整个公式组
              insertedItem.resize(scale * 100, scale * 100);
              
              // 删除 tag 和 ruler
              try {
                tag.remove();
              } catch (e) {}
              
              try {
                ruler.remove();
              } catch (e) {}
              
              // 设置位置为视图中心
              try {
                var view = doc.views[0];
                var centerX = view.centerPoint[0];
                var centerY = view.centerPoint[1];
                insertedItem.position = [centerX - insertedItem.width / 2, centerY + insertedItem.height / 2];
              } catch (e) {
                var artboard = doc.artboards[doc.artboards.getActiveArtboardIndex()];
                var artboardBounds = artboard.artboardRect;
                var centerX = (artboardBounds[0] + artboardBounds[2]) / 2;
                var centerY = (artboardBounds[1] + artboardBounds[3]) / 2;
                insertedItem.position = [centerX - insertedItem.width / 2, centerY + insertedItem.height / 2];
              }
              
              // 返回成功（格式：OK|method|marker=found|xHeightPt=X|targetXHeightPt=Y|scale=Z|ratio=R|items=N）
              return "OK|" + methodUsed + "|marker=found|xHeightPt=" + markerHeightPt.toFixed(2) + 
                     "|targetXHeightPt=" + targetXHeightPt.toFixed(2) + "|scale=" + (scale * 100).toFixed(1) + 
                     "|ratio=" + xHeightToEmRatio.toFixed(4) + "|items=" + objectCount;
            } else {
              // 未找到标尺 - 返回诊断信息
              var debugInfo = "selectionLen=" + objectCount + ";totalItems=" + totalItemsTraversed + 
                              ";pathItems=" + allPathItems.length + ";items=[";
              for (var i = 0; i < debugItems.length && i < 30; i++) {
                if (i > 0) debugInfo += ",";
                debugInfo += debugItems[i].typename + "(" + debugItems[i].w + "x" + debugItems[i].h + ")";
              }
              debugInfo += "]";
              
              return "OK|" + methodUsed + "|marker=none|xHeightPt=0|targetXHeightPt=0|scale=0|ratio=" + 
                     xHeightToEmRatio.toFixed(4) + "|items=" + objectCount + "|debug=" + debugInfo;
            }
          }
          
          return "ERR|NO_ITEM|未能获取插入的对象";
          
        } catch (error) {
          return "ERR|EXCEPTION|" + error.message;
        }
      })();
    `;
    
    const result = await (illustratorBridge as any).evalScript(script);
    
    // 添加原始返回值日志
    addDebugLog(`ExtendScript 原始返回值: ${result}`, 'info');
    
    // 解析纯文本返回（格式：OK|... 或 ERR|...）
    if (!result || typeof result !== 'string') {
      addDebugLog(`✗ 返回值无效`, 'error');
      return {
        success: false,
        message: '返回值无效'
      };
    }
    
    const parts = result.split('|');
    const status = parts[0];
    
    if (status === 'OK') {
      // 成功：OK|<method>|marker=<found/none>|xHeightPt=<pt>|targetXHeightPt=<pt>|scale=<percent>|ratio=<ratio>|items=<n>|debug=<info>
      const methodUsed = parts[1] || '未知';
      const markerPart = parts[2] || '';
      const xHeightPtPart = parts[3] || '';
      const targetXHeightPtPart = parts[4] || '';
      const scalePart = parts[5] || '';
      const ratioPart = parts[6] || '';
      const itemsPart = parts[7] || '';
      const debugPart = parts[8] || '';
      
      const markerFound = markerPart.includes('found');
      const xHeightPt = parseFloat(xHeightPtPart.replace('xHeightPt=', '')) || 0;
      const targetXHeightPt = parseFloat(targetXHeightPtPart.replace('targetXHeightPt=', '')) || 0;
      const scalePercent = parseFloat(scalePart.replace('scale=', '')) || 0;
      const ratio = parseFloat(ratioPart.replace('ratio=', '')) || 0;
      const items = parseInt(itemsPart.replace('items=', '')) || 0;
      
      addDebugLog(`✓ SVG 已导入到文档`, 'success');
      addDebugLog(`  方法: ${methodUsed}`, 'info');
      addDebugLog(`  对象数: ${items}`, 'info');
      
      if (markerFound) {
        addDebugLog(`  ✓ 找到标尺`, 'success');
        addDebugLog(`  目标字号 (em): ${targetFontSize}pt`, 'info');
        addDebugLog(`  x-height/em ratio: ${ratio.toFixed(4)} (panel传入: ${xHeightToEmRatio.toFixed(4)})`, 'info');
        addDebugLog(`  x-height (实际): ${xHeightPt.toFixed(2)}pt`, 'info');
        addDebugLog(`  x-height (目标): ${targetXHeightPt.toFixed(2)}pt`, 'info');
        addDebugLog(`  缩放比例: ${scalePercent.toFixed(1)}%`, 'info');
        addDebugLog(`  ✓ 字号统一已应用`, 'success');
      } else {
        // marker=none 视为失败
        addDebugLog(`  ✗ 标尺识别失败`, 'error');
        addDebugLog(`  本次未应用字号统一`, 'warning');
        
        // 输出诊断信息
        if (debugPart) {
          const debugInfo = debugPart.replace('debug=', '');
          addDebugLog(`  诊断信息: ${debugInfo}`, 'info');
        }
      }
      
      return {
        success: markerFound, // 只有找到标尺才算成功
        message: markerFound ? 'SVG 已成功插入并应用字号统一' : '标尺识别失败，本次未应用字号统一',
        markerFound
      };
    } else if (status === 'ERR') {
      // 失败：ERR|<code>|<detail>
      const errorCode = parts[1] || 'UNKNOWN';
      const errorDetail = parts[2] || '未知错误';
      
      addDebugLog(`✗ 插入失败: ${errorCode}`, 'error');
      addDebugLog(`  详情: ${errorDetail}`, 'error');
      
      return {
        success: false,
        message: `${errorCode}: ${errorDetail}`
      };
    } else {
      addDebugLog(`✗ 返回格式无效: ${result}`, 'error');
      return {
        success: false,
        message: `返回格式无效: ${result}`
      };
    }
  }

  // 删除临时文件（带调试）
  async function deleteTempFileWithDebug(filePath: string): Promise<void> {
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
    
    const result = await (illustratorBridge as any).evalScript(script);
    const parsed = JSON.parse(result) as { success: boolean; error?: string };
    
    if (!parsed.success) {
      addDebugLog(`删除文件失败: ${parsed.error}`, 'warning');
    }
  }

  // 下载按钮事件
  downloadBtn.addEventListener('click', () => {
    if (!currentSVGResult) {
      showError('没有可下载的 SVG');
      return;
    }

    const timestamp = Date.now();
    const filename = `formula_${timestamp}.svg`;
    generator.exportSVG(currentSVGResult.svg, filename);
  });

  // 复制按钮事件
  copyBtn.addEventListener('click', () => {
    if (!currentSVGResult) {
      showError('没有可复制的 SVG');
      return;
    }

    void navigator.clipboard.writeText(currentSVGResult.svgString).then(
      () => {
        // 临时显示成功提示
        const originalText = copyBtn.textContent;
        copyBtn.textContent = '✓ 已复制';
        setTimeout(() => {
          copyBtn.textContent = originalText;
        }, 2000);
      },
      (err) => {
        showError(`复制失败：${String(err)}`);
      }
    );
  });

  // 辅助函数
  function showLoading(): void {
    loadingIndicator.classList.remove('hidden');
    previewOutput.innerHTML = '';
    hideError();
  }

  function hideLoading(): void {
    loadingIndicator.classList.add('hidden');
  }

  function showError(message: string): void {
    errorMessage.textContent = message;
    errorMessage.classList.remove('hidden');
    previewOutput.innerHTML = '';
    hideLoading();
  }

  function hideError(): void {
    errorMessage.classList.add('hidden');
  }

  // 应用关闭时停止轮询
  window.addEventListener('beforeunload', () => {
    fontPackLoader.stopPolling();
    console.log('[Shutdown] 已停止字体包轮询机制');
  });
});
