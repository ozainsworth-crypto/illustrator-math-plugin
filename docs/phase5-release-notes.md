# Phase 5 Release Notes - v1.0.0-beta

**发布日期**: 2026-02-27  
**版本类型**: 测试版本 (Beta Test Release)  
**目标**: 可安装、可运行、可测试的 CEP 扩展

---

## 📦 发布包信息

- **文件名**: `MathFormulaPlugin-v1.0.0-beta.zxp`
- **文件大小**: 6.2M
- **签名状态**: ✅ 已签名并验证
- **Git 标签**: `v1.0.0-beta`

---

## ✅ Phase 5 完成功能

### 1. CEP 扩展打包
- ✅ 生产环境构建脚本 (`scripts/build-cep-prod.sh`)
- ✅ ZXP 打包脚本 (`scripts/package-zxp.sh`)
- ✅ 自签名证书生成
- ✅ 时间戳签名 (timestamp.digicert.com)
- ✅ 签名验证通过

### 2. 交互体验优化
- ✅ 响应式布局 (CEP 面板宽度 300-600px+)
- ✅ 友好错误提示系统
- ✅ 错误消息模板化 (`src/lib/error-messages.ts`)

### 3. 文档系统
- ✅ 安装指南 (`docs/phase5-installation-guide.md`)
- ✅ 使用指南 (`docs/phase5-usage-guide.md`)
- ✅ 已知限制 (`docs/phase5-known-limitations.md`)
- ✅ 反馈指南 (`docs/phase5-feedback-guide.md`)
- ✅ 打包指南 (`docs/phase5-packaging-guide.md`)
- ✅ 验收清单 (`docs/phase5-acceptance-checklist.md`)

### 4. 发布准备
- ✅ 变更日志更新 (`CHANGELOG.md`)
- ✅ 安装说明文件 (`releases/INSTALLATION.txt`)
- ✅ Git 版本标签 (`v1.0.0-beta`)

---

## 📋 安装方法

### 方法 1: Anastasiy's Extension Manager (推荐)
1. 下载 Extension Manager: https://install.anastasiy.com/
2. 拖拽 `.zxp` 文件到 Extension Manager
3. 重启 Adobe Illustrator

### 方法 2: ZXPInstaller
1. 下载 ZXPInstaller: https://aescripts.com/learn/zxp-installer/
2. 拖拽 `.zxp` 文件到 ZXPInstaller
3. 重启 Adobe Illustrator

### 方法 3: 手动安装
详见 `releases/INSTALLATION.txt`

---

## 🎯 测试重点

### 核心功能测试
1. **LaTeX 输入**: 测试各种 LaTeX 公式输入
2. **PowerPoint 粘贴**: 测试从 PowerPoint 粘贴公式
3. **字体替换**: 测试自定义字体的字形替换
4. **歧义解析**: 测试分数、指数等歧义场景
5. **插入 Illustrator**: 测试 SVG 插入到画板

### 兼容性测试
- Adobe Illustrator 2023-2025 (v27.x - v30.x)
- macOS 12+ / Windows 10/11
- 不同 CEP 面板宽度 (300px - 600px+)

### 错误处理测试
- 无效 LaTeX 输入
- 字体文件缺失
- 网络连接问题 (MathJax CDN)
- Illustrator 通信失败

---

## ⚠️ 已知限制

详见 `docs/phase5-known-limitations.md`，主要包括：

1. **字体限制**: 仅支持包含 MATH 表的 OpenType 字体
2. **LaTeX 子集**: 支持常用数学符号，不支持复杂宏
3. **性能**: 首次加载 MathJax 需要 2-3 秒
4. **CEP Shell**: 外部脚本执行功能已禁用（Phase 6 修复）
5. **键盘快捷键**: 未实现（Phase 6 功能）

---

## 🐛 反馈渠道

详见 `docs/phase5-feedback-guide.md`

---

## 📊 Phase 5 验收状态

所有验收标准已完成，详见 `docs/phase5-acceptance-checklist.md`

---

## 🚀 下一步 (Phase 6)

Phase 6 将专注于：
1. 稳定性增强
2. 性能优化
3. CEP Shell 执行修复
4. 键盘快捷键实现
5. 完整文档系统

---

**Phase 5 目标达成**: ✅ 可安装、可运行、可测试
