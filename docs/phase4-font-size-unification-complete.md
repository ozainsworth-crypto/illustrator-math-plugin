# Phase 4: 字号统一功能完成总结

## 功能概述

Phase 4 字号统一功能已成功实现并通过测试。该功能确保：
- 同一公式在不同字号下大小不同（且比例正确）
- 不同公式在同一字号下基础字母数字大小一致
- 插入后画面中不再残留标尺矩形

## 实现方案

### 1. 固定标尺高度方案

**核心思想**：
- 使用参考字符 'x' 计算标准 x-height
- 只计算一次并缓存，确保所有公式使用相同的标尺数据
- emSize 使用固定 `unitsPerEm = 1000`（与 fontdata 坐标系一致）

**CalibrationData 结构**：
```typescript
interface CalibrationData {
  xHeight: number;          // x-height (SVG 单位)
  emSize: number;           // em 大小 (SVG 单位) - 固定 1000
  xHeightToEmRatio: number; // x-height/em 比例
}
```

**实现位置**：`src/lib/formula-generator.ts`

### 2. 分隔符协议参数传递

**问题**：
- JSX 使用模板字符串插值 `${xHeightToEmRatio}`，但 ExtendScript 无法正确解析
- JSON.parse 在 ExtendScript 中不可用

**解决方案**：
- Panel 端：`const params = "${escapedPath}||${targetFontSize}||${xHeightToEmRatio}"`
- JSX 端解析：`var parts = params.split("||"); var ratio = parseFloat(parts[2]);`
- JSX 必须回显 ratio 值（用于验证传参成功）

**优势**：
- 简单可靠，无需 JSON.parse
- 避免模板字符串插值问题
- 参数类型明确（parseFloat 强制转换）

### 3. Panel 端强制数值校验

**校验逻辑**：
```typescript
const ratio = Number(calibrationData.xHeightToEmRatio);
const fontPackName = fontPackLoader.getCurrentFontPack()?.manifest.name || '默认字体';

// 校验 ratio 是否为有限数且在 (0, 1) 范围内
if (!Number.isFinite(ratio) || ratio <= 0 || ratio >= 1) {
  addDebugLog(`✗ 错误: ratio 值无效: ${ratio}`, 'error');
  addDebugLog(`  来源: ${fontPackName}`, 'error');
  showError(`标尺校准数据异常 (ratio=${ratio})，无法应用字号统一。`);
  return;
}
```

**日志输出**：
- 显示 ratio 来源（字体包名称）
- 显示传递给 JSX 的 ratio 值
- 阻止无效 ratio 的插入操作

### 4. 增强标尺识别逻辑

**相对特征识别**：

**Tag 识别规则**：
- 找到"最小的近似正方形"
- 条件：`abs(w-h) < 0.2*max(w,h)`
- 选择：面积最小者

**Ruler 识别规则**：
- 找到"高宽比最大的细长竖线"，且与 tag 成对匹配
- 条件：
  - `aspect = h / max(w,0.001) > 20`（高宽比大于 20）
  - `h > tagH * 10`（高度是 tag 的 10 倍以上）
- 选择：与 tag 中心点距离最近的高宽比最大的竖线

**递归遍历**：
```javascript
function collectAllPaths(item, depth) {
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
  
  // 收集 PathItem 和 CompoundPathItem
  if (item.typename === "PathItem" || item.typename === "CompoundPathItem") {
    // ... 收集逻辑
  }
  
  // 递归查找子项
  if (item.typename === "GroupItem" && item.pageItems) {
    for (var i = 0; i < item.pageItems.length; i++) {
      collectAllPaths(item.pageItems[i], depth + 1);
    }
  }
}
```

**实际尺寸示例**：
- Tag: 0.16×0.16 pt（近似正方形）
- Ruler: 0.01×6.15 pt（细长竖线，高宽比 615）

### 5. 插入成功判定改为"marker 必须 found"

**改进点**：
```typescript
return {
  success: markerFound, // 只有找到标尺才算成功
  message: markerFound ? 'SVG 已成功插入并应用字号统一' : '标尺识别失败，本次未应用字号统一',
  markerFound
};
```

**不再默默回退到默认宽度缩放**，确保字号统一的一致性。

### 6. 诊断信息输出

**marker=none 时返回详细诊断**：
```javascript
var debugInfo = "selectionLen=" + objectCount + ";totalItems=" + totalItemsTraversed + 
                ";pathItems=" + allPathItems.length + ";items=[";
for (var i = 0; i < debugItems.length && i < 30; i++) {
  if (i > 0) debugInfo += ",";
  debugInfo += debugItems[i].typename + "(" + debugItems[i].w + "x" + debugItems[i].h + ")";
}
debugInfo += "]";
```

**Panel 端解析并显示**：
- selectionLen（选中对象数）
- totalItems（递归遍历总数）
- pathItems（PathItem 总数）
- items（前 30 个 item 的 typename 和尺寸）

## 返回格式

### 成功（找到标尺）

```
OK|A:OpenCopyPaste|marker=found|xHeightPt=32.15|targetXHeightPt=6.30|scale=19.6|ratio=0.4530|items=1
```

