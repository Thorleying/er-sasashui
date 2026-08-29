#!/usr/bin/env bash
# 初始化 pm2 日志目录，并安装 pm2-logrotate（按大小/时间切割日志）。
# 用法：sudo bash deploy/setup-pm2-logs.sh
set -euo pipefail

LOG_DIR="${LOG_DIR:-/var/log/er-sasashui}"
BACKUP_DIR="${BACKUP_DIR:-/var/backups/er-sasashui/mysql}"

mkdir -p "${LOG_DIR}" "${BACKUP_DIR}"
chmod 750 "${LOG_DIR}" "${BACKUP_DIR}" 2>/dev/null || true

if ! command -v pm2 >/dev/null 2>&1; then
  echo "错误: 未安装 pm2" >&2
  exit 1
fi

if ! pm2 describe pm2-logrotate >/dev/null 2>&1; then
  pm2 install pm2-logrotate
fi

pm2 set pm2-logrotate:max_size 20M
pm2 set pm2-logrotate:retain 14
pm2 set pm2-logrotate:compress true
pm2 set pm2-logrotate:workerInterval 3600

echo "日志目录: ${LOG_DIR}"
echo "备份目录: ${BACKUP_DIR}"
echo "pm2-logrotate 已配置（单文件 20M，保留 14 份，压缩）"
