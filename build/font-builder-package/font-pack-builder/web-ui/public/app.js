/**
 * Font Pack Builder Web UI - Frontend JavaScript
 */

// DOM elements
const fontFileInput = document.getElementById('fontFile');
const fileInfoDiv = document.getElementById('fileInfo');
const fontNameInput = document.getElementById('fontName');
const convertBtn = document.getElementById('convertBtn');
const progressSection = document.getElementById('progressSection');
const progressBar = document.getElementById('progressBar');
const progressMessage = document.getElementById('progressMessage');
const resultSection = document.getElementById('resultSection');
const resultContent = document.getElementById('resultContent');
const dropZone = document.getElementById('dropZone');

// Summary elements
const summaryInput = document.getElementById('summaryInput');
const summaryOutput = document.getElementById('summaryOutput');
const summarySubsets = document.getElementById('summarySubsets');

// Charset checkboxes
const charsetOptional = document.getElementById('charsetOptional');
const charsetAdvanced = document.getElementById('charsetAdvanced');
const charsetTextSymbols = document.getElementById('charsetTextSymbols');

// History elements
const historyToggle = document.getElementById('historyToggle');
const historyContent = document.getElementById('historyContent');
const historyList = document.getElementById('historyList');
const historyCount = document.getElementById('historyCount');

// State
let selectedFile = null;

/**
 * 拖拽上传功能
 */
// 阻止默认拖拽行为
['dragenter', 'dragover', 'dragleave', 'drop'].forEach(eventName => {
  dropZone.addEventListener(eventName, preventDefaults, false);
  document.body.addEventListener(eventName, preventDefaults, false);
});

function preventDefaults(e) {
  e.preventDefault();
  e.stopPropagation();
}

// 拖拽悬停效果
['dragenter', 'dragover'].forEach(eventName => {
  dropZone.addEventListener(eventName, () => {
    dropZone.classList.add('drag-over');
  }, false);
});

['dragleave', 'drop'].forEach(eventName => {
  dropZone.addEventListener(eventName, () => {
    dropZone.classList.remove('drag-over');
  }, false);
});

// 处理文件拖放
dropZone.addEventListener('drop', (e) => {
  const files = e.dataTransfer.files;
  
  if (files.length > 0) {
    handleFileSelection(files[0]);
  }
}, false);

// 点击拖拽区域触发文件选择（但不包括 input 元素本身）
dropZone.addEventListener('click', (e) => {
  // 如果点击的是 input 元素本身，不做任何处理
  if (e.target === fontFileInput) {
    return;
  }
  fontFileInput.click();
});

// 键盘导航支持 - Enter 或 Space 键触发文件选择
dropZone.addEventListener('keydown', (e) => {
  if (e.key === 'Enter' || e.key === ' ') {
    e.preventDefault();
    fontFileInput.click();
  }
});

/**
 * 统一的文件选择处理函数
 */
function handleFileSelection(file) {
  if (!file) {
    selectedFile = null;
    fileInfoDiv.classList.add('hidden');
    convertBtn.disabled = true;
    convertBtn.setAttribute('aria-disabled', 'true');
    updateSummary();
    return;
  }
  
  // 验证文件类型
  const validExtensions = ['.ttf', '.otf'];
  const fileName = file.name.toLowerCase();
  const isValid = validExtensions.some(ext => fileName.endsWith(ext));
  
  if (!isValid) {
    alert('请选择有效的字体文件 (.ttf 或 .otf)');
    fontFileInput.value = '';
    selectedFile = null;
    fileInfoDiv.classList.add('hidden');
    convertBtn.disabled = true;
    convertBtn.setAttribute('aria-disabled', 'true');
    updateSummary();
    return;
  }
  
  // 显示文件信息
  selectedFile = file;
  const fileSizeMB = (file.size / (1024 * 1024)).toFixed(2);
  
  fileInfoDiv.innerHTML = `
    <strong>已选择文件:</strong><br>
    文件名: ${file.name}<br>
    大小: ${fileSizeMB} MB<br>
    类型: ${file.type || '未知'}
    ${file.size > 50 * 1024 * 1024 ? '<br><span style="color: #e67e22;">⚠️ 文件较大，转换可能需要较长时间</span>' : ''}
  `;
  fileInfoDiv.classList.remove('hidden');
  
  // 自动填充字体名称（如果为空）
  if (!fontNameInput.value) {
    const defaultName = file.name.replace(/\.(ttf|otf)$/i, '');
    fontNameInput.value = defaultName;
  }
  
  // 启用转换按钮
  convertBtn.disabled = false;
  convertBtn.setAttribute('aria-disabled', 'false');
  
  // 更新摘要
  updateSummary();
}

