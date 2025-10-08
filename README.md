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

#### POST /api/auth/login - 用户登录
**请求参数（Body）：**
- `email` (string): 用户邮箱
- `password` (string): 用户密码
- `role` (string): 用户角色 ('author', 'expert', 'editor')

**成功响应：**
```json
{
  "token": "JWT令牌",
  "role": "用户角色",
  "id": "用户ID"
}
```

**失败响应：**
- 401: {"message": "用户名或密码错误"}
- 500: {"message": "错误信息"}

#### GET /api/auth/check-auth - 检查令牌有效性
**请求参数（Header）：**
- `Authorization`: Bearer JWT令牌

**成功响应：**
```json
{
  "isAuthenticated": true,
  "user": {
    "id": "用户ID",
    "role": "用户角色"
  }
}
```

**失败响应：**
- 401: {"message": "未授权"}

### 论文管理

#### GET /api/papers - 获取论文列表
**权限要求：** 所有已登录用户（作者只能查看自己的论文）

**请求参数（Header）：**
- `Authorization`: Bearer JWT令牌

**成功响应：**
```json
[
  {
    "paper_id": "论文ID",
    "title_zh": "中文标题",
    "title_en": "英文标题",
    "abstract_zh": "中文摘要",
    "abstract_en": "英文摘要",
    "submission_date": "提交日期",
    "status": "状态",
    "progress": "进度"
  }
  // ...更多论文
]
```

#### GET /api/papers/:id - 获取论文详情
**权限要求：** 所有已登录用户（作者只能查看自己的论文）

**请求参数：**
- URL参数: `id` (论文ID)
- Header: `Authorization`: Bearer JWT令牌

**成功响应：**
```json
{
  "paper_id": "论文ID",
  "title_zh": "中文标题",
  "title_en": "英文标题",
  "abstract_zh": "中文摘要",
  "abstract_en": "英文摘要",
  "attachment_path": "附件路径",
  "submission_date": "提交日期",
  "status": "状态",
  "progress": "进度",
  "authors": ["作者列表"],
  "keywords": ["关键词列表"]
}
```

**失败响应：**
- 403: {"message": "无权查看该论文"}
- 404: {"message": "论文不存在"}

#### POST /api/papers - 提交新论文
**权限要求：** 作者角色

**请求参数：**
- Header: `Authorization`: Bearer JWT令牌
- Body:
  ```json
  {
    "title_zh": "中文标题",
    "title_en": "英文标题",
    "abstract_zh": "中文摘要",
    "abstract_en": "英文摘要",
    "attachment_path": "附件路径",
    "authors": [{"author_id": "作者ID", "institution_id": "单位ID"}],
    "keywords": ["关键词1", "关键词2"]
  }
  ```

**成功响应：**
- 201: {"message": "论文提交成功", "paperId": "新论文ID"}

**失败响应：**
- 500: {"message": "错误信息"}

#### PUT /api/papers/:id - 更新论文信息
**权限要求：** 所有已登录用户（作者只能更新自己的论文且字段受限）

**请求参数：**
- URL参数: `id` (论文ID)
- Header: `Authorization`: Bearer JWT令牌
- Body:
  ```json
  {
    "title_zh": "中文标题",
    "title_en": "英文标题",
    "abstract_zh": "中文摘要",
    "abstract_en": "英文摘要",
    "attachment_path": "附件路径",
    "status": "状态", // 仅编辑和专家可更新
    "progress": "进度" // 仅编辑和专家可更新
  }
  ```

**成功响应：**
- {"message": "论文更新成功"}

**失败响应：**
- 403: {"message": "无权更新该论文"}
- 500: {"message": "错误信息"}

### 审稿管理

#### GET /api/reviews/assignments - 获取专家的审稿任务
**权限要求：** 专家角色

**请求参数（Header）：**
- `Authorization`: Bearer JWT令牌

**成功响应：**
```json
[
  {
    "assignment_id": "任务ID",
    "paper_id": "论文ID",
    "title_zh": "论文中文标题",
    "title_en": "论文英文标题",
    "due_date": "截止日期",
    "status": "任务状态"
  }
  // ...更多任务
]
```

#### POST /api/reviews/assignments - 分配审稿任务
**权限要求：** 编辑角色

**请求参数：**
- Header: `Authorization`: Bearer JWT令牌
- Body:
  ```json
  {
    "paper_id": "论文ID",
    "expert_id": "专家ID",
    "due_date": "截止日期",
    "assignment_path": "任务文档路径"
  }
  ```

**成功响应：**
- 201: {"message": "审稿任务分配成功", "assignment_id": "新任务ID"}

#### PUT /api/reviews/assignments/:id - 提交审稿意见
**权限要求：** 专家角色

**请求参数：**
- URL参数: `id` (任务ID)
- Header: `Authorization`: Bearer JWT令牌
- Body:
  ```json
  {
    "conclusion": "结论",
    "positive_comments": "正面评价",
    "negative_comments": "负面评价",
    "modification_advice": "修改建议"
  }
  ```

**成功响应：**
- {"message": "审稿意见提交成功"}

**失败响应：**
- 403: {"message": "无权处理该审稿任务"}

