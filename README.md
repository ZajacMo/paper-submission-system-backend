# 论文投稿系统 - 数据库和后端设计

本项目包含论文投稿系统的数据库设计和后端API实现。

## 项目结构

```
├── create_tables.sql       # 数据库表结构定义
├── database_extensions.sql # 数据库视图、索引、触发器
├── 逻辑模型.md            # 数据库逻辑模型设计文档
├── ER图.pptx              # 数据库实体关系图
└── backend/               # 后端API程序
    ├── app.js             # 主入口文件
    ├── db.js              # 数据库连接配置
    ├── auth.js            # 身份验证功能
    ├── package.json       # 项目依赖
    ├── .env               # 环境变量配置（需自行创建）
    └── routes/            # API路由
        ├── authRoutes.js  # 身份验证路由
        ├── paperRoutes.js # 论文管理路由
        ├── reviewRoutes.js # 审稿管理路由
        ├── userRoutes.js  # 用户信息路由
        └── paymentRoutes.js # 支付管理路由
```

## 数据库设计

### 表结构
系统包含15个表，主要包括：
- authors：作者信息
- institutions：单位信息
- papers：论文信息
- experts：评审专家信息
- editors：编辑信息
- review_assignments：审稿任务分配
- payments：支付记录
- 以及各种关联表

### 视图
为了方便查询，创建了4个视图：
- author_with_institutions：包含作者基本信息和所属单位
- paper_details：包含论文详细信息、作者、关键词、基金等
- expert_with_institutions：包含专家信息和所属单位
- review_assignments_details：包含审稿任务详情

### 索引
为常用查询字段添加了索引，包括：
- 状态字段索引（papers.status, review_assignments.status等）
- 日期字段索引（papers.submission_date等）
- 全文索引用于搜索功能

### 触发器
实现了4个触发器：
- 论文状态更新为'Published'时，记录评审完成日期
- 审稿任务完成时，更新论文状态
- 支付状态更新为'Paid'时，记录支付日期
- 创建提现记录时，记录提现日期

## 后端API

### 技术栈
- Node.js + Express
- MySQL (mysql2)
- JWT认证
- bcrypt密码加密

### 功能模块

#### 1. 身份验证
- 登录（支持作者、专家、编辑三种角色）
- JWT令牌验证
- 角色权限控制

#### 2. 论文管理
- 提交新论文
- 获取论文列表（按角色过滤）
- 获取论文详情
- 更新论文信息

#### 3. 审稿管理
- 编辑分配审稿任务
- 专家查看分配的任务
- 专家提交审稿意见
- 查看论文的所有审稿意见

#### 4. 用户管理
- 获取当前用户信息
- 更新用户信息
- 编辑查看所有作者/专家列表

#### 5. 支付管理
- 创建支付记录
- 更新支付状态
- 专家提交提现申请
- 查看提现记录

## 配置和运行

### 1. 配置数据库
1. 运行`create_tables.sql`创建数据库表结构
2. 运行`database_extensions.sql`创建视图、索引和触发器

### 2. 配置后端
1. 进入backend目录
2. 安装依赖：`npm install`
3. 复制.env.example创建.env文件，并配置数据库连接信息和JWT密钥

### 3. 启动后端服务器
```
npm start       # 生产环境启动
npm run dev     # 开发环境启动（使用nodemon）
```

## API接口文档

### 身份验证
- POST /api/auth/login - 用户登录
- GET /api/auth/check-auth - 检查令牌有效性

### 论文管理
- GET /api/papers - 获取论文列表
- GET /api/papers/:id - 获取论文详情
- POST /api/papers - 提交新论文
- PUT /api/papers/:id - 更新论文信息

### 审稿管理
- GET /api/reviews/assignments - 获取专家的审稿任务
- POST /api/reviews/assignments - 分配审稿任务
- PUT /api/reviews/assignments/:id - 提交审稿意见
- GET /api/reviews/papers/:paperId/comments - 获取论文的审稿意见

### 用户管理
- GET /api/users/profile - 获取当前用户信息
- PUT /api/users/profile - 更新用户信息
- GET /api/users/authors - 获取所有作者列表（仅编辑）
- GET /api/users/experts - 获取所有专家列表（仅编辑）

### 支付管理
- GET /api/payments/papers/:paperId - 获取论文的支付信息
- POST /api/payments - 创建支付记录（仅编辑）
- PUT /api/payments/:id/status - 更新支付状态（仅编辑）
- POST /api/payments/withdrawals - 提交提现申请（仅专家）
- GET /api/payments/withdrawals - 获取提现记录（仅专家）

## 注意事项

1. 系统使用JWT进行身份验证，请确保在.env文件中设置安全的JWT密钥
2. 数据库密码等敏感信息应存储在.env文件中，不要直接硬编码在代码里
3. 在实际部署时，应配置HTTPS以确保通信安全
4. 系统包含三种角色：作者、专家和编辑，各自拥有不同的权限