#!/bin/bash

# CEP Extension Packaging Script
# Creates a .zxp installation package for the Math Formula Plugin

set -e  # Exit on error

# Colors for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m' # No Color

# Configuration
EXTENSION_ID="com.mathformula.plugin"
EXTENSION_NAME="MathFormulaPlugin"
VERSION="1.0.0-beta"
TIMESTAMP=$(date +%Y%m%d-%H%M%S)

# Paths
PROJECT_ROOT="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)"
EXTENSION_DIR="$PROJECT_ROOT/extension"
BUILD_DIR="$PROJECT_ROOT/build"
PACKAGE_DIR="$BUILD_DIR/package"
OUTPUT_DIR="$PROJECT_ROOT/releases"
ZXP_FILE="$OUTPUT_DIR/${EXTENSION_NAME}-v${VERSION}.zxp"

echo -e "${BLUE}========================================${NC}"
echo -e "${BLUE}Math Formula Plugin - ZXP Packaging${NC}"
echo -e "${BLUE}========================================${NC}"
echo ""

# Step 1: Check prerequisites
echo -e "${YELLOW}Step 1: Checking prerequisites...${NC}"

# Check if ZXPSignCmd is installed
if ! command -v ZXPSignCmd &> /dev/null; then
    echo -e "${RED}ERROR: ZXPSignCmd not found!${NC}"
    echo ""
    echo "ZXPSignCmd is required to sign and package CEP extensions."
    echo ""
    echo "Installation options:"
    echo "  1. Download from Adobe: https://github.com/Adobe-CEP/CEP-Resources/tree/master/ZXPSignCMD"
    echo "  2. macOS (Homebrew): brew install zxpsigncmd"
    echo "  3. Manual installation: Place ZXPSignCmd in your PATH"
    echo ""
    echo "After installation, run this script again."
    exit 1
fi

echo -e "${GREEN}✓ ZXPSignCmd found${NC}"

# Use Rosetta for x86_64 binary on ARM Macs
ZXPSIGN_CMD="arch -x86_64 ZXPSignCmd"

# Check if extension directory exists
if [ ! -d "$EXTENSION_DIR" ]; then
    echo -e "${RED}ERROR: Extension directory not found: $EXTENSION_DIR${NC}"
    exit 1
fi

echo -e "${GREEN}✓ Extension directory found${NC}"

# Step 2: Build production version
echo ""
echo -e "${YELLOW}Step 2: Building production version...${NC}"

cd "$PROJECT_ROOT"

# Run production build
if [ -f "$PROJECT_ROOT/scripts/build-cep-prod.sh" ]; then
    bash "$PROJECT_ROOT/scripts/build-cep-prod.sh"
    echo -e "${GREEN}✓ Production build completed${NC}"
else
    echo -e "${RED}ERROR: build-cep-prod.sh not found${NC}"
    exit 1
fi

# Step 3: Prepare package directory
echo ""
echo -e "${YELLOW}Step 3: Preparing package directory...${NC}"

# Clean and create package directory
rm -rf "$PACKAGE_DIR"
mkdir -p "$PACKAGE_DIR"

echo -e "${GREEN}✓ Package directory created${NC}"

# Step 4: Copy extension files
echo ""
echo -e "${YELLOW}Step 4: Copying extension files...${NC}"

# Copy CSXS directory
cp -r "$EXTENSION_DIR/CSXS" "$PACKAGE_DIR/"
echo "  ✓ Copied CSXS/"

# Copy client directory
cp -r "$EXTENSION_DIR/client" "$PACKAGE_DIR/"
echo "  ✓ Copied client/"

# Copy host directory
cp -r "$EXTENSION_DIR/host" "$PACKAGE_DIR/"
echo "  ✓ Copied host/"

# Copy .debug file (for development/debugging)
cp "$EXTENSION_DIR/.debug" "$PACKAGE_DIR/"
echo "  ✓ Copied .debug"

echo -e "${GREEN}✓ Extension files copied${NC}"

# Step 5: Clean up development files
echo ""
echo -e "${YELLOW}Step 5: Cleaning up development files...${NC}"

# Remove development files from package
find "$PACKAGE_DIR" -name ".DS_Store" -delete
find "$PACKAGE_DIR" -name "*.map" -delete
find "$PACKAGE_DIR" -name "node_modules" -type d -exec rm -rf {} + 2>/dev/null || true
find "$PACKAGE_DIR" -name ".git" -type d -exec rm -rf {} + 2>/dev/null || true

echo -e "${GREEN}✓ Development files cleaned${NC}"

# Step 6: Create or use self-signed certificate
echo ""
echo -e "${YELLOW}Step 6: Checking certificate...${NC}"

CERT_DIR="$PROJECT_ROOT/certificates"
CERT_FILE="$CERT_DIR/certificate.p12"
CERT_PASSWORD="mathformula"

if [ ! -f "$CERT_FILE" ]; then
    echo "Certificate not found. Creating self-signed certificate..."
    mkdir -p "$CERT_DIR"
    
    # Create self-signed certificate
    $ZXPSIGN_CMD -selfSignedCert \
        "CN" \
        "Province" \
        "Organization" \
        "MathFormulaPlugin" \
        "$CERT_PASSWORD" \
        "$CERT_FILE"
    
    echo -e "${GREEN}✓ Self-signed certificate created${NC}"
    echo -e "${YELLOW}  Certificate: $CERT_FILE${NC}"
    echo -e "${YELLOW}  Password: $CERT_PASSWORD${NC}"
