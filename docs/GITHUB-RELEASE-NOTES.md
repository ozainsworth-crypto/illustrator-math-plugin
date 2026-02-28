# GitHub Release Notes - v1.0.0-beta

**用于创建 GitHub Release 的发布说明**

---

## Release Title
Math Formula Plugin v1.0.0-beta - Phase 5 Test Release

## Tag
v1.0.0-beta

## Release Description

### 🎉 Math Formula Plugin for Adobe Illustrator - Beta Release

A powerful CEP extension that brings mathematical formula support to Adobe Illustrator with LaTeX input, PowerPoint integration, and custom font support.

---

### ✨ Key Features

- **LaTeX Input**: Direct LaTeX formula input with live preview
- **PowerPoint Integration**: Paste formulas directly from Microsoft PowerPoint  
- **Custom Font Support**: Use your own OpenType Math fonts with automatic glyph replacement
- **Ambiguity Resolution**: Intelligent handling of mathematical notation ambiguities (fractions, exponents)
- **Format Detection**: Automatic detection of LaTeX, UnicodeMath, and PowerPoint formats
- **Offline Operation**: Works completely offline after initial setup

---

### 📦 Installation

#### Quick Install (Recommended)
1. Download `MathFormulaPlugin-v1.0.0-beta.zxp` below
2. Install using [Anastasiy's Extension Manager](https://install.anastasiy.com/) or [ZXPInstaller](https://aescripts.com/learn/zxp-installer/)
3. Restart Adobe Illustrator
4. Access via **Window > Extensions > Math Formula Plugin**

#### Detailed Instructions
See `INSTALLATION.txt` (included in release assets) for complete installation instructions including manual installation and troubleshooting.

---

### 🔧 System Requirements

- **Adobe Illustrator**: 2023 or later (v27.x - v30.x)
- **Operating System**: macOS 12+ or Windows 10/11
- **CEP Version**: 9.0 or later

---

### 📖 Documentation

Complete documentation is available in the repository:
- [Installation Guide](https://github.com/ozainsworth-crypto/illustrator-math-plugin/blob/main/docs/phase5-installation-guide.md)
- [Usage Guide](https://github.com/ozainsworth-crypto/illustrator-math-plugin/blob/main/docs/phase5-usage-guide.md)
- [Known Limitations](https://github.com/ozainsworth-crypto/illustrator-math-plugin/blob/main/docs/phase5-known-limitations.md)
- [Feedback Guide](https://github.com/ozainsworth-crypto/illustrator-math-plugin/blob/main/docs/phase5-feedback-guide.md)

---

### ⚠️ Known Limitations (Beta)

This is a beta test release. Known limitations include:

1. **Font Support**: Only OpenType fonts with MATH table are supported
2. **LaTeX Subset**: Supports common mathematical symbols (not all LaTeX macros)
3. **Performance**: First-time MathJax loading takes 2-3 seconds
4. **CEP Shell**: External script execution disabled (will be fixed in Phase 6)
5. **Keyboard Shortcuts**: Not yet implemented (planned for Phase 6)

See [Known Limitations](https://github.com/ozainsworth-crypto/illustrator-math-plugin/blob/main/docs/phase5-known-limitations.md) for complete details.

---

### 🐛 Reporting Issues

Please report bugs and feedback via:
- **GitHub Issues**: [Create an issue](https://github.com/ozainsworth-crypto/illustrator-math-plugin/issues)
- **Feedback Guide**: See [docs/phase5-feedback-guide.md](https://github.com/ozainsworth-crypto/illustrator-math-plugin/blob/main/docs/phase5-feedback-guide.md)

When reporting issues, please include:
- Adobe Illustrator version
- Operating system version
- Steps to reproduce
- Error messages (if any)

---

### 🚀 What's Next (Phase 6)

Planned improvements for the next release:
- Stability enhancements
- Performance optimizations
- CEP Shell execution fix
- Keyboard shortcuts implementation
- Expanded documentation

---

### 📊 Testing Status

**Phase 5 Acceptance**: ✅ All criteria met
- ✅ Installable ZXP package (signed and verified)
- ✅ Minimal documentation complete
- ✅ Core functionality working
- ✅ Regression tests passed

---

### 🙏 Acknowledgments

- [MathJax](https://www.mathjax.org/) for mathematical rendering
- [Plurimath](https://github.com/plurimath/plurimath) for format conversion
- Adobe CEP for the extension framework

---

### 📝 Release Assets

This release includes:
- `MathFormulaPlugin-v1.0.0-beta.zxp` - Installable CEP extension (6.2 MB)
- `font-pack-builder-v1.0.0-beta.zip` - Standalone font pack builder tools (1.0 MB)
- `INSTALLATION.txt` - Complete installation instructions
- Source code (zip/tar.gz) - Full source code for this release

#### What's in Each Package?

**MathFormulaPlugin-v1.0.0-beta.zxp**:
- CEP extension for Adobe Illustrator
- Pre-built default font pack
- Ready to install and use

**font-pack-builder-v1.0.0-beta.zip**:
- Standalone font conversion tools
- Web UI for easy font pack creation
- Command-line tools for automation
- Complete documentation
- Use this to create custom font packs from your own OpenType Math fonts

---

**Built with ❤️ for the mathematical typography community**

