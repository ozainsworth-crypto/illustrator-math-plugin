#!/bin/bash

# MathJax 字符集提取 + OTF 子集化 - 一键执行脚本

set -e  # 遇到错误立即退出

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
cd "$SCRIPT_DIR"

echo "========================================"
echo "MathJax 字符集提取 + OTF 子集化工具链"
echo "========================================"
echo ""

# 检查 Node.js
if ! command -v node &> /dev/null; then
    echo "❌ Node.js 未安装"
    echo "   请先安装 Node.js"
    exit 1
fi

# 检查 Python
if ! command -v python3 &> /dev/null; then
    echo "❌ Python 3 未安装"
    echo "   请先安装 Python 3"
    exit 1
fi

# 检查 pyftsubset
if ! command -v pyftsubset &> /dev/null; then
    echo "❌ pyftsubset 未安装"
    echo ""
    echo "安装方法:"
    echo "  pip3 install fonttools"
    echo ""
    exit 1
fi

# 检查字体文件
if [ ! -f "fonts/latinmodern-math.otf" ]; then
    echo "❌ 字体文件不存在: fonts/latinmodern-math.otf"
    echo ""
    echo "请先下载字体:"
    echo "  mkdir -p fonts"
    echo "  curl -o fonts/latinmodern-math.otf \\"
    echo "    http://www.gust.org.pl/projects/e-foundry/lm-math/download/latinmodern-math-1959.otf"
    echo ""
    exit 1
fi

echo "✅ 所有依赖检查通过"
echo ""

# 步骤 1: 提取 Unicode
echo "========================================"
echo "步骤 1: 提取 MathJax Unicode 字符集"
echo "========================================"
echo ""
node extract-mathjax-unicodes.cjs

echo ""
echo "========================================"
echo "步骤 2: 字体子集化"
echo "========================================"
echo ""
python3 subset-otf.py

echo ""
echo "========================================"
echo "✅ 完成!"
echo "========================================"
echo ""
echo "输出文件:"
echo "  - output/unicodes.txt"
echo "  - output/report.json"
echo "  - output/latinmodern-math.mathjax-subset.otf"
echo "  - output/USAGE.md"
echo ""
echo "下一步:"
echo "  1. 查看报告: cat output/report.json | python3 -m json.tool"
echo "  2. 编辑字体: fontforge output/latinmodern-math.mathjax-subset.otf"
echo "  3. 生成字体包: cd ../font-pack-builder && ./转换字体.command"
echo ""
