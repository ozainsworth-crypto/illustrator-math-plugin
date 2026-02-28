# Font Pack Builder Tools - v1.0.0-beta

Standalone tools for building custom font packs for the Math Formula Plugin.

## 📦 What's Included

This package contains two tools:

1. **font-pack-builder**: Convert OpenType Math fonts to MathJax-compatible font packs
2. **mathjax-font-extractor**: Extract Unicode ranges from MathJax fonts (optional)

## 🚀 Quick Start

### Prerequisites

- **Node.js**: v16 or later
- **Python 3**: For font subsetting (optional)
- **fonttools**: Python package for font manipulation

### Installation

```bash
# Install Node.js dependencies for font-pack-builder
cd font-pack-builder
npm install

# (Optional) Install Python dependencies for mathjax-font-extractor
cd ../mathjax-font-extractor
pip3 install fonttools
```

### Basic Usage

#### Method 1: Web UI (Recommended)

```bash
cd font-pack-builder/web-ui
npm install
npm start
```

Then open http://localhost:3000 in your browser.

#### Method 2: Command Line

```bash
cd font-pack-builder

# macOS/Linux
./convert-font.sh /path/to/your-font.otf

# Windows
convert-font.bat C:\path\to\your-font.otf
```

#### Method 3: Double-click Scripts

- **macOS**: Double-click `转换字体.command`
- **Windows**: Double-click `convert-font.bat`

## 📖 Documentation

### Font Pack Builder

See `font-pack-builder/README.md` for detailed documentation including:
- Supported font formats
- Configuration options
- Output file structure
- Troubleshooting guide

### Web UI

See `font-pack-builder/web-ui/README.md` for:
- Web UI features
- Advanced configuration
- Cache management

### MathJax Font Extractor

See `mathjax-font-extractor/README.md` for:
- Extracting Unicode ranges from MathJax fonts
- Creating font subsets
- Verification tools

## 🎯 Output

The font-pack-builder generates a font pack directory containing:

```
output-folder/
├── fontdata.js          # MathJax font metrics
├── manifest.json        # Font metadata
├── capabilities.json    # Font capabilities
├── report.json          # Build report
└── replacement-report.json  # Glyph replacement info
```

## 📋 System Requirements

- **Operating System**: macOS, Windows, or Linux
- **Node.js**: v16 or later
- **RAM**: 2GB minimum
- **Disk Space**: 500MB for tools + font files

## 🔧 Font Requirements

Your font must:
- Be in OpenType format (.otf or .ttf)
- Contain a MATH table (OpenType Math features)
- Include mathematical glyphs

Recommended fonts:
- Latin Modern Math
- STIX Two Math
- Cambria Math
- Asana Math

## 🐛 Troubleshooting

### "MATH table not found"
Your font doesn't have OpenType Math features. Use a math-specific font.

### "Missing glyphs"
Some mathematical symbols are not in your font. Check the replacement report.

### Web UI won't start
```bash
cd font-pack-builder/web-ui
rm -rf node_modules
npm install
npm start
```

## 📝 Integration with CEP Extension

After building a font pack:

1. Copy the output folder to your CEP extension:
   ```
   ~/Library/Application Support/Adobe/CEP/extensions/MathFormulaPlugin/client/dist/fonts/your-font-pack/
   ```

2. Restart Adobe Illustrator

3. Select your font in the Math Formula Plugin

## 🔗 Links

- **Main Plugin**: https://github.com/ozainsworth-crypto/illustrator-math-plugin
- **Documentation**: See `font-pack-builder/README.md`
- **Issues**: https://github.com/ozainsworth-crypto/illustrator-math-plugin/issues

## 📄 License

[Add your license here]

---

**Version**: 1.0.0-beta  
**Last Updated**: February 2026
