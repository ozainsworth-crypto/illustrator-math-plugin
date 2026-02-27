#!/usr/bin/env python3

"""
OTF 字体子集化工具

使用 pyftsubset 对 latinmodern-math.otf 进行子集化
保留 MATH 表和必要的 layout 表
"""

import os
import sys
import json
import subprocess
from pathlib import Path

# 配置
SCRIPT_DIR = Path(__file__).parent
OUTPUT_DIR = SCRIPT_DIR / 'output'
UNICODES_FILE = OUTPUT_DIR / 'unicodes.txt'
REPORT_FILE = OUTPUT_DIR / 'report.json'
FONTS_DIR = SCRIPT_DIR / 'fonts'
INPUT_FONT = FONTS_DIR / 'latinmodern-math.otf'
OUTPUT_FONT = OUTPUT_DIR / 'latinmodern-math.mathjax-subset.otf'

def check_dependencies():
    """检查依赖"""
    try:
        result = subprocess.run(['pyftsubset', '--help'], 
                              capture_output=True, 
                              text=True)
        if result.returncode != 0:
            print("❌ pyftsubset 未安装")
            print("\n安装方法:")
            print("  pip install fonttools")
            print("  或")
            print("  pip3 install fonttools")
            sys.exit(1)
    except FileNotFoundError:
        print("❌ pyftsubset 未找到")
        print("\n安装方法:")
        print("  pip install fonttools")
        print("  或")
        print("  pip3 install fonttools")
        sys.exit(1)

def load_unicodes():
    """加载 Unicode 列表"""
    if not UNICODES_FILE.exists():
        print(f"❌ Unicode 文件不存在: {UNICODES_FILE}")
        print("\n请先运行: node extract-mathjax-unicodes.js")
        sys.exit(1)
    
    with open(UNICODES_FILE, 'r', encoding='utf-8') as f:
        unicodes_text = f.read().strip()
    
    # 解析 Unicode 列表 (格式: U+XXXX,U+YYYY,...)
    unicodes = unicodes_text.split(',')
    print(f"✅ 加载了 {len(unicodes)} 个 Unicode codepoints")
    return unicodes

def check_input_font():
    """检查输入字体"""
    if not INPUT_FONT.exists():
        print(f"❌ 输入字体不存在: {INPUT_FONT}")
        print("\n请将 latinmodern-math.otf 放置在:")
        print(f"  {FONTS_DIR}/")
        print("\n下载地址:")
        print("  http://www.gust.org.pl/projects/e-foundry/lm-math/download/latinmodern-math-1959.otf")
        sys.exit(1)
    
    print(f"✅ 找到输入字体: {INPUT_FONT}")

def subset_font(unicodes):
    """执行字体子集化"""
    print("\n🔧 开始字体子集化...")
    
    # 确保输出目录存在
    OUTPUT_DIR.mkdir(parents=True, exist_ok=True)
    
    # 构建 pyftsubset 命令
    cmd = [
        'pyftsubset',
        str(INPUT_FONT),
        f'--output-file={OUTPUT_FONT}',
        f'--unicodes={",".join(unicodes)}',
        
        # 保留重要的表
        '--layout-features=*',  # 保留所有 layout features
        '--glyph-names',        # 保留 glyph 名称
        '--symbol-cmap',        # 保留 symbol cmap
        '--legacy-cmap',        # 保留 legacy cmap
        '--notdef-glyph',       # 保留 .notdef glyph
        '--notdef-outline',     # 保留 .notdef outline
        '--recommended-glyphs', # 保留推荐的 glyphs
        '--name-IDs=*',         # 保留所有 name IDs
        '--name-legacy',        # 保留 legacy name 表
        '--name-languages=*',   # 保留所有语言的 name
        
        # 保留 OpenType 表
        '--drop-tables-=',      # 不删除任何表
        
        # 保留 hinting
        '--hinting',
        
        # 不优化 CFF (保持兼容性)
        '--no-desubroutinize',
    ]
    
    print(f"\n执行命令:")
    print(f"  {' '.join(cmd)}")
    print()
    
    try:
        result = subprocess.run(cmd, 
                              capture_output=True, 
                              text=True,
                              check=True)
        
        if result.stdout:
            print(result.stdout)
        
        print(f"\n✅ 子集化完成!")
        print(f"   输出文件: {OUTPUT_FONT}")
        
        # 显示文件大小
        input_size = INPUT_FONT.stat().st_size
        output_size = OUTPUT_FONT.stat().st_size
        reduction = (1 - output_size / input_size) * 100
        
        print(f"\n📊 文件大小:")
        print(f"   原始: {input_size:,} bytes ({input_size / 1024 / 1024:.2f} MB)")
        print(f"   子集: {output_size:,} bytes ({output_size / 1024 / 1024:.2f} MB)")
        print(f"   减少: {reduction:.1f}%")
        
        return True
        
    except subprocess.CalledProcessError as e:
        print(f"\n❌ 子集化失败!")
        print(f"\n错误输出:")
        print(e.stderr)
        return False

