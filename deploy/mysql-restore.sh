#!/usr/bin/env bash
# 从 mysql-backup.sh 生成的 .sql.gz 恢复数据库（会覆盖同名库数据，慎用）。
# 用法：sudo bash deploy/mysql-restore.sh /var/backups/er-sasashui/mysql/er_sasashui-20260829-030000.sql.gz
set -euo pipefail

if [[ $# -lt 1 ]]; then
  echo "用法: $0 <backup.sql.gz>" >&2
  exit 1
fi

BACKUP_FILE="$1"
APP_DIR="${APP_DIR:-/opt/er-sasashui}"
ENV_FILE="${ENV_FILE:-${APP_DIR}/server/.env}"

if [[ ! -f "${BACKUP_FILE}" ]]; then
  echo "错误: 备份文件不存在: ${BACKUP_FILE}" >&2
  exit 1
fi

if [[ ! -f "${ENV_FILE}" ]]; then
  echo "错误: 找不到 ${ENV_FILE}" >&2
  exit 1
fi

# shellcheck disable=SC1090
set -a
source "${ENV_FILE}"
set +a

MYSQL_HOST="${MYSQL_HOST:-127.0.0.1}"
MYSQL_PORT="${MYSQL_PORT:-3306}"
MYSQL_USER="${MYSQL_USER:?缺少 MYSQL_USER}"
MYSQL_PASSWORD="${MYSQL_PASSWORD:?缺少 MYSQL_PASSWORD}"

echo "即将恢复: ${BACKUP_FILE} -> ${MYSQL_HOST}:${MYSQL_PORT}"
read -r -p "确认覆盖现有数据？输入 yes 继续: " CONFIRM
if [[ "${CONFIRM}" != "yes" ]]; then
  echo "已取消"
  exit 0
fi

export MYSQL_PWD="${MYSQL_PASSWORD}"
gunzip -c "${BACKUP_FILE}" | mysql -h "${MYSQL_HOST}" -P "${MYSQL_PORT}" -u "${MYSQL_USER}"
unset MYSQL_PWD

echo "恢复完成"
