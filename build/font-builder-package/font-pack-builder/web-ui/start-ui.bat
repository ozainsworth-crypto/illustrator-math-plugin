@echo off
REM Font Pack Builder Web UI - Windows 启动脚本

cd /d "%~dp0"

echo ======================================
echo   Font Pack Builder Web UI
echo ======================================
echo.

REM 检查 Node.js 是否安装
where node >nul 2>nul
if %ERRORLEVEL% NEQ 0 (
    echo 错误: 未检测到 Node.js
    echo 请访问 https://nodejs.org/ 下载并安装 Node.js
    echo.
    pause
    exit /b 1
)

echo Node.js 版本:
node --version
echo.

REM 检查依赖是否安装
if not exist "node_modules" (
    echo 首次运行，正在安装依赖...
    call npm install
    echo.
)

REM 启动服务器
echo 正在启动服务器...
start /B node server\server.cjs

REM 等待服务器启动
timeout /t 2 /nobreak >nul

REM 打开浏览器
echo 正在打开浏览器...
start http://127.0.0.1:3000

echo.
echo 服务器已启动！
echo 如需停止服务器，请关闭此窗口
echo.
pause
