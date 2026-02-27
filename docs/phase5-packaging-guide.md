# Phase 5 Packaging Guide

**Document Version**: 1.0  
**Date**: 2026-02-26  
**Phase**: Phase 5 - Packaging and Test Version Release  
**Task**: Task 23.1 - Prepare CEP Installation Package (.zxp)

---

## Overview

This document provides comprehensive guidance for packaging the Math Formula Plugin as a .zxp installation package for Adobe Illustrator CEP extensions.

## Prerequisites

### Required Tools

1. **ZXPSignCmd** - Adobe's official signing tool for CEP extensions
   - **Download**: https://github.com/Adobe-CEP/CEP-Resources/tree/master/ZXPSignCMD
   - **macOS Installation**: `brew install zxpsigncmd` (if using Homebrew)
   - **Manual Installation**: Download and place in your PATH

2. **Node.js** - For building the production version
   - Version: 18.x or later
   - Already installed (verified in Phase 4)

3. **Bash** - For running the packaging script
   - macOS: Built-in
   - Windows: Git Bash or WSL

### Verification

Run the following commands to verify prerequisites:

```bash
# Check ZXPSignCmd
ZXPSignCmd -help

# Check Node.js
node -v

# Check npm
npm -v
```

---

## Packaging Process

### Step 1: Install ZXPSignCmd (if not installed)

#### macOS (Homebrew)

```bash
brew install zxpsigncmd
```

#### macOS/Linux (Manual)

1. Download ZXPSignCmd from Adobe's GitHub repository
2. Extract the archive
3. Move the binary to `/usr/local/bin/`:
   ```bash
   sudo mv ZXPSignCmd /usr/local/bin/
   sudo chmod +x /usr/local/bin/ZXPSignCmd
   ```

#### Windows

1. Download ZXPSignCmd from Adobe's GitHub repository
2. Extract the archive
3. Add the directory to your PATH environment variable

### Step 2: Run the Packaging Script

```bash
cd math-formula-plugin
bash scripts/package-zxp.sh
```

The script will:
1. Check prerequisites (ZXPSignCmd, extension directory)
2. Build the production version (`scripts/build-cep-prod.sh`)
3. Prepare the package directory
4. Copy extension files (CSXS, client, host)
5. Clean up development files (.DS_Store, .map files, node_modules)
6. Create or use a self-signed certificate
7. Sign and package the .zxp file
8. Verify the package signature
9. Create installation instructions

### Step 3: Verify the Package

After packaging, verify the output:

```bash
# Check the releases directory
ls -lh releases/

# Expected output:
# MathFormulaPlugin-v1.0.0-beta.zxp
# INSTALLATION.txt
```

### Step 4: Test Installation

Test the .zxp package on a clean system:

1. **Using Anastasiy's Extension Manager** (Recommended):
   - Download from: https://install.anastasiy.com/
   - Drag and drop the .zxp file
   - Follow on-screen instructions
   - Restart Illustrator

2. **Using ZXPInstaller**:
   - Download from: https://aescripts.com/learn/zxp-installer/
   - Drag and drop the .zxp file
   - Follow on-screen instructions
   - Restart Illustrator

