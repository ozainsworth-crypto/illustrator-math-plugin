#!/bin/bash

# 查找并修复字体包位置问题
# 用于排查 Builder Web UI 生成的字体包位置不正确的问题

echo "=========================================="
echo "查找并修复字体包位置"
echo "=========================================="
echo ""

# 定义正确的目标路径
TARGET_DIR="math-formula-plugin/public/fonts/user-font-pack"

echo "1. 查找最近生成的字体包文件"
echo ""

# 查找最近 1 小时内修改的 manifest.json 文件
echo "搜索最近 1 小时内的 manifest.json 文件..."
RECENT_MANIFESTS=$(find . -name "manifest.json" -type f -mmin -60 2>/dev/null | grep -v node_modules | grep -v ".git")

if [ -z "$RECENT_MANIFESTS" ]; then
  echo "❌ 未找到最近生成的 manifest.json 文件"
  echo ""
  echo "尝试搜索包含 'puzzlettf260226' 或 '初中数学字体0226' 的 manifest.json..."
  RECENT_MANIFESTS=$(find . -name "manifest.json" -type f 2>/dev/null | xargs grep -l "puzzlettf260226\|初中数学字体0226" 2>/dev/null | grep -v node_modules | grep -v ".git")
fi

if [ -z "$RECENT_MANIFESTS" ]; then
  echo "❌ 仍未找到相关的 manifest.json 文件"
  exit 1
fi

echo "找到以下 manifest.json 文件:"
echo "$RECENT_MANIFESTS"
echo ""

# 对每个找到的 manifest.json，检查其目录
for MANIFEST_PATH in $RECENT_MANIFESTS; do
  MANIFEST_DIR=$(dirname "$MANIFEST_PATH")
  echo "检查目录: $MANIFEST_DIR"
  
  # 检查该目录是否包含完整的字体包文件
  HAS_FONTDATA=false
  HAS_CAPABILITIES=false
  HAS_REPORT=false
  
  if [ -f "$MANIFEST_DIR/fontdata.js" ]; then
    HAS_FONTDATA=true
  fi
  
  if [ -f "$MANIFEST_DIR/capabilities.json" ]; then
    HAS_CAPABILITIES=true
  fi
  
  if [ -f "$MANIFEST_DIR/report.json" ]; then
    HAS_REPORT=true
  fi
  
  echo "  manifest.json: ✓"
  echo "  fontdata.js: $([ "$HAS_FONTDATA" = true ] && echo "✓" || echo "✗")"
  echo "  capabilities.json: $([ "$HAS_CAPABILITIES" = true ] && echo "✓" || echo "✗")"
  echo "  report.json: $([ "$HAS_REPORT" = true ] && echo "✓" || echo "✗")"
  
  # 如果包含完整文件，询问是否复制
  if [ "$HAS_FONTDATA" = true ] && [ "$HAS_CAPABILITIES" = true ]; then
    echo ""
    echo "✅ 找到完整的字体包！"
    echo "源目录: $MANIFEST_DIR"
    echo "目标目录: $TARGET_DIR"
    echo ""
    
    # 显示文件时间戳
    echo "文件时间戳:"
    ls -lh "$MANIFEST_DIR"
    echo ""
    
    # 读取 buildId
    BUILD_ID=$(grep -o '"buildId": "[^"]*"' "$MANIFEST_DIR/manifest.json" | cut -d'"' -f4)
    CREATED_AT=$(grep -o '"createdAt": "[^"]*"' "$MANIFEST_DIR/manifest.json" | cut -d'"' -f4)
    echo "buildId: $BUILD_ID"
    echo "createdAt: $CREATED_AT"
    echo ""
    
    read -p "是否将此字体包复制到正确位置？(y/n) " -n 1 -r
    echo ""
    
    if [[ $REPLY =~ ^[Yy]$ ]]; then
      # 创建目标目录（如果不存在）
      mkdir -p "$TARGET_DIR"
      
      # 删除旧文件
      echo "清理旧文件..."
      rm -f "$TARGET_DIR"/*
      
      # 复制所有文件
      echo "复制文件..."
      cp "$MANIFEST_DIR"/* "$TARGET_DIR/"
      
      echo "✅ 复制完成！"
      echo ""
      
      # 验证复制结果
      echo "验证复制结果:"
      ls -lh "$TARGET_DIR"
      echo ""
      
      echo "下一步:"
      echo "1. 运行 bash scripts/build-cep-prod.sh 重新构建 CEP"
      echo "2. 完全重启 Illustrator"
      echo "3. 验证 CEP 插件显示的字体信息"
      echo ""
      
      exit 0
    fi
  fi
  
  echo ""
done

echo "=========================================="
echo "未找到可用的完整字体包"
echo "=========================================="
echo ""
echo "建议操作:"
echo "1. 使用 Builder Web UI 重新生成字体包"
echo "2. 确保上传字体文件并点击'生成字体包'"
echo "3. 再次运行此脚本查找生成的文件"
echo ""
