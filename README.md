# VideoNote 🎬📝

> 看视频做笔记，让学习更高效

VideoNote 是一款跨平台笔记应用，专为 **视频学习场景** 设计。支持 Bilibili 视频关联、Markdown 编辑、文件夹管理、多格式导出，适配 Windows 桌面端和 Android 移动端。

![demo](public/icon.svg)

---

## ✨ 功能特性

### 📝 笔记管理
- **Markdown 编辑器** — 支持标题/粗体/斜体/删除线/列表/待办/代码块/表格/引用等完整语法
- **三种编辑模式** — 编辑 / 分屏（实时预览）/ 纯预览
- **工具栏快捷插入** — 一键插入格式语法，无需记忆 Markdown
- **标签系统** — 为笔记打标签，自动补全，按标签搜索
- **笔记染色** — 自定义笔记颜色条，视觉轻松区分
- **[TOC] 目录支持** — 插入 `[toc]` 自动生成目录
- **字数统计** — 实时显示中英文混合字数
- **元数据** — 创建时间 / 修改时间 / 字数

### 🗂️ 文件夹管理
- **树形文件夹** — 无限级嵌套，类资源管理器体验
- **配色标记** — 文件夹可自定义颜色，快速定位
- **移动笔记/文件夹** — 拖拽式右键菜单移动
- **搜索过滤** — 实时搜索标题/内容/标签

### 🎬 Bilibili 视频关联
- **视频面板** — 输入 BV 号或链接自动获取视频信息
- **封面显示** — 自动拉取视频封面（Electron IPC 代理 / Capacitor HTTP）
- **展开/收起** — 关联后自动收缩为标题栏，点击展开详情
- **笔记溯源** — 导出时自动添加视频来源信息

### ♻️ 回收站
- **14 天保留** — 删除的笔记暂存回收站
- **恢复/永久删除** — 可单独或批量操作
- **自动清理** — 超 14 天自动清除

### 📤 多格式导出
- **Markdown (.md)** — 完整格式保留
- **Word 文档 (.docx)** — 真实 docx 生成（Electron 使用 `docx` 库，Web 使用降级方案）
- **PDF 文档 (.pdf)** — Electron 使用 Chromium `printToPDF` 原生渲染，中文完美可选文字
- **HTML 网页 (.html)** — 带样式的独立网页
- **纯文本 (.txt)** — 纯文字内容
- *导出内容自动附带关联的视频来源信息*

### 🎨 个性化
- **5 种主题** — 深色 / 浅色 / 跟随系统 / 米黄纸色（护眼）/ 绿色护眼
- **主题色自定义** — 12 种预设 + 系统取色器 + HEX 输入
- **侧边栏折叠** — 紧凑图标模式，文件夹导航

### ⚙️ 数据管理
- **存储位置可选** — 桌面版支持自定义数据目录
- **版本控制** — `package.json` + Git 标签管理
- **跨平台数据** — 同一份 JSON 数据格式，Web/桌面/安卓互通

---

## 🖥️ 技术栈

| 层面 | 技术 |
|---|---|
| **前端框架** | React 18 + TypeScript |
| **构建工具** | Vite 5 |
| **状态管理** | Zustand |
| **桌面壳** | Electron 31 |
| **移动壳** | Capacitor 8 (Android) |
| **UI 图标** | Lucide React |
| **Markdown** | react-markdown + remark-gfm + rehype-raw |
| **PDF 生成** | html2canvas + jsPDF (Web) / Chromium printToPDF (Electron) |
| **DOCX 生成** | docx 库 |
| **代码规范** | TypeScript strict 模式 |

---

## 🚀 快速开始

### 前置要求

- **Node.js** >= 18
- **npm** >= 9

### 安装

```bash
# 克隆项目
git clone https://github.com/Fomalhautec/videonote.git
cd videonote

# 安装依赖
npm install

# 启动开发服务器（浏览器）
npm run dev

# 启动 Electron 桌面版
npm run electron:dev
```

浏览器打开 `http://localhost:5173` 即可使用。

### 安卓构建

需要安装 **Android Studio** 和 JDK 17。

```bash
# 构建 Web 资源
npm run build

# 初始化 Capacitor（首次）
npx cap init VideoNote com.videonote.app
npx cap add android

# 同步并打开 Android Studio
npm run sync-android

# 在 Android Studio 中点击 Run ▶️
```

### 桌面端打包

```powershell
# Windows 便携版
$env:CSC_IDENTITY_AUTO_DISCOVERY="false"
npm run electron:build
```

输出在 `release/` 目录。

---

## 📁 项目结构

```
videonote/
├── electron/
│   ├── main.ts              # Electron 主进程（IPC/PDF/DOCX/存储）
│   └── preload.ts            # 安全的桥接层
├── src/
│   ├── main.tsx              # React 入口
│   ├── App.tsx               # 主布局
│   ├── App.css               # 完整 UI 样式
│   ├── types.ts              # TypeScript 类型定义
│   ├── store/
│   │   └── useStore.ts       # Zustand 状态管理
│   ├── utils/
│   │   └── platform.ts       # 平台工具函数
│   └── components/
│       ├── Sidebar/          # 侧边栏（文件夹树/笔记列表/回收站）
│       ├── Editor/           # Markdown 编辑器
│       ├── Overview/         # 总览页面（文件夹卡片/笔记网格）
│       ├── Bilibili/         # Bilibili 视频关联面板
│       ├── Export/           # 导出对话框
│       └── Settings/         # 设置对话框
├── android/                  # Capacitor 安卓项目
├── public/
│   ├── manifest.json         # PWA 配置
│   └── icon.svg              # 应用图标
├── scripts/
│   └── sync-android-version.js  # 版本号同步脚本
└── package.json
```

---

## 📸 截图

_(欢迎贡献截图)_

| 页面 | 说明 |
|---|---|
| 全部笔记总览 | 文件夹卡片网格 + 最近笔记展示 |
| 编辑器 | 分屏模式，左写右预览 |
| Bilibili 面板 | 关联视频，显示标题/封面/时长 |
| 设置 | 主题切换/主题色/存储位置 |

---

## 🔧 开发命令速查

| 场景 | 命令 |
|---|---|
| 本地测试（浏览器） | `npm run dev` |
| 本地测试（桌面） | `npm run electron:dev` |
| 打包桌面 exe | `$env:CSC_IDENTITY_AUTO_DISCOVERY="false"; npm run electron:build` |
| 更新安卓项目 | `npm run sync-android` |
| 类型检查 | `npx tsc --noEmit` |
| 提交代码 | `git add . && git commit -m "xxx" && git push` |
| 发布版本 | `npm run version:patch && git push --tags && git push` |

---

## 🤝 贡献

欢迎提交 Issue 和 PR！

1. Fork 项目
2. 创建特性分支 (`git checkout -b feature/amazing`)
3. 提交改动 (`git commit -m 'Add amazing feature'`)
4. 推送到分支 (`git push origin feature/amazing`)
5. 创建 Pull Request

---

## 📄 许可证

本项目仅供个人学习使用。

---

*用 VideoNote，边看视频边记录，学习效率翻倍 🚀*