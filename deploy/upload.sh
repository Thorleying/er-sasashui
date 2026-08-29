#!/usr/bin/env bash
# 在本机项目根目录执行：构建并 rsync 到服务器（需 SSH 可用）
# 用法：
#   export DEPLOY_HOST=154.12.55.241
#   export DEPLOY_USER=root
#   bash deploy/upload.sh
set -euo pipefail

ROOT="$(cd "$(dirname "$0")/.." && pwd)"
HOST="${DEPLOY_HOST:?set DEPLOY_HOST}"
USER="${DEPLOY_USER:-root}"
APP_DIR="${APP_DIR:-/opt/er-sasashui}"
SITE_URL="${VITE_SITE_URL:-https://bs.code-market.online}"

cd "${ROOT}"
VITE_SITE_URL="${SITE_URL}" pnpm build

rsync -avz --delete "${ROOT}/dist/" "${USER}@${HOST}:${APP_DIR}/dist/"
rsync -avz "${ROOT}/server/" "${USER}@${HOST}:${APP_DIR}/server/" \
  --exclude node_modules --exclude .env
rsync -avz "${ROOT}/deploy/" "${USER}@${HOST}:${APP_DIR}/deploy/"

echo "上传完成。SSH 登录服务器后执行: sudo bash ${APP_DIR}/deploy/remote-install.sh"
echo "（首次需手动 scp server/.env 到服务器 ${APP_DIR}/server/.env，可参考 server/.env.production.example）"
