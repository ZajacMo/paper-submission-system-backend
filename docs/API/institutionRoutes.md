# 机构管理

## GET /api/institutions/search - 搜索机构
**权限要求：** 所有已登录用户

**请求参数（Query）：**
- `name` (string): 机构名称搜索关键词

**成功响应：**
```json
[
  {
    "institution_id": "机构ID",
    "name": "机构名称",
    "city": "城市",
    "zip_code": "邮政编码"
  }
  // ...更多机构
]
```

**失败响应：**
- 400: {"message": "请提供机构名称查询参数"}

## POST /api/institutions - 新增机构
**权限要求：** 所有角色

**请求参数（Body）：**
```json
{
  "name": "机构名称",
  "city": "城市",
  "zip_code": "邮政编码" // 可选
}
```

**成功响应：**
- 201: 返回新创建的机构信息
```json
{
  "institution_id": "机构ID",
  "name": "机构名称",
  "city": "城市",
  "zip_code": "邮政编码"
}
```

**失败响应：**
- 400: {"message": "机构名称和城市为必填字段"} 或 {"message": "该城市中已存在同名机构"}

## POST /api/institutions/author/link - 作者关联机构
**权限要求：** 作者角色

**请求参数（Body）：**
```json
{
  "institution_id": "机构ID"
}
```

**成功响应：**
- {"message": "机构关联成功"}

**失败响应：**
- 400: {"message": "请提供机构ID"} 或 {"message": "您已关联该机构"}
- 404: {"message": "机构不存在"}

## DELETE /api/institutions/author/unlink/:institution_id - 作者解除机构关联   
**权限要求：** 作者角色

**请求参数：**
- URL参数: `institution_id` (机构ID)

**成功响应：**
- {"message": "机构关联已解除"}

**失败响应：**
- 404: {"message": "您未关联该机构"}

## POST /api/institutions/expert/link - 专家关联机构
**权限要求：** 专家角色

**请求参数（Body）：**
```json
{
  "institution_id": "机构ID"
}
```

**成功响应：**
- {"message": "机构关联成功"}

**失败响应：**
- 400: {"message": "请提供机构ID"} 或 {"message": "您已关联该机构"}
- 404: {"message": "机构不存在"}

## DELETE /api/institutions/expert/unlink/:institution_id - 专家解除机构关联
**权限要求：** 专家角色

**请求参数：**
- URL参数: `institution_id` (机构ID)

**成功响应：**
- {"message": "机构关联已解除"}

**失败响应：**
- 404: {"message": "您未关联该机构"}

## GET /api/institutions/my - 获取当前用户关联的机构列表
**权限要求：** 所有已登录用户

**成功响应：**
```json
[
  {
    "institution_id": "机构ID",
    "name": "机构名称",
    "city": "城市",
    "zip_code": "邮政编码"
  }
  // ...更多关联机构
]
```