# API说明-身份验证模块

## 登录
- **URL**: `/api/auth/login`
- **Method**: `POST`
- **Description**: 用户登录，获取JWT令牌
- **Request Body**: 
```json
{
    "email": "string",
    "password": "string", 
    "role": "author/expert/editor"
}
```
- **Response**: 
```json
{
    "token": "string", 
    "userId": "number", 
    "role": "string"
}
```