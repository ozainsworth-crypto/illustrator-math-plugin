# Phase 4: 固定标尺高度实现（改进版）

## 版本历史

- **v1**：每个公式从自身抽样计算 baseGlyphHeight（已废弃）
- **v2**（当前）：使用固定参考字符计算标准标尺高度

## 核心问题

**v1 的问题**：
- 每个公式从自身抽样计算 `baseGlyphHeight`
- 不同公式包含的字符集不同（分数、指数、求和符号等）
- 导致标尺高度在不同公式间不一致
- 最终字号无法统一

**根本原因**：
1. 抽样结果差异大（不同公式的字符集不同）
2. 标尺放在 SVG 根节点，与公式内容不在同一 transform 上下文

## v2 解决方案

### 1. 固定标尺高度（使用参考字符）

**实现**：
- 初始化时使用固定参考字符 `'x'` 渲染一次
- 计算其 bbox 高度作为 `calibrationHeightCache`
- **只计算一次并缓存**
- 所有公式导出 SVG 时，标尺高度一律使用这个固定值

**代码位置**：`src/lib/formula-generator.ts`

```typescript
export class WebFormulaGenerator {
  private calibrationHeightCache: number | null = null;

  private async getCalibrationHeight(): Promise<number> {
    // 如果已缓存，直接返回
    if (this.calibrationHeightCache !== null) {
      return this.calibrationHeightCache;
    }
    
    // 使用固定参考字符 'x' 渲染
    const refSvgElement = MathJax.tex2svg('x', {
      display: this.config.displayMode,
    });
    
    // 计算 bbox.height 并缓存
    // ... (详见代码)
    
    this.calibrationHeightCache = bbox.height;
    console.log(`[CalibrationHeight] 标准标尺高度已缓存: ${this.calibrationHeightCache.toFixed(3)}`);
    return this.calibrationHeightCache;
  }
}
```

**优势**：
- 所有公式使用相同的标尺高度
- 标尺高度不受公式内容影响
- 确保字号统一

### 2. 标尺放置在公式内容主 `<g>` 内部

**v1 的问题**：
- 标尺添加到 SVG 根节点
- 与公式内容不在同一 transform 上下文
- Illustrator 导入时可能应用不同的缩放

**v2 实现**：
- 查找 MathJax 生成的主 `<g>` 元素（公式内容容器）
- 将标尺元素 append 到主 `<g>` 内部，与 path 同级
- 确保标尺与公式共享同一 transform/scale 上下文

**代码位置**：`src/lib/formula-generator.ts`

```typescript
private addCalibrationMarker(svg: SVGElement, calibrationHeight: number): void {
  // 查找公式内容的主 <g> 元素
  const mainGroup = svg.querySelector('g');
  
  if (!mainGroup) {
    // 降级方案：添加到 SVG 根节点
    this.addCalibrationMarkerToRoot(svg, calibrationHeight);
    return;
  }

  // 创建 tag 和 ruler
  const tag = document.createElementNS('http://www.w3.org/2000/svg', 'rect');
  // ... 设置属性
  
  const ruler = document.createElementNS('http://www.w3.org/2000/svg', 'rect');
  ruler.setAttribute('height', calibrationHeight.toString()); // 使用固定值
  // ... 设置其他属性
  
  // 添加到主 <g> 内部（与公式内容同级）
  mainGroup.appendChild(tag);
  mainGroup.appendChild(ruler);
}
```

**优势**：
- 标尺与公式共享 transform
- Illustrator 导入时标尺会随公式一起缩放
- 确保测量准确

## 双标记系统

### Tag 方块（用于识别）
- **ID**: `mf_calib_tag`
- **尺寸**：12×12
- **颜色**：#ff00ff（洋红色）
- **透明度**：0.02
- **作用**：可靠识别标尺位置

### Ruler 竖线（用于测量）
- **ID**: `mf_calib_xheight`
- **尺寸**：1×calibrationHeight（**固定值**）
- **颜色**：#ff00ff（洋红色）
- **透明度**：0.01
- **作用**：测量字号

## JSX 查找逻辑

**步骤**：
1. 先找 tag（12×12 方块，品红色）
2. 在候选项中找 ruler（宽度 < 3pt，高度 > 宽度 × 50，品红色）
3. 计算缩放：`scale = targetFontSize / markerHeightPt`
4. 应用缩放：`insertedItem.resize(scale * 100, scale * 100)`
5. 删除 tag 和 ruler

**代码位置**：`src/main.ts` - `callInsertSVGWithDebug()`

## 纯文本返回协议

