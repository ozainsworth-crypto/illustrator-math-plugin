@echo off
chcp 65001 >nul
setlocal enabledelayedexpansion

echo 🔧 字体包转换工具
echo ================================
echo.

REM 检查 Node.js 是否安装
where node >nul 2>nul
if %errorlevel% neq 0 (
    echo ❌ 错误: 未检测到 Node.js
    echo 请先安装 Node.js: https://nodejs.org/
    echo.
    pause
    exit /b 1
)

REM 检查依赖是否安装
if not exist "node_modules" (
    echo ⏳ 首次运行，正在安装依赖...
    call npm install
    echo.
)

REM 检测是否为 TTY 环境（检查是否有标准输入）
echo test 2>nul | find "test" >nul
if %errorlevel% equ 0 (
    set IS_TTY=1
) else (
    set IS_TTY=0
)

if "%IS_TTY%"=="1" (
    REM TTY 模式：交互式输入
    echo 📝 交互式模式
    echo.
    
    REM 提示用户输入字体文件路径
    echo 请将您的字体文件拖拽到此窗口，然后按回车：
    set /p FONT_PATH=

    REM 去除路径两端的引号
    set FONT_PATH=!FONT_PATH:"=!

    REM 检查文件是否存在
    if not exist "!FONT_PATH!" (
        echo ❌ 错误: 文件不存在: !FONT_PATH!
        echo.
        pause
        exit /b 1
    )

    REM 检查文件扩展名
    for %%F in ("!FONT_PATH!") do set EXT=%%~xF
    set EXT=!EXT:~1!
    set EXT_LOWER=!EXT!
    call :lowercase EXT_LOWER

    if not "!EXT_LOWER!"=="ttf" if not "!EXT_LOWER!"=="otf" (
        echo ❌ 错误: 不支持的文件格式: .!EXT!
        echo 仅支持 .ttf 和 .otf 格式
        echo.
        pause
        exit /b 1
    )

    REM 提取文件名（不含扩展名）作为默认字体名
    for %%F in ("!FONT_PATH!") do set DEFAULT_NAME=%%~nF

    REM 提示用户输入字体包名称
    echo.
    echo 请输入字体包名称（直接按回车使用默认名称: !DEFAULT_NAME!）：
    set /p FONT_NAME=

    REM 如果用户未输入，使用默认名称
    if "!FONT_NAME!"=="" set FONT_NAME=!DEFAULT_NAME!

    REM 询问是否启用字符集选项
    echo.
    echo 字符集选项：
    echo 1. 扩展数学符号-默认集（已默认启用）
    echo 2. 扩展数学符号-可选集
    echo 3. 扩展数学符号-高级集（需要 Phase 3 支持，当前不可用）
    echo 4. 扩展文本符号
    echo 5. 仅使用基础字符集
    echo.
    echo 请选择要启用的选项（输入数字，多个选项用空格分隔，直接按回车使用默认）：
    set /p CHARSET_OPTIONS=

    set ENABLE_OPTIONAL=
    set ENABLE_ADVANCED=
    set ENABLE_TEXT_SYMBOLS=
    set BASE_ONLY=

    echo !CHARSET_OPTIONS! | find "2" >nul
    if %errorlevel% equ 0 set ENABLE_OPTIONAL=--enable-optional

    echo !CHARSET_OPTIONS! | find "3" >nul
    if %errorlevel% equ 0 (
        echo ⚠️  警告: 高级字符集当前不可用（需要 Phase 3），将跳过此选项
    )

    echo !CHARSET_OPTIONS! | find "4" >nul
    if %errorlevel% equ 0 set ENABLE_TEXT_SYMBOLS=--enable-text-symbols

    echo !CHARSET_OPTIONS! | find "5" >nul
    if %errorlevel% equ 0 set BASE_ONLY=--base-only

) else (
    REM 非 TTY 模式：从环境变量读取配置
    echo 🤖 非交互式模式（从环境变量读取配置）
    echo.
    
    set FONT_PATH=%FONT_PACK_INPUT_FONT%
    set FONT_NAME=%FONT_PACK_NAME%
    
    if "!FONT_PATH!"=="" (
        echo ❌ 错误: 未设置 FONT_PACK_INPUT_FONT 环境变量
        exit /b 1
    )
    
    if "!FONT_NAME!"=="" (
        echo ❌ 错误: 未设置 FONT_PACK_NAME 环境变量
        exit /b 1
    )
    
    REM 检查文件是否存在
    if not exist "!FONT_PATH!" (
        echo ❌ 错误: 文件不存在: !FONT_PATH!
        exit /b 1
    )
    
    REM 从环境变量读取字符集选项
    set ENABLE_OPTIONAL=
    set ENABLE_ADVANCED=
    set ENABLE_TEXT_SYMBOLS=
    set BASE_ONLY=
    
    if "%FONT_PACK_ENABLE_OPTIONAL%"=="true" set ENABLE_OPTIONAL=--enable-optional
    if "%FONT_PACK_ENABLE_ADVANCED%"=="true" set ENABLE_ADVANCED=--enable-advanced
    if "%FONT_PACK_ENABLE_TEXT_SYMBOLS%"=="true" set ENABLE_TEXT_SYMBOLS=--enable-text-symbols
    if "%FONT_PACK_BASE_ONLY%"=="true" set BASE_ONLY=--base-only
    
    echo ✓ 输入字体: !FONT_PATH!
    echo ✓ 字体包名称: !FONT_NAME!
    echo ✓ 字符集选项: !ENABLE_OPTIONAL! !ENABLE_ADVANCED! !ENABLE_TEXT_SYMBOLS! !BASE_ONLY!
    echo.
)

