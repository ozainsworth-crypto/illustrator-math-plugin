#!/bin/bash

# 测试脚本 - 验证 convert-font.sh 的基本功能

echo "🧪 测试 Font Pack Builder 脚本"
echo "================================"
echo ""

# 测试 1: 检查脚本文件存在
echo "测试 1: 检查脚本文件..."
if [ -f "convert-font.sh" ]; then
    echo "✅ convert-font.sh 存在"
else
    echo "❌ convert-font.sh 不存在"
    exit 1
fi

# 测试 2: 检查脚本可执行权限
echo ""
echo "测试 2: 检查可执行权限..."
if [ -x "convert-font.sh" ]; then
    echo "✅ convert-font.sh 有可执行权限"
else
    echo "⚠️  convert-font.sh 没有可执行权限，正在添加..."
    chmod +x convert-font.sh
    echo "✅ 已添加可执行权限"
fi

# 测试 3: 检查 Node.js
echo ""
echo "测试 3: 检查 Node.js 环境..."
if command -v node &> /dev/null; then
    NODE_VERSION=$(node --version)
    echo "✅ Node.js 已安装: $NODE_VERSION"
else
    echo "❌ Node.js 未安装"
    echo "   请访问 https://nodejs.org/ 安装"
    exit 1
fi

# 测试 4: 检查依赖
echo ""
echo "测试 4: 检查依赖..."
if [ -d "node_modules" ]; then
    echo "✅ 依赖已安装"
else
    echo "⚠️  依赖未安装，正在安装..."
    npm install
    if [ $? -eq 0 ]; then
        echo "✅ 依赖安装成功"
    else
        echo "❌ 依赖安装失败"
        exit 1
    fi
fi

# 测试 5: 检查 build.js
echo ""
echo "测试 5: 检查 build.js..."
if [ -f "build.js" ]; then
    echo "✅ build.js 存在"
else
    echo "❌ build.js 不存在"
    exit 1
fi

# 测试 6: 检查输出目录路径
echo ""
echo "测试 6: 检查输出目录路径..."
OUTPUT_DIR="../../public/fonts/user-font-pack"
if [ -d "../../public/fonts" ]; then
    echo "✅ public/fonts 目录存在"
else
    echo "⚠️  public/fonts 目录不存在，将在转换时创建"
fi

echo ""
echo "================================"
echo "✅ 所有测试通过！"
echo ""
echo "您现在可以运行 convert-font.sh 来转换字体了。"
echo ""
