#!/bin/bash

# Font Pack Builder Web UI - Linux 启动脚本

cd "$(dirname "$0")"

echo "======================================"
echo "  Font Pack Builder Web UI"
echo "======================================"
echo ""

# 检查 Node.js 是否安装
if ! command -v node &> /dev/null; then
    echo "错误: 未检测到 Node.js"
    echo "请使用包管理器安装 Node.js:"
    echo "  Ubuntu/Debian: sudo apt install nodejs npm"
    echo "  Fedora: sudo dnf install nodejs npm"
    echo "  Arch: sudo pacman -S nodejs npm"
    echo ""
    read -p "按 Enter 键退出..."
    exit 1
fi

echo "Node.js 版本: $(node --version)"
echo ""

# 检查依赖是否安装
if [ ! -d "node_modules" ]; then
    echo "首次运行，正在安装依赖..."
    npm install
    echo ""
fi

# 启动服务器
echo "正在启动服务器..."
node server/server.cjs &
SERVER_PID=$!

# 等待服务器启动
sleep 2

# 打开浏览器
echo "正在打开浏览器..."
if command -v xdg-open &> /dev/null; then
    xdg-open http://127.0.0.1:3000
elif command -v gnome-open &> /dev/null; then
    gnome-open http://127.0.0.1:3000
else
    echo "无法自动打开浏览器，请手动访问: http://127.0.0.1:3000"
fi

echo ""
echo "服务器已启动！"
echo "如需停止服务器，请关闭此窗口或按 Ctrl+C"
echo ""

# 等待服务器进程
wait $SERVER_PID
