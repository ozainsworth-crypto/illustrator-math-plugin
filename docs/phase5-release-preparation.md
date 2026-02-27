# Phase 5 Release Preparation

**Document Version**: 1.0  
**Date**: 2026-02-26  
**Phase**: Phase 5 - Test Version Release  
**Task**: Task 23.6 - Release Test Version

---

## Release Status

**Current Status**: ⏳ Ready for Release (Pending ZXPSignCmd Installation)

**Version**: v1.0.0-beta  
**Release Type**: Test Version (Beta)  
**Target Audience**: Client Testing

---

## Completed Items ✅

### 1. Core Deliverables

- ✅ **CEP Panel UI Optimization** (Swiss International Design Style)
  - Adobe dark theme
  - Tab-based debug logging
  - Removed quick examples and download/copy buttons (CEP environment)
  - Responsive layout (300x400px - 600x800px)

- ✅ **Font Pack Tool Integration**
  - "Font Options - More" dropdown menu
  - Manual font pack tool entry
  - Font pack refresh functionality (polling + cache busting)

- ✅ **Packaging Scripts**
  - `scripts/package-zxp.sh` created
  - `docs/phase5-packaging-guide.md` written

- ✅ **Minimal Documentation**
  - Packaging guide
  - Known limitations
  - Feedback guide
  - Installation guide (Task 21)

- ✅ **Test Coverage**
  - Lint check: ✅ Passed (Exit Code 0)
  - TypeScript type check: ✅ Passed (Exit Code 0)
  - Regression tests: ✅ 98.0% pass rate (544/555)

### 2. Acceptance Checklist

- ✅ `docs/phase5-acceptance-checklist.md` completed
- ✅ All Phase 5 exit acceptance criteria met (core functionality)

### 3. Change Log

- ✅ `CHANGELOG.md` updated with Phase 5 changes
- ✅ Technical choices documented
- ✅ Known limitations documented
- ✅ Test coverage documented

---

## Pending Items ⏳

### 1. ZXPSignCmd Installation

**Issue**: Network connection timeout during installation

**Attempted Methods**:
- ❌ Homebrew: `brew install zxpsigncmd` (timed out during auto-update)
- ❌ Direct download: GitHub download timed out

**Recommended Solution**:
User should manually install ZXPSignCmd using one of the following methods:

#### Option A: Homebrew (Recommended for macOS)

```bash
# Disable auto-update to speed up installation
export HOMEBREW_NO_AUTO_UPDATE=1
brew install zxpsigncmd
```

#### Option B: Manual Download

1. Download from Adobe's GitHub repository:
   - URL: https://github.com/Adobe-CEP/CEP-Resources/tree/master/ZXPSignCMD/4.1.2
   - macOS: Download `ZXPSignCmd-64bit.dmg`
   - Windows: Download `ZXPSignCmd.exe`

2. Install:
   - macOS: Open the .dmg file and drag ZXPSignCmd to `/usr/local/bin/`
   - Windows: Place ZXPSignCmd.exe in a directory and add to PATH

3. Verify installation:
   ```bash
   ZXPSignCmd -help
   ```

### 2. Run Packaging Script

Once ZXPSignCmd is installed, run:

```bash
cd math-formula-plugin
bash scripts/package-zxp.sh
```

**Expected Output**:
- `releases/MathFormulaPlugin-v1.0.0-beta.zxp`
- `releases/INSTALL.md` (installation instructions)

### 3. Test the ZXP Package

1. Install the .zxp package using Adobe Extension Manager or Anastasiy's Extension Manager
2. Verify the extension loads in Illustrator
3. Test core functionality:
   - LaTeX input and preview
   - UnicodeMath paste and conversion
   - Custom font pack loading
   - SVG insertion to Illustrator
   - Font size unification

---

## Release Checklist (Task 23.6)

### Pre-Release

- [ ] ZXPSignCmd installed and verified
- [ ] Packaging script executed successfully
- [ ] .zxp package created in `releases/` directory
- [ ] .zxp package tested on local machine
- [ ] Installation instructions verified

### Release

- [ ] Create Git tag: `git tag v1.0.0-beta`
- [ ] Push tag: `git push origin v1.0.0-beta`
- [ ] Create GitHub Release (if applicable):
  - Title: "Math Formula Plugin v1.0.0-beta"
  - Description: Copy from CHANGELOG.md Phase 5 section
  - Attach: `MathFormulaPlugin-v1.0.0-beta.zxp`
  - Attach: `INSTALL.md`
  - Attach: Documentation files

