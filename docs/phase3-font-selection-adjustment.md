# Phase 3 字体选择方案调整

## 调整日期
2026-02-05

## 原始方案
用户上传 TTF/OTF 字体文件，系统存储并管理这些字体。

## 调整后方案
用户从 `public/fonts` 目录中选择预置的字体，无需上传。

## 调整原因
1. **简化用户操作**：避免用户需要寻找和上传字体文件
2. **确保字体质量**：预置字体经过测试，确保兼容性
3. **减少存储需求**：无需在客户端存储用户上传的字体
4. **提高性能**：预置字体可以预加载，提高响应速度

## 实现变更

### 1. 字体管理
**原方案**：
- 用户上传字体文件
- 系统将字体存储到 LocalStorage/IndexedDB
- 提供字体列表管理（添加、删除、选择）

**新方案**：
- 系统扫描 `public/fonts` 目录
- 提供字体下拉选择器
- 字体文件通过 HTTP 请求加载

### 2. 字体数据模型

**原数据模型**：
```typescript
interface CustomFont {
  id: string;
  name: string;
  family: string;
  file: File;                 // 用户上传的文件
  base64: string;
  format: 'ttf' | 'otf';
  uploadedAt: Date;
}
```

**新数据模型**：
```typescript
interface PresetFont {
  id: string;                 // 字体 ID（文件名）
  name: string;               // 显示名称
  family: string;             // 字体族名称
  path: string;               // 字体文件路径（相对于 public/）
  format: 'ttf' | 'otf';
  preview?: string;           // 预览文本（可选）
}

interface FontLibrary {
  fonts: PresetFont[];        // 预置字体列表
  selectedFont: string | null; // 当前选中的字体 ID
  
  listFonts(): PresetFont[];
  selectFont(id: string): void;
  getSelectedFont(): PresetFont | null;
  loadFontAsBase64(font: PresetFont): Promise<string>;
}
```

### 3. UI 变更

**原 UI**：
- 字体上传按钮
- 字体列表（可删除）
- 字体选择器

**新 UI**：
- 字体下拉选择器（显示预置字体列表）
- 字体预览（可选）
- 恢复默认字体按钮

### 4. 字体加载流程

**新流程**：
```
用户选择字体
    ↓
从 public/fonts 加载字体文件
    ↓
转换为 base64 编码
    ↓
嵌入到 SVG 的 @font-face
    ↓
应用到字母数字
    ↓
生成带自定义字体的 SVG
```

## 当前可用字体

`public/fonts` 目录中的字体：
1. `FF DIN Pro Medium.otf` - FF DIN Pro 字体
2. `puzzlettf1011.ttf` - Puzzle 字体
3. `test.TTF` - 测试字体

## 需要更新的文件

### 需求文档
- 需求 4（C1.2-3）：将"上传 TTF/OTF 字体"改为"选择预置字体"
- 需求 4（C3.10）：更新字体管理验收标准

### 设计文档
- 数据模型 > 字体数据模型：更新为 PresetFont
- 组件设计 > Font_Replacer：更新字体加载逻辑

### 任务清单
- Task 9（字体管理与上传功能）：改为"字体选择功能"
- 移除字体上传相关任务
- 添加字体扫描和加载任务

## Phase 3 Spike 验证重点

由于字体来源变更，Spike 验证重点调整为：

1. **字体加载验证**：
   - 从 `public/fonts` 加载字体文件
   - 转换为 base64 编码
   - 性能测试（加载耗时）

2. **字体嵌入验证**：
   - 在 SVG 中嵌入 @font-face
   - 字体仅应用于字母数字
   - 符号保持 MathJax 默认

3. **可移植性验证**：
   - 未安装字体环境测试
   - Illustrator 兼容性测试

4. **多字体支持验证**：
   - 测试所有预置字体
   - 验证字体切换功能

## 实施计划

1. ✅ 创建字体选择方案调整文档
2. ⏭️ 完成 Phase 3 Spike 验证（方案 B：内嵌字体）
3. ⏭️ 更新需求文档和设计文档
4. ⏭️ 实现字体选择功能
5. ⏭️ 实现字体加载和嵌入功能
6. ⏭️ 测试和验收

---

**文档作者**：Kiro AI Agent
**创建日期**：2026-02-05
**状态**：✅ 已确认
