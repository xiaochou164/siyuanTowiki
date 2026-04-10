# API 文档

Wiki REST API 完整参考文档，支持通过 API Key 或用户认证访问。

## 快速开始

### 认证方式
在请求头中添加：

```bash
Authorization: Bearer ww_your_api_key
```

### 基础 URL
所有 API 请求的基础地址：

```bash
https://your-wiki.com/api/v1
```

### 示例请求

```bash
# 获取页面列表
curl -X GET "https://your-wiki.com/api/v1/pages" \
  -H "Authorization: Bearer ww_your_api_key" \
  -H "Content-Type: application/json"

# 创建新页面
curl -X POST "https://your-wiki.com/api/v1/pages" \
  -H "Authorization: Bearer ww_your_api_key" \
  -H "Content-Type: application/json" \
  -d '{"title": "新页面", "content": "页面内容"}'
```

## 响应格式

### 成功响应

```json
{
  "success": true,
  "data": { ... },
  "error": null
}
```

### 错误响应

```json
{
  "success": false,
  "data": null,
  "error": {
    "code": "ERROR_CODE",
    "message": "错误描述"
  }
}
```

## API 端点

### 认证

| Method | Path | 描述 | 认证 | 权限 | 查询参数 | 请求体 | 响应示例 |
|---|---|---|---|---|---|---|---|
| POST | `/api/v1/auth/login` | 用户登录 | 否 | 只读 |  | `{ "username": "string", "password": "string" }` | `{ "token": "string", "user": {...} }` |
| POST | `/api/v1/auth/register` | 用户注册 | 否 | 只读 |  | `{ "username": "string", "email": "string", "password": "string" }` |  |
| POST | `/api/v1/auth/logout` | 用户登出 | 是 | 只读 |  |  |  |
| GET | `/api/v1/auth/me` | 获取当前用户信息 | 是 | 只读 |  |  |  |
| PUT | `/api/v1/auth/profile` | 更新个人资料 | 是 | 读写 |  | `{ "display_name"?: "string", "avatar_url"?: "string" }` |  |
| PUT | `/api/v1/auth/password` | 修改密码 | 是 | 读写 |  | `{ "old_password": "string", "new_password": "string" }` |  |

### 页面

| Method | Path | 描述 | 认证 | 权限 | 查询参数 | 请求体 | 响应示例 |
|---|---|---|---|---|---|---|---|
| GET | `/api/v1/pages` | 获取页面列表 | 否 | 只读 | `?page=1&perPage=20&tag=xxx&visibility=public` |  |  |
| POST | `/api/v1/pages` | 创建页面 | 是 | 读写 |  | `{ "title": "string", "content": "string", "visibility"?: "public", "tags"?: [], "space_id"?: number }` |  |
| GET | `/api/v1/pages/:slug` | 获取页面详情 | 否 | 只读 |  |  |  |
| PUT | `/api/v1/pages/:slug` | 更新页面 | 是 | 读写 |  | `{ "title"?: "string", "content"?: "string", "tags"?: [] }` |  |
| DELETE | `/api/v1/pages/:slug` | 删除页面 | 是 | 读写 |  |  |  |
| GET | `/api/v1/pages/:slug/versions` | 获取页面版本历史 | 是 | 只读 |  |  |  |
| POST | `/api/v1/pages/:slug/versions/:version/restore` | 恢复到指定版本 | 是 | 读写 |  |  |  |
| GET | `/api/v1/pages/:slug/export` | 导出页面为 Markdown | 否 | 只读 |  |  |  |
| GET | `/api/v1/pages/:slug/children` | 获取子页面列表 | 否 | 只读 |  |  |  |
| GET | `/api/v1/pages/:slug/backlinks` | 获取反向链接 | 否 | 只读 |  |  |  |
| POST | `/api/v1/pages/:slug/favorite` | 收藏页面 | 是 | 读写 |  |  |  |
| DELETE | `/api/v1/pages/:slug/favorite` | 取消收藏 | 是 | 读写 |  |  |  |
| POST | `/api/v1/pages/:slug/subscribe` | 订阅页面更新 | 是 | 读写 |  |  |  |
| DELETE | `/api/v1/pages/:slug/subscribe` | 取消订阅 | 是 | 读写 |  |  |  |
| POST | `/api/v1/pages/:slug/copy` | 复制页面 | 是 | 读写 |  |  |  |
| GET | `/api/v1/pages/templates` | 获取模板列表 | 否 | 只读 |  |  |  |

### 空间