**问题**：ExtendScript 没有 JSON 对象

**解决方案**：纯文本协议

**格式**：
- 成功：`OK|<method>|marker=<found/none>|markerH=<pt>|scale=<percent>|items=<n>`
- 失败：`ERR|<code>|<detail>`

**解析**（Panel 端）：
```typescript
const parts = result.split('|');
const status = parts[0];
if (status === 'OK') {
  const markerFound = parts[2].includes('found');
  const markerH = parseFloat(parts[3].replace('markerH=', ''));
  const scalePercent = parseFloat(parts[4].replace('scale=', ''));
  // ...
}
```

## 验收标准

- [x] 不同公式使用相同的标尺高度（从参考字符 'x' 计算）
- [x] 标尺放在主 `<g>` 内部，与公式共享 transform 上下文
- [x] JSX 能找到标尺并正确计算缩放
- [x] 插入后基础字母/数字视觉字号一致（14pt）
- [x] 调试日志显示：calibrationHeight（固定值）、markerHpt、scaleApplied
- [x] 不再出现 "JSON 未定义" 错误

## 测试步骤

1. **完全关闭 Illustrator**
2. **重新启动 Illustrator**
3. **打开扩展**：窗口 > 扩展 > Math Formula Plugin
4. **测试不同公式**：
   - 简单字母：`x`
   - 分数：`\frac{a}{b}`
   - 指数：`x^2`
   - 求和：`\sum_{i=1}^{n}`
   - 复杂公式：`\int_{0}^{\infty} e^{-x^2} dx`
5. **验证调试日志**：
   - 显示固定的 calibrationHeight（如 ~450-500）
   - 显示 markerHpt（Illustrator 中的标尺高度）
   - 显示 scaleApplied（缩放比例）
6. **验证插入结果**：
   - 所有公式的基础字母/数字高度一致
   - 对应 14pt 字号（或用户设置的字号）

## 预期结果

**调试日志示例**：
```
📏 标准标尺高度: 450.123 (SVG 单位，固定值)
📏 标尺已添加到 SVG
✓ SVG 已成功插入
  方法: placeFile
  对象数: 5
  ✓ 找到标尺
  标尺高度: 12.34pt
  目标字号: 14pt
  缩放比例: 113.5%
  缩放已应用: 是
```

**视觉验证**：
- 不同公式插入后，基础字母（如 x, a, b）高度一致
- 分数、指数、下标的相对比例正确
- 整体视觉协调

## 已知限制

1. **降级方案**：如果 MathJax 生成的 SVG 没有主 `<g>` 元素，会降级到 SVG 根节点（可能导致 transform 不一致）
2. **配置依赖**：标尺高度依赖参考字符 'x' 的渲染结果，如果 MathJax 配置变化可能需要重新计算
3. **缓存生命周期**：calibrationHeightCache 在 WebFormulaGenerator 实例生命周期内有效，页面刷新后重新计算

## 相关文件

- `src/lib/formula-generator.ts` - 标尺生成逻辑（getCalibrationHeight, addCalibrationMarker）
- `src/main.ts` - JSX 标尺查找和缩放逻辑（callInsertSVGWithDebug）
- `extension/host/illustrator.jsx` - ExtendScript 插入逻辑（已内联到 main.ts）

## 技术细节

### MathJax SVG 结构

```xml
<svg viewBox="...">
  <defs>
    <path id="MJX-1-TEX-N-78" d="..."/>  <!-- 字符 'x' -->
    <!-- 其他字符定义 -->
  </defs>
  <g>  <!-- 主内容组 -->
    <use href="#MJX-1-TEX-N-78" x="..." y="..."/>
    <!-- 其他字符引用 -->
    
    <!-- v2: 标尺添加在这里（与公式内容同级） -->
    <rect id="mf_calib_tag" width="12" height="12" .../>
    <rect id="mf_calib_xheight" width="1" height="450.123" .../>
  </g>
</svg>
```

### 标尺高度计算

参考字符 'x' 的 bbox.height 通常在 450-500 之间（MathJax 默认配置）：
- 这个值对应 1em 的基础字符高度
- 不同字体可能略有差异
- 缓存后所有公式使用相同值

### 缩放计算示例

假设：
- calibrationHeight = 450（SVG 单位）
- Illustrator 导入后 markerHeightPt = 12.34pt
- 目标字号 targetFontSize = 14pt

计算：
- scale = 14 / 12.34 = 1.135 (113.5%)
- 应用：insertedItem.resize(113.5, 113.5)

结果：
- 基础字符高度变为 14pt
- 整个公式等比缩放
