#!/bin/bash

# 验证子集字体的完整性和可用性

set -e

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
cd "$SCRIPT_DIR"

SUBSET_FONT="output/latinmodern-math.mathjax-subset.otf"

echo "========================================"
echo "子集字体验证工具"
echo "========================================"
echo ""

# 检查文件存在
if [ ! -f "$SUBSET_FONT" ]; then
    echo "❌ 子集字体不存在: $SUBSET_FONT"
    echo ""
    echo "请先运行: ./run-all.sh"
    exit 1
fi

echo "✅ 找到子集字体: $SUBSET_FONT"
echo ""

# 检查文件类型
echo "🔍 检查文件类型..."
FILE_TYPE=$(file "$SUBSET_FONT")
echo "   $FILE_TYPE"

if [[ "$FILE_TYPE" == *"OpenType font"* ]]; then
    echo "   ✅ 文件类型正确"
else
    echo "   ❌ 文件类型错误 (应该是 OpenType font)"
    exit 1
fi
echo ""

# 检查文件大小
echo "🔍 检查文件大小..."
FILE_SIZE=$(stat -f%z "$SUBSET_FONT" 2>/dev/null || stat -c%s "$SUBSET_FONT" 2>/dev/null)
FILE_SIZE_KB=$((FILE_SIZE / 1024))
echo "   文件大小: ${FILE_SIZE_KB}KB"

if [ $FILE_SIZE_KB -lt 50 ]; then
    echo "   ⚠️  文件太小 (可能不完整)"
elif [ $FILE_SIZE_KB -gt 300 ]; then
    echo "   ⚠️  文件太大 (子集化可能失败)"
else
    echo "   ✅ 文件大小合理"
fi
echo ""

# 检查字体表 (需要 ttx)
if command -v ttx &> /dev/null; then
    echo "🔍 检查字体表..."
    TABLES=$(ttx -l "$SUBSET_FONT" 2>/dev/null)
    
    # 检查关键表
    KEY_TABLES=("MATH" "GPOS" "GSUB" "GDEF" "cmap" "name" "head" "hhea" "hmtx" "maxp" "post")
    
    for table in "${KEY_TABLES[@]}"; do
        if echo "$TABLES" | grep -q "^$table$"; then
            echo "   ✅ $table"
        else
            if [ "$table" == "MATH" ]; then
                echo "   ❌ $table (关键表缺失!)"
            else
                echo "   ⚠️  $table (缺失)"
            fi
        fi
    done
    echo ""
else
    echo "⚠️  ttx 未安装，跳过字体表检查"
    echo "   安装: pip3 install fonttools"
    echo ""
fi

# 检查字符数量 (需要 ttx)
if command -v ttx &> /dev/null; then
    echo "🔍 检查字符数量..."
    
    # 导出 cmap 表
    ttx -t cmap -o /tmp/subset-cmap.ttx "$SUBSET_FONT" 2>/dev/null
    
    # 统计字符数
    CHAR_COUNT=$(grep -c "code=" /tmp/subset-cmap.ttx || echo "0")
    echo "   字符数量: $CHAR_COUNT"
    
    # 清理临时文件
    rm -f /tmp/subset-cmap.ttx
    
    if [ $CHAR_COUNT -lt 100 ]; then
        echo "   ⚠️  字符数量太少"
    elif [ $CHAR_COUNT -gt 2000 ]; then
        echo "   ⚠️  字符数量太多 (子集化可能失败)"
    else
        echo "   ✅ 字符数量合理"
    fi
    echo ""
fi

# 对比原始字体 (如果存在)
ORIGINAL_FONT="fonts/latinmodern-math.otf"
if [ -f "$ORIGINAL_FONT" ]; then
    echo "🔍 对比原始字体..."
    
    ORIGINAL_SIZE=$(stat -f%z "$ORIGINAL_FONT" 2>/dev/null || stat -c%s "$ORIGINAL_FONT" 2>/dev/null)
    ORIGINAL_SIZE_KB=$((ORIGINAL_SIZE / 1024))
    
    REDUCTION=$((100 - (FILE_SIZE * 100 / ORIGINAL_SIZE)))
    
    echo "   原始字体: ${ORIGINAL_SIZE_KB}KB"
    echo "   子集字体: ${FILE_SIZE_KB}KB"
    echo "   减少: ${REDUCTION}%"
    
    if [ $REDUCTION -lt 50 ]; then
        echo "   ⚠️  减少比例较低 (预期 70-80%)"
    else
        echo "   ✅ 减少比例合理"
    fi
    echo ""
fi

# 总结
echo "========================================"
echo "验证完成"
echo "========================================"
echo ""
echo "下一步:"
echo "  1. 在字体编辑器中打开: fontforge $SUBSET_FONT"
echo "  2. 编辑需要修改的字形"
echo "  3. 导出并生成字体包: cd ../font-pack-builder && ./转换字体.command"
echo ""
