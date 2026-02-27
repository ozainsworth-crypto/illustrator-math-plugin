# 下载 Latin Modern Math 字体

由于网络限制，自动下载可能失败。请按照以下步骤手动下载字体。

## 方法 1: 直接下载 (推荐)

1. 访问 GUST 字体项目页面:
   https://www.gust.org.pl/projects/e-foundry/lm-math

2. 点击 "Download" 或 "Pobierz" 链接

3. 下载 `latinmodern-math-1959.zip` 文件

4. 解压缩，找到 `latinmodern-math-1959.otf` 文件

5. 将文件重命名为 `latinmodern-math.otf`

6. 移动到本工具链的 `fonts/` 目录:
   ```bash
   mv ~/Downloads/latinmodern-math-1959.otf fonts/latinmodern-math.otf
   ```

## 方法 2: 使用系统已安装的字体

如果你的系统已经安装了 Latin Modern Math 字体，可以直接复制：

### macOS
```bash
# 查找字体
find /Library/Fonts /System/Library/Fonts ~/Library/Fonts -name "*LatinModern*Math*" 2>/dev/null

# 复制到 fonts/ 目录 (根据实际路径调整)
cp "/Library/Fonts/latinmodern-math.otf" fonts/
```

### Linux
```bash
# 查找字体
find /usr/share/fonts ~/.fonts -name "*LatinModern*Math*" 2>/dev/null

# 复制到 fonts/ 目录 (根据实际路径调整)
cp "/usr/share/fonts/opentype/latinmodern-math.otf" fonts/
```

## 方法 3: 使用备用下载源

### TeX Live 镜像
如果你安装了 TeX Live，字体可能已经存在：

```bash
# 查找 TeX Live 字体
find /usr/local/texlive -name "latinmodern-math.otf" 2>/dev/null

# 复制到 fonts/ 目录
cp "$(find /usr/local/texlive -name 'latinmodern-math.otf' | head -1)" fonts/
```

### CTAN (Comprehensive TeX Archive Network)
访问: https://ctan.org/tex-archive/fonts/lm-math

## 验证下载

下载完成后，验证文件：

```bash
# 检查文件存在
ls -lh fonts/latinmodern-math.otf

# 检查文件类型 (应该显示 "OpenType font data")
file fonts/latinmodern-math.otf

# 检查文件大小 (应该约 450KB - 550KB)
du -h fonts/latinmodern-math.otf
```

正确的输出示例:
```
-rw-r--r--  1 user  staff   485K  Feb  9 10:00 fonts/latinmodern-math.otf
fonts/latinmodern-math.otf: OpenType font data
485K    fonts/latinmodern-math.otf
```

## 下载完成后

运行完整工具链:
```bash
./run-all.sh
```

或分步执行:
```bash
# 1. 提取 Unicode (已完成)
node extract-mathjax-unicodes.cjs

# 2. 字体子集化
python3 subset-otf.py
```

## 故障排除

### 文件是 HTML 而不是字体
如果 `file fonts/latinmodern-math.otf` 显示 "HTML document"，说明下载的是网页而不是字体文件。请删除并重新下载：

```bash
rm fonts/latinmodern-math.otf
# 然后使用上述方法 1 手动下载
```

### 文件太小
正常的字体文件应该约 450KB - 550KB。如果文件只有几十 KB，说明下载不完整。

### 无法访问 GUST 网站
如果无法访问 GUST 网站，可以：
1. 使用 VPN 或代理
2. 从 CTAN 镜像下载
3. 使用系统已安装的字体
4. 从 TeX Live 安装中复制

## 许可证

Latin Modern Math 字体使用 GUST Font License (GFL)，允许自由使用和修改。

## 需要帮助？

如果遇到问题，请查看:
- README.md - 完整使用指南
- MATHJAX-REFERENCE-FONTS.md - 字体参考信息
