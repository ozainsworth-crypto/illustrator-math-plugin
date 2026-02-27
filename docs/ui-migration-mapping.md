# UI Migration Mapping Table

**Date**: 2026-02-25  
**Source**: `index优化.html` (Gemini-optimized Adobe Spectrum design)  
**Target**: Current CEP Panel UI  
**Purpose**: Migrate visual design while preserving all functionality

---

## Executive Summary

This document maps DOM elements between the reference UI (`index优化.html`) and the current implementation to guide the migration process. The goal is to adopt the Adobe Spectrum design language while maintaining 100% functional compatibility.

**Key Constraints**:
- ✅ Preserve all interactive elements and their IDs
- ✅ Maintain all event bindings and business logic
- ✅ Keep core functionality files READ-ONLY
- ✅ Only modify UI layer (HTML, CSS, minimal selector updates in main.ts)

---

## DOM Element Mapping

### 1. Input Section

| Element | Reference UI (`index优化.html`) | Current UI | Status | Notes |
|---------|--------------------------------|------------|--------|-------|
| **Container** | `<div class="input-group">` | `<section class="input-section">` | ✅ Compatible | Keep current structure |
| **Label** | `<label for="latex-input" class="input-label">` | `<h2>` inside section | 🔄 Update | Use label element for better semantics |
| **Textarea** | `<textarea id="latex-input" class="latex-input">` | `<textarea id="latex-input" class="latex-input">` | ✅ Match | Same ID, keep as-is |
| **Placeholder** | `"输入 LaTeX 公式，例如：x^2 + y^2 = z^2"` | `"输入 LaTeX 公式..."` | 🔄 Update | Use more descriptive placeholder |
| **Height** | `120px` (via CSS) | `100px` (via CSS) | 🔄 Update | Increase to 120px for better UX |

**Action Items**:
- Update placeholder text to match reference
- Adjust textarea height to 120px
- Consider using `<label>` instead of `<h2>` for semantic HTML

---

### 2. Font Selection Section

| Element | Reference UI | Current UI | Status | Notes |
|---------|-------------|------------|--------|-------|
| **Container** | `<div class="font-selector">` | `<div class="font-selector">` (component) | ✅ Match | Keep current structure |
| **Label** | `<div class="font-selector-label">` | `<span class="font-selector-label">` | ✅ Compatible | Minor difference, keep current |
| **Radio Group** | `<div class="font-radio-group">` | `<div class="font-radio-group">` | ✅ Match | Same structure |
| **Default Option** | `<input type="radio" id="font-default" name="font-choice">` | `<input type="radio" id="font-default" name="font-choice">` | ✅ Match | Same ID |
| **User Option** | `<input type="radio" id="font-user" name="font-choice">` | `<input type="radio" id="font-user" name="font-choice">` | ✅ Match | Same ID |
| **Tool Button** | `<button class="font-tool-button">🛠️</button>` | `<button class="font-tool-button">🛠️</button>` | ✅ Match | Same structure |

**Action Items**:
- No changes needed, structure already matches

---

### 3. Font Size Input (CEP Only)

| Element | Reference UI | Current UI | Status | Notes |
|---------|-------------|------------|--------|-------|
| **Container** | `<div class="option-row" id="font-size-container">` | `<div id="font-size-container">` | ✅ Compatible | Add `option-row` class |
| **Label** | `<label for="font-size-input" class="option-label">` | Implicit in component | 🔄 Update | Add explicit label |
| **Input** | `<input type="number" id="font-size-input" class="font-size-input">` | `<input type="number" id="font-size-input">` | ✅ Match | Same ID, add class |
| **Min/Max** | `min="8" max="144" value="14"` | `min="8" max="144" value="14"` | ✅ Match | Same constraints |

**Action Items**:
- Add `option-row` class to container
- Add explicit `<label>` element
- Add `font-size-input` class to input

---

### 4. Action Buttons