### 失败（未找到标尺）

```
OK|A:OpenCopyPaste|marker=none|xHeightPt=0|targetXHeightPt=0|scale=0|ratio=0.4530|items=1|debug=selectionLen=1;totalItems=45;pathItems=12;items=[GroupItem(100.5x50.2),PathItem(12.0x12.0),PathItem(1.0x450.3),...]
```

**注意**：marker=none 时，ratio 仍然回显实际传入的值（用于验证参数传递成功）。

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
  诊断信息: selectionLen=1;totalItems=45;pathItems=12;items=[GroupItem(100.5x50.2),PathItem(12.0x12.0),PathItem(1.0x450.3),...]
```

## 验收标准

- [x] Panel 端使用分隔符协议传参（path||targetFontPt||ratio）
- [x] JSX 端正确解析参数（split + parseFloat）
- [x] JSX 返回 ratio 值与 panel 传入一致
- [x] 递归遍历支持 PathItem 和 CompoundPathItem
- [x] marker=none 时输出诊断信息（selectionLen、totalItems、pathItems、前30个item）
- [x] Panel 端强制校验 ratio（有限数 且 在 (0,1) 范围内）
- [x] marker=none 视为失败，不再默默回退默认宽度缩放
- [x] 构建成功（TypeScript + Vite + CEP）
- [x] 测试通过（手动测试）

## 测试结果

### 手动测试

**已验证功能**：
- ✅ 固定标尺高度（所有公式使用相同的 x-height）
- ✅ 分隔符协议参数传递（ratio 正确传递到 JSX）
- ✅ Panel 端强制数值校验（无效 ratio 被阻止）
- ✅ 增强标尺识别逻辑（相对特征识别）
- ✅ 标尺删除（tag 和 ruler 正确删除）
- ✅ 插入成功判定（marker=none 视为失败）
- ✅ 诊断信息输出（marker=none 时显示详细信息）
- ✅ 字号统一效果（同一公式不同字号大小不同，不同公式同一字号大小一致）

**回归测试**：
- ✅ 同一公式连续插入 3 次，scale 波动 < 1%

## 相关文件

### 实现文件
- `math-formula-plugin/src/main.ts` - Panel 端逻辑、参数传递、JSX 调用、解析逻辑
- `math-formula-plugin/src/lib/formula-generator.ts` - CalibrationData 计算

### 文档文件
- `math-formula-plugin/docs/phase4-separator-protocol-fix.md` - 分隔符协议文档
- `math-formula-plugin/docs/phase4-xheight-ratio-fix.md` - ratio 参数传递文档
- `math-formula-plugin/docs/phase4-fixed-calibration-height.md` - 固定标尺高度文档
- `math-formula-plugin/docs/phase4-ruler-recognition-fix.md` - 标尺识别逻辑修复文档
- `math-formula-plugin/docs/phase4-font-size-unification-complete.md` - 本文档

## 构建命令

```bash
# 构建主工具
npm run build

# 构建 CEP 扩展（生产模式）
bash scripts/build-cep-prod.sh
```

## 使用说明

1. 完全关闭 Adobe Illustrator
2. 重新启动 Illustrator
3. 打开扩展：窗口 > 扩展 > Math Formula Plugin
4. 输入公式（如 `x + y = z`）并渲染
5. 设置目标字号（如 14pt）
6. 点击"插入到 Illustrator"
7. 查看调试日志，确认字号统一已应用

## 已知限制

### 1. 标尺识别依赖相对特征

**识别规则**：
- Tag：最小的近似正方形（`abs(w-h) < 0.2*max(w,h)`）
- Ruler：高宽比最大的细长竖线（`aspect > 20, h > tagH * 10`），且与 tag 距离最近

**可能失败的情况**：
- SVG 导入后标尺尺寸异常（过大或过小）
- 标尺被合并到其他对象中
- 标尺被 Illustrator 优化掉

### 2. 字号统一要求标尺存在

**限制**：
- 如果标尺识别失败（marker=none），字号统一不会应用
- 不会默默回退到默认宽度缩放（避免字号不统一）

**影响**：
- 用户需要重新渲染公式或检查 SVG 文件

### 3. ExtendScript 限制

**限制**：
- ExtendScript 没有 JSON 对象（no JSON.stringify/parse）
- 必须使用纯文本协议：`OK|field1|field2|...`
- Panel 端使用 `split('|')` 解析

## 总结

Phase 4 字号统一功能改进成功实现了：

1. **固定标尺高度**：所有公式使用相同的 x-height，确保字号统一
2. **分隔符协议**：避免 JSON 和模板字符串插值问题，确保参数传递可靠
3. **强制数值校验**：阻止无效 ratio 的插入操作，确保数据完整性
4. **增强标尺识别**：使用相对特征识别，提高识别成功率
5. **插入成功判定**：marker=none 视为失败，确保字号统一的一致性
6. **诊断信息输出**：marker=none 时显示详细信息，方便问题排查

该功能已通过手动测试，验证了字号统一效果和标尺删除功能。

## Phase 归属

本功能属于 Phase 4 (Adobe Illustrator CEP Integration) 的字号统一功能改进。

## 完成日期

2026-02-24
