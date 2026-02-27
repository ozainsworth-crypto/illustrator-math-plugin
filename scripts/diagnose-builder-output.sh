#!/bin/bash

# 诊断 Builder 输出文件一致性
# 用于排查 Builder 生成字体包时文件时间戳不一致的问题

echo "=========================================="
echo "Builder 输出文件一致性诊断"
echo "=========================================="
echo ""

# 定义路径
BUILDER_OUTPUT_DIR="math-formula-plugin/public/fonts/user-font-pack"
CEP_RUNTIME_DIR="math-formula-plugin/extension/client/dist/fonts/user-font-pack"

echo "1. 检查 Builder 输出目录"
echo "路径: $BUILDER_OUTPUT_DIR"
echo ""

if [ ! -d "$BUILDER_OUTPUT_DIR" ]; then
  echo "❌ Builder 输出目录不存在"
  exit 1
fi

echo "文件列表和时间戳:"
ls -lh "$BUILDER_OUTPUT_DIR"
echo ""

echo "2. 检查文件时间戳一致性"
echo ""

# 获取 manifest.json 的时间戳
if [ -f "$BUILDER_OUTPUT_DIR/manifest.json" ]; then
  MANIFEST_TIME=$(stat -f "%Sm" -t "%Y-%m-%d %H:%M:%S" "$BUILDER_OUTPUT_DIR/manifest.json" 2>/dev/null || stat -c "%y" "$BUILDER_OUTPUT_DIR/manifest.json" 2>/dev/null)
  echo "manifest.json: $MANIFEST_TIME"
else
  echo "❌ manifest.json 不存在"
  exit 1
fi

# 获取 fontdata.js 的时间戳
if [ -f "$BUILDER_OUTPUT_DIR/fontdata.js" ]; then
  FONTDATA_TIME=$(stat -f "%Sm" -t "%Y-%m-%d %H:%M:%S" "$BUILDER_OUTPUT_DIR/fontdata.js" 2>/dev/null || stat -c "%y" "$BUILDER_OUTPUT_DIR/fontdata.js" 2>/dev/null)
  echo "fontdata.js: $FONTDATA_TIME"
else
  echo "❌ fontdata.js 不存在"
fi

# 获取 capabilities.json 的时间戳
if [ -f "$BUILDER_OUTPUT_DIR/capabilities.json" ]; then
  CAPABILITIES_TIME=$(stat -f "%Sm" -t "%Y-%m-%d %H:%M:%S" "$BUILDER_OUTPUT_DIR/capabilities.json" 2>/dev/null || stat -c "%y" "$BUILDER_OUTPUT_DIR/capabilities.json" 2>/dev/null)
  echo "capabilities.json: $CAPABILITIES_TIME"
fi

# 获取 report.json 的时间戳
if [ -f "$BUILDER_OUTPUT_DIR/report.json" ]; then
  REPORT_TIME=$(stat -f "%Sm" -t "%Y-%m-%d %H:%M:%S" "$BUILDER_OUTPUT_DIR/report.json" 2>/dev/null || stat -c "%y" "$BUILDER_OUTPUT_DIR/report.json" 2>/dev/null)
  echo "report.json: $REPORT_TIME"
fi

echo ""

# 比较时间戳
echo "3. 时间戳一致性分析"
echo ""

if [ "$MANIFEST_TIME" != "$FONTDATA_TIME" ]; then
  echo "⚠️  警告: manifest.json 和 fontdata.js 的时间戳不一致"
  echo "   这表明 Builder 最后一次运行时没有完全重新生成所有文件"
  echo ""
fi

# 读取 manifest.json 的 buildId
if [ -f "$BUILDER_OUTPUT_DIR/manifest.json" ]; then
  BUILD_ID=$(grep -o '"buildId": "[^"]*"' "$BUILDER_OUTPUT_DIR/manifest.json" | cut -d'"' -f4)
  CREATED_AT=$(grep -o '"createdAt": "[^"]*"' "$BUILDER_OUTPUT_DIR/manifest.json" | cut -d'"' -f4)
  echo "manifest.json 内容:"
  echo "  buildId: $BUILD_ID"
  echo "  createdAt: $CREATED_AT"
  echo ""
fi

echo "4. 检查 CEP 运行时目录"
echo "路径: $CEP_RUNTIME_DIR"
echo ""

if [ ! -d "$CEP_RUNTIME_DIR" ]; then
  echo "⚠️  CEP 运行时目录不存在（需要先运行 build-cep-prod.sh）"
else
  echo "文件列表和时间戳:"
  ls -lh "$CEP_RUNTIME_DIR"
  echo ""
  
  # 读取 CEP 的 manifest.json
  if [ -f "$CEP_RUNTIME_DIR/manifest.json" ]; then
    CEP_BUILD_ID=$(grep -o '"buildId": "[^"]*"' "$CEP_RUNTIME_DIR/manifest.json" | cut -d'"' -f4)
    CEP_CREATED_AT=$(grep -o '"createdAt": "[^"]*"' "$CEP_RUNTIME_DIR/manifest.json" | cut -d'"' -f4)
    echo "CEP manifest.json 内容:"
    echo "  buildId: $CEP_BUILD_ID"
    echo "  createdAt: $CEP_CREATED_AT"
    echo ""
    
    # 比较 buildId
    if [ "$BUILD_ID" = "$CEP_BUILD_ID" ]; then
      echo "✅ Builder 和 CEP 的 buildId 一致"
    else
      echo "⚠️  警告: Builder 和 CEP 的 buildId 不一致"
      echo "   需要运行 bash scripts/build-cep-prod.sh 来同步"
    fi
  fi
fi

echo ""
echo "=========================================="
echo "诊断完成"
echo "=========================================="
echo ""

echo "建议操作:"
echo ""
if [ "$MANIFEST_TIME" != "$FONTDATA_TIME" ]; then
  echo "1. 使用 Builder Web UI 重新生成字体包（确保上传字体文件）"
  echo "2. 检查 Builder Web UI 的控制台日志，查看是否有错误"
  echo "3. 运行 bash scripts/build-cep-prod.sh 重新构建 CEP"
  echo "4. 完全重启 Illustrator"
else
  echo "1. 运行 bash scripts/build-cep-prod.sh 重新构建 CEP"
  echo "2. 完全重启 Illustrator"
fi
echo ""