/**
 * 文件选择处理
 */
fontFileInput.addEventListener('change', (e) => {
  const file = e.target.files[0];
  handleFileSelection(file);
});

/**
 * 更新摘要卡片
 */
function updateSummary() {
  // 更新输入文件名
  if (summaryInput) {
    summaryInput.textContent = selectedFile ? selectedFile.name : 'NULL';
  }
  
  // 更新输出名称
  if (summaryOutput) {
    const outputName = fontNameInput.value.trim() || (selectedFile ? selectedFile.name.replace(/\.(ttf|otf)$/i, '') : 'AUTO_NAME');
    summaryOutput.textContent = outputName.toUpperCase();
  }
  
  // 更新字符集数量
  if (summarySubsets) {
    let count = 1; // base is always selected
    if (charsetOptional && charsetOptional.checked) count++;
    if (charsetAdvanced && charsetAdvanced.checked) count++;
    if (charsetTextSymbols && charsetTextSymbols.checked) count++;
    summarySubsets.textContent = `${count} SELECTED`;
  }
}

// 监听字体名称输入变化
if (fontNameInput) {
  fontNameInput.addEventListener('input', updateSummary);
}

// 监听字符集选项变化
[charsetOptional, charsetAdvanced, charsetTextSymbols].forEach(checkbox => {
  if (checkbox) {
    checkbox.addEventListener('change', updateSummary);
  }
});

/**
 * 转换按钮处理
 */
convertBtn.addEventListener('click', async () => {
  if (!selectedFile) {
    alert('请先选择字体文件');
    return;
  }
  
  const fontName = fontNameInput.value.trim() || selectedFile.name.replace(/\.(ttf|otf)$/i, '');
  
  // 【证据收集 A2】转换请求信息
  console.log('[Evidence] ========== Convert Button Clicked ==========');
  console.log('[Evidence] Selected file:', selectedFile.name);
  console.log('[Evidence] File size:', (selectedFile.size / (1024 * 1024)).toFixed(2), 'MB');
  console.log('[Evidence] Font name:', fontName);
  console.log('[Evidence] Charset options:', {
    enableOptional: charsetOptional.checked,
    enableAdvanced: charsetAdvanced.checked,
    enableTextSymbols: charsetTextSymbols.checked
  });
  console.log('[Evidence] Timestamp:', new Date().toISOString());
  console.log('[Evidence] ================================================');
  
  // 显示加载状态
  convertBtn.disabled = true;
  convertBtn.textContent = '转换中...';
  resultSection.classList.add('hidden');
  progressSection.classList.remove('hidden');
  progressBar.style.width = '0%';
  progressMessage.textContent = '准备中...';
  
  try {
    // 1. 上传文件
    updateProgress(5, '正在上传文件...');
    const uploadResult = await uploadFile(selectedFile);
    
    if (!uploadResult.success) {
      throw new Error(uploadResult.error || '文件上传失败');
    }
    
    // 2. 请求转换（异步）
    updateProgress(10, '正在创建转换任务...');
    const convertResult = await requestConversion(uploadResult.fileId, fontName);
    
    if (!convertResult.success) {
      throw new Error(convertResult.error || '转换请求失败');
    }
    
    // 3. 轮询进度
    await pollProgress(convertResult.jobId);
    
  } catch (error) {
    displayError(error.message);
    progressSection.classList.add('hidden');
  } finally {
    convertBtn.disabled = false;
    convertBtn.textContent = '开始转换';
  }
});

/**
 * 更新进度显示
 */
function updateProgress(progress, message) {
  progressBar.style.width = `${progress}%`;
  progressBar.textContent = `${progress}%`;
  progressMessage.textContent = message;
  
  // 更新 ARIA 属性
  const progressContainer = document.querySelector('.progress-bar-container');
  if (progressContainer) {
    progressContainer.setAttribute('aria-valuenow', progress);
    progressContainer.setAttribute('aria-valuetext', `${progress}% - ${message}`);
  }
}

/**
 * 轮询转换进度
 */