else
    echo -e "${GREEN}✓ Using existing certificate${NC}"
fi

# Step 7: Sign and package
echo ""
echo -e "${YELLOW}Step 7: Signing and packaging...${NC}"

# Create output directory
mkdir -p "$OUTPUT_DIR"

# Sign and create .zxp
$ZXPSIGN_CMD -sign \
    "$PACKAGE_DIR" \
    "$ZXP_FILE" \
    "$CERT_FILE" \
    "$CERT_PASSWORD" \
    -tsa http://timestamp.digicert.com

if [ -f "$ZXP_FILE" ]; then
    echo -e "${GREEN}✓ ZXP package created successfully${NC}"
else
    echo -e "${RED}ERROR: Failed to create ZXP package${NC}"
    exit 1
fi

# Step 8: Verify package
echo ""
echo -e "${YELLOW}Step 8: Verifying package...${NC}"

# Check file size
FILE_SIZE=$(du -h "$ZXP_FILE" | cut -f1)
echo "  Package size: $FILE_SIZE"

# Verify signature
$ZXPSIGN_CMD -verify "$ZXP_FILE"
echo -e "${GREEN}✓ Package signature verified${NC}"

# Step 9: Create installation instructions
echo ""
echo -e "${YELLOW}Step 9: Creating installation instructions...${NC}"

INSTALL_INSTRUCTIONS="$OUTPUT_DIR/INSTALLATION.txt"

cat > "$INSTALL_INSTRUCTIONS" << EOF
Math Formula Plugin - Installation Instructions
================================================

Version: $VERSION
Package: ${EXTENSION_NAME}-v${VERSION}.zxp
Created: $(date)

INSTALLATION METHODS
--------------------

Method 1: Using Anastasiy's Extension Manager (Recommended)
1. Download Anastasiy's Extension Manager from:
   https://install.anastasiy.com/
2. Launch the Extension Manager
3. Drag and drop the .zxp file into the Extension Manager window
4. Follow the on-screen instructions
5. Restart Adobe Illustrator

Method 2: Using ZXPInstaller
1. Download ZXPInstaller from:
   https://aescripts.com/learn/zxp-installer/
2. Launch ZXPInstaller
3. Drag and drop the .zxp file into ZXPInstaller
4. Follow the on-screen instructions
5. Restart Adobe Illustrator

Method 3: Manual Installation (Advanced)
1. Extract the .zxp file (it's a ZIP archive)
2. Copy the extracted folder to:
   - macOS: ~/Library/Application Support/Adobe/CEP/extensions/
   - Windows: C:\\Users\\[Username]\\AppData\\Roaming\\Adobe\\CEP\\extensions\\
3. Enable PlayerDebugMode (see below)
4. Restart Adobe Illustrator

ENABLING PLAYERDEBUGMODE (Required for unsigned extensions)
------------------------------------------------------------

macOS:
defaults write com.adobe.CSXS.11 PlayerDebugMode 1

Windows:
1. Open Registry Editor (regedit)
2. Navigate to: HKEY_CURRENT_USER\\Software\\Adobe\\CSXS.11
3. Create a new String value named "PlayerDebugMode" with value "1"

Note: Replace "11" with your CEP version (6-12 depending on Illustrator version)

USAGE
-----

1. Open Adobe Illustrator
2. Go to Window > Extensions > Math Formula Plugin
3. The plugin panel will open
4. Enter LaTeX formulas or paste from PowerPoint
5. Click "Insert to Illustrator" to add formulas to your document

SYSTEM REQUIREMENTS
-------------------

- Adobe Illustrator 2023 or later (v27.x - v30.x)
- macOS 12+ or Windows 10/11
- CEP 9.0 or later

TROUBLESHOOTING
---------------

If the extension doesn't appear in the menu:
1. Verify PlayerDebugMode is enabled
2. Check the installation path
3. Restart Illustrator completely
4. Check the CEP logs:
   - macOS: ~/Library/Logs/CSXS/
   - Windows: C:\\Users\\[Username]\\AppData\\Local\\Temp\\

For more help, see the documentation in the docs/ folder.

FEEDBACK
--------

Please report any issues or feedback to:
[Your contact information or GitHub Issues link]

EOF

echo -e "${GREEN}✓ Installation instructions created${NC}"

# Step 10: Summary
echo ""
echo -e "${GREEN}========================================${NC}"
echo -e "${GREEN}Packaging Complete!${NC}"
echo -e "${GREEN}========================================${NC}"
echo ""
echo -e "Package: ${BLUE}$ZXP_FILE${NC}"
echo -e "Size: ${BLUE}$FILE_SIZE${NC}"
echo -e "Version: ${BLUE}$VERSION${NC}"
echo ""
echo -e "Installation instructions: ${BLUE}$INSTALL_INSTRUCTIONS${NC}"
echo ""
echo -e "${YELLOW}Next steps:${NC}"
echo "  1. Test the .zxp installation on a clean system"
echo "  2. Verify all functionality works after installation"
echo "  3. Distribute the .zxp file to testers/users"
echo ""
echo -e "${GREEN}Done!${NC}"
