#!/bin/bash

# 强制重新生成字体包
# 用于修复 Builder 输出文件不一致的问题

set -e

echo "=========================================="
echo "强制重新生成字体包"
echo "=========================================="
echo ""

# 定义路径
BUILDER_OUTPUT_DIR="math-formula-plugin/public/fonts/user-font-pack"
BUILDER_DIR="math-formula-plugin/tools/font-pack-builder"

# 检查是否存在旧的字体包
if [ ! -d "$BUILDER_OUTPUT_DIR" ]; then
  echo "❌ 未找到现有字体包目录: $BUILDER_OUTPUT_DIR"
  echo "   请先使用 Builder Web UI 生成字体包"
  exit 1
fi

# 检查 manifest.json
if [ ! -f "$BUILDER_OUTPUT_DIR/manifest.json" ]; then
  echo "❌ 未找到 manifest.json"
  exit 1
fi

# 读取 manifest 信息
echo "1. 读取现有字体包信息"
echo ""

FONT_NAME=$(grep -o '"name": "[^"]*"' "$BUILDER_OUTPUT_DIR/manifest.json" | head -1 | cut -d'"' -f4)
echo "字体包名称: $FONT_NAME"

# 提示用户提供字体文件路径
echo ""
echo "2. 请提供原始字体文件路径"
echo ""
read -p "字体文件路径 (.ttf 或 .otf): " FONT_FILE

if [ ! -f "$FONT_FILE" ]; then
  echo "❌ 字体文件不存在: $FONT_FILE"
  exit 1
fi

# 检查文件扩展名
EXT="${FONT_FILE##*.}"
if [ "$EXT" != "ttf" ] && [ "$EXT" != "otf" ]; then
  echo "❌ 无效的字体文件格式: $EXT（仅支持 .ttf 和 .otf）"
  exit 1
fi

echo "✅ 字体文件: $FONT_FILE"
echo ""

# 清理旧的输出目录
echo "3. 清理旧的字体包目录"
echo ""
rm -rf "$BUILDER_OUTPUT_DIR"
echo "✅ 已删除: $BUILDER_OUTPUT_DIR"
echo ""

# 重新生成字体包
echo "4. 重新生成字体包"
echo ""

cd "$BUILDER_DIR"

node build.js \
  --input "$FONT_FILE" \
  --output "../../public/fonts/user-font-pack" \
  --name "$FONT_NAME" \
  --base-only

cd - > /dev/null

echo ""
echo "5. 验证生成结果"
echo ""

if [ ! -d "$BUILDER_OUTPUT_DIR" ]; then
  echo "❌ 字体包目录未生成"
  exit 1
fi

echo "生成的文件:"
ls -lh "$BUILDER_OUTPUT_DIR"
echo ""

# 检查所有必需文件
REQUIRED_FILES=("manifest.json" "fontdata.js" "capabilities.json" "report.json" "replacement-report.json")
ALL_EXIST=true

for file in "${REQUIRED_FILES[@]}"; do
  if [ ! -f "$BUILDER_OUTPUT_DIR/$file" ]; then
    echo "❌ 缺少文件: $file"
    ALL_EXIST=false
  fi
done

if [ "$ALL_EXIST" = true ]; then
  echo "✅ 所有必需文件已生成"
else
  echo "⚠️  部分文件缺失"
  exit 1
fi

echo ""

# 读取新的 buildId
NEW_BUILD_ID=$(grep -o '"buildId": "[^"]*"' "$BUILDER_OUTPUT_DIR/manifest.json" | cut -d'"' -f4)
NEW_CREATED_AT=$(grep -o '"createdAt": "[^"]*"' "$BUILDER_OUTPUT_DIR/manifest.json" | cut -d'"' -f4)

echo "新字体包信息:"
echo "  buildId: $NEW_BUILD_ID"
echo "  createdAt: $NEW_CREATED_AT"
echo ""

echo "=========================================="
echo "字体包重新生成完成"
echo "=========================================="
echo ""

echo "下一步操作:"
echo "1. 运行 bash scripts/build-cep-prod.sh 重新构建 CEP"
echo "2. 完全重启 Illustrator"
echo "3. 打开 Math Formula Plugin 扩展"
echo "4. 切换到"调试"标签页，查看日志中的 buildId"
echo ""
