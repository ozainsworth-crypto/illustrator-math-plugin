# Phase 4: 标尺识别逻辑修复

## 问题诊断

**症状**：
- Panel 端传入 `ratio=0.4530`
- JSX 返回 `marker=none` 且 `ratio=0`
- 标尺未被识别，字号缩放未执行
- 标尺残留在画面中（未删除）

**根本原因**：
1. **变量名错误**：代码中使用 `marker` 但应该使用 `ruler`
2. **变量未声明**：`markerHeightPt` 未声明就使用
3. **诊断信息错误**：引用了不存在的 `candidatesFound` 变量
4. **ratio 未回显**：marker=none 分支返回 `ratio=0` 而不是实际传入的 ratio

## 解决方案

### 1. 修复变量名和声明

**修复前**：
```javascript
if (marker) {
  var bounds = marker.geometricBounds;
  markerHeightPt = bounds[1] - bounds[3]; // markerHeightPt 未声明
  // ...
}
```

**修复后**：
```javascript
if (ruler && tag) {
  var rulerBounds = ruler.geometricBounds;
  var markerHeightPt = rulerBounds[1] - rulerBounds[3]; // 正确声明
  // ...
}
```

### 2. 修复标尺删除逻辑

**修复前**：
```javascript
if (marker) {
  if (tag) {
    tag.remove();
  }
  marker.remove(); // marker 不存在
}
```

**修复后**：
```javascript
if (ruler && tag) {
  try {
    tag.remove();
  } catch (e) {}
  
  try {
    ruler.remove();
  } catch (e) {}
}
```

### 3. 修复诊断信息

**修复前**：
```javascript
var debugInfo = "selectionLen=" + objectCount + ";totalItems=" + totalItemsTraversed + 
                ";candidates=" + candidatesFound.length + ";items=["; // candidatesFound 不存在
```

**修复后**：
```javascript
var debugInfo = "selectionLen=" + objectCount + ";totalItems=" + totalItemsTraversed + 
                ";pathItems=" + allPathItems.length + ";items=["; // 使用 allPathItems
```

### 4. 修复 ratio 回显

**修复前**：
```javascript
return "OK|" + methodUsed + "|marker=none|xHeightPt=0|targetXHeightPt=0|scale=0|ratio=0|items=" + 
       objectCount + "|debug=" + debugInfo;
```

**修复后**：
```javascript
return "OK|" + methodUsed + "|marker=none|xHeightPt=0|targetXHeightPt=0|scale=0|ratio=" + 
       xHeightToEmRatio.toFixed(4) + "|items=" + objectCount + "|debug=" + debugInfo;
```

### 5. 修复 artboard 变量名冲突

**修复前**：
```javascript
var artboard = doc.artboards[doc.artboards.getActiveArtboardIndex()];
var bounds = artboard.artboardRect; // 与外层 bounds 冲突
```

**修复后**：
```javascript
var artboard = doc.artboards[doc.artboards.getActiveArtboardIndex()];
var artboardBounds = artboard.artboardRect; // 使用不同的变量名
var centerX = (artboardBounds[0] + artboardBounds[2]) / 2;
var centerY = (artboardBounds[1] + artboardBounds[3]) / 2;
```

## 标尺识别逻辑（相对特征）

### Tag 识别规则
找到"最小的近似正方形"：
- 条件：`abs(w-h) < 0.2*max(w,h)`
- 选择：面积最小者

### Ruler 识别规则
找到"高宽比最大的细长竖线"，且与 tag 成对匹配：
- 条件：
  - `aspect = h / max(w,0.001) > 20`（高宽比大于 20）
  - `h > tagH * 10`（高度是 tag 的 10 倍以上）
- 选择：与 tag 中心点距离最近的高宽比最大的竖线

### 实际尺寸示例
- Tag: 0.16×0.16 pt（近似正方形）
- Ruler: 0.01×6.15 pt（细长竖线，高宽比 615）

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

## 验收标准

- [x] 修复变量名错误（marker → ruler）
- [x] 修复变量声明（markerHeightPt）
- [x] 修复诊断信息（candidatesFound → allPathItems）
- [x] 修复 ratio 回显（marker=none 时返回实际 ratio）
- [x] 修复变量名冲突（bounds → artboardBounds）
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
   - marker=found（如果标尺存在）
   - 缩放比例正确应用
   - 画面中不再残留标尺矩形
8. 如果 marker=none，查看诊断信息：
   - selectionLen（选中对象数）
   - totalItems（递归遍历总数）
   - pathItems（PathItem 总数）
   - items（前 30 个 item 的 typename 和尺寸）

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

- `math-formula-plugin/src/main.ts` - JSX 标尺识别逻辑（已修复）
- `math-formula-plugin/src/lib/formula-generator.ts` - CalibrationData 计算（已完成）
- `math-formula-plugin/docs/phase4-separator-protocol-fix.md` - 分隔符协议文档
- `math-formula-plugin/docs/phase4-xheight-ratio-fix.md` - ratio 参数传递文档
- `math-formula-plugin/docs/phase4-fixed-calibration-height.md` - 固定标尺高度文档

## Phase 归属

本修复属于 Phase 4 (Adobe Illustrator CEP Integration) 的字号统一功能改进。

## 构建命令

```bash
# 构建主工具
npm run build

# 构建 CEP 扩展（生产模式）
bash scripts/build-cep-prod.sh
```

## 下一步

1. 完全重启 Illustrator 测试
2. 验证标尺识别成功（marker=found）
3. 验证标尺已删除（画面中无残留）
4. 验证字号统一效果（同一公式不同字号大小不同，不同公式同一字号大小一致）
5. 如果 marker=none，分析诊断信息，调整识别规则
