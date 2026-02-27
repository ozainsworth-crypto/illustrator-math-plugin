# ZXPSignCmd 安装指南

## 问题

ZXPSignCmd 不在 Homebrew 仓库中，需要从 Adobe 官方 GitHub 仓库手动下载安装。

## 安装步骤

### 方法 1：手动下载安装（推荐）

1. **下载 ZXPSignCmd**

   访问 Adobe CEP Resources GitHub 仓库：
   ```
   https://github.com/Adobe-CEP/CEP-Resources/tree/master/ZXPSignCMD
   ```

2. **选择版本**

   进入最新版本目录（例如 4.1.2）：
   ```
   https://github.com/Adobe-CEP/CEP-Resources/tree/master/ZXPSignCMD/4.1.2
   ```

3. **下载 macOS 版本**

   下载文件：`ZXPSignCmd-64bit.dmg`

4. **安装**

   ```bash
   # 打开下载的 .dmg 文件
   open ~/Downloads/ZXPSignCmd-64bit.dmg
   
   # 将 ZXPSignCmd 复制到 /usr/local/bin/
   sudo cp /Volumes/ZXPSignCmd-64bit/ZXPSignCmd /usr/local/bin/
   
   # 设置执行权限
   sudo chmod +x /usr/local/bin/ZXPSignCmd
   
   # 卸载 DMG
   hdiutil detach /Volumes/ZXPSignCmd-64bit
   ```

5. **验证安装**

   ```bash
   ZXPSignCmd -help
   ```

   如果看到帮助信息，说明安装成功。

### 方法 2：直接下载二进制文件

如果无法访问 GitHub 或下载 DMG 文件，可以尝试直接下载二进制文件：

```bash
# 创建临时目录
mkdir -p ~/tmp/zxpsigncmd
cd ~/tmp/zxpsigncmd

# 下载 ZXPSignCmd（需要替换为实际的下载链接）
# 注意：这个链接可能需要从 GitHub 页面获取
curl -L -o ZXPSignCmd "https://github.com/Adobe-CEP/CEP-Resources/raw/master/ZXPSignCMD/4.1.2/osx10/ZXPSignCmd"

# 设置执行权限
chmod +x ZXPSignCmd

# 移动到系统路径
sudo mv ZXPSignCmd /usr/local/bin/

# 验证安装
ZXPSignCmd -help
```

### 方法 3：使用项目本地副本

如果无法安装到系统路径，可以将 ZXPSignCmd 放在项目目录中：

```bash
# 创建工具目录
mkdir -p math-formula-plugin/tools/bin

# 将 ZXPSignCmd 复制到项目目录
cp /path/to/ZXPSignCmd math-formula-plugin/tools/bin/

# 设置执行权限
chmod +x math-formula-plugin/tools/bin/ZXPSignCmd

# 修改打包脚本，使用本地 ZXPSignCmd
# 在 scripts/package-zxp.sh 中添加：
# export PATH="$PROJECT_ROOT/tools/bin:$PATH"
```

## 常见问题

### 1. 权限被拒绝

如果遇到 "Permission denied" 错误：

```bash
sudo chmod +x /usr/local/bin/ZXPSignCmd
```

### 2. 无法验证开发者

macOS 可能会阻止运行未签名的应用程序。解决方法：

```bash
# 移除隔离属性
sudo xattr -r -d com.apple.quarantine /usr/local/bin/ZXPSignCmd
```

或者在系统偏好设置中：
1. 打开"系统偏好设置" > "安全性与隐私"
2. 点击"通用"标签
3. 点击"仍要打开"按钮

### 3. 找不到 ZXPSignCmd

确保 `/usr/local/bin` 在 PATH 中：

```bash
echo $PATH | grep /usr/local/bin
```

如果没有，添加到 PATH：

```bash
export PATH="/usr/local/bin:$PATH"

# 永久添加（添加到 ~/.zshrc 或 ~/.bash_profile）
echo 'export PATH="/usr/local/bin:$PATH"' >> ~/.zshrc
source ~/.zshrc
```

## 安装后步骤

安装成功后，运行打包脚本：

```bash
cd math-formula-plugin
bash scripts/package-zxp.sh
```

## 参考链接

- Adobe CEP Resources: https://github.com/Adobe-CEP/CEP-Resources
- ZXPSignCmd 文档: https://github.com/Adobe-CEP/CEP-Resources/tree/master/ZXPSignCMD
- CEP 扩展开发指南: https://github.com/Adobe-CEP/CEP-Resources/blob/master/CEP_11.x/Documentation/CEP%2011.1%20HTML%20Extension%20Cookbook.md