| Element | Reference UI | Current UI | Status | Notes |
|---------|-------------|------------|--------|-------|
| **Render Button** | `<button id="render-btn" class="btn btn-primary">` | `<button id="render-btn" class="btn btn-primary">` | ✅ Match | Same ID and classes |
| **Clear Button** | `<button id="clear-btn" class="btn btn-secondary">` | `<button id="clear-btn" class="btn btn-secondary">` | ✅ Match | Same ID and classes |
| **Insert Button** | `<button id="insert-btn" class="btn btn-success">` | `<button id="insert-btn" class="btn btn-success">` | ✅ Match | Same ID and classes |
| **Button Container** | `<div class="action-buttons">` | `<div class="input-actions">` | 🔄 Update | Rename class for consistency |

**Action Items**:
- Rename `input-actions` to `action-buttons` for consistency
- Verify button order matches reference

---

### 5. Preview Section

| Element | Reference UI | Current UI | Status | Notes |
|---------|-------------|------------|--------|-------|
| **Container** | `<section class="preview-section">` | `<section class="preview-section">` | ✅ Match | Same structure |
| **Title** | `<h2>预览</h2>` | `<h2>预览</h2>` | ✅ Match | Same text |
| **Preview Container** | `<div class="preview-container">` | `<div class="preview-container">` | ✅ Match | Same class |
| **Output** | `<div id="preview-output" class="preview-output">` | `<div id="preview-output" class="preview-output">` | ✅ Match | Same ID |
| **Loading** | `<div id="loading-indicator" class="loading-indicator hidden">` | `<div id="loading-indicator" class="loading-indicator hidden">` | ✅ Match | Same ID |
| **Error** | `<div id="error-message" class="error-message hidden">` | `<div id="error-message" class="error-message hidden">` | ✅ Match | Same ID |

**Action Items**:
- No changes needed, structure already matches

---

### 6. Tab Navigation (CEP Only)

| Element | Reference UI | Current UI | Status | Notes |
|---------|-------------|------------|--------|-------|
| **Tab Container** | `<div class="tab-navigation">` | `<div class="tab-navigation">` | ✅ Match | Same structure |
| **Preview Tab** | `<button class="tab-button active" data-tab="preview">` | `<button class="tab-button active" data-tab="preview">` | ✅ Match | Same attributes |
| **Debug Tab** | `<button class="tab-button" data-tab="debug">` | `<button class="tab-button" data-tab="debug">` | ✅ Match | Same attributes |
| **Tab Panels** | `<div id="preview-panel" class="tab-panel active">` | `<div id="preview-panel" class="tab-panel active">` | ✅ Match | Same IDs |

**Action Items**:
- No changes needed, structure already matches

---

### 7. Debug Log Section

| Element | Reference UI | Current UI | Status | Notes |
|---------|-------------|------------|--------|-------|
| **Container** | `<div id="debug-panel" class="tab-panel">` | `<div id="debug-panel" class="tab-panel">` | ✅ Match | Same ID |
| **Header** | `<div class="debug-header">` | Implicit | 🔄 Update | Add explicit header div |
| **Title** | `<h3 class="debug-title">调试日志</h3>` | Implicit | 🔄 Update | Add title element |
| **Clear Button** | `<button id="clear-log-btn" class="btn btn-sm btn-secondary">` | `<button id="clear-log-btn">` | 🔄 Update | Add classes |
| **Log Output** | `<div id="debug-log" class="debug-log">` | `<div id="debug-log" class="debug-log">` | ✅ Match | Same ID |

**Action Items**:
- Add `debug-header` wrapper
- Add `debug-title` element
- Add `btn btn-sm btn-secondary` classes to clear button

---

### 8. Ambiguity Components

| Element | Reference UI | Current UI | Status | Notes |
|---------|-------------|------------|--------|-------|
| **Ambiguity Prompt** | `<div id="ambiguity-prompt">` | `<div id="ambiguity-prompt">` | ✅ Match | Component-managed |
| **Ambiguity Resolver** | `<div id="ambiguity-resolver">` | `<div id="ambiguity-resolver">` | ✅ Match | Component-managed |
| **Format Selector** | `<div id="format-selector">` | `<div id="format-selector">` | ✅ Match | Component-managed |
| **Fallback Prompt** | `<div id="fallback-prompt">` | `<div id="fallback-prompt">` | ✅ Match | Component-managed |

