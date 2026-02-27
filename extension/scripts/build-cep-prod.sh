#!/bin/bash

# CEP Production 模式构建脚本
# 用于将主工具构建产物打包到 CEP 扩展中，实现全离线运行

echo "=== CEP Production 模式构建脚本 ==="
echo ""

# 获取脚本所在目录的父目录（项目根目录）
SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
PROJECT_ROOT="$(dirname "$SCRIPT_DIR")"
EXTENSION_DIR="$PROJECT_ROOT/extension"

echo "项目根目录: $PROJECT_ROOT"
echo "扩展目录: $EXTENSION_DIR"
echo ""

# 步骤 1: 构建主工具
echo "步骤 1/5: 构建主工具..."
cd "$PROJECT_ROOT"
npm run build
if [ $? -ne 0 ]; then
    echo "❌ 构建失败！"
    exit 1
fi
echo "✓ 主工具构建完成"
echo ""

# 步骤 2: 复制构建产物到 CEP
echo "步骤 2/5: 复制构建产物到 CEP..."
rm -rf "$EXTENSION_DIR/client/dist"
mkdir -p "$EXTENSION_DIR/client/dist"
cp -r "$PROJECT_ROOT/dist/"* "$EXTENSION_DIR/client/dist/"
echo "✓ 构建产物已复制"
echo ""

# 步骤 3: 复制 MathJax 到 CEP
echo "步骤 3/5: 复制 MathJax 到 CEP..."
rm -rf "$EXTENSION_DIR/client/lib/mathjax"
mkdir -p "$EXTENSION_DIR/client/lib"
cp -r "$PROJECT_ROOT/node_modules/mathjax" "$EXTENSION_DIR/client/lib/"
echo "✓ MathJax 已复制"
echo ""

# 步骤 4: 复制字体包到 CEP
echo "步骤 4/5: 复制字体包到 CEP..."
rm -rf "$EXTENSION_DIR/client/dist/fonts"
mkdir -p "$EXTENSION_DIR/client/dist/fonts"

# 优先从 public/fonts 复制（Web 开发环境的字体包位置）
if [ -d "$PROJECT_ROOT/public/fonts" ]; then
    cp -r "$PROJECT_ROOT/public/fonts/"* "$EXTENSION_DIR/client/dist/fonts/"
    echo "✓ 字体包已从 public/fonts 复制"
# 备用：从 fonts 目录复制（如果存在）
elif [ -d "$PROJECT_ROOT/fonts" ]; then
    cp -r "$PROJECT_ROOT/fonts/"* "$EXTENSION_DIR/client/dist/fonts/"
    echo "✓ 字体包已从 fonts 复制"
else
    echo "⚠ 字体包目录不存在，跳过"
fi
echo ""

# 步骤 5: 复制 scripts 文件夹到 CEP
echo "步骤 5/6: 复制 scripts 文件夹到 CEP..."
rm -rf "$EXTENSION_DIR/scripts"
mkdir -p "$EXTENSION_DIR/scripts"
cp -r "$PROJECT_ROOT/scripts/"* "$EXTENSION_DIR/scripts/"
# 确保脚本有执行权限
chmod +x "$EXTENSION_DIR/scripts/"*.sh 2>/dev/null || true
echo "✓ scripts 文件夹已复制"
echo ""

# 步骤 6: 切换到 Prod 模式
echo "步骤 6/6: 切换到 Prod 模式..."
sed -i.bak "s/mode: 'dev'/mode: 'prod'/" "$EXTENSION_DIR/client/config.js"
rm -f "$EXTENSION_DIR/client/config.js.bak"
echo "✓ 已切换到 Prod 模式"
echo ""

echo "=== 构建完成！ ==="
echo ""
echo "下一步："
echo "1. 完全关闭 Adobe Illustrator"
echo "2. 重新启动 Illustrator"
echo "3. 打开扩展：窗口 > 扩展 > Math Formula Plugin"
echo "4. 现在扩展将离线运行，无需启动开发服务器"
echo ""
echo "注意："
echo "- Prod 模式使用本地构建产物，完全离线"
echo "- 如需切换回 Dev 模式，请手动编辑 extension/client/config.js"
echo "  将 mode: 'prod' 改为 mode: 'dev'"
echo ""