def verify_subset():
    """验证子集化结果"""
    print("\n🔍 验证子集化结果...")
    
    try:
        # 使用 ttx 检查字体表
        result = subprocess.run(['ttx', '-l', str(OUTPUT_FONT)],
                              capture_output=True,
                              text=True)
        
        if result.returncode == 0:
            tables = result.stdout.strip().split('\n')
            print(f"\n✅ 字体包含 {len(tables)} 个表:")
            
            # 检查关键表
            key_tables = ['MATH', 'GPOS', 'GSUB', 'GDEF', 'cmap', 'name']
            for table in key_tables:
                if table in result.stdout:
                    print(f"   ✅ {table}")
                else:
                    print(f"   ⚠️  {table} (缺失)")
        else:
            print("⚠️  无法验证字体表 (ttx 未安装)")
            print("   安装: pip install fonttools")
            
    except FileNotFoundError:
        print("⚠️  ttx 未安装，跳过验证")
        print("   安装: pip install fonttools")

def generate_usage_guide():
    """生成使用指南"""
    guide_file = OUTPUT_DIR / 'USAGE.md'
    
    guide_content = f"""# MathJax 子集字体使用指南

## 生成的文件

- `latinmodern-math.mathjax-subset.otf` - 精简版 Latin Modern Math 字体
- `unicodes.txt` - 包含的 Unicode 列表
- `report.json` - 详细的字符集报告

## 使用方法

### 1. 在字体编辑器中打开

**FontForge:**
```bash
fontforge {OUTPUT_FONT.name}
```

**Glyphs (macOS):**
- 双击 `{OUTPUT_FONT.name}` 打开

### 2. 编辑字形

这个子集字体只包含 MathJax 实际使用的字符，文件更小，编辑更快。

### 3. 导出并使用

编辑完成后，导出为 TTF/OTF 格式，然后使用字体转换工具生成字体包：

```bash
cd ../../font-pack-builder
./转换字体.command
```

## 包含的字符范围

查看 `report.json` 了解详细的字符列表和范围统计。

## 注意事项

1. **MATH 表**: 子集化保留了 MATH 表，确保数学排版正确
2. **Layout 表**: 保留了 GPOS/GSUB/GDEF 表，确保字形定位和替换正常
3. **兼容性**: 子集字体与原始字体完全兼容

## 验证

使用现有的测试页面验证字体是否正常工作：

```bash
cd ../..
npm run dev
```

然后在浏览器中测试公式渲染。
"""
    
    with open(guide_file, 'w', encoding='utf-8') as f:
        f.write(guide_content)
    
    print(f"\n📝 已生成使用指南: {guide_file}")

def main():
    print("=" * 60)
    print("MathJax 字体子集化工具")
    print("=" * 60)
    print()
    
    # 检查依赖
    print("🔍 检查依赖...")
    check_dependencies()
    print("✅ 依赖检查通过")
    print()
    
    # 检查输入文件
    print("🔍 检查输入文件...")
    check_input_font()
    unicodes = load_unicodes()
    print()
    
    # 执行子集化
    success = subset_font(unicodes)
    
    if success:
        # 验证结果
        verify_subset()
        
        # 生成使用指南
        generate_usage_guide()
        
        print("\n" + "=" * 60)
        print("✅ 完成!")
        print("=" * 60)
        print(f"\n输出文件: {OUTPUT_FONT}")
        print(f"\n下一步:")
        print(f"  1. 在字体编辑器中打开: {OUTPUT_FONT.name}")
        print(f"  2. 编辑需要修改的字形")
        print(f"  3. 导出并使用字体转换工具生成字体包")
        print()
    else:
        print("\n" + "=" * 60)
        print("❌ 子集化失败")
        print("=" * 60)
        sys.exit(1)

if __name__ == '__main__':
    main()
