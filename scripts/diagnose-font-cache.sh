#!/bin/bash

# 字体缓存诊断脚本
# 用于排查 Builder 输出和 CEP 读取的字体包版本不一致问题

echo "=== 字体缓存诊断脚本 ==="
echo ""

# 获取脚本所在目录的父目录（项目根目录）
SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
PROJECT_ROOT="$(dirname "$SCRIPT_DIR")"

echo "项目根目录: $PROJECT_ROOT"
echo ""

# ========== A) Builder 输出路径排查 ==========
echo "========== A) Builder 输出路径排查 =========="
echo ""

BUILDER_OUTPUT="$PROJECT_ROOT/public/fonts/user-font-pack"

echo "1. 生成目录的绝对路径:"
if [ -d "$BUILDER_OUTPUT" ]; then
    realpath "$BUILDER_OUTPUT"
else
    echo "❌ 目录不存在: $BUILDER_OUTPUT"
fi
echo ""

echo "2. manifest.json 信息:"
if [ -f "$BUILDER_OUTPUT/manifest.json" ]; then
    ls -lh "$BUILDER_OUTPUT/manifest.json"
    stat -f "mtime: %Sm, size: %z bytes" "$BUILDER_OUTPUT/manifest.json" 2>/dev/null || stat -c "mtime: %y, size: %s bytes" "$BUILDER_OUTPUT/manifest.json" 2>/dev/null
    echo ""
    echo "内容（buildId/createdAt）:"
    grep -E '"(buildId|createdAt|name)"' "$BUILDER_OUTPUT/manifest.json"
else
    echo "❌ 文件不存在"
fi
echo ""

echo "3. fontdata.js 信息:"
if [ -f "$BUILDER_OUTPUT/fontdata.js" ]; then
    ls -lh "$BUILDER_OUTPUT/fontdata.js"
    stat -f "mtime: %Sm, size: %z bytes" "$BUILDER_OUTPUT/fontdata.js" 2>/dev/null || stat -c "mtime: %y, size: %s bytes" "$BUILDER_OUTPUT/fontdata.js" 2>/dev/null
    echo ""
    echo "前 3 行:"
    head -n 3 "$BUILDER_OUTPUT/fontdata.js"
else
    echo "❌ 文件不存在"
fi
echo ""

# ========== B) CEP 读取路径排查 ==========
echo "========== B) CEP 读取路径排查 =========="
echo ""

CEP_OUTPUT="$PROJECT_ROOT/extension/client/dist/fonts/user-font-pack"

echo "1. CEP 运行时目录的绝对路径:"
if [ -d "$CEP_OUTPUT" ]; then
    realpath "$CEP_OUTPUT"
else
    echo "❌ 目录不存在: $CEP_OUTPUT"
fi
echo ""

echo "2. CEP manifest.json 信息:"
if [ -f "$CEP_OUTPUT/manifest.json" ]; then
    ls -lh "$CEP_OUTPUT/manifest.json"
    stat -f "mtime: %Sm, size: %z bytes" "$CEP_OUTPUT/manifest.json" 2>/dev/null || stat -c "mtime: %y, size: %s bytes" "$CEP_OUTPUT/manifest.json" 2>/dev/null
    echo ""
    echo "内容（buildId/createdAt）:"
    grep -E '"(buildId|createdAt|name)"' "$CEP_OUTPUT/manifest.json"
else
    echo "❌ 文件不存在"
fi
echo ""

echo "3. CEP fontdata.js 信息:"
if [ -f "$CEP_OUTPUT/fontdata.js" ]; then
    ls -lh "$CEP_OUTPUT/fontdata.js"
    stat -f "mtime: %Sm, size: %z bytes" "$CEP_OUTPUT/fontdata.js" 2>/dev/null || stat -c "mtime: %y, size: %s bytes" "$CEP_OUTPUT/fontdata.js" 2>/dev/null
    echo ""
    echo "前 3 行:"
    head -n 3 "$CEP_OUTPUT/fontdata.js"
else
    echo "❌ 文件不存在"
fi
echo ""

# ========== C) 对比分析 ==========
echo "========== C) 对比分析 =========="
echo ""

if [ -f "$BUILDER_OUTPUT/manifest.json" ] && [ -f "$CEP_OUTPUT/manifest.json" ]; then
    BUILDER_BUILDID=$(grep '"buildId"' "$BUILDER_OUTPUT/manifest.json" | sed 's/.*"buildId": "\(.*\)".*/\1/')
    CEP_BUILDID=$(grep '"buildId"' "$CEP_OUTPUT/manifest.json" | sed 's/.*"buildId": "\(.*\)".*/\1/')
    
    echo "Builder buildId: $BUILDER_BUILDID"
    echo "CEP buildId: $CEP_BUILDID"
    echo ""
    
    if [ "$BUILDER_BUILDID" = "$CEP_BUILDID" ]; then
        echo "✅ buildId 一致"
    else
        echo "❌ buildId 不一致 - CEP 需要重新构建"
    fi
else
    echo "❌ 无法对比 - 文件缺失"
fi
echo ""

# ========== D) 文件完整性检查 ==========
echo "========== D) 文件完整性检查 =========="
echo ""

REQUIRED_FILES=("manifest.json" "fontdata.js" "capabilities.json" "replacement-report.json" "report.json")

echo "Builder 输出目录:"
for file in "${REQUIRED_FILES[@]}"; do
    if [ -f "$BUILDER_OUTPUT/$file" ]; then
        echo "  ✅ $file"
    else
        echo "  ❌ $file (缺失)"
    fi
done
echo ""

echo "CEP 运行时目录:"
for file in "${REQUIRED_FILES[@]}"; do
    if [ -f "$CEP_OUTPUT/$file" ]; then
        echo "  ✅ $file"
    else
        echo "  ❌ $file (缺失)"
    fi
done
echo ""

echo "=== 诊断完成 ==="
