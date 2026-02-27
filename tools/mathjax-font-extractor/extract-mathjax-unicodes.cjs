#!/usr/bin/env node

/**
 * MathJax Unicode 字符集提取工具
 * 
 * 从 MathJax 库中提取所有被引用的 Unicode codepoints
 * 输出 unicodes.txt 和 report.json
 */

const fs = require('fs');
const path = require('path');

// 配置
const MATHJAX_PATH = path.join(__dirname, '../../node_modules/mathjax');
const OUTPUT_DIR = path.join(__dirname, 'output');
const UNICODES_FILE = path.join(OUTPUT_DIR, 'unicodes.txt');
const REPORT_FILE = path.join(OUTPUT_DIR, 'report.json');

// Unicode 范围定义
const UNICODE_RANGES = {
  'Basic Latin Digits': [0x0030, 0x0039],
  'Basic Latin Uppercase': [0x0041, 0x005A],
  'Basic Latin Lowercase': [0x0061, 0x007A],
  'Mathematical Operators': [0x2200, 0x22FF],
  'Mathematical Italic': [0x1D434, 0x1D467],
  'Greek Uppercase': [0x0391, 0x03A9],
  'Greek Lowercase': [0x03B1, 0x03C9],
  'Arrows': [0x2190, 0x21FF],
  'Miscellaneous Technical': [0x2300, 0x23FF],
};

// 关键符号
const KEY_SYMBOLS = {
  'U+002B': 'PLUS SIGN',
  'U+002D': 'HYPHEN-MINUS',
  'U+2212': 'MINUS SIGN',
  'U+00D7': 'MULTIPLICATION SIGN',
  'U+00F7': 'DIVISION SIGN',
  'U+003D': 'EQUALS SIGN',
  'U+0028': 'LEFT PARENTHESIS',
  'U+0029': 'RIGHT PARENTHESIS',
};

class MathJaxUnicodeExtractor {
  constructor() {
    this.unicodes = new Set();
    this.sources = {
      svg: new Set(),
      chtml: new Set(),
      tex: new Set(),
    };
  }

  /**
   * 从文件内容中提取 Unicode codepoints
   */
  extractUnicodesFromContent(content, source) {
    // 方法 1: 匹配 Unicode 十六进制表示 (U+XXXX, \uXXXX, 0xXXXX)
    const unicodePatterns = [
      /U\+([0-9A-F]{4,6})/gi,
      /\\u([0-9A-F]{4})/gi,
      /\\u\{([0-9A-F]{1,6})\}/gi,
      /0x([0-9A-F]{4,6})/gi,
      /&#x([0-9A-F]{4,6});/gi,
      /&#(\d{1,7});/g,
    ];

    unicodePatterns.forEach(pattern => {
      let match;
      while ((match = pattern.exec(content)) !== null) {
        let codepoint;
        if (pattern.source.includes('&#(\\d')) {
          // Decimal HTML entity
          codepoint = parseInt(match[1], 10);
        } else {
          // Hexadecimal
          codepoint = parseInt(match[1], 16);
        }
        
        if (codepoint >= 0x20 && codepoint <= 0x10FFFF) {
          this.unicodes.add(codepoint);
          this.sources[source].add(codepoint);
        }
      }
    });

    // 方法 2: 匹配字符串中的实际 Unicode 字符
    for (let i = 0; i < content.length; i++) {
      const codepoint = content.codePointAt(i);
      if (codepoint > 0x7F && codepoint <= 0x10FFFF) {
        this.unicodes.add(codepoint);
        this.sources[source].add(codepoint);
        
        // 跳过代理对的第二部分
        if (codepoint > 0xFFFF) {
          i++;
        }
      }
    }
  }

  /**
   * 递归扫描目录
   */
  scanDirectory(dir, source) {
    if (!fs.existsSync(dir)) {
      console.warn(`⚠️  目录不存在: ${dir}`);
      return;
    }

    const files = fs.readdirSync(dir);
    
    for (const file of files) {
      const filePath = path.join(dir, file);
      const stat = fs.statSync(filePath);
      
      if (stat.isDirectory()) {
        this.scanDirectory(filePath, source);
      } else if (file.endsWith('.js') || file.endsWith('.mjs') || file.endsWith('.cjs')) {
        try {
          const content = fs.readFileSync(filePath, 'utf8');
          this.extractUnicodesFromContent(content, source);
        } catch (error) {
          console.warn(`⚠️  无法读取文件: ${filePath}`);
        }
      }
    }
  }

