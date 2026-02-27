# Phase 4: 分隔符协议修复 + 增强标尺查找

## 问题诊断

**症状**：
- Panel 端传入 `ratio=0.4530`
- JSX 返回 `ratio=0` 且 `marker=none`
- 字号缩放完全未执行

**根本原因**：
1. **参数传递失败**：JSX 使用模板字符串插值 `${xHeightToEmRatio}`，但 ExtendScript 无法正确解析
2. **标尺查找不完整**：只查找 PathItem，未递归遍历所有 pageItems（包括 CompoundPathItem）
3. **诊断信息缺失**：marker=none 时无法知道遍历了多少对象、找到了什么

## 解决方案

### 1. 分隔符协议传参

**改为使用分隔符协议**，避免 JSON 和模板字符串插值问题：

```typescript
// Panel 端
const params = `${escapedPath}||${targetFontSize}||${xHeightToEmRatio}`;

// JSX 端解析
var params = "${params}";
var parts = params.split("||");
var svgPath = parts[0];
var targetFontPt = parseFloat(parts[1]);
var xHeightToEmRatio = parseFloat(parts[2]);
```

**优势**：
- 简单可靠，无需 JSON.parse
- 避免模板字符串插值问题
- 参数类型明确（parseFloat 强制转换）

### 2. 增强递归标尺查找

**改进点**：
- 使用单一递归函数 `traverseItems()` 遍历所有 pageItems
- 支持 PathItem 和 CompoundPathItem
- 记录前 30 个 item 的 typename 和尺寸（用于诊断）
- 统计遍历总数和候选项数量

```javascript
function traverseItems(item, depth) {
  if (!item) return;
  totalItemsTraversed++;
  
  // 记录诊断信息
  if (debugItems.length < 30) {
    var bounds = item.geometricBounds;
    var w = bounds[2] - bounds[0];
    var h = bounds[1] - bounds[3];
    debugItems.push({
      typename: item.typename,
      w: w.toFixed(2),
      h: h.toFixed(2)
    });
  }
  
  // 检查 PathItem 和 CompoundPathItem
  if (item.typename === "PathItem" || item.typename === "CompoundPathItem") {
    // ... 查找 tag 和标尺
  }
  
  // 递归查找子项
  if (item.typename === "GroupItem" && item.pageItems) {
    for (var i = 0; i < item.pageItems.length; i++) {
      traverseItems(item.pageItems[i], depth + 1);
    }
  }
}
```

### 3. Panel 端强制数值校验

**在插入前校验 ratio**：

```typescript
const ratio = Number(currentSVGResult.calibrationData.xHeightToEmRatio);
const fontPackName = fontPackLoader.getCurrentFontPack()?.manifest.name || '默认字体';

// 校验 ratio 是否为有限数且在 (0, 1) 范围内
if (!Number.isFinite(ratio) || ratio <= 0 || ratio >= 1) {
  addDebugLog(`✗ 错误: ratio 值无效: ${ratio}`, 'error');
  addDebugLog(`  来源: ${fontPackName}`, 'error');
  showError(`标尺校准数据异常 (ratio=${ratio})，无法应用字号统一。`);
  return;
}
```

### 4. 插入成功判定改为"marker 必须 found"

**marker=none 视为失败**：

```typescript
return {
  success: markerFound, // 只有找到标尺才算成功
  message: markerFound ? 'SVG 已成功插入并应用字号统一' : '标尺识别失败，本次未应用字号统一',
  markerFound
};
```

**不再默默回退到默认宽度缩放**，确保字号统一的一致性。

### 5. 诊断信息输出

**marker=none 时返回详细诊断**：

```javascript
var debugInfo = "selectionLen=" + objectCount + ";totalItems=" + totalItemsTraversed + 
                ";candidates=" + candidatesFound.length + ";items=[";
for (var i = 0; i < debugItems.length && i < 30; i++) {
  if (i > 0) debugInfo += ",";
  debugInfo += debugItems[i].typename + "(" + debugItems[i].w + "x" + debugItems[i].h + ")";
}
debugInfo += "]";

return "OK|" + methodUsed + "|marker=none|...|debug=" + debugInfo;
```

**Panel 端解析并显示**：

```typescript
if (debugPart) {
  const debugInfo = debugPart.replace('debug=', '');
  addDebugLog(`  诊断信息: ${debugInfo}`, 'info');
}
```

