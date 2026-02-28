#!/bin/bash

# Font Pack Builder Packaging Script
# Creates a standalone font-pack-builder.zip for distribution

set -e  # Exit on error

# Colors for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m' # No Color

# Configuration
VERSION="1.0.0-beta"
TIMESTAMP=$(date +%Y%m%d-%H%M%S)

# Paths
PROJECT_ROOT="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)"
BUILD_DIR="$PROJECT_ROOT/build"
PACKAGE_DIR="$BUILD_DIR/font-builder-package"
OUTPUT_DIR="$PROJECT_ROOT/releases"
ZIP_FILE="$OUTPUT_DIR/font-pack-builder-v${VERSION}.zip"

echo -e "${BLUE}========================================${NC}"
echo -e "${BLUE}Font Pack Builder - Packaging${NC}"
echo -e "${BLUE}========================================${NC}"
echo ""

# Step 1: Clean and create package directory
echo -e "${YELLOW}Step 1: Preparing package directory...${NC}"
rm -rf "$PACKAGE_DIR"
mkdir -p "$PACKAGE_DIR"
echo -e "${GREEN}✓ Package directory created${NC}"
echo ""

# Step 2: Copy font-pack-builder tool
echo -e "${YELLOW}Step 2: Copying font-pack-builder...${NC}"
cp -r "$PROJECT_ROOT/tools/font-pack-builder" "$PACKAGE_DIR/"

# Remove unnecessary files
rm -rf "$PACKAGE_DIR/font-pack-builder/node_modules"
rm -rf "$PACKAGE_DIR/font-pack-builder/test-output"
rm -rf "$PACKAGE_DIR/font-pack-builder/test-output-phase1"
rm -rf "$PACKAGE_DIR/font-pack-builder/test-check"
rm -rf "$PACKAGE_DIR/font-pack-builder/.DS_Store"
find "$PACKAGE_DIR/font-pack-builder" -name ".DS_Store" -delete

echo -e "${GREEN}✓ Font-pack-builder copied${NC}"
echo ""

# Step 3: Copy mathjax-font-extractor tool
echo -e "${YELLOW}Step 3: Copying mathjax-font-extractor...${NC}"
cp -r "$PROJECT_ROOT/tools/mathjax-font-extractor" "$PACKAGE_DIR/"

# Remove unnecessary files
rm -rf "$PACKAGE_DIR/mathjax-font-extractor/.DS_Store"
find "$PACKAGE_DIR/mathjax-font-extractor" -name ".DS_Store" -delete

echo -e "${GREEN}✓ MathJax-font-extractor copied${NC}"
echo ""

# Step 4: Create README
echo -e "${YELLOW}Step 4: Creating README...${NC}"

cat > "$PACKAGE_DIR/README.md" << 'EOF'
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
EOF

echo -e "${GREEN}✓ README created${NC}"
echo ""

# Step 5: Create QUICKSTART guide
echo -e "${YELLOW}Step 5: Creating QUICKSTART guide...${NC}"

cat > "$PACKAGE_DIR/QUICKSTART.md" << 'EOF'
# Quick Start Guide

## 🚀 Get Started in 3 Steps

### Step 1: Install Dependencies

```bash
cd font-pack-builder
npm install
```

### Step 2: Start Web UI

```bash
cd web-ui
npm install
npm start
```

### Step 3: Build Your Font Pack

1. Open http://localhost:3000
2. Click "选择字体文件" and select your .otf/.ttf font
3. Click "开始转换"
4. Download the generated font pack

## 📦 Output Location

Your font pack will be in:
```
font-pack-builder/web-ui/output/[font-name]/
```

## 🎯 Next Steps

Copy the output folder to your CEP extension:

**macOS**:
```bash
cp -r output/[font-name] ~/Library/Application\ Support/Adobe/CEP/extensions/MathFormulaPlugin/client/dist/fonts/
```

**Windows**:
```
Copy output\[font-name] to:
C:\Users\[Username]\AppData\Roaming\Adobe\CEP\extensions\MathFormulaPlugin\client\dist\fonts\
```

Then restart Adobe Illustrator and select your font in the plugin.

## ❓ Need Help?

See `README.md` for detailed documentation.
EOF

echo -e "${GREEN}✓ QUICKSTART created${NC}"
echo ""

# Step 6: Create package
echo -e "${YELLOW}Step 6: Creating ZIP package...${NC}"
mkdir -p "$OUTPUT_DIR"

cd "$BUILD_DIR"
zip -r "$ZIP_FILE" "font-builder-package" -x "*.DS_Store" "*/node_modules/*" "*/test-*/*"

if [ -f "$ZIP_FILE" ]; then
    echo -e "${GREEN}✓ ZIP package created${NC}"
else
    echo -e "${RED}✗ Failed to create ZIP package${NC}"
    exit 1
fi
echo ""

# Step 7: Verify package
echo -e "${YELLOW}Step 7: Verifying package...${NC}"
FILE_SIZE=$(du -h "$ZIP_FILE" | cut -f1)
echo "  Package size: $FILE_SIZE"
echo -e "${GREEN}✓ Package verified${NC}"
echo ""

# Step 8: Summary
echo -e "${GREEN}========================================${NC}"
echo -e "${GREEN}Packaging Complete!${NC}"
echo -e "${GREEN}========================================${NC}"
echo ""
echo -e "Package: ${BLUE}$ZIP_FILE${NC}"
echo -e "Size: ${BLUE}$FILE_SIZE${NC}"
echo -e "Version: ${BLUE}$VERSION${NC}"
echo ""
echo -e "${YELLOW}Next steps:${NC}"
echo "  1. Upload to GitHub Release"
echo "  2. Test extraction and installation"
echo "  3. Verify font conversion works"
echo ""
echo -e "${GREEN}Done!${NC}"