async function pollProgress(jobId) {
  const maxAttempts = 120; // 最多轮询 2 分钟（每秒一次）
  let attempts = 0;
  
  while (attempts < maxAttempts) {
    try {
      const response = await fetch(`/api/status/${jobId}`);
      const status = await response.json();
      
      if (!status.success) {
        throw new Error(status.error || '状态查询失败');
      }
      
      // 更新进度
      updateProgress(status.progress, status.message);
      
      // 检查状态
      if (status.status === 'completed') {
        // 转换完成
        progressSection.classList.add('hidden');
        displaySuccess(status.result);
        return;
      } else if (status.status === 'failed') {
        // 转换失败
        throw new Error(status.error || '转换失败');
      }
      
      // 等待 1 秒后继续轮询
      await new Promise(resolve => setTimeout(resolve, 1000));
      attempts++;
      
    } catch (error) {
      throw error;
    }
  }
  
  // 超时
  throw new Error('转换超时，请重试');
}

/**
 * 上传文件到服务器（带重试和进度反馈）
 */
async function uploadFile(file, retries = 3) {
  for (let attempt = 1; attempt <= retries; attempt++) {
    try {
      const formData = new FormData();
      formData.append('font', file);
      
      // 使用 XMLHttpRequest 以支持上传进度
      const result = await new Promise((resolve, reject) => {
        const xhr = new XMLHttpRequest();
        
        // 上传进度监听
        xhr.upload.addEventListener('progress', (e) => {
          if (e.lengthComputable) {
            const percentComplete = Math.round((e.loaded / e.total) * 100);
            const uploadProgress = Math.min(percentComplete * 0.05, 5); // 上传占总进度的 5%
            updateProgress(uploadProgress, `正在上传文件... ${percentComplete}%`);
          }
        });
        
        // 请求完成
        xhr.addEventListener('load', () => {
          if (xhr.status >= 200 && xhr.status < 300) {
            try {
              const response = JSON.parse(xhr.responseText);
              resolve(response);
            } catch (error) {
              reject(new Error('解析响应失败'));
            }
          } else {
            reject(new Error(`上传失败: HTTP ${xhr.status}`));
          }
        });
        
        // 请求错误
        xhr.addEventListener('error', () => {
          reject(new Error('网络错误'));
        });
        
        // 请求超时
        xhr.addEventListener('timeout', () => {
          reject(new Error('上传超时'));
        });
        
        // 配置请求
        xhr.open('POST', '/api/upload');
        xhr.timeout = 60000; // 60秒超时（大文件需要更长时间）
        
        // 发送请求
        xhr.send(formData);
      });
      
      // 返回结果
      return result;
      
    } catch (error) {
      console.error(`Upload attempt ${attempt} failed:`, error);
      
      if (attempt === retries) {
        // 最后一次尝试失败
        if (error.message.includes('超时')) {
          throw new Error('上传超时，请检查网络连接后重试');
        } else if (error.message.includes('网络错误')) {
          throw new Error('网络连接失败，请检查服务器是否运行');
        } else {
          throw error;
        }
      }
      
      // 等待后重试（指数退避）
      await new Promise(resolve => setTimeout(resolve, 1000 * attempt));
    }
  }
}

/**
 * 请求转换（带重试）
 */
async function requestConversion(fileId, fontName, retries = 3) {
  for (let attempt = 1; attempt <= retries; attempt++) {
    try {
      // 获取字符集选项
      const options = {
        enableOptional: charsetOptional.checked,
        enableAdvanced: charsetAdvanced.checked,
        enableTextSymbols: charsetTextSymbols.checked,
        baseOnly: !charsetOptional.checked && !charsetAdvanced.checked && !charsetTextSymbols.checked,
        enablePathCentering: false
      };
      
      // 【证据收集 A2】请求详情
      const requestUrl = window.location.origin + '/api/convert';
      console.log('[Evidence] ========== Conversion Request ==========');
      console.log('[Evidence] Request URL:', requestUrl);
      console.log('[Evidence] Request method: POST');
      console.log('[Evidence] Request body:', JSON.stringify({ fileId, fontName, options }, null, 2));
      console.log('[Evidence] Attempt:', attempt, '/', retries);
      console.log('[Evidence] =======================================');
      
      const controller = new AbortController();
      const timeoutId = setTimeout(() => controller.abort(), 10000); // 10秒超时
      
      const response = await fetch('/api/convert', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({
          fileId,
          fontName,
          options
        }),
        signal: controller.signal
      });
      
      clearTimeout(timeoutId);
      
      // 【证据收集 A2】响应详情
      console.log('[Evidence] ========== Conversion Response ==========');
      console.log('[Evidence] Response status:', response.status, response.statusText);
      console.log('[Evidence] Response headers:', Object.fromEntries(response.headers.entries()));
      
      if (!response.ok) {
        throw new Error(`HTTP ${response.status}: ${response.statusText}`);
      }
      
      const result = await response.json();
      console.log('[Evidence] Response body:', JSON.stringify(result, null, 2));
      console.log('[Evidence] ============================================');
      
      return result;
      
    } catch (error) {
      console.error(`[Evidence] Conversion request attempt ${attempt} failed:`, error);
      
      if (attempt === retries) {
        // 最后一次尝试失败
        if (error.name === 'AbortError') {
          throw new Error('请求超时，请重试');
        } else if (error.message.includes('Failed to fetch')) {
          throw new Error('网络连接失败，请检查服务器是否运行');
        } else {
          throw error;
        }
      }
      
      // 等待后重试（指数退避）
      await new Promise(resolve => setTimeout(resolve, 1000 * attempt));
    }
  }
}

