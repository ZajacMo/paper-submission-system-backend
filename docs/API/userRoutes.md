# 用户管理模块

## 根据输入的作者ID或姓名查询作者
- **URL**: `/api/users/search`
- **Method**: `GET`
- **Description**: 根据输入的作者ID或姓名查询作者姓名
- **Access**: 需要 author 角色权限
- **Query Parameters**: `query` (作者ID或姓名)
- **Success Response**: `{"author_id": "number", "name": "string"}`
- **Error Response**: `{"message": "请输入作者ID或姓名"}` (400), `{"message": "作者不存在"}` (404), `{"message": "错误信息"}` (500)

## 获取个人信息
- **URL**: `/api/users/profile`
- **Method**: `GET`
- **Description**: 获取当前登录用户的个人信息
- **Response**: `{"name": "string", "email": "string", "phone": "string", "role": "string", "institutions": "string", "cities": "string", ...}`

## 更新个人信息
- **URL**: `/api/users/profile`
- **Method**: `PUT`
- **Description**: 更新当前登录用户的个人信息
- **Request Body**: `{"name": "string", "email": "string", "phone": "string", ...}`
- **Response**: `{"message": "string"}`

## 专家更新完整个人信息
- **URL**: `/api/users/profile` (专家角色)
- **Method**: `PUT`
- **Description**: 专家更新所有个人信息，包括银行账户信息
- **Request Body**: `{"name": "string", "email": "string", "phone": "string", "title": "string", "research_areas": "string", "review_fee": "number", "bank_account": "string", "bank_name": "string", "account_holder": "string"}`
- **Response**: `{"message": "string"}`