#!/bin/bash

# 切换到脚本所在目录
cd "$(dirname "$0")"

# 字体包转换工具 - macOS 专用
# 双击此文件即可运行

echo "🔧 字体包转换工具"
echo "================================"
echo ""

# 检查 Node.js 是否安装
if ! command -v node &> /dev/null; then
    echo "❌ 错误: 未检测到 Node.js"
    echo "请先安装 Node.js: https://nodejs.org/"
    echo ""
    read -p "按回车键退出..."
    exit 1
fi

# 检查依赖是否安装
if [ ! -d "node_modules" ]; then
    echo "⏳ 首次运行，正在安装依赖..."
    npm install
    echo ""
fi

# 检测是否为 TTY 环境
if [ -t 0 ]; then
    # TTY 模式：交互式输入
    echo "📝 交互式模式"
    echo ""
    
    # 提示用户输入字体文件路径
    echo "请将您的字体文件拖拽到此窗口，然后按回车："
    read -e FONT_PATH

    # 去除路径两端的引号和空格
    FONT_PATH=$(echo "$FONT_PATH" | sed "s/^['\"]//;s/['\"]$//")

    # 检查文件是否存在
    if [ ! -f "$FONT_PATH" ]; then
        echo "❌ 错误: 文件不存在: $FONT_PATH"
        echo ""
        read -p "按回车键退出..."
        exit 1
    fi

    # 检查文件扩展名
    EXT="${FONT_PATH##*.}"
    EXT_LOWER=$(echo "$EXT" | tr '[:upper:]' '[:lower:]')

    if [ "$EXT_LOWER" != "ttf" ] && [ "$EXT_LOWER" != "otf" ]; then
        echo "❌ 错误: 不支持的文件格式: .$EXT"
        echo "仅支持 .ttf 和 .otf 格式"
        echo ""
        read -p "按回车键退出..."
        exit 1
    fi

    # 提取文件名（不含扩展名）作为默认字体名
    FILENAME=$(basename "$FONT_PATH")
    DEFAULT_NAME="${FILENAME%.*}"

    # 提示用户输入字体包名称
    echo ""
    echo "请输入字体包名称（直接按回车使用默认名称: $DEFAULT_NAME）："
    read FONT_NAME

    # 如果用户未输入，使用默认名称
    if [ -z "$FONT_NAME" ]; then
        FONT_NAME="$DEFAULT_NAME"
    fi

    # 询问是否启用可选字符集
    echo ""
    echo "字符集选项："
    echo "1. 扩展数学符号-默认集（已默认启用）"
    echo "2. 扩展数学符号-可选集"
    echo "3. 扩展数学符号-高级集（需要 Phase 3 支持，当前不可用）"
    echo "4. 扩展文本符号"
    echo "5. 仅使用基础字符集"
    echo ""
    echo "请选择要启用的选项（输入数字，多个选项用空格分隔，直接按回车使用默认）："
    read CHARSET_OPTIONS

    ENABLE_OPTIONAL=""
    ENABLE_ADVANCED=""
    ENABLE_TEXT_SYMBOLS=""
    BASE_ONLY=""

    if [[ "$CHARSET_OPTIONS" == *"2"* ]]; then
        ENABLE_OPTIONAL="--enable-optional"
    fi

    if [[ "$CHARSET_OPTIONS" == *"3"* ]]; then
        echo "⚠️  警告: 高级字符集当前不可用（需要 Phase 3），将跳过此选项"
    fi

    if [[ "$CHARSET_OPTIONS" == *"4"* ]]; then
        ENABLE_TEXT_SYMBOLS="--enable-text-symbols"
    fi

    if [[ "$CHARSET_OPTIONS" == *"5"* ]]; then
        BASE_ONLY="--base-only"
    fi

else
    # 非 TTY 模式：从环境变量读取配置
    echo "🤖 非交互式模式（从环境变量读取配置）"
    echo ""
    
    FONT_PATH="${FONT_PACK_INPUT_FONT}"
    FONT_NAME="${FONT_PACK_NAME}"
    
    if [ -z "$FONT_PATH" ]; then
        echo "❌ 错误: 未设置 FONT_PACK_INPUT_FONT 环境变量"
        exit 1
    fi
    
    if [ -z "$FONT_NAME" ]; then
        echo "❌ 错误: 未设置 FONT_PACK_NAME 环境变量"
        exit 1
    fi
    
    # 检查文件是否存在
    if [ ! -f "$FONT_PATH" ]; then
        echo "❌ 错误: 文件不存在: $FONT_PATH"
        exit 1
    fi
    
    # 从环境变量读取字符集选项
    ENABLE_OPTIONAL=""
    ENABLE_ADVANCED=""
    ENABLE_TEXT_SYMBOLS=""
    BASE_ONLY=""
    
    if [ "${FONT_PACK_ENABLE_OPTIONAL}" = "true" ]; then
        ENABLE_OPTIONAL="--enable-optional"
    fi
    
    if [ "${FONT_PACK_ENABLE_ADVANCED}" = "true" ]; then
        ENABLE_ADVANCED="--enable-advanced"
    fi
    
    if [ "${FONT_PACK_ENABLE_TEXT_SYMBOLS}" = "true" ]; then
        ENABLE_TEXT_SYMBOLS="--enable-text-symbols"
    fi
    
    if [ "${FONT_PACK_BASE_ONLY}" = "true" ]; then
        BASE_ONLY="--base-only"
    fi
    
    echo "✓ 输入字体: $FONT_PATH"
    echo "✓ 字体包名称: $FONT_NAME"
    echo "✓ 字符集选项: ${ENABLE_OPTIONAL} ${ENABLE_ADVANCED} ${ENABLE_TEXT_SYMBOLS} ${BASE_ONLY}"
    echo ""
fi

# 设置输出目录（固定为 user-font-pack）
OUTPUT_DIR="../../public/fonts/user-font-pack"

# 构建命令参数
CMD_ARGS="-i \"$FONT_PATH\" -o \"$OUTPUT_DIR\" -n \"$FONT_NAME\""

if [ -n "$ENABLE_OPTIONAL" ]; then
    CMD_ARGS="$CMD_ARGS $ENABLE_OPTIONAL"
fi

if [ -n "$ENABLE_ADVANCED" ]; then
    CMD_ARGS="$CMD_ARGS $ENABLE_ADVANCED"
fi

if [ -n "$ENABLE_TEXT_SYMBOLS" ]; then
    CMD_ARGS="$CMD_ARGS $ENABLE_TEXT_SYMBOLS"
fi

if [ -n "$BASE_ONLY" ]; then
    CMD_ARGS="$CMD_ARGS $BASE_ONLY"
fi

# 执行转换
echo ""
echo "⏳ 开始转换..."
echo ""

eval "node build.js $CMD_ARGS"

EXIT_CODE=$?

echo ""
if [ $EXIT_CODE -eq 0 ]; then
    echo "✅ 转换完成！"
    echo ""
    echo "字体包已保存到: $OUTPUT_DIR"
    echo "现在您可以在主工具中选择"自主字体"来使用它！"
else
    echo "❌ 转换失败，请查看上方错误信息"
fi

# 仅在 TTY 模式下等待用户按键
if [ -t 0 ]; then
    echo ""
    read -p "按回车键退出..."
fi
