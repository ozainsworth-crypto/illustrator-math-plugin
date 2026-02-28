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