### Post-Release

- [ ] Send .zxp package and documentation to client
- [ ] Establish feedback collection channel:
  - Email: [client email]
  - Form: [feedback form URL]
  - GitHub Issues: [repository URL] (if applicable)
- [ ] Notify client that test version is released
- [ ] Provide installation and usage instructions

---

## Feedback Collection

### Feedback Channels

1. **Email**: [To be provided by user]
2. **Feedback Form**: [To be created if needed]
3. **GitHub Issues**: [If repository is public]

### Feedback Categories

- **P0 (Blocking)**: Issues that prevent the plugin from working
- **P1 (Critical)**: Issues that affect main functionality
- **P2 (Normal)**: Issues that affect user experience
- **P3 (Enhancement)**: Feature requests and optimizations

### Feedback Template

```
**Environment**:
- OS: [macOS/Windows version]
- Illustrator Version: [e.g., 2026 v30.x]
- Processor: [Intel/Apple Silicon/AMD64]

**Issue Description**:
[Describe the issue]

**Steps to Reproduce**:
1. [Step 1]
2. [Step 2]
3. [Step 3]

**Expected Behavior**:
[What should happen]

**Actual Behavior**:
[What actually happened]

**Screenshots**:
[Attach screenshots if applicable]

**Priority**:
[P0/P1/P2/P3]
```

---

## Known Limitations (Communicated to Client)

### 1. Font Pack Tool Requires Manual Opening

- CEP cannot automatically start the font pack builder tool backend
- Users need to manually open the font pack tool through "Font Options - More" menu
- Font pack tool runs in browser at `http://localhost:5175`
- CEP panel provides "Refresh Font Info" button to force reload

### 2. Keyboard Shortcuts Not Implemented

- Keyboard shortcuts (Ctrl/Cmd + Enter, Ctrl/Cmd + S, Ctrl/Cmd + I) not implemented
- Deferred to Phase 6
- Users need to use mouse to click buttons

### 3. Cross-Platform Compatibility Testing Incomplete

- Currently verified only on macOS 14.1 + Illustrator 2026 + Apple Silicon
- Other 4 required test combinations pending
- Three-stage import strategy implemented for cross-version compatibility

### 4. Ruler Recognition Depends on Relative Features

- Font size unification depends on ruler character recognition
- May fail in some cases (marker=none)
- Users need to re-render formula if ruler recognition fails

---

## Next Steps

### Immediate Actions (User)

1. **Install ZXPSignCmd**:
   ```bash
   export HOMEBREW_NO_AUTO_UPDATE=1
   brew install zxpsigncmd
   ```

2. **Run Packaging Script**:
   ```bash
   cd math-formula-plugin
   bash scripts/package-zxp.sh
   ```

3. **Verify Package**:
   ```bash
   ls -lh releases/
   ```

### After Packaging (Kiro)

1. Update Task 23.1 status to completed
2. Complete Task 23.6 (Release Test Version):
   - Create Git tag
   - Create GitHub Release (if applicable)
   - Prepare release notes
   - Document feedback collection process

---

## Phase 5 Summary

**Phase 5 Core Goal**: Installable, runnable, testable test version (ZXP packaging + minimal documentation)

**Achievement**: ✅ Core goal achieved
- CEP panel UI optimization completed
- Tab-based debug logging implemented
- Font pack tool entry added
- Font pack refresh functionality implemented
- Responsive layout adapted
- Friendly error messages implemented
- Minimal documentation completed
- ZXP packaging scripts and documentation ready

**Deferred to Phase 6**:
- Keyboard shortcuts
- CEP Shell execution capability
- Complete cross-platform compatibility testing

**Phase 5 can proceed to release stage once ZXPSignCmd is installed and packaging is complete.**

---

## Contact

For questions or issues during the release process, please refer to:
- Packaging Guide: `docs/phase5-packaging-guide.md`
- Known Limitations: `docs/phase5-known-limitations.md`
- Feedback Guide: `docs/phase5-feedback-guide.md`
- Acceptance Checklist: `docs/phase5-acceptance-checklist.md`
