# 通知模块

## 获取作者通知
- **URL**: `/api/notifications/author`
- **Method**: `GET`
- **Description**: 作者获取自己参与论文的通知列表
- **Response**: `[{"notification_id": "number", "paper_id": "number", "notification_type": "string", "sent_at": "datetime", "deadline": "datetime", "is_read": "boolean", "content": "string"}]`

## 发送通知给作者
- **URL**: `/api/notifications/author`
- **Method**: `POST`
- **Description**: 编辑发送通知给论文相关作者
- **Request Body**: `{"paper_id": "number", "notification_type": "Acceptance Notification/Rejection Notification/Major Revision/Review Assignment/Payment Confirmation", "deadline": "datetime"}`
- **Response**: `{"message": "string", "notification_id": "number"}`

## 标记通知为已读
- **URL**: `/api/notifications/:id/read`
- **Method**: `PUT`
- **Description**: 标记通知为已读（作者只能标记自己参与论文的通知）
- **Response**: `{"message": "string"}`

## 获取未读通知数量
- **URL**: `/api/notifications/unread-count`
- **Method**: `GET`
- **Description**: 获取当前用户参与论文的未读通知数量
- **Response**: `{"unread_count": "number"}`