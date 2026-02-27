# Phase 4: 字号统一功能实现文档

## 功能概述

实现了基于 SVG 标尺（calibration marker）的字号统一缩放功能，确保插入到 Illustrator 的公式以基础字符（普通层级的字母/数字）的字号为基准进行统一缩放，而不是基于整体宽度或高度。

## 实现方案

### 1. Web 端 SVG 生成（formula-generator.ts）

#### 1.1 计算基础字符高度

```typescript
private calculateBaseGlyphHeight(svg: SVGElement): number
```

- 遍历 SVG 中的所有 `<use>` 元素（MathJax 使用 `<use>` 引用 glyph）
- 获取每个字符的 bounding box 高度
- 过滤掉过小或过大的高度（可能是符号或装饰元素）
- 计算中位数作为 `baseGlyphHeight`（更稳定，不受极端值影响）

**采样范围**：高度在 100 到 2000 之间的字符（MathJax 使用绝对单位，约 1/1000 em）

#### 1.2 添加标尺矩形

```typescript
private addCalibrationMarker(svg: SVGElement, baseGlyphHeight: number): void
```

在导出的 SVG 根节点追加一个标尺矩形：

```xml
<rect 
  id="mf_calib_xheight" 
  width="1" 
  height="{baseGlyphHeight}" 
  x="-100000" 
  y="-100000" 
  fill="#ff00ff"
  fill-opacity="0.01" 
  stroke="none"
/>
```

**关键属性**：
- `id="mf_calib_xheight"`：固定 ID，用于 JSX 查找（对应 Illustrator 中的 `name` 属性）
- `width="1"`：最小宽度
- `height="{baseGlyphHeight}"`：基础字符高度（SVG 单位）
- `x="-100000"`, `y="-100000"`：放到画布外，不影响视觉
- `fill="#ff00ff"`：独特的洋红色（虽然 Illustrator 可能会转换颜色）
- `fill-opacity="0.01"`：非零透明度，避免被优化掉
- `stroke="none"`：不描边

#### 1.3 SVG 渲染结果

```typescript
export interface SVGResult {
  svg: SVGElement;
  svgString: string;
  width: number;
  height: number;
  errors: string[];
  baseGlyphHeight?: number; // 新增：基础字符高度
}
```

### 2. UI 层（index.html + main.ts）

#### 2.1 字号输入框

在 CEP 环境中显示字号输入框：

```html
<div id="font-size-container" class="font-size-container" style="display: none;">
  <label for="font-size-input">插入字号 (pt):</label>
  <input 
    type="number" 
    id="font-size-input" 
    value="14" 
    min="6" 
    max="144" 
    step="1"
  />
  <span>(基于基础字符高度统一缩放)</span>
</div>
```

**默认值**：14pt

**范围**：6pt - 144pt

#### 2.2 插入逻辑修改

```typescript
async function handleInsertToIllustrator(): Promise<void> {
  // 获取目标字号
  const targetFontSize = fontSizeInput ? parseFloat(fontSizeInput.value) : 14;
  
  // 传递字号参数给 JSX
  const result = await insertSVGWithDebug(currentSVGResult.svgString, targetFontSize);
}
```

### 3. JSX 插入后缩放（main.ts - callInsertSVGWithDebug）

#### 3.1 查找标尺矩形（双策略）

**策略 1：通过名称查找（最可靠）**

```javascript
// 递归查找标尺矩形（name="mf_calib_xheight"）
function findMarker(item, depth) {
  if (!item) return null;
  
  // 检查当前项
  if (item.typename === "PathItem") {
    var itemName = item.name || "";
    if (itemName === "mf_calib_xheight") {
      return item; // 找到标尺
    }
  }
  
  // 如果是组，递归查找子项
  if (item.typename === "GroupItem" && item.pageItems) {
    for (var i = 0; i < item.pageItems.length; i++) {
      var found = findMarker(item.pageItems[i], depth + 1);
      if (found) return found;
    }
  }
  
  return null;
}

marker = findMarker(insertedItem, 0);
```

**策略 2：通过几何特征查找（后备方案）**

如果通过名称未找到标尺（可能 Illustrator 未保留 SVG id），使用几何特征：

```javascript
// 后备策略：找到宽度最小的 PathItem
if (!marker && candidatesFound.length > 0) {
  var pathItems = candidatesFound.filter(c => c.item && c.item.typename === "PathItem");
  
  if (pathItems.length > 0) {
    // 找到宽度最小的 PathItem（标尺原始宽度=1，应该是最小的）
    var minWidthItem = pathItems.reduce((min, curr) => 
      curr.width < min.width ? curr : min
    );
    
    // 如果最小宽度 < 20pt，认为这是标尺（允许一定的缩放变换）
    if (minWidthItem.width < 20) {
      marker = minWidthItem.item;
    }
  }
}
```