| Method | Path | 描述 | 认证 | 权限 | 查询参数 | 请求体 | 响应示例 |
|---|---|---|---|---|---|---|---|
| GET | `/api/v1/spaces` | 获取空间列表 | 是 | 只读 | `?page=1&perPage=20` |  |  |
| POST | `/api/v1/spaces` | 创建空间 | 是 | 读写 |  | `{ "name": "string", "description"?: "string" }` |  |
| GET | `/api/v1/spaces/:slug` | 获取空间详情 | 是 | 只读 |  |  |  |
| PATCH | `/api/v1/spaces/:slug` | 更新空间 | 是 | 读写 |  | `{ "name"?: "string", "description"?: "string" }` |  |
| DELETE | `/api/v1/spaces/:slug` | 删除空间 | 是 | 读写 |  |  |  |
| GET | `/api/v1/spaces/:slug/members` | 获取空间成员列表 | 是 | 只读 |  |  |  |
| POST | `/api/v1/spaces/:slug/members` | 添加空间成员 | 是 | 读写 |  | `{ "user_id": number, "role": "admin|member|viewer" }` |  |
| DELETE | `/api/v1/spaces/:slug/members/:userId` | 移除空间成员 | 是 | 读写 |  |  |  |
| PATCH | `/api/v1/spaces/:slug/members/:userId/role` | 更新成员角色 | 是 | 读写 |  | `{ "role": "admin|member|viewer" }` |  |
| GET | `/api/v1/spaces/:slug/pages` | 获取空间内的页面 | 是 | 只读 |  |  |  |

### 搜索

| Method | Path | 描述 | 认证 | 权限 | 查询参数 | 请求体 | 响应示例 |
|---|---|---|---|---|---|---|---|
| GET | `/api/v1/search` | 搜索页面内容 | 否 | 只读 | `?q=keyword&page=1&perPage=20` |  |  |

### 标签

| Method | Path | 描述 | 认证 | 权限 | 查询参数 | 请求体 | 响应示例 |
|---|---|---|---|---|---|---|---|
| GET | `/api/v1/tags` | 获取所有标签 | 否 | 只读 |  |  |  |

### 评论

| Method | Path | 描述 | 认证 | 权限 | 查询参数 | 请求体 | 响应示例 |
|---|---|---|---|---|---|---|---|
| GET | `/api/v1/pages/:slug/comments` | 获取页面评论 | 否 | 只读 |  |  |  |
| POST | `/api/v1/pages/:slug/comments` | 添加评论 | 是 | 读写 |  | `{ "content": "string", "parent_id"?: number }` |  |
| DELETE | `/api/v1/pages/:slug/comments/:id` | 删除评论 | 是 | 读写 |  |  |  |

### 附件

| Method | Path | 描述 | 认证 | 权限 | 查询参数 | 请求体 | 响应示例 |
|---|---|---|---|---|---|---|---|
| GET | `/api/v1/attachments` | 获取附件列表 | 是 | 只读 | `?page=1&perPage=20` |  |  |
| POST | `/api/v1/attachments/upload` | 上传附件 | 是 | 读写 |  | `multipart/form-data` |  |
| GET | `/api/v1/attachments/:id` | 获取附件详情 | 是 | 只读 |  |  |  |
| DELETE | `/api/v1/attachments/:id` | 删除附件 | 是 | 读写 |  |  |  |

### 用户

| Method | Path | 描述 | 认证 | 权限 | 查询参数 | 请求体 | 响应示例 |
|---|---|---|---|---|---|---|---|
| GET | `/api/v1/users` | 获取用户列表 | 是 | 只读 | `?page=1&perPage=20` |  |  |
| GET | `/api/v1/users/:id` | 获取用户详情 | 是 | 只读 |  |  |  |

### 通知

| Method | Path | 描述 | 认证 | 权限 | 查询参数 | 请求体 | 响应示例 |
|---|---|---|---|---|---|---|---|
| GET | `/api/v1/notifications` | 获取通知列表 | 是 | 只读 | `?page=1&perPage=20&unread_only=true` |  |  |
| POST | `/api/v1/notifications/:id/read` | 标记通知已读 | 是 | 读写 |  |  |  |
| POST | `/api/v1/notifications/read-all` | 标记全部已读 | 是 | 读写 |  |  |  |
| GET | `/api/v1/notifications/unread-count` | 获取未读数量 | 是 | 只读 |  |  |  |

### Webhooks

