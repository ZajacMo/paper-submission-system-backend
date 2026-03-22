# 论文投稿系统 (Paper Submission System)
[English](README.md)

这是一个全栈论文投稿与管理系统，由 React 前端和 Node.js/Express 后端组成。

## 项目结构

本项目主要包含两个部分：

- `client/`: 基于 React + Vite + Mantine 构建的前端应用
- `server/`: 基于 Node.js + Express + MySQL 构建的后端应用

## 功能特性

- 用户认证 (JWT)
- 论文投稿与管理
- 评审系统
- 基于角色的访问控制 (作者、评审人、管理员)
- 文件上传支持
- Docker 支持

## 技术栈

### 前端 (Client)
- React
- Vite
- Mantine UI
- React Query
- React Router
- Axios
- i18next (国际化支持)

### 后端 (Server)
- Node.js
- Express
- MySQL
- JWT Authentication
- Multer (文件上传)

## 快速开始

### 前置要求
- Node.js (v16+)
- MySQL
- Docker & Docker Compose (可选)

### 使用 Docker Compose 运行 (推荐)

> **注意**：本项目使用 Git 子模块管理前端代码。初次克隆时需添加 `--recurse-submodules` 参数以自动拉取子模块。

1. 克隆仓库（包含子模块）：
```bash
git clone --recurse-submodules https://github.com/ZajacMo/paper-submission-system.git
cd paper-submission-system
```

2. 确保已安装 Docker 和 Docker Compose

3. 启动服务：
```bash
docker-compose up --build
```

服务访问地址：
- 前端: http://localhost:21743
- 后端 API: http://localhost:5000

### 手动安装

> **注意**：如果采用手动安装，子模块需单独克隆：
> ```bash
> git clone --recurse-submodules https://github.com/ZajacMo/paper-submission-system.git
> ```
> 或克隆后执行：
> ```bash
> git submodule init
> git submodule update
> ```

#### 后端 (Server)

1. 进入 server 目录：
```bash
cd server
```

2. 安装依赖：
```bash
npm install
```

3. 配置环境变量：
参考 `compose.yaml` 中的配置或根据本地环境创建 `.env` 文件。

4. 初始化数据库：
执行 `server/SQL/` 目录下的 SQL 脚本以设置 MySQL 数据库。

5. 启动服务器：
```bash
npm start
```

#### 前端 (Client)

1. 进入 client 目录：
```bash
cd client
```

2. 安装依赖：
```bash
npm install
```

3. 启动开发服务器：
```bash
npm run dev
```

## 项目效果

### 登录页面
![登录页面](figs/login.png)

### 作者界面
| | |
|---|---|
| ![作者首页](figs/author-home-panel.png) | ![作者论文列表](figs/author-paper-list.png) |
| ![作者信息](figs/author-information.png) | |

### 评审人界面
| | |
|---|---|
| ![评审人首页](figs/expert-home-pannel.png) | ![评审人通知](figs/expert-notification.png) |
| ![评审人信息](figs/expert-infomation.png) | ![评审人撤稿](figs/expert-withdrawal.png) |

### 编辑界面
| | |
|---|---|
| ![编辑论文列表](figs/editor-paper-list.png) | ![编辑信息](figs/editor-information.png) |

## 许可证

Copyright 2025 Zajac Mo

根据 Apache 许可证 2.0 版（"许可证"）授权；
除非符合许可证的明确规定，否则您不得使用此文件。
您可以在以下网址获取许可证副本：

    http://www.apache.org/licenses/LICENSE-2.0

除非适用法律要求或书面同意，根据许可证分发的软件
按"原样"提供，不附带任何明示或暗示的保证或条件。
有关许可证下特定语言的权限和限制，请参阅许可证。
