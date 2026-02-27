#!/bin/bash

# CEP 调试模式启用脚本
# 用于解决 CEP 扩展面板空白问题

echo "=== CEP 调试模式启用脚本 ==="
echo ""

# 启用所有版本的 CSXS 调试模式
echo "正在启用所有版本的 CEP 调试模式..."
for version in 6 7 8 9 10 11 12; do
    defaults write com.adobe.CSXS.$version PlayerDebugMode 1
    echo "✓ CSXS.$version 调试模式已启用"
done

echo ""
echo "=== 验证调试模式状态 ==="
for version in 6 7 8 9 10 11 12; do
    status=$(defaults read com.adobe.CSXS.$version PlayerDebugMode 2>/dev/null || echo "未设置")
    echo "CSXS.$version: $status"
done

echo ""
echo "✅ 所有 CEP 调试模式已启用！"
echo ""
echo "下一步："
echo "1. 完全关闭 Adobe Illustrator"
echo "2. 重新启动 Illustrator"
echo "3. 打开扩展：窗口 > 扩展 > Math Formula Plugin"
echo ""
