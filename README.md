# Math Formula Plugin for Adobe Illustrator

A powerful CEP extension that enables seamless insertion of mathematical formulas into Adobe Illustrator documents.

## ✨ Features

- **LaTeX Input**: Direct LaTeX formula input with live preview
- **PowerPoint Integration**: Paste formulas directly from Microsoft PowerPoint
- **Custom Font Support**: Use your own OpenType Math fonts with automatic glyph replacement
- **Ambiguity Resolution**: Intelligent handling of mathematical notation ambiguities
- **Format Detection**: Automatic detection of LaTeX, UnicodeMath, and PowerPoint formats
- **Offline Operation**: Works completely offline after initial setup

## 📦 Installation

### Download

Download the latest release from the [Releases](https://github.com/ozainsworth-crypto/illustrator-math-plugin/releases) page:
- `MathFormulaPlugin-v1.0.0-beta.zxp` (6.2 MB)

### Installation Methods

#### Method 1: Anastasiy's Extension Manager (Recommended)
1. Download [Anastasiy's Extension Manager](https://install.anastasiy.com/)
2. Drag and drop the `.zxp` file into the Extension Manager
3. Restart Adobe Illustrator

#### Method 2: ZXPInstaller
1. Download [ZXPInstaller](https://aescripts.com/learn/zxp-installer/)
2. Drag and drop the `.zxp` file into ZXPInstaller
3. Restart Adobe Illustrator

#### Method 3: Manual Installation
See [Installation Guide](docs/phase5-installation-guide.md) for detailed instructions.

## 🚀 Quick Start

1. Open Adobe Illustrator
2. Go to **Window > Extensions > Math Formula Plugin**
3. Enter a LaTeX formula (e.g., `\frac{a}{b}`)
4. Click **Insert to Illustrator**

## 📖 Documentation

- [Installation Guide](docs/phase5-installation-guide.md)
- [Usage Guide](docs/phase5-usage-guide.md)
- [Known Limitations](docs/phase5-known-limitations.md)
- [Feedback Guide](docs/phase5-feedback-guide.md)

## 🔧 System Requirements

- **Adobe Illustrator**: 2023 or later (v27.x - v30.x)
- **Operating System**: macOS 12+ or Windows 10/11
- **CEP Version**: 9.0 or later

## 🎯 Current Status

**Version**: 1.0.0-beta (Phase 5 Test Release)

This is a beta test release focused on core functionality:
- ✅ Installable CEP extension
- ✅ LaTeX and PowerPoint formula support
- ✅ Custom font integration
- ✅ Offline operation

## 🐛 Known Limitations

- Font support limited to OpenType fonts with MATH table
- LaTeX subset (common mathematical symbols only)
- First-time MathJax loading takes 2-3 seconds
- External script execution disabled (Phase 6 fix)
- Keyboard shortcuts not implemented (Phase 6 feature)

See [Known Limitations](docs/phase5-known-limitations.md) for details.

## 🛠️ Development

### Project Structure

```
math-formula-plugin/
├── src/                    # TypeScript source code
├── extension/              # CEP extension files
│   ├── client/            # Frontend (HTML/CSS/JS)
│   ├── host/              # ExtendScript (Illustrator bridge)
│   └── CSXS/              # CEP manifest
├── tools/                  # Font pack builder tools
├── tests/                  # Unit, integration, and property tests
├── docs/                   # Documentation
└── scripts/                # Build and packaging scripts
```

### Build from Source

```bash
# Install dependencies
npm install

# Build for development
npm run build

# Build CEP extension (production)
bash scripts/build-cep-prod.sh

# Package as .zxp
bash scripts/package-zxp.sh
```

### Testing

```bash
# Run all tests
npm test

# Run specific test suites
npm run test:unit
npm run test:integration
npm run test:properties
```

## 📝 License

[Add your license here]

## 🤝 Contributing

Contributions are welcome! Please see [Feedback Guide](docs/phase5-feedback-guide.md) for how to report issues and suggest improvements.

## 📧 Contact

For questions, issues, or feedback:
- GitHub Issues: [Report an issue](https://github.com/ozainsworth-crypto/illustrator-math-plugin/issues)
- Email: [Your contact email]

## 🙏 Acknowledgments

- [MathJax](https://www.mathjax.org/) for mathematical rendering
- [Plurimath](https://github.com/plurimath/plurimath) for format conversion
- Adobe CEP for the extension framework

---

**Phase 5 Release** | Built with ❤️ for the mathematical typography community
