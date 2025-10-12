# 支付管理模块

## 创建支付记录
- **URL**: `/api/payments`
- **Method**: `POST`
- **Description**: 创建支付记录（用于作者支付审稿费）
- **Request Body**: `{"paper_id": "number", "amount": "number"}`
- **Response**: `{"message": "string"}`

## 更新支付状态
- **URL**: `/api/payments/:id/status`
- **Method**: `PUT`
- **Description**: 更新支付状态（编辑使用）
- **Request Body**: `{"status": "Paid/Pending"}`
- **Response**: `{"message": "string"}`

## 提现申请
- **URL**: `/api/payments/withdrawals`
- **Method**: `POST`
- **Description**: 专家提交审稿任务的提现申请
- **Request Body**: `{"assignment_id": "number"}`
- **成功响应** (200): `{"message": "string", "assignment_id": "number"}`
- **错误响应**:
  - 400: `{"message": "assignment_id是必需的"}` 或 `{"message": "该任务的提现申请已提交"}` 或 `{"message": "请先完善银行账户信息"}`
  - 404: `{"message": "该审稿任务不存在或未完成"}` 或 `{"message": "专家信息不存在"}` 或 `{"message": "未找到可提现的记录"}`
  - 500: `{"message": "错误信息"}`

## 获取专家提现记录
- **URL**: `/api/payments/withdrawals`
- **Method**: `GET`
- **Description**: 专家获取自己的提现记录
- **成功响应** (200): `[{"assignment_id": "number", "expert_id": "number", "status": "boolean", "withdrawal_date": "datetime", "paper_id": "number", "paper_title_zh": "string", "paper_title_en": "string", "amount": "number"}]`
- **错误响应**:
  - 401: `{"message": "未授权"}`
  - 500: `{"message": "查询失败"}`

## 处理提现申请
- **URL**: `/api/payments/withdrawals/:assignment_id/status`
- **Method**: `PUT`
- **Description**: 编辑处理专家的提现申请
- **Request Body**: `{"status": "boolean"}`
- **Response**: `{"message": "string"}`

## 获取所有提现记录（分页）
- **URL**: `/api/payments/admin/withdrawals`
- **Method**: `GET`
- **Description**: 编辑获取所有提现记录，支持分页
- **URL参数**: 
  - `page` (可选): 页码，默认为1
  - `limit` (可选): 每页记录数，默认为10
- **成功响应** (200): 
  ```
  {
    "data": [
      {"assignment_id": "number", "expert_name": "string", "paper_id": "number", "paper_title_zh": "string", "paper_title_en": "string", "amount": "number", "status": "boolean", "withdrawal_date": "datetime", "bank_account": "string", "bank_name": "string", "account_holder": "string"}
    ],
    "pagination": {
      "currentPage": "number",
      "pageSize": "number",
      "totalItems": "number",
      "totalPages": "number"
    }
  }
  ```
- **错误响应**:
  - 401: `{"message": "未授权"}`
  - 500: `{"message": "查询失败"}`