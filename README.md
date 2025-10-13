# 论文投稿系统 - 数据库和后端设计

本项目是一个基于MySQL的论文投稿系统，包含数据库设计和后端API实现。

[项目需求](./docs/需求.md)

## 项目结构

```
├── .gitignore              # Git忽略配置文件
├── README.md               # 项目说明文档
├── SQL/                    # SQL脚本目录
│   ├── Script.sql          # SQL脚本文件
│   ├── create_tables.sql   # 数据库表结构定义
│   └── database_extensions.sql # 数据库视图、索引、触发器
├── app.js                  # 主入口文件
├── auth.js                 # 身份验证功能
├── db.js                   # 数据库连接配置
├── docs/                   # 文档目录
│   ├── API/                # API文档
│   │   ├── authRoutes.md
│   │   ├── fundRoutes.md
│   │   ├── institutionRoutes.md
│   │   ├── keywordRoutes.md
│   │   ├── notificationRoutes.md
│   │   ├── paperRoutes.md
│   │   ├── paymentRoutes.md
│   │   ├── reviewRoutes.md
│   │   ├── scheduleRoutes.md
│   │   └── userRoutes.md
│   ├── ER图1009.pptx       # 数据库实体关系图
│   ├── README_old.md       # 旧版说明文档
│   └── 逻辑模型1010.md     # 数据库逻辑模型设计文档
├── package-lock.json       # 依赖锁定文件
├── package.json            # 项目依赖
└── routes/                 # API路由
    ├── authRoutes.js       # 身份验证路由
    ├── fundRoutes.js       # 基金管理路由
    ├── institutionRoutes.js # 机构管理路由
    ├── keywordRoutes.js    # 关键词管理路由
    ├── notificationRoutes.js # 通知管理路由
    ├── paperRoutes.js      # 论文管理路由
    ├── paymentRoutes.js    # 支付管理路由
    ├── reviewRoutes.js     # 审稿管理路由
    ├── scheduleRoutes.js   # 排期管理路由
    └── userRoutes.js       # 用户信息路由
```

## 数据库设计

[数据库逻辑模型档](./docs/逻辑模型1010.md)

[ER图](./docs/ER图1009.pptx)

## 后端API

### 技术栈
- Node.js + Express.js
- MySQL

### 功能模块
1. [身份验证模块](./docs/API/authRoutes.md)
2. [论文管理模块](./docs/API/paperRoutes.md)
3. [审稿管理模块](./docs/API/reviewRoutes.md)
4. [用户管理模块](./docs/API/userRoutes.md)
5. [支付管理模块](./docs/API/paymentRoutes.md)
6. [通知模块](./docs/API/notificationRoutes.md)
7. [排期管理模块](./docs/API/scheduleRoutes.md)
8. [机构管理模块](./docs/API/institutionRoutes.md)
9. [基金管理模块](./docs/API/fundRoutes.md)
10. [关键词管理模块](./docs/API/keywordRoutes.md)

## 注意事项

1. 系统使用JWT进行身份验证，请确保在.env文件中设置安全的JWT密钥
2. 数据库密码等敏感信息应存储在.env文件中，不要直接硬编码在代码里
3. 在实际部署时，应配置HTTPS以确保通信安全
4. 系统包含三种角色：作者、专家和编辑，各自拥有不同的权限和操作范围