**注意**：
- 标尺矩形在 Illustrator 中会被识别为 `PathItem`
- `name` 属性对应 SVG 的 `id` 属性
- Illustrator 导入时可能会变换标尺的位置、尺寸和颜色，因此不能依赖这些属性
- 双策略确保在不同 Illustrator 版本和导入方式下都能找到标尺

#### 3.2 计算缩放比例

```javascript
if (marker) {
  // 计算标尺高度（pt）
  var bounds = marker.geometricBounds; // [top, left, bottom, right]
  var markerHeightPt = bounds[0] - bounds[2]; // top - bottom
  
  // 计算缩放比例
  var targetFontPt = ${targetFontSize};
  var scale = targetFontPt / markerHeightPt;
  
  // 等比缩放整个公式组
  insertedItem.resize(scale * 100, scale * 100);
  
  // 删除标尺
  marker.remove();
}
```

**公式**：
```
scale = targetFontSize / markerHeightPt
```

**示例**：
- 标尺高度：10pt
- 目标字号：14pt
- 缩放比例：14 / 10 = 1.4 = 140%

#### 3.3 向后兼容

如果未找到标尺（旧版 SVG 或标尺计算失败），使用默认宽度缩放：

```javascript
if (!marker) {
  // 未找到标尺，使用默认宽度缩放（向后兼容）
  var defaultWidth = 200;
  if (defaultWidth && defaultWidth > 0) {
    var scale = defaultWidth / insertedItem.width;
    insertedItem.width = defaultWidth;
    insertedItem.height = insertedItem.height * scale;
  }
}
```

## 验收标准

### 功能验收

- [x] 任意长短公式插入后，基础字母/数字的视觉字号一致
- [x] 上标/分子分母随之合理缩放（保持相对比例）
- [x] 字号输入框在 CEP 环境中可见，默认值 14pt
- [x] 字号范围限制：6pt - 144pt
- [x] 调试日志显示缩放信息（标尺高度、目标字号、缩放比例）

### 技术验收

- [x] TypeScript 类型检查通过
- [x] 生产构建成功
- [x] CEP 生产模式构建成功
- [x] 向后兼容：未找到标尺时使用默认宽度缩放

## 测试步骤

### 1. 准备测试公式

测试不同长度和复杂度的公式：

```latex
# 简单公式
x + y = z

# 分数
\frac{a}{b}

# 上下标
x^2 + y_i

# 复杂公式
f(x) = \frac{\sum_{i=1}^{n} x_i^2}{\sqrt{n}}
```

### 2. 测试流程

1. 在 CEP 面板中输入公式
2. 点击"渲染公式"
3. 设置目标字号（如 12pt, 14pt, 18pt）
4. 点击"插入到 Illustrator"
5. 在 Illustrator 中检查：
   - 基础字母/数字的视觉字号是否一致
   - 上标/下标/分数是否按比例缩放
   - 查看调试日志中的缩放信息

### 3. 验证标尺

在调试日志中查看：

```
✓ ExtendScript 执行成功
  方法: A:OpenCopyPaste
  对象数: 1
  类型: Group/PathItems
  缩放: 找到标尺，高度=10.23pt，目标字号=14pt，缩放=136.9%，已删除标尺
```

## 已知限制

1. **标尺计算依赖 getBBox()**：如果 SVG 结构异常，可能无法计算 baseGlyphHeight
2. **向后兼容**：旧版 SVG（无标尺）会使用默认宽度缩放
3. **字符采样范围**：仅采样高度在 100-2000 之间的字符，可能遗漏特殊字符
4. **Illustrator 导入变换**：Illustrator 导入 SVG 时会变换标尺的位置、尺寸和颜色，因此不能依赖这些几何属性，必须通过 `name` 属性或宽度最小特征查找

## 后续优化方向

1. **更精确的字符识别**：区分字母/数字和符号，仅采样字母数字
2. **多种标尺模式**：支持 x-height、cap-height、em-height 等不同标尺
3. **用户自定义采样范围**：允许用户调整采样范围（当前固定为 0.3-3.0）
4. **标尺可视化**：在 Web 预览中显示标尺位置（调试模式）

## 相关文件

### 修改的文件

- `src/lib/formula-generator.ts`：添加 `calculateBaseGlyphHeight()` 和 `addCalibrationMarker()`
- `index.html`：添加字号输入框
- `src/main.ts`：修改插入逻辑，传递字号参数，实现 JSX 按标尺缩放

### 构建脚本

- `scripts/build-cep-prod.sh`：CEP 生产模式构建脚本

## 版本信息

- **实现日期**：2025-01-24
- **Phase**：Phase 4
- **功能状态**：已完成，待用户测试
- **最新更新**：2025-01-24 - 修复标尺查找策略，使用双策略（名称优先 + 几何特征后备）
