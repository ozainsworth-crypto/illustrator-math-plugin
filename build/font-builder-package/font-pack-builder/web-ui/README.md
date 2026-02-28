# Font Pack Builder Web UI

本地运行的字体转换工具图形界面，为 Font Pack Builder 提供易用的 Web 界面。

## 快速开始

### 启动应用

**macOS**:
```bash
双击 start-ui.command
```

**Windows**:
```bash
双击 start-ui.bat
```

**Linux**:
```bash
./start-ui.sh
```

### 手动启动

```bash
cd math-formula-plugin/tools/font-pack-builder/web-ui
npm install
npm start
```

然后在浏览器中打开 http://localhost:3000

## 项目结构

```
web-ui/
├── server/           # 服务器端代码
│   └── server.cjs    # Express 服务器主文件
├── public/           # 静态文件
│   ├── index.html    # 主页面
│   ├── styles.css    # 样式文件
│   └── app.js        # 前端 JavaScript
├── services/         # 业务逻辑
│   └── conversion-service.js  # 转换服务
├── utils/            # 工具函数
│   └── error-handler.js       # 错误处理
├── tests/            # 测试文件
│   ├── unit/         # 单元测试
│   ├── integration/  # 集成测试
│   └── properties/   # 属性测试
├── spike/            # 技术验证代码
├── package.json      # 项目配置
├── .eslintrc.json    # ESLint 配置
└── .gitignore        # Git 忽略文件
```

## 开发

### 运行测试

```bash
npm test
```

### 代码检查

```bash
npm run lint
```

## Phase 1 功能

- ✅ 跨平台启动脚本
- ✅ 本地 HTTP 服务器
- ⏳ 文件上传功能
- ⏳ 基础字体转换（base 字符集）
- ⏳ 结果显示
- ⏳ 基础错误处理

## 技术栈

- **后端**: Node.js + Express + Multer
- **前端**: HTML + CSS + JavaScript（无框架）
- **测试**: Vitest + fast-check

## 许可证

MIT