3. **Manual Installation** (for testing):
   - Extract the .zxp file (it's a ZIP archive)
   - Copy to CEP extensions directory:
     - macOS: `~/Library/Application Support/Adobe/CEP/extensions/`
     - Windows: `C:\Users\[Username]\AppData\Roaming\Adobe\CEP\extensions\`
   - Enable PlayerDebugMode
   - Restart Illustrator

---

## Package Structure

The .zxp package contains the following structure:

```
MathFormulaPlugin/
├── CSXS/
│   └── manifest.xml          # Extension manifest
├── client/
│   ├── dist/                 # Production build
│   │   ├── assets/           # JS, CSS, fonts
│   │   └── index.html        # Main HTML
│   ├── fonts/                # Font packs
│   │   └── user-font-pack/   # User custom fonts
│   ├── lib/                  # Libraries (MathJax, CSInterface)
│   ├── config.js             # Configuration
│   └── index.html            # Entry point
├── host/
│   └── illustrator.jsx       # ExtendScript bridge
└── .debug                    # Debug configuration
```

---

## Certificate Management

### Self-Signed Certificate

The packaging script automatically creates a self-signed certificate if one doesn't exist:

- **Location**: `certificates/certificate.p12`
- **Password**: `mathformula`
- **Country**: CN
- **Province**: Province
- **Organization**: Organization
- **Common Name**: MathFormulaPlugin

### Using a Custom Certificate

To use a custom certificate (e.g., from Adobe or a CA):

1. Place your certificate in `certificates/certificate.p12`
2. Update the password in `scripts/package-zxp.sh`:
   ```bash
   CERT_PASSWORD="your_password_here"
   ```
3. Run the packaging script

### Certificate Security

**Important**: The self-signed certificate is for **development and testing only**. For production releases:

1. Obtain a certificate from Adobe or a trusted CA
2. Store the certificate securely (not in version control)
3. Use environment variables for the password:
   ```bash
   export ZXP_CERT_PASSWORD="your_secure_password"
   ```

---

## Version Management

### Current Version

- **Version**: 1.0.0-beta
- **Type**: Test/Beta Release
- **Target**: Internal testing and client feedback

### Version Numbering

The project follows Semantic Versioning (SemVer):

- **Major.Minor.Patch-PreRelease**
- Example: `1.0.0-beta`, `1.0.0-rc.1`, `1.0.0`

### Updating the Version

To update the version for a new release:

1. Update `scripts/package-zxp.sh`:
   ```bash
   VERSION="1.0.0-rc.1"  # or "1.0.0" for stable
   ```

2. Update `extension/CSXS/manifest.xml`:
   ```xml
   <Extension Id="com.mathformula.plugin" Version="1.0.0" />
   ```

3. Update `CHANGELOG.md`:
   ```markdown
   ## [1.0.0-rc.1] - 2026-02-26
   ```

4. Run the packaging script

---

## Troubleshooting

### ZXPSignCmd Not Found

**Error**: `ZXPSignCmd: command not found`

**Solution**:
1. Install ZXPSignCmd (see Step 1 above)
2. Verify installation: `ZXPSignCmd -help`
3. Check PATH: `echo $PATH`

### Certificate Creation Failed

**Error**: `Failed to create self-signed certificate`

**Solution**:
1. Check ZXPSignCmd version: `ZXPSignCmd -help`
2. Verify write permissions: `ls -la certificates/`
3. Try manual certificate creation:
   ```bash
   mkdir -p certificates
   ZXPSignCmd -selfSignedCert CN Province Organization MathFormulaPlugin mathformula certificates/certificate.p12
   ```

### Package Signature Verification Failed

**Error**: `Package signature verification failed`

**Solution**:
1. Check certificate validity: `openssl pkcs12 -info -in certificates/certificate.p12`
2. Verify timestamp server: `curl -I http://timestamp.digicert.com`
3. Try re-signing with a different timestamp server:
   ```bash
   ZXPSignCmd -sign build/package releases/MathFormulaPlugin-v1.0.0-beta.zxp certificates/certificate.p12 mathformula -tsa http://timestamp.comodoca.com
   ```

### Build Failed

**Error**: `Production build failed`

**Solution**:
1. Check Node.js version: `node -v` (should be 18.x or later)
2. Verify dependencies: `npm install`
3. Run build manually: `bash scripts/build-cep-prod.sh`
4. Check build logs for errors

### Extension Not Appearing in Illustrator

**Error**: Extension doesn't appear in Window > Extensions menu

**Solution**:
1. Verify installation path:
   - macOS: `ls ~/Library/Application\ Support/Adobe/CEP/extensions/`
   - Windows: `dir C:\Users\[Username]\AppData\Roaming\Adobe\CEP\extensions\`

2. Enable PlayerDebugMode:
   - macOS: `defaults write com.adobe.CSXS.11 PlayerDebugMode 1`
   - Windows: Registry Editor > HKEY_CURRENT_USER\Software\Adobe\CSXS.11 > PlayerDebugMode = "1"

3. Check CEP logs:
   - macOS: `~/Library/Logs/CSXS/`
   - Windows: `C:\Users\[Username]\AppData\Local\Temp\`

4. Restart Illustrator completely (not just close the panel)

---

## Distribution

### Test Version Distribution

For the test version (v1.0.0-beta):

1. **Internal Testing**:
   - Share the .zxp file with internal testers
   - Provide installation instructions (INSTALLATION.txt)
   - Collect feedback using the feedback guide

2. **Client Testing**:
   - Share the .zxp file with the client
   - Provide comprehensive documentation:
     - Installation guide
     - Usage guide
     - Known limitations
     - Feedback guide
   - Schedule a demo/walkthrough session

3. **Feedback Collection**:
   - Use the feedback guide (docs/phase5-feedback-guide.md)
   - Track issues in a spreadsheet or issue tracker
   - Prioritize issues (P0/P1/P2/P3)

### Stable Version Distribution

For the stable version (v1.0.0):

1. **Adobe Exchange** (Optional):
   - Submit to Adobe Exchange marketplace
   - Follow Adobe's submission guidelines
   - Provide marketing materials (screenshots, description)

2. **Direct Distribution**:
   - Host the .zxp file on your website
   - Provide download link and installation instructions
   - Set up analytics to track downloads

3. **GitHub Releases** (Optional):
   - Create a GitHub release
   - Attach the .zxp file
   - Include release notes and changelog

---

## Automation

### CI/CD Integration

For automated packaging in CI/CD pipelines:

1. **GitHub Actions Example**:
   ```yaml
   name: Package ZXP
   on:
     push:
       tags:
         - 'v*'
   jobs:
     package:
       runs-on: macos-latest
       steps:
         - uses: actions/checkout@v2
         - name: Install ZXPSignCmd
           run: brew install zxpsigncmd
         - name: Package ZXP
           run: bash scripts/package-zxp.sh
         - name: Upload Release
           uses: actions/upload-artifact@v2
           with:
             name: zxp-package
             path: releases/*.zxp
   ```

2. **Environment Variables**:
   ```bash
   export ZXP_CERT_PASSWORD="${{ secrets.ZXP_CERT_PASSWORD }}"
   export ZXP_VERSION="${{ github.ref_name }}"
   ```

---

## Checklist

### Pre-Packaging Checklist

- [ ] All Phase 5 tasks completed
- [ ] Production build successful
- [ ] All tests passing (lint, typecheck, unit, integration)
- [ ] Documentation updated (CHANGELOG.md, README.md)
- [ ] Version number updated (manifest.xml, package-zxp.sh)
- [ ] ZXPSignCmd installed and verified

### Packaging Checklist

- [ ] Run packaging script: `bash scripts/package-zxp.sh`
- [ ] Verify .zxp file created: `ls -lh releases/`
- [ ] Verify package signature: `ZXPSignCmd -verify releases/*.zxp`
- [ ] Check package size (should be < 50MB)
- [ ] Review installation instructions: `cat releases/INSTALLATION.txt`

### Post-Packaging Checklist

- [ ] Test installation on clean system (macOS)
- [ ] Test installation on clean system (Windows)
- [ ] Verify extension appears in Illustrator menu
- [ ] Test all core functionality (Phase 1-5)
- [ ] Verify custom font packs work
- [ ] Test on multiple Illustrator versions (2023, 2024, 2026)
- [ ] Collect feedback from testers
- [ ] Document any issues or limitations

---

## References

- **Adobe CEP Resources**: https://github.com/Adobe-CEP/CEP-Resources
- **ZXPSignCmd Documentation**: https://github.com/Adobe-CEP/CEP-Resources/tree/master/ZXPSignCMD
- **Anastasiy's Extension Manager**: https://install.anastasiy.com/
- **ZXPInstaller**: https://aescripts.com/learn/zxp-installer/
- **CEP Cookbook**: https://github.com/Adobe-CEP/CEP-Resources/blob/master/CEP_11.x/Documentation/CEP%2011.1%20HTML%20Extension%20Cookbook.md

---

## Appendix: Manual Packaging Steps

If the automated script fails, you can package manually:

### Step 1: Prepare Package Directory

```bash
mkdir -p build/package
cp -r extension/CSXS build/package/
cp -r extension/client build/package/
cp -r extension/host build/package/
cp extension/.debug build/package/
```

### Step 2: Clean Development Files

```bash
find build/package -name ".DS_Store" -delete
find build/package -name "*.map" -delete
```

### Step 3: Create Certificate (if needed)

```bash
mkdir -p certificates
ZXPSignCmd -selfSignedCert CN Province Organization MathFormulaPlugin mathformula certificates/certificate.p12
```

### Step 4: Sign and Package

```bash
mkdir -p releases
ZXPSignCmd -sign build/package releases/MathFormulaPlugin-v1.0.0-beta.zxp certificates/certificate.p12 mathformula -tsa http://timestamp.digicert.com
```

### Step 5: Verify

```bash
ZXPSignCmd -verify releases/MathFormulaPlugin-v1.0.0-beta.zxp
```

---

**Document Status**: ✅ Complete  
**Last Updated**: 2026-02-26  
**Next Review**: After Phase 5 completion
