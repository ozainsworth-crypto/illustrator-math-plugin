#!/bin/bash

# Font Builder Web UI 启动脚本
# 功能：
# 1. 停止旧服务（如果存在）
# 2. 清理缓存
# 3. 启动新服务
# 4. 等待服务就绪
# 5. 打开浏览器

set -e

# 配置
PORT=5175
PIDFILE="$HOME/.math-formula-plugin/font-builder.pid"
SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
PROJECT_ROOT="$(cd "$SCRIPT_DIR/.." && pwd)"
WEB_UI_DIR="$PROJECT_ROOT/tools/font-pack-builder/web-ui"
CACHE_DIR="$WEB_UI_DIR/cache"
URL="http://localhost:$PORT"

echo "=========================================="
echo "  Font Builder Web UI 启动器"
echo "=========================================="
echo ""
echo "[INFO] 项目根目录: $PROJECT_ROOT"
echo "[INFO] Web UI 目录: $WEB_UI_DIR"
echo "[INFO] 端口: $PORT"
echo "[INFO] PID 文件: $PIDFILE"
echo ""

# 步骤 1: 停止旧服务
echo "[STEP 1/5] 停止旧服务..."

# 1.1 从 pidfile 停止
if [ -f "$PIDFILE" ]; then
  OLD_PID=$(cat "$PIDFILE")
  echo "[INFO] 发现 PID 文件，PID: $OLD_PID"
  
  if kill -0 "$OLD_PID" 2>/dev/null; then
    echo "[INFO] 正在停止旧服务 (PID: $OLD_PID)..."
    kill "$OLD_PID" 2>/dev/null || true
    sleep 1
    
    # 强制停止
    if kill -0 "$OLD_PID" 2>/dev/null; then
      echo "[WARN] 旧服务未响应，强制停止..."
      kill -9 "$OLD_PID" 2>/dev/null || true
    fi
    echo "[OK] 旧服务已停止"
  else
    echo "[INFO] PID 文件中的进程不存在，清理 PID 文件"
  fi
  
  rm -f "$PIDFILE"
else
  echo "[INFO] 未发现 PID 文件"
fi

# 1.2 兜底：通过端口停止
echo "[INFO] 检查端口 $PORT 占用情况..."
PORT_PIDS=$(lsof -ti tcp:$PORT 2>/dev/null || true)

if [ -n "$PORT_PIDS" ]; then
  echo "[WARN] 端口 $PORT 仍被占用，PID: $PORT_PIDS"
  echo "[INFO] 强制停止占用端口的进程..."
  echo "$PORT_PIDS" | xargs kill -9 2>/dev/null || true
  sleep 1
  echo "[OK] 端口已释放"
else
  echo "[OK] 端口 $PORT 未被占用"
fi

# 步骤 2: 清理缓存
echo ""
echo "[STEP 2/5] 清理缓存..."

if [ -d "$CACHE_DIR" ]; then
  echo "[INFO] 缓存目录: $CACHE_DIR"
  
  # 统计缓存文件数量
  CACHE_COUNT=$(find "$CACHE_DIR" -type f 2>/dev/null | wc -l | tr -d ' ')
  echo "[INFO] 发现 $CACHE_COUNT 个缓存文件"
  
  if [ "$CACHE_COUNT" -gt 0 ]; then
    echo "[INFO] 正在清理缓存..."
    rm -rf "$CACHE_DIR"/*
    echo "[OK] 缓存已清理"
  else
    echo "[OK] 缓存目录为空，无需清理"
  fi
else
  echo "[INFO] 缓存目录不存在，跳过清理"
fi

# 步骤 3: 启动新服务
echo ""
echo "[STEP 3/5] 启动新服务..."

# 确保 PID 目录存在
mkdir -p "$(dirname "$PIDFILE")"

# 检查 Node.js
if ! command -v node &> /dev/null; then
  echo "[ERROR] 未找到 Node.js，请先安装 Node.js"
  exit 1
fi

echo "[INFO] Node.js 版本: $(node --version)"

# 检查 Web UI 目录
if [ ! -d "$WEB_UI_DIR" ]; then
  echo "[ERROR] Web UI 目录不存在: $WEB_UI_DIR"
  exit 1
fi

# 检查 server.cjs
if [ ! -f "$WEB_UI_DIR/server/server.cjs" ]; then
  echo "[ERROR] 服务器文件不存在: $WEB_UI_DIR/server/server.cjs"
  exit 1
fi

# 启动服务（后台运行）
echo "[INFO] 启动命令: PORT=$PORT node server/server.cjs"
cd "$WEB_UI_DIR"

# 使用 nohup 后台运行，并重定向输出
nohup env PORT=$PORT node server/server.cjs > /dev/null 2>&1 &
NEW_PID=$!

# 保存 PID
echo "$NEW_PID" > "$PIDFILE"
echo "[OK] 服务已启动，PID: $NEW_PID"

# 步骤 4: 等待服务就绪
echo ""
echo "[STEP 4/5] 等待服务就绪..."

MAX_WAIT=10
WAIT_COUNT=0

while [ $WAIT_COUNT -lt $MAX_WAIT ]; do
  if curl -s -o /dev/null -w "%{http_code}" "$URL/api/health" 2>/dev/null | grep -q "200"; then
    echo "[OK] 服务已就绪 (耗时: ${WAIT_COUNT}s)"
    break
  fi
  
  echo "[INFO] 等待服务启动... ($((WAIT_COUNT + 1))/$MAX_WAIT)"
  sleep 1
  WAIT_COUNT=$((WAIT_COUNT + 1))
done

if [ $WAIT_COUNT -eq $MAX_WAIT ]; then
  echo "[ERROR] 服务启动超时，请检查日志"
  echo "[INFO] 尝试手动访问: $URL"
  exit 1
fi

# 步骤 5: 打开浏览器
echo ""
echo "[STEP 5/5] 打开浏览器..."

if command -v open &> /dev/null; then
  # macOS
  open "$URL"
  echo "[OK] 已在默认浏览器中打开: $URL"
elif command -v xdg-open &> /dev/null; then
  # Linux
  xdg-open "$URL"
  echo "[OK] 已在默认浏览器中打开: $URL"
else
  echo "[WARN] 无法自动打开浏览器，请手动访问: $URL"
fi

echo ""
echo "=========================================="
echo "  启动完成！"
echo "=========================================="
echo ""
echo "服务信息:"
echo "  - URL: $URL"
echo "  - PID: $NEW_PID"
echo "  - PID 文件: $PIDFILE"
echo ""
echo "停止服务:"
echo "  kill $NEW_PID"
echo "  或删除 PID 文件后重新运行此脚本"
echo ""
