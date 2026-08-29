# 生产部署说明 — bs.code-market.online

## 拓扑

| 组件 | 路径 / 端口 |
|------|-------------|
| 静态前端 | `/opt/er-sasashui/dist` |
| Node API | pm2 `er-sasashui-api`，**3002** |
| nginx | `server_name bs.code-market.online`，反代 `/api/` |
| MySQL | 库 `er_sasashui`，用户见 `server/.env` |
| 日志 | `/var/log/er-sasashui/api-out.log`、`api-error.log` |
| 备份 | `/var/backups/er-sasashui/mysql/*.sql.gz` |

与服务器上 **hm-backend（7001）** 及其他 `server_name` 站点互不占用端口与配置。

## 环境变量

复制模板并填入真实值（**勿提交 Git**）：

```bash
cp server/.env.production.example server/.env
# 编辑 MYSQL_*、JWT_SECRET、ADMIN_BOOTSTRAP_*、CORS_ORIGIN
```

生产必须 `ER_STORE=mysql`。完整字段说明见 [server/.env.production.example](../server/.env.production.example)。

构建前端（本机）：

```bash
VITE_SITE_URL=https://bs.code-market.online pnpm build
```

## 部署步骤

```bash
# 本机
export DEPLOY_HOST=154.12.55.241
bash deploy/upload.sh

# 首次：上传 server/.env
scp server/.env root@${DEPLOY_HOST}:/opt/er-sasashui/server/.env

# 服务器
sudo bash /opt/er-sasashui/deploy/remote-install.sh
sudo certbot --nginx -d bs.code-market.online   # 若尚未有证书
```

仅更新前端/API 代码时，执行 `upload.sh` 后在服务器：

```bash
cd /opt/er-sasashui/server && npm ci
pm2 restart er-sasashui-api
```

## pm2 与日志

- 进程配置：[ecosystem.config.cjs](./ecosystem.config.cjs)（日志路径、512M 内存重启）
- 首次安装会执行 [setup-pm2-logs.sh](./setup-pm2-logs.sh)：创建日志目录并配置 **pm2-logrotate**（单文件 20M，保留 14 份，压缩）

```bash
pm2 logs er-sasashui-api
pm2 status
tail -f /var/log/er-sasashui/api-out.log
```

应用日志为 **JSON 行**（`level` / `message` / 上下文），敏感字段已脱敏。

## MySQL 备份与恢复

**手动备份：**

```bash
sudo bash /opt/er-sasashui/deploy/mysql-backup.sh
```

**定时任务（建议每天 03:00）：**

```cron
0 3 * * * /opt/er-sasashui/deploy/mysql-backup.sh >> /var/log/er-sasashui/backup.log 2>&1
```

默认保留 **14 天**，可通过环境变量覆盖：

```bash
RETAIN_DAYS=30 BACKUP_DIR=/data/backups/er bash deploy/mysql-backup.sh
```

**恢复（会覆盖现有库数据，慎用）：**

```bash
sudo bash /opt/er-sasashui/deploy/mysql-restore.sh \
  /var/backups/er-sasashui/mysql/er_sasashui-YYYYMMDD-HHMMSS.sql.gz
```

恢复前建议先 `mysql-backup.sh` 再停 API：`pm2 stop er-sasashui-api`。

## CI

GitHub Actions（`.github/workflows/ci.yml`）在 `master` 的 push/PR 上执行：

- 前端：`pnpm typecheck`、`pnpm test`、`pnpm build`
- 后端：`npm ci --prefix server`、`npm run typecheck --prefix server`、`npm test --prefix server`

本地等价：`pnpm run check`。

## 安全

- 勿在聊天/仓库中明文保存 root 密码与生产 `.env`。
- 部署后改用 SSH 公钥登录；定期轮换 `JWT_SECRET` 与管理员密码。
- nginx 需正确透传 `X-Forwarded-For`，审计 IP 才准确。

## 故障排查

| 现象 | 检查 |
|------|------|
| 502 / API 无响应 | `pm2 status`、`pm2 logs er-sasashui-api` |
| 登录失败 | `server/.env` 中 `JWT_SECRET`、`CORS_ORIGIN` 是否与域名一致 |
| MySQL 连不上 | `systemctl status mysql`、`.env` 中 `MYSQL_*` |
| 静态 404 | `dist/` 是否已 rsync、`nginx -t` |
