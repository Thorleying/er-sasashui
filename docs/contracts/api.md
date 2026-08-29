# ER洒洒水 API 契约

Base：开发环境前端请求 `/api`，由 Vite 代理到 `http://127.0.0.1:3001`。  
统一响应：`{ "code": number, "message": string, "data": unknown }`  
成功：`code === 0`。Cookie：`er_session`（httpOnly）。

## Auth

### POST /api/auth/register

请求：`{ "email": string, "password": string }`

约束：email 必填且合法；password 8–72 字符。显示名由服务端生成，格式 `用户` + 四位数字，不接受客户端传入。

成功 `data`：`{ "id": number, "email": string, "displayName": string, "role": "user" }`  
副作用：写 `ops.action = register`，并设置登录 Cookie。  
冲突：`40901` 邮箱已注册。

### POST /api/auth/login

请求：`{ "email": string, "password": string }`  
成功 `data`：`{ "id": number, "email": string, "displayName": string, "role": "user" | "admin" }`  
副作用：更新 `last_login_at`，写 `ops.action = login`。  
失败：`40101` 邮箱或密码错误；`40303` 账号已禁用。

### POST /api/auth/logout

成功 `data`：`null`  
副作用：已登录时写 `ops.action = logout`，清除 Cookie。

### GET /api/auth/me

未登录：`40102`  
成功 `data`：`{ "id": number, "email": string, "displayName": string, "role": "user" | "admin" }`

## Ops

### POST /api/ops

需登录。  
请求：`{ "action": "generate_er" | "export", "detail": string | null }`  
`detail` 只允许短标签，例如导出格式 `png`，禁止传 SQL 原文。  
成功 `data`：`{ "id": number }`

## Track（公开，无需登录）

### POST /api/track

页面访问埋点。  
请求：`{ "visitorId": string, "path": string }`  
`visitorId` 最长 64 字符（前端 localStorage 持久化）；`path` 最长 255 字符（路由 pathname）。  
已登录时服务端附带 `user_id` 写入 `page_views`；同时记录客户端 IP（支持 `X-Forwarded-For` / `X-Real-IP`）与 `User-Agent`。  
成功 `data`：`{ "id": number }`

## Shares（分享只读链接）

创建时会上传 ER 快照（含 SQL/DBML 原文与节点坐标），用于 `/s/:token` 只读展示。默认 **90 天**过期。

### POST /api/shares

需登录。  
请求：

```json
{
  "title": "可选标题",
  "payload": {
    "inputText": "CREATE TABLE ...",
    "isColored": false,
    "showComment": false,
    "hideFields": false,
    "nodes": [{ "id": "entity-1", "x": 100, "y": 200, "label": "用户" }]
  }
}
```

约束：`inputText` 最长 200000 字符；`nodes` 最多 800 个。  
成功 `data`：`{ "token": string, "urlPath": "/s/...", "expiresAt": string | null }`  
副作用：写 `ops.action = share`（detail 为 token 前 8 位）。

### GET /api/shares/:token

公开，无需登录。  
成功 `data`：

```json
{
  "token": "32位hex",
  "title": null,
  "payload": { "...": "同 POST payload" },
  "viewCount": 1,
  "createdAt": "2026-08-29T00:00:00.000Z"
}
```

不存在或已过期：`40401`。

### DELETE /api/shares/:token

需登录，且必须为创建者。  
成功 `data`：`null`  
非创建者或不存在：`40401`。

## Admin（需 role=admin，否则 40301）

### GET /api/admin/stats/daily?from=YYYY-MM-DD&to=YYYY-MM-DD

`from`/`to` 缺省为近 7 天（含今天）。  
成功 `data`：

```json
{
  "days": [
    {
      "date": "2026-08-29",
      "pvCount": 0,
      "uvCount": 0,
      "registerCount": 0,
      "loginCount": 0,
      "generateCount": 0,
      "exportCount": 0
    }
  ]
}
```

### GET /api/admin/users?page=1&pageSize=20&q=&role=&disabled=

查询参数：

- `q`：邮箱 / 显示名 / 用户 ID（模糊，ID 为纯数字时精确匹配）
- `role`：`user` | `admin`
- `disabled`：`true` | `false`

成功 `data`：

```json
{
  "page": 1,
  "pageSize": 20,
  "total": 0,
  "items": [
    {
      "id": 1,
      "email": "a@b.c",
      "displayName": "A",
      "role": "admin",
      "disabled": false,
      "registerIp": "127.0.0.1",
      "lastLoginIp": "127.0.0.1",
      "createdAt": "2026-08-29T00:00:00.000Z",
      "lastLoginAt": null
    }
  ]
}
```

邮箱在管理端可见（管理员职责），接口日志仍脱敏。

### PATCH /api/admin/users/:id/disabled

请求：`{ "disabled": boolean }`  
成功 `data`：与列表项结构相同（含 `disabled`）。  
失败：`40401` 用户不存在；`40302` 不能禁用最后一个管理员。

### GET /api/admin/ops?page=1&pageSize=20&userId=&q=&action=&ip=&from=&to=

- `q`：匹配用户邮箱或显示名（模糊）
- `ip`：IP 模糊匹配
- 其余参数同前

成功 `data`：

```json
{
  "page": 1,
  "pageSize": 20,
  "total": 0,
  "items": [
    {
      "id": 1,
      "userId": 1,
      "email": "a@b.c",
      "displayName": "A",
      "action": "login",
      "detail": null,
      "ip": "127.0.0.1",
      "userAgent": "Mozilla/5.0 ...",
      "createdAt": "2026-08-29T00:00:00.000Z"
    }
  ]
}
```

### GET /api/admin/page-views?page=1&pageSize=20&q=&path=&ip=&from=&to=

页面访问（PV）明细。

- `path`：路径模糊匹配
- `ip`：IP 模糊匹配
- `q`：已登录用户邮箱 / 显示名模糊匹配

成功 `data`：

```json
{
  "page": 1,
  "pageSize": 20,
  "total": 0,
  "items": [
    {
      "id": 1,
      "visitorId": "abc",
      "path": "/app",
      "ip": "127.0.0.1",
      "userAgent": "Mozilla/5.0 ...",
      "userId": 1,
      "email": "a@b.c",
      "displayName": "A",
      "createdAt": "2026-08-29T00:00:00.000Z"
    }
  ]
}
```