/**
 * 显示成功结果
 */
function displaySuccess(result) {
  // 【证据收集 A2】成功结果信息
  console.log('[Evidence] ========== Display Success ==========');
  console.log('[Evidence] Result received:', {
    hasBuildInfo: !!result.buildInfo,
    hasManifest: !!result.manifest,
    hasReport: !!result.report
  });
  
  if (result.buildInfo) {
    console.log('[Evidence] Build Info:', {
      buildHash: result.buildInfo.buildHash.substring(0, 8),
      buildTime: result.buildInfo.buildTime,
      fontPackName: result.buildInfo.fontPackName,
      toolVersion: result.buildInfo.toolVersion,
      filesCount: result.buildInfo.files ? result.buildInfo.files.length : 0
    });
  }
  
  if (result.manifest) {
    console.log('[Evidence] Manifest:', {
      name: result.manifest.name,
      buildId: result.manifest.buildId,
      createdAt: result.manifest.createdAt,
      family: result.manifest.family
    });
  }
  console.log('[Evidence] ========================================');
  
  resultSection.classList.remove('hidden', 'error');
  
  const manifest = result.manifest;
  const report = result.report;
  
  // 构建字符集信息
  let charsetInfo = '<h4>启用的字符集:</h4><ul>';
  if (manifest.charsets.base) charsetInfo += '<li>✓ base (基础字符集)</li>';
  if (manifest.charsets.extendedMathDefault) charsetInfo += '<li>✓ extended-math-default</li>';
  if (manifest.charsets.extendedMathOptional) charsetInfo += '<li>✓ extended-math-optional</li>';
  if (manifest.charsets.extendedMathAdvanced) charsetInfo += '<li>✓ extended-math-advanced</li>';
  if (manifest.charsets.extendedTextSymbols) charsetInfo += '<li>✓ extended-text-symbols</li>';
  charsetInfo += '</ul>';
  
  // 构建统计信息
  let statsInfo = '';
  if (report && report.statistics) {
    const stats = report.statistics;
    statsInfo = `
      <h4>转换统计:</h4>
      <div class="stats-grid">
        <div class="stat-item">
          <span class="stat-label">总字符数:</span>
          <span class="stat-value">${stats.total}</span>
        </div>
        <div class="stat-item success">
          <span class="stat-label">成功:</span>
          <span class="stat-value">${stats.successful}</span>
        </div>
        <div class="stat-item warning">
          <span class="stat-label">失败:</span>
          <span class="stat-value">${stats.failed}</span>
        </div>
        <div class="stat-item info">
          <span class="stat-label">回退:</span>
          <span class="stat-value">${stats.fallback}</span>
        </div>
        ${stats.l3Skipped ? `
        <div class="stat-item">
          <span class="stat-label">跳过 (L3):</span>
          <span class="stat-value">${stats.l3Skipped}</span>
        </div>
        ` : ''}
      </div>
    `;
  }
  
  // 构建失败字符列表
  let failuresInfo = '';
  if (manifest.failures && manifest.failures.length > 0) {
    failuresInfo = `
      <details class="expandable-section">
        <summary>失败字符 (${manifest.failures.length})</summary>
        <div class="char-list warning">
          ${manifest.failures.map(char => `<span class="char-item">${char}</span>`).join('')}
        </div>
      </details>
    `;
  }
  
  // 构建回退字符列表
  let fallbacksInfo = '';
  if (manifest.fallbacks && manifest.fallbacks.length > 0) {
    fallbacksInfo = `
      <details class="expandable-section">
        <summary>回退字符 (${manifest.fallbacks.length})</summary>
        <div class="char-list info">
          ${manifest.fallbacks.map(char => `<span class="char-item">${char}</span>`).join('')}
      </div>
      </details>
    `;
  }
  
  // 构建 build-info 显示（关键护栏 1）
  let buildInfoHtml = '';
  if (result.buildInfo) {
    const buildInfo = result.buildInfo;
    const buildHashShort = buildInfo.buildHash.substring(0, 8);
    const buildTime = new Date(buildInfo.buildTime).toLocaleString('zh-CN');
    const fileList = buildInfo.files.map(f => `<li>${f.name} (${(f.size / 1024).toFixed(1)} KB)</li>`).join('');
    
    buildInfoHtml = `
      <details class="expandable-section">
        <summary>构建信息 (Build Info)</summary>
        <div class="build-info">
          <p><strong>构建 Hash:</strong> <code>${buildHashShort}</code></p>
          <p><strong>构建时间:</strong> ${buildTime}</p>
          <p><strong>工具版本:</strong> ${buildInfo.toolVersion}</p>
          <p><strong>输出文件:</strong></p>
          <ul class="file-list">${fileList}</ul>
        </div>
      </details>
    `;
  }
  
  // 构建报告链接（固定为 user-font-pack 目录）
  const reportLink = report ? `
    <div class="report-link">
      <p>
        <strong>详细报告:</strong> 查看 <code>user-font-pack/report.json</code>
        <button class="btn-open-folder" data-path="user-font-pack" title="打开文件夹">
          →
        </button>
      </p>
    </div>
  ` : '';
  
  resultContent.innerHTML = `
    <div class="result-success">
      <div class="result-section-title">
        <span></span>
        <span>转换结果</span>
        <span></span>
      </div>
      <h3>✓ 转换成功</h3>
      
      <div class="info-grid">
        <div class="info-item">
          <span class="info-label">字体包名称:</span>
          <span class="info-value">${manifest.name}</span>
        </div>
        <div class="info-item">
          <span class="info-label">版本:</span>
          <span class="info-value">${manifest.version}</span>
        </div>
        <div class="info-item">
          <span class="info-label">构建 ID:</span>
          <span class="info-value"><code>${manifest.buildId}</code></span>
        </div>
        <div class="info-item">
          <span class="info-label">字体族:</span>
          <span class="info-value">${manifest.family}</span>
        </div>
        <div class="info-item">
          <span class="info-label">格式:</span>
          <span class="info-value">${manifest.format}</span>
        </div>
        <div class="info-item">
          <span class="info-label">创建时间:</span>
          <span class="info-value">${new Date(manifest.createdAt).toLocaleString('zh-CN')}</span>
        </div>
      </div>
      
      ${statsInfo}
      ${buildInfoHtml}
      ${failuresInfo}
      ${fallbacksInfo}
      ${reportLink}
    </div>
  `;
  
  // 添加打开文件夹按钮的事件监听
  const openFolderBtns = resultContent.querySelectorAll('.btn-open-folder');
  openFolderBtns.forEach(btn => {
    btn.addEventListener('click', async (e) => {
      e.preventDefault();
      const folderPath = btn.getAttribute('data-path');
      try {
        const response = await fetch('/api/open-folder', {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json'
          },
          body: JSON.stringify({ path: folderPath })
        });
        
        const result = await response.json();
        if (!result.success) {
          alert('无法打开文件夹: ' + (result.error || '未知错误'));
        }
      } catch (error) {
        console.error('Failed to open folder:', error);
        alert('打开文件夹失败: ' + error.message);
      }
    });
  });
}

