#!/usr/bin/env bash
# MySQL 逻辑备份（er_sasashui 库）。从 server/.env 读取连接信息。
# 用法：
#   sudo bash deploy/mysql-backup.sh
#   sudo crontab -e  # 0 3 * * * /opt/er-sasashui/deploy/mysql-backup.sh >> /var/log/er-sasashui/backup.log 2>&1
set -euo pipefail

APP_DIR="${APP_DIR:-/opt/er-sasashui}"
ENV_FILE="${ENV_FILE:-${APP_DIR}/server/.env}"
BACKUP_DIR="${BACKUP_DIR:-/var/backups/er-sasashui/mysql}"
RETAIN_DAYS="${RETAIN_DAYS:-14}"

if [[ ! -f "${ENV_FILE}" ]]; then
  echo "错误: 找不到 ${ENV_FILE}" >&2
  exit 1
fi

# shellcheck disable=SC1090
set -a
source "${ENV_FILE}"
set +a

if [[ "${ER_STORE:-mysql}" != "mysql" ]]; then
  echo "错误: ER_STORE 不是 mysql，跳过备份" >&2
  exit 1
fi

MYSQL_HOST="${MYSQL_HOST:-127.0.0.1}"
MYSQL_PORT="${MYSQL_PORT:-3306}"
MYSQL_USER="${MYSQL_USER:?缺少 MYSQL_USER}"
MYSQL_PASSWORD="${MYSQL_PASSWORD:?缺少 MYSQL_PASSWORD}"
MYSQL_DATABASE="${MYSQL_DATABASE:-er_sasashui}"

if ! command -v mysqldump >/dev/null 2>&1; then
  echo "错误: 未安装 mysqldump" >&2
  exit 1
fi

mkdir -p "${BACKUP_DIR}"
STAMP="$(date +%Y%m%d-%H%M%S)"
OUT_FILE="${BACKUP_DIR}/${MYSQL_DATABASE}-${STAMP}.sql.gz"

export MYSQL_PWD="${MYSQL_PASSWORD}"
mysqldump \
  -h "${MYSQL_HOST}" \
  -P "${MYSQL_PORT}" \
  -u "${MYSQL_USER}" \
  --single-transaction \
  --routines \
  --triggers \
  --databases "${MYSQL_DATABASE}" \
  | gzip -9 >"${OUT_FILE}"
unset MYSQL_PWD

find "${BACKUP_DIR}" -name "${MYSQL_DATABASE}-*.sql.gz" -type f -mtime +"${RETAIN_DAYS}" -delete

echo "备份完成: ${OUT_FILE} ($(du -h "${OUT_FILE}" | awk '{print $1}'))"
