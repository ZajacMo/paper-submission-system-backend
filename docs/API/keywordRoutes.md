# API说明-关键词管理模块

<!-- ## 获取所有关键词列表
- **URL**: `/api/keywords`
- **Method**: `GET`
- **Description**: 获取所有关键词列表，按中英文分类
- **Access**: 所有已登录用户
- **Success Response**:
```json
{
  "zh": [
    {
      "keyword_id": "number",
      "keyword_name": "string",
      "keyword_type": "zh"
    },
    ...
  ],
  "en": [
    {
      "keyword_id": "number",
      "keyword_name": "string",
      "keyword_type": "en"
    },
    ...
  ]
}
```
- **Error Response**: `{"message": "错误信息"}` (500) -->

## 添加新关键词
- **URL**: `/api/keywords`
- **Method**: `POST`
- **Description**: 添加新的关键词
- **Access**: 需要 author 角色权限
- **Request Body**:
```json
{
  "keyword_name": "string",
  "keyword_type": "string" // 'zh' 或 'en'
}
```
- **Success Response**: `{"message": "关键词添加成功", "keyword_id": "number"}` (201)
- **Error Response**: 
  - `{"message": "关键词名称和类型不能为空"}` (400)
  - `{"message": "关键词类型必须是 zh 或 en"}` (400)
  - `{"message": "关键词名称不能超过20个字符"}` (400)
  - `{"message": "该关键词已存在"}` (400)
  - `{"message": "错误信息"}` (500)

## 更新关键词
- **URL**: `/api/keywords/:id`
- **Method**: `PUT`
- **Description**: 更新关键词信息
- **Access**: 需要 editor 角色权限
- **Request Body**:
```json
{
  "keyword_name": "string",
  "keyword_type": "string" // 'zh' 或 'en'
}
```
- **Success Response**: `{"message": "关键词更新成功"}`
- **Error Response**: 
  - `{"message": "关键词名称和类型不能为空"}` (400)
  - `{"message": "关键词类型必须是 zh 或 en"}` (400)
  - `{"message": "关键词名称不能超过20个字符"}` (400)
  - `{"message": "关键词不存在"}` (404)
  - `{"message": "该关键词已存在"}` (400)
  - `{"message": "错误信息"}` (500)

## 删除关键词
- **URL**: `/api/keywords/:id`
- **Method**: `DELETE`
- **Description**: 删除关键词（会同时删除与论文的关联）
- **Access**: 需要 editor 角色权限
- **Success Response**: `{"message": "关键词删除成功"}`
- **Error Response**: 
  - `{"message": "关键词不存在"}` (404)
  - `{"message": "错误信息"}` (500)

## 搜索关键词
- **URL**: `/api/keywords/search`
- **Method**: `GET`
- **Description**: 根据关键词名称搜索关键词
- **Access**: 所有已登录用户
- **Query Parameters**:
  - `query`: 搜索的关键词名称
  - `type` (可选): 关键词类型 ('zh' 或 'en')
- **Success Response**: 
```json
[
  {
    "keyword_id": "number",
    "keyword_name": "string",
    "keyword_type": "string"
  },
  ...
]
```
- **Error Response**: 
  - `{"message": "请输入搜索关键词"}` (400)
  - `{"message": "错误信息"}` (500)

## 搜索中文关键词
- **URL**: `/api/keywords/search/zh`
- **Method**: `GET`
- **Description**: 专门搜索中文关键词
- **Access**: 所有已登录用户
- **Query Parameters**:
  - `query`: 搜索的中文关键词名称
- **Success Response**: 
```json
[
  {
    "keyword_id": "number",
    "keyword_name": "string",
    "keyword_type": "zh"
  },
  ...
]
```
- **Error Response**: 
  - `{"message": "请输入搜索关键词"}` (400)
  - `{"message": "错误信息"}` (500)

## 搜索英文关键词
- **URL**: `/api/keywords/search/en`
- **Method**: `GET`
- **Description**: 专门搜索英文关键词
- **Access**: 所有已登录用户
- **Query Parameters**:
  - `query`: 搜索的英文关键词名称
- **Success Response**: 
```json
[
  {
    "keyword_id": "number",
    "keyword_name": "string",
    "keyword_type": "en"
  },
  ...
]
```
- **Error Response**: 
  - `{"message": "请输入搜索关键词"}` (400)
  - `{"message": "错误信息"}` (500)

## 作者关联论文与关键词
- **URL**: `/api/keywords/papers/:paperId/associate`
- **Method**: `POST`
- **Description**: 作者将论文与关键词进行关联，支持中英文关键词区分处理
- **Access**: 需要 author 角色权限，且只能操作自己的论文
- **Request Body**: 
```json
{
  "keywords_zh": ["number"], // 中文关键词ID数组（可选）
  "keywords_en": ["number"]  // 英文关键词ID数组（可选）
}
```
- **Success Response**: 
```json
{
  "message": "论文关键词关联成功",
  "paper_id": "number",
  "keywords_zh_count": "number",
  "keywords_en_count": "number"
}
```
- **Error Response**: 
  - `{"message": "无权操作该论文"}` (403)
  - `{"message": "论文不存在"}` (404)
  - `{"message": "关键词ID XXXX 不是中文/英文关键词"}` (400)
  - `{"message": "错误信息"}` (500)