# Changelog

All notable changes to Font Pack Builder will be documented in this file.

The format is based on [Keep a Changelog](https://keepachangelog.com/en/1.0.0/),
and this project adheres to [Semantic Versioning](https://semver.org/spec/v2.0.0.html).

## [2.0.0] - 2026-02-10

### 🎉 Major Release - Phase 1-5 Complete

This is a major release that completes all 5 phases of the Font Pack Builder Extended Math Support project. The tool now supports four configurable character sets, intelligent font capability detection, and comprehensive reporting.

---

### Added

#### Phase 1: Core Charset System (Foundation)

- **Four configurable character sets**:
  - `base`: 62 characters (A-Z, a-z, 0-9) - always enabled
  - `extended-math-default`: 22 characters (operators, delimiters, punctuation) - enabled by default
  - `extended-math-optional`: 11 characters (brackets, special symbols) - disabled by default
  - `extended-math-advanced`: 30 characters (stretchy symbols) - disabled by default

- **CharsetManager module**: Manages character set loading and merging
- **CLI parameters**:
  - `--enable-optional`: Enable extended-math-optional charset
  - `--enable-advanced`: Enable extended-math-advanced charset
  - `--enable-text-symbols`: Enable extended-text-symbols charset
  - `--base-only`: Backward compatibility mode (only base charset)

- **Homoglyph handling**: Automatic handling of visually identical characters
  - Minus group (U+002D, U+2212)
  - Slash group (U+002F, U+2215)
  - Vertical line group (U+007C, U+2223)
  - Not sign group (U+00AC, U+2310)

- **Normalized mappings**: Fullwidth characters automatically map to ASCII

#### Phase 2: Replacement Strategies (Enhancement)

- **PathProcessor module**: SVG path processing and optimization
- **KeepOriginalAdvance strategy**: For operators (+ - = × · ÷ < > ≤ ≥ −)
  - Only replace glyph path
  - Preserve MathJax original advance width
  - Ensures consistent operator spacing and superscript positioning

- **Path centering optimization**: Optional path centering correction
  - Detects bbox center vs advance width center offset
  - Applies correction when offset exceeds threshold (10 units)
  - Enable with `--enable-path-centering` parameter
  - Records correction offset in `pathCenteringDx` field

- **Failure fallback mechanism**:
  - Automatically fallback to MathJax base fontdata on extraction failure
  - Records fallbacks and failures separately
  - Ensures font pack completeness (no missing glyphs)

#### Phase 3: Capability-Gated Variants/Assembly Support (Advanced)

- **FontCapabilityDetector module**: Intelligent font capability detection
  - Detects OpenType MATH table (binary parsing)
  - Calculates L1/L2/L3 coverage rates
  - Detects L3 target symbol coverage by category (brackets, radicals, integrals, largeOps, arrows)
  - Generates `capabilities.json` report

- **Capability-Gated strategy**:
  - Only replace glyph paths (L1/L2/L3)
  - Preserve MathJax native layout rules (variants/assembly)
  - L3 replacement allowed only when font has MATH table and sufficient L3 coverage
  - Automatic fallback for unsupported L3 symbols

- **Regression verification page**: `test-l3-regression.html`
  - 7 test cases (brackets, radicals, integrals, summations, operators)
  - Automated detection (missing glyphs, empty paths, rendering errors, bbox differences)
  - Local MathJax + CDN fallback

#### Phase 4: Reporting & Metadata (Polish)

- **ReportGenerator module**: Build report generation
  - `calculateBuildId()`: SHA-256 hash based on source font and config (16 chars)
  - `calculateSourceFontHash()`: Full SHA-256 hash of source font file (64 chars)
  - `generateManifest()`: Enhanced manifest.json with buildId, sourceFontHash, createdAt
  - `generateReport()`: Detailed report.json with statistics and glyph details

- **Enhanced manifest.json**:
  - `buildId`: Unique build identifier (16 characters)
  - `sourceFontHash`: Source font SHA-256 hash (64 characters)
  - `createdAt`: ISO 8601 timestamp
  - `charsets`: Records enabled character sets
  - `fallbacks`: Records fallback characters
  - `failures`: Records failed characters

- **Detailed report.json** (33KB):
  - Complete statistics (total, successful, failed, fallback, l3Skipped)
  - 158 glyph details with keepOriginalAdvance, pathCentering, pathCenteringDx
  - Failures and fallbacks arrays
  - Variants and assemblies stats (placeholders)
  - advancedCharsetStatus

- **Console metadata display**:
  - Displays buildId and sourceFontHash during build
  - Helps with debugging and cache troubleshooting

- **Additional output files**:
  - `capabilities.json`: Font capability detection report
  - `replacement-report.json`: Layered replacement statistics report

#### Phase 5: Documentation & Backward Compatibility (Release)

- **Complete documentation system**:
  - `README.md`: Complete technical documentation (English)
  - `使用说明.md`: User guide (Chinese)
  - `MIGRATION-GUIDE.md`: Detailed migration guide

- **Backward compatibility guarantee**:
  - `--base-only` mode: Fully compatible with old version behavior
  - Only uses base charset (62 characters)
  - Zero-risk migration path

- **Migration guide**:
  - Version comparison
  - Three migration strategies (new default, backward compatible, progressive)
  - Detailed migration steps
  - Verification methods
  - FAQ and best practices

---

### Changed

#### Default Behavior

- **Old version**: Only base charset (62 characters)
- **New version**: base + extended-math-default (84 characters)
- **Impact**: More characters use custom font by default
- **Mitigation**: Use `--base-only` to maintain old behavior

#### Output Files

- **Old version**: 2 files (fontdata.js, manifest.json)
- **New version**: 5 files (fontdata.js, manifest.json, report.json, capabilities.json, replacement-report.json)

#### Operator Handling

- **Old version**: Replace entire glyph (path + metrics)
- **New version**: KeepOriginalAdvance strategy (only replace path, preserve advance width)
- **Benefit**: Consistent operator spacing and superscript positioning

---

### Fixed

- **Operator offset issues**: Path centering optimization fixes operator misalignment
- **Missing glyphs**: Failure fallback mechanism ensures font pack completeness
- **Inconsistent spacing**: KeepOriginalAdvance strategy ensures consistent operator spacing
- **Superscript positioning**: Preserving advance width fixes superscript distance issues

---

### Technical Details

#### Core Modules

- `FontParser`: Font file parser
- `CharsetManager`: Character set configuration manager
- `FontCapabilityDetector`: Font capability detector (MATH table, L1/L2/L3 coverage)
- `GlyphExtractor`: Glyph data extractor (supports Capability-Gated extraction)
- `PathProcessor`: SVG path processor (normalization, centering correction)
- `FontdataGenerator`: MathJax fontdata generator
- `ReportGenerator`: Build report generator (manifest.json, report.json)
- `ReplacementReporter`: Layered replacement statistics reporter

#### Dependencies

- **opentype.js**: Font file parsing
- **commander**: CLI argument parsing
- **chalk**: Terminal output beautification
- **crypto**: SHA-256 hash calculation (buildId and sourceFontHash)

#### Coordinate System

- MathJax uses 1000-unit normalized coordinate system
- All metrics normalized to 1000 units
- SVG path coordinates normalized to 1000 units
- All normalization completed before merge to ensure consistency

---

### Migration Guide

#### For New Projects

Use new default behavior directly:
```bash
node build.js -i font.ttf -o output -n "MyFont"
```

#### For Existing Projects

**Option 1: Backward Compatible Mode (Recommended for Production)**
```bash
node build.js -i font.ttf -o output -n "MyFont" --base-only
```

**Option 2: Progressive Migration**
1. Start with `--base-only`
2. Test new default behavior in test environment
3. Gradually enable optional and advanced charsets
4. Deploy to production after full verification

#### Verification

1. Check `report.json` for statistics
2. Check `capabilities.json` for font capabilities
3. Visual verification in main tool
4. Test formulas: `x + y = z`, `x^2 + y^2`, `\frac{a}{b}`, `\sqrt{x}`

---

### Known Limitations

1. **TTF/OTF only**: Does not support WOFF, WOFF2 formats
2. **Variants/Assembly partial support**: Uses Capability-Gated strategy, only replaces glyph paths, preserves MathJax layout rules
3. **Single font processing**: Processes one font file at a time
4. **L3 symbols require MATH table**: Advanced charset requires font to contain OpenType MATH table

---

### Performance

- **Build time**: ~2-5 seconds for typical font
- **Output size**: ~50-100KB for fontdata.js (depends on character count)
- **Memory usage**: ~50-100MB during build

---

### Security

- **SHA-256 hashing**: Used for buildId and sourceFontHash
- **No external dependencies**: All processing done locally
- **No network requests**: Fully offline tool

---

### Acknowledgments

- **MathJax**: For the excellent math rendering library
- **opentype.js**: For the font parsing library
- **Phase 3 Spike**: For validating the Capability-Gated strategy

---

### Links

- [README.md](README.md) - Complete technical documentation
- [使用说明.md](使用说明.md) - User guide (Chinese)
- [MIGRATION-GUIDE.md](MIGRATION-GUIDE.md) - Migration guide
- [PHASE3-ACCEPTANCE.md](PHASE3-ACCEPTANCE.md) - Phase 3 acceptance document
- [PHASE4-ACCEPTANCE.md](PHASE4-ACCEPTANCE.md) - Phase 4 acceptance document
- [PHASE5-ACCEPTANCE.md](PHASE5-ACCEPTANCE.md) - Phase 5 acceptance document

---

## [1.0.0] - 2026-02-06 (Phase 0 - Initial Implementation)

### Added

- Basic font pack builder functionality
- Support for base charset (62 characters: A-Z, a-z, 0-9)
- Basic glyph extraction
- fontdata.js generation
- manifest.json generation

### Known Issues

- Only supports base charset
- No operator spacing optimization
- No failure fallback mechanism
- Limited reporting

---

## Version History

- **2.0.0** (2026-02-10): Phase 1-5 complete - Full feature release
- **1.0.0** (2026-02-06): Phase 0 - Initial implementation