/**
 * 显示错误信息
 */
function displayError(message, details = null, suggestions = []) {
  resultSection.classList.remove('hidden');
  resultSection.classList.add('error');
  
  // 构建技术细节（可折叠）
  let detailsHtml = '';
  if (details) {
    detailsHtml = `
      <details class="error-details">
        <summary>技术细节</summary>
        <pre>${details}</pre>
      </details>
    `;
  }
  
  // 构建解决建议
  let suggestionsHtml = '';
  if (suggestions && suggestions.length > 0) {
    suggestionsHtml = `
      <div class="error-suggestions">
        <h4>解决建议:</h4>
        <ul>
          ${suggestions.map(s => `<li>${s}</li>`).join('')}
        </ul>
      </div>
    `;
  }
  
  // 默认建议
  if (!suggestions || suggestions.length === 0) {
    suggestionsHtml = `
      <div class="error-suggestions">
        <h4>可能的解决方案:</h4>
        <ul>
          <li>检查字体文件是否有效（.ttf 或 .otf 格式）</li>
          <li>确保字体文件未损坏</li>
          <li>尝试使用其他字体文件</li>
          <li>查看浏览器控制台获取更多信息</li>
        </ul>
      </div>
    `;
  }
  
  resultContent.innerHTML = `
    <div class="result-error">
      <h3>✗ 转换失败</h3>
      <div class="error-message">
        <strong>错误信息:</strong>
        <p>${message}</p>
      </div>
      ${detailsHtml}
      ${suggestionsHtml}
      <div class="error-actions">
        <button id="retryBtn" class="btn-retry">重试</button>
      </div>
    </div>
  `;
  
  // 添加重试按钮事件
  const retryBtn = document.getElementById('retryBtn');
  if (retryBtn) {
    retryBtn.addEventListener('click', () => {
      resultSection.classList.add('hidden');
      convertBtn.click();
    });
  }
}


