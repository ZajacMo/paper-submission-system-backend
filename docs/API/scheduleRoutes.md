# 排期管理模块

## 创建论文排期
- **URL**: `/api/schedules`
- **Method**: `POST`
- **Description**: 编辑为论文创建排期
- **Request Body**: `{"paper_id": "number", "issue_number": "string", "volume_number": "string", "page_number": "string"}`
- **Response**: `{"message": "string", "schedule_id": "number"}`

## 获取排期列表
- **URL**: `/api/schedules`
- **Method**: `GET`
- **Description**: 获取论文排期列表（编辑可查看所有，作者/专家只能查看自己相关的）
- **Response**: `[{"schedule_id": "number", "paper_id": "number", "issue_number": "string", "volume_number": "string", "page_number": "string", "paper_title": "string"}]`

## 更新论文排期
- **URL**: `/api/schedules/:id`
- **Method**: `PUT`
- **Description**: 编辑更新论文排期
- **Request Body**: `{"issue_number": "string", "volume_number": "string", "page_number": "string"}`
- **Response**: `{"message": "string"}`

## 删除论文排期
- **URL**: `/api/schedules/:id`
- **Method**: `DELETE`
- **Description**: 编辑删除论文排期
- **Response**: `{"message": "string"}`