## 返回格式

### 成功（找到标尺）

```
OK|A:OpenCopyPaste|marker=found|xHeightPt=32.15|targetXHeightPt=6.30|scale=19.6|ratio=0.4530|items=1
```

### 失败（未找到标尺）

```
OK|A:OpenCopyPaste|marker=none|xHeightPt=0|targetXHeightPt=0|scale=0|ratio=0|items=1|debug=selectionLen=1;totalItems=45;candidates=12;items=[GroupItem(100.5x50.2),PathItem(12.0x12.0),PathItem(1.0x450.3),...]
```

### 错误

```
ERR|NO_DOC|请先打开或创建一个 Illustrator 文档
ERR|FILE_NOT_FOUND|文件不存在: /path/to/file.svg
ERR|IMPORT_FAILED|方法A失败: ...; 方法B失败: ...; 方法C失败: ...
ERR|EXCEPTION|error message
```

## 日志输出示例

### Panel 端（插入前）

```
目标字号: 14 pt
标尺校准数据:
  x-height: 450.123 (SVG 单位)
  x-height/em ratio: 0.4530
  来源: Latin Modern Math
  → 将传递给 JSX: ratio=0.4530
```

### JSX 返回（插入后 - 成功）

```
✓ SVG 已导入到文档
  方法: A:OpenCopyPaste
  对象数: 1
  ✓ 找到标尺
  目标字号 (em): 14pt
  x-height/em ratio: 0.4530 (panel传入: 0.4530)
  x-height (实际): 32.15pt
  x-height (目标): 6.30pt
  缩放比例: 19.6%
  ✓ 字号统一已应用
```

### JSX 返回（插入后 - 失败）

```
✓ SVG 已导入到文档
  方法: A:OpenCopyPaste
  对象数: 1
  ✗ 标尺识别失败
  本次未应用字号统一
  诊断信息: selectionLen=1;totalItems=45;candidates=12;items=[GroupItem(100.5x50.2),PathItem(12.0x12.0),PathItem(1.0x450.3),...]
```

## 验收标准

- [x] Panel 端使用分隔符协议传参（path||targetFontPt||ratio）
- [x] JSX 端正确解析参数（split + parseFloat）
- [x] JSX 返回 ratio 值与 panel 传入一致
- [x] 递归遍历支持 PathItem 和 CompoundPathItem
- [x] marker=none 时输出诊断信息（selectionLen、totalItems、candidates、前30个item）
- [x] Panel 端强制校验 ratio（有限数 且 在 (0,1) 范围内）
- [x] marker=none 视为失败，不再默默回退默认宽度缩放
- [x] 构建成功（TypeScript + Vite + CEP）

## 测试步骤

1. 完全关闭 Adobe Illustrator
2. 重新启动 Illustrator
3. 打开扩展：窗口 > 扩展 > Math Formula Plugin
4. 输入公式（如 `x + y = z`）并渲染
5. 查看调试日志，确认：
   - calibrationData 显示正确的 ratio
   - "将传递给 JSX: ratio=X.XXXX"
6. 点击"插入到 Illustrator"
7. 查看插入日志，确认：
   - "x-height/em ratio: X.XXXX (panel传入: X.XXXX)" - 两个值一致
   - marker=found
   - 缩放比例正确应用
8. 如果 marker=none，查看诊断信息，分析原因

## 回归测试

**同一公式连续插入 3 次，scale 波动 < 1%**：

1. 渲染公式 `x + y = z`
2. 插入到 Illustrator（记录 scale1）
3. 删除插入的对象
4. 再次插入（记录 scale2）
5. 删除插入的对象
6. 第三次插入（记录 scale3）
7. 验证：`|scale1 - scale2| < 1%` 且 `|scale2 - scale3| < 1%`

## 相关文件

- `math-formula-plugin/src/main.ts` - Panel 端逻辑、参数传递、JSX 调用、解析逻辑
- `math-formula-plugin/src/lib/formula-generator.ts` - CalibrationData 计算
- `math-formula-plugin/docs/phase4-xheight-ratio-fix.md` - ratio 参数传递修复文档
- `math-formula-plugin/docs/phase4-fixed-calibration-height.md` - 固定标尺高度方案文档

## Phase 归属

本修复属于 Phase 4 (Adobe Illustrator CEP Integration) 的字号统一功能改进。
