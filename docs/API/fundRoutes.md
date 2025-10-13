# API说明-基金管理模块

## 接口概览
本模块提供基金的新建、查询、论文关联等功能，仅对作者角色用户开放。

## 新建基金
- **URL**: `/api/funds`
- **Method**: `POST`
- **Description**: 作者用户创建新的基金项目
- **Access**: 需要 author 角色权限
- **Request Body**: 
```json
{
  "project_name": "string", // 基金项目名称
  "project_number": "string" // 基金项目编号
}
```
- **Success Response**: 
```json
{
  "message": "基金创建成功",
  "fund_id": "number",
  "project_name": "string",
  "project_number": "string"
}
```
- **Error Response**: 
  - `{"message": "项目名称和项目编号不能为空"}` (400)
  - `{"message": "该基金项目编号已存在"}` (409)
  - `{"message": "服务器错误，创建基金失败"}` (500)

## 查询作者的所有基金
- **URL**: `/api/funds`
- **Method**: `GET`
- **Description**: 作者用户查询自己创建或关联的所有基金
- **Access**: 需要 author 角色权限
- **Success Response**: 
```json
[
  {
    "fund_id": "number",
    "project_name": "string",
    "project_number": "string"
  },
  ...
]
```
- **Error Response**: 
  - `{"message": "服务器错误，查询基金失败"}` (500)

## 根据ID查询基金详情
- **URL**: `/api/funds/:fundId`
- **Method**: `GET`
- **Description**: 作者用户查询特定基金的详细信息
- **Access**: 需要 author 角色权限
- **URL Parameters**: 
  - `fundId`: 基金ID (number)
- **Success Response**: 
```json
{
  "fund_id": "number",
  "project_name": "string",
  "project_number": "string"
}
```
- **Error Response**: 
  - `{"message": "基金不存在或您无权访问"}` (404)
  - `{"message": "服务器错误，查询基金详情失败"}` (500)


## 搜索基金
- **URL**: `/api/funds/search`
- **Method**: `GET`
- **Description**: 作者用户根据项目名称或编号搜索基金
- **Access**: 需要 author 角色权限
- **Query Parameters**: 
  - `query`: 搜索关键词 (string)
- **Success Response**: 
```json
[
  {
    "fund_id": "number",
    "project_name": "string",
    "project_number": "string"
  },
  ...
]
```
- **Error Response**: 
  - `{"message": "搜索关键词不能为空"}` (400)
  - `{"message": "服务器错误，搜索基金失败"}` (500)

## 使用示例

### 创建新基金示例
**请求**:
```http
POST /api/funds HTTP/1.1
Content-Type: application/json
Authorization: Bearer [your_token]

{
  "project_name": "国家自然科学基金项目",
  "project_number": "NSFC-1234567"
}
```

**响应**:
```http
HTTP/1.1 201 Created
Content-Type: application/json

{
  "message": "基金创建成功",
  "fund_id": 1,
  "project_name": "国家自然科学基金项目",
  "project_number": "NSFC-1234567"
}
```

### 关联论文与基金示例
**请求**:
```http
POST /api/funds/1/associate/5 HTTP/1.1
Content-Type: application/json
Authorization: Bearer [your_token]
```

**响应**:
```http
HTTP/1.1 200 OK
Content-Type: application/json

{
  "message": "基金与论文关联成功",
  "paper_id": "5",
  "fund_id": "1"
}
```

### 搜索基金示例
**请求**:
```http
GET /api/funds/search?query=国家自然科学 HTTP/1.1
Authorization: Bearer [your_token]
```

**响应**:
```http
HTTP/1.1 200 OK
Content-Type: application/json

[
  {
    "fund_id": 1,
    "project_name": "国家自然科学基金项目",
    "project_number": "NSFC-1234567"
  },
  {
    "fund_id": 3,
    "project_name": "国家自然科学基金重点项目",
    "project_number": "NSFC-K987654"
  }
]
```