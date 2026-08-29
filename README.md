# ER洒洒水

贴上 SQL 或 DBML，实体关系图马上出来。

## 本地开发

```bash
corepack enable
pnpm install
pnpm dev          # 前端 http://localhost:5173
pnpm dev:api      # 后端 API（另开终端，默认 3001）
```

| 页面 | 地址 |
|------|------|
| 欢迎页 | http://localhost:5173/ |
| 生成器 | http://localhost:5173/app |
| 管理端 | http://localhost:5173/admin |
| 联系作者 | http://localhost:5173/contact |

## 环境变量

| 文件 | 用途 |
|------|------|
| [.env.example](.env.example) | 前端 `VITE_*`（站点 URL、API 基址等） |
| [server/.env.example](server/.env.example) | 本地 API（memory / mysql） |
| [server/.env.production.example](server/.env.production.example) | 生产 API 模板（复制为 `server/.env`，勿提交） |

本地 API 默认 `ER_STORE=memory`；联调 MySQL 时改 `server/.env` 并设置 `VITE_API_BASE=/api`。

## 验证

```bash
pnpm typecheck              # 前端类型
pnpm test                   # 前端单测
pnpm test:server            # 后端单测（server/）
pnpm run check              # typecheck + format + 前后端 test
```

CI（`.github/workflows/ci.yml`）在 push/PR 时跑前后端 typecheck、单测与生产 build。

## 部署

生产域名：**https://bs.code-market.online**（静态 `dist/` + Node API 反代 `/api`）。

- 详细步骤、备份、日志、pm2：见 [deploy/README.md](deploy/README.md)
- 本机构建上传：`bash deploy/upload.sh`（需 `DEPLOY_HOST`）
- API 监听 **3002**，与服务器上其他 Node 服务（如 7001）隔离

## 目录

```
src/           React 前端
server/        Express API + MySQL
deploy/        上传脚本、pm2、MySQL 备份、nginx 安装
```
