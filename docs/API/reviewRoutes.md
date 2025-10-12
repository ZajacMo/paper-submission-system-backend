# 审稿管理模块

## 分配审稿任务
- **URL**: `/api/reviews/assign`
- **Method**: `POST`
- **Description**: 编辑分配审稿任务给专家，并生成评审任务书
- **Request Body**: `{"paper_id": "number", "expert_id": "number"}`
- **Response**: `{"message": "string", "assignment_id": "number"}`
- **失败响应**:
  - 401: `{"message": "未授权"}`
  - 403: `{"message": "无权分配审稿任务"}`
  - 404: `{"message": "未找到该论文或专家"}`
  - 500: `{"message": "分配失败"}`

## 提交审稿意见
- **URL**: `/api/reviews/submit`
- **Method**: `POST`
- **Description**: 专家提交审稿意见
- **Request Body**: `{"assignment_id": "number", "conclusion": "Accept/Minor Revision/Major Revision/Reject", "positive_comments": "string", "negative_comments": "string", "modification_advice": "string"}`
- **Response**: `{"message": "string"}`
- **失败响应**:
  - 401: `{"message": "未授权"}`
  - 403: `{"message": "无权提交该审稿任务"}`
  - 404: `{"message": "未找到该审稿任务"}`
  - 500: `{"message": "提交失败"}`

## 查看审稿意见
- **URL**: `/api/reviews/:id`
- **Method**: `GET`
- **Description**: 查看审稿意见（编辑可查看所有，专家只能查看自己的）
- **Response**: `{"assignment_id": "number", "paper_id": "number", "expert_id": "number", "conclusion": "string", "positive_comments": "string", "negative_comments": "string", "modification_advice": "string", "submission_date": "datetime"}`
- **失败响应**:
  - 403: `{"message": "无权访问该审稿意见"}`
  - 404: `{"message": "未找到该审稿意见"}`
  - 500: `{"message": "查询失败"}`