REM 设置输出目录（固定为 user-font-pack）
set OUTPUT_DIR=..\..\public\fonts\user-font-pack

REM 构建命令参数
set CMD_ARGS=-i "!FONT_PATH!" -o "!OUTPUT_DIR!" -n "!FONT_NAME!"

if not "!ENABLE_OPTIONAL!"=="" set CMD_ARGS=!CMD_ARGS! !ENABLE_OPTIONAL!
if not "!ENABLE_ADVANCED!"=="" set CMD_ARGS=!CMD_ARGS! !ENABLE_ADVANCED!
if not "!ENABLE_TEXT_SYMBOLS!"=="" set CMD_ARGS=!CMD_ARGS! !ENABLE_TEXT_SYMBOLS!
if not "!BASE_ONLY!"=="" set CMD_ARGS=!CMD_ARGS! !BASE_ONLY!

REM 执行转换
echo.
echo ⏳ 开始转换...
echo.

node build.js !CMD_ARGS!

if %errorlevel% equ 0 (
    echo.
    echo ✅ 转换完成！
    echo.
    echo 字体包已保存到: !OUTPUT_DIR!
    echo 现在您可以在主工具中选择"自主字体"来使用它！
) else (
    echo.
    echo ❌ 转换失败，请查看上方错误信息
)

REM 仅在 TTY 模式下等待用户按键
if "%IS_TTY%"=="1" (
    echo.
    pause
)

exit /b %errorlevel%

:lowercase
set %~1=!%~1:A=a!
set %~1=!%~1:B=b!
set %~1=!%~1:C=c!
set %~1=!%~1:D=d!
set %~1=!%~1:E=e!
set %~1=!%~1:F=f!
set %~1=!%~1:G=g!
set %~1=!%~1:H=h!
set %~1=!%~1:I=i!
set %~1=!%~1:J=j!
set %~1=!%~1:K=k!
set %~1=!%~1:L=l!
set %~1=!%~1:M=m!
set %~1=!%~1:N=n!
set %~1=!%~1:O=o!
set %~1=!%~1:P=p!
set %~1=!%~1:Q=q!
set %~1=!%~1:R=r!
set %~1=!%~1:S=s!
set %~1=!%~1:T=t!
set %~1=!%~1:U=u!
set %~1=!%~1:V=v!
set %~1=!%~1:W=w!
set %~1=!%~1:X=x!
set %~1=!%~1:Y=y!
set %~1=!%~1:Z=z!
goto :eof