/**
 * 历史记录折叠功能
 */
if (historyToggle) {
  historyToggle.addEventListener('click', () => {
    const isExpanded = historyToggle.getAttribute('aria-expanded') === 'true';
    historyToggle.setAttribute('aria-expanded', !isExpanded);
    
    if (historyContent) {
      if (isExpanded) {
        historyContent.classList.add('hidden');
      } else {
        historyContent.classList.remove('hidden');
      }
    }
  });
}

/**
 * 历史记录功能
 */

// DOM 元素
const refreshHistoryBtn = document.getElementById('refreshHistoryBtn');
const clearHistoryBtn = document.getElementById('clearHistoryBtn');
const clearCacheBtn = document.getElementById('clearCacheBtn');

/**
 * 加载历史记录
 */
async function loadHistory() {
  try {
    const response = await fetch('/api/history');
    const data = await response.json();
    
    if (!data.success) {
      throw new Error(data.error || '加载历史记录失败');
    }
    
    displayHistory(data.records);
    
  } catch (error) {
    console.error('Failed to load history:', error);
    historyContent.innerHTML = '<p class="history-empty">加载历史记录失败</p>';
  }
}

/**
 * 显示历史记录列表
 */
function displayHistory(records) {
  // 更新计数
  if (historyCount) {
    historyCount.textContent = `${records ? records.length : 0} ITEMS`;
  }
  
  if (!historyList) return;
  
  if (!records || records.length === 0) {
    historyList.innerHTML = '<p class="history-empty">暂无转换历史</p>';
    return;
  }
  
  const listHtml = records.map(record => {
    const date = new Date(record.timestamp);
    const timeStr = date.toLocaleString('zh-CN');
    const fileSizeMB = (record.fileSize / (1024 * 1024)).toFixed(2);
    
    const statusClass = record.status === 'success' ? 'success' : 'failed';
    const statusText = record.status === 'success' ? '成功' : '失败';
    
    return `
      <div class="history-item ${statusClass}" data-id="${record.id}">
        <div class="history-item-header">
          <div class="history-item-title">${record.fontName}</div>
          <div class="history-item-status ${statusClass}">${statusText}</div>
        </div>
        <div class="history-item-info">
          <span>📄 ${record.fileName}</span>
          <span>💾 ${fileSizeMB} MB</span>
        </div>
        <div class="history-item-time">🕐 ${timeStr}</div>
      </div>
    `;
  }).join('');
  
  historyList.innerHTML = listHtml;
  
  // 添加点击事件
  document.querySelectorAll('.history-item').forEach(item => {
    item.addEventListener('click', () => {
      const id = item.dataset.id;
      showHistoryDetail(id);
    });
  });
}

/**
 * 显示历史记录详情
 */