  /**
   * 添加常用数学字符（确保覆盖）
   */
  addCommonMathCharacters() {
    // 基本 ASCII 数字和字母
    for (let i = 0x0030; i <= 0x0039; i++) this.unicodes.add(i); // 0-9
    for (let i = 0x0041; i <= 0x005A; i++) this.unicodes.add(i); // A-Z
    for (let i = 0x0061; i <= 0x007A; i++) this.unicodes.add(i); // a-z

    // Mathematical Italic (MathJax 常用)
    for (let i = 0x1D434; i <= 0x1D467; i++) this.unicodes.add(i); // A-Z, a-z italic

    // 基本运算符
    [0x002B, 0x002D, 0x002A, 0x002F, 0x003D, 0x003C, 0x003E].forEach(c => this.unicodes.add(c));
    
    // 数学运算符
    [0x2212, 0x00D7, 0x00F7, 0x00B1, 0x221A, 0x222B, 0x2211, 0x220F].forEach(c => this.unicodes.add(c));
    
    // 括号
    [0x0028, 0x0029, 0x005B, 0x005D, 0x007B, 0x007D].forEach(c => this.unicodes.add(c));
    
    // 希腊字母
    for (let i = 0x0391; i <= 0x03A9; i++) this.unicodes.add(i); // Α-Ω
    for (let i = 0x03B1; i <= 0x03C9; i++) this.unicodes.add(i); // α-ω
  }

  /**
   * 生成报告
   */
  generateReport() {
    const sortedUnicodes = Array.from(this.unicodes).sort((a, b) => a - b);
    
    // 按范围分组
    const rangeStats = {};
    for (const [rangeName, [start, end]] of Object.entries(UNICODE_RANGES)) {
      const inRange = sortedUnicodes.filter(u => u >= start && u <= end);
      rangeStats[rangeName] = {
        count: inRange.length,
        range: `U+${start.toString(16).toUpperCase().padStart(4, '0')}-U+${end.toString(16).toUpperCase().padStart(4, '0')}`,
        unicodes: inRange.map(u => `U+${u.toString(16).toUpperCase().padStart(4, '0')}`),
      };
    }

    // 检查关键符号
    const keySymbolsCoverage = {};
    for (const [unicode, name] of Object.entries(KEY_SYMBOLS)) {
      const codepoint = parseInt(unicode.substring(2), 16);
      keySymbolsCoverage[unicode] = {
        name,
        covered: this.unicodes.has(codepoint),
      };
    }

    // 源统计
    const sourceStats = {
      svg: this.sources.svg.size,
      chtml: this.sources.chtml.size,
      tex: this.sources.tex.size,
    };

    return {
      totalCount: sortedUnicodes.length,
      ranges: rangeStats,
      keySymbols: keySymbolsCoverage,
      sources: sourceStats,
      allUnicodes: sortedUnicodes.map(u => ({
        decimal: u,
        hex: `U+${u.toString(16).toUpperCase().padStart(4, '0')}`,
        char: String.fromCodePoint(u),
      })),
    };
  }

  /**
   * 保存结果
   */
  saveResults(report) {
    // 确保输出目录存在
    if (!fs.existsSync(OUTPUT_DIR)) {
      fs.mkdirSync(OUTPUT_DIR, { recursive: true });
    }

    // 保存 unicodes.txt (pyftsubset 格式)
    const sortedUnicodes = Array.from(this.unicodes).sort((a, b) => a - b);
    const unicodesText = sortedUnicodes
      .map(u => `U+${u.toString(16).toUpperCase().padStart(4, '0')}`)
      .join(',');
    
    fs.writeFileSync(UNICODES_FILE, unicodesText, 'utf8');
    console.log(`✅ 已保存 unicodes.txt: ${sortedUnicodes.length} 个字符`);

    // 保存 report.json
    fs.writeFileSync(REPORT_FILE, JSON.stringify(report, null, 2), 'utf8');
    console.log(`✅ 已保存 report.json`);
  }

  /**
   * 执行提取
   */
  async extract() {
    console.log('🔍 开始提取 MathJax Unicode 字符集...\n');

    // 扫描 SVG 输出
    console.log('📂 扫描 SVG 输出模块...');
    this.scanDirectory(path.join(MATHJAX_PATH, 'output'), 'svg');

    // 扫描 TeX 输入
    console.log('📂 扫描 TeX 输入模块...');
    this.scanDirectory(path.join(MATHJAX_PATH, 'input'), 'tex');

    // 添加常用字符
    console.log('➕ 添加常用数学字符...');
    this.addCommonMathCharacters();

    // 生成报告
    console.log('\n📊 生成报告...');
    const report = this.generateReport();

    // 保存结果
    this.saveResults(report);

    // 打印摘要
    console.log('\n' + '='.repeat(60));
    console.log('📈 提取摘要');
    console.log('='.repeat(60));
    console.log(`总字符数: ${report.totalCount}`);
    console.log(`\n按范围统计:`);
    for (const [rangeName, stats] of Object.entries(report.ranges)) {
      console.log(`  ${rangeName}: ${stats.count} 个字符 (${stats.range})`);
    }
    console.log(`\n关键符号覆盖:`);
    for (const [unicode, info] of Object.entries(report.keySymbols)) {
      const status = info.covered ? '✅' : '❌';
      console.log(`  ${status} ${unicode} ${info.name}`);
    }
    console.log(`\n数据源统计:`);
    console.log(`  SVG: ${report.sources.svg} 个字符`);
    console.log(`  CHTML: ${report.sources.chtml} 个字符`);
    console.log(`  TeX: ${report.sources.tex} 个字符`);
    console.log('='.repeat(60));
  }
}

// 执行
const extractor = new MathJaxUnicodeExtractor();
extractor.extract().catch(error => {
  console.error('❌ 提取失败:', error);
  process.exit(1);
});