**Action Items**:
- No changes needed, components manage their own DOM

---

### 9. Info Section (Version Display)

| Element | Reference UI | Current UI | Status | Notes |
|---------|-------------|------------|--------|-------|
| **Container** | `<section class="info-section">` | Implicit in footer | 🔄 Update | Add dedicated section |
| **Version Text** | `<div id="mathjax-version" class="info-text">` | `<div id="mathjax-version">` | 🔄 Update | Add `info-text` class |

**Action Items**:
- Consider moving version info to dedicated section
- Add `info-text` class to version display

---

## CSS Variable Comparison

### Reference UI Variables (from `index优化.html`)

```css
:root {
  /* Adobe Spectrum Colors */
  --bg-primary: #2d2d2d;
  --bg-secondary: #1e1e1e;
  --bg-input: #3a3a3a;
  --text-primary: #f8f8f2;
  --text-secondary: #cccccc;
  --border-primary: #444444;
  --accent-primary: #0d6efd;
  
  /* Spacing (8px grid) */
  --spacing-xs: 4px;
  --spacing-sm: 8px;
  --spacing-md: 12px;
  --spacing-lg: 16px;
  --spacing-xl: 24px;
  
  /* Typography */
  --font-size-xs: 11px;
  --font-size-sm: 12px;
  --font-size-md: 14px;
  --font-size-lg: 16px;
  
  /* Border Radius */
  --radius-sm: 2px;
  --radius-md: 4px;
}
```

### Current UI Variables (from `src/style.css`)

```css
:root {
  /* Already matches reference! */
  --bg-primary: #2d2d2d;
  --bg-secondary: #1e1e1e;
  --bg-input: #3a3a3a;
  --text-primary: #f8f8f2;
  --text-secondary: #cccccc;
  --border-primary: #444444;
  --accent-primary: #0d6efd;
  
  /* Spacing already matches */
  --spacing-xs: 4px;
  --spacing-sm: 8px;
  --spacing-md: 12px;
  --spacing-lg: 16px;
  --spacing-xl: 24px;
  
  /* Typography already matches */
  --font-size-xs: 11px;
  --font-size-sm: 12px;
  --font-size-md: 14px;
  --font-size-lg: 16px;
  
  /* Border radius already matches */
  --radius-sm: 2px;
  --radius-md: 4px;
}
```

**Status**: ✅ CSS variables already match! No changes needed.

---

## JavaScript Selector Mapping

### Current Selectors in `main.ts` (lines 1-150)

| Selector | Element | Status | Notes |
|----------|---------|--------|-------|
| `#latex-input` | Textarea | ✅ Keep | Core input element |
| `#render-btn` | Button | ✅ Keep | Render action |
| `#clear-btn` | Button | ✅ Keep | Clear action |
| `#insert-btn` | Button | ✅ Keep | Insert action (CEP) |
| `#download-btn` | Button | ❌ Remove | Not in reference UI |
| `#copy-btn` | Button | ❌ Remove | Not in reference UI |
| `#preview-output` | Div | ✅ Keep | Preview container |
| `#loading-indicator` | Div | ✅ Keep | Loading state |
| `#error-message` | Div | ✅ Keep | Error display |
| `#mathjax-version` | Div | ✅ Keep | Version info |
| `#preview-section` | Section | ✅ Keep | Preview wrapper |
| `.actions-section` | Section | 🔄 Update | Rename to match reference |
| `.tab-button` | Buttons | ✅ Keep | Tab navigation |
| `.tab-panel` | Divs | ✅ Keep | Tab content |
| `#debug-log` | Div | ✅ Keep | Debug output |
| `#clear-log-btn` | Button | ✅ Keep | Clear log action |
| `#font-size-container` | Div | ✅ Keep | Font size input wrapper |
| `#font-size-input` | Input | ✅ Keep | Font size value |