async function showHistoryDetail(id) {
  try {
    const response = await fetch(`/api/history/${id}`);
    const data = await response.json();
    
    if (!data.success) {
      throw new Error(data.error || '加载详情失败');
    }
    
    const record = data.record;
    
    // 创建模态框
    const modal = document.createElement('div');
    modal.className = 'history-detail-modal show';
    modal.innerHTML = `
      <div class="history-detail-content">
        <button class="history-detail-close">&times;</button>
        <h3>${record.fontName}</h3>
        <div class="history-item-time">转换时间: ${new Date(record.timestamp).toLocaleString('zh-CN')}</div>
        <hr style="margin: 20px 0; border: none; border-top: 1px solid #ddd;">
        
        <h4>文件信息</h4>
        <p>文件名: ${record.fileName}</p>
        <p>文件大小: ${(record.fileSize / (1024 * 1024)).toFixed(2)} MB</p>
        <p>状态: <span class="history-item-status ${record.status}">${record.status === 'success' ? '成功' : '失败'}</span></p>
        
        <h4>字符集选项</h4>
        <ul>
          <li>基础字符集: ✓</li>
          ${record.options.enableOptional ? '<li>可选数学符号: ✓</li>' : ''}
          ${record.options.enableAdvanced ? '<li>高级数学符号: ✓</li>' : ''}
          ${record.options.enableTextSymbols ? '<li>文本符号: ✓</li>' : ''}
        </ul>
        
        ${record.status === 'success' && record.result ? `
          <h4>转换结果</h4>
          <p>字体包名称: ${record.result.manifest.name}</p>
          <p>版本: ${record.result.manifest.version}</p>
          <p>字体族: ${record.result.manifest.family}</p>
        ` : ''}
        
        ${record.status === 'failed' && record.error ? `
          <h4>错误信息</h4>
          <div class="error-message">
            <p>${record.error}</p>
          </div>
        ` : ''}
      </div>
    `;
    
    document.body.appendChild(modal);
    
    // 关闭按钮事件
    modal.querySelector('.history-detail-close').addEventListener('click', () => {
      modal.remove();
    });
    
    // 点击背景关闭
    modal.addEventListener('click', (e) => {
      if (e.target === modal) {
        modal.remove();
      }
    });
    
  } catch (error) {
    console.error('Failed to load history detail:', error);
    alert('加载详情失败: ' + error.message);
  }
}

/**
 * 清空历史记录
 */
async function clearHistory() {
  if (!confirm('确定要清空所有历史记录吗？此操作不可恢复。')) {
    return;
  }
  
  try {
    const response = await fetch('/api/history', {
      method: 'DELETE'
    });
    
    const data = await response.json();
    
    if (!data.success) {
      throw new Error(data.error || '清空历史记录失败');
    }
    
    // 重新加载历史记录
    await loadHistory();
    
  } catch (error) {
    console.error('Failed to clear history:', error);
    alert('清空历史记录失败: ' + error.message);
  }
}

/**
 * 清除缓存功能
 */
async function clearCache() {
  if (!confirm('确定要清除所有转换缓存吗？此操作不可恢复。')) {
    return;
  }
  
  try {
    const response = await fetch('/api/cache', {
      method: 'DELETE'
    });
    
    const data = await response.json();
    
    if (!data.success) {
      throw new Error(data.error || '清除缓存失败');
    }
    
    alert('缓存已清除');
    
  } catch (error) {
    console.error('Failed to clear cache:', error);
    alert('清除缓存失败: ' + error.message);
  }
}

// 事件监听
refreshHistoryBtn.addEventListener('click', loadHistory);
clearHistoryBtn.addEventListener('click', clearHistory);
clearCacheBtn.addEventListener('click', clearCache);

// 页面加载时加载历史记录和初始化摘要
window.addEventListener('DOMContentLoaded', () => {
  // 【证据收集 A2】页面加载信息
  console.log('[Evidence] ========== Page Load ==========');
  console.log('[Evidence] Page URL:', window.location.href);
  console.log('[Evidence] Page protocol:', window.location.protocol);
  console.log('[Evidence] Page loaded at:', new Date().toISOString());
  console.log('[Evidence] User agent:', navigator.userAgent);
  console.log('[Evidence] =====================================');
  
  loadHistory();
  updateSummary();
});

// 转换完成后刷新历史记录
const originalDisplaySuccess = displaySuccess;
displaySuccess = function(result) {
  originalDisplaySuccess(result);
  loadHistory();
};

const originalDisplayError = displayError;
displayError = function(message, details, suggestions) {
  originalDisplayError(message, details, suggestions);
  loadHistory();
};
