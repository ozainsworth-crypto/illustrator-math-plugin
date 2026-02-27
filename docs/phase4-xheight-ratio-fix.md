# Phase 4: x-height/em Ratio 参数传递修复

## 问题描述

在之前的实现中，JSX 端硬编码了 `xHeightToEmRatio = 0.45`，导致：
1. 不同字体的实际 x-height/em 比例被忽略
2. 字号统一功能无法准确反映字体的真实比例
3. Panel 端计算的 calibrationData 未被 JSX 使用

## 解决方案

### 1. Panel 端传递 ratio 参数

在 `callInsertSVGWithDebug()` 函数中：
- 从 `currentSVGResult.calibrationData.xHeightToEmRatio` 获取比例
- 将 ratio 作为参数传递给 JSX（通过模板字符串插值）
- 添加调试日志显示传递的 ratio 值

```typescript
// 获取 x-height/em 比例（从 calibrationData）
const xHeightToEmRatio = currentSVGResult?.calibrationData?.xHeightToEmRatio ?? 0.45;

const script = `
  // ... JSX 代码
  var xHeightToEmRatio = ${xHeightToEmRatio}; // 使用传入的 ratio
  // ...
`;
```

### 2. JSX 端使用传入的 ratio

修改 JSX 代码：
- 移除硬编码的 `var xHeightToEmRatio = 0.45;`
- 改为使用从 panel 传入的 `${xHeightToEmRatio}`
- 使用该 ratio 计算 `targetXHeightPt = targetFontPt * xHeightToEmRatio`

### 3. 更新返回格式

JSX 返回格式添加 `ratio` 字段：
```
OK|<method>|marker=<found/none>|xHeightPt=<pt>|targetXHeightPt=<pt>|scale=<percent>|ratio=<ratio>|items=<n>
```

### 4. 更新解析和日志输出

Panel 端解析返回值时：
- 提取 `ratio` 字段（parts[6]）
- 调整 `items` 字段索引为 parts[7]
- 在调试日志中显示：
  - 目标字号 (em)
  - x-height/em ratio
  - x-height (实际)
  - x-height (目标)
  - 缩放比例

## 日志输出示例

### Panel 端（插入前）
```
目标字号: 14 pt
标尺校准数据:
  x-height: 450.123 (SVG 单位)
  x-height/em ratio: 0.4501
  → 将传递给 JSX: ratio=0.4501
```

### JSX 返回（插入后）
```
✓ SVG 已成功插入
  方法: A:OpenCopyPaste
  对象数: 1
  ✓ 找到标尺
  目标字号 (em): 14pt
  x-height/em ratio: 0.4501
  x-height (实际): 32.15pt
  x-height (目标): 6.30pt
  缩放比例: 19.6%
  缩放已应用: 是
```

## 验收标准

- [x] Panel 端从 calibrationData 获取 xHeightToEmRatio
- [x] Panel 端将 ratio 传递给 JSX（通过 evalScript payload）
- [x] JSX 端使用传入的 ratio 计算 targetXHeightPt
- [x] 返回格式包含 ratio 字段
- [x] 解析逻辑正确提取 ratio 并显示在日志中
- [x] 构建成功（TypeScript + Vite + CEP）

## 测试步骤

1. 完全关闭 Adobe Illustrator
2. 重新启动 Illustrator
3. 打开扩展：窗口 > 扩展 > Math Formula Plugin
4. 输入公式（如 `x + y = z`）并渲染
5. 查看调试日志，确认 calibrationData 显示正确的 ratio
6. 点击"插入到 Illustrator"
7. 查看插入日志，确认：
   - ratio 值与 calibrationData 一致
   - targetXHeightPt = targetFontPt * ratio
   - 缩放比例正确应用
8. 切换不同字体包，重复测试，确认不同字体的 ratio 不同

## 相关文件

- `math-formula-plugin/src/main.ts` - Panel 端逻辑和 JSX 调用
- `math-formula-plugin/src/lib/formula-generator.ts` - CalibrationData 计算
- `math-formula-plugin/docs/phase4-fixed-calibration-height.md` - 固定标尺高度方案文档

## Phase 归属

本修复属于 Phase 4 (Adobe Illustrator CEP Integration) 的字号统一功能改进。