#### GET /api/reviews/papers/:paperId/comments - 获取论文的审稿意见
**权限要求：** 编辑和作者（作者只能查看自己论文的意见）

**请求参数：**
- URL参数: `paperId` (论文ID)
- Header: `Authorization`: Bearer JWT令牌

**成功响应：**
```json
[
  {
    "assignment_id": "任务ID",
    "expert_name": "专家姓名",
    "conclusion": "结论",
    "positive_comments": "正面评价",
    "negative_comments": "负面评价",
    "modification_advice": "修改建议",
    "submission_date": "提交日期"
  }
  // ...更多意见
]
```

**失败响应：**
- 403: {"message": "无权查看该论文的审稿意见"}

### 用户管理

#### GET /api/users/profile - 获取当前用户信息
**权限要求：** 所有已登录用户

**请求参数（Header）：**
- `Authorization`: Bearer JWT令牌

**成功响应：**
```json
{
  // 根据用户角色返回不同的字段
  "author_id"或"expert_id"或"editor_id": "用户ID",
  "name": "姓名",
  "email": "邮箱",
  "phone": "电话",
  // 其他角色相关字段
}
```

**失败响应：**
- 404: {"message": "用户不存在"}

#### PUT /api/users/profile - 更新用户信息
**权限要求：** 所有已登录用户

**请求参数：**
- Header: `Authorization`: Bearer JWT令牌
- Body:
  ```json
  {
    "name": "姓名",
    "email": "邮箱",
    "phone": "电话",
    // 其他可选字段，根据用户角色不同
  }
  ```

**成功响应：**
- {"message": "用户信息更新成功"}

#### GET /api/users/authors - 获取所有作者列表（仅编辑）
**权限要求：** 编辑角色

**请求参数（Header）：**
- `Authorization`: Bearer JWT令牌

**成功响应：**
```json
[
  {
    "author_id": "作者ID",
    "name": "姓名",
    "email": "邮箱",
    "phone": "电话"
    // 其他作者相关字段
  }
  // ...更多作者
]
```

#### GET /api/users/experts - 获取所有专家列表（仅编辑）
**权限要求：** 编辑角色

**请求参数（Header）：**
- `Authorization`: Bearer JWT令牌

**成功响应：**
```json
[
  {
    "expert_id": "专家ID",
    "name": "姓名",
    "email": "邮箱",
    "phone": "电话"
    // 其他专家相关字段
  }
  // ...更多专家
]
```

### 支付管理

#### GET /api/payments/papers/:paperId - 获取论文的支付信息
**权限要求：** 编辑和作者（作者只能查看自己论文的支付信息）

**请求参数：**
- URL参数: `paperId` (论文ID)
- Header: `Authorization`: Bearer JWT令牌

**成功响应：**
```json
[
  {
    "payment_id": "支付ID",
    "paper_id": "论文ID",
    "author_id": "作者ID",
    "author_name": "作者姓名",
    "amount": "金额",
    "status": "支付状态",
    "payment_date": "支付日期"
  }
  // ...更多支付记录
]
```

**失败响应：**
- 403: {"message": "无权查看该论文的支付信息"}

#### POST /api/payments - 创建支付记录（仅编辑）
**权限要求：** 编辑角色

**请求参数：**
- Header: `Authorization`: Bearer JWT令牌
- Body:
  ```json
  {
    "paper_id": "论文ID",
    "author_id": "作者ID",
    "amount": "金额",
    "bank_account": "银行账户"
  }
  ```

**成功响应：**
- 201: {"message": "支付记录创建成功", "payment_id": "新支付ID"}

#### PUT /api/payments/:id/status - 更新支付状态（仅编辑）
**权限要求：** 编辑角色

**请求参数：**
- URL参数: `id` (支付ID)
- Header: `Authorization`: Bearer JWT令牌
- Body: `{"status": "支付状态"}`

**成功响应：**
- {"message": "支付状态更新成功"}

#### POST /api/payments/withdrawals - 提交提现申请（仅专家）
**权限要求：** 专家角色

**请求参数：**
- Header: `Authorization`: Bearer JWT令牌
- Body: `{"amount": "金额", "bank_account_id": "银行账户ID"}`

**成功响应：**
- 201: {"message": "提现申请提交成功", "withdrawal_id": "新提现ID"}

#### GET /api/payments/withdrawals - 获取提现记录（仅专家）
**权限要求：** 专家角色

**请求参数（Header）：**
- `Authorization`: Bearer JWT令牌

**成功响应：**
```json
[
  {
    "withdrawal_id": "提现ID",
    "amount": "金额",
    "status": "状态",
    "request_date": "申请日期",
    "bank_name": "银行名称",
    "account_holder": "账户持有人"
  }
  // ...更多提现记录
]
```

## 注意事项

1. 系统使用JWT进行身份验证，请确保在.env文件中设置安全的JWT密钥
2. 数据库密码等敏感信息应存储在.env文件中，不要直接硬编码在代码里
3. 在实际部署时，应配置HTTPS以确保通信安全
4. 系统包含三种角色：作者、专家和编辑，各自拥有不同的权限