**Action Items**:
- Remove references to `#download-btn` and `#copy-btn` (already done in Task 19.2)
- Update `.actions-section` selector to `.action-buttons` if needed
- All other selectors remain unchanged

---

## Migration Strategy

### Phase 1: HTML Structure Updates (Low Risk)

1. **Update placeholder text** in `<textarea id="latex-input">`
   - From: `"输入 LaTeX 公式..."`
   - To: `"输入 LaTeX 公式，例如：x^2 + y^2 = z^2"`

2. **Add semantic labels** where missing
   - Font size input: Add `<label for="font-size-input" class="option-label">`
   - Font selector: Already has label

3. **Add wrapper classes** for consistency
   - Font size container: Add `option-row` class
   - Debug section: Add `debug-header` wrapper

4. **Rename classes** for consistency
   - `.input-actions` → `.action-buttons` (if needed)

### Phase 2: CSS Adjustments (Low Risk)

1. **Textarea height**: Update from `100px` to `120px`
   ```css
   .latex-input {
     height: 120px; /* Was 100px */
   }
   ```

2. **Button spacing**: Verify matches reference
   ```css
   .action-buttons {
     display: flex;
     gap: var(--spacing-sm);
   }
   ```

3. **Debug header**: Add styles if missing
   ```css
   .debug-header {
     display: flex;
     justify-content: space-between;
     align-items: center;
     margin-bottom: var(--spacing-md);
   }
   ```

### Phase 3: JavaScript Updates (Minimal, Low Risk)

1. **Update class selector** (if renamed)
   ```typescript
   // If .input-actions was renamed to .action-buttons
   const actionsSection = document.querySelector('.action-buttons') as HTMLElement;
   ```

2. **No other JS changes needed** - all IDs remain the same

### Phase 4: Verification (Critical)

1. **Automated tests**:
   ```bash
   npm run lint
   npm run typecheck
   npm run test
   ```

2. **Manual tests** (5 key use cases from guardrails):
   - Simple formula insert: `\frac{a}{b}`
   - Custom font insert: `x^2 + y = 5`
   - Font size unification: Insert 3 times
   - UnicodeMath paste: `a/b`
   - Error handling: `\frac{a`

3. **Visual regression**:
   - Compare before/after screenshots
   - Verify all buttons visible and functional
   - Verify tab switching works
   - Verify ambiguity dialogs appear correctly

---

## Risk Assessment

### Low Risk Changes ✅
- Placeholder text updates
- CSS height adjustments
- Adding wrapper divs
- Adding semantic labels
- CSS class renames (if selectors updated)

### Medium Risk Changes ⚠️
- Removing download/copy buttons (already done in Task 19.2)
- Restructuring debug section header

### High Risk Changes ❌
- None identified (all core IDs preserved)

---

## Rollback Plan

If any regression test fails:

1. **Immediate rollback**: `git checkout -- <modified-files>`
2. **Analyze failure**: Check which test failed and why
3. **Fix or defer**: Either fix quickly (< 30 min) or defer change
4. **Re-test**: Run full regression suite again

---

## Success Criteria

- ✅ All automated tests pass (lint, typecheck, test suite)
- ✅ All 5 manual test cases pass
- ✅ Visual design matches reference UI
- ✅ No functional regressions
- ✅ All interactive elements work as before
- ✅ Tab switching works correctly
- ✅ Ambiguity dialogs appear and function correctly
- ✅ Font selection works correctly
- ✅ Insert to Illustrator works correctly

---

## Next Steps

1. Review this mapping table with user
2. Get approval to proceed with migration
3. Execute Phase 1 (HTML updates)
4. Execute Phase 2 (CSS updates)
5. Execute Phase 3 (JS updates if needed)
6. Execute Phase 4 (Verification)
7. Document results in `docs/phase5-regression-test-log.md`

---

**Document Status**: Ready for Review  
**Created**: 2026-02-25  
**Author**: Kiro AI Agent
