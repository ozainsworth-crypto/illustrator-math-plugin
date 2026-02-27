// CEP 配置文件 - Dev/Prod 双模式支持
// 开发时设置 mode: 'prod'，发布时设置 mode: 'prod'

window.CEP_CONFIG = {
  // 模式：'dev' 或 'prod'
  // Dev: 指向 localhost:5174（Vite 开发服务器）
  // Prod: 使用本地构建产物（全离线）
  mode: 'prod', // 默认 dev，便于开发调试
  
  // Dev 模式配置
  dev: {
    appUrl: 'http://localhost:5174',
    hotReload: true,
    debugMode: true,
    // 允许跨域访问
    cors: true
  },
  
  // Prod 模式配置
  prod: {
    appUrl: './dist/index.html',
    localMathJax: './lib/mathjax',
    localFonts: './fonts',
    cacheEnabled: true,
    // 离线模式
    offline: true
  },
  
  // 可调参数配置
  params: {
    // 插入参数
    defaultWidth: 200,        // 插入宽度（pt）
    characterSpacing: 0,      // 字符间距调整（预留）
    positionOffset: {         // 位置偏移（预留）
      x: 0,
      y: 0
    },
    scale: 1.0,              // 缩放比例（预留）
    
    // 临时文件配置
    tempFilePrefix: 'math-formula-',
    tempFileExt: '.svg'
  },
  
  // 版本信息
  version: '1.0.0',
  buildDate: '2026-02-11'
};

// 导出配置（用于 TypeScript）
if (typeof module !== 'undefined' && module.exports) {
  module.exports = window.CEP_CONFIG;
}
