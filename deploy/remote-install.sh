#!/usr/bin/env bash
# 在服务器上执行：安装 ER洒洒水（静态前端 + Node API + nginx 反代）
# 用法：sudo bash remote-install.sh
# 部署前请确认 DOMAIN 与 API_PORT 不与现有业务冲突。
set -euo pipefail

DOMAIN="${DOMAIN:-bs.code-market.online}"
APP_DIR="${APP_DIR:-/opt/er-sasashui}"
API_PORT="${API_PORT:-3002}"
NODE_MAJOR="${NODE_MAJOR:-20}"
SCRIPT_DIR="$(cd "$(dirname "$0")" && pwd)"

echo "==> 检查现有监听端口（避免误杀其他服务）"
ss -tlnp || netstat -tlnp || true

if ss -tlnp 2>/dev/null | grep -q ":${API_PORT} "; then
  echo "错误: 端口 ${API_PORT} 已被占用，请 export API_PORT=其他端口 后重试"
  exit 1
fi

echo "==> 安装 Node ${NODE_MAJOR}.x（若尚未安装）"
if ! command -v node >/dev/null 2>&1; then
  curl -fsSL "https://deb.nodesource.com/setup_${NODE_MAJOR}.x" | bash -
  apt-get install -y nodejs
fi
node -v
npm -v

echo "==> 安装 pm2（若尚未安装）"
if ! command -v pm2 >/dev/null 2>&1; then
  npm install -g pm2
fi

echo "==> 应用目录: ${APP_DIR}"
mkdir -p "${APP_DIR}/dist" "${APP_DIR}/server" "${APP_DIR}/deploy"

if [[ ! -f "${APP_DIR}/server/.env" ]]; then
  echo "错误: 缺少 ${APP_DIR}/server/.env"
  echo "      复制 server/.env.production.example 为 server/.env 并填入真实值（勿提交 Git）"
  exit 1
fi

echo "==> 初始化日志与 pm2-logrotate"
bash "${SCRIPT_DIR}/setup-pm2-logs.sh"

echo "==> 安装 API 依赖并启动 pm2（ecosystem）"
cd "${APP_DIR}/server"
npm ci
pm2 describe er-sasashui-api >/dev/null 2>&1 && pm2 delete er-sasashui-api || true
API_PORT="${API_PORT}" pm2 start "${SCRIPT_DIR}/ecosystem.config.cjs"
pm2 save

NGINX_SITE="/etc/nginx/sites-available/${DOMAIN}.conf"
NGINX_LINK="/etc/nginx/sites-enabled/${DOMAIN}.conf"

echo "==> 写入 nginx 站点（仅 DOMAIN=${DOMAIN}，不影响其他 server_name）"
cat >"${NGINX_SITE}" <<EOF
server {
    listen 80;
    server_name ${DOMAIN};

    root ${APP_DIR}/dist;
    index index.html;

    location /api/ {
        proxy_pass http://127.0.0.1:${API_PORT}/api/;
        proxy_http_version 1.1;
        proxy_set_header Host \$host;
        proxy_set_header X-Real-IP \$remote_addr;
        proxy_set_header X-Forwarded-For \$proxy_add_x_forwarded_for;
        proxy_set_header X-Forwarded-Proto \$scheme;
    }

    location / {
        try_files \$uri \$uri/ /index.html;
    }
}
EOF

ln -sf "${NGINX_SITE}" "${NGINX_LINK}"
nginx -t
systemctl reload nginx

echo "==> 若需 HTTPS: certbot --nginx -d ${DOMAIN}"
echo "==> 建议配置 MySQL 定时备份: crontab -e"
echo "    0 3 * * * ${APP_DIR}/deploy/mysql-backup.sh >> /var/log/er-sasashui/backup.log 2>&1"
echo "完成。请确认 DNS 指向本机，并访问 http://${DOMAIN}/"