| Method | Path | 描述 | 认证 | 权限 | 查询参数 | 请求体 | 响应示例 |
|---|---|---|---|---|---|---|---|
| GET | `/api/v1/webhooks` | 获取 Webhook 列表 | 是 | 只读 |  |  |  |
| POST | `/api/v1/webhooks` | 创建 Webhook | 是 | 读写 |  | `{ "url": "string", "events": ["page.created", "page.updated"], "secret"?: "string" }` |  |
| DELETE | `/api/v1/webhooks/:id` | 删除 Webhook | 是 | 读写 |  |  |  |
| POST | `/api/v1/webhooks/:id/test` | 测试 Webhook | 是 | 读写 |  |  |  |

### API Keys

| Method | Path | 描述 | 认证 | 权限 | 查询参数 | 请求体 | 响应示例 |
|---|---|---|---|---|---|---|---|
| GET | `/api/v1/api-keys` | 获取 API Key 列表 | 是 | 只读 |  |  |  |
| GET | `/api/v1/api-keys/enhanced` | 获取增强版 API Key 列表 | 是 | 只读 |  |  |  |
| POST | `/api/v1/api-keys` | 创建 API Key | 是 | 读写 |  | `{ "name": "string", "scopes": "read|write|admin", "space_ids"?: [] }` |  |
| GET | `/api/v1/api-keys/:id` | 获取 API Key 详情 | 是 | 只读 |  |  |  |
| GET | `/api/v1/api-keys/:id/stats` | 获取 API Key 使用统计 | 是 | 只读 |  |  |  |
| GET | `/api/v1/api-keys/:id/logs` | 获取 API Key 请求日志 | 是 | 只读 |  |  |  |
| PATCH | `/api/v1/api-keys/:id` | 更新 API Key | 是 | 读写 |  | `{ "description"?: "string", "space_ids"?: [] }` |  |
| DELETE | `/api/v1/api-keys/:id` | 吊销 API Key | 是 | 读写 |  |  |  |

### 管理（仅管理员）

| Method | Path | 描述 | 认证 | 权限 | 查询参数 | 请求体 | 响应示例 |
|---|---|---|---|---|---|---|---|
| GET | `/api/v1/admin/users` | 获取所有用户 | 是 | 管理员 | `?page=1&perPage=20` |  |  |
| PATCH | `/api/v1/admin/users/:id` | 更新用户角色 | 是 | 管理员 |  | `{ "role": "admin|editor|reader" }` |  |
| DELETE | `/api/v1/admin/users/:id` | 删除用户 | 是 | 管理员 |  |  |  |
| GET | `/api/v1/admin/audit-logs` | 获取审计日志 | 是 | 管理员 | `?page=1&perPage=50` |  |  |
| GET | `/api/v1/admin/settings` | 获取系统设置 | 是 | 管理员 |  |  |  |
| PUT | `/api/v1/admin/settings` | 更新系统设置 | 是 | 管理员 |  | `{ "site_name"?: "string", "allow_registration"?: boolean }` |  |
| GET | `/api/v1/admin/api-keys` | 获取所有 API Keys | 是 | 管理员 | `?page=1&perPage=20` |  |  |
| DELETE | `/api/v1/admin/api-keys/:id` | 吊销任意 API Key | 是 | 管理员 |  |  |  |

### 分析统计

| Method | Path | 描述 | 认证 | 权限 | 查询参数 | 请求体 | 响应示例 |
|---|---|---|---|---|---|---|---|
| GET | `/api/v1/analytics/pages` | 获取页面访问统计 | 是 | 只读 | `?days=7` |  |  |
| GET | `/api/v1/analytics/popular` | 获取热门页面 | 是 | 只读 | `?limit=10` |  |  |

## 权限范围说明

- 只读（read）：只能读取数据，不能进行任何修改操作。
- 读写（write）：可以创建、编辑和删除内容。
- 管理员（admin）：完全访问权限，包括用户管理和系统设置。

## 常见错误码

| HTTP 状态码 | 错误码 | 说明 |
|---|---|---|
| 400 | `VALIDATION_ERROR` | 请求参数验证失败 |
| 401 | `UNAUTHORIZED` | 未认证，需要登录或提供有效的 API Key |
| 403 | `FORBIDDEN` | 无权限访问该资源 |
| 404 | `NOT_FOUND` | 请求的资源不存在 |
| 409 | `CONFLICT` | 资源冲突（如用户名已存在） |
| 429 | `RATE_LIMITED` | 请求频率超限 |
| 500 | `INTERNAL_ERROR` | 服务器内部错误 |
